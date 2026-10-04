#!/usr/bin/env node
/* Mirrors a curated slice of a Threads profile into data/threads.json.
   Node 18+, no dependencies. Run by .github/workflows/threads-sync.yml.

   The site never talks to Threads. This script runs on a schedule with a
   token kept in an Actions secret, writes plain JSON into the repository,
   and the page reads that file from its own origin. Nothing on the page
   can leak the token, and visitors are not tracked by Meta.

   What gets mirrored is decided by data/threads.config.json, not by the
   feed. A post is shown only when one of these holds:
     - its Threads topic tag is in "topics"
     - its text carries one of the "hashtags"
     - its id is listed in "include"
   A reply of yours is shown when it qualifies the same way, or when it sits
   under one of your own posts that is shown (so a conversation you started
   about the work comes along with it). Ids in "exclude" always lose.

   Only your own words are mirrored. Other people's replies and handles stay
   on Threads; the page links to the conversation instead of copying it.

   Every candidate also goes through the private disclosure denylist used by
   tools/disclosure-check.mjs, and a match drops the post. Posts are already
   public on Threads, but the site is where your employer looks.

   Environment:
     THREADS_ACCESS_TOKEN   long-lived Threads user token (required)
     DISCLOSURE_TERMS       newline-separated private denylist (optional)
     THREADS_REFRESH_OUT    file to write a refreshed token into (optional) */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadTerms, termMatchers, checkText } from "./disclosure-check.mjs";

const ROOT = new URL("..", import.meta.url).pathname;
const API = "https://graph.threads.net/v1.0";
const CONFIG = join(ROOT, "data/threads.config.json");
const OUT = join(ROOT, "data/threads.json");

const token = process.env.THREADS_ACCESS_TOKEN;
if (!token) {
  console.error("THREADS_ACCESS_TOKEN is not set. Nothing synced.");
  process.exit(1);
}

const config = JSON.parse(readFileSync(CONFIG, "utf8"));
const lower = (a) => (a || []).map((s) => String(s).toLowerCase().replace(/^#/, ""));
const topics = new Set(lower(config.topics));
const hashtags = new Set(lower(config.hashtags));
const include = new Set((config.include || []).map(String));
const exclude = new Set((config.exclude || []).map(String));
const maxItems = config.maxItems || 24;
const matchers = termMatchers(loadTerms());

/* Errors from the Graph API echo the request URL, token included, so only
   the message is ever printed. */
async function get(path, params = {}) {
  const url = new URL(path.startsWith("http") ? path : API + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("access_token", token);
  const res = await fetch(url);
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error) {
    const msg = (body.error && body.error.message) || res.status + " " + res.statusText;
    throw new Error(msg.replace(token, "[token]"));
  }
  return body;
}

async function all(path, params, pages = 4) {
  const out = [];
  let body = await get(path, params);
  out.push(...(body.data || []));
  while (--pages > 0 && body.paging && body.paging.next) {
    /* The next link already carries the token; strip it so get() adds one */
    const next = new URL(body.paging.next);
    next.searchParams.delete("access_token");
    body = await get(next.toString());
    out.push(...(body.data || []));
  }
  return out;
}

/* topic_tag is a newer field. Older API versions reject unknown fields, so
   fall back to fetching without it and rely on hashtags and ids. */
async function fetchWithTopic(path, fields) {
  try {
    return await all(path, { fields: fields + ",topic_tag", limit: "50" });
  } catch (e) {
    if (!/topic_tag|field/i.test(e.message)) throw e;
    console.warn("topic_tag not available, falling back to hashtags and ids only");
    return await all(path, { fields, limit: "50" });
  }
}

function tagsIn(text) {
  return new Set((String(text || "").match(/#[\p{L}\p{N}_]+/gu) || []).map((t) => t.slice(1).toLowerCase()));
}

function qualifies(item) {
  const id = String(item.id);
  if (exclude.has(id)) return false;
  if (include.has(id)) return true;
  if (item.topic_tag && topics.has(String(item.topic_tag).toLowerCase())) return true;
  for (const t of tagsIn(item.text)) if (hashtags.has(t)) return true;
  return false;
}

function safe(item) {
  return checkText(String(item.text || ""), matchers, { drafts: false }).length === 0;
}

function shape(item, kind) {
  const ref = (v) => (v && typeof v === "object" ? String(v.id) : v ? String(v) : null);
  return {
    id: String(item.id),
    kind,
    text: String(item.text || ""),
    media: item.media_type && item.media_type !== "TEXT_POST" ? String(item.media_type).toLowerCase() : null,
    permalink: item.permalink || null,
    timestamp: item.timestamp,
    topic: item.topic_tag || null,
    root: kind === "reply" ? ref(item.root_post) : null,
    parent: kind === "reply" ? ref(item.replied_to) : null
  };
}

async function refreshToken() {
  /* A long-lived token lasts 60 days and can be refreshed once it is a day
     old. The workflow stores the new one back into the secret if it can. */
  if (!process.env.THREADS_REFRESH_OUT) return;
  try {
    const body = await get("https://graph.threads.net/refresh_access_token", { grant_type: "th_refresh_token" });
    if (body.access_token) {
      writeFileSync(process.env.THREADS_REFRESH_OUT, body.access_token, { mode: 0o600 });
      console.log("Token refreshed, valid for another " + Math.round(body.expires_in / 86400) + " days");
    }
  } catch (e) {
    console.warn("Token refresh skipped: " + e.message);
  }
}

async function main() {
  const me = await get("/me", { fields: "username" });
  const posts = await fetchWithTopic("/me/threads", "id,media_type,text,permalink,timestamp,is_quote_post");
  let replies = [];
  try {
    replies = await fetchWithTopic("/me/replies", "id,media_type,text,permalink,timestamp,root_post,replied_to,is_reply");
  } catch (e) {
    /* Needs the threads_read_replies permission; posts still sync without it */
    console.warn("Replies not synced: " + e.message);
  }

  let dropped = 0;
  const shownPosts = posts.filter(qualifies).filter((p) => safe(p) || (dropped++, false)).map((p) => shape(p, "post"));
  const shownIds = new Set(shownPosts.map((p) => p.id));
  const shownReplies = replies
    .map((r) => ({ raw: r, item: shape(r, "reply") }))
    .filter(({ raw, item }) => !exclude.has(item.id) && (qualifies(raw) || (item.root && shownIds.has(item.root))))
    .filter(({ raw }) => safe(raw) || (dropped++, false))
    .map(({ item }) => item);

  const items = [...shownPosts, ...shownReplies]
    .sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)))
    .slice(0, maxItems);

  const handle = me.username || config.handle || "";
  const data = {
    handle,
    profile: handle ? "https://www.threads.com/@" + handle : null,
    synced: new Date().toISOString(),
    items
  };

  /* Only rewrite when the content changed, so the scheduled job does not
     make a commit every few hours just to bump the timestamp */
  let previous = null;
  try {
    previous = JSON.parse(readFileSync(OUT, "utf8"));
  } catch (e) {}
  const same = previous && JSON.stringify(previous.items) === JSON.stringify(items) && previous.handle === handle;
  if (!same) writeFileSync(OUT, JSON.stringify(data, null, 2) + "\n");

  console.log(
    "Threads: " + posts.length + " posts and " + replies.length + " replies read, " +
    shownPosts.length + " posts and " + shownReplies.length + " replies qualified, " +
    items.length + " published" + (dropped ? ", " + dropped + " held back by the denylist" : "") +
    (same ? " (no change)" : "")
  );

  await refreshToken();
}

main().catch((e) => {
  console.error("Threads sync failed: " + e.message);
  process.exit(1);
});

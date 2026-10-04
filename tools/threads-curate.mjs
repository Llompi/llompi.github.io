#!/usr/bin/env node
/* Curate which Threads posts the site mirrors, by editing
   data/threads.config.json. Meant to be driven from a phone: "show me my
   recent posts", "include that one", "drop that one".

   Usage:
     node tools/threads-curate.mjs shown                  what the site shows now
     node tools/threads-curate.mjs include <id|link>      always show this post
     node tools/threads-curate.mjs exclude <id|link>      never show this post
     node tools/threads-curate.mjs recent [N]             your latest posts, each marked shown or hidden
                                                          and why (only with a Threads token on this computer)
     node tools/threads-curate.mjs reset <id|url>         back to the topic and hashtag rules
     node tools/threads-curate.mjs topics                 list the rules
     node tools/threads-curate.mjs topic add|remove NAME
     node tools/threads-curate.mjs hashtag add|remove TAG

   include and exclude work from a post link alone, so curating needs no
   token: copy the link in the Threads app and paste it. Only `recent` calls
   the API, with THREADS_ACCESS_TOKEN from the environment or the command in
   .claude/secrets.local.json; the token is never printed.

   Changes take effect on the next sync. Commit and push the config, then
   run: gh workflow run threads-sync.yml */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/* fileURLToPath, not .pathname: on Windows .pathname gives /C:/... */
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const CONFIG = join(ROOT, "data/threads.config.json");
const DATA = join(ROOT, "data/threads.json");
const SECRETS = join(ROOT, ".claude/secrets.local.json");
const [cmd, ...rest] = process.argv.slice(2);

const config = JSON.parse(readFileSync(CONFIG, "utf8"));
const save = () => writeFileSync(CONFIG, JSON.stringify(config, null, 2) + "\n");
const short = (t, n = 72) => {
  const s = String(t || "").replace(/\s+/g, " ").trim();
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
};
const day = (iso) => String(iso || "").slice(0, 10);

function token() {
  if (process.env.THREADS_ACCESS_TOKEN) return process.env.THREADS_ACCESS_TOKEN;
  if (existsSync(SECRETS)) {
    let entries = {};
    try {
      entries = JSON.parse(readFileSync(SECRETS, "utf8"));
    } catch (e) {
      /* The parser's message quotes the file, which may hold a pasted value */
      console.error(".claude/secrets.local.json is not valid JSON. Fix it at the computer.");
      process.exit(1);
    }
    const entry = entries.THREADS_ACCESS_TOKEN;
    if (entry && entry.cmd) {
      const r = spawnSync(entry.cmd, { shell: entry.shell || true, cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 60000, windowsHide: true });
      if (r.status === 0 && r.stdout.trim()) return r.stdout.trim();
    }
  }
  console.error("Listing recent posts needs a Threads token on this computer, and there isn't one (it lives in GitHub). Pick posts from the Threads app instead: include or exclude takes a post link.");
  process.exit(1);
}

async function fetchAll(tok, path, fields) {
  const url = new URL("https://graph.threads.com/v1.0" + path);
  url.searchParams.set("fields", fields);
  url.searchParams.set("limit", "50");
  url.searchParams.set("access_token", tok);
  const res = await fetch(url);
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error) {
    const msg = (body.error && body.error.message) || String(res.status);
    if (/topic_tag/.test(msg) && fields.includes("topic_tag")) return fetchAll(tok, path, fields.replace(",topic_tag", ""));
    throw new Error(msg.replace(tok, "[token]"));
  }
  return body.data || [];
}

/* Mirrors the rules in tools/threads-sync.mjs so the answer here matches
   what the next sync will do */
function verdict(item, shownRoots) {
  const id = String(item.id);
  const lower = (a) => (a || []).map((s) => String(s).toLowerCase().replace(/^#/, ""));
  if ((config.exclude || []).map(String).includes(id)) return "hidden: excluded";
  if ((config.include || []).map(String).includes(id)) return "shown: included by hand";
  if (item.topic_tag && lower(config.topics).includes(String(item.topic_tag).toLowerCase())) return "shown: topic " + item.topic_tag;
  const tags = (String(item.text || "").match(/#[\p{L}\p{N}_]+/gu) || []).map((t) => t.slice(1).toLowerCase());
  const hit = tags.find((t) => lower(config.hashtags).includes(t));
  if (hit) return "shown: #" + hit;
  const root = item.root_post && (item.root_post.id || item.root_post);
  if (root && shownRoots.has(String(root))) return "shown: reply under a shown post";
  return "hidden: " + (item.topic_tag ? "topic " + item.topic_tag + " not in the list" : "no matching topic or hashtag");
}

/* Accepts a post id, or a Threads link (threads.com/@you/post/CODE or a
   /t/CODE share link). A link is stored as its code; the sync matches codes
   against each post's link, so no API token is needed to curate. */
async function resolve(ref) {
  if (!ref) {
    console.error("Give a post id or its Threads link.");
    process.exit(1);
  }
  if (/^\d+$/.test(ref)) return ref;
  const code = (ref.match(/\/(?:post|t)\/([A-Za-z0-9_-]+)/) || [])[1] || (/^[A-Za-z0-9_-]{6,}$/.test(ref) ? ref : null);
  if (!code) {
    console.error("That doesn't look like a post id or a Threads post link.");
    process.exit(1);
  }
  const local = existsSync(DATA) ? JSON.parse(readFileSync(DATA, "utf8")).items || [] : [];
  const hit = local.find((i) => new RegExp("/post/" + code + "(?:[/?#]|$)").test(String(i.permalink || "")));
  return hit ? hit.id : code;
}

/* A post can sit in a list as its id or as its link code; clear both */
function forms(ref, id) {
  const code = (String(ref).match(/\/(?:post|t)\/([A-Za-z0-9_-]+)/) || [])[1];
  return new Set([String(id), String(ref), code].filter(Boolean));
}

function setList(id, add, remove, ref) {
  const all = forms(ref, id);
  config[add] = Array.from(new Set([...(config[add] || []).map(String).filter((x) => !all.has(x)), id]));
  config[remove] = (config[remove] || []).map(String).filter((x) => !all.has(x));
}

const after = "Commit and push data/threads.config.json, then: gh workflow run threads-sync.yml";

switch (cmd) {
  case "shown": {
    const data = existsSync(DATA) ? JSON.parse(readFileSync(DATA, "utf8")) : { items: [] };
    if (!data.items.length) {
      console.log("Nothing is mirrored yet, so the Notes section is hidden.");
      break;
    }
    console.log(data.items.length + " notes, synced " + day(data.synced) + ":");
    for (const i of data.items) console.log("  " + day(i.timestamp) + "  " + i.kind.padEnd(5) + "  " + i.id + "  " + short(i.text));
    break;
  }

  case "recent": {
    const n = parseInt(rest[0], 10) || 15;
    const tok = token();
    const posts = await fetchAll(tok, "/me/threads", "id,text,permalink,timestamp,topic_tag");
    const replies = await fetchAll(tok, "/me/replies", "id,text,permalink,timestamp,root_post,topic_tag").catch(() => []);
    const shownRoots = new Set(posts.filter((p) => verdict(p, new Set()).startsWith("shown")).map((p) => String(p.id)));
    const all = [...posts.map((p) => ({ ...p, kind: "post" })), ...replies.map((r) => ({ ...r, kind: "reply" }))]
      .sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)))
      .slice(0, n);
    for (const i of all) {
      console.log(day(i.timestamp) + "  " + i.kind.padEnd(5) + "  " + i.id + "\n    " + short(i.text, 90) + "\n    " + verdict(i, shownRoots));
    }
    break;
  }

  case "include":
  case "exclude": {
    const id = await resolve(rest[0]);
    setList(id, cmd, cmd === "include" ? "exclude" : "include", rest[0]);
    save();
    console.log((cmd === "include" ? "Will always show " : "Will never show ") + id + ". " + after);
    break;
  }

  case "reset": {
    const id = await resolve(rest[0]);
    const all = forms(rest[0], id);
    config.include = (config.include || []).map(String).filter((x) => !all.has(x));
    config.exclude = (config.exclude || []).map(String).filter((x) => !all.has(x));
    save();
    console.log(id + " follows the topic and hashtag rules again. " + after);
    break;
  }

  case "topics": {
    console.log("Topics:   " + ((config.topics || []).join(", ") || "none"));
    console.log("Hashtags: " + ((config.hashtags || []).map((h) => "#" + h).join(", ") || "none"));
    console.log("Included: " + ((config.include || []).join(", ") || "none"));
    console.log("Excluded: " + ((config.exclude || []).join(", ") || "none"));
    console.log("Max shown: " + (config.maxItems || 24));
    break;
  }

  case "topic":
  case "hashtag": {
    const [op, ...words] = rest;
    const value = words.join(" ").replace(/^#/, "").trim();
    const key = cmd === "topic" ? "topics" : "hashtags";
    if (!value || !["add", "remove"].includes(op)) {
      console.error("Usage: node tools/threads-curate.mjs " + cmd + " add|remove NAME");
      process.exit(1);
    }
    const list = config[key] || [];
    config[key] = op === "add" ? Array.from(new Set([...list, value])) : list.filter((x) => x.toLowerCase() !== value.toLowerCase());
    save();
    console.log((op === "add" ? "Added " : "Removed ") + (cmd === "hashtag" ? "#" : "") + value + ". " + after);
    break;
  }

  default:
    console.error("Usage: node tools/threads-curate.mjs shown | recent [N] | include|exclude|reset <id|url> | topics | topic|hashtag add|remove NAME");
    process.exit(1);
}

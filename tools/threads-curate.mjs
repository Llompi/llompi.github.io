#!/usr/bin/env node
/* Curate which Threads posts the site mirrors, by editing
   data/threads.config.json. Meant to be driven from a phone: "show me my
   recent posts", "include that one", "drop that one".

   Usage:
     node tools/threads-curate.mjs shown                  what the site shows now
     node tools/threads-curate.mjs recent [N]             your latest posts and replies, each marked
                                                          shown or hidden and why (needs the token)
     node tools/threads-curate.mjs include <id|url>       always show this post
     node tools/threads-curate.mjs exclude <id|url>       never show this post
     node tools/threads-curate.mjs reset <id|url>         back to the topic and hashtag rules
     node tools/threads-curate.mjs topics                 list the rules
     node tools/threads-curate.mjs topic add|remove NAME
     node tools/threads-curate.mjs hashtag add|remove TAG

   `recent` reads the token from THREADS_ACCESS_TOKEN in the environment or
   from the command in .claude/secrets.local.json. Post text is printed (it is
   already public on Threads); the token never is.

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
    const entry = JSON.parse(readFileSync(SECRETS, "utf8")).THREADS_ACCESS_TOKEN;
    if (entry && entry.cmd) {
      const r = spawnSync(entry.cmd, { shell: entry.shell || true, cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 60000, windowsHide: true });
      if (r.status === 0 && r.stdout.trim()) return r.stdout.trim();
    }
  }
  console.error("No Threads token here. Set THREADS_ACCESS_TOKEN, or configure it in .claude/secrets.local.json.");
  process.exit(1);
}

async function fetchAll(tok, path, fields) {
  const url = new URL("https://graph.threads.net/v1.0" + path);
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

/* Accepts a numeric id or a threads.com / threads.net permalink */
async function resolve(ref) {
  if (!ref) {
    console.error("Give a post id or its Threads link.");
    process.exit(1);
  }
  if (/^\d+$/.test(ref)) return ref;
  const code = (ref.match(/\/post\/([^/?#]+)/) || [])[1];
  if (!code) {
    console.error("That doesn't look like a post id or a Threads post link.");
    process.exit(1);
  }
  const local = existsSync(DATA) ? JSON.parse(readFileSync(DATA, "utf8")).items || [] : [];
  const hit = local.find((i) => String(i.permalink || "").includes("/post/" + code));
  if (hit) return hit.id;
  const tok = token();
  const all = [
    ...(await fetchAll(tok, "/me/threads", "id,permalink")),
    ...(await fetchAll(tok, "/me/replies", "id,permalink").catch(() => []))
  ];
  const found = all.find((i) => String(i.permalink || "").includes("/post/" + code));
  if (!found) {
    console.error("Couldn't find that post among your latest 50 posts and replies.");
    process.exit(1);
  }
  return String(found.id);
}

function setList(id, add, remove) {
  config[add] = Array.from(new Set([...(config[add] || []).map(String), id]));
  config[remove] = (config[remove] || []).map(String).filter((x) => x !== id);
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
    setList(id, cmd, cmd === "include" ? "exclude" : "include");
    save();
    console.log((cmd === "include" ? "Will always show " : "Will never show ") + id + ". " + after);
    break;
  }

  case "reset": {
    const id = await resolve(rest[0]);
    config.include = (config.include || []).map(String).filter((x) => x !== id);
    config.exclude = (config.exclude || []).map(String).filter((x) => x !== id);
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

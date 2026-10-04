#!/usr/bin/env node
/* Local preview of the site. Node 18+, no dependencies.

     node tools/serve.mjs [port]      default 8000, http://127.0.0.1:8000

   Listens on 127.0.0.1 only, so nothing else on the network can reach it,
   and serves only what git would publish (tracked files and new files that
   aren't ignored). Git-ignored private files such as CLAUDE.local.md, local
   secrets config, or .git itself return 404 even though they sit in this
   folder. The file list is re-read on every request, so a new draft page
   shows up without a restart. */

import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, realpathSync } from "node:fs";
import { join, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PORT = Number(process.argv[2]) || 8000;

const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif",
  ".woff2": "font/woff2", ".pdf": "application/pdf", ".xml": "application/xml", ".txt": "text/plain; charset=utf-8",
  ".mp4": "video/mp4", ".ico": "image/x-icon", ".webmanifest": "application/manifest+json"
};

function publishable() {
  try {
    const out = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    return new Set(out.split("\0").filter(Boolean));
  } catch (e) {
    return new Set();
  }
}

const REAL_ROOT = realpathSync(ROOT);
/* A symlink inside the repository can point anywhere; serve only files
   whose real location is inside it */
function inside(full) {
  try {
    const real = realpathSync(full);
    return real.startsWith(REAL_ROOT.endsWith(sep) ? REAL_ROOT : REAL_ROOT + sep);
  } catch (e) {
    return false;
  }
}

createServer((req, res) => {
  let rel;
  try {
    rel = decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/^\/+/, "");
  } catch (e) {
    res.writeHead(400).end();
    return;
  }
  if (rel === "" || rel.endsWith("/")) rel += "index.html";
  const files = publishable();
  if (!files.has(rel) && files.has(rel + "/index.html")) {
    res.writeHead(301, { Location: "/" + rel + "/" }).end();
    return;
  }
  const full = join(ROOT, rel);
  if (rel.split("/").includes("..") || !files.has(rel) || !existsSync(full) || !inside(full) || !statSync(full).isFile()) {
    const notFound = join(ROOT, "404.html");
    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    res.end(existsSync(notFound) ? readFileSync(notFound) : "Not found");
    return;
  }
  res.writeHead(200, { "Content-Type": TYPES[extname(rel).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-store" });
  res.end(readFileSync(full));
}).listen(PORT, "127.0.0.1", () => {
  console.log("Preview at http://127.0.0.1:" + PORT + "/ (this computer only). Ctrl+C to stop.");
});

#!/usr/bin/env node
/* Pre-publish disclosure check. Node 18+, no dependencies.

   Fails when anything that is about to be served by GitHub Pages contains:
     1. A term from a private denylist (project code names, customer and
        sponsor names, part numbers, hostnames, anything not yours to share).
     2. Photo metadata that leaks more than the picture: GPS position,
        camera serial numbers, or embedded text/XMP blocks.
     3. A draft marker left in published copy: "TODO", "DRAFT", "[redact".

   The denylist is never stored in this repository, because a public list of
   what must not be said is itself a disclosure. It is read from, in order:
     - the DISCLOSURE_TERMS environment variable (a GitHub Actions secret), one
       term per line
     - a local .disclosure-terms file at the repository root (git-ignored)
   Matches are reported by term number, never by the term itself, so CI logs
   on a public repository do not print what they were protecting.

   Usage:
     node tools/disclosure-check.mjs            check the whole site
     node tools/disclosure-check.mjs file ...   check specific files
   Exit code 1 on any finding. */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, extname, resolve } from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = new URL("..", import.meta.url).pathname;

/* Used only when git is unavailable. Everything else in the repository is
   public, tooling and Claude Code config included, so it is all scanned
   for denylisted terms. */
const SKIP_DIRS = new Set([".git", "node_modules"]);
const TEXT_EXT = new Set([".html", ".htm", ".css", ".js", ".mjs", ".json", ".md", ".txt", ".xml", ".svg"]);
const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png"]);
/* Draft markers only matter on pages the site serves. Docs, tooling, and
   Claude Code config are allowed to talk about drafts; they are still
   scanned for denylisted terms. */
const DRAFT_EXEMPT = new Set(["README.md", "CONTRIBUTING.md", "PUBLISHING.md", "CLAUDE.md", "LICENSE"]);
const DRAFT_EXEMPT_DIRS = [".github/", ".claude/", "tools/", "legacy/", "assets/vendor/"];
const DRAFT_PATTERNS = [/\bTODO\b/, /\bDRAFT\b/, /\[redact/i, /\bTBD\b/];

export function loadTerms() {
  let raw = process.env.DISCLOSURE_TERMS || "";
  const local = join(ROOT, ".disclosure-terms");
  if (!raw && existsSync(local)) raw = readFileSync(local, "utf8");
  return raw
    .split(/\r?\n/)
    .map((t) => t.trim())
    .filter((t) => t && !t.startsWith("#"));
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

/* Everything git would publish: tracked files plus new files that are not
   ignored. Ignored files (the denylist itself, local secrets config,
   CLAUDE.local.md) never leave this computer, so they are not scanned. */
function publishable() {
  try {
    const out = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    return out.split("\0").filter(Boolean).map((f) => join(ROOT, f)).filter((f) => existsSync(f));
  } catch (e) {
    return walk(ROOT);
  }
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* Whole-word, case-insensitive. Short terms would otherwise match inside
   ordinary words and train you to ignore the check. */
export function termMatchers(terms) {
  return terms.map((t) => new RegExp("(^|[^\\p{L}\\p{N}])" + escapeRe(t) + "(?=$|[^\\p{L}\\p{N}])", "iu"));
}

/* ---------------------------------------------------------------- Text */

export function checkText(text, matchers, { drafts = true } = {}) {
  const findings = [];
  const lines = text.split(/\r?\n/);
  lines.forEach((line, i) => {
    matchers.forEach((re, n) => {
      if (re.test(line)) findings.push({ line: i + 1, kind: "term", detail: "denylisted term #" + (n + 1) });
    });
    if (drafts) {
      for (const re of DRAFT_PATTERNS) {
        if (re.test(line)) {
          findings.push({ line: i + 1, kind: "draft", detail: "draft marker " + re.source.replace(/\\b/g, "") });
          break;
        }
      }
    }
  });
  return findings;
}

/* ---------------------------------------------------------------- JPEG */

/* Walks the JPEG segments and reads the EXIF IFD0 for the tags that give a
   person away. Image pixels are not touched. */
function checkJpeg(buf) {
  const findings = [];
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return findings;
  let p = 2;
  while (p + 4 < buf.length) {
    if (buf[p] !== 0xff) break;
    const marker = buf[p + 1];
    if (marker === 0xda || marker === 0xd9) break; /* start of scan / end */
    const len = buf.readUInt16BE(p + 2);
    const seg = buf.subarray(p + 4, p + 2 + len);
    if (marker === 0xe1) {
      const head = seg.subarray(0, 29).toString("latin1");
      if (head.startsWith("Exif\0\0")) findings.push(...readExif(seg.subarray(6)));
      else if (head.startsWith("http://ns.adobe.com/xap/1.0/")) {
        findings.push({ kind: "metadata", detail: "XMP block (can carry location, author and editing history)" });
      }
    }
    p += 2 + len;
  }
  return findings;
}

const SENSITIVE_TAGS = {
  0x8825: "GPS position",
  0xa431: "camera body serial number",
  0xa435: "lens serial number",
  0x013b: "artist name",
  0x9c9c: "embedded comment",
  0x9286: "embedded comment"
};

function readExif(tiff) {
  const findings = [];
  if (tiff.length < 8) return findings;
  const le = tiff.toString("latin1", 0, 2) === "II";
  const u16 = (o) => (le ? tiff.readUInt16LE(o) : tiff.readUInt16BE(o));
  const u32 = (o) => (le ? tiff.readUInt32LE(o) : tiff.readUInt32BE(o));
  const seen = new Set();
  const visit = (offset) => {
    if (!offset || seen.has(offset) || offset + 2 > tiff.length) return;
    seen.add(offset);
    const count = u16(offset);
    for (let i = 0; i < count; i++) {
      const e = offset + 2 + i * 12;
      if (e + 12 > tiff.length) return;
      const tag = u16(e);
      if (SENSITIVE_TAGS[tag]) findings.push({ kind: "metadata", detail: "EXIF " + SENSITIVE_TAGS[tag] });
      if (tag === 0x8769) visit(u32(e + 8)); /* Exif sub-IFD holds the serials */
    }
  };
  visit(u32(4));
  return findings;
}

/* ---------------------------------------------------------------- PNG */

function checkPng(buf) {
  const findings = [];
  if (buf.toString("latin1", 1, 4) !== "PNG") return findings;
  let p = 8;
  while (p + 8 <= buf.length) {
    const len = buf.readUInt32BE(p);
    const type = buf.toString("latin1", p + 4, p + 8);
    if (type === "eXIf") findings.push({ kind: "metadata", detail: "PNG eXIf chunk" });
    if (type === "iTXt" || type === "tEXt" || type === "zTXt") {
      const key = buf.toString("latin1", p + 8, Math.min(p + 8 + len, p + 8 + 80)).split("\0")[0];
      /* Software and colour keys are harmless; anything else gets a look */
      if (!/^(Software|Creation Time|date:|icc|exif:Pixel)/i.test(key)) {
        findings.push({ kind: "metadata", detail: "PNG text chunk \"" + key + "\"" });
      }
    }
    if (type === "IEND") break;
    p += 12 + len;
  }
  return findings;
}

/* ---------------------------------------------------------------- Run */

function main() {
  const terms = loadTerms();
  const matchers = termMatchers(terms);
  const args = process.argv.slice(2);
  const files = args.length ? args.map((f) => resolve(f)) : publishable();
  let total = 0;

  for (const file of files) {
    const rel = relative(ROOT, file);
    const ext = extname(file).toLowerCase();
    let findings = [];
    if (TEXT_EXT.has(ext)) {
      const drafts = !DRAFT_EXEMPT.has(rel) && !DRAFT_EXEMPT_DIRS.some((d) => rel.startsWith(d));
      findings = checkText(readFileSync(file, "utf8"), matchers, { drafts });
    } else if (IMAGE_EXT.has(ext)) {
      const buf = readFileSync(file);
      findings = ext === ".png" ? checkPng(buf) : checkJpeg(buf);
    }
    for (const f of findings) {
      total++;
      console.log(rel + (f.line ? ":" + f.line : "") + "  " + f.kind + "  " + f.detail);
    }
  }

  const note = terms.length ? terms.length + " private terms" : "no private terms loaded";
  if (total) {
    console.log("\n" + total + " finding(s), " + note + ". Nothing above is safe to publish until it is resolved.");
    process.exit(1);
  }
  console.log("Disclosure check passed: " + files.length + " files, " + note + ".");
}

if (import.meta.url === "file://" + process.argv[1]) main();

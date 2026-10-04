/* Disclosure check, the library. Node 18+, no dependencies.
   Used by tools/disclosure-check.mjs (the command), the git hooks in
   .githooks/, and tools/threads-sync.mjs.

   What counts as a finding:
     1. A term from a private denylist (code names, sponsor and customer
        names, hostnames, anything not yours to share).
     2. Photo metadata that gives away more than the picture: GPS position,
        camera or lens serial numbers, artist, comments, XMP.
     3. A draft marker left in a served page: TODO, DRAFT, TBD, [redact.

   The denylist is never stored in the repository: a public list of what
   must not be said is itself a disclosure. It lives outside the working
   tree, so no search, preview server, or commit inside the repository can
   reach it:
     - DISCLOSURE_TERMS: the terms themselves (the GitHub Actions secret)
     - DISCLOSURE_TERMS_FILE: a path to a file of terms
     - otherwise %APPDATA%\llompi-site\disclosure-terms.txt on Windows, or
       ~/.config/llompi-site/disclosure-terms.txt elsewhere
   One term per line, # for comments. Matches are reported by term number,
   never by the term, so public CI logs don't print what they protect. */

import { readFileSync, existsSync } from "node:fs";
import { join, extname, basename } from "node:path";
import { homedir } from "node:os";
import { execFileSync } from "node:child_process";

export const TERMS_FILE =
  process.env.DISCLOSURE_TERMS_FILE ||
  (process.platform === "win32"
    ? join(process.env.APPDATA || join(homedir(), "AppData", "Roaming"), "llompi-site", "disclosure-terms.txt")
    : join(process.env.XDG_CONFIG_HOME || join(homedir(), ".config"), "llompi-site", "disclosure-terms.txt"));

export function loadTerms() {
  let raw = process.env.DISCLOSURE_TERMS || "";
  if (!raw && existsSync(TERMS_FILE)) raw = readFileSync(TERMS_FILE, "utf8");
  return raw
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .map((t) => t.trim())
    .filter((t) => t && !t.startsWith("#"));
}

/* ------------------------------------------------------------ matching */

const TEXT_EXT = new Set([
  ".html", ".htm", ".css", ".js", ".mjs", ".cjs", ".json", ".md", ".txt", ".xml", ".svg",
  ".yml", ".yaml", ".ps1", ".sh", ".toml", ".csv", ".tsv", ".webmanifest", ".ics", ".vcf", ".map"
]);
const TEXT_NAMES = new Set(["CNAME", "LICENSE", ".gitignore", ".nojekyll", "pre-commit", "pre-push", "commit-msg"]);
const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png"]);
/* Binary types the check can't read. They are listed, not failed, so you
   know to look at them yourself (a PDF's metadata, a phone video's GPS). */
const OPAQUE_EXT = new Set([".pdf", ".mp4", ".mov", ".m4v", ".webm", ".webp", ".heic", ".gif", ".avif", ".docx", ".pptx", ".xlsx", ".zip"]);

/* Draft markers only matter on pages the site serves. Docs, tooling, data
   mirrored from Threads, and Claude Code config may mention drafts; they
   are still checked for terms. */
const DRAFT_EXEMPT = new Set(["README.md", "CONTRIBUTING.md", "PUBLISHING.md", "CLAUDE.md", "LICENSE", "data/threads.json"]);
const DRAFT_EXEMPT_DIRS = [".github/", ".githooks/", ".claude/", "tools/", "legacy/", "assets/vendor/"];
const DRAFT_PATTERNS = [/\bTODO\b/, /\bDRAFT\b/, /\[redact/i, /\bTBD\b/];

export function kindOf(rel) {
  const ext = extname(rel).toLowerCase();
  if (TEXT_EXT.has(ext) || TEXT_NAMES.has(basename(rel))) return "text";
  if (IMAGE_EXT.has(ext)) return "image";
  if (OPAQUE_EXT.has(ext)) return "opaque";
  return "other";
}

export function draftsApply(rel) {
  return !DRAFT_EXEMPT.has(rel) && !DRAFT_EXEMPT_DIRS.some((d) => rel.startsWith(d));
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* Whole-word and case-insensitive, so a short term doesn't fire inside
   ordinary words. Words of a multi-word term may be separated by any
   whitespace, a line break, or a non-breaking space, as HTML allows. */
export function termMatchers(terms) {
  const gap = "(?:\\s|&nbsp;|&#160;|&#xa0;|\\u00a0)+";
  return terms.map(
    (t) => new RegExp("(?<![\\p{L}\\p{N}])" + t.split(/\s+/).map(escapeRe).join(gap) + "(?![\\p{L}\\p{N}])", "giu")
  );
}

export function checkText(text, matchers, { drafts = true } = {}) {
  const findings = [];
  /* Soft hyphens are invisible on the page but split a word in the source */
  const norm = String(text).replace(/&shy;|­/gi, "");
  const lineAt = (i) => norm.slice(0, i).split("\n").length;
  matchers.forEach((re, n) => {
    re.lastIndex = 0;
    const seen = new Set();
    for (const m of norm.matchAll(re)) {
      const line = lineAt(m.index);
      if (seen.has(line)) continue;
      seen.add(line);
      findings.push({ line, kind: "term", detail: "denylisted term #" + (n + 1) });
    }
  });
  if (drafts) {
    norm.split("\n").forEach((line, i) => {
      for (const re of DRAFT_PATTERNS) {
        if (re.test(line)) {
          findings.push({ line: i + 1, kind: "draft", detail: "draft marker " + re.source.replace(/\\b/g, "") });
          break;
        }
      }
    });
  }
  return findings.sort((a, b) => a.line - b.line);
}

/* ---------------------------------------------------------- photo data */

function checkJpeg(buf) {
  const findings = [];
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return findings;
  let p = 2;
  while (p + 4 < buf.length) {
    if (buf[p] !== 0xff) break;
    const marker = buf[p + 1];
    if (marker === 0xda || marker === 0xd9) break;
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
      if (tag === 0x8769) visit(u32(e + 8));
    }
  };
  visit(u32(4));
  return findings;
}

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
      if (!/^(Software|Creation Time|date:|icc|exif:Pixel)/i.test(key)) {
        findings.push({ kind: "metadata", detail: 'PNG text chunk "' + key + '"' });
      }
    }
    if (type === "IEND") break;
    p += 12 + len;
  }
  return findings;
}

/* One file's findings, from its repository path and its bytes */
export function checkFile(rel, buf, matchers, { drafts = true } = {}) {
  const kind = kindOf(rel);
  if (kind === "text") return checkText(buf.toString("utf8"), matchers, { drafts: drafts && draftsApply(rel) });
  if (kind === "image") return /\.png$/i.test(rel) ? checkPng(buf) : checkJpeg(buf);
  return [];
}

/* ------------------------------------------------------------- sources */

export function git(root, args, opts = {}) {
  return execFileSync("git", args, { cwd: root, maxBuffer: 256 * 1024 * 1024, ...opts });
}

/* Read many blobs in one git process: [{ rel, sha }] -> [{ rel, buf }] */
export function readBlobs(root, entries) {
  if (!entries.length) return [];
  const out = git(root, ["cat-file", "--batch"], { input: entries.map((e) => e.sha).join("\n") + "\n" });
  const result = [];
  let p = 0;
  for (const e of entries) {
    const nl = out.indexOf(0x0a, p);
    const header = out.toString("latin1", p, nl).split(" ");
    if (header[1] === "missing") {
      p = nl + 1;
      continue;
    }
    const size = Number(header[2]);
    result.push({ ...e, buf: out.subarray(nl + 1, nl + 1 + size) });
    p = nl + 1 + size + 1;
  }
  return result;
}

/* What is staged: the index, exactly as it will be committed */
export function stagedFiles(root) {
  const raw = git(root, ["ls-files", "-s", "-z"]).toString("utf8");
  const entries = raw
    .split("\0")
    .filter(Boolean)
    .map((line) => {
      const tab = line.indexOf("\t");
      const [mode, sha] = line.slice(0, tab).split(" ");
      return { mode, sha, rel: line.slice(tab + 1) };
    })
    .filter((e) => e.mode !== "160000"); /* submodules */
  return readBlobs(root, entries);
}

const ZERO = /^0+$/;

/* Commits that a push would send. Reads git's pre-push lines
   ("<local ref> <local sha> <remote ref> <remote sha>"), or takes a range. */
export function outgoingCommits(root, { prePushInput, range } = {}) {
  const lists = [];
  const revList = (args) => {
    try {
      return git(root, ["rev-list", ...args]).toString("utf8").split("\n").filter(Boolean);
    } catch (e) {
      return null;
    }
  };
  if (range) lists.push(revList([range]) || []);
  for (const line of String(prePushInput || "").split("\n")) {
    const [, localSha, , remoteSha] = line.trim().split(/\s+/);
    if (!localSha || ZERO.test(localSha)) continue; /* deleting a branch */
    const known = remoteSha && !ZERO.test(remoteSha) ? revList([remoteSha + ".." + localSha]) : null;
    lists.push(known || revList([localSha, "--not", "--remotes"]) || []);
  }
  return Array.from(new Set(lists.flat()));
}

/* Every file version added or changed by those commits, and their messages */
export function commitContents(root, commits) {
  const entries = [];
  const seen = new Set();
  for (const c of commits) {
    const raw = git(root, ["diff-tree", "-r", "-z", "--no-commit-id", "--root", "-m", c]).toString("utf8").split("\0");
    for (let i = 0; i + 1 < raw.length; i += 2) {
      const meta = raw[i].trim().split(" ");
      const sha = meta[3];
      const status = (meta[4] || "")[0];
      let rel = raw[i + 1];
      if (status === "R" || status === "C") rel = raw[(i += 1) + 1]; /* rename: old path, then new */
      if (!sha || ZERO.test(sha) || status === "D" || meta[1] === "160000") continue;
      if (seen.has(sha + rel)) continue;
      seen.add(sha + rel);
      entries.push({ rel, sha, commit: c });
    }
  }
  const files = readBlobs(root, entries);
  const messages = commits.map((c) => ({ commit: c, text: git(root, ["log", "-1", "--format=%B", c]).toString("utf8") }));
  return { files, messages };
}

/* The working tree as git would publish it: tracked files plus new files
   that aren't ignored. Paths come from git, so they use forward slashes on
   every platform. */
export function workingFiles(root) {
  const list = git(root, ["ls-files", "--cached", "--others", "--exclude-standard", "-z"]).toString("utf8").split("\0").filter(Boolean);
  return list.filter((rel) => existsSync(join(root, rel))).map((rel) => ({ rel, buf: readFileSync(join(root, rel)) }));
}

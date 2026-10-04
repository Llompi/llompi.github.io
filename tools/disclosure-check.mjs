#!/usr/bin/env node
/* Disclosure check: is any of this safe to publish? Node 18+, no deps.
   The rules and the private denylist are described in tools/lib/disclosure.mjs.

   Usage:
     node tools/disclosure-check.mjs              the working tree as git would publish it
     node tools/disclosure-check.mjs --staged     exactly what is staged (pre-commit hook)
     node tools/disclosure-check.mjs --push       the commits a push would send; reads
                                                  git's pre-push lines on stdin (pre-push hook)
     node tools/disclosure-check.mjs --range A..B the commits in a range (CI)
     node tools/disclosure-check.mjs --message F  a commit message file (commit-msg hook)
     node tools/disclosure-check.mjs file ...     specific files

   Exit code 1 on any finding. Commit and push checks look at the contents
   git actually stores, never at a working copy that may have changed. */

import { readFileSync } from "node:fs";
import { relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
  TERMS_FILE, loadTerms, termMatchers, checkText, checkFile, kindOf,
  stagedFiles, outgoingCommits, commitContents, workingFiles, git
} from "./lib/disclosure.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const value = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : null;
};

const terms = loadTerms();
const matchers = termMatchers(terms);
const report = [];
const opaque = [];
let scanned = 0;
let scope = "files";

function scan(files, { drafts = true, label, changed } = {}) {
  for (const f of files) {
    scanned++;
    if (kindOf(f.rel) === "opaque" && (!changed || changed.has(f.rel))) opaque.push(f.rel);
    for (const x of checkFile(f.rel, f.buf, matchers, { drafts })) {
      report.push((label ? label(f) : "") + f.rel + (x.line ? ":" + x.line : "") + "  " + x.kind + "  " + x.detail);
    }
  }
}

if (flag("--staged")) {
  scope = "staged files";
  /* Every staged file is checked; binaries are listed only when this
     commit adds or changes them, so the note isn't noise on every commit */
  let changed = new Set();
  try {
    changed = new Set(git(ROOT, ["diff", "--cached", "--name-only", "-z"]).toString("utf8").split("\0").filter(Boolean));
  } catch (e) {}
  scan(stagedFiles(ROOT), { changed });
} else if (flag("--push") || flag("--range")) {
  const input = flag("--push") ? readFileSync(0, "utf8") : "";
  const commits = outgoingCommits(ROOT, { prePushInput: input, range: value("--range") });
  scope = commits.length + " outgoing commit(s)";
  const { files, messages } = commitContents(ROOT, commits);
  /* History is checked for terms and photo data; draft markers only matter
     in the final pages, which pre-commit already checked */
  scan(files, { drafts: false, label: (f) => f.commit.slice(0, 7) + " " });
  for (const m of messages) {
    for (const x of checkText(m.text, matchers, { drafts: false })) {
      report.push(m.commit.slice(0, 7) + " commit message:" + x.line + "  " + x.kind + "  " + x.detail);
    }
  }
} else if (flag("--message")) {
  scope = "commit message";
  const text = readFileSync(value("--message"), "utf8").replace(/^#.*$/gm, "");
  for (const x of checkText(text, matchers, { drafts: false })) report.push("commit message:" + x.line + "  " + x.kind + "  " + x.detail);
} else {
  const paths = argv.filter((a) => !a.startsWith("--"));
  if (paths.length) {
    scan(paths.map((p) => ({ rel: relative(ROOT, resolve(p)).split(sep).join("/"), buf: readFileSync(p) })));
  } else {
    scope = "files git would publish";
    scan(workingFiles(ROOT));
  }
}

const note = terms.length ? terms.length + " private terms" : "no private terms loaded (" + TERMS_FILE + " not found)";
if (opaque.length) {
  console.log("Not checked (binary; look at these yourself): " + Array.from(new Set(opaque)).join(", "));
}
if (report.length) {
  console.log(report.join("\n"));
  console.log("\n" + report.length + " finding(s) in " + scope + ", " + note + ". Nothing above is safe to publish until it is resolved.");
  process.exit(1);
}
const what = scope === "commit message" ? "commit message" : /outgoing/.test(scope) ? scanned + " file versions in " + scope : scanned + " " + scope;
console.log("Disclosure check passed: " + what + ", " + note + ".");

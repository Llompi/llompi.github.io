#!/usr/bin/env node
/* One-screen status of everything the site depends on that lives outside
   the code: Actions secrets and variables, the last workflow runs, Pages,
   the Threads mirror, and the local private files. Built to be read on a
   phone through Claude Code Remote Control.

   Needs the GitHub CLI (`gh`) signed in on this computer. Secret values are
   never read; GitHub only exposes names and update times, and that is all
   this prints.

   Usage:
     node tools/site-status.mjs          full report
     node tools/site-status.mjs --brief  three lines, for a session-start hook
     node tools/site-status.mjs --json   machine-readable */

import { execFileSync, execFile } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { TERMS_FILE, loadTerms } from "./lib/disclosure.mjs";

/* fileURLToPath, not .pathname: on Windows .pathname gives /C:/... */
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const args = new Set(process.argv.slice(2));
const DAY = 86400000;

function sh(cmd, argv, opts = {}) {
  try {
    return execFileSync(cmd, argv, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 8000, ...opts }).trim();
  } catch (e) {
    return null;
  }
}

function repoSlug() {
  if (process.env.SITE_REPO) return process.env.SITE_REPO;
  const url = sh("git", ["remote", "get-url", "origin"]) || "";
  const m = url.match(/[/:]([^/:]+)\/([^/]+?)(?:\.git)?$/);
  return m ? m[1] + "/" + m[2] : null;
}

/* All GitHub calls run at once under one deadline, so a slow API costs
   seconds, not minutes. A call that fails is "unknown", never "missing". */
function gh(path) {
  return new Promise((done) => {
    execFile("gh", ["api", path], { cwd: ROOT, encoding: "utf8", timeout: 10000 }, (err, out) => {
      if (err) return done(undefined);
      try {
        done(JSON.parse(out));
      } catch (e) {
        done(undefined);
      }
    });
  });
}

function ago(iso) {
  if (!iso) return "never";
  const d = Math.round((Date.now() - new Date(iso).getTime()) / DAY);
  return d <= 0 ? "today" : d === 1 ? "1 day ago" : d + " days ago";
}

const repo = repoSlug();
/* gh auth status exits non-zero when signed out, which sh() turns into null */
const hasGh = sh("gh", ["--version"]) !== null;
const ghAuthed = hasGh && sh("gh", ["auth", "status"]) !== null;
const report = { repo, gh: ghAuthed, reachable: false, secrets: {}, variables: {}, runs: {}, pages: null, threads: null, local: {}, next: [] };

if (repo && ghAuthed) {
  const [secrets, vars, sync, check, pages] = await Promise.all([
    gh(`repos/${repo}/actions/secrets`),
    gh(`repos/${repo}/actions/variables`),
    gh(`repos/${repo}/actions/workflows/threads-sync.yml/runs?per_page=1`),
    gh(`repos/${repo}/actions/workflows/disclosure-check.yml/runs?per_page=1`),
    gh(`repos/${repo}/pages/builds/latest`)
  ]);
  report.reachable = secrets !== undefined;
  for (const s of (secrets && secrets.secrets) || []) report.secrets[s.name] = s.updated_at;
  for (const v of (vars && vars.variables) || []) report.variables[v.name] = v.value;
  const run = (r) => (r && r.workflow_runs && r.workflow_runs[0]) || null;
  for (const [wf, r] of [["threads-sync.yml", run(sync)], ["disclosure-check.yml", run(check)]]) {
    report.runs[wf] = r ? { status: r.status, conclusion: r.conclusion, at: r.updated_at, branch: r.head_branch, url: r.html_url } : null;
  }
  report.pages = pages ? { status: pages.status, at: pages.updated_at || pages.created_at } : null;
}

try {
  const t = JSON.parse(readFileSync(join(ROOT, "data/threads.json"), "utf8"));
  report.threads = { handle: t.handle || null, synced: t.synced, items: (t.items || []).length };
} catch (e) {}

/* Only the count; the terms stay in the file, outside the repository */
report.local.denylist = existsSync(TERMS_FILE) ? loadTerms().length : 0;
report.local.oldDenylist = existsSync(join(ROOT, ".disclosure-terms"));
report.local.hooks = sh("git", ["config", "core.hooksPath"]) === ".githooks" && existsSync(join(ROOT, ".githooks", "pre-commit"));
report.local.secretsConfig = existsSync(join(ROOT, ".claude/secrets.local.json"));
report.local.branch = sh("git", ["rev-parse", "--abbrev-ref", "HEAD"]);
report.local.dirty = (sh("git", ["status", "--porcelain"]) || "").split("\n").filter(Boolean).length;

/* What to do next, most important first */
const settings = repo ? `https://github.com/${repo}/settings/secrets/actions` : null;
if (!hasGh) report.next.push("Install the GitHub CLI on this computer (https://cli.github.com), then: gh auth login");
else if (!ghAuthed) report.next.push("Sign in to the GitHub CLI on this computer: gh auth login");
else if (repo && !report.reachable) report.next.push("Couldn't reach GitHub just now, so secrets and runs below are unknown, not missing.");
if (!report.local.hooks) report.next.push("Turn on the commit and push checks: git config core.hooksPath .githooks");
if (report.local.oldDenylist) report.next.push("Move the old .disclosure-terms out of the repository folder: /secrets denylist");
const sync = report.runs["threads-sync.yml"];
if (sync && sync.conclusion === "failure") report.next.push("The last Threads sync failed: " + sync.url);
const check = report.runs["disclosure-check.yml"];
if (check && check.conclusion === "failure") report.next.push("The last disclosure check failed on " + check.branch + ": " + check.url);
const tokenAge = report.secrets.THREADS_ACCESS_TOKEN ? (Date.now() - new Date(report.secrets.THREADS_ACCESS_TOKEN).getTime()) / DAY : null;
if (tokenAge !== null && !report.secrets.SECRETS_WRITE_TOKEN && tokenAge > 50) {
  report.next.push("Threads token expires in about " + Math.max(0, Math.round(60 - tokenAge)) + " days; renew it with /secrets threads");
}
if (report.secrets.THREADS_ACCESS_TOKEN && report.variables.THREADS_SYNC_ENABLED !== "true") report.next.push("Turn the Threads sync on: gh variable set THREADS_SYNC_ENABLED --body true");
/* Optional extras last, and only once nothing above is waiting */
if (!report.next.length) {
  if (!report.local.denylist) report.next.push("Optional: a private denylist on this computer (/secrets denylist)");
  if (report.reachable && !report.secrets.THREADS_ACCESS_TOKEN) report.next.push("Optional: connect Threads so Notes appear (/secrets threads)");
}

if (args.has("--json")) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

const tick = (ok) => (ok ? "ok " : "-- ");
if (args.has("--brief")) {
  const syncTxt = report.threads && report.threads.synced ? report.threads.items + " notes, synced " + ago(report.threads.synced) : "Threads not synced yet";
  console.log("Site " + (repo || "?") + " on " + report.local.branch + (report.local.dirty ? ", " + report.local.dirty + " uncommitted" : "") + ". " + syncTxt + ".");
  console.log(report.next.length ? "Next: " + report.next[0] : "Nothing waiting.");
  process.exit(0);
}

const lines = [];
lines.push("Site: " + (repo || "unknown repo") + "   branch " + report.local.branch + (report.local.dirty ? " (" + report.local.dirty + " uncommitted)" : ""));
lines.push("");
lines.push("Secrets (names and dates only)");
for (const name of ["THREADS_ACCESS_TOKEN", "THREADS_APP_SECRET", "SECRETS_WRITE_TOKEN", "DISCLOSURE_TERMS"]) {
  lines.push("  " + tick(report.secrets[name]) + name.padEnd(22) + (report.secrets[name] ? "set " + ago(report.secrets[name]) : report.reachable ? "not set (optional)" : "unknown"));
}
lines.push("  " + tick(report.variables.THREADS_SYNC_ENABLED === "true") + "THREADS_SYNC_ENABLED".padEnd(22) + (report.variables.THREADS_SYNC_ENABLED || "not set"));
lines.push("");
lines.push("Workflows");
for (const [wf, r] of Object.entries(report.runs)) {
  lines.push("  " + tick(r && r.conclusion === "success") + wf.padEnd(22) + (r ? (r.conclusion || r.status) + ", " + ago(r.at) : "no runs"));
}
lines.push("  " + tick(report.pages && report.pages.status === "built") + "pages".padEnd(22) + (report.pages ? report.pages.status + ", " + ago(report.pages.at) : "unknown"));
lines.push("");
lines.push("Threads mirror");
lines.push("  " + (report.threads && report.threads.synced ? report.threads.items + " notes from @" + report.threads.handle + ", synced " + ago(report.threads.synced) : "not synced yet (the Notes section stays hidden)"));
lines.push("");
lines.push("This computer");
lines.push("  " + tick(report.local.denylist) + "denylist".padEnd(22) + (report.local.denylist ? report.local.denylist + " terms (values not shown)" : "none (optional)"));
lines.push("  " + tick(report.local.hooks) + "commit/push checks".padEnd(22) + (report.local.hooks ? "on" : "off"));
if (report.local.secretsConfig) lines.push("  ok " + "password manager".padEnd(22) + "configured (.claude/secrets.local.json)");
lines.push("");
lines.push(report.next.length ? "Next:\n" + report.next.map((n, i) => "  " + (i + 1) + ". " + n).join("\n") : "Nothing waiting.");
console.log(lines.join("\n"));

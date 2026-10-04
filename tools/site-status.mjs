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

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/* fileURLToPath, not .pathname: on Windows .pathname gives /C:/... */
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const args = new Set(process.argv.slice(2));
const DAY = 86400000;

function sh(cmd, argv, opts = {}) {
  try {
    return execFileSync(cmd, argv, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 15000, ...opts }).trim();
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

function gh(path) {
  const out = sh("gh", ["api", path]);
  if (out === null) return null;
  try {
    return JSON.parse(out);
  } catch (e) {
    return null;
  }
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
const report = { repo, gh: ghAuthed, secrets: {}, variables: {}, runs: {}, pages: null, threads: null, local: {}, next: [] };

if (repo && ghAuthed) {
  const secrets = gh(`repos/${repo}/actions/secrets`);
  for (const s of (secrets && secrets.secrets) || []) report.secrets[s.name] = s.updated_at;
  const vars = gh(`repos/${repo}/actions/variables`);
  for (const v of (vars && vars.variables) || []) report.variables[v.name] = v.value;
  for (const wf of ["threads-sync.yml", "disclosure-check.yml"]) {
    const runs = gh(`repos/${repo}/actions/workflows/${wf}/runs?per_page=1`);
    const r = runs && runs.workflow_runs && runs.workflow_runs[0];
    report.runs[wf] = r ? { status: r.status, conclusion: r.conclusion, at: r.updated_at, branch: r.head_branch, url: r.html_url } : null;
  }
  const pages = gh(`repos/${repo}/pages/builds/latest`);
  report.pages = pages ? { status: pages.status, at: pages.updated_at || pages.created_at } : null;
}

try {
  const t = JSON.parse(readFileSync(join(ROOT, "data/threads.json"), "utf8"));
  report.threads = { handle: t.handle || null, synced: t.synced, items: (t.items || []).length };
} catch (e) {}

report.local.denylist = existsSync(join(ROOT, ".disclosure-terms"))
  ? readFileSync(join(ROOT, ".disclosure-terms"), "utf8").split(/\r?\n/).filter((l) => l.trim() && !l.trim().startsWith("#")).length
  : 0;
report.local.secretsConfig = existsSync(join(ROOT, ".claude/secrets.local.json"));
report.local.branch = sh("git", ["rev-parse", "--abbrev-ref", "HEAD"]);
report.local.dirty = (sh("git", ["status", "--porcelain"]) || "").split("\n").filter(Boolean).length;

/* What to do next, most important first */
const settings = repo ? `https://github.com/${repo}/settings/secrets/actions` : null;
if (!hasGh) report.next.push("Install the GitHub CLI on this computer (https://cli.github.com), then: gh auth login");
else if (!ghAuthed) report.next.push("Sign in to the GitHub CLI on this computer: gh auth login");
if (ghAuthed && !report.secrets.DISCLOSURE_TERMS) report.next.push("Set the private denylist: /secrets push DISCLOSURE_TERMS (or add it at " + settings + ")");
if (ghAuthed && !report.secrets.THREADS_ACCESS_TOKEN) report.next.push("Threads is not connected: /secrets threads");
const tokenAge = report.secrets.THREADS_ACCESS_TOKEN ? (Date.now() - new Date(report.secrets.THREADS_ACCESS_TOKEN).getTime()) / DAY : null;
if (tokenAge !== null && !report.secrets.SECRETS_WRITE_TOKEN && tokenAge > 50) {
  report.next.push("Threads token expires in about " + Math.max(0, Math.round(60 - tokenAge)) + " days; renew with /secrets threads, or add SECRETS_WRITE_TOKEN so it renews itself");
}
if (report.secrets.THREADS_ACCESS_TOKEN && report.variables.THREADS_SYNC_ENABLED !== "true") report.next.push("Turn the sync on: gh variable set THREADS_SYNC_ENABLED --body true");
const sync = report.runs["threads-sync.yml"];
if (sync && sync.conclusion === "failure") report.next.push("The last Threads sync failed: " + sync.url);
const check = report.runs["disclosure-check.yml"];
if (check && check.conclusion === "failure") report.next.push("The last disclosure check failed on " + check.branch + ": " + check.url);
if (!report.local.denylist) report.next.push("No local denylist, so local checks only catch photo metadata and drafts: /secrets pull-denylist");

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
for (const name of ["DISCLOSURE_TERMS", "THREADS_ACCESS_TOKEN", "SECRETS_WRITE_TOKEN"]) {
  lines.push("  " + tick(report.secrets[name]) + name.padEnd(22) + (report.secrets[name] ? "set " + ago(report.secrets[name]) : "missing"));
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
lines.push("  " + tick(report.local.denylist) + "denylist".padEnd(22) + (report.local.denylist ? report.local.denylist + " terms (values not shown)" : "missing"));
lines.push("  " + tick(report.local.secretsConfig) + "secrets config".padEnd(22) + (report.local.secretsConfig ? "present" : "missing (.claude/secrets.local.json)"));
lines.push("");
lines.push(report.next.length ? "Next:\n" + report.next.map((n, i) => "  " + (i + 1) + ". " + n).join("\n") : "Nothing waiting.");
console.log(lines.join("\n"));

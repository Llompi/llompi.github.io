#!/usr/bin/env node
/* Moves secrets from your password manager to GitHub without them ever
   passing through a chat, a command line, or a log.

   Why this exists: when you drive Claude Code from your phone, anything you
   type goes to the model. So values never get typed. They live in your
   password manager (which syncs to your phone), and this script, running on
   your computer, reads them with the manager's own CLI and hands them to
   `gh secret set` on stdin. Only names, lengths, and dates are printed.

   Where each value comes from is set in .claude/secrets.local.json (never
   committed). Each entry is a command that prints the value. It runs in the
   platform shell (cmd.exe on Windows, sh elsewhere), so quote with double
   quotes; set "shell": "powershell.exe" on an entry to use PowerShell:

     {
       "DISCLOSURE_TERMS":     { "cmd": "op read \"op://Private/Site denylist/notesPlain\"" },
       "THREADS_ACCESS_TOKEN": { "cmd": "op read \"op://Private/Threads API/token\"" },
       "THREADS_APP_SECRET":   { "cmd": "op read \"op://Private/Threads API/app secret\"", "github": false },
       "SECRETS_WRITE_TOKEN":  { "cmd": "op read \"op://Private/GitHub site PAT/token\"" }
     }

   Works with any manager that has a CLI: 1Password (op read), Bitwarden
   (bw get password / bw get notes), pass (pass show), macOS Keychain
   (security find-generic-password -w -s NAME), Windows Credential Manager
   through PowerShell's CredentialManager module. "github": false keeps an
   entry local; it is used by this script but never uploaded.

   Usage:
     node tools/secrets.mjs status               what is configured and what GitHub has
     node tools/secrets.mjs check                run each command, report length only
     node tools/secrets.mjs push NAME            upload one secret to GitHub
     node tools/secrets.mjs push --all           upload every entry not marked github:false
     node tools/secrets.mjs pull-denylist        write .disclosure-terms for local checks
     node tools/secrets.mjs threads [--enable]   make the Threads token long-lived, verify it,
                                                 upload it, and optionally turn the sync on
     node tools/secrets.mjs link NAME            GitHub page to set it by hand from a phone */

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, delimiter, dirname } from "node:path";
import { TERMS_FILE } from "./lib/disclosure.mjs";
import { fileURLToPath } from "node:url";

/* fileURLToPath, not .pathname: on Windows .pathname gives /C:/... */
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const CONFIG = join(ROOT, ".claude/secrets.local.json");
const [cmd, ...rest] = process.argv.slice(2);

function die(msg) {
  console.error(msg);
  process.exit(1);
}

function repoSlug() {
  if (process.env.SITE_REPO) return process.env.SITE_REPO;
  let url = "";
  try {
    url = execFileSync("git", ["remote", "get-url", "origin"], { cwd: ROOT, encoding: "utf8" }).trim();
  } catch (e) {}
  const m = url.match(/[/:]([^/:]+)\/([^/]+?)(?:\.git)?$/);
  return m ? m[1] + "/" + m[2] : die("Could not tell which GitHub repository this is. Set SITE_REPO=owner/name.");
}

function loadConfig() {
  if (!existsSync(CONFIG)) {
    die(
      "No .claude/secrets.local.json yet. Copy .claude/secrets.example.json to .claude/secrets.local.json\n" +
        "and point each entry at your password manager. Values never go in that file, only the commands."
    );
  }
  return parseConfig();
}

/* The parser's own error quotes the offending line, which could be a value
   pasted where a command belongs, so it is never shown */
function parseConfig() {
  try {
    return JSON.parse(readFileSync(CONFIG, "utf8").replace(/^\uFEFF/, ""));
  } catch (e) {
    die(".claude/secrets.local.json is not valid JSON. Fix it at the computer.");
  }
}

/* Runs the configured command and returns its stdout. The command text is
   the user's own config; its output stays in this process. */
function readValue(name, config, { keepNewlines = false } = {}) {
  const entry = config[name];
  if (!entry || !entry.cmd) die(name + " has no command in .claude/secrets.local.json");
  const r = spawnSync(entry.cmd, { shell: entry.shell || true, cwd: ROOT, env: toolEnv(), encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 60000, windowsHide: true });
  if (r.status !== 0) {
    /* stderr is not shown: a shell's "not found" message would quote a value
       pasted in place of a command */
    die(name + ": the command failed (exit code " + r.status + "). Is the password manager unlocked, and is the item path right?");
  }
  /* Normalise Windows line endings so terms match on every platform */
  const out = r.stdout.replace(/\r\n/g, "\n");
  const value = keepNewlines ? out.replace(/\s+$/, "") + "\n" : out.trim();
  if (!value.trim()) die(name + ": the command printed nothing.");
  return value;
}

/* A CLI installed with winget after Claude Code started is not on this
   process's PATH yet; its shim folder is added so it is found anyway. */
function toolEnv() {
  const env = { ...process.env };
  if (process.platform === "win32" && env.LOCALAPPDATA) {
    const links = join(env.LOCALAPPDATA, "Microsoft", "WinGet", "Links");
    const key = Object.keys(env).find((k) => k.toLowerCase() === "path") || "PATH";
    if (!String(env[key] || "").toLowerCase().includes(links.toLowerCase())) env[key] = (env[key] || "") + delimiter + links;
  }
  return env;
}

function onPath(cmd) {
  const probe = process.platform === "win32" ? spawnSync("where", [cmd], { env: toolEnv(), stdio: "ignore" }) : spawnSync("sh", ["-c", "command -v " + cmd], { stdio: "ignore" });
  return probe.status === 0;
}

function ghAvailable() {
  return spawnSync("gh", ["auth", "status"], { stdio: "ignore" }).status === 0;
}

function ghSecretSet(repo, name, value) {
  const r = spawnSync("gh", ["secret", "set", name, "--repo", repo], { input: value, encoding: "utf8", stdio: ["pipe", "ignore", "pipe"] });
  if (r.status !== 0) die("gh could not set " + name + ": " + (r.stderr || "").trim());
}

function ghSecrets(repo) {
  const r = spawnSync("gh", ["api", `repos/${repo}/actions/secrets`], { encoding: "utf8" });
  if (r.status !== 0) return {};
  const out = {};
  for (const s of JSON.parse(r.stdout).secrets || []) out[s.name] = s.updated_at;
  return out;
}

function describe(name, value) {
  const lines = value.split("\n").filter((l) => l.trim() && !l.trim().startsWith("#")).length;
  return name === "DISCLOSURE_TERMS" ? lines + " terms" : value.length + " characters";
}

async function threadsGet(url) {
  const res = await fetch(url);
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error) throw new Error((body.error && body.error.message) || res.status + " " + res.statusText);
  return body;
}

const repo = repoSlug();

switch (cmd) {
  case "status": {
    const config = existsSync(CONFIG) ? parseConfig() : {};
    const remote = ghAvailable() ? ghSecrets(repo) : null;
    const names = new Set([...Object.keys(config), ...Object.keys(remote || {}), "DISCLOSURE_TERMS", "THREADS_ACCESS_TOKEN", "SECRETS_WRITE_TOKEN"]);
    const op = onPath("op");
    const sa = Boolean(process.env.OP_SERVICE_ACCOUNT_TOKEN);
    console.log("1Password CLI: " + (op ? "installed" : "not found") + (op ? ", service account " + (sa ? "set" : "not set (run tools/setup-1password.ps1 at the computer)") : ""));
    console.log("");
    console.log("name".padEnd(24) + "source here".padEnd(16) + "on GitHub");
    for (const n of names) {
      const local = config[n] ? (config[n].github === false ? "local only" : "configured") : "-";
      const gh = remote === null ? "gh not signed in" : remote[n] ? "set " + remote[n].slice(0, 10) : config[n] && config[n].github === false ? "(never uploaded)" : "missing";
      console.log(n.padEnd(24) + local.padEnd(16) + gh);
    }
    break;
  }

  case "check": {
    const config = loadConfig();
    for (const n of Object.keys(config)) {
      const v = readValue(n, config, { keepNewlines: n === "DISCLOSURE_TERMS" });
      console.log("ok  " + n.padEnd(24) + describe(n, v));
    }
    break;
  }

  case "push": {
    if (!ghAvailable()) die("Sign in to the GitHub CLI on this computer first: gh auth login");
    const config = loadConfig();
    const names = rest[0] === "--all" ? Object.keys(config).filter((n) => config[n].github !== false) : rest;
    if (!names.length) die("Which secret? node tools/secrets.mjs push NAME");
    for (const n of names) {
      if (config[n] && config[n].github === false) die(n + " is marked local only and is never uploaded.");
      const v = readValue(n, config, { keepNewlines: n === "DISCLOSURE_TERMS" });
      ghSecretSet(repo, n, v);
      console.log("Uploaded " + n + " (" + describe(n, v) + ") to " + repo);
    }
    break;
  }

  case "pull-denylist": {
    const config = loadConfig();
    const v = readValue("DISCLOSURE_TERMS", config, { keepNewlines: true });
    mkdirSync(dirname(TERMS_FILE), { recursive: true });
    writeFileSync(TERMS_FILE, v, { mode: 0o600 });
    console.log("Wrote the local denylist (" + describe("DISCLOSURE_TERMS", v) + ") outside the repository.");
    break;
  }

  case "threads": {
    if (!ghAvailable()) die("Sign in to the GitHub CLI on this computer first: gh auth login");
    const config = loadConfig();
    let token = readValue("THREADS_ACCESS_TOKEN", config);
    const API = "https://graph.threads.com";
    let expires = null;

    /* A token copied from Meta's dashboard may be short-lived (an hour).
       Exchanging needs the app secret; refreshing needs a long-lived token
       at least a day old. Try the exchange, then the refresh, then keep the
       token as it is. */
    if (config.THREADS_APP_SECRET) {
      try {
        const secret = readValue("THREADS_APP_SECRET", config);
        const body = await threadsGet(`${API}/access_token?grant_type=th_exchange_token&client_secret=${encodeURIComponent(secret)}&access_token=${encodeURIComponent(token)}`);
        token = body.access_token;
        expires = body.expires_in;
        console.log("Exchanged for a long-lived token.");
      } catch (e) {
        /* Already long-lived tokens are rejected by the exchange */
      }
    }
    if (!expires) {
      try {
        const body = await threadsGet(`${API}/refresh_access_token?grant_type=th_refresh_token&access_token=${encodeURIComponent(token)}`);
        token = body.access_token;
        expires = body.expires_in;
        console.log("Refreshed the long-lived token.");
      } catch (e) {
        console.log("Using the token as it is (" + e.message.replace(token, "[token]") + ").");
      }
    }

    let me;
    try {
      me = await threadsGet(`${API}/v1.0/me?fields=username&access_token=${encodeURIComponent(token)}`);
    } catch (e) {
      die("Threads rejected the token: " + e.message.replace(token, "[token]") + ". Nothing was uploaded.");
    }
    ghSecretSet(repo, "THREADS_ACCESS_TOKEN", token);
    const until = expires ? new Date(Date.now() + expires * 1000).toISOString().slice(0, 10) : "unknown";
    console.log("Uploaded THREADS_ACCESS_TOKEN for @" + me.username + ", valid until " + until + ".");
    if (rest.includes("--enable")) {
      spawnSync("gh", ["variable", "set", "THREADS_SYNC_ENABLED", "--body", "true", "--repo", repo], { stdio: "ignore" });
      console.log("Turned the sync on. Run it now with: gh workflow run threads-sync.yml --repo " + repo);
    }
    if (expires) {
      console.log("Your password manager still holds the token you pasted; the renewed one lives only in GitHub.");
      console.log("Add SECRETS_WRITE_TOKEN to have the workflow renew it from now on.");
    }
    break;
  }

  case "link": {
    const n = rest[0];
    const base = `https://github.com/${repo}/settings/secrets/actions`;
    console.log(n ? "New: " + base + "/new  (name it " + n + ")\nUpdate: " + base + "/" + n : base);
    break;
  }

  default:
    die("Usage: node tools/secrets.mjs status | check | push NAME|--all | pull-denylist | threads [--enable] | link NAME");
}

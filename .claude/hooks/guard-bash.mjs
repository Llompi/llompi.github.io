#!/usr/bin/env node
/* PreToolUse hook for Bash (macOS, Linux) and PowerShell (Windows).

   A seatbelt, not a vault. It refuses the commands most likely to put a
   secret into the conversation by accident:
     - reading the private denylist (kept outside the repository)
     - calling a password manager CLI directly
     - putting a secret on gh's command line
     - printing secret environment variables, or dumping the whole environment
   and it keeps the git disclosure checks switched on:
     - no --no-verify on commit or push
     - no switching core.hooksPath away from .githooks
     - no commit or push while the checks are off

   The checks themselves are git hooks (.githooks/), which see exactly what
   is staged and exactly which commits a push sends, however git is called.
   This file can't be complete, and a determined command can get past it;
   it exists for the accidental cases. Exit code 2 blocks and tells Claude
   why. */

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

let input = {};
try {
  input = JSON.parse(readFileSync(0, "utf8"));
} catch (e) {
  process.exit(0);
}
if (input.tool_name && !["Bash", "PowerShell"].includes(input.tool_name)) process.exit(0);
const command = String((input.tool_input && input.tool_input.command) || "");
const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();

function block(msg) {
  process.stderr.write(msg + "\n");
  process.exit(2);
}

/* Split on shell separators so a harmless first command can't carry a
   second one, then peel off wrappers (rtk, sudo, env, bash -c, the
   PowerShell call operator) so "rtk cat x" is judged as "cat x". */
const WRAPPER = /^(?:(?:rtk|sudo|time|nice|nohup|command|exec|xargs(?:\s+-\S+)*|env(?:\s+\w+=\S*)*|&|\.|(?:ba|z)?sh\s+-c|cmd(?:\.exe)?\s+\/[ck]|(?:powershell|pwsh)(?:\.exe)?(?:\s+-\w+)*\s+-c(?:ommand)?)\s+)+/i;
const parts = command
  .split(/&&|\|\||;|\||\r?\n/)
  .map((p) => p.trim().replace(/^["'(]+|["')]+$/g, "").replace(WRAPPER, "").replace(/^["']|["']$/g, ""))
  .filter(Boolean);
const isTool = (p) => /^node\s+(?:\.[\\/])?tools[\\/][\w./\\-]+\.mjs\b/.test(p);

const SECRETS = "THREADS_ACCESS_TOKEN|THREADS_APP_SECRET|SECRETS_WRITE_TOKEN|DISCLOSURE_TERMS|GH_TOKEN|GITHUB_TOKEN|OP_SERVICE_ACCOUNT_TOKEN|OP_SESSION_\\w+|BW_SESSION";
const PRINT = "echo|printf|printenv|cat|type|write-host|write-output|out-host|get-content|gc|get-childitem|gci|dir|ls|get-item|gi|get-itemproperty|node|python3?|py|perl|ruby|reg";

for (const p of parts) {
  if (isTool(p)) continue;

  /* The denylist lives outside the repository; refuse anything that would
     show its contents. Naming it to ls, Test-Path, or in docs is fine. */
  const namesDenylist = /disclosure-terms|llompi-site[\\/]/i.test(p);
  const reader = /^(?:\S*[\\/])?(cat|tac|less|more|head|tail|grep|egrep|fgrep|rg|ag|ack|sed|awk|jq|bat|xxd|od|hexdump|strings|base64|nl|sort|uniq|cut|tr|tee|cp|mv|copy|scp|rsync|curl|wget|find|python3?|py|node|perl|ruby|diff|cmp|fc|git\s+diff|vi|vim|nano|notepad|code|open|start|pbcopy|xclip|clip|gh\s+gist|type|gc|get-content|select-string|sls|findstr|copy-item|cpi|import-csv|format-hex|get-item|gi)\b/i;
  if (namesDenylist && (reader.test(p) || /<\s*\S*disclosure-terms/i.test(p) || /\[(?:system\.)?io\.file\]::read/i.test(p))) {
    block("Blocked: that would show the private denylist in the conversation. To test it, run `node tools/disclosure-check.mjs`, which reports matches by number only. The owner edits the list themselves at the computer.");
  }

  if (/^(?:\S*[\\/])?(?:op(?:\.exe)?\s+(?:read|item\s+get|inject|signin)|bw(?:\.exe)?\s+(?:get|export|unlock)|pass\s+(?:show\s+)?\S|security\s+find-(?:generic|internet)-password|lpass\s+show|keepassxc-cli\s+show|get-storedcredential|get-secret\b|cmdkey\s+\/list)/i.test(p) && !/"cmd"\s*:/.test(p)) {
    block("Blocked: calling the password manager directly would print a secret into the conversation. Use `node tools/secrets.mjs check|push`, which reads it without printing it, or give the owner a GitHub link with `node tools/secrets.mjs link NAME`.");
  }

  if (/^(?:\S*[\\/])?gh(?:\.exe)?\s+secret\s+set\b/i.test(p) && /\s(?:-b\S*|--body\b)/.test(p)) {
    block("Blocked: a secret on the command line ends up in the transcript and shell history. The owner pastes it at the page from `node tools/secrets.mjs link NAME`.");
  }

  /* Whole-environment dumps carry every secret at once */
  if (/^(?:env|printenv|export\s+-p|set|declare\s+-x|compgen\s+-e)$/i.test(p) ||
      /^(?:get-childitem|gci|dir|ls)\s+env:\s*(?:\*|$)/i.test(p) ||
      /^(?:get-childitem|gci|dir|ls)\s+env:\S*[*?]/i.test(p) ||
      /\[(?:system\.)?environment\]::getenvironmentvariables\(/i.test(p) ||
      /process\.env\s*(?:\)|;|$|\s)/.test(p) && /^(?:node|deno|bun)\b/.test(p) ||
      /os\.environ\b(?!\s*\.get\(|\[)/.test(p) ||
      /reg(?:\.exe)?\s+query\s+hkcu\\environment/i.test(p) ||
      /get-itemproperty\s+(?:-path\s+)?['"]?hkcu:\\environment/i.test(p)) {
    block("Blocked: that prints every environment variable, secrets included. Check a single non-secret variable by name, or presence with `Test-Path env:NAME` / `[ -n \"$NAME\" ]`.");
  }
}

/* A named secret printed anywhere in a pipeline ("printenv | grep TOKEN").
   Pipelines are split on ; && || and newlines, but not on |. */
const pipelines = command
  .split(/&&|\|\||;|\r?\n/)
  .map((p) => p.trim().replace(WRAPPER, ""))
  .filter((p) => p && !isTool(p) && !/^(?:test-path|\[\s*-n|gh(?:\.exe)?\s+(?:secret|variable)\s+(?:list|delete|remove))/i.test(p));
const READER = /^(?:\S*[\\/])?(cat|tac|less|more|head|tail|grep|rg|sed|awk|jq|bat|xxd|od|strings|base64|nl|sort|cut|tr|tee|cp|copy|curl|python3?|node|perl|type|gc|get-content|select-string|sls|findstr|copy-item|format-hex)\b/i;
for (const p of pipelines) {
  /* "ls <dir> | xargs cat": the path and the reader sit on either side of a pipe */
  if (/disclosure-terms|llompi-site[\\/]/i.test(p) && p.includes("|") &&
      p.split("|").slice(1).some((q) => READER.test(q.trim().replace(WRAPPER, "")))) {
    block("Blocked: that would show the private denylist in the conversation. To test it, run `node tools/disclosure-check.mjs`, which reports matches by number only.");
  }
  if (new RegExp("(?:^|[\\s|(])(?:" + PRINT + ")\\b[^;]*\\b(?:" + SECRETS + ")\\b", "i").test(p) ||
      new RegExp("\\$env:(?:" + SECRETS + ")\\b|getenvironmentvariable\\(\\s*['\"](?:" + SECRETS + ")|\\$\\{?(?:" + SECRETS + ")\\b", "i").test(p)) {
    block("Blocked: that would print a secret's value. To check one exists: `Test-Path env:NAME` (PowerShell) or `[ -n \"$NAME\" ]` (bash), or `node tools/site-status.mjs` for GitHub secrets.");
  }
}

/* ---- keep the git disclosure checks on ---- */

const GIT = /(?:^|[\s;&|(])(?:\S*[\\/])?git(?:\.exe)?\b((?:\s+(?:-C|-c|--git-dir|--work-tree)\s+\S+|\s+--\S+)*)\s+([\w-]+)/gi;
const gitCalls = [...command.matchAll(GIT)].map((m) => ({ sub: m[2].toLowerCase(), rest: command.slice(m.index) }));

for (const g of gitCalls) {
  if (["commit", "push", "merge", "cherry-pick", "revert", "am", "rebase"].includes(g.sub)) {
    if (/\s--no-verify\b/.test(g.rest.split(/&&|\|\||;|\|/)[0]) || (g.sub === "commit" && /\s-\w*n\w*\b/.test(g.rest.split(/&&|\|\||;|\|/)[0].replace(/-m\s+("[^"]*"|'[^']*'|\S+)/g, "")))) {
      block("Blocked: --no-verify skips the disclosure checks that keep private terms and photo locations off the public site. Fix what the check reports instead.");
    }
  }
  if (g.sub === "config" && /core\.hookspath/i.test(g.rest.split(/&&|\|\||;|\|/)[0]) && !/core\.hookspath\s+\.githooks\b/i.test(g.rest)) {
    if (!/^git(?:\.exe)?\s+config\s+(?:--get\s+)?core\.hookspath\s*$/i.test(g.rest.split(/&&|\|\||;|\|/)[0].trim())) {
      block("Blocked: core.hooksPath points git at the disclosure checks in .githooks/. Leave it as is.");
    }
  }
}

if (gitCalls.some((g) => ["commit", "push", "merge", "cherry-pick", "revert", "am"].includes(g.sub))) {
  let hooks = null;
  try {
    hooks = execFileSync("git", ["config", "core.hooksPath"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch (e) {}
  if (hooks !== ".githooks") {
    block("Blocked: the git disclosure checks are off in this clone. Turn them on with `git config core.hooksPath .githooks`, then retry.");
  }
}

process.exit(0);

#!/usr/bin/env node
/* PreToolUse hook for Bash. Two jobs:

   1. Keep secret values out of the conversation. Commands that would print
      a value into the transcript (reading the private denylist, calling a
      password manager directly, putting a secret on the command line) are
      refused, with the safe alternative named. tools/secrets.mjs does the
      same work without printing anything, so it is the way through.

   2. Run the disclosure check before anything is committed or pushed, so a
      denylisted term or a GPS-tagged photo cannot leave this computer.

   Exit code 2 blocks the command and hands the message to Claude. */

import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

let input = {};
try {
  input = JSON.parse(readFileSync(0, "utf8"));
} catch (e) {
  process.exit(0);
}
/* Bash on macOS and Linux, PowerShell on Windows */
if (input.tool_name && !["Bash", "PowerShell"].includes(input.tool_name)) process.exit(0);
const command = String((input.tool_input && input.tool_input.command) || "");
const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();

function block(msg) {
  process.stderr.write(msg + "\n");
  process.exit(2);
}

/* Split on shell separators so a safe prefix cannot smuggle a second
   command, then drop wrappers (rtk, sudo, env, the PowerShell call
   operator) so "rtk cat x" is judged as "cat x". */
const WRAPPER = /^(?:(?:rtk|sudo|time|nice|command|exec|env(?:\s+\w+=\S*)*|&|\.|cmd(?:\.exe)?\s+\/c|(?:powershell|pwsh)(?:\.exe)?(?:\s+-\w+)*\s+-c(?:ommand)?)\s+)+/i;
const parts = command
  .split(/&&|\|\||;|\||\r?\n/)
  .map((p) => p.trim().replace(WRAPPER, "").replace(/^["']|["']$/g, ""))
  .filter(Boolean);
const isTool = (p) => /^node\s+(?:\.[\\/])?tools[\\/][\w.-]+\.mjs\b/.test(p);

const SECRET_NAMES = "THREADS_ACCESS_TOKEN|SECRETS_WRITE_TOKEN|DISCLOSURE_TERMS|THREADS_APP_SECRET|GH_TOKEN|GITHUB_TOKEN";

for (const p of parts) {
  if (isTool(p)) continue;

  /* Only commands that would put the file's contents on screen. Merely
     naming it (in docs written with a heredoc, in ls or git) is fine. */
  const reader = /^(cat|tac|less|more|head|tail|grep|egrep|fgrep|rg|ag|sed|awk|bat|xxd|od|hexdump|strings|base64|nl|sort|uniq|cut|tr|tee|cp|mv|copy|scp|rsync|curl|wget|python3?|py|node\s+-[ep]|perl|ruby|diff|cmp|fc|vi|vim|nano|notepad|code|open|start|pbcopy|xclip|clip|gh\s+gist|type|gc|get-content|select-string|sls|findstr|copy-item|cpi|import-csv|format-hex)\b/i;
  if (/\.disclosure-terms\b/i.test(p) && (reader.test(p) || /<\s*\S*\.disclosure-terms/i.test(p) || /\[(?:system\.)?io\.file\]::read/i.test(p))) {
    block("Blocked: that would read the private denylist into the conversation. To refresh it use `node tools/secrets.mjs pull-denylist`; to test it use `node tools/disclosure-check.mjs`, which reports matches by number only.");
  }
  if (!/"cmd"\s*:/.test(p) && /^(op(?:\.exe)?\s+(read|item\s+get|inject)|bw(?:\.exe)?\s+get|pass\s+(show)?|security\s+find-(generic|internet)-password|lpass\s+show|keepassxc-cli\s+show|get-storedcredential|get-secret\b|cmdkey\s+\/list)\b/i.test(p)) {
    block("Blocked: calling the password manager directly would print a secret into the conversation. Use `node tools/secrets.mjs check|push|threads`, which reads it without printing it.");
  }
  if (/^gh(?:\.exe)?\s+secret\s+set\b/i.test(p) && /(\s-b\b|\s--body\b)/.test(p)) {
    block("Blocked: a secret on the command line ends up in the transcript and shell history. Use `node tools/secrets.mjs push NAME`.");
  }
  const printsEnv = new RegExp("(printenv|echo|printf|^env\\b|write-host|write-output|get-childitem\\s+env:|gci\\s+env:|dir\\s+env:|ls\\s+env:)[^|;]*\\b(" + SECRET_NAMES + ")\\b", "i");
  const psEnv = new RegExp("\\$env:(" + SECRET_NAMES + ")\\b|getenvironmentvariable\\(\\s*['\"](" + SECRET_NAMES + ")", "i");
  if (printsEnv.test(p) || psEnv.test(p)) {
    block("Blocked: that would print a secret's value. Check presence with `node tools/secrets.mjs status` instead.");
  }
}

if (/\bgit\s+(commit|push)\b/.test(command)) {
  /* The hook runs before the command, so files a "git add" in the same
     command is about to stage are not staged yet: scan everything git
     could publish. Otherwise scan only what is committed or staged, so an
     unrelated untracked draft does not block the commit. */
  const scope = /\bgit\s+add\b/.test(command) ? [] : ["--tracked"];
  const r = spawnSync("node", [join(root, "tools/disclosure-check.mjs"), ...scope], { cwd: root, encoding: "utf8", timeout: 60000 });
  if (r.status !== 0) {
    block("Disclosure check failed, so this commit/push was stopped:\n" + (r.stdout || r.stderr || "").trim() + "\nFix the files above (terms are reported by number; see PUBLISHING.md), then try again.");
  }
}
process.exit(0);

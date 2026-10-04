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
if (input.tool_name && input.tool_name !== "Bash") process.exit(0);
const command = String((input.tool_input && input.tool_input.command) || "");
const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();

function block(msg) {
  process.stderr.write(msg + "\n");
  process.exit(2);
}

/* Split on shell separators so a safe prefix cannot smuggle a second command */
const parts = command.split(/&&|\|\||;|\||\n/).map((p) => p.trim()).filter(Boolean);
const isTool = (p) => /^node\s+tools\/[\w.-]+\.mjs\b/.test(p);

for (const p of parts) {
  if (isTool(p)) continue;

  /* Only commands that would put the file's contents on screen. Merely
     naming it (in docs written with a heredoc, in ls or git) is fine. */
  const reader = /^(cat|tac|less|more|head|tail|grep|egrep|fgrep|rg|ag|sed|awk|bat|xxd|od|hexdump|strings|base64|nl|sort|uniq|cut|tr|tee|cp|mv|scp|rsync|curl|wget|python3?|node\s+-[ep]|perl|ruby|diff|cmp|vi|vim|nano|code|open|pbcopy|xclip|gh\s+gist)\b/;
  if (/\.disclosure-terms\b/.test(p) && (reader.test(p) || /<\s*\S*\.disclosure-terms/.test(p))) {
    block("Blocked: that would read the private denylist into the conversation. To refresh it use `node tools/secrets.mjs pull-denylist`; to test it use `node tools/disclosure-check.mjs`, which reports matches by number only.");
  }
  if (/^(op\s+(read|item\s+get|inject)|bw\s+get|pass\s+(show)?|security\s+find-(generic|internet)-password|lpass\s+show|keepassxc-cli\s+show)\b/.test(p)) {
    block("Blocked: calling the password manager directly would print a secret into the conversation. Use `node tools/secrets.mjs check|push|threads`, which reads it without printing it.");
  }
  if (/^gh\s+secret\s+set\b/.test(p) && /(\s-b\b|\s--body\b)/.test(p)) {
    block("Blocked: a secret on the command line ends up in the transcript and shell history. Use `node tools/secrets.mjs push NAME`.");
  }
  if (/(printenv|echo|printf|env)\b.*\b(THREADS_ACCESS_TOKEN|SECRETS_WRITE_TOKEN|DISCLOSURE_TERMS|GH_TOKEN|GITHUB_TOKEN)\b/.test(p)) {
    block("Blocked: that would print a secret's value. Check presence with `node tools/secrets.mjs status` instead.");
  }
}

if (/\bgit\s+(commit|push)\b/.test(command)) {
  const r = spawnSync("node", [join(root, "tools/disclosure-check.mjs")], { cwd: root, encoding: "utf8", timeout: 60000 });
  if (r.status !== 0) {
    block("Disclosure check failed, so this commit/push was stopped:\n" + (r.stdout || r.stderr || "").trim() + "\nFix the files above (terms are reported by number; see PUBLISHING.md), then try again.");
  }
}
process.exit(0);

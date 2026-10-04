#!/usr/bin/env node
/* UserPromptSubmit hook: stops a message that contains a credential before
   it reaches the model. Driving a session from a phone makes it easy to
   paste a token into the chat by mistake.

   What it can and can't do: the model never sees a blocked message, and the
   block notice doesn't repeat it (suppressOriginalPrompt). But by the time
   the hook runs, the text has left the phone and Claude Code has written it
   to the session's local history. So the advice on a block is to revoke the
   credential and make a new one, not to carry on as if nothing happened. */

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const PATTERNS = [
  ["a GitHub token", /(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}/],
  ["a 1Password service account token", /ops_[A-Za-z0-9_-]{40,}/],
  ["a Threads or Meta access token", /(?:TH[A-Z]{2}|EAA)[A-Za-z0-9_-]{80,}/],
  ["an Anthropic API key", /sk-ant-[A-Za-z0-9_-]{20,}/],
  ["an OpenAI API key", /sk-(?:proj-)?[A-Za-z0-9_-]{32,}/],
  ["an AWS access key", /AKIA[0-9A-Z]{16}/],
  ["a Slack token", /xox[abprs]-[A-Za-z0-9-]{10,}/],
  ["a private key", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  /* Meta app secrets are 32 hex characters with no prefix. Git hashes are
     40 (or short), so an exact 32 run is worth stopping. */
  ["what looks like an app secret", /(?<![0-9a-f])[0-9a-f]{32}(?![0-9a-f])/i],
  ["a secret assignment", /\b(?:token|secret|password|passwd|api[_-]?key|client[_-]?secret)\b\s*[:=]\s*["']?[A-Za-z0-9_\-./+=]{16,}/i]
];

let input = {};
try {
  input = JSON.parse(readFileSync(0, "utf8"));
} catch (e) {
  process.exit(0);
}
/* The field has been called both prompt and user_message across versions */
const prompt = String(input.prompt || input.user_message || "");
/* A phone can break a long paste across lines; check a copy without spaces too */
const squeezed = prompt.replace(/\s+/g, "");

function repo() {
  try {
    const url = execFileSync("git", ["remote", "get-url", "origin"], { encoding: "utf8", cwd: input.cwd || process.cwd(), stdio: ["ignore", "pipe", "ignore"] }).trim();
    const m = url.match(/[/:]([^/:]+)\/([^/]+?)(?:\.git)?$/);
    return m ? m[1] + "/" + m[2] : "";
  } catch (e) {
    return "";
  }
}

function stop(message) {
  /* Keep the blocked text out of the notice */
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "UserPromptSubmit", suppressOriginalPrompt: true } }));
  process.stderr.write(message + "\n");
  process.exit(2);
}

if (/@\S*disclosure-terms/i.test(prompt)) {
  stop("Not sent: that would load the private denylist into the conversation. Edit it yourself at the computer; `node tools/disclosure-check.mjs` uses it without showing it.");
}

for (const [kind, re] of PATTERNS) {
  if (re.test(prompt) || (!["a secret assignment", "what looks like an app secret"].includes(kind) && re.test(squeezed))) {
    const r = repo();
    stop(
      "Not sent to Claude: this looks like it contains " + kind + ".\n" +
        "It has still left your phone and is saved in this session's history on the computer, so treat it as exposed: " +
        "revoke it and make a new one (GitHub: Settings, Developer settings, Personal access tokens; Meta: the app's settings). " +
        "Then paste the new one straight into GitHub" + (r ? ": https://github.com/" + r + "/settings/secrets/actions" : "") + ", never into the chat.\n" +
        "If it wasn't a credential (a hash, say), rephrase without it."
    );
  }
}
process.exit(0);

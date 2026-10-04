#!/usr/bin/env node
/* UserPromptSubmit hook: stops a message that contains a credential before
   it reaches the model. Driving a session from a phone makes it easy to
   paste a token into the chat; once sent, it is in the transcript.

   Exit code 2 blocks the prompt and shows the message below to you. Nothing
   is logged, and the matched text is never echoed back. */

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const PATTERNS = [
  ["a GitHub token", /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}\b|\bgithub_pat_[A-Za-z0-9_]{40,}\b/],
  ["a 1Password service account token", /\bops_[A-Za-z0-9_-]{40,}/],
  ["a Threads or Meta access token", /\b(?:TH[A-Z]{2}|EAA)[A-Za-z0-9_-]{80,}/],
  ["an Anthropic API key", /\bsk-ant-[A-Za-z0-9_-]{20,}/],
  ["an OpenAI API key", /\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}/],
  ["an AWS access key", /\bAKIA[0-9A-Z]{16}\b/],
  ["a Slack token", /\bxox[abprs]-[A-Za-z0-9-]{10,}/],
  ["a private key", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
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

for (const [kind, re] of PATTERNS) {
  if (re.test(prompt)) {
    let repo = "";
    try {
      const url = execFileSync("git", ["remote", "get-url", "origin"], { encoding: "utf8", cwd: input.cwd || process.cwd() }).trim();
      const m = url.match(/[/:]([^/:]+)\/([^/]+?)(?:\.git)?$/);
      if (m) repo = m[1] + "/" + m[2];
    } catch (e) {}
    process.stderr.write(
      "Not sent: this message looks like it contains " + kind + ", and anything sent here goes to the model.\n" +
        "Put the value in your password manager and ask for /secrets, or paste it straight into GitHub" +
        (repo ? ": https://github.com/" + repo + "/settings/secrets/actions" : ".") + "\n"
    );
    process.exit(2);
  }
}
process.exit(0);

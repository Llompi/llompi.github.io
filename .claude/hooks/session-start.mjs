#!/usr/bin/env node
/* SessionStart hook: make sure the git disclosure checks are on for this
   clone, then print a one-line site status for the conversation.

   The commit and push checks are git hooks in .githooks/. Git only runs
   them once core.hooksPath points there, and that setting is per clone, so
   a fresh clone or a new computer would otherwise be unprotected. Setting
   it is local and reversible (git config --unset core.hooksPath). */

import { execFileSync, spawnSync } from "node:child_process";
import { join } from "node:path";

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const git = (args) => {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch (e) {
    return null;
  }
};

if (git(["rev-parse", "--is-inside-work-tree"]) === "true" && git(["config", "core.hooksPath"]) !== ".githooks") {
  if (git(["config", "core.hooksPath", ".githooks"]) !== null) {
    console.log("Turned on the git commit and push disclosure checks for this clone (core.hooksPath = .githooks).");
  }
}

const status = spawnSync("node", [join(root, "tools", "site-status.mjs"), "--brief"], { cwd: root, encoding: "utf8", timeout: 20000 });
if (status.stdout) process.stdout.write(status.stdout);

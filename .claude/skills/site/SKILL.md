---
name: site
description: Status and day-to-day operations for this website. Use when the owner asks how the site is doing, what needs attention, whether Threads is syncing, wants to choose which Threads posts appear, run the sync, preview a change, or publish.
argument-hint: "[status | notes | curate | sync | publish | preview]"
allowed-tools: Bash(node tools/site-status.mjs), Bash(node tools/site-status.mjs *), Bash(node tools/threads-curate.mjs shown), Bash(node tools/threads-curate.mjs topics), Bash(gh run list *), Bash(gh run view *), Bash(git status), Bash(git diff *), Bash(git log *), PowerShell(node tools/site-status.mjs), PowerShell(node tools/site-status.mjs *), PowerShell(node tools/threads-curate.mjs shown), PowerShell(node tools/threads-curate.mjs topics), PowerShell(gh run list *), PowerShell(gh run view *), PowerShell(git status), PowerShell(git diff *), PowerShell(git log *)
---

# Site console

The owner is often on a phone through Remote Control. Answer in short lines a phone can show without scrolling sideways: no wide tables, lead with what needs doing, one question at a time when a choice is needed.

Request: $ARGUMENTS

## status (default when there is no argument)

Run `node tools/site-status.mjs`. Report in this order: anything failing, anything that needs the owner, then optional extras in one line. Don't repeat lines that are fine. "Unknown" means GitHub couldn't be reached, not that something is missing; say so.

## notes

Run `node tools/threads-curate.mjs shown`. Summarize what the site mirrors: count, date of the last sync, and the three most recent items in one line each.

## curate

Curating needs no token: the owner picks posts in the Threads app and pastes their links.

1. Run `node tools/threads-curate.mjs topics` and `shown`, and summarize the rules and what is shown now in a few lines.
2. Ask what to change. Posts tagged with one of the topics, or carrying one of the hashtags, appear on their own. For anything else the owner pastes a post link (Share, Copy link in the Threads app).
3. Apply with `node tools/threads-curate.mjs include|exclude|reset <link or id>`, or change the rules with `topic add|remove NAME` and `hashtag add|remove TAG`.
4. Show `git diff data/threads.config.json`, then ask before committing. Commit message: `data: curate Threads notes`.
5. After the push, offer to run the sync.

Posts that hit the private denylist are held back by the sync even when included. Don't try to work out which term matched.

## sync

The workflow exists only on `main`. Ask first, then run `gh workflow run threads-sync.yml`. Wait about a minute, then `gh run list --workflow threads-sync.yml --limit 1` and report the result. If it failed, read `gh run view <id> --log-failed` and explain the cause in one or two sentences. A warning that the token couldn't be saved means `SECRETS_WRITE_TOKEN` is missing (see `/secrets threads`). Never print a token.

## publish

The site deploys from `main`, and everything pushed is public.

1. If the current branch is `main`, create a branch first (`git switch -c <short-name>`). Never push to `main` directly.
2. `git status` and `git diff --stat`, summarized as one line per changed file.
3. Run `node tools/disclosure-check.mjs`. If it fails, stop and explain the findings. Terms are reported by number only; never ask the owner what they are.
4. Ask before committing. The git hooks run the check again on the staged content, the commit message, and every commit a push sends. Never use `--no-verify`.
5. Push the branch and open a pull request with `gh pr create`. Merge only when the owner says so.

## preview

Start `node tools/serve.mjs` in the background and say it is reachable only on the computer (it listens on 127.0.0.1 and serves only what git would publish). From a phone, the useful preview is the pull request diff, or a screenshot if Playwright is installed (`npx playwright screenshot http://127.0.0.1:8000 shot.png`), which you can then show.

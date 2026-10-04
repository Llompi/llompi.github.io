---
name: site
description: Status and day-to-day operations for this website. Use when the owner asks how the site is doing, what needs attention, whether Threads is syncing, wants to curate which Threads posts appear, run the sync, preview a change, or publish.
argument-hint: "[status | notes | curate | sync | publish]"
allowed-tools: Bash(node tools/site-status.mjs), Bash(node tools/site-status.mjs *), Bash(node tools/threads-curate.mjs shown), Bash(node tools/threads-curate.mjs topics), Bash(node tools/threads-curate.mjs recent), Bash(node tools/threads-curate.mjs recent *), Bash(gh run list *), Bash(gh run view *), Bash(git status), Bash(git diff *), Bash(git log *)
---

# Site console

The owner is often on a phone through Remote Control. Answer in short lines a phone can show without scrolling sideways: no wide tables, lead with what needs doing, one question at a time when a choice is needed.

Request: $ARGUMENTS

## status (default when there is no argument)

Run `node tools/site-status.mjs`. Report in this order: anything failing, anything expiring within two weeks, then the "Next" list as numbered steps the owner can say yes to. Don't repeat lines that are fine; say "everything else is fine" instead.

## notes

Run `node tools/threads-curate.mjs shown`. Summarize what the site mirrors: count, date of the last sync, and the three most recent items in one line each.

## curate

1. Run `node tools/threads-curate.mjs recent 15`. Show each post as `date · shown/hidden · first ~60 characters · id`.
2. Ask which to include or exclude. The owner can answer with ids, or by pasting a Threads link.
3. Apply with `node tools/threads-curate.mjs include|exclude|reset <id or link>`, or change the rules with `topic add|remove NAME` and `hashtag add|remove TAG`.
4. Show `git diff data/threads.config.json`, then ask before committing. Commit message: `data: curate Threads notes`.
5. After the push, offer to run the sync.

Posts that hit the private denylist are held back by the sync even when included. Don't try to work out which term matched.

## sync

Ask first, then run `gh workflow run threads-sync.yml`. Wait about a minute, then `gh run list --workflow threads-sync.yml --limit 1` and report the result. If it failed, read `gh run view <id> --log-failed` and explain the cause in one or two sentences. Never print the token or the denylist.

## publish

1. `git status` and `git diff --stat`, summarized as one line per changed file.
2. Run `node tools/disclosure-check.mjs`. If it fails, stop and explain the findings. Terms are reported by number only; never ask the owner what they are.
3. Ask before committing. The Bash hook runs the check again on commit and push.
4. The site deploys from `main`. Push to the working branch and open a pull request with `gh pr create`. Merge only when the owner says so.

## preview

Start `python3 -m http.server 8000` in the background and say it is reachable only on the computer. From a phone, the useful preview is the pull request diff, or a screenshot if Playwright is installed (`npx playwright screenshot http://localhost:8000 shot.png`), which you can then show.

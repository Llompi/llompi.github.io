---
name: secrets
description: Help the owner set or renew the site's secrets (the Threads token, the optional private denylist) without any value passing through the conversation. Use when the owner mentions secrets, tokens, the denylist, Threads setup, or an expiring token.
argument-hint: "[status | denylist | threads | link NAME]"
allowed-tools: Bash(node tools/secrets.mjs status), Bash(node tools/secrets.mjs link *), Bash(node tools/site-status.mjs), PowerShell(node tools/secrets.mjs status), PowerShell(node tools/secrets.mjs link *), PowerShell(node tools/site-status.mjs)
---

# Secrets

Request: $ARGUMENTS

## The one rule

Never ask for a secret value, never print one, and never accept one in the chat. Everything typed here goes to the model and stays in the transcript. The owner pastes values directly into GitHub's secret pages in a browser (on the phone is fine), or types the denylist into a local file at the computer. Your job is to give the right link and the right steps.

If the owner offers to paste a value here, decline and give the link instead. A hook blocks messages that look like tokens, but it can miss one. If a value does reach the conversation, tell the owner to revoke and reissue it now, and where (Meta: the app's Threads API settings; GitHub: Settings, Developer settings, Personal access tokens).

Never read the denylist file; it lives outside the repository and the command hook blocks reading it. `node tools/disclosure-check.mjs` uses it and reports matches by number only.

Keep it short. Everything here is optional: the site works without any secret, and the Notes section stays hidden until Threads is connected.

## status (default)

Run `node tools/site-status.mjs`. Report only what the owner might want to do next, marked optional where it is.

## denylist

The private list of terms the disclosure check blocks (code names, sponsor and customer names, hostnames, coworkers' names, unpublished project names). One term per line, `#` for comments, whole-word and case-insensitive.

- On this computer (what protects a commit and a push): the list lives outside the repository, so no search, preview, or commit can reach it. The owner runs this once at the computer, types the terms, and saves:
  `mkdir -Force "$env:APPDATA\llompi-site" | Out-Null; notepad "$env:APPDATA\llompi-site\disclosure-terms.txt"`
  (macOS or Linux: `~/.config/llompi-site/disclosure-terms.txt`.) Don't open it yourself.
- If an old `.disclosure-terms` file sits in the repository folder, tell the owner to move its contents to the new file and delete it.
- In CI (optional, a second net after a push): `node tools/secrets.mjs link DISCLOSURE_TERMS` and the owner pastes the same list there.

You may suggest kinds of terms. Never ask for the terms.

## threads

Per Meta's docs, test tokens come from the Graph API Explorer and last one hour. The sync workflow exchanges that for a 60-day token with the Threads app secret, then refreshes it on every run and saves it back with `SECRETS_WRITE_TOKEN`. So the setup is once, and there is no renewal chore. Walk the owner through it one step at a time; PUBLISHING.md (Threads, Setup) has the same steps.

1. Meta app at developers.facebook.com with the use case "Access the Threads API". Under Use cases, customize, and add `threads_read_replies` (`threads_basic` is already there).
2. App roles, Roles, Add People, Threads Tester: the owner's Threads account. They accept in Threads: Settings, Account, Website permissions.
3. App settings, Basic: the **Threads** app secret (there are two; use the Threads one). `node tools/secrets.mjs link THREADS_APP_SECRET`, and they paste it there.
4. A fine-grained GitHub token limited to this repository, permission "Secrets: Read and write" only. `node tools/secrets.mjs link SECRETS_WRITE_TOKEN`, and they paste it there.
5. Only after this branch is merged into `main` (the workflow doesn't exist before that): turn the sync on (ask, then `gh variable set THREADS_SYNC_ENABLED --body true`). Then the owner opens the Graph API Explorer, picks the app, switches to Threads, and generates a token with both permissions. `node tools/secrets.mjs link THREADS_ACCESS_TOKEN`, they paste it, and within the hour you run the sync (`/site sync`). Check the run log for "Token exchanged for a long-lived token" and no warning.

If the sync stops for more than 60 days, repeat step 5.

## link NAME

Run `node tools/secrets.mjs link NAME` and give the owner the page.

## Optional: from a password manager

`tools/secrets.mjs` can also read values from a password manager CLI (1Password, Bitwarden, pass, Keychain) via `.claude/secrets.local.json` and push them with `push NAME`. Only set this up if the owner asks for it; it is more setup than pasting a link.

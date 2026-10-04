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

Never read the denylist file; the command hook blocks it. `node tools/disclosure-check.mjs` uses it and reports matches by number only.

Keep it short. Everything here is optional: the site works without any secret, and the Notes section stays hidden until Threads is connected.

## status (default)

Run `node tools/site-status.mjs`. Report only what the owner might want to do next, marked optional where it is.

## denylist

The private list of terms the disclosure check blocks (code names, sponsor and customer names, hostnames, coworkers' names, unpublished project names). One term per line, `#` for comments, whole-word and case-insensitive.

- On this computer (what protects a push): the owner runs, at the computer,
  `notepad "$env:USERPROFILE\Documents\Projects\GitHub\llompi.github.io\.disclosure-terms"`
  types the terms, and saves. The file is git-ignored. Don't open it yourself.
- In CI (optional, a second net after a push): `node tools/secrets.mjs link DISCLOSURE_TERMS` and the owner pastes the same list there.

You may suggest kinds of terms. Never ask for the terms.

## threads

1. At developers.facebook.com: create an app (or open the existing one) with the use case "Access the Threads API". Under its Threads API settings, add the owner's Threads account as a tester. In the Threads app, accept the invite (Settings, Account, Website permissions, Invites).
2. In the same settings page, use the User Token Generator to generate a token for that account, with `threads_basic` and `threads_read_replies`.
3. Run `node tools/secrets.mjs link THREADS_ACCESS_TOKEN` and give the owner the page. They paste the token there and save.
4. Turn the sync on: ask, then run `gh variable set THREADS_SYNC_ENABLED --body true`. Or give them https://github.com/Llompi/llompi.github.io/settings/variables/actions/new (name `THREADS_SYNC_ENABLED`, value `true`).
5. Offer to run the sync (`/site sync`). The workflow only exists once this project's branch is merged into `main`; if `gh workflow run` says it can't find it, say so.

The token lasts 60 days. Renewal is the same paste (steps 2 and 3). If the dashboard says the token expires within hours rather than days, tell the owner the workflow needs to exchange it for a long-lived one and that this is a change to make in the repo.

## link NAME

Run `node tools/secrets.mjs link NAME` and give the owner the page.

## Optional: from a password manager

`tools/secrets.mjs` can also read values from a password manager CLI (1Password, Bitwarden, pass, Keychain) via `.claude/secrets.local.json` and push them with `push NAME`. Only set this up if the owner asks for it; it is more setup than pasting a link.

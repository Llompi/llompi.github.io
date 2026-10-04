---
name: secrets
description: Set up, check, upload, or renew the site's secrets (the private disclosure denylist, the Threads token, the GitHub token that lets the workflow renew it) without any value passing through the conversation. Use when the owner mentions secrets, tokens, the denylist, Threads setup, or an expiring token.
argument-hint: "[status | setup | push NAME | denylist | threads | link NAME]"
allowed-tools: Bash(node tools/secrets.mjs status), Bash(node tools/secrets.mjs check), Bash(node tools/secrets.mjs link *), Bash(node tools/site-status.mjs)
---

# Secrets

Request: $ARGUMENTS

## The one rule

Never ask for a secret value, never print one, and never accept one in the chat. Everything typed here goes to the model and stays in the transcript. Values live in the owner's password manager; `tools/secrets.mjs` reads them on this computer and hands them to GitHub on stdin, printing only names, lengths, and dates.

If the owner offers to paste a value, decline and use the steps below. A hook blocks messages that look like tokens, but it can miss one. If a value does reach the conversation, tell the owner to revoke and reissue it now, and where (GitHub: Settings, Developer settings, Personal access tokens; Meta: the app's Threads API settings).

Don't read the denylist file or call a password manager CLI directly; the Bash hook blocks both, and `tools/secrets.mjs` is the way through.

## status (default)

Run `node tools/secrets.mjs status` and `node tools/site-status.mjs`. Report what's missing or expiring, then the next step.

## setup (first time on this computer)

1. Find a password manager CLI: `op` (1Password), `bw` (Bitwarden), `pass`, or macOS `security`. If there are several or none, ask which one the owner uses.
2. Copy `.claude/secrets.example.json` to `.claude/secrets.local.json` (git-ignored) and adjust each `cmd` to the owner's vault and item names. Ask for the item names; they aren't secret. Bitwarden needs `BW_SESSION` set in the shell that started Claude Code.
3. Run `node tools/secrets.mjs check`. It prints only lengths and term counts. Fix any entry that fails, usually a locked vault or a wrong item path.
4. Offer `push --all`, then `pull-denylist`.

## push NAME, push --all

Ask first, then run `node tools/secrets.mjs push NAME`. Report the one line it prints.

## denylist

The denylist is a note in the password manager, one term per line, `#` for comments. The owner edits it there, on the phone if they like. Then `node tools/secrets.mjs push DISCLOSURE_TERMS` updates CI and `node tools/secrets.mjs pull-denylist` updates local checks. You may suggest kinds of terms that belong in it (PUBLISHING.md lists them). Never ask for the terms.

## threads

Getting a token is the only step that needs a browser:

1. At developers.facebook.com, open the app that has the Threads use case. In its Threads API settings, add the owner's Threads account as a tester, then accept the invite in the Threads app (Settings, Account, Website permissions).
2. Generate a user access token with `threads_basic` and `threads_read_replies`, and save it in the password manager item that `THREADS_ACCESS_TOKEN` points at. If the app secret is saved too (`THREADS_APP_SECRET`, local only), a short-lived token is exchanged for a long-lived one automatically.
3. Ask first, then run `node tools/secrets.mjs threads --enable`. It exchanges or refreshes the token, checks it against Threads, uploads it, and turns the sync on.
4. Offer to run the sync (`/site sync`).

Long-lived tokens last 60 days. For automatic renewal, the owner creates a fine-grained GitHub token limited to this repository with "Secrets: read and write", stores it in the manager, and runs `push SECRETS_WRITE_TOKEN`.

## link NAME (no password manager, or away from the computer)

Run `node tools/secrets.mjs link NAME` and give the owner the GitHub page. They paste the value there, in the browser on their phone, never here.

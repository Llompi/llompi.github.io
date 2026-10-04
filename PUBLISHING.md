# Publishing safely

This site shows work without giving it away. Everything here is public the moment it is pushed, including the git history, so the rules apply before the commit, not before the deploy.

## Four levels of disclosure

Decide the level before writing a word.

| Level | What it means | Where it goes | Examples |
|---|---|---|---|
| Open | Mine outright, no one else has a claim. Full detail, photos, numbers. | Project cards and dialogs | RF amplifier, treat dispenser |
| Generalized | Real work, told as method. The how and why, never the what or where. | Write-ups under `writeup/` | The agent case study |
| Keep-out | Exists and I did it; the substance belongs to someone else. Role, kind of work, tools. Nothing else. | Keep-out cards on the home page | Employer hardware, the intranet |
| Not at all | Too close to someone else's IP, still unprotected, or legally controlled. | Nowhere, not even a hint | See below |

**Home projects in the employer's field default to "not at all."** An invention assignment agreement can reach work done on your own time with your own equipment when it relates to the employer's business. Read the agreement, and get written clearance before a project like that appears anywhere public, including Threads. Once something is published it can also count as public disclosure for patent purposes, so anything that might be patented gets filed (or deliberately abandoned) first.

**Controlled information never appears at any level.** Work under defense contracts can involve CUI or export-controlled technical data (ITAR, EAR). Generalizing it is not enough; if in doubt, it is not published, and the question goes to whoever owns compliance.

## Before anything is pushed

- [ ] Is it mine to share? If it touched employer time, equipment, data, or customers, the answer needs to be yes in writing.
- [ ] Could a competitor, sponsor, or attacker learn something specific from it? Part numbers, values, hostnames, topology, dates tied to programs, customer or partner names.
- [ ] Photos: check what's in the background. Monitors, whiteboards, labels, badges, part markings, lab equipment asset tags.
- [ ] Photos: strip metadata. The check below blocks GPS position and camera serials, but exporting with metadata off is the habit to build.
- [ ] Would I be comfortable if my manager read it today? If not, it waits, or it changes.
- [ ] Numbers I can't share are left out, not rounded or disguised. A vague true sentence beats a precise fake one.

## The automated check

`tools/disclosure-check.mjs` runs on every push and pull request (`.github/workflows/disclosure-check.yml`). It fails the build when the published tree contains:

1. a term from a private denylist,
2. photo metadata that gives away a location or a device (GPS, camera and lens serials, artist, comments, XMP),
3. a draft marker (`TODO`, `DRAFT`, `TBD`, `[redact`) in published pages.

Run it locally before committing:

```
node tools/disclosure-check.mjs
```

### The denylist

The list of things that must not be said cannot live in a public repository; it would be a disclosure itself. It is read from:

- **In CI:** a repository secret named `DISCLOSURE_TERMS`, one term per line. Settings, Secrets and variables, Actions, New repository secret.
- **Locally:** a file named `.disclosure-terms` in the repository root, same format. It is in `.gitignore`.

The easiest way to keep both in step is to hold the list as a note in a password manager and let `node tools/secrets.mjs push DISCLOSURE_TERMS` and `node tools/secrets.mjs pull-denylist` copy it (see the `/secrets` skill). In Claude Code, the Bash hook runs the check before every commit and push.

Matching is whole-word and case-insensitive. Findings are reported as "term #3", never by the term, so public CI logs don't print it. Good candidates: program and project code names, customer, sponsor and partner names, internal hostnames and IP ranges, part numbers of custom parts, colleagues' names, the name of any home project that isn't public yet.

Note that a pushed commit is public even if the next commit removes it. If the check catches something after it was pushed, treat it as published and tell whoever owns it.

## Threads

The Notes section mirrors a curated slice of Threads. The page never calls Threads: a scheduled workflow fetches with a private token and commits `data/threads.json`, and the page reads that file from this site. Visitors aren't tracked by Meta, and the token never reaches a browser.

### What gets mirrored

Set in `data/threads.config.json`:

- `topics`: a post whose Threads topic tag is in this list is shown.
- `hashtags`: a post containing one of these hashtags is shown (without the `#`).
- `include` / `exclude`: post ids to force in or keep out. Exclude always wins.
- `maxItems`: how many to show.

Your own replies come along when they sit under one of your shown posts, or when they qualify on their own. Only your own words are copied; other people's replies and names stay on Threads, and the page links to the conversation. Like and follower counts are never shown.

Every post also goes through the denylist. A post that mentions a denylisted term is held back even if it's tagged.

### Setup

1. Create an app at developers.facebook.com with the Threads API use case. Request `threads_basic` and `threads_read_replies`.
2. Add your Threads account as a tester, authorize the app, and exchange the short-lived token for a long-lived one (valid 60 days).
3. In this repository: add the secret `THREADS_ACCESS_TOKEN`, and add the variable `THREADS_SYNC_ENABLED` with the value `true` (Settings, Secrets and variables, Actions, Variables). With the token saved in a password manager, `node tools/secrets.mjs threads --enable` does this step: it makes the token long-lived, checks it, uploads it, and sets the variable.
4. Run the workflow once by hand: Actions, Threads sync, Run workflow (or `gh workflow run threads-sync.yml`).

Curation can be done without editing JSON: `node tools/threads-curate.mjs recent` lists your latest posts as shown or hidden and why, and `include`, `exclude`, `topic add`, and `hashtag add` change the rules.

The workflow refreshes the token on each run. To have it store the refreshed token automatically, add a fine-grained personal access token limited to this repository with **Secrets: read and write** as the secret `SECRETS_WRITE_TOKEN`. Without it, the sync stops after 60 days until a new token is pasted in.

## Lab demos

A demo earns a place when it explains something real and is built only from public knowledge: textbook physics, datasheet-level behavior, my own open projects. No employer data, no measured results from controlled work, no "inspired by" versions of a work design. If a demo can't say where its numbers come from, it doesn't ship.

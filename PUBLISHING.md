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

The local file is the one that protects you, because it runs before anything leaves the computer; CI only sees a push after it is public. In Claude Code, the command hook runs the check before every commit and push. (`tools/secrets.mjs` can also copy the list from a password manager, if you ever want that.)

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

Once, about fifteen minutes, all of it possible from a phone browser. The workflow only exists on GitHub after this branch is merged into `main`, so do step 5 after the merge.

1. **Meta app.** At developers.facebook.com, create an app with the use case "Access the Threads API". Under Use cases, customize it and add the `threads_read_replies` permission (`threads_basic` is already there).
2. **Tester.** App roles, Roles, Add People, Threads Tester: add your Threads account. Accept the invite in Threads under Settings, Account, Website permissions.
3. **App secret.** App settings, Basic: copy the **Threads** app secret (there are two app secrets; use the Threads one). Save it in this repository as the secret `THREADS_APP_SECRET` (Settings, Secrets and variables, Actions, New repository secret).
4. **Save-back token.** On GitHub: Settings, Developer settings, Personal access tokens, Fine-grained. Limit it to this repository, with the single permission **Secrets: Read and write**. Save it as the secret `SECRETS_WRITE_TOKEN`. This lets the workflow store the renewed Threads token, so you never renew it by hand.
5. **Connect.** Add the variable `THREADS_SYNC_ENABLED` = `true` (same page, Variables tab). Then open the Graph API Explorer (developers.facebook.com/tools/explorer), choose your app, switch it to Threads, and generate a token with `threads_basic` and `threads_read_replies`. It is valid for one hour. Save it as the secret `THREADS_ACCESS_TOKEN`, then run the workflow within that hour (Actions, Threads sync, Run workflow).

The first run exchanges the one-hour token for a 60-day token and saves it; every later run refreshes it. If the sync ever stops for more than 60 days, repeat step 5.

Curation can be done without editing JSON: `node tools/threads-curate.mjs recent` lists your latest posts as shown or hidden and why, and `include`, `exclude`, `topic add`, and `hashtag add` change the rules.

## Lab demos

A demo earns a place when it explains something real and is built only from public knowledge: textbook physics, datasheet-level behavior, my own open projects. No employer data, no measured results from controlled work, no "inspired by" versions of a work design. If a demo can't say where its numbers come from, it doesn't ship.

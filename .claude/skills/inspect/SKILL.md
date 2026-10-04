---
name: inspect
description: Strict design and writing inspection of the site or one page, by the owner's working manual and impeccable.style, ranked P0 to P3. Critique only; it changes nothing. Use when the owner asks for a design review, a writing review, an audit, "is this AI slop", or before publishing a significant change.
argument-hint: "[page or section, e.g. lab/ or #keep-out; default: whole site]"
allowed-tools: Bash(node tools/disclosure-check.mjs), Bash(node tools/disclosure-check.mjs *), Bash(npx impeccable detect *), Bash(git diff *), Bash(git log *), Read, Grep, Glob
---

# Inspect

Target: $ARGUMENTS (whole site if empty)

The owner's manual says critique leaves the design unchanged: it recommends, the owner chooses. Do not edit files in this skill. Offer fixes at the end and wait.

## 1. Collect evidence

- `node tools/disclosure-check.mjs`
- `npx impeccable detect <html and css files for the target>` for the source scan.
- Start a local server (`python3 -m http.server 8765` in the background) and run `npx impeccable detect http://localhost:8765/<path>` for the rendered scan. On Linux as root, Chromium needs `--no-sandbox`; point `PUPPETEER_EXECUTABLE_PATH` at a wrapper script that adds it.
- Treat detector hits as leads. Confirm each one by looking. A contrast hit measured mid reveal-animation, or "cramped padding" on a section whose border sits above generous padding, are known false positives.
- If Playwright is available, take screenshots at 1280 and 390 wide, in both themes.

## 2. Inspect in parallel

Spawn the `design-inspector` and `writing-editor` agents on the target at the same time, then check each of their findings yourself before reporting it. Drop anything you can't point to.

## 3. Report

For a phone, keep it compact:

1. Verdict, in the owner's Notice of Design Infraction terms: bad, faulty, or AI slop, and which categories fail. Three sentences at most.
2. P0 and P1, numbered: what, where (file:line or section), evidence, the standard it breaks, one fix.
3. P2 and P3 as one line each.
4. Strengths worth keeping, with the reason.
5. Questions whose answer would change the direction.

Separate defects from preferences. Taste presented as certainty is a review failure. Then ask which fixes to make.

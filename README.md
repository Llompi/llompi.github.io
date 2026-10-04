# llompi.github.io

Personal site of Joan Llompart, electrical engineer in Portland, OR.

Live at [llompi.github.io](https://llompi.github.io).

## How it's built

Plain HTML, CSS, and JavaScript. No framework, no build step. GitHub Pages serves the repository root.

```
index.html                  The site
404.html                    Custom not-found page
lab/                        Interactive demos (WebGL)
assets/css/styles.css       Design system: tokens, dual theme, components
assets/js/main.js           Theme toggle, hero animation, reveals, dialogs, notes
assets/js/lab.js            The transmission-line demo
assets/vendor/three/        three.js r186, minified, MIT
assets/fonts/               Self-hosted Archivo and IBM Plex Mono (SIL OFL)
assets/img/                 Processed photos and brand assets
writeup/                    Long-form case studies
data/                       Threads mirror and its curation rules
tools/                      Disclosure check, Threads sync and curation, secrets, status (Node, no deps)
.github/workflows/          Disclosure check on push, Threads sync on a schedule
CLAUDE.md, .claude/         Claude Code project: rules, skills, agents, guard hooks
robots.txt, sitemap.xml     Crawl rules; /legacy/ is excluded
docs/assets/                Resume PDF and original photo files
legacy/                     Archived earlier iterations
```

Design notes: graphite and paper themes, Archivo and IBM Plex Mono type, and a circuit-trace hero drawn in SVG. Two colours with separate jobs: copper depicts the board (traces, pads, vias, registration marks, the brand mark) and never moves; verdigris, what copper oxidises into, carries the interface (action, state, focus, wayfinding) and is spent on nothing decorative. Fonts are self-hosted, so the page makes no third-party requests. The theme toggle respects `prefers-color-scheme` and remembers the choice in `localStorage`. Animations respect `prefers-reduced-motion`, and content is readable with JavaScript disabled.

Work that belongs to someone else sits under "keep-out", the hatched zone on a board where nothing may be placed: each card says what the work is and what I did, then lists what is shown and what is kept back. How that line is drawn, and the check that enforces it, are in [PUBLISHING.md](PUBLISHING.md).

The lab is three.js, self-hosted and loaded only on `/lab/`. It renders only while it's on screen and something is moving, pauses for `prefers-reduced-motion`, and falls back to the Smith chart and the numbers when WebGL is unavailable.

Notes are a curated mirror of Threads, written to `data/threads.json` by a scheduled workflow. The page reads that file from its own origin, so it makes no request to Meta. Only my own posts on work topics are copied, and no counts are shown. The section stays hidden while the file is empty.

Projects open in `<dialog>` elements that carry their own URL (`/#modal-rf`), so a project can be linked directly and the browser Back button or a back-swipe closes it. Card images ship a 400w variant through `srcset`; dialog photos are deferred until a dialog opens.

## Running it from a phone

The repository is a Claude Code project. On the computer, in this folder, run `claude remote-control`; the session then appears in the Claude app. From there:

- `/site` shows what is set up, what is failing, and what to do next. `/site curate` picks which Threads posts appear; `/site sync` runs the mirror; `/site publish` checks, commits, and opens a pull request.
- `/secrets` gives the GitHub page to paste a token into, from a phone browser, and the steps for Threads and the private denylist. Values are never typed into the chat: a hook stops messages that look like credentials, and another stops commands that would print one.
- `/inspect` reviews design and copy against the working manual and impeccable.style. `/writeup` and `/deai` help write without handing over the voice.

The computer has to stay awake with the session running. It needs Node 18 or newer and the GitHub CLI signed in (`gh auth login`). Personal settings go in `.claude/settings.local.json` and `CLAUDE.local.md`, both git-ignored.

## Checks

```
git config core.hooksPath .githooks   # once per clone; Claude Code sessions do this for you
node tools/disclosure-check.mjs       # by hand, any time
```

With the hooks on, git runs the disclosure check on what is staged, on the commit message, and on every commit a push sends.

## Local development

Open `index.html` in a browser, or serve it on this computer only (127.0.0.1:8000, files git would publish):

```
node tools/serve.mjs
```

## License

MIT. Photos and resume are personal content, all rights reserved.

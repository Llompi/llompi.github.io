# llompi.github.io

Joan Llompart's personal site. Plain HTML, CSS, and JavaScript served by GitHub Pages from `main`. No framework, no build step, no third-party requests at runtime. README.md has the layout of the repository.

The owner often drives this project from a phone through Remote Control. Keep replies short and narrow, lead with what needs doing, and ask one question at a time.

The owner's computer is Windows, so commands there run in PowerShell. Everything in `tools/` is plain Node with no dependencies and runs the same on Windows, macOS, Linux, and in GitHub Actions; prefer it over shell one-liners.

## Rules that are not negotiable

- Everything pushed is public, history included. Read PUBLISHING.md before adding anything about the owner's work. Employer work is keep-out at most. Home projects in the employer's field are not published at all without the owner's written clearance.
- Never ask for, print, or accept a secret value in the conversation. The owner pastes secrets directly into GitHub's secret pages (`node tools/secrets.mjs link NAME` gives the page). Never read the private denylist; `node tools/disclosure-check.mjs` reports matches by number only. Hooks in `.claude/hooks/` enforce this; don't work around them.
- Never invent facts about the owner: numbers, results, dates, names, quotes, employers. If a sentence needs a fact you don't have, ask.
- Copy you draft is a draft for the owner to rewrite, not final copy in their voice. Say which sentences you wrote so they know what to own.
- Don't add personal ambitions, job-search signals, or anything about pay to the site or to commit messages.

## How work is done here

From the owner's working manual. The model widens the search and does the mechanical work; the owner chooses the problem, the standard, the tradeoffs, and the final form. For anything bigger than a small fix:

1. Frame: audience, job, constraints, available evidence, and what must not happen.
2. Expose gaps: ask what is ambiguous or unverifiable before generating.
3. Diverge: two or three genuinely different directions, each with its tradeoff and failure mode.
4. Choose: the owner picks and says why. Don't pick for them.
5. Execute within the chosen direction.
6. Attack: `/inspect` for design, the `writing-editor` agent for copy, and the disclosure check.
7. Own: the owner verifies, rewrites what sounds borrowed, and decides to ship.

A review leaves the work unchanged. It recommends; the owner decides.

If `CLAUDE.local.md` exists, it holds the owner's full manual and takes precedence over this summary.

## Design system

- Tokens live in `assets/css/styles.css`. Graphite (dark) and paper (light) themes; every change has to work in both.
- Copper depicts the board (traces, pads, vias, the mark) and never moves. Verdigris (`--accent`) is only interface: action, state, focus, wayfinding.
- Archivo for text, IBM Plex Mono for labels, both self-hosted.
- Motion respects `prefers-reduced-motion`. Content stays visible and usable without JavaScript.
- Avoid generated-UI habits unless the page has a specific reason: small tracked uppercase labels above headings, decorative stripes, uniform grids of identical cards, nested cards, glow, glass panels.

## Commands

| Task | Command |
|---|---|
| Preview | `python3 -m http.server 8000` |
| Disclosure check | `node tools/disclosure-check.mjs` |
| Design detector | `npx impeccable detect index.html lab/index.html assets/css/styles.css` |
| Site status | `node tools/site-status.mjs` |
| Secrets | `node tools/secrets.mjs status \| check \| push NAME \| pull-denylist \| threads \| link NAME` |
| Threads curation | `node tools/threads-curate.mjs shown \| recent \| include ID \| exclude ID \| topics` |

## Skills and agents

- `/site`: status, Threads notes and curation, sync, publish.
- `/secrets`: links and steps for the Threads token and the private denylist, without values in the chat.
- `/inspect`: design and writing inspection, ranked P0 to P3, changes nothing.
- `/writeup`: a new write-up through the seven passes.
- `/deai`: edit a draft back into the owner's voice.
- Agents: `design-inspector`, `writing-editor`.

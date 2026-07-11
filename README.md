# llompi.github.io

Personal site of Joan Llompart, electrical engineer in Portland, OR.

Live at [llompi.github.io](https://llompi.github.io).

## How it's built

Plain HTML, CSS, and JavaScript. No framework, no build step. GitHub Pages serves the repository root.

```
index.html                  The site
404.html                    Custom not-found page
assets/css/styles.css       Design system: tokens, dual theme, components
assets/js/main.js           Theme toggle, hero animation, reveals, dialogs
assets/img/                 Processed photos and brand assets
writeup/                    Long-form case studies
docs/assets/                Resume PDF and original photo files
legacy/                     Archived earlier iterations
```

Design notes: graphite and paper themes with a PCB-copper accent, Archivo and IBM Plex Mono type, and a hand-plotted circuit-trace hero drawn in SVG. The theme toggle respects `prefers-color-scheme` and remembers the choice in `localStorage`. Animations respect `prefers-reduced-motion`.

## Local development

Open `index.html` in a browser, or serve the folder:

```
python -m http.server 8000
```

## License

MIT. Photos and resume are personal content, all rights reserved.

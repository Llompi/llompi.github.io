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
assets/fonts/               Self-hosted Archivo and IBM Plex Mono (SIL OFL)
assets/img/                 Processed photos and brand assets
writeup/                    Long-form case studies
robots.txt, sitemap.xml     Crawl rules; /legacy/ is excluded
docs/assets/                Resume PDF and original photo files
legacy/                     Archived earlier iterations
```

Design notes: graphite and paper themes with a PCB-copper accent, Archivo and IBM Plex Mono type, and a circuit-trace hero drawn in SVG. Fonts are self-hosted, so the page makes no third-party requests. The theme toggle respects `prefers-color-scheme` and remembers the choice in `localStorage`. Animations respect `prefers-reduced-motion`, and content is readable with JavaScript disabled.

Projects open in `<dialog>` elements that carry their own URL (`/#modal-rf`), so a project can be linked directly and the browser Back button or a back-swipe closes it. Card images ship a 400w variant through `srcset`; dialog photos are deferred until a dialog opens.

## Local development

Open `index.html` in a browser, or serve the folder:

```
python -m http.server 8000
```

## License

MIT. Photos and resume are personal content, all rights reserved.

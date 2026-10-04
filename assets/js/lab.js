/* Lab: a mismatched transmission line, in 3D.
   three.js draws the board and the wave; everything else is plain math on
   complex numbers. The model is a lossless 50 ohm line driven by a matched
   source, so the only reflection is the one at the load.

   Colours come from the site's own tokens and follow the theme toggle.
   Copper is the board and the signal on it; verdigris is only the
   interface (the Smith chart point you drag, the controls). */

import * as THREE from "three";

const Z0 = 50;
const LINE_HALF = 4; /* trace runs x = -4 (source) to x = +4 (load) */
const SAMPLES = 360;
const WAVE_BASE = 1.35; /* height of the wave's zero line above the board */
const WAVE_AMP = 0.5; /* height per volt; |V| peaks at 2 for total reflection */

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ------------------------------------------------------------------ math */

const cx = (re, im = 0) => ({ re, im });
const add = (a, b) => cx(a.re + b.re, a.im + b.im);
const sub = (a, b) => cx(a.re - b.re, a.im - b.im);
const mul = (a, b) => cx(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
const div = (a, b) => {
  const d = b.re * b.re + b.im * b.im;
  return cx((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d);
};
const abs = (a) => Math.hypot(a.re, a.im);
const expj = (t) => cx(Math.cos(t), Math.sin(t));

function gammaFromZ(r, x) {
  return div(sub(cx(r, x), cx(Z0)), add(cx(r, x), cx(Z0)));
}

/* Returns null for an open circuit, where the impedance is unbounded */
function zFromGamma(g) {
  const den = sub(cx(1), g);
  if (abs(den) < 1e-6) return null;
  return mul(cx(Z0), div(add(cx(1), g), den));
}

/* ----------------------------------------------------------------- state */

const state = {
  gamma: cx(0),
  length: 1.5, /* in wavelengths */
  phase: 0,
  playing: !reducedMotion,
  showParts: false
};

/* ------------------------------------------------------------ DOM hooks */

const $ = (sel) => document.querySelector(sel);
const view = $("[data-lab-view]");
const canvas = $("[data-lab-canvas]");
const smith = $("[data-lab-smith]");
const inR = $('[data-in="r"]');
const inX = $('[data-in="x"]');
const inLen = $('[data-in="len"]');
const playBtn = $("[data-lab-play]");
const partsBox = $("[data-lab-parts]");

/* Resistance is logarithmic, 1 to 1000 ohm; reactance is symmetric and
   finer near zero, to about 500 ohm either way. */
const rFromSlider = (v) => Math.pow(10, (v / 1000) * 3);
const sliderFromR = (r) => Math.round((Math.log10(Math.min(Math.max(r, 1), 1000)) / 3) * 1000);
const xFromSlider = (v) => Math.sign(v) * (Math.pow(10, (Math.abs(v) * 2.7) / 500) - 1);
const sliderFromX = (x) => {
  const m = Math.min(Math.abs(x), 500);
  return Math.round(Math.sign(x) * (Math.log10(m + 1) / 2.7) * 500);
};

function fmtOhm(v) {
  const a = Math.abs(v);
  return (a >= 100 ? a.toFixed(0) : a >= 10 ? a.toFixed(1) : a.toFixed(2)).replace(/\.0+$/, "");
}

function fmtZ(z) {
  if (!z) return "open";
  const r = Math.max(z.re, 0);
  if (r < 0.005 && Math.abs(z.im) < 0.005) return "short";
  return fmtOhm(r) + (z.im < 0 ? " − j" : " + j") + fmtOhm(z.im) + " ohm";
}

/* --------------------------------------------------------- Smith chart */

const SVG_NS = "http://www.w3.org/2000/svg";
const svgEl = (name, attrs, parent) => {
  const el = document.createElementNS(SVG_NS, name);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(el);
  return el;
};

let smithPoint;
let smithVswr;

function buildSmith() {
  /* Imaginary axis points up, so the drawing group is flipped */
  const defs = svgEl("defs", {}, smith);
  const clip = svgEl("clipPath", { id: "smith-clip" }, defs);
  svgEl("circle", { cx: 0, cy: 0, r: 1 }, clip);

  const g = svgEl("g", { transform: "scale(1,-1)" }, smith);
  svgEl("circle", { class: "sm-disc", cx: 0, cy: 0, r: 1 }, g);
  const grid = svgEl("g", { "clip-path": "url(#smith-clip)" }, g);
  for (const r of [0.2, 0.5, 1, 2, 5]) {
    svgEl("circle", { class: "sm-grid", cx: r / (1 + r), cy: 0, r: 1 / (1 + r) }, grid);
  }
  for (const x of [0.2, 0.5, 1, 2, 5]) {
    svgEl("circle", { class: "sm-grid", cx: 1, cy: 1 / x, r: 1 / x }, grid);
    svgEl("circle", { class: "sm-grid", cx: 1, cy: -1 / x, r: 1 / x }, grid);
  }
  svgEl("line", { class: "sm-grid", x1: -1, y1: 0, x2: 1, y2: 0 }, g);
  smithVswr = svgEl("circle", { class: "sm-vswr", cx: 0, cy: 0, r: 0 }, g);
  svgEl("circle", { class: "sm-center", cx: 0, cy: 0, r: 0.022 }, g);
  smithPoint = svgEl("circle", { class: "sm-point", cx: 0, cy: 0, r: 0.055 }, g);

  /* Labels go outside the flipped group so the text reads upright */
  const label = (x, y, text, anchor) => {
    const t = svgEl("text", { class: "sm-label", x, y, "text-anchor": anchor }, smith);
    t.textContent = text;
  };
  label(-0.98, 0.1, "short", "start");
  label(0.98, 0.1, "open", "end");
  label(0, -0.78, "inductive", "middle");
  label(0, 0.84, "capacitive", "middle");

  let dragging = false;
  const toGamma = (e) => {
    const pt = smith.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(smith.getScreenCTM().inverse());
    let g = cx(p.x, -p.y);
    const m = abs(g);
    if (m > 1) g = cx(g.re / m, g.im / m);
    return g;
  };
  smith.addEventListener("pointerdown", (e) => {
    dragging = true;
    smith.setPointerCapture(e.pointerId);
    setGamma(toGamma(e));
    e.preventDefault();
  });
  smith.addEventListener("pointermove", (e) => {
    if (dragging) setGamma(toGamma(e));
  });
  const end = () => {
    dragging = false;
  };
  smith.addEventListener("pointerup", end);
  smith.addEventListener("pointercancel", end);
}

/* --------------------------------------------------------- read-outs */

const out = {
  r: $('[data-out="r"]'),
  x: $('[data-out="x"]'),
  len: $('[data-out="len"]'),
  z: $('[data-read="z"]'),
  gamma: $('[data-read="gamma"]'),
  vswr: $('[data-read="vswr"]'),
  rl: $('[data-read="rl"]'),
  power: $('[data-read="power"]')
};

function updateReadouts(syncSliders) {
  const g = state.gamma;
  const m = Math.min(abs(g), 1);
  const z = zFromGamma(g);
  const angle = (Math.atan2(g.im, g.re) * 180) / Math.PI;

  out.z.textContent = fmtZ(z);
  out.gamma.textContent = m < 0.0005 ? "0.000" : m.toFixed(3) + " at " + angle.toFixed(0) + " deg";
  out.vswr.textContent = m > 0.999 ? "infinite" : ((1 + m) / (1 - m)).toFixed(2);
  out.rl.textContent = m < 0.001 ? "over 60 dB" : (-20 * Math.log10(m)).toFixed(1) + " dB";
  out.power.textContent = ((1 - m * m) * 100).toFixed(1) + " %";

  const rText = z ? fmtOhm(Math.max(z.re, 0)) + " ohm" : "open";
  const xText = z ? (z.im < 0 ? "−" : "") + fmtOhm(z.im) + " ohm" : "open";
  out.r.textContent = rText;
  out.x.textContent = xText;
  inR.setAttribute("aria-valuetext", rText);
  inX.setAttribute("aria-valuetext", xText);

  if (syncSliders) {
    inR.value = z ? sliderFromR(z.re) : 1000;
    inX.value = z ? sliderFromX(z.im) : 0;
  }

  smithPoint.setAttribute("cx", g.re);
  smithPoint.setAttribute("cy", g.im);
  smithVswr.setAttribute("r", m);
  smith.setAttribute(
    "aria-label",
    "Smith chart. The load is " + fmtZ(z) + ", reflecting " + (m * m * 100).toFixed(1) + " percent of the power."
  );
}

function setGamma(g, fromSlider) {
  state.gamma = g;
  updateReadouts(!fromSlider);
  scene.dirty = true;
}

function setFromSliders() {
  setGamma(gammaFromZ(rFromSlider(+inR.value), xFromSlider(+inX.value)), true);
}

/* --------------------------------------------------------------- 3D */

const scene = { ok: false, dirty: true };

function token(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function initThree() {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch (e) {
    return false;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const world = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.1, 100);
  const target = new THREE.Vector3(0, 0.75, 0);

  world.add(new THREE.HemisphereLight(0xffffff, 0x222222, 1.6));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(-3, 6, 5);
  world.add(key);

  /* Ask for one frame. The render loop is set up further down, so the guard
     matters: applyTheme runs once before it exists. */
  function invalidate() {
    scene.dirty = true;
    if (scene.loop) scene.loop();
  }

  /* Board: solder mask over substrate, ground plane under it, one trace */
  const mat = {
    mask: new THREE.MeshStandardMaterial({ roughness: 0.75, metalness: 0 }),
    copper: new THREE.MeshStandardMaterial({ roughness: 0.38, metalness: 0.75 }),
    body: new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.1 }),
    wave: new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }),
    env: new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, transparent: true, depthWrite: false }),
    part: new THREE.LineBasicMaterial({ transparent: true }),
    base: new THREE.LineDashedMaterial({ dashSize: 0.12, gapSize: 0.1, transparent: true })
  };

  const box = (w, h, d, m, x, y, z) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    mesh.position.set(x, y, z);
    world.add(mesh);
    return mesh;
  };

  box(10, 0.14, 2.6, mat.mask, 0, -0.07, 0);
  box(10, 0.018, 2.6, mat.copper, 0, -0.15, 0);
  box(LINE_HALF * 2, 0.02, 0.2, mat.copper, 0, 0.01, 0);

  /* Load: an 0805-style resistor straddling the trace end and a via pad */
  box(0.26, 0.02, 0.32, mat.copper, LINE_HALF + 0.08, 0.01, 0);
  box(0.26, 0.02, 0.32, mat.copper, LINE_HALF + 0.62, 0.01, 0);
  box(0.42, 0.12, 0.22, mat.body, LINE_HALF + 0.35, 0.08, 0);
  box(0.08, 0.13, 0.23, mat.copper, LINE_HALF + 0.16, 0.08, 0);
  box(0.08, 0.13, 0.23, mat.copper, LINE_HALF + 0.54, 0.08, 0);
  const via = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.03, 20), mat.body);
  via.position.set(LINE_HALF + 0.66, 0.025, 0);
  world.add(via);

  /* Source: an edge-launch connector */
  const sma = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.5, 28), mat.copper);
  sma.rotation.z = Math.PI / 2;
  sma.position.set(-LINE_HALF - 0.35, 0.12, 0);
  world.add(sma);
  box(0.12, 0.5, 0.5, mat.copper, -LINE_HALF - 0.05, 0.12, 0);

  /* Wave geometry, rewritten every frame */
  const ribbon = (material) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array((SAMPLES + 1) * 2 * 3), 3));
    const idx = [];
    for (let i = 0; i < SAMPLES; i++) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    geo.setIndex(idx);
    const mesh = new THREE.Mesh(geo, material);
    mesh.frustumCulled = false;
    world.add(mesh);
    return geo;
  };
  const line = (material) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array((SAMPLES + 1) * 3), 3));
    const l = new THREE.Line(geo, material);
    l.frustumCulled = false;
    world.add(l);
    return { geo, obj: l };
  };

  const envGeo = ribbon(mat.env);
  const waveGeo = ribbon(mat.wave);
  const inc = line(mat.part);
  const ref = line(mat.part);

  const baseGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-LINE_HALF, WAVE_BASE, 0),
    new THREE.Vector3(LINE_HALF, WAVE_BASE, 0)
  ]);
  const baseLine = new THREE.Line(baseGeo, mat.base);
  baseLine.computeLineDistances();
  world.add(baseLine);

  function applyTheme() {
    const copper = new THREE.Color(token("--copper"));
    mat.copper.color.copy(copper);
    mat.env.color.copy(copper);
    mat.env.opacity = document.documentElement.getAttribute("data-theme") === "light" ? 0.22 : 0.2;
    mat.mask.color.set(token("--surface-2"));
    mat.body.color.set(token("--bg"));
    mat.wave.color.set(token("--text"));
    mat.part.color.set(token("--text-3"));
    mat.part.opacity = 0.9;
    mat.base.color.set(token("--rule"));
    mat.base.opacity = 0.55;
    invalidate();
  }
  applyTheme();
  new MutationObserver(applyTheme).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"]
  });

  /* Camera: a gentle orbit you can tilt by dragging, bounded so the board
     never turns edge-on or upside down */
  const orbit = { az: -0.24, el: 0.32, dist: 10 };
  function placeCamera() {
    camera.position.set(
      target.x + orbit.dist * Math.cos(orbit.el) * Math.sin(orbit.az),
      target.y + orbit.dist * Math.sin(orbit.el),
      target.z + orbit.dist * Math.cos(orbit.el) * Math.cos(orbit.az)
    );
    camera.lookAt(target);
  }

  let drag = null;
  canvas.addEventListener("pointerdown", (e) => {
    drag = { x: e.clientX, y: e.clientY, az: orbit.az, el: orbit.el };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!drag) return;
    orbit.az = Math.max(-0.9, Math.min(0.9, drag.az - (e.clientX - drag.x) * 0.005));
    orbit.el = Math.max(0.12, Math.min(0.95, drag.el + (e.clientY - drag.y) * 0.005));
    placeCamera();
    invalidate();
  });
  const endDrag = () => {
    drag = null;
  };
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    /* Keep the whole board in frame on narrow screens */
    const halfWidth = 5.5;
    const fit = halfWidth / (Math.tan((camera.fov * Math.PI) / 360) * camera.aspect);
    orbit.dist = Math.max(10, fit);
    camera.updateProjectionMatrix();
    placeCamera();
    invalidate();
  }
  new ResizeObserver(resize).observe(canvas);

  /* Labels are HTML, pinned to points on the board */
  const labels = [
    { el: view.querySelector('[data-lab-label="source"]'), at: new THREE.Vector3(-LINE_HALF - 0.4, -0.25, 0.9) },
    { el: view.querySelector('[data-lab-label="load"]'), at: new THREE.Vector3(LINE_HALF + 0.35, -0.25, 0.9) }
  ];
  const v = new THREE.Vector3();
  function placeLabels() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    for (const l of labels) {
      v.copy(l.at).project(camera);
      l.el.style.transform = "translate(" + ((v.x + 1) / 2) * w + "px," + ((1 - v.y) / 2) * h + "px) translate(-50%, 0)";
    }
  }

  const THICK = 0.022;
  function updateWave() {
    const g = state.gamma;
    const gm = abs(g);
    const ga = Math.atan2(g.im, g.re);
    const wt = state.phase;
    const env = envGeo.attributes.position.array;
    const wav = waveGeo.attributes.position.array;
    const ip = inc.geo.attributes.position.array;
    const rp = ref.geo.attributes.position.array;
    for (let i = 0; i <= SAMPLES; i++) {
      const x = -LINE_HALF + (2 * LINE_HALF * i) / SAMPLES;
      /* Distance from the load in radians of phase */
      const bd = 2 * Math.PI * state.length * ((LINE_HALF - x) / (2 * LINE_HALF));
      /* V(d) = e^{jbd} + G e^{-jbd}, with a unit incident wave */
      const vre = Math.cos(bd) + gm * Math.cos(ga - bd);
      const vim = Math.sin(bd) + gm * Math.sin(ga - bd);
      const envelope = Math.hypot(vre, vim);
      const vi = Math.cos(bd + wt);
      const vr = gm * Math.cos(ga - bd + wt);
      const y = WAVE_BASE + WAVE_AMP * (vi + vr);
      const o = i * 6;
      env[o] = x; env[o + 1] = WAVE_BASE + WAVE_AMP * envelope; env[o + 2] = 0;
      env[o + 3] = x; env[o + 4] = WAVE_BASE - WAVE_AMP * envelope; env[o + 5] = 0;
      wav[o] = x; wav[o + 1] = y + THICK; wav[o + 2] = 0.001;
      wav[o + 3] = x; wav[o + 4] = y - THICK; wav[o + 5] = 0.001;
      const p = i * 3;
      ip[p] = x; ip[p + 1] = WAVE_BASE + WAVE_AMP * vi; ip[p + 2] = -0.002;
      rp[p] = x; rp[p + 1] = WAVE_BASE + WAVE_AMP * vr; rp[p + 2] = -0.002;
    }
    envGeo.attributes.position.needsUpdate = true;
    waveGeo.attributes.position.needsUpdate = true;
    inc.geo.attributes.position.needsUpdate = true;
    ref.geo.attributes.position.needsUpdate = true;
    inc.obj.visible = ref.obj.visible = state.showParts;
  }

  /* Draw only while the view is on screen and the tab is visible, and only
     when something moved. A page about engineering should not run a
     laptop's fan for decoration. */
  let onScreen = true;
  new IntersectionObserver((entries) => {
    onScreen = entries[0].isIntersecting;
    if (onScreen) loop();
  }).observe(view);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) loop();
  });

  let last = 0;
  let running = false;
  function frame(t) {
    running = false;
    if (!onScreen || document.hidden) return;
    const dt = last ? Math.min((t - last) / 1000, 0.05) : 0;
    last = t;
    if (state.playing) {
      state.phase = (state.phase + dt * 2.4) % (Math.PI * 2);
      scene.dirty = true;
    }
    if (scene.dirty) {
      updateWave();
      renderer.render(world, camera);
      placeLabels();
      scene.dirty = false;
    }
    if (state.playing) loop();
    else last = 0;
  }
  function loop() {
    if (running) return;
    running = true;
    requestAnimationFrame(frame);
  }
  scene.loop = loop;

  resize();
  return true;
}

/* --------------------------------------------------------------- wiring */

buildSmith();

inR.addEventListener("input", setFromSliders);
inX.addEventListener("input", setFromSliders);
inLen.addEventListener("input", () => {
  state.length = +inLen.value;
  const text = state.length.toFixed(2) + " wavelengths";
  out.len.textContent = text;
  inLen.setAttribute("aria-valuetext", text);
  scene.dirty = true;
  if (scene.loop) scene.loop();
});

document.querySelectorAll("[data-preset]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const p = btn.getAttribute("data-preset");
    if (p === "open") setGamma(cx(1));
    else if (p === "short") setGamma(cx(-1));
    else {
      const [r, x] = p.split(",").map(Number);
      setGamma(gammaFromZ(r, x));
    }
    if (scene.loop) scene.loop();
  });
});

function syncPlay() {
  playBtn.textContent = state.playing ? "Pause" : "Play";
}
playBtn.addEventListener("click", () => {
  state.playing = !state.playing;
  syncPlay();
  if (scene.loop) scene.loop();
});
partsBox.addEventListener("change", () => {
  state.showParts = partsBox.checked;
  scene.dirty = true;
  if (scene.loop) scene.loop();
});

/* Start on a load that shows something: a 200 ohm resistor */
state.gamma = gammaFromZ(200, 0);
updateReadouts(true);
syncPlay();

scene.ok = initThree();
if (!scene.ok) {
  canvas.hidden = true;
  view.querySelector("[data-lab-fallback]").hidden = false;
  view.querySelectorAll(".lab-label, .lab-view-tools").forEach((el) => (el.hidden = true));
  view.classList.add("is-fallback");
} else {
  scene.loop();
}

/* Any later state change needs a frame even while paused */
const kick = () => scene.loop && scene.loop();
[inR, inX].forEach((el) => el.addEventListener("input", kick));
smith.addEventListener("pointermove", kick);
smith.addEventListener("pointerdown", kick);

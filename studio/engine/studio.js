// Studio engine: boots an episode, owns renderer/post/camera/moods/subtitles, exposes window.renderAt(t).
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import * as core from './core.js';
import * as assets from './assets.js';
import * as kit from './kit.js';
import { Person, seatOf } from './people.js';
import { buildTimeline } from '/tools/timeline.mjs';
import { createOverlay } from './overlay.js';
const { clamp, ss, ease, k, lerp, V, cr, redraw } = core;
export const W = 1080, H = 1920;

// ---------------- lighting moods ----------------
// Episodes return weights per frame, e.g. mood(t) => ({ night: 1, void: k(t, 20, 22) }); the engine blends them.
export const MOODS = {
  night: { bg: 0x121327, sky: 0x8f97d8, ground: 0x3a2f4a, hemi: 0.9, key: 0x8fb4ff, keyI: 1.0, fill: 0.45, env: 0.22, exposure: 1.05, stars: 0.12, dawn: 0 },
  focus: { bg: 0x0e0f20, sky: 0x8f97d8, ground: 0x2a2238, hemi: 0.22, key: 0x8fb4ff, keyI: 0.15, fill: 0.08, env: 0.06, exposure: 1.05, stars: 0.1, dawn: 0 },
  void: { bg: 0x0b0b1a, sky: 0x6f77b8, ground: 0x1a1628, hemi: 0.3, key: 0x8fb4ff, keyI: 0.25, fill: 0.15, env: 0.05, exposure: 1.05, stars: 0.35, dawn: 0 },
  space: { bg: 0x0b0b1a, sky: 0x6f77b8, ground: 0x1a1628, hemi: 0.35, key: 0x8fb4ff, keyI: 0.3, fill: 0.2, env: 0.05, exposure: 1.05, stars: 0.95, dawn: 0, fog: 1 },
  dawn: { bg: 0x2c2846, sky: 0xffd1b0, ground: 0x5a4048, hemi: 1.4, key: 0xffc48a, keyI: 2.6, fill: 0.7, env: 0.35, exposure: 1.15, stars: 0, dawn: 1 },
  day: { bg: 0x3a3f5c, sky: 0xe8eeff, ground: 0x6a5a58, hemi: 1.8, key: 0xfff2dc, keyI: 3.0, fill: 0.9, env: 0.5, exposure: 1.0, stars: 0, dawn: 1 },
};

export async function boot(epId) {
  const ep = await (await fetch(`/episodes/${epId}/episode.json`)).json();
  const subs = await (await fetch(`/episodes/${epId}/subs.json`)).json();
  await document.fonts.load('600 66px "Songti SC"'); await document.fonts.load('500 40px "PingFang SC"'); await document.fonts.load('500 54px "Baskerville"');

  // ---- timing ----
  // episodes/<id>/timeline.json (written by tools/voice.mjs from the narration lengths) wins; without it, sec × scale.
  let timeline = null;
  try { const r = await fetch(`/episodes/${epId}/timeline.json`); if (r.ok) timeline = await r.json(); } catch { /* none */ }
  timeline ??= buildTimeline(ep, subs, null);
  const CARDS = [], SEG = {};
  for (const s of subs.segments) {
    SEG[s.id] = [];
    s.cards.forEach((c, i) => {
      const tc = timeline.cards.find(x => x.seg === s.id && x.i === i);
      if (!tc) throw new Error(`timeline.json has no card ${s.id}[${i}] — re-run tools/voice.mjs ${epId}`);
      const card = { ...c, seg: s.id, i, start: tc.start, end: tc.end }; CARDS.push(card); SEG[s.id].push(card);
    });
  }
  const DURATION = timeline.duration;

  // ---- renderer ----
  const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(W, H, false);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(MOODS.night.bg);
  scene.fog = new THREE.Fog(MOODS.night.bg, 500, 1000);
  const camera = new THREE.PerspectiveCamera(22, W / H, 0.05, 400);
  camera.setViewOffset(W, H, 0, H * 0.085, W, H); // keep subjects above the subtitle band

  const hemi = new THREE.HemisphereLight(MOODS.night.sky, MOODS.night.ground, 1); scene.add(hemi);
  const key = new THREE.DirectionalLight(MOODS.night.key, 1); key.position.set(-2.5, 4.5, -6); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 0.5, far: 20 }); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xa9aee8, 0.5); fill.position.set(6, 5, 6); scene.add(fill);

  const S = {
    THREE, ...core, scene, camera, renderer, ep, subs, CARDS, SEG, DURATION, people: [], rooms: [],
    T: (s, i) => SEG[s][i].start, E: (s, i) => SEG[s][i].end,
    lights: { hemi, key, fill },
    prop: (name, opts) => assets.prop(S, name, opts), topOf: assets.topOf, pbr: assets.pbr,
    hdri: (name, i) => assets.hdri(S, name, i),
    phone: opts => assets.phone(S, opts),
    room: opts => { const r = assets.room(S, opts); S.rooms.push(r); return r; },
    person: (name, opts) => Person.load(S, name, opts), seatOf,
    kit: Object.fromEntries(Object.entries(kit).map(([n, f]) => [n, typeof f === 'function' ? (...a) => f(S, ...a) : f])),
    /** practical warm lamp (e.g. a desk lamp bulb). Returns { spot, glow, set(v) } */
    lamp(pos, target, { color = 0xffb066, intensity = 6, angle = 0.9 } = {}) {
      const spot = new THREE.SpotLight(color, intensity, 5, angle, 0.6, 1.6); spot.position.copy(pos); spot.target.position.copy(target);
      spot.castShadow = true; spot.shadow.mapSize.set(2048, 2048); spot.shadow.bias = -0.0006; spot.shadow.normalBias = 0.02; spot.shadow.radius = 4;
      const glow = new THREE.PointLight(color, intensity * 0.12, 2.5, 2); glow.position.copy(pos).lerp(target, 0.35); // off the bulb, so the shade does not blow out
      scene.add(spot, spot.target, glow);
      return { spot, glow, set(v) { spot.intensity = intensity * v; glow.intensity = intensity * 0.12 * v; } };
    },
    flashes: [],
    /** restyle the frame's DOM layers for this episode: { scrim, vignette, subColor, subShadow, smallColor, grain, fade, flash, rule } (CSS values) */
    look(o = {}) {
      const st = id => document.getElementById(id).style;
      if (o.scrim) st('scrim').background = o.scrim;
      if (o.vignette) st('vignette').background = o.vignette;
      if (o.subColor) st('subs').color = o.subColor;
      if (o.subShadow) st('subs').textShadow = o.subShadow;
      if (o.grain != null) st('grain').opacity = o.grain;
      if (o.fade) st('fade').background = o.fade;
      if (o.flash) st('flash').background = o.flash;
      if (o.rule) st('rule').background = o.rule;
      if (o.smallColor) { const s2 = document.createElement('style'); s2.textContent = `#subs .sub-small { color: ${o.smallColor}; }`; document.head.appendChild(s2); }
    },
    overlay: createOverlay(document.getElementById('overlay'), { base: `/episodes/${epId}`, canvas: document.getElementById('c') }),
  };

  // ---- episode ----
  const mod = await import(`/episodes/${epId}/scene.js`);
  const ctl = await mod.default(S); // { update(t), mood(t), shots: [...] }
  await S.overlay.ready(); // every overlay image decoded before the first screenshot
  const SHOTS = ctl.shots ?? [];
  SHOTS.sort((a, b) => a.at - b.at);
  SHOTS.forEach((s, i) => { if (s.moveDur === undefined) s.moveDur = i === 0 ? 0 : Math.min(2.2, Math.max(1.2, s.at - SHOTS[i - 1].at - 0.6)); });
  const stars = kit.stars(S);

  // ---- post ----
  const composer = new EffectComposer(renderer); composer.setPixelRatio(1); composer.setSize(W, H);
  composer.addPass(new RenderPass(scene, camera));
  const bokeh = new BokehPass(scene, camera, { focus: 5, aperture: 0.002, maxblur: 0.012 }); composer.addPass(bokeh);
  const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), ep.bloom ?? 0.4, 0.5, 0.9); composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // ---- overlays ----
  const $ = id => document.getElementById(id);
  const subsEl = $('subs'), ruleEl = $('rule'), fadeEl = $('fade'), flashEl = $('flash'), grainC = $('grain'), grainG = grainC.getContext('2d');
  // Subtitles are bilingual: card.text / card.small are Chinese, card.en / card.small_en English.
  // The 3D frame is identical in both languages, so render.mjs screenshots each frame once per language.
  let lastKey = '', LANG = new URLSearchParams(location.search).get('lang') || 'zh';
  const cardText = c => LANG === 'en' ? [c.en ?? c.text, c.small_en ?? (c.en ? '' : c.small)] : [c.text, c.small];
  function updateSubs(t) {
    const c = CARDS.find(c => t >= c.start && t < c.end);
    if (!c) { subsEl.style.opacity = 0; ruleEl.style.opacity = 0; return; }
    const [text, small] = cardText(c);
    const key = LANG + text + (small || '');
    if (key !== lastKey) { subsEl.innerHTML = text.split('\n').map(l => `<span class="line">${l}</span>`).join('') + (small ? `<span class="line sub-small">${small}</span>` : ''); lastKey = key; }
    const o = ss(Math.min(clamp((t - c.start) / 0.45), clamp((c.end - t) / 0.35)));
    subsEl.style.opacity = o; subsEl.style.filter = `blur(${(1 - o) * 6}px)`;
    subsEl.style.transform = `translateY(${(1 - ss(clamp((t - c.start) / 0.45))) * 16}px)`;
    ruleEl.style.opacity = 0.8;
  }
  function grain(seed) {
    const img = grainG.createImageData(grainC.width, grainC.height); let s = (seed * 9301 + 49297) % 233280 || 1;
    for (let i = 0; i < img.data.length; i += 4) { s = (s * 16807) % 2147483647; const v = s & 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
    grainG.putImageData(img, 0, 0);
  }

  // ---- camera: one continuous take through the shot list ----
  const tgtOf = (s, t) => typeof s.tgt === 'function' ? s.tgt(t) : s.tgt;
  const posOf = (s, t) => tgtOf(s, t).clone().addScaledVector(s.dir, s.dist);
  function cameraAt(t) {
    if (!SHOTS.length) return { pos: V(6, 5, 6), tgt: V(0, 1, 0), fov: 22, moving: 0, dist: 8 };
    let i = SHOTS.findIndex(s => s.at > t); if (i === -1) i = SHOTS.length - 1;
    const B = SHOTS[i], A = SHOTS[Math.max(0, i - 1)], A0 = SHOTS[Math.max(0, i - 2)], B1 = SHOTS[Math.min(SHOTS.length - 1, i + 1)];
    const ms = B.at - B.moveDur;
    let u = 0, moving = 0, ut = 0;
    if (t > ms && i > 0) { const x = clamp((t - ms) / B.moveDur); u = ease(x); moving = Math.sin(x * Math.PI); ut = ease(clamp((t - ms) / (B.moveDur * 0.8))); }
    const pa = posOf(A, t), pb = posOf(B, t);
    const pos = cr(posOf(A0, t).lerp(pa, 0.5), pa, pb, posOf(B1, t).lerp(pb, 0.5), u);
    const tgt = tgtOf(A, t).clone().lerp(tgtOf(B, t), ut);
    const fov = lerp(A.fov, B.fov, u);
    const hold = clamp((t - A.at) / 8) * (1 - u);
    if (A.pov && B.pov || A.pov && u === 0) {
      // first person: the eye stays put and breathes; the gaze drifts a little instead of orbiting
      const breath = V(Math.sin(t * 0.37) * 0.006, Math.sin(t * 1.1) * 0.005, 0);
      const look = tgt.clone().add(V(Math.sin(t * 0.23) * 0.02, Math.sin(t * 0.31) * 0.012, 0));
      const eye = pos.clone().add(breath).lerp(look, 0.05 * hold); // lean in slightly while holding
      return { pos: eye, tgt: look, fov, moving, dist: eye.distanceTo(look) };
    }
    const off = pos.clone().sub(tgt).multiplyScalar(1 - 0.04 * hold);
    off.applyAxisAngle(V(0, 1, 0), Math.sin(t * 0.21) * 0.012 + hold * 0.025);
    return { pos: tgt.clone().add(off), tgt, fov, moving, dist: off.length() };
  }

  // ---- mood blending ----
  const tmpC = new THREE.Color();
  function applyMood(weights, cam) {
    let sum = 0; for (const v of Object.values(weights)) sum += Math.max(0, v);
    const m = { bg: new THREE.Color(0, 0, 0), sky: new THREE.Color(0, 0, 0), ground: new THREE.Color(0, 0, 0), key: new THREE.Color(0, 0, 0), hemi: 0, keyI: 0, fill: 0, env: 0, exposure: 0, stars: 0, dawn: 0, fog: 0 };
    for (const [name, w0] of Object.entries(weights)) {
      const w = Math.max(0, w0) / (sum || 1), p = MOODS[name]; if (!p || !w) continue;
      for (const c of ['bg', 'sky', 'ground', 'key']) m[c].add(tmpC.set(p[c]).multiplyScalar(w));
      for (const n of ['hemi', 'keyI', 'fill', 'env', 'exposure', 'stars', 'dawn', 'fog']) m[n] += (p[n] ?? 0) * w;
    }
    scene.background.copy(m.bg); scene.fog.color.copy(m.bg);
    scene.fog.near = lerp(500, cam.dist * 0.75, m.fog); scene.fog.far = lerp(1000, cam.dist * 1.7, m.fog);
    hemi.color.copy(m.sky); hemi.groundColor.copy(m.ground); hemi.intensity = m.hemi;
    key.color.copy(m.key); key.intensity = m.keyI; fill.intensity = m.fill;
    scene.environmentIntensity = m.env; renderer.toneMappingExposure = m.exposure;
    stars.material.opacity = clamp(m.stars);
    for (const r of S.rooms) {
      redraw(r.sky, Math.round(m.dawn * 40) / 40);
      r.floor.visible = camera.position.y > -0.02; // flying up from the void passes through the floor: don't fill the frame with its underside
    }
    return m;
  }

  window.setLang = l => { LANG = l; document.body.classList.toggle('en', l === 'en'); };
  window.setLang(LANG);
  // re-draw only the language-dependent DOM layers (the WebGL canvas keeps its last frame)
  window.subsAt = t => { updateSubs(t); S.overlay.update(t, LANG); };
  window.LANGS = CARDS.every(c => c.en) ? ['zh', 'en'] : ['zh'];
  window.DURATION = DURATION;
  window.SEGMENTS = Object.fromEntries(Object.entries(SEG).map(([k2, v]) => [k2, [v[0].start, v[v.length - 1].end]]));
  window.renderAt = function (t) {
    ctl.update?.(t);
    for (const p of S.people) p.update(t);
    const cam = cameraAt(t);
    camera.position.copy(cam.pos); camera.fov = cam.fov; camera.lookAt(cam.tgt); camera.updateProjectionMatrix();
    bokeh.uniforms.focus.value = cam.dist * (1 - cam.moving * 0.1);
    bokeh.uniforms.aperture.value = ((ep.dof ?? 0.05) + cam.moving * 0.25) / cam.dist;
    applyMood(ctl.mood?.(t) ?? { night: 1 }, cam);
    grain(Math.floor(t * 30));
    updateSubs(t); S.overlay.update(t, LANG);
    flashEl.style.opacity = Math.max(0, ...S.flashes.map(f => 1 - Math.abs(t - f) / 0.18)) * 0.8;
    fadeEl.style.opacity = Math.max(1 - k(t, 0, 1.3), k(t, DURATION - 1.6, DURATION));
    composer.render();
  };
  window.renderAt(0);
  window.sceneReady = true;
}

/** first-person shot: the eye sits at `eye` and looks at `look` (both [x,y,z] or Vector3). ~40° fov reads as human vision. */
export function pov(at, eye, look, fov = 40, moveDur) {
  const E = Array.isArray(eye) ? V(...eye) : eye, L = Array.isArray(look) ? V(...look) : look;
  const off = E.clone().sub(L);
  return { at, tgt: L, dist: off.length(), dir: off.normalize(), fov, moveDur, pov: true };
}

/** shot helper for episodes: arrive at `at`, look at tgt (Vector3 | [x,y,z] | t => Vector3) from `dir` at `dist` metres */
export function shot(at, tgt, dist, dir = [1, 0.85, 1], fov = 22, moveDur) {
  const T = Array.isArray(tgt) ? V(...tgt) : tgt;
  return { at, tgt: T, dist, dir: (Array.isArray(dir) ? V(...dir) : dir.clone()).normalize(), fov, moveDur };
}

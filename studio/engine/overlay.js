// 2D explainer layer: glowing line drawings, labels, paper scraps and cut-out photos drawn in the DOM above the 3D canvas.
// Everything is a pure function of time t (no CSS transitions or animations): render.mjs screenshots frame by frame.
// Text is bilingual (zh / en) and switches with the subtitles, so the 3D frame is still rendered only once per frame.
// Coordinates are pixels on the 1080×1920 frame. Keep elements above y = 1300: the subtitles live below that.
import { clamp, ss, ease, rng } from './core.js';

const SVGNS = 'http://www.w3.org/2000/svg';
const FONTS = {
  song: { zh: ['600', '"Songti SC", "STSong", serif'], en: ['500', '"Baskerville", "Georgia", serif'] },
  sans: { zh: ['500', '"PingFang SC", sans-serif'], en: ['500', '"Avenir Next", "Helvetica Neue", sans-serif'] },
};
const setFont = (el, font, lang) => { const [w, f] = FONTS[font][lang === 'en' ? 'en' : 'zh']; el.style.fontWeight = w; el.style.fontFamily = f; };
const esc = s => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]).replace(/\n/g, '<br>');
/** 0→1 over [a, a+fin], then 1→0 over [b-fout, b] */
const life = (t, a, b, fin = 0.5, fout = 0.5) => (t < a || t > b) ? 0 : ss((t - a) / fin) * ss((b - t) / fout);

// a fixed paper grain, generated once (deterministic)
let GRAIN = null;
function grainURL() {
  if (GRAIN) return GRAIN;
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); const r = rng(17);
  const img = g.createImageData(256, 256);
  for (let i = 0; i < img.data.length; i += 4) { const v = 200 + r() * 55; img.data[i] = v; img.data[i + 1] = v * 0.97; img.data[i + 2] = v * 0.9; img.data[i + 3] = 40; }
  g.putImageData(img, 0, 0);
  for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(120,95,60,${0.03 + r() * 0.05})`; g.lineWidth = 0.6; g.beginPath(); const y = r() * 256; g.moveTo(0, y); g.bezierCurveTo(80, y + r() * 6 - 3, 170, y + r() * 6 - 3, 256, y + r() * 4 - 2); g.stroke(); }
  return (GRAIN = c.toDataURL());
}

// Default look (the original dark style). An episode can override any of these with overlay.theme({...}) before
// creating elements; elements read the theme when they are created, dims read it every frame.
const DEFAULT_THEME = {
  ink: '#f4ecdc',                                                          // default stroke / label colour
  labelShadow: '0 2px 18px rgba(0,0,0,.65), 0 0 2px rgba(0,0,0,.4)',
  paperShadow: '0 18px 40px rgba(0,0,0,.45), 0 2px 6px rgba(0,0,0,.35), inset 0 0 40px rgba(150,120,70,.18)',
  photoFilter: 'drop-shadow(0 14px 22px rgba(0,0,0,.55)) grayscale(1) sepia(.2)',
  stamp: '#c0392b',
  dimTint: null,      // a CSS colour washed over the dimmed frame (null = plain darkening)
  dimDarken: 1,       // how much of `amount` goes into brightness() when a tint is set
  dimBlur: 14,
};

export function createOverlay(root, { base = '', canvas } = {}) {
  const items = [], dims = [], loads = [], TH = { ...DEFAULT_THEME };
  // tint wash for dim(): sits under every overlay element, above the 3D canvas
  const wash = document.createElement('div');
  Object.assign(wash.style, { position: 'absolute', inset: 0, opacity: 0, pointerEvents: 'none' });
  root.appendChild(wash);
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('width', 1080); svg.setAttribute('height', 1920); svg.setAttribute('viewBox', '0 0 1080 1920');
  Object.assign(svg.style, { position: 'absolute', left: 0, top: 0, overflow: 'visible' });
  root.appendChild(svg);
  const url = src => /^(\/|https?:|data:)/.test(src) ? src : `${base}/${src}`;
  function loadImg(src) {
    const img = new Image(); img.src = url(src); img.draggable = false;
    loads.push(img.decode().catch(() => { throw new Error(`overlay: cannot load ${img.src}`); }));
    return img;
  }
  function box(x, y, rot) {
    const el = document.createElement('div');
    Object.assign(el.style, { position: 'absolute', left: `${x}px`, top: `${y}px`, opacity: 0, visibility: 'hidden', willChange: 'transform, opacity' });
    root.appendChild(el); el.dataset.rot = rot; return el;
  }
  /** fade in with a short drop, fade out before `out` */
  function drop(el, t, at, out, { anchor = 'translate(-50%, -50%)', fall = 26, pos } = {}) {
    const o = life(t, at, out, 0.5, 0.5);
    if (pos && o > 0.001) { const [px, py] = pos(t); el.style.left = `${px.toFixed(1)}px`; el.style.top = `${py.toFixed(1)}px`; }
    el.style.visibility = o > 0.001 ? 'visible' : 'hidden'; el.style.opacity = o;
    const d = (1 - ease(clamp((t - at) / 0.5))) * -fall;
    el.style.transform = `${anchor} translateY(${d}px) rotate(${el.dataset.rot}deg)`;
  }

  const api = {
    /** darken and blur the 3D frame between at and out (0.6 s ramps) */
    dim(at, out, amount = 0.55) { dims.push({ at, out, amount }); return api; },

    /** override the look (see DEFAULT_THEME); call before creating elements */
    theme(o) { Object.assign(TH, o); return api; },

    /** a glowing line drawing. d: SVG path; drawn over `draw` seconds from `at`, fades out in the 0.5 s before `out` */
    stroke({ at, out, d, draw = 1.2, color = TH.ink, width = 4, glow = true }) {
      const p = document.createElementNS(SVGNS, 'path');
      p.setAttribute('d', d); p.setAttribute('pathLength', '1'); p.setAttribute('fill', 'none');
      p.setAttribute('stroke', color); p.setAttribute('stroke-width', width); p.setAttribute('stroke-linecap', 'round'); p.setAttribute('stroke-linejoin', 'round');
      p.setAttribute('stroke-dasharray', '1 1');
      if (glow) p.style.filter = `drop-shadow(0 0 ${width * 1.5}px ${color}) drop-shadow(0 0 ${width * 5}px ${color}88)`;
      svg.appendChild(p);
      items.push({ update(t) {
        const u = ease(clamp((t - at) / draw)), o = t < at || t > out ? 0 : ss((out - t) / 0.5);
        p.style.visibility = u > 0.002 && o > 0.001 ? 'visible' : 'hidden';
        p.setAttribute('stroke-dashoffset', String(1 - u)); p.style.opacity = o;
      } });
      return p;
    },

    /** one line of bilingual text. (x, y) is the anchor point: horizontal per `anchor`, vertically centred */
    // optional: pos (t => [x, y], e.g. a projected 3D point; overrides x / y), bg (CSS colour: the text sits on a rounded chip), rot (deg)
    label({ at, out, x = 0, y = 0, pos, zh, en, size = 44, font = 'song', color = TH.ink, anchor = 'middle', shadow = true, bg, rot = 0 }) {
      const el = box(x, y, rot);
      Object.assign(el.style, { fontSize: `${size}px`, color, whiteSpace: 'nowrap', lineHeight: 1.3, letterSpacing: font === 'song' ? '3px' : '1px',
        textShadow: shadow && !bg ? TH.labelShadow : 'none' });
      if (bg) Object.assign(el.style, { background: bg, padding: `${size * 0.16}px ${size * 0.42}px`, borderRadius: `${size * 0.32}px`, boxShadow: TH.chipShadow ?? 'none' });
      const tx = { start: '0', middle: '-50%', end: '-100%' }[anchor];
      let lang = '';
      items.push({ update(t, l) {
        if (l !== lang) { lang = l; el.innerHTML = esc(l === 'en' ? en ?? zh : zh); setFont(el, font, l); }
        drop(el, t, at, out, { anchor: `translate(${tx}, -50%)`, fall: 0, pos });
        const o = life(t, at, out, 0.5, 0.5); el.style.filter = o < 1 ? `blur(${(1 - o) * 5}px)` : '';
      } });
      return el;
    },

    /**
     * a scrap of paper with grain and a drop shadow, centred on (x, y). With `src` it holds that image (path relative to the
     * episode), otherwise the zh / en text. Extras: size / font / color / align for the text, pad (px of paper around an image),
     * ruled (faint exam-paper lines), stamp { at, zh, en, color, size, rot, right, bottom } (a rubber stamp that thumps down at
     * its own time; right / bottom are CSS offsets inside the paper, default '8%' / '10%'; a negative offset lets it overhang the edge).
     */
    paper({ at, out, x = 0, y = 0, pos, w, h, rot = 0, src, zh, en, size = 40, font = 'song', color = '#2b2620', align = 'center', pad = 18, ruled = false, stamp }) {
      const el = box(x, y, rot);
      Object.assign(el.style, { width: `${w}px`, height: h ? `${h}px` : 'auto', boxSizing: 'border-box', padding: `${pad}px`,
        background: `url(${grainURL()}), linear-gradient(160deg, #f6efdf 0%, #efe5cf 60%, #e6d9bd 100%)`,
        boxShadow: TH.paperShadow });
      if (ruled) el.style.backgroundImage += `, repeating-linear-gradient(to bottom, transparent 0 ${size * 1.6 - 2}px, rgba(90,110,150,.32) ${size * 1.6 - 2}px ${size * 1.6}px)`;
      let txt = null;
      if (src) { const img = loadImg(src); Object.assign(img.style, { display: 'block', width: '100%', height: h ? '100%' : 'auto', objectFit: 'cover', filter: 'sepia(.15) contrast(1.02)' }); el.appendChild(img); }
      else { txt = document.createElement('div'); Object.assign(txt.style, { color, textAlign: align, lineHeight: 1.45 }); el.appendChild(txt); }
      let st = null;
      if (stamp) {
        st = document.createElement('div');
        Object.assign(st.style, { position: 'absolute', right: stamp.right ?? '8%', bottom: stamp.bottom ?? '10%', padding: '6px 22px', border: `6px solid ${stamp.color ?? TH.stamp}`, borderRadius: '10px',
          color: stamp.color ?? TH.stamp, font: '700 1em "PingFang SC", "Avenir Next", sans-serif', fontSize: `${stamp.size ?? 54}px`, letterSpacing: '4px',
          mixBlendMode: 'multiply', opacity: 0, whiteSpace: 'nowrap' });
        el.appendChild(st);
      }
      let lang = '';
      items.push({ update(t, l) {
        if (l !== lang) {
          lang = l; const en_ = l === 'en';
          if (txt) { txt.innerHTML = esc(en_ ? en ?? zh : zh); setFont(txt, font, l); txt.style.fontSize = `${size}px`; }
          if (st) st.textContent = en_ ? stamp.en ?? stamp.zh : stamp.zh;
        }
        drop(el, t, at, out, { pos });
        if (st) { const u = clamp((t - stamp.at) / 0.18); st.style.opacity = t < stamp.at ? 0 : 0.85 * ss(u); st.style.transform = `rotate(${stamp.rot ?? -12}deg) scale(${1.8 - 0.8 * ease(u)})`; }
      } });
      return el;
    },

    /**
     * a rubber stamp on its own (e.g. pinned to a 3D object via pos: t => [x, y]): thumps down at `at`, fades before `out`.
     * zh / en text, color, size (px), rot (deg), fill (CSS background behind the ink, default a faint paper tint).
     */
    stamp({ at, out, x = 0, y = 0, pos, zh, en, color = TH.stamp, size = 60, rot = -12, fill = 'rgba(255,248,236,.55)' }) {
      const el = box(x, y, rot);
      Object.assign(el.style, { padding: `${size * 0.1}px ${size * 0.38}px`, border: `${Math.max(4, size * 0.1)}px solid ${color}`, borderRadius: `${size * 0.2}px`,
        color, font: '700 1em "PingFang SC", "Avenir Next", sans-serif', fontSize: `${size}px`, letterSpacing: '4px', whiteSpace: 'nowrap', background: fill, lineHeight: 1.2 });
      let lang = '';
      items.push({ update(t, l) {
        if (l !== lang) { lang = l; el.textContent = l === 'en' ? en ?? zh : zh; }
        const o = t < at || t > out ? 0 : ss((out - t) / 0.4), u = clamp((t - at) / 0.18);
        el.style.visibility = o > 0.001 ? 'visible' : 'hidden'; el.style.opacity = o * ss(u);
        if (pos && o > 0.001) { const [px, py] = pos(t); el.style.left = `${px.toFixed(1)}px`; el.style.top = `${py.toFixed(1)}px`; }
        el.style.transform = `translate(-50%, -50%) rotate(${rot}deg) scale(${1.8 - 0.8 * ease(u)})`;
      } });
      return el;
    },

    /** a cut-out photo (transparent PNG), w px wide, centred on (x, y); enters like paper */
    photo({ at, out, x, y, w, rot = 0, src }) {
      const el = box(x, y, rot); const img = loadImg(src);
      Object.assign(img.style, { display: 'block', width: `${w}px`, filter: TH.photoFilter });
      el.appendChild(img);
      items.push({ update(t) { drop(el, t, at, out); } });
      return el;
    },

    /** set every element to its state at time t (called by the engine each frame and by window.subsAt) */
    update(t, lang = 'zh') {
      let v = 0, amt = 0;
      for (const d of dims) { const w = t < d.at || t > d.out ? 0 : ss((t - d.at) / 0.6) * ss((d.out - t) / 0.6); if (w > v) { v = w; amt = d.amount; } }
      const dark = TH.dimTint ? TH.dimDarken : 1;
      wash.style.background = TH.dimTint ?? 'transparent'; wash.style.opacity = TH.dimTint ? (amt * v).toFixed(3) : 0;
      if (canvas) {
        canvas.style.filter = v > 0.001 ? `blur(${(v * TH.dimBlur).toFixed(2)}px) brightness(${(1 - amt * dark * v).toFixed(3)})` : '';
        canvas.style.transform = v > 0.001 ? `scale(${(1 + 0.04 * v).toFixed(4)})` : ''; // hide the blur's dark rim
      }
      for (const it of items) it.update(t, lang);
    },
    /** resolves when every image is decoded (the engine awaits this before the first frame) */
    ready: () => Promise.all(loads),
  };
  return api;
}

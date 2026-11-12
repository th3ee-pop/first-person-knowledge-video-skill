// Loading Poly Haven props/textures/HDRIs and building the realistic room. All units are metres.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { box, mat, at, canvasTex, redraw, rng } from './core.js';

const gltfLoader = new GLTFLoader();
const texLoader = new THREE.TextureLoader();
const cache = new Map();

/**
 * Load a Poly Haven model (fetched by tools/fetch-assets.mjs) and place it.
 * opts: pos [x,y,z] (y = where its bottom sits), rotY, scale, on (another prop: sit on its top surface,
 * pos x/z are then relative to that prop's centre), parent, shadows (default true)
 * Returns a Group whose origin is the model's bottom-centre; .userData.size holds its dimensions.
 */
export async function prop(S, name, opts = {}) {
  if (!cache.has(name)) cache.set(name, gltfLoader.loadAsync(`/assets/polyhaven/models/${name}/${name}.gltf`));
  const src = (await cache.get(name)).scene;
  const model = src.clone(true);
  model.traverse(m => {
    if (!m.isMesh) return;
    m.castShadow = opts.shadows !== false; m.receiveShadow = true;
    // glass (transmission) renders near-black without a transmission pass: make it a faint clear layer instead
    for (const mm of [m.material].flat()) if (mm.transmission > 0 || /glass/i.test(mm.name) && mm.transparent) { mm.transmission = 0; mm.transparent = true; mm.opacity = 0.12; mm.depthWrite = false; m.castShadow = false; }
  });
  const s = opts.scale ?? 1; model.scale.setScalar(s);
  // re-centre so the group origin is the model's bottom-centre
  const b = new THREE.Box3().setFromObject(model); const c = b.getCenter(new THREE.Vector3());
  model.position.set(-c.x, -b.min.y, -c.z);
  const g = new THREE.Group(); g.add(model); g.name = name;
  g.userData.size = b.getSize(new THREE.Vector3());
  g.rotation.y = opts.rotY ?? 0;
  const [x, y, z] = opts.pos ?? [0, 0, 0];
  const parent = opts.parent ?? S.scene;
  if (opts.on) {
    const top = topOf(opts.on);
    const base = opts.on.getWorldPosition(new THREE.Vector3());
    g.position.set(base.x + x, top + (y || 0), base.z + z);
    S.scene.add(g);
  } else at(g, x, y, z, parent);
  g.updateWorldMatrix(true, true);
  return g;
}
/** world-space height of an object's top surface */
export function topOf(obj) { obj.updateWorldMatrix(true, true); return new THREE.Box3().setFromObject(obj).max.y; }

/** PBR material from a Poly Haven texture set; repeat = how many tiles across a 1 m × 1 m patch × size */
export function pbr(name, size = [1, 1], opts = {}) {
  const load = (f, srgb) => {
    const t = texLoader.load(`/assets/polyhaven/textures/${name}/${f}.jpg`, undefined, undefined, () => {});
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(size[0], size[1]); t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t;
  };
  return new THREE.MeshStandardMaterial({
    map: load('diff', true), normalMap: load('nor'), roughnessMap: load('rough'), roughness: 1,
    color: opts.tint ?? 0xffffff, ...opts.extra,
  });
}

export async function hdri(S, name, intensity = 0.4) {
  const tex = await new RGBELoader().loadAsync(`/assets/polyhaven/hdri/${name}.hdr`);
  const pm = new THREE.PMREMGenerator(S.renderer);
  S.scene.environment = pm.fromEquirectangular(tex).texture;
  S.scene.environmentIntensity = intensity;
  tex.dispose(); pm.dispose();
}

// night / dawn colours of the window sky; room({ skyPalette }) can override any of them
export const SKY = {
  night: ['#0b1030', '#27306a', '#4a4a86'], dawn: ['#6d7fc4', '#f2b48c', '#ffd9a0'],
  moonShade: ['#27306a', '#9aa2d0'], towers: ['#141838', '#5a4a6e'], lit: '255,210,138',
};
/** Night ↔ dawn sky for windows. dawn: 0 night … 1 sunrise */
export function skyTexture(pal = {}) {
  const P = { ...SKY, ...pal };
  return canvasTex(512, 640, (g, w, h, dawn = 0) => {
    const c = (a, b) => '#' + new THREE.Color(a).lerp(new THREE.Color(b), dawn).getHexString();
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, c(P.night[0], P.dawn[0])); grd.addColorStop(0.6, c(P.night[1], P.dawn[1])); grd.addColorStop(1, c(P.night[2], P.dawn[2]));
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    const r = rng(7);
    for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(255,255,255,${(0.3 + r() * 0.6) * (1 - dawn)})`; const rr = r() * 1.8 + 0.4; g.beginPath(); g.arc(r() * w, r() * h * 0.6, rr, 0, 7); g.fill(); }
    if (dawn < 1) {
      g.globalAlpha = 1 - dawn; g.fillStyle = '#fdf3d6'; g.shadowColor = '#fff2c0'; g.shadowBlur = 40;
      g.beginPath(); g.arc(370, 140, 42, 0, 7); g.fill(); g.shadowBlur = 0;
      g.fillStyle = c(...P.moonShade); g.beginPath(); g.arc(390, 128, 38, 0, 7); g.fill(); g.globalAlpha = 1;
    }
    if (dawn > 0) { g.fillStyle = `rgba(255,236,190,${dawn})`; g.shadowColor = '#ffcf80'; g.shadowBlur = 60; g.beginPath(); g.arc(150, h - 170 - dawn * 120, 46, 0, 7); g.fill(); g.shadowBlur = 0; }
    for (let i = 0; i < 14; i++) {
      const bw = 30 + r() * 50, bh = 120 + r() * 220, bx = i * 38 - 20;
      g.fillStyle = c(...P.towers); g.fillRect(bx, h - bh, bw, bh);
      for (let y = h - bh + 10; y < h - 10; y += 18) for (let x = bx + 6; x < bx + bw - 8; x += 12)
        if (r() > 0.72) { g.fillStyle = `rgba(${P.lit},${1 - dawn * 0.8})`; g.fillRect(x, y, 5, 8); }
    }
  });
}

/**
 * A cut-away diorama room: floor + back wall (−z) + left wall (−x), open towards the camera.
 * opts: w, d, h (metres), floor/wall (Poly Haven texture names), wallTint, window {x, y, w, h} on the back wall.
 * Flat look instead of textures: floorColor / wallColor / wallColor2 (hex) give plain matte materials;
 * trimColor colours the window frame and skirting; skyPalette overrides SKY colours for the window.
 * Returns { group, sky, size, setDawn(p) }.
 */
export function room(S, opts = {}) {
  const W = opts.w ?? 4.2, D = opts.d ?? 4.2, Hh = opts.h ?? 2.8, T = 0.12;
  const group = new THREE.Group(); S.scene.add(group);
  const flat = c => mat(c, { roughness: 0.92, metalness: 0 });
  const floorM = opts.floorColor != null ? flat(opts.floorColor) : pbr(opts.floor ?? 'wood_floor_worn', [W / 1.6, D / 1.6]);
  const wallM = opts.wallColor != null ? flat(opts.wallColor) : pbr(opts.wall ?? 'painted_plaster_wall', [W / 2, Hh / 2], { tint: opts.wallTint ?? 0xb9b4c8 });
  const wallM2 = opts.wallColor != null ? flat(opts.wallColor2 ?? opts.wallColor) : pbr(opts.wall ?? 'painted_plaster_wall', [D / 2, Hh / 2], { tint: opts.wallTint2 ?? opts.wallTint ?? 0xa8a3ba });
  const floor = at(box(W + T, 0.2, D + T, floorM, 0.01), 0, -0.1, 0, group);
  const win = opts.window ?? { x: -0.7, y: 1.55, w: 1.1, h: 1.25 };
  // back wall built around a window hole
  const bz = -D / 2 - T / 2;
  const wl = win.x - win.w / 2 + W / 2, wr = W / 2 - (win.x + win.w / 2);
  const er = opts.wallColor != null ? 0 : 0.005; // flat walls: sharp edges, or the rounded seams between the pieces show
  at(box(wl, Hh, T, wallM, er), -W / 2 + wl / 2, Hh / 2, bz, group);
  at(box(wr, Hh, T, wallM, er), W / 2 - wr / 2, Hh / 2, bz, group);
  at(box(win.w, win.y - win.h / 2, T, wallM, er), win.x, (win.y - win.h / 2) / 2, bz, group);
  const topH = Hh - (win.y + win.h / 2); at(box(win.w, topH, T, wallM, er), win.x, Hh - topH / 2, bz, group);
  at(box(T, Hh, D + T, wallM2, er), -W / 2 - T / 2, Hh / 2, 0, group);
  // window: sky plane behind the hole + frame + sill
  const sky = skyTexture(opts.skyPalette);
  const skyMesh = new THREE.Mesh(new THREE.PlaneGeometry(win.w * 1.6, win.h * 1.6), new THREE.MeshBasicMaterial({ map: sky, toneMapped: false }));
  at(skyMesh, win.x, win.y, bz - 0.35, group);
  const fm = mat(opts.trimColor ?? 0xece4d6, { roughness: 0.6 }), fz = bz + T / 2 - 0.02;
  at(box(win.w + 0.08, 0.05, 0.06, fm, 0.01), win.x, win.y + win.h / 2, fz, group);
  at(box(win.w + 0.08, 0.05, 0.06, fm, 0.01), win.x, win.y - win.h / 2, fz, group);
  at(box(0.05, win.h, 0.06, fm, 0.01), win.x - win.w / 2, win.y, fz, group);
  at(box(0.05, win.h, 0.06, fm, 0.01), win.x + win.w / 2, win.y, fz, group);
  at(box(0.03, win.h, 0.04, fm, 0.005), win.x, win.y, fz, group);
  at(box(win.w + 0.2, 0.04, 0.16, fm, 0.01), win.x, win.y - win.h / 2 - 0.02, fz + 0.06, group);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(win.w, win.h), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.08, roughness: 0.05, metalness: 0 }));
  at(glass, win.x, win.y, bz, group);
  // skirting
  const sk = mat(opts.trimColor ?? 0xe6dfd2, { roughness: 0.6 });
  at(box(W, 0.08, 0.02, sk, 0.004), 0, 0.04, -D / 2 + 0.01, group);
  at(box(0.02, 0.08, D, sk, 0.004), -W / 2 + 0.01, 0.04, 0, group);
  group.traverse(m => { if (m.isMesh && m !== skyMesh && m !== glass) m.receiveShadow = m.castShadow = true; });
  return { group, floor, sky, glass, size: { w: W, d: D, h: Hh }, window: win, backZ: -D / 2, leftX: -W / 2 };
}

/**
 * A smartphone lying on a surface (Poly Haven has none). Its screen is a canvas showing a scrolling feed.
 * opts: pos [x,y,z] (y = surface height), rotY, parent. Returns { group, screen, set({ scroll, on }) }
 * scroll: feed offset in "posts" (keep increasing it to keep scrolling); on: 0..1 screen brightness.
 */
export function phone(S, opts = {}) {
  const g = new THREE.Group(); const [x, y, z] = opts.pos ?? [0, 0, 0];
  at(g, x, y, z, opts.parent ?? S.scene); g.rotation.y = opts.rotY ?? 0;
  const W = 0.072, L = 0.152, Hh = 0.008;
  const body = box(W, Hh, L, mat(0x1b1c22, { roughness: 0.35, metalness: 0.6 }), 0.006);
  body.position.y = Hh / 2; body.castShadow = body.receiveShadow = true; g.add(body);
  const r = rng(3), posts = Array.from({ length: 40 }, () => ({ h: 0.5 + r() * 0.9, hue: Math.floor(r() * 360), lines: 1 + Math.floor(r() * 3) }));
  const tex = canvasTex(360, 760, (c, w, h, scroll = 0) => {
    c.fillStyle = '#101114'; c.fillRect(0, 0, w, h);
    const unit = 300; let y0 = 60 - (scroll * unit) % (unit * 40);
    for (let i = 0; y0 < h; i = (i + 1) % 40) {
      const p = posts[i], ph = unit * p.h * 0.7;
      if (y0 + ph + 90 > 0) {
        c.fillStyle = `hsl(${p.hue},45%,62%)`; c.fillRect(18, y0, w - 36, ph);
        c.fillStyle = '#d9dbe3'; for (let j = 0; j < p.lines; j++) c.fillRect(18, y0 + ph + 16 + j * 22, (w - 36) * (0.9 - j * 0.25), 10);
      }
      y0 += ph + 40 + p.lines * 22;
    }
    c.fillStyle = '#101114'; c.fillRect(0, 0, w, 44); c.fillStyle = '#e8e8ee'; c.font = '600 22px "PingFang SC"'; c.fillText('1:12', 22, 30);
  });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.92, L * 0.94), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  screen.rotation.x = -Math.PI / 2; screen.position.y = Hh + 0.0005; g.add(screen);
  const glow = new THREE.PointLight(0xbfd2ff, 0, 0.9, 2); glow.position.y = 0.12; g.add(glow);
  return {
    group: g, screen,
    set({ scroll = 0, on = 1 } = {}) {
      redraw(tex, Math.round(scroll * 60) / 60);
      screen.material.color.setScalar(on * 0.85); screen.visible = on > 0.01; glow.intensity = on * 0.05;
    },
  };
}

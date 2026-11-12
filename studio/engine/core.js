// Math, easing and small geometry helpers shared by the engine and episodes.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const ss = x => { x = clamp(x); return x * x * (3 - 2 * x); };
export const ease = x => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
export const easeOutBack = x => { x = clamp(x); const c1 = 1.7, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
/** smooth 0→1 as t goes a→b */
export const k = (t, a, b) => ss((t - a) / (b - a));
/** eased (cubic in-out) 0→1 as t goes a→b */
export const ke = (t, a, b) => ease((t - a) / (b - a));
/** 0→1→0 bump between a and b */
export const bump = (t, a, b) => Math.sin(Math.PI * clamp((t - a) / (b - a)));
export const lerp = (a, b, x) => a + (b - a) * x;
export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const dirOf = (x, y, z) => V(x, y, z).normalize();
/** deterministic PRNG (same sequence every render) */
export function rng(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

export const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...o });
export function box(w, h, d, m, r = 0.02) {
  const g = r > 0 ? new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2)) : new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(g, m); mesh.castShadow = mesh.receiveShadow = true; return mesh;
}
export function cyl(rt, rb, h, m, seg = 32) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m); mesh.castShadow = mesh.receiveShadow = true; return mesh;
}
export function sph(r, m, ws = 24, hs = 16) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, ws, hs), m); mesh.castShadow = mesh.receiveShadow = true; return mesh;
}
/** position obj and add it to parent; returns obj */
export function at(obj, x, y, z, parent) { obj.position.set(x, y, z); parent.add(obj); return obj; }
export const wpos = o => { const v = new THREE.Vector3(); o.updateWorldMatrix(true, false); o.getWorldPosition(v); return v; };

/** Canvas-backed texture. draw(ctx, w, h, ...args); call redraw(tex, ...args) each frame — it only repaints when args change. */
export function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d'); draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  t.userData = { canvas: c, ctx, draw, key: '' };
  return t;
}
export function redraw(tex, ...args) {
  const key = JSON.stringify(args); if (tex.userData.key === key) return; tex.userData.key = key;
  const { ctx, canvas, draw } = tex.userData; draw(ctx, canvas.width, canvas.height, ...args); tex.needsUpdate = true;
}

/** Catmull-Rom point between p1 and p2 */
export function cr(p0, p1, p2, p3, u) {
  const u2 = u * u, u3 = u2 * u;
  return V()
    .addScaledVector(p0, -0.5 * u3 + u2 - 0.5 * u).addScaledVector(p1, 1.5 * u3 - 2.5 * u2 + 1)
    .addScaledVector(p2, -1.5 * u3 + 2 * u2 + 0.5 * u).addScaledVector(p3, 0.5 * u3 - 0.5 * u2);
}

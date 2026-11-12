// Abstract-structure kit: the "inside the mind" visuals that contrast with the realistic rooms.
import * as THREE from 'three';
import { box, mat, at, rng, clamp, lerp, V, canvasTex } from './core.js';

export const PASTEL = [0xf3a37a, 0xf6d36b, 0x9fd3b8, 0x8fb4ff, 0xc9a3d4, 0xff8fa3];

/** dark round stage with a faint grid, floating in the void at height y */
export function voidStage(S, { y = -8, radius = 3.2 } = {}) {
  const g = new THREE.Group(); g.position.y = y; S.scene.add(g);
  const p = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.18, 64), mat(0x1c1b33, { roughness: 0.95 }));
  p.receiveShadow = true; at(p, 0, -0.09, 0, g);
  const grid = new THREE.GridHelper(radius * 2, Math.round(radius * 4), 0x4b4878, 0x2f2d52); grid.position.y = 0.004; g.add(grid);
  grid.material.transparent = true; grid.material.opacity = 0.6;
  const spot = new THREE.SpotLight(0xffe2b8, 0, 20, 0.45, 0.7, 1.2);
  spot.position.set(1, y + 7, 1.6); spot.castShadow = true; spot.shadow.mapSize.set(2048, 2048); spot.shadow.bias = -0.0006;
  spot.target.position.set(0, y, 0); S.scene.add(spot, spot.target);
  return { group: g, grid, spot, y, center: V(0, y, 0), /** 0..1 */ setLight(v, max = 40) { spot.intensity = v * max; } };
}

/**
 * Glass cube with an optional page inside. size in metres.
 * .faces.start / .faces.end are glowing side panels (opacity 0 by default); .open(v) swings the start face open (0..1)
 */
export function glassCube(S, size = 1.2, { page = true, parent } = {}) {
  const g = new THREE.Group(); (parent ?? S.scene).add(g);
  const body = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), new THREE.MeshStandardMaterial({ color: 0xbcd0ff, transparent: true, opacity: 0.2, roughness: 0.1, metalness: 0.1, depthWrite: false, emissive: 0x000000 }));
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(size, size, size)), new THREE.LineBasicMaterial({ color: 0xdfe8ff, transparent: true, opacity: 0.9 }));
  g.add(body, edges);
  let pageMesh = null, pageTex = null;
  if (page) {
    pageTex = canvasTex(256, 340, (c, w, h, mess = 0) => {
      c.fillStyle = '#fbf8f2'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#c9cfdc'; for (let i = 0; i < 9; i++) c.fillRect(28, 40 + i * 30, w - 56 - (i % 3) * 30, 9);
      if (mess > 0) {
        const r = rng(5); c.strokeStyle = `rgba(214,73,63,${mess})`; c.lineWidth = 5; c.lineCap = 'round';
        for (let i = 0; i < 6; i++) { c.beginPath(); let x = 30 + r() * 180, y = 40 + r() * 260; c.moveTo(x, y); for (let j = 0; j < 5; j++) { x += (r() - 0.5) * 80; y += (r() - 0.5) * 50; c.lineTo(x, y); } c.stroke(); }
      }
    });
    pageMesh = new THREE.Mesh(new THREE.PlaneGeometry(size * 0.42, size * 0.56), new THREE.MeshBasicMaterial({ map: pageTex, side: THREE.DoubleSide, toneMapped: false }));
    pageMesh.material.color.setScalar(0.9); g.add(pageMesh);
  }
  const panel = color => new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, side: THREE.DoubleSide, toneMapped: false, depthWrite: false }));
  const hinge = new THREE.Group(); hinge.position.set(-size / 2, -size / 2, 0);
  const start = panel(0x7fe0c8); start.rotation.y = Math.PI / 2; start.position.y = size / 2; hinge.add(start);
  const end = panel(0xffc46b); end.rotation.y = Math.PI / 2; end.position.x = size / 2;
  g.add(hinge, end);
  return {
    group: g, body, edges, page: pageMesh, pageTex, faces: { start, end },
    open(v) { hinge.rotation.z = v * 1.9; },
    glow(v) { body.material.emissive.setRGB(0.1 * v, 0.12 * v, 0.22 * v); },
    tint(v) { edges.material.color.set(0xdfe8ff).lerp(new THREE.Color(0xff8a7a), v); },
  };
}

/** n×n grid of toy blocks (centre `hole` cells left empty). update(t, {rain, chaos}) animates them. */
export function blockGrid(S, { parent, n = 7, hole = 1, size = 0.3, gap = 0.62, seed = 11 } = {}) {
  const r = rng(seed); const blocks = []; let idx = 0;
  const h = (n - 1) / 2;
  for (let i = -h; i <= h; i++) for (let j = -h; j <= h; j++) {
    if (Math.abs(i) <= hole && Math.abs(j) <= hole && hole >= 0) continue;
    const b = box(size, size, size, mat(PASTEL[idx++ % PASTEL.length], { roughness: 0.6 }), size * 0.12);
    b.userData = { home: V(i * gap, size / 2, j * gap), delay: r() * 1.4, spin: V(r() - 0.5, r() - 0.5, r() - 0.5), jump: r(), drift: V(r() - 0.5, 0, r() - 0.5) };
    (parent ?? S.scene).add(b); blocks.push(b);
  }
  return {
    blocks,
    /** rain: time they start falling (null = already in place); chaos 0..1 scatters them; gone 0..1 shrinks them */
    update(t, { rain = null, chaos = 0, gone = 0 } = {}) {
      blocks.forEach((b, i) => {
        const u = b.userData, p = u.home.clone();
        let fall = 1, ry = 0;
        if (rain !== null) {
          const tl = t - rain - u.delay; fall = clamp(tl / 0.75);
          p.y = fall < 1 ? lerp(6, size / 2, fall * fall) : size / 2 + Math.max(0, Math.sin((tl - 0.75) * 14) * Math.exp(-(tl - 0.75) * 6)) * size * 0.5;
          ry = (1 - fall) * u.spin.y * 6; b.visible = tl > -0.1;
        }
        let rx = 0, rz = 0;
        if (chaos > 0) {
          const ph = t * (2 + u.jump * 2);
          p.x += u.drift.x * 1.1 * chaos + Math.sin(ph) * 0.06 * chaos; p.z += u.drift.z * 1.1 * chaos;
          p.y += Math.abs(Math.sin(ph * 1.3 + i)) * 0.5 * chaos;
          rx = u.spin.x * 5 * chaos; ry += u.spin.y * 5 * chaos; rz = u.spin.z * 5 * chaos;
        }
        b.position.copy(p); b.rotation.set(rx, ry, rz);
        b.scale.setScalar(Math.max(0.001, 1 - gone));
        if (gone >= 1) b.visible = false;
      });
    },
  };
}

/** A glowing tube along points; show(a, b) reveals the arc-length range [a, b] (0..1). */
export function ribbon(S, points, { radius = 0.04, color = 0xffc98a, emissive = 0xff9a4a, segments = 1600 } = {}) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  const RAD = 10; const geo = new THREE.TubeGeometry(curve, segments, radius, RAD, false);
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: 1.6, roughness: 0.4, transparent: true }));
  S.scene.add(mesh);
  const at = u => curve.getPointAt(clamp(u));
  /** arc-length parameter of the curve point nearest to v */
  const nearest = v => { let best = 1e9, bu = 0; for (let i = 0; i <= 4000; i++) { const u = i / 4000, d = at(u).distanceTo(v); if (d < best) { best = d; bu = u; } } return bu; };
  return {
    mesh, curve, at, nearest,
    show(a, b) {
      a = clamp(a); b = clamp(b); const i0 = Math.floor(a * segments), i1 = Math.ceil(b * segments);
      geo.setDrawRange(i0 * RAD * 6, Math.max(0, i1 - i0) * RAD * 6); mesh.visible = i1 > i0 + 1;
    },
    opacity(v) { mesh.material.opacity = v; if (v <= 0.001) mesh.visible = false; },
  };
}

/** small glowing bead with its own light */
export function bead(S, { radius = 0.08, color = 0xfff0d0 } = {}) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(radius, 20, 14), new THREE.MeshBasicMaterial({ color, toneMapped: false }));
  m.material.color.multiplyScalar(2.2); S.scene.add(m); m.visible = false;
  const light = new THREE.PointLight(0xffc98a, 0, 4, 1.5); S.scene.add(light);
  return { mesh: m, light, set(pos, visible = true, intensity = 3) { m.visible = visible; if (pos) m.position.copy(pos); light.position.copy(m.position); light.intensity = visible ? intensity : 0; } };
}

/** star field (visible in void/space moods); opacity driven by the mood system */
export function stars(S, { count = 900, radius = 70 } = {}) {
  const r = rng(21); const a = [];
  for (let i = 0; i < count; i++) { const th = r() * Math.PI * 2, ph = Math.acos(2 * r() - 1), rad = radius + r() * radius * 0.7; a.push(rad * Math.sin(ph) * Math.cos(th), rad * Math.cos(ph) * 0.8 + 5, rad * Math.sin(ph) * Math.sin(th)); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(a, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xcfd6ff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
  S.scene.add(p); return p;
}

// 001-exam-dream · 考试的梦
// Look: flat matte colours, no photo textures — lavender walls, pink floors, cream desks, soft light; a dreamy, bright toy world.
// Real side: your bedroom, seen from your own pillow (night, then a pink morning). Dream side: an empty classroom that
// hangs in the haze below the bedroom — the camera sinks into it, surfaces when you wake, sinks again, and finally rises into dawn.
// The book part visits little cut-away rooms floating in the haze (Freud's study, two bedrooms, an old exam hall…), then
// tonight's bedroom, the rooms of tomorrow, and a line of light joining that old exam, tonight and tomorrow.
import { shot, pov, MOODS } from '/engine/studio.js';

// ---- palette ----
const C = {
  wall: 0xd9c9f4, floor: 0xf4cfc6, trim: 0xfff4ea,
  desk: 0xfff0d2, chair: 0x8d82d6, bed: 0xf1b7a6, stand: 0xd9a0c4, alarm: 0xffc86b,
  linen: 0xa9b8f2, linen2: 0xffffff, ink: 0x3a2a68, board: 0xb9a4e6,
};
Object.assign(MOODS, {
  night: { bg: 0x34346e, sky: 0xb8b4ff, ground: 0x7a5a90, hemi: 1.4, key: 0xb4c4ff, keyI: 1.2, fill: 0.6, env: 0.2, exposure: 1.05, stars: 0.45, dawn: 0 },
  dream: { bg: 0xc9b6ee, sky: 0xf6e9ff, ground: 0xf0b8c0, hemi: 1.05, key: 0xffc9b8, keyI: 0.3, fill: 0.6, env: 0.25, exposure: 1.0, stars: 0.15, dawn: 0 },
  void: { bg: 0x7f72bc, sky: 0xd8ccff, ground: 0xa888b8, hemi: 1.2, key: 0xffc9b8, keyI: 0.4, fill: 0.4, env: 0.2, exposure: 1.0, stars: 0.4, dawn: 0 },
  // waking up: pink-orange morning light through the window
  morning: { bg: 0xf2c4cc, sky: 0xffe4d6, ground: 0xf6b8a8, hemi: 1.3, key: 0xffc49a, keyI: 2.0, fill: 0.7, env: 0.25, exposure: 1.08, stars: 0, dawn: 1 },
});

export default async function build(S) {
  const { THREE, T, E, k, ke, bump, V, box, mat, cyl, sph, at, canvasTex, redraw, rng, clamp, ease, easeOutBack } = S;
  const DEBUG = new URLSearchParams(location.search).has('debug');
  const matte = (color, rough = 0.92) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0 });
  /** give a loaded prop one flat matte colour (each Poly Haven prop here has a single material) */
  const flat = (obj, color) => { const m = matte(color); obj.traverse(o => { if (o.isMesh) o.material = m; }); return obj; };

  await S.hdri('blocky_photo_studio');
  S.look({
    scrim: 'linear-gradient(to bottom, rgba(58,42,104,0) 0%, rgba(58,42,104,.66) 38%, rgba(58,42,104,.84) 100%)',
    vignette: 'radial-gradient(ellipse 85% 65% at 50% 42%, rgba(0,0,0,0) 60%, rgba(60,30,110,0.28) 100%)',
    subColor: '#fff6ea', subShadow: '0 2px 20px rgba(40,20,80,.5)', smallColor: '#ddd0f4',
    grain: 0, fade: '#2e2458', flash: '#fff4ec', rule: '#ffc9a0',
  });

  // =================== the bedroom (real) ===================
  const room = S.room({
    w: 4.2, d: 4.2, h: 2.8, window: { x: 0.35, y: 1.5, w: 1.2, h: 1.3 },
    floorColor: C.floor, wallColor: C.wall, wallColor2: 0xcfbdf0, trimColor: C.trim,
    skyPalette: { night: ['#2c2b6c', '#4b4596', '#7d6ab4'], dawn: ['#b8a6f0', '#ffbfb4', '#ffe2bc'], moonShade: ['#4b4596', '#d8c0ec'], towers: ['#3d3778', '#d79cb4'], lit: '255,220,170' },
  });
  room.glass.material.roughness = 0.7; // window glass: no hard specular dot from the morning lights
  // the model's headboard faces -z: turn it round so you sit against it and look down the bed at the window
  const bed = flat(await S.prop('old_bed_frame', { pos: [-1.05, 0, 0.85], rotY: Math.PI }), C.bed);
  const bs = bed.userData.size;
  bed.position.x = room.leftX + bs.x / 2 + 0.05;
  const linen = matte(C.linen), linen2 = matte(C.linen2);
  const bx = bed.position.x, bz = bed.position.z, bw = Math.min(bs.x, 1.5) - 0.06, bl = bs.z - 0.2;
  // the model brings its own mattress: find its top
  const bedTop = (() => { bed.updateWorldMatrix(true, true); const hit = new THREE.Raycaster(V(bx, 3, bz), V(0, -1, 0)).intersectObject(bed, true)[0]; return hit ? hit.point.y : 0.5; })();
  if (DEBUG) console.log('bedTop', bedTop);
  const headZ = bz + bl / 2;
  at(box(bw + 0.06, 0.1, bl * 0.74, linen, 0.05), bx, bedTop + 0.05, bz - bl * 0.12, S.scene);
  // the duvet's turned-down edge, where you pushed it off
  at(box(bw + 0.08, 0.07, 0.22, linen2, 0.03), bx, bedTop + 0.11, bz - bl * 0.12 + bl * 0.37 - 0.08, S.scene);
  const pillow = at(box(0.6, 0.15, 0.38, linen2, 0.07), bx, bedTop + 0.12, headZ - 0.22, S.scene); pillow.rotation.x = 0.55;
  const stand = flat(await S.prop('ClassicNightstand_01', { pos: [bx + bw / 2 + 0.38, 0, headZ - 0.35], rotY: -Math.PI / 2 }), C.stand);
  const standTop = S.topOf(stand);
  const phone = S.phone({ pos: [stand.position.x + 0.03, standTop, stand.position.z + 0.12], rotY: 0.4 });
  phone.group.children[0].material = matte(0x4a3c86, 0.6);

  // the alarm clock: our own, so its face can be read from the pillow and its hands can move
  const bedEye = V(bx + 0.05, bedTop + 0.62, headZ - 0.42);
  const alarmFace = canvasTex(256, 256, (g, w, h, mins = 422) => {
    g.fillStyle = '#fff7ec'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#6b5aa8'; g.lineCap = 'round';
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, r1 = 108, r0 = i % 3 ? 96 : 84; g.lineWidth = i % 3 ? 5 : 9; g.beginPath(); g.moveTo(128 + Math.sin(a) * r0, 128 - Math.cos(a) * r0); g.lineTo(128 + Math.sin(a) * r1, 128 - Math.cos(a) * r1); g.stroke(); }
    const hand = (a, len, wid, col) => { g.strokeStyle = col; g.lineWidth = wid; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + Math.sin(a) * len, 128 - Math.cos(a) * len); g.stroke(); };
    hand(((mins / 60) % 12) / 12 * Math.PI * 2, 58, 11, '#3a2a68');
    hand((mins % 60) / 60 * Math.PI * 2, 86, 7, '#3a2a68');
    g.fillStyle = '#e8708a'; g.beginPath(); g.arc(128, 128, 9, 0, 7); g.fill();
  });
  const alarm = new THREE.Group(); at(alarm, stand.position.x - 0.04, standTop, stand.position.z - 0.08, S.scene);
  {
    const R = 0.062, D = 0.045, body = matte(C.alarm);
    const can = cyl(R, R, D, body, 40); can.rotation.x = Math.PI / 2; can.position.y = R + 0.012; alarm.add(can);
    const face = new THREE.Mesh(new THREE.CircleGeometry(R * 0.86, 40), new THREE.MeshStandardMaterial({ map: alarmFace, roughness: 0.8 }));
    face.position.set(0, R + 0.012, D / 2 + 0.001); alarm.add(face);
    for (const s of [-1, 1]) {
      const bell = sph(0.026, body, 20, 12); bell.position.set(s * 0.04, 2 * R + 0.012, 0); bell.scale.y = 0.7; alarm.add(bell);
      const foot = sph(0.011, matte(C.ink, 0.8), 12, 8); foot.position.set(s * 0.035, 0.008, 0); alarm.add(foot);
    }
    const knob = sph(0.009, matte(C.ink, 0.8), 12, 8); knob.position.set(0, 2 * R + 0.022, 0); alarm.add(knob);
    alarm.lookAt(V(bedEye.x, standTop, bedEye.z)); // face the pillow
  }
  // morning sun: a warm beam through the window that lays a bright patch across the bed and floor
  const sun = new THREE.SpotLight(0xffb48a, 0, 12, 0.42, 0.5, 1.0);
  sun.position.set(room.window.x + 0.9, 3.4, room.backZ - 2.6); sun.target.position.set(bx + 0.3, bedTop, bz - 0.2);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.02;
  S.scene.add(sun, sun.target);
  const spill = new THREE.PointLight(0xffb898, 0, 4.5, 1.6); spill.position.set(room.window.x + 0.5, room.window.y + 0.9, room.backZ + 1.3); S.scene.add(spill); // morning light spilling off the window
  const bedLamp = S.lamp(V(stand.position.x + 0.35, 1.5, stand.position.z + 0.2), V(bx, bedTop, bz - 0.3), { intensity: 0.5, color: 0xb6b0ff, angle: 1.0 }); // street light through the curtains

  // =================== the classroom (dream), hanging in the haze below ===================
  const CY = -14; // its floor
  const cls = new THREE.Group(); cls.position.set(0, CY, 0); S.scene.add(cls);
  const CW = 6.4, CD = 6.2, CH = 3.2;
  const floorM = matte(C.floor), wallM = matte(C.wall), wallM2 = matte(0xcfbdf0), trimM = matte(C.trim, 0.7);
  const floor0 = at(box(CW, 0.2, CD, floorM, 0.01), 0, -0.1, 0, cls);
  at(box(CW, CH, 0.12, wallM, 0.005), 0, CH / 2, -CD / 2 - 0.06, cls);
  // left wall with three tall windows of soft, overexposed light
  const winL = [-1.7, 0, 1.7];
  {
    const x = -CW / 2 - 0.06, wy0 = 0.9, wy1 = 2.75, ww = 1.1;
    const segs = []; let z0 = -CD / 2;
    for (const wz of winL) { segs.push([z0, wz - ww / 2]); z0 = wz + ww / 2; } segs.push([z0, CD / 2]);
    for (const [a, b] of segs) at(box(0.12, CH, b - a, wallM2, 0), x, CH / 2, (a + b) / 2, cls);
    for (const wz of winL) {
      at(box(0.12, wy0, ww, wallM2, 0), x, wy0 / 2, wz, cls);
      at(box(0.12, CH - wy1, ww, wallM2, 0), x, (CH + wy1) / 2, wz, cls);
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(ww, wy1 - wy0), new THREE.MeshBasicMaterial({ color: 0xfff0e2, toneMapped: false }));
      glow.rotation.y = Math.PI / 2; at(glow, x - 0.03, (wy0 + wy1) / 2, wz, cls); glow.material.color.multiplyScalar(1.1);
      at(box(0.06, wy1 - wy0, 0.04, trimM, 0.005), x + 0.04, (wy0 + wy1) / 2, wz, cls);
      at(box(0.06, 0.04, ww, trimM, 0.005), x + 0.04, (wy0 + wy1) / 2, wz, cls);
    }
  }
  // the board, full of something you were supposed to learn
  const board = canvasTex(1600, 600, (g, w, h) => {
    g.fillStyle = '#4a4688'; g.fillRect(0, 0, w, h);
    const r = rng(41); g.strokeStyle = 'rgba(255,240,232,0.6)'; g.lineCap = 'round';
    g.filter = 'blur(2.2px)';
    for (let row = 0; row < 6; row++) {
      let x = 60 + r() * 60; const y = 80 + row * 85;
      while (x < w - 120 - r() * 300) {
        g.lineWidth = 3 + r() * 2; g.beginPath(); let px = x, py = y + (r() - 0.5) * 10; g.moveTo(px, py);
        const n = 3 + Math.floor(r() * 6); for (let i = 0; i < n; i++) { px += 8 + r() * 14; py = y + (r() - 0.5) * 34; g.lineTo(px, py); }
        g.stroke(); x = px + 18 + r() * 40;
      }
    }
    g.filter = 'blur(6px)'; g.fillStyle = 'rgba(255,230,240,0.07)'; for (let i = 0; i < 12; i++) g.fillRect(r() * w, r() * h, 200 + r() * 300, 40 + r() * 80);
    g.filter = 'none';
  });
  at(new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.35), new THREE.MeshStandardMaterial({ map: board, roughness: 0.95 })), 0.2, 1.65, -CD / 2 + 0.01, cls);
  at(box(3.8, 0.08, 0.06, matte(C.board), 0.01), 0.2, 1.65 + 0.71, -CD / 2 + 0.03, cls);
  at(box(3.8, 0.05, 0.1, matte(C.board), 0.01), 0.2, 1.65 - 0.71, -CD / 2 + 0.05, cls);

  // the wall clock that runs too fast: our own, so its hands can spin
  const clockG = new THREE.Group(); at(clockG, 1.25, 2.72, -CD / 2 + 0.04, cls);
  const face = canvasTex(256, 256, (g, w) => {
    g.fillStyle = '#fff7ec'; g.beginPath(); g.arc(w / 2, w / 2, w / 2 - 2, 0, 7); g.fill();
    g.strokeStyle = '#5a4a96'; for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2, r1 = w / 2 - 10, r0 = r1 - (i % 5 ? 6 : 18); g.lineWidth = i % 5 ? 2 : 6; g.beginPath(); g.moveTo(w / 2 + Math.sin(a) * r0, w / 2 - Math.cos(a) * r0); g.lineTo(w / 2 + Math.sin(a) * r1, w / 2 - Math.cos(a) * r1); g.stroke(); }
  });
  clockG.add(new THREE.Mesh(new THREE.CircleGeometry(0.2, 48), new THREE.MeshStandardMaterial({ map: face, roughness: 0.8 })));
  clockG.add(new THREE.Mesh(new THREE.TorusGeometry(0.205, 0.022, 12, 48), matte(C.chair)));
  const hand = (len, wid, z) => { const p = new THREE.Group(); const m = box(wid, len, 0.006, matte(C.ink, 0.8), 0); m.position.y = len / 2 - 0.02; p.add(m); p.position.z = z; clockG.add(p); return p; };
  const hourH = hand(0.11, 0.014, 0.008), minH = hand(0.17, 0.009, 0.014);
  const secH = (() => { const p = new THREE.Group(); const m = box(0.005, 0.19, 0.004, matte(0xe8708a, 0.8), 0); m.position.y = 0.075; p.add(m); p.position.z = 0.02; clockG.add(p); p.visible = false; return p; })(); // only in the later visit

  // rows of empty desks; yours is in the back row
  const deskSrc = flat(await S.prop('SchoolDesk_01', { pos: [0, 0, 0], parent: cls }), C.desk); cls.remove(deskSrc);
  const chairSrc = flat(await S.prop('SchoolChair_01', { pos: [0, 0, 0], parent: cls }), C.chair); cls.remove(chairSrc);
  const ds = deskSrc.userData.size;
  const cols = [-1.55, 0, 1.55], rows = [-1.3, 0.05, 1.4, 2.75];
  const r = rng(5);
  let myDesk = null;
  for (const [ri, z] of rows.entries()) for (const [ci, x] of cols.entries()) {
    const d = deskSrc.clone(); d.position.set(x + 0.2 + (r() - 0.5) * 0.06, 0, z); d.rotation.y = (r() - 0.5) * 0.04; cls.add(d);
    const c = chairSrc.clone(); c.position.set(x + 0.2 + (r() - 0.5) * 0.08, 0, z + ds.z / 2 + 0.28); c.rotation.y = Math.PI + (r() - 0.5) * 0.15; cls.add(c);
    if (ri === rows.length - 1 && ci === 1) { myDesk = d; c.position.z += 0.12; }
  }
  const deskTop = ds.y; // local, desks stand on the floor
  const myX = myDesk.position.x, myZ = myDesk.position.z;
  // your desk gets its own (identical) materials, so it alone can dissolve later when the camera dives through it
  const myDeskMats = []; myDesk.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); myDeskMats.push(o.material); } });
  // the floor again, in pieces with a trapdoor under your desk (swapped in only for the later visit)
  const floorB = new THREE.Group(); cls.add(floorB); floorB.visible = false;
  const hx0 = myX - 0.45, hx1 = myX + 0.45, hz0 = myZ - 0.5;
  at(box(hx0 + CW / 2, 0.2, CD, floorM, 0), (-CW / 2 + hx0) / 2, -0.1, 0, floorB);
  at(box(CW / 2 - hx1, 0.2, CD, floorM, 0), (CW / 2 + hx1) / 2, -0.1, 0, floorB);
  at(box(hx1 - hx0, 0.2, hz0 + CD / 2, floorM, 0), myX, -0.1, (-CD / 2 + hz0) / 2, floorB);
  const plug = at(box(hx1 - hx0, 0.2, CD / 2 - hz0, floorM, 0), myX, -0.1, (CD / 2 + hz0) / 2, floorB);
  floorB.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = true; } });

  // the exam paper: lines you cannot read
  const paperTex = canvasTex(600, 840, (g, w, h, scratch = 0) => {
    g.fillStyle = '#fbf3e6'; g.fillRect(0, 0, w, h);
    const rr = rng(9); g.filter = 'blur(1.6px)';
    g.fillStyle = '#4e4280'; g.fillRect(150, 50, 300, 22); g.fillRect(210, 88, 180, 12);
    for (let q = 0; q < 6; q++) {
      const y = 150 + q * 110; g.fillStyle = '#3a2f66'; g.fillRect(40, y, 26, 18);
      for (let l = 0; l < 3; l++) { g.fillStyle = `rgba(62,50,108,${0.6 + rr() * 0.3})`; let x = 84; while (x < w - 60 - rr() * 80) { const ww = 10 + rr() * 38; g.fillRect(x, y + l * 26 + 2, ww, 12); x += ww + 6 + rr() * 6; } }
    }
    g.filter = 'none';
    g.strokeStyle = '#eadcd2'; g.lineWidth = 1; for (let y = 140; y < h - 20; y += 26) { g.beginPath(); g.moveTo(30, y + 22); g.lineTo(w - 30, y + 22); g.stroke(); }
    if (scratch > 0) { // the pen does not write: faint dents and a stubborn scribble
      const sr = rng(3); g.strokeStyle = 'rgba(120,104,160,0.4)'; g.lineWidth = 2.5; g.lineCap = 'round';
      const n = Math.floor(scratch * 14);
      for (let i = 0; i < n; i++) { g.beginPath(); let x = 120 + sr() * 60, y = 230 + sr() * 30; g.moveTo(x, y); for (let j = 0; j < 6; j++) { x += 12 + sr() * 10; y += (sr() - 0.5) * 30; g.lineTo(x, y); } g.stroke(); }
    }
  });
  const PW = 0.3, PH = 0.42;
  // the map is near-white: the material colour holds it back so the close-up does not blow out
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), new THREE.MeshStandardMaterial({ map: paperTex, roughness: 0.95, color: 0xd6cbd0 }));
  paper.rotation.x = -Math.PI / 2; paper.rotation.z = 0.06; at(paper, myX - 0.02, deskTop + 0.003, myZ + 0.02, cls); paper.receiveShadow = true;
  const pen = new THREE.Group(); at(pen, myX + 0.15, deskTop + 0.008, myZ + 0.06, cls);
  { const body = cyl(0.0055, 0.0055, 0.14, matte(0x6a5cc8, 0.6), 16); body.rotation.z = Math.PI / 2; pen.add(body);
    const tip = cyl(0.0055, 0.0008, 0.02, matte(0xe8e0f6, 0.6), 16); tip.rotation.z = Math.PI / 2; tip.position.x = -0.08; pen.add(tip);
    const cap = cyl(0.006, 0.006, 0.03, matte(C.ink, 0.6), 16); cap.rotation.z = Math.PI / 2; cap.position.x = 0.07; pen.add(cap); }
  pen.rotation.y = 0.5;

  // soft peach top light for the dream, with its own shadows (the main key light's shadow camera covers only the bedroom)
  const dreamLight = new THREE.DirectionalLight(0xffc9b8, 0); dreamLight.position.set(-6, CY + 6, 1.5); dreamLight.target.position.set(0, CY, 0);
  dreamLight.castShadow = true; dreamLight.shadow.mapSize.set(2048, 2048); Object.assign(dreamLight.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 20 });
  dreamLight.shadow.bias = -0.0004; dreamLight.shadow.normalBias = 0.02;
  S.scene.add(dreamLight, dreamLight.target);
  const deskLight = new THREE.PointLight(0xffe6f0, 0, 3, 2); deskLight.position.set(myX - 0.3, CY + 1.9, myZ - 0.2); S.scene.add(deskLight);
  // dust in the window light
  const dust = (() => {
    const n = 260, a = new Float32Array(n * 3), rr = rng(77);
    for (let i = 0; i < n; i++) { a[i * 3] = -CW / 2 + rr() * 3; a[i * 3 + 1] = rr() * CH; a[i * 3 + 2] = -CD / 2 + rr() * CD; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(a, 3));
    const p = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 0.012, transparent: true, opacity: 0.6, depthWrite: false }));
    cls.add(p); return p;
  })();

  // teacher's desk under the board, with chalk on the tray
  at(box(1.3, 0.78, 0.6, matte(C.board), 0.02), -1.3, 0.39, -CD / 2 + 0.9, cls);
  at(box(1.4, 0.05, 0.68, matte(C.desk), 0.01), -1.3, 0.8, -CD / 2 + 0.9, cls);
  for (const [i, c] of [0xffffff, 0xffc9d6, 0xfff0b0].entries()) { const ch = cyl(0.012, 0.012, 0.09, matte(c), 10); ch.rotation.z = Math.PI / 2; at(ch, -0.6 + i * 0.16, 1.65 - 0.71 + 0.04, -CD / 2 + 0.09, cls); }

  // =================== shared helpers for the dream sets ===================
  const MC = new Map(); const mm = (c, o) => { const key = c + JSON.stringify(o ?? {}); if (!MC.has(key)) MC.set(key, new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, metalness: 0, ...o })); return MC.get(key); };
  const B = (p, w, h, d, c, x, y, z, r = 0.012) => at(box(w, h, d, typeof c === 'number' ? mm(c) : c, r), x, y, z, p);
  const Cy = (p, rt, rb, h, c, x, y, z, seg = 24) => at(cyl(rt, rb, h, typeof c === 'number' ? mm(c) : c, seg), x, y, z, p);
  const Sp = (p, r0, c, x, y, z, seg = 20) => at(sph(r0, typeof c === 'number' ? mm(c) : c, seg, Math.max(8, seg * 0.6 | 0)), x, y, z, p);
  const glow = (c, k0 = 0.6) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: k0, roughness: 0.7 });
  const plane = (p, w, h, m, x, y, z, ry = 0, rx = 0) => { const o = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); o.rotation.set(rx, ry, 0); o.receiveShadow = true; return at(o, x, y, z, p); };
  const texMat = (tex, o = {}) => new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, ...o });
  const imgTex = async f => { const t = await new THREE.TextureLoader().loadAsync(new URL(f, import.meta.url).href); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
  const F = 0.02; // floor top inside a set
  const SETS = [];
  /** a floating cut-away room: thick rounded base, floor, back wall (−z) and left wall (−x); open towards +x / +z */
  function island(name, pos, { w, d, h = 2.4, floor = C.floor, wall = C.wall, wall2 = 0xcfbdf0, base = 0xfbe6e0, left = true, back = true, show = [0, 1e9] }) {
    const g = new THREE.Group(); g.position.copy(pos); g.name = name; S.scene.add(g);
    B(g, w + 0.36, 0.34, d + 0.36, base, 0.04, -0.17, 0.04, 0.08);
    B(g, w, 0.02, d, floor, 0, 0.01, 0, 0);
    if (back) { B(g, w + 0.14, h, 0.14, wall, -0.07, h / 2, -d / 2 - 0.07, 0); B(g, w, 0.09, 0.03, C.trim, 0, 0.045 + F, -d / 2 + 0.015, 0); }
    if (left) { B(g, 0.14, h, d, wall2, -w / 2 - 0.07, h / 2, 0, 0); B(g, 0.03, 0.09, d, C.trim, -w / 2 + 0.015, 0.045 + F, 0, 0); }
    const set = { g, w, d, h, show, p: (x, y, z) => g.localToWorld(V(x, y, z)) };
    SETS.push(set); return set;
  }
  /** clone a loaded prop into a set, recoloured */
  const SRC = {};
  for (const n of ['dining_chair_02']) { SRC[n] = await S.prop(n, { pos: [0, 0, 0] }); S.scene.remove(SRC[n]); }
  SRC.desk = deskSrc; SRC.chair = chairSrc;
  const put = (src, p, x, y, z, ry = 0, color, s = 1) => { const o = (SRC[src] ?? src).clone(); if (color != null) flat(o, color); o.position.set(x, y, z); o.rotation.y = ry; o.scale.setScalar(s); p.add(o); return o; };
  const chairH = SRC.dining_chair_02.userData.size; // 0.43 × 0.97 × 0.58, faces +z

  // canvases (no words: the frame is shared by both languages)
  const ruled = (seed, head = '#8d82d6') => canvasTex(300, 400, (g, w, h) => {
    g.fillStyle = '#fbf3e6'; g.fillRect(0, 0, w, h); const r0 = rng(seed);
    g.fillStyle = head; g.fillRect(70, 28, 160, 16); g.fillRect(100, 54, 100, 8);
    for (let y = 92; y < h - 24; y += 24) { g.fillStyle = 'rgba(90,80,140,.55)'; let x = 30; while (x < w - 40 - r0() * 60) { const ww = 8 + r0() * 30; g.fillRect(x, y, ww, 6); x += ww + 6; } }
  });
  const script = seed => canvasTex(300, 400, (g, w, h) => {
    g.fillStyle = '#f8eedc'; g.fillRect(0, 0, w, h); const r0 = rng(seed); g.strokeStyle = 'rgba(70,52,120,.7)'; g.lineWidth = 2.2; g.lineCap = 'round';
    for (let y = 40; y < h - 30; y += 22) { let x = 26 + r0() * 10; g.beginPath(); g.moveTo(x, y); while (x < w - 30 - r0() * 40) { x += 5 + r0() * 6; g.lineTo(x, y + (r0() - 0.5) * 9); } g.stroke(); }
  });
  const paperM = (tex, dim = 0xd8ccd0) => texMat(tex, { color: dim, side: THREE.DoubleSide });
  const crescent = (() => { const sh = new THREE.Shape(); sh.absarc(0, 0, 1, Math.PI / 2, Math.PI * 1.5, false); sh.absarc(0.5, 0, 1.118, 4.249, 2.034, true);
    const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.35, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.06, bevelSegments: 3, curveSegments: 24 }); geo.center(); return geo; })();
  const moon = (p, s, c = 0xffd98a) => { const o = new THREE.Mesh(crescent, glow(c, 0.5)); o.scale.setScalar(s); p.add(o); return o; };
  /** a puffy cloud of spheres, ~1 m across at s = 1 */
  const cloudM = new THREE.MeshStandardMaterial({ color: 0xfff6fb, emissive: 0xffe8f4, emissiveIntensity: 0.35, roughness: 1 });
  function cloud(p, s = 1) {
    const g = new THREE.Group(); p.add(g);
    for (const [x, y, z, r0] of [[0, 0, 0, 0.32], [-0.32, -0.06, 0.05, 0.24], [0.33, -0.05, 0, 0.26], [-0.12, 0.14, -0.08, 0.26], [0.16, 0.16, 0.04, 0.22], [-0.52, -0.12, 0, 0.16], [0.56, -0.12, 0.02, 0.17], [0, -0.12, 0.16, 0.24]]) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(r0, 24, 16), cloudM); m.position.set(x, y, z); m.scale.y = 0.82; g.add(m);
    }
    g.scale.setScalar(s); return g;
  }
  // a dream exam room in miniature (sits on a cloud)
  function miniExam(p, s) {
    const g = new THREE.Group(); p.add(g); g.scale.setScalar(s);
    B(g, 1.5, 0.04, 1.1, C.floor, 0, 0, 0, 0.01); B(g, 1.0, 0.45, 0.04, 0x4a4688, 0, 0.5, -0.5, 0);
    for (const x of [-0.45, 0.1]) for (const z of [-0.1, 0.35]) { put('desk', g, x + 0.15, 0.02, z, 0, null, 0.5); put('chair', g, x + 0.15, 0.02, z + 0.2, Math.PI, null, 0.5); }
    return g;
  }
  const picture = (p, w, h, m, x, y, z, frame = 0xe6b980, ry = 0) => { const g = new THREE.Group(); g.rotation.y = ry; at(g, x, y, z, p); B(g, w + 0.08, h + 0.08, 0.04, frame, 0, 0, 0, 0.008); plane(g, w, h, m, 0, 0, 0.022); return g; };
  const glassM = new THREE.MeshStandardMaterial({ color: 0xf4eeff, transparent: true, opacity: 0.38, roughness: 0.1, depthWrite: false });
  const plant = (p, x, z, s = 1, pot = 0xe7a08a, leaf = 0xa9d4b4) => {
    const g = new THREE.Group(); at(g, x, F, z, p); g.scale.setScalar(s);
    Cy(g, 0.13, 0.1, 0.22, pot, 0, 0.11, 0); Cy(g, 0.135, 0.135, 0.03, pot, 0, 0.22, 0);
    const r0 = rng(Math.round(x * 100 + z * 7) + 5);
    for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2, l = Sp(g, 0.1, leaf, Math.cos(a) * 0.09, 0.36 + r0() * 0.16, Math.sin(a) * 0.09, 14); l.scale.set(0.7, 1.4, 0.5); l.rotation.set(Math.sin(a) * 0.5, a, Math.cos(a) * 0.5); }
    Sp(g, 0.11, leaf, 0, 0.52, 0, 14).scale.set(0.8, 1.3, 0.8);
    return g;
  };

  // =================== beats: every timed event, in one place (labels, motion and the score read these) ===================
  const S2a = T('S2', 0);
  const EV = {
    loop: T('S2', 1) + 2.7,                                   // the ring of moons appears over the book
    cloudPuff: T('S2', 2) + 1.0, passBR: T('S2', 2) + 1.8, failBR: T('S2', 3) + 0.5,
    hallFail: T('S2', 4) + 2.6, stonesUp: T('S2', 5) - 0.1, doorShut: T('S2', 5) + 1.3, stonesFall: T('S2', 5) + 0.9,
    pods: [T('S2', 6) + 1.5, T('S2', 6) + 2.6, T('S2', 6) + 3.4],
    coinSpin: T('S2', 7) + 2.0, coinLand: T('S2', 7) + 3.5, pass3: [T('S2', 7) + 3.8, T('S2', 7) + 4.15, T('S2', 7) + 4.5],
    thread: [T('S3', 4) + 0.1, T('S3', 4) + 2.6],
    crosses: [T('S3', 5) + 1.5, T('S3', 5) + 1.8, T('S3', 5) + 2.1],
    office: T('S3', 6) + 0.3, examBack: T('S3', 7) + 0.4,
    lampOn: T('S3', 8) + 1.4, bookOpen: T('S3', 8) + 2.0,
    jangle: T('S3', 9) + 0.35, curtain: T('S3', 10) + 1.2,
    dive: T('S3', 12) - 1.4, calGlow: T('S3', 12) + 0.8,
    drawers: T('S3', 13) + 0.6, paperRise: T('S3', 14) + 0.1, passAR: T('S3', 14) + 1.2,
    failAR: T('S3', 15) + 0.3, drawerShut: T('S3', 15) + 1.0, paperLand: T('S3', 15) + 2.2,
    arcs: T('S4', 0) + 0.6, comfort: T('S4', 1) + 0.5, beadGo: T('S4', 2) + 2.2, beadArrive: T('S4', 2) + 3.8,
    dawn: T('S4', 3) - 0.3, sunOnDesk: T('S4', 4) - 0.2, oldPaper: T('S4', 5) + 1.3,
  };
  const winList = w => Array.isArray(w[0]) ? w : [w];

  // =================== S2 sets: Freud's dream world, floating in the haze ===================
  // ---------- the study, a century ago (visited twice: S2 and again for "Freud's core idea") ----------
  const freudTex = await imgTex('img/freud.jpg'), bookTex = await imgTex('img/traumdeutung_title.jpg');
  const ST = island('study', V(0, -14, 0), { w: 3.4, d: 3.0, h: 2.6, wall: 0xe4d2f2, wall2: 0xd4c0ee, floor: 0xf0c6c0, show: [[T('S1', 5), T('S2', 2) + 0.4], [T('S3', 8) - 1.1, T('S3', 11) + 1.2]] });
  {
    const g = ST.g;
    // rug, and the famous couch draped with a rug
    B(g, 2.2, 0.015, 1.6, 0xc9849f, 0.2, F + 0.008, 0.45, 0); B(g, 1.9, 0.018, 1.3, 0xf6d7c4, 0.2, F + 0.01, 0.45, 0); B(g, 0.9, 0.02, 0.6, 0xb59be0, 0.2, F + 0.012, 0.45, 0);
    const couch = new THREE.Group(); at(couch, -1.12, F, 0.55, g);
    for (const [x, z] of [[-0.32, -0.75], [0.32, -0.75], [-0.32, 0.75], [0.32, 0.75]]) Cy(couch, 0.035, 0.025, 0.14, 0x7c6cc4, x, 0.07, z, 10);
    B(couch, 0.8, 0.26, 1.7, 0xb79ae6, 0, 0.27, 0, 0.05); B(couch, 0.74, 0.1, 1.62, 0xd7c2f4, 0, 0.44, 0.02, 0.04);
    const head = B(couch, 0.74, 0.12, 0.5, 0xd7c2f4, 0, 0.58, -0.62, 0.05); head.rotation.x = 0.55;
    const roll = Cy(couch, 0.09, 0.09, 0.66, 0xf1b7a6, 0, 0.62, -0.72, 18); roll.rotation.z = Math.PI / 2;
    B(couch, 0.84, 0.03, 0.9, 0xd47f9a, 0, 0.5, 0.35, 0.01); B(couch, 0.86, 0.031, 0.08, 0xffd9a0, 0, 0.5, 0.0, 0); B(couch, 0.86, 0.031, 0.08, 0xffd9a0, 0, 0.5, 0.7, 0);
    put('dining_chair_02', g, -0.45, F, -0.55, Math.PI * 0.75, 0x9a7fd8, 1); // his chair, behind the couch's head
    // bookshelf
    const sh = new THREE.Group(); at(sh, -0.95, F, -ST.d / 2 + 0.2, g);
    const shC = 0xc7a7dc, bookC = [0xb59be0, 0xe7a3b8, 0xf5d1a0, 0x9f8fd6, 0xf0b9a0, 0xd9c4f2, 0xc17fa3, 0xfff0d2];
    B(sh, 1.2, 2.1, 0.06, shC, 0, 1.05, -0.15, 0); B(sh, 0.05, 2.1, 0.36, shC, -0.58, 1.05, 0, 0); B(sh, 0.05, 2.1, 0.36, shC, 0.58, 1.05, 0, 0);
    const rb = rng(12);
    for (let s = 0; s < 5; s++) {
      const y = 0.05 + s * 0.42; B(sh, 1.16, 0.04, 0.36, shC, 0, y, 0, 0);
      if (s === 4) continue;
      let x = -0.54; while (x < 0.5) { const bw = 0.04 + rb() * 0.05, bh = 0.24 + rb() * 0.1; if (x + bw > 0.54) break; B(sh, bw, bh, 0.26, bookC[Math.floor(rb() * bookC.length)], x + bw / 2, y + 0.02 + bh / 2, 0.02, 0); x += bw + 0.004; }
    }
    for (let i = 0; i < 4; i++) { Cy(sh, 0.035, 0.05, 0.12 + (i % 2) * 0.06, [0xf1b7a6, 0xffd98a, 0x9f8fd6, 0xe7a3b8][i], -0.4 + i * 0.26, 2.1 + 0.08, 0.02, 14); } // his little antiquities
    // the desk
    const dk = new THREE.Group(); at(dk, 0.62, F, -0.72, g); ST.desk = dk;
    B(dk, 1.5, 0.06, 0.78, 0xfff0d2, 0, 0.76, 0, 0.012);
    for (const x of [-0.53, 0.53]) { B(dk, 0.4, 0.73, 0.7, 0xeed2b2, x, 0.365, 0, 0.01); for (const y of [0.18, 0.42, 0.62]) { B(dk, 0.34, 0.15, 0.01, 0xf6e0c4, x, y, 0.355, 0.004); Sp(dk, 0.014, 0xc99a5a, x, y, 0.37, 10); } }
    // lamp (its shade and bulb glow are driven: it clicks on for the second visit)
    Cy(dk, 0.09, 0.1, 0.03, 0x8d82d6, -0.5, 0.805, -0.18); Cy(dk, 0.012, 0.012, 0.36, 0xffd98a, -0.5, 0.97, -0.18, 10);
    const shade = Cy(dk, 0.07, 0.16, 0.15, glow(0xf3a0b4, 0.35), -0.5, 1.16, -0.18, 28); shade.material.side = THREE.DoubleSide;
    const bulb = Sp(dk, 0.04, glow(0xfff1c8, 1.2), -0.5, 1.1, -0.18, 12); ST.lampMats = [shade.material, bulb.material];
    // inkwell and pen, a manuscript, the book
    Cy(dk, 0.04, 0.045, 0.05, 0x3a2a68, 0.42, 0.815, -0.16, 18); Cy(dk, 0.022, 0.022, 0.02, 0xffd98a, 0.42, 0.85, -0.16, 12);
    const quill = Cy(dk, 0.006, 0.003, 0.24, 0xf6e8ff, 0.47, 0.93, -0.16, 8); quill.rotation.z = -0.45;
    const vane = B(dk, 0.02, 0.12, 0.004, 0xf6e8ff, 0.5, 0.99, -0.16, 0.003); vane.rotation.z = -0.45;
    const ms = [script(31), script(32), script(33)];
    ms.forEach((tx, i) => { const pl = plane(dk, 0.21, 0.28, paperM(tx), -0.12 + i * 0.05 - (i === 2 ? 0.25 : 0), 0.792 + i * 0.001, -0.06 - (i === 2 ? 0.04 : 0), 0, -Math.PI / 2); pl.rotation.z = [0.2, -0.08, 0.35][i]; });
    // Die Traumdeutung, lying closed at the front of the desk: its title page as the cover, hinged so it can open
    const book = new THREE.Group(); at(book, 0.2, 0.79, 0.16, dk); book.rotation.y = -0.12; ST.book = book;
    B(book, 0.19, 0.04, 0.24, 0xfff3de, 0, 0.02, 0, 0.004); B(book, 0.196, 0.006, 0.246, 0x9c7fd0, 0, 0.003, 0, 0.002);
    plane(book, 0.17, 0.22, paperM(script(35)), 0, 0.0408, 0, 0, -Math.PI / 2); // the first page of chapter III
    const cover = new THREE.Group(); at(cover, -0.098, 0.041, 0, book); ST.cover = cover;
    B(cover, 0.196, 0.005, 0.246, 0x9c7fd0, 0.098, 0.0025, 0, 0.002);
    plane(cover, 0.186, 0.226, texMat(bookTex, { color: 0xe8e0dc }), 0.098, 0.0056, 0, 0, -Math.PI / 2);
    plane(cover, 0.186, 0.226, mm(0xf6e6d0), 0.098, -0.0006, 0, 0, Math.PI / 2);
    // Freud on the wall above the desk
    ST.photo = picture(g, 0.5, 0.61, texMat(freudTex, { color: 0xe6e0de }), 0.62, 1.72, -ST.d / 2 + 0.04, 0xe6b980);
    picture(g, 0.24, 0.3, mm(0xf6d7c4), 1.25, 1.5, -ST.d / 2 + 0.04, 0xc7a7dc); // a little landscape
    // window on the left wall, with soft light
    plane(g, 0.8, 1.15, new THREE.MeshBasicMaterial({ color: 0xfff1e6, toneMapped: false }), -ST.w / 2 + 0.005, 1.5, -0.55, Math.PI / 2);
    for (const [w0, h0, y0, z0] of [[0.06, 1.2, 1.5, -0.97], [0.06, 1.2, 1.5, -0.13], [0.06, 0.05, 2.1, -0.55], [0.06, 0.05, 0.9, -0.55], [0.04, 1.15, 1.5, -0.55]]) B(g, 0.05, h0, w0 === 0.06 && h0 > 0.1 ? 0.06 : 0.86, C.trim, -ST.w / 2 + 0.02, y0, z0, 0.005);
    plant(g, 1.4, -1.1, 1.3);
    put('dining_chair_02', g, 0.62, F, -0.05, Math.PI + 0.25, 0xb59be0, 1);
    // a ring of little moons and papers that keeps coming round above the book ("a typical dream")
    const loop = new THREE.Group(); ST.loop = loop; at(loop, 0, 0.0, 0, book);
    const pm = paperM(ruled(4));
    for (let i = 0; i < 6; i++) {
      const piv = new THREE.Group(); loop.add(piv); piv.rotation.y = i / 6 * Math.PI * 2;
      if (i % 2) { const m = moon(piv, 0.045); m.position.set(0.3, 0, 0); }
      else { const p0 = plane(piv, 0.1, 0.13, pm, 0.3, 0, 0, 0); p0.rotation.y = Math.PI / 2; }
    }

    // ---- second visit only: an upright piano nobody is playing, keys towards the open side, a toy stage on its lid ----
    const mu = new THREE.Group(); at(mu, 1.3, F, 0.85, g); mu.rotation.y = Math.PI / 2; ST.music = mu; mu.userData.home = mu.position.clone();
    const pk = 0x9f8fd6, pk2 = 0xb59be0;
    B(mu, 1.1, 0.98, 0.42, pk, 0, 0.62, -0.02, 0.02); B(mu, 1.14, 0.04, 0.48, pk2, 0, 1.13, -0.02, 0.01);
    B(mu, 1.1, 0.06, 0.26, pk2, 0, 0.71, 0.3, 0.01); B(mu, 1.0, 0.16, 0.02, pk2, 0, 0.85, 0.2, 0.005);
    for (const x of [-0.5, 0.5]) B(mu, 0.07, 0.62, 0.07, pk, x, 0.31, 0.38, 0.01);
    B(mu, 1.0, 0.2, 0.03, 0xc7b0ec, 0, 0.32, 0.2, 0.01); // the lower panel
    for (const x of [-0.12, 0.12]) { const pd = B(mu, 0.04, 0.012, 0.09, 0xffd98a, x, 0.04, 0.3, 0.004); void pd; } // pedals
    const sheet = plane(mu, 0.36, 0.25, paperM(script(36)), 0, 1.0, 0.205, 0, -0.22); void sheet;
    ST.keys = []; const keyW = matte(0xfff8ee, 0.6), keyB = matte(C.ink, 0.6);
    for (let i = 0; i < 21; i++) { const pv = new THREE.Group(); at(pv, -0.46 + i * 0.046, 0.74, 0.2, mu); const k0 = box(0.042, 0.022, 0.21, keyW, 0.004); k0.position.set(0, 0.011, 0.105); k0.castShadow = true; pv.add(k0); ST.keys.push(pv); }
    for (let i = 0; i < 20; i++) { if ([2, 6, 9, 13, 16].includes(i)) continue; const pv = new THREE.Group(); at(pv, -0.46 + (i + 0.5) * 0.046, 0.762, 0.2, mu); const k0 = box(0.024, 0.024, 0.12, keyB, 0.004); k0.position.set(0, 0.012, 0.06); pv.add(k0); ST.keys.push(pv); }
    // the jangle: little shards of noise that fly off the keys and vanish
    ST.shards = []; const sr = rng(66);
    for (let i = 0; i < 16; i++) {
      const s0 = new THREE.Mesh(new THREE.TetrahedronGeometry(0.035 + sr() * 0.02), glow([0xf3a0b4, 0xffd98a, 0x9fb4f2, 0xc9a3e6][i % 4], 0.6)); at(s0, -0.4 + sr() * 0.8, 0.8, 0.3, mu);
      s0.userData = { p0: s0.position.clone(), v: V((sr() - 0.5) * 1.6, 1.4 + sr() * 1.4, 0.4 + sr() * 1.1), spin: V(sr() * 9, sr() * 9, sr() * 9) }; s0.visible = false; ST.shards.push(s0);
    }
    // the toy stage on the lid
    const sg = new THREE.Group(); at(sg, 0.05, 1.15, 0.0, mu); ST.stage = sg;
    B(sg, 0.6, 0.05, 0.34, 0xeed2b2, 0, 0.025, 0, 0.008); B(sg, 0.56, 0.012, 0.3, 0xf6c8d4, 0, 0.056, 0, 0.004);
    const bd = canvasTex(256, 200, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#b8a6f0'); gr.addColorStop(0.55, '#ffbfb4'); gr.addColorStop(1, '#ffe2bc'); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
    plane(sg, 0.52, 0.34, new THREE.MeshBasicMaterial({ map: bd, toneMapped: false, color: 0xe6dede }), 0, 0.23, -0.14);
    B(sg, 0.06, 0.42, 0.05, 0xe7a3b8, -0.28, 0.26, 0.15, 0.01); B(sg, 0.06, 0.42, 0.05, 0xe7a3b8, 0.28, 0.26, 0.15, 0.01); B(sg, 0.62, 0.08, 0.05, 0xe7a3b8, 0, 0.47, 0.15, 0.01);
    Sp(sg, 0.018, 0xffd98a, 0, 0.47, 0.18, 10);
    ST.sun = Sp(sg, 0.07, glow(0xffd98a, 1.1), 0.1, 0.1, -0.12, 20);
    { const td = new THREE.Group(); at(td, -0.05, 0.062, 0.02, sg); B(td, 0.16, 0.012, 0.1, 0xfff0d2, 0, 0.09, 0, 0.003); for (const [x, z] of [[-0.07, -0.04], [0.07, -0.04], [-0.07, 0.04], [0.07, 0.04]]) Cy(td, 0.005, 0.005, 0.09, 0xeed2b2, x, 0.045, z, 6);
      B(td, 0.07, 0.002, 0.09, 0xfbf3e6, 0, 0.097, 0, 0); const tm = glow(0xff7a8a, 0.6); const a1 = B(td, 0.008, 0.004, 0.03, tm, -0.012, 0.1, 0.006, 0.001); a1.rotation.y = 0.8; const a2 = B(td, 0.009, 0.004, 0.06, tm, 0.012, 0.1, -0.002, 0.001); a2.rotation.y = -0.6; }
    { const st0 = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + Math.PI / 2, r0 = i % 2 ? 0.4 : 1; i ? st0.lineTo(Math.cos(a) * r0, Math.sin(a) * r0) : st0.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); }
      const sgeo = new THREE.ExtrudeGeometry(st0, { depth: 0.3, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.08, bevelSegments: 2 }); sgeo.center();
      ST.star = at(new THREE.Mesh(sgeo, glow(0xffd98a, 0.9)), -0.14, 0.3, -0.06, sg); ST.star.scale.setScalar(0.045); }
    ST.curtains = [-1, 1].map(side => { const cg = new THREE.Group(); at(cg, side * 0.25, 0.06, 0.11, sg); const cm = mm(0xd44f6e);
      for (let i = 0; i < 4; i++) Cy(cg, 0.032, 0.032, 0.36, cm, -side * (0.03 + i * 0.06), 0.18, 0, 12);
      return cg; });
  }
  const studyLamp = new THREE.PointLight(0xffc89a, 0, 3.2, 1.6); studyLamp.position.copy(ST.desk.localToWorld(V(-0.5, 1.05, -0.05))); S.scene.add(studyLamp);

  // ---------- two little bedrooms: passed (gets the dream) / failed (sleeps in peace) ----------
  const BR = island('bedrooms', V(-9, -15, -7), { w: 3.9, d: 3.0, h: 2.5, wall: 0xdccbf4, wall2: 0xcfbdf0, show: [T('S2', 1) + 3.5, T('S2', 4) + 0.5] });
  {
    const g = BR.g;
    B(g, 0.12, BR.h, BR.d, 0xd2c2ee, 0, BR.h / 2, 0, 0); // the partition
    B(g, 1.95, 0.02, BR.d, 0xe2cdd6, 0.98, 0.012, 0, 0);  // the calmer room's floor
    B(g, 1.9, BR.h, 0.02, 0xcbbfe0, 0.98, BR.h / 2, -BR.d / 2 + 0.005, 0); // and wall
    const bedAt = (cx, duvet) => {
      const b = new THREE.Group(); at(b, cx, F, -0.45, g);
      B(b, 0.98, 0.3, 1.8, 0xf1b7a6, 0, 0.15, 0, 0.03); B(b, 1.0, 0.8, 0.08, 0xd9a0c4, 0, 0.4, -0.92, 0.03);
      B(b, 0.92, 0.12, 1.72, 0xffffff, 0, 0.36, 0, 0.04); B(b, 0.96, 0.1, 1.2, duvet, 0, 0.44, 0.27, 0.04);
      const pw = B(b, 0.5, 0.12, 0.3, 0xffffff, 0, 0.47, -0.62, 0.05); pw.rotation.x = 0.3;
      return b;
    };
    bedAt(-1.25, 0xa9b8f2); bedAt(0.72, 0xbfb2e4);
    for (const cx of [-0.48, 1.45]) { B(g, 0.36, 0.42, 0.34, 0xd9a0c4, cx, 0.21 + F, -1.1, 0.02); Cy(g, 0.05, 0.06, 0.03, 0x8d82d6, cx, 0.46, -1.1, 14); Sp(g, 0.07, glow(0xfff1c8, 0.8), cx, 0.55, -1.1, 14); }
    BR.passPaper = picture(g, 0.38, 0.5, paperM(ruled(21)), -0.45, 1.55, -BR.d / 2 + 0.04, 0xe6b980);
    BR.failPaper = picture(g, 0.38, 0.5, paperM(ruled(22, '#9f97c0'), 0xc8c0cc), 1.5, 1.55, -BR.d / 2 + 0.04, 0xb8acd6);
    const cl = new THREE.Group(); at(cl, -1.15, 1.95, -0.1, g); BR.cloud = cl;
    cloud(cl, 1.25); const me = miniExam(cl, 0.42); me.position.set(0, 0.2, 0.05);
    BR.bubbles = [[-1.2, 0.85, -0.85, 0.05], [-1.17, 1.15, -0.65, 0.07], [-1.15, 1.45, -0.42, 0.09]].map(([x, y, z, r0]) => Sp(g, r0, cloudM, x, y, z, 16));
    const mn = moon(g, 0.12, 0xfff0c0); mn.position.set(0.72, 1.75, -BR.d / 2 + 0.06); BR.calm = mn;
  }

  // ---------- the old university exam hall: forensic medicine ----------
  const HL = island('hall', V(-20, -14, -9), { w: 3.6, d: 3.4, h: 3.0, wall: 0xd8c8f0, wall2: 0xc9b8ea, floor: 0xeec4c4, show: [T('S2', 3) + 2.4, T('S2', 6) + 0.4] });
  {
    const g = HL.g;
    for (let i = 0; i < 6; i++) B(g, 3.6, 0.004, 0.28, 0xf6d6d0, 0, F + 0.003, -1.4 + i * 0.56, 0); // floorboards
    // wainscot panels round the walls, and a picture rail
    B(g, 3.6, 0.9, 0.03, 0xc9b6ea, 0, 0.47, -HL.d / 2 + 0.015, 0.004); B(g, 3.6, 0.04, 0.05, C.trim, 0, 0.93, -HL.d / 2 + 0.03, 0.005); B(g, 3.6, 0.03, 0.04, C.trim, 0, 2.62, -HL.d / 2 + 0.02, 0.004);
    B(g, 0.03, 0.9, 3.4, 0xbdaae2, -HL.w / 2 + 0.015, 0.47, 0, 0.004); B(g, 0.05, 0.04, 3.4, C.trim, -HL.w / 2 + 0.03, 0.93, 0, 0.005);
    for (const x of [-1.45, -0.45, 0.45, 1.45]) B(g, 0.7, 0.55, 0.02, 0xd4c2f0, x, 0.48, -HL.d / 2 + 0.035, 0.004);
    // tall arched windows with drapes
    for (const x of [-0.9, 0.9]) {
      plane(g, 0.7, 1.3, new THREE.MeshBasicMaterial({ color: 0xfff1e6, toneMapped: false }), x, 1.75, -HL.d / 2 + 0.005);
      const arch = new THREE.Mesh(new THREE.CircleGeometry(0.35, 32, 0, Math.PI), new THREE.MeshBasicMaterial({ color: 0xfff1e6, toneMapped: false })); at(arch, x, 2.4, -HL.d / 2 + 0.005, g);
      B(g, 0.05, 1.65, 0.05, C.trim, x, 1.9, -HL.d / 2 + 0.03, 0.005); B(g, 0.76, 0.05, 0.12, C.trim, x, 1.08, -HL.d / 2 + 0.05, 0.005);
      for (const s of [-1, 1]) for (let i = 0; i < 3; i++) Cy(g, 0.05, 0.065, 1.9, 0xe7a3b8, x + s * (0.44 + i * 0.07), 1.62, -HL.d / 2 + 0.1, 12);
      B(g, 1.1, 0.06, 0.08, 0xffd98a, x, 2.6, -HL.d / 2 + 0.1, 0.01); // curtain rod
    }
    // a wall clock between them
    const wc = new THREE.Group(); at(wc, 0, 2.3, -HL.d / 2 + 0.03, g); wc.add(new THREE.Mesh(new THREE.CircleGeometry(0.17, 40), mm(0xfff7ec))); const rim = new THREE.Mesh(new THREE.TorusGeometry(0.175, 0.02, 10, 40), mm(C.chair)); wc.add(rim);
    B(wc, 0.012, 0.11, 0.006, C.ink, 0, 0.045, 0.01, 0); B(wc, 0.01, 0.08, 0.006, C.ink, 0.03, -0.02, 0.012, 0).rotation.z = -2.2;
    // two pendant lamps over the table
    for (const x of [-0.65, 0.65]) { Cy(g, 0.006, 0.006, 0.9, 0x8d82d6, x, 2.62, -0.85, 6); const sh0 = Cy(g, 0.06, 0.2, 0.16, glow(0xf3a0b4, 0.3), x, 2.12, -0.85, 24); sh0.material.side = THREE.DoubleSide; Sp(g, 0.05, glow(0xfff1c8, 1.3), x, 2.06, -0.85, 12); }
    // the examiners' long table with its cloth, three empty high-backed chairs behind it
    const tb = new THREE.Group(); at(tb, 0, F, -0.85, g); HL.table = tb;
    B(tb, 2.3, 0.06, 0.75, 0xfff0d2, 0, 0.78, 0, 0.01); B(tb, 2.32, 0.62, 0.03, 0x8d82d6, 0, 0.46, 0.38, 0); B(tb, 0.03, 0.62, 0.74, 0x8d82d6, 1.15, 0.46, 0, 0); B(tb, 2.32, 0.05, 0.035, 0xffd98a, 0, 0.18, 0.39, 0);
    for (const x of [-0.75, 0, 0.75]) { put('dining_chair_02', g, x, F, -1.45, 0, 0x6f5fb8, 1.15); B(g, 0.44, 0.5, 0.05, 0x6f5fb8, x, 1.2, -1.66, 0.02); }
    Cy(tb, 0.05, 0.06, 0.02, 0xd9a85a, -0.75, 0.82, 0.05, 20); const dome = new THREE.Mesh(new THREE.SphereGeometry(0.05, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), mm(0xf2c46b, { metalness: 0.3, roughness: 0.4 })); at(dome, -0.75, 0.83, 0.05, tb); Sp(tb, 0.012, 0xf2c46b, -0.75, 0.89, 0.05, 10);
    Cy(tb, 0.035, 0.04, 0.05, 0x3a2a68, 0.55, 0.835, -0.1, 16);
    for (let i = 0; i < 4; i++) B(tb, 0.24, 0.006, 0.32, 0xfbf3e6, 0.85 + (i % 2) * 0.01, 0.815 + i * 0.007, 0.05 + i * 0.006, 0);
    const hg = new THREE.Group(); at(hg, 0.25, 0.81, -0.15, tb); Cy(hg, 0.06, 0.06, 0.015, 0xd9a85a, 0, 0.007, 0); Cy(hg, 0.06, 0.06, 0.015, 0xd9a85a, 0, 0.2, 0);
    at(new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.09, 20), glassM), 0, 0.06, 0, hg).rotation.x = Math.PI; at(new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.09, 20), glassM), 0, 0.15, 0, hg);
    Cy(hg, 0.001, 0.035, 0.04, 0xf5d1a0, 0, 0.035, 0, 16);
    // a water carafe and glasses, a stack of bound books
    Cy(tb, 0.05, 0.07, 0.2, glassM, -0.35, 0.91, -0.15, 20).castShadow = false; Cy(tb, 0.045, 0.06, 0.1, mm(0xbfe0f2), -0.35, 0.86, -0.15, 20);
    for (let i = 0; i < 3; i++) B(tb, 0.22, 0.05, 0.3, [0x9f8fd6, 0xe7a3b8, 0xc17fa3][i], -1.0, 0.835 + i * 0.05, -0.15, 0.006).rotation.y = (i - 1) * 0.1;
    HL.paper = plane(tb, 0.34, 0.45, paperM(ruled(41, '#6f5fb8')), -0.1, 0.815, 0.12, 0, -Math.PI / 2); HL.paper.rotation.z = 0.08;
    // the lone candidate's chair on a runner, facing the table
    B(g, 0.8, 0.012, 1.8, 0xd47f9a, 0.1, F + 0.006, 0.55, 0); B(g, 0.66, 0.014, 1.66, 0xf3a0b4, 0.1, F + 0.008, 0.55, 0);
    put('dining_chair_02', g, 0.1, F, 0.75, Math.PI, 0xb7a7e8, 1);
    // a glass-fronted cabinet of specimen jars in the back-left corner (pastel blobs, nothing anatomical)
    { const cb = new THREE.Group(); at(cb, -1.45, F, -1.35, g); cb.rotation.y = 0.5; B(cb, 0.62, 1.9, 0.4, 0xc7a7dc, 0, 0.95, 0, 0.02); B(cb, 0.56, 1.5, 0.02, glassM, 0, 1.1, 0.205, 0);
      for (const y of [0.55, 1.05, 1.55]) { B(cb, 0.54, 0.03, 0.34, 0xe6d6f6, 0, y - 0.18, 0, 0); for (let i = 0; i < 3; i++) { Cy(cb, 0.06, 0.06, 0.2, glassM, -0.17 + i * 0.17, y - 0.06, 0.04, 14).castShadow = false; Sp(cb, 0.045, [0xf3a0b4, 0xa9d4b4, 0xffd98a][(i + Math.round(y * 2)) % 3], -0.17 + i * 0.17, y - 0.08, 0.04, 12); Cy(cb, 0.062, 0.062, 0.025, 0xffd98a, -0.17 + i * 0.17, y + 0.05, 0.04, 14); } } }
    // a microscope on a side table, front right
    { const mt = new THREE.Group(); at(mt, 1.42, F, 0.55, g); B(mt, 0.5, 0.04, 0.4, 0xfff0d2, 0, 0.72, 0, 0.01); for (const [x, z] of [[-0.21, -0.16], [0.21, -0.16], [-0.21, 0.16], [0.21, 0.16]]) Cy(mt, 0.015, 0.015, 0.7, 0xeed2b2, x, 0.35, z, 8);
      const mc = new THREE.Group(); at(mc, 0, 0.74, 0, mt); mc.rotation.y = -0.8; B(mc, 0.14, 0.03, 0.18, 0x8d82d6, 0, 0.015, 0, 0.01); const arm = B(mc, 0.035, 0.22, 0.05, 0x8d82d6, 0, 0.13, -0.06, 0.01); arm.rotation.x = 0.25; B(mc, 0.1, 0.012, 0.1, 0xb59be0, 0, 0.1, 0.02, 0.003);
      const tube = Cy(mc, 0.022, 0.026, 0.2, 0xffd98a, 0, 0.26, 0.0, 14); tube.rotation.x = -0.35; Cy(mc, 0.02, 0.016, 0.05, 0x3a2a68, 0, 0.36, 0.035, 12).rotation.x = -0.35;
      B(mt, 0.08, 0.004, 0.06, 0xfbf3e6, 0.15, 0.745, 0.08, 0); }
    // framed certificates (no faces) on the left wall, a coat stand by the door, a palm
    for (const z of [-1.15, -0.45]) { const fr = picture(g, 0.34, 0.26, mm(0xfbf3e6), -HL.w / 2 + 0.04, 1.75, z, 0xe6b980, Math.PI / 2); Sp(fr, 0.035, 0xe8708a, 0.1, -0.06, 0.03, 12).scale.z = 0.3; }
    { const cs = new THREE.Group(); at(cs, -1.45, F, 1.55, g); Cy(cs, 0.16, 0.18, 0.03, 0x8d82d6, 0, 0.015, 0, 20); Cy(cs, 0.018, 0.018, 1.7, 0x8d82d6, 0, 0.85, 0, 10); for (let i = 0; i < 4; i++) { const hk = Cy(cs, 0.01, 0.01, 0.14, 0xffd98a, Math.cos(i * 1.57) * 0.06, 1.62, Math.sin(i * 1.57) * 0.06, 6); hk.rotation.set(Math.sin(i * 1.57) * 0.9, 0, -Math.cos(i * 1.57) * 0.9); }
      const sc = B(cs, 0.1, 0.62, 0.04, 0xe8708a, 0.09, 1.28, 0, 0.02); sc.rotation.z = 0.08; Sp(cs, 0.06, 0x9f8fd6, -0.06, 1.75, 0, 14).scale.y = 0.6; }
    plant(g, 1.5, -1.3, 1.5, 0xd9a0c4);
    // a door in the left wall, standing open, and a path of stepping stones out of it towards a dream cloud
    const door = new THREE.Group(); at(door, -HL.w / 2 + 0.02, F, 0.95, g); HL.door = door;
    B(g, 0.06, 2.12, 0.08, C.trim, -HL.w / 2 + 0.03, 1.06, 0.5, 0.005); B(g, 0.06, 2.12, 0.08, C.trim, -HL.w / 2 + 0.03, 1.06, 1.42, 0.005); B(g, 0.06, 0.08, 1.0, C.trim, -HL.w / 2 + 0.03, 2.14, 0.96, 0.005);
    plane(g, 0.88, 2.06, new THREE.MeshBasicMaterial({ color: 0xfff4ec, toneMapped: false }), -HL.w / 2 + 0.002, 1.05, 0.96, Math.PI / 2);
    B(door, 0.05, 2.04, 0.88, 0xb59be0, 0.03, 1.04, -0.44, 0.01); Sp(door, 0.025, 0xffd98a, 0.09, 1.0, -0.8, 10);
    for (const y of [0.55, 1.45]) B(door, 0.06, 0.7, 0.7, 0xc7b0ec, 0.035, y, -0.44, 0.01);
    door.position.z = 1.42; // hinge at the front post
    HL.stones = [];
    for (let i = 0; i < 7; i++) { const u = i / 6; const st = B(g, 0.34, 0.07, 0.34, 0xf8e6ee, 0.6 + u * 0.4, 0.25 + u * 2.45, 1.75 - u * 0.55, 0.03); st.userData.home = st.position.clone(); HL.stones.push(st); }
    const hc = new THREE.Group(); at(hc, 0.95, 3.45, 1.05, g); cloud(hc, 1.1); HL.cloud = hc;
  }

  // ---------- botany, zoology, chemistry: three little worlds in a column, and a coin for luck ----------
  const TR = island('trio', V(-11, -14, -7), { w: 0.01, d: 0.01, h: 0, back: false, left: false, show: [T('S2', 5) + 1.2, T('S3', 0) + 0.6] });
  TR.g.children.forEach(c => { c.visible = false; }); // no room: three pedestals instead
  TR.pods = [];
  {
    const pod = (x, y, z, wall) => {
      const g = new THREE.Group(); at(g, x, y, z, TR.g);
      Cy(g, 0.95, 0.85, 0.32, 0xfbe6e0, 0, -0.16, 0, 48); Cy(g, 0.88, 0.88, 0.02, 0xf6d6d0, 0, 0.01, 0, 48);
      const bw = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.92, 1.3, 48, 1, true, Math.PI * 0.85, Math.PI * 0.8), mm(wall, { side: THREE.DoubleSide })); at(bw, 0, 0.65, 0, g); bw.receiveShadow = true;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.98, 0.025, 10, 64), glow(0xffd98a, 0)); ring.rotation.x = Math.PI / 2; at(ring, 0, -0.33, 0, g);
      g.userData.y0 = y; TR.pods.push({ g, ring }); return g;
    };
    const bo = pod(-0.6, 1.55, 0, 0xd9ecd9);
    plant(bo, -0.4, -0.35, 1.25); plant(bo, 0.05, -0.55, 0.9, 0xf1b7a6);
    { const fl = new THREE.Group(); at(fl, 0.42, F, -0.3, bo); Cy(fl, 0.09, 0.07, 0.16, 0xe7a08a, 0, 0.08, 0); Cy(fl, 0.008, 0.008, 0.3, 0x8fc4a0, 0, 0.3, 0, 8);
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; Sp(fl, 0.04, 0xf3a0b4, Math.cos(a) * 0.05, 0.46, Math.sin(a) * 0.05, 12); } Sp(fl, 0.035, 0xffd98a, 0, 0.47, 0, 12); }
    { const pr = new THREE.Group(); at(pr, 0.25, F, 0.3, bo); pr.rotation.y = -0.4; B(pr, 0.4, 0.03, 0.3, 0xeed2b2, 0, 0.015, 0); B(pr, 0.37, 0.05, 0.27, 0xfbf3e6, 0, 0.055, 0, 0.004); B(pr, 0.4, 0.03, 0.3, 0xeed2b2, 0, 0.095, 0);
      for (const [x, z] of [[-0.17, -0.12], [0.17, -0.12], [-0.17, 0.12], [0.17, 0.12]]) { Cy(pr, 0.01, 0.01, 0.16, 0xc99a5a, x, 0.08, z, 8); Sp(pr, 0.02, 0xffd98a, x, 0.16, z, 8); } }
    { const lf = plane(bo, 0.26, 0.32, mm(0xfbf3e6, { side: THREE.DoubleSide }), -0.3, F + 0.004, 0.35, 0, -Math.PI / 2); lf.rotation.z = 0.3; const le = Sp(bo, 0.09, 0x9fd0ae, -0.3, F + 0.01, 0.35, 14); le.scale.set(0.6, 0.06, 1.2); le.rotation.y = 0.5;
      const mg = new THREE.Group(); at(mg, -0.22, F + 0.05, 0.4, bo); mg.rotation.set(-1.25, 0, 0.6); const tor = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.014, 10, 32), mm(0xf2c46b, { metalness: 0.3, roughness: 0.4 })); mg.add(tor);
      at(new THREE.Mesh(new THREE.CircleGeometry(0.075, 32), glassM), 0, 0, 0, mg); Cy(mg, 0.014, 0.016, 0.16, 0x8d82d6, 0, -0.16, 0, 10); }
    const zo = pod(0.55, 0, 0, 0xf6dcea);
    { const cs = new THREE.Group(); at(cs, -0.25, 0.42, -0.45, zo); cs.rotation.x = -0.35;
      B(cs, 0.62, 0.48, 0.06, 0xfff0d2, 0, 0, 0, 0.01); B(cs, 0.54, 0.4, 0.02, 0xd9c4f2, 0, 0, 0.025, 0);
      const wing = new THREE.CircleGeometry(0.05, 20);
      [[-0.15, 0.08, 0xf3a0b4], [0.12, 0.1, 0xffd98a], [-0.02, -0.08, 0x9fb4f2], [0.17, -0.1, 0xf1b7a6]].forEach(([x, y, c]) => {
        const bf = new THREE.Group(); at(bf, x, y, 0.04, cs); const wm = mm(c, { side: THREE.DoubleSide });
        for (const sx of [-1, 1]) { const w1 = new THREE.Mesh(wing, wm); w1.position.set(sx * 0.045, 0.02, 0); w1.scale.set(1, 1.15, 1); bf.add(w1); const w2 = new THREE.Mesh(wing, wm); w2.position.set(sx * 0.035, -0.04, 0); w2.scale.setScalar(0.7); bf.add(w2); }
        B(bf, 0.012, 0.09, 0.012, C.ink, 0, 0, 0.005, 0.004); });
      for (const sx of [-0.18, 0.18]) { const leg = Cy(zo, 0.012, 0.012, 0.7, 0xc99a5a, -0.25 + sx, 0.33, -0.55, 8); leg.rotation.x = 0.25; } }
    { const cg = new THREE.Group(); at(cg, 0.35, F, 0.05, zo);
      Cy(cg, 0.2, 0.22, 0.05, 0x8d82d6, 0, 0.025, 0, 32);
      for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; Cy(cg, 0.006, 0.006, 0.42, 0xffd98a, Math.cos(a) * 0.19, 0.26, Math.sin(a) * 0.19, 6); }
      for (let i = 0; i < 4; i++) { const r0 = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.006, 6, 40, Math.PI), mm(0xffd98a)); r0.rotation.y = i / 4 * Math.PI; at(r0, 0, 0.47, 0, cg); }
      Cy(cg, 0.19, 0.19, 0.02, 0xffd98a, 0, 0.47, 0, 32).scale.y = 0.4; const hook = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.008, 8, 20), mm(0xffd98a)); at(hook, 0, 0.7, 0, cg);
      const perch = Cy(cg, 0.007, 0.007, 0.32, 0xc99a5a, 0, 0.22, 0, 6); perch.rotation.z = Math.PI / 2;
      const bird = new THREE.Group(); at(bird, 0, 0.26, 0, cg); bird.rotation.y = 0.6; TR.bird = bird;
      Sp(bird, 0.055, 0xffd98a, 0, 0.05, 0, 16).scale.set(1.25, 1, 0.95); Sp(bird, 0.038, 0xffd98a, 0.055, 0.1, 0, 14);
      at(new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.035, 10), mm(0xf3a07a)), 0.098, 0.1, 0, bird).rotation.z = -Math.PI / 2;
      Sp(bird, 0.007, C.ink, 0.075, 0.115, 0.025, 8); Sp(bird, 0.007, C.ink, 0.075, 0.115, -0.025, 8);
      const tail = B(bird, 0.07, 0.015, 0.04, 0xf1b7a6, -0.08, 0.06, 0, 0.006); tail.rotation.z = 0.4; }
    { [[-0.45, 0.35, 0xf6c8d4], [-0.2, 0.5, 0xfff0d2], [0.0, 0.42, 0xf1b7a6]].forEach(([x, z, c], i) => {
        if (i === 1) { const sh = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 18), mm(c)); sh.rotation.z = Math.PI / 2 + 0.2; at(sh, x, F + 0.05, z, zo); sh.castShadow = true; return; }
        const sc = new THREE.Mesh(new THREE.SphereGeometry(0.08, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), mm(c, { side: THREE.DoubleSide })); sc.scale.set(1, 0.45, 1); at(sc, x, F, z, zo); sc.castShadow = true; }); }
    const ch = pod(-0.6, -1.55, 0, 0xe2d6f6);
    { const st = new THREE.Group(); at(st, -0.2, F, -0.2, ch);
      Cy(st, 0.08, 0.1, 0.1, 0xe7d8f8, 0, 0.05, 0, 20); Cy(st, 0.012, 0.012, 0.05, 0xfff0d2, 0, 0.12, 0, 8);
      TR.flame = at(new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.09, 14), glow(0xffb070, 2.5)), 0, 0.19, 0, st);
      for (const a of [0, 2.1, 4.2]) { const l = Cy(st, 0.008, 0.008, 0.42, 0x8d82d6, Math.cos(a) * 0.15, 0.21, Math.sin(a) * 0.15, 8); l.rotation.set(Math.sin(a) * 0.15, 0, -Math.cos(a) * 0.15); }
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.01, 8, 32), mm(0x8d82d6)); ring.rotation.x = Math.PI / 2; at(ring, 0, 0.38, 0, st);
      Sp(st, 0.14, glassM, 0, 0.5, 0, 28); const liq = Sp(st, 0.115, glow(0xf3a0b4, 0.35), 0, 0.47, 0, 24); liq.scale.y = 0.75; const nk = Cy(st, 0.035, 0.035, 0.22, glassM, 0, 0.72, 0, 16); nk.castShadow = false; }
    { const rk = new THREE.Group(); at(rk, 0.3, F, -0.35, ch); B(rk, 0.5, 0.03, 0.14, 0xeed2b2, 0, 0.015, 0); B(rk, 0.5, 0.03, 0.14, 0xeed2b2, 0, 0.2, 0); B(rk, 0.03, 0.22, 0.12, 0xeed2b2, -0.24, 0.11, 0); B(rk, 0.03, 0.22, 0.12, 0xeed2b2, 0.24, 0.11, 0);
      [0xf3a0b4, 0x9fb4f2, 0xffd98a, 0xa9d4b4, 0xc9a3e6].forEach((c, i) => { const x = -0.18 + i * 0.09; Cy(rk, 0.022, 0.022, 0.3, glassM, x, 0.2, 0, 14).castShadow = false; Cy(rk, 0.018, 0.018, 0.12 + (i % 3) * 0.04, glow(c, 0.25), x, 0.12 + (i % 3) * 0.02, 0, 12); }); }
    { const er = new THREE.Group(); at(er, 0.25, F, 0.3, ch); Cy(er, 0.03, 0.13, 0.22, glassM, 0, 0.11, 0, 24).castShadow = false; Cy(er, 0.06, 0.12, 0.09, glow(0x9fb4f2, 0.3), 0, 0.05, 0, 24); Cy(er, 0.03, 0.03, 0.08, glassM, 0, 0.26, 0, 16); }
    B(ch, 0.3, 0.005, 0.4, 0xfbf3e6, -0.35, F + 0.003, 0.4, 0).rotation.y = 0.4;
    // luck: a gold coin on its own little plinth beside the zoology pod; it spins, wobbles and lands
    const pl = new THREE.Group(); at(pl, 1.75, 0.15, 0.25, TR.g); TR.plinth = pl;
    Cy(pl, 0.36, 0.32, 0.2, 0xfbe6e0, 0, -0.1, 0, 36); Cy(pl, 0.34, 0.34, 0.02, 0xf6d6d0, 0, 0.01, 0, 36);
    const cpiv = new THREE.Group(); at(cpiv, 0, 0.02, 0, pl); const ctilt = new THREE.Group(); cpiv.add(ctilt);
    const coin = new THREE.Group(); coin.position.y = 0.2; coin.rotation.z = Math.PI / 2; ctilt.add(coin);
    const gold = mm(0xf2c46b, { metalness: 0.35, roughness: 0.35, emissive: 0x6a4410, emissiveIntensity: 0.25 });
    Cy(coin, 0.2, 0.2, 0.035, gold, 0, 0, 0, 48); for (const s of [-1, 1]) { const r0 = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.012, 8, 40), gold); r0.rotation.x = Math.PI / 2; r0.position.y = s * 0.018; coin.add(r0); Sp(coin, 0.05, gold, 0, s * 0.012, 0, 16).scale.y = 0.35; }
    TR.coin = { piv: cpiv, tilt: ctilt, coin };
  }

  // a few dream clouds drifting between the exam hall and the three little worlds, so the move has something to pass
  const driftC = new THREE.Group(); S.scene.add(driftC); const driftWin = [T('S2', 5) + 0.6, T('S2', 6) + 1.8];
  for (const [x, y, z, s0] of [[-15.6, -13.0, -8.2, 1.5], [-13.6, -14.3, -6.4, 1.2], [-17.6, -12.0, -9.8, 1.3], [-14.6, -12.2, -9.6, 0.9]]) { const c0 = cloud(driftC, s0); c0.position.set(x, y, z); c0.userData.s0 = s0; }
  // =================== S3: tonight in your room, and the rooms of tomorrow ===================
  // a desk against the back wall, right of the window: tomorrow's notes, the circled date above it, the shirt on the chair
  const DX = 1.42, DZ = room.backZ + 0.3;
  const ready = new THREE.Group(); S.scene.add(ready);
  {
    B(ready, 0.9, 0.04, 0.5, 0xfff0d2, DX, 0.74, DZ, 0.01);
    for (const [x, z] of [[-0.41, -0.21], [0.41, -0.21], [-0.41, 0.21], [0.41, 0.21]]) B(ready, 0.04, 0.72, 0.04, 0xeed2b2, DX + x, 0.36, DZ + z, 0.005);
    B(ready, 0.32, 0.14, 0.44, 0xeed2b2, DX + 0.27, 0.64, DZ, 0.01); Sp(ready, 0.012, 0xc99a5a, DX + 0.27, 0.64, DZ + 0.225, 8);
    // the speech notes: a stack and the top page, a pencil and a highlighter
    for (let i = 0; i < 5; i++) B(ready, 0.21, 0.004, 0.29, 0xfbf3e6, DX - 0.14 + i * 0.004, 0.762 + i * 0.004, DZ + 0.04, 0).rotation.y = 0.12 - i * 0.03;
    const notes = plane(ready, 0.21, 0.29, paperM(ruled(61, '#e8708a')), DX - 0.12, 0.786, DZ + 0.05, 0, -Math.PI / 2); notes.rotation.z = -0.05; ready.userData.notes = notes;
    const hl = Cy(ready, 0.012, 0.012, 0.13, 0xffd98a, DX + 0.06, 0.77, DZ + 0.12, 10); hl.rotation.set(Math.PI / 2, 0, 0.6);
    // a little desk lamp
    Cy(ready, 0.06, 0.07, 0.02, 0x8d82d6, DX + 0.32, 0.77, DZ - 0.12, 16); const lpost = Cy(ready, 0.01, 0.01, 0.32, 0xffd98a, DX + 0.32, 0.93, DZ - 0.12, 8); void lpost;
    const lsh = Cy(ready, 0.05, 0.1, 0.1, glow(0xf3a0b4, 0.4), DX + 0.27, 1.09, DZ - 0.08, 20); lsh.material.side = THREE.DoubleSide; Sp(ready, 0.03, glow(0xfff1c8, 1.2), DX + 0.27, 1.05, DZ - 0.08, 10);
    // the chair, turned to the desk, with tomorrow's shirt and tie on its back (towards the room), trousers folded on the seat
    const chr = put('dining_chair_02', ready, DX, 0, DZ + 0.62, Math.PI + 0.12, 0xb59be0, 1);
    const shirt = new THREE.Group(); chr.add(shirt);
    B(shirt, 0.46, 0.52, 0.05, 0xfff4ea, 0, 0.7, -0.3, 0.02).rotation.x = -0.05; B(shirt, 0.5, 0.06, 0.09, 0xfff4ea, 0, 0.98, -0.27, 0.02);
    B(shirt, 0.08, 0.44, 0.05, 0xfff4ea, -0.27, 0.73, -0.29, 0.02); B(shirt, 0.08, 0.44, 0.05, 0xfff4ea, 0.27, 0.73, -0.29, 0.02);
    B(shirt, 0.07, 0.34, 0.02, 0xe8708a, 0, 0.8, -0.34, 0.01); B(shirt, 0.1, 0.05, 0.03, 0xd44f6e, 0, 0.95, -0.335, 0.01); // tie
    B(shirt, 0.4, 0.05, 0.38, 0x6f5fb8, 0, 0.5, 0.02, 0.02);
    ready.userData.shirt = shirt;
    const bag = new THREE.Group(); at(bag, DX - 0.55, 0, DZ + 1.15, ready); bag.rotation.y = -0.5; B(bag, 0.42, 0.3, 0.12, 0x8d82d6, 0, 0.15, 0, 0.03); const hd = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 8, 20, Math.PI), mm(0x6f5fb8)); at(hd, 0, 0.3, 0, bag);
    for (const sx of [-0.07, 0.07]) B(ready, 0.09, 0.07, 0.24, 0x3a2a68, DX + 0.5 + sx, 0.035, DZ + 1.1, 0.03); // shoes
    // the gift for their parents
    const gb = new THREE.Group(); at(gb, DX - 0.62, 0, DZ + 0.3, ready); B(gb, 0.3, 0.3, 0.3, 0xf1b7a6, 0, 0.15, 0, 0.01); B(gb, 0.31, 0.31, 0.05, 0xffd98a, 0, 0.15, 0, 0.005); B(gb, 0.05, 0.31, 0.31, 0xffd98a, 0, 0.15, 0, 0.005); Sp(gb, 0.05, 0xffd98a, 0, 0.32, 0, 12).scale.set(1.4, 0.6, 0.8);
  }
  const calTex = canvasTex(320, 380, (g, w, h) => {
    g.fillStyle = '#fff8ee'; g.fillRect(0, 0, w, h); g.fillStyle = '#e8708a'; g.fillRect(0, 0, w, 70);
    g.fillStyle = '#fff8ee'; g.font = '600 40px "Avenir Next", sans-serif'; g.textAlign = 'center'; g.fillText('11', w / 2, 50);
    g.font = '500 26px "Avenir Next", sans-serif'; g.fillStyle = '#3a2a68';
    for (let d = 1; d <= 30; d++) { const c = (d + 3) % 7, r0 = Math.floor((d + 3) / 7); g.fillStyle = d < 13 ? 'rgba(58,42,104,.35)' : '#3a2a68'; g.fillText(String(d), 30 + c * 43, 110 + r0 * 52); if (d < 12) { g.strokeStyle = 'rgba(58,42,104,.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(16 + c * 43, 112 + r0 * 52); g.lineTo(44 + c * 43, 92 + r0 * 52); g.stroke(); } }
    const c = (13 + 3) % 7, r0 = Math.floor(16 / 7); g.strokeStyle = '#e8304a'; g.lineWidth = 5; g.beginPath(); g.ellipse(30 + c * 43, 101 + r0 * 52, 24, 21, -0.2, 0, 7); g.stroke();
  });
  const calendar = picture(S.scene, 0.34, 0.4, texMat(calTex, { color: 0xe4dcd8 }), DX - 0.05, 1.42, room.backZ + 0.03, 0xd9a0c4);
  const calCircle = V(DX - 0.05 + (116 / 320 - 0.5) * 0.34, 1.42 + (0.5 - 205 / 380) * 0.4, room.backZ + 0.07);
  // the old passed paper, pinned up beside it at the end
  const oldPaper = plane(S.scene, 0.22, 0.3, paperM(ruled(71)), DX + 0.3, 1.36, room.backZ + 0.03); oldPaper.rotation.z = -0.1;
  const oldMark = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.006, 8, 32), glow(0xe8304a, 0.4)); at(oldMark, DX + 0.36, 1.45, room.backZ + 0.036, S.scene);
  // the pen, on the nightstand, on a small stack of handed-in papers
  const stack = new THREE.Group(); at(stack, stand.position.x + 0.1, standTop, stand.position.z + 0.0, S.scene); stack.rotation.y = 0.3;
  for (let i = 0; i < 4; i++) B(stack, 0.15, 0.003, 0.2, 0xfbf3e6, i * 0.003, 0.002 + i * 0.0035, 0, 0).rotation.y = (i - 1.5) * 0.04;
  const pen2 = pen.clone(); at(pen2, stand.position.x + 0.1, standTop + 0.022, stand.position.z + 0.0, S.scene); pen2.rotation.y = 2.2; pen2.scale.setScalar(1.3);
  const deskLamp = new THREE.PointLight(0xffc89a, 0, 2.6, 1.6); deskLamp.position.set(DX + 0.27, 1.0, DZ + 0.05); S.scene.add(deskLamp);
  const deskSun = new THREE.SpotLight(0xffa878, 0, 9, 0.45, 0.6, 1.0); deskSun.position.set(DX - 1.6, 3.0, 1.6); deskSun.target.position.set(DX, 0.85, DZ + 0.45); S.scene.add(deskSun, deskSun.target);

  // ---------- tomorrow: three open-fronted rooms side by side, just above the bedroom ----------
  const TY = 3.45;
  const TM = island('tomorrow', V(0, TY, -0.3), { w: 8.4, d: 2.8, h: 2.4, wall: 0xe0d0f6, wall2: 0xd0bef0, floor: 0xf4d2c8, show: [[T('S3', 0) + 3.0, T('S3', 3) + 0.2], [T('S4', 0) - 0.6, T('S4', 3) + 0.9]] });
  const cellX = [-2.8, 0, 2.8];
  {
    const g = TM.g;
    for (const x of [-1.4, 1.4]) B(g, 0.12, TM.h, TM.d, 0xd6c6f2, x, TM.h / 2, 0, 0);
    B(g, 0.14, TM.h, TM.d, 0xd0bef0, TM.w / 2 + 0.07, TM.h / 2, 0, 0);
    const mx = cellX[0];
    B(g, 2.7, 0.02, TM.d, 0xe9d6f0, mx, 0.012, 0, 0);
    const chart = canvasTex(512, 300, (c, w, h) => { c.fillStyle = '#fffaf2'; c.fillRect(0, 0, w, h); const bars = [0.3, 0.45, 0.4, 0.62, 0.78];
      bars.forEach((v, i) => { c.fillStyle = ['#b59be0', '#e7a3b8', '#f5d1a0', '#9f8fd6', '#e8708a'][i]; c.fillRect(60 + i * 85, h - 40 - v * (h - 80), 56, v * (h - 80)); });
      c.strokeStyle = '#3a2a68'; c.lineWidth = 4; c.beginPath(); c.moveTo(40, h - 40); c.lineTo(w - 30, h - 40); c.stroke(); c.fillStyle = '#3a2a68'; c.fillRect(60, 24, 200, 14); });
    plane(g, 1.7, 1.0, new THREE.MeshBasicMaterial({ map: chart, toneMapped: false, color: 0xf0eaea }), mx, 1.55, -TM.d / 2 + 0.01);
    B(g, 1.8, 0.04, 0.06, 0x8d82d6, mx, 2.08, -TM.d / 2 + 0.04, 0.01);
    const mt = new THREE.Group(); at(mt, mx, F, -0.3, g); B(mt, 0.9, 0.05, 1.7, 0xfff0d2, 0, 0.74, 0, 0.012); B(mt, 0.7, 0.7, 1.4, 0xe9cfe0, 0, 0.36, 0, 0.02);
    for (const z of [-0.55, 0, 0.55]) for (const sx of [-1, 1]) { put('dining_chair_02', g, mx + sx * 0.66, F, -0.3 + z, sx < 0 ? 0.95 : -0.95, 0x9f8fd6, 1); B(mt, 0.16, 0.008, 0.22, 0xfbf3e6, sx * 0.28, 0.77, z, 0); Cy(mt, 0.03, 0.03, 0.09, glassM, sx * 0.3, 0.81, z - 0.16, 12).castShadow = false; }
    put('dining_chair_02', g, mx, F, -1.32, 0, 0x8d82d6, 1.05);
    const lp = new THREE.Group(); at(lp, mx, F + 0.765, 0.45, g); B(lp, 0.34, 0.015, 0.24, 0x8d82d6, 0, 0.008, 0, 0.006); const scr = new THREE.Group(); at(scr, 0, 0.015, 0.12, lp); scr.rotation.x = -1.95; B(scr, 0.34, 0.012, 0.22, 0x8d82d6, 0, 0, -0.11, 0.006); plane(scr, 0.3, 0.19, new THREE.MeshBasicMaterial({ map: chart, toneMapped: false, color: 0xd8d0d0 }), 0, -0.007, -0.11, 0, Math.PI / 2);
    plant(g, mx + 1.05, -1.1, 1.1);
    const ix = cellX[1];
    B(g, 2.7, 0.02, TM.d, 0xf6dcd4, ix, 0.012, 0, 0);
    const it = new THREE.Group(); at(it, ix, F, -0.55, g); B(it, 1.8, 0.05, 0.62, 0xfff0d2, 0, 0.74, 0, 0.012); B(it, 1.76, 0.66, 0.03, 0xd9a0c4, 0, 0.38, 0.28, 0.005);
    for (const x of [-0.6, 0, 0.6]) { put('dining_chair_02', g, ix + x, F, -1.05, 0, 0x6f5fb8, 1.05); const tent = B(it, 0.18, 0.07, 0.04, 0xfbf3e6, x, 0.8, 0.18, 0.004); tent.rotation.x = -0.3; Cy(it, 0.03, 0.03, 0.1, glassM, x + 0.22, 0.82, 0.05, 12).castShadow = false; }
    const resume = canvasTex(300, 400, (c, w, h) => { c.fillStyle = '#fbf3e6'; c.fillRect(0, 0, w, h); c.fillStyle = '#d9c4f2'; c.fillRect(24, 24, 70, 86); c.fillStyle = '#6f5fb8'; c.fillRect(110, 34, 150, 16); c.fillRect(110, 62, 100, 10);
      for (let y = 140; y < h - 30; y += 26) { c.fillStyle = 'rgba(90,80,140,.55)'; c.fillRect(30, y, 60 + ((y * 7) % 170), 8); } });
    TM.resume = plane(it, 0.24, 0.32, paperM(resume), 0.0, 0.768, 0.05, 0, -Math.PI / 2); TM.resume.rotation.z = 0.12;
    put('dining_chair_02', g, ix + 0.05, F, 0.55, Math.PI + 0.1, 0xb7a7e8, 1);
    const wc = new THREE.Group(); at(wc, ix + 0.8, 1.85, -TM.d / 2 + 0.03, g); wc.add(new THREE.Mesh(new THREE.CircleGeometry(0.14, 40), mm(0xfff7ec))); wc.add(new THREE.Mesh(new THREE.TorusGeometry(0.145, 0.016, 8, 40), mm(C.chair)));
    B(wc, 0.01, 0.09, 0.005, C.ink, 0, 0.04, 0.01, 0); B(wc, 0.008, 0.065, 0.005, C.ink, 0.025, -0.015, 0.012, 0).rotation.z = -2.4;
    picture(g, 0.5, 0.36, mm(0xf6d7c4), ix - 0.75, 1.65, -TM.d / 2 + 0.04, 0xc7a7dc);
    const dx = cellX[2];
    B(g, 2.7, 0.02, TM.d, 0xf3e2d6, dx, 0.012, 0, 0);
    B(g, 2.6, TM.h, 0.06, 0xf2c8c0, dx, TM.h / 2, -TM.d / 2 + 0.03, 0);
    const door = new THREE.Group(); at(door, dx - 0.45, F, -TM.d / 2 + 0.08, g); TM.door = door;
    B(g, 1.08, 2.18, 0.08, C.trim, dx, 1.09, -TM.d / 2 + 0.06, 0.01);
    TM.doorGlow = plane(g, 0.92, 2.02, new THREE.MeshBasicMaterial({ color: 0xffe0b0, toneMapped: false }), dx, 1.03, -TM.d / 2 + 0.065);
    B(door, 0.92, 2.02, 0.06, 0x9f8fd6, 0.46, 1.03, 0.02, 0.01); for (const y of [0.55, 1.5]) B(door, 0.7, 0.7, 0.03, 0xb59be0, 0.46, y, 0.05, 0.01);
    Sp(door, 0.03, 0xffd98a, 0.8, 1.0, 0.08, 12); B(door, 0.12, 0.04, 0.02, 0xffd98a, 0.46, 1.6 + 0.3, 0.07, 0.005);
    TM.lamp = Sp(g, 0.09, glow(0xffe0a0, 0.9), dx + 0.75, 1.75, -TM.d / 2 + 0.16, 16); B(g, 0.06, 0.18, 0.06, 0xffd98a, dx + 0.75, 1.62, -TM.d / 2 + 0.1, 0.01);
    B(g, 0.9, 0.025, 0.55, 0xe8708a, dx, F + 0.012, -0.85, 0.01); B(g, 0.78, 0.027, 0.43, 0xf3a0b4, dx, F + 0.014, -0.85, 0.005);
    const gift = (x, z, c, c2, s) => { const gb = new THREE.Group(); at(gb, x, F, z, g); gb.scale.setScalar(s); B(gb, 0.3, 0.36, 0.14, c, 0, 0.18, 0, 0.01); B(gb, 0.31, 0.05, 0.15, c2, 0, 0.3, 0, 0.005);
      const hd = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.01, 8, 20, Math.PI), mm(c2)); at(hd, 0, 0.36, 0, gb); Sp(gb, 0.05, 0xa9d4b4, -0.05, 0.4, 0, 12); Sp(gb, 0.045, 0xf3a0b4, 0.06, 0.4, 0.02, 12); return gb; };
    gift(dx - 0.85, -0.7, 0xf1b7a6, 0xffd98a, 1.1); gift(dx - 0.55, -0.55, 0xc9a3e6, 0xfff0d2, 0.9);
    const fb = new THREE.Group(); at(fb, dx + 0.65, F, -0.6, g); Cy(fb, 0.16, 0.12, 0.12, 0xeed2b2, 0, 0.06, 0); for (let i = 0; i < 6; i++) Sp(fb, 0.06, [0xff9a8a, 0xffd98a, 0xf3a07a][i % 3], Math.cos(i) * 0.08, 0.14 + (i > 3 ? 0.06 : 0), Math.sin(i) * 0.08, 12);
    plant(g, dx + 1.05, -1.05, 1.3);
  }
  const warmNew = new THREE.PointLight(0xffb070, 0, 9, 1.4); warmNew.position.set(cellX[2], TY + 2.2, 1.4); S.scene.add(warmNew);
  const warmOld = new THREE.PointLight(0xffb070, 0, 12, 1.4); S.scene.add(warmOld);

  // ---------- the classroom comes back for the second half, hanging just below the bedroom ----------
  const CY3 = -3.85;
  const clsShift = T('S1', 5) + 0.3; // hidden from here …
  const clsBack = T('S3', 2) + 0.4;  // … until here
  warmOld.position.set(0.5, CY3 + 3.0, 1.8);
  const cw = (x, y, z) => V(x, CY3 + y, z); // classroom-local → world, for the later visit

  // the corner behind the last desk on the right: a child's desk, then an office desk, then an exam desk again
  const CHX = 2.62, CHZ = -CD / 2 + 0.32;
  const kid = new THREE.Group(), office = new THREE.Group(), backToExam = new THREE.Group();
  for (const o of [kid, office, backToExam]) { at(o, CHX, 0, CHZ, cls); o.visible = false; }
  const crosses = [];
  {
    // a child's desk: low, rounded, a pencil case, crayons, an exercise book with red crosses; a drawing taped to the wall
    B(kid, 0.66, 0.035, 0.42, 0xf6c8d4, 0, 0.56, 0.06, 0.01); for (const [x, z] of [[-0.29, -0.13], [0.29, -0.13], [-0.29, 0.25], [0.29, 0.25]]) Cy(kid, 0.018, 0.018, 0.55, 0x9fb4f2, x, 0.275, z, 10);
    B(kid, 0.6, 0.12, 0.36, 0xc9a3e6, 0, 0.48, 0.06, 0.01);
    const kc = new THREE.Group(); at(kc, 0.05, 0, 0.62, kid); B(kc, 0.34, 0.03, 0.3, 0xffd98a, 0, 0.32, 0, 0.01); for (const [x, z] of [[-0.14, -0.12], [0.14, -0.12], [-0.14, 0.12], [0.14, 0.12]]) Cy(kc, 0.014, 0.014, 0.32, 0x9fb4f2, x, 0.16, z, 8); B(kc, 0.34, 0.26, 0.03, 0xffd98a, 0, 0.47, 0.14, 0.01); kc.rotation.y = Math.PI + 0.15;
    const ex = canvasTex(400, 280, (c, w, h) => { c.fillStyle = '#fbf6ee'; c.fillRect(0, 0, w, h); c.fillStyle = '#e2d6f6'; c.fillRect(w / 2 - 3, 0, 6, h);
      c.strokeStyle = '#c8d4f4'; c.lineWidth = 2; for (let y = 30; y < h; y += 24) { c.beginPath(); c.moveTo(14, y); c.lineTo(w - 14, y); c.stroke(); }
      const r0 = rng(81); c.fillStyle = 'rgba(80,70,140,.65)'; for (let y = 24; y < h - 10; y += 24) { let x = 22 + (y > h / 2 ? 0 : 0); while (x < w / 2 - 30) { const ww = 8 + r0() * 22; c.fillRect(x, y - 9, ww, 6); x += ww + 6; } x = w / 2 + 16; while (x < w - 30 - r0() * 40) { const ww = 8 + r0() * 22; c.fillRect(x, y - 9, ww, 6); x += ww + 6; } } });
    const book = plane(kid, 0.3, 0.21, paperM(ex), -0.06, 0.5785 + 0.002, 0.08, 0, -Math.PI / 2); book.rotation.z = 0.12;
    const xm = glow(0xe8304a, 0.5);
    [[-0.13, 0.03], [0.04, 0.11], [0.05, 0.01]].forEach(([x, z]) => { const g0 = new THREE.Group(); at(g0, -0.06 + x, 0.584, 0.08 + z, kid); for (const r of [0.75, -0.75]) { const b = box(0.008, 0.003, 0.055, xm, 0); b.rotation.y = r; g0.add(b); } crosses.push(g0); });
    B(kid, 0.18, 0.03, 0.06, 0x9fb4f2, 0.22, 0.594, -0.05, 0.01); [0xe8708a, 0xffd98a, 0xa9d4b4, 0x9f8fd6].forEach((c, i) => { const cr = Cy(kid, 0.007, 0.007, 0.09, c, 0.16 + i * 0.03, 0.588, 0.14, 8); cr.rotation.x = Math.PI / 2; });
    const dr = canvasTex(256, 200, (c, w, h) => { c.fillStyle = '#fffaf2'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffd98a'; c.beginPath(); c.arc(200, 50, 30, 0, 7); c.fill(); c.fillStyle = '#a9d4b4'; c.fillRect(0, 160, w, 40);
      c.fillStyle = '#f3a0b4'; c.fillRect(50, 100, 70, 60); c.fillStyle = '#9f8fd6'; c.beginPath(); c.moveTo(40, 100); c.lineTo(85, 62); c.lineTo(130, 100); c.fill(); c.fillStyle = '#e8708a'; for (const x of [160, 190]) { c.beginPath(); c.arc(x, 145, 10, 0, 7); c.fill(); } });
    plane(kid, 0.36, 0.28, texMat(dr, { color: 0xe8e2e2 }), -0.12, 1.2, -0.28, 0, 0).rotation.z = 0.06;
    B(kid, 0.05, 0.05, 0.005, 0xa9d4b4, -0.27, 1.32, -0.275, 0.002);
    // the office desk: a monitor, a keyboard, a mug, a lanyard badge (abstract, no photo), sticky notes everywhere, a calendar packed full
    B(office, 1.0, 0.04, 0.55, 0xfff0d2, 0, 0.74, 0.08, 0.01); for (const x of [-0.46, 0.46]) B(office, 0.04, 0.72, 0.5, 0xd9c4f2, x, 0.36, 0.08, 0.005);
    B(office, 0.06, 0.2, 0.06, 0x8d82d6, 0, 0.86, -0.06, 0.01); B(office, 0.56, 0.34, 0.03, 0x8d82d6, 0, 1.12, -0.06, 0.012);
    const scr = canvasTex(300, 180, (c, w, h) => { c.fillStyle = '#fffaf2'; c.fillRect(0, 0, w, h); c.fillStyle = '#e7a3b8'; c.fillRect(0, 0, w, 22); c.fillStyle = '#b59be0'; for (let i = 0; i < 6; i++) c.fillRect(20, 40 + i * 22, 120 + (i * 37) % 120, 9); c.fillStyle = '#f5d1a0'; c.fillRect(200, 40, 80, 110); });
    plane(office, 0.52, 0.3, new THREE.MeshBasicMaterial({ map: scr, toneMapped: false, color: 0xe8e0e0 }), 0, 1.12, -0.043);
    B(office, 0.4, 0.015, 0.13, 0xe6d6f6, -0.02, 0.768, 0.2, 0.005); Cy(office, 0.04, 0.035, 0.09, 0xe8708a, 0.36, 0.805, 0.18, 16);
    const badge = new THREE.Group(); at(badge, -0.3, 0.765, 0.25, office); badge.rotation.y = 0.4; B(badge, 0.08, 0.004, 0.11, 0xffffff, 0, 0, 0, 0.003); B(badge, 0.08, 0.005, 0.03, 0x9fb4f2, 0, 0.001, -0.04, 0.002); B(badge, 0.05, 0.005, 0.008, 0x8d82d6, 0, 0.001, 0.015, 0.001); B(badge, 0.04, 0.005, 0.008, 0x8d82d6, 0, 0.001, 0.03, 0.001);
    const lan = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.005, 6, 30, Math.PI * 1.2), mm(0x9fb4f2)); lan.rotation.x = -Math.PI / 2; at(lan, -0.3, 0.768, 0.12, office);
    const full = canvasTex(320, 300, (c, w, h) => { c.fillStyle = '#fff8ee'; c.fillRect(0, 0, w, h); c.fillStyle = '#9f8fd6'; c.fillRect(0, 0, w, 50);
      const r0 = rng(91); for (let d = 0; d < 35; d++) { const x = 12 + (d % 7) * 43, y = 62 + Math.floor(d / 7) * 46; c.fillStyle = ['#f3a0b4', '#ffd98a', '#a9d4b4', '#9fb4f2', '#e8708a'][Math.floor(r0() * 5)]; c.fillRect(x, y, 38, 12); if (r0() > 0.3) c.fillRect(x, y + 16, 26, 10); if (r0() > 0.5) c.fillRect(x, y + 30, 32, 8); } });
    plane(office, 0.4, 0.38, texMat(full, { color: 0xe6dede }), 0.25, 1.62, -0.28);
    office.userData.notes = [];
    [[-0.38, 1.42, 0xffd98a], [-0.26, 1.56, 0xf3a0b4], [-0.4, 1.7, 0xa9d4b4], [-0.22, 1.36, 0x9fb4f2], [0.0, 1.5, 0xffd98a], [-0.12, 1.72, 0xf3a0b4], [0.27, 1.25, 0xa9d4b4], [0.13, 1.33, 0xffd98a]].forEach(([x, y, c], i) => {
      const n = B(office, 0.11, 0.11, 0.006, c, x, y, -0.27 + i * 0.0005, 0.002); n.rotation.z = (i % 3 - 1) * 0.12; office.userData.notes.push(n); });
    [[-0.27, 1.27, 0xffd98a], [0.27, 1.25, 0xf3a0b4]].forEach(([x, y, c]) => { const n = B(office, 0.07, 0.07, 0.006, c, x, y - 0.12, -0.03, 0.002); office.userData.notes.push(n); });
    put('chair', office, 0.0, 0, 0.62, Math.PI, 0x8d82d6, 1);
    // and an exam desk again
    put('desk', backToExam, 0, 0, 0.1, 0, null, 1); put('chair', backToExam, 0, 0, 0.1 + ds.z / 2 + 0.3, Math.PI, null, 1);
    plane(backToExam, PW, PH, paperM(ruled(83)), 0, deskTop + 0.004, 0.1, 0, -Math.PI / 2);
  }

  // ---------- underneath your desk: a warm chamber with the calendar, and the archive of old exams ----------
  const UN = island('under', V(myX + 0.5, CY3 - 3.1, myZ - 0.6), { w: 3.6, d: 2.6, h: 2.45, wall: 0xd9b6dc, wall2: 0xcaa8d6, floor: 0xe8bcb4, base: 0xf0d4e4, show: [T('S3', 11) + 1.0, T('S4', 0) + 1.3] });
  const drawers = [];
  {
    const g = UN.g;
    // the calendar on a little pedestal, right under the trapdoor
    Cy(g, 0.3, 0.34, 0.5, 0xfbe6e0, -0.5, 0.25, 0.6, 32); Cy(g, 0.32, 0.32, 0.03, 0xf6c8d4, -0.5, 0.51, 0.6, 32);
    const cal2 = picture(g, 0.34, 0.4, texMat(calTex, { color: 0xe8e0dc }), -0.5, 0.74, 0.62, 0xd9a0c4); cal2.rotation.x = -1.05; UN.cal = cal2;
    UN.circle = () => cal2.localToWorld(V((116 / 320 - 0.5) * 0.34, (0.5 - 205 / 380) * 0.4, 0.03));
    UN.ring = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.008, 8, 40), glow(0xff8a6a, 0)); UN.ring.position.set((116 / 320 - 0.5) * 0.34, (0.5 - 205 / 380) * 0.4, 0.03); UN.ring.scale.y = 0.85; cal2.add(UN.ring);
    // the archive: a tall cabinet of drawers on the back wall
    const cab = new THREE.Group(); at(cab, 0.5, 0, -0.95, g); UN.cab = cab;
    B(cab, 1.92, 2.3, 0.5, 0x9f8fd6, 0, 1.15, 0, 0.02); B(cab, 2.0, 0.06, 0.56, 0xe6b980, 0, 2.33, 0.01, 0.01);
    const ticket = canvasTex(256, 180, (c, w, h) => { c.fillStyle = '#fbf3e6'; c.fillRect(0, 0, w, h); c.fillStyle = '#d9c4f2'; c.fillRect(16, 20, 60, 76); c.fillStyle = '#8d82d6'; c.fillRect(92, 26, 130, 12); c.fillRect(92, 50, 90, 9); c.fillRect(92, 70, 110, 9); c.strokeStyle = '#e8708a'; c.lineWidth = 3; c.strokeRect(6, 6, w - 12, h - 12); });
    const rr = rng(17);
    for (let r0 = 0; r0 < 4; r0++) for (let c0 = 0; c0 < 3; c0++) {
      const d = new THREE.Group(); at(d, -0.6 + c0 * 0.6, 0.32 + r0 * 0.55, 0.0, cab);
      B(d, 0.56, 0.5, 0.04, [0xcdb8ee, 0xe6b8d0, 0xbfaee8][(r0 + c0) % 3], 0, 0, 0.27, 0.01);
      B(d, 0.16, 0.04, 0.04, 0xffd98a, 0, 0.08, 0.31, 0.01); B(d, 0.12, 0.08, 0.006, 0xfbf3e6, 0, -0.07, 0.293, 0.002);
      B(d, 0.5, 0.2, 0.46, 0xeed2b2, 0, -0.1, 0.03, 0.005);
      for (let i = 0; i < 3; i++) B(d, 0.36, 0.004, 0.36, 0xfbf3e6, (rr() - 0.5) * 0.04, 0.005 + i * 0.006, 0.03, 0).rotation.y = (rr() - 0.5) * 0.2;
      const top = plane(d, 0.3, 0.21, paperM(ticket), 0, 0.03, 0.05, 0, -Math.PI / 2); top.rotation.z = (rr() - 0.5) * 0.3;
      d.userData.z0 = 0; drawers.push(d);
    }
    UN.passDrawer = drawers[7]; UN.failDrawer = drawers[3]; // r2c1 holds the passed paper, r1c0 the failed one
    UN.failPaper = plane(UN.failDrawer, 0.3, 0.4, paperM(ruled(42, '#9f97c0'), 0xc8c0cc), 0.0, 0.04, 0.12, 0, -Math.PI / 2);
    UN.failPaper.rotation.z = 0.1;
    // the passed paper: its own object, so it can float out of its drawer and onto the desk
    const pp = canvasTex(300, 400, (c, w, h) => { c.fillStyle = '#fbf3e6'; c.fillRect(0, 0, w, h); const r0 = rng(23); c.fillStyle = '#8d82d6'; c.fillRect(70, 28, 160, 16); c.fillRect(100, 54, 100, 8);
      for (let y = 92; y < h - 24; y += 24) { c.fillStyle = 'rgba(90,80,140,.55)'; let x = 30; while (x < w - 70 - r0() * 60) { const ww = 8 + r0() * 30; c.fillRect(x, y, ww, 6); x += ww + 6; } }
      // nervous doodles in the margin: spirals, stars, a little cloud
      c.strokeStyle = '#e8708a'; c.lineWidth = 3; c.beginPath(); for (let a = 0; a < 18; a += 0.2) c.lineTo(262 + Math.cos(a) * a * 1.4, 120 + Math.sin(a) * a * 1.4); c.stroke();
      c.strokeStyle = '#9fb4f2'; c.beginPath(); for (let i = 0; i < 11; i++) { const a = i / 10 * Math.PI * 2 + Math.PI / 2, r1 = i % 2 ? 7 : 16; c.lineTo(262 + Math.cos(a) * r1, 230 - Math.sin(a) * r1); } c.stroke();
      c.strokeStyle = '#c9a3e6'; c.beginPath(); c.arc(256, 320, 10, Math.PI, 0); c.arc(272, 318, 8, Math.PI, 0); c.lineTo(282, 330); c.lineTo(246, 330); c.closePath(); c.stroke();
      c.strokeStyle = '#e8304a'; c.lineWidth = 5; c.beginPath(); c.ellipse(232, 40, 40, 26, -0.1, 0, 7); c.stroke(); c.fillStyle = '#e8304a'; c.fillRect(214, 34, 36, 10); });
    UN.passed = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.4), paperM(pp, 0xe0d6d6)); g.add(UN.passed); UN.passed.castShadow = true;
    // an exam desk at the front right, where the passed paper is laid down
    put('desk', g, 1.25, F, 0.75, -0.25, null, 1); put('chair', g, 1.4, F, 0.75 + ds.z / 2 + 0.3, Math.PI - 0.25, null, 1);
    UN.deskTop = V(1.25, F + deskTop + 0.004, 0.75);
    // soft glows
    for (const [x, z] of [[-1.4, 0.9], [1.6, -0.6]]) { Cy(g, 0.012, 0.012, 0.5, 0x8d82d6, x, 2.2, z, 6); Sp(g, 0.09, glow(0xffe0b0, 1.0), x, 1.9, z, 14); }
  }
  const underLight = new THREE.PointLight(0xffc8a0, 0, 6, 1.4); underLight.position.copy(UN.p(0, 2.0, 1.2)); S.scene.add(underLight);
  const calLight = new THREE.PointLight(0xffb48a, 0, 2.2, 1.6); calLight.position.copy(UN.p(-0.5, 1.4, 1.0)); S.scene.add(calLight);
  const passPos = t => { // where the passed paper is: in its drawer → lifted towards you → laid on the desk
    const inDrawer = UN.g.worldToLocal(UN.passDrawer.localToWorld(V(0, 0.045, 0.05)));
    const lift = UN.p(0.5, 1.75, 0.45).sub(UN.g.position), desk = UN.deskTop.clone();
    const u1 = ke(t, EV.paperRise, EV.paperRise + 0.9), u2 = ke(t, EV.paperLand, EV.paperLand + 1.4);
    const p = inDrawer.clone().lerp(lift, u1).lerp(desk, u2); p.y += Math.sin(u2 * Math.PI) * 0.35 + (1 - u2) * u1 * Math.sin(t * 1.6) * 0.02;
    return { p, rx: -Math.PI / 2 * (1 - u1) - Math.PI / 2 * u2, rz: 0.08 * (1 - u1) + u2 * -0.3 };
  };

  // ---------- the thread: from the dream's exam paper up to tonight's notes and the circled date ----------
  const atPaper3 = cw(myX - 0.02, deskTop, myZ);
  const pNotes = V(DX - 0.12, 0.8, DZ + 0.05);
  const thread = S.kit.ribbon([atPaper3.clone().add(V(0, 0.02, 0)), cw(0.5, 1.6, 4.0), V(2.05, -0.8, 3.0), V(2.0, 1.0, 1.4), pNotes.clone().add(V(0, 0.05, 0.12)), calCircle.clone().add(V(0, -0.02, 0.05))], { radius: 0.022, color: 0xfff0f6, emissive: 0xff9ac0 });
  thread.show(0, 0);

  // ---------- the line in S4: that exam → tonight → tomorrow ----------
  const pOld = cw(0.6, 1.7, 1.2), pBed = V(bx + 0.1, bedTop + 0.35, bz + 0.2), pNew = V(cellX[2], TY + 1.1, 0.4);
  const bow = (a, b, k0) => a.clone().lerp(b, 0.5).add(V(k0 * 0.55, 0, k0 * 0.75));
  const arcA = [pOld, bow(pOld, pBed, 2.6), pBed], arcB = [pBed, bow(pBed, pNew, 2.2), pNew];
  const R = { a: S.kit.ribbon(arcA, { radius: 0.06, color: 0xfff6ff, emissive: 0xe8dcff }), b: S.kit.ribbon(arcB, { radius: 0.06, color: 0xfff6ff, emissive: 0xe8dcff }),
    wa: S.kit.ribbon(arcA, { radius: 0.1 }), wb: S.kit.ribbon(arcB, { radius: 0.1 }) };
  for (const r0 of Object.values(R)) r0.show(0, 0);
  const bead = S.kit.bead({ radius: 0.2 });

  // =================== camera ===================
  const atWindow = V(room.window.x - 0.1, room.window.y - 0.05, room.backZ);
  const atAlarm = S.wpos(alarm).add(V(0, 0.07, 0));
  const deskEye = V(myX - 0.02, CY + 1.17, myZ + 0.62);
  const atPaper = V(myX - 0.02, CY + deskTop, myZ + 0.0);
  const atPen = V(myX + 0.08, CY + deskTop, myZ + 0.05);
  const atBoard = V(0.2, CY + 1.6, -CD / 2);
  const atWall = S.wpos(clockG);
  const atRoom = V(-1.2, CY + 1.0, 0.2);
  const bedWide = [-1.0, 0.6, 0.6], clsWide = [0, CY + 0.9, 0.2];
  const deskEye3 = cw(myX - 0.02, 1.17, myZ + 0.62), atWall3 = cw(1.25, 2.72, -CD / 2 + 0.04);

  const sink1 = [T('S1', 0) - 0.6, T('S1', 0) + 2.4], rise1 = [T('S1', 4) + 0.15, T('S1', 4) + 2.3];
  const sink2 = [E('S1', 5) - 0.9, S2a + 1.3];
  const toBed = [T('S3', 0) - 0.1, T('S3', 0) + 1.5];
  const toTmrw = [T('S3', 1) + 0.3, T('S3', 1) + 1.6];
  const rise2 = [T('S4', 3) - 0.5, T('S4', 3) + 1.1];
  const inDream = t => k(t, ...sink1) * (1 - k(t, ...rise1)) + k(t, ...sink2) * (1 - k(t, ...toBed)) + k(t, ...toTmrw) * (1 - k(t, ...rise2));
  const transit = t => bump(t, sink1[0] - 0.4, sink1[1] + 0.4) + bump(t, rise1[0] - 0.3, rise1[1] + 0.3) + bump(t, sink2[0] - 0.3, sink2[1] + 0.2) + bump(t, toBed[0] - 0.4, toBed[1] + 0.2) + bump(t, toTmrw[0] - 0.3, toTmrw[1] + 0.2) + bump(t, rise2[0] - 0.4, rise2[1] + 0.4);
  const morning = t => k(t, T('S1', 4) + 0.9, T('S1', 4) + 3.0) * (1 - k(t, T('S1', 5) + 0.2, E('S1', 5) - 0.1)) + k(t, EV.dawn, EV.dawn + 1.4);
  S.flashes.push(T('S1', 4) + 0.05);

  const ST_book = S.wpos(ST.book), ST_photo = S.wpos(ST.photo);
  const stMid = ST_photo.clone().lerp(ST_book, 0.5).add(V(-0.35, -0.25, 0.2));
  const brC = BR.p(-0.1, 1.55, 0.1), hlC = HL.p(0, 1.35, 0.1), hlUp = HL.p(-0.35, 1.55, 0.5);
  const trC = TR.p(0.35, -0.35, 0);
  const bedC = V(0.1, 0.55, 0.35), deskC = V(DX - 0.1, 1.0, DZ + 0.35);
  const cellEye = i => V(cellX[i], TY + 1.5, 2.05), cellLook = i => V(cellX[i] - 0.05, TY + 0.95, -0.9);
  const lampC = ST.desk.localToWorld(V(-0.15, 0.95, 0.05)), keysC = ST.music.localToWorld(V(0, 0.82, 0.3)), stageC = ST.stage.localToWorld(V(0, 0.2, 0.05));
  const kidC = cw(CHX - 0.05, 0.62, CHZ + 0.15);
  const calUnder = UN.cal.localToWorld(V(0, 0, 0)), cabC = UN.cab.localToWorld(V(0, 1.15, 0.3));
  const liftC = UN.p(0.5, 1.75, 0.45), deskU = UN.deskTop.clone().add(UN.g.position);
  const lineC = V(0.4, -0.3, 0.6);

  const SH = [
    shot(S2a + 1.4, stMid, 6.4, [0.85, 0.42, 1], 36, 1.5),                          // S2_0 the study: Freud on the wall
    shot(T('S2', 1) + 1.3, ST_book, 1.25, [0.25, 1.0, 0.95], 36, 1.6),               // S2_1 the book on the desk
    shot(T('S2', 1) + 3.4, ST_book.clone().add(V(0, 0.08, 0)), 1.75, [0.35, 0.75, 1], 36, 1.4), //      a typical dream: its loop
    shot(T('S2', 2) + 1.1, brC, 10.6, [0.28, 0.5, 1], 34, 1.9),                      // S2_2 two bedrooms
    shot(T('S2', 3) + 0.9, brC.clone().add(V(0.3, 0, 0)), 10.2, [0.18, 0.45, 1], 34, 1.4),
    shot(T('S2', 4) + 1.1, hlC, 8.2, [0.8, 0.55, 1], 34, 1.9),                       // S2_4 the exam hall
    shot(T('S2', 5) + 1.0, hlUp, 9.4, [0.9, 0.45, 1], 34, 1.4),                     // S2_5 the path that never reaches the cloud
    shot(T('S2', 6) + 1.1, trC, 13.2, [0.45, 0.3, 1], 34, 1.3),                      // S2_6 three little worlds
    shot(T('S2', 7) + 3.2, trC, 12.4, [0.35, 0.28, 1], 34, 3.0),                     // S2_7 luck, and passed
    shot(T('S3', 0) + 1.2, bedC, 15, [1, 1.4, 1.1], 28, 1.4),                       // S3_0 tonight, in your room
    shot(T('S3', 0) + 3.3, deskC, 3.4, [0.22, 0.32, 1], 40, 1.5),                    //      the shirt, the notes, the circled date
    pov(T('S3', 1) + 1.6, cellEye(0), cellLook(0), 52, 1.3),                          // S3_1 tomorrow: the meeting room
    pov(T('S3', 1) + 3.2, cellEye(1), cellLook(1), 52, 0.8),                        //      the interview
    pov(T('S3', 2) + 0.8, cellEye(2), cellLook(2), 52, 0.9),                        // S3_2 their parents' door
    pov(T('S3', 3) + 1.1, deskEye3, atPaper3, 42, 1.8),                             // S3_3 the dream's exam paper…
    pov(T('S3', 3) + 2.6, deskEye3, atWall3, 30, 1.0),                              //      …the second hand
    shot(T('S3', 4) + 1.2, V(0.9, -1.9, 0.9), 13.5, [0.95, 0.3, 1], 34, 1.6),        // S3_4 the thread, up to tonight
    shot(T('S3', 4) + 3.0, V(DX - 0.08, 1.08, DZ + 0.1), 2.3, [0.2, 0.3, 1], 40, 1.6), //      the notes and the circled date
    shot(T('S3', 5) + 0.4, V(1.6, -1.6, 0), 8.5, [0.4, 0.2, 1], 36, 0.9),            //      pull out of the bedroom
    shot(T('S3', 5) + 1.5, kidC, 2.5, [0.35, 0.42, 1], 40, 1.1),                    // S3_5 a child's desk
    shot(T('S3', 6) + 1.2, kidC.clone().add(V(0, 0.28, 0)), 2.9, [0.28, 0.36, 1], 40, 1.0), // S3_6 the office desk
    shot(T('S3', 7) + 1.4, cw(1.4, 0.9, -1.2), 7.0, [0.6, 0.45, 1], 34, 1.3),        // S3_7 back in the exam room
    shot(T('S3', 8) + 1.5, lampC, 1.9, [0.3, 0.75, 1], 38, 1.9),                     // S3_8 the lamp, the book
    shot(T('S3', 9) + 0.55, keysC, 1.7, [1, 0.45, 0.35], 40, 1.0),                   // S3_9 the piano
    shot(T('S3', 10) + 0.8, stageC, 1.25, [1, 0.3, 0.3], 38, 1.0),                   // S3_10 the toy stage
    shot(T('S3', 11) + 0.3, stMid, 7.2, [0.85, 0.42, 1], 36, 1.4),                    //      out of the study
    shot(T('S3', 11) + 1.05, atPaper3, 6.5, [0.25, 0.35, 1], 38, 0.75),             //      up past the classroom's open side
    shot(T('S3', 11) + 1.9, atPaper3, 1.9, [0.05, 1, 0.2], 40, 0.85),                 // S3_11 your desk, from above…
    shot(T('S3', 12) + 0.6, calUnder, 1.3, [0.02, 1, 0.28], 40, 1.6),                // S3_12 …through it, to the calendar underneath
    shot(T('S3', 13) + 1.2, cabC.clone().add(V(0.2, -0.2, 0.4)), 6.6, [0.3, 0.22, 1], 40, 1.6),                     // S3_13 the archive
    shot(T('S3', 14) + 1.1, liftC, 1.5, [0.12, 0.1, 1], 38, 1.0),                    // S3_14 the passed paper
    shot(T('S3', 15) + 0.9, UN.p(0.3, 1.05, 0.1), 4.4, [0.3, 0.25, 1], 40, 1.0),     // S3_15 the failed one goes back…
    shot(T('S3', 15) + 3.9, deskU, 1.8, [0.3, 0.8, 0.8], 38, 1.6),                   //       …the passed one is laid down
    shot(T('S4', 0) + 2.3, lineC, 33.5, [0.62, 0.2, 1], 28, 2.8),                       // S4_0 that exam, tonight, tomorrow
    shot(E('S4', 2) - 0.3, lineC.clone().add(V(0, 0.1, 0)), 32.5, [0.55, 0.2, 1], 28, 6),
    pov(T('S4', 3) + 1.9, bedEye, atWindow, 42, 1.9),                                 // S4_3 dawn, through the window
    shot(T('S4', 4) + 1.4, deskC.clone().add(V(0, -0.1, 0.15)), 3.0, [0.32, 0.42, 1], 40, 1.6), // S4_4 light on the shirt and notes
    shot(T('S4', 5) + 1.2, V(DX + 0.1, 1.4, room.backZ), 1.5, [0.05, 0.1, 1], 40, 1.3), // S4_5 the circled date and the old paper
    shot(T('S4', 6) + 0.6, V(stand.position.x, standTop + 0.08, stand.position.z - 0.02), 3.4, [-0.25, 1.8, 1], 38, 1.3), //      back off to the nightstand
    shot(T('S4', 6) + 1.6, V(stand.position.x + 0.0, standTop + 0.08, stand.position.z - 0.02), 1.3, [-1, 1.5, 0.55], 40, 0.9), // S4_6 the pen
  ];

  // shadow light follows the set in view (a pure function of t); [time, focus, light offset]
  const L0 = V(-6, 6, 1.5), L1 = V(4, 6, 6);
  const focusKeys = [
    [0, V(0, CY, 0), L0], [T('S1', 5), V(0, CY, 0), L0], [sink2[1] - 0.5, ST.g.position, L0], [T('S2', 2) - 0.3, ST.g.position, L0], [T('S2', 2) + 0.6, BR.g.position, L0],
    [T('S2', 4) - 0.3, BR.g.position, L0], [T('S2', 4) + 0.6, HL.g.position, L0], [T('S2', 6) - 0.3, HL.g.position, L0], [T('S2', 6) + 0.6, TR.g.position, L0],
    [T('S3', 1) + 0.4, TR.g.position, L0], [T('S3', 1) + 1.2, TM.g.position, L0], [T('S3', 2) + 1.4, TM.g.position, L0], [T('S3', 3) + 0.6, V(0, CY3, 0), L0],
    [T('S3', 4) + 0.2, V(0, CY3, 0), L0], [T('S3', 4) + 1.4, V(0.8, -1.5, 0), L0], [T('S3', 5) + 0.2, cw(CHX - 1, 0, CHZ + 1), L0], [T('S3', 7) + 0.6, cw(CHX - 1, 0, CHZ + 1), L0],
    [T('S3', 7) + 1.6, V(0, CY3, 0), L0], [T('S3', 8) + 0.6, ST.g.position, L0], [T('S3', 11) - 0.2, ST.g.position, L0], [T('S3', 11) + 0.8, cw(myX, 0, myZ), L0],
    [T('S3', 12) - 0.9, cw(myX, 0, myZ), L0], [T('S3', 12) + 0.1, UN.g.position, L1], [T('S4', 0) + 0.4, UN.g.position, L1], [T('S4', 0) + 2.0, V(0.5, -0.5, 0), L0], [1e9, V(0.5, -0.5, 0), L0],
  ];
  const focus = t => { let i = focusKeys.findIndex(f => f[0] > t); if (i <= 0) return [focusKeys[0][1], L0]; const [t0, a, la] = focusKeys[i - 1], [t1, b, lb] = focusKeys[i]; const u = k(t, t0, t1); return [a.clone().lerp(b, u), la.clone().lerp(lb, u)]; };

  // =================== 2D layer: big labels pinned to the sets ===================
  const O = S.overlay;
  const CHIP = 'rgba(70,46,138,.74)', CHIP2 = 'rgba(214,92,118,.86)', CHIP3 = 'rgba(122,106,168,.82)', MUTED_STAMP = '#7a6aa8';
  O.theme({ ink: '#fff6ea', labelShadow: '0 2px 16px rgba(58,32,108,.62), 0 0 3px rgba(58,32,108,.5)', chipShadow: '0 10px 30px rgba(60,30,110,.28)',
    paperShadow: '0 18px 40px rgba(64,36,120,.36), 0 2px 6px rgba(64,36,120,.28), inset 0 0 40px rgba(180,140,100,.14)', stamp: '#d44f6e' });
  /** screen position of a world point (after the camera is placed for this frame), kept inside the frame and above the subtitles */
  const pin = (p, dx = 0, dy = 0, mx = 200) => () => {
    const v = (typeof p === 'function' ? p() : p.isObject3D ? S.wpos(p) : p).clone(); S.camera.updateMatrixWorld(); v.project(S.camera);
    if (Math.abs(v.x) > 1.15 || Math.abs(v.y) > 1.15 || v.z > 1) return [-3000, -3000]; // well out of shot: park it off-frame
    return [clamp((v.x + 1) / 2 * 1080 + dx, mx, 1080 - mx), clamp((1 - v.y) / 2 * 1920 + dy, 90, 1250)];
  };
  // keep every pinned label/stamp wholly inside the frame: clamp its centre by its own rendered width (the text is set before pos() is read)
  const fit = make => o => {
    let el; const p = o.pos;
    el = make(p ? { ...o, pos: t => { const [x, y] = p(t); if (x < -1000 || !el) return [x, y]; const h = el.offsetWidth / 2 + 28; return [clamp(x, h, 1080 - h), y]; } } : o);
    return el;
  };
  const tag = fit(o => O.label({ font: 'sans', size: 64, color: '#fff6ea', bg: CHIP, ...o }));
  const tag2 = fit(o => O.label({ font: 'sans', size: 50, color: '#fff6ea', bg: CHIP, ...o }));
  const stampF = fit(o => O.stamp(o));

  // S2_0 · S2_1
  tag({ at: S2a + 1.3, out: T('S2', 1) + 0.2, pos: pin(ST_photo, 0, -250, 330), zh: '西格蒙德·弗洛伊德', en: 'Sigmund Freud' });
  tag2({ at: S2a + 1.6, out: T('S2', 1) + 0.2, pos: pin(ST_photo, 0, 235, 200), zh: '一百多年前', en: 'over 100 years ago', bg: 'rgba(70,46,138,.55)' });
  tag({ at: T('S2', 1) + 1.1, out: T('S2', 1) + 2.85, pos: pin(ST_book, 0, -380, 300), zh: '《梦的解析》', en: 'The Interpretation of Dreams', size: 60 });
  tag({ at: T('S2', 1) + 3.0, out: E('S2', 1) + 0.3, pos: pin(ST_book, 0, -400, 260), zh: '典型的梦', en: 'a typical dream', bg: CHIP2 });
  tag2({ at: T('S2', 1) + 3.5, out: E('S2', 1) + 0.3, pos: pin(ST_book, 0, 330, 280), zh: '几乎人人都做', en: 'nearly everyone has it' });
  // S2_2 · S2_3
  stampF({ at: EV.passBR, out: E('S2', 3) + 0.5, pos: pin(BR.passPaper, 0, 20, 100), zh: '通过', en: 'PASSED', size: 52 });
  tag({ at: T('S2', 2) + 2.4, out: E('S2', 3) + 0.5, pos: pin(BR.cloud, 0, -190, 280), zh: '会做这个梦', en: 'has the dream', bg: CHIP2 });
  stampF({ at: EV.failBR, out: E('S2', 3) + 0.5, pos: pin(BR.failPaper, 0, 20, 100), zh: '不及格', en: 'FAILED', size: 50, color: MUTED_STAMP });
  tag({ at: T('S2', 3) + 1.0, out: E('S2', 3) + 0.5, pos: pin(BR.p(0.98, 2.15, -0.3), -110, -60, 150), zh: '不做', en: 'doesn’t' });
  // S2_4 · S2_5
  tag({ at: T('S2', 4) + 1.1, out: T('S2', 5) + 0.9, pos: pin(HL.p(0, 2.75, -1.2), 0, -60, 330), zh: '法医学', en: 'Forensic medicine' });
  stampF({ at: EV.hallFail, out: E('S2', 5) - 0.2, pos: pin(HL.paper, 0, -10, 120), zh: '挂科', en: 'FAILED', size: 60, color: '#d44f6e' });
  tag2({ at: T('S2', 5) + 1.2, out: E('S2', 5) - 0.2, pos: pin(HL.p(0.7, 3.0, 1.0), 0, -150, 260), zh: '从没进过梦里', en: 'never in his dreams', bg: CHIP3 });
  // S2_6 · S2_7
  [['植物学', 'Botany', 1], ['动物学', 'Zoology', -1], ['化学', 'Chemistry', 1]].forEach(([zh, en, side], i) => {
    const pod = TR.pods[i].g;
    tag({ at: EV.pods[i] + 0.25, out: E('S2', 7) - 0.15, pos: pin(() => pod.localToWorld(V(side * 0.95, 0.75, 0.2)), side * 150, -40, 210), zh, en });
    stampF({ at: EV.pass3[i], out: E('S2', 7) - 0.15, pos: pin(() => pod.localToWorld(V(-side * 0.95, 0.75, 0.2)), -side * 120, -40, 140), zh: '过', en: 'PASS', size: 56, rot: -10 });
  });
  tag2({ at: EV.coinSpin + 0.3, out: E('S2', 7) - 0.15, pos: pin(() => TR.plinth.localToWorld(V(0, -0.3, 0)), 20, 110, 220), zh: '靠运气', en: 'luck', bg: CHIP2 });
  // S3_0 – S3_2
  tag({ at: T('S3', 0) + 3.2, out: T('S3', 1) + 0.6, pos: pin(calCircle, 0, -250, 200), zh: '明天', en: 'tomorrow', bg: CHIP2 });
  tag({ at: T('S3', 1) + 1.5, out: T('S3', 1) + 2.9, pos: pin(V(cellX[0], TY + 2.1, -1.4), 0, 90, 300), zh: '述职', en: 'the presentation' });
  tag({ at: T('S3', 1) + 3.0, out: T('S3', 2) + 0.45, pos: pin(V(cellX[1], TY + 2.1, -1.4), 0, 90, 300), zh: '面试', en: 'the interview' });
  tag({ at: T('S3', 2) + 0.6, out: E('S3', 2) - 0.1, pos: pin(V(cellX[2], TY + 2.1, -1.4), 0, 90, 330), zh: '见对方家长', en: 'meeting their parents' });
  // S3_3 · S3_4
  tag({ at: T('S3', 3) + 2.4, out: T('S3', 4) + 0.2, pos: pin(atWall3, 0, 260, 260), zh: '梦里的慌', en: 'the panic', bg: CHIP3 });
  tag({ at: T('S3', 4) + 2.8, out: E('S3', 4) + 0.2, pos: pin(pNotes, -240, -260, 260), zh: '白天的心事', en: 'today’s worry', bg: CHIP2 });
  // S3_5 – S3_7
  tag({ at: T('S3', 5) + 1.3, out: T('S3', 6) + 0.4, pos: pin(kidC, 0, -560, 240), zh: '小时候：怕挨罚', en: 'as a kid: punishment' });
  tag({ at: T('S3', 6) + 1.1, out: E('S3', 6) + 0.1, pos: pin(kidC, 0, -620, 300), zh: '长大后：生活来罚', en: 'grown up: life punishes', bg: CHIP3 });
  tag({ at: T('S3', 7) + 1.2, out: E('S3', 7) + 0.1, pos: pin(cw(CHX - 0.6, 1.9, CHZ), 0, -300, 300), zh: '又回考场', en: 'back to the exam' });
  // S3_8 – S3_10
  tag({ at: EV.bookOpen + 0.3, out: E('S3', 8) + 0.1, pos: pin(ST_book, 0, -360, 260), zh: '《梦的解析》第三章', en: 'Chapter III' });
  tag({ at: T('S3', 9) + 0.6, out: E('S3', 9) + 0.1, pos: pin(keysC, 0, -420, 260), zh: '不是噪音', en: 'not noise', bg: CHIP3 });
  tag({ at: EV.curtain + 0.6, out: E('S3', 10) + 0.1, pos: pin(stageC, 0, -470, 300), zh: '心里希望的样子', en: 'the way you’d wish', bg: CHIP2 });
  // S3_11 – S3_15
  tag({ at: T('S3', 11) + 1.6, out: EV.dive + 0.3, pos: pin(atPaper3, 0, -420, 280), zh: '底下那一层', en: 'look underneath' });
  tag({ at: EV.calGlow, out: E('S3', 12) + 0.1, pos: pin(() => UN.circle(), 0, -380, 300), zh: '明天别出事', en: 'let tomorrow go okay', bg: CHIP2 });
  tag({ at: T('S3', 13) + 1.3, out: E('S3', 13) + 0.2, pos: pin(UN.cab.localToWorld(V(0, 2.4, 0.3)), 0, -60, 300), zh: '当年的考试', en: 'exams from years ago' });
  stampF({ at: EV.passAR, out: E('S3', 15) - 0.3, pos: pin(() => UN.passed.getWorldPosition(V()), 0, 30, 140), zh: '通过', en: 'PASSED', size: 66 });
  stampF({ at: EV.failAR, out: EV.drawerShut + 0.5, pos: pin(() => UN.failPaper.getWorldPosition(V()), 0, -20, 120), zh: '不及格', en: 'FAILED', size: 50, color: MUTED_STAMP });
  tag({ at: EV.paperLand + 0.6, out: E('S3', 15) + 0.1, pos: pin(deskU, 0, -380, 300), zh: '只挑考过的', en: 'only the passed ones', bg: CHIP2 });
  // S4_0 – S4_2: the line
  const END = E('S4', 2) + 0.1, Lw = EV.arcs + 1.0;
  tag({ at: Lw, out: END, pos: pin(cw(-1.6, 3.6, 0.0), 0, -20, 300), zh: '多年前那场考试', en: 'that exam, years ago' });
  tag({ at: Lw + 0.5, out: END, pos: pin(V(cellX[1], TY + 2.6, -0.3), 0, -30, 200), zh: '明天', en: 'tomorrow', bg: CHIP2 });
  tag({ at: Lw + 0.25, out: EV.comfort + 0.4, pos: pin(V(-1.2, 2.9, 0.4), 0, -10, 380), zh: '「我不是早就毕业了吗？」', en: '“Didn’t I graduate?”', size: 60, bg: CHIP3 });
  tag({ at: EV.comfort + 0.4, out: END, pos: pin(V(-1.2, 2.9, 0.4), 0, -10, 380), zh: '「我不是早就毕业了吗？」', en: '“Didn’t I graduate?”', size: 60, bg: CHIP2 });
  tag({ at: EV.comfort + 0.9, out: END, pos: pin(V(-1.2, 2.9, 0.4), 0, 100, 380), zh: '是安慰', en: 'it’s comfort', size: 60, bg: 'rgba(214,92,118,.6)' });
  tag({ at: T('S4', 2) + 0.9, out: END, pos: pin(pOld, -230, 160, 220), zh: '那时：怕得要命', en: 'then: terrified', size: 60, bg: CHIP3 });
  tag({ at: T('S4', 2) + 2.0, out: END, pos: pin(pOld, 250, 160, 200), zh: '后来：没事', en: 'after: fine', size: 60, bg: CHIP2 });
  // S4_4 · S4_5
  tag({ at: T('S4', 4) + 1.5, out: E('S4', 4) + 0.1, pos: pin(pNotes, -230, -230, 300), zh: '你在乎的事', en: 'something you care about', bg: CHIP2 });
  tag({ at: T('S4', 5) + 0.9, out: E('S4', 5) + 0.1, pos: pin(calCircle, 0, -300, 200), zh: '明天', en: 'tomorrow', bg: CHIP2 });
  stampF({ at: EV.oldPaper, out: E('S4', 5) + 0.1, pos: pin(oldPaper, 10, 40, 140), zh: '通过', en: 'PASSED', size: 60 });

  // visibility windows (a set may have several)
  const visible = (set, t) => winList(set.show).some(([a, b]) => t >= a && t <= b);
  const presence = (set, t) => Math.max(...winList(set.show).map(([a, b]) => Math.min(ke(t, a, a + 0.4), 1 - ke(t, b - 0.4, b))));
  const setOpacity = (mats, a) => { for (const m of mats) { const tr = a < 0.999; if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; } m.opacity = a; m.depthWrite = !tr; } };
  if (DEBUG) { const all = [...SH]; all.sort((a, b) => a.at - b.at); all.forEach((s, i) => { if (i && s.at - s.moveDur < all[i - 1].at - 1e-6) console.warn('shot overlaps previous', s.at.toFixed(2), all[i - 1].at.toFixed(2)); }); }

  return {
    shots: [
      pov(0, bedEye, V(bx + 0.35, 0.5, room.backZ + 0.8), 50),                 // in bed at night, the window
      pov(T('S1', 0) - 1.2, bedEye, atWindow, 42, 1.0),
      shot(sink1[0] + 1.0, bedWide, 9, [1, 1.5, 1.1], 26, 1.4),              // S1_0 up and out of the room…
      shot(sink1[1] - 0.1, clsWide, 11, [1, 0.9, 1.15], 26, 1.7),             // …down through the haze into the classroom
      pov(T('S1', 1) + 0.6, deskEye, atPaper, 42, 1.4),                       // S1_1 the paper
      pov(T('S1', 1) + 3.0, deskEye, atBoard, 48, 1.3),                       //      the board: never went to this class
      pov(T('S1', 2) + 0.5, deskEye, atPen, 38, 1.2),                         // S1_2 the dry pen
      pov(T('S1', 2) + 3.4, deskEye, atWall, 26, 1.0),                        //      the clock
      pov(T('S1', 3) + 0.9, deskEye, atRoom, 52, 1.6),                        // S1_3 the empty room: wait, didn't I graduate?
      shot(rise1[0] + 0.9, clsWide, 10, [1, 0.9, 1.15], 26, 1.0),             // S1_4 jolt: back out…
      shot(rise1[1] - 0.2, bedWide, 9, [1, 1.3, 1.1], 26, 1.1),               //      …up into the morning bedroom
      pov(T('S1', 4) + 3.2, bedEye, atAlarm, 40, 1.4),                        //      what time is it
      pov(T('S1', 5) + 0.5, bedEye, atWindow, 42, 1.1),                       // S1_5 the window goes dark again: months later
      shot(E('S1', 5) - 0.15, bedWide, 9, [1, 1.5, 1.1], 26, 1.3),           //      …up out of the room, and down into Freud's study
      ...SH,
      shot(S.DURATION + 0.6, bedWide, 9.5, [1, 1.35, 1.1], 26, 3.4),          // the end: pull out of the morning room
    ],
    mood: t => {
      const d = inDream(t), tr = transit(t), m = morning(t);
      return { night: (1 - d) * (1 - m) * (1 - tr * 0.5), dream: d * (1 - tr * 0.6), void: tr, morning: m * 1.2 };
    },
    update(t) {
      const d = inDream(t), m = morning(t);
      // what exists right now
      const clsOn = t < clsShift || t > clsBack;
      cls.visible = clsOn; cls.position.y = t < clsShift ? CY : CY3;
      for (const s of SETS) { const a = presence(s, t); s.g.visible = a > 0.001; s.g.scale.setScalar(Math.max(0.001, a)); }
      if (t > T('S4', 3)) { const a = 1 - ke(t, T('S4', 3) + 0.6, T('S4', 3) + 1.0); cls.visible = cls.visible && a > 0.001; cls.scale.setScalar(Math.max(0.001, a)); } else cls.scale.setScalar(1);
      ready.visible = t > S2a; calendar.visible = t > S2a; pen2.visible = t > S2a; stack.visible = t > S2a;
      oldPaper.visible = oldMark.visible = t > T('S4', 0);
      // the later classroom: the trapdoor floor, the second hand, your desk dissolving as the camera dives through it
      floor0.visible = t < clsBack; floorB.visible = t >= clsBack;
      const diving = t > EV.dive - 0.1 && t < T('S4', 0);
      plug.visible = !diving;
      const fadeDesk = diving ? 1 - k(t, EV.dive, EV.dive + 0.5) : 1;
      setOpacity(myDeskMats, fadeDesk); setOpacity([paper.material], fadeDesk); myDesk.visible = paper.visible = fadeDesk > 0.01;
      secH.visible = t > clsBack; { const s0 = Math.floor(t), f0 = clamp((t - s0) / 0.12); secH.rotation.z = -(s0 + ease(f0)) / 60 * Math.PI * 2; }
      // the corner: child → office → exam desk
      const kidA = ke(t, T('S3', 5) - 0.5, T('S3', 5) + 0.1) * (1 - ke(t, EV.office - 0.25, EV.office + 0.15));
      const offA = ke(t, EV.office - 0.1, EV.office + 0.35) * (1 - ke(t, EV.examBack - 0.2, EV.examBack + 0.3));
      const exA = easeOutBack(clamp((t - EV.examBack - 0.2) / 0.5)) * (t < T('S4', 0) ? 1 : 1);
      kid.visible = kidA > 0.001; kid.scale.setScalar(Math.max(0.001, kidA));
      office.visible = offA > 0.001; office.scale.setScalar(Math.max(0.001, offA));
      backToExam.visible = t > EV.examBack && exA > 0.001; backToExam.scale.setScalar(Math.max(0.001, exA));
      crosses.forEach((c, i) => { const u = easeOutBack(clamp((t - EV.crosses[i]) / 0.25)); c.visible = u > 0.001; c.scale.setScalar(Math.max(0.001, u)); });
      office.userData.notes.forEach((n, i) => { const u = easeOutBack(clamp((t - EV.office - 0.3 - i * 0.09) / 0.25)); n.scale.setScalar(Math.max(0.001, u)); });
      { const a0 = Math.min(ke(t, driftWin[0], driftWin[0] + 0.5), 1 - ke(t, driftWin[1] - 0.5, driftWin[1])); driftC.visible = a0 > 0.001; driftC.children.forEach(c0 => c0.scale.setScalar(Math.max(0.001, a0) * c0.userData.s0)); driftC.position.y = Math.sin(t * 0.6) * 0.1; }
      // light that follows the set in view
      const [f, lo] = focus(t); dreamLight.position.copy(f).add(lo); dreamLight.target.position.copy(f);
      dreamLight.intensity = d * 1.9; deskLight.intensity = (t < clsShift ? d : 0) * 0.09;
      bedLamp.set((1 - d) * (1 - m));
      const late = t > T('S4', 0) ? 1 : 0; // the last morning: warmer, softer, so the window and bed read rather than clip
      sun.color.setHex(late ? 0xff9a6c : 0xffb48a); spill.color.setHex(late ? 0xffa27a : 0xffb898);
      sun.intensity = m * (1 - d) * (late ? 38 : 60); spill.intensity = m * (1 - d) * (late ? 4.2 : 3.2);
      deskSun.intensity = late * m * (1 - d) * 4 * k(t, EV.sunOnDesk, EV.sunOnDesk + 1.4);
      deskLamp.intensity = t > S2a ? (1 - m) * 0.7 : 0;
      phone.set({ scroll: 0, on: 0.0 });
      // the study: lamp off until the second visit's click, the book opens, the piano jangles, the curtain opens
      const second = t > T('S3', 0);
      const lampOn = second ? ke(t, EV.lampOn, EV.lampOn + 0.25) : 1;
      ST.lampMats[0].emissiveIntensity = 0.06 + 0.29 * lampOn; ST.lampMats[1].emissiveIntensity = 0.1 + 1.1 * lampOn;
      studyLamp.intensity = visible(ST, t) ? 0.7 * lampOn : 0;
      ST.cover.rotation.z = second ? (Math.PI - 0.2) * ke(t, EV.bookOpen, EV.bookOpen + 0.8) : 0;
      ST.music.visible = second;
      const jt = t - EV.jangle, env = jt > 0 ? clamp(jt / 0.06) * Math.exp(-jt * 3.2) : 0;
      ST.keys.forEach((kp, i) => { kp.rotation.x = env * 0.14 * Math.max(0, Math.sin(t * 41 + i * 2.7)); });
      ST.music.position.copy(ST.music.userData.home); ST.music.position.x += env * 0.012 * Math.sin(t * 63); ST.music.position.z += env * 0.008 * Math.sin(t * 51);
      ST.shards.forEach(s0 => { const u = jt; s0.visible = u > 0 && u < 1.1; if (!s0.visible) return; const { p0, v, spin } = s0.userData;
        s0.position.set(p0.x + v.x * u, p0.y + v.y * u - 2.2 * u * u, p0.z + v.z * u); s0.rotation.set(spin.x * u, spin.y * u, spin.z * u); s0.scale.setScalar(Math.max(0.001, 1 - ke(u, 0.6, 1.1))); });
      const cu0 = ke(t, EV.curtain, EV.curtain + 1.0);
      ST.curtains.forEach(c => { c.scale.x = Math.max(0.12, 1 - 0.88 * cu0); });
      ST.sun.position.y = 0.1 + 0.12 * ke(t, EV.curtain + 0.5, EV.curtain + 1.8); ST.star.rotation.y = t * 1.2; ST.star.scale.setScalar(0.045 * (1 + 0.15 * Math.sin(t * 4) * cu0));
      // the alarm clock: just past seven when you wake; the hands race while the window goes dark ("months later");
      // twenty to midnight on the night before; seven again at the end
      const amins = t < S2a ? 422 + (t - T('S1', 4)) * 0.05 + ke(t, T('S1', 5) + 0.2, E('S1', 5) - 0.1) * 900 : t < EV.dawn ? 1420 + (t - T('S3', 0)) * 0.05 : 420 + (t - EV.dawn) * 0.05;
      redraw(alarmFace, Math.round(amins * 4) / 4);
      // the dream clock: normal, then it races while you look up at it in S1_2
      const race = ke(t, T('S1', 2) + 3.2, E('S1', 2) - 0.2);
      const mins = 25 + t * 0.02 + race * 20;
      minH.rotation.z = -mins / 60 * Math.PI * 2; hourH.rotation.z = -(10 + mins / 60) / 12 * Math.PI * 2;
      redraw(paperTex, t > clsBack ? 0 : Math.round(clamp((t - T('S1', 2) - 0.6) / 2.2) * 10) / 10);
      const tryIt = bump(t, T('S1', 2) + 0.4, T('S1', 2) + 3.2);
      pen.position.x = myX + 0.15 - tryIt * (0.05 + Math.sin(t * 22) * 0.012); pen.position.z = myZ + 0.06 - tryIt * Math.sin(t * 15) * 0.01;
      pen.rotation.y = 0.5 + tryIt * 0.2;
      dust.rotation.y = Math.sin(t * 0.05) * 0.02; dust.position.y = Math.sin(t * 0.2) * 0.03;

      // S2_1: the loop of moons and papers circling over the book
      const lp = k(t, EV.loop - 0.5, EV.loop + 0.4) * (second ? 0 : 1);
      ST.loop.visible = lp > 0.001; ST.loop.scale.setScalar(Math.max(0.001, lp)); ST.loop.position.y = 0.16 + Math.sin(t * 1.3) * 0.01; ST.loop.rotation.y = t * 1.4;
      // S2_2: the dream cloud puffs up over the one who passed
      const cu = easeOutBack(clamp((t - EV.cloudPuff) / 0.8));
      BR.cloud.scale.setScalar(Math.max(0.001, cu)); BR.cloud.position.y = 1.95 + Math.sin(t * 1.1) * 0.04;
      BR.bubbles.forEach((b, i) => { const u = clamp((t - EV.cloudPuff + 0.5 - i * 0.18) / 0.4); b.scale.setScalar(Math.max(0.001, easeOutBack(u))); });
      // S2_5: the door swings shut, the stepping stones give way, the cloud drifts off
      const shut = ke(t, EV.doorShut - 0.9, EV.doorShut);
      HL.door.rotation.y = -1.2 * (1 - shut);
      HL.stones.forEach((s0, i) => { const up = easeOutBack(clamp((t - EV.stonesUp - i * 0.07) / 0.4)); const fall = clamp((t - EV.stonesFall - (6 - i) * 0.12) / 0.9) * (i >= 3 ? 1 : 0); s0.position.copy(s0.userData.home); s0.position.y -= fall * fall * 3.5; s0.rotation.z = fall * (i % 2 ? 1 : -1) * 1.2; s0.visible = fall < 0.98 && up > 0.001; s0.scale.setScalar(Math.max(0.001, up)); });
      const drift = ke(t, EV.stonesFall - 0.1, E('S2', 5) + 0.4); HL.cloud.position.set(0.95 - drift * 0.3, 3.45 + drift * 0.9 + Math.sin(t) * 0.04, 1.05 - drift * 0.6);
      // S2_6: the three worlds rise into place one by one, glowing; S2_7 the coin spins and lands, and each one passes
      TR.pods.forEach(({ g, ring }, i) => { const u = clamp((t - EV.pods[i] + 0.3) / 0.6); g.scale.setScalar(0.86 + 0.14 * easeOutBack(u)); g.position.y = g.userData.y0 + 0.12 * easeOutBack(u);
        ring.material.emissiveIntensity = 1.6 * bump(t, EV.pods[i] - 0.3, EV.pods[i] + 1.6) + 1.2 * bump(t, EV.pass3[i] - 0.1, EV.pass3[i] + 1.2) + 0.25; g.rotation.y = -0.25 + 0.06 * Math.sin(t * 0.5 + i); });
      TR.flame.scale.set(1, 1 + 0.12 * Math.sin(t * 17), 1); TR.bird.rotation.z = 0.08 * Math.sin(t * 3);
      { const ct = t - EV.coinSpin, dur = EV.coinLand - EV.coinSpin, u = clamp(ct / dur);
        const spin = ct < 0 ? 0 : ct < dur ? 16 * ct - 4 * ct * ct : 16 * dur - 4 * dur * dur;
        const lean = ct < 0 ? 0 : Math.PI / 2 * Math.pow(u, 3) + 0.12 * Math.sin(ct * 9) * (1 - u) * clamp(ct / 0.2);
        TR.coin.piv.rotation.y = spin; TR.coin.tilt.rotation.z = lean; TR.coin.coin.position.y = 0.2 - 0.18 * Math.pow(u, 3);
        const hop = ct > 0 ? Math.max(0, Math.sin(clamp(ct / 0.35) * Math.PI)) * 0.25 * (ct < 0.35 ? 1 : 0) : 0; TR.coin.piv.position.y = 0.02 + hop; }
      // S3_4: the thread
      const th = ke(t, EV.thread[0], EV.thread[1]); const thOn = t > EV.thread[0] && t < T('S3', 5) + 0.8;
      thread.show(0, thOn ? th : 0); thread.mesh.material.opacity = 1 - k(t, T('S3', 5) + 0.1, T('S3', 5) + 0.8);
      // S3_12: the circle on the calendar underneath glows
      UN.ring.material.emissiveIntensity = 2.2 * k(t, EV.calGlow, EV.calGlow + 0.5) * (0.85 + 0.15 * Math.sin(t * 4));
      UN.ring.visible = t > EV.calGlow;
      underLight.intensity = visible(UN, t) ? 0.9 : 0; calLight.intensity = visible(UN, t) ? 0.25 + 0.5 * k(t, EV.calGlow, EV.calGlow + 0.5) : 0;
      if (t > T('S3', 12) - 0.3 && t < T('S4', 0) + 0.3) { dreamLight.intensity *= 0.55; }
      // S3_13 – S3_15: drawers open; the passed paper rises and is laid on the desk; the failed one is pushed back
      drawers.forEach((dw, i) => { const order = [7, 3, 10, 1, 5, 8, 0][[7, 3, 10, 1, 5, 8, 0].indexOf(i)] ?? -1; const j = [7, 3, 10, 1, 5, 8, 0].indexOf(i);
        const open = j < 0 ? 0 : ke(t, EV.drawers + j * 0.2, EV.drawers + j * 0.2 + 0.35) * (1 - ke(t, EV.drawerShut + (i === 3 ? 0 : 0.35 + j * 0.06), EV.drawerShut + (i === 3 ? 0.5 : 0.75 + j * 0.06)));
        void order; dw.position.z = 0.36 * open; });
      { const { p, rx, rz } = passPos(t); UN.passed.position.copy(p); UN.passed.rotation.set(rx, 0, rz); }
      // the line (S4)
      const inLine = t > EV.arcs - 0.5 && t < rise2[1];
      R.a.show(0, inLine ? ke(t, EV.arcs, EV.arcs + 1.4) : 0); R.b.show(0, inLine ? ke(t, EV.arcs + 0.5, EV.arcs + 1.9) : 0);
      R.wa.show(0, inLine ? ke(t, EV.comfort, EV.comfort + 1.6) : 0); R.wb.show(0, inLine ? ke(t, EV.beadGo, EV.beadArrive) : 0);
      const lineFade = 1 - k(t, rise2[0], rise2[0] + 0.8);
      for (const r0 of Object.values(R)) r0.mesh.material.opacity = lineFade;
      const bu = clamp((t - EV.beadGo) / (EV.beadArrive - EV.beadGo));
      bead.set(R.wb.at(ease(bu)), inLine && bu > 0 && bu < 1, 6);
      warmOld.intensity = inLine ? 26 * k(t, EV.comfort, EV.comfort + 1.4) * lineFade : 0;
      warmNew.intensity = inLine ? 30 * k(t, EV.beadArrive - 0.4, EV.beadArrive + 0.6) * lineFade : 0;
      TM.door.rotation.y = -0.5 * ke(t, EV.beadArrive, EV.beadArrive + 1.0);
    },
  };
}

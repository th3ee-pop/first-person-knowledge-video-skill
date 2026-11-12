// 000-demo · 报复性熬夜 — a short episode that exercises every part of the template.
// No people on screen: the room is seen empty, then through the viewer's own eyes (pov shots).
import { shot, pov } from '/engine/studio.js';

export default async function build(S) {
  const { T, E, k, ke, V } = S;

  // ---------- the real world ----------
  await S.hdri('blocky_photo_studio');
  const room = S.room({ w: 4.2, d: 4.2, h: 2.8, window: { x: -0.9, y: 1.55, w: 1.1, h: 1.25 } });

  const desk = await S.prop('metal_office_desk', { pos: [0.55, 0, 0] });
  desk.position.z = room.backZ + desk.userData.size.z / 2 + 0.04;
  await S.prop('dining_chair_02', { pos: [0.45, 0, desk.position.z + 0.85], rotY: Math.PI - 0.25 }); // pulled out: someone is sitting here — you
  await S.prop('book_encyclopedia_set_01', { on: desk, pos: [-0.05, 0, -0.3], rotY: 0.05 });
  const lampProp = await S.prop('desk_lamp_arm_01', { on: desk, pos: [-0.5, 0, -0.1], rotY: 0.6 });
  const clock = await S.prop('alarm_clock_01', { on: desk, pos: [0.5, 0, -0.12], rotY: -0.4 });
  await S.prop('binder_notebook', { on: desk, pos: [-0.3, 0, 0.12], rotY: 0.3 });
  await S.prop('potted_plant_04', { pos: [1.75, 0, room.backZ + 0.35] });
  await S.prop('old_bed_frame', { pos: [-1.35, 0, 1.0], rotY: Math.PI / 2 });
  const deskTop = S.topOf(desk);
  const phone = S.phone({ pos: [desk.position.x + 0.02, deskTop, desk.position.z + 0.3], rotY: -0.2 });

  const pool = V(desk.position.x - 0.1, deskTop, desk.position.z + 0.1);
  const lamp = S.lamp(S.wpos(lampProp).add(V(0, lampProp.userData.size.y * 0.7, 0)).lerp(pool, 0.3), pool, { intensity: 1.1 });

  // ---------- inside the mind ----------
  const stage = S.kit.voidStage({ y: -8 });
  const grid = S.kit.blockGrid({ parent: stage.group, n: 7, hole: -1, size: 0.28, gap: 0.5 });
  const mine = grid.blocks[24]; // the centre block = the hour that is yours

  // ---------- camera ----------
  const eye = V(desk.position.x - 0.05, 1.17, desk.position.z + 0.88);   // seated at the desk
  const atClock = S.wpos(clock).add(V(0, 0.07, 0));
  const atPhone = S.wpos(phone.group).add(V(0, 0, -0.02));
  const atWindow = V(room.window.x, room.window.y - 0.1, room.backZ);
  const wide = [0.35, 0.8, -0.9];
  const inVoid = t => k(t, T('S2', 1), T('S2', 1) + 1.5) * (1 - k(t, T('S3', 0) - 0.5, T('S3', 0) + 1.0));
  return {
    shots: [
      shot(0, wide, 14),                                              // the empty room
      pov(T('S1', 0) + 1.9, eye, atClock, 34, 2.6),                   // …and into your own eyes
      pov(T('S1', 1) + 1.0, eye, atPhone, 40, 1.6),
      shot(T('S2', 0) + 1.8, wide, 9, [1, 1.1, 1], 22, 2.6),          // step back to look at it from outside
      shot(T('S2', 1) + 1.8, V(0, stage.y + 0.2, 0), 7, [1, 0.95, 1], 24, 2.6),
      shot(T('S2', 2) + 1.4, V(0, stage.y + 0.8, 0), 3.4, [1, 0.45, 1], 24),
      shot(T('S3', 0) + 1.2, wide, 7, [1, 0.8, 1], 22, 2.4),          // rise out of the void outside the room's footprint…
      pov(E('S3', 0) - 0.4, eye, atPhone, 40, 2.2),                   // …and sit back down
      pov(T('S3', 1) + 1.8, eye, atWindow, 40, 2.2),                  // look up: it is getting light
      shot(S.DURATION + 2, [0.1, 1.0, -0.6], 15, [1, 1, 1], 22, 4),
    ],
    mood: t => ({
      night: 1 - inVoid(t),
      void: inVoid(t),
      dawn: k(t, T('S3', 1), T('S3', 1) + 3) * 1.5,
    }),
    update(t) {
      lamp.set(1 - k(t, T('S3', 1), T('S3', 1) + 3) * 0.5);
      phone.set({ scroll: Math.max(0, t - T('S1', 1)) * 0.45, on: 1 - k(t, T('S3', 1) + 1.0, T('S3', 1) + 2.0) });
      stage.setLight(inVoid(t));
      grid.update(t, { rain: T('S2', 1) - 0.3 });
      // the one block that is yours lifts out of the schedule and glows
      const lift = ke(t, T('S2', 2) + 0.3, T('S2', 2) + 1.8);
      mine.position.y += lift * 0.55; mine.rotation.y = lift * 0.8;
      mine.material.emissive.setRGB(0.6 * lift, 0.45 * lift, 0.15 * lift);
      grid.blocks.forEach(b => { if (b !== mine) b.material.color.setHSL(0.66, 0.05 + 0.1 * (1 - lift), 0.35 + 0.25 * (1 - lift)); });
    },
  };
}

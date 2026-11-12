// __ID__ · __TITLE__
// No people on screen. The real world is an empty room seen from outside, then through the viewer's own eyes (pov);
// the mind is abstract structure on a void stage. One continuous camera joins them.
import { shot, pov } from '/engine/studio.js';

export default async function build(S) {
  const { T, E, k, V } = S;

  // ---------- the real world ----------
  await S.hdri('blocky_photo_studio');
  const room = S.room({ window: { x: -0.9, y: 1.55, w: 1.1, h: 1.25 } });
  const desk = await S.prop('metal_office_desk', { pos: [0.55, 0, 0] });
  desk.position.z = room.backZ + desk.userData.size.z / 2 + 0.04;
  await S.prop('dining_chair_02', { pos: [0.45, 0, desk.position.z + 0.85], rotY: Math.PI - 0.25 });
  await S.prop('book_encyclopedia_set_01', { on: desk, pos: [-0.05, 0, -0.3], rotY: 0.05 });
  const lampProp = await S.prop('desk_lamp_arm_01', { on: desk, pos: [-0.5, 0, -0.1], rotY: 0.6 });
  const clock = await S.prop('alarm_clock_01', { on: desk, pos: [0.5, 0, -0.12], rotY: -0.4 });
  await S.prop('binder_notebook', { on: desk, pos: [-0.3, 0, 0.12], rotY: 0.3 });
  const deskTop = S.topOf(desk);
  const phone = S.phone({ pos: [desk.position.x + 0.02, deskTop, desk.position.z + 0.3], rotY: -0.2 });
  const pool = V(desk.position.x - 0.1, deskTop, desk.position.z + 0.1);
  const lamp = S.lamp(S.wpos(lampProp).add(V(0, lampProp.userData.size.y * 0.7, 0)).lerp(pool, 0.3), pool, { intensity: 1.1 });

  // ---------- inside the mind ----------
  const stage = S.kit.voidStage({ y: -8 });
  const cube = S.kit.glassCube(1.2, { parent: stage.group });
  cube.group.position.y = 1.0;

  // ---------- camera ----------
  const eye = V(desk.position.x - 0.05, 1.17, desk.position.z + 0.88); // seated at the desk
  const atClock = S.wpos(clock).add(V(0, 0.07, 0));
  const atPhone = S.wpos(phone.group);
  const atWindow = V(room.window.x, room.window.y - 0.1, room.backZ);
  const wide = [0.35, 0.8, -0.9];
  const inVoid = t => k(t, T('S2', 0), T('S2', 0) + 1.5) * (1 - k(t, T('S3', 0) - 0.5, T('S3', 0) + 1.0));
  return {
    shots: [
      shot(0, wide, 14),                                            // the empty room
      pov(T('S1', 0) + 1.9, eye, atClock, 34, 2.6),                 // into your own eyes
      pov(T('S1', 1) + 1.0, eye, atPhone, 40, 1.6),
      shot(T('S2', 0) + 1.8, V(0, stage.y + 1, 0), 6, [1, 0.8, 1], 24, 2.8),   // out and down into the void
      shot(T('S3', 0) + 1.2, wide, 7, [1, 0.8, 1], 22, 2.4),        // rise outside the room's footprint…
      pov(E('S3', 0) - 0.4, eye, atWindow, 40, 2.2),                // …and sit back down
      shot(S.DURATION + 2, wide, 15, [1, 1, 1], 22, 4),
    ],
    mood: t => ({ night: 1 - inVoid(t), void: inVoid(t) }),
    update(t) {
      lamp.set(1);
      phone.set({ scroll: t * 0.4, on: 1 });
      stage.setLight(inVoid(t));
      cube.glow(k(t, T('S2', 0) + 1, T('S2', 0) + 2.5));
    },
  };
}

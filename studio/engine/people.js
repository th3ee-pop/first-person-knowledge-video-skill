// Rocketbox characters: load, fix materials, play a deterministic clip timeline, sit on chairs.
import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { clamp, wpos } from './core.js';

const clipCache = new Map();
async function loadClip(name) {
  if (!clipCache.has(name)) clipCache.set(name, new FBXLoader().loadAsync(`/assets/rocketbox/anims/${name}.fbx`).then(o => {
    const c = o.animations[0]; c.name = name;
    c.tracks = c.tracks.filter(tr => !tr.name.startsWith('MotionExtractionHelper'));
    return c;
  }));
  return clipCache.get(name);
}

export class Person {
  /**
   * opts:
   *  pos [x,y,z], rotY       – where the character stands (or the chair it sits on; see seat)
   *  seat [x,y,z]            – put the pelvis here for the first clip (use seatOf(chairProp))
   *  clips [[t, name, fade]] – clip timeline: from time t play `name`, cross-fading over `fade` s (default 0.6)
   *  faceLight (0–1)         – soft key light that follows the head (default 0.6)
   */
  static async load(S, name, opts = {}) {
    const manager = new THREE.LoadingManager();
    manager.setURLModifier(url => {
      if (/\.(tga|png|jpg|jpeg|bmp)$/i.test(url)) {
        const base = url.split(/[\\/]/).pop().replace(/\.[a-z]+$/i, '');
        return `/assets/rocketbox/avatars/${name}/textures/${base}.${/opacity/i.test(base) ? 'png' : 'jpg'}`;
      }
      return url;
    });
    // FBXLoader refuses .tga without a handler; the URL modifier above swaps them for our .jpg copies
    manager.addHandler(/\.tga$/i, new THREE.TextureLoader(manager));
    const root = await new FBXLoader(manager).loadAsync(`/assets/rocketbox/avatars/${name}/${name}.fbx`);
    root.traverse(m => {
      if (!m.isMesh) return;
      m.castShadow = m.receiveShadow = true; m.frustumCulled = false;
      const conv = old => {
        // the opacity material (hair, lashes) is a PNG whose alpha channel is the cut-out
        const opacity = !!old.alphaMap || /opacity|hair|lash/i.test(old.name || '');
        const n = new THREE.MeshStandardMaterial({
          name: old.name, map: old.map, normalMap: old.normalMap, roughness: opacity ? 0.85 : 0.72, metalness: 0,
          transparent: opacity, depthWrite: !opacity, alphaTest: opacity ? 0.04 : 0, side: opacity ? THREE.DoubleSide : THREE.FrontSide,
        });
        if (n.map) n.map.colorSpace = THREE.SRGBColorSpace;
        return n;
      };
      m.material = Array.isArray(m.material) ? m.material.map(conv) : conv(m.material);
    });
    root.scale.setScalar(0.01); // Rocketbox is in centimetres
    root.rotation.y = opts.rotY ?? 0;
    const p = new Person(S, root, opts);
    p.bones = {};
    root.traverse(o => { if (o.isBone) p.bones[o.name.replace(/^Bip01[ _]?/, '').toLowerCase()] = o; });
    p.timeline = [];
    for (const [t, clipName, fade] of opts.clips ?? []) p.timeline.push({ t, fade: fade ?? 0.6, clip: await loadClip(clipName) });
    p.timeline.sort((a, b) => a.t - b.t);
    p.actions = p.timeline.map(e => { const a = p.mixer.clipAction(e.clip); a.play(); a.setEffectiveWeight(0); return a; });
    const [x, y, z] = opts.pos ?? [0, 0, 0];
    root.position.set(x, y, z); S.scene.add(root);
    if (opts.seat) p.sitAt(opts.seat);
    if ((opts.faceLight ?? 0.6) > 0) p.addFaceLight(opts.faceLight ?? 0.6);
    S.people.push(p);
    return p;
  }
  constructor(S, root, opts) { this.S = S; this.root = root; this.opts = opts; this.mixer = new THREE.AnimationMixer(root); }

  bone(name) { return this.bones[name.toLowerCase()]; }
  /** world position of the head (handy as a camera target) */
  head() { return wpos(this.bone('head')); }

  /** move the whole character so the pelvis lands on `seat` while the first clip is at frame 0 */
  sitAt(seat) {
    this.pose(this.timeline[0]?.t ?? 0);
    const pw = wpos(this.bone('pelvis'));
    this.root.position.add(new THREE.Vector3(...seat).sub(pw));
    this.root.updateMatrixWorld(true);
  }

  addFaceLight(intensity) {
    this.faceLight = new THREE.SpotLight(0xffe2c4, 3 * intensity, 3, 0.5, 0.8, 1.5);
    this.faceLight.castShadow = false;
    this.S.scene.add(this.faceLight, this.faceLight.target);
  }

  /** set the pose for time t (deterministic: no accumulated mixer time) */
  pose(t) {
    const tl = this.timeline; if (!tl.length) return;
    let cur = 0; for (let i = 0; i < tl.length; i++) if (tl[i].t <= t) cur = i;
    this.actions.forEach((a, i) => {
      const e = tl[i]; const local = Math.max(0, t - e.t);
      a.time = local % e.clip.duration;
      let w = 0;
      if (i === cur) w = cur === 0 ? 1 : clamp((t - e.t) / e.fade);
      else if (i === cur - 1) w = 1 - clamp((t - tl[cur].t) / tl[cur].fade);
      a.setEffectiveWeight(w); a.enabled = w > 0;
    });
    this.mixer.update(0);
    this.root.updateMatrixWorld(true);
  }

  update(t) {
    this.pose(t);
    if (this.faceLight) {
      const h = this.head(); const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(this.root.quaternion);
      // light from in front, above and to the camera side of the face
      this.faceLight.position.copy(h).addScaledVector(fwd, 0.9).add(new THREE.Vector3(0.4, 0.5, 0.4));
      this.faceLight.target.position.copy(h);
    }
  }
}

/** a sensible pelvis point for a chair prop: centre of the seat, ~ seat height */
export function seatOf(chair, { up = 0.1, back = -0.02, height } = {}) {
  const b = new THREE.Box3().setFromObject(chair);
  const c = b.getCenter(new THREE.Vector3());
  const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(chair.quaternion);
  return [c.x + fwd.x * back, (height ?? b.min.y + (b.max.y - b.min.y) * 0.5) + up, c.z + fwd.z * back];
}

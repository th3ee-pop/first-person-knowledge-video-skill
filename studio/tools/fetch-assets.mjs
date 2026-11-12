// Download every asset an episode lists in its episode.json into the shared cache (studio/assets).
// Usage: node tools/fetch-assets.mjs <episode-id>
//        node tools/fetch-assets.mjs --model classic_laptop --avatar Male_Adult_03 --anim m_sit_table_idle_yawn ...
//        node tools/fetch-assets.mjs --search phone            find names: Poly Haven models/textures/HDRIs, Rocketbox avatars/anims
// Already-downloaded assets are skipped, so this is cheap to re-run.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const A = path.join(ROOT, 'assets');
const UA = { 'User-Agent': 'Mozilla/5.0 (xhs-psych-studio asset fetcher)' };
const RB_RAW = 'https://raw.githubusercontent.com/microsoft/Microsoft-Rocketbox/master/Assets';
const RB_API = 'https://api.github.com/repos/microsoft/Microsoft-Rocketbox/git/trees/master?recursive=1';
const RES = '1k';

async function get(url) {
  for (let i = 0; i < 4; i++) {
    const r = await fetch(url, { headers: UA });
    if (r.ok) return r;
    if (r.status === 404) throw new Error(`404 ${url}`);
    await new Promise(res => setTimeout(res, 1000 * (i + 1)));
  }
  throw new Error(`failed ${url}`);
}
async function save(url, file) {
  if (fs.existsSync(file) && fs.statSync(file).size > 0) return false;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.from(await (await get(url)).arrayBuffer()));
  return true;
}
const json = async url => (await get(url)).json();

// ---------- Poly Haven (CC0) ----------
async function phModel(name) {
  const dir = path.join(A, 'polyhaven/models', name);
  if (fs.existsSync(path.join(dir, `${name}.gltf`))) return;
  const g = (await json(`https://api.polyhaven.com/files/${name}`)).gltf?.[RES]?.gltf;
  if (!g) throw new Error(`Poly Haven model "${name}" has no glTF download`);
  await save(g.url, path.join(dir, `${name}.gltf`));
  for (const [p, v] of Object.entries(g.include || {})) await save(v.url, path.join(dir, p));
  console.log('model', name);
}
async function phTexture(name) {
  const dir = path.join(A, 'polyhaven/textures', name);
  const f = await json(`https://api.polyhaven.com/files/${name}`);
  const maps = { Diffuse: 'diff', nor_gl: 'nor', Rough: 'rough', AO: 'ao' };
  let n = 0;
  for (const [k, short] of Object.entries(maps)) {
    const u = f[k]?.[RES]?.jpg?.url; if (u && await save(u, path.join(dir, `${short}.jpg`))) n++;
  }
  if (n) console.log('texture', name);
}
async function phHdri(name) {
  const u = (await json(`https://api.polyhaven.com/files/${name}`)).hdri?.[RES]?.hdr?.url;
  if (await save(u, path.join(A, 'polyhaven/hdri', `${name}.hdr`))) console.log('hdri', name);
}

// ---------- Microsoft Rocketbox (MIT) ----------
let rbTree;
async function rbFiles(prefix) {
  rbTree ??= (await json(RB_API)).tree.map(e => e.path);
  return rbTree.filter(p => p.startsWith(prefix));
}
async function rbAvatar(name) {
  const dir = path.join(A, 'rocketbox/avatars', name);
  const fbx = path.join(dir, `${name}.fbx`), tex = path.join(dir, 'textures');
  if (fs.existsSync(fbx) && fs.existsSync(tex) && fs.readdirSync(tex).some(f => f.endsWith('.png'))) return;
  const files = (await rbFiles('Assets/Avatars/')).filter(p => p.split('/')[3] === name);
  if (!files.length) throw new Error(`Rocketbox avatar "${name}" not found`);
  const group = files[0].split('/')[2];
  if (!fs.existsSync(fbx)) await save(`${RB_RAW}/Avatars/${group}/${name}/Export/${name}.fbx`, fbx);
  for (const p of files.filter(p => p.includes('/Textures/') && /\.tga$/i.test(p))) {
    const base = path.basename(p, path.extname(p));
    // TGA is 12–16 MB each and slow to decode in the browser; a JPG is ~1 MB.
    // Opacity textures (hair, lashes) carry their cut-out in the alpha channel, so they stay PNG.
    const ext = /opacity/i.test(base) ? 'png' : 'jpg';
    const tga = path.join(dir, 'textures', base + '.tga'), out = path.join(dir, 'textures', `${base}.${ext}`);
    if (fs.existsSync(out)) continue;
    await save(`${RB_RAW}/${p.slice('Assets/'.length)}`, tga);
    execFileSync('sips', ['-s', 'format', ext === 'png' ? 'png' : 'jpeg', ...(ext === 'jpg' ? ['-s', 'formatOptions', '90'] : []), tga, '--out', out], { stdio: 'ignore' });
    fs.unlinkSync(tga);
  }
  console.log('avatar', name, `(${group})`);
}
async function rbAnim(name) {
  const file = path.join(A, 'rocketbox/anims', `${name}.fbx`);
  if (fs.existsSync(file)) return;
  const hit = (await rbFiles('Assets/Animations/')).find(p => path.basename(p).replace(/\.max\.fbx$|\.fbx$/i, '') === name);
  if (!hit) throw new Error(`Rocketbox animation "${name}" not found`);
  await save(`${RB_RAW}/${hit.slice('Assets/'.length).split('/').map(encodeURIComponent).join('/')}`, file);
  console.log('anim', name);
}

// ---------- main ----------
const args = process.argv.slice(2);
if (args[0] === '--search') {
  const q = (args[1] || '').toLowerCase(), hit = s => s.toLowerCase().includes(q);
  for (const t of ['models', 'textures', 'hdris']) {
    const names = Object.keys(await json(`https://api.polyhaven.com/assets?t=${t}`)).filter(hit);
    console.log(`polyhaven ${t}:`, names.join(' ') || '—');
  }
  const tree = await rbFiles('Assets/');
  const avatars = [...new Set(tree.filter(p => p.startsWith('Assets/Avatars/')).map(p => p.split('/')[3]).filter(Boolean))].filter(hit);
  const anims = tree.filter(p => p.startsWith('Assets/Animations/') && /\.fbx$/i.test(p)).map(p => path.basename(p).replace(/\.max\.fbx$|\.fbx$/i, '')).filter(hit);
  console.log('rocketbox avatars:', avatars.join(' ') || '—');
  console.log('rocketbox anims:', anims.join(' ') || '—');
  process.exit(0);
}
let want = { models: [], textures: [], hdris: [], avatars: [], anims: [] };
if (args[0] && !args[0].startsWith('--')) {
  const ep = JSON.parse(fs.readFileSync(path.join(ROOT, 'episodes', args[0], 'episode.json'), 'utf8'));
  want = { ...want, ...ep.assets };
}
for (let i = 0; i < args.length; i++) {
  const m = { '--model': 'models', '--texture': 'textures', '--hdri': 'hdris', '--avatar': 'avatars', '--anim': 'anims' }[args[i]];
  if (m) want[m].push(args[++i]);
}
// the engine's base room always needs these
want.textures.push(...['wood_floor_worn', 'painted_plaster_wall']); want.hdris.push('blocky_photo_studio');

const jobs = [
  ...new Set(want.models)].map(n => () => phModel(n))
  .concat([...new Set(want.textures)].map(n => () => phTexture(n)))
  .concat([...new Set(want.hdris)].map(n => () => phHdri(n)))
  .concat([...new Set(want.avatars)].map(n => () => rbAvatar(n)))
  .concat([...new Set(want.anims)].map(n => () => rbAnim(n)));
let failed = 0;
for (const j of jobs) { try { await j(); } catch (e) { failed++; console.error('✗', e.message); } }
console.log(failed ? `done with ${failed} error(s)` : 'assets ready');
process.exit(failed ? 1 : 0);

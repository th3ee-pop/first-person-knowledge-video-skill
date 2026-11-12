// Render an episode.
//   node tools/render.mjs still   <ep> <t> [out.png]     one frame
//   node tools/render.mjs contact <ep> [step=2.5]        contact sheets → episodes/<ep>/out/sheet_*.jpg
//   node tools/render.mjs video   <ep> [workers=3]       frames + score + mux → out/<title>.mp4, and out/<title_en>.mp4 when every card has `en`
//                                                        with out/voice_<lang>.wav (tools/voice.mjs) the narration is mixed in and the music ducks under it
//   add --lang en to still / contact to see the English subtitles
//   node tools/render.mjs info    <ep>                   duration and segment times
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.gltf': 'model/gltf+json', '.bin': 'application/octet-stream', '.jpg': 'image/jpeg', '.png': 'image/png', '.hdr': 'application/octet-stream', '.fbx': 'application/octet-stream', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml' };

function serve() {
  const server = http.createServer((req, res) => {
    const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f).toLowerCase()] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  }).listen(0);
  return server;
}

async function open(ep, lang = 'zh') {
  const server = serve();
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--hide-scrollbars'] });
  const page = await browser.newPage();
  page.on('console', m => { const s = m.text(); if (!/Failed to load resource|PropertyBinding/.test(s)) console.log('[page]', s); });
  page.on('pageerror', e => console.error('[pageerror]', e.message));
  await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${server.address().port}/engine/index.html?ep=${ep}&lang=${lang}`);
  await page.waitForFunction('window.sceneReady === true || window.sceneError', { timeout: 180000 });
  const err = await page.evaluate(() => window.sceneError);
  if (err) { console.error(err); process.exit(1); }
  return { page, close: async () => { await browser.close(); server.close(); } };
}
const shotAt = async (page, t, file, q = 92) => {
  await page.evaluate(t => window.renderAt(t), t);
  await page.screenshot({ path: file, type: file.endsWith('.png') ? 'png' : 'jpeg', ...(file.endsWith('.png') ? {} : { quality: q }) });
};

const argv = process.argv.slice(2), li = argv.indexOf('--lang');
const LANG = li >= 0 ? argv.splice(li, 2)[1] : 'zh';
const [cmd, ep, ...rest] = argv;
if (!cmd || !ep) { console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(0, 6).join('\n')); process.exit(1); }
const EP = path.join(ROOT, 'episodes', ep), OUT = path.join(EP, 'out');
fs.mkdirSync(OUT, { recursive: true });

if (cmd === 'info') {
  const { page, close } = await open(ep);
  console.log(JSON.stringify(await page.evaluate(() => ({ duration: window.DURATION, segments: window.SEGMENTS })), null, 1));
  await close();
}

if (cmd === 'still') {
  const [t, out] = rest; const file = out || path.join(OUT, `still_${t}.png`);
  const { page, close } = await open(ep, LANG); await shotAt(page, Number(t), file); await close(); console.log('wrote', file);
}

if (cmd === 'contact') {
  const step = Number(rest[0] || 2.5);
  const { page, close } = await open(ep, LANG);
  const dur = await page.evaluate(() => window.DURATION);
  const dir = path.join(OUT, 'contact'); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir);
  let n = 0; for (let t = 1.5; t < dur; t += step) await shotAt(page, t, path.join(dir, `c_${String(n++).padStart(3, '0')}.jpg`), 85);
  await close();
  for (const f of fs.readdirSync(OUT).filter(f => f.startsWith('sheet_'))) fs.unlinkSync(path.join(OUT, f));
  for (let s = 0; s < n; s += 24) {
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-start_number', String(s), '-i', path.join(dir, 'c_%03d.jpg'), '-frames:v', '1',
      '-vf', `select='lt(n\\,24)',scale=270:480,tile=6x4`, path.join(OUT, `sheet_${String(s / 24 + 1)}.jpg`)]);
  }
  console.log(`${n} frames → ${Math.ceil(n / 24)} sheet(s) in ${OUT} (frame i is at t = 1.5 + i × ${step}s)`);
}

if (cmd === 'frames') { // internal: worker. The 3D frame is rendered once; each extra language only redraws the subtitle overlay.
  const [dir, a, b, langs] = rest;
  const { page, close } = await open(ep);
  for (let f = Number(a); f < Number(b); f++) {
    const name = `f_${String(f).padStart(5, '0')}.jpg`;
    for (const [i, l] of langs.split(',').entries()) {
      if (i === 0) await page.evaluate(t => window.renderAt(t), f / 30);
      else await page.evaluate((l, t) => { window.setLang(l); window.subsAt(t); }, l, f / 30);
      await page.screenshot({ path: path.join(dir, l, name), type: 'jpeg', quality: 93 });
    }
    await page.evaluate(() => window.setLang('zh'));
  }
  await close();
}

// music (input 1) ducks under the narration (input 2) via a sidechain compressor, then the sum is normalised to −16 LUFS
export const MIX = [
  '[1:a]aresample=44100,aformat=channel_layouts=stereo,volume=0.55[m]',
  '[2:a]aresample=44100,aformat=channel_layouts=stereo,asplit=2[v][sc]',
  '[m][sc]sidechaincompress=threshold=0.02:ratio=5:attack=30:release=450:makeup=1[duck]',
  '[duck][v]amix=inputs=2:normalize=0:duration=first,loudnorm=I=-16:TP=-1.5:LRA=11[a]',
].join(';');

if (cmd === 'video') {
  const workers = Number(rest[0] || 3);
  const meta = JSON.parse(fs.readFileSync(path.join(EP, 'episode.json'), 'utf8'));
  const { page, close } = await open(ep); const [dur, allLangs] = await page.evaluate(() => [window.DURATION, window.LANGS]); await close();
  // narrated episodes: only the languages that have a narration track are made
  const voiced = allLangs.filter(l => fs.existsSync(path.join(OUT, `voice_${l}.wav`)));
  const langs = voiced.length ? voiced : allLangs;
  for (const l of allLangs) if (voiced.length && !voiced.includes(l)) console.log(`(no out/voice_${l}.wav: skipping the ${l} video — run tools/voice.mjs ${ep} --lang ${l})`);
  const total = Math.ceil(dur * 30), dir = path.join(OUT, 'frames');
  fs.rmSync(dir, { recursive: true, force: true });
  for (const l of langs) fs.mkdirSync(path.join(dir, l), { recursive: true });
  const t0 = Date.now();
  // score renders while frames do
  const music = path.join(OUT, 'music.wav');
  const score = new Promise((res, rej) => {
    const p = spawn('python3', [path.join(EP, 'score.py'), music], { cwd: ROOT, stdio: 'inherit', env: { ...process.env, PYTHONPATH: path.join(ROOT, 'music') } });
    p.on('exit', c => c ? rej(new Error('score.py failed')) : res());
  });
  const chunk = Math.ceil(total / workers);
  await Promise.all(Array.from({ length: workers }, (_, w) => new Promise((res, rej) => {
    const p = spawn(process.execPath, [fileURLToPath(import.meta.url), 'frames', ep, dir, String(w * chunk), String(Math.min(total, (w + 1) * chunk)), langs.join(',')], { stdio: 'inherit' });
    p.on('exit', c => c ? rej(new Error(`worker ${w} failed`)) : res());
  })));
  await score;
  console.log(`rendered ${total} frames in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  for (const l of langs) {
    const mp4 = path.join(OUT, `${l === 'en' ? meta.title_en || `${meta.title}_EN` : meta.title}.mp4`);
    const voice = path.join(OUT, `voice_${l}.wav`), narrated = voiced.includes(l);
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-framerate', '30', '-i', path.join(dir, l, 'f_%05d.jpg'), '-i', music,
      ...(narrated ? ['-i', voice, '-filter_complex', MIX, '-map', '0:v', '-map', '[a]'] : ['-af', 'loudnorm=I=-16:TP=-1.5:LRA=11']), '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
      '-movflags', '+faststart', '-c:a', 'aac', '-b:a', '192k', '-ar', '44100', '-shortest', mp4], { stdio: 'inherit' });
    console.log('wrote', mp4);
  }
  fs.rmSync(dir, { recursive: true, force: true });
}

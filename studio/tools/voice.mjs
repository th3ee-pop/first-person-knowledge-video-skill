// Narration: synthesise every sentence group with Doubao TTS 2.0, measure it, and write the timeline the video and score follow.
//   node tools/voice.mjs <ep>                       both languages (each needs a voice: --voice or DOUBAO_VOICE_ZH / _EN in .env)
//   node tools/voice.mjs <ep> --lang zh             one language only
//   node tools/voice.mjs <ep> --voice <speaker>     override the speaker (for the language(s) being made)
//   node tools/voice.mjs <ep> --voice <speaker> --sample "<文字>" --out <file.mp3>    audition one voice, writes nothing else
// A card with "cont": true is read in one breath with the next card (one TTS call per group; subtitles switch at a pause).
// Writes episodes/<ep>/voice/<lang>/<group>.mp3, voice/manifest.json, timeline.json and out/voice_<lang>.wav.
// Groups whose text and speaker have not changed are reused from voice/; timeline.json is always recomputed.
// The key is read only from studio/.env (DOUBAO_API_KEY) and never printed.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildTimeline, groupCards } from './timeline.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENDPOINT = 'https://openspeech.bytedance.com/api/v3/tts/unidirectional';
export const VOICE_OFFSET = 0.15; // narration starts this long after its card appears

/** Parse the line-delimited JSON stream from the TTS endpoint into one audio Buffer. Throws on an error code or no audio. */
export function parseTtsStream(text) {
  const parts = [];
  for (const line of String(text).split(/\r?\n/)) {
    const s = line.trim(); if (!s) continue;
    let o; try { o = JSON.parse(s); } catch { throw new Error(`TTS: unreadable response line: ${s.slice(0, 120)}`); }
    const code = o.code ?? 0;
    if (code !== 0 && code !== 20000000) { const e = new Error(`TTS error ${code}: ${o.message ?? ''}`); e.code = code; e.ttsMessage = o.message; throw e; }
    if (o.data) parts.push(Buffer.from(o.data, 'base64'));
    if (code === 20000000) break;
  }
  const buf = Buffer.concat(parts);
  if (!buf.length) { const e = new Error('TTS returned empty audio'); e.code = 'EMPTY'; throw e; }
  return buf;
}

/** What gets read aloud: the subtitle with its line breaks removed (zh joined directly, en with spaces). `small` is never read. */
export function speakText(card, lang) {
  return lang === 'en' ? (card.en ?? '').split('\n').map(s => s.trim()).filter(Boolean).join(' ') : (card.text ?? '').replace(/\n/g, '');
}

export function readEnv(file) {
  const env = {};
  if (!fs.existsSync(file)) return env;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/); if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
  return env;
}

/** POST one text to Doubao TTS; returns mp3 bytes. */
export async function doubaoSynth(text, speaker, cfg) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Api-Key': cfg.key, 'X-Api-Resource-Id': cfg.resource, 'X-Api-Request-Id': crypto.randomUUID() },
    body: JSON.stringify({ user: { uid: 'studio' }, req_params: { text, speaker, audio_params: { format: 'mp3', sample_rate: 24000 } } }),
  });
  const body = await res.text();
  if (!res.ok) {
    try { parseTtsStream(body); } catch (e) { if (e.code && e.code !== 'EMPTY') throw e; }
    throw new Error(`TTS HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  return parseTtsStream(body);
}

export const probeDuration = file => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString().trim());
const hash = s => crypto.createHash('sha1').update(s).digest('hex').slice(0, 16);

/** Pauses inside an audio file: [{ start, end }] from ffmpeg silencedetect (leading / trailing silence included; callers filter). */
export function detectSilences(file, { noise = '-35dB', min = 0.12 } = {}) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', `silencedetect=noise=${noise}:d=${min}`, '-f', 'null', '-'], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`silencedetect failed on ${file}: ${(r.stderr || '').slice(-200)}`);
  const out = []; let st = null;
  for (const line of r.stderr.split('\n')) {
    let m = line.match(/silence_start: (-?[\d.]+)/); if (m) { st = Math.max(0, Number(m[1])); continue; }
    m = line.match(/silence_end: ([\d.]+)/); if (m && st !== null) { out.push({ start: st, end: Number(m[1]) }); st = null; }
  }
  return out;
}

/** How much of a card is read aloud, for sharing a group's audio out: hanzi (and other letters/digits) for zh, words for en. */
export function textUnits(card, lang) {
  const t = speakText(card, lang);
  return lang === 'en' ? t.split(/\s+/).filter(Boolean).length : (t.match(/[\p{L}\p{N}]/gu) ?? []).length;
}

/** Punctuation the reader pauses at, in one card: how many, and whether the card ends on one ("——" counts once). */
export function textMarks(card, lang) {
  const t = speakText(card, lang).replace(/[\s“”"'‘’「」『』《》()（）]+$/u, '');
  const marks = t.match(/(——|—|…+|[，、。！？；：,.!?;:])/gu) ?? [];
  return { count: marks.length, ends: /(——|—|…|[，、。！？；：,.!?;:])$/u.test(t) };
}

/**
 * Where, in one language's audio of a group, each card after the first begins (seconds from the audio's start).
 * If every card but the last ends on punctuation and the audio has exactly one pause per inner punctuation mark,
 * the pauses are matched to the marks in order and each cut is the pause at the card's last mark. Otherwise:
 * estimate by text share and snap to the nearest pause (its middle) within `window` seconds; without a usable
 * pause the estimate stands. Cuts stay increasing and at least `minLen` apart.
 * marks: optional [{ count, ends }] per card (textMarks).
 */
export function findCuts(units, dur, pauses, { window = 1.2, minLen = 0.6, marks = null } = {}) {
  const W = units.reduce((a, b) => a + b, 0) || 1;
  const mids = pauses.filter(p => p.start > 0.05 && p.end < dur - 0.05).map(p => (p.start + p.end) / 2);
  let byMark = null;
  if (marks && marks.length === units.length && marks.slice(0, -1).every(m => m.ends)) {
    const inner = marks.reduce((a, m) => a + m.count, 0) - (marks.at(-1).ends ? 1 : 0);
    if (inner === mids.length) { let n = 0; byMark = marks.slice(0, -1).map(m => mids[(n += m.count) - 1]); }
  }
  const cuts = []; let acc = 0, prev = 0;
  for (let k = 0; k < units.length - 1; k++) {
    acc += units[k];
    const est = acc / W * dur, hi = dur - (units.length - 1 - k) * minLen;
    let c, how;
    if (byMark) { c = byMark[k]; how = 'mark'; }
    else {
      const ok = mids.filter(m => m >= prev + minLen && m <= hi && Math.abs(m - est) <= window);
      c = ok.length ? ok.reduce((a, b) => Math.abs(b - est) < Math.abs(a - est) ? b : a) : est;
      how = ok.length ? 'pause' : 'est';
    }
    c = Math.min(Math.max(c, prev + minLen), hi);
    cuts.push({ est, cut: c, snapped: how !== 'est', how }); prev = c;
  }
  return cuts;
}

/** Sentence groups across an episode: [{ key, seg, idx: [card index in segment], cards }]. A one-card group keeps the card's key (<seg>_<i>). */
export function episodeGroups(subs) {
  const out = [];
  for (const s of subs.segments) for (const g of groupCards(s.cards)) {
    const key = g.length === 1 ? `${s.id}_${g[0]}` : `${s.id}_${g[0]}-${g[g.length - 1]}`;
    out.push({ key, seg: s.id, idx: g, cards: g.map(i => s.cards[i]) });
  }
  return out;
}

/** The text read for a whole group: zh cards run together, en cards joined with a space. */
export const groupText = (g, lang) => g.cards.map(c => speakText(c, lang)).join(lang === 'en' ? ' ' : '');
const groupLabel = g => g.idx.length === 1 ? `${g.seg}[${g.idx[0]}]` : `${g.seg}[${g.idx[0]}–${g.idx[g.idx.length - 1]}]`;

/** lay each group's narration at start + VOICE_OFFSET on a silent track exactly `duration` long */
export function mixTrack(files, starts, duration, out) {
  const args = ['-loglevel', 'error', '-y'];
  for (const f of files) args.push('-i', f);
  const chains = files.map((_, i) => `[${i}:a]aresample=44100,aformat=channel_layouts=mono,adelay=${Math.round((starts[i] + VOICE_OFFSET) * 1000)}[v${i}]`);
  const mix = `${files.map((_, i) => `[v${i}]`).join('')}amix=inputs=${files.length}:normalize=0:dropout_transition=0,apad=whole_dur=${duration.toFixed(3)},atrim=0:${duration.toFixed(3)}[out]`;
  args.push('-filter_complex', [...chains, mix].join(';'), '-map', '[out]', '-ar', '44100', '-ac', '1', out);
  execFileSync('ffmpeg', args, { stdio: 'inherit' });
}

/**
 * Run the command. deps (for tests): envFile, episodesDir, synth(text, speaker, cfg) → Buffer, probe(file) → seconds,
 * silences(file) → [{start,end}], mix(files, starts, duration, out), log, err.
 * Returns the exit code.
 */
export async function main(argv, deps = {}) {
  const log = deps.log ?? console.log, err = deps.err ?? console.error;
  const args = [...argv], opt = {};
  for (const k of ['--lang', '--voice', '--sample', '--out']) { const i = args.indexOf(k); if (i >= 0) { opt[k.slice(2)] = args[i + 1]; args.splice(i, 2); } }
  const [ep] = args;
  if (!ep) { log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(0, 9).join('\n')); return 1; }
  if (opt.lang && !['zh', 'en'].includes(opt.lang)) { err('--lang must be zh or en'); return 1; }

  // the key first: nothing is created when it is missing
  const env = readEnv(deps.envFile ?? path.join(ROOT, '.env'));
  if (!env.DOUBAO_API_KEY) { err('studio/.env 里还没有 DOUBAO_API_KEY（把 key 填在等号后面，见 studio/.env.example）'); return 1; }
  const cfg = { key: env.DOUBAO_API_KEY, resource: env.DOUBAO_TTS_RESOURCE_ID || 'seed-tts-2.0' };
  const synth = deps.synth ?? doubaoSynth, probe = deps.probe ?? probeDuration, silences = deps.silences ?? detectSilences, mix = deps.mix ?? mixTrack;
  const EP = path.join(deps.episodesDir ?? path.join(ROOT, 'episodes'), ep);
  if (!fs.existsSync(path.join(EP, 'subs.json'))) { err(`no episode at ${EP}`); return 1; }

  // ---- audition one voice ----
  if (opt.sample !== undefined) {
    if (!opt.out) { err('--sample needs --out <file.mp3>'); return 1; }
    const lang = opt.lang ?? (/[一-鿿]/.test(opt.sample) ? 'zh' : 'en');
    const speaker = opt.voice || env[`DOUBAO_VOICE_${lang.toUpperCase()}`];
    if (!speaker) { err(`no speaker: pass --voice <speaker>`); return 1; }
    try {
      const audio = await synth(opt.sample, speaker, cfg);
      const out = path.resolve(opt.out); fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, audio);
      log(`${speaker}: ${probe(out).toFixed(2)}s → ${out}`); return 0;
    } catch (e) { err(`${speaker}: ${e.message}`); return 1; }
  }

  // ---- the whole episode ----
  const meta = JSON.parse(fs.readFileSync(path.join(EP, 'episode.json'), 'utf8'));
  const subs = JSON.parse(fs.readFileSync(path.join(EP, 'subs.json'), 'utf8'));
  const cards = subs.segments.flatMap(s => s.cards.map((c, i) => ({ ...c, seg: s.id, i, id: `${s.id}_${i}` })));
  const hasEn = cards.every(c => c.en);
  const langs = [];
  for (const l of opt.lang ? [opt.lang] : ['zh', 'en']) {
    if (l === 'en' && !hasEn) { if (opt.lang) { err('not every card has `en`'); return 1; } continue; }
    const speaker = opt.voice || env[`DOUBAO_VOICE_${l.toUpperCase()}`];
    if (!speaker) {
      if (opt.lang) { err(`no ${l} speaker: set DOUBAO_VOICE_${l.toUpperCase()} in studio/.env or pass --voice`); return 1; }
      log(`(skip ${l}: DOUBAO_VOICE_${l.toUpperCase()} is empty)`); continue;
    }
    langs.push([l, speaker]);
  }
  if (!langs.length) { err('no voice to make: set DOUBAO_VOICE_ZH / DOUBAO_VOICE_EN in studio/.env or pass --voice'); return 1; }

  const groups = episodeGroups(subs);
  const badCont = subs.segments.filter(s => s.cards.at(-1)?.cont).map(s => `${s.id}[${s.cards.length - 1}]`);
  if (badCont.length) { err(`"cont" on the last card of a segment (a sentence cannot run into the next segment): ${badCont.join(', ')}`); return 1; }

  const VD = path.join(EP, 'voice'), MF = path.join(VD, 'manifest.json');
  const manifest = fs.existsSync(MF) ? JSON.parse(fs.readFileSync(MF, 'utf8')) : {};
  const save = () => { fs.mkdirSync(VD, { recursive: true }); fs.writeFileSync(MF, JSON.stringify(manifest, null, 1)); };
  const failed = [];
  for (const [l, speaker] of langs) {
    manifest[l] ??= {}; fs.mkdirSync(path.join(VD, l), { recursive: true });
    let made = 0, kept = 0;
    for (const g of groups) {
      const text = groupText(g, l), h = hash(text), file = path.join(VD, l, `${g.key}.mp3`), m = manifest[l][g.key];
      if (m && m.hash === h && m.speaker === speaker && fs.existsSync(file) && m.dur > 0) { kept++; continue; }
      try {
        const audio = await synth(text, speaker, cfg);
        if (!audio?.length) throw new Error('TTS returned empty audio');
        fs.writeFileSync(file, audio);
        const dur = probe(file);
        if (!(dur > 0.05)) throw new Error(`audio is ${dur}s long`);
        manifest[l][g.key] = { hash: h, speaker, dur: Math.round(dur * 1000) / 1000, text }; made++;
        save(); // cache what worked, even if a later group fails
      } catch (e) {
        delete manifest[l][g.key]; fs.rmSync(file, { force: true });
        failed.push(`${groupLabel(g)} (${l}) “${text}”: ${e.message}`);
      }
    }
    log(`${l} (${speaker}): ${made} synthesised, ${kept} reused`);
  }
  save();
  if (failed.length) { err(`voice failed for ${failed.length} group(s), timeline.json not written:\n  ${failed.join('\n  ')}`); return 1; }

  // a language counts only when every group has up-to-date audio for it
  const voiced = ['zh', 'en'].filter(l => groups.every(g => { const m = manifest[l]?.[g.key]; return m && m.dur > 0 && m.hash === hash(groupText(g, l)) && fs.existsSync(path.join(VD, l, `${g.key}.mp3`)); }));
  const voice = Object.fromEntries(subs.segments.map(s => [s.id, s.cards.map(() => ({}))]));
  for (const g of groups) {
    const v = Object.fromEntries(voiced.map(l => [l, manifest[l][g.key].dur]));
    if (g.idx.length > 1 && voiced.length) {
      // where each later card starts: per language, the pause nearest its share of the text; shared = the mean
      const per = voiced.map(l => {
        const file = path.join(VD, l, `${g.key}.mp3`);
        return [l, findCuts(g.cards.map(c => textUnits(c, l)), v[l], silences(file), { marks: g.cards.map(c => textMarks(c, l)) })];
      });
      v.cuts = g.idx.slice(1).map((_, k) => VOICE_OFFSET + per.reduce((a, [, c]) => a + c[k].cut, 0) / per.length);
      log(`${groupLabel(g)}: ${voiced.map(l => `${l} ${v[l].toFixed(2)}s`).join(', ')}; cuts ${v.cuts.map((c, k) =>
        `${c.toFixed(2)} (${per.map(([l, cs]) => `${l} ${cs[k].cut.toFixed(2)} ${cs[k].how}`).join(', ')})`).join('; ')}`);
    }
    voice[g.seg][g.idx[0]] = v;
  }
  const tl = buildTimeline(meta, subs, voice);
  fs.writeFileSync(path.join(EP, 'timeline.json'), JSON.stringify(tl, null, 1));
  log(`timeline.json: ${tl.cards.length} cards, ${tl.duration.toFixed(2)}s (from ${voiced.join(' + ')})`);

  const OUT = path.join(EP, 'out'); fs.mkdirSync(OUT, { recursive: true });
  const startOf = g => tl.cards.find(c => c.seg === g.seg && c.i === g.idx[0]).start;
  for (const l of ['zh', 'en']) {
    const wav = path.join(OUT, `voice_${l}.wav`);
    if (!voiced.includes(l)) { fs.rmSync(wav, { force: true }); if (l === 'en' && hasEn || l === 'zh') log(`(no ${l} narration: the ${l} video will not be made)`); continue; }
    mix(groups.map(g => path.join(VD, l, `${g.key}.mp3`)), groups.map(startOf), tl.duration, wav);
    log(`wrote ${wav}`);
  }
  const long = tl.cards.map((c, i) => [cards[i].id, c.end - c.start]).filter(([, d]) => d > 7 || d < 1.2);
  if (long.length) log(`check these card lengths: ${long.map(([id, d]) => `${id} ${d.toFixed(2)}s`).join(', ')}`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main(process.argv.slice(2), { envFile: process.env.STUDIO_ENV_FILE || undefined }).then(code => { process.exitCode = code; }, e => { console.error(e.message); process.exitCode = 1; });
}

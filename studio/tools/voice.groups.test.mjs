// Sentence groups in voice.mjs, with fake TTS / probe / silencedetect / mix (no network, no ffmpeg).
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { main, findCuts, textMarks, episodeGroups, groupText, VOICE_OFFSET } from './voice.mjs';
import { buildTimeline } from './timeline.mjs';

function fixture(subs) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'voice-test-'));
  const env = path.join(dir, '.env');
  fs.writeFileSync(env, 'DOUBAO_API_KEY=dummy\nDOUBAO_VOICE_ZH=zhv\nDOUBAO_VOICE_EN=env\n');
  const ep = path.join(dir, 'episodes', 'x'); fs.mkdirSync(ep, { recursive: true });
  fs.writeFileSync(path.join(ep, 'episode.json'), JSON.stringify({ lead: 1, tail: 2, gap: 0.5 }));
  fs.writeFileSync(path.join(ep, 'subs.json'), JSON.stringify(subs));
  return { dir, env, ep };
}
// fake audio: the bytes are the text; its "length" is 0.5 s per hanzi/word unit (+0.2), pauses at each ，/, mark
function fakes({ fail } = {}) {
  const calls = [], mixes = [];
  const seconds = t => /[一-鿿]/.test(t) ? (t.match(/[一-鿿]/g).length * 0.5 + 0.2) : (t.split(/\s+/).length * 0.5 + 0.2);
  return {
    calls, mixes,
    synth: async (text, speaker) => { calls.push([text, speaker]); if (fail && fail(text)) throw new Error('TTS error 45000000: nope'); return Buffer.from(text); },
    probe: file => seconds(fs.readFileSync(file, 'utf8')),
    silences: () => [], // estimate-only cuts unless a test overrides
    mix: (files, starts, duration, out) => mixes.push({ files: files.map(f => path.basename(f)), starts, duration, out: path.basename(out) }),
    log: () => {}, err: () => {},
  };
}
const subs = () => ({ segments: [
  { id: 'S1', cards: [{ text: '一二', en: 'one two', sec: 1 }, { text: '三四，', en: 'three four,', sec: 1, cont: true }, { text: '五六七八', en: 'five six seven eight', sec: 2 }] },
  { id: 'S2', cards: [{ text: '九', en: 'nine', sec: 1 }] },
] });

test('one TTS call per group, with the group text joined', async () => {
  const f = fixture(subs()), d = fakes();
  assert.equal(await main(['x'], { ...d, envFile: f.env, episodesDir: path.join(f.dir, 'episodes') }), 0);
  assert.deepEqual(d.calls.map(c => c[0]), ['一二', '三四，五六七八', '九', 'one two', 'three four, five six seven eight', 'nine']);
  assert.ok(fs.existsSync(path.join(f.ep, 'voice', 'zh', 'S1_1-2.mp3')));
  assert.ok(fs.existsSync(path.join(f.ep, 'voice', 'en', 'S1_0.mp3')));
  // two langs, three groups each → mixed once per language, group starts only
  assert.deepEqual(d.mixes.map(m => m.files), [['S1_0.mp3', 'S1_1-2.mp3', 'S2_0.mp3'], ['S1_0.mp3', 'S1_1-2.mp3', 'S2_0.mp3']]);
  const tl = JSON.parse(fs.readFileSync(path.join(f.ep, 'timeline.json'), 'utf8'));
  assert.equal(tl.cards.length, 4);
  // S1_0: max(zh 1.2, en 1.2) + 0.5
  assert.deepEqual([tl.cards[0].start, tl.cards[0].end], [1, 2.7]);
  // group S1[1–2]: zh 6×0.5+0.2 = 3.2, en 6 words → 3.2; span 3.7; cut by share 2/6 of 3.2 in both + offset
  assert.ok(Math.abs(tl.cards[1].end - (2.7 + VOICE_OFFSET + 3.2 / 3)) < 1e-9);
  assert.ok(Math.abs(tl.cards[2].end - (2.7 + 3.7)) < 1e-9);
  assert.deepEqual(d.mixes[0].starts, [1, 2.7, tl.cards[3].start]);
  assert.equal(d.mixes[0].duration, tl.duration);
});

test('editing one card re-synthesises only its group', async () => {
  const f = fixture(subs()), d = fakes(), deps = { ...d, envFile: f.env, episodesDir: path.join(f.dir, 'episodes') };
  assert.equal(await main(['x'], deps), 0);
  const s = subs(); s.segments[0].cards[2].text = '五六七八九'; fs.writeFileSync(path.join(f.ep, 'subs.json'), JSON.stringify(s));
  d.calls.length = 0;
  assert.equal(await main(['x'], deps), 0);
  assert.deepEqual(d.calls.map(c => c[0]), ['三四，五六七八九']);
});

test('a failed group is named, exits non-zero and writes no timeline.json', async () => {
  const f = fixture(subs()), msgs = [], d = fakes({ fail: t => t.startsWith('three') });
  const code = await main(['x'], { ...d, err: m => msgs.push(m), envFile: f.env, episodesDir: path.join(f.dir, 'episodes') });
  assert.equal(code, 1);
  assert.ok(!fs.existsSync(path.join(f.ep, 'timeline.json')));
  assert.match(msgs.join('\n'), /S1\[1–2\] \(en\)/);
});

test('cont on the last card of a segment is refused before any TTS call', async () => {
  const s = subs(); s.segments[1].cards[0].cont = true;
  const f = fixture(s), d = fakes(), msgs = [];
  assert.equal(await main(['x'], { ...d, err: m => msgs.push(m), envFile: f.env, episodesDir: path.join(f.dir, 'episodes') }), 1);
  assert.equal(d.calls.length, 0);
  assert.match(msgs.join('\n'), /S2\[0\]/);
});

test('an episode without cont times exactly as before (max + gap per card)', async () => {
  const s = subs(); delete s.segments[0].cards[1].cont;
  const f = fixture(s), d = fakes();
  assert.equal(await main(['x'], { ...d, envFile: f.env, episodesDir: path.join(f.dir, 'episodes') }), 0);
  const tl = JSON.parse(fs.readFileSync(path.join(f.ep, 'timeline.json'), 'utf8'));
  const sec = t => (/[一-鿿]/.test(t) ? t.match(/[一-鿿]/g).length : t.split(/\s+/).length) * 0.5 + 0.2;
  const voice = Object.fromEntries(s.segments.map(g => [g.id, g.cards.map(c => ({ zh: sec(c.text.replace(/\n/g, '')), en: sec(c.en) }))]));
  assert.deepEqual(tl, buildTimeline({ lead: 1, tail: 2, gap: 0.5 }, s, voice));
  assert.deepEqual(d.calls.length, 8);
  assert.deepEqual(fs.readdirSync(path.join(f.ep, 'voice', 'zh')).sort(), ['S1_0.mp3', 'S1_1.mp3', 'S1_2.mp3', 'S2_0.mp3']);
});

test('cuts snap to the nearest pause, fall back to the text share, and stay ordered', () => {
  // 3 cards of 2, 2, 4 units in 8 s: estimates at 2 and 4
  assert.deepEqual(findCuts([2, 2, 4], 8, []).map(c => c.cut), [2, 4]);
  const c = findCuts([2, 2, 4], 8, [{ start: 0, end: 0.3 }, { start: 2.3, end: 2.5 }, { start: 3.5, end: 3.7 }, { start: 7.8, end: 8 }]);
  assert.deepEqual(c.map(x => [x.cut, x.snapped]), [[2.4, true], [3.6, true]]);
  // a pause too far away is ignored
  assert.deepEqual(findCuts([1, 1], 10, [{ start: 8, end: 8.2 }]).map(x => [x.cut, x.snapped]), [[5, false]]);
  // the same pause cannot serve two cuts (min length between cuts)
  const d = findCuts([1, 1, 1], 3, [{ start: 1.4, end: 1.6 }], { window: 1, minLen: 0.6 });
  assert.ok(d[1].cut - d[0].cut >= 0.6 - 1e-9);
});

test('group keys and texts', () => {
  const g = episodeGroups(subs());
  assert.deepEqual(g.map(x => x.key), ['S1_0', 'S1_1-2', 'S2_0']);
  assert.equal(groupText(g[1], 'zh'), '三四，五六七八');
  assert.equal(groupText(g[1], 'en'), 'three four, five six seven eight');
});

test('punctuation marks per card', () => {
  assert.deepEqual(textMarks({ text: '他梦里考的，常常是植物学、\n动物学、化学，' }, 'zh'), { count: 4, ends: true });
  assert.deepEqual(textMarks({ text: '梦里那句\n「我不是早就毕业了吗」，' }, 'zh'), { count: 1, ends: true });
  assert.deepEqual(textMarks({ text: '于是梦翻出一场旧考试——\n你当年怕得要死，' }, 'zh'), { count: 2, ends: true });
  assert.deepEqual(textMarks({ en: 'That “didn\'t I graduate?”\nin the dream' }, 'en'), { count: 1, ends: false });
  assert.deepEqual(textMarks({ en: 'He dreamed of botany,\nzoology, chemistry —' }, 'en'), { count: 3, ends: true });
});

test('cuts follow the punctuation when every mark got its pause, even if another pause is nearer the estimate', () => {
  // card 1 has 4 marks (the last ends it), card 2 has 2 (the last is the end of the audio): 5 inner pauses
  const pauses = [1.21, 2.95, 3.83, 4.64, 6.43].map(m => ({ start: m - 0.1, end: m + 0.1 }));
  const marks = [{ count: 4, ends: true }, { count: 2, ends: true }];
  const c = findCuts([14, 17], 8.04, pauses, { marks });
  assert.ok(Math.abs(c[0].cut - 4.64) < 1e-9); assert.equal(c[0].how, 'mark');
  // nearest-pause would have taken 3.83
  assert.ok(Math.abs(findCuts([14, 17], 8.04, pauses)[0].cut - 3.83) < 1e-9);
  // a pause count that does not match the marks → back to nearest-pause
  assert.equal(findCuts([14, 17], 8.04, pauses.slice(1), { marks })[0].how, 'pause');
});

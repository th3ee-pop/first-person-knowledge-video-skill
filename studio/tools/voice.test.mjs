import test from 'node:test'; import assert from 'node:assert/strict';
import { parseTtsStream, speakText } from './voice.mjs';
const b64 = s => Buffer.from(s).toString('base64');
test('joins audio chunks', () => {
  const body = [{ code: 0, data: b64('ab') }, { code: 0, data: null, sentence: {} }, { code: 0, data: b64('cd') }, { code: 20000000, message: 'ok', data: null }].map(o => JSON.stringify(o)).join('\n');
  assert.equal(parseTtsStream(body).toString(), 'abcd');
});
test('throws on error code', () => {
  assert.throws(() => parseTtsStream(JSON.stringify({ code: 45000000, message: 'speaker permission denied' })), /45000000/);
});
test('throws on empty audio', () => {
  assert.throws(() => parseTtsStream(JSON.stringify({ code: 20000000, message: 'ok', data: null })), /empty/i);
});
test('spoken text drops line breaks', () => {
  assert.equal(speakText({ text: '第一行\n第二行', en: 'Line one\nline two' }, 'zh'), '第一行第二行');
  assert.equal(speakText({ text: '第一行\n第二行', en: 'Line one\nline two' }, 'en'), 'Line one line two');
});

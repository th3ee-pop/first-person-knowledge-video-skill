import test from 'node:test'; import assert from 'node:assert/strict';
import { buildTimeline } from './timeline.mjs';
const subs = { segments: [{ id: 'S1', cards: [{ text: 'a', sec: 2 }, { text: 'b', sec: 3 }] }] };
test('legacy: sec × scale', () => {
  const t = buildTimeline({ lead: 1, scale: 1.5, tail: 2 }, subs, null);
  assert.deepEqual(t.cards.map(c => [c.start, c.end]), [[1, 4], [4, 8.5]]);
  assert.equal(t.duration, 10.5);
});
test('voice: longer language + gap', () => {
  const t = buildTimeline({ lead: 1, tail: 2, gap: 0.5 }, subs, { S1: [{ zh: 2, en: 3 }, { zh: 4 }] });
  assert.deepEqual(t.cards.map(c => [c.start, c.end]), [[1, 4.5], [4.5, 9]]);
});
test('voice: a card with no voice falls back to sec × scale', () => {
  const t = buildTimeline({ lead: 0, tail: 0, gap: 0.5 }, subs, { S1: [{ zh: 2 }] });
  assert.deepEqual(t.cards.map(c => [c.seg, c.i, c.start, c.end]), [['S1', 0, 0, 2.5], ['S1', 1, 2.5, 2.5 + 3 * 1.08]]);
});
import { groupCards } from './timeline.mjs';
const grouped = { segments: [{ id: 'S1', cards: [{ text: 'a', sec: 2 }, { text: 'b', sec: 1, cont: true }, { text: 'c', sec: 3, cont: true }, { text: 'd', sec: 4 }] }, { id: 'S2', cards: [{ text: 'e', sec: 2 }] }] };
test('groups: cont joins the next card, within a segment', () => {
  assert.deepEqual(groupCards(grouped.segments[0].cards), [[0], [1, 2, 3]]);
  assert.deepEqual(groupCards([{ cont: true }]), [[0]]);
});
test('voice groups: one span of max + gap, split at the shared cuts', () => {
  const t = buildTimeline({ lead: 1, tail: 2, gap: 0.5 }, grouped, { S1: [{ zh: 2 }, { zh: 7, en: 9, cuts: [3, 5.5] }, {}, {}], S2: [{ en: 1 }] });
  assert.deepEqual(t.cards.map(c => [c.seg, c.i, c.start, c.end]), [['S1', 0, 1, 3.5], ['S1', 1, 3.5, 6.5], ['S1', 2, 6.5, 9], ['S1', 3, 9, 13], ['S2', 0, 13, 14.5]]);
  assert.equal(t.duration, 16.5);
  assert.deepEqual(Object.keys(t.cards[1]), ['seg', 'i', 'start', 'end']);
});
test('voice groups: without cuts the span is shared by sec', () => {
  const t = buildTimeline({ lead: 0, tail: 0, gap: 0 }, grouped, { S1: [{ zh: 2 }, { zh: 8 }, {}, {}], S2: [{ zh: 1 }] });
  assert.deepEqual(t.cards.slice(1, 4).map(c => [c.start, c.end]), [[2, 3], [3, 6], [6, 10]]);
});
test('legacy timing ignores cont', () => {
  const t = buildTimeline({ lead: 0, tail: 0, scale: 1 }, grouped, null);
  assert.deepEqual(t.cards.map(c => c.end - c.start), [2, 1, 3, 4, 2]);
});

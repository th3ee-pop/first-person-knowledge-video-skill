// Card timing for an episode. Shared by the engine (browser), voice.mjs and render.mjs; synth.py reads the JSON it writes.
// Keep this file plain JS (no node: imports): the engine imports it in the browser.
//   voice = null                      → legacy: each card lasts sec × (ep.scale ?? 1.08)
//   voice = { S1: [{ zh, en }, …] }   → each card lasts max(zh, en) + (ep.gap ?? 0.45); a missing language uses the other
// Sentence groups: a card with `cont: true` is read in one breath with the next card of its segment (see groupCards).
// The group's voice sits on its first card as { zh, en, cuts }: zh/en are the whole group's audio lengths and
// cuts[k] is when card k+1 of the group starts, in seconds after the group starts (shared by both languages).
// The group lasts max(zh, en) + gap; without cuts the group's time is shared out by `sec`.
// Returns { lead, tail, duration, cards: [{ seg, i, start, end }] } — exactly what episodes/<id>/timeline.json holds.

/** Indices of one segment's cards, grouped: a `cont` card joins the next one. A trailing `cont` just ends the group. */
export function groupCards(cards) {
  const groups = []; let cur = [];
  cards.forEach((c, i) => { cur.push(i); if (!c.cont) { groups.push(cur); cur = []; } });
  if (cur.length) groups.push(cur);
  return groups;
}

export function buildTimeline(ep, subs, voice = null) {
  const lead = ep.lead ?? 1.4, tail = ep.tail ?? 3.2, scale = ep.scale ?? 1.08, gap = ep.gap ?? 0.45;
  const cards = []; let t = lead;
  for (const s of subs.segments) {
    for (const g of groupCards(s.cards)) {
      const v = voice?.[s.id]?.[g[0]];
      const said = v ? Math.max(v.zh ?? 0, v.en ?? 0) : 0;
      if (g.length === 1 || !(said > 0)) {
        // one card at a time: the old rule (a group without voice falls back to sec × scale per card)
        for (const i of g) {
          const vi = voice?.[s.id]?.[i];
          const si = g.length === 1 ? said : (vi ? Math.max(vi.zh ?? 0, vi.en ?? 0) : 0);
          const d = si > 0 ? si + gap : s.cards[i].sec * scale;
          cards.push({ seg: s.id, i, start: t, end: t + d });
          t += d;
        }
        continue;
      }
      const total = said + gap, start = t;
      let cuts = Array.isArray(v.cuts) && v.cuts.length === g.length - 1 ? v.cuts.slice() : null;
      if (!cuts) { // share by sec
        const w = g.map(i => s.cards[i].sec || 1), W = w.reduce((a, b) => a + b, 0);
        let acc = 0; cuts = w.slice(0, -1).map(x => (acc += x) / W * total);
      }
      const edges = [0, ...cuts.map(c => Math.min(Math.max(c, 0), total)), total];
      for (let k = 1; k < edges.length; k++) edges[k] = Math.max(edges[k], edges[k - 1]);
      g.forEach((i, k) => cards.push({ seg: s.id, i, start: start + edges[k], end: start + edges[k + 1] }));
      t = start + total;
    }
  }
  return { lead, tail, duration: (cards.length ? cards[cards.length - 1].end : lead) + tail, cards };
}

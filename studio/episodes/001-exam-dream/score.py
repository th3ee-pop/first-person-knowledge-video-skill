"""001-exam-dream score: a small, warm lullaby in F major (~76-82 BPM, a ritard to ~66 at the very end), one tune all the way through.

  S1 the dream    plucked pizzicato + marimba: the tune bounces, tiny "oops" grace note, a toy tick-tock under
                  the clock card, three plucks for the pen shake, a rising question on "didn't I graduate?"
  S1_4 wake       the tune rests one beat over a soft held C chord, then the tonic chord settles in (no hit); S1_5 the tune peeks back in
  S2 the book     electric-piano broken chords + soft bass, the tune sparse on music box; a rising sequence
                  from "only those who passed get it" (curious, upward)
  S3 peeling in   D1 curious: a faint pad joins, the tune's cells, a marimba wink at "meeting their parents",
                  the S1 question rising again at "the worry you carried all day"
                  D2 tender (S3_5 childhood fear → S3_7): a touch slower, e-piano sings the tune an octave low,
                  quarter-note broken chords, Bb → Dm → Gm|C, still moving and major-leaning
                  D3 clear (S3_8 the core idea → S3_15): fullest bed, the whole tune with its octave double,
                  Bbmaj9 under "the way you'd wish them to be", the dream's marimba remembered at
                  "digs up an old exam", home on F at "came to nothing", cadence into S4
  S4 home         warm: the question motif from S1 now at peace, the tune once more, a gentle ritard
                  onto F at the last card (S4_6), which rings to the end with one soft re-touch

Bars are laid on a grid between sync points taken from the timeline (0 → S1_4 → S3_0 → S3_5 → S3_8 →
S4_0 → S4_6), so the pulse stays steady inside each part and lands exactly on the cards that matter.
The narration sits in the middle: tune high and sparse, accompaniment soft, bass light.
render.mjs ducks this track under out/voice_<lang>.wav, so nothing here ducks on its own.
"""
import os
from synth import *

s = Score(__file__)
T, E = s.T, s.E
EV = []          # (time, sounding seconds, midi, tag): used by the pitch audit (SCORE_AUDIT=1)
_j = np.random.default_rng(11)


LEVEL = {'bass': 0.42, 'ep': 1.0, 'pizz': 1.0, 'tune': 1.0, 'tune8vb': 1.0, 'tick': 1.0}   # bass kept light under the voice


def put(sig, t, m, ring, pan=0.0, gain=1.0, tag=''):
    t += _j.uniform(-0.006, 0.006)                 # a breath of human timing
    gain *= LEVEL.get(tag, 1.0)
    s.add(sig, t, pan=pan, gain=gain)
    if m is not None: EV.append((t, ring, m, tag))


# ---------------- harmony (F major) ----------------
# name: (bass, upper voicing); upper voicings avoid seconds/tritones against each other and the bass
V = {
    'F':  ('F2',  ['F3', 'C4', 'G4', 'A4']),     # Fadd9
    'Bb': ('Bb2', ['D4', 'F4', 'A4', 'C5']),     # Bbmaj9 (no root up top)
    'Dm': ('D2',  ['A3', 'D4', 'F4', 'C5']),     # Dm7
    'C':  ('C3',  ['G3', 'C4', 'E4', 'D5']),     # Cadd9
    'Gm': ('G2',  ['F3', 'Bb3', 'D4', 'F4']),    # Gm7
    'Am': ('A2',  ['G3', 'C4', 'E4', 'G4']),     # Am7
}

# sections: start → end, one chord per bar ('Gm|C' = two beats each); bar length = span / bars
A = ['F', 'F', 'Bb', 'Dm', 'C', 'F', 'C']                                          # the dream (S1_0-S1_3)
B = ['F', 'Bb', 'F', 'F', 'C', 'Gm', 'Am', 'Bb', 'C', 'F', 'Bb', 'Dm', 'Bb|C']    # wake → the book (S2)
D1 = ['F', 'Bb', 'Dm', 'Gm', 'C', 'F']                                            # S3_0-S3_4: which nights, the panic
D2 = ['Bb', 'Dm', 'Gm|C']                                                         # S3_5-S3_7: the child's fear
D3 = ['F', 'Dm', 'Bb', 'F', 'Dm', 'Bb', 'Gm', 'C', 'F', 'Gm|C']                    # S3_8-S3_15: the core idea
H = ['F', 'Bb', 'F', 'Dm', 'Bb', 'Dm', 'Gm|C']                                     # S4_0-S4_5: home
HW = [1, 1, 1, 1, 1, 1.08, 1.2]                                                   # a gentle ritard into the last chord
bars = []
for sec, chords, t0, t1, w in (('A', A, 0.0, T('S1', 4), None), ('B', B, T('S1', 4), T('S3', 0), None),
                               ('D1', D1, T('S3', 0), T('S3', 5), None), ('D2', D2, T('S3', 5), T('S3', 8), None),
                               ('D3', D3, T('S3', 8), T('S4', 0), None), ('H', H, T('S4', 0), T('S4', 6), HW)):
    w = w or [1] * len(chords); u = (t1 - t0) / sum(w); t = t0
    print(f'  {sec}: {len(chords)} bars from {t0:.2f}s, {u * w[0]:.3f}s = {240 / (u * w[0]):.1f} BPM' + (f' → {240 / (u * w[-1]):.1f}' if w[-1] != w[0] else ''))
    for k, (c, wk) in enumerate(zip(chords, w)):
        bars.append(dict(t=t, L=u * wk, ch=c, sec=sec, k=k)); t += u * wk
SA = [b for b in bars if b['sec'] == 'A']; SB = [b for b in bars if b['sec'] == 'B']
SD1 = [b for b in bars if b['sec'] == 'D1']; SD2 = [b for b in bars if b['sec'] == 'D2']
SD3 = [b for b in bars if b['sec'] == 'D3']; SH = [b for b in bars if b['sec'] == 'H']
tail = T('S4', 6)


def at(b, beat): return b['t'] + beat * b['L'] / 4


def halves(b):
    """[(chord, first beat, beats)] for a bar"""
    cs = b['ch'].split('|')
    return [(c, i * 4 / len(cs), 4 / len(cs)) for i, c in enumerate(cs)]


# ---------------- accompaniment ----------------
def acc_play(b, vel=1.0, stop=4.0, ramp=False):
    """the dream: pizzicato bounce + short bass on 1 and 3, a soft e-piano chord underneath"""
    bt = b['L'] / 4
    for c, b0, nb in halves(b):
        bass, up = V[c]
        for bb in (0, 2):
            if b0 <= bb < b0 + nb and bb < stop:
                put(softbass(n(bass), 0.7 * bt, 0.36 * vel * ((0.2 + 0.5 * bb / 4) if ramp else 1)), at(b, bb), n(bass), 0.7 * bt, pan=-0.1, tag='bass')
        for x in up[:2]:                                            # held through the whole bar (also through the breath)
            put(epiano(n(x), nb * bt, 0.15 * vel), at(b, b0), n(x), nb * bt, pan=-0.2, tag='ep')
        hold = min(nb, stop - b0) * bt                              # a faint in-tune pad so the bounces never sit in a hole
        put(softpad([n(x) for x in up[:3]], hold, 0.05 * vel, a=0.4 * bt, r=0.5 * bt), at(b, b0), None, 0)
        EV.extend((at(b, b0), hold, n(x), 'pad') for x in up[:3])
        for bb, i, v in ((0, 1, 1), (0.5, 3, .6), (1, 2, .8), (1.5, 3, .55), (2, 1, .9), (2.5, 3, .6), (3, 2, .8), (3.5, 3, .55)):
            if b0 <= bb < b0 + nb and bb < stop:
                m = n(up[i]) + 12 if i < 2 else n(up[i])
                if ramp: v *= 0.35 + 0.65 * bb / 4                       # the first bar grows in
                put(pluck(m, 0.18 * v * vel), at(b, bb), m, 0.25, pan=0.3 if i % 2 else -0.3, tag='pizz')


def acc_tell(b, vel=1.0, pad=0.0):
    """the book and after: e-piano broken chord in gentle eighths, bass on 1 (long) and 3 (short), optional pad"""
    bt = b['L'] / 4
    for c, b0, nb in halves(b):
        bass, up = V[c]
        put(softbass(n(bass), min(nb, 2) * bt * 0.9, 0.55 * vel), at(b, b0), n(bass), min(nb, 2) * bt, pan=-0.1, tag='bass')
        if nb > 2: put(softbass(n(bass), 0.8 * bt, 0.35 * vel), at(b, b0 + 2), n(bass), 0.8 * bt, pan=-0.1, tag='bass')
        order = (0, 2, 1, 3, 2, 1, 3, 2)
        for j in range(int(nb * 2)):
            bb = b0 + j * 0.5; i = order[j % 8]
            v = (1.0 if j % 2 == 0 else 0.72) * (1.1 if j == 0 else 1.0)
            d = min(0.9, b0 + nb - bb - 0.12) * bt                      # never ring into the next chord
            put(epiano(n(up[i]), d, 0.12 * v * vel), at(b, bb) + (0.03 * bt if j % 2 else 0), n(up[i]), d,
                pan=-0.25 + 0.5 * (i / 3), tag='ep')
        if pad: put(softpad([n(x) for x in up[:3]], nb * bt, pad, a=0.8 * bt, r=0.5 * bt), at(b, b0), None, 0)
        if pad: EV.extend((at(b, b0), nb * bt, n(x), 'pad') for x in up[:3])


def acc_soft(b, vel=1.0, pad=0.0):
    """the tender part: the same harmony in quarter notes (half the motion of acc_tell), bass on 1 and 3, pad"""
    bt = b['L'] / 4
    for c, b0, nb in halves(b):
        bass, up = V[c]
        put(softbass(n(bass), min(nb, 2) * bt * 0.95, 0.5 * vel), at(b, b0), n(bass), min(nb, 2) * bt, pan=-0.1, tag='bass')
        if nb > 2: put(softbass(n(bass), 0.9 * bt, 0.3 * vel), at(b, b0 + 2), n(bass), 0.9 * bt, pan=-0.1, tag='bass')
        order = (0, 2, 1, 3)
        for j in range(int(nb)):
            bb = b0 + j; i = order[j % 4]
            d = min(1.6, b0 + nb - bb - 0.1) * bt
            put(epiano(n(up[i]), d, 0.11 * (1.08 if j == 0 else 0.9) * vel), at(b, bb), n(up[i]), d,
                pan=-0.25 + 0.5 * (i / 3), tag='ep')
        if pad:
            put(softpad([n(x) for x in up[:3]], nb * bt, pad, a=0.8 * bt, r=0.5 * bt), at(b, b0), None, 0)
            EV.extend((at(b, b0), nb * bt, n(x), 'pad') for x in up[:3])


def tune(b, notes, inst='box', vel=0.3, pan=0.15, octave_double=0.0):
    """notes: [(name, beat, beats)] with beats counted from bar b (can run past its end inside one section)"""
    bt = b['L'] / 4
    for nm, bb, d in notes:
        m = n(nm); t = at(b, bb)
        if inst == 'box': put(musicbox(m, vel), t, m, min(d * bt, 0.9), pan=pan, tag='tune')
        elif inst == 'marimba': put(marimba(m, vel), t, m, min(d * bt, 0.35), pan=pan, tag='tune')
        elif inst == 'pluck': put(pluck(m, vel), t, m, 0.25, pan=pan, tag='tune')
        elif inst == 'ep': put(epiano(m, d * bt * 0.92, vel), t, m, d * bt * 0.92, pan=pan, tag='tune')
        if octave_double: put(epiano(m - 12, d * bt * 0.8, octave_double), t, m - 12, d * bt * 0.8, pan=-pan, tag='tune8vb')


# the tune: four one-bar cells (sol-la-sol-mi | do-re-mi | la-sol-la-do' | ti-la-sol) and a cadence cell
M1 = [('C6', 0, .5), ('D6', .5, .5), ('C6', 1, 1), ('A5', 2, 2)]
M2 = [('F5', 0, 1), ('G5', 1, 1), ('A5', 2, 2)]
M3 = [('D6', 0, .5), ('C6', .5, .5), ('D6', 1, 1), ('F6', 2, 2)]
M4 = [('E6', 0, 1), ('D6', 1, 1), ('C6', 2, 2)]
M7 = [('Bb5', 0, 1), ('D6', 1, 1), ('C6', 2, 1), ('G6', 3, 1)]          # over Gm7 | C: up to G6, which steps down onto the last F6

# ================= S1: the dream =================
for i, b in enumerate(SA):
    if i == 0: acc_play(b, 0.8, ramp=True)
    elif i == len(SA) - 1: acc_play(b, 0.95, stop=3)              # beat 4 is a held breath before waking
    else: acc_play(b, 1.0)

tune(SA[1], M1, 'marimba', 0.42)
tune(SA[2], [('F5', 0, 1), ('G5', 1, 1), ('G#5', 1.82, .18), ('A5', 2, 2)], 'marimba', 0.42)   # G#5: chromatic "oops" grace
tune(SA[3], M3, 'marimba', 0.42)
# pen shake: three quick plucks on one note, then nothing… then a little shrug
pen = SA[4]
for k in range(3): put(pluck(n('G5'), 0.32 - 0.06 * k), at(pen, k * 0.5), n('G5'), 0.25, pan=0.2, tag='tune')
tune(pen, [('E6', 2.5, .5), ('C6', 3, 1)], 'marimba', 0.36)
# "twenty minutes gone": the opening cell hurried into eighths: comic, not alarming
tune(SA[5], [('C6', 0, .5), ('D6', .5, .5), ('C6', 1, .5), ('A5', 1.5, .5), ('C6', 2, .5), ('D6', 2.5, .5), ('C6', 3, 1)], 'marimba', 0.40)
# "wait, didn't I graduate?": a rising question left hanging on the 9th
tune(SA[6], [('G5', 0, .5), ('A5', .5, .5), ('C6', 1, .5), ('D6', 1.5, 1.5)], 'marimba', 0.42)
tune(SA[6], [('D6', 1.5, 1.5)], 'box', 0.18)
# the breath before waking: the tune stops, a soft C chord stays so it is a pause, not a drop-out
q = SA[6]; put(softpad([n('G3'), n('C4'), n('E4')], at(q, 4) - at(q, 2) + 0.2, 0.07, a=0.5, r=0.6), at(q, 2), None, 0)
EV.extend((at(q, 2), at(q, 4) - at(q, 2), n(x), 'pad') for x in ('G3', 'C4', 'E4'))

# the classroom clock as a toy tick-tock on the beat, only while that card is up (steady, never faster)
for b in SA:
    for bb in range(4):
        t = at(b, bb)
        if T('S1', 2) <= t < E('S1', 2) - 0.1:
            m = n('C7') if bb % 2 == 0 else n('G6')
            put(marimba(m, 0.07), t, m, 0.12, pan=0.45, tag='tick')

# ================= S1_4 wake → S1_5 → S2 =================
w = SB[0]
for k, x in enumerate(V['F'][1] + ['C5']):                          # the tonic, gently rolled
    put(epiano(n(x), 3.6 * w['L'] / 4, 0.13), w['t'] + k * 0.08, n(x), 3.6 * w['L'] / 4, pan=-0.3 + 0.15 * k, tag='ep')
put(softbass(n('F2'), w['L'] * 0.9, 0.4), w['t'], n('F2'), w['L'] * 0.9, tag='bass')
tune(w, [('C6', 0, 1), ('A5', 1, 1), ('F5', 2, 2)], 'box', 0.24)         # a settling sigh down the tonic chord
acc_tell(SB[1], 0.75)
# S1_5 "it's back": the dream's pizzicato and the first cell peek back in, then one cheeky afterthought
acc_play(SB[2], 0.7)
tune(SB[2], [('C6', 0, .5), ('D6', .5, .5), ('C6', 1, 1), ('A5', 3.5, .5)], 'marimba', 0.40)

for b in SB[3:]: acc_tell(b, 0.95)
tune(SB[3], M1, 'box', 0.24)                                            # S2_0
tune(SB[4], M4, 'box', 0.22)
# from S2_2 ("only those who passed"): a curious, rising sequence, one long note per bar
tune(SB[5], [('Bb5', 0, 1), ('D6', 1, 3)], 'box', 0.24)
tune(SB[6], [('C6', 0, 1), ('E6', 1, 3)], 'box', 0.24)
tune(SB[7], [('D6', 0, 1), ('F6', 1, 3)], 'box', 0.25)
tune(SB[8], [('E6', 0, 1), ('G6', 1, 3)], 'box', 0.25)
tune(SB[9], M1, 'box', 0.24)
tune(SB[10], M2, 'box', 0.22)
tune(SB[11], M3, 'box', 0.24)
tune(SB[12], [('D6', 0, 1), ('C6', 1, 1), ('G5', 3, .5), ('A5', 3.5, .5)], 'box', 0.22)   # Bb|C, pickup into S3

# ================= S3 D1: which nights, where the panic comes from (curious) =================
for i, b in enumerate(SD1): acc_tell(b, 0.86, pad=0.035 + 0.005 * i)
tune(SD1[0], M1, 'box', 0.25)
tune(SD1[1], M2, 'box', 0.23)
tune(SD1[2], M3, 'box', 0.25)
tune(SD1[3], [('D6', 0, .5), ('F6', .5, .5)], 'marimba', 0.30)        # "meeting their parents": a little wink
tune(SD1[3], [('D6', 2, 1), ('C6', 3, 1)], 'box', 0.18)
tune(SD1[4], [('D6', 0, 1), ('E6', 1, 1), ('C6', 2, 2)], 'box', 0.25)        # M4 turned round, a little query
# "the worry you carried all day": the dream's own question rises once more, left open over F
tune(SD1[5], [('G5', 0, .5), ('A5', .5, .5), ('C6', 1, .5), ('D6', 1.5, 1.5), ('C6', 3, 1)], 'box', 0.24)

# ================= S3 D2: a kid's fear of punishment (tender, a touch slower) =================
for b in SD2: acc_soft(b, 0.9, pad=0.06)
# the tune sung low and slow on e-piano, under the voice's brightness; music box only on the turn
tune(SD2[0], [('F4', 0, 1), ('G4', 1, 1), ('A4', 2, 2)], 'ep', 0.34, pan=0.1)              # M2, an octave down
tune(SD2[1], [('A4', 0, 1), ('C5', 1, 1), ('D5', 2, 2)], 'ep', 0.34, pan=0.1)
tune(SD2[1], [('D6', 2, 2)], 'box', 0.12)
tune(SD2[2], [('D5', 0, 1), ('Bb4', 1, 1), ('C5', 2, 2)], 'ep', 0.32, pan=0.1)
tune(SD2[2], [('G5', 3, .5), ('A5', 3.5, .5)], 'box', 0.20)                                # pickup into the core idea

# ================= S3 D3: the core idea, the old exam that came to nothing (clear, open) =================
for i, b in enumerate(SD3):
    if i in (6, 7): acc_tell(b, 0.86, pad=0.06)                        # the dream remembered: a lighter bed
    else: acc_tell(b, 0.9, pad=0.08 if i < 2 else 0.09)
tune(SD3[0], M1, 'box', 0.28, octave_double=0.05)                      # S3_8 "Freud's core idea"
tune(SD3[1], M4, 'box', 0.27, octave_double=0.05)
tune(SD3[2], M3, 'box', 0.29, octave_double=0.06)                      # Bbmaj9 under "the way you'd wish them to be"
tune(SD3[3], M2, 'box', 0.27, octave_double=0.06)
tune(SD3[4], M1, 'box', 0.27, octave_double=0.05)
tune(SD3[5], [('D6', 0, 1), ('C6', 1, 1), ('A5', 2, 2)], 'box', 0.26, octave_double=0.05)
# "digs up an old exam": the dream's marimba comes back, friendly now
tune(SD3[6], [('D6', 0, .5), ('C6', .5, .5), ('Bb5', 1, 1), ('D6', 2, 2)], 'marimba', 0.32)
tune(SD3[7], [('C6', 0, .5), ('D6', .5, .5), ('C6', 1, .5), ('A5', 1.5, .5), ('G5', 2, 2)], 'marimba', 0.32)
tune(SD3[8], [('A5', 0, 1), ('C6', 1, 1), ('F6', 2, 2)], 'box', 0.28, octave_double=0.05)   # "came to nothing": home
tune(SD3[9], M7, 'box', 0.28, octave_double=0.05)                      # cadence into S4

# ================= S4: home (warm resolution, gentle ritard) =================
for i, b in enumerate(SH): acc_tell(b, 0.86 if i < 5 else 0.82, pad=0.09)
# "didn't I graduate?" again, but now it is answered by the tune instead of left hanging
tune(SH[0], [('G5', 0, .5), ('A5', .5, .5), ('C6', 1, .5), ('D6', 1.5, 1.5), ('C6', 3, 1)], 'box', 0.25, octave_double=0.04)
tune(SH[1], M2, 'box', 0.25, octave_double=0.05)                       # S4_1 "it's comfort"
tune(SH[2], M1, 'box', 0.27, octave_double=0.05)                       # S4_2 "don't fear tomorrow"
tune(SH[3], M4, 'box', 0.26, octave_double=0.05)
tune(SH[4], M3, 'box', 0.27, octave_double=0.05)
tune(SH[5], [('D6', 0, 1), ('C6', 1, 1), ('A5', 2, 2)], 'box', 0.25, octave_double=0.05)
tune(SH[6], M7, 'box', 0.27)                                                                  # S4_5 "tomorrow will pass too"

# the end (S4_6, dawn): home on F, rolled wide, the tune's last note on top. It sits under the last card, so it is
# voiced at the same strength as the rest of S4; after the card ends the chord blooms once softly and decays to the last frame
ring = s.dur - tail; last = E('S4', 6)
for k, x in enumerate(['F3', 'C4', 'G4', 'A4', 'C5', 'F5']):
    put(epiano(n(x), ring, 0.10), tail + k * 0.06, n(x), ring, pan=-0.35 + 0.14 * k, tag='ep')
put(softbass(n('F2'), ring, 0.42), tail, n('F2'), ring, tag='bass')
put(softpad([n('F3'), n('C4'), n('A4')], last - tail + 0.4, 0.09, a=0.3, r=2.6), tail, None, 0)
EV.extend((tail, ring, n(x), 'pad') for x in ('F3', 'C4', 'A4'))
put(musicbox(n('F6'), 0.28), tail, n('F6'), 0.9, tag='tune')
put(musicbox(n('C6'), 0.18), tail + 0.75, n('C6'), 0.9, tag='tune')
put(musicbox(n('F6'), 0.14), tail + 1.5, n('F6'), 0.9, tag='tune')
# the bloom after the last card: a soft re-touch of the chord and two music-box notes, left to ring out
r2 = last + 0.1
for k, x in enumerate(['F3', 'A4', 'C5', 'F5']):
    put(epiano(n(x), s.dur - r2, 0.07), r2 + k * 0.09, n(x), s.dur - r2, pan=-0.2 + 0.13 * k, tag='ep')
put(softbass(n('F2'), s.dur - r2, 0.25), r2, n('F2'), s.dur - r2, tag='bass')
put(softpad([n('F3'), n('C4'), n('A4')], s.dur - r2, 0.05, a=0.5, r=1.0), r2, None, 0)
EV.extend((r2, s.dur - r2, n(x), 'pad') for x in ('F3', 'C4', 'A4'))
put(musicbox(n('A5'), 0.13), r2 + 0.3, n('A5'), 0.9, tag='tune')
put(musicbox(n('C6'), 0.10), r2 + 1.0, n('C6'), 0.9, tag='tune')

s.write(level=0.4)    # ~-20 dBFS RMS, about where the old score sat, so the narration stays on top after render.mjs's mix

# ---------------- pitch audit (SCORE_AUDIT=1) ----------------
if os.environ.get('SCORE_AUDIT'):
    SCALE = {5, 7, 9, 10, 0, 2, 4}                                     # F G A Bb C D E
    names = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B']
    out = sorted({(names[m % 12] + str(m // 12 - 1), tag) for _, _, m, tag in EV if m % 12 not in SCALE})
    print('out-of-scale notes:', out or 'none')
    used = sorted({m for _, _, m, _ in EV})
    print('all pitches used:', ' '.join(names[m % 12] + str(m // 12 - 1) for m in used))
    ev = sorted(EV); bad = []
    for i, (t, d, m, g) in enumerate(ev):
        for t2, d2, m2, g2 in ev[i + 1:]:
            if t2 >= t + d: break
            iv = abs(m - m2)
            if iv in (1, 6, 13) or (iv % 12 == 6 and iv <= 30): bad.append((round(t, 2), round(t2, 2), names[m % 12] + str(m // 12 - 1), g, names[m2 % 12] + str(m2 // 12 - 1), g2, iv))
    print(f'{len(bad)} overlapping m2 / tritone / m9 pairs')
    for x in bad[:40]: print('  ', x)

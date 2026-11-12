"""Tiny synthesiser for episode scores. Everything is generated, so there are no licensing questions.

    from synth import *
    s = Score(__file__)                 # reads episode.json + subs.json next to score.py
    s.add(piano(n('A4'), 1.2), s.T('S1', 0))
    s.write()                           # → path given on the command line (render.mjs passes out/music.wav)

Times: s.T(seg, i) / s.E(seg, i) are a card's start / end in seconds, identical to the video.
"""
import json, os, sys, wave
import numpy as np

SR = 44100
BEAT = 60 / 72
_rng = np.random.default_rng(7)
NOTE = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}


def m2f(m): return 440.0 * 2 ** ((m - 69) / 12)


def n(name):
    """'A3', 'C#5', 'Bb2' → MIDI number"""
    k = NOTE[name[0]]; i = 1
    if name[1] in '#b': k += 1 if name[1] == '#' else -1; i = 2
    return 12 * (int(name[i:]) + 1) + k


def chord(*names): return [n(x) for x in names]


def env(nsamp, a=0.005, r=0.3):
    e = np.ones(nsamp); na = max(1, int(a * SR)); nr = min(nsamp, max(1, int(r * SR)))
    e[:na] = np.linspace(0, 1, na); e[-nr:] *= np.linspace(1, 0, nr) ** 1.5
    return e


# ---------------- instruments (each returns a mono numpy array) ----------------
def piano(m, dur, vel=0.5, bright=1.0):
    f = m2f(m); tt = np.arange(int((dur + 1.6) * SR)) / SR; out = np.zeros_like(tt)
    for h in range(1, 11):
        fh = f * h * np.sqrt(1 + 0.00035 * h * h)
        if fh > 9000: break
        amp = (1 / h ** 1.35) * (bright ** (h - 1) if h > 1 else 1)
        out += amp * np.sin(2 * np.pi * fh * tt + h) * np.exp(-tt * (0.55 + h * 0.38 + f / 900))
    out += 0.04 * np.exp(-tt * 60) * _rng.standard_normal(len(tt))
    e = np.ones_like(tt); held = int(dur * SR); e[held:] = np.exp(-(tt[held:] - dur) * 7)
    e[:int(0.004 * SR)] = np.linspace(0, 1, int(0.004 * SR))
    return out * e * vel * 0.32


def pluck(m, vel=0.5):
    f = m2f(m); tt = np.arange(int(0.9 * SR)) / SR
    out = sum((1 / h ** 1.6) * np.sin(2 * np.pi * f * h * tt) * np.exp(-tt * (6 + h * 3)) for h in range(1, 7))
    return out * vel * 0.35 * env(len(tt), 0.002, 0.05)


def bell(m, dur=2.5, vel=0.4):
    f = m2f(m); tt = np.arange(int(dur * SR)) / SR
    parts = [(1, 1, 1.2), (2.0, 0.5, 2.0), (2.76, 0.35, 2.6), (5.4, 0.18, 4.5), (8.93, 0.08, 7)]
    return sum(a * np.sin(2 * np.pi * f * r * tt) * np.exp(-tt * d) for r, a, d in parts) * vel * 0.3 * env(len(tt), 0.002, 0.2)


def musicbox(m, vel=0.4):
    f = m2f(m); tt = np.arange(int(2.2 * SR)) / SR
    out = np.sin(2 * np.pi * f * tt) * np.exp(-tt * 2.2) + 0.45 * np.sin(2 * np.pi * f * 4.07 * tt) * np.exp(-tt * 6) + 0.2 * np.sin(2 * np.pi * f * 6.9 * tt) * np.exp(-tt * 9)
    return out * vel * 0.28 * env(len(tt), 0.001, 0.1)


def marimba(m, vel=0.4):
    f = m2f(m); tt = np.arange(int(0.8 * SR)) / SR
    out = np.sin(2 * np.pi * f * tt) * np.exp(-tt * 7) + 0.3 * np.sin(2 * np.pi * f * 3.93 * tt) * np.exp(-tt * 22)
    return out * vel * 0.4 * env(len(tt), 0.001, 0.05)


def pad(ms, dur, vel=0.3, a=1.5, r=2.0, bright=0.5):
    tt = np.arange(int((dur + r) * SR)) / SR; out = np.zeros_like(tt)
    for m in ms:
        f = m2f(m)
        for det in (-0.08, 0.0, 0.07):
            ff = f * 2 ** (det / 12)
            for h, amp in ((1, 1), (2, 0.35 * bright), (3, 0.15 * bright), (4, 0.06 * bright)):
                out += amp * np.sin(2 * np.pi * ff * h * tt + _rng.random() * 6)
    out *= (1 + 0.15 * np.sin(2 * np.pi * 0.23 * tt)) / (len(ms) * 3)
    e = np.ones_like(tt); na = max(1, int(a * SR)); e[:na] = np.linspace(0, 1, na) ** 2
    held = int(dur * SR); e[held:] = np.linspace(1, 0, len(tt) - held) ** 2
    return out * e * vel


def tick(vel=0.15, hi=True):
    tt = np.arange(int(0.05 * SR)) / SR; f = 3200 if hi else 2300
    return (np.sin(2 * np.pi * f * tt) * np.exp(-tt * 180) + 0.3 * _rng.standard_normal(len(tt)) * np.exp(-tt * 400)) * vel


def noise_swell(dur, vel=0.2, rise=True, smooth=0.985):
    x = _rng.standard_normal(int(dur * SR))
    # one-pole low-pass via cumulative filter
    y = np.empty_like(x); acc = 0.0
    for i in range(len(x)): acc = smooth * acc + (1 - smooth) * x[i]; y[i] = acc
    e = np.linspace(0, 1, len(x)) ** 2
    return y / (np.abs(y).max() + 1e-9) * (e if rise else e[::-1]) * vel


def sweep(f0, f1, dur, vel=0.2):
    tt = np.arange(int(dur * SR)) / SR
    ph = 2 * np.pi * np.cumsum(f0 * (f1 / f0) ** (tt / dur)) / SR
    return (np.sin(ph) + 0.3 * np.sin(2 * ph)) * vel * env(len(tt), 0.05, 0.3)


def thud(vel=0.6):
    tt = np.arange(int(0.9 * SR)) / SR
    ph = 2 * np.pi * np.cumsum(55 + 70 * np.exp(-tt * 18)) / SR
    return np.sin(ph) * np.exp(-tt * 6) * vel


def shutter(vel=0.25):
    a = _rng.standard_normal(int(0.025 * SR)) * np.exp(-np.arange(int(0.025 * SR)) / SR * 160)
    return np.concatenate([a, np.zeros(int(0.06 * SR)), a * 0.7]) * vel


def keyclick(vel=0.06):
    tt = np.arange(int(0.03 * SR)) / SR
    return (_rng.standard_normal(len(tt)) * np.exp(-tt * 300) + np.sin(2 * np.pi * 1800 * tt) * np.exp(-tt * 250) * 0.5) * vel


def heartbeat(vel=0.5):
    tt = np.arange(int(0.5 * SR)) / SR
    one = np.sin(2 * np.pi * 52 * tt) * np.exp(-tt * 14)
    out = np.concatenate([one, np.zeros(int(0.05 * SR))]); out = np.concatenate([out, one * 0.6])
    return out * vel


# ---- soft, warm voices (added for 001's lullaby score; deterministic: no noise, no detune) ----
def epiano(m, dur, vel=0.4):
    """Rhodes-ish electric piano: a gentle FM tine whose brightness fades fast, leaving a round sine."""
    f = m2f(m); tt = np.arange(int((dur + 1.2) * SR)) / SR
    idx = 0.6 * np.exp(-tt * 5) + 0.1
    out = np.sin(2 * np.pi * f * tt + idx * np.sin(2 * np.pi * f * tt)) * np.exp(-tt * (0.9 + f / 1400))
    out += 0.08 * np.sin(2 * np.pi * 2 * f * tt) * np.exp(-tt * 3)
    e = np.ones_like(tt); held = int(dur * SR); e[held:] = np.exp(-(tt[held:] - dur) * 6)
    na = int(0.006 * SR); e[:na] = np.linspace(0, 1, na)
    return out * e * vel * 0.3


def softbass(m, dur, vel=0.4):
    """round sine bass with a touch of second harmonic and a soft attack"""
    f = m2f(m); tt = np.arange(int((dur + 0.5) * SR)) / SR
    out = (np.sin(2 * np.pi * f * tt) + 0.22 * np.sin(2 * np.pi * 2 * f * tt) * np.exp(-tt * 4)) * np.exp(-tt * 1.1)
    e = np.ones_like(tt); held = int(dur * SR); e[held:] = np.exp(-(tt[held:] - dur) * 9)
    na = int(0.02 * SR); e[:na] = np.linspace(0, 1, na)
    return out * e * vel * 0.45


def softpad(ms, dur, vel=0.2, a=1.2, r=1.8):
    """pure, in-tune pad (no detune): sines with a little 2nd harmonic and a slow breathing swell"""
    tt = np.arange(int((dur + r) * SR)) / SR; out = np.zeros_like(tt)
    for k, m in enumerate(ms):
        f = m2f(m)
        out += np.sin(2 * np.pi * f * tt + k) + 0.18 * np.sin(2 * np.pi * 2 * f * tt + k)
    out *= (1 + 0.08 * np.sin(2 * np.pi * 0.2 * tt)) / len(ms)
    e = np.ones_like(tt); na = max(1, int(a * SR)); e[:na] = np.linspace(0, 1, na) ** 2
    held = int(dur * SR); e[held:] = np.linspace(1, 0, len(tt) - held) ** 2
    return out * e * vel


# ---------------- score ----------------
class Score:
    def __init__(self, score_file):
        d = os.path.dirname(os.path.abspath(score_file))
        ep = json.load(open(os.path.join(d, 'episode.json')))
        subs = json.load(open(os.path.join(d, 'subs.json')))
        tl_file = os.path.join(d, 'timeline.json')  # written by tools/voice.mjs; identical to what the engine uses
        if os.path.exists(tl_file):
            tl = json.load(open(tl_file))
            self.seg = {s['id']: [None] * len(s['cards']) for s in subs['segments']}
            for c in tl['cards']: self.seg[c['seg']][c['i']] = (c['start'], c['end'])
            if any(x is None for v in self.seg.values() for x in v): raise SystemExit('timeline.json does not match subs.json: re-run tools/voice.mjs')
            self.dur = tl['duration']
        else:
            lead, scale, tail = ep.get('lead', 1.4), ep.get('scale', 1.08), ep.get('tail', 3.2)
            self.seg, t = {}, lead
            for s in subs['segments']:
                self.seg[s['id']] = []
                for c in s['cards']:
                    dd = c['sec'] * scale; self.seg[s['id']].append((t, t + dd)); t += dd
            self.dur = t + tail
        self.N = int(self.dur * SR) + SR * 4
        self.L = np.zeros(self.N); self.R = np.zeros(self.N)

    def T(self, s, i): return self.seg[s][i][0]
    def E(self, s, i): return self.seg[s][i][1]

    def add(self, sig, start, pan=0.0, gain=1.0):
        i0 = int(start * SR)
        if i0 >= self.N or i0 + len(sig) <= 0: return
        if i0 < 0: sig = sig[-i0:]; i0 = 0
        sig = sig[:self.N - i0] * gain
        lg, rg = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        self.L[i0:i0 + len(sig)] += sig * lg * 1.414; self.R[i0:i0 + len(sig)] += sig * rg * 1.414

    def arp(self, chords, start, beats_per_chord=4, pattern=(0, 2, 1, 3, 2, 1), step=0.5, vel=0.3, until=None, pan=0.0, bass=True):
        """broken-chord piano; chords are lists of MIDI notes (first = bass root). Returns end time."""
        t0 = start
        for ch in chords:
            if until and t0 >= until: break
            if bass: self.add(piano(ch[0] - 12, beats_per_chord * BEAT, vel * 1.1), t0, pan=-0.2)
            k, tb = 0, 0.0
            while tb < beats_per_chord - 1e-6:
                tt = t0 + tb * BEAT
                if until and tt >= until: break
                m = ch[1:][pattern[k % len(pattern)] % (len(ch) - 1)]
                self.add(piano(m, step * BEAT * 1.6, vel * (1.0 if k % 2 == 0 else 0.85)), tt, pan=pan + 0.25 * np.sin(k))
                k += 1; tb += step
            t0 += beats_per_chord * BEAT
        return t0

    def melody(self, notes, start, vel=0.3, inst=None, pan=0.15, beat=BEAT):
        """notes: [(name, beat, dur_beats?)] relative to start"""
        for item in notes:
            nm, b = item[0], item[1]; d = item[2] if len(item) > 2 else 1.5
            sig = (inst or (lambda m, d: piano(m, d * beat, vel)))(n(nm), d)
            self.add(sig, start + b * beat, pan=pan)

    def write(self, path=None, reverb=0.28, level=1.0):
        """level < 1 scales the finished mix down (render.mjs mixes it at a fixed 0.55 under the narration)"""
        path = path or (sys.argv[1] if len(sys.argv) > 1 else 'music.wav')
        L, R = _reverb(self.L, reverb, 1), _reverb(self.R, reverb, 2)
        mix = np.stack([L, R], axis=1)
        fi = int(1.0 * SR); mix[:fi] *= np.linspace(0, 1, fi)[:, None]
        end = int(self.dur * SR); fo = int(2.5 * SR); mix[end - fo:end] *= np.linspace(1, 0, fo)[:, None] ** 1.5; mix = mix[:end]
        mix /= np.abs(mix).max() + 1e-9
        mix = np.tanh(mix * 1.6) / np.tanh(1.6) * 0.89
        if level != 1.0: mix = mix * level
        with wave.open(path, 'wb') as w:
            w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype(np.int16).tobytes())
        print(f'score: {self.dur:.2f}s → {path}')


def _reverb(x, mix=0.28, seed=1, seconds=2.6):
    rr = np.random.default_rng(seed); ln = int(seconds * SR)
    ir = rr.standard_normal(ln) * np.exp(-np.arange(ln) / SR * (6.9 / seconds)); ir[:int(0.012 * SR)] = 0; ir /= np.sqrt((ir ** 2).sum())
    size = 1 << int(np.ceil(np.log2(len(x) + ln)))
    y = np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(ir, size), size)[:len(x)]
    return x * (1 - mix) + y * mix * 1.6

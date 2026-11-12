"""000-demo score: quiet night piano → the void (pad + ticks) → one bell for "the hour that is yours" → dawn in C major."""
from synth import *

s = Score(__file__)
T, E = s.T, s.E

# night: slow A-minor arpeggio under S1 and the start of S2
night = [chord('A2', 'A3', 'C4', 'E4'), chord('F2', 'F3', 'A3', 'C4'), chord('C3', 'G3', 'C4', 'E4'), chord('G2', 'G3', 'B3', 'D4')]
s.arp(night * 2, 0.6, vel=0.26, until=T('S2', 1))
s.add(tick(0.07), T('S1', 0) + 0.2)                     # the clock
for i in range(6): s.add(tick(0.05, hi=i % 2 == 0), T('S1', 0) + 0.2 + i * 0.5, pan=0.3)

# void: the day's schedule rains in as soft marimba ticks over a low pad
s.add(sweep(220, 70, 1.6, 0.12), T('S2', 1) - 0.4)
s.add(pad(chord('A2', 'E3', 'B3'), E('S2', 2) - T('S2', 1), vel=0.22), T('S2', 1))
for i in range(14): s.add(marimba(n(['E5', 'A4', 'C5', 'B4'][i % 4]), 0.14), T('S2', 1) + 0.2 + i * 0.18, pan=(i % 5 - 2) * 0.2)
s.add(bell(n('E5'), 3.5, 0.35), T('S2', 2) + 0.4)       # the block that is yours lifts
s.add(bell(n('A5'), 3.0, 0.18), T('S2', 2) + 1.1)

# back in the room, then dawn
s.arp([chord('F2', 'F3', 'A3', 'C4'), chord('G2', 'G3', 'B3', 'D4')], T('S3', 0) - 0.3, vel=0.24)
s.arp([chord('C3', 'G3', 'C4', 'E4'), chord('F2', 'A3', 'C4', 'F4'), chord('C3', 'E3', 'G3', 'C4')], T('S3', 1), vel=0.28, step=0.5)
s.melody([('E5', 0, 2), ('D5', 2, 1), ('C5', 3, 3)], T('S3', 1) + 4 * BEAT, vel=0.22, inst=lambda m, d: musicbox(m, 0.3))
s.add(pad(chord('C3', 'G3', 'E4'), s.dur - T('S3', 1), vel=0.16, a=3), T('S3', 1))

s.write()

"""__ID__ score. Times come from s.T / s.E, so music stays in sync when cards change."""
from synth import *

s = Score(__file__)
T, E = s.T, s.E

night = [chord('A2', 'A3', 'C4', 'E4'), chord('F2', 'F3', 'A3', 'C4'), chord('C3', 'G3', 'C4', 'E4'), chord('G2', 'G3', 'B3', 'D4')]
s.arp(night * 4, 0.6, vel=0.26, until=T('S2', 0))
s.add(sweep(220, 70, 1.6, 0.12), T('S2', 0) - 0.4)
s.add(pad(chord('A2', 'E3', 'B3'), T('S3', 0) - T('S2', 0), vel=0.22), T('S2', 0))
s.add(bell(n('E5'), 3.5, 0.3), T('S2', 0) + 1.2)
s.arp([chord('C3', 'G3', 'C4', 'E4'), chord('F2', 'A3', 'C4', 'F4'), chord('C3', 'E3', 'G3', 'C4')] * 2, T('S3', 0), vel=0.26, until=s.dur)
s.write()

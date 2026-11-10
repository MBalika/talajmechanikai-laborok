# Műfaj-alapú zene- és hangeffekt-generátor (48 kHz sztereó, determinisztikus)
# python3 kit/music2.py events.json music.json out.wav
# music.json: {genre, key, prog, roots, seed, sections:[[b0,b1,nev]], transitions:{risers,impacts,downs}, lead:[[...],[...]], musicGain, fxGain}
# műfajok: acid trap breakbeat garage futurebass deephouse nudisco moombah dnb synthwave afro electro melodic chiptune dubstep trance phonk
import json, sys, os, numpy as np
from scipy import signal
from scipy.io import wavfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import synthlib as L
from synthlib import SR, note_hz, lp, hp, bp, saw, sweep_filter, env_adsr, SFX as OLD_SFX
from synth2 import *
import synth2 as S2

EV = json.load(open(sys.argv[1])); CF = json.load(open(sys.argv[2])); OUT = sys.argv[3]
L.reseed(CF.get('seed', 7))
BPM = EV['bpm']; BEAT = 60 / BPM; BAR = 4 * BEAT
TOTAL = EV['total'] + 0.6; N = int(TOTAL * SR)
GENRE = CF.get('genre', 'acid')
def tb(bar, beat=0.0): return (bar * 4 + beat) * BEAT
def buf(): return np.zeros((2, N), np.float32)
M = buf(); D = buf(); FX = buf(); REV = buf(); DLY = buf(); TEX = buf()
def place(bus, x, t, gain=1.0, pan=0.0):
    i = int(round(t * SR))
    if i >= N or gain == 0: return
    if x.ndim == 1: x = stereo(x, pan)
    if i + x.shape[1] <= 0: return
    j0 = max(0, i); k0 = j0 - i; j1 = min(N, i + x.shape[1])
    bus[:, j0:j1] += x[:, k0:k0 + (j1 - j0)] * gain
def P(bus, x, t, g=1.0, pan=0.0, rev=0.0, dly=0.0):
    place(bus, x, t, g, pan)
    if rev: place(REV, x, t, g * rev, pan)
    if dly: place(DLY, x, t, g * dly, pan)
_cache = {}
def C(name, fn, var=3):  # hangminta-gyorsítótár (néhány változat)
    k = (name, int(L.rng.integers(var)))
    if k not in _cache: _cache[k] = fn()
    return _cache[k]
kicks = []
def K(t, fn, g=1.0, name=None):
    place(D, C(name or fn.__name__, fn, 1), t, g); kicks.append(t)

# ---------------- harmónia ----------------
DEF = {  # műfaj-alapértékek: hangnem, akkordmenet (fokok a tonikához), basszus-gyökök, lendület, oldalláncolás, késleltetés (ütés), zengés
 'acid':      dict(key=57, prog=[[0, 3, 7, 10], [0, 3, 7, 10], [-2, 2, 5, 9], [-4, 0, 3, 7]], roots=[0, 0, -2, -4], swing=0.0, sc=0.6, dly=0.75, rev=0.5),
 'trap':      dict(key=53, prog=[[0, 3, 7], [-4, 0, 3], [-5, -1, 2], [-4, 0, 3]], roots=[0, -4, -5, -4], swing=0.0, sc=0.3, dly=0.5, rev=0.6),
 'breakbeat': dict(key=52, prog=[[0, 3, 7], [0, 3, 7], [5, 8, 12], [3, 7, 10]], roots=[0, 0, 5, 3], swing=0.1, sc=0.35, dly=0.75, rev=0.45),
 'garage':    dict(key=56, prog=[[0, 3, 7, 10], [-4, 0, 3, 7], [-7, -3, 0, 3], [-2, 2, 5, 9]], roots=[0, -4, -7, -2], swing=0.34, sc=0.45, dly=0.75, rev=0.5),
 'futurebass': dict(key=58, prog=[[-4, 0, 3, 7], [-2, 2, 5, 9], [0, 3, 7, 10], [-5, -1, 2, 7]], roots=[-4, -2, 0, -5], swing=0.0, sc=0.75, dly=0.75, rev=0.6),
 'deephouse': dict(key=57, prog=[[0, 3, 7, 10, 14], [-2, 2, 5, 9, 12], [-4, 0, 3, 7, 10], [-5, -1, 2, 5, 9]], roots=[0, -2, -4, -5], swing=0.18, sc=0.45, dly=0.75, rev=0.55),
 'nudisco':   dict(key=55, prog=[[0, 3, 7, 10], [5, 9, 12, 15], [3, 7, 10, 14], [5, 9, 12, 15]], roots=[0, 5, 3, 5], swing=0.08, sc=0.4, dly=0.5, rev=0.45),
 'moombah':   dict(key=54, prog=[[0, 3, 7], [-4, 0, 3], [3, 7, 10], [-2, 2, 5]], roots=[0, -4, 3, -2], swing=0.0, sc=0.35, dly=0.75, rev=0.45),
 'dnb':       dict(key=54, prog=[[0, 3, 7, 10], [-4, 0, 3, 7], [-7, -3, 0, 3], [-5, -2, 2, 5]], roots=[0, -4, -7, -5], swing=0.0, sc=0.4, dly=0.375, rev=0.6),
 'synthwave': dict(key=57, prog=[[0, 3, 7], [-4, 0, 3], [-7, -3, 0], [-5, -1, 2]], roots=[0, -4, -7, -5], swing=0.0, sc=0.35, dly=0.5, rev=0.75),
 'afro':      dict(key=55, prog=[[0, 3, 7, 10], [-2, 2, 5, 9], [-4, 0, 3, 7], [-2, 2, 5, 9]], roots=[0, -2, -4, -2], swing=0.12, sc=0.45, dly=0.75, rev=0.5),
 'electro':   dict(key=56, prog=[[0, 4, 7, 11], [-3, 0, 4, 7], [-5, -1, 2, 5], [-7, -3, 0, 4]], roots=[0, -3, -5, -7], swing=0.0, sc=0.7, dly=0.75, rev=0.4),
 'melodic':   dict(key=55, prog=[[0, 3, 7], [-4, 0, 3], [-2, 2, 5], [-5, -2, 2]], roots=[0, -4, -2, -5], swing=0.0, sc=0.55, dly=0.75, rev=0.75),
 'chiptune':  dict(key=60, prog=[[0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2]], roots=[0, -3, -7, -5], swing=0.0, sc=0.15, dly=0.75, rev=0.2),
 'dubstep':   dict(key=53, prog=[[0, 3, 7], [1, 5, 8], [-2, 2, 5], [-4, 0, 3]], roots=[0, 1, -2, -4], swing=0.0, sc=0.35, dly=0.75, rev=0.6),
 'trance':    dict(key=58, prog=[[-3, 0, 4], [-7, -3, 0], [0, 4, 7], [-5, -1, 2]], roots=[-3, -7, 0, -5], swing=0.0, sc=0.6, dly=0.75, rev=0.7),
 'phonk':     dict(key=54, prog=[[0, 3, 7], [-4, 0, 3], [-5, -2, 2], [-4, 0, 3]], roots=[0, -4, -5, -4], swing=0.0, sc=0.3, dly=0.5, rev=0.5),
}[GENRE]
KEY = CF.get('key', DEF['key']); SW = CF.get('swing', DEF['swing'])
PROG = [[KEY + i for i in ch] for ch in CF.get('prog', DEF['prog'])]
ROOT = [KEY - 12 + r for r in CF.get('roots', DEF['roots'])]
SECT = CF['sections']; NBARS = max(s[1] for s in SECT)
ENERGY = {'intro': 1, 'title': 3, 'grooveA': 3, 'grooveA2': 3, 'reveal': 2, 'half': 2, 'drive': 4, 'grooveB': 4, 'drop': 5, 'break': 1, 'build': 2, 'outro': 0, 'none': 0}
def section(bar):
    for b0, b1, nm in SECT:
        if b0 <= bar < b1: return nm
    return 'none'
def sec_start(bar):
    for b0, b1, nm in SECT:
        if b0 <= bar < b1: return b0, b1
    return bar, bar + 1
def chord(bar): return PROG[bar % len(PROG)]
def root(bar): return ROOT[bar % len(ROOT)]
def s16(t0, k): return t0 + k * BEAT / 4 + (SW * BEAT / 4 if k % 2 else 0)
def nxt(bar): return section(bar + 1)
def fill_bar(bar): return ENERGY[nxt(bar)] > ENERGY[section(bar)] or (nxt(bar) == 'drop' and section(bar) != 'drop')
MOT = CF.get('lead')
def motif(bar, default):
    mm = MOT or default; return mm[bar % len(mm)]
HAT = lambda o=False: C('hat' + str(o), lambda: L.hat(o), 4)

# ================= MŰFAJOK =================
def g_acid(bar, sec, t0, E):
    r = root(bar); c = chord(bar); b0, b1 = sec_start(bar); u = (bar - b0 + 1) / max(1, b1 - b0)
    if E >= 3 or sec == 'build':
        for k in range(4): K(t0 + k * BEAT, kick_techno, 0.95)
    elif E == 2:
        for k in (0, 2): K(t0 + k * BEAT, kick_techno, 0.9)
    elif sec == 'intro': K(t0, lambda: lp(kick_techno(), 260), 0.7, 'kt_lp')
    if E >= 3:
        for b in range(4):
            for j, g in ((1, 0.16), (2, 0.12), (3, 0.16)): place(M, sub(r, BEAT / 4 * 0.85, g), t0 + b * BEAT + j * BEAT / 4)
        for k in (1, 3): P(D, C('clap', L.clap), t0 + k * BEAT, 0.42, 0.05, rev=0.3)
    if E >= 2 or sec == 'build':
        for k in range(16): place(D, HAT(k % 4 == 2 and E >= 4), s16(t0, k), (0.85 if k % 4 == 2 else 0.4), 0.25)
    if E >= 4:
        for k in range(4): place(D, C('ride', ride, 2), t0 + (k + 0.5) * BEAT, 0.6, -0.3)
    if sec == 'build':
        for k in range(16 if bar % 2 else 8): place(D, C('sn', snare_tight, 3), t0 + k * BAR / (16 if bar % 2 else 8), 0.2 + 0.5 * k / 16)
    # acid-futam
    PATS = [[(0, 1, 0), (0, 0, 0), (12, 0, 1), (0, 0, 0), (3, 1, 0), None, (0, 0, 0), (10, 0, 1), (12, 1, 0), (0, 0, 0), (7, 0, 0), None, (0, 1, 0), (3, 0, 1), (5, 0, 0), (7, 1, 0)],
            [(0, 1, 0), None, (0, 0, 0), (12, 1, 1), (0, 0, 0), (3, 0, 0), (5, 1, 0), None, (0, 0, 0), (10, 0, 1), (12, 0, 0), (0, 1, 0), (7, 0, 0), None, (3, 1, 1), (2, 0, 0)]]
    if sec != 'outro':
        cut = {'intro': 0.05 + 0.25 * u, 'build': 0.25 + 0.6 * u, 'break': 0.15, 'half': 0.35, 'reveal': 0.35, 'title': 0.4, 'grooveA': 0.45, 'grooveA2': 0.55, 'drive': 0.6 + 0.2 * u, 'drop': 0.95}.get(sec, 0.4)
        pat = PATS[bar % 2]; prev = None
        for k, st in enumerate(pat):
            if st is None: prev = None; continue
            d, acc, sl = st; m = r + 12 + d
            dur = BEAT / 4 * (1.9 if sl else 0.8)
            P(M, acid(m, dur, acc, cut, 7.5, prev if sl else None, 'saw' if bar % 4 < 2 else 'sq', 0.2), s16(t0, k), 1.0, 0.1, dly=0.12 + 0.2 * (E >= 4))
            prev = m
    if E >= 4 and bar % 2 == 1: P(M, stab([n + 12 for n in c], BEAT * 0.3, 3200, 400, 0.08), t0 + 3.5 * BEAT, 1.0, 0.3, rev=0.4, dly=0.5)
    if sec in ('intro', 'break', 'half', 'reveal'): P(M, L.pad([n + 12 for n in c[:3]], BAR * 1.02, 0.08, 900 + 900 * (E >= 2)), t0, 1.0, rev=0.5)

def g_trap(bar, sec, t0, E):
    r = root(bar); c = chord(bar); up = [n + 12 for n in c]
    pats = [[0, 1.75, 2.5], [0, 0.75, 2.25, 3.5], [0, 1.5, 2.75], [0, 0.75, 1.75, 2.5, 3.75]]
    if E >= 3:
        kp = pats[bar % 4] if E >= 4 else pats[bar % 2 * 2]
        for i, b in enumerate(kp):
            K(t0 + b * BEAT, lambda: lp(kick_techno(), 3000), 0.8, 'kt808')
            dur = ((kp[i + 1] if i + 1 < len(kp) else 4) - b) * BEAT * 0.95
            place(M, b808(r if i % 3 != 2 else r + 12 if E >= 5 else r, dur, 0.4, glide_from=(r + 12 if (i == len(kp) - 1 and E >= 5) else None)), t0 + b * BEAT)
        P(D, C('clap', L.clap), t0 + 2 * BEAT, 0.7, rev=0.35); place(D, C('sn', snare_tight, 3), t0 + 2 * BEAT, 0.45)
        rolls = bar % 2 == 1
        for k in range(8):
            if rolls and k >= 6:
                n = 3 if k == 6 else 6
                for j in range(n): place(D, C('h8', hat808, 3), t0 + k * BEAT / 2 + j * BEAT / 2 / n, 0.45 + 0.1 * j / n, 0.3)
            else: place(D, C('h8', hat808, 3), t0 + k * BEAT / 2, 0.7 if k % 2 == 0 else 0.45, 0.3)
        if bar % 4 == 3: place(D, C('h8o', lambda: hat808(True), 2), t0 + 3.5 * BEAT, 0.6, -0.3)
    elif sec in ('half', 'reveal', 'build'):
        K(t0, lambda: lp(kick_techno(), 3000), 0.8, 'kt808'); place(M, b808(r, BAR * 0.9, 0.3), t0)
        if sec == 'build':
            for k in range(16): place(D, C('sn', snare_tight, 3), t0 + k * BEAT / 4, 0.15 + 0.45 * k / 16)
        else: P(D, C('clap', L.clap), t0 + 2 * BEAT, 0.5, rev=0.4)
    # bell-ostinato
    if E >= 2 or sec == 'intro':
        pat = [0, 2, 1, 2, 0, 2, 1, 3]
        for k in range(8):
            m = up[pat[k] % len(up)] + (12 if pat[k] == 3 else 0)
            P(M, mallet(m, 0.5, 0.075 if E >= 3 else 0.06, 3.5), t0 + k * BEAT / 2, 1.0, -0.3 if k % 2 else 0.3, dly=0.3, rev=0.2)
    if sec in ('intro', 'break', 'half'): P(M, choir(up, BAR, 'o', 0.06), t0, 1.0, rev=0.6)
    if E >= 4:
        mo = motif(bar, [[(0, 7, 0.5), (0.5, 8, 0.5), (1, 7, 0.5), (1.5, 3, 1.0), (2.75, 2, 0.25), (3, 3, 1.0)], [(0, 7, 0.5), (0.5, 10, 0.5), (1, 8, 1.0), (2, 7, 0.5), (2.5, 5, 0.5), (3, 3, 1.0)]])
        for (b, d, du) in mo: P(M, flute(KEY + 12 + d, du * BEAT, 0.13), t0 + b * BEAT, 1.0, 0.1, rev=0.35, dly=0.2)

def g_breakbeat(bar, sec, t0, E):
    r = root(bar); c = chord(bar); up = [n + 12 for n in c]
    if E >= 3:
        for k in ((0, 10) if bar % 2 == 0 else (0, 6, 10)): K(s16(t0, k), kick_techno, 0.95)
        for k in (4, 12): P(D, C('sn', L.snare, 3), s16(t0, k), 0.75, rev=0.3)
        for k in ((7, 9, 15) if bar % 2 else (9, 14)): place(D, C('sn', L.snare, 3), s16(t0, k), 0.25)
        for k in range(8): place(D, HAT(k == 7), s16(t0, 2 * k), 0.8 if k % 2 else 0.55, -0.2)
        if E >= 4:
            for k in range(16):
                if k % 2: place(D, HAT(), s16(t0, k), 0.35, 0.3)
    elif sec in ('half', 'reveal'):
        K(t0, kick_techno, 0.9); P(D, C('sn', L.snare, 3), t0 + 2 * BEAT, 0.6, rev=0.4)
        for k in range(8): place(D, HAT(), t0 + k * BEAT / 2, 0.4)
    elif sec == 'build':
        for k in range(16): place(D, C('sn', L.snare, 3), t0 + k * BEAT / 4, 0.2 + 0.5 * k / 16)
    if E >= 3:  # big-beat basszusriff
        riff = [(0, 0, 0.5), (0.75, 0, 0.25), (1.5, 12, 0.5), (2.5, 10, 0.25), (2.75, 7, 0.5), (3.5, 5, 0.25)]
        for (b, d, du) in riff:
            x = np.tanh(resf(saw(note_hz(r + d), int(du * BEAT * SR)), 500 + 1800 * (E >= 4), q=2.0) * 2.5) * 0.22
            place(M, x * ar(len(x), 0.003, 0.02, du * BEAT - 0.02), s16(t0, int(b * 4)))
    if E >= 4:
        for b in (0, 2.5): P(M, brass(up, BEAT * 0.4, 0.12), t0 + b * BEAT, 1.0, rev=0.3)
        if bar % 2 == 1: P(M, vox(KEY + 19, 0.18, 'a', 0.16, False), t0 + 3 * BEAT, 1.0, 0.2, rev=0.5, dly=0.3)
    if sec in ('grooveA', 'grooveA2', 'title', 'half'): P(M, organ(up, BAR * 0.98, 0.06), t0, 1.0, rev=0.3)
    if sec in ('intro', 'break'): P(M, L.pad(up, BAR * 1.02, 0.08, 1200), t0, 1.0, rev=0.5)
    if E >= 5:
        mo = motif(bar, [[(0, 12, 0.25), (0.5, 12, 0.25), (0.75, 10, 0.25), (1.5, 7, 0.5), (2.5, 10, 0.25), (3, 12, 0.75)], [(0, 15, 0.5), (0.75, 12, 0.25), (1.5, 10, 0.5), (2.5, 7, 0.5), (3.25, 5, 0.5)]])
        for (b, d, du) in mo: P(M, sqlead(KEY + 12 + d, du * BEAT, 0.09), t0 + b * BEAT, 1.0, -0.15, dly=0.3)

def g_garage(bar, sec, t0, E):
    r = root(bar); c = chord(bar); up = [n + 12 for n in c]
    if E >= 3 or sec == 'build':
        for k in ((0, 11) if bar % 2 == 0 else (0, 7, 10)): K(s16(t0, k), kick_deep, 0.95)
        for k in (4, 12): place(D, C('st', snare_tight, 3), s16(t0, k), 0.6); place(D, C('rim', rim, 2), s16(t0, k), 0.5); place(REV, C('st', snare_tight, 3), s16(t0, k), 0.15)
        for k in range(16): place(D, HAT(k % 4 == 2 and k == 14), s16(t0, k), (0.7 if k % 2 else 0.35), 0.25)
        for k in range(16): place(D, C('sh', shaker, 3), s16(t0, k), 0.5 if k % 2 else 0.25, -0.35)
    elif sec in ('half', 'reveal'):
        K(t0, kick_deep, 0.9); place(D, C('rim', rim, 2), t0 + 2 * BEAT, 0.6)
        for k in range(8): place(D, C('sh', shaker, 3), s16(t0, 2 * k + 1), 0.4)
    if E >= 3:
        bl = [(0, 0, 0.75), (1.5, 0, 0.5), (2.5, 7, 0.25), (2.75, 10, 0.5), (3.5, 12, 0.25)] if bar % 2 == 0 else [(0, 0, 1.0), (1.75, 3, 0.25), (2.5, 0, 0.75), (3.5, -2, 0.25)]
        for (b, d, du) in bl: place(M, sub(r + d, du * BEAT, 0.34), s16(t0, int(b * 4))); place(M, pluckbass(r + d + 12, du * BEAT, 0.08, 0.6), s16(t0, int(b * 4)))
        for k in ((2, 7, 10) if bar % 2 == 0 else (2, 6, 13)): P(M, organ(up, BEAT * 0.22, 0.07), s16(t0, k), 1.0, 0.15, rev=0.25, dly=0.2)
    if sec in ('intro', 'break', 'half', 'reveal', 'build'): P(M, epiano(up, BAR * 0.95, 0.1, 0.6), t0, 1.0, rev=0.4)
    if E >= 4 or sec == 'title':
        mo = motif(bar, [[(0.5, 7, 0.25, 'a'), (0.75, 10, 0.25, 'o'), (1.5, 12, 0.5, 'a'), (2.5, 10, 0.25, 'e'), (2.75, 7, 0.5, 'o'), (3.5, 5, 0.25, 'a')], [(0.25, 3, 0.25, 'o'), (0.75, 5, 0.5, 'a'), (1.75, 7, 0.25, 'e'), (2.25, 10, 0.5, 'a'), (3.25, 7, 0.5, 'o')]])
        for st in mo:
            b, d, du = st[:3]; vw = st[3] if len(st) > 3 else 'a'
            P(M, vox(KEY + 12 + d, du * BEAT, vw, 0.12), s16(t0, int(round(b * 4))), 1.0, 0.1, rev=0.3, dly=0.25)

def g_futurebass(bar, sec, t0, E):
    r = root(bar); c = chord(bar); up = [n + 12 for n in c]
    if E >= 3:
        for b in ((0, 1.5, 2.75) if bar % 2 == 0 else (0, 0.75, 2.5)): K(t0 + b * BEAT, kick_techno, 0.95)
        P(D, C('clap', L.clap), t0 + 2 * BEAT, 0.75, rev=0.4); place(D, C('st', snare_tight, 3), t0 + 2 * BEAT, 0.5)
        for k in range(8):
            if bar % 4 == 3 and k >= 6:
                for j in range(3): place(D, C('h8', hat808, 3), t0 + k * BEAT / 2 + j * BEAT / 6, 0.5, 0.3)
            else: place(D, C('h8', hat808, 3), t0 + k * BEAT / 2, 0.6, 0.3)
        place(M, sub(r, BAR * 0.95, 0.3), t0)
    elif sec in ('half', 'reveal'):
        K(t0, kick_techno, 0.8); P(D, C('clap', L.clap), t0 + 2 * BEAT, 0.5, rev=0.5); place(M, sub(r, BAR * 0.95, 0.25), t0)
    elif sec == 'build':
        n = 8 if bar % 2 == 0 else 16
        for k in range(n): place(D, C('clap', L.clap), t0 + k * BAR / n, 0.15 + 0.45 * k / n)
    if E >= 4:
        P(M, futurechord(up + [c[0] + 24], BAR * 0.98, 0.15, pump_rate=2 if E >= 5 else 1, beat=BEAT), t0, 1.0, rev=0.3)
    elif E >= 2 or sec in ('intro', 'break'):
        P(M, futurechord(up, BAR * 0.98, 0.08 if E < 3 else 0.11, None, BEAT, bend=E >= 3), t0, 1.0, rev=0.5)
    if E >= 3 or sec == 'build':
        pat = [0, 1, 2, 3, 2, 1, 0, 2]
        for k in range(8):
            m = up[pat[k] % len(up)] + 12
            P(M, L.pluck(m, 0.2, 5000, 0.07), t0 + k * BEAT / 2, 1.0, -0.4 if k % 2 else 0.4, dly=0.3)
    if E >= 5 or sec == 'title':
        mo = motif(bar, [[(0, 12, 0.5, 'a'), (0.75, 10, 0.25, 'o'), (1.0, 7, 0.5, 'a'), (1.75, 10, 0.25, 'e'), (2.0, 12, 0.75, 'a'), (3.0, 15, 0.5, 'o')], [(0, 14, 0.5, 'a'), (0.75, 12, 0.25, 'o'), (1.0, 10, 0.75, 'a'), (2.25, 7, 0.25, 'e'), (2.5, 10, 0.5, 'a'), (3.25, 12, 0.5, 'o')]])
        for st in mo:
            b, d, du = st[:3]; P(M, vox(KEY + 12 + d, du * BEAT, st[3] if len(st) > 3 else 'a', 0.12), t0 + b * BEAT, 1.0, 0.0, rev=0.35, dly=0.3)

def g_deephouse(bar, sec, t0, E):
    r = root(bar); c = chord(bar); up = [n + 12 for n in c]
    if E >= 3 or sec == 'build':
        for k in range(4): K(t0 + k * BEAT, kick_deep, 0.9)
        for k in (1, 3): place(D, C('rim', rim, 2), s16(t0, 4 * k), 0.5, 0.2); P(D, C('clap', L.clap), t0 + k * BEAT, 0.3, rev=0.4)
        for k in range(16): place(D, C('sh', shaker, 3), s16(t0, k), 0.45 if k % 2 else 0.2, -0.3)
        for k in range(4): place(D, HAT(True), t0 + (k + 0.5) * BEAT, 0.35, 0.3)
    elif E == 2:
        for k in (0, 2): K(t0 + k * BEAT, kick_deep, 0.8)
        for k in range(8): place(D, C('sh', shaker, 3), s16(t0, 2 * k + 1), 0.4, -0.3)
    if E >= 3:
        bl = [(0, 0, 0.5), (0.75, 12, 0.25), (1.5, 0, 0.5), (2.5, 10, 0.25), (2.75, 0, 0.5), (3.5, 7, 0.25)]
        for (b, d, du) in bl: place(M, pluckbass(r + d, du * BEAT, 0.28, 0.5), s16(t0, int(b * 4)))
        for b in ((0, 1.5, 2.75) if bar % 2 == 0 else (0.5, 2.0, 3.25)): P(M, epiano(up, BEAT * 0.6, 0.12, 0.7), s16(t0, int(b * 4)), 1.0, rev=0.25)
    else:
        if sec != 'outro': P(M, epiano(up, BAR * 0.95, 0.11, 0.55), t0, 1.0, rev=0.45); place(M, sub(r, BAR * 0.95, 0.18), t0)
    if E >= 4: P(M, stab([n + 12 for n in up[:4]], BEAT * 0.3, 2600, 300, 0.06), s16(t0, 14), 1.0, 0.2, rev=0.4, dly=0.6)
    if E >= 4 or sec == 'title':
        mo = motif(bar, [[(0, 15, 0.5), (0.75, 14, 0.25), (1.5, 10, 0.5), (2.5, 7, 0.5), (3.25, 10, 0.5)], [(0.5, 12, 0.5), (1.25, 10, 0.25), (1.5, 7, 0.5), (2.75, 3, 0.5), (3.5, 5, 0.5)]])
        for (b, d, du) in mo: P(M, mallet(KEY + 12 + d, 0.6, 0.08, 4.0), t0 + b * BEAT, 1.0, 0.25, dly=0.4, rev=0.2)

def g_nudisco(bar, sec, t0, E):
    r = root(bar); c = chord(bar); up = [n + 12 for n in c]
    if E >= 3 or sec == 'build':
        for k in range(4): K(t0 + k * BEAT, kick_deep, 0.95)
        for k in (1, 3): P(D, C('clap', L.clap), t0 + k * BEAT, 0.55, rev=0.3); place(D, C('tamb', tamb, 2), t0 + k * BEAT, 0.6, 0.35)
        for k in range(4): place(D, HAT(True), t0 + (k + 0.5) * BEAT, 0.55, 0.3)
        if E >= 4:
            for k in range(16):
                if k % 2: place(D, HAT(), s16(t0, k), 0.4, -0.3)
    elif E == 2:
        K(t0, kick_deep, 0.85); K(t0 + 2 * BEAT, kick_deep, 0.85)
        for k in range(4): place(D, HAT(True), t0 + (k + 0.5) * BEAT, 0.35)
    if E >= 2:
        for k in range(8):
            d = 12 if k % 2 else 0
            if k == 7 and bar % 2: d = 10
            place(M, pluckbass(r + d, BEAT * 0.42, 0.26, 0.8), t0 + k * BEAT / 2)
    if E >= 3:
        for k in (0, 3, 6, 9, 10, 14) if bar % 2 == 0 else (2, 3, 7, 10, 12, 15): P(M, clav(up[k % len(up)] + 12, 0.14, 0.11), s16(t0, k), 1.0, 0.35 if k % 2 else -0.35)
        P(M, strings(up, BAR * 0.98, 0.05, 0.3), t0, 1.0, rev=0.4)
    if E >= 4 and bar % 2 == 1: P(M, brass(up, BEAT * 0.35, 0.12), s16(t0, 14), 1.0, rev=0.3)
    if sec in ('intro', 'break', 'half', 'reveal'): P(M, strings(up, BAR * 1.0, 0.08, 0.8), t0, 1.0, rev=0.5)
    if E >= 5 or sec == 'title':
        mo = motif(bar, [[(0, 7, 0.5), (0.5, 10, 0.5), (1, 12, 0.75), (2, 15, 0.5), (2.5, 14, 0.25), (2.75, 12, 0.25), (3, 10, 1.0)], [(0, 12, 0.5), (0.5, 10, 0.5), (1, 7, 0.5), (1.5, 10, 0.5), (2, 12, 1.5), (3.5, 14, 0.5)]])
        prev = None
        for (b, d, du) in mo: m = KEY + 12 + d; P(M, sawlead(m, du * BEAT, 0.08, prev), t0 + b * BEAT, 1.0, 0.1, dly=0.25, rev=0.2); prev = m

def g_moombah(bar, sec, t0, E):
    r = root(bar); c = chord(bar); up = [n + 12 for n in c]
    if E >= 3:
        for k in range(4): K(t0 + k * BEAT, kick_techno, 0.9)
        for k in (3, 6, 11, 14): P(D, C('st', snare_tight, 3), s16(t0, k), 0.65, rev=0.2)
        for k in range(8): place(D, HAT(), t0 + k * BEAT / 2, 0.5 if k % 2 else 0.3, 0.3)
        for k in range(16): place(D, C('sh', shaker, 3), s16(t0, k), 0.35, -0.3)
        for k in range(4): place(M, b808(r, BEAT * 0.9, 0.3, glide_from=(r + 12 if k == 0 and bar % 4 == 0 else None)), t0 + k * BEAT)
    elif sec in ('half', 'reveal', 'build'):
        K(t0, kick_techno, 0.8); K(t0 + 2 * BEAT, kick_techno, 0.8)
        for k in (6, 14): place(D, C('st', snare_tight, 3), s16(t0, k), 0.5)
        if sec == 'build':
            for k in range(8): place(D, bongo(k % 2 == 0), t0 + 2 * BEAT + k * BEAT / 4, 0.4 + 0.05 * k)
    pat = [0, 1, 2, 1, 3, 1, 2, 1]
    if E >= 2 or sec == 'intro':
        for k in range(8):
            m = (up + [up[0] + 12])[pat[k]]; P(M, ks_pluck(m, 0.5, 0.16, 0.995, 0.5), t0 + k * BEAT / 2, 1.0, -0.3 if k % 2 else 0.3, rev=0.2, dly=0.15)
    if E >= 4:
        for k in (3, 6, 11, 14): P(M, brass([n for n in up], BEAT * 0.22, 0.1), s16(t0, k), 1.0, rev=0.25)
    if sec in ('intro', 'break', 'half'): P(M, L.pad(up, BAR * 1.02, 0.07, 1400), t0, 1.0, rev=0.5)
    if E >= 4 or sec == 'title':
        mo = motif(bar, [[(0, 7, 0.5), (0.75, 8, 0.25), (1.0, 7, 0.5), (1.75, 5, 0.25), (2.0, 3, 0.5), (2.75, 5, 0.5), (3.5, 7, 0.5)], [(0, 10, 0.5), (0.75, 8, 0.25), (1.0, 7, 0.75), (2.0, 8, 0.5), (2.75, 7, 0.25), (3.0, 3, 1.0)]])
        for (b, d, du) in mo: P(M, mallet(KEY + 12 + d, 0.55, 0.11, 3.0), t0 + b * BEAT, 1.0, 0.15, dly=0.25, rev=0.2)

def g_dnb(bar, sec, t0, E):  # időbeli ütés = fél dnb-ütem (2 dnb-negyed)
    r = root(bar); c = chord(bar); up = [n + 12 for n in c]
    if E >= 3:
        for b in (0, 1.25, 2, 3.25) if bar % 2 == 0 else (0, 1.25, 1.75, 2, 3.25): K(t0 + b * BEAT, kick_techno, 0.9)
        for b in (0.5, 1.5, 2.5, 3.5): P(D, C('st', snare_tight, 3), t0 + b * BEAT, 0.8, rev=0.25)
        for k in range(16): place(D, HAT(k % 4 == 3 and E >= 4), t0 + k * BEAT / 4, 0.55 if k % 2 else 0.35, 0.25)
        if E >= 4:
            for k in range(32): place(D, C('sh', shaker, 3), t0 + k * BEAT / 8, 0.3, -0.3)
        P(M, reese(r, BAR * 0.98, 0.17 if E >= 4 else 0.13, 300, 700 + 500 * (E >= 5)), t0, 1.0)
    elif sec in ('half', 'reveal'):
        K(t0, kick_techno, 0.8); P(D, C('st', snare_tight, 3), t0 + 1.5 * BEAT, 0.6, rev=0.4); P(D, C('st', snare_tight, 3), t0 + 3.5 * BEAT, 0.6, rev=0.4)
        for k in range(8): place(D, C('ride', ride, 2), t0 + k * BEAT / 2, 0.35)
        place(M, sub(r, BAR * 0.95, 0.25), t0)
    elif sec == 'build':
        for k in range(32 if bar % 2 else 16): place(D, C('st', snare_tight, 3), t0 + k * BAR / (32 if bar % 2 else 16), 0.15 + 0.45 * k / 32)
    if sec in ('intro', 'break', 'half', 'reveal', 'build'): P(M, L.pad(up + [up[0] + 12], BAR * 1.02, 0.09, 1600), t0, 1.0, rev=0.6)
    if E >= 3:
        pat = [0, 2, 1, 3, 2, 1, 3, 2]
        for k in range(16):
            m = (up + [up[0] + 12])[pat[k % 8] % 4] + 12
            P(M, L.pluck(m, 0.16, 4200, 0.06), t0 + k * BEAT / 4, 1.0, -0.4 if k % 2 else 0.4, dly=0.25)
    if E >= 5 or sec == 'title':
        mo = motif(bar, [[(0, 7, 1.0), (1, 10, 0.5), (1.5, 12, 1.0), (2.5, 10, 0.5), (3, 7, 1.0)], [(0, 3, 1.0), (1, 5, 0.5), (1.5, 7, 1.5), (3, 5, 0.5), (3.5, 3, 0.5)]])
        prev = None
        for (b, d, du) in mo: m = KEY + 12 + d; P(M, sawlead(m, du * BEAT, 0.08, prev, 4800), t0 + b * BEAT, 1.0, dly=0.3, rev=0.3); prev = m

def g_synthwave(bar, sec, t0, E):
    r = root(bar); c = chord(bar); up = [n + 12 for n in c]
    if E >= 3:
        for k in (range(4) if E >= 4 else (0, 2)): K(t0 + k * BEAT, kick_deep, 0.95)
        for k in (1, 3): P(D, C('gs', snare_gated, 2), t0 + k * BEAT, 0.8, rev=0.5)
        for k in range(8): place(D, HAT(), t0 + k * BEAT / 2, 0.55 if k % 2 else 0.35, 0.25)
    elif E == 2:
        K(t0, kick_deep, 0.85); P(D, C('gs', snare_gated, 2), t0 + 2 * BEAT, 0.6, rev=0.6)
    if fill_bar(bar) and sec != 'intro':
        for j, f0 in enumerate((180, 150, 120, 95)): place(D, tom(f0), t0 + (2 + j * 0.5) * BEAT, 0.7, -0.4 + j * 0.27)
    if E >= 2 or sec == 'build':
        for k in range(8 if E < 4 else 16):
            st = BEAT / 2 if E < 4 else BEAT / 4
            place(M, L.bass(r + (12 if k % 2 and E >= 4 else 0), st * 0.8, 0.28, 900), t0 + k * st)
    if sec != 'outro': P(M, L.pad(up + [up[0] + 12], BAR * 1.02, 0.1 if E < 3 else 0.075, 1800 + 800 * (E >= 4)), t0, 1.0, rev=0.6)
    if E >= 2:
        arp = [0, 1, 2, 3, 2, 1, 0, 1]
        for k in range(16):
            m = (up + [up[0] + 12])[arp[k % 8]] + 12
            P(M, L.pluck(m, 0.18, 3800, 0.06), t0 + k * BEAT / 4, 1.0, -0.35 if k % 2 else 0.35, dly=0.45)
    if E >= 4 or sec == 'title':
        mo = motif(bar, [[(0, 12, 1.5), (1.5, 10, 0.5), (2, 7, 1.0), (3, 8, 0.5), (3.5, 10, 0.5)], [(0, 7, 1.0), (1, 5, 0.5), (1.5, 3, 1.0), (2.5, 5, 0.5), (3, 7, 1.0)]])
        prev = None
        for (b, d, du) in mo: m = KEY + 12 + d; P(M, sawlead(m, du * BEAT, 0.1, prev, 4200), t0 + b * BEAT, 1.0, dly=0.35, rev=0.4); prev = m

def g_afro(bar, sec, t0, E):
    r = root(bar); c = chord(bar); up = [n + 12 for n in c]
    if E >= 3 or sec == 'build':
        for k in range(4): K(t0 + k * BEAT, kick_deep, 0.9)
        for b in (0.5, 1.25, 2.5, 3.0, 3.75): place(D, conga(True), t0 + b * BEAT, 0.8, 0.3)
        for b in (1.75, 3.25): place(D, conga(False), t0 + b * BEAT, 0.9, -0.2)
        for k in range(16): place(D, C('sh', shaker, 3), s16(t0, k), 0.5 if k % 2 else 0.25, -0.35)
        place(D, C('rim', rim, 2), s16(t0, 11), 0.6, 0.4)
        for k in (1, 3): P(D, C('clap', L.clap), t0 + k * BEAT, 0.3, rev=0.4)
        if E >= 4:
            for k in range(4): place(D, HAT(True), t0 + (k + 0.5) * BEAT, 0.4, 0.2)
            for k in (13, 14, 15): place(D, bongo(k % 2 == 0), s16(t0, k), 0.6, 0.45)
    elif E == 2:
        K(t0, kick_deep, 0.8); K(t0 + 2 * BEAT, kick_deep, 0.8)
        for b in (0.5, 1.75, 3.0): place(D, conga(b != 1.75), t0 + b * BEAT, 0.7)
    if E >= 3:
        for (b, d, du) in [(0, 0, 0.75), (1.5, 0, 0.5), (2.25, 7, 0.25), (2.5, 0, 0.75), (3.5, -2, 0.5)]: place(M, sub(r + d, du * BEAT, 0.33), s16(t0, int(b * 4)))
    if E >= 2 or sec == 'intro':
        pat = [0, 2, 1, 2, 3, 2, 1, 2]
        for k in range(8): P(M, mallet((up + [up[0] + 12])[pat[k]] + 12, 0.4, 0.07, 5.4), s16(t0, 2 * k + (1 if k % 4 == 3 else 0)), 1.0, -0.3 if k % 2 else 0.3, dly=0.25)
    if sec in ('intro', 'break', 'half', 'reveal'): P(M, choir(up, BAR, 'o', 0.06), t0, 1.0, rev=0.5)
    elif E >= 3: P(M, strings(up, BAR, 0.045, 0.4), t0, 1.0, rev=0.4)
    if E >= 4 or sec == 'title':
        mo = motif(bar, [[(0, 7, 0.75), (0.75, 10, 0.25), (1, 12, 1.0), (2.5, 10, 0.5), (3, 7, 1.0)], [(0, 5, 0.5), (0.5, 7, 0.5), (1, 3, 1.5), (2.75, 5, 0.25), (3, 7, 1.0)]])
        for (b, d, du) in mo: P(M, flute(KEY + 12 + d, du * BEAT, 0.12), t0 + b * BEAT, 1.0, 0.15, rev=0.4, dly=0.25)

def g_electro(bar, sec, t0, E):
    r = root(bar); c = chord(bar); up = [n + 12 for n in c]; b0, b1 = sec_start(bar); u = (bar - b0 + 1) / max(1, b1 - b0)
    if E >= 3 or sec == 'build':
        for k in range(4): K(t0 + k * BEAT, kick_techno, 0.95)
        for k in (1, 3): P(D, C('clap', L.clap), t0 + k * BEAT, 0.55, rev=0.3)
        for k in range(4): place(D, HAT(True), t0 + (k + 0.5) * BEAT, 0.6, 0.25)
        for k in range(16):
            if k % 2: place(D, HAT(), s16(t0, k), 0.35, -0.3)
    elif E == 2:
        K(t0, kick_techno, 0.85); K(t0 + 2 * BEAT, kick_techno, 0.85)
    if E >= 2:
        for k in range(8): place(M, pluckbass(r + (12 if k % 2 else 0), BEAT * 0.4, 0.26, 0.7), t0 + k * BEAT / 2)
    # szűrt akkord-loop (filter house)
    if sec != 'outro':
        n = int(BAR * SR) + int(0.3 * SR); loop = np.zeros((2, n))
        for k in (0, 3, 6, 8, 11, 14):
            x = stab(up, BEAT * 0.4, 6000, 2000, 0.14, 1.0); i = int(k * BEAT / 4 * SR); j = min(n, i + x.shape[-1]) if x.ndim > 1 else min(n, i + len(x))
            xs = stereo(x, 0.0) if x.ndim == 1 else x; loop[:, i:j] += xs[:, :j - i]
        f0, f1 = {'intro': (300 + 900 * (u - 0.25), 300 + 900 * u), 'build': (800 + 5000 * (u - 0.25), 800 + 5000 * u), 'drop': (7000, 7000), 'drive': (4000, 5000), 'break': (500, 700), 'half': (1500, 1800), 'reveal': (1800, 2200)}.get(sec, (2600, 3000))
        loop = sweep_filter(loop, max(150, f0), max(150, f1), 'low', block=512, curve=1.0)
        P(M, loop, t0, 1.0, rev=0.2)
    if E >= 4 or sec == 'title':
        mo = motif(bar, [[(0, 12, 0.75, 'o'), (0.75, 11, 0.25, 'a'), (1.0, 7, 0.5, 'o'), (1.5, 9, 1.0, 'a'), (3, 7, 0.5, 'o'), (3.5, 4, 0.5, 'e')], [(0, 7, 0.5, 'a'), (0.5, 9, 0.5, 'o'), (1.0, 11, 1.0, 'a'), (2.5, 12, 0.5, 'e'), (3.0, 14, 1.0, 'a')]])
        for st in mo:
            b, d, du = st[:3]; P(M, vox(KEY + 12 + d, du * BEAT, st[3], 0.11, False, to=('o' if st[3] != 'o' else 'a')), t0 + b * BEAT, 1.0, 0.0, dly=0.3, rev=0.25)

def g_melodic(bar, sec, t0, E):
    r = root(bar); c = chord(bar); up = [n + 12 for n in c]
    if E >= 3 or sec == 'build':
        for k in range(4): K(t0 + k * BEAT, kick_techno, 0.95)
        for k in range(4): place(D, C('ho', lambda: L.hat(True)[:int(0.12 * SR)], 2), t0 + (k + 0.5) * BEAT, 0.6, 0.2)
        for k in (3, 6, 10, 13): place(D, C('rim', rim, 2), s16(t0, k), 0.35, -0.4 if k % 2 else 0.4)
        if E >= 4:
            for k in range(8): place(D, C('ride', ride, 2), t0 + k * BEAT / 2, 0.4, -0.25)
        if E >= 5:
            for k in (1, 3): P(D, C('clap', L.clap), t0 + k * BEAT, 0.4, rev=0.5)
    elif E == 2:
        K(t0, kick_techno, 0.85); K(t0 + 2 * BEAT, kick_techno, 0.85)
    if E >= 2 and sec != 'break':
        for b in range(4):
            for j, d in ((1, 0), (2, 12), (3, 0)): place(M, pluckbass(r + d, BEAT / 4 * 0.9, 0.25, 0.45 + 0.3 * (E >= 4)), t0 + b * BEAT + j * BEAT / 4)
    if sec != 'outro': P(M, L.pad(up, BAR * 1.02, 0.08, 1100 + 800 * (E >= 4)), t0, 1.0, rev=0.7)
    if E >= 1:
        arp = [0, 2, 1, 2, 0, 3, 1, 2, 0, 2, 1, 2, 3, 2, 1, 2]
        for k in range(16):
            m = (up + [up[0] + 12])[arp[k] % 4] + 12
            P(M, L.pluck(m, 0.2, 2400 + 1600 * (E >= 4), 0.055), t0 + k * BEAT / 4, 1.0, -0.4 if k % 2 else 0.4, dly=0.5, rev=0.2)
    if E >= 5 or (sec == 'title'):
        mo = motif(bar, [[(0, 15, 1.0), (1, 14, 0.5), (1.5, 10, 1.0), (2.5, 12, 1.5)], [(0, 7, 1.0), (1, 8, 0.5), (1.5, 7, 0.5), (2, 3, 2.0)]])
        prev = None
        for (b, d, du) in mo: m = KEY + 12 + d; P(M, sawlead(m, du * BEAT, 0.09, prev, 3600, 5), t0 + b * BEAT, 1.0, dly=0.35, rev=0.5); prev = m

def g_chiptune(bar, sec, t0, E):
    r = root(bar); c = chord(bar); up = [n + 12 for n in c]
    if E >= 3 or sec == 'build':
        for k in (range(4) if E >= 4 else (0, 2)): K(t0 + k * BEAT, kick_chip, 0.9)
        for k in (1, 3): place(D, C('snc', snare_chip, 3), t0 + k * BEAT, 0.9)
        for k in range(8): place(D, C('hc', hat_chip, 3), t0 + k * BEAT / 2, 0.8, 0.3)
        if sec == 'build':
            for k in range(8): place(D, C('snc', snare_chip, 3), t0 + 2 * BEAT + k * BEAT / 4, 0.4 + 0.07 * k)
    elif E == 2: K(t0, kick_chip, 0.8); place(D, C('snc', snare_chip, 3), t0 + 2 * BEAT, 0.7)
    if E >= 2:
        for k in range(8): place(M, tri_bass(r + (12 if k % 2 else 0), BEAT * 0.45, 0.32), t0 + k * BEAT / 2)
    if sec != 'outro':
        for b in range(4): P(M, chip_arp(up, BEAT * 0.95, 0.05 if E >= 3 else 0.06, BEAT / 8 if E >= 4 else BEAT / 6), t0 + b * BEAT, 1.0, -0.3, dly=0.2)
    if E >= 3 or sec == 'title':
        mo = motif(bar, [[(0, 12, 0.5), (0.5, 16, 0.5), (1, 19, 0.75), (2, 16, 0.25), (2.25, 14, 0.25), (2.5, 12, 0.5), (3, 11, 0.5), (3.5, 12, 0.5)], [(0, 14, 0.75), (0.75, 12, 0.25), (1, 11, 0.5), (1.5, 7, 0.5), (2, 9, 0.75), (3, 11, 0.5), (3.5, 14, 0.5)]])
        for (b, d, du) in mo: P(M, pulse_lead(KEY + 12 + d, du * BEAT * 0.95, 0.075, 0.25 if E >= 4 else 0.5), t0 + b * BEAT, 1.0, 0.25, dly=0.3)

def g_dubstep(bar, sec, t0, E):
    r = root(bar); c = chord(bar); up = [n + 12 for n in c]
    if E >= 3:
        for b in ((0, 2.75) if bar % 2 == 0 else (0, 0.75, 2.75)): K(t0 + b * BEAT, kick_techno, 1.0)
        P(D, C('st', snare_tight, 3), t0 + 2 * BEAT, 0.8, rev=0.45); place(D, C('clap', L.clap), t0 + 2 * BEAT, 0.55)
        for k in range(8): place(D, HAT(), t0 + k * BEAT / 2, 0.4, 0.3)
    elif sec in ('half', 'reveal'):
        K(t0, kick_techno, 0.9); P(D, C('st', snare_tight, 3), t0 + 2 * BEAT, 0.6, rev=0.6)
    elif sec == 'build':
        n = 8 if bar % 2 == 0 else 16
        for k in range(n): place(D, C('st', snare_tight, 3), t0 + k * BAR / n, 0.15 + 0.5 * k / n)
    if E >= 4:
        seqs = [[(0, 0, 2, 1.0), (1, 0, 3, 1.0), (2, 3, 4, 1.0), (3, -2, 1, 1.0)], [(0, 0, 4, 1.5), (1.5, 7, 6, 0.5), (2, 5, 2, 1.0), (3, 3, 3, 1.0)]]
        for (b, d, rate, du) in seqs[bar % 2]: place(M, wobble(r + d, du * BEAT * 0.98, rate / BEAT, 0.3 if E >= 5 else 0.22), t0 + b * BEAT)
    elif E == 3: place(M, wobble(r, BAR * 0.98, 0.5 / BEAT, 0.2), t0)
    elif E == 2: P(M, reese(r, BAR * 0.98, 0.12), t0, 1.0)
    if sec in ('intro', 'break', 'half', 'reveal', 'build'): P(M, choir(up, BAR, 'a', 0.07), t0, 1.0, rev=0.7)
    if E <= 2 and sec != 'outro':
        for k in (0, 3, 6): P(M, L.bell(up[k % len(up)] + 12, 0.8, 0.06), t0 + k * BEAT / 2, 1.0, 0.3, dly=0.4, rev=0.3)

def g_trance(bar, sec, t0, E):
    r = root(bar); c = chord(bar); up = [n + 12 for n in c]
    if E >= 3 or sec == 'build':
        for k in range(4): K(t0 + k * BEAT, kick_techno, 0.95)
        for k in range(4): place(D, HAT(True), t0 + (k + 0.5) * BEAT, 0.6, 0.25)
        if E >= 3:
            for k in (1, 3): P(D, C('clap', L.clap), t0 + k * BEAT, 0.5, rev=0.4)
        if E >= 4:
            for k in range(16):
                if k % 4 != 2: place(D, HAT(), s16(t0, k), 0.3, -0.3)
        if sec == 'build':
            n = 8 if bar % 2 == 0 else 16
            for k in range(n): place(D, C('st', snare_tight, 3), t0 + k * BAR / n, 0.15 + 0.5 * k / n)
    elif E == 2: K(t0, kick_techno, 0.85)
    if E >= 3:
        for b in range(4):
            for j in (1, 2, 3): place(M, L.bass(r + (12 if j == 2 else 0), BEAT / 4 * 0.8, 0.26, 1000), t0 + b * BEAT + j * BEAT / 4)
    if E >= 4: P(M, gate_pad(up + [up[0] + 12], BAR * 0.98, BEAT / 4, 0.1), t0, 1.0, rev=0.4)
    elif sec != 'outro': P(M, L.pad(up + [up[0] + 12], BAR * 1.02, 0.1, 1500 + 1000 * (E >= 2)), t0, 1.0, rev=0.7)
    if E >= 2:
        arp = [0, 1, 2, 3, 2, 1, 2, 3]
        for k in range(16): P(M, L.pluck((up + [up[0] + 12])[arp[k % 8]] + 12, 0.16, 4600, 0.05), t0 + k * BEAT / 4, 1.0, -0.35 if k % 2 else 0.35, dly=0.4)
    if E >= 5 or sec in ('title', 'break'):
        mo = motif(bar, [[(0, 9, 0.75), (0.75, 7, 0.25), (1, 4, 1.0), (2, 7, 0.5), (2.5, 9, 0.5), (3, 12, 1.0)], [(0, 11, 0.75), (0.75, 9, 0.25), (1, 7, 1.0), (2, 4, 0.5), (2.5, 7, 0.5), (3, 2, 1.0)]])
        g = 0.13 if E >= 5 else 0.07
        for (b, d, du) in mo:
            x = L.supersaw([KEY + 12 + d, KEY + 24 + d], du * BEAT, 6000 if E >= 5 else 3000, voices=7, det=0.18, attack=0.005, release=0.15, gain=g)
            P(M, x, t0 + b * BEAT, 1.0, dly=0.3, rev=0.5)

def g_phonk(bar, sec, t0, E):
    r = root(bar); c = chord(bar); up = [n + 12 for n in c]
    if E >= 3:
        kp = (0, 1.5, 2.5) if bar % 2 == 0 else (0, 0.75, 2.5, 3.25)
        for i, b in enumerate(kp):
            K(t0 + b * BEAT, lambda: lp(kick_techno(), 3500), 0.9, 'ktp')
            dur = ((kp[i + 1] if i + 1 < len(kp) else 4) - b) * BEAT * 0.95
            place(M, b808(r if i != 2 else r + 7, dur, 0.42, drive=5.0), t0 + b * BEAT)
        for k in (1, 3): P(D, C('clap', L.clap), t0 + k * BEAT, 0.65, rev=0.25); place(D, C('st', snare_tight, 3), t0 + k * BEAT, 0.4)
        for k in range(8):
            if bar % 2 == 1 and k == 7:
                for j in range(3): place(D, C('h8', hat808, 3), t0 + 3.5 * BEAT + j * BEAT / 6, 0.5, 0.3)
            else: place(D, C('h8', hat808, 3), t0 + k * BEAT / 2, 0.55, 0.3)
    elif sec in ('half', 'reveal', 'build'):
        K(t0, lambda: lp(kick_techno(), 3500), 0.85, 'ktp'); place(M, b808(r, BAR * 0.9, 0.32, drive=4.0), t0)
        if sec == 'build':
            for k in range(16): place(D, C('h8', hat808, 3), t0 + k * BEAT / 4, 0.3 + 0.4 * k / 16, 0.3)
        else: P(D, C('clap', L.clap), t0 + 2 * BEAT, 0.5, rev=0.4)
    if sec in ('intro', 'break', 'half', 'reveal'): P(M, choir(up, BAR, 'o', 0.07), t0, 1.0, rev=0.6)
    if E >= 3 or sec == 'build':
        mo = motif(bar, [[(0, 12, 0.5), (0.5, 12, 0.25), (0.75, 15, 0.5), (1.5, 12, 0.25), (2, 10, 0.5), (2.5, 7, 0.25), (3, 8, 0.5), (3.5, 7, 0.5)], [(0, 12, 0.5), (0.5, 15, 0.25), (0.75, 17, 0.5), (1.5, 15, 0.5), (2, 12, 0.25), (2.5, 10, 0.5), (3.25, 12, 0.75)]])
        for (b, d, du) in mo: P(M, cowbell(KEY + 12 + d, 0.28, 0.14 if E >= 4 else 0.1), t0 + b * BEAT, 1.0, 0.1, rev=0.25, dly=0.15)

GF = {'acid': g_acid, 'trap': g_trap, 'breakbeat': g_breakbeat, 'garage': g_garage, 'futurebass': g_futurebass, 'deephouse': g_deephouse, 'nudisco': g_nudisco,
      'moombah': g_moombah, 'dnb': g_dnb, 'synthwave': g_synthwave, 'afro': g_afro, 'electro': g_electro, 'melodic': g_melodic, 'chiptune': g_chiptune,
      'dubstep': g_dubstep, 'trance': g_trance, 'phonk': g_phonk}[GENRE]
CYMB = GENRE not in ('chiptune',)
for bar in range(NBARS):
    sec = section(bar); t0 = tb(bar); E = ENERGY.get(sec, 0)
    GF(bar, sec, t0, E)
    b0, _ = sec_start(bar)
    if CYMB and bar == b0 and E >= 4: P(D, C('crash', crash, 1), t0, 0.55, -0.2, rev=0.3)
    if sec == 'outro' and bar == b0:  # záró akkord
        c = PROG[0]; x = L.supersaw([n + 12 for n in c] + [c[0] + 24], BAR * 2.2, 3600, gain=0.12, attack=0.02, release=1.8) if GENRE != 'chiptune' else stereo(chip_arp([n + 12 for n in c], BAR * 1.5, 0.06), 0)
        P(M, x, t0, 1.0, rev=0.6); K(t0, kick_techno, 0.9)
if GENRE == 'deephouse': place(TEX, stereo(vinyl(TOTAL - 0.2)), 0.1, 1.0)
# ---- átvezetések ----
TR = CF.get('transitions', {})
for b, Lb in TR.get('risers', []): place(FX, L.riser(BAR * Lb, 300, 8000, 0.2), tb(b), 1.0)
for b in TR.get('impacts', []): place(FX, L.impact(1.0, 1.5), tb(b), 0.9); place(REV, L.impact(0.5), tb(b), 0.4)
for b in TR.get('downs', []): place(FX, L.downlifter(2.0), tb(b, 0.1), 0.8)
for b in TR.get('revcym', []): place(FX, stereo(reverse_cym(1.6, 0.3)), tb(b) - 1.6, 1.0)
for i, t in enumerate(EV.get('cuts', [])):
    if any(abs(t - tb(b)) < 0.05 for b in TR.get('impacts', [])): continue
    place(FX, L.whoosh(0.42, True, 0.16), t - 0.36, 1.0, -0.4 if i % 2 else 0.4)
for sl in EV.get('slams', []):
    if sl['kind'] in ('word', 'stat'): place(FX, L.thwack(0.45 if sl['kind'] == 'word' else 0.3), sl['t'], 1.0); place(REV, L.thwack(0.3), sl['t'], 0.4)
for t in EV.get('steps', []): place(FX, L.perc_tick() * 2.2, t, 1.0, 0.5)
ALL_SFX = dict(OLD_SFX); ALL_SFX.update(NEW_SFX)
for e in EV.get('sfx', []):
    f = ALL_SFX.get(e['type'])
    if not f: print('ismeretlen sfx', e['type']); continue
    x, g = f(e)
    place(FX, x, e['t'], g, e.get('pan', 0.0)); place(REV, x, e['t'], e.get('rev', 0.15))
# ---------------- keverés ----------------
sc = np.ones(N, np.float32); depth = CF.get('sc', DEF['sc'])
for t in kicks:
    i = int(round(t * SR)); Lk = int(0.22 * SR)
    if i >= N: continue
    e = 1 - depth * np.exp(-np.arange(Lk) / SR * 14); j = min(N, i + Lk); sc[i:j] = np.minimum(sc[i:j], e[: j - i])
M *= sc
d = int(BEAT * DEF['dly'] * SR); dl = np.zeros_like(DLY); src = lp(hp(DLY, 300), 5000)
for k in range(1, 6):
    sh = d * k
    if sh >= N: break
    g = 0.45 ** (k - 1) * 0.5; ch = k % 2
    dl[ch, sh:] += src[0, :N - sh] * g; dl[1 - ch, sh:] += src[1, :N - sh] * g * 0.6
M += dl * sc
Lr = int(2.6 * SR); tr = np.arange(Lr) / SR
ir = L.rng.standard_normal((2, Lr)) * np.exp(-tr * 2.4); ir = lp(ir, 6000); ir[:, :int(0.015 * SR)] = 0
ir /= np.sqrt((ir ** 2).sum(axis=1, keepdims=True))
wet = np.vstack([signal.fftconvolve(hp(REV[c], 200), ir[c])[:N] for c in range(2)]) * DEF['rev']
mix = D * 0.85 + M * 1.3 * CF.get('musicGain', 1.0) + FX * CF.get('fxGain', 1.0) + wet + TEX
fade = np.ones(N); i0 = int((EV['total'] - 1.4) * SR); fade[i0:] = np.linspace(1, 0, N - i0) ** 1.5; mix *= fade
mix = hp(mix, 28)
mix = mix + hp(mix, 2200) * 0.4 - lp(mix, 55) * 0.25
mix /= np.max(np.abs(mix))
rms = np.sqrt(np.mean(mix ** 2)); mix *= 10 ** (-12.5 / 20) / rms
mix = np.tanh(mix * 1.15) / np.tanh(1.15)
mix *= 10 ** (-1.0 / 20) / max(1e-9, np.max(np.abs(mix)))
wavfile.write(OUT, SR, (mix.T * 32767).astype(np.int16))
print('ok', GENRE, round(TOTAL, 2), 's', 'rms dB', round(20 * np.log10(np.sqrt(np.mean(mix ** 2))), 1))

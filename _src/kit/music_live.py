#!/usr/bin/env python3
# Hangmintás („élő”) zene: valódi hangszerek felvett mintáiból (zongora, vonósok, gitár, basszusgitár, hárfa,
# akusztikus dob) rakja össze a darabot ütemre, a videó szakaszaihoz igazítva; hangeffektek (whoosh, ütés…) szintetizálva.
# Használat: python3 kit/music_live.py <events.json> <arrange.json> <ki.wav>
# arrange.json: {bpm, total, key_shift, sections: [[ütem0, ütem1, típus], …], cuts: [[ütem0, ütem1], …] (néma szakasz),
#               hits: [ütem, …] (nagy ütés), stabs: [ütem, …] (rövid akkord-ütés), fx: 0..1}
# Minták: /home/claude/samples (tonejs-instruments – CC BY 3.0; Salamander Grand Piano – CC BY 3.0; Tone.js acoustic-kit)
import numpy as np, subprocess, json, sys, os, re, glob
from scipy.signal import fftconvolve, lfilter, butter
SR = 44100
SMP = '/home/claude/samples'
rng = np.random.default_rng(7)
EV = json.load(open(sys.argv[1])); A = json.load(open(sys.argv[2])); OUT = sys.argv[3]
BPM = A['bpm']; BEAT = 60 / BPM; BAR = 4 * BEAT; TOTAL = A['total']; N = int((TOTAL + 0.2) * SR)
tb = lambda bar, beat=0: (bar * 4 + beat) * BEAT

def load(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True).stdout
    return np.frombuffer(raw, np.float32).astype(np.float64)
NOTE = {'C': 0, 'Cs': 1, 'D': 2, 'Ds': 3, 'E': 4, 'F': 5, 'Fs': 6, 'G': 7, 'Gs': 8, 'A': 9, 'As': 10, 'B': 11}
def midi(name):
    m = re.match(r'([A-G]s?)(-?\d)$', name); return NOTE[m.group(1)] + 12 * (int(m.group(2)) + 1) if m else None
class Inst:
    def __init__(self, folder, norm=True, lo=0, hi=200):
        self.S = {}
        for f in glob.glob(os.path.join(SMP, folder, '*.mp3')):
            m = midi(os.path.basename(f)[:-4])
            if m is None or m < lo or m > hi: continue
            x = load(f); i0 = np.argmax(np.abs(x) > 0.01 * np.max(np.abs(x))); x = x[max(0, i0 - 40):]
            if norm: x = x / (np.sqrt(np.mean(x[:int(0.4 * SR)] ** 2)) + 1e-9) * 0.12
            self.S[m] = x
        self.keys = np.array(sorted(self.S))
    def note(self, m, dur, vel=0.8, att=0.004, rel=0.3, maxlen=None):
        k = int(self.keys[np.argmin(np.abs(self.keys - m))]); x = self.S[k]; ratio = 2 ** ((m - k) / 12)
        n = int((dur + rel) * SR);
        if maxlen: n = min(n, int(maxlen * SR))
        idx = np.arange(n) * ratio; ok = idx < len(x) - 1; idx = idx[ok]; i = idx.astype(int); fr = idx - i
        y = x[i] * (1 - fr) + x[i + 1] * fr
        env = np.ones(len(y)); a = int(att * SR); env[:a] = np.linspace(0, 1, a) if a > 0 else 1
        d = int(dur * SR); r = len(y) - d
        if r > 0 and d < len(y): env[d:] *= np.linspace(1, 0, r) ** 1.5
        return y * env * vel
class Bus:
    def __init__(self): self.L = np.zeros(N); self.R = np.zeros(N)
    def add(self, y, t, pan=0.0, g=1.0):
        i = int(t * SR);
        if i >= N or i + len(y) <= 0: return
        if i < 0: y = y[-i:]; i = 0
        y = y[:N - i]; gl = g * np.cos((pan + 1) * np.pi / 4) * 1.414; gr = g * np.sin((pan + 1) * np.pi / 4) * 1.414
        self.L[i:i + len(y)] += y * gl; self.R[i:i + len(y)] += y * gr

print('minták betöltése…', flush=True)
PIANO = Inst('ta/salamander'); VLN = Inst('ti/samples/violin'); CEL = Inst('ti/samples/cello'); CB = Inst('ti/samples/contrabass')
GTR = Inst('ti/samples/guitar-acoustic'); BASS = Inst('ti/samples/bass-electric'); HARP = Inst('ti/samples/harp')
DR = {k: load(f'{SMP}/ta/drum-samples/acoustic-kit/{k}.mp3') for k in ['kick', 'snare', 'hihat', 'tom1', 'tom2', 'tom3']}
DR2 = {k: load(f'{SMP}/ta/drum-samples/Kit8/{k}.mp3') for k in ['kick', 'snare', 'hihat']}
for d in (DR, DR2):
    for k in d: d[k] = d[k] / (np.max(np.abs(d[k])) + 1e-9)

# ---------- szintetizált kiegészítők: taps, shaker, cintányér, visszafelé cintányér, mély ütés ----------
def hp(x, f): b, a = butter(2, f / (SR / 2), 'high'); return lfilter(b, a, x)
def lp(x, f): b, a = butter(2, f / (SR / 2), 'low'); return lfilter(b, a, x)
def bp(x, f0, f1): b, a = butter(2, [f0 / (SR / 2), f1 / (SR / 2)], 'band'); return lfilter(b, a, x)
def clap():
    n = int(0.35 * SR); y = np.zeros(n); t = np.arange(n) / SR
    for k, d in enumerate([0, 0.011, 0.023]): i = int(d * SR); m = n - i; y[i:] += rng.standard_normal(m) * np.exp(-np.arange(m) / SR / (0.012 if k < 2 else 0.11))
    return bp(y, 900, 6000) * 0.9
def shaker(): n = int(0.09 * SR); e = np.sin(np.linspace(0, np.pi, n)) ** 2; return hp(rng.standard_normal(n) * e, 5000) * 0.35
def crash(L=2.6):
    n = int(L * SR); t = np.arange(n) / SR; y = rng.standard_normal(n) * np.exp(-t / 0.9)
    for f in [3150, 4410, 5370, 6830, 8120]: y += 0.25 * np.sin(2 * np.pi * f * t + rng.random() * 6) * np.exp(-t / 0.6)
    return hp(y, 3500) * 0.5
REVC = lp(crash(2.2), 8000)[::-1].copy() * 0.6
def boom(L=2.2):
    t = np.arange(int(L * SR)) / SR; f = 32 + 40 * np.exp(-t / 0.12); ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t / 0.7) * 0.9
CLAP, SHK = clap(), shaker()

M = {k: Bus() for k in ['drums', 'bass', 'piano', 'gtr', 'str', 'lead', 'harp', 'fx']}
REV = Bus()
def play(bus, y, t, pan=0, g=1, rev=0.2):
    M[bus].add(y, t, pan, g)
    if rev > 0: REV.add(y, t, pan, g * rev)
def hum(): return rng.normal(0, 0.004)

# ---------- harmónia (D-dúr) ----------
CH = {'D': (38, [62, 66, 69], [50, 57, 62, 66]), 'A': (33, [61, 64, 69], [45, 52, 57, 61, 64]), 'Bm': (35, [59, 62, 66], [47, 54, 59, 62, 66]),
      'G': (31, [59, 62, 67], [43, 47, 50, 55, 59]), 'Em': (40, [59, 64, 67], [52, 59, 64, 67]), 'Fsm': (42, [61, 66, 69], [54, 61, 66, 69])}
PROG = {'chorus': ['D', 'A', 'Bm', 'G'], 'verseA': ['Bm', 'G', 'D', 'A'], 'verseB': ['G', 'D', 'A', 'Bm'], 'build': ['G', 'A', 'G', 'A'], 'tension': ['Bm', 'Bm', 'G', 'A'],
        'intro': ['D', 'G', 'Bm', 'A'], 'break': ['G', 'D', 'Em', 'A'], 'quote': ['G', 'A', 'D', 'D'], 'stabs': ['Bm', 'G', 'A', 'A'], 'outro': ['D', 'D', 'D', 'D']}
HOOK = [[(0, 2, 78), (1, 0.5, 81), (1.5, 0.5, 78), (2, 1, 76), (3, 1, 74)], [(0, 1, 76), (1, 0.5, 73), (1.5, 0.5, 76), (2, 2, 81)],
        [(0, 1, 78), (1, 0.5, 74), (1.5, 0.5, 78), (2, 1, 83), (3, 1, 81)], [(0, 1, 79), (1, 0.5, 78), (1.5, 0.5, 76), (2, 2, 74)]]
SECT = A['sections']; CUTS = A.get('cuts', [])
def section_at(bar):
    for s in SECT:
        if s[0] <= bar < s[1]: return s
    return None
def muted(t): return any(tb(c[0]) <= t < tb(c[1]) for c in CUTS)

print('hangszerelés…', flush=True)
for s0, s1, kind in SECT:
    prog = PROG.get(kind, PROG['chorus'])
    for bar in range(int(np.floor(s0)), int(np.ceil(s1))):
        if bar < s0 or bar >= s1: continue
        rel = int(bar - s0); ch = prog[rel % 4]; root, pv, gv = CH[ch]; T0 = tb(bar)
        last = bar == int(np.ceil(s1)) - 1; full = kind in ('chorus',)
        def on(beat): t = T0 + beat * BEAT; return not muted(t) and t < tb(s1) - 0.01
        # ---- vonós alap (cselló + nagybőgő + hegedű hosszú hangok)
        if kind in ('intro', 'tension', 'verseA', 'verseB', 'break', 'chorus', 'build', 'quote', 'outro'):
            sg = {'intro': 0.7, 'tension': 0.75, 'break': 0.7, 'quote': 0.75, 'outro': 0.9}.get(kind, 0.5)
            if on(0):
                play('str', CEL.note(root + 12, BAR * 0.98, 0.7, att=0.25, rel=0.6), T0, -0.3, sg, 0.45)
                play('str', CB.note(root + 12 if root + 12 < 40 else root, BAR * 0.98, 0.55, att=0.2, rel=0.6), T0, -0.1, sg * 0.35, 0.3)
                if kind not in ('tension',): play('str', VLN.note(pv[-1] + 12, BAR * 0.98, 0.5, att=0.35, rel=0.8), T0, 0.35, sg * 0.55, 0.5)
        # ---- zongora
        if kind == 'intro' or kind == 'break' or kind == 'quote':
            arp = [pv[0], pv[1], pv[2], pv[1] + 12, pv[2] + 12, pv[1] + 12, pv[2], pv[1]]
            for k, n in enumerate(arp):
                if on(k * 0.5): play('piano', PIANO.note(n, BEAT * 0.9, 0.55 + 0.1 * (k == 0), rel=0.9), T0 + k * 0.5 * BEAT + hum(), 0.1, 0.9, 0.4)
            if on(0): play('piano', PIANO.note(root + 12, BAR, 0.6, rel=1.2), T0, -0.1, 0.8, 0.4)
        elif kind == 'tension':
            for k in range(8):
                if on(k * 0.5): play('str', CEL.note(root + 12, BEAT * 0.35, 0.8 if k % 2 == 0 else 0.55, att=0.005, rel=0.08), T0 + k * 0.5 * BEAT + hum(), -0.2, 0.75, 0.2)
            if on(0): play('piano', PIANO.note(root + 24, BEAT * 3, 0.5, rel=1.0), T0, 0.2, 0.8, 0.5)
            if on(2) and rel % 2 == 1: play('piano', PIANO.note(pv[2] + 12, BEAT * 2, 0.4, rel=1.0), T0 + 2 * BEAT, 0.3, 0.7, 0.5)
        elif kind in ('verseA', 'verseB', 'build'):
            for b in ([0, 1.5, 2.5] if kind != 'build' else [0, 1, 2, 3]):
                if on(b):
                    for n in pv: play('piano', PIANO.note(n, BEAT * 0.9, 0.42, rel=0.5), T0 + b * BEAT + hum(), 0.15, 0.85, 0.3)
        elif kind == 'chorus':
            for b in [0, 0.5, 1.5, 2, 2.5, 3.5]:
                if on(b):
                    for n in pv: play('piano', PIANO.note(n, BEAT * 0.45, 0.5 + 0.12 * (b in (0, 2)), rel=0.3), T0 + b * BEAT + hum(), 0.15, 0.9, 0.25)
            if on(0): play('piano', PIANO.note(root + 12, BAR * 0.9, 0.55, rel=0.6), T0, -0.1, 0.7, 0.25)
        # ---- akusztikus gitár (pengetés: le-fel minta 16-odokon)
        if kind in ('verseB', 'chorus', 'build'):
            pat = [(0, 1), (1, 0), (1.5, -1), (2.5, -1), (3, 1), (3.5, -1)] if kind != 'build' else [(b * 0.5, 1 if b % 2 == 0 else -1) for b in range(8)]
            for b, d in pat:
                if not on(b): continue
                notes = gv if d > 0 else gv[::-1][:4]
                for j, n in enumerate(notes): play('gtr', GTR.note(n, BEAT * 0.48, (0.55 if d > 0 else 0.38) * (1 - 0.05 * j), rel=0.15), T0 + b * BEAT + j * 0.011 + hum(), 0.45 if d > 0 else 0.5, 0.75, 0.2)
        elif kind == 'verseA':
            for k, n in enumerate([gv[0], gv[2], gv[3], gv[2], gv[1], gv[3], gv[2], gv[3]]):
                if on(k * 0.5): play('gtr', GTR.note(n + 12 if n < 50 else n, BEAT * 0.9, 0.5, rel=0.6), T0 + k * 0.5 * BEAT + hum(), -0.45, 0.75, 0.3)
        # ---- hárfa (csillogás az elején és a szépia részben)
        if kind in ('intro', 'break', 'outro'):
            for k, n in enumerate([pv[0] + 12, pv[1] + 12, pv[2] + 12, pv[0] + 24]):
                if on(2 + k * 0.25): play('harp', HARP.note(n, BEAT * 2, 0.45, rel=1.5), T0 + (2 + k * 0.25) * BEAT, 0.5, 0.65, 0.6)
        # ---- basszusgitár
        if kind in ('chorus', 'verseB', 'build'):
            for k in range(8):
                if on(k * 0.5): play('bass', BASS.note(root + (12 if root < 36 else 0) + (12 if k in (3, 7) and kind == 'chorus' else 0), BEAT * 0.42, 0.85 if k % 2 == 0 else 0.6, rel=0.06), T0 + k * 0.5 * BEAT + hum(), 0, 1.0, 0.02)
        elif kind == 'verseA':
            for b, d in [(0, 1.4), (1.5, 0.45), (2, 1.4), (3.5, 0.45)]:
                if on(b): play('bass', BASS.note(root + (12 if root < 36 else 0), BEAT * d, 0.8, rel=0.08), T0 + b * BEAT + hum(), 0, 0.9, 0.02)
        # ---- dallam (hegedű) a refrénben
        if kind == 'chorus':
            for (b, d, n) in HOOK[rel % 4]:
                if on(b): play('lead', VLN.note(n - 12 if rel >= 8 else n, BEAT * d * 0.95, 0.75, att=0.03, rel=0.35), T0 + b * BEAT + hum(), 0.1, 0.8, 0.45)
                if on(b) and rel % 8 >= 4: play('lead', PIANO.note(n, BEAT * d * 0.9, 0.45, rel=0.4), T0 + b * BEAT, -0.15, 0.55, 0.35)
        # ---- dob
        if kind in ('chorus', 'verseA', 'verseB', 'build', 'tension'):
            kick = {'chorus': [0, 1.5, 2, 2.75], 'verseA': [0, 2.5], 'verseB': [0, 1.5, 2.5], 'build': [0, 1, 2, 3], 'tension': [0, 2]}[kind]
            for b in kick:
                if on(b): play('drums', DR['kick'], T0 + b * BEAT + hum(), 0, 0.75 if kind != 'tension' else 0.5, 0.05)
            if kind in ('chorus', 'verseB', 'build', 'verseA'):
                for b in [1, 3]:
                    if on(b): play('drums', DR['snare'] * 0.8, T0 + b * BEAT + hum(), 0.05, 0.7 if kind != 'verseA' else 0.45, 0.25); play('drums', CLAP, T0 + b * BEAT + 0.004, -0.1, 0.16 if kind == 'chorus' else 0.07, 0.3)
            hh = {'chorus': [k * 0.5 for k in range(8)], 'verseA': [k * 0.5 for k in range(8)], 'verseB': [k * 0.25 for k in range(16)], 'build': [k * 0.25 for k in range(16)], 'tension': []}[kind]
            for b in hh:
                if on(b): play('drums', lp(DR['hihat'], 9000) * (0.5 if (b * 2) % 2 == 0 else 0.3), T0 + b * BEAT + hum(), 0.3, 0.2, 0.04)
            if kind in ('verseB', 'chorus'):
                for k in range(16):
                    if on(k * 0.25): play('drums', SHK * (0.8 if k % 2 else 0.5), T0 + k * 0.25 * BEAT + hum(), -0.4, 0.16, 0.04)
            if kind == 'tension' and rel % 2 == 1:
                for j, (b, tom) in enumerate([(3, 'tom1'), (3.25, 'tom2'), (3.5, 'tom3'), (3.75, 'tom3')]):
                    if on(b): play('drums', DR[tom] * 0.7, T0 + b * BEAT, -0.3 + 0.2 * j, 0.6, 0.25)
            if kind == 'build' and last:
                for k in range(8):
                    if on(2 + k * 0.25): play('drums', DR['snare'] * (0.35 + 0.08 * k), T0 + (2 + k * 0.25) * BEAT, 0, 0.8, 0.3)
        # refrén eleje: cintányér
        if kind == 'chorus' and rel % 4 == 0 and on(0): play('drums', lp(crash(), 9000), T0, 0.2, 0.2, 0.25)
    # a szakasz végén: visszafelé cintányér a következő refrén / ütés elé
    nxt = section_at(s1)
    if nxt and nxt[2] in ('chorus',) and kind not in ('chorus',): play('fx', REVC, tb(s1) - len(REVC) / SR, 0, 0.5, 0.2)

# ---------- ütések (nagy hit), rövid akkord-ütések ----------
for bar in A.get('hits', []):
    t = tb(bar); play('fx', boom(), t, 0, 0.9, 0.3); play('drums', DR['kick'], t, 0, 1.0, 0.2); play('drums', lp(crash(3.2), 9000), t, 0, 0.3, 0.35)
    s = section_at(bar) or [0, 0, 'chorus']; root, pv, gv = CH[PROG.get(s[2], PROG['chorus'])[0]]
    for n in pv + [root + 12, root + 24]: play('piano', PIANO.note(n, BAR, 0.7, rel=1.5), t, 0, 0.8, 0.5)
    play('str', CEL.note(root + 12, BAR, 0.9, att=0.01, rel=1.0), t, -0.2, 0.8, 0.5)
for bar in A.get('stabs', []):
    t = tb(bar); play('drums', DR['kick'], t, 0, 1.0, 0.2); play('drums', DR['snare'], t, 0, 0.7, 0.4); play('drums', lp(crash(1.6), 9000), t, 0.2, 0.22, 0.35)
    s = section_at(bar) or [0, 0, 'stabs']; root, pv, gv = CH['Bm']
    for n in pv + [root + 12]: play('piano', PIANO.note(n, BEAT * 1.2, 0.75, rel=0.6), t, 0, 0.8, 0.5)
    play('str', VLN.note(pv[-1] + 12, BEAT, 0.8, att=0.005, rel=0.3), t, 0.3, 0.6, 0.5)

# ---------- hangeffektek ----------
FX = A.get('fx', 0.5)
def whoosh(L=0.9):
    n = int(L * SR); t = np.arange(n) / SR; e = np.sin(np.pi * t / L) ** 2; y = rng.standard_normal(n) * e
    out = np.zeros(n); seg = 2048
    for i in range(0, n, seg): f = 400 + 3800 * (i / n); out[i:i + seg] = bp(y[max(0, i - 512):i + seg], f * 0.6, min(f * 1.6, 18000))[-len(y[i:i + seg]):]
    return out * 0.8
def blip(f=1320, L=0.18): t = np.arange(int(L * SR)) / SR; return np.sin(2 * np.pi * f * t) * np.exp(-t / 0.05) * 0.35
def zap(L=0.35): t = np.arange(int(L * SR)) / SR; f = 2400 * np.exp(-t / 0.08) + 300; return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.12) * 0.3
def scanfx(L):
    t = np.arange(int(L * SR)) / SR; y = 0.25 * np.sin(2 * np.pi * (180 + 60 * t / L) * t) * (0.6 + 0.4 * np.sin(2 * np.pi * 8 * t)) + 0.05 * hp(rng.standard_normal(len(t)), 6000)
    return y * np.minimum(1, t / 0.05) * np.minimum(1, (L - t) / 0.2)
def rumble(L): t = np.arange(int(L * SR)) / SR; return lp(rng.standard_normal(len(t)), 120) * 2.2 * np.sin(np.pi * t / L) ** 2
def water(L): t = np.arange(int(L * SR)) / SR; return bp(rng.standard_normal(len(t)), 300, 2500) * 0.22 * (0.5 + 0.5 * np.sin(2 * np.pi * 3.1 * t) ** 2) * np.sin(np.pi * t / L) ** 2
def databeep(): y = np.concatenate([blip(1760, 0.08), np.zeros(int(0.03 * SR)), blip(2200, 0.1)]); return y
def shutter():   # fényképezőgép-zár: két rövid mechanikus kattanás
    def ck(L, f0, f1, tau): t = np.arange(int(L * SR)) / SR; return bp(rng.standard_normal(len(t)), f0, f1) * np.exp(-t / tau)
    y = np.zeros(int(0.16 * SR)); a = ck(0.03, 1800, 9000, 0.004) * 0.9; b = ck(0.05, 900, 6000, 0.008) * 0.7; y[:len(a)] += a; o = int(0.075 * SR); y[o:o + len(b)] += b; return y * 0.8
def crack(L=0.6):  # a talajminta törése: éles roppanás, utána szemcsés morajlás
    t = np.arange(int(L * SR)) / SR; n = rng.standard_normal(len(t)); y = bp(n, 500, 6000) * np.exp(-t / 0.018) * 1.2
    g = (rng.random(len(t)) < 0.0035) * rng.standard_normal(len(t)) * np.exp(-t / 0.2); y += bp(g, 800, 5000) * 2.5 + lp(n, 220) * np.exp(-t / 0.15) * 0.8; return y * 0.6
for e in EV['sfx']:
    tp, g = e['type'], e.get('g', 0.3) * FX; d = e.get('dur', 1.0)
    y = {'whoosh': lambda: whoosh(), 'zap': lambda: zap(), 'blip': lambda: blip(), 'databeep': databeep, 'scan': lambda: scanfx(d), 'geothump': lambda: boom(0.8) * 0.6,
         'rumble': lambda: rumble(d), 'water': lambda: water(d), 'impact': lambda: boom(1.4), 'shutter': shutter, 'crack': lambda: crack()}.get(tp, lambda: None)()
    if y is not None: play('fx', y, e['t'], 0, g * 2.2, 0.25)

# ---------- keverés: reverb, oldallánc a lábdobra, mesterlánc ----------
print('keverés…', flush=True)
def ir(L=2.4, seed=1):
    r = np.random.default_rng(seed); n = int(L * SR); t = np.arange(n) / SR; y = r.standard_normal(n) * np.exp(-t / (L / 6.9))
    y = lp(y, 6500); y[:int(0.012 * SR)] = 0; return y / np.sqrt(np.sum(y ** 2))
revL = fftconvolve(REV.L, ir(2.4, 1))[:N]; revR = fftconvolve(REV.R, ir(2.4, 2))[:N]
# oldallánc
kick_env = np.zeros(N)
for b in M['drums'].L.nonzero()[0][:0]: pass
duck = np.ones(N)
for s0, s1, kind in SECT:
    if kind not in ('chorus', 'build', 'verseB'): continue
    for bar in range(int(s0), int(s1)):
        for b in [0, 1, 2, 3]:
            i = int(tb(bar, b) * SR); n = int(0.22 * SR)
            if i + n < N: duck[i:i + n] = np.minimum(duck[i:i + n], 1 - 0.28 * np.exp(-np.arange(n) / SR / 0.07))
GAIN = {'drums': 0.8, 'bass': 0.36, 'piano': 0.8, 'gtr': 0.66, 'str': 0.55, 'lead': 0.75, 'harp': 0.5, 'fx': 0.5}
L = np.zeros(N); R = np.zeros(N)
cut = np.ones(N)
for c0, c1 in CUTS:
    i0, i1 = int(tb(c0) * SR), int(tb(c1) * SR); r = int(0.05 * SR); cut[i0:i1] = 0.1; cut[i0:i0 + r] = np.linspace(1, 0.1, r)
for k, b in M.items():
    g = GAIN[k] * (duck if k in ('str', 'bass', 'piano', 'gtr') else 1) * (cut if k != 'fx' else 1)
    L += b.L * g; R += b.R * g
L += revL * 0.55 * (0.5 + 0.5 * cut); R += revR * 0.55 * (0.5 + 0.5 * cut)
# néma szakaszok (a kép „megáll”): csak a zengés és az effekt marad

# mester: aluláteresztő a zümmögés ellen, finom kompresszió, korlátozó
L = hp(L, 30); R = hp(R, 30)
def shelf(x): hi = hp(x, 6000); return x - 0.35 * hi
L = shelf(L); R = shelf(R)
rms = np.sqrt(np.mean(L ** 2 + R ** 2) / 2); target = 10 ** (-16 / 20)
L *= target / rms; R *= target / rms
def soft(x, th=0.7): return np.where(np.abs(x) < th, x, np.sign(x) * (th + (1 - th) * np.tanh((np.abs(x) - th) / (1 - th))))
L = soft(L); R = soft(R)
pk = max(np.max(np.abs(L)), np.max(np.abs(R))); L *= 0.96 / pk; R *= 0.96 / pk
# be- és kiúsztatás
fi = int(0.04 * SR); L[:fi] *= np.linspace(0, 1, fi); R[:fi] *= np.linspace(0, 1, fi)
fo = int(1.6 * SR); L[-fo:] *= np.linspace(1, 0, fo) ** 2; R[-fo:] *= np.linspace(1, 0, fo) ** 2
st = (np.stack([L, R], 1) * 32767).astype(np.int16)
import wave
with wave.open(OUT, 'wb') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(st.tobytes())
print('kész', OUT, round(N / SR, 1), 's')

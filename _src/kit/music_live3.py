#!/usr/bin/env python3
# Hangmintás („élő”) zene bármelyik ütemes videóhoz: valódi hangszerek felvett mintáiból (zongora, orgona, vonósok,
# akusztikus/elektromos/nejlonhúros gitár, basszusgitár, hárfa, xilofon, fúvósok, akusztikus dob) rakja össze a darabot
# a videó music.json szakaszai és átvezetései szerint; a gép- és effekthangok (fúrás, kalapács, hidraulika, whoosh, ütés…)
# a régi szintetizáló könyvtárból (synthlib/synth2/synth3) jönnek, ugyanazokra az időpontokra.
# (music_live3: mint a music_live2, plusz --stem) Használat: python3 kit/music_live2.py <events.json> <music.json> <ki.wav> [--style S] [--seed N] [--soft] [--fx G]
# Stílusok: indiepop, folk, cinematic, funk, lofi, chamber, brassy, acoustic
# Hangminták: /home/claude/samples – Salamander Grand Piano (CC BY 3.0), tonejs-instruments (CC BY 3.0), Tone.js dobminták
import numpy as np, json, sys, os, re, glob, subprocess, wave, argparse
from scipy.signal import fftconvolve, lfilter, butter
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import synthlib as L
from synthlib import SFX as OLD_SFX
import synth2, synth3
SR = L.SR
SMP = '/home/claude/samples'; CACHE = f'{SMP}/cache'; os.makedirs(CACHE, exist_ok=True)
ap = argparse.ArgumentParser(); ap.add_argument('events'); ap.add_argument('music'); ap.add_argument('out')
ap.add_argument('--style', default=None); ap.add_argument('--seed', type=int, default=None); ap.add_argument('--soft', action='store_true'); ap.add_argument('--fx', type=float, default=None)
ap.add_argument('--fxstem', default=None); ap.add_argument('--pad', type=float, default=None); ap.add_argument('--stem', default=None)
A = ap.parse_args()
EV = json.load(open(A.events)); CF = json.load(open(A.music)); LV = CF.get('live', {})
BPM = EV['bpm']; BEAT = 60 / BPM; BAR = 4 * BEAT; PAD = A.pad if A.pad is not None else LV.get('pad', 0.6)
TOTAL = EV['total'] + PAD; N = int(TOTAL * SR)   # a régi motorokhoz hasonlóan a videó vége után 0,6 s lecsengés
SEED = A.seed if A.seed is not None else LV.get('seed', CF.get('seed', 1)); rng = np.random.default_rng(SEED)
STYLE = A.style or LV.get('style', 'indiepop')
SOFT = A.soft or LV.get('soft', CF.get('soft', CF.get('genre') == 'ambient'))
tb = lambda bar, beat=0: (bar * 4 + beat) * BEAT

# ================= hangminták =================
NOTE = {'C': 0, 'Cs': 1, 'D': 2, 'Ds': 3, 'E': 4, 'F': 5, 'Fs': 6, 'G': 7, 'Gs': 8, 'A': 9, 'As': 10, 'B': 11}
def midi(name):
    m = re.match(r'([A-G]s?)(-?\d)$', name); return NOTE[m.group(1)] + 12 * (int(m.group(2)) + 1) if m else None
def decode(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True).stdout
    return np.frombuffer(raw, np.float32).copy()
DIRS = {'piano': 'ta/salamander', 'violin': 'ti/samples/violin', 'cello': 'ti/samples/cello', 'cbass': 'ti/samples/contrabass', 'gac': 'ti/samples/guitar-acoustic',
        'gel': 'ti/samples/guitar-electric', 'gny': 'ti/samples/guitar-nylon', 'bass': 'ti/samples/bass-electric', 'harp': 'ti/samples/harp', 'organ': 'ti/samples/organ',
        'xylo': 'ti/samples/xylophone', 'trumpet': 'ti/samples/trumpet', 'trombone': 'ti/samples/trombone', 'flute': 'ti/samples/flute', 'sax': 'ti/samples/saxophone',
        'horn': 'ti/samples/french-horn', 'clarinet': 'ti/samples/clarinet'}
class Inst:
    def __init__(self, name):
        cp = f'{CACHE}/{name}.npz'
        if os.path.exists(cp): z = np.load(cp); self.S = {int(k): z[k] for k in z.files}
        else:
            self.S = {}
            for f in glob.glob(os.path.join(SMP, DIRS[name], '*.mp3')):
                m = midi(os.path.basename(f)[:-4])
                if m is None: continue
                x = decode(f); i0 = int(np.argmax(np.abs(x) > 0.01 * np.max(np.abs(x)))); x = x[max(0, i0 - 40):]
                x = x / (np.sqrt(np.mean(x[:int(0.4 * SR)] ** 2)) + 1e-9) * 0.12; self.S[m] = x[:int(16 * SR)].astype(np.float32)
            np.savez(cp, **{str(k): v for k, v in self.S.items()})
        self.keys = np.array(sorted(self.S))
    def note(self, m, dur, vel=0.8, att=0.004, rel=0.3, cut=None):
        k = int(self.keys[np.argmin(np.abs(self.keys - m))]); x = self.S[k]; ratio = 2 ** ((m - k) / 12)
        n = int((dur + rel) * SR); idx = np.arange(n) * ratio; idx = idx[idx < len(x) - 1]; i = idx.astype(np.int64); fr = (idx - i).astype(np.float32)
        y = x[i] * (1 - fr) + x[i + 1] * fr; env = np.ones(len(y), np.float32); a = int(att * SR)
        if a > 0: env[:a] = np.linspace(0, 1, min(a, len(y)))[:len(env[:a])]
        d = int(dur * SR)
        if d < len(y): env[d:] *= np.linspace(1, 0, len(y) - d) ** 1.5
        return y * env * vel
_I = {}
def I(name):
    if name not in _I: _I[name] = Inst(name)
    return _I[name]
def drumkit(name):
    cp = f'{CACHE}/drums2_{name}.npz'
    if os.path.exists(cp): z = np.load(cp); return {k: z[k] for k in z.files}
    d = {}
    for k in ['kick', 'snare', 'hihat', 'tom1', 'tom2', 'tom3']:
        x = decode(f'{SMP}/ta/drum-samples/{name}/{k}.mp3'); tgt = {'kick': 0.22, 'snare': 0.18, 'hihat': 0.07}.get(k, 0.16)
        r = float(np.sqrt(np.mean(x[:int(0.15 * SR)] ** 2)) + 1e-9); d[k] = (x * tgt / r).astype(np.float32)
    np.savez(cp, **d); return d
def bfilt(x, f, kind): b, a = butter(2, np.array(f) / (SR / 2), kind); return lfilter(b, a, x).astype(np.float32)
lp = lambda x, f: bfilt(x, f, 'low'); hp = lambda x, f: bfilt(x, f, 'high'); bp = lambda x, f0, f1: bfilt(x, [f0, f1], 'band')

# ================= ütőhangszer-kiegészítők (szintetizált: cintányér, shaker, mély ütés) =================
def crash(Lc=2.4):
    n = int(Lc * SR); t = np.arange(n) / SR; y = rng.standard_normal(n) * np.exp(-t / 0.9)
    for f in [3150, 4410, 5370, 6830, 8120]: y += 0.25 * np.sin(2 * np.pi * f * t + rng.random() * 6) * np.exp(-t / 0.6)
    return hp(y.astype(np.float32), 3500) * 0.5
def shaker(): n = int(0.09 * SR); e = np.sin(np.linspace(0, np.pi, n)) ** 2; return hp((rng.standard_normal(n) * e).astype(np.float32), 5000) * 0.35
CRASH = crash(); SHK = shaker(); REVC = (lp(crash(2.0), 8000)[::-1] * 0.6).copy()
def boom(Lb=2.0):
    t = np.arange(int(Lb * SR)) / SR; f = 32 + 40 * np.exp(-t / 0.12); return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.7) * 0.9).astype(np.float32)

# ================= stílusok =================
MAJ, MIN, DOR = [0, 2, 4, 5, 7, 9, 11], [0, 2, 3, 5, 7, 8, 10], [0, 2, 3, 5, 7, 9, 10]
ST = {
 'indiepop': dict(scale=MAJ, prog=[[0, 4, 5, 3], [5, 3, 0, 4], [0, 5, 3, 4]], drums='pop', kit='acoustic-kit', bass='eighths', keys='stab', gtr=('gac', 'strum'), strings='pad', lead=['violin', 'flute', 'piano'], spark='harp', brass=False, swing=0, ext=False),
 'folk': dict(scale=MAJ, prog=[[0, 3, 0, 4], [0, 5, 3, 4], [3, 0, 4, 0]], drums='brush', kit='acoustic-kit', bass='long', keys='arp', gtr=('gac', 'pick'), strings='pad', lead=['flute', 'violin', 'clarinet'], spark='harp', brass=False, swing=0, ext=False, gtr2=('gny', 'pick')),
 'cinematic': dict(scale=MIN, prog=[[0, 5, 2, 6], [0, 3, 5, 4], [5, 6, 0, 0]], drums='boom', kit='acoustic-kit', bass='pulse', keys='octaves', gtr=None, strings='ostinato', lead=['horn', 'violin', 'cello'], spark='harp', brass=False, swing=0, ext=False),
 'funk': dict(scale=DOR, prog=[[0, 0, 3, 3], [0, 3, 0, 4], [0, 6, 3, 4]], drums='funk', kit='acoustic-kit', bass='funk16', keys='organ', gtr=('gel', 'chop'), strings=None, lead=['sax', 'trumpet', 'gel'], spark=None, brass=True, swing=0, ext=True),
 'lofi': dict(scale=MAJ, prog=[[1, 4, 0, 0], [3, 2, 1, 0], [5, 1, 4, 0]], drums='half', kit='acoustic-kit', bass='walk', keys='comp', gtr=('gny', 'pick'), strings='pad', lead=['piano', 'sax', 'gny'], spark=None, brass=False, swing=0.33, ext=True),
 'chamber': dict(scale=MAJ, prog=[[0, 3, 4, 0], [0, 5, 1, 4], [3, 4, 2, 5]], drums='light', kit='acoustic-kit', bass='long', keys='arp', gtr=('gny', 'pick'), strings='pad', lead=['xylo', 'clarinet', 'flute', 'violin'], spark='xylo', brass=False, swing=0, ext=False),
 'brassy': dict(scale=MAJ, prog=[[0, 3, 4, 3], [0, 5, 3, 4], [3, 4, 0, 0]], drums='pop', kit='acoustic-kit', bass='drive', keys='stab', gtr=('gel', 'chop'), strings=None, lead=['trumpet', 'sax'], spark=None, brass=True, swing=0, ext=False),
 'acoustic': dict(scale=MAJ, prog=[[0, 4, 5, 3], [3, 0, 4, 5], [5, 4, 3, 4]], drums='pop', kit='acoustic-kit', bass='drive', keys='block', gtr=('gac', 'strum'), strings='pad', lead=['gel', 'violin'], spark=None, brass=False, swing=0, ext=False, gtr2=('gel', 'pick')),
}
S = ST[STYLE]
if SOFT and S['drums'] in ('pop', 'funk'): S = dict(S, drums='brush')
EN = {'intro': 1, 'title': 3, 'grooveA': 3, 'grooveA2': 3, 'reveal': 2, 'half': 2, 'drive': 4, 'grooveB': 4, 'drop': 5, 'break': 1, 'build': 2, 'outro': 0, 'none': -1}
TONIC = 48 + (CF.get('key', 57) % 12)            # C3…B3 környéke
if LV.get('key') is not None: TONIC = 48 + LV['key'] % 12
SCALE = S['scale']; PROGS = S['prog']; PROG_HI = PROGS[SEED % len(PROGS)]; PROG_LO = PROGS[(SEED + 1) % len(PROGS)]
HALF = BPM >= 118 and S['drums'] in ('pop', 'brush', 'light', 'half')   # gyors videóknál felezett lüktetés (nyugodtabb)
LEADS = S['lead']; LEAD = LV.get('lead', LEADS[(SEED // 3) % len(LEADS)])
KIT = drumkit(LV.get('kit', S['kit']))
def chord(deg, ext=False):
    pcs = []; ks = (0, 2, 4, 6) if ext else (0, 2, 4)
    for k in ks: d = deg + k; pcs.append(SCALE[d % 7] + 12 * (d // 7))
    return pcs                                         # a tonikához képest (félhangban)
def voice(pcs, lo, hi, prev=None):
    """a hangokat [lo, hi] közé teszi, az előző akkordhoz közel (hangvezetés)"""
    out = []
    for p in pcs:
        c = [TONIC + p + 12 * k for k in range(-4, 6) if lo <= TONIC + p + 12 * k <= hi]
        if not c: c = [TONIC + p]
        if prev: c.sort(key=lambda n: min(abs(n - q) for q in prev))
        else: c.sort(key=lambda n: abs(n - (lo + hi) / 2))
        out.append(c[0])
    return sorted(out)

# ================= buszok =================
BUS = {k: np.zeros((2, N), np.float32) for k in ['drums', 'bass', 'keys', 'gtr', 'str', 'lead', 'spark', 'brass', 'fx']}
REV = np.zeros((2, N), np.float32)
def place(bus, y, t, pan=0.0, g=1.0, rev=0.15):
    i = int(round(t * SR))
    if i >= N or g == 0 or len(y) == 0: return
    if y.ndim == 1: gl, gr = np.cos((pan + 1) * np.pi / 4) * 1.414, np.sin((pan + 1) * np.pi / 4) * 1.414; y2 = np.stack([y * gl, y * gr])
    else: y2 = y
    if i < 0: y2 = y2[:, -i:]; i = 0
    j = min(N, i + y2.shape[1]); BUS[bus][:, i:j] += y2[:, :j - i] * g
    if rev > 0: REV[:, i:j] += y2[:, :j - i] * g * rev
hum = lambda s=0.005: float(rng.normal(0, s))
SWING = S['swing']
def sw(b):  # 16-od/8-ad lendület (lofi)
    if SWING <= 0: return b
    f = b % 1.0
    return b + (SWING * 0.5 if abs(f - 0.5) < 1e-6 else SWING * 0.25 if abs(f - 0.25) < 1e-6 or abs(f - 0.75) < 1e-6 else 0)

# ================= dallam (videónként más motívum) =================
RHY = [[(0, 1), (1, 0.5), (1.5, 0.5), (2, 1), (3, 1)], [(0, 0.5), (0.5, 0.5), (1, 1), (2, 1.5), (3.5, 0.5)], [(0, 1.5), (1.5, 0.5), (2, 2)],
       [(0.5, 0.5), (1, 0.5), (1.5, 1), (2.5, 0.5), (3, 1)], [(0, 0.75), (0.75, 0.75), (1.5, 0.5), (2, 1), (3, 0.5), (3.5, 0.5)], [(0, 2), (2, 0.5), (2.5, 0.5), (3, 1)]]
RA, RB = RHY[SEED % len(RHY)], RHY[(SEED * 7 + 3) % len(RHY)]
LR = {'violin': (67, 88), 'flute': (72, 93), 'clarinet': (58, 82), 'sax': (58, 80), 'trumpet': (58, 82), 'horn': (50, 72), 'cello': (48, 67), 'xylo': (72, 96),
      'piano': (67, 86), 'gel': (59, 79), 'gny': (59, 79), 'organ': (60, 79)}
def hook_bar(rel, deg, prev_note):
    """egy ütemnyi dallam: akkordhangok a súlyos, skálahangok a gyenge helyeken"""
    lo, hi = LR.get(LEAD, (64, 84)); r = (RA if rel % 4 != 3 else RB); pcs = chord(deg); notes = []; cur = prev_note or (lo + hi) // 2
    rr = np.random.default_rng(SEED * 31 + rel % 8)
    for k, (b, d) in enumerate(r):
        strong = abs(b - round(b)) < 1e-6 and int(round(b)) % 2 == 0
        cand = [TONIC + p + 12 * o for p in (pcs if strong else [SCALE[i] for i in range(7)]) for o in range(-2, 5)]
        cand = [c for c in cand if lo <= c <= hi]
        step = rr.integers(-4, 5); target = cur + step
        cand.sort(key=lambda c: abs(c - target)); n = cand[0] if cand else cur
        if rel % 4 == 3 and k == len(r) - 1: n = min([TONIC + p + 12 * o for p in (0, 4 if SCALE is MAJ else 3) for o in range(-2, 5) if lo <= TONIC + p + 12 * o <= hi] or [n], key=lambda c: abs(c - cur))
        notes.append((b, d, n)); cur = n
    return notes, cur

# ================= hangszerelés ütemenként =================
SECT = CF['sections']; TR = CF.get('transitions', {})
last_bar = int(np.ceil(TOTAL / BAR))
prev_voice = None; lead_prev = None; kicks = []
def sec_at(bar):
    for s in SECT:
        if s[0] <= bar < s[1]: return s
    return None
print('hangszerelés:', STYLE, 'lead', LEAD, 'bpm', BPM, 'soft' if SOFT else '', flush=True)
for (s0, s1, name) in SECT:
    E = EN.get(name, 3)
    if E < 0: continue
    prog = PROG_HI if E >= 4 else PROG_LO
    for bar in range(int(s0), int(np.ceil(s1))):
        if bar < s0 or tb(bar) >= TOTAL - 0.05: continue
        rel = bar - int(s0); deg = prog[rel % 4]; pcs = chord(deg, S['ext']); T0 = tb(bar); end = tb(s1)
        def on(b): t = T0 + b * BEAT; return t < end - 0.01 and t < TOTAL - 0.1
        root = voice([pcs[0]], 28, 43)[0]; lastbar = bar == int(np.ceil(s1)) - 1
        kv = voice(pcs, 55, 74, prev_voice); prev_voice = kv
        # ---- vonósok
        if S['strings'] and E >= 1 and on(0):
            sg = 0.75 if E <= 2 else 0.5
            if S['strings'] == 'ostinato' and E >= 2:
                for k in range(8):
                    if on(k * 0.5): place('str', I('cello').note(root + 12 + (7 if k % 4 == 2 else 0), BEAT * 0.32, 0.75 if k % 2 == 0 else 0.55, att=0.005, rel=0.08), T0 + k * 0.5 * BEAT + hum(), -0.25, 0.8, 0.2)
                place('str', I('violin').note(voice([pcs[2 % len(pcs)]], 74, 86)[0], BAR * 0.98, 0.5, att=0.4, rel=0.8), T0, 0.35, 0.45, 0.5)
            else:
                place('str', I('cello').note(root + 12, BAR * 0.98, 0.7, att=0.25, rel=0.6), T0, -0.3, sg, 0.45)
                place('str', I('violin').note(voice([pcs[-1 if len(pcs) < 4 else 2]], 69, 81)[0], BAR * 0.98, 0.5, att=0.35, rel=0.8), T0, 0.35, sg * 0.55, 0.5)
                if E >= 4: place('str', I('cbass').note(root + 12 if root < 36 else root, BAR * 0.98, 0.5, att=0.2, rel=0.6), T0, -0.1, sg * 0.35, 0.3)
        # ---- billentyű
        K = S['keys']; kin = 'organ' if K == 'organ' else 'piano'
        if E == 1 or (E == 2 and K != 'organ'):
            arp = [kv[0], kv[1], kv[2], kv[1] + 12, kv[2] + 12, kv[1] + 12, kv[2], kv[1]]
            for k, n in enumerate(arp):
                if on(k * 0.5): place('keys', I('piano').note(n, BEAT * 0.9, 0.5 + 0.1 * (k == 0), rel=0.8), T0 + sw(k * 0.5) * BEAT + hum(), 0.1, 0.85, 0.4)
        elif K == 'stab':
            for b in ([0, 0.5, 1.5, 2, 2.5, 3.5] if E >= 5 else [0, 1.5, 2.5]):
                if on(b):
                    for n in kv: place('keys', I('piano').note(n, BEAT * (0.45 if E >= 5 else 0.9), 0.48 + 0.12 * (b in (0, 2)), rel=0.3), T0 + b * BEAT + hum(), 0.15, 0.9, 0.25)
        elif K == 'arp':
            seq = [kv[0], kv[1], kv[2], kv[1] + 12, kv[2] + 12, kv[1] + 12, kv[2], kv[1]]
            for k, n in enumerate(seq):
                if on(k * 0.5): place('keys', I('piano').note(n, BEAT * 0.7, 0.45 + 0.1 * (k % 4 == 0), rel=0.5), T0 + k * 0.5 * BEAT + hum(), 0.15, 0.8, 0.35)
        elif K == 'block':
            for b in ([0, 2] if E >= 4 else [0]):
                if on(b):
                    for n in kv: place('keys', I('piano').note(n, BEAT * (1.9 if E >= 4 else 3.8), 0.5, rel=0.5), T0 + b * BEAT + hum(), 0.15, 0.85, 0.3)
        elif K == 'octaves':
            for b in [0, 1, 2, 3]:
                if on(b): place('keys', I('piano').note(TONIC + pcs[0] + 12, BEAT * 0.9, 0.55 if b == 0 else 0.4, rel=0.6), T0 + b * BEAT, 0.1, 0.8, 0.4); place('keys', I('piano').note(TONIC + pcs[0] + 24, BEAT * 0.9, 0.35, rel=0.6), T0 + b * BEAT, 0.2, 0.6, 0.4)
        elif K == 'comp':
            for b, d in [(0, 1.4), (1.5, 0.4), (2.75, 1.0)]:
                if on(b):
                    for j, n in enumerate(voice(pcs, 52, 72, prev_voice)): place('keys', I('piano').note(n, BEAT * d, 0.42, rel=0.6), T0 + sw(b) * BEAT + j * 0.008 + hum(), 0.1, 0.85, 0.35)
        elif K == 'organ':
            if on(0):
                for n in kv: place('keys', I('organ').note(n, BAR * 0.97, 0.42, att=0.03, rel=0.2), T0, -0.1, 0.55, 0.25)
        # ---- gitár
        for G in [S['gtr'], S.get('gtr2') if E >= 4 else None]:
            if not G or E < 2: continue
            gi, gp = G; gv = voice(pcs + [pcs[0] + 12], 45, 69)
            if gp == 'strum' and E >= 3:
                pat = [(0, 1), (1, 0), (1.5, -1), (2.5, -1), (3, 1), (3.5, -1)] if E < 5 else [(b * 0.5, 1 if b % 2 == 0 else -1) for b in range(8)]
                for b, d in pat:
                    if not on(b): continue
                    ns = gv if d > 0 else gv[::-1][:3]
                    for j, n in enumerate(ns): place('gtr', I(gi).note(n, BEAT * 0.48, (0.55 if d > 0 else 0.36) * (1 - 0.05 * j), rel=0.15), T0 + b * BEAT + j * 0.011 + hum(), 0.45, 0.72, 0.2)
            elif gp == 'pick' or (gp == 'strum' and E < 3):
                seq = [gv[0], gv[2], gv[3 % len(gv)], gv[2], gv[1], gv[3 % len(gv)], gv[2], gv[3 % len(gv)]]
                for k, n in enumerate(seq):
                    if on(k * 0.5): place('gtr', I(gi).note(n + (12 if n < 50 else 0), BEAT * 0.9, 0.48, rel=0.6), T0 + sw(k * 0.5) * BEAT + hum(), -0.45 if gi != 'gny' else 0.4, 0.72, 0.3)
            elif gp == 'chop' and E >= 3:
                cv = voice(pcs, 57, 69)
                for b in [0.5, 1.25, 1.75, 2.5, 3.25, 3.75]:
                    if on(b):
                        for n in cv: place('gtr', I(gi).note(n, 0.07, 0.5, rel=0.03), T0 + b * BEAT + hum(0.003), 0.4, 0.7, 0.1)
        # ---- basszus
        Bp = S['bass']
        if E >= 2 or (E == 1 and Bp == 'long'):
            pats = {'eighths': [(k * 0.5, 0.42, 0 if k not in (3, 7) or E < 5 else 12) for k in range(8)] if E >= 4 else [(0, 1.4, 0), (1.5, 0.45, 0), (2, 1.4, 0), (3.5, 0.45, 0)],
                    'drive': [(0, 0.9, 0), (1.5, 0.4, 0), (2, 0.9, 0), (3, 0.4, 7), (3.5, 0.4, 0)] if E >= 4 else [(0, 1.8, 0), (2, 1.8, 0)],
                    'long': [(0, 3.8, 0)] if E < 4 else [(0, 1.8, 0), (2, 1.4, 7), (3.5, 0.4, 0)],
                    'pulse': [(k * 0.5, 0.35, 0) for k in range(8)] if E >= 3 else [(0, 3.8, 0)],
                    'funk16': [(0, 0.35, 0), (0.75, 0.2, 12), (1.5, 0.3, 0), (2, 0.2, 7), (2.75, 0.2, 0), (3.25, 0.2, 10), (3.5, 0.35, 12)] if E >= 3 else [(0, 1.4, 0), (2.5, 0.8, 0)],
                    'walk': [(0, 0.9, 0), (1, 0.9, SCALE[2] - SCALE[0]), (2, 0.9, 7), (3, 0.9, 11 if SCALE is MAJ else 10)]}[Bp]
            for b, d, iv in pats:
                if on(b): place('bass', I('bass').note(root + iv, BEAT * d, 0.82, rel=0.06), T0 + sw(b) * BEAT + hum(), 0, 1.0, 0.02)
        # ---- dallam
        if LEAD and E >= 4 or (LEAD and E == 3 and rel % 8 >= 4 and STYLE in ('folk', 'chamber', 'lofi')):
            notes, lead_prev = hook_bar(rel, deg, lead_prev)
            for b, d, n in notes:
                if on(b): place('lead', I(LEAD).note(n, BEAT * d * (0.95 if LEAD not in ('xylo',) else 0.6), 0.72, att=0.02 if LEAD not in ('horn', 'cello', 'violin') else 0.05, rel=0.35), T0 + sw(b) * BEAT + hum(), 0.1, 0.85, 0.45)
        # ---- csillogás (hárfa / xilofon)
        if S['spark'] and E >= 3 and rel % 2 == 1:
            sp = S['spark']
            for k, n in enumerate(voice(pcs, 72, 90)):
                if on(2 + k * 0.25): place('spark', I(sp).note(n + (12 if sp == 'xylo' and n < 72 else 0), BEAT, 0.42, rel=1.0), T0 + (2 + k * 0.25) * BEAT, 0.5, 0.6, 0.6)
        if E == 1 and S['spark'] == 'harp' and rel % 2 == 0:
            for k, n in enumerate(voice(pcs, 67, 88)):
                if on(1 + k * 0.5): place('spark', I('harp').note(n, BEAT * 2, 0.4, rel=1.5), T0 + (1 + k * 0.5) * BEAT, 0.5, 0.6, 0.6)
        # ---- rézfúvós ütések
        if S['brass'] and E >= 4 and rel % 2 == 0:
            for b in ([0, 2.5] if E >= 5 else [0]):
                if on(b):
                    for n in voice(pcs, 60, 76): place('brass', I('trumpet').note(n, BEAT * 0.4, 0.6, att=0.01, rel=0.15), T0 + b * BEAT, 0.2, 0.55, 0.3)
                    place('brass', I('trombone').note(voice([pcs[0]], 46, 58)[0], BEAT * 0.4, 0.6, att=0.01, rel=0.15), T0 + b * BEAT, -0.2, 0.55, 0.3)
        # ---- dob
        D = S['drums']; dk = KIT
        if E >= 2 or (E == 1 and D == 'boom'):
            kpat = {'pop': {2: [0], 3: [0, 2.5], 4: [0, 1.5, 2.5], 5: [0, 1.5, 2, 2.75]}, 'brush': {2: [0], 3: [0, 2], 4: [0, 2, 2.5], 5: [0, 1.5, 2, 2.5]},
                    'boom': {1: [0], 2: [0], 3: [0, 2], 4: [0, 1.5, 2], 5: [0, 0.75, 2, 2.75]}, 'funk': {2: [0], 3: [0, 0.75, 2.5], 4: [0, 0.75, 2.5, 3.25], 5: [0, 0.75, 1.75, 2.5, 3.25]},
                    'half': {2: [0], 3: [0, 2.75], 4: [0, 2.5, 2.75], 5: [0, 0.75, 2.5]}, 'light': {2: [0], 3: [0, 2], 4: [0, 1.5, 2], 5: [0, 1.5, 2, 3]}}[D].get(E, [0])
            if HALF and D in ('pop', 'brush', 'light'): kpat = [b for b in kpat if b < 2] + [2.5] if E >= 4 else [0]
            for b in kpat:
                if on(b): place('drums', dk['kick'] * (0.55 if D == 'brush' else 0.75), T0 + sw(b) * BEAT + hum(0.003), 0, 1.0, 0.04); kicks.append(T0 + b * BEAT)
            snb = [] if E < 3 else ([2] if (HALF or D == 'half') else [1, 3])
            if D == 'boom': snb = []
            for b in snb:
                if on(b):
                    sn = dk['snare'] * (0.45 if D in ('brush', 'light') else 0.75); sn = lp(sn, 5000) if D in ('brush', 'light') else sn
                    place('drums', sn, T0 + b * BEAT + hum(0.003), 0.05, 0.75, 0.25)
            if D == 'funk' and E >= 4:
                for b in [1.75, 2.25, 3.75]:
                    if on(b): place('drums', dk['snare'] * 0.18, T0 + b * BEAT + hum(0.003), 0.05, 0.75, 0.1)
            hstep = 0.25 if (E >= 5 and D in ('pop', 'funk')) or D == 'funk' else 0.5
            if D not in ('boom',) and E >= 3:
                for k in range(int(4 / hstep)):
                    b = k * hstep
                    if on(b): place('drums', lp(dk['hihat'], 9000) * (0.45 if abs(b - round(b)) < 1e-6 else 0.28), T0 + sw(b) * BEAT + hum(0.003), 0.3, 0.2, 0.03)
            if D in ('brush', 'light', 'pop') and E >= 3:
                for k in range(8):
                    if on(k * 0.5): place('drums', SHK * (0.8 if k % 2 else 0.5), T0 + k * 0.5 * BEAT + hum(0.003), -0.4, 0.14, 0.03)
            if D == 'boom' and E >= 3:
                for b, tom in ([(3, 'tom1'), (3.25, 'tom2'), (3.5, 'tom3'), (3.75, 'tom3')] if rel % 2 == 1 else [(2, 'tom3')]):
                    if on(b): place('drums', dk[tom] * 0.7, T0 + b * BEAT, -0.3, 0.7, 0.3)
            if lastbar and E >= 3 and D != 'boom':
                for k in range(4):
                    if on(3 + k * 0.25): place('drums', dk['snare'] * (0.25 + 0.1 * k), T0 + (3 + k * 0.25) * BEAT, 0, 0.6, 0.2)
            if rel == 0 and E >= 4: place('drums', lp(CRASH, 9000), T0, 0.2, 0.2, 0.25)


# ================= átvezetések, ütések =================
def hit(t, deg=0):
    place('fx', boom(), t, 0, 0.55, 0.3); place('drums', KIT['kick'], t, 0, 0.9, 0.2); place('drums', lp(crash(3.0), 9000), t, 0, 0.28, 0.35)
    pcs = chord(deg); 
    for n in voice(pcs, 55, 74) + [TONIC + pcs[0] - 12, TONIC + pcs[0]]: place('keys', I('piano').note(n, BAR, 0.6, rel=1.5), t, 0, 0.75, 0.5)
    place('str', I('cello').note(voice([pcs[0]], 43, 55)[0], BAR, 0.85, att=0.01, rel=1.0), t, -0.2, 0.7, 0.5)
for b, Lb in TR.get('risers', []):
    d = min(BAR * Lb, 2.4); place('fx', REVC[-int(d * SR):] if d * SR < len(REVC) else REVC, tb(b) + BAR * Lb - d, 0, 0.55, 0.2)
    x = L.riser(BAR * Lb, 300, 8000, 0.2); place('fx', np.asarray(x, np.float32) if np.ndim(x) == 1 else np.asarray(x, np.float32), tb(b), 0, 0.35 if not SOFT else 0.15, 0.2)
for b in TR.get('impacts', []):
    s = sec_at(b); E = EN.get(s[2], 3) if s else 3
    if tb(b) < TOTAL - 0.5: hit(tb(b), (PROG_HI if E >= 4 else PROG_LO)[0])
for b in TR.get('downs', []): x = L.downlifter(2.0); place('fx', np.asarray(x, np.float32), tb(b, 0.1), 0, 0.6, 0.2)
for b in TR.get('revcym', []): place('fx', REVC, tb(b) - len(REVC) / SR, 0, 0.5, 0.2)
# záró akkord az outro elején
for (s0, s1, name) in SECT:
    if name == 'outro' and tb(s0) < TOTAL - 1:
        pcs = chord(PROG_HI[0])
        for n in voice(pcs, 55, 76) + [TONIC + pcs[0] - 12]: place('keys', I('piano').note(n, BAR * 2, 0.55, rel=2.0), tb(s0), 0, 0.8, 0.6)
        place('str', I('cello').note(voice([pcs[0]], 43, 55)[0], BAR * 2, 0.7, att=0.3, rel=1.5), tb(s0), -0.2, 0.6, 0.6)
        place('str', I('violin').note(voice([pcs[2]], 74, 86)[0], BAR * 2, 0.5, att=0.5, rel=1.5), tb(s0), 0.3, 0.5, 0.6)
        if S['spark']: 
            for k, n in enumerate(voice(pcs, 72, 90)): place('spark', I(S['spark']).note(n, BEAT * 2, 0.4, rel=1.5), tb(s0) + k * 0.25 * BEAT, 0.4, 0.55, 0.6)

# ================= gép- és effekthangok (a régi könyvtárból, ugyanazokra az időpontokra) =================
ALL_SFX = dict(OLD_SFX); ALL_SFX.update(getattr(synth2, 'NEW_SFX', {})); ALL_SFX.update(synth3.SFX3)
FXG = A.fx if A.fx is not None else LV.get('fx', CF.get('fxGain', 1.0))
def fxp(x, t, g, pan=0.0, rev=0.15):
    x = np.asarray(x, np.float32)
    if x.ndim == 2 and x.shape[0] != 2: x = x.T
    place('fx', x, t, pan, g * FXG, rev)
impact_t = [tb(b) for b in TR.get('impacts', [])]
USE_EV = A.fxstem is None
for i, t in enumerate(EV.get('cuts', []) if USE_EV else []):
    if any(abs(t - u) < 0.05 for u in impact_t): continue
    fxp(L.whoosh(0.42, True, 0.16), t - 0.36, 0.35 if SOFT else 0.8, -0.4 if i % 2 else 0.4)
for sl in (EV.get('slams', []) if USE_EV else []):
    if sl.get('kind') in ('word', 'stat') and not SOFT: fxp(L.thwack(0.45 if sl['kind'] == 'word' else 0.3), sl['t'], 0.9, 0, 0.4)
for t in (EV.get('steps', []) if USE_EV else []): fxp(L.perc_tick() * 2.2, t, 0.9, 0.5)
miss = set()
for e in (EV.get('sfx', []) if USE_EV else []):
    f = ALL_SFX.get(e['type'])
    if not f: miss.add(e['type']); continue
    x, g = f(e)
    if SOFT and e['type'] in ('impact', 'geothump', 'rumble', 'dump', 'zap'): g *= 0.5
    fxp(x, e['t'], g, e.get('pan', 0.0), e.get('rev', 0.15))
if miss: print('ismeretlen sfx:', sorted(miss))

# ================= keverés és mester =================
duck = np.ones(N, np.float32)
for t in kicks:
    i = int(t * SR); n = int(0.22 * SR)
    if 0 <= i < N: j = min(N, i + n); duck[i:j] = np.minimum(duck[i:j], (1 - 0.25 * np.exp(-np.arange(j - i) / SR / 0.07)).astype(np.float32))
GAIN = {'drums': 1.2, 'bass': 0.36, 'keys': 0.8, 'gtr': 0.62, 'str': 0.55, 'lead': 0.75, 'spark': 1.0, 'brass': 1.5, 'fx': 0.0}
if SOFT: GAIN.update(drums=0.8, bass=0.3)
def ir(Lr=2.4, seed=1):
    r = np.random.default_rng(seed); n = int(Lr * SR); t = np.arange(n) / SR; y = (r.standard_normal(n) * np.exp(-t / (Lr / 6.9))).astype(np.float32)
    y = lp(y, 6500); y[:int(0.012 * SR)] = 0; return y / np.sqrt(np.sum(y ** 2))
MUS = np.zeros((2, N), np.float32)
for k, b in BUS.items():
    if k == 'fx': continue
    MUS += b * GAIN[k] * (duck if k in ('str', 'bass', 'keys', 'gtr') else 1)
wet = np.stack([fftconvolve(hp(REV[c], 150), ir(2.4, c + 1))[:N] for c in range(2)]).astype(np.float32)
MUS += wet * 0.5
# automatikus mélycsökkentés: a 150 Hz alatti energia legfeljebb ~45 % legyen
def lowfrac(x):
    seg = x[:, ::2].mean(0); S2 = np.abs(np.fft.rfft(seg)) ** 2; f = np.fft.rfftfreq(len(seg), 2 / SR); return float(S2[f < 150].sum() / (S2.sum() + 1e-12))
lowp = np.stack([lp(MUS[c], 120) for c in range(2)])
for k in (0.25, 0.45, 0.6, 0.7):
    if lowfrac(MUS) <= 0.45: break
    MUS = MUS - lowp * 0.25
print('busz-RMS dB:', {k: round(20 * np.log10(np.sqrt(np.mean((b * GAIN[k]) ** 2)) + 1e-9), 1) for k, b in BUS.items() if k != 'fx'}, 'mély', round(lowfrac(MUS), 2))
FXB = BUS['fx']
if A.fxstem:
    st = np.load(A.fxstem).astype(np.float32); st = st[:, :N] if st.shape[1] >= N else np.pad(st, ((0, 0), (0, N - st.shape[1]))); FXB = FXB + st
# szintillesztés: a zene RMS-e −16 dB (lágy: −18 dB); a gép- és effekthangok a zenéhez mérten jól hallhatók
def rms(x): return float(np.sqrt(np.mean(x ** 2)) + 1e-12)
mr = rms(MUS); MUS *= 10 ** ((-18.5 if SOFT else -16.5) / 20) / mr
act = np.abs(FXB).max(0) > 1e-4
if act.any(): fr = float(np.sqrt(np.mean(FXB[:, act] ** 2))); FXB *= (0.9 if not SOFT else 0.7) * rms(MUS) / (fr + 1e-12)
if A.stem:   # (2026-11-10) fejezetenként váltott stílushoz: a zene és az effektsáv külön mentve, a keverést a kit/music_mix.py végzi
    np.savez(A.stem, mus=MUS.astype(np.float32), fx=FXB.astype(np.float32), sr=SR); print('stem', A.stem, STYLE); sys.exit(0)
mix = MUS + FXB
mix = np.stack([hp(mix[c], 30) for c in range(2)]); mix = mix - 0.3 * np.stack([hp(mix[c], 6500) for c in range(2)])
def soft(x, th=0.72): a = np.abs(x); return np.where(a < th, x, np.sign(x) * (th + (1 - th) * np.tanh((a - th) / (1 - th))))
mix = soft(mix); mix *= 0.89 / max(1e-9, float(np.max(np.abs(mix))))
fi = int(0.03 * SR); mix[:, :fi] *= np.linspace(0, 1, fi); fo = int(1.4 * SR); mix[:, -fo:] *= np.linspace(1, 0, fo) ** 1.5
with wave.open(A.out, 'wb') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix.T * 32767).astype(np.int16).tobytes())
print('kész', A.out, STYLE, LEAD, round(N / SR, 2), 's')

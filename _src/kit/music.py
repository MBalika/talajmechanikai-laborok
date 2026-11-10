# Közös zene- és hangeffekt-szintetizátor (48 kHz sztereó, determinisztikus)
# Használat: python3 kit/music.py <events.json> <config.json> <out.wav>
# events.json: {bpm, total, sfx:[{t,type,...}], cuts:[t], slams:[{t,kind}], steps:[t]}
# config.json: {key:57, prog:[[0,3,7]...] (fok a tonikához, félhangban), roots:[...], sections:[[b0,b1,'nev'],...],
#               drums:'house'|'breaks'|'halftime', seed, transitions:{risers:[[bar,len]], impacts:[bar], downs:[bar]}, lead:[...]}
import json, sys, numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 48000
EV = json.load(open(sys.argv[1])); CF = json.load(open(sys.argv[2])); OUT = sys.argv[3]
BPM = EV['bpm']; BEAT = 60 / BPM; BAR = 4 * BEAT
TOTAL = EV['total'] + 0.6
N = int(TOTAL * SR)
rng = np.random.default_rng(CF.get('seed', 7))

def tb(bar, beat=0.0): return (bar * 4 + beat) * BEAT
def buf(): return np.zeros((2, N), np.float32)
def S(t): return int(round(t * SR))
def note_hz(n): return 440.0 * 2 ** ((n - 69) / 12)
def env_adsr(n, a, d, s, r, sus_len):
    a_n, d_n, r_n = max(1, int(a * SR)), max(1, int(d * SR)), max(1, int(r * SR)); sl = max(0, int(sus_len * SR))
    e = np.concatenate([np.linspace(0, 1, a_n, endpoint=False), np.linspace(1, s, d_n, endpoint=False), np.full(sl, s), np.linspace(s, 0, r_n)])
    return e[:n] if len(e) >= n else np.pad(e, (0, n - len(e)))
def place(bus, x, t, gain=1.0, pan=0.0):
    i = S(t)
    if i >= N or i + x.shape[-1] <= 0: return
    if x.ndim == 1:
        l = np.cos((pan + 1) * np.pi / 4); r = np.sin((pan + 1) * np.pi / 4)
        x = np.vstack([x * l * 1.414, x * r * 1.414])
    j0 = max(0, i); k0 = j0 - i; j1 = min(N, i + x.shape[1])
    bus[:, j0:j1] += x[:, k0:k0 + (j1 - j0)] * gain
def lp(x, f, order=2): sos = signal.butter(order, min(f, SR * 0.45), 'low', fs=SR, output='sos'); return signal.sosfilt(sos, x, axis=-1)
def hp(x, f, order=2): sos = signal.butter(order, f, 'high', fs=SR, output='sos'); return signal.sosfilt(sos, x, axis=-1)
def bp(x, f1, f2, order=2): sos = signal.butter(order, [f1, min(f2, SR * 0.45)], 'band', fs=SR, output='sos'); return signal.sosfilt(sos, x, axis=-1)
def saw(f, n, ph=0.0):
    t = np.arange(n) / SR; p = (f * t + ph) % 1.0; dt = max(1e-9, f / SR)
    y = 2 * p - 1
    m1 = p < dt; u = p[m1] / dt; y[m1] -= (u + u - u * u - 1)
    m2 = p > 1 - dt; u = (p[m2] - 1) / dt; y[m2] -= (u * u + u + u + 1)
    return y
def sweep_filter(x, f0, f1, kind='low', block=512, curve=2.0):
    y = np.zeros_like(x); n = x.shape[-1]; zi = None
    nb = (n + block - 1) // block
    for b in range(nb):
        u = b / max(1, nb - 1); f = f0 * (f1 / f0) ** (u ** (1 / curve) if f1 > f0 else u)
        sos = signal.butter(2, min(f, SR * 0.45), kind, fs=SR, output='sos')
        if zi is None: zi = np.zeros((sos.shape[0], 2)) if x.ndim == 1 else np.zeros((sos.shape[0], x.shape[0], 2))
        seg = x[..., b * block:(b + 1) * block]
        if x.ndim == 1: out, zi = signal.sosfilt(sos, seg, zi=zi)
        else:
            out = np.zeros_like(seg)
            for c in range(x.shape[0]):
                o, z = signal.sosfilt(sos, seg[c], zi=zi[:, c, :]); out[c] = o; zi[:, c, :] = z
        y[..., b * block:(b + 1) * block] = out
    return y

M = buf(); D = buf(); FX = buf(); REV = buf(); DLY = buf()

# ---------------- hangszerek ----------------
def kick(gain=1.0, punch=1.0):
    n = int(0.42 * SR); t = np.arange(n) / SR
    f = 46 + 110 * np.exp(-t * 28) * punch + 40 * np.exp(-t * 120)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7.5) * (1 - np.exp(-t * 900))
    click = hp(rng.standard_normal(n) * np.exp(-t * 400), 3000) * 0.35
    return np.tanh((body + click) * 1.8) * 0.9 * gain
def clap():
    n = int(0.35 * SR); t = np.arange(n) / SR; x = np.zeros(n); nz = rng.standard_normal(n)
    for k, dt in enumerate([0, 0.011, 0.022, 0.031]):
        i = int(dt * SR); m = np.zeros(n); m[i:] = np.exp(-(t[: n - i]) * (160 if k < 3 else 22)); x += nz * m
    return bp(x, 900, 5200) * 0.55 + np.sin(2 * np.pi * 190 * t) * np.exp(-t * 40) * 0.25
def snare():
    n = int(0.3 * SR); t = np.arange(n) / SR
    body = np.sin(2 * np.pi * np.cumsum(180 + 60 * np.exp(-t * 40)) / SR) * np.exp(-t * 22)
    nz = bp(rng.standard_normal(n), 1500, 9000) * np.exp(-t * 16)
    return np.tanh((body * 0.6 + nz * 0.7) * 1.4) * 0.6
def hat(open_=False):
    n = int((0.22 if open_ else 0.05) * SR); t = np.arange(n) / SR
    return hp(rng.standard_normal(n), 7500, 3) * np.exp(-t * (14 if open_ else 90)) * (0.22 if open_ else 0.16)
def perc_tick():
    n = int(0.06 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 1800 * t) * np.exp(-t * 90) * 0.12 + bp(rng.standard_normal(n), 2500, 7000) * np.exp(-t * 120) * 0.08)
def supersaw(notes, dur, cutoff=3800, voices=7, det=0.22, attack=0.01, release=0.25, gain=0.12):
    n = int((dur + release) * SR); out = np.zeros((2, n))
    for m in notes:
        f = note_hz(m)
        for v in range(voices):
            d = (v - (voices - 1) / 2) / ((voices - 1) / 2) * det
            ff = f * 2 ** (d / 12); pan = (v - (voices - 1) / 2) / ((voices - 1) / 2) * 0.8
            s = saw(ff, n, rng.random())
            out[0] += s * np.cos((pan + 1) * np.pi / 4); out[1] += s * np.sin((pan + 1) * np.pi / 4)
    out = lp(out, cutoff, 2)
    e = env_adsr(n, attack, 0.2, 0.75, release, dur - attack - 0.2)
    return out * e * gain / np.sqrt(voices * len(notes))
def pluck(m, dur=0.22, cutoff=5200, gain=0.16):
    n = int(dur * SR); t = np.arange(n) / SR; f = note_hz(m)
    x = (saw(f, n) * 0.6 + np.sign(np.sin(2 * np.pi * f * 1.003 * t)) * 0.4)
    x = sweep_filter(x, cutoff, 380, 'low', block=256)
    return x * np.exp(-t * 11) * gain
def bell(m, dur=0.6, gain=0.1):
    n = int(dur * SR); t = np.arange(n) / SR; f = note_hz(m)
    x = np.sin(2 * np.pi * f * t + 2.2 * np.sin(2 * np.pi * f * 3.5 * t) * np.exp(-t * 6))
    return x * np.exp(-t * 5) * gain
def bass(m, dur, gain=0.32, cutoff=520):
    n = int(dur * SR); t = np.arange(n) / SR; f = note_hz(m)
    x = np.sin(2 * np.pi * f * t) * 0.8 + lp(saw(f, n), cutoff) * 0.55
    x = np.tanh(x * 1.6)
    e = np.minimum(1, t / 0.004) * np.exp(-t * 2.5) * np.minimum(1, (dur - t) / 0.02).clip(0)
    return x * e * gain
def sub808(m, dur, gain=0.36):
    n = int(dur * SR); t = np.arange(n) / SR; f = note_hz(m)
    ff = f * (1 + 0.6 * np.exp(-t * 30))
    x = np.tanh(np.sin(2 * np.pi * np.cumsum(ff) / SR) * 2.2) * np.exp(-t * 1.2) * np.minimum(1, (dur - t) / 0.03).clip(0)
    return x * gain
def pad(notes, dur, gain=0.09, cutoff=1600):
    n = int(dur * SR); out = np.zeros((2, n))
    for m in notes:
        for v in range(4):
            ff = note_hz(m) * 2 ** ((v - 1.5) * 0.09 / 12); pan = (v - 1.5) / 1.5 * 0.9
            s = saw(ff, n, rng.random())
            out[0] += s * np.cos((pan + 1) * np.pi / 4); out[1] += s * np.sin((pan + 1) * np.pi / 4)
    out = lp(out, cutoff, 2)
    e = env_adsr(n, 0.6, 0.3, 0.85, 0.8, dur - 1.7)
    return out * e * gain / np.sqrt(4 * len(notes))
def riser(dur, f0=300, f1=9000, gain=0.25):
    n = int(dur * SR); t = np.arange(n) / SR
    x = sweep_filter(rng.standard_normal((2, n)), f0, f1, 'low', block=512, curve=1.0)
    ramp = (t / dur) ** 2.2
    ph = 2 * np.pi * np.cumsum(110 * 2 ** (3 * (t / dur) ** 2)) / SR
    tone = np.sin(ph) * 0.18 + np.sign(np.sin(ph * 1.01)) * 0.06
    return (x * 0.5 + tone) * ramp * gain
def downlifter(dur=1.6, gain=0.22):
    n = int(dur * SR); t = np.arange(n) / SR
    return sweep_filter(rng.standard_normal((2, n)), 9000, 200, 'low', block=512, curve=1.0) * np.exp(-t * 2.2) * gain
def impact(gain=1.0, size=1.0):
    n = int(2.8 * SR); t = np.arange(n) / SR
    boom = np.sin(2 * np.pi * np.cumsum(34 + 70 * np.exp(-t * 9)) / SR) * np.exp(-t * 1.6 / size)
    crack = bp(rng.standard_normal(n), 300, 6000) * np.exp(-t * 18)
    return np.tanh((boom * 1.2 + crack * 0.5) * 1.5) * gain
def whoosh(dur=0.45, up=True, gain=0.22):
    n = int(dur * SR); t = np.arange(n) / SR
    x = sweep_filter(rng.standard_normal((2, n)), 500 if up else 6000, 6000 if up else 500, 'low', block=256, curve=1.0)
    return x * np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.5 * gain
def thwack(gain=0.6):
    n = int(0.5 * SR); t = np.arange(n) / SR
    tom = np.sin(2 * np.pi * np.cumsum(60 + 90 * np.exp(-t * 30)) / SR) * np.exp(-t * 9)
    nz = bp(rng.standard_normal(n), 600, 7000) * np.exp(-t * 35)
    return np.tanh((tom + nz * 0.8) * 1.6) * gain

# ---------------- hangeffektek ----------------
def hammer(kind='drive', s=1.0):
    n = int(1.2 * SR); t = np.arange(n) / SR
    heavy = {'tamp': 0.45, 'drive': 0.85, 'expel': 1.05, 'drop': 1.3, 'base': 0.9, 'shaft': 0.75, 'demo': 0.9}.get(kind, 0.9)
    thud = np.sin(2 * np.pi * np.cumsum(58 + 120 * np.exp(-t * 25)) / SR) * np.exp(-t * (9 / heavy))
    parts = [(182, 0.9, 4.5), (493, 0.7, 6), (318, 0.8, 9), (847, 0.55, 12), (1394, 0.45, 15), (2213, 0.3, 20), (3170, 0.2, 26)]
    det = 1 + (rng.random() - 0.5) * 0.04
    clank = sum(a * np.sin(2 * np.pi * fr * det * t + rng.random() * 6) * np.exp(-t * d) for fr, a, d in parts)
    crunch = bp(rng.standard_normal(n), 150, 2200) * np.exp(-t * 26)
    x = thud + clank * 0.26 * (0.7 + 0.3 * heavy) + crunch * 0.5 * heavy
    return np.tanh(x * (1.3 + 0.5 * heavy)) * (0.55 + 0.35 * heavy) * (0.75 + 0.25 * s)
def bigdrop(s=1.0):
    # dinamikus tömörítés: hatalmas, tompa becsapódás + föld-dübörgés + utórengés
    n = int(3.5 * SR); t = np.arange(n) / SR
    boom = np.sin(2 * np.pi * np.cumsum(28 + 60 * np.exp(-t * 7)) / SR) * np.exp(-t * 1.3)
    thud = np.sin(2 * np.pi * np.cumsum(70 + 140 * np.exp(-t * 20)) / SR) * np.exp(-t * 6)
    dirt = lp(rng.standard_normal(n), 900) * np.exp(-t * 3.5)
    debris = np.zeros(n)
    for k in range(60):
        i = int((0.05 + rng.random() * 1.6) * SR); L = 1500
        if i + L < n: debris[i:i + L] += bp(rng.standard_normal(L), 800, 5000) * np.exp(-np.arange(L) / (0.004 * SR)) * rng.random()
    x = boom * 1.2 + thud * 0.8 + dirt * 0.6 + debris * 0.25
    return np.tanh(x * 1.5) * 0.95 * s
def fallwhistle(dur):
    n = int(dur * SR); t = np.arange(n) / SR
    air = sweep_filter(rng.standard_normal(n), 300, 3000, 'band' if False else 'low', block=512, curve=1.0)
    return air * (t / dur) ** 2 * 0.25
def pour(dur=0.9, gain=1.0):
    n = int(dur * SR); t = np.arange(n) / SR
    x = bp(rng.standard_normal(n), 250, 3500) * (np.minimum(1, t / 0.05) * np.exp(-t * 3.0 / max(dur, 0.3) * 0.9))
    grains = np.zeros(n)
    for k in range(int(45 * dur)):
        i = int(rng.random() * n * 0.85); L = int(0.008 * SR)
        if i + L < n: grains[i:i + L] += np.sin(2 * np.pi * (900 + rng.random() * 2500) * np.arange(L) / SR) * np.exp(-np.arange(L) / (0.002 * SR)) * (0.5 + rng.random())
    return (x * 0.35 + grains * 0.12) * gain
def strain(dur):
    n = int(dur * SR); t = np.arange(n) / SR
    hyd = lp(saw(70, n) + saw(71.3, n), 400) * 0.25
    creak = np.sin(2 * np.pi * np.cumsum(620 + 120 * np.sin(t * 9) - 200 * t / dur) / SR) * 0.06
    return (hyd + creak) * np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 0.6
def rattle(dur=1.5, dens=30, gain=0.12):
    n = int(dur * SR); x = np.zeros(n)
    for k in range(int(dens * dur)):
        i = int(rng.random() * max(1, n - 4000)); L = 3000; tt = np.arange(L) / SR
        if i + L < n: x[i:i + L] += np.sin(2 * np.pi * (1200 + rng.random() * 3000) * tt) * np.exp(-tt * 60) * (0.3 + rng.random())
    return x * gain
def vibro(dur, f=30, gain=0.3):
    # mélyvibrátor / vibrohenger: erős, lüktető rezgés
    n = int(dur * SR); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * f * t) * (0.7 + 0.3 * np.sin(2 * np.pi * 7 * t)) + 0.4 * lp(saw(f * 2, n), 300) + 0.15 * bp(rng.standard_normal(n), 100, 900)
    e = np.minimum(1, t / 0.25) * np.minimum(1, (dur - t) / 0.3).clip(0)
    return np.tanh(x * 1.4) * e * gain
def engine(dur, f=42, gain=0.18):
    n = int(dur * SR); t = np.arange(n) / SR
    x = lp(saw(f, n) + saw(f * 1.5, n) * 0.5, 600) + 0.2 * bp(rng.standard_normal(n), 200, 1500)
    e = np.minimum(1, t / 0.4) * np.minimum(1, (dur - t) / 0.4).clip(0)
    return x * e * gain
def hydraulic(dur, gain=0.15):
    n = int(dur * SR); t = np.arange(n) / SR
    f = 380 + 160 * np.sin(np.pi * np.clip(t / dur, 0, 1))
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.5 + lp(saw(90, n), 500) * 0.3
    return x * np.sin(np.pi * np.clip(t / dur, 0, 1)) * gain
def water(dur, gain=0.2):
    n = int(dur * SR); t = np.arange(n) / SR
    x = bp(rng.standard_normal((2, n)), 800, 9000) * (0.7 + 0.3 * np.sin(2 * np.pi * 3.3 * t))
    gurgle = np.zeros(n)
    for k in range(int(30 * dur)):
        i = int(rng.random() * max(1, n - 5000)); L = 4000; tt = np.arange(L) / SR
        if i + L < n: gurgle[i:i + L] += np.sin(2 * np.pi * np.cumsum(300 + 500 * tt / 0.08) / SR) * np.exp(-tt * 40) * rng.random()
    e = np.minimum(1, t / 0.15) * np.minimum(1, (dur - t) / 0.2).clip(0)
    return (x * 0.5 + gurgle * 0.25) * e * gain
def drill(dur, gain=0.18):
    n = int(dur * SR); t = np.arange(n) / SR
    x = lp(saw(55, n), 900) * 0.6 + bp(rng.standard_normal(n), 400, 3000) * (0.6 + 0.4 * np.sin(2 * np.pi * 11 * t)) * 0.5
    e = np.minimum(1, t / 0.2) * np.minimum(1, (dur - t) / 0.2).clip(0)
    return x * e * gain
def pump(dur, gain=0.16):
    n = int(dur * SR); t = np.arange(n) / SR
    beat = (np.sin(2 * np.pi * 2.6 * t) > 0.6).astype(float)
    x = lp(saw(48, n), 300) * 0.5 + bp(rng.standard_normal(n), 300, 1800) * beat * 0.5
    e = np.minimum(1, t / 0.2) * np.minimum(1, (dur - t) / 0.2).clip(0)
    return x * e * gain
def foam(dur, gain=0.2):
    n = int(dur * SR); t = np.arange(n) / SR
    hiss = bp(rng.standard_normal((2, n)), 2000, 11000) * 0.3
    pops = np.zeros(n)
    for k in range(int(120 * dur)):
        i = int(rng.random() * max(1, n - 800)); L = 700; tt = np.arange(L) / SR
        if i + L < n: pops[i:i + L] += np.sin(2 * np.pi * (1500 + rng.random() * 4000) * tt) * np.exp(-tt * 300) * rng.random()
    e = np.minimum(1, t / 0.2) * np.minimum(1, (dur - t) / 0.3).clip(0)
    return (hiss + pops * 0.25) * e * gain
def dumpload(dur=1.8, gain=0.5):
    n = int(dur * SR); t = np.arange(n) / SR
    rumble = lp(rng.standard_normal(n), 400) * np.exp(-t * 1.5)
    stones = rattle(dur, 80, 0.14)[:n]
    return (rumble * 0.6 + stones) * gain
def blip(gain=0.2):
    n = int(0.12 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * np.cumsum(900 + 600 * t / 0.12) / SR) * np.exp(-t * 30) * gain

SFX = {
    'hammer': lambda e: (hammer(e.get('kind', 'drive'), e.get('s', 1)), e.get('g', 0.75)),
    'bigdrop': lambda e: (bigdrop(e.get('s', 1)), e.get('g', 1.0)),
    'whistle': lambda e: (fallwhistle(e.get('dur', 1.0)), e.get('g', 0.6)),
    'pour': lambda e: (pour(e.get('dur', 0.9)), e.get('g', 0.8)),
    'strain': lambda e: (strain(e.get('dur', 0.8)), e.get('g', 0.7)),
    'rattle': lambda e: (rattle(e.get('dur', 1.5), e.get('dens', 30), 0.12), e.get('g', 1.0)),
    'vibro': lambda e: (vibro(e.get('dur', 2.0), e.get('f', 30)), e.get('g', 0.6)),
    'engine': lambda e: (engine(e.get('dur', 2.0), e.get('f', 42)), e.get('g', 0.5)),
    'hydraulic': lambda e: (hydraulic(e.get('dur', 1.0)), e.get('g', 0.7)),
    'water': lambda e: (water(e.get('dur', 1.5)), e.get('g', 0.6)),
    'drill': lambda e: (drill(e.get('dur', 1.5)), e.get('g', 0.7)),
    'pump': lambda e: (pump(e.get('dur', 1.5)), e.get('g', 0.7)),
    'foam': lambda e: (foam(e.get('dur', 1.5)), e.get('g', 0.7)),
    'dump': lambda e: (dumpload(e.get('dur', 1.8)), e.get('g', 0.6)),
    'impact': lambda e: (impact(1.0, e.get('size', 1.2)), e.get('g', 0.8)),
    'thwack': lambda e: (thwack(0.45), e.get('g', 1.0)),
    'blip': lambda e: (blip(), e.get('g', 1.0)),
    'whoosh': lambda e: (whoosh(0.42, True, 0.16), e.get('g', 1.0)),
}

# ---------------- hangszerelés ----------------
KEY = CF.get('key', 57)
PROG = [[KEY + i for i in ch] for ch in CF.get('prog', [[0, 3, 7], [-4, 0, 3], [3, 7, 10], [-2, 2, 5]])]
ROOT = [KEY - 12 + r for r in CF.get('roots', [0, -4, 3, -2])]
SECT = CF['sections']; STYLE = CF.get('drums', 'house')
NBARS = max(s[1] for s in SECT)
def section(bar):
    for b0, b1, nm in SECT:
        if b0 <= bar < b1: return nm
    return 'none'
def chord(bar): return PROG[bar % len(PROG)]
def root(bar): return ROOT[bar % len(ROOT)]
LEADS = CF.get('lead') or [[(0, 7, 0.5), (0.75, 5, 0.25), (1.0, 3, 0.5), (1.5, 5, 0.5), (2.5, 7, 0.75), (3.25, 10, 0.25)], [(0, 12, 0.5), (0.75, 10, 0.25), (1.0, 7, 0.75), (2.0, 5, 0.5), (2.5, 3, 0.5), (3.0, 2, 0.5)]]

kicks = []
def drums(bar, sec, t0):
    full = sec in ('title', 'grooveA', 'drive', 'drop', 'grooveB', 'grooveA2')
    if full and STYLE == 'house':
        for k in range(4): kicks.append(t0 + k * BEAT); place(D, kick(0.95), t0 + k * BEAT)
        for k in (1, 3): place(D, clap(), t0 + k * BEAT, 0.55, 0.05); place(REV, clap(), t0 + k * BEAT, 0.12)
        for k in range(4): place(D, hat(True), t0 + (k + 0.5) * BEAT, 0.85, 0.25)
        if sec in ('drive', 'drop', 'grooveB'):
            for k in range(16):
                if k % 2: place(D, hat(False), t0 + k * BEAT / 4, 0.9 if k % 4 == 3 else 0.6, -0.3)
    elif full and STYLE == 'breaks':
        for k in (0, 1.5, 2.75): kicks.append(t0 + k * BEAT); place(D, kick(0.95, 1.1), t0 + k * BEAT)
        for k in (1, 3): place(D, snare(), t0 + k * BEAT, 0.7, 0.05); place(REV, snare(), t0 + k * BEAT, 0.15)
        for k in range(16): place(D, hat(k % 4 == 2), t0 + k * BEAT / 4, (0.8 if k % 2 else 0.5), -0.25)
    elif full and STYLE == 'halftime':
        for k in (0, 1.75, 2.5): kicks.append(t0 + k * BEAT); place(D, kick(1.0, 1.2), t0 + k * BEAT)
        place(D, clap(), t0 + 2 * BEAT, 0.7); place(D, snare(), t0 + 2 * BEAT, 0.45); place(REV, clap(), t0 + 2 * BEAT, 0.3)
        for k in range(8): place(D, hat(False), t0 + k * BEAT / 2, 0.7, 0.3)
        if sec in ('drop', 'drive'):
            for k in range(6): place(D, hat(False), t0 + 3 * BEAT + k * BEAT / 6, 0.5, -0.3)  # trap-pergés
    elif sec in ('reveal', 'half'):
        for k in (0, 2.5): kicks.append(t0 + k * BEAT); place(D, kick(1.0, 1.2), t0 + k * BEAT)
        place(D, clap(), t0 + 2 * BEAT, 0.6); place(REV, clap(), t0 + 2 * BEAT, 0.3)
        for k in range(8): place(D, hat(False), t0 + k * BEAT / 2, 0.6, 0.3)
    elif sec == 'intro':
        for k in (0, 2): place(D, lp(kick(0.7, 0.6), 300), t0 + k * BEAT, 0.8)
    elif sec == 'break':
        place(D, lp(kick(0.8), 250), t0, 0.7)
    elif sec == 'build':
        steps = 8 if (bar % 2 == 0) else 16
        for k in range(steps): place(D, clap(), t0 + k * BAR / steps, (0.25 + 0.5 * k / steps) * 0.6)
        for k in range(4): kicks.append(t0 + k * BEAT); place(D, kick(0.7), t0 + k * BEAT, 0.6)
    elif sec == 'outro':
        pass

for bar in range(NBARS):
    sec = section(bar); t0 = tb(bar)
    drums(bar, sec, t0)
    r = root(bar); c = chord(bar)
    # basszus
    if sec in ('title', 'grooveA', 'drive', 'grooveB', 'grooveA2'):
        if STYLE == 'halftime':
            place(M, sub808(r, BAR * 0.9), t0, 1.0)
        else:
            for k in range(4): place(M, bass(r, BEAT * 0.45), t0 + (k + 0.5) * BEAT, 1.0)
            if sec in ('drive', 'grooveB'):
                for k in (3, 7, 11, 15): place(M, bass(r + 12, BEAT * 0.2, 0.18), t0 + k * BEAT / 4, 1.0)
    elif sec == 'drop':
        if STYLE == 'halftime':
            place(M, sub808(r, BEAT * 1.7, 0.4), t0, 1.0); place(M, sub808(r, BEAT * 1.4, 0.36), t0 + 2.5 * BEAT, 1.0)
        else:
            for k in range(16):
                if k % 4 != 0: place(M, bass(r if k % 4 != 3 else r + 12, BEAT * 0.22, 0.3, 900), t0 + k * BEAT / 4, 1.0)
    elif sec in ('reveal', 'half'):
        place(M, bass(r, BAR * 0.95, 0.3, 380), t0, 1.0)
    elif sec in ('intro', 'break', 'build'):
        place(M, bass(r - 12 if r > 40 else r, BAR * 0.98, 0.2, 200), t0, 1.0)
    # akkordok
    up = [n + 12 for n in c]
    if sec == 'intro':
        place(M, pad(up, BAR * 1.02, 0.11, 900 + 250 * (bar % 4)), t0, 1.0); place(REV, pad(up, BAR, 0.05, 1200), t0, 1.0)
    elif sec in ('title', 'grooveA', 'grooveA2'):
        for k in ((0, 1.5, 2.5) if STYLE != 'breaks' else (0, 0.75, 2.0, 3.5)):
            x = supersaw(up, BEAT * 0.4, 3200, gain=0.11, release=0.12); place(M, x, t0 + k * BEAT, 1.0); place(REV, x, t0 + k * BEAT, 0.25)
    elif sec in ('drive', 'grooveB'):
        x = supersaw(up, BAR * 0.95, 2400, gain=0.08, attack=0.03); place(M, x, t0, 1.0); place(REV, x, t0, 0.2)
    elif sec in ('break', 'build'):
        x = pad(up + [c[0] + 24], BAR * 1.02, 0.17, 1600 if sec == 'break' else 2600); place(M, x, t0, 1.0); place(REV, x, t0, 0.4)
        if sec == 'break':
            for k in range(8): place(M, bass(r + 12, BEAT * 0.3, 0.14, 700), t0 + k * BEAT / 2, 1.0)
    elif sec == 'drop':
        for k in ((0, 0.75, 1.5, 2.5, 3.25) if STYLE != 'halftime' else (0, 1.5, 3.0)):
            x = supersaw(up + [c[0] + 24], BEAT * (0.5 if STYLE != 'halftime' else 0.9), 5200, gain=0.14, release=0.15); place(M, x, t0 + k * BEAT, 1.0); place(REV, x, t0 + k * BEAT, 0.2)
    elif sec in ('half', 'reveal'):
        x = supersaw(up + [c[0] + 24], BAR * 0.98, 2800 if sec == 'half' else 4200, gain=0.12, attack=0.08, release=0.6); place(M, x, t0, 1.0); place(REV, x, t0, 0.45)
    elif sec == 'outro' and bar == SECT[-1][0]:
        x = supersaw([n + 12 for n in PROG[0]] + [PROG[0][0] + 24, PROG[0][2] + 24], BAR * 2.2, 3600, gain=0.14, attack=0.02, release=1.8); place(M, x, t0, 1.0); place(REV, x, t0, 0.6)
    # arpeggio
    if sec in ('grooveA', 'drive', 'build', 'grooveB', 'grooveA2', 'half', 'break'):
        pat = CF.get('arp', [0, 1, 2, 1, 0, 2, 1, 2])
        notes = [n + 24 for n in c]
        step = BEAT / 2 if sec in ('grooveA', 'half', 'break', 'grooveA2') else BEAT / 4
        for k in range(int(BAR / step)):
            m = notes[pat[k % len(pat)] % 3] + (12 if (k % 8 == 6 and sec in ('drive', 'grooveB')) else 0)
            x = (pluck(m, 0.22, 4200 if sec != 'break' else 2200, 0.12 if sec != 'half' else 0.1) if CF.get('arpInst', 'pluck') == 'pluck' else bell(m, 0.5, 0.09))
            pan = -0.35 if k % 2 else 0.35
            place(M, x, t0 + k * step, 1.0, pan); place(DLY, x, t0 + k * step, 0.35, pan)
    # dallam a dropban
    if sec == 'drop':
        motif = LEADS[bar % 2]
        for (k, deg, d) in motif:
            m = KEY + 12 + deg
            x = supersaw([m], d * BEAT, 6500, voices=5, det=0.12, gain=0.16, attack=0.005, release=0.1)
            place(M, x, t0 + k * BEAT, 1.0); place(DLY, x, t0 + k * BEAT, 0.25); place(REV, x, t0 + k * BEAT, 0.2)

# ---- átvezetések ----
TR = CF.get('transitions', {})
for b, L in TR.get('risers', []): place(FX, riser(BAR * L, 300, 8000, 0.2), tb(b), 1.0)
for b in TR.get('impacts', []): place(FX, impact(1.0, 1.5), tb(b), 0.9); place(REV, impact(0.5), tb(b), 0.4)
for b in TR.get('downs', []): place(FX, downlifter(2.0), tb(b, 0.1), 0.8)
# ---- vágások, feliratok, lépések ----
for i, t in enumerate(EV.get('cuts', [])):
    if any(abs(t - tb(b)) < 0.05 for b in TR.get('impacts', [])): continue
    place(FX, whoosh(0.42, True, 0.16), t - 0.36, 1.0, -0.4 if i % 2 else 0.4)
for sl in EV.get('slams', []):
    if sl['kind'] in ('word', 'stat'): place(FX, thwack(0.45 if sl['kind'] == 'word' else 0.3), sl['t'], 1.0); place(REV, thwack(0.3), sl['t'], 0.4)
for t in EV.get('steps', []): place(FX, perc_tick() * 2.2, t, 1.0, 0.5)
# ---- folyamathangok ----
for e in EV.get('sfx', []):
    f = SFX.get(e['type'])
    if not f: continue
    x, g = f(e)
    place(FX, x, e['t'], g, e.get('pan', 0.0)); place(REV, x, e['t'], e.get('rev', 0.15))

# ---------------- keverés ----------------
sc = np.ones(N, np.float32)
for t in kicks:
    i = S(t); L = int(0.22 * SR)
    if i >= N: continue
    e = 1 - 0.62 * np.exp(-np.arange(L) / SR * 14); j = min(N, i + L); sc[i:j] = np.minimum(sc[i:j], e[: j - i])
M *= sc
d = int(BEAT * 0.75 * SR); dl = np.zeros_like(DLY); src = lp(hp(DLY, 300), 5000)
for k in range(1, 6):
    sh = d * k
    if sh >= N: break
    g = 0.45 ** (k - 1) * 0.5; ch = k % 2
    dl[ch, sh:] += src[0, :N - sh] * g; dl[1 - ch, sh:] += src[1, :N - sh] * g * 0.6
M += dl * sc
L = int(2.4 * SR); tt = np.arange(L) / SR
ir = rng.standard_normal((2, L)) * np.exp(-tt * 2.6); ir = lp(ir, 6000); ir[:, :int(0.012 * SR)] = 0
ir /= np.sqrt((ir ** 2).sum(axis=1, keepdims=True))
wet = np.vstack([signal.fftconvolve(hp(REV[c], 200), ir[c])[:N] for c in range(2)]) * 0.55
mix = D * 0.85 + M * 1.3 * CF.get('musicGain', 1.0) + FX * CF.get('fxGain', 1.0) + wet
fade = np.ones(N); i0 = S(EV['total'] - 1.4); fade[i0:] = np.linspace(1, 0, N - i0) ** 1.5; mix *= fade
mix = hp(mix, 28)
mix = mix + hp(mix, 2200) * 0.45 - lp(mix, 55) * 0.25
mix /= np.max(np.abs(mix))
rms = np.sqrt(np.mean(mix ** 2)); mix *= 10 ** (-12.5 / 20) / rms
mix = np.tanh(mix * 1.15) / np.tanh(1.15)
mix *= 10 ** (-1.0 / 20) / max(1e-9, np.max(np.abs(mix)))
wavfile.write(OUT, SR, (mix.T * 32767).astype(np.int16))
print('ok', round(TOTAL, 2), 's', 'rms dB', round(20 * np.log10(np.sqrt(np.mean(mix ** 2))), 1))

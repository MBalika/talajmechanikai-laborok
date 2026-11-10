# Új hangszerek a műfaj-alapú zenemotorhoz (music2.py)
import numpy as np
from scipy import signal
import synthlib as L
from synthlib import SR, note_hz, lp, hp, bp, saw, sweep_filter, env_adsr

def R(): return L.rng
def tt(n): return np.arange(n) / SR
def nz(n): return R().standard_normal(n)
def ar(n, a=0.005, r=0.02, dur=None):
    t = tt(n); e = np.minimum(1, t / max(a, 1e-4))
    if dur is not None: e = e * np.clip((dur + r - t) / r, 0, 1)
    return e
def stereo(x, pan=0.0):
    l = np.cos((pan + 1) * np.pi / 4); r = np.sin((pan + 1) * np.pi / 4)
    return np.vstack([x * l * 1.414, x * r * 1.414])
def phase(fr):  # fázis (ciklusban) változó frekvenciából
    return np.cumsum(fr) / SR
def saw_ph(ph): return 2 * (ph % 1.0) - 1
def sq_ph(ph, duty=0.5): return np.where((ph % 1.0) < duty, 1.0, -1.0)
def tri_ph(ph): return 2 * np.abs(2 * (ph % 1.0) - 1) - 1

# --- rezonáns szűrő (RBJ biquad, blokkonként változó vágás) ---
def _rbj(f, q, kind='low'):
    f = min(max(f, 20), SR * 0.45); w0 = 2 * np.pi * f / SR; al = np.sin(w0) / (2 * q); c = np.cos(w0)
    if kind == 'low': b = [(1 - c) / 2, 1 - c, (1 - c) / 2]
    elif kind == 'band': b = [al, 0, -al]
    else: b = [(1 + c) / 2, -(1 + c), (1 + c) / 2]
    a0 = 1 + al
    return np.array([[b[0] / a0, b[1] / a0, b[2] / a0, 1, -2 * c / a0, (1 - al) / a0]])
def resf(x, fc, q=4.0, kind='low', block=64):
    """fc: hívható u∈[0,1] → Hz, vagy tömb mintánként"""
    n = len(x); y = np.zeros(n); zi = np.zeros((1, 2)); nb = (n + block - 1) // block
    if np.isscalar(fc): return signal.sosfilt(_rbj(float(fc), q, kind), x)
    for b in range(nb):
        i0 = b * block; f = fc[min(n - 1, i0)] if isinstance(fc, np.ndarray) else fc(i0 / max(1, n - 1))
        y[i0:i0 + block], zi = signal.sosfilt(_rbj(f, q, kind), x[i0:i0 + block], zi=zi)
    return y

# ================= DOBOK =================
def kick_deep(gain=1.0):
    n = int(0.5 * SR); t = tt(n); f = 42 + 70 * np.exp(-t * 22)
    return np.tanh(np.sin(2 * np.pi * phase(f)) * np.exp(-t * 5.5) * 1.4) * 0.85 * gain * (1 - np.exp(-t * 600))
def kick_techno(gain=1.0):
    n = int(0.45 * SR); t = tt(n); f = 48 + 160 * np.exp(-t * 35)
    body = np.sin(2 * np.pi * phase(f)) * np.exp(-t * 7)
    click = hp(nz(n) * np.exp(-t * 500), 2500) * 0.4
    return np.tanh((body + click) * 2.4) * 0.85 * gain
def kick808(gain=1.0, dec=2.2, f0=48):
    n = int(1.1 * SR); t = tt(n); f = f0 + 120 * np.exp(-t * 40)
    return np.tanh(np.sin(2 * np.pi * phase(f)) * np.exp(-t * dec) * 2.0) * 0.9 * gain
def kick_chip(gain=1.0):
    n = int(0.16 * SR); t = tt(n); f = 50 + 260 * np.exp(-t * 45)
    return sq_ph(phase(f)) * np.exp(-t * 18) * 0.5 * gain
def snare_gated(gain=1.0):
    n = int(0.42 * SR); t = tt(n)
    body = np.sin(2 * np.pi * phase(200 + 60 * np.exp(-t * 40))) * np.exp(-t * 20)
    tail = bp(nz(n), 900, 7000) * (t < 0.3) * (0.55 + 0.45 * np.exp(-t * 4)) * np.clip((0.31 - t) / 0.01, 0, 1)
    return np.tanh((body * 0.7 + tail * 0.8) * 1.5) * 0.55 * gain
def snare_chip(gain=1.0):
    n = int(0.14 * SR); t = tt(n); x = np.round(nz(n) * 3) / 3
    return x * np.exp(-t * 22) * 0.28 * gain
def hat_chip(gain=1.0):
    n = int(0.04 * SR); t = tt(n); return np.round(hp(nz(n), 6000) * 4) / 4 * np.exp(-t * 90) * 0.12 * gain
def snare_tight(gain=1.0):
    n = int(0.2 * SR); t = tt(n)
    body = np.sin(2 * np.pi * phase(240 + 90 * np.exp(-t * 60))) * np.exp(-t * 35)
    return np.tanh((body * 0.5 + bp(nz(n), 2500, 10000) * np.exp(-t * 28)) * 1.6) * 0.5 * gain
def rim(gain=1.0):
    n = int(0.05 * SR); t = tt(n)
    return (np.sin(2 * np.pi * 1700 * t) * 0.6 + bp(nz(n), 2000, 6000) * 0.6) * np.exp(-t * 120) * 0.35 * gain
def shaker(gain=1.0):
    n = int(0.08 * SR); t = tt(n); e = np.minimum(1, t / 0.02) * np.exp(-np.maximum(0, t - 0.02) * 60)
    return bp(nz(n), 4500, 12000) * e * 0.18 * gain
def tamb(gain=1.0):
    n = int(0.18 * SR); t = tt(n); x = hp(nz(n), 6500) * np.exp(-t * 25) * 0.15
    for f in (5300, 7100, 8900): x += np.sin(2 * np.pi * f * t) * np.exp(-t * 40) * 0.04
    return x * gain
def ride(gain=1.0):
    n = int(1.0 * SR); t = tt(n); x = np.zeros(n)
    for f in (305, 412, 535, 723, 891, 1127): x += sq_ph(f * 3.1 * t)
    return (hp(x, 5500) * 0.05 + hp(nz(n), 8000) * 0.03) * np.exp(-t * 3.5) * gain
def crash(gain=1.0):
    n = int(2.2 * SR); t = tt(n); x = np.zeros(n)
    for f in (340, 467, 591, 813, 1077): x += sq_ph(f * 2.7 * t)
    return (hp(x, 4000) * 0.04 + hp(nz(n), 3500) * 0.16) * np.exp(-t * 1.6) * gain
def conga(hi=True, gain=1.0):
    n = int(0.3 * SR); t = tt(n); f0 = 330 if hi else 210
    x = np.sin(2 * np.pi * phase(f0 * (1 + 0.15 * np.exp(-t * 40)))) * np.exp(-t * (14 if hi else 10))
    return (x + bp(nz(n), 1500, 5000) * np.exp(-t * 90) * 0.4) * 0.32 * gain
def bongo(hi=True, gain=1.0):
    n = int(0.15 * SR); t = tt(n); f0 = 620 if hi else 430
    return (np.sin(2 * np.pi * phase(f0 * (1 + 0.1 * np.exp(-t * 60)))) * np.exp(-t * 26) + bp(nz(n), 2500, 7000) * np.exp(-t * 150) * 0.3) * 0.25 * gain
def tom(f0=110, gain=1.0):
    n = int(0.5 * SR); t = tt(n)
    return np.tanh(np.sin(2 * np.pi * phase(f0 * (1 + 0.6 * np.exp(-t * 18)))) * np.exp(-t * 7) * 1.4 + bp(nz(n), 300, 3000) * np.exp(-t * 50) * 0.3) * 0.5 * gain
def hat808(open_=False, gain=1.0):
    n = int((0.3 if open_ else 0.06) * SR); t = tt(n); x = np.zeros(n)
    for f in (205.3, 304.4, 369.6, 522.7, 540, 800): x += sq_ph(f * t)
    return bp(x, 7000, 12000) * np.exp(-t * (11 if open_ else 70)) * 0.22 * gain
def cowbell808(gain=1.0):
    n = int(0.3 * SR); t = tt(n)
    x = sq_ph(540 * t) + sq_ph(800 * t)
    return bp(x, 500, 3000) * np.exp(-t * 14) * 0.18 * gain
def vinyl(dur):
    n = int(dur * SR); x = lp(hp(nz(n), 1500), 6000) * 0.012
    k = (R().random(n) < 18 / SR).astype(float); x += lp(k * R().standard_normal(n), 5000) * 0.25
    return x
def reverse_cym(dur=1.6, gain=0.25):
    x = crash(1.0)[:int(dur * SR)][::-1].copy(); return x * gain

# ================= BASSZUSOK =================
def acid(m, dur, acc=0.0, cut=0.5, res=7.0, slide_from=None, wave='saw', gain=0.22):
    n = int((dur + 0.015) * SR); t = tt(n); f = np.full(n, note_hz(m))
    if slide_from is not None:
        f0 = note_hz(slide_from); k = np.minimum(1, t / 0.06); f = f0 * (f / f0) ** k
    ph = phase(f); osc = saw_ph(ph) if wave == 'saw' else sq_ph(ph) * 0.8
    fc = 180 + (cut * 2600 + acc * 2600) * np.exp(-t * (9 - 4 * acc)) + cut * 300
    y = resf(osc, fc, q=res * (1 + 0.6 * acc))
    amp = np.exp(-t * (2.2 if slide_from is None else 0.8)) * np.clip((dur - t) / 0.006, 0, 1) * np.minimum(1, t / 0.002)
    return np.tanh(y * amp * (2.2 + 2.0 * acc)) * gain
def sub(m, dur, gain=0.32, glide_from=None):
    n = int(dur * SR); t = tt(n); f = np.full(n, note_hz(m))
    if glide_from is not None: f = note_hz(glide_from) * (f / note_hz(glide_from)) ** np.minimum(1, t / 0.08)
    x = np.sin(2 * np.pi * phase(f)) + 0.15 * np.sin(4 * np.pi * phase(f))
    return x * ar(n, 0.004, 0.03, dur - 0.03) * gain
def b808(m, dur, gain=0.38, glide_from=None, drive=2.4):
    n = int(dur * SR); t = tt(n); f = np.full(n, note_hz(m))
    if glide_from is not None: f = note_hz(glide_from) * (f / note_hz(glide_from)) ** np.minimum(1, t / 0.12)
    f = f * (1 + 0.5 * np.exp(-t * 35))
    x = np.tanh(np.sin(2 * np.pi * phase(f)) * drive) * np.exp(-t * 0.6) * np.clip((dur - t) / 0.04, 0, 1) * np.minimum(1, t / 0.003)
    return lp(x, 2500) * gain
def reese(m, dur, gain=0.2, cut0=380, cut1=900):
    n = int(dur * SR); t = tt(n); f = note_hz(m)
    x = saw(f * 1.006, n, R().random()) + saw(f * 0.994, n, R().random()) + saw(f * 1.0, n) * 0.6
    lfo = 0.5 + 0.5 * np.sin(2 * np.pi * 0.7 * t)
    y = resf(x, cut0 + (cut1 - cut0) * lfo, q=1.6)
    y = np.tanh(y * 1.8) + np.sin(2 * np.pi * f / 2 * t) * 0.6
    return y * ar(n, 0.01, 0.05, dur - 0.05) * gain
def wobble(m, dur, rate, gain=0.28, q=5.0, shape='sin'):
    """rate: wobble Hz (állandó) vagy tömb"""
    n = int(dur * SR); t = tt(n); f = note_hz(m)
    ph = phase(np.full(n, f)); osc = saw_ph(ph) + sq_ph(ph * 1.005) * 0.7 + np.sin(2 * np.pi * ph / 2) * 0.6
    lph = phase(np.full(n, rate)) if np.isscalar(rate) else phase(rate)
    lfo = 0.5 - 0.5 * np.cos(2 * np.pi * lph) if shape == 'sin' else 1 - (lph % 1.0)
    y = resf(osc, 120 + 3200 * lfo ** 2, q=q, block=48)
    y = np.tanh(y * 3.0) + np.sin(2 * np.pi * ph / 2) * 0.5
    return y * ar(n, 0.005, 0.03, dur - 0.03) * gain
def pluckbass(m, dur, gain=0.3, bright=1.0):
    n = int(dur * SR); t = tt(n); f = note_hz(m)
    x = saw(f, n) * 0.7 + np.sin(2 * np.pi * f * t) * 0.8
    y = resf(x, 150 + 2200 * bright * np.exp(-t * 18), q=2.5)
    return np.tanh(y * 1.5) * np.exp(-t * 3) * np.clip((dur - t) / 0.01, 0, 1) * gain
def tri_bass(m, dur, gain=0.3):
    n = int(dur * SR); x = np.round(tri_ph(note_hz(m) * tt(n)) * 7.5) / 7.5
    return x * ar(n, 0.002, 0.01, dur - 0.01) * gain

# ================= HARMÓNIA / DALLAM =================
def epiano(notes, dur, gain=0.11, vel=0.8):
    n = int((dur + 0.6) * SR); t = tt(n); out = np.zeros(n)
    for m in notes:
        f = note_hz(m); idx = 1.6 * vel * np.exp(-t * 3.2) + 0.25
        out += np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * f * t)) * np.exp(-t * 1.1) + np.sin(2 * np.pi * f * 15 * t) * np.exp(-t * 35) * 0.06 * vel
    out *= np.clip((dur + 0.5 - t) / 0.5, 0, 1) * np.minimum(1, t / 0.003)
    trem = 0.5 + 0.5 * np.sin(2 * np.pi * 4.2 * t)
    return np.vstack([out * (0.6 + 0.4 * trem), out * (1.0 - 0.4 * trem)]) * gain / np.sqrt(len(notes))
def stab(notes, dur, c0=5000, c1=500, gain=0.12, q=2.0):
    n = int((dur + 0.15) * SR); t = tt(n); x = np.zeros(n)
    for m in notes:
        for d in (-0.08, 0.0, 0.08): x += saw(note_hz(m) * 2 ** (d / 12), n, R().random())
    y = resf(x, c1 + (c0 - c1) * np.exp(-t * 14), q=q)
    return y * np.exp(-t * 5) * np.clip((dur + 0.1 - t) / 0.1, 0, 1) * gain / np.sqrt(3 * len(notes))
def clav(m, dur=0.16, gain=0.12):
    n = int(dur * SR); t = tt(n); ph = note_hz(m) * t
    x = sq_ph(ph, 0.25) * 0.6 + saw_ph(ph * 2) * 0.3
    return hp(resf(x, 900 + 4000 * np.exp(-t * 30), q=3), 300) * np.exp(-t * 14) * gain
def organ(notes, dur, gain=0.08):
    n = int(dur * SR); t = tt(n); x = np.zeros(n)
    for m in notes:
        f = note_hz(m)
        for h, a in ((0.5, 0.6), (1, 1), (2, 0.6), (3, 0.35), (4, 0.25)): x += np.sin(2 * np.pi * f * h * t) * a
        x += np.sin(2 * np.pi * f * 3 * t) * np.exp(-t * 12) * 0.5  # perkusszió
    return x * ar(n, 0.005, 0.03, dur - 0.03) * gain / len(notes)
def strings(notes, dur, gain=0.08, att=0.5):
    n = int((dur + 0.6) * SR); t = tt(n); out = np.zeros((2, n))
    for m in notes:
        for v in range(3):
            vib = 1 + 0.004 * np.sin(2 * np.pi * (5 + v * 0.3) * t + v)
            s = saw_ph(phase(note_hz(m) * 2 ** ((v - 1) * 0.07 / 12) * vib)); pan = (v - 1) * 0.7
            out += stereo(s, pan) / 1.414
    out = lp(out, 2600) * env_adsr(n, att, 0.2, 0.9, 0.6, dur - att - 0.2)
    return out * gain / np.sqrt(3 * len(notes))
def brass(notes, dur, gain=0.1):
    n = int((dur + 0.1) * SR); t = tt(n); x = np.zeros(n)
    for m in notes:
        for d in (-0.06, 0.06): x += saw_ph(phase(np.full(n, note_hz(m) * 2 ** (d / 12))))
    y = resf(x, 400 + 3000 * (1 - np.exp(-t * 12)) * np.exp(-t * 2), q=1.2)
    return np.tanh(y * 1.4) * ar(n, 0.02, 0.08, dur) * gain / np.sqrt(2 * len(notes))
def flute(m, dur, gain=0.12):
    n = int((dur + 0.08) * SR); t = tt(n); f = note_hz(m)
    vib = 1 + 0.006 * np.sin(2 * np.pi * 5.2 * t) * np.minimum(1, np.maximum(0, t - 0.15) / 0.2)
    ph = phase(f * vib)
    x = np.sin(2 * np.pi * ph) + 0.22 * np.sin(4 * np.pi * ph) + 0.08 * np.sin(6 * np.pi * ph)
    br = bp(nz(n), f * 1.5, min(f * 4, 15000)) * 0.12
    return (x + br) * ar(n, 0.05, 0.08, dur) * gain
def mallet(m, dur=0.5, gain=0.12, ratio=4.0):
    n = int(dur * SR); t = tt(n); f = note_hz(m)
    return np.sin(2 * np.pi * f * t + 1.4 * np.exp(-t * 18) * np.sin(2 * np.pi * f * ratio * t)) * np.exp(-t * 6) * gain
def ks_pluck(m, dur=0.6, gain=0.2, damp=0.996, bright=0.6):
    n = int(dur * SR); Lp = max(2, int(SR / note_hz(m)))
    burst = np.zeros(n); burst[:Lp] = lp(nz(Lp), 2000 + 6000 * bright)
    a = np.zeros(Lp + 2); a[0] = 1; a[Lp] = -0.5 * damp; a[Lp + 1] = -0.5 * damp
    return signal.lfilter([1.0], a, burst) * gain
def pulse_lead(m, dur, gain=0.1, duty=0.25, vib=True):
    n = int(dur * SR); t = tt(n); f = note_hz(m)
    v = 1 + (0.01 * np.sin(2 * np.pi * 6 * t) * np.minimum(1, np.maximum(0, t - 0.12) / 0.1) if vib else 0)
    return sq_ph(phase(f * v), duty) * ar(n, 0.002, 0.02, dur - 0.02) * gain
def chip_arp(notes, dur, gain=0.07, rate=0.045):
    n = int(dur * SR); t = tt(n); idx = (t / rate).astype(int) % len(notes)
    f = np.array([note_hz(notes[i]) for i in idx])
    return sq_ph(phase(f), 0.125) * ar(n, 0.002, 0.02, dur - 0.02) * gain
VOW = {'a': ((800, 1.0), (1150, 0.6), (2900, 0.25)), 'o': ((450, 1.0), (800, 0.6), (2830, 0.15)), 'e': ((400, 1.0), (1700, 0.5), (2600, 0.25)), 'i': ((300, 1.0), (2200, 0.4), (3000, 0.25)), 'u': ((330, 1.0), (700, 0.4), (2500, 0.1))}
def vox(m, dur, vowel='a', gain=0.16, vib=True, to=None):
    n = int((dur + 0.05) * SR); t = tt(n); f = note_hz(m)
    v = 1 + (0.008 * np.sin(2 * np.pi * 5.5 * t) * np.minimum(1, t / 0.3) if vib else 0)
    src = saw_ph(phase(f * v)) + nz(n) * 0.04
    y = np.zeros(n)
    for (F, a) in VOW[vowel]: y += bp(src, F * 0.88, F * 1.12) * a
    if to: y = y * (1 - t / dur).clip(0, 1) + sum(bp(src, F * 0.88, F * 1.12) * a for (F, a) in VOW[to]) * (t / dur).clip(0, 1)
    return y * ar(n, 0.01, 0.05, dur) * gain * 2.5
def choir(notes, dur, vowel='a', gain=0.07):
    n = int((dur + 0.6) * SR); out = np.zeros((2, n))
    for i, m in enumerate(notes):
        for v in range(2):
            x = vox(m + (0.06 if v else -0.06), dur, vowel, 1.0, True)
            x = np.pad(x, (0, max(0, n - len(x))))[:n]; out += stereo(x, (v - 0.5) * 1.2) / 1.414
    out *= env_adsr(n, 0.6, 0.2, 0.9, 0.6, dur - 0.8)
    return out * gain / np.sqrt(len(notes))
def futurechord(notes, dur, gain=0.12, pump_rate=None, beat=0.5, bend=True):
    n = int((dur + 0.1) * SR); t = tt(n); out = np.zeros((2, n))
    pb = (1 - 0.06 * np.exp(-t * 18)) if bend else 1.0
    for m in notes:
        for v in range(5):
            d = (v - 2) / 2 * 0.18; pan = (v - 2) / 2 * 0.8
            s = saw_ph(phase(note_hz(m) * 2 ** (d / 12) * pb) + R().random())
            out += stereo(s, pan) / 1.414
    out = lp(out, 5200)
    e = ar(n, 0.005, 0.06, dur)
    if pump_rate:
        ph = (t / (beat / pump_rate)) % 1.0; e = e * (0.15 + 0.85 * np.minimum(1, ph / 0.35) ** 1.5)
    return out * e * gain / np.sqrt(5 * len(notes))
def gate_pad(notes, dur, step, gain=0.1, cutoff=4200, pattern=None):
    x = L.supersaw(notes, dur, cutoff, voices=7, det=0.2, attack=0.005, release=0.05, gain=gain)
    n = x.shape[1]; t = tt(n); k = (t / step).astype(int)
    pat = pattern or [1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1]
    on = np.array([pat[i % len(pat)] for i in k], float); ph = (t / step) % 1.0
    g = on * np.minimum(1, ph / 0.05) * np.clip((0.8 - ph) / 0.1, 0, 1)
    return x * g
def cowbell(m, dur=0.3, gain=0.2):
    n = int(dur * SR); t = tt(n); f = note_hz(m)
    x = sq_ph(f * t) + sq_ph(f * 1.48 * t) * 0.8
    return np.tanh(bp(x, f * 0.8, min(f * 5, 15000)) * 2) * np.exp(-t * 9) * gain
def sawlead(m, dur, gain=0.12, glide_from=None, cutoff=5500, voices=3):
    n = int((dur + 0.08) * SR); t = tt(n); f = np.full(n, note_hz(m))
    if glide_from is not None: f = note_hz(glide_from) * (f / note_hz(glide_from)) ** np.minimum(1, t / 0.07)
    vib = 1 + 0.005 * np.sin(2 * np.pi * 5.5 * t) * np.minimum(1, np.maximum(0, t - 0.2) / 0.2)
    out = np.zeros((2, n))
    for v in range(voices):
        d = (v - (voices - 1) / 2) * 0.1; out += stereo(saw_ph(phase(f * vib * 2 ** (d / 12)) + R().random()), (v - (voices - 1) / 2) * 0.5) / 1.414
    return lp(out, cutoff) * ar(n, 0.006, 0.07, dur) * gain / np.sqrt(voices)
def sqlead(m, dur, gain=0.1, glide_from=None):
    n = int((dur + 0.06) * SR); t = tt(n); f = np.full(n, note_hz(m))
    if glide_from is not None: f = note_hz(glide_from) * (f / note_hz(glide_from)) ** np.minimum(1, t / 0.08)
    vib = 1 + 0.007 * np.sin(2 * np.pi * 5 * t) * np.minimum(1, np.maximum(0, t - 0.15) / 0.2)
    x = sq_ph(phase(f * vib)) * 0.6 + saw_ph(phase(f * vib * 1.003)) * 0.4
    return lp(x, 3800) * ar(n, 0.01, 0.06, dur) * gain

# ================= ÚJ HANGEFFEKTEK (talajfelderítés) =================
def motor2t(dur, gain=0.2, f=95):
    n = int(dur * SR); t = tt(n); ff = f * (1 + 0.05 * np.sin(2 * np.pi * 0.7 * t)) * (1 + 0.04 * nz(n).cumsum() / np.sqrt(np.arange(1, n + 1)))
    ph = phase(ff); x = sq_ph(ph, 0.2) * 0.5 + saw_ph(ph * 2) * 0.3 + bp(nz(n), 800, 4000) * 0.25
    return lp(x, 2600) * ar(n, 0.3, 0.3, dur - 0.3) * gain
def beep(f=1800, dur=0.09, gain=0.12):
    n = int(dur * SR); t = tt(n); return np.sin(2 * np.pi * f * t) * ar(n, 0.003, 0.01, dur - 0.01) * gain
def databeep(gain=0.1):
    n = int(0.06 * SR); t = tt(n); return (sq_ph(2400 * t, 0.5) * 0.3 + np.sin(2 * np.pi * 3600 * t) * 0.3) * np.exp(-t * 50) * gain
def radar(gain=0.16):
    n = int(0.5 * SR); t = tt(n); f = 2600 * np.exp(-t * 1.5)
    return np.sin(2 * np.pi * phase(f)) * np.exp(-t * 9) * gain
def zap(dur=0.3, gain=0.15):
    n = int(dur * SR); t = tt(n); x = sq_ph(phase(120 + 80 * np.sin(2 * np.pi * 37 * t)), 0.3) * 0.4 + hp(nz(n), 3000) * 0.3
    return bp(x, 200, 6000) * ar(n, 0.005, 0.05, dur - 0.05) * gain
def hum(dur, f=60, gain=0.1):
    n = int(dur * SR); t = tt(n); x = sum(np.sin(2 * np.pi * f * k * t) / k for k in (1, 2, 3, 5))
    return x * ar(n, 0.2, 0.3, dur - 0.3) * gain
def geothump(gain=0.6):
    n = int(1.6 * SR); t = tt(n)
    thud = np.sin(2 * np.pi * phase(55 + 90 * np.exp(-t * 30))) * np.exp(-t * 7)
    ring = sum(np.sin(2 * np.pi * f * t + R().random() * 6) * np.exp(-t * d) * a for f, a, d in ((1210, 0.5, 22), (2380, 0.35, 30), (3420, 0.2, 40), (760, 0.4, 16)))
    return np.tanh((thud * 1.2 + ring * 0.35 + bp(nz(n), 200, 3000) * np.exp(-t * 40) * 0.5) * 1.6) * gain
def rumble(dur, gain=0.3):
    n = int(dur * SR); t = tt(n); return lp(nz(n), 120) * 3 * np.exp(-t * 2.2) * gain
def gas(dur, gain=0.15):
    n = int(dur * SR); return bp(nz(n), 3000, 11000) * ar(n, 0.05, 0.1, dur - 0.1) * gain
def ratchet(dur, rate=14, gain=0.2):
    n = int(dur * SR); x = np.zeros(n); k = 0
    while True:
        i = int(k / rate * SR)
        if i + 1500 > n: break
        tk = tt(1500); x[i:i + 1500] += (np.sin(2 * np.pi * 2900 * tk) * 0.5 + bp(nz(1500), 2000, 8000)) * np.exp(-tk * 260); k += 1
    return x * gain
def latch(gain=0.4):
    n = int(0.12 * SR); t = tt(n); return (np.sin(2 * np.pi * 1450 * t) * 0.5 + bp(nz(n), 1500, 7000) * 0.6) * np.exp(-t * 70) * gain
def winch(dur, gain=0.18):
    n = int(dur * SR); t = tt(n); f = 160 + 60 * np.sin(np.pi * np.clip(t / dur, 0, 1))
    x = lp(saw_ph(phase(f)), 900) * 0.5 + ratchet(dur, 22, 0.25)[:n] * 0.4
    return x * ar(n, 0.1, 0.15, dur - 0.15) * gain
def magchirp(dur=0.5, f=900, gain=0.1):
    n = int(dur * SR); t = tt(n); ff = f * (1 + 0.4 * np.sin(2 * np.pi * 3 * t))
    return np.sin(2 * np.pi * phase(ff)) * ar(n, 0.01, 0.05, dur - 0.05) * gain
def scan(dur, gain=0.08):
    n = int(dur * SR); t = tt(n); ff = 400 + 3000 * ((t * 4) % 1.0)
    return (np.sin(2 * np.pi * phase(ff)) * 0.4 + hp(nz(n), 6000) * 0.1) * ar(n, 0.05, 0.1, dur - 0.1) * gain
def push(dur, gain=0.18):  # hidraulikus lenyomás (CPT): mély, egyenletes zúgás + finom nyikorgás
    n = int(dur * SR); t = tt(n)
    x = lp(saw_ph(phase(np.full(n, 62.0))) + saw_ph(phase(np.full(n, 62.7))), 380) * 0.4 + np.sin(2 * np.pi * 520 * t + 3 * np.sin(2 * np.pi * 0.7 * t)) * 0.04
    return x * ar(n, 0.15, 0.2, dur - 0.2) * gain

NEW_SFX = {
    'motor': lambda e: (motor2t(e.get('dur', 2), 0.2, e.get('f', 95)), e.get('g', 0.6)),
    'beep': lambda e: (beep(e.get('f', 1800), e.get('dur', 0.09)), e.get('g', 1.0)),
    'databeep': lambda e: (databeep(), e.get('g', 1.0)),
    'radar': lambda e: (radar(), e.get('g', 1.0)),
    'zap': lambda e: (zap(e.get('dur', 0.3)), e.get('g', 1.0)),
    'hum': lambda e: (hum(e.get('dur', 2), e.get('f', 60)), e.get('g', 0.6)),
    'geothump': lambda e: (geothump(), e.get('g', 0.8)),
    'rumble': lambda e: (rumble(e.get('dur', 1.5)), e.get('g', 0.6)),
    'gas': lambda e: (gas(e.get('dur', 1.0)), e.get('g', 0.6)),
    'ratchet': lambda e: (ratchet(e.get('dur', 1.0), e.get('rate', 14)), e.get('g', 0.6)),
    'latch': lambda e: (latch(), e.get('g', 1.0)),
    'winch': lambda e: (winch(e.get('dur', 1.5)), e.get('g', 0.6)),
    'magchirp': lambda e: (magchirp(e.get('dur', 0.5), e.get('f', 900)), e.get('g', 1.0)),
    'scan': lambda e: (scan(e.get('dur', 1.0)), e.get('g', 0.6)),
    'push': lambda e: (push(e.get('dur', 2.0)), e.get('g', 0.7)),
}

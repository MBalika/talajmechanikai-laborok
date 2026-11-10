# Új hangszerek és hangeffektek a munkatér-határolás v2 sorozathoz (music3.py)
import numpy as np
import synthlib as L
from synthlib import SR, note_hz, lp, hp, bp
from synth2 import tt, nz, ar, stereo, phase, saw_ph, sq_ph, resf, ks_pluck, R

# ---------- dobok ----------
def kick_hard(gain=1.0):
    n = int(0.5 * SR); t = tt(n); f = 44 + 220 * np.exp(-t * 45)
    body = np.sin(2 * np.pi * phase(f)) * np.exp(-t * 6)
    click = hp(nz(n) * np.exp(-t * 600), 2000) * 0.6
    return lp(np.tanh((body + click) * 5.0), 6000) * 0.72 * gain
def kick_soft(gain=1.0):
    n = int(0.45 * SR); t = tt(n); f = 50 + 60 * np.exp(-t * 30)
    return np.sin(2 * np.pi * phase(f)) * np.exp(-t * 8) * (1 - np.exp(-t * 400)) * 0.8 * gain
def timbale(hi=True, gain=1.0):
    n = int(0.35 * SR); t = tt(n); f = 420 if hi else 300
    x = np.sin(2 * np.pi * phase(f * (1 + 0.2 * np.exp(-t * 40)))) * np.exp(-t * 9) + np.sin(2 * np.pi * f * 2.3 * t) * np.exp(-t * 14) * 0.4
    return np.tanh((x + bp(nz(n), 2000, 8000) * np.exp(-t * 60) * 0.5) * 1.4) * 0.5 * gain
def snap(gain=1.0):
    n = int(0.18 * SR); t = tt(n)
    return (bp(nz(n), 1800, 9000) * np.exp(-t * 55) + np.sin(2 * np.pi * 1100 * t) * np.exp(-t * 90) * 0.3) * 0.5 * gain

# ---------- basszusok ----------
def rumble_bass(m, dur, gain=0.25):
    n = int(dur * SR); t = tt(n); f = note_hz(m)
    x = np.sin(2 * np.pi * f * t) + 0.6 * lp(nz(n), 160) * 3
    env = np.minimum(1, t / 0.01) * np.exp(-t * 5) * np.clip((dur - t) / 0.02, 0, 1)
    return lp(np.tanh(x * env * 3.0), 380) * gain
def logdrum(m, dur=0.35, gain=0.35, glide_from=None):
    n = int(max(dur, 0.12) * SR + 0.02 * SR); t = tt(n); f = np.full(n, note_hz(m))
    if glide_from is not None: f = note_hz(glide_from) * (f / note_hz(glide_from)) ** np.minimum(1, t / 0.05)
    f = f * (1 + 0.9 * np.exp(-t * 60)); ph = phase(f)
    x = np.sin(2 * np.pi * ph) + 0.35 * np.sin(4 * np.pi * ph) * np.exp(-t * 12) + 0.15 * np.sin(6 * np.pi * ph) * np.exp(-t * 20)
    env = np.exp(-t * (3.0 / max(dur, 0.1))) * np.minimum(1, t / 0.002) * np.clip((dur + 0.02 - t) / 0.02, 0, 1)
    return lp(np.tanh(x * env * 2.2), 1400) * gain
def slapbass(m, dur, gain=0.28, pop=False):
    n = int(dur * SR); t = tt(n); f = note_hz(m + (12 if pop else 0))
    ph = phase(np.full(n, f))
    x = saw_ph(ph) * 0.6 + sq_ph(ph, 0.3) * 0.3 + np.sin(2 * np.pi * ph) * 0.8
    fc = 220 + (3800 if pop else 2600) * np.exp(-t * (30 if pop else 20))
    y = resf(x, fc, q=3.0)
    click = hp(nz(n) * np.exp(-t * 900), 1500) * (0.5 if pop else 0.25)
    return np.tanh((y * np.exp(-t * (6 if pop else 3.5)) + click) * 1.8) * np.clip((dur - t) / 0.01, 0, 1) * gain

# ---------- dallam / harmónia ----------
def hoover(m, dur, gain=0.1, glide_from=None):
    n = int((dur + 0.08) * SR); t = tt(n); f = np.full(n, note_hz(m))
    if glide_from is not None: f = note_hz(glide_from) * (f / note_hz(glide_from)) ** np.minimum(1, t / 0.09)
    else: f = f * 2 ** (-2 * np.exp(-t * 18) / 12)
    out = np.zeros((2, n))
    for v in range(5):
        d = (v - 2) * 0.18
        s = saw_ph(phase(f * 2 ** (d / 12)) + R().random()) + 0.5 * sq_ph(phase(f * 0.5 * 2 ** (d / 12)), 0.3 + 0.15 * np.sin(2 * np.pi * 0.8 * t))
        out += stereo(s, (v - 2) * 0.4) / 1.414
    return lp(out, 4200) * ar(n, 0.01, 0.08, dur) * gain / np.sqrt(5)
def wahgtr(notes, dur=0.16, gain=0.1, f0=600, f1=2400):
    n = int((dur + 0.1) * SR); t = tt(n); x = np.zeros(n)
    for i, m in enumerate(notes):
        y = ks_pluck(m, dur + 0.1, 1.0, 0.985, 0.9)[:n]; off = int(i * 0.006 * SR)
        x[off:] += y[:n - off]
    fc = f0 + (f1 - f0) * np.minimum(1, t / 0.06) * np.exp(-t * 6)
    y = resf(x, fc, q=4.0, kind='band')
    return np.tanh(y * 3) * np.clip((dur - t) / 0.02, 0, 1) * gain
def strum(notes, dur=0.5, gain=0.12, down=True, spread=0.012):
    n = int((dur + 0.2) * SR); x = np.zeros(n); ns = notes if down else notes[::-1]
    for i, m in enumerate(ns):
        y = ks_pluck(m, dur + 0.2, 1.0, 0.996, 0.55)[:n]; off = int(i * spread * SR)
        x[off:] += y[:n - off]
    t = tt(n); return x * np.clip((dur + 0.15 - t) / 0.15, 0, 1) * gain / np.sqrt(len(notes))
def piano(notes, dur, gain=0.1, vel=0.8):
    n = int((dur + 0.5) * SR); t = tt(n); out = np.zeros(n)
    for m in notes:
        f = note_hz(m)
        for h, a, d in ((1, 1.0, 1.6), (2, 0.45 * vel, 2.6), (3, 0.22 * vel, 3.6), (4, 0.12 * vel, 5.0), (5, 0.06, 6.0)):
            out += np.sin(2 * np.pi * f * h * t * (1 + 0.0004 * h * h)) * a * np.exp(-t * d)
        out += bp(nz(n), f * 2, min(f * 8, 15000)) * np.exp(-t * 80) * 0.05 * vel
    out *= np.clip((dur + 0.4 - t) / 0.4, 0, 1) * np.minimum(1, t / 0.002)
    return out * gain / np.sqrt(len(notes))

# ---------- hangeffektek ----------
def clank(gain=0.4, f0=520):
    n = int(0.9 * SR); t = tt(n)
    x = sum(np.sin(2 * np.pi * f0 * k * t + R().random() * 6) * np.exp(-t * d) * a for k, a, d in ((1, 0.6, 7), (2.76, 0.45, 9), (5.4, 0.3, 13), (8.9, 0.2, 18), (13.3, 0.12, 26)))
    return np.tanh((x + bp(nz(n), 1500, 9000) * np.exp(-t * 90) * 0.8) * 1.3) * gain
def hiss(dur, gain=0.2):  # lőttbeton-szórás, sűrített levegő
    n = int(dur * SR); t = tt(n); tur = 0.7 + 0.3 * lp(nz(n), 8) * 6
    return bp(nz(n), 1200, 9000) * tur * ar(n, 0.08, 0.15, dur - 0.15) * gain
def ice(dur, gain=0.25):  # fagyás: ropogás + mély zúgás
    n = int(dur * SR); x = np.zeros(n); k = 0; rr = R()
    while k < n - 2000:
        k += int(SR * (0.01 + 0.06 * rr.random())); m = min(1500, n - k)
        if m <= 0: break
        tk = tt(m)
        x[k:k + m] += bp(nz(m), 2500, 12000) * np.exp(-tk * (200 + 300 * rr.random())) * (0.3 + 0.7 * rr.random())
    t = tt(n); x += np.sin(2 * np.pi * 48 * t) * 0.15 + lp(nz(n), 200) * 0.3
    return x * ar(n, 0.2, 0.3, dur - 0.3) * gain
def creak(dur, gain=0.2):  # feszítés, acél megfeszülése
    n = int(dur * SR); t = tt(n); f = 180 + 120 * (t / max(dur, 0.1)) + 15 * np.sin(2 * np.pi * 7 * t)
    x = sq_ph(phase(f), 0.15) * (0.6 + 0.4 * np.sin(2 * np.pi * 23 * t))
    return bp(x, 300, 3500) * ar(n, 0.1, 0.1, dur - 0.1) * gain
def splash(gain=0.5):
    n = int(1.2 * SR); t = tt(n); x = lp(nz(n), 3500) * np.exp(-t * 5) * 0.8
    k = 0; rr = R()
    while k < n - 3000:
        k += int(SR * (0.02 + 0.05 * rr.random())); m = min(2400, n - k)
        if m <= 0: break
        tk = tt(m); f = 400 + 900 * rr.random()
        x[k:k + m] += np.sin(2 * np.pi * phase(f * (1 + 2 * tk))) * np.exp(-tk * 40) * 0.25 * np.exp(-k / SR * 2)
    return x * gain
def nailgun(gain=0.5):
    n = int(0.4 * SR); t = tt(n)
    x = np.sin(2 * np.pi * phase(90 + 300 * np.exp(-t * 60))) * np.exp(-t * 18) + hp(nz(n), 1500) * np.exp(-t * 40) * 0.7 + bp(nz(n), 3000, 10000) * np.exp(-t * 9) * 0.25
    return np.tanh(x * 2.0) * 0.6 * gain
def chain(dur, gain=0.2, rate=30):  # láncos maró / rácsos csörgés
    n = int(dur * SR); x = np.zeros(n); k = 0; rr = R()
    while True:
        i = int(k / rate * SR)
        if i + 900 > n: break
        tk = tt(900); x[i:i + 900] += (np.sin(2 * np.pi * (1800 + 600 * rr.random()) * tk) * 0.4 + bp(nz(900), 1500, 7000)) * np.exp(-tk * 300); k += 1
    t = tt(n); x += lp(nz(n), 300) * 0.5 * (0.6 + 0.4 * np.sin(2 * np.pi * 2 * t))
    return x * ar(n, 0.1, 0.2, dur - 0.2) * gain
def freezer(dur, gain=0.12):  # hűtőgép / kompresszor
    n = int(dur * SR); t = tt(n)
    x = sum(np.sin(2 * np.pi * f * t) / k for k, f in ((1, 100), (2, 200), (3, 300), (4, 450))) * 0.5 + bp(nz(n), 400, 2500) * 0.25
    return x * (0.85 + 0.15 * np.sin(2 * np.pi * 9 * t)) * ar(n, 0.4, 0.4, dur - 0.4) * gain

SFX3 = {
    'clank': lambda e: (clank(0.4, e.get('f', 520)), e.get('g', 0.8)),
    'hiss': lambda e: (hiss(e.get('dur', 1.5)), e.get('g', 0.7)),
    'ice': lambda e: (ice(e.get('dur', 2.0)), e.get('g', 0.7)),
    'creak': lambda e: (creak(e.get('dur', 1.0)), e.get('g', 0.7)),
    'splash': lambda e: (splash(), e.get('g', 0.7)),
    'nailgun': lambda e: (nailgun(), e.get('g', 0.8)),
    'chain': lambda e: (chain(e.get('dur', 2.0), 0.2, e.get('rate', 30)), e.get('g', 0.6)),
    'freezer': lambda e: (freezer(e.get('dur', 3.0)), e.get('g', 0.6)),
}

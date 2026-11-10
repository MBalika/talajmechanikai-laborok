#!/usr/bin/env python3
# Fejezetenként váltott stílusú hangmintás zene: a music_live3.py --stem kimeneteit (azonos tempó, szakaszok, effektek)
# a music.json live.styleMap szerint ütemre keresztúsztatja (fél ütem), az effektsávot egyszer adja hozzá, majd masterel
# (ugyanaz a lánc, mint a music_live2.py végén).
# Használat: python3 kit/music_mix.py <events.json> <music.json> <ki.wav> <stem_mappa>
import numpy as np, json, sys, wave
from scipy.signal import lfilter, butter
ev, mu, out, sd = sys.argv[1:5]
EV = json.load(open(ev)); CF = json.load(open(mu)); LV = CF.get('live', {})
BPM = EV['bpm']; BEAT = 60 / BPM; BAR = 4 * BEAT
smap = LV['styleMap']; styles = sorted(set(s for _, s in smap))
Z = {s: np.load(f'{sd}/{s}.npz') for s in styles}; SR = int(Z[styles[0]]['sr']); N = Z[styles[0]]['mus'].shape[1]
W = {s: np.zeros(N, np.float32) for s in styles}
t = np.arange(N) / SR
for i, (b, s) in enumerate(smap):
    t0 = b * BAR; t1 = smap[i + 1][0] * BAR if i + 1 < len(smap) else 1e9
    xf = BEAT * 2
    a = np.clip((t - (t0 - xf * 0.75)) / xf, 0, 1) if i > 0 else np.ones(N)
    d = 1 - np.clip((t - (t1 - xf * 0.75)) / xf, 0, 1)
    W[s] += (a * d).astype(np.float32)
tot = sum(W.values()); tot[tot < 1e-6] = 1
MUS = sum(Z[s]['mus'] * (W[s] / tot)[None, :] for s in styles)
FX = Z[styles[0]]['fx']
def bf(x, f, k): b, a = butter(2, np.array(f) / (SR / 2), k); return lfilter(b, a, x).astype(np.float32)
mix = MUS + FX
mix = np.stack([bf(mix[c], 30, 'high') for c in range(2)]); mix = mix - 0.3 * np.stack([bf(mix[c], 6500, 'high') for c in range(2)])
def soft(x, th=0.72): a = np.abs(x); return np.where(a < th, x, np.sign(x) * (th + (1 - th) * np.tanh((a - th) / (1 - th))))
mix = soft(mix); mix *= 0.89 / max(1e-9, float(np.max(np.abs(mix))))
fi = int(0.03 * SR); mix[:, :fi] *= np.linspace(0, 1, fi); fo = int(1.4 * SR); mix[:, -fo:] *= np.linspace(1, 0, fo) ** 1.5
with wave.open(out, 'wb') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix.T * 32767).astype(np.int16).tobytes())
print('kész', out, styles, round(N / SR, 2), 's')

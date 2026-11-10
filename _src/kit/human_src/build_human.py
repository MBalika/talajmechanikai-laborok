#!/usr/bin/env python3
"""Élethű munkás-figura előállítása a MakeHuman (CC0) alaptestből.
Kimenet: ../humanmesh.js – kvantált, base64-kódolt geometria (pozíció, index, csont-index/-súly, régió) + csontváz-adatok.
Lépések: alaptest + férfi célalak → csontok összevonása (163 → 25) → régiók (bőr, ing, mellény, nadrág, bakancs, kesztyű, szem)
→ „ruha”: régiónkénti normál menti felfújás + Taubin-simítás → méterbe skálázás, talpra állítás → export."""
import numpy as np, json, base64, sys, os
D = os.path.dirname(os.path.abspath(__file__))
H_TARGET = 1.78  # m (cipővel kb.)

# ---------- beolvasás ----------
V = []; F = []; FG = []; grp = None
for line in open(os.path.join(D, 'base.obj')):
    if line.startswith('v '): V.append([float(x) for x in line.split()[1:4]])
    elif line.startswith('g '): grp = line.split()[1]
    elif line.startswith('f '): F.append([int(t.split('/')[0]) - 1 for t in line.split()[1:]]); FG.append(grp)
V = np.array(V)

def load_target(fn, w):
    if w == 0: return
    for line in open(os.path.join(D, fn)):
        if not line.strip() or line.startswith('#'): continue
        p = line.split(); V[int(p[0])] += w * np.array([float(p[1]), float(p[2]), float(p[3])])
load_target('caucasian-male-young.target', 0.92)
load_target('caucasian-male-old.target', 0.08)
load_target('universal-male-young-maxmuscle-averageweight.target', 0.30)

skel = json.load(open(os.path.join(D, 'default.mhskel')))
JP = {k: V[v].mean(0) for k, v in skel['joints'].items()}
BONES = skel['bones']
def head(b): return JP[BONES[b]['head']]
def tail(b): return JP[BONES[b]['tail']]
W = json.load(open(os.path.join(D, 'default_weights.mhw')))['weights']

# ---------- csontok összevonása ----------
def desc(b):
    out = [b]
    for n, d in BONES.items():
        if d['parent'] == b: out += desc(n)
    return out
NEW = []  # (név, szülő, fej-pozíció)
MAP = {}
def add(name, parent, pos, members):
    NEW.append((name, parent, pos));
    for m in members: MAP[m] = name
add('hips', None, head('spine05'), ['root', 'pelvis.L', 'pelvis.R', 'spine05'])
add('spineLo', 'hips', head('spine04'), ['spine04', 'spine03'])
add('spineHi', 'spineLo', head('spine02'), ['spine02', 'spine01', 'breast.L', 'breast.R'])
add('neck', 'spineHi', head('neck01'), ['neck01', 'neck02', 'neck03'])
add('head', 'neck', head('head'), desc('head'))
for s in ['L', 'R']:
    add('clav.' + s, 'spineHi', head('clavicle.' + s), ['clavicle.' + s, 'shoulder01.' + s])
    add('uarm.' + s, 'clav.' + s, head('upperarm01.' + s), ['upperarm01.' + s, 'upperarm02.' + s])
    add('farm.' + s, 'uarm.' + s, head('lowerarm01.' + s), ['lowerarm01.' + s, 'lowerarm02.' + s])
    # ujjak ízületekkel (2026-10-24): hüvelykujj (fingT1–3) a kézfejen, a négy ujj (fingI/M/R/P 1–3) a közös fing csonton –
    # alaphelyzetben (egységforgatás) a deformáció azonos a korábbi két csontos kézzel; a fing csont forgatása továbbra is az egész ujjsort hajlítja
    allf = [b for k in range(1, 6) for b in desc(f'finger{k}-1.' + s)]
    hand = [b for b in desc('wrist.' + s) if b not in allf]
    add('hand.' + s, 'farm.' + s, head('wrist.' + s), hand)
    add('fing.' + s, 'hand.' + s, np.mean([head(f'finger{i}-1.' + s) for i in (2, 3, 4, 5)], 0), [])
    for c, k in (('T', 1), ('I', 2), ('M', 3), ('R', 4), ('P', 5)):
        par = 'hand.' + s if c == 'T' else 'fing.' + s
        for j in (1, 2, 3):
            add(f'fing{c}{j}.' + s, par, head(f'finger{k}-{j}.' + s), [f'finger{k}-{j}.' + s]); par = f'fing{c}{j}.' + s
    add('thigh.' + s, 'hips', head('upperleg01.' + s), ['upperleg01.' + s, 'upperleg02.' + s])
    add('shin.' + s, 'thigh.' + s, head('lowerleg01.' + s), ['lowerleg01.' + s, 'lowerleg02.' + s])
    add('foot.' + s, 'shin.' + s, head('foot.' + s), desc('foot.' + s))
missing = [b for b in BONES if b not in MAP]
assert not missing, missing
BI = {n: i for i, (n, p, q) in enumerate(NEW)}
NV = len(V)
WM = np.zeros((NV, len(NEW)))
for b, lst in W.items():
    j = BI[MAP[b]]
    for vi, w in lst: WM[vi, j] += w

# ---------- háló kiválasztása (test + szemek) ----------
keep_groups = {'body', 'helper-l-eye', 'helper-r-eye'}
faces = [f for f, g in zip(F, FG) if g in keep_groups]
isEye = np.zeros(NV, bool)
for f, g in zip(F, FG):
    if g in ('helper-l-eye', 'helper-r-eye'):
        for i in f: isEye[i] = True
used = sorted(set(i for f in faces for i in f))
remap = -np.ones(NV, int); remap[used] = np.arange(len(used))
P = V[used].copy(); WMu = WM[used]; isEye = isEye[used]
FF = [[remap[i] for i in f] for f in faces]
tris = []
for f in FF:
    for k in range(1, len(f) - 1): tris.append([f[0], f[k], f[k + 1]])
T = np.array(tris)
n = len(P)
dom = np.array([NEW[i][0] for i in WMu.argmax(1)])

# ---------- skálázás (dm → m, talp y = 0) ----------
y0 = P[:, 1].min(); s = 0.1
def tm(x): x = np.array(x, float); return (x - np.array([0, y0, 0])) * s
P = tm(P)
JN = {name: tm(pos) for name, pos, in [(nm, q) for nm, p, q in NEW]}

# ---------- régiók ----------
# 0 fej (bőr), 1 ujj (ing), 2 törzs (ing/mellény/öv/nadrág – árnyalóban, analitikus határokkal), 3 láb (nadrág),
# 4 bakancs, 5 kesztyű, 6 szem
reg = np.zeros(n, int)
for i in range(n):
    d = dom[i]; y = P[i, 1]
    if isEye[i]: reg[i] = 6
    elif d.startswith('hand') or d.startswith('fing'): reg[i] = 5
    elif d.startswith('foot'): reg[i] = 4
    elif d.startswith('shin') and y < 0.16: reg[i] = 4
    elif d.startswith('thigh') or d.startswith('shin'): reg[i] = 3
    elif d in ('hips', 'spineLo', 'spineHi', 'neck') or d.startswith('clav'): reg[i] = 2
    elif d.startswith('uarm') or d.startswith('farm'): reg[i] = 1
    else: reg[i] = 0
for s_ in 'LR':
    hj = JN['hand.' + s_]; fj = JN['farm.' + s_]; ax = (hj - fj); L = np.linalg.norm(ax); ax /= L
    for i in range(n):
        if reg[i] == 1 and np.dot(P[i] - fj, ax) / L > 0.93 and np.linalg.norm(P[i] - hj) < 0.06: reg[i] = 5

# ---------- szomszédság, normálok ----------
nb = [set() for _ in range(n)]
for a, b, c in T: nb[a].update((b, c)); nb[b].update((a, c)); nb[c].update((a, b))
nb = [np.array(sorted(x)) for x in nb]
def normals(P):
    N = np.zeros_like(P); fn = np.cross(P[T[:, 1]] - P[T[:, 0]], P[T[:, 2]] - P[T[:, 0]])
    for k in range(3): np.add.at(N, T[:, k], fn)
    return N / (np.linalg.norm(N, axis=1, keepdims=True) + 1e-12)
def smooth(P, mask, it, lam=0.5, mu=-0.53):
    P = P.copy(); idx = np.where(mask)[0]
    for _ in range(it):
        for f in ((lam, mu) if mu else (lam,)):
            avg = np.array([P[nb[i]].mean(0) for i in idx]); P[idx] += f * (avg - P[idx])
    return P

# ---------- ruha: felfújás (simított eltolásmező) + simítás ----------
yNeck = JN['neck'][1]
OFF = {0: 0.0, 1: 0.017, 2: 0.022, 3: 0.02, 4: 0.0, 5: 0.004, 6: 0.0}
off = np.array([OFF[r] for r in reg], float)
# a nyakon a gallér fölött nincs ruha
neckTop = (reg == 2) & (P[:, 1] > yNeck - 0.01)
off[neckTop] = 0.0
for _ in range(6):  # eltolásmező elmosása: ne legyen lépcső a régióhatárokon
    o2 = np.array([0.5 * off[i] + 0.5 * off[nb[i]].mean() for i in range(n)])
    keep = (reg == 0) | (reg == 6) | (reg == 4) | neckTop
    off = np.where(keep, off, o2)
N0 = normals(P)
P = P + N0 * off[:, None]
clothM = (reg == 1) | (reg == 3) | ((reg == 2) & (P[:, 1] < yNeck - 0.02))
P = smooth(P, clothM, 32)
P = smooth(P, (reg == 2) & (P[:, 1] < yNeck - 0.05) & (P[:, 1] > 0.9), 20)
# (a bakancs külön, SDF-ből épített háló – lásd lent)

headMask0 = np.array([d == 'head' for d in dom])
nm_ = [b[0] for b in NEW]
def wsum(pred): return WMu[:, [i for i, nmb in enumerate(nm_) if pred(nmb)]].sum(1) / np.maximum(WMu.sum(1), 1e-9)
AW = np.stack([wsum(lambda b: b.startswith('uarm') or b.startswith('farm')), wsum(lambda b: b.startswith('hand') or b.startswith('fing')),
               wsum(lambda b: b in ('head', 'neck')), wsum(lambda b: b.startswith('thigh') or b.startswith('shin') or b.startswith('foot'))], 1)
# ---------- súlyok: 4 legnagyobb ----------
order = np.argsort(-WMu, axis=1)[:, :4]
ww = np.take_along_axis(WMu, order, 1); ww = ww / ww.sum(1, keepdims=True)
wq = np.round(ww * 255).astype(int)
for i in range(n):
    d = 255 - wq[i].sum(); wq[i, 0] += d

# ---------- bakancs: SDF + marching cubes, a talp körvonala a láb alapján ----------
from skimage import measure
def smin(a, b, k): h = np.clip(0.5 + 0.5 * (b - a) / k, 0, 1); return b * (1 - h) + a * h - k * h * (1 - h)
newP = [P]; newT = [T]; newReg = [reg]; newO = [order]; newW = [wq]; newA = [AW]
footFaces = np.array([all(dom[i].startswith('foot') for i in tri) for tri in T])
for s_ in 'LR':
    sg = 1 if s_ == 'L' else -1
    ank = JN['foot.' + s_].copy()
    fv = P[np.array([d == 'foot.' + s_ for d in dom])]
    # előre-irány: a talp vízszintes főtengelye
    xz = fv[:, [0, 2]] - fv[:, [0, 2]].mean(0); ev = np.linalg.eigh(xz.T @ xz)[1][:, -1]; fwd = np.array([ev[0], 0, ev[1]]);
    if fwd[2] < 0: fwd = -fwd
    lat = np.cross([0, 1, 0], fwd)
    proj = (fv - ank) @ fwd; heel = proj.min() - 0.012; toe = proj.max() + 0.014
    L = toe - heel
    org = ank + fwd * heel; org[1] = 0.0
    lo = np.array([-0.08, -0.002, -0.03]); hi = np.array([0.08, 0.2, L + 0.03]); st = 0.0075
    gx = np.arange(lo[0], hi[0], st); gy = np.arange(lo[1], hi[1], st); gz = np.arange(lo[2], hi[2], st)
    X, Y, Z = np.meshgrid(gx, gy, gz, indexing='ij')  # X: oldal, Y: fel, Z: előre (sarok = 0)
    # talp körvonal: egyenlőtlen kapszula (sarok r1 → előláb r2)
    r1, r2 = 0.044, 0.053; c1, c2 = r1, L - r2 - 0.004
    hh = c2 - c1; bb = (r1 - r2) / hh; aa = np.sqrt(max(1e-6, 1 - bb * bb))
    qx = np.abs(X); qy = Z - c1; k = (-bb * qx + aa * qy)  # iq: uneven capsule 2D
    d2 = np.where(k < 0, np.sqrt(qx ** 2 + qy ** 2) - r1, np.where(k > aa * hh, np.sqrt(qx ** 2 + (qy - hh) ** 2) - r2, qx * aa + qy * bb - r1))
    # magasság az előre-koordináta szerint: orr 0,065 → rüszt 0,10
    u = np.clip(Z / L, 0, 1); h = 0.10 - 0.035 * np.clip((u - 0.45) / 0.55, 0, 1) ** 1.3
    h = h - 0.012 * np.clip((u - 0.85) / 0.15, 0, 1) ** 2
    dy = np.maximum(-Y, Y - h)
    rr = 0.012
    q = np.stack([np.maximum(d2 + rr, 0), np.maximum(dy + rr, 0)], -1)
    dsole = np.sqrt((q ** 2).sum(-1)) + np.minimum(np.maximum(d2 + rr, dy + rr), 0) - rr
    # szár: függőleges, enyhén kúpos henger a boka körül
    ax_ = (ank - org); sx, sz = ax_ @ lat * sg, ax_ @ fwd
    rad = 0.062 - 0.006 * np.clip(Y / 0.19, 0, 1)
    dsh = np.maximum(np.sqrt((X - sx) ** 2 + (Z - sz) ** 2) - rad, np.maximum(-Y, Y - 0.185))
    d = smin(dsole, dsh, 0.03)
    verts, faces, nrm, _ = measure.marching_cubes(d, 0.0, spacing=(st, st, st))
    verts += lo
    W_ = org + np.outer(verts[:, 0] * sg, lat) + np.outer(verts[:, 1], [0, 1, 0]) + np.outer(verts[:, 2], fwd)
    if sg < 0: faces = faces[:, ::-1]
    faces = faces[:, ::-1]  # skimage: befelé néző normálok → megfordítjuk
    base = sum(len(x) for x in newP)
    newP.append(W_); newT.append(faces + base); newReg.append(np.full(len(W_), 4))
    jF, jS = BI['foot.' + s_], BI['shin.' + s_]
    wS = np.clip((W_[:, 1] - (ank[1] + 0.0)) / 0.09, 0, 1); wS = wS * wS * (3 - 2 * wS)
    o = np.zeros((len(W_), 4), int); o[:, 0] = jF; o[:, 1] = jS; o[:, 2] = jF; o[:, 3] = jF
    ww_ = np.zeros((len(W_), 4), int); ww_[:, 1] = np.round(wS * 255); ww_[:, 0] = 255 - ww_[:, 1]
    newO.append(o); newW.append(ww_); aw = np.zeros((len(W_), 4)); aw[:, 3] = 1; newA.append(aw)
    print('boot', s_, len(W_), 'verts', len(faces), 'tris', 'L=%.3f' % L)
# eredeti lábfej-háromszögek elhagyása (a bakancs belsejében vannak)
newT[0] = T[~footFaces]
P = np.concatenate(newP); T = np.concatenate(newT); reg = np.concatenate(newReg); order = np.concatenate(newO); wq = np.concatenate(newW); AW = np.concatenate(newA)
# használatlan csúcsok eltávolítása
usedv = np.unique(T); rm = -np.ones(len(P), int); rm[usedv] = np.arange(len(usedv))
headMask = np.concatenate([headMask0, np.zeros(len(P) - len(headMask0), bool)])[usedv]
P = P[usedv]; AW = AW[usedv]; reg = reg[usedv]; order = order[usedv]; wq = wq[usedv]; T = rm[T]; n = len(P)
dom = None

# ---------- csontváz és segédadatok ----------
bones = []
for nm, par, q in NEW:
    pos = JN[nm]; bones.append({'n': nm, 'p': BI[par] if par else -1, 'x': [round(float(v), 5) for v in pos]})
def tmj(j): return tm(JP[j])
info = {}
for s_ in 'LR':
    info['elbow.' + s_] = [round(float(v), 5) for v in tm(head('lowerarm01.' + s_))]
    info['wrist.' + s_] = [round(float(v), 5) for v in tm(head('wrist.' + s_))]
    info['fingTip.' + s_] = [round(float(v), 5) for v in tm(tail('finger3-3.' + s_))]
    info['thumb.' + s_] = [round(float(v), 5) for v in tm(head('finger1-2.' + s_))]
    info['pinky.' + s_] = [round(float(v), 5) for v in tm(head('finger5-1.' + s_))]
    info['index.' + s_] = [round(float(v), 5) for v in tm(head('finger2-1.' + s_))]
    for c, k in (('T', 1), ('I', 2), ('M', 3), ('R', 4), ('P', 5)): info['tip' + c + '.' + s_] = [round(float(v), 5) for v in tm(tail(f'finger{k}-3.' + s_))]
    info['knee.' + s_] = [round(float(v), 5) for v in tm(head('lowerleg01.' + s_))]
    info['ankle.' + s_] = [round(float(v), 5) for v in tm(head('foot.' + s_))]
    info['eye.' + s_] = [round(float(v), 5) for v in tm(head('eye.' + s_))]
info['headTop'] = [round(float(v), 5) for v in tm(tail('head'))]
hv = P[headMask]
info['headMin'] = [round(float(v), 5) for v in hv.min(0)]; info['headMax'] = [round(float(v), 5) for v in hv.max(0)]
info['height'] = round(float(P[:, 1].max()), 4)
for nm in ('hips', 'spineLo', 'spineHi', 'neck', 'clav.L', 'uarm.L'): info['y_' + nm] = round(float(JN[nm][1]), 4)
info['x_uarm'] = round(float(JN['uarm.L'][0]), 4)
info['neck'] = [round(float(v), 4) for v in JN['neck']]
# arc-tájékozódási pontok a festéshez
info['brow'] = round(float(info['eye.L'][1] + 0.018), 4)
info['noseZ'] = round(float(P[headMask][:, 2].max()), 4)

# ---------- export ----------
SC = 16384.0
pos = np.round(P * SC).astype(np.int16)
b64 = lambda a: base64.b64encode(a.tobytes()).decode()
out = {
    'n': int(n), 't': int(len(T)), 'sc': SC,
    'pos': b64(pos), 'idx': b64(T.astype(np.uint16)),
    'si': b64(order.astype(np.uint8)), 'aw': b64(np.round(np.clip(AW, 0, 1) * 255).astype(np.uint8)), 'sw': b64(wq.astype(np.uint8)), 'reg': b64(reg.astype(np.uint8)),
    'bones': bones, 'info': info,
}
js = ('// Automatikusan generált (kit/human_src/build_human.py) – MakeHuman alaptest, CC0 1.0 (makehumancommunity.org).\n'
      '// Ne szerkeszd kézzel.\nexport const HUMAN = ' + json.dumps(out, separators=(',', ':')) + ';\n')
open(os.path.join(D, '..', 'humanmesh.js'), 'w').write(js)
print('verts', n, 'tris', len(T), 'bones', len(NEW), 'height', info['height'], 'size KB', len(js) // 1024)
print('regions', np.bincount(reg))

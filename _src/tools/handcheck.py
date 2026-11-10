# Kéz-ellenőrzés a teljes videóra (képrenderelés nélkül, gyors): minden időpontban a látható, reach-et használó munkások
# mindkét kezére és alkarjára kiszámolja
#   miss  – a csukló távolsága a céltól (cm),
#   bend  – a csukló hajlása: az alkar és a kézfej tengelyének szöge (fok; > 60° gyanús),
#   twist – a csukló maradék csavarodása az alkarhoz képest (fok; > 45° gyanús, „kifordult” kéz),
#   pen   – a kéz/alkar bőrpontjai közül hány van egy másik tárgy belsejében (és melyikben),
#   body  – hány pont van a saját törzsében (az alkar átmegy a testén).
# Használat: bash tools/gate.sh python3 tools/handcheck.py <video.html> <BPM> <ütemtől> <ütemig> <lépés> [kimenet.json] [--shots]
# A --shots a hibás időpontokról kézközeli képeket is készít (qa/hc_<név>_*.jpg).
import asyncio, sys, os, json, io
from playwright.async_api import async_playwright
html = os.path.abspath(sys.argv[1]); bpm = float(sys.argv[2]); b0, b1, st = float(sys.argv[3]), float(sys.argv[4]), float(sys.argv[5])
out = sys.argv[6] if len(sys.argv) > 6 and not sys.argv[6].startswith('--') else None
shots = '--shots' in sys.argv
JS = r"""
(()=>{ if (window.__HC) return true;
const R = window.R, T3 = R.camera.position.constructor, M4 = R.camera.matrixWorld.constructor, Q = R.camera.quaternion.constructor;
const V = (x=0,y=0,z=0)=>new T3(x,y,z);
const visibleChain = (o)=>{ while(o){ if(!o.visible) return false; o=o.parent; } return true; };
function workers(){ const ws=[]; R.scene.traverse(o=>{ if(o.userData&&o.userData.B&&o.userData.body) ws.push(o); }); return ws; }
function skinOf(w){ let sk=null; w.traverse(m=>{ if(m.isSkinnedMesh&&!sk) sk=m; }); return sk; }
const cache = new Map();
function sampleIdx(sk, names, minW, maxN){ const key=sk.uuid+names.join(); if(cache.has(key)) return cache.get(key);
  const bones=sk.skeleton.bones, ids=names.map(n=>bones.findIndex(b=>b.name===n)); const si=sk.geometry.attributes.skinIndex, sw=sk.geometry.attributes.skinWeight; const L=[];
  for(let i=0;i<si.count;i++){ let ws=0; for(let k=0;k<4;k++){ if(ids.includes(si.getComponent(i,k))) ws+=sw.getComponent(i,k); } if(ws>=minW) L.push(i); }
  const step=Math.max(1,Math.floor(L.length/maxN)); const r=L.filter((_,j)=>j%step===0); cache.set(key,r); return r; }
function skinPts(sk, idx){ const pos=sk.geometry.attributes.position; return idx.map(i=>{ const v=V(pos.getX(i),pos.getY(i),pos.getZ(i)); (sk.applyBoneTransform||sk.boneTransform).call(sk,i,v); return v.applyMatrix4(sk.matrixWorld); }); }
// tárgyak: látható, nem bőrhálós mesh-ek, munkásokon kívül, nem óriásiak
function solids(ws){ const own=new Set(); ws.forEach(w=>w.traverse(o=>own.add(o))); const L=[];
  R.scene.traverse(m=>{ if(!m.isMesh||m.isSkinnedMesh||m.isInstancedMesh||own.has(m)) return; if(!visibleChain(m)) return; const mat=Array.isArray(m.material)?m.material[0]:m.material; if(!mat||(mat.transparent&&mat.opacity<0.35)||mat.blending===2) return;
    const g=m.geometry; if(!g||!g.attributes.position) return; if(!g.boundingBox) g.computeBoundingBox(); const bb=g.boundingBox.clone().applyMatrix4(m.matrixWorld); const sz=bb.getSize(V()); if(sz.length()>12) return;
    if(sz.x<0.004||sz.y<0.004||sz.z<0.004) return; L.push({m,bb}); }); return L; }
function rayHits(m, p, dir){ const g=m.geometry, pos=g.attributes.position, ix=g.index; const inv=new M4().copy(m.matrixWorld).invert(); const o=p.clone().applyMatrix4(inv);
  const d=dir.clone().transformDirection(inv); let n=0; const a=V(),b=V(),c=V(),e1=V(),e2=V(),h=V(),s=V(),q=V(); const N=ix?ix.count:pos.count;
  const dr=g.drawRange; const start=dr.start||0, end=Math.min(N, dr.count===Infinity?N:start+dr.count);
  for(let i=start;i+2<end;i+=3){ const i0=ix?ix.getX(i):i, i1=ix?ix.getX(i+1):i+1, i2=ix?ix.getX(i+2):i+2; a.fromBufferAttribute(pos,i0); b.fromBufferAttribute(pos,i1); c.fromBufferAttribute(pos,i2);
    e1.subVectors(b,a); e2.subVectors(c,a); h.crossVectors(d,e2); const det=e1.dot(h); if(Math.abs(det)<1e-12) continue; const f=1/det; s.subVectors(o,a); const u=f*s.dot(h); if(u<0||u>1) continue; q.crossVectors(s,e1); const v=f*d.dot(q); if(v<0||u+v>1) continue; const tt=f*e2.dot(q); if(tt>1e-6) n++; }
  return n; }
const D1=V(1,0.0123,0.0071).normalize(), D2=V(-0.0091,0.0137,1).normalize(), D3=V(0.0113,-1,0.0079).normalize();
function inside(m,p){ return (rayHits(m,p,D1)&1)&&(rayHits(m,p,D2)&1)&&(rayHits(m,p,D3)&1); }
function segDist(p,a,b){ const ab=b.clone().sub(a), t=Math.max(0,Math.min(1,p.clone().sub(a).dot(ab)/ab.lengthSq())); return p.distanceTo(a.clone().addScaledVector(ab,t)); }
window.__HC = function(){ const ws=workers(); const S=solids(ws); const res=[];
  ws.forEach((w,wi)=>{ const u=w.userData; if(!visibleChain(w)||!u.reach) return; w.updateWorldMatrix(true,true); const sk=skinOf(w); if(!sk) return;
    const hips=u.B.hips.getWorldPosition(V()), neck=u.B.neck.getWorldPosition(V());
    for(const sd of ['L','R']){ const rc=u.reach[sd]; if(!rc||(rc.w??1)<0.5) continue;
      const tg = rc._wrist ? rc._wrist.clone() : rc.obj ? (rc.obj.updateWorldMatrix(true,false), rc.obj.localToWorld(rc.local.clone())) : w.localToWorld(rc.local.clone());
      const hP=u.B['hand.'+sd].getWorldPosition(V()), fP=u.B['fing.'+sd].getWorldPosition(V()), eP=u.B['farm.'+sd].getWorldPosition(V());
      const fa=hP.clone().sub(eP).normalize(), hd=fP.clone().sub(hP).normalize(); const bend=Math.acos(Math.max(-1,Math.min(1,fa.dot(hd))))*180/Math.PI;
      // csavarodás: a kéz és az alkar oldaltengelye (a csontok világ-x tengelye) a tengelyre merőleges síkban
      const qa=u.B['farm.'+sd].getWorldQuaternion(new Q()), qh=u.B['hand.'+sd].getWorldQuaternion(new Q());
      const la=V(1,0,0).applyQuaternion(qa), lh=V(1,0,0).applyQuaternion(qh); la.addScaledVector(fa,-la.dot(fa)).normalize(); lh.addScaledVector(fa,-lh.dot(fa)).normalize();
      const twist=Math.abs(Math.atan2(new T3().crossVectors(la,lh).dot(fa), la.dot(lh)))*180/Math.PI;
      const ptsH=skinPts(sk, sampleIdx(sk,['hand.'+sd],0.6,40)), ptsF=skinPts(sk, sampleIdx(sk,sk.skeleton.bones.filter(b=>b.name.startsWith('fing')&&b.name.endsWith('.'+sd)).map(b=>b.name),0.5,40)), ptsA=skinPts(sk, sampleIdx(sk,['farm.'+sd],0.7,40));
      // pen: a kézfej (tenyér/kézhát) és az alkar pontjai tárgyban – ez a valódi „átmegy rajta”; penF: az ujjak (markoláskor néhány ujjpont a megfogott tárgyba érhet)
      let pen=0, penF=0; const what={}; let body=0;
      const test=(p,isF)=>{ for(const {m,bb} of S){ if(!bb.containsPoint(p)) continue; if(inside(m,p)){ if(isF) penF++; else pen++; let o=m, nm=''; while(o&&!nm){ nm=o.name; o=o.parent; } nm=(isF?'ujj:':'')+(nm||(m.geometry.type+'@'+m.parent.type)); what[nm]=(what[nm]||0)+1; return; } } };
      ptsH.forEach(p=>test(p,false)); ptsA.forEach(p=>test(p,false)); ptsF.forEach(p=>test(p,true));
      for(const p of ptsA){ if(segDist(p,hips,neck)<0.105) body++; }
      res.push({w:wi, s:sd, miss:+(hP.distanceTo(tg)*100).toFixed(1), bend:Math.round(bend), twist:Math.round(twist), pen, penF, nF:ptsF.length, what, body, h:hP.toArray().map(x=>+x.toFixed(3)), f:[Math.sin(w.rotation.y),0,Math.cos(w.rotation.y)]}); } });
  return res; };
return true; })()
"""
async def main():
    rows = []
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width': 320, 'height': 180})  # mintavételkor kicsi; a képekhez 960×540-re nő; pg.set_default_timeout(900000)
        pg.on('pageerror', lambda e: print('PAGEERR', str(e)[:300]))
        await pg.goto('file://' + html + '?render'); await pg.wait_for_function('window.ready===true||window.initError', timeout=900000)
        await pg.evaluate(JS)
        n = int(round((b1 - b0) / st)) + 1
        for i in range(n):
            bar = round(b0 + i * st, 4); t = bar * 240 / bpm
            await pg.evaluate('window.__noRender=true'); await pg.evaluate(f'window.renderAt({t})'); await pg.evaluate('window.R.composer.render()')
            r = json.loads(await pg.evaluate('JSON.stringify(window.__HC())'))
            for h in r:
                h['bar'] = bar; bad = h['miss'] > 2.5 or h['bend'] > 60 or h['twist'] > 45 or h['pen'] > 2 or h['penF'] > 0.4 * max(1, h['nF']) or h['body'] > 1; h['bad'] = bad; rows.append(h)
        if shots:
            import collections
            from PIL import Image, ImageDraw
            await pg.set_viewport_size({'width': 960, 'height': 540}); await pg.evaluate('window.__noRender=false'); await pg.add_style_tag(content='#c2d,#ui,#start,#snd,#hint{display:none!important}')
            bad = [h for h in rows if h['bad']]; seen = collections.OrderedDict()
            for h in bad:
                k = (h['w'], h['s'], round(h['bar']))
                if k not in seen: seen[k] = h
            tiles = []
            for h in list(seen.values())[:24]:
                t = h['bar'] * 240 / bpm; await pg.evaluate(f'window.renderAt({t})')
                x, y, z = h['h']; fx, _, fz = h['f']
                for ci, (cx, cy, cz) in enumerate([(x + fx * 0.75 - fz * 0.3, y + 0.25, z + fz * 0.75 + fx * 0.3), (x - fx * 0.15 + fz * 0.5, y + 0.7, z - fz * 0.15 - fx * 0.5)]):
                    await pg.evaluate(f"(()=>{{const C=window.R.camera;C.position.set({cx},{cy},{cz});C.fov=38;C.updateProjectionMatrix();C.lookAt({x},{y},{z});window.R.composer.render();}})()")
                    await pg.evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')
                    im = Image.open(io.BytesIO(await pg.screenshot(type='png', timeout=600000))).convert('RGB').crop((120, 0, 840, 540)).resize((400, 300))
                    d = ImageDraw.Draw(im); d.rectangle([0, 0, 400, 18], fill=(0, 0, 0)); d.ellipse([195, 145, 205, 155], outline=(0, 255, 255))
                    d.text((4, 3), f"b{h['bar']:g} W{h['w']}{h['s']} m{h['miss']} b{h['bend']} t{h['twist']} p{h['pen']} u{h['penF']} {list(h['what'])[:1]} body{h['body']}", fill=(255, 90, 90))
                    tiles.append(im)
            if tiles:
                cols = 4; rws = (len(tiles) + cols - 1) // cols; sh = Image.new('RGB', (cols * 400, rws * 300), (20, 20, 20))
                for i, im in enumerate(tiles): sh.paste(im, ((i % cols) * 400, (i // cols) * 300))
                base = (out or 'qa/hc').rsplit('.', 1)[0]; k = 0
                for y0 in range(0, sh.height, 2100): sh.crop((0, y0, sh.width, min(sh.height, y0 + 2100))).save(f'{base}_{k}.jpg', quality=82); k += 1
                print('képek:', k)
        await b.close()
    bad = [h for h in rows if h['bad']]
    print(f'{len(rows)} kéz-minta, {len(bad)} hibás')
    for h in bad[:400]:
        print(f"b{h['bar']:<7g} W{h['w']}{h['s']} miss {h['miss']:5.1f}  bend {h['bend']:3d}  twist {h['twist']:3d}  pen {h['pen']:3d} ujj {h['penF']}/{h['nF']} {h['what']}  body {h['body']}")
    if out: json.dump(rows, open(out, 'w'), ensure_ascii=False)
asyncio.run(main())

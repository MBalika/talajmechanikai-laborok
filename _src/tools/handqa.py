# Kéz-QA: minden megadott időpontban a reach-et használó, látható munkások mindkét kezéről két közeli kép (oldalról, elölről-felülről),
# a cél és a valós csukló eltérésével (cm). Kimenet: <out>.jpg kontaktlap (+ <out>.txt).
# Használat: bash tools/gate.sh python3 tools/handqa.py <video.html> <BPM> <ütemek: 1,2.5,…| from:to:step> <out_prefix>
import asyncio, sys, os, json, io
from playwright.async_api import async_playwright
from PIL import Image, ImageDraw
html=os.path.abspath(sys.argv[1]); bpm=float(sys.argv[2]); spec=sys.argv[3]; out=sys.argv[4]
if ':' in spec: a,b,s=[float(x) for x in spec.split(':')]; bars=[round(a+i*s,3) for i in range(int((b-a)/s)+1)]
else: bars=[float(x) for x in spec.split(',')]
JS_LIST = """(()=>{const r=[]; let i=0; window.R.scene.traverse(o=>{ const u=o.userData; if(u&&u.B&&u.body){ const idx=i++; if(!o.visible||!u.reach) return; let vis=true, p=o; while(p){ if(!p.visible) vis=false; p=p.parent; } if(!vis) return; o.updateWorldMatrix(true,true);
  const q=new window.R.camera.quaternion.constructor(); o.getWorldQuaternion(q); const f=new window.R.camera.position.constructor(0,0,1).applyQuaternion(q), s=new window.R.camera.position.constructor(-1,0,0).applyQuaternion(q);
  for(const sd of ['L','R']){ const rc=u.reach[sd]; if(!rc||!rc.local) continue; if((rc.w??1)<0.5) continue; const tg=rc.obj?(rc.obj.updateWorldMatrix(true,false),rc.obj.localToWorld(rc.local.clone())):o.localToWorld(rc.local.clone()); const h=u.B['hand.'+sd].getWorldPosition(tg.clone()); const fp=u.B['fing.'+sd].getWorldPosition(tg.clone()); const cen=fp.clone().lerp(h,0.15);
   r.push({w:idx, s:sd, h:cen.toArray(), miss:+(h.distanceTo(tg)*100).toFixed(1), f:f.toArray(), r:s.toArray()}); } } }); return JSON.stringify(r);})()"""
async def main():
    tiles=[]; log=[]
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        pg=await b.new_page(viewport={'width':1920,'height':1080}); pg.set_default_timeout(900000)
        await pg.goto('file://'+html+'?render'); await pg.wait_for_function('window.ready===true||window.initError',timeout=900000)
        await pg.add_style_tag(content='#c2d,#ui,#start,#snd,#hint{display:none!important}')
        for bar in bars:
            t=bar*240/bpm
            await pg.evaluate("(()=>{const C=window.R.camera; if(window.__near0){C.near=window.__near0;C.updateProjectionMatrix();}})()")
            await pg.evaluate(f'window.renderAt({t})'); await pg.evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')
            hands=json.loads(await pg.evaluate(JS_LIST))
            for hd in hands:
                hx,hy,hz=hd['h']; fx,fy,fz=hd['f']; rx,ry,rz=hd['r']; sg = -1 if hd['s']=='L' else 1  # oldalnézet a kéz felőli oldalról
                cams=[(hx-fx*0.2+sg*rx*0.45, hy+0.8, hz-fz*0.2+sg*rz*0.45), (hx+fx*0.7+sg*rx*0.55, hy+0.18, hz+fz*0.7+sg*rz*0.55)]  # felülről a válla fölött · elölről-oldalról
                for ci,(cx,cy,cz) in enumerate(cams):
                    await pg.evaluate(f"(()=>{{const C=window.R.camera;C.position.set({cx},{cy},{cz});C.fov=38;C.updateProjectionMatrix();C.lookAt({hx},{hy},{hz});window.R.composer.render();}})()")
                    await pg.evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')
                    png=await pg.screenshot(type='png')
                    im=Image.open(io.BytesIO(png)).convert('RGB').crop((240,0,1680,1080)).resize((400,300)); d=ImageDraw.Draw(im)
                    d.ellipse([195,145,205,155],outline=(0,255,255)); lab=f"b{bar:g} W{hd['w']} {hd['s']} {'felül' if ci==0 else 'elöl'} miss {hd['miss']}"; d.rectangle([0,0,400,18],fill=(0,0,0)); d.text((4,3),lab,fill=(255,230,0) if hd['miss']<1.5 else (255,80,80))
                    tiles.append(im)
                log.append(f"b{bar:g} W{hd['w']} {hd['s']} miss {hd['miss']} cm")
            print('bar',bar,len(hands),'kéz',flush=True)
        await b.close()
    open(out+'.txt','w').write('\n'.join(log))
    if not tiles: print('nincs reach-es kéz'); return
    cols=4; rows=(len(tiles)+cols-1)//cols; sheet=Image.new('RGB',(cols*400,rows*300),(20,20,20))
    for i,im in enumerate(tiles): sheet.paste(im,((i%cols)*400,(i//cols)*300))
    # túl magas lap: darabolás
    H=sheet.height; k=0
    for y0 in range(0,H,2000):
        sheet.crop((0,y0,sheet.width,min(H,y0+2000))).save(f'{out}_{k}.jpg',quality=82); k+=1
    print('lapok:',k, 'kéz-kép:',len(tiles))
asyncio.run(main())

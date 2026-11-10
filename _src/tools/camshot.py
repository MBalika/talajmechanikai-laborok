# Szabad kamerás közeli kép: python3 tools/camshot.py <html> <BPM> <out_prefix> "<bar>:<cx>,<cy>,<cz>:<tx>,<ty>,<tz>[:fov]" ...
# A célpont lehet "handL"/"handR" is (a laboráns keze) – ekkor a cx,cy,cz eltolás a kézhez képest.
import asyncio, sys, os
from playwright.async_api import async_playwright
html = os.path.abspath(sys.argv[1]); BPM = float(sys.argv[2]); pref = sys.argv[3]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width': 1920, 'height': 1080}); pg.set_default_timeout(300000)
        pg.on('pageerror', lambda e: print('PAGEERR', str(e)[:300]))
        await pg.goto('file://' + html + '?render'); await pg.wait_for_function('window.ready === true || window.initError')
        for k, spec in enumerate(sys.argv[4:]):
            parts = spec.split(':'); bar = float(parts[0]); c = [float(v) for v in parts[1].split(',')]; tg = parts[2]; fov = float(parts[3]) if len(parts) > 3 else 30
            t = bar * 240 / BPM
            js = f"""(()=>{{ window.renderAt({t}); const R = window.R; document.getElementById('c2d').style.display='none';
              let T; const tg = '{tg}';
              if (tg.startsWith('hand')) {{ const w = window.__workers.filter(w=>w.visible).slice(-1)[0]; const sd = tg.slice(4); const h = w.userData.B['hand.'+sd]; T = h.getWorldPosition(R.camera.position.clone()); }}
              else {{ const a = tg.split(',').map(Number); T = R.camera.position.clone().set(a[0],a[1],a[2]); }}
              const c = [{c[0]},{c[1]},{c[2]}]; const P = tg.startsWith('hand') ? T.clone().add(R.camera.position.clone().set(c[0],c[1],c[2])) : R.camera.position.clone().set(c[0],c[1],c[2]);
              R.camera.position.copy(P); R.camera.lookAt(T); R.camera.fov = {fov}; R.camera.near = 0.005; R.camera.updateProjectionMatrix(); R.composer.render(); return true; }})()"""
            await pg.evaluate(js)
            await pg.screenshot(path=f'{pref}_{k:02d}.jpg', quality=82, type='jpeg'); print('ok', spec)
        await b.close()
asyncio.run(main())

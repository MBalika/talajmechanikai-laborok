# Fogás-hibakereső: adott ütemekben a laboráns kezeinek ujjhegyei a célpontokhoz képest (cm) + kéz-közeli képek több szögből.
# Használat: python3 tools/gripdbg.py <html> <BPM> <out_prefix> <bar> [<bar> ...]
import asyncio, sys, os, json
from playwright.async_api import async_playwright
html = os.path.abspath(sys.argv[1]); BPM = float(sys.argv[2]); pref = sys.argv[3]; bars = [float(b) for b in sys.argv[4:]]
JS = r"""(bar)=>{ const t = bar*240/%BPM%; window.__dbgTips = true; window.renderAt(t); const R = window.R; const w = window.__workers.filter(w=>w.visible).slice(-1)[0]; const u = w.userData, B = u.B;
  const out = { bar, lean: u.reach && u.reach.lean };
  for (const sd of ['L','R']) { const rc = u.reach && u.reach[sd]; if (!rc) continue; const tips = {};
    const ft = window.__fingerTips(w, sd); for (const c of 'TIMRP') tips[c] = ft[c];
    const res = { w: rc.w, fingers: typeof rc.fingers === 'string' ? rc.fingers : JSON.stringify(rc.fingers) };
    if (rc._tips) for (const c in rc._tips) res[c] = +(rc._tips[c].distanceTo(tips[c])*100).toFixed(1);
    const h = B['hand.'+sd].getWorldPosition(new R.camera.position.constructor()); res.wrist = rc.W ? +(h.distanceTo(rc._W || rc.W)*100).toFixed(1) : null; const shp = B['uarm.'+sd].getWorldPosition(new R.camera.position.constructor()); res.shW = rc.W ? +(shp.distanceTo(rc.W)*100).toFixed(1) : null; res.shLocal = w.worldToLocal(shp.clone()).toArray().map(x=>+x.toFixed(3)); res.Wlocal = rc.W ? w.worldToLocal(rc.W.clone()).toArray().map(x=>+x.toFixed(3)) : null; if (rc._arm) res.arm = { flex: Math.round(rc._arm.flex), dev: Math.round(rc._arm.dev), pr: Math.round(rc._arm.pr), c: Math.round(rc._arm.c), a: +(rc._arm.a ?? 0).toFixed(2), phi: +(rc._arm.phi ?? 0).toFixed(2), rng: rc.free ? [rc.free.a0, rc.free.a1] : null }; out[sd] = res; }
  return out; }"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width': 1920, 'height': 1080}); pg.set_default_timeout(300000)
        pg.on('pageerror', lambda e: print('PAGEERR', str(e)[:300]))
        await pg.goto('file://' + html + '?render'); await pg.wait_for_function('window.ready === true || window.initError')
        for bar in bars:
            r = await pg.evaluate(JS.replace('%BPM%', str(BPM)), bar); print(json.dumps(r))
            for k, (dx, dy, dz) in enumerate([(0.0, 0.18, -0.32), (0.3, 0.08, -0.12), (-0.3, 0.08, -0.12), (0.0, 0.35, 0.02)]):
                js = f"""(()=>{{ const R = window.R; document.getElementById('c2d').style.display='none'; const w = window.__workers.filter(w=>w.visible).slice(-1)[0];
                  const rc = w.userData.reach; const sd = rc && rc.R ? 'R' : 'L'; const h = w.userData.B['hand.'+sd]; const T = h.getWorldPosition(R.camera.position.clone()); const f = w.userData.B['fing.'+sd].getWorldPosition(R.camera.position.clone()); T.lerp(f, 0.8);
                  R.camera.position.copy(T).add(R.camera.position.clone().set({dx},{dy},{dz})); R.camera.lookAt(T); R.camera.fov = 38; R.camera.near = 0.005; R.camera.updateProjectionMatrix(); R.composer.render(); return true; }})()"""
                await pg.evaluate(js); await pg.screenshot(path=f'{pref}_{bar:05.1f}_{k}.jpg', quality=80, type='jpeg')
        await b.close()
asyncio.run(main())

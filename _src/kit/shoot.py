import asyncio, sys, time, os
from playwright.async_api import async_playwright
# usage: shots.py out_prefix t1 t2 ... (seconds) ; prefix 'b:' for bars
html = os.path.abspath(sys.argv[1]); BPMV = float(os.environ.get('BPM','124'))
pref = sys.argv[2]
BEAT = 60/float(os.environ.get('BPM','124'))
ts = []
for a in sys.argv[3:]:
    if a.startswith('b'): ts.append(float(a[1:])*4*BEAT)
    else: ts.append(float(a))
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width':1920,'height':1080})
        pg.on('console', lambda m: print('CONSOLE', m.type, m.text[:400]) if m.type in ('error','warning') else None)
        pg.on('pageerror', lambda e: print('PAGEERR', str(e)[:800]))
        pg.set_default_timeout(180000)
        await pg.goto('file://' + html + '?render')
        try:
            await pg.wait_for_function('window.ready === true || window.initError', timeout=180000)
        except Exception as e:
            print('timeout', e)
        err = await pg.evaluate('window.initError || null')
        if err: print('INITERR', err); return
        for t in ts:
            t0 = time.time()
            await pg.evaluate(f'window.renderAt({t})')
            await pg.evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')
            await pg.screenshot(path=f'{pref}_{t:07.2f}.jpg', quality=82, type='jpeg')
            print('shot', round(t,2), 'bar', round(t/(4*BEAT),2), round(time.time()-t0,2),'s')
        await b.close()
asyncio.run(main())

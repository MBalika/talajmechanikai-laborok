# 8,75 s-os snitt képkockái a kari videóhoz (hideg nyitás): A = felirattal (2D réteg), B = felirat nélkül (#c2d elrejtve)
# Használat: python3 tools/snitt.py <video.html> <ki_mappa> <t0> <t1> [fps=25]
import asyncio, sys, os
from playwright.async_api import async_playwright
html, out, t0, t1 = os.path.abspath(sys.argv[1]), sys.argv[2], float(sys.argv[3]), float(sys.argv[4]); fps = float(sys.argv[5]) if len(sys.argv) > 5 else 25
for v in 'ab': os.makedirs(f'{out}/{v}', exist_ok=True)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width': 1920, 'height': 1080}); pg.set_default_timeout(180000)
        pg.on('pageerror', lambda e: print('PAGEERR', str(e)[:400]))
        await pg.goto('file://' + html + '?render'); await pg.wait_for_function('window.ready === true || window.initError', timeout=180000)
        n = int(round((t1 - t0) * fps)) + 1
        for i in range(n):
            t = t0 + i / fps
            await pg.evaluate(f'window.renderAt({t})'); await pg.evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')
            await pg.screenshot(path=f'{out}/a/f_{i:04d}.jpg', quality=92, type='jpeg')
            await pg.evaluate("document.getElementById('c2d').style.visibility='hidden'")
            await pg.screenshot(path=f'{out}/b/f_{i:04d}.jpg', quality=92, type='jpeg')
            await pg.evaluate("document.getElementById('c2d').style.visibility='visible'")
            if i % 25 == 0: print(i, n, flush=True)
        await b.close()
asyncio.run(main())

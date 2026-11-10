# A teljes videó képkockái MP4-hez (felirattal): python3 tools/mp4frames.py <video.html> <ki_mappa> <i0> <i1> [fps=25] [w=1280]
# A már meglévő képkockákat átugorja, így megszakítás után folytatható; több példány futhat különböző tartományokra.
import asyncio, sys, os, time
from playwright.async_api import async_playwright
html, out = os.path.abspath(sys.argv[1]), sys.argv[2]; i0, i1 = int(sys.argv[3]), int(sys.argv[4]); fps = float(sys.argv[5]) if len(sys.argv) > 5 else 25; W = int(sys.argv[6]) if len(sys.argv) > 6 else 1280; PR = float(sys.argv[7]) if len(sys.argv) > 7 else 1.0
os.makedirs(out, exist_ok=True)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width': 1920, 'height': 1080}, device_scale_factor=W / 1920); pg.set_default_timeout(300000)
        pg.on('pageerror', lambda e: print('PAGEERR', str(e)[:400], flush=True))
        await pg.goto('file://' + html + '?render'); await pg.wait_for_function('window.ready === true || window.initError', timeout=300000)
        if PR != 1.0: await pg.evaluate(f"(() => {{ const R = window.R; R.renderer.setPixelRatio({PR}); if (R.composer.setPixelRatio) R.composer.setPixelRatio({PR}); R.composer.setSize(1920, 1080); }})()")
        t_start = time.time(); done = 0
        for i in range(i0, i1):
            f = f'{out}/f_{i:05d}.jpg'
            if os.path.exists(f) and os.path.getsize(f) > 1000: continue
            await pg.evaluate(f'window.renderAt({i / fps})')
            await pg.screenshot(path=f + '.tmp', quality=90, type='jpeg'); os.replace(f + '.tmp', f); done += 1
            if done % 50 == 0: print(f'{i} ({done} kész, {(time.time() - t_start) / done:.2f} s/kocka)', flush=True)
        await b.close()
asyncio.run(main())

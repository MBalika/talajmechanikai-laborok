# Vibrálás (z-fighting) keresése: ugyanazt az időpontot kétszer rendereli, másodszor 1,3-szoros közeli vágósíkkal (window.__nearMul).
# A valódi tartalom alig változik, a mélységütköző felületek viszont "átbillennek" – a sok nagy eltérésű pixel jelzi a vibrálást.
# Használat: python3 tools/zfight.py <video.html> <bpm> <b0> <b1> <lépés> [ki_mappa]
import asyncio, sys, os, io
import numpy as np
from PIL import Image
from playwright.async_api import async_playwright
html = os.path.abspath(sys.argv[1]); bpm = float(sys.argv[2]); b0, b1, st = map(float, sys.argv[3:6]); out = sys.argv[6] if len(sys.argv) > 6 else None
BAR = 240 / bpm
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width': 960, 'height': 540}); pg.set_default_timeout(180000)
        await pg.goto('file://' + html + '?render'); await pg.wait_for_function('window.ready === true || window.initError', timeout=180000)
        await pg.evaluate("document.getElementById('c2d').style.visibility='hidden'")
        if out: os.makedirs(out, exist_ok=True)
        bar = b0
        while bar <= b1 + 1e-9:
            t = bar * BAR
            await pg.evaluate(f'window.renderAt({t})')
            A = np.asarray(Image.open(io.BytesIO(await pg.screenshot(type='png'))).convert('L'), dtype=np.int16)
            await pg.evaluate(f'(() => {{ window.__nearMul = 1.3; window.renderAt({t}); window.__nearMul = 1; }})()')
            Bm = np.asarray(Image.open(io.BytesIO(await pg.screenshot(type='png'))).convert('L'), dtype=np.int16)
            d = np.abs(A - Bm); big = (d > 48)
            # elszigetelt foltok: a nagy eltérésű pixelek aránya 8×8-as cellákban
            h, w = big.shape; cells = big[:h // 8 * 8, :w // 8 * 8].reshape(h // 8, 8, w // 8, 8).mean(axis=(1, 3))
            score = float((cells > 0.08).mean())
            print(f'{bar:6.2f} {t:7.2f} {score:.4f}', flush=True)
            if out and score > 0.004:
                m = (np.clip(d * 3, 0, 255)).astype(np.uint8); Image.fromarray(m).save(f'{out}/zf_{bar:06.2f}.png')
                Image.fromarray(A.astype(np.uint8)).save(f'{out}/fr_{bar:06.2f}.png')
            bar += st
        await b.close()
asyncio.run(main())

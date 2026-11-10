# Indexkép a weboldalhoz: a videó 3D-képe felirat nélkül (a 2D réteg rejtve), 960×540 JPEG.
# Használat: python3 tools/tf_poster.py <video.html> <idő_s> <kimenet.jpg>  (gate.sh-n át)
import asyncio, sys, os, io
from playwright.async_api import async_playwright
from PIL import Image
html, t, out = os.path.abspath(sys.argv[1]), float(sys.argv[2]), sys.argv[3]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width':1920,'height':1080})
        pg.set_default_timeout(300000)
        await pg.goto('file://' + html + '?render')
        await pg.wait_for_function('window.ready === true || window.initError', timeout=300000)
        await pg.add_style_tag(content='#c2d,#ui,#start,#snd,#hint{display:none!important}')
        await pg.evaluate(f'window.renderAt({t})')
        await pg.evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')
        png = await pg.screenshot(type='png')
        await b.close()
    im = Image.open(io.BytesIO(png)).convert('RGB').resize((960, 540), Image.LANCZOS)
    im.save(out, quality=84, optimize=True, progressive=True)
    print('poster', out, os.path.getsize(out) // 1024, 'KB')
asyncio.run(main())

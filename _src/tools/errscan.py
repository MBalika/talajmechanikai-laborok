import asyncio, sys, os
from playwright.async_api import async_playwright
html=os.path.abspath(sys.argv[1]); bpm=float(sys.argv[2]); b0,b1,st=map(float,sys.argv[3:6])
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={'width':320,'height':180}); pg.set_default_timeout(600000)
        await pg.goto('file://'+html+'?render'); await pg.wait_for_function('window.ready===true||window.initError')
        await pg.evaluate('window.__noRender=true')
        bar=b0; n=0
        while bar<=b1:
            t=bar*240/bpm
            r=await pg.evaluate(f"(()=>{{try{{window.renderAt({t}); window.R.composer.render(); return null;}}catch(e){{return String(e)+' | '+(e.stack||'').split('\\n').slice(0,4).join(' / ');}}}})()")
            if r: print('HIBA b', round(bar,2), r[:400]); n+=1
            if n>3: break
            bar+=st
        print('kész'); await b.close()
asyncio.run(main())

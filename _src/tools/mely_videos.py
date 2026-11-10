# a kész mélyalapozás-videókat a melyalapozasok app video/v1–v5.html fájljaiba másolja (autoplay + Esc), bélyegképpel
import sys, os, shutil
V = [('x1_alapjai', 'Melyalapozas_1_Alapjai'), ('x2_kiszoritas', 'Melyalapozas_2_Kiszoritas_es_furat'), ('x3_resallekonysag', 'Melyalapozas_3_Resallekonysag'),
     ('x4_kut_keszon', 'Melyalapozas_4_Kut_szekreny_keszon'), ('x5_osszefoglalo', 'Melyalapozas_5_Osszefoglalo')]
INJ = """<script>(function(){if(location.hash.indexOf('autoplay')<0)return;var n=0,iv=setInterval(function(){n++;var b=document.getElementById('pp');if(window.ready===true&&b){clearInterval(iv);b.click();}if(n>600)clearInterval(iv);},100);addEventListener('keydown',function(e){if(e.key==='Escape'&&parent!==window&&!document.fullscreenElement)parent.postMessage({type:'mt-video-close'},'*');});})();</script>"""
APP = '/home/claude/melyalapozasok'
os.makedirs(APP + '/video', exist_ok=True); os.makedirs(APP + '/img/thumb', exist_ok=True)
only = set(sys.argv[1:])
for i, (d, f) in enumerate(V, 1):
    if only and str(i) not in only: continue
    src = f'/home/claude/work/videos/{d}/dist/{f}.html'
    if not os.path.exists(src): print('nincs még', src); continue
    s = open(src, encoding='utf-8').read()
    k = s.rfind('</body>'); assert k > 0
    s = s[:k] + INJ + s[k:]
    open(f'{APP}/video/v{i}.html', 'w', encoding='utf-8').write(s)
    th = f'/home/claude/work/videos/{d}/thumb.jpg'
    if os.path.exists(th): shutil.copy(th, f'{APP}/img/thumb/v{i}.jpg')
    print('v%d' % i, os.path.getsize(src) // 1024, 'KB', 'thumb' if os.path.exists(th) else 'NINCS thumb')

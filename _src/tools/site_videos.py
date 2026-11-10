# a kész videókat a weboldal video/v1–v5.html fájljaiba másolja, autoplay + Esc befecskendezéssel
import sys, os
V = [('s1_elcsuszas', '1_Elcsuszas_video'), ('s2_felborulas', '2_Felborulas_video'), ('s3_feluszas', '3_Feluszas_video'), ('s4_altalanos', '4_Altalanos_allekonysag_video'), ('s5_osszefoglalo', '5_Osszefoglalo_kviz_video')]
INJ = """<script>(function(){if(location.hash.indexOf('autoplay')<0)return;var n=0,iv=setInterval(function(){n++;var b=document.getElementById('pp');if(window.ready===true&&b){clearInterval(iv);b.click();}if(n>600)clearInterval(iv);},100);addEventListener('keydown',function(e){if(e.key==='Escape'&&parent!==window&&!document.fullscreenElement)parent.postMessage('vclose','*');});})();</script>"""
only = set(sys.argv[1:])
for i, (d, f) in enumerate(V, 1):
    if only and str(i) not in only: continue
    src = f'/home/claude/work/videos/{d}/dist/{f}.html'
    s = open(src, encoding='utf-8').read()
    k = s.rfind('</body>'); assert k > 0
    s = s[:k] + INJ + s[k:]
    open(f'/home/claude/site/video/v{i}.html', 'w', encoding='utf-8').write(s)
    print('v%d' % i, os.path.getsize(src) // 1024, 'KB')

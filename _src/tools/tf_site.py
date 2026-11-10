# A talajfelderítés-videókat (önálló HTML) a talajfelderites.vercel.app video/<kulcs>.html fájljaiba másolja.
# Befecskendezés: MP4-export gomb rejtve; #autoplay → indítás, ha kész; Esc → 'vclose' a szülőnek; rejtett lapon szünet.
# Használat: python3 tools/tf_site.py [dir ...]   (üresen: mind a 17)
import sys, os, re
SITE = '/home/claude/talajfelderites'
MAP = [('tf_hord', 'hordozhato'), ('tf_gsp', 'gepispiral'), ('tf_hsa', 'uregescso'), ('tf_gbs', 'geobor'), ('tf_cptu', 'cptu'),
       ('tf_dp', 'dp'), ('tf_spt', 'spt'), ('tf_vst', 'szarnyas'), ('tf_pmt', 'pressziometer'), ('tf_dmt', 'dmt'),
       ('tf_emi', 'geo-em'), ('tf_gpr', 'geo-gpr'), ('tf_ert', 'geo-ert'), ('tf_mag', 'geo-mag'), ('tf_ref', 'geo-refrakcio'),
       ('tf_rfl', 'geo-reflexio'), ('tf_masw', 'geo-masw')]
NAMES = dict(l.split('\t')[:2] for l in open('/home/claude/work/tools/tf_list.txt', encoding='utf-8').read().strip().split('\n'))
HEAD = '<style>#exp{display:none!important}</style>'
INJ = ("<script>(function(){"
       "var pp=function(){return document.getElementById('pp')},on=function(){var b=pp();return !!b&&/Sz/.test(b.textContent)};"
       "if(location.hash.indexOf('autoplay')>=0){var n=0,iv=setInterval(function(){n++;var b=pp();if(window.ready===true&&b){clearInterval(iv);if(!on())b.click();}if(n>900)clearInterval(iv);},100);}"
       "addEventListener('keydown',function(e){if(e.key==='Escape'&&parent!==window&&!document.fullscreenElement&&!document.webkitFullscreenElement)parent.postMessage('vclose','*');});"
       "document.addEventListener('visibilitychange',function(){if(document.hidden&&on())pp().click();});"
       "addEventListener('message',function(e){if(e.data==='vpause'&&on())pp().click();});"
       "})();</script>")
only = set(sys.argv[1:])
os.makedirs(SITE + '/video', exist_ok=True)
for d, key in MAP:
    if only and d not in only: continue
    src = f'/home/claude/work/videos/{d}/dist/{NAMES[d]}.html'
    if not os.path.exists(src): print('NINCS', src); continue
    s = open(src, encoding='utf-8').read()
    h = s.find('</head>'); assert h > 0
    s = s[:h] + HEAD + s[h:]
    k = s.rfind('</body>'); assert k > 0
    s = s[:k] + INJ + s[k:]
    open(f'{SITE}/video/{key}.html', 'w', encoding='utf-8').write(s)
    print(f'{key:14s}', os.path.getsize(src) // 1024, 'KB')

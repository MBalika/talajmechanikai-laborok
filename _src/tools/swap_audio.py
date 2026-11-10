"""Kicseréli egy kész videó-HTML beágyazott zenéjét (data:audio/mpeg;base64,…) egy új MP3-ra; minden más bájt változatlan marad.
Használat: python3 swap_audio.py <be.html> <uj.mp3> <ki.html>   (be és ki lehet ugyanaz)"""
import sys, re, base64, subprocess, tempfile, os
src, mp3, dst = sys.argv[1:4]
s = open(src, encoding='utf-8').read()
m = list(re.finditer(r'data:audio/mpeg;base64,([A-Za-z0-9+/=]+)', s))
assert len(m) == 1, f'{len(m)} beágyazott hang'
old = base64.b64decode(m[0].group(1))
def dur(b):
    with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as f: f.write(b); p = f.name
    d = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p], capture_output=True, text=True).stdout.strip()); os.unlink(p); return d
new = open(mp3, 'rb').read()
d0, d1 = dur(old), dur(new)
assert abs(d0 - d1) < 0.6, f'hosszeltérés: régi {d0:.2f} s, új {d1:.2f} s'
out = s[:m[0].start(1)] + base64.b64encode(new).decode() + s[m[0].end(1):]
open(dst, 'w', encoding='utf-8').write(out)
print(f'{os.path.basename(dst)}: zene cserélve ({d0:.2f} s → {d1:.2f} s), {len(s)//1024} → {len(out)//1024} KB')

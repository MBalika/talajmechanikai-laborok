// a talajfelderítés-videók hossza (TOTAL) – a weboldal VIDEOS.dur mezőjéhez
import fs from 'fs';
const L = fs.readFileSync('/home/claude/work/tools/tf_list.txt', 'utf8').trim().split('\n').map(l => l.split('\t'));
for (const [d] of L) {
  try { const m = await import(`/home/claude/work/videos/${d}/timeline.js`); const t = m.TOTAL, s = Math.round(t);
    console.log(d, t.toFixed(1), `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`, 'BPM', m.BPM); }
  catch (e) { console.log(d, 'ERR', e.message.slice(0, 80)); }
}

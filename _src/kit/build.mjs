// node kit/build.mjs videos/<id> <Kimeneti_nev> "<Cím>"
import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
const [dir, outName, title] = process.argv.slice(2);
const r = await esbuild.build({ entryPoints: [path.join(dir, 'main.js')], bundle: true, format: 'iife', write: false, minify: true, target: 'es2020',
  loader: { '.woff2': 'dataurl', '.mp3': 'dataurl', '.jpg': 'dataurl' }, legalComments: 'eof', nodePaths: [path.resolve('node_modules')] });
const js = r.outputFiles[0].text.replace(/<\/script>/g, '<\\/script>');
const html = `<!doctype html><html lang="hu"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>html,body{margin:0;background:#000;overflow:hidden}#wrap{position:relative;width:1920px;height:1080px}
canvas{position:absolute;left:0;top:0;width:1920px;height:1080px;display:block}</style></head>
<body><div id="wrap"><canvas id="c3d" width="1920" height="1080"></canvas><canvas id="c2d" width="1920" height="1080"></canvas></div>
<script>${js}</script></body></html>`;
const art = `<meta charset="utf-8">
<title>${title}</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>
:root{ --bg:#000; --fg:#f7f4ee; color-scheme:dark }
html,body{height:100%}
body{margin:0;background:var(--bg);color:var(--fg);overflow:hidden;padding-left:max(16px, env(safe-area-inset-left, 0px));padding-right:max(16px, env(safe-area-inset-right, 0px))}
#wrap{position:relative;width:1920px;height:1080px}
canvas{position:absolute;left:0;top:0;width:1920px;height:1080px;display:block}
</style>
<div id="wrap"><canvas id="c3d" width="1920" height="1080"></canvas><canvas id="c2d" width="1920" height="1080"></canvas></div>
<script>window.__NO_EXPORT = true;</script>
<script>${js}</script>`;
fs.mkdirSync(path.join(dir, 'dist'), { recursive: true });
fs.writeFileSync(path.join(dir, 'dist', outName + '.html'), html);
fs.writeFileSync(path.join(dir, 'dist', 'artifact.html'), art);
console.log('built', outName, (html.length / 1e6).toFixed(2), 'MB');

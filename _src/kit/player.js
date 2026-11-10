// Lejátszó + MP4-export (a térfogatváltozó-videó player.js-e alapján)
import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
export function setupPlayer({ renderAt: renderAt2, total, audioUrl, title = "video", c3d, c2d }) {
  const W2 = 1920, H3 = 1080;
  const wrap = document.getElementById("wrap");
  const audio = new Audio();
  audio.src = audioUrl;
  audio.preload = "auto";
  // a beágyazott (data:) hangot blob-URL-re cseréljük: mobil Safariban így biztosan tekerhető
  if (/^data:/.test(audioUrl)) fetch(audioUrl).then((r) => r.blob()).then((b) => { if (!playing) { audio.src = URL.createObjectURL(b); audio.load(); } }).catch(() => {});
  let needTap = false;
  let playing = false, tNow = 0, lastWall = 0, exporting = false;
  const css = document.createElement("style");
  css.textContent = `
body{background:#000;margin:0;overflow:hidden;font-family:Inter,Arial,sans-serif}
#wrap{position:absolute;left:50%;top:50%;transform-origin:0 0}
#ui{position:fixed;left:0;right:0;bottom:0;padding:14px 22px 18px;background:linear-gradient(transparent,rgba(0,0,0,.75));color:#fff;display:flex;gap:14px;align-items:center;transition:opacity .4s;z-index:5}
#ui.hide{opacity:0}
#ui button{background:rgba(255,255,255,.12);color:#fff;border:1px solid rgba(255,255,255,.2);border-radius:8px;padding:8px 14px;font:600 14px Inter,Arial;cursor:pointer}
#ui button:hover{background:rgba(255,255,255,.22)}
#ui input[type=range]{flex:1;accent-color:#F0A33A}
#time{font:600 14px Inter,Arial;min-width:110px;text-align:center;opacity:.85}
#ex{position:fixed;inset:0;background:rgba(0,0,0,.82);display:none;align-items:center;justify-content:center;flex-direction:column;color:#fff;z-index:10;gap:16px}
#ex .bar{width:520px;height:10px;background:rgba(255,255,255,.15);border-radius:6px;overflow:hidden}
#ex .fill{height:100%;width:0;background:#F0A33A}
#start{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:6;cursor:pointer}
#start div{background:rgba(0,0,0,.65);color:#fff;border:2px solid #F0A33A;border-radius:60px;padding:22px 40px;font:700 26px Inter,Arial}
#snd{position:fixed;left:50%;top:18px;transform:translateX(-50%);z-index:7;display:none;background:rgba(0,0,0,.72);color:#fff;border:2px solid #F0A33A;border-radius:40px;padding:12px 22px;font:700 18px Inter,Arial;cursor:pointer;white-space:nowrap}
#hint{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:8;display:none;background:rgba(0,0,0,.8);color:#fff;border-radius:14px;padding:14px 20px;font:600 16px Inter,Arial;text-align:center;max-width:80vw}
@media (pointer:coarse){#ui{padding:10px 12px 14px;gap:8px;flex-wrap:wrap}#ui button{padding:10px 12px;font-size:15px}#exp{display:none}#time{min-width:0}}`;
  document.head.appendChild(css);
  const ui = document.createElement("div");
  ui.id = "ui";
  ui.innerHTML = `<button id="pp">\u25B6 Lej\xE1tsz\xE1s</button><span id="time">0:00 / 0:00</span><input id="seek" type="range" min="0" max="${total}" step="0.01" value="0"><button id="fs">\u2922 Teljes k\xE9perny\u0151</button><button id="exp">\u2B07 MP4 export (1080p)</button>`;
  document.body.appendChild(ui);
  if (window.__NO_EXPORT) { const eb = document.getElementById('exp'); if (eb) eb.hidden = true; }
  const ex = document.createElement("div");
  ex.id = "ex";
  ex.innerHTML = `<div style="font:700 22px Inter">MP4 k\xE9sz\xFCl\u2026</div><div class="bar"><div class="fill"></div></div><div id="exinfo" style="opacity:.75;font:500 14px Inter">Ne z\xE1rd be az ablakot.</div><button id="excancel" style="background:#333;color:#fff;border:1px solid #666;border-radius:8px;padding:8px 14px">M\xE9gse</button>`;
  document.body.appendChild(ex);
  const st = document.createElement("div");
  st.id = "start";
  st.innerHTML = "<div>\u25B6 Kattints a lej\xE1tsz\xE1shoz</div>";
  document.body.appendChild(st);
  const snd = document.createElement("button");
  snd.id = "snd"; snd.type = "button"; snd.textContent = "\u{1F50A} Koppints a hang bekapcsolásához";
  document.body.appendChild(snd);
  const hint = document.createElement("div");
  hint.id = "hint"; document.body.appendChild(hint);
  let hintT = 0; const showHint = (s) => { hint.textContent = s; hint.style.display = "block"; clearTimeout(hintT); hintT = setTimeout(() => hint.style.display = "none", 2800); };
  // hang indítása érintésre (mobilon az automatikus lejátszás csak némán engedélyezett)
  const startAudio = () => { if (!playing) return; try { audio.currentTime = tNow; } catch (e) {} const pr = audio.play(); if (pr && pr.then) pr.then(() => { needTap = false; snd.style.display = "none"; }).catch(() => {}); };
  snd.onclick = (e) => { e.stopPropagation(); startAudio(); };
  addEventListener("pointerdown", () => { if (needTap && playing) startAudio(); }, true);
  audio.addEventListener("playing", () => { if (Math.abs(audio.currentTime - tNow) > 0.4) { try { audio.currentTime = tNow; } catch (e) {} } });
  const $ = (id) => document.getElementById(id);
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  function fit() {
    const k = Math.min((innerWidth - (window.__NO_EXPORT ? 32 : 0)) / W2, innerHeight / H3);
    wrap.style.transform = `scale(${k}) translate(-50%,-50%)`;
    wrap.style.width = W2 + "px";
    wrap.style.height = H3 + "px";
  }
  addEventListener("resize", fit);
  fit();
  function play() {
    if (tNow >= total - 0.05) tNow = 0;
    try { audio.currentTime = tNow; } catch (e) {}
    playing = true;
    const pr = audio.play();
    if (pr && pr.then) pr.then(() => { needTap = false; snd.style.display = "none"; }).catch(() => { needTap = true; snd.style.display = "block"; });
    lastWall = performance.now();
    $("pp").textContent = "\u275A\u275A Sz\xFCnet";
    st.style.display = "none";
  }
  function pause() {
    audio.pause();
    playing = false;
    snd.style.display = "none";
    $("pp").textContent = "\u25B6 Lej\xE1tsz\xE1s";
  }
  $("pp").onclick = () => playing ? pause() : play();
  st.onclick = () => play();
  if (/autoplay/.test(location.hash)) play(); // beágyazott oldalról (#autoplay) azonnal indul; hangtiltásnál a „hang” gomb jelenik meg
  $("seek").oninput = (e) => {
    tNow = +e.target.value;
    audio.currentTime = tNow;
    if (!playing) renderAt2(tNow);
  };
  // teljes képernyő: szabványos API, Safari-előtag, végül (iPhone) a beágyazó oldal teljes ablakos módja
  const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
  const fallbackFS = () => { if (window.parent !== window) window.parent.postMessage("vfs", "*"); else showHint("Fordítsd el a telefont a nagyobb képhez."); };
  // ha a beágyazó oldal jelzi, hogy ő kezeli a teljes képernyőt (elforgatás álló telefonon, iPhone), neki adjuk át
  let hostFS = false; addEventListener("message", (e) => { if (e.data === "vfs-host") hostFS = true; }); if (window.parent !== window) try { window.parent.postMessage("vfs-hello", "*"); } catch (e) {}
  $("fs").onclick = () => {
    if (hostFS && window.parent !== window) { window.parent.postMessage("vfs", "*"); return; }
    if (fsEl()) { const ex = document.exitFullscreen || document.webkitExitFullscreen; if (ex) ex.call(document); return; }
    const de = document.documentElement, req = de.requestFullscreen || de.webkitRequestFullscreen;
    if (!req) return fallbackFS();
    try { const pr = req.call(de); const lock = () => { try { const o = screen.orientation; if (o && o.lock) o.lock("landscape").catch(() => {}); } catch (e) {} };
      if (pr && pr.then) pr.then(lock).catch(fallbackFS); else lock(); } catch (e) { fallbackFS(); }
  };
  addEventListener("keydown", (e) => {
    if (exporting) return;
    if (e.key === "Escape" && window.parent !== window && !fsEl()) { window.parent.postMessage("ka-close-video", "*"); return; } // a beágyazó oldal modális ablaka bezárható
    if (e.code === "Space") {
      e.preventDefault();
      playing ? pause() : play();
    }
    if (e.key === "f" || e.key === "F") $("fs").onclick();
    if (e.key === "ArrowRight") {
      tNow = Math.min(total, tNow + 5);
      audio.currentTime = tNow;
    }
    if (e.key === "ArrowLeft") {
      tNow = Math.max(0, tNow - 5);
      audio.currentTime = tNow;
    }
    if (e.key === "h" || e.key === "H") ui.classList.toggle("hide");
  });
  let idle = 0;
  addEventListener("mousemove", () => {
    ui.classList.remove("hide");
    clearTimeout(idle);
    idle = setTimeout(() => playing && ui.classList.add("hide"), 2200);
  });
  function loop() {
    if (!exporting) {
      if (playing) {
        // (2026-11-10) a hang a mester: egy lassú képkocka után a kép ugrik előre, a zenét soha nem tekerjük vissza (ettől „ugrott” a zene)
        if (!audio.paused && audio.readyState >= 2) tNow = audio.currentTime;
        else {
          const now = performance.now();
          tNow += (now - lastWall) / 1e3;
          lastWall = now;
        }
        lastWall = performance.now();
        if (tNow >= total) {
          tNow = total;
          pause();
        }
      }
      renderAt2(tNow);
      $("seek").value = tNow;
      $("time").textContent = `${fmt(tNow)} / ${fmt(total)}`;
    }
    requestAnimationFrame(loop);
  }
  renderAt2(0);
  requestAnimationFrame(loop);
  let cancel = false;
  $("excancel").onclick = () => {
    cancel = true;
  };
  $("exp").onclick = async () => {
    if (exporting) return;
    if (!("VideoEncoder" in window)) {
      alert("Ehhez a funkci\xF3hoz friss Chrome vagy Edge b\xF6ng\xE9sz\u0151 kell.");
      return;
    }
    pause();
    exporting = true;
    cancel = false;
    ex.style.display = "flex";
    try {
      await exportMP4();
    } catch (e) {
      console.error(e);
      alert("Export hiba: " + e.message);
    }
    exporting = false;
    ex.style.display = "none";
  };
  async function pickVideoConfig(fps) {
    const cands = [["avc1.640028", "avc"], ["avc1.4d0028", "avc"], ["avc1.42003e", "avc"], ["avc1.42001f", "avc"], ["vp09.00.40.08", "vp9"], ["av01.0.08M.08", "av1"]];
    for (const [codec, mux] of cands) {
      const cfg = { codec, width: W2, height: H3, bitrate: 18e6, framerate: fps, ...mux === "avc" ? { avc: { format: "avc" } } : {} };
      try {
        const s = await VideoEncoder.isConfigSupported(cfg);
        if (s.supported) return [cfg, mux];
      } catch (e) {
      }
    }
    throw new Error("A b\xF6ng\xE9sz\u0151 nem t\xE1mogatja a vide\xF3k\xF3dol\xE1st (WebCodecs).");
  }
  async function pickAudioConfig() {
    const aac = { codec: "mp4a.40.2", numberOfChannels: 2, sampleRate: 48e3, bitrate: 192e3 };
    try {
      const s = await AudioEncoder.isConfigSupported(aac);
      if (s.supported) return [aac, "aac"];
    } catch (e) {
    }
    const opus = { codec: "opus", numberOfChannels: 2, sampleRate: 48e3, bitrate: 16e4 };
    try {
      const s = await AudioEncoder.isConfigSupported(opus);
      if (s.supported) return [opus, "opus"];
    } catch (e) {
    }
    return [null, null];
  }
  async function exportMP4(fps = 30, dur = total) {
    exporting = true;
    try {
      return await exportInner(fps, dur);
    } finally {
      exporting = false;
    }
  }
  async function exportInner(fps, dur) {
    const log = (...a2) => {
      if (window.EXPORT_DEBUG) console.log("[export]", ...a2);
    };
    const [vcfg, vmux] = await pickVideoConfig(fps);
    const [acfg, acodec] = await pickAudioConfig();
    const muxer = new Muxer({
      target: new ArrayBufferTarget(),
      fastStart: "in-memory",
      firstTimestampBehavior: "offset",
      video: { codec: vmux, width: W2, height: H3, frameRate: fps },
      ...acfg ? { audio: { codec: acodec, numberOfChannels: 2, sampleRate: 48e3 } } : {}
    });
    let vErr = null;
    const venc = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: (e) => {
      vErr = e;
    } });
    venc.configure(vcfg);
    const comp = document.createElement("canvas");
    comp.width = W2;
    comp.height = H3;
    const cg = comp.getContext("2d");
    const nF = Math.ceil(dur * fps);
    log("video cfg", vcfg.codec, "audio", acodec, "frames", nF);
    const t0 = performance.now();
    for (let i = 0; i < nF; i++) {
      if (cancel) throw new Error("megszak\xEDtva");
      if (vErr) throw vErr;
      const t = i / fps;
      renderAt2(t);
      cg.drawImage(c3d, 0, 0);
      cg.drawImage(c2d, 0, 0);
      const fr = new VideoFrame(comp, { timestamp: Math.round(i * 1e6 / fps), duration: Math.round(1e6 / fps) });
      venc.encode(fr, { keyFrame: i % (fps * 2) === 0 });
      fr.close();
      log("frame", i, "q", venc.encodeQueueSize);
      while (venc.encodeQueueSize > 6) await new Promise((r) => setTimeout(r, 2));
      if (i % 10 === 0) {
        const el = (performance.now() - t0) / 1e3, eta = el / (i + 1) * (nF - i - 1);
        ex.querySelector(".fill").style.width = (100 * i / nF).toFixed(1) + "%";
        $("exinfo").textContent = `${i} / ${nF} k\xE9pkocka \xB7 h\xE1tral\xE9v\u0151 id\u0151 kb. ${fmt(eta)}`;
        await new Promise((r) => setTimeout(r, 0));
      }
    }
    log("flushing video");
    await venc.flush();
    log("video flushed");
    if (acfg) {
      $("exinfo").textContent = "Hang k\xF3dol\xE1sa\u2026";
      const ab = await (await fetch(audioUrl)).arrayBuffer();
      const actx = new OfflineAudioContext(2, 48e3 * Math.ceil(total + 1), 48e3);
      const buf = await actx.decodeAudioData(ab);
      let aErr = null;
      const aenc = new AudioEncoder({ output: (c, m) => muxer.addAudioChunk(c, m), error: (e) => {
        aErr = e;
      } });
      aenc.configure(acfg);
      const len = Math.min(buf.length, Math.ceil(dur * 48e3));
      const ch0 = buf.getChannelData(0), ch1 = buf.numberOfChannels > 1 ? buf.getChannelData(1) : ch0;
      for (let s = 0; s < len; s += 4800) {
        const n = Math.min(4800, len - s);
        const d = new Float32Array(n * 2);
        d.set(ch0.subarray(s, s + n), 0);
        d.set(ch1.subarray(s, s + n), n);
        aenc.encode(new AudioData({ format: "f32-planar", sampleRate: 48e3, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round(s / 48e3 * 1e6), data: d }));
        if (aErr) throw aErr;
      }
      log("flushing audio");
      await aenc.flush();
      log("audio flushed");
    }
    muxer.finalize();
    const blob = new Blob([muxer.target.buffer], { type: "video/mp4" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = title + ".mp4";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 6e4);
    window.lastExportSize = blob.size;
  }
  window.__exportMP4 = exportMP4;
}

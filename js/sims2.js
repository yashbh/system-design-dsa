/* Blueprint — labs for the YouTube, Twitter and Google Docs case studies. */
(function () {
  const $ = (s, r) => r.querySelector(s);
  const $$ = (s, r) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const metric = (id, k, v = "–") => `<div class="metric" id="${id}"><div class="k">${k}</div><div class="v">${v}</div></div>`;
  const setM = (root, id, v, cls) => { const m = $("#" + id, root); $(".v", m).textContent = v; m.className = "metric" + (cls ? " " + cls : ""); };
  const tog = (id, label, on) => `<label class="toggle"><input type="checkbox" id="${id}" ${on ? "checked" : ""}><span class="sw"></span>${label}</label>`;
  const SIMS = BP.SIMS;

  /* ═════════ YouTube: parallel transcoding ═════════ */
  SIMS.transcode = (el) => {
    const RUNGS = ["144p", "240p", "360p", "480p", "720p", "1080p", "4K"];
    let len = 20, workers = 8, split = true, lowFirst = true, iv = null, alive = true;
    el.innerHTML = `
      <div class="row" style="gap:18px;margin-bottom:14px">
        <div class="seg" id="tc-m"><button data-v="one">One encoder per video</button><button data-v="split" class="on">Split into 1-minute chunks</button></div>
        ${tog("tc-low", "Publish low resolutions first", true)}
      </div>
      <div class="grid2" style="margin-bottom:12px">
        <div class="field"><label>Video length <b id="tc-lv">20 min</b></label><input type="range" id="tc-l" min="2" max="60" value="20"></div>
        <div class="field"><label>Encoding workers <b id="tc-wv">8</b></label><input type="range" id="tc-w" min="1" max="64" value="8"></div>
      </div>
      <div class="row"><button class="btn primary sm" id="tc-go">⬆ Upload & transcode</button><span class="muted small">Each tile = one minute of video × one resolution. Assume one worker encodes a tile in 30 s.</span></div>
      <div class="tc-grid" id="tc-grid"></div>
      <div class="grid3" style="margin-top:12px">${metric("tc-a", "Watchable (360p ready)")}${metric("tc-b", "All resolutions ready")}${metric("tc-c", "Worker-minutes used")}</div>
      <div class="verdict" id="tc-v">Press upload. Then try one encoder vs chunks, and add workers.</div>`;
    function draw(done = new Set(), active = new Set()) {
      const cols = split ? len : 1;
      $("#tc-grid", el).style.gridTemplateColumns = `60px repeat(${Math.min(cols, 60)}, 1fr)`;
      $("#tc-grid", el).innerHTML = RUNGS.map((r, ri) => `<span class="tc-r">${r}</span>` + Array.from({ length: cols }, (_, ci) => `<i class="${done.has(ri + ":" + ci) ? "done" : active.has(ri + ":" + ci) ? "act" : ""}"></i>`).join("")).join("");
    }
    function run() {
      clearInterval(iv);
      const cols = split ? len : 1, tiles = [];
      const order = lowFirst ? [2, 1, 0, 3, 4, 5, 6] : [0, 1, 2, 3, 4, 5, 6];
      order.forEach((ri) => { for (let ci = 0; ci < cols; ci++) tiles.push(ri + ":" + ci); });
      const per = split ? 0.5 : len * 0.5;        // minutes of work per tile
      const w = split ? workers : 1;              // one encoder can't be split across workers
      const done = new Set(); let tick = 0, watchable = null;
      const stepMin = per;
      const totalTicks = Math.ceil(tiles.length / w);
      const tickMs = Math.max(60, Math.min(500, 3500 / totalTicks));
      iv = setInterval(() => {
        if (!alive) return;
        const active = new Set(tiles.slice(done.size, done.size + w));
        active.forEach((t) => done.add(t)); tick++;
        draw(done, new Set(tiles.slice(done.size, done.size + w)));
        const t = tick * stepMin + 1;             // +1 min for split/assemble
        if (watchable === null && [...Array(cols).keys()].every((ci) => done.has("2:" + ci))) watchable = t;
        setM(el, "tc-a", watchable ? fmt(watchable) : "…", watchable ? (watchable < 10 ? "good" : "warn") : "");
        if (done.size >= tiles.length) {
          clearInterval(iv);
          setM(el, "tc-b", fmt(t), t < 15 ? "good" : t < 60 ? "warn" : "bad");
          setM(el, "tc-c", Math.round(tiles.length * per) + " min");
          const v = $("#tc-v", el);
          v.className = "verdict " + (watchable < 10 ? "good" : "warn");
          v.innerHTML = split ? `Split into ${len} chunks × ${RUNGS.length} resolutions = ${tiles.length} independent jobs across ${workers} workers. Viewers can watch at 360p after <b>${fmt(watchable)}</b>, and HD/4K arrive later.${workers < 16 ? " Add workers: the same total work finishes sooner." : ""}` : `One encoder works through the whole ${len}-minute video for each resolution in turn: <b>${fmt(t)}</b> before everything is ready, and ${fmt(watchable)} before anyone can watch at 360p. More workers don't help: a single file can't be shared.`;
        } else setM(el, "tc-b", "…");
      }, tickMs);
    }
    const fmt = (m) => (m < 60 ? `${m.toFixed(m < 10 ? 1 : 0)} min` : `${(m / 60).toFixed(1)} h`);
    $$("#tc-m button", el).forEach((b) => (b.onclick = () => { $$("#tc-m button", el).forEach((x) => x.classList.toggle("on", x === b)); split = b.dataset.v === "split"; draw(); }));
    $("#tc-low", el).onchange = (e) => (lowFirst = e.target.checked);
    $("#tc-l", el).oninput = (e) => { len = +e.target.value; $("#tc-lv", el).textContent = len + " min"; draw(); };
    $("#tc-w", el).oninput = (e) => { workers = +e.target.value; $("#tc-wv", el).textContent = workers; };
    $("#tc-go", el).onclick = run;
    draw();
    return () => { alive = false; clearInterval(iv); };
  };

  /* ═════════ Twitter: trending = acceleration, not volume ═════════ */
  SIMS.trends = (el) => {
    const TAGS = { "#music": 60, "#football": 40, "#news": 35, "#movies": 25, "#tech": 20, "#food": 15, "#earthquake": 1, "#launch": 2 };
    const WIN = 20;  // ticks in the "last 5 minutes" window
    let hist = Object.fromEntries(Object.keys(TAGS).map((t) => [t, Array(WIN).fill(TAGS[t])]));
    let base = { ...TAGS }, boost = {}, alive = true, ticks = 0;
    el.innerHTML = `
      <div class="row" style="margin-bottom:14px"><button class="btn primary sm" id="tr-q">🌋 Breaking: an earthquake is felt</button><button class="btn sm" id="tr-l">🚀 A product launch starts</button><span class="muted small">Every tick ≈ 15 seconds of tweets.</span></div>
      <div class="grid2"><div class="pane"><h4>Most tweeted (last 5 min)</h4><div id="tr-vol" class="tr-bars"></div></div><div class="pane"><h4>Trending: rate vs its usual rate</h4><div id="tr-hot" class="tr-bars"></div></div></div>
      <div class="verdict" id="tr-v">#music always wins on raw volume. Trends ask a different question: <b>what is unusually popular right now?</b> Trigger an event and watch the right-hand list.</div>`;
    const sum = (a) => a.reduce((x, y) => x + y, 0);
    function render() {
      const vol = Object.entries(hist).map(([t, a]) => [t, sum(a)]).sort((a, b) => b[1] - a[1]);
      const recent = (a) => sum(a.slice(-4)) / 4;
      const hot = Object.keys(hist).map((t) => [t, recent(hist[t]) / (base[t] + 5)]).sort((a, b) => b[1] - a[1]);
      const bars = (rows, f, max) => rows.slice(0, 6).map(([t, v], i) => `<div class="tr-row ${t === "#earthquake" || t === "#launch" ? "ev" : ""}"><span>${i + 1}. ${t}</span><div class="t"><i style="width:${Math.max(3, (v / max) * 100)}%"></i></div><b>${f(v)}</b></div>`).join("");
      $("#tr-vol", el).innerHTML = bars(vol, (v) => Math.round(v * 15).toLocaleString(), vol[0][1]);
      $("#tr-hot", el).innerHTML = bars(hot, (v) => v.toFixed(1) + "×", Math.max(2, hot[0][1]));
      const top = hot[0][0];
      if (top === "#earthquake" || top === "#launch") { const v = $("#tr-v", el); v.className = "verdict good"; v.innerHTML = `<b>${top}</b> is #1 trending at <b>${hot[0][1].toFixed(1)}×</b> its usual rate, while it's still ${vol.findIndex((r) => r[0] === top) + 1}${["st", "nd", "rd"][vol.findIndex((r) => r[0] === top)] || "th"} by raw volume. Trends are ranked by <b>acceleration against a baseline</b> (a slowly updated average of the tag's normal rate), so a sudden spike beats a steady giant.`; }
    }
    const iv = setInterval(() => {
      if (!alive) return; ticks++;
      for (const t in hist) {
        const b = boost[t] || 0, val = Math.max(0, TAGS[t] * (0.8 + Math.random() * 0.4) + b);
        hist[t].push(val); hist[t].shift();
        base[t] = base[t] * 0.97 + val * 0.03;          // the baseline adapts slowly
        if (b) boost[t] = b * 0.9;                       // events fade
      }
      render();
    }, 600);
    $("#tr-q", el).onclick = () => (boost["#earthquake"] = 45);
    $("#tr-l", el).onclick = () => (boost["#launch"] = 30);
    render();
    return () => { alive = false; clearInterval(iv); };
  };

  /* ═════════ Google Docs: concurrent edits, naive vs operational transform ═════════ */
  SIMS.docs = (el) => {
    const BASE = "The quick brown fox jumps";
    let base = BASE, mode = "ot", log = [];
    el.innerHTML = `
      <div class="row" style="margin-bottom:12px;gap:16px"><div class="seg" id="dc-m"><button data-v="naive">Naive: replay edits by position</button><button data-v="ot" class="on">Operational transformation</button></div></div>
      <p class="small muted" style="margin:0 0 12px">The network is paused, so Alice and Bob each edit their own copy of the same text. Edit both boxes (or pick a preset), then press <b>Sync</b>.</p>
      <div class="row" style="margin-bottom:12px"><span class="small muted">Presets:</span><button class="btn sm" data-p="1">Both type at the start</button><button class="btn sm" data-p="2">Insert vs delete nearby</button><button class="btn sm" data-p="3">Overlapping deletes</button><button class="btn sm" id="dc-x">↺ Reset text</button></div>
      <div class="grid2">
        <div class="pane"><h4>👩 Alice's copy</h4><textarea id="dc-a" class="dc-ta" spellcheck="false"></textarea></div>
        <div class="pane"><h4>👨 Bob's copy</h4><textarea id="dc-b" class="dc-ta" spellcheck="false"></textarea></div>
      </div>
      <div class="row" style="margin-top:12px"><button class="btn primary sm" id="dc-s">⇄ Sync through the server</button></div>
      <div class="verdict" id="dc-v">Both start from "${BASE}".</div>
      <div class="log" id="dc-log" style="margin-top:10px"></div>`;
    const A = $("#dc-a", el), B = $("#dc-b", el);
    const reset = (t = base) => { base = t; A.value = t; B.value = t; };
    // one contiguous edit: replace [pos, pos+del) with ins
    const diff = (from, to) => { let p = 0; while (p < from.length && p < to.length && from[p] === to[p]) p++; let s = 0; while (s < from.length - p && s < to.length - p && from[from.length - 1 - s] === to[to.length - 1 - s]) s++; return { pos: p, del: from.length - p - s, ins: to.slice(p, to.length - s) }; };
    const applyOp = (txt, o) => o.t === "ins" ? txt.slice(0, o.p) + o.s + txt.slice(o.p) : txt.slice(0, o.p) + txt.slice(o.p + o.n);
    const applyAll = (txt, ops) => ops.reduce(applyOp, txt);
    const toOps = (r) => [...(r.del > 0 ? [{ t: "del", p: r.pos, n: r.del }] : []), ...(r.ins ? [{ t: "ins", p: r.pos, s: r.ins }] : [])];
    // IT(a, b): a rewritten to apply after b (both against the same text). Returns a list.
    function IT(a, b, aWins) {
      if (a.t === "ins" && b.t === "ins") return [{ ...a, p: a.p < b.p || (a.p === b.p && aWins) ? a.p : a.p + b.s.length }];
      if (a.t === "ins" && b.t === "del") return [{ ...a, p: a.p <= b.p ? a.p : a.p >= b.p + b.n ? a.p - b.n : b.p }];
      if (a.t === "del" && b.t === "ins") {
        if (b.p <= a.p) return [{ ...a, p: a.p + b.s.length }];
        if (b.p >= a.p + a.n) return [a];
        // keep b's inserted text: delete the part before it, then (shifted) the part after it
        return [{ t: "del", p: a.p, n: b.p - a.p }, { t: "del", p: a.p + b.s.length, n: a.p + a.n - b.p }];
      }
      // del vs del
      const aEnd = a.p + a.n, bEnd = b.p + b.n;
      if (aEnd <= b.p) return [a];
      if (a.p >= bEnd) return [{ ...a, p: a.p - b.n }];
      const before = Math.max(0, Math.min(aEnd, b.p) - a.p), after = Math.max(0, aEnd - Math.max(a.p, bEnd));
      const n = before + after;
      return n ? [{ t: "del", p: Math.min(a.p, b.p), n }] : [];
    }
    // Transform op lists: returns [A', B'] with apply(apply(x, A), B') === apply(apply(x, B), A')
    function xform(A, B, aWins) {
      if (!A.length || !B.length) return [A, B];
      if (A.length === 1 && B.length === 1) return [IT(A[0], B[0], aWins), IT(B[0], A[0], !aWins)];
      if (A.length > 1) { const [a1, B1] = xform([A[0]], B, aWins); const [r, B2] = xform(A.slice(1), B1, aWins); return [a1.concat(r), B2]; }
      const [A1, b1] = xform(A, [B[0]], aWins); const [A2, r] = xform(A1, B.slice(1), aWins); return [A2, b1.concat(r)];
    }

    const desc = (r) => !r.del && !r.ins ? "no change" : r.del && r.ins ? `replace "${esc(base.substr(r.pos, r.del))}" at ${r.pos} with "${esc(r.ins)}"` : r.del ? `delete "${esc(base.substr(r.pos, r.del))}" at ${r.pos}` : `insert "${esc(r.ins)}" at ${r.pos}`;
    const descOps = (ops) => ops.length ? ops.map((o) => o.t === "ins" ? `insert "${esc(o.s)}" at ${o.p}` : `delete ${o.n} char(s) at ${o.p}`).join(", then ") : "nothing (already covered)";
    function sync() {
      const ra0 = diff(base, A.value), rb0 = diff(base, B.value), a = toOps(ra0), b = toOps(rb0), L = $("#dc-log", el);
      L.innerHTML = `<div>Alice's edit: ${desc(ra0)}</div><div>Bob's edit: ${desc(rb0)}</div><div class="hl">The server receives Alice's edit first, then Bob's.</div>`;
      let ra, rb;
      if (mode === "naive") {
        ra = applyAll(applyAll(base, a), b); rb = applyAll(applyAll(base, b), a);
        L.innerHTML += `<div>Alice applies Bob's edit at its original position; Bob applies Alice's edit at its original position.</div>`;
      } else {
        const [a2, b2] = xform(a, b, true);
        ra = applyAll(applyAll(base, a), b2); rb = applyAll(applyAll(base, b), a2);
        L.innerHTML += `<div>Alice receives Bob's edit, transformed: ${descOps(b2)}</div><div>Bob receives Alice's edit, transformed: ${descOps(a2)}</div>`;
      }
      A.value = ra; B.value = rb;
      const v = $("#dc-v", el);
      if (ra === rb) { v.className = "verdict good"; v.innerHTML = `✅ <b>Converged.</b> Both copies now read "<b>${esc(ra)}</b>". ${mode === "ot" ? "Each edit was shifted to account for the other person's concurrent change." : "Lucky: these two edits didn't overlap."}`; }
      else { v.className = "verdict bad"; v.innerHTML = `❌ <b>Diverged.</b> Alice sees "<b>${esc(ra)}</b>" but Bob sees "<b>${esc(rb)}</b>". Positions moved under each other's edits. Switch to operational transformation and try again.`; }
      base = ra === rb ? ra : base;
    }
    $$("#dc-m button", el).forEach((b) => (b.onclick = () => { $$("#dc-m button", el).forEach((x) => x.classList.toggle("on", x === b)); mode = b.dataset.v; }));
    $$("[data-p]", el).forEach((b) => (b.onclick = () => {
      reset(BASE);
      if (b.dataset.p === "1") { A.value = "Wow! " + BASE; B.value = "Look: " + BASE; }
      if (b.dataset.p === "2") { A.value = "The quick brown fox happily jumps"; B.value = "The brown fox jumps"; }
      if (b.dataset.p === "3") { A.value = "The fox jumps"; B.value = "The quick jumps"; }
      $("#dc-v", el).className = "verdict"; $("#dc-v", el).textContent = "Both edits made offline. Press Sync.";
    }));
    $("#dc-x", el).onclick = () => { reset(BASE); $("#dc-v", el).className = "verdict"; $("#dc-v", el).textContent = `Both start from "${BASE}".`; $("#dc-log", el).innerHTML = ""; };
    $("#dc-s", el).onclick = sync;
    reset(BASE);
    return () => {};
  };
})();

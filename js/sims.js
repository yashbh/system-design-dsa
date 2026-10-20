/* Blueprint — interactive labs. Each sim renders into `el` and returns a destroy() function. */
window.BP = window.BP || {};
(function () {
  const $ = (s, r) => r.querySelector(s);
  const $$ = (s, r) => Array.from(r.querySelectorAll(s));
  const cssv = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const fmt = (n) => n >= 1e9 ? (n / 1e9).toFixed(n < 1e10 ? 1 : 0) + "B" : n >= 1e6 ? (n / 1e6).toFixed(n < 1e7 ? 1 : 0) + "M" : n >= 1e3 ? (n / 1e3).toFixed(n < 1e4 ? 1 : 0) + "k" : Math.round(n).toString();
  const fmtTime = (s) => s < 1 ? "instant (<1 s)" : s < 60 ? s.toFixed(s < 10 ? 1 : 0) + " s" : s < 3600 ? (s / 60).toFixed(1) + " min" : (s / 3600).toFixed(1) + " h";
  function fitCanvas(cv, h) {
    const dpr = Math.min(2, window.devicePixelRatio || 1), w = cv.clientWidth || 600;
    cv.width = w * dpr; cv.height = h * dpr; cv.style.height = h + "px";
    const ctx = cv.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  }
  const toggle = (id, label, on) => `<label class="toggle"><input type="checkbox" id="${id}" ${on ? "checked" : ""}><span class="sw"></span>${label}</label>`;
  const metric = (id, k, v = "–") => `<div class="metric" id="${id}"><div class="k">${k}</div><div class="v">${v}</div></div>`;
  const setMetric = (root, id, v, cls) => { const m = $("#" + id, root); $(".v", m).textContent = v; m.className = "metric" + (cls ? " " + cls : ""); };
  function fly(stage, from, to, label, cls = "", dur = 650, lose = false) {
    return new Promise((res) => {
      if (!stage.isConnected) return res();
      const sr = stage.getBoundingClientRect(), a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
      const p = document.createElement("div");
      p.className = "packet " + cls; p.textContent = label; p.style.left = "0"; p.style.top = "0";
      stage.appendChild(p);
      const pw = p.offsetWidth, ph = p.offsetHeight;
      const x1 = a.left - sr.left + a.width / 2 - pw / 2, y1 = a.top - sr.top + a.height / 2 - ph / 2;
      const x2 = b.left - sr.left + b.width / 2 - pw / 2, y2 = b.top - sr.top + b.height / 2 - ph / 2;
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      const frames = lose
        ? [{ transform: `translate(${x1}px,${y1}px)`, opacity: 0 }, { transform: `translate(${mx}px,${my}px)`, opacity: 1, offset: 0.6 }, { transform: `translate(${mx}px,${my + 40}px) rotate(25deg)`, opacity: 0 }]
        : [{ transform: `translate(${x1}px,${y1}px)`, opacity: 0 }, { transform: `translate(${x1 + (x2 - x1) * 0.1}px,${y1 + (y2 - y1) * 0.1}px)`, opacity: 1, offset: 0.1 }, { transform: `translate(${x2}px,${y2}px)`, opacity: 1 }];
      const an = p.animate(frames, { duration: dur, easing: "cubic-bezier(.45,0,.3,1)", fill: "forwards" });
      an.onfinish = () => { p.remove(); res(); };
    });
  }
  const logTo = (box, html, cls = "") => { const d = document.createElement("div"); d.className = cls; d.innerHTML = html; box.appendChild(d); box.scrollTop = box.scrollHeight; };

  const SIMS = {};

  /* ═════════════ 1. URL shortener ═════════════ */
  SIMS.shortener = (el) => {
    const A = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const enc = (n) => { let s = ""; do { s = A[n % 62] + s; n = Math.floor(n / 62); } while (n > 0); return s; };
    let rangeStart = 125000000000, nextId = rangeStart, alive = true, timers = [];
    const links = Array.from({ length: 11 }, (_, i) => enc(124999990000 + i * 7919));
    el.innerHTML = `
      <div class="grid2">
        <div class="pane"><h4>① Create a short link</h4>
          <div class="field"><label>Long URL</label><input type="text" id="url" value="https://www.example.com/articles/2026/10/how-distributed-systems-really-work?utm_source=newsletter&utm_medium=email&utm_campaign=fall"></div>
          <div class="row" style="margin-top:12px"><button class="btn primary sm" id="go">Shorten →</button><span class="muted small" id="range"></span></div>
          <div class="b62" id="steps"></div>
          <div class="short-out" id="out">blu.pr/<span>???????</span></div>
          <p class="muted small" id="len"></p>
        </div>
        <div class="pane"><h4>② Serve the clicks</h4>
          <div class="field"><label>Cache size (LRU slots) <b id="cv">3</b></label><input type="range" id="cap" min="0" max="10" value="3"></div>
          <div class="cache-slots" id="slots"></div>
          <div class="row" style="margin-top:14px"><button class="btn primary sm" id="burst">Send 200 clicks</button><span class="muted small">Traffic is skewed (Zipf): a few links get most clicks.</span></div>
          <div class="clicks" id="clicks"></div>
          <div class="grid3" style="margin-top:14px">${metric("m-hit", "Cache hit ratio")}${metric("m-db", "DB reads")}${metric("m-lat", "Avg latency")}</div>
          <div class="verdict" id="verdict">Send some traffic to see how the cache behaves.</div>
        </div>
      </div>`;
    const showRange = () => ($("#range", el).textContent = `This server leased IDs ${rangeStart.toLocaleString()}–${(rangeStart + 999).toLocaleString()}`);
    showRange();
    let cache = new Map(), cap = 3;
    const drawSlots = (flash) => {
      const keys = [...cache.keys()].reverse();
      $("#slots", el).innerHTML = Array.from({ length: Math.max(cap, 0) }, (_, i) => keys[i] ? `<div class="${keys[i] === flash ? "flash" : ""}">${keys[i]}</div>` : `<div class="empty">empty</div>`).join("") || `<span class="muted small">No cache: every click goes to the database.</span>`;
    };
    drawSlots();
    $("#cap", el).oninput = (e) => { cap = +e.target.value; $("#cv", el).textContent = cap; while (cache.size > cap) cache.delete(cache.keys().next().value); drawSlots(); };

    $("#go", el).onclick = () => {
      timers.forEach(clearTimeout); timers = [];
      const id = nextId++;
      if (nextId > rangeStart + 999) { rangeStart += 1000 * 7; nextId = rangeStart; }
      showRange();
      const rows = []; let n = id;
      do { const q = Math.floor(n / 62), r = n % 62; rows.push(`<div class="r" style="animation-delay:${rows.length * 0.18}s"><span>${n.toLocaleString()} ÷ 62 = ${q.toLocaleString()}</span><span>remainder ${r} → <em>${A[r]}</em></span></div>`); n = q; } while (n > 0);
      $("#steps", el).innerHTML = `<div class="r"><span>ID from local range</span><em>${id.toLocaleString()}</em></div>` + rows.join("") + `<div class="r" style="animation-delay:${rows.length * 0.18}s"><span>Read remainders bottom → top</span><span>⬆</span></div>`;
      const code = enc(id);
      const out = $("#out", el);
      out.innerHTML = "blu.pr/" + [...code].map((ch, i) => `<span class="pop" style="animation-delay:${rows.length * 0.18 + 0.2 + i * 0.07}s">${ch}</span>`).join("");
      const L = $("#url", el).value.length;
      $("#len", el).innerHTML = `${L} characters → <b>${7 + code.length}</b>. The new link is now the hottest one in the traffic simulation.`;
      links.unshift(code); if (links.length > 12) links.pop();
    };

    $("#burst", el).onclick = () => {
      timers.forEach(clearTimeout); timers = [];
      const box = $("#clicks", el); box.innerHTML = "";
      const w = links.map((_, i) => 1 / Math.pow(i + 1, 1.1)), tot = w.reduce((a, b) => a + b, 0);
      let hits = 0, miss = 0, i = 0;
      const pick = () => { let r = Math.random() * tot; for (let k = 0; k < w.length; k++) { r -= w[k]; if (r <= 0) return links[k]; } return links[0]; };
      const tick = () => {
        if (!alive) return;
        for (let j = 0; j < 4 && i < 200; j++, i++) {
          const code = pick(), hit = cache.has(code);
          if (hit) { hits++; cache.delete(code); cache.set(code, 1); }
          else { miss++; if (cap > 0) { cache.set(code, 1); while (cache.size > cap) cache.delete(cache.keys().next().value); } }
          const sq = document.createElement("i"); sq.className = hit ? "hit" : "miss"; sq.title = code + (hit ? " · hit" : " · miss → DB"); box.appendChild(sq);
          if (j === 3) drawSlots(code);
        }
        const ratio = hits / (hits + miss), avg = (hits * 0.8 + miss * 9) / (hits + miss);
        setMetric(el, "m-hit", Math.round(ratio * 100) + "%", ratio > 0.75 ? "good" : ratio > 0.4 ? "warn" : "bad");
        setMetric(el, "m-db", miss.toString(), miss < 50 ? "good" : miss < 120 ? "warn" : "bad");
        setMetric(el, "m-lat", avg.toFixed(1) + " ms", avg < 3 ? "good" : avg < 6 ? "warn" : "bad");
        if (i < 200) timers.push(setTimeout(tick, 22));
        else {
          const v = $("#verdict", el);
          if (cap === 0) { v.className = "verdict bad"; v.innerHTML = "🔥 No cache: all 200 clicks hit the database. At 116k clicks/sec that's a dead database."; }
          else if (ratio > 0.75) { v.className = "verdict good"; v.innerHTML = `✅ Just ${cap} cached links served ${Math.round(ratio * 100)}% of traffic. Skewed popularity is why small caches work so well.`; }
          else { v.className = "verdict warn"; v.innerHTML = `⚠️ Hit ratio ${Math.round(ratio * 100)}%. Try a few more slots and watch the database reads drop. (Run twice: the first burst warms a cold cache.)`; }
        }
      };
      tick();
    };
    return () => { alive = false; timers.forEach(clearTimeout); };
  };

  /* ═════════════ 2. Feed fan-out ═════════════ */
  SIMS.fanout = (el) => {
    let mode = "push", exp = 2.3, alive = true, parts = [], lit = new Set(), status = "", progress = 0, anim = null, reader = -1;
    el.innerHTML = `
      <div class="row" style="justify-content:space-between;margin-bottom:16px">
        <div class="seg" id="mode"><button data-m="push" class="on">Push (on write)</button><button data-m="pull">Pull (on read)</button><button data-m="hybrid">Hybrid</button></div>
        <div class="row"><button class="btn primary sm" id="post">📸 Post a photo</button><button class="btn sm" id="open">📱 A follower opens the feed</button></div>
      </div>
      <div class="field" style="margin-bottom:14px"><label>Author's followers <b id="fv"></b></label><input type="range" id="fol" min="1" max="9" step="0.01" value="2.3"></div>
      <div class="pane" style="padding:0;overflow:hidden"><canvas id="cv"></canvas></div>
      <div class="grid2" style="margin-top:14px;grid-template-columns:repeat(4,1fr)">${metric("f-w", "Writes for this post")}${metric("f-t", "Until all followers see it")}${metric("f-r", "Work per feed open")}${metric("f-l", "Feed open latency")}</div>
      <div class="verdict" id="verdict"></div>`;
    const cv = $("#cv", el);
    let G = fitCanvas(cv, 300);
    const F = () => Math.round(Math.pow(10, exp));
    const isCeleb = () => F() > 1e5;
    const DOTS = 280;
    const dotPos = (i) => { const cols = 28, gx = G.w * 0.48, gw = G.w * 0.5, cw = gw / cols; return [gx + (i % cols) * cw + cw / 2, 28 + Math.floor(i / cols) * 25]; };
    const authorPos = () => [70, G.h / 2], cachePos = () => [G.w * 0.3, G.h / 2];
    function calc() {
      const f = F(), celeb = isCeleb();
      let writes, deliver, readWork, readLat;
      if (mode === "push") { writes = f; deliver = f / 1e6; readWork = "1 lookup"; readLat = 5; }
      else if (mode === "pull") { writes = 1; deliver = 0; readWork = "~300 queries"; readLat = 220; }
      else { writes = celeb ? 1 : Math.round(f * 0.35); deliver = celeb ? 0 : writes / 1e6; readWork = "1 lookup + ~5 celeb merges"; readLat = 18; }
      return { f, celeb, writes, deliver, readWork, readLat };
    }
    function update() {
      const m = calc();
      $("#fv", el).textContent = m.f.toLocaleString() + (m.celeb ? " ⭐ celebrity" : "");
      setMetric(el, "f-w", fmt(m.writes) + (mode === "hybrid" && !m.celeb ? " (active only)" : ""), m.writes > 1e7 ? "bad" : m.writes > 1e5 ? "warn" : "good");
      setMetric(el, "f-t", fmtTime(m.deliver), m.deliver > 60 ? "bad" : m.deliver > 2 ? "warn" : "good");
      setMetric(el, "f-r", m.readWork, mode === "pull" ? "bad" : "good");
      setMetric(el, "f-l", "~" + m.readLat + " ms", m.readLat > 100 ? "bad" : m.readLat > 30 ? "warn" : "good");
      const v = $("#verdict", el);
      if (mode === "push" && m.celeb) { v.className = "verdict bad"; v.innerHTML = `🔥 <b>Celebrity problem.</b> One post = ${fmt(m.writes)} feed writes, taking about ${fmtTime(m.deliver)} at 1M writes/s. Most of that work goes to people who won't open the app today.`; }
      else if (mode === "push") { v.className = "verdict good"; v.innerHTML = "✅ Push works well for normal accounts: a few hundred cheap writes, and every reader gets a ready-made feed."; }
      else if (mode === "pull") { v.className = "verdict warn"; v.innerHTML = "⚠️ Posting is free, but <b>every</b> feed open queries every account the reader follows. At ~58k opens/sec that's ~17M queries/sec."; }
      else { v.className = "verdict good"; v.innerHTML = m.celeb ? "✅ Hybrid: this celebrity isn't pushed. Readers merge their posts at read time, and the hot post sits in cache." : "✅ Hybrid: normal accounts push, but only to <b>active</b> followers, skipping about 65% of the writes."; }
    }
    $$("#mode button", el).forEach((b) => b.onclick = () => { mode = b.dataset.m; $$("#mode button", el).forEach((x) => x.classList.toggle("on", x === b)); lit.clear(); parts = []; status = ""; update(); });
    $("#fol", el).oninput = (e) => { exp = +e.target.value; lit.clear(); status = ""; update(); };

    $("#post", el).onclick = () => {
      const m = calc(); lit.clear(); parts = []; reader = -1; progress = 0;
      const pushes = mode === "push" || (mode === "hybrid" && !m.celeb);
      if (!pushes) { status = mode === "pull" ? "Stored once in the author's outbox. Readers will pull it." : "Celebrity: stored once, merged at read time."; parts.push({ a: authorPos(), b: [authorPos()[0] + 60, authorPos()[1] - 70], t0: performance.now(), d: 600, col: "c" }); return; }
      const visDur = Math.min(6000, Math.max(900, Math.log10(m.writes + 1) * 700));
      const shown = Math.min(DOTS, m.f), now = performance.now();
      const targets = Array.from({ length: shown }, (_, i) => i).filter((i) => mode !== "hybrid" || (i * 7919) % 100 < 35);
      targets.forEach((i, k) => parts.push({ a: cachePos(), b: dotPos(i), t0: now + 500 + (k / targets.length) * visDur, d: 500, col: m.celeb ? "bad" : "c", dot: i }));
      parts.push({ a: authorPos(), b: cachePos(), t0: now, d: 500, col: "c" });
      anim = { start: now + 500, dur: visDur, total: m.writes, real: m.deliver };
    };
    $("#open", el).onclick = () => {
      const m = calc(); reader = Math.floor(Math.random() * Math.min(DOTS, m.f)); const now = performance.now();
      const R = dotPos(reader);
      if (mode === "push" || (mode === "hybrid" && !m.celeb)) parts.push({ a: cachePos(), b: R, t0: now, d: 450, col: "ok" });
      if (mode === "pull" || mode === "hybrid") {
        const n = mode === "pull" ? 40 : 5;
        for (let i = 0; i < n; i++) parts.push({ a: [rnd(G.w * 0.05, G.w * 0.42), rnd(20, G.h - 20)], b: R, t0: now + i * (mode === "pull" ? 35 : 80), d: 700, col: "warn" });
      }
      status = mode === "pull" ? "Pull: querying ~300 followed accounts and merging…" : mode === "hybrid" ? "Hybrid: 1 cached list + a few hot celebrity posts" : "Push: one lookup of a precomputed list ⚡";
    };

    function frame(t) {
      if (!alive) return;
      const ctx = G.ctx, cc = cssv("--c"), mut = cssv("--border2"), txt = cssv("--text"), mu = cssv("--muted");
      const col = (k) => k === "c" ? cc : cssv("--" + k);
      ctx.clearRect(0, 0, G.w, G.h);
      const m = calc(), shown = Math.min(DOTS, m.f);
      // follower dots
      for (let i = 0; i < DOTS; i++) {
        const [x, y] = dotPos(i); if (y > G.h - 10) break;
        ctx.beginPath(); ctx.arc(x, y, i === reader ? 7 : 4.5, 0, 7);
        ctx.fillStyle = i >= shown ? "transparent" : i === reader ? cssv("--ok") : lit.has(i) ? cc : mut;
        ctx.fill();
      }
      ctx.fillStyle = mu; ctx.font = "12px " + cssv("--font");
      ctx.fillText(m.f > DOTS ? `followers (each dot ≈ ${fmt(m.f / DOTS)} people)` : "followers", G.w * 0.48, 14);
      // author + cache
      const [ax, ay] = authorPos(), [cx, cy] = cachePos();
      ctx.beginPath(); ctx.arc(ax, ay, 26, 0, 7); ctx.fillStyle = cc; ctx.fill();
      ctx.font = "22px serif"; ctx.textAlign = "center"; ctx.fillText(m.celeb ? "⭐" : "🙂", ax, ay + 8);
      ctx.font = "12px " + cssv("--font"); ctx.fillStyle = mu; ctx.fillText("author", ax, ay + 46);
      ctx.strokeStyle = mode === "pull" ? mut : cssv("--k-cache"); ctx.lineWidth = 2; ctx.setLineDash(mode === "pull" ? [4, 4] : []);
      ctx.strokeRect(cx - 44, cy - 24, 88, 48); ctx.setLineDash([]);
      ctx.fillStyle = txt; ctx.fillText(mode === "pull" ? "(no fan-out)" : "fan-out", cx, cy - 2); ctx.fillStyle = mu; ctx.fillText("workers", cx, cy + 14);
      ctx.textAlign = "left";
      // particles
      parts = parts.filter((p) => {
        const k = (t - p.t0) / p.d; if (k < 0) return true;
        if (k >= 1) { if (p.dot !== undefined) lit.add(p.dot); return false; }
        const e = k * k * (3 - 2 * k), x = p.a[0] + (p.b[0] - p.a[0]) * e, y = p.a[1] + (p.b[1] - p.a[1]) * e - Math.sin(k * Math.PI) * 30;
        ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fillStyle = col(p.col); ctx.shadowColor = col(p.col); ctx.shadowBlur = 10; ctx.fill(); ctx.shadowBlur = 0;
        return true;
      });
      // progress text
      if (anim) {
        progress = Math.min(1, Math.max(0, (t - anim.start) / anim.dur));
        status = `Delivering… ${fmt(anim.total * progress)} / ${fmt(anim.total)} feeds  ·  real-world time ≈ ${fmtTime(anim.real)}`;
        if (progress >= 1) { status = `Delivered to ${fmt(anim.total)} feeds (≈ ${fmtTime(anim.real)} at 1M writes/s)`; anim = null; }
      }
      ctx.fillStyle = txt; ctx.font = "600 13px " + cssv("--font"); ctx.fillText(status, 16, G.h - 14);
      requestAnimationFrame(frame);
    }
    const onResize = () => { G = fitCanvas(cv, 300); };
    addEventListener("resize", onResize);
    update(); requestAnimationFrame(frame);
    return () => { alive = false; removeEventListener("resize", onResize); };
  };

  /* ═════════════ 3. Chat delivery ═════════════ */
  SIMS.chat = (el) => {
    let alive = true, n = 0, chain = Promise.resolve();
    const msgs = [], inbox = [], seen = new Set();
    el.innerHTML = `
      <div class="row" style="margin-bottom:16px;gap:22px">${toggle("bon", "Bob online", true)}${toggle("bopen", "Bob has the chat open", true)}${toggle("flaky", "Flaky network (lose an ACK)", false)}</div>
      <div class="chat-stage" id="stage">
        <div class="phone" id="pa"><div class="ph-head"><div class="av">B</div><div>Bob<small id="pres" class="on">online</small></div></div><div class="msgs" id="ma"></div>
          <form class="ph-input" id="fa"><input type="text" id="ia" placeholder="Message" value="On my way 🚗" autocomplete="off"><button>➤</button></form></div>
        <div class="server-col">
          <div class="srv" id="srv"><div class="t">🔌 Chat server</div><div class="s">ACKs, dedupes by message ID, routes</div></div>
          <div class="srv" id="reg"><div class="t">📇 Session registry</div><div class="s" id="regv">bob → server 342</div></div>
          <div class="srv" id="ibx"><div class="t">📦 Bob's offline inbox</div><div class="inbox-items" id="ibi"></div></div>
        </div>
        <div class="phone" id="pb"><div class="ph-head"><div class="av">A</div><div>Alice<small>Bob's phone</small></div></div><div class="msgs" id="mb"></div>
          <div class="ph-input"><input type="text" disabled placeholder="Bob is reading…"></div></div>
      </div>
      <h4 style="margin:18px 0 8px;font-size:.82rem;color:var(--muted);text-transform:uppercase;letter-spacing:.1em">Protocol log</h4>
      <div class="log" id="log"><div class="muted">Type a message on Alice's phone and press ➤</div></div>`;
    const S = $("#stage", el), L = $("#log", el), srv = $("#srv", el), reg = $("#reg", el), ibx = $("#ibx", el), pa = $("#pa", el), pb = $("#pb", el);
    const on = () => $("#bon", el).checked, open = () => $("#bopen", el).checked, flaky = () => $("#flaky", el).checked;
    const flash = (x) => { x.classList.add("flash"); setTimeout(() => x.classList.remove("flash"), 500); };
    const tickHtml = (s) => s === "pending" ? "🕓" : s === "sent" ? "✓" : `<span class="ticks ${s === "read" ? "read" : ""}">✓✓</span>`;
    const setState = (m, s) => { m.state = s; $(".tk", m.el).innerHTML = tickHtml(s); };
    const q = (fn) => (chain = chain.then(() => alive && fn()).catch((e) => console.error(e)));
    const time = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const presence = () => { $("#pres", el).textContent = on() ? "online" : "last seen just now"; $("#pres", el).className = on() ? "on" : ""; $("#regv", el).textContent = on() ? "bob → server 342" : "bob → offline"; };
    const drawInbox = () => { $("#ibi", el).innerHTML = inbox.map((m) => `<div>🔒 ${m.id} (ciphertext)</div>`).join("") || `<span class="muted small">empty</span>`; };
    drawInbox();

    async function deliver(m) {
      await fly(S, srv, pb, m.id, "", 650);
      const b = document.createElement("div"); b.className = "bubble them"; b.innerHTML = `${m.text}<div class="meta">${time()}</div>`;
      $("#mb", el).appendChild(b); $("#mb", el).scrollTop = 1e6;
      logTo(L, `→ PUSH ${m.id} to Bob over his open connection`, "hl");
      await fly(S, pb, srv, "DELIVERED", "ack", 550);
      await fly(S, srv, pa, "✓✓", "ack", 550);
      setState(m, "delivered"); logTo(L, `← DELIVERED ${m.id} → Alice sees ✓✓`, "ok");
      if (open()) await readReceipt(m);
    }
    async function readReceipt(m) {
      await sleep(400);
      await fly(S, pb, srv, "READ", "ack", 500);
      await fly(S, srv, pa, "READ", "ack", 500);
      setState(m, "read"); logTo(L, `← READ ${m.id} → ticks turn blue`, "ok");
    }
    function send(text) {
      const m = { id: "m" + ++n, text, state: "pending" };
      m.el = document.createElement("div"); m.el.className = "bubble me";
      m.el.innerHTML = `${text.replace(/</g, "&lt;")}<div class="meta">${time()} <span class="tk">🕓</span></div>`;
      $("#ma", el).appendChild(m.el); $("#ma", el).scrollTop = 1e6; msgs.push(m);
      q(async () => {
        let attempt = 1;
        while (alive) {
          logTo(L, `→ MSG id=${m.id} attempt ${attempt} (encrypted)`);
          await fly(S, pa, srv, m.id, "", 600); flash(srv);
          if (seen.has(m.id)) logTo(L, `server: duplicate ${m.id} ignored (already stored), re-sending ACK`, "warn");
          else { seen.add(m.id); logTo(L, `server: stored ${m.id}`); }
          if (flaky() && attempt === 1) {
            await fly(S, srv, pa, "ACK", "lost", 700, true);
            logTo(L, `✗ ACK lost in the network. Alice times out, retrying in ${(0.5 + Math.random() * 0.5).toFixed(2)} s (backoff)`, "bad");
            await sleep(700); attempt++; continue;
          }
          await fly(S, srv, pa, "✓", "ack", 500);
          setState(m, "sent"); logTo(L, `← ACK ${m.id} → Alice sees ✓`, "ok");
          break;
        }
        flash(reg); logTo(L, `registry: bob → ${on() ? "server 342" : "OFFLINE"}`);
        await sleep(250);
        if (on()) await deliver(m);
        else { await fly(S, srv, ibx, m.id, "", 500); inbox.push(m); drawInbox(); flash(ibx); logTo(L, `Bob offline → ${m.id} persisted in his inbox (store-and-forward)`, "warn"); }
      });
    }
    $("#fa", el).onsubmit = (e) => { e.preventDefault(); const v = $("#ia", el).value.trim(); if (!v) return; send(v); $("#ia", el).value = ["Running 5 min late", "Grab me a coffee ☕", "See you at the gate", "👍"][n % 4]; };
    $("#bon", el).onchange = () => {
      presence();
      if (on() && inbox.length) q(async () => {
        logTo(L, `Bob reconnected → draining ${inbox.length} message(s) from inbox`, "hl");
        while (inbox.length && alive) { const m = inbox.shift(); drawInbox(); await fly(S, ibx, pb, m.id, "", 550); flash(pb); logTo(L, `inbox: ${m.id} handed to Bob and deleted from server`); await fly(S, pb, srv, "DELIVERED", "ack", 450); await fly(S, srv, pa, "✓✓", "ack", 450); setState(m, "delivered"); logTo(L, `← DELIVERED ${m.id}`, "ok"); }
        if (open()) for (const m of msgs.filter((x) => x.state === "delivered")) await readReceipt(m);
      });
    };
    $("#bopen", el).onchange = () => { if (open() && on()) q(async () => { for (const m of msgs.filter((x) => x.state === "delivered")) await readReceipt(m); }); };
    return () => { alive = false; };
  };

  /* ═════════════ 4. Adaptive bitrate ═════════════ */
  SIMS.abr = (el) => {
    const LAD = [[0.3, "240p"], [0.75, "360p"], [1.75, "480p"], [3, "720p"], [5.8, "1080p"], [16, "4K"]];
    const RES = [22, 36, 60, 100, 170, 320], SEG = 2, MAXBUF = 20;
    let alive = true, bw = 8, storm = false, origin = false, target = 8, stormT = 0;
    let st;
    const reset = () => { st = { t: 0, buf: 0, started: false, rebuf: false, startup: null, rebufs: 0, est: 2, rung: 1, dl: null, hist: [], qsum: 0, qn: 0, sceneT: 0 }; };
    reset();
    el.innerHTML = `
      <div class="grid2" style="grid-template-columns:1.35fr 1fr">
        <div>
          <div class="player"><canvas id="scene"></canvas><div class="q" id="q">360p</div><div class="spinner" id="spin"><i></i></div></div>
          <div class="row" style="justify-content:space-between;margin-top:8px"><span class="muted small">Buffer</span><span class="small mono" id="bufv">0.0 s</span></div>
          <div class="buffer"><i id="buf"></i></div>
          <div class="pane" style="margin-top:14px;padding:12px"><div class="row" style="justify-content:space-between"><span class="small muted">— network throughput &nbsp; <b style="color:var(--c)">━ chosen bitrate</b></span><span class="small muted">last 30 s</span></div><canvas id="chart"></canvas></div>
        </div>
        <div style="display:flex;flex-direction:column;gap:14px">
          <div class="field"><label>Your network bandwidth <b id="bwv"></b></label><input type="range" id="bw" min="0.3" max="25" step="0.1" value="8"></div>
          <div class="row">${toggle("storm", "🌩️ Network storm (random swings)", false)}</div>
          <div class="row"><span class="small muted">Serve video from</span><div class="seg" id="src"><button class="on" data-o="0">📡 Edge in your ISP</button><button data-o="1">🌊 Origin overseas</button></div></div>
          <button class="btn sm" id="restart">↺ Restart playback</button>
          <div class="ladder" id="lad">${LAD.map(([b, n], i) => `<div data-i="${i}"><span>${n}</span><span class="muted">${b} Mbps</span></div>`).join("")}</div>
          <div class="grid2">${metric("a-s", "Startup time")}${metric("a-r", "Rebuffer events")}${metric("a-q", "Avg bitrate")}${metric("a-e", "Throughput estimate")}</div>
        </div>
      </div>`;
    const scene = $("#scene", el), chart = $("#chart", el);
    let SC = fitCanvas(scene, scene.clientHeight || 260), CH = fitCanvas(chart, 120);
    const off = document.createElement("canvas"), octx = off.getContext("2d");
    $("#bw", el).oninput = (e) => { bw = +e.target.value; target = bw; };
    $("#storm", el).onchange = (e) => { storm = e.target.checked; };
    $$("#src button", el).forEach((b) => b.onclick = () => { origin = b.dataset.o === "1"; $$("#src button", el).forEach((x) => x.classList.toggle("on", x === b)); reset(); });
    $("#restart", el).onclick = reset;
    let lastRung = 1;
    function step() {
      if (!alive) return;
      const dt = 0.1; st.t += dt;
      if (storm) { stormT -= dt; if (stormT <= 0) { target = Math.random() < 0.3 ? rnd(0.4, 1.5) : rnd(1.5, 22); stormT = rnd(2, 5); } bw += (target - bw) * 0.15; $("#bw", el).value = bw; }
      const eff = origin ? bw * 0.55 : bw, rtt = origin ? 0.35 : 0.02;
      if (!st.dl && st.buf < MAXBUF) {
        const budget = st.est * (st.buf < 5 ? 0.5 : st.buf < 10 ? 0.75 : 0.9);
        let r = 0; LAD.forEach(([b], i) => { if (b <= budget) r = i; });
        if (!st.started) r = Math.min(r, 1);
        st.rung = r; st.dl = { need: LAD[r][0] * SEG, got: 0, rtt, t0: st.t };
      }
      if (st.dl) {
        if (st.dl.rtt > 0) st.dl.rtt -= dt; else st.dl.got += eff * dt;
        if (st.dl.got >= st.dl.need) { const took = st.t - st.dl.t0; st.est = st.est * 0.6 + (st.dl.need / took) * 0.4; st.buf += SEG; st.qsum += LAD[st.rung][0]; st.qn++; st.dl = null; }
      }
      if (!st.started && st.buf >= SEG) { st.started = true; st.startup = st.t; }
      if (st.started) {
        if (st.rebuf) { if (st.buf >= SEG) st.rebuf = false; }
        else if (st.buf > 0) { st.buf = Math.max(0, st.buf - dt); st.sceneT += dt; }
        else { st.rebuf = true; st.rebufs++; }
      }
      st.hist.push([bw, LAD[st.rung][0]]); if (st.hist.length > 300) st.hist.shift();
      // UI
      $("#bwv", el).textContent = bw.toFixed(1) + " Mbps" + (origin ? ` (≈${eff.toFixed(1)} effective)` : "");
      $("#buf", el).style.width = (st.buf / MAXBUF) * 100 + "%"; $("#bufv", el).textContent = st.buf.toFixed(1) + " s";
      const qb = $("#q", el);
      if (st.rung !== lastRung) { qb.className = "q " + (st.rung > lastRung ? "up" : "down"); lastRung = st.rung; setTimeout(() => (qb.className = "q"), 600); }
      qb.textContent = `${LAD[st.rung][1]} · ${LAD[st.rung][0]} Mbps`;
      $("#spin", el).classList.toggle("on", !st.started || st.rebuf);
      $$("#lad div", el).forEach((d) => { const i = +d.dataset.i; d.classList.toggle("cur", i === st.rung); d.classList.toggle("over", LAD[i][0] > eff); });
      setMetric(el, "a-s", st.startup != null ? st.startup.toFixed(1) + " s" : "…", st.startup == null ? "" : st.startup < 1.5 ? "good" : st.startup < 3 ? "warn" : "bad");
      setMetric(el, "a-r", st.rebufs.toString(), st.rebufs === 0 ? "good" : st.rebufs < 3 ? "warn" : "bad");
      setMetric(el, "a-q", st.qn ? (st.qsum / st.qn).toFixed(1) + " Mbps" : "…");
      setMetric(el, "a-e", st.est.toFixed(1) + " Mbps");
    }
    const iv = setInterval(step, 100);
    function draw() {
      if (!alive) return;
      // scene, rendered at a resolution that depends on the current rung (lower rung = pixelated)
      const w = RES[st.rung], h = Math.round(w / 2);
      off.width = w; off.height = h;
      const t = st.sceneT, cc = cssv("--c") || "#e50914";
      const g = octx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "#0b1030"); g.addColorStop(0.6, "#3b1d5a"); g.addColorStop(1, cc);
      octx.fillStyle = g; octx.fillRect(0, 0, w, h);
      octx.fillStyle = "#ffd58a"; octx.beginPath(); octx.arc(w * 0.72, h * 0.42, h * 0.16, 0, 7); octx.fill();
      for (let i = 0; i < 12; i++) { octx.fillStyle = "rgba(255,255,255,.8)"; octx.fillRect(((i * 37 + t * 3) % 1) * 0 + ((i * 53.3) % w), (i * 17.7) % (h * 0.5), Math.max(1, w / 160), Math.max(1, w / 160)); }
      [[0.55, "#1d1640", 0.6], [0.7, "#120d2b", 1.1], [0.85, "#07060f", 1.8]].forEach(([y0, col, sp]) => {
        octx.fillStyle = col; octx.beginPath(); octx.moveTo(0, h);
        for (let x = 0; x <= w; x += Math.max(1, w / 80)) octx.lineTo(x, h * y0 + Math.sin(x / w * 9 + t * sp) * h * 0.05 + Math.sin(x / w * 23 + t * sp * 1.7) * h * 0.02);
        octx.lineTo(w, h); octx.fill();
      });
      const bx = ((t * 0.08) % 1.2 - 0.1) * w; octx.fillStyle = "#fff"; octx.font = `${Math.max(6, h * 0.12)}px serif`; octx.fillText("🚲", bx, h * 0.8);
      const ctx = SC.ctx; ctx.imageSmoothingEnabled = st.rung >= 4; ctx.drawImage(off, 0, 0, SC.w, SC.h);
      // chart
      const c = CH.ctx, W = CH.w, H = CH.h, mx = 25; c.clearRect(0, 0, W, H);
      const X = (i) => (i / 299) * W, Y = (v) => H - 6 - (Math.min(v, mx) / mx) * (H - 12);
      c.beginPath(); c.moveTo(0, H); st.hist.forEach(([b], i) => c.lineTo(X(i), Y(b))); c.lineTo(X(st.hist.length - 1), H); c.closePath();
      c.fillStyle = cssv("--panel2"); c.fill(); c.strokeStyle = cssv("--border2"); c.stroke();
      c.beginPath(); st.hist.forEach(([, r], i) => { if (i === 0) c.moveTo(X(i), Y(r)); else { c.lineTo(X(i), Y(st.hist[i - 1][1])); c.lineTo(X(i), Y(r)); } });
      c.strokeStyle = cc; c.lineWidth = 2.5; c.stroke(); c.lineWidth = 1;
      requestAnimationFrame(draw);
    }
    const onResize = () => { SC = fitCanvas(scene, scene.clientHeight || 260); CH = fitCanvas(chart, 120); };
    addEventListener("resize", onResize);
    requestAnimationFrame(() => { onResize(); draw(); });
    return () => { alive = false; clearInterval(iv); removeEventListener("resize", onResize); };
  };

  /* ═════════════ 5. Geo index (hex grid) ═════════════ */
  SIMS.geo = (el) => {
    let alive = true, cells = [], S = 20, drivers = [], rider = null, search = null, surge = false, hotspot = null;
    const N = 80;
    el.innerHTML = `
      <div class="row" style="justify-content:space-between;margin-bottom:14px"><div class="row">${toggle("surge", "🔥 Concert just ended (surge heatmap)", false)}</div><button class="btn sm" id="reset">↺ Reset drivers</button></div>
      <div class="pane" style="padding:0;overflow:hidden;cursor:crosshair"><canvas id="map"></canvas></div>
      <div class="grid2" style="margin-top:14px;grid-template-columns:repeat(4,1fr)">${metric("g-c", "Hex cells searched")}${metric("g-d", "Drivers examined")}${metric("g-n", "Full scan would check")}${metric("g-s", "Work saved")}</div>
      <div class="verdict" id="verdict">👆 Click anywhere on the map to request a ride.</div>`;
    const cv = $("#map", el);
    let G = fitCanvas(cv, 420);
    const build = () => {
      const w = Math.sqrt(3) * S; cells = [];
      const cols = Math.floor((G.w - w / 2) / w), rows = Math.floor((G.h - S / 2) / (1.5 * S));
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells.push({ c, r, q: c - (r - (r & 1)) / 2, x: w * (c + 0.5 * (r & 1)) + w / 2 + 2, y: S + r * 1.5 * S + 2, id: "8a" + ((c * 92821 + r * 68917) >>> 0).toString(16).padStart(5, "0").slice(0, 5) + "…" });
    };
    const spawn = () => { drivers = Array.from({ length: N }, () => ({ x: rnd(10, G.w - 10), y: rnd(10, G.h - 10), vx: rnd(-0.4, 0.4), vy: rnd(-0.4, 0.4), st: "free" })); };
    build(); spawn();
    const cellAt = (x, y) => { let best = null, bd = 1e9; for (const c of cells) { const d = (c.x - x) ** 2 + (c.y - y) ** 2; if (d < bd) { bd = d; best = c; } } return best; };
    const hd = (a, b) => { const dq = a.q - b.q, dr = a.r - b.r; return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2; };
    const hexPath = (ctx, x, y, s) => { ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 180 * (60 * i - 30); ctx.lineTo(x + s * Math.cos(a), y + s * Math.sin(a)); } ctx.closePath(); };
    cv.addEventListener("click", (e) => {
      const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      const cell = cellAt(x, y); rider = { x, y, cell };
      drivers.forEach((d) => { if (d.st === "offered") d.st = "free"; });
      search = { k: 0, t: performance.now(), found: [], examined: 0, rings: new Set(), done: false, best: null, cands: [] };
      $("#verdict", el).className = "verdict"; $("#verdict", el).innerHTML = `📍 Rider in cell <code>${cell.id}</code>. Searching ring 0…`;
    });
    $("#surge", el).onchange = (e) => { surge = e.target.checked; hotspot = surge ? { x: rnd(G.w * 0.25, G.w * 0.75), y: rnd(G.h * 0.25, G.h * 0.75) } : null; };
    $("#reset", el).onclick = () => { spawn(); rider = null; search = null; };
    function advance(now) {
      if (!search || search.done || now - search.t < 420) return;
      search.t = now;
      const ring = cells.filter((c) => hd(c, rider.cell) === search.k);
      ring.forEach((c) => search.rings.add(c));
      const inRing = drivers.filter((d) => d.st === "free" && ring.includes(d.cell));
      search.examined += inRing.length; search.found.push(...inRing);
      setMetric(el, "g-c", search.rings.size.toString());
      setMetric(el, "g-d", search.examined.toString(), "good");
      const free = drivers.filter((d) => d.st === "free").length;
      setMetric(el, "g-n", `${free} here · ~1M in a big city`);
      if (search.found.length >= 3 || search.k >= 7) {
        search.done = true;
        search.cands = search.found.map((d) => ({ d, eta: Math.hypot(d.x - rider.x, d.y - rider.y) * rnd(1.1, 1.7) })).sort((a, b) => a.eta - b.eta).slice(0, 5);
        if (!search.cands.length) { $("#verdict", el).className = "verdict bad"; $("#verdict", el).innerHTML = "😕 No drivers nearby within 7 rings. In production you'd widen the search or show \"no cars available\"."; return; }
        const best = search.cands[0]; search.best = best.d; best.d.st = "offered";
        setMetric(el, "g-s", Math.round((1 - search.examined / Math.max(1, free)) * 100) + "%", "good");
        const v = $("#verdict", el); v.className = "verdict good";
        v.innerHTML = `✅ Found ${search.found.length} drivers in ${search.k + 1} ring(s), checking <b>${search.examined}</b> of ${free} drivers. Ranked by <b>road ETA</b>, not straight line. Best driver is <b>${Math.max(1, Math.round(best.eta / 40))} min</b> away: <code>AVAILABLE → OFFERED</code> (15 s timeout)…`;
        setTimeout(() => { if (!alive || !search || search.best !== best.d) return; best.d.st = "trip"; best.d.dest = { x: rider.x, y: rider.y }; v.innerHTML += ` <b>ACCEPTED</b> → <code>ON_TRIP</code>. That driver is now removed from the available index.`; }, 1600);
      } else { search.k++; $("#verdict", el).innerHTML = `🔎 ${search.found.length} found so far, expanding to ring ${search.k}…`; }
    }
    function frame(now) {
      if (!alive) return;
      const ctx = G.ctx, cc = cssv("--c"), bd = cssv("--border"), mu = cssv("--muted"), txt = cssv("--text");
      ctx.clearRect(0, 0, G.w, G.h);
      drivers.forEach((d) => {
        if (d.st === "free") { d.x += d.vx; d.y += d.vy; if (d.x < 5 || d.x > G.w - 5) d.vx *= -1; if (d.y < 5 || d.y > G.h - 5) d.vy *= -1; if (Math.random() < 0.01) { d.vx = rnd(-0.4, 0.4); d.vy = rnd(-0.4, 0.4); } }
        else if (d.st === "trip" && d.dest) { d.x += (d.dest.x - d.x) * 0.02; d.y += (d.dest.y - d.y) * 0.02; }
        d.cell = cellAt(d.x, d.y);
      });
      advance(now);
      const supply = new Map(); drivers.forEach((d) => d.st === "free" && supply.set(d.cell, (supply.get(d.cell) || 0) + 1));
      for (const c of cells) {
        hexPath(ctx, c.x, c.y, S - 1);
        let fill = null;
        if (surge && hotspot) {
          const dem = 6 * Math.exp(-((c.x - hotspot.x) ** 2 + (c.y - hotspot.y) ** 2) / (2 * 110 ** 2));
          const ratio = dem / ((supply.get(c) || 0) + 1);
          if (ratio > 0.6) { const a = Math.min(0.75, (ratio - 0.6) * 0.35); fill = `rgba(239,68,68,${a})`; c.surge = Math.min(3, 1 + ratio * 0.25); } else c.surge = 0;
        }
        if (fill) { ctx.fillStyle = fill; ctx.fill(); }
        if (search && search.rings.has(c)) { const k = hd(c, rider.cell); ctx.fillStyle = cc; ctx.globalAlpha = 0.32 - k * 0.035; ctx.fill(); ctx.globalAlpha = 1; }
        ctx.strokeStyle = bd; ctx.lineWidth = 1; ctx.stroke();
      }
      if (surge) {
        ctx.font = "700 10px " + cssv("--font"); ctx.textAlign = "center"; ctx.fillStyle = txt;
        cells.filter((c) => c.surge > 1.35).forEach((c) => ctx.fillText(c.surge.toFixed(1) + "×", c.x, c.y + 3));
        ctx.textAlign = "left";
      }
      if (search && search.done) search.cands.forEach((cd, i) => {
        ctx.beginPath(); ctx.moveTo(rider.x, rider.y); ctx.lineTo(cd.d.x, cd.d.y);
        ctx.strokeStyle = i === 0 ? cssv("--ok") : mu; ctx.setLineDash(i === 0 ? [] : [4, 4]); ctx.lineWidth = i === 0 ? 2.5 : 1; ctx.stroke(); ctx.setLineDash([]); ctx.lineWidth = 1;
      });
      drivers.forEach((d) => {
        ctx.beginPath(); ctx.arc(d.x, d.y, d.st === "free" ? 4.5 : 6.5, 0, 7);
        ctx.fillStyle = d.st === "trip" ? cssv("--ok") : d.st === "offered" ? cssv("--warn") : txt; ctx.fill();
        if (search && search.found.includes(d) && d.st === "free") { ctx.strokeStyle = cc; ctx.lineWidth = 2; ctx.stroke(); ctx.lineWidth = 1; }
      });
      if (rider) {
        const p = (now / 600) % 1; ctx.beginPath(); ctx.arc(rider.x, rider.y, 8 + p * 18, 0, 7); ctx.strokeStyle = cc; ctx.globalAlpha = 1 - p; ctx.lineWidth = 2; ctx.stroke(); ctx.globalAlpha = 1; ctx.lineWidth = 1;
        ctx.font = "22px serif"; ctx.textAlign = "center"; ctx.fillText("📍", rider.x, rider.y + 2); ctx.textAlign = "left";
      }
      ctx.fillStyle = mu; ctx.font = "11px " + cssv("--font");
      ctx.fillText("● available driver   ● offered   ● on trip   ⬡ H3-style cell", 10, G.h - 8);
      requestAnimationFrame(frame);
    }
    const onResize = () => { G = fitCanvas(cv, 420); build(); };
    addEventListener("resize", onResize);
    requestAnimationFrame(frame);
    return () => { alive = false; removeEventListener("resize", onResize); };
  };

  /* ═════════════ 6. Ticket onsale ═════════════ */
  SIMS.onsale = (el) => {
    const ROWS = 10, COLS = 24, NSEAT = ROWS * COLS, CAP = 30, HOLD = 6;
    let mode = "naive", fansN = 2000, rate = 20, running = false, alive = true, iv = null, s;
    el.innerHTML = `
      <div class="grid2" style="grid-template-columns:1.25fr 1fr">
        <div>
          <div class="seatmap" id="map" style="grid-template-columns:repeat(${COLS},1fr)"><div class="stage">STAGE</div>${Array.from({ length: NSEAT }, (_, i) => `<div class="seat" data-i="${i}"></div>`).join("")}</div>
          <div class="row small muted" style="margin-top:10px;gap:16px"><span>▪ available</span><span style="color:var(--warn)">▪ held (TTL)</span><span style="color:var(--c)">▪ sold</span><span style="color:var(--bad)">▪ double-booked!</span></div>
          <div class="you" id="you" style="margin-top:14px">🙋 You're one of the fans. Press <b>Start onsale</b>.</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:14px">
          <div class="seg" id="mode"><button data-m="naive" class="on">💥 Free-for-all</button><button data-m="queue">🚦 Waiting room + holds</button></div>
          <div class="field"><label>Fans at 10:00:00 <b id="fv">2,000</b></label><input type="range" id="fans" min="500" max="5000" step="100" value="2000"></div>
          <div class="field" id="ratef" style="opacity:.4"><label>Admission rate <b id="rv">20 fans/s</b></label><input type="range" id="rate" min="5" max="90" value="20"></div>
          <div class="row"><button class="btn primary sm" id="start">▶ Start onsale</button><button class="btn sm" id="reset">↺ Reset</button></div>
          <div class="gauge"><svg viewBox="0 0 200 110"><path d="M15 100 A85 85 0 0 1 185 100" fill="none" stroke="var(--panel2)" stroke-width="16" stroke-linecap="round"/><path id="garc" d="M15 100 A85 85 0 0 1 185 100" fill="none" stroke="var(--ok)" stroke-width="16" stroke-linecap="round" stroke-dasharray="0 400" style="transition:stroke-dasharray .2s,stroke .3s"/></svg><div class="gv" id="gv">0%</div></div>
          <div class="small muted" style="text-align:center;margin-top:-8px">inventory service load (capacity 300 req/s)</div>
          <div class="grid3">${metric("t-q", "In queue")}${metric("t-a", "Shopping")}${metric("t-s", "Sold")}${metric("t-x", "Holds expired")}${metric("t-e", "Errors (5xx)")}${metric("t-d", "Double-booked")}</div>
        </div>
      </div>
      <div class="verdict" id="verdict">Run the free-for-all first, then the waiting room, and compare.</div>`;
    const seatEls = $$(".seat", el);
    const init = () => {
      s = { t: 0, seats: Array.from({ length: NSEAT }, () => ({ st: "free", by: -1, until: 0 })), fans: [], queue: [], arrived: 0, errors: 0, dbl: 0, expired: 0, sold: 0, conflicts: 0, load: 0, you: 0, done: false };
      for (let i = 0; i < fansN; i++) s.fans.push({ st: "out", seat: -1, err: 0, buyAt: 0, will: Math.random() < 0.7 });
      s.you = Math.floor(Math.random() * fansN); s.fans[s.you].will = true;
      if (mode === "queue") {
        s.queue = s.fans.map((_, i) => i).sort(() => Math.random() - 0.5);
        // You arrived early, so you land somewhere in the first part of the randomized line.
        s.queue.splice(s.queue.indexOf(s.you), 1); s.queue.splice(Math.floor(Math.random() * 180), 0, s.you);
        s.queue.forEach((i) => (s.fans[i].st = "queue")); s.arrived = fansN;
      }
      seatEls.forEach((x) => (x.className = "seat"));
      render();
    };
    const label = (i) => `${"ABCDEFGHIJ"[Math.floor(i / COLS)]}-${(i % COLS) + 1}`;
    function tick() {
      s.t += 0.1;
      const F = s.fans, changed = new Set();
      if (mode === "naive") {
        if (s.arrived < fansN) { const n = Math.min(fansN - s.arrived, Math.ceil(fansN / 15)); for (let k = 0; k < n; k++) F[s.arrived++].st = "active"; }
        const active = F.map((f, i) => i).filter((i) => F[i].st === "active");
        const senders = active.filter(() => Math.random() < 0.6);
        s.load = senders.length / CAP;
        const p = Math.min(1, CAP / Math.max(1, senders.length));
        const free = s.seats.map((x, i) => i).filter((i) => s.seats[i].st === "free");
        const picks = new Map();
        senders.forEach((i) => {
          if (Math.random() >= p) { s.errors++; if (++F[i].err > 25) F[i].st = "gaveup"; return; }
          if (!free.length) { F[i].st = "soldout"; return; }
          const seat = free[Math.floor(Math.random() * free.length)];
          if (!picks.has(seat)) picks.set(seat, []); picks.get(seat).push(i);
        });
        picks.forEach((who, seat) => {
          s.seats[seat].st = who.length > 1 ? "dbl" : "sold"; s.sold++; changed.add(seat);
          if (who.length > 1) s.dbl += who.length - 1;
          who.forEach((i) => { F[i].st = "bought"; F[i].seat = seat; });
        });
      } else {
        let adm = Math.floor(rate * 0.1 + (s.carry || 0)); s.carry = rate * 0.1 + (s.carry || 0) - adm;
        const anyLeft = s.seats.some((x) => x.st === "free" || x.st === "held");
        const freeNow = s.seats.filter((x) => x.st === "free").length;
        const seatless = F.filter((f) => f.st === "shop" && f.seat < 0).length;
        // Admission control: only let people in when there is inventory they could actually hold.
        while (adm-- > 0 && s.queue.length && seatless < freeNow) { const i = s.queue.shift(); F[i].st = "shop"; }
        if (!anyLeft) while (s.queue.length) F[s.queue.shift()].st = "soldout";
        const shoppers = F.map((f, i) => i).filter((i) => F[i].st === "shop");
        // Seat-less shoppers back off while everything is held; holders occasionally poll checkout.
        const reqs = shoppers.filter((i) => F[i].seat < 0 ? (freeNow > 0 || Math.random() < 0.1) : Math.random() < 0.15);
        s.load = reqs.length / CAP;
        const p = Math.min(1, CAP / Math.max(1, reqs.length));
        reqs.forEach((i) => {
          const f = F[i];
          if (Math.random() >= p) { s.errors++; return; }
          if (f.seat >= 0) return;
          const free = []; s.seats.forEach((x, k) => x.st === "free" && free.push(k));
          if (!free.length) { if (!s.seats.some((x) => x.st === "held")) f.st = "soldout"; return; }
          const seat = free[Math.floor(Math.random() * free.length)];
          if (Math.random() < 0.08) { s.conflicts++; return; }
          s.seats[seat] = { st: "held", by: i, until: s.t + HOLD }; f.seat = seat; f.buyAt = s.t + rnd(1.5, 4.5); changed.add(seat);
        });
        shoppers.forEach((i) => {
          const f = F[i]; if (f.seat < 0) return;
          const seat = s.seats[f.seat];
          if (f.will && s.t >= f.buyAt && seat.st === "held" && seat.by === i) { seat.st = "sold"; s.sold++; f.st = "bought"; changed.add(f.seat); }
        });
        s.seats.forEach((x, k) => { if (x.st === "held" && s.t >= x.until) { const f = F[x.by]; f.st = "abandoned"; s.seats[k] = { st: "free", by: -1, until: 0 }; s.expired++; changed.add(k); seatEls[k].classList.add("rel"); setTimeout(() => seatEls[k].classList.remove("rel"), 700); } });
      }
      changed.forEach((k) => { seatEls[k].className = "seat " + (s.seats[k].st === "free" ? "" : s.seats[k].st); });
      const busy = F.some((f) => f.st === "active" || f.st === "shop" || f.st === "queue" || f.st === "out");
      if (!busy || s.t > 45) { s.done = true; stop(); }
      render();
    }
    function render() {
      const F = s.fans, cnt = (st) => F.filter((f) => f.st === st).length;
      const load = Math.round(s.load * 100);
      const arc = $("#garc", el), L = 267;
      arc.setAttribute("stroke-dasharray", `${Math.min(1, s.load / 2) * L} 400`);
      arc.setAttribute("stroke", s.load > 1 ? "var(--bad)" : s.load > 0.75 ? "var(--warn)" : "var(--ok)");
      $("#gv", el).textContent = load + "%";
      setMetric(el, "t-q", (mode === "queue" ? s.queue.length : 0).toLocaleString());
      setMetric(el, "t-a", (mode === "queue" ? cnt("shop") : cnt("active")).toLocaleString(), s.load > 1 ? "bad" : "");
      setMetric(el, "t-s", `${s.sold}/${NSEAT}`, "good");
      setMetric(el, "t-x", s.expired.toString(), s.expired ? "warn" : "");
      setMetric(el, "t-e", s.errors.toLocaleString(), s.errors > 500 ? "bad" : s.errors > 0 ? "warn" : "good");
      setMetric(el, "t-d", s.dbl.toString(), s.dbl ? "bad" : "good");
      const y = F[s.you], you = $("#you", el);
      if (!running && !s.done) return;
      if (y.st === "queue") { const pos = s.queue.indexOf(s.you) + 1; you.innerHTML = `🙋 <b>You're #${pos.toLocaleString()} in line</b> · about ${Math.ceil(pos / rate)} s wait. Refreshing won't help: early arrivals were randomized.`; }
      else if (y.st === "shop") you.innerHTML = y.seat >= 0 ? `⏱️ <b>Seat ${label(y.seat)} is held for you</b> · ${Math.max(0, s.seats[y.seat].until - s.t).toFixed(1)} s left to pay (≈ minutes in real life)` : "🎟️ It's your turn! Picking a seat…";
      else if (y.st === "active" || y.st === "out") you.innerHTML = `🔄 Mashing refresh… <b>${y.err}</b> errors so far.`;
      else if (y.st === "bought") you.innerHTML = s.seats[y.seat].st === "dbl" ? `😱 The app said you got <b>${label(y.seat)}</b>… but so did someone else. Double-booked.` : `🎉 <b>You got seat ${label(y.seat)}!</b>`;
      else if (y.st === "gaveup") you.innerHTML = "😤 You gave up after 25 errors.";
      else if (y.st === "soldout") you.innerHTML = "😢 Sold out before you got a chance. Fair, but sad.";
      if (s.done) {
        const v = $("#verdict", el);
        if (mode === "naive") { v.className = "verdict bad"; v.innerHTML = `💥 <b>Free-for-all:</b> peak load ${Math.round(s.peak * 100)}% of capacity, <b>${s.errors.toLocaleString()} errors</b>, and <b>${s.dbl} double-booked seats</b> (two fans read "available" and both wrote "sold"). Winners were whoever retried fastest. Now try the waiting room.`; }
        else { v.className = s.load > 1 || s.errors > 200 ? "verdict warn" : "verdict good"; v.innerHTML = `🚦 <b>Waiting room + atomic holds:</b> peak load ${Math.round(s.peak * 100)}%, ${s.errors.toLocaleString()} errors, <b>0 double-bookings</b>. ${s.expired} abandoned holds expired and went back on sale. ${s.peak > 1 ? "Your admission rate overloaded the backend. Lower it until load stays under 100%." : "Try raising the admission rate to find the limit."}`; }
      }
    }
    function start() { init(); running = true; s.peak = 0; $("#start", el).disabled = true; iv = setInterval(() => { tick(); s.peak = Math.max(s.peak, s.load); }, 100); }
    function stop() { running = false; clearInterval(iv); $("#start", el).disabled = false; }
    $$("#mode button", el).forEach((b) => b.onclick = () => { stop(); mode = b.dataset.m; $$("#mode button", el).forEach((x) => x.classList.toggle("on", x === b)); $("#ratef", el).style.opacity = mode === "queue" ? 1 : 0.4; init(); $("#you", el).innerHTML = "🙋 You're one of the fans. Press <b>Start onsale</b>."; });
    $("#fans", el).oninput = (e) => { fansN = +e.target.value; $("#fv", el).textContent = fansN.toLocaleString(); };
    $("#rate", el).oninput = (e) => { rate = +e.target.value; $("#rv", el).textContent = rate + " fans/s"; };
    $("#start", el).onclick = start;
    $("#reset", el).onclick = () => { stop(); init(); $("#you", el).innerHTML = "🙋 You're one of the fans. Press <b>Start onsale</b>."; $("#verdict", el).className = "verdict"; $("#verdict", el).textContent = "Reset. Pick a mode and start."; };
    init();
    return () => { alive = false; clearInterval(iv); };
  };

  /* ═════════════ 7. Consistent hashing ring ═════════════ */
  SIMS.ring = (el) => {
    const COLORS = ["#60a5fa", "#f472b6", "#4ade80", "#fb923c", "#a78bfa", "#facc15", "#2dd4bf", "#f87171"];
    const NAMES = "ABCDEFGH".split("");
    const h32 = (str) => { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); } h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; return h >>> 0; };
    const KEYS = Array.from({ length: 60 }, (_, i) => ({ k: `channel:${1000 + i * 37}`, h: h32(`channel:${1000 + i * 37}`) }));
    let nodes = ["A", "B", "C", "D"], vn = false, owners = {}, lastMove = null, lookup = null;
    const CX = 220, CY = 220, R = 165;
    el.innerHTML = `
      <div class="grid2" style="grid-template-columns:1.1fr 1fr">
        <div class="pane"><svg class="ring-svg" id="svg" viewBox="0 0 440 440"></svg><p class="small muted" style="text-align:center;margin:6px 0 0">Each key belongs to the next node <b>clockwise</b>. Click a node to remove it.</p></div>
        <div style="display:flex;flex-direction:column;gap:14px">
          <div class="row"><button class="btn primary sm" id="add">＋ Add node</button><button class="btn sm" id="rm">－ Remove node</button>${toggle("vn", "Virtual nodes (×16)", false)}</div>
          <div class="grid2">${metric("r-ring", "Keys moved: hash ring")}${metric("r-mod", "Keys moved: hash % N")}</div>
          <div class="verdict" id="verdict">Add or remove a node to compare how much data has to move.</div>
          <div class="pane"><h4>Load per node (60 keys)</h4><div class="dist" id="dist"></div></div>
          <form class="row" id="lk"><input type="text" id="lkv" value="channel:general" style="flex:1"><button class="btn sm">Find owner</button></form>
          <div class="small" id="lkr"></div>
        </div>
      </div>`;
    const svg = $("#svg", el);
    const points = (list) => { const p = []; list.forEach((n) => { const k = vn ? 16 : 1; for (let i = 0; i < k; i++) p.push({ n, h: h32(`node-${n}#${i}`) }); }); return p.sort((a, b) => a.h - b.h); };
    const ownerOf = (h, pts) => { for (const p of pts) if (p.h >= h) return p.n; return pts[0].n; };
    const assign = (list) => { const pts = points(list), o = {}; KEYS.forEach((k) => (o[k.k] = ownerOf(k.h, pts))); return o; };
    const ang = (h) => (h / 4294967296) * Math.PI * 2 - Math.PI / 2;
    const pt = (h, r) => [CX + r * Math.cos(ang(h)), CY + r * Math.sin(ang(h))];
    const col = (n) => COLORS[NAMES.indexOf(n)];
    function draw(moved = new Set()) {
      const pts = points(nodes);
      let arcs = "";
      pts.forEach((p, i) => {
        const prev = pts[(i - 1 + pts.length) % pts.length];
        let a0 = prev.h, a1 = p.h; if (pts.length === 1) { a0 = p.h + 1; }
        let span = (a1 - a0 + 4294967296) % 4294967296; if (pts.length === 1) span = 4294967295;
        const [x0, y0] = pt(a0, R), [x1, y1] = pt(a0 + span, R);
        arcs += `<path d="M${x0} ${y0} A${R} ${R} 0 ${span > 2147483648 ? 1 : 0} 1 ${x1} ${y1}" stroke="${col(p.n)}" stroke-width="12" fill="none" opacity=".55"/>`;
      });
      const keys = KEYS.map((k) => { const [x, y] = pt(k.h, R - 30); return `<circle class="key ${moved.has(k.k) ? "moved" : ""}" cx="${x}" cy="${y}" r="4" fill="${col(owners[k.k])}"><title>${k.k} → ${owners[k.k]}</title></circle>`; }).join("");
      const marks = pts.map((p) => { const [x, y] = pt(p.h, R), [lx, ly] = pt(p.h, R + 22); return `<g class="nd" data-n="${p.n}" style="cursor:pointer"><circle cx="${x}" cy="${y}" r="${vn ? 5 : 11}" fill="${col(p.n)}" stroke="var(--bg2)" stroke-width="3"/>${vn ? "" : `<text x="${lx}" y="${ly + 5}" text-anchor="middle" font-weight="800" font-size="14" fill="var(--text)">${p.n}</text>`}</g>`; }).join("");
      let lk = "";
      if (lookup) { const [x, y] = pt(lookup.h, R - 30), op = pts.find((p) => p.n === lookup.owner && p.h >= lookup.h) || pts.find((p) => p.n === lookup.owner); const [x2, y2] = pt(op.h, R); lk = `<circle cx="${x}" cy="${y}" r="8" fill="none" stroke="var(--text)" stroke-width="2"><animate attributeName="r" values="6;12;6" dur="1.2s" repeatCount="indefinite"/></circle><line x1="${x}" y1="${y}" x2="${x2}" y2="${y2}" stroke="var(--text)" stroke-width="1.5" stroke-dasharray="4 3"/>`; }
      svg.innerHTML = `<circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="var(--border)" stroke-width="12"/>${arcs}${keys}${marks}${lk}
        <text x="${CX}" y="${CY - 6}" text-anchor="middle" font-size="13" fill="var(--muted)">hash ring</text><text x="${CX}" y="${CY + 14}" text-anchor="middle" font-size="22" font-weight="800" fill="var(--text)">${nodes.length} nodes</text>`;
      $$(".nd", svg).forEach((g) => g.onclick = () => { if (nodes.length > 1) change(nodes.filter((n) => n !== g.dataset.n)); });
      const counts = {}; nodes.forEach((n) => (counts[n] = 0)); KEYS.forEach((k) => counts[owners[k.k]]++);
      const mx = Math.max(...Object.values(counts)), avg = KEYS.length / nodes.length;
      $("#dist", el).innerHTML = nodes.map((n) => `<div class="b"><span><b style="color:${col(n)}">●</b> Node ${n}</span><div class="t"><i style="width:${(counts[n] / mx) * 100}%;background:${col(n)}"></i></div><span class="mono">${counts[n]}</span></div>`).join("") + `<div class="small muted" style="margin-top:6px">Imbalance (max ÷ avg): <b style="color:var(--text)">${(mx / avg).toFixed(2)}×</b> ${vn ? "· vnodes smooth this out" : "· try virtual nodes"}</div>`;
    }
    function change(next) {
      const before = owners, prevNodes = nodes;
      nodes = next; owners = assign(nodes);
      const moved = new Set(KEYS.filter((k) => before[k.k] !== owners[k.k]).map((k) => k.k));
      const modMoved = KEYS.filter((k) => prevNodes[k.h % prevNodes.length] !== nodes[k.h % nodes.length]).length;
      setMetric(el, "r-ring", `${moved.size}/60 (${Math.round((moved.size / 60) * 100)}%)`, moved.size / 60 < 0.4 ? "good" : "warn");
      setMetric(el, "r-mod", `${modMoved}/60 (${Math.round((modMoved / 60) * 100)}%)`, modMoved / 60 > 0.4 ? "bad" : "warn");
      const v = $("#verdict", el); v.className = "verdict good";
      v.innerHTML = `${prevNodes.length} → ${nodes.length} nodes. The ring moved <b>${moved.size}</b> keys, only those in the affected arc (ideal ≈ 1/${Math.max(prevNodes.length, nodes.length)} = ${Math.round(60 / Math.max(prevNodes.length, nodes.length))}). <code>hash % N</code> would have moved <b>${modMoved}</b>: a cache wipe or a massive data migration.`;
      if (lookup) lookup.owner = ownerOf(lookup.h, points(nodes));
      draw(moved);
    }
    $("#add", el).onclick = () => { const n = NAMES.find((x) => !nodes.includes(x)); if (n) change([...nodes, n]); };
    $("#rm", el).onclick = () => { if (nodes.length > 1) change(nodes.slice(0, -1)); };
    $("#vn", el).onchange = (e) => { vn = e.target.checked; owners = assign(nodes); if (lookup) lookup.owner = ownerOf(lookup.h, points(nodes)); draw(); $("#verdict", el).className = "verdict"; $("#verdict", el).innerHTML = vn ? "Each server now owns 16 small arcs, so load evens out and a removed node's keys scatter across <i>all</i> survivors instead of dumping on one neighbor." : "One point per node: arcs are uneven, so load is lumpy."; };
    $("#lk", el).onsubmit = (e) => { e.preventDefault(); const k = $("#lkv", el).value.trim() || "x"; const h = h32(k); lookup = { h, owner: ownerOf(h, points(nodes)) }; $("#lkr", el).innerHTML = `<code>${k}</code> → hash <code>0x${h.toString(16).padStart(8, "0")}</code> → walk clockwise → <b style="color:${col(lookup.owner)}">Node ${lookup.owner}</b>`; draw(); };
    owners = assign(nodes); draw();
    return () => {};
  };

  /* ═════════════ 8. Stripe: token bucket + idempotency ═════════════ */
  SIMS.stripe = (el) => {
    let alive = true, cap = 10, rate = 2, tokens = 10, ok = 0, no = 0, steady = false, steadyAcc = 0, busy = false, payN = 0, chN = 0;
    const store = new Map();
    el.innerHTML = `
      <div class="grid2">
        <div class="pane"><h4>① Rate limiter: token bucket</h4>
          <div class="grid2"><div class="field"><label>Capacity <b id="capv">10</b></label><input type="range" id="cap" min="1" max="20" value="10"></div><div class="field"><label>Refill <b id="ratev">2/s</b></label><input type="range" id="rate" min="0.5" max="10" step="0.5" value="2"></div></div>
          <div class="bucket" id="bucket" style="margin-top:18px"></div>
          <div class="row" style="justify-content:center;margin-top:14px"><button class="btn sm" id="one">Send 1</button><button class="btn primary sm" id="burst">Burst ×15</button>${toggle("steady", "Steady 4 req/s", false)}</div>
          <div class="reqs" id="reqs"></div>
          <div class="grid3" style="margin-top:12px">${metric("s-ok", "200 OK", "0")}${metric("s-no", "429 Too Many", "0")}${metric("s-tk", "Tokens", "10")}</div>
        </div>
        <div class="pane"><h4>② Retries & idempotency</h4>
          <div class="row" style="gap:18px">${toggle("flaky", "Flaky network (first response lost)", true)}${toggle("idem", "Send Idempotency-Key", false)}</div>
          <div class="flowline" id="fl"><div class="ep l" id="epm">🏪 Merchant</div><div class="wire"></div><div class="ep r" id="eps">💳 Payments API</div></div>
          <div class="row"><button class="btn primary sm" id="pay">Pay $49.99</button><button class="btn sm" id="clr">Clear</button></div>
          <table class="ledger"><thead><tr><th>Charge</th><th>Checkout</th><th>Key</th><th>Amount</th></tr></thead><tbody id="led"></tbody></table>
          <div class="verdict" id="pv">Customer statement will appear here.</div>
          <div class="log" id="plog" style="margin-top:10px"><div class="muted">Press Pay. The first response will be lost, and the client will retry.</div></div>
        </div>
      </div>`;
    const bucket = $("#bucket", el), reqs = $("#reqs", el);
    function drawBucket() {
      const want = Math.floor(tokens), have = $$("i:not(.out)", bucket);
      if (have.length > want) have.slice(want).forEach((c) => { c.classList.add("out"); setTimeout(() => c.remove(), 350); });
      for (let i = have.length; i < want; i++) bucket.appendChild(document.createElement("i"));
      setMetric(el, "s-tk", tokens.toFixed(1));
    }
    function request() {
      const pass = tokens >= 1; if (pass) { tokens -= 1; ok++; } else no++;
      const sp = document.createElement("span"); sp.className = pass ? "ok" : "no"; sp.textContent = pass ? "200" : "429"; reqs.appendChild(sp);
      while (reqs.children.length > 48) reqs.firstChild.remove();
      setMetric(el, "s-ok", ok.toString(), "good"); setMetric(el, "s-no", no.toString(), no ? "bad" : "");
      drawBucket();
    }
    const iv = setInterval(() => {
      if (!alive) return;
      tokens = Math.min(cap, tokens + rate * 0.1);
      if (steady) { steadyAcc += 0.4; while (steadyAcc >= 1) { steadyAcc--; request(); } }
      drawBucket();
    }, 100);
    $("#cap", el).oninput = (e) => { cap = +e.target.value; tokens = Math.min(tokens, cap); $("#capv", el).textContent = cap; drawBucket(); };
    $("#rate", el).oninput = (e) => { rate = +e.target.value; $("#ratev", el).textContent = rate + "/s"; };
    $("#one", el).onclick = request;
    $("#burst", el).onclick = () => { for (let i = 0; i < 15; i++) setTimeout(() => alive && request(), i * 40); };
    $("#steady", el).onchange = (e) => (steady = e.target.checked);
    drawBucket();

    const fl = $("#fl", el), epm = $("#epm", el), eps = $("#eps", el), L = $("#plog", el), led = $("#led", el);
    const charges = [];
    function statement() {
      const total = charges.length * 49.99, groups = {};
      charges.forEach((c) => (groups[c.pay] = (groups[c.pay] || 0) + 1));
      const dups = Object.values(groups).filter((n) => n > 1).length, v = $("#pv", el);
      if (!charges.length) { v.className = "verdict"; v.textContent = "Customer statement will appear here."; return; }
      v.className = dups ? "verdict bad" : "verdict good";
      v.innerHTML = `Customer was charged <b>$${total.toFixed(2)}</b> for ${payN} checkout(s). ${dups ? `❌ <b>${dups} double charge(s)!</b> The retry looked like a brand-new request.` : "✅ Exactly once per checkout."}`;
    }
    $("#pay", el).onclick = async () => {
      if (busy) return; busy = true; $("#pay", el).disabled = true;
      const pay = ++payN, useKey = $("#idem", el).checked, flaky = $("#flaky", el).checked;
      const key = useKey ? "idem_" + Math.random().toString(36).slice(2, 8) : null;
      for (let attempt = 1; attempt <= 3 && alive; attempt++) {
        logTo(L, `→ POST /v1/charges $49.99 ${key ? `Idempotency-Key: ${key}` : "(no key)"} · attempt ${attempt}`, "hl");
        await fly(fl, epm, eps, "POST", "", 600);
        let resp;
        if (key && store.has(key)) { resp = store.get(key); logTo(L, `server: key ${key} already seen → replay stored response (${resp}), no new charge`, "ok"); }
        else {
          resp = "ch_" + (++chN).toString().padStart(3, "0");
          charges.push({ id: resp, pay, key });
          if (key) store.set(key, resp);
          const tr = document.createElement("tr"); const dup = charges.filter((c) => c.pay === pay).length > 1;
          if (dup) { tr.className = "dup"; $$("tr", led).forEach((r) => r.dataset.pay == pay && r.classList.add("dup")); }
          tr.dataset.pay = pay; tr.innerHTML = `<td class="mono">${resp}</td><td>#${pay}</td><td class="mono">${key || "—"}</td><td>$49.99</td>`; led.appendChild(tr);
          logTo(L, `server: card authorized → created ${resp}`);
        }
        statement();
        if (flaky && attempt === 1) {
          await fly(fl, eps, epm, "200 OK", "lost", 700, true);
          const delay = Math.random() * 0.5 * Math.pow(2, attempt);
          logTo(L, `✗ response lost. Client times out (it can't know whether it charged) → retry in ${delay.toFixed(2)} s (exponential backoff + full jitter)`, "bad");
          await sleep(600 + delay * 400); continue;
        }
        await fly(fl, eps, epm, "200 " + resp, "ack", 600);
        logTo(L, `← 200 OK ${resp}`, "ok");
        break;
      }
      busy = false; $("#pay", el).disabled = false;
    };
    $("#clr", el).onclick = () => { charges.length = 0; store.clear(); payN = 0; led.innerHTML = ""; L.innerHTML = ""; statement(); };
    return () => { alive = false; clearInterval(iv); };
  };

  BP.SIMS = SIMS;
})();

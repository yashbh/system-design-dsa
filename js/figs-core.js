/* Blueprint — interactive figure library, part 1: helpers + networking & caching figures.
 * Each figure: BP.FIGS[name] = (el, opts) => destroy()
 */
window.BP = window.BP || {};
(function () {
  const NS = "http://www.w3.org/2000/svg";
  const $ = (s, r) => r.querySelector(s);
  const $$ = (s, r) => Array.from(r.querySelectorAll(s));
  const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  function mk(tag, attrs = {}, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function tween(dur, fn, alive = () => true) {
    return new Promise((res) => {
      const t0 = performance.now();
      const f = (t) => {
        if (!alive()) return res();
        const k = Math.min(1, (t - t0) / dur);
        fn(ease(k), k);
        k < 1 ? requestAnimationFrame(f) : res();
      };
      requestAnimationFrame(f);
    });
  }
  /** Animate a glowing dot (optionally labelled) from a to b inside an <svg>/<g>. */
  async function dot(layer, a, b, o = {}) {
    if (!layer.isConnected) return;
    const color = o.color || "var(--c)";
    const g = mk("g", { class: "fx-dot" }, layer);
    mk("circle", { r: o.r || 6, fill: color, style: `filter:drop-shadow(0 0 6px ${color})` }, g);
    if (o.label) {
      const w = o.label.length * 6.4 + 12;
      mk("rect", { x: -w / 2, y: -26, width: w, height: 17, rx: 8, fill: color }, g);
      const t = mk("text", { y: -14, "text-anchor": "middle", "font-size": 10.5, "font-weight": 700, fill: "#fff" }, g);
      t.textContent = o.label;
    }
    const arc = o.arc || 0;
    await tween(o.dur || 600, (k) => {
      const x = a[0] + (b[0] - a[0]) * k, y = a[1] + (b[1] - a[1]) * k - Math.sin(k * Math.PI) * arc;
      g.setAttribute("transform", `translate(${x},${y})`);
    }, o.alive);
    if (o.keep) return g;
    g.remove();
  }
  /** Redraws go into a base group; the dot layer (id) is created once and never replaced,
   *  so packets in flight survive re-renders. */
  function fxBase(svg, id) {
    if (!svg._fxBase) { svg.innerHTML = ""; svg._fxBase = mk("g", {}, svg); mk("g", { id }, svg); }
    return svg._fxBase;
  }
  function ripple(layer, p, color = "var(--c)") {
    const c = mk("circle", { cx: p[0], cy: p[1], r: 4, fill: "none", stroke: color, "stroke-width": 2 }, layer);
    c.animate([{ r: 4, opacity: 1 }, { r: 34, opacity: 0 }], { duration: 650 }).onfinish = () => c.remove();
  }
  /** SVG string for a labelled box centred at (x, y). */
  function box(id, x, y, w, h, label, sub = "", kind = "service", extra = "") {
    return `<g class="fx-box" data-id="${id}" style="--kc:var(--k-${kind})" ${extra}>
      <rect class="fx-rect" x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="12"/>
      <text class="fx-l" x="${x}" y="${y + (sub ? -3 : 5)}" text-anchor="middle">${label}</text>
      ${sub ? `<text class="fx-s" x="${x}" y="${y + 14}" text-anchor="middle">${sub}</text>` : ""}</g>`;
  }
  const line = (a, b, cls = "fx-edge") => `<line class="${cls}" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`;
  const seg = (id, opts, on) => `<div class="seg" id="${id}">${opts.map(([v, l]) => `<button data-v="${v}" class="${v === on ? "on" : ""}">${l}</button>`).join("")}</div>`;
  const tog = (id, label, on) => `<label class="toggle"><input type="checkbox" id="${id}" ${on ? "checked" : ""}><span class="sw"></span>${label}</label>`;
  const slider = (id, label, min, max, val, step = 1) => `<div class="field"><label>${label} <b id="${id}-v">${val}</b></label><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}"></div>`;
  function bindSeg(root, id, fn) {
    $$(`#${id} button`, root).forEach((b) => (b.onclick = () => { $$(`#${id} button`, root).forEach((x) => x.classList.toggle("on", x === b)); fn(b.dataset.v); }));
  }
  function frame(el, { ctrl = "", stage = "", foot = "", h }) {
    el.innerHTML = `<div class="fig">${ctrl ? `<div class="fig-ctrl">${ctrl}</div>` : ""}<div class="fig-stage" ${h ? `style="min-height:${h}px"` : ""}>${stage}</div>${foot ? `<div class="fig-foot">${foot}</div>` : ""}</div>`;
    return el.firstElementChild;
  }
  function logger(box) {
    return (html, cls = "") => {
      const d = document.createElement("div"); d.className = cls; d.innerHTML = html;
      box.appendChild(d); while (box.children.length > 40) box.firstChild.remove();
      box.scrollTop = box.scrollHeight;
    };
  }
  const hash = (s, seed = 0) => { let h = 0x811c9dc5 ^ seed; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; return h >>> 0; };

  BP.FX = { fxBase, $, $$, mk, tween, dot, ripple, box, line, seg, tog, slider, bindSeg, frame, logger, sleep, rnd, pick, hash, ease };
  const FIGS = (BP.FIGS = BP.FIGS || {});

  /* ═══════════ Vertical vs horizontal scaling ═══════════ */
  FIGS.scaling = (el) => {
    let mode = "vertical", load = 20, killed = false, alive = true;
    const f = frame(el, {
      ctrl: `${seg("sc-mode", [["vertical", "⬆ Vertical (bigger box)"], ["horizontal", "➡ Horizontal (more boxes)"]], mode)}
             <div style="flex:1;min-width:220px">${slider("sc-load", "Traffic (k req/s)", 1, 100, load)}</div>
             <button class="btn sm" id="sc-kill">💥 Kill a server</button>`,
      stage: `<svg viewBox="0 0 760 300" id="sc-svg"></svg>`,
      foot: `<div class="grid3">${["Servers", "Monthly cost", "If one machine dies"].map((k, i) => `<div class="metric" id="sc-m${i}"><div class="k">${k}</div><div class="v">–</div></div>`).join("")}</div><div class="verdict" id="sc-v"></div>`
    });
    const svg = $("#sc-svg", f);
    let servers = [];
    function draw() {
      const needed = load / 10;
      let html = box("cl", 70, 150, 100, 50, "👥 Users", `${load}k req/s`, "client");
      servers = [];
      if (mode === "vertical") {
        const size = Math.min(1, Math.sqrt(needed / 10)), w = 90 + size * 150, h = 60 + size * 150, over = needed > 6.4;
        html += line([120, 150], [480 - w / 2, 150]);
        html += `<g class="fx-box ${killed ? "dead" : ""} ${over ? "bad" : ""}" style="--kc:var(--k-service)"><rect class="fx-rect" x="${480 - w / 2}" y="${150 - h / 2}" width="${w}" height="${h}" rx="16"/>
          <text class="fx-l" x="480" y="${150 - 6}" text-anchor="middle" font-size="${14 + size * 8}">🖥️ ${over ? "MAXED OUT" : `${Math.max(2, Math.round(needed * 10))} vCPU`}</text>
          <text class="fx-s" x="480" y="${150 + 14}" text-anchor="middle">${over ? "no bigger machine exists" : `${Math.max(4, Math.round(needed * 40))} GB RAM`}</text></g>`;
        servers.push([480, 150]);
        const cost = Math.round(Math.pow(Math.min(needed, 6.4) * 10, 1.6) * 6);
        set(0, "1", ""); set(1, "$" + cost.toLocaleString() + (over ? "+" : ""), over ? "bad" : needed > 4 ? "warn" : "");
        set(2, "100% outage", "bad");
        verdict(over ? "bad" : killed ? "bad" : "warn", killed ? "💥 The only machine died. The whole site is down (single point of failure)." : over ? "🧱 You hit the ceiling: the biggest machine money can buy can't serve this load. Vertical scaling has a hard limit, and costs grow faster than capacity." : "Vertical scaling is simple: no code changes, one machine. But it has a ceiling, costs grow super-linearly, and it's a single point of failure.");
      } else {
        const n = Math.max(1, Math.ceil(needed)), cols = Math.ceil(n / 4);
        html += box("lb", 260, 150, 110, 50, "⚖️ Load balancer", "", "edge") + line([120, 150], [205, 150]);
        for (let i = 0; i < n; i++) {
          const c = Math.floor(i / 4), r = i % 4, x = 420 + c * (cols > 4 ? 300 / cols : 80), y = 50 + r * 67;
          html += line([315, 150], [x - 30, y], "fx-edge thin");
          html += `<g class="fx-box ${killed && i === 0 ? "dead" : ""}" style="--kc:var(--k-service)"><rect class="fx-rect" x="${x - 30}" y="${y - 24}" width="60" height="48" rx="10"/><text class="fx-l" x="${x}" y="${y + 6}" text-anchor="middle" font-size="18">🖥️</text></g>`;
          if (!(killed && i === 0)) servers.push([x - 30, y]);
        }
        set(0, String(n), ""); set(1, "$" + Math.round(n * 160).toLocaleString(), "");
        set(2, `−${Math.round(100 / n)}% capacity`, n > 2 ? "good" : "warn");
        verdict("good", killed ? `💪 One of ${n} servers died. The load balancer stops sending it traffic and users barely notice (${Math.round(100 / n)}% capacity lost).` : "Horizontal scaling: add commodity machines behind a load balancer. Near-linear cost, no ceiling, survives failures. The catch: servers must be stateless, and you now run a distributed system.");
      }
      fxBase(svg, "sc-dots").innerHTML = html;
    }
    const set = (i, v, c) => { const m = $("#sc-m" + i, f); $(".v", m).textContent = v; m.className = "metric " + c; };
    const verdict = (c, h) => { const v = $("#sc-v", f); v.className = "verdict " + c; v.innerHTML = h; };
    bindSeg(f, "sc-mode", (v) => { mode = v; killed = false; draw(); });
    $("#sc-load", f).oninput = (e) => { load = +e.target.value; $("#sc-load-v", f).textContent = load; draw(); };
    $("#sc-kill", f).onclick = () => { killed = !killed; $("#sc-kill", f).textContent = killed ? "♻️ Restore" : "💥 Kill a server"; draw(); };
    draw();
    const iv = setInterval(() => {
      if (!alive) return;
      const layer = $("#sc-dots", f); if (!layer) return;
      if (mode === "vertical") { if (!killed) dot(layer, [120, 150], servers[0], { dur: 700, r: 4, alive: () => alive }); }
      else { const s = pick(servers); if (s) dot(layer, [120, 150], [260, 150], { dur: 350, r: 4, alive: () => alive }).then(() => dot(layer, [315, 150], s, { dur: 400, r: 4, alive: () => alive })); }
    }, 260);
    return () => { alive = false; clearInterval(iv); };
  };

  /* ═══════════ DNS resolution (step player) ═══════════ */
  FIGS.dns = (el) => {
    const N = { b: [80, 170, "🧑‍💻 Browser", "cache → OS → resolver", "client"], r: [290, 170, "🔁 Recursive resolver", "ISP / 8.8.8.8 / 1.1.1.1", "edge"], root: [560, 50, "🌐 Root server", "13 named root clusters", "external"], tld: [600, 170, "🏷️ .io TLD server", "knows .io domains", "external"], auth: [560, 290, "📇 Authoritative NS", "your DNS provider", "db"], web: [290, 300, "🖥️ del.icio.us server", "54.23.11.8", "service"] };
    const STEPS = [
      ["b", "r", "Browser and OS caches miss, so ask the resolver: \"what's the IP of del.icio.us?\""],
      ["r", "root", "Resolver (cache miss) asks a root server"],
      ["root", "r", "Root: \"I don't know, but here are the servers for .us\""],
      ["r", "tld", "Resolver asks the TLD server"],
      ["tld", "r", "TLD: \"ask del.icio.us's authoritative name server\""],
      ["r", "auth", "Resolver asks the authoritative server"],
      ["auth", "r", "Authoritative: \"A record: 54.23.11.8, TTL 300 s\""],
      ["r", "b", "Resolver caches it for 300 s and answers the browser"],
      ["b", "web", "Browser connects to 54.23.11.8 over TCP/TLS → HTTP GET /"]
    ];
    let i = -1, alive = true, busy = false;
    const f = frame(el, {
      ctrl: `<button class="btn primary sm" id="dn-next">Next step ▶</button><button class="btn sm" id="dn-play">▶ Play all</button><button class="btn sm" id="dn-again">↺ Visit again (cached)</button>`,
      stage: `<svg viewBox="0 0 760 350"><g>${Object.entries(N).map(([id, [x, y, l, s, k]]) => box(id, x, y, 190, 54, l, s, k)).join("")}</g><g id="dn-d"></g></svg>`,
      foot: `<div class="fig-cap" id="dn-cap"><span class="stepn">0/${STEPS.length}</span> A domain name is just a human alias. Computers route by IP address. Press <b>Next</b> to resolve <code>del.icio.us</code>.</div>`
    });
    const layer = $("#dn-d", f), cap = $("#dn-cap", f);
    const hl = (ids) => $$(".fx-box", f).forEach((g) => g.classList.toggle("on", ids.includes(g.dataset.id)));
    async function step(k) {
      busy = true; const [a, b, t] = STEPS[k];
      hl([a, b]); cap.innerHTML = `<span class="stepn">${k + 1}/${STEPS.length}</span> ${t}`;
      await dot(layer, N[a], N[b], { dur: 800, label: k === 8 ? "HTTP" : k % 2 ? "answer" : "query", alive: () => alive });
      ripple(layer, N[b]); busy = false;
    }
    $("#dn-next", f).onclick = async () => { if (busy) return; i = (i + 1) % STEPS.length; await step(i); };
    $("#dn-play", f).onclick = async () => { if (busy) return; for (i = 0; i < STEPS.length && alive; i++) { await step(i); await sleep(350); } i = -1; };
    $("#dn-again", f).onclick = async () => {
      if (busy) return; busy = true; hl(["b", "r"]);
      cap.innerHTML = `<span class="stepn">cached</span> Second visit within the TTL: the resolver (or browser) already has the answer, so there are <b>no root/TLD/auth round trips</b>. That's why DNS lookups are usually ~1 ms, and why changing DNS takes \"up to TTL\" to propagate.`;
      await dot(layer, N.b, N.r, { dur: 500, alive: () => alive }); await dot(layer, N.r, N.b, { dur: 500, label: "54.23.11.8", alive: () => alive });
      await dot(layer, N.b, N.web, { dur: 600, label: "HTTP", alive: () => alive }); busy = false;
    };
    return () => { alive = false; };
  };

  /* ═══════════ Load-balancing algorithms + health checks ═══════════ */
  FIGS.lb = (el) => {
    // Health-check settings, mirroring the lesson's table (interval sped up so it's watchable).
    const INTERVAL = 1600, UNHEALTHY = 2, HEALTHY = 2;
    const SV = [{ id: "S1", w: 1 }, { id: "S2", w: 1 }, { id: "S3", w: 2 }, { id: "S4", w: 4 }];
    const st = SV.map(() => ({ active: 0, served: 0, up: true, healthy: true, fails: 0, passes: 0, hist: [] }));
    const CL = ["#4f7ad8", "#c2577f", "#3f8f62", "#b9792a", "#7a69c7", "#9a8a2a"];
    let algo = "rr", rr = 0, alive = true, moved = 0, lastMap = {}, timeouts = 0;
    const wrrSeq = []; SV.forEach((s, i) => { for (let k = 0; k < s.w; k++) wrrSeq.push(i); });
    const f = frame(el, {
      ctrl: seg("lb-a", [["rr", "Round robin"], ["wrr", "Weighted RR"], ["least", "Least connections"], ["iphash", "IP hash (sticky)"]], algo) + `<span class="muted small">Click a server to crash or revive it.</span>`,
      stage: `<svg viewBox="0 0 760 340" id="lb-svg"></svg>`,
      foot: `<div class="fig-cap" id="lb-cap"></div><div class="small muted" id="lb-legend"></div><div class="log" id="lb-log" style="max-height:120px"></div>`
    });
    const svg = $("#lb-svg", f), log = logger($("#lb-log", f));
    const LB = [300, 170], pos = (i) => [600, 50 + i * 80], cpos = (c) => [60, 52 + c * 48];
    const CAPTIONS = {
      rr: "<b>Round robin:</b> hand requests out in turn (S1, S2, S3, S4, S1…). Simple and fair <i>if</i> servers are identical and requests cost the same.",
      wrr: "<b>Weighted round robin:</b> S4 has 4× the capacity (●●●●), so it gets 4 turns per cycle. Good for mixed hardware.",
      least: "<b>Least connections:</b> send each request to the server with the fewest in-flight requests, relative to its capacity. Adapts to slow requests.",
      iphash: "<b>IP hash:</b> <code>hash(client) % healthy servers</code> keeps each client on one server (sticky sessions). But when the healthy set changes, most clients get remapped, which is the motivation for consistent hashing."
    };
    // Build the static picture once; later updates only change attributes and text, so animations survive.
    let h = `<text class="fx-s" x="60" y="22" text-anchor="middle">clients</text>`;
    CL.forEach((c, i) => { const [x, y] = cpos(i); h += `<circle cx="${x}" cy="${y}" r="13" fill="${c}"/><text x="${x}" y="${y + 4}" text-anchor="middle" font-size="11" font-weight="700" fill="#fff">C${i + 1}</text>`; });
    h += `<g class="fx-box" style="--kc:var(--k-edge)"><rect class="fx-rect" x="${LB[0] - 80}" y="${LB[1] - 32}" width="160" height="64" rx="10"/><text class="fx-l" x="${LB[0]}" y="${LB[1] - 4}" text-anchor="middle">Load balancer</text><text class="fx-s" id="lb-algo" x="${LB[0]}" y="${LB[1] + 15}" text-anchor="middle"></text></g>`;
    SV.forEach((s, i) => {
      const [x, y] = pos(i);
      h += `<line class="fx-edge" id="lb-e${i}" x1="${LB[0] + 80}" y1="${LB[1]}" x2="${x - 70}" y2="${y}"/>
        <g class="fx-box srv" id="lb-s${i}" data-i="${i}" style="--kc:var(--k-service);cursor:pointer">
          <rect class="fx-rect" x="${x - 70}" y="${y - 30}" width="210" height="60" rx="10"/>
          <text class="fx-l" x="${x - 56}" y="${y - 7}">${s.id} <tspan class="fx-s">${"●".repeat(s.w)}</tspan></text>
          <text class="fx-s" id="lb-t${i}" x="${x - 56}" y="${y + 13}"></text>
          <g id="lb-h${i}"></g>
          <rect x="${x + 124}" y="${y - 20}" width="8" height="40" rx="3" fill="var(--panel2)"/><rect id="lb-b${i}" x="${x + 124}" y="${y + 20}" width="8" height="0" rx="3" fill="var(--ok)"/>
        </g>`;
    });
    svg.innerHTML = h + `<g id="lb-d"></g>`;
    const layer = $("#lb-d", svg), al = () => alive;
    function update() {
      $("#lb-algo", svg).textContent = { rr: "round robin", wrr: "weighted round robin", least: "least connections", iphash: "hash(ip) % healthy" }[algo];
      st.forEach((o, i) => {
        const g = $("#lb-s" + i, svg), [x, y] = pos(i);
        g.classList.toggle("dead", !o.up); g.classList.toggle("bad", !o.healthy);
        g.classList.toggle("warn", o.healthy && o.fails > 0);
        $("#lb-e" + i, svg).classList.toggle("cut", !o.healthy);
        $("#lb-t" + i, svg).textContent = !o.healthy ? `OUT OF ROTATION · ${o.up ? `recovering ${o.passes}/${HEALTHY}` : "crashed"}` : !o.up ? "crashed · LB hasn't noticed yet" : `${o.active} active · ${o.served} served`;
        const pct = Math.min(1, o.active / 8), b = $("#lb-b" + i, svg);
        b.setAttribute("y", y + 20 - 40 * pct); b.setAttribute("height", 40 * pct); b.setAttribute("fill", pct > 0.75 ? "var(--bad)" : "var(--ok)");
        // last health-check results as small marks: ✓ passed, ✗ failed
        $("#lb-h" + i, svg).innerHTML = o.hist.slice(-5).map((r, k) => `<text x="${x + 66 + k * 11}" y="${y - 7}" font-size="11" font-weight="700" fill="${r ? "var(--ok)" : "var(--bad)"}">${r ? "✓" : "✗"}</text>`).join("");
      });
      $("#lb-cap", f).innerHTML = CAPTIONS[algo] + (algo === "iphash" ? ` <b>Clients remapped so far: ${moved}.</b>` : "");
    }
    $("#lb-legend", f).innerHTML = `Health check: the LB sends <code>GET /health</code> to every server every ${INTERVAL / 1000} s (30 s in the lesson's example). <b>${UNHEALTHY}</b> failures in a row → out of rotation; <b>${HEALTHY}</b> passes in a row → back in. Requests sent to a crashed server before it's detected: <b id="lb-to">0</b>.`;
    function choose(client) {
      const live = st.map((o, i) => i).filter((i) => st[i].healthy);
      if (!live.length) return -1;
      if (algo === "rr") { for (let k = 0; k < 4; k++) { const i = rr++ % 4; if (st[i].healthy) return i; } }
      if (algo === "wrr") { for (let k = 0; k < wrrSeq.length; k++) { const i = wrrSeq[rr++ % wrrSeq.length]; if (st[i].healthy) return i; } }
      if (algo === "least") return live.reduce((a, b) => (st[a].active / SV[a].w <= st[b].active / SV[b].w ? a : b));
      if (algo === "iphash") { const i = live[hash("10.0.0." + client) % live.length]; if (lastMap[client] !== undefined && lastMap[client] !== i) moved++; lastMap[client] = i; return i; }
      return live[0];
    }
    $$(".srv", svg).forEach((g) => (g.onclick = () => {
      const i = +g.dataset.i, o = st[i]; o.up = !o.up;
      log(o.up ? `${SV[i].id} restarted. It must pass ${HEALTHY} health checks before it gets traffic again.` : `💥 ${SV[i].id} crashed. The LB doesn't know yet, so it keeps routing requests there until health checks fail.`, o.up ? "ok" : "bad");
      update();
    }));
    bindSeg(f, "lb-a", (v) => { algo = v; moved = 0; lastMap = {}; update(); });
    update();
    // Client traffic
    const send = setInterval(async () => {
      if (!alive) return;
      const c = Math.floor(Math.random() * 6), i = choose(c);
      await dot(layer, cpos(c), [LB[0] - 80, LB[1]], { color: CL[c], r: 5, dur: 380, alive: al });
      if (i < 0) { ripple(layer, LB, "var(--bad)"); log("503: no healthy servers left!", "bad"); return; }
      const [x, y] = pos(i);
      await dot(layer, [LB[0] + 80, LB[1]], [x - 70, y], { color: CL[c], r: 5, dur: 420, alive: al });
      if (!st[i].up) { timeouts++; $("#lb-to", f).textContent = timeouts; ripple(layer, [x - 70, y], "var(--bad)"); log(st[i].healthy ? `✗ C${c + 1}'s request to ${SV[i].id} timed out: the server is dead but the LB hasn't detected it yet.` : `✗ C${c + 1}'s request to ${SV[i].id} was already in flight when it was pulled, so it timed out.`, "bad"); return; }
      st[i].active++; update();
      setTimeout(() => { st[i].active = Math.max(0, st[i].active - 1); st[i].served++; if (alive) update(); }, rnd(800, 2600) / SV[i].w);
    }, 340);
    // Health checks: LB → server probe, server → LB reply (or a timeout)
    const hc = setInterval(() => {
      if (!alive) return;
      st.forEach(async (o, i) => {
        const [x, y] = pos(i), a = [LB[0] + 80, LB[1]], b = [x - 70, y];
        await dot(layer, a, b, { r: 3.5, color: "var(--muted)", dur: 450, alive: al });
        if (!alive) return;
        if (o.up) {
          await dot(layer, b, a, { r: 3.5, color: "var(--ok)", dur: 450, alive: al });
          o.hist.push(true); o.fails = 0;
          if (!o.healthy) { o.passes++; if (o.passes >= HEALTHY) { o.healthy = true; o.passes = 0; log(`${SV[i].id} passed ${HEALTHY} checks in a row → back in rotation.`, "ok"); } }
        } else {
          ripple(layer, b, "var(--bad)");
          o.hist.push(false); o.passes = 0;
          if (o.healthy) { o.fails++; if (o.fails >= UNHEALTHY) { o.healthy = false; log(`LB: ${SV[i].id} failed ${UNHEALTHY} health checks in a row (timeout) → marked unhealthy, no more traffic.`, "warn"); } else log(`LB: health check to ${SV[i].id} timed out (${o.fails}/${UNHEALTHY}).`); }
        }
        if (o.hist.length > 5) o.hist.shift();
        update();
      });
    }, INTERVAL);
    return () => { alive = false; clearInterval(send); clearInterval(hc); };
  };

  /* ═══════════ Memory hierarchy ═══════════ */
  FIGS.memory = (el) => {
    const T = [["CPU registers / L1 cache", "~1 ns", 1, "KB", "#a78bfa"], ["L2 / L3 cache", "~4–40 ns", 10, "MB", "#818cf8"], ["RAM (main memory)", "~100 ns", 100, "GB", "#60a5fa"], ["SSD", "~100 µs", 1e5, "TB", "#2dd4bf"], ["Spinning disk (HDD)", "~10 ms", 1e7, "TB", "#4ade80"], ["Network: another continent", "~150 ms", 1.5e8, "∞", "#fb923c"]];
    const human = (ns) => { const s = ns; return s < 60 ? `${s.toFixed(0)} s` : s < 3600 ? `${(s / 60).toFixed(1)} min` : s < 86400 ? `${(s / 3600).toFixed(1)} hours` : s < 2.6e6 ? `${(s / 86400).toFixed(1)} days` : s < 3.15e7 ? `${(s / 2.6e6).toFixed(1)} months` : `${(s / 3.15e7).toFixed(1)} years`; };
    let alive = true, humanize = false;
    const f = frame(el, {
      ctrl: tog("mh-h", "Humanize: if 1 ns took 1 second…", false) + `<span class="muted small">Click a tier to fetch data from it.</span>`,
      stage: `<svg viewBox="0 0 760 360" id="mh"></svg>`,
      foot: `<div class="fig-cap" id="mh-cap">Each level down is <b>bigger and cheaper, but slower</b>, often by 100× or more. Caching means keeping hot data in a higher tier.</div>`
    });
    const svg = $("#mh", f);
    function draw() {
      let h = "";
      T.forEach(([n, lat, ns, size, col], i) => {
        const w = 200 + i * 80, y = 20 + i * 55, x = 300 - w / 2;
        h += `<g class="tier" data-i="${i}" style="cursor:pointer"><path d="M${x + 20} ${y} H${x + w - 20} L${x + w} ${y + 48} H${x} Z" fill="${col}" opacity=".22" stroke="${col}"/>
          <text x="300" y="${y + 21}" text-anchor="middle" font-weight="700" font-size="14" fill="var(--text)">${n}</text>
          <text x="300" y="${y + 39}" text-anchor="middle" font-size="12" fill="var(--muted)">${humanize ? human(ns) : lat} · ${size}</text></g>`;
      });
      h += `<text x="640" y="40" font-size="12" fill="var(--muted)">⬆ faster, smaller,</text><text x="640" y="56" font-size="12" fill="var(--muted)">pricier per GB</text><text x="640" y="320" font-size="12" fill="var(--muted)">⬇ slower, bigger,</text><text x="640" y="336" font-size="12" fill="var(--muted)">cheaper per GB</text>
        <circle cx="300" cy="8" r="6" fill="var(--c)"/><text x="312" y="12" font-size="11" fill="var(--muted)">CPU</text>`;
      fxBase(svg, "mh-d").innerHTML = h;
      $$(".tier", svg).forEach((g) => (g.onclick = async () => {
        const i = +g.dataset.i, [n, lat, ns] = T[i], d = Math.min(2600, 250 + Math.log10(ns) * 300);
        $("#mh-cap", f).innerHTML = `Fetching from <b>${n}</b>: ${lat}${humanize ? ` (≈ <b>${human(ns)}</b> on the human scale)` : ""}. The animation is log-scaled; the real gap is ${ns >= 100 ? `<b>${(ns).toLocaleString()}×</b> slower than L1` : "tiny"}.`;
        const layer = $("#mh-d", svg); await dot(layer, [300, 8], [300, 44 + i * 55], { dur: d / 2, alive: () => alive }); await dot(layer, [300, 44 + i * 55], [300, 8], { dur: d / 2, label: "data", alive: () => alive });
      }));
    }
    $("#mh-h", f).onchange = (e) => { humanize = e.target.checked; draw(); };
    draw();
    return () => { alive = false; };
  };

  /* ═══════════ Where can we cache? request path ═══════════ */
  FIGS.cachepath = (el) => {
    const L = [["browser", "🧭 Browser cache", "0 ms", 0, "client", "HTML/CSS/JS/images with Cache-Control"], ["cdn", "🌍 CDN edge", "+20 ms", 20, "edge", "static & media near the user"], ["local", "⚙️ App server local cache", "+60 ms", 60, "service", "RAM on the origin server (≈60 ms trip)"], ["global", "⚡ Global cache (Redis)", "+1 ms", 1, "cache", "shared by all app servers"], ["db", "🗄️ Database", "+10 ms", 10, "db", "source of truth (disk)"]];
    const PRE = { first: [], avatar: ["browser"], image: ["cdn"], feed: ["global"], testcase: ["local"] };
    let hits = new Set(PRE.image), alive = true, busy = false;
    const f = frame(el, {
      ctrl: `<span class="muted small">Scenario:</span>${seg("cp-p", [["image", "Viral image"], ["avatar", "Your own avatar again"], ["feed", "News feed"], ["testcase", "Code-judge test file"], ["first", "Brand-new data"]], "image")}<button class="btn primary sm" id="cp-go">Send request ▶</button>`,
      stage: `<svg viewBox="0 0 760 380" id="cp"></svg>`,
      foot: `<div class="fig-cap" id="cp-cap">Toggle which layers hold the data (click a layer), then send a request. It stops at the first layer that has it.</div>`
    });
    const svg = $("#cp", f), Y = (i) => 40 + i * 72;
    function draw() {
      fxBase(svg, "cp-d").innerHTML = L.map(([id, l, lat, , k, s], i) => `${i ? line([200, Y(i - 1) + 26], [200, Y(i) - 26]) : ""}${box(id, 200, Y(i), 300, 52, l, s, k, `data-i="${i}"`)}
        <text x="380" y="${Y(i) + 5}" font-size="12" fill="var(--muted)">${lat}</text>
        <g class="hit-pill" data-i="${i}" style="cursor:pointer"><rect x="440" y="${Y(i) - 14}" width="120" height="28" rx="14" fill="${hits.has(id) ? "color-mix(in srgb,var(--ok) 25%,transparent)" : "var(--panel2)"}" stroke="${hits.has(id) ? "var(--ok)" : "var(--border2)"}"/><text x="500" y="${Y(i) + 5}" text-anchor="middle" font-size="12" font-weight="700" fill="var(--text)">${id === "db" ? "always has it" : hits.has(id) ? "✓ cached" : "— empty"}</text></g>`).join("");
      $$(".hit-pill", svg).forEach((g) => (g.onclick = () => { const id = L[+g.dataset.i][0]; if (id === "db") return; hits.has(id) ? hits.delete(id) : hits.add(id); draw(); }));
    }
    bindSeg(f, "cp-p", (v) => { hits = new Set(PRE[v]); draw(); });
    $("#cp-go", f).onclick = async () => {
      if (busy) return; busy = true;
      const layer = $("#cp-d", svg); let total = 0, i = 0;
      $$(".fx-box", svg).forEach((g) => g.classList.remove("on", "bad"));
      for (; i < L.length; i++) {
        total += L[i][3];
        const g = $$(".fx-box", svg)[i]; g.classList.add("on");
        if (hits.has(L[i][0]) || L[i][0] === "db") break;
        g.classList.add("bad");
        await dot(layer, [200, Y(i) + 26], [200, Y(i + 1) - 26], { dur: 350, alive: () => alive });
      }
      const hitAt = L[i];
      for (let j = i; j > 0; j--) await dot(layer, [200, Y(j) - 26], [200, Y(j - 1) + 26], { dur: 250, color: "var(--ok)", alive: () => alive });
      $("#cp-cap", f).innerHTML = `Served by <b>${hitAt[1]}</b> in ≈ <b>${total} ms</b>. ${i === 0 ? "Fastest possible: no network at all." : i === 4 ? "Full trip to the database. Caching the result on the way back (cache-aside) makes the next request fast." : `Layers above it missed; the ones below never saw the request, so their load is saved.`}`;
      busy = false;
    };
    draw();
    return () => { alive = false; };
  };

  /* ═══════════ Write policies ═══════════ */
  FIGS.writepolicy = (el) => {
    let pol = "through", cache = { v: 1, dirty: false, ok: true }, db = 1, n = 1, alive = true, busy = false, flushT = null;
    const P = { app: [110, 160], cache: [380, 80], db: [380, 260] };
    const f = frame(el, {
      ctrl: seg("wp-p", [["through", "Write-through"], ["around", "Write-around"], ["back", "Write-back"]], pol) + `<button class="btn primary sm" id="wp-w">✍️ write x</button><button class="btn sm" id="wp-r">👀 read x</button><button class="btn sm" id="wp-c">💥 crash cache</button>`,
      stage: `<svg viewBox="0 0 760 330" id="wp"></svg>`,
      foot: `<div class="grid3"><div class="metric" id="wp-lat"><div class="k">Last write latency</div><div class="v">–</div></div><div class="metric" id="wp-cons"><div class="k">Cache vs DB</div><div class="v">–</div></div><div class="metric" id="wp-risk"><div class="k">Data at risk</div><div class="v">–</div></div></div><div class="fig-cap" id="wp-cap"></div>`
    });
    const svg = $("#wp", f);
    const DESC = {
      through: "<b>Write-through:</b> write to cache <i>and</i> DB synchronously; ack after both. Cache is always fresh, no data loss, but writes pay DB latency. Good when data is read right after it's written.",
      around: "<b>Write-around:</b> write straight to the DB and invalidate (delete) the cache entry. Avoids filling the cache with data nobody reads. The next read is a miss.",
      back: "<b>Write-back (write-behind):</b> write only to the cache and ack immediately. The DB is updated later, in batches. Fastest writes, but if the cache dies before flushing, the data is <b>gone</b>."
    };
    function draw() {
      const stale = cache.ok && cache.v !== null && cache.v !== db;
      fxBase(svg, "wp-d").innerHTML = box("app", ...P.app, 150, 60, "⚙️ App server", "", "service") + line([185, 145], [300, 92]) + line([185, 175], [300, 248]) + line([380, 112], [380, 228], "fx-edge thin") +
        `<g class="fx-box ${cache.ok ? "" : "dead"} ${stale ? "warn" : ""}" style="--kc:var(--k-cache)"><rect class="fx-rect" x="300" y="45" width="160" height="70" rx="12"/><text class="fx-l" x="380" y="72" text-anchor="middle">⚡ Cache</text><text x="380" y="98" text-anchor="middle" font-family="var(--mono)" font-size="15" fill="var(--text)">${cache.ok ? (cache.v === null ? "x = (empty)" : `x = ${cache.v}${cache.dirty ? " ✱dirty" : ""}`) : "CRASHED"}</text></g>` +
        `<g class="fx-box" style="--kc:var(--k-db)"><rect class="fx-rect" x="300" y="225" width="160" height="70" rx="12"/><text class="fx-l" x="380" y="252" text-anchor="middle">🗄️ Database</text><text x="380" y="278" text-anchor="middle" font-family="var(--mono)" font-size="15" fill="var(--text)">x = ${db}</text></g>` +
        `<text x="520" y="170" font-size="12" fill="var(--muted)">${pol === "back" ? "flush every 4 s (async)" : pol === "around" ? "reads repopulate cache" : "both updated together"}</text>`;
      $("#wp-cons .v", f).textContent = !cache.ok ? "cache gone" : cache.v === null ? "cache empty" : cache.v === db ? "in sync ✓" : "DIFFERENT";
      $("#wp-cons", f).className = "metric " + (cache.ok && cache.v !== null && cache.v !== db ? "warn" : "good");
      const risk = cache.dirty ? `x=${cache.v} only in RAM` : "none";
      $("#wp-risk .v", f).textContent = risk; $("#wp-risk", f).className = "metric " + (cache.dirty ? "bad" : "good");
      $("#wp-cap", f).innerHTML = DESC[pol];
    }
    const L = () => $("#wp-d", svg), al = () => alive;
    async function write() {
      if (busy) return; busy = true; n++; const v = n;
      if (pol === "through") {
        await dot(L(), P.app, [300, 80], { label: `x=${v}`, alive: al }); if (cache.ok) cache.v = v; draw();
        await dot(L(), [380, 112], [380, 228], { label: `x=${v}`, alive: al }); db = v; draw();
        await dot(L(), [300, 260], P.app, { color: "var(--ok)", label: "ack", alive: al }); lat(12);
      } else if (pol === "around") {
        await dot(L(), P.app, [300, 260], { label: `x=${v}`, alive: al }); db = v; draw();
        await dot(L(), P.app, [300, 80], { color: "var(--warn)", label: "invalidate", alive: al }); if (cache.ok) cache.v = null; draw();
        await dot(L(), [300, 260], P.app, { color: "var(--ok)", label: "ack", alive: al }); lat(10);
      } else {
        if (!cache.ok) { cache = { v: null, dirty: false, ok: true }; }
        await dot(L(), P.app, [300, 80], { label: `x=${v}`, alive: al }); cache.v = v; cache.dirty = true; draw();
        await dot(L(), [300, 80], P.app, { color: "var(--ok)", label: "ack", alive: al }); lat(1);
        clearTimeout(flushT); flushT = setTimeout(flush, 4000);
      }
      busy = false;
    }
    async function flush() {
      if (!alive || !cache.ok || !cache.dirty) return;
      await dot(L(), [380, 112], [380, 228], { label: `flush x=${cache.v}`, color: "var(--k-cache)", alive: al }); db = cache.v; cache.dirty = false; draw();
    }
    const lat = (ms) => { $("#wp-lat .v", f).textContent = `~${ms} ms`; $("#wp-lat", f).className = "metric " + (ms < 3 ? "good" : "warn"); };
    async function read() {
      if (busy) return; busy = true;
      await dot(L(), P.app, [300, 80], { label: "get x", alive: al });
      if (cache.ok && cache.v !== null) { await dot(L(), [300, 80], P.app, { color: "var(--ok)", label: `HIT ${cache.v}`, alive: al }); }
      else {
        await dot(L(), [380, 112], [380, 228], { color: "var(--bad)", label: "MISS → DB", alive: al });
        await dot(L(), [300, 260], P.app, { label: `x=${db}`, alive: al });
        if (!cache.ok) cache = { v: null, dirty: false, ok: true };
        await dot(L(), P.app, [300, 80], { label: "populate", color: "var(--k-cache)", alive: al }); cache.v = db; draw();
      }
      busy = false;
    }
    function crash() {
      const lost = cache.dirty ? cache.v : null;
      cache = { v: null, dirty: false, ok: false }; clearTimeout(flushT); draw();
      $("#wp-cap", f).innerHTML = lost ? `💀 <b>Data loss!</b> x=${lost} was acknowledged to the user but never reached the database. That's the write-back risk. Mitigate with replication or a write-ahead log.` : "Cache crashed, but every acknowledged write is safe in the DB. The next read is a miss and repopulates the cache.";
    }
    bindSeg(f, "wp-p", (v) => { pol = v; clearTimeout(flushT); cache = { v: db, dirty: false, ok: true }; draw(); });
    $("#wp-w", f).onclick = write; $("#wp-r", f).onclick = read; $("#wp-c", f).onclick = crash;
    draw();
    return () => { alive = false; clearTimeout(flushT); };
  };

  /* ═══════════ Eviction policies side by side ═══════════ */
  FIGS.eviction = (el) => {
    const CAP = 4, KEYS = "ABCDEF".split("");
    const SEQ = "A B C D A B E A B C D E A A A F A".split(" ");
    let t = 0, alive = true, timer = null;
    const mkP = () => ({ items: [], hit: 0, miss: 0, last: null, evicted: null });
    let P = { FIFO: mkP(), LRU: mkP(), LFU: mkP() };
    const f = frame(el, {
      ctrl: `<span class="muted small">Access key:</span>${KEYS.map((k) => `<button class="btn sm" data-k="${k}">${k}</button>`).join("")}<button class="btn primary sm" id="ev-seq">▶ Play sample sequence</button><button class="btn sm" id="ev-reset">↺</button>`,
      stage: `<div class="ev-grid" id="ev"></div>`,
      foot: `<div class="fig-cap" id="ev-cap">Capacity is <b>4</b>. Every policy sees the same accesses. When the cache is full, each one evicts a different victim: <b>FIFO</b> evicts the oldest inserted, <b>LRU</b> the least recently used, <b>LFU</b> the least frequently used.</div><div class="mono small muted" id="ev-trail" style="margin-top:6px"></div>`
    });
    function access(k) {
      t++;
      for (const name in P) {
        const p = P[name], it = p.items.find((x) => x.k === k);
        p.last = k; p.evicted = null;
        if (it) { p.hit++; it.used = t; it.freq++; it.flash = "hit"; }
        else {
          p.miss++;
          if (p.items.length >= CAP) {
            let v;
            if (name === "FIFO") v = p.items.reduce((a, b) => (a.ins < b.ins ? a : b));
            if (name === "LRU") v = p.items.reduce((a, b) => (a.used < b.used ? a : b));
            if (name === "LFU") v = p.items.reduce((a, b) => (a.freq < b.freq || (a.freq === b.freq && a.used < b.used) ? a : b));
            p.evicted = v.k; p.items = p.items.filter((x) => x !== v);
          }
          p.items.push({ k, ins: t, used: t, freq: 1, flash: "miss" });
        }
      }
      $("#ev-trail", f).textContent = "Accesses: " + (($("#ev-trail", f).dataset.s || "") + " " + k).trim();
      $("#ev-trail", f).dataset.s = ($("#ev-trail", f).dataset.s || "") + " " + k;
      draw();
    }
    function draw() {
      const best = Object.entries(P).sort((a, b) => b[1].hit - a[1].hit)[0];
      $("#ev", f).innerHTML = Object.entries(P).map(([name, p]) => `
        <div class="pane ev-col ${p.hit + p.miss > 0 && name === best[0] && best[1].hit > 0 ? "best" : ""}">
          <h4>${name}</h4>
          <div class="ev-slots">${Array.from({ length: CAP }, (_, i) => { const it = [...p.items].sort((a, b) => a.ins - b.ins)[i]; return it ? `<div class="ev-slot ${it.flash || ""}"><b>${it.k}</b><small>${name === "FIFO" ? `in @${it.ins}` : name === "LRU" ? `used @${it.used}` : `freq ${it.freq}`}</small></div>` : `<div class="ev-slot empty">—</div>`; }).join("")}</div>
          <div class="small" style="margin-top:8px">${p.last ? (p.items.find((x) => x.k === p.last && x.flash === "hit") ? `<span style="color:var(--ok)">✓ hit ${p.last}</span>` : `<span style="color:var(--bad)">✗ miss ${p.last}</span>`) : "&nbsp;"} ${p.evicted ? `· evicted <b>${p.evicted}</b>` : ""}</div>
          <div class="ev-score">Hits <b>${p.hit}</b> / ${p.hit + p.miss}</div>
        </div>`).join("");
      for (const n in P) P[n].items.forEach((x) => (x.flash = ""));
    }
    $$("[data-k]", f).forEach((b) => (b.onclick = () => access(b.dataset.k)));
    const reset = () => { clearTimeout(timer); t = 0; P = { FIFO: mkP(), LRU: mkP(), LFU: mkP() }; $("#ev-trail", f).dataset.s = ""; $("#ev-trail", f).textContent = ""; draw(); };
    $("#ev-reset", f).onclick = reset;
    $("#ev-seq", f).onclick = () => {
      reset(); let i = 0;
      const step = () => { if (!alive || i >= SEQ.length) { if (alive) $("#ev-cap", f).innerHTML += " <br>👉 On this sequence the hot key <b>A</b> keeps coming back: LFU protects it best, and FIFO happily evicts it. Real caches (like Redis) offer LRU and LFU variants and use approximations for speed."; return; } access(SEQ[i++]); timer = setTimeout(step, 650); };
      step();
    };
    draw();
    return () => { alive = false; clearTimeout(timer); };
  };

  /* ═══════════ Redis sorted-set leaderboard ═══════════ */
  FIGS.leaderboard = (el) => {
    const names = ["aarav", "diya", "kabir", "meera", "rohan", "sara", "vikram", "zoya", "arjun", "isha", "neel", "tara"];
    let scores = Object.fromEntries(names.map((n) => [n, Math.floor(rnd(100, 900))])), alive = true, auto = null, me = "meera";
    const f = frame(el, {
      ctrl: `<button class="btn primary sm" id="lbd-sub">✅ Random user solves a problem</button>${tog("lbd-auto", "Contest live (auto)", false)}<button class="btn sm" id="lbd-me">🙋 Where am I? (ZREVRANK)</button>`,
      stage: `<div class="grid2" style="grid-template-columns:1.2fr 1fr"><div class="lbd" id="lbd"></div><div><div class="log" id="lbd-log" style="max-height:330px"></div></div></div>`,
      foot: `<div class="fig-cap">A Redis <b>sorted set</b> keeps members ordered by score (a skip list inside). Updating a score is <code>O(log N)</code>, and reading the top 10 is <code>O(log N + 10)</code>. Compare that to running <code>SELECT … ORDER BY score DESC LIMIT 10</code> over 100k contestants on every page refresh.</div>`
    });
    const log = logger($("#lbd-log", f));
    let rows = {};
    function draw() {
      const host = $("#lbd", f), sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
      sorted.forEach(([n, s], i) => {
        let r = rows[n];
        if (!r) { r = rows[n] = document.createElement("div"); r.className = "lbd-row"; host.appendChild(r); }
        r.style.transform = `translateY(${i * 34}px)`;
        r.classList.toggle("me", n === me);
        r.innerHTML = `<span class="rk">#${i + 1}</span><span>${i < 3 ? ["🥇", "🥈", "🥉"][i] : "👤"} ${n}</span><b>${s}</b>`;
      });
      host.style.height = sorted.length * 34 + "px";
    }
    function solve() {
      const n = pick(names), d = Math.floor(rnd(20, 160)); scores[n] += d;
      log(`<span class="hl">ZINCRBY</span> contest:42 ${d} ${n}  → ${scores[n]}`); draw();
      const r = rows[n]; r.classList.remove("bump"); void r.offsetWidth; r.classList.add("bump");
      if (Math.random() < 0.5) log(`<span class="ok">ZREVRANGE</span> contest:42 0 9 WITHSCORES  (top 10)`, "muted");
    }
    $("#lbd-sub", f).onclick = solve;
    $("#lbd-auto", f).onchange = (e) => { clearInterval(auto); if (e.target.checked) auto = setInterval(() => alive && solve(), 700); };
    $("#lbd-me", f).onclick = () => { const rank = Object.entries(scores).sort((a, b) => b[1] - a[1]).findIndex(([n]) => n === me); log(`<span class="hl">ZREVRANK</span> contest:42 ${me} → ${rank} (0-based) · rank #${rank + 1}`, "ok"); };
    draw();
    return () => { alive = false; clearInterval(auto); };
  };
})();

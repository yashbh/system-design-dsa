/* Blueprint — app shell: routing, views, diagrams, quizzes, progress. */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const C = BP.CONCEPTS, CASES = BP.CASES;
  const byId = Object.fromEntries(CASES.map((c) => [c.id, c]));
  const app = $("#app");
  let cleanups = [];
  const onCleanup = (fn) => cleanups.push(fn);

  /* ── Progress ───────────────────────────── */
  const store = {
    get() { try { return JSON.parse(localStorage.getItem("bp-progress")) || { done: {}, quiz: {} }; } catch { return { done: {}, quiz: {} }; } },
    set(v) { localStorage.setItem("bp-progress", JSON.stringify(v)); renderXP(); }
  };
  function xp() {
    const p = store.get();
    let x = Object.keys(p.done).length * 100;
    for (const k in p.quiz) x += (p.quiz[k].correct || 0) * 25;
    return x;
  }
  const MAX_XP = () => (CASES.length + (BP.LESSONS || []).length + Object.keys((BP.DSA || {}).topics || {}).length) * 200;
  function renderXP() {
    $("#xp-val").textContent = xp();
    $("#xp-fill").style.width = Math.min(100, (xp() / MAX_XP()) * 100) + "%";
  }

  /* ── Theme ───────────────────────────── */
  const root = document.documentElement;
  root.dataset.theme = localStorage.getItem("bp-theme") || "light";
  $("#theme").onclick = () => {
    root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
    localStorage.setItem("bp-theme", root.dataset.theme);
  };
  function setAccent(c1, c2, mod) {
    // Lessons take their module's colour (set in CSS via data-mod); case studies take the company's.
    const brand = c1 && c1 !== "#7c5cff" ? c1 : null;
    root.style.setProperty("--brand", brand || "var(--text)");
    if (mod) root.dataset.mod = mod; else delete root.dataset.mod;
    if (brand && !mod) root.dataset.brandpage = ""; else delete root.dataset.brandpage;
  }

  /* ── Helpers ───────────────────────────── */
  const chip = (id) => C[id] ? `<button class="chip" data-concept="${id}">${C[id].name}</button>` : "";
  function observe(sel, cls = "in", opts = { threshold: 0.15 }) {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add(cls); e.target.dispatchEvent(new CustomEvent("revealed")); io.unobserve(e.target); }
    }), opts);
    $$(sel).forEach((el) => io.observe(el));
    onCleanup(() => io.disconnect());
  }
  function countUp(el) {
    const v = +el.dataset.v, d = +(el.dataset.d || 0), pre = el.dataset.pre || "", suf = el.dataset.suf || "";
    const t0 = performance.now(), dur = 1400;
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 4);
      el.innerHTML = pre + (v * e).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d }) + suf;
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  function confetti() {
    const colors = ["#7c5cff", "#22d3ee", "#22c55e", "#f59e0b", "#ef4444", "#f472b6"];
    for (let i = 0; i < 90; i++) {
      const p = document.createElement("i");
      p.className = "confetti";
      p.style.left = Math.random() * 100 + "vw";
      p.style.background = colors[i % colors.length];
      p.style.animationDuration = 1.8 + Math.random() * 1.8 + "s";
      p.style.animationDelay = Math.random() * 0.4 + "s";
      p.style.borderRadius = Math.random() > 0.5 ? "50%" : "2px";
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 4200);
    }
  }
  function tilt(cards) {
    cards.forEach((card) => {
      card.addEventListener("mousemove", (e) => {
        const r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        card.style.setProperty("--mx", x * 100 + "%"); card.style.setProperty("--my", y * 100 + "%");
        card.style.transform = `perspective(900px) rotateX(${(0.5 - y) * 6}deg) rotateY(${(x - 0.5) * 8}deg) translateY(-4px)`;
      });
      card.addEventListener("mouseleave", () => { card.style.transform = ""; });
    });
  }

  /* ── Concept drawer ───────────────────────────── */
  const drawer = $("#drawer"), drawerBg = $("#drawer-bg");
  function openConcept(id) {
    const k = C[id]; if (!k) return;
    drawer.innerHTML = `
      <button class="icon-btn close" aria-label="Close">✕</button>
            <span class="tag">${k.cat}</span>
      <h2>${k.name}</h2>
      <p class="one">${k.one}</p>
      <div class="analogy"><span>💡</span><div><b>Think of it like…</b><br>${k.analogy}</div></div>
      <h4 style="margin-top:26px">How it works</h4>
      <p class="muted">${k.body}</p>
      ${k.code ? `<pre>${k.code.replace(/</g, "&lt;")}</pre>` : ""}
      <a class="btn primary" style="margin-top:18px" href="#/concept/${id}">${k.fig || k.sim ? "Open the interactive explainer →" : "Open full page →"}</a>
      ${usedLinks(id)}`;
    drawer.classList.add("on"); drawerBg.classList.add("on");
    $(".close", drawer).onclick = closeConcept;
    $$(".used a, .btn", drawer).forEach((a) => a.addEventListener("click", closeConcept));
  }
  const lessonsFor = (id) => (BP.LESSONS || []).filter((l) => l.concepts.includes(id));
  function usedLinks(id) {
    const k = C[id], ls = lessonsFor(id);
    return (ls.length ? `<h4 style="margin-top:26px">Learn it in the course</h4><div class="used">${ls.map((l) => `<a href="#/lesson/${l.id}"><div><b>${l.title}</b><br><small class="muted">${l.scaler}</small></div></a>`).join("")}</div>` : "") +
      (k.used.length ? `<h4 style="margin-top:26px">Seen in these case studies</h4><div class="used">${k.used.map((cid) => { const c = byId[cid]; return `<a href="#/case/${cid}" style="--c:${c.color}"><span class="app-icon mini" style="--brand:${c.color}">${c.app[0]}</span><div><b>${c.app}</b><br><small class="muted">${c.title}</small></div></a>`; }).join("")}</div>` : "");
  }
  function closeConcept() { drawer.classList.remove("on"); drawerBg.classList.remove("on"); }
  drawerBg.onclick = closeConcept;
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeConcept(); });
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-concept]");
    if (t) { e.preventDefault(); openConcept(t.dataset.concept); }
  });

  /* ── Architecture diagram engine ───────────────────────────── */
  const KINDS = { client: "Client", edge: "Edge / LB", service: "Service", cache: "Cache", db: "Database", queue: "Queue / Log", external: "External" };
  function renderDiagram(host, dg, opts = {}) {
    const W = 1000, H = 450, NW = 168, NH = 62;
    const nodes = Object.fromEntries(dg.nodes.map((n) => [n.id, n]));
    const pairs = new Map();
    dg.flows.forEach((f) => f.steps.forEach(([a, b]) => { const k = [a, b].sort().join("|"); pairs.set(k, [a, b]); }));
    const clip = (a, b) => {
      const dx = b.x - a.x, dy = b.y - a.y;
      const ta = Math.min(Math.abs((NW / 2 + 6) / (dx || 1e-9)), Math.abs((NH / 2 + 6) / (dy || 1e-9)));
      return [a.x + dx * ta, a.y + dy * ta, b.x - dx * ta, b.y - dy * ta];
    };
    const edgeSvg = [...pairs.values()].map(([a, b]) => {
      const [x1, y1, x2, y2] = clip(nodes[a], nodes[b]);
      return `<line class="dg-edge" data-e="${[a, b].sort().join("|")}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
    }).join("");
    const nodeSvg = dg.nodes.map((n) => `
      <g class="dg-node" data-id="${n.id}" style="--kc:var(--k-${n.kind})" transform="translate(${n.x - NW / 2},${n.y - NH / 2})">
        <rect class="box" width="${NW}" height="${NH}" rx="14"/>
        <rect class="bar" x="0" y="14" width="3.5" height="${NH - 28}" rx="2"/>
        <text class="ico" x="16" y="${NH / 2 + 7}">${n.icon}</text>
        <text class="lbl" x="48" y="${NH / 2 - 3}">${n.label}</text>
        <text class="sub" x="48" y="${NH / 2 + 14}">${n.sub || ""}</text>
      </g>`).join("");
    const kindsUsed = [...new Set(dg.nodes.map((n) => n.kind))];
    host.innerHTML = `
      <div class="diagram-wrap">
        ${opts.compact ? "" : `<div class="diagram-bar"><span class="label">Trace a request</span>${dg.flows.map((f, i) => `<button class="btn sm" data-flow="${i}">${f.name}</button>`).join("")}</div>`}
        <div class="diagram"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
          <g class="edges">${edgeSvg}</g><g class="hotlines"></g><g class="nodes">${nodeSvg}</g><g class="packets"></g>
        </svg></div>
        ${opts.compact ? "" : `<div class="diagram-foot">
          <div class="caption"><span class="stepn">READY</span><span class="cap-text muted">Pick a flow above and watch a request travel through the system. Click any box to see what it does.</span></div>
          <div class="node-info"><b>Tip</b>Every box is clickable.</div>
        </div>
        <div class="legend">${kindsUsed.map((k) => `<span><i style="background:var(--k-${k})"></i>${KINDS[k]}</span>`).join("")}</div>`}
      </div>`;
    const svg = $("svg", host), pk = $(".packets", svg), hot = $(".hotlines", svg);
    let token = 0;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    async function play(fi) {
      const my = ++token, flow = dg.flows[fi];
      $$("[data-flow]", host).forEach((b) => b.classList.toggle("primary", +b.dataset.flow === fi));
      for (let i = 0; i < flow.steps.length; i++) {
        if (my !== token) return;
        const [a, b, text] = flow.steps[i];
        const A = nodes[a], B = nodes[b];
        $$(".dg-node", svg).forEach((g) => g.classList.toggle("active", g.dataset.id === a || g.dataset.id === b));
        const cap = $(".caption", host);
        if (cap) cap.innerHTML = `<span class="stepn">${i + 1}/${flow.steps.length}</span><span class="cap-text">${text}</span>`;
        const [x1, y1, x2, y2] = clip(A, B);
        hot.innerHTML = `<line class="dg-edge hot" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
        const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        dot.setAttribute("r", 7); dot.setAttribute("class", "dg-packet"); pk.appendChild(dot);
        const dur = opts.compact ? 700 : 950, t0 = performance.now();
        await new Promise((res) => {
          const step = (t) => {
            if (my !== token) { dot.remove(); return res(); }
            const k = Math.min(1, (t - t0) / dur), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
            dot.setAttribute("cx", x1 + (x2 - x1) * e); dot.setAttribute("cy", y1 + (y2 - y1) * e);
            k < 1 ? requestAnimationFrame(step) : res();
          };
          requestAnimationFrame(step);
        });
        dot.remove();
        const rp = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        rp.setAttribute("class", "dg-ripple"); rp.setAttribute("cx", x2); rp.setAttribute("cy", y2);
        pk.appendChild(rp);
        rp.animate([{ r: 4, opacity: 1 }, { r: 30, opacity: 0 }], { duration: 600 }).onfinish = () => rp.remove();
        await sleep(opts.compact ? 250 : 900);
      }
      if (my !== token) return;
      hot.innerHTML = "";
      $$(".dg-node", svg).forEach((g) => g.classList.remove("active"));
      const cap = $(".caption", host);
      if (cap) cap.innerHTML = `<span class="stepn">DONE</span><span class="cap-text">That's the full path for <b>${flow.name.toLowerCase()}</b>. Try another flow, or click boxes to dig in.</span>`;
      if (opts.loop) { await sleep(800); if (my === token) play((fi + 1) % dg.flows.length); }
    }
    $$("[data-flow]", host).forEach((b) => (b.onclick = () => play(+b.dataset.flow)));
    $$(".dg-node", svg).forEach((g) => g.addEventListener("click", () => {
      const n = nodes[g.dataset.id], info = $(".node-info", host);
      $$(".dg-node", svg).forEach((x) => x.classList.toggle("sel", x === g));
      if (info) info.innerHTML = `<b>${n.icon} ${n.label}</b>${n.desc}`;
    }));
    if (opts.autoplay) setTimeout(() => play(0), 600);
    onCleanup(() => { token++; });
    return { play };
  }
  BP.renderDiagram = renderDiagram;

  /* ── Lazy figure mounting (figures & sims start when scrolled near) ── */
  function mountFigures(root) {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      const el = e.target;
      if (el.dataset.viz) { try { onCleanup(BP.viz(el, el.dataset.viz)); } catch (err) { console.error(err); el.innerHTML = `<p class="muted">Visualisation failed to load.</p>`; } return; }
      const name = el.dataset.fig || el.dataset.sim;
      const fn = el.dataset.fig ? BP.FIGS[name] : BP.SIMS[name];
      if (!fn) { el.innerHTML = `<p class="muted">Missing figure: ${name}</p>`; return; }
      try { const d = fn(el, {}); if (typeof d === "function") onCleanup(d); } catch (err) { console.error(err); el.innerHTML = `<p class="muted">Figure failed to load.</p>`; }
    }), { rootMargin: "300px" });
    $$("[data-fig],[data-sim],[data-viz]", root).forEach((x) => io.observe(x));
    // Charts animate when they are actually on screen.
    const cio = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { cio.unobserve(e.target); try { BP.chart(e.target, chartStore[+e.target.dataset.chartI]); } catch (err) { console.error(err); } } }), { threshold: 0.35 });
    $$("[data-chart-i]", root).forEach((x) => cio.observe(x));
    onCleanup(() => cio.disconnect());
    onCleanup(() => io.disconnect());
  }

  /* ── Views ───────────────────────────── */
  function viewHome() {
    setAccent("#7c5cff", "#22d3ee");
    const p = store.get();
    const order = ["bitly", "whatsapp", "stripe", "instagram", "twitter", "uber", "youtube", "netflix", "gdocs", "discord", "ticketmaster"];
    app.innerHTML = `
    <div class="view">
      <section class="hero">
        <div>
          <div class="hero-badge"><span>NEW</span> ${LESSONS().length}-lesson HLD course · ${CASES.length} case studies · ${Object.keys(C).length} building blocks</div>
          <h1>How the biggest apps are actually built</h1>
          <p class="lead">An ${LESSONS().length}-lesson system design course and ${CASES.length} case studies. Every design starts with the version that breaks, then fixes it one decision at a time, in diagrams you can run.</p>
          <div class="ctas">
            <a class="btn primary" href="#/lesson/${(LESSONS().find((l) => !p.done[lessonKey(l.id)]) || LESSONS()[0]).id}">${LESSONS().some((l) => p.done[lessonKey(l.id)]) ? "Continue the course" : "Start the course"}</a>
            <a class="btn" href="#/case/${order.find((id) => !p.done[id]) || "bitly"}">Try a case study</a>
            <a class="btn" href="#/concepts">Building blocks</a>
          </div>
        </div>
        <div class="hero-visual" id="hero-dg"></div>
      </section>

      <section class="section reveal">
        <div class="section-head"><div class="eyebrow">The course</div><h2>Learn the fundamentals, one interactive lesson at a time</h2><p>${LESSONS().length} lessons following the Scaler HLD curriculum: DNS to Kafka to sagas, with ${LESSONS().reduce((a, l) => a + l.sections.reduce((b, s) => b + s.blocks.filter((x) => ["fig", "sim", "flow", "chart"].includes(x[0])).length, 0), 0)} animated diagrams and charts.</p></div>
        <div class="mod-grid stagger">${BP.MODULES.map((m, i) => { const ls = LESSONS().filter((l) => l.mod === m.id), dn = ls.filter((l) => p.done[lessonKey(l.id)]).length; return `<a class="card mod-card mod-${m.id}" href="#/lesson/${ls[0].id}"><div class="mod-thumb">${BP.LESSON_SCENES[ls[0].id] ? BP.scene(BP.LESSON_SCENES[ls[0].id]) : ""}</div><div class="row" style="justify-content:space-between"><span class="mod-dot"></span><span class="tag">Module ${i + 1}</span></div><h4>${m.name}</h4><p>${m.desc}</p><div class="small muted">${ls.length} lessons · ${dn} done</div><div class="xp-bar" style="width:100%;margin-top:8px"><i style="width:${(dn / ls.length) * 100}%"></i></div></a>`; }).join("")}</div>
        <div style="margin-top:18px"><a class="btn primary" href="#/course">Open the full course →</a></div>
      </section>

      <section class="section reveal">
        <div class="section-head"><div class="eyebrow">How every case study works</div><h2>Learn the way engineers actually think</h2></div>
        <div class="how stagger">
          ${[["📖", "The story", "A moment you know from the app, and the hard question hiding behind it."],
            ["🧮", "The numbers", "Back-of-the-envelope math that shows where the real problem is."],
            ["💥", "The naive design", "The obvious approach, and exactly how it falls over."],
            ["🏗️", "The real design", "Step-by-step fixes, each with an everyday analogy and an animated diagram."],
            ["🕹️", "Lab + quiz", "Break it yourself in a live simulation, then lock it in with a quiz."]]
            .map(([i, t, d], n) => `<div class="card"><h4>${t}</h4><p>${d}</p></div>`).join("")}
        </div>
      </section>

      <section class="section reveal">
        <div class="section-head"><div class="eyebrow">Case studies</div><h2>Pick an app. Open the hood.</h2><p>Suggested order runs left to right, from beginner to advanced.</p></div>
        <div class="cases stagger">
          ${order.map((id, i) => { const c = byId[id]; return `
            <a class="case-card" href="#/case/${c.id}" style="--c:${c.color};--c2:${c.color2}">
              ${p.done[c.id] ? `<span class="done-badge">✓</span>` : `<span class="num">${String(i + 1).padStart(2, "0")}</span>`}
              <div class="app-icon" style="--brand:${c.color}">${c.app[0]}</div>
              <div class="app">${c.app}</div>
              <h3>${c.title}</h3>
              <p>${c.tagline}</p>
              <div class="meta"><span class="tag">${c.level}</span><span>${c.minutes} min</span><span>· ${c.concepts.length} concepts</span></div>
            </a>`; }).join("")}
        </div>
      </section>

      <section class="section reveal">
        <div class="section-head"><div class="eyebrow">The building blocks</div><h2>Every building block, one tap away</h2><p>Tap one for a quick explanation, or open its interactive deep dive.</p></div>
        <div class="concept-cloud">${Object.keys(C).map(chip).join("")}</div>
      </section>
      ${footer()}
    </div>`;
    renderDiagram($("#hero-dg"), heroDiagram, { compact: true, autoplay: true, loop: true });
    observe(".reveal"); observe(".stagger");
  }

  const heroDiagram = {
    nodes: [
      { id: "u", x: 120, y: 225, label: "Users", sub: "billions", kind: "client", icon: "🌐" },
      { id: "cdn", x: 380, y: 75, label: "CDN", sub: "edge cache", kind: "edge", icon: "🌍" },
      { id: "lb", x: 380, y: 225, label: "Load Balancer", sub: "spread load", kind: "edge", icon: "⚖️" },
      { id: "api", x: 620, y: 225, label: "Services", sub: "stateless ×N", kind: "service", icon: "⚙️" },
      { id: "c", x: 620, y: 75, label: "Cache", sub: "hot data", kind: "cache", icon: "⚡" },
      { id: "q", x: 620, y: 375, label: "Queue", sub: "async work", kind: "queue", icon: "📬" },
      { id: "db", x: 870, y: 225, label: "Database", sub: "sharded ×3", kind: "db", icon: "🗄️" }
    ],
    flows: [
      { name: "Read", steps: [["u", "cdn", ""], ["u", "lb", ""], ["lb", "api", ""], ["api", "c", ""], ["api", "db", ""]] },
      { name: "Write", steps: [["u", "lb", ""], ["lb", "api", ""], ["api", "db", ""], ["api", "q", ""], ["q", "db", ""]] }
    ]
  };

  function typeLoop(el, words) {
    let w = 0, i = 0, del = false, alive = true;
    const tick = () => {
      if (!alive) return;
      const word = words[w];
      el.textContent = word.slice(0, i);
      if (!del && i === word.length) { del = true; return setTimeout(tick, 1600); }
      if (del && i === 0) { del = false; w = (w + 1) % words.length; }
      i += del ? -1 : 1;
      setTimeout(tick, del ? 45 : 85);
    };
    tick();
    onCleanup(() => { alive = false; });
  }

  function viewCase(id) {
    const c = byId[id]; if (!c) return viewHome();
    setAccent(c.color, c.color2);
    const p = store.get();
    const idx = CASES.indexOf(c), prev = CASES[(idx - 1 + CASES.length) % CASES.length], next = CASES[(idx + 1) % CASES.length];
    flowStore = []; chartStore = [];
    const deepSecs = (c.deep || []).map((d, k) => ["deep-" + k, d.h]);
    const sections = [["story", "Story"], ["reqs", "Requirements"], ["numbers", "The numbers"], ["naive", "Naive design"], ["design", "The real design"], ...deepSecs, ["arch", "Architecture"], ["lab", "Lab"], ["trade", "Trade-offs"], ["quiz", "Quiz"]];
    app.innerHTML = `
    <div class="view">
      <section class="case-hero">
        <a class="back" href="#/">← All case studies</a>
        <div class="hero-split"><div>
        <div class="app-row"><div class="app-icon">${c.app[0]}</div><div><div class="eyebrow">${c.app} · case study</div><div class="muted small">${c.level} · ${c.minutes} min</div></div></div>
        <h1>${c.title}</h1>
        <p class="tagline">${c.tagline}</p>
        <div class="row">${c.concepts.map(chip).join("")}</div>
        </div><div class="hero-scene">${BP.sceneFromDiagram(c.diagram)}</div></div>
        <div class="stats">${c.stats.map((s) => `<div class="stat reveal"><span class="tag">${s.kind}</span><div class="v" data-v="${s.v}" data-d="${s.d || 0}" data-pre="${s.pre || ""}" data-suf="${s.suf || ""}">${s.pre || ""}0${s.suf || ""}</div><div class="l">${s.label}</div></div>`).join("")}</div>
      </section>

      <div class="case-layout">
        <nav class="toc">${sections.map(([sid, l]) => `<a href="#" data-sec="${sid}">${l}</a>`).join("")}<div class="progress"><i id="read-prog"></i></div></nav>
        <div class="case-body">
          <section class="section" id="sec-story" style="margin-top:20px">
            <div class="section-head reveal"><div class="eyebrow">The story</div><h2>What's really happening?</h2></div>
            <div class="story reveal">${c.story}</div>
          </section>

          <section class="section" id="sec-reqs">
            <div class="section-head reveal"><div class="eyebrow">Requirements</div><h2>What must it do, and how well?</h2><p>Always split <b>functional</b> (features) from <b>non-functional</b> (scale, speed, reliability). The second list drives the architecture.</p></div>
            <div class="req-grid">
              <div class="card reveal"><h4>Functional</h4><ul>${c.requirements.functional.map((x) => `<li>${x}</li>`).join("")}</ul></div>
              <div class="card reveal nf"><h4>Non-functional</h4><ul>${c.requirements.nonFunctional.map((x) => `<li>${x}</li>`).join("")}</ul></div>
            </div>
          </section>

          <section class="section" id="sec-numbers">
            <div class="section-head reveal"><div class="eyebrow">Back-of-the-envelope</div><h2>Do the math first</h2><p>Rough numbers based on stated assumptions, not company figures. Their job is to reveal which part of the system is actually hard.</p></div>
            <div class="card reveal" style="padding:6px 8px"><table class="est">${c.estimate.map(([a, b, r]) => `<tr><td>${a}</td><td>${b}</td><td>${r}</td></tr>`).join("")}</table></div>
            <div class="insight reveal"><span>🎯</span><div>${c.estimateNote}</div></div>
          </section>

          <section class="section" id="sec-naive">
            <div class="section-head reveal"><div class="eyebrow">The naive design</div><h2>The obvious answer, and why it breaks</h2></div>
            <div class="naive reveal">
              <div class="card bad"><span class="tag" style="background:color-mix(in srgb,var(--bad) 20%,transparent);color:var(--bad)">❌ Version 0</span><h3>${c.naive.title}</h3><div class="code">${c.naive.desc}</div></div>
              <ul class="breaks">${c.naive.breaks.map((b) => `<li><span class="x">✕</span><span>${b}</span></li>`).join("")}</ul>
            </div>
          </section>

          <section class="section" id="sec-design">
            <div class="section-head reveal"><div class="eyebrow">The real design</div><h2>Fix it, one decision at a time</h2><p>Each step solves a specific failure. Tap a concept tag to go deeper.</p></div>
            <div class="timeline"><div class="fill" id="tl-fill"></div>
              ${c.steps.map((s, i) => `
              <div class="step reveal"><div class="dot">${i + 1}</div>
                <div class="card"><h3>${s.t} ${chip(s.c)}</h3><p>${s.b}</p>
                  <div class="analogy"><span>💡</span><div><b>Think of it like…</b> ${s.a}</div></div>
                </div></div>`).join("")}
            </div>
          </section>

          ${(c.deep || []).map((d, k) => `<section class="section lsec" id="sec-deep-${k}"><div class="section-head reveal">${k === 0 ? `<div class="eyebrow">Deep dive</div>` : ""}<h2>${d.h}</h2></div>${d.blocks.map(block).join("")}</section>`).join("")}
          <section class="section" id="sec-arch">
            <div class="section-head reveal"><div class="eyebrow">Architecture</div><h2>See it all move together</h2><p>Trace a request end to end. Each glowing hop is narrated below the diagram.</p></div>
            <div id="diagram" class="reveal"></div>
          </section>

          <section class="section" id="sec-lab">
            <div class="section-head reveal"><div class="eyebrow">Interactive lab</div><h2>Now break it yourself</h2></div>
            <div class="lab reveal">
              <div class="lab-head"><span class="pulse"></span><h3>${c.lab.title}</h3><span class="spacer"></span><span class="tag">Simulation</span></div>
              <div class="lab-hint">${c.lab.hint}</div>
              <div class="lab-body" id="lab"></div>
            </div>
          </section>

          <section class="section" id="sec-trade">
            <div class="section-head reveal"><div class="eyebrow">Trade-offs</div><h2>Every choice has a price</h2><p>Interviewers care less about the "right" answer than about whether you can name what you gave up.</p></div>
            <div class="trade stagger">${c.tradeoffs.map((t) => `<div class="card"><h4>${t.choice}</h4><div class="pc pro"><span>+</span>${t.pro}</div><div class="pc con"><span>−</span>${t.con}</div></div>`).join("")}</div>
            <div class="takeaways stagger">${c.takeaways.map((t) => `<div><span>🧠</span>${t}</div>`).join("")}</div>
          </section>

          <section class="section" id="sec-quiz">
            <div class="section-head reveal"><div class="eyebrow">Check yourself</div><h2>Quick quiz</h2><p>+25 XP per correct answer. Finish to complete the case study (+100 XP).</p></div>
            <div class="quiz" id="quiz"></div>
            <p class="muted small" style="margin-top:28px">Sources & further reading: ${c.sources.join(" · ")}</p>
          </section>

          <div class="pager">
            <a href="#/case/${prev.id}" style="--c:${prev.color}"><small>← Previous</small><b>${prev.app}: ${prev.title}</b></a>
            <a class="next" href="#/case/${next.id}" style="--c:${next.color}"><small>Next →</small><b>${next.app}: ${next.title}</b></a>
          </div>
        </div>
      </div>
      ${footer()}
    </div>`;

    window.scrollTo({ top: 0 });
    $$(".stat .v").forEach((el) => el.closest(".stat").addEventListener("revealed", () => countUp(el), { once: true }));
    observe(".reveal"); observe(".stagger");
    renderDiagram($("#diagram"), c.diagram);
    mountFlows(app); mountFigures(app);
    const destroyLab = BP.SIMS[c.lab.sim]($("#lab"), c);
    if (destroyLab) onCleanup(destroyLab);
    renderQuiz(c);

    // TOC scrollspy + reading progress + timeline fill
    $$(".toc a").forEach((a) => a.onclick = (e) => { e.preventDefault(); $("#sec-" + a.dataset.sec).scrollIntoView({ behavior: "smooth", block: "start" }); });
    const onScroll = () => {
      const y = window.scrollY + 140;
      let cur = sections[0][0];
      sections.forEach(([sid]) => { const el = $("#sec-" + sid); if (el && el.getBoundingClientRect().top + scrollY <= y) cur = sid; });
      $$(".toc a").forEach((a) => a.classList.toggle("active", a.dataset.sec === cur));
      const h = document.documentElement.scrollHeight - innerHeight;
      $("#read-prog").style.width = Math.min(100, (scrollY / h) * 100) + "%";
      const tl = $(".timeline"), fill = $("#tl-fill");
      if (tl && fill) {
        const r = tl.getBoundingClientRect();
        fill.style.height = Math.max(0, Math.min(r.height - 20, innerHeight * 0.6 - r.top)) + "px";
      }
    };
    addEventListener("scroll", onScroll, { passive: true }); onScroll();
    onCleanup(() => removeEventListener("scroll", onScroll));
  }

  function renderQuiz(c, opts = {}) {
    const key = opts.key || c.id, next = opts.next || { href: `#/case/${CASES[(CASES.indexOf(c) + 1) % CASES.length].id}`, label: "Next case study →" };
    const host = $("#quiz"), p = store.get();
    const state = { answers: {} };
    const draw = () => {
      host.innerHTML = c.quiz.map((q, qi) => {
        const ans = state.answers[qi];
        return `<div class="card q reveal in"><h4><span class="qn">Q${qi + 1}</span>${q.q}</h4>
          <div class="opts">${q.o.map((o, oi) => {
            let cls = "";
            if (ans !== undefined) { if (oi === q.a) cls = "right"; else if (oi === ans) cls = "wrong"; }
            return `<button class="opt ${cls}" data-q="${qi}" data-o="${oi}" ${ans !== undefined ? "disabled" : ""}>${o}</button>`;
          }).join("")}</div>
          ${ans !== undefined ? `<div class="why">${ans === q.a ? "✅ Correct." : "❌ Not quite."} ${q.why}</div>` : ""}</div>`;
      }).join("");
      const done = Object.keys(state.answers).length === c.quiz.length;
      if (done) {
        const correct = c.quiz.filter((q, i) => state.answers[i] === q.a).length;
        host.insertAdjacentHTML("beforeend", `<div class="card score-card reveal in"><div class="big grad">${correct}/${c.quiz.length}</div><p>${correct === c.quiz.length ? "Perfect! You could explain this one in an interview." : correct >= c.quiz.length / 2 ? "Solid. Skim the parts you missed and replay the figures." : "Worth another pass through the design steps."}</p><div class="row" style="justify-content:center"><button class="btn" id="retry">Retry quiz</button><a class="btn primary" href="${next.href}">${next.label}</a></div></div>`);
        $("#retry").onclick = () => { state.answers = {}; draw(); };
      }
      $$(".opt", host).forEach((b) => b.onclick = () => {
        state.answers[+b.dataset.q] = +b.dataset.o; draw();
        if (Object.keys(state.answers).length === c.quiz.length) {
          const correct = c.quiz.filter((q, i) => state.answers[i] === q.a).length;
          const s = store.get(), first = !s.done[key];
          s.done[key] = true;
          s.quiz[key] = { correct: Math.max(correct, (s.quiz[key] || {}).correct || 0) };
          store.set(s);
          if (first || correct === c.quiz.length) confetti();
        }
      });
    };
    draw();
    if (p.quiz[key]) host.insertAdjacentHTML("afterbegin", `<div class="insight" style="margin:0 0 6px"><span>🏆</span><div>Completed. Best score: <b>${p.quiz[key].correct}/${c.quiz.length}</b>. Feel free to retake it.</div></div>`);
  }

  function viewConcepts() {
    setAccent("#7c5cff", "#22d3ee");
    const cats = ["All", ...new Set(Object.values(C).map((k) => k.cat))];
    app.innerHTML = `<div class="view">
      <section class="case-hero"><div class="eyebrow">Concept library</div><h1>The ${Object.keys(C).length} building blocks behind every big system</h1><p class="tagline">Each one has a plain-English explanation, an everyday analogy, an interactive explainer (🕹️), and links to the lessons and apps that use it.</p></section>
      <div class="search-row"><input type="text" id="q" placeholder="Search: cache, hashing, retry…"><div class="row" id="cats">${cats.map((c, i) => `<button class="chip ${i ? "" : "on"}" data-cat="${c}">${c}</button>`).join("")}</div></div>
      <div class="concept-grid stagger" id="cgrid"></div>${footer()}</div>`;
    let cat = "All", q = "";
    const draw = () => {
      const items = Object.entries(C).filter(([, k]) => (cat === "All" || k.cat === cat) && (k.name + k.one + k.body).toLowerCase().includes(q));
      const grid = $("#cgrid");
      grid.innerHTML = items.map(([id, k]) => `<a class="card concept-card" href="#/concept/${id}"><div class="row" style="justify-content:space-between"><span class="ci">${k.icon}</span><span class="row" style="gap:6px">${k.fig || k.sim ? `<span class="tag">Interactive</span>` : ""}<span class="tag">${k.cat}</span></span></div><h4>${k.name}</h4><p>${k.one}</p><div class="row" style="margin-top:12px;gap:6px"><span class="small muted">${[lessonsFor(id).length ? `${lessonsFor(id).length} lesson${lessonsFor(id).length > 1 ? "s" : ""}` : "", k.used.length ? `${k.used.length} case stud${k.used.length > 1 ? "ies" : "y"}` : ""].filter(Boolean).join(" · ")}</span></div></a>`).join("") || `<p class="muted">No concepts match "${q}".</p>`;
      requestAnimationFrame(() => grid.classList.add("in"));
    };
    $("#q").oninput = (e) => { q = e.target.value.toLowerCase(); draw(); };
    $$("#cats .chip").forEach((b) => b.onclick = () => { cat = b.dataset.cat; $$("#cats .chip").forEach((x) => x.classList.toggle("on", x === b)); draw(); });
    draw();
  }

  function viewToolkit() {
    setAccent("#7c5cff", "#22d3ee");
    const maxLog = Math.log10(BP.LATENCY[BP.LATENCY.length - 1][1]);
    const fmtNs = (ns) => ns >= 1e6 ? (ns / 1e6).toLocaleString() + " ms" : ns >= 1e3 ? (ns / 1e3).toLocaleString() + " µs" : ns + " ns";
    app.innerHTML = `<div class="view">
      <section class="case-hero"><div class="eyebrow">Interview toolkit</div><h1>Think like a systems designer</h1><p class="tagline">A repeatable framework, numbers worth memorizing, a capacity calculator, and a cheat sheet of building blocks.</p></section>

      <section class="section reveal" style="margin-top:30px"><div class="section-head"><div class="eyebrow">The framework</div><h2>45 minutes, five moves</h2></div>
        <div class="framework stagger">${BP.FRAMEWORK.map((f) => `<div class="card"><div class="n">${f.n}</div><div class="m">${f.m}</div><h4>${f.t}</h4><p>${f.b}</p><div class="ex">${f.ex}</div></div>`).join("")}</div></section>

      <section class="section reveal"><div class="section-head"><div class="eyebrow">Capacity calculator</div><h2>Back-of-the-envelope, live</h2><p>Change the assumptions and see QPS, storage and bandwidth update. Load a preset to check the case-study math.</p></div>
        <div class="card"><div class="row" style="margin-bottom:18px"><span class="muted small">Presets:</span>${Object.keys(BP.PRESETS).map((k) => `<button class="chip" data-preset="${k}">${byId[k].app}</button>`).join("")}</div>
        <div class="calc"><div class="inputs" id="calc-in"></div><div class="outs" id="calc-out"></div></div></div></section>

      <section class="section reveal"><div class="section-head"><div class="eyebrow">Latency numbers (approx.)</div><h2>Feel the orders of magnitude</h2><p>Log scale. Every bar is roughly 10× to 1,000× the one above it. This is why caches and CDNs exist.</p></div>
        <div class="card"><div class="lat" id="lat">${BP.LATENCY.map(([l, ns]) => `<div class="lr"><span>${l}</span><div class="lt"><i data-w="${Math.max(2, (Math.log10(ns) / maxLog) * 100)}"></i></div><span class="lv">${fmtNs(ns)}</span></div>`).join("")}</div></div></section>

      <section class="section reveal"><div class="section-head"><div class="eyebrow">Cheat sheet</div><h2>Which building block, when?</h2></div>
        <div class="card" style="padding:6px 8px;overflow-x:auto"><table class="blocks"><tr><th>Block</th><th>Reach for it when you need…</th><th>Seen in</th></tr>${BP.BLOCKS.map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join("")}</table></div></section>
      ${footer()}</div>`;
    observe(".reveal"); observe(".stagger");
    const lat = $("#lat");
    lat.closest(".reveal").addEventListener("revealed", () => $$("i", lat).forEach((i, n) => setTimeout(() => (i.style.width = i.dataset.w + "%"), n * 90)), { once: true });
    calculator();
  }

  function calculator() {
    const fields = [
      ["dau", "Daily active users", 1e5, 3e9, "log"], ["writes", "Writes per user per day", 0.01, 100, "log"],
      ["ratio", "Reads per write", 1, 1000, "log"], ["size", "Bytes per write", 50, 5e7, "log"],
      ["years", "Retention (years)", 0.01, 10, "log"], ["peak", "Peak ÷ average", 1, 10, "lin"]
    ];
    let s = { ...BP.PRESETS.bitly };
    const fmt = (n) => { const u = [[1e12, "T"], [1e9, "B"], [1e6, "M"], [1e3, "k"]]; for (const [v, l] of u) if (n >= v) return (n / v).toFixed(n / v < 10 ? 1 : 0) + l; return n < 10 ? n.toFixed(2).replace(/\.?0+$/, "") : Math.round(n).toString(); };
    const bytes = (n) => { const u = [[1e15, "PB"], [1e12, "TB"], [1e9, "GB"], [1e6, "MB"], [1e3, "KB"]]; for (const [v, l] of u) if (n >= v) return (n / v).toFixed(n / v < 10 ? 1 : 0) + " " + l; return Math.round(n) + " B"; };
    const toPos = (f, v) => f[4] === "log" ? (Math.log10(v) - Math.log10(f[2])) / (Math.log10(f[3]) - Math.log10(f[2])) * 1000 : (v - f[2]) / (f[3] - f[2]) * 1000;
    const fromPos = (f, p) => f[4] === "log" ? Math.pow(10, Math.log10(f[2]) + (p / 1000) * (Math.log10(f[3]) - Math.log10(f[2]))) : f[2] + (p / 1000) * (f[3] - f[2]);
    const nice = (v) => { if (v >= 1) { const m = Math.pow(10, Math.floor(Math.log10(v)) - 1); return Math.round(v / m) * m; } return +v.toPrecision(2); };
    $("#calc-in").innerHTML = fields.map((f) => `<div class="field"><label>${f[1]} <b id="lv-${f[0]}"></b></label><input type="range" min="0" max="1000" id="in-${f[0]}"></div>`).join("");
    const draw = () => {
      fields.forEach((f) => { $("#in-" + f[0]).value = toPos(f, s[f[0]]); $("#lv-" + f[0]).textContent = f[0] === "size" ? bytes(s.size) : fmt(s[f[0]]); });
      const wpd = s.dau * s.writes, wq = wpd / 86400, rq = wq * s.ratio, pk = (wq + rq) * s.peak;
      const day = wpd * s.size, total = day * 365 * s.years, egress = rq * s.size * 8;
      const outs = [["Writes / day", fmt(wpd)], ["Write QPS (avg)", fmt(wq) + "/s"], ["Read QPS (avg)", fmt(rq) + "/s"], ["Peak total QPS", fmt(pk) + "/s"],
        ["New storage / day", bytes(day)], ["Total storage", bytes(total)], ["Read bandwidth", fmt(egress) + "bps"], ["App servers @ 5k QPS each", fmt(Math.ceil(pk / 5000))]];
      $("#calc-out").innerHTML = outs.map(([k, v]) => `<div class="metric"><div class="k">${k}</div><div class="v">${v}</div></div>`).join("");
    };
    fields.forEach((f) => $("#in-" + f[0]).oninput = (e) => { s[f[0]] = nice(fromPos(f, +e.target.value)); draw(); });
    $$("[data-preset]").forEach((b) => b.onclick = () => { s = { ...BP.PRESETS[b.dataset.preset] }; $$("[data-preset]").forEach((x) => x.classList.toggle("on", x === b)); draw(); });
    draw();
  }

  /* ── Course (HLD curriculum) ───────────────────────────── */
  const LESSONS = () => BP.LESSONS || [];
  const lessonKey = (id) => "L:" + id;
  function viewCourse() {
    setAccent("#7c5cff", "#22d3ee");
    const p = store.get(), all = LESSONS(), done = all.filter((l) => p.done[lessonKey(l.id)]).length;
    app.innerHTML = `<div class="view">
      <section class="case-hero"><div class="eyebrow">HLD course · follows the Scaler curriculum</div>
        <h1>System design, <span class="grad">from first principles</span></h1>
        <p class="tagline">${all.length} lessons in ${BP.MODULES.length} modules. Each one starts from a story, derives the design step by step, and lets you poke at it with interactive diagrams. Every lesson ends with a quiz and hand-picked further reading (ByteByteGo, official docs, engineering blogs).</p>
        <div class="course-prog"><div class="xp-bar" style="width:100%;height:10px"><i style="width:${(done / all.length) * 100}%"></i></div><span class="small muted"><b style="color:var(--text)">${done}</b> / ${all.length} lessons completed</span></div>
      </section>
      ${BP.MODULES.map((m, mi) => `<section class="section reveal mod-${m.id}" style="margin-top:56px">
        <div class="mod-head"><div class="mod-scene">${BP.LESSON_SCENES[all.find((l) => l.mod === m.id).id] ? BP.scene(BP.LESSON_SCENES[all.find((l) => l.mod === m.id).id]) : ""}</div><span class="mod-ic">${m.icon}</span><div><div class="eyebrow">Module ${mi + 1}</div><h2>${m.name}</h2><p class="muted" style="margin:4px 0 0">${m.desc}</p></div></div>
        <div class="lesson-list stagger">${all.filter((l) => l.mod === m.id).map((l) => { const n = all.indexOf(l) + 1, dn = p.done[lessonKey(l.id)]; return `
          <a class="lesson-row ${dn ? "done" : ""}" href="#/lesson/${l.id}">
            <span class="ln">${dn ? "✓" : String(n).padStart(2, "0")}</span><span class="li">${l.icon}</span>
            <div class="lt"><b>${l.title}</b><small>${l.summary}</small><div class="row" style="gap:6px;margin-top:8px">${l.concepts.slice(0, 4).map((c) => C[c] ? `<span class="tag">${C[c].name.split(" (")[0]}</span>` : "").join("")}</div></div>
            <span class="lm"><span>${l.minutes} min</span><span>${l.sections.reduce((a, s) => a + s.blocks.filter((b) => ["fig", "sim", "flow", "chart"].includes(b[0])).length, 0)} interactive</span></span>
          </a>`; }).join("")}</div></section>`).join("")}
      <p class="muted small" style="margin-top:40px">Content is written for this app from the topics, stories and numbers of the Scaler HLD notes you shared (2024 notes plus readings; the 2025 docs need a Scaler login). Material that goes beyond the notes is marked <b>📚 Beyond the notes</b>.</p>
      ${footer()}</div>`;
    observe(".reveal"); observe(".stagger");
  }

  const CALLOUT = { analogy: ["💡", "Think of it like…", "analogy"], tip: ["✅", "Key insight", "co-tip"], warn: ["⚠️", "Watch out", "co-warn"], extra: ["📚", "Beyond the notes", "co-extra"] };
  function block(b) {
    const [t, a, c] = b;
    if (t === "p") return `<p class="lp">${a}</p>`;
    if (t === "fig" || t === "sim") return `<figure class="figwrap reveal"><div class="fig-host" data-${t}="${a}"><div class="fig-loading">Loading interactive figure…</div></div>${c ? `<figcaption>${c}</figcaption>` : ""}</figure>`;
    if (t === "viz") return `<figure class="figwrap reveal"><div class="fig-host" data-viz="${a}"><div class="fig-loading">Loading visualiser…</div></div>${c ? `<figcaption>${c}</figcaption>` : ""}</figure>`;
    if (t === "probs") return `<div class="probs reveal">${a.map(probCard).join("")}</div>`;
    if (t === "img") {
      const im = (BP.IMAGES || {})[a]; if (!im) return "";
      return `<figure class="photo reveal"><img src="${im.src}" alt="${(c || a).replace(/"/g, "&quot;")}" loading="lazy" decoding="async"><figcaption><span>${c || ""}</span><span class="credit">Photo: ${im.author || "Wikimedia Commons"} · ${im.license}</span></figcaption></figure>`;
    }
    if (t === "chart") return `<figure class="figwrap reveal"><div class="chart-host" data-chart-i="${chartStore.push(a) - 1}"></div></figure>`;
    if (t === "flow") return `<figure class="figwrap reveal"><div class="flow-host" data-flow-i="${flowStore.push(a) - 1}"></div>${c ? `<figcaption>${c}</figcaption>` : ""}</figure>`;
    if (CALLOUT[t]) { const [ic, lab, cls] = CALLOUT[t]; return `<div class="callout ${cls} reveal"><span class="co-ic">${ic}</span><div><b>${lab}</b> ${a}</div></div>`; }
    if (t === "table") return `<div class="ltable-wrap reveal"><table class="ltable"><thead><tr>${a.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${c.map((r) => `<tr>${r.map((x) => `<td>${x}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
    if (t === "steps") return `<ol class="lsteps reveal">${a.map(([h, d], i) => `<li><span class="sn">${i + 1}</span><div><b>${h}</b><p>${d}</p></div></li>`).join("")}</ol>`;
    if (t === "list") return `<ul class="llist reveal">${a.map((x) => `<li>${x}</li>`).join("")}</ul>`;
    if (t === "code") return location.hash.startsWith("#/dsa") ? `<div class="reveal">${BP.codeBlock(a)}</div>` : `<pre class="lcode reveal">${a.replace(/</g, "&lt;")}</pre>`;
    if (t === "math") return `<div class="reveal"><div class="card" style="padding:6px 8px"><table class="est">${a.map(([x, y, z]) => `<tr><td>${x}</td><td>${y}</td><td>${z}</td></tr>`).join("")}</table></div>${c ? `<div class="insight"><span>🧮</span><div>${c}</div></div>` : ""}</div>`;
    return "";
  }
  let flowStore = [], chartStore = [];
  function mountFlows(root) {
    $$("[data-flow-i]", root).forEach((h) => renderDiagram(h, flowStore[+h.dataset.flowI]));
  }

  function viewLesson(id) {
    const all = LESSONS(), l = all.find((x) => x.id === id); if (!l) return viewCourse();
    setAccent(null, null, l.mod);
    flowStore = []; chartStore = [];
    const i = all.indexOf(l), prev = all[i - 1], next = all[i + 1], mod = BP.MODULES.find((m) => m.id === l.mod);
    const secs = l.sections.map((s, k) => ["ls-" + k, s.h]).concat([["ls-quiz", "Quiz"], ["ls-refs", "Further reading"]]);
    app.innerHTML = `<div class="view">
      <section class="case-hero">
        <a class="back" href="#/course">← Course · ${mod.name}</a>
        <div class="hero-split"><div>
        <div class="app-row"><span class="mod-dot"></span><div><div class="eyebrow">${mod.name} · lesson ${i + 1} of ${all.length}</div><div class="muted small">${l.minutes} min · ${l.scaler}</div></div></div>
        <h1>${l.title}</h1>
        <p class="tagline">${l.summary}</p>
        <div class="row">${l.concepts.map(chip).join("")}</div>
        </div>${BP.LESSON_SCENES[l.id] ? `<div class="hero-scene">${BP.scene(BP.LESSON_SCENES[l.id], { alt: l.title })}</div>` : ""}</div>
      </section>
      <div class="case-layout">
        <nav class="toc">${secs.map(([sid, h]) => `<a href="#" data-sec="${sid}">${h}</a>`).join("")}<div class="progress"><i id="read-prog"></i></div></nav>
        <div class="case-body">
          ${l.sections.map((s, k) => `<section class="section lsec" id="ls-${k}" style="${k ? "" : "margin-top:20px"}"><div class="section-head reveal"><h2>${s.h}</h2></div>${s.blocks.map(block).join("")}</section>`).join("")}
          <section class="section" id="ls-quiz"><div class="section-head reveal"><div class="eyebrow">Check yourself</div><h2>Quiz</h2><p>+25 XP per correct answer. Finish it to complete the lesson (+100 XP).</p></div><div class="quiz" id="quiz"></div></section>
          <section class="section" id="ls-refs"><div class="section-head reveal"><div class="eyebrow">Go deeper</div><h2>Further reading & visuals</h2><p>Each link was checked. ByteByteGo's illustrated guides pair well with the figures above.</p></div>
            <div class="refs stagger">${l.refs.map(([t, u]) => { let host = ""; try { host = new URL(u).hostname.replace(/^www\./, ""); } catch {} return `<a class="ref card" href="${u}" target="_blank" rel="noopener"><span class="ref-ic">${/youtube/.test(host) ? "▶️" : /bytebytego/.test(host) ? "🎨" : "📄"}</span><div><b>${t}</b><small>${host}</small></div><span class="ref-go">↗</span></a>`; }).join("")}</div>
            ${l.related.length ? `<h4 style="margin:30px 0 12px">Apply it: related case studies</h4><div class="used">${l.related.map((cid) => { const c = byId[cid]; return `<a href="#/case/${cid}" style="--c:${c.color}"><span class="app-icon mini" style="--brand:${c.color}">${c.app[0]}</span><div><b>${c.app}</b><br><small class="muted">${c.title}</small></div></a>`; }).join("")}</div>` : ""}
          </section>
          <div class="pager">
            ${prev ? `<a href="#/lesson/${prev.id}"><small>← Previous lesson</small><b>${prev.title}</b></a>` : `<a href="#/course"><small>←</small><b>Course overview</b></a>`}
            ${next ? `<a class="next" href="#/lesson/${next.id}"><small>Next lesson →</small><b>${next.title}</b></a>` : `<a class="next" href="#/course"><small>🎓 Done!</small><b>Back to the course</b></a>`}
          </div>
        </div>
      </div>${footer()}</div>`;
    window.scrollTo({ top: 0 });
    observe(".reveal", "in", { threshold: 0.05 }); observe(".stagger");
    mountFlows(app); mountFigures(app);
    renderQuiz(l, { key: lessonKey(l.id), next: next ? { href: `#/lesson/${next.id}`, label: "Next lesson →" } : { href: "#/course", label: "Back to course" } });
    scrollSpy(secs.map((s) => s[0]));
  }

  function scrollSpy(ids) {
    $$(".toc a").forEach((a) => a.onclick = (e) => { e.preventDefault(); $("#" + a.dataset.sec).scrollIntoView({ behavior: "smooth", block: "start" }); });
    const onScroll = () => {
      const y = window.scrollY + 140; let cur = ids[0];
      ids.forEach((sid) => { const el = $("#" + sid); if (el && el.getBoundingClientRect().top + scrollY <= y) cur = sid; });
      $$(".toc a").forEach((a) => a.classList.toggle("active", a.dataset.sec === cur));
      const h = document.documentElement.scrollHeight - innerHeight, rp = $("#read-prog");
      if (rp) rp.style.width = Math.min(100, (scrollY / h) * 100) + "%";
    };
    addEventListener("scroll", onScroll, { passive: true }); onScroll();
    onCleanup(() => removeEventListener("scroll", onScroll));
  }

  function viewConcept(id) {
    const k = C[id]; if (!k) return viewConcepts();
    setAccent("#7c5cff", "#22d3ee");
    const ls = lessonsFor(id), interactive = k.fig || k.sim;
    if (ls[0]) setAccent(null, null, ls[0].mod);
    const related = Object.entries(C).filter(([cid, x]) => cid !== id && x.cat === k.cat).slice(0, 8);
    app.innerHTML = `<div class="view">
      <section class="case-hero"><a class="back" href="#/concepts">← Concept library</a>
        <div class="app-row"><div><div class="eyebrow">${k.cat} · building block</div>${ls.length ? `<div class="muted small">Taught in ${ls.length} lesson${ls.length > 1 ? "s" : ""}</div>` : ""}</div></div>
        <div class="hero-split"><div><h1>${k.name}</h1><p class="tagline">${k.one}</p></div>${ls[0] && BP.LESSON_SCENES[ls[0].id] ? `<div class="hero-scene">${BP.scene(BP.LESSON_SCENES[ls[0].id], { alt: k.name })}</div>` : ""}</div></section>
      <div class="concept-page">
        <div class="callout analogy reveal"><span class="co-ic">💡</span><div><b>Think of it like…</b> ${k.analogy}</div></div>
        <section class="section" style="margin-top:40px"><div class="section-head reveal"><div class="eyebrow">How it works</div><h2>The mechanism</h2></div><p class="lp reveal">${k.body}</p>${k.code ? `<pre class="lcode reveal">${k.code.replace(/</g, "&lt;")}</pre>` : ""}</section>
        ${interactive ? `<section class="section" style="margin-top:50px"><div class="section-head reveal"><div class="eyebrow">See it move</div><h2>Interactive explainer</h2><p>Play with it. Every control changes the simulation.</p></div><figure class="figwrap reveal"><div class="fig-host" data-${k.fig ? "fig" : "sim"}="${k.fig || k.sim}"><div class="fig-loading">Loading…</div></div></figure></section>` : ""}
        ${k.when || k.pitfalls ? `<div class="grid2 reveal" style="margin-top:40px">${k.when ? `<div class="card"><h4>✅ Reach for it when</h4><p class="muted" style="margin:8px 0 0">${k.when}</p></div>` : ""}${k.pitfalls ? `<div class="card"><h4>⚠️ Pitfalls</h4><p class="muted" style="margin:8px 0 0">${k.pitfalls}</p></div>` : ""}</div>` : ""}
        <div style="margin-top:40px">${usedLinks(id)}</div>
        ${related.length ? `<h4 style="margin-top:34px">Related building blocks</h4><div class="concept-cloud" style="margin-top:12px">${related.map(([cid]) => `<a class="chip" href="#/concept/${cid}">${C[cid].name}</a>`).join("")}</div>` : ""}
      </div>${footer()}</div>`;
    window.scrollTo({ top: 0 });
    observe(".reveal", "in", { threshold: 0.05 }); mountFigures(app);
  }

  /* ── DSA section ───────────────────────────── */
  const escH = (x) => String(x).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);
  const lcUrl = (slug) => `https://leetcode.com/problems/${slug}/`;
  const lcStore = { get() { try { return JSON.parse(localStorage.getItem("bp-lc")) || {}; } catch { return {}; } }, toggle(k, v) { const s = lcStore.get(); if (v) s[k] = 1; else delete s[k]; localStorage.setItem("bp-lc", JSON.stringify(s)); } };
  function probCard(p) {
    const ap = p.ap && p.ap.length ? p.ap : null;
    const lvl = (n) => (/brute|naive/i.test(n) ? 0 : /better|improved/i.test(n) ? 1 : /optimal|best/i.test(n) ? 2 : 3);
    const approaches = ap
      ? `<div class="ap-tabs">${ap.map((a, k) => `${k ? `<span class="ap-arrow">→</span>` : ""}<button type="button" class="ap-tab lvl${lvl(a.n)} ${k === ap.length - 1 ? "on" : ""}" data-ap="${k}"><b>${a.n}</b>${a.cx ? `<small>${a.cx.split("·")[0].trim()}</small>` : ""}</button>`).join("")}</div>
        ${ap.map((a, k) => `<div class="ap-pane ${k === ap.length - 1 ? "on" : ""}" data-pane="${k}"><div class="ap-idea">${a.idea}</div>${a.cx ? `<div class="ap-cx">${a.cx}</div>` : ""}${a.code ? BP.codeBlock(a.code) : ""}</div>`).join("")}`
      : `<div class="appr">${p.brute ? `<div><small>BRUTE FORCE</small>${p.brute}</div>` : ""}<div class="opt"><small>KEY IDEA${p.cx ? ` · <span class="cx">${p.cx}</span>` : ""}</small>${p.opt}</div></div>${p.code ? BP.codeBlock(p.code) : ""}`;
    return `<details class="prob"><summary>${p.d ? `<span class="tag ${p.d}">${p.d}</span>` : ""}<b>${p.t}</b>${p.co ? `<span class="tag">${p.co}</span>` : ""}</summary><div class="pbody">
      ${p.q ? `<p>${p.q}</p>` : ""}${p.ex ? `<div class="pex">${escH(p.ex)}</div>` : ""}
      ${approaches}
      ${p.edge ? `<p class="small muted"><b>Edge cases:</b> ${p.edge}</p>` : ""}
      ${p.viz ? `<div class="fig-host" data-viz="${p.viz}"><div class="fig-loading">Loading visualiser…</div></div>` : ""}
      ${p.lc ? `<a class="btn sm" href="${lcUrl(p.lc)}" target="_blank" rel="noopener">Practice on LeetCode ↗</a>` : ""}
    </div></details>`;
  }
  function bindProbs(rootEl) {
    rootEl.addEventListener("click", (e) => {
      const t = e.target.closest(".ap-tab");
      if (t) { const card = t.closest(".pbody"); card.querySelectorAll(".ap-tab").forEach((x) => x.classList.toggle("on", x === t)); card.querySelectorAll(".ap-pane").forEach((x) => x.classList.toggle("on", x.dataset.pane === t.dataset.ap)); return; }
      const c = e.target.closest(".copy-btn");
      if (c) { const txt = Array.from(c.parentNode.querySelectorAll(":scope > span")).map((x) => x.textContent).join("\n"); navigator.clipboard && navigator.clipboard.writeText(txt).then(() => { c.textContent = "Copied"; setTimeout(() => (c.textContent = "Copy"), 1200); }); }
    });
  }
  const dsaTopics = () => Object.entries((BP.DSA || {}).topics || {}).map(([id, t]) => ({ id, ...t }));
  const dsaProgress = (t) => { const s = lcStore.get(), n = (t.lc || []).length; return n ? (t.lc.filter((x) => s[x[1]]).length / n) : 0; };
  function lcList(items, srcOf) {
    const s = lcStore.get();
    return `<div class="lc-list">${items.map(([title, slug, d]) => `<label class="lc-item ${s[slug] ? "done" : ""}"><input type="checkbox" data-lc="${slug}" ${s[slug] ? "checked" : ""}><a href="${lcUrl(slug)}" target="_blank" rel="noopener">${title}</a>${srcOf ? `<span class="src">${srcOf(slug)}</span>` : ""}<span class="tag ${d}">${d}</span></label>`).join("")}</div>`;
  }
  function bindLc(rootEl) {
    $$("[data-lc]", rootEl).forEach((cb) => (cb.onchange = () => { lcStore.toggle(cb.dataset.lc, cb.checked); cb.closest(".lc-item").classList.toggle("done", cb.checked); const pb = $("#dsa-lc-count"); if (pb) pb.textContent = Object.keys(lcStore.get()).length; }));
  }
  function viewDSA() {
    setAccent(null, null, "dsa");
    flowStore = []; chartStore = [];
    const D = BP.DSA, T = dsaTopics(), p = store.get();
    const nProb = T.reduce((a, t) => a + t.sections.reduce((b, s) => b + s.blocks.filter((x) => x[0] === "probs").reduce((c, x) => c + x[1].length, 0), 0), 0);
    const nLc = T.reduce((a, t) => a + (t.lc || []).length, 0);
    const algos = Object.entries(BP.ALGOS), order = D.phases.flatMap((ph) => ph[1]).filter((x) => D.topics[x]);
    app.innerHTML = `<div class="view">
      <section class="dsa-hero">
        <div><div class="eyebrow">Data structures &amp; algorithms</div>
          <h1>Watch the algorithm think, then solve it yourself</h1>
          <p class="lead">${T.length} topics built from your interview notes: every pattern has a step-through animation with the code line it's running, the brute force → optimal path for each problem, and a LeetCode practice list you can tick off.</p>
          <div class="dsa-stats"><div><b>${T.length}</b><small>topics</small></div><div><b>${algos.length}</b><small>step-through animations</small></div><div><b>${nProb}</b><small>worked problems</small></div><div><b><span id="dsa-lc-count">${Object.keys(lcStore.get()).length}</span>/${nLc}</b><small>LeetCode solved</small></div></div>
        </div>
        <div class="fig-host" data-viz="binarySearch"></div>
      </section>
      ${D.phases.map(([name, ids]) => [name, ids.filter((x) => D.topics[x])]).filter((ph) => ph[1].length).map(([name, ids]) => `<section class="dsa-phase"><h3>${name}</h3><div class="dsa-grid stagger">${ids.map((id) => { const t = D.topics[id]; const pr = dsaProgress(t); const nv = t.sections.reduce((a, s) => a + s.blocks.filter((b) => b[0] === "viz").length, 0);
        return `<a class="dsa-card" href="#/dsa/${id}" style="--tc:${t.color}"><span class="ic">${t.icon}</span><b>${t.name}</b><p>${t.summary}</p><div class="meta"><span>${t.minutes} min</span><span>${nv} animations</span><span>${(t.lc || []).length} LeetCode</span>${p.done["D:" + id] ? `<span class="done">✓ quiz done</span>` : ""}</div><div class="dsa-pbar"><i style="width:${pr * 100}%"></i></div></a>`; }).join("")}</div></section>`).join("")}
      <section class="section" style="margin-top:60px"><div class="section-head reveal"><div class="eyebrow">Pattern recognition</div><h2>Which technique does the question want?</h2><p>The phrase in the problem statement usually gives the pattern away.</p></div>
        <div class="ltable-wrap reveal"><table class="ltable pat-table"><thead><tr><th>Pattern</th><th>Signals in the question</th><th>Typical cost</th><th>Learn it</th></tr></thead><tbody>${D.patterns.map(([pat, sig, cost, id]) => `<tr><td>${pat}</td><td>${sig}</td><td><code>${cost}</code></td><td>${D.topics[id] ? `<a href="#/dsa/${id}">${D.topics[id].name} →</a>` : ""}</td></tr>`).join("")}</tbody></table></div></section>
      <section class="section"><div class="section-head reveal"><div class="eyebrow">Playground</div><h2>All ${algos.length} animations</h2><p>Pick one, edit the input and step through it.</p></div>
        <div class="play-pick"><select id="pick" class="av-speed" style="font-size:.95rem;padding:9px 10px;max-width:100%">${(() => { const seen = new Set(); const groups = order.map((id) => { const ks = []; D.topics[id].sections.forEach((s) => s.blocks.forEach((b) => { const k = b[0] === "viz" ? b[1] : null; if (k && BP.ALGOS[k] && !seen.has(k)) { seen.add(k); ks.push(k); } if (b[0] === "probs") b[1].forEach((pp) => { if (pp.viz && BP.ALGOS[pp.viz] && !seen.has(pp.viz)) { seen.add(pp.viz); ks.push(pp.viz); } }); })); return [D.topics[id].name, ks]; }); groups.push(["More", algos.map((a) => a[0]).filter((k) => !seen.has(k))]); return groups.filter((g) => g[1].length).map(([g, ks]) => `<optgroup label="${escH(g)}">${ks.map((k) => `<option value="${k}">${escH(BP.ALGOS[k].title)}</option>`).join("")}</optgroup>`).join(""); })()}</select></div>
        <div id="playground"></div></section>
      ${footer()}</div>`;
    observe(".reveal", "in", { threshold: 0.05 }); observe(".stagger"); mountFigures(app);
    let kill = BP.viz($("#playground"), $("#pick").value);
    onCleanup(() => kill());
    $("#pick").onchange = (e) => { kill(); kill = BP.viz($("#playground"), e.target.value); };
  }
  function viewViz(name) {
    setAccent(null, null, "dsa");
    const owner = dsaTopics().find((t) => t.sections.some((s) => s.blocks.some((b) => (b[0] === "viz" && b[1] === name) || (b[0] === "probs" && b[1].some((p) => p.viz === name)))));
    app.innerHTML = `<div class="view"><section class="case-hero" style="padding-bottom:10px"><a class="back" href="#/dsa${owner ? "/" + owner.id : ""}">← ${owner ? owner.name : "DSA"}</a></section><div class="fig-host" id="vizpage"></div>${footer()}</div>`;
    onCleanup(BP.viz($("#vizpage"), name));
  }
  function viewDSATopic(id) {
    const D = BP.DSA, t = D.topics[id]; if (!t) return viewDSA();
    setAccent(null, null, "dsa");
    root.style.setProperty("--c", t.color);
    onCleanup(() => root.style.removeProperty("--c"));
    flowStore = []; chartStore = [];
    const order = D.phases.flatMap((ph) => ph[1]).filter((x) => D.topics[x]), i = order.indexOf(id), prev = order[i - 1], next = order[i + 1];
    const secs = t.sections.map((s, k) => ["ds-" + k, s.h]).concat(t.lc && t.lc.length ? [["ds-lc", "LeetCode practice"]] : []).concat(t.quiz && t.quiz.length ? [["ds-quiz", "Quiz"]] : []);
    app.innerHTML = `<div class="view">
      <section class="case-hero">
        <a class="back" href="#/dsa">← DSA · all topics</a>
        <div class="app-row"><span class="app-icon" style="--brand:${t.color};font-size:1.4rem">${t.icon}</span><div><div class="eyebrow">Topic ${i + 1} of ${order.length}</div><div class="muted small">${t.minutes} min${t.notes ? ` · from your notes: ${t.notes}` : ""}</div></div></div>
        <h1>${t.name}</h1>
        <p class="tagline">${t.summary}</p>
      </section>
      <div class="case-layout">
        <nav class="toc">${secs.map(([sid, h]) => `<a href="#" data-sec="${sid}">${h}</a>`).join("")}<div class="progress"><i id="read-prog"></i></div></nav>
        <div class="case-body">
          ${t.sections.map((s, k) => `<section class="section lsec" id="ds-${k}" style="${k ? "" : "margin-top:20px"}"><div class="section-head reveal"><h2>${s.h}</h2></div>${s.blocks.map(block).join("")}</section>`).join("")}
          ${t.lc && t.lc.length ? `<section class="section" id="ds-lc"><div class="section-head reveal"><div class="eyebrow">Practice</div><h2>LeetCode practice</h2><p>Mostly from the Top Interview 150 list, plus classics from your notes. Ticks are saved in this browser.</p></div>${lcList(t.lc)}</section>` : ""}
          ${t.quiz && t.quiz.length ? `<section class="section" id="ds-quiz"><div class="section-head reveal"><div class="eyebrow">Check yourself</div><h2>Quiz</h2></div><div class="quiz" id="quiz"></div></section>` : ""}
          <div class="pager">
            ${prev ? `<a href="#/dsa/${prev}"><small>← Previous topic</small><b>${D.topics[prev].name}</b></a>` : `<a href="#/dsa"><small>←</small><b>All topics</b></a>`}
            ${next ? `<a class="next" href="#/dsa/${next}"><small>Next topic →</small><b>${D.topics[next].name}</b></a>` : `<a class="next" href="#/dsa"><small>🎓 Done!</small><b>Back to DSA</b></a>`}
          </div>
        </div>
      </div>${footer()}</div>`;
    window.scrollTo({ top: 0 });
    observe(".reveal", "in", { threshold: 0.05 }); observe(".stagger");
    mountFlows(app); mountFigures(app); bindLc(app); bindProbs(app);
    if (t.quiz && t.quiz.length) renderQuiz(t, { key: "D:" + id, next: next ? { href: `#/dsa/${next}`, label: "Next topic →" } : { href: "#/dsa", label: "Back to DSA" } });
    scrollSpy(secs.map((s) => s[0]));
  }

  const footer = () => `<footer class="footer"><span>Blueprint · learn system design by reverse-engineering real products</span><span>Architectures are simplified teaching models based on public engineering blogs, not internal documentation.</span></footer>`;

  /* ── Router ───────────────────────────── */
  function route() {
    cleanups.forEach((f) => { try { f(); } catch (e) { console.error(e); } });
    cleanups = [];
    closeConcept();
    const h = location.hash.replace(/^#\/?/, "");
    const [page, arg] = h.split("/");
    $$(".nav a").forEach((a) => a.classList.toggle("active", a.dataset.nav === (page || "home") || (page === "case" && a.dataset.nav === "home") || (page === "lesson" && a.dataset.nav === "course") || (page === "concept" && a.dataset.nav === "concepts")));
    if (page === "case") viewCase(arg);
    else if (page === "course") viewCourse();
    else if (page === "lesson") viewLesson(arg);
    else if (page === "concept") viewConcept(arg);
    else if (page === "concepts") viewConcepts();
    else if (page === "toolkit") viewToolkit();
    else if (page === "dsa") arg === "viz" ? viewViz(h.split("/")[2]) : arg ? viewDSATopic(arg) : viewDSA();
    else viewHome();
    if (page !== "case") window.scrollTo({ top: 0 });
  }
  addEventListener("hashchange", route);
  renderXP();
  route();
  BP.onCleanup = onCleanup;
})();

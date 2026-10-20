/* Blueprint — interactive figure library, part 2: databases & storage. */
(function () {
  const { fxBase, $, $$, dot, ripple, box, line, seg, tog, slider, bindSeg, frame, logger, sleep, rnd, hash } = BP.FX;
  const FIGS = BP.FIGS;

  /* ═══════════ CAP / PACELC with a network partition ═══════════ */
  FIGS.cap = (el) => {
    let mode = "CP", part = false, n1 = { v: 1 }, n2 = { v: 1 }, alive = true, busy = false, ver = 1, elseMode = "C";
    const P = { c1: [90, 90], c2: [90, 250], n1: [330, 90], n2: [330, 250] };
    const f = frame(el, {
      ctrl: `${seg("cap-m", [["CP", "Choose C (consistency)"], ["AP", "Choose A (availability)"]], mode)}${tog("cap-p", "✂️ Network partition", false)}<button class="btn primary sm" id="cap-w">C1 writes x</button><button class="btn sm" id="cap-r">C2 reads x</button>`,
      stage: `<svg viewBox="0 0 760 330" id="cap"></svg>`,
      foot: `<div class="fig-cap" id="cap-cap"></div><div class="row" style="margin-top:10px"><span class="small muted">PACELC, when there's <b>no</b> partition:</span>${seg("cap-e", [["C", "Else Consistency (sync replication)"], ["L", "Else Latency (async)"]], elseMode)}</div><div class="log" id="cap-log" style="max-height:120px;margin-top:10px"></div>`
    });
    const svg = $("#cap", f), log = logger($("#cap-log", f)), L = () => $("#cap-d", svg), al = () => alive;
    function draw() {
      fxBase(svg, "cap-d").innerHTML = box("c1", ...P.c1, 110, 46, "👩 Client 1", "near Node 1", "client") + box("c2", ...P.c2, 110, 46, "👨 Client 2", "near Node 2", "client") +
        line([145, 90], [255, 90]) + line([145, 250], [255, 250]) +
        `<line class="fx-edge ${part ? "cut" : ""}" x1="330" y1="120" x2="330" y2="220" style="stroke-width:3"/>${part ? `<text x="330" y="178" text-anchor="middle" font-size="26">✂️</text>` : `<text x="345" y="175" font-size="11" fill="var(--muted)">replication</text>`}` +
        box("n1", ...P.n1, 150, 56, "🗄️ Node 1", `x = ${n1.v}`, "db") + box("n2", ...P.n2, 150, 56, "🗄️ Node 2", `x = ${n2.v}${n2.v !== n1.v ? " (stale)" : ""}`, "db") +
        `<text x="470" y="60" font-size="13" fill="var(--text)" font-weight="700">Mode: ${mode === "CP" ? "CP: refuse rather than be wrong" : "AP: always answer, maybe stale"}</text>
         <text x="470" y="84" font-size="12" fill="var(--muted)">${part ? "Partition! Nodes can't talk to each other." : "Network healthy."}</text>`;
      $("#cap-cap", f).innerHTML = part
        ? (mode === "CP" ? "During a partition, a <b>CP</b> system rejects writes/reads it can't confirm with its replicas, so it gives errors (unavailable) but never returns wrong data. Think banking balances, inventory, locks." : "An <b>AP</b> system keeps serving both sides. Clients always get an answer, but Node 2 may return <b>stale</b> data until the partition heals and replicas reconcile. Think social feeds, likes, carts.")
        : `No partition: both C and A are possible. PACELC says you still trade <b>latency vs consistency</b>: ${elseMode === "C" ? "synchronous replication means every write waits for Node 2 (slower, always consistent)." : "asynchronous replication acks immediately (fast) and replicas catch up a moment later (briefly stale)."}`;
    }
    async function write() {
      if (busy) return; busy = true; ver++; const v = ver;
      await dot(L(), P.c1, [255, 90], { label: `x=${v}`, alive: al });
      if (part && mode === "CP") { ripple(L(), P.n1, "var(--bad)"); log(`Node 1: can't reach Node 2 to replicate → <b>reject write</b> (503). Consistency over availability.`, "bad"); await dot(L(), [255, 90], P.c1, { color: "var(--bad)", label: "503", alive: al }); busy = false; return; }
      n1.v = v; draw();
      if (part) { log(`Node 1 accepted x=${v}; Node 2 can't hear about it (partition). Divergence!`, "warn"); await dot(L(), [255, 90], P.c1, { color: "var(--ok)", label: "200", alive: al }); busy = false; return; }
      if (elseMode === "C") { await dot(L(), [330, 120], [330, 220], { label: "sync", alive: al }); n2.v = v; draw(); await dot(L(), [255, 90], P.c1, { color: "var(--ok)", label: "200 (slow)", alive: al }); log(`Write x=${v} replicated synchronously before ack: consistent, higher latency.`, "ok"); }
      else { dot(L(), P.n1, P.c1, { color: "var(--ok)", label: "200 (fast)", alive: al }); log(`Write x=${v} acked immediately; replication is async.`, "ok"); await sleep(900); await dot(L(), [330, 120], [330, 220], { label: "async", alive: al }); if (!part) { n2.v = v; draw(); } }
      busy = false;
    }
    async function read() {
      if (busy) return; busy = true;
      await dot(L(), P.c2, [255, 250], { label: "get x", alive: al });
      if (part && mode === "CP") { log("Node 2: can't confirm it has the latest value → <b>error</b> instead of a possibly stale answer.", "bad"); await dot(L(), [255, 250], P.c2, { color: "var(--bad)", label: "503", alive: al }); }
      else { const stale = n2.v !== n1.v; log(`Node 2 returns x=${n2.v}${stale ? ` <b>(stale! latest is ${n1.v})</b>` : ""}`, stale ? "warn" : "ok"); await dot(L(), [255, 250], P.c2, { color: stale ? "var(--warn)" : "var(--ok)", label: `x=${n2.v}`, alive: al }); }
      busy = false;
    }
    bindSeg(f, "cap-m", (v) => { mode = v; draw(); });
    bindSeg(f, "cap-e", (v) => { elseMode = v; draw(); });
    $("#cap-p", f).onchange = async (e) => {
      part = e.target.checked; draw();
      if (!part && n1.v !== n2.v) { log("Partition healed → replicas reconcile (anti-entropy / read repair).", "hl"); await dot(L(), [330, 120], [330, 220], { label: "sync", alive: al }); n2.v = n1.v; draw(); }
    };
    $("#cap-w", f).onclick = write; $("#cap-r", f).onclick = read;
    draw();
    return () => { alive = false; };
  };

  /* ═══════════ Master–slave replication ═══════════ */
  FIGS.replication = (el) => {
    let mode = "async", alive = true, busy = false, ver = 1, masterIdx = 0;
    let nodes = [{ v: 1, role: "master", up: true }, { v: 1, role: "slave", up: true }, { v: 1, role: "slave", up: true }, { v: 1, role: "slave", up: true }];
    const pos = (i) => i === 0 ? [380, 70] : [160 + (i - 1) * 220, 250];
    const f = frame(el, {
      ctrl: `${seg("rp-m", [["async", "Async"], ["semi", "Semi-sync (1 ack)"], ["sync", "Sync (all ack)"]], mode)}<button class="btn primary sm" id="rp-w">✍️ Write to master</button><button class="btn sm" id="rp-r">👀 Read from a slave</button><button class="btn sm" id="rp-k">💥 Kill master</button><button class="btn sm" id="rp-x">↺</button>`,
      stage: `<svg viewBox="0 0 760 320" id="rp"></svg>`,
      foot: `<div class="grid3">${["Write latency", "Durability on master crash", "Read freshness"].map((k, i) => `<div class="metric" id="rp-m${i}"><div class="k">${k}</div><div class="v">–</div></div>`).join("")}</div><div class="log" id="rp-log" style="max-height:120px;margin-top:10px"></div>`
    });
    const svg = $("#rp", f), log = logger($("#rp-log", f)), L = () => $("#rp-d", svg), al = () => alive;
    const PROPS = { async: ["~2 ms (fast)", "may lose recent writes", "slaves can lag"], semi: ["~5 ms", "≥1 slave has it", "some slaves lag"], sync: ["slowest slave (~20 ms+)", "no loss", "all fresh"] };
    function draw() {
      let h = `<text x="380" y="22" text-anchor="middle" font-size="12" fill="var(--muted)">writes go to the master · reads can go to any slave</text>`;
      nodes.forEach((n, i) => { if (i) h += line([pos(0)[0], 100], [pos(i)[0], 222], "fx-edge thin"); });
      nodes.forEach((n, i) => {
        const [x, y] = pos(i), latest = Math.max(...nodes.filter((z) => z.up).map((z) => z.v));
        h += `<g class="fx-box ${n.up ? "" : "dead"} ${n.up && n.v < latest ? "warn" : ""}" style="--kc:var(--k-${n.role === "master" ? "service" : "db"})"><rect class="fx-rect" x="${x - 85}" y="${y - 30}" width="170" height="60" rx="12"/>
          <text class="fx-l" x="${x}" y="${y - 4}" text-anchor="middle">${n.role === "master" ? "👑 Master" : "📖 Slave " + i}</text>
          <text class="fx-s" x="${x}" y="${y + 16}" text-anchor="middle">${n.up ? `version v${n.v}` : "DOWN"}</text></g>`;
      });
      fxBase(svg, "rp-d").innerHTML = h;
      PROPS[mode].forEach((v, i) => { const m = $("#rp-m" + i, f); $(".v", m).textContent = v; m.className = "metric " + (mode === "sync" ? (i === 0 ? "warn" : "good") : mode === "async" ? (i === 0 ? "good" : "warn") : "good"); });
    }
    async function write() {
      if (busy) return; const m = nodes[0]; if (!m.up) { log("Master is down. Promote a slave first (kill-master did that) or reset.", "bad"); return; }
      busy = true; ver++; const v = ver;
      await dot(L(), [380, -10], [380, 40], { label: `v${v}`, alive: al }); m.v = v; draw();
      const slaves = nodes.slice(1).map((n, k) => k + 1).filter((i) => nodes[i].up);
      const lags = slaves.map(() => rnd(400, 2200));
      const reps = slaves.map((i, k) => sleep(mode === "async" ? lags[k] : lags[k] / 3).then(() => dot(L(), [380, 100], [pos(i)[0], 222], { label: `v${v}`, dur: 500, alive: al })).then(() => { if (nodes[i].up && nodes[0] === m) { nodes[i].v = Math.max(nodes[i].v, v); draw(); } }));
      if (mode === "async") log(`Master acked v${v} immediately. Slaves will catch up (replication lag).`, "ok");
      else if (mode === "semi") { await Promise.race(reps); log(`Master acked v${v} after the first slave confirmed.`, "ok"); }
      else { await Promise.all(reps); log(`Master acked v${v} only after ALL slaves confirmed.`, "ok"); }
      busy = false;
    }
    async function read() {
      const ups = nodes.map((n, i) => i).filter((i) => i > 0 && nodes[i].up); if (!ups.length) return;
      const i = ups[Math.floor(Math.random() * ups.length)], latest = nodes[0].v;
      await dot(L(), [380, 320], [pos(i)[0], 280], { label: "read", alive: al });
      log(`Slave ${i} returned v${nodes[i].v}${nodes[i].v < latest ? ` <b>(stale: master has v${latest})</b>. Eventual consistency.` : " (fresh)"}`, nodes[i].v < latest ? "warn" : "ok");
    }
    function kill() {
      const m = nodes[0]; if (!m.up) return;
      m.up = false; draw();
      const cands = nodes.slice(1).filter((n) => n.up), best = cands.reduce((a, b) => (a.v >= b.v ? a : b));
      const lost = m.v - best.v;
      setTimeout(() => {
        if (!alive) return;
        log(`Master died. Orchestrator promotes the most up-to-date slave (v${best.v}).${lost > 0 ? ` <b>${lost} acknowledged write(s) LOST</b>: they only existed on the old master.` : " No data lost."}`, lost > 0 ? "bad" : "ok");
        nodes = [{ v: best.v, role: "master", up: true }, ...nodes.slice(1).filter((n) => n !== best), { v: m.v, role: "slave", up: false }];
        draw();
      }, 700);
    }
    bindSeg(f, "rp-m", (v) => { mode = v; draw(); });
    $("#rp-w", f).onclick = write; $("#rp-r", f).onclick = read; $("#rp-k", f).onclick = kill;
    $("#rp-x", f).onclick = () => { ver = 1; nodes = [{ v: 1, role: "master", up: true }, { v: 1, role: "slave", up: true }, { v: 1, role: "slave", up: true }, { v: 1, role: "slave", up: true }]; draw(); };
    draw();
    return () => { alive = false; };
  };

  /* ═══════════ Quorum: R + W > N ═══════════ */
  FIGS.quorum = (el) => {
    let N = 3, W = 2, R = 2, wrote = false, read = false;
    const f = frame(el, {
      ctrl: `<div class="grid3" style="flex:1">${slider("q-n", "Replicas N", 1, 7, N)}${slider("q-w", "Write quorum W", 1, 7, W)}${slider("q-r", "Read quorum R", 1, 7, R)}</div>`,
      stage: `<svg viewBox="0 0 760 250" id="q"></svg><div class="row" style="justify-content:center;margin-top:6px"><button class="btn primary sm" id="q-wb">✍️ Write v2 to W nodes</button><button class="btn sm" id="q-rb">👀 Read from R nodes</button></div>`,
      foot: `<div class="grid3">${["Consistency", "Writes survive", "Reads survive"].map((k, i) => `<div class="metric" id="q-m${i}"><div class="k">${k}</div><div class="v">–</div></div>`).join("")}</div><div class="fig-cap" id="q-cap"></div>`
    });
    const svg = $("#q", f);
    function draw() {
      W = Math.min(W, N); R = Math.min(R, N);
      ["n", "w", "r"].forEach((k) => { const i = $("#q-" + k, f); i.max = k === "n" ? 7 : N; i.value = { n: N, w: W, r: R }[k]; $("#q-" + k + "-v", f).textContent = i.value; });
      const gap = Math.min(100, 640 / N), x0 = 380 - ((N - 1) * gap) / 2;
      let h = "";
      for (let i = 0; i < N; i++) {
        const x = x0 + i * gap, inW = wrote && i < W, inR = read && i >= N - R, overlap = inW && inR;
        h += `<g><rect x="${x - 34}" y="80" width="68" height="70" rx="12" fill="${inW ? "color-mix(in srgb,var(--c) 28%,var(--bg2))" : "var(--bg2)"}" stroke="${overlap ? "var(--ok)" : inR ? "var(--warn)" : "var(--border2)"}" stroke-width="${inR ? 3 : 1.4}"/>
          <text x="${x}" y="110" text-anchor="middle" font-size="18">🗄️</text><text x="${x}" y="135" text-anchor="middle" font-family="var(--mono)" font-size="13" fill="var(--text)">${inW ? "v2" : "v1"}</text>
          ${overlap ? `<text x="${x}" y="172" text-anchor="middle" font-size="11" fill="var(--ok)" font-weight="800">overlap ✓</text>` : ""}</g>`;
      }
      if (wrote) h += `<text x="${x0 - 34}" y="60" font-size="12" fill="var(--c)" font-weight="700">◀ write went to the first ${W} node(s)</text>`;
      if (read) h += `<text x="${x0 + (N - 1) * gap + 34}" y="200" text-anchor="end" font-size="12" fill="var(--warn)" font-weight="700">read asked the last ${R} node(s) ▶</text>`;
      svg.innerHTML = h;
      const strong = R + W > N;
      const m = (i, v, c) => { $(".v", $("#q-m" + i, f)).textContent = v; $("#q-m" + i, f).className = "metric " + c; };
      m(0, strong ? "Strong ✓" : "Eventual", strong ? "good" : "warn");
      m(1, `${N - W} node failure(s)`, N - W > 0 ? "good" : "bad");
      m(2, `${N - R} node failure(s)`, N - R > 0 ? "good" : "bad");
      let cap = `<b>R + W = ${R + W} ${strong ? ">" : "≤"} N = ${N}</b>. ${strong ? "Every read set must overlap every write set in at least one node, so a read always sees the latest version (pick the highest version among the R replies)." : "A read can miss every node that got the write, so it may return old data. That's fine for likes, not for balances."}`;
      if (read) cap += ` <br>This read ${read && [...Array(N).keys()].some((i) => i < W && i >= N - R) ? "<b style='color:var(--ok)'>saw v2</b>" : "<b style='color:var(--warn)'>only saw v1 (stale)</b>"}.`;
      cap += ` <br><span class="muted">Common presets: N=3, W=2, R=2 (balanced) · W=N, R=1 (fast reads) · W=1, R=N (fast writes) · W=1, R=1 (fastest, eventual). Cassandra calls this tunable consistency (ONE / QUORUM / ALL).</span>`;
      $("#q-cap", f).innerHTML = cap;
    }
    ["n", "w", "r"].forEach((k) => ($("#q-" + k, f).oninput = (e) => { const v = +e.target.value; if (k === "n") N = v; if (k === "w") W = v; if (k === "r") R = v; read = false; draw(); }));
    $("#q-wb", f).onclick = () => { wrote = true; read = false; draw(); };
    $("#q-rb", f).onclick = () => { wrote = true; read = true; draw(); };
    draw();
    return () => {};
  };

  /* ═══════════ Choosing a sharding key ═══════════ */
  FIGS.shardkey = (el, opts = {}) => {
    const SC = BP.SHARD_SCENARIOS;
    let si = 0, ki = -1;
    const f = frame(el, {
      ctrl: `<span class="muted small">Scenario:</span>${seg("sk-s", SC.map((s, i) => [String(i), s.name]), "0")}`,
      stage: `<div id="sk"></div>`,
      foot: `<div class="verdict" id="sk-v">Pick a candidate sharding key to see data distribution and how many shards each query touches.</div>`
    });
    function draw() {
      const s = SC[si];
      $("#sk", f).innerHTML = `<p class="small" style="margin:0 0 10px">${s.desc}</p>
        <div class="row" style="margin-bottom:14px"><span class="small muted">Shard by:</span>${s.keys.map((k, i) => `<button class="chip ${i === ki ? "on" : ""}" data-k="${i}">${k.key}</button>`).join("")}</div>
        ${ki < 0 ? "" : (() => { const k = s.keys[ki]; return `<div class="grid2">
          <div class="pane"><h4>Data per shard</h4>${k.dist.map((p, i) => `<div class="dist-row"><span>Shard ${i + 1}</span><div class="t"><i style="width:${p}%;background:${p > 40 ? "var(--bad)" : "var(--c)"}"></i></div><span class="mono">${p}%</span></div>`).join("")}</div>
          <div class="pane"><h4>Shards touched per query</h4>${s.queries.map((q, qi) => { const n = k.q[qi]; return `<div class="dist-row"><span style="width:auto;flex:1">${q}</span><span class="sk-pill ${n === 1 ? "good" : "bad"}">${n === 1 ? "1 shard" : n > 8 ? "impossible: max 26 shards" : `all ${n} (fan-out)`}</span></div>`; }).join("")}</div></div>`; })()}`;
      $$("[data-k]", f).forEach((b) => (b.onclick = () => { ki = +b.dataset.k; draw(); const k = s.keys[ki], v = $("#sk-v", f); v.className = "verdict " + (k.good ? "good" : "bad"); v.innerHTML = (k.good ? "✅ " : "❌ ") + k.why; }));
    }
    bindSeg(f, "sk-s", (v) => { si = +v; ki = -1; const vv = $("#sk-v", f); vv.className = "verdict"; vv.textContent = "Pick a candidate sharding key."; draw(); });
    draw();
    return () => {};
  };

  /* ═══════════ Same data, five data models ═══════════ */
  FIGS.datamodels = (el) => {
    const M = {
      rel: ["Relational (MySQL, Postgres)", `<div class="dm-tables"><table><tr><th colspan=3>users</th></tr><tr><td>id</td><td>name</td><td>city</td></tr><tr><td>1</td><td>Asha</td><td>Pune</td></tr></table><table><tr><th colspan=3>orders</th></tr><tr><td>id</td><td>user_id ↗</td><td>total</td></tr><tr><td>91</td><td>1</td><td>₹499</td></tr><tr><td>92</td><td>1</td><td>₹1,250</td></tr></table></div>`, "Fixed schema, normalized tables, JOINs, ACID transactions. Great for complex queries and money. Harder to shard (joins across shards)."],
      kv: ["Key-value (Redis, DynamoDB)", `<pre class="dm-pre">"user:1"          → "{name:'Asha',city:'Pune'}"\n"user:1:orders"   → [91, 92]\n"session:ab12"    → "user:1"   (TTL 30m)</pre>`, "A giant distributed hashmap: get/put by key in ~1 ms. No queries by value. Perfect for caches, sessions, counters."],
      doc: ["Document (MongoDB)", `<pre class="dm-pre">{\n  _id: 1, name: "Asha", city: "Pune",\n  orders: [\n    { id: 91, total: 499 },\n    { id: 92, total: 1250, coupon: "DIWALI" }\n  ]\n}</pre>`, "Flexible JSON-like documents. Related data embedded (denormalized), so one read fetches the whole aggregate. Each document can have different fields."],
      wide: ["Wide-column (Cassandra, HBase, ScyllaDB)", `<div class="dm-tables"><table><tr><th>partition key</th><th>clustering (sorted)</th><th>columns…</th></tr><tr><td rowspan=2>user:1</td><td>2025-10-01 #91</td><td>total=499</td></tr><tr><td>2025-10-05 #92</td><td>total=1250 · coupon=DIWALI</td></tr></table></div>`, "Rows grouped by partition key and sorted by clustering key on disk. Built for massive write throughput and range scans like \"latest N messages in a chat\"."],
      graph: ["Graph (Neo4j)", `<svg viewBox="0 0 420 150" style="max-width:420px"><circle cx="70" cy="75" r="30" fill="var(--k-client)"/><text x="70" y="80" text-anchor="middle" fill="#fff" font-weight="700">Asha</text><circle cx="230" cy="40" r="30" fill="var(--k-service)"/><text x="230" y="45" text-anchor="middle" fill="#fff" font-weight="700">Ravi</text><circle cx="350" cy="110" r="30" fill="var(--k-cache)"/><text x="350" y="115" text-anchor="middle" fill="#fff" font-weight="700">Pune</text><line x1="100" y1="68" x2="200" y2="47" stroke="var(--muted)"/><text x="150" y="48" fill="var(--muted)" font-size="11">FOLLOWS</text><line x1="100" y1="85" x2="320" y2="105" stroke="var(--muted)"/><text x="200" y="110" fill="var(--muted)" font-size="11">LIVES_IN</text><line x1="255" y1="57" x2="325" y2="95" stroke="var(--muted)"/></svg>`, "Nodes and edges as first-class citizens. \"Friends of friends who live in Pune\" is a fast traversal instead of a chain of JOINs."]
    };
    const f = frame(el, { ctrl: seg("dm", Object.entries(M).map(([k, v]) => [k, v[0].split(" (")[0]]), "rel"), stage: `<div id="dm-b"></div>` });
    const show = (k) => { const [t, body, d] = M[k]; $("#dm-b", f).innerHTML = `<div class="dm-anim"><h4 style="margin:0 0 10px">${t}</h4>${body}<p class="small muted" style="margin:12px 0 0">${d}</p></div>`; };
    bindSeg(f, "dm", show); show("rel");
    return () => {};
  };

  /* ═══════════ LSM tree: WAL + memtable + SSTables + compaction + bloom ═══════════ */
  FIGS.lsm = (el) => {
    const LIMIT = 4;
    let fresh = null, wal = [], mem = new Map(), tables = [], tid = 0, alive = true;
    const bloomOf = (keys) => { const b = new Set(); keys.forEach((k) => [0, 1, 2].forEach((s) => b.add(hash(k, s * 977) % 32))); return b; };
    const mayHave = (t, k) => [0, 1, 2].every((s) => t.bloom.has(hash(k, s * 977) % 32));
    const f = frame(el, {
      ctrl: `<input type="text" id="lsm-k" value="apple" style="width:120px"><button class="btn primary sm" id="lsm-put">PUT</button><button class="btn sm" id="lsm-get">GET</button><button class="btn sm" id="lsm-del">DELETE</button><button class="btn sm" id="lsm-fl">⬇ Flush memtable</button><button class="btn sm" id="lsm-cp">🧹 Compact</button><button class="btn sm" id="lsm-rand">+5 random</button>`,
      stage: `<div class="lsm"><div class="lsm-col"><h4>RAM</h4><div class="lsm-mem" id="lsm-mem"></div><h4 style="margin-top:12px">Disk: write-ahead log (append-only)</h4><div class="lsm-wal" id="lsm-wal"></div></div><div class="lsm-col"><h4>Disk: SSTables (immutable, sorted) · newest first</h4><div id="lsm-ss"></div></div></div>`,
      foot: `<div class="log" id="lsm-log" style="max-height:140px"></div>`
    });
    const log = logger($("#lsm-log", f));
    let hl = null;
    function draw() {
      $("#lsm-mem", f).innerHTML = `<div class="small muted">MemTable (sorted, ${mem.size}/${LIMIT})</div>` + ([...mem.entries()].sort().map(([k, v]) => `<span class="kv ${hl === "mem:" + k ? "hit" : ""} ${k === fresh ? "fresh" : ""}">${k}=${v === null ? "🪦" : v}</span>`).join("") || `<span class="muted small">empty</span>`);
      $("#lsm-wal", f).innerHTML = wal.slice(-10).map((w, i, arr) => `<span class="kv wal ${fresh && i === arr.length - 1 ? "fresh" : ""}">${w}</span>`).join("") || `<span class="muted small">empty</span>`;
      $("#lsm-ss", f).innerHTML = tables.map((t) => `<div class="sst ${t.flash || ""}" data-t="${t.id}"><div class="sst-h"><b>SST-${t.id}</b> <span class="muted small">L${t.level} · ${t.rows.length} keys · sparse index: ${t.rows.filter((_, i) => i % 2 === 0).map((r) => r[0]).join(", ")}</span><span class="bloom-mini">${Array.from({ length: 32 }, (_, i) => `<i class="${t.bloom.has(i) ? "on" : ""}"></i>`).join("")}</span></div><div>${t.rows.map(([k, v]) => `<span class="kv ${hl === t.id + ":" + k ? "hit" : ""}">${k}=${v === null ? "🪦" : v}</span>`).join("")}</div></div>`).join("") || `<span class="muted small">no SSTables yet: fill the memtable</span>`;
      tables.forEach((t) => (t.flash = "")); fresh = null;
    }
    function put(k, v) {
      wal.push(`${v === null ? "DEL" : "SET"} ${k}${v === null ? "" : "=" + v}`); fresh = k;
      mem.set(k, v);
      log(`${v === null ? "DELETE" : "PUT"} ${k}: append to WAL (sequential write, crash-safe) + update memtable (RAM) → ack. <b>No disk seek.</b>`, "ok");
      if (mem.size >= LIMIT) flush(); else draw();
    }
    function flush() {
      if (!mem.size) return;
      const rows = [...mem.entries()].sort();
      tables.unshift({ id: ++tid, level: 0, rows, bloom: bloomOf(rows.map((r) => r[0])), flash: "new" });
      mem = new Map(); wal = [];
      log(`Memtable full → written to disk as immutable sorted <b>SST-${tid}</b> in one sequential write. WAL truncated.`, "hl");
      draw();
    }
    async function get(k) {
      hl = null;
      if (mem.has(k)) { hl = "mem:" + k; draw(); log(`GET ${k}: found in memtable → ${mem.get(k) === null ? "🪦 tombstone = deleted" : mem.get(k)} (0 disk reads)`, "ok"); return; }
      let reads = 0, skipped = 0;
      for (const t of tables) {
        if (!mayHave(t, k)) { skipped++; continue; }
        reads++;
        const r = t.rows.find((x) => x[0] === k);
        if (r) { hl = t.id + ":" + k; t.flash = "hit"; draw(); log(`GET ${k}: memtable miss → bloom filters skipped ${skipped} table(s) → found in SST-${t.id} → ${r[1] === null ? "🪦 tombstone: key was deleted" : r[1]} (${reads} disk read${reads > 1 ? "s" : ""})`, "ok"); return; }
        log(`SST-${t.id}: bloom said "maybe" but key absent (false positive), 1 wasted read`, "warn");
      }
      draw(); log(`GET ${k}: not found. Bloom filters skipped ${skipped} table(s), ${reads} disk read(s).`, "bad");
    }
    function compact() {
      if (tables.length < 2) { log("Need at least 2 SSTables to compact.", "warn"); return; }
      const merged = new Map();
      [...tables].reverse().forEach((t) => t.rows.forEach(([k, v]) => merged.set(k, v)));
      const before = tables.reduce((a, t) => a + t.rows.length, 0);
      const rows = [...merged.entries()].filter(([, v]) => v !== null).sort();
      tables = [{ id: ++tid, level: 1, rows, bloom: bloomOf(rows.map((r) => r[0])), flash: "new" }];
      log(`Compaction: merge-sorted all tables (like merge sort), kept the newest value per key, dropped tombstones & overwritten values: ${before} → ${rows.length} entries.`, "hl");
      draw();
    }
    const key = () => ($("#lsm-k", f).value.trim().toLowerCase() || "x").slice(0, 10);
    let n = 1;
    $("#lsm-put", f).onclick = () => put(key(), n++);
    $("#lsm-del", f).onclick = () => put(key(), null);
    $("#lsm-get", f).onclick = () => get(key());
    $("#lsm-fl", f).onclick = flush; $("#lsm-cp", f).onclick = compact;
    $("#lsm-rand", f).onclick = () => { const W = ["apple", "mango", "kiwi", "grape", "peach", "plum", "lime", "fig", "pear", "date"]; for (let i = 0; i < 5; i++) put(W[Math.floor(Math.random() * W.length)], n++); };
    draw();
    return () => { alive = false; };
  };

  /* ═══════════ Bloom filter ═══════════ */
  FIGS.bloom = (el) => {
    const M = 24, K = 3;
    let bits = new Array(M).fill(0), added = new Set(), last = null;
    const pos = (w) => [0, 1, 2].map((s) => hash(w, s * 7919 + 13) % M);
    const f = frame(el, {
      ctrl: `<input type="text" id="bf-w" value="cat" style="width:140px"><button class="btn primary sm" id="bf-add">➕ Add</button><button class="btn sm" id="bf-chk">🔎 Check</button><button class="btn sm" id="bf-fill">Add 6 animals</button><button class="btn sm" id="bf-x">↺</button>`,
      stage: `<svg viewBox="0 0 760 210" id="bf"></svg>`,
      foot: `<div class="verdict" id="bf-v">A Bloom filter is a bit array plus ${K} hash functions. <b>Add</b> sets ${K} bits. <b>Check</b> looks at the same ${K} bits: any 0 means <b>definitely not present</b>; all 1s means <b>probably present</b>.</div><div class="small muted" id="bf-fp" style="margin-top:8px"></div>`
    });
    const svg = $("#bf", f), cw = 700 / M;
    function draw() {
      let h = "";
      bits.forEach((b, i) => { const x = 30 + i * cw; h += `<rect x="${x}" y="130" width="${cw - 3}" height="40" rx="6" fill="${b ? "var(--c)" : "var(--panel2)"}" stroke="${last && last.p.includes(i) ? (b ? "var(--ok)" : "var(--bad)") : "var(--border2)"}" stroke-width="${last && last.p.includes(i) ? 3 : 1}"/><text x="${x + cw / 2 - 1.5}" y="155" text-anchor="middle" font-family="var(--mono)" font-size="13" fill="${b ? "#fff" : "var(--muted)"}">${b}</text><text x="${x + cw / 2 - 1.5}" y="188" text-anchor="middle" font-size="9" fill="var(--dim)">${i}</text>`; });
      if (last) {
        h += `<rect x="300" y="18" width="160" height="34" rx="17" fill="var(--panel2)" stroke="var(--border2)"/><text x="380" y="40" text-anchor="middle" font-weight="800" fill="var(--text)">"${last.w}"</text>`;
        last.p.forEach((p, k) => { const x = 30 + p * cw + cw / 2; h += `<path d="M380 52 C 380 90, ${x} 90, ${x} 128" fill="none" stroke="${["#60a5fa", "#f472b6", "#4ade80"][k]}" stroke-width="2" class="bf-arrow"/><text x="${(380 + x) / 2}" y="${84 + k * 12}" font-size="10" fill="${["#60a5fa", "#f472b6", "#4ade80"][k]}">h${k + 1}=${p}</text>`; });
      }
      svg.innerHTML = h;
      const n = added.size, fp = Math.pow(1 - Math.exp((-K * n) / M), K);
      $("#bf-fp", f).innerHTML = `Items added: <b>${n}</b> · bits set: ${bits.filter(Boolean).length}/${M} · false-positive chance ≈ (1 − e<sup>−kn/m</sup>)<sup>k</sup> = <b>${(fp * 100).toFixed(1)}%</b>. Real systems use millions of bits, so ~10 bits per key gives about 1% false positives.`;
    }
    const w = () => $("#bf-w", f).value.trim().toLowerCase() || "x";
    function add(word) { const p = pos(word); p.forEach((i) => (bits[i] = 1)); added.add(word); last = { w: word, p }; draw(); const v = $("#bf-v", f); v.className = "verdict"; v.innerHTML = `Added "<b>${word}</b>" → set bits ${p.join(", ")}.`; }
    $("#bf-add", f).onclick = () => add(w());
    $("#bf-chk", f).onclick = () => {
      const word = w(), p = pos(word), all = p.every((i) => bits[i]); last = { w: word, p }; draw();
      const v = $("#bf-v", f);
      if (!all) { v.className = "verdict good"; v.innerHTML = `Bit ${p.find((i) => !bits[i])} is 0 → "<b>${word}</b>" is <b>definitely not</b> in the set. We skip the disk read entirely. 🎉`; }
      else if (added.has(word)) { v.className = "verdict good"; v.innerHTML = `All ${K} bits are 1 → "<b>${word}</b>" is <b>probably</b> present (and it really is). Go read it from disk.`; }
      else { v.className = "verdict warn"; v.innerHTML = `All ${K} bits are 1, but "<b>${word}</b>" was never added. That's a <b>false positive</b>: other words set those bits. The cost is one wasted disk read; correctness is unaffected.`; }
    };
    $("#bf-fill", f).onclick = () => ["dog", "lion", "tiger", "zebra", "horse", "eagle"].forEach(add);
    $("#bf-x", f).onclick = () => { bits.fill(0); added.clear(); last = null; draw(); };
    draw();
    return () => {};
  };
})();

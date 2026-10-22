/* Blueprint — interactive figure library, part 3: case-study, infra & architecture figures. */
(function () {
  const { fxBase, $, $$, dot, ripple, box, line, seg, tog, slider, bindSeg, frame, logger, sleep, rnd, pick, hash } = BP.FX;
  const FIGS = BP.FIGS;
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);

  /* ═══════════ Typeahead trie with top-5 per node, buffer & decay ═══════════ */
  FIGS.trie = (el) => {
    const SEED = { "michael jackson": 980, "michelle obama": 760, "microsoft": 1200, "microwave oven": 420, "mickey mouse": 650, "michigan": 300, "mic test": 210, "michael jordan": 890, "minecraft": 1100, "mint": 150, "system design": 900, "system of a down": 400, "systemctl": 120, "roger federer": 500, "roger binny": 1000 };
    let lastLen = 0, freq = { ...SEED }, buffer = {}, writes = 0, searches = 0, useBuf = false, TH = 5;
    const f = frame(el, {
      ctrl: `<input type="text" id="tr-q" value="mic" placeholder="type a prefix…" style="width:220px" autocomplete="off"><button class="btn primary sm" id="tr-s">🔍 Search (Enter)</button>${tog("tr-b", `Buffer writes (threshold ${TH})`, false)}<button class="btn sm" id="tr-d">🌙 A day passes (÷2 decay)</button>`,
      stage: `<div id="tr-path" class="tr-path"></div><div class="grid2" style="margin-top:14px"><div class="pane"><h4>Top-5 stored at node "<span id="tr-pn"></span>"</h4><ol class="tr-top" id="tr-top"></ol></div><div class="pane"><h4>Children of this node</h4><div id="tr-kids" class="row" style="gap:6px"></div><div class="small muted" style="margin-top:12px" id="tr-stats"></div></div></div>`,
      foot: `<div class="fig-cap" id="tr-cap">Each trie node caches the <b>top-5 completions</b> for its prefix, so a read just walks <code>len(prefix)</code> nodes. No subtree scan on every keystroke.</div>`
    });
    const top = (p) => Object.entries(freq).filter(([t]) => t.startsWith(p)).sort((a, b) => b[1] - a[1]).slice(0, 5);
    function draw() {
      const q = $("#tr-q", f).value.toLowerCase();
      $("#tr-path", f).innerHTML = `<span class="tr-node root">•</span>` + [...q].map((c, i) => `<span class="tr-arrow">→</span><span class="tr-node ${top(q.slice(0, i + 1)).length ? "" : "dead"} ${i === q.length - 1 && q.length > lastLen ? "last" : ""}">${c === " " ? "␣" : esc(c)}</span>`).join("");
      lastLen = q.length;
      $("#tr-pn", f).textContent = q || "(root)";
      const t = top(q);
      $("#tr-top", f).innerHTML = q.length < 3 ? `<li class="muted">Suggestions start at 3 characters (MVP rule): this keeps nodes near the root from being hammered.</li>` : t.length ? t.map(([s, n]) => `<li><span>${esc(q)}<b>${esc(s.slice(q.length))}</b></span><span class="mono muted">${Math.round(n)}${buffer[s] ? ` <span style="color:var(--warn)">+${buffer[s]} buffered</span>` : ""}</span></li>`).join("") : `<li class="muted">No completions. Pressing Search adds "${esc(q)}" as a new term.</li>`;
      const kids = [...new Set(Object.keys(freq).filter((s) => s.startsWith(q) && s.length > q.length).map((s) => s[q.length]))];
      $("#tr-kids", f).innerHTML = kids.map((k) => `<button class="chip" data-c="${esc(k)}">${k === " " ? "␣" : esc(k)}</button>`).join("") || `<span class="muted small">leaf</span>`;
      $$("[data-c]", f).forEach((b) => (b.onclick = () => { $("#tr-q", f).value = q + b.dataset.c; draw(); }));
      $("#tr-stats", f).innerHTML = `Searches: <b>${searches}</b> · writes to main store: <b>${writes}</b>${searches ? ` (${Math.round((writes / searches) * 100)}%)` : ""}. Without buffering, every search also rewrites the top-5 list of <i>every ancestor node</i>.`;
    }
    function search() {
      const q = $("#tr-q", f).value.toLowerCase().trim(); if (!q) return;
      searches++;
      if (useBuf) {
        buffer[q] = (buffer[q] || 0) + 1;
        if (buffer[q] >= TH) { freq[q] = (freq[q] || 0) + buffer[q]; buffer[q] = 0; writes += q.length; $("#tr-cap", f).innerHTML = `Buffer for "<b>${esc(q)}</b>" hit ${TH} → flushed +${TH} to the main store and updated ${q.length} ancestor nodes. One-off typos never reach the main store.`; }
        else $("#tr-cap", f).innerHTML = `Counted in the <b>write buffer</b> (${buffer[q]}/${TH}). Main store untouched. Only relative popularity matters, so exact counts can wait.`;
      } else {
        freq[q] = (freq[q] || 0) + 1; writes += q.length;
        $("#tr-cap", f).innerHTML = `updateFrequency("<b>${esc(q)}</b>"): +1 at the terminal node, then walk back up <b>${q.length} ancestors</b> and fix any top-5 list that changed. That's why typeahead is write-heavy too.`;
      }
      draw();
    }
    $("#tr-q", f).oninput = draw;
    $("#tr-q", f).onkeydown = (e) => { if (e.key === "Enter") search(); };
    $("#tr-s", f).onclick = search;
    $("#tr-b", f).onchange = (e) => { useBuf = e.target.checked; };
    $("#tr-d", f).onclick = () => { for (const k in freq) freq[k] = freq[k] / 2; $("#tr-cap", f).innerHTML = "🌙 Time decay: every count divided by TDF = 2. Yesterday's searches now weigh ½, the day before ¼… Old fads (\"Roger Binny\") fade unless people keep searching them, while a trending term (\"Roger Federer\" after a Wimbledon win) climbs. Try searching it a few times."; draw(); };
    draw();
    return () => {};
  };

  /* ═══════════ Kafka: partitions, keys, consumer groups, offsets ═══════════ */
  FIGS.kafka = (el) => {
    const P = 3, COLORS = ["#60a5fa", "#f472b6", "#4ade80", "#fb923c", "#a78bfa", "#facc15"], KEYS = ["alice", "bob", "carol", "dave", "erin", "frank"];
    let shown = new Set(), parts = Array.from({ length: P }, () => []), nConsumers = 2, offA = [0, 0, 0], offB = [0, 0, 0], groupB = false, alive = true, n = 0, auto = false;
    const f = frame(el, {
      ctrl: `<span class="small muted">Produce with key:</span>${KEYS.map((k, i) => `<button class="btn sm" data-key="${k}" style="border-color:${COLORS[i]}">${k}</button>`).join("")}${tog("kf-auto", "Auto-produce", false)}`,
      stage: `<div class="kf" id="kf"></div>`,
      foot: `<div class="row" style="gap:20px;margin-top:6px"><div style="width:240px">${slider("kf-c", "Consumers in group A", 1, 5, nConsumers)}</div>${tog("kf-b", "Add consumer group B (analytics)", false)}</div><div class="fig-cap" id="kf-cap">Partition = <code>hash(key) % ${P}</code>. Same key → same partition → <b>ordered</b>. Each partition is consumed by exactly one consumer in a group.</div>`
    });
    function draw() {
      const owner = (p) => (nConsumers ? p % nConsumers : -1);
      $("#kf", f).innerHTML = parts.map((cells, p) => `<div class="kf-row"><div class="kf-p">P${p}<small>broker ${p + 1}</small></div><div class="kf-cells">${cells.slice(-16).map((c) => `<span class="kf-cell ${c.o < offA[p] ? "done" : ""} ${shown.has(c.n) ? "" : "new"}" style="--kc:${c.col}" title="${c.k}">${c.o}${c.o === offA[p] ? '<i class="ptr a">A</i>' : ""}${groupB && c.o === offB[p] ? '<i class="ptr b">B</i>' : ""}</span>`).join("")}<span class="kf-cell ghost">${cells.length}${offA[p] === cells.length ? '<i class="ptr a">A</i>' : ""}${groupB && offB[p] === cells.length ? '<i class="ptr b">B</i>' : ""}</span></div><div class="kf-cons">→ <b>A${owner(p) + 1}</b>${groupB ? " · B1" : ""}</div></div>`).join("") +
        `<div class="kf-group">${Array.from({ length: nConsumers }, (_, i) => `<span class="chip ${i >= P ? "" : "on"}">consumer A${i + 1}${i >= P ? " (idle: no partition left)" : ` ← P${[...Array(P).keys()].filter((p) => p % nConsumers === i).join(",P")}`}</span>`).join("")}</div>`;
      parts.forEach((cs) => cs.forEach((c) => shown.add(c.n)));
    }
    function produce(k) {
      const p = hash(k) % P, col = COLORS[KEYS.indexOf(k)];
      parts[p].push({ o: parts[p].length, k, col, n: ++n });
      $("#kf-cap", f).innerHTML = `Produced <b>${k}</b> → <code>hash("${k}") % ${P} = ${p}</code> → appended to P${p} at offset ${parts[p].length - 1}. Every message keyed "${k}" lands in P${p}, so ${k}'s messages stay in order.`;
      draw();
    }
    $$("[data-key]", f).forEach((b) => (b.onclick = () => produce(b.dataset.key)));
    $("#kf-auto", f).onchange = (e) => (auto = e.target.checked);
    $("#kf-c", f).oninput = (e) => { nConsumers = +e.target.value; $("#kf-c-v", f).textContent = nConsumers; $("#kf-cap", f).innerHTML = `Rebalance: ${P} partitions over ${nConsumers} consumer(s).${nConsumers > P ? ` <b>${nConsumers - P} consumer(s) sit idle</b>: more consumers than partitions is pointless.` : ""}`; draw(); };
    $("#kf-b", f).onchange = (e) => { groupB = e.target.checked; $("#kf-cap", f).innerHTML = groupB ? "Group B reads the <b>same</b> messages independently with its own offsets. That's pub-sub: messages aren't deleted when read, only when the retention period expires." : ""; draw(); };
    const iv = setInterval(() => {
      if (!alive) return;
      if (auto && Math.random() < 0.7) produce(KEYS[Math.floor(Math.random() * 6)]);
      let moved = false;
      for (let p = 0; p < P; p++) { if (nConsumers && offA[p] < parts[p].length && Math.random() < 0.55) { offA[p]++; moved = true; } if (groupB && offB[p] < parts[p].length && Math.random() < 0.22) { offB[p]++; moved = true; } }
      if (moved) draw();
    }, 700);
    draw();
    return () => { alive = false; clearInterval(iv); };
  };

  /* ═══════════ ZooKeeper master election with ephemeral znodes ═══════════ */
  FIGS.zookeeper = (el) => {
    let ms = [1, 2, 3, 4].map((i) => ({ id: "M" + i, up: true })), master = null, znode = null, alive = true, busy = false, caches = ["?", "?"];
    const pos = (i) => [100 + i * 150, 290], ZK = [380, 140];
    const f = frame(el, {
      ctrl: `<button class="btn primary sm" id="zk-e">🏁 Start election</button><button class="btn sm" id="zk-k">💥 Kill master</button><button class="btn sm" id="zk-r">♻️ Revive dead machine</button>`,
      stage: `<svg viewBox="0 0 760 340" id="zk"></svg>`,
      foot: `<div class="log" id="zk-log" style="max-height:130px"></div>`
    });
    const svg = $("#zk", f), log = logger($("#zk-log", f)), L = () => $("#zk-d", svg), al = () => alive;
    function draw() {
      let h = `<g class="fx-box" style="--kc:var(--k-cache)"><rect class="fx-rect" x="${ZK[0] - 130}" y="${ZK[1] - 55}" width="260" height="110" rx="14"/><text class="fx-l" x="${ZK[0]}" y="${ZK[1] - 30}" text-anchor="middle">🐘 ZooKeeper ensemble (5 nodes)</text>
        <text x="${ZK[0]}" y="${ZK[1] - 4}" text-anchor="middle" font-family="var(--mono)" font-size="12" fill="var(--muted)">/clusterx/master_ip  (ephemeral)</text>
        <rect x="${ZK[0] - 80}" y="${ZK[1] + 8}" width="160" height="30" rx="8" fill="${znode ? "color-mix(in srgb,var(--ok) 25%,transparent)" : "var(--panel2)"}" stroke="${znode ? "var(--ok)" : "var(--border2)"}"/>
        <text x="${ZK[0]}" y="${ZK[1] + 28}" text-anchor="middle" font-family="var(--mono)" font-weight="700" fill="var(--text)">${znode ? znode + " ♥" : "— empty —"}</text></g>`;
      ["App server 1", "App server 2"].forEach((a, i) => (h += box("app" + i, i ? 680 : 80, 60, 130, 50, "⚙️ " + a, `cache: ${caches[i]}`, "service")));
      ms.forEach((m, i) => { const [x, y] = pos(i); h += `<g class="fx-box ${m.up ? "" : "dead"} ${m.id === master ? "on" : ""}" style="--kc:var(--k-db)"><rect class="fx-rect" x="${x - 60}" y="${y - 28}" width="120" height="56" rx="12"/><text class="fx-l" x="${x}" y="${y - 3}" text-anchor="middle">${m.id === master ? "👑 " : "🗄️ "}${m.id}</text><text class="fx-s" x="${x}" y="${y + 15}" text-anchor="middle">${m.up ? (m.id === master ? "master" : master ? "slave · watching" : "candidate") : "DEAD"}</text></g>`; });
      fxBase(svg, "zk-d").innerHTML = h;
    }
    async function election() {
      const cands = ms.filter((m) => m.up); if (!cands.length) return;
      log(`Race: ${cands.map((m) => m.id).join(", ")} all try <code>create /clusterx/master_ip</code> (ephemeral)`, "hl");
      const winner = pick(cands);
      await Promise.all(cands.map((m) => dot(L(), pos(ms.indexOf(m)), [ZK[0], ZK[1] + 50], { dur: m === winner ? 500 : 700, label: m.id, alive: al })));
      znode = winner.id; master = winner.id; draw();
      log(`✓ ${winner.id} won (ZK leader serializes writes, so exactly one create succeeds). Others get NodeExists → become slaves and set a <b>watch</b>.`, "ok");
      await Promise.all([0, 1].map((i) => dot(L(), ZK, [i ? 680 : 80, 85], { color: "var(--ok)", label: winner.id, alive: al })));
      caches = [winner.id, winner.id]; draw();
      log(`App servers read the znode once, cache "${winner.id}", and set a watch. No extra hop per request.`);
    }
    $("#zk-e", f).onclick = async () => { if (busy) return; busy = true; if (!znode) await election(); else log("A master already exists. Kill it to see failover.", "warn"); busy = false; };
    $("#zk-k", f).onclick = async () => {
      if (busy || !master) return; busy = true;
      const m = ms.find((x) => x.id === master); m.up = false; master = null; draw();
      log(`💥 ${m.id} died. Heartbeats stop…`, "bad"); await sleep(1300);
      znode = null; draw(); log("Session timeout → ZooKeeper deletes the ephemeral znode → notifies every watcher.", "warn");
      await Promise.all([...ms.filter((x) => x.up).map((x) => dot(L(), ZK, pos(ms.indexOf(x)), { color: "var(--warn)", label: "watch!", alive: al })), ...[0, 1].map((i) => dot(L(), ZK, [i ? 680 : 80, 85], { color: "var(--warn)", label: "watch!", alive: al }))]);
      caches = ["null", "null"]; draw(); log("App servers clear their cache. A write arriving right now would fail (no master yet).", "warn");
      await election(); busy = false;
    };
    $("#zk-r", f).onclick = () => { const d = ms.find((x) => !x.up); if (!d) return; d.up = true; draw(); log(`${d.id} is back. It reads /clusterx/master_ip = ${znode || "empty"} → ${znode ? "joins as a slave" : "joins the race"}.`, "ok"); };
    draw();
    return () => { alive = false; };
  };

  /* ═══════════ Inverted index (Lucene pipeline) ═══════════ */
  FIGS.invindex = (el) => {
    const DOCS = ["Hiring now: we are posting a job for a backend engineer!", "When I ran the app, the app crashed.", "While running the app, the app crashes on startup.", "Great job posting tips for engineers looking for jobs.", "Our product team wrote a decent post about money."];
    const STOP = new Set("a an the we are for on of to is in i our about when while now".split(" "));
    const IRR = { ran: "run" };
    const stem = (w) => { if (IRR[w]) return IRR[w]; let s = w; if (s.endsWith("ing") && s.length > 5) s = s.slice(0, -3); else if (s.endsWith("es") && /(sh|ch|x|s)es$/.test(s)) s = s.slice(0, -2); else if (s.endsWith("ed") && s.length > 4) s = s.slice(0, -2); else if (s.endsWith("s") && !s.endsWith("ss") && s.length > 3) s = s.slice(0, -1); if (/([bdgmnprt])\1$/.test(s)) s = s.slice(0, -1); return s; };
    const pipe = (t) => { const toks = t.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean); const kept = toks.filter((x) => !STOP.has(x)); return { toks, kept, stems: kept.map(stem) }; };
    const index = {};
    DOCS.forEach((d, di) => pipe(d).stems.forEach((s, pos) => (index[s] = index[s] || []).push([di, pos + 1])));
    let sel = 1;
    const f = frame(el, {
      ctrl: `<input type="text" id="ii-q" value="job posting" style="width:240px"><button class="btn primary sm" id="ii-go">Search</button><span class="small muted">Try: "running app", "crash", "engineer jobs"</span>`,
      stage: `<div class="grid2" style="grid-template-columns:1fr 1fr"><div><h4 class="fig-h">Documents (click one to see the pipeline)</h4><div id="ii-docs"></div><div class="pane" id="ii-pipe" style="margin-top:10px"></div></div><div><h4 class="fig-h">Inverted index: term → [(doc, position)]</h4><div class="ii-index" id="ii-idx"></div></div></div>`,
      foot: `<div class="verdict" id="ii-v"></div>`
    });
    let hits = new Set(), qterms = [];
    function draw() {
      $("#ii-docs", f).innerHTML = DOCS.map((d, i) => `<div class="ii-doc ${i === sel ? "sel" : ""} ${hits.has(i) ? "hit" : ""}" data-d="${i}"><b>doc ${i}</b> ${d.split(/(\s+)/).map((w) => qterms.includes(stem(w.toLowerCase().replace(/[^a-z]/g, ""))) && w.trim() ? `<mark>${esc(w)}</mark>` : esc(w)).join("")}</div>`).join("");
      $$("[data-d]", f).forEach((d) => (d.onclick = () => { sel = +d.dataset.d; draw(); }));
      const p = pipe(DOCS[sel]);
      $("#ii-pipe", f).innerHTML = `<div class="ii-stage"><small>1 · tokenize</small>${p.toks.map((t) => `<span class="kv">${t}</span>`).join("")}</div><div class="ii-stage"><small>2 · drop stop words</small>${p.toks.map((t) => `<span class="kv ${STOP.has(t) ? "gone" : ""}">${t}</span>`).join("")}</div><div class="ii-stage"><small>3 · stem to root</small>${p.kept.map((t, i) => `<span class="kv ${p.stems[i] !== t ? "chg" : ""}">${p.stems[i]}</span>`).join("")}</div>`;
      $("#ii-idx", f).innerHTML = Object.keys(index).sort().map((t) => `<div class="ii-row ${qterms.includes(t) ? "hl" : ""}"><code>${t}</code><span>${index[t].map(([d, pos]) => `<i class="${hits.has(d) && qterms.includes(t) ? "on" : ""}">(${d},${pos})</i>`).join(" ")}</span></div>`).join("");
    }
    function go() {
      const q = pipe($("#ii-q", f).value); qterms = q.stems;
      const lists = qterms.map((t) => new Set((index[t] || []).map((x) => x[0])));
      hits = lists.length ? new Set([...lists[0]].filter((d) => lists.every((l) => l.has(d)))) : new Set();
      const chars = DOCS.reduce((a, d) => a + d.length, 0);
      const v = $("#ii-v", f); v.className = "verdict " + (hits.size ? "good" : "warn");
      v.innerHTML = `Query → [${qterms.map((t) => `<code>${t}</code>`).join(", ")}] → look up ${qterms.length} posting list(s) → intersect → <b>${hits.size ? `docs ${[...hits].join(", ")}` : "no doc has all terms"}</b>. Cost ≈ size of the posting lists, not the corpus. <br><span class="muted">SQL <code>LIKE '%${esc($("#ii-q", f).value)}%'</code> would scan every row: ~${chars.toLocaleString()} chars here, and billions of posts at LinkedIn scale. It would also miss "running" vs "ran".</span>`;
      draw();
    }
    $("#ii-go", f).onclick = go; $("#ii-q", f).onkeydown = (e) => e.key === "Enter" && go();
    go();
    return () => {};
  };

  /* ═══════════ HDFS: chunks, NameNode, rack-aware replicas ═══════════ */
  FIGS.hdfs = (el) => {
    let seen = new Set(), size = 600, dns = Array.from({ length: 6 }, (_, i) => ({ id: "DN" + (i + 1), rack: i < 3 ? 1 : 2, up: true, blocks: [] })), meta = [], alive = true, busy = false;
    const f = frame(el, {
      ctrl: `<div style="width:260px">${slider("hd-s", "File size (MB)", 50, 1500, size, 10)}</div><button class="btn primary sm" id="hd-up">⬆ Upload file</button><button class="btn sm" id="hd-x">↺ Reset</button><span class="small muted">Click a DataNode to kill it.</span>`,
      stage: `<div class="grid2" style="grid-template-columns:1fr 1.3fr"><div class="pane"><h4>🧠 NameNode metadata (in RAM)</h4><div id="hd-meta" class="hd-meta"></div></div><div><div class="hd-racks" id="hd-racks"></div></div></div>`,
      foot: `<div class="fig-cap" id="hd-cap">Files are cut into <b>128 MB blocks</b>. Each block gets <b>3 replicas</b>: one on the writer's rack, two on a different rack. A whole rack can lose power and the file survives.</div>`
    });
    const COL = ["#60a5fa", "#f472b6", "#4ade80", "#fb923c", "#a78bfa", "#facc15", "#2dd4bf", "#f87171", "#c084fc", "#34d399", "#fbbf24", "#93c5fd"];
    function draw() {
      $("#hd-meta", f).innerHTML = meta.length ? meta.map((m) => { const live = m.nodes.filter((n) => dns.find((d) => d.id === n).up).length; return `<div class="hd-row ${live < 3 ? "bad" : ""}"><span class="blk" style="background:${m.col}">B${m.b}</span><span class="mono small">${m.mb} MB</span><span class="small">→ ${m.nodes.map((n) => `<span class="${dns.find((d) => d.id === n).up ? "" : "strike"}">${n}</span>`).join(", ")}</span>${live < 3 ? `<span class="small" style="color:var(--bad)">under-replicated</span>` : ""}</div>`; }).join("") : `<span class="muted small">No files yet.</span>`;
      $("#hd-racks", f).innerHTML = [1, 2].map((r) => `<div class="hd-rack"><div class="small muted">Rack ${r}</div>${dns.filter((d) => d.rack === r).map((d) => `<div class="hd-dn ${d.up ? "" : "dead"}" data-dn="${d.id}"><b>${d.up ? "💾" : "💀"} ${d.id}</b><div>${d.blocks.map((b) => `<span class="blk ${seen.has(d.id + ":" + b) ? "" : "pop"}" style="background:${meta[b - 1].col}">B${b}</span>`).join("")}</div></div>`).join("")}</div>`).join("");
      dns.forEach((d) => d.blocks.forEach((b) => seen.add(d.id + ":" + b)));
      $$("[data-dn]", f).forEach((e) => (e.onclick = () => kill(e.dataset.dn)));
    }
    async function upload() {
      if (busy) return; busy = true;
      dns.forEach((d) => (d.blocks = [])); meta = []; seen = new Set();
      const n = Math.ceil(size / 128);
      for (let b = 1; b <= n && alive; b++) {
        const mb = b < n ? 128 : size - 128 * (n - 1);
        const up = dns.filter((d) => d.up), r1 = up.filter((d) => d.rack === 1), r2 = up.filter((d) => d.rack === 2);
        const first = pick(r1.length ? r1 : up), other = (first.rack === 1 ? r2 : r1).sort(() => Math.random() - 0.5).slice(0, 2);
        const nodes = [first, ...other].slice(0, 3);
        meta.push({ b, mb, nodes: nodes.map((d) => d.id), col: COL[(b - 1) % COL.length] });
        for (const d of nodes) { d.blocks.push(b); draw(); await sleep(140); }
        $("#hd-cap", f).innerHTML = `Block B${b} (${mb} MB): client → <b>${nodes[0].id}</b> (rack ${nodes[0].rack}) → pipeline to <b>${nodes.slice(1).map((d) => d.id).join(" → ")}</b> (other rack). NameNode records only the metadata; data never flows through it.`;
      }
      $("#hd-cap", f).innerHTML = `Done: ${size} MB → <b>${n} blocks</b> (${n > 1 ? `${n - 1} × 128 MB + ${size - 128 * (n - 1)} MB` : `${size} MB`}), ${n * 3} block replicas. Why not 1 MB blocks? A 50 TB file would need 5×10⁷ metadata entries, and the NameNode keeps them all in RAM.`;
      busy = false;
    }
    async function kill(id) {
      const d = dns.find((x) => x.id === id); if (!d.up) { d.up = true; d.blocks = []; draw(); return; }
      d.up = false; draw();
      $("#hd-cap", f).innerHTML = `💀 ${id} stopped heartbeating. The NameNode sees under-replicated blocks…`;
      await sleep(1200);
      meta.forEach((m) => {
        if (!m.nodes.includes(id)) return;
        const target = dns.filter((x) => x.up && !m.nodes.includes(x.id)).sort((a, b) => a.blocks.length - b.blocks.length)[0];
        if (!target) return;
        m.nodes = m.nodes.map((n) => (n === id ? target.id : n)); target.blocks.push(m.b);
      });
      d.blocks = []; draw();
      $("#hd-cap", f).innerHTML = `♻️ Re-replicated ${id}'s blocks from surviving copies onto other DataNodes. Replication factor is back to 3. Click a dead node to bring it back (empty).`;
    }
    $("#hd-s", f).oninput = (e) => { size = +e.target.value; $("#hd-s-v", f).textContent = size; };
    $("#hd-up", f).onclick = upload;
    $("#hd-x", f).onclick = () => { dns.forEach((d) => { d.up = true; d.blocks = []; }); meta = []; draw(); };
    draw();
    return () => { alive = false; };
  };

  /* ═══════════ Quadtree ═══════════ */
  FIGS.quadtree = (el) => {
    let cap = 4, pts = [], mode = "add", query = null;
    const f = frame(el, {
      ctrl: `${seg("qt-m", [["add", "➕ Add points"], ["near", "📍 Find 5 nearest"]], mode)}<div style="width:200px">${slider("qt-c", "Max points per cell", 1, 10, cap)}</div><button class="btn sm" id="qt-r">+40 random</button><button class="btn sm" id="qt-city">🏙️ Add a dense city</button><button class="btn sm" id="qt-x">↺</button>`,
      stage: `<div class="pane" style="padding:0;overflow:hidden;cursor:crosshair"><canvas id="qt"></canvas></div>`,
      foot: `<div class="verdict" id="qt-v">Click to drop restaurants. A cell splits into 4 when it holds more than the max: dense cities get tiny cells, oceans stay huge. Depth ≈ log₄ N.</div>`
    });
    const cv = $("#qt", f);
    let G;
    const fit = () => { const dpr = Math.min(2, devicePixelRatio || 1), w = cv.clientWidth || 700, h = 380; cv.width = w * dpr; cv.height = h * dpr; cv.style.height = h + "px"; G = { ctx: cv.getContext("2d"), w, h }; G.ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    fit();
    function build() {
      const root = { x: 0, y: 0, w: G.w, h: G.h, pts: [], kids: null, d: 0 };
      const ins = (n, p) => {
        if (n.kids) return ins(n.kids[(p.x >= n.x + n.w / 2 ? 1 : 0) + (p.y >= n.y + n.h / 2 ? 2 : 0)], p);
        n.pts.push(p);
        if (n.pts.length > cap && n.w > 6) {
          const hw = n.w / 2, hh = n.h / 2;
          n.kids = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([a, b]) => ({ x: n.x + a * hw, y: n.y + b * hh, w: hw, h: hh, pts: [], kids: null, d: n.d + 1 }));
          const old = n.pts; n.pts = []; old.forEach((q) => ins(n, q));
        }
      };
      pts.forEach((p) => ins(root, p));
      return root;
    }
    function leaves(n, out = []) { if (n.kids) n.kids.forEach((k) => leaves(k, out)); else out.push(n); return out; }
    function draw() {
      const ctx = G.ctx, root = build(), L = leaves(root), cc = BP.FX.$ && getComputedStyle(document.documentElement).getPropertyValue("--c").trim();
      ctx.clearRect(0, 0, G.w, G.h);
      const maxD = Math.max(...L.map((l) => l.d));
      L.forEach((l) => {
        const vis = query && query.visited.has(l);
        ctx.fillStyle = vis ? "rgba(124,92,255,.18)" : `rgba(124,92,255,${0.02 + l.d * 0.015})`;
        if (query && l === query.leaf) ctx.fillStyle = "rgba(34,197,94,.25)";
        ctx.fillRect(l.x, l.y, l.w, l.h);
        ctx.strokeStyle = "rgba(148,163,184,.45)"; ctx.strokeRect(l.x + 0.5, l.y + 0.5, l.w - 1, l.h - 1);
      });
      if (query) { ctx.beginPath(); ctx.arc(query.x, query.y, query.r, 0, 7); ctx.strokeStyle = cc || "#7c5cff"; ctx.setLineDash([5, 4]); ctx.stroke(); ctx.setLineDash([]); }
      pts.forEach((p) => { ctx.beginPath(); ctx.arc(p.x, p.y, query && query.found.includes(p) ? 6 : 3.5, 0, 7); ctx.fillStyle = query && query.found.includes(p) ? "#22c55e" : "#e8edf7"; ctx.fill(); ctx.strokeStyle = "rgba(0,0,0,.4)"; ctx.stroke(); });
      if (query) { ctx.font = "22px serif"; ctx.textAlign = "center"; ctx.fillText("📍", query.x, query.y + 6); ctx.textAlign = "left"; }
      return { root, L, maxD };
    }
    function near(x, y) {
      const { L } = draw();
      const leaf = L.find((l) => x >= l.x && x < l.x + l.w && y >= l.y && y < l.y + l.h);
      let r = Math.max(leaf.w, leaf.h) / 2, visited, cand;
      for (let i = 0; i < 12; i++) {
        visited = new Set(L.filter((l) => { const cx = Math.max(l.x, Math.min(x, l.x + l.w)), cy = Math.max(l.y, Math.min(y, l.y + l.h)); return Math.hypot(cx - x, cy - y) <= r; }));
        cand = [...visited].flatMap((l) => l.pts).filter((p) => Math.hypot(p.x - x, p.y - y) <= r);
        if (cand.length >= 5 || r > G.w) break; r *= 1.5;
      }
      const examined = [...visited].reduce((a, l) => a + l.pts.length, 0);
      query = { x, y, r, leaf, visited, found: cand.sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y)).slice(0, 5) };
      draw();
      const v = $("#qt-v", f); v.className = "verdict good";
      v.innerHTML = `Found ${query.found.length} nearest by checking <b>${visited.size} cells</b> and <b>${examined}</b> of ${pts.length} points (${pts.length ? Math.round((1 - examined / pts.length) * 100) : 0}% skipped). Your cell is green; the search widened to neighbours until 5 were found.`;
    }
    cv.addEventListener("click", (e) => {
      const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      if (mode === "add") { pts.push({ x, y }); query = null; const { L, maxD } = draw(); $("#qt-v", f).innerHTML = `${pts.length} points · ${L.length} leaf cells · depth ${maxD}.`; } else if (pts.length) near(x, y);
    });
    bindSeg(f, "qt-m", (v) => { mode = v; });
    $("#qt-c", f).oninput = (e) => { cap = +e.target.value; $("#qt-c-v", f).textContent = cap; query = null; draw(); };
    $("#qt-r", f).onclick = () => { for (let i = 0; i < 40; i++) pts.push({ x: rnd(5, G.w - 5), y: rnd(5, G.h - 5) }); query = null; const { L, maxD } = draw(); $("#qt-v", f).innerHTML = `${pts.length} points · ${L.length} leaf cells · depth ${maxD}.`; };
    $("#qt-city", f).onclick = () => { const cx = rnd(G.w * 0.2, G.w * 0.8), cy = rnd(G.h * 0.2, G.h * 0.8); for (let i = 0; i < 60; i++) pts.push({ x: cx + rnd(-1, 1) * rnd(0, 50), y: cy + rnd(-1, 1) * rnd(0, 40) }); query = null; const { L, maxD } = draw(); $("#qt-v", f).innerHTML = `🏙️ A dense city: cells subdivided down to depth ${maxD} there, while empty areas stay as single big cells (${L.length} leaves total). That's why fixed-size grids fail.`; };
    $("#qt-x", f).onclick = () => { pts = []; query = null; draw(); };
    const onR = () => { fit(); draw(); }; addEventListener("resize", onR);
    for (let i = 0; i < 25; i++) pts.push({ x: rnd(5, G.w - 5), y: rnd(5, G.h - 5) });
    draw();
    return () => removeEventListener("resize", onR);
  };

  /* ═══════════ Snowflake ID builder ═══════════ */
  FIGS.snowflake = (el) => {
    const EPOCH = 1288834974657n;
    let dc = 3, wk = 7, lastMs = -1n, seq = 0, ids = [], waits = 0;
    const f = frame(el, {
      ctrl: `<div style="width:170px">${slider("sf-dc", "Datacenter id (5 bits)", 0, 31, dc)}</div><div style="width:170px">${slider("sf-wk", "Machine id (5 bits)", 0, 31, wk)}</div><button class="btn primary sm" id="sf-g">Generate ID</button><button class="btn sm" id="sf-b">⚡ Burst 5,000 in one ms</button>`,
      stage: `<div class="sf-bits" id="sf-bits"></div><div class="sf-legend"><span style="--kc:#64748b">sign · 1</span><span style="--kc:#7c5cff">timestamp ms · 41</span><span style="--kc:#22d3ee">datacenter · 5</span><span style="--kc:#f472b6">machine · 5</span><span style="--kc:#f59e0b">sequence · 12</span></div><div class="sf-out" id="sf-out"></div>`,
      foot: `<div class="log" id="sf-log" style="max-height:120px"></div>`
    });
    const log = logger($("#sf-log", f));
    function make(ms) {
      if (ms === lastMs) { seq++; if (seq > 4095) { waits++; return null; } } else { seq = 0; lastMs = ms; }
      return ((ms - EPOCH) << 22n) | (BigInt(dc) << 17n) | (BigInt(wk) << 12n) | BigInt(seq);
    }
    function show(id) {
      const bin = id.toString(2).padStart(64, "0"), cls = (i) => (i === 0 ? "s" : i < 42 ? "t" : i < 47 ? "d" : i < 52 ? "m" : "q");
      $("#sf-bits", f).innerHTML = [...bin].map((b, i) => `<i class="${cls(i)} ${b === "1" ? "one" : ""}">${b}</i>`).join("");
      const ts = Number((id >> 22n) + EPOCH);
      $("#sf-out", f).innerHTML = `<div class="mono" style="font-size:1.3rem;font-weight:800">${id.toString()}</div><div class="small muted">timestamp ${new Date(ts).toISOString()} · dc ${dc} · machine ${wk} · sequence ${Number(id & 4095n)}</div>`;
    }
    $("#sf-g", f).onclick = () => { const id = make(BigInt(Date.now())); if (id) { show(id); ids.push(id); log(`${id} (seq ${Number(id & 4095n)})`, "ok"); } };
    $("#sf-b", f).onclick = () => {
      const ms = BigInt(Date.now()) + 5n; let made = 0, last; waits = 0; lastMs = -1n;
      for (let i = 0; i < 5000; i++) { const id = make(ms); if (id) { made++; last = id; } }
      show(last);
      log(`Burst: generated <b>${made}</b> IDs within one millisecond (sequence 0…4095). <b>${waits}</b> requests had to wait for the next ms: 12 sequence bits = 4,096 IDs/ms/machine ≈ 4M IDs/s per machine.`, "warn");
    };
    $("#sf-dc", f).oninput = (e) => { dc = +e.target.value; $("#sf-dc-v", f).textContent = dc; };
    $("#sf-wk", f).oninput = (e) => { wk = +e.target.value; $("#sf-wk-v", f).textContent = wk; };
    $("#sf-g", f).click();
    log("41 bits of milliseconds ≈ 69.7 years from the custom epoch (Twitter: 4 Nov 2010). Because time is the high bits, IDs sort by creation time.", "hl");
    return () => {};
  };

  /* ═══════════ Rate-limiting algorithms on the same traffic ═══════════ */
  FIGS.ratealgos = (el) => {
    const T = 20, W = 4;
    let limit = 5, reqs = [];
    const gen = () => { const r = []; let t = 0; while (t < T) { t += Math.random() < 0.25 ? rnd(0.02, 0.15) : rnd(0.2, 1.1); if (t < T) r.push(t); } return r; };
    const burst = () => { const r = gen().filter((t) => t < 3 || t > 6); for (let i = 0; i < limit; i++) { r.push(3.6 + i * 0.07); r.push(4.02 + i * 0.07); } return r.sort((a, b) => a - b); };
    reqs = gen();
    const f = frame(el, {
      ctrl: `<div style="width:230px">${slider("rl-l", `Limit (requests per ${W} s)`, 2, 10, limit)}</div><button class="btn sm" id="rl-n">🎲 New random traffic</button><button class="btn primary sm" id="rl-b">💣 Boundary-burst attack</button>`,
      stage: `<svg viewBox="0 0 760 380" id="rl"></svg>`,
      foot: `<div class="fig-cap" id="rl-cap">Same request stream, five algorithms. <span style="color:var(--ok)">●</span> allowed · <span style="color:var(--bad)">●</span> rejected (429) · <span style="color:var(--warn)">●</span> queued (leaky bucket).</div>`
    });
    function run() {
      const out = { fixed: [], log: [], slide: [], token: [], leaky: [] };
      const cnt = {}, logq = [];
      reqs.forEach((t) => { const w = Math.floor(t / W); cnt[w] = cnt[w] || 0; out.fixed.push(cnt[w] < limit ? (cnt[w]++, "ok") : "no"); });
      reqs.forEach((t) => { while (logq.length && logq[0] <= t - W) logq.shift(); out.log.push(logq.length < limit ? (logq.push(t), "ok") : "no"); });
      const wc = {}; reqs.forEach((t) => { const w = Math.floor(t / W), frac = (t % W) / W, est = (wc[w - 1] || 0) * (1 - frac) + (wc[w] || 0); out.slide.push(est < limit ? ((wc[w] = (wc[w] || 0) + 1), "ok") : "no"); });
      let tok = limit, lt = 0; reqs.forEach((t) => { tok = Math.min(limit, tok + ((t - lt) * limit) / W); lt = t; out.token.push(tok >= 1 ? (tok--, "ok") : "no"); });
      let q = 0, lq = 0; reqs.forEach((t) => { q = Math.max(0, q - ((t - lq) * limit) / W); lq = t; out.leaky.push(q < 1 ? (q++, "ok") : q < limit ? (q++, "q") : "no"); });
      return out;
    }
    function draw() {
      const R = run(), X = (t) => 120 + (t / T) * 620;
      const lanes = [["fixed", "Fixed window"], ["log", "Sliding log"], ["slide", "Sliding counter"], ["token", "Token bucket"], ["leaky", "Leaky bucket"]];
      let h = "";
      for (let w = 0; w <= T; w += W) h += `<line x1="${X(w)}" y1="20" x2="${X(w)}" y2="350" stroke="var(--border2)" stroke-dasharray="${w % W ? "2 4" : "4 3"}"/><text x="${X(w)}" y="370" text-anchor="middle" font-size="10" fill="var(--muted)">${w}s</text>`;
      lanes.forEach(([k, name], i) => {
        const y = 45 + i * 64, ok = R[k].filter((x) => x === "ok").length;
        h += `<text x="10" y="${y + 4}" font-size="12.5" font-weight="700" fill="var(--text)">${name}</text><text x="10" y="${y + 20}" font-size="11" fill="var(--muted)">${k === "leaky" ? `${ok} now · ${R[k].filter((x) => x === "q").length} queued` : `${ok}/${reqs.length} allowed`}</text><line x1="120" y1="${y}" x2="740" y2="${y}" stroke="var(--border)"/>`;
        reqs.forEach((t, j) => { const s = R[k][j]; h += `<circle cx="${X(t)}" cy="${y}" r="4.5" fill="${s === "ok" ? "var(--ok)" : s === "q" ? "var(--warn)" : "var(--bad)"}" opacity=".9"/>`; });
      });
      let worst = 0; for (let i = 0; i < reqs.length; i++) { let c = 0; for (let j = i; j < reqs.length && reqs[j] - reqs[i] < W; j++) if (R.fixed[j] === "ok") c++; worst = Math.max(worst, c); }
      if (worst > limit) h += `<rect x="${X(3.5)}" y="25" width="${X(4.5) - X(3.5)}" height="40" fill="none" stroke="var(--bad)" stroke-width="2" rx="6"/><text x="${X(4.6)}" y="40" font-size="11" fill="var(--bad)" font-weight="700">fixed window let ${worst} through within ${W}s (limit ${limit})!</text>`;
      $("#rl", f).innerHTML = h;
    }
    $("#rl-l", f).oninput = (e) => { limit = +e.target.value; $("#rl-l-v", f).textContent = limit; draw(); };
    $("#rl-n", f).onclick = () => { reqs = gen(); draw(); $("#rl-cap", f).innerHTML = "Random traffic. Token bucket allows short bursts up to capacity. Leaky bucket smooths output by queueing. The sliding counter estimates <code>prev × (1 − elapsed) + curr</code> with just two numbers per client."; };
    $("#rl-b", f).onclick = () => { reqs = burst(); draw(); $("#rl-cap", f).innerHTML = `💣 <b>Boundary burst:</b> ${limit} requests just before the 4 s boundary and ${limit} just after. The <b>fixed window</b> resets its counter at 4 s and lets all ${2 * limit} through, 2× the limit. The sliding log and sliding counter catch it.`; };
    draw();
    return () => {};
  };

  /* ═══════════ Monolith vs microservices ═══════════ */
  FIGS.monolith = (el) => {
    const MODS = [["Users", "👤"], ["Catalog", "📦"], ["Cart", "🛒"], ["Payments", "💳"], ["Recs", "✨"]];
    let mode = "mono", event = null;
    const f = frame(el, {
      ctrl: `${seg("mm-m", [["mono", "🧱 Monolith"], ["micro", "🧩 Microservices"]], mode)}<button class="btn sm" data-ev="scale">🛍️ Big Billion Day: scale Cart</button><button class="btn sm" data-ev="bug">🐛 Memory leak in Recs</button><button class="btn sm" data-ev="deploy">🚀 Ship a Payments fix</button><button class="btn sm" data-ev="none">↺</button>`,
      stage: `<svg viewBox="0 0 760 330" id="mm"></svg>`,
      foot: `<div class="grid3">${["Machines needed", "Blast radius", "Hops per request"].map((k, i) => `<div class="metric" id="mm-m${i}"><div class="k">${k}</div><div class="v">–</div></div>`).join("")}</div><div class="fig-cap" id="mm-cap"></div>`
    });
    function draw() {
      let h = box("gw", 380, 30, mode === "mono" ? 150 : 190, 40, mode === "mono" ? "⚖️ Load balancer" : "🚪 LB → API gateway", "", "edge");
      const m = (i, v, c) => { $(".v", $("#mm-m" + i, f)).textContent = v; $("#mm-m" + i, f).className = "metric " + (c || ""); };
      if (mode === "mono") {
        const copies = event === "scale" ? 4 : 2;
        for (let c = 0; c < copies; c++) {
          const x = 380 + (c - (copies - 1) / 2) * (copies > 2 ? 175 : 260), down = event === "bug", dep = event === "deploy";
          h += line([380, 50], [x, 95], "fx-edge thin") + `<g class="fx-box ${down ? "dead bad" : ""} ${dep ? "on" : ""}" style="--kc:var(--k-service)"><rect class="fx-rect" x="${x - 80}" y="95" width="160" height="170" rx="14"/><text class="fx-l" x="${x}" y="115" text-anchor="middle">${down ? "💥 OOM" : dep ? "🔄 redeploying all" : "🧱 app.jar"}</text>${MODS.map(([n, ic], i) => `<rect x="${x - 66}" y="${125 + i * 27}" width="132" height="22" rx="6" fill="${down && n === "Recs" ? "var(--bad)" : n === "Cart" && event === "scale" ? "color-mix(in srgb,var(--c) 35%,transparent)" : "var(--panel2)"}"/><text x="${x}" y="${140 + i * 27}" text-anchor="middle" font-size="11.5" fill="var(--text)">${ic} ${n}</text>`).join("")}</g>`;
        }
        h += `<rect x="290" y="285" width="180" height="34" rx="10" fill="var(--bg2)" stroke="var(--k-db)"/><text x="380" y="307" text-anchor="middle" font-size="12" fill="var(--text)">🗄️ shared database</text>`;
        m(0, event === "scale" ? "4 big boxes" : "2 boxes", event === "scale" ? "warn" : ""); m(1, event === "bug" ? "everything down" : event === "deploy" ? "whole app redeploys" : "whole app", event ? "bad" : ""); m(2, "LB → app → DB", "good");
        $("#mm-cap", f).innerHTML = { scale: "To give Cart more capacity you must clone the <b>entire</b> app (Users, Catalog, Recs too), which wastes money.", bug: "A memory leak in a minor module (Recs) crashes the process, and checkout goes down with it.", deploy: "A one-line Payments fix means rebuilding and redeploying the whole executable. Build times grow with the codebase.", null: "<b>Monolith:</b> one codebase, one deployable. Simple, fast in-process calls, one DB. The usual advice: stay here until real pain appears." }[event];
      } else {
        MODS.forEach(([n, ic], i) => {
          const x = 90 + i * 145, inst = event === "scale" && n === "Cart" ? 4 : 1, down = event === "bug" && n === "Recs", dep = event === "deploy" && n === "Payments";
          h += line([380, 50], [x, 100], "fx-edge thin");
          for (let k = 0; k < inst; k++) h += `<g class="fx-box ${down ? "dead bad" : ""} ${dep ? "on" : ""}" style="--kc:var(--k-service)"><rect class="fx-rect" x="${x - 58 + k * 6}" y="${100 + k * 6}" width="116" height="60" rx="12"/><text class="fx-l" x="${x + k * 6}" y="${126 + k * 6}" text-anchor="middle">${ic} ${n}</text><text class="fx-s" x="${x + k * 6}" y="${144 + k * 6}" text-anchor="middle">${down ? "DOWN · fallback" : dep ? "deploying v2" : inst > 1 ? `×${inst} instances` : "service"}</text></g>`;
          h += line([x, 165 + (inst - 1) * 6], [x, 235], "fx-edge thin") + `<rect x="${x - 45}" y="235" width="90" height="34" rx="10" fill="var(--bg2)" stroke="var(--k-db)"/><text x="${x}" y="257" text-anchor="middle" font-size="11" fill="var(--text)">🗄️ ${n} DB</text>`;
        });
        h += `<text x="380" y="300" text-anchor="middle" font-size="11.5" fill="var(--muted)">services talk over the network (REST / gRPC / Kafka events)</text>`;
        m(0, event === "scale" ? "5 svcs + 3 Cart" : "≥ 5 app + 5 DB", "warn"); m(1, event === "bug" ? "only Recs" : event === "deploy" ? "only Payments" : "one service", "good"); m(2, "LB → GW → svc LB → app → DB (+ calls)", "warn");
        $("#mm-cap", f).innerHTML = { scale: "Scale <b>only Cart</b> (×4). Other services keep their size.", bug: "Recs dies alone. The page shows a fallback (\"popular items\"), and cart & checkout keep working. A circuit breaker stops callers from waiting on it.", deploy: "Payments deploys on its own schedule. Other teams aren't blocked.", null: "<b>Microservices:</b> each service owns its code, deploy, scaling and its <b>own database</b>. The costs are more machines, more network hops, harder tracing, and cross-service consistency." }[event];
      }
      $("#mm", f).innerHTML = h;
    }
    bindSeg(f, "mm-m", (v) => { mode = v; draw(); });
    $$("[data-ev]", f).forEach((b) => (b.onclick = () => { event = b.dataset.ev === "none" ? null : b.dataset.ev; draw(); }));
    draw();
    return () => {};
  };

  /* ═══════════ Saga: orchestration vs choreography with compensation ═══════════ */
  FIGS.saga = (el) => {
    const S = [["order", "📝 Order", "create order", "cancel order"], ["pay", "💳 Payment", "charge ₹999", "refund ₹999"], ["inv", "📦 Inventory", "stock 100 → 99", "stock 99 → 100"], ["ship", "🚚 Shipping", "schedule pickup", "—"]];
    let mode = "orch", fail = "inv", alive = true, busy = false, st = {};
    const X = (i) => 110 + i * 180;
    const f = frame(el, {
      ctrl: `${seg("sg-m", [["orch", "🎻 Orchestration"], ["chor", "💃 Choreography (Kafka events)"]], mode)}<span class="small muted">Fail at:</span>${seg("sg-f", [["none", "nothing"], ["pay", "Payment"], ["inv", "Inventory"], ["ship", "Shipping"]], fail)}<button class="btn primary sm" id="sg-go">▶ Place order</button>`,
      stage: `<svg viewBox="0 0 760 300" id="sg"></svg>`,
      foot: `<div class="log" id="sg-log" style="max-height:130px"></div>`
    });
    const svg = $("#sg", f), log = logger($("#sg-log", f)), L = () => $("#sg-d", svg), al = () => alive;
    function draw() {
      let h = mode === "orch" ? box("o", 380, 40, 200, 46, "🎻 Order orchestrator", "owns the saga", "edge") : `<rect x="40" y="230" width="680" height="40" rx="12" fill="color-mix(in srgb,var(--k-queue) 14%,var(--bg2))" stroke="var(--k-queue)"/><text x="380" y="255" text-anchor="middle" font-weight="700" fill="var(--text)">📬 Kafka: order_created · payment_done · inventory_reserved · *_failed</text>`;
      S.forEach(([id, l, , ], i) => { const s = st[id]; h += `<g class="fx-box ${s === "fail" ? "bad" : ""} ${s === "ok" ? "on" : ""}" style="--kc:var(--k-service)"><rect class="fx-rect" x="${X(i) - 75}" y="125" width="150" height="62" rx="12"/><text class="fx-l" x="${X(i)}" y="151" text-anchor="middle">${l}</text><text class="fx-s" x="${X(i)}" y="170" text-anchor="middle">${s === "ok" ? "✓ committed" : s === "fail" ? "✗ failed" : s === "undo" ? "↩ compensated" : "local DB txn"}</text></g>`; if (mode === "orch") h += line([380, 63], [X(i), 125], "fx-edge thin"); else h += line([X(i), 187], [X(i), 230], "fx-edge thin"); });
      fxBase(svg, "sg-d").innerHTML = h;
    }
    async function run() {
      if (busy) return; busy = true; st = {}; draw(); $("#sg-log", f).innerHTML = "";
      let failedAt = -1;
      for (let i = 0; i < S.length && alive; i++) {
        const [id, l, act] = S[i];
        if (mode === "orch") await dot(L(), [380, 63], [X(i), 125], { label: act, alive: al });
        else if (i > 0) await dot(L(), [X(i - 1), 230], [X(i), 230], { label: `${S[i - 1][0]}_done`, color: "var(--k-queue)", alive: al });
        if (id === fail) { st[id] = "fail"; draw(); failedAt = i; log(`${l}: ${act} FAILED`, "bad"); if (mode === "orch") await dot(L(), [X(i), 125], [380, 63], { color: "var(--bad)", label: "error", alive: al }); else await dot(L(), [X(i), 187], [X(i), 230], { color: "var(--bad)", label: `${id}_failed`, alive: al }); break; }
        st[id] = "ok"; draw(); log(`${l}: ${act} ✓ (its own local ACID transaction)`, "ok");
        if (mode === "orch") await dot(L(), [X(i), 125], [380, 63], { color: "var(--ok)", label: "ok", alive: al }); else await dot(L(), [X(i), 187], [X(i), 230], { color: "var(--k-queue)", label: "publish", alive: al });
      }
      if (failedAt >= 0) {
        log(mode === "orch" ? "Orchestrator runs compensations in reverse order:" : `Services subscribed to <code>${S[failedAt][0]}_failed</code> undo their own work:`, "warn");
        for (let i = failedAt - 1; i >= 0 && alive; i--) {
          const [id, l, , undo] = S[i];
          await dot(L(), mode === "orch" ? [380, 63] : [X(failedAt), 230], mode === "orch" ? [X(i), 125] : [X(i), 187], { color: "var(--warn)", label: undo, alive: al });
          st[id] = "undo"; draw(); log(`${l}: ${undo} ↩ (compensating transaction)`, "warn");
        }
        log("System is consistent again, eventually. No locks were held across services (unlike 2PC).", "hl");
      } else log("All steps committed: order placed 🎉", "hl");
      busy = false;
    }
    bindSeg(f, "sg-m", (v) => { mode = v; st = {}; draw(); });
    bindSeg(f, "sg-f", (v) => (fail = v));
    $("#sg-go", f).onclick = run;
    draw();
    return () => { alive = false; };
  };

  /* ═══════════ Circuit breaker ═══════════ */
  FIGS.breaker = (el) => {
    let fail = 0, state = "closed", win = [], openedAt = 0, probes = [], noBreaker = false, queue = 0, alive = true, ok = 0, fast = 0, err = 0;
    const f = frame(el, {
      ctrl: `<div style="width:280px">${slider("cb-f", "Notification service failure rate %", 0, 100, fail, 5)}</div>${tog("cb-nb", "Disable breaker", false)}`,
      stage: `<svg viewBox="0 0 760 270" id="cb"></svg>`,
      foot: `<div class="grid3">${["Succeeded", "Failed fast (fallback)", "Timed out (slow fail)"].map((k, i) => `<div class="metric" id="cb-m${i}"><div class="k">${k}</div><div class="v">0</div></div>`).join("")}</div><div class="fig-cap" id="cb-cap"></div>`
    });
    const svg = $("#cb", f);
    const SP = { closed: [470, 60], open: [690, 60], half: [580, 200] };
    function draw() {
      let h = box("msg", 90, 130, 130, 56, "💬 Message svc", noBreaker ? `${queue} threads stuck` : "caller", "service") + box("not", 330, 130, 140, 56, "🔔 Notification", `${fail}% failing`, fail > 50 ? "external" : "service");
      h += line([155, 130], [260, 130]);
      if (!noBreaker) {
        h += `<text x="580" y="20" text-anchor="middle" font-size="12" fill="var(--muted)">breaker state (in the caller's Redis)</text>
          <path d="M520 60 H640" stroke="var(--border2)" marker-end="url(#ar)" fill="none"/><text x="580" y="52" text-anchor="middle" font-size="10" fill="var(--muted)">failures &gt; 50%</text>
          <path d="M690 85 L615 180" stroke="var(--border2)" fill="none"/><text x="680" y="140" font-size="10" fill="var(--muted)">after 3 s</text>
          <path d="M545 180 L480 85" stroke="var(--border2)" fill="none"/><text x="440" y="140" font-size="10" fill="var(--muted)">probes OK</text>`;
        Object.entries(SP).forEach(([k, [x, y]]) => { const on = state === k, col = { closed: "var(--ok)", open: "var(--bad)", half: "var(--warn)" }[k]; h += `<g><rect x="${x - 55}" y="${y - 22}" width="110" height="44" rx="22" fill="${on ? `color-mix(in srgb,${col} 30%,var(--bg2))` : "var(--bg2)"}" stroke="${col}" stroke-width="${on ? 3 : 1.2}"/><text x="${x}" y="${y + 5}" text-anchor="middle" font-weight="800" fill="var(--text)">${{ closed: "CLOSED", open: "OPEN", half: "HALF-OPEN" }[k]}</text></g>`; });
      } else h += `<text x="560" y="130" text-anchor="middle" font-size="13" fill="var(--bad)" font-weight="700">${queue > 6 ? "⚠ cascading failure: caller threads exhausted" : "no breaker: every call waits for a 2 s timeout"}</text>`;
      fxBase(svg, "cb-d").innerHTML = `<defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--border2)"/></marker></defs>` + h;
      [ok, fast, err].forEach((v, i) => { $(".v", $("#cb-m" + i, f)).textContent = v; $("#cb-m" + i, f).className = "metric " + ["good", "warn", "bad"][i]; });
      $("#cb-cap", f).innerHTML = noBreaker ? "Without a breaker, each request to the sick service waits for a timeout. Threads pile up in the caller, which slows down and starts failing too: a <b>cascade</b>. The recovering service also gets hammered (thundering herd)." : { closed: "<b>Closed:</b> requests flow. The caller counts failures (timeouts, 5xx, not \"user not found\") in a rolling window.", open: "<b>Open:</b> stop calling. Fail fast with a fallback so caller threads stay free and the service gets room to recover.", half: "<b>Half-open:</b> let a few trial requests through. If they succeed → Closed. If not → back to Open." }[state];
    }
    const iv = setInterval(async () => {
      if (!alive) return;
      const now = performance.now(), L = $("#cb-d", svg); if (!L) return;
      const willFail = Math.random() * 100 < fail;
      if (noBreaker) {
        dot(L, [155, 130], [260, 130], { r: 4, dur: 300 });
        if (willFail) { queue++; err++; setTimeout(() => { queue = Math.max(0, queue - 1); }, 2000); } else ok++;
        draw(); return;
      }
      if (state === "open") { fast++; if (now - openedAt > 3000) { state = "half"; probes = []; } draw(); return; }
      if (state === "half") {
        if (probes.length >= 3) return;
        await dot(L, [155, 130], [260, 130], { r: 4, dur: 300, color: "var(--warn)" });
        probes.push(!willFail); willFail ? err++ : ok++;
        if (probes.length === 3) { if (probes.filter(Boolean).length >= 2) { state = "closed"; win = []; } else { state = "open"; openedAt = performance.now(); } }
        draw(); return;
      }
      await dot(L, [155, 130], [260, 130], { r: 4, dur: 300, color: willFail ? "var(--bad)" : "var(--c)" });
      willFail ? err++ : ok++;
      win.push(willFail); if (win.length > 10) win.shift();
      if (win.length >= 6 && win.filter(Boolean).length / win.length > 0.5) { state = "open"; openedAt = performance.now(); }
      draw();
    }, 350);
    $("#cb-f", f).oninput = (e) => { fail = +e.target.value; $("#cb-f-v", f).textContent = fail; draw(); };
    $("#cb-nb", f).onchange = (e) => { noBreaker = e.target.checked; state = "closed"; win = []; draw(); };
    draw();
    return () => { alive = false; clearInterval(iv); };
  };

  /* ═══════════ Code-judge: versioned local file cache ═══════════ */
  FIGS.codejudge = (el) => {
    let ver = 1, servers = [[], [], []], alive = true, busy = false, total = { hit: 0, miss: 0 };
    const P = { s3: [640, 60], db: [640, 200], srv: (i) => [150, 60 + i * 110] };
    const f = frame(el, {
      ctrl: `<button class="btn primary sm" id="cj-s">📨 Submit solution (random server)</button><button class="btn sm" id="cj-e">✏️ Admin edits test file</button>`,
      stage: `<svg viewBox="0 0 760 330" id="cj"></svg>`,
      foot: `<div class="fig-cap" id="cj-cap">Test files are big (~2 s from S3). Each judge server caches them on <b>local disk</b> with the version in the filename: <code>200_t1_input.txt</code>. A tiny MySQL lookup (already part of the submission query) tells it which version is current.</div>`
    });
    const svg = $("#cj", f), L = () => $("#cj-d", svg), al = () => alive;
    function draw() {
      let h = box("s3", ...P.s3, 160, 50, "🪣 S3 file storage", `problem 200 · t${ver}`, "db") + box("db", ...P.db, 200, 56, "🗄️ MySQL problems_test_data", `200 → updated_at = t${ver}`, "db");
      servers.forEach((files, i) => { const [x, y] = P.srv(i); h += box("s" + i, x, y, 210, 70, `⚙️ Judge server ${i + 1}`, "", "service") + `<text x="${x}" y="${y + 22}" text-anchor="middle" font-family="var(--mono)" font-size="10.5" fill="var(--muted)">disk: ${files.map((v) => `200_t${v}${v === ver ? "" : "(old)"}`).join(", ") || "empty"}</text>`; h += line([x + 105, y], [540, 200], "fx-edge thin"); });
      fxBase(svg, "cj-d").innerHTML = h;
    }
    $("#cj-s", f).onclick = async () => {
      if (busy) return; busy = true;
      const i = Math.floor(Math.random() * 3), [x, y] = P.srv(i), has = servers[i].includes(ver);
      await dot(L(), [x + 105, y], [540, 200], { label: "SELECT … updated_at", alive: al });
      await dot(L(), [540, 200], [x + 105, y], { label: `t${ver}`, color: "var(--ok)", alive: al });
      if (has) { total.hit++; $("#cj-cap", f).innerHTML = `Server ${i + 1}: <code>200_t${ver}_input.txt</code> exists locally → guaranteed current → read from disk. <b>50 + 40 ms</b>. (hits ${total.hit} · misses ${total.miss})`; }
      else {
        total.miss++;
        await dot(L(), [x + 105, y], [560, 60], { label: "GET file (2 s)", color: "var(--bad)", dur: 1400, alive: al });
        await dot(L(), [560, 60], [x + 105, y], { label: `200_t${ver}`, dur: 900, alive: al });
        servers[i].push(ver); draw();
        $("#cj-cap", f).innerHTML = `Server ${i + 1}: no <code>200_t${ver}</code> on disk → fetch from S3 (~2 s), save under the versioned name. <b>50 ms + 2 s</b> this time, fast afterwards. (hits ${total.hit} · misses ${total.miss})`;
      }
      busy = false;
    };
    $("#cj-e", f).onclick = async () => {
      if (busy) return; busy = true; ver++;
      await dot(L(), [400, 0], P.s3, { label: "upload new file", alive: al }); draw();
      await dot(L(), P.s3, P.db, { label: `updated_at = t${ver}`, alive: al }); draw();
      $("#cj-cap", f).innerHTML = `Admin uploaded a new test file and bumped <code>updated_at</code> to t${ver}. Nothing is pushed to the servers. Their old <code>t${ver - 1}</code> files simply never match again: <b>stale reads are impossible</b>, with no TTL guessing.`;
      busy = false;
    };
    draw();
    return () => { alive = false; };
  };

  /* ═══════════ Messenger: sharding key & write order ═══════════ */
  FIGS.msgshard = (el) => {
    let key = "user", group = 2, order = "recipient", failSecond = false, alive = true, busy = false;
    const f = frame(el, {
      ctrl: `${seg("ms-k", [["user", "Shard by userId"], ["conv", "Shard by conversationId"]], key)}<div style="width:200px">${slider("ms-g", "Conversation size", 2, 200, group)}</div>`,
      stage: `<svg viewBox="0 0 760 250" id="ms"></svg><div class="row" style="margin-top:6px">${seg("ms-o", [["recipient", "Write recipient first"], ["sender", "Write sender first"]], order)}${tog("ms-f", "💥 Second write fails", false)}<button class="btn primary sm" id="ms-go">Send "Hi" ✉️</button></div>`,
      foot: `<div class="verdict" id="ms-v"></div>`
    });
    const svg = $("#ms", f), al = () => alive;
    const N = 8, sx = (i) => 70 + i * 89;
    function writes() { return key === "user" ? group : 1 + group; }
    function draw(hl = []) {
      let h = `<text x="380" y="22" text-anchor="middle" font-size="12" fill="var(--muted)">8 database shards</text>`;
      for (let i = 0; i < N; i++) h += `<g class="fx-box ${hl.includes(i) ? "on" : ""}" style="--kc:var(--k-db)"><rect class="fx-rect" x="${sx(i) - 38}" y="150" width="76" height="60" rx="10"/><text class="fx-l" x="${sx(i)}" y="185" text-anchor="middle">S${i + 1}</text></g>`;
      h += box("app", 380, 70, 160, 46, "💬 Message service", "", "service");
      fxBase(svg, "ms-d").innerHTML = h;
      const v = $("#ms-v", f), w = writes();
      v.className = "verdict " + (w <= 3 ? "good" : "bad");
      v.innerHTML = key === "user" ? `userId sharding: each user's mailbox lives on one shard. Sending to a ${group}-person conversation = <b>${w} writes</b> (one per member's mailbox). ${group > 2 ? "That explodes for big groups, which is why Slack and Teams shard by conversation." : "For 1:1 chat that's just 2 writes, and reading your inbox hits one shard."}` : `conversationId sharding: the message is written <b>once</b> to the conversation's shard, plus each member's "recent conversations" list needs re-ordering = <b>${w} writes</b>${group > 2 ? " (and the conversation-list updates can be best-effort)" : ""}. Listing my conversations needs a secondary index.`;
    }
    $("#ms-go", f).onclick = async () => {
      if (busy) return; busy = true;
      const L = $("#ms-d", svg);
      if (key === "user" && group === 2) {
        const first = order === "recipient" ? 5 : 1, second = order === "recipient" ? 1 : 5;
        draw([first]);
        await dot(L, [380, 93], [sx(first), 150], { label: order === "recipient" ? "Bob's inbox" : "Alice's sent", alive: al });
        if (failSecond) {
          await dot(L, [380, 93], [sx(second), 150], { label: "✗ fails", color: "var(--bad)", alive: al });
          const v = $("#ms-v", f);
          if (order === "recipient") { v.className = "verdict good"; v.innerHTML = "✅ <b>Recipient first:</b> Bob already has the message. The sender-side write is queued and retried until it succeeds. Worst case, Alice briefly doesn't see her own message on refresh. Acceptable."; }
          else { v.className = "verdict bad"; v.innerHTML = "❌ <b>Sender first:</b> Alice sees \"Hi\" in her chat but Bob never got it. That's the worst possible outcome for a messenger: a silent non-delivery. Always write to the recipient first."; }
        } else { await dot(L, [380, 93], [sx(second), 150], { label: order === "recipient" ? "Alice's sent" : "Bob's inbox", alive: al }); draw([first, second]); }
      } else {
        const targets = key === "user" ? [...Array(Math.min(group, N)).keys()] : [3, ...[...Array(Math.min(group, N - 1)).keys()].map((i) => (i < 3 ? i : i + 1))];
        draw(targets);
        await Promise.all(targets.map((t, i) => sleep(i * 60).then(() => dot(L, [380, 93], [sx(t), 150], { label: i === 0 && key === "conv" ? "message" : "", r: 5, alive: al }))));
      }
      busy = false;
    };
    bindSeg(f, "ms-k", (v) => { key = v; draw(); });
    bindSeg(f, "ms-o", (v) => (order = v));
    $("#ms-f", f).onchange = (e) => (failSecond = e.target.checked);
    $("#ms-g", f).oninput = (e) => { group = +e.target.value; $("#ms-g-v", f).textContent = group; draw(); };
    draw();
    return () => { alive = false; };
  };
})();

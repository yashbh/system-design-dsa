/* Blueprint — algorithm visualiser engine.
 * An algorithm is { title, code: [lines], input, inputLabel?, presets?, about?, legend?, gen(input) → frames[] }.
 * A frame is { line, note, panels: [...] } where each panel is one of:
 *   {t:"array", label, vals, hl:{i:cls}, ptr:{name:i}, win:[l,r], idx:false?}
 *   {t:"bars", vals, hl, ptr, water:[n], rect:{l,r,h,cls}}       {t:"grid", label, rows:[[..]], hl:{"r,c":cls}, rh, ch}
 *   {t:"tree", nodes:[{id,label,parent,side,cls,tag,elabel}], binary}   {t:"graph", nodes:[{id,x,y,label,cls,tag}], edges:[[a,b,w,cls]], dir}
 *   {t:"list", nodes:[{id,label,cls}], next:{id:id|null}, ptr:{name:id}}
 *   {t:"chips", label, items:[label|{v,cls}], vertical}   (labels containing "stack" draw a stack, "queue"/"deque" a queue)
 *   {t:"stack"|"queue", label, items, vertical}   {t:"bits", rows:[{label,n,cls,hlBit}], width}   {t:"vars", vars:{k:v}}
 *   {t:"intervals", items:[{s,e,label,cls}], max}   {t:"hanoi", pegs:[[name,[disks bottom→top]]], n, hl:{disk:cls}}
 *   {t:"board", n, queens:[[r,c]], hl:{"r,c":cls}, lines:[[r1,c1,r2,c2]]}   {t:"buckets", label, buckets:[[{k,v,cls}]], hl:{b:cls}}
 * Highlight classes: act, cmp, swap, done, found, bad, dim (+ take/skip for intervals, hit for chips).
 * Frames are morphed into the DOM rather than re-rendered, so values slide, disks fly and pointers glide.
 * BP.viz(el, name) mounts a player with play / step / scrub / speed / editable input / keyboard.
 */
window.BP = window.BP || {};
(function () {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  BP.ALGOS = BP.ALGOS || {};
  /* Tiny Python-ish highlighter: comments, strings, keywords, numbers, calls. Returns HTML for one line. */
  const KW = new Set("def return if elif else for while in not and or is None True False class import from lambda yield break continue pass with as try except finally raise global nonlocal del assert".split(" "));
  BP.hlCode = (line) => String(line).replace(/(#.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\b\d+(?:\.\d+)?\b)|([A-Za-z_]\w*)(?=\s*\()|([A-Za-z_]\w*)|([^#"'\w]+)/g, (m, c, st, n, f, w, o) => {
    if (c) return `<i class="tk-c">${esc(c)}</i>`; if (st) return `<i class="tk-s">${esc(st)}</i>`; if (n) return `<i class="tk-n">${n}</i>`;
    if (f) return KW.has(f) ? `<i class="tk-k">${f}</i>` : `<i class="tk-f">${f}</i>`; if (w) return KW.has(w) ? `<i class="tk-k">${w}</i>` : w; return esc(o);
  });
  BP.codeBlock = (code, lang) => `<pre class="pcode">${String(code).replace(/\s+$/, "").split("\n").map((l) => `<span>${BP.hlCode(l) || " "}</span>`).join("")}<button class="copy-btn" type="button">Copy</button></pre>`;
  const SLOT = 46;
  const PCOL = ["#2456d6", "#c03a62", "#1f7a4f", "#b45309", "#6a46c9", "#0f7c86"];
  const PFIX = { l: 0, lo: 0, i: 0, slow: 0, curr: 0, left: 0, start: 0, r: 1, hi: 1, j: 1, fast: 1, right: 1, end: 1, prev: 3, mid: 4, top: 4, k: 2, nxt: 2, next: 2, head: 2, meet: 1, tail: 5 };
  const pc = (n) => { if (PFIX[n] != null) return PCOL[PFIX[n]]; let h = 0; for (const ch of String(n)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return PCOL[h % PCOL.length]; };
  const occKeys = (vals) => { const seen = {}; return vals.map((v) => { const s = String(v); seen[s] = (seen[s] || 0) + 1; return s + "#" + seen[s]; }); };
  const sz = (v) => { const n = String(v ?? "").length; return n > 5 ? "xs" : n > 3 ? "sm" : ""; };
  const norm = (items) => (items || []).map((it) => (it !== null && typeof it === "object" ? it : { v: it }));
  const show = (v) => (v === null || v === undefined ? "" : esc(v));

  /* Pointer lane: labelled arrows that glide between slots. pos(i) returns a CSS length. */
  function ptrLane(ptr, n, pos, dir) {
    const at = {}, items = [];
    Object.entries(ptr || {}).forEach(([k, i]) => { if (i == null || i < 0 || i > n) return; const lvl = (at[i] = (at[i] || 0) + 1) - 1; items.push([k, i, lvl]); });
    if (!items.length) return "";
    const rows = Math.max(...items.map((x) => x[2])) + 1;
    return `<div class="av-ptrs ${dir || "up"}" style="height:${rows * 21 + 4}px">${items.map(([k, i, lvl]) => `<span class="av-ptr" data-k="p:${esc(k)}" style="left:${pos(i)};top:${(dir === "down" ? rows - 1 - lvl : lvl) * 21}px;--pc:${pc(k)}"><i></i><b>${esc(k)}</b></span>`).join("")}</div>`;
  }

  /* ── Panel renderers: (panel, hint) → html ── */
  const R = {};
  R.array = (p, h) => {
    const n = p.vals.length, ks = h.perm ? occKeys(p.vals) : null;
    const win = p.win && p.win[1] >= p.win[0] ? `<div class="av-win" data-k="win" style="left:${p.win[0] * SLOT - 3}px;width:${(p.win[1] - p.win[0] + 1) * SLOT + 2}px"></div>` : "";
    const cells = p.vals.map((v, i) => `<div class="av-cell ${(p.hl && p.hl[i]) || ""} ${sz(v)}"${ks ? ` data-k="${esc(ks[i])}" data-g="a${h.slot}:${esc(ks[i])}"` : ""}><b data-flash>${show(v)}</b></div>`).join("");
    const idx = p.idx === false ? "" : `<div class="av-idx">${p.vals.map((_, i) => `<small>${i}</small>`).join("")}</div>`;
    return `<div class="av-arr">${p.label ? `<span class="av-lab">${esc(p.label)}</span>` : ""}<div class="av-arr-main" style="width:${Math.max(1, n) * SLOT + 30}px"><div class="av-cells">${win}${cells}</div>${idx}${ptrLane(p.ptr, n, (i) => i * SLOT + 21 + "px")}</div></div>`;
  };
  R.bars = (p, h) => {
    const n = Math.max(1, p.vals.length), water = p.water || [], ks = h.perm ? occKeys(p.vals) : null;
    const mx = Math.max(1, ...p.vals.map((v, i) => (Math.abs(+v) || 0) + (+water[i] || 0)), p.rect ? +p.rect.h || 0 : 0);
    const rect = p.rect && p.rect.r >= p.rect.l ? `<div class="av-brect ${p.rect.cls || ""}" data-k="rect" style="left:${(p.rect.l / n) * 100}%;width:${((p.rect.r - p.rect.l + 1) / n) * 100}%;height:${(p.rect.h / mx) * 100}%"></div>` : "";
    const bars = p.vals.map((v, i) => `<div class="av-bar ${(p.hl && p.hl[i]) || ""}"${ks ? ` data-k="${esc(ks[i])}" data-g="b${h.slot}:${esc(ks[i])}"` : ""}><i class="w" style="height:${((+water[i] || 0) / mx) * 100}%"></i><i class="h" style="height:${((Math.abs(+v) || 0) / mx) * 100}%"></i><b data-flash>${show(v)}</b></div>`).join("");
    return `<div class="av-bars-wrap" style="max-width:${n * SLOT}px"><div class="av-bars">${rect}${bars}</div>${ptrLane(p.ptr, n, (i) => ((i + 0.5) / n) * 100 + "%")}</div>`;
  };
  R.grid = (p) => `<div class="av-grid-wrap">${p.label ? `<span class="av-lab">${esc(p.label)}</span>` : ""}<table class="av-grid">${p.ch ? `<tr><th></th>${p.ch.map((x) => `<th>${esc(x)}</th>`).join("")}</tr>` : ""}${p.rows.map((row, r) => `<tr>${p.rh ? `<th>${esc(p.rh[r])}</th>` : ""}${row.map((v, c) => `<td class="${(p.hl && p.hl[r + "," + c]) || ""} ${sz(v)}" data-flash>${show(v)}</td>`).join("")}</tr>`).join("")}</table></div>`;
  R.vars = (p) => `<div class="av-vars">${Object.entries(p.vars).map(([k, v]) => `<span data-k="v:${esc(k)}"><small>${esc(k)}</small><b data-flash>${show(v)}</b></span>`).join("")}</div>`;
  R.chips = (p, h) => {
    if (/stack/i.test(p.label || "")) return R.stack(p, h);
    if (/\b(queue|deque)\b/i.test(p.label || "") && !/priority|heap/i.test(p.label || "")) return R.queue(p, h);
    const it = norm(p.items), ks = occKeys(it.map((x) => x.v));
    return `<div class="av-chips ${p.vertical ? "vert" : ""}"><span class="av-lab">${esc(p.label || "")}</span><div>${it.map((x, i) => `<i class="${x.cls || ""}" data-k="${esc(ks[i])}">${esc(x.v)}</i>`).join("") || `<span class="av-empty">empty</span>`}</div></div>`;
  };
  R.stack = (p) => {
    let it = norm(p.items); if (p.vertical) it = it.slice().reverse(); // now bottom → top
    const ks = occKeys(it.map((x) => x.v));
    return `<div class="av-stackp"><div class="av-tube">${it.map((x, i) => `<div class="av-sitem ${x.cls || ""}" data-k="${esc(ks[i])}" data-g="s:${esc(ks[i])}" data-exit="up">${esc(x.v)}</div>`).join("")}</div><span class="av-lab">${esc(p.label || "stack")}${it.length ? "" : " · empty"}</span></div>`;
  };
  R.queue = (p) => {
    const it = norm(p.items), ks = occKeys(it.map((x) => x.v));
    return `<div class="av-queuep"><span class="av-lab">${esc(p.label || "queue")}</span><div class="av-pipe"><span class="av-qend">front</span><div class="av-qitems">${it.map((x, i) => `<div class="av-qitem ${x.cls || ""}" data-k="${esc(ks[i])}" data-g="q:${esc(ks[i])}" data-exit="left">${esc(x.v)}</div>`).join("") || `<span class="av-empty">empty</span>`}</div><span class="av-qend">rear</span></div></div>`;
  };
  R.bits = (p) => { const w = p.width || 8; return `<div class="av-bits">${p.rows.map((r) => `<div class="av-brow ${r.cls || ""}"><span class="av-lab">${esc(r.label)}</span>${Array.from({ length: w }, (_, k) => { const bit = (r.n >>> (w - 1 - k)) & 1; return `<i class="${bit ? "one" : ""} ${r.hlBit === w - 1 - k ? "hl" : ""}" data-flash>${bit}</i>`; }).join("")}<b>${esc(r.n)}</b></div>`).join("")}<div class="av-brow av-bpos"><span class="av-lab"></span>${Array.from({ length: w }, (_, k) => `<small>${w - 1 - k}</small>`).join("")}</div></div>`; };
  R.intervals = (p) => `<div class="av-int">${p.items.map((it) => `<div class="av-irow ${it.cls || ""}"><span>${esc(it.label)}</span><div class="t"><i style="left:${(it.s / p.max) * 100}%;width:${((it.e - it.s) / p.max) * 100}%">${it.s}–${it.e}</i></div></div>`).join("")}</div>`;
  R.hanoi = (p) => {
    const pegs = p.pegs, all = pegs.flatMap((x) => x[1]), n = p.n || Math.max(1, ...all), hl = p.hl || {}, DH = 24, H = n * DH + 70, K = pegs.length;
    let html = `<div class="av-hplate"></div>`;
    pegs.forEach(([name], k) => { const x = ((2 * k + 1) / (2 * K)) * 100; html += `<div class="av-rod" style="left:${x}%;height:${n * DH + 22}px"></div><span class="av-pegname" style="left:${x}%">${esc(name)}</span>`; });
    pegs.forEach(([, disks], k) => disks.forEach((d, lvl) => {
      const x = ((2 * k + 1) / (2 * K)) * 100, w = 9 + (n > 1 ? (d - 1) / (n - 1) : 1) * (100 / K - 13);
      html += `<div class="av-disk ${hl[d] || ""}" data-k="d${d}" data-g="d${d}" data-move="lift" style="left:${x - w / 2}%;width:${w}%;bottom:${34 + lvl * DH}px;--dc:${(d * 47 + 200) % 360}"><b>${d}</b></div>`;
    }));
    return `<div class="av-hanoi" style="height:${H}px">${html}</div>`;
  };
  R.board = (p) => {
    const n = p.n, C = 46, hl = p.hl || {}; let sq = "";
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) sq += `<div class="av-sq ${(r + c) % 2 ? "dk" : "lt"} ${hl[r + "," + c] || ""}" style="left:${c * C}px;top:${r * C}px"></div>`;
    const lines = (p.lines || []).map(([r1, c1, r2, c2]) => `<path class="av-attack av-draw" data-k="l:${r1},${c1},${r2},${c2}" d="M${c1 * C + C / 2} ${r1 * C + C / 2} L${c2 * C + C / 2} ${r2 * C + C / 2}"/>`).join("");
    const qs = (p.queens || []).map(([r, c]) => `<div class="av-queen ${(p.qcls && p.qcls[r]) || ""}" data-k="q:${r}" data-exit="up" style="left:${c * C}px;top:${r * C}px">♛</div>`).join("");
    const lab = (k) => `<small>${k}</small>`;
    return `<div class="av-boardwrap"><div class="av-rowlab">${Array.from({ length: n }, (_, r) => lab(r)).join("")}</div><div><div class="av-board" style="width:${n * C}px;height:${n * C}px">${sq}<svg class="av-board-svg" viewBox="0 0 ${n * C} ${n * C}">${lines}</svg>${qs}</div><div class="av-collab">${Array.from({ length: n }, (_, c) => lab(c)).join("")}</div></div></div>`;
  };
  R.buckets = (p) => `<div class="av-buckets">${p.label ? `<span class="av-lab">${esc(p.label)}</span>` : ""}${p.buckets.map((b, i) => `<div class="av-bucket ${(p.hl || {})[i] || ""}"><span class="av-bk">${esc((p.names || [])[i] ?? i)}</span>${b.map((it) => `<span class="av-barr">→</span><span class="av-bitem ${it.cls || ""}" data-k="${esc(it.k)}" data-g="h:${esc(it.k)}"><b data-flash>${esc(it.v)}</b></span>`).join("")}<span class="av-barr">→</span><span class="av-bnull">∅</span></div>`).join("")}</div>`;

  function treeLayout(p) {
    const nodes = p.nodes, kids = {};
    nodes.forEach((n) => { if (n.parent != null) (kids[n.parent] = kids[n.parent] || []).push(n); });
    Object.values(kids).forEach((ks) => ks.sort((a, b) => (a.side === "L" ? 0 : a.side === "R" ? 2 : 1) - (b.side === "L" ? 0 : b.side === "R" ? 2 : 1) || (a.ord || 0) - (b.ord || 0)));
    let col = 0, maxD = 0; const pos = {};
    const lay = (n, d) => {
      maxD = Math.max(maxD, d); const ks = kids[n.id] || [];
      if (p.binary !== false && ks.length && ks.every((k) => k.side)) {
        const L = ks.find((k) => k.side === "L"), Rn = ks.find((k) => k.side === "R");
        if (L) lay(L, d + 1); else if (Rn) col += 0.5;
        pos[n.id] = { x: col++, y: d };
        if (Rn) lay(Rn, d + 1); else if (L) col += 0.5;
      } else if (!ks.length) pos[n.id] = { x: col++, y: d };
      else { ks.forEach((k) => lay(k, d + 1)); pos[n.id] = { x: (pos[ks[0].id].x + pos[ks[ks.length - 1].id].x) / 2, y: d }; }
    };
    nodes.filter((n) => n.parent == null).forEach((r) => lay(r, 0));
    return { pos, cols: Math.max(1, col), maxD };
  }
  const pathD = (d) => `d="${d}" style="d:path('${d}')"`;
  R.tree = (p, h) => {
    if (!p.nodes.length) return `<div class="av-empty">empty tree</div>`;
    const L = treeLayout(p), cols = Math.max(L.cols, h.cols || 0), depth = Math.max(L.maxD, h.depth || 0);
    const sx = Math.min(70, 640 / cols), sy = 66, w = Math.max(cols * sx, 200), H = (depth + 1) * sy + 24, off = ((cols - L.cols) / 2) * sx + Math.max(0, (200 - cols * sx) / 2);
    const X = (id) => L.pos[id].x * sx + sx / 2 + off, Y = (id) => L.pos[id].y * sy + 26;
    let svg = p.nodes.filter((n) => n.parent != null && L.pos[n.parent] && L.pos[n.id]).map((n) => `<path class="av-edge ${n.ecls || ""}" data-k="e:${esc(n.id)}" ${pathD(`M${X(n.parent)} ${Y(n.parent)} L${X(n.id)} ${Y(n.id)}`)}/>${n.elabel ? `<text class="av-elab" data-k="el:${esc(n.id)}" style="transform:translate(${(X(n.parent) + X(n.id)) / 2 + 7}px,${(Y(n.parent) + Y(n.id)) / 2}px)">${esc(n.elabel)}</text>` : ""}`).join("");
    svg += p.nodes.filter((n) => L.pos[n.id]).map((n) => `<g class="av-node ${n.cls || ""}" data-k="n:${esc(n.id)}" style="transform:translate(${X(n.id)}px,${Y(n.id)}px)"><circle r="17"/><text y="4" text-anchor="middle" class="${sz(n.label)}">${esc(n.label)}</text>${n.tag != null ? `<text y="33" text-anchor="middle" class="av-tag">${esc(n.tag)}</text>` : ""}</g>`).join("");
    return `<svg class="av-tree" viewBox="0 0 ${w} ${H}" style="max-height:${Math.min(440, H + 10)}px;max-width:${w * 1.15}px">${svg}</svg>`;
  };
  R.graph = (p) => {
    const N = Object.fromEntries(p.nodes.map((n) => [n.id, n])), W = p.w || 520, H = p.h || 300;
    let svg = `<defs><marker id="av-ar" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" class="av-arhead"/></marker></defs>`;
    svg += p.edges.filter(([a, b]) => N[a] && N[b]).map(([a, b, w, cls]) => `<path class="av-edge ${cls || ""}" data-k="e:${esc(a)}-${esc(b)}" d="M${N[a].x} ${N[a].y} L${N[b].x} ${N[b].y}" ${p.dir ? 'marker-end="url(#av-ar)"' : ""}/>${w != null ? `<text x="${(N[a].x + N[b].x) / 2 + 5}" y="${(N[a].y + N[b].y) / 2 - 5}" class="av-elab" data-k="w:${esc(a)}-${esc(b)}">${esc(w)}</text>` : ""}`).join("");
    svg += p.nodes.map((n) => `<g class="av-node ${n.cls || ""}" data-k="n:${esc(n.id)}" style="transform:translate(${n.x}px,${n.y}px)"><circle r="18"/><text y="4" text-anchor="middle" class="${sz(n.label ?? n.id)}">${esc(n.label ?? n.id)}</text>${n.tag != null ? `<text y="-26" text-anchor="middle" class="av-tag">${esc(n.tag)}</text>` : ""}</g>`).join("");
    return `<svg class="av-graph" viewBox="0 0 ${W} ${H}">${svg}</svg>`;
  };
  R.list = (p) => {
    const N = p.nodes, W = 48, G = 40, S = W + G, H = 40, pos = Object.fromEntries(N.map((n, i) => [n.id, i]));
    let svg = `<defs><marker id="av-lh" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" class="av-arhead"/></marker></defs>`;
    N.forEach((n, i) => {
      const nx = p.next[n.id], x0 = i * S;
      if (nx == null) { svg += `<path class="av-nullp" data-k="a:${esc(n.id)}" d="M${x0 + W / 2} ${H} L${x0 + W / 2} ${H + 9}"/><text class="av-nullt" data-k="t:${esc(n.id)}" x="${x0 + W / 2}" y="${H + 21}" text-anchor="middle">null</text>`; return; }
      const j = pos[nx]; if (j == null) return;
      let d;
      if (j === i + 1) d = `M${x0 + W + 3} ${H / 2} L${j * S - 3} ${H / 2}`;
      else if (j === i - 1) d = `M${x0 - 3} ${H / 2} L${j * S + W + 3} ${H / 2}`;
      else { const xa = x0 + W / 2, xb = j * S + W / 2, dep = H + 20 + Math.min(36, Math.abs(j - i) * 7); d = `M${xa} ${H + 2} C${xa} ${dep} ${xb} ${dep} ${xb} ${H + 4}`; }
      svg += `<path class="av-larrow av-draw" data-k="a:${esc(n.id)}" d="${d}" marker-end="url(#av-lh)"/>`;
    });
    const ptr = {}; Object.entries(p.ptr || {}).forEach(([k, id]) => { if (id != null && pos[id] != null) ptr[k] = pos[id]; });
    const width = Math.max(1, N.length) * S - G + 4;
    return `<div class="av-list" style="width:${width}px">${ptrLane(ptr, N.length, (i) => i * S + W / 2 + "px", "down")}<div class="av-lwrap" style="height:${H + 62}px"><svg class="av-lsvg" width="${width}" height="${H + 62}">${svg}</svg>${N.map((n, i) => `<div class="av-lnode ${n.cls || ""}" data-k="n:${esc(n.id)}" style="left:${i * S}px"><b data-flash>${esc(n.label)}</b></div>`).join("")}</div></div>`;
  };
  R.text = (p) => `<div class="av-text">${p.html || ""}</div>`;

  /* ── DOM morphing (keeps elements alive between frames so CSS transitions and FLIP can animate them) ── */
  function syncAttrs(a, b) {
    let changed = false;
    for (const { name } of Array.from(a.attributes)) if (!b.hasAttribute(name)) { a.removeAttribute(name); changed = true; }
    for (const { name, value } of Array.from(b.attributes)) if (a.getAttribute(name) !== value) { a.setAttribute(name, value); if (name !== "class" && name !== "style") changed = true; }
    return changed;
  }
  function morphNode(a, b, fx) {
    if (a.nodeType === 3) { if (a.nodeValue !== b.nodeValue) { a.nodeValue = b.nodeValue; fx.text.add(a.parentNode); } return; }
    if (syncAttrs(a, b) && a.classList.contains("av-draw")) fx.draw.push(a);
    morphChildren(a, b, fx);
  }
  function morphChildren(a, b, fx) {
    const keyed = new Map();
    for (const c of a.childNodes) if (c.nodeType === 1 && c.hasAttribute("data-k")) keyed.set(c.getAttribute("data-k"), c);
    let cur = a.firstChild;
    for (const nk of Array.from(b.childNodes)) {
      if (nk.nodeType === 8) continue;
      const key = nk.nodeType === 1 ? nk.getAttribute("data-k") : null;
      let m = null;
      if (key != null) { m = keyed.get(key) || null; if (m) keyed.delete(key); }
      else { while (cur && cur.nodeType === 8) cur = cur.nextSibling; if (cur && cur.nodeType === nk.nodeType && cur.nodeName === nk.nodeName && !(cur.nodeType === 1 && cur.hasAttribute("data-k"))) m = cur; }
      if (m) { if (m === cur) cur = cur.nextSibling; else a.insertBefore(m, cur); morphNode(m, nk, fx); }
      else { a.insertBefore(nk, cur); if (nk.nodeType === 1) fx.entered.push(nk); }
    }
    while (cur) { const nx = cur.nextSibling; if (cur.nodeType === 1) fx.exited.push(cur); a.removeChild(cur); cur = nx; }
  }
  const reduced = () => window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  function paint(stage, html, dur) {
    const before = {}, sr0 = stage.getBoundingClientRect();
    if (dur > 0) stage.querySelectorAll("[data-g]").forEach((el) => { if (!(el instanceof SVGElement)) before[el.dataset.g] = el.getBoundingClientRect(); });
    const exitRects = new Map();
    if (dur > 0) stage.querySelectorAll("[data-exit]").forEach((el) => exitRects.set(el, el.getBoundingClientRect()));
    const tmp = document.createElement("div"); tmp.innerHTML = html;
    const fx = { entered: [], exited: [], text: new Set(), draw: [] };
    morphChildren(stage, tmp, fx);
    if (dur <= 0) return;
    const sr = stage.getBoundingClientRect(), moved = new Set();
    stage.querySelectorAll("[data-g]").forEach((el) => {
      const r0 = before[el.dataset.g]; if (!r0 || el instanceof SVGElement) return;
      const r1 = el.getBoundingClientRect(), dx = r0.left - r1.left + (sr.left - sr0.left), dy = r0.top - r1.top + (sr.top - sr0.top);
      moved.add(el.dataset.g);
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      if (el.dataset.move === "lift") {
        const box = el.offsetParent ? el.offsetParent.getBoundingClientRect() : sr, ly = box.top + 2 - r1.top, ly0 = Math.min(dy, ly);
        el.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: `translate(${dx}px,${ly0}px)`, offset: 0.3 }, { transform: `translate(0px,${ly}px)`, offset: 0.7 }, { transform: "none" }], { duration: dur * 1.7, easing: "ease-in-out" });
      } else el.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: "none" }], { duration: dur, easing: "cubic-bezier(.3,.7,.3,1)" });
    });
    fx.entered.forEach((el) => {
      if (el instanceof SVGElement) { if (el.classList.contains("av-draw")) fx.draw.push(el); else el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: dur }); return; }
      if (!el.hasAttribute("data-k") || (el.dataset.g && moved.has(el.dataset.g) && before[el.dataset.g])) return;
      el.animate([{ opacity: 0, transform: el.dataset.exit === "up" ? "translateY(-18px)" : el.dataset.exit === "left" ? "translateX(18px)" : "scale(.5)" }, { opacity: 1, transform: "none" }], { duration: dur, easing: "ease-out" });
    });
    fx.exited.forEach((el) => {
      const r0 = exitRects.get(el); if (!r0 || (el.dataset.g && moved.has(el.dataset.g))) return;
      el.style.cssText += `;position:absolute;left:${r0.left - sr.left + stage.scrollLeft}px;top:${r0.top - sr.top + stage.scrollTop}px;width:${r0.width}px;height:${r0.height}px;margin:0;pointer-events:none;z-index:4`;
      stage.appendChild(el);
      el.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: el.dataset.exit === "left" ? "translateX(-34px)" : "translateY(-30px)" }], { duration: dur, easing: "ease-in" }).onfinish = () => el.remove();
    });
    fx.draw.forEach((p) => { try { const L = p.getTotalLength(); p.animate([{ strokeDasharray: `${L}`, strokeDashoffset: `${L}` }, { strokeDasharray: `${L}`, strokeDashoffset: "0" }], { duration: dur * 1.3, easing: "ease-out" }); } catch (e) { /* not rendered */ } });
    fx.text.forEach((n) => { const el = n && n.closest && n.closest("[data-flash]"); if (el && !(el instanceof SVGElement)) el.animate([{ boxShadow: "0 0 0 3px var(--c)" }, { boxShadow: "0 0 0 0 transparent" }], { duration: Math.max(500, dur * 1.4), easing: "ease-out" }); });
  }

  /* ── Legend ── */
  const MEANING = { act: "current step", cmp: "compared / being read", swap: "moving / swapped", done: "processed", found: "answer / match", bad: "conflict / rejected", dim: "out of range / discarded", win: "current window", take: "chosen", skip: "skipped", hit: "lookup hit" };
  function usedClasses(frames) {
    const s = new Set();
    const walk = (o, t) => { if (!o || typeof o !== "object") return; if (Array.isArray(o)) return o.forEach((x) => walk(x, t)); for (const [k, v] of Object.entries(o)) { if ((k === "cls" || k === "ecls") && typeof v === "string") v.split(/\s+/).forEach((c) => c && s.add(c)); else if (k === "hl" && v && typeof v === "object") Object.values(v).forEach((c) => c && String(c).split(/\s+/).forEach((x) => s.add(x))); else if (k === "win" && v) s.add("win"); else if (typeof v === "object") walk(v, t); } };
    frames.forEach((f) => (f.panels || []).forEach((p) => { walk(p, p.t); if (p.t === "graph") p.edges.forEach((e) => e[3] && s.add("e:" + e[3])); if (p.t === "board") { if ((p.queens || []).length) s.add("queen"); if ((p.lines || []).length) s.add("attack"); } }));
    return s;
  }

  /* ── Player ── */
  const slotKey = (p, j) => `${j}|${p.t}|${String(p.label || "").replace(/[\d.]+/g, "")}`;
  BP.viz = (el, name) => {
    const A = BP.ALGOS[name];
    if (!A) { el.innerHTML = `<p class="muted">Unknown visualisation: ${esc(name)}</p>`; return () => {}; }
    let input = A.input, frames = [], hints = {}, i = 0, playing = false, timer = null, speed = 1, alive = true;
    el.innerHTML = `<div class="av" tabindex="0">
      <div class="av-head"><b>${esc(A.title)}</b>${location.hash.startsWith("#/dsa/viz/") ? "" : `<a class="av-full" href="#/dsa/viz/${esc(name)}" title="Open on its own page">⤢</a>`}${A.inputLabel !== null ? `<label class="av-in"><span>${esc(A.inputLabel || "Input")}</span><input type="text" value="${esc(input)}" spellcheck="false"></label><button class="btn sm av-run">Run</button>` : ""}</div>
      ${A.presets ? `<div class="av-presets"><span>Try:</span>${A.presets.map((p, k) => `<button class="chip av-pre" data-k="${k}">${esc(p[0])}</button>`).join("")}</div>` : ""}
      ${A.about ? `<p class="av-about">${A.about}</p>` : ""}
      <div class="av-note"><span class="av-badge"></span><div class="av-now"></div></div>
      <div class="av-body"><div class="av-stage"></div><div class="av-side"><pre class="av-code">${A.code.map((l, k) => `<span data-l="${k}">${BP.hlCode(l) || " "}</span>`).join("")}</pre><div class="av-legend"></div></div></div>
      <div class="av-ctl"><button class="btn sm" data-a="first" title="Restart">⏮</button><button class="btn sm" data-a="prev" title="Step back (←)">◀ Back</button><button class="btn primary sm" data-a="play">▶ Play</button><button class="btn sm" data-a="next" title="Step forward (→)">Step ▶</button><button class="btn sm" data-a="last" title="Jump to the end">⏭</button><input type="range" class="av-scrub" min="0" max="0" value="0" aria-label="Scrub through the steps"><select class="av-speed" aria-label="Speed"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option><option value="4">4×</option></select></div>
      <div class="av-hint">Press <kbd>▶ Play</kbd> to watch, or <kbd>Step ▶</kbd> through it at your own pace (keys: <kbd>Space</kbd> <kbd>←</kbd> <kbd>→</kbd>). Change the input and press <kbd>Run</kbd> to try your own.</div>
    </div>`;
    const $ = (s) => el.querySelector(s), root = $(".av"), stage = $(".av-stage"), scrub = $(".av-scrub"), codeEl = $(".av-code");
    const interval = () => 1250 / speed, dur = () => (reduced() ? 0 : Math.min(520, interval() * 0.55));
    function analyse() {
      hints = {};
      const sig = {};
      frames.forEach((f) => (f.panels || []).forEach((p, j) => {
        const k = slotKey(p, j);
        if ((p.t === "array" || p.t === "bars") && Array.isArray(p.vals)) {
          const o = p.vals.map(String), s = o.slice().sort().join("\u0001"), oj = o.join("\u0001"), e = sig[k] || (sig[k] = { s, o: oj, perm: true, moved: false });
          if (e.s !== s) e.perm = false; if (e.o !== oj) e.moved = true;
        }
        if (p.t === "tree" && p.nodes.length) { const L = treeLayout(p), h = hints[k] || (hints[k] = { cols: 0, depth: 0 }); h.cols = Math.max(h.cols, L.cols); h.depth = Math.max(h.depth, L.maxD); }
      }));
      Object.entries(sig).forEach(([k, e]) => (hints[k] = { perm: e.perm && e.moved }));
      const used = usedClasses(frames), leg = Object.entries({ ...MEANING, ...(A.legend || {}) }).filter(([c]) => used.has(c));
      if (used.has("e:tree")) leg.push(["etree", "edge used"]);
      if (used.has("queen")) leg.push(["queen", "queen placed"]);
      $(".av-legend").innerHTML = leg.length ? `<small>Colours</small>${leg.map(([c, t]) => `<span><i class="sw ${c}"></i>${esc(t)}</span>`).join("")}` : "";
    }
    function build() {
      try { frames = A.gen(A.parse ? A.parse(input) : input); }
      catch (e) { frames = [{ line: -1, note: `⚠️ ${esc(e.message)}`, panels: [] }]; }
      if (!frames.length) frames = [{ line: -1, note: "Nothing to show.", panels: [] }];
      analyse(); i = 0; scrub.max = frames.length - 1; stage.innerHTML = ""; render(0);
    }
    function render(d) {
      const f = frames[i];
      paint(stage, (f.panels || []).map((p, j) => { const k = slotKey(p, j), h = { ...(hints[k] || {}), slot: j }; return `<div class="av-panel av-p-${p.t}" data-k="P${esc(k)}">${(R[p.t] || R.text)(p, h)}</div>`; }).join(""), d);
      $(".av-now").innerHTML = f.note || "";
      $(".av-badge").textContent = i === frames.length - 1 && frames.length > 1 ? `Done · ${frames.length} steps` : `Step ${i + 1} / ${frames.length}`;
      codeEl.querySelectorAll("span").forEach((s) => s.classList.toggle("on", +s.dataset.l === f.line));
      const on = codeEl.querySelector("span.on");
      if (on) { const top = on.offsetTop - codeEl.offsetTop; if (top < codeEl.scrollTop || top > codeEl.scrollTop + codeEl.clientHeight - 24) codeEl.scrollTop = top - 30; }
      scrub.value = i;
    }
    const go = (k, animate = true) => { const nk = Math.max(0, Math.min(frames.length - 1, k)); const d = animate && Math.abs(nk - i) === 1 ? dur() : 0; i = nk; render(d); };
    const stop = () => { playing = false; clearTimeout(timer); $('[data-a="play"]').textContent = "▶ Play"; };
    const tick = () => { if (!alive || !playing) return; if (i < frames.length - 1) { go(i + 1); timer = setTimeout(tick, interval()); } else stop(); };
    const play = () => { if (playing) return stop(); if (i >= frames.length - 1) go(0, false); playing = true; $('[data-a="play"]').textContent = "⏸ Pause"; timer = setTimeout(tick, 350); };
    el.querySelectorAll("[data-a]").forEach((b) => (b.onclick = () => {
      const a = b.dataset.a;
      if (a === "play") return play();
      stop();
      if (a === "first") go(0, false); if (a === "last") go(frames.length - 1, false);
      if (a === "prev") go(i - 1); if (a === "next") go(i + 1);
    }));
    scrub.oninput = () => { stop(); go(+scrub.value, true); };
    $(".av-speed").onchange = (e) => (speed = +e.target.value);
    root.addEventListener("keydown", (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;
      if (e.key === " ") { e.preventDefault(); play(); } else if (e.key === "ArrowRight") { e.preventDefault(); stop(); go(i + 1); } else if (e.key === "ArrowLeft") { e.preventDefault(); stop(); go(i - 1); }
    });
    const inp = $(".av-in input");
    if (inp) { $(".av-run").onclick = () => { stop(); input = inp.value; build(); }; inp.onkeydown = (e) => e.key === "Enter" && $(".av-run").click(); }
    el.querySelectorAll(".av-pre").forEach((b) => (b.onclick = () => { stop(); input = A.presets[+b.dataset.k][1]; if (inp) inp.value = input; el.querySelectorAll(".av-pre").forEach((x) => x.classList.toggle("on", x === b)); build(); }));
    build();
    return () => { alive = false; clearTimeout(timer); };
  };

  /* helpers for algorithm authors */
  BP.AV = {
    nums: (s) => String(s).split(/[\s,]+/).filter(Boolean).map(Number).filter((n) => !Number.isNaN(n)),
    clone: (x) => JSON.parse(JSON.stringify(x)),
    hl: (pairs) => Object.fromEntries(pairs.filter((p) => p[0] != null && p[0] >= 0)),
    cap: (arr, n, what = "values") => { if (arr.length > n) throw new Error(`Please use at most ${n} ${what} so the animation stays readable.`); return arr; }
  };
})();

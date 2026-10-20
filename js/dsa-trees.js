/* Blueprint — DSA: trees and graphs. Content from the user's notes (Trees/tree1–5.pdf, Graphs/graph1–5.pdf) plus LeetCode practice. */
(function () {
  const { nums, clone, cap } = BP.AV;
  const A = BP.ALGOS, T = BP.DSA.topics;
  const F = (line, note, panels) => ({ line, note, panels: clone(panels) });
  const chips = (label, items, vertical) => ({ t: "chips", label, items, vertical });
  const vars = (v) => ({ t: "vars", vars: v });
  const split2 = (s) => String(s).split("|").map((x) => x.trim());
  const show = (x) => (x === Infinity ? "∞" : x);

  /* level-order string ("1 2 3 null 4") → [{id, label, parent, side}] */
  const levelTree = (s) => {
    const t = String(s).split(/[\s,]+/).filter(Boolean).map((x) => (/^(null|n|#|-)$/i.test(x) ? null : x));
    cap(t.filter((x) => x != null), 15, "nodes");
    if (!t.length || t[0] == null) throw new Error("Give at least a root value.");
    const nodes = [{ id: 0, label: t[0], parent: null, side: null }], q = [0]; let i = 1;
    while (q.length && i < t.length) { const p = q.shift(); for (const side of ["L", "R"]) { if (i < t.length && t[i] != null) { const id = nodes.length; nodes.push({ id, label: t[i], parent: p, side }); q.push(id); } i++; } }
    return nodes;
  };
  const kid = (nodes, id, side) => nodes.find((n) => n.parent === id && n.side === side);
  const bstFrom = (vals) => { const nodes = [];
    vals.forEach((x) => { if (!nodes.length) { nodes.push({ id: 0, label: x, parent: null, side: null }); return; }
      let cur = 0; for (;;) { if (x === nodes[cur].label) return; const side = x < nodes[cur].label ? "L" : "R"; const c = kid(nodes, cur, side);
        if (!c) { nodes.push({ id: nodes.length, label: x, parent: cur, side }); return; } cur = c.id; } });
    return nodes; };
  const parseWEdges = (s, max) => cap(String(s).split(/\s+/).filter(Boolean).map((e) => { const m = /^(\d+)>(\d+):(-?\d+)$/.exec(e); if (!m) throw new Error(`Write edges like 1>2:5 (got "${e}")`); return [+m[1], +m[2], +m[3]]; }), max, "edges");

  /* ═════════ NEW ANIMATIONS: TREES ═════════ */
  const LCA_T = "11 8 18 3 9 13 19 -1 12 14 25 16 50";
  A.tg_bstLCA = { title: "LCA in a BST: walk down until the two values split", inputLabel: "BST insert order | a b", input: LCA_T + " | 14 25",
    presets: [["LCA(14, 25)", LCA_T + " | 14 25"], ["LCA(12, 16)", LCA_T + " | 12 16"], ["LCA(12, 13)", LCA_T + " | 12 13"]],
    about: "One cursor walks down from the root. At each node it asks: are both values smaller (go left), both larger (go right), or do they split here? The two targets are orange, the current node blue, and the path walked so far green.",
    code: ["curr = root", "while curr:", "    if a < curr.val and b < curr.val:", "        curr = curr.left            # both smaller: go left", "    elif a > curr.val and b > curr.val:", "        curr = curr.right           # both larger: go right", "    else:", "        return curr                 # they split here (or one is curr)"],
    gen(s) { const [v0, q0] = split2(s); const nodes = bstFrom(cap(nums(v0), 15)); const [a, b] = nums(q0 || "");
      if (!nodes.length) throw new Error("Give some values to insert.");
      if (a == null || b == null) throw new Error("Add two values after |, e.g. | 14 25");
      const has = (x) => nodes.some((n) => n.label === x); if (!has(a) || !has(b)) throw new Error(`Both ${a} and ${b} must be in the tree.`);
      const path = {}, fr = [];
      const P = (cur, fin) => [{ t: "tree", nodes: nodes.map((n) => ({ ...n, cls: n.id === fin ? "found" : n.id === cur ? "act" : n.label === a || n.label === b ? "cmp" : path[n.id] ? "done" : "", tag: n.label === a ? "a" : n.label === b ? "b" : undefined })) }, { t: "vars", vars: { a, b, curr: cur == null ? nodes[fin].label : nodes[cur].label } }];
      fr.push(F(0, `Start at the root ${nodes[0].label}. We never look at a whole subtree: one comparison per level.`, P(0)));
      let cur = 0;
      for (;;) { const v = nodes[cur].label; path[cur] = 1;
        if (a < v && b < v) { fr.push(F(3, `${a} and ${b} are both smaller than ${v}: the LCA must be in the left subtree`, P(cur))); cur = kid(nodes, cur, "L").id; continue; }
        if (a > v && b > v) { fr.push(F(5, `${a} and ${b} are both larger than ${v}: the LCA must be in the right subtree`, P(cur))); cur = kid(nodes, cur, "R").id; continue; }
        fr.push(F(7, `${a === v || b === v ? `${v} is one of the targets, so it is its own ancestor` : `${Math.min(a, b)} goes left and ${Math.max(a, b)} goes right of ${v}`}: LCA(${a}, ${b}) = <b>${v}</b>. O(H) time, O(1) space.`, P(null, cur)));
        return fr; } } };

  A.tg_diameter = { title: "Diameter: heights bubble up, best path = lh + rh + 2", inputLabel: "level order (null = empty)", input: "1 2 3 4 5 null null 6 null null 7 8 null null 9",
    presets: [["Not through the root", "1 2 3 4 5 null null 6 null null 7 8 null null 9"], ["Perfect tree", "1 2 3 4 5 6 7"], ["Skewed chain", "1 2 null 3 null 4 null 5"]],
    about: "A post-order pass: each node waits for both children's heights (the h= tags), then checks the path that bends at it, lh + rh + 2. Red nodes are unbalanced (|lh − rh| > 1); the green node at the end is where the longest path bends.",
    code: ["def height(node):", "    if not node:", "        return -1                   # empty subtree", "    lh = height(node.left)", "    rh = height(node.right)", "    best = max(best, lh + rh + 2)   # longest path bending at node", "    return max(lh, rh) + 1"],
    gen(s) { const nodes = levelTree(s), fr = [], h = {}, st = {}; let best = 0, bestAt = null;
      const P = (cur) => [{ t: "tree", nodes: nodes.map((n) => ({ ...n, cls: n.id === cur ? "act" : cur == null && n.id === bestAt ? "found" : st[n.id] || "", tag: h[n.id] != null ? "h=" + h[n.id] : undefined })) }, vars({ best, "bends at": bestAt == null ? "-" : nodes[bestAt].label })];
      const go = (n) => { if (!n) return -1; st[n.id] = "cmp"; fr.push(F(3, `Enter ${n.label}: before it can answer, it asks its left child, then its right child, for their heights`, P(n.id)));
        const lh = go(kid(nodes, n.id, "L")), rh = go(kid(nodes, n.id, "R")), cand = lh + rh + 2, better = bestAt == null || cand > best;
        if (better) { best = cand; bestAt = n.id; }
        h[n.id] = Math.max(lh, rh) + 1; st[n.id] = Math.abs(lh - rh) > 1 ? "bad" : "done";
        fr.push(F(better ? 5 : 6, `${n.label}: lh = ${lh}, rh = ${rh}. Path bending here = ${lh} + ${rh} + 2 = ${cand}${better ? " → new best" : ""}. Return height ${h[n.id]}.`, P(n.id)));
        return h[n.id]; };
      go(nodes[0]);
      const unb = nodes.filter((n) => st[n.id] === "bad").map((n) => n.label);
      fr.push(F(-1, `Diameter = <b>${best}</b> edges, bending at ${nodes[bestAt].label}${bestAt === 0 ? "" : " (not the root!)"}. One post-order pass: O(N). ${unb.length ? `Red nodes (${unb.join(", ")}) have |lh − rh| > 1, so this tree is not balanced.` : "Every node has |lh − rh| ≤ 1, so the tree is balanced too."}`, P(null)));
      return fr; } };

  A.tg_views = { title: "Left and right view: first and last node of each level", inputLabel: "level order (null = empty)", input: "1 2 3 5 8 10 13 6 null null null 9 7 null 4 null null 12 11",
    about: "Level-order BFS. At the start of each round the queue holds exactly one level (orange). The first node dequeued in a round goes to the left view, the last to the right view.",
    code: ["q = deque([root])", "while q:", "    sz = len(q)                    # q holds exactly one level", "    for i in range(1, sz + 1):", "        node = q.popleft()", "        if i == 1:", "            left.append(node.val)  # first of the level", "        if i == sz:", "            right.append(node.val) # last of the level", "        if node.left:", "            q.append(node.left)", "        if node.right:", "            q.append(node.right)"],
    gen(s) { const nodes = levelTree(s), fr = [], Ls = {}, Rs = {}, Lv = [], Rv = [], seen = {}; let q = [0], level = [], d = 0;
      const P = (cur) => [{ t: "tree", nodes: nodes.map((n) => ({ ...n, cls: n.id === cur ? "act" : Ls[n.id] || Rs[n.id] ? "found" : level.includes(n.id) ? "cmp" : seen[n.id] ? "done" : "", tag: [Ls[n.id] ? "L" : "", Rs[n.id] ? "R" : ""].join(" ").trim() || undefined })) }, chips("queue", q.map((id) => nodes[id].label)), chips("left view", Lv.slice()), chips("right view", Rv.slice())];
      fr.push(F(0, "Put the root in the queue.", P(-1)));
      while (q.length) { const sz = q.length; level = q.slice(); fr.push(F(2, `Level ${d}: the queue holds exactly this level, sz = ${sz}`, P(-1)));
        for (let i = 1; i <= sz; i++) { const id = q.shift(), lab = nodes[id].label; seen[id] = 1;
          if (i === 1) { Ls[id] = 1; Lv.push(lab); } if (i === sz) { Rs[id] = 1; Rv.push(lab); }
          ["L", "R"].forEach((sd) => { const c = kid(nodes, id, sd); if (c) q.push(c.id); });
          const why = i === 1 && i === sz ? " is alone on its level: it is in both views" : i === 1 ? " is first on its level → left view" : i === sz ? " is last on its level → right view" : " is hidden from both sides";
          fr.push(F(i === 1 ? 6 : i === sz ? 8 : 4, `i = ${i} of ${sz}: ${lab}${why}. Its children join the back of the queue.`, P(id))); }
        d++; }
      level = []; fr.push(F(-1, `Left view: <b>${Lv.join(", ")}</b> · Right view: <b>${Rv.join(", ")}</b>. A deep node can show up even if it sits under the "wrong" side. O(N) time.`, P(-1)));
      return fr; } };

  /* ═════════ NEW ANIMATIONS: GRAPHS ═════════ */
  A.tg_multiBFS = { title: "Multi-source BFS: all sources start in the queue together", inputLabel: "rows split by |  (H or 2 = source, R or 1 = open, # or 0 = blocked)", input: "RRRH | RRHH | RHHR",
    presets: [["Nearest hospital", "RRRH | RRHH | RHHR"], ["Rotting oranges", "211 | 110 | 011"], ["An orange never rots", "211 | 011 | 101"]],
    about: "Every source (green) starts in the queue at distance 0. Each frame expands one whole layer (blue): the numbers are steps to the nearest source, · is not reached yet, # is blocked.",
    code: ["q = deque()", "for i, j in all_cells:", "    if is_source(i, j):", "        dist[i][j] = 0              # every source starts at 0", "        q.append((i, j))", "while q:", "    i, j = q.popleft()", "    for a, b in neighbours4(i, j):", "        if is_open(a, b) and dist[a][b] is None:", "            dist[a][b] = dist[i][j] + 1   # first visit = nearest", "            q.append((a, b))", "ans = max_dist(dist) if all_reached(dist) else -1"],
    gen(s) { const g = String(s).split("|").map((r) => [...r.replace(/\s+/g, "")]).filter((r) => r.length); cap(g, 7, "rows"); g.forEach((r) => cap(r, 9, "columns"));
      if (!g.length) throw new Error("Give a grid."); const R = g.length, C = g[0].length; if (g.some((r) => r.length !== C)) throw new Error("All rows need the same length.");
      const K = g.map((r) => r.map((ch) => { if (/[H2]/i.test(ch)) return "S"; if (/[R1.]/i.test(ch)) return "O"; if (/[#0X]/i.test(ch)) return "B"; throw new Error(`Unknown cell "${ch}". Use H/2, R/1 or #/0.`); }));
      const dist = K.map((r) => r.map((k) => (k === "S" ? 0 : null))); let q = [];
      K.forEach((r, i) => r.forEach((k, j) => { if (k === "S") q.push([i, j]); }));
      const P = (layer) => { const hl = {}; K.forEach((r, i) => r.forEach((k, j) => { const key = i + "," + j; hl[key] = k === "B" ? "dim" : k === "S" ? "found" : dist[i][j] != null ? "done" : ""; }));
        (layer || []).forEach(([i, j]) => (hl[i + "," + j] = "act"));
        return { t: "grid", rows: K.map((r, i) => r.map((k, j) => (k === "B" ? "#" : dist[i][j] == null ? "·" : dist[i][j]))), hl }; };
      const fr = [];
      if (!q.length) { fr.push(F(11, "There is no source, so nothing is ever reached: answer −1.", [P()])); return fr; }
      fr.push(F(4, `${q.length} sources enter the queue together at distance 0. Think of one "super source" joined to all of them.`, [P(q), chips("queue", q.map(([i, j]) => `(${i},${j})`))]));
      let d = 0;
      while (q.length) { const nxt = [];
        for (const [i, j] of q) for (const [di, dj] of [[-1, 0], [0, -1], [1, 0], [0, 1]]) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= R || b >= C || K[a][b] !== "O" || dist[a][b] != null) continue; dist[a][b] = d + 1; nxt.push([a, b]); }
        if (!nxt.length) break; d++;
        fr.push(F(9, `Layer ${d}: ${nxt.length} cell(s) reached for the first time. The first visit is the shortest, so their nearest source is ${d} step(s) away.`, [P(nxt), chips("queue (next layer)", nxt.map(([i, j]) => `(${i},${j})`))]));
        q = nxt; }
      const left = K.some((r, i) => r.some((k, j) => k === "O" && dist[i][j] == null));
      fr.push(F(11, left ? "Some open cells (·) were never reached, so the rotting-oranges answer is <b>−1</b>." : `Done. Largest distance = <b>${d}</b> (for rotting oranges, the minutes). Each cell entered the queue once: O(R·C).`, [P()]));
      return fr; } };

  const BIP = { 0: [80, 150], 1: [190, 60], 2: [300, 150], 3: [190, 240], 4: [320, 255], 5: [440, 190], 6: [450, 275], 7: [440, 60] };
  A.tg_bipartite = { title: "Bipartite check: 2-colour with DFS", inputLabel: "undirected edges among nodes 0–7, like 0-1", input: "0-1 0-3 2-1 2-3 4-3 4-5 4-6",
    presets: [["Bipartite (notes)", "0-1 0-3 2-1 2-3 4-3 4-5 4-6"], ["Odd cycle", "0-1 0-3 2-1 2-3 4-3 4-5 4-6 1-3"], ["Two components", "0-1 1-2 5-6 6-7 5-7"]],
    about: "DFS gives every newly reached node the opposite colour of the node it came from (blue = A, pink = B). Thick edges already cross between the two sets; two red nodes joined by an edge share a colour, which proves an odd cycle.",
    code: ["col = [-1] * N", "def dfs(u):", "    for v in graph[u]:", "        if col[v] == col[u]:", "            return False            # same colour on an edge", "        if col[v] == -1:", "            col[v] = 1 - col[u]     # opposite colour", "            if not dfs(v):", "                return False", "    return True", "for i in range(N):", "    if col[i] == -1:", "        col[i] = 0                  # new component starts as A", "        if not dfs(i):", "            return False", "return True"],
    gen(s) { const es = cap(String(s).split(/\s+/).filter(Boolean).map((e) => e.split("-").map(Number)), 12, "edges");
      es.forEach(([a, b]) => { if (!(a in BIP) || !(b in BIP) || a === b) throw new Error("Use edges between different nodes 0–7, like 0-1"); });
      const ids = [...new Set(es.flat())].sort((x, y) => x - y), adj = {}, col = {}, fr = []; let bad = null;
      ids.forEach((i) => { adj[i] = []; col[i] = -1; }); es.forEach(([a, b]) => { adj[a].push(b); adj[b].push(a); }); Object.values(adj).forEach((l) => l.sort((x, y) => x - y));
      const P = () => [{ t: "graph", nodes: ids.map((i) => ({ id: i, x: BIP[i][0], y: BIP[i][1], label: String(i), cls: bad && bad.includes(i) ? "bad" : col[i] === 0 ? "act" : col[i] === 1 ? "swap" : "", tag: col[i] === -1 ? undefined : col[i] ? "B" : "A" })), edges: es.map(([a, b]) => [a, b, null, col[a] !== -1 && col[b] !== -1 && col[a] !== col[b] ? "tree" : ""]) },
        chips("set A (col 0)", ids.filter((i) => col[i] === 0)), chips("set B (col 1)", ids.filter((i) => col[i] === 1))];
      const dfs = (u) => { for (const v of adj[u]) {
          if (col[v] === col[u]) { bad = [u, v]; fr.push(F(4, `Edge ${u}–${v} joins two nodes of colour ${col[u] ? "B" : "A"}: there is an odd cycle, so <b>not bipartite</b>`, P())); return false; }
          if (col[v] === -1) { col[v] = 1 - col[u]; fr.push(F(6, `${v} is uncoloured: give it the opposite of ${u}, colour ${col[v] ? "B" : "A"}`, P())); if (!dfs(v)) return false; } }
        return true; };
      fr.push(F(0, "Every node starts uncoloured (col = −1). We will try to 2-colour it so that every edge joins an A node to a B node.", P()));
      for (const i of ids) if (col[i] === -1) { col[i] = 0; fr.push(F(12, `${i} is uncoloured: start a new component and colour it A`, P())); if (!dfs(i)) break; }
      if (!bad) fr.push(F(15, `Every edge crosses from A to B. <b>Bipartite</b>. O(V + E). Chromatic number is 2.`, P()));
      return fr; } };

  A.tg_kruskal = { title: "Kruskal's MST: sorted edges + DSU cycle check", inputLabel: null, input: "",
    about: "Edges are tried cheapest first (the list on the right). Thick edges are taken, faded ones skipped because both ends already share a DSU root (the set tag on each node). It stops after N − 1 edges.",
    code: ["edges = drop_self_loops_and_heavier_copies(edges)", "edges.sort(key=lambda e: e[2])", "for u, v, w in edges:", "    if find(u) == find(v):", "        continue                # already connected: would close a cycle", "    union(u, v)", "    total += w", "    used += 1", "    if used == N - 1:", "        break                   # the tree is complete"],
    gen() { const pos = { 1: [60, 150], 2: [190, 60], 3: [330, 60], 4: [190, 240], 5: [330, 240], 6: [460, 150] };
      const E = [[1, 2, 7], [1, 4, 8], [2, 3, 6], [2, 4, 3], [3, 4, 4], [3, 5, 2], [3, 6, 5], [4, 5, 3], [5, 6, 5]];
      const sorted = E.map((e, i) => [e, i]).sort((x, y) => x[0][2] - y[0][2] || x[1] - y[1]).map((x) => x[0]);
      const par = {}; Object.keys(pos).forEach((k) => (par[k] = +k)); const find = (x) => (par[x] === x ? x : (par[x] = find(par[x])));
      const st = {}, fr = [], key = (e) => e[0] + "-" + e[1]; let total = 0, used = 0;
      const lab = (e) => `${e[0]}-${e[1]} (${e[2]})`;
      const P = (cur) => [{ t: "graph", nodes: Object.entries(pos).map(([id, [x, y]]) => ({ id: +id, x, y, label: id, cls: cur && (cur[0] === +id || cur[1] === +id) ? "act" : "", tag: "set " + find(+id) })), edges: E.map((e) => [e[0], e[1], e[2], st[key(e)] === "take" ? "tree" : st[key(e)] === "skip" ? "dim" : ""]) },
        chips("sorted edges", sorted.map((e) => (st[key(e)] === "take" ? { v: lab(e), cls: "hit" } : st[key(e)] === "skip" ? "✗ " + lab(e) : e === cur ? "→ " + lab(e) : lab(e)))), vars({ total, "edges used": used + " / 5" })];
      fr.push(F(0, "The notes' graph also has a self-loop on 6 and a second 2–3 edge of weight 8. Drop both: a self-loop is never in a tree, and the heavier copy of a multi-edge never wins.", P()));
      fr.push(F(1, "Sort the 9 remaining edges by weight. Each node starts as its own set (the tag shows its DSU root).", P()));
      for (const e of sorted) { const [u, v, w] = e;
        if (find(u) === find(v)) { st[key(e)] = "skip"; fr.push(F(4, `${lab(e)}: ${u} and ${v} already share root ${find(u)}. Taking it would close a cycle, so skip.`, P(e))); continue; }
        par[find(u)] = find(v); st[key(e)] = "take"; total += w; used++;
        fr.push(F(6, `${lab(e)}: different sets, take it and union them. Total = ${total}.`, P(e)));
        if (used === 5) { fr.push(F(9, `${used} = N − 1 edges: the tree is complete, stop early.`, P())); break; } }
      fr.push(F(-1, `MST weight = <b>${total}</b> (2 + 3 + 3 + 5 + 7). O(E log E) for the sort + near O(1) per DSU call.`, P()));
      return fr; } };

  A.tg_prim = { title: "Prim's MST: grow one tree with a min-heap (start not pre-marked)", inputLabel: null, input: "",
    about: "One tree (green nodes) grows from node 0. The min-heap holds candidate edges as (weight, node); each pop adds the cheapest edge leaving the tree, and entries for nodes already in the tree are stale and skipped.",
    code: ["pq = [(0, start)]             # do NOT mark start visited here", "while pq:", "    w, v = heappop(pq)", "    if visited[v]:", "        continue              # stale: v already joined more cheaply", "    visited[v] = True", "    total += w", "    for nbr, wt in graph[v]:", "        if not visited[nbr]:", "            heappush(pq, (wt, nbr))"],
    gen() { const pos = { 0: [60, 150], 1: [190, 60], 2: [330, 60], 3: [190, 240], 4: [330, 240], 5: [460, 150] };
      const E = [[0, 1, 7], [0, 3, 8], [1, 2, 6], [1, 3, 3], [2, 3, 4], [2, 4, 2], [2, 5, 5], [4, 5, 5], [3, 4, 3]];
      const adj = {}; Object.keys(pos).forEach((k) => (adj[k] = [])); E.forEach(([a, b, w]) => { adj[a].push([b, w]); adj[b].push([a, w]); }); Object.values(adj).forEach((l) => l.sort((x, y) => x[0] - y[0]));
      const vis = {}, tree = {}, fr = []; let pq = [[0, 0, null, 0]], total = 0, seq = 1;
      const ek = (a, b) => Math.min(a, b) + "-" + Math.max(a, b);
      const P = (cur) => [{ t: "graph", nodes: Object.entries(pos).map(([id, [x, y]]) => ({ id: +id, x, y, label: id, cls: +id === cur ? "act" : vis[id] ? "done" : "" })), edges: E.map(([a, b, w]) => [a, b, w, tree[ek(a, b)] ? "tree" : vis[a] && vis[b] ? "dim" : ""]) },
        chips("min-heap (w, node)", pq.slice().sort((x, y) => x[0] - y[0] || x[3] - y[3]).map(([w, v]) => `(${w}, ${v})`)), vars({ total })];
      fr.push(F(0, "Push (0, 0). The notes' code also set visited[0] = true before the loop; then the very first pop is skipped and nothing is added. Mark only when popping.", P(-1)));
      while (pq.length) { pq.sort((x, y) => x[0] - y[0] || x[3] - y[3]); const [w, v, from] = pq.shift();
        if (vis[v]) { fr.push(F(4, `Pop (${w}, ${v}): ${v} is already in the tree, so this entry is stale. Skip.`, P(-1))); continue; }
        vis[v] = 1; total += w; if (from != null) tree[ek(from, v)] = 1;
        fr.push(F(6, from == null ? `Pop (0, ${v}): ${v} starts the tree.` : `Pop (${w}, ${v}): the cheapest edge out of the tree is ${from}–${v}. Add it, total = ${total}.`, P(v)));
        const pushed = []; adj[v].forEach(([nb, wt]) => { if (!vis[nb]) { pq.push([wt, nb, v, seq++]); pushed.push(`(${wt}, ${nb})`); } });
        if (pushed.length) fr.push(F(9, `Push edges to unvisited neighbours: ${pushed.join(", ")}`, P(v))); }
      fr.push(F(-1, `MST weight = <b>${total}</b> (0 + 7 + 3 + 3 + 2 + 5). O(E log E) with an adjacency list. The 1–2 multi-edge of weight 8 from the notes is left out of the drawing: it would be stale too.`, P(-1)));
      return fr; } };

  const BF1 = "5>6:-3 4>5:2 1>4:10 3>4:-8 2>3:-6 1>2:11 | 1";
  A.tg_bellman = { title: "Bellman-Ford: relax every edge, N − 1 rounds", inputLabel: "directed edges u>v:w | source", input: BF1,
    presets: [["Notes example", BF1], ["Negative cycle", "1>2:3 2>3:2 3>5:-6 5>4:3 4>2:-1 5>6:5 | 1"], ["Early stop", "1>2:4 1>3:1 3>2:2 2>4:1 | 1"]],
    about: "Rows are edges, columns are rounds. Each frame relaxes one edge; ✓ marks an edge that lowered a distance in that round, · means no change. The last column is the extra round that detects a negative cycle (!).",
    code: ["dist = [INF] * N", "dist[src] = 0", "for _ in range(N - 1):", "    changed = False", "    for u, v, w in edges:", "        if dist[u] != INF and dist[u] + w < dist[v]:", "            dist[v] = dist[u] + w", "            changed = True", "    if not changed:", "        break                       # a quiet round: stop early", "for u, v, w in edges:               # one extra round", "    if dist[u] != INF and dist[u] + w < dist[v]:", "        return 'negative cycle'", "return dist"],
    gen(s) { const [e0, s0] = split2(s); const es = parseWEdges(e0, 8); const ids = [...new Set(es.flatMap((e) => [e[0], e[1]]))].sort((x, y) => x - y); cap(ids, 7, "nodes");
      const src = s0 ? nums(s0)[0] : ids[0]; if (!ids.includes(src)) throw new Error("The source must be one of the nodes.");
      const dist = {}; ids.forEach((i) => (dist[i] = Infinity)); dist[src] = 0; const rounds = ids.length - 1;
      const cells = es.map(() => Array(rounds + 1).fill("")), fr = [];
      const P = (r, e, hl = {}) => [{ t: "grid", label: "✓ = this edge improved dist in that round", rows: cells, rh: es.map(([u, v, w]) => `${u}→${v} (${w})`), ch: [...Array(rounds).keys()].map((k) => "R" + (k + 1)).concat("check"), hl: { ...hl, ...(e != null ? { [e + "," + r]: hl[e + "," + r] || "act" } : {}) } }, vars(Object.fromEntries(ids.map((i) => ["d" + i, show(dist[i])])))];
      const done = {};
      fr.push(F(1, `dist[${src}] = 0, every other node ∞. ${ids.length} nodes → ${rounds} rounds. Edge order does not matter for correctness.`, P(null, null)));
      for (let r = 0; r < rounds; r++) { let changed = false;
        es.forEach(([u, v, w], e) => {
          if (dist[u] === Infinity) { cells[e][r] = "·"; fr.push(F(5, `R${r + 1}, ${u}→${v}: dist[${u}] is still ∞, nothing to relax`, P(r, e, done))); return; }
          if (dist[u] + w < dist[v]) { const old = dist[v]; dist[v] = dist[u] + w; changed = true; cells[e][r] = "✓"; done[e + "," + r] = "found"; fr.push(F(6, `R${r + 1}, ${u}→${v}: ${dist[u]} + (${w}) = ${dist[v]} < ${show(old)} → update d${v}`, P(r, e, done))); }
          else { cells[e][r] = "·"; fr.push(F(5, `R${r + 1}, ${u}→${v}: ${dist[u]} + (${w}) = ${dist[u] + w} is not better than ${dist[v]}`, P(r, e, done))); } });
        if (!changed) { fr.push(F(9, `Round ${r + 1} changed nothing, so later rounds can't either. Stop early.`, P(null, null, done))); break; } }
      const neg = []; es.forEach(([u, v, w], e) => { if (dist[u] !== Infinity && dist[u] + w < dist[v]) { neg.push(`${u}→${v}`); cells[e][rounds] = "!"; done[e + "," + rounds] = "bad"; } else cells[e][rounds] = "ok"; });
      fr.push(F(neg.length ? 12 : 13, neg.length ? `The extra round still improves ${neg.join(", ")}: a shortest path would need ≥ N edges, so a vertex repeats. <b>Negative cycle</b>, distances are undefined.` : `Extra round: nothing improves, so there is no negative cycle. Final: ${ids.map((i) => `d${i} = ${show(dist[i])}`).join(", ")}. O(V·E).`, P(null, null, done)));
      return fr; } };

  const FW1 = "0>1:9 1>0:6 0>2:-4 2>1:5 1>3:2 3>2:1";
  A.tg_floyd = { title: "Floyd-Warshall: allow one more intermediate node k each pass", inputLabel: "directed edges u>v:w (nodes 0–5)", input: FW1,
    about: "The matrix holds the best known distance from row i to column j. In pass k, row k and column k (shaded) are the 'via k' pieces: a cell turns green when i → k → j beats its current value.",
    code: ["d = initial_matrix(edges)        # 0 on the diagonal, INF if no edge", "for k in range(N):               # k MUST be the outer loop", "    for i in range(N):", "        for j in range(N):", "            if d[i][k] + d[k][j] < d[i][j]:", "                d[i][j] = d[i][k] + d[k][j]", "has_neg_cycle = any(d[i][i] < 0 for i in range(N))"],
    gen(s) { const es = parseWEdges(s, 12); const n = Math.max(...es.flatMap((e) => [e[0], e[1]])) + 1; if (n > 6) throw new Error("Use nodes 0–5.");
      const d = [...Array(n)].map((_, i) => [...Array(n)].map((_, j) => (i === j ? 0 : Infinity))); es.forEach(([u, v, w]) => { if (u !== v) d[u][v] = Math.min(d[u][v], w); });
      const fr = [], lab = [...Array(n).keys()];
      const P = (k, hl = {}) => { const base = {}; if (k != null) for (let x = 0; x < n; x++) { base[k + "," + x] = "done"; base[x + "," + k] = "done"; } return [{ t: "grid", label: k == null ? "d[i][j]" : `k = ${k}: row ${k} and column ${k} are the "via k" values`, rows: d.map((r) => r.map(show)), rh: lab, ch: lab, hl: { ...base, ...hl } }]; };
      fr.push(F(0, "Start with direct edges only. No intermediate node is allowed yet.", P(null)));
      for (let k = 0; k < n; k++) { let any = false; fr.push(F(1, `Now paths may also pass through node ${k}.`, P(k)));
        for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { if (d[i][k] === Infinity || d[k][j] === Infinity) continue;
          if (d[i][k] + d[k][j] < d[i][j]) { const old = d[i][j]; d[i][j] = d[i][k] + d[k][j]; any = true;
            fr.push(F(5, `d[${i}][${j}]: ${i}→${k}→${j} = ${d[i][k]} + ${d[k][j]} = ${d[i][j]} beats ${show(old)}`, P(k, { [i + "," + k]: "cmp", [k + "," + j]: "cmp", [i + "," + j]: "found" }))); } }
        if (!any) fr.push(F(4, `k = ${k}: no pair i, j gets shorter by going through ${k}, so the matrix is unchanged.`, P(k))); }
      const neg = lab.filter((i) => d[i][i] < 0);
      fr.push(F(6, neg.length ? `d[i][i] < 0 for ${neg.join(", ")}: negative cycle.` : "Final all-pairs distances. O(N³) time, O(1) extra space (in place). Negative edges are fine; negative cycles are not.", P(null, Object.fromEntries(neg.map((i) => [i + "," + i, "bad"])))));
      return fr; } };

  /* ═════════════════════════ TOPIC: TREES ═════════════════════════ */
  T["trees"] = {
    name: "Trees and BSTs", icon: "🌳", color: "#1f7a4f", minutes: 90,
    notes: "tree1.pdf – tree5.pdf",
    summary: "Hierarchical data where every node has one parent: most answers come from asking the left and right subtrees and combining.",
    sections: [
      { h: "Why trees, and the words you need", blocks: [
        ["analogy", "A company org chart: CEO at the top, then CTO / COO / CMO / CFO, then managers, team leads, developers. Or your file system: This PC → Documents / Movies → School / College… Each item has exactly <b>one</b> boss (parent), but a boss can have many reports."],
        ["p", "A <b>tree</b> stores hierarchical data. The <b>root</b> is the only node without a parent; every other node has exactly one parent, so a tree with N nodes has <b>N − 1 edges</b> and no cycles."],
        ["table", ["Term", "Meaning"], [
          ["Parent / child", "edge x → y: x is the parent, y the child"],
          ["Leaf", "a node with 0 children"],
          ["Siblings", "nodes with the same parent"],
          ["Ancestors / descendants", "nodes on the path up to the root / everything reachable going down"],
          ["Level / depth", "edges from the root (root is level 0)"],
          ["Height of a node", "max edges from the node down to a leaf. Height of the tree = height of the root"],
          ["Subtree", "a node plus all its descendants (a leaf, and the whole tree, are subtrees too)"]]],
        ["tip", "Convention in these notes: height is counted in <b>edges</b>, so <code>height(null) = -1</code> and a leaf has height 0. Complexities use N (nodes) and H (height). H = O(log N) when balanced, O(N) when skewed."],
        ["p", "A <b>binary tree</b> has at most 2 children per node, called left and right. Each node is an object <code>left | val | right</code> holding references. The left and right subtrees are binary trees themselves, which is why recursion fits so well."],
        ["table", ["Type", "Rule", "Example check"], [
          ["Full / proper", "every node has 0 or 2 children", "no node with a single child"],
          ["Complete (CBT)", "all levels full except maybe the last, which fills from the <b>left</b> with no gaps", "heaps are stored this way"],
          ["Perfect", "every level completely full", "2<sup>h+1</sup> − 1 nodes"],
          ["Balanced", "for <b>every</b> node, |height(left) − height(right)| ≤ 1", "keeps H = O(log N)"]]]
      ] },
      { h: "Traversals: recursive, iterative, Morris", blocks: [
        ["p", "Depth-first traversals differ only in <b>when</b> you visit the node relative to its subtrees. Notes tree: 1 → (2, 3), 2 → (4, 5), 5 → (7, −), 3 → (−, 6), 6 → (8, 9)."],
        ["table", ["Order", "Rule", "Output on the notes tree"], [
          ["Pre-order", "N L R (root first)", "1 2 4 5 7 3 6 8 9"],
          ["In-order", "L N R", "4 2 7 5 1 3 8 6 9"],
          ["Post-order", "L R N (root last)", "4 7 5 2 8 9 6 3 1"]]],
        ["viz", "preorder", "Pre-order: emit the node the moment you arrive."],
        ["viz", "inorder", "In-order: emit after the whole left subtree. On a BST this is sorted order."],
        ["viz", "postorder", "Post-order: emit after both children. This is the shape of every 'answer from children' problem."],
        ["tip", "All three are O(N) time and O(H) space for the recursion stack. A handy picture: walk around the tree's outline. Pre-order emits when you pass a node's left side, in-order when you pass under it, post-order when you pass its right side."],
        ["probs", [
          { t: "Iterative in-order traversal", d: "Easy", q: "Produce the in-order sequence without recursion.",
            ex: "Tree 1→(2,3), 2→(4,5), 5→(7,-), 3→(-,6), 6→(8,9), 8→(10,-)\nAnswer: 4 2 7 5 1 3 10 8 6 9",
            ap: [
              { n: "Brute force", cx: "O(N) time · O(H) space",
                idea: "Plain recursion: left, node, right. It is correct, but it leans on the <b>call stack</b>, which interviewers sometimes forbid, and a skewed tree of 1e5 nodes can overflow it.",
                code: "def inorder(root):\n    ans = []\n\n    def walk(node):\n        if not node:\n            return\n        walk(node.left)\n        ans.append(node.val)\n        walk(node.right)\n\n    walk(root)\n    return ans" },
              { n: "Optimal", cx: "O(N) time · O(H) space",
                idea: "Copy what the call stack does. <b>Keep going left, pushing every node.</b> When you can't go left, pop a node, visit it, then move to its right child. Loop while <b>the stack is non-empty OR curr is not null</b>. (Morris, below, gets this to O(1) space.)",
                code: "def inorder(root):\n    ans = []\n    st = []\n    curr = root\n    while st or curr:\n        # go as far left as possible, remembering the path\n        while curr:\n            st.append(curr)\n            curr = curr.left\n        curr = st.pop()\n        ans.append(curr.val)\n        curr = curr.right\n    return ans" }
            ],
            edge: "empty tree (loop never runs), left-skewed tree (stack holds N nodes)", lc: "binary-tree-inorder-traversal" },
          { t: "Iterative pre-order traversal", d: "Easy", q: "Pre-order (N L R) with an explicit stack.",
            ex: "Notes tree → 1 2 4 5 7 3 6 8 9",
            ap: [
              { n: "Brute force", cx: "O(N) time · O(H) space",
                idea: "Recursion: visit the node, then recurse left, then right. Short, but uses the call stack.",
                code: "def preorder(root):\n    ans = []\n\n    def walk(node):\n        if not node:\n            return\n        ans.append(node.val)\n        walk(node.left)\n        walk(node.right)\n\n    walk(root)\n    return ans" },
              { n: "Optimal", cx: "O(N) time · O(H) space",
                idea: "Pop a node, visit it, then push <b>right first, then left</b>, so left is popped first.",
                code: "def preorder(root):\n    if not root:\n        return []\n    ans = []\n    st = [root]\n    while st:\n        node = st.pop()\n        ans.append(node.val)\n        # push right first so left is popped first\n        if node.right:\n            st.append(node.right)\n        if node.left:\n            st.append(node.left)\n    return ans" }
            ],
            lc: "binary-tree-preorder-traversal" },
          { t: "Iterative post-order traversal", d: "Easy", q: "Post-order (L R N) without recursion.",
            ex: "10→(20,30), 20→(40,50), 50→(60,90), 90→(-,100), 30→(-,70), 70→(80,-)\nAnswer: 40 60 100 90 50 20 80 70 30 10",
            ap: [
              { n: "Brute force", cx: "O(N) time · O(N) space",
                idea: "Do a 'node, right, left' pre-order and <b>reverse</b> it: N R L reversed is L R N. Easy, but it stores the whole output before it can give the first value.",
                code: "def postorder(root):\n    if not root:\n        return []\n    out = []\n    st = [root]\n    while st:\n        node = st.pop()\n        out.append(node.val)       # N R L order\n        if node.left:\n            st.append(node.left)\n        if node.right:\n            st.append(node.right)\n    return out[::-1]               # reversed: L R N" },
              { n: "Optimal", cx: "O(N) time · O(H) space",
                idea: "One stack. Go left pushing nodes. Look at the top of the stack: if it has a right child you <b>haven't just come back from</b> (<code>last is not peek.right</code>), go into it. Otherwise visit the top and pop it into <code>last</code>. The <code>last</code> pointer tells you the right subtree is finished.",
                code: "def postorder(root):\n    ans = []\n    st = []\n    curr = root\n    last = None\n    while curr or st:\n        if curr:\n            st.append(curr)\n            curr = curr.left\n        else:\n            peek = st[-1]\n            if peek.right and last is not peek.right:\n                curr = peek.right      # right subtree not done yet\n            else:\n                ans.append(peek.val)\n                last = st.pop()\n    return ans" }
            ],
            lc: "binary-tree-postorder-traversal" },
          { t: "Morris in-order traversal (O(1) space)", d: "Medium", q: "In-order with no recursion and no stack.",
            ex: "6→(-,8), 8→(-,29), 29→(20,32), 20→(47,13), 47→(9,17) …\nAnswer: 6 8 9 10 47 17 100 19 20 13 25 29 30 32 35\nTemporary threads used: 10→47, 19→20, 100→19, 25→29, 30→32",
            ap: [
              { n: "Brute force", cx: "O(N) time · O(H) space",
                idea: "The stack-based in-order: correct, but the stack holds up to H nodes (N on a skewed tree).",
                code: "def inorder(root):\n    ans = []\n    st = []\n    curr = root\n    while st or curr:\n        while curr:\n            st.append(curr)\n            curr = curr.left\n        curr = st.pop()\n        ans.append(curr.val)\n        curr = curr.right\n    return ans" },
              { n: "Optimal", cx: "O(N) time (each edge walked about 3 times) · O(1) space",
                idea: "The <b>in-order predecessor</b> of curr is the rightmost node of curr.left, and its right pointer is null. Borrow it: point it back at curr (a <b>thread</b>) so you can climb back up later.<br>• No left child: visit curr, go right.<br>• Predecessor's right is null (first visit): set the thread, go left.<br>• Predecessor's right is curr (second visit): remove the thread, visit curr, go right.",
                code: "def morris_inorder(root):\n    ans = []\n    curr = root\n    while curr:\n        if not curr.left:\n            ans.append(curr.val)\n            curr = curr.right\n        else:\n            pred = curr.left\n            while pred.right and pred.right is not curr:\n                pred = pred.right\n            if not pred.right:\n                pred.right = curr      # make thread, then go left\n                curr = curr.left\n            else:\n                pred.right = None      # second visit: remove thread\n                ans.append(curr.val)\n                curr = curr.right\n    return ans" }
            ],
            edge: "the predecessor search must stop at <code>right != curr</code>, or it loops through the thread forever. Exiting early (e.g. kth smallest) leaves the tree modified." }
        ]]
      ] },
      { h: "Level order and the views of a tree", blocks: [
        ["p", "Breadth-first order uses a FIFO queue. The trick for printing <b>level by level</b>: at the start of each round the queue holds exactly one full level. Read <code>sz = len(q)</code> and dequeue exactly sz nodes."],
        ["viz", "levelorder", "Level order: nodes leave the queue in the order they joined."],
        ["viz", "tg_views", "Views fall out of the same loop: the first node of each level (i == 1) is the left view, the last (i == sz) is the right view. Note 11 shows in the right view even though it sits under the left part of 3's subtree."],
        ["probs", [
          { t: "Level order, one line per level", d: "Medium", q: "Print the nodes level by level, left to right.",
            ex: "1→(2,3), 2→(4,11), 3→(-,19), 4→(7,-), 11→(-,25), 19→(-3,45)\nAnswer:\n1\n2 3\n4 11 19\n7 25 -3 45",
            ap: [
              { n: "Brute force", cx: "O(N·H) time · O(H) space",
                idea: "Find the height, then for each depth d walk the tree again and collect the nodes at depth d. Correct, but every level re-walks the top of the tree: <b>O(N²) on a skewed tree</b>.",
                code: "def level_order(root):\n    def height(node):\n        if not node:\n            return 0\n        return 1 + max(height(node.left), height(node.right))\n\n    def collect(node, d, out):\n        if not node:\n            return\n        if d == 0:\n            out.append(node.val)\n            return\n        collect(node.left, d - 1, out)\n        collect(node.right, d - 1, out)\n\n    levels = []\n    for d in range(height(root)):\n        row = []\n        collect(root, d, row)\n        levels.append(row)\n    return levels" },
              { n: "Optimal", cx: "O(N) time · O(N) space (widest level ≈ N/2)",
                idea: "BFS with the <b>sz = len(q)</b> snapshot. At the start of each round the queue holds exactly one level; the sz nodes you dequeue are that level and their children form the next.",
                code: "from collections import deque\n\ndef level_order(root):\n    if not root:\n        return []\n    levels = []\n    q = deque([root])\n    while q:\n        level = []\n        for _ in range(len(q)):        # q holds exactly one level\n            node = q.popleft()\n            level.append(node.val)\n            if node.left:\n                q.append(node.left)\n            if node.right:\n                q.append(node.right)\n        levels.append(level)\n    return levels" }
            ],
            edge: "null root: return immediately", viz: "levelorder", lc: "binary-tree-level-order-traversal" },
          { t: "Right view and left view", d: "Medium", q: "List the nodes seen from the right (last of each level) or from the left (first of each level).",
            ex: "1→(2,3), 2→(5,8), 5→(6,-), 3→(10,13), 10→(9,7), 13→(-,4), 9→(12,11)\nRight view: 1 3 13 4 11\nLeft view:  1 2 5 6 12",
            ap: [
              { n: "Brute force", cx: "O(N) time · O(N) space",
                idea: "Build the full level-order list of lists, then take the last (right view) or first (left view) of each level. Stores every level just to keep one value each.",
                code: "def right_view(root):\n    levels = level_order(root)          # list of lists, as above\n    return [row[-1] for row in levels]  # row[0] for the left view" },
              { n: "Better", cx: "O(N) time · O(width) space",
                idea: "Same level-order loop without storing the levels: output when <b>i == sz</b> (last of the level → right view) or <b>i == 1</b> (first → left view).",
                code: "from collections import deque\n\ndef views(root):\n    if not root:\n        return [], []\n    left, right = [], []\n    q = deque([root])\n    while q:\n        sz = len(q)\n        for i in range(1, sz + 1):\n            node = q.popleft()\n            if i == 1:\n                left.append(node.val)   # first of the level\n            if i == sz:\n                right.append(node.val)  # last of the level\n            if node.left:\n                q.append(node.left)\n            if node.right:\n                q.append(node.right)\n    return left, right" },
              { n: "Optimal", cx: "O(N) time · O(H) space",
                idea: "DFS visiting <b>root, right, left</b> and record the <b>first node seen at each new depth</b>. A deep node can show up in the right view even if it sits under the left part of the tree.",
                code: "def right_view(root):\n    ans = []\n\n    def dfs(node, depth):\n        if not node:\n            return\n        if depth == len(ans):          # first node seen at this depth\n            ans.append(node.val)\n        dfs(node.right, depth + 1)     # right first (swap for the left view)\n        dfs(node.left, depth + 1)\n\n    dfs(root, 0)\n    return ans" }
            ],
            viz: "tg_views", lc: "binary-tree-right-side-view" },
          { t: "Vertical order traversal", d: "Hard", co: "Microsoft", q: "Root is column 0, left child = column − 1, right child = column + 1. Print the columns left to right; inside a column, top to bottom and left to right.",
            ex: "col -3: 6\ncol -2: 5 14\ncol -1: 2 9 15\ncol  0: 1 8 10 12 16\ncol  1: 3 7 4\ncol  2: 13 11",
            ap: [
              { n: "Brute force", cx: "O(N log N) time · O(N) space",
                idea: "A plain recursive pre-order filling a map is <b>wrong</b>: column 0 comes out as 1, 16, 8, 10, 12 because the deep node 16 is reached before shallower ones. Fix it by recording <b>(column, row, visit order)</b> for every node and sorting. Correct, but pays for a sort.",
                code: "from collections import defaultdict\n\ndef vertical_order(root):\n    cells = []                          # (col, row, order, val)\n\n    def dfs(node, row, col):\n        if not node:\n            return\n        cells.append((col, row, len(cells), node.val))\n        dfs(node.left, row + 1, col - 1)\n        dfs(node.right, row + 1, col + 1)\n\n    dfs(root, 0, 0)\n    cells.sort()\n    cols = defaultdict(list)\n    for col, row, _, val in cells:\n        cols[col].append(val)\n    return [cols[c] for c in sorted(cols)]" },
              { n: "Optimal", cx: "O(N) time · O(N) space",
                idea: "Use <b>BFS over (node, column)</b> pairs so each column fills top to bottom, left to right, with no sort. Keep a map column → list, and track <b>lo / hi</b> columns so you print them in order.",
                code: "from collections import defaultdict, deque\n\ndef vertical_order(root):\n    if not root:\n        return []\n    cols = defaultdict(list)\n    lo = 0\n    hi = 0\n    q = deque([(root, 0)])\n    while q:\n        node, c = q.popleft()\n        cols[c].append(node.val)\n        lo = min(lo, c)\n        hi = max(hi, c)\n        if node.left:\n            q.append((node.left, c - 1))\n        if node.right:\n            q.append((node.right, c + 1))\n    return [cols[c] for c in range(lo, hi + 1)]" }
            ],
            edge: "two nodes can share row and column (8 and 10). BFS keeps them left to right; LeetCode 987 instead sorts ties by value, so ask which rule applies.", lc: "vertical-order-traversal-of-a-binary-tree" },
          { t: "Top view and bottom view", d: "Medium", q: "Top view: the first (topmost) node in each column. Bottom view: the last (deepest) node in each column.",
            ex: "Notes tree (with extra node 20 at column 3)\nTop view: 6 5 2 1 3 13 20",
            ap: [
              { n: "Brute force", cx: "O(N) time · O(N) space",
                idea: "Build the full vertical order, then take the first (top) / last (bottom) of each column. Stores every node just to keep two per column.",
                code: "def top_and_bottom(root):\n    cols = vertical_order(root)         # BFS version above\n    top = [col[0] for col in cols]\n    bottom = [col[-1] for col in cols]\n    return top, bottom" },
              { n: "Optimal", cx: "O(N) time · O(width) space",
                idea: "Same BFS as vertical order. Top view: only write a column <b>while it is still empty</b>. Bottom view: <b>overwrite</b> every time, so the last node in BFS order survives.",
                code: "from collections import deque\n\ndef top_and_bottom(root):\n    if not root:\n        return [], []\n    top, bottom = {}, {}\n    lo = 0\n    hi = 0\n    q = deque([(root, 0)])\n    while q:\n        node, c = q.popleft()\n        if c not in top:\n            top[c] = node.val          # first node BFS meets in column c\n        bottom[c] = node.val           # keep overwriting: the last one wins\n        lo = min(lo, c)\n        hi = max(hi, c)\n        if node.left:\n            q.append((node.left, c - 1))\n        if node.right:\n            q.append((node.right, c + 1))\n    cols = range(lo, hi + 1)\n    return [top[c] for c in cols], [bottom[c] for c in cols]" }
            ] }
        ]]
      ] },
      { h: "Recursion on trees: answers come up from the children", blocks: [
        ["p", "Most tree problems are a post-order pass: ask the left subtree, ask the right subtree, combine, return one number to the parent. Keep a global (or a returned pair) for the best answer seen anywhere."],
        ["viz", "tg_diameter", "Each node returns its height. The diameter candidate at a node is lh + rh + 2. The best path here bends at node 2, not at the root."],
        ["probs", [
          { t: "Height of a binary tree", d: "Easy", q: "Max edges from the root down to a leaf (LeetCode counts nodes instead: add 1).",
            ex: "Root 3, deepest chain 3-6-9-12-8-17 → height 5",
            ap: [
              { n: "Solution", cx: "O(N) time · O(H) space",
                idea: "<code>height(null) = -1</code>; <code>height(node) = 1 + max(height(left), height(right))</code>. A BFS that counts levels works too (levels − 1 edges).",
                code: "def height(node):\n    if not node:\n        return -1                      # edges convention; LeetCode: return 0\n    return 1 + max(height(node.left), height(node.right))" }
            ],
            lc: "maximum-depth-of-binary-tree" },
          { t: "Check if a tree is balanced", d: "Easy", q: "Is |height(left) − height(right)| ≤ 1 at every node?",
            ex: "1→(2,3), 2→(4,-), 4→(9,10), 3→(5,6), 5→(7,8), 7→(11,12)\nAnswer: false (node 3 has lh = 2, rh = 0)",
            ap: [
              { n: "Brute force", cx: "O(N²) time (skewed) · O(H) space",
                idea: "At every node call height() on both children and compare. Each height call re-walks the whole subtree, so a skewed tree costs <b>O(N²)</b>.",
                code: "def height(node):\n    if not node:\n        return -1\n    return 1 + max(height(node.left), height(node.right))\n\ndef is_balanced(node):\n    if not node:\n        return True\n    if abs(height(node.left) - height(node.right)) > 1:\n        return False\n    return is_balanced(node.left) and is_balanced(node.right)" },
              { n: "Optimal", cx: "O(N) time · O(H) space",
                idea: "Compute heights bottom-up in <b>one post-order pass</b> and compare lh and rh on the way up. To stop early without a global flag, return a sentinel like <b>-2</b> meaning 'unbalanced' (a real height is never below -1).",
                code: "def is_balanced(root):\n    UNBALANCED = -2\n\n    def height(node):\n        if not node:\n            return -1\n        lh = height(node.left)\n        if lh == UNBALANCED:\n            return UNBALANCED\n        rh = height(node.right)\n        if rh == UNBALANCED or abs(lh - rh) > 1:\n            return UNBALANCED\n        return max(lh, rh) + 1\n\n    return height(root) != UNBALANCED" }
            ],
            lc: "balanced-binary-tree" },
          { t: "Diameter of a binary tree", d: "Easy", q: "Longest path (in edges) between any two nodes.",
            ex: "1→(2,3), 2→(4,5), 4→9→11→13→15 chain, 5→10→12→14→16 chain, 3→(-,6), 6→(7,8)\nAnswer: 10 (through node 2: 4 + 4 + 2). Through the root it's only 5 + 2 + 2 = 9.",
            ap: [
              { n: "Brute force", cx: "O(N²) time (skewed) · O(H) space",
                idea: "At every node, compute both child heights from scratch: the path bending there is lh + rh + 2. Take the max over all nodes. The repeated height calls make it <b>O(N²)</b>.",
                code: "def height(node):\n    if not node:\n        return -1\n    return 1 + max(height(node.left), height(node.right))\n\ndef diameter(node):\n    if not node:\n        return 0\n    through = height(node.left) + height(node.right) + 2\n    return max(through, diameter(node.left), diameter(node.right))" },
              { n: "Optimal", cx: "O(N) time · O(H) space",
                idea: "One height pass. At each node the longest path that <b>bends here</b> is <b>lh + rh + 2</b> (with height(null) = -1). Track the global best. The longest path need not pass through the root.",
                code: "def diameter(root):\n    best = 0\n\n    def height(node):\n        nonlocal best\n        if not node:\n            return -1\n        lh = height(node.left)\n        rh = height(node.right)\n        best = max(best, lh + rh + 2)   # longest path bending here\n        return max(lh, rh) + 1\n\n    height(root)\n    return best" }
            ],
            edge: "single node → -1 + -1 + 2 = 0. Some problems count nodes (edges + 1).", viz: "tg_diameter", lc: "diameter-of-binary-tree" },
          { t: "Root-to-leaf path sum equals K", d: "Easy", q: "Is there a root-to-leaf path whose values add up to K?",
            ex: "5→(4,8), 4→(-11,1), 8→(-,22), 22→(25,-5)\nK = 60 → true (5+8+22+25)\nK = 50 → false\nK = 30 → true (5+8+22-5)",
            ap: [
              { n: "Brute force", cx: "O(N·H) time · O(N·H) space",
                idea: "List every root-to-leaf path (copying the path at each leaf), then sum each one. The copies cost O(H) per leaf.",
                code: "def has_path_sum(root, k):\n    paths = []\n\n    def collect(node, path):\n        if not node:\n            return\n        path.append(node.val)\n        if not node.left and not node.right:\n            paths.append(list(path))    # copy: O(H) per leaf\n        collect(node.left, path)\n        collect(node.right, path)\n        path.pop()\n\n    collect(root, [])\n    return any(sum(p) == k for p in paths)" },
              { n: "Optimal", cx: "O(N) time · O(H) space",
                idea: "<b>Subtract on the way down.</b> Pass K − node.val to the children; at a <b>leaf</b>, check leaf.val == remaining K. The remaining K reads 60, 55, 47, 25 down the winning path.",
                code: "def has_path_sum(node, k):\n    if not node:\n        return False\n    if not node.left and not node.right:\n        return node.val == k            # at a leaf: is the rest exactly k?\n    rest = k - node.val\n    return has_path_sum(node.left, rest) or has_path_sum(node.right, rest)" }
            ],
            edge: "empty tree → false. A node with one child is not a leaf, so its null side correctly returns false. Negative values mean you can't prune early.", lc: "path-sum" },
          { t: "Invert (mirror) a binary tree", d: "Easy", q: "Swap left and right everywhere.",
            ex: "1→(2,3), 2→(4,5), 3→(-,6), 6→(7,8)\n→ 1→(3,2), 3→(6,-), 6→(8,7), 2→(5,4)",
            ap: [
              { n: "Solution", cx: "O(N) time · O(H) space",
                idea: "At each node invert both children, then swap them. The classic bug: <code>root.right = invert(root.left)</code> followed by <code>root.left = invert(root.right)</code>. The second line reads the pointer the first line just overwrote. <b>Save both results first.</b>",
                code: "def invert(node):\n    if not node:\n        return None\n    left = invert(node.left)            # save both results first\n    right = invert(node.right)\n    node.left = right\n    node.right = left\n    return node" }
            ],
            lc: "invert-binary-tree" },
          { t: "Equal tree partition", d: "Medium", q: "Can you remove one edge so the two trees have equal sums?",
            ex: "7→(2,3) → false (total 12, no subtree sums to 6)\n5→(3,7), 3→(4,6), 4→(2,-), 6→(3,4), 4→(-,1), 7→(5,6) → true (total 46; subtree at 3 sums to 23)",
            ap: [
              { n: "Brute force", cx: "O(N²) time · O(H) space",
                idea: "Try cutting each edge: for every (node, child) edge, sum the child's subtree from scratch and compare with half the total. Each sum is O(N).",
                code: "def tree_sum(node):\n    if not node:\n        return 0\n    return node.val + tree_sum(node.left) + tree_sum(node.right)\n\ndef check_equal_tree(root):\n    total = tree_sum(root)\n    stack = [root]\n    while stack:\n        node = stack.pop()\n        for child in (node.left, node.right):\n            if child:\n                # cutting the edge node-child separates child's subtree\n                if 2 * tree_sum(child) == total:\n                    return True\n                stack.append(child)\n    return False" },
              { n: "Optimal", cx: "O(N) time · O(H) space",
                idea: "Cutting an edge always separates a <b>subtree</b>. So: odd total → false at once. Otherwise look for a <b>proper subtree with sum total/2</b>. In one post-order pass check only the child sums (never the whole tree), which guarantees an edge is really cut.",
                code: "def check_equal_tree(root):\n    def tree_sum(node):\n        if not node:\n            return 0\n        return node.val + tree_sum(node.left) + tree_sum(node.right)\n\n    total = tree_sum(root)\n    if total % 2 != 0:\n        return False\n    half = total // 2\n    found = False\n\n    def sums(node):\n        nonlocal found\n        if not node:\n            return 0\n        ls = sums(node.left)\n        rs = sums(node.right)\n        # test only real children, never the whole tree\n        if node.left and ls == half:\n            found = True\n        if node.right and rs == half:\n            found = True\n        return ls + rs + node.val\n\n    sums(root)\n    return found" }
            ],
            edge: "total = 0 with a null child gives ls = 0 = total/2, a false positive: only test non-null children. With negatives use <code>total % 2 != 0</code>." },
          { t: "Binary tree maximum path sum", d: "Hard", q: "Max sum of any path (any start and end node, values can be negative).",
            ex: "[-10, 9, 20, null, null, 15, 7] → 42 (15 + 20 + 7)",
            ap: [
              { n: "Brute force", cx: "O(N²) time · O(H) space",
                idea: "Treat every node as the <b>top</b> of the path and compute the best downward gains of its two children from scratch. Recomputing the gains per node makes it quadratic.",
                code: "def down(node):\n    # best sum of a path that starts at node and goes down\n    if not node:\n        return 0\n    return node.val + max(0, down(node.left), down(node.right))\n\ndef max_path_sum(root):\n    best = float('-inf')\n    stack = [root]\n    while stack:\n        node = stack.pop()\n        # best path whose highest node is this one\n        cand = node.val + max(0, down(node.left)) + max(0, down(node.right))\n        best = max(best, cand)\n        for child in (node.left, node.right):\n            if child:\n                stack.append(child)\n    return best" },
              { n: "Optimal", cx: "O(N) time · O(H) space",
                idea: "Same shape as diameter. Each node returns the best <b>downward</b> gain <code>val + max(L, R)</code>; the answer candidate at a node is <code>val + L + R</code>, where L and R are already clipped with <b>max(0, ·)</b> so negative branches are dropped.",
                code: "def max_path_sum(root):\n    best = float('-inf')\n\n    def gain(node):\n        nonlocal best\n        if not node:\n            return 0\n        left = max(0, gain(node.left))      # drop negative branches\n        right = max(0, gain(node.right))\n        best = max(best, node.val + left + right)\n        return node.val + max(left, right)\n\n    gain(root)\n    return best" }
            ],
            lc: "binary-tree-maximum-path-sum" }
        ]],
        ["p", "<b>Paths and lowest common ancestors.</b> When there's no ordering to use, you search both sides and pass 'found' upward."],
        ["probs", [
          { t: "Find an element in a binary tree", d: "Easy", q: "Does value t exist in a (non-BST) binary tree?",
            ex: "3→(7,9), 7→(15,-1), -1→(25,-), 25→(-,50), 9→(-,32), 32→(16,11)\nsearch(25) → true",
            ap: [
              { n: "Solution", cx: "O(N) time · O(H) space",
                idea: "No ordering to use, so search both sides and <b>short-circuit with or</b>: the right side is skipped once the left finds it.",
                code: "def find(node, t):\n    if not node:\n        return False\n    if node.val == t:\n        return True\n    return find(node.left, t) or find(node.right, t)" }
            ] },
          { t: "Path from root to a node", d: "Medium", q: "Return the values on the path from the root to node K.",
            ex: "Same tree, K = 25 → [3, 7, -1, 25]",
            ap: [
              { n: "Brute force", cx: "O(N) time · O(N) space",
                idea: "BFS once to record every node's parent, then climb from the target back to the root. Works, but stores a parent for every node.",
                code: "from collections import deque\n\ndef path_to(root, t):\n    if not root:\n        return []\n    parent = {root: None}\n    q = deque([root])\n    target = None\n    while q:\n        node = q.popleft()\n        if node.val == t:\n            target = node\n            break\n        for child in (node.left, node.right):\n            if child:\n                parent[child] = node\n                q.append(child)\n    path = []\n    while target:\n        path.append(target.val)\n        target = parent[target]\n    return path[::-1]" },
              { n: "Optimal", cx: "O(N) time · O(H) space",
                idea: "Like find, but when a child returns true, <b>append the current node on the way back up</b>. That builds the path node → root, so reverse it at the end.",
                code: "def path_to(root, t):\n    ans = []\n\n    def dfs(node):\n        if not node:\n            return False\n        if node.val == t or dfs(node.left) or dfs(node.right):\n            ans.append(node.val)        # on the way back up\n            return True\n        return False\n\n    dfs(root)\n    return ans[::-1]                    # built node → root, so reverse" }
            ] },
          { t: "Lowest common ancestor in a binary tree", d: "Medium", co: "Flipkart, Amazon, Microsoft, Google", q: "Deepest node that has both v1 and v2 as descendants (a node is its own ancestor).",
            ex: "3→(7,4), 7→(9,-), 9→(12,19), 4→(14,18), 14→(15,1), 15→(21,2), 1→(-,6), 18→(-,25)\nLCA(21, 6) = 14 · LCA(2, 6) = 14 · LCA(21, 4) = 4 · LCA(12, 6) = 3",
            ap: [
              { n: "Brute force", cx: "O(N) time · O(H) space, two passes",
                idea: "Notes' method: get the paths for both nodes (21: [3,4,14,15,21], 6: [3,4,14,1,6]). Walk them together from the <b>root end</b> while the values match. The last match is the LCA. Also works when one node may be missing.",
                code: "def lca(root, a, b):\n    pa = path_to(root, a)               # root → a, from the problem above\n    pb = path_to(root, b)\n    ans = None\n    for x, y in zip(pa, pb):\n        if x != y:\n            break\n        ans = x                         # last common value on both paths\n    return ans" },
              { n: "Optimal", cx: "O(N) time · O(H) space, one pass",
                idea: "If the node is null or equals a or b, return it. Recurse left and right. If <b>both sides return non-null</b>, this node is where they split: it's the LCA. Otherwise pass up whichever side found something.",
                code: "def lca(node, a, b):\n    if not node or node.val == a or node.val == b:\n        return node\n    left = lca(node.left, a, b)\n    right = lca(node.right, a, b)\n    if left and right:\n        return node                     # a and b split here\n    return left or right" }
            ],
            edge: "one node is an ancestor of the other (LCA(21, 4) = 4). The one-pass version assumes both nodes exist; if one may be missing, use the path method.", lc: "lowest-common-ancestor-of-a-binary-tree" },
          { t: "Many LCA queries (Q, N up to 1e5)", d: "Hard", q: "Answer Q LCA queries quickly.",
            ex: "Euler times (in, out) on the LCA tree: 3 (1,28), 7 (2,9), 9 (3,8), 12 (4,5), 19 (6,7), 4 (10,27), 14 (11,22), 15 (12,17), 21 (13,14), 2 (15,16), 1 (18,21), 6 (19,20), 18 (23,26), 25 (24,25)",
            ap: [
              { n: "Brute force", cx: "O(Q·N) time · O(H) space",
                idea: "Run the one-pass O(N) LCA for every query: about 1e10 steps. Too slow.",
                code: "def answer_queries(root, queries):\n    # lca() is the one-pass O(N) version above\n    return [lca(root, a, b) for a, b in queries]" },
              { n: "Better", cx: "O(N) preprocess + O(H) per query · O(N) space",
                idea: "One DFS with a timer: <code>tin[x]</code> on entry, <code>tout[x]</code> on exit. Then <b>x is an ancestor of y iff tin[x] ≤ tin[y] and tout[x] ≥ tout[y]</b> (interval containment). Per query, start at the root and step to whichever child is an ancestor of both; stop when neither is.",
                code: "def preprocess(root):\n    tin, tout = {}, {}\n    timer = 1\n\n    def dfs(x):\n        nonlocal timer\n        if not x:\n            return\n        tin[x] = timer\n        timer += 1\n        dfs(x.left)\n        dfs(x.right)\n        tout[x] = timer\n        timer += 1\n\n    dfs(root)\n    return tin, tout\n\ndef query(root, a, b, tin, tout):\n    def is_anc(x, v):\n        return x is not None and tin[x] <= tin[v] and tout[x] >= tout[v]\n\n    cur = root\n    while True:\n        if is_anc(cur.left, a) and is_anc(cur.left, b):\n            cur = cur.left\n        elif is_anc(cur.right, a) and is_anc(cur.right, b):\n            cur = cur.right\n        else:\n            return cur" },
              { n: "Optimal", cx: "O(N log N) preprocess + O(log N) per query · O(N log N) space",
                idea: "<b>Binary lifting</b>: store each node's 2<sup>k</sup>-th ancestor. Lift the deeper node up to the other's depth using the bits of the depth difference, then lift both together while their ancestors differ. Their parent is the LCA.",
                code: "def build_lifting(root):\n    LOG = 17                            # 2^17 > 1e5\n    up = {root: [root] * LOG}           # up[x][k] = 2^k-th ancestor of x\n    depth = {root: 0}\n    order = [root]\n    for node in order:                  # BFS: the list grows while we loop\n        for child in (node.left, node.right):\n            if child:\n                depth[child] = depth[node] + 1\n                up[child] = [node] * LOG\n                order.append(child)\n    for k in range(1, LOG):\n        for node in order:\n            up[node][k] = up[up[node][k - 1]][k - 1]\n    return up, depth\n\ndef query(a, b, up, depth):\n    LOG = len(up[a])\n    if depth[a] < depth[b]:\n        a, b = b, a\n    diff = depth[a] - depth[b]\n    for k in range(LOG):                # lift a to b's depth\n        if diff >> k & 1:\n            a = up[a][k]\n    if a is b:\n        return a\n    for k in range(LOG - 1, -1, -1):    # lift both while they differ\n        if up[a][k] is not up[b][k]:\n            a = up[a][k]\n            b = up[b][k]\n    return up[a][0]" }
            ] }
        ]]
      ] },
      { h: "Binary search trees", blocks: [
        ["p", "A <b>BST</b>: for every node, all values in the left subtree ≤ node.val < all values in the right subtree. That is, max(left subtree) ≤ node < min(right subtree)."],
        ["warn", "Checking only parent vs child is not enough. 10 → (5, 13), 5 → (3, 8), 8 → (−, 11) is <b>invalid</b>: 11 is bigger than its parent 8 but sits in 10's left subtree. A left-skewed chain 15 → 11 → 9 → 7 → 6 is valid."],
        ["p", "The key fact: the <b>in-order traversal of a BST is sorted</b>. 10 → (5, 19), 5 → (2, 8), 8 → (−, 9), 19 → (−, 25), 25 → (22, 30) gives 2 5 8 9 10 19 22 25 30. Validation, kth smallest and recover-BST all build on this."],
        ["viz", "bst", "Search and insert touch one node per level: O(H), not O(N)."],
        ["probs", [
          { t: "Search in a BST", d: "Easy", q: "Is K in the BST?",
            ex: "4→(0,10), 0→(-1,3), 10→(7,15), 7→(6,9); K = 9 → true\n8→(4,13), 4→(1,7), 7→(6,-), 13→(10,15); K = 5 → false (path 8→4→7→6→null)",
            ap: [
              { n: "Brute force", cx: "O(N) time · O(H) space",
                idea: "Ignore the ordering and search both subtrees like any binary tree.",
                code: "def search(node, k):\n    if not node:\n        return False\n    if node.val == k:\n        return True\n    return search(node.left, k) or search(node.right, k)" },
              { n: "Optimal", cx: "O(H) time · O(1) space",
                idea: "Compare with curr: equal → found; curr smaller than the target → go right; otherwise go left. <b>One node per level.</b>",
                code: "def search(root, k):\n    curr = root\n    while curr:\n        if curr.val == k:\n            return True\n        if curr.val < k:\n            curr = curr.right           # target is bigger: go right\n        else:\n            curr = curr.left\n    return False" }
            ],
            lc: "search-in-a-binary-search-tree" },
          { t: "Insert into a BST", d: "Medium", q: "Insert a value and return the root.",
            ex: "Insert 14 into 8→(4,12), 4→(1,7), 7→(6,-), 12→(10,15), 15→(13,17)\nPath 8→12→15→13; 14 becomes 13.right",
            ap: [
              { n: "Better", cx: "O(H) time · O(H) space (recursion)",
                idea: "Recursive: <code>root.right = insert(root.right, t)</code> (or left) and return root. The call that reaches null creates the node, and the assignments on the way back attach it.",
                code: "def insert(root, t):\n    if not root:\n        return Node(t)                  # fell off the tree: new node here\n    if root.val == t:\n        return root                     # already present: notes don't insert\n    if root.val < t:\n        root.right = insert(root.right, t)\n    else:\n        root.left = insert(root.left, t)\n    return root" },
              { n: "Optimal", cx: "O(H) time · O(1) space",
                idea: "Walk like a search keeping <b>prev</b>. When curr falls off (null), attach the new node to prev on the correct side.",
                code: "def insert(root, t):\n    if not root:\n        return Node(t)\n    prev = None\n    curr = root\n    while curr:\n        if curr.val == t:\n            return root\n        prev = curr\n        curr = curr.right if curr.val < t else curr.left\n    if prev.val < t:\n        prev.right = Node(t)\n    else:\n        prev.left = Node(t)\n    return root" }
            ],
            edge: "empty tree → the new node is the root. Value already present → notes return without inserting.", lc: "insert-into-a-binary-search-tree" },
          { t: "Smallest and largest in a BST", d: "Easy", q: "Find the min and max.",
            ex: "Same tree: smallest 8→4→1 = 1, largest 8→12→15→17 = 17",
            ap: [
              { n: "Brute force", cx: "O(N) time · O(N) space",
                idea: "Visit every node and take min and max of the values: ignores the BST order.",
                code: "def min_max(root):\n    vals = []\n    stack = [root]\n    while stack:\n        node = stack.pop()\n        if node:\n            vals.append(node.val)\n            stack.append(node.left)\n            stack.append(node.right)\n    return min(vals), max(vals)" },
              { n: "Optimal", cx: "O(H) time · O(1) space",
                idea: "Smallest: keep following <b>left</b> until there is no left child. Largest: the mirror, keep following <b>right</b>.",
                code: "def min_max(root):\n    lo = root\n    while lo.left:                      # smallest: keep going left\n        lo = lo.left\n    hi = root\n    while hi.right:                     # largest: keep going right\n        hi = hi.right\n    return lo.val, hi.val" }
            ] },
          { t: "Delete from a BST", d: "Medium", q: "Delete key k and keep the BST valid.",
            ex: "8→(4,12), 4→(1,7), 7→(6,-), 12→(10,15), 15→(13,17)\ndelete(6): leaf · delete(7): one child · delete(8): two children (7 moves up)",
            ap: [
              { n: "Brute force", cx: "O(N) time · O(N) space",
                idea: "Read the in-order (sorted) values without k and rebuild a balanced BST from them. Correct, but touches every node to remove one.",
                code: "def delete(root, k):\n    vals = []\n\n    def inorder(node):\n        if node:\n            inorder(node.left)\n            if node.val != k:\n                vals.append(node.val)\n            inorder(node.right)\n\n    def build(lo, hi):\n        if lo > hi:\n            return None\n        mid = (lo + hi) // 2\n        node = Node(vals[mid])\n        node.left = build(lo, mid - 1)\n        node.right = build(mid + 1, hi)\n        return node\n\n    inorder(root)\n    return build(0, len(vals) - 1)      # a new, balanced tree" },
              { n: "Optimal", cx: "O(H) time · O(H) space",
                idea: "Find the node, then 3 cases:<br>1. <b>Leaf</b>: return null.<br>2. <b>One child</b>: return that child (splices the node out).<br>3. <b>Two children</b>: swap its value with the <b>max of the left subtree</b> (in-order predecessor), then delete k from the left subtree. There it is case 1 or 2. (The min of the right subtree works too.)",
                code: "def delete(root, k):\n    if not root:\n        return None\n    if root.val < k:\n        root.right = delete(root.right, k)\n    elif root.val > k:\n        root.left = delete(root.left, k)\n    else:\n        # cases 1 and 2: zero or one child\n        if not root.left or not root.right:\n            return root.left or root.right\n        # case 3: swap with the max of the left subtree\n        t = root.left\n        while t.right:\n            t = t.right\n        root.val, t.val = t.val, root.val\n        root.left = delete(root.left, k)\n    return root" }
            ],
            edge: "deleting the root, deleting a key that doesn't exist (nothing changes)", lc: "delete-node-in-a-bst" },
          { t: "Sorted array → height-balanced BST", d: "Easy", q: "Build a balanced BST from a sorted array.",
            ex: "[-1, 3, 4, 6, 7, 8, 10, 13, 14]\nmid 4 → root 7; left half → root 3 (children -1, 4; 4.right = 6); right half → root 10 (children 8, 13; 13.right = 14)",
            ap: [
              { n: "Solution", cx: "O(N) time · O(log N) recursion",
                idea: "Inserting the values one by one gives a valid BST, but a sorted input makes a <b>skewed chain</b> (O(N²), not balanced). Instead the <b>middle element becomes the root</b>, then recurse on the left half and the right half. The halves differ in size by at most 1, so the tree is balanced.",
                code: "def sorted_to_bst(a):\n    def build(lo, hi):\n        if lo > hi:\n            return None\n        mid = (lo + hi) // 2\n        root = Node(a[mid])             # middle element is the root\n        root.left = build(lo, mid - 1)\n        root.right = build(mid + 1, hi)\n        return root\n\n    return build(0, len(a) - 1)" }
            ],
            lc: "convert-sorted-array-to-binary-search-tree" },
          { t: "Validate a BST", d: "Medium", q: "Is this binary tree a BST?",
            ex: "5→(2,6), 2→(1,3), 6→(4,7) → in-order 1 2 3 5 4 6 7 → false (4 < 5 but sits right of 5)",
            ap: [
              { n: "Brute force", cx: "O(N²) time · O(N) space",
                idea: "Use the definition directly: at every node, check that <b>every</b> value in the left subtree is ≤ node and every value in the right subtree is >. Re-collecting subtrees at each node is quadratic.",
                code: "def subtree_vals(node):\n    if not node:\n        return []\n    return subtree_vals(node.left) + [node.val] + subtree_vals(node.right)\n\ndef is_bst(node):\n    if not node:\n        return True\n    if any(v > node.val for v in subtree_vals(node.left)):\n        return False\n    if any(v <= node.val for v in subtree_vals(node.right)):\n        return False\n    return is_bst(node.left) and is_bst(node.right)" },
              { n: "Better", cx: "O(N) time · O(N) space",
                idea: "The <b>in-order of a BST is sorted</b>. Write it to an array and check it never decreases.",
                code: "def is_bst(root):\n    vals = []\n\n    def inorder(node):\n        if node:\n            inorder(node.left)\n            vals.append(node.val)\n            inorder(node.right)\n\n    inorder(root)\n    # notes' rule (left <= node): only a strict drop is a violation\n    return all(vals[i - 1] <= vals[i] for i in range(1, len(vals)))" },
              { n: "Optimal", cx: "O(N) time · O(H) space",
                idea: "Same in-order, but keep only <b>prev</b> (last visited value, starting at −∞). If you ever see <code>node.val &lt; prev</code>, it's not a BST. Alternative: pass down a <b>(lo, hi) range</b> and check every node fits.",
                code: "def is_bst(root):\n    prev = float('-inf')\n    ok = True\n\n    def inorder(node):\n        nonlocal prev, ok\n        if not node or not ok:\n            return\n        inorder(node.left)\n        if node.val < prev:             # use <= for LeetCode 98 (strict)\n            ok = False\n        prev = node.val\n        inorder(node.right)\n\n    inorder(root)\n    return ok" }
            ],
            edge: "the notes use <code>&lt;</code>, so equal values pass (matching ≤ on the left). LeetCode 98 wants strict, so use ≤ there. Use −∞ / None, not INT_MIN, as the start.", lc: "validate-binary-search-tree" },
          { t: "Kth smallest element in a BST", d: "Medium", q: "Return the kth smallest value.",
            ex: "4→(0,10), 0→(-1,3), 10→(7,15), 7→(6,9), 15→(-,20), 20→(19,25)\nIn-order: -1 0 3 4 6 7 9 10 15 19 20 25 → K = 3 gives 3",
            ap: [
              { n: "Brute force", cx: "O(N) time · O(N) space",
                idea: "Store the whole in-order in an array and return arr[K − 1].",
                code: "def kth_smallest(root, k):\n    vals = []\n\n    def inorder(node):\n        if node:\n            inorder(node.left)\n            vals.append(node.val)\n            inorder(node.right)\n\n    inorder(root)\n    return vals[k - 1] if k <= len(vals) else -1" },
              { n: "Optimal", cx: "O(H + K) time · O(H) space (O(1) with Morris)",
                idea: "In-order with a <b>counter</b>; when it reaches K, that's the answer and you <b>stop</b> without visiting the rest. The iterative stack version makes the early exit trivial.",
                code: "def kth_smallest(root, k):\n    st = []\n    curr = root\n    count = 0\n    while st or curr:\n        while curr:\n            st.append(curr)\n            curr = curr.left\n        curr = st.pop()\n        count += 1\n        if count == k:\n            return curr.val             # stop: no need to see the rest\n        curr = curr.right\n    return -1                           # k > N" }
            ],
            edge: "K > N → answer stays -1", viz: "inorder", lc: "kth-smallest-element-in-a-bst" },
          { t: "Recover a BST (two nodes swapped)", d: "Medium", q: "Exactly two nodes' values were swapped. Fix the tree without changing its shape.",
            ex: "10→(7,15), 7→(3,14), 14→(8,-), 15→(12,17), 12→(-,9)\nIn-order: 3 7 8 14 10 12 9 15 17 → 14 and 9 are swapped",
            ap: [
              { n: "Brute force", cx: "O(N log N) time · O(N) space",
                idea: "Copy the in-order nodes, sort their values, and write the sorted values back in in-order position.",
                code: "def recover(root):\n    nodes = []\n\n    def inorder(node):\n        if node:\n            inorder(node.left)\n            nodes.append(node)\n            inorder(node.right)\n\n    inorder(root)\n    vals = sorted(n.val for n in nodes)\n    for node, v in zip(nodes, vals):\n        node.val = v                    # write the sorted values back" },
              { n: "Optimal", cx: "O(N) time · O(H) space, or O(1) with Morris",
                idea: "Plot the in-order: a sorted line with one <b>peak</b> and one <b>dip</b>. Walk in-order with prev. At each inversion <code>prev &gt; curr</code>: the first time, <b>first = prev</b>; every time, <b>second = curr</b>. Swap first and second. Adjacent swaps give only one inversion and this still works.",
                code: "def recover(root):\n    first = None\n    second = None\n    prev = None\n\n    def inorder(node):\n        nonlocal first, second, prev\n        if not node:\n            return\n        inorder(node.left)\n        if prev and prev.val > node.val:   # an inversion\n            if not first:\n                first = prev               # the peak\n            second = node                  # the dip (last one wins)\n        prev = node\n        inorder(node.right)\n\n    inorder(root)\n    first.val, second.val = second.val, first.val" }
            ],
            lc: "recover-binary-search-tree" },
          { t: "Is this array the pre-order of a one-child BST?", d: "Medium", q: "Every node has exactly one child. Can the array be the pre-order of such a BST?",
            ex: "[4, 10, 5, 8] → true (4 → right 10 → left 5 → right 8)\n[1, 5, 6, 4] → false",
            ap: [
              { n: "Brute force", cx: "O(N²) time · O(1) space",
                idea: "In a one-child chain each element decides the side for everything after it. So for every i, check that all later values are on one side of a[i]. Rescanning the suffix each time is quadratic.",
                code: "def one_child_preorder(a):\n    for i in range(len(a) - 1):\n        rest = a[i + 1:]\n        # a[i] must be above all later values or below all of them\n        if not (all(x > a[i] for x in rest) or all(x < a[i] for x in rest)):\n            return False\n    return True" },
              { n: "Optimal", cx: "O(N) time · O(1) space",
                idea: "Each element must be <b>greater than everything after it or smaller than everything after it</b>. Scan from the right keeping a running max and min of the suffix, so each check is O(1).",
                code: "def one_child_preorder(a):\n    mx = a[-1]\n    mn = a[-1]\n    for x in reversed(a[:-1]):\n        if not (x > mx or x < mn):\n            return False\n        mx = max(mx, x)\n        mn = min(mn, x)\n    return True" }
            ] },
          { t: "LCA in a BST", d: "Medium", co: "Walmart", q: "Lowest common ancestor of v1 and v2 in a BST.",
            ex: "11→(8,18), 8→(3,9), 3→(-1,-), 18→(13,19), 13→(12,14), 14→(-,16), 19→(-,25), 25→(-,50)\nLCA(14, 25) = 18 · LCA(12, 16) = 13 · LCA(12, 13) = 13",
            ap: [
              { n: "Brute force", cx: "O(N) time · O(H) space",
                idea: "The general binary-tree LCA: it ignores the ordering and may search the whole tree.",
                code: "def lca(node, a, b):\n    # the general binary-tree LCA: ignores the ordering\n    if not node or node.val == a or node.val == b:\n        return node\n    left = lca(node.left, a, b)\n    right = lca(node.right, a, b)\n    if left and right:\n        return node\n    return left or right" },
              { n: "Optimal", cx: "O(H) time · O(1) space",
                idea: "Use the order. <b>Both smaller</b> than curr → go left. <b>Both larger</b> → go right. Otherwise they split here (or one equals curr): curr is the LCA.",
                code: "def lca_bst(root, a, b):\n    curr = root\n    while curr:\n        if a < curr.val and b < curr.val:\n            curr = curr.left            # both smaller: go left\n        elif a > curr.val and b > curr.val:\n            curr = curr.right           # both larger: go right\n        else:\n            return curr                 # they split here (or one is curr)\n    return None" }
            ],
            viz: "tg_bstLCA", lc: "lowest-common-ancestor-of-a-binary-search-tree" }
        ]],
        ["viz", "tg_bstLCA", "LCA in a BST: one cursor, three questions per node. Try the presets from the notes."]
      ] },
      { h: "Build, link, flatten, serialize", blocks: [
        ["p", "These problems rebuild or rewire a tree. They test whether you can track index ranges and pointers precisely."],
        ["probs", [
          { t: "Build a tree from in-order + post-order", d: "Medium", q: "Values are unique. Rebuild the tree.",
            ex: "in   = [4, 2, 7, 5, 1, 3, 8, 6, 9]\npost = [4, 7, 5, 2, 8, 9, 6, 3, 1]\n→ root 1; left 2→(4,5), 5→(7,-); right 3→(-,6), 6→(8,9)",
            ap: [
              { n: "Brute force", cx: "O(N²) time · O(N) space",
                idea: "The <b>last element of the post-order range is the root</b>. Find it in the in-order by a <b>linear scan</b> at idx: everything left of idx is the left subtree. The scan makes each call O(N).",
                code: "def build_tree(inorder, postorder):\n    def build(isi, iei, psi, pei):\n        if isi > iei:\n            return None\n        root = Node(postorder[pei])     # last of the range is the root\n        idx = inorder.index(root.val, isi, iei + 1)   # O(N) scan\n        cl = idx - isi                  # size of the left subtree\n        root.left = build(isi, idx - 1, psi, psi + cl - 1)\n        root.right = build(idx + 1, iei, psi + cl, pei - 1)\n        return root\n\n    n = len(inorder)\n    return build(0, n - 1, 0, n - 1)" },
              { n: "Optimal", cx: "O(N) time · O(N) space",
                idea: "Same recursion, but a <b>hashmap value → in-order index</b> makes each root lookup O(1). <b>countL = idx − isi</b> is the left size, so in post-order the left subtree is the first countL elements of the range, then the right subtree, then the root.",
                code: "def build_tree(inorder, postorder):\n    pos = {v: i for i, v in enumerate(inorder)}   # value -> in-order index\n\n    def build(isi, iei, psi, pei):\n        if isi > iei:\n            return None\n        root = Node(postorder[pei])\n        idx = pos[root.val]             # O(1) lookup\n        cl = idx - isi\n        root.left = build(isi, idx - 1, psi, psi + cl - 1)\n        root.right = build(idx + 1, iei, psi + cl, pei - 1)\n        return root\n\n    n = len(inorder)\n    return build(0, n - 1, 0, n - 1)" }
            ],
            edge: "empty range (isi > iei) → null. Duplicates break the method. Skewed trees recurse N deep.", lc: "construct-binary-tree-from-inorder-and-postorder-traversal" },
          { t: "Build a tree from pre-order + in-order", d: "Medium", q: "Same idea with pre-order.",
            ex: "pre = [3, 9, 20, 15, 7], in = [9, 3, 15, 20, 7] → 3→(9,20), 20→(15,7)",
            ap: [
              { n: "Brute force", cx: "O(N²) time · O(N) space",
                idea: "Now the root is the <b>first</b> element of the pre-order range. A linear scan of the in-order finds it, which costs O(N) per call.",
                code: "def build_tree(preorder, inorder):\n    def build(psi, pei, isi, iei):\n        if isi > iei:\n            return None\n        root = Node(preorder[psi])      # first of the range is the root\n        idx = inorder.index(root.val, isi, iei + 1)   # O(N) scan\n        cl = idx - isi\n        root.left = build(psi + 1, psi + cl, isi, idx - 1)\n        root.right = build(psi + cl + 1, pei, idx + 1, iei)\n        return root\n\n    n = len(inorder)\n    return build(0, n - 1, 0, n - 1)" },
              { n: "Optimal", cx: "O(N) time · O(N) space",
                idea: "Hashmap value → in-order index. Left subtree = the next countL pre-order elements after the root, right subtree = the rest.",
                code: "def build_tree(preorder, inorder):\n    pos = {v: i for i, v in enumerate(inorder)}\n\n    def build(psi, pei, isi, iei):\n        if isi > iei:\n            return None\n        root = Node(preorder[psi])\n        idx = pos[root.val]\n        cl = idx - isi                  # size of the left subtree\n        root.left = build(psi + 1, psi + cl, isi, idx - 1)\n        root.right = build(psi + cl + 1, pei, idx + 1, iei)\n        return root\n\n    n = len(inorder)\n    return build(0, n - 1, 0, n - 1)" }
            ],
            lc: "construct-binary-tree-from-preorder-and-inorder-traversal" },
          { t: "Next right pointers (any binary tree)", d: "Medium", q: "Point each node's next at the node to its right on the same level, or null.",
            ex: "10→(20,30), 20→(2,7), 30→(-,22), 2→(8,-), 7→(-,6), 22→(21,50)\n20→30→null · 2→7→22→null · 8→6→21→50→null",
            ap: [
              { n: "Brute force", cx: "O(N) time · O(N) space",
                idea: "Level order with a queue, linking each node to the next one in its level batch. Easy, but the queue holds a whole level.",
                code: "from collections import deque\n\ndef connect(root):\n    if not root:\n        return root\n    q = deque([root])\n    while q:\n        prev = None\n        for _ in range(len(q)):\n            node = q.popleft()\n            if prev:\n                prev.next = node        # link to the next node of this level\n            prev = node\n            if node.left:\n                q.append(node.left)\n            if node.right:\n                q.append(node.right)\n    return root" },
              { n: "Optimal", cx: "O(N) time · O(1) space",
                idea: "Walk the current level <b>using the next pointers already set</b>, and build the next level's list behind a <b>dummy</b> head with a <b>temp</b> tail. When curr runs off the level, jump to <code>dummy.next</code> and reset. dummy and temp start as the same object; moving temp doesn't move dummy, so dummy.next still marks the start of the next level.",
                code: "def connect(root):\n    curr = root\n    dummy = Node(-1)                    # head of the next level's list\n    temp = dummy                        # tail of that list\n    while curr:\n        if curr.left:\n            temp.next = curr.left\n            temp = temp.next\n        if curr.right:\n            temp.next = curr.right\n            temp = temp.next\n        curr = curr.next                # walk this level via next pointers\n        if not curr:                    # level finished: drop down\n            curr = dummy.next\n            dummy.next = None\n            temp = dummy\n    return root" }
            ],
            lc: "populating-next-right-pointers-in-each-node-ii" },
          { t: "Flatten a binary tree to a linked list", d: "Medium", q: "Rewire the tree in place into a right-only chain in pre-order (left pointers become null).",
            ex: "1→(2,5), 2→(3,4), 5→(-,6)\n→ 1→2→3→4→5→6 (all via .right)",
            ap: [
              { n: "Brute force", cx: "O(N) time · O(N) space",
                idea: "Pre-order the nodes into a list, then relink each node's right to the next one and clear its left.",
                code: "def flatten(root):\n    nodes = []\n\n    def preorder(node):\n        if node:\n            nodes.append(node)\n            preorder(node.left)\n            preorder(node.right)\n\n    preorder(root)\n    for a, b in zip(nodes, nodes[1:]):\n        a.left = None\n        a.right = b" },
              { n: "Better", cx: "O(N) time · O(H) space",
                idea: "Reverse pre-order (right, left, node) with a <code>prev</code> pointer: each node points right at the node that comes after it, which was built just before.",
                code: "def flatten(root):\n    prev = None\n\n    def walk(node):                     # reverse pre-order: right, left, node\n        nonlocal prev\n        if not node:\n            return\n        walk(node.right)\n        walk(node.left)\n        node.right = prev\n        node.left = None\n        prev = node\n\n    walk(root)" },
              { n: "Optimal", cx: "O(N) time · O(1) space",
                idea: "Morris-style. At each node with a left child, find the <b>rightmost node of the left subtree</b> (the last node visited there in pre-order). Hang the current right subtree off it, move the left subtree to the right, set left = null, then step right.",
                code: "def flatten(root):\n    curr = root\n    while curr:\n        if curr.left:\n            p = curr.left\n            while p.right:              # last pre-order node of the left subtree\n                p = p.right\n            p.right = curr.right        # hang the right subtree there\n            curr.right = curr.left\n            curr.left = None\n        curr = curr.right" }
            ],
            edge: "an alternative is reverse pre-order (right, left, node) with a <code>prev</code> pointer: <code>node.right = prev; node.left = None; prev = node</code>, O(H) space.", lc: "flatten-binary-tree-to-linked-list" },
          { t: "Serialize and deserialize a binary tree", d: "Hard", q: "Turn a tree into a string and back.",
            ex: "1→(2,3), 3→(4,5) ↔ \"1,2,#,#,3,4,#,#,5,#,#\"",
            ap: [
              { n: "Brute force", cx: "O(N) time · O(N) space, unique values only",
                idea: "In-order alone is not enough: many trees share an in-order. Store <b>pre-order and in-order</b> together and rebuild with the hashmap method above. Works, but writes 2N values and breaks on duplicates.",
                code: "def serialize(root):\n    pre = []\n    ino = []\n\n    def walk(node):\n        if node:\n            pre.append(str(node.val))\n            walk(node.left)\n            ino.append(str(node.val))\n            walk(node.right)\n\n    walk(root)\n    return ','.join(pre) + '|' + ','.join(ino)\n\ndef deserialize(s):\n    pre_s, ino_s = s.split('|')\n    if not pre_s:\n        return None\n    pre = [int(x) for x in pre_s.split(',')]\n    ino = [int(x) for x in ino_s.split(',')]\n    return build_tree(pre, ino)         # pre-order + in-order rebuild above" },
              { n: "Optimal", cx: "O(N) time · O(N) space",
                idea: "Pre-order <b>with null markers</b> is enough to rebuild uniquely, even with duplicates: the markers tell you exactly where each subtree ends. Deserialize by reading tokens in the same pre-order with an iterator.",
                code: "def serialize(root):\n    out = []\n\n    def ser(node):\n        if not node:\n            out.append('#')             # null marker ends a subtree\n            return\n        out.append(str(node.val))\n        ser(node.left)\n        ser(node.right)\n\n    ser(root)\n    return ','.join(out)\n\ndef deserialize(s):\n    it = iter(s.split(','))\n\n    def de():\n        v = next(it)\n        if v == '#':\n            return None\n        node = Node(int(v))\n        node.left = de()                # same pre-order as ser\n        node.right = de()\n        return node\n\n    return de()" }
            ],
            edge: "negative and multi-digit values (use a separator), empty tree (\"#\")", lc: "serialize-and-deserialize-binary-tree" }
        ]]
      ] },
      { h: "Interview cheatsheet", blocks: [
        ["table", ["If the question says…", "Reach for", "Cost"], [
          ["height, diameter, balanced, max path sum", "post-order returning a value + global best", "O(N), O(H)"],
          ["level by level, left/right view, zigzag, average per level", "BFS with the sz snapshot", "O(N), O(width)"],
          ["vertical order / top / bottom view", "BFS over (node, column) + min/max column", "O(N)"],
          ["sorted order, kth smallest, validate, recover", "in-order (BST in-order is sorted)", "O(N), O(H)"],
          ["search / insert / delete / LCA in a BST", "walk one path using the order", "O(H)"],
          ["LCA in a general tree", "both sides non-null → this node", "O(N)"],
          ["many ancestor / LCA queries", "Euler in/out times (or binary lifting)", "O(N) + O(H) or O(log N) per query"],
          ["O(1) extra space traversal", "Morris threads", "O(N), O(1)"],
          ["rebuild from traversals", "root from pre/post + hashmap into in-order", "O(N)"]]],
        ["list", [
          "Say your height convention out loud (edges with height(null) = −1, or nodes with height(null) = 0). Mixing them causes off-by-one bugs in diameter.",
          "Recursion depth is O(H); on a skewed tree of 1e5 nodes that can overflow the stack. Mention the iterative or Morris version.",
          "BST validity is about whole subtrees, not just parent and child.",
          "For BFS views and vertical order, DFS gives the wrong top-to-bottom order unless you also track depth.",
          "When the tree is modified (Morris, flatten, invert), say whether it's restored afterwards."]],
        ["warn", "Invert tree: never write <code>root.right = invert(root.left); root.left = invert(root.right)</code>. Save both results first."]
      ] }
    ],
    lc: [
      ["Maximum Depth of Binary Tree", "maximum-depth-of-binary-tree", "Easy"],
      ["Same Tree", "same-tree", "Easy"],
      ["Invert Binary Tree", "invert-binary-tree", "Easy"],
      ["Symmetric Tree", "symmetric-tree", "Easy"],
      ["Path Sum", "path-sum", "Easy"],
      ["Minimum Absolute Difference in BST", "minimum-absolute-difference-in-bst", "Easy"],
      ["Binary Tree Level Order Traversal", "binary-tree-level-order-traversal", "Medium"],
      ["Binary Tree Zigzag Level Order Traversal", "binary-tree-zigzag-level-order-traversal", "Medium"],
      ["Binary Tree Right Side View", "binary-tree-right-side-view", "Medium"],
      ["Construct Binary Tree from Preorder and Inorder Traversal", "construct-binary-tree-from-preorder-and-inorder-traversal", "Medium"],
      ["Construct Binary Tree from Inorder and Postorder Traversal", "construct-binary-tree-from-inorder-and-postorder-traversal", "Medium"],
      ["Populating Next Right Pointers in Each Node II", "populating-next-right-pointers-in-each-node-ii", "Medium"],
      ["Flatten Binary Tree to Linked List", "flatten-binary-tree-to-linked-list", "Medium"],
      ["Sum Root to Leaf Numbers", "sum-root-to-leaf-numbers", "Medium"],
      ["Lowest Common Ancestor of a Binary Tree", "lowest-common-ancestor-of-a-binary-tree", "Medium"],
      ["Validate Binary Search Tree", "validate-binary-search-tree", "Medium"],
      ["Kth Smallest Element in a BST", "kth-smallest-element-in-a-bst", "Medium"],
      ["Binary Search Tree Iterator", "binary-search-tree-iterator", "Medium"],
      ["Binary Tree Maximum Path Sum", "binary-tree-maximum-path-sum", "Hard"],
      ["Serialize and Deserialize Binary Tree", "serialize-and-deserialize-binary-tree", "Hard"]
    ],
    quiz: [
      { q: "A tree has 40 nodes. How many edges does it have?", o: ["40", "39", "41", "It depends on the shape"], a: 1, why: "Every node except the root has exactly one parent edge, so N − 1 = 39." },
      { q: "Which traversal of a BST visits values in sorted order?", o: ["Pre-order", "Post-order", "In-order", "Level order"], a: 2, why: "In-order is left subtree, node, right subtree. In a BST that is smaller values, node, larger values." },
      { q: "Diameter: at a node with left height 4 and right height 4 (heights in edges, height(null) = −1), the path bending there has length…", o: ["8", "9", "10", "4"], a: 2, why: "lh + rh + 2 = 4 + 4 + 2 = 10: two edges connect the node to each child, plus the heights below." },
      { q: "Why does recursive pre-order give the wrong order for vertical order traversal?", o: ["It visits columns out of order", "A deep node in a column can be visited before a shallower one", "It can't track column numbers", "It visits nodes twice"], a: 1, why: "Pre-order goes deep first, so in the notes' tree column 0 comes out 1, 16, 8, 10, 12. BFS visits by depth, so each column fills top to bottom." },
      { q: "In Morris in-order traversal, what does the temporary thread point to?", o: ["From curr to its predecessor", "From the in-order predecessor's right pointer back to curr", "From the root to the leftmost leaf", "From a leaf to its parent"], a: 1, why: "The predecessor (rightmost node of curr.left) has a null right pointer; pointing it at curr lets you climb back up without a stack." },
      { q: "Deleting a BST node with two children: what replaces its value?", o: ["Its left child's value", "The max of its left subtree (or min of its right subtree)", "The root's value", "Any leaf's value"], a: 1, why: "The in-order predecessor or successor is the only value that keeps everything on the left smaller and everything on the right larger." },
      { q: "In the one-pass LCA in a binary tree, when is the current node the answer?", o: ["When it equals v1", "When both recursive calls return non-null", "When it is a leaf", "When the left call returns null"], a: 1, why: "If v1 is found in one subtree and v2 in the other, this is the deepest node above both." },
      { q: "For equal tree partition, why check only child subtree sums and never the whole tree's sum?", o: ["It's faster", "The whole tree isn't separated by cutting an edge", "Children are always smaller", "To avoid negative numbers"], a: 1, why: "Cutting an edge separates a proper subtree. Comparing the whole tree with total/2 would only match when total = 0 and give a false 'yes'." }
    ]
  };

  /* ═════════════════════════ TOPIC: GRAPHS ═════════════════════════ */
  T["graphs"] = {
    name: "Graphs", icon: "🕸️", color: "#7c3aed", minutes: 120,
    notes: "graph1.pdf – graph5.pdf",
    summary: "Nodes joined by edges: pick the traversal (DFS, BFS, heap, DSU) that matches what the question asks about the connections.",
    sections: [
      { h: "What a graph is and how to store it", blocks: [
        ["analogy", "Computers on a LAN, cities joined by roads, friends in a social network. A tree is a special graph: it has a root, N nodes with N − 1 edges, and no cycle. A general graph drops all three rules."],
        ["table", ["Property", "Meaning", "Example from the notes"], [
          ["Directed vs undirected", "edge i → j only goes one way / goes both ways", "prerequisites are directed; roads usually not"],
          ["Connected vs disconnected", "every node reachable from every other, or not", "1-2-3-4 plus a separate 5-6"],
          ["Weighted vs unweighted", "edges carry a cost, or all cost 1", "1 → 2 with weight 5"],
          ["Cyclic vs acyclic", "you can walk back to where you started", "2 → 3 → 4 → 2 is a cycle; 1 → 2 → 3 → 4 with 2 → 4 only looks like one"],
          ["Degree", "edges touching a node; directed graphs split it into in-degree and out-degree", "in-degree 2, out-degree 3"],
          ["Simple graph", "no self-loops (1 → 1) and no multi-edges (A–B three times)", "Kruskal and Prim clean these up first"]]],
        ["table", ["Storage", "Space", "Edge check", "Use when"], [
          ["Adjacency matrix mat[i][j]", "O(V²)", "O(1)", "dense graphs, Floyd-Warshall"],
          ["Adjacency list graph[u] = [v…] (or [(v, w)…])", "O(V + E)", "O(deg u)", "the default for almost everything"],
          ["Edge list [(u, v, w)…]", "O(E)", "O(E)", "Kruskal, Bellman-Ford"]]],
        ["code", "# undirected graph 1..6: edges 1-2 1-3 2-4 2-5 3-4 3-5 4-6 5-6\ngraph = [[] for _ in range(N + 1)]\nfor u, v in edges:\n    graph[u].append(v)\n    graph[v].append(u)        # skip this line for a directed graph\n# graph[2] == [1, 4, 5]\n# weighted: graph[u].append((v, w))"],
        ["tip", "Complexities use N (or V) nodes and E edges. A traversal that visits every node and edge once is O(V + E), not O(V²), when you use an adjacency list."]
      ] },
      { h: "DFS: components, cycles and islands", blocks: [
        ["p", "DFS goes as deep as possible before backing up. A <code>visited[]</code> array stops infinite loops on cycles, and an <b>outer loop over every node</b> covers disconnected parts."],
        ["viz", "dfs", "DFS: the recursion stack is the current path from the start."],
        ["viz", "islands", "Number of islands = number of times the outer loop has to start a new DFS."],
        ["probs", [
          { t: "DFS of a whole (possibly disconnected) graph", d: "Easy", q: "Visit every node.",
            ex: "Directed, N = 8: 0→1; 1→2, 4; 2→3; 3→1; 5→6; 6→7\nDFS from 0: 0 1 2 3 4, then the outer loop restarts at 5: 5 6 7",
            ap: [
              { n: "Solution", cx: "O(V + E) time · O(V) space",
                idea: "Recursive DFS with visited[], called from a <b>loop over all nodes</b> so every component gets a start. Without the outer loop, nodes 5, 6, 7 in the example are never reached.",
                code: "def dfs_all(N, graph):\n    visited = [False] * N\n    order = []\n\n    def dfs(u):\n        visited[u] = True\n        order.append(u)\n        for v in graph[u]:\n            if not visited[v]:\n                dfs(v)\n\n    for i in range(N):                  # restart in every component\n        if not visited[i]:\n            dfs(i)\n    return order" }
            ],
            viz: "dfs" },
          { t: "Detect a cycle in a directed graph", d: "Medium", q: "Does the directed graph contain a cycle?",
            ex: "0→1, 1→2, 2→3, 3→1, 1→4 → true (1→2→3→1)\n0→1, 1→2, 1→3, 2→3, 1→4 → false",
            ap: [
              { n: "Brute force", cx: "O(V · (V + E)) time · O(V) space",
                idea: "A cycle exists iff some node can walk back to itself, so run a fresh search from every node. (The shortcut 'I reached a visited node, so there's a cycle' is <b>wrong</b>: in the second example 3 is reached via 2 and again directly from 1. That's a cross edge, not a cycle.)",
                code: "def has_cycle(N, graph):\n    def reaches(start, target):\n        seen = [False] * N\n        stack = [start]\n        while stack:\n            u = stack.pop()\n            for v in graph[u]:\n                if v == target:\n                    return True\n                if not seen[v]:\n                    seen[v] = True\n                    stack.append(v)\n        return False\n\n    # a cycle exists iff some node can walk back to itself\n    return any(reaches(u, u) for u in range(N))" },
              { n: "Optimal", cx: "O(V + E) time · O(V) space",
                idea: "One DFS. A cycle exists iff DFS reaches a node that is <b>on the current recursion path</b> (a back edge). Keep a second array <code>path[]</code>: true on entry, false when you backtrack.",
                code: "def has_cycle(N, graph):\n    visited = [False] * N\n    path = [False] * N                  # on the current recursion path?\n\n    def dfs(u):\n        visited[u] = True\n        path[u] = True\n        for v in graph[u]:\n            if path[v]:\n                return True             # back edge: cycle\n            if not visited[v] and dfs(v):\n                return True\n        path[u] = False                 # backtrack\n        return False\n\n    for i in range(N):\n        if not visited[i] and dfs(i):\n            return True\n    return False" }
            ],
            edge: "self-loop: path[u] is already true, so it's caught. Never use this on undirected graphs: the edge back to the parent would look like a cycle (use DSU or a parent check).", lc: "course-schedule" },
          { t: "Course schedule", d: "Medium", q: "x is a prerequisite of y (edge x → y). Can you finish every course?",
            ex: "N = 5: 1→2, 3; 2→3, 5; 3→4; 4→2 → not possible (2→3→4→2)",
            ap: [
              { n: "Brute force", cx: "O(N! · E) time · O(N) space",
                idea: "Try every ordering of the courses and check whether all prerequisites come first. Factorial, hopeless past about 10 courses.",
                code: "from itertools import permutations\n\ndef can_finish(N, edges):\n    for order in permutations(range(N)):\n        pos = {c: i for i, c in enumerate(order)}\n        if all(pos[x] < pos[y] for x, y in edges):\n            return True\n    return False" },
              { n: "Optimal", cx: "O(V + E) time · O(V) space",
                idea: "You can finish iff the directed graph has <b>no cycle</b>. Either the path[] DFS above, or Kahn's algorithm: take courses whose prerequisites are all done; if fewer than N come out, a cycle blocked the rest.",
                code: "from collections import deque\n\ndef can_finish(N, edges):\n    graph = [[] for _ in range(N)]\n    indeg = [0] * N\n    for x, y in edges:                  # x is a prerequisite of y\n        graph[x].append(y)\n        indeg[y] += 1\n    q = deque(i for i in range(N) if indeg[i] == 0)\n    done = 0\n    while q:\n        u = q.popleft()\n        done += 1\n        for v in graph[u]:\n            indeg[v] -= 1\n            if indeg[v] == 0:\n                q.append(v)\n    return done == N                    # fewer than N: a cycle blocked some" }
            ],
            viz: "topo", lc: "course-schedule" },
          { t: "Number of islands", d: "Medium", q: "Count groups of 1s connected up / down / left / right.",
            ex: "1 1 0 0 1\n0 1 0 1 0\n1 0 0 1 1\n1 1 0 0 0\n1 0 1 1 1\nAnswer: 5 (with diagonals counted too: 2)",
            ap: [
              { n: "Solution", cx: "O(R·C) time · O(R·C) space",
                idea: "Each land cell is a node with edges to adjacent land. Islands = <b>connected components</b>. Scan the grid; each unvisited land cell starts a DFS that floods its island. Use direction arrays <code>dx = [-1, 0, 1, 0]</code>, <code>dy = [0, -1, 0, 1]</code>. For the 8-direction variant add the 4 diagonals.",
                code: "def num_islands(g):\n    R, C = len(g), len(g[0])\n    seen = [[False] * C for _ in range(R)]\n    dx = [-1, 0, 1, 0]\n    dy = [0, -1, 0, 1]\n\n    def dfs(i, j):\n        seen[i][j] = True\n        for k in range(4):\n            a = i + dx[k]\n            b = j + dy[k]\n            if 0 <= a < R and 0 <= b < C and g[a][b] == 1 and not seen[a][b]:\n                dfs(a, b)\n\n    count = 0\n    for i in range(R):\n        for j in range(C):\n            if g[i][j] == 1 and not seen[i][j]:\n                dfs(i, j)               # flood the whole island\n                count += 1\n    return count" }
            ],
            edge: "empty grid, all water, all land (recursion depth R·C: use BFS or an explicit stack on big grids). You may mark visited in place by overwriting 1 with 0 if allowed.", viz: "islands", lc: "number-of-islands" },
          { t: "Knights rearrangement", d: "Hard", q: "K knights on an N×N board. Two knights can swap if a chain of knight moves between knights links them. How many distinct arrangements?",
            ex: "6×6, knights at (0,3) (1,0) (2,4) (2,5) (3,1) (4,3) (4,4)\nComponents of size 5 and 2 → 5! × 2! = 240",
            ap: [
              { n: "Brute force", cx: "O(K! · K²) time · O(K! · K) space",
                idea: "Simulate: two knights a knight's move apart may swap; BFS over whole arrangements and count the distinct ones. The state count explodes (up to K!).",
                code: "from collections import deque\n\ndef count_arrangements(knights):\n    K = len(knights)\n    pairs = []\n    for i in range(K):\n        for j in range(i + 1, K):\n            dr = abs(knights[i][0] - knights[j][0])\n            dc = abs(knights[i][1] - knights[j][1])\n            if {dr, dc} == {1, 2}:\n                pairs.append((i, j))    # these two may swap directly\n    start = tuple(range(K))             # which knight stands on each square\n    seen = {start}\n    q = deque([start])\n    while q:\n        state = q.popleft()\n        for i, j in pairs:\n            nxt = list(state)\n            nxt[i], nxt[j] = nxt[j], nxt[i]\n            nxt = tuple(nxt)\n            if nxt not in seen:\n                seen.add(nxt)\n                q.append(nxt)\n    return len(seen)" },
              { n: "Optimal", cx: "O(K · 8) time + factorial precompute · O(K) space",
                idea: "Knights are nodes, an edge joins two knights a knight's move apart. Inside a connected component any permutation is reachable, so <b>answer = product of (component size)!</b> (mod 1e9+7). Find components with DFS / BFS / DSU over the 8 knight moves.",
                code: "MOD = 10**9 + 7\n\ndef count_arrangements(knights):\n    spots = set(knights)                # knights as (row, col) tuples\n    moves = [(1, 2), (2, 1), (2, -1), (1, -2),\n             (-1, -2), (-2, -1), (-2, 1), (-1, 2)]\n    fact = [1] * (len(knights) + 1)\n    for i in range(1, len(fact)):\n        fact[i] = fact[i - 1] * i % MOD\n    seen = set()\n    ans = 1\n    for k in knights:\n        if k in seen:\n            continue\n        seen.add(k)\n        stack = [k]\n        size = 0\n        while stack:                    # DFS over one component\n            r, c = stack.pop()\n            size += 1\n            for dr, dc in moves:\n                nb = (r + dr, c + dc)\n                if nb in spots and nb not in seen:\n                    seen.add(nb)\n                    stack.append(nb)\n        ans = ans * fact[size] % MOD    # any order inside a component\n    return ans" }
            ] }
        ]]
      ] },
      { h: "Topological sort and Union-Find", blocks: [
        ["p", "A <b>topological order</b> lists the nodes so that for every edge i → j, i comes before j. It exists only for a <b>DAG</b> and is usually not unique: 1 → 2, 1 → 3, 2 → 5, 3 → 4, 4 → 5 allows 1 2 3 4 5, 1 3 2 4 5 and 1 3 4 2 5."],
        ["viz", "topo", "Kahn's algorithm: a node is ready only when its in-degree reaches 0."],
        ["probs", [
          { t: "Topological sort, method 1: Kahn (in-degree + queue)", d: "Medium", q: "Output a topological order.",
            ex: "N = 7: 0→1, 0→3, 1→2, 1→3, 2→4, 2→5, 3→4, 4→5, 6→3, 6→5\nin = [0, 1, 1, 3, 2, 3, 0]\nOrder: 0 6 1 2 3 4 5",
            ap: [
              { n: "Brute force", cx: "O(V² + E) time · O(V) space",
                idea: "Repeatedly scan all nodes for one with no remaining incoming edges, output it, and remove its edges. The scan is O(V) per output node.",
                code: "def topo_sort(N, graph):\n    indeg = [0] * N\n    for u in range(N):\n        for v in graph[u]:\n            indeg[v] += 1\n    done = [False] * N\n    order = []\n    for _ in range(N):\n        # scan every node for one whose prerequisites are all output\n        pick = next((u for u in range(N) if not done[u] and indeg[u] == 0), None)\n        if pick is None:\n            return None                 # cycle\n        done[pick] = True\n        order.append(pick)\n        for v in graph[pick]:\n            indeg[v] -= 1\n    return order" },
              { n: "Optimal", cx: "O(V + E) time · O(V) space",
                idea: "Compute in-degrees. Queue every node with in-degree 0. Pop r, output it, and decrement each neighbour; when one hits 0, enqueue it. In-degree 0 means <b>all its prerequisites are already output</b>. Bonus: if fewer than N nodes come out, there's a cycle.",
                code: "from collections import deque\n\ndef topo_sort(N, graph):\n    indeg = [0] * N\n    for u in range(N):\n        for v in graph[u]:\n            indeg[v] += 1\n    q = deque(u for u in range(N) if indeg[u] == 0)\n    order = []\n    while q:\n        r = q.popleft()\n        order.append(r)\n        for v in graph[r]:\n            indeg[v] -= 1\n            if indeg[v] == 0:           # last prerequisite just finished\n                q.append(v)\n    if len(order) < N:\n        return None                     # a cycle kept some nodes waiting\n    return order" }
            ],
            edge: "you can't output a node as soon as <b>one</b> parent is done. With 0→1→2→3 and 6→2, 0 6 1 3 2 is wrong: 3 must wait for 2.", viz: "topo", lc: "course-schedule-ii" },
          { t: "Topological sort, method 2: DFS + stack", d: "Medium", q: "Same problem with DFS.",
            ex: "Same graph. Finish order pushes 5 4 2 3 1 0 6 onto the stack\nPopping gives 6 0 1 3 2 4 5",
            ap: [
              { n: "Solution", cx: "O(V + E) time · O(V) space",
                idea: "Push a node <b>after</b> all its descendants finish (post-order). Reversed finishing order is a valid topological order.",
                code: "def topo_sort(N, graph):\n    visited = [False] * N\n    st = []\n\n    def dfs(u):\n        visited[u] = True\n        for v in graph[u]:\n            if not visited[v]:\n                dfs(v)\n        st.append(u)                    # pushed after all its descendants\n\n    for i in range(N):\n        if not visited[i]:\n            dfs(i)\n    return st[::-1]" }
            ],
            edge: "this alone doesn't detect cycles. Add the path[] check if the input may be cyclic." }
        ]],
        ["p", "<b>Disjoint Set Union (DSU)</b> keeps elements in disjoint sets. Each set is a tree of parent pointers whose root points to itself; two elements are in the same set iff they have the same root."],
        ["viz", "unionFind", "Union-Find: an edge between two nodes that already share a root closes a cycle."],
        ["probs", [
          { t: "DSU: find and union", d: "Medium", q: "Start with N singletons. For each query (u, v): if they're in different sets, merge and return true, else return false.",
            ex: "N = 4: (1,2) true · (3,4) true · (1,2) false · (1,3) true · (2,3) false\nTrace: par[1] = 2, par[3] = 4, then union(1,3) must set par[root(1) = 2] = root(3) = 4",
            ap: [
              { n: "Brute force", cx: "O(N) per operation (long chains) · O(N) space",
                idea: "Basic find walks the parent chain to the root. Only a <b>root's</b> parent may change in union (setting par[1] = 3 would cut 1 off from 2). Correct, but chains can grow N long.",
                code: "class DSU:\n    def __init__(self, n):\n        self.par = list(range(n + 1))\n\n    def find(self, x):\n        while self.par[x] != x:         # walk up: O(N) on a long chain\n            x = self.par[x]\n        return x\n\n    def union(self, a, b):\n        ra = self.find(a)\n        rb = self.find(b)\n        if ra == rb:\n            return False\n        self.par[ra] = rb               # only a root's parent may change\n        return True" },
              { n: "Optimal", cx: "≈ O(α(N)) per operation · O(N) space",
                idea: "<b>Path compression</b>: during find, point every node on the path straight at the root. <b>Union by rank</b>: hang the shorter tree under the taller one. Together: about O(α(N)), effectively constant.",
                code: "class DSU:\n    def __init__(self, n):\n        self.par = list(range(n + 1))\n        self.rank = [0] * (n + 1)\n\n    def find(self, x):\n        if self.par[x] != x:\n            self.par[x] = self.find(self.par[x])   # path compression\n        return self.par[x]\n\n    def union(self, a, b):\n        ra = self.find(a)\n        rb = self.find(b)\n        if ra == rb:\n            return False\n        if self.rank[ra] < self.rank[rb]:\n            ra, rb = rb, ra\n        self.par[rb] = ra               # shorter tree under the taller one\n        if self.rank[ra] == self.rank[rb]:\n            self.rank[ra] += 1\n        return True" }
            ],
            viz: "unionFind", lc: "number-of-provinces" },
          { t: "Cycle in an undirected graph (DSU)", d: "Medium", q: "Does an undirected graph contain a cycle?",
            ex: "N = 6: (1,2) (2,3) (2,4) (3,4) (5,6) → union(3,4) fails → cycle 2-3-4",
            ap: [
              { n: "Brute force", cx: "O(E · (V + E)) time · O(V + E) space",
                idea: "An edge closes a cycle iff its ends are still connected without it. So for every edge, drop it and search from u to v. (A single DFS with a parent check is also O(V + E).)",
                code: "def has_cycle(N, edges):\n    for skip in range(len(edges)):\n        graph = [[] for _ in range(N + 1)]\n        for i, (a, b) in enumerate(edges):\n            if i != skip:\n                graph[a].append(b)\n                graph[b].append(a)\n        u, v = edges[skip]\n        seen = {u}\n        stack = [u]\n        while stack:\n            x = stack.pop()\n            for y in graph[x]:\n                if y not in seen:\n                    seen.add(y)\n                    stack.append(y)\n        if v in seen:\n            return True                 # u and v connected without this edge\n    return False" },
              { n: "Optimal", cx: "O(E · α(N)) time · O(V) space",
                idea: "Union each edge. If <code>union(u, v)</code> returns false, u and v were <b>already connected</b>, so this edge closes a cycle.",
                code: "def has_cycle(N, edges):\n    dsu = DSU(N)                        # find/union from the problem above\n    for u, v in edges:\n        if not dsu.union(u, v):\n            return True                 # already connected: closes a cycle\n    return False" }
            ],
            lc: "redundant-connection" },
          { t: "Is the graph connected? How many components?", d: "Easy", q: "Count connected components.",
            ex: "Edges (1,2) (2,3) (2,4) (3,4) (5,6) → {1..4} and {5,6}: not connected, 2 components",
            ap: [
              { n: "Solution", cx: "O((V + E) · α(N)) time · O(V) space",
                idea: "Union all edges, then count <b>distinct roots</b>. One root means connected. (BFS/DFS from each unvisited node, counting the starts, works just as well.)",
                code: "def count_components(N, edges):\n    dsu = DSU(N)\n    for u, v in edges:\n        dsu.union(u, v)\n    roots = {dsu.find(i) for i in range(1, N + 1)}\n    return len(roots)                   # 1 root: connected" }
            ],
            lc: "number-of-connected-components-in-an-undirected-graph" }
        ]]
      ] },
      { h: "BFS: levels, many sources, two colours", blocks: [
        ["p", "BFS is level-order traversal for graphs: a queue plus visited[], restarted from every unvisited node. Because it expands in rings, the first time it reaches a node is along a <b>fewest-edges</b> path."],
        ["viz", "bfs", "BFS: the distance tag on each node is the number of edges from the start."],
        ["warn", "Mark a node visited <b>when you enqueue it</b>, not when you dequeue it. Otherwise the same node can be queued many times."],
        ["probs", [
          { t: "BFS traversal (and DFS vs BFS)", d: "Easy", q: "Visit every node in BFS order.",
            ex: "Edges 1-2 1-8 1-5 2-3 3-4 3-6 5-6 6-7 6-9 8-9 9-10\nDFS from 1: 1 2 3 4 6 5 7 9 8 10\nBFS from 1: 1 2 5 8 3 6 9 4 7 10",
            ap: [
              { n: "Solution", cx: "O(V + E) time · O(V) space",
                idea: "Queue the source and mark it. Pop r; for each unvisited neighbour, <b>mark it, then push it</b>. Store <code>dist[v] = dist[r] + 1</code> to get unweighted shortest paths.",
                code: "from collections import deque\n\ndef bfs(graph, s, N):\n    seen = [False] * (N + 1)\n    dist = [-1] * (N + 1)\n    order = []\n    q = deque([s])\n    seen[s] = True                      # mark on enqueue\n    dist[s] = 0\n    while q:\n        r = q.popleft()\n        order.append(r)\n        for v in graph[r]:\n            if not seen[v]:\n                seen[v] = True\n                dist[v] = dist[r] + 1\n                q.append(v)\n    return order, dist" }
            ],
            viz: "bfs" },
          { t: "Nearest hospital for every cell", d: "Medium", q: "Grid of R (residence) and H (hospital), 4-directional moves. Distance from each cell to its nearest hospital.",
            ex: "R R R H        3 2 1 0\nR R H H   →    2 1 0 0\nR H H R        1 0 0 1",
            ap: [
              { n: "Brute force", cx: "O((R·C)²) time · O(R·C) space",
                idea: "Run a separate BFS from every residence until it hits a hospital. Each BFS can cover the whole grid.",
                code: "from collections import deque\n\ndef nearest(g):\n    R, C = len(g), len(g[0])\n    ans = [[0] * C for _ in range(R)]\n    for si in range(R):\n        for sj in range(C):\n            if g[si][sj] == 'H':\n                continue\n            # BFS from this residence until the first hospital\n            ans[si][sj] = -1\n            dist = {(si, sj): 0}\n            q = deque([(si, sj)])\n            while q:\n                i, j = q.popleft()\n                if g[i][j] == 'H':\n                    ans[si][sj] = dist[(i, j)]\n                    break\n                for a, b in ((i - 1, j), (i + 1, j), (i, j - 1), (i, j + 1)):\n                    if 0 <= a < R and 0 <= b < C and (a, b) not in dist:\n                        dist[(a, b)] = dist[(i, j)] + 1\n                        q.append((a, b))\n    return ans" },
              { n: "Optimal", cx: "O(R·C) time · O(R·C) space",
                idea: "<b>Multi-source BFS</b>: push <b>all</b> hospitals at distance 0 together, then run one BFS. It's like one invisible super-source joined to every hospital. The first time a cell is reached is its nearest-hospital distance.",
                code: "from collections import deque\n\ndef nearest(g):\n    R, C = len(g), len(g[0])\n    dist = [[-1] * C for _ in range(R)]\n    q = deque()\n    for i in range(R):\n        for j in range(C):\n            if g[i][j] == 'H':\n                dist[i][j] = 0          # every hospital starts at 0\n                q.append((i, j))\n    while q:\n        i, j = q.popleft()\n        for a, b in ((i - 1, j), (i + 1, j), (i, j - 1), (i, j + 1)):\n            if 0 <= a < R and 0 <= b < C and dist[a][b] == -1:\n                dist[a][b] = dist[i][j] + 1   # first visit = nearest\n                q.append((a, b))\n    return dist" }
            ],
            edge: "no hospitals → everything stays ∞ (−1). Blocked cells: just skip them.", viz: "tg_multiBFS", lc: "01-matrix" },
          { t: "Rotting oranges", d: "Medium", q: "2 = rotten, 1 = fresh, 0 = empty. Each minute rot spreads to 4 neighbours. Minutes until no fresh orange is left, or −1.",
            ex: "[[2,1,1],[1,1,0],[0,1,1]] → 4\n[[2,1,1],[0,1,1],[1,0,1]] → -1",
            ap: [
              { n: "Brute force", cx: "O((R·C)²) time · O(R·C) space",
                idea: "Simulate minute by minute: scan the whole grid for fresh oranges next to a rotten one, rot them all at once, repeat until nothing changes.",
                code: "def oranges_rotting(g):\n    R, C = len(g), len(g[0])\n    minutes = 0\n    while True:\n        to_rot = []\n        for i in range(R):\n            for j in range(C):\n                if g[i][j] != 1:\n                    continue\n                for a, b in ((i - 1, j), (i + 1, j), (i, j - 1), (i, j + 1)):\n                    if 0 <= a < R and 0 <= b < C and g[a][b] == 2:\n                        to_rot.append((i, j))\n                        break\n        if not to_rot:\n            break\n        for i, j in to_rot:\n            g[i][j] = 2                 # rot after the scan: one minute\n        minutes += 1\n    if any(1 in row for row in g):\n        return -1\n    return minutes" },
              { n: "Optimal", cx: "O(R·C) time · O(R·C) space",
                idea: "Exactly the hospital pattern: all rotten oranges are the sources. Answer = the <b>largest distance</b> reached; if some fresh orange is never reached, −1.",
                code: "from collections import deque\n\ndef oranges_rotting(g):\n    R, C = len(g), len(g[0])\n    q = deque()\n    fresh = 0\n    for i in range(R):\n        for j in range(C):\n            if g[i][j] == 2:\n                q.append((i, j, 0))     # every rotten orange is a source\n            elif g[i][j] == 1:\n                fresh += 1\n    minutes = 0\n    while q:\n        i, j, t = q.popleft()\n        minutes = max(minutes, t)\n        for a, b in ((i - 1, j), (i + 1, j), (i, j - 1), (i, j + 1)):\n            if 0 <= a < R and 0 <= b < C and g[a][b] == 1:\n                g[a][b] = 2             # mark on enqueue\n                fresh -= 1\n                q.append((a, b, t + 1))\n    return minutes if fresh == 0 else -1" }
            ],
            edge: "no fresh oranges at all → 0", viz: "tg_multiBFS", lc: "rotting-oranges" },
          { t: "Is the graph bipartite?", d: "Medium", q: "Can the nodes be split into two sets so every edge goes across?",
            ex: "0-1 0-3 2-1 2-3 4-3 4-5 4-6 → yes: {0, 2, 4} and {1, 3, 5, 6}",
            ap: [
              { n: "Brute force", cx: "O(2<sup>N</sup> · E) time · O(1) space",
                idea: "Try all 2<sup>N</sup> ways to split the nodes into two sides and check that every edge crosses.",
                code: "def is_bipartite(N, edges):\n    for mask in range(1 << N):          # bit i = side of node i\n        if all((mask >> u & 1) != (mask >> v & 1) for u, v in edges):\n            return True\n    return False" },
              { n: "Optimal", cx: "O(V + E) time · O(V) space",
                idea: "Bipartite ⇔ chromatic number 2 ⇔ <b>no odd cycle</b>. Colour each uncoloured node 0 and DFS (or BFS): give every uncoloured neighbour <code>1 − col[u]</code>; a neighbour with the <b>same</b> colour means an odd cycle. Loop over all components, colouring each start before its DFS.",
                code: "def is_bipartite(N, graph):\n    col = [-1] * N\n\n    def dfs(u):\n        for v in graph[u]:\n            if col[v] == col[u]:\n                return False            # same colour on an edge: odd cycle\n            if col[v] == -1:\n                col[v] = 1 - col[u]\n                if not dfs(v):\n                    return False\n        return True\n\n    for i in range(N):                  # every component\n        if col[i] == -1:\n            col[i] = 0\n            if not dfs(i):\n                return False\n    return True" }
            ],
            viz: "tg_bipartite", lc: "is-graph-bipartite" },
          { t: "Max edges you can add to a tree and keep it bipartite", d: "Medium", q: "Add as many edges as possible to a tree so it stays bipartite.",
            ex: "13-node tree: even levels x = 8 nodes, odd levels y = 5 nodes\nMax bipartite edges 8 × 5 = 40, tree already has 12 → add 28",
            ap: [
              { n: "Solution", cx: "O(N) time · O(N) space",
                idea: "A tree is always 2-colourable by level parity. A bipartite graph with sets of size x and y has at most <b>x · y</b> edges. So <b>answer = x · y − (N − 1)</b>.",
                code: "from collections import deque\n\ndef max_edges_to_add(N, graph):\n    side = [-1] * N\n    side[0] = 0\n    q = deque([0])\n    while q:                            # colour by level parity\n        u = q.popleft()\n        for v in graph[u]:\n            if side[v] == -1:\n                side[v] = 1 - side[u]\n                q.append(v)\n    x = side.count(0)\n    y = N - x\n    return x * y - (N - 1)              # max bipartite edges minus tree edges" }
            ] },
          { t: "Party: everyone needs at least K friends there", d: "Medium", q: "A person attends only if at least K of their friends attend. Maximum attendees?",
            ex: "K = 2: 1-2 2-3 3-4 3-5 4-5 5-6\nRemove 1 and 6 (degree 1) → 2 drops to 1, remove it → {3, 4, 5} remain: 3",
            ap: [
              { n: "Brute force", cx: "O(V · (V + E)) time · O(V) space",
                idea: "Trying subsets is exponential. A simpler correct brute force: sweep everyone, send home anyone with fewer than K friends still present, and repeat full sweeps until a sweep changes nothing.",
                code: "def max_guests(N, graph, K):\n    alive = [True] * N\n    changed = True\n    while changed:                      # full pass until nobody leaves\n        changed = False\n        for u in range(N):\n            if alive[u]:\n                friends = sum(1 for v in graph[u] if alive[v])\n                if friends < K:\n                    alive[u] = False\n                    changed = True\n    return sum(alive)" },
              { n: "Optimal", cx: "O(V + E) time · O(V) space (O((V + E) log V) with the notes' heap)",
                idea: "This is the <b>K-core</b>. Remove anyone whose current degree is below K and lower their friends' degrees; anyone who drops below K joins the queue (cascade). The notes use a min-heap by degree; a plain queue of 'below K' people works too.",
                code: "from collections import deque\n\ndef max_guests(N, graph, K):\n    deg = [len(graph[i]) for i in range(N)]\n    gone = [False] * N\n    q = deque()\n    for i in range(N):\n        if deg[i] < K:\n            gone[i] = True\n            q.append(i)\n    while q:\n        u = q.popleft()\n        for v in graph[u]:\n            if not gone[v]:\n                deg[v] -= 1             # v lost a friend\n                if deg[v] < K:\n                    gone[v] = True      # cascade\n                    q.append(v)\n    return N - sum(gone)" }
            ] },
          { t: "Word ladder", d: "Hard", q: "Fewest one-letter changes from beginWord to endWord using a dictionary.",
            ex: "hit → hot → dot → dog → cog: 5 words",
            ap: [
              { n: "Brute force", cx: "O(N² · L) time · O(N) space",
                idea: "BFS (it is an <b>unweighted shortest path</b>), but find each word's neighbours by comparing it with every dictionary word: O(N · L) per word.",
                code: "from collections import deque\n\ndef ladder_length(begin, end, words):\n    def one_apart(a, b):\n        return sum(x != y for x, y in zip(a, b)) == 1\n\n    q = deque([(begin, 1)])\n    seen = {begin}\n    while q:\n        w, steps = q.popleft()\n        if w == end:\n            return steps\n        for nb in words:                # compare with every word: O(N * L)\n            if nb not in seen and one_apart(w, nb):\n                seen.add(nb)\n                q.append((nb, steps + 1))\n    return 0" },
              { n: "Optimal", cx: "O(N · L · 26) time · O(N · L) space",
                idea: "Same BFS, but <b>generate</b> neighbours: try all 26 letters at each position and keep the ones in a hash set. That's 26 · L lookups per word instead of N comparisons.",
                code: "from collections import deque\nfrom string import ascii_lowercase\n\ndef ladder_length(begin, end, words):\n    word_set = set(words)\n    if end not in word_set:\n        return 0\n    q = deque([(begin, 1)])\n    seen = {begin}\n    while q:\n        w, steps = q.popleft()\n        if w == end:\n            return steps\n        for i in range(len(w)):\n            for ch in ascii_lowercase:  # 26 * L candidate neighbours\n                nb = w[:i] + ch + w[i + 1:]\n                if nb in word_set and nb not in seen:\n                    seen.add(nb)\n                    q.append((nb, steps + 1))\n    return 0" }
            ],
            lc: "word-ladder" }
        ]],
        ["viz", "tg_multiBFS", "Multi-source BFS spreads from every source at once. Try the rotting-oranges presets."],
        ["viz", "tg_bipartite", "Bipartite check: colours alternate along every edge until an odd cycle forces a clash."],
        ["extra", "Colouring facts from the notes: a tree (with an edge) always needs exactly 2 colours. A cycle graph needs <b>2 + (N % 2)</b>: 2 for even length, 3 for odd. A bipartite graph with sides N and M has at most N · M edges."]
      ] },
      { h: "Minimum spanning trees: Prim and Kruskal", blocks: [
        ["p", "Scenario (Flipkart logistics): N delivery centres and possible roads with build costs. Connect every centre at minimum total cost. Fewest edges that connect N nodes is N − 1, which is a <b>tree</b>; the cheapest such tree is the <b>Minimum Spanning Tree</b>."],
        ["math", [["N = 7 example", "2-4 (1) + 4-6 (2) + 1-2 (3) + 3-5 (3) + 6-7 (3) + 2-5 (5)", "17"], ["N = 5 example", "2-4 (1) + 3-5 (3) + 1-3 (5) + 2-5 (5)", "14"]], "With tied weights the MST itself may not be unique, but its total weight is."],
        ["viz", "tg_prim", "Prim: always add the cheapest edge leaving the tree. Stale heap entries are skipped."],
        ["viz", "tg_kruskal", "Kruskal: cheapest edges first, skipping any that join two nodes already in the same DSU set."],
        ["probs", [
          { t: "Prim's algorithm (corrected)", d: "Medium", q: "MST weight by growing one tree from a start node.",
            ex: "Nodes 0..5: 0-1 (7), 3-0 (8), 1-2 (6), 1-2 (8), 1-3 (3), 2-3 (4), 2-4 (2), 2-5 (5), 4-5 (5), 3-4 (3)\nAdded: 0 (0), 1 (7), 3 (3), 4 (3), 2 (2), 5 (5) → 20",
            ap: [
              { n: "Brute force", cx: "O(V · E) time · O(V) space",
                idea: "Version 1 from the notes: each time a node joins, scan the whole edge list for the cheapest edge with exactly one end in the tree.",
                code: "def prim(N, edges):\n    in_tree = [False] * N\n    in_tree[0] = True\n    total = 0\n    for _ in range(N - 1):\n        best = None\n        for u, v, w in edges:           # cheapest edge crossing the cut\n            if in_tree[u] != in_tree[v]:\n                if best is None or w < best[2]:\n                    best = (u, v, w)\n        if best is None:\n            return None                 # disconnected\n        in_tree[best[0]] = True\n        in_tree[best[1]] = True\n        total += best[2]\n    return total" },
              { n: "Optimal", cx: "O(E log E) time · O(V + E) space",
                idea: "Min-heap of (weight, node). Pop the smallest; if the node is already in the tree it's a <b>stale</b> entry, skip it. Otherwise add it and its weight, and push edges to its unvisited neighbours. <b>Fix to the notes' code:</b> don't set visited[start] before the loop, or the first pop (start, 0) gets skipped and nothing is ever added. Mark only on pop.",
                code: "import heapq\n\ndef prim(N, graph):\n    seen = [False] * N\n    pq = [(0, 0)]                       # (edge weight, node); start NOT pre-marked\n    total = 0\n    while pq:\n        w, v = heapq.heappop(pq)\n        if seen[v]:\n            continue                    # stale entry\n        seen[v] = True                  # mark on pop\n        total += w\n        for nb, wt in graph[v]:\n            if not seen[nb]:\n                heapq.heappush(pq, (wt, nb))\n    return total if all(seen) else None" }
            ],
            edge: "disconnected graph: only one component is covered, so check the visited count. Self-loops are skipped automatically; multi-edges are fine.", viz: "tg_prim", lc: "min-cost-to-connect-all-points" },
          { t: "Kruskal's algorithm", d: "Medium", q: "MST weight by picking edges globally.",
            ex: "N = 6: 1-2 (7), 1-4 (8), 2-3 (6), 2-4 (3), 2-3 (8), 3-4 (4), 3-5 (2), 3-6 (5), 4-5 (3), 5-6 (5), self-loop on 6\nTake 3-5, 2-4, 4-5; reject 3-4; take 3-6; reject 5-6, 2-3; take 1-2 → 20",
            ap: [
              { n: "Brute force", cx: "O(C(E, V−1) · V) time · O(V) space",
                idea: "Try every set of N − 1 edges; it is a spanning tree iff it has no cycle. Keep the cheapest. Exponential.",
                code: "from itertools import combinations\n\ndef mst_brute(N, edges):\n    best = None\n    for subset in combinations(edges, N - 1):\n        dsu = DSU(N)\n        # N - 1 edges and no cycle: a spanning tree\n        if all(dsu.union(u, v) for u, v, _ in subset):\n            cost = sum(w for _, _, w in subset)\n            if best is None or cost < best:\n                best = cost\n    return best" },
              { n: "Optimal", cx: "O(E log E + E · α) time · O(V + E) space",
                idea: "Drop self-loops and keep the cheapest multi-edge. <b>Sort edges by weight</b> and take each one <b>unless it forms a cycle</b>, which DSU tells you in near O(1): take (u, v) only if find(u) != find(v). Stop at N − 1 edges.",
                code: "def kruskal(N, edges):\n    edges = sorted(edges, key=lambda e: e[2])\n    dsu = DSU(N)\n    total = 0\n    used = 0\n    for u, v, w in edges:\n        if dsu.union(u, v):             # different sets: no cycle\n            total += w\n            used += 1\n            if used == N - 1:\n                break\n    return total if used == N - 1 else None" }
            ],
            edge: "fewer than N − 1 edges taken → the graph is disconnected", viz: "tg_kruskal" }
        ]],
        ["table", ["", "Prim", "Kruskal"], [
          ["Thinks in", "nodes: grow one tree", "edges: merge a forest"],
          ["Needs", "adjacency list + min-heap", "sorted edge list + DSU"],
          ["Best for", "dense graphs", "sparse edge lists"],
          ["Time", "O(E log E)", "O(E log E)"]]]
      ] },
      { h: "Shortest paths", blocks: [
        ["p", "Pick the algorithm by the edge weights: all 1 → BFS; only 0 and 1 → 0-1 BFS; non-negative → Dijkstra; some negative → Bellman-Ford; every pair on a small graph → Floyd-Warshall."],
        ["viz", "dijkstra", "Dijkstra: always expand the node with the smallest distance so far. Once popped, its distance is final."],
        ["probs", [
          { t: "Dijkstra's algorithm", d: "Medium", q: "You live in city 1. Minimum distance to every city (weights ≥ 0).",
            ex: "1-2 (7), 1-3 (8), 2-3 (3), 2-4 (6), 3-4 (4), 3-5 (3), 4-5 (2), 4-6 (5), 5-6 (5), 6-7 (3), 5-7 (2)\ndist = [0, 7, 8, 12, 11, 16, 13] for cities 1..7",
            ap: [
              { n: "Brute force", cx: "exponential time · O(V) space",
                idea: "Try every simple path from the source with DFS and keep the cheapest per node.",
                code: "def shortest_brute(graph, src, N):\n    best = [float('inf')] * (N + 1)\n    on_path = [False] * (N + 1)\n\n    def dfs(u, d):\n        best[u] = min(best[u], d)\n        on_path[u] = True\n        for v, w in graph[u]:\n            if not on_path[v]:\n                dfs(v, d + w)\n        on_path[u] = False\n\n    dfs(src, 0)\n    return best" },
              { n: "Better", cx: "O(V² + E) time · O(V) space",
                idea: "Classic array Dijkstra: repeatedly <b>scan</b> for the closest unfinished node, finalise it, relax its edges. Good for dense graphs; the scan is O(V) per step.",
                code: "def dijkstra(graph, src, N):\n    INF = float('inf')\n    dist = [INF] * (N + 1)\n    done = [False] * (N + 1)\n    dist[src] = 0\n    for _ in range(N):\n        # scan for the closest unfinished node: O(V) per step\n        u = -1\n        for v in range(1, N + 1):\n            if not done[v] and (u == -1 or dist[v] < dist[u]):\n                u = v\n        if u == -1 or dist[u] == INF:\n            break\n        done[u] = True\n        for v, w in graph[u]:\n            if dist[u] + w < dist[v]:\n                dist[v] = dist[u] + w\n    return dist" },
              { n: "Optimal", cx: "O(E log E) time · O(E) space (heap entries)",
                idea: "Min-heap of (distance so far, node). The <b>first time a node is popped, its distance is final</b>: any other route already costs at least as much. Later, larger entries for it (like (17, 6) after (16, 6)) are stale and skipped. Unlike Prim, compare the <b>total distance from the source</b>, not the single edge.",
                code: "import heapq\n\ndef dijkstra(graph, src, N):\n    INF = float('inf')\n    dist = [INF] * (N + 1)\n    pq = [(0, src)]\n    while pq:\n        d, v = heapq.heappop(pq)\n        if dist[v] != INF:\n            continue                    # already final: stale entry\n        dist[v] = d                     # first pop is the shortest\n        for nb, w in graph[v]:\n            if dist[nb] == INF:\n                heapq.heappush(pq, (d + w, nb))\n    return dist" }
            ],
            edge: "unreachable nodes stay ∞. Guard against overflow when adding to INF.", viz: "dijkstra", lc: "network-delay-time" },
          { t: "Why Dijkstra fails with a negative edge", d: "Easy", q: "Show Dijkstra giving a wrong answer.",
            ex: "1→2 (5), 1→3 (6), 3→2 (−2), 2→4 (2)\nTrue 1→4 = 1→3→2→4 = 6 − 2 + 2 = 6\nDijkstra finalises 2 at 5 and reports 7",
            ap: [
              { n: "Solution",
                idea: "Greedy 'first pop is final' assumes extending a path never makes it cheaper. A negative edge breaks that: here 2 is popped and finalised at 5 before the cheaper route 1→3→2 (6 − 2 = 4) is seen, so 4 ends up at 7 instead of 6. And with a <b>negative cycle</b> (2→3→5→4→2 totalling −2 in the notes) going round again always lowers the cost, so the shortest distance isn't even defined. Use Bellman-Ford." }
            ] },
          { t: "Bellman-Ford (corrected)", d: "Medium", q: "Single-source shortest paths when some edges are negative; also detect a negative cycle.",
            ex: "Edges in order: 5→6 (−3), 4→5 (2), 1→4 (10), 3→4 (−8), 2→3 (−6), 1→2 (11); src 1\nRound 1: d4 = 10, d2 = 11 · Round 2: d5 = 12, d3 = 5 · Round 3: d6 = 9, d4 = −3\nRound 4: d5 = −1 · Round 5: d6 = −4\nFinal: [0, 11, 5, −3, −1, −4]",
            ap: [
              { n: "Brute force", cx: "exponential time · O(V) space",
                idea: "Dijkstra is wrong with negative edges. Trying every simple path (DFS, as in the Dijkstra brute force) is correct when there is no negative cycle, but exponential.",
                code: "def shortest_brute(graph, src, N):\n    best = [float('inf')] * (N + 1)\n    on_path = [False] * (N + 1)\n\n    def dfs(u, d):\n        best[u] = min(best[u], d)\n        on_path[u] = True\n        for v, w in graph[u]:           # simple paths only\n            if not on_path[v]:\n                dfs(v, d + w)\n        on_path[u] = False\n\n    dfs(src, 0)\n    return best" },
              { n: "Optimal", cx: "O(V · E) time · O(V) space",
                idea: "Relax <b>every edge</b>, N − 1 times. A shortest simple path has at most N − 1 edges, and each round fixes at least one more edge of it, whatever the edge order. Then run <b>one more round</b>: if anything still improves, there's a negative cycle. <b>Fix to the notes' code:</b> skip edges whose source is still ∞ (<code>dist[u] != INF</code>), or INF + negative overflows into a fake 'improvement'. Stop early if a round changes nothing.",
                code: "def bellman_ford(N, edges, src):\n    INF = float('inf')\n    dist = [INF] * (N + 1)\n    dist[src] = 0\n    for _ in range(N - 1):\n        changed = False\n        for u, v, w in edges:\n            if dist[u] != INF and dist[u] + w < dist[v]:\n                dist[v] = dist[u] + w\n                changed = True\n        if not changed:\n            break                       # nothing moved: stop early\n    for u, v, w in edges:               # one extra round\n        if dist[u] != INF and dist[u] + w < dist[v]:\n            return None                 # negative cycle\n    return dist" }
            ],
            viz: "tg_bellman", lc: "cheapest-flights-within-k-stops" },
          { t: "Floyd-Warshall (all pairs)", d: "Medium", q: "Shortest distance between every pair of nodes.",
            ex: "0→1 (9), 1→0 (6), 0→2 (−4), 2→1 (5), 1→3 (2), 3→2 (1)\nFinal rows: [0, 1, −4, 3] [6, 0, 2, 2] [11, 5, 0, 7] [12, 6, 1, 0]",
            ap: [
              { n: "Brute force", cx: "O(V² · E) time · O(V²) space",
                idea: "Bellman-Ford from every node. (Dijkstra from every node is O(V · E log E), but only for non-negative weights.)",
                code: "def all_pairs(N, edges):\n    # bellman_ford() from the problem above, once per source\n    return [bellman_ford(N, edges, s) for s in range(N)]" },
              { n: "Optimal", cx: "O(V³) time · O(1) extra (in place)",
                idea: "Let each node k in turn act as an allowed <b>intermediate</b>: for every pair, is i → k → j shorter than d[i][j]? (A–B direct 5 vs A–X–B 2 + 2 = 4.) After pass k, d[i][j] is the best path using only intermediates 0..k. That's why <b>k must be the outermost loop</b>.",
                code: "def floyd_warshall(N, edges):\n    INF = float('inf')\n    d = [[0 if i == j else INF for j in range(N)] for i in range(N)]\n    for u, v, w in edges:\n        d[u][v] = min(d[u][v], w)\n    for k in range(N):                  # k MUST be the outer loop\n        for i in range(N):\n            for j in range(N):\n                if d[i][k] + d[k][j] < d[i][j]:\n                    d[i][j] = d[i][k] + d[k][j]\n    has_neg_cycle = any(d[i][i] < 0 for i in range(N))\n    return d, has_neg_cycle" }
            ],
            edge: "INF guards against overflow. A negative cycle shows up as d[i][i] < 0.", viz: "tg_floyd", lc: "find-the-city-with-the-smallest-number-of-neighbors-at-a-threshold-distance" },
          { t: "0-1 BFS", d: "Medium", q: "Shortest paths when every edge weight is 0 or 1.",
            ex: "Grid where moving onto an obstacle costs 1 and empty costs 0 → fewest obstacles removed",
            ap: [
              { n: "Better", cx: "O(E log V) time · O(V) space",
                idea: "Dijkstra works for 0/1 weights, but the heap's log factor is unnecessary when only two weights exist.",
                code: "import heapq\n\ndef shortest_01(graph, s, N):\n    INF = float('inf')\n    dist = [INF] * N\n    dist[s] = 0\n    pq = [(0, s)]\n    while pq:\n        d, u = heapq.heappop(pq)\n        if d > dist[u]:\n            continue                    # stale entry\n        for v, w in graph[u]:\n            if d + w < dist[v]:\n                dist[v] = d + w\n                heapq.heappush(pq, (dist[v], v))\n    return dist" },
              { n: "Optimal", cx: "O(V + E) time · O(V) space",
                idea: "Use a <b>deque</b>. Relaxing along a 0-edge pushes to the <b>front</b> (same distance); along a 1-edge pushes to the <b>back</b> (distance + 1). The deque stays sorted by distance, like Dijkstra's heap, without the log.",
                code: "from collections import deque\n\ndef zero_one_bfs(graph, s, N):\n    INF = float('inf')\n    dist = [INF] * N\n    dist[s] = 0\n    dq = deque([s])\n    while dq:\n        u = dq.popleft()\n        for v, w in graph[u]:\n            if dist[u] + w < dist[v]:\n                dist[v] = dist[u] + w\n                if w == 0:\n                    dq.appendleft(v)    # same distance: front\n                else:\n                    dq.append(v)        # one more: back\n    return dist" }
            ],
            lc: "minimum-obstacle-removal-to-reach-corner" }
        ]],
        ["viz", "tg_bellman", "Bellman-Ford: the table ticks which edge improved a distance in which round, as in the notes. Try the negative-cycle preset."],
        ["viz", "tg_floyd", "Floyd-Warshall: row k and column k hold the 'via k' values. Watch d[0][3] go ∞ → 11 → 3."]
      ] },
      { h: "Interview cheatsheet", blocks: [
        ["table", ["If the question says…", "Reach for", "Cost"], [
          ["connected components, flood fill, islands", "DFS / BFS from each unvisited node", "O(V + E)"],
          ["cycle in a directed graph, prerequisites", "DFS with path[] or Kahn (output < N)", "O(V + E)"],
          ["cycle in an undirected graph, 'are x and y connected'", "DSU (or DFS with a parent check)", "≈ O(α) per edge"],
          ["build order / dependency order", "topological sort", "O(V + E)"],
          ["fewest steps, unit weights", "BFS", "O(V + E)"],
          ["distance to the nearest of many sources", "multi-source BFS", "O(V + E)"],
          ["split into two groups, odd cycle", "2-colouring", "O(V + E)"],
          ["connect everything at minimum cost", "Prim or Kruskal", "O(E log E)"],
          ["shortest path, weights ≥ 0", "Dijkstra", "O(E log E)"],
          ["weights 0 / 1", "0-1 BFS with a deque", "O(V + E)"],
          ["negative edges, detect a negative cycle", "Bellman-Ford", "O(V · E)"],
          ["all pairs, V ≤ ~400", "Floyd-Warshall", "O(V³)"]]],
        ["list", [
          "BFS: mark visited on enqueue. DFS cycle check in a directed graph needs path[], not just visited[].",
          "Prim: mark on pop, never pre-mark the start. Dijkstra: compare the distance from the source; Prim: compare the single edge.",
          "Bellman-Ford: guard <code>dist[u] != INF</code>; one extra round detects a negative cycle.",
          "Floyd-Warshall: k is the outer loop.",
          "Always ask: directed? weighted? negative weights? connected? Grids are graphs with 4 (or 8) neighbours."]],
        ["warn", "Dijkstra is wrong as soon as one edge is negative, even without a negative cycle (1→3→2→4 = 6, but Dijkstra says 7)."]
      ] }
    ],
    lc: [
      ["Number of Islands", "number-of-islands", "Medium"],
      ["Surrounded Regions", "surrounded-regions", "Medium"],
      ["Clone Graph", "clone-graph", "Medium"],
      ["Evaluate Division", "evaluate-division", "Medium"],
      ["Course Schedule", "course-schedule", "Medium"],
      ["Course Schedule II", "course-schedule-ii", "Medium"],
      ["Snakes and Ladders", "snakes-and-ladders", "Medium"],
      ["Minimum Genetic Mutation", "minimum-genetic-mutation", "Medium"],
      ["Word Ladder", "word-ladder", "Hard"],
      ["Rotting Oranges", "rotting-oranges", "Medium"],
      ["01 Matrix", "01-matrix", "Medium"],
      ["Is Graph Bipartite?", "is-graph-bipartite", "Medium"],
      ["Number of Provinces", "number-of-provinces", "Medium"],
      ["Redundant Connection", "redundant-connection", "Medium"],
      ["Min Cost to Connect All Points", "min-cost-to-connect-all-points", "Medium"],
      ["Network Delay Time", "network-delay-time", "Medium"],
      ["Cheapest Flights Within K Stops", "cheapest-flights-within-k-stops", "Medium"],
      ["Find the City With the Smallest Number of Neighbors at a Threshold Distance", "find-the-city-with-the-smallest-number-of-neighbors-at-a-threshold-distance", "Medium"],
      ["Shortest Path in Binary Matrix", "shortest-path-in-binary-matrix", "Medium"],
      ["Minimum Obstacle Removal to Reach Corner", "minimum-obstacle-removal-to-reach-corner", "Hard"]
    ],
    quiz: [
      { q: "In directed-graph DFS you reach a node that is visited but not on the current path. What does that mean?", o: ["A cycle", "A cross or forward edge, not a cycle", "The graph is disconnected", "A self-loop"], a: 1, why: "A cycle needs a back edge to a node still on the recursion path. The notes' 0→1, 1→2, 1→3, 2→3 example reaches 3 twice with no cycle." },
      { q: "Why must BFS mark a node visited when it is enqueued?", o: ["To save memory only", "Otherwise the same node can be queued several times before it is dequeued", "So DFS still works", "It doesn't matter"], a: 1, why: "Between enqueue and dequeue, other neighbours may discover the same node again. Marking early keeps each node in the queue once, preserving O(V + E)." },
      { q: "Multi-source BFS for 'nearest hospital' starts with…", o: ["One BFS per residence", "Every hospital in the queue at distance 0", "The farthest residence", "A random hospital"], a: 1, why: "Putting all sources in at once acts like a single super-source, so one BFS gives each cell its distance to the nearest source." },
      { q: "Kruskal rejects an edge (u, v) when…", o: ["Its weight is larger than the previous edge", "find(u) == find(v)", "u or v has degree 0", "It's the last edge"], a: 1, why: "If u and v already share a DSU root, they're connected, so the edge would close a cycle." },
      { q: "What is the bug in pre-marking visited[start] = true before Prim's loop?", o: ["Nothing", "The first pop (start, 0) is skipped as visited, so the tree never grows", "It adds the start twice", "It makes it O(V²)"], a: 1, why: "The loop skips popped nodes that are already visited. Mark only on pop." },
      { q: "Why does Bellman-Ford run N − 1 rounds?", o: ["To sort the edges", "A shortest simple path has at most N − 1 edges, and each round fixes at least one more", "N − 1 is the number of components", "It's a heuristic"], a: 1, why: "After round k, every shortest path with at most k edges is correct. Simple paths have at most N − 1 edges. A change in round N means a negative cycle." },
      { q: "In Floyd-Warshall, which loop must be outermost?", o: ["i", "j", "k (the intermediate node)", "Any order works"], a: 2, why: "After finishing pass k, d[i][j] is optimal using only intermediates 0..k. That invariant needs every pair updated for k before moving to k + 1." },
      { q: "A cycle graph with 7 nodes needs how many colours?", o: ["2", "3", "7", "1"], a: 1, why: "Chromatic number of a cycle is 2 + (N % 2). An odd cycle can't alternate two colours all the way round." }
    ]
  };
})();

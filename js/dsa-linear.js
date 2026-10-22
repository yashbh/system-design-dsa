/* Blueprint — DSA: linked lists, stacks & queues, heaps, tries. Worked examples plus LeetCode practice. */
(function () {
  const T = BP.DSA.topics;
  const { nums, clone, cap } = BP.AV;
  const A = BP.ALGOS;
  const F = (line, note, panels) => ({ line, note, panels: clone(panels) });
  const arr = (vals, o = {}) => ({ t: "array", vals, ...o });
  const chips = (label, items) => ({ t: "chips", label, items });
  const vars = (v) => ({ t: "vars", vars: v });
  const split2 = (s) => String(s).split("|").map((x) => x.trim());
  const topHit = (xs) => xs.map((v, q) => (q === xs.length - 1 ? { v, cls: "hit" } : v));

  /* ═════════ NEW ANIMATIONS (prefix lin_) ═════════ */

  A.lin_mergeSorted = { title: "Merge two sorted lists with a dummy node", inputLabel: "list 1 | list 2", input: "2 6 10 14 19 | 3 5 9 11",
    presets: [["Worked example", "2 6 10 14 19 | 3 5 9 11"], ["Quiz", "2 10 11 | 1 5 12 15"], ["One list empty", " | 4 8"]],
    about: "Two sorted lists (shown as chips) are woven into one chain. The highlighted chip is the front node being compared; the list panel is the merged result, with the tail pointer on its last node.",
    code: ["dummy = Node(-1)", "tail = dummy", "while t1 and t2:", "    if t1.val <= t2.val:      # <= keeps it stable", "        tail.next = t1", "        t1 = t1.next", "    else:", "        tail.next = t2", "        t2 = t2.next", "    tail = tail.next", "tail.next = t1 if t1 else t2  # one link attaches the rest", "return dummy.next"],
    gen(s) {
      const [x0, y0] = split2(s);
      const a = cap(nums(x0 || ""), 7).sort((p, q) => p - q), b = cap(nums(y0 || ""), 7).sort((p, q) => p - q);
      const nodes = [{ id: "d", label: "-1 dummy", cls: "dim" }], next = { d: null }, fr = [];
      let tail = "d", i = 0, j = 0;
      const rest = (xs, k, on) => xs.slice(k).map((v, q) => (q === 0 && on ? { v, cls: "hit" } : v));
      const P = (on) => [chips("t1 (list 1)", rest(a, i, on)), chips("t2 (list 2)", rest(b, j, on)), { t: "list", nodes, next, ptr: { tail } }];
      fr.push(F(1, "A dummy node (−1) sits in front of the answer and tail starts on it, so attaching the first real node needs no special case.", P(false)));
      while (i < a.length && j < b.length) {
        fr.push(F(3, `Both lists still have nodes. Compare the fronts: t1 = ${a[i]} vs t2 = ${b[j]}. The smaller one goes next.`, P(true)));
        const takeA = a[i] <= b[j], v = takeA ? a[i] : b[j], id = takeA ? "a" + i : "b" + j;
        nodes.push({ id, label: v, cls: "act" }); next[tail] = id; next[id] = null;
        if (takeA) i++; else j++;
        fr.push(F(takeA ? 4 : 7, `${v} is smaller${takeA && a[i - 1] === b[j] ? " (a tie, so we take list 1: that keeps equal values in order)" : ""}: tail.next = that node, and ${takeA ? "t1" : "t2"} moves to its next node.`, P(false)));
        nodes[nodes.length - 1].cls = ""; tail = id;
        fr.push(F(9, `Move tail onto ${v}, the node we just attached, so the next node links after it.`, P(false)));
      }
      const left = i < a.length ? a.slice(i).map((v, q) => ({ id: "a" + (i + q), label: v })) : b.slice(j).map((v, q) => ({ id: "b" + (j + q), label: v }));
      left.forEach((n, q) => { n.cls = "found"; nodes.push(n); next[q ? left[q - 1].id : tail] = n.id; next[n.id] = null; });
      i = a.length; j = b.length;
      fr.push(F(10, left.length ? `One list is empty. The other's remaining ${left.length} node(s) are already sorted, so a single link attaches them all.` : "Both lists are used up.", P(false)));
      fr.push(F(11, "Return dummy.next (skip the dummy). O(N + M) time and O(1) extra space: we only re-link existing nodes.", [{ t: "list", nodes: nodes.map((n) => ({ ...n, cls: n.id === "d" ? "dim" : "done" })), next, ptr: { head: next.d } }]));
      return fr;
    } };

  A.lin_lru = { title: "LRU cache: HashMap + doubly linked list", inputLabel: "capacity | ops (s1=3 sets key 1, g2 gets key 2)", input: "4 | s1=3 s2=5 s4=7 s15=3 g2 s2=10 s8=9 s1=20 g2 g4",
    presets: [["Trace, capacity 4", "4 | s1=3 s2=5 s4=7 s15=3 g2 s2=10 s8=9 s1=20 g2 g4"], ["Trace, capacity 2", "2 | s1=10 s5=12 g5 g1 g10 s6=14 g5"]],
    about: "Each step runs one get or set. The list runs from least recent (just after H) to most recent (just before T); the grid is the HashMap that finds any node in O(1). Green = hit, red = evicted.",
    code: ["def get(key):", "    if key not in mp:", "        return -1              # MISS", "    move_to_tail(mp[key])      # HIT: unlink, re-add before T", "    return mp[key].val", "def put(key, val):", "    if key in mp:", "        mp[key].val = val", "        move_to_tail(mp[key])  # now most recent", "        return", "    if len(mp) == cap:", "        evict(head.next)       # LRU: unlink + del mp[its key]", "    mp[key] = Node(key, val)", "    add_to_tail(mp[key])"],
    gen(s) {
      const [c0, o0] = split2(s); const capN = Math.max(1, Math.min(6, nums(c0)[0] || 2));
      const ops = cap(String(o0 || "").split(/[\s,]+/).filter(Boolean), 14, "operations"), val = {}, order = [], fr = [];
      const P = (hk, cls, op, res) => {
        const nodes = [{ id: "H", label: "H", cls: "dim" }, ...order.map((k) => ({ id: "k" + k, label: k + ":" + val[k], cls: k === hk ? cls : "" })), { id: "T", label: "T", cls: "dim" }];
        const next = {}; nodes.forEach((n, q) => (next[n.id] = nodes[q + 1] ? nodes[q + 1].id : null));
        const keys = Object.keys(val).sort((p, q) => p - q), hl = {};
        keys.forEach((k, r) => { if (k === hk) { hl[r + ",0"] = cls; hl[r + ",1"] = cls; } });
        return [{ t: "list", nodes, next, ptr: order.length ? { LRU: "k" + order[0], MRU: "k" + order[order.length - 1] } : {} },
          { t: "grid", label: "HashMap: key → node", ch: ["key", "node"], rows: keys.length ? keys.map((k) => [k, "@" + k + ":" + val[k]]) : [["(empty)", ""]], hl },
          vars({ op, result: res, size: order.length + " / " + capN })];
      };
      fr.push(F(-1, `Empty cache with capacity ${capN}. Sentinels H and T mean we never handle null edges. Left of the list = least recent.`, P(null, "", "-", "-")));
      for (const op of ops) {
        let m = /^s(-?\d+)[=:](-?\d+)$/i.exec(op), g = /^g(-?\d+)$/i.exec(op);
        if (m) {
          const k = String(+m[1]), v = +m[2], name = `set(${k},${v})`;
          if (k in val) { val[k] = v; order.splice(order.indexOf(k), 1); order.push(k); fr.push(F(8, `${name}: key exists → update the value and move it next to T (most recent). Size does not change.`, P(k, "act", name, "updated"))); continue; }
          if (order.length === capN) { const ev = order[0]; fr.push(F(11, `${name}: cache full (${capN} keys). Evict the LRU node right after H: key ${ev}. The node stores its key so we can delete it from the map too.`, P(ev, "bad", name, "evict " + ev))); order.shift(); delete val[ev]; }
          val[k] = v; order.push(k); fr.push(F(13, `${name}: a new node is stored in the map and added just before T, so it is the most recent.`, P(k, "act", name, "inserted")));
        } else if (g) {
          const k = String(+g[1]), name = `get(${k})`;
          if (!(k in val)) { fr.push(F(2, `${name}: key ${k} is not in the map → MISS, return −1. Nothing moves.`, P(null, "", name, "-1 (MISS)"))); continue; }
          order.splice(order.indexOf(k), 1); order.push(k);
          fr.push(F(3, `${name}: HIT → return ${val[k]}. Unlink the node (O(1) with prev/next) and re-add it before T.`, P(k, "found", name, val[k] + " (HIT)")));
        } else throw new Error(`Unknown op "${op}". Use s<key>=<val> or g<key>.`);
      }
      fr.push(F(-1, "Every get and set is O(1): the map finds the node, and the doubly linked list unlinks and re-links it with a few pointer writes.", P(null, "", "done", "-")));
      return fr;
    } };

  A.lin_postfix = { title: "Stack: evaluate a postfix expression", inputLabel: "tokens", input: "3 5 + 2 - 2 5 * -",
    presets: [["Worked example", "3 5 + 2 - 2 5 * -"], ["(2+1)*3", "2 1 + 3 *"], ["Division order", "4 13 5 / +"]],
    about: "Tokens are read left to right (the highlighted cell). Numbers are pushed; an operator pops its two operands, right one first, and pushes the result. The stack's top is on the right.",
    code: ["for tok in tokens:", "    if tok in '+-*/':", "        op2 = st.pop()         # RIGHT operand comes off first", "        op1 = st.pop()         # then the LEFT operand", "        st.append(apply(tok, op1, op2))", "    else:", "        st.append(int(tok))", "return st[-1]"],
    gen(s) {
      const tk = cap(String(s).trim().split(/\s+/).filter(Boolean), 15, "tokens"), st = [], fr = [];
      tk.forEach((t, i) => {
        if (["+", "-", "*", "/"].includes(t)) {
          if (st.length < 2) throw new Error(`Not a valid postfix expression: '${t}' needs two operands.`);
          const op2 = st.pop();
          fr.push(F(2, `'${t}' is an operator. The first pop is the RIGHT operand: op2 = <b>${op2}</b>.`, [arr(tk, { hl: { [i]: "act" } }), chips("stack (top →)", st.slice())]));
          const op1 = st.pop();
          fr.push(F(3, `The second pop is the LEFT operand: op1 = <b>${op1}</b>. So we compute ${op1} ${t} ${op2}, not ${op2} ${t} ${op1}.`, [arr(tk, { hl: { [i]: "act" } }), chips("stack (top →)", st.slice())]));
          if (t === "/" && op2 === 0) throw new Error("Division by zero.");
          const r = t === "+" ? op1 + op2 : t === "-" ? op1 - op2 : t === "*" ? op1 * op2 : Math.trunc(op1 / op2);
          st.push(r);
          fr.push(F(4, `${op1} ${t} ${op2} = ${r}. Push the result: it becomes an operand for a later operator.`, [arr(tk, { hl: { [i]: "done" } }), chips("stack (top →)", topHit(st))]));
        } else {
          const v = Number(t); if (Number.isNaN(v)) throw new Error(`Unknown token '${t}'.`);
          st.push(v); fr.push(F(6, `${t} is a number: push it and wait for an operator.`, [arr(tk, { hl: { [i]: "act" } }), chips("stack (top →)", topHit(st))]));
        }
      });
      fr.push(F(7, st.length === 1 ? `One value left: the answer is <b>${st[0]}</b>. O(N) time, O(N) space.` : `${st.length} values left on the stack, so the expression was not valid postfix.`, [arr(tk), chips("stack (top →)", topHit(st))]));
      return fr;
    } };

  A.lin_histogram = { title: "Largest rectangle in a histogram (nearest smaller on both sides)", inputLabel: "bar heights", input: "2 1 5 6 2 3",
    presets: [["LeetCode example", "2 1 5 6 2 3"], ["20 bars", "2 1 4 7 5 2 1 3 4 5 6 4 3 2 3 1 5 6 4 2"], ["All equal", "3 3 3 3"]],
    about: "Pass 1 fills nsl (nearest smaller bar on the left) with a stack of indices, pass 2 fills nsr the same way from the right, and pass 3 treats each bar as the shortest bar of a rectangle. The shaded box is that rectangle.",
    code: ["for i in range(n):                    # pass 1: left to right", "    while st and h[st[-1]] >= h[i]:", "        st.pop()                      # taller bars can't be nsl again", "    nsl[i] = st[-1] if st else -1", "    st.append(i)", "# pass 2: the same from right to left fills nsr (N if none)", "for i in range(n):                    # pass 3", "    area = h[i] * (nsr[i] - nsl[i] - 1)", "    ans = max(ans, area)", "return ans"],
    gen(s) {
      const h = cap(nums(s), 20, "bars"), n = h.length, fr = [], nsl = Array(n).fill(""), nsr = Array(n).fill("");
      if (!n) throw new Error("Enter some bar heights.");
      const bars = (hl) => ({ t: "bars", vals: h, hl });
      let st = [];
      for (let i = 0; i < n; i++) {
        const popped = [];
        while (st.length && h[st[st.length - 1]] >= h[i]) popped.push(st.pop());
        if (popped.length) fr.push(F(2, `Bar ${i} (h=${h[i]}): pop index ${popped.join(", ")} (height ≥ ${h[i]}). Bar ${i} is nearer and not taller, so they can never be a nearest smaller bar again.`, [bars({ [i]: "act" }), arr(nsl, { label: "nsl" }), chips("stack (indices)", st.slice())]));
        nsl[i] = st.length ? st[st.length - 1] : -1;
        fr.push(F(3, `Bar ${i} (h=${h[i]}): ${nsl[i] < 0 ? "the stack is empty, so no smaller bar on the left: nsl = −1" : `the top of the stack is index ${nsl[i]} (h=${h[nsl[i]]}, smaller than ${h[i]}): nsl = <b>${nsl[i]}</b>`}. Then push ${i}.`, [bars({ [i]: "act", [nsl[i]]: "found" }), arr(nsl, { label: "nsl" }), chips("stack (indices)", st.slice())]));
        st.push(i);
      }
      st = [];
      for (let i = n - 1; i >= 0; i--) {
        while (st.length && h[st[st.length - 1]] >= h[i]) st.pop();
        nsr[i] = st.length ? st[st.length - 1] : n; st.push(i);
        fr.push(F(5, `Pass 2, right to left. Bar ${i} (h=${h[i]}): nearest smaller on the right is <b>${nsr[i]}</b>${nsr[i] === n ? " (none, so N)" : ""}.`, [bars({ [i]: "act", [nsr[i]]: "found" }), arr(nsl, { label: "nsl" }), arr(nsr, { label: "nsr" }), chips("stack (indices)", st.slice())]));
      }
      let best = -1, bi = 0;
      for (let i = 0; i < n; i++) {
        const w = nsr[i] - nsl[i] - 1, area = h[i] * w, hl = {};
        for (let k = nsl[i] + 1; k < nsr[i]; k++) hl[k] = "cmp"; hl[i] = "act";
        const better = area > best; if (better) { best = area; bi = i; }
        fr.push(F(better ? 8 : 7, `Bar ${i} as the shortest bar: it stretches over ${nsl[i] + 1}..${nsr[i] - 1}, width ${w}, area ${h[i]} × ${w} = <b>${area}</b>${better ? " (new best)" : ""}`, [{ ...bars(hl), rect: { l: nsl[i] + 1, r: nsr[i] - 1, h: h[i], cls: better ? "area" : "" } }, arr(nsl, { label: "nsl" }), arr(nsr, { label: "nsr" }), vars({ best })]));
      }
      const hl = {}; for (let k = nsl[bi] + 1; k < nsr[bi]; k++) hl[k] = "found";
      fr.push(F(9, `Largest rectangle: height ${h[bi]} over bars ${nsl[bi] + 1}..${nsr[bi] - 1}, area <b>${best}</b>. O(N): every index is pushed and popped once per pass.`, [{ ...bars(hl), rect: { l: nsl[bi] + 1, r: nsr[bi] - 1, h: h[bi], cls: "area" } }, vars({ answer: best })]));
      return fr;
    } };

  A.lin_twoStackQueue = { title: "Queue using two stacks (IN and OUT)", inputLabel: "ops (e10 = enqueue 10, d = dequeue)", input: "e10 e20 e30 d e40 d d e50 d d",
    about: "New elements go on the IN stack. Dequeues are served from the OUT stack; only when OUT is empty is IN poured into it, which reverses the order so the oldest element is on top. Stack tops are on the right.",
    code: ["def enqueue(x):", "    IN.append(x)", "def dequeue():", "    if not OUT:", "        while IN:                  # pour: reverses the order", "            OUT.append(IN.pop())", "    if not OUT:", "        return -1", "    return OUT.pop()"],
    gen(s) {
      const ops = cap(String(s).trim().split(/[\s,]+/).filter(Boolean), 16, "operations"), inS = [], outS = [], got = [], fr = []; let moves = 0;
      const P = (outTop) => [chips("IN stack (top →)", topHit(inS)), chips("OUT stack (top →)", outTop ? topHit(outS) : outS.slice()), chips("dequeued, in order", got.slice()), vars({ "elements moved IN→OUT": moves })];
      fr.push(F(-1, "Two empty stacks. IN receives new elements, OUT serves dequeues.", P(false)));
      for (const op of ops) {
        const e = /^e(-?\d+)$/i.exec(op);
        if (e) { inS.push(+e[1]); fr.push(F(1, `enqueue(${e[1]}): push onto IN. O(1), and OUT is not touched.`, P(false))); continue; }
        if (!/^d$/i.test(op)) throw new Error(`Unknown op "${op}". Use e<number> or d.`);
        if (!outS.length) {
          fr.push(F(3, "dequeue(): OUT is empty, so pour everything from IN into OUT.", P(false)));
          while (inS.length) { outS.push(inS.pop()); moves++; fr.push(F(5, `Move ${outS[outS.length - 1]} from IN to OUT. The oldest element ends up on top of OUT.`, P(true))); }
        }
        if (!outS.length) { fr.push(F(7, "Both stacks are empty: nothing to dequeue, return −1.", P(false))); continue; }
        fr.push(F(8, `dequeue(): OUT is not empty, so pop its top, ${outS[outS.length - 1]}: the oldest element still waiting (FIFO).`, P(true)));
        got.push(outS.pop()); fr.push(F(8, `Returned ${got[got.length - 1]}. Elements left in OUT stay there for the next dequeues.`, P(false)));
      }
      fr.push(F(-1, "Each element is pushed to IN once, moved once and popped once. One dequeue can cost O(N), but the total is O(1) amortized per operation.", P(false)));
      return fr;
    } };

  A.lin_median = { title: "Median of a stream with two heaps", inputLabel: "stream", input: "6 3 8 11 20 2 10 8 13 50",
    presets: [["Example 2", "6 3 8 11 20 2 10 8 13 50"], ["Example 1", "6 3 8 11 2"], ["Flipkart delivery times", "3 7 15 2 5 8"]],
    about: "Each number of the stream joins one of two heaps: h1 holds the smaller half (max on top) and h2 the larger half (min on top). The highlighted chip is each heap's top; the tops straddle the middle, so the median is read from them.",
    code: ["for x in stream:", "    if not h1 or x <= h1.top():", "        h1.push(x)                 # smaller half (max-heap)", "    else:", "        h2.push(x)                 # larger half (min-heap)", "    if len(h1) > len(h2) + 1:", "        h2.push(h1.pop())          # rebalance", "    elif len(h2) > len(h1) + 1:", "        h1.push(h2.pop())", "    if len(h1) == len(h2):", "        median = (h1.top() + h2.top()) / 2", "    else:", "        median = h1.top() if len(h1) > len(h2) else h2.top()"],
    gen(s) {
      const v = cap(nums(s), 12), h1 = [], h2 = [], med = [], fr = [];
      const P = (i) => [arr(v, { hl: i == null ? {} : { [i]: "act" }, idx: false }), chips("h1 max-heap · smaller half (top first)", [...h1].sort((p, q) => q - p).map((x, q) => (q ? x : { v: x, cls: "hit" }))), chips("h2 min-heap · larger half (top first)", [...h2].sort((p, q) => p - q).map((x, q) => (q ? x : { v: x, cls: "hit" }))), chips("medians", med.slice())];
      const take = (h, mx) => { const t = mx ? Math.max(...h) : Math.min(...h); h.splice(h.indexOf(t), 1); return t; };
      v.forEach((x, i) => {
        const left = !h1.length || x <= Math.max(...h1);
        (left ? h1 : h2).push(x);
        fr.push(F(left ? 2 : 4, `${x} ${left ? (h1.length === 1 ? "→ h1 (h1 was empty)" : "≤ h1's top → goes to h1 (smaller half)") : "> h1's top → goes to h2 (larger half)"}`, P(i)));
        if (Math.abs(h1.length - h2.length) > 1) {
          const fromH1 = h1.length > h2.length, t = take(fromH1 ? h1 : h2, fromH1);
          (fromH1 ? h2 : h1).push(t);
          fr.push(F(fromH1 ? 6 : 8, `Sizes differ by 2, so the halves are unbalanced: move ${fromH1 ? "h1's top" : "h2's top"} ${t} to ${fromH1 ? "h2" : "h1"}.`, P(i)));
        }
        const m = h1.length > h2.length ? Math.max(...h1) : h2.length > h1.length ? Math.min(...h2) : (Math.max(...h1) + Math.min(...h2)) / 2;
        med.push(m);
        fr.push(F(h1.length === h2.length ? 10 : 12, `Median so far = <b>${m}</b>${h1.length === h2.length ? " (even count: average of both tops)" : " (odd count: top of the bigger heap)"}`, P(i)));
      });
      fr.push(F(-1, "O(log N) per number: one push, at most one move. The tops always straddle the middle.", P(null)));
      return fr;
    } };

  const heapTree = (h, hl = {}) => ({ t: "tree", nodes: h.map((v, i) => ({ id: i, label: v, parent: i ? (i - 1) >> 1 : null, side: i ? (i % 2 ? "L" : "R") : null, cls: hl[i] || "" })) });
  A.lin_buildHeap = { title: "Build a min-heap bottom-up in O(N)", inputLabel: "array", input: "7 3 5 1 6 8 10 2 13 14 -2",
    presets: [["Worked example", "7 3 5 1 6 8 10 2 13 14 -2"], ["Build-heap problem", "5 13 -2 11 27 31 0 19"]],
    about: "The tree and the array are the same heap. Green nodes already form valid heaps. Starting at the last non-leaf and moving back to the root, each node is sifted down until it is smaller than both children.",
    code: ["for i in range((n - 2) // 2, -1, -1):  # last non-leaf to root", "    j = i                                # sift a[i] down", "    while 2 * j + 1 < n:", "        l, r, m = 2 * j + 1, 2 * j + 2, j", "        if a[l] < a[m]:", "            m = l", "        if r < n and a[r] < a[m]:      # check r < n first", "            m = r", "        if m == j:", "            break", "        a[j], a[m] = a[m], a[j]", "        j = m"],
    gen(s) {
      const h = cap(nums(s), 15), n = h.length, fr = []; let swaps = 0;
      const ok = {}; for (let i = n >> 1; i < n; i++) ok[i] = "done";
      const P = (extra) => [heapTree(h, { ...ok, ...extra }), arr(h, { hl: { ...ok, ...extra } }), vars({ swaps, N: n })];
      if (n <= 1) { fr.push(F(-1, "0 or 1 element is already a heap.", P({}))); return fr; }
      fr.push(F(0, `Leaves (indices ${n >> 1}..${n - 1}, about half the nodes) are already heaps. Start at the last non-leaf: (n−2)/2 = ${(n - 2) >> 1}.`, P({})));
      for (let i = (n - 2) >> 1; i >= 0; i--) {
        let c = i;
        fr.push(F(1, `Sift down index ${i} (value ${h[i]}). Everything below it is already a heap.`, P({ [i]: "act" })));
        for (;;) {
          const l = 2 * c + 1, r = l + 1; let m = c;
          if (l >= n) { fr.push(F(2, `${h[c]} (index ${c}) has no children any more: it is a leaf, so the sift stops here.`, P({ [c]: "found" }))); break; }
          if (h[l] < h[m]) m = l;
          if (r < n && h[r] < h[m]) m = r;
          const cm = { [c]: "act", [l]: "cmp" }; if (r < n) cm[r] = "cmp";
          fr.push(F(r < n ? 6 : 4, `Compare ${h[c]} with its children ${r < n ? `${h[l]} and ${h[r]}` : `${h[l]} (no right child: r < n is false, so a[r] is never read)`}. Smallest: ${h[m]}.`, P(cm)));
          if (m === c) { fr.push(F(9, `${h[c]} is already ≤ its children: this subtree is a heap, stop.`, P({ [c]: "found" }))); break; }
          [h[c], h[m]] = [h[m], h[c]]; swaps++;
          fr.push(F(10, `Swap: ${h[c]} moves up to index ${c}, ${h[m]} moves down to index ${m}. Keep sifting from there.`, P({ [c]: "swap", [m]: "swap" })));
          c = m;
        }
        for (let k = i; k < n; k++) ok[k] = "done";
      }
      fr.push(F(-1, `Min-heap built with ${swaps} swaps for N = ${n}. The bound N/4·1 + N/8·2 + N/16·3 + … = N, so building is O(N), not O(N log N).`, P({ 0: "found" })));
      return fr;
    } };

  A.lin_maxXor = { title: "Binary trie: maximum XOR of a pair", inputLabel: "non-negative numbers", input: "5 20 15 10 25 30",
    presets: [["Example 2", "5 20 15 10 25 30"], ["Example 1", "9 8 10 7"]],
    about: "First every number is inserted as an L-bit path (0 = left, 1 = right). Then each number walks the trie from the top bit, taking the opposite bit whenever that child exists. The bit rows show x, the demanded bits, and the XOR built so far.",
    code: ["for x in A:", "    insert(root, x)              # bits MSB first: 0 left, 1 right", "for x in A:", "    curr, xr = root, 0", "    for j in range(L - 1, -1, -1):", "        b = (x >> j) & 1           # we demand 1 - b", "        if curr.child[1 - b]:", "            xr |= 1 << j           # ✓ this XOR bit is 1", "            curr = curr.child[1 - b]", "        else:", "            curr = curr.child[b]   # ✗ this XOR bit is 0", "    ans = max(ans, xr)"],
    gen(s) {
      const a = cap(nums(s).map((x) => Math.abs(Math.trunc(x))), 7);
      if (!a.length) throw new Error("Enter some numbers.");
      let L = 0; for (let m = Math.max(...a); m; m >>= 1) L++; L = Math.max(L, 1);
      const mask = (1 << L) - 1, nodes = [{ id: 0, label: "•", parent: null }], kid = { 0: [null, null] }, fr = []; let nid = 1, ans = 0, bestPair = "";
      const tree = (path, cls) => ({ t: "tree", nodes: nodes.map((nd) => ({ ...nd, cls: path.includes(nd.id) ? cls : "" })) });
      a.forEach((x) => {
        let cur = 0; const path = [0];
        for (let j = L - 1; j >= 0; j--) {
          const b = (x >> j) & 1;
          if (kid[cur][b] == null) { kid[cur][b] = nid; kid[nid] = [null, null]; nodes.push({ id: nid, label: String(b), parent: cur, side: b ? "R" : "L" }); nid++; }
          cur = kid[cur][b]; path.push(cur);
        }
        nodes[cur].tag = String(x);
        fr.push(F(1, `Insert ${x} = ${x.toString(2).padStart(L, "0")} as a ${L}-bit path`, [tree(path, "act")]));
      });
      a.forEach((x) => {
        let cur = 0, xr = 0; const path = [0];
        for (let j = L - 1; j >= 0; j--) {
          const b = (x >> j) & 1, want = 1 - b, okBit = kid[cur][want] != null;
          if (okBit) { xr |= 1 << j; cur = kid[cur][want]; } else cur = kid[cur][b];
          path.push(cur);
          fr.push(F(okBit ? 7 : 10, `x = ${x}, bit ${j}: x has ${b}, we demand ${want}. ${okBit ? "Child exists ✓, so this XOR bit is 1." : "Missing ✗, so we follow " + b + " and this XOR bit is 0."}`, [tree(path, okBit ? "found" : "act"), { t: "bits", width: L, rows: [{ label: "x", n: x, hlBit: j }, { label: "demand", n: ~x & mask, hlBit: j }, { label: "xor", n: xr, hlBit: j }] }]));
        }
        const partner = nodes[cur].tag; if (xr > ans) { ans = xr; bestPair = `${x} ^ ${partner}`; }
        fr.push(F(11, `Best partner for ${x} is ${partner}: ${x} ^ ${partner} = <b>${xr}</b>. Best so far: ${ans}${bestPair ? " (" + bestPair + ")" : ""}`, [tree(path, "found"), vars({ ans })]));
      });
      fr.push(F(-1, `Maximum XOR = <b>${ans}</b>${bestPair ? " (" + bestPair + ")" : ""}. O(N·L) time instead of O(N²) pairs.`, [tree([], ""), vars({ ans, L })]));
      return fr;
    } };

  /* ═════════ TOPIC: LINKED LISTS ═════════ */
  T["linked-list"] = {
    name: "Linked lists", icon: "🔗", color: "#0f8a6a", minutes: 80,
    summary: "A chain of nodes joined by addresses. Re-wiring at a known spot is O(1), but there is no random access, so most problems are careful pointer moves: dummy nodes, slow/fast runners and in-place reversal.",
    sections: [
      { h: "Why linked lists exist", blocks: [
        ["p", "An array like <code>int arr[4]</code> needs one <b>contiguous</b> block of memory. If free memory is scattered between used cells, a big array cannot be allocated even when the total free space is enough. Removing from the front of an array also shifts every element: O(N) per removal."],
        ["p", "A linked list stores each value in a separate <b>node</b> that can live anywhere on the heap. Each node holds a value and the address of the next node. The last node's next is NULL. For example: 10 @2K → 20 @8K → 30 @10K → NULL."],
        ["analogy", "A treasure hunt. Each clue (node) tells you the value and where the next clue is hidden. You can add a clue anywhere by changing one pointer, but to reach clue 7 you must follow clues 1 to 6."],
        ["code", "class Node:\n    def __init__(self, x):\n        self.val = x\n        self.next = None\n\n# variables a, b, c live on the call stack and hold addresses;\n# the Node objects themselves live on the heap.\na = Node(10)\nb = Node(20)\na.next = b                      # 10 -> 20\na.next.next = Node(30)          # chaining with .next.next"],
        ["table", ["Operation", "Array", "Singly linked list"], [
          ["Access index k", "O(1)", "O(K): walk from head"],
          ["Search a value", "O(N), or O(log N) if sorted", "O(N). No binary search: no random access"],
          ["Insert / delete at head", "O(N) (shift)", "O(1)"],
          ["Insert at end", "O(1) amortized", "O(N), or O(1) with a tail pointer"],
          ["Delete last node", "O(1)", "O(N): you need the second-last node"],
          ["Memory", "one contiguous block", "scattered nodes + one pointer each"]]],
        ["warn", "<b>Never move <code>head</code> to traverse.</b> Copy it into <code>temp</code> and move temp. If you move head you lose the start of the list."]
      ] },
      { h: "Basic operations: access, search, insert, delete", blocks: [
        ["p", "Every basic operation is the same pattern: walk a temp pointer to the right node, then re-wire one or two <code>next</code> pointers. Most bugs come from the <b>empty list</b>, the <b>single node</b> and the <b>order of the re-wiring</b>."],
        ["steps", [
          ["Insert after temp, step 1", "<code>nn.next = temp.next</code>: the new node grabs the rest of the list first."],
          ["Insert after temp, step 2", "<code>temp.next = nn</code>. If you do this first, the rest of the list has no pointer left and is lost."],
          ["Delete after temp", "<code>temp.next = temp.next.next</code>: the arrow jumps over the victim."]]],
        ["probs", [
          { t: "Access the element at index k", d: "Easy", q: "Given head and a 0-based index k, return the value at that position.",
            ex: "23 → 14 → 27 → 9 → 8 → 3, k = 4\nAnswer: 8", edge: "empty list; k ≥ length",
            ap: [
              { n: "Solution", cx: "O(K) time · O(1) space", idea: "There is no shortcut: a list has <b>no random access</b>. Start <code>temp = head</code> and hop k times, guarding against temp becoming null when k ≥ length.", code: "def get_at(head, k):\n    temp = head\n    for _ in range(k):\n        if temp is None:\n            return None        # k is past the end\n        temp = temp.next\n    return temp.val if temp else None" }
            ] },
          { t: "Search in a linked list", d: "Easy", q: "Return true if the target value exists in the list.",
            ex: "23 → 14 → 27 → 9 → 8 → 3\nsearch(3) → true, search(50) → false",
            ap: [
              { n: "Solution", cx: "O(N) time · O(1) space", idea: "A linear scan is already optimal: binary search needs random access, so it does not work on a list. Loop <b>while temp != null</b>; writing <code>while temp.next != null</code> skips the last node.", code: "def search(head, target):\n    temp = head\n    while temp:                # not temp.next, or the last node is skipped\n        if temp.val == target:\n            return True\n        temp = temp.next\n    return False" }
            ] },
          { t: "Insert at head, at end, at index k", d: "Easy", q: "Insert value x at the front, at the back, or so that it ends up at index k.",
            ex: "insertAt(3, 100) on 23,14,27,9,8\nAnswer: 23,14,27,100,9,8", edge: "k == 0 or head == null → insert at head; empty list for insert-at-end",
            ap: [
              { n: "Brute force", cx: "head O(1) · end O(N) · index O(K) time · O(1) space", idea: "Head: <code>nn.next = head; head = nn</code>. End: walk to the last node (<code>while temp.next</code>) and attach; handle an empty list first, otherwise <code>temp.next</code> throws. Index k: walk k−1 hops, then <b>nn.next = temp.next first</b>, then temp.next = nn. <b>Insert at end is slow</b> because you walk the whole list every time.", code: "def insert_head(head, x):\n    nn = Node(x)\n    nn.next = head\n    return nn                  # nn is the new head\n\ndef insert_end(head, x):\n    nn = Node(x)\n    if head is None:\n        return nn\n    temp = head\n    while temp.next:           # stop at the last node\n        temp = temp.next\n    temp.next = nn\n    return head\n\ndef insert_at(head, k, x):\n    if k == 0 or head is None:\n        return insert_head(head, x)\n    temp = head\n    for _ in range(k - 1):     # stop at index k-1\n        if temp.next is None:\n            break              # k past the end: append\n        temp = temp.next\n    nn = Node(x)\n    nn.next = temp.next        # 1: grab the rest first\n    temp.next = nn             # 2: then link in\n    return head" },
              { n: "Optimal", cx: "head O(1) · end O(1) time · O(1) space", idea: "Keep a <b>tail pointer</b> next to head. Appending is then one link plus moving tail, with no walk. Update tail whenever the list goes from empty to one node.", code: "class LinkedList:\n    def __init__(self):\n        self.head = None\n        self.tail = None\n\n    def insert_head(self, x):\n        nn = Node(x)\n        nn.next = self.head\n        self.head = nn\n        if self.tail is None:  # list was empty\n            self.tail = nn\n\n    def insert_end(self, x):\n        nn = Node(x)\n        if self.tail is None:  # list was empty\n            self.head = nn\n            self.tail = nn\n        else:\n            self.tail.next = nn\n            self.tail = nn" }
            ] },
          { t: "Delete from head, from end, at index k", d: "Easy", q: "Remove the first node, the last node, or the node at index k.",
            ex: "delete(3) on 23,14,27,9,8\nAnswer: 23,14,27,8", edge: "empty list; single node (delete-end makes head null); k ≥ length is a no-op", lc: "design-linked-list",
            ap: [
              { n: "Solution", cx: "head O(1) · end O(N) · index O(K) time · O(1) space", idea: "Head: <code>head = head.next</code>. End: stop at the <b>second-last</b> node (<code>while temp.next.next</code>) and set its next to null. Index k: stop at k−1 and bypass: <code>temp.next = temp.next.next</code>.", code: "def delete_head(head):\n    return head.next if head else None\n\ndef delete_end(head):\n    if head is None or head.next is None:\n        return None\n    temp = head\n    while temp.next.next:      # stop at the second-last node\n        temp = temp.next\n    temp.next = None\n    return head\n\ndef delete_at(head, k):\n    if head is None:\n        return None\n    if k == 0:\n        return head.next\n    temp = head\n    for _ in range(k - 1):     # stop at index k-1\n        if temp.next is None:\n            return head        # k >= length: nothing to delete\n        temp = temp.next\n    if temp.next:\n        temp.next = temp.next.next   # the arrow jumps over the victim\n    return head" }
            ] }
        ]]
      ] },
      { h: "Reversal: the three-pointer dance", blocks: [
        ["p", "To reverse a list, every node's arrow must point back to its predecessor. Before you overwrite <code>curr.next</code>, save it in <code>temp</code>, otherwise the rest of the list is gone. So you need three pointers: <b>prev, curr, temp</b>."],
        ["viz", "reverseList", "Watch each arrow flip. At the end curr and temp are null and prev points to the old last node, which is the new head."],
        ["probs", [
          { t: "Reverse a linked list (iterative)", d: "Easy", q: "Reverse the list in place and return the new head.",
            ex: "23 → 14 → 27 → 9 → 8\nAnswer: 8 → 9 → 27 → 14 → 23", viz: "reverseList", lc: "reverse-linked-list",
            ap: [
              { n: "Brute force", cx: "O(N) time · O(N) space", idea: "Copy the values into an array, then walk the list again writing them back from the end. Correct, but it <b>needs O(N) extra memory</b> and doesn't re-wire anything.", code: "def reverse_list(head):\n    vals = []\n    temp = head\n    while temp:\n        vals.append(temp.val)\n        temp = temp.next\n    temp = head\n    while temp:\n        temp.val = vals.pop()  # last value first\n        temp = temp.next\n    return head" },
              { n: "Optimal", cx: "O(N) time · O(1) space", idea: "For each node: <b>save temp = curr.next, flip curr.next = prev, then slide prev and curr forward</b>. The loop also handles empty and single-node lists; prev ends on the new head.", code: "def reverse_list(head):\n    prev, curr = None, head\n    while curr:\n        temp = curr.next       # save the rest\n        curr.next = prev       # flip the arrow\n        prev = curr            # slide both forward\n        curr = temp\n    return prev" }
            ] },
          { t: "Reverse a linked list (recursive)", d: "Easy", q: "Same task, using recursion.",
            ex: "10,20,30,40,50,60,70\nAnswer: 70 is the new head", edge: "empty list; one node",
            ap: [
              { n: "Solution", cx: "O(N) time · O(N) recursion stack", idea: "Recurse to the last node (it becomes the new head). On the way back, the node after <code>head</code> is the tail of the reversed part, so set <b>head.next.next = head</b> and <b>head.next = null</b>. Return the same new head all the way up. The iterative version is better in practice (O(1) space).", code: "def reverse(head):\n    if head is None or head.next is None:\n        return head\n    new_head = reverse(head.next)\n    head.next.next = head      # the node after head points back to it\n    head.next = None\n    return new_head" }
            ] },
          { t: "Palindrome linked list", d: "Easy", q: "Do the values read the same forwards and backwards? Use O(1) extra space.",
            ex: "2,5,8,7,3 → false\n2,5,8,5,2 → true\n2,5,8,8,5,2 → true", edge: "0 or 1 node → true; odd length: the first half keeps the middle, stop when the second half ends", lc: "palindrome-linked-list",
            ap: [
              { n: "Brute force", cx: "O(N) time · O(N) space", idea: "Copy the values into an array and compare from both ends with two pointers. Simple, but it <b>uses O(N) extra memory</b>.", code: "def is_palindrome(head):\n    vals = []\n    while head:\n        vals.append(head.val)\n        head = head.next\n    i, j = 0, len(vals) - 1\n    while i < j:\n        if vals[i] != vals[j]:\n            return False\n        i += 1\n        j -= 1\n    return True" },
              { n: "Optimal", cx: "O(N) time · O(1) space", idea: "<b>Find the middle</b> (first middle for even length), <b>cut</b> after it, <b>reverse the second half</b>, compare the halves node by node, then reverse back and reconnect so the input is unchanged.", code: "def middle(head):              # first middle\n    slow = fast = head\n    while fast.next and fast.next.next:\n        slow = slow.next\n        fast = fast.next.next\n    return slow\n\ndef reverse(head):\n    prev = None\n    while head:\n        nxt = head.next\n        head.next = prev\n        prev = head\n        head = nxt\n    return prev\n\ndef is_palindrome(head):\n    if head is None or head.next is None:\n        return True\n    mid = middle(head)\n    h2 = reverse(mid.next)     # reverse the second half\n    mid.next = None            # cut\n    t1, t2, ok = head, h2, True\n    while t2:\n        if t1.val != t2.val:\n            ok = False\n            break\n        t1 = t1.next\n        t2 = t2.next\n    mid.next = reverse(h2)     # restore the input\n    return ok" }
            ] },
          { t: "Reverse nodes in groups of K", d: "Hard", q: "Reverse every consecutive block of K nodes and return the new head.",
            ex: "K = 3, 1..9\nAnswer: 3,2,1,6,5,4,9,8,7", edge: "last block shorter than K: a simple version reverses it too; LeetCode 25 wants it left as is, so count K nodes ahead first. K = 1 → unchanged.", lc: "reverse-nodes-in-k-group",
            ap: [
              { n: "Brute force", cx: "O(N) time · O(N) space", idea: "Copy the values into an array, reverse each slice of K, and write the values back. Easy, but <b>O(N) extra memory</b> and it swaps values instead of nodes.", code: "def reverse_k_group(head, K):\n    vals = []\n    temp = head\n    while temp:\n        vals.append(temp.val)\n        temp = temp.next\n    for s in range(0, len(vals), K):\n        vals[s:s + K] = vals[s:s + K][::-1]\n    temp = head\n    for v in vals:\n        temp.val = v\n        temp = temp.next\n    return head" },
              { n: "Optimal", cx: "O(N) time · O(1) space", idea: "Use a <b>dummy node</b> and a <code>tail</code> pointer at the end of the finished part. For each block, run the normal reverse for K nodes (prev starts at null), then <b>tail.next = prev</b> to attach it, and walk tail to the block's last node (the block's old first node).", code: "def reverse_k_group(head, K):\n    dummy = Node(-1)\n    tail = dummy               # last node of the finished part\n    curr = head\n    while curr:\n        prev, i = None, 0\n        while i < K and curr:  # plain reversal of up to K nodes\n            temp = curr.next\n            curr.next = prev\n            prev = curr\n            curr = temp\n            i += 1\n        tail.next = prev       # attach the reversed block\n        while tail.next:       # walk to the block's last node\n            tail = tail.next\n    return dummy.next" }
            ] },
          { t: "Longest palindromic sub-list", d: "Hard", q: "Return the length of the longest run of consecutive nodes whose values form a palindrome. O(1) extra space.",
            ex: "7,3,4,1,4,3,9\nAnswer: 5  (3,4,1,4,3)", edge: "<b>Watch the order:</b> compute the even case only after <code>curr.next = prev</code>; otherwise the left side still runs forward. Flip curr first. The list ends up reversed; reverse it again if needed.",
            ap: [
              { n: "Brute force", cx: "O(N³) time · O(N) space", idea: "Copy to an array and test every sub-list for being a palindrome. N² sub-lists × O(N) per check is <b>far too slow</b>.", code: "def longest_pal_sublist(head):\n    a = []\n    while head:\n        a.append(head.val)\n        head = head.next\n    best = 0\n    for i in range(len(a)):\n        for j in range(i, len(a)):\n            sub = a[i:j + 1]\n            if sub == sub[::-1]:\n                best = max(best, j - i + 1)\n    return best" },
              { n: "Better", cx: "O(N²) time · O(N) space", idea: "Still on an array, <b>expand around each center</b> (a node for odd length, a gap for even length) while both sides match. O(N²), but the array still costs O(N) memory.", code: "def longest_pal_sublist(head):\n    a = []\n    while head:\n        a.append(head.val)\n        head = head.next\n\n    def expand(l, r):\n        while l >= 0 and r < len(a) and a[l] == a[r]:\n            l -= 1\n            r += 1\n        return r - l - 1\n\n    best = 0\n    for c in range(len(a)):\n        best = max(best, expand(c, c), expand(c, c + 1))\n    return best" },
              { n: "Optimal", cx: "O(N²) time · O(1) space", idea: "<b>Reverse as you walk.</b> At any moment <code>prev</code> heads the already-reversed left part (it goes backwards) and <code>temp = curr.next</code> heads the untouched right part, so you can expand around a center with no extra memory. Odd center at curr: <code>expand(prev, temp) + 1</code>. Even center between curr and temp: <b>first set curr.next = prev</b>, then <code>expand(curr, temp)</code>.", code: "def expand(t1, t2):\n    n = 0\n    while t1 and t2 and t1.val == t2.val:\n        n += 2\n        t1 = t1.next\n        t2 = t2.next\n    return n\n\ndef longest_pal_sublist(head):\n    prev, curr, ans = None, head, 0\n    while curr:\n        temp = curr.next\n        ans = max(ans, expand(prev, temp) + 1)   # odd: curr is the center\n        curr.next = prev                          # reverse curr FIRST\n        ans = max(ans, expand(curr, temp))        # even: between curr and temp\n        prev = curr\n        curr = temp\n    return ans" }
            ] }
        ]]
      ] },
      { h: "Slow and fast pointers", blocks: [
        ["p", "Two runners start at the head. <b>slow</b> moves one node per step and <b>fast</b> moves two. When fast reaches the end, slow has covered half the distance. If the list has a loop, fast can never reach the end and must eventually land on slow, like a faster runner lapping a slower one on a circular track."],
        ["viz", "middleList", "slow stops at the middle when fast runs out of nodes."],
        ["tip", "Which middle? <code>while fast.next and fast.next.next</code> gives the <b>first</b> middle for even length (needed for palindrome and merge sort, so a 2-node list splits 1 + 1). <code>while fast and fast.next</code> gives the <b>second</b> middle (what LeetCode 876 asks for)."],
        ["viz", "floydCycle", "Floyd's cycle detection: the hare gains one node per step on the tortoise inside the loop, so they must meet."],
        ["probs", [
          { t: "Middle of a linked list", d: "Easy", q: "Return the middle node. For even length, return the first middle.",
            ex: "10,3,7,9,5,4,11 → 9\n10,3,7,9,5,4,11,16 → 9 (first middle)", viz: "middleList", lc: "middle-of-the-linked-list",
            ap: [
              { n: "Brute force", cx: "O(N) time · O(1) space (two passes)", idea: "Count the length L, then walk (L−1)/2 steps. Correct, but it needs <b>two passes</b>: about N + N/2 iterations.", code: "def middle(head):\n    n = 0\n    temp = head\n    while temp:\n        n += 1\n        temp = temp.next\n    temp = head\n    for _ in range((n - 1) // 2):    # first middle\n        temp = temp.next\n    return temp" },
              { n: "Optimal", cx: "O(N) time · O(1) space (one pass)", idea: "<b>Fast moves twice as fast as slow</b>, so slow is at the halfway point when fast stops. One pass of about N/2 iterations. <code>while fast.next and fast.next.next</code> gives the first middle; <code>while fast and fast.next</code> gives the second (LeetCode 876).", code: "def middle(head):\n    if head is None:\n        return None\n    slow = fast = head\n    while fast.next and fast.next.next:   # first middle\n        slow = slow.next\n        fast = fast.next.next\n    return slow" }
            ] },
          { t: "Detect a loop", d: "Easy", q: "Return true if following next pointers ever revisits a node.",
            ex: "10,20,4,…,27 with 27.next → 17: true\n10,3,7,9,5,4,11,16 → NULL: false", edge: "empty list; one node with or without a self-loop. Compare references, not values.", viz: "floydCycle", lc: "linked-list-cycle",
            ap: [
              { n: "Brute force", cx: "O(N) time · O(N) space", idea: "Store every node <b>reference</b> in a hash set; seeing one again means a loop. Fast, but the set <b>costs O(N) memory</b>.", code: "def has_cycle(head):\n    seen = set()\n    temp = head\n    while temp:\n        if temp in seen:       # nodes hash by identity, not value\n            return True\n        seen.add(temp)\n        temp = temp.next\n    return False" },
              { n: "Optimal", cx: "O(N) time · O(1) space", idea: "<b>Floyd's tortoise and hare.</b> slow +1, fast +2. Inside a loop fast gains one node per step, so it must land on slow. If fast hits null there is no loop.", code: "def has_cycle(head):\n    slow = fast = head\n    while fast and fast.next:\n        slow = slow.next\n        fast = fast.next.next\n        if slow is fast:\n            return True\n    return False" }
            ] },
          { t: "Find the start of the loop", d: "Medium", co: "★★★ important", q: "If there is a loop, return the node where it begins; otherwise null.",
            ex: "3,9,7,2,8,4,16,25,98,94,…,175,32 with 32.next → 98\nAnswer: node 98", edge: "no loop → null; the loop starts at head (x = 0): after the reset they are already equal", lc: "linked-list-cycle-ii",
            ap: [
              { n: "Brute force", cx: "O(N) time · O(N) space", idea: "Walk with a hash set of references: the <b>first node already in the set</b> is the loop start. Needs O(N) memory.", code: "def loop_start(head):\n    seen = set()\n    temp = head\n    while temp:\n        if temp in seen:\n            return temp\n        seen.add(temp)\n        temp = temp.next\n    return None" },
              { n: "Optimal", cx: "O(N) time · O(1) space", idea: "Run Floyd until slow meets fast. <b>Reset slow to head</b>, leave fast at the meeting point, then move <b>both one step at a time</b>. They meet exactly at the loop start, because x = R3·l − y (proof below).", code: "def loop_start(head):\n    slow = fast = head\n    while fast and fast.next:\n        slow = slow.next\n        fast = fast.next.next\n        if slow is fast:       # met inside the loop\n            slow = head\n            while slow is not fast:\n                slow = slow.next\n                fast = fast.next\n            return slow\n    return None" }
            ] },
          { t: "Remove the loop", d: "Medium", q: "Break the cycle so the list ends with null.",
            ex: "1 → 2 → 3 → 4 → 5 → (back to 3)\nAnswer: 1 → 2 → 3 → 4 → 5 → null",
            ap: [
              { n: "Brute force", cx: "O(N) time · O(N) space", idea: "Hash set of visited nodes: the node whose <code>next</code> is already in the set closes the loop, so set its next to null.", code: "def remove_loop(head):\n    seen = set()\n    temp = head\n    while temp and temp.next:\n        seen.add(temp)\n        if temp.next in seen:  # this arrow closes the loop\n            temp.next = None\n            return head\n        temp = temp.next\n    return head" },
              { n: "Optimal", cx: "O(N) time · O(1) space", idea: "Find the loop start with Floyd (above). Then walk a pointer around the loop until <b>ptr.next is the start</b>, and set <code>ptr.next = null</code>.", code: "def remove_loop(head):\n    start = loop_start(head)   # Floyd, previous problem\n    if start is None:\n        return head\n    p = start\n    while p.next is not start: # walk round to the last loop node\n        p = p.next\n    p.next = None\n    return head" }
            ] }
        ]],
        ["math", [
          ["x", "head → loop start", ""],
          ["y", "loop start → meeting point", ""],
          ["l", "loop length", ""],
          ["slow walked", "x + R1·l + y", ""],
          ["fast walked", "x + R2·l + y = 2 × slow", "fast is twice as fast"],
          ["subtract", "(R2 − 2·R1)·l = x + y", "let R3 = R2 − 2·R1"],
          ["so", "x = R3·l − y", "walking x steps from the meeting point lands on the loop start"]],
          "From the meeting point, l − y steps reach the loop start; extra full laps don't change where you end. A pointer from head needs x steps to get there, and x = R3·l − y. So both pointers arrive together. (Slow also makes 0 full laps before the meeting: R1 = 0.)"]
      ] },
      { h: "Merging and sorting lists", blocks: [
        ["p", "Merging two sorted lists needs no extra array: you just re-link nodes. Keep a <code>tail</code> of the merged list, attach the smaller front node, and advance. When one list runs out, the other's remainder is already sorted and attaches with <b>one link</b>."],
        ["tip", "A <b>dummy node</b> (value −1) in front of the result removes the special case for choosing the first head. Return <code>dummy.next</code>."],
        ["viz", "lin_mergeSorted", "The tail weaves one chain from two. Equal values take list 1 first (stable)."],
        ["probs", [
          { t: "Merge two sorted linked lists", d: "Easy", q: "Merge sorted lists h1 (size N) and h2 (size M) into one sorted list by re-linking nodes.",
            ex: "h1 = 2,6,10,14,19   h2 = 3,5,9,11\nAnswer: 2,3,5,6,9,10,11,14,19\nQuiz: 2,10,11 + 1,5,12,15 → 1,2,5,10,11,12,15", edge: "either list empty; equal values; one list much longer", viz: "lin_mergeSorted", lc: "merge-two-sorted-lists",
            ap: [
              { n: "Brute force", cx: "O((N+M) log(N+M)) time · O(N+M) space", idea: "Dump all values into an array, sort it, and build a new list. It <b>ignores that both inputs are already sorted</b> and allocates new nodes.", code: "def merge(h1, h2):\n    vals = []\n    for h in (h1, h2):\n        while h:\n            vals.append(h.val)\n            h = h.next\n    vals.sort()\n    dummy = Node(-1)\n    tail = dummy\n    for v in vals:\n        tail.next = Node(v)\n        tail = tail.next\n    return dummy.next" },
              { n: "Optimal", cx: "O(N + M) time · O(1) space", idea: "<b>Dummy + tail.</b> While both lists have nodes, attach the smaller front (use ≤ for stability) and advance. When one runs out, <code>tail.next = t1 or t2</code> attaches the rest with one link. The dummy removes the fiddly 'which node is the head' special case.", code: "def merge(h1, h2):\n    dummy = Node(-1)\n    tail = dummy\n    t1, t2 = h1, h2\n    while t1 and t2:\n        if t1.val <= t2.val:   # <= keeps equal values stable\n            tail.next = t1\n            t1 = t1.next\n        else:\n            tail.next = t2\n            t2 = t2.next\n        tail = tail.next\n    tail.next = t1 if t1 else t2   # one link attaches the rest\n    return dummy.next" }
            ] },
          { t: "Merge sort a linked list", d: "Medium", q: "Sort a linked list.",
            ex: "10,3,7,9,5,4,11\nAnswer: 3,4,5,7,9,10,11", edge: "empty or one node is the base case", lc: "sort-list",
            ap: [
              { n: "Brute force", cx: "O(N log N) time · O(N) space", idea: "Copy the values to an array, sort, and write them back. Same time, but <b>O(N) extra space</b>.", code: "def sort_list(head):\n    vals = []\n    temp = head\n    while temp:\n        vals.append(temp.val)\n        temp = temp.next\n    vals.sort()\n    temp = head\n    for v in vals:\n        temp.val = v\n        temp = temp.next\n    return head" },
              { n: "Optimal", cx: "O(N log N) time · O(log N) recursion stack", idea: "Find the <b>first middle</b>, save <code>h2 = mid.next</code>, and <b>cut with mid.next = null</b> (without the cut the recursion never ends). Sort both halves recursively and merge them. Merge sort suits lists: merging needs no extra array and no random access.", code: "def merge_sort(head):\n    if head is None or head.next is None:\n        return head\n    mid = middle(head)         # FIRST middle, so 2 nodes split 1 + 1\n    h2 = mid.next\n    mid.next = None            # cut, or the recursion never ends\n    return merge(merge_sort(head), merge_sort(h2))" }
            ] },
          { t: "Merge K sorted lists", d: "Hard", q: "Merge K sorted lists (N nodes in total) into one.",
            ex: "[1,4,5], [1,3,4], [2,6]\nAnswer: 1,1,2,3,4,4,5,6", lc: "merge-k-sorted-lists",
            ap: [
              { n: "Brute force", cx: "O(N·K) time · O(1) space", idea: "Merge the lists one after another into a running result. The result <b>keeps growing</b>, so early nodes are re-walked in every later merge.", code: "def merge_k(lists):\n    result = None\n    for l in lists:\n        result = merge(result, l)   # merge two sorted lists\n    return result" },
              { n: "Optimal", cx: "O(N log K) time · O(1) extra space", idea: "Merge <b>pairwise like merge sort</b> (1+2, 3+4, … then again), so each node takes part in only log K merges. A min-heap of the K current heads gives the same O(N log K) (see Heaps).", code: "def merge_k(lists):\n    lists = [l for l in lists if l]\n    while len(lists) > 1:\n        merged = []\n        for i in range(0, len(lists), 2):\n            b = lists[i + 1] if i + 1 < len(lists) else None\n            merged.append(merge(lists[i], b))\n        lists = merged\n    return lists[0] if lists else None" }
            ] }
        ]]
      ] },
      { h: "Doubly linked lists, LRU cache and deep copy", blocks: [
        ["p", "A <b>doubly linked list</b> node has <code>prev</code>, <code>val</code> and <code>next</code>. Given a node reference you can unlink it in O(1), because you can reach its predecessor directly. That single fact is what makes an LRU cache possible."],
        ["probs", [
          { t: "Insert into a doubly linked list", d: "Easy", q: "Insert x at index idx.",
            ex: "10,20,30,40,50; insert 100 at idx 3\nAnswer: 10,20,30,100,40,50 (temp stops at 30)", edge: "empty list → return nn; idx = 0 → nn.next = head, head.prev = nn, head = nn; idx = length → append",
            ap: [
              { n: "Solution", cx: "O(N) time · O(1) space", idea: "Walk temp to idx−1, then four pointer writes: <code>nn.next = temp.next</code>, <code>temp.next.prev = nn</code>, <code>temp.next = nn</code>, <code>nn.prev = temp</code>. At the tail, skip the two writes that touch temp.next.", code: "def insert(head, idx, x):\n    nn = Node(x)\n    if head is None:\n        return nn\n    if idx == 0:\n        nn.next = head\n        head.prev = nn\n        return nn\n    temp = head\n    for _ in range(idx - 1):   # stop at idx-1\n        temp = temp.next\n    if temp.next:              # not inserting at the tail\n        nn.next = temp.next\n        temp.next.prev = nn\n    temp.next = nn\n    nn.prev = temp\n    return head" }
            ] },
          { t: "Delete a value from a doubly linked list", d: "Easy", q: "Remove the first node whose value is target.",
            ex: "10,20,30,40,50; delete 40\nAnswer: 10,20,30,50", edge: "single node → null; target missing → unchanged; head; tail",
            ap: [
              { n: "Solution", cx: "O(N) search · O(1) unlink · O(1) space", idea: "Find the node, then bypass it from both sides: <code>temp.prev.next = temp.next</code> and <code>temp.next.prev = temp.prev</code>. Head and tail cases skip the side that is null.", code: "def delete(head, target):\n    temp = head\n    while temp and temp.val != target:\n        temp = temp.next\n    if temp is None:           # target missing\n        return head\n    if temp.prev is None and temp.next is None:\n        return None            # it was the only node\n    if temp.prev is None:      # deleting the head\n        head = head.next\n        head.prev = None\n    elif temp.next is None:    # deleting the tail\n        temp.prev.next = None\n    else:\n        temp.prev.next = temp.next\n        temp.next.prev = temp.prev\n    return head" }
            ] }
        ]],
        ["p", "<b>LRU cache.</b> A cache is small, fast memory. When it is full, evict the <b>Least Recently Used</b> item. A HIT means the key is already there (it becomes most recent). A MISS means it is not. Search, insert and remove must all be O(1)."],
        ["table", ["", "Dynamic array", "Linked list", "HashMap", "LL + HashMap", "DLL + HashMap"], [
          ["search", "O(N)", "O(N)", "O(1)", "O(1)", "O(1)"],
          ["insert", "O(1)", "O(1)", "no order", "O(1)", "O(1)"],
          ["remove", "O(N)", "O(1)*", "no order", "O(N) (needs predecessor)", "<b>O(1)</b>"]]],
        ["p", "So: a <b>HashMap key → DLL node</b>, and a DLL ordered from least recent (just after head) to most recent (just before tail). <b>Sentinel</b> head and tail nodes mean insert and remove never see null."],
        ["viz", "lin_lru", "Capacity-4 trace: get(2) → 5, set(8,9) evicts 1, set(1,20) evicts 4, get(4) → −1."],
        ["probs", [
          { t: "LRU cache", d: "Medium", co: "Often rated Hard", q: "Design get(key) and set(key, value) in O(1); evict the least recently used key when full.",
            ex: "cap 4: set(1,3) set(2,5) set(4,7) set(15,3)\nget(2) → 5; set(2,10); set(8,9) evicts 1\nset(1,20) evicts 4; get(2) → 10; get(4) → -1\n\ncap 2: set(1,10) set(5,12) get(5)→12 get(1)→10\nget(10)→-1 set(6,14) evicts 5, get(5)→-1", edge: "capacity 1; set on an existing key updates value and recency but not size", viz: "lin_lru", lc: "lru-cache",
            ap: [
              { n: "Brute force", cx: "O(capacity) per operation · O(capacity) space", idea: "Keep (key, value) pairs in a list ordered by recency, least recent first. Every get and set has to <b>search the list and shift it</b>: O(N) per operation.", code: "class LRUCache:\n    def __init__(self, capacity):\n        self.cap = capacity\n        self.items = []        # (key, val), least recent first\n\n    def get(self, key):\n        for i, (k, v) in enumerate(self.items):\n            if k == key:\n                self.items.append(self.items.pop(i))   # now most recent\n                return v\n        return -1\n\n    def put(self, key, val):\n        for i, (k, _) in enumerate(self.items):\n            if k == key:\n                self.items.pop(i)\n                break\n        else:\n            if len(self.items) == self.cap:\n                self.items.pop(0)                      # evict the LRU\n        self.items.append((key, val))" },
              { n: "Optimal", cx: "O(1) per operation · O(capacity) space", idea: "<b>HashMap key → node + doubly linked list with sentinels.</b> The map finds the node in O(1); the DLL unlinks and re-adds it before tail in O(1). If full, evict <code>head.next</code> and delete its key from the map. <b>Store the key in the node</b> so eviction can clean the map. (Python's OrderedDict does the same internally.)", code: "class Node:\n    def __init__(self, key=0, val=0):\n        self.key = key         # kept so eviction can clean the map\n        self.val = val\n        self.prev = None\n        self.next = None\n\nclass LRUCache:\n    def __init__(self, capacity):\n        self.cap = capacity\n        self.mp = {}           # key -> node\n        self.head = Node()     # sentinel before the LRU node\n        self.tail = Node()     # sentinel after the MRU node\n        self.head.next = self.tail\n        self.tail.prev = self.head\n\n    def _remove(self, y):\n        y.prev.next = y.next\n        y.next.prev = y.prev\n\n    def _add_to_tail(self, x):\n        x.prev = self.tail.prev\n        x.next = self.tail\n        self.tail.prev.next = x\n        self.tail.prev = x\n\n    def get(self, key):\n        if key not in self.mp:\n            return -1          # MISS\n        node = self.mp[key]\n        self._remove(node)\n        self._add_to_tail(node)   # HIT: now most recent\n        return node.val\n\n    def put(self, key, val):\n        if key in self.mp:\n            node = self.mp[key]\n            node.val = val\n            self._remove(node)\n            self._add_to_tail(node)\n            return\n        if len(self.mp) == self.cap:\n            lru = self.head.next  # least recently used\n            self._remove(lru)\n            del self.mp[lru.key]\n        node = Node(key, val)\n        self.mp[key] = node\n        self._add_to_tail(node)" }
            ] },
          { t: "Copy a list with random pointers (deep copy)", d: "Medium", q: "Each node has next and random (any node or null). Build a deep copy whose randoms point into the new list. N ≤ 10^5.",
            ex: "10→20→30→40→50→60\nrandom: 10→50, 20→10, 30→null, 40→60, 50→50, 60→30\nThe copy must have the same pattern on new nodes.", edge: "empty list; random = null; random pointing to itself; the original must be restored", lc: "copy-list-with-random-pointer",
            ap: [
              { n: "Brute force", cx: "O(N²) time · O(N) space", idea: "Copy the next chain, then for each node find the <b>position</b> of its random target by scanning the original list, and point the clone at the clone in that position. The scan per node makes it <b>O(N²)</b>.", code: "def copy_random_list(head):\n    olds, news = [], []\n    t = head\n    while t:\n        olds.append(t)\n        news.append(Node(t.val))\n        t = t.next\n    for i in range(len(news) - 1):\n        news[i].next = news[i + 1]\n    for i, o in enumerate(olds):\n        if o.random:\n            j = 0\n            while olds[j] is not o.random:   # O(N) search per node\n                j += 1\n            news[i].random = news[j]\n    return news[0] if news else None" },
              { n: "Better", cx: "O(N) time · O(N) space", idea: "A <b>HashMap old → new</b> answers 'where is the clone of X?' in O(1). Pass 1 creates every clone; pass 2 sets <code>next</code> and <code>random</code> through the map.", code: "def copy_random_list(head):\n    clone = {None: None}       # old node -> new node\n    t = head\n    while t:\n        clone[t] = Node(t.val)\n        t = t.next\n    t = head\n    while t:\n        clone[t].next = clone[t.next]\n        clone[t].random = clone[t.random]\n        t = t.next\n    return clone[head]" },
              { n: "Optimal", cx: "O(N) time · O(1) extra space (besides the output)", idea: "<b>Interleave</b> so the list itself is the map. 1) Insert each clone right after its original: 10,10′,20,20′… 2) The clone of X is X.next, so <code>t.next.random = t.random.next</code>. 3) Unzip the two lists, restoring the original.", code: "def copy_random_list(head):\n    if head is None:\n        return None\n    t = head\n    while t:                   # 1) interleave: 10, 10', 20, 20', ...\n        c = Node(t.val)\n        c.next = t.next\n        t.next = c\n        t = c.next\n    t = head\n    while t:                   # 2) clone(X) is X.next\n        if t.random:\n            t.next.random = t.random.next\n        t = t.next.next\n    chead = head.next\n    t1, t2 = head, chead\n    while t1:                  # 3) unzip and restore the original\n        t1.next = t1.next.next\n        t2.next = t2.next.next if t2.next else None\n        t1 = t1.next\n        t2 = t2.next\n    return chead" }
            ] }
        ]]
      ] },
      { h: "Patterns and pitfalls", blocks: [
        ["table", ["Signal in the problem", "Technique", "Cost"], [
          ["“middle”, “k-th from end”, “cycle”", "slow / fast pointers (or a gap of k)", "O(N), O(1) space"],
          ["“reverse”, “palindrome”, “reorder”", "prev / curr / temp reversal, often on half the list", "O(N), O(1)"],
          ["“merge”, “sort”, “partition”", "dummy node + tail", "O(N) or O(N log N)"],
          ["O(1) remove given a node; recency order", "doubly linked list + HashMap", "O(1) per op"],
          ["extra pointer (random, child)", "interleave clones or HashMap old → new", "O(N)"]]],
        ["list", [
          "Draw three or four nodes and run your pointer writes by hand before coding.",
          "Check four inputs every time: empty, one node, two nodes, and the normal case.",
          "When re-wiring, <b>save what you are about to overwrite</b> (temp = curr.next) first.",
          "Compare node <b>references</b>, not values, for cycles and intersections.",
          "If you mutate the input (palindrome check), restore it unless the problem says otherwise."]],
        ["extra", "Remove the N-th node from the end: move a <code>fast</code> pointer N steps ahead, then move both until fast reaches the end; slow is just before the victim. Start both at a dummy node so removing the head needs no special case."]
      ] }
    ],
    lc: [
      ["Reverse Linked List", "reverse-linked-list", "Easy"],
      ["Middle of the Linked List", "middle-of-the-linked-list", "Easy"],
      ["Merge Two Sorted Lists", "merge-two-sorted-lists", "Easy"],
      ["Linked List Cycle", "linked-list-cycle", "Easy"],
      ["Palindrome Linked List", "palindrome-linked-list", "Easy"],
      ["Intersection of Two Linked Lists", "intersection-of-two-linked-lists", "Easy"],
      ["Linked List Cycle II", "linked-list-cycle-ii", "Medium"],
      ["Add Two Numbers", "add-two-numbers", "Medium"],
      ["Remove Nth Node From End of List", "remove-nth-node-from-end-of-list", "Medium"],
      ["Reverse Linked List II", "reverse-linked-list-ii", "Medium"],
      ["Rotate List", "rotate-list", "Medium"],
      ["Partition List", "partition-list", "Medium"],
      ["Remove Duplicates from Sorted List II", "remove-duplicates-from-sorted-list-ii", "Medium"],
      ["Sort List", "sort-list", "Medium"],
      ["Reorder List", "reorder-list", "Medium"],
      ["Odd Even Linked List", "odd-even-linked-list", "Medium"],
      ["Copy List with Random Pointer", "copy-list-with-random-pointer", "Medium"],
      ["LRU Cache", "lru-cache", "Medium"],
      ["Design Linked List", "design-linked-list", "Medium"],
      ["Reverse Nodes in k-Group", "reverse-nodes-in-k-group", "Hard"],
      ["Merge k Sorted Lists", "merge-k-sorted-lists", "Hard"]
    ],
    quiz: [
      { q: "Why can't you binary search a sorted linked list in O(log N)?", o: ["Lists can't be sorted", "There is no random access: reaching the middle costs O(N)", "Binary search needs unique values", "It works fine in O(log N)"], a: 1, why: "Binary search jumps to the middle. On a list, getting to the middle means walking N/2 nodes." },
      { q: "When inserting nn after temp, which line must come first?", o: ["temp.next = nn", "nn.next = temp.next", "temp = temp.next", "Order doesn't matter"], a: 1, why: "If temp.next is overwritten first, nothing points to the rest of the list any more and it is lost." },
      { q: "Which loop condition makes slow stop at the FIRST middle of an even-length list?", o: ["while fast and fast.next", "while fast.next and fast.next.next", "while slow.next", "while fast"], a: 1, why: "Checking two nodes ahead stops fast one step earlier, so slow stays on the first middle (needed so merge sort splits 2 nodes into 1 + 1)." },
      { q: "After Floyd's slow and fast meet, how do you find the loop start?", o: ["Move fast two steps until it reaches head", "Reset slow to head; move both one step at a time until they meet", "Count the loop length and return head", "Reset both to head"], a: 1, why: "x = R3·l − y: the distance from head to the start equals the distance from the meeting point to the start (plus full laps)." },
      { q: "In merge sort on a list, what happens if you forget mid.next = null?", o: ["The output is reversed", "The recursion never terminates: the left half still contains the whole list", "Nothing, it still works", "It becomes O(N²)"], a: 1, why: "Without the cut, sorting 'the left half' still sees every node, so the problem never gets smaller." },
      { q: "Why does an LRU cache use a DOUBLY linked list instead of a singly linked one?", o: ["To save memory", "To unlink a node in O(1) given only a reference from the map", "To iterate backwards for printing", "Singly linked lists can't hold keys"], a: 1, why: "Removing from a singly linked list needs the predecessor, which costs O(N) to find. The DLL node knows its prev." },
      { q: "In the O(1)-space random-pointer copy, where is the clone of node X right after step 1?", o: ["At X.random", "At X.next", "In a HashMap", "At the end of the list"], a: 1, why: "Clones are interleaved right after their originals, so clone(X) = X.next and clone(X.random) = X.random.next." }
    ]
  };

  /* ═════════ TOPIC: STACKS & QUEUES ═════════ */
  T["stacks-queues"] = {
    name: "Stacks & queues", icon: "🥞", color: "#c2410c", minutes: 90,
    summary: "A stack hands back the newest item first (LIFO); a queue hands back the oldest (FIFO). Brackets, expressions, 'nearest greater/smaller' and window maximums all reduce to one of them.",
    sections: [
      { h: "Stacks: last in, first out", blocks: [
        ["analogy", "A pile of plates: you add to the top and take from the top. The function call stack and browser history work the same way. Visit Google → Wikipedia → LeetCode → YouTube → FB, then press Back three times: each Back pops from the history stack s1 and pushes onto a forward stack s2, leaving s1 = [Google, Wikipedia] and s2 = [FB, YouTube, LeetCode]."],
        ["table", ["Operation", "Meaning", "Cost"], [
          ["push(x)", "put x on top", "O(1)"],
          ["pop()", "remove the top", "O(1)"],
          ["top() / peek()", "read the top without removing it", "O(1)"],
          ["isEmpty()", "is there anything left?", "O(1)"]]],
        ["p", "Trace: push 2, 3, 18, 5 → pop gives 5 → peek gives 18 → push 10 → pops give 10, 18, 3, 2 → isEmpty is true."],
        ["p", "<b>Array version.</b> Keep <code>tos</code> (top-of-stack index), starting at −1. push does <code>tos++; arr[tos] = x</code> (overflow if tos == cap−1, or grow a dynamic array). pop does <code>tos--</code> after checking for empty. <b>Linked-list version.</b> Push and pop at the <b>head</b>: both are O(1). Using the tail makes pop O(N) on a singly linked list, and pushing at one end while popping from the other gives FIFO, which is a queue, not a stack."],
        ["probs", [
          { t: "Min stack", d: "Medium", q: "A stack that also returns its minimum in O(1).",
            ex: "push -2, push 0, push -3 → getMin = -3\npop → getMin = -2", lc: "min-stack",
            ap: [
              { n: "Brute force", cx: "O(N) getMin · O(1) other ops · O(N) space", idea: "A plain stack, and getMin scans every element. <b>Each getMin is O(N)</b>.", code: "class MinStack:\n    def __init__(self):\n        self.st = []\n\n    def push(self, x):\n        self.st.append(x)\n\n    def pop(self):\n        self.st.pop()\n\n    def top(self):\n        return self.st[-1]\n\n    def get_min(self):\n        return min(self.st)    # scans the whole stack" },
              { n: "Optimal", cx: "O(1) per operation · O(N) space", idea: "Push <b>pairs (value, min so far)</b>. The minimum of everything below never changes while an element sits on top, so each entry can remember it.", code: "class MinStack:\n    def __init__(self):\n        self.st = []           # (value, min of this and everything below)\n\n    def push(self, x):\n        cur_min = min(x, self.st[-1][1]) if self.st else x\n        self.st.append((x, cur_min))\n\n    def pop(self):\n        self.st.pop()\n\n    def top(self):\n        return self.st[-1][0]\n\n    def get_min(self):\n        return self.st[-1][1]" }
            ] }
        ]]
      ] },
      { h: "Classic stack problems", blocks: [
        ["p", "Use a stack whenever the <b>most recent unfinished thing</b> decides what happens next: the last opening bracket, the last character that might cancel, the last two operands."],
        ["viz", "validParens", "Openers go on the stack. A closer must match the top."],
        ["probs", [
          { t: "Valid parentheses", d: "Easy", q: "A string of (), {} and []: is every bracket closed in the correct order?",
            ex: "()[{}()] → true    ({}) → true\n({)} → false       ([}]) → false\n([{}[]]()) → true", viz: "validParens", lc: "valid-parentheses",
            ap: [
              { n: "Brute force", cx: "O(N²) time · O(N) space", idea: "Delete '()', '[]' and '{}' pairs repeatedly until nothing changes; valid means the string ends empty. Each pass is O(N) and there can be N/2 passes, so <b>O(N²)</b>.", code: "def is_valid(s):\n    prev = None\n    while s != prev:           # repeat until nothing changes\n        prev = s\n        s = s.replace('()', '').replace('[]', '').replace('{}', '')\n    return s == ''" },
              { n: "Optimal", cx: "O(N) time · O(N) space", idea: "The top of the stack is the <b>most recent unmatched opener</b>, and a closer must match it. Three ways to fail: <b>mismatch</b> (({)}), <b>extra closer</b> (stack empty), <b>leftover opener</b> (stack not empty at the end).", code: "def is_valid(s):\n    match = {')': '(', ']': '[', '}': '{'}\n    st = []\n    for ch in s:\n        if ch in '([{':\n            st.append(ch)\n        else:\n            if not st or st[-1] != match[ch]:\n                return False   # extra closer or mismatch\n            st.pop()\n    return not st              # leftover openers are invalid" }
            ] },
          { t: "Double Character Trouble (remove adjacent duplicates)", d: "Easy", q: "Repeatedly delete pairs of equal adjacent characters; deletions can create new pairs. Return the final string.",
            ex: "abbd → ad\nabccbde → abbde → ade\nabbbd → abd  (a pair removes exactly two)\nabbcbbcacx → cx\nabcdccdcaabxxdad → adad", lc: "remove-all-adjacent-duplicates-in-string",
            ap: [
              { n: "Brute force", cx: "O(N²) time · O(N) space", idea: "Find the first equal pair, delete it, and start scanning again. A deletion can create a new pair, so you <b>rescan many times</b>.", code: "def remove_duplicates(s):\n    changed = True\n    while changed:\n        changed = False\n        for i in range(len(s) - 1):\n            if s[i] == s[i + 1]:\n                s = s[:i] + s[i + 2:]   # delete the pair, rescan\n                changed = True\n                break\n    return s" },
              { n: "Optimal", cx: "O(N) time · O(N) space", idea: "<b>Stack:</b> if the character equals the top, pop (they cancel); otherwise push. With a C++/Java stack you reverse at the end; a Python list is already bottom→top.", code: "def remove_duplicates(s):\n    st = []\n    for ch in s:\n        if st and st[-1] == ch:\n            st.pop()           # the pair cancels\n        else:\n            st.append(ch)\n    return ''.join(st)" }
            ] },
          { t: "Evaluate a postfix expression", d: "Medium", q: "Evaluate a valid postfix (Reverse Polish) expression.",
            ex: "[3, 5, +, 2, -, 2, 5, *, -]\n= ((3+5)−2) − (2*5) = 6 − 10 = -4", edge: "operand order for − and /; '-3' is a number, not an operator; division truncates toward zero; division by zero", viz: "lin_postfix", lc: "evaluate-reverse-polish-notation",
            ap: [
              { n: "Solution", cx: "O(N) time · O(N) space", idea: "Push numbers. On an operator, pop twice: the <b>first pop is the RIGHT operand</b> (op2), the second is the LEFT (op1). Push <code>op1 ⊕ op2</code>. The last value left is the answer. (Converting back to infix and parsing precedence would be much more work.)", code: "def eval_postfix(tokens):\n    st = []\n    for tok in tokens:\n        if tok in ('+', '-', '*', '/'):\n            op2 = st.pop()     # RIGHT operand comes off first\n            op1 = st.pop()     # then the LEFT operand\n            if tok == '+':\n                st.append(op1 + op2)\n            elif tok == '-':\n                st.append(op1 - op2)\n            elif tok == '*':\n                st.append(op1 * op2)\n            else:\n                st.append(int(op1 / op2))   # truncate toward 0\n        else:\n            st.append(int(tok))\n    return st[-1]" }
            ] },
          { t: "Infix to postfix (and prefix)", d: "Medium", q: "Convert an infix expression like a+b*(c−d) to postfix.",
            ex: "a+b*(c-d) → a b c d - * +\n2+(5*3) → 2 5 3 * +",
            ap: [
              { n: "Solution", cx: "O(N) time · O(N) space", idea: "Operands go straight to the output. Push '('. On ')', pop to the output until '('. On an operator, first pop every operator on the stack with <b>precedence ≥ the current one</b> (left-associative), then push it. At the end, pop everything. For prefix: reverse the input, swap '(' and ')', convert (popping only <b>strictly</b> higher precedence), and reverse the result.", code: "PREC = {'+': 1, '-': 1, '*': 2, '/': 2}\n\ndef to_postfix(tokens, strict=False):\n    out, st = [], []\n    for t in tokens:\n        if t == '(':\n            st.append(t)\n        elif t == ')':\n            while st[-1] != '(':\n                out.append(st.pop())\n            st.pop()           # drop the '('\n        elif t in PREC:\n            while st and st[-1] != '(':\n                top = PREC[st[-1]]\n                if top > PREC[t] or (top == PREC[t] and not strict):\n                    out.append(st.pop())\n                else:\n                    break\n            st.append(t)\n        else:\n            out.append(t)      # operand\n    while st:\n        out.append(st.pop())\n    return out\n\ndef to_prefix(tokens):\n    swap = {'(': ')', ')': '('}\n    rev = [swap.get(t, t) for t in reversed(tokens)]\n    return to_postfix(rev, strict=True)[::-1]" }
            ] }
        ]],
        ["viz", "lin_postfix", "Postfix needs no brackets and no precedence rules: the order of tokens already says what to do."]
      ] },
      { h: "Monotonic stack: nearest smaller and greater", blocks: [
        ["p", "Task: for each index, find the <b>nearest element to the left that is smaller</b> (NSL). Brute force scans left from every index: O(N²). The key observation: once a smaller element x appears, every earlier element ≥ x can <b>never</b> be the answer for anything to the right, because x is both nearer and smaller. So throw them away. What remains is always increasing: a <b>monotonic stack</b>."],
        ["steps", [
          ["Pop", "Pop every element that can't be the answer (for NSL: everything ≥ arr[i])."],
          ["Answer", "If the stack is empty the answer is −1, otherwise it is the top."],
          ["Push", "Push arr[i] (or its index i). Each element is pushed once and popped at most once, so the total is O(N)."]]],
        ["viz", "nextGreater", "The same idea for next greater: a decreasing stack, where popped elements get their answer."],
        ["table", ["Variant", "Scan direction", "Pop while top is…", "Stack holds"], [
          ["NSL: nearest smaller on the left", "left → right", "≥ arr[i]", "increasing"],
          ["NSR: nearest smaller on the right", "right → left", "≥ arr[i]", "increasing"],
          ["NGL: nearest greater on the left", "left → right", "≤ arr[i]", "decreasing"],
          ["NGR: nearest greater on the right", "right → left", "≤ arr[i]", "decreasing"]]],
        ["tip", "Store <b>indices</b>, not values, whenever you need widths or counts later. Compare with <code>arr[st.top()]</code>."],
        ["probs", [
          { t: "Nearest smaller element on the left", d: "Medium", q: "For each i, the closest element to the left strictly smaller than arr[i], else −1. N ≤ 10^5.",
            ex: "[4,5,2,10,3,2] → [-1,4,-1,2,2,-1]\n[4,6,10,11,7,8,3,5] → [-1,4,6,10,6,7,-1,3]\n[5,2,8,10,6,1,7,15] → [-1,-1,2,8,2,-1,1,7]",
            ap: [
              { n: "Brute force", cx: "O(N²) time · O(1) extra space", idea: "For each i, scan j = i−1 down to 0 and stop at the first smaller value. A long decreasing run makes every scan go all the way back: <b>O(N²)</b>.", code: "def nearest_smaller_left(arr):\n    ans = []\n    for i in range(len(arr)):\n        res = -1\n        for j in range(i - 1, -1, -1):\n            if arr[j] < arr[i]:\n                res = arr[j]\n                break\n        ans.append(res)\n    return ans" },
              { n: "Optimal", cx: "O(N) time · O(N) space", idea: "Earlier elements ≥ the current one are <b>useless forever</b> (the current one is nearer and smaller), so pop them; the top is then the answer; push the current element. Each element is pushed and popped at most once.", code: "def nearest_smaller_left(arr):\n    st, ans = [], []\n    for x in arr:\n        while st and st[-1] >= x:   # can never be an answer again\n            st.pop()\n        ans.append(st[-1] if st else -1)\n        st.append(x)\n    return ans" }
            ] },
          { t: "Nearest smaller on the right / greater on the left and right", d: "Medium", q: "The three sibling problems.",
            ex: "NSR [7,9,3,5,8,11,6] → [3,3,-1,-1,6,6,-1]\nNGL [9,7,3,5,4,2,6,1,8] → [-1,9,7,7,5,4,7,6,9]", lc: "next-greater-element-i",
            ap: [
              { n: "Brute force", cx: "O(N²) time · O(1) extra space", idea: "For each i, scan outward in the required direction until the first element that qualifies. Same <b>O(N²)</b> worst case as before.", code: "def next_greater_right(arr):\n    n = len(arr)\n    ans = [-1] * n\n    for i in range(n):\n        for j in range(i + 1, n):\n            if arr[j] > arr[i]:\n                ans[i] = arr[j]\n                break\n    return ans" },
              { n: "Optimal", cx: "O(N) time · O(N) space", idea: "<b>Right side: iterate from N−1 down to 0.</b> Greater instead of smaller: pop elements <b>≤</b> arr[i], so the stack is decreasing. Same three steps: pop, answer, push.", code: "def next_greater_right(arr):\n    n = len(arr)\n    st, ans = [], [-1] * n\n    for i in range(n - 1, -1, -1):  # right side: scan backwards\n        while st and st[-1] <= arr[i]:\n            st.pop()\n        ans[i] = st[-1] if st else -1\n        st.append(arr[i])\n    return ans\n\ndef next_smaller_right(arr):\n    n = len(arr)\n    st, ans = [], [-1] * n\n    for i in range(n - 1, -1, -1):\n        while st and st[-1] >= arr[i]:\n            st.pop()\n        ans[i] = st[-1] if st else -1\n        st.append(arr[i])\n    return ans" }
            ] },
          { t: "Index of the nearest smaller element on the left", d: "Medium", q: "Same as NSL but return the index.",
            ex: "[5,2,8,10,6,1,7,15] → [-1,-1,1,2,1,-1,5,6]",
            ap: [
              { n: "Brute force", cx: "O(N²) time · O(1) extra space", idea: "Scan left from each i and record the index j of the first smaller value. <b>O(N²)</b> in the worst case.", code: "def nsl_index(arr):\n    ans = []\n    for i in range(len(arr)):\n        j = i - 1\n        while j >= 0 and arr[j] >= arr[i]:\n            j -= 1\n        ans.append(j)          # -1 if nothing smaller\n    return ans" },
              { n: "Optimal", cx: "O(N) time · O(N) space", idea: "Push <b>indices</b> and compare <code>arr[st.top()] ≥ arr[i]</code>. Indices give you widths, which the histogram and contribution problems need.", code: "def nsl_index(arr):\n    st, ans = [], []\n    for i, x in enumerate(arr):\n        while st and arr[st[-1]] >= x:\n            st.pop()\n        ans.append(st[-1] if st else -1)\n        st.append(i)\n    return ans" }
            ] },
          { t: "Daily temperatures", d: "Medium", q: "For each day, how many days until a warmer temperature (0 if never)?",
            ex: "[73,74,75,71,69,72,76,73]\nAnswer: [1,1,4,2,1,1,0,0]", lc: "daily-temperatures",
            ap: [
              { n: "Brute force", cx: "O(N²) time · O(1) extra space", idea: "Scan forward from each day until a warmer one. A long cooling streak makes each scan long: <b>O(N²)</b>.", code: "def daily_temperatures(T):\n    n = len(T)\n    ans = [0] * n\n    for i in range(n):\n        for j in range(i + 1, n):\n            if T[j] > T[i]:\n                ans[i] = j - i\n                break\n    return ans" },
              { n: "Optimal", cx: "O(N) time · O(N) space", idea: "Next greater on the right with <b>indices</b>. The stack holds days still waiting for a warmer day; when one arrives, every cooler waiting day is popped and gets its answer as the index difference.", code: "def daily_temperatures(T):\n    ans, st = [0] * len(T), []    # st: days still waiting\n    for i, t in enumerate(T):\n        while st and T[st[-1]] < t:\n            j = st.pop()\n            ans[j] = i - j        # day j found its warmer day\n        st.append(i)\n    return ans" }
            ] }
        ]]
      ] },
      { h: "Histogram area and contribution counting", blocks: [
        ["p", "In the largest rectangle, <b>some bar is the shortest</b>. If bar i is the shortest, the rectangle stretches left until just after the nearest smaller bar (index nsl[i]) and right until just before the nearest smaller bar on the right (nsr[i]). So the width is <code>nsr[i] − nsl[i] − 1</code>, with −1 and N as the defaults."],
        ["viz", "lin_histogram", "Pass 1 builds nsl, pass 2 builds nsr, pass 3 tries every bar as the height. Try the 20-bar preset."],
        ["probs", [
          { t: "Largest rectangle in a histogram", d: "Hard", q: "Bars of width 1 and heights arr[i]: find the largest rectangle area.",
            ex: "[2,1,5,6,2,3] → 10\n20 bars: 2,1,4,7,5,2,1,3,4,5,6,4,3,2,3,1,5,6,4,2\nnsl = [-1,-1,1,2,2,1,-1,6,7,8,9,7,6,6,13,-1,15,16,15,15]\nnsr = [1,20,5,4,5,6,20,13,12,11,11,12,13,15,15,20,18,18,19,20]", edge: "In the 20-bar example, the highlighted height-3 rectangle over bars 7–12 (area 18) is the best with height ≥ 2. The overall answer is <b>20</b>: the height-1 bars span all 20 columns. Also: all equal heights → h × N; one bar; use long for big areas.", viz: "lin_histogram", lc: "largest-rectangle-in-histogram",
            ap: [
              { n: "Brute force", cx: "O(N²) time · O(1) space", idea: "Treat every bar as the shortest bar of its rectangle and <b>walk left and right</b> while neighbours are at least as tall. Each walk can be O(N).", code: "def largest_rectangle(h):\n    n, best = len(h), 0\n    for i in range(n):\n        l = i\n        while l > 0 and h[l - 1] >= h[i]:\n            l -= 1\n        r = i\n        while r < n - 1 and h[r + 1] >= h[i]:\n            r += 1\n        best = max(best, h[i] * (r - l + 1))\n    return best" },
              { n: "Better", cx: "O(N) time · O(N) space (three passes)", idea: "Build <b>index</b> arrays nsl and nsr with monotonic stacks (defaults −1 and N), then <b>area = h[i] × (nsr[i] − nsl[i] − 1)</b> and take the max. This is exactly what the animation shows.", code: "def largest_rectangle(h):\n    n = len(h)\n    nsl, nsr = [-1] * n, [n] * n\n    st = []\n    for i in range(n):              # nearest smaller on the left\n        while st and h[st[-1]] >= h[i]:\n            st.pop()\n        nsl[i] = st[-1] if st else -1\n        st.append(i)\n    st = []\n    for i in range(n - 1, -1, -1):  # nearest smaller on the right\n        while st and h[st[-1]] >= h[i]:\n            st.pop()\n        nsr[i] = st[-1] if st else n\n        st.append(i)\n    best = 0\n    for i in range(n):\n        best = max(best, h[i] * (nsr[i] - nsl[i] - 1))\n    return best" },
              { n: "Optimal", cx: "O(N) time · O(N) space (one pass)", idea: "Do it in one pass: when bar i <b>pops</b> bar top, i is top's nearest smaller on the right and the new stack top is its nearest smaller on the left, so its area is known right then. A sentinel height 0 at the end flushes the stack.", code: "def largest_rectangle(h):\n    st, best = [], 0                # indices, heights increasing\n    for i in range(len(h) + 1):\n        cur = h[i] if i < len(h) else 0   # 0 flushes the stack\n        while st and h[st[-1]] >= cur:\n            top = st.pop()\n            left = st[-1] if st else -1   # nsl of top; i is its nsr\n            best = max(best, h[top] * (i - left - 1))\n        st.append(i)\n    return best" }
            ] },
          { t: "Maximal rectangle in a binary matrix", d: "Hard", q: "Largest rectangle containing only 1s in a 0/1 matrix.",
            ex: "Rows: 10100 / 10111 / 11111 / 10010\nAnswer: 6", lc: "maximal-rectangle",
            ap: [
              { n: "Brute force", cx: "O(R²·C) time · O(C) space", idea: "Fix a top row and grow the bottom row; track which columns are all 1s between them, and the longest run of such columns gives the width. <b>Every pair of rows</b> is tried.", code: "def maximal_rectangle(M):\n    if not M:\n        return 0\n    R, C = len(M), len(M[0])\n    best = 0\n    for top in range(R):\n        ok = [True] * C             # column all 1s from top to bottom?\n        for bottom in range(top, R):\n            run = 0\n            for c in range(C):\n                ok[c] = ok[c] and M[bottom][c] == '1'\n                run = run + 1 if ok[c] else 0\n                best = max(best, run * (bottom - top + 1))\n    return best" },
              { n: "Optimal", cx: "O(R·C) time · O(C) space", idea: "Treat each row as the floor of a <b>histogram</b>: <code>height[c] += 1</code> if the cell is 1, else reset to 0. Run the largest-rectangle solution on every row. (Picture it as a running heights array like [0,3,2,1,0].)", code: "def maximal_rectangle(M):\n    if not M:\n        return 0\n    C = len(M[0])\n    heights = [0] * C\n    best = 0\n    for row in M:\n        for c in range(C):\n            heights[c] = heights[c] + 1 if row[c] == '1' else 0\n        best = max(best, largest_rectangle(heights))   # histogram problem\n    return best" }
            ] },
          { t: "Sum of (max − min) over all subarrays", d: "Hard", q: "Add up max − min for every subarray. N ≤ 10^5.",
            ex: "[2,5,3]: [2]→0 [2,5]→3 [2,5,3]→3 [5]→0 [5,3]→2 [3]→0\nAnswer: 8", edge: "<b>Duplicates:</b> break ties on one side only, or a subarray is counted once per copy. ngl pops smaller AND equal; ngr pops only strictly smaller; nsl pops greater AND equal; nsr pops only strictly greater. Use 64-bit sums (and a modulus if asked).", lc: "sum-of-subarray-ranges",
            ap: [
              { n: "Brute force", cx: "O(N²) time · O(1) space", idea: "Fix each start and extend the end, updating the running max and min as you go. Every one of the N² subarrays is visited: <b>too slow for N = 10^5</b>.", code: "def sub_array_ranges(a):\n    n, total = len(a), 0\n    for i in range(n):\n        mx = mn = a[i]\n        for j in range(i, n):\n            mx = max(mx, a[j])\n            mn = min(mn, a[j])\n            total += mx - mn\n    return total" },
              { n: "Optimal", cx: "O(N) time · O(N) space", idea: "<b>Contribution technique:</b> Σ(max − min) = Σmax − Σmin. Element i is the max of <b>(i − left[i]) × (right[i] − i)</b> subarrays (choices of start × choices of end), where left/right are the nearest greater boundaries. In [1,8,3,5,4,2,11,7,2], the 5 at index 3 has boundaries 1 and 6: 2 starts × 3 ends = 6 subarrays. Negating the values turns 'min' into 'max', so one helper does both.", code: "def sub_array_ranges(a):\n    n = len(a)\n\n    def sum_of_max(b):\n        left = [-1] * n            # previous index with b >= b[i]\n        st = []\n        for i in range(n):\n            while st and b[st[-1]] < b[i]:\n                st.pop()\n            left[i] = st[-1] if st else -1\n            st.append(i)\n        right = [n] * n            # next index with b > b[i]\n        st = []\n        for i in range(n - 1, -1, -1):\n            while st and b[st[-1]] <= b[i]:\n                st.pop()\n            right[i] = st[-1] if st else n\n            st.append(i)\n        return sum(b[i] * (i - left[i]) * (right[i] - i) for i in range(n))\n\n    # sum of max of -a is minus the sum of min of a\n    return sum_of_max(a) + sum_of_max([-x for x in a])" }
            ] }
        ]],
        ["extra", "The same counting gives LeetCode 907 (sum of subarray minimums) on its own: just the Σmin half, mod 10^9+7."]
      ] },
      { h: "Queues and circular queues", blocks: [
        ["analogy", "A ticket counter: people join at the back (rear) and are served from the front. Printers, call centres and message queues work the same way. First in, first out."],
        ["p", "Operations: <code>enqueue(x)</code> at the rear, <code>dequeue()</code> from the front, <code>front()</code>, <code>isEmpty()</code>, all O(1). In the array version, <code>front</code> is the index of the element removed most recently and <code>rear</code> the index added most recently, both starting at −1. Trace: Eq 3, Eq 7, Eq 12, Dq, Dq, Eq 8, Eq 3 → front() = 12 with the array [3,7,12,8,3]."],
        ["warn", "In the linear version the slots before <code>front</code> are wasted forever. Wrap around with <code>% N</code> to make a <b>circular queue</b>, but then <code>front == rear</code> could mean empty or full. A separate <b>size</b> counter fixes this."],
        ["code", "class CircularQueue:\n    def __init__(self, cap):\n        self.N = cap\n        self.arr = [0] * cap\n        self.front = -1        # index removed most recently\n        self.rear = -1         # index added most recently\n        self.size = 0          # tells empty from full\n\n    def enqueue(self, x):\n        if self.size == self.N:\n            return 'full'\n        self.rear = (self.rear + 1) % self.N    # wrap around\n        self.arr[self.rear] = x\n        self.size += 1\n\n    def dequeue(self):\n        if self.size == 0:\n            return -1\n        self.front = (self.front + 1) % self.N\n        self.size -= 1\n        return self.arr[self.front]\n\n    def get_front(self):\n        if self.size == 0:\n            return -1\n        return self.arr[(self.front + 1) % self.N]"],
        ["viz", "lin_twoStackQueue", "Pouring IN into OUT reverses the order once, which turns LIFO into FIFO."],
        ["probs", [
          { t: "Implement a queue using two stacks", d: "Easy", q: "Support enqueue, dequeue, front and isEmpty with only stack operations.",
            ex: "enqueue 10,20,30,40,50,60,70,37 → all in st1\nfirst dequeue moves them to st2 (10 on top) and pops 10\nnew enqueues 73,95,100,200 wait in st1 until st2 is empty", viz: "lin_twoStackQueue", lc: "implement-queue-using-stacks",
            ap: [
              { n: "Brute force", cx: "O(N) per dequeue · O(N) space", idea: "Keep one stack. To dequeue, pour everything into a temporary stack to reach the bottom (the oldest), pop it, and <b>pour everything back</b>. Every dequeue moves all N elements twice.", code: "class MyQueue:\n    def __init__(self):\n        self.st = []           # bottom = front of the queue\n\n    def enqueue(self, x):\n        self.st.append(x)\n\n    def dequeue(self):\n        if not self.st:\n            return -1\n        tmp = []\n        while self.st:         # pour out to reach the bottom\n            tmp.append(self.st.pop())\n        ans = tmp.pop()\n        while tmp:             # pour everything back\n            self.st.append(tmp.pop())\n        return ans" },
              { n: "Optimal", cx: "O(1) amortized per operation · O(N) space", idea: "<b>st1 = input, st2 = output.</b> Enqueue pushes onto st1. Dequeue pops st2; <b>only when st2 is empty</b>, pour all of st1 into it. Each element moves at most once, so N dequeues cost about 2N stack operations.", code: "class MyQueue:\n    def __init__(self):\n        self.st1 = []          # IN: new elements\n        self.st2 = []          # OUT: oldest element on top\n\n    def enqueue(self, x):\n        self.st1.append(x)\n\n    def _pour(self):\n        if not self.st2:       # only when OUT is empty\n            while self.st1:\n                self.st2.append(self.st1.pop())\n\n    def dequeue(self):\n        self._pour()\n        return self.st2.pop() if self.st2 else -1\n\n    def front(self):\n        self._pour()\n        return self.st2[-1] if self.st2 else -1\n\n    def is_empty(self):\n        return not self.st1 and not self.st2" }
            ] },
          { t: "Design a circular queue", d: "Medium", q: "Fixed-capacity ring buffer with enQueue, deQueue, Front, Rear, isEmpty, isFull.",
            ex: "cap 3: enQueue 1,2,3 → true; enQueue 4 → false (full)\nRear → 3; deQueue; enQueue 4 → true; Rear → 4", lc: "design-circular-queue",
            ap: [
              { n: "Brute force", cx: "O(N) deQueue · O(N) space", idea: "Store elements in a list and remove from the front with <code>pop(0)</code>. Simple, but every dequeue <b>shifts all remaining elements</b>.", code: "class MyCircularQueue:\n    def __init__(self, k):\n        self.a = []\n        self.k = k\n\n    def enQueue(self, x):\n        if len(self.a) == self.k:\n            return False\n        self.a.append(x)\n        return True\n\n    def deQueue(self):\n        if not self.a:\n            return False\n        self.a.pop(0)          # shifts every element: O(N)\n        return True" },
              { n: "Optimal", cx: "O(1) per operation · O(N) space", idea: "A fixed array whose indices move with <b>% N</b>, so freed front slots are reused. A <b>size</b> counter tells full from empty, and the rear is <code>(head + size − 1) % N</code>.", code: "class MyCircularQueue:\n    def __init__(self, k):\n        self.a = [0] * k\n        self.n = k\n        self.head = 0          # index of the front element\n        self.size = 0\n\n    def enQueue(self, x):\n        if self.size == self.n:\n            return False\n        self.a[(self.head + self.size) % self.n] = x\n        self.size += 1\n        return True\n\n    def deQueue(self):\n        if self.size == 0:\n            return False\n        self.head = (self.head + 1) % self.n\n        self.size -= 1\n        return True\n\n    def Front(self):\n        return -1 if self.size == 0 else self.a[self.head]\n\n    def Rear(self):\n        if self.size == 0:\n            return -1\n        return self.a[(self.head + self.size - 1) % self.n]\n\n    def isEmpty(self):\n        return self.size == 0\n\n    def isFull(self):\n        return self.size == self.n" }
            ] },
          { t: "Perfect numbers (A-th perfect number)", d: "Medium", q: "Perfect numbers use only digits 1 and 2, have an even number of digits, and are palindromes. Return the A-th smallest. A ≤ 10^5.",
            ex: "11, 22, 1111, 1221, 2112, 2222, 111111, 112211, 121121, …\nA = 9 → 121121", edge: "A = 1 → 11; A = 2 → 22",
            ap: [
              { n: "Brute force", cx: "exponential in the number of digits", idea: "Test 11, 12, 13, … against the three rules and count the hits. Almost every integer fails, and the answers grow to dozens of digits, so this is <b>hopeless for large A</b>.", code: "def is_perfect(x):\n    s = str(x)\n    return len(s) % 2 == 0 and set(s) <= {'1', '2'} and s == s[::-1]\n\ndef solve(A):\n    x, count = 10, 0\n    while True:\n        x += 1\n        if is_perfect(x):\n            count += 1\n            if count == A:\n                return str(x)" },
              { n: "Optimal", cx: "O(A) queue operations (strings grow, so O(A log A) characters)", idea: "A perfect number is <b>half + reverse(half)</b>. The halves in order are 1, 2, 11, 12, 21, 22, 111, … which is a <b>BFS with a queue</b>: dequeue s, enqueue s+'1' and s+'2'. The A-th half gives the answer. A = 9: the 9th half is '121', so the answer is 121121.", code: "from collections import deque\n\ndef solve(A):\n    if A <= 2:\n        return '11' if A == 1 else '22'\n    q = deque(['1', '2'])      # halves, in increasing order\n    count = 2\n    while True:\n        num = q.popleft()\n        for d in '12':\n            s = num + d\n            q.append(s)\n            count += 1\n            if count == A:\n                return s + s[::-1]" }
            ] }
        ]]
      ] },
      { h: "Deque and sliding window maximum", blocks: [
        ["p", "A <b>deque</b> (double-ended queue) adds and removes at both ends in O(1): addFirst/addLast, removeFirst/removeLast, getFirst/getLast. In Java, <code>ArrayDeque</code> serves as both a stack and a queue."],
        ["p", "<b>Sliding window maximum</b> is 'nearest greater on the left' inside a moving window. Keep a deque of <b>indices</b> whose values decrease from front to back. A new element evicts every smaller value from the back, because those can never be a window maximum again. The front is always the current maximum; drop it once its index leaves the window."],
        ["viz", "windowMaxDeque", "The front of the deque is the maximum of the current window."],
        ["probs", [
          { t: "Sliding window maximum", d: "Hard", q: "Return the maximum of every window of size K. N ≤ 10^5.",
            ex: "[3,2,3,4,5,5,4,5,6], K = 4 → [4,5,5,5,5,6]\n[3,2,9,4,-1,16,1,7,-2,5,-5], K = 4 → [9,9,16,16,16,16,7,7]", edge: "K = 1 → the array itself; K = N → one maximum; equal values may stay or be popped, both work", viz: "windowMaxDeque", lc: "sliding-window-maximum",
            ap: [
              { n: "Brute force", cx: "O(N·K) time · O(1) extra space", idea: "Take the max of each window from scratch. Neighbouring windows share K−1 elements, and all that work is <b>thrown away</b>: close to O(N²) for large K.", code: "def max_sliding_window(a, K):\n    ans = []\n    for i in range(len(a) - K + 1):\n        ans.append(max(a[i:i + K]))\n    return ans" },
              { n: "Better", cx: "O(N log N) time · O(N) space", idea: "A <b>max-heap of (value, index)</b>. Push each element; before reading the top, pop tops whose index has left the window (lazy deletion).", code: "import heapq\n\ndef max_sliding_window(a, K):\n    h, ans = [], []\n    for i, x in enumerate(a):\n        heapq.heappush(h, (-x, i))  # max-heap via negatives\n        while h[0][1] <= i - K:     # drop expired tops lazily\n            heapq.heappop(h)\n        if i >= K - 1:\n            ans.append(-h[0][0])\n    return ans" },
              { n: "Optimal", cx: "O(N) time · O(K) space", idea: "<b>Monotonic deque of indices</b>, values decreasing front to back. For each i: pop smaller values from the back (they can never be a maximum again), push i, drop the front if it is ≤ i − K, and once i ≥ K−1 record a[front].", code: "from collections import deque\n\ndef max_sliding_window(a, K):\n    dq, ans = deque(), []\n    for i, x in enumerate(a):\n        while dq and a[dq[-1]] < x:  # smaller values are useless now\n            dq.pop()\n        dq.append(i)\n        if dq[0] <= i - K:           # front left the window\n            dq.popleft()\n        if i >= K - 1:\n            ans.append(a[dq[0]])\n    return ans" }
            ] }
        ]]
      ] },
      { h: "Interview cheatsheet", blocks: [
        ["table", ["Signal", "Tool", "Why"], [
          ["matching brackets, undo, nested structure", "stack", "the most recent open item decides"],
          ["evaluate / convert an expression", "stack (operands or operators)", "postfix needs no precedence"],
          ["nearest / next greater or smaller", "monotonic stack", "useless candidates are popped once"],
          ["areas, spans, 'how many subarrays have X as min/max'", "monotonic stack with indices", "width = right boundary − left boundary − 1"],
          ["process in arrival order, BFS, generate in order", "queue", "FIFO"],
          ["max/min of every window", "monotonic deque", "front = answer, expiry from the front"],
          ["queue from stacks / stack from queues", "two containers", "reversal once gives O(1) amortized"]]],
        ["list", [
          "Decide what the stack holds (values or indices) and what the pop condition is <b>before</b> coding.",
          "For pairs of nearest-boundary arrays, write the default values (−1 and N) explicitly.",
          "With duplicates, use ≥ on one side and > on the other so each subarray is counted once.",
          "Postfix: op2 is popped first. Getting op1 and op2 backwards breaks − and /."]]
      ] }
    ],
    lc: [
      ["Valid Parentheses", "valid-parentheses", "Easy"],
      ["Remove All Adjacent Duplicates In String", "remove-all-adjacent-duplicates-in-string", "Easy"],
      ["Next Greater Element I", "next-greater-element-i", "Easy"],
      ["Implement Queue using Stacks", "implement-queue-using-stacks", "Easy"],
      ["Implement Stack using Queues", "implement-stack-using-queues", "Easy"],
      ["Min Stack", "min-stack", "Medium"],
      ["Evaluate Reverse Polish Notation", "evaluate-reverse-polish-notation", "Medium"],
      ["Simplify Path", "simplify-path", "Medium"],
      ["Daily Temperatures", "daily-temperatures", "Medium"],
      ["Online Stock Span", "online-stock-span", "Medium"],
      ["Asteroid Collision", "asteroid-collision", "Medium"],
      ["Decode String", "decode-string", "Medium"],
      ["Design Circular Queue", "design-circular-queue", "Medium"],
      ["Sum of Subarray Minimums", "sum-of-subarray-minimums", "Medium"],
      ["Sum of Subarray Ranges", "sum-of-subarray-ranges", "Medium"],
      ["Basic Calculator", "basic-calculator", "Hard"],
      ["Largest Rectangle in Histogram", "largest-rectangle-in-histogram", "Hard"],
      ["Maximal Rectangle", "maximal-rectangle", "Hard"],
      ["Sliding Window Maximum", "sliding-window-maximum", "Hard"]
    ],
    quiz: [
      { q: "Implementing a stack with a singly linked list, which choice gives O(1) push and pop?", o: ["Push at tail, pop at tail", "Push at head, pop at head", "Push at head, pop at tail", "Push at tail, pop at head"], a: 1, why: "Popping the tail needs the second-last node (O(N)), and using different ends gives FIFO, not LIFO." },
      { q: "Evaluating postfix, you see '−' and the stack top is 10 with 6 below it. What is pushed?", o: ["4", "−4", "16", "60"], a: 1, why: "The first pop is the right operand: op2 = 10, op1 = 6, so 6 − 10 = −4." },
      { q: "For 'nearest smaller on the left', what do you pop before reading the answer?", o: ["Elements smaller than arr[i]", "Elements greater than or equal to arr[i]", "Only equal elements", "Nothing; just read the top"], a: 1, why: "Anything ≥ arr[i] can never be the nearest smaller for this or any later index, because arr[i] is nearer and smaller." },
      { q: "Why is the monotonic stack O(N) even though there is a while loop inside the for loop?", o: ["The while loop runs at most once", "Each index is pushed once and popped at most once, so all pops total ≤ N", "The input is sorted", "It isn't; it's O(N²)"], a: 1, why: "Amortized counting: the total work of all pops over the whole scan is bounded by the number of pushes." },
      { q: "Largest rectangle: bar i with nsl[i] = 1 and nsr[i] = 6. How wide is its rectangle?", o: ["5", "4", "6", "7"], a: 1, why: "Width = nsr − nsl − 1 = 6 − 1 − 1 = 4 (indices 2..5)." },
      { q: "Queue via two stacks: why is dequeue O(1) amortized?", o: ["Every dequeue pours the stacks", "Each element is moved from IN to OUT at most once over its lifetime", "Stacks are faster than queues", "Because OUT is never empty"], a: 1, why: "An element is pushed, moved once and popped once: about 3 operations per element in total, however the calls are ordered." },
      { q: "Circular queue with front == rear. How do you tell empty from full?", o: ["They can't", "A separate size counter", "Check arr[front] == null", "Always leave the array half empty"], a: 1, why: "With wrap-around both states look the same, so a size counter (or one wasted slot) disambiguates." },
      { q: "In sliding window maximum, what does the deque store and in what order?", o: ["Values in increasing order", "Indices whose values decrease from front to back", "All indices of the window", "The K largest values in a heap"], a: 1, why: "Indices let you detect expiry; decreasing values make the front the maximum." }
    ]
  };

  /* ═════════ TOPIC: HEAPS ═════════ */
  T["heaps"] = {
    name: "Heaps & priority queues", icon: "⛰️", color: "#7c3aed", minutes: 75,
    summary: "A complete binary tree stored in an array where every parent beats its children. You get the min (or max) in O(1) and insert or remove in O(log N), which is exactly what 'repeatedly take the smallest' problems need.",
    sections: [
      { h: "Why heaps: connecting the ropes", blocks: [
        ["p", "Joining two ropes costs the sum of their lengths. A rope joined early is paid for again in every later join, so short ropes should be joined first. Always joining the <b>two smallest</b> is optimal (the same greedy as Huffman coding). The question is how to find the two smallest again and again quickly."],
        ["math", [
          ["left to right", "7 + 9 + 15 + 18", "49"],
          ["sort once, join in order", "4 + 7 + 12 + 18", "41"],
          ["always the two smallest", "(2+2) + (3+4) + (5+6) + (7+11) = 4 + 7 + 11 + 18", "40"]],
          "Ropes [2,5,2,6,3]. Sorting once is not enough: the merged rope (4, then 7) has to compete with the other ropes again."],
        ["probs", [
          { t: "Connecting the ropes (minimum cost)", d: "Medium", q: "Join all ropes into one, two at a time; joining costs the sum of the two lengths. Minimise the total cost.",
            ex: "[2,5,2,6,3] → 40\n[1,2,3,4] → 3 + 6 + 10 = 19", edge: "one rope costs 0; use 64-bit for the running cost",
            ap: [
              { n: "Brute force", cx: "O(N² log N) time · O(N) space", idea: "Greedy is right (always join the two shortest), but finding them by <b>re-sorting after every join</b> costs O(N log N) per join.", code: "def min_cost(a):\n    a = list(a)\n    cost = 0\n    while len(a) > 1:\n        a.sort()\n        x = a.pop(0)\n        y = a.pop(0)\n        cost += x + y\n        a.append(x + y)          # the merged rope competes again\n    return cost" },
              { n: "Optimal", cx: "O(N log N) time · O(N) space", idea: "<b>Min-heap.</b> Pop the two smallest, add their sum to the cost, push the sum back. Each join is O(log N). Sorting once is not enough because merged ropes re-enter the pool.", code: "import heapq\n\ndef min_cost(a):\n    h = list(a)\n    heapq.heapify(h)\n    cost = 0\n    while len(h) > 1:\n        x = heapq.heappop(h)\n        y = heapq.heappop(h)\n        cost += x + y\n        heapq.heappush(h, x + y)\n    return cost" }
            ] },
          { t: "Last stone weight", d: "Easy", q: "Repeatedly smash the two heaviest stones; if they differ, the difference goes back. Return the last weight (or 0).",
            ex: "[2,7,4,1,8,1] → 1", lc: "last-stone-weight",
            ap: [
              { n: "Brute force", cx: "O(N² log N) time · O(N) space", idea: "<b>Sort after every smash</b> to find the two heaviest.", code: "def last_stone_weight(stones):\n    s = list(stones)\n    while len(s) > 1:\n        s.sort()\n        y = s.pop()              # heaviest\n        x = s.pop()              # second heaviest\n        if y != x:\n            s.append(y - x)\n    return s[0] if s else 0" },
              { n: "Optimal", cx: "O(N log N) time · O(N) space", idea: "The same loop with a <b>max-heap</b> (push negatives into Python's min-heap).", code: "import heapq\n\ndef last_stone_weight(stones):\n    h = [-x for x in stones]     # max-heap via negatives\n    heapq.heapify(h)\n    while len(h) > 1:\n        y = -heapq.heappop(h)\n        x = -heapq.heappop(h)\n        if y != x:\n            heapq.heappush(h, -(y - x))\n    return -h[0] if h else 0" }
            ] }
        ]]
      ] },
      { h: "What a heap is", blocks: [
        ["p", "A heap is a binary tree with two properties. <b>1. Complete binary tree:</b> every level is full except possibly the last, which fills left to right. <b>2. Heap order:</b> in a min-heap every node is ≤ its children, so the root is the minimum; in a max-heap every node is ≥ its children. getMin (or getMax) is O(1)."],
        ["p", "Examples: a min-heap with root 5, children 12 and 20, then 25, 13, 24, 22, then 35, 34. A max-heap with root 58, children 39 and 26, then 34, 12, 3, 9, then 16, 1."],
        ["table", ["For index i (0-based)", "Formula"], [
          ["left child", "2i + 1"],
          ["right child", "2i + 2"],
          ["parent", "(i − 1) / 2, integer division"],
          ["last non-leaf", "(n − 2) / 2"],
          ["leaves", "indices n/2 … n−1, about half the nodes"]]],
        ["p", "Because the tree is complete, the array has <b>no gaps</b>, so no pointers are needed. The array [8,10,1,6,12,19,15,3,7] is the tree with root 8, children 10 and 1; 10 has 6 and 12; 1 has 19 and 15; 6 has 3 and 7."],
        ["viz", "heap", "Insert sifts up; extract-max moves the last element to the root and sifts down. Watch the tree and the array change together."]
      ] },
      { h: "Insert, extract and heapify", blocks: [
        ["steps", [
          ["Insert (sift up)", "Append x at the end. While it is smaller than its parent (min-heap), swap upward. Example: insert −1 into [3,5,20,12,10,24,22,35,25,13]: −1 swaps with 10, then 5, then 3, and becomes the root."],
          ["Extract-min", "Swap the root with the last element, remove the last slot (that is the answer), then sift the new root down."],
          ["Sift down (heapify)", "Pick the smallest of the node and its children. If the node is smallest, stop. Otherwise swap with that child and continue there."]]],
        ["code", "def insert(h, x):                # sift up\n    h.append(x)\n    i = len(h) - 1\n    while i > 0 and h[(i - 1) // 2] > h[i]:\n        p = (i - 1) // 2\n        h[p], h[i] = h[i], h[p]\n        i = p\n\ndef heapify(h, i, n):            # sift down within h[0..n-1]\n    while 2 * i + 1 < n:\n        l, r, m = 2 * i + 1, 2 * i + 2, i\n        if h[l] < h[m]:\n            m = l\n        if r < n and h[r] < h[m]:   # check r < n first!\n            m = r\n        if m == i:\n            break\n        h[i], h[m] = h[m], h[i]\n        i = m\n\ndef extract_min(h):\n    h[0], h[-1] = h[-1], h[0]\n    ans = h.pop()\n    heapify(h, 0, len(h))\n    return ans"],
        ["warn", "<b>Check the right child:</b> do not read <code>heap[2i+2]</code> just because the left child exists. When the left child is the last element there is no right child, so check <code>2i+2 &lt; size</code> before using it."],
        ["tip", "Both operations walk one root-to-leaf path, so they cost O(height) = <b>O(log N)</b>. Peek is O(1)."]
      ] },
      { h: "Build a heap in O(N)", blocks: [
        ["p", "Turning an array into a heap: sorting works (a sorted array is a min-heap) in O(N log N). Inserting N times is also O(N log N). The better way is <b>bottom-up heapify</b>: leaves are already heaps, so sift down every non-leaf from the last one, (n−2)/2, back to the root."],
        ["viz", "lin_buildHeap", "Leaves start green. Each heapify makes the subtree rooted at i a valid heap."],
        ["math", [
          ["N/2 leaves", "0 swaps each", "0"],
          ["N/4 nodes one level up", "≤ 1 swap", "N/4 · 1"],
          ["N/8 nodes", "≤ 2 swaps", "N/8 · 2"],
          ["N/16 nodes", "≤ 3 swaps", "N/16 · 3"],
          ["total", "(N/2)·S with S = 1/2 + 2/4 + 3/8 + …", "S − S/2 = 1/2 + 1/4 + … = 1, so S = 2"],
          ["so", "(N/2) · 2", "N swaps → O(N)"]],
          "Most nodes are near the bottom and can only sift down a little. Insert-based building is the opposite: most nodes would sift up a long way."],
        ["probs", [
          { t: "Build a heap", d: "Medium", co: "★★★ interview", q: "Turn an arbitrary array into a min-heap in place.",
            ex: "[5,13,-2,11,27,31,0,19]\nworked example: [7,3,5,1,6,8,10,2,13,14,-2] → root -2, then 1 and 5, …", edge: "n ≤ 1: nothing to do; flip comparisons for a max-heap", viz: "lin_buildHeap",
            ap: [
              { n: "Brute force", cx: "O(N log N) time · O(N) space", idea: "Insert the elements one by one with sift-up (or just sort: a sorted array is a min-heap). Most nodes are deep, so they may <b>sift up a long way</b>.", code: "def build_heap(a):\n    h = []\n    for x in a:\n        insert(h, x)             # sift up, O(log N) each\n    return h" },
              { n: "Optimal", cx: "O(N) time · O(1) space", idea: "<b>Sift down from (n−2)/2 down to 0.</b> Leaves are already heaps, and most nodes are near the bottom so they can only sift down a little. The sum of heights is about N, so it is linear.", code: "def heapify(a, i, n):            # sift down\n    while 2 * i + 1 < n:\n        l, r, m = 2 * i + 1, 2 * i + 2, i\n        if a[l] < a[m]:\n            m = l\n        if r < n and a[r] < a[m]:\n            m = r\n        if m == i:\n            break\n        a[i], a[m] = a[m], a[i]\n        i = m\n\ndef build_heap(a):\n    n = len(a)\n    for i in range((n - 2) // 2, -1, -1):   # last non-leaf to root\n        heapify(a, i, n)" }
            ] },
          { t: "Heap sort", d: "Medium", q: "Sort an array using a heap, in place.",
            ex: "[1,2,3,5,6,7,8,10,13,14] → max-heap [14,10,13,…]\nthen 14, 13, 10, … land at the end one by one", edge: "Not stable: in [5, 2(green), 2(red), 7, 3] the red 2 can end up before the green 2.", lc: "sort-an-array",
            ap: [
              { n: "Brute force", cx: "O(N log N) time · O(N) space", idea: "Build a min-heap and pop the minimum N times into a <b>new array</b>. Right order and time, but O(N) extra space.", code: "import heapq\n\ndef heap_sort(a):\n    h = list(a)\n    heapq.heapify(h)\n    return [heapq.heappop(h) for _ in range(len(h))]" },
              { n: "Optimal", cx: "O(N log N) time · O(1) space · in place: yes · stable: no", idea: "<b>Build a max-heap</b> (O(N)). Then for j = N−1 down to 1: swap the root (current max) with a[j], and sift the new root down within [0..j−1]. The sorted part grows from the right.", code: "def sift_max(a, i, last):        # last = last valid index\n    while 2 * i + 1 <= last:\n        l, r, m = 2 * i + 1, 2 * i + 2, i\n        if a[l] > a[m]:\n            m = l\n        if r <= last and a[r] > a[m]:\n            m = r\n        if m == i:\n            break\n        a[i], a[m] = a[m], a[i]\n        i = m\n\ndef heap_sort(a):\n    n = len(a)\n    for i in range((n - 2) // 2, -1, -1):\n        sift_max(a, i, n - 1)    # build the max-heap\n    for j in range(n - 1, 0, -1):\n        a[0], a[j] = a[j], a[0]  # max goes to its final place\n        sift_max(a, 0, j - 1)" }
            ] }
        ]]
      ] },
      { h: "Heap applications: k-th largest, nearly sorted, median, merge K", blocks: [
        ["tip", "Rule of thumb: <b>if you need to sort, or find the min or max, again and again, think heap.</b>"],
        ["analogy", "Team selection for the k-th largest. Keep a team of the K best players in a min-heap. The root is the weakest member. A new player joins only if they beat the weakest, who is kicked out. At the end the weakest member is the K-th best overall."],
        ["probs", [
          { t: "K-th largest element", d: "Medium", q: "Return the K-th largest element of an array (duplicates count separately).",
            ex: "[8,5,1,2,4,9,7], K = 3 → 7\n[1,2,3,4,5], K = 5 → 1\nTeam K = 4, scores 9,12,4,6,7,5,10,9,5,15 → team {9,12,10,15} → 9", edge: "1 ≤ K ≤ N; duplicates count", lc: "kth-largest-element-in-an-array",
            ap: [
              { n: "Brute force", cx: "O(N log N) time · O(1) extra space", idea: "Sort and return a[N−K]. It <b>sorts everything</b> when we only need one position.", code: "def kth_largest(a, K):\n    return sorted(a)[len(a) - K]" },
              { n: "Better", cx: "O(N + K log N) time · O(N) space", idea: "Build a <b>max-heap of everything</b> in O(N), then remove the max K−1 times. The root is the answer.", code: "import heapq\n\ndef kth_largest(a, K):\n    h = [-x for x in a]          # max-heap via negatives\n    heapq.heapify(h)             # O(N)\n    for _ in range(K - 1):\n        heapq.heappop(h)\n    return -h[0]" },
              { n: "Optimal", cx: "O(N log K) time · O(K) space", idea: "<b>Min-heap of size K</b> (the team): push the first K, then any element larger than the root replaces it. The root, the weakest of the top K, is the K-th largest. Best when K ≪ N or for streams. (Quickselect is O(N) on average.)", code: "import heapq\n\ndef kth_largest(a, K):\n    h = a[:K]\n    heapq.heapify(h)\n    for x in a[K:]:\n        if x > h[0]:             # beats the weakest team member\n            heapq.heapreplace(h, x)\n    return h[0]" }
            ] },
          { t: "K-th largest of every prefix", d: "Easy", q: "For every i ≥ K−1, output the K-th largest of arr[0..i].",
            ex: "[10,18,7,5,16,19,3], K = 3 → [7,7,10,16,16]\n[5,4,1,6,7], K = 2 → [4,4,5,6]", lc: "kth-largest-element-in-a-stream",
            ap: [
              { n: "Brute force", cx: "O(N² log N) time · O(N) space", idea: "<b>Sort every prefix</b> again and read position K from the end.", code: "def kth_of_prefixes(a, K):\n    ans = []\n    for i in range(K - 1, len(a)):\n        ans.append(sorted(a[:i + 1])[-K])\n    return ans" },
              { n: "Optimal", cx: "O(N log K) time · O(K) space", idea: "The same <b>size-K min-heap</b>; after processing index i, the root is the answer for that prefix.", code: "import heapq\n\ndef kth_of_prefixes(a, K):\n    h, ans = [], []\n    for i, x in enumerate(a):\n        if len(h) < K:\n            heapq.heappush(h, x)\n        elif x > h[0]:\n            heapq.heapreplace(h, x)\n        if i >= K - 1:\n            ans.append(h[0])\n    return ans" }
            ] },
          { t: "Sort a nearly sorted (K-sorted) array", d: "Medium", q: "Every element is at most K positions from its sorted position. Sort it.",
            ex: "[13,22,31,45,11,20,48,60,50], K = 4\nAnswer: [11,13,20,22,31,45,48,50,60]", edge: "K ≥ N: plain heap sort; K = 0: already sorted",
            ap: [
              { n: "Brute force", cx: "O(N log N) time · O(N) space", idea: "A full sort <b>ignores the K-sorted guarantee</b>.", code: "def sort_k_sorted(a, K):\n    return sorted(a)" },
              { n: "Better", cx: "O(N·K) time · O(1) space", idea: "<b>Insertion sort</b>: each element moves back at most K places, so the inner loop is at most K steps.", code: "def sort_k_sorted(a, K):\n    for i in range(1, len(a)):\n        x = a[i]\n        j = i - 1\n        while j >= 0 and a[j] > x:   # at most K steps\n            a[j + 1] = a[j]\n            j -= 1\n        a[j + 1] = x\n    return a" },
              { n: "Optimal", cx: "O(N log K) time · O(K) space", idea: "The element for position i is among the next <b>K+1</b> unplaced elements. Keep a min-heap of size K+1: pop the min into the output, push the next input element.", code: "import heapq\n\ndef sort_k_sorted(a, K):\n    h = a[:K + 1]\n    heapq.heapify(h)\n    out = []\n    for x in a[K + 1:]:\n        out.append(heapq.heappop(h))   # smallest of the next K+1\n        heapq.heappush(h, x)\n    while h:\n        out.append(heapq.heappop(h))\n    return out" }
            ] },
          { t: "Median of a stream", d: "Hard", co: "Flipkart", q: "After each new number, output the median of everything so far (average of the two middles for an even count).",
            ex: "6,3,8,11,2 → 6, 4.5, 6, 7, 6\n6,3,8,11,20,2,10,8,13,50 → 6, 4.5, 6, 7, 8, 7, 8, 8, 8, 9\nFlipkart delivery times 3,7,15,2,5,8 → 3, 5, 7, 5, 5, 6", edge: "h1 empty at the start; divide by 2.0; duplicates are fine", viz: "lin_median", lc: "find-median-from-data-stream",
            ap: [
              { n: "Brute force", cx: "O(N log N) per median · O(N) space", idea: "Append the number and <b>sort the whole list</b> each time someone asks for the median.", code: "class MedianFinder:\n    def __init__(self):\n        self.a = []\n\n    def add(self, x):\n        self.a.append(x)\n\n    def median(self):\n        s = sorted(self.a)\n        n = len(s)\n        if n % 2:\n            return s[n // 2]\n        return (s[n // 2 - 1] + s[n // 2]) / 2.0" },
              { n: "Better", cx: "O(N) per insert · O(1) median · O(N) space", idea: "Keep the list sorted by <b>inserting into place</b> (like insertion sort). Finding the spot is a binary search, but shifting elements is still O(N).", code: "import bisect\n\nclass MedianFinder:\n    def __init__(self):\n        self.a = []\n\n    def add(self, x):\n        bisect.insort(self.a, x)   # O(N) shift\n\n    def median(self):\n        n = len(self.a)\n        if n % 2:\n            return self.a[n // 2]\n        return (self.a[n // 2 - 1] + self.a[n // 2]) / 2.0" },
              { n: "Optimal", cx: "O(log N) per number · O(1) median · O(N) space", idea: "<b>Two heaps.</b> h1 = max-heap of the smaller half, h2 = min-heap of the larger half. Insert into h1 if x ≤ h1's top, else h2. If the sizes differ by more than 1, move a top across. The median is the top of the bigger heap, or the average of both tops.", code: "import heapq\n\nclass MedianFinder:\n    def __init__(self):\n        self.lo = []           # max-heap (negatives): smaller half\n        self.hi = []           # min-heap: larger half\n\n    def add(self, x):\n        if not self.lo or x <= -self.lo[0]:\n            heapq.heappush(self.lo, -x)\n        else:\n            heapq.heappush(self.hi, x)\n        if len(self.lo) > len(self.hi) + 1:      # rebalance\n            heapq.heappush(self.hi, -heapq.heappop(self.lo))\n        elif len(self.hi) > len(self.lo) + 1:\n            heapq.heappush(self.lo, -heapq.heappop(self.hi))\n\n    def median(self):\n        if len(self.lo) > len(self.hi):\n            return -self.lo[0]\n        if len(self.hi) > len(self.lo):\n            return self.hi[0]\n        return (-self.lo[0] + self.hi[0]) / 2.0" }
            ] },
          { t: "Merge K sorted lists with a heap", d: "Hard", q: "Merge K sorted lists with N nodes in total.",
            ex: "[1,4,5], [1,3,4], [2,6] → 1,1,2,3,4,4,5,6", edge: "empty lists; ties: add an index to the tuple so nodes are never compared directly",
            ap: [
              { n: "Brute force", cx: "O(N·K) time · O(1) space", idea: "<b>Scan all K fronts</b> to find the smallest every time you attach a node.", code: "def merge_k(lists):\n    lists = list(lists)\n    dummy = Node(-1)\n    tail = dummy\n    while True:\n        best = -1\n        for i, l in enumerate(lists):    # O(K) scan per node\n            if l and (best < 0 or l.val < lists[best].val):\n                best = i\n        if best < 0:\n            break\n        tail.next = lists[best]\n        tail = tail.next\n        lists[best] = lists[best].next\n    return dummy.next" },
              { n: "Optimal", cx: "O(N log K) time · O(K) space", idea: "Push the <b>head of every list</b> into a min-heap. Pop the smallest, append it, push its next. The heap never holds more than K nodes, so each step is O(log K).", code: "import heapq\n\ndef merge_k(lists):\n    h = [(l.val, i, l) for i, l in enumerate(lists) if l]\n    heapq.heapify(h)\n    dummy = Node(-1)\n    tail = dummy\n    while h:\n        v, i, node = heapq.heappop(h)\n        tail.next = node\n        tail = node\n        if node.next:            # i breaks ties, nodes never compared\n            heapq.heappush(h, (node.next.val, i, node.next))\n    return dummy.next" }
            ] },
          { t: "Top K frequent elements", d: "Medium", q: "Return the K most frequent values.",
            ex: "[1,1,1,2,2,3], K = 2 → [1,2]", lc: "top-k-frequent-elements",
            ap: [
              { n: "Brute force", cx: "O(N log N) time · O(N) space", idea: "Count with a hash map, then <b>sort all distinct values</b> by frequency and take the first K.", code: "from collections import Counter\n\ndef top_k_frequent(a, K):\n    c = Counter(a)\n    return sorted(c, key=lambda x: -c[x])[:K]" },
              { n: "Better", cx: "O(N log K) time · O(N) space", idea: "Count, then keep a <b>size-K min-heap keyed by frequency</b>: the least frequent of the current top K sits at the root and is replaced when beaten.", code: "import heapq\nfrom collections import Counter\n\ndef top_k_frequent(a, K):\n    c = Counter(a)\n    h = []\n    for x, f in c.items():\n        heapq.heappush(h, (f, x))\n        if len(h) > K:\n            heapq.heappop(h)     # drop the least frequent\n    return [x for _, x in h]" },
              { n: "Optimal", cx: "O(N) time · O(N) space", idea: "<b>Bucket sort by frequency</b>: a frequency is between 1 and N, so put each value in bucket[freq] and read the buckets from N down until you have K values.", code: "from collections import Counter\n\ndef top_k_frequent(a, K):\n    c = Counter(a)\n    buckets = [[] for _ in range(len(a) + 1)]\n    for x, f in c.items():\n        buckets[f].append(x)\n    ans = []\n    for f in range(len(a), 0, -1):\n        for x in buckets[f]:\n            ans.append(x)\n            if len(ans) == K:\n                return ans\n    return ans" }
            ] }
        ]],
        ["viz", "lin_median", "Each number drops into one half; a top slides across when the sizes drift apart."]
      ] },
      { h: "Patterns and pitfalls", blocks: [
        ["table", ["Problem says", "Heap setup", "Cost"], [
          ["k-th largest / top k", "min-heap of size K", "O(N log K)"],
          ["k-th smallest / k closest", "max-heap of size K", "O(N log K)"],
          ["repeatedly combine the two smallest", "min-heap of everything", "O(N log N)"],
          ["running median", "max-heap (low half) + min-heap (high half)", "O(log N) per item"],
          ["merge K sorted things", "min-heap of the K fronts", "O(N log K)"],
          ["each element ≤ K away from its place", "min-heap of size K+1", "O(N log K)"]]],
        ["list", [
          "Java: <code>PriorityQueue</code> is a min-heap by default; <code>new PriorityQueue&lt;&gt;(Collections.reverseOrder())</code> gives a max-heap. Use add, remove (poll) and peek.",
          "Python's heapq is a min-heap only: push negatives for a max-heap.",
          "A heap is <b>not</b> sorted: only the root is guaranteed. Iterating over it does not give sorted order.",
          "Building from an array is O(N); don't push one by one if you have the whole array.",
          "Heap sort is in place but not stable."]]
      ] }
    ],
    lc: [
      ["Last Stone Weight", "last-stone-weight", "Easy"],
      ["Kth Largest Element in a Stream", "kth-largest-element-in-a-stream", "Easy"],
      ["Kth Largest Element in an Array", "kth-largest-element-in-an-array", "Medium"],
      ["Top K Frequent Elements", "top-k-frequent-elements", "Medium"],
      ["K Closest Points to Origin", "k-closest-points-to-origin", "Medium"],
      ["Find K Pairs with Smallest Sums", "find-k-pairs-with-smallest-sums", "Medium"],
      ["Kth Smallest Element in a Sorted Matrix", "kth-smallest-element-in-a-sorted-matrix", "Medium"],
      ["Reorganize String", "reorganize-string", "Medium"],
      ["Sort an Array", "sort-an-array", "Medium"],
      ["Task Scheduler", "task-scheduler", "Medium"],
      ["Find Median from Data Stream", "find-median-from-data-stream", "Hard"],
      ["IPO", "ipo", "Hard"],
      ["Sliding Window Median", "sliding-window-median", "Hard"]
    ],
    quiz: [
      { q: "Which two properties define a heap?", o: ["Sorted array + binary search", "Complete binary tree + heap order (parent ≤ children for a min-heap)", "Balanced BST + unique keys", "Full binary tree + left < right"], a: 1, why: "Completeness lets it live in an array with no gaps; heap order puts the min (or max) at the root." },
      { q: "In a 0-based array heap, where is the parent of index 9?", o: ["3", "4", "5", "8"], a: 1, why: "(9 − 1) / 2 = 4." },
      { q: "Why is bottom-up build-heap O(N), not O(N log N)?", o: ["It skips half the elements", "Most nodes are near the bottom and sift down only a little: N/4·1 + N/8·2 + … ≈ N", "It uses a sorting network", "It isn't; it's O(N log N)"], a: 1, why: "The work is the sum of node heights, and that series adds up to about N." },
      { q: "To find the K-th largest of a huge stream, which heap do you keep?", o: ["A max-heap of everything", "A min-heap of size K", "A max-heap of size K", "Two heaps"], a: 1, why: "The min-heap of the K largest so far has the K-th largest at its root; anything smaller than the root is ignored." },
      { q: "Median of a stream: h1 (max-heap) has 3 elements with top 6, h2 (min-heap) has 3 with top 8. What is the median?", o: ["6", "7", "8", "Not enough information"], a: 1, why: "Equal sizes mean an even count, so average the two tops: (6 + 8) / 2 = 7." },
      { q: "Is heap sort stable?", o: ["Yes", "No: swapping the root to the end can reorder equal keys", "Only for min-heaps", "Only if the array is small"], a: 1, why: "Long-distance swaps move equal elements past each other, as in the green/red 2 example." },
      { q: "Connecting ropes [2,5,2,6,3]: what is the minimum cost?", o: ["49", "41", "40", "18"], a: 2, why: "Always join the two smallest: 4 + 7 + 11 + 18 = 40. Sorting once (41) is not enough because merged ropes re-enter the pool." }
    ]
  };

  /* ═════════ TOPIC: TRIES ═════════ */
  T["tries"] = {
    name: "Tries (prefix trees)", icon: "🌲", color: "#0369a1", minutes: 55,
    summary: "A tree where each edge is a character, so words with a common prefix share a path. Lookups cost O(word length) no matter how many words you store, and a binary version over bits solves maximum-XOR problems.",
    sections: [
      { h: "Why tries", blocks: [
        ["p", "A spellchecker checks words against a dictionary of N valid words. A HashSet lookup already costs O(L) per word (hashing plus comparing characters). A <b>trie</b> also costs O(L), but it also answers <b>prefix</b> questions (autocomplete, 'any word starting with tri?', shortest unique prefix) that a hash set can't."],
        ["analogy", "A phone's contact search. Type 'p', then 'l', then 'a': each letter moves you one level down a tree, and everything below you starts with what you have typed."],
        ["p", "Example dictionary: try, trim, trie, play, trying, plate, car, par, trimmer, pla. The root has children c, t and p. 'try' and 'trying' share t → r → y. 'plate', 'play' and 'pla' share p → l → a."],
        ["code", "class Node:\n    def __init__(self, ch=''):\n        self.val = ch\n        self.children = [None] * 26     # slot k is for chr(ord('a') + k)\n        self.eow = False                # end of word"],
        ["warn", "Without the <b>end-of-word (eow) flag</b>, search('tri') would succeed just because the path t → r → i exists for 'trie'. Mark eow on the last node of every inserted word. search('trie') → true, search('trim') → true, search('tri') → false, search('pla') → true."],
        ["viz", "trie", "Shared prefixes reuse nodes. Words ending at a node are marked ✓."]
      ] },
      { h: "Insert, search and delete", blocks: [
        ["probs", [
          { t: "Trie insert", d: "Medium", q: "Insert a word into the trie.",
            ex: "insert('care'): adds e under c-a-r and marks it eow\ninsert('get'): new branch g → e → t\ninsert('plot'): follows p → l, creates o → t", lc: "implement-trie-prefix-tree",
            ap: [
              { n: "Solution", cx: "O(L) time · at most L new nodes", idea: "Walk from the root; for each character <b>create the child if missing</b>, then move to it. After the last character set <code>eow = True</code>.", code: "class Node:\n    def __init__(self, ch=''):\n        self.val = ch\n        self.children = [None] * 26\n        self.eow = False\n\ndef insert(root, word):\n    curr = root\n    for ch in word:\n        i = ord(ch) - ord('a')\n        if curr.children[i] is None:\n            curr.children[i] = Node(ch)   # create the missing child\n        curr = curr.children[i]\n    curr.eow = True                       # a word ends here" }
            ] },
          { t: "Trie search and startsWith", d: "Medium", q: "Is the word present? Is any word starting with this prefix present?",
            ex: "search('tri') → false (path exists, eow false)\nstartsWith('tri') → true",
            ap: [
              { n: "Brute force", cx: "search O(L) · startsWith O(N·L) · O(total characters) space", idea: "A hash set answers search in O(L), but <b>startsWith has to check every stored word</b>.", code: "words = set()\n\ndef search(w):\n    return w in words\n\ndef starts_with(p):\n    return any(w.startswith(p) for w in words)   # scans all N words" },
              { n: "Optimal", cx: "O(L) time · O(1) space", idea: "Walk the trie one character at a time. A missing child means false. At the end, <b>search returns eow</b> (the path alone doesn't make a word); startsWith returns true.", code: "def walk(root, s):\n    curr = root\n    for ch in s:\n        curr = curr.children[ord(ch) - ord('a')]\n        if curr is None:\n            return None\n    return curr\n\ndef search(root, w):\n    node = walk(root, w)\n    return node is not None and node.eow\n\ndef starts_with(root, p):\n    return walk(root, p) is not None" }
            ] },
          { t: "Trie delete", d: "Medium", q: "Remove a word, freeing every node that no other word uses.",
            ex: "Trie: cat, car, plate, play, try, trie, trim, trimmer, trying\ndelete 'trying' (after 'try' is gone): cut the link r → y\ndelete 'trimmer': cut below the m of 'trim' (that m is an eow)", edge: "<b>Watch out:</b> the final line must be an assignment (<code>= NULL</code>, not <code>== NULL</code>). A word that isn't present (missing child or eow false) must leave the trie unchanged.",
            ap: [
              { n: "Brute force", cx: "O(total characters) time · O(total characters) space", idea: "Keep the word list, remove the word from it, and <b>rebuild the whole trie</b>. Correct, but touches every stored character.", code: "def delete(words, word):\n    words.discard(word)\n    root = Node()\n    for w in words:\n        insert(root, w)\n    return root" },
              { n: "Better", cx: "O(L) time · O(L) recursion stack", idea: "Recurse down the word; on the way back, delete a child if it is now <b>not an eow and has no children</b>. Correct, but easy to get the return values wrong.", code: "def delete(node, word, d=0):\n    # returns True if node can be removed by its parent\n    if d == len(word):\n        if not node.eow:\n            return False          # word not present\n        node.eow = False\n    else:\n        i = ord(word[d]) - ord('a')\n        child = node.children[i]\n        if child is None:\n            return False          # word not present\n        if delete(child, word, d + 1):\n            node.children[i] = None\n    return not node.eow and all(c is None for c in node.children)" },
              { n: "Optimal", cx: "O(26·L) = O(L) time · O(1) space", idea: "If the word is a prefix of another word, just set eow = false. A node can't be removed if it is an eow or has more than one child. So, while walking, remember the <b>deepest protected node</b> <code>temp</code> and the character <code>nc</code> you took from it. At the end, unmark eow and, if the last node has no children, do <b>one cut</b>: <code>temp.children[nc] = None</code>.", code: "def count_children(node):\n    return sum(1 for c in node.children if c)\n\ndef delete(root, word):\n    curr, temp, nc = root, root, word[0]\n    for ch in word:\n        i = ord(ch) - ord('a')\n        if curr.children[i] is None:\n            return                # not present\n        if count_children(curr) > 1 or curr.eow:\n            temp, nc = curr, ch   # deepest protected node\n        curr = curr.children[i]\n    if not curr.eow:\n        return                    # only a prefix of other words\n    curr.eow = False\n    if count_children(curr) == 0:\n        temp.children[ord(nc) - ord('a')] = None   # one cut" }
            ] },
          { t: "Design add and search words (with '.')", d: "Medium", q: "Like search, but '.' matches any letter.",
            ex: "add bad, dad, mad\nsearch('.ad') → true, search('b..') → true, search('pad') → false", lc: "design-add-and-search-words-data-structure",
            ap: [
              { n: "Brute force", cx: "O(N·L) per search · O(total characters) space", idea: "Store words in a list and <b>compare the pattern against every word</b> of the same length.", code: "class WordDictionary:\n    def __init__(self):\n        self.words = []\n\n    def add_word(self, w):\n        self.words.append(w)\n\n    def search(self, p):\n        for w in self.words:\n            if len(w) == len(p) and all(a == b or b == '.' for a, b in zip(w, p)):\n                return True\n        return False" },
              { n: "Optimal", cx: "O(L) without dots, up to O(26^dots · L) with them", idea: "Trie + <b>DFS</b>: on '.', try every existing child; otherwise follow the one child. Dead prefixes are pruned immediately.", code: "class WordDictionary:\n    def __init__(self):\n        self.root = Node()\n\n    def add_word(self, w):\n        insert(self.root, w)\n\n    def search(self, p):\n        return self._find(self.root, p, 0)\n\n    def _find(self, node, w, i):\n        if node is None:\n            return False\n        if i == len(w):\n            return node.eow\n        if w[i] == '.':           # try every child\n            return any(self._find(c, w, i + 1) for c in node.children if c)\n        return self._find(node.children[ord(w[i]) - 97], w, i + 1)" }
            ] }
        ]]
      ] },
      { h: "Shortest unique prefix", blocks: [
        ["p", "Store a <b>frequency</b> on every node: how many words pass through it. A prefix is unique exactly when its last node has frequency 1."],
        ["probs", [
          { t: "Shortest unique prefix for every word", d: "Medium", q: "For each word, the shortest prefix that no other word in the list starts with. Assume no word is a prefix of another.",
            ex: "[tri, trap, plate, cat, part, place, tie]\nAnswer: [tri, tra, plat, c, pa, plac, ti]\nplace: p(3) → l(2) → a(2) → c(1) → 'plac'", edge: "one word → its first letter; duplicate words break the assumption (frequency never reaches 1)",
            ap: [
              { n: "Brute force", cx: "O(N²·L²) time · O(1) extra space", idea: "For each word try prefix lengths 1, 2, … and <b>check every other word</b> for that prefix.", code: "def shortest_prefixes(words):\n    ans = []\n    for w in words:\n        for k in range(1, len(w) + 1):\n            p = w[:k]\n            if not any(o.startswith(p) for o in words if o is not w):\n                break\n        ans.append(p)\n    return ans" },
              { n: "Optimal", cx: "O(total characters) time · O(total characters × 26) space", idea: "Store a <b>frequency</b> on every node: how many words pass through it. Then walk each word until the <b>first node with frequency 1</b>; that prefix belongs to this word alone. (Another idea: stop one character after the last branching node.)", code: "class Node:\n    def __init__(self):\n        self.children = [None] * 26\n        self.freq = 0             # words passing through this node\n\ndef insert(root, w):\n    curr = root\n    for ch in w:\n        i = ord(ch) - 97\n        if curr.children[i] is None:\n            curr.children[i] = Node()\n        curr = curr.children[i]\n        curr.freq += 1\n\ndef shortest(root, w):\n    curr, p = root, ''\n    for ch in w:\n        curr = curr.children[ord(ch) - 97]\n        p += ch\n        if curr.freq == 1:        # only this word goes here\n            return p\n    return p\n\ndef shortest_prefixes(words):\n    root = Node()\n    for w in words:\n        insert(root, w)\n    return [shortest(root, w) for w in words]" }
            ] },
          { t: "Search suggestions system", d: "Medium", q: "After each typed character, return up to 3 lexicographically smallest products with that prefix.",
            ex: "products [mobile, mouse, moneypot, monitor, mousepad], type 'mouse'\n'm' → [mobile, moneypot, monitor] … 'mou' → [mouse, mousepad]", lc: "search-suggestions-system",
            ap: [
              { n: "Brute force", cx: "O(L·N·L) time · O(1) extra space", idea: "For every prefix, <b>filter all products</b> and keep the first 3 in sorted order.", code: "def suggested_products(products, word):\n    products = sorted(products)\n    ans = []\n    for k in range(1, len(word) + 1):\n        p = word[:k]\n        ans.append([w for w in products if w.startswith(p)][:3])\n    return ans" },
              { n: "Better", cx: "O(N log N + L log N) time · O(1) extra space", idea: "After sorting, words sharing a prefix are <b>contiguous</b>, so binary-search the first one ≥ the prefix and look at the next 3.", code: "import bisect\n\ndef suggested_products(products, word):\n    products = sorted(products)\n    ans = []\n    for k in range(1, len(word) + 1):\n        p = word[:k]\n        i = bisect.bisect_left(products, p)\n        ans.append([w for w in products[i:i + 3] if w.startswith(p)])\n    return ans" },
              { n: "Optimal", cx: "O(total characters) build · O(1) per keystroke", idea: "Insert products into a trie in sorted order and store at each node the <b>first 3 words that pass through it</b>. Each keystroke is one step down and the answer is already there.", code: "class Node:\n    def __init__(self):\n        self.child = {}\n        self.top = []             # up to 3 smallest words below\n\ndef suggested_products(products, word):\n    root = Node()\n    for w in sorted(products):\n        curr = root\n        for ch in w:\n            curr = curr.child.setdefault(ch, Node())\n            if len(curr.top) < 3:\n                curr.top.append(w)\n    ans, curr = [], root\n    for ch in word:\n        curr = curr.child.get(ch) if curr else None\n        ans.append(curr.top if curr else [])\n    return ans" }
            ] }
        ]]
      ] },
      { h: "Binary tries and maximum XOR", blocks: [
        ["p", "A <b>binary trie</b> stores numbers as fixed-width bit strings from the most significant bit (MSB) down. Each node has at most two children: 0 and 1. The height is the number of bits L (find it with <code>while max: max >>= 1; L += 1</code>). Example: 3, 6, 4, 12 are 0011, 0110, 0100, 1100."],
        ["tip", "<b>The MSB matters most.</b> 2^i is larger than 2^0 + 2^1 + … + 2^(i−1). Example: 1011101 ^ 1100010 = 0111111 = 63, but 1011101 ^ 0011101 = 1000000 = 64. One high bit beats every lower bit combined. So, going from the MSB down, greedily make each XOR bit 1."],
        ["p", "<b>Demand bits.</b> For x, the ideal partner is ~x (every bit flipped). Walk the trie: at bit j, if x has bit b, take child 1−b if it exists (that XOR bit becomes 1), otherwise take child b. Example: 5 = 00101 demands 11010 and gets 11100 = 28; 20 = 10100 demands 01011 and gets 11110 = 30."],
        ["viz", "lin_maxXor", "Each query follows the demanded bit when it can (✓) and falls back when it can't (✗)."],
        ["probs", [
          { t: "Maximum XOR of a pair", d: "Medium", q: "Find the maximum A[i] ^ A[j].",
            ex: "[9,8,10,7] → 15 (8 ^ 7 = 1000 ^ 0111)\n[5,20,15,10,25,30] → best per element [28,30,27,30,28,27] → 30 (20 ^ 10)", edge: "N = 1 → 0 (x ^ x); all zeros → 0; use L = 31 for full 32-bit ints", viz: "lin_maxXor", lc: "maximum-xor-of-two-numbers-in-an-array",
            ap: [
              { n: "Brute force", cx: "O(N²) time · O(1) space", idea: "<b>Try every pair</b>. Fine for small N, too slow for 10^5.", code: "def max_xor(A):\n    best = 0\n    for i in range(len(A)):\n        for j in range(i + 1, len(A)):\n            best = max(best, A[i] ^ A[j])\n    return best" },
              { n: "Optimal", cx: "O(N·L) time · O(N·L) space", idea: "Insert every number into a binary trie, MSB first. For each number, <b>walk greedily toward the opposite bit</b> (the demand bit) from the MSB down, because one high 1 beats all lower bits combined. The path spells the best XOR with that number. Take the max.", code: "class Node:\n    def __init__(self):\n        self.child = [None, None]\n\ndef insert(root, x, L):\n    curr = root\n    for j in range(L - 1, -1, -1):\n        b = (x >> j) & 1\n        if curr.child[b] is None:\n            curr.child[b] = Node()\n        curr = curr.child[b]\n\ndef query(root, x, L):\n    curr, xr = root, 0\n    for j in range(L - 1, -1, -1):\n        b = (x >> j) & 1\n        if curr.child[1 - b]:     # demand bit exists: XOR bit is 1\n            xr |= 1 << j\n            curr = curr.child[1 - b]\n        else:                     # fall back: XOR bit is 0\n            curr = curr.child[b]\n    return xr\n\ndef max_xor(A):\n    L = max(max(A).bit_length(), 1)\n    root = Node()\n    for x in A:\n        insert(root, x, L)\n    return max(query(root, x, L) for x in A)" }
            ] },
          { t: "Maximum subarray XOR", d: "Medium", q: "Find the maximum XOR of any contiguous subarray.",
            ex: "[1,4,3]: [1]=1 [1,4]=5 [1,4,3]=6 [4]=4 [4,3]=7 [3]=3\nAnswer: 7\npXor = [1,5,6]: 1^6 = 7",
            ap: [
              { n: "Brute force", cx: "O(N²) time · O(1) space", idea: "Fix each start and extend the end with a <b>running XOR</b>; every subarray is visited.", code: "def max_subarray_xor(arr):\n    best = 0\n    for i in range(len(arr)):\n        cur = 0\n        for j in range(i, len(arr)):\n            cur ^= arr[j]\n            best = max(best, cur)\n    return best" },
              { n: "Optimal", cx: "O(N·L) time · O(N·L) space", idea: "<b>Prefix XOR:</b> XOR(i..j) = pXor[j] ^ pXor[i−1], because the shared part cancels (a ^ a = 0). So the answer is the max XOR pair among prefix values. <b>Insert 0 first</b> so subarrays starting at index 0 are covered. Uses insert/query from the previous problem.", code: "def max_subarray_xor(arr, L=31):\n    root = Node()\n    insert(root, 0, L)            # the empty prefix\n    px = 0\n    ans = 0\n    for x in arr:\n        px ^= x\n        insert(root, px, L)\n        ans = max(ans, query(root, px, L))\n    return ans" }
            ] },
          { t: "Maximum XOR with an element from the array", d: "Hard", q: "Queries (x, m): the max x ^ a over array values a ≤ m, or −1.",
            ex: "nums [0,1,2,3,4], queries [[3,1],[1,3],[5,6]] → [3,3,7]", lc: "maximum-xor-with-an-element-from-array",
            ap: [
              { n: "Brute force", cx: "O(N·Q) time · O(1) extra space", idea: "For each query, <b>scan the whole array</b> for allowed values.", code: "def maximize_xor(nums, Q):\n    ans = []\n    for x, m in Q:\n        best = -1\n        for a in nums:\n            if a <= m:\n                best = max(best, x ^ a)\n        ans.append(best)\n    return ans" },
              { n: "Optimal", cx: "O((N + Q)·L + N log N + Q log Q) time · O(N·L) space", idea: "<b>Offline:</b> sort nums and sort the queries by m. Before answering a query, insert every number ≤ m into the binary trie, then answer it with the normal greedy walk. Each number is inserted once.", code: "def maximize_xor(nums, Q, L=31):\n    nums = sorted(nums)\n    order = sorted(range(len(Q)), key=lambda i: Q[i][1])\n    ans = [-1] * len(Q)\n    root = Node()\n    k = 0\n    for qi in order:\n        x, m = Q[qi]\n        while k < len(nums) and nums[k] <= m:\n            insert(root, nums[k], L)\n            k += 1\n        if k:                     # at least one allowed value\n            ans[qi] = query(root, x, L)\n    return ans" }
            ] }
        ]]
      ] },
      { h: "Cheatsheet", blocks: [
        ["table", ["Need", "Trie variant", "Cost"], [
          ["exact word lookup + prefix lookup", "character trie with eow", "O(L)"],
          ["autocomplete / suggestions", "trie, keep top words per node", "O(L) per keystroke"],
          ["shortest unique prefix", "trie with pass-through counts", "O(total characters)"],
          ["wildcard search", "trie + DFS on '.'", "O(L) to exponential in dots"],
          ["max XOR pair / subarray", "binary trie, greedy opposite bit", "O(N·L)"],
          ["many words on a grid (word search II)", "trie of the words + grid DFS", "prunes dead prefixes"]]],
        ["list", [
          "Always keep an end-of-word flag; paths alone don't mean words.",
          "children[26] is fast but memory-heavy; a hash map per node saves space for big alphabets.",
          "Delete only nodes used by no other word: stop at eow nodes and branching nodes.",
          "For XOR, insert numbers with a fixed number of bits, MSB first, or queries will compare different bit positions."]]
      ] }
    ],
    lc: [
      ["Implement Trie (Prefix Tree)", "implement-trie-prefix-tree", "Medium"],
      ["Design Add and Search Words Data Structure", "design-add-and-search-words-data-structure", "Medium"],
      ["Replace Words", "replace-words", "Medium"],
      ["Longest Word in Dictionary", "longest-word-in-dictionary", "Medium"],
      ["Map Sum Pairs", "map-sum-pairs", "Medium"],
      ["Search Suggestions System", "search-suggestions-system", "Medium"],
      ["Maximum XOR of Two Numbers in an Array", "maximum-xor-of-two-numbers-in-an-array", "Medium"],
      ["Word Search II", "word-search-ii", "Hard"],
      ["Maximum XOR With an Element From Array", "maximum-xor-with-an-element-from-array", "Hard"],
      ["Palindrome Pairs", "palindrome-pairs", "Hard"]
    ],
    quiz: [
      { q: "Why does every trie node need an end-of-word flag?", o: ["To save memory", "A path can exist only as the prefix of a longer word (e.g. 'tri' inside 'trie')", "To speed up insert", "To store the word's length"], a: 1, why: "Without it, search('tri') would return true just because 'trie' was inserted." },
      { q: "What does searching a word of length L cost in a trie with N words?", o: ["O(N)", "O(L)", "O(N·L)", "O(log N)"], a: 1, why: "You take one step per character; the number of stored words doesn't matter." },
      { q: "When deleting a word, which nodes must NOT be removed?", o: ["All nodes on the path", "Nodes that end another word or have more than one child", "Only the root", "Leaf nodes"], a: 1, why: "Those nodes are shared with other words. Everything below the deepest such node belongs only to this word and can go with one cut." },
      { q: "With pass-through counts, where does a word's shortest unique prefix end?", o: ["At the first node with count 1", "At the last node with count > 1", "At the leaf", "At the root's child"], a: 0, why: "Count 1 means only this word passes through, so the prefix up to there is unique." },
      { q: "Why does the max-XOR greedy go from the most significant bit down?", o: ["Tries must be read that way", "A 1 in a higher bit outweighs all lower bits combined", "It's faster for small numbers", "To handle negative numbers"], a: 1, why: "2^i > 2^0 + … + 2^(i−1), so securing a higher 1 is always worth giving up any lower bits." },
      { q: "In max subarray XOR, why insert 0 into the trie first?", o: ["To initialise the root", "So subarrays that start at index 0 (pXor[j] ^ 0) are considered", "To avoid empty-trie errors only", "It isn't needed"], a: 1, why: "XOR(0..j) = pXor[j] = pXor[j] ^ 0, so 0 acts as the empty prefix." },
      { q: "In the binary trie for numbers up to 30, how deep is every number's path?", o: ["3", "5", "30", "32"], a: 1, why: "30 = 11110 needs 5 bits, so L = 5 and every number is stored as 5 bits." }
    ]
  };
})();

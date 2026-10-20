/* Blueprint — DSA: recursion & backtracking, hashing, bit manipulation, strings.
 * Content from the user's notes (recursion1/2, Backtracking1/2, Hashing1/2/3, bitbasics, BitOne, BitTwo,
 * stringsbasics, kmp) plus LeetCode practice. New animations use the rhbs_ prefix.
 */
(function () {
  const T = BP.DSA.topics;
  const { nums, clone, cap } = BP.AV;
  const A = BP.ALGOS;
  const F = (line, note, panels) => ({ line, note, panels: clone(panels) });
  const arr = (vals, o = {}) => ({ t: "array", vals, ...o });
  const vars = (v) => ({ t: "vars", vars: v });
  const chips = (label, items, vertical) => ({ t: "chips", label, items, vertical });
  const split = (s) => String(s).split("|").map((x) => x.trim());
  const range = (l, r, cls) => { const o = {}; for (let k = l; k <= r; k++) o[k] = cls; return o; };

  /* ═════════ RECURSION & BACKTRACKING ═════════ */
  A.rhbs_hanoi = { title: "Tower of Hanoi: move N disks from A to C", inputLabel: "N disks (1–4)", input: "3",
    about: "Pegs A, B, C with disks sized 1..N. Each call parks the top N−1 disks on the helper peg, moves the biggest one, then brings the N−1 back on top. The call stack on the right shows which sub-problem is running.",
    code: ["def toh(n, src, dst, helper):","    if n == 0:","        return","    toh(n - 1, src, helper, dst)   # park n-1 disks on the helper","    print('move disk', n, src, '->', dst)","    toh(n - 1, helper, dst, src)   # bring them back on top"],
    gen(s) {
      const n = Math.max(1, Math.min(4, nums(s)[0] || 3)), peg = { A: [], B: [], C: [] }, fr = [], stack = []; let moves = 0; const total = 2 ** n - 1;
      for (let d = n; d >= 1; d--) peg.A.push(d);
      const view = (hl = {}) => { const disk = {}; Object.entries(hl).forEach(([pg, m]) => Object.keys(m).forEach((ix) => (disk[peg[pg][ix]] = m[ix]))); return [{ t: "hanoi", n, pegs: ["A", "B", "C"].map((p) => [p, peg[p].slice()]), hl: disk }, vars({ moves: `${moves} / ${total}` }), chips("call stack", stack.slice().reverse(), true)]; };
      fr.push(F(0, `${n} disk(s) on A. Goal: move them all to C, one at a time, never a big disk on a small one.`, view()));
      const toh = (k, src, dst, hlp) => {
        if (k === 0) return;
        stack.push(`toh(${k}, ${src}, ${dst}, ${hlp})`);
        if (k > 1) fr.push(F(3, `toh(${k}, ${src}→${dst}): first park the top ${k - 1} disk(s) on ${hlp}`, view()));
        toh(k - 1, src, hlp, dst);
        peg[dst].push(peg[src].pop()); moves++;
        fr.push(F(4, `Move disk <b>${k}</b>: ${src} → ${dst}${k > 1 ? `. Now bring the ${k - 1} parked disk(s) from ${hlp} onto it.` : ""}`, view({ [dst]: { [peg[dst].length - 1]: "act" } })));
        toh(k - 1, hlp, dst, src);
        stack.pop();
      };
      toh(n, "A", "C", "B");
      fr.push(F(-1, `Done in <b>${moves}</b> = 2^${n} − 1 moves. T(N) = 2T(N−1) + 1 gives O(2^N) time and O(N) stack.`, view()));
      return fr;
    } };

  A.rhbs_genParens = { title: "Backtracking: generate valid parentheses (with pruning)", inputLabel: "N pairs (1–3)", input: "2",
    about: "The recursion tree of choices: left child = add '(', right child = add ')'. Green leaves are finished valid strings; red nodes are branches the two rules cut off before they are built.",
    code: ["def gen(opens, closes, s):","    if len(s) == 2 * N:","        output.append(s)","        return","    if opens < N:            # still have '(' to place","        gen(opens + 1, closes, s + '(')","    if closes < opens:       # a ')' has an open partner","        gen(opens, closes + 1, s + ')')"],
    gen(s) {
      const N = Math.max(1, Math.min(3, nums(s)[0] || 2)), nodes = [], out = [], fr = []; let id = 0;
      const P = () => [{ t: "tree", nodes, binary: true }, chips("output", out.slice())];
      const rec = (o, c, str, me) => {
        if (str.length === 2 * N) { out.push(str); nodes[me].cls = "found"; nodes[me].tag = str; fr.push(F(2, `Length ${2 * N} = 2N reached, so "${str}" is complete and balanced: output <b>${str}</b>.`, P())); return; }
        const L = id++;
        if (o < N) { nodes.push({ id: L, label: "(", parent: me, side: "L", cls: "act" }); fr.push(F(5, `opens = ${o} &lt; N = ${N}, so another '(' is allowed: recurse with "${str}(".`, P())); rec(o + 1, c, str + "(", L); if (nodes[L].cls === "act") nodes[L].cls = "done"; }
        else { nodes.push({ id: L, label: "(", parent: me, side: "L", cls: "bad" }); fr.push(F(4, `opens = N = ${N}: all '(' are used, so this '(' branch is pruned.`, P())); }
        const R = id++;
        if (c < o) { nodes.push({ id: R, label: ")", parent: me, side: "R", cls: "act" }); fr.push(F(7, `closes = ${c} &lt; opens = ${o}, so a ')' has an open partner: recurse with "${str})".`, P())); rec(o, c + 1, str + ")", R); if (nodes[R].cls === "act") nodes[R].cls = "done"; }
        else { nodes.push({ id: R, label: ")", parent: me, side: "R", cls: "bad" }); fr.push(F(6, `closes = opens = ${o}: ')' would leave "${str})" unbalanced, so prune it`, P())); }
      };
      nodes.push({ id: id++, label: "·", parent: null, cls: "act" });
      fr.push(F(0, "Start from the empty string. Red nodes are branches the rules cut off.", P()));
      rec(0, 0, "", 0); nodes[0].cls = "done";
      fr.push(F(-1, `<b>${out.length}</b> valid strings (the Catalan number). Pruning means we never build an invalid prefix, so we never test 2^(2N) strings.`, P()));
      return fr;
    } };

  A.rhbs_perms = { title: "Backtracking: permutations with a visited array", inputLabel: "distinct items (≤ 3)", input: "a b c",
    about: "Each tree level fills one position of ans. The top array shows which items are used (green) on the current path; the undo step un-marks an item when the recursion comes back, so later branches can use it.",
    code: ["def perm(idx):","    if idx == N:","        output.append(''.join(ans))","        return","    for i in range(N):","        if not vis[i]:","            vis[i] = True      # choose","            ans[idx] = a[i]","            perm(idx + 1)      # explore","            vis[i] = False     # unchoose (undo)"],
    gen(s) {
      const a = cap(String(s).split(/[\s,]+/).filter(Boolean), 3, "items"), N = a.length, vis = Array(N).fill(false), ans = Array(N).fill(""), nodes = [], out = [], fr = []; let id = 0;
      const P = (filled) => [{ t: "tree", nodes, binary: false }, arr(a, { label: "a (green = used)", hl: Object.fromEntries(vis.map((v, i) => [i, v ? "done" : ""])) }), arr(ans.map((x, j) => (j < filled ? x : "")), { label: "ans" }), chips("output", out.slice())];
      const rec = (idx, me) => {
        if (idx === N) { out.push(ans.join("")); nodes[me].cls = "found"; fr.push(F(2, `idx == N = ${N}: every position is filled, so output <b>${ans.join("")}</b>.`, P(idx))); return; }
        for (let i = 0; i < N; i++) {
          if (vis[i]) continue;
          vis[i] = true; ans[idx] = a[i];
          const c = id++; nodes.push({ id: c, label: ans.slice(0, idx + 1).join(""), parent: me, cls: "act", ord: c });
          fr.push(F(7, `${a[i]} is unused: mark it used and put it in position ${idx}, then recurse to fill position ${idx + 1}.`, P(idx + 1)));
          rec(idx + 1, c);
          if (nodes[c].cls === "act") nodes[c].cls = "done";
          vis[i] = false;
          fr.push(F(9, `Back from the branch that put ${a[i]} at position ${idx}: un-mark ${a[i]} so later branches can use it.`, P(idx)));
        }
      };
      nodes.push({ id: id++, label: "·", parent: null, cls: "act" });
      fr.push(F(0, `Fill positions 0..${N - 1} one at a time. At each position try every item that is not used yet.`, P(0)));
      rec(0, 0); nodes[0].cls = "done";
      fr.push(F(-1, `<b>${out.length}</b> = ${N}! permutations. The tree has 1, N, N(N−1), … nodes per level, so O(N!·N) time.`, P(0)));
      return fr;
    } };

  /* ═════════ HASHING ═════════ */
  A.rhbs_hashChain = { title: "Hash table: chaining, load factor and rehashing", inputLabel: "keys | buckets M", input: "2 4 5 7 10 2 5 20 5 1 35 6 3 8 | 5",
    about: "Each key is hashed to bucket key % M and stored as a (key → count) node in that bucket's chain. Watch collisions grow a chain, and the load factor λ = n / M trigger a rehash when it passes 2.0.",
    code: ["def put(k):                  # store frequencies","    b = k % M","    if k in chain[b]:","        count[k] += 1","    else:","        chain[b].append((k, 1))","        n += 1","    if n / M > 2.0:","        rehash()             # M *= 2, reinsert every node"],
    gen(s) {
      const [k0, m0] = split(s); const keys = cap(nums(k0), 20, "keys"); let M = Math.max(2, Math.min(10, nums(m0)[0] || 5)), B = Array.from({ length: M }, () => []), n = 0; const fr = [];
      const md = (k, m) => ((k % m) + m) % m;
      const grid = (hl = {}) => { const items = {}, bh = {}; Object.entries(hl).forEach(([rc, cls]) => { const [r, c] = rc.split(",").map(Number); items[r + "," + c] = cls; bh[r] = "act"; }); return { t: "buckets", label: `${M} buckets · each bucket holds a chain of (key → count) nodes`, names: B.map((_, i) => "b" + i), buckets: B.map((c, r) => c.map(([k, v], j) => ({ k: "k" + k, v: `${k} → ${v}`, cls: items[r + "," + j] || "" }))), hl: bh }; };
      const lam = () => (n / M).toFixed(2);
      const st = () => vars({ "nodes n": n, "buckets M": M, "λ = n / M": lam() });
      fr.push(F(0, `Empty table with ${M} buckets. Hash function: key % ${M}.`, [arr(keys), grid(), st()]));
      keys.forEach((k, idx) => {
        const b = md(k, M), chain = B[b], j = chain.findIndex((e) => e[0] === k);
        if (j >= 0) { chain[j][1]++; fr.push(F(3, `${k} % ${M} = ${b}. Key ${k} is already in chain ${b}: bump its count to ${chain[j][1]}.`, [arr(keys, { hl: { [idx]: "act" } }), grid({ [b + "," + j]: "found" }), st()])); }
        else { chain.push([k, 1]); n++; fr.push(F(5, `${k} % ${M} = ${b}. ${chain.length > 1 ? `<b>Collision</b>: bucket ${b} already holds a key, so append a new node to its chain.` : `Bucket ${b} has no ${k} yet: add node (${k} → 1).`} n = ${n}, λ = ${(n / M).toFixed(2)}.`, [arr(keys, { hl: { [idx]: "act" } }), grid({ [b + "," + (chain.length - 1)]: chain.length > 1 ? "cmp" : "act" }), st()])); }
        if (n / M > 2) {
          fr.push(F(7, `λ = ${n}/${M} = ${lam()} > 2.0. Chains are getting long, so rehash.`, [arr(keys, { hl: { [idx]: "act" } }), grid(), st()]));
          const old = B; M *= 2; B = Array.from({ length: M }, () => []);
          old.forEach((c) => c.forEach(([kk, v]) => B[md(kk, M)].push([kk, v])));
          fr.push(F(8, `Doubled to ${M} buckets and reinserted all ${n} nodes with key % ${M}. λ drops to ${lam()}. One rehash is O(n), amortised O(1) per insert.`, [arr(keys), grid(), st()]));
        }
      });
      fr.push(F(-1, `Each lookup scans one chain: O(λ), which is O(1) while λ stays bounded.`, [arr(keys), grid(), st()]));
      return fr;
    } };

  A.rhbs_zeroSumLongest = { title: "Longest subarray with sum 0 (first index of each prefix sum)", inputLabel: "array", input: "2 3 -1 -2 4 5 -6 9 -10 15",
    about: "The second row is the running prefix sum. When a prefix sum repeats, the elements between its first index and now add up to 0 (the window). The map keeps only the first index of each sum, so each window is as long as possible.",
    code: ["first = {0: -1}      # empty prefix before index 0","s = 0","ans = 0","for i in range(N):","    s += a[i]","    if s in first:","        ans = max(ans, i - first[s])","    else:","        first[s] = i     # keep the FIRST index only","return ans"],
    gen(str) {
      const a = cap(nums(str), 14), fr = [], first = { 0: -1 }, pre = []; let sum = 0, ans = 0, best = null;
      const mp = (hit) => chips("prefix sum → first index", Object.entries(first).map(([k, v]) => ({ v: `${k} → ${v}`, cls: +k === hit ? "hit" : "" })));
      fr.push(F(0, "Seed 0 → −1 so a zero-sum prefix (starting at index 0) is found too.", [arr(a), arr([], { label: "prefix" }), mp(null), vars({ ans })]));
      a.forEach((x, i) => {
        sum += x; pre.push(sum);
        if (first[sum] !== undefined) {
          const len = i - first[sum]; const better = len > ans; if (better) { ans = len; best = [first[sum] + 1, i]; }
          fr.push(F(6, `s = ${sum} was first seen at index ${first[sum]}, so a[${first[sum] + 1}..${i}] sums to 0 (length ${len}).${better ? ` New best: <b>${ans}</b>.` : " Not longer than the best."}`, [arr(a, { win: [first[sum] + 1, i], hl: { [i]: "act" } }), arr(pre.slice(), { label: "prefix", hl: { [i]: "found", [first[sum]]: "found" } }), mp(sum), vars({ s: sum, ans })]));
        } else {
          first[sum] = i;
          fr.push(F(8, `Prefix sum s = ${sum} has not been seen before: remember its first index, ${i}.`, [arr(a, { hl: { [i]: "act" } }), arr(pre.slice(), { label: "prefix", hl: { [i]: "act" } }), mp(sum), vars({ s: sum, ans })]));
        }
      });
      fr.push(F(9, best ? `Longest zero-sum subarray: indices ${best[0]}..${best[1]}, length <b>${ans}</b>. O(N) time and space.` : "No zero-sum subarray (answer 0; the notes return −1).", [arr(a, best ? { win: best } : {}), mp(null), vars({ ans })]));
      return fr;
    } };

  A.rhbs_windowDistinct = { title: "Distinct elements in every window of size K", inputLabel: "array | K", input: "1 2 1 3 4 2 3 | 4",
    about: "The box is the current window of K elements; the freq map below holds a count per value. The number of keys in the map is the number of distinct values, so a key is deleted when its count drops to 0.",
    code: ["freq = Counter(a[:K])            # count the first window","out = [len(freq)]","for i in range(K, N):","    freq[a[i]] += 1              # a[i] enters","    freq[a[i - K]] -= 1          # a[i-K] leaves","    if freq[a[i - K]] == 0:","        del freq[a[i - K]]       # keep len(freq) = distinct","    out.append(len(freq))","return out"],
    gen(s) {
      const [a0, k0] = split(s); const a = cap(nums(a0), 14); if (!a.length) throw new Error("Enter an array.");
      const K = Math.max(1, Math.min(a.length, nums(k0)[0] || 1)), f = new Map(), out = [], fr = [];
      const fm = (hit, cls = "hit") => chips("freq map", [...f].map(([k, v]) => ({ v: `${k}: ${v}`, cls: k === hit ? cls : "" })));
      for (let i = 0; i < K; i++) f.set(a[i], (f.get(a[i]) || 0) + 1);
      fr.push(F(0, `Count every value in the first window a[0..${K - 1}] into the freq map.`, [arr(a, { win: [0, K - 1] }), fm(null), chips("answers", out.slice())]));
      out.push(f.size); fr.push(F(1, `Window 0 has <b>${f.size}</b> distinct values (map size).`, [arr(a, { win: [0, K - 1] }), fm(null), chips("answers", out.slice())]));
      for (let i = K; i < a.length; i++) {
        const inn = a[i], outv = a[i - K];
        f.set(inn, (f.get(inn) || 0) + 1);
        fr.push(F(3, `The window slides right: a[${i}] = ${inn} enters, so its count becomes ${f.get(inn)}.`, [arr(a, { win: [i - K, i], hl: { [i]: "found", [i - K]: "dim" } }), fm(inn), chips("answers", out.slice())]));
        const c = f.get(outv) - 1; let gone = false; if (c === 0) { f.delete(outv); gone = true; } else f.set(outv, c);
        fr.push(F(gone ? 6 : 4, gone ? `${outv} leaves and its count hits 0: <b>delete the key</b> so size() stays right.` : `${outv} leaves: count ${c}. Another ${outv} is still inside, which is why a plain set fails here.`, [arr(a, { win: [i - K + 1, i], hl: { [i - K]: "bad" } }), fm(outv, "bad"), chips("answers", out.slice())]));
        out.push(f.size);
        fr.push(F(7, `Window ${i - K + 1} (a[${i - K + 1}..${i}]) has <b>${f.size}</b> keys in the map, so ${f.size} distinct values.`, [arr(a, { win: [i - K + 1, i] }), fm(null), chips("answers", out.slice())]));
      }
      fr.push(F(8, `Answers [${out.join(", ")}]. Each step is O(1), so O(N) time and O(K) space.`, [arr(a), chips("answers", out)]));
      return fr;
    } };

  /* ═════════ BIT MANIPULATION ═════════ */
  A.rhbs_bitOps = { title: "Bit masks: check, set, toggle, unset bit i; shifts", inputLabel: "n (0–255) | i (0–7)", input: "41 | 2", presets: [["Bit 2 of 41 (unset)", "41 | 2"], ["Bit 3 of 173 (set)", "173 | 3"], ["Shift overflow: 160", "160 | 5"]],
    about: "Each row is one 8-bit number, most significant bit on the left; the highlighted column is bit i. Every operation lines n up against a mask and combines them column by column.",
    code: ["mask = 1 << i","is_set = (n & mask) != 0      # or (n >> i) & 1","set_bit = n | mask","toggled = n ^ mask","unset = n & ~mask","doubled = n << 1              # may overflow a fixed width","halved = n >> 1               # floor(n / 2), never overflows"],
    gen(s) {
      const v = nums(s), n = Math.max(0, Math.min(255, v[0] ?? 41)), i = Math.max(0, Math.min(7, v[1] ?? 2)), mask = 1 << i, fr = [];
      const B = (rows) => ({ t: "bits", width: 8, rows });
      const on = (n & mask) !== 0;
      fr.push(F(0, `mask = 1 << ${i} = ${mask}: a single 1 at bit ${i}.`, [B([{ label: "n", n, hlBit: i }, { label: "1 << " + i, n: mask, hlBit: i }])]));
      fr.push(F(1, `n & mask = ${n & mask} → bit ${i} is <b>${on ? "set" : "not set"}</b>. Same answer from (n >> ${i}) & 1 = ${(n >> i) & 1}.`, [B([{ label: "n", n, hlBit: i }, { label: "mask", n: mask, hlBit: i }, { label: "n & mask", n: n & mask, cls: "res", hlBit: i }, { label: `n >> ${i}`, n: n >> i, hlBit: 0 }])]));
      fr.push(F(2, `Set: n | mask = ${n | mask}. OR with 1 forces the bit to 1; the rest is unchanged.`, [B([{ label: "n", n, hlBit: i }, { label: "mask", n: mask, hlBit: i }, { label: "n | mask", n: n | mask, cls: "res", hlBit: i }])]));
      fr.push(F(3, `Toggle: n ^ mask = ${n ^ mask}. XOR with 1 flips the bit.`, [B([{ label: "n", n, hlBit: i }, { label: "mask", n: mask, hlBit: i }, { label: "n ^ mask", n: n ^ mask, cls: "res", hlBit: i }])]));
      fr.push(F(4, `Unset: n & ~mask = ${n & ~mask & 255}. ~mask is all 1s except bit ${i}.`, [B([{ label: "n", n, hlBit: i }, { label: "~mask", n: ~mask & 255, hlBit: i }, { label: "n & ~mask", n: n & ~mask & 255, cls: "res", hlBit: i }])]));
      const l = (n << 1) & 255, lost = (n & 128) !== 0;
      fr.push(F(5, `n << 1 shifts every bit one place left, which doubles n: ${n << 1}${lost ? `. But bit 7 of ${n} is 1 and falls off the 8-bit row, leaving ${l} (overflow)` : ` = 2·${n}`}.`, [B([{ label: "n", n }, { label: "n << 1", n: l, cls: lost ? "bad" : "res" }])]));
      fr.push(F(6, `n >> 1 shifts every bit one place right and drops bit 0: ${n >> 1} = ⌊${n}/2⌋. A right shift can never overflow.`, [B([{ label: "n", n }, { label: "n >> 1", n: n >> 1, cls: "res" }])]));
      return fr;
    } };

  A.rhbs_singleII = { title: "Per-bit counting: the single number when others repeat k times", inputLabel: "array | k", input: "5 7 5 4 7 11 11 9 11 7 5 4 4 | 3",
    presets: [["k = 3 (notes, answer 9)", "5 7 5 4 7 11 11 9 11 7 5 4 4 | 3"], ["k = 3 (answer 11)", "4 5 5 4 11 6 6 4 5 6 | 3"], ["k = 2 (Single Number I)", "2 3 5 6 3 6 2 | 2"]],
    about: "Rows are the numbers written in binary, columns are bit positions. For each column we count the 1s; every value that repeats k times adds k, so count % k leaves only the single number's bit.",
    code: ["ans = 0","for i in range(32):","    cnt = 0","    for x in arr:","        cnt += (x >> i) & 1       # does x have bit i?","    if cnt % k == 1:","        ans |= 1 << i             # the single number has bit i","return ans"],
    gen(s) {
      const [a0, k0] = split(s); const a = cap(nums(a0).map(Math.trunc), 14, "numbers"); if (!a.length) throw new Error("Enter an array.");
      if (a.some((x) => x < 0 || x > 255)) throw new Error("Use numbers 0–255 here (real code loops over all 32 bits, including the sign bit).");
      const k = Math.max(2, Math.min(5, nums(k0)[0] || 3)), W = Math.max(1, Math.max(...a).toString(2).length), fr = [];
      const rows = a.map((x) => Array.from({ length: W }, (_, c) => (x >> (W - 1 - c)) & 1)); const cntRow = Array(W).fill(""), resRow = Array(W).fill(""); let ans = 0;
      const G = (hl) => ({ t: "grid", label: "numbers × bits", ch: Array.from({ length: W }, (_, c) => "b" + (W - 1 - c)), rh: [...a.map(String), "count", `% ${k}`], rows: [...rows, cntRow, resRow], hl });
      fr.push(F(0, `Each repeated value adds ${k} to every column where it has a 1. So column count % ${k} is the single number's bit.`, [G({}), vars({ ans })]));
      for (let i = 0; i < W; i++) {
        const c = W - 1 - i; let cnt = 0; const hl = {};
        a.forEach((x, r) => { if ((x >> i) & 1) { cnt++; hl[r + "," + c] = "act"; } else hl[r + "," + c] = "cmp"; });
        cntRow[c] = cnt; resRow[c] = cnt % k; if (cnt % k === 1) ans |= 1 << i;
        hl[a.length + "," + c] = "done"; hl[a.length + 1 + "," + c] = cnt % k === 1 ? "found" : "";
        fr.push(F(cnt % k === 1 ? 6 : 5, `Bit ${i}: ${cnt} numbers have it. ${cnt} % ${k} = ${cnt % k}${cnt % k === 1 ? `, so set bit ${i}` : cnt % k === 0 ? ", so leave it 0" : " (input breaks the 'all others ×k' promise)"}. ans = ${ans}`, [G(hl), vars({ ans })]));
      }
      fr.push(F(7, `Answer <b>${ans}</b> (${ans.toString(2)}). O(32·N) time, O(1) space. Plain XOR fails for k = 3 because x^x^x = x.`, [G({}), { t: "bits", width: Math.max(4, W), rows: [{ label: "answer", n: ans, cls: "res" }] }]));
      return fr;
    } };

  A.rhbs_twoUnique = { title: "Two unique numbers: XOR all, then split by one set bit", inputLabel: "array (pairs + two singles)", input: "10 8 8 9 12 9 6 11 10 6 12 17",
    about: "Step 1 XORs everything so the pairs cancel and only x ^ y is left. Step 2 picks a bit where x and y differ and sorts every number into two groups by that bit; XOR-ing each group gives one answer.",
    code: ["val = 0","for v in a:","    val ^= v                      # pairs cancel: val = x ^ y","pos = (val & -val).bit_length() - 1   # lowest set bit","s1 = 0","s2 = 0","for v in a:","    if (v >> pos) & 1:","        s1 ^= v                   # group with bit pos set","    else:","        s2 ^= v                   # group with bit pos unset","return s1, s2"],
    gen(s) {
      const a = cap(nums(s).map(Math.trunc), 14, "numbers"); if (a.some((x) => x < 0)) throw new Error("Use non-negative numbers.");
      const W = Math.max(5, Math.max(0, ...a).toString(2).length), fr = [], val = a.reduce((p, q) => p ^ q, 0);
      fr.push(F(2, `XOR every element: each pair gives v ^ v = 0, so only the two singles survive. val = x ^ y = <b>${val}</b>.`, [arr(a), { t: "bits", width: W, rows: [{ label: "val", n: val, cls: "res" }] }]));
      if (!val) { fr.push(F(-1, "val = 0, so there are not two distinct singles in this input.", [arr(a)])); return fr; }
      let pos = 0; while (!((val >> pos) & 1)) pos++;
      fr.push(F(3, `The lowest set bit of val is bit ${pos}. A 1 there means x and y differ there. Split every number by bit ${pos}.`, [arr(a), { t: "bits", width: W, rows: [{ label: "val", n: val, hlBit: pos, cls: "res" }] }]));
      const g1 = [], g2 = []; let s1 = 0, s2 = 0;
      a.forEach((v, i) => {
        const set = (v >> pos) & 1; if (set) { g1.push(v); s1 ^= v; } else { g2.push(v); s2 ^= v; }
        fr.push(F(set ? 8 : 10, `${v} has bit ${pos} = ${set}, so it goes to the ${set ? "set" : "unset"} group and is XOR-ed into ${set ? "s1" : "s2"}.`, [arr(a, { hl: { [i]: "act" } }), { t: "bits", width: W, rows: [{ label: String(v), n: v, hlBit: pos }] }, chips(`bit ${pos} set`, g1.slice()), chips(`bit ${pos} unset`, g2.slice()), vars({ s1, s2 })]));
      });
      fr.push(F(11, `Each pair lands in one group and cancels. Answers: <b>${s1}</b> and <b>${s2}</b>. O(N) time, O(1) space.`, [arr(a), chips(`bit ${pos} set → XOR`, [{ v: s1, cls: "hit" }]), chips(`bit ${pos} unset → XOR`, [{ v: s2, cls: "hit" }])]));
      return fr;
    } };

  /* ═════════ STRINGS ═════════ */
  A.rhbs_expandCentre = { title: "Longest palindromic substring: expand around every centre", inputLabel: "string", input: "feacabacabgf",
    presets: [["Notes: feacabacabgf", "feacabacabgf"], ["anamadamm", "anamadamm"], ["Even centre", "cabbad"]],
    about: "Each step picks a centre (a character for odd lengths, a gap for even lengths) and grows l and r outward while the two ends match. Green is the palindrome found; red marks the first pair that did not match.",
    code: ["def expand(l, r):","    while l >= 0 and r < N and s[l] == s[r]:","        l -= 1","        r += 1","    return r - l - 1              # l, r stop one step outside","ans = 0","for i in range(N):","    len1 = expand(i - 1, i + 1)   # odd: centre on s[i]","    len2 = expand(i, i + 1)       # even: centre on the gap","    ans = max(ans, len1, len2)"],
    gen(str) {
      const s = cap([...String(str).trim()], 18, "characters"), N = s.length, fr = [], odd = []; let ans = 0, best = null;
      if (!N) throw new Error("Enter a string.");
      const expand = (l, r) => { while (l >= 0 && r < N && s[l] === s[r]) { l--; r++; } return [l, r]; };
      const tab = () => chips("odd length per centre", odd.slice());
      for (let i = 0; i < N; i++) {
        for (const kind of ["odd", "even"]) {
          if (kind === "even" && i === N - 1) continue;
          const [l, r] = kind === "odd" ? expand(i - 1, i + 1) : expand(i, i + 1), len = r - l - 1;
          if (kind === "odd") odd.push({ v: `${s[i]} ${len}`, cls: len > 1 ? "hit" : "" });
          if (len > ans) { ans = len; best = [l + 1, r - 1]; }
          const hl = len > 0 ? range(l + 1, r - 1, "found") : {};
          if (l >= 0) hl[l] = "bad"; if (r < N) hl[r] = "bad";
          if (kind === "odd") hl[i] = len > 1 ? "found" : "act";
          const sub = len > 0 ? s.slice(l + 1, r).join("") : "";
          fr.push(F(kind === "odd" ? 7 : 8, kind === "odd" ? `Odd centre '${s[i]}' (index ${i}): the ends keep matching up to "${sub}", then stop at l = ${l}, r = ${r}. Length r − l − 1 = ${len}.` : `Gap between ${i} and ${i + 1}: ${len ? `grows to "${sub}", length ${len}` : `'${s[i]}' ≠ '${s[i + 1]}', length 0`}.`, [arr(s, { hl, ptr: { l, r } }), vars({ centre: kind === "odd" ? i : `${i}|${i + 1}`, len, best: ans }), tab()]));
        }
      }
      fr.push(F(9, `Longest palindrome: "<b>${s.slice(best[0], best[1] + 1).join("")}</b>", length ${ans}. 2N − 1 centres × O(N) expansion = O(N²) time, O(1) space.`, [arr(s, { win: best, hl: range(best[0], best[1], "found") }), tab()]));
      return fr;
    } };

  A.rhbs_kmpSearch = { title: "KMP matching: LPS of P + '#' + T", inputLabel: "text | pattern | (no #)", input: "dabceabc | abc",
    presets: [["Notes example", "dabceabc | abc"], ["Overlaps: aa in aaaa", "aaaa | aa"], ["Without '#' (wrong)", "aaaa | aa | no #"]],
    about: "The top row is S = P + '#' + T, the bottom row its LPS array. Pointer i walks S and x is the border being extended; on a mismatch x falls back to a shorter border. Every lps value equal to M = len(P) marks a match in T.",
    code: ["S = P + '#' + T","lps = [0] * len(S)","for i in range(1, len(S)):","    x = lps[i - 1]","    while S[i] != S[x]:","        if x == 0:","            x = -1","            break","        x = lps[x - 1]        # fall back to a shorter border","    lps[i] = x + 1","    if lps[i] == M:","        count += 1            # a match ends at i"],
    gen(s) {
      const [t0, p0, d0] = split(s); const Tt = [...(t0 || "")], P = [...(p0 || "")]; if (!P.length) throw new Error("Write the pattern after a |, e.g. dabceabc | abc");
      const delim = !/no/i.test(d0 || ""), S = cap(delim ? [...P, "#", ...Tt] : [...P, ...Tt], 24, "characters in P#T"), M = P.length, off = delim ? M + 1 : M;
      const lps = Array(S.length).fill(null), fr = [], found = []; lps[0] = 0;
      const lpsHl = (i, extra = {}) => { const h = {}; lps.forEach((v, j) => { if (v == null) return; if (v > M) h[j] = "bad"; else if (v === M && j >= off) h[j] = "found"; }); return { ...h, ...extra }; };
      const V = (i, x, hl, lhl) => [arr(S, { label: "S", ptr: x >= 0 && x !== i ? { i, x } : { i }, hl }), arr(lps.slice(), { label: "lps", hl: lhl }), chips("matches start at T index", found.slice())];
      fr.push(F(0, delim ? `S = "${S.join("")}". '#' is in neither string, so no lps value can exceed M = ${M}.` : `S = "${S.join("")}" with NO delimiter. Watch lps grow past M = ${M}.`, V(0, -1, {}, {})));
      for (let i = 1; i < S.length; i++) {
        let x = lps[i - 1];
        while (S[i] !== S[x]) {
          if (x === 0) { x = -1; fr.push(F(6, `S[${i}] = '${S[i]}' ≠ S[0] = '${S[0]}' and x is 0: no border fits.`, V(i, 0, { [i]: "bad", 0: "bad" }, lpsHl(i)))); break; }
          const nx = lps[x - 1];
          fr.push(F(8, `S[${i}] = '${S[i]}' ≠ S[${x}] = '${S[x]}': fall back x = lps[${x - 1}] = ${nx}.`, V(i, x, { [i]: "bad", [x]: "bad" }, lpsHl(i, { [x - 1]: "cmp" }))));
          x = nx;
        }
        lps[i] = x + 1;
        const hit = lps[i] === M && i >= off;
        if (hit) found.push(i - off - M + 1);
        fr.push(F(hit ? 11 : 9, hit ? `lps[${i}] = ${M} = M: <b>match</b> in T starting at index ${i - off - M + 1}.` : x >= 0 ? `S[${i}] = S[${x}] = '${S[i]}': lps[${i}] = ${x + 1}${lps[i] > M ? ` (bigger than M: only possible without '#')` : ""}.` : `lps[${i}] = 0.`, V(i, x, x >= 0 ? { [i]: "found", [x]: "found" } : { [i]: "dim" }, lpsHl(i, { [i]: hit ? "found" : lps[i] > M ? "bad" : "done" }))));
      }
      const right = (() => { let c = 0; for (let j = 0; j + M <= Tt.length; j++) if (Tt.slice(j, j + M).join("") === P.join("")) c++; return c; })();
      fr.push(F(-1, `${found.length} match(es) found by lps == M${delim ? "" : `, but the true count is ${right}: without '#' the lps runs past M and matches are missed`}. O(N + M) time and space.`, V(S.length - 1, -1, {}, lpsHl(S.length - 1))));
      return fr;
    } };

  /* ═══════════════════════════ TOPIC: RECURSION ═══════════════════════════ */
  T["recursion"] = {
    name: "Recursion & backtracking", icon: "🌀", color: "#7c3aed", minutes: 75,
    notes: "recursion1.pdf, recursion2.pdf, Backtracking1.pdf, Backtracking2.pdf",
    summary: "Solve a problem by trusting a smaller copy of it; backtracking uses the same idea to try every choice and undo the ones that fail.",
    sections: [
      { h: "The idea and the 3-step recipe", blocks: [
        ["analogy", "You are in a long queue and want to know your position. You ask the person in front, who asks the person in front of them, and so on. The first person says “1”. Each answer comes back one step at a time, and you add 1 to whatever you hear. Nobody solves the whole problem; each person trusts the smaller answer."],
        ["p", "<b>Recursion</b> is a function that calls itself on a smaller input. You need it for backtracking, trees, graphs, DP and merge/quick sort, so it is worth getting fluent with now."],
        ["steps", [
          ["Assumption", "Say in one sentence what <code>f(N)</code> computes and returns. Example: “sum(N) returns 1 + 2 + … + N.” Then trust it for smaller inputs."],
          ["Main logic", "Build the answer for N out of the answers for smaller inputs: <code>sum(N) = sum(N−1) + N</code>."],
          ["Base condition", "The smallest input you can answer directly: <code>sum(1) = 1</code>. Without it the calls never stop."]
        ]],
        ["tip", "<b>Picking base cases:</b> expand the recurrence and see where it becomes undefined. For Fibonacci, fib(1) = fib(0) + fib(−1) and fib(0) = fib(−1) + fib(−2) are both invalid, so both 0 and 1 must be base cases."],
        ["probs", [
          { t: "Sum of first N natural numbers", d: "Easy", q: "Return 1 + 2 + … + N recursively.",
            ex: "N = 5 → 15\nAs the stack unwinds it returns 1, 3, 6, 10, 15",
            ap: [
              { n: "Brute force", cx: "O(N) time · O(N) space",
                idea: "The recursion recipe: assume <code>total(N−1)</code> works, then <b>total(N) = total(N−1) + N</b>, base case N = 1. It makes N calls and keeps N frames on the stack (a plain loop would be O(1) space).",
                code: "def total(n):\n    if n == 1:                 # base case\n        return 1\n    return total(n - 1) + n    # trust the smaller answer" },
              { n: "Optimal", cx: "O(1) time · O(1) space",
                idea: "Pair the first and last terms: 1 + N, 2 + (N−1), … each pair sums to N + 1, so the total is <b>N(N+1)/2</b>. No loop or recursion needed.",
                code: "def total(n):\n    return n * (n + 1) // 2" }
            ],
            edge: "N ≤ 0 never reaches N == 1 and recurses until the stack overflows. Guard it." },
          { t: "Factorial", d: "Easy", q: "Return N! recursively.",
            ex: "5! = 120\nDry run of 4!: returns 1 (N=0), 1, 2, 6, 24",
            ap: [
              { n: "Solution", cx: "O(N) time · O(N) space",
                idea: "<b>N! = (N−1)! · N</b>. Using N = 0 → 1 as the base case also handles 0!. A loop gives the same O(N) time with O(1) space.",
                code: "def fact(n):\n    if n == 0:                 # 0! = 1 covers the smallest input\n        return 1\n    return fact(n - 1) * n" }
            ],
            edge: "20! is the largest factorial that fits in a 64-bit long." }
        ]]
      ] },
      { h: "The call stack: order of execution", blocks: [
        ["p", "Every call gets a <b>frame</b> on the call stack (last in, first out). A frame waits until the call it made returns, then resumes from that exact line."],
        ["math", [
          ["print(sub(mul(add(10, 20), 30), 75))", "frames pushed: print → sub → mul → add", ""],
          ["add(10, 20)", "runs first (top of stack)", "30"],
          ["mul(30, 30)", "uses add's return value", "900"],
          ["sub(900, 75)", "uses mul's return value", "825"],
          ["print(825)", "bottom frame finishes last", "825"]
        ], "Each return value feeds the frame below it."],
        ["table", ["Code", "Prints for N = 3", "Why"], [
          ["<code>solve(N-1); print(N)</code>", "1 2 3", "prints happen while frames pop (after the call)"],
          ["<code>print(N); solve(N-1)</code>", "3 2 1", "prints happen while frames push (before the call)"]
        ]],
        ["warn", "<b>Stack overflow:</b> if the base case is never reached (call solve(−3) with base case <code>N == 0</code>) you get solve(−4), solve(−5), … until the stack runs out of memory."],
        ["p", "Tracing questions in tests ask you to run code like this by hand. Write each frame's arguments, then fill in return values from the deepest call upward."],
        ["probs", [
          { t: "Trace: magicfun(N)", d: "Easy", q: "<code>magicfun(N) = magicfun(N/2)*10 + N%2</code>, with magicfun(0) = 0. What does it return?",
            ex: "magicfun(7): calls 7 → 3 → 1 → 0\nreturns 0 → 1 → 11 → 111",
            ap: [
              { n: "Solution", cx: "O(log N) time · O(log N) space",
                idea: "Each level halves N and appends N % 2 as the next digit, so it returns <b>N's binary digits written as a decimal number</b> (7 → 111).",
                code: "def magicfun(n):\n    if n == 0:\n        return 0\n    return magicfun(n // 2) * 10 + n % 2" }
            ] },
          { t: "Trace: recursive in-place reverse", d: "Easy", q: "fun(s, x) prints s; if x &lt; len/2 it swaps s[x] and s[len−1−x] and recurses with x+1. What is printed for \"SCROLL\"?",
            ex: "SCROLL\nLCROLS\nLLROCS\nLLORCS",
            ap: [
              { n: "Solution", cx: "O(N²) time (with printing) · O(N) space",
                idea: "Each call swaps one outer pair and moves inward, like two pointers written as recursion. The last line printed is the full reverse.",
                code: "def fun(s, x):                 # s is a list of characters\n    print(''.join(s))\n    if x < len(s) // 2:\n        y = len(s) - 1 - x\n        s[x], s[y] = s[y], s[x]\n        fun(s, x + 1)\n\nfun(list('SCROLL'), 0)" }
            ] },
          { t: "Trace: foo / bar", d: "Medium", q: "bar(x, y) = 0 if y == 0 else x + bar(x, y−1). foo(x, y) = 1 if y == 0 else bar(x, foo(x, y−1)). Find foo(3, 5).",
            ex: "foo(3,1) = bar(3,1) = 3\nfoo(3,2) = bar(3,3) = 9\nfoo(3,3) = 27, foo(3,4) = 81\nfoo(3,5) = 243",
            ap: [
              { n: "Brute force", cx: "O(x^y) time · O(x^y) space",
                idea: "Expand every call by hand. It works, but bar(3, 81) alone is 81 nested calls, so <b>expanding is slow and error-prone</b>.",
                code: "def bar(x, y):\n    if y == 0:\n        return 0\n    return x + bar(x, y - 1)\n\ndef foo(x, y):\n    if y == 0:\n        return 1\n    return bar(x, foo(x, y - 1))" },
              { n: "Optimal", cx: "O(log y) time · O(1) space",
                idea: "Spot the closed forms: <b>bar(x, y) = x·y</b> (repeated addition) and <b>foo(x, y) = x^y</b> (repeated multiplication). So foo(3, 5) = 3^5 = 243.",
                code: "def foo(x, y):\n    return x ** y              # bar is x * y, so foo multiplies x by itself y times" }
            ] }
        ]]
      ] },
      { h: "Time and space: recurrences and recursion trees", blocks: [
        ["p", "<b>Time</b> = number of calls × work per call. <b>Space</b> = the deepest the stack gets (one root-to-leaf path), not the size of the whole tree."],
        ["p", "Write T(N) in terms of a smaller T plus the work done in one call, expand it k times, then choose k so the argument reaches the base case."],
        ["math", [
          ["sum / fact", "T(N) = T(N−1) + c = T(N−k) + kc, k = N−1", "O(N)"],
          ["pow V2 (two calls)", "T(N) = 2T(N/2) + c", "O(N)"],
          ["fast power", "T(N) = T(N/2) + c = T(N/2^k) + kc, k = log₂N", "O(log N)"],
          ["fib", "T(N) = T(N−1) + T(N−2) + c → tree has ≤ 1 + 2 + 4 + … + 2^N nodes", "O(2^N)"],
          ["Tower of Hanoi", "T(N) = 2T(N−1) + 1 → 1, 3, 7, 15, 31", "2^N − 1"]
        ], "Substitution does not simplify for Fibonacci, so draw the recursion tree and add up each level."],
        ["viz", "fibTree", "Plain recursion recomputes the same sub-calls (every f2 box). Switch to the memo preset to see the tree collapse to a line."],
        ["probs", [
          { t: "Nth Fibonacci", d: "Easy", q: "fib(0) = 0, fib(1) = 1, fib(N) = fib(N−1) + fib(N−2).",
            ex: "N:   0 1 2 3 4 5 6 7  8  9  10\nfib: 0 1 1 2 3 5 8 13 21 34 55\nfib(3) → fib(2) + fib(1) → (1 + 0) + 1 = 2",
            ap: [
              { n: "Brute force", cx: "O(2^N) time · O(N) space",
                idea: "Direct recursion. Base case <b>N ≤ 1 → N</b> covers both 0 and 1. The tree roughly doubles each level and recomputes the same fib(k) again and again, which is why it is slow. Space is only O(N): one path is on the stack at a time.",
                code: "def fib(n):\n    if n <= 1:\n        return n\n    return fib(n - 1) + fib(n - 2)" },
              { n: "Better", cx: "O(N) time · O(N) space",
                idea: "<b>Memoise</b>: store each fib(k) the first time it is computed, so every value is computed once (see DP).",
                code: "def fib(n, memo=None):\n    if memo is None:\n        memo = {}\n    if n <= 1:\n        return n\n    if n not in memo:\n        memo[n] = fib(n - 1, memo) + fib(n - 2, memo)\n    return memo[n]" },
              { n: "Optimal", cx: "O(N) time · O(1) space",
                idea: "Each value only needs the previous two, so <b>keep two variables</b> and slide them forward.",
                code: "def fib(n):\n    a, b = 0, 1                # fib(0), fib(1)\n    for _ in range(n):\n        a, b = b, a + b\n    return a" }
            ],
            viz: "fibTree", lc: "fibonacci-number" },
          { t: "Power a^N three ways", d: "Medium", q: "Compute a^N for a, N ≥ 0.",
            ex: "2^3 = 8\n2^10 = 2^5 · 2^5\n2^11 = 2^5 · 2^5 · 2\n3^33 = 3^16 · 3^16 · 3",
            ap: [
              { n: "Brute force", cx: "O(N) time · O(N) space",
                idea: "<b>V1:</b> pow(a, N) = pow(a, N−1)·a, so N calls. <b>V2</b> splits in half but calls pow(a, N/2) <i>twice</i>: T(N) = 2T(N/2) + c is still O(N), because the same half is computed twice.",
                code: "def power(a, n):\n    if n == 0:\n        return 1\n    return power(a, n - 1) * a" },
              { n: "Optimal", cx: "O(log N) time · O(log N) space",
                idea: "<b>V3, fast power:</b> compute <b>p = pow(a, N/2) once</b>, return p·p, and multiply by one extra a when N is odd. T(N) = T(N/2) + c → O(log N).",
                code: "def fast_pow(a, n):\n    if n == 0:\n        return 1\n    p = fast_pow(a, n // 2)    # compute the half ONCE\n    if n % 2 == 0:\n        return p * p\n    return p * p * a           # odd n needs one extra a" }
            ],
            edge: "N = 0 → 1. Results overflow fast: use long or take a modulus at each multiply. LeetCode's version also allows negative N (use 1 / x^(−N)).",
            lc: "powx-n" }
        ]]
      ] },
      { h: "Classic recursion: Hanoi, parentheses, Kth symbol", blocks: [
        ["p", "These problems are hard to see iteratively and short when written recursively. In each one, find the smaller copy of the same problem."],
        ["viz", "rhbs_hanoi", "Every non-trivial call parks N−1 disks on the helper, moves the biggest disk, then brings the N−1 back. The roles of the pegs rotate."],
        ["viz", "rhbs_genParens", "Only add '(' while open &lt; N and ')' while close &lt; open. Red nodes are pruned, so every leaf is valid."],
        ["probs", [
          { t: "Tower of Hanoi", d: "Medium", q: "Move N disks from A to C using B. Move one top disk at a time and never put a larger disk on a smaller one. Print the minimal moves.",
            ex: "N = 1: 1 A→C\nN = 2: 1 A→B, 2 A→C, 1 B→C\nN = 3: 1 A→C, 2 A→B, 1 C→B, 3 A→C, 1 B→A, 2 B→C, 1 A→C",
            ap: [
              { n: "Solution", cx: "O(2^N) time · O(N) space",
                idea: "Three steps: <b>(1) move N−1 disks source → helper, (2) move disk N source → destination, (3) move N−1 disks helper → destination.</b> Steps 1 and 3 are the same problem with the tower roles swapped. T(N) = 2T(N−1) + 1 gives 2^N − 1 moves.",
                code: "def toh(n, src, dst, helper):\n    if n == 0:\n        return\n    toh(n - 1, src, helper, dst)       # park n-1 disks on the helper\n    print('move', n, src, '->', dst)   # move the biggest disk\n    toh(n - 1, helper, dst, src)       # bring the n-1 disks back on top\n\ntoh(3, 'A', 'C', 'B')" }
            ],
            edge: "N = 0 prints nothing.",
            viz: "rhbs_hanoi" },
          { t: "Generate all valid parentheses", d: "Medium", q: "Print every balanced string made of N '(' and N ')'.",
            ex: "N = 1: ()\nN = 2: (()) ()()\nN = 3: ((())) (()()) (())() ()(()) ()()()",
            ap: [
              { n: "Brute force", cx: "O(2^(2N) · N) time · O(N) space",
                idea: "Generate all 2^(2N) strings of '(' and ')' and keep the balanced ones. <b>Almost all of them are invalid</b>, so most of the work is wasted.",
                code: "from itertools import product\n\ndef is_valid(s):\n    bal = 0\n    for ch in s:\n        bal += 1 if ch == '(' else -1\n        if bal < 0:            # a ')' with no partner\n            return False\n    return bal == 0\n\ndef generate(n):\n    out = []\n    for chars in product('()', repeat=2 * n):\n        s = ''.join(chars)\n        if is_valid(s):\n            out.append(s)\n    return out" },
              { n: "Optimal", cx: "O(4^N / √N) time · O(N) space",
                idea: "Build the string left to right and <b>prune</b>: add '(' only if open &lt; N, add ')' only if close &lt; open. Then no prefix ever has more ')' than '(' and every finished string is valid. The number of results is the Catalan number.",
                code: "def generate(n):\n    out = []\n\n    def gen(opens, closes, s):\n        if len(s) == 2 * n:\n            out.append(s)\n            return\n        if opens < n:\n            gen(opens + 1, closes, s + '(')\n        if closes < opens:\n            gen(opens, closes + 1, s + ')')\n\n    gen(0, 0, '')\n    return out" }
            ],
            viz: "rhbs_genParens", lc: "generate-parentheses" },
          { t: "Kth symbol in grammar", d: "Medium", q: "Row 1 is \"0\". Each next row replaces 0 → 01 and 1 → 10. Return the symbol at 0-indexed position B in row A (A ≤ 10^5).",
            ex: "0\n01\n0110\n01101001\n0110100110010110\nA = 5, B = 4 → 1;  A = 5, B = 11 → 1",
            ap: [
              { n: "Brute force", cx: "O(2^A) time · O(2^A) space",
                idea: "Build the rows: row A has 2^(A−1) characters, <b>impossible for large A</b>. <b>V1</b> (row A = row A−1 + its complement) still needs 2^(A−2) memory.",
                code: "def kth_symbol(a, b):\n    row = '0'\n    for _ in range(a - 1):\n        row = ''.join('01' if ch == '0' else '10' for ch in row)\n    return int(row[b])" },
              { n: "Optimal", cx: "O(log B) time · O(log B) space",
                idea: "<b>Parity insight:</b> the symbol at B was produced by the symbol at <b>B/2</b> in the previous row. Even B copies it; odd B flips it. So recurse on B/2 until B = 0. Equivalently the answer is popcount(B) mod 2.",
                code: "def kth_symbol(a, b):\n    if b == 0:\n        return 0\n    parent = kth_symbol(a - 1, b // 2)\n    if b % 2 == 0:\n        return parent          # even position copies the parent\n    return 1 - parent          # odd position is its complement" }
            ],
            lc: "k-th-symbol-in-grammar" },
          { t: "Friends pairing (pair up or stay alone)", d: "Medium", q: "Count the ways N people can each stay single or pair with exactly one other person.",
            ex: "{1,2} → 2 ways\n{1,2,3} → 4 ways",
            ap: [
              { n: "Brute force", cx: "O(2^N) time · O(N) space",
                idea: "Look at person N: either they stay alone (ways(N−1)) or they pair with one of the other N−1 people ((N−1)·ways(N−2)). <b>ways(N) = ways(N−1) + (N−1)·ways(N−2)</b>. Plain recursion recomputes the same sub-problems, like fib.",
                code: "def ways(n):\n    if n <= 2:\n        return n               # ways(1) = 1, ways(2) = 2\n    return ways(n - 1) + (n - 1) * ways(n - 2)" },
              { n: "Better", cx: "O(N) time · O(N) space",
                idea: "Tabulate: fill dp[1..N] from small to large, so each value is computed once.",
                code: "def ways(n):\n    if n <= 2:\n        return n\n    dp = [0] * (n + 1)\n    dp[1] = 1\n    dp[2] = 2\n    for i in range(3, n + 1):\n        dp[i] = dp[i - 1] + (i - 1) * dp[i - 2]\n    return dp[n]" },
              { n: "Optimal", cx: "O(N) time · O(1) space",
                idea: "dp[i] only needs the previous two values, so <b>keep two variables</b>.",
                code: "def ways(n):\n    if n <= 2:\n        return n\n    prev2, prev1 = 1, 2        # ways(1), ways(2)\n    for i in range(3, n + 1):\n        prev2, prev1 = prev1, prev1 + (i - 1) * prev2\n    return prev1" }
            ] }
        ]]
      ] },
      { h: "Backtracking: choose → explore → unchoose", blocks: [
        ["analogy", "Walking a maze with chalk: at each junction pick a path and mark it. If you hit a dead end, walk back to the last junction, rub out the mark, and try the next path."],
        ["p", "<b>Backtracking</b> is recursion that tries every possibility. Each level of the recursion tree is one decision (a position or an element). Each branch is one option for it. After exploring a branch you <b>undo</b> the change, so the next branch starts clean."],
        ["code", "def backtrack(state):\n    if is_complete(state):\n        record(state)              # copy it if it will keep changing\n        return\n    for choice in choices(state):\n        if is_valid(state, choice):\n            apply(state, choice)   # choose\n            backtrack(state)       # explore\n            undo(state, choice)    # unchoose"],
        ["p", "Time ≈ number of nodes in the tree × work per node. Space = depth + auxiliary arrays (visited, current path)."],
        ["viz", "rhbs_perms", "Fill one position per level with any unused item. The undo step (vis[i] = false) is what lets later branches reuse an item."],
        ["viz", "subsets", "Two branches per element: include it or exclude it. 2^N leaves."],
        ["probs", [
          { t: "Permutations of distinct characters", d: "Medium", q: "Print all orderings of N distinct characters.",
            ex: "[a,b,c] → abc acb bac bca cab cba   (3! = 6)",
            ap: [
              { n: "Solution", cx: "O(N!·N) time · O(N) space",
                idea: "Fill <code>ans</code> one index at a time. At position idx try every unused arr[i]: <b>mark visited, set ans[idx], recurse with idx+1, unmark</b>. Base case idx == N records ans. The input is never changed. There are N! results of length N, so no method can beat O(N!·N).",
                code: "def permutations(arr):\n    n = len(arr)\n    ans = [None] * n\n    vis = [False] * n\n    out = []\n\n    def perm(idx):\n        if idx == n:\n            out.append(ans[:])\n            return\n        for i in range(n):\n            if not vis[i]:\n                vis[i] = True          # choose\n                ans[idx] = arr[i]\n                perm(idx + 1)          # explore\n                vis[i] = False         # unchoose\n\n    perm(0)\n    return out" }
            ],
            edge: "Duplicate characters give repeated permutations (sort and skip equal unused neighbours, LC 47). ans[idx] needs no reset: the next try overwrites it.",
            viz: "rhbs_perms", lc: "permutations" },
          { t: "All subsets", d: "Medium", q: "Print every subset of the array.",
            ex: "[10,20,30] → [] [10] [10,20] [10,30] [10,20,30] [20] [20,30] [30]   (2^3 = 8)",
            ap: [
              { n: "Solution", cx: "O(2^N · N) time · O(N) space",
                idea: "At each index branch twice: <b>exclude</b> the element, or <b>include</b> it (add, recurse, remove last). Exclude-first gives [], [30], [20], [20,30], … in that order. (Bitmasks 0..2^N − 1 give the same result iteratively.)",
                code: "def subsets(arr):\n    out = []\n    cur = []\n\n    def go(idx):\n        if idx == len(arr):\n            out.append(cur[:])     # copy, cur keeps changing\n            return\n        go(idx + 1)                # exclude arr[idx]\n        cur.append(arr[idx])\n        go(idx + 1)                # include arr[idx]\n        cur.pop()                  # undo\n\n    go(0)\n    return out" }
            ],
            edge: "N = 0 prints just [].",
            viz: "subsets", lc: "subsets" },
          { t: "Combination sum", d: "Medium", q: "Given distinct positive candidates and a target, list every combination that sums to the target. A number may be reused.",
            ex: "candidates [2,3,6,7], target 7 → [[2,2,3],[7]]",
            ap: [
              { n: "Solution", cx: "O(2^T) time (exponential) · O(T) space",
                idea: "Backtrack with a start index so each combination is built in non-decreasing order (no duplicates). Stay on the same index to reuse a number; with the candidates sorted, <b>stop as soon as a candidate is bigger than the remaining target</b>.",
                code: "def combination_sum(c, target):\n    c.sort()\n    out = []\n    cur = []\n\n    def go(start, rem):\n        if rem == 0:\n            out.append(cur[:])\n            return\n        for i in range(start, len(c)):\n            if c[i] > rem:\n                break              # sorted: every later candidate is bigger too\n            cur.append(c[i])\n            go(i, rem - c[i])      # i, not i + 1: c[i] may be reused\n            cur.pop()\n\n    go(0, target)\n    return out" }
            ],
            lc: "combination-sum" },
          { t: "Word search in a grid", d: "Medium", q: "Can the word be traced through horizontally or vertically adjacent cells, using each cell at most once?",
            ex: "board ABCE / SFCS / ADEE, word ABCCED → true",
            ap: [
              { n: "Solution", cx: "O(R·C·4^L) time · O(L) space",
                idea: "DFS from every cell that matches word[0]. <b>Mark the cell as used before recursing and restore it afterwards</b> (choose → explore → unchoose on the grid itself).",
                code: "def exist(board, word):\n    rows, cols = len(board), len(board[0])\n\n    def dfs(r, c, k):\n        if k == len(word):\n            return True\n        if r < 0 or c < 0 or r >= rows or c >= cols:\n            return False\n        if board[r][c] != word[k]:\n            return False\n        saved = board[r][c]\n        board[r][c] = '#'                  # mark used\n        found = (dfs(r + 1, c, k + 1) or dfs(r - 1, c, k + 1)\n                 or dfs(r, c + 1, k + 1) or dfs(r, c - 1, k + 1))\n        board[r][c] = saved                # restore\n        return found\n\n    for r in range(rows):\n        for c in range(cols):\n            if dfs(r, c, 0):\n                return True\n    return False" }
            ],
            lc: "word-search" }
        ]]
      ] },
      { h: "Constraint search: N-Queens, Sudoku, Word Break", blocks: [
        ["p", "Here the tree is pruned by rules. The faster you can test “is this choice still valid?”, the faster the search."],
        ["viz", "nQueens", "Queens go row by row; a red cell is attacked, a grey cell is a queen being removed on backtrack."],
        ["p", "<b>O(1) safety check:</b> every cell on one top-left→bottom-right diagonal has the same <code>i − j</code> (shift by N−1 to index 0..2N−2). Every cell on one anti-diagonal has the same <code>i + j</code>. Keep three boolean arrays: <code>cols[N]</code>, <code>diag[2N−1]</code>, <code>anti[2N−1]</code>."],
        ["probs", [
          { t: "N-Queens", d: "Hard", q: "Place N queens on an N×N board so none attacks another. Print every configuration.",
            ex: "N = 2, 3: no solution\nN = 4: exactly 2\n  (0,1) (1,3) (2,0) (3,2)\n  (0,2) (1,0) (2,3) (3,1)",
            ap: [
              { n: "Brute force", cx: "O(N·N!) time · O(N²) space",
                idea: "<b>V1:</b> one queen per row; for each candidate cell scan upward in three directions (column, up-left, up-right). Every safety check costs O(N).",
                code: "def solve_n_queens(n):\n    board = [['.'] * n for _ in range(n)]\n    out = []\n\n    def safe(i, j):\n        for r in range(i):                     # same column above\n            if board[r][j] == 'Q':\n                return False\n        r, c = i - 1, j - 1\n        while r >= 0 and c >= 0:               # up-left diagonal\n            if board[r][c] == 'Q':\n                return False\n            r -= 1\n            c -= 1\n        r, c = i - 1, j + 1\n        while r >= 0 and c < n:                # up-right diagonal\n            if board[r][c] == 'Q':\n                return False\n            r -= 1\n            c += 1\n        return True\n\n    def solve(i):\n        if i == n:\n            out.append([''.join(row) for row in board])\n            return\n        for j in range(n):\n            if safe(i, j):\n                board[i][j] = 'Q'\n                solve(i + 1)\n                board[i][j] = '.'\n\n    solve(0)\n    return out" },
              { n: "Optimal", cx: "O(N!) time · O(N²) space",
                idea: "<b>V2:</b> mark <code>cols[j]</code>, <code>diag[i−j+N−1]</code>, <code>anti[i+j]</code> when placing and unmark when removing, so <b>each check is O(1)</b>. A queen at (0,2) with N = 4 marks cols[2], anti[2], diag[1].",
                code: "def solve_n_queens(n):\n    board = [['.'] * n for _ in range(n)]\n    cols = [False] * n\n    diag = [False] * (2 * n - 1)       # index i - j + n - 1\n    anti = [False] * (2 * n - 1)       # index i + j\n    out = []\n\n    def solve(i):\n        if i == n:\n            out.append([''.join(row) for row in board])\n            return\n        for j in range(n):\n            if cols[j] or diag[i - j + n - 1] or anti[i + j]:\n                continue                       # attacked: skip\n            board[i][j] = 'Q'                  # place and mark\n            cols[j] = diag[i - j + n - 1] = anti[i + j] = True\n            solve(i + 1)\n            board[i][j] = '.'                  # remove and unmark\n            cols[j] = diag[i - j + n - 1] = anti[i + j] = False\n\n    solve(0)\n    return out" }
            ],
            edge: "In the N = 4 tree, (0,0) dead-ends and (0,3) fails; only (0,1) and (0,2) lead to solutions.",
            viz: "nQueens", lc: "n-queens" },
          { t: "Sudoku solver", d: "Hard", q: "Fill a 9×9 grid so every row, column and 3×3 box has 1..9. The solution is unique.",
            ex: "LeetCode 37; first row: 5 3 . . 7 . . . .\nBox corner of (4,8) = (4 − 4%3, 8 − 8%3) = (3,6)",
            ap: [
              { n: "Brute force", cx: "O(9^E · 27) time · O(E) space",
                idea: "Scan cells in row-major order and skip filled ones. For an empty cell try x = 1..9; if isValid (scan its row, column and 3×3 box), place it and recurse. <b>Return true the moment a recursion returns true</b>; otherwise reset the cell and try the next x. If nothing fits, return false so the caller backtracks. E = number of empty cells.",
                code: "def solve_sudoku(mat):\n    def is_valid(i, j, x):\n        for k in range(9):\n            if mat[i][k] == x or mat[k][j] == x:\n                return False\n        r0, c0 = i - i % 3, j - j % 3          # top-left of the 3x3 box\n        for r in range(r0, r0 + 3):\n            for c in range(c0, c0 + 3):\n                if mat[r][c] == x:\n                    return False\n        return True\n\n    def sudoku(i, j):\n        if j == 9:                             # wrap to the next row\n            i, j = i + 1, 0\n        if i == 9:\n            return True                        # every cell is filled\n        if mat[i][j] != '.':\n            return sudoku(i, j + 1)            # given cell: skip it\n        for x in '123456789':\n            if is_valid(i, j, x):\n                mat[i][j] = x\n                if sudoku(i, j + 1):\n                    return True\n                mat[i][j] = '.'                # undo, try the next digit\n        return False\n\n    sudoku(0, 0)" },
              { n: "Optimal", cx: "O(9^E) time · O(81) space",
                idea: "Same search, but keep a set of used digits per row, column and box (like N-Queens V2), so <b>each validity check is O(1)</b> instead of scanning 27 cells. Visit only the list of empty cells.",
                code: "def solve_sudoku(mat):\n    rows = [set() for _ in range(9)]\n    cols = [set() for _ in range(9)]\n    boxes = [set() for _ in range(9)]\n    empty = []\n    for i in range(9):\n        for j in range(9):\n            d = mat[i][j]\n            if d == '.':\n                empty.append((i, j))\n            else:\n                rows[i].add(d)\n                cols[j].add(d)\n                boxes[i // 3 * 3 + j // 3].add(d)\n\n    def fill(k):\n        if k == len(empty):\n            return True\n        i, j = empty[k]\n        b = i // 3 * 3 + j // 3\n        for d in '123456789':\n            if d in rows[i] or d in cols[j] or d in boxes[b]:\n                continue\n            mat[i][j] = d                      # choose\n            rows[i].add(d)\n            cols[j].add(d)\n            boxes[b].add(d)\n            if fill(k + 1):\n                return True\n            mat[i][j] = '.'                    # unchoose\n            rows[i].remove(d)\n            cols[j].remove(d)\n            boxes[b].remove(d)\n        return False\n\n    fill(0)" }
            ],
            edge: "Never overwrite given cells. When j reaches 9 wrap to the next row; when i reaches 9 the grid is solved.",
            lc: "sudoku-solver" },
          { t: "Word break (recursion tree)", d: "Medium", q: "Can string A be split into a sequence of dictionary words?",
            ex: "dict {i, like, mango, man, gone, ili}, A = ilikemango → true\n  i + like + mango works\n  ...man leaves 'go' → fails\n  ili leaves 'kemango' → dead end",
            ap: [
              { n: "Brute force", cx: "O(2^N) time · O(N) space",
                idea: "For every prefix that is a dictionary word, recurse on the rest; the empty string means success. <b>The same suffix is reached many times</b> (\"mango\" after both i+like and ili+ke…), so the tree is exponential.",
                code: "def word_break(s, words):\n    if s == '':\n        return True\n    for k in range(1, len(s) + 1):\n        if s[:k] in words and word_break(s[k:], words):\n            return True\n    return False" },
              { n: "Optimal", cx: "O(N³) time · O(N) space",
                idea: "The answer depends only on where the suffix starts, so <b>memoise on the start index</b>: N states, each trying N prefix lengths (slicing costs O(N)).",
                code: "from functools import lru_cache\n\ndef word_break(s, words):\n    @lru_cache(maxsize=None)\n    def can(i):                        # can s[i:] be split into words?\n        if i == len(s):\n            return True\n        for k in range(i + 1, len(s) + 1):\n            if s[i:k] in words and can(k):\n                return True\n        return False\n\n    return can(0)" }
            ],
            lc: "word-break" }
        ]]
      ] },
      { h: "Interview cheatsheet", blocks: [
        ["table", ["Problem", "Tree shape", "Time", "Space"], [
          ["sum / factorial", "a chain of N calls", "O(N)", "O(N)"],
          ["fast power", "a chain of log N calls", "O(log N)", "O(log N)"],
          ["fib (plain)", "binary tree of depth N", "O(2^N)", "O(N)"],
          ["Tower of Hanoi", "binary tree, 2^N − 1 moves", "O(2^N)", "O(N)"],
          ["valid parentheses", "binary tree of depth 2N, pruned", "O(4^N) (Catalan)", "O(N)"],
          ["subsets", "binary tree of depth N", "O(2^N · N)", "O(N)"],
          ["permutations", "N, N−1, … branches", "O(N! · N)", "O(N)"],
          ["N-Queens (O(1) check)", "≤ N choices per row", "O(N!)", "O(N²)"],
          ["Sudoku", "≤ 9 choices per empty cell", "O(9^empty)", "O(81)"]
        ]],
        ["list", [
          "Write the <b>assumption</b> first. Most wrong recursions come from not knowing what f returns.",
          "Every path must reach a base case; check negative and zero inputs.",
          "Space is the <b>depth</b>, not the number of nodes.",
          "Two identical recursive calls (pow V2, plain fib) are a red flag: compute once or memoise.",
          "Backtracking: whatever you change before recursing, undo after. Copy the path when you record an answer.",
          "Prune early: check validity before recursing, not after building the full candidate."
        ]],
        ["extra", "Appended to recursion1 is “find the two missing numbers with XOR”; it is covered in the Bit manipulation topic."]
      ] }
    ],
    lc: [
      ["Letter Combinations of a Phone Number", "letter-combinations-of-a-phone-number", "Medium"],
      ["Combinations", "combinations", "Medium"],
      ["Permutations", "permutations", "Medium"],
      ["Combination Sum", "combination-sum", "Medium"],
      ["N-Queens II", "n-queens-ii", "Hard"],
      ["Generate Parentheses", "generate-parentheses", "Medium"],
      ["Word Search", "word-search", "Medium"],
      ["Pow(x, n)", "powx-n", "Medium"],
      ["Subsets", "subsets", "Medium"],
      ["Subsets II", "subsets-ii", "Medium"],
      ["Permutations II", "permutations-ii", "Medium"],
      ["Combination Sum II", "combination-sum-ii", "Medium"],
      ["N-Queens", "n-queens", "Hard"],
      ["Sudoku Solver", "sudoku-solver", "Hard"],
      ["K-th Symbol in Grammar", "k-th-symbol-in-grammar", "Medium"],
      ["Fibonacci Number", "fibonacci-number", "Easy"],
      ["Palindrome Partitioning", "palindrome-partitioning", "Medium"],
      ["Word Break", "word-break", "Medium"]
    ],
    quiz: [
      { q: "What is the space complexity of plain recursive fib(N)?", o: ["O(1)", "O(N)", "O(2^N)", "O(N²)"], a: 1, why: "Only one root-to-leaf path is on the stack at a time, and the deepest path has N frames. Time is O(2^N), space is O(N)." },
      { q: "solve(N){ if N==0 return; solve(N−1); print(N); } prints what for N = 3?", o: ["3 2 1", "1 2 3", "3", "nothing"], a: 1, why: "The print runs after the recursive call returns, so the deepest frame (N = 1) prints first as frames pop." },
      { q: "Why is pow V2, which calls pow(a, N/2) twice, still O(N)?", o: ["Because of the odd case", "T(N) = 2T(N/2) + c solves to O(N)", "Because multiplication is O(N)", "It is actually O(log N)"], a: 1, why: "Two half-size calls double the work at each level, cancelling the halving. Compute the half once to get T(N) = T(N/2) + c = O(log N)." },
      { q: "How many moves does Tower of Hanoi need for 5 disks?", o: ["25", "31", "32", "10"], a: 1, why: "T(N) = 2T(N−1) + 1 gives 2^N − 1 = 31." },
      { q: "In generate-parentheses, when may you add ')'?", o: ["Whenever close &lt; N", "Only when close &lt; open", "Only when open == N", "Any time"], a: 1, why: "Adding ')' when close == open would make a prefix with more ')' than '(', which can never be fixed." },
      { q: "In N-Queens V2, which value is the same for every cell on one anti-diagonal?", o: ["i − j", "i + j", "i · j", "|i − j|"], a: 1, why: "Moving down-left increases i and decreases j by 1, so i + j stays constant. Diagonals use i − j (+N−1 to keep it non-negative)." },
      { q: "In the permutations code, what happens if you forget vis[i] = false after the recursive call?", o: ["Nothing changes", "Items stay marked, so later branches miss permutations", "It prints duplicates", "Infinite recursion"], a: 1, why: "Without the undo, an item used in one branch stays blocked for all later branches, so only the first permutation is completed." },
      { q: "Kth symbol: what does odd B mean relative to the symbol at B/2 in the previous row?", o: ["Same symbol", "The complement", "Always 0", "Always 1"], a: 1, why: "Each symbol s expands to (s, 1−s). Even positions copy the parent, odd positions are its complement." }
    ]
  };

  /* ═══════════════════════════ TOPIC: HASHING ═══════════════════════════ */
  T["hashing"] = {
    name: "Hashing", icon: "#️⃣", color: "#0f9d74", minutes: 60,
    notes: "Hashing1.pdf, Hashing2.pdf, hashing3.pdf",
    summary: "A hash map stores only the keys that exist and finds any of them in O(1) on average, which turns many O(N²) searches into one pass.",
    sections: [
      { h: "Why hashing", blocks: [
        ["analogy", "A hotel with rooms 1..1000 can keep a boolean array “is room i booked?”. If room numbers go up to 10^9, that array is impossible. Instead keep a guest book with only the rooms that are actually booked, indexed so you can jump straight to any room number. That guest book is a hash map."],
        ["p", "A <b>HashMap</b> stores key → value pairs. Keys are unique; values can be anything (numbers, lists, even other maps). A <b>HashSet</b> stores keys only. Every operation is <b>O(1) on average</b> and the structure uses O(N) space. Keys have <b>no order</b>."],
        ["table", ["Operation", "HashMap", "HashSet"], [
          ["insert", "O(1)", "O(1)"], ["search", "O(1)", "O(1)"], ["delete", "O(1)", "O(1)"], ["update", "O(1)", "—"], ["size", "O(1)", "O(1)"]
        ]],
        ["table", ["Language", "Map", "Set"], [
          ["Java", "HashMap", "HashSet"], ["C++", "unordered_map", "unordered_set"], ["Python", "dict", "set"], ["JavaScript", "Map", "Set"], ["C#", "Dictionary", "HashSet"]
        ]],
        ["list", [
          "<code>Map&lt;String, Long&gt;</code>: country → population (India 146, China 145, …)",
          "<code>Map&lt;String, Integer&gt;</code>: country → number of states",
          "<code>Map&lt;String, List&lt;String&gt;&gt;</code>: country → state names",
          "<code>Map&lt;String, Map&lt;String, Integer&gt;&gt;</code>: country → (state → population)"
        ]]
      ] },
      { h: "Counting with a frequency map", blocks: [
        ["p", "Build the counts once (O(N)), then answer each question with a lookup. If you need an order (the “first” of something), walk the <b>array</b>, not the map."],
        ["probs", [
          { t: "Frequency of queried elements", d: "Easy", q: "N ≤ 10^6 elements and Q ≤ 10^5 queries. For each query print how often it appears.",
            ex: "arr = [2,6,3,8,2,8,2,3,8,10,6]\nqueries 2, 8, 3, 5 → 3, 3, 2, 0",
            ap: [
              { n: "Brute force", cx: "O(Q·N) time · O(1) space",
                idea: "Scan the whole array for every query. With N = 10^6 and Q = 10^5 that is <b>about 10^11 steps</b>, far too slow.",
                code: "def answer(arr, queries):\n    out = []\n    for q in queries:\n        cnt = 0\n        for x in arr:\n            if x == q:\n                cnt += 1\n        out.append(cnt)\n    return out" },
              { n: "Optimal", cx: "O(N + Q) time · O(N) space",
                idea: "Build a frequency map once, then <b>each query is one O(1) lookup</b>. Missing keys give 0.",
                code: "def answer(arr, queries):\n    freq = {}\n    for x in arr:\n        freq[x] = freq.get(x, 0) + 1\n    return [freq.get(q, 0) for q in queries]" }
            ] },
          { t: "First non-repeating element", d: "Easy", q: "Return the first element that appears exactly once, or −1.",
            ex: "[1,2,3,1,2,5] → 3\n[4,3,3,2,5,6,4,5] → 2\n[2,6,8,4,7,2,9] → 6",
            ap: [
              { n: "Brute force", cx: "O(N²) time · O(1) space",
                idea: "For each element, scan the whole array to see whether it appears again. <b>Every element costs a full scan.</b>",
                code: "def first_unique(arr):\n    for i, x in enumerate(arr):\n        repeated = False\n        for j, y in enumerate(arr):\n            if i != j and x == y:\n                repeated = True\n                break\n        if not repeated:\n            return x\n    return -1" },
              { n: "Optimal", cx: "O(N) time · O(N) space",
                idea: "Count frequencies, then walk the <b>array</b> from the left and return the first element with count 1. Walking the map would not work: <b>a hash map has no order</b>.",
                code: "from collections import Counter\n\ndef first_unique(arr):\n    freq = Counter(arr)\n    for x in arr:              # the array keeps the order\n        if freq[x] == 1:\n            return x\n    return -1" }
            ],
            lc: "first-unique-character-in-a-string" },
          { t: "Count distinct elements", d: "Easy", q: "How many different values are in the array?",
            ex: "[3,5,6,5,4] → 4\n[3,3,3] → 1\n[1,1,1,2,2] → 2",
            ap: [
              { n: "Brute force", cx: "O(N²) time · O(1) space",
                idea: "Count an element only if it did not appear earlier in the array. <b>Each check rescans the prefix.</b>",
                code: "def count_distinct(arr):\n    cnt = 0\n    for i in range(len(arr)):\n        if arr[i] not in arr[:i]:      # first time we see it\n            cnt += 1\n    return cnt" },
              { n: "Better", cx: "O(N log N) time · O(1) space",
                idea: "<b>Sort</b> so equal values sit together, then count the places where the value changes.",
                code: "def count_distinct(arr):\n    if not arr:\n        return 0\n    arr.sort()\n    cnt = 1\n    for i in range(1, len(arr)):\n        if arr[i] != arr[i - 1]:\n            cnt += 1\n    return cnt" },
              { n: "Optimal", cx: "O(N) time · O(N) space",
                idea: "Insert everything into a HashSet; duplicates are ignored. Return its <b>size</b>.",
                code: "def count_distinct(arr):\n    return len(set(arr))" }
            ] }
        ]]
      ] },
      { h: "Pairs: look up the complement", blocks: [
        ["p", "Rewrite <code>arr[i] + arr[j] = K</code> as “<b>does K − arr[i] exist?</b>”. A search becomes a lookup."],
        ["p", "<b>Build the structure as you go:</b> check first, then insert. Every lookup only sees earlier indices, so an element cannot pair with itself and each pair is counted once. A set answers “present?”; a frequency map also handles duplicates."],
        ["viz", "twoSumHash", "Check for target − x, then remember x. The current element is never in the map when it is looked up."],
        ["probs", [
          { t: "Pair with sum K", d: "Easy", q: "Is there a pair i ≠ j with arr[i] + arr[j] = K?",
            ex: "[8,9,1,-2,4,5,11,-6,4]: K = 6 → yes, K = 22 → no, K = 8 → yes (4 + 4)\n[3,5,1,2,1,2], K = 7 → true\nK = 10 on [9,-2,4,5,11,-6,4] → false (at 5 the set is {9,-2,4})",
            ap: [
              { n: "Brute force", cx: "O(N²) time · O(1) space",
                idea: "<b>Idea 1:</b> try every pair i &lt; j.",
                code: "def has_pair(arr, k):\n    n = len(arr)\n    for i in range(n):\n        for j in range(i + 1, n):\n            if arr[i] + arr[j] == k:\n                return True\n    return False" },
              { n: "Better", cx: "O(N log N) time · O(1) space",
                idea: "<b>Sort, then two pointers</b> from both ends: if the sum is too small move the left pointer right, if too big move the right pointer left.",
                code: "def has_pair(arr, k):\n    arr.sort()\n    l, r = 0, len(arr) - 1\n    while l < r:\n        s = arr[l] + arr[r]\n        if s == k:\n            return True\n        if s < k:\n            l += 1\n        else:\n            r -= 1\n    return False" },
              { n: "Optimal", cx: "O(N) time · O(N) space",
                idea: "<b>Idea 2</b> (put everything in a set first, then look up K − x) is flawed: K = 10 with a single 5 wrongly says yes, and a set cannot tell whether 4 appears twice for K = 8. <b>Idea 3</b> (a frequency map needing count ≥ 2 when K − x = x) works but is fiddly. <b>Idea 4:</b> scan once; if K − x is in the set of <i>earlier</i> elements return true, otherwise add x. <b>Self-pairing is impossible because x is added after its lookup.</b>",
                code: "def has_pair(arr, k):\n    seen = set()\n    for x in arr:\n        if k - x in seen:          # check first...\n            return True\n        seen.add(x)                # ...then insert\n    return False" }
            ],
            edge: "N &lt; 2 → false. Negative numbers are fine.",
            viz: "twoSumHash", lc: "two-sum" },
          { t: "Count pairs with sum K", d: "Medium", q: "Count index pairs i &lt; j with arr[i] + arr[j] = K.",
            ex: "[3,5,1,2,1,2], K = 3 → 4\n[2,5,2,5,8,5,2,8], K = 10 → 9\n  running count 0,0,0,1,3,5,6,9; final map {2:3, 5:3, 8:2}",
            ap: [
              { n: "Brute force", cx: "O(N²) time · O(1) space",
                idea: "Check every pair i &lt; j and count the ones that sum to K.",
                code: "def count_pairs(arr, k):\n    n = len(arr)\n    cnt = 0\n    for i in range(n):\n        for j in range(i + 1, n):\n            if arr[i] + arr[j] == k:\n                cnt += 1\n    return cnt" },
              { n: "Optimal", cx: "O(N) time · O(N) space",
                idea: "For each x, <b>add freq[K − x]</b> (how many earlier partners it has), then increment freq[x]. The K − x = x case works because x is inserted after the lookup.",
                code: "def count_pairs(arr, k):\n    freq = {}\n    cnt = 0\n    for x in arr:\n        cnt += freq.get(k - x, 0)      # earlier partners of x\n        freq[x] = freq.get(x, 0) + 1\n    return cnt" }
            ],
            edge: "The count can reach ~N²/2: use a long." }
        ]]
      ] },
      { h: "Prefix sums + hashing", blocks: [
        ["analogy", "Your bank balance goes 100 → 120 → 150 → 110 → 100. Because it came back to 100, the transactions in between must have added up to 0. A <b>repeated prefix sum</b> means a <b>zero-sum subarray</b>."],
        ["p", "sum(i..j) = P[j] − P[i−1]. It is 0 exactly when P[j] = P[i−1], and it is K exactly when P[i−1] = P[j] − K. So keep the prefix sums seen so far in a hash set or map."],
        ["warn", "<b>Seed the structure with prefix sum 0</b> (set {0}, map {0: 1} for counting, or {0: −1} for lengths). It stands for the empty prefix before index 0. Without it, a subarray that starts at index 0 is missed: [−2,−1,3,5] has a zero-sum prefix, and [5, …] with K = 5 should be true. The notes forget this seed in the sum-K code; it is fixed below."],
        ["viz", "subarraySumK", "Counting version: freq starts as {0: 1}. At each step add how many earlier prefixes equal ps − k."],
        ["viz", "rhbs_zeroSumLongest", "Longest version: store only the FIRST index of each prefix sum, seeded 0 → −1. Never overwrite."],
        ["probs", [
          { t: "Does any subarray sum to 0?", d: "Medium", q: "Return true if some contiguous subarray has sum 0.",
            ex: "[2,2,1,-3,4,3,1,-2,-3,2]\nprefix [2,4,5,2,6,9,10,8,5,7] → 2 repeats → true\n[-2,-1,3,5] → prefix hits 0 → true (needs the seed)\n[2,0,1] → true (a single 0)",
            ap: [
              { n: "Brute force", cx: "O(N²) time · O(1) space",
                idea: "Fix every start and extend a running sum to every end (the triple loop is O(N³)).",
                code: "def has_zero_sum(arr):\n    n = len(arr)\n    for i in range(n):\n        s = 0\n        for j in range(i, n):\n            s += arr[j]\n            if s == 0:\n                return True\n    return False" },
              { n: "Optimal", cx: "O(N) time · O(N) space",
                idea: "Track prefix sums in a set seeded with 0. <b>If a prefix sum repeats, the part in between sums to 0.</b>",
                code: "def has_zero_sum(arr):\n    seen = {0}                 # the empty prefix\n    s = 0\n    for x in arr:\n        s += x\n        if s in seen:\n            return True\n        seen.add(s)\n    return False" }
            ] },
          { t: "Does a subarray with sum K exist?", d: "Medium", q: "N ≤ 10^6. Return true if some subarray sums to K (values may be negative).",
            ex: "[2,3,9,-4,1,5,6,2,5] with K = 11, 10, 15 → true\n  prefix [2,5,14,10,11,16,22,24,29]; at 29, 29 − 15 = 14 is seen → indices 3..8\n[5,10,20,100,105], K = 110 → false",
            ap: [
              { n: "Brute force", cx: "O(N²) time · O(1) space",
                idea: "Running sum from every start index. Too slow for N = 10^6.",
                code: "def has_sum_k(arr, k):\n    n = len(arr)\n    for i in range(n):\n        s = 0\n        for j in range(i, n):\n            s += arr[j]\n            if s == k:\n                return True\n    return False" },
              { n: "Optimal", cx: "O(N) time · O(N) space",
                idea: "At each prefix sum s ask: <b>has s − K been seen as an earlier prefix?</b> Seed the set with 0 so a match starting at index 0 counts (the notes miss this seed).",
                code: "def has_sum_k(arr, k):\n    seen = {0}                 # seed 0 (missing in the notes)\n    s = 0\n    for x in arr:\n        s += x\n        if s - k in seen:\n            return True\n        seen.add(s)\n    return False" }
            ],
            edge: "Sliding windows do not work with negative numbers; this does. Use 64-bit sums." },
          { t: "Count subarrays with sum K", d: "Medium", q: "Return how many subarrays sum to K (homework in the notes).",
            ex: "[1,1,1], K = 2 → 2\n[1,2,3], K = 3 → 2",
            ap: [
              { n: "Brute force", cx: "O(N²) time · O(1) space",
                idea: "Running sum from every start; count each end where it equals K.",
                code: "def count_sum_k(arr, k):\n    n = len(arr)\n    cnt = 0\n    for i in range(n):\n        s = 0\n        for j in range(i, n):\n            s += arr[j]\n            if s == k:\n                cnt += 1\n    return cnt" },
              { n: "Optimal", cx: "O(N) time · O(N) space",
                idea: "Same idea with a <b>frequency map of prefix sums seeded {0: 1}</b>. At each step add freq[s − K] (every earlier prefix that equals s − K ends a valid subarray here), then increment freq[s].",
                code: "def count_sum_k(arr, k):\n    freq = {0: 1}\n    s = 0\n    cnt = 0\n    for x in arr:\n        s += x\n        cnt += freq.get(s - k, 0)\n        freq[s] = freq.get(s, 0) + 1\n    return cnt" }
            ],
            viz: "subarraySumK", lc: "subarray-sum-equals-k" },
          { t: "Longest subarray with sum 0", d: "Medium", q: "Return the length of the longest zero-sum subarray.",
            ex: "[2,3,-1,-2,4,5,-6,9,-10,15]\nprefix [2,5,4,2,6,11,5,14,4,19]\nanswer 6: indices 3..8 = [-2,4,5,-6,9,-10]\nbest evolves −1 → 3 → 5 → 6",
            ap: [
              { n: "Brute force", cx: "O(N²) time · O(1) space",
                idea: "Running sum from every start; whenever it is 0, update the best length.",
                code: "def longest_zero_sum(arr):\n    n = len(arr)\n    ans = 0\n    for i in range(n):\n        s = 0\n        for j in range(i, n):\n            s += arr[j]\n            if s == 0:\n                ans = max(ans, j - i + 1)\n    return ans" },
              { n: "Optimal", cx: "O(N) time · O(N) space",
                idea: "Equal prefix sums at j &lt; i mean (j..i] sums to 0 with length i − j. To maximise the length, keep only the <b>first occurrence</b> of each prefix sum, seeded 0 → −1.",
                code: "def longest_zero_sum(arr):\n    first = {0: -1}            # empty prefix ends before index 0\n    s = 0\n    ans = 0\n    for i, x in enumerate(arr):\n        s += x\n        if s in first:\n            ans = max(ans, i - first[s])\n        else:\n            first[s] = i       # never overwrite\n    return ans" }
            ],
            edge: "Whole array sums to 0 → length N (the seed handles it). A single 0 is length 1. Overwriting the first index gives shorter, wrong answers. The notes return −1 when none exists; many judges want 0.",
            viz: "rhbs_zeroSumLongest" }
        ]],
        ["tip", "Binary array version: replace each 0 by −1 and the longest subarray with equal 0s and 1s becomes the longest zero-sum subarray (LC 525, Contiguous Array)."]
      ] },
      { h: "Sliding window + frequency map", blocks: [
        ["p", "When a window slides, one element enters and one leaves. A frequency map updates in O(1) per step; its <b>size</b> is the number of distinct values."],
        ["viz", "rhbs_windowDistinct", "Enter: +1. Leave: −1, and delete the key when its count hits 0."],
        ["probs", [
          { t: "Distinct count in every window of size K", d: "Medium", q: "For each of the N − K + 1 windows, return the number of distinct values.",
            ex: "[1,2,1,3,4,2,3], K = 4 → [3,4,4,3]",
            ap: [
              { n: "Brute force", cx: "O(N·K) time · O(K) space",
                idea: "Build a fresh set for every window. <b>Each window repeats K − 1 elements of the previous one.</b>",
                code: "def distinct_windows(arr, k):\n    return [len(set(arr[i:i + k])) for i in range(len(arr) - k + 1)]" },
              { n: "Optimal", cx: "O(N) time · O(K) space",
                idea: "A HashSet alone fails: removing the outgoing 1 deletes it even though another 1 is still inside. Use a <b>HashMap of counts</b>: add arr[i], decrement arr[i−K], <b>delete the key when its count reaches 0</b>, record the map size.",
                code: "from collections import Counter\n\ndef distinct_windows(arr, k):\n    freq = Counter(arr[:k])            # first window\n    out = [len(freq)]\n    for i in range(k, len(arr)):\n        freq[arr[i]] += 1              # entering\n        freq[arr[i - k]] -= 1          # leaving\n        if freq[arr[i - k]] == 0:\n            del freq[arr[i - k]]       # keep len(freq) = distinct count\n        out.append(len(freq))\n    return out" }
            ],
            edge: "K = N gives one window. K > N is invalid.",
            viz: "rhbs_windowDistinct" }
        ]]
      ] },
      { h: "How a hash map works inside", blocks: [
        ["p", "<b>Direct Address Table (DAT):</b> presence[x] = 1. For [2,4,11,15,6,8,14,9] the queries 4, 10, 17, 14 give T, F, F, T in O(1) each after O(N + max) setup. It breaks down because:"],
        ["list", [
          "<b>Waste:</b> [250, 3, 400] needs ~401 cells for 3 values.",
          "<b>Infeasible size:</b> a value of 10^9 needs a 10^9-cell array.",
          "<b>Negatives</b> need an offset: [12, 3, −5, 10] stores v at index v + 5 (18 cells)."
        ]],
        ["p", "<b>Hashing:</b> a hash function maps a key to a bucket index. With 17 buckets and <code>key % 17</code>, [10, 20, 30, 27] go to buckets 10, 3, 13, 10. 27 and 10 share bucket 10: a <b>collision</b>."],
        ["p", "<b>Chaining</b> resolves collisions: each bucket is a linked list of <code>Node{key, val, next}</code>. Frequencies of [2,4,5,7,10,2,5,20,5,1] with % 5: bucket 0 = 5→3, 10→1, 20→1; bucket 1 = 1→1; bucket 2 = 2→2, 7→1; bucket 3 empty; bucket 4 = 4→1."],
        ["math", [
          ["load factor λ", "nodes / buckets = 7 / 5", "1.4"],
          ["after inserting 35, 6, 3, 8", "11 / 5", "2.2 > 2.0"],
          ["rehash: double to 10 buckets, reinsert with % 10", "11 / 10", "1.1"]
        ], "Each operation scans one chain: O(λ). Keeping λ bounded by rehashing keeps it O(1). A rehash is O(n), but doubling makes it amortised O(1) per insert."],
        ["viz", "rhbs_hashChain", "The notes' example: frequencies with % 5, collisions append to chains, and inserting 8 pushes λ past 2.0 and triggers a rehash to 10 buckets."],
        ["code", "class HashMap:\n    def __init__(self, m=8):\n        self.m = m                                 # number of buckets\n        self.n = 0                                 # number of nodes\n        self.buckets = [[] for _ in range(m)]      # each bucket is a chain of [key, value]\n\n    def _chain(self, key):\n        return self.buckets[hash(key) % self.m]\n\n    def put(self, key, value):\n        chain = self._chain(key)\n        for node in chain:\n            if node[0] == key:\n                node[1] = value                    # key exists: update\n                return\n        chain.append([key, value])                 # new node in the chain\n        self.n += 1\n        if self.n / self.m > 2.0:                  # load factor too high\n            self._rehash()\n\n    def get(self, key, default=None):\n        for k, v in self._chain(key):              # scan one chain: O(load factor)\n            if k == key:\n                return v\n        return default\n\n    def remove(self, key):\n        chain = self._chain(key)\n        for i, node in enumerate(chain):\n            if node[0] == key:\n                chain.pop(i)\n                self.n -= 1\n                return\n\n    def _rehash(self):\n        old = self.buckets\n        self.m *= 2\n        self.buckets = [[] for _ in range(self.m)]\n        for chain in old:\n            for k, v in chain:\n                self.buckets[hash(k) % self.m].append([k, v])"],
        ["extra", "<b>Open addressing</b> is the other collision strategy: store everything in the array itself and, on a collision, probe for the next free slot (linear probing: b+1, b+2, …; quadratic: b+1², b+2², …). Java's HashMap uses chaining and turns long chains into balanced trees; Python's dict uses open addressing. A bad hash function (or adversarial keys) can put everything in one bucket, so the worst case is O(N) per operation."],
        ["probs", [
          { t: "Design a HashMap", d: "Easy", q: "Implement put, get and remove without built-in hash tables.",
            ex: "put(1,1), put(2,2), get(1) → 1, get(3) → −1, put(2,1), get(2) → 1, remove(2), get(2) → −1",
            ap: [
              { n: "Brute force", cx: "O(1) time per op · O(max key) space",
                idea: "<b>Direct address table:</b> one slot per possible key (LeetCode keys are 0..10^6). Fast, but it <b>wastes memory</b> and breaks for huge or negative keys.",
                code: "class MyHashMap:\n    def __init__(self):\n        self.vals = [-1] * (10 ** 6 + 1)\n\n    def put(self, key, value):\n        self.vals[key] = value\n\n    def get(self, key):\n        return self.vals[key]\n\n    def remove(self, key):\n        self.vals[key] = -1" },
              { n: "Optimal", cx: "O(1) average per op · O(N + M) space",
                idea: "Array of M buckets, each a list of [key, value]. <b>hash = key % M</b>; scan only that bucket. Rehash by doubling M when n / M passes a threshold so chains stay short.",
                code: "class MyHashMap:\n    def __init__(self):\n        self.m = 1009                      # number of buckets (a prime)\n        self.buckets = [[] for _ in range(self.m)]\n\n    def put(self, key, value):\n        bucket = self.buckets[key % self.m]\n        for pair in bucket:\n            if pair[0] == key:\n                pair[1] = value            # update\n                return\n        bucket.append([key, value])        # new node in the chain\n\n    def get(self, key):\n        for k, v in self.buckets[key % self.m]:\n            if k == key:\n                return v\n        return -1\n\n    def remove(self, key):\n        bucket = self.buckets[key % self.m]\n        for i, pair in enumerate(bucket):\n            if pair[0] == key:\n                bucket.pop(i)\n                return" }
            ],
            lc: "design-hashmap" }
        ]]
      ] },
      { h: "Patterns & pitfalls", blocks: [
        ["table", ["Question shape", "Store", "Lookup"], [
          ["how often does x occur?", "value → count", "count[x]"],
          ["first unique", "value → count", "walk the array, first count 1"],
          ["pair with sum K", "set of earlier values", "K − x"],
          ["count pairs with sum K", "value → count (earlier)", "count[K − x]"],
          ["zero-sum / sum-K subarray exists", "set of prefix sums, seeded {0}", "s − K"],
          ["count subarrays with sum K", "prefix sum → count, seeded {0:1}", "count[s − K]"],
          ["longest zero-sum / sum-K subarray", "prefix sum → first index, seeded {0:−1}", "i − first[s − K]"],
          ["distinct in each window", "value → count, delete at 0", "map size"]
        ]],
        ["list", [
          "Check before insert so an element never pairs with itself.",
          "Seed prefix-sum structures with 0.",
          "Maps are unordered: walk the array when order matters.",
          "Delete zero-count keys if you use size().",
          "Use 64-bit sums and counts.",
          "O(1) is an <i>average</i>; the worst case with many collisions is O(N)."
        ]]
      ] }
    ],
    lc: [
      ["Two Sum", "two-sum", "Easy"],
      ["Ransom Note", "ransom-note", "Easy"],
      ["Isomorphic Strings", "isomorphic-strings", "Easy"],
      ["Word Pattern", "word-pattern", "Easy"],
      ["Valid Anagram", "valid-anagram", "Easy"],
      ["Group Anagrams", "group-anagrams", "Medium"],
      ["Happy Number", "happy-number", "Easy"],
      ["Contains Duplicate II", "contains-duplicate-ii", "Easy"],
      ["Longest Consecutive Sequence", "longest-consecutive-sequence", "Medium"],
      ["Subarray Sum Equals K", "subarray-sum-equals-k", "Medium"],
      ["First Unique Character in a String", "first-unique-character-in-a-string", "Easy"],
      ["Contains Duplicate", "contains-duplicate", "Easy"],
      ["Contiguous Array", "contiguous-array", "Medium"],
      ["Continuous Subarray Sum", "continuous-subarray-sum", "Medium"],
      ["4Sum II", "4sum-ii", "Medium"],
      ["Design HashMap", "design-hashmap", "Easy"],
      ["Design HashSet", "design-hashset", "Easy"]
    ],
    quiz: [
      { q: "Why does “put every element in a set, then look up K − x” fail for pair sum?", o: ["Sets are slow", "x can match itself (K = 10 with one 5)", "Sets can't hold negatives", "It is O(N²)"], a: 1, why: "If K − x = x, the set finds x itself. Building the set as you go (check, then insert) fixes it." },
      { q: "In the prefix-sum + set approach for “subarray with sum K exists”, what must the set start with?", o: ["Nothing", "0", "K", "arr[0]"], a: 1, why: "0 is the empty prefix. Without it, a subarray starting at index 0 (prefix sum exactly K) is missed." },
      { q: "For the longest zero-sum subarray, which index do you store for each prefix sum?", o: ["The latest", "The first", "Both", "The middle"], a: 1, why: "The length is i − j; keeping the earliest j maximises it. Overwriting gives shorter answers." },
      { q: "Distinct elements in every window: why is a HashSet not enough?", o: ["It can't count", "Removing the outgoing value deletes it even if a copy is still in the window", "It is unordered", "It uses too much memory"], a: 1, why: "You need counts so a value is removed only when its last copy leaves." },
      { q: "A table has 5 buckets and 11 nodes. What is the load factor?", o: ["0.45", "2.2", "11", "5"], a: 1, why: "λ = nodes / buckets = 11 / 5 = 2.2, above the notes' 2.0 threshold, so it rehashes to 10 buckets (λ = 1.1)." },
      { q: "Why walk the array, not the map, to find the first non-repeating element?", o: ["The map is slower", "The map has no order", "The array has fewer elements", "It doesn't matter"], a: 1, why: "Hash maps do not keep insertion order (Java HashMap, C++ unordered_map), so “first” must come from the array." },
      { q: "With key % 17, which pair collides among 10, 20, 30, 27?", o: ["10 and 20", "10 and 27", "20 and 30", "None"], a: 1, why: "10 % 17 = 10 and 27 % 17 = 10." }
    ]
  };

  /* ═══════════════════════════ TOPIC: BIT MANIPULATION ═══════════════════════════ */
  T["bits"] = {
    name: "Bit manipulation", icon: "🔢", color: "#d9480f", minutes: 70,
    notes: "bitbasics.pdf, BitOne.pdf, BitTwo.pdf (+ XOR problem from recursion1/2)",
    summary: "Numbers are rows of bits; a handful of operators (& | ^ ~ << >>) and the XOR cancellation trick solve many problems in O(1) extra space.",
    sections: [
      { h: "Binary numbers", blocks: [
        ["analogy", "A row of light switches, each worth double the one to its right (1, 2, 4, 8, …). The number is the total value of the switches that are on."],
        ["p", "Positional value: 342 = 3·10² + 4·10 + 2. In base 2, 110 = 6, 1011 = 11, 1101 = 13, 1011010 = 90."],
        ["p", "<b>Decimal → binary:</b> divide by 2 repeatedly and read the remainders from bottom to top: 20 → 10100, 45 → 101101. <b>Binary addition:</b> sum = d1 + d2 + carry; write sum % 2, carry sum / 2. 11001 + 1001 = 100010, 110101 + 100110 = 1011011, 10110 + 111 = 11101."],
        ["probs", [
          { t: "Binary (stored as an int) → decimal", d: "Easy", q: "n holds binary digits as a decimal number, e.g. 1011. Return its value.",
            ex: "1011 → 11",
            ap: [
              { n: "Solution", cx: "O(digits) time · O(1) space",
                idea: "Peel digits with <b>% 10</b> and <b>// 10</b>, multiplying each by a running power of 2.",
                code: "def binary_to_decimal(n):\n    ans = 0\n    p = 1                      # 2^position\n    while n > 0:\n        ans += (n % 10) * p    # last decimal digit is the next bit\n        n //= 10\n        p *= 2\n    return ans" }
            ] },
          { t: "Decimal → binary (as an int)", d: "Easy", q: "Return n's binary digits as a decimal-looking int.",
            ex: "20 → 10100",
            ap: [
              { n: "Solution", cx: "O(log N) time · O(1) space",
                idea: "Same loop the other way: <b>ans += (n % 2) · p</b>, n //= 2, p *= 10.",
                code: "def decimal_to_binary(n):\n    ans = 0\n    p = 1                      # 10^position\n    while n > 0:\n        ans += (n % 2) * p     # next bit becomes the next decimal digit\n        n //= 2\n        p *= 10\n    return ans" }
            ],
            edge: "The result overflows an int once n is above about 1023 (10 binary digits ≈ 10^10)." },
          { t: "Add two binary numbers", d: "Easy", q: "Add two binary numbers given as ints (or strings) and return the binary sum.",
            ex: "10 + 1 → 11\n11001 + 1001 → 100010",
            ap: [
              { n: "Solution", cx: "O(digits) time · O(digits) space",
                idea: "Digit by digit from the right: s = d1 + d2 + carry, output s % 2, carry = s // 2. <b>Keep looping while either number or the carry is non-zero</b>, so a final carry is kept.",
                code: "def add_binary(a, b):\n    i = len(a) - 1\n    j = len(b) - 1\n    carry = 0\n    out = []\n    while i >= 0 or j >= 0 or carry:\n        s = carry\n        if i >= 0:\n            s += int(a[i])\n            i -= 1\n        if j >= 0:\n            s += int(b[j])\n            j -= 1\n        out.append(str(s % 2))\n        carry = s // 2\n    return ''.join(reversed(out))" }
            ],
            lc: "add-binary" }
        ]]
      ] },
      { h: "Negative numbers and ranges", blocks: [
        ["p", "Computers store negatives in <b>2's complement</b>: to negate, flip every bit and add 1. The most significant bit (MSB) has a <b>negative</b> weight: in 8 bits it is worth −2^7 = −128. MSB 0 means positive, MSB 1 means negative."],
        ["math", [
          ["11011000 (8-bit)", "−128 + 64 + 16 + 8", "−40"],
          ["−3", "3 = 00000011 → flip 11111100 → +1", "11111101"],
          ["10010100", "−128 + 16 + 4", "−108"]
        ]],
        ["table", ["Type", "Range", "About"], [
          ["int (32-bit)", "[−2^31, 2^31 − 1]", "±2.1 × 10^9"],
          ["long (64-bit)", "[−2^63, 2^63 − 1]", "±9 × 10^18"]
        ]],
        ["tip", "The maximum 0111…1 is a geometric series: 2^0 + … + 2^30 = 2^31 − 1. Read the constraints to choose int or long: sums of 10^5 values up to 10^9 need a long."]
      ] },
      { h: "Operators, shifts and masks", blocks: [
        ["table", ["a", "b", "a & b", "a | b", "a ^ b"], [["0", "0", "0", "0", "0"], ["0", "1", "0", "1", "1"], ["1", "0", "0", "1", "1"], ["1", "1", "1", "1", "0"]]],
        ["p", "XOR memory aid: <b>same → 0, different → 1</b>. Examples: 5 & 6 = 4, 20 & 45 = 4, 20 | 45 = 61, 20 ^ 45 = 57."],
        ["list", [
          "<b>Even/odd:</b> N & 1 is 0 for even, 1 for odd (11 = 1011 odd, 10 = 1010 even).",
          "<b>Identities:</b> A & 0 = 0, A & A = A, A | 0 = A, A | A = A, <b>A ^ 0 = A, A ^ A = 0</b>.",
          "&, |, ^ are commutative and associative, so order does not matter: a^b^a^d^b = d and 1^3^5^3^2^1^5 = 2.",
          "<b>Left shift</b> a &lt;&lt; n = a·2^n (zeros enter on the right). It can overflow: in 8 bits 10 &lt;&lt; 4 = 160 but 10 &lt;&lt; 5 loses a 1 bit and gives 64. 1 &lt;&lt; n = 2^n.",
          "<b>Right shift</b> a &gt;&gt; n = ⌊a / 2^n⌋, never overflows: 10 &gt;&gt; 1 = 5, &gt;&gt; 2 = 2, &gt;&gt; 3 = 1, &gt;&gt; 4 = 0."
        ]],
        ["table", ["Goal", "Expression", "Example (i = 2)"], [
          ["check bit i", "(N &amp; (1 &lt;&lt; i)) != 0 or (N &gt;&gt; i) &amp; 1", "101001 → 0"],
          ["set bit i", "N | (1 &lt;&lt; i)", "101001 | 000100 = 101101"],
          ["toggle bit i", "N ^ (1 &lt;&lt; i)", "101101 → 101001"],
          ["unset bit i", "N &amp; ~(1 &lt;&lt; i)", "101101 → 101001"],
          ["clear lowest set bit", "N &amp; (N − 1)", "1100 → 1000"],
          ["lowest set bit", "N &amp; −N", "1100 → 0100"]
        ]],
        ["viz", "rhbs_bitOps", "One mask, four operations. The last frame shows a left shift overflowing 8 bits and a right shift halving."],
        ["probs", [
          { t: "Is the ith bit set?", d: "Easy", q: "Return whether bit i of N is 1.",
            ex: "N = 10101101, i = 3 → N >> 3 = 00010101, & 1 = 1 → set",
            ap: [
              { n: "Solution", cx: "O(1) time · O(1) space",
                idea: "<b>Method A:</b> AND with a mask that has only bit i: (N & (1 &lt;&lt; i)) != 0. <b>Method B:</b> shift bit i down to position 0: ((N &gt;&gt; i) & 1) == 1.",
                code: "def is_set_a(n, i):\n    return (n & (1 << i)) != 0\n\ndef is_set_b(n, i):\n    return (n >> i) & 1 == 1" }
            ],
            edge: "1 &lt;&lt; 31 is the sign bit in an int; use 1L &lt;&lt; i for 64-bit values." },
          { t: "Unset the ith bit", d: "Easy", q: "Clear bit i of N (leave it 0 if already 0).",
            ex: "N = 45 (101101), i = 2 → 41 (101001)",
            ap: [
              { n: "Solution", cx: "O(1) time · O(1) space",
                idea: "Notes: if the bit is set, toggle it with XOR. One expression: <b>N & ~(1 &lt;&lt; i)</b>, because ~mask has every bit set except i.",
                code: "def unset_bit(n, i):\n    mask = 1 << i\n    if n & mask:               # notes' version: toggle only if set\n        n ^= mask\n    return n\n\ndef unset_bit_direct(n, i):\n    return n & ~(1 << i)" }
            ] },
          { t: "Count set bits", d: "Easy", q: "Count the 1 bits of N.",
            ex: "12 = 1100 → 2",
            ap: [
              { n: "Brute force", cx: "O(32) time · O(1) space",
                idea: "<b>Method 1:</b> test every bit i = 0..31.",
                code: "def count_bits(n):\n    count = 0\n    for i in range(32):\n        if (n >> i) & 1:\n            count += 1\n    return count" },
              { n: "Better", cx: "O(log N) time · O(1) space",
                idea: "<b>Method 2:</b> look at the last bit and shift right until n is 0, so only the bits up to the highest 1 are visited.",
                code: "def count_bits(n):\n    count = 0\n    while n > 0:\n        count += n & 1\n        n >>= 1\n    return count" },
              { n: "Optimal", cx: "O(set bits) time · O(1) space",
                idea: "<b>N & (N − 1)</b> clears the lowest set bit, so loop until N is 0: <b>one iteration per set bit</b>.",
                code: "def count_bits(n):\n    count = 0\n    while n:\n        n &= n - 1             # drop the lowest 1 bit\n        count += 1\n    return count" }
            ],
            edge: "For negative N an arithmetic shift (>>) never reaches 0; use the unsigned shift >>> in Java/JS, or mask to 32 bits.",
            viz: "countBits", lc: "number-of-1-bits" },
          { t: "Build a number from A zeros, B ones, C zeros", d: "Easy", q: "Return the value of the bit string with A zeros, then B ones, then C zeros (MSB to LSB).",
            ex: "A = 4, B = 3, C = 2 → 000011100 = 28",
            ap: [
              { n: "Brute force", cx: "O(B) time · O(1) space",
                idea: "Leading zeros add nothing. Only bits C .. C+B−1 are 1: set them one by one.",
                code: "def build(a, b, c):\n    ans = 0\n    for i in range(c, c + b):\n        ans |= 1 << i\n    return ans" },
              { n: "Optimal", cx: "O(1) time · O(1) space",
                idea: "(1 &lt;&lt; B) − 1 is B ones; shift them up past the C trailing zeros: <b>((1 &lt;&lt; B) − 1) &lt;&lt; C</b>.",
                code: "def build(a, b, c):\n    return ((1 << b) - 1) << c" }
            ],
            edge: "B + C can be up to 40: use long." }
        ]],
        ["viz", "countBits", "n & (n − 1) removes one set bit per iteration."]
      ] },
      { h: "XOR tricks: single numbers", blocks: [
        ["p", "Because A ^ A = 0, A ^ 0 = A and XOR can be reordered, <b>XOR-ing a whole array cancels every pair</b>. When pairs are not the rule (triples), count bits per column instead."],
        ["viz", "xorSingle", "The accumulator ends at the only unpaired value."],
        ["viz", "rhbs_singleII", "Each repeated value adds k to every column it has a 1 in. Column count % k is the single number's bit."],
        ["probs", [
          { t: "Single element I (pairs + one unique)", d: "Easy", q: "Every value appears twice except one. Return it.",
            ex: "[4,5,5,1,6,4,6] → 1\nper-bit view on [2,3,5,6,3,6,2]: column counts bit2 = 3, bit1 = 4, bit0 = 3 → parities 1 0 1 → 5",
            ap: [
              { n: "Brute force", cx: "O(N) time · O(N) space",
                idea: "Hash map of counts, then return the value with count 1. Fast, but <b>uses O(N) extra memory</b>.",
                code: "from collections import Counter\n\ndef single(arr):\n    for x, c in Counter(arr).items():\n        if c == 1:\n            return x" },
              { n: "Better", cx: "O(32·N) time · O(1) space",
                idea: "Per-bit counts: every pair adds 2 to a column, so each column count is 2x (unique has 0) or 2x + 1 (unique has 1). <b>Take each column count % 2.</b>",
                code: "def single(arr):\n    ans = 0\n    for i in range(32):\n        cnt = sum((x >> i) & 1 for x in arr)\n        if cnt % 2 == 1:\n            ans |= 1 << i\n    if ans >= 1 << 31:         # bit 31 set: negative in 32 bits\n        ans -= 1 << 32\n    return ans" },
              { n: "Optimal", cx: "O(N) time · O(1) space",
                idea: "<b>XOR everything</b>: A ^ A = 0 and XOR can be reordered, so every pair cancels and the unique value is left.",
                code: "def single(arr):\n    ans = 0\n    for x in arr:\n        ans ^= x\n    return ans" }
            ],
            edge: "N = 1. Negative numbers: the per-bit method must include bit 31.",
            viz: "xorSingle", lc: "single-number" },
          { t: "Single element II (triples + one unique)", d: "Medium", q: "N ≤ 10^6. Every value appears three times except one. Return it.",
            ex: "[4,5,5,4,11,6,6,4,5,6] → 11\n[5,7,5,4,7,11,11,9,11,7,5,4,4]: counts bit3 = 4, bit2 = 9, bit1 = 6, bit0 = 10\n  mod 3 → 1 0 0 1 = 9",
            ap: [
              { n: "Brute force", cx: "O(N²) time · O(1) space",
                idea: "<b>Idea 1:</b> count each element by scanning the array.",
                code: "def single(arr):\n    for x in arr:\n        if arr.count(x) == 1:\n            return x" },
              { n: "Better", cx: "O(N) time · O(N) space",
                idea: "<b>Idea 2:</b> hash map of counts. (<b>Idea 3:</b> sort and jump 3 at a time is O(N log N) with O(1) space.)",
                code: "from collections import Counter\n\ndef single(arr):\n    for x, c in Counter(arr).items():\n        if c == 1:\n            return x" },
              { n: "Optimal", cx: "O(32·N) time · O(1) space",
                idea: "<b>Idea 4:</b> XOR fails (x^x^x = x). Instead, for each bit count how many numbers have it. The triples add 3 to a column, so <b>count % 3</b> is the unique number's bit.",
                code: "def single(arr):\n    ans = 0\n    for i in range(32):\n        cnt = 0\n        for x in arr:\n            cnt += (x >> i) & 1\n        if cnt % 3 == 1:\n            ans |= 1 << i\n    if ans >= 1 << 31:         # Python ints are unbounded: fix the sign\n        ans -= 1 << 32\n    return ans" }
            ],
            edge: "Variations: one value appears twice, others 3 times → test count % 3 == 2. Others 5 times → count % 5 == 1. In general count % k equals the unique value's occurrences.",
            viz: "rhbs_singleII", lc: "single-number-ii" },
          { t: "Two unique elements (others in pairs)", d: "Medium", q: "Exactly two values appear once and all others twice. Return the two, in O(N) time and O(1) space.",
            ex: "[4,5,4,1,6,6,5,2] → 1, 2\n[10,8,8,9,12,9,6,11,10,6,12,17] → 11, 17\n  val = 11 ^ 17 = 26 = 11010; split on bit 1\n  set {10,6,11,10,6} → 11;  unset {8,8,9,12,9,12,17} → 17",
            ap: [
              { n: "Brute force", cx: "O(N) time · O(N) space",
                idea: "Hash map of counts; return the two values with count 1. It <b>breaks the O(1) space requirement</b>.",
                code: "from collections import Counter\n\ndef two_unique(arr):\n    return [x for x, c in Counter(arr).items() if c == 1]" },
              { n: "Optimal", cx: "O(N) time · O(1) space",
                idea: "XOR all gives <b>val = x ^ y</b>, never 0 because x ≠ y. Any set bit of val is a place where x and y differ. <b>Split all numbers by that bit</b>: each pair stays together, x and y go to different groups. XOR each group.",
                code: "def two_unique(arr):\n    val = 0\n    for x in arr:\n        val ^= x               # = x ^ y\n    low = val & -val           # lowest set bit: x and y differ here\n    a = 0\n    b = 0\n    for x in arr:\n        if x & low:\n            a ^= x\n        else:\n            b ^= x\n    return a, b" }
            ],
            edge: "Output order is arbitrary. The lowest set bit is val & −val.",
            viz: "rhbs_twoUnique", lc: "single-number-iii" },
          { t: "Two missing numbers in 1..N+2", d: "Medium", q: "An array of N distinct numbers from 1..N+2 is missing two of them. Find both.",
            ex: "[3,7,1,5,2], N = 5 → 4 and 6   (4 ^ 6 = 0010)",
            ap: [
              { n: "Brute force", cx: "O(N) time · O(N) space",
                idea: "Put the array in a set and check every value 1..N+2. Simple, but O(N) extra memory.",
                code: "def two_missing(arr):\n    present = set(arr)\n    return [v for v in range(1, len(arr) + 3) if v not in present]" },
              { n: "Better", cx: "O(N) time · O(1) space",
                idea: "The missing pair has known sum S and sum of squares Q, so solve x + y = S, x² + y² = Q. Correct, but <b>the sums overflow a 32-bit int</b> for N up to 10^5 (fine in Python).",
                code: "from math import isqrt\n\ndef two_missing(arr):\n    n = len(arr) + 2\n    s = n * (n + 1) // 2 - sum(arr)                         # x + y\n    q = n * (n + 1) * (2 * n + 1) // 6 - sum(v * v for v in arr)   # x^2 + y^2\n    d = isqrt(2 * q - s * s)                                # y - x\n    return (s - d) // 2, (s + d) // 2" },
              { n: "Optimal", cx: "O(N) time · O(1) space",
                idea: "XOR all elements <b>and</b> all of 1..N+2: everything present cancels and val = x ^ y. Then split <b>both</b> the array and 1..N+2 by one set bit of val, exactly as in Two unique elements. No overflow possible.",
                code: "def two_missing(arr):\n    n = len(arr) + 2\n    val = 0\n    for v in arr:\n        val ^= v\n    for v in range(1, n + 1):\n        val ^= v               # val = x ^ y\n    low = val & -val\n    a = 0\n    b = 0\n    for v in arr:\n        if v & low:\n            a ^= v\n        else:\n            b ^= v\n    for v in range(1, n + 1):\n        if v & low:\n            a ^= v\n        else:\n            b ^= v\n    return min(a, b), max(a, b)" }
            ],
            lc: "missing-number" }
        ]]
      ] },
      { h: "Greedy over bits and contribution", blocks: [
        ["p", "Two more ideas: <b>higher bits dominate</b> (1000000 = 64 beats 0111111 = 63), so decide bits from the MSB down; and <b>handle each bit separately</b>, then add bit-count × 2^i."],
        ["probs", [
          { t: "Maximum AND pair", d: "Medium", co: "Google (follow-up)", q: "Given N positive integers, maximise arr[i] & arr[j] over i ≠ j.",
            ex: "[27,18,20] → 18 (27&18 = 18, 27&20 = 16, 18&20 = 16)\n[26,13,23,28,27,7,25]:\n  bit4: 5 have it → set; drop 13, 7\n  bit3: 26,28,27,25 → set; drop 23\n  bit2: only 28 → skip\n  bit1: 26, 27 → set; drop 28, 25\n  bit0: only 27 → skip\n  ans = 11010 = 26",
            ap: [
              { n: "Brute force", cx: "O(N²) time · O(1) space",
                idea: "Try all pairs. Shortcuts like “max & second max” or “min & max” both fail (crossed out in the notes).",
                code: "def max_and(arr):\n    best = 0\n    n = len(arr)\n    for i in range(n):\n        for j in range(i + 1, n):\n            best = max(best, arr[i] & arr[j])\n    return best" },
              { n: "Optimal", cx: "O(31·N) time · O(1) space",
                idea: "Higher bits outweigh all lower bits together, so go from bit 30 down. If <b>at least 2</b> still-eligible numbers have the bit, put it in the answer and <b>zero out every number without it</b>. Otherwise skip the bit. Follow-up (count pairs reaching the max): with x non-zero survivors, the count is x(x−1)/2.",
                code: "def max_and(arr):\n    arr = arr[:]                       # work on a copy\n    ans = 0\n    for i in range(30, -1, -1):\n        cnt = sum(1 for x in arr if (x >> i) & 1)\n        if cnt >= 2:\n            ans |= 1 << i\n            arr = [x if (x >> i) & 1 else 0 for x in arr]\n    return ans" }
            ],
            edge: "Mutates the array (copy it if needed). If the answer is 0, every pair reaches it, so the pair count is C(N, 2)." },
          { t: "Sum of bitwise OR of all subarrays", d: "Hard", q: "Return the sum of OR over every subarray.",
            ex: "[3,7,9,5] → 104",
            ap: [
              { n: "Brute force", cx: "O(N²) time · O(1) space",
                idea: "Fix a start, extend the end and keep a running OR.",
                code: "def or_sum(a):\n    n = len(a)\n    ans = 0\n    for i in range(n):\n        cur = 0\n        for j in range(i, n):\n            cur |= a[j]\n            ans += cur\n    return ans" },
              { n: "Optimal", cx: "O(32·N) time · O(1) space",
                idea: "<b>Contribution technique</b>, one bit at a time. A subarray's OR lacks bit i only if every element in it lacks bit i. A run of L consecutive elements without bit i gives L(L+1)/2 such subarrays (run of 3 → 6, run of 2 → 3). So subarrays with bit i = N(N+1)/2 − unset; add that × 2^i.",
                code: "def or_sum(a):\n    n = len(a)\n    total = n * (n + 1) // 2           # number of subarrays\n    ans = 0\n    for i in range(32):\n        unset = 0\n        run = 0                        # current run of numbers without bit i\n        for v in a:\n            if (v >> i) & 1:\n                unset += run * (run + 1) // 2\n                run = 0\n            else:\n                run += 1\n        unset += run * (run + 1) // 2\n        ans += (total - unset) << i\n    return ans" }
            ] },
          { t: "Minimum XOR pair", d: "Medium", q: "Find the pair with the smallest XOR.",
            ex: "x = 1011011, y = 1011101, z = 1100000 (x &lt; y &lt; z) → x ^ y = 6 is the smallest",
            ap: [
              { n: "Brute force", cx: "O(N²) time · O(1) space",
                idea: "XOR every pair and keep the smallest.",
                code: "def min_xor(a):\n    best = float('inf')\n    n = len(a)\n    for i in range(n):\n        for j in range(i + 1, n):\n            best = min(best, a[i] ^ a[j])\n    return best" },
              { n: "Optimal", cx: "O(N log N) time · O(1) space",
                idea: "Numbers next to each other in <b>sorted order</b> share the longest high-bit prefix, so the minimum-XOR pair is always adjacent after sorting. Sort, then check neighbours.",
                code: "def min_xor(a):\n    a = sorted(a)\n    return min(a[i] ^ a[i + 1] for i in range(len(a) - 1))" }
            ] }
        ]]
      ] },
      { h: "Also in these notes", blocks: [
        ["p", "These pages sit inside the bit-manipulation notes but are counting / array problems."],
        ["probs", [
          { t: "Element p with exactly p greater elements", d: "Medium", q: "Is there an element p such that exactly p elements are greater than it? Return 1 or −1.",
            ex: "[7,3,2,4,9,-2,15,11] → sorted [-2,2,3,4,7,9,11,15] → 4 has 4 greater → 1\n[-2,2,2,3,4,4,7,7,9,11,11,15] → -1",
            ap: [
              { n: "Brute force", cx: "O(N²) time · O(1) space",
                idea: "For each element count how many are greater.",
                code: "def has_p(arr):\n    for p in arr:\n        greater = sum(1 for x in arr if x > p)\n        if greater == p:\n            return 1\n    return -1" },
              { n: "Optimal", cx: "O(N log N) time · O(1) space",
                idea: "Sort. With distinct values the number greater than arr[i] is N−1−i. With duplicates, scan from the right and update <b>count = N−1−i only where arr[i] ≠ arr[i+1]</b> (the last index of each equal group). If the maximum is 0, it has 0 greater elements → true.",
                code: "def has_p(arr):\n    arr.sort()\n    n = len(arr)\n    if arr[-1] == 0:\n        return 1\n    cnt = 0\n    for i in range(n - 2, -1, -1):\n        if arr[i] != arr[i + 1]:\n            cnt = n - 1 - i            # elements strictly greater than arr[i]\n        if cnt == arr[i]:\n            return 1\n    return -1" }
            ] },
          { t: "Next greater permutation", d: "Medium", q: "Rearrange the array into the next lexicographically larger permutation (wrap to the smallest if none).",
            ex: "[9,8,3,7,1,2] → 9 8 3 7 2 1\n9 8 3 7 2 1 → 9 8 7 1 2 3\n[5,4,3,2,1] → 1 2 3 4 5",
            ap: [
              { n: "Brute force", cx: "O(N!·N) time · O(N!) space",
                idea: "Generate all permutations in sorted order and return the one after the current array. <b>Hopeless beyond N ≈ 10.</b>",
                code: "from itertools import permutations\n\ndef next_perm(a):\n    perms = sorted(set(permutations(a)))\n    k = perms.index(tuple(a))\n    return list(perms[(k + 1) % len(perms)])" },
              { n: "Optimal", cx: "O(N) time · O(1) space",
                idea: "Read from the right: values climb like a mountain. (1) The <b>pivot</b> is the rightmost i with a[i] &lt; a[i+1]. (2) Swap it with the rightmost a[j] > a[i]. (3) Reverse the suffix after i. No pivot → reverse everything.",
                code: "def next_perm(a):\n    n = len(a)\n    i = n - 2\n    while i >= 0 and a[i] >= a[i + 1]:\n        i -= 1                         # find the pivot\n    if i >= 0:\n        j = n - 1\n        while a[j] <= a[i]:\n            j -= 1                     # rightmost value bigger than the pivot\n        a[i], a[j] = a[j], a[i]\n    a[i + 1:] = reversed(a[i + 1:])    # smallest order for the suffix\n    return a" }
            ],
            lc: "next-permutation" },
          { t: "Number of digit one in 1..N", d: "Hard", q: "Count how many times the digit 1 appears when writing 1, 2, …, N.",
            ex: "N = 109 → 31\nN = 9315: units 931+1 = 932, tens 930+6 = 936,\n  hundreds 900+100 = 1000, thousands 0+1000 = 1000 → 3868",
            ap: [
              { n: "Brute force", cx: "O(N log N) time · O(1) space",
                idea: "Write out every number and count its ones.",
                code: "def count_ones(n):\n    return sum(str(k).count('1') for k in range(1, n + 1))" },
              { n: "Optimal", cx: "O(log N) time · O(1) space",
                idea: "Per place p = 1, 10, 100, …: full cycles give <b>(N // (10p)) · p</b>. Then for the digit d at place p: d = 0 adds nothing, <b>d = 1 adds (N % p) + 1</b>, d > 1 adds p.",
                code: "def count_ones(n):\n    ans = 0\n    p = 1\n    while p <= n:\n        hi = n // (p * 10)             # full cycles above this place\n        d = (n // p) % 10              # digit at this place\n        lo = n % p                     # number formed by the lower digits\n        ans += hi * p\n        if d == 1:\n            ans += lo + 1\n        elif d > 1:\n            ans += p\n        p *= 10\n    return ans" }
            ],
            edge: "Use 64-bit values for p · 10.", lc: "number-of-digit-one" }
        ]]
      ] },
      { h: "Interview cheatsheet", blocks: [
        ["table", ["Clue in the problem", "Trick"], [
          ["every element twice except one", "XOR everything"],
          ["every element k times except one", "per-bit count % k"],
          ["two elements once, rest twice", "XOR → split on a set bit of x ^ y"],
          ["two missing numbers, overflow risk", "XOR with 1..N+2, then split"],
          ["is N a power of two?", "N > 0 and N & (N − 1) == 0"],
          ["count 1 bits", "N &= N − 1 until 0"],
          ["maximise AND of a pair", "greedy from the MSB, keep ≥ 2 candidates"],
          ["sum of OR/AND/XOR over subarrays or pairs", "contribution per bit × 2^i"],
          ["minimum XOR pair", "sort, compare neighbours"],
          ["all subsets of N ≤ 20 items", "masks 0 .. 2^N − 1"]
        ]],
        ["list", [
          "Operator precedence: in C/Java <code>x & 1 == 0</code> parses as <code>x & (1 == 0)</code>. Always add brackets.",
          "<code>1 &lt;&lt; 31</code> overflows to a negative int; use <code>1L</code> for 64-bit masks.",
          "Right-shifting a negative number with &gt;&gt; keeps the sign (arithmetic shift); use &gt;&gt;&gt; in Java/JS for logical shift.",
          "Python ints are unbounded: emulate 32-bit with <code>& 0xFFFFFFFF</code> and fix the sign at the end."
        ]]
      ] }
    ],
    lc: [
      ["Add Binary", "add-binary", "Easy"],
      ["Reverse Bits", "reverse-bits", "Easy"],
      ["Number of 1 Bits", "number-of-1-bits", "Easy"],
      ["Single Number", "single-number", "Easy"],
      ["Single Number II", "single-number-ii", "Medium"],
      ["Bitwise AND of Numbers Range", "bitwise-and-of-numbers-range", "Medium"],
      ["Single Number III", "single-number-iii", "Medium"],
      ["Missing Number", "missing-number", "Easy"],
      ["Counting Bits", "counting-bits", "Easy"],
      ["Power of Two", "power-of-two", "Easy"],
      ["Hamming Distance", "hamming-distance", "Easy"],
      ["Sum of Two Integers", "sum-of-two-integers", "Medium"],
      ["Set Mismatch", "set-mismatch", "Easy"],
      ["Next Permutation", "next-permutation", "Medium"],
      ["Number of Digit One", "number-of-digit-one", "Hard"]
    ],
    quiz: [
      { q: "What is the 8-bit 2's-complement value of 11011000?", o: ["216", "−40", "−88", "−24"], a: 1, why: "The MSB weighs −128: −128 + 64 + 16 + 8 = −40." },
      { q: "Which expression clears bit i of N?", o: ["N | (1 &lt;&lt; i)", "N ^ (1 &lt;&lt; i)", "N & ~(1 &lt;&lt; i)", "N &gt;&gt; i"], a: 2, why: "~(1 &lt;&lt; i) has every bit set except i, so AND keeps everything else and forces bit i to 0. XOR would set it if it was 0." },
      { q: "Why does XOR-ing everything fail when the others appear three times?", o: ["XOR is not associative", "x ^ x ^ x = x, so triples don't cancel", "It overflows", "It works fine"], a: 1, why: "An odd number of copies leaves the value behind. Count bits per column and take % 3 instead." },
      { q: "In Two unique elements, why is val = x ^ y never 0?", o: ["Because the array is sorted", "Because x ≠ y", "Because N is even", "It can be 0"], a: 1, why: "x ^ y = 0 only when x = y. Its set bits mark where x and y differ, which is what lets you split them." },
      { q: "Max AND pair: when do you put bit i in the answer?", o: ["If any number has it", "If at least 2 remaining numbers have it", "If the maximum has it", "If more than half have it"], a: 1, why: "A pair needs both numbers to have the bit. Higher bits are worth more than all lower bits together, so take it whenever two candidates have it." },
      { q: "What does n & (n − 1) do?", o: ["Sets the lowest 0 bit", "Clears the lowest set bit", "Clears the highest set bit", "Doubles n"], a: 1, why: "n − 1 flips the lowest 1 and every 0 below it, so the AND removes exactly that lowest 1." },
      { q: "In 8 bits, 10 &lt;&lt; 5 gives 64 rather than 320. Why?", o: ["Shifts round down", "A 1 bit falls off the left end (overflow)", "Shifts are signed", "It is a typo"], a: 1, why: "10 = 00001010; shifting 5 left pushes one of its 1s past bit 7, leaving 01000000 = 64. Right shifts cannot overflow." }
    ]
  };

  /* ═══════════════════════════ TOPIC: STRINGS ═══════════════════════════ */
  T["strings"] = {
    name: "Strings", icon: "🔤", color: "#c2255c", minutes: 60,
    notes: "stringsbasics.pdf, kmp.pdf",
    summary: "A string is an array of characters; most problems use ASCII arithmetic, two pointers, expand-around-centre or the KMP prefix function.",
    sections: [
      { h: "Characters and ASCII", blocks: [
        ["p", "A <b>string</b> is an array of characters (\"Hello world!\"). A <b>character</b> is one symbol: a letter, a digit, or a symbol such as #, @, !, space or a full stop. Every character has a numeric code."],
        ["table", ["Characters", "ASCII codes"], [["'A' .. 'Z'", "65 .. 90"], ["'a' .. 'z'", "97 .. 122"], ["'0' .. '9'", "48 .. 57"]]],
        ["list", [
          "(char)65 → 'A';  (char)('a' + 1) → 'b';  int x = 'a' → 97. '10' is not a character.",
          "Lowercase = uppercase + 32, and 32 is a single bit, so <code>ch ^ 32</code> flips case.",
          "Digit value: <code>ch − '0'</code>. Letter index: <code>ch − 'a'</code> (use it for 26-slot count arrays)."
        ]],
        ["p", "A <b>substring</b> is contiguous; a <b>subsequence</b> keeps order but may skip characters. A string of length N has <b>N(N+1)/2</b> non-empty substrings: \"bxcd\" has 10 (b, x, c, d, bx, xc, cd, bxc, xcd, bxcd)."],
        ["probs", [
          { t: "Switch case", d: "Easy", q: "Flip the case of every letter (the string contains only letters).",
            ex: "Hello → hELLO\naDgbHJe → AdGBhjE",
            ap: [
              { n: "Solution", cx: "O(N) time · O(N) space",
                idea: "If 65 ≤ ch ≤ 90 (uppercase) add 32, otherwise subtract 32. Or flip bit 5, which is worth 32: <b>ch ^ 32</b>.",
                code: "def switch_case(s):\n    out = []\n    for ch in s:\n        c = ord(ch)\n        if 65 <= c <= 90:              # 'A'..'Z'\n            out.append(chr(c + 32))\n        else:\n            out.append(chr(c - 32))\n    return ''.join(out)" }
            ],
            edge: "With digits or symbols present, check both ranges and leave others unchanged.",
            lc: "to-lower-case" }
        ]]
      ] },
      { h: "Palindromes", blocks: [
        ["p", "A palindrome reads the same both ways: madam, nayan, malayalam, tenet, maddam. \"dalda\" is not: its second pair (a, d) does not match. Compare the outer pair, then move inward."],
        ["viz", "palindrome", "Two pointers walk inward; the first mismatch ends it."],
        ["p", "<b>Longest palindromic substring:</b> every palindrome has a centre. Odd-length ones centre on a character, even-length ones on the gap between two characters. That gives 2N − 1 centres; grow outward from each while the ends match."],
        ["viz", "rhbs_expandCentre", "The notes' table for \"feacabacabgf\": the odd length around each centre is f1 e1 a1 c3 a1 b7 a1 c5 a1 b1 g1 f1."],
        ["probs", [
          { t: "Check palindrome", d: "Easy", q: "Is s a palindrome?",
            ex: "madam → true\ndalda → false",
            ap: [
              { n: "Brute force", cx: "O(N) time · O(N) space",
                idea: "Build the reversed string and compare. Correct, but it <b>copies the whole string</b>.",
                code: "def is_palindrome(s):\n    return s == s[::-1]" },
              { n: "Optimal", cx: "O(N) time · O(1) space",
                idea: "<b>Two pointers:</b> l = 0, r = N−1; while l &lt; r, return false on s[l] ≠ s[r], else move both inward.",
                code: "def is_palindrome(s):\n    l, r = 0, len(s) - 1\n    while l < r:\n        if s[l] != s[r]:\n            return False\n        l += 1\n        r -= 1\n    return True" }
            ],
            viz: "palindrome", lc: "valid-palindrome" },
          { t: "Longest palindromic substring", d: "Medium", q: "N ≤ 10^3. Return the length of the longest palindromic substring.",
            ex: "anamadamm → 5 (madam)\nfeacabacabgf → 7 (acabaca)\nadaebcdfdcbetggte → 9 (ebcdfdcbe)",
            ap: [
              { n: "Brute force", cx: "O(N³) time · O(1) space",
                idea: "Check every substring [si, ei] with the two-pointer palindrome test: N² substrings × O(N) check.",
                code: "def longest_pal(s):\n    n = len(s)\n    best = 0\n    for i in range(n):\n        for j in range(i, n):\n            sub = s[i:j + 1]\n            if sub == sub[::-1]:\n                best = max(best, j - i + 1)\n    return best" },
              { n: "Better", cx: "O(N²) time · O(N²) space",
                idea: "<b>DP:</b> s[i..j] is a palindrome when s[i] == s[j] and s[i+1..j−1] is one. Fill the table by increasing length so the inner answer is ready.",
                code: "def longest_pal(s):\n    n = len(s)\n    if n == 0:\n        return 0\n    pal = [[False] * n for _ in range(n)]\n    best = 1\n    for length in range(1, n + 1):\n        for i in range(n - length + 1):\n            j = i + length - 1\n            if s[i] == s[j] and (length <= 2 or pal[i + 1][j - 1]):\n                pal[i][j] = True\n                best = max(best, length)\n    return best" },
              { n: "Optimal", cx: "O(N²) time · O(1) space",
                idea: "<b>Expand around each centre</b>: odd from (i−1, i+1), even from (i, i+1). Stop when the ends differ; l and r are then one step outside, so the length is <b>r − l − 1</b>. Same time as DP with no table.",
                code: "def longest_pal(s):\n    n = len(s)\n\n    def expand(l, r):\n        while l >= 0 and r < n and s[l] == s[r]:\n            l -= 1\n            r += 1\n        return r - l - 1               # l, r stop one step outside\n\n    ans = 0\n    for i in range(n):\n        ans = max(ans, expand(i - 1, i + 1), expand(i, i + 1))\n    return ans" }
            ],
            edge: "N = 1 → 1. All characters equal → N. An even centre with s[i] ≠ s[i+1] returns 0. Worked check: stopping at l = 3, r = 9 gives 9 − 3 − 1 = 5; \"abacc\" centred at b stops at l = −1, r = 3 → 3.",
            viz: "rhbs_expandCentre", lc: "longest-palindromic-substring" }
        ]],
        ["extra", "Manacher's algorithm finds the longest palindrome in O(N) by reusing mirror information around the current rightmost palindrome. Interviews rarely require it; expand-around-centre is the expected answer."]
      ] },
      { h: "Strings are immutable", blocks: [
        ["p", "In Java, C#, JS, Python and Go a string object never changes. <code>str = \"Jitu\"; str = \"jitender\";</code> creates a new object at a new address (8K) and moves the reference from 4K to 8K. <b>The instance is immutable; the reference is mutable.</b>"],
        ["p", "<b>String constant pool:</b> <code>s1 = \"scaler\"; s2 = \"scaler\";</code> both point to one pooled object. Sharing is only safe because nobody can modify it. <code>new String(\"scaler\")</code> makes a separate heap object outside the pool."],
        ["table", ["Statement", "s1 →", "s2 →"], [
          ["s1 = \"Hello\"", "\"Hello\" (pool)", "—"],
          ["s2 = new String(\"World\")", "\"Hello\"", "\"World\" (heap 8K)"],
          ["s1 = s2", "\"World\" (heap 8K)", "\"World\" (heap 8K)"],
          ["s2 = \"Kite\"", "\"World\" (heap 8K)", "\"Kite\" (pool 15K)"]
        ]],
        ["warn", "<b>== compares addresses, not content.</b> With s1 = \"scaler\", s2 = new String(\"scaler\"), s3 = \"scaler\": s1 == s3 is true (same pooled object) but s1 == s2 is false. Use <code>.equals()</code>, which compares characters in O(N)."],
        ["warn", "<b>Concatenation in a loop is O(N²).</b> <code>str = str + 'c'</code> copies the whole string each time (\"Java\" + s, c, r, i, p, t makes a new object per step). Use a <b>StringBuilder</b> (Java), a list + ''.join (Python) or an array + join (JS): amortised O(1) per append."],
        ["code", "parts = []\nfor c in chars:\n    parts.append(c)            # amortised O(1), like StringBuilder.append\nresult = ''.join(parts)        # one O(N) copy at the end"]
      ] },
      { h: "Prefix problems: LCP and boring substring", blocks: [
        ["probs", [
          { t: "Longest common prefix", d: "Easy", q: "Given N words (max length M), return the longest string that is a prefix of all of them.",
            ex: "[axdc, axbc, axdb] → ax   (adding axab still gives ax)",
            ap: [
              { n: "Brute force", cx: "O(N·M) time · O(N·M) space",
                idea: "<b>Trie:</b> insert all words, then walk down from the root while there is a single child and no word ends there. Works, but <b>stores every character</b>.",
                code: "def lcp(words):\n    root = {}\n    for w in words:\n        node = root\n        for ch in w:\n            node = node.setdefault(ch, {})\n        node['$'] = {}                 # end-of-word marker\n    out = []\n    node = root\n    while len(node) == 1 and '$' not in node:\n        ch = next(iter(node))\n        out.append(ch)\n        node = node[ch]\n    return ''.join(out)" },
              { n: "Optimal", cx: "O(N·M) time · O(1) space",
                idea: "<b>Column scan:</b> compare column j across all words; stop at the first mismatch or at the end of the shortest word. Same O(N·M) time, but <b>O(1) space</b>, so it beats the trie.",
                code: "def lcp(words):\n    if not words:\n        return ''\n    first = words[0]\n    for j in range(len(first)):\n        c = first[j]\n        for w in words:\n            if j == len(w) or w[j] != c:\n                return first[:j]\n    return first" }
            ],
            edge: "An empty word → \"\". A single word → that word.",
            lc: "longest-common-prefix" },
          { t: "Boring substring", d: "Medium", q: "Can the characters be rearranged so that no two adjacent characters are consecutive letters (ab, ba, cd, yz, …)?",
            ex: "abc → false (all 6 orders have a boring pair)\nabcd → true (cadb, bdac)\naabccb → false\naabccdb → true (bbd + aacc)",
            ap: [
              { n: "Brute force", cx: "O(N!·N) time · O(N) space",
                idea: "<b>Idea 1:</b> try all permutations and check each for a consecutive pair.",
                code: "from itertools import permutations\n\ndef can_arrange(s):\n    for p in permutations(s):\n        if all(abs(ord(p[i]) - ord(p[i + 1])) != 1 for i in range(len(p) - 1)):\n            return True\n    return False" },
              { n: "Optimal", cx: "O(N) time · O(1) space",
                idea: "Consecutive letters always have <b>opposite ASCII parity</b> (a = 97 odd, b = 98 even). Split into an odd group (a, c, e, …) and an even group (b, d, f, …): letters inside a group differ by at least 2, so each group is safe in any order. Only the <b>single junction</b> between the groups can fail. Checking the extremes is enough: test (oddMin, evenMin), (oddMin, evenMax), (oddMax, evenMin), (oddMax, evenMax); if any pair is not consecutive, answer true.",
                code: "def can_arrange(s):\n    odd = [c for c in s if ord(c) % 2 == 1]\n    even = [c for c in s if ord(c) % 2 == 0]\n    if not odd or not even:\n        return True                    # one group: no junction at all\n    for o in (min(odd), max(odd)):\n        for e in (min(even), max(even)):\n            if abs(ord(o) - ord(e)) != 1:\n                return True            # put o and e at the junction\n    return False" }
            ],
            edge: "If all characters share a parity, the answer is true. odd aaacceggg / even bbdff: a–b ✗, g–f ✗, a–f ✓ → true. Slower junction checks from the notes: all odd × even pairs (≤ 13 × 13 unique) or a hash set per character." }
        ]]
      ] },
      { h: "KMP: the LPS array and pattern matching", blocks: [
        ["analogy", "You are reading a long text looking for a phrase. You have matched “abab” and the next letter is wrong. You do not go back to the start: you know the last “ab” you read is itself the start of the phrase, so you carry on from there. The LPS array records that “how much can I keep?” for every prefix of the pattern."],
        ["p", "A <b>prefix substring</b> starts at index 0, a <b>suffix substring</b> ends at N−1. For \"abab\": prefixes a, ab, aba, abab; suffixes b, ab, bab, abab. <b>LPS(s)</b> = length of the longest prefix that is also a suffix, <b>excluding the whole string</b>. LPS[i] is the LPS of s[0..i]."],
        ["table", ["String", "LPS", "LPS array"], [
          ["abcab", "2 (ab)", "[0,0,0,1,2]"],
          ["aaaaa", "4", "[0,1,2,3,4]"],
          ["aabaaba", "4 (aaba)", "[0,1,0,1,2,3,4]"],
          ["aabacaaba", "4", "[0,1,0,1,0,1,2,3,4]"],
          ["aabacd", "0", "[0,1,0,1,0,0]"]
        ]],
        ["steps", [
          ["LPS grows by at most 1", "If LPS[i] = x, dropping the last character from both the border prefix and suffix shows LPS[i−1] ≥ x − 1. So <b>LPS[i] ≤ LPS[i−1] + 1</b>."],
          ["Extend", "Let x = LPS[i−1]. If s[x] == s[i], then LPS[i] = x + 1. \"abayaba?\" (LPS ending 3): ? = y gives 4."],
          ["Fall back", "On a mismatch, the next candidate border is the border of the current border: <b>x = LPS[x−1]</b>. Repeat until s[x] == s[i] or x reaches 0. \"cacycacabcacycacy\": LPS[16] falls 7 → 3 (\"cac\"), then extends with y to 4."],
          ["Why O(N)", "x rises by at most 1 per index, so the total rise is ≤ N. Each fall-back lowers x by at least 1, so the total number of fall-backs is also ≤ N."]
        ]],
        ["viz", "kmpLPS", "Building LPS: extend on a match, fall back to lps[len−1] on a mismatch."],
        ["p", "<b>Matching trick:</b> build S = P + '#' + T and compute its LPS. Every position where LPS == M = |P| is the end of a match in T. The '#' must appear in neither string; it caps LPS at M. Without it, T = aaaa, P = aa gives LPS [0,1,2,3,4,5] and the matches are miscounted; with aa#aaaa it is [0,1,0,1,2,2,2] → 3 matches."],
        ["viz", "rhbs_kmpSearch", "Try the third preset to watch LPS run past M when the '#' is removed."],
        ["probs", [
          { t: "Compute the LPS array", d: "Medium", q: "Return LPS[i] for every prefix of s.",
            ex: "abcabdabcabeabcabdabcabc → [0,0,0,1,2,0,1,2,3,4,5,0,1,2,3,4,5,6,7,8,9,10,11,3]\n  at i = 23, x falls 11 → 5 → 2, s[2] = c matches → 3\nabadabae → [0,0,1,0,1,2,3,0]   (x: 3 → 1 → 0, no match)",
            ap: [
              { n: "Brute force", cx: "O(N³) time · O(N) space",
                idea: "For each i compare every proper prefix of s[0..i] with the suffix of the same length.",
                code: "def compute_lps(s):\n    n = len(s)\n    lps = [0] * n\n    for i in range(n):\n        for length in range(i, 0, -1):         # proper borders only\n            if s[:length] == s[i - length + 1:i + 1]:\n                lps[i] = length\n                break\n    return lps" },
              { n: "Optimal", cx: "O(N) time · O(N) space",
                idea: "<b>Extend or fall back</b>: start x = LPS[i−1]; while s[i] ≠ s[x], jump x = LPS[x−1] (if x is already 0, the answer is 0). Then LPS[i] = x + 1. Total fall-backs ≤ total rises ≤ N, so it is O(N) amortised.",
                code: "def compute_lps(s):\n    n = len(s)\n    lps = [0] * n\n    for i in range(1, n):\n        x = lps[i - 1]\n        while s[i] != s[x]:\n            if x == 0:\n                x = -1                 # sentinel: lps[i] becomes 0\n                break\n            x = lps[x - 1]             # fall back to a shorter border\n        lps[i] = x + 1\n    return lps" }
            ],
            edge: "N = 1 → [0]. The notes use x = −1 as a sentinel so LPS[i] = x + 1 = 0.",
            viz: "kmpLPS", lc: "longest-happy-prefix" },
          { t: "Count occurrences of a pattern (KMP)", d: "Medium", q: "Count where pattern P (length M) occurs in text T (length N), overlaps allowed.",
            ex: "T = dabceabc, P = abc → S = abc#dabceabc\n  LPS = [0,0,0,0,0,1,2,3,0,1,2,3] → 2 matches\nT = aaaa, P = aa → 3",
            ap: [
              { n: "Brute force", cx: "O(N·M) time · O(1) space",
                idea: "Try every start index in T and compare M characters.",
                code: "def count_matches(t, p):\n    n, m = len(t), len(p)\n    cnt = 0\n    for i in range(n - m + 1):\n        if t[i:i + m] == p:\n            cnt += 1\n    return cnt" },
              { n: "Optimal", cx: "O(N + M) time · O(N + M) space",
                idea: "Compute LPS of <b>P + '#' + T</b> and count positions where LPS == M. The '#' caps every LPS value at M. A match ending at position i starts at T index i − 2M.",
                code: "def count_matches(t, p):\n    s = p + '#' + t                    # '#' must appear in neither string\n    m = len(p)\n    lps = [0] * len(s)\n    cnt = 0\n    for i in range(1, len(s)):\n        x = lps[i - 1]\n        while s[i] != s[x]:\n            if x == 0:\n                x = -1\n                break\n            x = lps[x - 1]\n        lps[i] = x + 1\n        if lps[i] == m:\n            cnt += 1                   # a match of p ends at i\n    return cnt" }
            ],
            edge: "Pick a delimiter that cannot occur in either string. To save space, compute LPS of P only and scan T with the same extend/fall-back loop.",
            viz: "rhbs_kmpSearch", lc: "find-the-index-of-the-first-occurrence-in-a-string" }
        ]],
        ["tip", "The notes call this an online-assessment favourite. Other LPS uses: shortest palindrome (LPS of s + '#' + reverse(s)), repeated substring pattern (LPS > 0 and N % (N − LPS) == 0), and the longest happy prefix (the last LPS value)."]
      ] },
      { h: "Interview cheatsheet", blocks: [
        ["table", ["Problem shape", "Technique", "Cost"], [
          ["palindrome check", "two pointers", "O(N)"],
          ["longest palindromic substring", "expand around 2N − 1 centres", "O(N²)"],
          ["count / find a pattern", "KMP: LPS of P#T", "O(N + M)"],
          ["border, period, happy prefix", "last LPS value", "O(N)"],
          ["longest common prefix", "column scan", "O(N·M), O(1) space"],
          ["anagram / character counts", "int[26] count array", "O(N)"],
          ["rearrange with adjacency rules", "group by a property (parity), check the junction", "O(N)"],
          ["build a string in a loop", "StringBuilder / join", "O(N)"]
        ]],
        ["list", [
          "Never concatenate inside a loop in Java/Python; use a builder.",
          "Use <code>.equals()</code>, not ==, to compare string content in Java.",
          "Clarify the character set (lowercase only? Unicode?) before using a 26-slot array.",
          "Expand-around-centre: remember the even centres, and the length is r − l − 1.",
          "KMP: the delimiter must be a character that appears in neither string."
        ]]
      ] }
    ],
    lc: [
      ["Longest Common Prefix", "longest-common-prefix", "Easy"],
      ["Valid Palindrome", "valid-palindrome", "Easy"],
      ["Find the Index of the First Occurrence in a String", "find-the-index-of-the-first-occurrence-in-a-string", "Easy"],
      ["Reverse Words in a String", "reverse-words-in-a-string", "Medium"],
      ["Length of Last Word", "length-of-last-word", "Easy"],
      ["Is Subsequence", "is-subsequence", "Easy"],
      ["Longest Palindromic Substring", "longest-palindromic-substring", "Medium"],
      ["Zigzag Conversion", "zigzag-conversion", "Medium"],
      ["Roman to Integer", "roman-to-integer", "Easy"],
      ["Integer to Roman", "integer-to-roman", "Medium"],
      ["Text Justification", "text-justification", "Hard"],
      ["Palindromic Substrings", "palindromic-substrings", "Medium"],
      ["Valid Palindrome II", "valid-palindrome-ii", "Easy"],
      ["Repeated Substring Pattern", "repeated-substring-pattern", "Easy"],
      ["Longest Happy Prefix", "longest-happy-prefix", "Hard"],
      ["Shortest Palindrome", "shortest-palindrome", "Hard"],
      ["Reorganize String", "reorganize-string", "Medium"],
      ["To Lower Case", "to-lower-case", "Easy"]
    ],
    quiz: [
      { q: "How many non-empty substrings does a string of length N have?", o: ["N", "N(N+1)/2", "2^N", "N²"], a: 1, why: "Choose a start and an end with start ≤ end: N(N+1)/2. 2^N counts subsequences (including the empty one)." },
      { q: "Expand-around-centre stops with l and r one step outside the palindrome. Its length is…", o: ["r − l", "r − l + 1", "r − l − 1", "(r − l) / 2"], a: 2, why: "The palindrome is s[l+1 .. r−1], which has (r − 1) − (l + 1) + 1 = r − l − 1 characters." },
      { q: "Why does Java's s1 == s2 return false for s1 = \"scaler\" and s2 = new String(\"scaler\")?", o: ["Different content", "== compares references and new String makes a separate object", "Strings are mutable", "Case differs"], a: 1, why: "s1 points into the string pool, s2 to a separate heap object. Use .equals() for content." },
      { q: "What is LPS(\"aabaaba\")?", o: ["3", "4", "7", "1"], a: 1, why: "\"aaba\" is both a prefix and a suffix. The whole string is excluded by definition." },
      { q: "Why do we put '#' between P and T in KMP matching?", o: ["To speed it up", "So no LPS value can exceed |P|", "To mark the end of T", "It is optional"], a: 1, why: "A border can't cross a character that appears in neither string, so LPS ≤ M and LPS == M means exactly one full match." },
      { q: "Why is computing the LPS array O(N) despite the inner while loop?", o: ["The loop runs at most once", "Total fall-backs ≤ total rises ≤ N", "Strings are short", "It is O(N log N)"], a: 1, why: "x rises by at most 1 per index and each fall-back lowers it, so over the whole run the fall-backs are bounded by N." },
      { q: "Boring substring: why can't two letters from the same ASCII-parity group form a boring pair?", o: ["They are vowels", "They differ by at least 2", "They are equal", "They are sorted"], a: 1, why: "Same parity means an even difference: 0 or at least 2, never 1. Only the junction between groups needs checking." }
    ]
  };
})();

/* Blueprint — DSA: dynamic programming and greedy. Content from the user's notes (DP1–DP7, greedy.pdf, Questionset1.pdf) plus LeetCode practice. */
(function () {
  const { nums, clone, cap } = BP.AV;
  const A = BP.ALGOS;
  const F = (line, note, panels) => ({ line, note, panels: clone(panels) });
  const arr = (vals, o = {}) => ({ t: "array", vals, ...o });
  const vars = (v) => ({ t: "vars", vars: v });
  const chips = (label, items, vertical) => ({ t: "chips", label, items, vertical });
  const split2 = (s) => String(s).split("|").map((x) => x.trim());
  const need = (a, what) => { if (!a.length) throw new Error("Please enter some " + what + "."); return a; };

  /* House robber: take vs skip */
  A.dp_houseRobber = { title: "1-D DP: house robber (no two adjacent)", inputLabel: "array", input: "2 -9 3 1 2 -3 8",
    presets: [["Notes example", "2 -9 3 1 2 -3 8"], ["9 4 13 24", "9 4 13 24"], ["Quiz", "10 20 30 40"]],
    about: "Top row is the array, bottom row is dp[i] = the best sum you can get from a[0..i]. For each index the animation compares <b>skip</b> (dp[i-1]) with <b>take</b> (a[i] + dp[i-2]); the winning neighbour is highlighted green.",
    code: ["dp = [0] * n                  # dp[i] = best sum using a[0..i]", "for i in range(n):", "    skip = dp[i - 1] if i >= 1 else 0           # leave a[i]", "    take = a[i] + (dp[i - 2] if i >= 2 else 0)  # use a[i]; i-1 is banned", "    dp[i] = max(skip, take)", "return dp[n - 1]"],
    gen(s) { const a = need(cap(nums(s), 12), "numbers"), n = a.length, dp = Array(n).fill(null), fr = [];
      const g = (k) => (k < 0 ? 0 : dp[k]);
      fr.push(F(0, "dp[i] will hold the best sum using only a[0..i]. At each index we either skip a[i] or take it (and then a[i-1] cannot be used).", [arr(a, { label: "a" }), arr(dp, { label: "dp" })]));
      for (let i = 0; i < n; i++) { const skip = g(i - 1), take = a[i] + g(i - 2);
        const hc = {}; if (i - 1 >= 0) hc[i - 1] = "cmp"; if (i - 2 >= 0) hc[i - 2] = "cmp";
        fr.push(F(3, `i = ${i}: skip a[${i}] → keep dp[${i - 1}] = ${skip}. Take a[${i}] → ${a[i]} + dp[${i - 2}] (${g(i - 2)}) = ${take}.`, [arr(a, { label: "a", hl: { [i]: "act" } }), arr(dp, { label: "dp", hl: { ...hc, [i]: "act" } })]));
        dp[i] = Math.max(skip, take);
        const h = { [i]: "done" }; if (i - 1 >= 0) h[i - 1] = skip >= take ? "found" : "cmp"; if (i - 2 >= 0) h[i - 2] = take > skip ? "found" : "cmp";
        fr.push(F(4, `dp[${i}] = max(${skip}, ${take}) = <b>${dp[i]}</b>: ${take > skip ? `taking a[${i}] = ${a[i]} is better` : `skipping a[${i}] is at least as good`}.`, [arr(a, { label: "a", hl: { [i]: "act" } }), arr(dp, { label: "dp", hl: h })])); }
      const pick = {}; let i = n - 1; while (i >= 0) { if (dp[i] === g(i - 1)) i--; else { pick[i] = "found"; i -= 2; } }
      fr.push(F(5, `Best sum <b>${dp[n - 1]}</b> using ${Object.keys(pick).map((k) => a[k]).join(" + ") || "nothing"}. Only dp[i-1] and dp[i-2] are read, so two variables give O(1) space.`, [arr(a, { label: "a", hl: pick }), arr(dp, { label: "dp", hl: { [n - 1]: "found" } })])); return fr; } };

  /* Unique paths with obstacles */
  A.dp_gridPaths = { title: "Grid DP: unique paths (right / down), with blocked cells", inputLabel: "rows of 0/1 (1 = blocked) separated by |", input: "0000 | 0001 | 0100 | 0000 | 0010",
    presets: [["5×4, no blocks", "0000 | 0000 | 0000 | 0000 | 0000"], ["5×4 with blocks", "0000 | 0001 | 0100 | 0000 | 0010"], ["3×3", "000 | 000 | 000"]],
    about: "Each cell shows how many right/down paths reach it. Blocked cells (■) are 0; every other cell adds the cell above and the cell to its left, both highlighted while it is computed.",
    code: ["dp = [[0] * m for _ in range(n)]", "for i in range(n):", "    for j in range(m):", "        if g[i][j] == 1:", "            dp[i][j] = 0              # blocked: no path ends here", "        elif i == 0 and j == 0:", "            dp[i][j] = 1              # start cell", "        else:", "            top = dp[i - 1][j] if i > 0 else 0", "            left = dp[i][j - 1] if j > 0 else 0", "            dp[i][j] = top + left", "return dp[n - 1][m - 1]"],
    gen(s) { const g = cap(split2(s).filter(Boolean).map((r) => cap([...r.replace(/\s/g, "")].map((c) => (c === "1" ? 1 : 0)), 6, "columns")), 6, "rows"), n = g.length;
      if (!n || !g[0].length) throw new Error("Enter rows like 000 | 010 | 000."); const m = g[0].length; if (g.some((r) => r.length !== m)) throw new Error("All rows need the same length.");
      const dp = g.map((r) => r.map(() => null)), fr = [];
      const G2 = (hl) => { const h = { ...hl }; g.forEach((r, i) => r.forEach((b, j) => { if (b && !h[i + "," + j]) h[i + "," + j] = "bad"; })); return { t: "grid", label: "ways to reach each cell", rows: dp.map((r, i) => r.map((v, j) => (g[i][j] ? "■" : v))), hl: h }; };
      fr.push(F(0, "Each cell can only be entered from the top or from the left, so its count is the sum of those two.", [G2({})]));
      for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) {
        if (g[i][j]) { dp[i][j] = 0; fr.push(F(4, `(${i},${j}) is blocked, so no path can end here: 0 ways.`, [G2({ [i + "," + j]: "bad" })])); continue; }
        if (i === 0 && j === 0) { dp[0][0] = 1; fr.push(F(6, "Start cell (0,0): exactly 1 way to be here (you start on it).", [G2({ "0,0": "act" })])); continue; }
        const up = i > 0 ? dp[i - 1][j] : 0, left = j > 0 ? dp[i][j - 1] : 0; dp[i][j] = up + left; const h = { [i + "," + j]: "act" };
        if (i > 0 && !g[i - 1][j]) h[(i - 1) + "," + j] = "cmp"; if (j > 0 && !g[i][j - 1]) h[i + "," + (j - 1)] = "cmp";
        fr.push(F(10, `(${i},${j}) can be entered from the top (${up} ways) or from the left (${left} ways): ${up} + ${left} = <b>${dp[i][j]}</b>.`, [G2(h)])); }
      fr.push(F(11, `<b>${dp[n - 1][m - 1]}</b> paths reach the bottom-right cell. O(N·M) time. Each row only reads the row above, so one row of size M is enough (row[j] += row[j-1]).`, [G2({ [(n - 1) + "," + (m - 1)]: "found" })])); return fr; } };

  /* Edit distance with costs */
  A.dp_editDistance = { title: "2-D DP: edit distance (insert / delete / replace costs)", inputLabel: "s1 | s2 | Ci Cd Cr", input: "horse | ros | 1 1 1",
    presets: [["LeetCode (all costs 1)", "horse | ros | 1 1 1"], ["Notes: abcd → abc", "abcd | abc | 2 2 3"], ["Notes: abdxy → abcgx", "abdxy | abcgx | 2 2 3"]],
    about: "Cell (i, j) is the cheapest way to turn the first i letters of s1 (rows) into the first j letters of s2 (columns). On a mismatch the three neighbours are compared: left = insert, up = delete, diagonal = replace; the cheapest is green. The last frame walks back to list the edits.",
    code: ["for i in range(n + 1):", "    dp[i][0] = Cd * i                 # delete all of s1[:i]", "for j in range(m + 1):", "    dp[0][j] = Ci * j                 # insert all of s2[:j]", "for i in range(1, n + 1):", "    for j in range(1, m + 1):", "        if s1[i - 1] == s2[j - 1]:", "            dp[i][j] = dp[i - 1][j - 1]          # same letter: free", "        else:", "            dp[i][j] = min(Ci + dp[i][j - 1],    # insert  (left)", "                           Cd + dp[i - 1][j],    # delete  (up)", "                           Cr + dp[i - 1][j - 1])  # replace (diagonal)", "return dp[n][m]"],
    gen(s) { const [x0, y0, c0] = split2(s); const X = cap([...(x0 || "")], 8, "characters"), Y = cap([...(y0 || "")], 8, "characters"), c = nums(c0 || "1 1 1"), Ci = c[0] ?? 1, Cd = c[1] ?? 1, Cr = c[2] ?? 1, n = X.length, m = Y.length, fr = [];
      const dp = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: m + 1 }, (_, j) => (i === 0 ? Ci * j : j === 0 ? Cd * i : null)));
      const G2 = (hl) => ({ t: "grid", rh: ["∅", ...X], ch: ["∅", ...Y], rows: dp.map((r) => r.slice()), hl });
      fr.push(F(1, `Column 0: turning s1[:i] into the empty string means deleting all i letters, ${Cd} each.`, [G2(Object.fromEntries(X.map((_, k) => [(k + 1) + ",0", "cmp"]))), vars({ Ci, Cd, Cr })]));
      fr.push(F(3, `Row 0: building s2[:j] from the empty string means inserting all j letters, ${Ci} each.`, [G2(Object.fromEntries(Y.map((_, k) => ["0," + (k + 1), "cmp"]))), vars({ Ci, Cd, Cr })]));
      for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) {
        if (X[i - 1] === Y[j - 1]) { dp[i][j] = dp[i - 1][j - 1]; fr.push(F(7, `s1[${i - 1}] = '${X[i - 1]}' equals s2[${j - 1}] = '${Y[j - 1]}': no edit needed, copy the diagonal → <b>${dp[i][j]}</b>.`, [G2({ [i + "," + j]: "act", [(i - 1) + "," + (j - 1)]: "found" })])); continue; }
        const ins = Ci + dp[i][j - 1], del = Cd + dp[i - 1][j], rep = Cr + dp[i - 1][j - 1]; dp[i][j] = Math.min(ins, del, rep);
        const h = { [i + "," + j]: "act", [i + "," + (j - 1)]: ins === dp[i][j] ? "found" : "cmp", [(i - 1) + "," + j]: del === dp[i][j] ? "found" : "cmp", [(i - 1) + "," + (j - 1)]: rep === dp[i][j] ? "found" : "cmp" };
        fr.push(F(9, `'${X[i - 1]}' ≠ '${Y[j - 1]}': insert '${Y[j - 1]}' = ${Ci} + ${dp[i][j - 1]} = ${ins}, delete '${X[i - 1]}' = ${Cd} + ${dp[i - 1][j]} = ${del}, replace = ${Cr} + ${dp[i - 1][j - 1]} = ${rep}. Cheapest: <b>${dp[i][j]}</b>.`, [G2(h)])); }
      const ops = [], path = {}; let i = n, j = m;
      while (i > 0 || j > 0) { path[i + "," + j] = "done";
        if (i > 0 && j > 0 && X[i - 1] === Y[j - 1] && dp[i][j] === dp[i - 1][j - 1]) { i--; j--; }
        else if (i > 0 && j > 0 && dp[i][j] === Cr + dp[i - 1][j - 1]) { ops.unshift(`replace ${X[i - 1]}→${Y[j - 1]}`); i--; j--; }
        else if (i > 0 && dp[i][j] === Cd + dp[i - 1][j]) { ops.unshift(`delete ${X[i - 1]}`); i--; }
        else { ops.unshift(`insert ${Y[j - 1]}`); j--; } }
      path["0,0"] = "done"; path[n + "," + m] = "found";
      fr.push(F(12, `Minimum cost <b>${dp[n][m]}</b>. Walking back through the table gives one optimal list of edits. O(N·M) time; two rows give O(M) space.`, [G2(path), chips("edits", ops.length ? ops : ["none"])])); return fr; } };

  /* 0/1 vs unbounded: loop direction */
  A.dp_loopDirection = { title: "1-D knapsack: why the loop direction decides 0/1 vs unbounded", inputLabel: "weights | values | capacity | mode (01, unbounded, wrong)", input: "3 4 7 | 2 3 5 | 8 | 01",
    presets: [["0/1: right → left", "3 4 7 | 2 3 5 | 8 | 01"], ["Unbounded: left → right", "3 4 7 | 2 3 5 | 8 | unbounded"], ["Bug: 0/1 written left → right", "3 4 7 | 2 3 5 | 8 | wrong"]],
    code: ["dp = [0] * (W+1)          # dp[j] = best value with capacity j", "for each item (w, v):", "    0/1:       for j = W down to w   # dp[j-w] still holds the OLD row", "    unbounded: for j = w up to W     # dp[j-w] may already use this item", "        dp[j] = max(dp[j], v + dp[j - w])"],
    gen(s) { const [w0, v0, c0, m0] = split2(s); const wt = need(cap(nums(w0), 4, "items"), "weights"), val = nums(v0), W = Math.max(1, Math.min(12, nums(c0)[0] || 8)), mode = /unb/i.test(m0 || "") ? "unb" : /wr|bug/i.test(m0 || "") ? "wrong" : "01";
      if (val.length < wt.length) throw new Error("Give one value per weight.");
      const dp = Array(W + 1).fill(0), fr = [], asc = mode !== "01", line = asc ? 3 : 2; let reused = false;
      const items = (k) => wt.map((w, t) => ({ v: `w${w}/v${val[t]}`, cls: t === k ? "hit" : "" }));
      fr.push(F(0, mode === "01" ? "0/1 knapsack in one row: sweep capacity from high to low." : mode === "unb" ? "Unbounded knapsack: sweep capacity from low to high so an item can be added again." : "A 0/1 problem coded with an ascending loop. Watch an item get used twice.", [arr(dp, { label: "dp[capacity]" }), chips("items", items(-1))]));
      wt.forEach((w, k) => { const v = val[k], touched = new Set();
        const js = []; for (let j = w; j <= W; j++) js.push(j); if (!asc) js.reverse();
        js.forEach((j) => { const cand = v + dp[j - w], from = j - w, again = touched.has(from);
          if (cand > dp[j]) { const old = dp[j]; dp[j] = cand; touched.add(j); if (again && mode === "wrong") reused = true;
            fr.push(F(4, `item w${w}/v${v}, j = ${j}: ${v} + dp[${from}] = ${cand} > ${old} → dp[${j}] = <b>${cand}</b>${again ? (mode === "wrong" ? ` <b>BUG:</b> dp[${from}] already contains this item, so it is now used twice.` : ` (dp[${from}] already used this item: reuse, which unbounded allows)`) : ""}`, [arr(dp, { label: "dp[capacity]", hl: { [j]: again && mode === "wrong" ? "bad" : "act", [from]: again ? "swap" : "cmp" }, ptr: { j } }), chips("items", items(k))])); }
          else fr.push(F(4, `item w${w}/v${v}, j = ${j}: ${v} + dp[${from}] = ${cand} ≤ ${dp[j]}, keep`, [arr(dp, { label: "dp[capacity]", hl: { [j]: "act", [from]: "cmp" }, ptr: { j } }), chips("items", items(k))])); });
        fr.push(F(line, `Finished item w${w}/v${v} (${asc ? "ascending" : "descending"} sweep).`, [arr(dp, { label: "dp[capacity]" }), chips("items", items(k))])); });
      fr.push(F(-1, `Best value with capacity ${W}: <b>${dp[W]}</b>. ${mode === "01" ? "Descending order means dp[j-w] still holds the value from before this item, so each item is used at most once." : mode === "unb" ? "Ascending order lets dp[j-w] already contain the item, which is exactly unbounded reuse." : reused ? "Wrong for 0/1: an item was counted more than once. Loop from W down to w instead." : "No reuse happened on this input, but the ascending loop is still wrong for 0/1."}`, [arr(dp, { label: "dp[capacity]", hl: { [W]: mode === "wrong" && reused ? "bad" : "found" } })])); return fr; } };

  /* Palindrome table filled by gap */
  A.dp_palGap = { title: "Interval DP: palindromic substrings, filled by gap", inputLabel: "string (≤ 8 chars)", input: "cbcacbbc",
    presets: [["cbcacbbc", "cbcacbbc"], ["Notes: abac", "abac"], ["aaaa", "aaaa"]],
    code: ["for gap in 0 .. n-1:                 # length - 1", "  for i in 0 .. n-1-gap:  j = i + gap", "    gap 0: true ;  gap 1: s[i] == s[j]", "    else:  s[i] == s[j] and dp[i+1][j-1]   # inner substring"],
    gen(s) { const ch = cap([...String(s).replace(/\s/g, "")], 8, "characters"), n = need(ch, "characters").length, dp = Array.from({ length: n }, () => Array(n).fill(null)), fr = []; let count = 0, best = "";
      const G2 = (hl) => ({ t: "grid", rh: ch.map((c, i) => `${i} ${c}`), ch: ch.map((c, j) => `${j} ${c}`), rows: dp.map((r, i) => r.map((v, j) => (j < i ? "·" : v === null ? "" : v ? "T" : "F"))), hl });
      fr.push(F(0, "dp[i][j] = is s[i..j] a palindrome? Each cell needs the cell one diagonal shorter, so fill diagonal by diagonal.", [G2({})]));
      for (let gap = 0; gap < n; gap++) for (let i = 0; i + gap < n; i++) { const j = i + gap, h = { [i + "," + j]: "act" }; let why;
        if (gap === 0) { dp[i][j] = true; why = "single char"; }
        else if (gap === 1) { dp[i][j] = ch[i] === ch[j]; why = `'${ch[i]}' ${dp[i][j] ? "=" : "≠"} '${ch[j]}'`; }
        else { dp[i][j] = ch[i] === ch[j] && dp[i + 1][j - 1]; h[(i + 1) + "," + (j - 1)] = "cmp"; why = ch[i] !== ch[j] ? `ends '${ch[i]}' ≠ '${ch[j]}'` : `ends match, inner s[${i + 1}..${j - 1}] is ${dp[i + 1][j - 1] ? "T" : "F"}`; }
        if (dp[i][j]) { count++; if (gap + 1 > best.length) best = ch.slice(i, j + 1).join(""); h[i + "," + j] = "found"; }
        fr.push(F(gap < 2 ? 2 : 3, `gap ${gap}: "${ch.slice(i, j + 1).join("")}" → ${why} → <b>${dp[i][j] ? "palindrome" : "no"}</b>`, [G2(h), vars({ gap, "palindromes so far": count, "longest so far": best })])); }
      const fin = {}; for (let i = 0; i < n; i++) for (let j = i; j < n; j++) if (dp[i][j]) fin[i + "," + j] = "done";
      fr.push(F(-1, `<b>${count}</b> palindromic substrings; longest is "${best}". O(N²) time and space. Min-cut partitioning reads this table in O(1) per check.`, [G2(fin)])); return fr; } };

  /* Candy: two passes */
  A.dp_candy = { title: "Greedy: candy distribution in two passes", inputLabel: "marks", input: "1 6 3 1 10 12 20 5 2",
    presets: [["Notes example", "1 6 3 1 10 12 20 5 2"], ["1 5 2 1", "1 5 2 1"], ["All equal", "4 4 4 4 4"]],
    code: ["c = [1] * n", "for i in 1 .. n-1:     if a[i] > a[i-1]: c[i] = c[i-1] + 1          # left neighbour rule", "for i in n-2 .. 0:     if a[i] > a[i+1]: c[i] = max(c[i], c[i+1] + 1)   # right neighbour rule", "return sum(c)"],
    gen(s) { const a = need(cap(nums(s), 12), "marks"), n = a.length, c = a.map(() => 1), fr = [];
      const P = (hb, hc, note) => [{ t: "bars", vals: a, hl: hb }, arr(c, { label: "candies", hl: hc }), vars({ pass: note, total: c.reduce((x, y) => x + y, 0) })];
      fr.push(F(0, "Everyone starts with 1 candy.", P({}, {}, "start")));
      for (let i = 1; i < n; i++) { const up = a[i] > a[i - 1]; if (up) c[i] = c[i - 1] + 1;
        fr.push(F(1, up ? `${a[i]} > ${a[i - 1]} (left): c[${i}] = c[${i - 1}] + 1 = <b>${c[i]}</b>` : `${a[i]} ≤ ${a[i - 1]}: no left rule, c[${i}] stays ${c[i]}`, P({ [i]: "act", [i - 1]: "cmp" }, { [i]: up ? "done" : "act" }, "left → right"))); }
      for (let i = n - 2; i >= 0; i--) { const dn = a[i] > a[i + 1], old = c[i]; if (dn) c[i] = Math.max(c[i], c[i + 1] + 1);
        fr.push(F(2, dn ? `${a[i]} > ${a[i + 1]} (right): c[${i}] = max(${old}, ${c[i + 1]} + 1) = <b>${c[i]}</b>${c[i] === old ? " (left pass already enough)" : ""}` : `${a[i]} ≤ ${a[i + 1]}: no right rule`, P({ [i]: "act", [i + 1]: "cmp" }, { [i]: dn && c[i] !== old ? "done" : "act" }, "right → left"))); }
      fr.push(F(3, `Total <b>${c.reduce((x, y) => x + y, 0)}</b> candies. Pass 1 fixes every left rule; pass 2 only raises values, so it never breaks pass 1. O(N).`, P({}, Object.fromEntries(c.map((_, i) => [i, "found"])), "done"))); return fr; } };

  /* Stock: at most 2 transactions state machine */
  A.dp_stock2 = { title: "State machine DP: stock with at most 2 transactions", inputLabel: "prices", input: "3 3 5 0 0 3 1 4",
    presets: [["LeetCode example", "3 3 5 0 0 3 1 4"], ["Notes chart", "3 6 6 2 6 4 9 3 1"], ["Only rising", "1 2 3 4 5"]],
    code: ["b1, s1, b2, s2 = -p[0], 0, -inf, 0    # best cash after each step", "for x in p[1:]:   (use yesterday's values on the right)", "    b1 = max(b1, -x)          # first buy", "    s1 = max(s1, b1 + x)      # first sell", "    b2 = max(b2, s1 - x)      # second buy, paid from first profit", "    s2 = max(s2, b2 + x)      # second sell", "return max(s1, s2)"],
    gen(s) { const p = need(cap(nums(s), 12), "prices"), fr = []; let b1 = -p[0], s1 = 0, b2 = -Infinity, s2 = 0;
      const f = (v) => (v === -Infinity ? "−∞" : v);
      const P = (d, ch) => [{ t: "bars", vals: p, hl: { [d]: "act" }, ptr: { day: d } }, chips("states (cash in hand)", [["b1", b1], ["s1", s1], ["b2", b2], ["s2", s2]].map(([k, v]) => ({ v: `${k} = ${f(v)}`, cls: ch.includes(k) ? "hit" : "" })))];
      fr.push(F(0, `Day 0: buying costs ${p[0]}, so b1 = ${-p[0]}. No second buy yet.`, P(0, ["b1"])));
      for (let d = 1; d < p.length; d++) { const x = p[d], nb1 = Math.max(b1, -x), ns1 = Math.max(s1, b1 + x), nb2 = Math.max(b2, s1 - x), ns2 = Math.max(s2, b2 + x), ch = [];
        if (nb1 !== b1) ch.push("b1"); if (ns1 !== s1) ch.push("s1"); if (nb2 !== b2) ch.push("b2"); if (ns2 !== s2) ch.push("s2");
        b1 = nb1; s1 = ns1; b2 = nb2; s2 = ns2;
        fr.push(F(ch.includes("s2") ? 5 : ch.includes("b2") ? 4 : ch.includes("s1") ? 3 : ch.includes("b1") ? 2 : 1, `Day ${d}, price ${x}: ${ch.length ? "improved " + ch.join(", ") : "nothing improves (keep every state)"}`, P(d, ch))); }
      fr.push(F(6, `Max profit <b>${Math.max(s1, s2)}</b>. Four variables replace dp[day][transactions][holding]: O(N) time, O(1) space. k transactions → 2k variables.`, P(p.length - 1, [s2 >= s1 ? "s2" : "s1"]))); return fr; } };

  /* Jump game: greedy reach, level by level */
  A.dp_jumpReach = { title: "Greedy: jump game, farthest reach level by level", inputLabel: "max jump at each index", input: "2 3 1 1 4",
    presets: [["2 3 1 1 4", "2 3 1 1 4"], ["Notes: 3 2 4 1 2 3 1 0 1", "3 2 4 1 2 3 1 0 1"], ["Stuck: 3 2 1 0 4", "3 2 1 0 4"]],
    code: ["jumps = 0; end = 0; far = 0", "for i in 0 .. n-2:", "    far = max(far, i + a[i])      # farthest index the next jump can reach", "    if i == end:                  # used up this jump's window", "        if far <= i: return unreachable", "        jumps += 1; end = far       # take one jump, new window ends at far"],
    gen(s) { const a = need(cap(nums(s), 12), "numbers"), n = a.length, fr = []; let jumps = 0, end = 0, far = 0, start = 0;
      const P = (i, h) => [arr(a, { hl: h, win: [start, Math.min(end, n - 1)], ptr: { i, far: Math.min(far, n - 1) } }), vars({ jumps, "window end": end, far })];
      if (n === 1) { fr.push(F(0, "Already at the last index: 0 jumps.", P(0, { 0: "found" }))); return fr; }
      fr.push(F(0, "The shaded window is everything reachable with the current number of jumps.", P(0, {})));
      for (let i = 0; i < n - 1; i++) { const old = far; far = Math.max(far, i + a[i]);
        fr.push(F(2, `i = ${i}: reach ${i} + ${a[i]} = ${i + a[i]}${far > old ? ` → far = <b>${far}</b>` : `, far stays ${far}`}`, P(i, { [i]: "act" })));
        if (i === end) { if (far <= i) { fr.push(F(4, `Window ends at ${i} and nothing reaches past it: the last index is <b>unreachable</b> (Jump Game I answers false).`, P(i, { [i]: "bad" }))); return fr; }
          jumps++; start = end + 1; end = far; fr.push(F(5, `Window used up at ${i}: jump #${jumps}, new window ${start}..${Math.min(end, n - 1)}`, P(i, { [i]: "cmp" })));
          if (end >= n - 1) break; } }
      fr.push(F(-1, `Reached index ${n - 1} with <b>${jumps}</b> jumps. Each window is one BFS level, so this is O(N) time and O(1) space.`, P(n - 1, { [n - 1]: "found" }))); return fr; } };

  const T = BP.DSA.topics;

  /* ═════════════════════════ DYNAMIC PROGRAMMING ═════════════════════════ */
  T["dp"] = {
    name: "Dynamic programming", icon: "🧮", color: "#7a3fc4", minutes: 120,
    notes: "DP1–DP7, Questionset1.pdf",
    summary: "Recursion that remembers: when the same smaller problem keeps coming back, solve it once, store it, and build the big answer from stored answers.",
    sections: [
      { h: "Recognising DP and the recipe", blocks: [
        ["analogy", "Five people have counted 5, 4, 9, 7 and 6 things: total 31. A sixth person with 10 joins. You don't recount everyone; you do 31 + 10 = 41. <b>DP is exactly this: reuse an answer you already computed.</b>"],
        ["p", "DP is an optimisation over recursion. It applies when <b>both</b> properties hold:"],
        ["list", ["<b>Optimal substructure</b>: the answer is built from answers to smaller instances of the same problem (fib(n) from fib(n-1) and fib(n-2)).", "<b>Overlapping subproblems</b>: the naive recursion solves the same small problem again and again (fib(3) and fib(2) appear many times in the fib(5) tree)."]],
        ["viz", "fibTree", "Run the plain preset, then the memoized one. fib(10) needs 177 calls naively and only 19 with memoization."],
        ["table", ["", "Top-down (memoization)", "Bottom-up (tabulation)"], [
          ["Starts from", "the biggest problem", "the smallest problem (base case)"],
          ["Mechanism", "recursion + cache", "loops + table"],
          ["Pros", "easy to write from the recurrence; only visits reachable states", "no stack overflow; easy to shrink space (keep last row / last two values)"],
          ["Cons", "recursion depth, call overhead", "must work out the fill order"]]],
        ["steps", [
          ["State", "What does dp[...] mean, in words? The changing parameters of the recursion become the indices (dp[i], dp[i][j])."],
          ["Transition", "How does a state come from smaller states? Think about the <b>last decision</b> (last step, last item, last character)."],
          ["Base case", "The smallest states you know directly (dp[0] = 0, ways to pay 0 = 1)."],
          ["Order", "Fill so every state's dependencies are already done: ascending i, row-major, bottom-right to top-left, or by gap."],
          ["Answer + space", "Which cell is the answer (dp[N], max of all dp[i], dp[0][0])? Which old rows can be dropped?"]]],
        ["tip", "<b>Recipe to memoise any recursion</b> (from the notes): (1) make storage sized by the changing parameters, filled with -1; (2) store the answer before returning; (3) at the top, if the answer is already stored, return it."],
        ["probs", [
          { t: "Nth Fibonacci", d: "Easy", q: "Return the Nth term of 0, 1, 1, 2, 3, 5, 8, … (0-indexed).", ex: "N = 10 → 55\nN = 5 → 5   (table: 0 1 1 2 3 5)",
            ap: [
              { n: "Brute force", cx: "O(2^N) time · O(N) space",
                idea: "Write the definition directly: fib(N) = fib(N-1) + fib(N-2). Every call makes two more calls, so the tree doubles each level and <b>fib(3), fib(2), … are recomputed again and again</b>.",
                code: "def fib(n):\n    if n <= 1:\n        return n\n    return fib(n - 1) + fib(n - 2)" },
              { n: "Better", cx: "O(N) time · O(N) space",
                idea: "Memoize (top-down): store each answer the first time it is computed. The tree collapses to one left spine; <b>every right child becomes an O(1) lookup</b>. Recipe from the notes: storage filled with -1, store before returning, check at the top.",
                code: "def fib(n):\n    memo = [-1] * (n + 1)\n\n    def go(i):\n        if i <= 1:\n            return i\n        if memo[i] != -1:          # already solved\n            return memo[i]\n        memo[i] = go(i - 1) + go(i - 2)\n        return memo[i]\n\n    return go(n)" },
              { n: "Optimal", cx: "O(N) time · O(N) space",
                idea: "Tabulate (bottom-up): start from the base cases and fill dp[2..N] in increasing order. No recursion, so <b>no stack overflow</b> for large N.",
                code: "def fib(n):\n    if n <= 1:\n        return n\n    dp = [0] * (n + 1)\n    dp[1] = 1\n    for i in range(2, n + 1):\n        dp[i] = dp[i - 1] + dp[i - 2]\n    return dp[n]" },
              { n: "Space-optimised", cx: "O(N) time · O(1) space",
                idea: "dp[i] only reads dp[i-1] and dp[i-2], so <b>keep just the last two values</b> in two variables.",
                code: "def fib(n):\n    if n <= 1:\n        return n\n    a, b = 0, 1                    # fib(i-2), fib(i-1)\n    for _ in range(2, n + 1):\n        a, b = b, a + b\n    return b" }],
            edge: "N = 0 and N = 1 return N.", viz: "fibTree", lc: "fibonacci-number" },
          { t: "Climbing stairs (1 or 2 steps)", d: "Easy", q: "N stairs; each move climbs 1 or 2. Count distinct ways to reach stair N.", ex: "N=3 → 3 (111, 12, 21)\nN=4 → 5 (1111, 112, 121, 211, 22)",
            ap: [
              { n: "Brute force", cx: "O(2^N) time · O(N) space",
                idea: "Think about the <b>last move</b>: it came from stair N-1 (a 1-step) or N-2 (a 2-step), so ways(N) = ways(N-1) + ways(N-2). Plain recursion re-solves the same stairs many times.",
                code: "def climb_stairs(n):\n    if n <= 1:                     # ways(0) = ways(1) = 1\n        return 1\n    return climb_stairs(n - 1) + climb_stairs(n - 2)" },
              { n: "Better", cx: "O(N) time · O(N) space",
                idea: "Memoize the same recursion: each stair is solved once.",
                code: "def climb_stairs(n):\n    memo = [-1] * (n + 1)\n\n    def ways(i):\n        if i <= 1:\n            return 1\n        if memo[i] == -1:\n            memo[i] = ways(i - 1) + ways(i - 2)\n        return memo[i]\n\n    return ways(n)" },
              { n: "Optimal", cx: "O(N) time · O(1) space",
                idea: "It is <b>Fibonacci with ways(0) = ways(1) = 1</b>. Fill bottom-up and keep only the last two values.",
                code: "def climb_stairs(n):\n    a, b = 1, 1                    # ways(0), ways(1)\n    for _ in range(2, n + 1):\n        a, b = b, a + b\n    return b" }],
            viz: "climbStairs", lc: "climbing-stairs" },
          { t: "Minimum perfect squares summing to N", d: "Medium", q: "Fewest perfect squares (repeats allowed) whose sum is N.", ex: "N=6 → 3 (4+1+1)   N=10 → 2 (9+1)\nN=9 → 1   N=12 → 3 (4+4+4)",
            ap: [
              { n: "Brute force", cx: "Exponential time · O(N) space",
                idea: "Greedy (take the largest square each time) gives 12 = 9+1+1+1 = 4 terms, which is wrong (4+4+4 = 3). So <b>try every square as the first term</b> and recurse on the rest. The tree for 12 branches to 11, 8, 3 and repeats nodes like 7 and 6.",
                code: "def num_squares(n):\n    if n == 0:\n        return 0\n    best = n                       # n ones always works\n    x = 1\n    while x * x <= n:\n        best = min(best, 1 + num_squares(n - x * x))\n        x += 1\n    return best" },
              { n: "Better", cx: "O(N·√N) time · O(N) space",
                idea: "Memoize on the remaining amount: there are only N + 1 different subproblems, each tries up to √N squares.",
                code: "def num_squares(n):\n    memo = [-1] * (n + 1)\n\n    def go(i):\n        if i == 0:\n            return 0\n        if memo[i] != -1:\n            return memo[i]\n        best = i\n        x = 1\n        while x * x <= i:\n            best = min(best, 1 + go(i - x * x))\n            x += 1\n        memo[i] = best\n        return best\n\n    return go(n)" },
              { n: "Optimal", cx: "O(N·√N) time · O(N) space",
                idea: "Tabulate: dp[i] = 1 + min over x² ≤ i of dp[i − x²], dp[0] = 0. Table for 0..12: <b>0 1 2 3 1 2 3 4 2 1 2 3 3</b>.",
                code: "def num_squares(n):\n    dp = [0] + [float('inf')] * n\n    for i in range(1, n + 1):\n        x = 1\n        while x * x <= i:\n            dp[i] = min(dp[i], dp[i - x * x] + 1)\n            x += 1\n    return dp[n]" }],
            lc: "perfect-squares" }]]
      ]},

      { h: "1-D DP: pick / skip, jumps, stocks, digits", blocks: [
        ["p", "Most 1-D problems ask: <b>what was the last decision at index i?</b> Take it or skip it; which index did I jump from; am I holding a share today?"],
        ["viz", "dp_houseRobber", "Each cell compares skip (dp[i-1]) with take (a[i] + dp[i-2]). The final frame highlights the chosen elements."],
        ["probs", [
          { t: "Max sum, no two adjacent (House Robber)", d: "Medium", q: "Pick a subsequence with the largest sum such that no two picked elements are adjacent. Picking nothing (0) is allowed.", ex: "[2,-9,3,1,2,-3,8] → 15 (2+3+2+8)\n[9,4,13,24] → 33 (9+24)\n[10,20,30,40] → 60 (20+40)",
            ap: [
              { n: "Brute force", cx: "O(2^N) time · O(N) space",
                idea: "At index i either <b>skip</b> a[i] (best of a[0..i-1]) or <b>take</b> it (a[i] + best of a[0..i-2], since i-1 is banned). Plain recursion branches twice per index.",
                code: "def rob(a):\n    def go(i):                     # best sum using a[0..i]\n        if i < 0:\n            return 0\n        skip = go(i - 1)\n        take = a[i] + go(i - 2)\n        return max(skip, take)\n\n    return go(len(a) - 1)" },
              { n: "Better", cx: "O(N) time · O(N) space",
                idea: "Memoize go(i): each index is solved once.",
                code: "def rob(a):\n    memo = [None] * len(a)\n\n    def go(i):\n        if i < 0:\n            return 0\n        if memo[i] is None:\n            memo[i] = max(go(i - 1), a[i] + go(i - 2))\n        return memo[i]\n\n    return go(len(a) - 1)" },
              { n: "Optimal", cx: "O(N) time · O(N) space",
                idea: "Tabulate left to right: dp[i] = max(dp[i-1], a[i] + dp[i-2]). Shifting indices by 2 makes dp[-1] = dp[-2] = 0 real cells.",
                code: "def rob(a):\n    n = len(a)\n    dp = [0] * (n + 2)             # dp[i + 2] = best using a[0..i]\n    for i in range(n):\n        dp[i + 2] = max(dp[i + 1], a[i] + dp[i])\n    return dp[n + 1]" },
              { n: "Space-optimised", cx: "O(N) time · O(1) space",
                idea: "Like Fibonacci, only <b>two old values are read</b>, so two rolling variables replace the table.",
                code: "def rob(a):\n    prev2, prev1 = 0, 0            # dp[i-2], dp[i-1]\n    for x in a:\n        cur = max(prev1, x + prev2)\n        prev2, prev1 = prev1, cur\n    return prev1" }],
            edge: "All negative → 0 (empty pick). Circular street (House Robber II): run twice, once without the first house and once without the last.", viz: "dp_houseRobber", lc: "house-robber" },
          { t: "Minimum jumps to reach the end", d: "Medium", q: "nums[i] is the longest jump from i. Starting at 0, return the fewest jumps to reach the last index.", ex: "[2,3,1,1,4] → 2 (0→1→4)\n[2,3,0,1,4] → 2\n[3,2,4,1,2,3,1,0,1] → 3",
            ap: [
              { n: "Brute force", cx: "Exponential time · O(N) space",
                idea: "From index i try every jump length 1..nums[i] and recurse. The same indices are reached through many different paths.",
                code: "def jump(nums):\n    n = len(nums)\n\n    def go(i):                     # fewest jumps from i to the end\n        if i >= n - 1:\n            return 0\n        best = float('inf')\n        for step in range(1, nums[i] + 1):\n            best = min(best, 1 + go(i + step))\n        return best\n\n    return go(0)" },
              { n: "Better", cx: "O(N²) time · O(N) space",
                idea: "DP: dp[i] = 1 + min dp[j] over j < i with j + nums[j] ≥ i. Table for [2,3,1,1,4] is [0,1,1,2,2]. Still checks every pair.",
                code: "def jump(nums):\n    n = len(nums)\n    dp = [0] + [float('inf')] * (n - 1)\n    for i in range(1, n):\n        for j in range(i):\n            if j + nums[j] >= i:\n                dp[i] = min(dp[i], dp[j] + 1)\n    return dp[n - 1]" },
              { n: "Optimal", cx: "O(N) time · O(1) space",
                idea: "<b>Greedy by levels</b>: everything reachable with k jumps forms a window. While scanning the window, track the farthest index any of them reaches; when the window ends, take one jump and the new window ends at that farthest point. It is BFS without a queue.",
                code: "def jump(nums):\n    n = len(nums)\n    jumps = 0\n    end = 0                        # last index reachable with 'jumps' jumps\n    far = 0                        # farthest index the next jump can reach\n    for i in range(n - 1):\n        far = max(far, i + nums[i])\n        if i == end:               # window used up: take one more jump\n            jumps += 1\n            end = far\n            if end >= n - 1:\n                break\n    return jumps" }],
            viz: "dp_jumpReach", lc: "jump-game-ii" },
          { t: "Stock buy and sell, unlimited transactions", d: "Medium", q: "Prices by day; hold at most one share at a time; any number of buy→sell transactions. Max profit.", ex: "[3,5,8,10,4,6,12,15,11,7,2,8,16] → 32\n(3→10 = 7, 4→15 = 11, 2→16 = 14)",
            ap: [
              { n: "Brute force", cx: "O(2^N) time · O(N) space",
                idea: "Each day either do nothing, or buy (if not holding) / sell (if holding). Recursing on (day, holding) without caching explores every buy/sell pattern.",
                code: "def max_profit(p):\n    def go(i, holding):\n        if i == len(p):\n            return 0\n        best = go(i + 1, holding)                    # do nothing today\n        if holding:\n            best = max(best, p[i] + go(i + 1, False))  # sell\n        else:\n            best = max(best, -p[i] + go(i + 1, True))  # buy\n        return best\n\n    return go(0, False)" },
              { n: "Better", cx: "O(N) time · O(N) space",
                idea: "Memoize the same (day, holding) recursion: only 2N states.",
                code: "def max_profit(p):\n    n = len(p)\n    memo = [[None, None] for _ in range(n)]\n\n    def go(i, holding):\n        if i == n:\n            return 0\n        if memo[i][holding] is None:\n            best = go(i + 1, holding)\n            if holding:\n                best = max(best, p[i] + go(i + 1, 0))\n            else:\n                best = max(best, -p[i] + go(i + 1, 1))\n            memo[i][holding] = best\n        return memo[i][holding]\n\n    return go(0, 0)" },
              { n: "Optimal", cx: "O(N) time · O(1) space",
                idea: "<b>Keep booking the profit</b>: a long climb equals the sum of its small daily steps, so add every positive p[i+1] − p[i]. This is the hold / not-hold DP collapsed to a greedy.",
                code: "def max_profit(p):\n    profit = 0\n    for i in range(len(p) - 1):\n        if p[i + 1] > p[i]:\n            profit += p[i + 1] - p[i]\n    return profit" }],
            lc: "best-time-to-buy-and-sell-stock-ii" },
          { t: "Best time to buy and sell, at most 2 transactions", d: "Hard", co: "Question set", q: "At most two non-overlapping buy→sell transactions. Max profit.", ex: "[3,3,5,0,0,3,1,4] → 6 (0→3, 1→4)\n[3,6,6,2,6,4,9,3,1] → 10 (3→6, 2→9)",
            ap: [
              { n: "Brute force", cx: "O(N²) time · O(1) space",
                idea: "Trying every b1 < s1 < b2 < s2 is O(N⁴). A smarter brute force: <b>split the days at every point k</b> and add the best single transaction on each side, each found by a linear scan.",
                code: "def max_profit(p):\n    n = len(p)\n\n    def one(lo, hi):               # best single trade inside p[lo:hi]\n        best = 0\n        low = float('inf')\n        for x in p[lo:hi]:\n            low = min(low, x)\n            best = max(best, x - low)\n        return best\n\n    ans = 0\n    for k in range(n + 1):\n        ans = max(ans, one(0, k) + one(k, n))\n    return ans" },
              { n: "Better", cx: "O(N) time · O(N) space",
                idea: "Precompute both sides once: left[i] = best trade in p[0..i] (track the lowest price so far), right[i] = best trade in p[i..] (track the highest price after). Answer = max of left[i] + right[i].",
                code: "def max_profit(p):\n    n = len(p)\n    left = [0] * n\n    low = p[0]\n    for i in range(1, n):\n        low = min(low, p[i])\n        left[i] = max(left[i - 1], p[i] - low)\n    right = [0] * (n + 1)\n    high = float('-inf')\n    for i in range(n - 1, -1, -1):\n        high = max(high, p[i])\n        right[i] = max(right[i + 1], high - p[i])\n    return max(left[i] + right[i] for i in range(n))" },
              { n: "Optimal", cx: "O(N) time · O(1) space",
                idea: "<b>State machine</b>: four running bests, the cash you would hold after first buy, first sell, second buy, second sell. Each day every state either stays or does its action using yesterday's previous state. It is dp[day][transactions][holding] compressed to 4 variables.",
                code: "def max_profit(p):\n    b1 = -p[0]                     # after first buy\n    s1 = 0                         # after first sell\n    b2 = float('-inf')             # after second buy\n    s2 = 0                         # after second sell\n    for x in p[1:]:\n        # the right-hand side uses yesterday's values\n        b1, s1, b2, s2 = (max(b1, -x),\n                          max(s1, b1 + x),\n                          max(b2, s1 - x),\n                          max(s2, b2 + x))\n    return max(s1, s2)" }],
            edge: "Prices only falling → 0. Generalise: k transactions use 2k variables (LeetCode IV).", viz: "dp_stock2", lc: "best-time-to-buy-and-sell-stock-iii" },
          { t: "N-digit numbers with digit sum B (digit DP)", d: "Medium", q: "Count A-digit positive numbers (no leading zero) whose digits sum to B. Usually answer mod 1e9+7.", ex: "A=2, B=9 → 9 (18,27,36,45,54,63,72,81,90)\nA=3, B=9: 009 and 090 are invalid, 900 is valid",
            ap: [
              { n: "Brute force", cx: "O(10^A · A) time · O(1) space",
                idea: "Loop over every A-digit number 10^(A-1) .. 10^A − 1 and add up its digits. Hopeless beyond A ≈ 8.",
                code: "def count_numbers(a, b):\n    count = 0\n    for x in range(10 ** (a - 1), 10 ** a):\n        if sum(int(d) for d in str(x)) == b:\n            count += 1\n    return count" },
              { n: "Better", cx: "O(A·B·10) time · O(A·B) space",
                idea: "Fill digit slots left to right. The first slot takes 1–9, every other slot 0–9. <b>State = (free slots left, sum left)</b>; memoize it.",
                code: "def count_numbers(a, b):\n    MOD = 10 ** 9 + 7\n    memo = {}\n\n    def go(left, s):               # ways to fill 'left' digits (0-9) summing to s\n        if s < 0:\n            return 0\n        if left == 0:\n            return 1 if s == 0 else 0\n        if (left, s) not in memo:\n            total = 0\n            for d in range(10):\n                total += go(left - 1, s - d)\n            memo[(left, s)] = total % MOD\n        return memo[(left, s)]\n\n    ans = 0\n    for first in range(1, 10):     # no leading zero\n        ans += go(a - 1, b - first)\n    return ans % MOD" },
              { n: "Optimal", cx: "O(A·B·10) time · O(B) space",
                idea: "Tabulate with a rolling row: dp[s] = ways to fill i free digits with sum s = Σ dp_prev[s − d]. Answer = Σ over first digit d = 1..9 of dp[B − d].",
                code: "def count_numbers(a, b):\n    MOD = 10 ** 9 + 7\n    dp = [1] + [0] * b             # 0 free digits placed\n    for _ in range(a - 1):\n        nd = [0] * (b + 1)\n        for s in range(b + 1):\n            for d in range(min(9, s) + 1):\n                nd[s] = (nd[s] + dp[s - d]) % MOD\n        dp = nd\n    ans = 0\n    for d in range(1, min(9, b) + 1):\n        ans += dp[b - d]\n    return ans % MOD" }] },
          { t: "Word break", d: "Medium", q: "Can string s be split into words from a dictionary (words reusable)?", ex: "s = leetcode, dict = [leet, code] → true\ns = catsandog, dict = [cats, dog, sand, and, cat] → false",
            ap: [
              { n: "Brute force", cx: "O(2^N) time · O(N) space",
                idea: "Try every dictionary word as the first piece and recurse on the rest. Exponential because <b>the same suffix is re-checked</b> from many split points.",
                code: "def word_break(s, words):\n    words = set(words)\n\n    def go(i):                     # can s[i:] be split?\n        if i == len(s):\n            return True\n        for j in range(i + 1, len(s) + 1):\n            if s[i:j] in words and go(j):\n                return True\n        return False\n\n    return go(0)" },
              { n: "Better", cx: "O(N²·L) time · O(N) space",
                idea: "Memoize go(i): each suffix start is decided once (L = cost of slicing / hashing a substring).",
                code: "def word_break(s, words):\n    words = set(words)\n    memo = [-1] * len(s)           # -1 unknown, 0 false, 1 true\n\n    def go(i):\n        if i == len(s):\n            return True\n        if memo[i] == -1:\n            memo[i] = 0\n            for j in range(i + 1, len(s) + 1):\n                if s[i:j] in words and go(j):\n                    memo[i] = 1\n                    break\n        return memo[i] == 1\n\n    return go(0)" },
              { n: "Optimal", cx: "O(N²·L) time · O(N) space",
                idea: "dp[i] = can the prefix s[0..i) be split. dp[0] = true; dp[i] = true if some j < i has dp[j] true and s[j..i) in the dictionary. Same shape as palindrome min-cut: <b>try the last piece</b>.",
                code: "def word_break(s, words):\n    words = set(words)\n    n = len(s)\n    dp = [True] + [False] * n\n    for i in range(1, n + 1):\n        for j in range(i):\n            if dp[j] and s[j:i] in words:\n                dp[i] = True\n                break\n    return dp[n]" }],
            lc: "word-break" }]]
      ]},

      { h: "Grid DP", blocks: [
        ["p", "On a grid where you only move right or down, a cell can only be entered from the top or from the left. That single fact gives the recurrence. When the condition depends on the <b>future</b> (survive to the end), fill from the destination backwards."],
        ["viz", "dp_gridPaths", "Blocked cells are forced to 0; every other cell is top + left. Try the 5×4 preset without blocks: 35 paths."],
        ["probs", [
          { t: "Unique paths (right / down)", d: "Medium", q: "N×M grid from (0,0) to (N-1,M-1), each step one cell right or down. Count paths.", ex: "3×3 → 6   2×3 → 3   5×4 → 35",
            ap: [
              { n: "Brute force", cx: "O(2^(N+M)) time · O(N+M) space",
                idea: "A cell is entered from the top or from the left, so ways(i,j) = ways(i-1,j) + ways(i,j-1). Plain recursion recomputes (N-2,M-2) and many other cells repeatedly.",
                code: "def unique_paths(n, m):\n    def go(i, j):\n        if i == 0 or j == 0:       # first row / column: one straight path\n            return 1\n        return go(i - 1, j) + go(i, j - 1)\n\n    return go(n - 1, m - 1)" },
              { n: "Better", cx: "O(N·M) time · O(N·M) space",
                idea: "Memoize on (i, j): N·M states, O(1) work each.",
                code: "def unique_paths(n, m):\n    memo = [[-1] * m for _ in range(n)]\n\n    def go(i, j):\n        if i == 0 or j == 0:\n            return 1\n        if memo[i][j] == -1:\n            memo[i][j] = go(i - 1, j) + go(i, j - 1)\n        return memo[i][j]\n\n    return go(n - 1, m - 1)" },
              { n: "Optimal", cx: "O(N·M) time · O(N·M) space",
                idea: "Tabulate row by row: first row and column are 1, every other cell is top + left.",
                code: "def unique_paths(n, m):\n    dp = [[1] * m for _ in range(n)]\n    for i in range(1, n):\n        for j in range(1, m):\n            dp[i][j] = dp[i - 1][j] + dp[i][j - 1]\n    return dp[n - 1][m - 1]" },
              { n: "Space-optimised", cx: "O(N·M) time · O(M) space",
                idea: "Each row only needs the previous row, and the update row[j] += row[j-1] is a <b>running prefix sum</b> applied N-1 times. Closed form: C(N+M-2, N-1).",
                code: "def unique_paths(n, m):\n    row = [1] * m\n    for _ in range(n - 1):\n        for j in range(1, m):\n            row[j] += row[j - 1]   # top (old row[j]) + left (new row[j-1])\n    return row[m - 1]" }],
            viz: "dp_gridPaths", lc: "unique-paths" },
          { t: "Unique paths with blocked cells", d: "Medium", q: "Binary matrix, 1 = blocked. Count right/down paths from top-left to bottom-right avoiding blocks.", ex: "5×4 grid, blocks at (1,3), (2,1), (4,2) → 7\n1 1 1 1\n1 2 3 0\n1 0 3 3\n1 1 4 7\n1 2 0 7",
            ap: [
              { n: "Brute force", cx: "O(2^(N+M)) time · O(N+M) space",
                idea: "Same recursion as unique paths, returning 0 for a blocked or out-of-grid cell. Exponential without caching.",
                code: "def unique_paths_with_obstacles(g):\n    def go(i, j):\n        if i < 0 or j < 0 or g[i][j] == 1:\n            return 0\n        if i == 0 and j == 0:\n            return 1\n        return go(i - 1, j) + go(i, j - 1)\n\n    return go(len(g) - 1, len(g[0]) - 1)" },
              { n: "Better", cx: "O(N·M) time · O(N·M) space",
                idea: "Memoize on (i, j).",
                code: "def unique_paths_with_obstacles(g):\n    n, m = len(g), len(g[0])\n    memo = [[-1] * m for _ in range(n)]\n\n    def go(i, j):\n        if i < 0 or j < 0 or g[i][j] == 1:\n            return 0\n        if i == 0 and j == 0:\n            return 1\n        if memo[i][j] == -1:\n            memo[i][j] = go(i - 1, j) + go(i, j - 1)\n        return memo[i][j]\n\n    return go(n - 1, m - 1)" },
              { n: "Optimal", cx: "O(N·M) time · O(M) space",
                idea: "Same recurrence in one row: a blocked cell is 0. In the first row/column, once a block appears every later cell is 0; the general rule handles this, so <b>don't special-case the first row to 1</b>.",
                code: "def unique_paths_with_obstacles(g):\n    m = len(g[0])\n    dp = [0] * m\n    dp[0] = 1 if g[0][0] == 0 else 0\n    for row in g:\n        for j in range(m):\n            if row[j] == 1:\n                dp[j] = 0\n            elif j > 0:\n                dp[j] += dp[j - 1]     # top (old dp[j]) + left\n    return dp[m - 1]" }],
            edge: "Start or end blocked → 0.", viz: "dp_gridPaths", lc: "unique-paths-ii" },
          { t: "Dungeon and princess (minimum starting health)", d: "Hard", q: "Grid of integers: negative = dragon, positive = Red Bull. Move right/down from top-left to bottom-right. Health must stay ≥ 1. Minimum starting health?", ex: "-3   2   4  -5\n-6   5  -4   6\n-15 -7   5  -2\n 2  10  -3  -4\nAnswer 4",
            ap: [
              { n: "Brute force", cx: "O(2^(N+M)) time · O(N+M) space",
                idea: "Max-sum or min-sum paths from the start are both wrong: a big reward late doesn't help if you die earlier. Instead ask, for each cell, <b>how much health you need when entering it</b>, which depends on the future. Plain recursion over right/down is exponential.",
                code: "def calculate_minimum_hp(a):\n    n, m = len(a), len(a[0])\n\n    def need(i, j):                # min health entering (i, j) to finish alive\n        if i == n - 1 and j == m - 1:\n            return max(1, 1 - a[i][j])\n        best = float('inf')\n        if i + 1 < n:\n            best = min(best, need(i + 1, j))\n        if j + 1 < m:\n            best = min(best, need(i, j + 1))\n        return max(1, best - a[i][j])\n\n    return need(0, 0)" },
              { n: "Better", cx: "O(N·M) time · O(N·M) space",
                idea: "Memoize need(i, j).",
                code: "def calculate_minimum_hp(a):\n    n, m = len(a), len(a[0])\n    memo = [[None] * m for _ in range(n)]\n\n    def need(i, j):\n        if i == n or j == m:\n            return float('inf')    # outside the grid: never use it\n        if i == n - 1 and j == m - 1:\n            return max(1, 1 - a[i][j])\n        if memo[i][j] is None:\n            best = min(need(i + 1, j), need(i, j + 1))\n            memo[i][j] = max(1, best - a[i][j])\n        return memo[i][j]\n\n    return need(0, 0)" },
              { n: "Optimal", cx: "O(N·M) time · O(M) space",
                idea: "Fill <b>backwards</b> from bottom-right to top-left: need = max(1, min(down, right) − a[i][j]). If after this cell you need h and it gives v, you need h − v, but never less than 1. One row is enough. Example row 0: 4 1 1 6.",
                code: "def calculate_minimum_hp(a):\n    n, m = len(a), len(a[0])\n    INF = float('inf')\n    dp = [INF] * (m + 1)           # dp[j] = need of the cell below (old row)\n    dp[m - 1] = 1                  # leaving the last cell you need 1 health\n    for i in range(n - 1, -1, -1):\n        for j in range(m - 1, -1, -1):\n            best = min(dp[j], dp[j + 1])   # down, right\n            dp[j] = max(1, best - a[i][j])\n    return dp[0]" }],
            lc: "dungeon-game" },
          { t: "Minimum path sum", d: "Medium", q: "Grid of non-negative costs; move right/down; minimise the total cost from top-left to bottom-right.", ex: "[[1,3,1],[1,5,1],[4,2,1]] → 7 (1→3→1→1→1)",
            ap: [
              { n: "Brute force", cx: "O(2^(N+M)) time · O(N+M) space",
                idea: "Recursion: cost(i,j) = a[i][j] + min(cost from top, cost from left). It enumerates all C(N+M-2, N-1) paths.",
                code: "def min_path_sum(a):\n    def go(i, j):\n        if i < 0 or j < 0:\n            return float('inf')\n        if i == 0 and j == 0:\n            return a[0][0]\n        return a[i][j] + min(go(i - 1, j), go(i, j - 1))\n\n    return go(len(a) - 1, len(a[0]) - 1)" },
              { n: "Better", cx: "O(N·M) time · O(N·M) space",
                idea: "Memoize on (i, j).",
                code: "def min_path_sum(a):\n    n, m = len(a), len(a[0])\n    memo = [[None] * m for _ in range(n)]\n\n    def go(i, j):\n        if i < 0 or j < 0:\n            return float('inf')\n        if i == 0 and j == 0:\n            return a[0][0]\n        if memo[i][j] is None:\n            memo[i][j] = a[i][j] + min(go(i - 1, j), go(i, j - 1))\n        return memo[i][j]\n\n    return go(n - 1, m - 1)" },
              { n: "Optimal", cx: "O(N·M) time · O(M) space",
                idea: "Same shape as unique paths with <b>min instead of +</b>: dp[j] = a[i][j] + min(top, left), kept in one row.",
                code: "def min_path_sum(a):\n    m = len(a[0])\n    dp = [float('inf')] * m        # dp[j] = best cost to reach (i, j)\n    dp[0] = 0\n    for row in a:\n        dp[0] += row[0]            # first column: only from the top\n        for j in range(1, m):\n            dp[j] = row[j] + min(dp[j], dp[j - 1])   # top, left\n    return dp[m - 1]" }],
            lc: "minimum-path-sum" }]]
      ]},

      { h: "Knapsack family", blocks: [
        ["p", "N items with value and weight, a bag of capacity W: maximise value with total weight ≤ W. How items may be used decides everything."],
        ["table", ["Variant", "Greedy works?", "1-D capacity loop", "State"], [
          ["Fractional (cut items)", "Yes: sort by value/weight", "n/a", "n/a (see Greedy)"],
          ["0/1 (each item once)", "No", "W down to w", "dp[i][j] or 1-D dp[j]"],
          ["Unbounded (reuse items)", "No", "w up to W", "dp[c]"],
          ["Huge W, small values", "No", "value S down to v", "dp[value] = min weight"]]],
        ["tip", "Fractional knapsack is solved greedily (sort by ratio, cut the last item). Its proof and code live in the <b>Greedy</b> topic. Notes example: W=40, h=[4,8,10,2,5], w=[4,4,20,8,16] → 25.75."],
        ["viz", "knapsack", "0/1 table: each cell is max(skip = cell above, take = value + cell above shifted left by the weight)."],
        ["viz", "dp_loopDirection", "Same items, three presets. Descending keeps 0/1 correct (5); ascending is unbounded (6). The bug preset shows a 0/1 solution accidentally reusing an item."],
        ["probs", [
          { t: "0/1 knapsack", d: "Medium", q: "Each toy is taken whole or not at all, at most once. Maximise happiness within capacity W.", ex: "N=4, W=7, h=[4,1,5,7], w=[3,2,4,5] → 9 (4+5)\nh=[12,20,15,6,10], w=[3,6,5,2,4], W=8 → 27 (weights 3+5)",
            ap: [
              { n: "Brute force", cx: "O(2^N) time · O(N) space",
                idea: "Ratio greedy picks (7,5), then only (1,2) fits → 8, but the optimum is 9. So for each toy <b>try both skip and take</b>: plain recursion over (item, capacity left) is every subset.",
                code: "def knapsack(h, w, W):\n    def go(i, cap):                # best using toys 0..i-1 with capacity cap\n        if i == 0:\n            return 0\n        best = go(i - 1, cap)      # skip toy i-1\n        if w[i - 1] <= cap:        # take toy i-1\n            best = max(best, h[i - 1] + go(i - 1, cap - w[i - 1]))\n        return best\n\n    return go(len(h), W)" },
              { n: "Better", cx: "O(N·W) time · O(N·W) space",
                idea: "Only (i, cap) changes, so memoize on those two: N·W states.",
                code: "def knapsack(h, w, W):\n    n = len(h)\n    memo = [[-1] * (W + 1) for _ in range(n + 1)]\n\n    def go(i, cap):\n        if i == 0:\n            return 0\n        if memo[i][cap] == -1:\n            best = go(i - 1, cap)\n            if w[i - 1] <= cap:\n                best = max(best, h[i - 1] + go(i - 1, cap - w[i - 1]))\n            memo[i][cap] = best\n        return memo[i][cap]\n\n    return go(n, W)" },
              { n: "Optimal", cx: "O(N·W) time · O(N·W) space",
                idea: "Tabulate: dp[i][j] = best using the first i toys with capacity j = max(dp[i-1][j], h[i-1] + dp[i-1][j − w[i-1]]). Both choices read <b>row i-1</b>.",
                code: "def knapsack(h, w, W):\n    n = len(h)\n    dp = [[0] * (W + 1) for _ in range(n + 1)]\n    for i in range(1, n + 1):\n        for j in range(W + 1):\n            dp[i][j] = dp[i - 1][j]                      # skip\n            if w[i - 1] <= j:                            # take\n                dp[i][j] = max(dp[i][j], h[i - 1] + dp[i - 1][j - w[i - 1]])\n    return dp[n][W]" },
              { n: "Space-optimised", cx: "O(N·W) time · O(W) space",
                idea: "One row works if j runs <b>from W down to w</b>: dp[j − w] is then still the old row's value, so each toy is used at most once.",
                code: "def knapsack(h, w, W):\n    dp = [0] * (W + 1)\n    for i in range(len(h)):\n        for j in range(W, w[i] - 1, -1):   # descending: no reuse\n            dp[j] = max(dp[j], h[i] + dp[j - w[i]])\n    return dp[W]" }],
            viz: "knapsack" },
          { t: "Flipkart's suggestion problem", d: "Medium", co: "Flipkart", q: "A customer has a budget; each product has a cost and a happiness score; buy each at most once to maximise happiness within budget.", ex: "cost=[110,160,50,120,100], happy=[39,57,13,44,24], budget 300 → 101 (160+120)\nh=[4,1,5,7], cost=[3,2,4,5], budget 7 → 9",
            ap: [
              { n: "Brute force", cx: "O(2^N · N) time · O(1) space",
                idea: "Sorting by happiness gives 8, by cost 5, by happiness/cost 8. All wrong (answer 9). The safe brute force <b>tries every subset</b> of products within budget.",
                code: "def max_happiness(cost, happy, budget):\n    n = len(cost)\n    best = 0\n    for mask in range(1 << n):     # every subset\n        c = 0\n        h = 0\n        for i in range(n):\n            if mask >> i & 1:\n                c += cost[i]\n                h += happy[i]\n        if c <= budget:\n            best = max(best, h)\n    return best" },
              { n: "Optimal", cx: "O(N·budget) time · O(budget) space",
                idea: "It is <b>0/1 knapsack in disguise</b>: cost = weight, happiness = value, budget = capacity. Recognising the disguise is the whole problem.",
                code: "def max_happiness(cost, happy, budget):\n    dp = [0] * (budget + 1)\n    for c, h in zip(cost, happy):\n        for b in range(budget, c - 1, -1):   # descending: each product once\n            dp[b] = max(dp[b], h + dp[b - c])\n    return dp[budget]" }] },
          { t: "Unbounded (0-∞) knapsack", d: "Medium", q: "Like 0/1 but each item can be picked any number of times.", ex: "value=[2,3,5], wt=[3,4,7], W=8 → 6 (two weight-4 items)\nhapp=[1,30], wt=[1,50], W=100 → 100 (beats 60)",
            ap: [
              { n: "Brute force", cx: "O(N^W) time · O(W) space",
                idea: "From the remaining capacity, try every item as the next one taken (items can repeat) and recurse.",
                code: "def unbounded_knapsack(h, w, W):\n    def go(cap):\n        best = 0\n        for j in range(len(h)):\n            if w[j] <= cap:\n                best = max(best, h[j] + go(cap - w[j]))\n        return best\n\n    return go(W)" },
              { n: "Better", cx: "O(N·W) time · O(W) space",
                idea: "Only the capacity changes, so memoize go(cap).",
                code: "def unbounded_knapsack(h, w, W):\n    memo = [-1] * (W + 1)\n\n    def go(cap):\n        if memo[cap] == -1:\n            best = 0\n            for j in range(len(h)):\n                if w[j] <= cap:\n                    best = max(best, h[j] + go(cap - w[j]))\n            memo[cap] = best\n        return memo[cap]\n\n    return go(W)" },
              { n: "Optimal", cx: "O(N·W) time · O(W) space",
                idea: "Taking an item does <b>not</b> move to the previous item, so the take branch reads the same row. dp[c] = max over items with w ≤ c of h + dp[c − w], <b>capacity ascending</b>. Filled: [0,0,0,2,3,3,4,5,6].",
                code: "def unbounded_knapsack(h, w, W):\n    dp = [0] * (W + 1)\n    for c in range(1, W + 1):\n        for j in range(len(h)):\n            if w[j] <= c:\n                dp[c] = max(dp[c], h[j] + dp[c - w[j]])\n    return dp[W]" }],
            viz: "dp_loopDirection" },
          { t: "Rod cutting", d: "Medium", q: "Rod of length N; price[i] is the price of a piece of length i. Cut into pieces (or none) to maximise total price.", ex: "N=5, price[1..5] = [1,4,2,5,6] → 9 (2+2+1)\ndp[0..5] = 0 1 4 5 8 9",
            ap: [
              { n: "Brute force", cx: "O(2^N) time · O(N) space",
                idea: "Choose the length of the first piece (1..N) and recurse on what is left: every way of writing N as a sum of lengths.",
                code: "def rod_cutting(price, n):        # price[k - 1] = price of a piece of length k\n    if n == 0:\n        return 0\n    best = 0\n    for cut in range(1, n + 1):\n        best = max(best, price[cut - 1] + rod_cutting(price, n - cut))\n    return best" },
              { n: "Better", cx: "O(N²) time · O(N) space",
                idea: "Memoize on the remaining length.",
                code: "def rod_cutting(price, n):\n    memo = [-1] * (n + 1)\n\n    def go(length):\n        if length == 0:\n            return 0\n        if memo[length] == -1:\n            best = 0\n            for cut in range(1, length + 1):\n                best = max(best, price[cut - 1] + go(length - cut))\n            memo[length] = best\n        return memo[length]\n\n    return go(n)" },
              { n: "Optimal", cx: "O(N²) time · O(N) space",
                idea: "It is <b>unbounded knapsack</b>: piece lengths are weights, prices are values, capacity N, lengths reusable. dp[0..5] = 0 1 4 5 8 9.",
                code: "def rod_cutting(price, n):\n    dp = [0] * (n + 1)\n    for i in range(1, n + 1):\n        for cut in range(1, i + 1):\n            dp[i] = max(dp[i], price[cut - 1] + dp[i - cut])\n    return dp[n]" }] },
          { t: "Coin change: fewest coins", d: "Medium", q: "Fewest coins (unlimited supply) to make an amount, or -1.", ex: "coins [1,3,4], amount 6 → 2 (3+3); greedy gives 3 (4+1+1)",
            ap: [
              { n: "Brute force", cx: "O(C^A) time · O(A) space",
                idea: "Greedy largest-first fails (coins [1,3,4], 6 → 4+1+1). So try every coin as the last one and recurse on amount − coin.",
                code: "def coin_change(coins, amount):\n    def go(a):                     # fewest coins for a, inf if impossible\n        if a == 0:\n            return 0\n        best = float('inf')\n        for c in coins:\n            if c <= a:\n                best = min(best, go(a - c) + 1)\n        return best\n\n    ans = go(amount)\n    return ans if ans != float('inf') else -1" },
              { n: "Better", cx: "O(A·C) time · O(A) space",
                idea: "Memoize go(a): A + 1 amounts, each tries C coins.",
                code: "def coin_change(coins, amount):\n    memo = [None] * (amount + 1)\n\n    def go(a):\n        if a == 0:\n            return 0\n        if memo[a] is None:\n            best = float('inf')\n            for c in coins:\n                if c <= a:\n                    best = min(best, go(a - c) + 1)\n            memo[a] = best\n        return memo[a]\n\n    ans = go(amount)\n    return ans if ans != float('inf') else -1" },
              { n: "Optimal", cx: "O(A·C) time · O(A) space",
                idea: "Unbounded knapsack with min: dp[x] = 1 + min dp[x − c]. dp[0] = 0, unreachable = infinity.",
                code: "def coin_change(coins, amount):\n    INF = float('inf')\n    dp = [0] + [INF] * amount\n    for x in range(1, amount + 1):\n        for c in coins:\n            if c <= x:\n                dp[x] = min(dp[x], dp[x - c] + 1)\n    return dp[amount] if dp[amount] < INF else -1" }],
            viz: "coinChange", lc: "coin-change" },
          { t: "Coin change: number of ordered ways", d: "Medium", q: "Unlimited coins; count sequences summing to the amount where order matters ((1,4) ≠ (4,1)).", ex: "amount 5, coins [3,1,4] → 6\n(1,4) (4,1) (3,1,1) (1,3,1) (1,1,3) (1,1,1,1,1)\ndp[0..5] = 1 1 1 2 4 6",
            ap: [
              { n: "Brute force", cx: "O(C^A) time · O(A) space",
                idea: "Pick the next coin from each amount and recurse; every sequence is a separate leaf.",
                code: "def count_ordered(coins, amount):\n    if amount == 0:\n        return 1                   # paying nothing is one way\n    ways = 0\n    for c in coins:\n        if c <= amount:\n            ways += count_ordered(coins, amount - c)\n    return ways" },
              { n: "Better", cx: "O(A·C) time · O(A) space",
                idea: "Memoize on the amount.",
                code: "def count_ordered(coins, amount):\n    memo = [-1] * (amount + 1)\n\n    def go(a):\n        if a == 0:\n            return 1\n        if memo[a] == -1:\n            memo[a] = 0\n            for c in coins:\n                if c <= a:\n                    memo[a] += go(a - c)\n        return memo[a]\n\n    return go(amount)" },
              { n: "Optimal", cx: "O(A·C) time · O(A) space",
                idea: "dp[i] = Σ dp[i − c] over coins c ≤ i. <b>Ways to pay 0 is 1</b> (pay nothing), not 0. Loop <b>amount outer, coins inner</b>: at each amount any coin can be the last one, so every order is counted. dp[0..5] = 1 1 1 2 4 6.",
                code: "def count_ordered(coins, amount):\n    dp = [1] + [0] * amount\n    for i in range(1, amount + 1):\n        for c in coins:\n            if c <= i:\n                dp[i] += dp[i - c]\n    return dp[amount]" }],
            lc: "combination-sum-iv" },
          { t: "Coin change: number of unordered ways", d: "Medium", q: "Same, but {1,4} and {4,1} are the same way.", ex: "amount 5, coins [3,1,4] → 3: {1,4} {1,1,3} {1,1,1,1,1}\ncoins [2,3,5,7], amount 10 → 5: {5,5} {3,7} {2,3,5} {2,2,3,3} {2,2,2,2,2}",
            ap: [
              { n: "Brute force", cx: "O(2^(A+C)) time · O(A+C) space",
                idea: "Make repeats impossible by deciding coins in a fixed order: at coin i either <b>use it again</b> (stay on i) or <b>move on</b> to coin i+1 for good.",
                code: "def change(amount, coins):\n    def go(i, a):                  # ways to pay a using coins[i:]\n        if a == 0:\n            return 1\n        if a < 0 or i == len(coins):\n            return 0\n        return go(i, a - coins[i]) + go(i + 1, a)\n\n    return go(0, amount)" },
              { n: "Better", cx: "O(C·A) time · O(C·A) space",
                idea: "Memoize on (coin index, amount).",
                code: "def change(amount, coins):\n    memo = {}\n\n    def go(i, a):\n        if a == 0:\n            return 1\n        if a < 0 or i == len(coins):\n            return 0\n        if (i, a) not in memo:\n            memo[(i, a)] = go(i, a - coins[i]) + go(i + 1, a)\n        return memo[(i, a)]\n\n    return go(0, amount)" },
              { n: "Optimal", cx: "O(C·A) time · O(A) space",
                idea: "In the table, <b>swap the loops: coins outer, amount inner</b>. Once a coin is finished you never come back to it, so each multiset is counted once. The coin order itself doesn't matter, only the nesting.",
                code: "def change(amount, coins):\n    dp = [1] + [0] * amount\n    for c in coins:\n        for i in range(c, amount + 1):\n            dp[i] += dp[i - c]\n    return dp[amount]" }],
            lc: "coin-change-ii" },
          { t: "0/1 knapsack with huge capacity (value-indexed)", d: "Hard", q: "N ≤ 500, W and weights up to 1e9, values ≤ 50. A capacity-indexed table is impossible.", ex: "value=[2,1,3], wt=[3,2,4], W=7 → 5\nlast row of min weights for value 0..6: 0 2 3 4 6 7 9",
            ap: [
              { n: "Brute force", cx: "O(N·W) time · O(W) space",
                idea: "The usual capacity-indexed knapsack: dp over capacity is O(N·W) = 5·10^11 here. <b>Correct, but far too big</b> for W = 1e9.",
                code: "def knapsack(val, wt, W):\n    dp = [0] * (W + 1)\n    for i in range(len(val)):\n        for j in range(W, wt[i] - 1, -1):\n            dp[j] = max(dp[j], val[i] + dp[j - wt[i]])\n    return dp[W]" },
              { n: "Optimal", cx: "O(N·Σvalue) time · O(Σvalue) space",
                idea: "<b>Swap the roles of value and weight.</b> dp[v] = minimum weight to get value exactly v. Total value ≤ 500·50 = 25,000, so the table is small. Then scan v from the top: the first v with dp[v] ≤ W is the answer. Like listing each level with its cheapest price and buying the highest level you can afford.",
                code: "def knapsack(val, wt, W):\n    S = sum(val)\n    INF = float('inf')\n    dp = [0] + [INF] * S           # dp[v] = min weight for value exactly v\n    for i in range(len(val)):\n        for v in range(S, val[i] - 1, -1):\n            dp[v] = min(dp[v], wt[i] + dp[v - val[i]])\n    for v in range(S, -1, -1):\n        if dp[v] <= W:\n            return v\n    return 0" }] },
          { t: "Target sum / subset sum", d: "Medium", q: "Positive integers and a target: does some subset sum exactly to the target?", ex: "[3,34,4,12,5,2], target 9 → true (4+5)\n[7,2,3,1,5], target 8 → true (7+1)",
            ap: [
              { n: "Brute force", cx: "O(2^N) time · O(N) space",
                idea: "Each element is either in the subset or not: recurse on both.",
                code: "def subset_sum(arr, target):\n    def go(i, t):\n        if t == 0:\n            return True\n        if i == len(arr) or t < 0:\n            return False\n        return go(i + 1, t - arr[i]) or go(i + 1, t)\n\n    return go(0, target)" },
              { n: "Better", cx: "O(N·T) time · O(N·T) space",
                idea: "Memoize on (i, t). A boolean table can't say 'not computed', so use ints: <b>-1 unknown, 0 false, 1 true</b>.",
                code: "def subset_sum(arr, target):\n    n = len(arr)\n    memo = [[-1] * (target + 1) for _ in range(n + 1)]\n\n    def go(i, t):\n        if t == 0:\n            return True\n        if i == n or t < 0:\n            return False\n        if memo[i][t] == -1:\n            memo[i][t] = 1 if go(i + 1, t - arr[i]) or go(i + 1, t) else 0\n        return memo[i][t] == 1\n\n    return go(0, target)" },
              { n: "Optimal", cx: "O(N·T) time · O(T) space",
                idea: "0/1 knapsack with booleans: dp[j] = dp[j] OR dp[j − x], <b>j descending</b> so each element is used once.",
                code: "def subset_sum(arr, target):\n    dp = [True] + [False] * target\n    for x in arr:\n        for j in range(target, x - 1, -1):\n            dp[j] = dp[j] or dp[j - x]\n    return dp[target]" }],
            lc: "partition-equal-subset-sum" },
          { t: "Partition to K equal sum subsets", d: "Medium", co: "Question set", q: "Can nums be split into k non-empty subsets with equal sums?", ex: "nums=[4,3,2,3,5,2,1], k=4 → true\nsum 20, target 5: [4,1] [5] [3,2] [3,2]",
            ap: [
              { n: "Brute force", cx: "O(k^N) time · O(N + k) space",
                idea: "If sum % k ≠ 0, answer false immediately. Otherwise <b>put each element into one of the k buckets</b> (never over the target) and backtrack.",
                code: "def can_partition_k_subsets(nums, k):\n    total = sum(nums)\n    if total % k:\n        return False\n    target = total // k\n    buckets = [0] * k\n\n    def place(i):\n        if i == len(nums):\n            return all(b == target for b in buckets)\n        for b in range(k):\n            if buckets[b] + nums[i] <= target:\n                buckets[b] += nums[i]\n                if place(i + 1):\n                    return True\n                buckets[b] -= nums[i]   # undo\n        return False\n\n    return place(0)" },
              { n: "Better", cx: "O(k·2^N) time · O(N) space",
                idea: "Fill <b>one bucket at a time</b> with a visited[] array: add unused elements while the bucket stays ≤ target; when it hits the target, start the next bucket from index 0 with k-1. Undo on failure. Sorting descending fails fast.",
                code: "def can_partition_k_subsets(nums, k):\n    total = sum(nums)\n    if total % k:\n        return False\n    target = total // k\n    nums = sorted(nums, reverse=True)\n    if nums[0] > target:\n        return False\n    n = len(nums)\n    vis = [False] * n\n\n    def go(k, start, cur):\n        if k == 0:\n            return True\n        if cur == target:          # bucket full: start the next one\n            return go(k - 1, 0, 0)\n        for i in range(start, n):\n            if not vis[i] and cur + nums[i] <= target:\n                vis[i] = True\n                if go(k, i + 1, cur + nums[i]):\n                    return True\n                vis[i] = False\n        return False\n\n    return go(k, 0, 0)" },
              { n: "Optimal", cx: "O(N·2^N) time · O(2^N) space",
                idea: "Memoize on the <b>visited bitmask</b>: which elements are used fully decides the state. dp[mask] = how full the current bucket is (sum of used elements mod target), or -1 if the mask can't be reached.",
                code: "def can_partition_k_subsets(nums, k):\n    total = sum(nums)\n    if total % k:\n        return False\n    target = total // k\n    n = len(nums)\n    dp = [-1] * (1 << n)           # dp[mask] = fill of the current bucket\n    dp[0] = 0\n    for mask in range(1 << n):\n        if dp[mask] == -1:\n            continue\n        for i in range(n):\n            if not (mask >> i) & 1 and dp[mask] + nums[i] <= target:\n                dp[mask | (1 << i)] = (dp[mask] + nums[i]) % target\n    return dp[(1 << n) - 1] == 0" }],
            edge: "Any element > target → false.", lc: "partition-to-k-equal-sum-subsets" }]]
      ]},

      { h: "DP on two strings", blocks: [
        ["p", "With two strings, the state is a pair of prefixes: dp[i][j] for s1[0..i) and s2[0..j). Compare the last characters. Three neighbours matter: <b>diagonal</b> (use both last chars), <b>up</b> (drop s1's last), <b>left</b> (drop s2's last). Row 0 and column 0 are the empty-string base cases."],
        ["viz", "lcs", "Match → diagonal + 1; mismatch → max(up, left). The final frame traces one LCS back through the table."],
        ["viz", "dp_editDistance", "Three coloured choices per mismatch. Try the notes presets with costs Ci=2, Cd=2, Cr=3."],
        ["probs", [
          { t: "Longest common subsequence", d: "Medium", q: "Length of the longest sequence that is a subsequence of both strings.", ex: "abbcdgf vs bacdegf → 5 (acdgf)\ndemocrat vs republican → 3 (eca)\nabcd vs aebd → 3 (abd)",
            ap: [
              { n: "Brute force", cx: "O(2^(N+M)) time · O(N+M) space",
                idea: "Compare the last characters. If they match, both can be used: 1 + lcs(i-1, j-1). Otherwise one of them is useless: max(lcs(i-1, j), lcs(i, j-1)). Plain recursion branches twice on every mismatch.",
                code: "def lcs(s1, s2):\n    def go(i, j):                  # LCS of s1[:i] and s2[:j]\n        if i == 0 or j == 0:\n            return 0\n        if s1[i - 1] == s2[j - 1]:\n            return 1 + go(i - 1, j - 1)\n        return max(go(i - 1, j), go(i, j - 1))\n\n    return go(len(s1), len(s2))" },
              { n: "Better", cx: "O(N·M) time · O(N·M) space",
                idea: "Memoize on the pair of prefix lengths (i, j).",
                code: "def lcs(s1, s2):\n    n, m = len(s1), len(s2)\n    memo = [[-1] * (m + 1) for _ in range(n + 1)]\n\n    def go(i, j):\n        if i == 0 or j == 0:\n            return 0\n        if memo[i][j] == -1:\n            if s1[i - 1] == s2[j - 1]:\n                memo[i][j] = 1 + go(i - 1, j - 1)\n            else:\n                memo[i][j] = max(go(i - 1, j), go(i, j - 1))\n        return memo[i][j]\n\n    return go(n, m)" },
              { n: "Optimal", cx: "O(N·M) time · O(N·M) space",
                idea: "Tabulate row by row. Row 0 and column 0 are the empty-string base cases (0). <b>Match → diagonal + 1, mismatch → max(up, left)</b>.",
                code: "def lcs(s1, s2):\n    n, m = len(s1), len(s2)\n    dp = [[0] * (m + 1) for _ in range(n + 1)]\n    for i in range(1, n + 1):\n        for j in range(1, m + 1):\n            if s1[i - 1] == s2[j - 1]:\n                dp[i][j] = 1 + dp[i - 1][j - 1]\n            else:\n                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])\n    return dp[n][m]" },
              { n: "Space-optimised", cx: "O(N·M) time · O(min(N,M)) space",
                idea: "Each row only reads the row above, so keep <b>two rows</b> (make s2 the shorter string).",
                code: "def lcs(s1, s2):\n    if len(s2) > len(s1):\n        s1, s2 = s2, s1\n    m = len(s2)\n    prev = [0] * (m + 1)\n    for i in range(1, len(s1) + 1):\n        cur = [0] * (m + 1)\n        for j in range(1, m + 1):\n            if s1[i - 1] == s2[j - 1]:\n                cur[j] = 1 + prev[j - 1]\n            else:\n                cur[j] = max(prev[j], cur[j - 1])\n        prev = cur\n    return prev[m]" }],
            viz: "lcs", lc: "longest-common-subsequence" },
          { t: "Edit distance (with costs)", d: "Medium", q: "Convert s1 into s2 by editing s1 only: insert (Ci), delete (Cd), replace (Cr). Minimise cost. LeetCode is all costs 1.", ex: "Ci=2, Cd=2, Cr=3:\nac → abc: insert b = 2\nabcd → abe: delete d + replace c→e = 5\nabdxy → abcgx = 7",
            ap: [
              { n: "Brute force", cx: "O(3^(N+M)) time · O(N+M) space",
                idea: "Look at the last characters. Equal → free, shrink both. Different → try all three edits: insert (Ci, s2 shrinks), delete (Cd, s1 shrinks), replace (Cr, both shrink). Three branches per mismatch.",
                code: "def edit_distance(s1, s2, ci=1, cd=1, cr=1):\n    def go(i, j):                  # cost to turn s1[:i] into s2[:j]\n        if i == 0:\n            return ci * j          # insert everything\n        if j == 0:\n            return cd * i          # delete everything\n        if s1[i - 1] == s2[j - 1]:\n            return go(i - 1, j - 1)\n        return min(ci + go(i, j - 1),       # insert s2[j-1]\n                   cd + go(i - 1, j),       # delete s1[i-1]\n                   cr + go(i - 1, j - 1))   # replace\n\n    return go(len(s1), len(s2))" },
              { n: "Better", cx: "O(N·M) time · O(N·M) space",
                idea: "Memoize on (i, j).",
                code: "def edit_distance(s1, s2, ci=1, cd=1, cr=1):\n    memo = {}\n\n    def go(i, j):\n        if i == 0:\n            return ci * j\n        if j == 0:\n            return cd * i\n        if (i, j) not in memo:\n            if s1[i - 1] == s2[j - 1]:\n                memo[(i, j)] = go(i - 1, j - 1)\n            else:\n                memo[(i, j)] = min(ci + go(i, j - 1),\n                                   cd + go(i - 1, j),\n                                   cr + go(i - 1, j - 1))\n        return memo[(i, j)]\n\n    return go(len(s1), len(s2))" },
              { n: "Optimal", cx: "O(N·M) time · O(N·M) space",
                idea: "Tabulate. Base: dp[i][0] = Cd·i (delete everything), dp[0][j] = Ci·j (insert everything). Remember the direction: <b>← insert, ↑ delete, ↖ replace</b>.",
                code: "def edit_distance(s1, s2, ci=1, cd=1, cr=1):\n    n, m = len(s1), len(s2)\n    dp = [[0] * (m + 1) for _ in range(n + 1)]\n    for i in range(n + 1):\n        dp[i][0] = cd * i\n    for j in range(m + 1):\n        dp[0][j] = ci * j\n    for i in range(1, n + 1):\n        for j in range(1, m + 1):\n            if s1[i - 1] == s2[j - 1]:\n                dp[i][j] = dp[i - 1][j - 1]\n            else:\n                dp[i][j] = min(ci + dp[i][j - 1],       # insert  (left)\n                               cd + dp[i - 1][j],       # delete  (up)\n                               cr + dp[i - 1][j - 1])   # replace (diagonal)\n    return dp[n][m]" },
              { n: "Space-optimised", cx: "O(N·M) time · O(M) space",
                idea: "Each row reads only itself (left) and the row above, so keep <b>two rows</b>.",
                code: "def edit_distance(s1, s2, ci=1, cd=1, cr=1):\n    m = len(s2)\n    prev = [ci * j for j in range(m + 1)]\n    for i in range(1, len(s1) + 1):\n        cur = [cd * i] + [0] * m\n        for j in range(1, m + 1):\n            if s1[i - 1] == s2[j - 1]:\n                cur[j] = prev[j - 1]\n            else:\n                cur[j] = min(ci + cur[j - 1], cd + prev[j], cr + prev[j - 1])\n        prev = cur\n    return prev[m]" }],
            viz: "dp_editDistance", lc: "edit-distance" },
          { t: "Wildcard pattern matching", d: "Hard", q: "Pattern with '?' (exactly one char) and '*' (any sequence, even empty). Does it match the whole text?", ex: "abacd / a?ac? → true\nxbbzzc / x*z* → true\nxbbzz / x*z***?z → false\nxbbzz / x*z***? → true",
            ap: [
              { n: "Brute force", cx: "Exponential time · O(N+M) space",
                idea: "Match left to right. '?' or the same char consumes one of each. '*' either <b>matches nothing</b> (skip it) or <b>eats one text char and stays</b>, so each star tries every length.",
                code: "def is_match(s, p):\n    def go(i, j):                  # does s[i:] match p[j:]?\n        if j == len(p):\n            return i == len(s)\n        if p[j] == '*':\n            return go(i, j + 1) or (i < len(s) and go(i + 1, j))\n        if i < len(s) and p[j] in ('?', s[i]):\n            return go(i + 1, j + 1)\n        return False\n\n    return go(0, 0)" },
              { n: "Better", cx: "O(N·M) time · O(N·M) space",
                idea: "Only (i, j) changes: memoize it.",
                code: "from functools import lru_cache\n\n\ndef is_match(s, p):\n    @lru_cache(maxsize=None)\n    def go(i, j):\n        if j == len(p):\n            return i == len(s)\n        if p[j] == '*':\n            return go(i, j + 1) or (i < len(s) and go(i + 1, j))\n        if i < len(s) and p[j] in ('?', s[i]):\n            return go(i + 1, j + 1)\n        return False\n\n    return go(0, 0)" },
              { n: "Optimal", cx: "O(N·M) time · O(N·M) space (O(M) with two rows)",
                idea: "Same char or '?' → diagonal. '*' → <b>dp[i][j-1]</b> (star matches empty) OR <b>dp[i-1][j]</b> (star eats s[i-1] and stays). Base: empty text matches only a prefix of all stars.",
                code: "def is_match(s, p):\n    n, m = len(s), len(p)\n    dp = [[False] * (m + 1) for _ in range(n + 1)]\n    dp[0][0] = True\n    for j in range(1, m + 1):\n        dp[0][j] = dp[0][j - 1] and p[j - 1] == '*'\n    for i in range(1, n + 1):\n        for j in range(1, m + 1):\n            if p[j - 1] == '*':\n                dp[i][j] = dp[i][j - 1] or dp[i - 1][j]\n            elif p[j - 1] in ('?', s[i - 1]):\n                dp[i][j] = dp[i - 1][j - 1]\n    return dp[n][m]" }],
            lc: "wildcard-matching" },
          { t: "Regular expression matching", d: "Hard", q: "'.' matches any char; 'x*' means zero or more of the preceding x. Match the whole string.", ex: "aa / a → false\naa / a* → true\naab / c*a*b → true",
            ap: [
              { n: "Brute force", cx: "Exponential time · O(N+M) space",
                idea: "Unlike wildcard, '*' binds to the char before it. If p[j+1] is '*', either use <b>zero copies</b> (skip 'x*') or, if the first char matches, <b>consume one char</b> and keep 'x*'.",
                code: "def is_match(s, p):\n    def go(i, j):                  # does s[i:] match p[j:]?\n        if j == len(p):\n            return i == len(s)\n        first = i < len(s) and p[j] in ('.', s[i])\n        if j + 1 < len(p) and p[j + 1] == '*':\n            return go(i, j + 2) or (first and go(i + 1, j))\n        return first and go(i + 1, j + 1)\n\n    return go(0, 0)" },
              { n: "Better", cx: "O(N·M) time · O(N·M) space",
                idea: "Memoize (i, j).",
                code: "from functools import lru_cache\n\n\ndef is_match(s, p):\n    @lru_cache(maxsize=None)\n    def go(i, j):\n        if j == len(p):\n            return i == len(s)\n        first = i < len(s) and p[j] in ('.', s[i])\n        if j + 1 < len(p) and p[j + 1] == '*':\n            return go(i, j + 2) or (first and go(i + 1, j))\n        return first and go(i + 1, j + 1)\n\n    return go(0, 0)" },
              { n: "Optimal", cx: "O(N·M) time · O(N·M) space",
                idea: "Bottom-up on prefixes. For p[j-1] == '*': <b>zero copies</b> → dp[i][j-2]; <b>one more copy</b> → if p[j-2] matches s[i-1], dp[i-1][j]. Otherwise a char or '.' → diagonal.",
                code: "def is_match(s, p):\n    n, m = len(s), len(p)\n    dp = [[False] * (m + 1) for _ in range(n + 1)]\n    dp[0][0] = True\n    for j in range(2, m + 1):\n        dp[0][j] = p[j - 1] == '*' and dp[0][j - 2]   # e.g. a*b* matches \"\"\n    for i in range(1, n + 1):\n        for j in range(1, m + 1):\n            if p[j - 1] == '*':\n                zero = dp[i][j - 2]\n                more = p[j - 2] in ('.', s[i - 1]) and dp[i - 1][j]\n                dp[i][j] = zero or more\n            elif p[j - 1] in ('.', s[i - 1]):\n                dp[i][j] = dp[i - 1][j - 1]\n    return dp[n][m]" }],
            lc: "regular-expression-matching" }]]
      ]},

      { h: "LIS and palindromes", blocks: [
        ["p", "Two more state shapes. <b>LIS</b>: dp[i] = best answer that <b>ends at i</b>, so the final answer is the max over all i. <b>Interval DP</b>: dp[i][j] for the substring s[i..j], filled by increasing length (gap) because each cell needs the shorter one inside it."],
        ["viz", "lis", "For each i, look back at smaller values and extend the best chain."],
        ["viz", "dp_palGap", "Diagonal by diagonal: a substring is a palindrome when its ends match and its inside is a palindrome."],
        ["probs", [
          { t: "Longest increasing subsequence", d: "Medium", q: "Length of the longest strictly increasing subsequence.", ex: "[6,9,10,13,20] → 5   [13,6,2,1] → 1\n[10,3,12,7,9,11,20,11,13,6,8] → 5\ndp = 1 1 2 2 3 4 5 4 5 2 3",
            ap: [
              { n: "Brute force", cx: "O(2^N) time · O(N) space",
                idea: "For each element, take it (if it is bigger than the last taken one) or skip it. That explores every subsequence.",
                code: "def length_of_lis(a):\n    def go(i, prev):               # best from a[i:], prev = index of last taken\n        if i == len(a):\n            return 0\n        best = go(i + 1, prev)     # skip a[i]\n        if prev == -1 or a[i] > a[prev]:\n            best = max(best, 1 + go(i + 1, i))\n        return best\n\n    return go(0, -1)" },
              { n: "Better", cx: "O(N²) time · O(N) space",
                idea: "dp[i] = longest increasing subsequence <b>ending at i</b> = 1 + max dp[j] over j < i with a[j] < a[i]. The answer is the <b>max of dp</b>, not dp[N-1]. dp = 1 1 2 2 3 4 5 4 5 2 3.",
                code: "def length_of_lis(a):\n    n = len(a)\n    dp = [1] * n\n    for i in range(n):\n        for j in range(i):\n            if a[j] < a[i]:\n                dp[i] = max(dp[i], dp[j] + 1)\n    return max(dp, default=0)" },
              { n: "Optimal", cx: "O(N log N) time · O(N) space",
                idea: "Keep tails[k] = <b>smallest possible last value</b> of an increasing subsequence of length k+1. For each x, binary-search the first tail ≥ x and replace it (or append). len(tails) is the answer. For [10,9,2,5,3,7,101,18] tails end as [2,3,7,18] → 4.",
                code: "from bisect import bisect_left\n\n\ndef length_of_lis(a):\n    tails = []\n    for x in a:\n        k = bisect_left(tails, x)      # first index with tails[k] >= x\n        if k == len(tails):\n            tails.append(x)\n        else:\n            tails[k] = x\n    return len(tails)" }],
            viz: "lis", lc: "longest-increasing-subsequence" },
          { t: "Longest increasing subarray (contiguous)", d: "Easy", q: "Longest run of strictly increasing adjacent elements.", ex: "[1,2,3,7,5,3,11,25,30,40,20] → 5 (3,11,25,30,40)",
            ap: [
              { n: "Brute force", cx: "O(N²) time · O(1) space",
                idea: "From every start, walk right while the values keep increasing.",
                code: "def longest_run(a):\n    best = 0\n    for i in range(len(a)):\n        j = i\n        while j + 1 < len(a) and a[j + 1] > a[j]:\n            j += 1\n        best = max(best, j - i + 1)\n    return best" },
              { n: "Optimal", cx: "O(N) time · O(1) space",
                idea: "Contiguous needs no DP table: one pass, <b>reset the run length</b> to 1 whenever a[i] ≤ a[i-1].",
                code: "def longest_run(a):\n    if not a:\n        return 0\n    best = run = 1\n    for i in range(1, len(a)):\n        run = run + 1 if a[i] > a[i - 1] else 1\n        best = max(best, run)\n    return best" }],
            lc: "longest-continuous-increasing-subsequence" },
          { t: "Russian doll envelopes", d: "Hard", q: "Envelopes (h, w). One fits inside another iff both h and w are strictly smaller. Max nesting depth.", ex: "A(5,6) B(6,4) C(6,7) D(4,3) → 3 (D ⊂ A ⊂ C)\nh=[9,5,10,3,4,2], w=[3,4,8,2,3,7] → 4",
            ap: [
              { n: "Brute force", cx: "O(N²) time · O(N) space",
                idea: "Sorting by height, width, area or h/w alone does not give a chain. <b>Sort by one dimension, then run the O(N²) LIS</b> requiring both h[j] < h[i] and w[j] < w[i] (this handles equal heights). Correct but too slow for large N.",
                code: "def max_envelopes(env):\n    env = sorted(env)\n    n = len(env)\n    dp = [1] * n                   # longest chain ending with envelope i\n    for i in range(n):\n        for j in range(i):\n            if env[j][0] < env[i][0] and env[j][1] < env[i][1]:\n                dp[i] = max(dp[i], dp[j] + 1)\n    return max(dp, default=0)" },
              { n: "Optimal", cx: "O(N log N) time · O(N) space",
                idea: "Sort h ascending and, for equal h, <b>w descending</b> so two envelopes with the same height can never chain. Then run the tails LIS on w alone.",
                code: "from bisect import bisect_left\n\n\ndef max_envelopes(env):\n    env = sorted(env, key=lambda e: (e[0], -e[1]))\n    tails = []\n    for _, w in env:\n        k = bisect_left(tails, w)\n        if k == len(tails):\n            tails.append(w)\n        else:\n            tails[k] = w\n    return len(tails)" }],
            lc: "russian-doll-envelopes" },
          { t: "Palindromic substrings: count and longest", d: "Medium", q: "Decide for every s[i..j] whether it is a palindrome, then count them and find the longest.", ex: "abac → a, b, a, c, aba = 5, longest aba\ncbcacbbc → 13, longest bcacb",
            ap: [
              { n: "Brute force", cx: "O(N³) time · O(1) space",
                idea: "Every substring (O(N²)) checked by reversing it (O(N)).",
                code: "def palindromes(s):\n    count = 0\n    best = \"\"\n    for i in range(len(s)):\n        for j in range(i, len(s)):\n            sub = s[i:j + 1]\n            if sub == sub[::-1]:\n                count += 1\n                if len(sub) > len(best):\n                    best = sub\n    return count, best" },
              { n: "Better", cx: "O(N²) time · O(N²) space",
                idea: "If s[i] == s[j], s[i..j] is a palindrome iff s[i+1..j-1] is. Base: gap 0 true, gap 1 s[i] == s[j]. <b>Fill by gap</b> (diagonals) so the inner cell is always ready.",
                code: "def palindromes(s):\n    n = len(s)\n    dp = [[False] * n for _ in range(n)]\n    count = 0\n    best = \"\"\n    for gap in range(n):\n        for i in range(n - gap):\n            j = i + gap\n            if gap == 0:\n                dp[i][j] = True\n            elif gap == 1:\n                dp[i][j] = s[i] == s[j]\n            else:\n                dp[i][j] = s[i] == s[j] and dp[i + 1][j - 1]\n            if dp[i][j]:\n                count += 1\n                if gap + 1 > len(best):\n                    best = s[i:j + 1]\n    return count, best" },
              { n: "Optimal", cx: "O(N²) time · O(1) space",
                idea: "<b>Expand around each of the 2N-1 centres</b> (each char and each gap between chars) while the ends match. Every successful expansion is one palindrome, so count and longest come out together without a table.",
                code: "def palindromes(s):\n    n = len(s)\n    count = 0\n    best = \"\"\n    for c in range(2 * n - 1):\n        l, r = c // 2, (c + 1) // 2    # odd centre (l == r) or even centre\n        while l >= 0 and r < n and s[l] == s[r]:\n            count += 1\n            if r - l + 1 > len(best):\n                best = s[l:r + 1]\n            l -= 1\n            r += 1\n    return count, best" }],
            viz: "dp_palGap", lc: "palindromic-substrings" },
          { t: "Palindrome partitioning: minimum cuts", d: "Hard", q: "Cut the string into palindromic pieces with the fewest cuts.", ex: "xxy → 1 (xx|y)   abbac → 1 (abba|c)\nxabaabp → 3 (x|a|baab|p)   abbcbc → 2 (a|bb|cbc)\ncbcacbbc → 2 (cbc|a|cbbc), dp = 0 1 0 1 2 1 2 2",
            ap: [
              { n: "Brute force", cx: "O(N·2^N) time · O(N) space",
                idea: "Greedy longest-palindrome-first is unreliable: on cbcacbbc it can give c|bcacb|b|c (3 cuts) when 2 is optimal. So <b>try every palindromic first piece</b> and recurse on the rest.",
                code: "def min_cut(s):\n    def go(i):                     # min pieces for s[i:]\n        if i == len(s):\n            return 0\n        best = float('inf')\n        for j in range(i, len(s)):\n            piece = s[i:j + 1]\n            if piece == piece[::-1]:\n                best = min(best, 1 + go(j + 1))\n        return best\n\n    return go(0) - 1               # pieces - 1 = cuts" },
              { n: "Better", cx: "O(N³) time · O(N) space",
                idea: "Memoize go(i). Still O(N) per palindrome check, so N² pieces × N = O(N³).",
                code: "def min_cut(s):\n    n = len(s)\n    memo = [-1] * (n + 1)\n\n    def go(i):\n        if i == n:\n            return 0\n        if memo[i] == -1:\n            best = float('inf')\n            for j in range(i, n):\n                piece = s[i:j + 1]\n                if piece == piece[::-1]:\n                    best = min(best, 1 + go(j + 1))\n            memo[i] = best\n        return memo[i]\n\n    return go(0) - 1" },
              { n: "Optimal", cx: "O(N²) time · O(N²) space",
                idea: "Precompute the gap table so each palindrome check is O(1). dp[j] = min cuts for prefix s[0..j]: 0 if s[0..j] is a palindrome, else try the <b>last piece</b> s[cut..j]: 1 + min dp[cut-1]. For cbcacbbc, dp = 0 1 0 1 2 1 2 2.",
                code: "def min_cut(s):\n    n = len(s)\n    pal = [[False] * n for _ in range(n)]\n    for gap in range(n):\n        for i in range(n - gap):\n            j = i + gap\n            pal[i][j] = s[i] == s[j] and (gap < 2 or pal[i + 1][j - 1])\n    dp = [0] * n                   # dp[j] = min cuts for s[0..j]\n    for j in range(n):\n        if pal[0][j]:\n            continue               # whole prefix is a palindrome: 0 cuts\n        dp[j] = float('inf')\n        for cut in range(1, j + 1):\n            if pal[cut][j]:        # last piece s[cut..j]\n                dp[j] = min(dp[j], dp[cut - 1] + 1)\n    return dp[n - 1]" }],
            viz: "dp_palGap", lc: "palindrome-partitioning-ii" },
          { t: "Longest palindromic substring", d: "Medium", q: "Return the longest substring that is a palindrome.", ex: "babad → bab (or aba)\ncbbd → bb",
            ap: [
              { n: "Brute force", cx: "O(N³) time · O(1) space",
                idea: "Check every substring by reversing it and keep the longest.",
                code: "def longest_palindrome(s):\n    best = \"\"\n    for i in range(len(s)):\n        for j in range(i, len(s)):\n            sub = s[i:j + 1]\n            if len(sub) > len(best) and sub == sub[::-1]:\n                best = sub\n    return best" },
              { n: "Better", cx: "O(N²) time · O(N²) space",
                idea: "The gap table from the previous problem: dp[i][j] = s[i] == s[j] and dp[i+1][j-1], filled by length.",
                code: "def longest_palindrome(s):\n    n = len(s)\n    dp = [[False] * n for _ in range(n)]\n    best = \"\"\n    for gap in range(n):\n        for i in range(n - gap):\n            j = i + gap\n            dp[i][j] = s[i] == s[j] and (gap < 2 or dp[i + 1][j - 1])\n            if dp[i][j] and gap + 1 > len(best):\n                best = s[i:j + 1]\n    return best" },
              { n: "Optimal", cx: "O(N²) time · O(1) space",
                idea: "<b>Expand around each of the 2N-1 centres</b> (each char and each gap) while the ends match. Same O(N²) time, no table.",
                code: "def longest_palindrome(s):\n    n = len(s)\n    best = \"\"\n    for c in range(2 * n - 1):\n        l, r = c // 2, (c + 1) // 2\n        while l >= 0 and r < n and s[l] == s[r]:\n            l -= 1\n            r += 1\n        if r - l - 1 > len(best):      # s[l+1 .. r-1] is the palindrome\n            best = s[l + 1:r]\n    return best" }],
            lc: "longest-palindromic-substring" }]]
      ]},

      { h: "Interview cheatsheet", blocks: [
        ["table", ["Pattern", "State", "Transition", "Fill order", "Space trick"], [
          ["Fibonacci-like (stairs, robber)", "dp[i]", "dp[i-1], dp[i-2]", "i ascending", "2 variables"],
          ["Min/max over choices (squares, jumps, rod)", "dp[i]", "best over all choices j", "i ascending", "already 1-D"],
          ["Grid paths", "dp[i][j]", "top + left", "row by row", "1 row"],
          ["Reverse grid (dungeon)", "need[i][j]", "max(1, min(down, right) − a)", "bottom-right → top-left", "1 row"],
          ["0/1 knapsack, subset sum", "dp[i][cap]", "skip vs take from row i-1", "cap descending in 1-D", "1 row"],
          ["Unbounded knapsack, coin combos", "dp[cap]", "take from the same row", "cap ascending", "1 row"],
          ["Ordered vs unordered counts", "dp[amount]", "loop nesting decides", "amount outer = ordered; coin outer = unordered", "1 row"],
          ["Value-indexed knapsack", "dp[value] = min weight", "min", "value descending", "1 row"],
          ["Two strings (LCS, edit, wildcard)", "dp[i][j] on prefixes", "diagonal / up / left", "row by row", "2 rows"],
          ["LIS", "dp[i] ending at i", "max over j < i with a[j] < a[i]", "i ascending", "tails + binary search"],
          ["Interval (palindromes)", "dp[i][j]", "dp[i+1][j-1]", "by gap", "—"],
          ["Partition (min cuts, word break)", "dp[j] for a prefix", "try the last piece", "j ascending", "needs a lookup table"],
          ["Stock state machine", "buy / sell balances", "max(keep, act)", "day ascending", "O(1) variables"]]],
        ["warn", "Common bugs: wrong base case (ways to pay 0 is <b>1</b>); answer read from dp[N-1] when the state is 'ends at i' (take the max); 0/1 knapsack 1-D loop running upwards; using a boolean memo table that can't express 'not computed'; updating stock states in place without yesterday's values when the order matters."],
        ["list", ["Say the state in words before writing code: 'dp[i][j] is the minimum cost to turn the first i chars into the first j chars'.", "If greedy looks tempting, try a tiny counter-example (12 squares, coins {1,3,4} for 6, toys (7,5) vs (4,3)+(5,4)). If it breaks, it's DP.", "Write top-down first if the recurrence is clear, then convert to bottom-up and shrink space when asked.", "Complexity = number of states × work per state."]]
      ]}
    ],
    lc: [
      ["Climbing Stairs", "climbing-stairs", "Easy"],
      ["House Robber", "house-robber", "Medium"],
      ["Perfect Squares", "perfect-squares", "Medium"],
      ["Coin Change", "coin-change", "Medium"],
      ["Coin Change II", "coin-change-ii", "Medium"],
      ["Word Break", "word-break", "Medium"],
      ["Longest Increasing Subsequence", "longest-increasing-subsequence", "Medium"],
      ["Unique Paths II", "unique-paths-ii", "Medium"],
      ["Minimum Path Sum", "minimum-path-sum", "Medium"],
      ["Triangle", "triangle", "Medium"],
      ["Dungeon Game", "dungeon-game", "Hard"],
      ["Longest Common Subsequence", "longest-common-subsequence", "Medium"],
      ["Edit Distance", "edit-distance", "Medium"],
      ["Wildcard Matching", "wildcard-matching", "Hard"],
      ["Longest Palindromic Substring", "longest-palindromic-substring", "Medium"],
      ["Palindrome Partitioning II", "palindrome-partitioning-ii", "Hard"],
      ["Russian Doll Envelopes", "russian-doll-envelopes", "Hard"],
      ["Partition Equal Subset Sum", "partition-equal-subset-sum", "Medium"],
      ["Partition to K Equal Sum Subsets", "partition-to-k-equal-sum-subsets", "Medium"],
      ["Best Time to Buy and Sell Stock III", "best-time-to-buy-and-sell-stock-iii", "Hard"]
    ],
    quiz: [
      { q: "Which two properties must a problem have for DP to help?", o: ["Sorted input and unique values", "Optimal substructure and overlapping subproblems", "Greedy choice and a heap", "A tree shape and no cycles"], a: 1, why: "The answer must be built from sub-answers (optimal substructure), and those sub-answers must repeat (overlap), or caching saves nothing." },
      { q: "In 1-D 0/1 knapsack, why does the capacity loop run from W down to w?", o: ["It is faster", "So dp[j − w] still holds the value from before this item, preventing reuse", "So the answer ends up in dp[0]", "It doesn't matter"], a: 1, why: "Going upwards would let dp[j − w] already include the current item, which turns 0/1 into unbounded." },
      { q: "Counting coin combinations where {1,4} and {4,1} are the same: which loop is outside?", o: ["Amount", "Coins", "Either, same result", "Neither; you need 2-D"], a: 1, why: "Coins outer means once you move past a coin you never use it again later in the sequence, so each multiset is counted once. Amount outer counts orders." },
      { q: "For LIS with dp[i] = longest increasing subsequence ending at i, what is the answer?", o: ["dp[N-1]", "dp[0]", "max of all dp[i]", "sum of dp"], a: 2, why: "The best subsequence can end anywhere, so take the maximum over all end positions." },
      { q: "Why does the dungeon problem fill from bottom-right to top-left?", o: ["To use less memory", "The health you need now depends on what comes later, so you solve from the destination back", "Because the grid is sorted", "Top-left is the base case"], a: 1, why: "A large reward later doesn't save you if you die earlier. Knowing the need of the future cells lets you compute the need of the current one." },
      { q: "In the palindrome table, why fill by gap (substring length)?", o: ["Gap order is alphabetical", "dp[i][j] needs dp[i+1][j-1], a shorter substring", "To skip half the cells", "Row order gives wrong answers only for even lengths"], a: 1, why: "Each cell depends on the inner substring, which has gap − 2, so all shorter lengths must be done first." },
      { q: "W is up to 1e9 but values are at most 50 and N ≤ 500. What do you index the DP by?", o: ["Capacity", "Total value, storing the minimum weight for each value", "Item count only", "You can't use DP"], a: 1, why: "Σvalue ≤ 25,000 is small. dp[v] = min weight to reach value v, then pick the largest v with dp[v] ≤ W." },
      { q: "Edit distance: dp[i][j-1] + Ci corresponds to which operation?", o: ["Delete from s1", "Insert s2[j-1] into s1", "Replace", "Match"], a: 1, why: "After inserting s2[j-1], it is matched, so only s2's prefix shrinks: left neighbour (i, j-1)." }
    ]
  };

  /* ═════════════════════════ GREEDY ═════════════════════════ */
  T["greedy"] = {
    name: "Greedy algorithms", icon: "🎯", color: "#c4561f", minutes: 60,
    notes: "greedy.pdf, DP3, DP5, Questionset1.pdf",
    summary: "Make the locally best choice by the right key, prove it can never hurt, and never look back.",
    sections: [
      { h: "What greedy is, and how to trust it", blocks: [
        ["analogy", "Buying an iPhone: Flipkart 74K, Amazon 73K, Paytm 70K. Pick Paytm; done. But choosing a job by the highest package (22, 25, 28 LPA) can be wrong once WFH, 5-day weeks and flexible hours matter. <b>Greedy works only when your one key captures everything that matters.</b>"],
        ["p", "A greedy algorithm sorts or orders choices by some key and commits to the best one at each step. It is usually O(N log N) and short to code. The hard part is picking the key and showing it is safe."],
        ["steps", [
          ["Guess a key", "Max profit first? Earliest deadline? Shortest job? Earliest end? Highest ratio?"],
          ["Attack it with tiny counter-examples", "The notes kill 'shortest duration first' and 'earliest start first' with 3-job examples before landing on 'earliest end'. Spend two minutes here; it saves an hour."],
          ["Prove it (exchange argument)", "Take any optimal answer. Show you can swap its first choice for the greedy choice without making it worse. Then the greedy choice is part of some optimal answer; repeat on the rest."],
          ["Or fix past mistakes", "If no single order works, process in a forced order and keep a heap so you can <b>undo the worst earlier choice</b> when a better one arrives (expiry problem)."]]],
        ["table", ["Problem", "Tempting greedy", "Counter-example", "Use instead"], [
          ["Coin change (fewest coins)", "largest coin first", "coins {1,3,4}, amount 6: greedy 4+1+1 = 3 coins, optimum 3+3 = 2", "DP"],
          ["0/1 knapsack", "best value/weight first", "W=7, h=[4,1,5,7], w=[3,2,4,5]: greedy 8, optimum 9", "DP"],
          ["Perfect squares", "largest square first", "12 = 9+1+1+1 (4) vs 4+4+4 (3)", "DP"],
          ["Palindrome partition", "longest palindrome first", "cbcacbbc: c|bcacb|b|c = 3 cuts vs 2", "DP"],
          ["Dungeon", "max-sum path", "a big reward after a deadly cell", "reverse DP"],
          ["Fractional knapsack", "best ratio first", "none: works", "greedy"],
          ["Activity selection", "earliest end first", "none: works", "greedy"]]],
        ["warn", "Greedy for coin change works for 'canonical' systems like Indian/US coins, but not for arbitrary ones. In an interview, assume arbitrary denominations unless told otherwise."]
      ]},

      { h: "Intervals: sort by end", blocks: [
        ["p", "When jobs compete for one resource, the job that <b>ends first</b> leaves the most room for everything after it. 'Start early' and 'short duration' each fail on their own; combined they become 'end early'."],
        ["viz", "activitySelection", "Sorted by end time; take a job if it starts at or after the last taken end."],
        ["probs", [
          { t: "Activity selection: max jobs, one at a time", d: "Medium", co: "Flipkart", q: "N jobs with start and end times; you can do only one at a time. Maximise the number of jobs.", ex: "9–11AM, 10AM–1PM, 10AM–3PM, 2–4PM, 4–6PM, 7–8PM, 7–9PM, 8–10PM → 5\nS=[1,5,8,7,12,13], E=[2,10,10,11,20,19] → 3 (1–2, 5–10, 13–19)",
            ap: [
              { n: "Brute force", cx: "O(2^N · N log N) time · O(N) space",
                idea: "Try subsets from largest to smallest and return the first one with no clash. Tempting shortcuts fail: shortest first (10–13 blocks 6–11 and 12–19), earliest start (2–12 blocks 4–6 and 7–10).",
                code: "from itertools import combinations\n\n\ndef max_activities(S, E):\n    jobs = list(zip(S, E))\n    for size in range(len(jobs), 0, -1):\n        for pick in combinations(jobs, size):\n            pick = sorted(pick, key=lambda job: job[1])\n            if all(pick[i][0] >= pick[i - 1][1] for i in range(1, size)):\n                return size\n    return 0" },
              { n: "Optimal", cx: "O(N log N) time · O(N) space",
                idea: "Sort by <b>end time</b>; pick a job if its start ≥ the last picked end. Exchange argument: the optimal schedule's first job can be swapped for the earliest-ending job without a clash, so some optimal answer starts with it.",
                code: "def max_activities(S, E):\n    jobs = sorted(zip(S, E), key=lambda job: job[1])   # by end time\n    count = 0\n    last_end = float('-inf')\n    for s, e in jobs:\n        if s >= last_end:          # starts after the last picked job ends\n            count += 1\n            last_end = e\n    return count" }],
            edge: "Decide whether touching jobs (end == next start) are allowed; the notes allow them (start ≥ last end).", viz: "activitySelection" },
          { t: "Non-overlapping intervals (min removals)", d: "Medium", q: "Remove the fewest intervals so the rest don't overlap.", ex: "[[1,2],[2,3],[3,4],[1,3]] → 1 (remove [1,3])",
            ap: [
              { n: "Brute force", cx: "O(N²) time · O(N) space",
                idea: "Removals = N − the most intervals you can keep. Sort and run an LIS-style DP: dp[i] = longest chain of non-overlapping intervals ending with interval i. Correct, but quadratic.",
                code: "def erase_overlap_intervals(iv):\n    iv = sorted(iv, key=lambda x: x[1])\n    n = len(iv)\n    dp = [1] * n\n    for i in range(n):\n        for j in range(i):\n            if iv[j][1] <= iv[i][0]:\n                dp[i] = max(dp[i], dp[j] + 1)\n    return n - max(dp, default=0)" },
              { n: "Optimal", cx: "O(N log N) time · O(1) extra space",
                idea: "It is activity selection in reverse: <b>removals = N − max jobs you can keep</b>, using the same sort-by-end sweep.",
                code: "def erase_overlap_intervals(iv):\n    iv = sorted(iv, key=lambda x: x[1])\n    keep = 0\n    last = float('-inf')\n    for s, e in iv:\n        if s >= last:\n            keep += 1\n            last = e\n    return len(iv) - keep" }],
            lc: "non-overlapping-intervals" },
          { t: "Minimum arrows to burst balloons", d: "Medium", q: "Balloons are intervals on the x-axis; an arrow at x bursts all balloons covering x. Fewest arrows?", ex: "[[10,16],[2,8],[1,6],[7,12]] → 2 (x=6, x=12)",
            ap: [
              { n: "Brute force", cx: "O(N²) time · O(N) space",
                idea: "Without sorting: repeatedly find the balloon that <b>ends first</b>, shoot at its end, and remove every balloon that arrow bursts. Each round rescans everything that is left.",
                code: "def find_min_arrows(points):\n    left = [tuple(p) for p in points]\n    arrows = 0\n    while left:\n        x = min(e for s, e in left)        # earliest end among the rest\n        arrows += 1\n        left = [(s, e) for s, e in left if s > x]   # not burst by x\n    return arrows" },
              { n: "Optimal", cx: "O(N log N) time · O(1) extra space",
                idea: "Sort by end once; shoot at the first balloon's end. That arrow bursts every balloon starting ≤ that end. The next balloon starting after it needs a new arrow at its own end. Same exchange argument as activity selection.",
                code: "def find_min_arrows(points):\n    arrows = 0\n    x = float('-inf')                      # position of the last arrow\n    for s, e in sorted(points, key=lambda b: b[1]):\n        if s > x:                          # this balloon is not burst yet\n            arrows += 1\n            x = e\n    return arrows" }],
            lc: "minimum-number-of-arrows-to-burst-balloons" }]]
      ]},

      { h: "Deadlines with a min-heap", blocks: [
        ["p", "Some greedies need to <b>correct an earlier decision</b>. Go in deadline order, accept everything that fits, and when time runs out, compare the new item with the worst one you accepted. A min-heap gives that worst item in O(log N)."],
        ["viz", "heap", "The heap that holds accepted profits; its top is the cheapest one to give up."],
        ["probs", [
          { t: "Flipkart grocery: sell before expiry", d: "Hard", co: "Flipkart", q: "Item i expires at A[i] and earns B[i]. Time starts at 0; each sale takes 1 unit; item i can be sold only if T < A[i]. Maximise profit.", ex: "A=[3,1,3,2,3], B=[6,5,3,1,9] → 20 (5, then 6, 9)\nA=[1,2], B=[3,1500] → 1503\nA=[1,3,3,3,5,5,5,8], B=[5,2,7,1,4,3,8,1] → 28",
            ap: [
              { n: "Brute force", cx: "O(2^N · N) time · O(N) space",
                idea: "Max profit first can waste early slots; min expiry first keeps low-profit early items. A chosen set is sellable iff, in expiry order, the k-th item (from 0) has k < expiry, so <b>try every subset</b> with that check.",
                code: "def max_profit(A, B):\n    items = sorted(zip(A, B))      # by expiry\n    n = len(items)\n    best = 0\n    for mask in range(1 << n):\n        t = 0\n        total = 0\n        ok = True\n        for i in range(n):\n            if mask >> i & 1:\n                if t >= items[i][0]:   # would sell after expiry\n                    ok = False\n                    break\n                total += items[i][1]\n                t += 1\n        if ok:\n            best = max(best, total)\n    return best" },
              { n: "Optimal", cx: "O(N log N) time · O(N) space",
                idea: "Sort by expiry. Keep a min-heap of accepted profits (heap size = current time T). If T < expiry, accept. Otherwise, if the heap's min is smaller, <b>pop the min and push this profit</b>: sell this item in that slot instead. Trace ex 1: push 5, 1, 6; 3 replaces 1; 9 replaces 3 → {5,6,9} = 20.",
                code: "import heapq\n\n\ndef max_profit(A, B):\n    heap = []                      # accepted profits; heap[0] is the worst\n    for exp, p in sorted(zip(A, B)):\n        t = len(heap)              # time used so far\n        if t < exp:\n            heapq.heappush(heap, p)\n        elif heap and heap[0] < p:\n            heapq.heapreplace(heap, p)   # drop the worst, sell this instead\n    return sum(heap)" }],
            viz: "heap", lc: "course-schedule-iii" },
          { t: "Task scheduler", d: "Medium", q: "Tasks with labels; equal tasks must be at least n slots apart. Minimum total slots (idle allowed).", ex: "tasks = AAABBB, n = 2 → 8 (A B idle A B idle A B)",
            ap: [
              { n: "Brute force", cx: "O(T · log 26) time · O(26) space",
                idea: "Simulate frames of n+1 slots: in each frame run the most frequent remaining tasks (max-heap of counts), then put back the ones that still have copies. Idle slots fill a frame only if tasks remain.",
                code: "import heapq\nfrom collections import Counter\n\n\ndef least_interval(tasks, n):\n    heap = [-c for c in Counter(tasks).values()]   # max-heap of counts\n    heapq.heapify(heap)\n    time = 0\n    while heap:\n        done = []\n        for _ in range(n + 1):     # one frame of n + 1 slots\n            if heap:\n                done.append(heapq.heappop(heap) + 1)\n        for c in done:\n            if c < 0:              # copies of this task remain\n                heapq.heappush(heap, c)\n        time += n + 1 if heap else len(done)\n    return time" },
              { n: "Optimal", cx: "O(N) time · O(26) space",
                idea: "The most frequent task sets the frame: <b>(maxCount − 1) blocks of size n+1, plus the number of tasks tied at maxCount</b>. If there are more tasks than that, there is no idle and the answer is len(tasks).",
                code: "from collections import Counter\n\n\ndef least_interval(tasks, n):\n    f = Counter(tasks)\n    m = max(f.values())\n    ties = sum(1 for c in f.values() if c == m)\n    return max(len(tasks), (m - 1) * (n + 1) + ties)" }],
            lc: "task-scheduler" }]]
      ]},

      { h: "Two-pass and reach greedies", blocks: [
        ["p", "Some rules point in two directions (left neighbour and right neighbour). Satisfy one direction per pass. Others are about <b>how far you can reach</b>: track the farthest point and never step back."],
        ["viz", "dp_candy", "Left pass fixes 'more than left neighbour', right pass fixes 'more than right neighbour' without breaking the first."],
        ["viz", "dp_jumpReach", "The window is everything reachable with the current jump count; the farthest reach sets the next window."],
        ["probs", [
          { t: "Candy distribution", d: "Hard", q: "Students in a row with marks. Everyone gets ≥ 1 candy; a student with more marks than an adjacent neighbour gets more candies than that neighbour. Minimise candies.", ex: "[1,5,2,1] → [1,3,2,1] = 7\n[4,4,4,4,4] → 5 (equal neighbours need nothing)\n[1,6,3,1,10,12,20,5,2] → [1,3,2,1,2,3,4,2,1] = 19",
            ap: [
              { n: "Brute force", cx: "O(N²) time · O(N) space",
                idea: "Start everyone at 1 and keep sweeping, <b>fixing any violated neighbour pair</b>, until a sweep changes nothing. A long falling slope needs about N sweeps.",
                code: "def candy(a):\n    n = len(a)\n    c = [1] * n\n    changed = True\n    while changed:\n        changed = False\n        for i in range(n):\n            if i > 0 and a[i] > a[i - 1] and c[i] <= c[i - 1]:\n                c[i] = c[i - 1] + 1\n                changed = True\n            if i + 1 < n and a[i] > a[i + 1] and c[i] <= c[i + 1]:\n                c[i] = c[i + 1] + 1\n                changed = True\n    return sum(c)" },
              { n: "Optimal", cx: "O(N) time · O(N) space",
                idea: "Start with all 1s. <b>Left → right</b>: if a[i] > a[i-1], c[i] = c[i-1] + 1. <b>Right → left</b>: if a[i] > a[i+1], c[i] = max(c[i], c[i+1] + 1). The second pass only raises values, so it never breaks the first.",
                code: "def candy(a):\n    n = len(a)\n    c = [1] * n\n    for i in range(1, n):                  # left neighbour rule\n        if a[i] > a[i - 1]:\n            c[i] = c[i - 1] + 1\n    for i in range(n - 2, -1, -1):         # right neighbour rule\n        if a[i] > a[i + 1]:\n            c[i] = max(c[i], c[i + 1] + 1)\n    return sum(c)" }],
            viz: "dp_candy", lc: "candy" },
          { t: "Jump game (can you reach the end?)", d: "Medium", q: "nums[i] is the max jump from i. Starting at 0, can you reach the last index?", ex: "[2,3,1,1,4] → true\n[3,2,1,0,4] → false (everything lands on the 0 at index 3)",
            ap: [
              { n: "Brute force", cx: "O(N²) time · O(N) space",
                idea: "DP: index i is reachable if some reachable j < i has j + nums[j] ≥ i.",
                code: "def can_jump(nums):\n    n = len(nums)\n    ok = [False] * n\n    ok[0] = True\n    for i in range(1, n):\n        for j in range(i):\n            if ok[j] and j + nums[j] >= i:\n                ok[i] = True\n                break\n    return ok[n - 1]" },
              { n: "Optimal", cx: "O(N) time · O(1) space",
                idea: "Track <b>far</b> = the farthest index reachable so far. Scan i; if i > far you are stuck; else far = max(far, i + nums[i]). The minimum-jumps version (Jump Game II) adds a jump counter each time the current window ends; see the DP topic.",
                code: "def can_jump(nums):\n    far = 0\n    for i in range(len(nums)):\n        if i > far:                # nothing reaches index i\n            return False\n        far = max(far, i + nums[i])\n    return True" }],
            viz: "dp_jumpReach", lc: "jump-game" },
          { t: "Gas station", d: "Medium", q: "Circular route; station i gives gas[i] and the trip to i+1 costs cost[i]. Return the start index to complete the circle, or -1.", ex: "gas=[1,2,3,4,5], cost=[3,4,5,1,2] → 3",
            ap: [
              { n: "Brute force", cx: "O(N²) time · O(1) space",
                idea: "Try every start and drive the full circle, giving up as soon as the tank goes negative.",
                code: "def can_complete_circuit(gas, cost):\n    n = len(gas)\n    for start in range(n):\n        tank = 0\n        ok = True\n        for k in range(n):\n            i = (start + k) % n\n            tank += gas[i] - cost[i]\n            if tank < 0:\n                ok = False\n                break\n        if ok:\n            return start\n    return -1" },
              { n: "Optimal", cx: "O(N) time · O(1) space",
                idea: "If total gas < total cost, impossible. Otherwise run once keeping the tank; <b>whenever the tank goes negative at i, no start in [start..i] can work</b> (they all arrive at i with even less), so restart from i+1 with an empty tank.",
                code: "def can_complete_circuit(gas, cost):\n    if sum(gas) < sum(cost):\n        return -1\n    tank = 0\n    start = 0\n    for i in range(len(gas)):\n        tank += gas[i] - cost[i]\n        if tank < 0:               # every start in start..i fails\n            start = i + 1\n            tank = 0\n    return start" }],
            lc: "gas-station" },
          { t: "Assign cookies", d: "Easy", q: "Child i is content with a cookie of size ≥ g[i]; each child gets at most one cookie. Maximise content children.", ex: "g=[1,2,3], s=[1,1] → 1\ng=[1,2], s=[1,2,3] → 2",
            ap: [
              { n: "Brute force", cx: "O(N·M) time · O(M) space",
                idea: "Go through children from least greedy; for each, scan all unused cookies for the <b>smallest one that is big enough</b>.",
                code: "def find_content_children(g, s):\n    used = [False] * len(s)\n    count = 0\n    for need in sorted(g):\n        best = -1\n        for k in range(len(s)):\n            if not used[k] and s[k] >= need and (best == -1 or s[k] < s[best]):\n                best = k\n        if best != -1:\n            used[best] = True\n            count += 1\n    return count" },
              { n: "Optimal", cx: "O(N log N + M log M) time · O(1) extra space",
                idea: "Sort both. Give each cookie, smallest first, to the least greedy child it satisfies. Using a big cookie on a small need can only hurt (exchange argument).",
                code: "def find_content_children(g, s):\n    g = sorted(g)\n    s = sorted(s)\n    i = 0                          # next child to satisfy\n    for c in s:\n        if i < len(g) and c >= g[i]:\n            i += 1\n    return i" }],
            lc: "assign-cookies" }]]
      ]},

      { h: "Fractional knapsack", blocks: [
        ["p", "If items can be cut, every unit of capacity should go to the <b>highest value-per-weight</b> item still available. Swapping any lower-ratio portion for higher-ratio portion never decreases value, so sorting by ratio is optimal. As soon as items cannot be cut (0/1), this breaks; see the knapsack section of DP."],
        ["math", [["Ratios h/w", "4/4, 8/4, 10/20, 2/8, 5/16", "1, 2, 0.5, 0.25, 0.3125"], ["Take whole (8,4), (4,4), (10,20)", "8 + 4 + 10", "22, capacity 40 → 12"], ["Cut (5,16) to 12", "5 × 12/16", "3.75"], ["Total", "22 + 3.75", "25.75"]], "Notes example: N=5, W=40, h=[4,8,10,2,5], w=[4,4,20,8,16]."],
        ["probs", [
          { t: "Fractional knapsack (cakes)", d: "Medium", q: "Cakes with happiness h[i] and weight w[i]; capacity W; a fraction f of a cake gives f·h[i]. Maximise happiness.", ex: "N=5, W=40, h=[4,8,10,2,5], w=[4,4,20,8,16] → 25.75",
            ap: [
              { n: "Solution", cx: "O(N log N) time · O(N) space",
                idea: "Max happiness first and min weight first both fail on this example. Sort by <b>h/w descending</b>; take whole cakes while they fit; cut the next one to fill the rest and stop.",
                code: "def fractional_knapsack(h, w, W):\n    items = sorted(zip(h, w), key=lambda x: x[0] / x[1], reverse=True)\n    ans = 0.0\n    for hp, wt in items:\n        if wt <= W:                # whole cake fits\n            ans += hp\n            W -= wt\n        else:                      # take the fraction that fits, then stop\n            ans += hp * W / wt\n            break\n    return ans" }] },
          { t: "Maximum units on a truck", d: "Easy", q: "Box types [count, unitsPerBox]; the truck holds truckSize boxes. Maximise units.", ex: "[[1,3],[2,2],[3,1]], truckSize 4 → 8",
            ap: [
              { n: "Solution", cx: "O(N log N) time · O(1) extra space",
                idea: "Every box costs one slot, so sort by units per box descending and load greedily. It is fractional knapsack with unit weights.",
                code: "def maximum_units(box_types, truck_size):\n    total = 0\n    for cnt, units in sorted(box_types, key=lambda b: b[1], reverse=True):\n        take = min(cnt, truck_size)\n        total += take * units\n        truck_size -= take\n        if truck_size == 0:\n            break\n    return total" }],
            lc: "maximum-units-on-a-truck" }]]
      ]},

      { h: "Patterns and pitfalls", blocks: [
        ["table", ["Signal in the problem", "Greedy key", "Proof idea", "Cost"], [
          ["max non-overlapping jobs / min removals / arrows", "sort by end", "exchange first job", "O(N log N)"],
          ["deadlines + profits, one task per time unit", "sort by deadline + min-heap of accepted", "replace the worst accepted", "O(N log N)"],
          ["neighbour rules in both directions", "two passes", "second pass only raises", "O(N)"],
          ["can you reach / fewest jumps", "farthest reach, window = BFS level", "reach is monotone", "O(N)"],
          ["circular tank, restart point", "reset start when tank < 0", "every start in the failed range is worse", "O(N)"],
          ["divisible items, value per weight", "ratio descending", "exchange a lower-ratio unit", "O(N log N)"],
          ["unlimited stock trades", "sum every positive daily rise", "a climb is the sum of its steps", "O(N)"]]],
        ["warn", "If a 3-element counter-example breaks your key, don't patch it with special cases. Either find a better key (end time instead of start time) or switch to DP."],
        ["list", ["State the key and the proof sentence out loud in the interview: 'sorting by end time is safe because swapping in the earliest-ending job can't create a conflict'.", "Greedy outputs are often counts or sums; check ties (equal ends, equal marks) explicitly.", "Many greedies are DP whose choice turned out to be forced (stocks, jump game). If you can't prove the greedy, the DP is still correct."]]
      ]},

      { h: "From your interview question set", blocks: [
        ["p", "A design problem from the advanced set: combine two structures so each one covers the other's weakness. A hash map finds values in O(1) but can't pick a random one; an array picks a random index in O(1) but can't find values. Keep both in sync."],
        ["probs", [
          { t: "Insert, Delete, GetRandom in O(1)", d: "Medium", co: "Question set", q: "Implement a set with insert(val) (false if present), remove(val) (false if absent) and getRandom() with uniform probability, all average O(1).", ex: "insert 5, 9, 2, 15 → true\nremove(8) → false; insert(2) → false; insert(3) → true\nremove(9) → true: 3 moves into index 1, map 3 → 1",
            ap: [
              { n: "Brute force", cx: "O(1) insert/remove · O(N) getRandom · O(N) space",
                idea: "A hash set alone gives O(1) insert and remove, but <b>getRandom has to walk to a random element</b> (here: copy to a list), O(N). An array alone has the opposite problem: lookup and remove are O(N).",
                code: "import random\n\n\nclass RandomizedSet:\n    def __init__(self):\n        self.items = set()\n\n    def insert(self, val):\n        if val in self.items:\n            return False\n        self.items.add(val)\n        return True\n\n    def remove(self, val):\n        if val not in self.items:\n            return False\n        self.items.remove(val)\n        return True\n\n    def getRandom(self):\n        return random.choice(list(self.items))   # O(N) copy" },
              { n: "Optimal", cx: "O(1) average per operation · O(N) space",
                idea: "Array of values + hash map value → index. Insert appends. <b>Remove swaps the target with the last element</b>, updates the moved element's index in the map, then pops the end, so nothing shifts. getRandom picks a random index.",
                code: "import random\n\n\nclass RandomizedSet:\n    def __init__(self):\n        self.vals = []             # values, in any order\n        self.pos = {}              # value -> index in vals\n\n    def insert(self, val):\n        if val in self.pos:\n            return False\n        self.pos[val] = len(self.vals)\n        self.vals.append(val)\n        return True\n\n    def remove(self, val):\n        if val not in self.pos:\n            return False\n        i = self.pos[val]\n        last = self.vals[-1]\n        self.vals[i] = last        # move the last value into the hole\n        self.pos[last] = i\n        self.vals.pop()\n        del self.pos[val]\n        return True\n\n    def getRandom(self):\n        return self.vals[random.randint(0, len(self.vals) - 1)]" }],
            edge: "Removing the last element itself (swap with itself is fine if you update the map before deleting). Duplicates allowed variant: map value → set of indices.", lc: "insert-delete-getrandom-o1" }]]
      ]}
    ],
    lc: [
      ["Jump Game", "jump-game", "Medium"],
      ["Jump Game II", "jump-game-ii", "Medium"],
      ["Gas Station", "gas-station", "Medium"],
      ["Candy", "candy", "Hard"],
      ["Best Time to Buy and Sell Stock II", "best-time-to-buy-and-sell-stock-ii", "Medium"],
      ["Insert Delete GetRandom O(1)", "insert-delete-getrandom-o1", "Medium"],
      ["Non-overlapping Intervals", "non-overlapping-intervals", "Medium"],
      ["Minimum Number of Arrows to Burst Balloons", "minimum-number-of-arrows-to-burst-balloons", "Medium"],
      ["Assign Cookies", "assign-cookies", "Easy"],
      ["Maximum Units on a Truck", "maximum-units-on-a-truck", "Easy"],
      ["Task Scheduler", "task-scheduler", "Medium"],
      ["Partition Labels", "partition-labels", "Medium"],
      ["Course Schedule III", "course-schedule-iii", "Hard"]
    ],
    quiz: [
      { q: "For maximum non-overlapping activities, which sort key is correct?", o: ["Earliest start", "Shortest duration", "Earliest end", "Latest start"], a: 2, why: "Ending first leaves the most time for the rest. Earliest start and shortest duration both have 3-job counter-examples." },
      { q: "Coins {1, 3, 4}, amount 6. What does largest-coin-first give, and what is optimal?", o: ["2 and 2", "3 (4+1+1) and 2 (3+3)", "3 and 3", "2 (4+2) and 2"], a: 1, why: "Greedy takes 4 then two 1s. 3+3 uses only 2 coins, so coin change with arbitrary denominations needs DP." },
      { q: "In the expiry/profit problem, what does the min-heap hold?", o: ["All items", "Profits of currently accepted items, so the worst can be swapped out", "Expiry times", "Unsold items"], a: 1, why: "When slots run out, compare the new profit with the smallest accepted one and replace it if better: correcting a past decision." },
      { q: "Why does the second (right → left) candy pass not break the first pass?", o: ["It only lowers values", "It only raises values, and raising c[i] can't violate a left-neighbour rule already satisfied", "It skips half the array", "It recomputes everything"], a: 1, why: "Pass 2 only increases c[i], and only when a[i] > a[i+1]. Growing c[i] keeps its own left rule true, and student i+1 has no left rule against i because a[i+1] < a[i]. So nothing from pass 1 breaks." },
      { q: "Gas station: the tank goes negative at index i after starting at s. What do you conclude?", o: ["Start at s+1", "No start in s..i works, so start at i+1", "Answer is -1", "Start at i"], a: 1, why: "Every start between s and i arrives at i with no more gas than starting at s did, so all of them fail too." },
      { q: "Which knapsack variant does the value/weight ratio greedy solve?", o: ["0/1", "Unbounded", "Fractional", "All of them"], a: 2, why: "Only when items can be cut is each unit of capacity independent, so the best ratio always wins. For 0/1, W=7 with (7,5) shows greedy 8 vs optimum 9." },
      { q: "In RandomizedSet, how is remove(val) kept O(1)?", o: ["Shift elements left", "Swap val with the last element, update the moved element's index, pop the end", "Mark it deleted and skip it in getRandom", "Rebuild the array"], a: 1, why: "Removing from the end of an array is O(1), and the hash map gives the index to swap. Lazy deletion breaks uniform getRandom." }
    ]
  };
})();

/* Blueprint — DSA: complexity, arrays, sliding window & two pointers, 2-D arrays.
 * Content from the user's notes (time-complexity.pdf, intermediate-1, arrayProblems, prefixsum, carryforward,
 * sliding-window, 2Pointer, 2dArray, 2dArrayProblemsAdvanced, 1dArrayProblemsAdvanced, AdvancedInterviewArray,
 * Sorting, ArrayContest, ArrayIntermediateContest) plus LeetCode practice.
 */
(function () {
  const T = BP.DSA.topics;
  const A = BP.ALGOS;
  const { nums, clone, cap } = BP.AV;
  const F = (line, note, panels) => ({ line, note, panels: clone(panels) });
  const arr = (vals, o = {}) => ({ t: "array", vals, ...o });
  const vars = (v) => ({ t: "vars", vars: v });
  const chips = (label, items) => ({ t: "chips", label, items });
  const split2 = (s) => String(s).split("|").map((x) => x.trim());
  const range = (l, r, cls) => { const o = {}; for (let k = l; k <= r; k++) o[k] = cls; return o; };

  /* ═════════ New animations (prefix arr_) ═════════ */

  A.arr_halving = { title: "Repeated halving: why while(N > 1) N /= 2 is O(log N)", inputLabel: "N (1 – 10^9)", input: "100",
    presets: [["N = 100", "100"], ["N = 32", "32"], ["N = 324", "324"], ["N = 10^9", "1000000000"]],
    about: "Each step halves N (integer division). The chips show every value N takes; count them to see why a halving loop is O(log N).",
    code: ["steps = 0", "while N > 1:", "    N = N // 2", "    steps += 1", "return steps          # = floor(log2 N)"],
    gen(s) {
      let n = Math.floor(nums(s)[0] || 100); if (n < 1) n = 1; if (n > 1e9) n = 1e9;
      const start = n, seq = [n], fr = []; let steps = 0;
      fr.push(F(0, `Start with N = <b>${n}</b>. Count how many halvings it takes to reach 1.`, [chips("values of N", seq.slice()), vars({ N: n, steps })]));
      while (n > 1) {
        n = Math.floor(n / 2); steps++; seq.push(n);
        fr.push(F(2, `Halve: N = ${seq[seq.length - 2]} // 2 = <b>${n}</b>. That is halving number ${steps}${n > 1 ? `; N is still above 1, so loop again` : `; N is now 1, so the loop stops`}.`, [chips("values of N", seq.map((v, k) => (k === seq.length - 1 ? { v, cls: "hit" } : v))), vars({ N: n, steps })]));
      }
      fr.push(F(4, `${start} reached 1 after <b>${steps}</b> halvings = floor(log2 ${start}). Even N = 10^9 needs only 29 steps: that is why O(log N) feels instant.`, [chips("values of N", seq), vars({ steps, "log2 N": Math.log2(start).toFixed(2) })]));
      return fr;
    } };

  A.arr_rotate = { title: "Rotate right by K with three reversals", inputLabel: "array | K", input: "31 17 21 19 16 | 3",
    presets: [["Notes example (K = 3)", "31 17 21 19 16 | 3"], ["K bigger than N (K = 7)", "10 20 30 40 50 | 7"], ["K = 0", "1 2 3 4 | 0"]],
    about: "Rotating right by K = three in-place reversals. The shaded window is the part being reversed; arrows l and r swap and walk inward.",
    code: ["K = K % N", "reverse(a, 0, N - 1)", "reverse(a, 0, K - 1)", "reverse(a, K, N - 1)", "", "def reverse(a, l, r):", "    while l < r:", "        a[l], a[r] = a[r], a[l]", "        l += 1", "        r -= 1"],
    gen(s) {
      const [a0, k0] = split2(s); const a = cap(nums(a0), 14), n = a.length, fr = [];
      if (!n) throw new Error("Enter at least one value.");
      const K0 = Math.max(0, Math.floor(nums(k0 || "0")[0] || 0)), K = K0 % n;
      fr.push(F(0, `K = ${K0} % ${n} = <b>${K}</b>. Rotating N times gives back the same array, so only K % N matters.`, [arr(a), vars({ N: n, K })]));
      const rev = (lo, hi, line, what) => {
        let l = lo, r = hi;
        fr.push(F(line, lo < hi ? `Reverse ${what}: indices ${lo}..${hi}. Swap the two ends and move both pointers inward until they meet.` : `Reverse ${what}: indices ${lo}..${hi} hold at most one element, so nothing moves.`, [arr(a, { win: lo <= hi ? [lo, hi] : null, ptr: lo < hi ? { l, r } : {} }), vars({ K })]));
        while (l < r) {
          [a[l], a[r]] = [a[r], a[l]];
          fr.push(F(7, `Swap a[${l}] and a[${r}]: now a[${l}] = ${a[l]} and a[${r}] = ${a[r]}. Then l moves right and r moves left.`, [arr(a, { win: [lo, hi], ptr: { l, r }, hl: { [l]: "swap", [r]: "swap" } }), vars({ K })]));
          l++; r--;
        }
      };
      rev(0, n - 1, 1, "the whole array");
      rev(0, K - 1, 2, `the first K = ${K}`);
      rev(K, n - 1, 3, `the last N − K = ${n - K}`);
      fr.push(F(-1, `Done: <b>[${a.join(", ")}]</b>. Each element is swapped at most twice: O(N) time, O(1) space. Brute force (move last to front K times) is O(N·K).`, [arr(a, { hl: range(0, n - 1, "done") })]));
      return fr;
    } };

  A.arr_carryAG = { title: "Carry forward: count pairs (i < j) with s[i] = 'a' and s[j] = 'g'", inputLabel: "lowercase string", input: "acbagkagg",
    presets: [["acbagkagg (8)", "acbagkagg"], ["abegag (3)", "abegag"], ["bcaggaag (5)", "bcaggaag"]],
    about: "One left-to-right scan. countA is the carried-forward number of 'a's on the left; every 'g' adds it to the answer at once.",
    code: ["ans = 0", "count_a = 0", "for ch in s:", "    if ch == 'a':", "        count_a += 1", "    elif ch == 'g':", "        ans += count_a     # pairs with every 'a' so far", "return ans"],
    gen(str) {
      const s = cap([...String(str).trim()], 18, "characters"), fr = []; let ans = 0, ca = 0;
      fr.push(F(1, "Scan once. countA remembers how many 'a's are on the left, so each 'g' is answered in O(1).", [arr(s), vars({ count_a: ca, ans })]));
      s.forEach((ch, i) => {
        if (ch === "a") { ca++; fr.push(F(4, `'a' at index ${i}: one more 'a' that every later 'g' can pair with. countA = <b>${ca}</b>`, [arr(s, { hl: { [i]: "act" } }), vars({ count_a: ca, ans })])); }
        else if (ch === "g") {
          ans += ca; const h = {}; s.forEach((c, k) => { if (k < i && c === "a") h[k] = "cmp"; }); h[i] = "found";
          fr.push(F(6, `'g' at index ${i} pairs with all ${ca} earlier 'a's: ans = <b>${ans}</b>`, [arr(s, { hl: h }), vars({ count_a: ca, ans })]));
        } else fr.push(F(2, `'${ch}' at index ${i} is neither 'a' nor 'g': nothing changes.`, [arr(s, { hl: { [i]: "dim" } }), vars({ count_a: ca, ans })]));
      });
      fr.push(F(7, `Answer <b>${ans}</b>. O(N) instead of the O(N²) "for each 'a' scan right".`, [arr(s), vars({ count_a: ca, ans })]));
      return fr;
    } };

  A.arr_moore = { title: "Moore's voting: majority element (> N/2)", inputLabel: "array", input: "4 4 3 8 8 4 9 4 4",
    presets: [["Notes walkthrough", "4 4 3 8 8 4 9 4 4"], ["No majority (exactly N/2)", "3 3 4 2 4 4 2 4"], ["[3 4 3 2 4 4 4]", "3 4 3 2 4 4 4"]],
    about: "Green cells are votes still standing for the candidate; grey cells were cancelled in pairs of two different values. The survivor is verified at the end.",
    code: ["ele = a[0]", "freq = 1", "for i in range(1, N):", "    if freq == 0:", "        ele = a[i]", "        freq = 1", "    elif a[i] == ele:", "        freq += 1", "    else:", "        freq -= 1          # cancel two different values", "return ele if a.count(ele) > N // 2 else None   # verify"],
    gen(s) {
      const a = cap(nums(s), 16), n = a.length, fr = [];
      if (!n) throw new Error("Enter at least one value.");
      const hl = {}, stack = [0]; let ele = a[0], freq = 1; hl[0] = "act";
      fr.push(F(1, `Start with a[0] = ${ele} as the candidate, freq = 1.`, [arr(a, { hl }), vars({ ele, freq })]));
      for (let i = 1; i < n; i++) {
        if (freq === 0) { ele = a[i]; freq = 1; stack.push(i); hl[i] = "act"; fr.push(F(4, `freq was 0 (every earlier vote cancelled out): <b>${a[i]}</b> becomes the new candidate.`, [arr(a, { hl, ptr: { i } }), vars({ ele, freq })])); }
        else if (a[i] === ele) { freq++; stack.push(i); hl[i] = "act"; fr.push(F(7, `a[${i}] = ${a[i]} matches the candidate: one more vote, freq = ${freq}.`, [arr(a, { hl, ptr: { i } }), vars({ ele, freq })])); }
        else { freq--; const k = stack.pop(); hl[i] = "dim"; hl[k] = "dim"; fr.push(F(9, `${a[i]} ≠ ${ele}: delete it together with one ${ele} (index ${k}). Removing two different values never changes the majority. freq = ${freq}.`, [arr(a, { hl, ptr: { i } }), vars({ ele, freq })])); }
      }
      const cnt = a.filter((x) => x === ele).length, ok = cnt > n / 2;
      const fin = {}; a.forEach((x, k) => { fin[k] = x === ele ? (ok ? "found" : "bad") : "dim"; });
      fr.push(F(10, `Candidate ${ele} appears ${cnt} times; N/2 = ${n / 2}. ${ok ? `<b>${ele} is the majority.</b>` : "<b>No majority</b>: the candidate must always be verified unless the problem guarantees one."} O(N) time, O(1) space.`, [arr(a, { hl: fin }), vars({ ele, count: cnt, "N/2": n / 2 })]));
      return fr;
    } };

  A.arr_diffArray = { title: "Difference array: Q range updates [s, e, +v] in O(N + Q)", inputLabel: "N | s e v, s e v, …", input: "8 | 1 4 3, 0 5 -1, 2 2 4, 4 6 3",
    presets: [["Notes N = 8", "8 | 1 4 3, 0 5 -1, 2 2 4, 4 6 3"], ["Notes N = 10", "10 | 3 6 3, 2 7 -3, 1 9 4"]],
    about: "Top row: the marks each query drops (+v at s, −v at e + 1). Bottom row: the prefix-sum sweep turning marks into the final values.",
    code: ["for s, e, v in queries:", "    a[s] += v", "    if e + 1 < N:", "        a[e + 1] -= v", "for i in range(1, N):", "    a[i] += a[i - 1]      # prefix sum spreads each mark"],
    gen(x) {
      const [n0, q0] = split2(x); const n = Math.max(1, Math.min(14, Math.floor(nums(n0)[0] || 8)));
      const qs = cap(String(q0 || "").split(",").map((p) => nums(p)).filter((p) => p.length >= 3), 6, "queries");
      const a = Array(n).fill(0), fr = [];
      fr.push(F(0, "Instead of painting every cell of [s, e], drop two marks: +v at s and −v just after e.", [arr(a), vars({ queries: qs.length })]));
      qs.forEach(([s0, e0, v]) => {
        const s = Math.max(0, Math.min(n - 1, s0)), e = Math.max(s, Math.min(n - 1, e0));
        a[s] += v; const h = { [s]: "act" };
        if (e + 1 < n) { a[e + 1] -= v; h[e + 1] = "bad"; }
        fr.push(F(e + 1 < n ? 3 : 1, `Query (${s}, ${e}, ${v}): a[${s}] += ${v}${e + 1 < n ? `, a[${e + 1}] −= ${v}` : " (e + 1 = N, nothing to cancel)"}. O(1) per query.`, [arr(a, { win: [s, e], hl: h, label: "marks" })]));
      });
      const marks = a.slice();
      for (let i = 1; i < n; i++) { a[i] += a[i - 1]; fr.push(F(5, `a[${i}] = a[${i - 1}] + mark = <b>${a[i]}</b>. The running total carries each +v until its −v cancels it.`, [arr(marks, { label: "marks", hl: { [i]: "cmp" } }), arr(a, { label: "result", hl: { ...range(0, i - 1, "done"), [i]: "act" } })])); }
      fr.push(F(-1, `Final array <b>[${a.join(", ")}]</b>. O(N + Q) instead of O(N·Q).`, [arr(marks, { label: "marks" }), arr(a, { label: "result", hl: range(0, n - 1, "done") })]));
      return fr;
    } };

  A.arr_rainWater = { title: "Rain water trapped: two pointers, O(1) space", inputLabel: "heights", input: "2 1 3 2 1 2 4 3 2 1 3 1",
    presets: [["Notes example (8)", "2 1 3 2 1 2 4 3 2 1 3 1"], ["Contest example (16)", "3 4 3 7 0 3 4 9 5 3 4"], ["LeetCode (6)", "0 1 0 2 1 0 1 3 2 1 2 1"]],
    about: "Bars are buildings, blue is trapped water. Pointers i and j close in; each step settles the water on the side with the lower wall.",
    code: ["i, j = 0, N - 1", "lmax = rmax = ans = 0", "while i <= j:", "    if h[i] <= h[j]:            # a wall >= h[i] exists on the right", "        if h[i] > lmax:", "            lmax = h[i]", "        else:", "            ans += lmax - h[i]", "        i += 1", "    else:                       # a wall > h[j] exists on the left", "        if h[j] > rmax:", "            rmax = h[j]", "        else:", "            ans += rmax - h[j]", "        j -= 1", "return ans"],
    gen(s) {
      const h = cap(nums(s).map((x) => Math.max(0, x)), 16), n = h.length, w = Array(n).fill(null), fr = [];
      if (!n) throw new Error("Enter at least one height.");
      let i = 0, j = n - 1, lmax = 0, rmax = 0, ans = 0;
      const P = (hl) => [{ t: "bars", vals: h, hl, ptr: { i, j }, water: w.map((v) => v || 0) }, arr(w, { label: "water", hl: Object.fromEntries(w.map((v, k) => [k, v ? "found" : ""])) }), vars({ lmax, rmax, ans })];
      fr.push(F(1, "Water on a building = min(tallest on its left, tallest on its right) − its height. Process the side with the smaller wall: its bound is already known.", P({})));
      while (i <= j) {
        if (h[i] <= h[j]) {
          const k = i; let msg;
          let ln; if (h[k] > lmax) { lmax = h[k]; w[k] = 0; ln = 5; msg = `h[${k}] = ${h[k]} is taller than every bar to its left, so water would spill over it: new lmax = ${lmax}, no water here.`; }
          else { ln = 7; w[k] = lmax - h[k]; ans += w[k]; msg = `h[${k}] = ${h[k]} ≤ h[j] = ${h[j]}, so the right side has a wall at least that tall. Water = lmax − h = ${lmax} − ${h[k]} = <b>${w[k]}</b>.`; }
          fr.push(F(ln, msg, P({ [k]: "act", [j]: "cmp" }))); i++;
        } else {
          const k = j; let msg;
          let ln; if (h[k] > rmax) { rmax = h[k]; w[k] = 0; ln = 11; msg = `h[${k}] = ${h[k]} is taller than every bar to its right, so water would spill over it: new rmax = ${rmax}, no water here.`; }
          else { ln = 13; w[k] = rmax - h[k]; ans += w[k]; msg = `h[${k}] = ${h[k]} &lt; h[i] = ${h[i]}, so the left side has a taller wall. Water = rmax − h = ${rmax} − ${h[k]} = <b>${w[k]}</b>.`; }
          fr.push(F(ln, msg, P({ [k]: "act", [i]: "cmp" }))); j--;
        }
      }
      fr.push(F(15, `Total trapped water = <b>${ans}</b>. One pass, O(N) time, O(1) space (the lmax[]/rmax[] version needs O(N) space).`, P({})));
      return fr;
    } };

  A.arr_mergeIntervals = { title: "Merge overlapping intervals (sorted by start)", inputLabel: "intervals like 0-2 1-4 …", input: "0-2 1-4 5-6 6-8 7-10 8-9 12-14",
    about: "Each bar is an input interval; the bar labelled cur is the interval being grown. Green = absorbed into cur, grey = already committed to the answer.",
    presets: [["Notes example", "0-2 1-4 5-6 6-8 7-10 8-9 12-14"], ["Touching ends", "3-6 6-10 11-12"], ["One big cover", "1-10 2-3 4-5 6-12"]],
    code: ["iv.sort()                      # by start", "l, r = iv[0]", "for s, e in iv[1:]:", "    if s <= r:", "        r = max(r, e)          # overlap: absorb", "    else:", "        ans.append((l, r))     # gap: commit", "        l, r = s, e", "ans.append((l, r))"],
    gen(s) {
      const iv = cap(String(s).split(/\s+/).filter(Boolean).map((p) => p.split("-").map(Number)).filter((p) => p.length === 2 && p.every((x) => !Number.isNaN(x))), 10, "intervals").map(([a, b]) => [Math.min(a, b), Math.max(a, b)]).sort((x, y) => x[0] - y[0] || x[1] - y[1]);
      if (!iv.length) throw new Error("Enter intervals like 1-3 2-6.");
      const mn = Math.min(0, ...iv.map((x) => x[0])), mx = Math.max(...iv.map((x) => x[1])) - mn || 1, cls = iv.map(() => ""), ans = [], fr = [];
      let l = iv[0][0], r = iv[0][1]; cls[0] = "take";
      const P = () => [{ t: "intervals", max: mx, items: [...iv.map(([a, b], k) => ({ s: a - mn, e: b - mn, label: `#${k + 1}`, cls: cls[k] })), { s: l - mn, e: r - mn, label: "cur", cls: "take" }] }, chips("answer", ans.map(([a, b]) => `(${a}, ${b})`)), vars({ l, r })];
      fr.push(F(1, `Sorted by start. The first interval (${l}, ${r}) becomes the current merged interval.`, P()));
      for (let k = 1; k < iv.length; k++) {
        const [a, b] = iv[k];
        if (a <= r) { r = Math.max(r, b); cls[k] = "take"; fr.push(F(4, `(${a}, ${b}) starts at ${a} ≤ r: it overlaps (touching counts). r = max(r, ${b}) = <b>${r}</b>.`, P())); }
        else { ans.push([l, r]); for (let q = 0; q < k; q++) cls[q] = "skip"; fr.push(F(6, `(${a}, ${b}) starts after r = ${r}: a gap. Commit (${l}, ${r}) and start fresh.`, P())); l = a; r = b; cls[k] = "take"; fr.push(F(7, `(${a}, ${b}) becomes the new current interval: (l, r) = (${l}, ${r}).`, P())); }
      }
      ans.push([l, r]); for (let q = 0; q < iv.length; q++) cls[q] = "skip";
      fr.push(F(8, `Commit the last one. Result: <b>${ans.map(([a, b]) => `(${a}, ${b})`).join(" ")}</b>. O(N) after an O(N log N) sort.`, P()));
      return fr;
    } };

  A.arr_firstMissing = { title: "First missing positive: put value v at index v − 1", inputLabel: "array", input: "3 -1 1 2 7",
    presets: [["[3 -1 1 2 7] → 4", "3 -1 1 2 7"], ["[4 2 7 6 9 1 8 3] → 5", "4 2 7 6 9 1 8 3"], ["Duplicates [4 1 3 2 2] → 5", "4 1 3 2 2"], ["[3 9 -2 5 -1 1] → 2", "3 9 -2 5 -1 1"]],
    about: "Green cells already hold their home value (index + 1). Each swap sends one value to its home index; the first cell that is not green gives the answer.",
    code: ["for i in range(N):", "    while 1 <= a[i] <= N and a[i] != i + 1:", "        v = a[i]", "        if a[v - 1] == v:", "            break              # duplicate: avoid an endless loop", "        a[i], a[v - 1] = a[v - 1], a[i]", "for i in range(N):", "    if a[i] != i + 1:", "        return i + 1", "return N + 1"],
    gen(s) {
      const a = cap(nums(s), 12), n = a.length, fr = []; let swaps = 0;
      const good = () => Object.fromEntries(a.map((v, k) => [k, v === k + 1 ? "done" : ""]));
      fr.push(F(0, `The answer is always in 1..N+1 = 1..${n + 1}. Use the array itself as the "seen" table: value v belongs at index v − 1.`, [arr(a, { hl: good() }), vars({ swaps })]));
      for (let i = 0; i < n; i++) {
        let guard = 0;
        if (!(a[i] >= 1 && a[i] <= n)) { fr.push(F(1, `a[${i}] = ${a[i]} is outside 1..${n}: it can never be the answer's blocker, skip.`, [arr(a, { hl: { ...good(), [i]: "dim" }, ptr: { i } }), vars({ swaps })])); continue; }
        while (a[i] >= 1 && a[i] <= n && a[i] !== i + 1 && guard++ < 3 * n) {
          const v = a[i];
          if (a[v - 1] === v) { fr.push(F(4, `${v} wants index ${v - 1}, but a[${v - 1}] already holds ${v}: a duplicate. Swapping would loop forever, so break and leave it.`, [arr(a, { hl: { ...good(), [i]: "bad" }, ptr: { i } }), vars({ swaps })])); break; }
          [a[i], a[v - 1]] = [a[v - 1], a[i]]; swaps++;
          fr.push(F(5, `Send ${v} home to index ${v - 1}. a[${i}] now holds ${a[i]}, which is checked next.`, [arr(a, { hl: { ...good(), [i]: "swap", [v - 1]: "swap" }, ptr: { i } }), vars({ swaps })]));
        }
      }
      let ans = n + 1; for (let k = 0; k < n; k++) if (a[k] !== k + 1) { ans = k + 1; break; }
      fr.push(F(ans <= n ? 8 : 9, `First index whose value is not index + 1 → answer <b>${ans}</b>. Every swap fixes one cell for good, so at most N swaps in total: O(N) time, O(1) space. (swaps used: ${swaps})`, [arr(a, { hl: { ...good(), [ans - 1]: "found" } }), vars({ answer: ans, swaps })]));
      return fr;
    } };

  A.arr_container = { title: "Container with most water: move the shorter wall", inputLabel: "heights", input: "3 5 4 7 3 6 5 4 1 2",
    presets: [["Notes example (25)", "3 5 4 7 3 6 5 4 1 2"], ["LeetCode (49)", "1 8 6 2 5 4 8 3 7"]],
    about: "The shaded rectangle is the water held by walls i and j: width j − i, height of the shorter wall. Watch the shorter wall get dropped each step.",
    code: ["ans = 0", "i, j = 0, N - 1", "while i < j:", "    ans = max(ans, (j - i) * min(A[i], A[j]))", "    if A[i] <= A[j]:", "        i += 1         # shorter wall can't do better", "    else:", "        j -= 1", "return ans"],
    gen(s) {
      const h = cap(nums(s).map((x) => Math.max(0, x)), 16), n = h.length, fr = [];
      if (n < 2) throw new Error("Enter at least two heights.");
      let i = 0, j = n - 1, ans = 0, bi = 0, bj = n - 1;
      fr.push(F(1, "Start with the widest container. Width only shrinks from here, so only a taller limiting wall can help.", [{ t: "bars", vals: h, ptr: { i, j } }, vars({ ans })]));
      while (i < j) {
        const area = (j - i) * Math.min(h[i], h[j]);
        if (area > ans) { ans = area; bi = i; bj = j; }
        fr.push(F(3, `Walls ${i} and ${j}: width ${j - i} × height min(${h[i]}, ${h[j]}) = <b>${area}</b>. Best so far = ${ans}.`, [{ t: "bars", vals: h, ptr: { i, j }, hl: { ...range(i, j, ""), [i]: "cmp", [j]: "cmp" }, rect: { l: i, r: j, h: Math.min(h[i], h[j]) } }, vars({ area, ans })]));
        if (h[i] <= h[j]) { fr.push(F(5, `A[${i}] = ${h[i]} is the shorter wall. Any container that keeps it is narrower and no taller, so drop it: i++.`, [{ t: "bars", vals: h, ptr: { i, j }, hl: { [i]: "act" } }, vars({ ans })])); i++; }
        else { fr.push(F(7, `A[${j}] = ${h[j]} is the shorter wall. Pairing it with any closer left wall is narrower and no taller, so drop it: j−−.`, [{ t: "bars", vals: h, ptr: { i, j }, hl: { [j]: "act" } }, vars({ ans })])); j--; }
      }
      fr.push(F(8, `Max water = <b>${ans}</b> using walls ${bi} and ${bj}. O(N) instead of trying all O(N²) pairs.`, [{ t: "bars", vals: h, hl: { [bi]: "found", [bj]: "found" }, rect: { l: bi, r: bj, h: Math.min(h[bi], h[bj]) } }, vars({ ans })]));
      return fr;
    } };

  const parseGrid = (s) => s.split("|").map((r) => nums(r)).filter((r) => r.length);

  A.arr_rotateMatrix = { title: "Rotate an N×N matrix 90° clockwise = transpose + reverse each row", inputLabel: "N (2 – 6)", input: "4",
    about: "Phase 1 mirrors the grid across its main diagonal (grey cells stay put). Phase 2 reverses each row; together they rotate 90° clockwise.",
    code: ["for i in range(N):", "    for j in range(i + 1, N):          # upper triangle only!", "        a[i][j], a[j][i] = a[j][i], a[i][j]   # transpose", "for row in a:", "    row.reverse()"],
    gen(s) {
      const n = Math.max(2, Math.min(6, Math.floor(nums(s)[0] || 4)));
      const g = Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => r * n + c + 1)), fr = [];
      const G = (hl, label) => ({ t: "grid", label, rows: g, hl });
      const diag = {}; for (let k = 0; k < n; k++) diag[k + "," + k] = "dim";
      fr.push(F(0, "Step 1: transpose by mirroring across the main diagonal. Only swap cells above it; starting j at 0 would swap every pair twice and undo the work.", [G(diag, "matrix")]));
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
        [g[i][j], g[j][i]] = [g[j][i], g[i][j]];
        fr.push(F(2, `Swap (${i},${j}) ↔ (${j},${i}): ${g[i][j]} and ${g[j][i]} trade places across the diagonal.`, [G({ ...diag, [i + "," + j]: "swap", [j + "," + i]: "swap" }, "transposing")]));
      }
      fr.push(F(3, "Transposed: row i is now the old column i. Step 2: reverse every row.", [G(diag, "transposed")]));
      for (let r = 0; r < n; r++) {
        g[r].reverse(); const h = {}; for (let c = 0; c < n; c++) h[r + "," + c] = "act"; for (let q = 0; q < r; q++) for (let c = 0; c < n; c++) h[q + "," + c] = "done";
        fr.push(F(4, `Reverse row ${r} → [${g[r].join(", ")}]. Its first element is now the old bottom of column ${r}.`, [G(h, "reversing rows")]));
      }
      fr.push(F(-1, "Rotated 90° clockwise in place: O(N²) time, O(1) space. (Anticlockwise: transpose then reverse each column. 180°: reverse rows, then reverse columns.)", [G({}, "rotated")]));
      return fr;
    } };

  A.arr_staircase = { title: "Staircase search in a row- and column-sorted matrix", inputLabel: "rows separated by | ; target", input: "-5 -2 1 13 | -4 0 3 14 | -3 2 6 18 | 2 5 10 20 ; 6",
    presets: [["Find 6", "-5 -2 1 13 | -4 0 3 14 | -3 2 6 18 | 2 5 10 20 ; 6"], ["Find 15 (absent)", "-5 -2 1 13 | -4 0 3 14 | -3 2 6 18 | 2 5 10 20 ; 15"], ["Find 0", "-5 -2 1 13 | -4 0 3 14 | -3 2 6 18 | 2 5 10 20 ; 0"]],
    about: "The highlighted cell is the current corner. Every comparison greys out a whole row (too small) or a whole column (too big).",
    code: ["i, j = 0, M - 1          # top-right corner", "while i < N and j >= 0:", "    if a[i][j] == K:", "        return True", "    elif a[i][j] < K:", "        i += 1           # rest of row i (to the left) is smaller", "    else:", "        j -= 1           # rest of column j (below) is bigger", "return False"],
    gen(s) {
      const [g0, k0] = String(s).split(";"); const g = cap(parseGrid(g0), 7, "rows"), K = nums(k0 || "0")[0] ?? 0, fr = [];
      if (!g.length) throw new Error("Enter rows separated by |.");
      const N = g.length, M = Math.min(...g.map((r) => r.length)); g.forEach((r) => (r.length = M)); cap(g[0], 8, "columns");
      const dim = {}; let i = 0, j = M - 1;
      const G = (extra) => ({ t: "grid", rows: g, hl: { ...dim, ...extra } });
      fr.push(F(0, `Start top-right: from here, left is smaller and down is bigger, so every comparison throws away a whole row or column. Target K = ${K}.`, [G({ [i + "," + j]: "act" }), vars({ K })]));
      while (i < N && j >= 0) {
        const v = g[i][j];
        if (v === K) { fr.push(F(3, `a[${i}][${j}] = ${v} = K. <b>Found.</b> At most N + M steps.`, [G({ [i + "," + j]: "found" }), vars({ K, i, j })])); return fr; }
        if (v < K) { for (let c = 0; c < M; c++) dim[i + "," + c] = "dim"; fr.push(F(5, `${v} &lt; ${K}: everything left of it in row ${i} is even smaller. Discard row ${i}.`, [G({ [i + "," + j]: "cmp" }), vars({ K, i, j })])); i++; }
        else { for (let r = 0; r < N; r++) dim[r + "," + j] = "dim"; fr.push(F(7, `${v} &gt; ${K}: everything below it in column ${j} is even bigger. Discard column ${j}.`, [G({ [i + "," + j]: "cmp" }), vars({ K, i, j })])); j--; }
        if (i < N && j >= 0) fr.push(F(1, `Now at a[${i}][${j}] = ${g[i][j]}.`, [G({ [i + "," + j]: "act" }), vars({ K, i, j })]));
      }
      fr.push(F(8, `Walked off the matrix: ${K} is <b>not present</b>. O(N + M) time, O(1) space.`, [G({}), vars({ K })]));
      return fr;
    } };

  /* ═════════ Topic: complexity ═════════ */
  T["complexity"] = {
    name: "Time & space complexity", icon: "⏱️", color: "#6d28d9", minutes: 40,
    notes: "time-complexity.pdf, intermediate-1.pdf",
    summary: "Count how many times your loops run, keep only the fastest-growing term, and check it against the 10^8-operations-per-second budget before you code.",
    sections: [
      { h: "Why we measure growth, not seconds", blocks: [
        ["p", "Two people solve “sort 10^6 elements”. Sahil's algorithm takes <b>100·log2 N</b> steps, Ankur's takes <b>N/10</b>. For small N Ankur wins; the curves cross near <b>N ≈ 3500</b>; after that Sahil wins and the gap explodes. Real inputs are big (an India vs Pakistan match has ~3.5 crore live viewers; the most-viewed video has ~13B views), so we compare algorithms by how they grow for large N. That is <b>asymptotic analysis</b>."],
        ["analogy", "Big-O is the shape of the cost curve, not the price tag. A taxi with a high flag-fall but a low per-km rate beats a cheap-start taxi on any long trip."],
        ["list", [
          "<b>Growth order to memorise:</b> log N &lt; √N &lt; N &lt; N log N &lt; N√N &lt; N² &lt; N³ &lt; 2^N &lt; N! &lt; N^N.",
          "<b>Log basics:</b> log_b(a) = c means b^c = a. log2(64) = 6, log3(27) = 3, log5(25) = 2. For non-powers count whole steps: log2(10) → 3, log3(40) → 3.",
          "<b>Repeated halving:</b> dividing N by 2 until it reaches 1 takes floor(log2 N) steps. 100 → 50 → 25 → 12 → 6 → 3 → 1 is 6 steps; 32 needs 5; 324 needs 8; 27 needs 4."
        ]],
        ["viz", "arr_halving", "Halving N: even 10^9 reaches 1 in 29 steps. N/2^K = 1 gives K = log2 N."]
      ] },
      { h: "Big-O in three steps", blocks: [
        ["steps", [
          ["Count iterations", "Make a small table: i | range of j | iterations. Sum the last column."],
          ["Drop lower-order terms", "In N² + 10N, the 10N share is 50% at N = 10, ~9% at N = 100, ~1% at N = 1000. It stops mattering."],
          ["Drop constant factors", "10 log N vs N, 100 log N vs N/10, 9N vs N²: the growth rate wins in the end, not the coefficient."]
        ]],
        ["table", ["Expression", "Big-O"], [
          ["4N² + 3N + 1", "O(N²)"],
          ["4N² + 3N + 6√N + 9 log2 N + N² log N", "O(N² log N)"],
          ["4N + 3N log N + 1", "O(N log N)"],
          ["4N log N + 3N√N + 10^6", "O(N√N)"]
        ]],
        ["warn", "<b>Limits of Big-O.</b> (1) It only talks about large N: 10³·N is “better” than N², yet for N = 10 and N = 100 the N² code is faster; they tie at N = 1000. (2) It cannot separate two O(N) codes: counting odd numbers in 1..N with <code>i%2 != 0</code> (N iterations) or with <code>i += 2</code> (N/2 iterations) are both O(N)."]
      ] },
      { h: "Loop quizzes: how many times does it run?", blocks: [
        ["table", ["#", "Code shape", "Iterations", "TC"], [
          ["1", "<code>i = N; while (i &gt; 1) i = i/2</code>", "log2 N", "O(log N)"],
          ["2", "<code>for (i = 1; i &lt; N; i *= 2)</code>", "1, 2, 4 … 2^K = N → log2 N", "O(log N)"],
          ["3", "<code>for (i = 0; i &lt;= N; i *= 2)</code>", "i stays 0 forever", "<b>infinite loop</b> (trap)"],
          ["4", "<code>for i in 1..10 { for j in 1..N }</code>", "10N", "O(N)"],
          ["5", "<code>for i in 1..N { for j in 1..N }</code>", "N²", "O(N²)"],
          ["6", "<code>for i in 1..N { for (j = 1; j &lt;= N; j *= 2) }</code>", "N · log2 N", "O(N log N)"],
          ["7", "<code>for i in 1..4 { for j in 1..i }</code>", "1+2+3+4 = 10 (with N: N(N+1)/2)", "O(1) (O(N²) with N)"],
          ["8", "<code>for i in 1..N { for j in 1..2^i }</code>", "2 + 4 + … + 2^N = 2(2^N − 1)", "O(2^N)"],
          ["9", "<code>for (i = N; i &gt; 0; i /= 2) { for j in 1..i }</code>", "N + N/2 + N/4 + … + 1 ≈ 2N", "<b>O(N)</b>, not N log N"],
          ["10", "<code>for (i = 0; i &lt; 2^N; i++) { j = i; while (j &gt; 0) j-- }</code>", "0 + 1 + … + (2^N − 1) = (4^N − 2^N)/2", "O(4^N)"],
          ["11", "<code>for (i = 0; i &lt; N; i++) for (j = N; j &gt; i; j--)</code>", "N + (N−1) + … + 1 = N(N+1)/2", "O(N²)"]
        ]],
        ["tip", "Quiz 9 is the favourite trick: a halving outer loop with a linear inner loop is a <b>geometric series</b> N(1 + 1/2 + 1/4 + …) &lt; 2N. Count of integers in [a, b] is b − a + 1."],
        ["math", [["GP sum", "a(r^n − 1)/(r − 1)", "2 + 4 + … + 2^N = 2(2^N − 1)"], ["Halving series", "N(1 + 1/2 + … + 1/2^K), 2^K = N", "2N − 1"], ["Triangular", "1 + 2 + … + N", "N(N+1)/2"]], "Three sums cover almost every loop-counting question."],
        ["probs", [
          { t: "Sum of factors of N in O(√N)", d: "Easy",
            q: "Return the sum of all factors of N.",
            ex: "N = 36 → factor pairs (1,36) (2,18) (3,12) (4,9) (6,6)\nsum = 91",
            ap: [
              { n: "Brute force", cx: "O(N) time · O(1) space",
                idea: "Try every i from 1 to N and add the ones that divide N. <b>Too slow</b> for N near 10^12.",
                code: "def sum_of_factors(n):\n    total = 0\n    for i in range(1, n + 1):\n        if n % i == 0:\n            total += i\n    return total" },
              { n: "Optimal", cx: "O(√N) time · O(1) space",
                idea: "Factors come in <b>pairs (i, N/i)</b> and the smaller one is ≤ √N. Loop while i·i ≤ N; add i and N/i, but add only once when i == N/i (perfect squares).",
                code: "def sum_of_factors(n):\n    total = 0\n    i = 1\n    while i * i <= n:              # i*i avoids float sqrt errors\n        if n % i == 0:\n            total += i\n            if i != n // i:        # 6 * 6 = 36: add the root once\n                total += n // i\n        i += 1\n    return total" }
            ],
            edge: "N = 1; perfect squares (6·6 = 36) must not be double counted; use i*i ≤ N instead of i ≤ sqrt(N) to avoid floating errors." },
          { t: "Perfect-square root", d: "Easy",
            q: "Given a perfect square N, return its square root without sqrt().",
            ex: "N = 36 → 6;  N = 49 → 7;  N = 25 → 5",
            ap: [
              { n: "Brute force", cx: "O(N) time · O(1) space",
                idea: "Check every i from 1 to N until i·i == N. Wastes time on values far bigger than the root.",
                code: "def square_root(n):\n    for i in range(1, n + 1):\n        if i * i == n:\n            return i\n    return -1" },
              { n: "Better", cx: "O(√N) time · O(1) space",
                idea: "Stop as soon as i·i passes N: the loop runs only up to the root.",
                code: "def square_root(n):\n    i = 1\n    while i * i <= n:\n        if i * i == n:\n            return i\n        i += 1\n    return -1" },
              { n: "Optimal", cx: "O(log N) time · O(1) space",
                idea: "i·i grows with i, so <b>binary search</b> on i in [1, N]: too big → go left, too small → go right.",
                code: "def square_root(n):\n    lo = 1\n    hi = n\n    while lo <= hi:\n        mid = (lo + hi) // 2\n        sq = mid * mid\n        if sq == n:\n            return mid\n        if sq < n:\n            lo = mid + 1\n        else:\n            hi = mid - 1\n    return -1" }
            ],
            lc: "sqrtx" },
          { t: "Count primes in 1..A with countFactors", d: "Easy",
            q: "Count the primes up to A by checking countFactors(i) == 2 for each i.",
            ex: "A = 10 → 2, 3, 5, 7 → 4",
            ap: [
              { n: "Brute force", cx: "O(A²) time · O(1) space",
                idea: "For each i count its factors by trying every j ≤ i; prime means exactly 2 factors. O(i) per number.",
                code: "def count_primes(A):\n    count = 0\n    for i in range(2, A + 1):\n        factors = 0\n        for j in range(1, i + 1):\n            if i % j == 0:\n                factors += 1\n        if factors == 2:\n            count += 1\n    return count" },
              { n: "Better", cx: "O(A·√A) time · O(1) space",
                idea: "Count factors in O(√i) using factor pairs. Read the <b>constraints first</b>: with A ≤ 10³ this is ≈ 3·10⁴ steps and perfectly fine.",
                code: "def count_factors(n):\n    c = 0\n    i = 1\n    while i * i <= n:\n        if n % i == 0:\n            c += 1 if i == n // i else 2\n        i += 1\n    return c\n\ndef count_primes(A):\n    count = 0\n    for i in range(2, A + 1):\n        if count_factors(i) == 2:\n            count += 1\n    return count" },
              { n: "Optimal", cx: "O(A log log A) time · O(A) space",
                idea: "For A up to ~10^7 use the <b>sieve of Eratosthenes</b>: every prime p crosses out its multiples starting at p·p. (For A up to 10^18 nothing per-number works.)",
                code: "def count_primes(A):\n    if A < 2:\n        return 0\n    is_prime = [True] * (A + 1)\n    is_prime[0] = False\n    is_prime[1] = False\n    p = 2\n    while p * p <= A:\n        if is_prime[p]:\n            for m in range(p * p, A + 1, p):\n                is_prime[m] = False\n        p += 1\n    return sum(is_prime)" }
            ] }
        ]]
      ] },
      { h: "TLE, constraints and overflow", blocks: [
        ["p", "Online judges run your code on a ~1 GHz server: roughly <b>10^9 simple instructions per second</b>. One loop iteration is about 10–100 instructions, so a 1-second limit fits <b>about 10^7 to 10^8 iterations</b>. The TLE loop: idea → code → submit → TLE → go back and improve the <i>idea</i>, not the code."],
        ["table", ["Constraint on N", "Max feasible", "Typical approach"], [
          ["N ≤ 10–12", "O(N!) , O(2^N · N)", "brute force, backtracking"],
          ["N ≤ 20–25", "O(2^N)", "subsets, bitmask"],
          ["N ≤ 500", "O(N³)", "triple loop, Floyd"],
          ["N ≤ 5·10³", "O(N²)", "all pairs, simple DP"],
          ["N ≤ 10^5 – 10^6", "O(N log N) or O(N)", "sort, prefix sums, two pointers, hashing"],
          ["N ≤ 10^9 – 10^18", "O(√N) or O(log N)", "math, binary search"]
        ]],
        ["warn", "<b>Overflow.</b> Sum of N ≤ 10^6 values each ≤ 10^9 can reach 10^15, far above int max (~2.1·10^9). Use <code>long</code> for the accumulator. Same for products like a·(i+1)·(N−i)."],
        ["p", "<b>Space complexity</b> = the most extra memory alive at any moment; input and output are not counted. int = 4 B, long = 8 B. Three scalars = 16 B → O(1). Add <code>new int[N]</code> → 16 + 4N → O(N). Add <code>new long[N][N]</code> → O(N²). A variable declared inside a loop reuses its slot: still O(1)."],
        ["extra", "Strings: in Java <code>s = s + 'a'</code> builds a new string each time (O(length)), so a loop of appends is O(N²). <code>StringBuilder.append</code> is amortised O(1)."]
      ] },
      { h: "First array tools: reverse and rotate", blocks: [
        ["p", "An array is same-typed data in contiguous memory, indexed 0..N−1. The address of a[i] is base + 4·i (for int), so access is O(1)."],
        ["probs", [
          { t: "Reverse an array (or the part l..r)", d: "Easy",
            q: "Reverse the array in place; then reverse only indices l..r.",
            ex: "[10 20 30 40 50 60] → [60 50 40 30 20 10]\n[10 20 30 40 50 60 70 80], l = 2, r = 6 → [10 20 70 60 50 40 30 80]",
            ap: [
              { n: "Brute force", cx: "O(N) time · O(N) space",
                idea: "Copy the part backwards into a new list and write it back. Correct, but needs <b>extra memory</b>.",
                code: "def reverse(a, l, r):\n    part = a[l:r + 1]\n    a[l:r + 1] = part[::-1]" },
              { n: "Optimal", cx: "O(N) time · O(1) space",
                idea: "<b>Two pointers</b> at both ends: swap and move inward while l &lt; r. With odd length the middle element stays.",
                code: "def reverse(a, l, r):\n    while l < r:\n        a[l], a[r] = a[r], a[l]\n        l += 1\n        r -= 1" }
            ],
            lc: "reverse-string" },
          { t: "Rotate array right by K", d: "Medium", co: "Google",
            q: "Rotate the array to the right by K steps. 1 ≤ N ≤ 10^6, 0 ≤ K ≤ 10^9.",
            ex: "[10 20 30 40 50], K = 2 → [40 50 10 20 30]\n[31 17 21 19 16], K = 3 → [21 19 16 31 17]",
            ap: [
              { n: "Brute force", cx: "O(N·K) time · O(1) space",
                idea: "Move the last element to the front, K times. With N = 10^6 and K = 10^9 that is 10^15 steps: <b>TLE</b>.",
                code: "def rotate(a, k):\n    n = len(a)\n    for _ in range(k % n):\n        last = a[n - 1]\n        for i in range(n - 1, 0, -1):\n            a[i] = a[i - 1]\n        a[0] = last" },
              { n: "Better", cx: "O(N) time · O(N) space",
                idea: "Each element simply lands at index (i + K) % N. Write it into a new array, then copy back.",
                code: "def rotate(a, k):\n    n = len(a)\n    b = [0] * n\n    for i in range(n):\n        b[(i + k) % n] = a[i]\n    a[:] = b" },
              { n: "Optimal", cx: "O(N) time · O(1) space",
                idea: "<b>K = K % N</b> first (rotating N times is the identity). Then reverse the whole array, reverse the first K, reverse the last N − K. [31 17 21 19 16] → [16 19 21 17 31] → [21 19 16 | 17 31] → [21 19 16 31 17].",
                code: "def reverse(a, l, r):\n    while l < r:\n        a[l], a[r] = a[r], a[l]\n        l += 1\n        r -= 1\n\ndef rotate(a, k):\n    n = len(a)\n    k %= n\n    reverse(a, 0, n - 1)\n    reverse(a, 0, k - 1)\n    reverse(a, k, n - 1)" }
            ],
            edge: "K = 0 or a multiple of N (no change); K &gt; N (modulo). Rotating right by K = rotating left by N − K.",
            viz: "arr_rotate", lc: "rotate-array" }
        ]],
        ["viz", "arr_rotate", "The reversal trick: three reversals, each element moves at most twice."]
      ] },
      { h: "Interview cheatsheet", blocks: [
        ["table", ["You see", "Think"], [
          ["Loop variable multiplied/divided by 2", "log N"],
          ["Inner loop runs i times", "triangular sum N(N+1)/2 → N²"],
          ["Outer halving, inner linear", "geometric series → O(N)"],
          ["N ≤ 10^5 in constraints", "need O(N log N) or better"],
          ["Sum or product of large values", "use long"],
          ["K can exceed N (rotations, circular)", "K % N"]
        ]],
        ["tip", "Before coding, say out loud: “N is up to 10^5, so O(N²) = 10^10 is too slow; I need O(N log N).” Interviewers love hearing the constraint drive the design."]
      ] }
    ],
    lc: [
      ["Count Odd Numbers in an Interval Range", "count-odd-numbers-in-an-interval-range", "Easy"],
      ["Number of Steps to Reduce a Number to Zero", "number-of-steps-to-reduce-a-number-to-zero", "Easy"],
      ["Fizz Buzz", "fizz-buzz", "Easy"],
      ["Find Numbers with Even Number of Digits", "find-numbers-with-even-number-of-digits", "Easy"],
      ["Reverse String", "reverse-string", "Easy"],
      ["Rotate Array", "rotate-array", "Medium"],
      ["Max Consecutive Ones", "max-consecutive-ones", "Easy"],
      ["Concatenation of Array", "concatenation-of-array", "Easy"],
      ["Sqrt(x)", "sqrtx", "Easy"]
    ],
    quiz: [
      { q: "How many times does <code>for (i = N; i &gt; 0; i /= 2) for (j = 0; j &lt; i; j++)</code> run its inner body?", o: ["N log N", "about 2N", "N²", "log N"], a: 1, why: "N + N/2 + N/4 + … is a geometric series bounded by 2N, so it is O(N)." },
      { q: "N ≤ 10^5 and the time limit is 1 s. Which complexity is safe?", o: ["O(N²)", "O(N³)", "O(N log N)", "O(2^N)"], a: 2, why: "N log N ≈ 1.7·10^6, far under the ~10^8 budget. N² = 10^10 would TLE." },
      { q: "What does <code>for (i = 0; i &lt;= N; i *= 2)</code> do?", o: ["Runs log N times", "Runs N times", "Never ends", "Runs once"], a: 2, why: "i starts at 0 and 0·2 = 0, so i never grows. Start multiplying loops at 1." },
      { q: "Simplify 4N log N + 3N√N + 10^6.", o: ["O(N log N)", "O(N√N)", "O(10^6)", "O(N)"], a: 1, why: "√N grows faster than log N, so N√N dominates." },
      { q: "Summing 10^6 values each up to 10^9 into an int will…", o: ["work fine", "overflow; use long", "be slow", "lose decimals"], a: 1, why: "The sum can reach 10^15, beyond int max ≈ 2.1·10^9." },
      { q: "Why do we do K = K % N before rotating?", o: ["To make K negative", "Rotating N times gives back the same array", "To sort the array", "It is required by reverse()"], a: 1, why: "Rotations repeat every N steps; K up to 10^9 shrinks to less than N." },
      { q: "Which is NOT counted in space complexity (as the notes define it)?", o: ["A temporary array of size N", "A hash map you build", "The input array", "A recursion stack"], a: 2, why: "Input and output space are excluded; only extra memory counts." }
    ]
  };

  /* ═════════ Topic: arrays ═════════ */
  T["arrays"] = {
    name: "Arrays, prefix sums & carry forward", icon: "📊", color: "#2456d6", minutes: 90,
    notes: "prefixsum, carryforward, arrayProblems, 1dArrayProblemsAdvanced, AdvancedInterviewArray, Sorting, contests",
    summary: "Precompute once (prefix sums, running max/count) so every later question is O(1), and learn the handful of one-pass tricks: Kadane, difference array, Moore voting, cyclic placement.",
    sections: [
      { h: "Prefix sums: the cricket scoreboard", blocks: [
        ["analogy", "A cricket scoreboard is already cumulative: after overs 1..10 it reads [2, 8, 14, 29, 31, 49, 65, 79, 88, 97]. Runs in over 7 = 65 − 49 = 16. Overs 6–10 = 97 − 31 = 66. Overs 3–6 = 49 − 8 = 41. You never re-add the overs: one subtraction answers any range."],
        ["p", "<b>pSum[i] = a[0] + … + a[i]</b>, built in O(N) with pSum[i] = pSum[i−1] + a[i]. Then <b>sum(L..R) = pSum[R] − pSum[L−1]</b> (just pSum[R] when L = 0). If you may modify the input, build it in place: a[i] += a[i−1], O(1) extra space."],
        ["viz", "prefixSum", "Build pSum once, then each range query is one subtraction."],
        ["tip", "Think prefix sum when (1) a range [l, r] appears, or (2) sums of some elements are needed again and again. Variants: parity prefix, indicator prefix (count of X in a range), prefix max, difference array."],
        ["probs", [
          { t: "Range sum queries", d: "Easy",
            q: "N elements, Q queries [L, R]: print the sum of each range. 1 ≤ N, Q ≤ 10^5.",
            ex: "a = [-3 6 2 4 5 2 8 -9 3 1]\npSum = [-3 3 5 9 14 16 24 15 18 19]\n(4,8) → 18 − 9 = 9   (3,7) → 15 − 5 = 10   (0,4) → 14   (7,7) → −9",
            ap: [
              { n: "Brute force", cx: "O(N·Q) time · O(1) space",
                idea: "Loop l..r for every query. With N, Q = 10^5 that is 10^10 steps: <b>TLE</b>.",
                code: "def range_sums(a, queries):\n    out = []\n    for l, r in queries:\n        s = 0\n        for i in range(l, r + 1):\n            s += a[i]\n        out.append(s)\n    return out" },
              { n: "Optimal", cx: "O(N + Q) time · O(1) extra if built in place",
                idea: "Build <b>pSum once</b>; each query is pSum[R] − pSum[L−1] (just pSum[R] when L = 0).",
                code: "def range_sums(a, queries):\n    p = a[:]                       # or a itself if you may modify it\n    for i in range(1, len(p)):\n        p[i] += p[i - 1]\n    out = []\n    for l, r in queries:\n        if l == 0:\n            out.append(p[r])\n        else:\n            out.append(p[r] - p[l - 1])\n    return out" }
            ],
            edge: "L = 0 (there is no pSum[−1]); use long if values are large.",
            viz: "prefixSum", lc: "range-sum-query-immutable" },
          { t: "Range sum of even-indexed elements", d: "Easy",
            q: "For each query [L, R], sum only the elements at even indices inside it.",
            ex: "A = [2 3 1 6 4 5]\nview as [2 0 1 0 4 0] → prefix [2 2 3 3 7 7]\n(1,3) → 1   (2,5) → 5   (0,4) → 7   (3,3) → 0",
            ap: [
              { n: "Brute force", cx: "O(N·Q) time · O(1) space",
                idea: "For each query loop over the range and add only even indices.",
                code: "def even_sums(a, queries):\n    out = []\n    for l, r in queries:\n        s = 0\n        for i in range(l, r + 1):\n            if i % 2 == 0:\n                s += a[i]\n        out.append(s)\n    return out" },
              { n: "Optimal", cx: "O(N + Q) time · O(1) extra in place",
                idea: "Pretend odd positions are 0 and take a prefix sum. In place: at odd i, <b>carry</b> a[i] = a[i−1]; at even i, a[i] = a[i−1] + a[i]. Odd-indexed sums are the mirror image (use a separate array if the input must not change).",
                code: "def even_sums(a, queries):\n    p = a[:]\n    for i in range(1, len(p)):\n        if i % 2 == 1:\n            p[i] = p[i - 1]            # odd index adds nothing\n        else:\n            p[i] = p[i - 1] + p[i]\n    out = []\n    for l, r in queries:\n        out.append(p[r] - (p[l - 1] if l > 0 else 0))\n    return out" }
            ] },
          { t: "Special index", d: "Medium", co: "Google",
            q: "Count indices i such that after deleting a[i], the sum of elements at even indices equals the sum at odd indices.",
            ex: "A = [4 3 2 7 6 -2]\ndelete 0 → [3 2 7 6 -2]: even 8, odd 8 ✓\ndelete 2 → [4 3 7 6 -2]: even 9, odd 9 ✓\nAnswer: 2",
            ap: [
              { n: "Brute force", cx: "O(N²) time · O(N) space",
                idea: "For each i build the array without a[i] and sum both parities. Rebuilding costs O(N) per index.",
                code: "def count_special(a):\n    count = 0\n    for i in range(len(a)):\n        b = a[:i] + a[i + 1:]\n        if sum(b[0::2]) == sum(b[1::2]):\n            count += 1\n    return count" },
              { n: "Better", cx: "O(N) time · O(N) space",
                idea: "Deleting index i shifts everything after it left by one, so <b>elements after i swap parity</b>; elements before keep it. With pEven[] and pOdd[]: Se = pEven[i−1] + (pOdd[N−1] − pOdd[i]) and So = pOdd[i−1] + (pEven[N−1] − pEven[i]) (drop the [i−1] terms when i = 0).",
                code: "def count_special(a):\n    n = len(a)\n    p_even = [0] * n\n    p_odd = [0] * n\n    for i in range(n):\n        p_even[i] = (p_even[i - 1] if i > 0 else 0) + (a[i] if i % 2 == 0 else 0)\n        p_odd[i] = (p_odd[i - 1] if i > 0 else 0) + (a[i] if i % 2 == 1 else 0)\n    count = 0\n    for i in range(n):\n        left_even = p_even[i - 1] if i > 0 else 0\n        left_odd = p_odd[i - 1] if i > 0 else 0\n        se = left_even + (p_odd[n - 1] - p_odd[i])   # right side swapped parity\n        so = left_odd + (p_even[n - 1] - p_even[i])\n        if se == so:\n            count += 1\n    return count" },
              { n: "Optimal", cx: "O(N) time · O(1) space",
                idea: "Same formula, but only two <b>running left sums</b> plus the two totals are needed: right part = total − left − (a[i] if it has that parity).",
                code: "def count_special(a):\n    total_even = sum(a[0::2])\n    total_odd = sum(a[1::2])\n    left_even = 0\n    left_odd = 0\n    count = 0\n    for i, x in enumerate(a):\n        right_even = total_even - left_even - (x if i % 2 == 0 else 0)\n        right_odd = total_odd - left_odd - (x if i % 2 == 1 else 0)\n        # after deleting i, the right part swaps parity\n        if left_even + right_odd == left_odd + right_even:\n            count += 1\n        if i % 2 == 0:\n            left_even += x\n        else:\n            left_odd += x\n    return count" }
            ],
            edge: "i = 0 and i = N − 1; single element (both sums 0, so it is special).",
            lc: "ways-to-make-a-fair-array" },
          { t: "Range divisibility (count of multiples of 7)", d: "Easy",
            q: "For each query [L, R], count elements divisible by 7 in A[L..R]. 1 ≤ N, Q ≤ 10^5.",
            ex: "A = [13 14 6 7 11 25 28 14 16]\nindicator [0 1 0 1 0 0 1 1 0] → prefix [0 1 1 2 2 2 3 4 4]\n(3,6) → 2   (2,4) → 1   (0,5) → 2   (6,6) → 1",
            ap: [
              { n: "Brute force", cx: "O(N·Q) time · O(1) space",
                idea: "Scan each range and count multiples of 7.",
                code: "def count_multiples(A, queries):\n    out = []\n    for l, r in queries:\n        c = 0\n        for i in range(l, r + 1):\n            if A[i] % 7 == 0:\n                c += 1\n        out.append(c)\n    return out" },
              { n: "Optimal", cx: "O(N + Q) time · O(1) extra in place",
                idea: "Turn A into an <b>indicator array</b> (1 if divisible, else 0) and prefix-sum it. Any “how many X in [l, r]” becomes a range sum.",
                code: "def count_multiples(A, queries):\n    p = [1 if x % 7 == 0 else 0 for x in A]\n    for i in range(1, len(p)):\n        p[i] += p[i - 1]\n    out = []\n    for l, r in queries:\n        out.append(p[r] - (p[l - 1] if l > 0 else 0))\n    return out" }
            ] },
          { t: "Product of array except self", d: "Medium",
            q: "Return out[i] = product of all elements except a[i], without division.",
            ex: "[1 2 3 4] → [24 12 8 6]",
            ap: [
              { n: "Brute force", cx: "O(N²) time · O(1) extra",
                idea: "For each i multiply all the other elements.",
                code: "def product_except_self(a):\n    n = len(a)\n    out = [1] * n\n    for i in range(n):\n        for j in range(n):\n            if j != i:\n                out[i] *= a[j]\n    return out" },
              { n: "Better", cx: "O(N) time · O(N) space",
                idea: "out[i] = (product of everything left of i) × (product of everything right of i). Build both as prefix and suffix product arrays.",
                code: "def product_except_self(a):\n    n = len(a)\n    left = [1] * n\n    right = [1] * n\n    for i in range(1, n):\n        left[i] = left[i - 1] * a[i - 1]\n    for i in range(n - 2, -1, -1):\n        right[i] = right[i + 1] * a[i + 1]\n    return [left[i] * right[i] for i in range(n)]" },
              { n: "Optimal", cx: "O(N) time · O(1) extra (output excluded)",
                idea: "Store the prefix products directly in the output, then sweep right to left multiplying in a <b>running suffix product</b>.",
                code: "def product_except_self(a):\n    n = len(a)\n    out = [1] * n\n    for i in range(1, n):\n        out[i] = out[i - 1] * a[i - 1]   # product of a[0..i-1]\n    suf = 1\n    for i in range(n - 1, -1, -1):\n        out[i] *= suf                    # times product of a[i+1..]\n        suf *= a[i]\n    return out" }
            ],
            lc: "product-of-array-except-self" }
        ]]
      ] },
      { h: "Carry forward and subarrays", blocks: [
        ["p", "<b>Carry forward</b>: while scanning, keep a running value (count, max, min, sum, last index seen) that summarises one side, so each new element is answered in O(1) instead of rescanning. Rule from the notes: if the max / min / sum / index of something is needed again and again, carry it forward."],
        ["viz", "arr_carryAG", "countA carries the number of 'a's seen so far; each 'g' adds it to the answer."],
        ["p", "A <b>subarray</b> is a contiguous, non-empty slice that keeps order; a single element and the whole array both count. It is identified by (start, end). Starting at 0 there are N, at 1 there are N − 1, … so there are <b>N(N+1)/2</b> subarrays. Printing all of them with a k-loop is O(N³)."],
        ["probs", [
          { t: "Count pairs ('a', 'g')", d: "Easy",
            q: "Count pairs i &lt; j with s[i] = 'a' and s[j] = 'g' in a lowercase string.",
            ex: "\"abegag\" → 3   \"acgdgag\" → 4   \"bcaggaag\" → 5\n\"acbagkagg\": countA 1 1 1 2 2 2 3 3 3, ans → 8",
            ap: [
              { n: "Brute force", cx: "O(N²) time · O(1) space",
                idea: "For each 'a' scan to the right counting 'g's.",
                code: "def count_ag(s):\n    ans = 0\n    for i in range(len(s)):\n        if s[i] == 'a':\n            for j in range(i + 1, len(s)):\n                if s[j] == 'g':\n                    ans += 1\n    return ans" },
              { n: "Optimal", cx: "O(N) time · O(1) space",
                idea: "Scan once keeping <b>countA</b>. On every 'g', all previous 'a's pair with it: ans += countA. (Mirror version: from the right, count 'g's and add on each 'a'.)",
                code: "def count_ag(s):\n    ans = 0\n    count_a = 0\n    for ch in s:\n        if ch == 'a':\n            count_a += 1\n        elif ch == 'g':\n            ans += count_a       # pairs with every 'a' so far\n    return ans" }
            ],
            viz: "arr_carryAG" },
          { t: "Smallest subarray containing both min and max", d: "Medium",
            q: "Return the length of the smallest subarray that contains both the global minimum and maximum.",
            ex: "[2 2 6 4 5 1 5 2 6 4 1] (min 1, max 6) → 3  ([6 4 1] at indices 8..10)\n[1 2 3 1 3 4 6 4 6 3] → 4  ([1 3 4 6])\n[8 8 8 8 8] → 1",
            ap: [
              { n: "Brute force", cx: "O(N²) time · O(1) space",
                idea: "From every start, extend the end until both the global min and max have been seen; keep the shortest.",
                code: "def smallest_min_max(a):\n    mn = min(a)\n    mx = max(a)\n    n = len(a)\n    ans = n\n    for i in range(n):\n        has_min = False\n        has_max = False\n        for j in range(i, n):\n            if a[j] == mn:\n                has_min = True\n            if a[j] == mx:\n                has_max = True\n            if has_min and has_max:\n                ans = min(ans, j - i + 1)\n                break\n    return ans" },
              { n: "Optimal", cx: "O(N) time · O(1) space",
                idea: "The best subarray has a min at one end and a max at the other. Scan <b>right to left</b> carrying the index of the closest min (imin) and closest max (imax) seen so far. At a max, pair it with imin; at a min, pair it with imax; keep the shortest.",
                code: "def smallest_min_max(a):\n    mn = min(a)\n    mx = max(a)\n    n = len(a)\n    ans = n\n    imin = -1\n    imax = -1\n    for i in range(n - 1, -1, -1):\n        if a[i] == mx:\n            imax = i\n            if imin != -1:\n                ans = min(ans, imin - imax + 1)\n        if a[i] == mn:\n            imin = i\n            if imax != -1:\n                ans = min(ans, imax - imin + 1)\n    return ans" }
            ],
            edge: "min == max (all equal): both checks fire on the same index, answer 1. Initialise ans = N." },
          { t: "Best time to buy and sell stock", d: "Easy",
            q: "Pick one day to buy and a later day to sell to maximise profit.",
            ex: "[7 1 5 3 6 4] → 5 (buy at 1, sell at 6)",
            ap: [
              { n: "Brute force", cx: "O(N²) time · O(1) space",
                idea: "Try every (buy, sell) pair with buy before sell.",
                code: "def max_profit(prices):\n    best = 0\n    n = len(prices)\n    for i in range(n):\n        for j in range(i + 1, n):\n            best = max(best, prices[j] - prices[i])\n    return best" },
              { n: "Optimal", cx: "O(N) time · O(1) space",
                idea: "Carry forward the <b>minimum price so far</b>. Each day, profit = price − minSoFar.",
                code: "def max_profit(prices):\n    lo = float('inf')\n    best = 0\n    for p in prices:\n        lo = min(lo, p)            # cheapest day to buy so far\n        best = max(best, p - lo)   # sell today\n    return best" }
            ],
            lc: "best-time-to-buy-and-sell-stock" },
          { t: "Chef and Cooking: max sum of a strictly ascending subarray", d: "Easy",
            q: "Find the largest sum of a contiguous strictly increasing run. 1 ≤ N ≤ 10^5, 1 ≤ a[i] ≤ 10^9.",
            ex: "[9 17 19 13 13 20 13 2 18 3]\nrunning sum 9 26 45 | 13 | 13 33 | 13 | 2 20 | 3\nAnswer: 45",
            ap: [
              { n: "Brute force", cx: "O(N²) time · O(1) space",
                idea: "From every start, extend while the next element is bigger, adding as you go.",
                code: "def max_ascending_sum(a):\n    best = 0\n    n = len(a)\n    for i in range(n):\n        s = a[i]\n        best = max(best, s)\n        j = i + 1\n        while j < n and a[j] > a[j - 1]:\n            s += a[j]\n            best = max(best, s)\n            j += 1\n    return best" },
              { n: "Optimal", cx: "O(N) time · O(1) space",
                idea: "Carry forward the sum of the current run: extend when a[i] &gt; a[i−1], otherwise restart at a[i]. Equal neighbours break the run. Use <b>long</b> in Java/C++ (sums up to 10^14).",
                code: "def max_ascending_sum(a):\n    cur = a[0]\n    best = a[0]\n    for i in range(1, len(a)):\n        if a[i] > a[i - 1]:\n            cur += a[i]        # run continues\n        else:\n            cur = a[i]         # run breaks: restart here\n        best = max(best, cur)\n    return best" }
            ],
            lc: "maximum-ascending-subarray-sum" }
        ]]
      ] },
      { h: "Kadane and the contribution technique", blocks: [
        ["p", "<b>Maximum subarray sum.</b> Brute force is O(N³); with prefix sums O(N²); with a running sum per start O(N²). Case analysis gives the O(N) idea: all positive → take everything; all negative → take the largest single element; mixed → a prefix with a negative sum only drags you down, so <b>drop it</b>."],
        ["viz", "kadane", "Kadane: extend the running sum while it helps, restart when it would hurt."],
        ["probs", [
          { t: "Maximum subarray sum (Kadane)", d: "Medium",
            q: "Return the largest sum of a non-empty contiguous subarray. 1 ≤ N ≤ 10^5.",
            ex: "[-3 2 4 -1 3 -4 3] → 8 ([2 4 -1 3])\n[5 6 7 -3 2 -10 -12 8 12 -4 7 -2] → 23\n[-4 -3 -6 -9 -2] → -2",
            ap: [
              { n: "Brute force", cx: "O(N³) time · O(1) space",
                idea: "Try every (start, end) and add the slice again each time.",
                code: "def max_subarray(a):\n    n = len(a)\n    ans = float('-inf')\n    for i in range(n):\n        for j in range(i, n):\n            s = 0\n            for k in range(i, j + 1):\n                s += a[k]\n            ans = max(ans, s)\n    return ans" },
              { n: "Better", cx: "O(N²) time · O(1) space",
                idea: "Fix the start and keep a running sum while the end moves right (or use prefix sums). Initialise ans = a[0] or −∞, never 0.",
                code: "def max_subarray(a):\n    n = len(a)\n    ans = float('-inf')\n    for i in range(n):\n        s = 0\n        for j in range(i, n):\n            s += a[j]\n            ans = max(ans, s)\n    return ans" },
              { n: "Optimal", cx: "O(N) time · O(1) space",
                idea: "Keep a running sum. Add a[i], update ans, and <b>if the sum drops below 0 reset it to 0</b>: a negative prefix only drags the rest down. Update ans <i>before</i> resetting so an all-negative array returns its largest element.",
                code: "def max_subarray(a):\n    s = 0\n    ans = float('-inf')\n    for x in a:\n        s += x\n        ans = max(ans, s)\n        if s < 0:\n            s = 0          # drop a prefix that hurts\n    return ans" }
            ],
            edge: "All negative; single element; sums beyond int range.",
            viz: "kadane", lc: "maximum-subarray" },
          { t: "Flip a subarray (0 ↔ 1) to maximise ones", d: "Medium",
            q: "Choose one subarray l..r and flip its bits so the total number of 1s is maximal. Return l and r.",
            ex: "[1 1 0 0 0 0 1 1 1 0 0 1] → flip l = 2, r = 5 (gain 4)",
            ap: [
              { n: "Brute force", cx: "O(N²) time · O(1) space",
                idea: "For every start, extend the end keeping the running gain (+1 per 0, −1 per 1) and remember the best (l, r).",
                code: "def best_flip(a):\n    n = len(a)\n    best = 0\n    ans = (-1, -1)\n    for l in range(n):\n        gain = 0\n        for r in range(l, n):\n            gain += 1 if a[r] == 0 else -1\n            if gain > best:\n                best = gain\n                ans = (l, r)\n    return ans" },
              { n: "Optimal", cx: "O(N) time · O(1) space",
                idea: "Flipping a 0 gains +1, flipping a 1 costs −1. Map <b>0 → +1, 1 → −1</b> and run Kadane on the gains. When the running sum resets, the next start is i + 1; when it beats the best, record r = i.",
                code: "def best_flip(a):\n    s = 0\n    best = 0\n    l = 0\n    ans = (-1, -1)          # (-1, -1): no flip helps (all ones)\n    for i in range(len(a)):\n        s += 1 if a[i] == 0 else -1\n        if s > best:\n            best = s\n            ans = (l, i)\n        if s < 0:\n            s = 0\n            l = i + 1       # next candidate start\n    return ans" }
            ] },
          { t: "Sum of all subarray sums", d: "Medium", co: "Google, Facebook",
            q: "Return the sum of the sums of every subarray.",
            ex: "[1 2 3] → 1+3+6+2+5+3 = 20\n[3 7 2 5] → 3·1·4 + 7·2·3 + 2·3·2 + 5·4·1 = 12+42+12+20 = 86",
            ap: [
              { n: "Brute force", cx: "O(N²) time · O(1) space",
                idea: "Enumerate subarrays with a running sum. Still TLE for N = 10^6.",
                code: "def total_of_subarray_sums(a):\n    n = len(a)\n    ans = 0\n    for i in range(n):\n        s = 0\n        for j in range(i, n):\n            s += a[j]\n            ans += s\n    return ans" },
              { n: "Optimal", cx: "O(N) time · O(1) space",
                idea: "<b>Contribution technique</b>: flip the question. Element i is in subarray (s, e) iff s ∈ [0, i] and e ∈ [i, N−1], so it appears in <b>(i+1)·(N−i)</b> subarrays. Add a[i]·(i+1)·(N−i).",
                code: "def total_of_subarray_sums(a):\n    n = len(a)\n    ans = 0\n    for i in range(n):\n        ans += a[i] * (i + 1) * (n - i)   # starts * ends containing i\n    return ans" }
            ],
            edge: "Use long: the answer grows like N³·max.",
            lc: "sum-of-all-odd-length-subarrays" }
        ]],
        ["tip", "“How many times does each element appear in all subarrays (or sub-matrices)?” → contribution technique. Count in 1-D: (i+1)(N−i). In 2-D: (i+1)(j+1)(N−i)(M−j)."]
      ] },
      { h: "Range updates and rain water: precompute, then sweep", blocks: [
        ["p", "<b>Range updates.</b> A prefix sum <b>spreads</b> a value placed at index s to every index after it. So to add v to a[s..e], put +v at s and −v at e+1, and take one prefix sum at the end. Q updates cost O(Q), the sweep O(N)."],
        ["viz", "arr_diffArray", "Marks first, one sweep at the end: each +v travels right until its −v cancels it."],
        ["probs", [
          { t: "Suffix increments", d: "Easy",
            q: "Start from N zeros. Each query (idx, v) adds v to every element from idx to N−1. 1 ≤ N, Q ≤ 10^5.",
            ex: "N = 7, queries (3,4) (1,3) (4,-2) → [0 3 3 7 5 5 5]",
            ap: [
              { n: "Brute force", cx: "O(N·Q) time · O(1) space",
                idea: "Loop idx..N−1 for each query.",
                code: "def suffix_increments(n, queries):\n    a = [0] * n\n    for idx, v in queries:\n        for i in range(idx, n):\n            a[i] += v\n    return a" },
              { n: "Optimal", cx: "O(N + Q) time · O(1) space",
                idea: "Put v only at a[idx]; <b>one prefix sum</b> at the end carries it to the right.",
                code: "def suffix_increments(n, queries):\n    a = [0] * n\n    for idx, v in queries:\n        a[idx] += v\n    for i in range(1, n):\n        a[i] += a[i - 1]\n    return a" }
            ] },
          { t: "Range increments [s, e, v]", d: "Medium", co: "Google",
            q: "Start from N zeros; each query adds v to all of a[s..e]. Return the final array.",
            ex: "N = 10, (3,6,+3) (2,7,-3) (1,9,+4) → [0 4 1 4 4 4 4 1 4 4]\nN = 8, (1,4,3) (0,5,-1) (2,2,4) (4,6,3) → [-1 2 6 2 5 2 3 0]",
            ap: [
              { n: "Brute force", cx: "O(N·Q) time · O(1) space",
                idea: "Paint every cell of every range.",
                code: "def range_increments(n, queries):\n    a = [0] * n\n    for s, e, v in queries:\n        for i in range(s, e + 1):\n            a[i] += v\n    return a" },
              { n: "Optimal", cx: "O(N + Q) time · O(1) space",
                idea: "<b>Difference array</b>: a[s] += v starts the effect, a[e+1] −= v stops it (skip when e + 1 = N). Prefix sum once.",
                code: "def range_increments(n, queries):\n    a = [0] * n\n    for s, e, v in queries:\n        a[s] += v\n        if e + 1 < n:\n            a[e + 1] -= v          # cancel right after e\n    for i in range(1, n):\n        a[i] += a[i - 1]           # spread every mark\n    return a" }
            ],
            edge: "e = N − 1; if the array is not all zeros, build marks separately and add at the end.",
            viz: "arr_diffArray", lc: "corporate-flight-bookings" }
        ]],
        ["p", "<b>Rain water.</b> Water above building i = <b>min(max on its left, max on its right) − h[i]</b> (both maxima include i itself). Brute force scans both sides for every i: O(N²). Precomputing lmax[] and rmax[] (prefix and suffix max: carry forward from each end) gives O(N) time, O(N) space. Two pointers drop the arrays."],
        ["viz", "arr_rainWater", "Two pointers: the smaller side's water is already decided, because the other side has a wall at least as tall."],
        ["probs", [
          { t: "Rain water trapped", d: "Hard",
            q: "h[i] is the height of a building of width 1. How much rain water is trapped?",
            ex: "[2 1 3 2 1 2 4 3 2 1 3 1] → 8\n[3 4 3 7 0 3 4 9 5 3 4] → 16\n  lmax [3 4 4 7 7 7 7 9 9 9 9]\n  rmax [9 9 9 9 9 9 9 9 5 4 4]",
            ap: [
              { n: "Brute force", cx: "O(N²) time · O(1) space",
                idea: "For every i scan left and right for the tallest walls; water = min(lmax, rmax) − h[i].",
                code: "def trap(h):\n    n = len(h)\n    ans = 0\n    for i in range(n):\n        lmax = max(h[:i + 1])\n        rmax = max(h[i:])\n        ans += min(lmax, rmax) - h[i]\n    return ans" },
              { n: "Better", cx: "O(N) time · O(N) space",
                idea: "Precompute <b>prefix max</b> lmax[] and <b>suffix max</b> rmax[] once (carry forward from each end).",
                code: "def trap(h):\n    n = len(h)\n    if n == 0:\n        return 0\n    lmax = [0] * n\n    rmax = [0] * n\n    lmax[0] = h[0]\n    for i in range(1, n):\n        lmax[i] = max(lmax[i - 1], h[i])\n    rmax[n - 1] = h[n - 1]\n    for i in range(n - 2, -1, -1):\n        rmax[i] = max(rmax[i + 1], h[i])\n    ans = 0\n    for i in range(n):\n        ans += min(lmax[i], rmax[i]) - h[i]\n    return ans" },
              { n: "Optimal", cx: "O(N) time · O(1) space",
                idea: "<b>Two pointers</b>: if h[i] ≤ h[j], the right side certainly has a wall ≥ h[i], so i's water depends only on lmax. Process that side, then move it.",
                code: "def trap(h):\n    i = 0\n    j = len(h) - 1\n    lmax = 0\n    rmax = 0\n    ans = 0\n    while i <= j:\n        if h[i] <= h[j]:           # right wall >= h[i] exists\n            if h[i] > lmax:\n                lmax = h[i]\n            else:\n                ans += lmax - h[i]\n            i += 1\n        else:                      # left wall > h[j] exists\n            if h[j] > rmax:\n                rmax = h[j]\n            else:\n                ans += rmax - h[j]\n            j -= 1\n    return ans" }
            ],
            edge: "Fewer than 3 bars → 0; strictly increasing or decreasing → 0.",
            viz: "arr_rainWater", lc: "trapping-rain-water" }
        ]]
      ] },
      { h: "Classic one-pass interview problems", blocks: [
        ["viz", "arr_moore", "Moore's voting: every mismatch deletes two different values; the majority survives."],
        ["probs", [
          { t: "Majority element (Moore's voting)", d: "Easy", co: "Google",
            q: "Find the element that occurs more than N/2 times (you may assume it exists).",
            ex: "[3 4 3 2 4 4 4] → 4\n[3 3 4 2 4 4 2 4] → none (4 appears exactly N/2 times)\n[4 4 3 8 8 4 9 4 4] → candidates 4 → 8 → 9 → 4, answer 4",
            ap: [
              { n: "Brute force", cx: "O(N²) time · O(1) space",
                idea: "Count each element's frequency with an inner loop.",
                code: "def majority(a):\n    n = len(a)\n    for x in a:\n        if a.count(x) > n // 2:\n            return x\n    return -1" },
              { n: "Better", cx: "O(N) time · O(N) space",
                idea: "Count frequencies in a hash map (or sort and check the middle: O(N log N)).",
                code: "def majority(a):\n    freq = {}\n    for x in a:\n        freq[x] = freq.get(x, 0) + 1\n        if freq[x] > len(a) // 2:\n            return x\n    return -1" },
              { n: "Optimal", cx: "O(N) time · O(1) space",
                idea: "There is at most one majority, and <b>removing two different elements never changes it</b> (election: 9 of 15 seats is still a majority after cancelling opposing pairs: 8 of 13, 7 of 11). Keep a candidate and a counter: match → +1, mismatch → −1 (cancel a pair), counter 0 → take the next element as the new candidate.",
                code: "def majority(a):\n    ele = a[0]\n    freq = 1\n    for x in a[1:]:\n        if freq == 0:\n            ele = x            # new candidate\n            freq = 1\n        elif x == ele:\n            freq += 1\n        else:\n            freq -= 1          # cancel two different values\n    if a.count(ele) > len(a) // 2:   # verify if not guaranteed\n        return ele\n    return -1" }
            ],
            edge: "If a majority is not guaranteed, verify the final candidate with a second counting pass.",
            viz: "arr_moore", lc: "majority-element" },
          { t: "Max consecutive 1s with at most one 0 → 1 replacement", d: "Medium", co: "Amazon, Microsoft, Adobe",
            q: "You may change at most one 0 into a 1. Return the longest run of 1s.",
            ex: "[1 1 0 1 1 0 1 1] → 5   [0 1 1 1 0 1 1 0 1 1 0] → 6\n[1 1 1 1 1] → 5   [0 0 0 0 0] → 1",
            ap: [
              { n: "Brute force", cx: "O(N²) time · O(1) space",
                idea: "Try flipping each 0, measure the longest run of the whole array, flip it back.",
                code: "def longest_run(a):\n    best = 0\n    cur = 0\n    for x in a:\n        cur = cur + 1 if x == 1 else 0\n        best = max(best, cur)\n    return best\n\ndef max_ones_one_flip(a):\n    if 0 not in a:\n        return len(a)\n    ans = 0\n    for i in range(len(a)):\n        if a[i] == 0:\n            a[i] = 1\n            ans = max(ans, longest_run(a))\n            a[i] = 0\n    return ans" },
              { n: "Optimal", cx: "O(N) time · O(1) space",
                idea: "For every 0, count consecutive 1s just to its left (l) and right (r); candidate = <b>l + r + 1</b>. It looks nested, but each 1 is counted by at most the two zeros around it, so it is O(N). Sometimes the “brute-looking” code is already optimal. (A sliding window with at most one zero also works.)",
                code: "def max_ones_one_flip(a):\n    n = len(a)\n    if 0 not in a:\n        return n\n    ans = 1\n    for i in range(n):\n        if a[i] == 0:\n            l = 0\n            j = i - 1\n            while j >= 0 and a[j] == 1:\n                l += 1\n                j -= 1\n            r = 0\n            j = i + 1\n            while j < n and a[j] == 1:\n                r += 1\n                j += 1\n            ans = max(ans, l + r + 1)\n    return ans" }
            ],
            edge: "No zeros → N; all zeros → 1.",
            lc: "max-consecutive-ones-iii" },
          { t: "Max consecutive 1s with at most one swap", d: "Medium", co: "DirectI",
            q: "You may swap a 0 with some 1 elsewhere (you move a 1, you cannot create one). Return the longest run of 1s.",
            ex: "[1 0 1 1 0 1] → 4   [1 1 0 1 1 1] → 5\n[0 1 1 0 1 1 1 0] (total ones 5): zero@3 has l = 2, r = 3 → 5",
            ap: [
              { n: "Brute force", cx: "O(N³) time · O(1) space",
                idea: "Try swapping every 0 with every 1 and measure the longest run each time.",
                code: "def longest_run(a):\n    best = 0\n    cur = 0\n    for x in a:\n        cur = cur + 1 if x == 1 else 0\n        best = max(best, cur)\n    return best\n\ndef max_ones_one_swap(a):\n    ans = longest_run(a)\n    n = len(a)\n    for i in range(n):\n        for j in range(n):\n            if a[i] == 0 and a[j] == 1:\n                a[i], a[j] = a[j], a[i]\n                ans = max(ans, longest_run(a))\n                a[i], a[j] = a[j], a[i]\n    return ans" },
              { n: "Optimal", cx: "O(N) time · O(1) space",
                idea: "Same l and r around each 0. If <b>l + r &lt; totalOnes</b>, a spare 1 exists elsewhere to fill the gap: candidate l + r + 1. Otherwise all 1s are already adjacent to this gap: candidate l + r.",
                code: "def max_ones_one_swap(a):\n    n = len(a)\n    total = sum(a)\n    if total == 0 or total == n:\n        return total\n    ans = 0\n    for i in range(n):\n        if a[i] == 0:\n            l = 0\n            j = i - 1\n            while j >= 0 and a[j] == 1:\n                l += 1\n                j -= 1\n            r = 0\n            j = i + 1\n            while j < n and a[j] == 1:\n                r += 1\n                j += 1\n            if l + r < total:\n                ans = max(ans, l + r + 1)   # a spare 1 fills the gap\n            else:\n                ans = max(ans, l + r)\n    return ans" }
            ],
            edge: "No ones → 0; all ones → N." },
          { t: "First missing positive", d: "Hard",
            q: "Return the smallest positive integer not in the array, in O(N) time and O(1) extra space.",
            ex: "[3 -1 1 2 7] → 4   [9 2 6 4 -8 1 3] → 5   [1 0 5 -6 4 2] → 3\n[1 2 5 6 4 3] → 7   [4 2 7 6 9 1 8 3] → 5",
            ap: [
              { n: "Brute force", cx: "O(N²) time · O(1) space",
                idea: "Check 1, 2, 3, … one by one with a linear search. (Sum of 1..N minus the sum fails with duplicates and out-of-range values.)",
                code: "def first_missing(a):\n    x = 1\n    while x in a:          # 'in' is a linear scan\n        x += 1\n    return x" },
              { n: "Better", cx: "O(N) time · O(N) space",
                idea: "Put everything in a hash set, then test 1, 2, 3, … in O(1) each. (Sorting first gives O(N log N) with O(1) space.)",
                code: "def first_missing(a):\n    seen = set(a)\n    x = 1\n    while x in seen:\n        x += 1\n    return x" },
              { n: "Optimal", cx: "O(N) time · O(1) space",
                idea: "The answer is always in <b>1..N+1</b>. Use the array as its own hash: value v belongs at index v − 1. For each i, while a[i] is in 1..N and not at home, swap it home; if home already holds v (duplicate), stop. Then the first index with a[i] ≠ i + 1 gives the answer, else N + 1. Every swap places one value permanently, so ≤ N swaps overall.",
                code: "def first_missing(a):\n    n = len(a)\n    for i in range(n):\n        while 1 <= a[i] <= n and a[i] != i + 1:\n            v = a[i]\n            if a[v - 1] == v:      # duplicate: avoid an endless loop\n                break\n            a[i], a[v - 1] = a[v - 1], a[i]\n    for i in range(n):\n        if a[i] != i + 1:\n            return i + 1\n    return n + 1" }
            ],
            edge: "Duplicates ([4 1 3 2 2] → 5) need the break, or the loop never ends; negatives and values &gt; N are ignored.",
            viz: "arr_firstMissing", lc: "first-missing-positive" },
          { t: "Add one to a number stored as digits", d: "Easy",
            q: "Digits of a number are given most significant first. Add 1. 1 ≤ size ≤ 10^5.",
            ex: "[1 2 9] → [1 3 0]\n[9 9 9 9 9] → [1 0 0 0 0 0]",
            ap: [
              { n: "Brute force", cx: "O(N) time · O(N) space",
                idea: "Join the digits into an integer, add 1, split back. Works in Python (big ints) but <b>overflows</b> in Java/C++ for 10^5 digits.",
                code: "def plus_one(a):\n    num = int(\"\".join(str(d) for d in a)) + 1\n    return [int(c) for c in str(num)]" },
              { n: "Optimal", cx: "O(N) time · O(1) extra (O(N) output)",
                idea: "Walk from the last digit with a <b>carry</b>: a 9 becomes 0 and the carry continues; anything else just increments and you stop. If the carry survives past index 0, insert a 1 at the front.",
                code: "def plus_one(a):\n    for i in range(len(a) - 1, -1, -1):\n        if a[i] < 9:\n            a[i] += 1          # no carry left\n            return a\n        a[i] = 0               # 9 + 1 = 10: write 0, carry 1\n    return [1] + a             # all digits were 9" }
            ],
            lc: "plus-one" }
        ]],
        ["viz", "arr_firstMissing", "Cyclic placement: each value hops to index v − 1; the first cell that is not home reveals the answer."]
      ] },
      { h: "Intervals and sorting tricks", blocks: [
        ["p", "Two intervals (s1, e1) and (s2, e2) do <b>not</b> overlap when s2 &gt; e1 or s1 &gt; e2. Otherwise they merge into <b>(min(s1, s2), max(e1, e2))</b>, which covers partial overlap, containment and touching endpoints: (3,6) and (6,10) → (3,10)."],
        ["viz", "arr_mergeIntervals", "Grow the current interval while the next one starts inside it; commit it at a gap."],
        ["probs", [
          { t: "Merge sorted overlapping intervals", d: "Medium", co: "Google, Paypal",
            q: "Intervals are sorted by start. Merge all overlapping ones. 1 ≤ N ≤ 10^5.",
            ex: "[(0,2) (1,4) (5,6) (6,8) (7,10) (8,9) (12,14)] → [(0,4) (5,10) (12,14)]",
            ap: [
              { n: "Brute force", cx: "O(N²) time · O(N) space",
                idea: "Repeatedly look for any overlapping pair, merge it, and start again until no pair overlaps.",
                code: "def merge(iv):\n    iv = [list(x) for x in iv]\n    changed = True\n    while changed:\n        changed = False\n        for i in range(len(iv)):\n            for j in range(i + 1, len(iv)):\n                (s1, e1), (s2, e2) = iv[i], iv[j]\n                if s2 <= e1 and s1 <= e2:\n                    iv[i] = [min(s1, s2), max(e1, e2)]\n                    iv.pop(j)\n                    changed = True\n                    break\n            if changed:\n                break\n    return sorted(tuple(x) for x in iv)" },
              { n: "Optimal", cx: "O(N) after sorting (O(N log N) if you must sort) · O(1) extra besides the output",
                idea: "Keep a current interval [l, r]. If the next start ≤ r it overlaps: r = max(r, end). Otherwise push [l, r] and start a new current. Push the last one at the end. If the input is unsorted, sort by start first.",
                code: "def merge(iv):\n    iv = sorted(iv)\n    l, r = iv[0]\n    ans = []\n    for s, e in iv[1:]:\n        if s <= r:\n            r = max(r, e)          # overlap: absorb\n        else:\n            ans.append((l, r))     # gap: commit current\n            l, r = s, e\n    ans.append((l, r))\n    return ans" }
            ],
            viz: "arr_mergeIntervals", lc: "merge-intervals" },
          { t: "Merge intervals II: insert a new interval", d: "Medium",
            q: "Insert a new interval into a sorted list of non-overlapping intervals and merge where needed.",
            ex: "[(1,3) (4,7) (10,14) (16,19) (21,24) (27,30) (32,35) (38,45)], new (10,22)\n→ [(1,3) (4,7) (10,24) (27,30) (32,35) (38,45)]\n[(1,5) (8,10) (11,14) (15,20) (21,24)], new (12,22) → [(1,5) (8,10) (11,24)]",
            ap: [
              { n: "Brute force", cx: "O(N log N) time · O(N) space",
                idea: "Append the new interval, sort, and run the normal merge.",
                code: "def insert(iv, new):\n    iv = sorted(iv + [new])\n    l, r = iv[0]\n    ans = []\n    for s, e in iv[1:]:\n        if s <= r:\n            r = max(r, e)\n        else:\n            ans.append((l, r))\n            l, r = s, e\n    ans.append((l, r))\n    return ans" },
              { n: "Optimal", cx: "O(N) time · O(1) extra",
                idea: "Let [l, r] be the new interval and scan once: intervals ending before l are copied; the first interval starting after r means you push [l, r] and copy the rest; everything else overlaps, so widen l = min(l, s), r = max(r, e). If the loop ends, push [l, r] last.",
                code: "def insert(iv, new):\n    l, r = new\n    ans = []\n    for i, (s, e) in enumerate(iv):\n        if e < l:\n            ans.append((s, e))           # entirely before\n        elif s > r:\n            ans.append((l, r))           # entirely after: done\n            return ans + list(iv[i:])\n        else:\n            l = min(l, s)                # overlap: widen\n            r = max(r, e)\n    ans.append((l, r))\n    return ans" }
            ],
            lc: "insert-interval" }
        ]],
        ["p", "<b>Sorting-based tricks.</b> Sorting costs O(N log N) but often turns a counting question into reading indices."],
        ["probs", [
          { t: "Elements removal (minimum total cost)", d: "Easy",
            q: "Remove elements one by one; each removal costs the sum of all elements still present (including the one removed). Minimise the total cost.",
            ex: "[2 1 4]: order 2,1,4 costs 7+5+4 = 16; order 4,2,1 costs 7+3+1 = 11 (best)\n[5 3 1 -3] → 5·1 + 3·2 + 1·3 + (−3)·4 = 2",
            ap: [
              { n: "Brute force", cx: "O(N!·N) time · O(N) space",
                idea: "Try every removal order and add up the costs.",
                code: "from itertools import permutations\n\ndef min_cost(a):\n    best = float('inf')\n    for order in permutations(a):\n        remaining = sum(a)\n        cost = 0\n        for x in order:\n            cost += remaining      # pay for everything still present\n            remaining -= x\n        best = min(best, cost)\n    return best" },
              { n: "Optimal", cx: "O(N log N) time · O(1) space",
                idea: "With removal order a, b, c, d the total is <b>a + 2b + 3c + 4d</b>: the k-th removed element is paid k times. Give the biggest value the smallest coefficient: sort descending and add a[i]·(i+1).",
                code: "def min_cost(a):\n    a = sorted(a, reverse=True)\n    total = 0\n    for i in range(len(a)):\n        total += a[i] * (i + 1)\n    return total" }
            ] },
          { t: "Noble integers", d: "Medium",
            q: "Count elements whose value equals the number of elements smaller than them. Values may repeat.",
            ex: "[1 -5 3 5 -10 4] → 3 (3, 4, 5)\n[-10 1 1 3 100] → 3 (both 1s and the 3)\n[-10 1 1 2 4 4 4 8 10] → 5",
            ap: [
              { n: "Brute force", cx: "O(N²) time · O(1) space",
                idea: "For each element count how many are smaller.",
                code: "def noble_count(a):\n    ans = 0\n    for x in a:\n        smaller = 0\n        for y in a:\n            if y < x:\n                smaller += 1\n        if smaller == x:\n            ans += 1\n    return ans" },
              { n: "Optimal", cx: "O(N log N) time · O(1) space",
                idea: "Sort. For distinct values, exactly i elements are smaller than a[i], so check a[i] == i. With duplicates, the count of smaller elements is the index of the <b>first occurrence</b> of the value: carry it forward and update only when a[i] ≠ a[i−1].",
                code: "def noble_count(a):\n    a = sorted(a)\n    ans = 0\n    smaller = 0\n    for i in range(len(a)):\n        if i > 0 and a[i] != a[i - 1]:\n            smaller = i            # first index of a new value\n        if a[i] == smaller:\n            ans += 1\n    return ans" }
            ],
            edge: "a[0] == 0 is noble (nothing is smaller).",
            lc: "h-index" }
        ]],
        ["extra", "K-th largest: [7 1 2 9 6 7 16 8], K = 4 → 16, 9, 8, 7 → 7. Sorting is the simple answer (O(N log N)); a heap of size K does O(N log K)."]
      ] },
      { h: "Patterns & pitfalls", blocks: [
        ["table", ["Signal in the problem", "Technique", "Cost"], [
          ["Many range-sum queries", "prefix sum", "O(N + Q)"],
          ["Count of X in a range", "indicator array + prefix sum", "O(N + Q)"],
          ["Many range <i>updates</i>, read at the end", "difference array", "O(N + Q)"],
          ["Pairs i &lt; j with a condition; best so far", "carry forward", "O(N)"],
          ["Max-sum contiguous subarray", "Kadane", "O(N)"],
          ["Sum over all subarrays", "contribution (i+1)(N−i)", "O(N)"],
          ["Water above each bar", "prefix/suffix max or two pointers", "O(N)"],
          ["Element &gt; N/2 times", "Moore's voting + verify", "O(N), O(1)"],
          ["Values should be 1..N, O(1) space", "cyclic placement (index as hash)", "O(N), O(1)"],
          ["Intervals", "sort by start, merge into current", "O(N log N)"]
        ]],
        ["warn", "Common bugs: forgetting the L = 0 case in pSum[R] − pSum[L−1]; initialising Kadane's answer to 0 (breaks all-negative arrays); writing e+1 when e = N − 1; no duplicate guard in cyclic placement (infinite loop); int overflow in contribution sums."]
      ] }
    ],
    lc: [
      ["Best Time to Buy and Sell Stock", "best-time-to-buy-and-sell-stock", "Easy"],
      ["Best Time to Buy and Sell Stock II", "best-time-to-buy-and-sell-stock-ii", "Medium"],
      ["Maximum Subarray", "maximum-subarray", "Medium"],
      ["Maximum Sum Circular Subarray", "maximum-sum-circular-subarray", "Medium"],
      ["Range Sum Query - Immutable", "range-sum-query-immutable", "Easy"],
      ["Find Pivot Index", "find-pivot-index", "Easy"],
      ["Ways to Make a Fair Array", "ways-to-make-a-fair-array", "Medium"],
      ["Product of Array Except Self", "product-of-array-except-self", "Medium"],
      ["Corporate Flight Bookings", "corporate-flight-bookings", "Medium"],
      ["Car Pooling", "car-pooling", "Medium"],
      ["Trapping Rain Water", "trapping-rain-water", "Hard"],
      ["Majority Element", "majority-element", "Easy"],
      ["Majority Element II", "majority-element-ii", "Medium"],
      ["First Missing Positive", "first-missing-positive", "Hard"],
      ["Merge Intervals", "merge-intervals", "Medium"],
      ["Insert Interval", "insert-interval", "Medium"],
      ["Plus One", "plus-one", "Easy"],
      ["H-Index", "h-index", "Medium"],
      ["Sum of All Odd Length Subarrays", "sum-of-all-odd-length-subarrays", "Easy"],
      ["Maximum Ascending Subarray Sum", "maximum-ascending-subarray-sum", "Easy"]
    ],
    quiz: [
      { q: "With pSum built, sum(L..R) for L &gt; 0 is…", o: ["pSum[R] − pSum[L]", "pSum[R] − pSum[L−1]", "pSum[R+1] − pSum[L]", "pSum[L] + pSum[R]"], a: 1, why: "pSum[R] includes a[0..R]; subtract a[0..L−1], which is pSum[L−1]." },
      { q: "Kadane on [-4, -3, -6, -9, -2] should return…", o: ["0", "-2", "-24", "-4"], a: 1, why: "Update the answer before resetting the running sum, so the largest single element (−2) wins. Initialising to 0 is the classic bug." },
      { q: "To add v to a[s..e] using a difference array you do…", o: ["a[s] += v; a[e] −= v", "a[s] += v; a[e+1] −= v", "a[s−1] += v; a[e] −= v", "add v to every cell"], a: 1, why: "The prefix sum carries +v from s onwards; −v at e+1 cancels it right after e." },
      { q: "How many subarrays contain index i in an array of length N?", o: ["i·(N−i)", "(i+1)·(N−i)", "N − i", "N(N+1)/2"], a: 1, why: "Start can be any of 0..i (i+1 choices) and end any of i..N−1 (N−i choices)." },
      { q: "In two-pointer rain water, why may we finalise the water at i when h[i] ≤ h[j]?", o: ["Because lmax ≥ rmax always", "Because a wall at least h[i] tall exists on the right, so lmax is the binding limit", "Because i is always smaller than j", "It is a heuristic and can be wrong"], a: 1, why: "Water at i is min(left max, right max) − h[i]. The right side already holds a wall h[j] ≥ h[i], and lmax never exceeds the taller side seen so far, so the left max is the smaller bound: water = lmax − h[i]." },
      { q: "Moore's voting returns candidate 4 on an array where no majority is guaranteed. You should…", o: ["Return 4", "Count 4 in a second pass and check > N/2", "Sort the array", "Run it again from the right"], a: 1, why: "The algorithm only guarantees the right answer if a majority exists; otherwise the candidate must be verified." },
      { q: "First missing positive of an array of length N is always in…", o: ["1..N", "0..N", "1..N+1", "any range"], a: 2, why: "N values can cover at most 1..N; if they all appear, the answer is N + 1." },
      { q: "Do (3, 6) and (6, 10) merge?", o: ["No, they only touch", "Yes, into (3, 10)", "Yes, into (6, 6)", "Only if sorted by end"], a: 1, why: "They do not satisfy s2 &gt; e1 (6 &gt; 6 is false), so they overlap and merge to (min start, max end)." }
    ]
  };

  /* ═════════ Topic: windows ═════════ */
  T["windows"] = {
    name: "Sliding window & two pointers", icon: "🪟", color: "#0e7c86", minutes: 60,
    notes: "sliding-window.pdf, 2Pointer.pdf, contests",
    summary: "Reuse the work from the previous position: slide a window by adding one element and dropping one, or move two pointers so each comparison discards an element for good.",
    sections: [
      { h: "Why windows and pointers work", blocks: [
        ["analogy", "Reading a long train timetable through a slot cut in a card: you move the card one row down, a new row appears and an old one disappears. You never re-read the rows still in the slot."],
        ["p", "There are <b>N − K + 1</b> subarrays of length K (N = 6, K = 4 → 3). Recomputing each sum costs K, so brute force is (N − K + 1)·K, which is O(N²) when K ≈ N/2. A <b>sliding window</b> updates the sum in O(1): add the element entering, subtract the one leaving."],
        ["p", "<b>Two pointers</b> work when the array is sorted (or the quantity is monotonic). Place the pointers so that <b>one move increases the quantity and the other decreases it</b>; then each comparison tells you which element can never be part of an answer, and you discard it."]
      ] },
      { h: "Fixed-size windows", blocks: [
        ["viz", "windowFixed", "Fixed window: one add and one subtract per step."],
        ["probs", [
          { t: "Maximum sum subarray of length exactly K", d: "Easy",
            q: "Return the largest sum among subarrays of length K.",
            ex: "a = [-3 4 -2 5 3 -2 8 2 -1 4], K = 5\nwindow sums 7 → 8 → 12 → 16 → 10 → 11\nAnswer: 16 (indices 3..7)",
            ap: [
              { n: "Brute force", cx: "O(N·K) time · O(1) space",
                idea: "Sum each of the N − K + 1 windows with an inner loop: O(N²) when K ≈ N/2.",
                code: "def max_window_sum(a, k):\n    ans = float('-inf')\n    for s in range(len(a) - k + 1):\n        total = 0\n        for i in range(s, s + k):\n            total += a[i]\n        ans = max(ans, total)\n    return ans" },
              { n: "Better", cx: "O(N) time · O(N) space",
                idea: "Prefix sums make each window one subtraction, but cost an extra array.",
                code: "def max_window_sum(a, k):\n    p = [0]\n    for x in a:\n        p.append(p[-1] + x)\n    ans = float('-inf')\n    for s in range(len(a) - k + 1):\n        ans = max(ans, p[s + k] - p[s])\n    return ans" },
              { n: "Optimal", cx: "O(N) time · O(1) space",
                idea: "Compute the first window, then slide: <b>sum += a[ei] − a[ei−K]</b>. Initialise ans with the first window (or −∞), not 0.",
                code: "def max_window_sum(a, k):\n    s = sum(a[0:k])\n    ans = s\n    for ei in range(k, len(a)):\n        s += a[ei] - a[ei - k]     # add entering, drop leaving\n        ans = max(ans, s)\n    return ans" }
            ],
            viz: "windowFixed", lc: "maximum-average-subarray-i" },
          { t: "Super Stream Integers (window average ≤ C)", d: "Easy",
            q: "Is there a block of exactly B consecutive packets whose average ack time is ≤ C? 1 ≤ A[i] ≤ 10^9.",
            ex: "A = [4 5 6 5 1], B = 3, C = 4 → 1 (window [6 5 1] has average 4)",
            ap: [
              { n: "Brute force", cx: "O(N·B) time · O(1) space",
                idea: "Average every window from scratch.",
                code: "def has_good_block(A, B, C):\n    for s in range(len(A) - B + 1):\n        if sum(A[s:s + B]) <= C * B:\n            return 1\n    return 0" },
              { n: "Optimal", cx: "O(N) time · O(1) space",
                idea: "Fixed size → sliding window on the sum (long). Compare <b>sum ≤ C·B</b> to avoid floating point.",
                code: "def has_good_block(A, B, C):\n    s = sum(A[0:B])\n    if s <= C * B:\n        return 1\n    for i in range(B, len(A)):\n        s += A[i] - A[i - B]\n        if s <= C * B:\n            return 1\n    return 0" }
            ] },
          { t: "Pick from both sides", d: "Medium",
            q: "Pick exactly K elements, some from the front and the rest from the back, to maximise the sum.",
            ex: "a = [2 -3 9 3 1 -6 1 2 4], K = 4\nsplits: 4+0 → 11, 3+1 → 8+4 = 12, 2+2 → -1+6 = 5, …\nAnswer: 12",
            ap: [
              { n: "Brute force", cx: "O(K²) time · O(1) space",
                idea: "Try each of the K + 1 splits (x from the front, K − x from the back) and add them up again.",
                code: "def pick_both_sides(a, k):\n    n = len(a)\n    ans = float('-inf')\n    for x in range(k + 1):\n        total = sum(a[0:x]) + sum(a[n - (k - x):n])\n        ans = max(ans, total)\n    return ans" },
              { n: "Optimal", cx: "O(K) time · O(1) space",
                idea: "Start with all K from the front (lsum). Then K times: drop the last front element and take the next one from the back. It is a window that wraps around the end (a <b>circular window</b>), or prefix + suffix sums.",
                code: "def pick_both_sides(a, k):\n    n = len(a)\n    lsum = sum(a[0:k])\n    rsum = 0\n    ans = lsum\n    i = k - 1\n    j = n - 1\n    for _ in range(k):\n        lsum -= a[i]           # give back one from the front\n        i -= 1\n        rsum += a[j]           # take one more from the back\n        j -= 1\n        ans = max(ans, lsum + rsum)\n    return ans" }
            ],
            lc: "maximum-points-you-can-obtain-from-cards" },
          { t: "Minimum swaps to group all elements ≤ B", d: "Medium",
            q: "Return the minimum swaps needed to bring all elements ≤ B together.",
            ex: "a = [3 15 4 12 8 7 30 40], B = 10\ngood elements 3, 4, 8, 7 → window size 4\nwindow [4 12 8 7] has 1 bad element → Answer: 1",
            ap: [
              { n: "Brute force", cx: "O(N·K) time · O(1) space",
                idea: "For every window of size K (the number of good elements) count the bad ones from scratch.",
                code: "def min_swaps(a, B):\n    k = sum(1 for x in a if x <= B)\n    if k == 0:\n        return 0\n    ans = k\n    for s in range(len(a) - k + 1):\n        bad = sum(1 for x in a[s:s + k] if x > B)\n        ans = min(ans, bad)\n    return ans" },
              { n: "Optimal", cx: "O(N) time · O(1) space",
                idea: "The final block has size K = (count of good elements). Slide a window of size K and count <b>bad</b> elements inside; each bad one needs exactly one swap. Answer = minimum bad count.",
                code: "def min_swaps(a, B):\n    k = sum(1 for x in a if x <= B)\n    if k == 0:\n        return 0\n    bad = sum(1 for x in a[0:k] if x > B)\n    ans = bad\n    for i in range(k, len(a)):\n        bad += (a[i] > B) - (a[i - k] > B)\n        ans = min(ans, bad)\n    return ans" }
            ],
            lc: "minimum-swaps-to-group-all-1s-together-ii" }
        ]]
      ] },
      { h: "Variable-size windows", blocks: [
        ["p", "When the window size is not given, <b>grow the right end</b> until the window breaks a rule, then <b>shrink the left end</b> until it is valid again. Each element enters once and leaves once: O(N). This needs the rule to be monotonic (e.g. all values positive for sum constraints)."],
        ["viz", "windowVariable", "Variable window: expand right, shrink left on a repeat."],
        ["probs", [
          { t: "Longest substring without repeating characters", d: "Medium",
            q: "Return the length of the longest substring with all distinct characters.",
            ex: "\"abcabcbb\" → 3 (\"abc\")   \"bbbbb\" → 1",
            ap: [
              { n: "Brute force", cx: "O(N²) time · O(alphabet) space",
                idea: "From every start, extend with a set until a character repeats.",
                code: "def longest_unique(s):\n    best = 0\n    for i in range(len(s)):\n        seen = set()\n        for j in range(i, len(s)):\n            if s[j] in seen:\n                break\n            seen.add(s[j])\n            best = max(best, j - i + 1)\n    return best" },
              { n: "Optimal", cx: "O(N) time · O(alphabet) space",
                idea: "Window [l, r] with the <b>last-seen index</b> of each character. On a repeat inside the window, jump l past the earlier copy.",
                code: "def longest_unique(s):\n    seen = {}\n    l = 0\n    best = 0\n    for r, ch in enumerate(s):\n        if ch in seen and seen[ch] >= l:\n            l = seen[ch] + 1       # skip past the earlier copy\n        seen[ch] = r\n        best = max(best, r - l + 1)\n    return best" }
            ],
            viz: "windowVariable", lc: "longest-substring-without-repeating-characters" },
          { t: "Minimum size subarray with sum ≥ target", d: "Medium",
            q: "Positive integers. Return the shortest subarray length whose sum is at least target (0 if none).",
            ex: "target = 7, [2 3 1 2 4 3] → 2 ([4 3])",
            ap: [
              { n: "Brute force", cx: "O(N²) time · O(1) space",
                idea: "From every start, extend until the sum reaches target.",
                code: "def min_len(target, a):\n    n = len(a)\n    best = float('inf')\n    for i in range(n):\n        s = 0\n        for j in range(i, n):\n            s += a[j]\n            if s >= target:\n                best = min(best, j - i + 1)\n                break\n    return 0 if best == float('inf') else best" },
              { n: "Better", cx: "O(N log N) time · O(N) space",
                idea: "Prefix sums are increasing (positive values), so for each start <b>binary search</b> the first end with p[end] ≥ p[start] + target.",
                code: "from bisect import bisect_left\n\ndef min_len(target, a):\n    p = [0]\n    for x in a:\n        p.append(p[-1] + x)\n    best = float('inf')\n    for i in range(len(a)):\n        end = bisect_left(p, p[i] + target)\n        if end < len(p):\n            best = min(best, end - i)\n    return 0 if best == float('inf') else best" },
              { n: "Optimal", cx: "O(N) time · O(1) space",
                idea: "Expand r adding a[r]; <b>while sum ≥ target</b> record the length and shrink from l. Works because values are positive (shrinking always lowers the sum).",
                code: "def min_len(target, a):\n    l = 0\n    s = 0\n    best = float('inf')\n    for r in range(len(a)):\n        s += a[r]\n        while s >= target:\n            best = min(best, r - l + 1)\n            s -= a[l]          # shrink from the left\n            l += 1\n    return 0 if best == float('inf') else best" }
            ],
            lc: "minimum-size-subarray-sum" },
          { t: "Max consecutive ones with at most K flips", d: "Medium",
            q: "Return the longest run of 1s if you may flip at most K zeros. (K = 1 is the replacement problem from the arrays topic.)",
            ex: "[1 1 1 0 0 0 1 1 1 1 0], K = 2 → 6",
            ap: [
              { n: "Brute force", cx: "O(N²) time · O(1) space",
                idea: "From every start, extend while at most K zeros have been used.",
                code: "def longest_ones(a, k):\n    best = 0\n    for i in range(len(a)):\n        zeros = 0\n        for j in range(i, len(a)):\n            if a[j] == 0:\n                zeros += 1\n            if zeros > k:\n                break\n            best = max(best, j - i + 1)\n    return best" },
              { n: "Optimal", cx: "O(N) time · O(1) space",
                idea: "Window with <b>at most K zeros</b>: expand r, and while zeros &gt; K move l forward.",
                code: "def longest_ones(a, k):\n    l = 0\n    zeros = 0\n    best = 0\n    for r in range(len(a)):\n        if a[r] == 0:\n            zeros += 1\n        while zeros > k:\n            if a[l] == 0:\n                zeros -= 1\n            l += 1\n        best = max(best, r - l + 1)\n    return best" }
            ] }
        ]]
      ] },
      { h: "Two pointers on sorted arrays", blocks: [
        ["p", "Where do the pointers start? The notes try (0, 1), (N−1, N−2) and the middle and reject them: there, both moves change the sum the same way. For <b>pair sum</b> start at (0, N−1): i++ raises the sum, j−− lowers it. For <b>pair difference</b> start at (0, 1): j++ raises the difference, i++ lowers it ((0, N−1) fails because both moves lower it)."],
        ["viz", "twoPointer", "Pair sum: a too-small sum means a[i] can never pair with anything, so drop it."],
        ["probs", [
          { t: "Pair sum = K (sorted, distinct)", d: "Medium",
            q: "Count pairs i ≠ j with a[i] + a[j] = K.",
            ex: "a = [-3 0 1 3 6 8 11 14 18 25]\nK = 17 → 2 (3+14, 6+11)   K = 12 → 1",
            ap: [
              { n: "Brute force", cx: "O(N²) time · O(1) space",
                idea: "Try every pair.",
                code: "def count_pairs(a, k):\n    n = len(a)\n    c = 0\n    for i in range(n):\n        for j in range(i + 1, n):\n            if a[i] + a[j] == k:\n                c += 1\n    return c" },
              { n: "Better", cx: "O(N log N) time · O(1) space",
                idea: "For each a[i], <b>binary search</b> K − a[i] to its right. (A hash set gives O(N) time but O(N) space.)",
                code: "from bisect import bisect_left\n\ndef count_pairs(a, k):\n    n = len(a)\n    c = 0\n    for i in range(n):\n        j = bisect_left(a, k - a[i], i + 1, n)\n        if j < n and a[j] == k - a[i]:\n            c += 1\n    return c" },
              { n: "Optimal", cx: "O(N) time · O(1) space",
                idea: "i = 0, j = N−1. Sum too small → i++ (a[i] is too small for every remaining j). Too big → j−−. Equal → count and move both.",
                code: "def count_pairs(a, k):\n    i = 0\n    j = len(a) - 1\n    c = 0\n    while i < j:\n        s = a[i] + a[j]\n        if s == k:\n            c += 1\n            i += 1\n            j -= 1\n        elif s < k:\n            i += 1             # a[i] too small for every j\n        else:\n            j -= 1             # a[j] too big for every i\n    return c" }
            ],
            viz: "twoPointer", lc: "two-sum-ii-input-array-is-sorted" },
          { t: "Pair sum with duplicates", d: "Medium",
            q: "Same as pair sum, but values may repeat; count index pairs.",
            ex: "K = 10\n[1 3 4 5 6 7 10] → 2\n[1 3 4 4 5 6 6 6 7 10] → 7\n[1 3 4 4 5 5 5 5 5 6 6 6 7 10] → 1 + 2·3 + 5C2 = 17",
            ap: [
              { n: "Brute force", cx: "O(N²) time · O(1) space",
                idea: "Try every index pair.",
                code: "def count_pairs(a, k):\n    n = len(a)\n    c = 0\n    for i in range(n):\n        for j in range(i + 1, n):\n            if a[i] + a[j] == k:\n                c += 1\n    return c" },
              { n: "Optimal", cx: "O(N) time · O(1) space",
                idea: "Change only the equality branch. If a[i] == a[j], everything between is equal: add <b>c·(c−1)/2</b> with c = j − i + 1 and stop. Otherwise count the run of a[i] (lc) and of a[j] (rc) and add <b>lc·rc</b>.",
                code: "def count_pairs(a, k):\n    i = 0\n    j = len(a) - 1\n    ans = 0\n    while i < j:\n        s = a[i] + a[j]\n        if s < k:\n            i += 1\n        elif s > k:\n            j -= 1\n        elif a[i] == a[j]:\n            c = j - i + 1          # all of a[i..j] are equal\n            ans += c * (c - 1) // 2\n            break\n        else:\n            lc = 1\n            while a[i + lc] == a[i]:\n                lc += 1\n            rc = 1\n            while a[j - rc] == a[j]:\n                rc += 1\n            ans += lc * rc\n            i += lc\n            j -= rc\n    return ans" }
            ] },
          { t: "Pair difference = K (sorted, distinct)", d: "Medium",
            q: "Count pairs with a[j] − a[i] = K (K ≥ 0).",
            ex: "[-3 0 1 3 6 8 11 14 18 25 30], K = 5 → 4",
            ap: [
              { n: "Brute force", cx: "O(N²) time · O(1) space",
                idea: "Try every pair.",
                code: "def count_diff(a, k):\n    n = len(a)\n    c = 0\n    for i in range(n):\n        for j in range(i + 1, n):\n            if a[j] - a[i] == k:\n                c += 1\n    return c" },
              { n: "Better", cx: "O(N) time · O(N) space",
                idea: "Put the values in a hash set and look up x + K for every x. (Binary search instead: O(N log N), O(1) space.)",
                code: "def count_diff(a, k):\n    if k == 0:\n        return 0                  # values are distinct\n    seen = set(a)\n    c = 0\n    for x in a:\n        if x + k in seen:\n            c += 1\n    return c" },
              { n: "Optimal", cx: "O(N) time · O(1) space",
                idea: "Both pointers move <b>right</b>: i = 0, j = 1. diff &lt; K → j++; diff &gt; K → i++ (and if i catches j, push j ahead); equal → count, move both.",
                code: "def count_diff(a, k):\n    n = len(a)\n    i = 0\n    j = 1\n    c = 0\n    while j < n:\n        d = a[j] - a[i]\n        if d == k:\n            c += 1\n            i += 1\n            j += 1\n        elif d < k:\n            j += 1             # need a bigger difference\n        else:\n            i += 1             # need a smaller difference\n            if i == j:\n                j += 1\n    return c" }
            ],
            lc: "k-diff-pairs-in-an-array" },
          { t: "Triplet sum", d: "Medium",
            q: "Count triplets i &lt; j &lt; k in a sorted distinct array with a[i] + a[j] + a[k] = K.",
            ex: "[-8 -4 -3 -1 2 3 5 7 9], K = 14 → 2 ((2,5,7) and (2,3,9))",
            ap: [
              { n: "Brute force", cx: "O(N³) time · O(1) space",
                idea: "Try every triplet.",
                code: "def count_triplets(a, k):\n    n = len(a)\n    c = 0\n    for i in range(n):\n        for j in range(i + 1, n):\n            for m in range(j + 1, n):\n                if a[i] + a[j] + a[m] == k:\n                    c += 1\n    return c" },
              { n: "Optimal", cx: "O(N²) time · O(1) space",
                idea: "<b>Fix the first element</b>, then the other two form a pair-sum problem with target K − a[i] on the suffix i+1..N−1.",
                code: "def count_triplets(a, k):\n    n = len(a)\n    c = 0\n    for i in range(n - 2):\n        target = k - a[i]\n        lo = i + 1\n        hi = n - 1\n        while lo < hi:\n            s = a[lo] + a[hi]\n            if s == target:\n                c += 1\n                lo += 1\n                hi -= 1\n            elif s < target:\n                lo += 1\n            else:\n                hi -= 1\n    return c" }
            ],
            edge: "For LeetCode 3Sum you must also skip equal values to avoid duplicate triplets.",
            lc: "3sum" },
          { t: "Count subarrays with sum K (positive integers)", d: "Medium",
            q: "All elements are positive. Count subarrays whose sum is K.",
            ex: "[1 2 5 4 3], K = 9 → 1 ([5 4])\n[3 2 5 1 8 6 2 10], K = 15 → 1 ([1 8 6])\n  pSum = [3 5 10 11 19 25 27 37]",
            ap: [
              { n: "Brute force", cx: "O(N²) time · O(1) space",
                idea: "All subarrays with a running sum.",
                code: "def count_sum_k(a, k):\n    n = len(a)\n    c = 0\n    for i in range(n):\n        s = 0\n        for j in range(i, n):\n            s += a[j]\n            if s == k:\n                c += 1\n    return c" },
              { n: "Better", cx: "O(N) time · O(N) space",
                idea: "sum(i..j) = pSum[j] − pSum[i−1] = K, so you need <b>pairs in pSum with difference K</b>. Positive values make pSum strictly increasing, which is exactly the sorted pair-difference setting. Put a virtual 0 in front so subarrays starting at 0 count. (With negative numbers use the hash-map version.)",
                code: "def count_sum_k(a, k):\n    p = [0]\n    for x in a:\n        p.append(p[-1] + x)       # strictly increasing\n    i = 0\n    j = 1\n    c = 0\n    while j < len(p):\n        d = p[j] - p[i]\n        if d == k:\n            c += 1\n            i += 1\n            j += 1\n        elif d < k:\n            j += 1\n        else:\n            i += 1\n            if i == j:\n                j += 1\n    return c" },
              { n: "Optimal", cx: "O(N) time · O(1) space",
                idea: "The same walk without storing pSum: the pointers are the window ends. Grow r, <b>shrink l while the sum exceeds K</b>, count when it equals K. Only valid because every value is positive.",
                code: "def count_sum_k(a, k):\n    l = 0\n    s = 0\n    c = 0\n    for r in range(len(a)):\n        s += a[r]\n        while s > k and l <= r:\n            s -= a[l]\n            l += 1\n        if s == k:\n            c += 1\n    return c" }
            ],
            viz: "subarraySumK" }
        ]],
        ["viz", "subarraySumK", "The general version (negatives allowed): count earlier prefix sums equal to ps − k in a hash map."]
      ] },
      { h: "Container with most water", blocks: [
        ["viz", "arr_container", "Always move the shorter wall: keeping it can never beat the current area."],
        ["probs", [
          { t: "Container with most water", d: "Medium",
            q: "a[i] is a wall height. Pick two walls to hold the most water: (j − i) × min(a[i], a[j]).",
            ex: "[3 5 4 7 3 6 5 4 1 2] → 25 (walls 1 and 6: width 5 × height 5)\ntrace: 9·2 = 18, 8·1 = 8, 7·3 = 21, 6·4 = 24, 5·5 = 25",
            ap: [
              { n: "Brute force", cx: "O(N²) time · O(1) space",
                idea: "Try every pair of walls.",
                code: "def max_area(a):\n    n = len(a)\n    ans = 0\n    for i in range(n):\n        for j in range(i + 1, n):\n            ans = max(ans, (j - i) * min(a[i], a[j]))\n    return ans" },
              { n: "Optimal", cx: "O(N) time · O(1) space",
                idea: "Start with the widest pair. Moving inward always loses width, so the only hope is a taller limiting wall: <b>move the pointer at the shorter wall</b>. Any container using the shorter wall with a closer partner is narrower and no taller.",
                code: "def max_area(a):\n    ans = 0\n    i = 0\n    j = len(a) - 1\n    while i < j:\n        ans = max(ans, (j - i) * min(a[i], a[j]))\n        if a[i] <= a[j]:\n            i += 1             # shorter wall can't do better\n        else:\n            j -= 1\n    return ans" }
            ],
            viz: "arr_container", lc: "container-with-most-water" }
        ]]
      ] },
      { h: "Interview cheatsheet", blocks: [
        ["table", ["Problem says", "Use", "Pointer setup"], [
          ["All subarrays of size K", "fixed sliding window", "add a[r], drop a[r−K]"],
          ["Longest / shortest subarray with a rule", "variable window", "expand r, shrink l while invalid"],
          ["Sorted + pair sum", "two pointers", "i = 0, j = N−1"],
          ["Sorted + pair difference", "two pointers, same direction", "i = 0, j = 1"],
          ["Triplets", "fix one + pair sum", "O(N²)"],
          ["Two walls / area", "shorter wall moves", "i = 0, j = N−1"],
          ["Take from both ends", "circular window / prefix + suffix", "K + 1 splits"],
          ["Subarray sum = K with negatives", "prefix sum + hash map", "not a window"]
        ]],
        ["warn", "A sliding window on sums only works when values are non-negative. With negative numbers, shrinking the window can increase the sum, so use prefix sums + hashing instead."],
        ["extra", "Consecutive-values subarray check: a subarray of distinct values is a run of consecutive integers iff its length j − i + 1 equals max − min + 1. In [2 1 4 3 15 16 20 18 17 19 25], [15 16 20 18 17 19] has 20 − 15 + 1 = 6 = its length."]
      ] }
    ],
    lc: [
      ["Two Sum II - Input Array Is Sorted", "two-sum-ii-input-array-is-sorted", "Medium"],
      ["3Sum", "3sum", "Medium"],
      ["3Sum Closest", "3sum-closest", "Medium"],
      ["Container With Most Water", "container-with-most-water", "Medium"],
      ["Remove Duplicates from Sorted Array", "remove-duplicates-from-sorted-array", "Easy"],
      ["Remove Duplicates from Sorted Array II", "remove-duplicates-from-sorted-array-ii", "Medium"],
      ["Remove Element", "remove-element", "Easy"],
      ["Merge Sorted Array", "merge-sorted-array", "Easy"],
      ["Move Zeroes", "move-zeroes", "Easy"],
      ["Squares of a Sorted Array", "squares-of-a-sorted-array", "Easy"],
      ["Minimum Size Subarray Sum", "minimum-size-subarray-sum", "Medium"],
      ["Longest Substring Without Repeating Characters", "longest-substring-without-repeating-characters", "Medium"],
      ["Maximum Average Subarray I", "maximum-average-subarray-i", "Easy"],
      ["Max Consecutive Ones III", "max-consecutive-ones-iii", "Medium"],
      ["Maximum Points You Can Obtain from Cards", "maximum-points-you-can-obtain-from-cards", "Medium"],
      ["K-diff Pairs in an Array", "k-diff-pairs-in-an-array", "Medium"],
      ["Subarray Product Less Than K", "subarray-product-less-than-k", "Medium"],
      ["Boats to Save People", "boats-to-save-people", "Medium"],
      ["Minimum Swaps to Group All 1's Together II", "minimum-swaps-to-group-all-1s-together-ii", "Medium"]
    ],
    quiz: [
      { q: "How many subarrays of length K does an array of length N have?", o: ["N − K", "N − K + 1", "N·K", "N(N+1)/2"], a: 1, why: "The start can be 0..N−K, which is N − K + 1 choices." },
      { q: "For pair sum on a sorted array, why start at i = 0, j = N − 1?", o: ["It is the fastest to type", "Moving i increases the sum and moving j decreases it, so each comparison discards one element", "Both moves increase the sum", "To handle duplicates"], a: 1, why: "Opposite effects let you rule out a[i] (too small for everyone) or a[j] (too big for everyone) at each step." },
      { q: "For pair difference on a sorted array the pointers start at…", o: ["(0, N−1)", "(0, 1)", "(N/2, N/2+1)", "(N−1, N−2)"], a: 1, why: "At (0, 1), j++ increases the difference and i++ decreases it. At (0, N−1) both moves decrease it." },
      { q: "In container with most water, which pointer moves?", o: ["The taller wall", "The shorter wall", "Both always", "The one closer to the middle"], a: 1, why: "Keeping the shorter wall with any closer partner gives less width and no more height, so it can be discarded." },
      { q: "Why can't a sliding window count subarrays with sum K when values can be negative?", o: ["It can, always", "Shrinking may increase the sum, so the window rule is not monotonic", "Negative numbers overflow", "Windows only work on strings"], a: 1, why: "With negatives, there is no safe direction to move l; use prefix sums + a hash map." },
      { q: "Triplet sum with two pointers costs…", o: ["O(N)", "O(N log N)", "O(N²)", "O(N³)"], a: 2, why: "N choices of the fixed element × an O(N) pair-sum scan." },
      { q: "Pick K from both ends: how many splits must you check?", o: ["K", "K + 1", "N − K", "2K"], a: 1, why: "Take 0, 1, …, K from the back (the rest from the front): K + 1 options, each updated in O(1)." }
    ]
  };

  /* ═════════ Topic: matrix ═════════ */
  T["matrix"] = {
    name: "2-D arrays (matrices)", icon: "🔲", color: "#b45309", minutes: 50,
    notes: "2dArray.pdf, 2dArrayProblemsAdvanced.pdf, arrayProblems.pdf",
    summary: "Walk a grid with index arithmetic: rows, columns, diagonals, layers; rotate with transpose + reverse; search sorted matrices from the top-right corner.",
    sections: [
      { h: "How a matrix is stored and walked", blocks: [
        ["p", "<code>int a[N][M]</code> has N rows, M columns and N·M cells, indexed (0,0)..(N−1, M−1). In Java, <code>a</code> points to an array of row references; a[2][3] follows the row-2 pointer, then adds 3·4 bytes. Access is still O(1). Rows can have different lengths (<b>jagged arrays</b>, <code>new int[N][]</code>), but almost every problem uses a[N][M]."],
        ["analogy", "A cinema hall: the row letter picks the row, the seat number picks the column. Walking a diagonal is “one row forward, one seat left”."],
        ["probs", [
          { t: "Row-wise and column-wise sums", d: "Easy",
            q: "Print the sum of every row, then of every column.",
            ex: "[[10 2 7 3] [9 5 -1 8] [3 11 15 20]]\nrows → 22, 21, 49\ncolumns → 22, 18, 21, 31",
            ap: [
              { n: "Solution", cx: "O(N·M) time · O(1) space",
                idea: "Already optimal: every cell must be read once. Rows: outer loop i, inner loop j. Columns: <b>swap the loop order</b> (outer j, inner i).",
                code: "def row_col_sums(a):\n    n = len(a)\n    m = len(a[0])\n    for i in range(n):\n        s = 0\n        for j in range(m):\n            s += a[i][j]\n        print(s)\n    for j in range(m):\n        s = 0\n        for i in range(n):\n            s += a[i][j]\n        print(s)" }
            ],
            lc: "richest-customer-wealth" },
          { t: "Main and anti-diagonal", d: "Easy",
            q: "Print the main diagonal and the anti-diagonal of an N×N matrix.",
            ex: "[[1 5 8 7] [2 11 3 9] [15 20 -3 18] [30 40 50 60]]\nmain → 1 11 -3 60   anti → 7 3 20 30",
            ap: [
              { n: "Brute force", cx: "O(N²) time · O(1) space",
                idea: "Scan all N² cells and print those with i == j (or i + j == N − 1).",
                code: "def diagonals(a):\n    n = len(a)\n    main = []\n    anti = []\n    for i in range(n):\n        for j in range(n):\n            if i == j:\n                main.append(a[i][j])\n            if i + j == n - 1:\n                anti.append(a[i][j])\n    return main, anti" },
              { n: "Optimal", cx: "O(N) time · O(1) space",
                idea: "Main: (i, i). Anti: start at (0, N−1) and do <b>i++, j−−</b>, i.e. (i, N−1−i).",
                code: "def diagonals(a):\n    n = len(a)\n    main = [a[i][i] for i in range(n)]\n    anti = [a[i][n - 1 - i] for i in range(n)]\n    return main, anti" }
            ],
            edge: "For odd N the centre is on both diagonals (count it once in a diagonal sum).",
            lc: "matrix-diagonal-sum" },
          { t: "Print all right-to-left diagonals (N×M)", d: "Medium",
            q: "Print every diagonal running from top-right to bottom-left.",
            ex: "4×5 matrix 1..20 →\n[1] [2 6] [3 7 11] [4 8 12 16] [5 9 13 17] [10 14 18] [15 19] [20]",
            ap: [
              { n: "Brute force", cx: "O(N·M) time · O(N·M) space",
                idea: "Every cell of one right-to-left diagonal has the same i + j. Bucket cells by i + j.",
                code: "def anti_diagonals(a):\n    n = len(a)\n    m = len(a[0])\n    buckets = [[] for _ in range(n + m - 1)]\n    for i in range(n):\n        for j in range(m):\n            buckets[i + j].append(a[i][j])\n    return buckets" },
              { n: "Optimal", cx: "O(N·M) time · O(1) extra",
                idea: "Every such diagonal starts on the <b>top row</b> (0, 0..M−1) or the <b>last column</b> (1..N−1, M−1). From each start walk i++, j−− while inside the grid.",
                code: "def walk(a, i, j):\n    out = []\n    while i < len(a) and j >= 0:\n        out.append(a[i][j])\n        i += 1\n        j -= 1\n    return out\n\ndef anti_diagonals(a):\n    n = len(a)\n    m = len(a[0])\n    result = []\n    for col in range(m):            # starts on the top row\n        result.append(walk(a, 0, col))\n    for row in range(1, n):         # then down the last column\n        result.append(walk(a, row, m - 1))\n    return result" }
            ],
            lc: "diagonal-traverse" }
        ]]
      ] },
      { h: "Transpose and rotation", blocks: [
        ["viz", "arr_rotateMatrix", "Transpose (mirror across the diagonal), then reverse each row: 90° clockwise."],
        ["probs", [
          { t: "Transpose a square matrix in place", d: "Easy",
            q: "Swap rows and columns of an N×N matrix without extra space.",
            ex: "[[1 2 3 4] [5 6 7 8] [9 10 11 12] [13 14 15 16]]\n→ [[1 5 9 13] [2 6 10 14] [3 7 11 15] [4 8 12 16]]",
            ap: [
              { n: "Brute force", cx: "O(N²) time · O(N²) space",
                idea: "Copy into a new matrix b[j][i] = a[i][j].",
                code: "def transpose(a):\n    n = len(a)\n    return [[a[i][j] for i in range(n)] for j in range(n)]" },
              { n: "Optimal", cx: "O(N²) time · O(1) space",
                idea: "Swap a[i][j] with a[j][i] for the <b>upper triangle only</b> (j from i + 1). If j starts at 0, every pair is swapped twice and you get the original back.",
                code: "def transpose(a):\n    n = len(a)\n    for i in range(n):\n        for j in range(i + 1, n):      # upper triangle only\n            a[i][j], a[j][i] = a[j][i], a[i][j]" }
            ],
            edge: "A non-square N×M transpose changes shape (2×4 → 4×2) and needs a new M×N matrix.",
            lc: "transpose-matrix" },
          { t: "Rotate N×N by 90° clockwise", d: "Medium",
            q: "Rotate the matrix in place.",
            ex: "[[1 2 3 4] [5 6 7 8] [9 10 11 12] [13 14 15 16]]\n→ [[13 9 5 1] [14 10 6 2] [15 11 7 3] [16 12 8 4]]",
            ap: [
              { n: "Brute force", cx: "O(N²) time · O(N²) space",
                idea: "Write into a new matrix: b[j][N−1−i] = a[i][j].",
                code: "def rotate(a):\n    n = len(a)\n    b = [[0] * n for _ in range(n)]\n    for i in range(n):\n        for j in range(n):\n            b[j][n - 1 - i] = a[i][j]\n    return b" },
              { n: "Optimal", cx: "O(N²) time · O(1) space",
                idea: "<b>Transpose, then reverse every row.</b> 180°: reverse every row, then reverse every column (or reverse rows and the row order). Anticlockwise 90°: transpose, then reverse every column.",
                code: "def rotate(a):\n    n = len(a)\n    for i in range(n):\n        for j in range(i + 1, n):          # transpose\n            a[i][j], a[j][i] = a[j][i], a[i][j]\n    for row in a:\n        row.reverse()                      # mirror each row" }
            ],
            viz: "arr_rotateMatrix", lc: "rotate-image" },
          { t: "Zero matrix (set row and column to 0)", d: "Medium",
            q: "In an N×M matrix with values ≥ 0, if a cell is 0, set its entire row and column to 0.",
            ex: "[[1 2 3 4] [5 6 7 0] [9 2 0 4]] → [[1 2 0 0] [0 0 0 0] [0 0 0 0]]",
            ap: [
              { n: "Brute force", cx: "O(N·M·(N+M)) time · O(N·M) space",
                idea: "Copy the matrix; for every 0 in the copy, zero its row and column in the original.",
                code: "def set_zeroes(a):\n    n = len(a)\n    m = len(a[0])\n    copy = [row[:] for row in a]\n    for i in range(n):\n        for j in range(m):\n            if copy[i][j] == 0:\n                for c in range(m):\n                    a[i][c] = 0\n                for r in range(n):\n                    a[r][j] = 0" },
              { n: "Better", cx: "O(N·M) time · O(N + M) space",
                idea: "Remember which rows and which columns contain a 0 in two boolean arrays, then zero those cells. Works with negatives too.",
                code: "def set_zeroes(a):\n    n = len(a)\n    m = len(a[0])\n    zero_row = [False] * n\n    zero_col = [False] * m\n    for i in range(n):\n        for j in range(m):\n            if a[i][j] == 0:\n                zero_row[i] = True\n                zero_col[j] = True\n    for i in range(n):\n        for j in range(m):\n            if zero_row[i] or zero_col[j]:\n                a[i][j] = 0" },
              { n: "Optimal", cx: "O(N·M) time · O(1) space",
                idea: "Use the non-negative guarantee: row pass marks every non-zero cell of a row that contains a 0 as <b>−1</b>; column pass does the same for columns holding an original 0; finally turn −1 into 0. Marking −1 instead of 0 stops new zeros from looking original.",
                code: "def set_zeroes(a):\n    n = len(a)\n    m = len(a[0])\n    for i in range(n):\n        if 0 in a[i]:\n            for j in range(m):\n                if a[i][j] != 0:\n                    a[i][j] = -1           # mark, don't create a 0\n    for j in range(m):\n        if any(a[i][j] == 0 for i in range(n)):\n            for i in range(n):\n                if a[i][j] != 0:\n                    a[i][j] = -1\n    for i in range(n):\n        for j in range(m):\n            if a[i][j] == -1:\n                a[i][j] = 0" }
            ],
            edge: "If negatives are allowed, use the first row and column as marker arrays instead (LeetCode's version).",
            lc: "set-matrix-zeroes" }
        ]]
      ] },
      { h: "Boundary and spiral", blocks: [
        ["viz", "spiral", "Spiral: peel the outer layer, then the next one in."],
        ["probs", [
          { t: "Print boundary elements", d: "Easy",
            q: "Print the border of an N×N matrix clockwise from (0, 0).",
            ex: "5×5 matrix 1..25 → 1 2 3 4 5 10 15 20 25 24 23 22 21 16 11 6",
            ap: [
              { n: "Solution", cx: "O(N) time · O(1) space",
                idea: "Scanning all cells and filtering edges is O(N²) and awkward to order. Instead use four loops of exactly <b>N − 1</b> steps: right along the top, down the last column, left along the bottom, up the first column. N − 1 per side means no corner is printed twice.",
                code: "def boundary(a):\n    n = len(a)\n    if n == 1:\n        return [a[0][0]]\n    out = []\n    i = 0\n    j = 0\n    for _ in range(n - 1):     # top row, left to right\n        out.append(a[i][j])\n        j += 1\n    for _ in range(n - 1):     # last column, top to bottom\n        out.append(a[i][j])\n        i += 1\n    for _ in range(n - 1):     # bottom row, right to left\n        out.append(a[i][j])\n        j -= 1\n    for _ in range(n - 1):     # first column, bottom to top\n        out.append(a[i][j])\n        i -= 1\n    return out" }
            ],
            edge: "N = 1: print the single cell (the four loops do nothing)." },
          { t: "Spiral matrix", d: "Medium",
            q: "Print an N×N matrix in spiral order.",
            ex: "6×6 matrix 1..36 → 1 2 3 4 5 6 12 18 24 30 36 35 34 33 32 31 25 19 13 7 8 9 10 11 17 23 29 28 27 26 20 14 15 16 22 21",
            ap: [
              { n: "Brute force", cx: "O(N²) time · O(N²) space",
                idea: "Simulate: walk in a direction, turn right when the next cell is outside or already visited. Needs a visited matrix.",
                code: "def spiral(a):\n    n = len(a)\n    m = len(a[0])\n    seen = [[False] * m for _ in range(n)]\n    dirs = [(0, 1), (1, 0), (0, -1), (-1, 0)]   # right, down, left, up\n    out = []\n    i = 0\n    j = 0\n    d = 0\n    for _ in range(n * m):\n        out.append(a[i][j])\n        seen[i][j] = True\n        ni = i + dirs[d][0]\n        nj = j + dirs[d][1]\n        if not (0 <= ni < n and 0 <= nj < m) or seen[ni][nj]:\n            d = (d + 1) % 4                     # turn right\n            ni = i + dirs[d][0]\n            nj = j + dirs[d][1]\n        i = ni\n        j = nj\n    return out" },
              { n: "Optimal", cx: "O(N²) time · O(1) extra",
                idea: "Print the boundary, then step into the next layer: <b>i++, j++, N −= 2</b>. Layers for N = 6: (0,0,6) → (1,1,4) → (2,2,2) → (3,3,0). For odd N one centre cell remains (N == 1): print it.",
                code: "def spiral(a):\n    n = len(a)\n    out = []\n    i = 0\n    j = 0\n    while n > 1:\n        for _ in range(n - 1):     # top row\n            out.append(a[i][j])\n            j += 1\n        for _ in range(n - 1):     # right column\n            out.append(a[i][j])\n            i += 1\n        for _ in range(n - 1):     # bottom row\n            out.append(a[i][j])\n            j -= 1\n        for _ in range(n - 1):     # left column\n            out.append(a[i][j])\n            i -= 1\n        i += 1                     # step into the next layer\n        j += 1\n        n -= 2\n    if n == 1:\n        out.append(a[i][j])        # odd N: the centre cell\n    return out" }
            ],
            viz: "spiral", lc: "spiral-matrix" }
        ]]
      ] },
      { h: "Sorted matrices: staircase search", blocks: [
        ["p", "If every row and every column is sorted, the <b>top-right</b> corner is special: everything to its left is smaller and everything below is bigger. One comparison throws away a whole row or a whole column."],
        ["viz", "arr_staircase", "From the top-right: too small → drop the row, too big → drop the column."],
        ["probs", [
          { t: "Search in a row- and column-sorted matrix", d: "Medium",
            q: "Return whether K is present.",
            ex: "[[-5 -2 1 13] [-4 0 3 14] [-3 2 6 18] [2 5 10 20]]\nsearch(6) → true (13 → 1 → 3 → 6)\nsearch(15) → false   search(0) → true",
            ap: [
              { n: "Brute force", cx: "O(N·M) time · O(1) space",
                idea: "Scan every cell.",
                code: "def search(a, k):\n    for row in a:\n        for x in row:\n            if x == k:\n                return True\n    return False" },
              { n: "Better", cx: "O(N log M) time · O(1) space",
                idea: "Each row is sorted: <b>binary search</b> every row.",
                code: "from bisect import bisect_left\n\ndef search(a, k):\n    for row in a:\n        j = bisect_left(row, k)\n        if j < len(row) and row[j] == k:\n            return True\n    return False" },
              { n: "Optimal", cx: "O(N + M) time · O(1) space",
                idea: "Start at (0, M−1). Equal → found. Smaller than K → <b>i++</b> (the rest of row i is even smaller). Bigger → <b>j−−</b> (the rest of column j is even bigger). The bottom-left corner works too; the other two corners do not.",
                code: "def search(a, k):\n    n = len(a)\n    m = len(a[0])\n    i = 0\n    j = m - 1                      # top-right corner\n    while i < n and j >= 0:\n        if a[i][j] == k:\n            return True\n        if a[i][j] < k:\n            i += 1                 # row i is too small\n        else:\n            j -= 1                 # column j is too big\n    return False" }
            ],
            edge: "Follow-up: if K repeats and you need the smallest i·1009 + j, record a match and keep moving left (j−−) instead of stopping.",
            viz: "arr_staircase", lc: "search-a-2d-matrix-ii" },
          { t: "Row with the maximum number of 1s", d: "Medium",
            q: "N×N binary matrix, each row sorted (0s then 1s). Return the row with the most 1s (first one on ties).",
            ex: "[[0 1 1] [0 0 1] [0 1 1]] → 0\n[[0 0 0 0] [0 0 0 1] [0 0 1 1] [0 1 1 1]] → 3",
            ap: [
              { n: "Brute force", cx: "O(N²) time · O(1) space",
                idea: "Count the 1s in every row.",
                code: "def max_ones_row(a):\n    best = -1\n    row = 0\n    for i in range(len(a)):\n        c = sum(a[i])\n        if c > best:\n            best = c\n            row = i\n    return row" },
              { n: "Better", cx: "O(N log N) time · O(1) space",
                idea: "Rows are sorted, so <b>binary search</b> the first 1 in each row: ones = N − firstOne.",
                code: "from bisect import bisect_left\n\ndef max_ones_row(a):\n    n = len(a)\n    best = -1\n    row = 0\n    for i in range(n):\n        ones = n - bisect_left(a[i], 1)\n        if ones > best:\n            best = ones\n            row = i\n    return row" },
              { n: "Optimal", cx: "O(N) time (at most 2N moves) · O(1) space",
                idea: "Same staircase walk from the top-right: on a <b>1 move left</b> and record row = i (this row has at least that many ones); on a <b>0 move down</b> (this row cannot beat the best). The pointer only goes left or down.",
                code: "def max_ones_row(a):\n    n = len(a)\n    i = 0\n    j = n - 1\n    row = 0\n    while i < n and j >= 0:\n        if a[i][j] == 1:\n            row = i                # row i beats every earlier row\n            j -= 1\n        else:\n            i += 1\n    return row" }
            ],
            lc: "count-negative-numbers-in-a-sorted-matrix" }
        ]]
      ] },
      { h: "Sub-matrices and the 2-D contribution technique", blocks: [
        ["p", "A sub-matrix is a contiguous rectangle, fixed by its top-left (TL) and bottom-right (BR) corners. There are N(N+1)/2 · M(M+1)/2 of them, about N²M²/4."],
        ["probs", [
          { t: "Sum of all sub-matrix sums", d: "Hard",
            q: "Return the total of the sums of every sub-matrix.",
            ex: "[[4 9 6] [5 -1 2]] → 166 (18 sub-matrices)\n[[1 2] [3 4] [-1 5]] → 1·6 + 2·6 + 3·8 + 4·8 + (−1)·6 + 5·6 = 98",
            ap: [
              { n: "Brute force", cx: "O(N³·M³) time · O(1) space",
                idea: "Choose the top-left and bottom-right corners, then add the rectangle cell by cell.",
                code: "def total_submatrix_sums(a):\n    n = len(a)\n    m = len(a[0])\n    ans = 0\n    for r1 in range(n):\n        for c1 in range(m):\n            for r2 in range(r1, n):\n                for c2 in range(c1, m):\n                    for i in range(r1, r2 + 1):\n                        for j in range(c1, c2 + 1):\n                            ans += a[i][j]\n    return ans" },
              { n: "Optimal", cx: "O(N·M) time · O(1) space",
                idea: "Cell (i, j) is inside a sub-matrix iff TL is in rows 0..i and columns 0..j — <b>(i+1)(j+1)</b> choices — and BR is in rows i..N−1 and columns j..M−1 — <b>(N−i)(M−j)</b> choices. Add a[i][j]·(i+1)(j+1)(N−i)(M−j). Example: cell (2, 2) in a 5×4 grid is in 9 × 6 = 54 sub-matrices.",
                code: "def total_submatrix_sums(a):\n    n = len(a)\n    m = len(a[0])\n    ans = 0\n    for i in range(n):\n        for j in range(m):\n            ans += a[i][j] * (i + 1) * (j + 1) * (n - i) * (m - j)\n    return ans" }
            ],
            edge: "Use long for the answer." },
          { t: "Sub-matrix sum queries (2-D prefix sum)", d: "Medium",
            q: "Answer many queries “sum of the rectangle (r1, c1)–(r2, c2)”.",
            ex: "P[i][j] = sum of a[0..i][0..j]\nsum = P[r2][c2] − P[r1−1][c2] − P[r2][c1−1] + P[r1−1][c1−1]",
            ap: [
              { n: "Brute force", cx: "O(N·M) per query · O(1) space",
                idea: "Add every cell of the rectangle for each query.",
                code: "def rect_sum(a, r1, c1, r2, c2):\n    s = 0\n    for i in range(r1, r2 + 1):\n        for j in range(c1, c2 + 1):\n            s += a[i][j]\n    return s" },
              { n: "Optimal", cx: "O(N·M) build · O(1) per query",
                idea: "Build a <b>2-D prefix sum</b>: P[i][j] = a[i][j] + P[i−1][j] + P[i][j−1] − P[i−1][j−1]. Each query is then four lookups (inclusion–exclusion). An extra zero row and column removes the −1 index checks.",
                code: "def build(a):\n    n = len(a)\n    m = len(a[0])\n    # P[i+1][j+1] = sum of a[0..i][0..j]; row 0 and column 0 stay 0\n    P = [[0] * (m + 1) for _ in range(n + 1)]\n    for i in range(n):\n        for j in range(m):\n            P[i + 1][j + 1] = a[i][j] + P[i][j + 1] + P[i + 1][j] - P[i][j]\n    return P\n\ndef query(P, r1, c1, r2, c2):\n    return P[r2 + 1][c2 + 1] - P[r1][c2 + 1] - P[r2 + 1][c1] + P[r1][c1]" }
            ],
            lc: "range-sum-query-2d-immutable" }
        ]]
      ] },
      { h: "Interview cheatsheet", blocks: [
        ["table", ["Task", "Recipe", "Cost"], [
          ["Main / anti-diagonal", "(i, i) / (i, N−1−i)", "O(N)"],
          ["All right-to-left diagonals", "start on top row, then last column; i++, j−−", "O(N·M)"],
          ["Transpose in place", "swap upper triangle only (j &gt; i)", "O(N²)"],
          ["Rotate 90° clockwise", "transpose + reverse each row", "O(N²), O(1)"],
          ["Rotate 180°", "reverse each row + reverse each column", "O(N²), O(1)"],
          ["Spiral", "boundary of N−1 per side, then i++, j++, N −= 2", "O(N²)"],
          ["Search sorted matrix", "staircase from top-right", "O(N + M)"],
          ["Sum of all sub-matrices", "(i+1)(j+1)(N−i)(M−j)", "O(N·M)"]
        ]],
        ["warn", "Off-by-one traps: boundary loops of N instead of N − 1 double-print corners; transpose with j from 0 undoes itself; spiral on odd N forgets the centre; non-square matrices need M and N kept apart everywhere."]
      ] }
    ],
    lc: [
      ["Rotate Image", "rotate-image", "Medium"],
      ["Spiral Matrix", "spiral-matrix", "Medium"],
      ["Spiral Matrix II", "spiral-matrix-ii", "Medium"],
      ["Set Matrix Zeroes", "set-matrix-zeroes", "Medium"],
      ["Game of Life", "game-of-life", "Medium"],
      ["Valid Sudoku", "valid-sudoku", "Medium"],
      ["Search a 2D Matrix II", "search-a-2d-matrix-ii", "Medium"],
      ["Transpose Matrix", "transpose-matrix", "Easy"],
      ["Matrix Diagonal Sum", "matrix-diagonal-sum", "Easy"],
      ["Diagonal Traverse", "diagonal-traverse", "Medium"],
      ["Richest Customer Wealth", "richest-customer-wealth", "Easy"],
      ["Toeplitz Matrix", "toeplitz-matrix", "Easy"],
      ["Range Sum Query 2D - Immutable", "range-sum-query-2d-immutable", "Medium"],
      ["Count Negative Numbers in a Sorted Matrix", "count-negative-numbers-in-a-sorted-matrix", "Easy"],
      ["Flipping an Image", "flipping-an-image", "Easy"],
      ["Reshape the Matrix", "reshape-the-matrix", "Easy"],
      ["Lucky Numbers in a Matrix", "lucky-numbers-in-a-matrix", "Easy"]
    ],
    quiz: [
      { q: "Rotating an N×N matrix 90° clockwise in place is…", o: ["reverse each row, then transpose", "transpose, then reverse each row", "transpose twice", "reverse each column"], a: 1, why: "After transposing, row i holds old column i top-to-bottom; reversing it puts the bottom element first, which is the clockwise picture." },
      { q: "In-place transpose loops j from i + 1 because…", o: ["it is faster but optional", "starting at 0 swaps every pair twice and restores the original", "the diagonal must move", "j must be odd"], a: 1, why: "(i, j) and (j, i) would both trigger a swap, cancelling each other." },
      { q: "Staircase search starts at the top-right corner because…", o: ["it holds the maximum", "left is smaller and down is bigger, so one comparison discards a row or column", "it is the first cell in memory", "any corner works"], a: 1, why: "At top-left both directions increase; at top-right they disagree, which gives a decision every step. Bottom-left also works." },
      { q: "Staircase search on an N×M matrix costs…", o: ["O(N·M)", "O(N log M)", "O(N + M)", "O(log(N·M))"], a: 2, why: "Each step removes a row or a column, so at most N + M steps." },
      { q: "How many sub-matrices contain cell (i, j) of an N×M grid?", o: ["(i+1)(j+1)", "(N−i)(M−j)", "(i+1)(j+1)(N−i)(M−j)", "N·M"], a: 2, why: "Top-left choices (i+1)(j+1) times bottom-right choices (N−i)(M−j)." },
      { q: "Printing an N×N boundary with four loops of N − 1 steps each prints how many cells?", o: ["4N", "4N − 4", "4(N − 1) + 4", "N²"], a: 1, why: "Each loop stops before the next corner, so corners are printed once: 4(N − 1)." },
      { q: "In the zero-matrix trick, why mark cells as −1 first?", o: ["To save memory", "So newly created zeros are not mistaken for original zeros in the column pass", "Because 0 is not allowed", "To sort the matrix"], a: 1, why: "Values are ≥ 0, so −1 is a safe sentinel that the later pass does not treat as an original 0." }
    ]
  };
})();

/* Blueprint — DSA: sorting, binary search, math. Lessons plus LeetCode practice. */
(function () {
  const T = BP.DSA.topics;
  const A = BP.ALGOS;
  const { nums, clone, cap } = BP.AV;
  const F = (line, note, panels) => ({ line, note, panels: clone(panels) });
  const arr = (vals, o = {}) => ({ t: "array", vals, ...o });
  const vars = (v) => ({ t: "vars", vars: v });
  const chips = (label, items, vertical) => ({ t: "chips", label, items, vertical });
  const split2 = (s) => String(s).split("|").map((x) => x.trim());
  const range = (l, r, cls) => { const h = {}; for (let k = l; k <= r; k++) h[k] = cls; return h; };

  /* ═════════ NEW ANIMATIONS (prefix ss_) ═════════ */

  A.ss_countSort = { title: "Count sort (works with negatives)", inputLabel: "array (small range)", input: "3 -2 2 -4 6 5 1 -2 -1",
    presets: [["Digits → smallest number", "6 3 4 2 7 2 1"], ["With negatives", "3 -2 2 -4 6 5 1 -2 -1"], ["Huge range", "2 38 1000000000 4"]],
    about: "Counting sort without comparisons: the top row is the input, the grid below has one bucket per value from min to max. First every value is counted into its bucket, then the buckets are read left to right to write the sorted output.",
    code: ["mn = min(A)", "mx = max(A)", "freq = [0] * (mx - mn + 1)", "for x in A:", "    freq[x - mn] += 1          # bucket of value x", "k = 0", "for i in range(mx - mn + 1):", "    for _ in range(freq[i]):", "        A[k] = i + mn          # shift back by min", "        k += 1"],
    gen(s) {
      const a = cap(nums(s), 12, "values"), fr = [];
      if (!a.length) return [F(-1, "Enter some numbers.", [])];
      const mn = Math.min(...a), mx = Math.max(...a), R = mx - mn + 1;
      fr.push(F(1, `min = ${mn}, max = ${mx}, so the range R = max − min + 1 = ${R}. We need one bucket per value in that range.`, [arr(a), vars({ min: mn, max: mx, R })]));
      if (R > 20) {
        fr.push(F(2, `R = ${R.toLocaleString()} buckets would be needed for only ${a.length} values. Count sort is only worth it when the <b>range</b> is small (about 1e6 or less). Use merge sort / quick sort here.`, [arr(a, { hl: range(0, a.length - 1, "bad") }), vars({ R })]));
        return fr;
      }
      const freq = Array(R).fill(0), heads = Array.from({ length: R }, (_, k) => k + mn);
      const g = (hl = {}) => ({ t: "grid", label: "freq (column = value, cell index = value − min)", ch: heads, rows: [freq.slice()], hl });
      fr.push(F(2, `Create ${R} buckets, one per value from ${mn} to ${mx}. Value v is stored at index v − (${mn}), so even negatives get a valid index.`, [arr(a), g()]));
      a.forEach((x, i) => { freq[x - mn]++;
        fr.push(F(4, `Read ${x}: it belongs in bucket ${x} − (${mn}) = ${x - mn}. That bucket now counts ${freq[x - mn]}.`, [arr(a, { hl: { ...range(0, i - 1, "done"), [i]: "act" } }), g({ ["0," + (x - mn)]: "act" })])); });
      const out = Array(a.length).fill(null); let k = 0;
      fr.push(F(5, "All values are counted. Now walk the buckets from left (smallest value) to right and write each value out as many times as it was counted.", [arr(out, { label: "output" }), g()]));
      for (let i = 0; i < R; i++) {
        if (!freq[i]) continue;
        while (freq[i] > 0) { out[k] = i + mn; freq[i]--;
          fr.push(F(8, `Bucket ${i} holds value ${i} + (${mn}) = ${i + mn}: write it to output[${k}]. ${freq[i]} more copies left in this bucket.`, [arr(out, { label: "output", hl: { ...range(0, k - 1, "done"), [k]: "swap" }, ptr: { k } }), g({ ["0," + i]: "cmp" })])); k++; }
      }
      fr.push(F(-1, `Sorted in O(N + R) = O(${a.length} + ${R}) time, O(R) extra space. No comparisons at all.`, [arr(out, { label: "output", hl: range(0, out.length - 1, "done") })]));
      return fr;
    } };

  A.ss_mergeTwo = { title: "Merge two sorted arrays (3 pointers)", inputLabel: "sorted A | sorted B", input: "2 5 7 8 15 | 3 4 5 6",
    about: "Merging two sorted arrays A and B into C. Pointer i walks A, j walks B, k marks the next free slot of C; faded cells are already used and green cells of C are final.",
    code: ["i = j = k = 0", "while i < N and j < M:", "    if A[i] <= B[j]:", "        C[k] = A[i]", "        i += 1", "    else:", "        C[k] = B[j]", "        j += 1", "    k += 1", "C[k:] = A[i:] + B[j:]          # copy the leftovers"],
    gen(s) {
      const [s1, s2] = split2(s); const a = cap(nums(s1).sort((x, y) => x - y), 8), b = cap(nums(s2 || "").sort((x, y) => x - y), 8), fr = [];
      const c = Array(a.length + b.length).fill(null); let i = 0, j = 0, k = 0;
      const P = (hla = {}, hlb = {}, hlc = {}) => [arr(a, { label: "A", ptr: { i }, hl: { ...range(0, i - 1, "dim"), ...hla } }), arr(b, { label: "B", ptr: { j }, hl: { ...range(0, j - 1, "dim"), ...hlb } }), arr(c, { label: "C", ptr: { k }, hl: { ...range(0, k - 1, "done"), ...hlc } })];
      fr.push(F(0, "Both inputs are sorted, so the smallest value not yet used is always at the front: A[i] or B[j]. Start all three pointers at 0.", P()));
      while (i < a.length && j < b.length) {
        fr.push(F(2, `Compare the two fronts: A[${i}] = ${a[i]} and B[${j}] = ${b[j]}. The smaller one is the next value of C.`, P({ [i]: "cmp" }, { [j]: "cmp" })));
        if (a[i] <= b[j]) { c[k] = a[i]; fr.push(F(3, `${a[i]} ≤ ${b[j]}: write ${a[i]} into C[${k}] and move i forward${a[i] === b[j] ? " (on a tie A goes first, which keeps the merge <b>stable</b>)" : ""}.`, P({ [i]: "swap" }, {}, { [k]: "swap" }))); i++; }
        else { c[k] = b[j]; fr.push(F(6, `${b[j]} &lt; ${a[i]}: write ${b[j]} into C[${k}] and move j forward.`, P({}, { [j]: "swap" }, { [k]: "swap" }))); j++; }
        k++;
      }
      while (i < a.length) { c[k] = a[i]; fr.push(F(9, `B is used up, so the rest of A is already in order: copy ${a[i]} into C[${k}].`, P({ [i]: "swap" }, {}, { [k]: "swap" }))); i++; k++; }
      while (j < b.length) { c[k] = b[j]; fr.push(F(9, `A is used up, so the rest of B is already in order: copy ${b[j]} into C[${k}].`, P({}, { [j]: "swap" }, { [k]: "swap" }))); j++; k++; }
      fr.push(F(-1, `Merged in O(N + M) = ${c.length} steps. This merge is the heart of merge sort.`, P()));
      return fr;
    } };

  A.ss_inversionCount = { title: "Inversion count during merge sort", inputLabel: "array", input: "10 3 8 15 6",
    presets: [["Example: 10 3 8 15 6", "10 3 8 15 6"], ["5 3 1 4 2", "5 3 1 4 2"], ["Already sorted", "1 2 3 4 5"]],
    about: "Merge sort that also counts inversions. The box marks the range being merged (left half orange, right half blue); red cells are the left elements that form an inversion with the taken right element, all counted in one step.",
    code: ["def count(A, lo, hi):", "    if lo >= hi:", "        return 0", "    mid = (lo + hi) // 2", "    c = count(A, lo, mid) + count(A, mid + 1, hi)", "    i, j, temp = lo, mid + 1, []", "    while i <= mid and j <= hi:", "        if A[i] <= A[j]:", "            temp.append(A[i])      # no inversion", "            i += 1", "        else:", "            c += mid - i + 1       # all of A[i..mid] > A[j]", "            temp.append(A[j])", "            j += 1", "    A[lo:hi + 1] = temp + A[i:mid + 1] + A[j:hi + 1]", "    return c"],
    gen(s) {
      const a = cap(nums(s), 10), fr = []; let total = 0;
      const rec = (lo, hi) => {
        if (lo >= hi) return 0;
        const mid = (lo + hi) >> 1;
        fr.push(F(4, `Split ${lo}..${hi}: left ${lo}..${mid}, right ${mid + 1}..${hi}. Count inside each half first.`, [arr(a, { win: [lo, hi], hl: { ...range(lo, mid, "cmp"), ...range(mid + 1, hi, "act") } }), vars({ inversions: total })]));
        let c = rec(lo, mid) + rec(mid + 1, hi);
        let i = lo, j = mid + 1; const tmp = [];
        fr.push(F(5, `Both halves of ${lo}..${hi} are sorted now. Merge them with i at ${i} and j at ${j}, counting pairs that cross the middle.`, [arr(a, { win: [lo, hi], ptr: { i, j } }), chips("temp", []), vars({ inversions: total })]));
        while (i <= mid && j <= hi) {
          if (a[i] <= a[j]) { tmp.push(a[i]); fr.push(F(8, `${a[i]} ≤ ${a[j]}: the left value is not bigger, so no inversion. Take ${a[i]} into temp.`, [arr(a, { win: [lo, hi], ptr: { i, j }, hl: { [i]: "swap", [j]: "cmp" } }), chips("temp", tmp), vars({ inversions: total })])); i++; }
          else { const add = mid - i + 1; total += add; c += add;
            fr.push(F(11, `${a[i]} &gt; ${a[j]}. Left half is sorted, so <b>every</b> left element from index ${i} to ${mid} is &gt; ${a[j]}: +${add}.`, [arr(a, { win: [lo, hi], ptr: { i, j }, hl: { ...range(i, mid, "bad"), [j]: "swap" } }), chips("temp", tmp.concat([a[j]])), vars({ inversions: total, added: "+" + add })]));
            tmp.push(a[j]); j++; }
        }
        while (i <= mid) tmp.push(a[i++]);
        while (j <= hi) tmp.push(a[j++]);
        for (let k = 0; k < tmp.length; k++) a[lo + k] = tmp[k];
        fr.push(F(14, `Copy temp back: ${lo}..${hi} is sorted. Inversions so far: ${total}.`, [arr(a, { win: [lo, hi], hl: range(lo, hi, "done") }), vars({ inversions: total })]));
        return c;
      };
      fr.push(F(0, "An inversion is a pair i &lt; j with A[i] &gt; A[j]. Checking all pairs is O(N²); counting while merge sort merges is O(N log N).", [arr(a), vars({ inversions: 0 })]));
      rec(0, a.length - 1);
      fr.push(F(-1, `Total inversions = <b>${total}</b>, found in O(N log N).`, [arr(a, { hl: range(0, a.length - 1, "done") }), vars({ inversions: total })]));
      return fr;
    } };

  A.ss_partition = { title: "Partition around the first element", inputLabel: "array (pivot = first)", input: "54 26 93 17 77 31 44 55 20",
    about: "In-place partition with the first element as pivot (blue). i scans from the left, j from the right; green cells are known ≤ pivot, faded cells known &gt; pivot. At the end the pivot is swapped into its final sorted index.",
    code: ["pivot = A[lo]", "i = lo + 1", "j = hi", "while i <= j:", "    if A[i] <= pivot:", "        i += 1                 # already on the left side", "    else:", "        A[i], A[j] = A[j], A[i]", "        j -= 1                 # A[j] is now known > pivot", "A[lo], A[j] = A[j], A[lo]      # pivot to its final index", "return j"],
    gen(s) {
      const a = cap(nums(s), 12), fr = [], n = a.length;
      if (n < 2) return [F(-1, "Need at least 2 values.", [arr(a)])];
      const p = a[0]; let i = 1, j = n - 1;
      const P = (extra = {}) => [arr(a, { ptr: { i, j }, hl: { [0]: "act", ...range(1, i - 1, "done"), ...range(j + 1, n - 1, "dim"), ...extra } }), vars({ pivot: p })];
      fr.push(F(2, `Pivot = A[0] = ${p}. i starts at 1, j at ${n - 1}. Green = known ≤ pivot, faded = known &gt; pivot.`, P()));
      while (i <= j) {
        if (a[i] <= p) { fr.push(F(5, `${a[i]} ≤ ${p}: already on the correct (left) side, so i moves right.`, P({ [i]: "cmp" }))); i++; }
        else { const x = a[i], y = a[j]; [a[i], a[j]] = [a[j], a[i]];
          fr.push(F(7, `${x} &gt; ${p}: swap it with A[j] = ${y} and shrink j. Do not move i: the new A[i] is unchecked.`, P({ [i]: "swap", [j]: "swap" }))); j--; }
      }
      [a[0], a[j]] = [a[j], a[0]];
      fr.push(F(9, `i &gt; j, so every cell is classified. j = ${j} is the last "≤ pivot" slot: swap the pivot into it.`, [arr(a, { ptr: { j }, hl: { ...range(0, j - 1, "done"), [j]: "found", ...range(j + 1, n - 1, "dim") } }), vars({ pivot: p })]));
      fr.push(F(10, `Pivot ${p} is at its final sorted index ${j}. O(N) time, O(1) space. Quick sort now recurses on both sides.`, [arr(a, { hl: { [j]: "found" } }), vars({ return: j })]));
      return fr;
    } };

  A.ss_rotatedSearch = { title: "Search in a rotated sorted array (one binary search)", inputLabel: "rotated array | K", input: "30 40 50 60 70 80 10 20 25 | 40",
    presets: [["K in upper part", "30 40 50 60 70 80 10 20 25 | 40"], ["K in lower part", "30 40 50 60 70 80 10 20 25 | 20"], ["K absent", "30 40 50 60 70 80 10 20 25 | 35"]],
    about: "One binary search on a rotated array. Orange cells are the upper sorted run (values ≥ A[0]), blue the lower run. Compare which run K and mid are in: if they differ the direction is forced, otherwise it is a normal binary search step.",
    code: ["while l <= r:", "    mid = l + (r - l) // 2", "    if A[mid] == K:", "        return mid", "    if K < A[0]:                   # K lives in the lower part", "        if A[mid] >= A[0] or A[mid] < K:", "            l = mid + 1", "        else:", "            r = mid - 1", "    else:                          # K lives in the upper part", "        if A[mid] < A[0] or A[mid] > K:", "            r = mid - 1", "        else:", "            l = mid + 1", "return -1"],
    gen(s) {
      const [s1, s2] = split2(s); const a = cap(nums(s1), 16), K = nums(s2 || "")[0] ?? a[0], fr = []; let l = 0, r = a.length - 1;
      const part = (v) => (v >= a[0] ? "upper" : "lower");
      const dim = () => Object.fromEntries(a.map((_, k) => [k, k < l || k > r ? "dim" : ""]));
      fr.push(F(-1, `A[0] = ${a[0]} splits the array: values ≥ ${a[0]} are the upper part, values &lt; ${a[0]} the lower part. K = ${K} is in the <b>${part(K)}</b> part.`, [arr(a, { hl: Object.fromEntries(a.map((v, k) => [k, v >= a[0] ? "cmp" : "act"])) }), vars({ K, "A[0]": a[0] })]));
      while (l <= r) {
        const mid = l + ((r - l) >> 1);
        fr.push(F(1, `l = ${l}, r = ${r}, mid = ${mid}, A[mid] = ${a[mid]} (${part(a[mid])} part).`, [arr(a, { ptr: { l, mid, r }, hl: { ...dim(), [mid]: "act" } }), vars({ K, "mid part": part(a[mid]), "K part": part(K) })]));
        if (a[mid] === K) { fr.push(F(3, `A[${mid}] = ${K}: found K at index ${mid}. O(log N).`, [arr(a, { ptr: { mid }, hl: { [mid]: "found" } })])); return fr; }
        if (K < a[0]) {
          if (a[mid] >= a[0] || a[mid] < K) { const why = a[mid] >= a[0] ? "mid is in the upper part but K is in the lower part" : `${a[mid]} &lt; ${K}`; l = mid + 1; fr.push(F(6, `${why}: the answer must be to the right, so l = ${l}.`, [arr(a, { ptr: { l, r }, hl: dim() })])); }
          else { r = mid - 1; fr.push(F(8, `${a[mid]} &gt; ${K} and both are in the lower part: go left, r = ${r}.`, [arr(a, { ptr: { l, r }, hl: dim() })])); }
        } else {
          if (a[mid] < a[0] || a[mid] > K) { const why = a[mid] < a[0] ? "mid is in the lower part but K is in the upper part" : `${a[mid]} &gt; ${K}`; r = mid - 1; fr.push(F(11, `${why}: the answer must be to the left, so r = ${r}.`, [arr(a, { ptr: { l, r }, hl: dim() })])); }
          else { l = mid + 1; fr.push(F(13, `${a[mid]} &lt; ${K} and both are in the upper part: go right, l = ${l}.`, [arr(a, { ptr: { l, r }, hl: dim() })])); }
        }
      }
      fr.push(F(14, `l &gt; r: the range is empty, so ${K} is not in the array. Return −1.`, [arr(a, { hl: dim() })]));
      return fr;
    } };

  A.ss_aggressiveCows = { title: "Binary search on the answer: aggressive cows", inputLabel: "sorted stalls | cows M", input: "1 2 4 8 9 | 3",
    presets: [["Example: 1 2 4 8 9, M=3", "1 2 4 8 9 | 3"], ["9 stalls, M=4", "2 6 11 14 19 25 30 39 43 | 4"]],
    about: "Binary search on the answer. The top row lists every candidate gap D (green = feasible, red = not); the stalls row shows the greedy check for the current D, with chosen stalls in green.",
    code: ["l = 1", "r = A[-1] - A[0]", "ans = 0", "while l <= r:", "    mid = (l + r) // 2", "    # canPlace: cow at A[0], then each next stall with gap >= mid", "    if canPlace(A, M, mid):", "        ans = mid              # feasible: try a bigger gap", "        l = mid + 1", "    else:", "        r = mid - 1            # too greedy: try a smaller gap", "return ans"],
    gen(s) {
      const [s1, s2] = split2(s); const a = cap(nums(s1).sort((x, y) => x - y), 12), M = Math.max(2, Math.min(a.length, nums(s2 || "")[0] || 2)), fr = [];
      if (a.length < 2) return [F(-1, "Need at least 2 stalls.", [arr(a)])];
      let l = 1, r = a[a.length - 1] - a[0], ans = 0; const space = r <= 24; const verdict = {};
      const ansRow = (mid) => space ? [arr(Array.from({ length: a[a.length - 1] - a[0] }, (_, k) => k + 1), { label: "answer D", idx: false, ptr: mid ? { mid: mid - 1 } : {}, hl: Object.fromEntries(Array.from({ length: a[a.length - 1] - a[0] }, (_, k) => [k, verdict[k + 1] || (k + 1 < l || k + 1 > r ? "dim" : "")])) })] : [];
      fr.push(F(2, `Answer D (the minimum gap) lies in 1..${r}. "Can we place ${M} cows with every gap ≥ D?" is yes for small D and no beyond some point, so binary search D.`, [...ansRow(), arr(a, { label: "stalls" }), vars({ l, r, M })]));
      while (l <= r) {
        const mid = (l + r) >> 1; let cows = 1, last = a[0]; const placed = { 0: "found" };
        fr.push(F(4, `l = ${l}, r = ${r}, so try D = ${mid}. The greedy check always puts cow 1 at the first stall, ${a[0]}.`, [...ansRow(mid), arr(a, { label: "stalls", hl: { ...placed } }), vars({ l, mid, r, cows })]));
        for (let i = 1; i < a.length && cows < M; i++) {
          if (a[i] - last >= mid) { cows++; placed[i] = "found"; fr.push(F(6, `${a[i]} − ${last} = ${a[i] - last} ≥ ${mid}: far enough from the last cow, so cow ${cows} goes at ${a[i]}.`, [...ansRow(mid), arr(a, { label: "stalls", hl: { ...placed } }), vars({ l, mid, r, cows })])); last = a[i]; }
        }
        if (cows >= M) { verdict[mid] = "done"; ans = mid; l = mid + 1; fr.push(F(7, `All ${M} cows fit with gap ≥ ${mid}. ans = ${mid}; try a bigger gap.`, [...ansRow(), arr(a, { label: "stalls", hl: placed }), vars({ l, r, ans })])); }
        else { verdict[mid] = "bad"; r = mid - 1; fr.push(F(10, `Only ${cows} cows fit with gap ≥ ${mid}. Too big: go smaller.`, [...ansRow(), arr(a, { label: "stalls", hl: placed }), vars({ l, r, ans })])); }
      }
      fr.push(F(11, `l &gt; r. Largest feasible minimum gap = <b>${ans}</b>. O(N log(range)).`, [...ansRow(), arr(a, { label: "stalls" }), vars({ ans })]));
      return fr;
    } };

  A.ss_fastPow = { title: "Fast power by squaring: a^n mod m", inputLabel: "a n | m", input: "3 13 | 1000000007",
    presets: [["3^13", "3 13 | 1000000007"], ["2^120 mod 17", "2 120 | 17"], ["37^103 mod 12", "37 103 | 12"]],
    about: "Recursive fast power. Each node is one call power(a, n): going down, the exponent halves until 0; coming back up, each node squares the result and multiplies by a once more when its n is odd. The tag shows p returned by that call.",
    code: ["def power(a, n, m):", "    if n == 0:", "        return 1 % m", "    p = power(a, n // 2, m)", "    p = (p * p) % m", "    if n % 2 == 1:", "        p = (p * a) % m        # odd n: one extra a", "    return p"],
    gen(s) {
      const [s1, s2] = split2(s); const [a0, n0] = nums(s1); const a = BigInt(Math.abs(Math.trunc(a0 ?? 3))), n = Math.max(0, Math.min(1e9, Math.trunc(n0 ?? 13))), m = BigInt(Math.max(1, Math.trunc(nums(s2 || "")[0] || 1000000007)));
      const chain = []; for (let x = n; ; x = Math.floor(x / 2)) { chain.push(x); if (x === 0) break; }
      const nodes = chain.map((x, k) => ({ id: k, label: String(x), parent: k ? k - 1 : null, cls: "", tag: x === 0 ? "base" : x % 2 ? "odd" : "even" }));
      const fr = []; let mults = 0;
      chain.forEach((x, k) => { nodes[k].cls = "act"; fr.push(F(x === 0 ? 2 : 3, x === 0 ? "n = 0 is the base case: a⁰ = 1, so return 1 and start coming back up." : `power(a, ${x}) first needs power(a, ${x} // 2 = ${Math.floor(x / 2)}): call it.`, [{ t: "tree", nodes, binary: false }, vars({ a: String(a), m: String(m), depth: k + 1 })])); nodes[k].cls = "cmp"; });
      let p = 1n % m; nodes[chain.length - 1].cls = "done"; nodes[chain.length - 1].tag = "p=" + p;
      for (let k = chain.length - 2; k >= 0; k--) {
        const x = chain[k];
        p = (p * p) % m; mults++;
        let note = `n = ${x}: p = p·p % m = ${p}`;
        if (x % 2) { p = (p * (a % m)) % m; mults++; note += `, odd so multiply by a once more: ${p}`; }
        nodes[k].cls = "done"; nodes[k].tag = "p=" + p;
        fr.push(F(x % 2 ? 6 : 4, note + ".", [{ t: "tree", nodes, binary: false }, vars({ multiplications: mults, "naive would need": Math.max(0, n - 1) })]));
      }
      fr.push(F(7, `${a}^${n} mod ${m} = <b>${p}</b> using ${mults} multiplications instead of ${Math.max(0, n - 1)}. O(log n).`, [{ t: "tree", nodes, binary: false }, vars({ result: String(p) })]));
      return fr;
    } };

  A.ss_spfSieve = { title: "Smallest-prime-factor sieve, then factorise x", inputLabel: "N (≤ 100) | x", input: "50 | 48",
    presets: [["N=50, x=48", "50 | 48"], ["N=30, x=30", "30 | 30"], ["N=100, x=90", "100 | 90"]],
    about: "Smallest-prime-factor sieve on a 10-column grid (row + column = the number; the cell shows its current spf). Blue cells get labelled by the current prime, orange cells already had a smaller prime. Then x is factorised by repeatedly dividing by spf[x].",
    code: ["spf = list(range(N + 1))       # spf[i] = i at first", "i = 2", "while i * i <= N:", "    if spf[i] == i:            # i is prime", "        for j in range(i * i, N + 1, i):", "            if spf[j] == j:", "                spf[j] = i     # first prime to reach j", "    i += 1", "while x > 1:                   # factorise x", "    print(spf[x])", "    x //= spf[x]"],
    gen(s) {
      const [s1, s2] = split2(s); const N = Math.max(10, Math.min(100, nums(s1)[0] || 50)); let x = Math.max(2, Math.min(N, nums(s2 || "")[0] || N));
      const spf = Array.from({ length: N + 1 }, (_, k) => k), fr = [];
      const rows = () => { const out = []; for (let r = 0; r * 10 <= N; r++) out.push(Array.from({ length: 10 }, (_, c) => (r * 10 + c <= N ? (r * 10 + c < 2 ? "·" : spf[r * 10 + c]) : null))); return out; };
      const key = (v) => Math.floor(v / 10) + "," + (v % 10);
      const rh = Array.from({ length: Math.floor(N / 10) + 1 }, (_, r) => r * 10 + "+");
      const G = (hl) => ({ t: "grid", label: "cell (row + column) shows spf of that number", rows: rows(), rh, ch: Array.from({ length: 10 }, (_, c) => c), hl });
      fr.push(F(0, "Start with spf[i] = i (every number is its own smallest factor until proven otherwise).", [G({})]));
      for (let i = 2; i * i <= N; i++) {
        if (spf[i] !== i) continue;
        const hl = { [key(i)]: "found" }, setNow = [], kept = [];
        for (let j = i * i; j <= N; j += i) { if (spf[j] === j) { spf[j] = i; hl[key(j)] = "act"; setNow.push(j); } else { hl[key(j)] = "cmp"; kept.push(j); } }
        fr.push(F(6, `spf[${i}] is still ${i}, so ${i} is prime. From ${i}×${i} = ${i * i}, mark multiples with ${i}: set ${setNow.length}${kept.length ? `; ${kept.length} already had a smaller prime (${kept.slice(0, 4).join(", ")}${kept.length > 4 ? "…" : ""}) and keep it` : ""}.`, [G(hl)]));
      }
      const pr = {}; for (let v = 2; v <= N; v++) if (spf[v] === v) pr[key(v)] = "done";
      fr.push(F(2, "Stop once i*i &gt; N: every composite ≤ N has a prime factor ≤ √N, so all labels are final. Cells still showing their own number are primes.", [G(pr)]));
      const x0 = x, fac = [];
      while (x > 1) { const p = spf[x]; fac.push(p); fr.push(F(9, `spf[${x}] = ${p}: output ${p}, then x becomes ${x} / ${p} = ${x / p}.`, [G({ [key(x)]: "act" }), chips("factors of " + x0, fac.map((v) => ({ v, cls: "hit" })))])); x = x / p; }
      const cnt = {}; fac.forEach((p) => (cnt[p] = (cnt[p] || 0) + 1));
      const div = Object.values(cnt).reduce((t, e) => t * (e + 1), 1);
      fr.push(F(-1, `${x0} = ${Object.entries(cnt).map(([p, e]) => (e > 1 ? `${p}^${e}` : p)).join(" × ")}. Number of divisors = ${Object.values(cnt).map((e) => `(${e}+1)`).join("·")} = <b>${div}</b>. Each query is O(log x).`, [G(pr), chips("factors of " + x0, fac)]));
      return fr;
    } };

  /* ═════════ SORTING ═════════ */
  T["sorting"] = {
    name: "Sorting", icon: "🔢", color: "#7c3aed", minutes: 60,
    summary: "Put items in order by any rule you choose, and use the ordering (or the merge and partition steps themselves) to solve harder problems.",
    sections: [
      { h: "What sorting really is", blocks: [
        ["p", "Sorting arranges elements in increasing or decreasing order of some <b>parameter</b>. The parameter does not have to be the value. You can sort numbers by how many factors they have, points by distance, or strings by how they concatenate."],
        ["analogy", "A teacher sorting exam papers by marks. Many papers can have the same mark. If she keeps papers with equal marks in the order they were handed in, her sort is <b>stable</b>. If she sorts the pile on the desk without a second desk, it is <b>in-place</b>."],
        ["p", "Example: sort <code>[7, 2, 9, 15, 32]</code> by number of factors. Counts are 7→2, 2→2, 9→3, 15→4, 32→6, so the order is 7, 2, 9, 15, 32."],
        ["p", "<b>The three O(N²) sorts</b> are worth knowing for interviews even though you rarely use them:"],
        ["table", ["Sort", "Idea", "Best / worst", "Stable?", "In-place?"], [
          ["Selection", "Find the minimum of the unsorted part, swap it to the front.", "O(N²) / O(N²)", "No", "Yes"],
          ["Bubble", "Swap adjacent pairs that are out of order; the largest bubbles to the end each pass.", "O(N) with early exit / O(N²)", "Yes", "Yes"],
          ["Insertion", "Take the next item and slide it left into the sorted prefix.", "O(N) on nearly sorted / O(N²)", "Yes", "Yes"]]],
        ["viz", "bubbleSort", "Bubble sort: after pass i, the i-th largest value is fixed at the end."],
        ["viz", "insertionSort", "Insertion sort: very fast when the input is almost sorted, which is why real libraries use it for small chunks."]
      ] },
      { h: "Count sort: when the values are small", blocks: [
        ["p", "If the values live in a tiny range, you do not need comparisons at all. Count how many times each value appears, then write them out in order. Time is O(N + R) where R = max − min + 1."],
        ["viz", "ss_countSort", "Try the presets: digits, negatives (shift by min), and a huge range where count sort stops making sense."],
        ["warn", "Count sort only works when the <b>range</b> is small (about 1e6). For <code>[2, 38, 1e9, 4]</code> you would need a billion buckets for four numbers."],
        ["probs", [
          { t: "Smallest number from given digits", d: "Easy",
            q: "Given an array of digits 0..9, arrange them to form the smallest number.",
            ex: "A = [6,3,4,2,7,2,1]\nAnswer: 1223467\nA = [4,2,7,3,9,0] -> [0,2,3,4,7,9]",
            ap: [
              { n: "Brute force", cx: "O(N log N) time · O(1) space",
                idea: "Sort the digits with any comparison sort and join them. Correct, but it ignores that there are only 10 possible values, so it pays the <b>log N</b> factor for nothing.",
                code: "def smallest_number(A):\n    A.sort()\n    return \"\".join(map(str, A))" },
              { n: "Optimal", cx: "O(N + 10) = O(N) time · O(1) space",
                idea: "There are only 10 possible values. Build <b>freq[10]</b>, then emit digit d freq[d] times for d = 0..9. That is count sort with a range of 10.",
                code: "def smallest_number(A):\n    freq = [0] * 10\n    for x in A:\n        freq[x] += 1\n    k = 0\n    for d in range(10):\n        for _ in range(freq[d]):\n            A[k] = d               # write digit d, freq[d] times\n            k += 1\n    return \"\".join(map(str, A))" }
            ],
            edge: "Leading zero: if a valid number is required, swap the first non-zero digit to the front. All zeros.",
            viz: "ss_countSort" },
          { t: "Count sort with negative numbers", d: "Easy",
            q: "Sort an array that may contain negatives, when max − min is small.",
            ex: "A = [3,-2,2,-4,6,5,1,-2,-1]\nmin = -4, max = 6, R = 11\nAnswer: [-4,-2,-2,-1,1,2,3,5,6]",
            ap: [
              { n: "Brute force", cx: "O(N log N) time · O(1) space",
                idea: "Use a comparison sort. Fine in general, but when max − min is small you can <b>avoid comparisons entirely</b>.",
                code: "def count_sort(A):\n    A.sort()\n    return A" },
              { n: "Optimal", cx: "O(N + R) time · O(R) space, R = max − min + 1",
                idea: "Shift every value by the minimum: value v goes into bucket <b>v − min</b>, so negatives get a valid index. When writing back, add min again.",
                code: "def count_sort(A):\n    mn = min(A)\n    mx = max(A)\n    freq = [0] * (mx - mn + 1)\n    for x in A:\n        freq[x - mn] += 1          # value x lives in bucket x - mn\n    k = 0\n    for i in range(mx - mn + 1):\n        for _ in range(freq[i]):\n            A[k] = i + mn          # shift back when writing out\n            k += 1\n    return A" }
            ],
            lc: "sort-colors" }
        ]]
      ] },
      { h: "Merging and merge sort", blocks: [
        ["p", "Merging two sorted lists is easy: the smallest remaining item is always at the front of one of them. Merge sort turns this into a full sort: split in half, sort each half recursively, merge."],
        ["viz", "ss_mergeTwo", "Three pointers: i on A, j on B, k on the output. Ties take from A, which makes the merge stable."],
        ["probs", [
          { t: "Merge two sorted arrays", d: "Easy",
            q: "Given sorted A (size N) and B (size M), return one sorted array with all elements.",
            ex: "A = [2,5,7,8,15], B = [3,4,5,6]\nAnswer: [2,3,4,5,5,6,7,8,15]",
            ap: [
              { n: "Brute force", cx: "O((N+M) log(N+M)) time · O(N+M) space",
                idea: "Concatenate and sort. It throws away the fact that both inputs are <b>already sorted</b>.",
                code: "def merge(A, B):\n    return sorted(A + B)" },
              { n: "Optimal", cx: "O(N + M) time · O(1) extra beyond the output",
                idea: "<b>Three pointers.</b> The smallest remaining value is always A[i] or B[j]: copy the smaller one (use ≤ so ties take from A, which keeps it stable). When one runs out, copy the rest of the other.",
                code: "def merge(A, B):\n    i = 0\n    j = 0\n    C = []\n    while i < len(A) and j < len(B):\n        if A[i] <= B[j]:           # <= keeps equal items in order (stable)\n            C.append(A[i])\n            i += 1\n        else:\n            C.append(B[j])\n            j += 1\n    C.extend(A[i:])                # at most one of these is non-empty\n    C.extend(B[j:])\n    return C" }
            ],
            edge: "One array empty; all of A smaller than B; duplicates across arrays.",
            viz: "ss_mergeTwo", lc: "merge-sorted-array" },
          { t: "Merge two sorted subarrays inside one array", d: "Easy",
            q: "A[lo..mid] and A[mid+1..hi] are each sorted. Make A[lo..hi] sorted.",
            ex: "A = [11,6,9,2,6,7,11,3,18,19,12,4], lo=3, mid=6, hi=9\nleft [2,6,7,11], right [3,18,19]\ntemp = [2,3,6,7,11,18,19] copied back to 3..9",
            ap: [
              { n: "Brute force", cx: "O(L log L) time · O(L) space, L = hi − lo + 1",
                idea: "Copy the range out, sort it, copy it back. Works, but ignores that both halves are <b>already sorted</b>.",
                code: "def merge_range(A, lo, mid, hi):\n    A[lo:hi + 1] = sorted(A[lo:hi + 1])" },
              { n: "Optimal", cx: "O(L) time · O(L) space",
                idea: "Same three-pointer merge into a <b>temp</b> array, then copy back with <code>A[lo + k] = temp[k]</code>. The simple version cannot be done in O(1) extra space.",
                code: "def merge_range(A, lo, mid, hi):\n    i = lo\n    j = mid + 1\n    temp = []\n    while i <= mid and j <= hi:\n        if A[i] <= A[j]:\n            temp.append(A[i])\n            i += 1\n        else:\n            temp.append(A[j])\n            j += 1\n    temp.extend(A[i:mid + 1])      # leftovers of the left half\n    temp.extend(A[j:hi + 1])       # leftovers of the right half\n    for k in range(len(temp)):\n        A[lo + k] = temp[k]" }
            ] }
        ]],
        ["viz", "mergeSort", "Merge sort: split down to single elements, then merge back up."],
        ["math", [["T(N)", "2·T(N/2) + N", "two halves + one merge"], ["after k levels", "2^k·T(N/2^k) + k·N", "unroll"], ["k = log N", "N·T(1) + N·log N", "O(N log N)"]], "Every level of the recursion tree does N work in total, and there are log N levels. That is true for every input, so merge sort is O(N log N) in the best, average and worst case. Extra space is O(N) for the temp array plus O(log N) stack."],
        ["code", "def merge_sort(A, lo, hi):\n    if lo >= hi:\n        return                     # 0 or 1 element: already sorted\n    mid = lo + (hi - lo) // 2\n    merge_sort(A, lo, mid)\n    merge_sort(A, mid + 1, hi)\n    merge_range(A, lo, mid, hi)    # the merge from the problem above"],
        ["tip", "Merge sort is stable (with ≤ in the merge) and predictable. It is the go-to choice for linked lists and for external sorting of data that does not fit in memory."]
      ] },
      { h: "Inversion count: merge sort as a tool", blocks: [
        ["p", "An <b>inversion</b> is a pair i &lt; j with A[i] &gt; A[j]. It measures how far an array is from sorted. A sorted array has 0; a reversed one has N(N−1)/2."],
        ["viz", "ss_inversionCount", "When a right-half element is taken before A[i], every remaining left element is bigger than it. Count them all in one step."],
        ["probs", [
          { t: "Inversion count", d: "Hard",
            q: "Count pairs (i, j) with i &lt; j and A[i] &gt; A[j].",
            ex: "[10,3,8,15,6] -> 5: (10,3) (10,8) (10,6) (8,6) (15,6)\n[5,2,6,1] -> 4\n[5,3,1,4,2] -> 7",
            ap: [
              { n: "Brute force", cx: "O(N²) time · O(1) space",
                idea: "Check every pair i &lt; j. With N = 1e5 that is 5·10⁹ comparisons: <b>TLE</b>.",
                code: "def inversions(A):\n    n = len(A)\n    c = 0\n    for i in range(n):\n        for j in range(i + 1, n):\n            if A[i] > A[j]:\n                c += 1\n    return c" },
              { n: "Optimal", cx: "O(N log N) time · O(N) space",
                idea: "Total = inversions inside the left half + inside the right half + <b>across</b> the middle. For [10,3,8,15,6]: left [10,3,8] has 2, right [15,6] has 1, across has 2 (10,6 and 8,6) = 5. Sorting each half does not change the across count, because it only depends on which half each element is in. During the merge, if A[i] &gt; A[j] then all of A[i..mid] are &gt; A[j], so add <b>mid − i + 1</b> in one step.",
                code: "def count(A, lo, hi):\n    if lo >= hi:\n        return 0\n    mid = (lo + hi) // 2\n    c = count(A, lo, mid) + count(A, mid + 1, hi)\n    i = lo\n    j = mid + 1\n    temp = []\n    while i <= mid and j <= hi:\n        if A[i] <= A[j]:\n            temp.append(A[i])\n            i += 1\n        else:\n            c += mid - i + 1       # A[i..mid] are all bigger than A[j]\n            temp.append(A[j])\n            j += 1\n    temp.extend(A[i:mid + 1])\n    temp.extend(A[j:hi + 1])\n    A[lo:hi + 1] = temp\n    return c" }
            ],
            edge: "Equal elements are not inversions (take the left one first with ≤). The count can reach N(N−1)/2, so use 64-bit or the requested modulo.",
            viz: "ss_inversionCount", lc: "reverse-pairs" }
        ]],
        ["extra", "The same \"count while merging\" trick solves Count of Smaller Numbers After Self and Reverse Pairs (count i &lt; j with A[i] &gt; 2·A[j]: count with a separate pointer pass before merging)."]
      ] },
      { h: "Partition and quick sort", blocks: [
        ["p", "Pick a <b>pivot</b>. Move everything ≤ pivot to its left and everything &gt; pivot to its right. The pivot is now exactly where it will be in the sorted array. Recurse on the two sides. That is quick sort."],
        ["viz", "ss_partition", "This partition: pivot = first element, i scans from the left, j from the right. Trace on the example array ends with 54 at index 5."],
        ["probs", [
          { t: "Partition the array around a pivot", d: "Medium",
            q: "Take A[lo] as pivot. Rearrange so elements ≤ pivot are on its left and &gt; pivot on its right. Return the pivot's final index.",
            ex: "A = [54,26,93,17,77,31,44,55,20]\nAfter: [31,26,20,17,44,54,55,77,93]\nreturn 5",
            ap: [
              { n: "Brute force", cx: "O(N) time · O(N) space",
                idea: "Build two lists (≤ pivot and &gt; pivot) and write them back around the pivot. Linear time, but it needs <b>O(N) extra memory</b>.",
                code: "def partition(A, lo, hi):\n    pivot = A[lo]\n    rest = A[lo + 1:hi + 1]\n    small = [x for x in rest if x <= pivot]\n    big = [x for x in rest if x > pivot]\n    A[lo:hi + 1] = small + [pivot] + big\n    return lo + len(small)" },
              { n: "Optimal", cx: "O(N) time · O(1) space",
                idea: "<b>Two pointers in place.</b> i = lo+1, j = hi. If A[i] ≤ pivot, i++. Otherwise swap A[i] with A[j] and j-- (do not move i, the swapped-in value is still unchecked). When i &gt; j, j is the last \"≤ pivot\" slot: swap A[lo] with A[j].",
                code: "def partition(A, lo, hi):\n    pivot = A[lo]\n    i = lo + 1\n    j = hi\n    while i <= j:\n        if A[i] <= pivot:\n            i += 1                 # already on the correct side\n        else:\n            A[i], A[j] = A[j], A[i]\n            j -= 1                 # do not move i: new A[i] is unchecked\n    A[lo], A[j] = A[j], A[lo]      # pivot goes to its final index\n    return j" }
            ],
            edge: "All ≤ pivot (pivot goes to the end); all &gt; pivot (pivot stays at lo); duplicates of the pivot go left.",
            viz: "ss_partition", lc: "sort-colors" },
          { t: "Quick sort (randomized)", d: "Medium",
            q: "Sort the array in place using partition.",
            ex: "[16,25,2,5,35,100,40,90]\npivot 16 lands at index 2 -> recurse on [2,5] and [25,35,100,40,90]",
            ap: [
              { n: "Brute force", cx: "Average O(N log N) · worst O(N²) time · O(N) stack worst",
                idea: "Always use the first element as pivot. On sorted or reverse-sorted input like [10,9,...,1], each partition peels off one element: T(N) = N + T(N−1) = <b>O(N²)</b> with recursion depth N.",
                code: "def quick_sort(A, lo, hi):\n    if lo >= hi:\n        return\n    p = partition(A, lo, hi)       # partition() from the previous problem\n    quick_sort(A, lo, p - 1)\n    quick_sort(A, p + 1, hi)" },
              { n: "Optimal", cx: "Expected O(N log N) time · O(log N) expected stack",
                idea: "<b>Pick a random index as pivot</b> and swap it to lo first. The chance of picking the worst pivot every time is 1/N · 1/(N−1) · … = 1/N!, so the expected time is O(N log N) whatever the input order.",
                code: "import random\n\ndef quick_sort(A, lo, hi):\n    if lo >= hi:\n        return\n    r = random.randint(lo, hi)\n    A[lo], A[r] = A[r], A[lo]      # random pivot moved to the front\n    p = partition(A, lo, hi)\n    quick_sort(A, lo, p - 1)\n    quick_sort(A, p + 1, hi)" }
            ],
            lc: "sort-an-array" }
        ]],
        ["viz", "quickSort", "Quick sort with the Lomuto partition (pivot = last element). Different partition, same idea: the pivot lands in its final place."],
        ["table", ["Case", "Recurrence", "Time", "Stack"], [
          ["Balanced pivots (average)", "T(N) = N + 2T(N/2)", "O(N log N)", "O(log N)"],
          ["Always min/max pivot (sorted input, first-element pivot)", "T(N) = N + T(N−1)", "O(N²)", "O(N)"],
          ["Random pivot", "expected balanced", "O(N log N) expected", "O(log N) expected"]]],
        ["extra", "Quickselect uses one partition and recurses into only one side to find the k-th smallest in expected O(N). That is the classic answer to Kth Largest Element in an Array."]
      ] },
      { h: "Comparators and custom order", blocks: [
        ["p", "Most real sorting questions are about the <b>rule</b>, not the algorithm. You write a comparator and let the library sort."],
        ["table", ["Language", "Comparator returns", "Meaning"], [
          ["Java, Python (cmp_to_key), C#, JS, Ruby", "negative / 0 / positive", "negative: a comes before b; positive: a comes after b; 0: equal"],
          ["C++", "true / false", "true: a comes before b (must be a strict ordering, never true for equal items)"]]],
        ["probs", [
          { t: "Sort by number of factors", d: "Medium",
            q: "Sort by factor count ascending; if two have the same count, the smaller value comes first.",
            ex: "A = [9,3,10,6,4]\nfactor counts 3,2,4,4,3\nAnswer: [3,4,9,6,10]",
            ap: [
              { n: "Brute force", cx: "O(N log N · √A) time · O(1) space",
                idea: "A comparator that recounts both factor counts in O(√A) at <b>every comparison</b>. The same count is recomputed about log N times per element.",
                code: "from functools import cmp_to_key\n\ndef sort_by_factors(A):\n    # count_factors(x) is the O(sqrt x) counter shown in Optimal\n    def cmp(a, b):\n        fa = count_factors(a)      # recomputed on every comparison\n        fb = count_factors(b)\n        if fa != fb:\n            return fa - fb\n        return a - b\n    return sorted(A, key=cmp_to_key(cmp))" },
              { n: "Optimal", cx: "O(N√A + N log N) time · O(N) space",
                idea: "<b>Precompute</b> the factor count once per element (or for all values with the harmonic sieve from Math), then sort by the pair (count, value).",
                code: "def count_factors(x):\n    c = 0\n    i = 1\n    while i * i <= x:\n        if x % i == 0:\n            if i * i == x:\n                c += 1             # i and x // i are the same factor\n            else:\n                c += 2\n        i += 1\n    return c\n\ndef sort_by_factors(A):\n    keyed = [(count_factors(x), x) for x in A]   # each key computed once\n    keyed.sort()\n    return [x for _, x in keyed]" }
            ],
            lc: "sort-integers-by-the-number-of-1-bits" },
          { t: "B closest points to the origin", d: "Medium",
            q: "Given points (X[i], Y[i]), return the B points closest to (0, 0).",
            ex: "X = [3,5,-2], Y = [3,-1,4], B = 2\ndistances √18, √26, √20\nAnswer: (3,3), (-2,4)",
            ap: [
              { n: "Brute force", cx: "O(N log N) time · O(N) space",
                idea: "Compute √(x²+y²) as floats and sort. Works, but square roots are slow and <b>floating error</b> can misorder close distances.",
                code: "import math\n\ndef closest(X, Y, B):\n    pts = list(zip(X, Y))\n    pts.sort(key=lambda p: math.sqrt(p[0] ** 2 + p[1] ** 2))\n    return pts[:B]" },
              { n: "Better", cx: "O(N log N) time · O(N) space",
                idea: "Compare <b>squared</b> distances x² + y². Squaring keeps the order, needs no square root and is exact. Use 64-bit: coordinates up to 1e5 give squares up to 2e10.",
                code: "def closest(X, Y, B):\n    pts = list(zip(X, Y))\n    pts.sort(key=lambda p: p[0] * p[0] + p[1] * p[1])\n    return pts[:B]" },
              { n: "Optimal", cx: "O(N log B) time · O(B) space",
                idea: "You only need the B best, not a full order. Keep a <b>max-heap of size B</b>: push each point, and when the heap grows past B, pop the farthest.",
                code: "import heapq\n\ndef closest(X, Y, B):\n    heap = []                      # max-heap by distance (negated)\n    for x, y in zip(X, Y):\n        d = x * x + y * y\n        heapq.heappush(heap, (-d, x, y))\n        if len(heap) > B:\n            heapq.heappop(heap)    # drop the farthest point so far\n    return [(x, y) for _, x, y in heap]" }
            ],
            lc: "k-closest-points-to-origin" },
          { t: "Largest number by concatenation", d: "Medium",
            q: "Arrange non-negative integers so their concatenation is the largest number.",
            ex: "\"3\",\"30\": 330 > 303, so 3 goes first\n\"1\",\"19\": 191 > 119, so 1 goes first\n[7,27,32] -> 73227",
            ap: [
              { n: "Brute force", cx: "O(N! · N·L) time · O(N·L) space",
                idea: "Try every permutation and keep the largest concatenation. <b>N! orders</b>: hopeless beyond about 10 numbers.",
                code: "from itertools import permutations\n\ndef largest_number(A):\n    best = \"\"\n    for p in permutations(str(x) for x in A):\n        s = \"\".join(p)\n        if best == \"\" or int(s) > int(best):\n            best = s\n    return str(int(best))" },
              { n: "Optimal", cx: "O(N log N · L) time · O(N·L) space, L = digit length",
                idea: "Compare as strings: <b>a goes before b if a+b &gt; b+a</b>. \"3\" vs \"30\": 330 &gt; 303, so 3 first. This rule is transitive, so a normal sort works.",
                code: "from functools import cmp_to_key\n\ndef largest_number(A):\n    s = [str(x) for x in A]\n\n    def cmp(a, b):\n        if a + b > b + a:\n            return -1              # a should come first\n        if a + b < b + a:\n            return 1\n        return 0\n\n    s.sort(key=cmp_to_key(cmp))\n    res = \"\".join(s)\n    if res[0] == \"0\":\n        return \"0\"                 # all zeros\n    return res" }
            ],
            edge: "All zeros: return \"0\", not \"000\".",
            lc: "largest-number" }
        ]],
        ["p", "<b>Stability example.</b> Sort by marks: (Vinit 92), (Ritika 94), (Risabh 75), (Jilender 34), (Rajeev 94). A stable sort gives Jilender 34, Risabh 75, Vinit 92, <b>Ritika 94, Rajeev 94</b>. Ritika stays before Rajeev because she came first. This matters when you sort by one key and then by another."]
      ] },
      { h: "Interview cheatsheet", blocks: [
        ["table", ["Algorithm", "Time (best / avg / worst)", "Extra space", "Stable", "In-place", "Use when"], [
          ["Selection", "N² / N² / N²", "O(1)", "No", "Yes", "Minimise swaps"],
          ["Bubble", "N / N² / N²", "O(1)", "Yes", "Yes", "Teaching only"],
          ["Insertion", "N / N² / N²", "O(1)", "Yes", "Yes", "Small or nearly sorted input"],
          ["Count", "N + R", "O(R)", "Yes (prefix-sum version)", "No", "Small value range"],
          ["Merge", "N log N always", "O(N)", "Yes", "No", "Guaranteed time, linked lists, inversion count"],
          ["Quick (random)", "N log N / N log N / N²", "O(log N)", "No", "Yes", "Fast in practice, quickselect"],
          ["Heap", "N log N always", "O(1)", "No", "Yes", "Top-k, guaranteed time with O(1) space"]]],
        ["list", [
          "Sorting first often unlocks two pointers or binary search. Ask: does order matter for the answer?",
          "Sorting by a derived key? Precompute the key; do not recompute it inside the comparator.",
          "Avoid floats in comparators: compare squared distances, cross-multiply fractions.",
          "C++ comparators must return false for equal items, or the sort can crash.",
          "Lower bound for comparison sorts is Ω(N log N). Count sort beats it only because it does not compare."]]
      ] }
    ],
    lc: [
      ["Merge Sorted Array", "merge-sorted-array", "Easy"],
      ["Sort Colors", "sort-colors", "Medium"],
      ["Sort an Array", "sort-an-array", "Medium"],
      ["Largest Number", "largest-number", "Medium"],
      ["K Closest Points to Origin", "k-closest-points-to-origin", "Medium"],
      ["Kth Largest Element in an Array", "kth-largest-element-in-an-array", "Medium"],
      ["H-Index", "h-index", "Medium"],
      ["Sort Integers by The Number of 1 Bits", "sort-integers-by-the-number-of-1-bits", "Easy"],
      ["Relative Sort Array", "relative-sort-array", "Easy"],
      ["Sort Characters By Frequency", "sort-characters-by-frequency", "Medium"],
      ["Wiggle Sort II", "wiggle-sort-ii", "Medium"],
      ["Count of Smaller Numbers After Self", "count-of-smaller-numbers-after-self", "Hard"],
      ["Reverse Pairs", "reverse-pairs", "Hard"],
      ["Maximum Gap", "maximum-gap", "Hard"]
    ],
    quiz: [
      { q: "Merge sort's recurrence is T(N) = 2T(N/2) + N. What is its worst-case time?", o: ["O(N)", "O(N log N)", "O(N²)", "O(log N)"], a: 1, why: "Each of the log N levels of the recursion tree does N work in total, regardless of the input." },
      { q: "Quick sort with the first element as pivot is given an already sorted array. What happens?", o: ["O(N log N), it is the best case", "O(N²), each partition removes only one element", "O(N), nothing moves", "It fails to terminate"], a: 1, why: "The pivot is always the minimum, so T(N) = N + T(N−1) = O(N²) with recursion depth N. A random pivot fixes this in expectation." },
      { q: "Which sort is stable?", o: ["Quick sort", "Heap sort", "Merge sort (with ≤ in the merge)", "Selection sort"], a: 2, why: "Taking from the left half on ties keeps equal items in their original order." },
      { q: "During inversion counting, A[i] > A[j] where i is in the left half and j in the right. How many inversions does A[j] form with the left half at this moment?", o: ["1", "j − i", "mid − i + 1", "hi − j + 1"], a: 2, why: "The left half is sorted, so A[i..mid] are all ≥ A[i] > A[j]: that is mid − i + 1 elements." },
      { q: "When is count sort a bad idea?", o: ["When there are duplicates", "When there are negative numbers", "When max − min is huge, e.g. values up to 1e9", "When N is large"], a: 2, why: "It needs one bucket per value in the range. Negatives are fine (shift by min); large N is fine." },
      { q: "In C++, what must a comparator return for two equal elements?", o: ["true", "false", "0", "either"], a: 1, why: "C++ needs a strict weak ordering: comp(a, a) must be false. Returning true can cause undefined behaviour." },
      { q: "To find the B closest points to the origin, what should you compare?", o: ["sqrt(x² + y²) as doubles", "x² + y² as 64-bit integers", "|x| + |y|", "max(|x|, |y|)"], a: 1, why: "Squaring preserves order for non-negative distances and avoids floating error; 64-bit avoids overflow." }
    ]
  };

  /* ═════════ BINARY SEARCH ═════════ */
  T["binary-search"] = {
    name: "Binary search", icon: "🎯", color: "#0e7490", minutes: 70,
    summary: "Halve the search space each step by asking a question whose answer tells you which half to throw away; it works on sorted arrays, unsorted shapes and answer ranges.",
    sections: [
      { h: "The idea: throw away half", blocks: [
        ["analogy", "Looking up a word in a paper dictionary. You open the middle, see you are past your word, and ignore the whole right half. A 1,000-page dictionary takes about 10 such flips."],
        ["p", "Binary search needs three things:"],
        ["steps", [["Target", "What are you looking for? An index, a value, the smallest X that works."], ["Search space", "A range you can halve: indices 0..N−1, values 1..N, a count of elements taken from one array."], ["Condition", "A cheap check at mid that tells you which half cannot contain the answer."]]],
        ["p", "Each step halves the space, so it takes O(log N) steps. A sorted array is the most common case, but <b>sorting is not required</b>, only a reliable rule to discard one half."],
        ["viz", "binarySearch", "Classic binary search. Watch the discarded half fade out."],
        ["probs", [
          { t: "Search K in a sorted array", d: "Easy",
            q: "Return the index of K in a sorted array, or −1.",
            ex: "A = [3,6,9,12,14,19,20,23,25,27]\nK = 23 -> 7, K = 20 -> 6\nK = 21: mid=4(14<21) l=5; mid=7(23>21) r=6; mid=5(19) l=6; mid=6(20) l=7; l>r -> -1",
            ap: [
              { n: "Brute force", cx: "O(N) time · O(1) space",
                idea: "Linear scan from the left. It never uses the fact that the array is <b>sorted</b>.",
                code: "def search(A, K):\n    for i in range(len(A)):\n        if A[i] == K:\n            return i\n    return -1" },
              { n: "Optimal", cx: "O(log N) time · O(1) space",
                idea: "Compare A[mid] with K and drop the half that cannot contain it. Use <b>mid = l + (r − l) / 2</b> so l + r cannot overflow in 32-bit languages.",
                code: "def search(A, K):\n    l = 0\n    r = len(A) - 1\n    while l <= r:\n        mid = l + (r - l) // 2\n        if A[mid] == K:\n            return mid\n        if A[mid] < K:\n            l = mid + 1            # K can only be on the right\n        else:\n            r = mid - 1            # K can only be on the left\n    return -1" }
            ],
            viz: "binarySearch", lc: "binary-search" }
        ]]
      ] },
      { h: "Boundaries: first, last, ceiling", blocks: [
        ["p", "When the array has duplicates, \"found it\" is not the end. <b>Record the answer and keep searching</b> in the direction you care about. This one change powers first/last occurrence, lower bound, and binary search on the answer."],
        ["viz", "firstOccurrence", "On a match, save ans = mid and continue left."],
        ["probs", [
          { t: "First and last occurrence", d: "Medium",
            q: "In a sorted array, find the first and last index of K.",
            ex: "A = [-5,-5,-3,0,0,1,5,5,5,5,5,8,10,10,15], K = 5\nfirst = 6, last = 10, count = 10 - 6 + 1 = 5",
            ap: [
              { n: "Brute force", cx: "O(N) time · O(1) space",
                idea: "Scan and remember the first and last index where A[i] == K. (Finding any K by binary search and then walking left and right is no better: it is <b>O(N) when K repeats</b> many times.)",
                code: "def first_last(A, K):\n    first = -1\n    last = -1\n    for i in range(len(A)):\n        if A[i] == K:\n            if first == -1:\n                first = i\n            last = i\n    return first, last" },
              { n: "Optimal", cx: "O(log N) time · O(1) space",
                idea: "On <code>A[mid] == K</code>: set ans = mid, then <b>r = mid − 1</b> for the first occurrence or <b>l = mid + 1</b> for the last. Two binary searches. Count of K = last − first + 1.",
                code: "def bound(A, K, find_first):\n    l = 0\n    r = len(A) - 1\n    ans = -1\n    while l <= r:\n        mid = l + (r - l) // 2\n        if A[mid] == K:\n            ans = mid              # record, then keep searching one side\n            if find_first:\n                r = mid - 1\n            else:\n                l = mid + 1\n        elif A[mid] < K:\n            l = mid + 1\n        else:\n            r = mid - 1\n    return ans\n\ndef first_last(A, K):\n    return bound(A, K, True), bound(A, K, False)" }
            ],
            viz: "firstOccurrence", lc: "find-first-and-last-position-of-element-in-sorted-array" },
          { t: "Ceiling (lower bound)", d: "Easy",
            q: "In a sorted array, find the smallest element ≥ x.",
            ex: "A = [3,5,7,12,20,24,28,35], x = 25\nAnswer: 28",
            ap: [
              { n: "Brute force", cx: "O(N) time · O(1) space",
                idea: "Scan from the left and return the first A[i] ≥ x. Linear, because it <b>ignores the sorted order</b>.",
                code: "def ceiling(A, x):\n    for i in range(len(A)):\n        if A[i] >= x:\n            return i\n    return -1" },
              { n: "Optimal", cx: "O(log N) time · O(1) space",
                idea: "If A[mid] ≥ x, mid is a candidate: <b>ans = mid, go left</b> for a smaller one. Otherwise go right. Floor is the mirror: A[mid] ≤ x, ans = mid, go right.",
                code: "def ceiling(A, x):\n    l = 0\n    r = len(A) - 1\n    ans = -1\n    while l <= r:\n        mid = l + (r - l) // 2\n        if A[mid] >= x:\n            ans = mid              # candidate; look for a smaller one\n            r = mid - 1\n        else:\n            l = mid + 1\n    return ans" }
            ],
            edge: "x larger than every element: no ceiling (−1). Search Insert Position returns N in that case.",
            lc: "search-insert-position" }
        ]]
      ] },
      { h: "Binary search without a sorted array", blocks: [
        ["p", "These problems have no sorted order, but each one has a rule at mid that tells you which side the answer must be on."],
        ["probs", [
          { t: "Unique element among adjacent duplicates", d: "Medium", co: "Google",
            q: "Every element appears twice in a row except one. The array is not sorted. Find the single one.",
            ex: "[8,8,5,5,9,9,6,2,2,4,4] -> 6\n[3,3,7,7,2,2,1,1,5] -> 5\nTrace 1: mid=5 (9, pair starts at 4, even) l=6; mid=8 (2, pair starts at 7, odd) r=7; mid=6 (6 differs from both) -> 6",
            ap: [
              { n: "Brute force", cx: "O(N) time · O(1) space",
                idea: "XOR everything: each pair cancels to 0 and the single value is left. Simple, but it reads <b>every element</b>.",
                code: "def single(A):\n    ans = 0\n    for x in A:\n        ans ^= x                   # x ^ x = 0, so pairs cancel\n    return ans" },
              { n: "Optimal", cx: "O(log N) time · O(1) space",
                idea: "Before the unique element, every pair starts at an <b>even</b> index. After it, pairs start at <b>odd</b> indices. At mid, find the first index of mid's pair (mid or mid−1). Even: the unique is to the right. Odd: it is to the left. If A[mid] differs from both neighbours, it is the answer. Handle the two ends first so mid ± 1 is always valid.",
                code: "def single(A):\n    n = len(A)\n    if n == 1 or A[0] != A[1]:\n        return A[0]\n    if A[-1] != A[-2]:\n        return A[-1]\n    l = 1\n    r = n - 2\n    while l <= r:\n        mid = (l + r) // 2\n        if A[mid] != A[mid - 1] and A[mid] != A[mid + 1]:\n            return A[mid]\n        if A[mid] == A[mid - 1]:\n            first = mid - 1        # start of mid's pair\n        else:\n            first = mid\n        if first % 2 == 0:\n            l = first + 2          # pattern intact: unique is to the right\n        else:\n            r = first - 1          # pattern broken: unique is to the left\n    return -1" }
            ],
            edge: "Handle N = 1, A[0] ≠ A[1], A[N−1] ≠ A[N−2] before the loop, then search 1..N−2 so mid−1 and mid+1 are always valid.",
            lc: "single-element-in-a-sorted-array" },
          { t: "Maximum in an increasing-then-decreasing array", d: "Easy",
            q: "Distinct values strictly rise, then strictly fall. Find the maximum.",
            ex: "[1,3,5,2] -> 5\n[1,3,5,10,15,12,6] -> 15",
            ap: [
              { n: "Brute force", cx: "O(N) time · O(1) space",
                idea: "Linear scan for the largest value. It ignores the <b>shape</b> of the array.",
                code: "def peak(A):\n    return max(A)" },
              { n: "Optimal", cx: "O(log N) time · O(1) space",
                idea: "At mid: bigger than both neighbours, return it. If <b>A[mid] &lt; A[mid+1]</b> you are on the rising slope, go right. Otherwise you are on the falling slope, go left.",
                code: "def peak(A):\n    n = len(A)\n    if n == 1 or A[0] > A[1]:\n        return A[0]\n    if A[-1] > A[-2]:\n        return A[-1]\n    l = 1\n    r = n - 2\n    while l <= r:\n        mid = (l + r) // 2\n        if A[mid - 1] < A[mid] > A[mid + 1]:\n            return A[mid]\n        if A[mid] < A[mid + 1]:\n            l = mid + 1            # rising slope: peak is to the right\n        else:\n            r = mid - 1            # falling slope: peak is to the left\n    return -1" }
            ],
            edge: "Max at index 0 or N−1 (purely falling or rising). Check before the loop.",
            lc: "peak-index-in-a-mountain-array" },
          { t: "Local minimum (any)", d: "Medium",
            q: "Return any element not greater than its neighbours. Missing neighbours count as +∞.",
            ex: "[3,6,1,0,9,15,8] -> 3, 0 or 8\n[21,20,19,17,15,9,7] -> 7\n[5,9,15,20,25,30] -> 5\n[5,8,12,3] -> 5 or 3",
            ap: [
              { n: "Brute force", cx: "O(N) time · O(1) space",
                idea: "Check every index against its neighbours (missing neighbours count as +∞). Linear: it does not use the <b>downhill</b> argument.",
                code: "def local_min(A):\n    n = len(A)\n    for i in range(n):\n        left = A[i - 1] if i > 0 else float('inf')\n        right = A[i + 1] if i < n - 1 else float('inf')\n        if A[i] <= left and A[i] <= right:\n            return i\n    return -1" },
              { n: "Optimal", cx: "O(log N) time · O(1) space",
                idea: "At mid, <b>walk toward a smaller neighbour</b>. Going downhill must end somewhere, and the array edges act as +∞ walls, so a local minimum exists on that side. If mid is a peak, either side works.",
                code: "def local_min(A):\n    n = len(A)\n    if n == 1 or A[0] <= A[1]:\n        return 0\n    if A[-1] <= A[-2]:\n        return n - 1\n    l = 1\n    r = n - 2\n    while l <= r:\n        mid = (l + r) // 2\n        if A[mid] <= A[mid - 1] and A[mid] <= A[mid + 1]:\n            return mid\n        if A[mid - 1] < A[mid]:\n            r = mid - 1            # downhill to the left\n        else:\n            l = mid + 1            # downhill to the right\n    return -1" }
            ],
            lc: "find-peak-element" }
        ]],
        ["tip", "Find Peak Element is the same as local minimum with the comparisons flipped: walk toward a bigger neighbour."]
      ] },
      { h: "Rotated sorted arrays", blocks: [
        ["p", "A sorted array rotated at some point is two sorted runs: an upper part (values ≥ A[0]) followed by a lower part (values &lt; A[0]). Comparing with <b>A[0]</b> tells you which run any index is in."],
        ["viz", "ss_rotatedSearch", "Work out which part K is in and which part mid is in. If they differ, the direction is forced; if they match, it is a normal binary search."],
        ["probs", [
          { t: "Search in a rotated sorted array", d: "Medium",
            q: "A sorted array of distinct values was rotated. Return the index of K or −1.",
            ex: "A = [30,40,50,60,70,80,10,20,25], K = 40 -> 1",
            ap: [
              { n: "Brute force", cx: "O(N) time · O(1) space",
                idea: "Linear scan. Ignores that the array is made of <b>two sorted runs</b>.",
                code: "def search(A, K):\n    for i in range(len(A)):\n        if A[i] == K:\n            return i\n    return -1" },
              { n: "Better", cx: "O(log N) time · O(1) space (two passes)",
                idea: "First binary search for the index of the maximum (A[mid] ≥ A[0] means mid is in the upper part: record it and go right). Then do a normal binary search in <b>[0, maxIdx]</b> if K ≥ A[0], else in <b>[maxIdx+1, N−1]</b>.",
                code: "def bsearch(A, l, r, K):\n    while l <= r:\n        mid = (l + r) // 2\n        if A[mid] == K:\n            return mid\n        if A[mid] < K:\n            l = mid + 1\n        else:\n            r = mid - 1\n    return -1\n\ndef search(A, K):\n    n = len(A)\n    l = 0\n    r = n - 1\n    mx = 0\n    while l <= r:                  # 1) last index of the upper part\n        mid = (l + r) // 2\n        if A[mid] >= A[0]:\n            mx = mid\n            l = mid + 1\n        else:\n            r = mid - 1\n    if K >= A[0]:                  # 2) search the part that can hold K\n        return bsearch(A, 0, mx, K)\n    return bsearch(A, mx + 1, n - 1, K)" },
              { n: "Optimal", cx: "O(log N) time · O(1) space (one pass)",
                idea: "One binary search. If K &lt; A[0], K is in the lower part, so any mid with A[mid] ≥ A[0] (upper part) means <b>go right</b>; inside the lower part compare normally. Mirror it when K ≥ A[0].",
                code: "def search(A, K):\n    l = 0\n    r = len(A) - 1\n    while l <= r:\n        mid = (l + r) // 2\n        if A[mid] == K:\n            return mid\n        if K < A[0]:                       # K is in the lower part\n            if A[mid] >= A[0] or A[mid] < K:\n                l = mid + 1\n            else:\n                r = mid - 1\n        else:                              # K is in the upper part\n            if A[mid] < A[0] or A[mid] > K:\n                r = mid - 1\n            else:\n                l = mid + 1\n    return -1" }
            ],
            edge: "Not rotated (A[N−1] &gt; A[0]); N = 1; K = A[0]; K absent.",
            viz: "ss_rotatedSearch", lc: "search-in-rotated-sorted-array" },
          { t: "Find the rotation point (maximum / minimum)", d: "Medium",
            q: "Find the index of the maximum in a rotated sorted array (the minimum is the next index).",
            ex: "[7,8,9,10,20,3,5]\nmid=3 (10, upper) l=4; mid=5 (3, lower) r=4; mid=4 (20, upper) -> maxIdx = 4",
            ap: [
              { n: "Brute force", cx: "O(N) time · O(1) space",
                idea: "Scan for the single <b>drop</b> A[i] &gt; A[i+1]; index i is the maximum.",
                code: "def max_index(A):\n    for i in range(len(A) - 1):\n        if A[i] > A[i + 1]:\n            return i\n    return len(A) - 1              # no drop: not rotated" },
              { n: "Optimal", cx: "O(log N) time · O(1) space",
                idea: "If <b>A[mid] ≥ A[0]</b>, mid is in the upper part: record it and go right. Otherwise go left. The last upper index is the maximum; the minimum is the next index.",
                code: "def max_index(A):\n    n = len(A)\n    if A[-1] > A[0]:\n        return n - 1               # not rotated\n    l = 0\n    r = n - 1\n    ans = 0\n    while l <= r:\n        mid = (l + r) // 2\n        if A[mid] >= A[0]:\n            ans = mid              # still in the upper part\n            l = mid + 1\n        else:\n            r = mid - 1\n    return ans" }
            ],
            lc: "find-minimum-in-rotated-sorted-array" },
          { t: "Can the array be sorted by rotation?", d: "Easy",
            q: "Check whether some rotation of the array is sorted.",
            ex: "[3,4,5,1,2] -> one dip -> yes\n[3,7,9,1,4,5,6,2] -> two dips -> no",
            ap: [
              { n: "Brute force", cx: "O(N²) time · O(N) space",
                idea: "Build all N rotations and check each one for sortedness. <b>N rotations × N checks</b>.",
                code: "def check(A):\n    n = len(A)\n    for s in range(n):\n        rot = A[s:] + A[:s]\n        if all(rot[i] <= rot[i + 1] for i in range(n - 1)):\n            return True\n    return False" },
              { n: "Optimal", cx: "O(N) time · O(1) space",
                idea: "Count <b>dips</b>: positions where A[i] &gt; A[(i+1) % N], including the wrap from last to first. A rotated sorted array has at most one dip.",
                code: "def check(A):\n    n = len(A)\n    dips = 0\n    for i in range(n):\n        if A[i] > A[(i + 1) % n]:  # includes the wrap from last to first\n            dips += 1\n    return dips <= 1" }
            ],
            lc: "check-if-array-is-sorted-and-rotated" }
        ]]
      ] },
      { h: "Binary search on the answer", blocks: [
        ["p", "Sometimes you are not searching an array at all. You are searching the <b>range of possible answers</b>. If a yes/no check \"is X good enough?\" flips only once (all yes then all no, or the reverse), binary search X and run the check at each mid."],
        ["steps", [["Spot it", "\"Minimise the maximum\" or \"maximise the minimum\"; a monotonic relation (more painters → less time; more cows → smaller gap); expected complexity has a log."], ["Bound it", "Pick lo and hi that surely contain the answer (e.g. max(A) and sum(A))."], ["Write check(X)", "Usually a greedy O(N) pass."], ["Search", "If check(mid) is true, record ans and move toward a better answer; else move the other way."]]],
        ["probs", [
          { t: "Floor of square root", d: "Easy",
            q: "Return floor(√N) without a library call.",
            ex: "25 -> 5, 50 -> 7, 30 -> 5\nN=50: mid 25 r=24; 12 r=11; 6 (36≤50) ans=6 l=7; 9 r=8; 7 (49) ans=7 l=8; 8 (64) r=7 -> 7",
            ap: [
              { n: "Brute force", cx: "O(√N) time · O(1) space",
                idea: "Increase i while (i+1)·(i+1) ≤ N. For N = 1e18 that is <b>1e9 steps</b>.",
                code: "def floor_sqrt(N):\n    i = 0\n    while (i + 1) * (i + 1) <= N:\n        i += 1\n    return i" },
              { n: "Optimal", cx: "O(log N) time · O(1) space",
                idea: "Binary search the answer in 1..N. If <b>mid·mid ≤ N</b>, mid is a candidate: ans = mid, go right. Otherwise go left. Compare <code>mid ≤ N / mid</code> to avoid overflow in 64-bit languages.",
                code: "def floor_sqrt(N):\n    if N < 2:\n        return N\n    l = 1\n    r = N\n    ans = 1\n    while l <= r:\n        mid = (l + r) // 2\n        if mid <= N // mid:        # mid * mid <= N without overflow\n            ans = mid\n            l = mid + 1\n        else:\n            r = mid - 1\n    return ans" }
            ],
            edge: "N = 0 or 1.",
            lc: "sqrtx" },
          { t: "Painter's partition I: painters needed for time X", d: "Medium",
            q: "Boards A[], each unit takes T time. Painters paint contiguous boards and each may work at most X time. Return the minimum painters, or −1.",
            ex: "A = [5,3,6,1,9], T = 2 -> times 10,6,12,2,18\nX = 15 -> -1 (18 > 15)\nX = 30 -> 2: [10+6+12+2] | [18]\nX = 20 -> 3: [10+6] | [12+2] | [18]",
            ap: [
              { n: "Solution", cx: "O(N) time · O(1) space",
                idea: "Trying every way to cut the boards is exponential and unnecessary. <b>Greedy:</b> give the current painter boards while they fit in X; when the next board does not fit, start a new painter. Taking as much as possible never hurts later painters. If any single board needs more than X, the answer is −1. This is the check function for part II.",
                code: "def painters(A, T, X):\n    count = 1\n    left = X                       # time left for the current painter\n    for a in A:\n        t = a * T\n        if t > X:\n            return -1              # one board alone is too long\n        if t <= left:\n            left -= t\n        else:\n            count += 1             # start a new painter on this board\n            left = X - t\n    return count" }
            ] },
          { t: "Painter's partition II: minimum time with P painters", d: "Hard", co: "Google",
            q: "Given P painters working in parallel on contiguous boards, find the minimum time to paint everything.",
            ex: "A = [5,3,6,1,9], T = 2\nP = 1 -> 48\nP = 2: 5|3,6,1,9 -> 38; 5,3|6,1,9 -> 32; 5,3,6|1,9 -> 28; 5,3,6,1|9 -> 30\nAnswer: 28",
            ap: [
              { n: "Brute force", cx: "O(N · (sum − max)·T) time · O(1) space",
                idea: "Try every time X from max(A)·T upward and return the first one where painters(X) ≤ P. Correct, but the range of X can be <b>billions wide</b>.",
                code: "def min_time(A, T, P):\n    X = max(A) * T\n    while painters(A, T, X) > P:   # painters() from part I\n        X += 1\n    return X" },
              { n: "Optimal", cx: "O(N log(sum·T)) time · O(1) space",
                idea: "\"Can we finish in time X?\" is monotonic: if yes for X, yes for anything bigger. Binary search X in <b>[max(A)·T, sum(A)·T]</b>. If painters(X) ≤ P, record X and go left; else go right.",
                code: "def min_time(A, T, P):\n    l = max(A) * T                 # someone must paint the biggest board\n    r = sum(A) * T                 # one painter does everything\n    ans = r\n    while l <= r:\n        mid = (l + r) // 2\n        if painters(A, T, mid) <= P:\n            ans = mid              # feasible: try less time\n            r = mid - 1\n        else:\n            l = mid + 1\n    return ans" }
            ],
            edge: "P ≥ N: answer is max(A)·T.",
            lc: "split-array-largest-sum" },
          { t: "Aggressive cows", d: "Hard",
            q: "Sorted stall positions and M cows. Place the cows to maximise the minimum distance between any two.",
            ex: "[1,4,8,10], M = 3 -> 3 (cows at 1, 4, 8)\n[1,2,4,8,9], M = 3 -> 3\n[2,6,11,14,19,25,30,39,43], M = 4 -> 12 (2, 14, 30, 43)",
            ap: [
              { n: "Brute force", cx: "O(N · range) time · O(1) space",
                idea: "Try every gap D = 1, 2, 3, … and stop at the first one where the cows no longer fit. Each check is O(N), but there can be <b>1e9 values of D</b>.",
                code: "def max_min_gap(A, M):\n    A.sort()\n    D = 1\n    while canPlace(A, M, D + 1):   # canPlace() as in Optimal\n        D += 1\n    return D" },
              { n: "Optimal", cx: "O(N log(range)) time (+ O(N log N) sort) · O(1) space",
                idea: "\"Can we place M cows with every gap ≥ D?\" is yes for small D and no after a threshold. Search D in <b>[1, A[N−1] − A[0]]</b>. Check greedily: cow at A[0], then the first stall at gap ≥ D from the last cow. Feasible: record and go right.",
                code: "def canPlace(A, M, D):\n    cows = 1\n    last = A[0]                    # first cow at the first stall\n    for x in A[1:]:\n        if x - last >= D:\n            cows += 1\n            last = x\n            if cows == M:\n                return True\n    return False\n\ndef max_min_gap(A, M):\n    A.sort()\n    l = 1\n    r = A[-1] - A[0]\n    ans = 0\n    while l <= r:\n        mid = (l + r) // 2\n        if canPlace(A, M, mid):\n            ans = mid              # feasible: try a bigger gap\n            l = mid + 1\n        else:\n            r = mid - 1\n    return ans" }
            ],
            edge: "M = 2: answer is A[N−1] − A[0]. Unsorted stalls: sort first.",
            viz: "ss_aggressiveCows", lc: "magnetic-force-between-two-balls" },
          { t: "Bth smallest triplet sum", d: "Hard",
            q: "Over all triplets i &lt; j &lt; k, return the Bth smallest A[i] + A[j] + A[k].",
            ex: "A = [2,4,3,2], B = 3\nsums 9, 8, 7, 9 -> sorted 7, 8, 9, 9\nAnswer: 9",
            ap: [
              { n: "Brute force", cx: "O(N³ log N) time · O(N³) space",
                idea: "Enumerate every triplet sum, sort, and pick the Bth. With N = 1000 that is about <b>1.7e8 sums</b> in memory.",
                code: "def bth_triplet(A, B):\n    n = len(A)\n    sums = []\n    for i in range(n):\n        for j in range(i + 1, n):\n            for k in range(j + 1, n):\n                sums.append(A[i] + A[j] + A[k])\n    sums.sort()\n    return sums[B - 1]" },
              { n: "Optimal", cx: "O(N² log(range)) time · O(1) space",
                idea: "Sort A. Binary search the <b>sum value</b> S. Count triplets with sum ≤ S in O(N²): fix i, then two pointers j, k; if A[i]+A[j]+A[k] ≤ S, all k − j pairs (j, j+1..k) count at once. If count ≥ B, S is a candidate, go left.",
                code: "def countLE(A, S):\n    c = 0\n    for i in range(len(A) - 2):\n        j = i + 1\n        k = len(A) - 1\n        while j < k:\n            if A[i] + A[j] + A[k] <= S:\n                c += k - j         # every k' in (j, k] works with this j\n                j += 1\n            else:\n                k -= 1\n    return c\n\ndef bth_triplet(A, B):\n    A.sort()\n    l = sum(A[:3])\n    r = sum(A[-3:])\n    ans = r\n    while l <= r:\n        mid = (l + r) // 2\n        if countLE(A, mid) >= B:\n            ans = mid              # at least B sums <= mid: go smaller\n            r = mid - 1\n        else:\n            l = mid + 1\n    return ans" }
            ] }
        ]],
        ["viz", "ss_aggressiveCows", "The answer row fills green (feasible) and red (infeasible). Exactly one boundary: that is why binary search works."],
        ["tip", "Related practice: Allocate Books (same as painters), Ath Magical Number. On LeetCode: Koko Eating Bananas, Capacity to Ship Packages, Split Array Largest Sum."]
      ] },
      { h: "Median of two sorted arrays", blocks: [
        ["p", "The hardest classic binary search. The search space is <b>how many elements you take from the smaller array</b> into the left half of the merged result."],
        ["probs", [
          { t: "Median of two sorted arrays", d: "Hard", co: "Google",
            q: "Given sorted A (size N) and B (size M), find the median of their union in O(log min(N, M)).",
            ex: "A = [1,4,5], B = [2,3] -> 3\nA = [1,3,4,7,10,12], B = [2,3,6,15] -> (4+6)/2 = 5\nA = [7,12,14,15], B = [1,2,3,4,9,11] -> (7+9)/2 = 8",
            ap: [
              { n: "Brute force", cx: "O(N + M) time · O(N + M) space",
                idea: "Merge both arrays with three pointers and pick the middle element(s). Simple, but it builds the <b>whole merged array</b>.",
                code: "def median(A, B):\n    C = sorted(A + B)              # or the three-pointer merge\n    t = len(C)\n    if t % 2:\n        return C[t // 2]\n    return (C[t // 2 - 1] + C[t // 2]) / 2" },
              { n: "Better", cx: "O(N + M) time · O(1) space",
                idea: "Run the merge but <b>do not store it</b>: walk two pointers and only remember the last two values taken until you reach position (N+M)/2.",
                code: "def median(A, B):\n    t = len(A) + len(B)\n    i = 0\n    j = 0\n    prev = cur = 0\n    for _ in range(t // 2 + 1):    # take the smaller front value each step\n        prev = cur\n        if j >= len(B) or (i < len(A) and A[i] <= B[j]):\n            cur = A[i]\n            i += 1\n        else:\n            cur = B[j]\n            j += 1\n    if t % 2:\n        return cur\n    return (prev + cur) / 2" },
              { n: "Optimal", cx: "O(log min(N, M)) time · O(1) space",
                idea: "The left half has x = (N+M+1)/2 elements. Take c1 from A and <b>c2 = x − c1</b> from B. Let l1 = A[c1−1], r1 = A[c1], l2 = B[c2−1], r2 = B[c2] (±∞ off the ends). The split is right iff <b>l1 ≤ r2 and l2 ≤ r1</b>. Then the median is max(l1, l2) for an odd total, else (max(l1,l2) + min(r1,r2)) / 2. If l1 &gt; r2 you took too many from A (go left); if l2 &gt; r1, too few (go right). Search over the <b>smaller</b> array so c2 always stays in range.",
                code: "def median(A, B):\n    if len(A) > len(B):\n        A, B = B, A                # binary search the smaller array\n    N = len(A)\n    M = len(B)\n    x = (N + M + 1) // 2           # size of the left half\n    lo = 0\n    hi = N\n    while lo <= hi:\n        c1 = (lo + hi) // 2        # elements taken from A\n        c2 = x - c1                # elements taken from B\n        l1 = A[c1 - 1] if c1 > 0 else float('-inf')\n        r1 = A[c1] if c1 < N else float('inf')\n        l2 = B[c2 - 1] if c2 > 0 else float('-inf')\n        r2 = B[c2] if c2 < M else float('inf')\n        if l1 <= r2 and l2 <= r1:\n            if (N + M) % 2:\n                return max(l1, l2)\n            return (max(l1, l2) + min(r1, r2)) / 2\n        if l1 > r2:\n            hi = c1 - 1            # too many from A\n        else:\n            lo = c1 + 1            # too few from A\n    return 0.0" }
            ],
            edge: "One array empty; all of A less than B; duplicates; use ±∞ sentinels and floating division for even totals.",
            lc: "median-of-two-sorted-arrays" }
        ]],
        ["steps", [
          ["x = 5", "A = [7,12,14,15], B = [1,2,3,4,9,11]. Left half needs 5 elements. Search c1 in 0..4."],
          ["c1 = 2", "c2 = 3: l1 = A[1] = 12, r2 = B[3] = 4. l1 &gt; r2: too many from A, go left."],
          ["c1 = 0", "c2 = 5: l2 = B[4] = 9 &gt; r1 = 7: too few from A, go right."],
          ["c1 = 1", "c2 = 4: l1 = 7, r1 = 12, l2 = 4, r2 = 9. Valid. Median = (max(7,4) + min(12,9)) / 2 = 8."]]],
        ["warn", "If you binary search the larger array, c2 = x − c1 can go negative or past M (e.g. N = 100, M = 5). Always swap so A is the smaller one."]
      ] },
      { h: "Patterns & pitfalls", blocks: [
        ["table", ["Goal", "On A[mid] (or check(mid)) true", "Else", "Answer"], [
          ["Exact match", "return mid", "move toward K", "−1 if l &gt; r"],
          ["First occurrence / lower bound", "ans = mid; r = mid − 1", "l = mid + 1", "ans"],
          ["Last occurrence / floor", "ans = mid; l = mid + 1", "r = mid − 1", "ans"],
          ["Minimise X such that check(X) holds", "ans = mid; r = mid − 1", "l = mid + 1", "ans"],
          ["Maximise X such that check(X) holds", "ans = mid; l = mid + 1", "r = mid − 1", "ans"]]],
        ["list", [
          "Use <code>mid = l + (r − l) / 2</code>; <code>(l + r) / 2</code> overflows in 32-bit languages.",
          "Stick to one template (<code>while l ≤ r</code> with l = mid + 1 / r = mid − 1) so every step shrinks the range and you never loop forever.",
          "Before searching neighbours (mid − 1, mid + 1), handle the edges first and search 1..N−2.",
          "In answer-space problems, check that the predicate really is monotonic. If it flips twice, binary search is wrong.",
          "Squares and products in the check can overflow: compare with division or use 64-bit.",
          "Hints it is binary search: sorted data, a yes/no that flips once, \"min of max\" / \"max of min\", N up to 1e5 with values up to 1e9."]]
      ] }
    ],
    lc: [
      ["Binary Search", "binary-search", "Easy"],
      ["Search Insert Position", "search-insert-position", "Easy"],
      ["Find First and Last Position of Element in Sorted Array", "find-first-and-last-position-of-element-in-sorted-array", "Medium"],
      ["Sqrt(x)", "sqrtx", "Easy"],
      ["Single Element in a Sorted Array", "single-element-in-a-sorted-array", "Medium"],
      ["Find Peak Element", "find-peak-element", "Medium"],
      ["Peak Index in a Mountain Array", "peak-index-in-a-mountain-array", "Medium"],
      ["Search in Rotated Sorted Array", "search-in-rotated-sorted-array", "Medium"],
      ["Find Minimum in Rotated Sorted Array", "find-minimum-in-rotated-sorted-array", "Medium"],
      ["Check if Array Is Sorted and Rotated", "check-if-array-is-sorted-and-rotated", "Easy"],
      ["Search a 2D Matrix", "search-a-2d-matrix", "Medium"],
      ["Koko Eating Bananas", "koko-eating-bananas", "Medium"],
      ["Capacity To Ship Packages Within D Days", "capacity-to-ship-packages-within-d-days", "Medium"],
      ["Magnetic Force Between Two Balls", "magnetic-force-between-two-balls", "Medium"],
      ["Split Array Largest Sum", "split-array-largest-sum", "Hard"],
      ["Kth Smallest Element in a Sorted Matrix", "kth-smallest-element-in-a-sorted-matrix", "Medium"],
      ["Nth Magical Number", "nth-magical-number", "Hard"],
      ["Median of Two Sorted Arrays", "median-of-two-sorted-arrays", "Hard"]
    ],
    quiz: [
      { q: "Why write mid = l + (r − l) / 2 instead of (l + r) / 2?", o: ["It is faster", "It avoids integer overflow when l + r is large", "It rounds up", "It handles negatives"], a: 1, why: "l + r can exceed the 32-bit range even when l and r fit; r − l cannot." },
      { q: "For the first occurrence of K, what do you do when A[mid] == K?", o: ["Return mid", "ans = mid; l = mid + 1", "ans = mid; r = mid − 1", "r = mid"], a: 2, why: "An earlier copy may exist, so save the answer and keep searching left." },
      { q: "In the unique-element problem (pairs adjacent), mid's pair starts at an even index. Where is the unique element?", o: ["Left of mid", "Right of the pair", "At mid", "Cannot tell"], a: 1, why: "Before the unique element pairs start at even indices, so this pair is still before it: search right." },
      { q: "Does binary search require a sorted array?", o: ["Yes, always", "No, only a rule that safely discards half", "Only for integers", "Only for distinct values"], a: 1, why: "Local minimum, bitonic max and answer-space problems all work on unsorted data." },
      { q: "Aggressive cows: check(D) is true. What next?", o: ["r = mid − 1", "l = mid + 1 (try a bigger gap)", "Return D", "Restart with D = 1"], a: 1, why: "We want the largest feasible minimum gap; feasible means try bigger." },
      { q: "In the median of two sorted arrays, why search over the smaller array?", o: ["Fewer comparisons only", "So c2 = x − c1 always stays within the other array's bounds", "Because the larger one may be unsorted", "To get O(1) space"], a: 1, why: "With the larger array, some c1 values give c2 below 0 or above M." },
      { q: "Rotated array [30,40,50,60,70,80,10,20,25], K = 20, mid holds 70. Where do you go?", o: ["Left", "Right", "Found", "Either"], a: 1, why: "K &lt; A[0] means K is in the lower part; 70 ≥ A[0] means mid is in the upper part, which comes before the lower part." }
    ]
  };

  /* ═════════ MATH ═════════ */
  T["math"] = {
    name: "Math for DSA", icon: "➗", color: "#b45309", minutes: 75,
    summary: "Modular arithmetic, fast power, GCD, counting, primes and modular inverses: the small toolkit behind many \"return the answer mod 1e9+7\" problems.",
    sections: [
      { h: "Modular arithmetic", blocks: [
        ["analogy", "A clock. After 12 comes 1 again. Arithmetic \"mod m\" is arithmetic on a clock with m positions, and the answer always lands in 0..m−1. That is why problems ask for answers mod 1e9+7: the numbers stay small enough for machine integers."],
        ["math", [
          ["Add", "(a + b) % m = (a%m + b%m) % m", "(9+8)%5 = (4+3)%5 = 2"],
          ["Multiply", "(a · b) % m = (a%m · b%m) % m", "(9·8)%5 = (4·3)%5 = 2"],
          ["Subtract", "(a − b) % m = (a%m − b%m + m) % m", "a=10,b=2,m=9: (1−2+9)%9 = 8"],
          ["Power", "a^b % m = (a%m)^b % m", "37^103 % 12 = 1^103 = 1"],
          ["Divide", "NOT (a%m / b%m)", "use the modular inverse"]], "Quick quiz: (37^103 − 1) % 12. Since 37 % 12 = 1, 37^103 % 12 = 1, so the answer is (1 − 1 + 12) % 12 = 0."],
        ["probs", [
          { t: "Sum of array mod 1e9+7", d: "Easy",
            q: "N ≤ 1e5, values up to 1e18. Return the sum mod 1e9+7.",
            ex: "Reduce each element before adding so 64-bit never overflows.",
            ap: [
              { n: "Brute force", cx: "O(N) time · O(1) space",
                idea: "Add everything, then take the mod once at the end. Python's big integers survive, but in C++ / Java the raw sum of 1e5 values up to 1e18 <b>overflows 64 bits</b>.",
                code: "def sum_mod(A):\n    MOD = 10**9 + 7\n    return sum(A) % MOD" },
              { n: "Optimal", cx: "O(N) time · O(1) space",
                idea: "<b>sum = (sum + A[i] % MOD) % MOD</b> at every step. Both terms are below MOD, so their sum always fits in 64 bits.",
                code: "def sum_mod(A):\n    MOD = 10**9 + 7\n    s = 0\n    for x in A:\n        s = (s + x % MOD) % MOD    # both terms < MOD, so no overflow\n    return s" }
            ] },
          { t: "Count pairs with sum divisible by m", d: "Medium",
            q: "Count unordered pairs i ≠ j with (A[i] + A[j]) % m == 0.",
            ex: "A = [4,7,6,5,8,3], m = 3 -> 5: (4,5) (4,8) (7,5) (7,8) (6,3)\nm = 6, A = [2,3,4,8,6,15,5,12,17,7,18,10,9,11,21]\nremainders 2,3,4,2,0,3,5,0,5,1,0,4,3,5,3\nfreq0=3 freq1=1 freq2=2 freq3=4 freq4=2 freq5=3\nAnswer: C(3,2) + 1*3 + 2*2 + C(4,2) = 3+3+4+6 = 16",
            ap: [
              { n: "Brute force", cx: "O(N²) time · O(1) space",
                idea: "Check all pairs. <b>N²/2 pairs</b> is too slow for N = 1e5.",
                code: "def count_pairs(A, m):\n    n = len(A)\n    ans = 0\n    for i in range(n):\n        for j in range(i + 1, n):\n            if (A[i] + A[j]) % m == 0:\n                ans += 1\n    return ans" },
              { n: "Optimal", cx: "O(N + m) time · O(m) space",
                idea: "Only remainders matter. Remainder r pairs with <b>m − r</b>. Remainder 0 pairs with itself, and so does m/2 when m is even: choose 2 inside the group, C(f, 2). For the rest, multiply freq[l] · freq[r] with l from 1 and r from m−1 moving inward.",
                code: "def count_pairs(A, m):\n    freq = [0] * m\n    for x in A:\n        freq[x % m] += 1           # Python's % is never negative\n    ans = freq[0] * (freq[0] - 1) // 2          # 0 pairs with 0\n    if m % 2 == 0:\n        h = m // 2\n        ans += freq[h] * (freq[h] - 1) // 2     # m/2 pairs with m/2\n    l = 1\n    r = m - 1\n    while l < r:\n        ans += freq[l] * freq[r]   # remainder l pairs with m - l\n        l += 1\n        r -= 1\n    return ans" }
            ],
            edge: "m = 1: every pair counts, C(N, 2). Negative values: normalise ((x % m) + m) % m. Use 64-bit counts. (In the worked example, 11 % 6 is 5, and the answer is 16.)",
            lc: "check-if-array-pairs-are-divisible-by-k" },
          { t: "Count subarrays with sum divisible by B", d: "Medium",
            q: "Count subarrays whose sum is divisible by B.",
            ex: "Two prefix sums with the same remainder mod B bound a subarray with sum divisible by B.\nSum-0 variant: [1,-1,2,-2] -> prefix [1,0,2,0], with {0:1} seeded -> 3",
            ap: [
              { n: "Brute force", cx: "O(N²) time · O(1) space",
                idea: "Fix every start, extend the end with a running sum and test it. <b>N²/2 subarrays</b>.",
                code: "def count_div_subarrays(A, B):\n    n = len(A)\n    ans = 0\n    for i in range(n):\n        s = 0\n        for j in range(i, n):\n            s += A[j]\n            if s % B == 0:\n                ans += 1\n    return ans" },
              { n: "Optimal", cx: "O(N) time · O(B) space",
                idea: "sum(i..j) = P[j] − P[i−1], so it is divisible by B exactly when the two prefix sums have the <b>same remainder</b>. Keep a hashmap of prefix % B counts, seeded with count[0] = 1 for the empty prefix. For each prefix p, add count[p % B] to the answer, then increment it.",
                code: "def count_div_subarrays(A, B):\n    cnt = {0: 1}                   # the empty prefix has remainder 0\n    p = 0\n    ans = 0\n    for x in A:\n        p = (p + x) % B            # in C++/Java use ((p % B) + B) % B\n        ans += cnt.get(p, 0)       # earlier prefixes with the same remainder\n        cnt[p] = cnt.get(p, 0) + 1\n    return ans" }
            ],
            edge: "Negative numbers: use ((p % B) + B) % B.",
            lc: "subarray-sums-divisible-by-k" }
        ]]
      ] },
      { h: "Fast power", blocks: [
        ["p", "Computing a^n by multiplying n times is O(n). For n = 1e9 that is too slow. Use <b>a^n = (a^(n/2))²</b>, times one more a when n is odd. The exponent halves each call, so it takes O(log n) multiplications."],
        ["viz", "ss_fastPow", "Down the chain, the exponent halves. On the way back up, square p and multiply by a at odd steps."],
        ["warn", "Overflow trap: <code>(p * p * a) % m</code> overflows even in 64-bit. Write <code>((p * p) % m * (a % m)) % m</code> and store p as 64-bit."],
        ["probs", [
          { t: "Fast power a^n % m", d: "Medium",
            q: "Compute a^n mod m for n up to 1e9.",
            ex: "3^13: 13 -> 6 -> 3 -> 1 -> 0\n2^10 % 1000 = 24",
            ap: [
              { n: "Brute force", cx: "O(n) time · O(1) space",
                idea: "Multiply by a, n times, reducing mod m each step. For n = 1e9 that is <b>a billion multiplications</b>.",
                code: "def power(a, n, m):\n    p = 1 % m\n    for _ in range(n):\n        p = (p * a) % m\n    return p" },
              { n: "Better", cx: "O(log n) time · O(log n) stack",
                idea: "<b>Square and halve.</b> a^n = (a^(n/2))², times one more a when n is odd. p = pow(a, n/2); p = p·p % m; if n is odd, p = p·a % m. The exponent halves each call.",
                code: "def power(a, n, m):\n    if n == 0:\n        return 1 % m\n    p = power(a, n // 2, m)\n    p = (p * p) % m\n    if n % 2 == 1:\n        p = (p * (a % m)) % m      # odd n: one extra factor of a\n    return p" },
              { n: "Optimal", cx: "O(log n) time · O(1) space",
                idea: "Same idea without recursion: <b>walk the bits of n</b>. Keep base = a^(2^k); whenever bit k of n is set, multiply it into the result.",
                code: "def power(a, n, m):\n    result = 1 % m\n    base = a % m\n    while n > 0:\n        if n & 1:\n            result = (result * base) % m   # this bit of n is set\n        base = (base * base) % m           # a^1, a^2, a^4, a^8, ...\n        n >>= 1\n    return result" }
            ],
            edge: "n = 0 returns 1 % m (0 when m = 1). Negative exponent: compute 1 / pow(a, −n) (LeetCode Pow(x, n)).",
            viz: "ss_fastPow", lc: "powx-n" }
        ]]
      ] },
      { h: "GCD and Euclid", blocks: [
        ["p", "gcd(a, b) is the largest number dividing both. Examples: gcd(20,65) = 5, gcd(−10,20) = 10, gcd(7,9) = 1, gcd(0,8) = 8. Properties: gcd(a,b) = gcd(|a|,|b|), gcd(0,a) = |a|, gcd(1,a) = 1, and gcd(a,b,c) = gcd(gcd(a,b), c)."],
        ["p", "<b>Subtraction property:</b> for A &gt; B &gt; 0, gcd(A, B) = gcd(A − B, B), because any common divisor of A and B divides A − B and vice versa. Subtracting B repeatedly is just A % B: gcd(23,5) → gcd(18,5) → … → gcd(3,5). That gives Euclid: <b>gcd(a, b) = gcd(b, a % b)</b>."],
        ["viz", "gcd", "Euclid's algorithm: replace (a, b) with (b, a % b) until b = 0."],
        ["math", [["b &lt; a/2", "a % b &lt; b", "&lt; a/2"], ["b = a/2", "a % b = 0", "&lt; a/2"], ["b &gt; a/2", "a % b = a − b", "&lt; a/2"]], "In every case a % b &lt; a/2, so the larger argument at least halves every two steps: O(log max(a, b)). Trace gcd(65,12) → (12,5) → (5,2) → (2,1) → (1,0) = 1."],
        ["probs", [
          { t: "GCD of an array", d: "Easy",
            q: "Return the GCD of all elements.",
            ex: "{6,12,15}: gcd(6,12) = 6, gcd(6,15) = 3 -> 3",
            ap: [
              { n: "Brute force", cx: "O(N · min(A)) time · O(1) space",
                idea: "Try every candidate d from min(A) down to 1 and return the first that divides all elements. <b>Up to min(A) candidates</b>, each checked against N numbers.",
                code: "def array_gcd(A):\n    for d in range(min(A), 0, -1):\n        if all(x % d == 0 for x in A):\n            return d\n    return 0" },
              { n: "Optimal", cx: "O(N log max) time · O(1) space",
                idea: "GCD is associative: <b>ans = gcd(ans, A[i])</b> across the array, starting from gcd(0, x) = x. Stop early if ans hits 1.",
                code: "def gcd(a, b):\n    while b:\n        a, b = b, a % b            # Euclid\n    return a\n\ndef array_gcd(A):\n    ans = 0\n    for x in A:\n        ans = gcd(ans, x)\n        if ans == 1:\n            break                  # cannot get any smaller\n    return ans" }
            ],
            lc: "find-greatest-common-divisor-of-array" },
          { t: "Delete one element to maximise GCD", d: "Medium",
            q: "Remove exactly one element so the GCD of the rest is as large as possible.",
            ex: "{24,16,18,30,15}\ndeleting each gives 1, 3, 1, 1, 2 -> answer 3 (delete 16)\npg = {24,8,2,2,1}, sg = {1,1,3,15,15}",
            ap: [
              { n: "Brute force", cx: "O(N² log max) time · O(1) space",
                idea: "For each index, recompute the GCD of everything else. <b>N deletions × N elements</b>.",
                code: "from math import gcd\n\ndef max_gcd_after_delete(A):\n    n = len(A)\n    best = 0\n    for skip in range(n):\n        g = 0\n        for i in range(n):\n            if i != skip:\n                g = gcd(g, A[i])\n        best = max(best, g)\n    return best" },
              { n: "Optimal", cx: "O(N log max) time · O(N) space",
                idea: "<b>Prefix and suffix GCD.</b> pg[i] = gcd(A[0..i]), sg[i] = gcd(A[i..N−1]). GCD without index i = gcd(pg[i−1], sg[i+1]). For {24,16,18,30,15}: pg = {24,8,2,2,1}, sg = {1,1,3,15,15}.",
                code: "from math import gcd\n\ndef max_gcd_after_delete(A):\n    n = len(A)\n    if n == 1:\n        return 0\n    pg = A[:]                      # pg[i] = gcd(A[0..i])\n    sg = A[:]                      # sg[i] = gcd(A[i..n-1])\n    for i in range(1, n):\n        pg[i] = gcd(pg[i - 1], A[i])\n    for i in range(n - 2, -1, -1):\n        sg[i] = gcd(sg[i + 1], A[i])\n    ans = max(sg[1], pg[n - 2])    # delete the first or the last element\n    for i in range(1, n - 1):\n        ans = max(ans, gcd(pg[i - 1], sg[i + 1]))\n    return ans" }
            ],
            edge: "Deleting index 0 → sg[1]; index N−1 → pg[N−2]; N = 1 → empty (define as 0)." },
          { t: "PUBG: minimum health of the last player", d: "Medium",
            q: "When i attacks j: if A[i] ≥ A[j], j dies; else A[j] becomes A[j] − A[i]. Find the minimum possible health of the last survivor.",
            ex: "(10, 6) -> outcomes 10, 6, 4, 2 ... minimum 2\n[7,13,16,8] -> 1\n[2,4,6] -> 2",
            ap: [
              { n: "Brute force", cx: "Exponential time · O(N) stack",
                idea: "Simulate every possible attacker / victim choice recursively and keep the smallest final health. The number of attack orders <b>explodes</b> even for a handful of players.",
                code: "def last_health(A):\n    if len(A) == 1:\n        return A[0]\n    best = float('inf')\n    for i in range(len(A)):\n        for j in range(len(A)):\n            if i == j:\n                continue\n            B = A[:]\n            if B[i] >= B[j]:\n                B.pop(j)           # j dies\n            else:\n                B[j] -= B[i]       # j loses A[i] health\n            best = min(best, last_health(B))\n    return best" },
              { n: "Optimal", cx: "O(N log max) time · O(1) space",
                idea: "Every attack is a subtraction, exactly the subtraction form of Euclid: (10, 6) can reach 10, 6, 4, 2. The smallest value you can reach is the <b>GCD of all healths</b>.",
                code: "from math import gcd\n\ndef last_health(A):\n    ans = A[0]\n    for x in A[1:]:\n        ans = gcd(ans, x)\n    return ans" }
            ] }
        ]]
      ] },
      { h: "Counting: permutations and combinations", blocks: [
        ["p", "<b>AND → multiply, OR → add.</b> 3 true/false questions: 2³ = 8 answer sheets. Hyderabad→Mumbai 3 ways and Mumbai→Delhi 4 ways: 12 routes. Pune→Agra via Delhi (3·4) OR via Mumbai (2·3): 12 + 6 = 18. Gift of (pen AND book) OR (flower AND chocolate) OR (ring) with 3, 5, 7, 3, 3 options: 15 + 21 + 3 = 39."],
        ["table", ["", "Order matters?", "Formula", "Example"], [
          ["Permutation", "Yes", "nPr = N! / (N − r)!", "2 of 5 letters: 5·4 = 20"],
          ["Combination", "No", "nCr = N! / ((N − r)! · r!)", "3 of 4 players: 4"],
          ["With repeats", "Yes, some items identical", "N! / (c1! · c2! · …)", "\"aaab\": 4!/3! = 4"]]],
        ["p", "Why nCr = nPr / r!: every selection of r items can be arranged in r! orders, so (selections) · r! = nPr. Key properties: nC0 = nCn = 1, nCr = nC(n−r), and <b>nCr = (n−1)C(r−1) + (n−1)Cr</b> (the n-th item is either chosen or not). That last identity builds Pascal's triangle."],
        ["probs", [
          { t: "Pascal's triangle", d: "Easy",
            q: "Print the first N rows of Pascal's triangle.",
            ex: "1\n1 1\n1 2 1\n1 3 3 1\n1 4 6 4 1\n4C2 = 3C2 + 3C1 = 3 + 3 = 6",
            ap: [
              { n: "Brute force", cx: "O(N³) time with big factorials · O(1) extra",
                idea: "Compute every iCj from factorials. Factorials <b>overflow</b> fixed-width integers almost at once and recompute the same products again and again.",
                code: "from math import factorial\n\ndef pascal(N):\n    T = []\n    for i in range(N):\n        row = []\n        for j in range(i + 1):\n            row.append(factorial(i) // (factorial(j) * factorial(i - j)))\n        T.append(row)\n    return T" },
              { n: "Optimal", cx: "O(N²) time · O(1) extra beyond the output",
                idea: "<b>T[i][j] = T[i−1][j−1] + T[i−1][j]</b> (the i-th item is either chosen or not), with 1 at both ends of every row. Example: 4C2 = 3C2 + 3C1 = 3 + 3 = 6.",
                code: "def pascal(N):\n    T = []\n    for i in range(N):\n        row = [1] * (i + 1)        # both ends are 1\n        for j in range(1, i):\n            row[j] = T[i - 1][j - 1] + T[i - 1][j]\n        T.append(row)\n    return T" }
            ],
            edge: "Values grow fast: apply the modulo if asked. Same table gives nCr % m for any m when n ≤ ~5000.",
            lc: "pascals-triangle" },
          { t: "Excel column title", d: "Easy",
            q: "1 → A, 26 → Z, 27 → AA, 52 → AZ, 53 → BA. Given N, return the title.",
            ex: "30 -> AD, 50 -> AX, 100 -> CV, 52 -> AZ\n52: 52 % 26 = 0 -> Z, quotient 2 - 1 = 1 -> A",
            ap: [
              { n: "Solution", cx: "O(log₂₆ N) time · O(log₂₆ N) space",
                idea: "Counting up from A one title at a time would be O(N). Instead treat it as base 26 where digits run <b>1..26</b> instead of 0..25. Take rem = N % 26. If rem is 0, the digit is Z and you <b>borrow</b>: N = N/26 − 1. Build the string backwards. 52: 52 % 26 = 0 → Z, quotient 2 − 1 = 1 → A, so AZ.",
                code: "def convert_to_title(N):\n    s = []\n    while N > 0:\n        rem = N % 26\n        N //= 26\n        if rem == 0:\n            rem = 26               # digit Z: borrow one from the next place\n            N -= 1\n        s.append(chr(ord('A') + rem - 1))\n    return \"\".join(reversed(s))" }
            ],
            lc: "excel-sheet-column-title" },
          { t: "Rank of a string among its permutations", d: "Hard",
            q: "Return the 1-based rank of a string among all its distinct permutations in sorted order (letters may repeat).",
            ex: "\"baaa\": placing 'a' first leaves {2a,1b}: 3!/(2!1!) = 3 -> rank 4\n\"babaa\": pos 0 'b' -> 4!/(2!2!) = 6; pos 2 'b' -> 2!/(1!1!) = 2; total 8 -> rank 9\nMISSISSIPPI has 11!/(1!4!4!2!) arrangements",
            ap: [
              { n: "Brute force", cx: "O(L! · L) time · O(L! · L) space",
                idea: "Generate every distinct permutation, sort them and find the input. <b>L! permutations</b>: impossible beyond about 10 letters.",
                code: "from itertools import permutations\n\ndef rank(s):\n    perms = sorted(set(permutations(s)))\n    return perms.index(tuple(s)) + 1" },
              { n: "Optimal", cx: "O(L · alphabet²) time · O(alphabet) space",
                idea: "Go left to right. At each position, for every <b>smaller letter still available</b>, count the arrangements of the remaining letters if it were placed here: rem! / Π(count!). Add them up, consume the current letter, and return sum + 1. \"babaa\": pos 0 'b' gives 4!/(2!2!) = 6, pos 2 'b' gives 2!/(1!1!) = 2, so rank 9. For a modulus, use precomputed factorials and inverse factorials mod p.",
                code: "from math import factorial\n\ndef rank(s):\n    cnt = {}\n    for ch in s:\n        cnt[ch] = cnt.get(ch, 0) + 1\n    ans = 0\n    L = len(s)\n    for i, ch in enumerate(s):\n        rem = L - i - 1                    # letters left after position i\n        for c in sorted(cnt):\n            if c >= ch:\n                break\n            if cnt[c] == 0:\n                continue\n            cnt[c] -= 1                    # pretend c is placed here\n            ways = factorial(rem)\n            for v in cnt.values():\n                ways //= factorial(v)      # divide out repeated letters\n            ans += ways\n            cnt[c] += 1\n        cnt[ch] -= 1                       # consume the real letter\n    return ans + 1" }
            ],
            edge: "All identical letters → rank 1. p must be prime and larger than L for the inverses to exist." }
        ]]
      ] },
      { h: "Primes, sieves and factors", blocks: [
        ["p", "A prime has exactly two factors. Factors come in pairs (i, N/i), so you only need to try i up to √N."],
        ["probs", [
          { t: "Is N prime?", d: "Easy",
            q: "Check whether N is prime.",
            ex: "2, 3, 5, 11, 23 are prime; 1 is not",
            ap: [
              { n: "Brute force", cx: "O(N) time · O(1) space",
                idea: "Count divisors by trying every i from 1 to N. For N = 1e12 that is <b>far too many</b> divisions.",
                code: "def is_prime(N):\n    cnt = 0\n    for i in range(1, N + 1):\n        if N % i == 0:\n            cnt += 1\n    return cnt == 2" },
              { n: "Optimal", cx: "O(√N) time · O(1) space",
                idea: "Factors come in pairs (i, N/i), so loop only while <b>i·i ≤ N</b>. Count 2 per pair (1 if i == N/i). Prime iff the count is 2.",
                code: "def is_prime(N):\n    cnt = 0\n    i = 1\n    while i * i <= N:\n        if N % i == 0:\n            if i == N // i:\n                cnt += 1           # perfect square: one factor, not two\n            else:\n                cnt += 2           # i and N // i\n        i += 1\n    return cnt == 2" }
            ] },
          { t: "All primes up to N (Sieve of Eratosthenes)", d: "Medium",
            q: "List every prime from 1 to N (N ≤ 1e6).",
            ex: "N = 10 -> 2, 3, 5, 7\nN = 26: 2 crosses 4..26; 3 crosses from 9; 5 starts at 25; 7 would start at 49 > 26\nprimes: 2 3 5 7 11 13 17 19 23",
            ap: [
              { n: "Brute force", cx: "O(N√N) time · O(1) extra",
                idea: "Run the √N primality test on every number. Each test repeats work the others already did: <b>N tests × √N</b>.",
                code: "def primes_upto(N):\n    out = []\n    for x in range(2, N + 1):\n        if is_prime(x):            # the O(sqrt x) test from above\n            out.append(x)\n    return out" },
              { n: "Optimal", cx: "O(N log log N) time · O(N) space",
                idea: "Mark everything prime. For each prime i with i·i ≤ N, cross out i·i, i·i + i, …. <b>Start at i²</b>: smaller multiples have a smaller prime factor and were already crossed. The outer loop stops at √N.",
                code: "def primes_upto(N):\n    isP = [True] * (N + 1)\n    isP[0] = False\n    isP[1] = False\n    i = 2\n    while i * i <= N:\n        if isP[i]:\n            for j in range(i * i, N + 1, i):\n                isP[j] = False     # j has the prime factor i\n        i += 1\n    return [x for x in range(N + 1) if isP[x]]" }
            ],
            viz: "sieve", lc: "count-primes" },
          { t: "Number of factors for every 1..N", d: "Medium",
            q: "Return the factor count of every number from 1 to N.",
            ex: "N = 10: 1,2,2,3,2,4,2,4,3,4\nN = 18: 12 -> 6, 16 -> 5, 18 -> 6",
            ap: [
              { n: "Brute force", cx: "O(N√N) time · O(N) space",
                idea: "Count the factors of each number separately in O(√i). <b>N separate counts</b>.",
                code: "def factor_counts(N):\n    cf = [0] * (N + 1)\n    for x in range(1, N + 1):\n        i = 1\n        while i * i <= x:\n            if x % i == 0:\n                cf[x] += 1 if i * i == x else 2\n            i += 1\n    return cf" },
              { n: "Optimal", cx: "O(N log N) time · O(N) space",
                idea: "Flip the loop: every i is a factor of i, 2i, 3i, …. For each i, <b>add 1 to every multiple</b>. Work = N/1 + N/2 + … + N/N = N · H(N) ≈ N ln N.",
                code: "def factor_counts(N):\n    cf = [0] * (N + 1)\n    for i in range(1, N + 1):\n        for j in range(i, N + 1, i):\n            cf[j] += 1             # i divides j\n    return cf" }
            ] },
          { t: "Smallest prime factor for 2..N", d: "Medium",
            q: "For every number from 2 to N, find its smallest prime factor.",
            ex: "N = 10: 2->2 3->3 4->2 5->5 6->2 7->7 8->2 9->3 10->2\n25->5, 27->3, 29->29",
            ap: [
              { n: "Brute force", cx: "O(N√N) time · O(N) space",
                idea: "Trial-divide each number from 2 upward; the first divisor found is the smallest prime factor. <b>√N work per number</b>.",
                code: "def spf_table(N):\n    spf = list(range(N + 1))\n    for x in range(2, N + 1):\n        i = 2\n        while i * i <= x:\n            if x % i == 0:\n                spf[x] = i         # first divisor found is prime\n                break\n            i += 1\n    return spf" },
              { n: "Optimal", cx: "O(N log log N) time · O(N) space",
                idea: "A sieve that writes a label instead of a cross. spf[i] = i initially. For each prime i, for j from i² step i, set spf[j] = i <b>only if it is still unset</b>. Primes are processed in increasing order, so the first one to reach j is the smallest.",
                code: "def spf_table(N):\n    spf = list(range(N + 1))       # every number is its own spf at first\n    i = 2\n    while i * i <= N:\n        if spf[i] == i:            # i is prime\n            for j in range(i * i, N + 1, i):\n                if spf[j] == j:\n                    spf[j] = i     # first (smallest) prime to reach j\n        i += 1\n    return spf" }
            ],
            viz: "ss_spfSieve" },
          { t: "Prime factorisation and divisor count with SPF", d: "Medium",
            q: "Answer many queries: factorise x and count its divisors.",
            ex: "48 -> 2,2,2,2,3\n300 = 2^2 * 3 * 5^2 -> (2+1)(1+1)(2+1) = 18 divisors\n45 = 3^2 * 5 -> 6 divisors\n1200 = 2^4 * 3 * 5^2 -> 5*2*3 = 30",
            ap: [
              { n: "Brute force", cx: "O(√x) per query · O(1) space",
                idea: "Trial division for every query. With 1e5 queries on values up to 1e6 that is about <b>1e8 divisions</b>.",
                code: "def count_divisors(x):\n    ans = 1\n    p = 2\n    while p * p <= x:\n        c = 0\n        while x % p == 0:\n            x //= p\n            c += 1\n        ans *= c + 1\n        p += 1\n    if x > 1:\n        ans *= 2                   # one prime factor is left over\n    return ans" },
              { n: "Optimal", cx: "O(N log log N) precompute · O(log x) per query · O(N) space",
                idea: "Repeatedly output spf[x] and divide: each step at least halves x, so <b>O(log x) per query</b>. If x = p1^a · p2^b · …, the divisor count is <b>(a+1)(b+1)…</b> because each divisor picks an exponent 0..a for p1, 0..b for p2, and so on. 300 = 2²·3·5² has 3·2·3 = 18.",
                code: "def count_divisors(x, spf):\n    # spf comes from the SPF sieve above\n    ans = 1\n    while x > 1:\n        p = spf[x]\n        c = 0\n        while x % p == 0:\n            x //= p\n            c += 1                 # exponent of p\n        ans *= c + 1\n    return ans" }
            ],
            viz: "ss_spfSieve", lc: "four-divisors" },
          { t: "Trailing zeroes in N!", d: "Medium",
            q: "Count the trailing zeroes of N!.",
            ex: "5! = 120 -> 1; 10! = 3628800 -> 2\n30! -> 30/5 + 30/25 = 6 + 1 = 7\n100! -> 20 + 4 = 24\n300! -> 60 + 12 + 2 = 74",
            ap: [
              { n: "Brute force", cx: "O(N² digits) time · O(N log N) bits space",
                idea: "Compute N! exactly and count zeros at the end. N! has <b>thousands of digits</b> for N in the thousands, and overflows any fixed-width integer at N = 21.",
                code: "def trailing_zeroes(N):\n    f = 1\n    for i in range(2, N + 1):\n        f *= i\n    count = 0\n    while f % 10 == 0:\n        f //= 10\n        count += 1\n    return count" },
              { n: "Optimal", cx: "O(log₅ N) time · O(1) space",
                idea: "Each zero is a 10 = 2 · 5, and there are always more 2s than 5s (10! has eight 2s, two 5s). So count factors of 5: <b>N/5 + N/25 + N/125 + …</b> (multiples of 25 contribute an extra 5, and so on). 100! → 20 + 4 = 24.",
                code: "def trailing_zeroes(N):\n    count = 0\n    i = 5\n    while i <= N:\n        count += N // i            # multiples of 5, 25, 125, ...\n        i *= 5\n    return count" }
            ],
            edge: "Use 64-bit for the power of 5 so i *= 5 does not overflow.",
            lc: "factorial-trailing-zeroes" }
        ]],
        ["viz", "sieve", "Sieve of Eratosthenes: crossing starts at i² for each prime i."],
        ["viz", "ss_spfSieve", "SPF sieve: cells already labelled by a smaller prime keep it. Then factorise x in O(log x)."],
        ["extra", "Why N log log N: the sieve does N/2 + N/3 + N/5 + N/7 + … work, and the sum of 1/p over primes grows like log log N (smaller than the harmonic sum's log N). For N = 2³², log log N is only 5."]
      ] },
      { h: "Modular inverse, Fermat and nCr % p", blocks: [
        ["p", "You cannot divide inside a modulo. Instead multiply by the <b>inverse</b>: b is the inverse of a mod m if (a · b) % m = 1. Examples: 7⁻¹ % 10 = 3 (7·3 = 21), 3⁻¹ % 10 = 7, 7⁻¹ % 9 = 4 (7·4 = 28). 6⁻¹ % 10 does not exist: 6k % 10 cycles 6, 2, 8, 4, 0."],
        ["tip", "The inverse of x mod m exists <b>iff gcd(x, m) = 1</b>. For prime m, <b>Fermat's little theorem</b> says a^(m−1) % m = 1, so a^(m−2) % m is the inverse. Example: 7⁻¹ % 11 = 7⁹ % 11 = 8 (check: 7·8 = 56 = 5·11 + 1)."],
        ["math", [["(a / b) % p", "(a%p · b⁻¹%p) % p", "p prime"], ["b⁻¹ % p", "b^(p−2) % p", "fast power, O(log p)"]], "So (a / b) % p = (a % p · fastPow(b, p − 2, p)) % p when p is prime and does not divide b."],
        ["probs", [
          { t: "nCr % p (p prime, r ≤ n &lt; p)", d: "Medium",
            q: "Compute nCr modulo a prime p.",
            ex: "nCr = n! / ((n-r)! r!)\n= n! % p * inv((n-r)!) * inv(r!) % p",
            ap: [
              { n: "Brute force", cx: "O(n) big-number multiplications · huge intermediate values",
                idea: "Compute the factorials exactly, divide, then take mod p. In fixed-width languages the factorials <b>overflow almost immediately</b>; in Python they become enormous.",
                code: "from math import factorial\n\ndef nCr_mod(n, r, p):\n    return factorial(n) // (factorial(r) * factorial(n - r)) % p" },
              { n: "Better", cx: "O(n·r) time · O(r) space",
                idea: "Pascal's rule <b>C(i, j) = C(i−1, j−1) + C(i−1, j)</b> needs only additions, so it works for any modulus (prime or not). Too slow once n is around 1e5.",
                code: "def nCr_mod(n, r, p):\n    row = [0] * (r + 1)\n    row[0] = 1\n    for i in range(1, n + 1):\n        for j in range(min(i, r), 0, -1):  # right to left reuses one row\n            row[j] = (row[j] + row[j - 1]) % p\n    return row[r]" },
              { n: "Optimal", cx: "O(n + log p) time · O(n) space (O(1) per query after precompute)",
                idea: "Compute factorials mod p, then multiply by the <b>Fermat inverses</b> of (n−r)! and r! (x⁻¹ = x^(p−2) mod p). The inverses exist because p &gt; n, so p divides none of 1..n. For many queries precompute fact[] and invFact[].",
                code: "def nCr_mod(n, r, p):\n    f = [1] * (n + 1)\n    for i in range(1, n + 1):\n        f[i] = f[i - 1] * i % p\n    inv_r = pow(f[r], p - 2, p)            # Fermat inverse of r!\n    inv_nr = pow(f[n - r], p - 2, p)       # Fermat inverse of (n - r)!\n    return f[n] * inv_r % p * inv_nr % p" }
            ],
            edge: "If n ≥ p the simple method fails (use Lucas' theorem). For a non-prime modulus use Pascal's triangle.",
            lc: "unique-paths" },
          { t: "Very large power a^(b!) % m (m prime)", d: "Hard",
            q: "Compute a^(b!) mod m with a, b ≤ 5e5.",
            ex: "2^(5!) % 17: 120 = 16*7 + 8, so 2^120 % 17 = 2^8 % 17 = 256 % 17 = 1",
            ap: [
              { n: "Brute force", cx: "Astronomical: b! has millions of digits",
                idea: "Compute b! exactly, then fast-power a to it. For b = 5e5 the exponent alone has about <b>2.6 million digits</b>.",
                code: "from math import factorial\n\ndef big_power(a, b, m):\n    return pow(a, factorial(b), m)" },
              { n: "Optimal", cx: "O(b + log m) time · O(1) space",
                idea: "By Fermat, a^(m−1) % m = 1, so the exponent can be <b>reduced mod (m − 1)</b>: a^(b!) % m = a^(b! % (m−1)) % m. Compute K = b! % (m−1) in a loop, then fastPow(a, K, m). 2^(5!) % 17: 120 % 16 = 8, so 2^8 % 17 = 1.",
                code: "def big_power(a, b, m):\n    if a % m == 0:\n        return 0                   # Fermat needs gcd(a, m) = 1\n    K = 1\n    for i in range(1, b + 1):\n        K = K * i % (m - 1)        # b! reduced mod (m - 1)\n    return pow(a, K, m)" }
            ],
            edge: "If a % m == 0 the answer is 0 (Fermat needs gcd(a, m) = 1).",
            lc: "super-pow" }
        ]]
      ] },
      { h: "Interview cheatsheet", blocks: [
        ["table", ["Tool", "Use it for", "Cost"], [
          ["(a ± b), (a · b) mod m", "Keep numbers bounded; add m before % after subtraction", "O(1)"],
          ["Fast power", "a^n mod m, Fermat inverse", "O(log n)"],
          ["Euclid GCD", "GCD / LCM, PUBG, fractions, delete-one with prefix/suffix", "O(log max)"],
          ["Remainder buckets", "Pairs or subarrays divisible by m", "O(N + m)"],
          ["Pascal's triangle", "nCr for small n, any modulus", "O(n²)"],
          ["Factorials + Fermat", "nCr % p for large n, p prime", "O(n) precompute"],
          ["Sieve / SPF sieve", "All primes, many factorisations, divisor counts", "O(N log log N)"],
          ["Count 5s", "Trailing zeroes of N!", "O(log N)"]]],
        ["list", [
          "1e9+7 is prime, so Fermat inverses work for it. Two values below it multiplied fit in 64-bit (about 1e18).",
          "In Java and C++, % of a negative number is negative. Normalise with ((x % m) + m) % m.",
          "lcm(a, b) = a / gcd(a, b) · b (divide first to avoid overflow).",
          "Only check divisors up to √N; each divisor i pairs with N / i.",
          "An inverse mod m exists only when gcd(x, m) = 1."]]
      ] }
    ],
    lc: [
      ["Pow(x, n)", "powx-n", "Medium"],
      ["Factorial Trailing Zeroes", "factorial-trailing-zeroes", "Medium"],
      ["Palindrome Number", "palindrome-number", "Easy"],
      ["Plus One", "plus-one", "Easy"],
      ["Max Points on a Line", "max-points-on-a-line", "Hard"],
      ["Count Primes", "count-primes", "Medium"],
      ["Excel Sheet Column Title", "excel-sheet-column-title", "Easy"],
      ["Excel Sheet Column Number", "excel-sheet-column-number", "Easy"],
      ["Pascal's Triangle", "pascals-triangle", "Easy"],
      ["Pascal's Triangle II", "pascals-triangle-ii", "Easy"],
      ["Find Greatest Common Divisor of Array", "find-greatest-common-divisor-of-array", "Easy"],
      ["Check If Array Pairs Are Divisible by k", "check-if-array-pairs-are-divisible-by-k", "Medium"],
      ["Subarray Sums Divisible by K", "subarray-sums-divisible-by-k", "Medium"],
      ["Super Pow", "super-pow", "Medium"],
      ["Unique Paths", "unique-paths", "Medium"],
      ["Four Divisors", "four-divisors", "Medium"],
      ["Closest Prime Numbers in Range", "closest-prime-numbers-in-range", "Medium"],
      ["Ugly Number", "ugly-number", "Easy"]
    ],
    quiz: [
      { q: "What is (a − b) % m written safely?", o: ["(a%m − b%m) % m", "(a%m − b%m + m) % m", "(a − b + 1) % m", "|a − b| % m"], a: 1, why: "a%m − b%m can be negative; adding m first keeps the result in 0..m−1." },
      { q: "A = [4,7,6,5,8,3], m = 3. How many pairs have a sum divisible by 3?", o: ["4", "5", "6", "15"], a: 1, why: "Remainders 1,1,0,2,2,0: C(2,2) = 1 pair of zeros plus 2·2 = 4 pairs of (1,2) gives 5." },
      { q: "Why does Euclid's algorithm take O(log max(a, b)) steps?", o: ["a % b is always 1", "a % b < a/2, so the larger number halves at least every two steps", "It divides by 2 each step", "It does not; it is O(√a)"], a: 1, why: "All three cases (b < a/2, b = a/2, b > a/2) give a % b < a/2." },
      { q: "Why does the sieve start crossing out multiples of i at i·i?", o: ["Smaller multiples have a smaller prime factor and are already crossed", "i·i is always prime", "To save memory", "It is a convention only"], a: 0, why: "k·i with k < i has a prime factor ≤ k < i, which crossed it out earlier." },
      { q: "How many trailing zeroes does 100! have?", o: ["20", "24", "25", "10"], a: 1, why: "100/5 + 100/25 = 20 + 4 = 24; the 2s are never the bottleneck." },
      { q: "When does the inverse of x modulo m exist?", o: ["Always", "When m is even", "When gcd(x, m) = 1", "When x < m"], a: 2, why: "6⁻¹ mod 10 does not exist because gcd(6, 10) = 2. For prime m, use Fermat: x^(m−2)." },
      { q: "300 = 2² · 3 · 5². How many divisors does it have?", o: ["12", "18", "30", "8"], a: 1, why: "(2+1)(1+1)(2+1) = 18: each divisor picks an exponent for each prime." },
      { q: "Excel column 52 is…", o: ["BZ", "AZ", "BA", "AY"], a: 1, why: "52 % 26 = 0 means the digit is Z and we borrow: 52/26 − 1 = 1 → A. So AZ." }
    ]
  };
})();

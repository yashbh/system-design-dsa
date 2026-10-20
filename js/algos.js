/* Blueprint — algorithm library for the DSA visualiser (see algoviz.js for the frame format).
 * Highlight classes: act (current), cmp (comparing), swap, done, found, dim, bad, win.
 */
(function () {
  const { nums, clone, cap } = BP.AV;
  const A = BP.ALGOS;
  const F = (line, note, panels) => ({ line, note, panels: clone(panels) });
  const arr = (vals, o = {}) => ({ t: "array", vals, ...o });
  const vars = (v) => ({ t: "vars", vars: v });
  const chips = (label, items, vertical) => ({ t: "chips", label, items, vertical });
  const split2 = (s) => String(s).split("|").map((x) => x.trim());

  /* ═════════ ARRAYS ═════════ */
  A.prefixSum = { title: "Prefix sum + range query", inputLabel: "array | l r", input: "-3 6 2 4 5 2 8 -9 3 1 | 4 8",
    about: "Top row is the input <b>a</b>, bottom row is the prefix array <b>ps</b> where ps[i] = a[0] + … + a[i]. Watch each ps cell reuse the one before it; at the end one subtraction answers the range query.",
    code: ["ps = [0] * n","ps[0] = a[0]","for i in range(1, n):","    ps[i] = ps[i - 1] + a[i]","","# sum of a[l..r] in O(1)","if l > 0:","    ans = ps[r] - ps[l - 1]","else:","    ans = ps[r]"],
    gen(s) {
      const [a0, q] = split2(s); const a = cap(nums(a0), 14); let [l, r] = nums(q || "0 " + (a.length - 1)); l = Math.max(0, Math.min(l, a.length - 1)); r = Math.max(l, Math.min(r, a.length - 1));
      const ps = a.map(() => null), fr = [];
      ps[0] = a[0]; fr.push(F(1, `ps[0] = a[0] = <b>${a[0]}</b>`, [arr(a, { label: "a", hl: { 0: "act" } }), arr(ps, { label: "ps", hl: { 0: "done" } })]));
      for (let i = 1; i < a.length; i++) { ps[i] = ps[i - 1] + a[i]; fr.push(F(3, `ps[${i}] = ps[${i - 1}] + a[${i}] = ${ps[i - 1]} + ${a[i]} = <b>${ps[i]}</b>`, [arr(a, { label: "a", hl: { [i]: "act" } }), arr(ps, { label: "ps", hl: { [i - 1]: "cmp", [i]: "done" } })])); }
      const ans = ps[r] - (l > 0 ? ps[l - 1] : 0);
      fr.push(F(l > 0 ? 7 : 9, `Query sum(${l}..${r}) = ps[${r}] − ${l > 0 ? `ps[${l - 1}]` : "0"} = ${ps[r]} − ${l > 0 ? ps[l - 1] : 0} = <b>${ans}</b>. One subtraction instead of a loop: O(N + Q) total instead of O(N·Q).`, [arr(a, { label: "a", win: [l, r] }), arr(ps, { label: "ps", hl: { [r]: "found", [l - 1]: "cmp" } })]));
      return fr;
    } };

  A.kadane = { title: "Kadane's algorithm: maximum subarray sum", inputLabel: "array", input: "-2 1 -3 4 -1 2 1 -5 4",
    about: "The green window is the subarray currently being extended (<b>cur</b> is its sum). At each element we either extend it or restart from that element; <b>best</b> remembers the best window seen.",
    code: ["cur = 0","best = float('-inf')","for x in a:","    cur = max(x, cur + x)   # extend or restart","    best = max(best, cur)","return best"],
    gen(s) {
      const a = cap(nums(s), 16), fr = []; let cur = 0, best = -Infinity, start = 0, bs = 0, be = 0;
      fr.push(F(0, "Track the best sum of a subarray <i>ending here</i> (cur) and the best seen so far.", [arr(a), vars({ cur: 0, best: "−∞" })]));
      a.forEach((x, i) => {
        const ext = cur + x, restart = x > ext; if (restart) start = i; cur = Math.max(x, ext);
        fr.push(F(3, restart ? `a[${i}] = ${x} on its own beats extending (cur + x = ${ext}). <b>Restart</b> the subarray at index ${i}: cur = ${cur}.` : `Extend: cur + a[${i}] = ${ext} is at least a[${i}] = ${x}, so keep growing the subarray. cur = <b>${cur}</b>.`, [arr(a, { win: [start, i], hl: { [i]: "act" } }), vars({ cur, best: best === -Infinity ? "−∞" : best })]));
        if (cur > best) { best = cur; bs = start; be = i; }
        fr.push(F(4, `best = max(best, cur) = <b>${best}</b>, from subarray ${bs}..${be}.`, [arr(a, { win: [start, i], hl: Object.fromEntries(Array.from({ length: be - bs + 1 }, (_, k) => [bs + k, "found"])) }), vars({ cur, best })]));
      });
      fr.push(F(5, `Answer: <b>${best}</b>, from indices ${bs}..${be}. One pass, O(N) time, O(1) space.`, [arr(a, { win: [bs, be] }), vars({ best })]));
      return fr;
    } };

  A.twoPointer = { title: "Two pointers: pair with target sum (sorted array)", inputLabel: "sorted array | target", input: "1 2 4 6 8 9 14 15 | 13",
    about: "Arrows <b>l</b> and <b>r</b> start at both ends of the sorted array. Each step compares their sum with the target and moves exactly one pointer inward, so every pair that could work is still reachable.",
    code: ["l = 0","r = n - 1","while l < r:","    s = a[l] + a[r]","    if s == target:","        return (l, r)","    if s < target:","        l += 1      # need a bigger sum","    else:","        r -= 1      # need a smaller sum","return None"],
    gen(s) {
      const [a0, t0] = split2(s); const a = cap(nums(a0).sort((x, y) => x - y), 16), t = nums(t0)[0] ?? 0, fr = []; let l = 0, r = a.length - 1;
      fr.push(F(1, `Start at both ends: l = 0, r = ${r}. The array is sorted, so moving l raises the sum and moving r lowers it.`, [arr(a, { ptr: { l, r } }), vars({ target: t })]));
      while (l < r) {
        const sum = a[l] + a[r];
        fr.push(F(3, `a[${l}] + a[${r}] = ${a[l]} + ${a[r]} = <b>${sum}</b>`, [arr(a, { ptr: { l, r }, hl: { [l]: "cmp", [r]: "cmp" } }), vars({ target: t, sum })]));
        if (sum === t) { fr.push(F(5, `Found: indices ${l} and ${r}. O(N) instead of checking all O(N²) pairs.`, [arr(a, { ptr: { l, r }, hl: { [l]: "found", [r]: "found" } }), vars({ target: t, sum })])); return fr; }
        if (sum < t) { l++; fr.push(F(7, `${sum} < ${t}: the only way to grow the sum is to move <b>l</b> right.`, [arr(a, { ptr: { l, r } }), vars({ target: t })])); }
        else { r--; fr.push(F(9, `${sum} > ${t}: move <b>r</b> left to shrink the sum.`, [arr(a, { ptr: { l, r } }), vars({ target: t })])); }
      }
      fr.push(F(10, "Pointers met: no pair adds up to the target.", [arr(a), vars({ target: t })]));
      return fr;
    } };

  A.windowFixed = { title: "Sliding window (fixed size k): max sum", inputLabel: "array | k", input: "2 1 5 1 3 2 9 4 | 3",
    about: "The highlighted window always holds exactly k elements. Sliding it one step adds the new element on the right and drops the one that fell off the left, so each step costs O(1).",
    code: ["s = sum(a[:k])","best = s","for i in range(k, n):","    s += a[i] - a[i - k]   # add new, drop old","    best = max(best, s)","return best"],
    gen(x) {
      const [a0, k0] = split2(x); const a = cap(nums(a0), 16), k = Math.max(1, Math.min(nums(k0)[0] || 3, a.length)), fr = [];
      let s = a.slice(0, k).reduce((p, q) => p + q, 0), best = s, bi = 0;
      fr.push(F(1, `First window 0..${k - 1}: sum = <b>${s}</b>`, [arr(a, { win: [0, k - 1] }), vars({ sum: s, best })]));
      for (let i = k; i < a.length; i++) {
        s += a[i] - a[i - k];
        fr.push(F(3, `Slide: +a[${i}] (${a[i]}) −a[${i - k}] (${a[i - k]}) → sum = <b>${s}</b>. O(1) per step, not O(k).`, [arr(a, { win: [i - k + 1, i], hl: { [i]: "act", [i - k]: "dim" } }), vars({ sum: s, best })]));
        if (s > best) { best = s; bi = i - k + 1; }
        fr.push(F(4, `best = max(best, sum) = <b>${best}</b>`, [arr(a, { win: [i - k + 1, i] }), vars({ sum: s, best })]));
      }
      fr.push(F(5, `Max window sum = <b>${best}</b> at ${bi}..${bi + k - 1}. O(N) total.`, [arr(a, { win: [bi, bi + k - 1] }), vars({ best })]));
      return fr;
    } };

  A.windowVariable = { title: "Sliding window (variable): longest substring without repeats", inputLabel: "string", input: "abcabcbb",
    about: "The window between <b>l</b> and <b>r</b> never contains a repeated character. <b>r</b> grows it one step at a time; when the new character is already inside, <b>l</b> moves right until the duplicate is gone. The chips show the characters in the window.",
    code: ["seen = set()","l = 0","best = 0","for r in range(n):","    while s[r] in seen:","        seen.remove(s[l])   # shrink from the left","        l += 1","    seen.add(s[r])","    best = max(best, r - l + 1)","return best"],
    gen(str) {
      const s = cap([...String(str).trim()], 18, "characters"), fr = [], seen = new Set(); let l = 0, best = 0, bl = 0;
      for (let r = 0; r < s.length; r++) {
        fr.push(F(3, `r = ${r}: try to add '${s[r]}' to the window.`, [arr(s, { win: [l, r - 1], ptr: { l, r }, hl: { [r]: "act" } }), chips("window set", [...seen])]));
        while (seen.has(s[r])) { seen.delete(s[l]); fr.push(F(5, `'${s[r]}' is already in the window, so drop '${s[l]}' and move l.`, [arr(s, { win: [l + 1, r - 1], ptr: { l: l + 1, r }, hl: { [l]: "dim", [r]: "bad" } }), chips("window set", [...seen])])); l++; }
        seen.add(s[r]);
        if (r - l + 1 > best) { best = r - l + 1; bl = l; }
        fr.push(F(8, `Window "${s.slice(l, r + 1).join("")}" has length ${r - l + 1}. best = <b>${best}</b>`, [arr(s, { win: [l, r], ptr: { l, r } }), chips("window set", [...seen])]));
      }
      fr.push(F(9, `Longest: "<b>${s.slice(bl, bl + best).join("")}</b>" (length ${best}). Each character enters and leaves once, so O(N).`, [arr(s, { win: [bl, bl + best - 1] })]));
      return fr;
    } };

  A.spiral = { title: "Spiral traversal of a matrix", inputLabel: "rows × cols", input: "4 5",
    about: "Four boundaries (top, bottom, left, right) close in on the matrix. Each lap walks the top row, right column, bottom row and left column, then shrinks that boundary; the output chips show the order of visits.",
    code: ["top, bottom, left, right = 0, R - 1, 0, C - 1","while top <= bottom and left <= right:","    for c in range(left, right + 1):","        out.append(g[top][c])       # top row, left to right","    top += 1","    for r in range(top, bottom + 1):","        out.append(g[r][right])     # right column, downwards","    right -= 1","    if top <= bottom:","        for c in range(right, left - 1, -1):","            out.append(g[bottom][c])   # bottom row, right to left","        bottom -= 1","    if left <= right:","        for r in range(bottom, top - 1, -1):","            out.append(g[r][left])     # left column, upwards","        left += 1"],
    gen(s) {
      let [R0, C0] = nums(s); const Rn = Math.max(1, Math.min(R0 || 4, 7)), Cn = Math.max(1, Math.min(C0 || 5, 8));
      const g = Array.from({ length: Rn }, (_, r) => Array.from({ length: Cn }, (_, c) => r * Cn + c + 1)), out = [], vis = {}, fr = [];
      let t = 0, b = Rn - 1, l = 0, r = Cn - 1;
      const push = (rr, cc, line, dir) => { vis[rr + "," + cc] = "done"; out.push(g[rr][cc]); fr.push(F(line, `${dir}: visit ${g[rr][cc]} at (${rr}, ${cc}).`, [{ t: "grid", rows: g, hl: { ...vis, [rr + "," + cc]: "act" } }, chips("output", out.slice())])); };
      const shrink = (line, msg) => fr.push(F(line, msg, [{ t: "grid", rows: g, hl: { ...vis } }, chips("output", out.slice())]));
      while (t <= b && l <= r) {
        for (let c = l; c <= r; c++) push(t, c, 3, `Top row ${t}, left to right`); t++; shrink(4, `Top row done: top = ${t}.`);
        for (let rr = t; rr <= b; rr++) push(rr, r, 6, `Right column ${r}, downwards`); r--; shrink(7, `Right column done: right = ${r}.`);
        if (t <= b) { for (let c = r; c >= l; c--) push(b, c, 10, `Bottom row ${b}, right to left`); b--; shrink(11, `Bottom row done: bottom = ${b}.`); }
        if (l <= r) { for (let rr = b; rr >= t; rr--) push(rr, l, 14, `Left column ${l}, upwards`); l++; shrink(15, `Left column done: left = ${l}. Next lap starts if top ≤ bottom and left ≤ right.`); }
      }
      fr.push(F(-1, "Every cell visited exactly once: O(R·C).", [{ t: "grid", rows: g, hl: vis }, chips("output", out)]));
      return fr;
    } };

  /* ═════════ SORTING ═════════ */
  A.bubbleSort = { title: "Bubble sort", inputLabel: "array", input: "5 1 4 2 8 3",
    about: "Bars are the array values. Each pass compares neighbours left to right and swaps any pair in the wrong order, so the largest remaining bar bubbles to the end and turns final (done).",
    code: ["for i in range(n - 1):","    for j in range(n - 1 - i):","        if a[j] > a[j + 1]:","            a[j], a[j + 1] = a[j + 1], a[j]","    # the largest remaining value is now at the end"],
    gen(s) { const a = cap(nums(s), 12), n = a.length, fr = [], done = {};
      for (let i = 0; i < n - 1; i++) { for (let j = 0; j < n - 1 - i; j++) {
        fr.push(F(2, `Pass ${i + 1}: compare a[${j}] = ${a[j]} with a[${j + 1}] = ${a[j + 1]}.`, [{ t: "bars", vals: a, hl: { ...done, [j]: "cmp", [j + 1]: "cmp" } }]));
        if (a[j] > a[j + 1]) { [a[j], a[j + 1]] = [a[j + 1], a[j]]; fr.push(F(3, `${a[j + 1]} > ${a[j]}: swap them, so the bigger value moves right.`, [{ t: "bars", vals: a, hl: { ...done, [j]: "swap", [j + 1]: "swap" } }])); } }
        done[n - 1 - i] = "done"; fr.push(F(4, `Pass ${i + 1} done: ${a[n - 1 - i]} is in its final place.`, [{ t: "bars", vals: a, hl: { ...done } }])); }
      done[0] = "done"; fr.push(F(-1, "Sorted. O(N²) comparisons; stable; O(1) extra space.", [{ t: "bars", vals: a, hl: done }])); return fr; } };

  A.insertionSort = { title: "Insertion sort", inputLabel: "array", input: "7 3 5 1 9 2",
    about: "The left part of the bars is always sorted. Each step takes the next value (the key), shifts every bigger sorted value one place right, and drops the key into the gap.",
    code: ["for i in range(1, n):","    key = a[i]","    j = i - 1","    while j >= 0 and a[j] > key:","        a[j + 1] = a[j]   # shift right","        j -= 1","    a[j + 1] = key"],
    gen(s) { const a = cap(nums(s), 12), fr = [];
      for (let i = 1; i < a.length; i++) { const key = a[i]; let j = i - 1;
        fr.push(F(1, `Take key = ${key}; the left part 0..${i - 1} is already sorted.`, [{ t: "bars", vals: a, hl: { [i]: "act" } }]));
        while (j >= 0 && a[j] > key) { a[j + 1] = a[j]; fr.push(F(4, `a[${j}] = ${a[j]} > key ${key}: shift it one place right.`, [{ t: "bars", vals: a, hl: { [j]: "cmp", [j + 1]: "swap" } }])); j--; }
        a[j + 1] = key; fr.push(F(6, `No bigger value left of the gap: put key ${key} at index ${j + 1}.`, [{ t: "bars", vals: a, hl: { [j + 1]: "done" } }])); }
      fr.push(F(-1, "Sorted. O(N²) worst case but O(N) when nearly sorted; stable.", [{ t: "bars", vals: a, hl: Object.fromEntries(a.map((_, i) => [i, "done"])) }])); return fr; } };

  A.mergeSort = { title: "Merge sort", inputLabel: "array", input: "38 27 43 3 9 82 10",
    about: "The range is split in half until single elements remain, then halves are merged back in order. The left/right chips are what remains of each half while merging; the smaller front value is placed each step.",
    code: ["def merge_sort(l, r):","    if l >= r:","        return","    m = (l + r) // 2","    merge_sort(l, m)","    merge_sort(m + 1, r)","    merge(l, m, r)   # combine the two sorted halves"],
    gen(s) { const a = cap(nums(s), 12), fr = [];
      const ms = (l, r) => {
        if (l >= r) return; const m = (l + r) >> 1;
        fr.push(F(3, `Split ${l}..${r} at m = ${m}: sort ${l}..${m}, then ${m + 1}..${r}.`, [{ t: "bars", vals: a, hl: Object.fromEntries(Array.from({ length: r - l + 1 }, (_, k) => [l + k, k + l <= m ? "cmp" : "act"])) }]));
        ms(l, m); ms(m + 1, r);
        const L = a.slice(l, m + 1), Rr = a.slice(m + 1, r + 1); let i = 0, j = 0, k = l;
        while (i < L.length || j < Rr.length) { const takeL = j >= Rr.length || (i < L.length && L[i] <= Rr[j]); a[k] = takeL ? L[i++] : Rr[j++];
          fr.push(F(6, `Merge: ${a[k]} is the smaller front value, so it goes to index ${k}.`, [{ t: "bars", vals: a, hl: { [k]: "swap" } }, chips("left", L.slice(i)), chips("right", Rr.slice(j))])); k++; }
        fr.push(F(6, `Merged: ${l}..${r} is now sorted.`, [{ t: "bars", vals: a, hl: Object.fromEntries(Array.from({ length: r - l + 1 }, (_, q) => [l + q, "done"])) }]));
      };
      ms(0, a.length - 1); fr.push(F(-1, "Sorted. Always O(N log N); stable; O(N) extra space.", [{ t: "bars", vals: a, hl: Object.fromEntries(a.map((_, i) => [i, "done"])) }])); return fr; } };

  A.quickSort = { title: "Quick sort (Lomuto partition)", inputLabel: "array", input: "10 80 30 90 40 50 70",
    about: "The last bar of each range is the pivot. Arrow <b>j</b> scans the range; values smaller than the pivot are swapped into the region before arrow <b>i</b>. Finally the pivot is swapped to i, its final sorted place, and both sides are sorted the same way.",
    code: ["def quick_sort(l, r):","    if l >= r:","        return","    pivot = a[r]","    i = l","    for j in range(l, r):","        if a[j] < pivot:","            a[i], a[j] = a[j], a[i]","            i += 1","    a[i], a[r] = a[r], a[i]   # pivot to its final place","    quick_sort(l, i - 1)","    quick_sort(i + 1, r)"],
    gen(s) { const a = cap(nums(s), 12), fr = [], fin = {};
      const qs = (l, r) => {
        if (l > r) return; if (l === r) { fin[l] = "done"; return; }
        const p = a[r]; let i = l;
        fr.push(F(3, `Partition ${l}..${r}: pivot = a[${r}] = ${p}. i = ${i} marks where the next smaller value goes.`, [{ t: "bars", vals: a, hl: { ...fin, [r]: "act" }, ptr: { i } }]));
        for (let j = l; j < r; j++) {
          fr.push(F(6, `Is a[${j}] = ${a[j]} < pivot ${p}?`, [{ t: "bars", vals: a, hl: { ...fin, [r]: "act", [j]: "cmp" }, ptr: { i, j } }]));
          if (a[j] < p) { [a[i], a[j]] = [a[j], a[i]]; fr.push(F(7, `Yes: swap it to index ${i}, growing the "smaller than pivot" region.`, [{ t: "bars", vals: a, hl: { ...fin, [r]: "act", [i]: "swap", [j]: "swap" }, ptr: { i, j } }])); i++; }
        }
        [a[i], a[r]] = [a[r], a[i]]; fin[i] = "done";
        fr.push(F(9, `Pivot ${p} lands at ${i}: everything left is smaller, everything right is bigger.`, [{ t: "bars", vals: a, hl: { ...fin } }]));
        qs(l, i - 1); qs(i + 1, r);
      };
      qs(0, a.length - 1); fr.push(F(-1, "Sorted. O(N log N) on average, O(N²) worst case; in place; not stable.", [{ t: "bars", vals: a, hl: Object.fromEntries(a.map((_, i) => [i, "done"])) }])); return fr; } };

  /* ═════════ BINARY SEARCH ═════════ */
  A.binarySearch = { title: "Binary search", inputLabel: "sorted array | target", input: "2 5 8 12 16 23 38 56 72 91 | 23",
    about: "Arrows <b>lo</b>, <b>mid</b> and <b>hi</b> mark the search space; dimmed cells are already ruled out. Each comparison with a[mid] throws away half of what is left.",
    code: ["lo = 0","hi = n - 1","while lo <= hi:","    mid = lo + (hi - lo) // 2","    if a[mid] == target:","        return mid","    if a[mid] < target:","        lo = mid + 1","    else:","        hi = mid - 1","return -1"],
    gen(s) { const [a0, t0] = split2(s); const a = cap(nums(a0).sort((x, y) => x - y), 18), t = nums(t0)[0] ?? 0, fr = []; let lo = 0, hi = a.length - 1;
      const dim = () => Object.fromEntries(a.map((_, i) => [i, i < lo || i > hi ? "dim" : ""]));
      while (lo <= hi) { const mid = lo + ((hi - lo) >> 1);
        fr.push(F(3, `Search space ${lo}..${hi} (${hi - lo + 1} items). mid = ${mid}, a[mid] = ${a[mid]}`, [arr(a, { ptr: { lo, mid, hi }, hl: { ...dim(), [mid]: "act" } }), vars({ target: t })]));
        if (a[mid] === t) { fr.push(F(5, `Found ${t} at index ${mid}, after ${(fr.length + 1) / 2} comparisons. O(log N).`, [arr(a, { ptr: { mid }, hl: { [mid]: "found" } })])); return fr; }
        if (a[mid] < t) { lo = mid + 1; fr.push(F(7, `a[mid] = ${a[mid]} < ${t}: the target can only be to the right, so lo = ${lo}.`, [arr(a, { ptr: { lo, hi }, hl: dim() })])); }
        else { hi = mid - 1; fr.push(F(9, `a[mid] = ${a[mid]} > ${t}: the target can only be to the left, so hi = ${hi}.`, [arr(a, { ptr: { lo, hi }, hl: dim() })])); }
      }
      fr.push(F(10, `lo passed hi: ${t} isn't in the array.`, [arr(a, { hl: dim() })])); return fr; } };

  A.firstOccurrence = { title: "Binary search: first occurrence", inputLabel: "sorted array | target", input: "1 2 2 2 2 3 4 4 6 | 2",
    about: "Ordinary binary search, except a match does not stop the search: it is recorded in <b>ans</b> and the search continues to the left, in case an earlier copy exists.",
    code: ["lo = 0","hi = n - 1","ans = -1","while lo <= hi:","    mid = (lo + hi) // 2","    if a[mid] == target:","        ans = mid","        hi = mid - 1      # keep looking left","    elif a[mid] < target:","        lo = mid + 1","    else:","        hi = mid - 1","return ans"],
    gen(s) { const [a0, t0] = split2(s); const a = cap(nums(a0).sort((x, y) => x - y), 18), t = nums(t0)[0] ?? 0, fr = []; let lo = 0, hi = a.length - 1, ans = -1;
      while (lo <= hi) { const mid = (lo + hi) >> 1;
        fr.push(F(4, `Search ${lo}..${hi}: mid = ${mid}, a[mid] = ${a[mid]}.`, [arr(a, { ptr: { lo, mid, hi }, hl: { [mid]: "act", [ans]: "found" } }), vars({ ans })]));
        if (a[mid] === t) { ans = mid; hi = mid - 1; fr.push(F(7, `Match. Record ans = ${mid}, but an earlier ${t} may exist, so search left.`, [arr(a, { ptr: { lo, hi }, hl: { [ans]: "found" } }), vars({ ans })])); }
        else if (a[mid] < t) { lo = mid + 1; fr.push(F(9, `a[mid] = ${a[mid]} < ${t}: the first ${t} is to the right, so lo = ${lo}.`, [arr(a, { ptr: { lo, hi } }), vars({ ans })])); }
        else { hi = mid - 1; fr.push(F(11, `a[mid] = ${a[mid]} > ${t}: go left, hi = ${hi}.`, [arr(a, { ptr: { lo, hi } }), vars({ ans })])); }
      }
      fr.push(F(12, `${ans < 0 ? `${t} is not in the array, so ans stays −1.` : `First occurrence at index <b>${ans}</b>.`} The same trick (keep the answer, keep searching) finds last occurrences, lower bounds and \"binary search on the answer\".`, [arr(a, { hl: { [ans]: "found" } }), vars({ ans })])); return fr; } };

  /* ═════════ MATH ═════════ */
  A.sieve = { title: "Sieve of Eratosthenes", inputLabel: "N (≤ 100)", input: "50",
    about: "The grid holds 0…N (row r, column c is the number 10r + c). Each prime crosses out its multiples starting from its square; whatever is never crossed out is prime.",
    code: ["is_prime = [True] * (N + 1)","is_prime[0] = is_prime[1] = False","for i in range(2, int(N ** 0.5) + 1):","    if is_prime[i]:","        for j in range(i * i, N + 1, i):","            is_prime[j] = False"],
    gen(s) { const N = Math.max(10, Math.min(100, nums(s)[0] || 50)), fr = [], isP = Array(N + 1).fill(true); isP[0] = isP[1] = false;
      const grid = () => { const rows = []; for (let r = 0; r * 10 <= N; r++) rows.push(Array.from({ length: 10 }, (_, c) => (r * 10 + c <= N ? r * 10 + c : null))); return rows; };
      const hl = (extra = {}) => { const h = {}; for (let v = 0; v <= N; v++) h[Math.floor(v / 10) + "," + (v % 10)] = v < 2 || !isP[v] ? "dim" : ""; return { ...h, ...extra }; };
      fr.push(F(1, "Assume every number ≥ 2 is prime; 0 and 1 are not.", [{ t: "grid", rows: grid(), hl: hl() }]));
      for (let i = 2; i * i <= N; i++) { if (!isP[i]) continue;
        fr.push(F(3, `${i} is still uncrossed, so it is prime. Cross out its multiples from ${i}² = ${i * i} (smaller ones were crossed by smaller primes).`, [{ t: "grid", rows: grid(), hl: hl({ [Math.floor(i / 10) + "," + (i % 10)]: "found" }) }]));
        const x = {}; for (let j = i * i; j <= N; j += i) { isP[j] = false; x[Math.floor(j / 10) + "," + (j % 10)] = "bad"; }
        fr.push(F(5, `Crossed out ${Object.keys(x).length} multiples of ${i}.`, [{ t: "grid", rows: grid(), hl: { ...hl(), ...x } }])); }
      const primes = []; for (let v = 2; v <= N; v++) if (isP[v]) primes.push(v);
      const fin = {}; primes.forEach((v) => (fin[Math.floor(v / 10) + "," + (v % 10)] = "found"));
      fr.push(F(-1, `${primes.length} primes ≤ ${N}. O(N log log N).`, [{ t: "grid", rows: grid(), hl: { ...hl(), ...fin } }, chips("primes", primes)])); return fr; } };

  A.gcd = { title: "Euclid's GCD", inputLabel: "a b", input: "84 36",
    about: "Each row is one step of Euclid's algorithm: replace (a, b) with (b, a % b). The remainder shrinks quickly, and when it reaches 0 the other number is the GCD.",
    code: ["def gcd(a, b):","    while b != 0:","        a, b = b, a % b","    return a"],
    gen(s) { let [a, b] = nums(s); a = Math.abs(a || 84); b = Math.abs(b || 36); const fr = [], rows = [];
      while (b !== 0) { rows.push([a, b, a % b]); fr.push(F(2, `${a} % ${b} = ${a % b} → continue with (${b}, ${a % b})`, [{ t: "grid", ch: ["a", "b", "a % b"], rows: rows.slice(), hl: { [rows.length - 1 + ",2"]: "act" } }])); [a, b] = [b, a % b]; }
      fr.push(F(3, `b = 0, so gcd = <b>${a}</b>. O(log min(a, b)) steps.`, [{ t: "grid", ch: ["a", "b", "a % b"], rows, hl: {} }, vars({ gcd: a })])); return fr; } };

  /* ═════════ RECURSION & BACKTRACKING ═════════ */
  A.fibTree = { title: "Recursion tree: fib(n)", inputLabel: "n (≤ 6) | memo?", input: "5 | no", presets: [["Plain recursion", "5 | no"], ["With memoization", "5 | yes"]],
    about: "Each node is one call fib(k), labelled f<i>k</i>, with its return value as a tag. Left child = fib(k−1), right = fib(k−2). The call stack shows which calls are still waiting. With memoization, repeated calls are answered from the memo instead of being expanded.",
    code: ["def fib(n):","    if n <= 1:","        return n","    if n in memo:      # memoized version only","        return memo[n]","    res = fib(n - 1) + fib(n - 2)","    memo[n] = res","    return res"],
    gen(s) { const [n0, m0] = split2(s); const n = Math.max(1, Math.min(6, nums(n0)[0] ?? 5)), memo = /y/i.test(m0 || ""), fr = [], nodes = [], stack = [], M = {}; let id = 0, calls = 0;
      const rec = (k, parent, side) => {
        const me = id++; calls++; nodes.push({ id: me, label: `f${k}`, parent, side, cls: "act" }); stack.push(`fib(${k})`);
        fr.push(F(0, `Call fib(${k})`, [{ t: "tree", nodes, binary: true }, chips("call stack", stack.slice().reverse(), true)]));
        let res, hit = false;
        if (k <= 1) { res = k; fr.push(F(1, `Base case: n = ${k} ≤ 1, so fib(${k}) = ${k} with no further calls.`, [{ t: "tree", nodes, binary: true }, chips("call stack", stack.slice().reverse(), true)])); }
        else if (memo && M[k] != null) { res = M[k]; hit = true; nodes[me].cls = "found"; fr.push(F(3, `fib(${k}) was already computed: take ${res} from the memo, no recursion.`, [{ t: "tree", nodes, binary: true }, chips("memo", Object.entries(M).map(([a, b]) => `${a}:${b}`))])); }
        else { res = rec(k - 1, me, "L") + rec(k - 2, me, "R"); if (memo) { M[k] = res; fr.push(F(6, `Store memo[${k}] = ${res} so later calls can reuse it.`, [{ t: "tree", nodes, binary: true }, chips("memo", Object.entries(M).map(([a, b]) => `${a}:${b}`))])); } }
        nodes[me].tag = res; if (nodes[me].cls === "act") nodes[me].cls = "done"; stack.pop();
        fr.push(F(k <= 1 ? 2 : hit ? 4 : 7, `fib(${k}) returns ${res}${k > 1 && !hit ? ` = fib(${k - 1}) + fib(${k - 2})` : ""}`, [{ t: "tree", nodes, binary: true }, chips("call stack", stack.slice().reverse(), true), ...(memo ? [chips("memo", Object.entries(M).map(([a, b]) => `${a}:${b}`))] : [])]));
        return res;
      };
      const r = rec(n, null, null);
      fr.push(F(-1, `fib(${n}) = <b>${r}</b> using <b>${calls}</b> calls. ${memo ? "Memoization makes it O(N)." : "Plain recursion repeats work: O(2ⁿ). Try the memoized preset."}`, [{ t: "tree", nodes, binary: true }])); return fr; } };

  A.subsets = { title: "Backtracking: all subsets", inputLabel: "items (≤ 4)", input: "1 2 3",
    about: "Each node is a call with the subset built so far. Left edge (+x) includes the next item, right edge (−x) excludes it. Leaves at depth n are complete subsets and are collected in the chips.",
    code: ["def solve(i, cur):","    if i == n:","        output(cur[:])","        return","    cur.append(a[i])    # include a[i]","    solve(i + 1, cur)","    cur.pop()           # undo: now exclude a[i]","    solve(i + 1, cur)"],
    gen(s) { const a = cap(nums(s), 4), fr = [], nodes = [], out = []; let id = 0;
      const rec = (i, cur, parent, side) => { const me = id++; nodes.push({ id: me, label: `{${cur.join(",")}}`, parent, side, cls: "act", elabel: side ? (side === "L" ? `+${a[i - 1]}` : `−${a[i - 1]}`) : "" });
        fr.push(F(0, `Call solve(${i}, [${cur.join(", ")}])${i < a.length ? `: next decide on ${a[i]}, first including it.` : ": all items decided."}`, [{ t: "tree", nodes }, chips("subsets found", out.slice())]));
        if (i === a.length) { out.push(`{${cur.join(",")}}`); nodes[me].cls = "found"; fr.push(F(2, `i == n: output the subset {${cur.join(",")}}.`, [{ t: "tree", nodes }, chips("subsets found", out.slice())])); return; }
        nodes[me].cls = "done";
        cur.push(a[i]); rec(i + 1, cur, me, "L"); cur.pop();
        fr.push(F(6, `Back from the include branch: pop ${a[i]} and explore the subsets without it.`, [{ t: "tree", nodes }, chips("subsets found", out.slice())]));
        rec(i + 1, cur, me, "R"); };
      rec(0, [], null, null);
      fr.push(F(-1, `${out.length} = 2^${a.length} subsets. Choose → explore → un-choose is the backtracking template.`, [{ t: "tree", nodes }, chips("subsets", out)])); return fr; } };

  A.nQueens = { title: "Backtracking: N-Queens", inputLabel: "N (4–6)", input: "4",
    about: "Place one queen per row. For each row, try every column; skip a square if an earlier queen attacks it (same column or diagonal). If a row has no safe square, go back and move the previous queen.",
    code: ["def place(row):", "    if row == N:", "        record(board)            # all N queens placed", "        return True", "    for col in range(N):", "        if safe(row, col):       # column, r-c and r+c unused", "            board[row][col] = 'Q'", "            if place(row + 1):", "                return True", "            board[row][col] = '.'   # backtrack", "    return False"],
    gen(s) {
      const N = Math.max(4, Math.min(6, nums(s)[0] || 4)), fr = [], Q = [], cols = new Set(), d1 = new Set(), d2 = new Set(); let found = false, tries = 0, backs = 0;
      const st = (extra) => vars({ row: extra.row ?? "–", "queens placed": Q.length, "squares tried": tries, backtracks: backs });
      const B = (hl = {}, lines = [], qcls = {}) => ({ t: "board", n: N, queens: Q.map((q) => q.slice()), hl, lines, qcls });
      fr.push(F(0, `Empty ${N}×${N} board. We fill it <b>row by row</b>: exactly one queen per row.`, [B(), st({})]));
      const place = (r) => {
        if (r === N) { found = true; fr.push(F(2, `Row ${N} reached: all <b>${N} queens</b> are placed and none attack each other.`, [B(Object.fromEntries(Q.map(([a, b]) => [a + "," + b, "found"]))), st({ row: r })])); return true; }
        for (let c = 0; c < N; c++) {
          tries++;
          const att = Q.find(([qr, qc]) => qc === c || qr - qc === r - c || qr + qc === r + c);
          if (att) {
            const why = att[1] === c ? "same column" : "same diagonal";
            fr.push(F(5, `Row ${r}, column ${c}: attacked by the queen at (${att[0]}, ${att[1]}) — ${why}. Skip it.`, [B({ [r + "," + c]: "bad" }, [[att[0], att[1], r, c]], { [att[0]]: "bad" }), st({ row: r })]));
            continue;
          }
          fr.push(F(5, `Row ${r}, column ${c}: no queen shares this column or a diagonal. <b>Safe.</b>`, [B({ [r + "," + c]: "act" }), st({ row: r })]));
          Q.push([r, c]); cols.add(c); d1.add(r - c); d2.add(r + c);
          fr.push(F(6, `Place a queen at (${r}, ${c}) and move on to row ${r + 1}.`, [B(), st({ row: r })]));
          if (place(r + 1)) return true;
          Q.pop(); cols.delete(c); d1.delete(r - c); d2.delete(r + c); backs++;
          fr.push(F(9, `Every square in row ${r + 1} was attacked, so this queen was a dead end. <b>Backtrack</b>: lift the queen off (${r}, ${c}) and try the next column.`, [B({ [r + "," + c]: "dim" }), st({ row: r })]));
        }
        return false;
      };
      place(0);
      fr.push(F(-1, found ? `Solved after trying ${tries} squares with ${backs} backtracks. Checking 3 sets (columns, r−c, r+c) makes each safety test O(1); the search is O(N!) in the worst case but pruning cuts it hard.` : "No solution.", [B(Object.fromEntries(Q.map(([a, b]) => [a + "," + b, "found"]))), st({})]));
      return fr;
    } };

  /* ═════════ HASHING ═════════ */
  A.twoSumHash = { title: "Hashing: two sum (unsorted)", inputLabel: "array | target", input: "8 3 11 5 7 2 | 9",
    about: "Walk the array once. For each x, look up its complement (target − x) in the hash map of values seen so far; the chips show that map, with a hit highlighted.",
    code: ["seen = {}            # value -> index","for i, x in enumerate(a):","    need = target - x","    if need in seen:","        return (seen[need], i)","    seen[x] = i","return None"],
    gen(s) { const [a0, t0] = split2(s); const a = cap(nums(a0), 14), t = nums(t0)[0] ?? 0, fr = [], seen = {};
      for (let i = 0; i < a.length; i++) { const need = t - a[i];
        fr.push(F(3, `x = a[${i}] = ${a[i]}, so we need ${t} − ${a[i]} = ${need}. Is ${need} in the map?`, [arr(a, { hl: { [i]: "act" } }), chips("hash map (value → index)", Object.entries(seen).map(([k, v]) => ({ v: `${k} → ${v}`, cls: +k === need ? "hit" : "" })))]));
        if (seen[need] !== undefined) { fr.push(F(4, `Yes: ${need} at index ${seen[need]}. Pair (${seen[need]}, ${i}). One pass, O(N) time and space.`, [arr(a, { hl: { [i]: "found", [seen[need]]: "found" } })])); return fr; }
        seen[a[i]] = i; fr.push(F(5, `No. Store ${a[i]} → ${i} so a later element can pair with it.`, [arr(a, { hl: { [i]: "done" } }), chips("hash map (value → index)", Object.entries(seen).map(([k, v]) => `${k} → ${v}`))])); }
      fr.push(F(6, "Finished the array: no pair adds up to the target.", [arr(a)])); return fr; } };

  A.subarraySumK = { title: "Prefix sum + hashing: count subarrays with sum k", inputLabel: "array | k", input: "1 2 3 -2 1 4 | 3",
    about: "<b>ps</b> is the running prefix sum. A subarray ending here sums to k exactly when some earlier prefix equals ps − k, so the hash map of prefix-sum counts (chips) tells how many such subarrays end at each index.",
    code: ["count = 0","ps = 0","freq = {0: 1}","for x in a:","    ps += x","    count += freq.get(ps - k, 0)   # earlier prefixes that cut off sum k","    freq[ps] = freq.get(ps, 0) + 1","return count"],
    gen(s) { const [a0, k0] = split2(s); const a = cap(nums(a0), 14), k = nums(k0)[0] ?? 0, fr = [], freq = { 0: 1 }; let ps = 0, cnt = 0;
      a.forEach((x, i) => { ps += x; const add = freq[ps - k] || 0; cnt += add;
        fr.push(F(5, `ps = ${ps}. Earlier prefixes equal to ps − k = ${ps - k}: ${add}, so ${add} subarr${add === 1 ? "ay" : "ays"} ending at index ${i} sum to ${k}. count = <b>${cnt}</b>. Then record ps = ${ps} in freq.`, [arr(a, { hl: { [i]: "act" } }), vars({ ps, "ps - k": ps - k, count: cnt }), chips("freq of prefix sums", Object.entries(freq).map(([p, c]) => ({ v: `${p}: ${c}`, cls: +p === ps - k ? "hit" : "" })))]));
        freq[ps] = (freq[ps] || 0) + 1; });
      fr.push(F(7, `<b>${cnt}</b> subarrays sum to ${k}. O(N) instead of O(N²), and it works with negative numbers (sliding windows don't).`, [arr(a), vars({ count: cnt })])); return fr; } };

  /* ═════════ BIT MANIPULATION ═════════ */
  A.xorSingle = { title: "XOR trick: the element that appears once", inputLabel: "array (pairs + one single)", input: "4 1 2 1 2",
    about: "The bit rows show the running XOR. XOR-ing a number twice cancels it (x ^ x = 0), so after every element is folded in, only the unpaired one is left.",
    code: ["res = 0","for x in a:","    res ^= x          # x ^ x = 0, x ^ 0 = x","return res"],
    gen(s) { const a = cap(nums(s), 10), fr = []; let res = 0;
      a.forEach((x, i) => { const before = res; res ^= x;
        fr.push(F(2, `res ^ ${x}: ${before} ^ ${x} = <b>${res}</b>`, [arr(a, { hl: { [i]: "act" } }), { t: "bits", width: 8, rows: [{ label: "res", n: before }, { label: "^ " + x, n: x }, { label: "=", n: res, cls: "res" }] }])); });
      fr.push(F(3, `Pairs cancel out, leaving <b>${res}</b>. O(N) time, O(1) space.`, [arr(a), { t: "bits", width: 8, rows: [{ label: "answer", n: res, cls: "res" }] }])); return fr; } };

  A.countBits = { title: "Count set bits: n & (n − 1)", inputLabel: "n (0–255)", input: "92",
    about: "The rows show n, n − 1 and their AND in binary. Subtracting 1 flips the lowest set bit and everything below it, so n & (n − 1) clears exactly that bit; the loop runs once per set bit.",
    code: ["count = 0","while n > 0:","    n = n & (n - 1)     # clears the lowest set bit","    count += 1","return count"],
    gen(s) { let n = Math.max(0, Math.min(255, nums(s)[0] ?? 92)); const fr = []; let c = 0;
      fr.push(F(0, `n = ${n}`, [{ t: "bits", width: 8, rows: [{ label: "n", n }] }, vars({ count: 0 })]));
      while (n > 0) { const m = n - 1, nn = n & m; c++; const low = Math.log2(n & -n);
        fr.push(F(2, `n & (n−1): ${n} & ${m} = ${nn}. The lowest set bit (bit ${low}) disappears.`, [{ t: "bits", width: 8, rows: [{ label: "n", n, hlBit: low }, { label: "n − 1", n: m }, { label: "n & (n−1)", n: nn, cls: "res" }] }, vars({ count: c })])); n = nn; }
      fr.push(F(4, `n is 0: <b>${c}</b> set bits. The loop runs once per set bit, not once per bit.`, [vars({ count: c })])); return fr; } };

  /* ═════════ STRINGS ═════════ */
  A.kmpLPS = { title: "KMP: building the LPS (prefix function) array", inputLabel: "pattern", input: "aabaaab",
    about: "Top row is the pattern, bottom row the LPS array. Arrow <b>i</b> is the cell being filled; arrow <b>length</b> is the end of the current matching prefix. On a mismatch, length falls back through earlier LPS values instead of restarting at 0.",
    code: ["lps = [0] * m","length = 0","i = 1","while i < m:","    if p[i] == p[length]:","        length += 1","        lps[i] = length","        i += 1","    elif length > 0:","        length = lps[length - 1]   # fall back, don't restart","    else:","        lps[i] = 0","        i += 1"],
    gen(s) { const p = cap([...String(s).trim()], 16, "characters"), m = p.length, lps = Array(m).fill(null), fr = []; lps[0] = 0; let len = 0, i = 1;
      fr.push(F(0, "lps[i] = length of the longest proper prefix of p[0..i] that is also a suffix.", [arr(p, { label: "p" }), arr(lps, { label: "lps" })]));
      while (i < m) {
        if (p[i] === p[len]) { len++; lps[i] = len; fr.push(F(6, `p[${i}] = p[${len - 1}] = '${p[i]}': the prefix grows, so length = ${len} and lps[${i}] = ${len}.`, [arr(p, { label: "p", ptr: { i, length: len - 1 }, hl: { [i]: "found", [len - 1]: "found" } }), arr(lps, { label: "lps", hl: { [i]: "done" } })])); i++; }
        else if (len > 0) { const old = len; len = lps[len - 1]; fr.push(F(9, `Mismatch '${p[i]}' ≠ '${p[old]}': fall back to the next shorter border: length = lps[${old - 1}] = ${len}.`, [arr(p, { label: "p", ptr: { i, length: len }, hl: { [i]: "bad", [old]: "bad" } }), arr(lps, { label: "lps", hl: { [old - 1]: "cmp" } })])); }
        else { lps[i] = 0; fr.push(F(11, `Mismatch and length = 0: no border ends here, so lps[${i}] = 0.`, [arr(p, { label: "p", ptr: { i }, hl: { [i]: "bad" } }), arr(lps, { label: "lps", hl: { [i]: "done" } })])); i++; }
      }
      fr.push(F(-1, "Built in O(m). During search, on a mismatch the pattern jumps by lps instead of restarting, which makes matching O(n + m).", [arr(p, { label: "p" }), arr(lps, { label: "lps" })])); return fr; } };

  A.palindrome = { title: "Two pointers: is it a palindrome?", inputLabel: "string", input: "racecar",
    about: "Arrows <b>l</b> and <b>r</b> start at the two ends and move toward each other, comparing the characters they point at. One mismatch is enough to say no.",
    code: ["l = 0","r = n - 1","while l < r:","    if s[l] != s[r]:","        return False","    l += 1","    r -= 1","return True"],
    gen(str) { const s = cap([...String(str).trim()], 18, "characters"), fr = []; let l = 0, r = s.length - 1;
      while (l < r) { const ok = s[l] === s[r]; fr.push(F(3, `s[${l}] = '${s[l]}' vs s[${r}] = '${s[r]}': ${ok ? "match, so move both pointers inward" : "mismatch"}.`, [arr(s, { ptr: { l, r }, hl: { [l]: ok ? "found" : "bad", [r]: ok ? "found" : "bad" } })]));
        if (!ok) { fr.push(F(4, `'${s[l]}' ≠ '${s[r]}': not a palindrome.`, [arr(s, { hl: { [l]: "bad", [r]: "bad" } })])); return fr; } l++; r--; }
      fr.push(F(7, "Pointers met with every pair matching: palindrome. O(N) time, O(1) space.", [arr(s, { hl: Object.fromEntries(s.map((_, i) => [i, "found"])) })])); return fr; } };

  /* ═════════ LINKED LISTS ═════════ */
  const listNodes = (vals) => vals.map((v, i) => ({ id: "n" + i, label: v }));
  A.reverseList = { title: "Reverse a linked list (iterative)", inputLabel: "values", input: "1 2 3 4 5",
    about: "Arrows <b>prev</b>, <b>curr</b> and <b>nxt</b> walk the list. Each step saves curr.next, flips curr's arrow to point back at prev, then moves both pointers one node forward.",
    code: ["prev = None","curr = head","while curr:","    nxt = curr.next","    curr.next = prev     # flip the arrow","    prev = curr","    curr = nxt","head = prev"],
    gen(s) { const v = cap(nums(s), 8), nodes = listNodes(v), next = {}, fr = []; nodes.forEach((n, i) => (next[n.id] = nodes[i + 1] ? nodes[i + 1].id : null));
      let prev = null, curr = nodes[0] ? nodes[0].id : null;
      const P = (extra) => ({ t: "list", nodes, next, ptr: { prev, curr, ...extra } });
      fr.push(F(1, "Start: prev = None, curr = head.", [P({})]));
      while (curr) { const nxt = next[curr]; fr.push(F(3, "Save nxt = curr.next, or we lose the rest of the list after flipping.", [P({ nxt })])); next[curr] = prev; fr.push(F(4, "Flip: curr.next now points back to prev.", [P({ nxt })])); prev = curr; fr.push(F(5, "prev moves up to curr.", [P({ nxt })])); curr = nxt; fr.push(F(6, curr ? "curr moves to nxt: repeat for the next node." : "curr = nxt = None: the loop ends.", [P({})])); }
      fr.push(F(7, "Done: prev is the new head. O(N) time, O(1) space.", [{ t: "list", nodes, next, ptr: { head: prev } }])); return fr; } };

  A.middleList = { title: "Middle of a linked list: slow & fast pointers", inputLabel: "values", input: "1 2 3 4 5 6 7",
    about: "<b>slow</b> moves one node per step and <b>fast</b> moves two. When fast runs off the end, slow has covered half the distance, so it sits at the middle.",
    code: ["slow = fast = head","while fast and fast.next:","    slow = slow.next","    fast = fast.next.next","return slow"],
    gen(s) { const v = cap(nums(s), 10), nodes = listNodes(v), next = {}, fr = []; nodes.forEach((n, i) => (next[n.id] = nodes[i + 1] ? nodes[i + 1].id : null));
      let slow = nodes[0].id, fast = nodes[0].id;
      fr.push(F(0, "Both start at the head.", [{ t: "list", nodes, next, ptr: { slow, fast } }]));
      while (fast && next[fast]) { slow = next[slow]; fast = next[next[fast]]; fr.push(F(3, "slow moves 1 node, fast moves 2 nodes.", [{ t: "list", nodes, next, ptr: { slow, fast } }])); }
      nodes.find((n) => n.id === slow).cls = "found";
      fr.push(F(4, "When fast hits the end, slow is in the middle. One pass, O(1) space.", [{ t: "list", nodes, next, ptr: { slow } }])); return fr; } };

  A.floydCycle = { title: "Detect a cycle: Floyd's tortoise and hare", inputLabel: "values | tail links to index", input: "3 2 0 -4 7 9 | 1",
    about: "The tail's arrow loops back into the list. <b>slow</b> moves 1 node per step and <b>fast</b> moves 2; inside a loop fast gains one node per step on slow, so they must meet. With no loop, fast simply reaches the end.",
    code: ["slow = fast = head","while fast and fast.next:","    slow = slow.next","    fast = fast.next.next","    if slow is fast:","        return True    # they met inside the loop","return False"],
    gen(s) { const [v0, c0] = split2(s); const v = cap(nums(v0), 9), nodes = listNodes(v), next = {}, fr = []; nodes.forEach((n, i) => (next[n.id] = nodes[i + 1] ? nodes[i + 1].id : null));
      const ci = nums(c0 || "-1")[0]; if (ci != null && ci >= 0 && ci < v.length) next[nodes[v.length - 1].id] = nodes[ci].id;
      let slow = nodes[0].id, fast = nodes[0].id, steps = 0;
      fr.push(F(0, ci >= 0 ? `The last node links back to index ${ci}, so there's a cycle.` : "No cycle in this list.", [{ t: "list", nodes, next, ptr: { slow, fast } }]));
      while (fast && next[fast] && steps < 40) { slow = next[slow]; fast = next[next[fast]]; steps++;
        fr.push(F(3, `Step ${steps}: slow moves 1 node, fast moves 2. ${slow === fast ? "They are on the same node." : "Not the same node yet."}`, [{ t: "list", nodes, next, ptr: { slow, fast } }]));
        if (slow === fast) { nodes.find((n) => n.id === slow).cls = "found"; fr.push(F(5, "slow == fast: cycle detected. O(N) time, O(1) space.", [{ t: "list", nodes, next, ptr: { "meet": slow } }])); return fr; } }
      fr.push(F(6, "fast reached the end: no cycle.", [{ t: "list", nodes, next, ptr: {} }])); return fr; } };

  /* ═════════ STACKS & QUEUES ═════════ */
  A.validParens = { title: "Stack: balanced brackets", inputLabel: "brackets", input: "{[()()]}(",
    about: "Openers are pushed on the stack. Each closer must match the opener on top, which is then popped. The string is balanced only if nothing mismatches and the stack is empty at the end.",
    code: ["pairs = {')': '(', ']': '[', '}': '{'}","stack = []","for ch in s:","    if ch in '([{':","        stack.append(ch)","    elif not stack or stack[-1] != pairs[ch]:","        return False","    else:","        stack.pop()","return len(stack) == 0"],
    gen(str) { const s = cap([...String(str).replace(/\s/g, "")], 18, "characters"), fr = [], st = [], M = { ")": "(", "]": "[", "}": "{" };
      for (let i = 0; i < s.length; i++) { const ch = s[i];
        if ("([{".includes(ch)) { st.push(ch); fr.push(F(4, `'${ch}' is an opener: push it.`, [arr(s, { hl: { [i]: "act" } }), chips("stack (top →)", st.slice(), false)])); }
        else { if (!st.length || st[st.length - 1] !== M[ch]) { fr.push(F(6, `'${ch}' needs '${M[ch]}' on top, but the top is ${st.length ? `'${st[st.length - 1]}'` : "empty"}: unbalanced.`, [arr(s, { hl: { [i]: "bad" } }), chips("stack (top →)", st.slice())])); return fr; }
          st.pop(); fr.push(F(8, `'${ch}' matches the opener on top: pop it.`, [arr(s, { hl: { [i]: "found" } }), chips("stack (top →)", st.slice())])); } }
      fr.push(F(9, st.length ? `Leftover openers [${st.join("")}]: unbalanced` : "Stack empty: balanced. O(N).", [arr(s), chips("stack (top →)", st.slice())])); return fr; } };

  A.nextGreater = { title: "Monotonic stack: next greater element", inputLabel: "array", input: "4 5 2 10 8 3 12",
    about: "The stack keeps values that are still waiting for a bigger element, in decreasing order. A new value pops every smaller value off the top; it is their next greater element.",
    code: ["ans = [-1] * n","st = []          # indices; their values decrease","for i in range(n):","    while st and a[st[-1]] < a[i]:","        ans[st.pop()] = a[i]","    st.append(i)","return ans"],
    gen(s) { const a = cap(nums(s), 14), ans = a.map(() => -1), st = [], fr = [];
      for (let i = 0; i < a.length; i++) {
        fr.push(F(2, `i = ${i}: look at ${a[i]}. Is it bigger than the value on top of the stack?`, [arr(a, { hl: { [i]: "act" } }), arr(ans, { label: "ans" }), chips("stack (values)", st.map((j) => a[j]))]));
        while (st.length && a[st[st.length - 1]] < a[i]) { const j = st.pop(); ans[j] = a[i]; fr.push(F(4, `${a[i]} is the next greater for ${a[j]} (index ${j}): pop`, [arr(a, { hl: { [i]: "act", [j]: "found" } }), arr(ans, { label: "ans", hl: { [j]: "done" } }), chips("stack (values)", st.map((q) => a[q]))])); }
        st.push(i); fr.push(F(5, `Push ${a[i]}; the stack stays decreasing`, [arr(a, { hl: { [i]: "done" } }), arr(ans, { label: "ans" }), chips("stack (values)", st.map((q) => a[q]))])); }
      fr.push(F(6, "Each index is pushed and popped at most once: O(N). Leftovers have no greater element (−1).", [arr(a), arr(ans, { label: "ans" })])); return fr; } };

  A.windowMaxDeque = { title: "Deque: sliding window maximum", inputLabel: "array | k", input: "1 3 -1 -3 5 3 6 7 | 3",
    about: "The deque holds indices whose values decrease from front to back, so the front is always the window maximum. Indices leave the front when they slide out of the window and leave the back when a bigger value arrives.",
    code: ["dq = deque()    # indices; values decrease","for i in range(n):","    if dq and dq[0] <= i - k:","        dq.popleft()          # left the window","    while dq and a[dq[-1]] <= a[i]:","        dq.pop()              # can never be the max","    dq.append(i)","    if i >= k - 1:","        out.append(a[dq[0]])"],
    gen(s) { const [a0, k0] = split2(s); const a = cap(nums(a0), 14), k = Math.max(1, Math.min(nums(k0)[0] || 3, a.length)), dq = [], out = [], fr = [];
      for (let i = 0; i < a.length; i++) {
        if (dq.length && dq[0] <= i - k) { const d = dq.shift(); fr.push(F(3, `Index ${d} left the window: drop from the front`, [arr(a, { win: [Math.max(0, i - k + 1), i], hl: { [d]: "dim" } }), chips("deque (values)", dq.map((j) => a[j]))])); }
        while (dq.length && a[dq[dq.length - 1]] <= a[i]) { const d = dq.pop(); fr.push(F(5, `${a[d]} ≤ ${a[i]} can never be a max again: pop from the back`, [arr(a, { win: [Math.max(0, i - k + 1), i], hl: { [i]: "act", [d]: "bad" } }), chips("deque (values)", dq.map((j) => a[j]))])); }
        dq.push(i);
        if (i >= k - 1) out.push(a[dq[0]]);
        fr.push(F(i >= k - 1 ? 8 : 6, i >= k - 1 ? `Push index ${i} (${a[i]}). Window ${i - k + 1}..${i} is full: max = front = <b>${a[dq[0]]}</b>.` : `Push index ${i} (${a[i]}) at the back; the window isn't full yet.`, [arr(a, { win: [Math.max(0, i - k + 1), i], hl: { [dq[0]]: "found" } }), chips("deque (values)", dq.map((j) => a[j])), chips("output", out.slice())]));
      }
      fr.push(F(-1, "O(N): each index enters and leaves the deque once.", [arr(a), chips("output", out)])); return fr; } };

  /* ═════════ HEAPS ═════════ */
  const heapTree = (h, hl = {}) => ({ t: "tree", nodes: h.map((v, i) => ({ id: i, label: v, parent: i ? (i - 1) >> 1 : null, side: i ? (i % 2 ? "L" : "R") : null, cls: hl[i] || "" })) });
  A.heap = { title: "Max-heap: insert (sift up) and extract-max (sift down)", inputLabel: "values to insert", input: "15 30 8 50 20 40 10",
    about: "The tree and the array are the same heap: index i has children 2i+1 and 2i+2. Inserts sift the new value up past smaller parents; extract-max moves the last value to the root and sifts it down past larger children.",
    code: ["def push(h, x):","    h.append(x)","    i = len(h) - 1","    while i > 0 and h[(i - 1) // 2] < h[i]:","        p = (i - 1) // 2","        h[p], h[i] = h[i], h[p]   # sift up","        i = p","","def pop_max(h):","    top = h[0]","    last = h.pop()","    if h:","        h[0] = last","        sift_down(h, 0)   # swap with the larger child","    return top"],
    gen(s) { const v = cap(nums(s), 10), h = [], fr = [];
      v.forEach((x) => { h.push(x); let i = h.length - 1; fr.push(F(1, `Insert ${x} at the end of the array (the next free spot in the tree).`, [heapTree(h, { [i]: "act" }), arr(h)]));
        while (i > 0 && h[(i - 1) >> 1] < h[i]) { const p = (i - 1) >> 1; [h[p], h[i]] = [h[i], h[p]]; fr.push(F(5, `${h[p]} is bigger than its parent ${h[i]}: swap it up.`, [heapTree(h, { [p]: "swap", [i]: "swap" }), arr(h, { hl: { [p]: "swap", [i]: "swap" } })])); i = p; } });
      fr.push(F(3, "Every parent ≥ its children, so the heap property holds. Array index i has children 2i+1 and 2i+2.", [heapTree(h), arr(h)]));
      const top = h[0]; h[0] = h.pop(); let i = 0;
      fr.push(F(12, `Extract max ${top}: move the last element (${h[0]}) to the root.`, [heapTree(h, { 0: "act" }), arr(h)]));
      for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < h.length && h[l] > h[m]) m = l; if (r < h.length && h[r] > h[m]) m = r; if (m === i) break;
        [h[i], h[m]] = [h[m], h[i]]; fr.push(F(13, `${h[m]} is smaller than its larger child ${h[i]}: swap it down.`, [heapTree(h, { [i]: "swap", [m]: "swap" }), arr(h, { hl: { [i]: "swap", [m]: "swap" } })])); i = m; }
      fr.push(F(14, `Returned ${top}. Insert and extract are O(log N); peek is O(1).`, [heapTree(h), arr(h)])); return fr; } };

  /* ═════════ TRIE ═════════ */
  A.trie = { title: "Trie: insert words, then search a prefix", inputLabel: "words | prefix", input: "car cat cart dog do | ca",
    about: "Each node is one character; a path from the root spells a prefix and ✓ marks the end of a word. Words that share a prefix share nodes. The prefix search walks one node per character, then collects every word below.",
    code: ["def insert(root, w):","    node = root","    for ch in w:","        node = node.children.setdefault(ch, Node())","    node.end = True","","def starts_with(root, p):","    node = root","    for ch in p:","        if ch not in node.children:","            return []","        node = node.children[ch]","    return words_below(node)"],
    gen(s) { const [w0, p0] = split2(s); const words = cap(String(w0).split(/\s+/).filter(Boolean), 7, "words"), pre = (p0 || "").trim(), fr = [];
      const nodes = [{ id: 0, label: "•", parent: null }], kids = { 0: {} }; let id = 1;
      words.forEach((w) => { let cur = 0; const path = [];
        for (const ch of w) { if (kids[cur][ch] == null) { kids[cur][ch] = id; kids[id] = {}; nodes.push({ id, label: ch, parent: cur, ord: id }); id++; } cur = kids[cur][ch]; path.push(cur); }
        nodes[cur].tag = "✓"; fr.push(F(4, `Inserted "${w}": walk or create one node per character, then mark the last node as a word end (✓). Shared prefixes reuse existing nodes.`, [{ t: "tree", binary: false, nodes: nodes.map((n) => ({ ...n, cls: path.includes(n.id) ? "act" : n.tag ? "done" : "" })) }])); });
      let cur = 0; const path = [0];
      for (const ch of pre) { if (kids[cur][ch] == null) { fr.push(F(10, `No child '${ch}': no word starts with "${pre}"`, [{ t: "tree", binary: false, nodes: nodes.map((n) => ({ ...n, cls: path.includes(n.id) ? "bad" : "" })) }])); return fr; } cur = kids[cur][ch]; path.push(cur); }
      const sub = []; const coll = (n, acc) => { if (nodes[n].tag) sub.push(acc); Object.entries(kids[n]).forEach(([c, k]) => coll(k, acc + c)); }; coll(cur, pre);
      fr.push(F(12, `Walked "${pre}" in O(|prefix|). Words below: <b>${sub.join(", ")}</b>`, [{ t: "tree", binary: false, nodes: nodes.map((n) => ({ ...n, cls: path.includes(n.id) ? "found" : n.tag ? "done" : "" })) }, chips("matches", sub)])); return fr; } };

  /* ═════════ TREES ═════════ */
  const buildTree = (s) => { const t = String(s).split(/[\s,]+/).filter(Boolean).map((x) => (/^(null|n|#|-)$/i.test(x) ? null : x)); cap(t, 15, "nodes");
    const nodes = []; if (!t.length || t[0] == null) return nodes; nodes.push({ id: 0, label: t[0], parent: null, side: null }); const q = [0]; let i = 1;
    while (q.length && i < t.length) { const p = q.shift(); for (const side of ["L", "R"]) { if (i < t.length && t[i] != null) { const id = nodes.length; nodes.push({ id, label: t[i], parent: p, side }); q.push(id); } i++; } }
    return nodes; };
  const child = (nodes, id, side) => nodes.find((n) => n.parent === id && n.side === side);
  const travCode = {
    pre: ["def preorder(node):", "    if not node:", "        return", "    visit(node)", "    preorder(node.left)", "    preorder(node.right)"],
    in: ["def inorder(node):", "    if not node:", "        return", "    inorder(node.left)", "    visit(node)", "    inorder(node.right)"],
    post: ["def postorder(node):", "    if not node:", "        return", "    postorder(node.left)", "    postorder(node.right)", "    visit(node)"] };
  const travAbout = {
    pre: "Visit a node <b>before</b> its subtrees: node, then left, then right. The highlighted node is the current call; each visited node is tagged with its position in the output.",
    in: "Visit a node <b>between</b> its subtrees: left, then node, then right. The highlighted node is the current call; each visited node is tagged with its position in the output.",
    post: "Visit a node <b>after</b> both subtrees: left, then right, then node. The highlighted node is the current call; each visited node is tagged with its position in the output." };
  ["pre", "in", "post"].forEach((kind) => {
    A[kind + "order"] = { title: `${kind[0].toUpperCase() + kind.slice(1)}order traversal`, inputLabel: "level order (null = empty)", input: "1 2 3 4 5 null 6", about: travAbout[kind], code: travCode[kind],
      gen(s) { const nodes = buildTree(s), fr = [], out = [], vis = {};
        const panels = (cur) => [{ t: "tree", nodes: nodes.map((n) => ({ ...n, cls: n.id === cur ? "act" : vis[n.id] ? "done" : "" , tag: vis[n.id] })) }, chips("output", out.slice())];
        const go = (n) => { if (!n) return; fr.push(F(0, `Call ${kind}order(${n.label}).`, panels(n.id)));
          const order = kind === "pre" ? ["v", "L", "R"] : kind === "in" ? ["L", "v", "R"] : ["L", "R", "v"];
          order.forEach((step) => { if (step === "v") { out.push(n.label); vis[n.id] = out.length; fr.push(F(kind === "pre" ? 3 : kind === "in" ? 4 : 5, `Visit ${n.label}: it is output #${out.length}.`, panels(n.id))); } else go(child(nodes, n.id, step)); }); };
        go(nodes[0]); fr.push(F(-1, `${kind}order: <b>${out.join(" → ")}</b>. O(N) time, O(height) stack.${kind === "in" ? " On a BST this gives sorted order." : ""}`, panels(-1))); return fr; } };
  });
  A.levelorder = { title: "Level-order traversal (BFS with a queue)", inputLabel: "level order (null = empty)", input: "1 2 3 4 5 null 6",
    about: "The queue holds nodes waiting to be visited, oldest first. Each step dequeues one node, visits it, and enqueues its children, so the tree is read level by level.",
    code: ["q = deque([root])","while q:","    node = q.popleft()","    visit(node)","    if node.left:","        q.append(node.left)","    if node.right:","        q.append(node.right)"],
    gen(s) { const nodes = buildTree(s), fr = [], out = [], vis = {}; const q = nodes.length ? [nodes[0]] : [];
      const P = (cur) => [{ t: "tree", nodes: nodes.map((n) => ({ ...n, cls: n.id === cur ? "act" : vis[n.id] ? "done" : q.includes(n) ? "cmp" : "", tag: vis[n.id] })) }, chips("queue", q.map((n) => n.label)), chips("output", out.slice())];
      fr.push(F(0, "Start with the root in the queue", P(-1)));
      while (q.length) { const n = q.shift(); out.push(n.label); vis[n.id] = out.length; fr.push(F(3, `Dequeue ${n.label} from the front and visit it.`, P(n.id)));
        ["L", "R"].forEach((sd, k) => { const c = child(nodes, n.id, sd); if (c) { q.push(c); fr.push(F(5 + 2 * k, `Enqueue ${n.label}'s ${k ? "right" : "left"} child ${c.label}.`, P(n.id))); } }); }
      fr.push(F(-1, `Level order: <b>${out.join(" → ")}</b>`, P(-1))); return fr; } };

  A.bst = { title: "Binary search tree: insert, then search", inputLabel: "insert order | search", input: "50 30 70 20 40 60 80 35 | 35",
    about: "Every value in a node's left subtree is smaller and every value in its right subtree is bigger. Inserting and searching both follow one root-to-leaf path, choosing left or right at each node.",
    code: ["def insert(root, x):","    node = root","    while True:","        side = 'left' if x < node.val else 'right'","        if getattr(node, side) is None:","            setattr(node, side, Node(x))   # attach here","            return","        node = getattr(node, side)","","def search(node, x):","    while node and node.val != x:","        node = node.left if x < node.val else node.right","    return node"],
    gen(s) { const [v0, t0] = split2(s); const v = cap(nums(v0), 12), t = nums(t0)[0], nodes = [], fr = [];
      const T = (hl = {}) => ({ t: "tree", nodes: nodes.map((n) => ({ ...n, cls: hl[n.id] || "" })) });
      v.forEach((x) => { if (!nodes.length) { nodes.push({ id: 0, label: x, parent: null, side: null }); fr.push(F(0, `The tree is empty, so ${x} becomes the root.`, [T({ 0: "act" })])); return; }
        let cur = 0; const path = {}; for (;;) { path[cur] = "cmp"; const side = x < nodes[cur].label ? "L" : "R"; const c = child(nodes, cur, side); if (!c) { const id = nodes.length; nodes.push({ id, label: x, parent: cur, side }); path[id] = "act"; break; } cur = c.id; }
        fr.push(F(5, `Insert ${x}: at each node go left if ${x} is smaller, else right, and attach it at the first empty spot.`, [T(path)])); });
      if (t != null) { let cur = 0, steps = 0; const path = {};
        while (cur != null) { steps++; path[cur] = "cmp"; const n = nodes[cur]; fr.push(F(10, `Search ${t}: compare with ${n.label}${n.label === t ? "" : t < n.label ? ", smaller so go left" : ", bigger so go right"}.`, [T(path)]));
          if (n.label === t) { path[cur] = "found"; fr.push(F(12, `Found ${t} in ${steps} comparisons (the height of the path), not N.`, [T(path)])); return fr; }
          const c = child(nodes, cur, t < n.label ? "L" : "R"); cur = c ? c.id : null; }
        fr.push(F(12, `Fell off the tree: ${t} not found.`, [T(path)])); }
      return fr; } };

  /* ═════════ GRAPHS ═════════ */
  const G = { nodes: [{ id: "A", x: 70, y: 150 }, { id: "B", x: 190, y: 60 }, { id: "C", x: 190, y: 240 }, { id: "D", x: 320, y: 60 }, { id: "E", x: 320, y: 240 }, { id: "F", x: 450, y: 150 }], edges: [["A", "B", 4], ["A", "C", 2], ["B", "C", 1], ["B", "D", 5], ["C", "E", 8], ["D", "E", 2], ["D", "F", 6], ["E", "F", 3]] };
  const adj = (edges, dir) => { const m = {}; G.nodes.forEach((n) => (m[n.id] = [])); edges.forEach(([a, b, w]) => { m[a].push([b, w]); if (!dir) m[b].push([a, w]); }); Object.values(m).forEach((l) => l.sort()); return m; };
  const gp = (cls, tags = {}, ecls = {}, weights) => ({ t: "graph", nodes: G.nodes.map((n) => ({ ...n, cls: cls[n.id] || "", tag: tags[n.id] })), edges: G.edges.map(([a, b, w]) => [a, b, weights ? w : null, ecls[a + b] || ecls[b + a] || ""]) });
  A.bfs = { title: "Breadth-first search", inputLabel: "start node", input: "A",
    about: "Starting from the source, BFS visits nodes ring by ring. The queue holds discovered nodes waiting their turn; each node's tag is its distance in edges from the start, and highlighted edges form the BFS tree.",
    code: ["dist = {s: 0}","q = deque([s])","while q:","    u = q.popleft()","    for v in adj[u]:","        if v not in dist:","            dist[v] = dist[u] + 1","            q.append(v)"],
    gen(s) { const st = (String(s).trim().toUpperCase() || "A")[0], m = adj(G.edges), fr = [], cls = {}, dist = { [st]: 0 }, ecls = {}; if (!m[st]) throw new Error("Use a node A–F"); const q = [st]; cls[st] = "cmp";
      fr.push(F(1, `Start at ${st}: dist[${st}] = 0 and it is the only node in the queue.`, [gp(cls, dist, ecls), chips("queue", q.slice())]));
      while (q.length) { const u = q.shift(); cls[u] = "act"; fr.push(F(3, `Dequeue ${u} (distance ${dist[u]}) and look at its neighbours.`, [gp(cls, dist, ecls), chips("queue", q.slice())]));
        m[u].forEach(([v]) => { if (dist[v] == null) { dist[v] = dist[u] + 1; cls[v] = "cmp"; ecls[u + v] = "tree"; q.push(v); fr.push(F(6, `${v} is new: dist[${v}] = dist[${u}] + 1 = ${dist[v]}, enqueue it.`, [gp(cls, dist, ecls), chips("queue", q.slice())])); } });
        cls[u] = "done"; }
      fr.push(F(-1, "Distances (number of edges) from the start. BFS explores in rings: O(V + E). Shortest paths in unweighted graphs.", [gp(cls, dist, ecls)])); return fr; } };
  A.dfs = { title: "Depth-first search", inputLabel: "start node", input: "A",
    about: "DFS follows one path as deep as it can, then backs up. Each node's tag is its visit order, the recursion stack shows the current path, and highlighted edges form the DFS tree.",
    code: ["def dfs(u):","    visited.add(u)","    for v in adj[u]:","        if v not in visited:","            dfs(v)","    # all neighbours done: backtrack"],
    gen(s) { const st = (String(s).trim().toUpperCase() || "A")[0], m = adj(G.edges), fr = [], cls = {}, ord = {}, ecls = {}, stack = []; if (!m[st]) throw new Error("Use a node A–F"); let k = 0;
      const go = (u) => { cls[u] = "act"; ord[u] = ++k; stack.push(u); fr.push(F(1, `Visit ${u} (#${ord[u]}) and push it on the recursion stack.`, [gp(cls, ord, ecls), chips("recursion stack", stack.slice().reverse(), true)]));
        m[u].forEach(([v]) => { if (!ord[v]) { ecls[u + v] = "tree"; cls[u] = "cmp"; go(v); cls[u] = "act"; fr.push(F(4, `dfs(${v}) finished: back at ${u}, try its next unvisited neighbour.`, [gp(cls, ord, ecls), chips("recursion stack", stack.slice().reverse(), true)])); } });
        cls[u] = "done"; stack.pop(); };
      go(st); fr.push(F(-1, "Visit order shown on each node. DFS goes deep before wide: O(V + E). Used for components, cycles, topological sort, backtracking.", [gp(cls, ord, ecls)])); return fr; } };
  A.dijkstra = { title: "Dijkstra's shortest paths", inputLabel: "source", input: "A",
    about: "Node tags are the best known distances (∞ = not reached yet). The priority queue always pops the closest unfinished node, whose distance is then final, and relaxes its edges. Highlighted edges form the shortest-path tree.",
    code: ["dist = {v: float('inf') for v in graph}","dist[s] = 0","pq = [(0, s)]","while pq:","    d, u = heapq.heappop(pq)","    if d > dist[u]:","        continue      # stale entry","    for v, w in adj[u]:","        if d + w < dist[v]:","            dist[v] = d + w","            heapq.heappush(pq, (dist[v], v))"],
    gen(s) { const st = (String(s).trim().toUpperCase() || "A")[0], m = adj(G.edges), fr = [], cls = {}, dist = {}, ecls = {}, par = {}; if (!m[st]) throw new Error("Use a node A–F");
      G.nodes.forEach((n) => (dist[n.id] = Infinity)); dist[st] = 0; let pq = [[0, st]];
      const tags = () => Object.fromEntries(Object.entries(dist).map(([k, v]) => [k, v === Infinity ? "∞" : v]));
      const P = () => [gp(cls, tags(), ecls, true), chips("priority queue (dist, node)", pq.slice().sort((a, b) => a[0] - b[0]).map(([d, u]) => `(${d}, ${u})`))];
      fr.push(F(2, `dist[${st}] = 0, every other node is ∞. Push (0, ${st}).`, P()));
      while (pq.length) { pq.sort((a, b) => a[0] - b[0]); const [d, u] = pq.shift();
        if (d > dist[u]) { fr.push(F(6, `(${d}, ${u}) is stale: ${u} was already finalised with distance ${dist[u]}. Skip it.`, P())); continue; }
        cls[u] = "act"; fr.push(F(4, `Pop ${u} with distance ${d}: it's final now`, P()));
        m[u].forEach(([v, w]) => { if (d + w < dist[v]) { dist[v] = d + w; if (par[v]) ecls[par[v] + v] = ""; par[v] = u; ecls[u + v] = "tree"; pq.push([dist[v], v]); cls[v] = cls[v] === "done" ? "done" : "cmp"; fr.push(F(9, `Relax ${u}→${v}: ${d} + ${w} = ${dist[v]} beats the old distance, so update it and push (${dist[v]}, ${v}).`, P())); } });
        cls[u] = "done"; }
      fr.push(F(-1, "Highlighted edges form the shortest-path tree. O((V + E) log V) with a heap; needs non-negative weights.", [gp(cls, tags(), ecls, true)])); return fr; } };
  A.topo = { title: "Topological sort (Kahn's algorithm)", inputLabel: null, input: "",
    about: "Each course's tag is its indegree (unmet prerequisites). Courses with indegree 0 wait in the queue; taking one removes its outgoing edges, which may free up further courses.",
    code: ["indeg = count_incoming_edges(adj)","q = deque(v for v in adj if indeg[v] == 0)","order = []","while q:","    u = q.popleft()","    order.append(u)","    for v in adj[u]:","        indeg[v] -= 1","        if indeg[v] == 0:","            q.append(v)","if len(order) < len(adj):","    raise ValueError('graph has a cycle')","return order"],
    gen() { const nodes = [{ id: "Math", x: 70, y: 70 }, { id: "Prog", x: 70, y: 230 }, { id: "DSA", x: 220, y: 150 }, { id: "OS", x: 360, y: 60 }, { id: "DB", x: 360, y: 240 }, { id: "SD", x: 480, y: 150 }], edges = [["Math", "DSA"], ["Prog", "DSA"], ["Prog", "OS"], ["DSA", "DB"], ["OS", "SD"], ["DB", "SD"], ["DSA", "SD"]];
      const indeg = {}, m = {}; nodes.forEach((n) => { indeg[n.id] = 0; m[n.id] = []; }); edges.forEach(([a, b]) => { m[a].push(b); indeg[b]++; });
      const cls = {}, order = [], fr = []; const q = nodes.filter((n) => !indeg[n.id]).map((n) => n.id);
      const P = () => [{ t: "graph", dir: true, nodes: nodes.map((n) => ({ ...n, label: n.id, cls: cls[n.id] || (q.includes(n.id) ? "cmp" : ""), tag: "in:" + indeg[n.id] })), edges: edges.map(([a, b]) => [a, b, null, order.includes(a) ? "dim" : ""]) }, chips("queue (indegree 0)", q.slice()), chips("order", order.slice())];
      fr.push(F(1, "Courses with no prerequisites start in the queue.", P()));
      while (q.length) { const u = q.shift(); order.push(u); cls[u] = "done"; fr.push(F(5, `Dequeue ${u} and add it to the order. Its outgoing edges lower the indegree of ${m[u].join(", ") || "no one"}.`, P()));
        m[u].forEach((v) => { indeg[v]--; if (!indeg[v]) { q.push(v); fr.push(F(9, `${v}'s indegree dropped to 0, so all its prerequisites are done: enqueue it.`, P())); } }); }
      fr.push(F(12, `Order: <b>${order.join(" → ")}</b>. O(V + E). If some nodes never reach indegree 0, there's a cycle.`, P())); return fr; } };
  A.unionFind = { title: "Union-Find (disjoint set union)", inputLabel: "edges like 0-1 2-3 …", input: "0-1 2-3 1-2 4-5 3-0",
    about: "Each set is a tree; its root is the set's name, and <b>parent</b> stores every node's parent. For each edge we find both roots: equal roots mean the edge closes a cycle, otherwise the smaller tree is hung under the larger one.",
    code: ["def find(x):","    if parent[x] != x:","        parent[x] = find(parent[x])   # path compression","    return parent[x]","","def union(a, b):","    ra, rb = find(a), find(b)","    if ra == rb:","        return False     # already connected: cycle","    if size[ra] < size[rb]:","        ra, rb = rb, ra","    parent[rb] = ra      # smaller tree under larger","    size[ra] += size[rb]","    return True"],
    gen(s) { const es = cap(String(s).split(/\s+/).filter(Boolean).map((e) => e.split("-").map(Number)), 10, "edges"); const n = Math.max(2, ...es.flat().map((x) => x + 1)); if (n > 10) throw new Error("Use nodes 0–9");
      const par = Array.from({ length: n }, (_, i) => i), size = Array(n).fill(1), fr = [];
      const find = (x) => (par[x] === x ? x : (par[x] = find(par[x])));
      const forest = (hl = {}) => ({ t: "tree", binary: false, nodes: par.map((p, i) => ({ id: i, label: i, parent: p === i ? null : p, cls: hl[i] || "" })) });
      fr.push(F(-1, "Every node starts as its own set.", [forest(), arr(par, { label: "parent" })]));
      es.forEach(([a, b]) => { const ra = find(a), rb = find(b);
        if (ra === rb) { fr.push(F(8, `${a} and ${b} already share root ${ra}: this edge closes a cycle`, [forest({ [a]: "bad", [b]: "bad" }), arr(par, { label: "parent" })])); return; }
        const [big, small] = size[ra] >= size[rb] ? [ra, rb] : [rb, ra]; par[small] = big; size[big] += size[small];
        fr.push(F(11, `Union ${a}–${b}: root ${small} goes under root ${big}`, [forest({ [a]: "act", [b]: "act", [big]: "found" }), arr(par, { label: "parent", hl: { [small]: "done" } })])); });
      fr.push(F(-1, `${new Set(par.map((_, i) => find(i))).size} connected components. Near O(1) per operation with path compression + union by size.`, [forest(), arr(par, { label: "parent" })])); return fr; } };
  A.islands = { title: "Grid flood fill: number of islands", inputLabel: "rows of 0/1 separated by |", input: "11000 | 11010 | 00100 | 00011",
    about: "Scan the grid cell by cell. Each unseen land cell (■) starts a new island, and a flood fill (DFS) colours every land cell connected to it, so it is never counted again.",
    code: ["count = 0","for r in range(R):","    for c in range(C):","        if grid[r][c] == 1 and (r, c) not in seen:","            count += 1","            dfs(r, c)","","def dfs(r, c):","    if not (0 <= r < R and 0 <= c < C):","        return","    if grid[r][c] == 0 or (r, c) in seen:","        return","    seen.add((r, c))","    for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):","        dfs(r + dr, c + dc)"],
    gen(s) { const g = String(s).split("|").map((r) => [...r.trim()].map(Number)).filter((r) => r.length); cap(g, 7, "rows"); g.forEach((r) => cap(r, 9, "columns"));
      const R = g.length, C = g[0].length, seen = {}, fr = [], col = {}; let k = 0;
      const snap = (cur) => ({ t: "grid", rows: g.map((row) => row.map((v) => (v ? "■" : "·"))), hl: { ...Object.fromEntries(Object.entries(seen).map(([key, id]) => [key, "isl" + (id % 4)])), ...(cur ? { [cur]: "act" } : {}) } });
      const dfs = (r, c) => { if (r < 0 || c < 0 || r >= R || c >= C || !g[r][c] || seen[r + "," + c] != null) return; seen[r + "," + c] = k; fr.push(F(12, `Island ${k}: mark (${r}, ${c}) as seen, then try its 4 neighbours.`, [snap(r + "," + c), vars({ islands: k })])); dfs(r + 1, c); dfs(r - 1, c); dfs(r, c + 1); dfs(r, c - 1); };
      for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (g[r][c] && seen[r + "," + c] == null) { k++; fr.push(F(4, `(${r}, ${c}) is land that no flood has reached: island #${k}.`, [snap(r + "," + c), vars({ islands: k })])); dfs(r, c); }
      fr.push(F(-1, `<b>${k}</b> islands. Each cell is visited once: O(R·C).`, [snap(), vars({ islands: k })])); return fr; } };

  /* ═════════ DYNAMIC PROGRAMMING ═════════ */
  A.climbStairs = { title: "1-D DP: climbing stairs (1 or 2 steps)", inputLabel: "n (≤ 15)", input: "7",
    about: "dp[i] is the number of ways to reach step i. The last move onto step i was a 1-step (from i−1) or a 2-step (from i−2), so each cell is the sum of the two before it.",
    code: ["dp = [0] * (n + 1)","dp[0] = 1","dp[1] = 1","for i in range(2, n + 1):","    dp[i] = dp[i - 1] + dp[i - 2]   # last step was 1 or 2","return dp[n]"],
    gen(s) { const n = Math.max(1, Math.min(15, nums(s)[0] || 7)), dp = Array(n + 1).fill(null), fr = []; dp[0] = 1; dp[1] = 1;
      fr.push(F(2, "1 way to stand at step 0, and 1 way to reach step 1.", [arr(dp, { label: "dp", hl: { 0: "done", 1: "done" } })]));
      for (let i = 2; i <= n; i++) { dp[i] = dp[i - 1] + dp[i - 2]; fr.push(F(4, `dp[${i}] = dp[${i - 1}] + dp[${i - 2}] = ${dp[i - 1]} + ${dp[i - 2]} = <b>${dp[i]}</b>`, [arr(dp, { label: "dp", hl: { [i - 1]: "cmp", [i - 2]: "cmp", [i]: "done" } })])); }
      fr.push(F(5, `<b>${dp[n]}</b> ways. O(N) time; only the last two values are needed, so space can be O(1).`, [arr(dp, { label: "dp", hl: { [n]: "found" } })])); return fr; } };
  A.coinChange = { title: "1-D DP: coin change (fewest coins)", inputLabel: "coins | amount", input: "1 3 4 | 6",
    about: "dp[x] is the fewest coins that make amount x (∞ = impossible so far). For each amount we try every coin c as the last coin: dp[x − c] + 1. Only improvements are shown.",
    code: ["dp = [float('inf')] * (amount + 1)","dp[0] = 0","for x in range(1, amount + 1):","    for c in coins:","        if c <= x:","            dp[x] = min(dp[x], dp[x - c] + 1)","return dp[amount] if dp[amount] != float('inf') else -1"],
    gen(s) { const [c0, a0] = split2(s); const coins = cap(nums(c0), 5, "coins"), amt = Math.max(1, Math.min(16, nums(a0)[0] || 6)), dp = Array(amt + 1).fill(Infinity), fr = []; dp[0] = 0;
      const show = (h) => arr(dp.map((v) => (v === Infinity ? "∞" : v)), { label: "dp", hl: h });
      fr.push(F(1, "dp[x] = fewest coins that make x.", [show({ 0: "done" }), chips("coins", coins)]));
      for (let x = 1; x <= amt; x++) { coins.forEach((c) => { if (c <= x && dp[x - c] + 1 < dp[x]) { dp[x] = dp[x - c] + 1; fr.push(F(5, `x = ${x}: ending with coin ${c} costs dp[${x - c}] + 1 = ${dp[x]}, the best so far for ${x}.`, [show({ [x - c]: "cmp", [x]: "act" }), chips("coins", coins)])); } }); }
      fr.push(F(6, dp[amt] === Infinity ? "Impossible." : `<b>${dp[amt]}</b> coins. Greedy (largest coin first) would give 3 for this preset; DP gets the true optimum. O(amount × coins).`, [show({ [amt]: "found" })])); return fr; } };
  A.lcs = { title: "2-D DP: longest common subsequence", inputLabel: "string A | string B", input: "ABCBDAB | BDCABA",
    about: "Cell (i, j) is the LCS length of the first i letters of A (rows) and the first j letters of B (columns). Equal letters extend the diagonal; otherwise take the better of the cell above and the cell to the left.",
    code: ["dp = [[0] * (m + 1) for _ in range(n + 1)]","for i in range(1, n + 1):","    for j in range(1, m + 1):","        if A[i - 1] == B[j - 1]:","            dp[i][j] = dp[i - 1][j - 1] + 1","        else:","            dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])","return dp[n][m]"],
    gen(s) { const [x0, y0] = split2(s); const X = cap([...(x0 || "")], 8, "characters"), Y = cap([...(y0 || "")], 8, "characters"), n = X.length, m = Y.length, dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0)), fr = [];
      const G2 = (hl) => ({ t: "grid", ch: ["∅", ...Y], rh: ["∅", ...X], rows: dp.map((r) => r.slice()), hl });
      for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) {
        if (X[i - 1] === Y[j - 1]) { dp[i][j] = dp[i - 1][j - 1] + 1; fr.push(F(4, `'${X[i - 1]}' = '${Y[j - 1]}': diagonal + 1 = ${dp[i][j]}`, [G2({ [i + "," + j]: "found", [(i - 1) + "," + (j - 1)]: "cmp" })])); }
        else { dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]); fr.push(F(6, `'${X[i - 1]}' ≠ '${Y[j - 1]}': max(up ${dp[i - 1][j]}, left ${dp[i][j - 1]}) = ${dp[i][j]}`, [G2({ [i + "," + j]: "act", [(i - 1) + "," + j]: "cmp", [i + "," + (j - 1)]: "cmp" })])); } }
      let i = n, j = m, out = []; const path = {}; while (i && j) { path[i + "," + j] = "done"; if (X[i - 1] === Y[j - 1]) { out.unshift(X[i - 1]); i--; j--; } else if (dp[i - 1][j] >= dp[i][j - 1]) i--; else j--; }
      fr.push(F(7, `LCS length <b>${dp[n][m]}</b>, e.g. "${out.join("")}" (traced back through the table). O(n·m).`, [G2(path)])); return fr; } };
  A.knapsack = { title: "2-D DP: 0/1 knapsack", inputLabel: "weights | values | capacity", input: "1 3 4 5 | 1 4 5 7 | 7",
    about: "Row i considers the first i items, column w is the capacity. Each cell starts as \"skip item i\" (the cell above) and is replaced by \"take item i\" (its value + the row above at w − weight) when that is better.",
    code: ["dp = [[0] * (W + 1) for _ in range(n + 1)]","for i in range(1, n + 1):","    for w in range(W + 1):","        dp[i][w] = dp[i - 1][w]          # skip item i","        if wt[i - 1] <= w:","            take = val[i - 1] + dp[i - 1][w - wt[i - 1]]","            dp[i][w] = max(dp[i][w], take)   # take item i","return dp[n][W]"],
    gen(s) { const [w0, v0, c0] = split2(s); const wt = cap(nums(w0), 5, "items"), val = nums(v0), W = Math.max(1, Math.min(10, nums(c0)[0] || 7)), n = wt.length, dp = Array.from({ length: n + 1 }, () => Array(W + 1).fill(0)), fr = [];
      const G2 = (hl) => ({ t: "grid", ch: Array.from({ length: W + 1 }, (_, k) => "w" + k), rh: ["none", ...wt.map((w, k) => `#${k + 1} (${w}kg, ₹${val[k]})`)], rows: dp.map((r) => r.slice()), hl });
      for (let i = 1; i <= n; i++) for (let w = 0; w <= W; w++) { dp[i][w] = dp[i - 1][w]; const h = { [i + "," + w]: "act", [(i - 1) + "," + w]: "cmp" };
        if (wt[i - 1] <= w && val[i - 1] + dp[i - 1][w - wt[i - 1]] > dp[i][w]) { dp[i][w] = val[i - 1] + dp[i - 1][w - wt[i - 1]]; h[(i - 1) + "," + (w - wt[i - 1])] = "found"; fr.push(F(6, `Capacity ${w}: taking item ${i} gives ${val[i - 1]} + dp[${i - 1}][${w - wt[i - 1]}] = ${dp[i][w]}, better than skipping (${dp[i - 1][w]}).`, [G2(h)])); }
        else if (w % 2 === 0 || w === W) fr.push(F(3, `Capacity ${w}: item ${i} ${wt[i - 1] > w ? "doesn't fit" : "isn't worth taking"}, so copy the cell above: ${dp[i][w]}.`, [G2(h)])); }
      fr.push(F(7, `Best value <b>${dp[n][W]}</b> with capacity ${W}. O(n·W).`, [G2({ [n + "," + W]: "found" })])); return fr; } };
  A.lis = { title: "DP: longest increasing subsequence (O(N²))", inputLabel: "array", input: "10 9 2 5 3 7 101 18",
    about: "dp[i] is the length of the longest increasing subsequence that ends at a[i]. For each i we look back at every smaller earlier value a[j] and extend its best subsequence by one.",
    code: ["dp = [1] * n        # LIS ending at i","for i in range(n):","    for j in range(i):","        if a[j] < a[i]:","            dp[i] = max(dp[i], dp[j] + 1)","return max(dp)"],
    gen(s) { const a = cap(nums(s), 12), dp = a.map(() => 1), fr = [];
      fr.push(F(0, "Every element on its own is an increasing subsequence, so dp starts at 1 everywhere.", [arr(a), arr(dp, { label: "dp" })]));
      for (let i = 1; i < a.length; i++) { for (let j = 0; j < i; j++) if (a[j] < a[i] && dp[j] + 1 > dp[i]) { dp[i] = dp[j] + 1; fr.push(F(4, `${a[j]} < ${a[i]}: extend the LIS ending at ${j} → dp[${i}] = ${dp[i]}`, [arr(a, { hl: { [i]: "act", [j]: "cmp" } }), arr(dp, { label: "dp", hl: { [i]: "done" } })])); }
        fr.push(F(1, `Checked every j < ${i}: the longest increasing subsequence ending at ${a[i]} has length dp[${i}] = ${dp[i]}.`, [arr(a, { hl: { [i]: "act" } }), arr(dp, { label: "dp", hl: { [i]: "done" } })])); }
      const best = Math.max(...dp); fr.push(F(5, `LIS length = <b>${best}</b>. (Patience sorting with binary search does it in O(N log N).)`, [arr(a), arr(dp, { label: "dp", hl: { [dp.indexOf(best)]: "found" } })])); return fr; } };

  /* ═════════ GREEDY ═════════ */
  A.activitySelection = { title: "Greedy: activity selection (max non-overlapping)", inputLabel: "intervals like 1-4 3-5 …", input: "1-4 3-5 0-6 5-7 3-9 5-9 6-10 8-11 8-12 2-14 12-16",
    about: "Intervals are drawn on a timeline, sorted by end time. Scanning in that order, take an interval whenever it starts at or after the end of the last one taken; otherwise it overlaps and is skipped.",
    code: ["intervals.sort(key=lambda iv: iv[1])   # by END time","last_end = float('-inf')","count = 0","for s, e in intervals:","    if s >= last_end:","        count += 1      # take it","        last_end = e","return count"],
    gen(s) { const iv = cap(String(s).split(/\s+/).filter(Boolean).map((p) => p.split("-").map(Number)), 12, "intervals").sort((a, b) => a[1] - b[1]), mx = Math.max(...iv.map((x) => x[1])), fr = [], cls = iv.map(() => ""); let last = -Infinity, taken = 0;
      const P = () => [{ t: "intervals", max: mx, items: iv.map(([a, b], k) => ({ s: a, e: b, label: `#${k + 1}`, cls: cls[k] })) }, vars({ "last end": last === -Infinity ? "−∞" : last, taken })];
      fr.push(F(0, "Sorted by end time: finishing early leaves the most room for later activities.", P()));
      iv.forEach(([a, b], k) => { if (a >= last) { const prev = last; cls[k] = "take"; last = b; taken++; fr.push(F(6, `#${k + 1} (${a}–${b}) starts at or after the last end (${prev === -Infinity ? "−∞" : prev}): take it, last end = ${b}.`, P())); } else { cls[k] = "skip"; fr.push(F(4, `#${k + 1} (${a}–${b}) starts before the last end (${last}): it overlaps, skip it.`, P())); } });
      fr.push(F(7, `<b>${taken}</b> activities. O(N log N) for the sort. Exchange argument: swapping any chosen interval for the earliest-ending one never hurts.`, P())); return fr; } };
})();

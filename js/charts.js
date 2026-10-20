/* Blueprint — tiny animated SVG charts (no dependencies).
 * BP.chart(el, spec) renders one chart. Specs:
 *   { type: "bar",  title, data: [[label, value, note?]], unit, log, fmt, max }
 *   { type: "line", title, x: { label, values }, y: { label, log }, series: [{ name, values, dashed }], fmt, unit }
 *   { type: "donut", title, data: [[label, value]], center, sub }
 * Colours come from the page accent (--c) plus neutral greys, so every chart reads as one system.
 */
window.BP = window.BP || {};
(function () {
  const PALETTE = ["var(--c)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
  const SI = [[1e15, "P"], [1e12, "T"], [1e9, "B"], [1e6, "M"], [1e3, "k"]];
  function compact(v) {
    const a = Math.abs(v);
    for (const [n, s] of SI) if (a >= n) { const x = v / n; return (x >= 100 ? x.toFixed(0) : x >= 10 ? x.toFixed(x % 1 ? 1 : 0) : x.toFixed(x % 1 ? 1 : 0)).replace(/\.0$/, "") + s; }
    if (a > 0 && a < 1) return (+v.toPrecision(2)).toString();
    return (+v.toFixed(v % 1 ? 1 : 0)).toLocaleString();
  }
  const FMT = {
    num: (v, u = "") => compact(v) + (u ? " " + u : ""),
    pct: (v) => (v >= 10 ? Math.round(v) : +v.toFixed(1)) + "%",
    ms: (v) => (v >= 1000 ? +(v / 1000).toFixed(1) + " s" : v >= 1 ? +v.toFixed(v < 10 ? 1 : 0) + " ms" : +(v * 1000).toFixed(0) + " µs"),
    bytes: (v) => { const u = [[1e15, "PB"], [1e12, "TB"], [1e9, "GB"], [1e6, "MB"], [1e3, "KB"]]; for (const [n, s] of u) if (v >= n) return +(v / n).toFixed(v / n < 10 ? 1 : 0) + " " + s; return v + " B"; },
    ns: (v) => (v >= 1e9 ? +(v / 1e9).toFixed(1) + " s" : v >= 1e6 ? +(v / 1e6).toFixed(v < 1e7 ? 1 : 0) + " ms" : v >= 1e3 ? +(v / 1e3).toFixed(0) + " µs" : v + " ns")
  };
  const fmtOf = (spec) => (v) => (FMT[spec.fmt] || FMT.num)(v, spec.unit);

  function head(spec) {
    return `<div class="ch-head"><b>${spec.title}</b>${spec.sub ? `<span>${spec.sub}</span>` : ""}</div>`;
  }
  function foot(spec) { return spec.note ? `<div class="ch-note">${spec.note}</div>` : ""; }

  function bar(el, spec) {
    const f = fmtOf(spec), vals = spec.data.map((d) => d[1]);
    const max = spec.max || Math.max(...vals);
    const lmin = Math.log10(Math.min(...vals.filter((v) => v > 0))) - 0.5, lmax = Math.log10(max);
    const scale = (v) => (spec.log ? Math.max(0.03, (Math.log10(Math.max(v, 1e-9)) - lmin) / (lmax - lmin)) : Math.max(0.01, v / max));
    el.innerHTML = `<div class="chart">${head(spec)}<div class="ch-bars">${spec.data.map(([l, v, n], i) => `
      <div class="ch-row"><span class="ch-l">${l}</span><div class="ch-track"><i style="--w:${(scale(v) * 100).toFixed(1)}%;background:${spec.colors ? spec.colors[i] : i === (spec.highlight ?? -1) ? "var(--c)" : spec.highlight === undefined ? "var(--c)" : "color-mix(in srgb, var(--c) 38%, var(--panel2))"};transition-delay:${i * 70}ms"></i></div><span class="ch-v">${f(v)}${n ? ` <small>${n}</small>` : ""}</span></div>`).join("")}</div>${spec.log ? `<div class="ch-note">Log scale: each step is ×10.</div>` : ""}${foot(spec)}</div>`;
    requestAnimationFrame(() => setTimeout(() => el.querySelectorAll(".ch-track i").forEach((b) => (b.style.width = b.style.getPropertyValue("--w"))), 60));
  }

  function line(el, spec) {
    const W = 640, H = 280, L = 58, R = 120, T = 32, B = 40;
    const xs = spec.x.values, f = fmtOf(spec);
    const all = spec.series.flatMap((s) => s.values).filter((v) => v != null);
    let ymax = spec.y.max ?? Math.max(...all), ymin = spec.y.min ?? 0;
    const lg = spec.y.log;
    if (lg) { ymin = Math.pow(10, Math.floor(Math.log10(Math.min(...all.filter((v) => v > 0))))); ymax = Math.pow(10, Math.ceil(Math.log10(ymax))); }
    else { const m = Math.pow(10, Math.floor(Math.log10(ymax || 1))); ymax = Math.ceil(ymax / m) * m; }
    const X = (i) => L + (i / (xs.length - 1)) * (W - L - R);
    const Y = (v) => lg ? T + (1 - (Math.log10(v) - Math.log10(ymin)) / (Math.log10(ymax) - Math.log10(ymin))) * (H - T - B) : T + (1 - (v - ymin) / (ymax - ymin)) * (H - T - B);
    const ticks = lg ? Array.from({ length: Math.round(Math.log10(ymax / ymin)) + 1 }, (_, i) => ymin * Math.pow(10, i)).filter((_, i, a) => a.length <= 6 || i % 2 === 0) : [0, 0.25, 0.5, 0.75, 1].map((k) => ymin + k * (ymax - ymin));
    const xEvery = Math.ceil(xs.length / 8);
    let g = ticks.map((t) => `<line x1="${L}" x2="${W - R}" y1="${Y(t)}" y2="${Y(t)}" class="ch-grid"/><text x="${L - 8}" y="${Y(t) + 4}" text-anchor="end" class="ch-tick">${f(t)}</text>`).join("");
    g += xs.map((x, i) => (i % xEvery === 0 || i === xs.length - 1 ? `<text x="${X(i)}" y="${H - B + 18}" text-anchor="middle" class="ch-tick">${x}</text>` : "")).join("");
    g += `<text x="${(L + W - R) / 2}" y="${H - 4}" text-anchor="middle" class="ch-axis">${spec.x.label}</text>`;
    if (spec.y.label) g += `<text x="${L - 8}" y="14" class="ch-axis">↑ ${spec.y.label}</text>`;
    if (spec.band) g += `<rect x="${X(spec.band[0])}" y="${T}" width="${X(spec.band[1]) - X(spec.band[0])}" height="${H - T - B}" class="ch-band"/><text x="${(X(spec.band[0]) + X(spec.band[1])) / 2}" y="${T + 14}" text-anchor="middle" class="ch-tick">${spec.band[2] || ""}</text>`;
    const labels = [];
    spec.series.forEach((s, si) => {
      const col = s.color || PALETTE[si];
      const pts = s.values.map((v, i) => (v == null ? null : [X(i), Y(lg ? Math.max(v, ymin) : v)])).filter(Boolean);
      const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
      g += `<path d="${d}" class="ch-line ${s.dashed ? "dashed" : ""}" style="stroke:${col}"/>`;
      pts.forEach((p, i) => (g += `<circle cx="${p[0]}" cy="${p[1]}" r="3" class="ch-pt" style="fill:${col};animation-delay:${0.9 + i * 0.03}s"><title>${s.name}: ${xs[i]} → ${f(s.values[i])}</title></circle>`));
      const last = pts[pts.length - 1];
      labels.push({ y: last[1], x: last[0], name: s.name, col, v: f(s.values[s.values.length - 1]) });
    });
    labels.sort((a, b) => a.y - b.y).forEach((l, i, a) => { if (i && l.y - a[i - 1].y < 26) l.y = a[i - 1].y + 26; });
    labels.forEach((l) => (g += `<text x="${l.x + 10}" y="${l.y + 4}" class="ch-lab" style="fill:${l.col}">${l.name}</text><text x="${l.x + 10}" y="${l.y + 18}" class="ch-tick">${l.v}</text>`));
    el.innerHTML = `<div class="chart">${head(spec)}<svg viewBox="0 0 ${W} ${H}" class="ch-svg">${g}</svg>${foot(spec)}</div>`;
    el.querySelectorAll(".ch-line").forEach((p) => { const len = p.getTotalLength ? p.getTotalLength() : 1000; p.style.strokeDasharray = p.classList.contains("dashed") ? "" : len; p.style.strokeDashoffset = p.classList.contains("dashed") ? 0 : len; requestAnimationFrame(() => setTimeout(() => (p.style.strokeDashoffset = 0), 60)); });
  }

  function donut(el, spec) {
    const total = spec.data.reduce((a, d) => a + d[1], 0), R = 70, C = 2 * Math.PI * R;
    let acc = 0;
    const segs = spec.data.map(([l, v], i) => { const len = (v / total) * C, s = `<circle r="${R}" cx="100" cy="100" class="ch-seg" style="stroke:${spec.colors ? spec.colors[i] : PALETTE[i % PALETTE.length]};--len:${len.toFixed(2)};stroke-dasharray:0 ${C};stroke-dashoffset:${(-acc).toFixed(2)};transition-delay:${i * 120}ms"/>`; acc += len; return s; }).join("");
    el.innerHTML = `<div class="chart">${head(spec)}<div class="ch-donut"><svg viewBox="0 0 200 200">${segs}<text x="100" y="98" text-anchor="middle" class="ch-big">${spec.center || ""}</text><text x="100" y="118" text-anchor="middle" class="ch-tick">${spec.centerSub || ""}</text></svg>
      <ul>${spec.data.map(([l, v], i) => `<li><i style="background:${spec.colors ? spec.colors[i] : PALETTE[i % PALETTE.length]}"></i><span>${l}</span><b>${spec.fmt ? fmtOf(spec)(v) : v}</b></li>`).join("")}</ul></div>${foot(spec)}</div>`;
    requestAnimationFrame(() => setTimeout(() => el.querySelectorAll(".ch-seg").forEach((c) => (c.style.strokeDasharray = `${c.style.getPropertyValue("--len")} ${C}`)), 60));
  }

  BP.chart = (el, spec) => ({ bar, line, donut }[spec.type] || bar)(el, spec);
  BP.chartFmt = FMT;
})();

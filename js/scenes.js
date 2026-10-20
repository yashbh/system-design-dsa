/* Blueprint — animated hero illustrations, drawn in SVG from a small kit of parts.
 * BP.scene({ nodes: [[type, x, y, label?]], links: [[a, b]], blobs: [[cx, cy, r]] }) → SVG string.
 * Parts idle-animate (blinking LEDs, pulsing disks, turning gears) and packets travel the links.
 * Everything takes its colour from --c (the page accent), so a lesson's scene matches its module.
 */
window.BP = window.BP || {};
(function () {
  const A = (attr, values, dur, extra = "") => `<animate attributeName="${attr}" values="${values}" dur="${dur}s" repeatCount="indefinite" ${extra}/>`;
  const ROT = (dur, from = 0) => `<animateTransform attributeName="transform" type="rotate" from="${from} 0 0" to="${from + 360} 0 0" dur="${dur}s" repeatCount="indefinite"/>`;
  const rnd = (i, n) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1; // stable pseudo-random

  const PARTS = {
    server: (i) => `<rect x="-24" y="-32" width="48" height="64" rx="7" class="s-body"/>${[0, 1, 2].map((k) => `<rect x="-17" y="${-25 + k * 19}" width="34" height="13" rx="3" class="s-fill"/><circle cx="10" cy="${-18.5 + k * 19}" r="2.6" class="s-acc">${A("opacity", "1;.15;1", (0.8 + rnd(i, k) * 1.6).toFixed(2))}</circle><rect x="-12" y="${-20 + k * 19}" width="12" height="3" rx="1.5" class="s-ink"/>`).join("")}`,
    db: (i) => `<ellipse cx="0" cy="${22}" rx="26" ry="8" class="s-fill"/><path d="M-26 -18 V20 A26 8 0 0 0 26 20 V-18" class="s-body"/><ellipse cx="0" cy="-18" rx="26" ry="8" class="s-body"/><path d="M-26 0 A26 8 0 0 0 26 0" class="s-line"/><ellipse cx="0" cy="-18" rx="26" ry="8" class="s-ring">${A("rx", "26;38;26", 2.6, `begin="${(rnd(i, 3) * 2).toFixed(1)}s"`)}${A("ry", "8;12;8", 2.6, `begin="${(rnd(i, 3) * 2).toFixed(1)}s"`)}${A("opacity", "0.7;0;0.7", 2.6, `begin="${(rnd(i, 3) * 2).toFixed(1)}s"`)}</ellipse>`,
    cache: () => `<rect x="-24" y="-24" width="48" height="48" rx="11" class="s-accfill"/><path d="M4 -16 L-9 3 H1 L-4 17 L10 -3 H0 Z" class="s-bolt">${A("opacity", "1;.45;1", 1.4)}</path>`,
    lb: () => `<circle r="24" class="s-body"/><circle r="31" class="s-dash">${ROT(14)}</circle><path d="M-12 0 H0 M0 0 L11 -10 M0 0 L11 0 M0 0 L11 10" class="s-line" stroke-width="2.4"/><circle cx="-12" cy="0" r="3.2" class="s-acc"/>`,
    phone: (i) => `<rect x="-17" y="-30" width="34" height="60" rx="7" class="s-body"/><rect x="-12" y="-23" width="24" height="42" rx="3" class="s-fill"/>${[0, 1, 2].map((k) => `<rect x="${k % 2 ? -9 : -5}" y="${-19 + k * 12}" height="7" rx="3.5" class="${k % 2 ? "s-acc" : "s-ink"}" width="14">${A("width", `0;14;14;0`, 4, `begin="${(k * 0.5 + rnd(i, k)).toFixed(1)}s" keyTimes="0;.2;.85;1"`)}</rect>`).join("")}`,
    laptop: () => `<rect x="-30" y="-22" width="60" height="38" rx="4" class="s-body"/><rect x="-25" y="-17" width="50" height="28" rx="2" class="s-fill"/><rect x="-36" y="16" width="72" height="6" rx="3" class="s-ink"/><rect x="-20" y="-11" width="22" height="4" rx="2" class="s-acc">${A("width", "4;30;4", 3)}</rect><rect x="-20" y="-2" width="30" height="4" rx="2" class="s-ink" opacity=".35"/>`,
    globe: () => `<circle r="27" class="s-body"/><ellipse rx="27" ry="10" class="s-line"/><line x1="-27" x2="27" class="s-line"/><ellipse rx="10" ry="27" class="s-line">${A("rx", "27;2;27", 6)}</ellipse><ellipse rx="18" ry="27" class="s-line" opacity=".5">${A("rx", "2;27;2", 6)}</ellipse>`,
    cloud: () => `<path d="M-22 12 A12 12 0 0 1 -18 -10 A16 16 0 0 1 12 -14 A13 13 0 0 1 24 12 Z" class="s-body"/><circle cx="-4" cy="2" r="3" class="s-acc">${A("opacity", "1;.2;1", 1.7)}</circle><circle cx="7" cy="2" r="3" class="s-acc">${A("opacity", ".2;1;.2", 1.7)}</circle>`,
    queue: () => [0, 1, 2].map((k) => `<g><rect x="-22" y="${-22 + k * 15}" width="44" height="12" rx="3" class="${k === 0 ? "s-accfill" : "s-body"}"/><path d="M-22 ${-22 + k * 15} L0 ${-14 + k * 15} L22 ${-22 + k * 15}" class="s-line"/>${k === 0 ? `<animateTransform attributeName="transform" type="translate" values="0 0;8 0;0 0" dur="2.2s" repeatCount="indefinite"/>` : ""}</g>`).join(""),
    gear: (i) => { const teeth = Array.from({ length: 8 }, (_, k) => { const a = (k / 8) * Math.PI * 2; return `<rect x="-4" y="-27" width="8" height="10" rx="2" transform="rotate(${(a * 180) / Math.PI})" class="s-ink"/>`; }).join(""); return `<g>${teeth}<circle r="19" class="s-body"/><circle r="7" class="s-accfill"/>${ROT(i % 2 ? 9 : 12)}</g>`; },
    file: () => `<path d="M-18 -26 H8 L18 -16 V26 H-18 Z" class="s-body"/><path d="M8 -26 V-16 H18" class="s-line"/>${[0, 1, 2, 3].map((k) => `<rect x="-11" y="${-10 + k * 8}" width="${k === 3 ? 12 : 22}" height="3" rx="1.5" class="${k === 0 ? "s-acc" : "s-ink"}" opacity="${k === 0 ? 1 : 0.4}"/>`).join("")}`,
    pin: (i) => `<g><path d="M0 22 C-14 4 -18 -4 -18 -10 A18 18 0 0 1 18 -10 C18 -4 14 4 0 22 Z" class="s-accfill"/><circle cy="-10" r="6" class="s-hole"/><animateTransform attributeName="transform" type="translate" values="0 0;0 -6;0 0" dur="${(1.6 + rnd(i, 1)).toFixed(1)}s" repeatCount="indefinite"/></g><ellipse cy="27" rx="10" ry="3" class="s-fill"/>`,
    user: () => `<circle cy="-12" r="11" class="s-body"/><path d="M-20 26 A20 20 0 0 1 20 26 Z" class="s-body"/><circle cy="-12" r="4" class="s-acc"/>`,
    hex: (i) => `<path d="M0 -26 L22.5 -13 V13 L0 26 L-22.5 13 V-13 Z" class="${i % 3 === 0 ? "s-accfill" : "s-body"}"/><path d="M0 -12 L10.4 -6 V6 L0 12 L-10.4 6 V-6 Z" class="s-fill">${A("opacity", "1;.3;1", (2 + rnd(i, 2) * 2).toFixed(1))}</path>`,
    chart: (i) => `<rect x="-26" y="-24" width="52" height="48" rx="6" class="s-body"/>${[0, 1, 2, 3].map((k) => { const h = 8 + rnd(i, k) * 26; return `<rect x="${-18 + k * 10}" y="${16 - h}" width="7" height="${h}" rx="1.5" class="${k === 3 ? "s-acc" : "s-ink"}" opacity="${k === 3 ? 1 : 0.35}">${A("height", `${h};${(h * 0.5).toFixed(1)};${h}`, (2 + k * 0.4).toFixed(1))}${A("y", `${16 - h};${(16 - h * 0.5).toFixed(1)};${16 - h}`, (2 + k * 0.4).toFixed(1))}</rect>`; }).join("")}`,
    lock: () => `<path d="M-11 -4 V-14 A11 11 0 0 1 11 -14 V-4" class="s-line" stroke-width="5" fill="none"/><rect x="-18" y="-4" width="36" height="30" rx="6" class="s-accfill"/><circle cy="9" r="4" class="s-hole"/>`,
    video: () => `<rect x="-30" y="-20" width="60" height="40" rx="6" class="s-body"/><path d="M-6 -9 L10 0 L-6 9 Z" class="s-accfill">${A("opacity", "1;.4;1", 1.6)}</path><rect x="-24" y="14" width="48" height="3" rx="1.5" class="s-fill"/><rect x="-24" y="14" height="3" rx="1.5" class="s-acc" width="10">${A("width", "2;48", 5)}</rect>`
  };

  function link(a, b, k) {
    const mx = (a[1] + b[1]) / 2, my = (a[2] + b[2]) / 2 - 18 * (k % 2 ? 1 : -1), d = `M${a[1]} ${a[2]} Q${mx} ${my} ${b[1]} ${b[2]}`;
    const dur = (2.2 + rnd(k, 5) * 1.6).toFixed(1), beg = (rnd(k, 7) * 2).toFixed(1);
    return `<path d="${d}" class="s-link"/><circle r="4.2" class="s-pkt"><animateMotion dur="${dur}s" begin="${beg}s" repeatCount="indefinite" path="${d}"/></circle>` +
      (k % 3 === 0 ? `<circle r="3" class="s-pkt2"><animateMotion dur="${dur}s" begin="${(+beg + dur / 2).toFixed(1)}s" repeatCount="indefinite" path="${d}" keyPoints="1;0" keyTimes="0;1" calcMode="linear"/></circle>` : "");
  }

  BP.scene = (spec, opts = {}) => {
    const W = opts.w || 520, H = opts.h || 320, s = opts.scale || 1;
    const blobs = (spec.blobs || [[W * 0.62, H * 0.45, 130], [W * 0.18, H * 0.82, 70]]).map(([x, y, r], i) => `<circle cx="${x}" cy="${y}" r="${r}" class="s-blob">${A("r", `${r};${r * 1.06};${r}`, 7 + i * 2)}</circle>`).join("");
    const links = (spec.links || []).map(([a, b], k) => link(spec.nodes[a], spec.nodes[b], k)).join("");
    const nodes = spec.nodes.map(([t, x, y, label], i) => `<g transform="translate(${x} ${y}) scale(${s})" class="s-node">${(PARTS[t] || PARTS.server)(i)}${label ? `<text y="${46}" text-anchor="middle" class="s-label">${label}</text>` : ""}</g>`).join("");
    return `<svg class="scene" viewBox="0 0 ${W} ${H}" role="img" aria-label="${opts.alt || "Animated illustration"}">${blobs}${links}${nodes}</svg>`;
  };

  /* Build a scene from a case study's architecture diagram (positions scaled to fit). */
  const KIND = { client: "phone", edge: "lb", service: "gear", cache: "cache", db: "db", queue: "queue", external: "cloud" };
  BP.sceneFromDiagram = (dg) => {
    const ns = dg.nodes.slice(0, 8), xs = ns.map((n) => n.x), ys = ns.map((n) => n.y);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const P = (n) => [60 + ((n.x - x0) / Math.max(1, x1 - x0)) * 400, 50 + ((n.y - y0) / Math.max(1, y1 - y0)) * 200];
    const idx = Object.fromEntries(ns.map((n, i) => [n.id, i]));
    const nodes = ns.map((n) => { const [x, y] = P(n), lbl = /cdn|open connect|ixp|edge/i.test(n.label) ? "globe" : KIND[n.kind]; return [lbl, x, y, n.label.split(" ")[0]]; });
    const seen = new Set(), links = [];
    dg.flows.forEach((fl) => fl.steps.forEach(([a, b]) => { const k = [a, b].sort().join("|"); if (a !== b && idx[a] !== undefined && idx[b] !== undefined && !seen.has(k)) { seen.add(k); links.push([idx[a], idx[b]]); } }));
    return BP.scene({ nodes, links: links.slice(0, 9) }, { scale: 0.78 });
  };
})();

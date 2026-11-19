// Snow that rests on things (Christmas layer). Given the top contour of a
// shape (one y per x, -1 where there's nothing), it builds an SVG path for a
// snow layer: thick where the surface is flat, thinning to nothing on slopes,
// with irregular clumps so it never reads as a repeated pattern.

/** Smooth, deterministic clump noise in [0, 1] (a few sines with seeded phases). */
function clumps(seed: number) {
  const r = (n: number) => { const s = Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453; return s - Math.floor(s); };
  const waves = [0, 1, 2, 3].map((i) => ({ f: 0.05 + r(i) * 0.12, p: r(i + 9) * Math.PI * 2, a: 0.4 + r(i + 4) * 0.6 }));
  const total = waves.reduce((s, w) => s + w.a, 0);
  return (x: number) => 0.5 + waves.reduce((s, w) => s + w.a * Math.sin(x * w.f + w.p), 0) / (2 * total);
}

/**
 * Snow on a contour. `top[x]` is the surface y at column x (-1 = empty).
 * `depth` is the thickest it gets on a flat top, in px. Returns path data.
 */
export function snowOnContour(top: number[], depth: number, seed = 1): string {
  const noise = clumps(seed);
  const thick: number[] = top.map((y, x) => {
    if (y < 0) return 0;
    const a = top[x - 2], b = top[x + 2];
    if (a === undefined || b === undefined || a < 0 || b < 0) return 0;
    const slope = Math.abs(b - a) / 4;
    const flat = Math.max(0, 1 - slope / 0.75); // steeper than ~37°: nothing sticks
    return depth * flat ** 1.6 * (0.45 + 0.75 * noise(x));
  });
  // Runs of columns that hold snow, without jumps in the surface.
  const runs: [number, number][] = [];
  let start = -1;
  for (let x = 0; x <= thick.length; x++) {
    const ok = x < thick.length && thick[x] > 0.6 && (start < 0 || Math.abs(top[x] - top[x - 1]) < 3);
    if (ok && start < 0) start = x;
    if (!ok && start >= 0) { if (x - start > 5) runs.push([start, x - 1]); start = ok ? x : -1; }
  }
  const f = (n: number) => n.toFixed(1);
  return runs.map(([a, b]) => {
    // Ends taper so each patch sits like a drift, not a strip.
    const taper = (x: number) => Math.min(1, (x - a) / 6, (b - x) / 6);
    const xs: number[] = [];
    for (let x = a; x < b; x += 2) xs.push(x);
    xs.push(b);
    const upper = xs.map((x) => [x, top[x] - thick[x] * Math.max(0, taper(x))] as const);
    // Smooth upper edge (quadratic through midpoints), then back along the surface, tucked 1.5px in.
    let d = `M ${f(upper[0][0])} ${f(top[a] + 1.5)} L ${f(upper[0][0])} ${f(upper[0][1])}`;
    for (let i = 1; i < upper.length - 1; i++) {
      const [x, y] = upper[i], [nx, ny] = upper[i + 1];
      d += ` Q ${f(x)} ${f(y)} ${f((x + nx) / 2)} ${f((y + ny) / 2)}`;
    }
    const last = upper[upper.length - 1];
    d += ` L ${f(last[0])} ${f(last[1])}`;
    for (let i = xs.length - 1; i >= 0; i -= 2) d += ` L ${f(xs[i])} ${f(top[xs[i]] + 1.5)}`;
    return `${d} Z`;
  }).join(' ');
}

/** Top contour of a rounded rectangle of width w and corner radius r (y = 0 on the flat top). */
export function pillContour(w: number, r: number): number[] {
  return Array.from({ length: Math.round(w) }, (_, x) => {
    const dx = x < r ? r - x : x > w - r ? x - (w - r) : 0;
    return dx >= r ? -1 : r - Math.sqrt(r * r - dx * dx);
  });
}

const NS = 'http://www.w3.org/2000/svg';
/**
 * Puts (or refreshes) a snow cap on a pill-shaped element: an SVG overlaid on
 * its top edge. The element needs position: relative (or absolute/fixed).
 * It redraws itself whenever the element's size changes.
 */
export function capPill(el: HTMLElement, depth = 6, seed = 1) {
  let svg = el.querySelector<SVGSVGElement>(':scope > .snow-cap');
  if (!svg) {
    svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'snow-cap');
    svg.setAttribute('aria-hidden', 'true');
    el.append(svg);
    let lastW = el.offsetWidth;
    new ResizeObserver(() => {
      if (!el.isConnected || !el.querySelector(':scope > .snow-cap') || el.offsetWidth === lastW || !el.offsetWidth) return;
      lastW = el.offsetWidth;
      capPill(el, depth, seed);
    }).observe(el);
  }
  const w = el.offsetWidth, r = Math.min(el.offsetHeight / 2, parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0);
  svg.setAttribute('viewBox', `0 ${-depth - 2} ${w} ${depth + 6}`);
  svg.style.cssText = `position:absolute;left:0;top:${-depth - 2}px;width:${w}px;height:${depth + 6}px;overflow:visible;pointer-events:none;z-index:2`;
  svg.innerHTML = `<path d="${snowOnContour(pillContour(w, r), depth, seed)}" />`;
  return svg;
}

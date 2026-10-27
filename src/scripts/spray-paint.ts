// Spray paint on the footer wordmark: hovering the name sprays paint that
// sticks to the letters only, and drips where the can lingers. Each pass
// picks the next brand colour; once the can leaves, the paint slowly fades
// so the name can be painted again.
// Fine pointers only, and not under reduced motion.

// Brand colours; each pass over the name takes the next one.
const COLORS = ['#e85fa0', '#5ec8e8', '#f7d842', 'var(--accent)'];
const FADE_AFTER = 2500; // ms of no spraying before the paint fades

type Drip = { x: number; y: number; len: number; max: number; w: number; color: string };

export function mountSpray(root: HTMLElement, text: HTMLElement) {
  if (!matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)').matches) return;

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none' });
  root.style.position = 'relative';
  root.append(canvas);
  const ctx = canvas.getContext('2d')!;
  // Paint accumulates here; each frame it's composited onto the canvas.
  const paint = document.createElement('canvas');
  const pctx = paint.getContext('2d')!;
  const letters = document.createElement('canvas');
  const lctx = letters.getContext('2d')!;
  const tmp = document.createElement('canvas');
  const tctx = tmp.getContext('2d')!;

  let dpr = 1, color = '', colorIndex = -1, fontSize = 0;
  const resolve = (c: string) => (c.startsWith('var(') ? getComputedStyle(root).getPropertyValue(c.slice(4, -1)).trim() || '#d9a8d9' : c);

  // The letters, drawn where the DOM shows them, as the paint's mask.
  const layout = () => {
    const r = root.getBoundingClientRect();
    dpr = Math.min(2, devicePixelRatio || 1);
    const w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
    // Resizing a canvas wipes it — only when the size really changed.
    if (paint.width !== w || paint.height !== h) for (const c of [canvas, paint, letters, tmp]) { c.width = w; c.height = h; }
    lctx.setTransform(1, 0, 0, 1, 0, 0);
    lctx.clearRect(0, 0, w, h);
    const cs = getComputedStyle(text);
    fontSize = parseFloat(cs.fontSize);
    lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    lctx.font = `${cs.fontWeight} ${fontSize}px ${cs.fontFamily}`;
    lctx.textBaseline = 'alphabetic';
    lctx.fillStyle = '#000';
    const m = lctx.measureText('C');
    const asc = m.fontBoundingBoxAscent, desc = m.fontBoundingBoxDescent;
    const lineHeight = parseFloat(cs.lineHeight) || fontSize;
    for (const span of text.querySelectorAll<HTMLElement>('span')) {
      const s = span.getBoundingClientRect();
      lctx.fillText(span.textContent ?? '', s.left - r.left, s.top - r.top + (lineHeight - asc - desc) / 2 + asc);
    }
    pctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  let pointer: { x: number; y: number } | null = null;
  let last: { x: number; y: number } | null = null;
  let dwell = 0, lastSpray = 0, raf = 0, fading = false;
  const drips: Drip[] = [];

  const spray = (x: number, y: number, speed: number) => {
    const radius = fontSize * 0.09;
    pctx.fillStyle = color;
    // Dense in the middle, thinning out: a real nozzle's cone.
    for (let i = 0; i < 160; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = radius * Math.random() ** 1.6;
      const size = Math.random() * 1.8 + 0.6;
      pctx.globalAlpha = 0.45 + Math.random() * 0.55;
      pctx.fillRect(x + Math.cos(a) * d, y + Math.sin(a) * d, size, size);
    }
    // A few stray specks further out.
    for (let i = 0; i < 6; i++) {
      const a = Math.random() * Math.PI * 2, d = radius * (1 + Math.random() * 0.8);
      pctx.globalAlpha = 0.5;
      pctx.fillRect(x + Math.cos(a) * d, y + Math.sin(a) * d, 1, 1);
    }
    pctx.globalAlpha = 1;
    // Lingering in one spot builds up paint until it runs.
    dwell = speed < 2 ? dwell + 1 : Math.max(0, dwell - 2);
    if (dwell > 18 && drips.length < 24) {
      dwell = 0;
      drips.push({ x: x + (Math.random() - 0.5) * radius, y: y + radius * 0.4, len: 0, max: fontSize * (0.15 + Math.random() * 0.35), w: 1.5 + Math.random() * 2, color });
    }
  };

  const frame = (now: number) => {
    if (pointer) {
      const speed = last ? Math.hypot(pointer.x - last.x, pointer.y - last.y) : 0;
      // Fill the gap on fast moves so the stroke stays continuous.
      const steps = Math.max(1, Math.ceil(speed / 12));
      for (let i = 1; i <= steps; i++) {
        const k = i / steps;
        spray(last ? last.x + (pointer.x - last.x) * k : pointer.x, last ? last.y + (pointer.y - last.y) * k : pointer.y, speed);
      }
      last = { ...pointer };
      lastSpray = now;
    }
    for (let i = drips.length - 1; i >= 0; i--) {
      const d = drips[i];
      const step = Math.max(0.3, (1 - d.len / d.max) * 1.6);
      pctx.fillStyle = d.color;
      pctx.beginPath();
      pctx.arc(d.x, d.y + d.len, d.w * (1 - d.len / d.max * 0.4), 0, Math.PI * 2);
      pctx.fill();
      d.len += step;
      if (d.len >= d.max) drips.splice(i, 1);
    }
    if (!pointer && now - lastSpray > FADE_AFTER) fading = true;
    if (fading) {
      pctx.save();
      pctx.globalCompositeOperation = 'destination-out';
      pctx.globalAlpha = 0.035;
      pctx.fillRect(0, 0, paint.width, paint.height);
      pctx.restore();
    }

    // Composite: the paint, clipped to the letters.
    tctx.globalCompositeOperation = 'copy';
    tctx.drawImage(paint, 0, 0);
    tctx.globalCompositeOperation = 'destination-in';
    tctx.drawImage(letters, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(tmp, 0, 0);

    // Keep running while spraying, dripping or fading; stop once it's all gone.
    const empty = fading && now - lastSpray > FADE_AFTER + 4000;
    if (empty) { pctx.clearRect(0, 0, paint.width, paint.height); ctx.clearRect(0, 0, canvas.width, canvas.height); fading = false; }
    raf = pointer || drips.length || (!empty && lastSpray) ? requestAnimationFrame(frame) : 0;
    if (empty) lastSpray = 0;
  };
  const run = () => { if (!raf) raf = requestAnimationFrame(frame); };

  text.addEventListener('pointerenter', () => {
    layout();
    colorIndex = (colorIndex + 1) % COLORS.length;
    color = resolve(COLORS[colorIndex]);
    fading = false;
    run();
  });
  text.addEventListener('pointermove', (e) => {
    const r = root.getBoundingClientRect();
    pointer = { x: e.clientX - r.left, y: e.clientY - r.top };
    run();
  });
  text.addEventListener('pointerleave', () => { pointer = null; last = null; });
}

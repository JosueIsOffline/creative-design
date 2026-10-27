// Captures the site for the promo: full-page and per-section screenshots
// (desktop 1440, mobile 390) plus frame-by-frame recordings of the key
// interactions. Run against `astro preview` (repo root, port 4399):
//   node capture/capture.ts [baseUrl]
//   RECORD_ONLY=1 …   recordings only        ONLY=rec-product,rec-cta …   just those
// Output: public/capture/* (Remotion reads it through staticFile()).
import { chromium, type Browser, type Page } from 'playwright';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const BASE = process.argv[2] ?? 'http://localhost:4399';
const OUT = new URL('../public/capture/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Repeat visitor (cards grid, no intro), unless a capture needs the first visit.
async function prime(page: Page, firstVisit = false) {
  await page.addInitScript((first) => {
    try {
      sessionStorage.setItem('intro-seen', '1');
      if (first) localStorage.removeItem('story-seen');
      else localStorage.setItem('story-seen', '1');
    } catch {}
  }, firstVisit);
}

// Scroll the whole page once so lazy images load and one-shot reveals play.
async function warm(page: Page) {
  await page.evaluate(async () => {
    document.querySelectorAll('img').forEach((i) => (i.loading = 'eager'));
    for (let y = 0; y < document.body.scrollHeight; y += 400) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForLoadState('networkidle');
  await sleep(1500);
}

async function shots(browser: Browser, name: string, viewport: { width: number; height: number }, mobile: boolean) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2, isMobile: mobile, hasTouch: mobile, colorScheme: 'dark' });
  const page = await ctx.newPage();
  await prime(page);
  await page.goto(BASE + '/', { waitUntil: 'load' });
  await warm(page);

  // The floating header and WhatsApp button are captured on their own and
  // overlaid in the video, so the page scroll can run under them.
  await page.locator('#site-header').screenshot({ path: `${OUT}${name}-header.png`, omitBackground: true });
  await page.addStyleTag({ content: '#site-header, a[aria-label="Contactar por WhatsApp"] { visibility: hidden !important; }' });
  // The full page as viewport-sized tiles, scrolled one by one. Playwright's
  // fullPage mode stretches the viewport instead, and the hero's 100svh grows
  // with it (repeated hero, blank photos).
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  const tiles: { file: string; y: number }[] = [];
  for (let y = 0; ; y += viewport.height) {
    const at = Math.min(y, height - viewport.height);
    await page.evaluate((at) => window.scrollTo(0, at), at);
    await sleep(700);
    const real = await page.evaluate(() => Math.round(scrollY));
    const file = `${name}-tile-${tiles.length}.png`;
    await page.screenshot({ path: OUT + file });
    tiles.push({ file, y: real });
    if (at >= height - viewport.height) break;
  }

  const sections: Record<string, string> = {
    hero: '[data-hero]', howto: '#como-pedir', featured: '#destacados', gallery: '[data-gallery]',
    about: '#sobre-la-marca', cta: '#cta-final', footer: 'footer',
  };
  for (const [key, sel] of Object.entries(sections)) {
    const el = page.locator(sel).first();
    await el.scrollIntoViewIfNeeded();
    await sleep(900);
    await el.screenshot({ path: `${OUT}${name}-${key}.png` });
  }
  // Where each section starts on the full page (for the scroll keyframes).
  const offsets = await page.evaluate((sels) => Object.fromEntries(Object.entries(sels).map(([k, s]) => [k, Math.round((document.querySelector(s)!.getBoundingClientRect().top + scrollY))])), sections);
  const manifest = { width: viewport.width, viewportHeight: viewport.height, height, offsets, tiles };
  writeFileSync(`${OUT}${name}.json`, JSON.stringify(manifest, null, 2));
  console.log(name, JSON.stringify({ height, offsets, tiles: tiles.length }));
  await ctx.close();
}

// Recordings are captured frame by frame, not screen-recorded: the page
// runs on a virtual clock (`vclock`, installed before any page script) that
// only moves when we say so. Each frame: advance it exactly 1/FPS s, let the
// browser paint, take a screenshot. Nothing can drop a frame, however slow
// the machine — the clip is a perfect FPS sequence, encoded to MP4 at the end.
const FPS = 60;
const DT = 1000 / FPS;

// Runs in the page. JS time (performance.now, Date.now, rAF, timers) reads
// the virtual clock — so Motion, GSAP, Lenis and the site's own loops follow
// it. CSS transitions/animations, Web Animations (Motion's WAAPI path) and
// view transitions run on the browser's own clock, so each step pauses every
// running animation and seeks it to its virtual age (finishing it at its end
// so `finished` promises and *end events still fire).
function vclock() {
  const realRAF = window.requestAnimationFrame.bind(window);
  const date0 = Date.now();
  let now = 0, seq = 0;
  type Timer = { at: number; fn: TimerHandler; a: unknown[]; every?: number };
  const timers = new Map<number, Timer>();
  let rafs = new Map<number, FrameRequestCallback>();
  performance.now = () => now;
  Date.now = () => date0 + now;
  window.requestAnimationFrame = (cb) => { rafs.set(++seq, cb); return seq; };
  window.cancelAnimationFrame = (id) => { rafs.delete(id); };
  // @ts-expect-error — same contract, virtual delay
  window.setTimeout = (fn: TimerHandler, ms = 0, ...a: unknown[]) => { timers.set(++seq, { at: now + Math.max(0, +ms || 0), fn, a }); return seq; };
  // @ts-expect-error — same contract, virtual delay
  window.setInterval = (fn: TimerHandler, ms = 0, ...a: unknown[]) => { const every = Math.max(1, +ms || 0); timers.set(++seq, { at: now + every, fn, a, every }); return seq; };
  window.clearTimeout = window.clearInterval = ((id?: unknown) => { if (id !== undefined) timers.delete(Number(id)); }) as typeof clearTimeout;
  const born = new WeakMap<Animation, number>();
  // Freeze every animation the moment it appears (checked on each real
  // frame), so none advances on the browser's clock before we step it. Its
  // age counts from then: its own currentTime can't be trusted — Motion sets
  // startTime from performance.now (virtual) against the real timeline.
  const adopt = () => {
    for (const an of document.getAnimations()) if (!born.has(an)) { born.set(an, now); an.pause(); }
  };
  const watch = () => { adopt(); realRAF(watch); };
  realRAF(watch);
  const run = (f: () => void) => { try { f(); } catch (e) { console.error(e); } };
  (window as any).__vt = {
    advance(ms: number) {
      const target = now + ms;
      for (;;) {
        let next: [number, Timer] | null = null;
        for (const e of timers) if (e[1].at <= target && (!next || e[1].at < next[1].at)) next = e;
        if (!next) break;
        const [id, t] = next;
        now = Math.max(now, t.at);
        if (t.every) t.at += t.every; else timers.delete(id);
        run(() => (typeof t.fn === 'function' ? t.fn(...t.a) : eval(t.fn)));
      }
      now = target;
      const due = [...rafs.values()];
      rafs = new Map();
      for (const cb of due) run(() => cb(now));
      adopt();
      for (const an of document.getAnimations()) {
        const age = now - born.get(an)!;
        const end = Number(an.effect?.getComputedTiming().endTime ?? 0);
        // Re-pause every step: a library setting startTime resumes it.
        if (end !== Infinity && age >= end) an.finish(); else { an.pause(); an.currentTime = age; }
      }
    },
    // Two real frames: the new state is laid out and painted.
    paint: () => new Promise<void>((r) => realRAF(() => realRAF(() => r()))),
  };
}

// What each recording logs, in seconds from its first frame: where moments
// start (marks), every pointer position (path) and click, named on-page
// points. Saved to recordings.json: the video draws its own pointer from the
// path and punches in on the clicks.
type Log = { marks: Record<string, number>; path: [number, number, number][]; clicks: [number, number, number][]; points: Record<string, [number, number]> };
const logs: Record<string, Log> = {};

function recorder(page: Page, log: Log, dir: string) {
  let frame = -1; // -1: not capturing yet
  let at: [number, number] = [720, 450];
  const t = () => +(Math.max(0, frame) / FPS).toFixed(4);
  const ease = (k: number) => (k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2);
  const step = (ms: number) => page.evaluate(async (ms) => { (window as any).__vt.advance(ms); await (window as any).__vt.paint(); }, ms);
  // One frame: advance the clock, then (once capturing) photograph it.
  const tick = async () => {
    await step(DT);
    if (frame < 0) return;
    await page.screenshot({ path: `${dir}${String(frame).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 92 });
    frame++;
  };
  const frames = (ms: number) => Math.max(1, Math.round(ms / DT));
  const rec = {
    // Let page time pass without filming it (loading, getting into place).
    async idle(ms: number) { for (let i = frames(ms); i > 0; i--) await step(DT); },
    start() { frame = 0; log.marks.start = 0; },
    mark: (label: string) => { log.marks[label] = t(); },
    point: (label: string, x: number, y: number) => { log.points[label] = [Math.round(x), Math.round(y)]; },
    async hold(ms: number) { for (let i = frames(ms); i > 0; i--) await tick(); },
    // An eased glide, like a hand on a trackpad: one position per frame.
    async move(x: number, y: number, ms = 700) {
      const [x0, y0] = at, n = frames(ms);
      for (let i = 1; i <= n; i++) {
        const k = ease(i / n);
        const p: [number, number] = [x0 + (x - x0) * k, y0 + (y - y0) * k];
        await page.mouse.move(p[0], p[1]);
        if (frame >= 0) log.path.push([t(), Math.round(p[0]), Math.round(p[1])]);
        await tick();
      }
      at = [x, y];
    },
    async click() {
      log.clicks.push([t(), Math.round(at[0]), Math.round(at[1])]);
      await page.mouse.down();
      await tick();
      await page.mouse.up();
      await tick();
    },
    // A raw move (spraying): no easing, one frame.
    async drag(x: number, y: number) {
      await page.mouse.move(x, y);
      at = [x, y];
      if (frame >= 0) log.path.push([t(), Math.round(x), Math.round(y)]);
      await tick();
    },
    // Scroll to `y` over `ms`, eased, one position per frame.
    async scroll(y: number, ms: number) {
      const y0 = await page.evaluate(() => scrollY), n = frames(ms);
      for (let i = 1; i <= n; i++) {
        await page.evaluate((y) => window.scrollTo(0, y), y0 + (y - y0) * ease(i / n));
        await tick();
      }
    },
    // Scroll the whole page once on the virtual clock so lazy images load
    // and one-shot reveals play, then come back up; real time for the network.
    async warm() {
      const h = await page.evaluate(() => { document.querySelectorAll('img').forEach((i) => (i.loading = 'eager')); return document.body.scrollHeight; });
      for (let y = 0; y < h; y += 400) { await page.evaluate((y) => window.scrollTo(0, y), y); await rec.idle(150); }
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForLoadState('networkidle');
      await sleep(800);
      await rec.idle(1500);
    },
  };
  return rec;
}
type Rec = ReturnType<typeof recorder>;

async function record(browser: Browser, name: string, act: (page: Page, rec: Rec) => Promise<void>, firstVisit = false) {
  const dir = `${OUT}${name}-frames/`;
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, colorScheme: 'dark' });
  const page = await ctx.newPage();
  const log: Log = (logs[name] = { marks: {}, path: [], clicks: [], points: {} });
  await prime(page, firstVisit);
  await page.addInitScript(vclock);
  // The floating WhatsApp button would sit in every clip's corner; the
  // video has its own CTA in the outro.
  await page.addInitScript(() => addEventListener('DOMContentLoaded', () => {
    const s = document.createElement('style');
    s.textContent = 'a[aria-label="Contactar por WhatsApp"] { display: none !important; }';
    document.head.append(s);
  }));
  const t0 = Date.now();
  await act(page, recorder(page, log, dir));
  await ctx.close();
  // JPEG sequence → H.264 at FPS (keyframe every half second, for seeking).
  execFileSync('npx', ['remotion', 'ffmpeg', '-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', `${dir}%05d.jpg`,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p', '-g', String(FPS / 2), `${OUT}${name}.mp4`]);
  rmSync(dir, { recursive: true, force: true });
  console.log('recorded', name, `${((Date.now() - t0) / 1000).toFixed(0)}s`);
}

const center = async (page: Page, sel: string) => {
  const b = (await page.locator(sel).first().boundingBox())!;
  return [b.x + b.width / 2, b.y + b.height / 2] as const;
};
const docTop = (page: Page, sel: string) => page.evaluate((s) => document.querySelector(s)!.getBoundingClientRect().top + scrollY, sel);

const browser = await chromium.launch({ channel: 'chrome' });
// RECORD_ONLY=1 skips the screenshots; ONLY=rec-a,rec-b records just those.
if (!process.env.RECORD_ONLY && !process.env.ONLY) {
  await shots(browser, 'desktop', { width: 1440, height: 900 }, false);
  await shots(browser, 'mobile', { width: 390, height: 844 }, true);
}
const only = process.env.ONLY?.split(',');
const take = (name: string, act: (page: Page, rec: Rec) => Promise<void>, firstVisit = false) =>
  !only || only.includes(name) ? record(browser, name, act, firstVisit) : Promise.resolve();

// Hero entrance: letters focus, the cursor glides in and clicks; then the
// pointer drifts over a service tag.
await take('rec-hero', async (page, rec) => {
  await page.goto(BASE + '/', { waitUntil: 'load' });
  // Freeze the entrance where it is (frame 0) while the fonts load in real time.
  await page.evaluate(async () => { (window as any).__vt.advance(0); await document.fonts.ready; (window as any).__vt.advance(0); });
  rec.point('cursor', ...(await center(page, '.hero__cursor')));
  rec.start();
  await rec.hold(3600);
  const [tx, ty] = await center(page, '[data-callout]:nth-of-type(4)');
  await rec.move(tx, ty, 900);
  await rec.hold(900);
});

// Footer spray paint: two passes over the wordmark.
await take('rec-spray', async (page, rec) => {
  await page.goto(BASE + '/', { waitUntil: 'load' });
  await rec.warm();
  await page.locator('[data-wordmark-text]').evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await rec.idle(1200);
  const b = (await page.locator('[data-wordmark-text]').boundingBox())!;
  await rec.move(b.x - 40, b.y + b.height * 0.42, 100);
  rec.start();
  for (const [row, from, to] of [[0.42, 0.02, 0.5], [0.55, 0.52, 0.98]] as const) {
    await rec.move(b.x + b.width * from, b.y + b.height * row, 300);
    for (let i = 0; i <= 70; i++) {
      const k = i / 70;
      await rec.drag(b.x + b.width * (from + (to - from) * k), b.y + b.height * (row + Math.sin(k * 9) * 0.14));
    }
  }
  await rec.move(b.x + b.width * 0.5, b.y - 120, 500);
  await rec.hold(800);
});

// Closing panel: the fan opens and the cursor clicks "ide▸?"; then the
// pointer picks up each card.
await take('rec-cta', async (page, rec) => {
  await page.goto(BASE + '/', { waitUntil: 'load' });
  await rec.warm();
  await page.mouse.move(80, 80);
  await page.locator('#cta-final').evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await sleep(300); // the IntersectionObserver (real time) opens the panel
  rec.start();
  await rec.hold(300);
  rec.point('cursor', ...(await center(page, '.cta__cursor')));
  await rec.hold(2000);
  rec.mark('cards');
  for (const card of await page.locator('[data-fan-card]').all()) {
    const b = (await card.boundingBox())!;
    await rec.move(b.x + b.width / 2, b.y + b.height * 0.45, 650);
    await rec.hold(700);
  }
  const [wx, wy] = await center(page, '.cta__btn--solid');
  await rec.move(wx, wy, 800);
  rec.mark('button');
  await rec.hold(900);
});

// A product card opening, then added to the cart.
await take('rec-product', async (page, rec) => {
  await page.goto(BASE + '/', { waitUntil: 'load' });
  await rec.warm();
  await page.locator('#destacados').evaluate((el) => el.scrollIntoView({ block: 'start' }));
  await rec.idle(1500);
  await rec.move(1100, 700, 50);
  rec.start();
  const [cx, cy] = await center(page, '#destacados [data-product-trigger] img');
  await rec.move(cx, cy, 900);
  await rec.hold(250);
  await rec.click();
  await rec.hold(1300);
  const [ax, ay] = await center(page, '.product-card.is-expanded .card-add-to-cart');
  await rec.move(ax, ay, 800);
  await rec.hold(250);
  await rec.click();
  await rec.hold(1800);
});

// Galería: scrolling in, the cursor clicks the heading and the glitter
// bursts off it, then streams down as a comet into the ✨ on Ailyn's photo.
await take('rec-gallery', async (page, rec) => {
  await page.goto(BASE + '/', { waitUntil: 'load' });
  await rec.warm();
  const H = 900;
  const from = (await docTop(page, '[data-gallery]')) - H;
  const photo = await page.evaluate(() => { const r = document.querySelector('[data-owner-photo]')!.getBoundingClientRect(); return r.top + scrollY + r.height / 2; });
  const to = photo - H / 2;
  const at = (p: number) => from + (to - from) * p; // p: the glitter's own progress (Glitter.astro)
  await page.evaluate((y) => window.scrollTo(0, y), at(0.12));
  await rec.idle(800);
  rec.start();
  await rec.scroll(at(0.25), 1300); // passes CLICK (0.23): the click and burst
  rec.mark('click');
  rec.point('heading', ...(await center(page, '[data-gallery] h2')));
  await rec.hold(1500); // the burst plays out (~1.1 s)
  rec.mark('dust');
  await rec.scroll(at(1), 4200); // dust → comet → ✨
  rec.mark('star');
  await rec.hold(1200);
});

// First visit: the scroll story (cards dealt one by one).
await take('rec-story', async (page, rec) => {
  await page.goto(BASE + '/', { waitUntil: 'load' });
  await rec.idle(3500);
  const end = await page.evaluate(() => (document.querySelector('[data-hero]') as HTMLElement).offsetHeight - innerHeight);
  rec.start();
  await rec.scroll(end, 9000);
  await rec.hold(800);
}, true);

// Merge with what's already there, so ONLY= re-records keep the rest.
let previous: Record<string, Log> = {};
try { previous = JSON.parse(readFileSync(`${OUT}recordings.json`, 'utf8')).logs ?? {}; } catch {}
writeFileSync(`${OUT}recordings.json`, JSON.stringify({ fps: FPS, logs: { ...previous, ...logs } }, null, 2));
await browser.close();

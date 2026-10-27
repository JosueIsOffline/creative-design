import { chromium } from 'playwright';
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('http://localhost:4399/', { waitUntil: 'networkidle' });
console.log(await p.title(), await p.evaluate(() => [...document.querySelectorAll('section[id], section')].map(s => (s.id || s.className).slice(0, 40) + ' ' + Math.round(s.getBoundingClientRect().height))));
await b.close();

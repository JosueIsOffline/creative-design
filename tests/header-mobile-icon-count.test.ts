import { describe, it, expect } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';

describe('mobile header has fewer icon buttons so the hamburger menu is not squeezed off', () => {
  it('Instagram and WhatsApp icon buttons are desktop-only, moved into the mobile menu instead', async () => {
    const src = await fs.readFile(path.join(process.cwd(), 'src/layouts/BaseLayout.astro'), 'utf-8');

    const instagramIconBtn = /<a href=\{instagram\}[^>]*class="hidden sm:flex/;
    const whatsappIconBtn = /<a href=\{`https:\/\/wa\.me\/\$\{whatsapp\}`\}[^>]*class="hidden sm:flex/;
    expect(src, 'Instagram icon button should be hidden below sm').toMatch(instagramIconBtn);
    expect(src, 'WhatsApp icon button should be hidden below sm').toMatch(whatsappIconBtn);

    const mobileMenuMatch = src.match(/<nav aria-label="Principal" class="absolute[\s\S]*?<\/nav>/);
    expect(mobileMenuMatch, 'mobile dropdown nav should exist').toBeTruthy();
    const mobileMenu = mobileMenuMatch![0];
    expect(mobileMenu, 'Instagram should be reachable from the mobile menu').toContain('Instagram</a>');
    expect(mobileMenu, 'WhatsApp should be reachable from the mobile menu').toContain('WhatsApp</a>');
  });

  it('only cart, theme toggle, and the hamburger stay as always-visible icon buttons on mobile', async () => {
    const src = await fs.readFile(path.join(process.cwd(), 'src/layouts/BaseLayout.astro'), 'utf-8');
    expect(src).toContain('id="cart-toggle"');
    expect(src).toContain('id="theme-toggle"');
    expect(src).toContain('aria-label="Abrir menú"');
  });
});

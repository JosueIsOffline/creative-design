// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import sitemap from '@astrojs/sitemap';

import icon from 'astro-icon';

import { cp } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Product photos from Drive are downloaded into public/productos while the pages
// render (src/lib/sheets.ts), but Astro copies public/ before that. Copy them over at the end.
const drivePhotos = {
  name: 'drive-photos',
  hooks: {
    'astro:build:done': async ({ dir }) => {
      await cp('public/productos', fileURLToPath(new URL('productos/', dir)), { recursive: true }).catch(() => {});
    },
  },
};

// https://astro.build/config
export default defineConfig({
  site: process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:4321',

  vite: {
    plugins: [tailwindcss()]
  },

  integrations: [sitemap(), icon(), drivePhotos]
});
import Papa from 'papaparse';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export interface Product {
  id?: string; // the Sheet's ID column (PROD-001…): the coupons server prices the cart by it
  name: string;
  price: number;
  category: string;
  slug: string; // category slug
  productSlug: string;
  photos: string[];
  description: string;
  available: boolean;
}

const FALLBACK_PATH = path.join(process.cwd(), 'data', 'fallback.json');

function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip accents
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function validateProducts(data: unknown): Product[] {
  if (!Array.isArray(data)) return [];
  return data.filter(
    (p): p is Product =>
      p &&
      typeof p.price === 'number' &&
      Array.isArray(p.photos) &&
      typeof p.name === 'string' &&
      typeof p.productSlug === 'string'
  );
}

function normalizeKey(key: string): string {
  return key
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();
}

/** Reads a field by any of several accepted column names, tolerant of accents/case/spacing. */
function getField(row: Record<string, string>, ...candidates: string[]): string | undefined {
  const normalizedRow = new Map(Object.entries(row).map(([k, v]) => [normalizeKey(k), v]));
  for (const candidate of candidates) {
    const value = normalizedRow.get(normalizeKey(candidate));
    if (value !== undefined) return value;
  }
  return undefined;
}

/** Some Sheets (e.g. dashboard-style templates) have title/summary rows above the real header. */
function stripLeadingSummaryRows(csvText: string): string {
  const lines = csvText.split('\n');
  const headerIndex = lines.findIndex((line) => {
    const cells = line.split(',').map((c) => c.trim().toLowerCase());
    const hasNameCol = cells.some((c) => c === 'nombre' || c === 'producto');
    const hasPriceCol = cells.some((c) => c === 'precio');
    return hasNameCol && hasPriceCol;
  });
  return headerIndex > 0 ? lines.slice(headerIndex).join('\n') : csvText;
}

export function parseCatalogCsv(csvText: string): Product[] {
  const { data } = Papa.parse<Record<string, string>>(stripLeadingSummaryRows(csvText), {
    header: true,
    skipEmptyLines: true,
  });

  const products: Product[] = [];
  const usedProductSlugs = new Map<string, number>();

  for (const row of data) {
    const name = getField(row, 'nombre', 'producto')?.trim();
    const priceRaw = getField(row, 'precio')?.trim();
    const photosRaw = getField(row, 'fotos', 'imagen', 'imagenes')?.trim();

    if (!name || !priceRaw || !photosRaw) {
      console.warn(`[catalog] Fila descartada por datos incompletos: ${JSON.stringify(row)}`);
      continue;
    }

    // Drop a trailing 2-digit decimal/cents suffix (",00" or ".00") before
    // stripping separators — otherwise "350,00" reads as 35000 instead of 350.
    // Whole-peso pricing only; cents are truncated, not rounded.
    const cleaned = priceRaw.replace(/[.,]\d{2}$/, '').replace(/[^0-9]/g, '');
    if (!cleaned) {
      console.warn(`[catalog] Precio inválido, fila descartada: ${JSON.stringify(row)}`);
      continue;
    }
    const price = Number(cleaned);
    if (Number.isNaN(price)) {
      console.warn(`[catalog] Precio inválido, fila descartada: ${JSON.stringify(row)}`);
      continue;
    }

    const photos = photosRaw.split(',').map((url) => url.trim()).filter(Boolean);
    if (photos.length === 0) {
      console.warn(`[catalog] Fila sin fotos válidas, descartada: ${JSON.stringify(row)}`);
      continue;
    }

    const category = getField(row, 'categoria')?.trim() || 'sin-categoria';
    const availableRaw = getField(row, 'disponible', 'en stock')?.trim().toLowerCase() ?? 'si';
    const categorySlug = slugify(category);

    const baseProductSlug = slugify(name) || 'producto';
    const slugKey = `${categorySlug}/${baseProductSlug}`;
    const seenCount = usedProductSlugs.get(slugKey) ?? 0;
    usedProductSlugs.set(slugKey, seenCount + 1);
    const productSlug = seenCount === 0 ? baseProductSlug : `${baseProductSlug}-${seenCount + 1}`;

    const id = getField(row, 'id')?.trim();
    products.push({
      ...(id ? { id } : {}),
      name,
      price,
      category,
      slug: categorySlug,
      productSlug,
      photos,
      description: getField(row, 'descripcion')?.trim() || '',
      available: !['no', 'false', '0', 'n'].includes(availableRaw),
    });
  }

  return products.filter((p) => p.available);
}

// Drive "view" links aren't images, and Drive's direct links are unofficial and
// rate-limited. So at build time each Drive photo is downloaded once and served
// as a static file: public/productos/<FILE_ID>.jpg. The file ID is the cache key
// (a new photo means a new ID). Plain <img> everywhere, so Vercel's optimizer
// never touches them.
const DRIVE_ID = /drive\.google\.com\/file\/d\/([\w-]+)/;
const PHOTOS_DIR = path.join(process.cwd(), 'public', 'productos');
const PLACEHOLDER = '/placeholder.jpg';
const downloads = new Map<string, Promise<string>>(); // every page calls fetchCatalog: download each file once

function localPhoto(url: string): Promise<string> {
  const id = url.match(DRIVE_ID)?.[1];
  if (!id) return Promise.resolve(url);
  if (!downloads.has(id)) {
    downloads.set(id, (async () => {
      const publicPath = `/productos/${id}.jpg`;
      const file = path.join(PHOTOS_DIR, `${id}.jpg`);
      if (await fs.stat(file).then(() => true, () => false)) return publicPath;
      try {
        const res = await fetch(`https://drive.google.com/uc?export=download&id=${id}`);
        const body = Buffer.from(await res.arrayBuffer());
        // Drive labels files loosely (application/binary…), but a file that isn't
        // shared publicly comes back as an HTML page, sometimes with a 200.
        if (!res.ok || res.headers.get('content-type')?.includes('text/html') || body.subarray(0, 64).toString().trimStart().startsWith('<')) {
          throw new Error(`HTTP ${res.status} ${res.headers.get('content-type')}`);
        }
        await fs.mkdir(PHOTOS_DIR, { recursive: true });
        await fs.writeFile(`${file}.tmp`, body);
        await fs.rename(`${file}.tmp`, file);
        return publicPath;
      } catch (error) {
        console.warn(`[catalog] No se pudo descargar la foto de Drive ${id} (${(error as Error).message}). Usando placeholder`);
        return PLACEHOLDER;
      }
    })());
  }
  return downloads.get(id)!;
}

/** Swaps every Drive link for its downloaded copy. */
async function localizePhotos(products: Product[]): Promise<Product[]> {
  return Promise.all(products.map(async (p) => ({ ...p, photos: await Promise.all(p.photos.map(localPhoto)) })));
}

/** The catalog with Drive photos already downloaded. fallback.json keeps the original links. */
export async function fetchCatalog(csvUrl: string): Promise<Product[]> {
  return localizePhotos(await fetchRawCatalog(csvUrl));
}

async function fetchRawCatalog(csvUrl: string): Promise<Product[]> {
  try {
    const response = await fetch(csvUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const csvText = await response.text();
    const products = parseCatalogCsv(csvText);

    if (products.length === 0) {
      throw new Error('El Sheet no devolvió productos válidos');
    }

    if (import.meta.env.PROD) {
      // Only persist the fallback during `astro build` — writing it in dev mode
      // makes Vite's file watcher see data/fallback.json change and reload the
      // page, which calls fetchCatalog again and writes again: an infinite loop.
      await fs.mkdir(path.dirname(FALLBACK_PATH), { recursive: true });
      await fs.writeFile(FALLBACK_PATH, JSON.stringify(products, null, 2));
    }
    return products;
  } catch (error) {
    console.warn(
      `[catalog] No se pudo obtener el catálogo en vivo (${(error as Error).message}). Usando fallback.json`
    );
    const fallbackText = await fs.readFile(FALLBACK_PATH, 'utf-8').catch(() => '[]');
    const fallback = validateProducts(JSON.parse(fallbackText));
    if (fallback.length === 0) {
      throw new Error(
        '[catalog] Sheet no disponible y fallback.json vacío — build abortado para conservar el último deploy bueno.'
      );
    }
    return fallback;
  }
}

export interface Category {
  slug: string;
  name: string;
}

export function getCategories(products: Product[]): Category[] {
  const bySlug = new Map<string, string>();
  for (const p of products) {
    if (!bySlug.has(p.slug)) bySlug.set(p.slug, p.category);
  }
  return [...bySlug.entries()].map(([slug, name]) => ({ slug, name }));
}

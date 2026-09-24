import Papa from 'papaparse';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export interface Product {
  nombre: string;
  precio: number;
  categoria: string;
  slug: string;
  productoSlug: string;
  fotos: string[];
  descripcion: string;
  disponible: boolean;
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
      typeof p.precio === 'number' &&
      Array.isArray(p.fotos) &&
      typeof p.nombre === 'string' &&
      typeof p.productoSlug === 'string'
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
    const nombre = getField(row, 'nombre', 'producto')?.trim();
    const precioRaw = getField(row, 'precio')?.trim();
    const fotosRaw = getField(row, 'fotos', 'imagen', 'imagenes')?.trim();

    if (!nombre || !precioRaw || !fotosRaw) {
      console.warn(`[catalog] Fila descartada por datos incompletos: ${JSON.stringify(row)}`);
      continue;
    }

    // Drop a trailing 2-digit decimal/cents suffix (",00" or ".00") before
    // stripping separators — otherwise "350,00" reads as 35000 instead of 350.
    // Whole-peso pricing only; cents are truncated, not rounded.
    const cleaned = precioRaw.replace(/[.,]\d{2}$/, '').replace(/[^0-9]/g, '');
    if (!cleaned) {
      console.warn(`[catalog] Precio inválido, fila descartada: ${JSON.stringify(row)}`);
      continue;
    }
    const precio = Number(cleaned);
    if (Number.isNaN(precio)) {
      console.warn(`[catalog] Precio inválido, fila descartada: ${JSON.stringify(row)}`);
      continue;
    }

    const fotos = fotosRaw.split(',').map((url) => url.trim()).filter(Boolean);
    if (fotos.length === 0) {
      console.warn(`[catalog] Fila sin fotos válidas, descartada: ${JSON.stringify(row)}`);
      continue;
    }

    const categoria = getField(row, 'categoria')?.trim() || 'sin-categoria';
    const disponibleRaw = getField(row, 'disponible', 'en stock')?.trim().toLowerCase() ?? 'si';
    const categoriaSlug = slugify(categoria);

    const baseProductoSlug = slugify(nombre) || 'producto';
    const slugKey = `${categoriaSlug}/${baseProductoSlug}`;
    const seenCount = usedProductSlugs.get(slugKey) ?? 0;
    usedProductSlugs.set(slugKey, seenCount + 1);
    const productoSlug = seenCount === 0 ? baseProductoSlug : `${baseProductoSlug}-${seenCount + 1}`;

    products.push({
      nombre,
      precio,
      categoria,
      slug: categoriaSlug,
      productoSlug,
      fotos,
      descripcion: getField(row, 'descripcion')?.trim() || '',
      disponible: !['no', 'false', '0', 'n'].includes(disponibleRaw),
    });
  }

  return products.filter((p) => p.disponible);
}

export async function fetchCatalog(csvUrl: string): Promise<Product[]> {
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
    if (!bySlug.has(p.slug)) bySlug.set(p.slug, p.categoria);
  }
  return [...bySlug.entries()].map(([slug, name]) => ({ slug, name }));
}

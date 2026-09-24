import { describe, it, expect, vi, afterEach } from 'vitest';
import { parseCatalogCsv, getCategories, fetchCatalog } from '../src/lib/sheets';
import { promises as fs } from 'node:fs';

const SAMPLE_CSV = `nombre,precio,categoria,fotos,descripcion,disponible
Vestido Luna,2500,vestidos,https://res.cloudinary.com/demo/a.jpg,Vestido de gala,si
Bolso Aurora,1200,accesorios,"https://res.cloudinary.com/demo/b.jpg, https://res.cloudinary.com/demo/c.jpg",Bolso tejido a mano,si
Producto Oculto,900,accesorios,https://res.cloudinary.com/demo/d.jpg,No debe salir,no
Fila Incompleta,,vestidos,,Sin precio ni fotos,si
`;

describe('parseCatalogCsv', () => {
  it('parses valid rows into products', () => {
    const products = parseCatalogCsv(SAMPLE_CSV);
    expect(products).toHaveLength(2);
    expect(products[0]).toMatchObject({
      nombre: 'Vestido Luna',
      precio: 2500,
      categoria: 'vestidos',
      slug: 'vestidos',
      fotos: ['https://res.cloudinary.com/demo/a.jpg'],
      disponible: true,
    });
  });

  it('splits multiple photo URLs on the fotos column', () => {
    const products = parseCatalogCsv(SAMPLE_CSV);
    const bolso = products.find((p) => p.nombre === 'Bolso Aurora');
    expect(bolso?.fotos).toEqual([
      'https://res.cloudinary.com/demo/b.jpg',
      'https://res.cloudinary.com/demo/c.jpg',
    ]);
  });

  it('excludes products marked as disponible=no', () => {
    const products = parseCatalogCsv(SAMPLE_CSV);
    expect(products.find((p) => p.nombre === 'Producto Oculto')).toBeUndefined();
  });

  it('skips rows missing required fields', () => {
    const products = parseCatalogCsv(SAMPLE_CSV);
    expect(products.find((p) => p.nombre === 'Fila Incompleta')).toBeUndefined();
  });

  it('skips rows with non-numeric prices', () => {
    const csvWithMalformedPrice = `nombre,precio,categoria,fotos,descripcion,disponible
Producto Gratis,gratis,vestidos,https://res.cloudinary.com/demo/a.jpg,Es gratis,si
Producto NA,N/A,accesorios,https://res.cloudinary.com/demo/b.jpg,Sin precio,si
`;
    const products = parseCatalogCsv(csvWithMalformedPrice);
    expect(products).toHaveLength(0);
    expect(products.find((p) => p.nombre === 'Producto Gratis')).toBeUndefined();
    expect(products.find((p) => p.nombre === 'Producto NA')).toBeUndefined();
  });

  it('parses a dot-separated price as a whole-peso thousands separator (es-DO)', () => {
    const csvWithDottedPrice = `nombre,precio,categoria,fotos,descripcion,disponible
Taza Grande,2.500,tazas,https://res.cloudinary.com/demo/a.jpg,Taza de cerámica,si
`;
    const products = parseCatalogCsv(csvWithDottedPrice);
    expect(products.find((p) => p.nombre === 'Taza Grande')?.precio).toBe(2500);
  });

  it('drops a trailing ,00 cents suffix instead of treating it as extra digits', () => {
    const csvWithCentsSuffix = `nombre,precio,categoria,fotos,descripcion,disponible
Taza Blanca,"RD$350,00",tazas,https://res.cloudinary.com/demo/a.jpg,Taza,si
Hoodie,"RD$1.200,00",camisetas,https://res.cloudinary.com/demo/b.jpg,Hoodie,si
`;
    const products = parseCatalogCsv(csvWithCentsSuffix);
    expect(products.find((p) => p.nombre === 'Taza Blanca')?.precio).toBe(350);
    expect(products.find((p) => p.nombre === 'Hoodie')?.precio).toBe(1200);
  });

  it('skips rows whose fotos cell has no real URLs after splitting', () => {
    const csvWithEmptyFotos = `nombre,precio,categoria,fotos,descripcion,disponible
Producto Sin Foto,500,vestidos,",",Sin foto real,si
`;
    const products = parseCatalogCsv(csvWithEmptyFotos);
    expect(products.find((p) => p.nombre === 'Producto Sin Foto')).toBeUndefined();
  });

  it('skips leading title/summary rows and reads dashboard-style column names', () => {
    const dashboardCsv = `CATÁLOGO EJECUTIVO DE PRODUCTOS,,,,,,,
Resumen de inventario,,,,,,,
,,,,,,,
Total productos,2,Categorías,1,Precio promedio,,,
ID,PRODUCTO,CATEGORÍA,SLUG,PRECIO,DESCRIPCIÓN,IMAGEN,EN STOCK
PROD-001,Auriculares Pro,Audio,audio,7999,Auriculares bluetooth,https://example.com/a.jpg,Sí
PROD-002,Altavoz Portátil,Audio,audio,4550,Sonido 360,https://example.com/b.jpg,No
`;
    const products = parseCatalogCsv(dashboardCsv);
    expect(products).toHaveLength(1);
    expect(products[0]).toMatchObject({
      nombre: 'Auriculares Pro',
      precio: 7999,
      categoria: 'Audio',
      fotos: ['https://example.com/a.jpg'],
      disponible: true,
    });
    expect(products.find((p) => p.nombre === 'Altavoz Portátil')).toBeUndefined();
  });

  it('produces a URL-safe productoSlug from the product name', () => {
    const csv = `nombre,precio,categoria,fotos,descripcion,disponible
Taza de Café Grande,500,Tazas,https://res.cloudinary.com/demo/a.jpg,Taza,si
`;
    const products = parseCatalogCsv(csv);
    expect(products[0].productoSlug).toBe('taza-de-cafe-grande');
  });

  it('disambiguates two products in the same category that slugify to the same name', () => {
    const csv = `nombre,precio,categoria,fotos,descripcion,disponible
Taza Grande,500,Tazas,https://res.cloudinary.com/demo/a.jpg,Primera,si
Taza Grande!,550,Tazas,https://res.cloudinary.com/demo/b.jpg,Segunda,si
`;
    const products = parseCatalogCsv(csv);
    expect(products[0].productoSlug).toBe('taza-grande');
    expect(products[1].productoSlug).toBe('taza-grande-2');
  });

  it('produces a URL-safe slug for a category with accents and spaces', () => {
    const csvWithAccentedCategory = `nombre,precio,categoria,fotos,descripcion,disponible
Cuadro Decorativo,1500,Diseño Gráfico,https://res.cloudinary.com/demo/a.jpg,Cuadro,si
`;
    const products = parseCatalogCsv(csvWithAccentedCategory);
    expect(products[0].slug).toBe('diseno-grafico');
    expect(products[0].categoria).toBe('Diseño Gráfico');
  });
});

describe('getCategories', () => {
  it('returns unique {slug, name} pairs from the product list', () => {
    const products = parseCatalogCsv(SAMPLE_CSV);
    expect(getCategories(products)).toEqual([
      { slug: 'vestidos', name: 'vestidos' },
      { slug: 'accesorios', name: 'accesorios' },
    ]);
  });
});

describe('fetchCatalog', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('fetches CSV from URL and returns parsed products', async () => {
    const mockCsv = `nombre,precio,categoria,fotos,descripcion,disponible
Vestido Luna,2500,vestidos,https://res.cloudinary.com/demo/a.jpg,Vestido de gala,si
`;
    const mockProducts = [
      {
        nombre: 'Vestido Luna',
        precio: 2500,
        categoria: 'vestidos',
        slug: 'vestidos',
        productoSlug: 'vestido-luna',
        fotos: ['https://res.cloudinary.com/demo/a.jpg'],
        descripcion: 'Vestido de gala',
        disponible: true,
      },
    ];

    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({
        ok: true,
        text: () => Promise.resolve(mockCsv),
      } as Response)
    ));

    vi.spyOn(fs, 'mkdir').mockResolvedValue(undefined);
    vi.spyOn(fs, 'writeFile').mockResolvedValue(undefined);

    const result = await fetchCatalog('https://example.com/catalog.csv');
    expect(result).toEqual(mockProducts);
  });

  it('falls back to fallback.json when fetch fails', async () => {
    const fallbackProducts = [
      {
        nombre: 'Fallback Product',
        precio: 100,
        categoria: 'test',
        slug: 'test',
        productoSlug: 'fallback-product',
        fotos: ['https://example.com/test.jpg'],
        descripcion: 'From fallback',
        disponible: true,
      },
    ];

    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.reject(new Error('Network error'))
    ));

    vi.spyOn(fs, 'readFile').mockResolvedValue(JSON.stringify(fallbackProducts));

    const result = await fetchCatalog('https://example.com/catalog.csv');
    expect(result).toEqual(fallbackProducts);
  });

  it('throws instead of silently returning an empty catalog when both the fetch and fallback fail', async () => {
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.reject(new Error('Network error'))
    ));

    vi.spyOn(fs, 'readFile').mockResolvedValue('[]');

    await expect(fetchCatalog('https://example.com/catalog.csv')).rejects.toThrow();
  });

  it('throws instead of silently returning an empty catalog when fallback.json is missing', async () => {
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.reject(new Error('Network error'))
    ));

    vi.spyOn(fs, 'readFile').mockRejectedValue(new Error('ENOENT'));

    await expect(fetchCatalog('https://example.com/catalog.csv')).rejects.toThrow();
  });
});

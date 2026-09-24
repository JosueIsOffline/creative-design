# Catálogo web para emprendimiento de diseño — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir un sitio de catálogo estático, profesional y con animaciones GSAP, cuyo contenido se actualiza desde un Google Sheet sin tocar código y sin costo recurrente (fuera del dominio).

**Architecture:** Sitio estático generado con Astro, desplegado en Vercel (capa gratis). Los datos vienen de un Google Sheet publicado como CSV, leídos en build-time por `src/lib/sheets.ts`. Un Google Apps Script en el Sheet dispara un Deploy Hook de Vercel cuando ella edita, reconstruyendo el sitio automáticamente. Fotos alojadas en Cloudinary (plan gratis).

**Tech Stack:** Astro (TypeScript), Tailwind CSS, GSAP + ScrollTrigger, Papaparse (parseo de CSV), Vitest (tests de la capa de datos), Vercel (hosting), Google Sheets + Apps Script (CMS + auto-rebuild), Cloudinary (imágenes).

**Spec:** `docs/superpowers/specs/2026-09-15-catalogo-disenadora-design.md`

## Global Constraints

- Sin backend propio ni base de datos — el Google Sheet es la única fuente de datos.
- Sin carrito ni pagos en línea — solo catálogo + contacto por WhatsApp.
- Costo cero salvo el dominio (~$10-15/año). Vercel, Cloudinary, Google Sheets y Apps Script en sus capas gratuitas.
- Español únicamente (sin i18n).
- Un build fallido nunca debe tumbar el sitio en producción (Vercel conserva el último deploy bueno).
- Filas de producto incompletas se descartan con advertencia en el log, nunca rompen el build completo.
- Columna `disponible` permite ocultar un producto sin borrar la fila.

---

## File Structure

```
astro.config.mjs
package.json
.env.example
src/
  env.d.ts
  layouts/
    BaseLayout.astro
  components/
    Hero.astro
    About.astro
    ProductCard.astro
    CategoryFilter.astro
    WhatsAppButton.astro
    Footer.astro
  lib/
    sheets.ts            → única capa que conoce la forma del Google Sheet
  scripts/
    scroll-reveal.ts      → ScrollTrigger compartido para tarjetas de producto
  pages/
    index.astro
    catalogo/
      index.astro
      [categoria].astro
  styles/
    global.css
public/
  placeholder.jpg
data/
  fallback.json          → generado automáticamente en cada build exitoso
tests/
  sheets.test.ts
```

---

### Task 1: Scaffold del proyecto Astro + despliegue base en Vercel

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json` (generados por `create-astro`)
- Create: `src/pages/index.astro` (placeholder)
- Create: `.gitignore`

**Interfaces:**
- Produces: proyecto Astro corriendo en `npm run dev`, desplegable a Vercel sin adaptador (modo `static`, que es el default de Astro).

- [ ] **Step 1: Crear el proyecto Astro en el directorio actual**

```bash
npm create astro@latest . -- --template minimal --typescript strict --install --no-git --yes
```

- [ ] **Step 2: Agregar Tailwind CSS**

```bash
npx astro add tailwind -y
```

- [ ] **Step 3: Reemplazar el contenido placeholder de `src/pages/index.astro`**

```astro
---
---
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>Próximamente</title>
  </head>
  <body class="min-h-screen flex items-center justify-center">
    <h1 class="text-3xl font-bold">Catálogo en construcción</h1>
  </body>
</html>
```

- [ ] **Step 4: Verificar que el proyecto corre localmente**

Run: `npm run dev`
Expected: servidor arranca en `http://localhost:4321`, la página muestra "Catálogo en construcción".

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: scaffold Astro project with Tailwind"
```

- [ ] **Step 6: Crear repositorio en GitHub y conectar con Vercel**

Manual (requiere cuentas propias):
1. Crear un repo nuevo en GitHub, hacer push de este repo (`git remote add origin <url>` + `git push -u origin main`).
2. En vercel.com → "Add New Project" → importar el repo de GitHub. Vercel detecta Astro automáticamente (no requiere configuración).
3. Deploy inicial — confirmar que la URL `*.vercel.app` muestra "Catálogo en construcción".

---

### Task 2: Capa de datos del catálogo (`lib/sheets.ts`) con tests

**Files:**
- Create: `src/lib/sheets.ts`
- Create: `tests/sheets.test.ts`
- Create: `.env.example`
- Modify: `package.json` (agregar `papaparse`, `vitest`, `@types/papaparse`, script `"test": "vitest run"`)

**Interfaces:**
- Produces:
  - `interface Product { nombre: string; precio: number; categoria: string; fotos: string[]; descripcion: string; disponible: boolean }`
  - `function parseCatalogCsv(csvText: string): Product[]`
  - `async function fetchCatalog(csvUrl: string): Promise<Product[]>`
  - `function getCategories(products: Product[]): string[]`
- Consumes (Task 4 y 5 dependen de estos): las páginas y `getStaticPaths` llaman a `fetchCatalog(import.meta.env.CATALOG_CSV_URL)` y `getCategories(products)`.

- [ ] **Step 1: Instalar dependencias**

```bash
npm install papaparse
npm install -D vitest @types/papaparse
```

- [ ] **Step 2: Agregar script de test en `package.json`**

```json
"scripts": {
  "test": "vitest run"
}
```

- [ ] **Step 3: Escribir el archivo de test (debe fallar porque `sheets.ts` no existe todavía)**

`tests/sheets.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { parseCatalogCsv, getCategories } from '../src/lib/sheets';

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
});

describe('getCategories', () => {
  it('returns unique categories from the product list', () => {
    const products = parseCatalogCsv(SAMPLE_CSV);
    expect(getCategories(products)).toEqual(['vestidos', 'accesorios']);
  });
});
```

- [ ] **Step 4: Correr los tests y confirmar que fallan**

Run: `npm test`
Expected: FAIL — `Cannot find module '../src/lib/sheets'`

- [ ] **Step 5: Implementar `src/lib/sheets.ts`**

```ts
import Papa from 'papaparse';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export interface Product {
  nombre: string;
  precio: number;
  categoria: string;
  fotos: string[];
  descripcion: string;
  disponible: boolean;
}

const FALLBACK_PATH = path.join(process.cwd(), 'data', 'fallback.json');

export function parseCatalogCsv(csvText: string): Product[] {
  const { data } = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  const products: Product[] = [];

  for (const row of data) {
    const nombre = row.nombre?.trim();
    const precioRaw = row.precio?.trim();
    const fotosRaw = row.fotos?.trim();

    if (!nombre || !precioRaw || !fotosRaw) {
      console.warn(`[catalog] Fila descartada por datos incompletos: ${JSON.stringify(row)}`);
      continue;
    }

    const precio = Number(precioRaw.replace(/[^0-9.]/g, ''));
    if (Number.isNaN(precio)) {
      console.warn(`[catalog] Precio inválido, fila descartada: ${JSON.stringify(row)}`);
      continue;
    }

    products.push({
      nombre,
      precio,
      categoria: row.categoria?.trim() || 'sin-categoria',
      fotos: fotosRaw.split(',').map((url) => url.trim()).filter(Boolean),
      descripcion: row.descripcion?.trim() || '',
      disponible: (row.disponible?.trim().toLowerCase() ?? 'si') !== 'no',
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

    await fs.mkdir(path.dirname(FALLBACK_PATH), { recursive: true });
    await fs.writeFile(FALLBACK_PATH, JSON.stringify(products, null, 2));
    return products;
  } catch (error) {
    console.warn(
      `[catalog] No se pudo obtener el catálogo en vivo (${(error as Error).message}). Usando fallback.json`
    );
    const fallback = await fs.readFile(FALLBACK_PATH, 'utf-8');
    return JSON.parse(fallback);
  }
}

export function getCategories(products: Product[]): string[] {
  return [...new Set(products.map((p) => p.categoria))];
}
```

- [ ] **Step 6: Correr los tests y confirmar que pasan**

Run: `npm test`
Expected: PASS — 5 tests verdes.

- [ ] **Step 7: Crear `data/fallback.json` inicial (vacío) para que el primer build no falle si el Sheet aún no existe**

```json
[]
```

- [ ] **Step 8: Crear `.env.example`**

```
CATALOG_CSV_URL=https://docs.google.com/spreadsheets/d/e/REEMPLAZAR/pub?output=csv
WHATSAPP_NUMBER=18095551234
INSTAGRAM_URL=https://instagram.com/reemplazar
```

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add catalog data layer with CSV parsing and fallback"
```

---

### Task 3: Layout base + Hero + Sobre ella (página de inicio)

**Files:**
- Create: `src/layouts/BaseLayout.astro`
- Create: `src/components/Hero.astro`
- Create: `src/components/About.astro`
- Modify: `src/pages/index.astro`

**Interfaces:**
- `BaseLayout` consumes: `Props { title: string; description?: string }`, expone `<slot />`.
- `Hero` produces markup con atributos `data-gsap="hero-title"` y `data-gsap="hero-subtitle"` que Task 6 usa como ganchos de animación.

- [ ] **Step 1: Crear `BaseLayout.astro`**

```astro
---
import '../styles/global.css';
interface Props {
  title: string;
  description?: string;
}
const { title, description = 'Diseños hechos a mano, con identidad propia.' } = Astro.props;
---
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content={description} />
    <title>{title}</title>
  </head>
  <body class="bg-white text-gray-900">
    <slot />
  </body>
</html>
```

- [ ] **Step 2: Crear `Hero.astro`**

```astro
---
interface Props { nombreMarca: string; frase: string }
const { nombreMarca, frase } = Astro.props;
---
<section class="min-h-[70vh] flex flex-col items-center justify-center text-center px-6">
  <h1 data-gsap="hero-title" class="text-4xl sm:text-6xl font-bold">{nombreMarca}</h1>
  <p data-gsap="hero-subtitle" class="mt-4 text-lg text-gray-600 max-w-xl">{frase}</p>
  <a href="/catalogo" class="mt-8 px-6 py-3 rounded-full bg-black text-white hover:bg-gray-800 transition-colors">
    Ver catálogo
  </a>
</section>
```

- [ ] **Step 3: Crear `About.astro`**

```astro
---
interface Props { historia: string }
const { historia } = Astro.props;
---
<section class="max-w-2xl mx-auto px-6 py-16 text-center">
  <h2 class="text-2xl font-semibold mb-4">Sobre la marca</h2>
  <p class="text-gray-700 leading-relaxed">{historia}</p>
</section>
```

- [ ] **Step 4: Ensamblar `src/pages/index.astro`**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import Hero from '../components/Hero.astro';
import About from '../components/About.astro';
---
<BaseLayout title="Inicio">
  <Hero
    nombreMarca="Nombre de la marca"
    frase="Diseños hechos a mano, con identidad propia."
  />
  <About historia="Aquí va la historia real de la marca (reemplazar con el texto definitivo)." />
</BaseLayout>
```

- [ ] **Step 5: Verificar en el navegador**

Run: `npm run dev`
Checklist:
- La página de inicio muestra el Hero centrado y la sección "Sobre la marca".
- El botón "Ver catálogo" existe (el link a `/catalogo` dará 404 hasta el Task 4, es esperado).
- No hay errores en la consola del navegador.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add homepage with hero and about sections"
```

---

### Task 4: Páginas de catálogo (grid + filtro por categoría)

**Files:**
- Create: `src/components/ProductCard.astro`
- Create: `src/components/CategoryFilter.astro`
- Create: `src/pages/catalogo/index.astro`
- Create: `src/pages/catalogo/[categoria].astro`
- Create: `public/placeholder.jpg` (imagen de repuesto para fotos rotas — cualquier imagen neutra 800x800)

**Interfaces:**
- Consumes: `Product`, `fetchCatalog`, `getCategories` de `src/lib/sheets.ts` (Task 2).
- `ProductCard` consumes: `Props { product: Product }`.
- `CategoryFilter` consumes: `Props { categories: string[]; active: string | null }`.

- [ ] **Step 1: Crear `ProductCard.astro`**

```astro
---
import type { Product } from '../lib/sheets';
interface Props { product: Product }
const { product } = Astro.props;
---
<article class="product-card rounded-lg shadow-md overflow-hidden bg-white">
  <img
    src={product.fotos[0]}
    alt={product.nombre}
    class="w-full h-64 object-cover"
    loading="lazy"
    onerror="this.onerror=null;this.src='/placeholder.jpg';"
  />
  <div class="p-4">
    <h3 class="font-semibold text-lg">{product.nombre}</h3>
    <p class="text-sm text-gray-600">{product.descripcion}</p>
    <p class="mt-2 font-bold">RD$ {product.precio.toLocaleString('es-DO')}</p>
  </div>
</article>
```

- [ ] **Step 2: Crear `CategoryFilter.astro`**

```astro
---
interface Props { categories: string[]; active: string | null }
const { categories, active } = Astro.props;
---
<nav class="flex flex-wrap gap-3 p-6">
  <a
    href="/catalogo"
    class={`px-4 py-2 rounded-full border ${active === null ? 'bg-black text-white' : 'text-gray-700'}`}
  >
    Todos
  </a>
  {categories.map((categoria) => (
    <a
      href={`/catalogo/${categoria}`}
      class={`px-4 py-2 rounded-full border ${active === categoria ? 'bg-black text-white' : 'text-gray-700'}`}
    >
      {categoria}
    </a>
  ))}
</nav>
```

- [ ] **Step 3: Crear `src/pages/catalogo/index.astro`**

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import ProductCard from '../../components/ProductCard.astro';
import CategoryFilter from '../../components/CategoryFilter.astro';
import { fetchCatalog, getCategories } from '../../lib/sheets';

const products = await fetchCatalog(import.meta.env.CATALOG_CSV_URL);
const categories = getCategories(products);
---
<BaseLayout title="Catálogo">
  <CategoryFilter categories={categories} active={null} />
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 px-6 pb-16">
    {products.map((product) => <ProductCard product={product} />)}
  </div>
</BaseLayout>
```

- [ ] **Step 4: Crear `src/pages/catalogo/[categoria].astro`**

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import ProductCard from '../../components/ProductCard.astro';
import CategoryFilter from '../../components/CategoryFilter.astro';
import { fetchCatalog, getCategories, type Product } from '../../lib/sheets';

export async function getStaticPaths() {
  const products = await fetchCatalog(import.meta.env.CATALOG_CSV_URL);
  const categories = getCategories(products);

  return categories.map((categoria) => ({
    params: { categoria },
    props: {
      products: products.filter((p: Product) => p.categoria === categoria),
      categories,
    },
  }));
}

const { categoria } = Astro.params;
const { products, categories } = Astro.props;
---
<BaseLayout title={`Catálogo — ${categoria}`}>
  <CategoryFilter categories={categories} active={categoria} />
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 px-6 pb-16">
    {products.map((product) => <ProductCard product={product} />)}
  </div>
</BaseLayout>
```

- [ ] **Step 5: Configurar `.env` local con un Sheet de prueba y verificar**

1. Copiar `.env.example` a `.env`.
2. Crear un Google Sheet de prueba con las columnas `nombre,precio,categoria,fotos,descripcion,disponible` y 2-3 filas de ejemplo.
3. Publicarlo: Archivo → Compartir → Publicar en la web → formato CSV → copiar el link → pegarlo como `CATALOG_CSV_URL` en `.env`.

Run: `npm run dev` → visitar `/catalogo`
Checklist:
- Se muestran las tarjetas de los productos de prueba.
- Los botones de categoría filtran correctamente al navegar a `/catalogo/<categoria>`.
- Una fila con `disponible=no` no aparece.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add catalog grid and category filter pages"
```

---

### Task 5: Contacto — WhatsApp flotante y footer con redes

**Files:**
- Create: `src/components/WhatsAppButton.astro`
- Create: `src/components/Footer.astro`
- Modify: `src/layouts/BaseLayout.astro` (incluir `WhatsAppButton` y `Footer`)

**Interfaces:**
- `WhatsAppButton` y `Footer` leen `import.meta.env.WHATSAPP_NUMBER` e `import.meta.env.INSTAGRAM_URL` (definidos en `.env`, ver Task 2).

- [ ] **Step 1: Crear `WhatsAppButton.astro`**

```astro
---
const phone = import.meta.env.WHATSAPP_NUMBER;
const message = encodeURIComponent('Hola! Vi tu catálogo y quiero más información.');
---
<a
  href={`https://wa.me/${phone}?text=${message}`}
  target="_blank"
  rel="noopener noreferrer"
  class="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-green-500 shadow-lg hover:scale-110 transition-transform"
  aria-label="Contactar por WhatsApp"
>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" class="w-7 h-7 fill-white">
    <path d="M16 3C9.4 3 4 8.4 4 15c0 2.2.6 4.3 1.7 6.1L4 29l8.1-1.7C13.8 28 14.9 28 16 28c6.6 0 12-5.4 12-13S22.6 3 16 3zm0 23.2c-1.1 0-2.2-.2-3.2-.6l-.5-.2-4.8 1 1-4.7-.3-.5C7.1 19.6 6.4 17.9 6.4 16c0-5.3 4.3-9.6 9.6-9.6s9.6 4.3 9.6 9.6-4.3 9.6-9.6 9.6z"/>
  </svg>
</a>
```

- [ ] **Step 2: Crear `Footer.astro`**

```astro
---
const instagram = import.meta.env.INSTAGRAM_URL;
const phone = import.meta.env.WHATSAPP_NUMBER;
const currentYear = new Date().getFullYear();
---
<footer class="border-t mt-16 py-10 px-6 text-center text-sm text-gray-600">
  <div class="flex justify-center gap-6 mb-4">
    <a href={instagram} target="_blank" rel="noopener noreferrer" class="hover:text-black">Instagram</a>
    <a href={`https://wa.me/${phone}`} target="_blank" rel="noopener noreferrer" class="hover:text-black">WhatsApp</a>
  </div>
  <p>&copy; {currentYear} — Todos los derechos reservados.</p>
</footer>
```

- [ ] **Step 3: Incluir ambos en `BaseLayout.astro`**

```astro
---
import '../styles/global.css';
import WhatsAppButton from '../components/WhatsAppButton.astro';
import Footer from '../components/Footer.astro';
interface Props {
  title: string;
  description?: string;
}
const { title, description = 'Diseños hechos a mano, con identidad propia.' } = Astro.props;
---
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content={description} />
    <title>{title}</title>
  </head>
  <body class="bg-white text-gray-900">
    <slot />
    <Footer />
    <WhatsAppButton />
  </body>
</html>
```

- [ ] **Step 4: Verificar en el navegador**

Run: `npm run dev`
Checklist:
- El botón verde de WhatsApp aparece fijo abajo a la derecha en todas las páginas.
- Al hacer clic abre WhatsApp Web/App con el número y mensaje predefinido.
- El footer muestra el link de Instagram funcionando.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add WhatsApp floating button and footer"
```

---

### Task 6: Animaciones GSAP (Hero + revelado de productos al hacer scroll)

**Files:**
- Modify: `src/components/Hero.astro` (agregar `<script>`)
- Create: `src/scripts/scroll-reveal.ts`
- Modify: `src/pages/catalogo/index.astro`, `src/pages/catalogo/[categoria].astro` (importar el script)

**Interfaces:**
- Depende de los atributos `data-gsap="hero-title"` / `data-gsap="hero-subtitle"` (Task 3) y de la clase `.product-card` (Task 4).

- [ ] **Step 1: Instalar GSAP**

```bash
npm install gsap
```

- [ ] **Step 2: Agregar animación de entrada al Hero**

Al final de `src/components/Hero.astro`, agregar:
```astro
<script>
  import gsap from 'gsap';

  gsap.from('[data-gsap="hero-title"]', { opacity: 0, y: 40, duration: 1, ease: 'power3.out' });
  gsap.from('[data-gsap="hero-subtitle"]', { opacity: 0, y: 20, duration: 1, delay: 0.3, ease: 'power3.out' });
</script>
```

- [ ] **Step 3: Crear `src/scripts/scroll-reveal.ts`**

```ts
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

document.querySelectorAll('.product-card').forEach((card) => {
  gsap.from(card, {
    opacity: 0,
    y: 30,
    duration: 0.6,
    scrollTrigger: {
      trigger: card,
      start: 'top 85%',
    },
  });
});
```

- [ ] **Step 4: Importar el script en las páginas de catálogo**

Agregar al final de `src/pages/catalogo/index.astro` y `src/pages/catalogo/[categoria].astro`:
```astro
<script>
  import '../../scripts/scroll-reveal';
</script>
```

- [ ] **Step 5: Verificar en el navegador**

Run: `npm run dev`
Checklist:
- Al cargar `/`, el título y subtítulo del Hero aparecen con una animación de fade + slide hacia arriba.
- Al hacer scroll en `/catalogo`, cada tarjeta de producto aparece con un fade + slide al entrar en pantalla.
- No hay errores de `ScrollTrigger is not registered` en consola.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add GSAP hero and scroll-reveal animations"
```

---

### Task 7: Auto-rebuild — Deploy Hook de Vercel + Google Apps Script

**Files:**
- No hay archivos de código nuevos en el repo (esta tarea vive en Vercel y en el propio Google Sheet).
- Modify: `docs/superpowers/specs/2026-09-15-catalogo-disenadora-design.md` no requiere cambios; documentar el hook en un `README.md` nuevo en la raíz.

**Interfaces:**
- Ninguna — esta tarea conecta dos servicios externos entre sí.

- [ ] **Step 1: Crear el Deploy Hook en Vercel**

Manual: Vercel dashboard → proyecto → Settings → Git → Deploy Hooks → crear uno llamado `sheet-update` sobre la rama `main`. Copiar la URL generada.

- [ ] **Step 2: Agregar el script en Google Apps Script**

Manual: en el Google Sheet real (no el de prueba) → Extensiones → Apps Script → pegar:

```js
function onEditTrigger(e) {
  const properties = PropertiesService.getScriptProperties();
  const lastTriggered = Number(properties.getProperty('lastTriggered') || 0);
  const now = Date.now();

  if (now - lastTriggered < 60000) return; // máximo un build por minuto

  properties.setProperty('lastTriggered', String(now));

  UrlFetchApp.fetch('PEGAR_AQUI_LA_URL_DEL_DEPLOY_HOOK', { method: 'post' });
}
```

- [ ] **Step 3: Crear el trigger instalable**

Manual: en el editor de Apps Script → ícono de reloj (Triggers) → Add Trigger → función `onEditTrigger` → evento "From spreadsheet" → "On edit" → guardar y autorizar los permisos solicitados.

- [ ] **Step 4: Configurar las variables de entorno reales en Vercel**

Manual: Vercel dashboard → proyecto → Settings → Environment Variables → agregar `CATALOG_CSV_URL`, `WHATSAPP_NUMBER`, `INSTAGRAM_URL` con los valores reales de producción (el Sheet real publicado, no el de prueba).

- [ ] **Step 5: Verificar el flujo completo**

1. Editar una celda en el Google Sheet real (ej. cambiar un precio).
2. En el dashboard de Vercel, confirmar que aparece un nuevo deployment iniciando dentro de ~1 minuto.
3. Esperar a que termine el build y confirmar que el cambio se ve reflejado en el sitio en producción.

- [ ] **Step 6: Documentar el flujo para la novia del usuario en `README.md`**

```markdown
# Cómo actualizar el catálogo

1. Abre el Google Sheet del catálogo.
2. Agrega o edita una fila con: nombre, precio, categoría, fotos (link de Cloudinary), descripción, disponible (si/no).
3. Guarda — el sitio se actualiza solo en 1-2 minutos.
4. Para subir fotos: entra a Cloudinary, sube la imagen, copia el link y pégalo en la columna "fotos".
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "docs: document catalog auto-update workflow"
```

---

### Task 8: Dominio, SEO y QA final

**Files:**
- Modify: `src/layouts/BaseLayout.astro` (Open Graph tags)
- Create: `public/favicon.svg` (o el ícono definitivo una vez se reciba el logo)

**Interfaces:**
- Ninguna nueva — es pulido final sobre lo ya construido.

- [ ] **Step 1: Agregar integración de sitemap**

```bash
npx astro add sitemap -y
```

- [ ] **Step 2: Agregar meta tags Open Graph a `BaseLayout.astro`**

Agregar dentro de `<head>`:
```astro
<meta property="og:title" content={title} />
<meta property="og:description" content={description} />
<meta property="og:type" content="website" />
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
```

- [ ] **Step 3: Conectar el dominio en Vercel**

Manual:
1. Comprar el dominio (ej. en Namecheap).
2. Vercel dashboard → proyecto → Settings → Domains → agregar el dominio.
3. Configurar en el registrador del dominio los registros DNS que Vercel indique (normalmente un registro A o CNAME).
4. Esperar propagación DNS (puede tardar hasta 24h) y confirmar que el dominio carga el sitio con HTTPS.

- [ ] **Step 4: Checklist de QA final**

- [ ] El sitio se ve correctamente en móvil (probar con las herramientas de desarrollador del navegador, ancho 375px).
- [ ] Todas las categorías del Sheet real tienen al menos un producto visible.
- [ ] El botón de WhatsApp funciona en móvil y escritorio.
- [ ] Ninguna imagen rota (todas cargan foto real o el placeholder).
- [ ] Lighthouse (Chrome DevTools) da un puntaje de Performance y Accesibilidad razonable (>85).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: add SEO tags, sitemap, and final QA polish"
```

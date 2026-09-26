# Carrito con checkout consolidado por WhatsApp

## Contexto y objetivo

Hoy cada `ProductCard` tiene su propio botón "Solicitar por WhatsApp", que abre un `wa.me` con un mensaje de un solo producto. Para un pedido de varios productos, la clienta tiene que mandar varios mensajes sueltos, y no hay forma de agregar detalles de personalización (colores, estilo) sin escribirlos a mano.

El usuario quiere: un carrito real (agregar varios productos, ver el pedido completo, un solo checkout), y que ese checkout incluya una nota de personalización general, para que a la diseñadora le llegue un mensaje ya armado con toda la información en vez de tener que preguntarla después por WhatsApp.

## Alcance

**Sí incluye:**
- Carrito persistente en el navegador (agregar, quitar, ajustar cantidad).
- Ícono de carrito con contador en el header.
- Panel lateral (drawer) para ver/editar el carrito y hacer checkout.
- Una nota de texto opcional, general para todo el pedido (no por producto).
- Un solo mensaje de WhatsApp consolidado al finalizar, con el detalle de items, total y la nota.
- Motion del drawer informado por los principios de la skill `apple-design` (instalada en esta sesión), recortados a lo que este sitio realmente necesita.

**No incluye (decisiones explícitas, no son bugs a futuro):**
- Adjuntar imágenes automáticamente al mensaje de WhatsApp: el link `wa.me` solo precarga texto, no archivos. Adjuntar una foto de referencia seguiría siendo un paso manual de la clienta dentro de WhatsApp, y por ahora ni siquiera se le recuerda en la UI (se puede agregar después si hace falta). Lograr adjunto automático requeriría la WhatsApp Business Cloud API (cuenta verificada, backend, plantillas aprobadas, posible costo por conversación) — contradice el "gratis excepto el dominio" del sitio, así que queda fuera.
- Nota de personalización por producto (se decidió una sola, general, para todo el pedido).
- Gestos de swipe-to-dismiss con física de velocidad/proyección en el drawer (documentados en la skill `apple-design`) — demasiado código para lo que aporta en un carrito de este tamaño. Cierre por tap en el backdrop, botón "×", o Escape.
- Auditoría de animación del resto del sitio con la skill `find-animation-opportunities` — se hace en una ronda aparte, después de que el carrito esté funcionando, no como parte de este trabajo.

## Modelo de datos

```ts
type CartItem = {
  slug: string;          // categoría del producto
  productoSlug: string;  // identifica el producto dentro de la categoría
  nombre: string;
  precio: number;
  foto: string;          // primera foto, para la miniatura en el drawer
  cantidad: number;
};
```

Se guarda como un array de `CartItem` en `localStorage`, clave `cart`. Persiste entre sesiones (no `sessionStorage`) — es lo esperado en cualquier carrito de compras.

## Arquitectura

Mismo patrón que el resto del sitio (Astro estático + vanilla JS, sin framework de UI, sin dependencias nuevas de estado): un módulo `src/scripts/cart.ts` es la única fuente de verdad, con funciones puras/con efectos sobre `localStorage` (`getCart`, `addItem`, `removeItem`, `setQuantity`, `getTotal`, `clearCart`) que además disparan un evento custom (`cart:change`) en `window` después de cada mutación. Cualquier parte de la UI que necesite reflejar el carrito (el badge del header, el contenido del drawer) escucha ese evento y se re-renderiza leyendo `getCart()` — así no hace falta ningún framework reactivo ni pasar estado entre componentes Astro (que son server-rendered).

Se descartó agregar una librería de estado/reactividad (Alpine.js, una isla de Preact) — resuelve un problema que este alcance no tiene, y rompe la consistencia del resto del sitio (100% Astro + scripts chicos).

## Componentes

- **`src/scripts/cart.ts`** (nuevo): el módulo de estado descrito arriba.
- **Ícono + badge del carrito** en `BaseLayout.astro`, junto al toggle de tema. `line-md` (ya instalado) no tiene ícono de carrito/bolsa — se agrega `@iconify-json/lucide` (paquete real, verificado en npm) solo para ese ícono, estático, sin animación de loop (no necesita llamar la atención constantemente).
- **`src/components/CartDrawer.astro`** (nuevo): el panel lateral, incluido una vez desde `BaseLayout.astro` (mismo patrón que `ProductModal`/`WhatsAppButton`). Tiene dos "vistas" dentro del mismo panel:
  1. **Lista**: vacío (mensaje + link al catálogo) o con items (miniatura, nombre, cantidad +/-, quitar, subtotal), total, botón "Finalizar pedido".
  2. **Checkout**: resumen de solo lectura + total, textarea de nota (opcional), botón "Enviar por WhatsApp", flecha para volver a la lista.
- **`ProductCard.astro`**: el botón "Solicitar por WhatsApp" (que hoy abre `wa.me` directo) se reemplaza por **"Agregar al carrito"**, que llama a `addItem(...)` de `cart.ts` con los datos del producto (vía un atributo `data-product` con JSON, ya que los componentes Astro son server-rendered).

## Motion del drawer

Aplicando los principios de la skill `apple-design`, recortados al tamaño de este proyecto:

- Entra deslizando desde la derecha, sale por el mismo camino (nunca aparece de un lado y desaparece por otro).
- Animado con `transform` (GSAP), nunca `left`/`right` — barato para el navegador.
- Interrumpible gratis: el overwrite automático de GSAP mata la animación anterior y arranca la nueva desde el valor real en pantalla, así que abrir/cerrar rápido no traba ni salta.
- Backdrop semi-transparente (reutiliza el patrón de `ProductModal`).
- `prefers-reduced-motion: reduce` → cross-fade corto en vez de slide, sin desplazamiento.

## Mensaje de WhatsApp

Al tocar "Enviar por WhatsApp", se arma un solo texto:

```
Hola! Quiero hacer este pedido:

- <nombre> x<cantidad> — RD$ <subtotal>
- ...

Total: RD$ <total>

Notas: <nota, solo si no está vacía>
```

y se abre `https://wa.me/<phone>?text=<mensaje codificado>` en una pestaña nueva (mismo mecanismo ya usado en el resto del sitio). Después de abrir el link, se vacía el carrito y el drawer vuelve al estado vacío — no hay forma de confirmar que el mensaje se envió de verdad (es solo abrir un link), así que "click en enviar" se trata como pedido completado, igual que ya asumen los botones de WhatsApp existentes del sitio.

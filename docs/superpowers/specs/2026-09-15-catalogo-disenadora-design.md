# Catálogo web para emprendimiento de diseño de moda

## Contexto y objetivo

Sitio web profesional para el emprendimiento de diseño de la novia del usuario. Debe mostrar un catálogo de productos que ella pueda actualizar sin tocar código ni pagar por servicios adicionales (fuera del dominio), y verse profesional gracias a animaciones GSAP.

## Requisitos

- **Catálogo editable sin código:** ella agrega/edita/oculta productos desde Google Sheets (una fila = un producto).
- **Sincronización gratuita:** los cambios en el Sheet deben reflejarse en el sitio sin intervención manual del desarrollador y sin pagar un servicio de backend/CMS.
- **Frecuencia:** no necesita ser instantáneo; 30-60 segundos después de guardar es aceptable.
- **Alcance de la tienda:** solo catálogo/vitrina + botón de contacto por WhatsApp. Sin carrito ni pagos en línea.
- **Secciones:** Hero animado, Sobre ella/la marca, Catálogo con filtro de categorías, Contacto/redes/WhatsApp flotante.
- **Escalabilidad:** debe soportar crecimiento en número de productos sin rediseñar la arquitectura.
- **Costo:** gratis excepto el dominio (~$10-15/año).
- **Estética:** profesional, con animaciones GSAP; identidad visual basada en el logo/perfil de Instagram de la marca (pendiente de recibir el material visual).

## Arquitectura

Sitio estático generado con **Astro**, desplegado en **Vercel** (capa gratuita). Astro no envía JavaScript al cliente salvo donde se declara explícitamente, lo que mantiene el sitio liviano y deja a GSAP correr sin competir con overhead de un framework de UI reactivo.

**Fuente de datos:** un Google Sheet publicado como CSV de solo lectura (Archivo → Compartir → Publicar en la web). Una fila por producto, con columnas: `nombre`, `precio`, `categoria`, `fotos` (URLs de Cloudinary separadas por coma), `descripcion`, `disponible` (sí/no).

**Imágenes:** Cloudinary (plan gratis). Ella sube las fotos ahí y pega el link resultante en la columna `fotos` del Sheet. Cloudinary se encarga de optimización/redimensionado automático.

**Sincronización automática:** un script de Google Apps Script vinculado al Sheet, con un trigger `onEdit` (con debounce de ~1 minuto para agrupar ediciones rápidas), hace un POST al Deploy Hook de Vercel. Esto dispara una reconstrucción del sitio sin intervención manual, sin backend propio, y sin costo.

**Dominio:** comprado por separado (ej. Namecheap), apuntado por DNS a Vercel.

## Componentes

```
src/
  pages/
    index.astro          → Hero + Sobre ella + destacados + contacto
    catalogo/
      index.astro         → Grid completo con filtro de categorías
      [categoria].astro   → Página por categoría (generada en build a partir de las categorías presentes en el Sheet)
  components/
    Hero.astro            → Animación de entrada (GSAP)
    ProductCard.astro      → Tarjeta de producto individual
    CategoryFilter.astro   → Filtro de categorías
    WhatsAppButton.astro   → Botón flotante fijo
    Footer.astro           → Redes sociales, contacto
  lib/
    sheets.ts             → Único módulo que sabe leer/parsear el CSV del Sheet en build-time
data/
  fallback.json           → Última copia válida de los datos del catálogo (ver Manejo de errores)
```

Cada componente tiene una única responsabilidad. `sheets.ts` es el único punto de acoplamiento con la forma del Google Sheet: si cambian las columnas, solo se ajusta ahí.

## Flujo de datos

1. Ella edita el Google Sheet (agrega/edita una fila de producto).
2. El Apps Script detecta el cambio y, tras el debounce, llama al Deploy Hook de Vercel.
3. Vercel reconstruye el sitio: en build-time, `sheets.ts` descarga el CSV publicado, lo parsea y genera los objetos de producto que consumen las páginas Astro.
4. Vercel despliega la nueva versión. El sitio queda actualizado en ~30-60 segundos.
5. Los visitantes ven páginas ya pre-renderizadas (rápidas, buenas para SEO).

## Manejo de errores

- **Fallo de build:** si el CSV no está disponible o el parseo falla completamente, el build falla y Vercel mantiene la última versión desplegada en producción — nunca hay downtime, solo el cambio nuevo no se refleja hasta que se corrija.
- **Filas incompletas:** una fila sin nombre, precio o foto se descarta con una advertencia en el log de build, sin tumbar el resto del catálogo.
- **Ocultar sin borrar:** columna `disponible` permite que un producto deje de mostrarse sin eliminar la fila (útil para diseños agotados o temporales).
- **Imagen rota:** si un link de Cloudinary no carga, se muestra un placeholder en vez de un espacio roto.
- **Copia de seguridad de datos:** en cada build exitoso se guarda `data/fallback.json` con la última versión válida del catálogo, por si el Sheet se despublica o cambia de estructura por error.

## Verificación

No se justifica una suite de testing pesada al ser un sitio de contenido/presentación. Sí un chequeo simple en build-time: si el CSV no trae las columnas esperadas o resulta en 0 productos válidos, el log del build lo advierte de forma explícita.

**Prueba de aceptación manual:** agregar un producto nuevo en el Sheet → confirmar que aparece en el sitio dentro de 1-2 minutos, con su foto, precio y categoría correctos.

## Animaciones (GSAP)

- Hero: animación de entrada del logo/texto al cargar la página.
- `ScrollTrigger`: revelado progresivo de tarjetas de producto al hacer scroll por el catálogo.
- Transiciones suaves al cambiar de categoría.
- GSAP se carga únicamente en los componentes que lo usan, no de forma global, para mantener el sitio liviano.

## Fuera de alcance (explícitamente)

- Carrito de compras y pagos en línea.
- Panel de administración personalizado (se usa Google Sheets como "CMS").
- Backend propio o base de datos.
- Multi-idioma (se asume español únicamente salvo que se indique lo contrario).

## Pendiente antes de implementar

- Material visual de la marca (logo, paleta de colores, perfil de Instagram) para definir la identidad visual concreta — se resolverá como parte del trabajo de diseño visual (fuera de este documento de arquitectura).
- Confirmar si se usa Vercel o Netlify (ambos cumplen los mismos requisitos; se recomienda Vercel por integración más simple con Deploy Hooks y dominios).

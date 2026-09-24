# Desarrollo local

El sitio necesita un archivo `.env` con las variables de `.env.example` para poder correr — sin esto, `npm run dev`/`npm run build` fallan a propósito (es la protección que evita publicar un catálogo vacío si el Sheet real falla).

Para ver el sitio localmente **antes** de tener el Google Sheet real conectado:

```bash
cp .env.example .env
npm run dev
```

Por defecto `.env.example` apunta a `public/sample-catalog.csv` (incluido en el proyecto), así que verás productos de muestra sin configurar nada más. Cuando tengas el Sheet real publicado, solo reemplaza `CATALOG_CSV_URL` en tu `.env` (y en las variables de entorno de Vercel) por su link.

# Cómo actualizar el catálogo

1. Abre el Google Sheet del catálogo.
2. Agrega o edita una fila con: nombre, precio, categoría, fotos (link de Cloudinary), descripción, disponible (si/no).
3. Guarda — el sitio se actualiza solo en 1-2 minutos.
4. Para subir fotos: entra a Cloudinary, sube la imagen, copia el link y pégalo en la columna "fotos".

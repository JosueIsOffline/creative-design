# API de cupones de descuento

Los códigos de descuento de Creative Design se validan y se canjean en un **Web App de Google Apps Script** que lee el mismo Google Sheet del catálogo. El sitio no conoce los códigos: solo le pregunta al servidor y muestra lo que este responde.

```
Cliente ──► carrito del sitio ──► Web App (/exec) ──► Sheet: pestaña Descuentos + pestaña Catálogo
                ◄── { ok, descuento, total }  o  { ok: false, mensaje } ◄──
```

- **Las reglas y los precios los pone el servidor.** El sitio solo envía el `ID` de cada producto y su cantidad.
- **La pestaña Descuentos no se publica.** Los códigos no aparecen en ningún CSV ni en el código del sitio.
- **Los usos se cuentan solo al canjear**, cuando el cliente envía el pedido. Validar no gasta usos.

---

## Configuración

### Variable de entorno

| Variable | Dónde | Valor |
|---|---|---|
| `COUPONS_URL` | `.env` (local) y Vercel → Settings → Environment Variables | La URL del Web App, que termina en `/exec` |

Se lee **al construir el sitio**: si la cambias en Vercel, hay que volver a publicar. Si no está definida, el carrito sigue funcionando y cualquier código responde "Los códigos de descuento todavía no están disponibles."

### Despliegue del Web App (Apps Script)

**Implementar → Nueva implementación** (solo la primera vez):

| Opción | Valor | Por qué |
|---|---|---|
| Tipo | **Aplicación web** | |
| Ejecutar como | **Yo** (la cuenta dueña del Sheet) | El script lee y escribe el Sheet con tus permisos. Con "Usuario que accede", cada visitante tendría que iniciar sesión y autorizarlo. |
| Quién tiene acceso | **Cualquier persona** | Con "Cualquier usuario con una cuenta de Google", la URL redirige al inicio de sesión de Google y el navegador lo bloquea como error de CORS. |

> "Cualquier persona" solo aparece después de poner "Ejecutar como" en **Yo**.

**Para cambios en el script**, usa **Implementar → Gestionar implementaciones → ✏️ → Versión: Nueva versión**. Así se mantiene la misma URL `/exec`. Una *Nueva implementación* crea otra URL, y habría que cambiar `COUPONS_URL` en Vercel y volver a publicar.

### Pestaña `Descuentos` del Sheet

Una fila por cupón. Los nombres de columna no distinguen mayúsculas ni acentos.

| Columna | Obligatoria | Ejemplo | Qué hace |
|---|---|---|---|
| `CODIGO` | Sí | `NAVIDAD10` | El código que escribe el cliente. Sin distinción de mayúsculas ni espacios de más. |
| `TIPO` | Sí | `%` o `RD$` | Porcentaje o monto fijo. |
| `VALOR` | Sí | `10` | 10 % o RD$ 10, según el tipo. |
| `VENCE` | No | `6/1/2027` | Último día válido. Vacío = no vence. |
| `ACTIVO` | No | `TRUE` / `FALSE` | `FALSE` lo apaga sin borrarlo. |
| `USOS MÁX` | No | `100` | Límite de canjes. Vacío = sin límite. |
| `USOS` | — | `0` | **Lo llena el script.** Suma 1 en cada canje. |
| `MÍNIMO RD$` | No | `1000` | Compra mínima (subtotal) para que aplique. |
| `APLICA A` | No | `Tazas, PROD-007` | IDs, categorías o slugs separados por coma. Vacío = todo el catálogo. |

> Confirma los nombres exactos de las columnas en tu Sheet: esta tabla sigue la configuración descrita al montar el script.

### Columna `ID` del Catálogo

Cada producto necesita un `ID` único (por ejemplo `PROD-001`), porque el servidor busca precio y categoría por ese ID. El sitio lo lee del CSV publicado del Catálogo al construirse.

---

## Endpoints

Todas las respuestas son JSON. Base: `{COUPONS_URL}` (la URL `/exec`).

### `validar`: revisar un código contra un carrito

No gasta usos. El sitio lo llama al aplicar el código, cada vez que cambia el carrito con un código aplicado y al recargar la página con un código guardado.

```
GET {COUPONS_URL}?action=validar&codigo=NAVIDAD10&items=<items>
```

| Parámetro | Valor |
|---|---|
| `action` | `validar` |
| `codigo` | El código tal como lo escribió el cliente (codificado con `encodeURIComponent`) |
| `items` | `encodeURIComponent(JSON.stringify([{ "id": "PROD-001", "cantidad": 2 }, …]))` |

**Ejemplo:**

```js
const items = [{ id: 'PROD-001', cantidad: 2 }, { id: 'PROD-005', cantidad: 1 }];
const url = `${COUPONS_URL}?action=validar&codigo=${encodeURIComponent(' navidad10 ')}&items=${encodeURIComponent(JSON.stringify(items))}`;
const res = await fetch(url).then((r) => r.json());
```

```json
{
  "ok": true,
  "mensaje": "Cupón aplicado.",
  "codigo": "NAVIDAD10",
  "tipo": "%",
  "valor": 10,
  "subtotal": 1450,
  "subtotalElegible": 1450,
  "descuento": 145,
  "total": 1305
}
```

### `canjear`: usar el código al enviar el pedido

**Suma 1 uso.** Vuelve a validar todo antes de canjear, porque el cupón pudo agotarse o vencer desde que se aplicó.

```
POST {COUPONS_URL}
Content-Type: text/plain;charset=utf-8

{"action":"canjear","codigo":"NAVIDAD10","items":[{"id":"PROD-001","cantidad":2}]}
```

**Ejemplo:**

```js
const res = await fetch(COUPONS_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // ¡no application/json!
  body: JSON.stringify({ action: 'canjear', codigo: 'NAVIDAD10', items }),
}).then((r) => r.json());
```

Respuesta correcta: la misma de `validar`, más `"canjeado": true`.

### Formato de respuesta

**Éxito:**

| Campo | Tipo | Significado |
|---|---|---|
| `ok` | `true` | |
| `mensaje` | string | Texto de confirmación |
| `codigo` | string | El código normalizado (mayúsculas, sin espacios) |
| `tipo` | `"%"` \| `"RD$"` | Tipo de descuento |
| `valor` | number | 10 (por ciento) o el monto en pesos |
| `subtotal` | number | Total del carrito con los precios del Catálogo |
| `subtotalElegible` | number | Parte del subtotal a la que aplica el cupón (según `APLICA A`) |
| `descuento` | number | Pesos de descuento |
| `total` | number | `subtotal - descuento` |
| `canjeado` | `true` | Solo en `canjear` |

**Error:**

```json
{ "ok": false, "mensaje": "El código no existe." }
```

El `mensaje` está escrito para el cliente final y el sitio lo muestra tal cual. Casos posibles: el código no existe, está inactivo, venció, se agotó, el carrito no llega a la compra mínima, no aplica a esos productos, o el carrito está vacío.

> Hay mensajes técnicos que no deberían llegar al cliente ("Producto desconocido: PROD-011", "items no es JSON válido.", "Cuerpo no es JSON válido.", "Acción no soportada."). Se recomienda cambiarlos en el script por algo como "Uno de los productos de tu carrito ya no está disponible. Actualiza la página." o "No pudimos validar el cupón. Intenta de nuevo."

---

## Reglas de cálculo (servidor)

- **Precios:** salen siempre del Catálogo, nunca del navegador.
- **`%`:** se aplica sobre el `subtotalElegible`.
- **`RD$`:** es un monto fijo, con tope en el `subtotalElegible` (nunca descuenta más de lo que cuestan los productos elegibles).
- **`APLICA A`:** puede tener IDs, categorías o slugs. Vacío = todo el catálogo.
- **`MÍNIMO RD$`:** se compara con el subtotal del carrito.
- **Código:** sin distinción de mayúsculas y sin espacios de más.

---

## CORS: por qué funciona desde el navegador

- **GET:** Apps Script responde con una redirección 302 a `script.googleusercontent.com`, y esa respuesta trae `Access-Control-Allow-Origin: *`. `fetch` sigue la redirección sin configuración extra.
- **POST con `text/plain;charset=utf-8`:** cuenta como petición "simple", así que **no hay preflight** (OPTIONS). Después del 302, `fetch` repite la petición como GET a la URL de la redirección, y esa respuesta trae el resultado de `doPost`.
- **No agregues** headers como `Authorization`, `X-…` ni `Content-Type: application/json`: activan un preflight que Apps Script no responde, y el navegador bloquea la petición.

---

## Cómo lo usa el sitio

> El código del sitio está en inglés. El formato del Web App (`action=validar|canjear`, `codigo`, `cantidad`, `mensaje`, `descuento`…) sigue en español porque lo define el script de Apps Script; `src/scripts/coupons.ts` lo traduce en un solo lugar.

### Archivos

| Archivo | Rol |
|---|---|
| `src/scripts/coupons.ts` | Cliente de la API: `validateCoupon()`, `redeemCoupon()`, `toDiscount()` y mensajes ante fallos de red. Es el único lugar que conoce el formato del Web App (en español): lo traduce a tipos en inglés (`CouponItem`, `CouponResult`) en `toWire()` / `fromWire()`. |
| `src/scripts/cart-view.ts` | El carrito: campo, chip, animación, nueva validación cuando cambia el carrito y canje al enviar |
| `src/scripts/cart.ts` | Tipo `Discount` (`code`, `kind: 'percent' \| 'amount'`, `value`, `amount`), `discountAmount()` y las líneas del mensaje de WhatsApp |
| `src/lib/sheets.ts` | Lee la columna `ID` del Catálogo (`Product.id`) |
| `src/pages/carrito.astro` | Pasa `COUPONS_URL` y el mapa producto → `ID` a la página (`data-coupons-url`, `data-ids`) |

### Flujo

1. **Aplicar:** el cliente escribe el código → `validateCoupon()` (`action=validar`). Si sale bien, se muestra el chip con el ahorro, el total anterior tachado y el nuevo total. Si no, el campo tiembla y muestra el `mensaje`.
2. **Cambiar el carrito** (cantidades, quitar piezas) → `validateCoupon()` de nuevo, 0.4 s después del último cambio. Si ya no aplica, se quita el código y se muestra el motivo. Si llegan dos respuestas, gana la más reciente.
3. **Enviar el pedido** → `redeemCoupon()` (`action=canjear`):
   - La pestaña de WhatsApp se abre en el mismo clic (para que el navegador no la bloquee) y recibe el enlace cuando el servidor responde.
   - Si el canje sale bien, el mensaje usa el `descuento` canjeado.
   - Si el cupón se agotó o venció entretanto, **no se envía**: se cierra la pestaña, se quita el código y se muestra el mensaje. El carrito queda igual, con el total sin descuento, para que el cliente lo vea antes de volver a enviar.
4. **Recargar la página:** el código aplicado se guarda en el navegador (`localStorage`, clave `cart-discount`) y se valida de nuevo al volver.

### Líneas en el mensaje de WhatsApp

```
Subtotal: RD$ 3,200
Descuento (NAVIDAD10, 10%): -RD$ 320
*Total: RD$ 2,880*
```

### Mensajes propios del sitio

| Situación | Mensaje |
|---|---|
| `COUPONS_URL` vacía | "Los códigos de descuento todavía no están disponibles." |
| Sin conexión, el servidor no responde o la respuesta no es válida | "No pudimos revisar el código ahora. Revisa tu conexión e inténtalo otra vez." |

---

## Pruebas sin gastar usos

- **`validar` no gasta usos:** se puede probar libremente.
  ```bash
  curl -sL "$COUPONS_URL?action=validar&codigo=NAVIDAD10&items=%5B%7B%22id%22%3A%22PROD-001%22%2C%22cantidad%22%3A2%7D%5D"
  ```
- **El `POST` se prueba con un código que no exista** (responde `ok:false` y no toca ningún contador):
  ```bash
  curl -sL -H 'Content-Type: text/plain;charset=utf-8' \
    --data '{"action":"canjear","codigo":"NOEXISTE123","items":[{"id":"PROD-001","cantidad":1}]}' \
    "$COUPONS_URL"
  ```
- **Para probar un canje real,** crea un cupón de prueba (por ejemplo `PRUEBA`) con pocos usos, haz un pedido, revisa que `USOS` suba 1 y bórralo después.
- **Registro de llamadas:** en Apps Script → **Ejecuciones**, `doGet` son las validaciones y `doPost` los canjes.

---

## Problemas comunes

| Síntoma | Causa | Solución |
|---|---|---|
| La URL devuelve la página de inicio de sesión de Google; en el sitio, error de CORS | Acceso "Cualquier usuario con una cuenta de Google" o "Ejecutar como: Usuario que accede" | Ejecutar como **Yo**, acceso **Cualquier persona**, publicar como **Nueva versión** |
| `USOS` no sube | Solo se aplicó el código (`validar`) y no se envió el pedido | El uso cuenta al **Enviar**. Revisa que haya un `doPost` en Ejecuciones. |
| Funcionaba y dejó de funcionar tras editar el script | Se publicó como *Nueva implementación* (otra URL) | Actualiza `COUPONS_URL` en Vercel y vuelve a publicar, o despliega como *Nueva versión* de la implementación original |
| Un producto nuevo no recibe descuento | No tiene `ID`, o el sitio no se ha vuelto a publicar desde que se agregó | Pon un `ID` en el Catálogo y espera la siguiente publicación |
| El descuento difiere por unos pesos del esperado | Se cambió un precio y el sitio todavía muestra el anterior | Se corrige en la siguiente publicación; el servidor siempre usa el precio actual |
| `curl -I` devuelve 403 | Apps Script no admite peticiones `HEAD` | Normal: prueba con GET (`curl -sL`) |

// Client for the coupons Web App (Apps Script /exec). The codes live in the
// Sheet's "Descuentos" tab, which is never published: the server validates,
// prices the cart from the catalog (we only send ID + quantity) and counts uses.
//
// The Web App's wire format is in Spanish (action=validar|canjear, codigo,
// cantidad, mensaje, descuento…) because the Apps Script defines it. It is
// translated here, in toWire()/fromWire(); the rest of the site only sees
// the English types below.
import type { Discount } from './cart';

export type CouponItem = { id: string; quantity: number };
export type CouponOk = {
  ok: true;
  message: string;
  code: string;
  kind: 'percent' | 'amount';
  value: number;
  subtotal: number;
  eligibleSubtotal: number;
  discount: number;
  total: number;
  redeemed: boolean;
};
export type CouponResult = CouponOk | { ok: false; message: string };

const NOT_CONFIGURED = 'Los códigos de descuento todavía no están disponibles.';
const NETWORK_ERROR = 'No pudimos revisar el código ahora. Revisa tu conexión e inténtalo otra vez.';

/** Our items in the Web App's shape. */
const toWire = (items: CouponItem[]) => items.map((i) => ({ id: i.id, cantidad: i.quantity }));

/** The Web App's answer in our shape. Anything unexpected reads as a failure. */
async function fromWire(res: Response): Promise<CouponResult> {
  const data = await res.json();
  if (data && data.ok === true && typeof data.descuento === 'number') {
    return {
      ok: true,
      message: data.mensaje ?? '',
      code: data.codigo,
      kind: data.tipo === '%' ? 'percent' : 'amount',
      value: data.valor,
      subtotal: data.subtotal,
      eligibleSubtotal: data.subtotalElegible,
      discount: data.descuento,
      total: data.total,
      redeemed: data.canjeado === true,
    };
  }
  return { ok: false, message: typeof data?.mensaje === 'string' ? data.mensaje : NETWORK_ERROR };
}

/** Checks a code against the cart. Doesn't use it up. */
export async function validateCoupon(url: string, code: string, items: CouponItem[]): Promise<CouponResult> {
  if (!url) return { ok: false, message: NOT_CONFIGURED };
  const query = `action=validar&codigo=${encodeURIComponent(code.trim())}&items=${encodeURIComponent(JSON.stringify(toWire(items)))}`;
  try {
    return await fromWire(await fetch(`${url}?${query}`));
  } catch {
    return { ok: false, message: NETWORK_ERROR };
  }
}

/** Redeems it when the order goes out (counts one use; re-validates, it may have run out meanwhile). */
export async function redeemCoupon(url: string, code: string, items: CouponItem[]): Promise<CouponResult> {
  if (!url) return { ok: false, message: NOT_CONFIGURED };
  try {
    // text/plain keeps it a "simple" request: no CORS preflight, which Apps Script doesn't answer.
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'canjear', codigo: code.trim(), items: toWire(items) }),
    });
    return await fromWire(res);
  } catch {
    return { ok: false, message: NETWORK_ERROR };
  }
}

export const toDiscount = (r: CouponOk): Discount => ({ code: r.code, kind: r.kind, value: r.value, amount: r.discount });

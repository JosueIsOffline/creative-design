// Logic for the /carrito page (kept out of the .astro file for size).
// The phone preview is built with the same buildWhatsAppMessage() that the
// send uses, so what the client sees is exactly what gets sent.
import { animate, stagger } from 'motion';
import {
  getCart, removeItem, setQuantity, setDetails, getTotal, clearCart, hasDetails, formatDate,
  buildWhatsAppMessage, itemLine, discountAmount, esc, type CartItem, type Details, type Discount,
} from './cart';
import { roll } from './roll';
import { validateCoupon, redeemCoupon, toDiscount, type CouponItem, type CouponResult } from './coupons';

const EXPO = [0.16, 1, 0.3, 1] as const;
const IN_QUART = [0.5, 0, 0.75, 0] as const;
const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const money = (n: number) => `RD$ ${Math.round(n).toLocaleString('es-DO')}`;
const key = (i: { slug: string; productSlug: string }) => `${i.slug}/${i.productSlug}`;
const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const PLACEHOLDER = '/placeholder.jpg';
const CODE_KEY = 'cart-discount';
const storage = {
  get: () => { try { return localStorage.getItem(CODE_KEY) ?? ''; } catch { return ''; } },
  set: (v: string) => { try { if (v) localStorage.setItem(CODE_KEY, v); else localStorage.removeItem(CODE_KEY); } catch { /* not persisted */ } },
};
const TICKS = '<svg class="ms__ticks" viewBox="0 0 18 11" width="16" height="10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 6l3.2 3.2L11 1.6M7.6 8.8l.6.4L16.8 1.6"/></svg>';
/** Render a message line the way WhatsApp does: *bold*, and amounts that never break. */
const waLine = (l: string) => esc(l).replace(/\*([^*]+)\*/g, '<strong>$1</strong>').replace(/RD\$ /g, () => 'RD$&nbsp;'); // a function: in a string, "$&" means "the match"

/** Wires the cart page. Returns destroy(). */
export function mountCartView(root: HTMLElement) {
  const $ = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const filled = $('[data-filled]'), empty = $('[data-empty]'), sent = $('[data-sent]');
  const list = $<HTMLOListElement>('[data-list]');
  const chat = $('[data-chat]'), bubble = $('[data-bubble]');
  const noteEl = $<HTMLTextAreaElement>('[data-note]');
  // Height follows the text (CSS max-height caps it). field-sizing does this natively where supported.
  const fitNote = () => {
    if (CSS.supports('field-sizing', 'content')) return;
    noteEl.style.height = 'auto';
    noteEl.style.height = `${noteEl.scrollHeight + 2}px`;
  };

  let active = '';
  let discount: Discount | null = null;
  const couponsUrl = root.dataset.couponsUrl ?? '';
  // Catalog IDs by cart key (built from the Sheet): the coupons server prices the cart by ID.
  const ids: Record<string, string> = JSON.parse(root.dataset.ids || '{}');
  const items = (): CouponItem[] => getCart().flatMap((i) => (ids[key(i)] ? [{ id: ids[key(i)], quantity: i.quantity }] : []));
  let local = false; // our own edits update in place; cart:change from elsewhere re-renders
  const commit = (fn: () => void) => { local = true; fn(); local = false; };
  const find = (k: string) => getCart().find((i) => key(i) === k);

  const sub = (item: CartItem) => {
    const d: Details = item.details ?? {};
    const bits = [d.text && `“${d.text.trim()}”`, d.colors?.trim(), d.date && formatDate(d.date), d.sendsPhoto && 'foto por WhatsApp'].filter(Boolean);
    return `${money(item.price)} c/u · ${bits.length ? esc(bits.join(' · ')) : '<em>Personalizar</em>'}`;
  };

  const row = (item: CartItem, i: number) => {
    const d: Details = item.details ?? {};
    const id = `ms-e${i}`;
    return `
    <li class="ms__item" data-key="${esc(key(item))}">
      <div class="ms__row">
        <img src="${esc(item.photo)}" alt="" class="ms__img" onerror="this.onerror=null;this.src='${PLACEHOLDER}';" />
        <button type="button" class="ms__pick" data-select aria-expanded="false" aria-controls="${id}">
          <span class="ms__name">${esc(item.name)}</span>
          <span class="ms__sub" data-sub></span>
        </button>
        <span class="ms__num ms__price" data-line></span>
        <div class="ms__ctrl">
          <span class="ms__step" role="group" aria-label="Cantidad de ${esc(item.name)}">
            <button type="button" data-qty="-1" aria-label="Quitar una unidad">−</button>
            <span data-qty-value aria-live="polite">${item.quantity}</span>
            <button type="button" data-qty="1" aria-label="Agregar una unidad">+</button>
          </span>
          <button type="button" class="ms__void" data-remove aria-label="Quitar ${esc(item.name)} del carrito">Quitar</button>
        </div>
      </div>
      <div class="ms__edit" id="${id}" inert>
        <div class="ms__edit-in">
          <label class="ms__f"><span class="ms__label">¿Para cuándo?</span>
            <input class="ms__input" type="date" name="date" min="${today()}" value="${esc(d.date ?? '')}" /></label>
          <label class="ms__chk"><input type="checkbox" name="sendsPhoto" ${d.sendsPhoto ? 'checked' : ''} /> Te envío una foto o diseño por WhatsApp</label>
          <label class="ms__f ms__f--wide"><span class="ms__label">Texto o nombre</span>
            <input class="ms__input" name="text" maxlength="300" value="${esc(d.text ?? '')}" placeholder="${item.quantity > 1 ? 'Ana, Luis… (uno por pieza si cambia)' : 'Feliz cumpleaños, Ana'}" /></label>
          <label class="ms__f ms__f--wide"><span class="ms__label">Colores o estilo</span>
            <input class="ms__input" name="colors" maxlength="300" value="${esc(d.colors ?? '')}" placeholder="Lila y negro, letra cursiva" /></label>
        </div>
      </div>
    </li>`;
  };

  let hovered = ''; // piece under the pointer, in the list or in the message
  let prevLines = new Set<string>(); // line *kinds* already shown (see lineKind)
  let painted = false;
  let sizing: ReturnType<typeof animate> | null = null;

  /**
   * The phone: the real message. Each piece's lines are wrapped so they can light
   * up (active, hovered); lines that weren't there before fade in; the bubble
   * springs to its new height instead of jumping. `flash` blinks the active
   * piece's lines (they just changed) and brings them into view.
   */
  function paintMessage(flash = false, reveal = flash) {
    const cart = getCart();
    const lines = buildWhatsAppMessage(cart, noteEl.value, discount).split('\n');
    const owner: (string | undefined)[] = [];
    for (const item of cart) {
      const head = lines.indexOf(itemLine(item));
      if (head < 0) continue;
      let end = head;
      while (lines[end + 1]?.startsWith('   ·')) end++;
      for (let k = head; k <= end; k++) owner[k] = key(item);
    }
    const animated = painted && !reduce();
    // A line is "new" by its kind (Notas, Texto, a piece…), not its text: editing a
    // line must not replay its entrance on every keystroke.
    const lineKind = (l: string) => l.replace(/[:—].*$/, '').trim();
    const html = lines.map((l, i) => {
      let t = waLine(l);
      if (animated && l && !prevLines.has(lineKind(l))) t = `<span class="ms__new">${t}</span>`;
      const k = owner[i];
      if (k && owner[i - 1] !== k) {
        const cls = `ms__blk${k === active ? ' is-active' : ''}${k === hovered ? ' is-hover' : ''}`;
        t = `<span class="${cls}" data-key="${esc(k)}">${t}`;
      }
      if (k && owner[i + 1] !== k) t += '</span>';
      return t;
    });
    prevLines = new Set(lines.map(lineKind));
    painted = true;

    const before = bubble.offsetHeight;
    bubble.style.height = '';
    const time = new Date().toLocaleTimeString('es-DO', { hour: 'numeric', minute: '2-digit' });
    bubble.innerHTML = `${html.join('\n')}<span class="ms__meta-time" aria-hidden="true">${time}${TICKS}</span>`;
    const after = bubble.offsetHeight;
    if (animated && Math.abs(after - before) > 1) {
      const m = (sizing = animate(bubble, { height: [before, after] }, { type: 'spring', visualDuration: 0.35, bounce: 0 }));
      m.then(() => { if (sizing === m) bubble.style.height = ''; });
    }

    const hl = bubble.querySelector<HTMLElement>('.ms__blk.is-active');
    if (!hl || !reveal) return;
    if (flash) {
      hl.classList.add('is-flash');
      requestAnimationFrame(() => requestAnimationFrame(() => hl.classList.remove('is-flash')));
    }
    // Keep the edited lines in view inside the phone (never scrolls the page).
    const top = hl.getBoundingClientRect().top - chat.getBoundingClientRect().top;
    if (top < 0 || top > chat.clientHeight - 60) chat.scrollTo({ top: chat.scrollTop + top - 24, behavior: reduce() ? 'auto' : 'smooth' });
  }

  /** List and message, linked: pointing at a piece in one lights it up in the other. */
  function setHover(k: string) {
    if (k === hovered) return;
    hovered = k;
    list.querySelectorAll<HTMLElement>('.ms__item').forEach((li) => li.classList.toggle('is-hover', li.dataset.key === k));
    bubble.querySelectorAll<HTMLElement>('.ms__blk').forEach((b) => b.classList.toggle('is-hover', b.dataset.key === k));
  }
  const hoverFrom = (sel: string) => (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return; // touch has no hover; a tap selects instead
    setHover((e.target as HTMLElement).closest<HTMLElement>(sel)?.dataset.key ?? '');
  };
  list.addEventListener('pointerover', hoverFrom('.ms__item'));
  list.addEventListener('pointerleave', () => setHover(''));
  bubble.addEventListener('pointerover', hoverFrom('.ms__blk'));
  bubble.addEventListener('pointerleave', () => setHover(''));
  // Tapping a piece's lines in the message opens that piece to edit.
  bubble.addEventListener('click', (e) => {
    const k = (e.target as HTMLElement).closest<HTMLElement>('.ms__blk')?.dataset.key;
    if (!k) return;
    setActive(k, true);
    list.querySelector<HTMLElement>(`.ms__item[data-key="${CSS.escape(k)}"]`)?.scrollIntoView({ block: 'nearest', behavior: reduce() ? 'auto' : 'smooth' });
  });

  function totals() {
    const cart = getCart();
    $('[data-meta-products]').textContent = `${cart.length} ${cart.length === 1 ? 'producto' : 'productos'}`;
    $('[data-meta-custom]').textContent = `${cart.filter(hasDetails).length} de ${cart.length} personalizados`;
    const subtotal = getTotal(cart);
    const off = discountAmount(subtotal, discount);
    roll($('[data-total]'), money(subtotal - off), reduce());
    const was = $('[data-was]');
    was.hidden = !off;
    if (off) was.textContent = money(subtotal);
    else was.classList.remove('is-struck');
    const saves = root.querySelector('[data-promo-saves]');
    if (saves && discount) saves.textContent = `${discount.kind === 'percent' ? `${discount.value}% de descuento` : `${money(discount.value)} de descuento`} · ahorras ${money(off)}`;
  }

  // ---- Discount code ----
  const promo = root.querySelector<HTMLElement>('[data-promo]');
  const say = (text: string, error = false) => {
    const msg = root.querySelector<HTMLElement>('[data-promo-msg]'), input = root.querySelector<HTMLElement>('[data-promo-input]');
    if (!msg) return;
    msg.textContent = text;
    msg.classList.toggle('is-error', error);
    input?.setAttribute('aria-invalid', String(error));
  };
  const drop = (message: string) => { discount = null; storage.set(''); showApplied(false); say(message, true); };

  // The server decides how much a code is worth for *this* cart, so it's asked again when the
  // cart changes (debounced; a newer answer wins over a slower, older one).
  let check = 0, checkTimer = 0;
  function recheck() {
    if (!discount) return;
    clearTimeout(checkTimer);
    checkTimer = window.setTimeout(async () => {
      if (!discount) return;
      const ticket = ++check;
      const res = await validateCoupon(couponsUrl, discount.code, items());
      if (ticket !== check || !discount) return;
      if (res.ok) { discount = toDiscount(res); totals(); paintMessage(); }
      else drop(res.message);
    }, 400);
  }

  function showApplied(animated: boolean) {
    if (!promo) return;
    const chip = $('[data-promo-chip]'), form = $('[data-promo-form]'), open = $('[data-promo-open]');
    $('[data-promo-code]').textContent = discount?.code ?? '';
    chip.hidden = !discount; form.hidden = true; open.hidden = !!discount;
    const suggest = root.querySelector<HTMLElement>('[data-promo-suggest]');
    if (suggest) suggest.hidden = !!discount; // the Christmas shortcut goes once a code is in
    open.setAttribute('aria-expanded', 'false');
    totals();
    paintMessage();
    if (!discount || !animated || reduce()) {
      if (discount) $('[data-was]').classList.add('is-struck');
      return;
    }
    // Lands in layers: the chip pops in, the old total gets struck, the new one rolls down with a pulse.
    animate(chip, { opacity: [0, 1], y: [-6, 0], scale: [0.97, 1], filter: ['blur(6px)', 'blur(0px)'] }, { type: 'spring', visualDuration: 0.4, bounce: 0.1 });
    const was = $('[data-was]'), total = $('[data-total]');
    was.classList.remove('is-struck');
    animate(was, { opacity: [0, 1], x: [8, 0] }, { duration: 0.4, ease: EXPO });
    requestAnimationFrame(() => requestAnimationFrame(() => was.classList.add('is-struck')));
    total.classList.add('is-pulse');
    requestAnimationFrame(() => requestAnimationFrame(() => total.classList.remove('is-pulse')));
    animate(total, { scale: [1, 1.06, 1] }, { duration: 0.6, ease: EXPO });
  }

  if (promo) {
    const form = $<HTMLFormElement>('[data-promo-form]'), input = $<HTMLInputElement>('[data-promo-input]');
    const msg = $('[data-promo-msg]'), open = $('[data-promo-open]');
    open.addEventListener('click', () => {
      form.hidden = false; open.hidden = true; open.setAttribute('aria-expanded', 'true');
      input.focus();
      if (!reduce()) animate(form, { opacity: [0, 1], y: [-6, 0] }, { duration: 0.35, ease: EXPO });
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const apply = form.querySelector<HTMLButtonElement>('button')!;
      apply.disabled = true;
      if (!input.value.trim()) { apply.disabled = false; return input.focus(); }
      apply.textContent = 'Revisando…';
      const res: CouponResult = await validateCoupon(couponsUrl, input.value, items());
      apply.disabled = false;
      apply.textContent = 'Aplicar';
      if (res.ok) {
        discount = toDiscount(res);
        storage.set(res.code);
        say('');
        input.value = '';
        return showApplied(true);
      }
      say(res.message, true); // the server's message is written for the client
      if (!reduce()) animate(input, { x: [0, -8, 7, -5, 3, 0] }, { duration: 0.4, ease: 'easeOut' });
    });
    input.addEventListener('input', () => { if (msg.textContent && msg.classList.contains('is-error')) say(''); });
    // Christmas shortcut: applies the season's code in one tap, through the same validation.
    root.querySelector<HTMLElement>('[data-promo-suggest]')?.addEventListener('click', (e) => {
      input.value = (e.currentTarget as HTMLElement).dataset.promoSuggest!;
      form.requestSubmit();
    });
    $('[data-promo-remove]').addEventListener('click', () => {
      discount = null;
      storage.set('');
      showApplied(false);
      open.focus();
      say('Código quitado.');
    });
  }

  function paintRow(li: HTMLElement, item: CartItem) {
    roll(li.querySelector<HTMLElement>('[data-line]')!, money(item.price * item.quantity), reduce());
    li.querySelector<HTMLElement>('[data-sub]')!.innerHTML = sub(item);
    li.querySelector<HTMLElement>('[data-qty-value]')!.textContent = String(item.quantity);
    li.classList.toggle('is-done', hasDetails(item));
  }

  function setActive(k: string, focus = false) {
    if (!find(k)) return;
    active = k;
    list.querySelectorAll<HTMLElement>('.ms__item').forEach((li) => {
      const on = li.dataset.key === k;
      li.classList.toggle('is-open', on);
      li.querySelector('[data-select]')!.setAttribute('aria-expanded', String(on));
      li.querySelector<HTMLElement>('.ms__edit')!.inert = !on;
      if (on && focus) li.querySelector<HTMLInputElement>('input[name="text"]')!.focus({ preventScroll: true });
    });
    paintMessage(true);
  }

  function render(first = false) {
    if (!sent.hidden) return;
    const cart = getCart();
    const has = cart.length > 0;
    filled.hidden = !has; empty.hidden = has;
    list.innerHTML = cart.map(row).join('');
    list.querySelectorAll<HTMLElement>('.ms__item').forEach((li, i) => paintRow(li, cart[i]));
    totals();
    if (!has) return;
    // Keep the piece being edited; otherwise point at the first one still missing its details.
    const keep = cart.find((i) => key(i) === active) ?? cart.find((i) => !hasDetails(i)) ?? cart[0];
    setActive(key(keep));
    if (!first || reduce()) return;
    animate([...root.querySelectorAll('.ms__side > *, .ms__item')], { opacity: [0, 1], y: [16, 0] },
      { duration: 0.8, ease: EXPO, delay: stagger(0.05) });
    animate(root.querySelector('.ms__phone')!, { opacity: [0, 1], y: [24, 0], scale: [0.97, 1] }, { duration: 0.9, ease: EXPO, delay: 0.2 });
    animate(bubble, { opacity: [0, 1], y: [12, 0], filter: ['blur(6px)', 'blur(0px)'] }, { duration: 0.7, ease: EXPO, delay: 0.55 });
    animate(root.querySelector('.ms__dock')!, { opacity: [0, 1], y: [12, 0] }, { duration: 0.7, ease: EXPO, delay: 0.4 });
  }

  list.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const li = t.closest<HTMLElement>('.ms__item');
    if (!li) return;
    const item = find(li.dataset.key!);
    if (!item) return;
    if (t.closest('[data-select]')) return setActive(li.dataset.key!, true);

    const qtyBtn = t.closest<HTMLElement>('[data-qty]');
    if (t.closest('[data-remove]') || (qtyBtn && item.quantity + Number(qtyBtn.dataset.qty) <= 0)) {
      const go = () => {
        commit(() => removeItem(item.slug, item.productSlug));
        recheck();
        if (active === li.dataset.key) active = '';
        render();
      };
      if (reduce()) return go();
      li.style.overflow = 'hidden';
      animate(li, { height: [li.offsetHeight, 0], opacity: 0 }, { duration: 0.3, ease: IN_QUART }).then(go);
      return;
    }
    if (qtyBtn) {
      commit(() => setQuantity(item.slug, item.productSlug, item.quantity + Number(qtyBtn.dataset.qty)));
      recheck();
      const next = find(li.dataset.key!);
      if (next) paintRow(li, next);
      totals();
      paintMessage(li.dataset.key === active);
    }
  });

  // Details save as they're typed; the line's note and the message follow live.
  list.addEventListener('input', (e) => {
    const li = (e.target as HTMLElement).closest<HTMLElement>('.ms__item');
    if (!li) return;
    const item = find(li.dataset.key!);
    if (!item) return;
    const f = (n: string) => li.querySelector<HTMLInputElement>(`[name="${n}"]`)!;
    commit(() => setDetails(item.slug, item.productSlug, {
      text: f('text').value, colors: f('colors').value, date: f('date').value, sendsPhoto: f('sendsPhoto').checked,
    }));
    const next = find(li.dataset.key!);
    if (next) paintRow(li, next);
    totals();
    paintMessage(false, true); // keep it in view, but don't flash on every keystroke
  });
  // Like WhatsApp on desktop: Enter sends, Shift+Enter starts a new line.
  noteEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); }
  });
  noteEl.addEventListener('input', () => {
    fitNote();
    paintMessage();
    chat.scrollTo({ top: chat.scrollHeight }); // the note lands at the end of the message
  });

  let sending = false;
  async function send() {
    const cart = getCart();
    if (!cart.length || sending) return;
    const waUrl = () => `https://wa.me/${root.dataset.phone ?? ''}?text=${encodeURIComponent(buildWhatsAppMessage(cart, noteEl.value, discount))}`;
    let url: string;
    if (!discount) {
      url = waUrl();
      window.open(url, '_blank', 'noopener'); // inside the click, so it isn't blocked as a pop-up
    } else {
      // Redeem first (it counts a use and may say the code ran out meanwhile). The tab opens now,
      // still inside the click, and gets its address when the server answers.
      const win = window.open('about:blank', '_blank');
      if (win) win.opener = null;
      sending = true;
      root.querySelectorAll<HTMLButtonElement>('[data-send], .ms__compose-send').forEach((b) => (b.disabled = true));
      const res = await redeemCoupon(couponsUrl, discount.code, items());
      root.querySelectorAll<HTMLButtonElement>('[data-send], .ms__compose-send').forEach((b) => (b.disabled = false));
      sending = false;
      if (!res.ok) {
        win?.close();
        drop(res.message);
        root.querySelector('[data-promo]')?.scrollIntoView({ block: 'nearest', behavior: reduce() ? 'auto' : 'smooth' });
        return;
      }
      discount = toDiscount(res); // the redeemed amount is what goes in the message
      url = waUrl();
      if (win) win.location.href = url;
      else location.href = url; // pop-up blocked anyway: go in this tab
    }
    $<HTMLAnchorElement>('[data-reopen]').href = url;
    commit(clearCart);
    discount = null;
    storage.set('');
    const done = () => {
      noteEl.value = '';
      fitNote();
      filled.hidden = true; empty.hidden = true; sent.hidden = false;
      if (!reduce()) animate([...sent.children], { opacity: [0, 1], y: [16, 0] }, { duration: 0.7, ease: EXPO, delay: stagger(0.06) });
    };
    if (reduce()) return done();
    // Delivered: the ticks turn blue and the bubble settles, then the page moves on.
    bubble.classList.add('is-read');
    animate(bubble, { scale: [1, 1.02, 1] }, { duration: 0.35, ease: EXPO });
    setTimeout(done, 650);
  }
  $('[data-send]').addEventListener('click', send);
  $('[data-composer]').addEventListener('submit', (e) => { e.preventDefault(); send(); });

  const onChange = () => { if (!local) { render(); recheck(); } };
  window.addEventListener('cart:change', onChange);
  render(true);
  // A code applied earlier comes back with the cart (re-checked: it may have expired).
  const saved = storage.get();
  if (saved && promo) validateCoupon(couponsUrl, saved, items()).then((res) => {
    if (res.ok) { discount = toDiscount(res); showApplied(false); }
    else storage.set('');
  });
  return { destroy: () => window.removeEventListener('cart:change', onChange) };
}

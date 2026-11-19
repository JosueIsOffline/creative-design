// Number Flow-style digits: each digit is a 0–9 column that slides to its
// value. Same shape (e.g. 900 → 950) rolls in place; a new shape (900 → 1,550)
// rebuilds with every digit at 0 and rolls up. Screen readers get the plain text.
import { esc } from './cart';

export function roll(el: HTMLElement, text: string, instant = false) {
  const chars = [...text];
  const cols = [...el.querySelectorAll<HTMLElement>('[data-r]')];
  const same = cols.length === chars.length && chars.every((c, i) => /\d/.test(c) === (cols[i].dataset.r === 'd'));
  el.querySelector('.sr-only')?.remove();
  if (!same) {
    el.innerHTML = chars
      .map((c) =>
        /\d/.test(c)
          ? `<span class="r" data-r="d" aria-hidden="true"><span class="r__c">${[...'0123456789'].map((d) => `<span>${d}</span>`).join('')}</span></span>`
          : `<span class="r" data-r="s" aria-hidden="true">${esc(c)}</span>`
      )
      .join('');
    void el.offsetHeight; // commit the 0 position so the roll animates from it
  }
  el.insertAdjacentHTML('afterbegin', `<span class="sr-only">${esc(text)}</span>`);
  const live = [...el.querySelectorAll<HTMLElement>('[data-r]')];
  chars.forEach((c, i) => {
    if (/\d/.test(c)) live[i].querySelector<HTMLElement>('.r__c')!.style.translate = `0 -${Number(c) * 10}%`;
    else live[i].textContent = c;
  });
  el.classList.toggle('is-instant', instant);
}

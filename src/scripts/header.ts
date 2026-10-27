// Floating header pill behavior (adapted from the Halo reference header,
// simplified — no pixel-by-pixel background sampling since this site
// doesn't alternate light/dark panels the way that template's one-page
// layout does). Sections that are always a dark photo regardless of the
// site's theme (Services' intro, About) carry data-nav-theme="dark";
// the pill reads that explicit marker instead of computing color
// lightness, which is deterministic and needs far less code.
function mount() {
  const header = document.getElementById('site-header');
  if (!header) return;

  function tone() {
    const rect = header!.getBoundingClientRect();
    const el = document.elementFromPoint(rect.left + rect.width / 2, rect.bottom + 12);
    header!.dataset.tone = el?.closest('[data-nav-theme="dark"]') ? 'forced-dark' : '';
  }

  if (!header.dataset.headerMounted) {
    header.dataset.headerMounted = 'true';

    let lastY = window.scrollY;
    let queued = false;

    const onScroll = () => {
      const y = window.scrollY;
      header!.classList.toggle('is-scrolled', y > 10);
      // Never slides away with the menu open.
      header!.classList.toggle('is-away', y > lastY && y > 80 && !header!.classList.contains('is-open'));
      lastY = y;
      tone();
      queued = false;
    };

    window.addEventListener(
      'scroll',
      () => {
        if (!queued) {
          queued = true;
          requestAnimationFrame(onScroll);
        }
      },
      { passive: true }
    );
    window.addEventListener('resize', tone);
  }

  // Re-check on every navigation too — the page under the pill changed,
  // but no scroll event fires on its own when that happens.
  tone();
}

document.addEventListener('astro:page-load', mount);

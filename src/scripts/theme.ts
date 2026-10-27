export type Theme = 'light' | 'dark';

export function resolveTheme(stored: string | null, prefersLight: boolean): Theme {
  if (stored === 'light' || stored === 'dark') return stored;
  return prefersLight ? 'light' : 'dark';
}

if (typeof document !== 'undefined') {
  const applyTheme = (theme: Theme) => {
    document.documentElement.dataset.theme = theme;
  };

  const currentTheme = (): Theme =>
    document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';

  const setTheme = (theme: Theme) => {
    try {
      localStorage.setItem('theme', theme);
    } catch {
      // localStorage can throw in restrictive private-browsing modes —
      // the theme still applies for this page view, it just won't persist.
    }

    if (document.startViewTransition) {
      // The marker class turns on the diagonal wipe (global.css) for this
      // transition only, not for Astro's page navigations.
      document.documentElement.classList.add('is-theme-transition');
      const transition = document.startViewTransition(() => applyTheme(theme));
      active = transition;
      transition.finished.catch(() => {}).finally(() => {
        document.documentElement.classList.remove('is-theme-transition');
        if (active === transition) active = null;
      });
    } else {
      applyTheme(theme);
    }
  };

  // While a view transition plays, Chrome hit-tests every click to <html>,
  // so nothing on the page responds for the whole wipe. A click then ends
  // the wipe at once and is handed to whatever is under the pointer.
  let active: ViewTransition | null = null;
  document.addEventListener(
    'click',
    (e) => {
      if (!active || e.target !== document.documentElement) return;
      const { clientX: x, clientY: y } = e;
      active.skipTransition();
      // dispatchEvent, not .click(): the target may be an SVG icon.
      active.finished.finally(() =>
        document.elementFromPoint(x, y)?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: x, clientY: y }))
      );
    },
    true
  );

  document.getElementById('theme-toggle')?.addEventListener('click', () => {
    setTheme(currentTheme() === 'light' ? 'dark' : 'light');
  });

  // Astro's ClientRouter swaps <html>'s attributes from the freshly
  // fetched (unexecuted) document on every client-side navigation, which
  // wipes data-theme — it's only ever set by the inline bootstrap script,
  // which doesn't re-run on soft navs. Without this, neither the dark nor
  // light toggle-icon rule matches and both icons show at once. Re-apply
  // the stored choice right after every swap.
  document.addEventListener('astro:after-swap', () => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem('theme');
    } catch {
      // localStorage can throw in restrictive private-browsing modes.
    }
    applyTheme(resolveTheme(stored, matchMedia('(prefers-color-scheme: light)').matches));
  });
}

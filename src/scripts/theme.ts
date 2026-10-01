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
      document.startViewTransition(() => applyTheme(theme));
    } else {
      applyTheme(theme);
    }
  };

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

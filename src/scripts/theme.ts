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
}

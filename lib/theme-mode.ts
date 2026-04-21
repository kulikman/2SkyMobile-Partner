export const THEME_MODE_COOKIE = 'threadoc-theme-mode';

export const THEME_MODES = ['system', 'light', 'dark'] as const;

export type ThemeMode = (typeof THEME_MODES)[number];

export function normalizeThemeMode(value: string | undefined | null): ThemeMode {
  if (value === 'light' || value === 'dark' || value === 'system') {
    return value;
  }

  return 'system';
}

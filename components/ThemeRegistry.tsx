'use client';

import { useMemo } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import type { StorageManager } from '@mui/system/cssVars';
import type { ThemeMode } from '@/lib/theme-mode';
import { THEME_MODE_COOKIE } from '@/lib/theme-mode';

const THEME_CHANGE_EVENT = 'threadoc-theme-mode-change';

function readCookieValue(key: string) {
  if (typeof document === 'undefined') return null;

  const prefix = `${key}=`;
  for (const cookie of document.cookie.split(';')) {
    const trimmed = cookie.trim();
    if (trimmed.startsWith(prefix)) {
      return decodeURIComponent(trimmed.slice(prefix.length));
    }
  }

  return null;
}

const cookieStorageManager: StorageManager = ({ key }) => ({
  get(defaultValue) {
    return readCookieValue(key) ?? defaultValue;
  },
  set(value) {
    if (typeof document === 'undefined') return;

    document.cookie = `${key}=${encodeURIComponent(String(value))}; Path=/; Max-Age=31536000; SameSite=Lax`;
    window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: { key, value } }));
  },
  subscribe(handler) {
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<{ key?: string; value?: unknown }>).detail;
      if (detail?.key === key) {
        handler(detail.value);
      }
    };

    window.addEventListener(THEME_CHANGE_EVENT, listener);
    return () => window.removeEventListener(THEME_CHANGE_EVENT, listener);
  },
});

export function ThemeRegistry({
  children,
  initialMode,
}: {
  children: React.ReactNode;
  initialMode: ThemeMode;
}) {
  const theme = useMemo(
    () =>
      createTheme({
        cssVariables: {
          cssVarPrefix: 'threadoc',
          colorSchemeSelector: 'data-mui-color-scheme',
        },
        colorSchemes: {
          light: {
            palette: {
              primary: { main: '#0c7bdc' },
              secondary: { main: '#062e65' },
              background: { default: '#eef4fb', paper: '#ffffff' },
              text: { primary: '#122033', secondary: '#5f7188' },
            },
          },
          dark: {
            palette: {
              primary: { main: '#68b4ff' },
              secondary: { main: '#9dc7ff' },
              background: { default: '#0b1420', paper: '#111c2b' },
              text: { primary: '#eef4ff', secondary: '#a7b6cc' },
            },
          },
        },
        shape: { borderRadius: 10 },
        typography: {
          fontFamily: '"Segoe UI", "Trebuchet MS", sans-serif',
          h3: { fontWeight: 800, letterSpacing: '-0.03em' },
          h4: { fontWeight: 800, letterSpacing: '-0.03em' },
          h5: { fontWeight: 750 },
          button: { textTransform: 'none', fontWeight: 700 },
        },
        components: {
          MuiCssBaseline: {
            styleOverrides: {
              body: {
                backgroundImage:
                  'radial-gradient(circle at top, rgba(12, 123, 220, 0.12), transparent 38%)',
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundImage: 'none',
              },
              outlined: ({ theme }) => ({
                borderColor: 'rgba(12, 123, 220, 0.12)',
                ...theme.applyStyles('dark', {
                  borderColor: 'rgba(104, 180, 255, 0.16)',
                }),
              }),
            },
          },
          MuiButton: {
            styleOverrides: {
              text: ({ theme }) => ({
                color: theme.palette.text.secondary,
                ...theme.applyStyles('dark', {
                  color: theme.palette.text.primary,
                }),
              }),
            },
          },
          MuiToggleButtonGroup: {
            styleOverrides: {
              root: ({ theme }) => ({
                borderRadius: 20,
                border: `1px solid ${theme.palette.divider}`,
                backgroundColor: 'rgba(255,255,255,0.65)',
                ...theme.applyStyles('dark', {
                  backgroundColor: 'rgba(23, 40, 60, 0.82)',
                }),
              }),
              grouped: ({ theme }) => ({
                border: 0,
                color: theme.palette.text.secondary,
                ...theme.applyStyles('dark', {
                  color: theme.palette.text.primary,
                }),
                '&.Mui-selected': {
                  color: theme.palette.primary.contrastText,
                  backgroundColor: theme.palette.primary.main,
                },
                '&.Mui-selected:hover': {
                  backgroundColor: theme.palette.primary.dark,
                },
              }),
            },
          },
        },
      }),
    []
  );

  return (
    <AppRouterCacheProvider>
      <ThemeProvider
        theme={theme}
        defaultMode={initialMode}
        modeStorageKey={THEME_MODE_COOKIE}
        storageManager={cookieStorageManager}
        disableTransitionOnChange
      >
        <CssBaseline enableColorScheme />
        {children}
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}

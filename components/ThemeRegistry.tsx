'use client';

import { useMemo } from 'react';
import { ThemeProvider, createTheme, type Theme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import type { StorageManager } from '@mui/system/cssVars';
import type { ThemeMode } from '@/lib/theme-mode';
import { THEME_MODE_COOKIE } from '@/lib/theme-mode';
import { CRM } from '@/lib/crm-design-tokens';

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

const figtreeStack =
  'var(--font-figtree), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

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
              primary: {
                main: CRM.brand.DEFAULT,
                light: CRM.brand.light,
                dark: CRM.brand.hover,
                contrastText: '#ffffff',
              },
              secondary: { main: CRM.ink[700], contrastText: '#ffffff' },
              divider: CRM.ink[200],
              background: { default: CRM.ink[50], paper: '#ffffff' },
              text: { primary: CRM.ink[900], secondary: CRM.ink[400] },
              error: { main: CRM.semantic.danger },
              success: { main: CRM.semantic.successText },
              warning: { main: CRM.semantic.warning },
              action: { hover: CRM.ink[50], selected: CRM.brand.tint },
            },
          },
          dark: {
            palette: {
              primary: {
                main: '#5CB3FF',
                light: '#B8E0FF',
                dark: '#3A9AE8',
                contrastText: '#ffffff',
              },
              secondary: { main: '#C7CCD1', contrastText: '#0e1114' },
              divider: 'rgba(199, 204, 209, 0.28)',
              background: { default: '#0e1114', paper: '#181c20' },
              text: { primary: '#f5f6f7', secondary: '#9ca3af' },
              error: { main: '#f0a8a6' },
              success: { main: '#86efac' },
              warning: { main: '#fbbf24' },
              action: { hover: 'rgba(255,255,255,0.06)', selected: 'rgba(0,124,219,0.18)' },
            },
          },
        },
        shape: { borderRadius: 4 },
        typography: {
          fontFamily: figtreeStack,
          htmlFontSize: 16,
          body1: { fontSize: '0.8125rem', lineHeight: 1.5 },
          body2: { fontSize: '0.75rem', lineHeight: 1.4 },
          h3: { fontWeight: 800, letterSpacing: '-0.02em' },
          h4: { fontWeight: 800, letterSpacing: '-0.02em' },
          h5: { fontSize: '1.125rem', fontWeight: 700, letterSpacing: '-0.01em' },
          h6: { fontSize: '0.9375rem', fontWeight: 600 },
          subtitle1: { fontSize: '0.875rem', fontWeight: 600 },
          subtitle2: { fontSize: '0.8125rem', fontWeight: 600 },
          caption: {
            fontSize: '0.6875rem',
            fontWeight: 600,
            letterSpacing: '0.06em',
            lineHeight: 1.4,
          },
          button: { textTransform: 'none', fontWeight: 600, fontSize: '0.8125rem' },
        },
        components: {
          MuiCssBaseline: {
            styleOverrides: {
              body: ({ theme }: { theme: Theme }) => ({
                backgroundColor: CRM.ink[50],
                backgroundImage: 'none',
                WebkitFontSmoothing: 'antialiased',
                ...theme.applyStyles('dark', {
                  backgroundColor: theme.palette.background.default,
                }),
              }),
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundImage: 'none',
                borderRadius: CRM.radius.xl,
              },
              outlined: ({ theme }) => ({
                borderColor: CRM.ink[200],
                ...theme.applyStyles('dark', {
                  borderColor: 'rgba(199, 204, 209, 0.22)',
                }),
              }),
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                borderRadius: CRM.radius.xl,
                boxShadow: CRM.shadow.card,
              },
            },
          },
          MuiButton: {
            styleOverrides: {
              root: {
                borderRadius: CRM.radius.md,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.8125rem',
                boxShadow: 'none',
              },
              containedPrimary: {
                backgroundColor: CRM.brand.DEFAULT,
                '&:hover': { backgroundColor: CRM.brand.hover },
                '&:active': { backgroundColor: CRM.brand.active },
              },
              outlined: ({ theme }) => ({
                borderWidth: '1px',
                borderColor: CRM.ink[200],
                color: CRM.ink[700],
                '&:hover': {
                  borderColor: CRM.ink[200],
                  backgroundColor: CRM.ink[50],
                  color: CRM.ink[900],
                },
                ...theme.applyStyles('dark', {
                  borderColor: 'rgba(199, 204, 209, 0.28)',
                  color: theme.palette.text.secondary,
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    color: theme.palette.text.primary,
                  },
                }),
              }),
              text: ({ theme }) => ({
                color: theme.palette.text.secondary,
                ...theme.applyStyles('dark', {
                  color: theme.palette.text.primary,
                }),
              }),
            },
          },
          MuiOutlinedInput: {
            styleOverrides: {
              root: {
                borderRadius: CRM.radius.md,
                '&.Mui-focused': {
                  boxShadow: CRM.shadow.ringFocus,
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderWidth: '1.5px',
                  borderColor: CRM.brand.DEFAULT,
                },
              },
              notchedOutline: {
                borderColor: CRM.ink[200],
              },
            },
          },
          MuiTextField: {
            defaultProps: { variant: 'outlined', size: 'small' },
          },
          MuiLink: {
            styleOverrides: {
              root: {
                fontWeight: 600,
              },
            },
          },
          MuiToggleButtonGroup: {
            styleOverrides: {
              root: ({ theme }) => ({
                borderRadius: 4,
                border: `1px solid ${CRM.ink[200]}`,
                backgroundColor: '#ffffff',
                ...theme.applyStyles('dark', {
                  borderColor: 'rgba(199, 204, 209, 0.22)',
                  backgroundColor: 'rgba(24, 28, 32, 0.6)',
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

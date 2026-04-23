'use client';

import { useMemo } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { CRM } from '@/lib/crm-design-tokens';

const figtreeStack =
  'var(--font-figtree), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

export function ThemeRegistry({ children }: { children: React.ReactNode }) {
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
              body: {
                backgroundColor: CRM.ink[50],
                backgroundImage: 'none',
                WebkitFontSmoothing: 'antialiased',
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundImage: 'none',
                borderRadius: CRM.radius.xl,
              },
              outlined: {
                borderColor: CRM.ink[200],
              },
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
              outlined: {
                borderWidth: '1px',
                borderColor: CRM.ink[200],
                color: CRM.ink[700],
                '&:hover': {
                  borderColor: CRM.ink[200],
                  backgroundColor: CRM.ink[50],
                  color: CRM.ink[900],
                },
              },
              text: {
                color: CRM.ink[700],
              },
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
              root: {
                borderRadius: 4,
                border: `1px solid ${CRM.ink[200]}`,
                backgroundColor: '#ffffff',
              },
              grouped: ({ theme }) => ({
                border: 0,
                color: theme.palette.text.secondary,
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
      <ThemeProvider theme={theme} defaultMode="light" disableTransitionOnChange>
        <CssBaseline enableColorScheme />
        {children}
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}

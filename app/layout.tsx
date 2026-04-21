import type { Metadata } from 'next';
import InitColorSchemeScript from '@mui/material/InitColorSchemeScript';
import { cookies } from 'next/headers';
import { ThemeRegistry } from '@/components/ThemeRegistry';
import { normalizeThemeMode, THEME_MODE_COOKIE } from '@/lib/theme-mode';

export const metadata: Metadata = {
  title: 'Threadoc',
  description: 'TD collaborative reading and annotation workspace',
  icons: {
    icon: '/td-logo.svg',
    shortcut: '/td-logo.svg',
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const initialMode = normalizeThemeMode(cookieStore.get(THEME_MODE_COOKIE)?.value);

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <InitColorSchemeScript
          attribute="data-mui-color-scheme"
          modeStorageKey={THEME_MODE_COOKIE}
          defaultMode={initialMode}
        />
        <ThemeRegistry initialMode={initialMode}>{children}</ThemeRegistry>
      </body>
    </html>
  );
}

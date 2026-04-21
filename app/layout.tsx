import type { Metadata } from 'next';
import InitColorSchemeScript from '@mui/material/InitColorSchemeScript';
import { Figtree } from 'next/font/google';
import { cookies } from 'next/headers';
import { ThemeRegistry } from '@/components/ThemeRegistry';
import { normalizeThemeMode, THEME_MODE_COOKIE } from '@/lib/theme-mode';

const figtree = Figtree({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-figtree',
});

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
    <html lang="en" className={figtree.variable} suppressHydrationWarning>
      <body className={figtree.className}>
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

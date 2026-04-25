/**
 * Centralized security headers applied to every response via proxy.ts.
 *
 * CSP notes:
 *   - 'unsafe-inline' for styles is required by MUI (it injects emotion/runtime styles).
 *   - 'unsafe-eval' is NOT included in production.
 *   - Supabase WSS/HTTPS origins are whitelisted in connect-src.
 *   - blob: in worker-src is required by tldraw (whiteboard canvas).
 */

interface SecurityHeaderOptions {
  /** Relax CSP in development so HMR / eval work. */
  isDev: boolean;
}

function buildCsp(options: SecurityHeaderOptions): string {
  const supabaseHost = new URL(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co'
  ).host;

  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      "'unsafe-inline'",
      ...(options.isDev ? ["'unsafe-eval'"] : []),
    ],
    'style-src': ["'self'", "'unsafe-inline'"],
    'font-src': ["'self'", 'data:'],
    'img-src': ["'self'", 'data:', 'blob:', 'https:'],
    'connect-src': [
      "'self'",
      `https://${supabaseHost}`,
      `wss://${supabaseHost}`,
      ...(options.isDev ? ['ws://localhost:*', 'http://localhost:*'] : []),
    ],
    // tldraw needs blob: workers for its canvas engine
    'worker-src': ["'self'", 'blob:'],
    'frame-ancestors': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'object-src': ["'none'"],
    'upgrade-insecure-requests': [],
  };

  return Object.entries(directives)
    .map(([key, values]) => (values.length ? `${key} ${values.join(' ')}` : key))
    .join('; ');
}

/**
 * Returns a map of header-name → header-value to apply to every response.
 */
export function buildSecurityHeaders(options: SecurityHeaderOptions): Record<string, string> {
  return {
    'Content-Security-Policy': buildCsp(options),
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    'X-DNS-Prefetch-Control': 'off',
  };
}

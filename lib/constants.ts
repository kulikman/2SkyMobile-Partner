/**
 * Canonical route map for the application.
 *
 * Rules:
 *   - Every nested route must have a navigable parent (no dead intermediate URLs).
 *   - Dynamic segments: `/projects/[id]`, never `/p/[id]`.
 *   - Add new routes here when creating new pages.
 */
export const ROUTES = {
  // Public
  home: '/',
  login: '/login',

  // Shared (public, token-based)
  share: (token: string) => `/share/${token}` as const,
  shareFolder: (slug: string) => `/share/folders/${slug}` as const,

  // App
  docs: (slug: string) => `/docs/${slug}` as const,
  folders: (id: string) => `/folders/${id}` as const,
  projects: (id: string) => `/projects/${id}` as const,
  company: (slug: string) => `/c/${slug}` as const,
  blueprint: '/blueprint',

  // Admin
  admin: {
    users: '/admin/users',
    companies: '/admin/companies',
    projects: '/admin/projects',
    briefs: '/admin/briefs',
  },
} as const;

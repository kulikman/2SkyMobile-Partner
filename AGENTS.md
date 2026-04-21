<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Verify

- Install and run with `npm install`, `npm run dev`.
- The only package scripts are `npm run lint`, `npm run build`, and `npm run start`; there is no test script.
- For a full local check, run `npm run lint` then `npm run build`.

## Stack And Structure

- This is a single Next.js 16 App Router app at the repo root; there is no monorepo/workspace layout.
- UI is MUI-first, not Tailwind-first. Tailwind is only wired through `postcss.config.mjs`; preserve existing MUI patterns unless a file already uses utility classes.
- Main boundaries: routes in `app/`, reusable UI in `components/`, server/client helpers in `lib/`, database SQL in `supabase/`.
- `folders` are the project hierarchy. Top-level folders drive the `/` dashboard; nested folders and `documents` power the board/share flows.
- `documents.doc_type` controls rendering. `md` documents use the markdown/comment flow; `whiteboard` documents render through the tldraw viewer/editor path.

## Auth And Routing

- Auth/session refresh is enforced in `proxy.ts`, not `middleware.ts`. In this Next version the exported function is `proxy`; do not “fix” it back to old middleware conventions.
- `proxy.ts` intentionally leaves `/share/**` public and also allows anonymous `POST /api/comments`. Keep those exceptions if you tighten auth.
- Admin access is consistently keyed off `user.user_metadata.role === 'admin'`.
- Route protection is duplicated: `proxy.ts` does the edge redirect, and some pages/layouts still call `supabase.auth.getUser()` and redirect server-side. Keep both layers aligned when changing auth behavior.

## Supabase

- Server-side session client lives in `lib/supabase/server.ts`; browser client lives in `lib/supabase/client.ts`.
- `createAdminClient()` uses `SUPABASE_SERVICE_ROLE_KEY` and is intentionally used in server-only code for cases that must bypass RLS: public share pages, membership checks, and listing auth users.
- Never move `createAdminClient()` usage into client components.
- Required env vars are exactly `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.

## Database

- Apply `supabase/schema.sql` first, then every file in `supabase/migrations/` in filename order. The README migration list is stale and does not include the newer 202604* migrations.
- The base schema file is not the whole model anymore; current app code also depends on later columns/tables such as `doc_type`, folder share tokens, `project_members`, `roadmap_items`, `chat_messages`, and report metadata.
- Access rules rely heavily on Supabase RLS. Before changing folder/project queries, check the `project_members` migration because non-admin users only see assigned folders/projects.

## UI Quirks

- Theme setup is split between `app/layout.tsx` and `components/ThemeRegistry.tsx`. Preserve `InitColorSchemeScript`, the cookie-backed storage manager, and the shared `THEME_MODE_COOKIE` flow or you will reintroduce hydration/theme flicker.

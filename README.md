# Threadoc

Threadoc (TD) is a collaborative Markdown reading workspace built with Next.js, MUI, and Supabase.

## What is included

- Authenticated document library with a masonry-style, Pinterest-like layout
- Reader-first document view with anchored comments
- Public share links per document
- Optional public comments visibility
- Optional anonymous comments on public links
- Admin document editor with live Markdown preview
- Admin user management and invite flow

## Stack

- Next.js 16 App Router
- React 19
- MUI 7
- Supabase Auth + Postgres
- Mermaid for flow diagrams inside Markdown

## Environment variables

Create `.env.local` from `.env.example` and fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## Database setup

Apply the base schema:

```sql
\i supabase/schema.sql
```

Then apply the incremental migrations in order:

```sql
\i supabase/migrations/20260322_add_annotation_ranges.sql
\i supabase/migrations/20260323_public_sharing_and_comment_identities.sql
```

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Vercel deployment

1. Push the repository to GitHub, GitLab, or Bitbucket.
2. Import the project into Vercel as a Next.js app.
3. Add the three Supabase environment variables in the Vercel project settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Redeploy after applying the SQL schema and migrations to the production Supabase database.
5. Set your Supabase Auth redirect URLs to include the final Vercel domain.

## Notes

- Public share pages are served from `/share/[slug]`.
- Public comments are only available if the document has public comments enabled.
- Anonymous comments are only available if both public access and public comments are enabled.
- The current Codex environment used for implementation did not include a working `node` / `npm` runtime, so build and lint verification should be run on a machine with Node installed.


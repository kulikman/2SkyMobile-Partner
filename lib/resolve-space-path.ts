import { createAdminClient } from '@/lib/supabase/server';

export type BreadcrumbItem = { label: string; href: string };

export type ResolvedSpace =
  | { kind: 'company'; companyId: string; companyName: string; companySlug: string }
  | {
      kind: 'folder';
      folderId: string; folderName: string;
      companyId: string; companyName: string; companySlug: string;
      breadcrumbs: BreadcrumbItem[];
    }
  | {
      kind: 'document';
      documentId: string; documentSlug: string; documentTitle: string; docType: string;
      folderId: string | null;
      companyId: string; companyName: string; companySlug: string;
      breadcrumbs: BreadcrumbItem[];
    };

/**
 * Resolves a space path like ['mobile-app', 'api-doc'] under a company slug.
 * Returns null when any segment cannot be found.
 */
export async function resolveSpacePath(
  companySlug: string,
  pathSegments: string[],
): Promise<ResolvedSpace | null> {
  const db = await createAdminClient();

  // 1. Resolve company
  const { data: company } = await db
    .from('companies')
    .select('id, name, slug')
    .eq('slug', companySlug)
    .single();
  if (!company) return null;

  const companyBase = `/${companySlug}`;

  if (pathSegments.length === 0) {
    return { kind: 'company', companyId: company.id, companyName: company.name, companySlug };
  }

  // 2. Walk all-but-last segments as folders
  const breadcrumbs: BreadcrumbItem[] = [{ label: company.name, href: companyBase }];
  let currentFolderId: string | null = null;

  for (let i = 0; i < pathSegments.length - 1; i++) {
    const seg = pathSegments[i];
    const q = db.from('folders').select('id, name, slug').eq('slug', seg);
    if (currentFolderId) {
      q.eq('parent_id', currentFolderId);
    } else {
      q.eq('company_id', company.id).is('parent_id', null);
    }
    const { data: folder } = await q.single();
    if (!folder) return null;

    currentFolderId = folder.id;
    breadcrumbs.push({ label: folder.name, href: `${companyBase}/${pathSegments.slice(0, i + 1).join('/')}` });
  }

  // 3. Last segment: try folder first, then document
  const lastSeg = pathSegments[pathSegments.length - 1];
  const pathSoFar = pathSegments.slice(0, -1);

  {
    const q = db.from('folders').select('id, name, slug').eq('slug', lastSeg);
    if (currentFolderId) {
      q.eq('parent_id', currentFolderId);
    } else {
      q.eq('company_id', company.id).is('parent_id', null);
    }
    const { data: folder } = await q.single();
    if (folder) {
      const href = `${companyBase}/${[...pathSoFar, lastSeg].join('/')}`;
      breadcrumbs.push({ label: folder.name, href });
      return {
        kind: 'folder',
        folderId: folder.id, folderName: folder.name,
        companyId: company.id, companyName: company.name, companySlug,
        breadcrumbs,
      };
    }
  }

  {
    const q = db.from('documents').select('id, slug, title, doc_type, metadata').eq('slug', lastSeg);
    if (currentFolderId) q.eq('folder_id', currentFolderId);
    const { data: doc } = await q.single();
    if (doc) {
      const href = `${companyBase}/${[...pathSoFar, lastSeg].join('/')}`;
      breadcrumbs.push({ label: doc.title, href });
      return {
        kind: 'document',
        documentId: doc.id,
        documentSlug: doc.slug,
        documentTitle: doc.title,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        docType: (doc as any).doc_type ?? 'md',
        folderId: currentFolderId,
        companyId: company.id, companyName: company.name, companySlug,
        breadcrumbs,
      };
    }
  }

  return null;
}

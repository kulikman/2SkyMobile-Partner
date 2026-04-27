import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const adminClient = await createAdminClient();

  // Fetch all tickets
  const { data: docs, error } = await adminClient
    .from('documents')
    .select('id, folder_id, title, description, created_at, metadata')
    .eq('doc_type', 'ticket')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!docs?.length) return NextResponse.json([]);

  // Folders
  const folderIds = [...new Set(docs.map((d) => d.folder_id))];
  const { data: folders } = await adminClient
    .from('folders')
    .select('id, title, slug, company_id')
    .in('id', folderIds);
  const folderMap = new Map(folders?.map((f) => [f.id, f]) ?? []);

  // Companies
  const companyIds = [...new Set(folders?.map((f) => f.company_id).filter(Boolean) ?? [])];
  const { data: companies } = await adminClient
    .from('companies')
    .select('id, name, slug')
    .in('id', companyIds);
  const companyMap = new Map(companies?.map((c) => [c.id, c]) ?? []);

  // User emails
  let userMap = new Map<string, string>();
  try {
    const { data: listData } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
    if (listData?.users) {
      userMap = new Map(listData.users.map((u) => [u.id, u.email ?? '']));
    }
  } catch { /* best-effort */ }

  const enriched = docs.map((doc) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m = (doc.metadata ?? {}) as Record<string, any>;
    const folder  = folderMap.get(doc.folder_id);
    const company = folder ? companyMap.get(folder.company_id) : null;
    return {
      id:                doc.id,
      folder_id:         doc.folder_id,
      title:             doc.title,
      description:       doc.description ?? null,
      created_at:        doc.created_at,
      updated_at:        m.updated_at ?? doc.created_at,
      status:            m.status    ?? 'new',
      priority:          m.priority  ?? 'medium',
      severity:          m.severity  ?? 'moderate',
      type:              m.type      ?? null,
      module:            m.module    ?? null,
      url:               m.url       ?? null,
      screenshot_path:   m.screenshot_path ?? null,
      created_by:        m.created_by ?? null,
      created_by_email:  userMap.get(m.created_by) ?? '',
      comments:          m.comments  ?? null,
      parent_id:         m.parent_id ?? null,
      // project / company context
      project_name:      folder?.title ?? null,
      project_slug:      folder?.slug  ?? null,
      company_name:      company?.name ?? null,
      company_slug:      company?.slug ?? null,
    };
  });

  return NextResponse.json(enriched);
}

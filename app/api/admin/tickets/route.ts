import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const adminClient = await createAdminClient();

  // Fetch all tickets with nested folder + company via FK join
  const { data: docs, error } = await adminClient
    .from('documents')
    .select(`
      id, folder_id, title, description, created_at, metadata,
      folder:folders!folder_id (
        id, title, slug, company_id,
        company:companies!company_id ( id, name, slug )
      )
    `)
    .eq('doc_type', 'ticket')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[admin/tickets] docs query error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!docs?.length) return NextResponse.json({ tickets: [], users: [] });

  // Build user email map (for reporter + assignee)
  let userMap = new Map<string, string>();
  let allUsers: { id: string; email: string }[] = [];
  try {
    const { data: listData } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
    if (listData?.users) {
      allUsers = listData.users.map((u) => ({ id: u.id, email: u.email ?? '' }));
      userMap = new Map(allUsers.map((u) => [u.id, u.email]));
    }
  } catch (e) {
    console.error('[admin/tickets] listUsers error:', e);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tickets = docs.map((doc: any) => {
    const m = (doc.metadata ?? {}) as Record<string, unknown>;
    const folder  = doc.folder  ?? null;
    const company = folder?.company ?? null;
    return {
      id:                doc.id,
      folder_id:         doc.folder_id,
      title:             doc.title,
      description:       doc.description ?? null,
      created_at:        doc.created_at,
      updated_at:        (m.updated_at as string) ?? doc.created_at,
      ticket_number:     (m.ticket_number as number) ?? null,
      status:            (m.status    as string) ?? 'new',
      priority:          (m.priority  as string) ?? 'medium',
      severity:          (m.severity  as string) ?? 'moderate',
      type:              (m.type      as string) ?? null,
      module:            (m.module    as string) ?? null,
      url:               (m.url       as string) ?? null,
      screenshot_path:   (m.screenshot_path as string) ?? null,
      created_by:        (m.created_by as string) ?? null,
      created_by_email:  userMap.get(m.created_by as string) ?? '',
      assigned_to:       (m.assigned_to as string) ?? null,
      assigned_to_email: userMap.get(m.assigned_to as string) ?? '',
      comments:          (m.comments  as string) ?? null,
      parent_id:         (m.parent_id as string) ?? null,
      project_name:      folder?.title ?? null,
      project_slug:      folder?.slug  ?? null,
      company_name:      company?.name ?? null,
      company_slug:      company?.slug ?? null,
    };
  });

  return NextResponse.json({ tickets, users: allUsers });
}

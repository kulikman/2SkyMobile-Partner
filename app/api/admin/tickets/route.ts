import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const adminClient = await createAdminClient();

  // 1. Fetch all tickets
  const { data: docs, error } = await adminClient
    .from('documents')
    .select('id, folder_id, title, description, created_at, metadata')
    .eq('doc_type', 'ticket')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[admin/tickets] docs query error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!docs?.length) return NextResponse.json({ tickets: [], users: [] });

  // 2. Fetch folders for all unique folder_ids
  const folderIds = [...new Set(docs.map((d) => d.folder_id).filter(Boolean))];
  const folderMap = new Map<string, { id: string; name: string; slug: string; company_id: string }>();
  if (folderIds.length) {
    const { data: folders } = await adminClient
      .from('folders')
      .select('id, name, slug, company_id')
      .in('id', folderIds);
    (folders ?? []).forEach((f) => folderMap.set(f.id, f));
  }

  // 3. Fetch companies for all unique company_ids
  const companyIds = [...new Set([...folderMap.values()].map((f) => f.company_id).filter(Boolean))];
  const companyMap = new Map<string, { id: string; name: string; slug: string }>();
  if (companyIds.length) {
    const { data: companies } = await adminClient
      .from('companies')
      .select('id, name, slug')
      .in('id', companyIds);
    (companies ?? []).forEach((c) => companyMap.set(c.id, c));
  }

  // 4. Build user email map
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

  // 5. Assemble + auto-backfill missing ticket numbers
  const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };
  let nextNum = Math.max(0, ...docs.map((d) => {
    const n = (d.metadata as Record<string, unknown>)?.ticket_number;
    return typeof n === 'number' ? n : 0;
  }));

  const backfillUpdates: Promise<unknown>[] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tickets = docs.map((doc: any) => {
    const m = (doc.metadata ?? {}) as Record<string, unknown>;
    const folder  = folderMap.get(doc.folder_id) ?? null;
    const company = folder ? (companyMap.get(folder.company_id) ?? null) : null;

    let ticketNumber = (m.ticket_number as number) ?? null;
    if (!ticketNumber) {
      nextNum += 1;
      ticketNumber = nextNum;
      const updatedMeta = { ...m, ticket_number: ticketNumber };
      backfillUpdates.push(
        Promise.resolve(adminClient.from('documents').update({ metadata: updatedMeta }).eq('id', doc.id))
      );
    }

    return {
      id:                doc.id,
      folder_id:         doc.folder_id,
      title:             doc.title,
      description:       doc.description ?? null,
      created_at:        doc.created_at,
      updated_at:        (m.updated_at as string) ?? doc.created_at,
      ticket_number:     ticketNumber,
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
      project_name:      folder?.name ?? null,
      project_slug:      folder?.slug  ?? null,
      company_name:      company?.name ?? null,
      company_slug:      company?.slug ?? null,
    };
  });

  // Fire backfills without blocking the response
  if (backfillUpdates.length) {
    Promise.all(backfillUpdates).catch((e) => console.error('[admin/tickets] backfill error:', e));
  }

  // Sort: high → medium → low, then by created_at desc within same priority
  tickets.sort((a, b) => {
    const pd = (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1);
    if (pd !== 0) return pd;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return NextResponse.json({ tickets, users: allUsers });
}

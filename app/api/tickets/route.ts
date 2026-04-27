import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { toSlug } from '@/lib/slug';
import { randomBytes } from 'crypto';
import { sendTelegramMessage, buildNewTicketMessage } from '@/lib/telegram';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function docToTicket(doc: Record<string, any>, createdByEmail = '') {
  const m = doc.metadata ?? {};
  return {
    id: doc.id,
    folder_id: doc.folder_id,
    title: doc.title,
    description: doc.description,
    created_at: doc.created_at,
    status: m.status ?? 'new',
    type: m.type ?? null,
    priority: m.priority ?? 'medium',
    severity: m.severity ?? 'moderate',
    module: m.module ?? null,
    url: m.url ?? null,
    screenshot_path: m.screenshot_path ?? null,
    created_by: m.created_by ?? null,
    comments: m.comments ?? null,
    updated_at: m.updated_at ?? doc.created_at,
    created_by_email: createdByEmail,
    parent_id: m.parent_id ?? null,
  };
}

export async function GET(req: NextRequest) {
  const folderId = req.nextUrl.searchParams.get('folderId');
  if (!folderId) return NextResponse.json({ error: 'folderId required' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const adminClient = await createAdminClient();
  const { data, error } = await adminClient
    .from('documents')
    .select('id, folder_id, title, description, created_at, metadata')
    .eq('folder_id', folderId)
    .eq('doc_type', 'ticket')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let userMap = new Map<string, string>();
  try {
    const { data: listData, error: listError } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
    if (!listError && listData?.users) {
      userMap = new Map(listData.users.map((u) => [u.id, u.email ?? '']));
    }
  } catch { /* best-effort — emails may be missing */ }

  const enriched = (data ?? []).map((doc) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    docToTicket(doc as Record<string, any>, userMap.get(doc.metadata?.created_by) ?? '')
  );
  return NextResponse.json(enriched);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { folder_id, title, description, url, screenshot_path,
    module, type, priority, severity, comments, parent_id } = body;

  if (!folder_id || !title?.trim()) {
    return NextResponse.json({ error: 'folder_id and title required' }, { status: 400 });
  }

  const slug = `${toSlug(title.trim()) || 'ticket'}-i-${randomBytes(4).toString('hex')}`;

  const adminClient = await createAdminClient();
  const { data, error } = await adminClient
    .from('documents')
    .insert({
      folder_id,
      title: title.trim(),
      description: description?.trim() ?? null,
      content: description?.trim() ?? '',
      slug,
      doc_type: 'ticket',
      metadata: {
        status: 'new',
        type: type?.trim() ?? null,
        priority: priority ?? 'medium',
        severity: severity ?? 'moderate',
        module: module?.trim() ?? null,
        url: url?.trim() ?? null,
        screenshot_path: screenshot_path ?? null,
        created_by: user.id,
        comments: comments?.trim() ?? null,
        parent_id: parent_id ?? null,
        updated_at: new Date().toISOString(),
      },
    })
    .select('id, folder_id, title, description, created_at, metadata')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify admins: in-app + Telegram (best-effort, non-blocking)
  try {
    const { data: folder } = await adminClient
      .from('folders').select('slug, company_id').eq('id', folder_id).single();

    let link = `/?issue=${data.id}`;
    if (folder?.slug && folder.company_id) {
      const { data: company } = await adminClient
        .from('companies').select('slug').eq('id', folder.company_id).single();
      if (company?.slug) {
        link = `/${company.slug}/${folder.slug}?tab=issues&issue=${data.id}`;
      }
    }

    const { data: { users: allUsers } } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
    const admins = allUsers.filter((u) => u.user_metadata?.role === 'admin');

    await Promise.all(admins.map((a) =>
      adminClient.from('notifications').insert({
        user_id: a.id,
        type: 'new_ticket',
        title: `New issue: "${title.trim()}"`,
        body: description?.trim()?.slice(0, 120) ?? null,
        link,
      })
    ));

    await sendTelegramMessage(buildNewTicketMessage({
      title: title.trim(),
      description: description ?? null,
      priority: priority ?? 'medium',
      module: module ?? null,
      type: type ?? null,
      fromEmail: user.email ?? null,
      link,
    }));
  } catch { /* best-effort — do not fail the request */ }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return NextResponse.json(docToTicket(data as Record<string, any>, user.email ?? ''), { status: 201 });
}

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { getDisplayName } from '@/lib/user-display';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const ticketId = searchParams.get('ticketId');
  const folderId = searchParams.get('folderId');
  if (!ticketId && !folderId) {
    return NextResponse.json({ error: 'ticketId or folderId required' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (ticketId) {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('document_id', ticketId)
      .order('created_at', { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json((data ?? []).map((c) => ({ ...c, ticket_id: c.document_id })));
  }

  const adminClient = await createAdminClient();
  const { data: tickets } = await adminClient
    .from('documents')
    .select('id')
    .eq('folder_id', folderId!)
    .eq('doc_type', 'ticket');

  if (!tickets?.length) return NextResponse.json([]);

  const ticketIds = tickets.map((t) => t.id);
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .in('document_id', ticketIds)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data ?? []).map((c) => ({ ...c, ticket_id: c.document_id })));
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { ticket_id, content } = body;
  if (!ticket_id || !content?.trim()) {
    return NextResponse.json({ error: 'ticket_id and content required' }, { status: 400 });
  }

  const author_name = getDisplayName({ email: user.email, metadata: user.user_metadata ?? null });

  const { data: comment, error } = await supabase
    .from('comments')
    .insert({
      document_id: ticket_id,
      user_id: user.id,
      author_name,
      content: content.trim(),
      parent_id: null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify project members (best-effort)
  try {
    const adminClient = await createAdminClient();
    const { data: doc } = await adminClient
      .from('documents').select('title, folder_id').eq('id', ticket_id).single();
    if (doc) {
      const { data: folder } = await adminClient
        .from('folders').select('slug, company_id').eq('id', doc.folder_id).single();
      let link = `/projects/${doc.folder_id}`;
      if (folder?.slug && folder.company_id) {
        const { data: company } = await adminClient
          .from('companies').select('slug').eq('id', folder.company_id).single();
        if (company?.slug) link = `/${company.slug}/${folder.slug}`;
      }
      const { data: { users: allUsers } } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
      const targets = allUsers.filter((u) =>
        u.id !== user.id &&
        (u.user_metadata?.role === 'admin' || u.user_metadata?.company_id === folder?.company_id)
      );
      await Promise.all(targets.map((t) =>
        adminClient.from('notifications').insert({
          user_id: t.id, type: 'new_comment',
          title: `New comment on issue "${doc.title}"`,
          body: content.trim().slice(0, 120), link,
        })
      ));
    }
  } catch { /* best-effort */ }

  return NextResponse.json({ ...comment, ticket_id: comment.document_id }, { status: 201 });
}

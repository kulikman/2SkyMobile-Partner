import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const folderId = req.nextUrl.searchParams.get('folderId');
  if (!folderId) return NextResponse.json({ error: 'folderId required' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const adminClient = await createAdminClient();
  const { data, error } = await adminClient
    .from('testing_comments')
    .select('id, step_id, author_email, message, created_at')
    .eq('folder_id', folderId)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { folderId, stepId, message } = body;
  if (!folderId || !message?.trim()) return NextResponse.json({ error: 'folderId and message required' }, { status: 400 });

  const adminClient = await createAdminClient();
  const { data, error } = await adminClient
    .from('testing_comments')
    .insert({
      folder_id: folderId,
      step_id: stepId ?? null,
      author_id: user.id,
      author_email: user.email ?? user.id,
      message: message.trim(),
    })
    .select('id, step_id, author_email, message, created_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify project members (best-effort)
  try {
    const { data: folder } = await adminClient
      .from('folders').select('name, slug, company_id').eq('id', folderId).single();
    let link = `/projects/${folderId}`;
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
    const stepLabel = stepId ? ` (step #${stepId})` : '';
    await Promise.all(targets.map((t) =>
      adminClient.from('notifications').insert({
        user_id: t.id, type: 'new_comment',
        title: `New comment on testing${stepLabel}`,
        body: message.trim().slice(0, 120), link,
      })
    ));
  } catch { /* best-effort */ }

  return NextResponse.json(data, { status: 201 });
}

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
    .from('tickets')
    .select('*')
    .eq('folder_id', folderId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: { users } } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  const userMap = new Map(users.map((u) => [u.id, u.email ?? '']));
  const enriched = (data ?? []).map((t) => ({ ...t, created_by_email: userMap.get(t.created_by) ?? '' }));

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

  const {
    folder_id, title, description, url, screenshot_path,
    module, type, priority, severity, comments,
  } = body;

  if (!folder_id || !title?.trim()) {
    return NextResponse.json({ error: 'folder_id and title required' }, { status: 400 });
  }

  const adminClient = await createAdminClient();
  const { data, error } = await adminClient
    .from('tickets')
    .insert({
      folder_id,
      title: title.trim(),
      description: description?.trim() || null,
      url: url?.trim() || null,
      screenshot_path: screenshot_path || null,
      module: module?.trim() || null,
      type: type?.trim() || null,
      priority: priority || 'medium',
      severity: severity || 'moderate',
      comments: comments?.trim() || null,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ...data, created_by_email: user.email ?? '' }, { status: 201 });
}

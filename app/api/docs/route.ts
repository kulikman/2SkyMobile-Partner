import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { toSlug, uniqueSlug } from '@/lib/slug';

export async function GET(req: NextRequest) {
  const folderId = req.nextUrl.searchParams.get('folder_id');
  if (!folderId) return NextResponse.json({ error: 'folder_id required' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const adminClient = await createAdminClient();

  const [{ data: folders }, { data: documents }] = await Promise.all([
    adminClient
      .from('folders')
      .select('id, name, slug, icon, color')
      .eq('parent_id', folderId)
      .order('name', { ascending: true }),
    adminClient
      .from('documents')
      .select('id, slug, title, doc_type, report_type, created_at, content')
      .eq('folder_id', folderId)
      .not('doc_type', 'in', '(ticket,task,meeting)')
      .order('created_at', { ascending: false }),
  ]);

  return NextResponse.json({ folders: folders ?? [], documents: documents ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.user_metadata?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { title, doc_type = 'md', folder_id } = body;
  if (!title || !folder_id) return NextResponse.json({ error: 'title and folder_id required' }, { status: 400 });

  const adminClient = await createAdminClient();

  const base = toSlug(title);
  const { data: existing } = await adminClient.from('documents').select('slug').eq('folder_id', folder_id);
  const existingSlugs = new Set((existing ?? []).map((r: { slug: string | null }) => r.slug ?? ''));
  const slug = uniqueSlug(base, existingSlugs);

  const { data, error } = await adminClient
    .from('documents')
    .insert({ title, slug, doc_type, folder_id, content: '', position: 0 })
    .select('id, slug, title, doc_type, created_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

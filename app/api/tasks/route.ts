import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { toSlug } from '@/lib/slug';
import { randomBytes } from 'crypto';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function docToTask(doc: Record<string, any>) {
  const m = doc.metadata ?? {};
  return {
    id: doc.id,
    folder_id: doc.folder_id,
    title: doc.title,
    description: doc.description,
    position: doc.position,
    created_at: doc.created_at,
    status: m.status ?? 'backlog',
    type: m.type ?? null,
    role: m.role ?? null,
    group_label: m.group_label ?? null,
    estimated_hours: m.estimated_hours ?? null,
    depends_on: m.depends_on ?? [],
    start_date: m.start_date ?? null,
    due_date: m.due_date ?? null,
    completed_at: m.completed_at ?? null,
  };
}

export async function GET(req: NextRequest) {
  const folderId = req.nextUrl.searchParams.get('folderId');
  if (!folderId) return NextResponse.json({ error: 'folderId is required' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const adminClient = await createAdminClient();
  const { data, error } = await adminClient
    .from('documents')
    .select('id, folder_id, title, description, position, created_at, metadata')
    .eq('folder_id', folderId)
    .eq('doc_type', 'task')
    .order('position', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data ?? []).map(docToTask));
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { folder_id, group_label, title, type, role, estimated_hours,
    depends_on, position, start_date, due_date, description } = body;

  if (!folder_id || !title?.trim()) {
    return NextResponse.json({ error: 'folder_id and title are required' }, { status: 400 });
  }

  const slug = `${toSlug(title.trim()) || 'task'}-t-${randomBytes(4).toString('hex')}`;

  const adminClient = await createAdminClient();
  const { data, error } = await adminClient
    .from('documents')
    .insert({
      folder_id,
      title: title.trim(),
      description: description?.trim() ?? null,
      content: description?.trim() ?? '',
      slug,
      doc_type: 'task',
      position: position ?? 0,
      metadata: {
        status: 'backlog',
        type: type ?? null,
        role: role ?? null,
        group_label: group_label ?? null,
        estimated_hours: estimated_hours ?? null,
        depends_on: depends_on ?? [],
        start_date: start_date ?? null,
        due_date: due_date ?? null,
        completed_at: null,
      },
    })
    .select('id, folder_id, title, description, position, created_at, metadata')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return NextResponse.json(docToTask(data as Record<string, any>), { status: 201 });
}

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

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
    parent_id: m.parent_id ?? null,
  };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const isAdmin = user.user_metadata?.role === 'admin';
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const adminClient = await createAdminClient();
  const { data: current, error: fetchError } = await adminClient
    .from('documents')
    .select('folder_id, title, description, position, metadata')
    .eq('id', id)
    .eq('doc_type', 'task')
    .single();

  if (fetchError || !current) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const docUpdates: Record<string, unknown> = {};
  if (body.title !== undefined) docUpdates.title = body.title;
  if (body.description !== undefined) {
    docUpdates.description = body.description;
    docUpdates.content = body.description ?? '';
  }
  if (body.position !== undefined) docUpdates.position = body.position;

  const meta = { ...(current.metadata as Record<string, unknown>) };
  if (body.group_label !== undefined) meta.group_label = body.group_label;
  if (body.type !== undefined) meta.type = body.type;
  if (body.role !== undefined) meta.role = body.role;
  if (body.estimated_hours !== undefined) meta.estimated_hours = body.estimated_hours;
  if (body.depends_on !== undefined) meta.depends_on = body.depends_on;
  if (body.start_date !== undefined) meta.start_date = body.start_date;
  if (body.due_date !== undefined) meta.due_date = body.due_date;
  if (body.status !== undefined) {
    meta.status = body.status;
    meta.completed_at = body.status === 'done' ? new Date().toISOString() : null;
  }
  if (body.parent_id !== undefined) meta.parent_id = body.parent_id;
  docUpdates.metadata = meta;

  const { data, error } = await adminClient
    .from('documents')
    .update(docUpdates)
    .eq('id', id)
    .eq('doc_type', 'task')
    .select('id, folder_id, title, description, position, created_at, metadata')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return NextResponse.json(docToTask(data as Record<string, any>));
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const adminClient = await createAdminClient();
  const { error } = await adminClient
    .from('documents').delete().eq('id', id).eq('doc_type', 'task');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}

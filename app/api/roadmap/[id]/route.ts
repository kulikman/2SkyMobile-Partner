import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const adminClient = await createAdminClient();
  const { data: current, error: fetchError } = await adminClient
    .from('documents')
    .select('title, description, position, metadata')
    .eq('id', id)
    .eq('doc_type', 'roadmap')
    .single();

  if (fetchError || !current) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const docUpdates: Record<string, unknown> = {};
  if (body.title !== undefined) { docUpdates.title = body.title; docUpdates.content = body.title; }
  if (body.description !== undefined) docUpdates.description = body.description;
  if (body.position !== undefined) docUpdates.position = body.position;

  const meta = { ...(current.metadata as Record<string, unknown>) };
  if (body.status !== undefined) meta.status = body.status;
  if (body.due_date !== undefined) meta.due_date = body.due_date;
  if (body.completed_at !== undefined) meta.completed_at = body.completed_at;
  if (body.status === 'completed' && !body.completed_at) {
    meta.completed_at = new Date().toISOString();
  }
  docUpdates.metadata = meta;

  const { data, error } = await adminClient
    .from('documents')
    .update(docUpdates)
    .eq('id', id)
    .eq('doc_type', 'roadmap')
    .select('id, folder_id, title, description, position, created_at, metadata')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const m = (data.metadata as Record<string, unknown>) ?? {};
  return NextResponse.json({
    id: data.id, folder_id: data.folder_id, title: data.title,
    description: data.description, position: data.position, created_at: data.created_at,
    status: m.status ?? 'pending', due_date: m.due_date ?? null, completed_at: m.completed_at ?? null,
  });
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const adminClient = await createAdminClient();
  const { error } = await adminClient.from('documents').delete().eq('id', id).eq('doc_type', 'roadmap');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}

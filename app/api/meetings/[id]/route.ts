import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export async function PATCH(
  req: NextRequest,
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
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const adminClient = await createAdminClient();
  const { data: current, error: fetchError } = await adminClient
    .from('documents')
    .select('title, metadata')
    .eq('id', id)
    .eq('doc_type', 'meeting')
    .single();

  if (fetchError || !current) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const docUpdates: Record<string, unknown> = {};
  // title and content are independent fields
  if (body.title !== undefined) docUpdates.title = body.title;

  const meta = { ...(current.metadata as Record<string, unknown>) };
  if (body.meeting_date !== undefined) meta.meeting_date = body.meeting_date;
  if (body.summary !== undefined) {
    meta.summary = body.summary;
    docUpdates.content = body.summary ?? ''; // content stores the summary text
  }
  docUpdates.metadata = meta;

  const { data, error } = await adminClient
    .from('documents')
    .update(docUpdates)
    .eq('id', id)
    .eq('doc_type', 'meeting')
    .select('id, folder_id, title, created_at, metadata')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const m = (data.metadata as Record<string, unknown>) ?? {};
  return NextResponse.json({
    id: data.id, folder_id: data.folder_id, title: data.title,
    created_at: data.created_at, meeting_date: m.meeting_date ?? null, summary: m.summary ?? null,
  });
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
  const { error } = await adminClient.from('documents').delete().eq('id', id).eq('doc_type', 'meeting');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}

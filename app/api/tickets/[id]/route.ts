import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

const VALID_STATUSES = ['new', 'in_progress', 'on_hold', 'ready_for_testing', 'approved', 'closed'];

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

  const {
    status, title, description, url, screenshot_path,
    module, type, priority, severity, comments,
  } = body;

  // Partners can only approve their own ready_for_testing tickets
  if (!isAdmin) {
    if (status && status !== 'approved') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
  }

  if (status && !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const adminClient = await createAdminClient();

  // Partners can only approve their own ticket if it's ready_for_testing
  if (!isAdmin && status === 'approved') {
    const { data: ticket } = await adminClient
      .from('tickets')
      .select('created_by, status')
      .eq('id', id)
      .single();
    if (!ticket || ticket.created_by !== user.id || ticket.status !== 'ready_for_testing') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  // Build update payload — admins can edit all fields, partners only approve
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const patch: Record<string, any> = { updated_at: new Date().toISOString() };
  if (status !== undefined) patch.status = status;
  if (isAdmin) {
    if (title !== undefined)           patch.title = title?.trim() || null;
    if (description !== undefined)     patch.description = description?.trim() || null;
    if (url !== undefined)             patch.url = url?.trim() || null;
    if (screenshot_path !== undefined) patch.screenshot_path = screenshot_path;
    if (module !== undefined)          patch.module = module?.trim() || null;
    if (type !== undefined)            patch.type = type?.trim() || null;
    if (priority !== undefined)        patch.priority = priority;
    if (severity !== undefined)        patch.severity = severity;
    if (comments !== undefined)        patch.comments = comments?.trim() || null;
  }

  const { data, error } = await adminClient
    .from('tickets')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
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
  const { data: ticket } = await adminClient.from('tickets').select('screenshot_path').eq('id', id).single();
  if (ticket?.screenshot_path) {
    await adminClient.storage.from('ticket-screenshots').remove([ticket.screenshot_path]);
  }

  const { error } = await adminClient.from('tickets').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}

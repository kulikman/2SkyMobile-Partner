import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

const VALID_STATUSES = ['new', 'in_progress', 'ready_for_testing', 'approved'];

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

  const { status } = body;
  if (!status || !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const isAdmin = user.user_metadata?.role === 'admin';

  // Partners can only set approved; admins can set any status
  if (!isAdmin && status !== 'approved') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const adminClient = await createAdminClient();

  // Partners can only approve their own tickets that are ready_for_testing
  if (!isAdmin) {
    const { data: ticket } = await adminClient
      .from('tickets')
      .select('created_by, status')
      .eq('id', id)
      .single();
    if (!ticket || ticket.created_by !== user.id || ticket.status !== 'ready_for_testing') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const { data, error } = await adminClient
    .from('tickets')
    .update({ status, updated_at: new Date().toISOString() })
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

  // Remove screenshot from storage if present
  const { data: ticket } = await adminClient.from('tickets').select('screenshot_path').eq('id', id).single();
  if (ticket?.screenshot_path) {
    await adminClient.storage.from('ticket-screenshots').remove([ticket.screenshot_path]);
  }

  const { error } = await adminClient.from('tickets').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}

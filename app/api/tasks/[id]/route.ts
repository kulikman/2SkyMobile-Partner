import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

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

  const updates: Record<string, unknown> = {};
  if (body.title !== undefined)           updates.title           = body.title;
  if (body.description !== undefined)     updates.description     = body.description;
  if (body.group_label !== undefined)     updates.group_label     = body.group_label;
  if (body.type !== undefined)            updates.type            = body.type;
  if (body.role !== undefined)            updates.role            = body.role;
  if (body.estimated_hours !== undefined) updates.estimated_hours = body.estimated_hours;
  if (body.depends_on !== undefined)      updates.depends_on      = body.depends_on;
  if (body.position !== undefined)        updates.position        = body.position;
  if (body.start_date !== undefined)      updates.start_date      = body.start_date;
  if (body.due_date !== undefined)        updates.due_date        = body.due_date;
  if (body.status !== undefined) {
    updates.status = body.status;
    updates.completed_at = body.status === 'done' ? new Date().toISOString() : null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const adminClient = await createAdminClient();
  const { data, error } = await adminClient
    .from('tasks').update(updates).eq('id', id).select().single();

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

  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}

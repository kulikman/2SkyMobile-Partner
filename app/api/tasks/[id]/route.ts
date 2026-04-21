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

  // Partners can only change status; admins can change everything
  const updates: Record<string, unknown> = {};
  if (isAdmin) {
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
  }

  if (body.status !== undefined) {
    updates.status = body.status;
    if (body.status === 'done' && !updates.completed_at) {
      updates.completed_at = new Date().toISOString();
    } else if (body.status !== 'done') {
      updates.completed_at = null;
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const client = isAdmin ? await createAdminClient() : supabase;
  const { data, error } = await client
    .from('tasks').update(updates).eq('id', id).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify admin when partner marks task as ready_for_testing
  if (!isAdmin && body.status === 'ready_for_testing') {
    const adminClient = await createAdminClient();
    const { data: { users: admins } } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
    const adminUsers = admins.filter((u) => u.user_metadata?.role === 'admin');
    await Promise.all(
      adminUsers.map((a) =>
        adminClient.from('notifications').insert({
          user_id: a.id,
          type: 'task_status_changed',
          title: 'Task ready for testing',
          body: `"${data.title}" is ready for testing`,
          link: `/projects/${data.folder_id}?tab=tasks&task=${id}`,
        })
      )
    );
  }

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

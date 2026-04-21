import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { getDisplayName } from '@/lib/user-display';

export async function GET(req: NextRequest) {
  const taskId = req.nextUrl.searchParams.get('taskId');
  if (!taskId) return NextResponse.json({ error: 'taskId is required' }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('task_comments')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { task_id, content, parent_id } = body;
  if (!task_id) return NextResponse.json({ error: 'task_id is required' }, { status: 400 });
  if (!content?.trim()) return NextResponse.json({ error: 'content is required' }, { status: 400 });

  const author_name = getDisplayName({ email: user.email, metadata: user.user_metadata ?? null });

  const { data: comment, error } = await supabase
    .from('task_comments')
    .insert({
      task_id,
      user_id: user.id,
      author_name,
      content: content.trim(),
      parent_id: parent_id ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify task owner / project members about new comment
  try {
    const adminClient = await createAdminClient();
    const { data: task } = await adminClient.from('tasks').select('title, folder_id').eq('id', task_id).single();
    if (task) {
      const { data: folder } = await adminClient.from('folders').select('company_id').eq('id', task.folder_id).single();
      const { data: { users: allUsers } } = await adminClient.auth.admin.listUsers({ perPage: 1000 });

      // Notify: admins + partner of this company (excluding commenter)
      const targets = allUsers.filter((u) => {
        if (u.id === user.id) return false;
        return u.user_metadata?.role === 'admin' ||
          u.user_metadata?.company_id === folder?.company_id;
      });

      const isReply = Boolean(parent_id);
      await Promise.all(
        targets.map((t) =>
          adminClient.from('notifications').insert({
            user_id: t.id,
            type: isReply ? 'new_reply' : 'new_comment',
            title: isReply ? `New reply on "${task.title}"` : `New comment on "${task.title}"`,
            body: content.trim().slice(0, 120),
            link: `/projects/${task.folder_id}?tab=tasks&task=${task_id}`,
          })
        )
      );
    }
  } catch { /* notifications are best-effort */ }

  return NextResponse.json(comment, { status: 201 });
}

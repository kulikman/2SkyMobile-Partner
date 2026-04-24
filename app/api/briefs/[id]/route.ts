import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.user_metadata?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (body.title !== undefined)                       updates.title                       = body.title;
  if (body.description !== undefined)                 updates.description                 = body.description;
  if (body.content !== undefined)                     updates.content                     = body.content;
  if (body.public_access_enabled !== undefined)       updates.public_access_enabled       = body.public_access_enabled;
  if (body.anonymous_comments_enabled !== undefined)  updates.anonymous_comments_enabled  = body.anonymous_comments_enabled;
  if (body.public_comments_visible !== undefined)     updates.public_comments_visible     = body.public_comments_visible;

  const { data, error } = await supabase
    .from('documents')
    .update(updates)
    .eq('id', id)
    .eq('doc_type', 'brief')
    .select('id, title, slug, description, content, created_at, public_access_enabled, anonymous_comments_enabled, public_share_token, folder_id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.user_metadata?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', id)
    .eq('doc_type', 'brief');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}

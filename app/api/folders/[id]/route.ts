import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user?.user_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const updates: Record<string, unknown> = {};
  if (body.name !== undefined)       updates.name        = body.name;
  if (body.color !== undefined)      updates.color       = body.color;
  if (body.icon !== undefined)       updates.icon        = body.icon;
  if (body.position !== undefined)   updates.position    = body.position;
  if (body.parent_id !== undefined)  updates.parent_id   = body.parent_id;
  if (body.status !== undefined)     updates.status      = body.status;
  if (body.progress !== undefined)   updates.progress    = body.progress;
  if (body.client_name !== undefined) updates.client_name = body.client_name;
  if (body.started_at !== undefined) updates.started_at  = body.started_at;
  if (body.deadline_at !== undefined) updates.deadline_at = body.deadline_at;
  if (body.company_id !== undefined)  updates.company_id  = body.company_id;
  if (body.tech_spec !== undefined)   updates.tech_spec   = body.tech_spec;

  const { data, error } = await supabase
    .from('folders')
    .update(updates)
    .eq('id', id)
    .select()
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
  if (user?.user_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error } = await supabase.from('folders').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}

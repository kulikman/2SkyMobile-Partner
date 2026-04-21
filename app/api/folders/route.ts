import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('folders')
    .select('*')
    .order('position', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
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
  const {
    name, color, icon, position, parent_id = null,
    status, progress, client_name, started_at, deadline_at,
  } = body;
  const { data, error } = await supabase
    .from('folders')
    .insert({
      name,
      color: color ?? null,
      icon: icon ?? null,
      position: position ?? 0,
      parent_id,
      status: status ?? 'in_discussion',
      progress: progress ?? 0,
      client_name: client_name ?? null,
      started_at: started_at ?? null,
      deadline_at: deadline_at ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

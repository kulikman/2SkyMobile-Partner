import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const folderId = req.nextUrl.searchParams.get('folderId');
  if (!folderId) return NextResponse.json({ error: 'folderId is required' }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('folder_id', folderId)
    .order('position', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { folder_id, group_label, title, type, role, estimated_hours,
    depends_on, position, start_date, due_date, description } = body;

  if (!folder_id || !title?.trim()) {
    return NextResponse.json({ error: 'folder_id and title are required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      folder_id, group_label: group_label ?? null, title: title.trim(),
      description: description ?? null, type: type ?? null, role: role ?? null,
      estimated_hours: estimated_hours ?? null, depends_on: depends_on ?? [],
      position: position ?? 0, start_date: start_date ?? null,
      due_date: due_date ?? null, status: 'backlog',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

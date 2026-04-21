import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const folderId = req.nextUrl.searchParams.get('folderId');
  if (!folderId) return NextResponse.json({ error: 'folderId is required' }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('roadmap_items')
    .select('*')
    .eq('folder_id', folderId)
    .order('position', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.user_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { folderId, title, description, status, position, due_date } = await req.json();
  if (!folderId || !title) {
    return NextResponse.json({ error: 'folderId and title are required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('roadmap_items')
    .insert({
      folder_id: folderId,
      title,
      description: description ?? null,
      status: status ?? 'pending',
      position: position ?? 0,
      due_date: due_date ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

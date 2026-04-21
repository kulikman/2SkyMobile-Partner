import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const folderId = req.nextUrl.searchParams.get('folderId');
  if (!folderId) return NextResponse.json({ error: 'folderId required' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('meetings')
    .select('*')
    .eq('folder_id', folderId)
    .order('meeting_date', { ascending: false });

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

  const { folder_id, title, meeting_date, summary } = body;
  if (!folder_id || !title || !meeting_date) {
    return NextResponse.json({ error: 'folder_id, title, meeting_date required' }, { status: 400 });
  }

  const adminClient = await createAdminClient();
  const { data, error } = await adminClient
    .from('meetings')
    .insert({ folder_id, title, meeting_date, summary: summary ?? null })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

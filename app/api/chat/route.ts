import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getDisplayName } from '@/lib/user-display';

export async function GET(req: NextRequest) {
  const folderId = req.nextUrl.searchParams.get('folderId');
  if (!folderId) return NextResponse.json({ error: 'folderId is required' }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('folder_id', folderId)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { folderId, content } = await req.json();
  if (!folderId || !content?.trim()) {
    return NextResponse.json({ error: 'folderId and content are required' }, { status: 400 });
  }

  const authorName = getDisplayName({
    email: user.email,
    metadata: user.user_metadata ?? null,
  });

  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      folder_id: folderId,
      user_id: user.id,
      content: content.trim(),
      author_name: authorName,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

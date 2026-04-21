import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

type ReorderItem = { id: string; folder_id: string | null; position: number };

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user?.user_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { items?: ReorderItem[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { items } = body;
  if (!Array.isArray(items)) {
    return NextResponse.json({ error: 'items must be an array' }, { status: 400 });
  }

  await Promise.all(
    items.map(({ id, folder_id, position }) =>
      supabase.from('documents').update({ folder_id, position }).eq('id', id),
    ),
  );

  return NextResponse.json({ ok: true });
}

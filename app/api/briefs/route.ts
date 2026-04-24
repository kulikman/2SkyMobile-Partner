import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { toSlug, uniqueSlug } from '@/lib/slug';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.user_metadata?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data, error } = await supabase
    .from('documents')
    .select('id, title, slug, description, content, created_at, public_access_enabled, anonymous_comments_enabled, public_share_token, folder_id')
    .eq('doc_type', 'brief')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.user_metadata?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: { title?: string; description?: string; content?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { title, description, content } = body;
  if (!title?.trim()) return NextResponse.json({ error: 'title is required' }, { status: 400 });
  if (!content?.trim()) return NextResponse.json({ error: 'content is required' }, { status: 400 });

  // Generate unique slug scoped to briefs
  const base = toSlug(title);
  const { data: existing } = await supabase
    .from('documents')
    .select('slug')
    .eq('doc_type', 'brief');
  const existingSlugs = new Set((existing ?? []).map((r: { slug: string }) => r.slug));
  const slug = uniqueSlug(base || 'brief', existingSlugs);

  const { data, error } = await supabase
    .from('documents')
    .insert({
      title: title.trim(),
      slug,
      description: description?.trim() ?? null,
      content: content.trim(),
      doc_type: 'brief',
      folder_id: null,
      position: 0,
      public_access_enabled: true,
      public_comments_visible: true,
      anonymous_comments_enabled: true,
    })
    .select('id, title, slug, description, content, created_at, public_access_enabled, anonymous_comments_enabled, public_share_token, folder_id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

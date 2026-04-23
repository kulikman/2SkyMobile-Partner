import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { normalizeDocumentImage } from '@/lib/document-image';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.user_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const {
    title,
    slug,
    description = null,
    image = null,
    content,
    folderId,
    position,
    publicAccessEnabled = false,
    publicCommentsVisible = false,
    anonymousCommentsEnabled = false,
    metadata = undefined,
  } = body;
  if (!title || !slug || !content) {
    return NextResponse.json({ error: 'title, slug and content are required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('documents')
    .update({
      title,
      slug,
      description: description?.trim() || null,
      image: normalizeDocumentImage(image),
      content,
      ...(folderId !== undefined ? { folder_id: folderId } : {}),
      ...(position !== undefined ? { position } : {}),
      public_access_enabled: Boolean(publicAccessEnabled),
      public_comments_visible: Boolean(publicAccessEnabled && publicCommentsVisible),
      anonymous_comments_enabled: Boolean(publicAccessEnabled && publicCommentsVisible && anonymousCommentsEnabled),
      ...(metadata !== undefined ? { metadata } : {}),
    })
    .eq('id', id)
    .select('id, slug, title, description, image, content, created_at, folder_id, position, card_color, card_icon, public_access_enabled, public_comments_visible, anonymous_comments_enabled, public_share_token')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, slug: data.slug, document: data });
}

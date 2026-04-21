import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { buildInitialComments } from '@/lib/comment-view-models';
import { getDisplayName } from '@/lib/user-display';

export async function POST(req: NextRequest) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { documentId, content, anchorText, anchorStart, anchorEnd, anonymousName } = body;

  if (!documentId || !content) {
    return NextResponse.json({ error: 'documentId and content are required' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const adminClient = await createAdminClient();
  const { data: document, error: documentError } = await adminClient
    .from('documents')
    .select('id, public_access_enabled, public_comments_visible, anonymous_comments_enabled')
    .eq('id', documentId)
    .single();

  if (documentError || !document) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  const isAnonymous = !user;
  if (isAnonymous) {
    if (!document.public_access_enabled || !document.public_comments_visible || !document.anonymous_comments_enabled) {
      return NextResponse.json({ error: 'Anonymous comments are not allowed for this document' }, { status: 403 });
    }
    if (!anonymousName?.trim()) {
      return NextResponse.json({ error: 'anonymousName is required' }, { status: 400 });
    }
  }

  const commentPayload = {
    document_id: documentId,
    user_id: user?.id ?? null,
    content: String(content).trim(),
    anchor_text: anchorText ?? null,
    anchor_start: typeof anchorStart === 'number' ? anchorStart : null,
    anchor_end: typeof anchorEnd === 'number' ? anchorEnd : null,
    author_name: isAnonymous
      ? String(anonymousName).trim()
      : getDisplayName({
          email: user?.email,
          metadata: user?.user_metadata ?? null,
        }),
    is_anonymous: isAnonymous,
  };

  const { data: inserted, error } = await adminClient
    .from('comments')
    .insert(commentPayload)
    .select('*')
    .single();

  if (error || !inserted) {
    return NextResponse.json({ error: error?.message ?? 'Failed to create comment' }, { status: 500 });
  }

  let users: Array<{ id: string; email?: string | null; user_metadata?: Record<string, unknown> | null }> = [];
  if (inserted.user_id) {
    const result = await adminClient.auth.admin.listUsers({ perPage: 1000 });
    users = result.data.users;
  }

  const [comment] = buildInitialComments([inserted], users);
  return NextResponse.json({ success: true, comment });
}

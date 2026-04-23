import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { toSlug } from '@/lib/slug';
import { randomBytes } from 'crypto';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function docToMeeting(doc: Record<string, any>) {
  const m = doc.metadata ?? {};
  return {
    id: doc.id,
    folder_id: doc.folder_id,
    title: doc.title,
    created_at: doc.created_at,
    meeting_date: m.meeting_date ?? null,
    summary: m.summary ?? null,
  };
}

export async function GET(req: NextRequest) {
  const folderId = req.nextUrl.searchParams.get('folderId');
  if (!folderId) return NextResponse.json({ error: 'folderId required' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const adminClient = await createAdminClient();
  const { data, error } = await adminClient
    .from('documents')
    .select('id, folder_id, title, created_at, metadata')
    .eq('folder_id', folderId)
    .eq('doc_type', 'meeting')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return NextResponse.json((data ?? []).map((d) => docToMeeting(d as Record<string, any>)));
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

  const slug = `${toSlug(title) || 'meeting'}-m-${randomBytes(4).toString('hex')}`;

  const adminClient = await createAdminClient();
  const { data, error } = await adminClient
    .from('documents')
    .insert({
      folder_id,
      title,
      content: summary ?? '',
      slug,
      doc_type: 'meeting',
      metadata: { meeting_date, summary: summary ?? null },
    })
    .select('id, folder_id, title, created_at, metadata')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return NextResponse.json(docToMeeting(data as Record<string, any>), { status: 201 });
}

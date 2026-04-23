import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { toSlug } from '@/lib/slug';
import { randomBytes } from 'crypto';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function docToRoadmap(doc: Record<string, any>) {
  const m = doc.metadata ?? {};
  return {
    id: doc.id,
    folder_id: doc.folder_id,
    title: doc.title,
    description: doc.description,
    position: doc.position,
    created_at: doc.created_at,
    status: m.status ?? 'pending',
    due_date: m.due_date ?? null,
    completed_at: m.completed_at ?? null,
  };
}

export async function GET(req: NextRequest) {
  const folderId = req.nextUrl.searchParams.get('folderId');
  if (!folderId) return NextResponse.json({ error: 'folderId is required' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const adminClient = await createAdminClient();
  const { data, error } = await adminClient
    .from('documents')
    .select('id, folder_id, title, description, position, created_at, metadata')
    .eq('folder_id', folderId)
    .eq('doc_type', 'roadmap')
    .order('position', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return NextResponse.json((data ?? []).map((d) => docToRoadmap(d as Record<string, any>)));
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

  const { folderId, title, description, status, position, due_date } = body;
  if (!folderId || !title) {
    return NextResponse.json({ error: 'folderId and title are required' }, { status: 400 });
  }

  const slug = `${toSlug(title) || 'roadmap'}-r-${randomBytes(4).toString('hex')}`;

  const adminClient = await createAdminClient();
  const { data, error } = await adminClient
    .from('documents')
    .insert({
      folder_id: folderId,
      title,
      description: description ?? null,
      content: description ?? '',
      slug,
      doc_type: 'roadmap',
      position: position ?? 0,
      metadata: {
        status: status ?? 'pending',
        due_date: due_date ?? null,
        completed_at: null,
      },
    })
    .select('id, folder_id, title, description, position, created_at, metadata')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return NextResponse.json(docToRoadmap(data as Record<string, any>), { status: 201 });
}

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

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

  const { folder_id, filename } = body;
  if (!folder_id || !filename) {
    return NextResponse.json({ error: 'folder_id and filename required' }, { status: 400 });
  }

  const storagePath = `${folder_id}/${Date.now()}_${filename}`;
  const adminClient = await createAdminClient();

  const { data, error } = await adminClient.storage
    .from('project-files')
    .createSignedUploadUrl(storagePath);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ signedUrl: data.signedUrl, storagePath, token: data.token });
}

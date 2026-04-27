import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { filename?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { filename } = body;
  if (!filename) return NextResponse.json({ error: 'filename required' }, { status: 400 });

  const ext = filename.split('.').pop()?.toLowerCase() ?? 'png';
  const storagePath = `logos/${Date.now()}.${ext}`;

  const adminClient = await createAdminClient();
  const { data, error } = await adminClient.storage
    .from('company-logos')
    .createSignedUploadUrl(storagePath);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const publicUrl = adminClient.storage
    .from('company-logos')
    .getPublicUrl(storagePath).data.publicUrl;

  return NextResponse.json({ signedUrl: data.signedUrl, storagePath, publicUrl });
}

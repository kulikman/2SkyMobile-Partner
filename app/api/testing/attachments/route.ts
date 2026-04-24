import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { fileName, contentType } = body;
  if (!fileName || !contentType) {
    return NextResponse.json({ error: 'fileName and contentType required' }, { status: 400 });
  }

  const ext = fileName.includes('.') ? fileName.split('.').pop()?.toLowerCase() : '';
  const safeName = `${user.id}/${Date.now()}${ext ? '.' + ext : ''}`;

  const adminClient = await createAdminClient();
  const { data, error } = await adminClient.storage
    .from('testing-attachments')
    .createSignedUploadUrl(safeName);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Public URL after upload
  const { data: { publicUrl } } = adminClient.storage
    .from('testing-attachments')
    .getPublicUrl(safeName);

  return NextResponse.json({
    signedUrl: data.signedUrl,
    token: data.token,
    path: safeName,
    publicUrl,
  });
}

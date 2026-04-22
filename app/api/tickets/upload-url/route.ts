import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { filename } = body;
  if (!filename) return NextResponse.json({ error: 'filename required' }, { status: 400 });

  const ext = filename.split('.').pop() ?? 'png';
  const storagePath = `${user.id}/${Date.now()}.${ext}`;

  const adminClient = await createAdminClient();
  const { data, error } = await adminClient.storage
    .from('ticket-screenshots')
    .createSignedUploadUrl(storagePath);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ signedUrl: data.signedUrl, storagePath, token: data.token });
}

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const folderId = req.nextUrl.searchParams.get('folderId');
  if (!folderId) return NextResponse.json({ error: 'folderId required' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const adminClient = await createAdminClient();
  const { data, error } = await adminClient
    .from('testing_results')
    .select('step_id, status, notes, updated_by, updated_at')
    .eq('folder_id', folderId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function PUT(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { folderId, stepId, status, notes } = body;
  if (!folderId || !stepId) return NextResponse.json({ error: 'folderId and stepId required' }, { status: 400 });

  const adminClient = await createAdminClient();
  const { data, error } = await adminClient
    .from('testing_results')
    .upsert({
      folder_id: folderId,
      step_id: stepId,
      status: status ?? 'pending',
      notes: notes ?? null,
      updated_by: user.email ?? user.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'folder_id,step_id' })
    .select('step_id, status, notes, updated_by, updated_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

// GET /api/testing/hidden?folderId=xxx  → string[]  (array of hidden step_ids)
export async function GET(req: NextRequest) {
  const folderId = req.nextUrl.searchParams.get('folderId');
  if (!folderId) return NextResponse.json({ error: 'folderId required' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const adminClient = await createAdminClient();
  const { data, error } = await adminClient
    .from('testing_hidden_steps')
    .select('step_id')
    .eq('folder_id', folderId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data ?? []).map((r) => r.step_id));
}

// POST /api/testing/hidden  { folderId, stepId }  → hides a static step
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.user_metadata?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { folderId, stepId } = body;
  if (!folderId || !stepId) {
    return NextResponse.json({ error: 'folderId and stepId required' }, { status: 400 });
  }

  const adminClient = await createAdminClient();
  const { error } = await adminClient
    .from('testing_hidden_steps')
    .upsert({ folder_id: folderId, step_id: String(stepId), hidden_by: user.id }, { onConflict: 'folder_id,step_id' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true }, { status: 201 });
}

// DELETE /api/testing/hidden?folderId=xxx&stepId=yyy  → un-hides a static step
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.user_metadata?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const folderId = req.nextUrl.searchParams.get('folderId');
  const stepId   = req.nextUrl.searchParams.get('stepId');
  if (!folderId || !stepId) {
    return NextResponse.json({ error: 'folderId and stepId required' }, { status: 400 });
  }

  const adminClient = await createAdminClient();
  const { error } = await adminClient
    .from('testing_hidden_steps')
    .delete()
    .eq('folder_id', folderId)
    .eq('step_id', stepId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

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
    .from('testing_custom_steps')
    .select('id, module, scenario, type, validates, created_at')
    .eq('folder_id', folderId)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { folderId, module: mod, scenario, type, validates } = body;
  if (!folderId || !mod?.trim() || !scenario?.trim() || !type) {
    return NextResponse.json({ error: 'folderId, module, scenario and type required' }, { status: 400 });
  }
  if (!['Automated', 'Manual'].includes(type)) {
    return NextResponse.json({ error: 'type must be Automated or Manual' }, { status: 400 });
  }

  const adminClient = await createAdminClient();
  const { data, error } = await adminClient
    .from('testing_custom_steps')
    .insert({
      folder_id: folderId,
      module: mod.trim(),
      scenario: scenario.trim(),
      type,
      validates: validates?.trim() ?? '',
    })
    .select('id, module, scenario, type, validates, created_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const isAdmin = user.user_metadata?.role === 'admin';
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const adminClient = await createAdminClient();
  const { error } = await adminClient
    .from('testing_custom_steps')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

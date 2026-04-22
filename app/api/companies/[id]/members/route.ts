import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const adminClient = await createAdminClient();
  const { data: members, error } = await adminClient
    .from('company_members')
    .select('*')
    .eq('company_id', id)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: { users } } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  const userMap = new Map(users.map((u) => [u.id, u]));

  const enriched = (members ?? []).map((m) => {
    const u = userMap.get(m.user_id);
    return { ...m, email: u?.email ?? null, name: u?.user_metadata?.name ?? null };
  });

  return NextResponse.json(enriched);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { userId, email, password } = body;
  const adminClient = await createAdminClient();

  let resolvedUserId = userId;

  // Create a new auth user if email+password provided instead of userId
  if (!resolvedUserId) {
    if (!email?.trim() || !password?.trim()) {
      return NextResponse.json({ error: 'userId or email+password required' }, { status: 400 });
    }
    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
      user_metadata: { role: 'viewer' },
    });
    if (createErr) return NextResponse.json({ error: createErr.message }, { status: 500 });
    resolvedUserId = created.user.id;
  }

  const { data, error } = await adminClient
    .from('company_members')
    .insert({ company_id: id, user_id: resolvedUserId })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ...data, created_email: email?.trim() ?? null }, { status: 201 });
}

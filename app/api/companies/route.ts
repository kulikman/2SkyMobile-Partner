import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const adminClient = await createAdminClient();
  const { data, error } = await adminClient.from('companies').select('*').order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
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

  const { name, email, password, logo_url } = body;
  if (!name?.trim()) return NextResponse.json({ error: 'name is required' }, { status: 400 });
  if (!email?.trim()) return NextResponse.json({ error: 'email is required' }, { status: 400 });
  if (!password?.trim()) return NextResponse.json({ error: 'password is required' }, { status: 400 });

  const adminClient = await createAdminClient();

  // Create company record
  const { data: company, error: companyError } = await adminClient
    .from('companies')
    .insert({ name: name.trim(), logo_url: logo_url ?? null })
    .select()
    .single();

  if (companyError || !company) {
    return NextResponse.json({ error: companyError?.message ?? 'Failed to create company' }, { status: 500 });
  }

  // Create Supabase auth user linked to this company
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email: email.trim(),
    password,
    email_confirm: true,
    user_metadata: { role: 'viewer', company_id: company.id, name: name.trim() },
  });

  if (authError) {
    // Roll back company creation
    await adminClient.from('companies').delete().eq('id', company.id);
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  return NextResponse.json({ company, user: authData.user }, { status: 201 });
}

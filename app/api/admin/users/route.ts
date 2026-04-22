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

  const { email, password } = body;
  if (!email?.trim()) return NextResponse.json({ error: 'email is required' }, { status: 400 });
  if (!password?.trim()) return NextResponse.json({ error: 'password is required' }, { status: 400 });

  const adminClient = await createAdminClient();
  const { data, error } = await adminClient.auth.admin.createUser({
    email: email.trim(),
    password,
    email_confirm: true,
    user_metadata: { role: 'admin' },
  });

  if (error) {
    // User already exists — promote to admin instead
    if (error.message.toLowerCase().includes('already been registered') || error.message.toLowerCase().includes('already registered')) {
      const { data: { users } } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
      const existing = users.find((u) => u.email?.toLowerCase() === email.trim().toLowerCase());
      if (!existing) return NextResponse.json({ error: error.message }, { status: 500 });
      const { data: updated, error: updateErr } = await adminClient.auth.admin.updateUserById(existing.id, {
        user_metadata: { ...existing.user_metadata, role: 'admin' },
      });
      if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
      return NextResponse.json({
        id: updated.user.id,
        email: updated.user.email,
        created_at: updated.user.created_at,
      }, { status: 201 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    id: data.user.id,
    email: data.user.email,
    created_at: data.user.created_at,
  }, { status: 201 });
}

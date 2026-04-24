import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.user_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.formData();
  const role = body.get('role') as string;

  const adminClient = await createAdminClient();

  // Fetch current metadata first to avoid overwriting other fields (company_id, name, etc.)
  const { data: existing } = await adminClient.auth.admin.getUserById(userId);
  const currentMeta = existing?.user?.user_metadata ?? {};

  const { error } = await adminClient.auth.admin.updateUserById(userId, {
    user_metadata: { ...currentMeta, role },
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.redirect(new URL('/admin/users', req.url));
}

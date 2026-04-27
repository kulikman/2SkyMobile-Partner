import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

/**
 * POST /api/admin/backfill-ticket-numbers
 * One-time admin-only endpoint: assigns sequential ticket_number to all
 * tickets that are missing one, ordered by created_at.
 */
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const adminClient = await createAdminClient();

  // Fetch all tickets ordered by created_at
  const { data: docs, error } = await adminClient
    .from('documents')
    .select('id, metadata, created_at')
    .eq('doc_type', 'ticket')
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!docs?.length) return NextResponse.json({ updated: 0 });

  // Find the max existing ticket_number
  let maxNum = 0;
  for (const doc of docs) {
    const n = (doc.metadata as Record<string, unknown>)?.ticket_number as number | undefined;
    if (n && n > maxNum) maxNum = n;
  }

  // Assign numbers only to tickets that are missing one
  const missing = docs.filter((doc) => {
    const n = (doc.metadata as Record<string, unknown>)?.ticket_number;
    return !n;
  });

  let updated = 0;
  for (const doc of missing) {
    maxNum += 1;
    const meta = { ...(doc.metadata as Record<string, unknown>), ticket_number: maxNum };
    const { error: upErr } = await adminClient
      .from('documents')
      .update({ metadata: meta })
      .eq('id', doc.id);
    if (!upErr) updated++;
  }

  return NextResponse.json({ updated, maxNum });
}

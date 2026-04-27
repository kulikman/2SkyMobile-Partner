import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AdminTicketsClient } from '@/components/AdminTicketsClient';

export const metadata = { title: 'All Issues — Admin' };

export default async function AdminTicketsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== 'admin') redirect('/');

  return <AdminTicketsClient />;
}

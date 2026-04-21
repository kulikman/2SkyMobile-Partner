import { redirect } from 'next/navigation';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { Navbar } from '@/components/Navbar';
import { AdminCompaniesClient } from '@/components/AdminCompaniesClient';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';

export default async function AdminCompaniesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== 'admin') redirect('/');

  const adminClient = await createAdminClient();

  const { data: companies } = await adminClient
    .from('companies')
    .select('*')
    .order('created_at', { ascending: false });

  // Enrich with user emails (one user per company via company_id in user_metadata)
  const { data: { users } } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  const companyUserMap = new Map<string, string>();
  for (const u of users) {
    const cid = u.user_metadata?.company_id;
    if (cid) companyUserMap.set(cid, u.email ?? '');
  }

  const enriched = (companies ?? []).map((c) => ({
    ...c,
    user_email: companyUserMap.get(c.id) ?? null,
  }));

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Navbar isAdmin userId={user.id} />
      <Container maxWidth="md" sx={{ py: 5 }}>
        <AdminCompaniesClient initialCompanies={enriched} />
      </Container>
    </Box>
  );
}

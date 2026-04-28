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

  // Fetch ALL users (for the "Add existing user" autocomplete)
  const allAuthUsers: { id: string; email: string; role: string }[] = [];
  let page = 1;
  while (true) {
    const { data } = await adminClient.auth.admin.listUsers({ perPage: 1000, page });
    for (const u of data.users) {
      allAuthUsers.push({
        id: u.id,
        email: u.email ?? '',
        role: (u.user_metadata?.role as string) ?? 'viewer',
      });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nextPage = (data as any).nextPage as number | null;
    if (!nextPage) break;
    page = nextPage;
  }

  // Try SECURITY DEFINER function first (direct SQL JOIN — most reliable).
  // Falls back to direct table query + listUsers join if function not yet created.
  let memberships: { id: string; company_id: string; user_id: string; email: string | null }[] = [];

  const { data: rpcData, error: rpcError } = await adminClient
    .rpc('get_company_members_with_email');

  if (!rpcError && rpcData) {
    memberships = (rpcData as { id: string; company_id: string; user_id: string; email: string | null }[])
      .map((m) => ({ id: m.id, company_id: m.company_id, user_id: m.user_id, email: m.email }));
  } else {
    // Fallback: query company_members directly and enrich with listUsers data
    const { data: rawMemberships } = await adminClient
      .from('company_members')
      .select('id, company_id, user_id');
    const userMap = new Map(allAuthUsers.map((u) => [u.id, u]));
    memberships = (rawMemberships ?? []).map((m) => ({
      id: m.id as string,
      company_id: m.company_id as string,
      user_id: m.user_id as string,
      email: userMap.get(m.user_id as string)?.email ?? null,
    }));
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Navbar isAdmin userId={user.id} />
      <Container maxWidth="md" sx={{ py: 5 }}>
        <AdminCompaniesClient
          initialCompanies={companies ?? []}
          allUsers={allAuthUsers}
          initialMemberships={memberships}
        />
      </Container>
    </Box>
  );
}

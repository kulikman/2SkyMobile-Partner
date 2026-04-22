import { redirect } from 'next/navigation';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { Navbar } from '@/components/Navbar';
import { AdminUsersClient } from '@/components/AdminUsersClient';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== 'admin') redirect('/');

  const adminClient = await createAdminClient();
  const { data: { users } } = await adminClient.auth.admin.listUsers({ perPage: 1000 });

  const admins = users
    .filter((u) => u.user_metadata?.role === 'admin')
    .map((u) => ({
      id: u.id,
      email: u.email ?? '',
      created_at: u.created_at,
    }));

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Navbar isAdmin userId={user.id} />
      <Container maxWidth="md" sx={{ py: 5 }}>
        <AdminUsersClient initialAdmins={admins} currentUserId={user.id} />
      </Container>
    </Box>
  );
}

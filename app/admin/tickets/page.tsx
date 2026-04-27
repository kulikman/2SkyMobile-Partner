import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Navbar } from '@/components/Navbar';
import { AdminTicketsClient } from '@/components/AdminTicketsClient';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';

export const metadata = { title: 'All Issues — Admin' };

export default async function AdminTicketsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== 'admin') redirect('/');

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Navbar isAdmin userId={user.id} />
      <Container maxWidth="lg" sx={{ py: 5 }}>
        <AdminTicketsClient />
      </Container>
    </Box>
  );
}

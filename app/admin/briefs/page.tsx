import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Navbar } from '@/components/Navbar';
import { AdminBriefsClient } from '@/components/AdminBriefsClient';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';

export default async function AdminBriefsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== 'admin') redirect('/');

  const { data: briefs } = await supabase
    .from('documents')
    .select('id, title, slug, description, content, created_at, public_access_enabled, anonymous_comments_enabled, public_share_token, folder_id')
    .eq('doc_type', 'brief')
    .order('created_at', { ascending: false });

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Navbar isAdmin userId={user.id} />
      <Container maxWidth="lg" sx={{ py: 5 }}>
        <AdminBriefsClient initialBriefs={briefs ?? []} />
      </Container>
    </Box>
  );
}

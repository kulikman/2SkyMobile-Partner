import { redirect } from 'next/navigation';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { Navbar } from '@/components/Navbar';
import { AdminProjectsClient } from '@/components/AdminProjectsClient';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';

export default async function AdminProjectsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== 'admin') redirect('/');

  const adminClient = await createAdminClient();

  const { data: folders } = await supabase
    .from('folders')
    .select('*')
    .is('parent_id', null)
    .order('position', { ascending: true });

  const { data: companies } = await adminClient
    .from('companies')
    .select('id, name')
    .order('name', { ascending: true });

  const projects = (folders ?? []).map((f) => ({
    id: f.id,
    name: f.name,
    color: f.color ?? null,
    icon: f.icon ?? null,
    status: f.status ?? 'in_discussion',
    progress: f.progress ?? 0,
    client_name: f.client_name ?? null,
    started_at: f.started_at ?? null,
    deadline_at: f.deadline_at ?? null,
    position: f.position ?? 0,
    company_id: (f as Record<string, unknown>).company_id as string | null ?? null,
    partner_visible: (f as Record<string, unknown>).partner_visible as boolean ?? true,
  }));

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Navbar isAdmin userId={user.id} />
      <Container maxWidth="lg" sx={{ py: 5 }}>
        <AdminProjectsClient
          initialProjects={projects}
          companies={companies ?? []}
        />
      </Container>
    </Box>
  );
}

import { redirect } from 'next/navigation';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { Navbar } from '@/components/Navbar';
import { AdminProjectsClient } from '@/components/AdminProjectsClient';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';

export default async function AdminProjectsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.user_metadata?.role !== 'admin') redirect('/');

  // Fetch all top-level folders (projects)
  const { data: folders } = await supabase
    .from('folders')
    .select('*')
    .is('parent_id', null)
    .order('position', { ascending: true });

  // Fetch all users for member assignment
  const adminClient = await createAdminClient();
  const {
    data: { users },
  } = await adminClient.auth.admin.listUsers({ perPage: 1000 });

  // Fetch all project memberships
  const { data: memberships } = await adminClient
    .from('project_members')
    .select('*');

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
  }));

  const allUsers = users.map((u) => ({
    id: u.id,
    email: u.email ?? '',
    role: (u.user_metadata?.role as string) ?? 'viewer',
  }));

  const membershipData = (memberships ?? []).map((m) => ({
    id: m.id,
    folder_id: m.folder_id,
    user_id: m.user_id,
  }));

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Navbar isAdmin userId={user.id} />
      <Container maxWidth="lg" sx={{ py: 5 }}>
        <AdminProjectsClient
          initialProjects={projects}
          allUsers={allUsers}
          initialMemberships={membershipData}
        />
      </Container>
    </Box>
  );
}

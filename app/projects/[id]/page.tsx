import { redirect, notFound } from 'next/navigation';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Link from 'next/link';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { Navbar } from '@/components/Navbar';
import { ProjectDetail } from '@/components/ProjectDetail';
import { ProjectTabs } from '@/components/ProjectTabs';
import { getDisplayName } from '@/lib/user-display';
import type { ProjectData } from '@/components/ProjectDetail';
import type { RoadmapItem } from '@/components/RoadmapView';
import type { ReportDoc } from '@/components/ReportList';
import type { Task } from '@/components/TasksView';

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const isAdmin = user.user_metadata?.role === 'admin';

  const { data: folder, error } = await supabase
    .from('folders')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !folder) notFound();

  const adminClient = await createAdminClient();

  if (!isAdmin) {
    if (!folder.company_id) notFound();
    const { data: membership } = await adminClient
      .from('company_members')
      .select('id')
      .eq('company_id', folder.company_id)
      .eq('user_id', user.id)
      .single();
    if (!membership) notFound();
  }

  const f = folder as Record<string, unknown>;

  const project: ProjectData = {
    id: folder.id,
    name: folder.name,
    color: folder.color ?? null,
    icon: folder.icon ?? null,
    status: folder.status ?? 'in_discussion',
    progress: folder.progress ?? 0,
    client_name: folder.client_name ?? null,
    company_id: (f.company_id as string) ?? null,
    started_at: folder.started_at ?? null,
    deadline_at: folder.deadline_at ?? null,
    stage_url: (f.stage_url as string) ?? null,
  };
  const { data: rawCompanies } = await adminClient
    .from('companies')
    .select('id, name')
    .order('name', { ascending: true });

  const companies = (rawCompanies ?? []).map((c) => ({ id: c.id as string, name: c.name as string }));

  const { data: rawRoadmap } = await supabase
    .from('roadmap_items')
    .select('*')
    .eq('folder_id', id)
    .order('position', { ascending: true });

  const roadmapItems: RoadmapItem[] = (rawRoadmap ?? []).map((r) => ({
    id: r.id,
    folder_id: r.folder_id,
    title: r.title,
    description: r.description ?? null,
    status: r.status ?? 'pending',
    position: r.position ?? 0,
    due_date: r.due_date ?? null,
    completed_at: r.completed_at ?? null,
    created_at: r.created_at,
  }));

  const { data: rawTasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('folder_id', id)
    .order('position', { ascending: true });

  const tasks: Task[] = (rawTasks ?? []).map((t) => ({
    id: t.id, folder_id: t.folder_id,
    group_label: t.group_label ?? null, title: t.title,
    description: t.description ?? null, type: t.type ?? null,
    role: t.role ?? null, status: t.status ?? 'backlog',
    estimated_hours: t.estimated_hours ?? null,
    start_date: t.start_date ?? null, due_date: t.due_date ?? null,
    completed_at: t.completed_at ?? null, created_at: t.created_at,
  }));

  const { data: rawDocs } = await supabase
    .from('documents')
    .select('id, slug, title, description, report_type, report_period_start, report_period_end, created_at')
    .eq('folder_id', id)
    .order('created_at', { ascending: false });

  const reports: ReportDoc[] = (rawDocs ?? []).map((d: Record<string, unknown>) => ({
    id: d.id as string,
    slug: d.slug as string,
    title: d.title as string,
    description: (d.description as string) ?? null,
    report_type: (d.report_type as string) ?? null,
    report_period_start: (d.report_period_start as string) ?? null,
    report_period_end: (d.report_period_end as string) ?? null,
    created_at: d.created_at as string,
  }));

  const currentUser = {
    id: user.id,
    email: user.email ?? '',
    name: getDisplayName({ email: user.email, metadata: user.user_metadata ?? null }),
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Navbar isAdmin={isAdmin} userId={user.id} />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Breadcrumbs sx={{ mb: 3 }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <Button size="small" color="inherit" sx={{ textTransform: 'none' }}>Projects</Button>
          </Link>
          <Typography color="text.primary" fontWeight={600}>{project.name}</Typography>
        </Breadcrumbs>

        {/* Project header */}
        <ProjectDetail
          project={project}
          companies={companies}
          currentUser={currentUser}
          isAdmin={isAdmin}
        />

        {/* Tabbed sections */}
        <ProjectTabs
          folderId={id}
          projectStartAt={folder.started_at ?? null}
          initialTasks={tasks}
          roadmapItems={roadmapItems}
          reports={reports}
          initialSpec={f.tech_spec as Record<string, string> | null ?? null}
          isAdmin={isAdmin}
          currentUser={currentUser}
        />
      </Container>
    </Box>
  );
}

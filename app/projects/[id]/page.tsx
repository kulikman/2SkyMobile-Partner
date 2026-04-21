import { redirect, notFound } from 'next/navigation';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Link from 'next/link';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { Navbar } from '@/components/Navbar';
import { ProjectDetail } from '@/components/ProjectDetail';
import { TasksView } from '@/components/TasksView';
import { TechStackEditor } from '@/components/TechStackEditor';
import { MeetingsView } from '@/components/MeetingsView';
import { ProjectFilesView } from '@/components/ProjectFilesView';
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

  if (!isAdmin) {
    const adminClient = await createAdminClient();
    const { data: membership } = await adminClient
      .from('project_members')
      .select('id')
      .eq('folder_id', id)
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
    started_at: folder.started_at ?? null,
    deadline_at: folder.deadline_at ?? null,
    stage_url: (f.stage_url as string) ?? null,
  };

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

        {/* Header + Roadmap + Reports + Chat */}
        <ProjectDetail
          project={project}
          roadmapItems={roadmapItems}
          reports={reports}
          currentUser={currentUser}
          isAdmin={isAdmin}
        />

        {/* Tasks */}
        <Box mt={3}>
          <TasksView
            initialTasks={tasks}
            folderId={id}
            projectStartAt={folder.started_at ?? null}
            isAdmin={isAdmin}
            currentUser={currentUser}
          />
        </Box>

        {/* Meetings */}
        <Paper variant="outlined" sx={{ borderRadius: 3, p: 3, mt: 3 }}>
          <MeetingsView folderId={id} isAdmin={isAdmin} />
        </Paper>

        {/* Documentation */}
        <Paper variant="outlined" sx={{ borderRadius: 3, p: 3, mt: 3 }}>
          <ProjectFilesView folderId={id} isAdmin={isAdmin} />
        </Paper>

        {/* Tech Stack */}
        <Paper variant="outlined" sx={{ borderRadius: 3, p: 3, mt: 3 }}>
          <TechStackEditor
            folderId={id}
            initialSpec={f.tech_spec as Record<string, string> | null ?? null}
            isAdmin={isAdmin}
          />
        </Paper>

        <Divider sx={{ my: 4 }} />
      </Container>
    </Box>
  );
}

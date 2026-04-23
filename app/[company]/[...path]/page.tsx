import { notFound, redirect } from 'next/navigation';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import FolderIcon from '@mui/icons-material/Folder';
import DescriptionIcon from '@mui/icons-material/Description';
import EditIcon from '@mui/icons-material/Edit';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Link from 'next/link';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { Navbar } from '@/components/Navbar';
import { SpaceBreadcrumbs } from '@/components/SpaceBreadcrumbs';
import { resolveSpacePath } from '@/lib/resolve-space-path';
import { WhiteboardViewerClient } from '@/components/WhiteboardViewerClient';
import { WhiteboardAdminPage } from '@/components/WhiteboardAdminPage';
import { DocumentEditorForm } from '@/components/DocumentEditorForm';
import { DocumentWithComments } from '@/components/DocumentWithComments';
import { RoadmapDocRenderer } from '@/components/doc-renderers/RoadmapDocRenderer';
import { TaskDocRenderer } from '@/components/doc-renderers/TaskDocRenderer';
import { TicketDocRenderer } from '@/components/doc-renderers/TicketDocRenderer';
import { MeetingDocRenderer } from '@/components/doc-renderers/MeetingDocRenderer';
import { buildInitialComments } from '@/lib/comment-view-models';
import { getDisplayName } from '@/lib/user-display';
import { splitDocumentContent } from '@/lib/document-content';
import { ProjectDetail } from '@/components/ProjectDetail';
import { ProjectTabs } from '@/components/ProjectTabs';
import type { ProjectData } from '@/components/ProjectDetail';
import type { RoadmapItem } from '@/components/RoadmapView';
import type { ReportDoc } from '@/components/ReportList';
import type { Task } from '@/components/TasksView';

const RESERVED = new Set([
  'login', 'admin', 'projects', 'docs', 'share', 'blueprint',
  'folders', 'api', 'c', '_not-found',
]);

export default async function SpacePathPage({
  params,
}: {
  params: Promise<{ company: string; path: string[] }>;
}) {
  const { company: companySlug, path } = await params;
  if (RESERVED.has(companySlug)) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const isAdmin = user.user_metadata?.role === 'admin';

  // ── Edit view: /{company}/.../{doc-slug}/edit ─────────────────────────────
  if (path[path.length - 1] === 'edit') {
    if (!isAdmin) notFound();
    const docPath = path.slice(0, -1);
    const resolved = await resolveSpacePath(companySlug, docPath);
    if (!resolved || resolved.kind !== 'document') notFound();

    const adminClient = await createAdminClient();
    const { data: doc } = await adminClient
      .from('documents')
      .select('id, title, slug, content, doc_type, description, image, public_access_enabled, public_comments_visible, anonymous_comments_enabled')
      .eq('id', resolved.documentId)
      .single();
    if (!doc) notFound();

    const backHref = `/${companySlug}/${docPath.join('/')}`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const docType = (doc as any).doc_type ?? 'md';

    if (docType === 'whiteboard') {
      return (
        <Box sx={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
          <WhiteboardAdminPage
            documentId={doc.id}
            slug={doc.slug}
            title={doc.title}
            backHref={backHref}
            initialSnapshot={doc.content && doc.content !== '{}' ? doc.content : null}
          />
        </Box>
      );
    }

    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <Navbar isAdmin={isAdmin} userId={user.id} />
        <Container maxWidth="xl" sx={{ py: 5 }}>
          <SpaceBreadcrumbs items={resolved.breadcrumbs.slice(0, -1)} current={`Edit: ${doc.title}`} />
          <Link href={backHref} style={{ textDecoration: 'none' }}>
            <Button startIcon={<ArrowBackIcon />} size="small" sx={{ mb: 3 }}>
              Back to document
            </Button>
          </Link>
          <Typography variant="h5" fontWeight={700} mb={3}>Edit document</Typography>
          <DocumentEditorForm
            mode="edit"
            documentId={doc.id}
            initialTitle={doc.title}
            initialSlug={doc.slug}
            initialDescription={doc.description ?? ''}
            initialImage={doc.image ?? ''}
            initialContent={doc.content}
            initialPublicAccessEnabled={Boolean(doc.public_access_enabled)}
            initialPublicCommentsVisible={Boolean(doc.public_comments_visible)}
            initialAnonymousCommentsEnabled={Boolean(doc.anonymous_comments_enabled)}
          />
        </Container>
      </Box>
    );
  }

  const resolved = await resolveSpacePath(companySlug, path);
  if (!resolved) notFound();

  // ── Top-level project folder → full project view ──────────────────────────
  if (resolved.kind === 'folder' && path.length === 1) {
    const adminClient = await createAdminClient();

    if (!isAdmin) {
      const { data: membership } = await adminClient
        .from('company_members').select('id')
        .eq('company_id', resolved.companyId).eq('user_id', user.id).single();
      if (!membership) notFound();
    }

    const [
      { data: folderData },
      { data: rawCompanies },
      { data: rawRoadmap },
      { data: rawTasks },
      { data: rawDocs },
    ] = await Promise.all([
      adminClient.from('folders').select('*').eq('id', resolved.folderId).single(),
      adminClient.from('companies').select('id, name, slug').order('name', { ascending: true }),
      adminClient.from('documents')
        .select('id, folder_id, title, description, position, created_at, metadata')
        .eq('folder_id', resolved.folderId).eq('doc_type', 'roadmap')
        .order('position', { ascending: true }),
      adminClient.from('documents')
        .select('id, folder_id, title, description, position, created_at, metadata')
        .eq('folder_id', resolved.folderId).eq('doc_type', 'task')
        .order('position', { ascending: true }),
      adminClient.from('documents')
        .select('id, slug, title, description, report_type, report_period_start, report_period_end, created_at')
        .eq('folder_id', resolved.folderId).eq('doc_type', 'md')
        .order('created_at', { ascending: false }),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const f = (folderData ?? {}) as Record<string, any>;

    const project: ProjectData = {
      id: resolved.folderId,
      name: resolved.folderName,
      color: f.color ?? null,
      icon: f.icon ?? null,
      status: f.status ?? 'in_discussion',
      progress: f.progress ?? 0,
      client_name: f.client_name ?? null,
      company_id: resolved.companyId,
      started_at: f.started_at ?? null,
      deadline_at: f.deadline_at ?? null,
      stage_url: f.stage_url ?? null,
    };

    const companies = (rawCompanies ?? []).map((c) => ({ id: c.id as string, name: c.name as string }));

    const roadmapItems: RoadmapItem[] = (rawRoadmap ?? []).map((r) => {
      const m = (r.metadata as Record<string, unknown>) ?? {};
      return {
        id: r.id, folder_id: r.folder_id, title: r.title,
        description: r.description ?? null,
        status: (m.status as string) ?? 'pending',
        position: r.position ?? 0,
        due_date: (m.due_date as string) ?? null,
        completed_at: (m.completed_at as string) ?? null,
        created_at: r.created_at,
      };
    });

    const tasks: Task[] = (rawTasks ?? []).map((t) => {
      const m = (t.metadata as Record<string, unknown>) ?? {};
      return {
        id: t.id, folder_id: t.folder_id,
        group_label: (m.group_label as string) ?? null, title: t.title,
        description: t.description ?? null, type: (m.type as string) ?? null,
        role: (m.role as string) ?? null, status: (m.status as string) ?? 'backlog',
        estimated_hours: (m.estimated_hours as number) ?? null,
        start_date: (m.start_date as string) ?? null, due_date: (m.due_date as string) ?? null,
        completed_at: (m.completed_at as string) ?? null, created_at: t.created_at,
      };
    });

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
          <SpaceBreadcrumbs
            items={[{ label: resolved.companyName, href: `/${companySlug}` }]}
            current={project.name}
          />

          <ProjectDetail
            project={project}
            companies={companies}
            currentUser={currentUser}
            isAdmin={isAdmin}
          />

          <ProjectTabs
            folderId={resolved.folderId}
            projectStartAt={f.started_at ?? null}
            initialTasks={tasks}
            roadmapItems={roadmapItems}
            reports={reports}
            initialSpec={f.tech_spec as Record<string, string> | null ?? null}
            isAdmin={isAdmin}
            currentUser={currentUser}
            canonicalBase={`/${companySlug}/${path[0]}`}
          />
        </Container>
      </Box>
    );
  }

  // ── Nested folder view ────────────────────────────────────────────────────
  if (resolved.kind === 'folder') {
    const adminClient = await createAdminClient();

    if (!isAdmin) {
      const { data: membership } = await adminClient
        .from('company_members').select('id')
        .eq('company_id', resolved.companyId).eq('user_id', user.id).single();
      if (!membership) notFound();
    }

    const base = `/${companySlug}`;
    const [{ data: subFolders }, { data: docs }] = await Promise.all([
      adminClient.from('folders').select('id, name, slug, icon, color').eq('parent_id', resolved.folderId).order('name'),
      adminClient.from('documents').select('id, slug, title, doc_type').eq('folder_id', resolved.folderId).eq('doc_type', 'md').order('title'),
    ]);

    const breadcrumbsWithoutCurrent = resolved.breadcrumbs.slice(0, -1);

    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <Navbar isAdmin={isAdmin} userId={user.id} />
        <Container maxWidth="lg" sx={{ py: 5 }}>
          <SpaceBreadcrumbs items={breadcrumbsWithoutCurrent} current={resolved.folderName} />
          <Typography variant="h4" fontWeight={700} sx={{ mt: 2, mb: 4 }}>{resolved.folderName}</Typography>

          {(subFolders ?? []).length > 0 && (
            <>
              <Typography variant="overline" color="text.secondary" sx={{ mb: 1, display: 'block' }}>Folders</Typography>
              <Grid container spacing={2} sx={{ mb: 4 }}>
                {(subFolders ?? []).map((folder) => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const slug = (folder as any).slug;
                  const href = slug ? `${base}/${[...path, slug].join('/')}` : `/projects/${folder.id}`;
                  return (
                    <Grid key={folder.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                      <Link href={href} style={{ textDecoration: 'none' }}>
                        <Card variant="outlined" sx={{ borderRadius: 2 }}>
                          <CardActionArea>
                            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <FolderIcon sx={{ color: folder.color ?? 'text.secondary', flexShrink: 0 }} />
                              <Typography fontWeight={600} noWrap>{folder.name}</Typography>
                            </CardContent>
                          </CardActionArea>
                        </Card>
                      </Link>
                    </Grid>
                  );
                })}
              </Grid>
            </>
          )}

          {(docs ?? []).length > 0 && (
            <>
              <Typography variant="overline" color="text.secondary" sx={{ mb: 1, display: 'block' }}>Documents</Typography>
              <Grid container spacing={2}>
                {(docs ?? []).map((doc) => {
                  const href = doc.slug ? `${base}/${[...path, doc.slug].join('/')}` : `/docs/${doc.id}`;
                  return (
                    <Grid key={doc.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                      <Link href={href} style={{ textDecoration: 'none' }}>
                        <Card variant="outlined" sx={{ borderRadius: 2 }}>
                          <CardActionArea>
                            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <DescriptionIcon sx={{ color: 'text.secondary', flexShrink: 0 }} />
                              <Typography fontWeight={600} noWrap>{doc.title}</Typography>
                            </CardContent>
                          </CardActionArea>
                        </Card>
                      </Link>
                    </Grid>
                  );
                })}
              </Grid>
            </>
          )}

          {(subFolders ?? []).length === 0 && (docs ?? []).length === 0 && (
            <Typography color="text.secondary">This folder is empty.</Typography>
          )}
        </Container>
      </Box>
    );
  }

  // ── Document view ─────────────────────────────────────────────────────────
  if (resolved.kind === 'document') {
    const adminClient = await createAdminClient();

    if (!isAdmin) {
      const { data: membership } = await adminClient
        .from('company_members').select('id')
        .eq('company_id', resolved.companyId).eq('user_id', user.id).single();
      if (!membership) notFound();
    }

    const { data: doc } = await adminClient
      .from('documents')
      .select('id, slug, title, content, doc_type, metadata, description, image')
      .eq('id', resolved.documentId)
      .single();
    if (!doc) notFound();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const docType: string = (doc as any).doc_type ?? 'md';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const metadata: Record<string, unknown> = (doc as any).metadata ?? {};
    const breadcrumbsWithoutCurrent = resolved.breadcrumbs.slice(0, -1);
    const editHref = isAdmin ? `/${companySlug}/${path.join('/')}/edit` : undefined;

    if (docType === 'whiteboard') {
      return (
        <Box sx={{ height: '100vh', overflow: 'hidden' }}>
          <WhiteboardViewerClient
            snapshot={doc.content ?? '{}'}
            docTitle={doc.title}
            backHref={breadcrumbsWithoutCurrent.at(-1)?.href ?? `/${companySlug}`}
            editHref={editHref}
          />
        </Box>
      );
    }

    const isStructured = ['roadmap', 'task', 'ticket', 'meeting'].includes(docType);
    let initialComments: Awaited<ReturnType<typeof buildInitialComments>> = [];
    let currentUser: { id: string; email: string; name: string } | null = null;

    if (!isStructured) {
      const { data: rawComments } = await adminClient
        .from('comments').select('*')
        .eq('document_id', doc.id).order('created_at', { ascending: true });
      const userDir = await adminClient.auth.admin.listUsers({ perPage: 1000 });
      const users = userDir.data.users ?? [];
      initialComments = buildInitialComments(
        rawComments ?? [],
        users.map((u) => ({ id: u.id, email: u.email, user_metadata: u.user_metadata })),
      );
      currentUser = user ? {
        id: user.id, email: user.email ?? '',
        name: getDisplayName({ email: user.email, metadata: user.user_metadata ?? null }),
      } : null;
    }

    const parsed = splitDocumentContent(doc.content);

    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <Navbar isAdmin={isAdmin} userId={user.id} />
        <Container maxWidth="lg" sx={{ py: 5 }}>
          <SpaceBreadcrumbs items={breadcrumbsWithoutCurrent} current={doc.title} />

          <Box sx={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: 2, mb: 4, mt: 2, flexDirection: { xs: 'column', sm: 'row' },
          }}>
            <Typography variant="h4" fontWeight={700}>{doc.title}</Typography>
            {editHref && (
              <Link href={editHref} style={{ textDecoration: 'none' }}>
                <Button variant="outlined" size="small" startIcon={<EditIcon fontSize="small" />}>
                  Edit
                </Button>
              </Link>
            )}
          </Box>

          {doc.description && (
            <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 860, lineHeight: 1.6, mb: 3 }}>
              {doc.description}
            </Typography>
          )}

          <Divider sx={{ mb: 4 }} />

          {docType === 'roadmap' && <RoadmapDocRenderer metadata={metadata as Parameters<typeof RoadmapDocRenderer>[0]['metadata']} />}
          {docType === 'task'    && <TaskDocRenderer    metadata={metadata as Parameters<typeof TaskDocRenderer>[0]['metadata']}    bodyHtml={parsed.body} />}
          {docType === 'ticket'  && <TicketDocRenderer  metadata={metadata as Parameters<typeof TicketDocRenderer>[0]['metadata']}  body={parsed.body} />}
          {docType === 'meeting' && <MeetingDocRenderer metadata={metadata as Parameters<typeof MeetingDocRenderer>[0]['metadata']} body={parsed.body} />}

          {!isStructured && currentUser && (
            <Box sx={{ position: 'relative' }}>
              <DocumentWithComments
                documentId={doc.id} content={parsed.body}
                currentUser={currentUser} initialComments={initialComments}
              />
            </Box>
          )}
          {!isStructured && !currentUser && (
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>{parsed.body}</Typography>
          )}
        </Container>
      </Box>
    );
  }

  notFound();
}

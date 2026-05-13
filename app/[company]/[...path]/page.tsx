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
import Stack from '@mui/material/Stack';
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
import { TaskDocRenderer } from '@/components/doc-renderers/TaskDocRenderer';
import { TicketDocRenderer } from '@/components/doc-renderers/TicketDocRenderer';
import { MeetingDocRenderer } from '@/components/doc-renderers/MeetingDocRenderer';
import { buildInitialComments } from '@/lib/comment-view-models';
import { getDisplayName } from '@/lib/user-display';
import { splitDocumentContent } from '@/lib/document-content';
import { ProjectDetail } from '@/components/ProjectDetail';
import { ProjectTabs } from '@/components/ProjectTabs';
import { CopyLinkButton } from '@/components/CopyLinkButton';
import { TicketDetailClient } from '@/components/TicketDetailClient';
import type { ProjectData } from '@/components/ProjectDetail';
import type { TicketDetail, TicketComment } from '@/components/TicketDetailClient';

const RESERVED = new Set([
  'login', 'admin', 'projects', 'docs', 'share', 'blueprint',
  'folders', 'api', 'c', '_not-found',
]);

const TAB_NAME_TO_INDEX: Record<string, number> = {
  docs: 0, reports: 0,
  techstack: 1, 'tech-stack': 1,
  testing: 2,
  issues: 3,
};

export default async function SpacePathPage({
  params,
  searchParams,
}: {
  params: Promise<{ company: string; path: string[] }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { company: companySlug, path } = await params;
  const sp: Record<string, string | string[] | undefined> = searchParams ? await searchParams : {};
  if (RESERVED.has(companySlug)) notFound();
  const tabParam = typeof sp.tab === 'string' ? sp.tab.toLowerCase() : '';
  const initialTab = TAB_NAME_TO_INDEX[tabParam] ?? 0;

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
      .select('id, title, slug, content, doc_type, description, image, public_access_enabled, public_comments_visible, anonymous_comments_enabled, folder_id')
      .eq('id', resolved.documentId)
      .single();
    if (!doc) notFound();

    // Build folder picker options: current folder + its siblings + its sub-folders
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const docFolderId = (doc as any).folder_id as string | null;
    const folderOptions: { id: string; name: string; indent?: boolean }[] = [];
    if (docFolderId) {
      const { data: curFolder } = await adminClient
        .from('folders').select('id, name, parent_id').eq('id', docFolderId).single();
      if (curFolder) {
        const [{ data: subFolders }, { data: siblings }] = await Promise.all([
          adminClient.from('folders').select('id, name').eq('parent_id', docFolderId).order('name'),
          curFolder.parent_id
            ? adminClient.from('folders').select('id, name').eq('parent_id', curFolder.parent_id).order('name')
            : Promise.resolve({ data: [] }),
        ]);
        // Parent folder (move up)
        if (curFolder.parent_id) {
          const { data: parentFolder } = await adminClient
            .from('folders').select('id, name').eq('id', curFolder.parent_id).single();
          if (parentFolder) folderOptions.push({ id: parentFolder.id, name: `↑ ${parentFolder.name}` });
        }
        // Siblings at same level (incl. current)
        for (const f of siblings ?? []) {
          folderOptions.push({ id: f.id, name: f.name });
        }
        // If no parent (root-level folder), add itself
        if (!curFolder.parent_id) {
          folderOptions.push({ id: curFolder.id, name: curFolder.name });
        }
        // Sub-folders of current folder (indented)
        for (const f of subFolders ?? []) {
          folderOptions.push({ id: f.id, name: f.name, indent: true });
        }
      }
    }

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
            initialFolderId={docFolderId ?? undefined}
            folderOptions={folderOptions}
          />
        </Container>
      </Box>
    );
  }

  // ── Ticket detail: /{company}/{...folder}/issues/{number} ───────────────────
  if (path.length >= 3 && path[path.length - 2] === 'issues') {
    const ticketRef  = path[path.length - 1];
    const folderPath = path.slice(0, -2);

    const folderResolved = await resolveSpacePath(companySlug, folderPath);
    if (!folderResolved || folderResolved.kind !== 'folder') notFound();

    const adminClient = await createAdminClient();

    if (!isAdmin) {
      const { data: membership } = await adminClient
        .from('company_members').select('id')
        .eq('company_id', folderResolved.companyId).eq('user_id', user.id).single();
      if (!membership) notFound();
    }

    // Lookup by ticket_number (preferred) or UUID
    const ticketNumber = parseInt(ticketRef, 10);
    const query = adminClient
      .from('documents')
      .select('id, folder_id, title, description, created_at, metadata')
      .eq('folder_id', folderResolved.folderId)
      .eq('doc_type', 'ticket');

    const { data: ticketDoc } = await (
      !isNaN(ticketNumber)
        ? query.filter('metadata->>ticket_number', 'eq', String(ticketNumber))
        : query.eq('id', ticketRef)
    ).single();

    if (!ticketDoc) notFound();

    // Fetch comments (stored in `comments` table with document_id = ticket id)
    const { data: rawComments } = await adminClient
      .from('comments')
      .select('id, document_id, user_id, author_name, content, created_at')
      .eq('document_id', ticketDoc.id)
      .order('created_at', { ascending: true });

    // Resolve creator email
    let creatorEmail = '';
    const m = (ticketDoc.metadata ?? {}) as Record<string, unknown>;
    if (m.created_by) {
      try {
        const { data: creator } = await adminClient.auth.admin.getUserById(m.created_by as string);
        creatorEmail = creator.user?.email ?? '';
      } catch { /* best-effort */ }
    }

    const ticket: TicketDetail = {
      id:               ticketDoc.id,
      title:            ticketDoc.title,
      description:      ticketDoc.description ?? null,
      created_at:       ticketDoc.created_at,
      status:           (m.status as string)           ?? 'new',
      type:             (m.type   as string | null)     ?? null,
      priority:         (m.priority as string)          ?? 'medium',
      severity:         (m.severity as string)          ?? 'moderate',
      module:           (m.module  as string | null)    ?? null,
      url:              (m.url     as string | null)    ?? null,
      screenshot_path:  (m.screenshot_path as string | null) ?? null,
      created_by:       (m.created_by as string | null) ?? null,
      created_by_email: creatorEmail,
      ticket_number:    typeof m.ticket_number === 'number' ? m.ticket_number : null,
    };

    const comments: TicketComment[] = (rawComments ?? []).map((c) => ({
      id:          c.id,
      ticket_id:   c.document_id,
      user_id:     c.user_id,
      author_name: c.author_name,
      content:     c.content,
      created_at:  c.created_at,
    }));

    const currentUser = {
      id:    user.id,
      email: user.email ?? '',
      name:  getDisplayName({ email: user.email, metadata: user.user_metadata ?? null }),
    };

    const canonicalBase = `/${companySlug}/${folderPath.join('/')}`;
    const canonicalUrl  = `${canonicalBase}/issues/${ticketRef}`;

    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <Navbar isAdmin={isAdmin} userId={user.id} />
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <SpaceBreadcrumbs
            items={[
              ...folderResolved.breadcrumbs.slice(0, -1),
              { label: folderResolved.folderName, href: canonicalBase },
              { label: 'Issues', href: `${canonicalBase}?tab=issues` },
            ]}
            current={ticket.ticket_number ? `#${String(ticket.ticket_number).padStart(3, '0')}` : ticket.title}
          />
          <Box sx={{ mt: 2 }}>
            <TicketDetailClient
              ticket={ticket}
              initialComments={comments}
              currentUser={currentUser}
              isAdmin={isAdmin}
              backHref={`${canonicalBase}?tab=issues`}
              canonicalUrl={canonicalUrl}
            />
          </Box>
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
    ] = await Promise.all([
      adminClient.from('folders').select('*').eq('id', resolved.folderId).single(),
      adminClient.from('companies').select('id, name, slug').order('name', { ascending: true }),
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
      test_links: Array.isArray(f.test_links) ? f.test_links : [],
    };

    const companies = (rawCompanies ?? []).map((c) => ({ id: c.id as string, name: c.name as string }));

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
            initialSpec={f.tech_spec as Record<string, string> | null ?? null}
            isAdmin={isAdmin}
            currentUser={currentUser}
            canonicalBase={`/${companySlug}/${path[0]}`}
            initialTab={initialTab}
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

    const isStructured = ['task', 'ticket', 'meeting'].includes(docType);
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
            <Stack direction="row" spacing={1}>
              <CopyLinkButton />
              {editHref && (
                <Link href={editHref} style={{ textDecoration: 'none' }}>
                  <Button variant="outlined" size="small" startIcon={<EditIcon fontSize="small" />}>
                    Edit
                  </Button>
                </Link>
              )}
            </Stack>
          </Box>

          {doc.description && (
            <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 860, lineHeight: 1.6, mb: 3 }}>
              {doc.description}
            </Typography>
          )}

          <Divider sx={{ mb: 4 }} />

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

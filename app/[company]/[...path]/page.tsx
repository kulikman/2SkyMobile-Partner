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
import Link from 'next/link';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { Navbar } from '@/components/Navbar';
import { SpaceBreadcrumbs } from '@/components/SpaceBreadcrumbs';
import { resolveSpacePath } from '@/lib/resolve-space-path';
import { WhiteboardViewerClient } from '@/components/WhiteboardViewerClient';
import { DocumentWithComments } from '@/components/DocumentWithComments';
import { RoadmapDocRenderer } from '@/components/doc-renderers/RoadmapDocRenderer';
import { TaskDocRenderer } from '@/components/doc-renderers/TaskDocRenderer';
import { TicketDocRenderer } from '@/components/doc-renderers/TicketDocRenderer';
import { MeetingDocRenderer } from '@/components/doc-renderers/MeetingDocRenderer';
import { buildInitialComments } from '@/lib/comment-view-models';
import { getDisplayName } from '@/lib/user-display';
import { splitDocumentContent } from '@/lib/document-content';

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
  const resolved = await resolveSpacePath(companySlug, path);
  if (!resolved) notFound();

  // ── Folder view ──────────────────────────────────────────────────────────
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
      adminClient.from('documents').select('id, slug, title, doc_type').eq('folder_id', resolved.folderId).order('title'),
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
                      <Card variant="outlined" sx={{ borderRadius: 2 }}>
                        <CardActionArea component={Link} href={href}>
                          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <FolderIcon sx={{ color: folder.color ?? 'text.secondary', flexShrink: 0 }} />
                            <Typography fontWeight={600} noWrap>{folder.name}</Typography>
                          </CardContent>
                        </CardActionArea>
                      </Card>
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
                  const href = doc.slug ? `${base}/${[...path, doc.slug].join('/')}` : `/docs/${doc.slug}`;
                  return (
                    <Grid key={doc.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                      <Card variant="outlined" sx={{ borderRadius: 2 }}>
                        <CardActionArea component={Link} href={href}>
                          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <DescriptionIcon sx={{ color: 'text.secondary', flexShrink: 0 }} />
                            <Box sx={{ minWidth: 0 }}>
                              <Typography fontWeight={600} noWrap>{doc.title}</Typography>
                              {doc.doc_type && doc.doc_type !== 'md' && (
                                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                                  {doc.doc_type}
                                </Typography>
                              )}
                            </Box>
                          </CardContent>
                        </CardActionArea>
                      </Card>
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
    const editHref = isAdmin ? `/admin/documents/${doc.slug}` : undefined;

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
              <Button component={Link} href={editHref} variant="outlined" size="small"
                startIcon={<EditIcon fontSize="small" />}>
                Edit
              </Button>
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

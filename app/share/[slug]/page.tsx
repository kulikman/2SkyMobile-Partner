import { notFound } from 'next/navigation';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Link from 'next/link';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { DocumentWithComments } from '@/components/DocumentWithComments';
import { buildInitialComments } from '@/lib/comment-view-models';
import { getDisplayName } from '@/lib/user-display';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { withDefaultSharing } from '@/lib/document-sharing';
import { splitDocumentContent } from '@/lib/document-content';
import { DocumentMetaPopover } from '@/components/DocumentMetaPopover';
import { DownloadButtons } from '@/components/DownloadButtons';

export default async function PublicSharePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: shareToken } = await params;
  const supabase = await createClient();
  const adminClient = await createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: baseDocument } = await adminClient
    .from('documents')
    .select('id, slug, title, content, public_share_token')
    .eq('public_share_token', shareToken)
    .single();

  if (!baseDocument) notFound();

  const { data: sharing } = await adminClient
    .from('documents')
    .select('description, image, public_access_enabled, public_comments_visible, anonymous_comments_enabled, public_share_token')
    .eq('id', baseDocument.id)
    .single();

  const document = withDefaultSharing(baseDocument, sharing);
  const parsed = splitDocumentContent(document.content);

  if (!document.public_access_enabled) notFound();

  const { data: rawComments } = document.public_comments_visible
    ? await adminClient
        .from('comments')
        .select('*')
        .eq('document_id', document.id)
        .order('created_at', { ascending: true })
    : { data: [] as never[] };

  const userDirectory = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  const initialComments = buildInitialComments(rawComments ?? [], userDirectory.data.users ?? []);

  const currentUser = user
    ? {
        id: user.id,
        email: user.email ?? '',
        name: getDisplayName({ email: user.email, metadata: user.user_metadata ?? null }),
      }
    : null;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Container maxWidth="xl" sx={{ py: 5 }}>
        <Stack spacing={2} mb={4}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={2}>
            <Box>
              <Typography variant="overline" color="primary.main" fontWeight={700}>
                Public share
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="h3" fontWeight={800}>
                  {document.title}
                </Typography>
                <DocumentMetaPopover metadata={parsed.metadata} />
              </Stack>
            </Box>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Chip label="Read-only link" color="primary" />
              <Chip
                label={document.public_comments_visible ? 'Comments visible' : 'Comments hidden'}
                variant="outlined"
              />
              {document.anonymous_comments_enabled && (
                <Chip label="Anonymous comments on" variant="outlined" />
              )}
              <DownloadButtons title={document.title} content={document.content} slug={document.slug} printPath={`/share/${shareToken}/print`} />
              <Link href="/login" style={{ textDecoration: 'none' }}>
                <Button variant="outlined">Sign in</Button>
              </Link>
            </Stack>
          </Stack>
          <Divider />
        </Stack>

        <Box sx={{ mb: 4 }}>
          {document.image && (
            <Box
              component="img"
              src={document.image}
              alt={document.title}
              sx={{
                width: '100%',
                maxHeight: 420,
                objectFit: 'cover',
                borderRadius: 3,
                mb: document.description ? 2 : 0,
                border: '1px solid rgba(12, 123, 220, 0.12)',
              }}
            />
          )}
          {document.description && (
            <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 920, lineHeight: 1.6 }}>
              {document.description}
            </Typography>
          )}
        </Box>

        {document.public_comments_visible ? (
          <DocumentWithComments
            documentId={document.id}
            content={parsed.body}
            currentUser={currentUser}
            initialComments={initialComments}
            allowCommenting
            allowAnonymous={document.anonymous_comments_enabled}
            publicView
          />
        ) : (
          <Paper
            variant="outlined"
            sx={(theme) => ({
              p: { xs: 2.5, md: 4 },
              borderRadius: '14px',
              bgcolor: 'background.paper',
              boxShadow: '0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04)',
              ...theme.applyStyles('dark', {
                bgcolor: 'background.paper',
              }),
            })}
          >
            <MarkdownRenderer content={parsed.body} />
          </Paper>
        )}
      </Container>
    </Box>
  );
}

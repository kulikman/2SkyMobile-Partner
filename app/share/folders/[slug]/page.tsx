import { notFound } from 'next/navigation';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import { createAdminClient } from '@/lib/supabase/server';
import { FolderPageContent } from '@/components/FolderPageContent';
import type { DocForBoard, FolderForBoard } from '@/components/DocumentBoard';

export default async function PublicFolderSharePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: shareToken } = await params;
  const adminClient = await createAdminClient();

  const { data: rawFolder } = await adminClient
    .from('folders')
    .select('id, name, color, icon, public_share_token, position, parent_id')
    .eq('public_share_token', shareToken)
    .single();

  if (!rawFolder) notFound();

  const [{ data: rawDocs }, { data: rawSubFolders }] = await Promise.all([
    adminClient
      .from('documents')
      .select('*')
      .eq('folder_id', rawFolder.id)
      .order('position', { ascending: true }),
    adminClient
      .from('folders')
      .select('id, name, color, icon, public_share_token, position, parent_id')
      .eq('parent_id', rawFolder.id)
      .order('position', { ascending: true }),
  ]);

  const folder: FolderForBoard = {
    id: rawFolder.id,
    name: rawFolder.name,
    color: rawFolder.color ?? null,
    icon: rawFolder.icon ?? null,
    public_share_token: rawFolder.public_share_token ?? null,
    position: rawFolder.position ?? 0,
    parent_id: rawFolder.parent_id ?? null,
  };

  const subFolders: FolderForBoard[] = (rawSubFolders ?? []).map((item) => ({
    id: item.id,
    name: item.name,
    color: item.color ?? null,
    icon: item.icon ?? null,
    public_share_token: item.public_share_token ?? null,
    position: item.position ?? 0,
    parent_id: item.parent_id ?? null,
  }));

  const docs: DocForBoard[] = (rawDocs ?? []).map((item) => ({
    id: item.id,
    slug: item.slug,
    public_share_token: item.public_share_token ?? null,
    title: item.title,
    content: item.content,
    description: item.description ?? null,
    image: item.image ?? null,
    created_at: item.created_at,
    folder_id: item.folder_id ?? null,
    position: item.position ?? 0,
    card_color: item.card_color ?? null,
    card_icon: item.card_icon ?? null,
    public_access_enabled: item.public_access_enabled ?? false,
    public_comments_visible: item.public_comments_visible ?? false,
    anonymous_comments_enabled: item.anonymous_comments_enabled ?? false,
  }));

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Container maxWidth="xl" sx={{ py: 5 }}>
        <FolderPageContent
          initialFolder={folder}
          initialDocs={docs}
          initialSubFolders={subFolders}
          initialPath={[]}
          isAdmin={false}
          publicView
        />
      </Container>
    </Box>
  );
}

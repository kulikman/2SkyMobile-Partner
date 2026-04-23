import { notFound, redirect } from 'next/navigation';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import FolderIcon from '@mui/icons-material/Folder';
import Link from 'next/link';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { Navbar } from '@/components/Navbar';
import { SpaceBreadcrumbs } from '@/components/SpaceBreadcrumbs';

// Reserved root-level slugs that must never be treated as company slugs
const RESERVED = new Set([
  'login', 'admin', 'projects', 'docs', 'share', 'blueprint',
  'folders', 'api', 'c', '_not-found',
]);

export default async function CompanySpacePage({
  params,
}: {
  params: Promise<{ company: string }>;
}) {
  const { company: companySlug } = await params;
  if (RESERVED.has(companySlug)) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const isAdmin = user.user_metadata?.role === 'admin';
  const adminClient = await createAdminClient();

  const { data: company } = await adminClient
    .from('companies')
    .select('id, name, slug')
    .eq('slug', companySlug)
    .single();
  if (!company) notFound();

  if (!isAdmin) {
    const { data: membership } = await adminClient
      .from('company_members')
      .select('id')
      .eq('company_id', company.id)
      .eq('user_id', user.id)
      .single();
    if (!membership) notFound();
  }

  const { data: folders } = await adminClient
    .from('folders')
    .select('id, name, slug, icon, color, status')
    .eq('company_id', company.id)
    .is('parent_id', null)
    .order('name');

  const items = folders ?? [];
  const base = `/${companySlug}`;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Navbar isAdmin={isAdmin} userId={user.id} />
      <Container maxWidth="lg" sx={{ py: 5 }}>
        <SpaceBreadcrumbs items={[]} current={company.name} />
        <Typography variant="h4" fontWeight={700} sx={{ mt: 2, mb: 4 }}>{company.name}</Typography>

        {items.length === 0 ? (
          <Typography color="text.secondary">No folders yet.</Typography>
        ) : (
          <Grid container spacing={2}>
            {items.map((folder) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const slug = (folder as any).slug;
              const href = slug ? `${base}/${slug}` : `/projects/${folder.id}`;
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
        )}
      </Container>
    </Box>
  );
}

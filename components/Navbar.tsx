'use client';

import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ThemeModeToggle } from '@/components/ThemeModeToggle';
import { NotificationsMenu } from '@/components/NotificationsMenu';

export function Navbar({ isAdmin, userId }: { isAdmin: boolean; userId?: string }) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <Box sx={{ position: 'sticky', top: 0, zIndex: 20, px: { xs: 1.5, md: 2.5 }, pt: 1.5 }}>
      <Paper
        elevation={0}
        variant="outlined"
        sx={[
          (theme) => ({
            px: { xs: 1.5, md: 2.25 },
            py: 1.25,
            borderRadius: '14px',
            bgcolor: 'background.paper',
            backgroundImage: 'none',
            borderColor: theme.palette.divider,
            boxShadow: '0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04)',
          }),
          (theme) =>
            theme.applyStyles('dark', {
              boxShadow: '0 4px 16px rgba(0,0,0,.25)',
            }),
        ]}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={{ xs: 1, md: 2 }}
          alignItems={{ xs: 'stretch', md: 'center' }}
          justifyContent="space-between"
        >
          <Stack direction="row" spacing={1.25} alignItems="center">
            <Box
              component={Link}
              href="/"
              sx={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}
            >
              <Box
                component="img"
                src="/logo.svg"
                alt="2SkyMobile"
                sx={{ height: 48 }}
              />
            </Box>
          </Stack>

          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            justifyContent={{ xs: 'flex-start', md: 'flex-end' }}
            flexWrap="wrap"
            useFlexGap
          >
            <Button
              component={Link}
              href="/"
              size="small"
              variant="text"
              color="inherit"
              sx={{ minWidth: { xs: 'auto', md: 64 }, px: { xs: 1, md: 1.5 } }}
            >
              Projects
            </Button>
            {isAdmin && (
              <>
                <Button
                  component={Link}
                  href="/admin/companies"
                  size="small"
                  variant="text"
                  color="inherit"
                  sx={{ minWidth: { xs: 'auto', md: 64 }, px: { xs: 1, md: 1.5 } }}
                >
                  Companies
                </Button>
                <Button
                  component={Link}
                  href="/admin/users"
                  size="small"
                  variant="text"
                  color="inherit"
                  sx={{ minWidth: { xs: 'auto', md: 64 }, px: { xs: 1, md: 1.5 } }}
                >
                  Admin
                </Button>
              </>
            )}
            {userId && <NotificationsMenu userId={userId} />}
            <ThemeModeToggle />
            <Button
              onClick={handleLogout}
              size="small"
              variant="contained"
              sx={{
                ml: { xs: 0, md: 0.5 },
                px: { xs: 1.5, md: 2 },
              }}
            >
              Log out
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
}

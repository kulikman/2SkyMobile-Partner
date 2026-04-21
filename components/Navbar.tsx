'use client';

import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ThemeModeToggle } from '@/components/ThemeModeToggle';

export function Navbar({ isAdmin }: { isAdmin: boolean }) {
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
          {
            px: { xs: 1.5, md: 2.25 },
            py: 1.25,
            borderRadius: { xs: 3, md: 5 },
            backdropFilter: 'blur(14px)',
            bgcolor: 'rgba(255,255,255,0.82)',
            backgroundImage:
              'linear-gradient(180deg, rgba(255,255,255,0.88) 0%, rgba(244, 249, 255, 0.82) 100%)',
            boxShadow: '0 10px 30px rgba(12, 35, 64, 0.08)',
          },
          (theme) =>
            theme.applyStyles('dark', {
              bgcolor: 'rgba(11, 20, 32, 0.84)',
              backgroundImage:
                'linear-gradient(180deg, rgba(20, 33, 50, 0.96) 0%, rgba(11, 20, 32, 0.92) 100%)',
              boxShadow: '0 14px 36px rgba(0, 0, 0, 0.35)',
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
              component="img"
              src="/td-logo.svg"
              alt="TD logo"
              sx={{ width: 42, height: 42, borderRadius: 1.5 }}
            />
            <Box>
              <Typography
                variant="subtitle1"
                component={Link}
                href="/"
                sx={{ textDecoration: 'none', color: 'text.primary', fontWeight: 800 }}
              >
                Threadoc
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                Project portal
              </Typography>
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
            )}
            <ThemeModeToggle />
            <Button
              onClick={handleLogout}
              size="small"
              variant="contained"
              sx={{
                ml: { xs: 0, md: 0.5 },
                px: { xs: 1.5, md: 2 },
                borderRadius: 2,
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

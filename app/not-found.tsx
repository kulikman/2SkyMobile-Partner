'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Link from 'next/link';

/**
 * Global 404 page.
 * Next.js renders this automatically for any unmatched route.
 */
export default function NotFound() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 3,
        bgcolor: 'background.default',
      }}
    >
      <Box textAlign="center" maxWidth={480}>
        <Typography
          variant="overline"
          color="text.secondary"
          fontWeight={700}
          letterSpacing={2}
        >
          404
        </Typography>
        <Typography variant="h4" fontWeight={700} mt={1} mb={2}>
          Page not found
        </Typography>
        <Typography variant="body1" color="text.secondary" mb={4}>
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </Typography>
        <Button variant="contained" component={Link} href="/">
          Back to home
        </Button>
      </Box>
    </Box>
  );
}

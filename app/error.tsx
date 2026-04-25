'use client';

import { useEffect } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Link from 'next/link';

/**
 * Global error boundary.
 *
 * Catches unhandled errors in the component tree. Next.js renders this
 * automatically when a Server Component or Client Component throws.
 *
 * In production, wire reportError to your error tracking service
 * (Sentry, LogRocket, etc.) to get alerts.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // TODO: Replace with Sentry.captureException(error) or your tracker
    console.error('Unhandled error:', error);
  }, [error]);

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
          color="error"
          fontWeight={700}
          letterSpacing={2}
        >
          Error
        </Typography>
        <Typography variant="h4" fontWeight={700} mt={1} mb={2}>
          Something went wrong
        </Typography>
        <Typography variant="body1" color="text.secondary" mb={1}>
          An unexpected error occurred. You can try again or return to the home page.
        </Typography>
        {error.digest && (
          <Typography
            variant="caption"
            color="text.disabled"
            display="block"
            mb={3}
            sx={{ fontFamily: 'monospace' }}
          >
            Error ID: {error.digest}
          </Typography>
        )}
        <Stack direction="row" spacing={1.5} justifyContent="center" mt={3}>
          <Button variant="contained" onClick={reset}>
            Try again
          </Button>
          <Button variant="outlined" component={Link} href="/">
            Back to home
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}

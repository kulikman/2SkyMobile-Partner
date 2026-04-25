import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';

/**
 * Global loading skeleton.
 * Shown by Next.js while a route segment is loading.
 */
export default function Loading() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        bgcolor: 'background.default',
      }}
    >
      <CircularProgress size={36} />
      <Typography variant="body2" color="text.secondary">
        Loading…
      </Typography>
    </Box>
  );
}

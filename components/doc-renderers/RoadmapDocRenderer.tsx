'use client';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

type RoadmapItem = {
  id?: string;
  title: string;
  description?: string;
  status?: string;
  due_date?: string;
};

type RoadmapMeta = { items?: RoadmapItem[] };

const STATUS_COLORS: Record<string, 'default' | 'warning' | 'info' | 'success' | 'error'> = {
  pending: 'default', in_progress: 'warning', completed: 'success', cancelled: 'error',
};

export function RoadmapDocRenderer({ metadata }: { metadata: RoadmapMeta }) {
  const items = metadata?.items ?? [];
  if (items.length === 0) {
    return <Typography variant="body2" color="text.secondary">No roadmap items defined yet.</Typography>;
  }
  return (
    <Stack spacing={1.5}>
      {items.map((item, idx) => {
        const status = item.status ?? 'pending';
        return (
          <Paper key={item.id ?? idx} variant="outlined" sx={{ borderRadius: 2, p: 2 }}>
            <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body1" fontWeight={600}>{item.title}</Typography>
                {item.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{item.description}</Typography>
                )}
              </Box>
              <Stack direction="row" spacing={1} alignItems="center" flexShrink={0}>
                {item.due_date && (
                  <Typography variant="caption" color="text.secondary">
                    {new Date(item.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Typography>
                )}
                <Chip
                  label={status.replace(/_/g, ' ')} size="small"
                  color={STATUS_COLORS[status] ?? 'default'} variant="outlined"
                  sx={{ textTransform: 'capitalize' }}
                />
              </Stack>
            </Stack>
          </Paper>
        );
      })}
    </Stack>
  );
}

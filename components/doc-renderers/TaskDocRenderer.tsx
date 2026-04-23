'use client';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

type TaskMeta = {
  status?: string;
  priority?: string;
  role?: string;
  type?: string;
  estimated_hours?: number;
  start_date?: string;
  due_date?: string;
  group_label?: string;
};

const STATUS_COLORS: Record<string, string> = {
  backlog: '#9e9e9e', in_progress: '#1976d2',
  ready_for_testing: '#f57c00', approved: '#388e3c', done: '#5c35cc',
};
const PRIORITY_COLORS: Record<string, 'error' | 'warning' | 'default'> = {
  high: 'error', medium: 'warning', low: 'default',
};

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Stack direction="row" spacing={2} alignItems="baseline">
      <Typography variant="caption" color="text.secondary" fontWeight={700}
        sx={{ textTransform: 'uppercase', letterSpacing: '0.08em', minWidth: 110 }}>
        {label}
      </Typography>
      <Box>{value}</Box>
    </Stack>
  );
}

export function TaskDocRenderer({ metadata, bodyHtml }: { metadata: TaskMeta; bodyHtml?: string }) {
  const status = metadata?.status ?? 'backlog';
  const statusColor = STATUS_COLORS[status] ?? '#9e9e9e';
  return (
    <Stack spacing={3}>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Chip label={status.replace(/_/g, ' ')} size="small"
          sx={{ bgcolor: statusColor + '22', color: statusColor, fontWeight: 700, textTransform: 'capitalize', border: `1px solid ${statusColor}44` }} />
        {metadata?.priority && (
          <Chip label={`Priority: ${metadata.priority}`} size="small"
            color={PRIORITY_COLORS[metadata.priority] ?? 'default'} variant="outlined"
            sx={{ textTransform: 'capitalize' }} />
        )}
        {metadata?.group_label && <Chip label={metadata.group_label} size="small" variant="outlined" />}
      </Stack>
      <Stack spacing={1}>
        {metadata?.type && <MetaRow label="Type" value={<Typography variant="body2">{metadata.type}</Typography>} />}
        {metadata?.role && <MetaRow label="Role" value={<Typography variant="body2">{metadata.role}</Typography>} />}
        {metadata?.estimated_hours != null && (
          <MetaRow label="Estimate" value={<Typography variant="body2">{metadata.estimated_hours} h</Typography>} />
        )}
        {metadata?.start_date && (
          <MetaRow label="Start" value={
            <Typography variant="body2">
              {new Date(metadata.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </Typography>
          } />
        )}
        {metadata?.due_date && (
          <MetaRow label="Due" value={
            <Typography variant="body2">
              {new Date(metadata.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </Typography>
          } />
        )}
      </Stack>
      {bodyHtml && (
        <>
          <Divider />
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>{bodyHtml}</Typography>
        </>
      )}
    </Stack>
  );
}

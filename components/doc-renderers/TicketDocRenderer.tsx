'use client';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { createClient } from '@/lib/supabase/client';

type TicketMeta = {
  status?: string;
  priority?: string;
  severity?: string;
  module?: string;
  type?: string;
  url?: string;
  screenshot_path?: string;
  comments?: string;
};

const STATUS_COLORS: Record<string, string> = {
  new: '#6b7280', in_progress: '#f59e0b', on_hold: '#8b5cf6',
  ready_for_testing: '#3b82f6', approved: '#10b981', closed: '#374151',
};
const PRIORITY_COLORS: Record<string, 'error' | 'warning' | 'default' | 'info'> = {
  critical: 'error', high: 'error', medium: 'warning', low: 'default',
};
const SEVERITY_COLORS: Record<string, 'error' | 'warning' | 'default' | 'info'> = {
  critical: 'error', major: 'warning', moderate: 'info', minor: 'default',
};

function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Stack direction="row" spacing={2} alignItems="baseline">
      <Typography variant="caption" color="text.secondary" fontWeight={700}
        sx={{ textTransform: 'uppercase', letterSpacing: '0.08em', minWidth: 90 }}>
        {label}
      </Typography>
      <Box>{value}</Box>
    </Stack>
  );
}

export function TicketDocRenderer({ metadata, body }: { metadata: TicketMeta; body?: string }) {
  const status = metadata?.status ?? 'new';
  const statusColor = STATUS_COLORS[status] ?? '#6b7280';

  async function openScreenshot() {
    if (!metadata?.screenshot_path) return;
    const supabase = createClient();
    const { data } = await supabase.storage
      .from('ticket-screenshots')
      .createSignedUrl(metadata.screenshot_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  }

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Chip label={status.replace(/_/g, ' ')} size="small"
          sx={{ bgcolor: statusColor + '22', color: statusColor, fontWeight: 700, textTransform: 'capitalize', border: `1px solid ${statusColor}44` }} />
        {metadata?.priority && (
          <Chip label={`Priority: ${cap(metadata.priority)}`} size="small"
            color={PRIORITY_COLORS[metadata.priority] ?? 'default'} variant="outlined" />
        )}
        {metadata?.severity && (
          <Chip label={`Severity: ${cap(metadata.severity)}`} size="small"
            color={SEVERITY_COLORS[metadata.severity] ?? 'default'} variant="outlined" />
        )}
      </Stack>
      <Stack spacing={1}>
        {metadata?.module && <MetaRow label="Module" value={<Typography variant="body2">{metadata.module}</Typography>} />}
        {metadata?.type   && <MetaRow label="Type"   value={<Typography variant="body2">{metadata.type}</Typography>} />}
        {metadata?.url    && (
          <MetaRow label="URL" value={
            <Typography variant="body2" component="a" href={metadata.url} target="_blank" rel="noopener noreferrer"
              sx={{ wordBreak: 'break-all' }}>
              {metadata.url}
            </Typography>
          } />
        )}
        {metadata?.screenshot_path && (
          <MetaRow label="Screenshot" value={
            <Typography variant="body2" component="span"
              sx={{ color: 'primary.main', cursor: 'pointer' }} onClick={openScreenshot}>
              View screenshot ↗
            </Typography>
          } />
        )}
      </Stack>
      {body && (
        <>
          <Divider />
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={700}
              sx={{ textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', mb: 1 }}>
              Description
            </Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>{body}</Typography>
          </Box>
        </>
      )}
      {metadata?.comments && (
        <>
          <Divider />
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={700}
              sx={{ textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', mb: 1 }}>
              Comments
            </Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>{metadata.comments}</Typography>
          </Box>
        </>
      )}
    </Stack>
  );
}

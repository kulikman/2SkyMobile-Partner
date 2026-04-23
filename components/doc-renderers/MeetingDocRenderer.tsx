'use client';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import GroupIcon from '@mui/icons-material/Group';
import LocationOnIcon from '@mui/icons-material/LocationOn';

type MeetingMeta = {
  meeting_date?: string;
  participants?: string[];
  location?: string;
  duration_minutes?: number;
};

export function MeetingDocRenderer({ metadata, body }: { metadata: MeetingMeta; body?: string }) {
  const date = metadata?.meeting_date
    ? new Date(metadata.meeting_date + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      })
    : null;

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
        {date && (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <CalendarTodayIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">{date}</Typography>
          </Stack>
        )}
        {metadata?.duration_minutes && (
          <Chip label={`${metadata.duration_minutes} min`} size="small" variant="outlined" />
        )}
        {metadata?.location && (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <LocationOnIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">{metadata.location}</Typography>
          </Stack>
        )}
      </Stack>
      {(metadata?.participants ?? []).length > 0 && (
        <Box>
          <Stack direction="row" spacing={0.5} alignItems="center" mb={1}>
            <GroupIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary" fontWeight={700}
              sx={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Participants
            </Typography>
          </Stack>
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
            {metadata!.participants!.map((p) => (
              <Chip key={p} label={p} size="small" variant="outlined" />
            ))}
          </Stack>
        </Box>
      )}
      {body && (
        <>
          <Divider />
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={700}
              sx={{ textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', mb: 1 }}>
              Summary &amp; Notes
            </Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>{body}</Typography>
          </Box>
        </>
      )}
    </Stack>
  );
}

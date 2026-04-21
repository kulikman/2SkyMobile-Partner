'use client';

import { useMemo, useState } from 'react';
import IconButton from '@mui/material/IconButton';
import Popover from '@mui/material/Popover';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

export function DocumentMetaPopover({ metadata }: { metadata: Record<string, string> }) {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const entries = useMemo(() => Object.entries(metadata), [metadata]);

  if (entries.length === 0) return null;

  return (
    <>
      <IconButton
        size="small"
        onClick={(event) => setAnchorEl(event.currentTarget)}
        aria-label="Document metadata"
      >
        <InfoOutlinedIcon fontSize="small" />
      </IconButton>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        <Stack spacing={1.25} sx={{ p: 2, minWidth: 260, maxWidth: 360 }}>
          <Typography variant="subtitle2" fontWeight={700}>
            Metadata
          </Typography>
          {entries.map(([key, value]) => (
            <Stack key={key} spacing={0.25}>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase' }}>
                {key}
              </Typography>
              <Typography variant="body2">{value}</Typography>
            </Stack>
          ))}
        </Stack>
      </Popover>
    </>
  );
}

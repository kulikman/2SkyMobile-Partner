'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';

type TechSpec = {
  frontend?: string;
  backend?: string;
  mobile?: string;
  database?: string;
  infrastructure?: string;
  servers?: string;
  ci_cd?: string;
  notes?: string;
};

const FIELDS: { key: keyof TechSpec; label: string }[] = [
  { key: 'frontend',       label: 'Frontend' },
  { key: 'backend',        label: 'Backend' },
  { key: 'mobile',         label: 'Mobile' },
  { key: 'database',       label: 'Database' },
  { key: 'infrastructure', label: 'Infrastructure' },
  { key: 'servers',        label: 'Servers' },
  { key: 'ci_cd',          label: 'CI / CD' },
  { key: 'notes',          label: 'Notes' },
];

type Props = {
  folderId: string;
  initialSpec: TechSpec | null;
  isAdmin: boolean;
};

export function TechStackEditor({ folderId, initialSpec, isAdmin }: Props) {
  const [spec, setSpec] = useState<TechSpec>(initialSpec ?? {});
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<TechSpec>({});
  const [saving, setSaving] = useState(false);

  const hasContent = Object.values(spec).some((v) => v?.trim());

  function startEdit() {
    setDraft({ ...spec });
    setEditing(true);
  }

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/folders/${folderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tech_spec: draft }),
    });
    setSaving(false);
    if (res.ok) {
      setSpec(draft);
      setEditing(false);
    }
  }

  if (editing && isAdmin) {
    return (
      <Stack spacing={2}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="subtitle1" fontWeight={700}>Tech Stack & Infrastructure</Typography>
          <Stack direction="row" spacing={1}>
            <Button size="small" onClick={() => setEditing(false)}>Cancel</Button>
            <Button
              size="small"
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </Stack>
        </Stack>
        <Grid container spacing={2}>
          {FIELDS.map(({ key, label }) => (
            <Grid key={key} size={{ xs: 12, sm: key === 'notes' ? 12 : 6 }}>
              <TextField
                label={label}
                value={draft[key] ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                fullWidth
                multiline={key === 'notes'}
                rows={key === 'notes' ? 3 : 1}
                size="small"
                placeholder={key === 'notes' ? 'Additional notes…' : `e.g. React Native, Node.js…`}
              />
            </Grid>
          ))}
        </Grid>
      </Stack>
    );
  }

  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="subtitle1" fontWeight={700}>Tech Stack & Infrastructure</Typography>
        {isAdmin && (
          <Button size="small" startIcon={<EditIcon />} onClick={startEdit}>Edit</Button>
        )}
      </Stack>

      {!hasContent ? (
        <Typography variant="body2" color="text.secondary">
          {isAdmin ? 'No tech stack defined. Click Edit to add details.' : 'Tech stack not specified yet.'}
        </Typography>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
            gap: 2,
          }}
        >
          {FIELDS.filter(({ key }) => spec[key]?.trim()).map(({ key, label }) => (
            <Box key={key} sx={key === 'notes' ? { gridColumn: '1 / -1' } : {}}>
              <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {label}
              </Typography>
              {key === 'notes' ? (
                <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
                  {spec[key]}
                </Typography>
              ) : (
                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap mt={0.5}>
                  {spec[key]!.split(/[,;]/).map((item) => item.trim()).filter(Boolean).map((item) => (
                    <Chip key={item} label={item} size="small" variant="outlined" />
                  ))}
                </Stack>
              )}
              <Divider sx={{ mt: 1.5 }} />
            </Box>
          ))}
        </Box>
      )}
    </Stack>
  );
}

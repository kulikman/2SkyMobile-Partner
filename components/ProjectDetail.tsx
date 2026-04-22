'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import EditIcon from '@mui/icons-material/Edit';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import { ProjectChat } from './ProjectChat';

export type ProjectData = {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  status: string;
  progress: number;
  client_name: string | null;
  company_id: string | null;
  started_at: string | null;
  deadline_at: string | null;
  stage_url: string | null;
};

type Company = { id: string; name: string };
type CurrentUser = { id: string; email: string; name: string };

const statusLabels: Record<string, string> = {
  in_progress: 'In progress',
  in_discussion: 'In discussion',
  completed: 'Completed',
  archived: 'Archived',
};

const statusColors: Record<string, 'success' | 'warning' | 'info' | 'default'> = {
  in_progress: 'success',
  in_discussion: 'warning',
  completed: 'info',
  archived: 'default',
};

export function ProjectDetail({
  project: initialProject,
  companies,
  currentUser,
  isAdmin,
}: {
  project: ProjectData;
  companies: Company[];
  currentUser: CurrentUser;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [project, setProject] = useState(initialProject);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCompanyId, setEditCompanyId] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editStartedAt, setEditStartedAt] = useState('');
  const [editDeadlineAt, setEditDeadlineAt] = useState('');
  const [editStageUrl, setEditStageUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');

  function openEdit() {
    setEditName(project.name);
    setEditCompanyId(project.company_id ?? '');
    setEditStatus(project.status);
    setEditStartedAt(project.started_at?.slice(0, 10) ?? '');
    setEditDeadlineAt(project.deadline_at?.slice(0, 10) ?? '');
    setEditStageUrl(project.stage_url ?? '');
    setEditError('');
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!editName.trim()) return;
    setSaving(true);
    setEditError('');
    const res = await fetch(`/api/folders/${project.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editName.trim(),
        company_id: editCompanyId || null,
        client_name: companies.find((c) => c.id === editCompanyId)?.name ?? null,
        status: editStatus,
        started_at: editStartedAt || null,
        deadline_at: editDeadlineAt || null,
        stage_url: editStageUrl.trim() || null,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setEditError(data.error ?? 'Save failed'); return; }
    setProject((prev) => ({
      ...prev,
      name: data.name,
      client_name: data.client_name ?? null,
      company_id: data.company_id ?? null,
      status: data.status ?? prev.status,
      started_at: data.started_at ?? null,
      deadline_at: data.deadline_at ?? null,
      stage_url: data.stage_url ?? prev.stage_url,
    }));
    setEditOpen(false);
    router.refresh();
  }

  return (
    <Box>
      {/* Header */}
      <Stack spacing={1} mb={project.stage_url ? 3 : 4}>
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="h4" fontWeight={800}>{project.name}</Typography>
          <Chip
            label={statusLabels[project.status] ?? project.status}
            color={statusColors[project.status] ?? 'default'}
            size="small"
          />
          {isAdmin && (
            <IconButton size="small" onClick={openEdit} title="Edit project">
              <EditIcon fontSize="small" />
            </IconButton>
          )}
        </Stack>

        {project.client_name && (
          <Typography variant="body1" color="text.secondary">
            Client: {project.client_name}
          </Typography>
        )}

        {(project.started_at || project.deadline_at) && (
          <Stack direction="row" spacing={2}>
            {project.started_at && (
              <Typography variant="body2" color="text.secondary">
                Started: {new Date(project.started_at).toLocaleDateString('en-US')}
              </Typography>
            )}
            {project.deadline_at && (
              <Typography variant="body2" color="text.secondary">
                Deadline: {new Date(project.deadline_at).toLocaleDateString('en-US')}
              </Typography>
            )}
          </Stack>
        )}
      </Stack>

      {/* Test environment banner — visible to everyone when set */}
      {project.stage_url && (
        <Paper
          variant="outlined"
          sx={[
            {
              mb: 3,
              px: 3,
              py: 2,
              borderRadius: 3,
              borderColor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
              flexWrap: 'wrap',
            },
            (theme) => ({
              bgcolor: theme.palette.mode === 'dark'
                ? 'rgba(37,65,104,0.18)'
                : 'rgba(37,65,104,0.05)',
            }),
          ]}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <RocketLaunchIcon color="primary" />
            <Box>
              <Typography variant="subtitle2" fontWeight={700}>
                Test environment is ready
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Open the link and go through the scenarios from the Tasks tab
              </Typography>
            </Box>
          </Stack>
          <Button
            variant="contained"
            href={project.stage_url}
            target="_blank"
            rel="noopener noreferrer"
            endIcon={<OpenInNewIcon fontSize="small" />}
            sx={{ flexShrink: 0 }}
          >
            Open test environment
          </Button>
        </Paper>
      )}

      {/* Chat FAB */}
      <ProjectChat folderId={project.id} currentUser={currentUser} />

      {/* Edit dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>Edit project</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField
              label="Project name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              fullWidth
              autoFocus
            />
            <TextField
              label="Company"
              select
              value={editCompanyId}
              onChange={(e) => setEditCompanyId(e.target.value)}
              fullWidth
            >
              <MenuItem value="">— No company —</MenuItem>
              {companies.map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Status"
              select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value)}
              fullWidth
            >
              <MenuItem value="in_discussion">In discussion</MenuItem>
              <MenuItem value="in_progress">In progress</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="archived">Archived</MenuItem>
            </TextField>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Start date"
                type="date"
                value={editStartedAt}
                onChange={(e) => setEditStartedAt(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                fullWidth
              />
              <TextField
                label="Deadline"
                type="date"
                value={editDeadlineAt}
                onChange={(e) => setEditDeadlineAt(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                fullWidth
              />
            </Stack>
            <TextField
              label="Test environment URL"
              placeholder="https://staging.example.com"
              value={editStageUrl}
              onChange={(e) => setEditStageUrl(e.target.value)}
              fullWidth
              helperText="Partners will see a prominent button to open it"
            />
            {editError && (
              <Typography variant="caption" color="error">{editError}</Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setEditOpen(false)} disabled={saving}>Cancel</Button>
          <Button
            variant="contained"
            onClick={saveEdit}
            disabled={saving || !editName.trim()}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

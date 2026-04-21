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
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import Slider from '@mui/material/Slider';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import EditIcon from '@mui/icons-material/Edit';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { RoadmapView } from './RoadmapView';
import { ReportList } from './ReportList';
import { ProjectChat } from './ProjectChat';
import type { RoadmapItem } from './RoadmapView';
import type { ReportDoc } from './ReportList';

export type ProjectData = {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  status: string;
  progress: number;
  client_name: string | null;
  started_at: string | null;
  deadline_at: string | null;
  stage_url: string | null;
};

type CurrentUser = {
  id: string;
  email: string;
  name: string;
};

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
  roadmapItems,
  reports,
  currentUser,
  isAdmin,
}: {
  project: ProjectData;
  roadmapItems: RoadmapItem[];
  reports: ReportDoc[];
  currentUser: CurrentUser;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [project, setProject] = useState(initialProject);

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editClientName, setEditClientName] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editProgress, setEditProgress] = useState(0);
  const [editStartedAt, setEditStartedAt] = useState('');
  const [editDeadlineAt, setEditDeadlineAt] = useState('');
  const [editStageUrl, setEditStageUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');

  function openEdit() {
    setEditName(project.name);
    setEditClientName(project.client_name ?? '');
    setEditStatus(project.status);
    setEditProgress(project.progress);
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
        client_name: editClientName.trim() || null,
        status: editStatus,
        progress: editProgress,
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
      status: data.status ?? prev.status,
      progress: data.progress ?? prev.progress,
      started_at: data.started_at ?? null,
      deadline_at: data.deadline_at ?? null,
      stage_url: data.stage_url ?? null,
    }));
    setEditOpen(false);
    router.refresh();
  }

  const isInProgress = project.status === 'in_progress';

  return (
    <Box>
      {/* Project header */}
      <Stack spacing={1.5} mb={4}>
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="h4" fontWeight={800}>
            {project.name}
          </Typography>
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

        {isInProgress && (
          <Box sx={{ maxWidth: 400 }}>
            <Stack direction="row" justifyContent="space-between" mb={0.5}>
              <Typography variant="body2" color="text.secondary">
                Overall progress
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {project.progress}%
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={project.progress}
              sx={{ borderRadius: 2, height: 8 }}
            />
          </Box>
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

        {project.stage_url && (
          <Box>
            <Button
              variant="outlined"
              size="small"
              href={project.stage_url}
              target="_blank"
              rel="noopener noreferrer"
              endIcon={<OpenInNewIcon fontSize="small" />}
              sx={{ textTransform: 'none' }}
            >
              Open Stage Environment
            </Button>
          </Box>
        )}
      </Stack>

      {/* Roadmap section - only for in-progress projects */}
      {isInProgress && (
        <>
          <RoadmapView items={roadmapItems} folderId={project.id} isAdmin={isAdmin} />
          <Divider sx={{ my: 4 }} />
        </>
      )}

      {/* Reports section */}
      <ReportList reports={reports} folderId={project.id} isAdmin={isAdmin} />

      {/* Chat FAB + Drawer */}
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
              label="Client name"
              value={editClientName}
              onChange={(e) => setEditClientName(e.target.value)}
              fullWidth
            />
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
            <Box>
              <Typography variant="body2" gutterBottom>
                Progress: {editProgress}%
              </Typography>
              <Slider
                value={editProgress}
                onChange={(_, v) => setEditProgress(v as number)}
                min={0}
                max={100}
                step={5}
              />
            </Box>
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
              label="Stage URL"
              placeholder="https://staging.example.com"
              value={editStageUrl}
              onChange={(e) => setEditStageUrl(e.target.value)}
              fullWidth
              helperText="Link to the staging / test environment"
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

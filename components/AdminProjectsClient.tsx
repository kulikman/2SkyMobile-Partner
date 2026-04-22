'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
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
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import FolderOffIcon from '@mui/icons-material/FolderOff';

type Project = {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  status: string;
  progress: number;
  client_name: string | null;
  started_at: string | null;
  deadline_at: string | null;
  position: number;
  company_id: string | null;
};

type Company = {
  id: string;
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

export function AdminProjectsClient({
  initialProjects,
  companies,
}: {
  initialProjects: Project[];
  companies: Company[];
}) {
  const [projects, setProjects] = useState(initialProjects);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCompanyId, setNewCompanyId] = useState('');
  const [newStatus, setNewStatus] = useState('in_discussion');
  const [creating, setCreating] = useState(false);

  // Edit dialog
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [editName, setEditName] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editStartedAt, setEditStartedAt] = useState('');
  const [editDeadlineAt, setEditDeadlineAt] = useState('');
  const [editCompanyId, setEditCompanyId] = useState<string>('');
  const [saving, setSaving] = useState(false);

  function openEdit(p: Project) {
    setEditProject(p);
    setEditName(p.name);
    setEditStatus(p.status);
    setEditStartedAt(p.started_at?.split('T')[0] ?? '');
    setEditDeadlineAt(p.deadline_at?.split('T')[0] ?? '');
    setEditCompanyId(p.company_id ?? '');
  }

  async function createProject() {
    if (!newName.trim()) return;
    setCreating(true);
    const res = await fetch('/api/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newName.trim(),
        status: newStatus,
        company_id: newCompanyId || null,
        client_name: companies.find((c) => c.id === newCompanyId)?.name ?? null,
        position: projects.length,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setProjects((prev) => [...prev, {
        id: data.id,
        name: data.name,
        color: data.color ?? null,
        icon: data.icon ?? null,
        status: data.status ?? 'in_discussion',
        progress: data.progress ?? 0,
        client_name: data.client_name ?? null,
        started_at: data.started_at ?? null,
        deadline_at: data.deadline_at ?? null,
        position: data.position ?? 0,
        company_id: data.company_id ?? null,
      }]);
      setCreateOpen(false);
      setNewName('');
      setNewCompanyId('');
      setNewStatus('in_discussion');
    }
    setCreating(false);
  }

  async function saveEdit() {
    if (!editProject) return;
    setSaving(true);
    const res = await fetch(`/api/folders/${editProject.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editName.trim(),
        client_name: companies.find((c) => c.id === editCompanyId)?.name ?? null,
        status: editStatus,
        started_at: editStartedAt || null,
        deadline_at: editDeadlineAt || null,
        company_id: editCompanyId || null,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setProjects((prev) =>
        prev.map((p) =>
          p.id === editProject.id
            ? {
                ...p,
                name: data.name,
                client_name: data.client_name ?? null,
                status: data.status ?? p.status,
                started_at: data.started_at ?? null,
                deadline_at: data.deadline_at ?? null,
                company_id: data.company_id ?? null,
              }
            : p,
        ),
      );
      setEditProject(null);
    }
    setSaving(false);
  }

  async function deleteProject(id: string) {
    const res = await fetch(`/api/folders/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setProjects((prev) => prev.filter((p) => p.id !== id));
    }
  }

  // Group projects by company
  const grouped: { company: Company | null; projects: Project[] }[] = [];
  for (const company of companies) {
    const companyProjects = projects.filter((p) => p.company_id === company.id);
    if (companyProjects.length > 0) {
      grouped.push({ company, projects: companyProjects });
    }
  }
  const unassigned = projects.filter((p) => !p.company_id);

  return (
    <Stack spacing={4}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <div>
          <Typography variant="h5" fontWeight={700}>Projects</Typography>
          <Typography variant="body2" color="text.secondary">{projects.length} total</Typography>
        </div>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
          New project
        </Button>
      </Stack>

      {grouped.map(({ company, projects: cProjects }) => (
        <Box key={company!.id}>
          <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
            <Typography variant="subtitle1" fontWeight={700} color="primary">
              {company!.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {cProjects.length} project{cProjects.length !== 1 ? 's' : ''}
            </Typography>
          </Stack>
          <Stack spacing={1.5}>
            {cProjects.map((p) => <ProjectRow key={p.id} p={p} onEdit={openEdit} onDelete={deleteProject} />)}
          </Stack>
        </Box>
      ))}

      {unassigned.length > 0 && (
        <Box>
          <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
            <FolderOffIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            <Typography variant="subtitle1" fontWeight={700} color="text.secondary">No company</Typography>
            <Typography variant="caption" color="text.secondary">
              {unassigned.length} project{unassigned.length !== 1 ? 's' : ''}
            </Typography>
          </Stack>
          <Stack spacing={1.5}>
            {unassigned.map((p) => <ProjectRow key={p.id} p={p} onEdit={openEdit} onDelete={deleteProject} />)}
          </Stack>
        </Box>
      )}

      {projects.length === 0 && (
        <Paper variant="outlined" sx={{ p: 6, textAlign: 'center', borderRadius: 3 }}>
          <Typography color="text.secondary">No projects yet. Create one to get started.</Typography>
        </Paper>
      )}

      {/* Create Project Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>New project</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Project name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              fullWidth
              autoFocus
            />
            <TextField
              label="Company"
              select
              value={newCompanyId}
              onChange={(e) => setNewCompanyId(e.target.value)}
              fullWidth
              helperText="The client company this project belongs to"
            >
              <MenuItem value="">— No company —</MenuItem>
              {companies.map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Status"
              select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              fullWidth
            >
              <MenuItem value="in_discussion">In discussion</MenuItem>
              <MenuItem value="in_progress">In progress</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={creating || !newName.trim()} onClick={createProject}>
            {creating ? 'Creating…' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Project Dialog */}
      <Dialog open={Boolean(editProject)} onClose={() => setEditProject(null)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>Edit project</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              fullWidth
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
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditProject(null)}>Cancel</Button>
          <Button variant="contained" disabled={saving || !editName.trim()} onClick={saveEdit}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

function ProjectRow({
  p,
  onEdit,
  onDelete,
}: {
  p: Project;
  onEdit: (p: Project) => void;
  onDelete: (id: string) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <>
      <Paper variant="outlined" sx={{ borderRadius: 2 }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ px: 2.5, py: 1.5 }}
          flexWrap="wrap"
          useFlexGap
          gap={1}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Typography variant="body1" fontWeight={600}>{p.name}</Typography>
            <Chip
              label={statusLabels[p.status] ?? p.status}
              size="small"
              color={statusColors[p.status] ?? 'default'}
              variant="outlined"
            />
          </Stack>
          <Stack direction="row" spacing={0.5} alignItems="center">
            {p.deadline_at && (
              <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                Due {new Date(p.deadline_at).toLocaleDateString()}
              </Typography>
            )}
            <IconButton size="small" onClick={() => onEdit(p)} title="Edit">
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" color="error" onClick={() => setConfirmDelete(true)} title="Delete">
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>
      </Paper>

      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700}>Delete project?</DialogTitle>
        <DialogContent>
          <Typography>
            <strong>{p.name}</strong> will be permanently deleted.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmDelete(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={() => { onDelete(p.id); setConfirmDelete(false); }}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

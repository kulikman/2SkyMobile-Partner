'use client';

import { useState } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Slider from '@mui/material/Slider';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';

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

type UserInfo = {
  id: string;
  email: string;
  role: string;
};

type Membership = {
  id: string;
  folder_id: string;
  user_id: string;
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
  allUsers,
  initialMemberships,
  companies,
}: {
  initialProjects: Project[];
  allUsers: UserInfo[];
  initialMemberships: Membership[];
  companies: Company[];
}) {
  const [projects, setProjects] = useState(initialProjects);
  const [memberships, setMemberships] = useState(initialMemberships);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [newStatus, setNewStatus] = useState('in_discussion');
  const [creating, setCreating] = useState(false);

  // Edit dialog
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [editName, setEditName] = useState('');
  const [editClientName, setEditClientName] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editProgress, setEditProgress] = useState(0);
  const [editStartedAt, setEditStartedAt] = useState('');
  const [editDeadlineAt, setEditDeadlineAt] = useState('');
  const [editCompanyId, setEditCompanyId] = useState<string>('');
  const [editStageUrl, setEditStageUrl] = useState('');
  const [saving, setSaving] = useState(false);

  // Member dialog
  const [memberProject, setMemberProject] = useState<Project | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserInfo | null>(null);

  function openEdit(p: Project) {
    setEditProject(p);
    setEditName(p.name);
    setEditClientName(p.client_name ?? '');
    setEditStatus(p.status);
    setEditProgress(p.progress);
    setEditStartedAt(p.started_at?.split('T')[0] ?? '');
    setEditDeadlineAt(p.deadline_at?.split('T')[0] ?? '');
    setEditCompanyId(p.company_id ?? '');
    setEditStageUrl((p as Record<string, unknown>).stage_url as string ?? '');
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
        client_name: newClientName.trim() || null,
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
      setNewClientName('');
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
        client_name: editClientName.trim() || null,
        status: editStatus,
        progress: editProgress,
        started_at: editStartedAt || null,
        deadline_at: editDeadlineAt || null,
        company_id: editCompanyId || null,
        stage_url: editStageUrl.trim() || null,
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
                progress: data.progress ?? p.progress,
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

  async function addMember(projectId: string, userId: string) {
    const res = await fetch(`/api/projects/${projectId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    if (res.ok) {
      const data = await res.json();
      setMemberships((prev) => [...prev, { id: data.id, folder_id: data.folder_id, user_id: data.user_id }]);
      setSelectedUser(null);
    }
  }

  async function removeMember(projectId: string, userId: string) {
    const res = await fetch(`/api/projects/${projectId}/members/${userId}`, { method: 'DELETE' });
    if (res.ok) {
      setMemberships((prev) => prev.filter((m) => !(m.folder_id === projectId && m.user_id === userId)));
    }
  }

  function getProjectMembers(projectId: string) {
    return memberships
      .filter((m) => m.folder_id === projectId)
      .map((m) => allUsers.find((u) => u.id === m.user_id))
      .filter(Boolean) as UserInfo[];
  }

  function getAvailableUsers(projectId: string) {
    const memberIds = new Set(memberships.filter((m) => m.folder_id === projectId).map((m) => m.user_id));
    return allUsers.filter((u) => !memberIds.has(u.id));
  }

  return (
    <Stack spacing={4}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <div>
          <Typography variant="h5" fontWeight={700}>
            Manage projects
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {projects.length} projects
          </Typography>
        </div>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
          New project
        </Button>
      </Stack>

      {projects.map((p) => {
        const members = getProjectMembers(p.id);
        return (
          <Paper key={p.id} variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ px: 3, py: 2 }}
              flexWrap="wrap"
              useFlexGap
              gap={1}
            >
              <Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="subtitle1" fontWeight={700}>
                    {p.name}
                  </Typography>
                  <Chip
                    label={statusLabels[p.status] ?? p.status}
                    size="small"
                    color={statusColors[p.status] ?? 'default'}
                    variant="outlined"
                  />
                  {p.status === 'in_progress' && (
                    <Chip label={`${p.progress}%`} size="small" variant="outlined" />
                  )}
                </Stack>
                <Stack direction="row" spacing={1.5} mt={0.5} flexWrap="wrap" useFlexGap>
                  {p.client_name && (
                    <Typography variant="caption" color="text.secondary">
                      Client: {p.client_name}
                    </Typography>
                  )}
                  {p.company_id && (
                    <Typography variant="caption" color="primary.main">
                      {companies.find((c) => c.id === p.company_id)?.name ?? ''}
                    </Typography>
                  )}
                </Stack>
              </Box>
              <Stack direction="row" spacing={0.5}>
                <IconButton size="small" onClick={() => setMemberProject(p)} title="Members">
                  <PersonAddIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={() => openEdit(p)} title="Edit">
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" color="error" onClick={() => deleteProject(p.id)} title="Delete">
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Stack>
            </Stack>

            {members.length > 0 && (
              <>
                <Divider />
                <Box sx={{ px: 3, py: 1.5 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                    Members:
                  </Typography>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                    {members.map((u) => (
                      <Chip
                        key={u.id}
                        label={u.email}
                        size="small"
                        onDelete={() => removeMember(p.id, u.id)}
                      />
                    ))}
                  </Stack>
                </Box>
              </>
            )}
          </Paper>
        );
      })}

      {/* Create Project Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New project</DialogTitle>
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
              label="Client name"
              value={newClientName}
              onChange={(e) => setNewClientName(e.target.value)}
              fullWidth
            />
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
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={creating || !newName.trim()} onClick={createProject}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Project Dialog */}
      <Dialog open={Boolean(editProject)} onClose={() => setEditProject(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit project</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              fullWidth
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
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditProject(null)}>Cancel</Button>
          <Button variant="contained" disabled={saving || !editName.trim()} onClick={saveEdit}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Member Management Dialog */}
      <Dialog open={Boolean(memberProject)} onClose={() => setMemberProject(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Members: {memberProject?.name}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Autocomplete
              options={memberProject ? getAvailableUsers(memberProject.id) : []}
              getOptionLabel={(u) => u.email}
              value={selectedUser}
              onChange={(_, v) => setSelectedUser(v)}
              renderInput={(params) => <TextField {...params} label="Add user" size="small" />}
            />
            <Button
              variant="contained"
              size="small"
              startIcon={<PersonAddIcon />}
              disabled={!selectedUser || !memberProject}
              onClick={() => {
                if (selectedUser && memberProject) addMember(memberProject.id, selectedUser.id);
              }}
            >
              Add
            </Button>

            <Divider />

            <Typography variant="subtitle2">Current members:</Typography>
            {memberProject && getProjectMembers(memberProject.id).length === 0 && (
              <Typography variant="body2" color="text.secondary">
                No members
              </Typography>
            )}
            {memberProject &&
              getProjectMembers(memberProject.id).map((u) => (
                <Stack key={u.id} direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2">{u.email}</Typography>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => removeMember(memberProject.id, u.id)}
                  >
                    <PersonRemoveIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMemberProject(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

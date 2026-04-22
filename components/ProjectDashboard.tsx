'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import FolderIcon from '@mui/icons-material/Folder';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export type ProjectForDashboard = {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  status: string;
  progress: number;
  client_name: string | null;
  started_at: string | null;
  deadline_at: string | null;
  company_id: string | null;
};

type Company = { id: string; name: string };

function ProjectCard({ project }: { project: ProjectForDashboard }) {
  const isInProgress = project.status === 'in_progress';

  return (
    <Card
      variant="outlined"
      sx={[
        {
          borderRadius: 4,
          transition: 'border-color 0.2s, box-shadow 0.2s',
          '&:hover': { borderColor: 'primary.main', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' },
        },
        (theme) =>
          theme.applyStyles('dark', {
            '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.3)' },
          }),
      ]}
    >
      <CardActionArea component={Link} href={`/projects/${project.id}`}>
        <CardContent sx={{ p: 2.5 }}>
          <Stack direction="row" spacing={1.5} alignItems="center" mb={1.5}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                bgcolor: project.color ?? 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FolderIcon sx={{ color: 'white', fontSize: 22 }} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle1" fontWeight={700} noWrap>
                {project.name}
              </Typography>
              {project.client_name && (
                <Typography variant="caption" color="text.secondary">
                  {project.client_name}
                </Typography>
              )}
            </Box>
          </Stack>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip
              label={isInProgress ? 'In progress' : 'In discussion'}
              size="small"
              color={isInProgress ? 'success' : 'warning'}
              variant="outlined"
            />
            {project.deadline_at && (
              <Chip
                label={`Deadline: ${new Date(project.deadline_at).toLocaleDateString('en-US')}`}
                size="small"
                variant="outlined"
              />
            )}
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export function ProjectDashboard({
  projects: initialProjects,
  isAdmin,
  companies = [],
}: {
  projects: ProjectForDashboard[];
  isAdmin: boolean;
  companies?: Company[];
}) {
  const router = useRouter();
  const [projects, setProjects] = useState(initialProjects);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCompanyId, setNewCompanyId] = useState('');
  const [newStatus, setNewStatus] = useState('in_discussion');
  const [creating, setCreating] = useState(false);

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
        id: data.id, name: data.name, color: data.color ?? null, icon: data.icon ?? null,
        status: data.status ?? 'in_discussion', progress: 0,
        client_name: data.client_name ?? null, started_at: null, deadline_at: null,
        company_id: data.company_id ?? (newCompanyId || null),
      }]);
      setCreateOpen(false);
      setNewName(''); setNewCompanyId(''); setNewStatus('in_discussion');
      router.refresh();
    }
    setCreating(false);
  }

  // Group by company: use companies list order, then "no company" at end
  const grouped: { label: string; logoInitials: string; projects: ProjectForDashboard[] }[] = [];

  if (companies.length > 0) {
    for (const c of companies) {
      const cp = projects.filter((p) => p.company_id === c.id);
      if (cp.length > 0) grouped.push({ label: c.name, logoInitials: c.name.slice(0, 2).toUpperCase(), projects: cp });
    }
    const unassigned = projects.filter((p) => !p.company_id);
    if (unassigned.length > 0) grouped.push({ label: 'No company', logoInitials: '—', projects: unassigned });
  } else {
    // Partner view: no companies passed, show all as one group using client_name
    const byClient: Record<string, ProjectForDashboard[]> = {};
    for (const p of projects) {
      const key = p.client_name ?? '';
      if (!byClient[key]) byClient[key] = [];
      byClient[key].push(p);
    }
    for (const [label, ps] of Object.entries(byClient)) {
      grouped.push({ label: label || 'Projects', logoInitials: label.slice(0, 2).toUpperCase() || '—', projects: ps });
    }
  }

  const gridCols = { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' };

  return (
    <Stack spacing={5}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          {projects.length} project{projects.length !== 1 ? 's' : ''}
        </Typography>
        {isAdmin && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
            New project
          </Button>
        )}
      </Box>

      {/* Create dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>New project</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Project name" value={newName} onChange={(e) => setNewName(e.target.value)} fullWidth autoFocus />
            {companies.length > 0 && (
              <TextField label="Company" select value={newCompanyId} onChange={(e) => setNewCompanyId(e.target.value)} fullWidth>
                <MenuItem value="">— No company —</MenuItem>
                {companies.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
              </TextField>
            )}
            <TextField label="Status" select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} fullWidth>
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

      {grouped.map(({ label, logoInitials, projects: gProjects }) => (
        <Box key={label}>
          <Stack direction="row" spacing={1.5} alignItems="center" mb={2}>
            <Box sx={{
              width: 32, height: 32, borderRadius: 1.5, bgcolor: 'primary.main',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Typography variant="caption" color="white" fontWeight={700} fontSize={11}>
                {logoInitials}
              </Typography>
            </Box>
            <Typography variant="h6" fontWeight={700}>{label}</Typography>
            <Typography variant="caption" color="text.secondary">
              {gProjects.length} project{gProjects.length !== 1 ? 's' : ''}
            </Typography>
          </Stack>
          <Box sx={{ display: 'grid', gridTemplateColumns: gridCols, gap: 2 }}>
            {gProjects.map((p) => <ProjectCard key={p.id} project={p} />)}
          </Box>
        </Box>
      ))}

      {projects.length === 0 && (
        <Typography variant="body1" color="text.secondary" textAlign="center" py={8}>
          No projects available.
        </Typography>
      )}
    </Stack>
  );
}

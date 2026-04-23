'use client';

import { useMemo, useState } from 'react';
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
import Divider from '@mui/material/Divider';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import BusinessIcon from '@mui/icons-material/Business';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export type ProjectForDashboard = {
  id: string;
  href: string;
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

export type CompanyForDashboard = {
  id: string;
  name: string;
  slug: string | null;
  color: string | null;
  logo_url?: string | null;
};

const STATUS_MAP: Record<string, { label: string; hex: string }> = {
  in_progress:   { label: 'In progress',   hex: '#16a34a' },
  in_discussion: { label: 'In discussion', hex: '#d97706' },
  on_hold:       { label: 'On hold',       hex: '#7c3aed' },
  completed:     { label: 'Completed',     hex: '#6b7280' },
  cancelled:     { label: 'Cancelled',     hex: '#dc2626' },
};

function ProjectCard({ project }: { project: ProjectForDashboard }) {
  const status = STATUS_MAP[project.status] ?? { label: project.status, hex: '#6b7280' };
  const accent = project.color ?? '#1976d2';

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2,
        borderLeft: `3px solid ${accent}`,
        transition: 'box-shadow 0.15s',
        '&:hover': { boxShadow: `0 2px 12px ${accent}33` },
      }}
    >
      <CardActionArea component={Link} href={project.href}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Typography
            variant="body2"
            fontWeight={700}
            sx={{ mb: 1.25, lineHeight: 1.35, wordBreak: 'break-word' }}
          >
            {project.name}
          </Typography>

          {project.progress > 0 && (
            <Box sx={{ mb: 1.25 }}>
              <Stack direction="row" justifyContent="space-between" mb={0.4}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>Progress</Typography>
                <Typography variant="caption" fontWeight={700} sx={{ fontSize: 11 }}>{project.progress}%</Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={project.progress}
                sx={{
                  height: 4, borderRadius: 2,
                  bgcolor: `${accent}22`,
                  '& .MuiLinearProgress-bar': { bgcolor: accent, borderRadius: 2 },
                }}
              />
            </Box>
          )}

          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap alignItems="center">
            <Box sx={{
              display: 'inline-flex', alignItems: 'center',
              px: 0.75, py: 0.2, borderRadius: 1,
              bgcolor: status.hex + '18', border: `1px solid ${status.hex}44`,
            }}>
              <Typography sx={{ fontSize: 11, fontWeight: 600, color: status.hex, lineHeight: 1.4 }}>
                {status.label}
              </Typography>
            </Box>
            {project.deadline_at && (
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                Due {new Date(project.deadline_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </Typography>
            )}
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

function CompanySection({
  company,
  projects,
}: {
  company: CompanyForDashboard;
  projects: ProjectForDashboard[];
}) {
  const accent = company.color ?? '#1976d2';
  const initials = company.name.slice(0, 2).toUpperCase();
  const spaceHref = company.slug ? `/c/${company.slug}` : null;
  const activeCount = projects.filter((p) =>
    ['in_progress', 'in_discussion', 'on_hold'].includes(p.status)
  ).length;

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1.5} mb={2}>
        <Box sx={{
          width: 34, height: 34, borderRadius: 1.5, bgcolor: accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          overflow: 'hidden',
        }}>
          {company.logo_url ? (
            <Box
              component="img"
              src={company.logo_url}
              alt={company.name}
              sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <Typography sx={{ color: 'white', fontWeight: 800, fontSize: 12, letterSpacing: 0.5 }}>
              {initials}
            </Typography>
          )}
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
            <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>
              {company.name}
            </Typography>
            <Chip
              label={`${activeCount} active`}
              size="small"
              sx={{
                fontSize: 11, height: 20,
                bgcolor: accent + '18', color: accent,
                fontWeight: 600, border: `1px solid ${accent}33`,
              }}
            />
          </Stack>
        </Box>

        {spaceHref && (
          <Button
            component={Link}
            href={spaceHref}
            size="small"
            endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
            sx={{ color: 'text.secondary', fontSize: 12, textTransform: 'none', flexShrink: 0 }}
          >
            Space
          </Button>
        )}
      </Stack>

      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
        gap: 1.5,
      }}>
        {projects.map((p) => <ProjectCard key={p.id} project={p} />)}
      </Box>
    </Box>
  );
}

export function ProjectDashboard({
  projects: initialProjects,
  isAdmin,
  companies = [],
}: {
  projects: ProjectForDashboard[];
  isAdmin: boolean;
  companies?: CompanyForDashboard[];
}) {
  const router = useRouter();
  const [projects, setProjects] = useState(initialProjects);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCompanyId, setNewCompanyId] = useState('');
  const [newStatus, setNewStatus] = useState('in_discussion');
  const [creating, setCreating] = useState(false);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [fetchedCompanies, setFetchedCompanies] = useState<CompanyForDashboard[] | null>(null);

  const companyOptions = useMemo(
    () => (companies.length > 0 ? companies : (fetchedCompanies ?? [])),
    [companies, fetchedCompanies]
  );

  async function openCreateDialog() {
    setCreateOpen(true);
    if (!isAdmin) return;
    if (companies.length > 0) return;
    if (fetchedCompanies) return;

    setCompaniesLoading(true);
    try {
      const res = await fetch('/api/companies');
      if (!res.ok) throw new Error('Failed to load companies');
      const data = await res.json();
      setFetchedCompanies(Array.isArray(data) ? data : []);
    } catch {
      setFetchedCompanies([]);
    } finally {
      setCompaniesLoading(false);
    }
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
        client_name: companyOptions.find((c) => c.id === newCompanyId)?.name ?? null,
        position: projects.length,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      const newComp = companyOptions.find((c) => c.id === (newCompanyId || null));
      const folderSlug = data.slug ?? null;
      const companySlug = newComp?.slug ?? null;
      const href = companySlug && folderSlug ? `/c/${companySlug}/${folderSlug}` : `/projects/${data.id}`;
      setProjects((prev) => [...prev, {
        id: data.id, href,
        name: data.name, color: data.color ?? null, icon: data.icon ?? null,
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

  // Build sections: companies in order, unassigned last
  const sections: { company: CompanyForDashboard; projects: ProjectForDashboard[] }[] = [];

  for (const c of companyOptions) {
    const cp = projects.filter((p) => p.company_id === c.id);
    if (cp.length > 0) sections.push({ company: c, projects: cp });
  }

  const unassigned = projects.filter(
    (p) => !p.company_id || !companyOptions.find((c) => c.id === p.company_id)
  );
  if (unassigned.length > 0) {
    sections.push({
      company: { id: '__none__', name: 'Other projects', slug: null, color: '#6b7280' },
      projects: unassigned,
    });
  }

  const totalActive = companyOptions.filter((c) => projects.some((p) => p.company_id === c.id)).length;

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h5" fontWeight={800} sx={{ lineHeight: 1.2 }}>
            Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {totalActive} {totalActive === 1 ? 'company' : 'companies'} · {projects.length} project{projects.length !== 1 ? 's' : ''}
          </Typography>
        </Box>
        {isAdmin && (
          <Button variant="contained" startIcon={<AddIcon />} size="small" onClick={openCreateDialog}>
            New project
          </Button>
        )}
      </Stack>

      {/* Company sections */}
      {sections.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 10 }}>
          <BusinessIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
          <Typography color="text.secondary">No projects available.</Typography>
        </Box>
      ) : (
        <Stack spacing={0}>
          {sections.map(({ company, projects: sp }, idx) => (
            <Box key={company.id}>
              {idx > 0 && <Divider sx={{ my: 4 }} />}
              <CompanySection company={company} projects={sp} />
            </Box>
          ))}
        </Stack>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>New project</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Project name" value={newName}
              onChange={(e) => setNewName(e.target.value)} fullWidth autoFocus
            />
            <Stack spacing={0.75}>
              <Typography variant="caption" color="text.secondary">Company</Typography>
              <Select
                value={newCompanyId}
                onChange={(e) => setNewCompanyId(String(e.target.value))}
                size="small"
                fullWidth
                displayEmpty
                MenuProps={{ disablePortal: true }}
              >
                <MenuItem value="">— No company —</MenuItem>
                {companyOptions.map((c) => (
                  <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                ))}
              </Select>
              {companiesLoading && (
                <Typography variant="caption" color="text.secondary">
                  Loading companies…
                </Typography>
              )}
              {!companiesLoading && companyOptions.length === 0 && (
                <Typography variant="caption" color="text.secondary">
                  Create a company first (Admin → Companies)
                </Typography>
              )}
            </Stack>
            <TextField
              label="Status" select value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)} fullWidth
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
    </Box>
  );
}

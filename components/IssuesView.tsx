'use client';

import { useEffect, useRef, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Collapse from '@mui/material/Collapse';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LinkIcon from '@mui/icons-material/Link';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import UploadIcon from '@mui/icons-material/Upload';
import { createClient } from '@/lib/supabase/client';

// ── Constants ────────────────────────────────────────────────────────────────

const MODULES = [
  'Partner Management', 'Users', 'Users Management', 'Billing Management',
  'Rates Management', 'Roles Management', 'Sponsors Management',
  'Providers Management', 'Providers Integration', 'Entire Platform', 'Other',
];

const TYPES = ['Bug', 'Missing Feature', 'Clarification'];

const PRIORITIES: { value: string; label: string; color: 'error' | 'warning' | 'default' }[] = [
  { value: 'high',   label: 'High',   color: 'error' },
  { value: 'medium', label: 'Medium', color: 'warning' },
  { value: 'low',    label: 'Low',    color: 'default' },
];

const SEVERITIES: { value: string; label: string }[] = [
  { value: 'major',    label: 'Major' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'minor',    label: 'Minor' },
];

const STATUSES: { value: string; label: string; color: 'default' | 'warning' | 'info' | 'success' | 'error' | 'secondary' }[] = [
  { value: 'new',                label: 'New',                color: 'default' },
  { value: 'in_progress',        label: 'In Progress',        color: 'warning' },
  { value: 'on_hold',            label: 'On Hold',            color: 'secondary' },
  { value: 'ready_for_testing',  label: 'Ready for Testing',  color: 'info' },
  { value: 'approved',           label: 'Approved',           color: 'success' },
  { value: 'closed',             label: 'Closed',             color: 'error' },
];

// ── Types ────────────────────────────────────────────────────────────────────

type Ticket = {
  id: string;
  folder_id: string;
  title: string;
  description: string | null;
  url: string | null;
  screenshot_path: string | null;
  module: string | null;
  type: string | null;
  priority: string;
  severity: string;
  comments: string | null;
  status: string;
  created_by: string;
  created_by_email: string;
  created_at: string;
  updated_at: string;
};

type FormState = {
  title: string;
  description: string;
  url: string;
  module: string;
  type: string;
  priority: string;
  severity: string;
  comments: string;
};

const EMPTY_FORM: FormState = {
  title: '', description: '', url: '',
  module: '', type: '', priority: 'medium', severity: 'moderate', comments: '',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function statusMeta(value: string) {
  return STATUSES.find((s) => s.value === value) ?? { label: value, color: 'default' as const };
}
function priorityMeta(value: string) {
  return PRIORITIES.find((p) => p.value === value) ?? { label: value, color: 'default' as const };
}

// ── Component ────────────────────────────────────────────────────────────────

export function IssuesView({ folderId, isAdmin }: { folderId: string; isAdmin: boolean }) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Filters
  const [filterModule,   setFilterModule]   = useState('');
  const [filterType,     setFilterType]     = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterStatus,   setFilterStatus]   = useState('');

  // Create / Edit dialog
  const [dialogOpen,  setDialogOpen]  = useState(false);
  const [editTarget,  setEditTarget]  = useState<Ticket | null>(null);
  const [form,        setForm]        = useState<FormState>(EMPTY_FORM);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [uploading,   setUploading]   = useState(false);
  const [submitting,  setSubmitting]  = useState(false);
  const [formError,   setFormError]   = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/tickets?folderId=${folderId}`)
      .then((r) => r.json())
      .then((d) => { setTickets(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [folderId]);

  // ── Form helpers ──────────────────────────────────────────────────────────

  function openCreate() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setScreenshotFile(null);
    setFormError('');
    setDialogOpen(true);
  }

  function openEdit(t: Ticket) {
    setEditTarget(t);
    setForm({
      title:       t.title,
      description: t.description ?? '',
      url:         t.url ?? '',
      module:      t.module ?? '',
      type:        t.type ?? '',
      priority:    t.priority || 'medium',
      severity:    t.severity || 'moderate',
      comments:    t.comments ?? '',
    });
    setScreenshotFile(null);
    setFormError('');
    setDialogOpen(true);
  }

  function closeDialog() {
    if (submitting) return;
    setDialogOpen(false);
    setFormError('');
  }

  function setField<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!form.title.trim()) return;
    setSubmitting(true);
    setFormError('');

    let screenshotPath: string | null = editTarget?.screenshot_path ?? null;

    if (screenshotFile) {
      setUploading(true);
      try {
        const res = await fetch('/api/tickets/upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: screenshotFile.name }),
        });
        const { signedUrl, storagePath, error: urlErr } = await res.json();
        if (urlErr) throw new Error(urlErr);
        const supabase = createClient();
        const { error: uploadErr } = await supabase.storage
          .from('ticket-screenshots')
          .uploadToSignedUrl(storagePath, signedUrl, screenshotFile);
        if (uploadErr) throw new Error(uploadErr.message);
        screenshotPath = storagePath;
      } catch (err) {
        setFormError(err instanceof Error ? err.message : 'Upload failed');
        setSubmitting(false);
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    const payload = {
      folder_id:       folderId,
      title:           form.title.trim(),
      description:     form.description.trim() || null,
      url:             form.url.trim() || null,
      screenshot_path: screenshotPath,
      module:          form.module || null,
      type:            form.type || null,
      priority:        form.priority,
      severity:        form.severity,
      comments:        form.comments.trim() || null,
    };

    if (editTarget) {
      const res = await fetch(`/api/tickets/${editTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setSubmitting(false);
      if (!res.ok) { setFormError(data.error ?? 'Failed to update'); return; }
      setTickets((prev) => prev.map((t) => t.id === editTarget.id ? { ...t, ...data } : t));
    } else {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setSubmitting(false);
      if (!res.ok) { setFormError(data.error ?? 'Failed to create ticket'); return; }
      setTickets((prev) => [data, ...prev]);
    }
    setDialogOpen(false);
  }

  // ── Status actions ────────────────────────────────────────────────────────

  async function updateStatus(id: string, status: string) {
    const res = await fetch(`/api/tickets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const data = await res.json();
      setTickets((prev) => prev.map((t) => t.id === id ? { ...t, status: data.status } : t));
    }
  }

  async function deleteTicket(id: string) {
    const res = await fetch(`/api/tickets/${id}`, { method: 'DELETE' });
    if (res.ok) setTickets((prev) => prev.filter((t) => t.id !== id));
  }

  async function openScreenshot(path: string) {
    const supabase = createClient();
    const { data } = await supabase.storage.from('ticket-screenshots').createSignedUrl(path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  }

  // ── Filtered list ─────────────────────────────────────────────────────────

  const filtered = tickets.filter((t) => {
    if (filterModule   && t.module   !== filterModule)   return false;
    if (filterType     && t.type     !== filterType)     return false;
    if (filterPriority && t.priority !== filterPriority) return false;
    if (filterStatus   && t.status   !== filterStatus)   return false;
    return true;
  });

  const allModules = Array.from(new Set(tickets.map((t) => t.module).filter(Boolean))) as string[];

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) return <CircularProgress size={24} />;

  return (
    <Box>
      {/* Header */}
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between"
        alignItems={{ sm: 'center' }} spacing={1} mb={2}>
        <Typography variant="h6" fontWeight={700}>Issues</Typography>
        <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={openCreate}>
          Report issue
        </Button>
      </Stack>

      {/* Filters */}
      {tickets.length > 0 && (
        <Stack direction="row" spacing={1} mb={2} flexWrap="wrap" useFlexGap>
          <Select value={filterModule} onChange={(e) => setFilterModule(e.target.value)}
            displayEmpty size="small" sx={{ fontSize: 13, height: 32, minWidth: 160 }}>
            <MenuItem value=""><em>All modules</em></MenuItem>
            {allModules.map((m) => <MenuItem key={m} value={m} sx={{ fontSize: 13 }}>{m}</MenuItem>)}
          </Select>
          <Select value={filterType} onChange={(e) => setFilterType(e.target.value)}
            displayEmpty size="small" sx={{ fontSize: 13, height: 32 }}>
            <MenuItem value=""><em>All types</em></MenuItem>
            {TYPES.map((t) => <MenuItem key={t} value={t} sx={{ fontSize: 13 }}>{t}</MenuItem>)}
          </Select>
          <Select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}
            displayEmpty size="small" sx={{ fontSize: 13, height: 32 }}>
            <MenuItem value=""><em>All priorities</em></MenuItem>
            {PRIORITIES.map((p) => <MenuItem key={p.value} value={p.value} sx={{ fontSize: 13 }}>{p.label}</MenuItem>)}
          </Select>
          <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            displayEmpty size="small" sx={{ fontSize: 13, height: 32 }}>
            <MenuItem value=""><em>All statuses</em></MenuItem>
            {STATUSES.map((s) => <MenuItem key={s.value} value={s.value} sx={{ fontSize: 13 }}>{s.label}</MenuItem>)}
          </Select>
        </Stack>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {tickets.length === 0 ? 'No issues reported yet.' : 'No issues match the filters.'}
        </Typography>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 700, width: 32 }} />
                  <TableCell sx={{ fontWeight: 700 }}>Title</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Module</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Priority</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Severity</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 120 }} align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((ticket) => {
                  const sm = statusMeta(ticket.status);
                  const pm = priorityMeta(ticket.priority);
                  const isOpen = expanded === ticket.id;
                  const hasDetails = ticket.description || ticket.url || ticket.screenshot_path || ticket.comments;

                  return [
                    <TableRow
                      key={ticket.id}
                      hover
                      sx={{ cursor: hasDetails ? 'pointer' : 'default', '& td': { borderBottom: isOpen ? 'none' : undefined } }}
                      onClick={() => hasDetails && setExpanded(isOpen ? null : ticket.id)}
                    >
                      {/* Expand toggle */}
                      <TableCell sx={{ px: 1 }}>
                        {hasDetails && (
                          <ExpandMoreIcon fontSize="small" sx={{
                            color: 'text.disabled', display: 'block',
                            transform: isOpen ? 'rotate(180deg)' : 'none',
                            transition: 'transform 0.2s',
                          }} />
                        )}
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2" fontWeight={600} sx={{ maxWidth: 260 }} noWrap>
                          {ticket.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {ticket.created_by_email}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        {ticket.module && (
                          <Chip label={ticket.module} size="small" variant="outlined" sx={{ fontSize: 11 }} />
                        )}
                      </TableCell>

                      <TableCell>
                        {ticket.type && (
                          <Chip
                            label={ticket.type}
                            size="small"
                            color={ticket.type === 'Bug' ? 'error' : ticket.type === 'Missing Feature' ? 'warning' : 'default'}
                            variant="outlined"
                            sx={{ fontSize: 11 }}
                          />
                        )}
                      </TableCell>

                      <TableCell>
                        <Chip label={pm.label} size="small" color={pm.color} variant="outlined" sx={{ fontSize: 11 }} />
                      </TableCell>

                      <TableCell>
                        <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>
                          {ticket.severity || '—'}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Chip label={sm.label} size="small" color={sm.color} sx={{ fontSize: 11 }} />
                      </TableCell>

                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(ticket.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </Typography>
                      </TableCell>

                      {/* Actions */}
                      <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                        <Stack direction="row" spacing={0.25} justifyContent="flex-end" alignItems="center">
                          {isAdmin && ticket.status === 'new' && (
                            <IconButton size="small" title="Take" onClick={() => updateStatus(ticket.id, 'in_progress')}>
                              <PlayArrowIcon fontSize="small" color="warning" />
                            </IconButton>
                          )}
                          {isAdmin && ticket.status === 'in_progress' && (
                            <IconButton size="small" title="Mark done" onClick={() => updateStatus(ticket.id, 'ready_for_testing')}>
                              <TaskAltIcon fontSize="small" color="info" />
                            </IconButton>
                          )}
                          {isAdmin && ticket.status === 'in_progress' && (
                            <IconButton size="small" title="On hold" onClick={() => updateStatus(ticket.id, 'on_hold')}>
                              <PauseIcon fontSize="small" color="secondary" />
                            </IconButton>
                          )}
                          {!isAdmin && ticket.status === 'ready_for_testing' && ticket.created_by && (
                            <IconButton size="small" title="Approve" onClick={() => updateStatus(ticket.id, 'approved')}>
                              <CheckCircleIcon fontSize="small" color="success" />
                            </IconButton>
                          )}
                          {isAdmin && ticket.status === 'approved' && (
                            <IconButton size="small" title="Close" onClick={() => updateStatus(ticket.id, 'closed')}>
                              <TaskAltIcon fontSize="small" />
                            </IconButton>
                          )}
                          {isAdmin && (
                            <IconButton size="small" onClick={() => openEdit(ticket)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          )}
                          {isAdmin && (
                            <IconButton size="small" color="error" onClick={() => deleteTicket(ticket.id)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>,

                    /* Expanded detail row */
                    isOpen && hasDetails ? (
                      <TableRow key={`${ticket.id}-detail`}>
                        <TableCell colSpan={9} sx={{ pb: 2, pt: 0, bgcolor: 'action.hover' }}>
                          <Box sx={{ px: 1 }}>
                            <Collapse in={isOpen}>
                              <Stack spacing={1} pt={1}>
                                {ticket.description && (
                                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: 'text.secondary' }}>
                                    {ticket.description}
                                  </Typography>
                                )}
                                {ticket.comments && (
                                  <>
                                    <Divider />
                                    <Box>
                                      <Typography variant="caption" fontWeight={700} color="text.secondary"
                                        sx={{ textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', mb: 0.5 }}>
                                        Comments
                                      </Typography>
                                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                                        {ticket.comments}
                                      </Typography>
                                    </Box>
                                  </>
                                )}
                                <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                                  {ticket.url && (
                                    <Stack direction="row" spacing={0.5} alignItems="center">
                                      <LinkIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                                      <Typography variant="body2" component="a" href={ticket.url}
                                        target="_blank" rel="noopener noreferrer"
                                        sx={{ color: 'primary.main', wordBreak: 'break-all' }}>
                                        {ticket.url}
                                      </Typography>
                                    </Stack>
                                  )}
                                  {ticket.screenshot_path && (
                                    <Button size="small" variant="outlined" startIcon={<AttachFileIcon />}
                                      onClick={() => openScreenshot(ticket.screenshot_path!)}
                                      sx={{ alignSelf: 'flex-start' }}>
                                      View screenshot
                                    </Button>
                                  )}
                                </Stack>
                              </Stack>
                            </Collapse>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ) : null,
                  ];
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Summary */}
          <Divider />
          <Stack direction="row" spacing={2} sx={{ px: 2.5, py: 1 }} flexWrap="wrap" useFlexGap>
            <Typography variant="caption" color="text.secondary">
              Total: <strong>{filtered.length}</strong>
            </Typography>
            {STATUSES.map((s) => {
              const cnt = filtered.filter((t) => t.status === s.value).length;
              if (!cnt) return null;
              return (
                <Chip key={s.value} label={`${s.label}: ${cnt}`} size="small"
                  color={s.color} variant="outlined" sx={{ fontSize: 11 }} />
              );
            })}
          </Stack>
        </Paper>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>
          {editTarget ? 'Edit issue' : 'Report an issue'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {formError && <Alert severity="error">{formError}</Alert>}

            <TextField label="Title" placeholder="Short description of the issue"
              value={form.title} onChange={(e) => setField('title', e.target.value)}
              fullWidth autoFocus />

            <TextField label="Description"
              placeholder="Steps to reproduce, expected vs actual behaviour…"
              value={form.description} onChange={(e) => setField('description', e.target.value)}
              fullWidth multiline rows={3} />

            {/* Module + Type */}
            <Stack direction="row" spacing={2}>
              <TextField label="Module" select value={form.module}
                onChange={(e) => setField('module', e.target.value)} fullWidth>
                <MenuItem value=""><em>Select…</em></MenuItem>
                {MODULES.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
              </TextField>
              <TextField label="Type" select value={form.type}
                onChange={(e) => setField('type', e.target.value)} fullWidth>
                <MenuItem value=""><em>Select…</em></MenuItem>
                {TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </TextField>
            </Stack>

            {/* Priority + Severity */}
            <Stack direction="row" spacing={2}>
              <TextField label="Priority" select value={form.priority}
                onChange={(e) => setField('priority', e.target.value)} fullWidth>
                {PRIORITIES.map((p) => <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>)}
              </TextField>
              <TextField label="Severity" select value={form.severity}
                onChange={(e) => setField('severity', e.target.value)} fullWidth>
                {SEVERITIES.map((s) => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
              </TextField>
            </Stack>

            <TextField label="Page URL (optional)" placeholder="https://…"
              value={form.url} onChange={(e) => setField('url', e.target.value)} fullWidth />

            <TextField label="Comments / Follow-up (optional)"
              placeholder="Additional notes, follow-up by email, etc."
              value={form.comments} onChange={(e) => setField('comments', e.target.value)}
              fullWidth multiline rows={2} />

            {/* Screenshot */}
            <Box>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={(e) => setScreenshotFile(e.target.files?.[0] ?? null)} />
              <Button variant="outlined" size="small"
                startIcon={uploading ? <CircularProgress size={14} color="inherit" /> : <UploadIcon />}
                onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                {screenshotFile
                  ? screenshotFile.name
                  : editTarget?.screenshot_path
                    ? 'Replace screenshot'
                    : 'Attach screenshot'}
              </Button>
              {screenshotFile && (
                <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                  {(screenshotFile.size / 1024).toFixed(0)} KB
                </Typography>
              )}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={closeDialog} disabled={submitting}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit}
            disabled={submitting || !form.title.trim()}
            startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : undefined}>
            {submitting ? 'Saving…' : editTarget ? 'Save changes' : 'Send'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SendIcon from '@mui/icons-material/Send';

// ── Types ──────────────────────────────────────────────────────────────────

type AdminUser = { id: string; email: string };

type EnrichedTicket = {
  id: string;
  folder_id: string;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  ticket_number: number | null;
  status: string;
  priority: string;
  severity: string;
  type: string | null;
  module: string | null;
  url: string | null;
  screenshot_path: string | null;
  created_by: string | null;
  created_by_email: string;
  assigned_to: string | null;
  assigned_to_email: string;
  comments: string | null;
  project_name: string | null;
  project_slug: string | null;
  company_name: string | null;
  company_slug: string | null;
};

type Comment = {
  id: string;
  document_id: string;
  user_id: string;
  author_name: string;
  content: string;
  created_at: string;
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

// ── Constants ──────────────────────────────────────────────────────────────

const MODULES = [
  'Partner Management', 'Users', 'Users Management', 'Billing Management',
  'Rates Management', 'Roles Management', 'Sponsors Management',
  'Providers Management', 'Providers Integration', 'Entire Platform', 'Other',
];

const TYPES = ['Bug', 'Missing Feature', 'Clarification'] as const;

const STATUSES = ['new', 'in_progress', 'on_hold', 'ready_for_testing', 'approved', 'closed'] as const;

const PRIORITIES_LIST = ['high', 'medium', 'low'] as const;

const SEVERITIES = ['major', 'moderate', 'minor'] as const;

const EMPTY_FORM: FormState = {
  title: '', description: '', url: '',
  module: '', type: '', priority: 'medium', severity: 'moderate', comments: '',
};

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  new:               { label: 'New',           color: '#64748b', bg: '#f1f5f9' },
  in_progress:       { label: 'In Progress',   color: '#1d4ed8', bg: '#eff6ff' },
  on_hold:           { label: 'On Hold',       color: '#7c3aed', bg: '#f5f3ff' },
  ready_for_testing: { label: 'Ready for Test',color: '#b45309', bg: '#fffbeb' },
  approved:          { label: 'Approved',      color: '#15803d', bg: '#f0fdf4' },
  closed:            { label: 'Closed',        color: '#374151', bg: '#f9fafb' },
};

const PRIORITY_COLOR: Record<string, string> = {
  high: '#ef4444', medium: '#f59e0b', low: '#22c55e',
};

const TYPE_META: Record<string, { color: string; bg: string }> = {
  'Bug':             { color: '#dc2626', bg: '#fef2f2' },
  'Missing Feature': { color: '#d97706', bg: '#fffbeb' },
  'Clarification':   { color: '#2563eb', bg: '#eff6ff' },
};

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function ticketNum(n: number | null) {
  if (!n) return null;
  return `#${String(n).padStart(3, '0')}`;
}

function initials(email: string) {
  return email ? email[0].toUpperCase() : '?';
}

function StatusBadge({ status, size = 'sm' }: { status: string; size?: 'sm' | 'md' }) {
  const m = STATUS_META[status] ?? STATUS_META.new;
  return (
    <Box sx={{
      display: 'inline-flex', alignItems: 'center',
      px: size === 'md' ? 1.25 : 1, py: size === 'md' ? 0.5 : 0.25,
      borderRadius: '6px', bgcolor: m.bg, color: m.color,
      fontSize: size === 'md' ? 12 : 11, fontWeight: 600,
      whiteSpace: 'nowrap', lineHeight: 1.5,
    }}>
      {m.label}
    </Box>
  );
}

function TypeBadge({ type }: { type: string | null }) {
  if (!type) return <Typography variant="caption" color="text.disabled">—</Typography>;
  const m = TYPE_META[type] ?? { color: '#64748b', bg: '#f1f5f9' };
  return (
    <Box sx={{
      display: 'inline-flex', alignItems: 'center',
      px: 1, py: 0.25, borderRadius: '6px',
      bgcolor: m.bg, color: m.color,
      fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', lineHeight: 1.5,
    }}>
      {type}
    </Box>
  );
}

// ── Component ──────────────────────────────────────────────────────────────

export function AdminTicketsClient() {
  const [tickets,    setTickets]    = useState<EnrichedTicket[]>([]);
  const [users,      setUsers]      = useState<AdminUser[]>([]);
  const [loading,    setLoading]    = useState(true);

  // Filters
  const [companyTab, setCompanyTab] = useState('all');
  const [statusF,    setStatusF]    = useState('');
  const [priorityF,  setPriorityF]  = useState('');
  const [typeF,      setTypeF]      = useState('');
  const [search,     setSearch]     = useState('');

  // Drawer
  const [drawerId,   setDrawerId]   = useState<string | null>(null);
  const [drawerCmts, setDrawerCmts] = useState<Comment[]>([]);
  const [commentTxt, setCommentTxt] = useState('');
  const [sendingCmt, setSendingCmt] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<EnrichedTicket | null>(null);
  const [form,       setForm]       = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError,  setFormError]  = useState('');

  // ── Load + auto-refresh ────────────────────────────────────────────────

  const load = useCallback((showLoading = false) => {
    if (showLoading) setLoading(true);
    fetch('/api/admin/tickets')
      .then((r) => r.json())
      .then((d) => {
        if (d && Array.isArray(d.tickets)) {
          setTickets(d.tickets);
          setUsers(d.users ?? []);
        } else if (Array.isArray(d)) {
          setTickets(d);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load(true);
    const id = setInterval(() => load(false), 30_000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (!drawerId) return;
    setDrawerCmts([]);
    fetch(`/api/ticket-comments?ticketId=${drawerId}`)
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setDrawerCmts(d); })
      .catch(() => {});
  }, [drawerId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [drawerCmts]);

  // ── Derived ────────────────────────────────────────────────────────────

  const companies = useMemo(
    () => [...new Set(tickets.map((t) => t.company_name).filter(Boolean))] as string[],
    [tickets],
  );

  const filtered = useMemo(() => tickets.filter((t) => {
    if (companyTab !== 'all' && t.company_name !== companyTab) return false;
    if (statusF   && t.status   !== statusF)   return false;
    if (priorityF && t.priority !== priorityF) return false;
    if (typeF     && t.type     !== typeF)     return false;
    if (search) {
      const q = search.toLowerCase();
      const num = ticketNum(t.ticket_number)?.toLowerCase() ?? '';
      if (
        !t.title.toLowerCase().includes(q) &&
        !num.includes(q) &&
        !(t.company_name ?? '').toLowerCase().includes(q) &&
        !(t.project_name ?? '').toLowerCase().includes(q) &&
        !(t.created_by_email ?? '').toLowerCase().includes(q)
      ) return false;
    }
    return true;
  }), [tickets, companyTab, statusF, priorityF, typeF, search]);

  const stats = useMemo(() => {
    const c: Record<string, number> = {};
    STATUSES.forEach((s) => { c[s] = 0; });
    tickets.forEach((t) => { c[t.status] = (c[t.status] ?? 0) + 1; });
    return c;
  }, [tickets]);

  const drawerTicket = drawerId ? tickets.find((t) => t.id === drawerId) ?? null : null;

  const companyCounts = useMemo(() => {
    const c: Record<string, number> = { all: tickets.length };
    tickets.forEach((t) => { if (t.company_name) c[t.company_name] = (c[t.company_name] ?? 0) + 1; });
    return c;
  }, [tickets]);

  // ── Actions ────────────────────────────────────────────────────────────

  const changeStatus = useCallback(async (ticketId: string, newStatus: string) => {
    setUpdatingId(ticketId);
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) setTickets((prev) => prev.map((t) => t.id === ticketId ? { ...t, status: newStatus } : t));
    } finally { setUpdatingId(null); }
  }, []);

  const changeAssignee = useCallback(async (ticketId: string, assignedTo: string | null) => {
    const email = users.find((u) => u.id === assignedTo)?.email ?? '';
    setTickets((prev) => prev.map((t) =>
      t.id === ticketId ? { ...t, assigned_to: assignedTo, assigned_to_email: email } : t,
    ));
    await fetch(`/api/tickets/${ticketId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assigned_to: assignedTo }),
    });
  }, [users]);

  const deleteTicket = useCallback(async (id: string) => {
    if (!window.confirm('Delete this issue? This cannot be undone.')) return;
    const res = await fetch(`/api/tickets/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setTickets((prev) => prev.filter((t) => t.id !== id));
      if (drawerId === id) setDrawerId(null);
    }
  }, [drawerId]);

  function openEdit(t: EnrichedTicket) {
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

  async function handleSubmit() {
    if (!editTarget || !form.title.trim()) return;
    setSubmitting(true);
    setFormError('');
    try {
      const res = await fetch(`/api/tickets/${editTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title:       form.title.trim(),
          description: form.description.trim() || null,
          url:         form.url.trim() || null,
          module:      form.module || null,
          type:        form.type || null,
          priority:    form.priority,
          severity:    form.severity,
          comments:    form.comments.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error ?? 'Failed to update'); return; }
      setTickets((prev) => prev.map((t) =>
        t.id === editTarget.id ? { ...t, ...data, updated_at: data.updated_at ?? t.updated_at } : t,
      ));
      setDialogOpen(false);
    } catch {
      setFormError('Unexpected error. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const sendComment = useCallback(async () => {
    if (!drawerId || !commentTxt.trim()) return;
    setSendingCmt(true);
    try {
      const res = await fetch('/api/ticket-comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_id: drawerId, content: commentTxt.trim() }),
      });
      if (res.ok) { const cmt = await res.json(); setDrawerCmts((prev) => [...prev, cmt]); setCommentTxt(''); }
    } finally { setSendingCmt(false); }
  }, [drawerId, commentTxt]);

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" alignItems="baseline" spacing={1.5} mb={3}>
        <Typography variant="h5" fontWeight={700}>Issues</Typography>
        <Typography variant="body2" color="text.secondary">
          {loading ? '—' : `${tickets.length} total`}
        </Typography>
      </Stack>

      {/* Status stat pills */}
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mb={3}>
        {STATUSES.map((s) => {
          const m = STATUS_META[s];
          const active = statusF === s;
          return (
            <Box key={s} onClick={() => setStatusF((p) => p === s ? '' : s)} sx={{
              width: 120, px: 1.5, py: 0.75, borderRadius: '8px', cursor: 'pointer',
              border: '1px solid', borderColor: active ? m.color : 'divider',
              bgcolor: active ? m.bg : 'transparent', transition: 'all .12s',
              '&:hover': { borderColor: m.color, bgcolor: m.bg },
            }}>
              <Typography sx={{ fontSize: 18, fontWeight: 700, color: active ? m.color : 'text.primary', lineHeight: 1 }}>
                {stats[s] ?? 0}
              </Typography>
              <Typography sx={{ fontSize: 11, color: active ? m.color : 'text.secondary', mt: 0.25 }}>
                {m.label}
              </Typography>
            </Box>
          );
        })}
        {statusF && (
          <Button size="small" variant="text" sx={{ alignSelf: 'center', fontSize: 12 }}
            onClick={() => setStatusF('')}>Clear</Button>
        )}
      </Stack>

      {/* Search bar */}
      <Box mb={2}>
        <TextField
          size="small"
          fullWidth
          placeholder="Search by title, #number, company, project or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          slotProps={{ input: { sx: { fontSize: 13 } } }}
        />
      </Box>

      {/* Compact filters: company · priority · type */}
      <Stack direction="row" alignItems="center" justifyContent="space-between"
        flexWrap="wrap" useFlexGap spacing={1} mb={2}>
        {/* Company dropdown */}
        <TextField select size="small" value={companyTab}
          onChange={(e) => setCompanyTab(e.target.value)}
          sx={{ minWidth: 200, fontSize: 13 }}
          SelectProps={{ displayEmpty: true }}>
          <MenuItem value="all">All companies ({companyCounts.all ?? 0})</MenuItem>
          {companies.map((c) => (
            <MenuItem key={c} value={c}>{c} ({companyCounts[c] ?? 0})</MenuItem>
          ))}
        </TextField>

        <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
          {/* Priority dots */}
          {(['', ...PRIORITIES_LIST] as const).map((p) => (
            <Box key={p || 'all'} onClick={() => setPriorityF((prev) => prev === p ? '' : p)} sx={{
              display: 'flex', alignItems: 'center', gap: 0.5,
              px: 1, py: 0.5, borderRadius: '6px', cursor: 'pointer',
              border: '1px solid',
              borderColor: priorityF === p ? (PRIORITY_COLOR[p] ?? 'primary.main') : 'divider',
              bgcolor: priorityF === p ? (PRIORITY_COLOR[p] ? PRIORITY_COLOR[p] + '18' : 'action.selected') : 'transparent',
              '&:hover': { borderColor: PRIORITY_COLOR[p] ?? 'text.secondary' },
            }}>
              {p ? (
                <>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: PRIORITY_COLOR[p] }} />
                  <Typography sx={{ fontSize: 11, fontWeight: 600, textTransform: 'capitalize' }}>{p}</Typography>
                </>
              ) : (
                <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>All</Typography>
              )}
            </Box>
          ))}

          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

          {/* Type pills */}
          {(['', ...TYPES] as const).map((tp) => {
            const m = tp ? (TYPE_META[tp] ?? null) : null;
            const active = typeF === tp;
            return (
              <Box key={tp || 'all-type'} onClick={() => setTypeF((prev) => prev === tp ? '' : tp)} sx={{
                px: 1, py: 0.5, borderRadius: '6px', cursor: 'pointer',
                border: '1px solid',
                borderColor: active && m ? m.color : active ? 'primary.main' : 'divider',
                bgcolor: active && m ? m.bg : active ? 'action.selected' : 'transparent',
                '&:hover': { borderColor: m?.color ?? 'text.secondary' },
              }}>
                <Typography sx={{ fontSize: 11, fontWeight: active ? 700 : 500, color: active && m ? m.color : 'text.secondary' }}>
                  {tp || 'All types'}
                </Typography>
              </Box>
            );
          })}
        </Stack>
      </Stack>

      {/* Table */}
      {loading ? (
        <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress size={28} /></Box>
      ) : filtered.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 6, textAlign: 'center' }}>
          No issues found
        </Typography>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
          {/* Head */}
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: '56px 12px 1fr 140px 100px 130px 120px 60px 72px',
            px: 2, py: 1, bgcolor: 'action.hover',
            borderBottom: '1px solid', borderColor: 'divider', gap: 1.5,
          }}>
            {['#', '', 'Issue', 'Company / Project', 'Type', 'Assignee', 'Status', 'Date', ''].map((h, i) => (
              <Typography key={i} variant="caption" fontWeight={700} color="text.secondary"
                sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {h}
              </Typography>
            ))}
          </Box>

          {/* Rows */}
          {filtered.map((t, idx) => (
            <Box key={t.id}>
              <Box onClick={() => setDrawerId(t.id)} sx={{
                display: 'grid',
                gridTemplateColumns: '56px 12px 1fr 140px 100px 130px 120px 60px 72px',
                px: 2, py: 1.25, gap: 1.5, cursor: 'pointer', alignItems: 'center',
                '&:hover': { bgcolor: 'action.hover' }, transition: 'background .1s',
              }}>
                <Typography variant="caption" fontWeight={600}
                  sx={{ color: 'text.disabled', fontFamily: 'monospace', fontSize: 11 }}>
                  {ticketNum(t.ticket_number) ?? '—'}
                </Typography>

                <Tooltip title={`${t.priority} priority`} placement="top">
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, bgcolor: PRIORITY_COLOR[t.priority] ?? '#aaa' }} />
                </Tooltip>

                <Box sx={{ overflow: 'hidden' }}>
                  <Typography variant="body2" fontWeight={500}
                    sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.title}
                  </Typography>
                </Box>

                <Box sx={{ overflow: 'hidden' }}>
                  {t.company_name && (
                    <Typography variant="caption" fontWeight={600} color="text.primary"
                      sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                      {t.company_name}
                    </Typography>
                  )}
                  {t.project_name && (
                    <Typography variant="caption" color="text.secondary"
                      sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                      {t.project_name}
                    </Typography>
                  )}
                </Box>

                <Box><TypeBadge type={t.type} /></Box>

                <Box onClick={(e) => e.stopPropagation()}>
                  <Select size="small" value={t.assigned_to ?? ''} displayEmpty
                    onChange={(e) => changeAssignee(t.id, e.target.value || null)}
                    sx={{ fontSize: 11, height: 26, minWidth: 120,
                      '& .MuiSelect-select': { py: 0.25, px: 1, display: 'flex', alignItems: 'center', gap: 0.5 } }}
                    renderValue={(v) => v ? (
                      <Typography sx={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 100 }}>
                        {users.find((u) => u.id === v)?.email?.split('@')[0] ?? '—'}
                      </Typography>
                    ) : <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>Unassigned</Typography>}>
                    <MenuItem value=""><em style={{ fontSize: 11 }}>Unassigned</em></MenuItem>
                    {users.map((u) => <MenuItem key={u.id} value={u.id} sx={{ fontSize: 11 }}>{u.email}</MenuItem>)}
                  </Select>
                </Box>

                <Box onClick={(e) => e.stopPropagation()}>
                  <Select size="small" value={t.status} disabled={updatingId === t.id}
                    onChange={(e) => changeStatus(t.id, e.target.value)}
                    sx={{ fontSize: 11, height: 26, minWidth: 118,
                      '& .MuiSelect-select': { py: 0.25, px: 0.5 },
                      '& .MuiOutlinedInput-notchedOutline': { border: 'none' } }}
                    renderValue={(v) => <StatusBadge status={v} />}>
                    {STATUSES.map((s) => <MenuItem key={s} value={s} sx={{ fontSize: 12 }}><StatusBadge status={s} size="md" /></MenuItem>)}
                  </Select>
                </Box>

                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                  {fmtDate(t.created_at)}
                </Typography>

                {/* Row actions */}
                <Box onClick={(e) => e.stopPropagation()} sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                  <Tooltip title="Edit">
                    <IconButton size="small" onClick={() => openEdit(t)}>
                      <EditIcon sx={{ fontSize: 13 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton size="small" color="error" onClick={() => deleteTicket(t.id)}>
                      <DeleteIcon sx={{ fontSize: 13 }} />
                    </IconButton>
                  </Tooltip>
                  {t.company_slug && t.project_slug && (
                    <Tooltip title="Open in project" placement="left">
                      <IconButton size="small" component="a"
                        href={`/${t.company_slug}/${t.project_slug}/issues/${t.ticket_number ?? t.id}`}
                        target="_blank" rel="noopener">
                        <OpenInNewIcon sx={{ fontSize: 13 }} />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </Box>
              {idx < filtered.length - 1 && <Divider />}
            </Box>
          ))}
        </Paper>
      )}

      {/* ── Detail drawer ──────────────────────────────────────────────── */}
      <Drawer anchor="right" open={!!drawerTicket} onClose={() => setDrawerId(null)}
        hideBackdrop variant="persistent"
        PaperProps={{ sx: {
          width: { xs: '100vw', sm: 460 }, display: 'flex', flexDirection: 'column',
          boxShadow: '-4px 0 24px rgba(0,0,0,.08)', borderLeft: '1px solid', borderColor: 'divider',
        } }}>
        {drawerTicket && (
          <>
            {/* Drawer header */}
            <Stack direction="row" alignItems="flex-start" spacing={1}
              sx={{ px: 2.5, pt: 2, pb: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" spacing={1} alignItems="center" mb={0.5} flexWrap="wrap" useFlexGap>
                  {drawerTicket.ticket_number && (
                    <Typography variant="caption" fontWeight={700}
                      sx={{ fontFamily: 'monospace', color: 'text.disabled', fontSize: 12 }}>
                      {ticketNum(drawerTicket.ticket_number)}
                    </Typography>
                  )}
                  <TypeBadge type={drawerTicket.type} />
                </Stack>
                <Typography variant="subtitle1" fontWeight={700} lineHeight={1.35}
                  sx={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box',
                    WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {drawerTicket.title}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  {[drawerTicket.company_name, drawerTicket.project_name].filter(Boolean).join(' · ')}
                </Typography>
              </Box>
              <Stack direction="row" alignItems="center" spacing={0.25} sx={{ flexShrink: 0 }}>
                <Tooltip title="Edit">
                  <IconButton size="small" onClick={() => openEdit(drawerTicket)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete">
                  <IconButton size="small" color="error" onClick={() => deleteTicket(drawerTicket.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <IconButton size="small" onClick={() => setDrawerId(null)}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Stack>
            </Stack>

            <Box sx={{ flex: 1, overflowY: 'auto', px: 2.5, py: 2 }}>

              {/* Status segmented control */}
              <Typography variant="caption" fontWeight={600} color="text.disabled"
                sx={{ textTransform: 'uppercase', letterSpacing: 0.6, mb: 1, display: 'block' }}>
                Status
              </Typography>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap mb={2.5}>
                {STATUSES.map((s) => {
                  const m = STATUS_META[s];
                  const active = drawerTicket.status === s;
                  const busy = updatingId === drawerTicket.id;
                  return (
                    <Box key={s} onClick={() => !busy && changeStatus(drawerTicket.id, s)} sx={{
                      px: 1.25, py: 0.5, borderRadius: '6px', border: '1.5px solid',
                      borderColor: active ? m.color : 'divider',
                      bgcolor: active ? m.bg : 'transparent',
                      color: active ? m.color : 'text.secondary',
                      fontSize: 11, fontWeight: active ? 700 : 500,
                      cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1,
                      transition: 'all .12s',
                      '&:hover': !busy ? { borderColor: m.color, color: m.color } : {},
                    }}>
                      {m.label}
                    </Box>
                  );
                })}
              </Stack>

              {/* Quick actions */}
              <Stack direction="row" spacing={1} mb={2.5} flexWrap="wrap" useFlexGap>
                {drawerTicket.status === 'new' && (
                  <Button size="small" variant="outlined" startIcon={<span>▶</span>}
                    onClick={() => changeStatus(drawerTicket.id, 'in_progress')}>Take</Button>
                )}
                {drawerTicket.status === 'in_progress' && (
                  <Button size="small" variant="outlined" color="warning"
                    onClick={() => changeStatus(drawerTicket.id, 'ready_for_testing')}>Mark done</Button>
                )}
                {drawerTicket.status !== 'closed' && (
                  <Button size="small" variant="outlined" color="error"
                    onClick={() => changeStatus(drawerTicket.id, 'closed')}>Close</Button>
                )}
                {drawerTicket.company_slug && drawerTicket.project_slug && (
                  <Button size="small" variant="text" endIcon={<OpenInNewIcon sx={{ fontSize: 13 }} />}
                    component="a"
                    href={`/${drawerTicket.company_slug}/${drawerTicket.project_slug}/issues/${drawerTicket.ticket_number ?? drawerTicket.id}`}
                    target="_blank" rel="noopener">
                    Open in project
                  </Button>
                )}
              </Stack>

              {/* Assignee */}
              <Box mb={2}>
                <Typography variant="caption" fontWeight={600} color="text.disabled"
                  sx={{ textTransform: 'uppercase', letterSpacing: 0.6, mb: 0.75, display: 'block' }}>
                  Assignee
                </Typography>
                <Select size="small" fullWidth value={drawerTicket.assigned_to ?? ''} displayEmpty
                  onChange={(e) => changeAssignee(drawerTicket.id, e.target.value || null)}
                  sx={{ fontSize: 13 }}
                  renderValue={(v) => v ? (
                    <Typography sx={{ fontSize: 13 }}>{users.find((u) => u.id === v)?.email ?? '—'}</Typography>
                  ) : <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Unassigned</Typography>}>
                  <MenuItem value=""><em>Unassigned</em></MenuItem>
                  {users.map((u) => <MenuItem key={u.id} value={u.id}>{u.email}</MenuItem>)}
                </Select>
              </Box>

              {/* Meta grid */}
              <Paper variant="outlined" sx={{ borderRadius: 2, p: 1.5, mb: 2 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                  {([
                    ['Priority', <Box key="p" sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: PRIORITY_COLOR[drawerTicket.priority] ?? '#aaa' }} />
                      <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>{drawerTicket.priority}</Typography>
                    </Box>],
                    ['Severity', <Typography key="sv" variant="body2" sx={{ textTransform: 'capitalize' }}>{drawerTicket.severity}</Typography>],
                    ['Module',   <Typography key="mo" variant="body2">{drawerTicket.module ?? '—'}</Typography>],
                    ['Created',  <Typography key="cr" variant="body2">{fmtDate(drawerTicket.created_at)}</Typography>],
                    ['Updated',  <Typography key="up" variant="body2">{fmtDate(drawerTicket.updated_at)}</Typography>],
                  ] as [string, React.ReactNode][]).map(([label, value]) => (
                    <Box key={label}>
                      <Typography variant="caption" color="text.disabled">{label}</Typography>
                      <Box sx={{ mt: 0.25 }}>{value}</Box>
                    </Box>
                  ))}
                </Box>
              </Paper>

              {drawerTicket.description && (
                <Box mb={2}>
                  <Typography variant="caption" fontWeight={600} color="text.disabled"
                    sx={{ textTransform: 'uppercase', letterSpacing: 0.6, display: 'block', mb: 0.5 }}>
                    Description
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{drawerTicket.description}</Typography>
                </Box>
              )}

              {drawerTicket.url && (
                <Box mb={2}>
                  <Typography variant="caption" fontWeight={600} color="text.disabled"
                    sx={{ textTransform: 'uppercase', letterSpacing: 0.6, display: 'block', mb: 0.5 }}>
                    URL
                  </Typography>
                  <Link href={drawerTicket.url} target="_blank" rel="noopener" variant="body2"
                    sx={{ wordBreak: 'break-all' }}>
                    {drawerTicket.url}
                  </Link>
                </Box>
              )}

              {drawerTicket.screenshot_path && (
                <Box mb={2}>
                  <Typography variant="caption" fontWeight={600} color="text.disabled"
                    sx={{ textTransform: 'uppercase', letterSpacing: 0.6, display: 'block', mb: 0.5 }}>
                    Screenshot
                  </Typography>
                  <Box component="img"
                    src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/ticket-screenshots/${drawerTicket.screenshot_path}`}
                    alt="screenshot"
                    sx={{ width: '100%', borderRadius: 1.5, border: '1px solid', borderColor: 'divider', cursor: 'zoom-in' }}
                    onClick={() => window.open(
                      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/ticket-screenshots/${drawerTicket.screenshot_path}`,
                      '_blank',
                    )}
                  />
                </Box>
              )}

              {drawerTicket.comments && (
                <Box mb={2}>
                  <Typography variant="caption" fontWeight={600} color="text.disabled"
                    sx={{ textTransform: 'uppercase', letterSpacing: 0.6, display: 'block', mb: 0.5 }}>
                    Notes
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{drawerTicket.comments}</Typography>
                </Box>
              )}

              <Divider sx={{ mb: 2 }} />

              <Typography variant="caption" fontWeight={600} color="text.disabled"
                sx={{ textTransform: 'uppercase', letterSpacing: 0.6, mb: 1.5, display: 'block' }}>
                Comments
              </Typography>
              {drawerCmts.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>No comments yet.</Typography>
              ) : (
                <Stack spacing={2} mb={2}>
                  {drawerCmts.map((c) => (
                    <Box key={c.id}>
                      <Stack direction="row" spacing={1} alignItems="center" mb={0.25}>
                        <Avatar sx={{ width: 20, height: 20, fontSize: 10, bgcolor: 'primary.main' }}>
                          {initials(c.author_name)}
                        </Avatar>
                        <Typography variant="caption" fontWeight={600}>{c.author_name}</Typography>
                        <Typography variant="caption" color="text.disabled">{fmtDate(c.created_at)}</Typography>
                      </Stack>
                      <Typography variant="body2" sx={{ pl: 3.5, whiteSpace: 'pre-wrap' }}>{c.content}</Typography>
                    </Box>
                  ))}
                  <div ref={bottomRef} />
                </Stack>
              )}
            </Box>

            {/* Comment input */}
            <Box sx={{ px: 2.5, py: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              <Stack direction="row" spacing={1}>
                <TextField size="small" fullWidth placeholder="Write a comment…"
                  value={commentTxt} onChange={(e) => setCommentTxt(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendComment(); } }}
                  multiline maxRows={4} />
                <IconButton color="primary" disabled={!commentTxt.trim() || sendingCmt} onClick={sendComment}>
                  <SendIcon fontSize="small" />
                </IconButton>
              </Stack>
            </Box>
          </>
        )}
      </Drawer>

      {/* ── Edit dialog ────────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>Edit issue</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {formError && <Alert severity="error">{formError}</Alert>}

            <TextField label="Title" value={form.title} autoFocus fullWidth
              onChange={(e) => setField('title', e.target.value)} />

            <TextField label="Description" value={form.description} fullWidth multiline rows={3}
              onChange={(e) => setField('description', e.target.value)} />

            <Stack direction="row" spacing={2}>
              <TextField label="Module" select value={form.module} fullWidth
                onChange={(e) => setField('module', e.target.value)}>
                <MenuItem value=""><em>Select…</em></MenuItem>
                {MODULES.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
              </TextField>
              <TextField label="Type" select value={form.type} fullWidth
                onChange={(e) => setField('type', e.target.value)}>
                <MenuItem value=""><em>Select…</em></MenuItem>
                {TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </TextField>
            </Stack>

            <Stack direction="row" spacing={2}>
              <TextField label="Priority" select value={form.priority} fullWidth
                onChange={(e) => setField('priority', e.target.value)}>
                {PRIORITIES_LIST.map((p) => (
                  <MenuItem key={p} value={p} sx={{ textTransform: 'capitalize' }}>{p}</MenuItem>
                ))}
              </TextField>
              <TextField label="Severity" select value={form.severity} fullWidth
                onChange={(e) => setField('severity', e.target.value)}>
                {SEVERITIES.map((s) => (
                  <MenuItem key={s} value={s} sx={{ textTransform: 'capitalize' }}>{s}</MenuItem>
                ))}
              </TextField>
            </Stack>

            <TextField label="Page URL (optional)" placeholder="https://…"
              value={form.url} fullWidth onChange={(e) => setField('url', e.target.value)} />

            <TextField label="Internal notes (optional)" value={form.comments}
              fullWidth multiline rows={2}
              onChange={(e) => setField('comments', e.target.value)} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={closeDialog} disabled={submitting}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit}
            disabled={submitting || !form.title.trim()}
            startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : undefined}>
            {submitting ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

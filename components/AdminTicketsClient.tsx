'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
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

// ── Constants ──────────────────────────────────────────────────────────────

const STATUSES = ['new', 'in_progress', 'on_hold', 'ready_for_testing', 'approved', 'closed'] as const;

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  new:              { label: 'New',              color: '#64748b', bg: '#f1f5f9' },
  in_progress:      { label: 'In Progress',      color: '#1d4ed8', bg: '#eff6ff' },
  on_hold:          { label: 'On Hold',          color: '#7c3aed', bg: '#f5f3ff' },
  ready_for_testing:{ label: 'Ready for Test',   color: '#b45309', bg: '#fffbeb' },
  approved:         { label: 'Approved',         color: '#15803d', bg: '#f0fdf4' },
  closed:           { label: 'Closed',           color: '#374151', bg: '#f9fafb' },
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
    <Box
      sx={{
        display: 'inline-flex', alignItems: 'center',
        px: size === 'md' ? 1.25 : 1,
        py: size === 'md' ? 0.5 : 0.25,
        borderRadius: '6px',
        bgcolor: m.bg,
        color: m.color,
        fontSize: size === 'md' ? 12 : 11,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        lineHeight: 1.5,
      }}
    >
      {m.label}
    </Box>
  );
}

function TypeBadge({ type }: { type: string | null }) {
  if (!type) return <Typography variant="caption" color="text.disabled">—</Typography>;
  const m = TYPE_META[type] ?? { color: '#64748b', bg: '#f1f5f9' };
  return (
    <Box
      sx={{
        display: 'inline-flex', alignItems: 'center',
        px: 1, py: 0.25, borderRadius: '6px',
        bgcolor: m.bg, color: m.color,
        fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', lineHeight: 1.5,
      }}
    >
      {type}
    </Box>
  );
}

// ── Component ──────────────────────────────────────────────────────────────

export function AdminTicketsClient() {
  const [tickets,     setTickets]     = useState<EnrichedTicket[]>([]);
  const [users,       setUsers]       = useState<AdminUser[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [companyTab,  setCompanyTab]  = useState('all');
  const [statusF,     setStatusF]     = useState('');
  const [priorityF,   setPriorityF]   = useState('');

  // Drawer
  const [drawerId,    setDrawerId]    = useState<string | null>(null);
  const [drawerCmts,  setDrawerCmts]  = useState<Comment[]>([]);
  const [commentTxt,  setCommentTxt]  = useState('');
  const [sendingCmt,  setSendingCmt]  = useState(false);
  const [updatingId,  setUpdatingId]  = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── Load ───────────────────────────────────────────────────────────────

  useEffect(() => {
    fetch('/api/admin/tickets')
      .then((r) => r.json())
      .then((d) => {
        if (d && Array.isArray(d.tickets)) {
          setTickets(d.tickets);
          setUsers(d.users ?? []);
        } else if (Array.isArray(d)) {
          // backwards-compat with old API shape
          setTickets(d);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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
    return true;
  }), [tickets, companyTab, statusF, priorityF]);

  const stats = useMemo(() => {
    const c: Record<string, number> = {};
    STATUSES.forEach((s) => { c[s] = 0; });
    tickets.forEach((t) => { c[t.status] = (c[t.status] ?? 0) + 1; });
    return c;
  }, [tickets]);

  const drawerTicket = drawerId ? tickets.find((t) => t.id === drawerId) ?? null : null;

  const companyCounts = useMemo(() => {
    const c: Record<string, number> = { all: tickets.length };
    tickets.forEach((t) => {
      if (t.company_name) c[t.company_name] = (c[t.company_name] ?? 0) + 1;
    });
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
      {/* ── Header ─────────────────────────────────────────────────── */}
      <Stack direction="row" alignItems="baseline" spacing={1.5} mb={3}>
        <Typography variant="h5" fontWeight={700}>Issues</Typography>
        <Typography variant="body2" color="text.secondary">
          {loading ? '—' : `${tickets.length} total`}
        </Typography>
      </Stack>

      {/* ── Status stat pills ──────────────────────────────────────── */}
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mb={3}>
        {STATUSES.map((s) => {
          const m = STATUS_META[s];
          const active = statusF === s;
          return (
            <Box
              key={s}
              onClick={() => setStatusF((p) => p === s ? '' : s)}
              sx={{
                px: 1.5, py: 0.75, borderRadius: '8px', cursor: 'pointer',
                border: '1px solid',
                borderColor: active ? m.color : 'divider',
                bgcolor: active ? m.bg : 'transparent',
                transition: 'all .12s',
                '&:hover': { borderColor: m.color, bgcolor: m.bg },
              }}
            >
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

      {/* ── Company tabs + Priority filter ─────────────────────────── */}
      <Stack direction="row" alignItems="center" justifyContent="space-between"
        flexWrap="wrap" useFlexGap spacing={1} mb={2}>
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
          {(['all', ...companies]).map((c) => (
            <Chip
              key={c}
              label={`${c === 'all' ? 'All' : c} (${companyCounts[c] ?? 0})`}
              size="small"
              onClick={() => setCompanyTab(c)}
              color={companyTab === c ? 'primary' : 'default'}
              variant={companyTab === c ? 'filled' : 'outlined'}
              sx={{ fontSize: 12 }}
            />
          ))}
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          {(['', 'high', 'medium', 'low'] as const).map((p) => (
            <Box
              key={p}
              onClick={() => setPriorityF((prev) => prev === p ? '' : p)}
              sx={{
                display: 'flex', alignItems: 'center', gap: 0.5,
                px: 1, py: 0.5, borderRadius: '6px', cursor: 'pointer',
                border: '1px solid',
                borderColor: priorityF === p ? (PRIORITY_COLOR[p] ?? 'divider') : 'divider',
                bgcolor: priorityF === p ? (PRIORITY_COLOR[p] ?? 'transparent') + '18' : 'transparent',
                '&:hover': { borderColor: PRIORITY_COLOR[p] ?? 'text.secondary' },
              }}
            >
              {p ? (
                <>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: PRIORITY_COLOR[p] }} />
                  <Typography sx={{ fontSize: 11, fontWeight: 600, textTransform: 'capitalize' }}>{p}</Typography>
                </>
              ) : (
                <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>All priority</Typography>
              )}
            </Box>
          ))}
        </Stack>
      </Stack>

      {/* ── Table ──────────────────────────────────────────────────── */}
      {loading ? (
        <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress size={28} /></Box>
      ) : filtered.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 6, textAlign: 'center' }}>
          No issues found
        </Typography>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
          {/* Table head */}
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: '56px 12px 1fr 100px 130px 120px 60px 28px',
            px: 2, py: 1,
            bgcolor: 'action.hover',
            borderBottom: '1px solid', borderColor: 'divider',
            gap: 1.5,
          }}>
            {['#', '', 'Issue / Company', 'Type', 'Assignee', 'Status', 'Date', ''].map((h, i) => (
              <Typography key={i} variant="caption" fontWeight={700} color="text.secondary"
                sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {h}
              </Typography>
            ))}
          </Box>

          {/* Rows */}
          {filtered.map((t, idx) => (
            <Box key={t.id}>
              <Box
                onClick={() => setDrawerId(t.id)}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '56px 12px 1fr 100px 130px 120px 60px 28px',
                  px: 2, py: 1.25, gap: 1.5,
                  cursor: 'pointer', alignItems: 'center',
                  '&:hover': { bgcolor: 'action.hover' },
                  transition: 'background .1s',
                }}
              >
                {/* Ticket number */}
                <Typography variant="caption" fontWeight={600}
                  sx={{ color: 'text.disabled', fontFamily: 'monospace', fontSize: 11 }}>
                  {ticketNum(t.ticket_number) ?? '—'}
                </Typography>

                {/* Priority dot */}
                <Tooltip title={`${t.priority} priority`} placement="top">
                  <Box sx={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    bgcolor: PRIORITY_COLOR[t.priority] ?? '#aaa',
                  }} />
                </Tooltip>

                {/* Title + company/project */}
                <Box sx={{ overflow: 'hidden' }}>
                  <Typography variant="body2" fontWeight={500}
                    sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary"
                    sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                    {[t.company_name, t.project_name].filter(Boolean).join(' · ') || t.created_by_email}
                  </Typography>
                </Box>

                {/* Type */}
                <Box><TypeBadge type={t.type} /></Box>

                {/* Assignee */}
                <Box onClick={(e) => e.stopPropagation()}>
                  <Select
                    size="small"
                    value={t.assigned_to ?? ''}
                    onChange={(e) => changeAssignee(t.id, e.target.value || null)}
                    displayEmpty
                    sx={{ fontSize: 11, height: 26, minWidth: 120,
                      '& .MuiSelect-select': { py: 0.25, px: 1, display: 'flex', alignItems: 'center', gap: 0.5 } }}
                    renderValue={(v) => v ? (
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Avatar sx={{ width: 16, height: 16, fontSize: 10, bgcolor: 'primary.main' }}>
                          {initials(users.find((u) => u.id === v)?.email ?? '')}
                        </Avatar>
                        <Typography sx={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 80 }}>
                          {users.find((u) => u.id === v)?.email?.split('@')[0] ?? '—'}
                        </Typography>
                      </Stack>
                    ) : (
                      <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>Unassigned</Typography>
                    )}
                  >
                    <MenuItem value=""><em style={{ fontSize: 11 }}>Unassigned</em></MenuItem>
                    {users.map((u) => (
                      <MenuItem key={u.id} value={u.id} sx={{ fontSize: 11 }}>
                        <Stack direction="row" spacing={0.75} alignItems="center">
                          <Avatar sx={{ width: 18, height: 18, fontSize: 10, bgcolor: 'primary.main' }}>
                            {initials(u.email)}
                          </Avatar>
                          {u.email}
                        </Stack>
                      </MenuItem>
                    ))}
                  </Select>
                </Box>

                {/* Status */}
                <Box onClick={(e) => e.stopPropagation()}>
                  <Select
                    size="small"
                    value={t.status}
                    disabled={updatingId === t.id}
                    onChange={(e) => changeStatus(t.id, e.target.value)}
                    sx={{ fontSize: 11, height: 26, minWidth: 118,
                      '& .MuiSelect-select': { py: 0.25, px: 0.5 },
                      '& .MuiOutlinedInput-notchedOutline': { border: 'none' } }}
                    renderValue={(v) => <StatusBadge status={v} />}
                  >
                    {STATUSES.map((s) => (
                      <MenuItem key={s} value={s} sx={{ fontSize: 12 }}>
                        <StatusBadge status={s} size="md" />
                      </MenuItem>
                    ))}
                  </Select>
                </Box>

                {/* Date */}
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                  {fmtDate(t.created_at)}
                </Typography>

                {/* Open link */}
                <Box onClick={(e) => e.stopPropagation()}>
                  {t.company_slug && t.project_slug && (
                    <Tooltip title="Open in project" placement="left">
                      <IconButton size="small"
                        component="a"
                        href={`/${t.company_slug}/${t.project_slug}?tab=issues&issue=${t.id}`}
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

      {/* ── Detail drawer (no backdrop) ─────────────────────────── */}
      <Drawer
        anchor="right"
        open={!!drawerTicket}
        onClose={() => setDrawerId(null)}
        hideBackdrop
        variant="persistent"
        PaperProps={{
          sx: {
            width: { xs: '100vw', sm: 460 },
            display: 'flex', flexDirection: 'column',
            boxShadow: '-4px 0 24px rgba(0,0,0,.08)',
            borderLeft: '1px solid', borderColor: 'divider',
          },
        }}
      >
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
                  {drawerTicket.created_by_email && ` · ${drawerTicket.created_by_email}`}
                </Typography>
              </Box>
              <IconButton size="small" onClick={() => setDrawerId(null)} sx={{ flexShrink: 0 }}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Stack>

            <Box sx={{ flex: 1, overflowY: 'auto', px: 2.5, py: 2 }}>

              {/* ── Status segmented control ─────────────────────── */}
              <Typography variant="caption" fontWeight={600} color="text.disabled"
                sx={{ textTransform: 'uppercase', letterSpacing: 0.6, mb: 1, display: 'block' }}>
                Status
              </Typography>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap mb={2.5}>
                {STATUSES.map((s) => {
                  const m = STATUS_META[s];
                  const active = drawerTicket.status === s;
                  const loading = updatingId === drawerTicket.id;
                  return (
                    <Box
                      key={s}
                      onClick={() => !loading && changeStatus(drawerTicket.id, s)}
                      sx={{
                        px: 1.25, py: 0.5, borderRadius: '6px',
                        border: '1.5px solid',
                        borderColor: active ? m.color : 'divider',
                        bgcolor: active ? m.bg : 'transparent',
                        color: active ? m.color : 'text.secondary',
                        fontSize: 11, fontWeight: active ? 700 : 500,
                        cursor: loading ? 'default' : 'pointer',
                        opacity: loading ? 0.6 : 1,
                        transition: 'all .12s',
                        '&:hover': !loading ? { borderColor: m.color, color: m.color } : {},
                      }}
                    >
                      {m.label}
                    </Box>
                  );
                })}
              </Stack>

              {/* ── Quick actions ───────────────────────────────── */}
              <Stack direction="row" spacing={1} mb={2.5} flexWrap="wrap" useFlexGap>
                {drawerTicket.status === 'new' && (
                  <Button size="small" variant="outlined" startIcon={<span>▶</span>}
                    onClick={() => changeStatus(drawerTicket.id, 'in_progress')}>
                    Take
                  </Button>
                )}
                {drawerTicket.status === 'in_progress' && (
                  <Button size="small" variant="outlined" color="warning"
                    onClick={() => changeStatus(drawerTicket.id, 'ready_for_testing')}>
                    Mark done
                  </Button>
                )}
                {!['closed'].includes(drawerTicket.status) && (
                  <Button size="small" variant="outlined" color="error"
                    onClick={() => changeStatus(drawerTicket.id, 'closed')}>
                    Close
                  </Button>
                )}
                {drawerTicket.company_slug && drawerTicket.project_slug && (
                  <Button size="small" variant="text" endIcon={<OpenInNewIcon sx={{ fontSize: 13 }} />}
                    component="a"
                    href={`/${drawerTicket.company_slug}/${drawerTicket.project_slug}?tab=issues&issue=${drawerTicket.id}`}
                    target="_blank" rel="noopener">
                    Open in project
                  </Button>
                )}
              </Stack>

              {/* ── Assignee ─────────────────────────────────────── */}
              <Box mb={2}>
                <Typography variant="caption" fontWeight={600} color="text.disabled"
                  sx={{ textTransform: 'uppercase', letterSpacing: 0.6, mb: 0.75, display: 'block' }}>
                  Assignee
                </Typography>
                <Select
                  size="small"
                  fullWidth
                  value={drawerTicket.assigned_to ?? ''}
                  onChange={(e) => changeAssignee(drawerTicket.id, e.target.value || null)}
                  displayEmpty
                  sx={{ fontSize: 13 }}
                  renderValue={(v) => v ? (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Avatar sx={{ width: 22, height: 22, fontSize: 11, bgcolor: 'primary.main' }}>
                        {initials(users.find((u) => u.id === v)?.email ?? '')}
                      </Avatar>
                      <Typography sx={{ fontSize: 13 }}>
                        {users.find((u) => u.id === v)?.email ?? '—'}
                      </Typography>
                    </Stack>
                  ) : <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Unassigned</Typography>}
                >
                  <MenuItem value=""><em>Unassigned</em></MenuItem>
                  {users.map((u) => (
                    <MenuItem key={u.id} value={u.id}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Avatar sx={{ width: 22, height: 22, fontSize: 11, bgcolor: 'primary.main' }}>
                          {initials(u.email)}
                        </Avatar>
                        {u.email}
                      </Stack>
                    </MenuItem>
                  ))}
                </Select>
              </Box>

              {/* ── Meta grid ────────────────────────────────────── */}
              <Paper variant="outlined" sx={{ borderRadius: 2, p: 1.5, mb: 2 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                  {([
                    ['Priority', <Box key="p" sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: PRIORITY_COLOR[drawerTicket.priority] ?? '#aaa' }} />
                      <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>{drawerTicket.priority}</Typography>
                    </Box>],
                    ['Severity',  <Typography key="s" variant="body2" sx={{ textTransform: 'capitalize' }}>{drawerTicket.severity}</Typography>],
                    ['Module',    <Typography key="m" variant="body2">{drawerTicket.module ?? '—'}</Typography>],
                    ['Reporter',  <Typography key="r" variant="body2" sx={{ wordBreak: 'break-all' }}>{drawerTicket.created_by_email || '—'}</Typography>],
                    ['Created',   <Typography key="c" variant="body2">{fmtDate(drawerTicket.created_at)}</Typography>],
                    ['Updated',   <Typography key="u" variant="body2">{fmtDate(drawerTicket.updated_at)}</Typography>],
                  ] as [string, React.ReactNode][]).map(([label, value]) => (
                    <Box key={label}>
                      <Typography variant="caption" color="text.disabled">{label}</Typography>
                      <Box sx={{ mt: 0.25 }}>{value}</Box>
                    </Box>
                  ))}
                </Box>
              </Paper>

              {/* Description */}
              {drawerTicket.description && (
                <Box mb={2}>
                  <Typography variant="caption" fontWeight={600} color="text.disabled"
                    sx={{ textTransform: 'uppercase', letterSpacing: 0.6, display: 'block', mb: 0.5 }}>
                    Description
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {drawerTicket.description}
                  </Typography>
                </Box>
              )}

              {/* URL */}
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

              {/* Screenshot */}
              {drawerTicket.screenshot_path && (
                <Box mb={2}>
                  <Typography variant="caption" fontWeight={600} color="text.disabled"
                    sx={{ textTransform: 'uppercase', letterSpacing: 0.6, display: 'block', mb: 0.5 }}>
                    Screenshot
                  </Typography>
                  <Box
                    component="img"
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

              {/* Internal notes */}
              {drawerTicket.comments && (
                <Box mb={2}>
                  <Typography variant="caption" fontWeight={600} color="text.disabled"
                    sx={{ textTransform: 'uppercase', letterSpacing: 0.6, display: 'block', mb: 0.5 }}>
                    Notes
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {drawerTicket.comments}
                  </Typography>
                </Box>
              )}

              <Divider sx={{ mb: 2 }} />

              {/* Comments */}
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
                <TextField
                  size="small" fullWidth
                  placeholder="Write a comment…"
                  value={commentTxt}
                  onChange={(e) => setCommentTxt(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendComment(); } }}
                  multiline maxRows={4}
                />
                <IconButton color="primary" disabled={!commentTxt.trim() || sendingCmt} onClick={sendComment}>
                  <SendIcon fontSize="small" />
                </IconButton>
              </Stack>
            </Box>
          </>
        )}
      </Drawer>
    </Box>
  );
}

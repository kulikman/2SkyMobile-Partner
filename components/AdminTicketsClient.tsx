'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
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
import SearchIcon from '@mui/icons-material/Search';
import SendIcon from '@mui/icons-material/Send';

// ── Types ──────────────────────────────────────────────────────────────────

type EnrichedTicket = {
  id: string;
  folder_id: string;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  status: string;
  priority: string;
  severity: string;
  type: string | null;
  module: string | null;
  url: string | null;
  screenshot_path: string | null;
  created_by: string | null;
  created_by_email: string;
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

const STATUS_LABEL: Record<string, string> = {
  new:              'New',
  in_progress:      'In Progress',
  on_hold:          'On Hold',
  ready_for_testing:'Ready for Testing',
  approved:         'Approved',
  closed:           'Closed',
};

type ChipColor = 'default' | 'primary' | 'warning' | 'info' | 'success' | 'error';

const STATUS_COLOR: Record<string, ChipColor> = {
  new:              'default',
  in_progress:      'primary',
  on_hold:          'warning',
  ready_for_testing:'info',
  approved:         'success',
  closed:           'success',
};

const PRIORITY_COLOR: Record<string, ChipColor> = {
  high:   'error',
  medium: 'warning',
  low:    'success',
};

const PRIORITY_DOT: Record<string, string> = {
  high: '#ef4444', medium: '#f59e0b', low: '#22c55e',
};

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
}

// ── Component ──────────────────────────────────────────────────────────────

export function AdminTicketsClient() {
  const [tickets, setTickets]   = useState<EnrichedTicket[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search,  setSearch]    = useState('');
  const [statusF, setStatusF]   = useState('');
  const [priorityF, setPriorityF] = useState('');
  const [companyF, setCompanyF] = useState('');

  // Drawer
  const [drawerId,  setDrawerId]  = useState<string | null>(null);
  const [comments,  setComments]  = useState<Comment[]>([]);
  const [commentTxt, setCommentTxt] = useState('');
  const [sendingCmt, setSendingCmt] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── Load all tickets ───────────────────────────────────────────────────

  useEffect(() => {
    fetch('/api/admin/tickets')
      .then((r) => r.json())
      .then((d) => { setTickets(Array.isArray(d) ? d : []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // ── Load comments when drawer opens ───────────────────────────────────

  useEffect(() => {
    if (!drawerId) return;
    setComments([]);
    fetch(`/api/ticket-comments?ticketId=${drawerId}`)
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setComments(d); })
      .catch(() => {});
  }, [drawerId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  // ── Derived data ───────────────────────────────────────────────────────

  const companies = useMemo(
    () => [...new Set(tickets.map((t) => t.company_name).filter(Boolean))].sort() as string[],
    [tickets],
  );

  const filtered = useMemo(() => tickets.filter((t) => {
    if (statusF   && t.status   !== statusF)   return false;
    if (priorityF && t.priority !== priorityF) return false;
    if (companyF  && t.company_name !== companyF) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !t.title.toLowerCase().includes(q) &&
        !(t.company_name ?? '').toLowerCase().includes(q) &&
        !(t.project_name ?? '').toLowerCase().includes(q) &&
        !(t.created_by_email).toLowerCase().includes(q)
      ) return false;
    }
    return true;
  }), [tickets, statusF, priorityF, companyF, search]);

  const stats = useMemo(() => {
    const counts: Record<string, number> = {};
    STATUSES.forEach((s) => { counts[s] = 0; });
    tickets.forEach((t) => { counts[t.status] = (counts[t.status] ?? 0) + 1; });
    return counts;
  }, [tickets]);

  const drawerTicket = drawerId ? tickets.find((t) => t.id === drawerId) ?? null : null;

  // ── Actions ────────────────────────────────────────────────────────────

  const changeStatus = useCallback(async (ticketId: string, newStatus: string) => {
    setUpdatingId(ticketId);
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setTickets((prev) => prev.map((t) => t.id === ticketId ? { ...t, status: newStatus } : t));
      }
    } finally {
      setUpdatingId(null);
    }
  }, []);

  const sendComment = useCallback(async () => {
    if (!drawerId || !commentTxt.trim()) return;
    setSendingCmt(true);
    try {
      const res = await fetch('/api/ticket-comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_id: drawerId, content: commentTxt.trim() }),
      });
      if (res.ok) {
        const c = await res.json();
        setComments((prev) => [...prev, c]);
        setCommentTxt('');
      }
    } finally {
      setSendingCmt(false);
    }
  }, [drawerId, commentTxt]);

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>

      {/* Page header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={700}>All Issues</Typography>
          <Typography variant="body2" color="text.secondary">
            {loading ? '—' : `${tickets.length} total across all projects`}
          </Typography>
        </Box>
      </Stack>

      {/* Stats row */}
      <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap mb={3}>
        {STATUSES.map((s) => (
          <Paper
            key={s}
            variant="outlined"
            onClick={() => setStatusF((prev) => prev === s ? '' : s)}
            sx={{
              px: 2, py: 1, borderRadius: 2, cursor: 'pointer', minWidth: 90,
              textAlign: 'center',
              borderColor: statusF === s ? 'primary.main' : 'divider',
              bgcolor: statusF === s ? 'primary.50' : 'transparent',
              transition: 'all .15s',
              '&:hover': { borderColor: 'primary.main' },
            }}
          >
            <Typography variant="h6" fontWeight={700} lineHeight={1}>{stats[s] ?? 0}</Typography>
            <Typography variant="caption" color="text.secondary">{STATUS_LABEL[s]}</Typography>
          </Paper>
        ))}
      </Stack>

      {/* Filter bar */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mb={2} flexWrap="wrap" useFlexGap>
        <TextField
          size="small"
          placeholder="Search issues, project, reporter…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
          }}
          sx={{ minWidth: 260, flex: 1 }}
        />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Status</InputLabel>
          <Select value={statusF} label="Status" onChange={(e) => setStatusF(e.target.value)}>
            <MenuItem value="">All</MenuItem>
            {STATUSES.map((s) => <MenuItem key={s} value={s}>{STATUS_LABEL[s]}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Priority</InputLabel>
          <Select value={priorityF} label="Priority" onChange={(e) => setPriorityF(e.target.value)}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="high">High</MenuItem>
            <MenuItem value="medium">Medium</MenuItem>
            <MenuItem value="low">Low</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Company</InputLabel>
          <Select value={companyF} label="Company" onChange={(e) => setCompanyF(e.target.value)}>
            <MenuItem value="">All</MenuItem>
            {companies.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </Select>
        </FormControl>
        {(statusF || priorityF || companyF || search) && (
          <Button size="small" variant="text" onClick={() => { setStatusF(''); setPriorityF(''); setCompanyF(''); setSearch(''); }}>
            Clear filters
          </Button>
        )}
      </Stack>

      {/* Table */}
      {loading ? (
        <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress size={32} /></Box>
      ) : filtered.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 6, textAlign: 'center' }}>
          No issues found
        </Typography>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
          {/* Table header */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: '32px 1fr 140px 80px 160px 130px 90px 36px',
              px: 2, py: 1,
              bgcolor: 'action.hover',
              borderBottom: 1, borderColor: 'divider',
            }}
          >
            {['', 'Issue', 'Company / Project', 'Type', 'Reporter', 'Status', 'Date', ''].map((h, i) => (
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
                  gridTemplateColumns: '32px 1fr 140px 80px 160px 130px 90px 36px',
                  px: 2, py: 1.25,
                  cursor: 'pointer',
                  alignItems: 'center',
                  '&:hover': { bgcolor: 'action.hover' },
                  transition: 'background .1s',
                }}
              >
                {/* Priority dot */}
                <Box>
                  <Tooltip title={`${t.priority} priority`} placement="top">
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: PRIORITY_DOT[t.priority] ?? '#aaa' }} />
                  </Tooltip>
                </Box>

                {/* Title */}
                <Typography variant="body2" fontWeight={500}
                  sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', pr: 2 }}>
                  {t.title}
                </Typography>

                {/* Company / Project */}
                <Box sx={{ overflow: 'hidden' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.company_name ?? '—'}
                  </Typography>
                  <Typography variant="caption" color="text.disabled" sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.project_name ?? '—'}
                  </Typography>
                </Box>

                {/* Type */}
                {t.type ? (
                  <Chip label={t.type} size="small" variant="outlined"
                    sx={{ fontSize: 10, height: 20, maxWidth: 76 }} />
                ) : (
                  <Typography variant="caption" color="text.disabled">—</Typography>
                )}

                {/* Reporter */}
                <Typography variant="caption" color="text.secondary"
                  sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.created_by_email || '—'}
                </Typography>

                {/* Status */}
                <Box onClick={(e) => e.stopPropagation()}>
                  <Select
                    size="small"
                    value={t.status}
                    disabled={updatingId === t.id}
                    onChange={(e) => changeStatus(t.id, e.target.value)}
                    sx={{ fontSize: 12, height: 28, minWidth: 128,
                      '& .MuiSelect-select': { py: 0.25, px: 1 } }}
                    renderValue={(v) => (
                      <Chip label={STATUS_LABEL[v] ?? v} size="small"
                        color={STATUS_COLOR[v] ?? 'default'}
                        sx={{ fontSize: 10, height: 20, cursor: 'pointer' }} />
                    )}
                  >
                    {STATUSES.map((s) => (
                      <MenuItem key={s} value={s}>
                        <Chip label={STATUS_LABEL[s]} size="small"
                          color={STATUS_COLOR[s] ?? 'default'}
                          sx={{ fontSize: 11, height: 20 }} />
                      </MenuItem>
                    ))}
                  </Select>
                </Box>

                {/* Date */}
                <Typography variant="caption" color="text.secondary">
                  {fmtDate(t.created_at)}
                </Typography>

                {/* External link */}
                <Box onClick={(e) => e.stopPropagation()}>
                  {t.company_slug && t.project_slug && (
                    <Tooltip title="Open project" placement="left">
                      <IconButton
                        size="small"
                        component="a"
                        href={`/${t.company_slug}/${t.project_slug}?tab=issues&issue=${t.id}`}
                        target="_blank"
                        rel="noopener"
                      >
                        <OpenInNewIcon sx={{ fontSize: 14 }} />
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

      {/* Detail drawer */}
      <Drawer
        anchor="right"
        open={!!drawerTicket}
        onClose={() => setDrawerId(null)}
        PaperProps={{ sx: { width: { xs: '100vw', sm: 480 }, display: 'flex', flexDirection: 'column' } }}
      >
        {drawerTicket && (
          <>
            {/* Drawer header */}
            <Stack
              direction="row"
              alignItems="flex-start"
              justifyContent="space-between"
              spacing={1}
              sx={{ px: 2.5, pt: 2, pb: 1.5, borderBottom: 1, borderColor: 'divider' }}
            >
              <Box sx={{ flex: 1 }}>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mb={0.5}>
                  {drawerTicket.type && (
                    <Chip label={drawerTicket.type} size="small"
                      color={PRIORITY_COLOR[drawerTicket.priority] ?? 'default'} />
                  )}
                  {drawerTicket.module && (
                    <Chip label={drawerTicket.module} size="small" variant="outlined" />
                  )}
                </Stack>
                <Typography variant="subtitle1" fontWeight={700} lineHeight={1.3}>
                  {drawerTicket.title}
                </Typography>
                <Stack direction="row" spacing={0.5} alignItems="center" mt={0.5} flexWrap="wrap">
                  <Typography variant="caption" color="text.secondary">
                    {drawerTicket.company_name}
                  </Typography>
                  {drawerTicket.project_name && (
                    <>
                      <Typography variant="caption" color="text.disabled">·</Typography>
                      <Typography variant="caption" color="text.secondary">{drawerTicket.project_name}</Typography>
                    </>
                  )}
                  <Typography variant="caption" color="text.disabled">·</Typography>
                  <Typography variant="caption" color="text.secondary">{drawerTicket.created_by_email}</Typography>
                </Stack>
              </Box>
              <IconButton size="small" onClick={() => setDrawerId(null)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Stack>

            <Box sx={{ flex: 1, overflowY: 'auto', px: 2.5, py: 2 }}>

              {/* Status + quick actions */}
              <Stack direction="row" spacing={1} alignItems="center" mb={2} flexWrap="wrap" useFlexGap>
                <Select
                  size="small"
                  value={drawerTicket.status}
                  disabled={updatingId === drawerTicket.id}
                  onChange={(e) => changeStatus(drawerTicket.id, e.target.value)}
                  sx={{ fontSize: 13, minWidth: 160 }}
                  renderValue={(v) => (
                    <Chip label={STATUS_LABEL[v] ?? v} size="small"
                      color={STATUS_COLOR[v] ?? 'default'} sx={{ cursor: 'pointer' }} />
                  )}
                >
                  {STATUSES.map((s) => (
                    <MenuItem key={s} value={s}>
                      <Chip label={STATUS_LABEL[s]} size="small" color={STATUS_COLOR[s] ?? 'default'} />
                    </MenuItem>
                  ))}
                </Select>

                {drawerTicket.status === 'new' && (
                  <Button size="small" variant="outlined" startIcon={<span>▶</span>}
                    onClick={() => changeStatus(drawerTicket.id, 'in_progress')}>
                    Take
                  </Button>
                )}
                {drawerTicket.status === 'in_progress' && (
                  <Button size="small" variant="outlined" color="success"
                    onClick={() => changeStatus(drawerTicket.id, 'ready_for_testing')}>
                    Mark done
                  </Button>
                )}
                {!['closed', 'approved'].includes(drawerTicket.status) && (
                  <Button size="small" variant="outlined" color="error"
                    onClick={() => changeStatus(drawerTicket.id, 'closed')}>
                    Close
                  </Button>
                )}
              </Stack>

              {/* Meta grid */}
              <Paper variant="outlined" sx={{ borderRadius: 2, p: 1.5, mb: 2 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                  {[
                    ['Priority', <Chip key="p" label={drawerTicket.priority} size="small" color={PRIORITY_COLOR[drawerTicket.priority] ?? 'default'} />],
                    ['Severity', <Typography key="s" variant="body2">{drawerTicket.severity}</Typography>],
                    ['Type',     <Typography key="t" variant="body2">{drawerTicket.type ?? '—'}</Typography>],
                    ['Module',   <Typography key="m" variant="body2">{drawerTicket.module ?? '—'}</Typography>],
                    ['Reported', <Typography key="d" variant="body2">{fmtDate(drawerTicket.created_at)}</Typography>],
                    ['Updated',  <Typography key="u" variant="body2">{fmtDate(drawerTicket.updated_at)}</Typography>],
                  ].map(([label, value]) => (
                    <Box key={String(label)}>
                      <Typography variant="caption" color="text.disabled">{String(label)}</Typography>
                      <Box>{value}</Box>
                    </Box>
                  ))}
                </Box>
              </Paper>

              {/* Description */}
              {drawerTicket.description && (
                <Box mb={2}>
                  <Typography variant="caption" color="text.disabled" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Description
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
                    {drawerTicket.description}
                  </Typography>
                </Box>
              )}

              {/* URL */}
              {drawerTicket.url && (
                <Box mb={2}>
                  <Typography variant="caption" color="text.disabled" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    URL
                  </Typography>
                  <Link href={drawerTicket.url} target="_blank" rel="noopener" variant="body2"
                    sx={{ display: 'block', mt: 0.5, wordBreak: 'break-all' }}>
                    {drawerTicket.url}
                  </Link>
                </Box>
              )}

              {/* Screenshot */}
              {drawerTicket.screenshot_path && (
                <Box mb={2}>
                  <Typography variant="caption" color="text.disabled" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Screenshot
                  </Typography>
                  <Box
                    component="img"
                    src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/ticket-screenshots/${drawerTicket.screenshot_path}`}
                    alt="Screenshot"
                    sx={{ mt: 0.5, width: '100%', borderRadius: 1.5, border: 1, borderColor: 'divider', cursor: 'pointer' }}
                    onClick={() => window.open(
                      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/ticket-screenshots/${drawerTicket.screenshot_path}`,
                      '_blank'
                    )}
                  />
                </Box>
              )}

              {/* Internal notes */}
              {drawerTicket.comments && (
                <Box mb={2}>
                  <Typography variant="caption" color="text.disabled" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Notes
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
                    {drawerTicket.comments}
                  </Typography>
                </Box>
              )}

              {/* Go to project */}
              {drawerTicket.company_slug && drawerTicket.project_slug && (
                <Button
                  size="small"
                  variant="outlined"
                  endIcon={<OpenInNewIcon fontSize="small" />}
                  component="a"
                  href={`/${drawerTicket.company_slug}/${drawerTicket.project_slug}?tab=issues&issue=${drawerTicket.id}`}
                  target="_blank"
                  rel="noopener"
                  sx={{ mb: 2 }}
                >
                  Open in project
                </Button>
              )}

              <Divider sx={{ mb: 2 }} />

              {/* Comments */}
              <Typography variant="caption" color="text.disabled" fontWeight={600}
                sx={{ textTransform: 'uppercase', letterSpacing: 0.5, mb: 1, display: 'block' }}>
                Comments
              </Typography>
              {comments.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>No comments yet.</Typography>
              ) : (
                <Stack spacing={1.5} mb={2}>
                  {comments.map((c) => (
                    <Box key={c.id}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="caption" fontWeight={600}>{c.author_name}</Typography>
                        <Typography variant="caption" color="text.disabled">{fmtDate(c.created_at)}</Typography>
                      </Stack>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{c.content}</Typography>
                    </Box>
                  ))}
                  <div ref={bottomRef} />
                </Stack>
              )}
            </Box>

            {/* Comment input */}
            <Box sx={{ px: 2.5, py: 2, borderTop: 1, borderColor: 'divider' }}>
              <Stack direction="row" spacing={1}>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Write a comment…"
                  value={commentTxt}
                  onChange={(e) => setCommentTxt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendComment(); }
                  }}
                  multiline
                  maxRows={4}
                />
                <IconButton
                  color="primary"
                  disabled={!commentTxt.trim() || sendingCmt}
                  onClick={sendComment}
                >
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

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
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
import ChatBubbleIcon from '@mui/icons-material/ChatBubble';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import LinkIcon from '@mui/icons-material/Link';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import SendIcon from '@mui/icons-material/Send';
import UploadIcon from '@mui/icons-material/Upload';
import { createClient } from '@/lib/supabase/client';

// ── Constants ────────────────────────────────────────────────────────────────

const MODULES = [
  'Partner Management', 'Users', 'Users Management', 'Billing Management',
  'Rates Management', 'Roles Management', 'Sponsors Management',
  'Providers Management', 'Providers Integration', 'Entire Platform', 'Other',
];

const TYPES = ['Bug', 'Missing Feature', 'Clarification'];

const PRIORITIES: { value: string; label: string; color: string }[] = [
  { value: 'high',   label: 'High',   color: '#c62828' },
  { value: 'medium', label: 'Medium', color: '#f57c00' },
  { value: 'low',    label: 'Low',    color: '#388e3c' },
];

const SEVERITIES: { value: string; label: string }[] = [
  { value: 'major',    label: 'Major' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'minor',    label: 'Minor' },
];

const STATUSES: { value: string; label: string; color: string }[] = [
  { value: 'new',               label: 'New',               color: '#9e9e9e' },
  { value: 'in_progress',       label: 'In Progress',       color: '#1976d2' },
  { value: 'on_hold',           label: 'On Hold',           color: '#7b1fa2' },
  { value: 'ready_for_testing', label: 'Ready for Testing', color: '#f57c00' },
  { value: 'approved',          label: 'Approved',          color: '#388e3c' },
  { value: 'closed',            label: 'Closed',            color: '#616161' },
];

const TYPE_COLORS: Record<string, string> = {
  'Bug':             '#c62828',
  'Missing Feature': '#f57c00',
  'Clarification':   '#1976d2',
};

// ── Types ────────────────────────────────────────────────────────────────────

type TicketComment = {
  id: string;
  ticket_id: string;
  user_id: string | null;
  author_name: string;
  content: string;
  created_at: string;
};

type CurrentUser = { id: string; email: string; name: string };

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
  ticket_number: number | null;
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
  return STATUSES.find((s) => s.value === value) ?? { label: value, color: '#9e9e9e' };
}

function ticketNum(n: number | null | undefined) {
  if (!n) return null;
  return `#${String(n).padStart(3, '0')}`;
}

function TypeChip({ type }: { type: string | null }) {
  if (!type) return null;
  const color = TYPE_COLORS[type] ?? '#9e9e9e';
  return (
    <Chip
      label={type}
      size="small"
      variant="outlined"
      sx={{
        fontSize: 11, fontWeight: 600, height: 22,
        borderRadius: '999px',
        borderColor: color + '66',
        color,
        bgcolor: color + '11',
      }}
    />
  );
}

// ── Issue Drawer ──────────────────────────────────────────────────────────────

function IssueDrawer({
  ticket,
  comments,
  currentUser,
  isAdmin,
  sending,
  updatingStatus,
  onClose,
  onStatusChange,
  onEdit,
  onDelete,
  onSendComment,
  onOpenScreenshot,
}: {
  ticket: Ticket;
  comments: TicketComment[];
  currentUser: CurrentUser;
  isAdmin: boolean;
  sending: boolean;
  updatingStatus: boolean;
  onClose: () => void;
  onStatusChange: (status: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  onSendComment: (content: string) => Promise<void>;
  onOpenScreenshot: (path: string) => void;
}) {
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const [draft, setDraft] = useState('');
  const [sendError, setSendError] = useState('');
  const sm = statusMeta(ticket.status);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments.length]);

  async function handleSend() {
    if (!draft.trim()) return;
    setSendError('');
    const text = draft.trim();
    setDraft('');
    try {
      await onSendComment(text);
    } catch {
      setSendError('Failed to send. Try again.');
      setDraft(text); // restore draft on error
    }
  }

  return (
    <Box sx={{ width: 420, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ px: 2.5, pt: 2.5, pb: 1.5, borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
        <Stack direction="row" alignItems="flex-start" spacing={1}>
          <Box flex={1}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
              {ticketNum(ticket.ticket_number) && (
                <Typography variant="caption" fontWeight={700}
                  sx={{ fontFamily: 'monospace', color: 'text.disabled', letterSpacing: 0 }}>
                  {ticketNum(ticket.ticket_number)}
                </Typography>
              )}
              <TypeChip type={ticket.type} />
              {ticket.module && (
                <Typography variant="caption" color="text.secondary" noWrap>{ticket.module}</Typography>
              )}
            </Stack>
            <Typography variant="body2" fontWeight={700} sx={{ lineHeight: 1.4, mb: 1 }}>
              {ticket.title}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              {ticket.created_by_email}
            </Typography>
            {/* Status */}
            <Select
              value={ticket.status}
              onChange={(e) => onStatusChange(e.target.value)}
              size="small"
              disabled={updatingStatus}
              sx={{
                fontSize: 12, fontWeight: 600, height: 28, color: sm.color,
                '& .MuiOutlinedInput-notchedOutline': { borderColor: sm.color + '55' },
                '& .MuiSelect-icon': { color: sm.color },
              }}
            >
              {STATUSES.map((s) => (
                <MenuItem key={s.value} value={s.value} sx={{ fontSize: 12 }}>{s.label}</MenuItem>
              ))}
            </Select>
          </Box>
          <Stack direction="row" alignItems="center">
            {isAdmin && (
              <IconButton size="small" onClick={onEdit} sx={{ mr: 0.25 }}>
                <EditIcon sx={{ fontSize: 15 }} />
              </IconButton>
            )}
            {isAdmin && (
              <IconButton size="small" color="error" onClick={onDelete} sx={{ mr: 0.25 }}>
                <DeleteIcon sx={{ fontSize: 15 }} />
              </IconButton>
            )}
            <IconButton size="small" onClick={onClose}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>
      </Box>

      {/* Scrollable body */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 2.5, py: 2 }}>
        <Stack spacing={2}>

          {/* Quick actions */}
          {isAdmin && ticket.status === 'new' && (
            <Button size="small" variant="outlined" startIcon={<PlayArrowIcon />}
              onClick={() => onStatusChange('in_progress')} sx={{ alignSelf: 'flex-start', textTransform: 'none' }}>
              Take
            </Button>
          )}
          {isAdmin && ticket.status === 'in_progress' && (
            <Stack direction="row" spacing={1}>
              <Button size="small" variant="outlined" startIcon={<TaskAltIcon />}
                onClick={() => onStatusChange('ready_for_testing')} sx={{ textTransform: 'none' }}>
                Mark done
              </Button>
              <Button size="small" variant="outlined" startIcon={<PauseIcon />}
                onClick={() => onStatusChange('on_hold')} sx={{ textTransform: 'none' }}>
                On hold
              </Button>
            </Stack>
          )}
          {!isAdmin && ticket.status === 'ready_for_testing' && (
            <Button size="small" variant="outlined" color="success" startIcon={<CheckCircleIcon />}
              onClick={() => onStatusChange('approved')} sx={{ alignSelf: 'flex-start', textTransform: 'none' }}>
              Approve
            </Button>
          )}
          {isAdmin && ticket.status === 'approved' && (
            <Button size="small" variant="outlined" startIcon={<TaskAltIcon />}
              onClick={() => onStatusChange('closed')} sx={{ alignSelf: 'flex-start', textTransform: 'none' }}>
              Close
            </Button>
          )}

          {/* Description */}
          {ticket.description && (
            <Box>
              <Typography variant="caption" fontWeight={700} color="text.secondary"
                sx={{ textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', mb: 0.5 }}>
                Description
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: 'text.secondary' }}>
                {ticket.description}
              </Typography>
            </Box>
          )}

          {/* URL + Screenshot */}
          {(ticket.url || ticket.screenshot_path) && (
            <Stack spacing={1}>
              {ticket.url && (
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <LinkIcon fontSize="small" sx={{ color: 'text.secondary', flexShrink: 0 }} />
                  <Typography
                    variant="body2"
                    component="a"
                    href={ticket.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ color: 'primary.main', wordBreak: 'break-all' }}
                  >
                    {ticket.url}
                  </Typography>
                </Stack>
              )}
              {ticket.screenshot_path && (
                <Button size="small" variant="outlined" startIcon={<AttachFileIcon />}
                  onClick={() => onOpenScreenshot(ticket.screenshot_path!)}
                  sx={{ alignSelf: 'flex-start', textTransform: 'none' }}>
                  View screenshot
                </Button>
              )}
            </Stack>
          )}

          <Divider />

          {/* Chat */}
          <Box>
            <Typography variant="caption" fontWeight={700} color="text.secondary"
              sx={{ textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', mb: 1.5 }}>
              Comments
            </Typography>

            {comments.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                No comments yet.
              </Typography>
            ) : (
              <Stack spacing={1.5} sx={{ mb: 1 }}>
                {comments.map((c) => {
                  const isMe = c.user_id === currentUser.id;
                  return (
                    <Stack key={c.id} direction="row" justifyContent={isMe ? 'flex-end' : 'flex-start'}>
                      <Box sx={{
                        maxWidth: '85%',
                        bgcolor: isMe ? '#1565c0' : 'white',
                        color: isMe ? 'white' : 'text.primary',
                        border: isMe ? 'none' : '1px solid',
                        borderColor: 'divider',
                        borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                        px: 1.5, py: 1,
                      }}>
                        {!isMe && (
                          <Typography variant="caption" fontWeight={700}
                            sx={{ display: 'block', mb: 0.25, opacity: 0.7 }}>
                            {c.author_name}
                          </Typography>
                        )}
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                          {c.content}
                        </Typography>
                        <Typography variant="caption"
                          sx={{ display: 'block', mt: 0.5, opacity: 0.6, fontSize: 10 }}>
                          {new Date(c.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                      </Box>
                    </Stack>
                  );
                })}
                <div ref={chatEndRef} />
              </Stack>
            )}
          </Box>
        </Stack>
      </Box>

      {/* Input — pinned to bottom */}
      <Box sx={{ px: 2, py: 1.5, borderTop: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
        {sendError && (
          <Typography variant="caption" color="error" sx={{ display: 'block', mb: 0.75 }}>{sendError}</Typography>
        )}
        <Stack direction="row" spacing={1} alignItems="flex-end">
          <TextField
            size="small" multiline maxRows={4} fullWidth
            placeholder="Write a comment…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          />
          <IconButton color="primary"
            disabled={!draft.trim() || sending}
            onClick={handleSend}
            sx={{ mb: 0.25, flexShrink: 0 }}>
            {sending ? <CircularProgress size={18} color="inherit" /> : <SendIcon fontSize="small" />}
          </IconButton>
        </Stack>
      </Box>
    </Box>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

export function IssuesView({ folderId, isAdmin, currentUser }: { folderId: string; isAdmin: boolean; currentUser: CurrentUser }) {
  const searchParams = useSearchParams();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerTicketId, setDrawerTicketId] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [ticketComments, setTicketComments] = useState<Map<string, TicketComment[]>>(new Map());
  const [sendingComment, setSendingComment] = useState<Set<string>>(new Set());
  const [updatingStatus, setUpdatingStatus] = useState<Set<string>>(new Set());

  // Create / Edit dialog
  const [dialogOpen,  setDialogOpen]  = useState(false);
  const [editTarget,  setEditTarget]  = useState<Ticket | null>(null);
  const [form,        setForm]        = useState<FormState>(EMPTY_FORM);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [uploading,   setUploading]   = useState(false);
  const [submitting,  setSubmitting]  = useState(false);
  const [formError,   setFormError]   = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Open drawer from deep link (?issue=ID) — e.g. from Telegram notification
  useEffect(() => {
    const issueId = searchParams.get('issue');
    if (issueId && tickets.length > 0) {
      const exists = tickets.some((t) => t.id === issueId);
      if (exists) setDrawerTicketId(issueId);
    }
  }, [searchParams, tickets]);

  useEffect(() => {
    fetch(`/api/tickets?folderId=${folderId}`)
      .then((r) => r.json())
      .then((d) => { setTickets(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
    fetch(`/api/ticket-comments?folderId=${folderId}`)
      .then((r) => r.json())
      .then((all) => {
        if (!Array.isArray(all)) return;
        const map = new Map<string, TicketComment[]>();
        all.forEach((c: TicketComment) => {
          const list = map.get(c.ticket_id) ?? [];
          list.push(c);
          map.set(c.ticket_id, list);
        });
        setTicketComments(map);
      })
      .catch(() => {});
  }, [folderId]);

  const sendComment = useCallback(async (ticketId: string, content: string) => {
    setSendingComment((prev) => new Set(prev).add(ticketId));
    try {
      const res = await fetch('/api/ticket-comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_id: ticketId, content }),
      });
      if (res.ok) {
        const data: TicketComment = await res.json();
        setTicketComments((prev) => {
          const next = new Map(prev);
          next.set(ticketId, [...(prev.get(ticketId) ?? []), data]);
          return next;
        });
      }
    } finally {
      setSendingComment((prev) => { const next = new Set(prev); next.delete(ticketId); return next; });
    }
  }, []);

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

  function toggleGroup(key: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!form.title.trim()) return;
    setSubmitting(true);
    setFormError('');
    try {
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
          return;
        } finally {
          setUploading(false);
        }
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
        if (!res.ok) { setFormError(data.error ?? 'Failed to update'); return; }
        setTickets((prev) => prev.map((t) => t.id === editTarget.id ? { ...t, ...data } : t));
      } else {
        const res = await fetch('/api/tickets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) { setFormError(data.error ?? 'Failed to create ticket'); return; }
        setTickets((prev) => [data, ...prev]);
      }
      setDialogOpen(false);
    } catch {
      setFormError('Unexpected error. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Status + delete ───────────────────────────────────────────────────────

  async function updateStatus(id: string, status: string) {
    setUpdatingStatus((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/tickets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const data = await res.json();
        setTickets((prev) => prev.map((t) => t.id === id ? { ...t, status: data.status } : t));
      }
    } finally {
      setUpdatingStatus((prev) => { const next = new Set(prev); next.delete(id); return next; });
    }
  }

  async function deleteTicket(id: string) {
    if (!window.confirm('Delete this issue? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/tickets/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setTickets((prev) => prev.filter((t) => t.id !== id));
        if (drawerTicketId === id) setDrawerTicketId(null);
      }
    } catch { /* network error — ticket stays */ }
  }

  async function openScreenshot(path: string) {
    const supabase = createClient();
    const { data } = await supabase.storage.from('ticket-screenshots').createSignedUrl(path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  }

  // ── Data ──────────────────────────────────────────────────────────────────

  const groups = PRIORITIES.map((p) => ({
    priority: p,
    items: tickets.filter((t) => t.priority === p.value),
  })).filter((g) => g.items.length > 0);

  const ungrouped = tickets.filter((t) => !PRIORITIES.find((p) => p.value === t.priority));

  const drawerTicket = drawerTicketId ? tickets.find((t) => t.id === drawerTicketId) ?? null : null;

  // ── Row renderer ──────────────────────────────────────────────────────────

  function renderTicketRow(ticket: Ticket) {
    const sm = statusMeta(ticket.status);
    const threadComments = ticketComments.get(ticket.id) ?? [];
    const hasComments = threadComments.length > 0;

    return (
      <TableRow
        key={ticket.id}
        hover
        onClick={() => setDrawerTicketId(ticket.id)}
        sx={{ cursor: 'pointer' }}
      >
        {/* # */}
        <TableCell sx={{ py: 1, width: 52 }}>
          <Typography variant="caption" fontWeight={700}
            sx={{ fontFamily: 'monospace', color: 'text.disabled', whiteSpace: 'nowrap' }}>
            {ticketNum(ticket.ticket_number) ?? '—'}
          </Typography>
        </TableCell>

        {/* Title */}
        <TableCell sx={{ py: 1 }}>
          <Typography variant="body2" fontWeight={600} noWrap>{ticket.title}</Typography>
          <Typography variant="caption" color="text.secondary" noWrap>{ticket.created_by_email}</Typography>
        </TableCell>

        {/* Type */}
        <TableCell sx={{ py: 1 }}>
          <TypeChip type={ticket.type} />
        </TableCell>

        {/* Module */}
        <TableCell sx={{ py: 1 }}>
          {ticket.module && (
            <Typography variant="caption" fontWeight={500} color="text.secondary" noWrap>
              {ticket.module}
            </Typography>
          )}
        </TableCell>

        {/* Status */}
        <TableCell sx={{ py: 1 }} onClick={(e) => e.stopPropagation()}>
          <Select
            value={ticket.status}
            onChange={(e) => updateStatus(ticket.id, e.target.value)}
            size="small"
            disabled={updatingStatus.has(ticket.id)}
            sx={{
              fontSize: 12, fontWeight: 600, height: 28, color: sm.color,
              '& .MuiOutlinedInput-notchedOutline': { borderColor: sm.color + '55' },
              '& .MuiSelect-icon': { color: sm.color },
            }}
          >
            {STATUSES.map((s) => (
              <MenuItem key={s.value} value={s.value} sx={{ fontSize: 12 }}>{s.label}</MenuItem>
            ))}
          </Select>
        </TableCell>

        {/* Actions */}
        <TableCell align="right" sx={{ py: 0.5 }} onClick={(e) => e.stopPropagation()}>
          <Stack direction="row" spacing={0.25} justifyContent="flex-end" alignItems="center">
            {isAdmin && (
              <IconButton size="small" onClick={() => openEdit(ticket)}>
                <EditIcon sx={{ fontSize: 15 }} />
              </IconButton>
            )}
            {isAdmin && (
              <IconButton size="small" color="error" onClick={() => deleteTicket(ticket.id)}>
                <DeleteIcon sx={{ fontSize: 15 }} />
              </IconButton>
            )}
            <IconButton
              size="small"
              onClick={() => setDrawerTicketId(ticket.id)}
              sx={{ color: hasComments ? 'primary.main' : 'text.disabled', p: 0.25 }}
            >
              {hasComments
                ? <ChatBubbleIcon sx={{ fontSize: 15 }} />
                : <ChatBubbleOutlineIcon sx={{ fontSize: 15 }} />}
            </IconButton>
          </Stack>
        </TableCell>
      </TableRow>
    );
  }

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

      {/* Table */}
      {tickets.length === 0 ? (
        <Typography variant="body2" color="text.secondary">No issues reported yet.</Typography>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <TableContainer>
            <Table size="small" sx={{ tableLayout: 'fixed' }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12, py: 1.25, width: 52, borderBottom: '1px solid', borderColor: 'divider' }}>#</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12, py: 1.25, borderBottom: '1px solid', borderColor: 'divider' }}>Issue / Title</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12, py: 1.25, width: 160, borderBottom: '1px solid', borderColor: 'divider' }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12, py: 1.25, width: 180, borderBottom: '1px solid', borderColor: 'divider' }}>Module</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12, py: 1.25, width: 180, borderBottom: '1px solid', borderColor: 'divider' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12, py: 1.25, width: 112, borderBottom: '1px solid', borderColor: 'divider' }} />
                </TableRow>
              </TableHead>

              <TableBody>
                {groups.map(({ priority, items }) => {
                  const isCollapsed = collapsedGroups.has(priority.value);
                  return [
                    <TableRow key={`grp-${priority.value}`}>
                      <TableCell colSpan={6} sx={{ p: 0, bgcolor: priority.color }}>
                        <Stack direction="row" alignItems="center" spacing={1}
                          sx={{ px: 1.5, py: 0.75, cursor: 'pointer' }}
                          onClick={() => toggleGroup(priority.value)}>
                          <KeyboardArrowDownIcon sx={{
                            color: 'white', fontSize: 18, flexShrink: 0,
                            transform: isCollapsed ? 'rotate(-90deg)' : 'none',
                            transition: 'transform 0.2s',
                          }} />
                          <Typography sx={{ color: 'white', fontWeight: 700, fontSize: 13, flex: 1 }}>
                            {priority.label} Priority
                          </Typography>
                          <Box sx={{
                            bgcolor: 'white', borderRadius: '50%', width: 22, height: 22,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          }}>
                            <Typography sx={{ color: priority.color, fontWeight: 800, fontSize: 11, lineHeight: 1 }}>
                              {items.length}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                    </TableRow>,

                    ...(!isCollapsed ? items.map(renderTicketRow) : []),
                  ];
                })}

                {ungrouped.map(renderTicketRow)}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Right-side drawer */}
      <Drawer
        anchor="right"
        open={!!drawerTicketId && !!drawerTicket}
        onClose={() => setDrawerTicketId(null)}
        PaperProps={{ sx: { width: 420, boxShadow: 6 } }}
      >
        {drawerTicket && (
          <IssueDrawer
            ticket={drawerTicket}
            comments={ticketComments.get(drawerTicket.id) ?? []}
            currentUser={currentUser}
            isAdmin={isAdmin}
            sending={sendingComment.has(drawerTicket.id)}
            updatingStatus={updatingStatus.has(drawerTicket.id)}
            onClose={() => setDrawerTicketId(null)}
            onStatusChange={(status) => updateStatus(drawerTicket.id, status)}
            onEdit={() => { openEdit(drawerTicket); setDrawerTicketId(null); }}
            onDelete={() => deleteTicket(drawerTicket.id)}
            onSendComment={(content) => sendComment(drawerTicket.id, content)}
            onOpenScreenshot={openScreenshot}
          />
        )}
      </Drawer>

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

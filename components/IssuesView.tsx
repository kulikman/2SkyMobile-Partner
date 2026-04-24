'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
import ChatBubbleIcon from '@mui/icons-material/ChatBubble';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
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
function priorityMeta(value: string) {
  return PRIORITIES.find((p) => p.value === value) ?? { label: value, color: '#9e9e9e' };
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

// ── Component ────────────────────────────────────────────────────────────────

export function IssuesView({ folderId, isAdmin, currentUser }: { folderId: string; isAdmin: boolean; currentUser: CurrentUser }) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [ticketComments, setTicketComments] = useState<Map<string, TicketComment[]>>(new Map());
  const [commentDraft, setCommentDraft] = useState<Map<string, string>>(new Map());
  const [sendingComment, setSendingComment] = useState<Set<string>>(new Set());
  const chatEndRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());


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

  // scroll chat to bottom when ticket expands or new comment
  useEffect(() => {
    if (expandedTicket) {
      chatEndRefs.current.get(expandedTicket)?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [expandedTicket, ticketComments]);

  const sendComment = useCallback(async (ticketId: string) => {
    const message = (commentDraft.get(ticketId) ?? '').trim();
    if (!message) return;
    setSendingComment((prev) => new Set(prev).add(ticketId));
    const res = await fetch('/api/ticket-comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticket_id: ticketId, content: message }),
    });
    if (res.ok) {
      const data: TicketComment = await res.json();
      setTicketComments((prev) => {
        const next = new Map(prev);
        next.set(ticketId, [...(prev.get(ticketId) ?? []), data]);
        return next;
      });
      setCommentDraft((prev) => { const next = new Map(prev); next.set(ticketId, ''); return next; });
    }
    setSendingComment((prev) => { const next = new Set(prev); next.delete(ticketId); return next; });
  }, [commentDraft]);

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

  const filtered = tickets;

  // Group by priority
  const groups = PRIORITIES.map((p) => ({
    priority: p,
    items: filtered.filter((t) => t.priority === p.value),
  })).filter((g) => g.items.length > 0);
  const ungrouped = filtered.filter((t) => !PRIORITIES.find((p) => p.value === t.priority));

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
      {filtered.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No issues reported yet.
        </Typography>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <TableContainer>
            <Table size="small" sx={{ tableLayout: 'fixed' }}>
              <TableHead>
                <TableRow>
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
                    /* Group header row */
                    <TableRow key={`grp-${priority.value}`}>
                      <TableCell
                        colSpan={5}
                        sx={{ p: 0, bgcolor: priority.color }}
                      >
                        <Stack
                          direction="row"
                          alignItems="center"
                          spacing={1}
                          sx={{ px: 1.5, py: 0.75, cursor: 'pointer' }}
                          onClick={() => toggleGroup(priority.value)}
                        >
                          <KeyboardArrowDownIcon
                            sx={{
                              color: 'white', fontSize: 18,
                              transform: isCollapsed ? 'rotate(-90deg)' : 'none',
                              transition: 'transform 0.2s',
                              flexShrink: 0,
                            }}
                          />
                          <Typography sx={{ color: 'white', fontWeight: 700, fontSize: 13, flex: 1 }}>
                            {priority.label} Priority
                          </Typography>
                          <Box sx={{
                            bgcolor: 'white', borderRadius: '50%',
                            width: 22, height: 22,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                          }}>
                            <Typography sx={{ color: priority.color, fontWeight: 800, fontSize: 11, lineHeight: 1 }}>
                              {items.length}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                    </TableRow>,

                    /* Issue rows */
                    ...(!isCollapsed ? items.flatMap((ticket) => {
                      const sm = statusMeta(ticket.status);
                      const isOpen = expandedTicket === ticket.id;
                      const threadComments = ticketComments.get(ticket.id) ?? [];
                      const hasComments = threadComments.length > 0;

                      return [
                        <TableRow
                          key={ticket.id}
                          hover
                          sx={{ '& td': { borderBottom: isOpen ? 'none' : undefined } }}
                        >
                          {/* Title */}
                          <TableCell sx={{ py: 1 }}>
                            <Typography variant="body2" fontWeight={600} noWrap>
                              {ticket.title}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" noWrap>
                              {ticket.created_by_email}
                            </Typography>
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

                          {/* Status — inline select */}
                          <TableCell sx={{ py: 1 }} onClick={(e) => e.stopPropagation()}>
                            <Select
                              value={ticket.status}
                              onChange={(e) => updateStatus(ticket.id, e.target.value)}
                              size="small"
                              sx={{
                                fontSize: 12,
                                fontWeight: 600,
                                height: 28,
                                color: sm.color,
                                '& .MuiOutlinedInput-notchedOutline': {
                                  borderColor: sm.color + '55',
                                },
                                '& .MuiSelect-icon': { color: sm.color },
                              }}
                            >
                              {STATUSES.map((s) => (
                                <MenuItem key={s.value} value={s.value} sx={{ fontSize: 12 }}>
                                  {s.label}
                                </MenuItem>
                              ))}
                            </Select>
                          </TableCell>

                          {/* Actions */}
                          <TableCell align="right" sx={{ py: 0.5 }} onClick={(e) => e.stopPropagation()}>
                            <Stack direction="row" spacing={0.25} justifyContent="flex-end" alignItems="center">
                              {isAdmin && ticket.status === 'new' && (
                                <IconButton size="small" title="Take" onClick={() => updateStatus(ticket.id, 'in_progress')}>
                                  <PlayArrowIcon sx={{ fontSize: 16, color: '#f57c00' }} />
                                </IconButton>
                              )}
                              {isAdmin && ticket.status === 'in_progress' && (
                                <IconButton size="small" title="Mark done" onClick={() => updateStatus(ticket.id, 'ready_for_testing')}>
                                  <TaskAltIcon sx={{ fontSize: 16, color: '#1976d2' }} />
                                </IconButton>
                              )}
                              {isAdmin && ticket.status === 'in_progress' && (
                                <IconButton size="small" title="On hold" onClick={() => updateStatus(ticket.id, 'on_hold')}>
                                  <PauseIcon sx={{ fontSize: 16, color: '#7b1fa2' }} />
                                </IconButton>
                              )}
                              {!isAdmin && ticket.status === 'ready_for_testing' && ticket.created_by && (
                                <IconButton size="small" title="Approve" onClick={() => updateStatus(ticket.id, 'approved')}>
                                  <CheckCircleIcon sx={{ fontSize: 16, color: '#388e3c' }} />
                                </IconButton>
                              )}
                              {isAdmin && ticket.status === 'approved' && (
                                <IconButton size="small" title="Close" onClick={() => updateStatus(ticket.id, 'closed')}>
                                  <TaskAltIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              )}
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
                                onClick={() => setExpandedTicket(isOpen ? null : ticket.id)}
                                sx={{ color: hasComments ? 'primary.main' : 'text.disabled', p: 0.25 }}
                              >
                                {hasComments
                                  ? <ChatBubbleIcon sx={{ fontSize: 15 }} />
                                  : <ChatBubbleOutlineIcon sx={{ fontSize: 15 }} />}
                              </IconButton>
                            </Stack>
                          </TableCell>
                        </TableRow>,

                        /* Expanded detail row */
                        isOpen ? (
                          <TableRow key={`${ticket.id}-detail`}>
                            <TableCell colSpan={5} sx={{ pb: 2, pt: 0, bgcolor: '#f8fafc' }}>
                              <Box sx={{ px: 2 }}>
                                <Collapse in={isOpen}>
                                  <Stack spacing={1.5} pt={1.5}>
                                    {ticket.description && (
                                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: 'text.secondary' }}>
                                        {ticket.description}
                                      </Typography>
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

                                    <Divider />

                                    {/* Chat thread */}
                                    <Box>
                                      <Typography variant="caption" fontWeight={700} color="text.secondary"
                                        sx={{ textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', mb: 1 }}>
                                        Comments
                                      </Typography>
                                      {threadComments.length === 0 ? (
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                                          No comments yet. Be the first!
                                        </Typography>
                                      ) : (
                                        <Stack spacing={1.5} sx={{ mb: 1.5, maxHeight: 280, overflowY: 'auto', pr: 0.5 }}>
                                          {threadComments.map((c) => {
                                            const isMe = c.user_id === currentUser.id;
                                            return (
                                              <Stack key={c.id} direction="row" justifyContent={isMe ? 'flex-end' : 'flex-start'}>
                                                <Box sx={{
                                                  maxWidth: '75%',
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
                                          <div ref={(el) => { chatEndRefs.current.set(ticket.id, el); }} />
                                        </Stack>
                                      )}
                                      <Stack direction="row" spacing={1} alignItems="flex-end">
                                        <TextField
                                          size="small" fullWidth multiline maxRows={3}
                                          placeholder="Write a comment…"
                                          value={commentDraft.get(ticket.id) ?? ''}
                                          onChange={(e) => setCommentDraft((prev) => new Map(prev).set(ticket.id, e.target.value))}
                                          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendComment(ticket.id); } }}
                                        />
                                        <IconButton color="primary"
                                          disabled={sendingComment.has(ticket.id) || !(commentDraft.get(ticket.id) ?? '').trim()}
                                          onClick={() => sendComment(ticket.id)}
                                          sx={{ flexShrink: 0 }}>
                                          {sendingComment.has(ticket.id)
                                            ? <CircularProgress size={18} />
                                            : <SendIcon />}
                                        </IconButton>
                                      </Stack>
                                    </Box>
                                  </Stack>
                                </Collapse>
                              </Box>
                            </TableCell>
                          </TableRow>
                        ) : null,
                      ];
                    }) : []),
                  ];
                })}

                {/* Ungrouped rows (no known priority) */}
                {ungrouped.length > 0 && ungrouped.flatMap((ticket) => {
                  const sm = statusMeta(ticket.status);
                  const isOpen = expandedTicket === ticket.id;
                  const threadComments = ticketComments.get(ticket.id) ?? [];
                  const hasComments = threadComments.length > 0;
                  return [
                    <TableRow key={ticket.id} hover sx={{ '& td': { borderBottom: isOpen ? 'none' : undefined } }}>
                      <TableCell sx={{ py: 1 }}>
                        <Typography variant="body2" fontWeight={600} noWrap>{ticket.title}</Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>{ticket.created_by_email}</Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1 }}><TypeChip type={ticket.type} /></TableCell>
                      <TableCell sx={{ py: 1 }}>
                        {ticket.module && <Typography variant="caption" fontWeight={500} color="text.secondary" noWrap>{ticket.module}</Typography>}
                      </TableCell>
                      <TableCell sx={{ py: 1 }} onClick={(e) => e.stopPropagation()}>
                        <Select value={ticket.status} onChange={(e) => updateStatus(ticket.id, e.target.value)}
                          size="small"
                          sx={{ fontSize: 12, fontWeight: 600, height: 28, color: sm.color,
                            '& .MuiOutlinedInput-notchedOutline': { borderColor: sm.color + '55' },
                            '& .MuiSelect-icon': { color: sm.color } }}>
                          {STATUSES.map((s) => <MenuItem key={s.value} value={s.value} sx={{ fontSize: 12 }}>{s.label}</MenuItem>)}
                        </Select>
                      </TableCell>
                      <TableCell align="right" sx={{ py: 0.5 }} onClick={(e) => e.stopPropagation()}>
                        <Stack direction="row" spacing={0.25} justifyContent="flex-end" alignItems="center">
                          {isAdmin && <IconButton size="small" onClick={() => openEdit(ticket)}><EditIcon sx={{ fontSize: 15 }} /></IconButton>}
                          {isAdmin && <IconButton size="small" color="error" onClick={() => deleteTicket(ticket.id)}><DeleteIcon sx={{ fontSize: 15 }} /></IconButton>}
                          <IconButton size="small"
                            onClick={() => setExpandedTicket(isOpen ? null : ticket.id)}
                            sx={{ color: hasComments ? 'primary.main' : 'text.disabled', p: 0.25 }}>
                            {hasComments
                              ? <ChatBubbleIcon sx={{ fontSize: 15 }} />
                              : <ChatBubbleOutlineIcon sx={{ fontSize: 15 }} />}
                          </IconButton>
                        </Stack>
                      </TableCell>
                    </TableRow>,
                    isOpen ? (
                      <TableRow key={`${ticket.id}-detail`}>
                        <TableCell colSpan={5} sx={{ pb: 2, pt: 0, bgcolor: '#f8fafc' }}>
                          <Box sx={{ px: 2 }}>
                            <Collapse in={isOpen}>
                              <Stack spacing={1.5} pt={1.5}>
                                {ticket.description && (
                                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: 'text.secondary' }}>
                                    {ticket.description}
                                  </Typography>
                                )}
                                {(ticket.url || ticket.screenshot_path) && (
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
                                )}
                                <Divider />
                                <Box>
                                  <Typography variant="caption" fontWeight={700} color="text.secondary"
                                    sx={{ textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', mb: 1 }}>
                                    Comments
                                  </Typography>
                                  {threadComments.length === 0 ? (
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                                      No comments yet. Be the first!
                                    </Typography>
                                  ) : (
                                    <Stack spacing={1.5} sx={{ mb: 1.5, maxHeight: 280, overflowY: 'auto', pr: 0.5 }}>
                                      {threadComments.map((c) => {
                                        const isMe = c.user_id === currentUser.id;
                                        return (
                                          <Stack key={c.id} direction="row" justifyContent={isMe ? 'flex-end' : 'flex-start'}>
                                            <Box sx={{
                                              maxWidth: '75%',
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
                                      <div ref={(el) => { chatEndRefs.current.set(ticket.id, el); }} />
                                    </Stack>
                                  )}
                                  <Stack direction="row" spacing={1} alignItems="flex-end">
                                    <TextField size="small" fullWidth multiline maxRows={3}
                                      placeholder="Write a comment…"
                                      value={commentDraft.get(ticket.id) ?? ''}
                                      onChange={(e) => setCommentDraft((prev) => new Map(prev).set(ticket.id, e.target.value))}
                                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendComment(ticket.id); } }}
                                    />
                                    <IconButton color="primary"
                                      disabled={sendingComment.has(ticket.id) || !(commentDraft.get(ticket.id) ?? '').trim()}
                                      onClick={() => sendComment(ticket.id)}
                                      sx={{ flexShrink: 0 }}>
                                      {sendingComment.has(ticket.id) ? <CircularProgress size={18} /> : <SendIcon />}
                                    </IconButton>
                                  </Stack>
                                </Box>
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

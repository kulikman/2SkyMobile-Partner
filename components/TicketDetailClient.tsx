'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DoneIcon from '@mui/icons-material/Done';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LinkIcon from '@mui/icons-material/Link';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SendIcon from '@mui/icons-material/Send';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// ── Constants ────────────────────────────────────────────────────────────────

const STATUSES: { value: string; label: string; color: string }[] = [
  { value: 'new',               label: 'New',               color: '#9e9e9e' },
  { value: 'in_progress',       label: 'In Progress',       color: '#1976d2' },
  { value: 'on_hold',           label: 'On Hold',           color: '#7b1fa2' },
  { value: 'ready_for_testing', label: 'Ready for Testing', color: '#f57c00' },
  { value: 'approved',          label: 'Approved',          color: '#388e3c' },
  { value: 'closed',            label: 'Closed',            color: '#616161' },
];

const PRIORITIES: { value: string; label: string; color: string }[] = [
  { value: 'high',   label: 'High',   color: '#c62828' },
  { value: 'medium', label: 'Medium', color: '#f57c00' },
  { value: 'low',    label: 'Low',    color: '#388e3c' },
];

const TYPE_COLORS: Record<string, string> = {
  'Bug':             '#c62828',
  'Missing Feature': '#f57c00',
  'Clarification':   '#1976d2',
};

// ── Types ─────────────────────────────────────────────────────────────────────

export type TicketDetail = {
  id: string;
  title: string;
  description: string | null;
  url: string | null;
  screenshot_path: string | null;
  module: string | null;
  type: string | null;
  priority: string;
  severity: string;
  status: string;
  created_by: string | null;
  created_by_email: string;
  ticket_number: number | null;
  created_at: string;
};

export type TicketComment = {
  id: string;
  ticket_id: string;
  user_id: string | null;
  author_name: string;
  content: string;
  created_at: string;
};

type CurrentUser = { id: string; email: string; name: string };

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusMeta(value: string) {
  return STATUSES.find((s) => s.value === value) ?? { label: value, color: '#9e9e9e' };
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
        fontSize: 11, fontWeight: 600, height: 22, borderRadius: '999px',
        borderColor: color + '66', color, bgcolor: color + '11',
      }}
    />
  );
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="caption" fontWeight={700} color="text.secondary"
        sx={{ textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', mb: 0.5 }}>
        {label}
      </Typography>
      {children}
    </Box>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function TicketDetailClient({
  ticket: initialTicket,
  initialComments,
  currentUser,
  isAdmin,
  backHref,
  canonicalUrl,
}: {
  ticket: TicketDetail;
  initialComments: TicketComment[];
  currentUser: CurrentUser;
  isAdmin: boolean;
  backHref: string;
  canonicalUrl: string;
}) {
  const router = useRouter();
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const [ticket, setTicket] = useState(initialTicket);
  const [comments, setComments] = useState(initialComments);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [copied, setCopied] = useState(false);

  const sm = statusMeta(ticket.status);
  const priorityMeta = PRIORITIES.find((p) => p.value === ticket.priority);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments.length]);

  async function handleStatusChange(status: string) {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const data = await res.json();
        setTicket((prev) => ({ ...prev, status: data.status }));
      }
    } finally {
      setUpdatingStatus(false);
    }
  }

  const handleSendComment = useCallback(async () => {
    if (!draft.trim()) return;
    setSending(true);
    const text = draft.trim();
    setDraft('');
    try {
      const res = await fetch('/api/ticket-comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_id: ticket.id, content: text }),
      });
      if (res.ok) {
        const data: TicketComment = await res.json();
        setComments((prev) => [...prev, data]);
      }
    } catch {
      setDraft(text);
    } finally {
      setSending(false);
    }
  }, [draft, ticket.id]);

  async function handleDelete() {
    if (!window.confirm('Delete this issue? This cannot be undone.')) return;
    const res = await fetch(`/api/tickets/${ticket.id}`, { method: 'DELETE' });
    if (res.ok) router.push(backHref);
  }

  async function openScreenshot(path: string) {
    const supabase = createClient();
    const { data } = await supabase.storage.from('ticket-screenshots').createSignedUrl(path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  }

  function copyLink() {
    const fullUrl = typeof window !== 'undefined'
      ? `${window.location.origin}${canonicalUrl}`
      : canonicalUrl;
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <Box>
      {/* ── Top bar ── */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ mb: 3 }}>
        <Link href={backHref} style={{ textDecoration: 'none' }}>
          <Button startIcon={<ArrowBackIcon />} size="small" sx={{ textTransform: 'none' }}>
            Back to Issues
          </Button>
        </Link>

        <Stack direction="row" spacing={0.5} alignItems="center">
          {isAdmin && (
            <Tooltip title="Edit">
              <Link href={`${backHref}&editTicket=${ticket.id}`} style={{ display: 'flex' }}>
                <IconButton size="small"><EditIcon sx={{ fontSize: 17 }} /></IconButton>
              </Link>
            </Tooltip>
          )}
          {isAdmin && (
            <Tooltip title="Delete">
              <IconButton size="small" color="error" onClick={handleDelete}>
                <DeleteIcon sx={{ fontSize: 17 }} />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title={copied ? 'Copied!' : 'Copy link'}>
            <IconButton size="small" onClick={copyLink}>
              {copied ? <DoneIcon sx={{ fontSize: 17, color: 'success.main' }} /> : <ContentCopyIcon sx={{ fontSize: 17 }} />}
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {/* ── Title & ticket # ── */}
      <Box sx={{ mb: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
          {ticket.ticket_number && (
            <Typography variant="body2" fontWeight={700}
              sx={{ fontFamily: 'monospace', color: 'text.disabled', letterSpacing: 0 }}>
              #{String(ticket.ticket_number).padStart(3, '0')}
            </Typography>
          )}
          <TypeChip type={ticket.type} />
          {ticket.module && (
            <Typography variant="caption" color="text.secondary">{ticket.module}</Typography>
          )}
        </Stack>
        <Typography variant="h5" fontWeight={700} sx={{ lineHeight: 1.3, mb: 0.75 }}>
          {ticket.title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Reported by {ticket.created_by_email} · {new Date(ticket.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
        </Typography>
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* ── Two-column layout ── */}
      <Grid container spacing={3}>
        {/* Left: details + metadata */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Stack spacing={3}>
            {/* Status + quick actions */}
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
              <Stack spacing={1.5}>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <MetaRow label="Status">
                    <Select
                      value={ticket.status}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      size="small"
                      disabled={updatingStatus}
                      sx={{
                        fontSize: 13, fontWeight: 600, height: 32, color: sm.color,
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: sm.color + '55' },
                        '& .MuiSelect-icon': { color: sm.color },
                      }}
                    >
                      {STATUSES.map((s) => (
                        <MenuItem key={s.value} value={s.value} sx={{ fontSize: 13 }}>{s.label}</MenuItem>
                      ))}
                    </Select>
                  </MetaRow>

                  <MetaRow label="Priority">
                    <Chip
                      label={priorityMeta?.label ?? ticket.priority}
                      size="small"
                      sx={{
                        fontWeight: 700, fontSize: 12,
                        bgcolor: (priorityMeta?.color ?? '#9e9e9e') + '18',
                        color: priorityMeta?.color ?? '#9e9e9e',
                        border: '1px solid ' + (priorityMeta?.color ?? '#9e9e9e') + '55',
                        borderRadius: '999px',
                      }}
                    />
                  </MetaRow>

                  <MetaRow label="Severity">
                    <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>{ticket.severity}</Typography>
                  </MetaRow>
                </Stack>

                {/* Quick actions */}
                {isAdmin && ticket.status === 'new' && (
                  <Button size="small" variant="outlined" startIcon={<PlayArrowIcon />}
                    onClick={() => handleStatusChange('in_progress')} sx={{ alignSelf: 'flex-start', textTransform: 'none' }}>
                    Take
                  </Button>
                )}
                {isAdmin && ticket.status === 'in_progress' && (
                  <Stack direction="row" spacing={1}>
                    <Button size="small" variant="outlined" startIcon={<TaskAltIcon />}
                      onClick={() => handleStatusChange('ready_for_testing')} sx={{ textTransform: 'none' }}>
                      Mark done
                    </Button>
                    <Button size="small" variant="outlined" startIcon={<PauseIcon />}
                      onClick={() => handleStatusChange('on_hold')} sx={{ textTransform: 'none' }}>
                      On hold
                    </Button>
                  </Stack>
                )}
                {!isAdmin && ticket.status === 'ready_for_testing' && (
                  <Button size="small" variant="outlined" color="success" startIcon={<CheckCircleIcon />}
                    onClick={() => handleStatusChange('approved')} sx={{ alignSelf: 'flex-start', textTransform: 'none' }}>
                    Approve
                  </Button>
                )}
                {isAdmin && ticket.status === 'approved' && (
                  <Button size="small" variant="outlined" startIcon={<TaskAltIcon />}
                    onClick={() => handleStatusChange('closed')} sx={{ alignSelf: 'flex-start', textTransform: 'none' }}>
                    Close
                  </Button>
                )}
              </Stack>
            </Paper>

            {/* Description */}
            {ticket.description && (
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                <MetaRow label="Description">
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: 'text.secondary', lineHeight: 1.7, mt: 0.5 }}>
                    {ticket.description}
                  </Typography>
                </MetaRow>
              </Paper>
            )}

            {/* URL + Screenshot */}
            {(ticket.url || ticket.screenshot_path) && (
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                <Stack spacing={1.5}>
                  {ticket.url && (
                    <MetaRow label="Page URL">
                      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
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
                    </MetaRow>
                  )}
                  {ticket.screenshot_path && (
                    <MetaRow label="Screenshot">
                      <Button size="small" variant="outlined" startIcon={<AttachFileIcon />}
                        onClick={() => openScreenshot(ticket.screenshot_path!)}
                        sx={{ mt: 0.5, textTransform: 'none' }}>
                        View screenshot
                      </Button>
                    </MetaRow>
                  )}
                </Stack>
              </Paper>
            )}
          </Stack>
        </Grid>

        {/* Right: Comments */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper variant="outlined" sx={{ borderRadius: 2, display: 'flex', flexDirection: 'column', height: { md: '100%' }, minHeight: 320 }}>
            <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="caption" fontWeight={700} color="text.secondary"
                sx={{ textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Comments ({comments.length})
              </Typography>
            </Box>

            {/* Comment list */}
            <Box sx={{ flex: 1, overflowY: 'auto', px: 2.5, py: 2 }}>
              {comments.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No comments yet.</Typography>
              ) : (
                <Stack spacing={1.5}>
                  {comments.map((c) => {
                    const isMe = c.user_id === currentUser.id;
                    return (
                      <Stack key={c.id} direction="row" justifyContent={isMe ? 'flex-end' : 'flex-start'}>
                        <Box sx={{
                          maxWidth: '88%',
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
                            {new Date(c.created_at).toLocaleString('en-GB', {
                              day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                            })}
                          </Typography>
                        </Box>
                      </Stack>
                    );
                  })}
                  <div ref={chatEndRef} />
                </Stack>
              )}
            </Box>

            {/* Comment input */}
            <Box sx={{ px: 2, py: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
              <Stack direction="row" spacing={1} alignItems="flex-end">
                <TextField
                  size="small" multiline maxRows={4} fullWidth
                  placeholder="Write a comment…"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendComment(); } }}
                />
                <IconButton color="primary"
                  disabled={!draft.trim() || sending}
                  onClick={handleSendComment}
                  sx={{ mb: 0.25, flexShrink: 0 }}>
                  {sending ? <CircularProgress size={18} color="inherit" /> : <SendIcon fontSize="small" />}
                </IconButton>
              </Stack>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

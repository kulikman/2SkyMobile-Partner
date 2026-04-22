'use client';

import { useEffect, useRef, useState } from 'react';
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
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LinkIcon from '@mui/icons-material/Link';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import UploadIcon from '@mui/icons-material/Upload';
import { createClient } from '@/lib/supabase/client';

type Ticket = {
  id: string;
  folder_id: string;
  title: string;
  description: string | null;
  url: string | null;
  screenshot_path: string | null;
  status: 'new' | 'in_progress' | 'ready_for_testing' | 'approved';
  created_by: string;
  created_by_email: string;
  created_at: string;
  updated_at: string;
};

const statusLabels: Record<string, string> = {
  new: 'New',
  in_progress: 'In progress',
  ready_for_testing: 'Ready for testing',
  approved: 'Approved',
};

const statusColors: Record<string, 'default' | 'warning' | 'info' | 'success'> = {
  new: 'default',
  in_progress: 'warning',
  ready_for_testing: 'info',
  approved: 'success',
};

export function IssuesView({ folderId, isAdmin }: { folderId: string; isAdmin: boolean }) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  // Create form state
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/tickets?folderId=${folderId}`)
      .then((r) => r.json())
      .then((d) => { setTickets(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [folderId]);

  function resetForm() {
    setNewTitle('');
    setNewDesc('');
    setNewUrl('');
    setScreenshotFile(null);
    setFormError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleCreate() {
    if (!newTitle.trim()) return;
    setSubmitting(true);
    setFormError('');

    let screenshotPath: string | null = null;

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

    const res = await fetch('/api/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        folder_id: folderId,
        title: newTitle.trim(),
        description: newDesc.trim() || null,
        url: newUrl.trim() || null,
        screenshot_path: screenshotPath,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setFormError(data.error ?? 'Failed to create ticket'); return; }
    setTickets((prev) => [data, ...prev]);
    setCreateOpen(false);
    resetForm();
  }

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

  if (loading) return <CircularProgress size={24} />;

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" fontWeight={700}>Issues</Typography>
        <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
          Report issue
        </Button>
      </Stack>

      {tickets.length === 0 ? (
        <Typography variant="body2" color="text.secondary">No issues reported yet.</Typography>
      ) : (
        <Stack spacing={1.5}>
          {tickets.map((ticket) => (
            <Paper key={ticket.id} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
              {/* Header row */}
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ px: 2.5, py: 1.5, cursor: 'pointer' }}
                onClick={() => setExpanded(expanded === ticket.id ? null : ticket.id)}
              >
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
                  <ExpandMoreIcon
                    fontSize="small"
                    sx={{
                      color: 'text.secondary',
                      flexShrink: 0,
                      transform: expanded === ticket.id ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.2s',
                    }}
                  />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600} noWrap>{ticket.title}</Typography>
                    <Stack direction="row" spacing={1} mt={0.25} alignItems="center">
                      <Chip
                        label={statusLabels[ticket.status] ?? ticket.status}
                        color={statusColors[ticket.status] ?? 'default'}
                        size="small"
                        variant="outlined"
                      />
                      <Typography variant="caption" color="text.secondary">
                        {ticket.created_by_email} · {new Date(ticket.created_at).toLocaleDateString('en-US')}
                      </Typography>
                    </Stack>
                  </Box>
                </Stack>

                {/* Action buttons */}
                <Stack direction="row" spacing={0.5} onClick={(e) => e.stopPropagation()}>
                  {/* Admin: Take → in_progress */}
                  {isAdmin && ticket.status === 'new' && (
                    <Button size="small" variant="outlined" startIcon={<PlayArrowIcon />}
                      onClick={() => updateStatus(ticket.id, 'in_progress')}>
                      Take
                    </Button>
                  )}
                  {/* Admin: Done → ready_for_testing */}
                  {isAdmin && ticket.status === 'in_progress' && (
                    <Button size="small" variant="outlined" color="info" startIcon={<TaskAltIcon />}
                      onClick={() => updateStatus(ticket.id, 'ready_for_testing')}>
                      Done
                    </Button>
                  )}
                  {/* Partner: Approve → approved */}
                  {!isAdmin && ticket.status === 'ready_for_testing' && (
                    <Button size="small" variant="contained" color="success" startIcon={<CheckCircleIcon />}
                      onClick={() => updateStatus(ticket.id, 'approved')}>
                      Approve
                    </Button>
                  )}
                  {/* Admin: Re-open → new */}
                  {isAdmin && ticket.status === 'approved' && (
                    <Button size="small" variant="outlined" color="warning"
                      onClick={() => updateStatus(ticket.id, 'new')}>
                      Re-open
                    </Button>
                  )}
                  {isAdmin && (
                    <IconButton size="small" color="error" onClick={() => deleteTicket(ticket.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </Stack>
              </Stack>

              {/* Expanded details */}
              <Collapse in={expanded === ticket.id}>
                <Divider />
                <Box sx={{ px: 2.5, py: 2 }}>
                  <Stack spacing={1.5}>
                    {ticket.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                        {ticket.description}
                      </Typography>
                    )}
                    {ticket.url && (
                      <Stack direction="row" spacing={0.75} alignItems="center">
                        <LinkIcon fontSize="small" sx={{ color: 'text.secondary' }} />
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
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<AttachFileIcon />}
                        onClick={() => openScreenshot(ticket.screenshot_path!)}
                        sx={{ alignSelf: 'flex-start' }}
                      >
                        View screenshot
                      </Button>
                    )}
                  </Stack>
                </Box>
              </Collapse>
            </Paper>
          ))}
        </Stack>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onClose={() => { setCreateOpen(false); resetForm(); }} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>Report an issue</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Title"
              placeholder="Short description of the issue"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              fullWidth
              autoFocus
            />
            <TextField
              label="Description"
              placeholder="Steps to reproduce, expected vs actual behaviour…"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              fullWidth
              multiline
              rows={4}
            />
            <TextField
              label="Page URL (optional)"
              placeholder="https://…"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              fullWidth
            />
            <Box>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => setScreenshotFile(e.target.files?.[0] ?? null)}
              />
              <Button
                variant="outlined"
                size="small"
                startIcon={uploading ? <CircularProgress size={14} color="inherit" /> : <UploadIcon />}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {screenshotFile ? screenshotFile.name : 'Attach screenshot'}
              </Button>
              {screenshotFile && (
                <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                  {(screenshotFile.size / 1024).toFixed(0)} KB
                </Typography>
              )}
            </Box>
            {formError && <Typography variant="caption" color="error">{formError}</Typography>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => { setCreateOpen(false); resetForm(); }} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={submitting || !newTitle.trim()}
            startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {submitting ? 'Sending…' : 'Send'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

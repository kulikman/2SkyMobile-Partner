'use client';

import { useEffect, useState } from 'react';
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
import Alert from '@mui/material/Alert';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EventNoteIcon from '@mui/icons-material/EventNote';

type Meeting = {
  id: string;
  folder_id: string;
  title: string;
  meeting_date: string;
  summary: string | null;
  created_at: string;
};

export function MeetingsView({ folderId, isAdmin }: { folderId: string; isAdmin: boolean }) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Create / Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Meeting | null>(null);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [summary, setSummary] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    fetch(`/api/meetings?folderId=${folderId}`)
      .then((r) => r.json())
      .then((d) => { setMeetings(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [folderId]);

  function openCreate() {
    setEditTarget(null);
    setTitle('');
    setDate(new Date().toISOString().slice(0, 10));
    setSummary('');
    setDialogOpen(true);
  }

  function openEdit(m: Meeting) {
    setEditTarget(m);
    setTitle(m.title);
    setDate(m.meeting_date);
    setSummary(m.summary ?? '');
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!title.trim() || !date) return;
    setSaving(true);
    setSaveError('');

    if (editTarget) {
      const res = await fetch(`/api/meetings/${editTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), meeting_date: date, summary: summary.trim() || null }),
      });
      if (res.ok) {
        const updated = await res.json();
        setMeetings((prev) => prev.map((m) => m.id === editTarget.id ? updated : m));
        setDialogOpen(false);
      } else {
        const d = await res.json().catch(() => ({}));
        setSaveError(d.error ?? 'Failed to save meeting');
      }
    } else {
      const res = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder_id: folderId, title: title.trim(), meeting_date: date, summary: summary.trim() || null }),
      });
      if (res.ok) {
        const created = await res.json();
        setMeetings((prev) => [created, ...prev]);
        setDialogOpen(false);
      } else {
        const d = await res.json().catch(() => ({}));
        setSaveError(d.error ?? 'Failed to save meeting');
      }
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    await fetch(`/api/meetings/${id}`, { method: 'DELETE' });
    setMeetings((prev) => prev.filter((m) => m.id !== id));
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" fontWeight={700}>Meetings</Typography>
        {isAdmin && (
          <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Add meeting
          </Button>
        )}
      </Stack>

      {loading ? (
        <CircularProgress size={24} />
      ) : meetings.length === 0 ? (
        <Typography variant="body2" color="text.secondary">No meetings yet.</Typography>
      ) : (
        <Stack spacing={1.5}>
          {meetings.map((m) => {
            const isOpen = expanded === m.id;
            return (
              <Paper key={m.id} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{ px: 2.5, py: 1.75, cursor: m.summary ? 'pointer' : 'default' }}
                  onClick={() => m.summary && setExpanded(isOpen ? null : m.id)}
                >
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <EventNoteIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                    <Box>
                      <Typography variant="body1" fontWeight={600}>{m.title}</Typography>
                      <Chip
                        label={new Date(m.meeting_date + 'T00:00:00').toLocaleDateString('en-US', {
                          year: 'numeric', month: 'short', day: 'numeric',
                        })}
                        size="small"
                        variant="outlined"
                        sx={{ mt: 0.5 }}
                      />
                    </Box>
                  </Stack>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    {isAdmin && (
                      <>
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); openEdit(m); }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); handleDelete(m.id); }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </>
                    )}
                    {m.summary && (
                      <ExpandMoreIcon
                        sx={{
                          fontSize: 20, color: 'text.secondary',
                          transform: isOpen ? 'rotate(180deg)' : 'none',
                          transition: 'transform 0.2s',
                        }}
                      />
                    )}
                  </Stack>
                </Stack>

                {m.summary && (
                  <Collapse in={isOpen}>
                    <Divider />
                    <Box sx={{ px: 2.5, py: 2 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={700}
                        sx={{ textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', mb: 1 }}>
                        Summary
                      </Typography>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                        {m.summary}
                      </Typography>
                    </Box>
                  </Collapse>
                )}
              </Paper>
            );
          })}
        </Stack>
      )}

      <Dialog open={dialogOpen} onClose={() => { setDialogOpen(false); setSaveError(''); }} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>{editTarget ? 'Edit meeting' : 'New meeting'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            {saveError && <Alert severity="error">{saveError}</Alert>}
            <TextField
              label="Title / Topic"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              fullWidth
              autoFocus
            />
            <TextField
              label="Date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />
            <TextField
              label="Summary (optional)"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              fullWidth
              multiline
              rows={6}
              placeholder="Meeting notes, decisions, action items…"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => { setDialogOpen(false); setSaveError(''); }} disabled={saving}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !title.trim() || !date}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

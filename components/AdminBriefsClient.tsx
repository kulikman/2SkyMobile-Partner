'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import EmailIcon from '@mui/icons-material/Email';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';

type Brief = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  content: string;
  created_at: string;
  public_access_enabled: boolean;
  anonymous_comments_enabled: boolean;
  public_share_token: string | null;
  folder_id: string | null;
};

const DEFAULT_CONTENT = `## Project Brief / Questionnaire

### 1. About your company
Please describe your company and what you do.

### 2. Project goals
What are the main goals of this project?

### 3. Target audience
Who are your target users?

### 4. Key features
List the main features or functionality you need.

### 5. Design preferences
Do you have a preferred style, brand colors, or references?

### 6. Technical requirements
Any specific technical requirements or integrations?

### 7. Timeline & budget
What is your expected timeline and budget range?

### 8. Additional notes
Anything else we should know?
`;

export function AdminBriefsClient({ initialBriefs }: { initialBriefs: Brief[] }) {
  const [briefs, setBriefs] = useState<Brief[]>(initialBriefs);
  const [copied, setCopied] = useState<string | null>(null);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newContent, setNewContent] = useState(DEFAULT_CONTENT);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Edit dialog
  const [editBrief, setEditBrief] = useState<Brief | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  function openCreate() {
    setNewTitle('');
    setNewDescription('');
    setNewContent(DEFAULT_CONTENT);
    setCreateError('');
    setCreateOpen(true);
  }

  function openEdit(b: Brief) {
    setEditBrief(b);
    setEditTitle(b.title);
    setEditDescription(b.description ?? '');
    setEditContent(b.content);
    setSaveError('');
  }

  function shareUrl(brief: Brief) {
    if (!brief.public_share_token) return null;
    return `${window.location.origin}/share/${brief.public_share_token}`;
  }

  async function copyLink(brief: Brief) {
    const url = shareUrl(brief);
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(brief.id);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // fallback — select text manually
    }
  }

  function openMailto(brief: Brief) {
    const url = shareUrl(brief);
    if (!url) return;
    const subject = encodeURIComponent(`Brief / Questionnaire: ${brief.title}`);
    const body = encodeURIComponent(
      `Hello,\n\nPlease fill out the project brief at the link below:\n\n${url}\n\nThank you!`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  }

  async function handleCreate() {
    if (!newTitle.trim() || !newContent.trim()) return;
    setCreating(true);
    setCreateError('');
    try {
      const res = await fetch('/api/briefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription.trim() || undefined,
          content: newContent.trim(),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setCreateError(j.error ?? 'Failed to create brief');
        return;
      }
      const created: Brief = await res.json();
      setBriefs((prev) => [created, ...prev]);
      setCreateOpen(false);
    } finally {
      setCreating(false);
    }
  }

  async function handleSave() {
    if (!editBrief) return;
    setSaving(true);
    setSaveError('');
    try {
      const res = await fetch(`/api/briefs/${editBrief.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim() || null,
          content: editContent.trim(),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setSaveError(j.error ?? 'Failed to save');
        return;
      }
      const updated: Brief = await res.json();
      setBriefs((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      setEditBrief(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(brief: Brief) {
    if (!window.confirm(`Delete brief "${brief.title}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/briefs/${brief.id}`, { method: 'DELETE' });
    if (res.ok || res.status === 204) {
      setBriefs((prev) => prev.filter((b) => b.id !== brief.id));
    }
  }

  async function toggleAccess(brief: Brief) {
    const next = !brief.public_access_enabled;
    const res = await fetch(`/api/briefs/${brief.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ public_access_enabled: next }),
    });
    if (res.ok) {
      const updated: Brief = await res.json();
      setBriefs((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    }
  }

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Briefs &amp; Questionnaires</Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Create questionnaire documents and send them to clients via a public link.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          New Brief
        </Button>
      </Stack>

      {/* List */}
      {briefs.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 6, textAlign: 'center' }}>
          <DescriptionOutlinedIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary">No briefs yet. Create one to get started.</Typography>
        </Paper>
      ) : (
        <Stack spacing={1.5}>
          {briefs.map((b) => (
            <Paper key={b.id} variant="outlined" sx={{ p: 2.5 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'flex-start' }}>
                <Box flex={1} minWidth={0}>
                  <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                    <Typography variant="subtitle1" fontWeight={600} noWrap>
                      {b.title}
                    </Typography>
                    <Chip
                      label={b.public_access_enabled ? 'Active' : 'Draft'}
                      color={b.public_access_enabled ? 'success' : 'default'}
                      size="small"
                      onClick={() => toggleAccess(b)}
                      sx={{ cursor: 'pointer' }}
                    />
                  </Stack>
                  {b.description && (
                    <Typography variant="body2" color="text.secondary" mb={0.5}>
                      {b.description}
                    </Typography>
                  )}
                  <Typography variant="caption" color="text.disabled">
                    Created {new Date(b.created_at).toLocaleDateString()}
                  </Typography>

                  {b.public_share_token && b.public_access_enabled && (
                    <Box mt={1}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                        {typeof window !== 'undefined'
                          ? `${window.location.origin}/share/${b.public_share_token}`
                          : `/share/${b.public_share_token}`}
                      </Typography>
                    </Box>
                  )}
                </Box>

                <Stack direction="row" spacing={0.5} flexShrink={0} alignItems="center">
                  {b.public_share_token && b.public_access_enabled && (
                    <>
                      <Tooltip title={copied === b.id ? 'Copied!' : 'Copy link'}>
                        <IconButton size="small" onClick={() => copyLink(b)} color={copied === b.id ? 'success' : 'default'}>
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Send via email">
                        <IconButton size="small" onClick={() => openMailto(b)}>
                          <EmailIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
                  <Tooltip title="Edit">
                    <IconButton size="small" onClick={() => openEdit(b)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton size="small" color="error" onClick={() => handleDelete(b)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>New Brief / Questionnaire</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              fullWidth
              autoFocus
              placeholder="e.g. Project Discovery Brief"
            />
            <TextField
              label="Description (optional)"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              fullWidth
              placeholder="Short description shown to the client"
            />
            <TextField
              label="Content (Markdown)"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              fullWidth
              multiline
              rows={16}
              inputProps={{ style: { fontFamily: 'monospace', fontSize: 13 } }}
            />
            {createError && (
              <Typography color="error" variant="body2">{createError}</Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={creating || !newTitle.trim() || !newContent.trim()}
          >
            {creating ? 'Creating…' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editBrief} onClose={() => setEditBrief(null)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Brief</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Title"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              fullWidth
              autoFocus
            />
            <TextField
              label="Description (optional)"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              fullWidth
            />
            <TextField
              label="Content (Markdown)"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              fullWidth
              multiline
              rows={16}
              inputProps={{ style: { fontFamily: 'monospace', fontSize: 13 } }}
            />
            {saveError && (
              <Typography color="error" variant="body2">{saveError}</Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditBrief(null)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !editTitle.trim() || !editContent.trim()}
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

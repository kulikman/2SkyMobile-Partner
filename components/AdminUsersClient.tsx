'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
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
import DeleteIcon from '@mui/icons-material/Delete';

type AdminUser = {
  id: string;
  email: string;
  created_at: string;
};

export function AdminUsersClient({
  initialAdmins,
  currentUserId,
}: {
  initialAdmins: AdminUser[];
  currentUserId: string;
}) {
  const [admins, setAdmins] = useState<AdminUser[]>(initialAdmins);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');

  async function handleAdd() {
    if (!newEmail.trim() || !newPassword.trim()) {
      setError('Email and password are required');
      return;
    }
    setSaving(true);
    setError('');
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newEmail.trim(), password: newPassword }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error ?? 'Error'); return; }
    setAdmins((prev) => [...prev, { id: data.id, email: data.email, created_at: data.created_at }]);
    setAddOpen(false);
    setNewEmail('');
    setNewPassword('');
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    await fetch(`/api/admin/users/${deleteTarget.id}/delete`, { method: 'POST' });
    setSaving(false);
    setAdmins((prev) => prev.filter((u) => u.id !== deleteTarget.id));
    setDeleteTarget(null);
  }

  return (
    <>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
        <div>
          <Typography variant="h5" fontWeight={700}>2SkyMobile Team</Typography>
          <Typography variant="body2" color="text.secondary">
            {admins.length} admin{admins.length !== 1 ? 's' : ''}
          </Typography>
        </div>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setError(''); setAddOpen(true); }}>
          Add admin
        </Button>
      </Stack>

      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
        {admins.map((u, i) => (
          <Box key={u.id}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 3, py: 2 }}>
              <Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="body2" fontWeight={600}>{u.email}</Typography>
                  {u.id === currentUserId && (
                    <Chip label="you" size="small" variant="outlined" color="primary" />
                  )}
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  Added {new Date(u.created_at).toLocaleDateString()}
                </Typography>
              </Box>
              {u.id !== currentUserId && (
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => setDeleteTarget(u)}
                  title="Remove admin"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              )}
            </Stack>
            {i < admins.length - 1 && <Divider />}
          </Box>
        ))}
      </Paper>

      {/* Add admin dialog */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700}>Add team member</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              fullWidth
              autoFocus
            />
            <TextField
              label="Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              fullWidth
            />
            {error && <Typography variant="caption" color="error">{error}</Typography>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAdd} disabled={saving}>
            {saving ? 'Adding…' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700}>Remove team member?</DialogTitle>
        <DialogContent>
          <Typography>
            <strong>{deleteTarget?.email}</strong> will lose access to the platform.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={saving}>
            {saving ? 'Removing…' : 'Remove'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

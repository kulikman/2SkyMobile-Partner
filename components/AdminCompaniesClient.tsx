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
import BusinessIcon from '@mui/icons-material/Business';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { useRouter } from 'next/navigation';

type Company = {
  id: string;
  name: string;
  logo_url: string | null;
  created_at: string;
  user_email?: string;
};

export function AdminCompaniesClient({ initialCompanies }: { initialCompanies: Company[] }) {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>(initialCompanies);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Company | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Create form state
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newLogoUrl, setNewLogoUrl] = useState('');

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editLogoUrl, setEditLogoUrl] = useState('');

  async function handleCreate() {
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) {
      setError('All fields are required');
      return;
    }
    setSaving(true);
    setError('');
    const res = await fetch('/api/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), email: newEmail.trim(), password: newPassword, logo_url: newLogoUrl.trim() || null }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error ?? 'Error'); return; }
    setCompanies((prev) => [{ ...data.company, user_email: newEmail.trim() }, ...prev]);
    setCreateOpen(false);
    setNewName(''); setNewEmail(''); setNewPassword(''); setNewLogoUrl('');
    router.refresh();
  }

  async function handleEdit() {
    if (!editTarget || !editName.trim()) return;
    setSaving(true);
    setError('');
    const res = await fetch(`/api/companies/${editTarget.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.trim(), logo_url: editLogoUrl.trim() || null }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error ?? 'Error'); return; }
    setCompanies((prev) => prev.map((c) => c.id === editTarget.id ? { ...c, name: data.name, logo_url: data.logo_url } : c));
    setEditTarget(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    await fetch(`/api/companies/${deleteTarget.id}`, { method: 'DELETE' });
    setSaving(false);
    setCompanies((prev) => prev.filter((c) => c.id !== deleteTarget.id));
    setDeleteTarget(null);
  }

  return (
    <>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
        <div>
          <Typography variant="h5" fontWeight={700}>Companies</Typography>
          <Typography variant="body2" color="text.secondary">{companies.length} total</Typography>
        </div>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setError(''); setCreateOpen(true); }}>
          New company
        </Button>
      </Stack>

      {companies.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 6, textAlign: 'center', borderRadius: 3 }}>
          <BusinessIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary">No companies yet. Create one to get started.</Typography>
        </Paper>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
          {companies.map((company, i) => (
            <Box key={company.id}>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ px: 3, py: 2 }}
              >
                <Stack direction="row" spacing={2} alignItems="center">
                  <Box
                    sx={{
                      width: 44, height: 44, borderRadius: 2, overflow: 'hidden',
                      bgcolor: 'primary.main', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, border: '1px solid', borderColor: 'divider',
                    }}
                  >
                    {company.logo_url ? (
                      <Box
                        component="img"
                        src={company.logo_url}
                        alt={company.name}
                        sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <Typography variant="subtitle2" color="white" fontWeight={700}>
                        {company.name.slice(0, 2).toUpperCase()}
                      </Typography>
                    )}
                  </Box>
                  <Box>
                    <Typography variant="body1" fontWeight={600}>{company.name}</Typography>
                    <Stack direction="row" spacing={1} mt={0.5} alignItems="center">
                      {company.user_email && (
                        <Chip label={company.user_email} size="small" variant="outlined" />
                      )}
                      <Typography variant="caption" color="text.secondary">
                        Created {new Date(company.created_at).toLocaleDateString()}
                      </Typography>
                    </Stack>
                  </Box>
                </Stack>
                <Stack direction="row" spacing={0.5}>
                  <IconButton
                    size="small"
                    onClick={() => { setEditName(company.name); setEditTarget(company); setError(''); }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => setDeleteTarget(company)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Stack>
              {i < companies.length - 1 && <Divider />}
            </Box>
          ))}
        </Paper>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700}>New company</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Company name" value={newName} onChange={(e) => setNewName(e.target.value)} fullWidth autoFocus />
            <TextField
              label="Logo URL (optional)"
              placeholder="https://example.com/logo.png"
              value={newLogoUrl}
              onChange={(e) => setNewLogoUrl(e.target.value)}
              fullWidth
              helperText="Public image URL — leave blank to use initials"
            />
            {newLogoUrl && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box component="img" src={newLogoUrl} alt="preview"
                  sx={{ width: 40, height: 40, borderRadius: 1, objectFit: 'cover', border: '1px solid', borderColor: 'divider' }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <Typography variant="caption" color="text.secondary">Preview</Typography>
              </Box>
            )}
            <TextField label="Partner email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} fullWidth />
            <TextField label="Password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} fullWidth />
            {error && <Typography variant="caption" color="error">{error}</Typography>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={saving}>
            {saving ? 'Creating…' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit dialog */}
      <Dialog
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        maxWidth="xs"
        fullWidth
        TransitionProps={{ onEnter: () => { setEditLogoUrl(editTarget?.logo_url ?? ''); } }}
      >
        <DialogTitle fontWeight={700}>Edit company</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Company name" value={editName} onChange={(e) => setEditName(e.target.value)} fullWidth autoFocus />
            <TextField
              label="Logo URL"
              placeholder="https://example.com/logo.png"
              value={editLogoUrl}
              onChange={(e) => setEditLogoUrl(e.target.value)}
              fullWidth
              helperText="Leave blank to use initials"
            />
            {editLogoUrl && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box component="img" src={editLogoUrl} alt="preview"
                  sx={{ width: 40, height: 40, borderRadius: 1, objectFit: 'cover', border: '1px solid', borderColor: 'divider' }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <Typography variant="caption" color="text.secondary">Preview</Typography>
              </Box>
            )}
            {error && <Typography variant="caption" color="error">{error}</Typography>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditTarget(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleEdit} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700}>Delete company?</DialogTitle>
        <DialogContent>
          <Typography>
            This will permanently delete <strong>{deleteTarget?.name}</strong> and all associated data. This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={saving}>
            {saving ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

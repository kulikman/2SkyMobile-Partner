'use client';

import { useState } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import BusinessIcon from '@mui/icons-material/Business';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { useRouter } from 'next/navigation';

type Company = {
  id: string;
  name: string;
  logo_url: string | null;
  created_at: string;
  user_email?: string;
};

type UserInfo = {
  id: string;
  email: string;
  role: string;
};

type CompanyMember = {
  id: string;
  company_id: string;
  user_id: string;
};

function generatePassword(len = 14): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export function AdminCompaniesClient({
  initialCompanies,
  allUsers,
  initialMemberships,
}: {
  initialCompanies: Company[];
  allUsers: UserInfo[];
  initialMemberships: CompanyMember[];
}) {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>(initialCompanies);
  const [memberships, setMemberships] = useState<CompanyMember[]>(initialMemberships);
  const [localUsers, setLocalUsers] = useState<UserInfo[]>(allUsers);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newShowPwd, setNewShowPwd] = useState(false);
  const [newLogoUrl, setNewLogoUrl] = useState('');
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  // Edit/Members dialog (unified)
  const [editTarget, setEditTarget] = useState<Company | null>(null);
  const [editTab, setEditTab] = useState(0);
  const [editName, setEditName] = useState('');
  const [editLogoUrl, setEditLogoUrl] = useState('');
  const [editError, setEditError] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Add existing member
  const [selectedUser, setSelectedUser] = useState<UserInfo | null>(null);

  // Create new partner
  const [newPartnerEmail, setNewPartnerEmail] = useState('');
  const [newPartnerPassword, setNewPartnerPassword] = useState('');
  const [newPartnerShowPwd, setNewPartnerShowPwd] = useState(false);
  const [newPartnerError, setNewPartnerError] = useState('');
  const [newPartnerSaving, setNewPartnerSaving] = useState(false);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);
  const [deleting, setDeleting] = useState(false);

  function getMembers(companyId: string) {
    return memberships
      .filter((m) => m.company_id === companyId)
      .map((m) => localUsers.find((u) => u.id === m.user_id))
      .filter(Boolean) as UserInfo[];
  }

  function getAvailableUsers(companyId: string) {
    const memberIds = new Set(memberships.filter((m) => m.company_id === companyId).map((m) => m.user_id));
    return localUsers.filter((u) => !memberIds.has(u.id) && u.role !== 'admin');
  }

  function openEdit(company: Company) {
    setEditTarget(company);
    setEditTab(0);
    setEditName(company.name);
    setEditLogoUrl(company.logo_url ?? '');
    setEditError('');
    setSelectedUser(null);
    setNewPartnerEmail('');
    setNewPartnerPassword('');
    setNewPartnerError('');
  }

  function closeEdit() {
    setEditTarget(null);
    setEditError('');
    setNewPartnerError('');
  }

  async function handleCreate() {
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) {
      setCreateError('All fields are required');
      return;
    }
    setCreating(true);
    setCreateError('');
    const res = await fetch('/api/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), email: newEmail.trim(), password: newPassword, logo_url: newLogoUrl.trim() || null }),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) { setCreateError(data.error ?? 'Error'); return; }
    setCompanies((prev) => [{ ...data.company, user_email: newEmail.trim() }, ...prev]);
    setCreateOpen(false);
    setNewName(''); setNewEmail(''); setNewPassword(''); setNewLogoUrl('');
    router.refresh();
  }

  async function handleEditSave() {
    if (!editTarget || !editName.trim()) return;
    setEditSaving(true);
    setEditError('');
    const res = await fetch(`/api/companies/${editTarget.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.trim(), logo_url: editLogoUrl.trim() || null }),
    });
    const data = await res.json();
    setEditSaving(false);
    if (!res.ok) { setEditError(data.error ?? 'Error'); return; }
    setCompanies((prev) => prev.map((c) => c.id === editTarget.id ? { ...c, name: data.name, logo_url: data.logo_url } : c));
    closeEdit();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    await fetch(`/api/companies/${deleteTarget.id}`, { method: 'DELETE' });
    setDeleting(false);
    setCompanies((prev) => prev.filter((c) => c.id !== deleteTarget.id));
    setDeleteTarget(null);
  }

  async function addMember(companyId: string, userId: string) {
    const res = await fetch(`/api/companies/${companyId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    if (res.ok) {
      const data = await res.json();
      setMemberships((prev) => [...prev, { id: data.id, company_id: data.company_id, user_id: data.user_id }]);
      setSelectedUser(null);
    }
  }

  async function createAndAddMember(companyId: string) {
    if (!newPartnerEmail.trim() || !newPartnerPassword.trim()) {
      setNewPartnerError('Email and password are required');
      return;
    }
    setNewPartnerSaving(true);
    setNewPartnerError('');
    const res = await fetch(`/api/companies/${companyId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newPartnerEmail.trim(), password: newPartnerPassword }),
    });
    const data = await res.json();
    setNewPartnerSaving(false);
    if (!res.ok) { setNewPartnerError(data.error ?? 'Error'); return; }
    const newUser: UserInfo = { id: data.user_id, email: newPartnerEmail.trim(), role: 'viewer' };
    setLocalUsers((prev) => [...prev, newUser]);
    setMemberships((prev) => [...prev, { id: data.id, company_id: data.company_id, user_id: data.user_id }]);
    setNewPartnerEmail('');
    setNewPartnerPassword('');
  }

  async function removeMember(companyId: string, userId: string) {
    const res = await fetch(`/api/companies/${companyId}/members/${userId}`, { method: 'DELETE' });
    if (res.ok) {
      setMemberships((prev) => prev.filter((m) => !(m.company_id === companyId && m.user_id === userId)));
    }
  }

  return (
    <>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
        <div>
          <Typography variant="h5" fontWeight={700}>Companies</Typography>
          <Typography variant="body2" color="text.secondary">{companies.length} total</Typography>
        </div>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setCreateError(''); setCreateOpen(true); }}>
          New company
        </Button>
      </Stack>

      {companies.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 6, textAlign: 'center', borderRadius: 3 }}>
          <BusinessIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary">No companies yet. Create one to get started.</Typography>
        </Paper>
      ) : (
        <Stack spacing={2}>
          {companies.map((company) => {
            const members = getMembers(company.id);
            return (
              <Paper key={company.id} variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 3, py: 2 }}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Box sx={{
                      width: 44, height: 44, borderRadius: 2, overflow: 'hidden',
                      bgcolor: 'primary.main', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, border: '1px solid', borderColor: 'divider',
                    }}>
                      {company.logo_url ? (
                        <Box component="img" src={company.logo_url} alt={company.name}
                          sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <Typography variant="subtitle2" color="white" fontWeight={700}>
                          {company.name.slice(0, 2).toUpperCase()}
                        </Typography>
                      )}
                    </Box>
                    <Box>
                      <Typography variant="body1" fontWeight={600}>{company.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {members.length} member{members.length !== 1 ? 's' : ''} · Created {new Date(company.created_at).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </Stack>
                  <Stack direction="row" spacing={0.5}>
                    <IconButton size="small" onClick={() => openEdit(company)} title="Edit">
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => setDeleteTarget(company)} title="Delete">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Stack>

                {members.length > 0 && (
                  <>
                    <Divider />
                    <Box sx={{ px: 3, py: 1.5 }}>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        {members.map((u) => (
                          <Chip key={u.id} label={u.email} size="small"
                            onDelete={() => removeMember(company.id, u.id)} />
                        ))}
                      </Stack>
                    </Box>
                  </>
                )}
              </Paper>
            );
          })}
        </Stack>
      )}

      {/* Unified Edit + Members dialog */}
      <Dialog open={Boolean(editTarget)} onClose={closeEdit} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700} sx={{ pb: 0 }}>
          {editTarget?.name}
        </DialogTitle>
        <Tabs value={editTab} onChange={(_, v) => setEditTab(v)} sx={{ px: 3 }}>
          <Tab label="Company info" />
          <Tab label="Members" />
        </Tabs>
        <Divider />

        <DialogContent>
          {/* Tab 0: Company info */}
          {editTab === 0 && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Company name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                fullWidth
                autoFocus
              />
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
              {editError && <Typography variant="caption" color="error">{editError}</Typography>}
            </Stack>
          )}

          {/* Tab 1: Members */}
          {editTab === 1 && editTarget && (
            <Stack spacing={2.5} sx={{ mt: 1 }}>

              {/* Add existing user */}
              <Typography variant="subtitle2" color="text.secondary">Add existing user</Typography>
              <Stack direction="row" spacing={1} alignItems="flex-start">
                <Autocomplete
                  options={getAvailableUsers(editTarget.id)}
                  getOptionLabel={(u) => u.email}
                  value={selectedUser}
                  onChange={(_, v) => setSelectedUser(v)}
                  renderInput={(params) => <TextField {...params} label="Search by email" size="small" />}
                  sx={{ flex: 1 }}
                />
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<PersonAddIcon />}
                  disabled={!selectedUser}
                  onClick={() => { if (selectedUser) addMember(editTarget.id, selectedUser.id); }}
                  sx={{ whiteSpace: 'nowrap', mt: 0.25 }}
                >
                  Add
                </Button>
              </Stack>

              <Divider>
                <Typography variant="caption" color="text.secondary">or create new partner account</Typography>
              </Divider>

              {/* Create new partner */}
              <Stack spacing={1.5}>
                <TextField
                  label="Email"
                  type="email"
                  size="small"
                  value={newPartnerEmail}
                  onChange={(e) => setNewPartnerEmail(e.target.value)}
                  fullWidth
                />
                <TextField
                  label="Password"
                  type={newPartnerShowPwd ? 'text' : 'password'}
                  size="small"
                  value={newPartnerPassword}
                  onChange={(e) => setNewPartnerPassword(e.target.value)}
                  fullWidth
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => setNewPartnerPassword(generatePassword())} title="Generate password">
                            <AutorenewIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={() => setNewPartnerShowPwd((v) => !v)}>
                            {newPartnerShowPwd ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />
                {newPartnerError && (
                  <Typography variant="caption" color="error">{newPartnerError}</Typography>
                )}
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={newPartnerSaving ? undefined : <PersonAddIcon />}
                  disabled={newPartnerSaving || !newPartnerEmail.trim() || !newPartnerPassword.trim()}
                  onClick={() => createAndAddMember(editTarget.id)}
                >
                  {newPartnerSaving ? 'Creating…' : 'Create & add'}
                </Button>
              </Stack>

              {/* Current members */}
              {getMembers(editTarget.id).length > 0 && (
                <>
                  <Divider />
                  <Typography variant="subtitle2">Current members</Typography>
                  {getMembers(editTarget.id).map((u) => (
                    <Stack key={u.id} direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2">{u.email}</Typography>
                      <IconButton size="small" color="error" onClick={() => removeMember(editTarget.id, u.id)}>
                        <PersonRemoveIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  ))}
                </>
              )}
              {getMembers(editTarget.id).length === 0 && (
                <Typography variant="body2" color="text.secondary">No members yet</Typography>
              )}
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeEdit}>Cancel</Button>
          {editTab === 0 && (
            <Button variant="contained" onClick={handleEditSave} disabled={editSaving || !editName.trim()}>
              {editSaving ? 'Saving…' : 'Save'}
            </Button>
          )}
          {editTab === 1 && (
            <Button onClick={closeEdit}>Done</Button>
          )}
        </DialogActions>
      </Dialog>

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
            <Divider>
              <Typography variant="caption" color="text.secondary">Primary contact login</Typography>
            </Divider>
            <TextField label="Partner email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} fullWidth />
            <TextField
              label="Password"
              type={newShowPwd ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              fullWidth
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setNewPassword(generatePassword())} title="Generate password">
                        <AutorenewIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => setNewShowPwd((v) => !v)}>
                        {newShowPwd ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
            {createError && <Typography variant="caption" color="error">{createError}</Typography>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={creating}>
            {creating ? 'Creating…' : 'Create'}
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
          <Button variant="contained" color="error" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

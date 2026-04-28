'use client';

import { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import ArticleIcon from '@mui/icons-material/Article';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DashboardIcon from '@mui/icons-material/Dashboard';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import FolderIcon from '@mui/icons-material/Folder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';

type DocType = 'md' | 'whiteboard' | 'report';

type DocFolder = { id: string; name: string; slug: string | null; icon: string | null; color: string | null };
type DocItem = { id: string; slug: string; title: string; doc_type: string; created_at: string; content: string };

type BreadcrumbEntry = { id: string; slug: string | null; name: string };

const cellSx = { py: 1.25, fontWeight: 700, fontSize: 12, borderBottom: '1px solid', borderColor: 'divider' };

function docTypeIcon(doc_type: string) {
  if (doc_type === 'whiteboard') return <DashboardIcon fontSize="small" sx={{ color: 'primary.main' }} />;
  if (doc_type === 'report') return <AssessmentIcon fontSize="small" sx={{ color: 'secondary.main' }} />;
  return <ArticleIcon fontSize="small" sx={{ color: 'text.secondary' }} />;
}

function docTypeLabel(doc_type: string) {
  if (doc_type === 'whiteboard') return 'Whiteboard';
  if (doc_type === 'report') return 'Report';
  return 'Document';
}

const typeChipColor: Record<string, 'default' | 'primary' | 'secondary'> = {
  whiteboard: 'primary',
  report: 'secondary',
  md: 'default',
};

export function DocsView({
  folderId,
  isAdmin,
  canonicalBase,
}: {
  folderId: string;
  isAdmin: boolean;
  canonicalBase?: string;
}) {
  const [path, setPath] = useState<BreadcrumbEntry[]>([{ id: folderId, slug: null, name: '/' }]);
  const [folders, setFolders] = useState<DocFolder[]>([]);
  const [documents, setDocuments] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderSaving, setNewFolderSaving] = useState(false);

  const [newDocOpen, setNewDocOpen] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocType, setNewDocType] = useState<DocType>('md');
  const [newDocSaving, setNewDocSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<{ kind: 'folder' | 'document'; id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const currentFolderId = path[path.length - 1].id;
  const reloadRef = useRef(0);

  function reload() { reloadRef.current += 1; setLoading(true); }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/docs?folder_id=${currentFolderId}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setFolders(data.folders ?? []);
        setDocuments(data.documents ?? []);
        setLoading(false);
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFolderId, reloadRef.current]);

  function navigateInto(folder: DocFolder) {
    setPath((prev) => [...prev, { id: folder.id, slug: folder.slug, name: folder.name }]);
  }

  function navigateTo(idx: number) {
    setPath((prev) => prev.slice(0, idx + 1));
  }

  function docHref(doc: DocItem) {
    if (!canonicalBase) return '#';
    const slugParts = path.slice(1).map((p) => p.slug).filter(Boolean) as string[];
    return [canonicalBase, ...slugParts, doc.slug].join('/');
  }

  async function createFolder() {
    if (!newFolderName.trim()) return;
    setNewFolderSaving(true);
    const res = await fetch('/api/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newFolderName.trim(), parent_id: currentFolderId }),
    });
    if (res.ok) {
      setNewFolderOpen(false);
      setNewFolderName('');
      reload();
    }
    setNewFolderSaving(false);
  }

  async function createDocument() {
    if (!newDocTitle.trim()) return;
    setNewDocSaving(true);
    const res = await fetch('/api/docs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newDocTitle.trim(), doc_type: newDocType, folder_id: currentFolderId }),
    });
    if (res.ok) {
      const doc = await res.json();
      setNewDocOpen(false);
      setNewDocTitle('');
      setNewDocType('md');
      if (canonicalBase) {
        const slugParts = path.slice(1).map((p) => p.slug).filter(Boolean) as string[];
        window.location.href = [canonicalBase, ...slugParts, doc.slug, 'edit'].join('/');
      } else {
        reload();
      }
    }
    setNewDocSaving(false);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const url = deleteTarget.kind === 'folder'
      ? `/api/folders/${deleteTarget.id}`
      : `/api/docs/${deleteTarget.id}`;
    const res = await fetch(url, { method: 'DELETE' });
    if (res.ok) {
      setDeleteTarget(null);
      reload();
    }
    setDeleting(false);
  }

  function downloadMd(doc: DocItem) {
    const blob = new Blob([doc.content ?? ''], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.slug ?? doc.title}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const isEmpty = !loading && folders.length === 0 && documents.length === 0;
  const totalRows = folders.length + documents.length;

  return (
    <Box>
      {/* Top bar: breadcrumbs + action buttons */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2} flexWrap="wrap" gap={1}>
        {/* Breadcrumbs */}
        <Stack direction="row" alignItems="center" spacing={0.5} flexWrap="wrap">
          {path.map((entry, idx) => (
            <Stack key={idx} direction="row" alignItems="center" spacing={0.5}>
              {idx > 0 && <ChevronRightIcon sx={{ fontSize: 16, color: 'text.disabled' }} />}
              {idx < path.length - 1 ? (
                <Typography
                  variant="body2"
                  color="primary"
                  sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                  onClick={() => navigateTo(idx)}
                >
                  {entry.name}
                </Typography>
              ) : (
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <FolderOpenIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
                  <Typography variant="body2" fontWeight={600} color="text.primary">{entry.name}</Typography>
                  {totalRows > 0 && (
                    <Typography variant="caption" color="text.disabled">({totalRows})</Typography>
                  )}
                </Stack>
              )}
            </Stack>
          ))}
        </Stack>

        {isAdmin && (
          <Stack direction="row" spacing={1}>
            <Button size="small" startIcon={<AddIcon />} onClick={() => setNewFolderOpen(true)}>
              Folder
            </Button>
            <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setNewDocOpen(true)}>
              Document
            </Button>
          </Stack>
        )}
      </Stack>

      {/* Table */}
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <CircularProgress size={28} />
          </Box>
        ) : isEmpty ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {isAdmin ? 'No files yet. Create a folder or document to get started.' : 'No files yet.'}
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small" sx={{ tableLayout: 'fixed' }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ ...cellSx, width: 36 }} />
                  <TableCell sx={cellSx}>Name</TableCell>
                  <TableCell sx={{ ...cellSx, width: 130 }}>Category</TableCell>
                  <TableCell sx={{ ...cellSx, width: 90 }} align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {/* Folder rows */}
                {folders.map((folder) => (
                  <TableRow
                    key={`f-${folder.id}`}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => navigateInto(folder)}
                  >
                    <TableCell sx={{ py: 1 }}>
                      <FolderIcon sx={{ fontSize: 18, color: folder.color ?? 'text.secondary', display: 'block' }} />
                    </TableCell>
                    <TableCell sx={{ py: 1 }}>
                      <Typography variant="body2" fontWeight={500} noWrap>{folder.name}</Typography>
                    </TableCell>
                    <TableCell sx={{ py: 1 }}>
                      <Chip label="Folder" size="small" variant="outlined" sx={{ fontSize: 11, height: 20, color: 'text.secondary', borderColor: 'divider' }} />
                    </TableCell>
                    <TableCell sx={{ py: 0.5 }} align="right" onClick={(e) => e.stopPropagation()}>
                      {isAdmin && (
                        <Tooltip title="Delete folder">
                          <IconButton size="small" color="error" onClick={() => setDeleteTarget({ kind: 'folder', id: folder.id, name: folder.name })}>
                            <DeleteIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}

                {/* Document rows */}
                {documents.map((doc) => (
                  <TableRow
                    key={`d-${doc.id}`}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => { if (canonicalBase) window.location.href = docHref(doc); }}
                  >
                    <TableCell sx={{ py: 1 }}>
                      <Box sx={{ display: 'flex' }}>{docTypeIcon(doc.doc_type)}</Box>
                    </TableCell>
                    <TableCell sx={{ py: 1 }}>
                      <Typography variant="body2" fontWeight={500} noWrap>{doc.title}</Typography>
                    </TableCell>
                    <TableCell sx={{ py: 1 }}>
                      <Chip
                        label={docTypeLabel(doc.doc_type)}
                        size="small"
                        variant="outlined"
                        color={typeChipColor[doc.doc_type] ?? 'default'}
                        sx={{ fontSize: 11, height: 20 }}
                      />
                    </TableCell>
                    <TableCell sx={{ py: 0.5 }} align="right" onClick={(e) => e.stopPropagation()}>
                      <Stack direction="row" spacing={0.25} justifyContent="flex-end">
                        {(doc.doc_type === 'md' || doc.doc_type === 'report') && (
                          <Tooltip title="Download .md">
                            <IconButton size="small" onClick={() => downloadMd(doc)}>
                              <DownloadIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        )}
                        {isAdmin && (
                          <Tooltip title="Delete document">
                            <IconButton size="small" color="error" onClick={() => setDeleteTarget({ kind: 'document', id: doc.id, name: doc.title })}>
                              <DeleteIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* New Folder Dialog */}
      <Dialog open={newFolderOpen} onClose={() => setNewFolderOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700}>New folder</DialogTitle>
        <DialogContent>
          <TextField
            label="Folder name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            fullWidth
            autoFocus
            sx={{ mt: 1 }}
            onKeyDown={(e) => { if (e.key === 'Enter') createFolder(); }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setNewFolderOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={newFolderSaving || !newFolderName.trim()} onClick={createFolder}>
            {newFolderSaving ? 'Creating…' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* New Document Dialog */}
      <Dialog open={newDocOpen} onClose={() => setNewDocOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700}>New document</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Title"
              value={newDocTitle}
              onChange={(e) => setNewDocTitle(e.target.value)}
              fullWidth
              autoFocus
            />
            <TextField
              label="Type"
              select
              value={newDocType}
              onChange={(e) => setNewDocType(e.target.value as DocType)}
              fullWidth
            >
              <MenuItem value="md">Document (Markdown)</MenuItem>
              <MenuItem value="whiteboard">Whiteboard</MenuItem>
              <MenuItem value="report">Report</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setNewDocOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={newDocSaving || !newDocTitle.trim()} onClick={createDocument}>
            {newDocSaving ? 'Creating…' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700}>Delete {deleteTarget?.kind}?</DialogTitle>
        <DialogContent>
          <Typography>
            <strong>{deleteTarget?.name}</strong> will be permanently deleted.
            {deleteTarget?.kind === 'folder' && ' All contents will also be removed.'}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="contained" color="error" disabled={deleting} onClick={confirmDelete}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import { createClient } from '@/lib/supabase/client';

// createClient kept for download signed URL only
type ProjectFile = {
  id: string;
  folder_id: string;
  name: string;
  storage_path: string;
  size: number | null;
  mime_type: string | null;
  created_at: string;
};

function formatBytes(bytes: number | null) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ProjectFilesView({
  folderId,
  isAdmin,
}: {
  folderId: string;
  isAdmin: boolean;
}) {
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/projects/files?folderId=${folderId}`)
      .then((r) => r.json())
      .then((d) => { setFiles(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [folderId]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadProgress(0);
    setError('');

    try {
      // 1. Get signed upload URL
      const res = await fetch('/api/projects/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder_id: folderId, filename: file.name }),
      });
      const { signedUrl, storagePath, error: urlErr } = await res.json();
      if (urlErr) throw new Error(urlErr);

      // 2. Upload file directly via signed URL (PUT)
      setUploadProgress(50);
      const uploadRes = await fetch(signedUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
      });
      setUploadProgress(90);
      if (!uploadRes.ok) throw new Error(`Upload failed: ${uploadRes.status}`);

      // 3. Save metadata
      const metaRes = await fetch('/api/projects/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folder_id: folderId,
          name: file.name,
          storage_path: storagePath,
          size: file.size,
          mime_type: file.type || null,
        }),
      });
      const newFile = await metaRes.json();
      if (!metaRes.ok) throw new Error(newFile.error ?? 'Failed to save file');
      setFiles((prev) => [newFile, ...prev]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function handleDownload(file: ProjectFile) {
    const supabase = createClient();
    const { data } = await supabase.storage
      .from('project-files')
      .createSignedUrl(file.storage_path, 60);
    if (data?.signedUrl) {
      const a = document.createElement('a');
      a.href = data.signedUrl;
      a.download = file.name;
      a.click();
    }
  }

  async function handleDelete(file: ProjectFile) {
    await fetch(`/api/projects/files?id=${file.id}`, { method: 'DELETE' });
    setFiles((prev) => prev.filter((f) => f.id !== file.id));
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" fontWeight={700}>Documentation</Typography>
        {isAdmin && (
          <>
            <input
              ref={inputRef}
              type="file"
              style={{ display: 'none' }}
              onChange={handleUpload}
            />
            <Button
              size="small"
              variant="contained"
              startIcon={uploading ? <CircularProgress size={14} color="inherit" /> : <UploadIcon />}
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? `Uploading ${uploadProgress}%` : 'Upload file'}
            </Button>
          </>
        )}
      </Stack>

      {uploading && (
        <LinearProgress variant="determinate" value={uploadProgress} sx={{ mb: 2, borderRadius: 1 }} />
      )}
      {error && <Typography variant="caption" color="error" sx={{ display: 'block', mb: 1 }}>{error}</Typography>}

      {loading ? (
        <CircularProgress size={24} />
      ) : files.length === 0 ? (
        <Typography variant="body2" color="text.secondary">No files uploaded yet.</Typography>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
          {files.map((file, i) => (
            <Box key={file.id}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2.5, py: 1.5 }}>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
                  <AttachFileIcon sx={{ color: 'text.secondary', fontSize: 20, flexShrink: 0 }} />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600} noWrap>{file.name}</Typography>
                    <Stack direction="row" spacing={1} mt={0.25}>
                      {file.size && (
                        <Typography variant="caption" color="text.secondary">{formatBytes(file.size)}</Typography>
                      )}
                      <Typography variant="caption" color="text.secondary">
                        {new Date(file.created_at).toLocaleDateString('en-US')}
                      </Typography>
                      {file.mime_type && (
                        <Chip label={file.mime_type.split('/')[1]?.toUpperCase() ?? file.mime_type} size="small"
                          variant="outlined" sx={{ height: 16, fontSize: 10 }} />
                      )}
                    </Stack>
                  </Box>
                </Stack>
                <Stack direction="row" spacing={0.5}>
                  <IconButton size="small" onClick={() => handleDownload(file)} title="Download">
                    <DownloadIcon fontSize="small" />
                  </IconButton>
                  {isAdmin && (
                    <IconButton size="small" color="error" onClick={() => handleDelete(file)} title="Delete">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </Stack>
              </Stack>
              {i < files.length - 1 && <Divider />}
            </Box>
          ))}
        </Paper>
      )}
    </Box>
  );
}

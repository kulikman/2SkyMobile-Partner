'use client';

import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import UploadIcon from '@mui/icons-material/Upload';

type Props = {
  open: boolean;
  folderId: string;
  projectStartAt?: string | null;
  onClose: () => void;
  onImported: (count: number) => void;
};

export function TaskImportDialog({ open, folderId, projectStartAt, onClose, onImported }: Props) {
  const [sheetUrl, setSheetUrl] = useState('');
  const [startDate, setStartDate] = useState(
    projectStartAt ? projectStartAt.slice(0, 10) : new Date().toISOString().slice(0, 10)
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleImport() {
    if (!sheetUrl.trim()) { setError('Google Sheets URL is required'); return; }
    if (!startDate) { setError('Project start date is required'); return; }

    setLoading(true);
    setError('');

    const res = await fetch('/api/tasks/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder_id: folderId, sheet_url: sheetUrl.trim(), project_start: startDate }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) { setError(data.error ?? 'Import failed'); return; }

    onImported(data.imported ?? 0);
    onClose();
  }

  function handleClose() {
    if (!loading) { setError(''); onClose(); }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle fontWeight={700}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <UploadIcon color="primary" />
          <span>Import decomposition from Google Sheets</span>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <Box>
            <Typography variant="body2" color="text.secondary" mb={1}>
              Expected sheet columns (in order):
            </Typography>
            <Box
              component="pre"
              sx={{
                p: 1.5, borderRadius: 2, bgcolor: 'action.hover',
                fontFamily: 'monospace', fontSize: 12, overflow: 'auto',
              }}
            >
{`Task / Deliverable | Type | Role | Hours | Depends On
─────────────────────────────────────────────────────
Section header row (no Hours = group label)
Task name           | API  | Backend | 20   |
Task name           | UI   | UI/UX   | 16   | 1
Task name           | API  | Mobile  | 40   | 1;2`}
            </Box>
            <Typography variant="caption" color="text.secondary">
              Section header rows (empty Hours column) group the tasks below them.
              &quot;Depends On&quot; is a semicolon-separated list of row numbers (1-based, skipping headers).
            </Typography>
          </Box>

          <TextField
            label="Google Sheets URL"
            placeholder="https://docs.google.com/spreadsheets/d/..."
            value={sheetUrl}
            onChange={(e) => setSheetUrl(e.target.value)}
            fullWidth
            helperText="The sheet must be publicly accessible (Share → Anyone with the link can view)"
          />

          <TextField
            label="Project start date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            fullWidth
            InputLabelProps={{ shrink: true }}
            helperText="Task dates are calculated forward from this date, skipping weekends"
          />

          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={handleClose} disabled={loading}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleImport}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <UploadIcon />}
        >
          {loading ? 'Importing…' : 'Import tasks'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

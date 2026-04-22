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
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import TableContainerMui from '@mui/material/TableContainer';
import UploadIcon from '@mui/icons-material/Upload';

type Props = {
  open: boolean;
  folderId: string;
  projectStartAt?: string | null;
  onClose: () => void;
  onImported: (count: number) => void;
};

const EXAMPLE_ROWS = [
  { phase: '0', module: 'Discovery', tasks: 'Requirements, API analysis, UX flows', estimate: '2 weeks' },
  { phase: '3', module: 'Backend Core', tasks: 'Auth, order mgmt, integrations', estimate: '8–10 weeks' },
  { phase: '3.1', module: 'Backend', tasks: 'User management', estimate: 'Included' },
  { phase: '3.2', module: 'Backend', tasks: 'Order service', estimate: 'Included' },
  { phase: '7', module: 'Testing', tasks: 'QA and validation', estimate: '3 weeks' },
];

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
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle fontWeight={700}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <UploadIcon color="primary" />
          <span>Import decomposition from Google Sheets</span>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>

          {/* Format description */}
          <Box>
            <Typography variant="subtitle2" mb={1}>Expected sheet format</Typography>
            <TableContainerMui component={Box} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    {['Phase', 'Module', 'Key Tasks', 'Deliverable', 'Estimate'].map((h) => (
                      <TableCell key={h} sx={{ fontWeight: 700, fontSize: 12 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {EXAMPLE_ROWS.map((r) => (
                    <TableRow key={r.phase}>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{r.phase}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{r.module}</TableCell>
                      <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>{r.tasks}</TableCell>
                      <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>…</TableCell>
                      <TableCell sx={{ fontSize: 12, fontStyle: r.estimate === 'Included' ? 'italic' : 'normal', color: r.estimate === 'Included' ? 'text.secondary' : 'text.primary' }}>
                        {r.estimate}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainerMui>
            <Stack spacing={0.5} mt={1}>
              <Typography variant="caption" color="text.secondary">
                • <strong>Phase</strong>: numeric, e.g. <code>3</code> = group header, <code>3.1</code> = task
              </Typography>
              <Typography variant="caption" color="text.secondary">
                • <strong>Estimate</strong>: <code>2 weeks</code>, <code>8–10 weeks</code>, or <code>Included</code> (hours distributed from parent)
              </Typography>
              <Typography variant="caption" color="text.secondary">
                • Sheet must be public: Share → Anyone with the link can view
              </Typography>
            </Stack>
          </Box>

          <TextField
            label="Google Sheets URL"
            placeholder="https://docs.google.com/spreadsheets/d/..."
            value={sheetUrl}
            onChange={(e) => setSheetUrl(e.target.value)}
            fullWidth
          />

          <TextField
            label="Project start date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
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

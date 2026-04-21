'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import ArticleIcon from '@mui/icons-material/Article';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export type ReportDoc = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  report_type: string | null;
  report_period_start: string | null;
  report_period_end: string | null;
  created_at: string;
};

const reportTypeLabels: Record<string, string> = {
  weekly: 'Weekly',
  biweekly: 'Biweekly',
  milestone: 'Milestone',
};

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/gi, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

export function ReportList({
  reports: initialReports,
  folderId,
  isAdmin,
}: {
  reports: ReportDoc[];
  folderId: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [reports] = useState(initialReports);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [reportType, setReportType] = useState('weekly');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [loading, setLoading] = useState(false);

  async function createReport() {
    if (!title.trim()) return;
    setLoading(true);

    const res = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.trim(),
        slug: slugify(title.trim()) + '-' + Date.now(),
        content: `# ${title.trim()}\n\nReport content...`,
        folderId,
        report_type: reportType,
        report_period_start: periodStart || null,
        report_period_end: periodEnd || null,
        position: reports.length,
      }),
    });

    if (res.ok) {
      const { slug } = await res.json();
      setDialogOpen(false);
      setTitle('');
      router.push(`/admin/documents/${slug}`);
    }
    setLoading(false);
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" fontWeight={700}>
          Reports
        </Typography>
        {isAdmin && (
          <Button
            startIcon={<AddIcon />}
            size="small"
            variant="contained"
            onClick={() => setDialogOpen(true)}
          >
            Add report
          </Button>
        )}
      </Stack>

      {reports.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No reports yet.
        </Typography>
      ) : (
        <Stack spacing={1.5}>
          {reports.map((report) => (
            <Paper
              key={report.id}
              variant="outlined"
              component={Link}
              href={`/docs/${report.slug}`}
              sx={[
                {
                  p: 2,
                  borderRadius: 3,
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'border-color 0.2s',
                  '&:hover': { borderColor: 'primary.main' },
                },
              ]}
            >
              <Stack direction="row" spacing={1.5} alignItems="center">
                <ArticleIcon sx={{ color: 'primary.main' }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body1" fontWeight={600} noWrap>
                    {report.title}
                  </Typography>
                  {report.description && (
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {report.description}
                    </Typography>
                  )}
                </Box>
                <Stack direction="row" spacing={0.5} alignItems="center" flexShrink={0}>
                  {report.report_type && (
                    <Chip
                      label={reportTypeLabels[report.report_type] ?? report.report_type}
                      size="small"
                      variant="outlined"
                    />
                  )}
                  {report.report_period_start && report.report_period_end && (
                    <Chip
                      label={`${new Date(report.report_period_start).toLocaleDateString('en-US')} — ${new Date(report.report_period_end).toLocaleDateString('en-US')}`}
                      size="small"
                      variant="outlined"
                    />
                  )}
                  <Chip
                    label={new Date(report.created_at).toLocaleDateString('en-US')}
                    size="small"
                    variant="outlined"
                    color="default"
                  />
                </Stack>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New report</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Report title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              fullWidth
              autoFocus
            />
            <TextField
              label="Report type"
              select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              fullWidth
            >
              <MenuItem value="weekly">Weekly</MenuItem>
              <MenuItem value="biweekly">Biweekly</MenuItem>
              <MenuItem value="milestone">Milestone</MenuItem>
            </TextField>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Period start"
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                fullWidth
              />
              <TextField
                label="Period end"
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                fullWidth
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={loading || !title.trim()} onClick={createReport}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

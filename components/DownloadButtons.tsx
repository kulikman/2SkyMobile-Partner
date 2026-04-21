'use client';

import DownloadIcon from '@mui/icons-material/Download';
import PrintIcon from '@mui/icons-material/Print';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';

export function DownloadButtons({
  title,
  content,
  slug,
  printPath,
}: {
  title: string;
  content: string;
  slug: string;
  printPath?: string;
}) {
  function downloadMd() {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function openPrint() {
    window.open(printPath ?? `/docs/${slug}/print`, '_blank');
  }

  return (
    <Stack direction="row" spacing={1}>
      <Button
        size="small"
        variant="outlined"
        startIcon={<DownloadIcon />}
        onClick={downloadMd}
      >
        .md
      </Button>
      <Button
        size="small"
        variant="outlined"
        startIcon={<PrintIcon />}
        onClick={openPrint}
      >
        PDF
      </Button>
    </Stack>
  );
}

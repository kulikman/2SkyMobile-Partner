'use client';

import { useState } from 'react';
import Button from '@mui/material/Button';
import CheckIcon from '@mui/icons-material/Check';
import LinkIcon from '@mui/icons-material/Link';

export function CopyLinkButton() {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const input = document.createElement('input');
      input.value = window.location.href;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <Button
      variant="outlined"
      size="small"
      color={copied ? 'success' : 'inherit'}
      startIcon={copied ? <CheckIcon fontSize="small" /> : <LinkIcon fontSize="small" />}
      onClick={handleCopy}
      sx={{ minWidth: 110 }}
    >
      {copied ? 'Copied!' : 'Copy link'}
    </Button>
  );
}

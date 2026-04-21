'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DashboardIcon from '@mui/icons-material/Dashboard';
import NextLink from 'next/link';

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-');
}

export default function NewWhiteboardPage() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleTitleChange(value: string) {
    setTitle(value);
    if (!slugManuallyEdited) {
      setSlug(slugify(value));
    }
  }

  function handleSlugChange(value: string) {
    setSlugManuallyEdited(true);
    setSlug(slugify(value));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !slug.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          slug: slug.trim(),
          description: description.trim() || null,
          content: '{}',
          doc_type: 'whiteboard',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? 'Failed to create whiteboard');
        return;
      }

      router.push(`/admin/documents/${data.slug}`);
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = title.trim().length > 0 && slug.trim().length > 0 && !submitting;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Container maxWidth="sm" sx={{ py: 5 }}>
        <NextLink href="/" style={{ textDecoration: 'none' }}>
          <Button startIcon={<ArrowBackIcon />} size="small" sx={{ mb: 3 }}>
            Back
          </Button>
        </NextLink>

        <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
          <DashboardIcon color="primary" />
          <Typography variant="h5" fontWeight={700}>
            New whiteboard
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" mb={4}>
          Create a new whiteboard canvas. You can add shapes, text, arrows, and images after creation.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={3}>
            <TextField
              label="Title"
              required
              fullWidth
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="My whiteboard"
              autoFocus
            />

            <TextField
              label="Slug"
              required
              fullWidth
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="my-whiteboard"
              helperText="URL-friendly identifier — auto-generated from title, editable"
            />

            <TextField
              label="Description"
              fullWidth
              multiline
              minRows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description of this whiteboard"
            />

            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={!canSubmit}
              startIcon={<DashboardIcon />}
            >
              {submitting ? 'Creating…' : 'Create whiteboard'}
            </Button>
          </Stack>
        </Box>
      </Container>
    </Box>
  );
}

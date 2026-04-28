'use client';

import { ChangeEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { MarkdownRenderer } from './MarkdownRenderer';
import { isEmbeddedDocumentImage } from '@/lib/document-image';
import { splitDocumentContent } from '@/lib/document-content';
import { DocumentMetaPopover } from './DocumentMetaPopover';

const MAX_IMAGE_UPLOAD_BYTES = 2 * 1024 * 1024;

type FolderOption = { id: string; name: string; indent?: boolean };

export function DocumentEditorForm({
  mode,
  initialTitle = '',
  initialSlug = '',
  initialDescription = '',
  initialImage = '',
  initialContent = '',
  initialPublicAccessEnabled = false,
  initialPublicCommentsVisible = false,
  initialAnonymousCommentsEnabled = false,
  documentId,
  initialFolderId,
  folderOptions = [],
}: {
  mode: 'create' | 'edit';
  initialTitle?: string;
  initialSlug?: string;
  initialDescription?: string;
  initialImage?: string;
  initialContent?: string;
  initialPublicAccessEnabled?: boolean;
  initialPublicCommentsVisible?: boolean;
  initialAnonymousCommentsEnabled?: boolean;
  documentId?: string;
  initialFolderId?: string;
  folderOptions?: FolderOption[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [slug, setSlug] = useState(initialSlug);
  const [description, setDescription] = useState(initialDescription);
  const [image, setImage] = useState(initialImage);
  const [imageUrl, setImageUrl] = useState(
    isEmbeddedDocumentImage(initialImage) ? '' : initialImage
  );
  const [content, setContent] = useState(initialContent);
  const [publicAccessEnabled, setPublicAccessEnabled] = useState(initialPublicAccessEnabled);
  const [publicCommentsVisible, setPublicCommentsVisible] = useState(initialPublicCommentsVisible);
  const [anonymousCommentsEnabled, setAnonymousCommentsEnabled] = useState(initialAnonymousCommentsEnabled);
  const [folderId, setFolderId] = useState(initialFolderId ?? '');
  const [slugTouched, setSlugTouched] = useState(
    mode === 'edit' ? initialSlug !== slugify(initialTitle) : false
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const parsedContent = splitDocumentContent(content);

  function handleTitleChange(value: string) {
    setTitle(value);
    if (!slugTouched) {
      setSlug(slugify(value));
    }
  }

  async function handleImageFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }

    if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
      setError('Image file is too large. Please choose a file up to 2 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) {
        setError('Failed to read the selected image.');
        return;
      }

      setImage(result);
      setImageUrl('');
      setError(null);
    };
    reader.onerror = () => {
      setError('Failed to read the selected image.');
    };
    reader.readAsDataURL(file);
  }

  function clearImage() {
    setImage('');
    setImageUrl('');
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const url = mode === 'create' ? '/api/documents' : `/api/documents/${documentId}`;
    const method = mode === 'create' ? 'POST' : 'PATCH';

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        slug,
        description,
        image,
        content,
        publicAccessEnabled,
        publicCommentsVisible,
        anonymousCommentsEnabled,
        ...(mode === 'edit' && folderId ? { folderId } : {}),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? 'Failed to save document');
      setLoading(false);
      return;
    }

    router.push(`/docs/${data.slug ?? slug}`);
    router.refresh();
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', xl: 'minmax(0, 0.95fr) minmax(0, 1.05fr)' },
        gap: 3,
      }}
    >
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
        <form onSubmit={handleSubmit}>
          <Stack spacing={2.5}>
            <TextField
              label="Title"
              required
              fullWidth
              value={title}
              onChange={(event) => handleTitleChange(event.target.value)}
            />
            <TextField
              label="Slug"
              required
              fullWidth
              value={slug}
              onChange={(event) => {
                setSlugTouched(true);
                setSlug(event.target.value);
              }}
              helperText={`URL: /docs/${slug || '...'}`}
            />
            {mode === 'edit' && folderOptions.length > 0 && (
              <TextField
                label="Folder"
                select
                fullWidth
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
                helperText="Move document to a different folder"
              >
                {folderOptions.map((f) => (
                  <MenuItem key={f.id} value={f.id}>
                    {f.indent ? `   ↳ ${f.name}` : f.name}
                  </MenuItem>
                ))}
              </TextField>
            )}
            <TextField
              label="Description"
              fullWidth
              multiline
              minRows={2}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              helperText="Optional short summary used in document previews."
            />
            <TextField
              label="Image URL"
              fullWidth
              value={imageUrl}
              onChange={(event) => {
                const nextValue = event.target.value;
                setImageUrl(nextValue);
                setImage(nextValue);
              }}
              helperText="Optional public image URL. You can also upload a file below and it will be stored as base64."
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }}>
              <Button component="label" variant="outlined">
                Upload image file
                <input hidden accept="image/*" type="file" onChange={handleImageFileChange} />
              </Button>
              {image && (
                <Button variant="text" color="inherit" onClick={clearImage}>
                  Remove image
                </Button>
              )}
              {isEmbeddedDocumentImage(image) && (
                <Typography variant="body2" color="text.secondary">
                  Embedded image selected (up to 2 MB source file)
                </Typography>
              )}
            </Stack>
            <TextField
              label="Content (Markdown)"
              required
              fullWidth
              multiline
              minRows={18}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              helperText="GFM tables and Mermaid blocks are supported."
              inputProps={{ style: { fontFamily: 'monospace', fontSize: 14, lineHeight: 1.6 } }}
            />
            <Paper
              variant="outlined"
              sx={[
                {
                  p: 2,
                  borderRadius: 2,
                  bgcolor: 'rgba(248, 250, 255, 0.7)',
                },
                (theme) =>
                  theme.applyStyles('dark', {
                    bgcolor: 'rgba(23, 40, 60, 0.7)',
                    borderColor: 'rgba(112, 163, 215, 0.18)',
                  }),
              ]}
            >
              <Stack spacing={1}>
                <Typography variant="subtitle2" fontWeight={700}>
                  Public sharing
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={publicAccessEnabled}
                      onChange={(event) => setPublicAccessEnabled(event.target.checked)}
                    />
                  }
                  label="Enable public access by link"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={publicCommentsVisible}
                      disabled={!publicAccessEnabled}
                      onChange={(event) => setPublicCommentsVisible(event.target.checked)}
                    />
                  }
                  label="Show comments on the public page"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={anonymousCommentsEnabled}
                      disabled={!publicAccessEnabled || !publicCommentsVisible}
                      onChange={(event) => setAnonymousCommentsEnabled(event.target.checked)}
                    />
                  }
                  label="Allow anonymous comments"
                />
              </Stack>
            </Paper>
            {error && <Alert severity="error">{error}</Alert>}
            <Button type="submit" variant="contained" disabled={loading} size="large">
              {loading
                ? mode === 'create'
                  ? 'Creating…'
                  : 'Saving…'
                : mode === 'create'
                  ? 'Create document'
                  : 'Save changes'}
            </Button>
          </Stack>
        </form>
      </Paper>

      <Paper
        variant="outlined"
        sx={[
          {
            p: { xs: 2.5, md: 3.5 },
            borderRadius: '14px',
            bgcolor: 'background.paper',
            boxShadow: '0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04)',
          },
          (theme) =>
            theme.applyStyles('dark', {
              bgcolor: 'background.paper',
            }),
        ]}
      >
        <Stack spacing={2}>
          <Box>
            <Typography variant="overline" color="primary.main" fontWeight={700}>
              Preview
            </Typography>
            <Typography variant="h6" fontWeight={700}>
              Reader-style live preview
            </Typography>
          </Box>
          <Divider />
          {content.trim() ? (
            <Stack spacing={2}>
              {(image || title || description) && (
                <Box>
                  {image && (
                    <Box
                      component="img"
                      src={image}
                      alt={title || 'Document cover'}
                      sx={{
                        width: '100%',
                        maxHeight: 280,
                        objectFit: 'cover',
                        borderRadius: 2,
                        mb: 2,
                        border: '1px solid rgba(12, 123, 220, 0.12)',
                      }}
                    />
                  )}
                  <Box
                    sx={{
                      mb: description ? 1 : 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    <Typography variant="h4" fontWeight={800}>
                      {title || 'Untitled document'}
                    </Typography>
                    <DocumentMetaPopover metadata={parsedContent.metadata} />
                  </Box>
                  {description && (
                    <Typography variant="body1" color="text.secondary">
                      {description}
                    </Typography>
                  )}
                </Box>
              )}
              {!image && !title && !description && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <DocumentMetaPopover metadata={parsedContent.metadata} />
                </Box>
              )}
              <MarkdownRenderer content={parsedContent.body} />
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Start typing Markdown to preview how this document will look in the reading interface.
            </Typography>
          )}
        </Stack>
      </Paper>
    </Box>
  );
}

function slugify(value: string) {
  return value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

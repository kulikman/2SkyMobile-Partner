'use client';

import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import NextLink from 'next/link';
import { DocumentEditorForm } from '@/components/DocumentEditorForm';

export default function NewDocumentPage() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Container maxWidth="xl" sx={{ py: 5 }}>
        <NextLink href="/" style={{ textDecoration: 'none' }}>
          <Button startIcon={<ArrowBackIcon />} size="small" sx={{ mb: 3 }}>
            Back
          </Button>
        </NextLink>

        <Typography variant="h5" fontWeight={700} mb={3}>New document</Typography>
        <DocumentEditorForm mode="create" />
      </Container>
    </Box>
  );
}

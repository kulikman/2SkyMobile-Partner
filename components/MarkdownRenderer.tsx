'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Link from '@mui/material/Link';
import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import { MermaidDiagram } from './MermaidDiagram';

import { memo } from 'react';

export const MarkdownRenderer = memo(function MarkdownRenderer({ content }: { content: string }) {
  return (
    <Box
      sx={{
        maxWidth: 820,
        mx: 'auto',
        userSelect: 'text',
        WebkitUserSelect: 'text',
        WebkitTouchCallout: 'default',
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <Typography variant="h4" fontWeight={700} gutterBottom sx={{ mt: 1 }}>{children}</Typography>,
          h2: ({ children }) => <Typography variant="h5" fontWeight={650} gutterBottom mt={4}>{children}</Typography>,
          h3: ({ children }) => <Typography variant="h6" fontWeight={650} gutterBottom mt={3}>{children}</Typography>,
          p:  ({ children }) => (
            <Typography
              variant="body1"
              paragraph
              sx={{ lineHeight: 1.75, color: 'text.primary' }}
            >
              {children}
            </Typography>
          ),
          a:  ({ href, children }) => <Link href={href} target="_blank" rel="noopener noreferrer">{children}</Link>,
          hr: () => <Divider sx={{ my: 2 }} />,
          li: ({ children }) => (
            <Typography component="li" variant="body1" sx={{ ml: 2, lineHeight: 1.7, mb: 0.75 }}>
              {children}
            </Typography>
          ),
          blockquote: ({ children }) => (
            <Box
              sx={[
                {
                  my: 2,
                  pl: 2,
                  py: 0.5,
                  borderLeft: '4px solid',
                  borderColor: 'rgba(184, 154, 96, 0.5)',
                  bgcolor: 'rgba(247, 242, 231, 0.65)',
                  borderRadius: 1,
                },
                (theme) =>
                  theme.applyStyles('dark', {
                    borderColor: 'rgba(157, 199, 255, 0.45)',
                    bgcolor: 'rgba(23, 40, 60, 0.82)',
                  }),
              ]}
            >
              {children}
            </Box>
          ),
          table: ({ children }) => (
            <TableContainer
              component={Paper}
              variant="outlined"
              sx={[
                { my: 3, borderRadius: 3 },
                (theme) =>
                  theme.applyStyles('dark', {
                    bgcolor: 'rgba(17, 28, 43, 0.98)',
                    borderColor: 'rgba(112, 163, 215, 0.18)',
                  }),
              ]}
            >
              <Table size="small">{children}</Table>
            </TableContainer>
          ),
          thead: ({ children }) => <TableHead>{children}</TableHead>,
          tbody: ({ children }) => <TableBody>{children}</TableBody>,
          tr: ({ children }) => <TableRow>{children}</TableRow>,
          th: ({ children }) => (
            <TableCell
              sx={[
                { fontWeight: 700, bgcolor: 'rgba(247, 242, 231, 0.72)' },
                (theme) =>
                  theme.applyStyles('dark', {
                    bgcolor: 'rgba(23, 40, 60, 0.92)',
                  }),
              ]}
            >
              {children}
            </TableCell>
          ),
          td: ({ children }) => <TableCell sx={{ verticalAlign: 'top' }}>{children}</TableCell>,
          code: ({ className, children }) => {
            const lang = /language-(\w+)/.exec(className ?? '')?.[1];
            const code = String(children).trim();
            if (lang === 'mermaid') return <MermaidDiagram chart={code} />;
            return (
              <Box
                component="code"
                sx={[
                  {
                    bgcolor: 'grey.100',
                    borderRadius: 1,
                    px: 0.5,
                    fontFamily: 'monospace',
                    fontSize: '0.875em',
                  },
                  (theme) =>
                    theme.applyStyles('dark', {
                      bgcolor: 'rgba(23, 40, 60, 0.95)',
                    }),
                ]}
              >
                {children}
              </Box>
            );
          },
          pre: ({ children }) => (
            <Box
              component="pre"
              sx={[
                {
                  bgcolor: 'grey.100',
                  borderRadius: 2,
                  p: 2,
                  overflow: 'auto',
                  mb: 2,
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                },
                (theme) =>
                  theme.applyStyles('dark', {
                    bgcolor: 'rgba(23, 40, 60, 0.95)',
                  }),
              ]}
            >
              {children}
            </Box>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </Box>
  );
});

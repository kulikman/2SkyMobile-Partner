'use client';

import { Suspense, useState } from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import { DocsView } from './DocsView';
import { TechStackEditor } from './TechStackEditor';
import { IssuesView } from './IssuesView';
import { TestingView } from './TestingView';

type CurrentUser = { id: string; email: string; name: string };

// Tab order: Docs(0) Tech Stack(1) Testing(2) Issues(3)

export function ProjectTabs({
  folderId,
  initialSpec,
  isAdmin,
  currentUser,
  canonicalBase,
  initialTab = 0,
}: {
  folderId: string;
  initialSpec: Record<string, string> | null;
  isAdmin: boolean;
  currentUser: CurrentUser;
  canonicalBase?: string;
  initialTab?: number;
}) {
  const [tab, setTab] = useState(initialTab);

  return (
    <Box>
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v as number)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="Docs" />
        <Tab label="Tech Stack" />
        <Tab label="Testing" />
        <Tab label="Issues" />
      </Tabs>

      {/* 0 — Docs */}
      <Box sx={{ display: tab === 0 ? 'block' : 'none' }}>
        <Paper variant="outlined" sx={{ borderRadius: 3, p: 3 }}>
          <DocsView folderId={folderId} isAdmin={isAdmin} canonicalBase={canonicalBase} />
        </Paper>
      </Box>

      {/* 1 — Tech Stack */}
      <Box sx={{ display: tab === 1 ? 'block' : 'none' }}>
        <Paper variant="outlined" sx={{ borderRadius: 3, p: 3 }}>
          <TechStackEditor folderId={folderId} initialSpec={initialSpec} isAdmin={isAdmin} />
        </Paper>
      </Box>

      {/* 2 — Testing */}
      <Box sx={{ display: tab === 2 ? 'block' : 'none' }}>
        <Paper variant="outlined" sx={{ borderRadius: 3, p: 3 }}>
          <TestingView folderId={folderId} currentUser={currentUser} isAdmin={isAdmin} />
        </Paper>
      </Box>

      {/* 3 — Issues */}
      <Box sx={{ display: tab === 3 ? 'block' : 'none' }}>
        <Paper variant="outlined" sx={{ borderRadius: 3, p: 3 }}>
          <Suspense fallback={<Box sx={{ py: 4, textAlign: 'center' }}><CircularProgress size={28} /></Box>}>
            <IssuesView folderId={folderId} isAdmin={isAdmin} currentUser={currentUser} />
          </Suspense>
        </Paper>
      </Box>
    </Box>
  );
}

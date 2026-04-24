'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import { MeetingsView } from './MeetingsView';
import { ProjectFilesView } from './ProjectFilesView';
import { TechStackEditor } from './TechStackEditor';
import { ReportList } from './ReportList';
import { IssuesView } from './IssuesView';
import { TestingView } from './TestingView';
import type { ReportDoc } from './ReportList';

type CurrentUser = { id: string; email: string; name: string };

// Tab order: Reports(0) Tech Stack(1) Documentation(2) Meetings(3) Testing(4) Issues(5)

export function ProjectTabs({
  folderId,
  reports,
  initialSpec,
  isAdmin,
  currentUser,
  canonicalBase,
}: {
  folderId: string;
  reports: ReportDoc[];
  initialSpec: Record<string, string> | null;
  isAdmin: boolean;
  currentUser: CurrentUser;
  canonicalBase?: string;
}) {
  const [tab, setTab] = useState(0);

  return (
    <Box>
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v as number)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="Reports" />
        <Tab label="Tech Stack" />
        <Tab label="Documentation" />
        <Tab label="Meetings" />
        <Tab label="Testing" />
        <Tab label="Issues" />
      </Tabs>

      {/* 0 — Reports */}
      <Box sx={{ display: tab === 0 ? 'block' : 'none' }}>
        <Paper variant="outlined" sx={{ borderRadius: 3, p: 3 }}>
          <ReportList reports={reports} folderId={folderId} isAdmin={isAdmin} canonicalBase={canonicalBase} />
        </Paper>
      </Box>

      {/* 1 — Tech Stack */}
      <Box sx={{ display: tab === 1 ? 'block' : 'none' }}>
        <Paper variant="outlined" sx={{ borderRadius: 3, p: 3 }}>
          <TechStackEditor folderId={folderId} initialSpec={initialSpec} isAdmin={isAdmin} />
        </Paper>
      </Box>

      {/* 2 — Documentation */}
      <Box sx={{ display: tab === 2 ? 'block' : 'none' }}>
        <Paper variant="outlined" sx={{ borderRadius: 3, p: 3 }}>
          <ProjectFilesView folderId={folderId} isAdmin={isAdmin} />
        </Paper>
      </Box>

      {/* 3 — Meetings */}
      <Box sx={{ display: tab === 3 ? 'block' : 'none' }}>
        <Paper variant="outlined" sx={{ borderRadius: 3, p: 3 }}>
          <MeetingsView folderId={folderId} isAdmin={isAdmin} />
        </Paper>
      </Box>

      {/* 4 — Testing */}
      <Box sx={{ display: tab === 4 ? 'block' : 'none' }}>
        <Paper variant="outlined" sx={{ borderRadius: 3, p: 3 }}>
          <TestingView folderId={folderId} currentUser={currentUser} isAdmin={isAdmin} />
        </Paper>
      </Box>

      {/* 5 — Issues */}
      <Box sx={{ display: tab === 5 ? 'block' : 'none' }}>
        <Paper variant="outlined" sx={{ borderRadius: 3, p: 3 }}>
          <IssuesView folderId={folderId} isAdmin={isAdmin} currentUser={currentUser} />
        </Paper>
      </Box>
    </Box>
  );
}

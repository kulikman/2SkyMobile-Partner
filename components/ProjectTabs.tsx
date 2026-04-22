'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import { TasksView } from './TasksView';
import { RoadmapView } from './RoadmapView';
import { MeetingsView } from './MeetingsView';
import { ProjectFilesView } from './ProjectFilesView';
import { TechStackEditor } from './TechStackEditor';
import { ReportList } from './ReportList';
import { IssuesView } from './IssuesView';
import type { Task } from './TasksView';
import type { RoadmapItem } from './RoadmapView';
import type { ReportDoc } from './ReportList';

type CurrentUser = { id: string; email: string; name: string };

export function ProjectTabs({
  folderId,
  projectStartAt,
  initialTasks,
  roadmapItems,
  reports,
  initialSpec,
  isAdmin,
  currentUser,
}: {
  folderId: string;
  projectStartAt: string | null;
  initialTasks: Task[];
  roadmapItems: RoadmapItem[];
  reports: ReportDoc[];
  initialSpec: Record<string, string> | null;
  isAdmin: boolean;
  currentUser: CurrentUser;
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
        <Tab label="Tasks" />
        <Tab label="Issues" />
        <Tab label="Roadmap" />
        <Tab label="Meetings" />
        <Tab label="Documentation" />
        <Tab label="Tech Stack" />
        <Tab label="Reports" />
      </Tabs>

      {tab === 0 && (
        <TasksView
          initialTasks={initialTasks}
          folderId={folderId}
          projectStartAt={projectStartAt}
          isAdmin={isAdmin}
          currentUser={currentUser}
        />
      )}

      {tab === 1 && (
        <Paper variant="outlined" sx={{ borderRadius: 3, p: 3 }}>
          <IssuesView folderId={folderId} isAdmin={isAdmin} />
        </Paper>
      )}

      {tab === 2 && (
        <Paper variant="outlined" sx={{ borderRadius: 3, p: 3 }}>
          <RoadmapView items={roadmapItems} folderId={folderId} isAdmin={isAdmin} />
        </Paper>
      )}

      {tab === 3 && (
        <Paper variant="outlined" sx={{ borderRadius: 3, p: 3 }}>
          <MeetingsView folderId={folderId} isAdmin={isAdmin} />
        </Paper>
      )}

      {tab === 4 && (
        <Paper variant="outlined" sx={{ borderRadius: 3, p: 3 }}>
          <ProjectFilesView folderId={folderId} isAdmin={isAdmin} />
        </Paper>
      )}

      {tab === 5 && (
        <Paper variant="outlined" sx={{ borderRadius: 3, p: 3 }}>
          <TechStackEditor folderId={folderId} initialSpec={initialSpec} isAdmin={isAdmin} />
        </Paper>
      )}

      {tab === 6 && (
        <Paper variant="outlined" sx={{ borderRadius: 3, p: 3 }}>
          <ReportList reports={reports} folderId={folderId} isAdmin={isAdmin} />
        </Paper>
      )}
    </Box>
  );
}

'use client';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { RoadmapView } from './RoadmapView';
import { ReportList } from './ReportList';
import { ProjectChat } from './ProjectChat';
import type { RoadmapItem } from './RoadmapView';
import type { ReportDoc } from './ReportList';

export type ProjectData = {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  status: string;
  progress: number;
  client_name: string | null;
  started_at: string | null;
  deadline_at: string | null;
};

type CurrentUser = {
  id: string;
  email: string;
  name: string;
};

const statusLabels: Record<string, string> = {
  in_progress: 'In progress',
  in_discussion: 'In discussion',
  completed: 'Completed',
  archived: 'Archived',
};

const statusColors: Record<string, 'success' | 'warning' | 'info' | 'default'> = {
  in_progress: 'success',
  in_discussion: 'warning',
  completed: 'info',
  archived: 'default',
};

export function ProjectDetail({
  project,
  roadmapItems,
  reports,
  currentUser,
  isAdmin,
}: {
  project: ProjectData;
  roadmapItems: RoadmapItem[];
  reports: ReportDoc[];
  currentUser: CurrentUser;
  isAdmin: boolean;
}) {
  const isInProgress = project.status === 'in_progress';

  return (
    <Box>
      {/* Project header */}
      <Stack spacing={1.5} mb={4}>
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="h4" fontWeight={800}>
            {project.name}
          </Typography>
          <Chip
            label={statusLabels[project.status] ?? project.status}
            color={statusColors[project.status] ?? 'default'}
            size="small"
          />
        </Stack>

        {project.client_name && (
          <Typography variant="body1" color="text.secondary">
            Client: {project.client_name}
          </Typography>
        )}

        {isInProgress && (
          <Box sx={{ maxWidth: 400 }}>
            <Stack direction="row" justifyContent="space-between" mb={0.5}>
              <Typography variant="body2" color="text.secondary">
                Overall progress
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {project.progress}%
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={project.progress}
              sx={{ borderRadius: 2, height: 8 }}
            />
          </Box>
        )}

        {(project.started_at || project.deadline_at) && (
          <Stack direction="row" spacing={2}>
            {project.started_at && (
              <Typography variant="body2" color="text.secondary">
                Started: {new Date(project.started_at).toLocaleDateString('en-US')}
              </Typography>
            )}
            {project.deadline_at && (
              <Typography variant="body2" color="text.secondary">
                Deadline: {new Date(project.deadline_at).toLocaleDateString('en-US')}
              </Typography>
            )}
          </Stack>
        )}
      </Stack>

      {/* Roadmap section - only for in-progress projects */}
      {isInProgress && (
        <>
          <RoadmapView items={roadmapItems} folderId={project.id} isAdmin={isAdmin} />
          <Divider sx={{ my: 4 }} />
        </>
      )}

      {/* Reports section */}
      <ReportList reports={reports} folderId={project.id} isAdmin={isAdmin} />

      {/* Chat FAB + Drawer */}
      <ProjectChat folderId={project.id} currentUser={currentUser} />
    </Box>
  );
}

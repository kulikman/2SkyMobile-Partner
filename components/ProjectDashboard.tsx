'use client';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import FolderIcon from '@mui/icons-material/Folder';
import Link from 'next/link';

export type ProjectForDashboard = {
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

function ProjectCard({ project }: { project: ProjectForDashboard }) {
  const isInProgress = project.status === 'in_progress';

  return (
    <Card
      variant="outlined"
      sx={[
        {
          borderRadius: 4,
          transition: 'border-color 0.2s, box-shadow 0.2s',
          '&:hover': { borderColor: 'primary.main', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' },
        },
        (theme) =>
          theme.applyStyles('dark', {
            '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.3)' },
          }),
      ]}
    >
      <CardActionArea component={Link} href={`/projects/${project.id}`}>
        <CardContent sx={{ p: 2.5 }}>
          <Stack direction="row" spacing={1.5} alignItems="center" mb={1.5}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                bgcolor: project.color ?? 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FolderIcon sx={{ color: 'white', fontSize: 22 }} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle1" fontWeight={700} noWrap>
                {project.name}
              </Typography>
              {project.client_name && (
                <Typography variant="caption" color="text.secondary">
                  {project.client_name}
                </Typography>
              )}
            </Box>
          </Stack>

          {isInProgress && (
            <Box mb={1}>
              <Stack direction="row" justifyContent="space-between" mb={0.5}>
                <Typography variant="caption" color="text.secondary">
                  Progress
                </Typography>
                <Typography variant="caption" fontWeight={600}>
                  {project.progress}%
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={project.progress}
                sx={{ borderRadius: 2, height: 6 }}
              />
            </Box>
          )}

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip
              label={isInProgress ? 'In progress' : 'In discussion'}
              size="small"
              color={isInProgress ? 'success' : 'warning'}
              variant="outlined"
            />
            {project.deadline_at && (
              <Chip
                label={`Deadline: ${new Date(project.deadline_at).toLocaleDateString('en-US')}`}
                size="small"
                variant="outlined"
              />
            )}
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export function ProjectDashboard({
  projects,
  isAdmin,
}: {
  projects: ProjectForDashboard[];
  isAdmin: boolean;
}) {
  const inProgress = projects.filter((p) => p.status === 'in_progress');
  const inDiscussion = projects.filter((p) => p.status === 'in_discussion');

  return (
    <Stack spacing={4}>
      {inProgress.length > 0 && (
        <Box>
          <Typography variant="h5" fontWeight={700} mb={2}>
            Projects in progress
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(3, 1fr)',
              },
              gap: 2,
            }}
          >
            {inProgress.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </Box>
        </Box>
      )}

      {inDiscussion.length > 0 && (
        <Box>
          <Typography variant="h5" fontWeight={700} mb={2}>
            Projects in discussion
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(3, 1fr)',
              },
              gap: 2,
            }}
          >
            {inDiscussion.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </Box>
        </Box>
      )}

      {projects.length === 0 && (
        <Typography variant="body1" color="text.secondary" textAlign="center" py={8}>
          {isAdmin ? 'No projects yet. Create your first project in the admin panel.' : 'No projects available.'}
        </Typography>
      )}
    </Stack>
  );
}

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ChecklistRoundedIcon from '@mui/icons-material/ChecklistRounded';
import EditNoteRoundedIcon from '@mui/icons-material/EditNoteRounded';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import ViewSidebarRoundedIcon from '@mui/icons-material/ViewSidebarRounded';
import type { SxProps, Theme } from '@mui/material/styles';
import { Navbar } from '@/components/Navbar';
import { createClient } from '@/lib/supabase/server';
import { MermaidDiagram } from '@/components/MermaidDiagram';

const roadmap = [
  {
    phase: 'MVP',
    priority: 'High',
    timing: '4-6 person-weeks',
    goals: [
      'Core reading screen, authentication, highlighting, and note creation',
      'Starter component kit: Reader, Highlighter, NoteCard, Sidebar',
      'Critical-path tests and basic analytics',
    ],
  },
  {
    phase: 'v1',
    priority: 'Medium',
    timing: '8-10 person-weeks',
    goals: [
      'Responsive polish for phones and tablets',
      'Comment threads, table of contents, and reading progress',
      'Moderation, document history, and accessibility audits',
    ],
  },
  {
    phase: 'v2',
    priority: 'Low',
    timing: '10-12 person-weeks',
    goals: [
      'SSO, search, notifications, and multilingual UX',
      'PWA or mobile app exploration',
      'Scaling work: queues, caching, and deeper analytics',
    ],
  },
];

const componentRows = [
  ['Reader', 'content, onHighlight, theme', 'Markdown rendering, scroll behavior, and selection hooks'],
  ['AnnotationHighlighter', 'ranges, color, onClickAnnotation', 'Persistent highlights tied to note state'],
  ['NoteCard', 'author, timestamp, content, replies', 'Compact note card with reply affordances'],
  ['Sidebar', 'visible, notes, onClose', 'Context panel for the annotation list and focus state'],
  ['CommentThread', 'annotationId, comments, onPost', 'Discussion stream for a single anchor'],
  ['Editor', 'initialContent, onSave, readOnly', 'Admin surface for editing Markdown content'],
  ['AuthForms', 'type, onSubmit', 'Entry points for login and signup'],
  ['MobileBottomBar', 'options, onAction', 'Mobile action bar for thumb-friendly navigation'],
];

const storageRows = [
  [
    'Embedded in Markdown',
    'A single file stores both text and annotations',
    'Hard to version, merge, and moderate safely',
  ],
  [
    'Separate collection',
    'Best foundation for moderation, filtering, and version history',
    'Requires a resilient anchoring strategy when content changes',
  ],
  [
    'Pure char-range offsets',
    'Simple indexing and fast lookup by position',
    'Very fragile when content changes',
  ],
];

const metricRows = [
  ['Activation', 'Active readers, note authors, invited users who return'],
  ['Engagement', 'Reading time, scroll depth, notes read, and notes created'],
  ['Quality', 'Accessibility score, moderation resolution time, and error-free sessions'],
  ['Performance', 'LCP, time to interactive, and heavy-document render time'],
];

const readingFlow = `
flowchart LR
    A[User signs in] --> B[System loads the Markdown document]
    B --> C[User reads and selects a text fragment]
    C --> D[Inline action appears]
    D --> E[User writes a note]
    E --> F[System saves the annotation and updates the sidebar]
    F --> G[The selected passage stays highlighted]
`;

const moderationFlow = `
flowchart LR
    A[Moderator opens the queue] --> B[System returns notes]
    B --> C[Moderator approves, hides, or deletes]
    C --> D[System updates status]
    D --> E[Audit trail and UI refresh]
`;

const adminFlow = `
flowchart LR
    A[Admin opens the editor] --> B[System loads the current Markdown]
    B --> C[Admin edits and saves]
    C --> D[System stores a new version]
    D --> E[Readers are notified if needed]
`;

function Section({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography
          variant="overline"
          sx={{ letterSpacing: '0.18em', color: 'primary.main', fontWeight: 700 }}
        >
          {eyebrow}
        </Typography>
        <Typography variant="h4" fontWeight={700} sx={{ mb: 1 }}>
          {title}
        </Typography>
        {description && (
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 760 }}>
            {description}
          </Typography>
        )}
      </Box>
      {children}
    </Stack>
  );
}

function Surface({
  children,
  sx,
}: {
  children: React.ReactNode;
  sx?: SxProps<Theme>;
}) {
  return (
    <Paper
      variant="outlined"
      sx={[
        {
          borderRadius: 5,
          borderColor: 'rgba(115, 94, 63, 0.18)',
          backgroundColor: 'rgba(255,255,255,0.94)',
          boxShadow: '0 24px 60px rgba(68, 53, 34, 0.08)',
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      {children}
    </Paper>
  );
}

function MetricCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <Surface sx={{ p: 2.5, height: '100%' }}>
      <Stack spacing={1.5}>
        <Box sx={{ color: 'primary.main' }}>{icon}</Box>
        <Typography variant="h6" fontWeight={700}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {text}
        </Typography>
      </Stack>
    </Surface>
  );
}

function DesktopMockup() {
  return (
    <Surface sx={{ p: { xs: 2, md: 3 }, overflow: 'hidden' }}>
      <Stack spacing={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack spacing={0.5}>
            <Typography variant="subtitle2" color="text.secondary">
              Desktop reader
            </Typography>
            <Typography variant="h6" fontWeight={700}>
              Focused reading with contextual discussion
            </Typography>
          </Stack>
          <Chip label="680-800px text measure" size="small" />
        </Stack>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.9fr) 320px' },
            gap: 2,
          }}
        >
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 2, md: 3 },
              borderRadius: 4,
              background:
                'linear-gradient(180deg, rgba(255,252,247,1) 0%, rgba(252,249,243,1) 100%)',
            }}
          >
            <Stack spacing={2}>
              <Typography variant="h5" fontWeight={700}>
                Your content should lead the experience
              </Typography>
              <Typography variant="body1" color="text.secondary">
                A calm text column, generous line-height, restrained surfaces, and highlights
                that support discussion without breaking reading flow.
              </Typography>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 3,
                  backgroundColor: 'rgba(194, 159, 84, 0.16)',
                  borderLeft: '4px solid',
                  borderColor: 'primary.main',
                }}
              >
                <Typography variant="body1">
                  A compact action appears on selection, and the saved passage remains softly
                  emphasized after the note is created.
                </Typography>
              </Box>
              <Typography variant="body1" color="text.secondary">
                The note list lives beside the document, so the primary text stays calm and
                scannable even in long-form content.
              </Typography>
            </Stack>
          </Paper>

          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: 4,
              bgcolor: 'rgba(250, 247, 241, 0.9)',
            }}
          >
            <Stack spacing={1.5}>
              <Typography variant="subtitle2" color="text.secondary">
                Annotation sidebar
              </Typography>
              {[
                'Comment on a highlighted claim',
                'Question about section wording',
                'Suggestion for structure and table of contents',
              ].map((note, index) => (
                <Paper
                  key={note}
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    borderRadius: 3,
                    borderColor: index === 0 ? 'primary.main' : 'divider',
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    Annotation #{index + 1}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {note}
                  </Typography>
                </Paper>
              ))}
            </Stack>
          </Paper>
        </Box>
      </Stack>
    </Surface>
  );
}

function MobileMockup() {
  return (
    <Surface sx={{ p: { xs: 2, md: 3 } }}>
      <Stack spacing={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack spacing={0.5}>
            <Typography variant="subtitle2" color="text.secondary">
              Mobile reader
            </Typography>
            <Typography variant="h6" fontWeight={700}>
              Clean mobile experience
            </Typography>
          </Stack>
          <Chip label="Mobile-first" size="small" variant="outlined" />
        </Stack>
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Paper
            variant="outlined"
            sx={{
              width: 296,
              borderRadius: '32px',
              p: 1.2,
              background:
                'linear-gradient(180deg, rgba(251,248,242,1) 0%, rgba(244,238,229,1) 100%)',
            }}
          >
            <Paper
              elevation={0}
              sx={{
                minHeight: 560,
                borderRadius: '26px',
                p: 2,
                position: 'relative',
                overflow: 'hidden',
                backgroundColor: 'rgba(255,255,255,0.86)',
              }}
            >
              <Stack spacing={1.5}>
                <Box
                  sx={{
                    width: 56,
                    height: 6,
                    borderRadius: 999,
                    bgcolor: 'rgba(95, 78, 53, 0.15)',
                    alignSelf: 'center',
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  48% read
                </Typography>
                <Box sx={{ height: 4, borderRadius: 999, bgcolor: 'rgba(95, 78, 53, 0.09)' }}>
                  <Box
                    sx={{
                      width: '48%',
                      height: '100%',
                      borderRadius: 999,
                      bgcolor: 'primary.main',
                    }}
                  />
                </Box>
                <Typography variant="h6" fontWeight={700}>
                  Reading without overload
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Shorter line length, generous tap targets, and a compact bottom action bar.
                </Typography>
                <Box
                  sx={{
                    mt: 1,
                    p: 1.5,
                    borderRadius: 3,
                    bgcolor: 'rgba(194, 159, 84, 0.14)',
                    border: '1px dashed rgba(194, 159, 84, 0.5)',
                  }}
                >
                  <Typography variant="body2">
                    The mini-tool appears near the selection without covering the primary text.
                  </Typography>
                </Box>
              </Stack>

              <Paper
                variant="outlined"
                sx={{
                  position: 'absolute',
                  left: 16,
                  right: 16,
                  bottom: 16,
                  borderRadius: 999,
                  px: 2,
                  py: 1,
                  bgcolor: 'rgba(58, 74, 94, 0.96)',
                  color: 'white',
                }}
              >
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption">Menu</Typography>
                  <Typography variant="caption">Annotate</Typography>
                  <Typography variant="caption">Profile</Typography>
                </Stack>
              </Paper>
            </Paper>
          </Paper>
        </Box>
      </Stack>
    </Surface>
  );
}

export default async function BlueprintPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAdmin = user?.user_metadata?.role === 'admin';

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background:
          'radial-gradient(circle at top, rgba(230,219,199,0.45) 0%, rgba(245,241,233,0.92) 28%, #f6f3ed 100%)',
      }}
    >
      <Navbar isAdmin={Boolean(isAdmin)} />

      <Container maxWidth="xl" sx={{ py: { xs: 4, md: 6 } }}>
        <Stack spacing={6}>
          <Surface sx={{ p: { xs: 3, md: 5 } }}>
            <Stack spacing={3}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.5}
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                justifyContent="space-between"
              >
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip label="Executive summary" color="primary" />
                  <Chip label="UI / UX / Architecture" variant="outlined" />
                </Stack>
                <Link href="/" style={{ textDecoration: 'none' }}>
                  <Button startIcon={<ArrowBackIcon />}>Back to documents</Button>
                </Link>
              </Stack>

              <Box sx={{ maxWidth: 920 }}>
                <Typography
                  variant="h2"
                  sx={{
                    fontWeight: 800,
                    letterSpacing: '-0.04em',
                    fontSize: { xs: '2.4rem', md: '4rem' },
                    lineHeight: 1,
                    mb: 2,
                  }}
                >
                  Threadoc blueprint for readable, collaborative Markdown.
                </Typography>
                <Typography
                  variant="h6"
                  color="text.secondary"
                  sx={{ maxWidth: 820, lineHeight: 1.6, fontWeight: 400 }}
                >
                  The core idea is simple: content leads, interface supports. This page turns
                  that principle into a phased roadmap, concrete components, annotation
                  strategy, mockups, flow diagrams, and measurable outcomes.
                </Typography>
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: 'repeat(4, minmax(0, 1fr))' },
                  gap: 2,
                }}
              >
                <MetricCard
                  icon={<EditNoteRoundedIcon />}
                  title="Reading at the center"
                  text="The main column should stay calm, spacious, and easy to scan."
                />
                <MetricCard
                  icon={<ViewSidebarRoundedIcon />}
                  title="Annotations beside"
                  text="Notes live beside the text instead of inside it, so discussion does not break reading."
                />
                <MetricCard
                  icon={<ChecklistRoundedIcon />}
                  title="Phased delivery"
                  text="MVP, v1, and v2 increase product value without bloating the first release."
                />
                <MetricCard
                  icon={<InsightsRoundedIcon />}
                  title="Measurable outcomes"
                  text="Success is tracked through engagement, accessibility, and performance."
                />
              </Box>
            </Stack>
          </Surface>

          <Section
            eyebrow="Roadmap"
            title="A phased plan with visible outcomes"
            description="First ship a reliable collaborative reading core, then layer in responsiveness, moderation, document history, and scaling features."
          >
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', lg: 'repeat(3, minmax(0, 1fr))' },
                gap: 2,
              }}
            >
              {roadmap.map((item, index) => (
                <Surface key={item.phase} sx={{ p: 3 }}>
                  <Stack spacing={2}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="h5" fontWeight={700}>
                        {item.phase}
                      </Typography>
                      <Chip
                        label={item.priority}
                        color={index === 0 ? 'primary' : 'default'}
                        variant={index === 0 ? 'filled' : 'outlined'}
                        size="small"
                      />
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {item.timing}
                    </Typography>
                    <Divider />
                    <Stack spacing={1.2}>
                      {item.goals.map((goal) => (
                        <Typography key={goal} variant="body2">
                          {goal}
                        </Typography>
                      ))}
                    </Stack>
                  </Stack>
                </Surface>
              ))}
            </Box>
          </Section>

          <Section
            eyebrow="Mockups"
            title="Interface direction"
            description="The visual language is calm and warm: a centered reading column, generous spacing, restrained highlights, and a clear separation between text and discussion."
          >
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', xl: '1.5fr 1fr' },
                gap: 2,
              }}
            >
              <DesktopMockup />
              <MobileMockup />
            </Box>
          </Section>

          <Section
            eyebrow="Design decisions"
            title="Reading rules that shape the UI"
            description="These principles translate the content-first thesis into typography, layout, responsiveness, and annotation behavior."
          >
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
                gap: 2,
              }}
            >
              {[
                {
                  title: 'Typography',
                  body: 'Use a calm body size around 16px, a line-height around 1.55, and a measure around 50-75 characters on desktop with shorter lines on mobile.',
                },
                {
                  title: 'Grid and spacing',
                  body: 'Prefer one adaptive reading column with 16-32px side gutters and a maximum text width around 680-800px.',
                },
                {
                  title: 'Color and contrast',
                  body: 'Use color as a structural cue: soft neutrals for surfaces, one primary accent for action, and WCAG-safe contrast in both themes.',
                },
                {
                  title: 'Annotation behavior',
                  body: 'Show a compact action near the selection, keep saved highlights subtle, and reveal note details in a sidebar or sheet.',
                },
              ].map((item) => (
                <Surface key={item.title} sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
                    {item.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.body}
                  </Typography>
                </Surface>
              ))}
            </Box>
          </Section>

          <Section
            eyebrow="Flows"
            title="Core user journeys"
            description="These diagrams cover three product-critical paths: annotation creation, moderation, and admin editing."
          >
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', xl: 'repeat(3, minmax(0, 1fr))' },
                gap: 2,
              }}
            >
              <Surface sx={{ p: 2.5 }}>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
                  Reading and commenting
                </Typography>
                <MermaidDiagram chart={readingFlow} />
              </Surface>
              <Surface sx={{ p: 2.5 }}>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
                  Moderation
                </Typography>
                <MermaidDiagram chart={moderationFlow} />
              </Surface>
              <Surface sx={{ p: 2.5 }}>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
                  Admin editing
                </Typography>
                <MermaidDiagram chart={adminFlow} />
              </Surface>
            </Box>
          </Section>

          <Section
            eyebrow="Tables"
            title="Components, storage, and metrics"
            description="These three planning tables cover component APIs, annotation persistence, and product measurement."
          >
            <Stack spacing={2}>
              <Surface sx={{ overflow: 'hidden' }}>
                <Box sx={{ p: 2.5, pb: 0 }}>
                  <Typography variant="h6" fontWeight={700}>
                    UI components
                  </Typography>
                </Box>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Component</TableCell>
                        <TableCell>Key props / API</TableCell>
                        <TableCell>Description</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {componentRows.map(([name, api, description]) => (
                        <TableRow key={name}>
                          <TableCell sx={{ fontWeight: 700 }}>{name}</TableCell>
                          <TableCell>{api}</TableCell>
                          <TableCell>{description}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Surface>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', xl: '1.3fr 1fr' },
                  gap: 2,
                }}
              >
                <Surface sx={{ overflow: 'hidden' }}>
                  <Box sx={{ p: 2.5, pb: 0 }}>
                    <Typography variant="h6" fontWeight={700}>
                      Annotation storage strategy
                    </Typography>
                  </Box>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Method</TableCell>
                          <TableCell>Strengths</TableCell>
                          <TableCell>Tradeoffs</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {storageRows.map(([method, strengths, tradeoffs]) => (
                          <TableRow key={method}>
                            <TableCell sx={{ fontWeight: 700 }}>{method}</TableCell>
                            <TableCell>{strengths}</TableCell>
                            <TableCell>{tradeoffs}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Surface>

                <Surface sx={{ overflow: 'hidden' }}>
                  <Box sx={{ p: 2.5, pb: 0 }}>
                    <Typography variant="h6" fontWeight={700}>
                      Success metrics
                    </Typography>
                  </Box>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Area</TableCell>
                          <TableCell>What to track</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {metricRows.map(([area, track]) => (
                          <TableRow key={area}>
                            <TableCell sx={{ fontWeight: 700 }}>{area}</TableCell>
                            <TableCell>{track}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Surface>
              </Box>
            </Stack>
          </Section>

          <Section
            eyebrow="Architecture"
            title="Implementation guidance"
            description="The recommended default is to keep annotations outside the Markdown source, reinforce them with resilient anchors, and optimize the reader for long documents."
          >
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
                gap: 2,
              }}
            >
              {[
                'Store annotations in a separate collection keyed by document id, anchor metadata, and nearby context.',
                'Index anchors by range so the reader fetches only notes relevant to the visible fragment.',
                'Use section-based chunking and lazy rendering for long Markdown documents.',
                'Prefer SSR or SSG for the reading surface, then hydrate annotations and interactions separately.',
              ].map((item) => (
                <Surface key={item} sx={{ p: 3 }}>
                  <Typography variant="body2">{item}</Typography>
                </Surface>
              ))}
            </Box>
          </Section>
        </Stack>
      </Container>
    </Box>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import CloseIcon from '@mui/icons-material/Close';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import ReplyIcon from '@mui/icons-material/Reply';
import SendIcon from '@mui/icons-material/Send';
import UploadIcon from '@mui/icons-material/Upload';
import { TaskImportDialog } from '@/components/TaskImportDialog';

export type Task = {
  id: string;
  folder_id: string;
  group_label: string | null;
  title: string;
  description: string | null;
  type: string | null;
  role: string | null;
  status: string;
  estimated_hours: number | null;
  start_date: string | null;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
};

type TaskComment = {
  id: string;
  task_id: string;
  user_id: string | null;
  author_name: string;
  content: string;
  parent_id: string | null;
  created_at: string;
};

type CurrentUser = { id: string; email: string; name: string };

const STATUSES = [
  { value: 'backlog',            label: 'Backlog',             color: '#9e9e9e' },
  { value: 'in_progress',        label: 'In progress',         color: '#1976d2' },
  { value: 'ready_for_testing',  label: 'Ready for testing',   color: '#f57c00' },
  { value: 'approved',           label: 'Approved',            color: '#388e3c' },
  { value: 'done',               label: 'Done',                color: '#5c35cc' },
];

const ROLE_COLORS: Record<string, string> = {
  Backend:       '#1565c0',
  Mobile:        '#2e7d32',
  'UI/UX':       '#6a1b9a',
  QA:            '#e65100',
};

const TYPE_COLORS: Record<string, string> = {
  API:            '#1976d2',
  'Native API':  '#0277bd',
  UI:             '#7b1fa2',
  Feature:        '#00695c',
  Integration:    '#f57f17',
  Infrastructure: '#4e342e',
  Testing:        '#c62828',
};

function StatusChip({ status, onChange }: { status: string; onChange?: (s: string) => void; isAdmin: boolean }) {
  const s = STATUSES.find((x) => x.value === status) ?? STATUSES[0];
  if (!onChange) {
    return (
      <Chip label={s.label} size="small"
        sx={{ bgcolor: s.color + '22', color: s.color, fontWeight: 600, fontSize: 11, border: `1px solid ${s.color}44` }} />
    );
  }
  return (
    <Select
      value={status}
      size="small"
      onChange={(e) => onChange(e.target.value)}
      sx={{ fontSize: 12, height: 28, '.MuiOutlinedInput-notchedOutline': { borderColor: s.color + '66' }, color: s.color, fontWeight: 600 }}
    >
      {STATUSES.map((x) => (
        <MenuItem key={x.value} value={x.value} sx={{ fontSize: 12 }}>{x.label}</MenuItem>
      ))}
    </Select>
  );
}

function TaskRow({ task, isAdmin, onStatusChange, onOpenComments }:
  { task: Task; isAdmin: boolean;
    onStatusChange: (id: string, status: string) => void;
    onOpenComments: (task: Task) => void }) {

  const [updating, setUpdating] = useState(false);

  async function handleStatus(newStatus: string) {
    setUpdating(true);
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    setUpdating(false);
    onStatusChange(task.id, newStatus);
  }

  return (
    <TableRow hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
      <TableCell sx={{ pl: 4, maxWidth: 320 }}>
        <Typography variant="body2" fontWeight={500}>{task.title}</Typography>
        {task.description && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            {task.description.slice(0, 80)}{task.description.length > 80 ? '…' : ''}
          </Typography>
        )}
      </TableCell>
      <TableCell>
        {task.type && (
          <Chip label={task.type} size="small" variant="outlined"
            sx={{ fontSize: 11, borderColor: TYPE_COLORS[task.type] ?? '#9e9e9e',
              color: TYPE_COLORS[task.type] ?? '#9e9e9e' }} />
        )}
      </TableCell>
      <TableCell>
        {task.role && (
          <Typography variant="caption" fontWeight={700}
            sx={{ color: ROLE_COLORS[task.role] ?? 'text.primary' }}>
            {task.role}
          </Typography>
        )}
      </TableCell>
      <TableCell align="right">
        <Typography variant="body2">{task.estimated_hours != null ? `${task.estimated_hours} h` : '—'}</Typography>
      </TableCell>
      <TableCell>
        {updating ? <CircularProgress size={18} /> : (
          <StatusChip
            status={task.status}
            isAdmin={isAdmin}
            onChange={isAdmin ? handleStatus : undefined}
          />
        )}
      </TableCell>
      <TableCell align="center">
        <Tooltip title="Comments">
          <IconButton size="small" onClick={() => onOpenComments(task)}>
            <ChatBubbleOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
}

function GroupRow({ label, count: taskCount, open, onToggle }: { label: string; count: number; open: boolean; onToggle: () => void }) {
  return (
    <TableRow
      onClick={onToggle}
      sx={{ cursor: 'pointer', bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' } }}
    >
      <TableCell colSpan={6} sx={{ py: 1, px: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          {open ? <KeyboardArrowDownIcon sx={{ color: 'white', fontSize: 18 }} />
                : <KeyboardArrowRightIcon sx={{ color: 'white', fontSize: 18 }} />}
          <Typography variant="body2" fontWeight={700} sx={{ color: 'white', flex: 1 }}>{label}</Typography>
          <Chip label={taskCount} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.25)', color: 'white', fontWeight: 700, height: 20, fontSize: 11 }} />
        </Stack>
      </TableCell>
    </TableRow>
  );
}

// ── Timeline / Gantt view ──────────────────────────────────────────────────

function TimelineView({ tasks }: { tasks: Task[] }) {
  const dated = tasks.filter((t) => t.start_date && t.due_date);
  if (dated.length === 0) {
    return <Typography variant="body2" color="text.secondary" sx={{ p: 3 }}>No dates assigned. Import a decomposition first.</Typography>;
  }

  const minDate = new Date(dated.reduce((m, t) => t.start_date! < m ? t.start_date! : m, dated[0].start_date!));
  const maxDate = new Date(dated.reduce((m, t) => t.due_date! > m ? t.due_date! : m, dated[0].due_date!));
  const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / 86400000) + 1;

  function pct(dateStr: string) {
    const d = new Date(dateStr);
    return Math.max(0, Math.min(100, ((d.getTime() - minDate.getTime()) / 86400000) / totalDays * 100));
  }
  function width(start: string, end: string) {
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    return Math.max(0.5, (e - s) / 86400000 / totalDays * 100);
  }

  const months: { label: string; pct: number }[] = [];
  const cur = new Date(minDate);
  cur.setDate(1);
  while (cur <= maxDate) {
    months.push({
      label: cur.toLocaleDateString('en', { month: 'short', year: '2-digit' }),
      pct: Math.max(0, (cur.getTime() - minDate.getTime()) / 86400000 / totalDays * 100),
    });
    cur.setMonth(cur.getMonth() + 1);
  }

  const s = STATUSES;
  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Box sx={{ minWidth: 700 }}>
        {/* Month headers */}
        <Box sx={{ position: 'relative', height: 28, ml: '200px', borderBottom: 1, borderColor: 'divider' }}>
          {months.map((m) => (
            <Typography key={m.label} variant="caption" color="text.secondary" fontWeight={600}
              sx={{ position: 'absolute', left: `${m.pct}%`, transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}>
              {m.label}
            </Typography>
          ))}
        </Box>
        {/* Rows */}
        {dated.map((task) => {
          const st = s.find((x) => x.value === task.status) ?? s[0];
          return (
            <Stack key={task.id} direction="row" alignItems="center" sx={{ height: 36, borderBottom: 1, borderColor: 'divider' }}>
              <Box sx={{ width: 200, flexShrink: 0, pr: 1.5, overflow: 'hidden' }}>
                <Tooltip title={task.title}>
                  <Typography variant="caption" fontWeight={500} noWrap>{task.title}</Typography>
                </Tooltip>
              </Box>
              <Box sx={{ flex: 1, position: 'relative', height: '100%', display: 'flex', alignItems: 'center' }}>
                <Tooltip title={`${task.start_date} → ${task.due_date} | ${task.estimated_hours ?? '?'} h | ${st.label}`}>
                  <Box sx={{
                    position: 'absolute',
                    left: `${pct(task.start_date!)}%`,
                    width: `${width(task.start_date!, task.due_date!)}%`,
                    height: 18, borderRadius: 1,
                    bgcolor: st.color + 'cc',
                    minWidth: 4,
                  }} />
                </Tooltip>
              </Box>
            </Stack>
          );
        })}
      </Box>
    </Box>
  );
}

// ── Comments drawer ─────────────────────────────────────────────────────────

function CommentsDrawer({ task, onClose }:
  { task: Task | null; onClose: () => void }) {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<TaskComment | null>(null);
  const [sending, setSending] = useState(false);

  const loadComments = useCallback(async (taskId: string) => {
    const res = await fetch(`/api/task-comments?taskId=${taskId}`);
    const data = await res.json();
    if (Array.isArray(data)) setComments(data);
    setLoaded(true);
  }, []);

  // Reset + load when task changes
  useEffect(() => {
    if (!task) return;
    setComments([]);
    setLoaded(false);
    setText('');
    setReplyTo(null);
    loadComments(task.id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id]);

  if (!task) return null;

  async function send() {
    if (!text.trim()) return;
    setSending(true);
    const res = await fetch('/api/task-comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_id: task!.id, content: text.trim(), parent_id: replyTo?.id ?? null }),
    });
    if (res.ok) {
      const c = await res.json();
      setComments((prev) => [...prev, c]);
      setText('');
      setReplyTo(null);
    }
    setSending(false);
  }

  const roots = comments.filter((c) => !c.parent_id);
  const replies = (parentId: string) => comments.filter((c) => c.parent_id === parentId);

  return (
    <Drawer anchor="right" open={!!task} onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100vw', sm: 420 }, display: 'flex', flexDirection: 'column' } }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between"
        sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
        <Box>
          <Typography variant="subtitle2" fontWeight={700}>Comments</Typography>
          <Typography variant="caption" color="text.secondary" noWrap>{task.title}</Typography>
        </Box>
        <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
      </Stack>

      <Box sx={{ flex: 1, overflow: 'auto', px: 2, py: 1.5 }}>
        {!loaded ? (
          <Box display="flex" justifyContent="center" pt={4}><CircularProgress size={24} /></Box>
        ) : roots.length === 0 ? (
          <Typography variant="body2" color="text.secondary" textAlign="center" mt={4}>
            No comments yet. Be the first!
          </Typography>
        ) : (
          <Stack spacing={2}>
            {roots.map((root) => (
              <Box key={root.id}>
                <CommentBubble comment={root} onReply={() => setReplyTo(root)} />
                {replies(root.id).map((r) => (
                  <Box key={r.id} sx={{ ml: 3, mt: 1 }}>
                    <CommentBubble comment={r} onReply={() => setReplyTo(root)} />
                  </Box>
                ))}
              </Box>
            ))}
          </Stack>
        )}
      </Box>

      <Box sx={{ px: 2, py: 1.5, borderTop: 1, borderColor: 'divider' }}>
        {replyTo && (
          <Stack direction="row" alignItems="center" justifyContent="space-between"
            sx={{ mb: 1, px: 1.5, py: 0.75, bgcolor: 'action.hover', borderRadius: 1.5 }}>
            <Typography variant="caption" color="text.secondary">
              Replying to <strong>{replyTo.author_name}</strong>
            </Typography>
            <IconButton size="small" onClick={() => setReplyTo(null)}><CloseIcon fontSize="small" /></IconButton>
          </Stack>
        )}
        <Stack direction="row" spacing={1}>
          <TextField
            value={text} onChange={(e) => setText(e.target.value)}
            placeholder="Write a comment…" size="small" fullWidth multiline maxRows={4}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          />
          <IconButton color="primary" disabled={sending || !text.trim()} onClick={send}>
            {sending ? <CircularProgress size={18} /> : <SendIcon />}
          </IconButton>
        </Stack>
      </Box>
    </Drawer>
  );
}

function CommentBubble({ comment, onReply }: { comment: TaskComment; onReply: () => void }) {
  return (
    <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
        <Typography variant="caption" fontWeight={700}>{comment.author_name}</Typography>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Typography variant="caption" color="text.disabled">
            {new Date(comment.created_at).toLocaleDateString()}
          </Typography>
          {!comment.parent_id && (
            <IconButton size="small" onClick={onReply} sx={{ p: 0.25 }}>
              <ReplyIcon sx={{ fontSize: 14 }} />
            </IconButton>
          )}
        </Stack>
      </Stack>
      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{comment.content}</Typography>
    </Box>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

type Props = {
  initialTasks: Task[];
  folderId: string;
  projectStartAt?: string | null;
  isAdmin: boolean;
  currentUser: CurrentUser;
};

export function TasksView({ initialTasks, folderId, projectStartAt, isAdmin }: Props) {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  useEffect(() => { setTasks(initialTasks); }, [initialTasks]);

  const [view, setView] = useState<'table' | 'timeline'>('table');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [importError, setImportError] = useState('');

  function toggleGroup(label: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) { next.delete(label); } else { next.add(label); }
      return next;
    });
  }

  function handleStatusChange(id: string, status: string) {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status } : t));
  }

  async function handleImported() {
    setImportOpen(false);
    setImportError('');
    try {
      const r = await fetch(`/api/tasks?folderId=${folderId}`);
      const data = await r.json();
      if (Array.isArray(data)) {
        setTasks(data);
        router.refresh();
      } else {
        setImportError(data?.error ?? 'Failed to load imported tasks');
        router.refresh();
      }
    } catch {
      router.refresh();
    }
  }

  const filtered = tasks.filter((t) => {
    if (filterRole && t.role !== filterRole) return false;
    if (filterStatus && t.status !== filterStatus) return false;
    return true;
  });

  const groups = Array.from(new Set(filtered.map((t) => t.group_label ?? ''))).filter(Boolean);
  const ungrouped = filtered.filter((t) => !t.group_label);

  const allRoles = Array.from(new Set(tasks.map((t) => t.role).filter(Boolean))) as string[];

  const doneCount = tasks.filter((t) => t.status === 'done').length;
  const progress = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0;

  return (
    <>
      {/* Header */}
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }}
        justifyContent="space-between" spacing={1} mb={2}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Tabs value={view} onChange={(_, v) => setView(v)} sx={{ minHeight: 36 }}>
            <Tab value="table" label="Table" sx={{ minHeight: 36, py: 0 }} />
            <Tab value="timeline" label="Timeline" sx={{ minHeight: 36, py: 0 }} />
          </Tabs>
          <Typography variant="caption" color="text.secondary">{tasks.length} tasks · {progress}% done</Typography>
        </Stack>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {allRoles.length > 0 && (
            <Select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}
              displayEmpty size="small" sx={{ fontSize: 13, height: 32 }}>
              <MenuItem value=""><em>All roles</em></MenuItem>
              {allRoles.map((r) => <MenuItem key={r} value={r} sx={{ fontSize: 13 }}>{r}</MenuItem>)}
            </Select>
          )}
          <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            displayEmpty size="small" sx={{ fontSize: 13, height: 32 }}>
            <MenuItem value=""><em>All statuses</em></MenuItem>
            {STATUSES.map((s) => <MenuItem key={s.value} value={s.value} sx={{ fontSize: 13 }}>{s.label}</MenuItem>)}
          </Select>
          {isAdmin && (
            <Button size="small" variant="outlined" startIcon={<UploadIcon />}
              onClick={() => setImportOpen(true)}>
              Import
            </Button>
          )}
        </Stack>
      </Stack>

      {/* Progress bar */}
      {tasks.length > 0 && (
        <Box mb={2}>
          <LinearProgress variant="determinate" value={progress} sx={{ height: 6, borderRadius: 3 }} />
        </Box>
      )}

      {tasks.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 5, textAlign: 'center', borderRadius: 3 }}>
          <Typography color="text.secondary" mb={2}>No tasks yet.</Typography>
          {isAdmin && (
            <Button variant="contained" startIcon={<UploadIcon />} onClick={() => setImportOpen(true)}>
              Import decomposition
            </Button>
          )}
        </Paper>
      ) : view === 'timeline' ? (
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', p: 2 }}>
          <TimelineView tasks={filtered} />
        </Paper>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, pl: 4 }}>Task / Deliverable</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Role</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Hours</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center" />
                </TableRow>
              </TableHead>
              <TableBody>
                {groups.map((group) => {
                  const groupTasks = filtered.filter((t) => t.group_label === group);
                  const isOpen = !collapsedGroups.has(group);
                  return [
                    <GroupRow key={`g-${group}`} label={group} count={groupTasks.length}
                      open={isOpen} onToggle={() => toggleGroup(group)} />,
                    ...(isOpen ? groupTasks.map((t) => (
                      <TaskRow key={t.id} task={t} isAdmin={isAdmin}
                        onStatusChange={handleStatusChange} onOpenComments={setActiveTask} />
                    )) : []),
                  ];
                })}
                {ungrouped.map((t) => (
                  <TaskRow key={t.id} task={t} isAdmin={isAdmin}
                    onStatusChange={handleStatusChange} onOpenComments={setActiveTask} />
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Summary row */}
          <Divider />
          <Stack direction="row" spacing={2} sx={{ px: 3, py: 1.5 }} flexWrap="wrap" useFlexGap>
            <Typography variant="caption" color="text.secondary">
              Total: <strong>{tasks.reduce((s, t) => s + (t.estimated_hours ?? 0), 0)} h</strong>
            </Typography>
            {STATUSES.map((s) => {
              const cnt = tasks.filter((t) => t.status === s.value).length;
              if (!cnt) return null;
              return (
                <Typography key={s.value} variant="caption" sx={{ color: s.color }}>
                  {s.label}: <strong>{cnt}</strong>
                </Typography>
              );
            })}
          </Stack>
        </Paper>
      )}

      <CommentsDrawer task={activeTask} onClose={() => setActiveTask(null)} />

      {importError && (
        <Alert severity="error" onClose={() => setImportError('')} sx={{ mt: 2 }}>
          Import error: {importError}
        </Alert>
      )}

      {isAdmin && (
        <TaskImportDialog
          open={importOpen}
          folderId={folderId}
          projectStartAt={projectStartAt}
          onClose={() => setImportOpen(false)}
          onImported={handleImported}
        />
      )}
    </>
  );
}

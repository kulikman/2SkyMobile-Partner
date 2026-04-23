'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
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
import AddIcon from '@mui/icons-material/Add';
import ChatBubbleIcon from '@mui/icons-material/ChatBubble';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
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

function TaskRow({ task, isAdmin, hasComments, onStatusChange, onOpenComments, onEdit, onDelete }:
  { task: Task; isAdmin: boolean; hasComments: boolean;
    onStatusChange: (id: string, status: string) => void;
    onOpenComments: (task: Task) => void;
    onEdit: (task: Task) => void;
    onDelete: (id: string) => void }) {

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
      <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
        <Stack direction="row" spacing={0} alignItems="center" justifyContent="center">
          {isAdmin && (
            <Tooltip title="Edit">
              <IconButton size="small" onClick={() => onEdit(task)} sx={{ color: 'text.disabled' }}>
                <EditIcon sx={{ fontSize: 15 }} />
              </IconButton>
            </Tooltip>
          )}
          {isAdmin && (
            <Tooltip title="Delete">
              <IconButton size="small" color="error" onClick={() => onDelete(task.id)}>
                <DeleteIcon sx={{ fontSize: 15 }} />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Comments">
            <IconButton size="small" onClick={() => onOpenComments(task)}
              sx={{ color: hasComments ? 'primary.main' : 'text.disabled' }}>
              {hasComments
                ? <ChatBubbleIcon sx={{ fontSize: 16 }} />
                : <ChatBubbleOutlineIcon sx={{ fontSize: 16 }} />}
            </IconButton>
          </Tooltip>
        </Stack>
      </TableCell>
    </TableRow>
  );
}

// ── Task form dialog ──────────────────────────────────────────────────────────

const TYPES_LIST = ['API', 'Native API', 'UI', 'Feature', 'Integration', 'Infrastructure', 'Testing'];
const ROLES_LIST = ['Backend', 'Mobile', 'UI/UX', 'QA'];

type TaskForm = {
  title: string; description: string; group_label: string;
  type: string; role: string; estimated_hours: string;
  start_date: string; due_date: string;
};
const EMPTY_TASK_FORM: TaskForm = {
  title: '', description: '', group_label: '',
  type: '', role: '', estimated_hours: '',
  start_date: '', due_date: '',
};

function TaskFormDialog({ open, editTarget, folderId, taskCount, onClose, onSaved }: {
  open: boolean;
  editTarget: Task | null;
  folderId: string;
  taskCount: number;
  onClose: () => void;
  onSaved: (task: Task) => void;
}) {
  const [form, setForm] = useState<TaskForm>(EMPTY_TASK_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setError('');
      setForm(editTarget ? {
        title: editTarget.title,
        description: editTarget.description ?? '',
        group_label: editTarget.group_label ?? '',
        type: editTarget.type ?? '',
        role: editTarget.role ?? '',
        estimated_hours: editTarget.estimated_hours != null ? String(editTarget.estimated_hours) : '',
        start_date: editTarget.start_date ?? '',
        due_date: editTarget.due_date ?? '',
      } : EMPTY_TASK_FORM);
    }
  }, [open, editTarget]);

  function set<K extends keyof TaskForm>(key: K, val: string) {
    setForm((p) => ({ ...p, [key]: val }));
  }

  async function handleSave() {
    if (!form.title.trim()) return;
    setSaving(true);
    setError('');

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      group_label: form.group_label.trim() || null,
      type: form.type || null,
      role: form.role || null,
      estimated_hours: form.estimated_hours ? parseFloat(form.estimated_hours) : null,
      start_date: form.start_date || null,
      due_date: form.due_date || null,
      ...(editTarget ? {} : { folder_id: folderId, position: taskCount }),
    };

    const res = await fetch(
      editTarget ? `/api/tasks/${editTarget.id}` : '/api/tasks',
      { method: editTarget ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload) }
    );
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error ?? 'Failed to save'); return; }
    onSaved(data);
  }

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} maxWidth="sm" fullWidth>
      <DialogTitle fontWeight={700}>{editTarget ? 'Edit task' : 'New task'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="Title" value={form.title} onChange={(e) => set('title', e.target.value)}
            fullWidth autoFocus required />
          <TextField label="Description" value={form.description}
            onChange={(e) => set('description', e.target.value)}
            fullWidth multiline rows={2} />
          <TextField label="Group / Phase" value={form.group_label}
            onChange={(e) => set('group_label', e.target.value)}
            fullWidth placeholder="e.g. Phase 1 — Backend" />
          <Stack direction="row" spacing={2}>
            <TextField label="Type" select value={form.type}
              onChange={(e) => set('type', e.target.value)} fullWidth>
              <MenuItem value=""><em>None</em></MenuItem>
              {TYPES_LIST.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </TextField>
            <TextField label="Role" select value={form.role}
              onChange={(e) => set('role', e.target.value)} fullWidth>
              <MenuItem value=""><em>None</em></MenuItem>
              {ROLES_LIST.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
            </TextField>
          </Stack>
          <Stack direction="row" spacing={2}>
            <TextField label="Hours" type="number" value={form.estimated_hours}
              onChange={(e) => set('estimated_hours', e.target.value)}
              slotProps={{ htmlInput: { min: 0, step: 0.5 } }} fullWidth />
            <TextField label="Start date" type="date" value={form.start_date}
              onChange={(e) => set('start_date', e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }} fullWidth />
            <TextField label="Due date" type="date" value={form.due_date}
              onChange={(e) => set('due_date', e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }} fullWidth />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={handleSave}
          disabled={saving || !form.title.trim()}
          startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}>
          {saving ? 'Saving…' : editTarget ? 'Save changes' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
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

function CommentsDrawer({ task, currentUser, onClose, onCommentAdded }:
  { task: Task | null; currentUser: CurrentUser; onClose: () => void;
    onCommentAdded: (taskId: string, comment: TaskComment) => void }) {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const chatEndRef = useCallback((el: HTMLDivElement | null) => {
    el?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadComments = useCallback(async (taskId: string) => {
    const res = await fetch(`/api/task-comments?taskId=${taskId}`);
    const data = await res.json();
    if (Array.isArray(data)) setComments(data);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!task) return;
    setComments([]);
    setLoaded(false);
    setText('');
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
      body: JSON.stringify({ task_id: task!.id, content: text.trim() }),
    });
    if (res.ok) {
      const c = await res.json();
      setComments((prev) => [...prev, c]);
      onCommentAdded(task!.id, c);
      setText('');
    }
    setSending(false);
  }

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
        ) : comments.length === 0 ? (
          <Typography variant="body2" color="text.secondary" textAlign="center" mt={4}>
            No comments yet. Be the first!
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {comments.map((c) => {
              const isMe = c.user_id === currentUser.id;
              return (
                <Stack key={c.id} direction="row" justifyContent={isMe ? 'flex-end' : 'flex-start'}>
                  <Box sx={{
                    maxWidth: '75%',
                    bgcolor: isMe ? '#1565c0' : 'white',
                    color: isMe ? 'white' : 'text.primary',
                    border: isMe ? 'none' : '1px solid',
                    borderColor: 'divider',
                    borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                    px: 1.5, py: 1,
                  }}>
                    {!isMe && (
                      <Typography variant="caption" fontWeight={700}
                        sx={{ display: 'block', mb: 0.25, opacity: 0.7 }}>
                        {c.author_name}
                      </Typography>
                    )}
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                      {c.content}
                    </Typography>
                    <Typography variant="caption"
                      sx={{ display: 'block', mt: 0.5, opacity: 0.6, fontSize: 10 }}>
                      {new Date(c.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </Typography>
                  </Box>
                </Stack>
              );
            })}
            <div ref={chatEndRef} />
          </Stack>
        )}
      </Box>

      <Box sx={{ px: 2, py: 1.5, borderTop: 1, borderColor: 'divider' }}>
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

// ── Main component ───────────────────────────────────────────────────────────

type Props = {
  initialTasks: Task[];
  folderId: string;
  projectStartAt?: string | null;
  isAdmin: boolean;
  currentUser: CurrentUser;
};

export function TasksView({ initialTasks, folderId, projectStartAt, isAdmin, currentUser }: Props) {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  useEffect(() => { setTasks(initialTasks); }, [initialTasks]);

  const [view, setView] = useState<'table' | 'timeline'>('table');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [commentCounts, setCommentCounts] = useState<Map<string, number>>(new Map());
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Task | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [importError, setImportError] = useState('');

  useEffect(() => {
    fetch(`/api/task-comments?folderId=${folderId}`)
      .then((r) => r.json())
      .then((all) => {
        if (!Array.isArray(all)) return;
        const map = new Map<string, number>();
        all.forEach((c: TaskComment) => { map.set(c.task_id, (map.get(c.task_id) ?? 0) + 1); });
        setCommentCounts(map);
      })
      .catch(() => {});
  }, [folderId]);

  function handleCommentAdded(taskId: string, _comment: TaskComment) {
    setCommentCounts((prev) => new Map(prev).set(taskId, (prev.get(taskId) ?? 0) + 1));
  }

  function openCreate() {
    setEditTarget(null);
    setTaskDialogOpen(true);
  }

  function openEdit(task: Task) {
    setEditTarget(task);
    setTaskDialogOpen(true);
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    if (res.ok || res.status === 204) {
      setTasks((prev) => prev.filter((t) => t.id !== id));
    }
  }

  function handleTaskSaved(task: Task) {
    setTasks((prev) => {
      const idx = prev.findIndex((t) => t.id === task.id);
      return idx >= 0
        ? prev.map((t) => (t.id === task.id ? task : t))
        : [...prev, task];
    });
    setTaskDialogOpen(false);
  }

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
            <Button size="small" variant="contained" startIcon={<AddIcon />}
              onClick={openCreate}>
              New task
            </Button>
          )}
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
                        hasComments={(commentCounts.get(t.id) ?? 0) > 0}
                        onStatusChange={handleStatusChange} onOpenComments={setActiveTask}
                        onEdit={openEdit} onDelete={handleDelete} />
                    )) : []),
                  ];
                })}
                {ungrouped.map((t) => (
                  <TaskRow key={t.id} task={t} isAdmin={isAdmin}
                    hasComments={(commentCounts.get(t.id) ?? 0) > 0}
                    onStatusChange={handleStatusChange} onOpenComments={setActiveTask}
                    onEdit={openEdit} onDelete={handleDelete} />
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

      <CommentsDrawer task={activeTask} currentUser={currentUser} onClose={() => setActiveTask(null)} onCommentAdded={handleCommentAdded} />

      <TaskFormDialog
        open={taskDialogOpen}
        editTarget={editTarget}
        folderId={folderId}
        taskCount={tasks.length}
        onClose={() => setTaskDialogOpen(false)}
        onSaved={handleTaskSaved}
      />

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

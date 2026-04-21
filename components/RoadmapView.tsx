'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import DeleteIcon from '@mui/icons-material/Delete';

export type RoadmapItem = {
  id: string;
  folder_id: string;
  title: string;
  description: string | null;
  status: string;
  position: number;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
};

const statusIcon: Record<string, React.ReactNode> = {
  completed: <CheckCircleIcon sx={{ color: 'success.main', fontSize: 22 }} />,
  in_progress: <PlayCircleOutlineIcon sx={{ color: 'info.main', fontSize: 22 }} />,
  pending: <RadioButtonUncheckedIcon sx={{ color: 'text.disabled', fontSize: 22 }} />,
};

const statusLabel: Record<string, string> = {
  completed: 'Completed',
  in_progress: 'In progress',
  pending: 'Pending',
};

const statusColor: Record<string, 'success' | 'info' | 'default'> = {
  completed: 'success',
  in_progress: 'info',
  pending: 'default',
};

export function RoadmapView({
  items: initialItems,
  folderId,
  isAdmin,
}: {
  items: RoadmapItem[];
  folderId: string;
  isAdmin: boolean;
}) {
  const [items, setItems] = useState(initialItems);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [loading, setLoading] = useState(false);

  const completed = items.filter((i) => i.status === 'completed').length;
  const total = items.length;
  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;

  async function addItem() {
    if (!newTitle.trim()) return;
    setLoading(true);
    const res = await fetch('/api/roadmap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        folderId,
        title: newTitle.trim(),
        position: items.length,
        due_date: newDueDate || null,
      }),
    });
    if (res.ok) {
      const item = await res.json();
      setItems((prev) => [...prev, item]);
      setNewTitle('');
      setNewDueDate('');
      setAdding(false);
    }
    setLoading(false);
  }

  async function cycleStatus(item: RoadmapItem) {
    if (!isAdmin) return;
    const next: Record<string, string> = {
      pending: 'in_progress',
      in_progress: 'completed',
      completed: 'pending',
    };
    const newStatus = next[item.status] ?? 'pending';
    const res = await fetch(`/api/roadmap/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      const updated = await res.json();
      setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
    }
  }

  async function deleteItem(id: string) {
    const res = await fetch(`/api/roadmap/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setItems((prev) => prev.filter((i) => i.id !== id));
    }
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" fontWeight={700}>
          Roadmap
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {completed}/{total} completed
        </Typography>
      </Stack>

      <LinearProgress
        variant="determinate"
        value={progressPct}
        sx={{ borderRadius: 2, height: 8, mb: 3 }}
      />

      <Stack spacing={1.5}>
        {items.map((item) => (
          <Paper
            key={item.id}
            variant="outlined"
            sx={[
              {
                p: 2,
                borderRadius: 3,
                borderColor: item.status === 'completed' ? 'success.light' : 'divider',
                opacity: item.status === 'completed' ? 0.75 : 1,
              },
              (theme) =>
                theme.applyStyles('dark', {
                  borderColor: item.status === 'completed' ? 'success.dark' : 'divider',
                }),
            ]}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box
                onClick={() => cycleStatus(item)}
                sx={{ cursor: isAdmin ? 'pointer' : 'default', display: 'flex' }}
              >
                {statusIcon[item.status] ?? statusIcon.pending}
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="body1"
                  fontWeight={600}
                  sx={{
                    textDecoration: item.status === 'completed' ? 'line-through' : 'none',
                  }}
                >
                  {item.title}
                </Typography>
                {item.description && (
                  <Typography variant="body2" color="text.secondary">
                    {item.description}
                  </Typography>
                )}
              </Box>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Chip
                  label={statusLabel[item.status] ?? item.status}
                  size="small"
                  color={statusColor[item.status] ?? 'default'}
                  variant="outlined"
                />
                {item.due_date && (
                  <Chip
                    label={new Date(item.due_date).toLocaleDateString('en-US')}
                    size="small"
                    variant="outlined"
                  />
                )}
                {isAdmin && (
                  <IconButton size="small" color="error" onClick={() => deleteItem(item.id)}>
                    <DeleteIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                )}
              </Stack>
            </Stack>
          </Paper>
        ))}
      </Stack>

      {isAdmin && !adding && (
        <Button
          startIcon={<AddIcon />}
          onClick={() => setAdding(true)}
          sx={{ mt: 2 }}
          size="small"
        >
          Add item
        </Button>
      )}

      {isAdmin && adding && (
        <Paper variant="outlined" sx={{ p: 2, mt: 2, borderRadius: 3 }}>
          <Stack spacing={1.5}>
            <TextField
              size="small"
              label="Title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              fullWidth
              autoFocus
            />
            <TextField
              size="small"
              label="Due date"
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button
                size="small"
                onClick={() => {
                  setAdding(false);
                  setNewTitle('');
                  setNewDueDate('');
                }}
              >
                Cancel
              </Button>
              <Button
                size="small"
                variant="contained"
                disabled={loading || !newTitle.trim()}
                onClick={addItem}
              >
                Add
              </Button>
            </Stack>
          </Stack>
        </Paper>
      )}
    </Box>
  );
}

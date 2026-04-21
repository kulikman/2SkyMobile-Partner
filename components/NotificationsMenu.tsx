'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import NotificationsIcon from '@mui/icons-material/Notifications';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import { useRouter } from 'next/navigation';

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
};

const TYPE_COLORS: Record<string, 'default' | 'primary' | 'warning' | 'success' | 'error'> = {
  new_comment: 'primary',
  new_reply: 'primary',
  task_status_changed: 'warning',
  new_report: 'success',
  new_meeting: 'default',
  new_task: 'default',
};

export function NotificationsMenu({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const anchorRef = useRef<HTMLButtonElement>(null);

  const unread = items.filter((n) => !n.read).length;

  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/notifications?limit=30', { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setItems(data); })
      .catch(() => {});

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => setItems((prev) => [payload.new as Notification, ...prev]),
      )
      .subscribe();

    return () => {
      controller.abort();
      supabase.removeChannel(channel);
    };
  }, [userId, supabase]);

  async function markRead(ids: string[]) {
    setItems((prev) => prev.map((n) => ids.includes(n.id) ? { ...n, read: true } : n));
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
  }

  async function markAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    });
  }

  function handleClick(n: Notification) {
    if (!n.read) markRead([n.id]);
    setOpen(false);
    if (n.link) router.push(n.link);
  }

  return (
    <ClickAwayListener onClickAway={() => setOpen(false)}>
      <Box sx={{ position: 'relative' }}>
        <IconButton
          ref={anchorRef}
          size="small"
          onClick={() => setOpen((v) => !v)}
          aria-label="Notifications"
        >
          <Badge badgeContent={unread} color="error" max={99}>
            {unread > 0 ? <NotificationsIcon fontSize="small" /> : <NotificationsNoneIcon fontSize="small" />}
          </Badge>
        </IconButton>

        {open && (
          <Paper
            elevation={8}
            sx={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              width: { xs: '92vw', sm: 380 },
              maxHeight: 480,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 3,
              zIndex: 1400,
            }}
          >
            {/* Header */}
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}
            >
              <Typography variant="subtitle2" fontWeight={700}>
                Notifications {unread > 0 && `(${unread})`}
              </Typography>
              {unread > 0 && (
                <Button size="small" onClick={markAllRead} sx={{ fontSize: 12 }}>
                  Mark all read
                </Button>
              )}
            </Stack>

            {/* List */}
            <Box sx={{ overflowY: 'auto', flex: 1 }}>
              {items.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>
                  No notifications
                </Typography>
              ) : (
                items.map((n, i) => (
                  <Box key={n.id}>
                    <Box
                      onClick={() => handleClick(n)}
                      sx={{
                        px: 2,
                        py: 1.5,
                        cursor: 'pointer',
                        bgcolor: n.read ? 'transparent' : 'action.hover',
                        '&:hover': { bgcolor: 'action.selected' },
                      }}
                    >
                      <Stack direction="row" spacing={1} alignItems="flex-start">
                        {!n.read && (
                          <Box sx={{ mt: 0.75, width: 7, height: 7, borderRadius: '50%', bgcolor: 'primary.main', flexShrink: 0 }} />
                        )}
                        <Box sx={{ flex: 1, ml: n.read ? '15px !important' : undefined }}>
                          <Stack direction="row" spacing={1} alignItems="center" mb={0.25}>
                            <Typography variant="body2" fontWeight={n.read ? 400 : 600} sx={{ flex: 1 }}>
                              {n.title}
                            </Typography>
                            <Chip
                              label={n.type.replace(/_/g, ' ')}
                              size="small"
                              color={TYPE_COLORS[n.type] ?? 'default'}
                              sx={{ fontSize: 10, height: 18 }}
                            />
                          </Stack>
                          {n.body && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              {n.body}
                            </Typography>
                          )}
                          <Typography variant="caption" color="text.disabled">
                            {new Date(n.created_at).toLocaleString()}
                          </Typography>
                        </Box>
                      </Stack>
                    </Box>
                    {i < items.length - 1 && <Divider />}
                  </Box>
                ))
              )}
            </Box>
          </Paper>
        )}
      </Box>
    </ClickAwayListener>
  );
}

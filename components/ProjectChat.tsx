'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import Fab from '@mui/material/Fab';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import ChatIcon from '@mui/icons-material/Chat';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import { getInitials } from '@/lib/user-display';

type ChatMessage = {
  id: string;
  folder_id: string;
  user_id: string | null;
  content: string;
  author_name: string;
  created_at: string;
};

type CurrentUser = {
  id: string;
  email: string;
  name: string;
};

export function ProjectChat({
  folderId,
  currentUser,
}: {
  folderId: string;
  currentUser: CurrentUser;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!open) return;

    // Load existing messages
    fetch(`/api/chat?folderId=${folderId}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setMessages(data);
        setInitialLoaded(true);
      });

    // Realtime subscription
    const channel = supabase
      .channel(`chat:${folderId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `folder_id=eq.${folderId}`,
        },
        (payload) => {
          setMessages((prev) => {
            // Avoid duplicates from optimistic insert
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new as ChatMessage];
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, folderId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send() {
    if (!text.trim()) return;
    setLoading(true);

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderId, content: text.trim() }),
    });

    if (res.ok) {
      const msg = await res.json();
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      setText('');
    }
    setLoading(false);
  }

  return (
    <>
      <Fab
        color="primary"
        onClick={() => setOpen(true)}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 1200,
        }}
      >
        <ChatIcon />
      </Fab>

      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: '100vw', sm: 400 },
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        {/* Header */}
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}
        >
          <Typography variant="h6" fontWeight={700}>
            Project chat
          </Typography>
          <IconButton onClick={() => setOpen(false)}>
            <CloseIcon />
          </IconButton>
        </Stack>

        {/* Messages */}
        <Box sx={{ flex: 1, overflow: 'auto', px: 2, py: 1.5 }}>
          {!initialLoaded ? (
            <Typography variant="body2" color="text.secondary" textAlign="center" mt={4}>
              Loading...
            </Typography>
          ) : messages.length === 0 ? (
            <Typography variant="body2" color="text.secondary" textAlign="center" mt={4}>
              No messages yet. Start the conversation!
            </Typography>
          ) : (
            <Stack spacing={1.5}>
              {messages.map((msg) => {
                const isOwn = msg.user_id === currentUser.id;
                return (
                  <Stack
                    key={msg.id}
                    direction="row"
                    spacing={1}
                    alignItems="flex-start"
                    justifyContent={isOwn ? 'flex-end' : 'flex-start'}
                  >
                    {!isOwn && (
                      <Avatar sx={{ width: 32, height: 32, fontSize: 13, bgcolor: 'primary.main' }}>
                        {getInitials(msg.author_name)}
                      </Avatar>
                    )}
                    <Box
                      sx={[
                        {
                          maxWidth: '75%',
                          px: 1.5,
                          py: 1,
                          borderRadius: 2.5,
                          bgcolor: isOwn ? 'primary.main' : 'grey.100',
                          color: isOwn ? 'white' : 'text.primary',
                        },
                        (theme) =>
                          theme.applyStyles('dark', {
                            bgcolor: isOwn ? 'primary.dark' : 'grey.800',
                            color: isOwn ? 'white' : 'text.primary',
                          }),
                      ]}
                    >
                      {!isOwn && (
                        <Typography variant="caption" fontWeight={700} sx={{ display: 'block', mb: 0.25 }}>
                          {msg.author_name}
                        </Typography>
                      )}
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {msg.content}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          display: 'block',
                          textAlign: 'right',
                          mt: 0.25,
                          opacity: 0.7,
                        }}
                      >
                        {new Date(msg.created_at).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Typography>
                    </Box>
                  </Stack>
                );
              })}
              <div ref={bottomRef} />
            </Stack>
          )}
        </Box>

        {/* Input */}
        <Stack
          direction="row"
          spacing={1}
          sx={{ px: 2, py: 1.5, borderTop: 1, borderColor: 'divider' }}
        >
          <TextField
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message..."
            size="small"
            fullWidth
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          <IconButton
            color="primary"
            disabled={loading || !text.trim()}
            onClick={send}
          >
            <SendIcon />
          </IconButton>
        </Stack>
      </Drawer>
    </>
  );
}

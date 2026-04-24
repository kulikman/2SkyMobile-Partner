'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import MuiButton from '@mui/material/Button';
import Stack from '@mui/material/Stack';

type Comment = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles?: { email: string };
};

export function CommentSection({ documentId, userId }: { documentId: string; userId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    // Initial load
    supabase
      .from('comments')
      .select('*, profiles:user_id(email)')
      .eq('document_id', documentId)
      .order('created_at', { ascending: true })
      .then(({ data }) => setComments(data ?? []));

    // Realtime subscription
    const channel = supabase
      .channel(`comments:${documentId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comments', filter: `document_id=eq.${documentId}` },
        (payload) => setComments((prev) => [...prev, payload.new as Comment])
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'comments', filter: `document_id=eq.${documentId}` },
        (payload) => setComments((prev) => prev.filter((c) => c.id !== payload.old.id))
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [documentId, supabase]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('comments')
        .insert({ document_id: documentId, user_id: userId, content: text.trim() });
      if (!error) setText('');
    } finally {
      setLoading(false);
    }
  }

  async function deleteComment(id: string) {
    if (!window.confirm('Delete this comment?')) return;
    await supabase.from('comments').delete().eq('id', id);
  }

  return (
    <Box mt={6}>
      <Typography variant="h6" fontWeight={600} mb={2}>Comments</Typography>

      <Stack spacing={1.5} mb={3}>
        {comments.map((c) => (
          <Paper key={c.id} variant="outlined" sx={{ p: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
              <Typography variant="subtitle2" fontWeight={600}>{c.profiles?.email ?? 'Unknown'}</Typography>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="caption" color="text.secondary">{new Date(c.created_at).toLocaleString()}</Typography>
                {c.user_id === userId && (
                  <MuiButton size="small" color="error" onClick={() => deleteComment(c.id)}>Delete</MuiButton>
                )}
              </Stack>
            </Stack>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{c.content}</Typography>
          </Paper>
        ))}
        {comments.length === 0 && (
          <Typography variant="body2" color="text.secondary">No comments yet.</Typography>
        )}
      </Stack>

      <form onSubmit={submit}>
        <Stack direction="row" spacing={1}>
          <TextField
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write a comment…"
            size="small"
            fullWidth
          />
          <MuiButton type="submit" variant="contained" disabled={loading || !text.trim()}>
            Send
          </MuiButton>
        </Stack>
      </form>
    </Box>
  );
}

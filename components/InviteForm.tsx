'use client';

import { useState } from 'react';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';

export function InviteForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');

    const res = await fetch('/api/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();
    if (res.ok) {
      setStatus('success');
      setMessage(`Invite sent to ${email}`);
      setEmail('');
    } else {
      setStatus('error');
      setMessage(data.error ?? 'Failed to send invite');
    }
  }

  return (
    <Stack spacing={1}>
      <form onSubmit={handleSubmit}>
        <Stack direction="row" spacing={1}>
          <TextField
            type="email"
            required
            size="small"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            sx={{ flexGrow: 1 }}
          />
          <Button type="submit" variant="contained" disabled={status === 'loading'}>
            {status === 'loading' ? 'Sending…' : 'Send Invite'}
          </Button>
        </Stack>
      </form>
      {message && <Alert severity={status === 'success' ? 'success' : 'error'}>{message}</Alert>}
    </Stack>
  );
}

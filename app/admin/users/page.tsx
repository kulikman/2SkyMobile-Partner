import { redirect } from 'next/navigation';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { InviteForm } from '@/components/InviteForm';
import { Navbar } from '@/components/Navbar';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.user_metadata?.role !== 'admin') redirect('/');

  const adminClient = await createAdminClient();
  const { data: { users } } = await adminClient.auth.admin.listUsers();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Navbar isAdmin userId={user.id} />
      <Container maxWidth="md" sx={{ py: 5 }}>
        <Stack spacing={4}>
          <div>
            <Typography variant="h5" fontWeight={700}>Users</Typography>
            <Typography variant="body2" color="text.secondary">{users.length} total</Typography>
          </div>

          <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="subtitle1" fontWeight={600} mb={2}>Invite user</Typography>
            <InviteForm />
          </Paper>

          <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ px: 3, py: 2 }}>All users</Typography>
            <Divider />
            {users.map((u, i) => (
              <Box key={u.id}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 3, py: 2 }}>
                  <div>
                    <Typography variant="body2" fontWeight={600}>{u.email}</Typography>
                    <Stack direction="row" spacing={1} mt={0.5} alignItems="center">
                      <Chip
                        label={u.user_metadata?.role ?? 'viewer'}
                        size="small"
                        color={u.user_metadata?.role === 'admin' ? 'primary' : 'default'}
                      />
                      <Typography variant="caption" color="text.secondary">
                        Joined {new Date(u.created_at).toLocaleDateString()}
                      </Typography>
                    </Stack>
                  </div>
                  <UserActions userId={u.id} currentRole={u.user_metadata?.role ?? 'viewer'} />
                </Stack>
                {i < users.length - 1 && <Divider />}
              </Box>
            ))}
          </Paper>
        </Stack>
      </Container>
    </Box>
  );
}

function UserActions({ userId, currentRole }: { userId: string; currentRole: string }) {
  return (
    <Stack direction="row" spacing={1}>
      <form action={`/api/admin/users/${userId}/role`} method="POST">
        <input type="hidden" name="role" value={currentRole === 'admin' ? 'viewer' : 'admin'} />
        <button type="submit" style={{ cursor: 'pointer', padding: '4px 10px', borderRadius: 6, border: '1px solid #ccc', background: '#f5f5f5', fontSize: 12 }}>
          Make {currentRole === 'admin' ? 'viewer' : 'admin'}
        </button>
      </form>
      <form action={`/api/admin/users/${userId}/delete`} method="POST">
        <button type="submit" style={{ cursor: 'pointer', padding: '4px 10px', borderRadius: 6, border: '1px solid #ffcdd2', background: '#ffebee', color: '#c62828', fontSize: 12 }}>
          Remove
        </button>
      </form>
    </Stack>
  );
}

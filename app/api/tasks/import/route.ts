import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { parseDecompositionCsv, scheduleTask } from '@/lib/tasks-schedule';

function toExportUrl(sheetUrl: string): string | null {
  // https://docs.google.com/spreadsheets/d/{ID}/edit#gid={GID}
  const match = sheetUrl.match(/\/spreadsheets\/d\/([^/]+)/);
  if (!match) return null;
  const id = match[1];
  const gidMatch = sheetUrl.match(/[#&?]gid=(\d+)/);
  const gid = gidMatch ? gidMatch[1] : '0';
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { folder_id, sheet_url, project_start } = body;
  if (!folder_id) return NextResponse.json({ error: 'folder_id is required' }, { status: 400 });
  if (!sheet_url) return NextResponse.json({ error: 'sheet_url is required' }, { status: 400 });
  if (!project_start) return NextResponse.json({ error: 'project_start is required' }, { status: 400 });

  const csvUrl = toExportUrl(sheet_url);
  if (!csvUrl) return NextResponse.json({ error: 'Invalid Google Sheets URL' }, { status: 400 });

  let csv: string;
  try {
    const res = await fetch(csvUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    csv = await res.text();
  } catch (e) {
    return NextResponse.json(
      { error: `Failed to fetch sheet: ${e instanceof Error ? e.message : 'unknown error'}` },
      { status: 502 }
    );
  }

  const rows = parseDecompositionCsv(csv);
  if (rows.length === 0) {
    return NextResponse.json({ error: 'No tasks found in sheet. Check that the sheet is public and matches the expected column format.' }, { status: 400 });
  }

  const startDate = new Date(project_start);
  if (isNaN(startDate.getTime())) {
    return NextResponse.json({ error: 'Invalid project_start date' }, { status: 400 });
  }

  const scheduled = scheduleTask(rows, startDate);

  // Use admin client to bypass RLS for write operations
  const adminClient = await createAdminClient();

  await adminClient.from('tasks').delete().eq('folder_id', folder_id);

  const inserts = scheduled.map((t) => ({
    folder_id,
    group_label: t.group_label || null,
    title: t.title,
    type: t.type || null,
    role: t.role || null,
    estimated_hours: t.estimated_hours,
    position: t.position,
    start_date: t.start_date,
    due_date: t.due_date,
    status: 'backlog',
    depends_on: [],
  }));

  const { data: inserted, error } = await adminClient
    .from('tasks')
    .insert(inserts)
    .select('id, position');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Back-fill depends_on UUIDs
  const posToId = new Map((inserted ?? []).map((r) => [r.position, r.id]));
  const updates = scheduled
    .filter((t) => t.depends_on_rows.length > 0)
    .map((t) => ({
      id: posToId.get(t.position)!,
      depends_on: t.depends_on_rows.map((r) => posToId.get(r - 1)).filter(Boolean),
    }));

  await Promise.all(
    updates.map(({ id, depends_on }) =>
      adminClient.from('tasks').update({ depends_on }).eq('id', id)
    )
  );

  return NextResponse.json({ imported: scheduled.length }, { status: 201 });
}

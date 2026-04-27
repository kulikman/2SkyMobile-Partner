import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { sendTelegramMessage, buildStatusChangedMessage } from '@/lib/telegram';

const VALID_STATUSES = ['new', 'in_progress', 'on_hold', 'ready_for_testing', 'approved', 'closed'];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const isAdmin = user.user_metadata?.role === 'admin';
  const { status, title, description, url, screenshot_path,
    module, type, priority, severity, comments, assigned_to } = body;

  if (status && !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const adminClient = await createAdminClient();

  // Partners can only approve their own ready_for_testing tickets
  if (!isAdmin) {
    if (status && status !== 'approved') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (status === 'approved') {
      const { data: doc } = await adminClient
        .from('documents')
        .select('metadata')
        .eq('id', id)
        .eq('doc_type', 'ticket')
        .single();
      const m = (doc?.metadata as Record<string, unknown>) ?? {};
      if (m.created_by !== user.id || m.status !== 'ready_for_testing') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
  }

  const { data: current, error: fetchError } = await adminClient
    .from('documents')
    .select('id, folder_id, title, description, metadata')
    .eq('id', id)
    .eq('doc_type', 'ticket')
    .single();

  if (fetchError || !current) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const docUpdates: Record<string, unknown> = {};
  if (isAdmin && title !== undefined) {
    docUpdates.title = title?.trim() ?? null;
    docUpdates.content = title?.trim() ?? '';
  }
  if (isAdmin && description !== undefined) {
    docUpdates.description = description?.trim() ?? null;
  }

  const meta = { ...(current.metadata as Record<string, unknown>) };
  meta.updated_at = new Date().toISOString();
  if (status !== undefined) meta.status = status;
  if (isAdmin) {
    if (url !== undefined)             meta.url = url?.trim() ?? null;
    if (screenshot_path !== undefined) meta.screenshot_path = screenshot_path;
    if (module !== undefined)          meta.module = module?.trim() ?? null;
    if (type !== undefined)            meta.type = type?.trim() ?? null;
    if (priority !== undefined)        meta.priority = priority;
    if (severity !== undefined)        meta.severity = severity;
    if (comments !== undefined)        meta.comments = comments?.trim() ?? null;
    if (body.parent_id !== undefined)   meta.parent_id = body.parent_id;
    if (assigned_to !== undefined)      meta.assigned_to = assigned_to ?? null;
  }
  docUpdates.metadata = meta;

  const { data, error } = await adminClient
    .from('documents')
    .update(docUpdates)
    .eq('id', id)
    .eq('doc_type', 'ticket')
    .select('id, folder_id, title, description, created_at, metadata')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify ticket creator on status change (best-effort)
  const oldStatus = (current.metadata as Record<string, unknown>)?.status as string | undefined;
  if (status && status !== oldStatus) {
    try {
      const creatorId = (current.metadata as Record<string, unknown>)?.created_by as string | undefined;
      if (creatorId) {
        // Build link to the issue
        const { data: folder } = await adminClient
          .from('folders').select('slug, company_id').eq('id', current.folder_id).single();
        let link = `/?issue=${id}`;
        if (folder?.slug && folder.company_id) {
          const { data: company } = await adminClient
            .from('companies').select('slug').eq('id', folder.company_id).single();
          if (company?.slug) {
            link = `/${company.slug}/${folder.slug}?tab=issues&issue=${id}`;
          }
        }

        // In-app notification text per status
        const STATUS_NOTIF: Record<string, { title: string; body: string }> = {
          in_progress: {
            title: `Your issue "${current.title}" is being worked on 🔧`,
            body: 'Our team has picked up your issue and started working on it.',
          },
          on_hold: {
            title: `Your issue "${current.title}" is on hold ⏸`,
            body: 'Your issue has been placed on hold temporarily.',
          },
          ready_for_testing: {
            title: `Your issue "${current.title}" is ready for testing 🧪`,
            body: 'Please test and confirm, then set status to Approved.',
          },
          approved: {
            title: `Your issue "${current.title}" has been approved ✅`,
            body: 'Your issue has been reviewed and approved.',
          },
          closed: {
            title: `Your issue "${current.title}" has been resolved ✅`,
            body: 'Your issue has been marked as resolved. Thank you for your report!',
          },
        };

        const notif = STATUS_NOTIF[status];
        if (notif) {
          await adminClient.from('notifications').insert({
            user_id: creatorId,
            type: 'ticket_status_changed',
            title: notif.title,
            body: notif.body,
            link,
          });

          // Send Telegram message if it's a terminal/major state
          if (['in_progress', 'closed', 'approved'].includes(status)) {
            await sendTelegramMessage(buildStatusChangedMessage({
              title: current.title,
              newStatus: status,
              link,
            }));
          }
        }
      }
    } catch { /* best-effort */ }
  }

  const m = (data.metadata as Record<string, unknown>) ?? {};
  return NextResponse.json({
    id: data.id, folder_id: data.folder_id, title: data.title,
    description: data.description, created_at: data.created_at,
    status: m.status ?? 'new', type: m.type ?? null,
    priority: m.priority ?? 'medium', severity: m.severity ?? 'moderate',
    module: m.module ?? null, url: m.url ?? null,
    screenshot_path: m.screenshot_path ?? null, created_by: m.created_by ?? null,
    comments: m.comments ?? null, updated_at: m.updated_at,
    parent_id: m.parent_id ?? null,
  });
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const adminClient = await createAdminClient();
  const { data: doc } = await adminClient
    .from('documents')
    .select('metadata')
    .eq('id', id)
    .eq('doc_type', 'ticket')
    .single();

  const screenshotPath = (doc?.metadata as Record<string, unknown>)?.screenshot_path as string | undefined;
  if (screenshotPath) {
    await adminClient.storage.from('ticket-screenshots').remove([screenshotPath]);
  }

  const { error } = await adminClient.from('documents').delete().eq('id', id).eq('doc_type', 'ticket');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}

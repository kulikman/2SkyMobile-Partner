/**
 * Telegram Bot notifications helper.
 * Silently no-ops when TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID are not set.
 */

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export async function sendTelegramMessage(text: string): Promise<void> {
  const token  = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: false },
      }),
    });
    if (!res.ok) {
      console.error('[Telegram]', res.status, await res.text());
    }
  } catch (err) {
    console.error('[Telegram] fetch error:', err);
  }
}

// ── Message builders ────────────────────────────────────────────────────────

const PRIORITY_EMOJI: Record<string, string> = {
  high: '🔴',
  medium: '🟡',
  low: '🟢',
};

const STATUS_LABELS: Record<string, string> = {
  in_progress:        '🔧 In progress',
  on_hold:            '⏸ On hold',
  ready_for_testing:  '🧪 Ready for testing',
  approved:           '✅ Approved',
  closed:             '✅ Resolved',
};

interface NewTicketParams {
  title: string;
  description?: string | null;
  priority?: string | null;
  module?: string | null;
  type?: string | null;
  fromEmail?: string | null;
  link: string;
}

/** Message sent to admins when a partner creates a new issue. */
export function buildNewTicketMessage(p: NewTicketParams): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://partnerdev.2skymobile.com';
  const priorityEmoji = PRIORITY_EMOJI[p.priority ?? 'medium'] ?? '🟡';

  let text = `🆕 <b>New issue</b> ${priorityEmoji}\n`;
  text += `<b>${escapeHtml(p.title)}</b>\n`;

  if (p.description?.trim()) {
    text += `\n${escapeHtml(p.description.trim().slice(0, 300))}\n`;
  }
  if (p.module)    text += `\n📦 <b>Module:</b> ${escapeHtml(p.module)}`;
  if (p.type)      text += `\n🏷 <b>Type:</b> ${escapeHtml(p.type)}`;
  if (p.fromEmail) text += `\n👤 <b>From:</b> ${escapeHtml(p.fromEmail)}`;

  text += `\n\n🔗 <a href="${siteUrl}${p.link}">Open in Partner Portal →</a>`;
  return text;
}

interface StatusChangedParams {
  title: string;
  newStatus: string;
  link: string;
}

/** Message sent to the partner when an admin changes the ticket status. */
export function buildStatusChangedMessage(p: StatusChangedParams): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://partnerdev.2skymobile.com';
  const label = STATUS_LABELS[p.newStatus] ?? p.newStatus;

  let text = `📬 <b>Issue status updated</b>\n`;
  text += `"${escapeHtml(p.title)}"\n`;
  text += `\nNew status: <b>${label}</b>`;
  text += `\n\n🔗 <a href="${siteUrl}${p.link}">View issue →</a>`;
  return text;
}

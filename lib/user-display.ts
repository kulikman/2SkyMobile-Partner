export function getDisplayName(input: {
  email?: string | null;
  authorName?: string | null;
  isAnonymous?: boolean | null;
  metadata?: Record<string, unknown> | null;
}) {
  if (input.isAnonymous) return input.authorName?.trim() || 'Anonymous';
  if (input.authorName?.trim()) return input.authorName.trim();

  const metadataName =
    getString(input.metadata?.full_name) ||
    getString(input.metadata?.name) ||
    getString(input.metadata?.display_name);

  if (metadataName) return metadataName;
  if (input.email) return input.email.split('@')[0];
  return 'Guest';
}

export function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function getString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

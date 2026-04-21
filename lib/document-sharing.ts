type BaseDocument = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  image?: string | null;
  content: string;
  public_share_token?: string | null;
  created_at?: string;
};

type SharingSettings = {
  public_access_enabled: boolean;
  public_comments_visible: boolean;
  anonymous_comments_enabled: boolean;
};

export function withDefaultSharing<T extends BaseDocument | { id: string }>(
  document: T,
  sharing?: Partial<SharingSettings & { description: string | null; image: string | null; public_share_token: string | null }> | null
) {
  return {
    ...document,
    description: 'description' in document ? (sharing?.description ?? document.description ?? null) : sharing?.description ?? null,
    image: 'image' in document ? (sharing?.image ?? document.image ?? null) : sharing?.image ?? null,
    public_share_token:
      'public_share_token' in document
        ? (sharing?.public_share_token ?? document.public_share_token ?? null)
        : sharing?.public_share_token ?? null,
    public_access_enabled: Boolean(sharing?.public_access_enabled),
    public_comments_visible: Boolean(sharing?.public_comments_visible),
    anonymous_comments_enabled: Boolean(sharing?.anonymous_comments_enabled),
  };
}

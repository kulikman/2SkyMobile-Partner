import { getDisplayName } from './user-display';

type RawComment = {
  id: string;
  content: string;
  anchor_text: string | null;
  anchor_start: number | null;
  anchor_end: number | null;
  created_at: string;
  user_id: string | null;
  author_name?: string | null;
  is_anonymous?: boolean | null;
};

type AdminUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

type CommentProfile = {
  email: string;
  name: string;
};

export type CommentViewModel = RawComment & {
  author_name: string;
  is_anonymous: boolean;
  profiles: CommentProfile;
};

export function buildInitialComments(
  comments: RawComment[],
  users: AdminUser[]
): CommentViewModel[] {
  const userMap = new Map(users.map((user) => [user.id, user]));

  return comments.map((comment) => {
    const user = comment.user_id ? userMap.get(comment.user_id) : undefined;
    const name = getDisplayName({
      email: user?.email,
      authorName: comment.author_name,
      isAnonymous: comment.is_anonymous ?? false,
      metadata: user?.user_metadata ?? null,
    });

    return {
      ...comment,
      author_name: name,
      is_anonymous: Boolean(comment.is_anonymous),
      profiles: {
        email: user?.email ?? '',
        name,
      },
    };
  });
}

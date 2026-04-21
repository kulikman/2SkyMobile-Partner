'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DeleteIcon from '@mui/icons-material/Delete';
import PublicIcon from '@mui/icons-material/Public';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import type { CommentViewModel } from '@/lib/comment-view-models';
import { MarkdownRenderer } from './MarkdownRenderer';
import { getInitials } from '@/lib/user-display';

type Viewer = {
  id: string;
  email: string;
  name: string;
};

type Comment = CommentViewModel;

type FloatingForm = {
  anchor: string;
  start: number;
  end: number;
  x: number;
  y: number;
};

type Line = { x1: number; y1: number; x2: number; y2: number };

const CARD_WIDTH = 320;
const FORM_WIDTH = 300;
const MOBILE_FORM_GUTTER = 16;

export function DocumentWithComments({
  documentId,
  content,
  currentUser,
  initialComments,
  allowCommenting = true,
  allowAnonymous = false,
  publicView = false,
}: {
  documentId: string;
  content: string;
  currentUser: Viewer | null;
  initialComments: Comment[];
  allowCommenting?: boolean;
  allowAnonymous?: boolean;
  publicView?: boolean;
}) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'), { noSsr: true });
  const contentRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [cardTops, setCardTops] = useState<Record<string, number>>({});
  const [form, setForm] = useState<FloatingForm | null>(null);
  const [commentText, setCommentText] = useState('');
  const [guestName, setGuestName] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [line, setLine] = useState<Line | null>(null);
  const [loading, setLoading] = useState(false);

  const canCreateComment = allowCommenting && (Boolean(currentUser) || allowAnonymous);
  const mounted = typeof document !== 'undefined';

  useLayoutEffect(() => {
    const contentEl = contentRef.current;
    const sidebarEl = sidebarRef.current;
    if (!contentEl) return;

    const selection = window.getSelection();
    let savedRange: Range | null = null;
    if (selection && !selection.isCollapsed && selection.rangeCount > 0) {
      savedRange = selection.getRangeAt(0).cloneRange();
    }

    unwrapMarks(contentEl);
    contentEl.normalize();

    const sortedComments = [...comments].sort((left, right) => {
      const leftStart = left.anchor_start ?? Number.MAX_SAFE_INTEGER;
      const rightStart = right.anchor_start ?? Number.MAX_SAFE_INTEGER;
      return rightStart - leftStart;
    });

    for (const comment of sortedComments) {
      highlightComment(contentEl, comment, comment.id === activeId, setActiveId);
    }

    if (savedRange && selection) {
      try {
        selection.removeAllRanges();
        selection.addRange(savedRange);
      } catch {
        // Ignore selection restore failures after DOM remapping.
      }
    }

    if (!isDesktop || !sidebarEl) {
      const frameId = window.requestAnimationFrame(() => {
        setCardTops({});
      });

      return () => window.cancelAnimationFrame(frameId);
    }

    const sidebarTop = sidebarEl.getBoundingClientRect().top + window.scrollY;
    const tops: Record<string, number> = {};

    for (const comment of comments) {
      const mark = contentEl.querySelector(`mark[data-cid="${comment.id}"]`);
      if (!mark) continue;
      const markTop = mark.getBoundingClientRect().top + window.scrollY;
      tops[comment.id] = Math.max(0, markTop - sidebarTop);
    }

    let stackTop = Object.values(tops).length ? Math.max(...Object.values(tops)) + 116 : 0;
    for (const comment of comments) {
      if (tops[comment.id] !== undefined) continue;
      tops[comment.id] = stackTop;
      stackTop += 116;
    }

    const frameId = window.requestAnimationFrame(() => {
      setCardTops(tops);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [activeId, comments, isDesktop]);

  useLayoutEffect(() => {
    if (!contentRef.current) return;

    contentRef.current.querySelectorAll<HTMLElement>('mark[data-cid]').forEach((element) => {
      element.style.background = element.dataset.cid === activeId ? '#7bd3ff' : '#cdeeff';
      element.style.boxShadow =
        element.dataset.cid === activeId ? '0 0 0 1px rgba(13, 121, 176, 0.38)' : 'none';
    });
  }, [activeId]);

  const updateLine = useCallback(() => {
    if (!isDesktop || !activeId) {
      setLine(null);
      return;
    }

    const mark = contentRef.current?.querySelector(`mark[data-cid="${activeId}"]`);
    const card = cardRefs.current[activeId];

    if (!mark || !card) {
      setLine(null);
      return;
    }

    const markRect = mark.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();

    setLine({
      x1: markRect.right,
      y1: markRect.top + markRect.height / 2,
      x2: cardRect.left,
      y2: cardRect.top + cardRect.height / 2,
    });
  }, [activeId, isDesktop]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(updateLine);
    window.addEventListener('scroll', updateLine, { passive: true });
    window.addEventListener('resize', updateLine);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('scroll', updateLine);
      window.removeEventListener('resize', updateLine);
    };
  }, [updateLine]);

  useEffect(() => {
    function clearComposer() {
      setForm(null);
      setCommentText('');
    }

    function syncComposerFromSelection(options?: { preserveWhileTyping?: boolean }) {
      const preserveWhileTyping = options?.preserveWhileTyping ?? false;
      const activeElement = document.activeElement;
      const isTypingInForm = Boolean(activeElement && formRef.current?.contains(activeElement));

      if (!canCreateComment) {
        clearComposer();
        return;
      }

      if (preserveWhileTyping && isTypingInForm) return;

      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.toString().trim()) {
        clearComposer();
        return;
      }

      const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
      const contentEl = contentRef.current;
      if (!range || !contentEl || !contentEl.contains(range.commonAncestorContainer)) {
        setForm(null);
        return;
      }

      const anchor = buildSelectionAnchor(contentEl, range);
      if (!anchor.text.trim() || anchor.start === anchor.end) {
        clearComposer();
        return;
      }

      const rect = range.getBoundingClientRect();
      const nextX = Math.min(
        Math.max(window.scrollX + 16, rect.left + window.scrollX),
        window.scrollX + window.innerWidth - FORM_WIDTH - 16
      );
      const nextY = isDesktop
        ? rect.bottom + window.scrollY + 12
        : window.scrollY + window.innerHeight - MOBILE_FORM_GUTTER;

      setForm({
        anchor: anchor.text.trim(),
        start: anchor.start,
        end: anchor.end,
        x: nextX,
        y: nextY,
      });
      setCommentText('');
    }

    function scheduleSync(options?: { preserveWhileTyping?: boolean }) {
      window.setTimeout(() => syncComposerFromSelection(options), 0);
    }

    function handlePointerUp(event: PointerEvent) {
      if (formRef.current?.contains(event.target as Node)) return;
      scheduleSync();
    }

    function handleTouchEnd(event: TouchEvent) {
      if (formRef.current?.contains(event.target as Node)) return;
      scheduleSync();
    }

    function handleSelectionChange() {
      scheduleSync({ preserveWhileTyping: true });
    }

    document.addEventListener('pointerup', handlePointerUp);
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    document.addEventListener('selectionchange', handleSelectionChange);

    return () => {
      document.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [canCreateComment, isDesktop]);

  const sidebarMinHeight = useMemo(() => {
    if (!isDesktop) return 'auto';
    const values = Object.values(cardTops);
    return values.length ? Math.max(340, ...values.map((value) => value + 120)) : 340;
  }, [cardTops, isDesktop]);

  async function submitComment() {
    if (!commentText.trim() || !form || !canCreateComment) return;
    if (!currentUser && allowAnonymous && !guestName.trim()) return;

    setLoading(true);

    const response = await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documentId,
        content: commentText.trim(),
        anchorText: form.anchor,
        anchorStart: form.start,
        anchorEnd: form.end,
        anonymousName: currentUser ? null : guestName.trim(),
      }),
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) return;

    // Clear selection before updating state to prevent useLayoutEffect
    // DOM manipulation from conflicting with the active selection range
    window.getSelection()?.removeAllRanges();

    setComments((prev) => [...prev, data.comment as Comment]);
    setCommentText('');
    setForm(null);
  }

  async function deleteComment(id: string) {
    const response = await fetch(`/api/comments/${id}`, { method: 'DELETE' });
    if (!response.ok) return;

    setComments((prev) => prev.filter((comment) => comment.id !== id));
    if (activeId === id) setActiveId(null);
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', lg: `minmax(0, 1fr) ${CARD_WIDTH}px` },
        gap: { xs: 3, lg: 4 },
        alignItems: 'start',
      }}
    >
      <Box ref={contentRef} sx={{ minWidth: 0 }}>
        <Paper
          variant="outlined"
          sx={[
            {
              p: { xs: 2.5, md: 4 },
              borderRadius: '14px',
              bgcolor: 'background.paper',
              boxShadow: '0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04)',
              userSelect: 'text',
              WebkitUserSelect: 'text',
              WebkitTouchCallout: 'default',
            },
            (theme) => theme.applyStyles('dark', { bgcolor: 'background.paper' }),
          ]}
        >
          <Stack spacing={2.5}>
            <Paper
              variant="outlined"
              sx={[
                {
                  p: 1.75,
                  borderRadius: '10px',
                  bgcolor: '#E0F2FE',
                  borderColor: '#B8E0FF',
                },
                (theme) =>
                  theme.applyStyles('dark', {
                    bgcolor: 'rgba(0, 124, 219, 0.12)',
                    borderColor: 'rgba(184, 224, 255, 0.35)',
                  }),
              ]}
            >
              <Typography variant="body2" color="text.secondary">
                Select any passage to open the note composer. On larger screens the discussion
                stays pinned to the reading surface. On smaller screens comments continue below
                the document for a simpler mobile flow.
              </Typography>
            </Paper>

            <MarkdownRenderer content={content} />
          </Stack>
        </Paper>
      </Box>

      <Box
        ref={sidebarRef}
        sx={{
          width: '100%',
          position: 'relative',
          minHeight: sidebarMinHeight,
        }}
      >
        <Stack spacing={1.5} sx={{ mb: isDesktop ? 0 : 1.5 }}>
          <Typography variant="h6" fontWeight={700}>
            Comments
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {comments.length > 0
              ? `${comments.length} comments attached to this document`
              : 'No comments yet. Highlight text to add the first one.'}
          </Typography>
          {publicView && (
            <Stack direction="row" spacing={1} alignItems="center">
              <PublicIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">
                Public reading link
              </Typography>
            </Stack>
          )}
        </Stack>

        {comments.map((comment) => {
          const displayName = getCommentDisplayName(comment);
          const canDelete = currentUser?.id === comment.user_id;

          return (
            <Box
              key={comment.id}
              ref={(element) => {
                cardRefs.current[comment.id] = element as HTMLDivElement | null;
              }}
              sx={{
                position: isDesktop ? 'absolute' : 'relative',
                top: isDesktop ? (cardTops[comment.id] ?? 0) : 'auto',
                left: 0,
                right: 0,
                mb: isDesktop ? 0 : 1.5,
              }}
            >
              <Paper
                variant="outlined"
                onClick={() => setActiveId((current) => (current === comment.id ? null : comment.id))}
                sx={[
                  {
                    p: 1.5,
                    cursor: 'pointer',
                    borderRadius: 3,
                    transition: 'border-color 0.15s, background-color 0.15s',
                    borderColor: comment.id === activeId ? 'primary.main' : 'divider',
                    bgcolor: comment.id === activeId ? 'rgba(237, 246, 255, 0.98)' : 'background.paper',
                    '&:hover': { borderColor: 'primary.light' },
                  },
                  (theme) =>
                    theme.applyStyles('dark', {
                      bgcolor: comment.id === activeId ? 'rgba(18, 44, 72, 0.92)' : 'background.paper',
                    }),
                ]}
              >
                <Stack direction="row" spacing={1.25} alignItems="center" mb={1.25}>
                  <Avatar
                    sx={{
                      width: 36,
                      height: 36,
                      bgcolor: comment.is_anonymous ? 'grey.300' : 'primary.main',
                      color: comment.is_anonymous ? 'text.primary' : 'white',
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    {getInitials(displayName)}
                  </Avatar>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="body2" fontWeight={700} noWrap>
                      {displayName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(comment.created_at).toLocaleString()}
                    </Typography>
                  </Box>
                  {canDelete && (
                    <IconButton
                      size="small"
                      color="error"
                      onClick={(event) => {
                        event.stopPropagation();
                        deleteComment(comment.id);
                      }}
                    >
                      <DeleteIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  )}
                </Stack>

                {comment.anchor_text && (
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      mb: 1,
                      pl: 1,
                      borderLeft: '3px solid',
                      borderColor: 'primary.main',
                      color: 'text.secondary',
                      fontStyle: 'italic',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {comment.anchor_text}
                  </Typography>
                )}

                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {comment.content}
                </Typography>
              </Paper>
            </Box>
          );
        })}
      </Box>

      {mounted && isDesktop && line && createPortal(
        <svg
          style={{
            position: 'fixed',
            inset: 0,
            width: '100vw',
            height: '100vh',
            pointerEvents: 'none',
            zIndex: 999,
            overflow: 'visible',
          }}
        >
          <path
            d={`M ${line.x1} ${line.y1} C ${(line.x1 + line.x2) / 2} ${line.y1}, ${(line.x1 + line.x2) / 2} ${line.y2}, ${line.x2} ${line.y2}`}
            fill="none"
            stroke="#1e88e5"
            strokeWidth="1.5"
            strokeDasharray="6 4"
            opacity="0.7"
          />
        </svg>,
        document.body
      )}

      {mounted && form && canCreateComment && createPortal(
        <Paper
          ref={formRef}
          elevation={10}
          sx={[
            {
              position: isDesktop ? 'absolute' : 'fixed',
              top: isDesktop ? form.y : 'auto',
              left: isDesktop ? form.x : MOBILE_FORM_GUTTER,
              right: isDesktop ? 'auto' : MOBILE_FORM_GUTTER,
              bottom: isDesktop ? 'auto' : MOBILE_FORM_GUTTER,
              width: isDesktop ? FORM_WIDTH : 'auto',
              maxWidth: `calc(100vw - ${MOBILE_FORM_GUTTER * 2}px)`,
              p: 2,
              borderRadius: 3,
              zIndex: 1400,
            },
            (theme) =>
              theme.applyStyles('dark', {
                bgcolor: 'background.paper',
              }),
          ]}
        >
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              mb: 1.5,
              pl: 1,
              borderLeft: '3px solid',
              borderColor: 'primary.main',
              color: 'text.secondary',
              fontStyle: 'italic',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
            }}
          >
            {form.anchor}
          </Typography>

          {!currentUser && allowAnonymous && (
            <TextField
              fullWidth
              size="small"
              label="Your name"
              value={guestName}
              onChange={(event) => setGuestName(event.target.value)}
              sx={{ mb: 1.25 }}
            />
          )}

          <TextField
            multiline
            minRows={3}
            fullWidth
            size="small"
            placeholder="Add a comment…"
            value={commentText}
            onChange={(event) => setCommentText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) submitComment();
            }}
          />

          <Stack direction="row" justifyContent="flex-end" spacing={1} mt={1.5}>
            <Button
              size="small"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setForm(null);
                setCommentText('');
              }}
            >
              Cancel
            </Button>
            <Button
              size="small"
              variant="contained"
              disabled={loading || !commentText.trim() || (!currentUser && allowAnonymous && !guestName.trim())}
              onMouseDown={(event) => event.preventDefault()}
              onClick={submitComment}
            >
              Save
            </Button>
          </Stack>
        </Paper>,
        document.body
      )}
    </Box>
  );
}

function getCommentDisplayName(comment: Comment) {
  if (comment.is_anonymous) return comment.author_name?.trim() || 'Anonymous';
  return comment.author_name?.trim() || comment.profiles?.name || comment.profiles?.email || 'Member';
}

function buildSelectionAnchor(container: HTMLElement, range: Range) {
  const prefixRange = range.cloneRange();
  prefixRange.selectNodeContents(container);
  prefixRange.setEnd(range.startContainer, range.startOffset);

  const start = prefixRange.toString().length;
  const text = range.toString();
  const end = start + text.length;

  return { start, end, text };
}

function unwrapMarks(container: HTMLElement) {
  container.querySelectorAll('mark[data-cid]').forEach((mark) => {
    const fragment = document.createDocumentFragment();
    while (mark.firstChild) fragment.appendChild(mark.firstChild);
    mark.replaceWith(fragment);
  });
}

function highlightComment(
  container: HTMLElement,
  comment: Comment,
  active: boolean,
  onClick: (id: string) => void
) {
  if (
    typeof comment.anchor_start === 'number' &&
    typeof comment.anchor_end === 'number' &&
    comment.anchor_end > comment.anchor_start
  ) {
    const applied = wrapRange(container, comment.anchor_start, comment.anchor_end, comment.id, active, onClick);
    if (applied) return true;
  }

  if (comment.anchor_text) {
    return wrapByText(container, comment.anchor_text, comment.id, active, onClick);
  }

  return false;
}

function wrapRange(
  container: HTMLElement,
  start: number,
  end: number,
  commentId: string,
  active: boolean,
  onClick: (id: string) => void
) {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let currentNode = walker.nextNode() as Text | null;
  let currentOffset = 0;
  let startNode: Text | null = null;
  let endNode: Text | null = null;
  let startOffsetInNode = 0;
  let endOffsetInNode = 0;

  while (currentNode) {
    const textLength = currentNode.textContent?.length ?? 0;
    const nextOffset = currentOffset + textLength;

    if (!startNode && start >= currentOffset && start <= nextOffset) {
      startNode = currentNode;
      startOffsetInNode = start - currentOffset;
    }

    if (!endNode && end >= currentOffset && end <= nextOffset) {
      endNode = currentNode;
      endOffsetInNode = end - currentOffset;
      break;
    }

    currentOffset = nextOffset;
    currentNode = walker.nextNode() as Text | null;
  }

  if (!startNode || !endNode) return false;

  const range = document.createRange();
  range.setStart(startNode, startOffsetInNode);
  range.setEnd(endNode, endOffsetInNode);

  if (!range.toString().trim()) return false;

  const mark = createMark(commentId, active, onClick);
  mark.appendChild(range.extractContents());
  range.insertNode(mark);
  return true;
}

function wrapByText(
  container: HTMLElement,
  searchText: string,
  commentId: string,
  active: boolean,
  onClick: (id: string) => void
) {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let node: Text | null;

  while ((node = walker.nextNode() as Text | null)) {
    const text = node.textContent ?? '';
    const index = text.indexOf(searchText);
    if (index === -1) continue;

    const before = text.slice(0, index);
    const after = text.slice(index + searchText.length);
    const fragment = document.createDocumentFragment();

    if (before) fragment.appendChild(document.createTextNode(before));
    fragment.appendChild(createMark(commentId, active, onClick, searchText));
    if (after) fragment.appendChild(document.createTextNode(after));

    node.parentNode?.replaceChild(fragment, node);
    return true;
  }

  return false;
}

function createMark(
  commentId: string,
  active: boolean,
  onClick: (id: string) => void,
  textContent?: string
) {
  const mark = document.createElement('mark');
  mark.dataset.cid = commentId;
  if (textContent !== undefined) mark.textContent = textContent;
  mark.style.background = active ? '#7bd3ff' : '#cdeeff';
  mark.style.borderRadius = '2px';
  mark.style.padding = '1px 0';
  mark.style.cursor = 'pointer';
  mark.style.transition = 'background 0.15s ease';
  mark.addEventListener('click', () => onClick(commentId));
  return mark;
}

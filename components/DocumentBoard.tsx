"use client";

import { useCallback, useRef, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  UniqueIdentifier,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import AddIcon from "@mui/icons-material/Add";
import ArticleIcon from "@mui/icons-material/Article";
import AssessmentIcon from "@mui/icons-material/Assessment";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import BuildIcon from "@mui/icons-material/Build";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import CodeIcon from "@mui/icons-material/Code";
import DeleteIcon from "@mui/icons-material/Delete";
import DashboardIcon from "@mui/icons-material/Dashboard";
import DescriptionIcon from "@mui/icons-material/Description";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import EditIcon from "@mui/icons-material/Edit";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import FolderIcon from "@mui/icons-material/Folder";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import LabelIcon from "@mui/icons-material/Label";
import WorkIcon from "@mui/icons-material/Work";
import LightbulbIcon from "@mui/icons-material/Lightbulb";
import PaletteIcon from "@mui/icons-material/Palette";
import ScienceIcon from "@mui/icons-material/Science";
import ShareIcon from "@mui/icons-material/Share";
import StarIcon from "@mui/icons-material/Star";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Collapse from "@mui/material/Collapse";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Popover from "@mui/material/Popover";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import NextLink from "next/link";
import Link from "next/link";

// ─── Public types ─────────────────────────────────────────────────────────────

export type DocForBoard = {
  id: string;
  slug: string;
  public_share_token?: string | null;
  title: string;
  content: string;
  description?: string | null;
  image?: string | null;
  created_at: string;
  folder_id: string | null;
  position: number;
  card_color: string | null;
  card_icon: string | null;
  public_access_enabled: boolean;
  public_comments_visible: boolean;
  anonymous_comments_enabled: boolean;
  doc_type?: string | null;
};

export type FolderForBoard = {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  public_share_token?: string | null;
  position: number;
  parent_id?: string | null;
};

// ─── Internal board item ──────────────────────────────────────────────────────

type BoardItem =
  | { kind: "doc"; id: string; doc: DocForBoard }
  | { kind: "folder"; id: string; folder: FolderForBoard; docs: DocForBoard[] };

// contextId = null  → root board (folder_id/parent_id = null for free items)
// contextId = <id>  → inside a folder (folder_id/parent_id = <id> for free items)

// ─── Constants ────────────────────────────────────────────────────────────────

const CARD_COLORS = [
  { value: null, swatch: "action.selected" },
  { value: "#1565C0", swatch: "#1565C0" },
  { value: "#2E7D32", swatch: "#2E7D32" },
  { value: "#B71C1C", swatch: "#B71C1C" },
  { value: "#E65100", swatch: "#E65100" },
  { value: "#6A1B9A", swatch: "#6A1B9A" },
  { value: "#00695C", swatch: "#00695C" },
  { value: "#F57F17", swatch: "#F57F17" },
  { value: "#37474F", swatch: "#37474F" },
];

const FOLDER_COLORS = [
  { value: null },
  { value: "#1565C0" },
  { value: "#2E7D32" },
  { value: "#B71C1C" },
  { value: "#E65100" },
  { value: "#6A1B9A" },
  { value: "#00695C" },
  { value: "#F57F17" },
];

type IconEntry = { value: string | null; label: string; Icon: React.ElementType | null };
const CARD_ICONS: IconEntry[] = [
  { value: null, label: "None", Icon: null },
  { value: "article", label: "Article", Icon: ArticleIcon },
  { value: "code", label: "Code", Icon: CodeIcon },
  { value: "assessment", label: "Chart", Icon: AssessmentIcon },
  { value: "star", label: "Star", Icon: StarIcon },
  { value: "bookmark", label: "Bookmark", Icon: BookmarkIcon },
  { value: "label", label: "Label", Icon: LabelIcon },
  { value: "build", label: "Build", Icon: BuildIcon },
  { value: "science", label: "Science", Icon: ScienceIcon },
  { value: "description", label: "Docs", Icon: DescriptionIcon },
  { value: "lightbulb", label: "Idea", Icon: LightbulbIcon },
];

const ICON_MAP: Record<string, React.ElementType> = {
  article: ArticleIcon,
  code: CodeIcon,
  assessment: AssessmentIcon,
  star: StarIcon,
  bookmark: BookmarkIcon,
  label: LabelIcon,
  build: BuildIcon,
  science: ScienceIcon,
  description: DescriptionIcon,
  lightbulb: LightbulbIcon,
};

const FOLDER_ICON_MAP: Record<string, React.ElementType> = {
  work: WorkIcon,
  code: CodeIcon,
  star: StarIcon,
  bookmark: BookmarkIcon,
  label: LabelIcon,
  build: BuildIcon,
  science: ScienceIcon,
  description: DescriptionIcon,
  lightbulb: LightbulbIcon,
  assessment: AssessmentIcon,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createExcerpt(text: string, max = 160): string {
  const cleaned = text
    .replace(/^---[\s\S]*?---/m, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .trim();

  const para =
    cleaned
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean)
      .filter((p) => !/^#{1,6}\s/.test(p))
      .filter((p) => !/^\s*[-*+]\s/.test(p))[0] || cleaned;

  const result = para
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/[*_`>#-]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return result.length > max ? result.slice(0, max).trim() + "…" : result;
}

function buildBoardItems(docs: DocForBoard[], folders: FolderForBoard[]): BoardItem[] {
  const folderedDocs = new Map<string, DocForBoard[]>();
  folders.forEach((f) => folderedDocs.set(f.id, []));
  docs.forEach((d) => {
    if (d.folder_id) folderedDocs.get(d.folder_id)?.push(d);
  });
  folderedDocs.forEach((arr) => arr.sort((a, b) => a.position - b.position));

  const items: BoardItem[] = [
    ...folders.map((f) => ({
      kind: "folder" as const,
      id: `folder:${f.id}`,
      folder: f,
      docs: folderedDocs.get(f.id) ?? [],
    })),
    ...docs
      .filter((d) => !d.folder_id)
      .map((d) => ({
        kind: "doc" as const,
        id: d.id,
        doc: d,
      })),
  ];

  items.sort((a, b) => {
    const pa = a.kind === "folder" ? a.folder.position : a.doc.position;
    const pb = b.kind === "folder" ? b.folder.position : b.doc.position;
    return pa - pb;
  });

  return items;
}

// ─── Colour swatch ────────────────────────────────────────────────────────────

function Swatch({
  value,
  swatch,
  selected,
  onClick,
}: {
  value: string | null;
  swatch: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <Box
      onClick={onClick}
      sx={{
        width: 28,
        height: 28,
        borderRadius: "50%",
        bgcolor: swatch,
        border: "2.5px solid",
        borderColor: selected ? "text.primary" : "transparent",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "transform 0.1s",
        "&:hover": { transform: "scale(1.2)" },
      }}
    >
      {value === null && selected && <CheckIcon sx={{ fontSize: 14 }} />}
    </Box>
  );
}

function BoardCardShell({
  accent,
  selected = false,
  children,
}: {
  accent?: string | null;
  selected?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 3,
        height: "100%",
        borderColor: selected ? (accent ?? "primary.main") : accent ? `${accent}55` : "rgba(12,123,220,0.1)",
        borderLeftWidth: accent ? 4 : 1,
        borderLeftColor: accent || undefined,
        transition: "transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s ease, border-color 0.2s ease",
        boxShadow: selected && accent ? `0 0 0 3px ${accent}33` : undefined,
        "&:hover": {
          borderColor: accent ? `${accent}99` : "primary.main",
          boxShadow: "0 12px 32px rgba(15,90,163,0.14)",
          transform: "translateY(-3px)",
        },
      }}
    >
      <CardContent sx={{ p: 2.5 }}>{children}</CardContent>
    </Card>
  );
}

// ─── DocCardContent (no DnD hooks) ───────────────────────────────────────────

function DocCardContent({
  doc,
  isAdmin,
  onCustomize,
  onRemoveFromFolder,
  dragHandle,
  href,
}: {
  doc: DocForBoard;
  isAdmin: boolean;
  onCustomize?: (doc: DocForBoard, anchor: HTMLElement) => void;
  onRemoveFromFolder?: (doc: DocForBoard) => void;
  dragHandle?: React.ReactNode;
  href?: string;
}) {
  const accent = doc.card_color;
  const CardIcon = doc.card_icon ? ICON_MAP[doc.card_icon] : null;

  return (
    <BoardCardShell accent={accent}>
      <Stack spacing={1}>
        {/* ── Top bar ─────────────────────────────────────────────────── */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={0.5}>
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ flex: 1, minWidth: 0 }}>
            {doc.public_access_enabled && <Chip size="small" label="Public" color="primary" />}
            {doc.public_comments_visible && <Chip size="small" label="Comments" variant="outlined" />}
            {doc.doc_type === "whiteboard" && (
              <Chip
                size="small"
                label="Whiteboard"
                icon={<DashboardIcon sx={{ fontSize: "14px !important" }} />}
                variant="outlined"
                color="secondary"
              />
            )}
          </Stack>
          <Stack direction="row" spacing={0.25} flexShrink={0} alignItems="center">
            {isAdmin && onCustomize && (
              <Tooltip title="Customize">
                <IconButton
                  size="small"
                  sx={{ opacity: 0.45, "&:hover": { opacity: 1 } }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onCustomize(doc, e.currentTarget);
                  }}
                >
                  <PaletteIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            )}
            {isAdmin && onRemoveFromFolder && (
              <Tooltip title="Remove from folder">
                <IconButton
                  size="small"
                  sx={{ opacity: 0.45, "&:hover": { opacity: 1 } }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onRemoveFromFolder(doc);
                  }}
                >
                  <CloseIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            )}
            {isAdmin && (
              <Link href={`/admin/documents/${doc.slug}`} style={{ textDecoration: "none" }}>
                <Button size="small" variant="outlined" sx={{ minWidth: 0, px: 1, py: 0.25, fontSize: 12 }}>
                  Edit
                </Button>
              </Link>
            )}
            {dragHandle}
          </Stack>
        </Stack>

        {/* ── Clickable body: thumbnail → title → date ────────────────── */}
        <Link href={href ?? `/docs/${doc.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
          <Stack spacing={1}>
            {/* Icon / thumbnail area */}
            <Box
              sx={{
                height: 120,
                borderRadius: 2,
                overflow: "hidden",
                bgcolor: "action.hover",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                my: 0.5,
              }}
            >
              {doc.image ? (
                <Box
                  component="img"
                  src={doc.image}
                  alt={doc.title}
                  sx={{ objectFit: "cover", width: "100%", height: "100%" }}
                />
              ) : CardIcon ? (
                <CardIcon sx={{ fontSize: 64, color: accent || "primary.main" }} />
              ) : doc.doc_type === "whiteboard" ? (
                <DashboardIcon sx={{ fontSize: 64, color: accent || "secondary.main" }} />
              ) : (
                <DescriptionIcon sx={{ fontSize: 64, color: "text.disabled" }} />
              )}
            </Box>

            {/* Title */}
            <Typography
              variant="subtitle1"
              fontWeight={700}
              sx={{
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                lineHeight: 1.3,
              }}
            >
              {doc.title}
            </Typography>

            {/* Metadata: creation date */}
            <Typography variant="caption" color="text.secondary">
              {new Date(doc.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </Typography>
          </Stack>
        </Link>
      </Stack>
    </BoardCardShell>
  );
}

// ─── SortableDocCard ──────────────────────────────────────────────────────────

function SortableDocCard({
  doc,
  isAdmin,
  onCustomize,
  isDragTarget,
  href,
}: {
  doc: DocForBoard;
  isAdmin: boolean;
  onCustomize?: (doc: DocForBoard, anchor: HTMLElement) => void;
  isDragTarget?: boolean;
  href?: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: doc.id });

  const dragHandle = isAdmin ? (
    // suppressHydrationWarning: @dnd-kit generates different aria-describedby on server vs client
    <Box
      {...attributes}
      {...listeners}
      suppressHydrationWarning
      sx={{
        cursor: "grab",
        color: "text.disabled",
        "&:hover": { color: "text.secondary" },
        display: "flex",
        alignItems: "center",
        touchAction: "none",
        ml: 0.5,
      }}
    >
      <DragIndicatorIcon sx={{ fontSize: 18 }} />
    </Box>
  ) : undefined;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? "transform 200ms cubic-bezier(0.25,0.46,0.45,0.94)",
  };

  return (
    <Box
      ref={setNodeRef}
      style={style}
      sx={{
        opacity: isDragging ? 0 : 1,
        minWidth: 0,
        outline: isDragTarget ? "2px dashed" : "none",
        outlineColor: "primary.main",
        borderRadius: 3,
        transition: "opacity 0.15s ease",
      }}
    >
      <DocCardContent doc={doc} isAdmin={isAdmin} onCustomize={onCustomize} dragHandle={dragHandle} href={href} />
    </Box>
  );
}

// ─── FolderCardContent (no DnD hooks) ────────────────────────────────────────

function FolderCardContent({
  folder,
  docs,
  isAdmin,
  expanded,
  isDragTarget,
  onToggle,
  onRename,
  onDelete,
  onCustomizeDoc,
  onRemoveDocFromFolder,
  dragHandle,
  folderHref,
  docHrefBuilder,
}: {
  folder: FolderForBoard;
  docs: DocForBoard[];
  isAdmin: boolean;
  expanded: boolean;
  isDragTarget: boolean;
  onToggle: () => void;
  onRename?: () => void;
  onDelete?: () => void;
  onCustomizeDoc?: (doc: DocForBoard, anchor: HTMLElement) => void;
  onRemoveDocFromFolder?: (doc: DocForBoard) => void;
  dragHandle?: React.ReactNode;
  folderHref?: string;
  docHrefBuilder?: (doc: DocForBoard) => string;
}) {
  const accent = folder.color ?? "#1565C0";
  const FolderIconComponent = folder.icon ? (FOLDER_ICON_MAP[folder.icon] ?? FolderIcon) : FolderIcon;
  const FolderOpenComponent = folder.icon ? (FOLDER_ICON_MAP[folder.icon] ?? FolderOpenIcon) : FolderOpenIcon;

  return (
    <Box sx={{ position: "relative" }}>
      <BoardCardShell accent={accent} selected={isDragTarget}>
        <Stack spacing={1}>
          {/* ── Top bar ─────────────────────────────────────────────────── */}
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={0.5}>
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ flex: 1, minWidth: 0 }}>
              <Chip size="small" label={`${docs.length} docs`} sx={{ bgcolor: `${accent}22`, color: accent }} />
              {folder.public_share_token && <Chip size="small" label="Share" variant="outlined" />}
            </Stack>
            <Stack direction="row" spacing={0.25} flexShrink={0} alignItems="center">
              {isAdmin && onRename && (
                <Tooltip title="Rename">
                  <IconButton size="small" onClick={onRename} sx={{ opacity: 0.45, "&:hover": { opacity: 1 } }}>
                    <EditIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              )}
              {folder.public_share_token && (
                <Tooltip title="Open public link">
                  <Link
                    href={`/share/folders/${folder.public_share_token}`}
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    <IconButton size="small" sx={{ opacity: 0.45, "&:hover": { opacity: 1 } }}>
                      <ShareIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Link>
                </Tooltip>
              )}
              {isAdmin && onDelete && (
                <Tooltip title="Delete folder">
                  <IconButton size="small" onClick={onDelete} sx={{ opacity: 0.45, "&:hover": { opacity: 1 } }}>
                    <DeleteIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              )}
              {dragHandle}
            </Stack>
          </Stack>

          {/* ── Clickable body: icon → title → metadata ─────────────────── */}
          <NextLink href={folderHref ?? `/folders/${folder.id}`} style={{ textDecoration: "none", color: "inherit" }}>
            <Stack spacing={1}>
              {/* Icon area */}
              <Box
                sx={{
                  height: 120,
                  borderRadius: 2,
                  overflow: "hidden",
                  bgcolor: `${accent}11`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  my: 0.5,
                }}
              >
                {expanded ? (
                  <FolderOpenComponent sx={{ fontSize: 72, color: accent }} />
                ) : (
                  <FolderIconComponent sx={{ fontSize: 72, color: accent }} />
                )}
              </Box>

              {/* Title */}
              <Typography
                variant="subtitle1"
                fontWeight={700}
                sx={{
                  overflow: "hidden",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  lineHeight: 1.3,
                }}
              >
                {folder.name}
              </Typography>

              {/* Metadata: doc count */}
              <Typography variant="caption" color="text.secondary">
                {docs.length === 0 ? "Empty folder" : `${docs.length} document${docs.length === 1 ? "" : "s"}`}
              </Typography>
            </Stack>
          </NextLink>

          {/* ── Expand / collapse button ─────────────────────────────────── */}
          <Box sx={{ display: "flex", justifyContent: "center" }}>
            <IconButton size="small" onClick={onToggle} sx={{ opacity: 0.55, "&:hover": { opacity: 1 } }}>
              {expanded ? <ExpandLessIcon sx={{ fontSize: 18 }} /> : <ExpandMoreIcon sx={{ fontSize: 18 }} />}
            </IconButton>
          </Box>

          {/* ── Drag-over indicator ──────────────────────────────────────── */}
          {isDragTarget && (
            <Typography variant="caption" sx={{ display: "block", textAlign: "center", color: accent }}>
              Drop here to add to folder
            </Typography>
          )}

          {/* ── Expanded docs grid ───────────────────────────────────────── */}
          <Collapse in={expanded} timeout={280} unmountOnExit>
            {docs.length > 0 ? (
              <>
                <Divider sx={{ my: 2 }} />
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
                    gap: "12px",
                  }}
                >
                  {docs.map((doc) => (
                    <DocCardContent
                      key={doc.id}
                      doc={doc}
                      isAdmin={isAdmin}
                      onCustomize={onCustomizeDoc}
                      onRemoveFromFolder={onRemoveDocFromFolder}
                      href={docHrefBuilder?.(doc)}
                    />
                  ))}
                </Box>
              </>
            ) : (
              <Typography variant="body2" color="text.disabled" sx={{ mt: 1.5 }}>
                Empty — drag a document here
              </Typography>
            )}
          </Collapse>
        </Stack>
      </BoardCardShell>
    </Box>
  );
}

// ─── SortableFolderCard ───────────────────────────────────────────────────────

function SortableFolderCard({
  item,
  isAdmin,
  expanded,
  isDragTarget,
  onToggle,
  onRename,
  onDelete,
  onCustomizeDoc,
  onRemoveDocFromFolder,
  folderHref,
  docHrefBuilder,
}: {
  item: Extract<BoardItem, { kind: "folder" }>;
  isAdmin: boolean;
  expanded: boolean;
  isDragTarget: boolean;
  onToggle: () => void;
  onRename?: () => void;
  onDelete?: () => void;
  onCustomizeDoc?: (doc: DocForBoard, anchor: HTMLElement) => void;
  onRemoveDocFromFolder?: (doc: DocForBoard) => void;
  folderHref?: string;
  docHrefBuilder?: (doc: DocForBoard) => string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const dragHandle = isAdmin ? (
    // suppressHydrationWarning: @dnd-kit generates different aria-describedby on server vs client
    <Box
      {...attributes}
      {...listeners}
      suppressHydrationWarning
      sx={{
        cursor: "grab",
        color: "text.disabled",
        "&:hover": { color: "text.secondary" },
        display: "flex",
        alignItems: "center",
        touchAction: "none",
      }}
    >
      <DragIndicatorIcon sx={{ fontSize: 18 }} />
    </Box>
  ) : undefined;

  const folderStyle = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? "transform 200ms cubic-bezier(0.25,0.46,0.45,0.94)",
  };

  return (
    <Box
      ref={setNodeRef}
      style={folderStyle}
      sx={{ opacity: isDragging ? 0 : 1, minWidth: 0, transition: "opacity 0.15s ease" }}
    >
      <FolderCardContent
        folder={item.folder}
        docs={item.docs}
        isAdmin={isAdmin}
        expanded={expanded}
        isDragTarget={isDragTarget}
        onToggle={onToggle}
        onRename={onRename}
        onDelete={onDelete}
        onCustomizeDoc={onCustomizeDoc}
        onRemoveDocFromFolder={onRemoveDocFromFolder}
        dragHandle={dragHandle}
        folderHref={folderHref}
        docHrefBuilder={docHrefBuilder}
      />
    </Box>
  );
}

// ─── CardCustomizePopover ─────────────────────────────────────────────────────

function CardCustomizePopover({
  doc,
  anchorEl,
  onClose,
  onSave,
}: {
  doc: DocForBoard | null;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onSave: (id: string, color: string | null, icon: string | null) => void;
}) {
  if (!doc) return null;
  return <CardCustomizePopoverBody key={doc.id} doc={doc} anchorEl={anchorEl} onClose={onClose} onSave={onSave} />;
}

function CardCustomizePopoverBody({
  doc,
  anchorEl,
  onClose,
  onSave,
}: {
  doc: DocForBoard;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onSave: (id: string, color: string | null, icon: string | null) => void;
}) {
  const [color, setColor] = useState<string | null>(doc.card_color ?? null);
  const [icon, setIcon] = useState<string | null>(doc.card_icon ?? null);

  return (
    <Popover
      open={Boolean(anchorEl)}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      transformOrigin={{ vertical: "top", horizontal: "right" }}
      slotProps={{ paper: { sx: { borderRadius: 3 } } }}
    >
      <Box sx={{ p: 2.5, width: 270 }}>
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>
          Accent color
        </Typography>
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
          {CARD_COLORS.map((c) => (
            <Swatch
              key={String(c.value)}
              value={c.value}
              swatch={c.swatch}
              selected={color === c.value}
              onClick={() => setColor(c.value)}
            />
          ))}
        </Stack>
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>
          Icon
        </Typography>
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 2.5 }}>
          {CARD_ICONS.map((item) => (
            <Tooltip key={String(item.value)} title={item.label}>
              <Box
                onClick={() => setIcon(item.value)}
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 1.5,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "2px solid",
                  borderColor: icon === item.value ? "primary.main" : "divider",
                  bgcolor: icon === item.value ? "primary.main" : "transparent",
                  color: icon === item.value ? "primary.contrastText" : "text.secondary",
                  cursor: "pointer",
                  transition: "all 0.1s",
                  "&:hover": { borderColor: "primary.main" },
                }}
              >
                {item.Icon ? (
                  <item.Icon sx={{ fontSize: 18 }} />
                ) : (
                  <Typography variant="caption" lineHeight={1}>
                    —
                  </Typography>
                )}
              </Box>
            </Tooltip>
          ))}
        </Stack>
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button size="small" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={() => {
              onSave(doc.id, color, icon);
              onClose();
            }}
          >
            Apply
          </Button>
        </Stack>
      </Box>
    </Popover>
  );
}

// ─── FolderDialog ─────────────────────────────────────────────────────────────

const FOLDER_ICON_OPTIONS: Array<{ value: string | null; label: string; Icon: React.ElementType }> = [
  { value: null, label: "Default", Icon: FolderIcon },
  { value: "work", label: "Work", Icon: WorkIcon },
  { value: "code", label: "Code", Icon: CodeIcon },
  { value: "star", label: "Star", Icon: StarIcon },
  { value: "bookmark", label: "Bookmark", Icon: BookmarkIcon },
  { value: "label", label: "Label", Icon: LabelIcon },
  { value: "build", label: "Build", Icon: BuildIcon },
  { value: "science", label: "Science", Icon: ScienceIcon },
  { value: "description", label: "Docs", Icon: DescriptionIcon },
  { value: "lightbulb", label: "Idea", Icon: LightbulbIcon },
  { value: "assessment", label: "Chart", Icon: AssessmentIcon },
];

function FolderDialog({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  initial?: { name: string; color: string | null; icon: string | null };
  onClose: () => void;
  onSave: (name: string, color: string | null, icon: string | null) => void;
}) {
  return (
    <FolderDialogBody
      key={`${initial?.name ?? "new"}-${open ? "open" : "closed"}`}
      open={open}
      initial={initial}
      onClose={onClose}
      onSave={onSave}
    />
  );
}

function FolderDialogBody({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  initial?: { name: string; color: string | null; icon: string | null };
  onClose: () => void;
  onSave: (name: string, color: string | null, icon: string | null) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [color, setColor] = useState<string | null>(initial?.color ?? null);
  const [icon, setIcon] = useState<string | null>(initial?.icon ?? null);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{initial ? "Edit folder" : "New folder"}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          label="Folder name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim()) {
              onSave(name.trim(), color, icon);
              onClose();
            }
          }}
          sx={{ mt: 1, mb: 2.5 }}
        />
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>
          Color
        </Typography>
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 2.5 }}>
          {FOLDER_COLORS.map((c) => (
            <Swatch
              key={String(c.value)}
              value={c.value}
              swatch={c.value || "#9e9e9e"}
              selected={color === c.value}
              onClick={() => setColor(c.value)}
            />
          ))}
        </Stack>
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>
          Icon
        </Typography>
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
          {FOLDER_ICON_OPTIONS.map((item) => (
            <Tooltip key={String(item.value)} title={item.label}>
              <Box
                onClick={() => setIcon(item.value)}
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 1.5,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "2px solid",
                  borderColor: icon === item.value ? "primary.main" : "divider",
                  bgcolor: icon === item.value ? "primary.main" : "transparent",
                  color: icon === item.value ? "primary.contrastText" : "text.secondary",
                  cursor: "pointer",
                  transition: "all 0.1s",
                  "&:hover": { borderColor: "primary.main" },
                }}
              >
                <item.Icon sx={{ fontSize: 18 }} />
              </Box>
            </Tooltip>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={!name.trim()}
          onClick={() => {
            onSave(name.trim(), color, icon);
            onClose();
          }}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── DocumentBoard ────────────────────────────────────────────────────────────

export function DocumentBoard({
  initialDocs,
  initialFolders,
  isAdmin,
  contextId = null,
  docHrefBuilder,
  folderHrefBuilder,
}: {
  initialDocs: DocForBoard[];
  initialFolders: FolderForBoard[];
  isAdmin: boolean;
  /** null = root board; folder ID = inside a specific folder */
  contextId?: string | null;
  docHrefBuilder?: (doc: DocForBoard) => string;
  folderHrefBuilder?: (folder: FolderForBoard) => string;
}) {
  const [boardItems, setBoardItems] = useState<BoardItem[]>(() => buildBoardItems(initialDocs, initialFolders));
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // Card customisation
  const [customizeAnchor, setCustomizeAnchor] = useState<HTMLElement | null>(null);
  const [customizeDoc, setCustomizeDoc] = useState<DocForBoard | null>(null);

  // Folder dialog
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<FolderForBoard | null>(null);

  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Save helpers ────────────────────────────────────────────────────────────

  const saveOrder = useCallback(
    (items: BoardItem[]) => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => {
        const docUpdates: Array<{ id: string; folder_id: string | null; position: number }> = [];
        items.forEach((item, idx) => {
          if (item.kind === "doc") {
            // free docs in this context belong to contextId
            docUpdates.push({ id: item.doc.id, folder_id: contextId ?? null, position: idx });
          } else {
            fetch(`/api/folders/${item.folder.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              // folders at this level belong to contextId (parent_id)
              body: JSON.stringify({ position: idx, parent_id: contextId ?? null }),
            });
            item.docs.forEach((doc, docIdx) => {
              docUpdates.push({ id: doc.id, folder_id: item.folder.id, position: docIdx });
            });
          }
        });
        if (docUpdates.length > 0) {
          fetch("/api/documents/reorder", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items: docUpdates }),
          });
        }
      }, 600);
    },
    [contextId],
  );

  // ── Derived ─────────────────────────────────────────────────────────────────

  const activeItem = boardItems.find((i) => i.id === activeId);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  // ── DnD handlers ────────────────────────────────────────────────────────────

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(active.id);
    setDragOverFolderId(null);
  }

  function handleDragOver({
    active,
    over,
  }: {
    active: { id: UniqueIdentifier };
    over: { id: UniqueIdentifier } | null;
  }) {
    if (!over) {
      setDragOverFolderId(null);
      return;
    }

    const activeItem = boardItems.find((i) => i.id === active.id);
    const overItem = boardItems.find((i) => i.id === over.id);

    // Highlight folder if dragging a free doc over it
    if (activeItem?.kind === "doc" && overItem?.kind === "folder") {
      setDragOverFolderId(overItem.folder.id);
    } else {
      setDragOverFolderId(null);
    }
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);
    setDragOverFolderId(null);
    if (!over || active.id === over.id) return;

    const activeItem = boardItems.find((i) => i.id === active.id);
    const overItem = boardItems.find((i) => i.id === over.id);

    if (!activeItem) return;

    // Drop doc onto folder → move doc into that folder
    if (activeItem.kind === "doc" && overItem?.kind === "folder") {
      setBoardItems((prev) => {
        const next = prev
          .filter((i) => i.id !== active.id)
          .map((i) => {
            if (i.kind === "folder" && i.folder.id === overItem.folder.id) {
              return { ...i, docs: [...i.docs, { ...activeItem.doc, folder_id: i.folder.id }] };
            }
            return i;
          });
        saveOrder(next);
        return next;
      });
      return;
    }

    // Drop folder onto folder → nest it (remove from this level, update parent_id)
    if (activeItem.kind === "folder" && overItem?.kind === "folder" && activeItem.id !== overItem.id) {
      setBoardItems((prev) => {
        const next = prev.filter((i) => i.id !== active.id);
        saveOrder(next);
        return next;
      });
      fetch(`/api/folders/${activeItem.folder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parent_id: overItem.folder.id }),
      });
      return;
    }

    // Otherwise reorder board items
    const oldIdx = boardItems.findIndex((i) => i.id === active.id);
    const newIdx = boardItems.findIndex((i) => i.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;

    setBoardItems((prev) => {
      const next = arrayMove(prev, oldIdx, newIdx);
      saveOrder(next);
      return next;
    });
  }

  // ── Folder actions ──────────────────────────────────────────────────────────

  function handleCreateFolder(name: string, color: string | null, icon?: string | null) {
    const position = boardItems.length;
    fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, color, icon: icon ?? null, position, parent_id: contextId ?? null }),
    })
      .then((r) => r.json())
      .then((folder: FolderForBoard) => {
        setBoardItems((prev) => [...prev, { kind: "folder", id: `folder:${folder.id}`, folder, docs: [] }]);
      });
  }

  function handleRenameFolder(folder: FolderForBoard, name: string, color: string | null, icon: string | null) {
    setBoardItems((prev) =>
      prev.map((i) =>
        i.kind === "folder" && i.folder.id === folder.id ? { ...i, folder: { ...i.folder, name, color, icon } } : i,
      ),
    );
    fetch(`/api/folders/${folder.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, color, icon }),
    });
  }

  function handleDeleteFolder(folder: FolderForBoard) {
    if (!confirm(`Delete folder "${folder.name}"? Documents inside will become unsorted.`)) return;
    setBoardItems((prev) => {
      const folderItem = prev.find((i) => i.kind === "folder" && i.folder.id === folder.id) as
        | Extract<BoardItem, { kind: "folder" }>
        | undefined;

      // freed docs return to this context level
      const freedDocs: BoardItem[] = (folderItem?.docs ?? []).map((d) => ({
        kind: "doc" as const,
        id: d.id,
        doc: { ...d, folder_id: contextId ?? null },
      }));

      const next = [...prev.filter((i) => !(i.kind === "folder" && i.folder.id === folder.id)), ...freedDocs];
      saveOrder(next);
      return next;
    });
    fetch(`/api/folders/${folder.id}`, { method: "DELETE" });
  }

  function handleRemoveDocFromFolder(doc: DocForBoard) {
    setBoardItems((prev) => {
      const next = prev
        .map((i) => {
          if (i.kind === "folder") {
            return { ...i, docs: i.docs.filter((d) => d.id !== doc.id) };
          }
          return i;
        })
        .concat([{ kind: "doc" as const, id: doc.id, doc: { ...doc, folder_id: contextId ?? null } }]);
      saveOrder(next);
      return next;
    });
  }

  // ── Card customisation ──────────────────────────────────────────────────────

  function handleCardCustomizeSave(id: string, color: string | null, icon: string | null) {
    setBoardItems((prev) =>
      prev.map((item) => {
        if (item.kind === "doc" && item.doc.id === id) {
          return { ...item, doc: { ...item.doc, card_color: color, card_icon: icon } };
        }
        if (item.kind === "folder") {
          return {
            ...item,
            docs: item.docs.map((d) => (d.id === id ? { ...d, card_color: color, card_icon: icon } : d)),
          };
        }
        return item;
      }),
    );
    fetch(`/api/documents/${id}/customize`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ card_color: color, card_icon: icon }),
    });
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      {isAdmin && (
        <Stack direction="row" justifyContent="flex-end" sx={{ mb: 3 }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => {
              setEditingFolder(null);
              setFolderDialogOpen(true);
            }}
          >
            Add folder
          </Button>
        </Stack>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={boardItems.map((i) => i.id)} strategy={rectSortingStrategy}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", xl: "repeat(3, 1fr)" },
              gap: "20px",
              alignItems: "start",
            }}
          >
            {boardItems.map((item) => {
              if (item.kind === "doc") {
                return (
                  <SortableDocCard
                    key={item.id}
                    doc={item.doc}
                    isAdmin={isAdmin}
                    onCustomize={(doc, anchor) => {
                      setCustomizeDoc(doc);
                      setCustomizeAnchor(anchor);
                    }}
                    href={docHrefBuilder?.(item.doc)}
                  />
                );
              }
              return (
                <SortableFolderCard
                  key={item.id}
                  item={item}
                  isAdmin={isAdmin}
                  expanded={expandedFolders.has(item.folder.id)}
                  isDragTarget={dragOverFolderId === item.folder.id}
                  onToggle={() =>
                    setExpandedFolders((s) => {
                      const next = new Set(s);
                      if (next.has(item.folder.id)) {
                        next.delete(item.folder.id);
                      } else {
                        next.add(item.folder.id);
                      }
                      return next;
                    })
                  }
                  onRename={() => {
                    setEditingFolder(item.folder);
                    setFolderDialogOpen(true);
                  }}
                  onDelete={() => handleDeleteFolder(item.folder)}
                  onCustomizeDoc={(doc, anchor) => {
                    setCustomizeDoc(doc);
                    setCustomizeAnchor(anchor);
                  }}
                  onRemoveDocFromFolder={handleRemoveDocFromFolder}
                  folderHref={folderHrefBuilder?.(item.folder)}
                  docHrefBuilder={docHrefBuilder}
                />
              );
            })}
          </Box>
        </SortableContext>

        <DragOverlay dropAnimation={{ duration: 220, easing: "cubic-bezier(0.18,0.67,0.6,1.22)" }}>
          {activeItem && (
            <Box
              sx={{
                opacity: 0.92,
                transform: "rotate(1.5deg) scale(1.03)",
                boxShadow: "0 24px 48px rgba(0,0,0,0.18)",
                borderRadius: 3,
                pointerEvents: "none",
              }}
            >
              {activeItem.kind === "doc" ? (
                <DocCardContent doc={activeItem.doc} isAdmin={false} href={docHrefBuilder?.(activeItem.doc)} />
              ) : (
                <FolderCardContent
                  folder={activeItem.folder}
                  docs={activeItem.docs}
                  isAdmin={false}
                  expanded={false}
                  isDragTarget={false}
                  onToggle={() => {}}
                  folderHref={folderHrefBuilder?.(activeItem.folder)}
                  docHrefBuilder={docHrefBuilder}
                />
              )}
            </Box>
          )}
        </DragOverlay>
      </DndContext>

      <CardCustomizePopover
        doc={customizeDoc}
        anchorEl={customizeAnchor}
        onClose={() => {
          setCustomizeAnchor(null);
          setCustomizeDoc(null);
        }}
        onSave={handleCardCustomizeSave}
      />

      <FolderDialog
        open={folderDialogOpen}
        initial={
          editingFolder ? { name: editingFolder.name, color: editingFolder.color, icon: editingFolder.icon } : undefined
        }
        onClose={() => setFolderDialogOpen(false)}
        onSave={(name, color, icon) => {
          if (editingFolder) handleRenameFolder(editingFolder, name, color, icon);
          else handleCreateFolder(name, color, icon);
        }}
      />
    </>
  );
}

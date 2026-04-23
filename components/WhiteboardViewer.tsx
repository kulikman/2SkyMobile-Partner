"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Tldraw, type Editor, type TLPageId } from "tldraw";
import "tldraw/tldraw.css";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon from "@mui/icons-material/Edit";

export interface WhiteboardViewerProps {
  snapshot: string;
  docTitle?: string;
  backHref?: string;
  editHref?: string;
}

type PageInfo = { id: string; name: string };

export function WhiteboardViewer({ snapshot, docTitle, backHref, editHref }: WhiteboardViewerProps) {
  const router = useRouter();
  const editorRef = useRef<Editor | null>(null);
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [currentPageId, setCurrentPageId] = useState<string>('');

  const parsedSnapshot = useMemo(() => {
    if (!snapshot) return undefined;
    try { return JSON.parse(snapshot); } catch { return undefined; }
  }, [snapshot]);

  const handleMount = useCallback((editor: Editor) => {
    editorRef.current = editor;
    editor.updateInstanceState({ isReadonly: true });

    function syncPages() {
      const all = editor.getPages();
      setPages(all.map((p) => ({ id: p.id, name: p.name })));
      setCurrentPageId(editor.getCurrentPageId());
    }
    syncPages();
    editor.store.listen(syncPages, { scope: 'document', source: 'all' });
  }, []);

  function switchPage(pageId: string) {
    editorRef.current?.setCurrentPage(pageId as TLPageId);
    setCurrentPageId(pageId);
  }

  if (!parsedSnapshot) {
    return (
      <Box sx={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Typography variant="body2" color="text.secondary">
          This whiteboard is empty or could not be loaded.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ position: "relative", height: "100vh", overflow: "hidden" }}>
      {/* tldraw canvas */}
      <Box sx={{ position: "absolute", inset: 0 }}>
        <Tldraw snapshot={parsedSnapshot} hideUi onMount={handleMount} />
      </Box>

      {/* Top-center: back + title + edit */}
      {(backHref || docTitle || editHref) && (
        <Box sx={{
          position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)",
          zIndex: 500, display: "flex", alignItems: "center", gap: 0.75,
          pointerEvents: "auto", bgcolor: "background.paper",
          border: "1px solid", borderColor: "divider", borderRadius: 2, boxShadow: 3,
          px: 1, py: 0.5,
        }}>
          {backHref && (
            <IconButton size="small" onClick={() => router.push(backHref)}
              sx={{ "&:hover": { bgcolor: "action.hover" } }}>
              <ArrowBackIcon fontSize="small" />
            </IconButton>
          )}
          {docTitle && (
            <Box component="span" sx={{ fontWeight: 600, fontSize: 13, px: 0.5, color: "text.primary", whiteSpace: "nowrap" }}>
              {docTitle}
            </Box>
          )}
          {editHref && (backHref || docTitle) && <Box sx={{ width: "1px", height: 20, bgcolor: "divider", mx: 0.5 }} />}
          {editHref && (
            <Button size="small" variant="outlined" startIcon={<EditIcon fontSize="small" />}
              onClick={() => router.push(editHref)} sx={{ boxShadow: 0 }}>
              Edit
            </Button>
          )}
        </Box>
      )}

      {/* Bottom-center: page switcher (only when > 1 page) */}
      {pages.length > 1 && (
        <Box sx={{
          position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)",
          zIndex: 500, pointerEvents: "auto",
          bgcolor: "background.paper", border: "1px solid", borderColor: "divider",
          borderRadius: 2, boxShadow: 3, px: 1, py: 0.5,
        }}>
          <Stack direction="row" spacing={0.5} alignItems="center">
            {pages.map((page, idx) => (
              <Tooltip key={page.id} title={page.name || `Page ${idx + 1}`}>
                <Button
                  size="small"
                  variant={page.id === currentPageId ? "contained" : "text"}
                  onClick={() => switchPage(page.id)}
                  sx={{ minWidth: 32, px: 1, fontSize: 12 }}
                >
                  {page.name || idx + 1}
                </Button>
              </Tooltip>
            ))}
          </Stack>
        </Box>
      )}
    </Box>
  );
}

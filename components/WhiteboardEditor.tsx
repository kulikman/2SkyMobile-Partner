"use client";

import { useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { Tldraw, Editor } from "tldraw";
import "tldraw/tldraw.css";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";

import CircularProgress from "@mui/material/CircularProgress";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SaveIcon from "@mui/icons-material/Save";

export interface WhiteboardEditorProps {
  initialSnapshot?: string | null;
  onSave: (snapshot: string) => Promise<void>;
  isSaving?: boolean;
  docTitle?: string;
  backHref?: string;
}

export function WhiteboardEditor({
  initialSnapshot,
  onSave,
  isSaving = false,
  docTitle,
  backHref,
}: WhiteboardEditorProps) {
  const editorRef = useRef<Editor | null>(null);
  const router = useRouter();

  const parsedSnapshot = useMemo(() => {
    if (!initialSnapshot) return undefined;
    try {
      return JSON.parse(initialSnapshot);
    } catch {
      return undefined;
    }
  }, [initialSnapshot]);

  const handleMount = useCallback((editor: Editor) => {
    editorRef.current = editor;
  }, []);

  const handleSave = useCallback(async () => {
    if (!editorRef.current) return;
    const snapshot = editorRef.current.getSnapshot();
    await onSave(JSON.stringify(snapshot));
  }, [onSave]);

  return (
    <Box sx={{ position: "relative", flex: 1, overflow: "hidden" }}>
      {/* tldraw fills the entire space */}
      <Box sx={{ position: "absolute", inset: 0 }}>
        <Tldraw snapshot={parsedSnapshot} onMount={handleMount} />
      </Box>

      {/* ── Top-center overlay: back + title + save ── */}
      <Box
        sx={{
          position: "absolute",
          top: 12,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 500,
          display: "flex",
          alignItems: "center",
          gap: 0.75,
          pointerEvents: "auto",
          bgcolor: "background.paper",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
          boxShadow: 3,
          px: 1,
          py: 0.5,
        }}
      >
        {backHref && (
          <IconButton
            size="small"
            onClick={() => router.push(backHref)}
            sx={{ "&:hover": { bgcolor: "action.hover" } }}
          >
            <ArrowBackIcon fontSize="small" />
          </IconButton>
        )}
        {docTitle && (
          <Box
            component="span"
            sx={{ fontWeight: 600, fontSize: 13, px: 0.5, color: "text.primary", whiteSpace: "nowrap" }}
          >
            {docTitle}
          </Box>
        )}
        {(backHref || docTitle) && <Box sx={{ width: "1px", height: 20, bgcolor: "divider", mx: 0.5 }} />}
        <Button
          variant="contained"
          size="small"
          startIcon={isSaving ? <CircularProgress size={14} color="inherit" /> : <SaveIcon fontSize="small" />}
          onClick={handleSave}
          disabled={isSaving}
          sx={{ boxShadow: 0 }}
        >
          {isSaving ? "Saving…" : "Save"}
        </Button>
      </Box>
    </Box>
  );
}

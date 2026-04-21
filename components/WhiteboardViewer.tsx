"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Tldraw } from "tldraw";
import "tldraw/tldraw.css";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon from "@mui/icons-material/Edit";

export interface WhiteboardViewerProps {
  snapshot: string;
  docTitle?: string;
  backHref?: string;
  editHref?: string;
}

export function WhiteboardViewer({ snapshot, docTitle, backHref, editHref }: WhiteboardViewerProps) {
  const router = useRouter();

  const parsedSnapshot = useMemo(() => {
    if (!snapshot) return undefined;
    try {
      return JSON.parse(snapshot);
    } catch {
      return undefined;
    }
  }, [snapshot]);

  if (!parsedSnapshot) {
    return (
      <Box
        sx={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography variant="body2" color="text.secondary">
          This whiteboard is empty or could not be loaded.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ position: "relative", height: "100vh", overflow: "hidden" }}>
      {/* tldraw fills the entire viewport */}
      <Box sx={{ position: "absolute", inset: 0 }}>
        <Tldraw
          snapshot={parsedSnapshot}
          hideUi
          onMount={(editor) => {
            editor.updateInstanceState({ isReadonly: true });
          }}
        />
      </Box>

      {/* ── Top-center overlay: back + title + edit ── */}
      {(backHref || docTitle || editHref) && (
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
              sx={{
                fontWeight: 600,
                fontSize: 13,
                px: 0.5,
                color: "text.primary",
                whiteSpace: "nowrap",
              }}
            >
              {docTitle}
            </Box>
          )}

          {editHref && (backHref || docTitle) && <Box sx={{ width: "1px", height: 20, bgcolor: "divider", mx: 0.5 }} />}

          {editHref && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<EditIcon fontSize="small" />}
              onClick={() => router.push(editHref)}
              sx={{ boxShadow: 0 }}
            >
              Edit
            </Button>
          )}
        </Box>
      )}
    </Box>
  );
}

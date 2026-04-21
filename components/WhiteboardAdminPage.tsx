"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
type WhiteboardEditorProps = {
  initialSnapshot?: string | null;
  onSave: (snapshot: string) => Promise<void>;
  isSaving?: boolean;
  docTitle?: string;
  backHref?: string;
};

const WhiteboardEditor = dynamic<WhiteboardEditorProps>(
  () => import("./WhiteboardEditor").then((m) => ({ default: m.WhiteboardEditor })),
  {
    ssr: false,
    loading: () => (
      <Box
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress size={36} />
      </Box>
    ),
  },
);

export interface WhiteboardAdminPageProps {
  documentId: string;
  slug: string;
  title: string;
  backHref: string;
  initialSnapshot: string | null;
}

export function WhiteboardAdminPage({ documentId, title, slug, backHref, initialSnapshot }: WhiteboardAdminPageProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; severity: "success" | "error"; message: string }>({
    open: false,
    severity: "success",
    message: "",
  });

  const handleSave = useCallback(
    async (snapshot: string) => {
      setIsSaving(true);
      try {
        const res = await fetch(`/api/documents/${documentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, slug, content: snapshot }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? `HTTP ${res.status}`);
        }

        setSnackbar({ open: true, severity: "success", message: "Whiteboard saved" });
      } catch (err) {
        setSnackbar({
          open: true,
          severity: "error",
          message: err instanceof Error ? err.message : "Save failed",
        });
      } finally {
        setIsSaving(false);
      }
    },
    [documentId, title, slug],
  );

  return (
    <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <WhiteboardEditor
        initialSnapshot={initialSnapshot}
        onSave={handleSave}
        isSaving={isSaving}
        docTitle={title}
        backHref={backHref}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

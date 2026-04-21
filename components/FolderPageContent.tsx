"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";

import Breadcrumbs from "@mui/material/Breadcrumbs";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import DashboardIcon from "@mui/icons-material/Dashboard";
import FolderIcon from "@mui/icons-material/Folder";
import ShareIcon from "@mui/icons-material/Share";
import { DocumentBoard, type DocForBoard, type FolderForBoard } from "./DocumentBoard";

type FolderPathItem = {
  id: string;
  name: string;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-");
}

function ExplorerDialog({
  open,
  title,
  label,
  defaultValue = "",
  onClose,
  onSave,
}: {
  open: boolean;
  title: string;
  label: string;
  defaultValue?: string;
  onClose: () => void;
  onSave: (value: string) => void;
}) {
  const [value, setValue] = useState(defaultValue);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          label={label}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && value.trim()) {
              onSave(value.trim());
            }
          }}
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={!value.trim()} onClick={() => onSave(value.trim())}>
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function FolderPageContent({
  initialFolder,
  initialDocs,
  initialSubFolders,
  initialPath,
  isAdmin,
  publicView = false,
}: {
  initialFolder: FolderForBoard;
  initialDocs: DocForBoard[];
  initialSubFolders: FolderForBoard[];
  initialPath: FolderPathItem[];
  isAdmin: boolean;
  publicView?: boolean;
}) {
  const [folder] = useState(initialFolder);
  const [docs, setDocs] = useState(initialDocs);
  const [subFolders, setSubFolders] = useState(initialSubFolders);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createDocOpen, setCreateDocOpen] = useState(false);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const router = useRouter();

  async function handleCreateFolder(name: string) {
    setError(null);
    setMessage(null);

    const response = await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        position: subFolders.length,
        parent_id: folder.id,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Failed to create folder");
      return;
    }

    setSubFolders((current) => [...current, data]);
    setCreateFolderOpen(false);
    setMessage(`Folder "${name}" created.`);
  }

  async function handleCreateDocument(title: string) {
    setError(null);
    setMessage(null);

    const slug = slugify(title) || `doc-${Date.now()}`;
    const response = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        slug,
        content: `# ${title}\n`,
        folderId: folder.id,
        position: docs.length,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Failed to create document");
      return;
    }

    setDocs((current) => [...current, data.document as DocForBoard]);
    setCreateDocOpen(false);
    setMessage(`Document "${title}" created.`);
  }

  return (
    <>
      <Stack spacing={3}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
          <Breadcrumbs>
            <Link
              href={publicView && folder.public_share_token ? `/share/folders/${folder.public_share_token}` : "/"}
              style={{ textDecoration: "none" }}
            >
              {publicView ? "Shared folder" : "Home"}
            </Link>
            {initialPath.map((item) => (
              <Link key={item.id} href={`/folders/${item.id}`} style={{ textDecoration: "none" }}>
                {item.name}
              </Link>
            ))}
            <Typography color="text.primary">{folder.name}</Typography>
          </Breadcrumbs>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {folder.public_share_token && (
              <Link href={`/share/folders/${folder.public_share_token}`} style={{ textDecoration: "none" }}>
                <Button variant="outlined" size="small" startIcon={<ShareIcon />}>
                  Public link
                </Button>
              </Link>
            )}
            {isAdmin && !publicView && (
              <>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<FolderIcon />}
                  onClick={() => setCreateFolderOpen(true)}
                >
                  New folder
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<DashboardIcon />}
                  onClick={() => router.push(`/admin/documents/new-whiteboard`)}
                >
                  New whiteboard
                </Button>
                <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => setCreateDocOpen(true)}>
                  New document
                </Button>
              </>
            )}
          </Stack>
        </Stack>

        {(error || message) && (
          <Stack spacing={1}>
            {error && <Alert severity="error">{error}</Alert>}
            {message && <Alert severity="success">{message}</Alert>}
          </Stack>
        )}

        <DocumentBoard
          initialDocs={docs.map((doc) => ({
            ...doc,
            folder_id: doc.folder_id === folder.id ? null : doc.folder_id,
          }))}
          initialFolders={subFolders}
          isAdmin={isAdmin && !publicView}
          contextId={folder.id}
          docHrefBuilder={(doc) =>
            publicView
              ? doc.public_access_enabled && doc.public_share_token
                ? `/share/${doc.public_share_token}`
                : `/docs/${doc.slug}`
              : `/docs/${doc.slug}`
          }
          folderHrefBuilder={(subFolder) =>
            publicView && subFolder.public_share_token
              ? `/share/folders/${subFolder.public_share_token}`
              : `/folders/${subFolder.id}`
          }
        />
      </Stack>

      <ExplorerDialog
        key={`folder-${folder.id}-${createFolderOpen ? "open" : "closed"}`}
        open={createFolderOpen}
        title="New folder"
        label="Folder name"
        onClose={() => setCreateFolderOpen(false)}
        onSave={handleCreateFolder}
      />

      <ExplorerDialog
        key={`doc-${folder.id}-${docs.length}-${createDocOpen ? "open" : "closed"}`}
        open={createDocOpen}
        title="New document"
        label="Document title"
        onClose={() => setCreateDocOpen(false)}
        onSave={handleCreateDocument}
      />
    </>
  );
}

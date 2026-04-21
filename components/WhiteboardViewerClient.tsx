"use client";

import dynamic from "next/dynamic";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import type { WhiteboardViewerProps } from "./WhiteboardViewer";

const WhiteboardViewer = dynamic<WhiteboardViewerProps>(
  () => import("@/components/WhiteboardViewer").then((m) => ({ default: m.WhiteboardViewer })),
  {
    ssr: false,
    loading: () => (
      <Box
        sx={{
          height: "100vh",
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

export function WhiteboardViewerClient({ snapshot, docTitle, backHref, editHref }: WhiteboardViewerProps) {
  return <WhiteboardViewer snapshot={snapshot} docTitle={docTitle} backHref={backHref} editHref={editHref} />;
}

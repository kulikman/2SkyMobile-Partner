import { notFound } from "next/navigation";
import { WhiteboardViewerClient } from "@/components/WhiteboardViewerClient";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { DocumentWithComments } from "@/components/DocumentWithComments";
import { Navbar } from "@/components/Navbar";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import Button from "@mui/material/Button";
import Link from "next/link";
import Stack from "@mui/material/Stack";
import Chip from "@mui/material/Chip";

import { buildInitialComments } from "@/lib/comment-view-models";
import { getDisplayName } from "@/lib/user-display";
import { withDefaultSharing } from "@/lib/document-sharing";
import { splitDocumentContent } from "@/lib/document-content";
import { DocumentMetaPopover } from "@/components/DocumentMetaPopover";
import { DownloadButtons } from "@/components/DownloadButtons";
import { RoadmapDocRenderer } from "@/components/doc-renderers/RoadmapDocRenderer";
import { TaskDocRenderer } from "@/components/doc-renderers/TaskDocRenderer";
import { TicketDocRenderer } from "@/components/doc-renderers/TicketDocRenderer";
import { MeetingDocRenderer } from "@/components/doc-renderers/MeetingDocRenderer";

export default async function DocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { data: baseDoc } = await supabase
    .from("documents")
    .select("id, slug, title, content, doc_type, metadata")
    .eq("slug", slug)
    .single();

  if (!baseDoc) notFound();

  const { data: sharing } = await supabase
    .from("documents")
    .select("description, image, public_access_enabled, public_comments_visible, anonymous_comments_enabled, public_share_token")
    .eq("id", baseDoc.id)
    .single();

  const doc = withDefaultSharing(baseDoc, sharing);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const docType: string = (baseDoc as any).doc_type ?? "md";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const docMetadata: Record<string, unknown> = (baseDoc as any).metadata ?? {};
  const isWhiteboard = docType === "whiteboard";
  const isStructured = ["roadmap", "task", "ticket", "meeting"].includes(docType);
  const isAdmin = user?.user_metadata?.role === "admin";

  if (isWhiteboard) {
    return (
      <Box sx={{ height: "100vh", overflow: "hidden" }}>
        <WhiteboardViewerClient
          snapshot={doc.content ?? "{}"}
          docTitle={doc.title}
          backHref="/"
          editHref={isAdmin ? `/admin/documents/${slug}` : undefined}
        />
      </Box>
    );
  }

  const parsed = splitDocumentContent(doc.content);

  // Only fetch comments for markdown docs
  let initialComments: Awaited<ReturnType<typeof buildInitialComments>> = [];
  let currentUser: { id: string; email: string; name: string } | null = null;

  if (!isStructured) {
    const { data: rawComments } = await supabase
      .from("comments").select("*")
      .eq("document_id", doc.id).order("created_at", { ascending: true });

    const adminClient = await createAdminClient();
    const userDirectory = await adminClient.auth.admin.listUsers({ perPage: 1000 });
    const users = userDirectory.data.users ?? [];

    initialComments = buildInitialComments(
      rawComments ?? [],
      users.map((u) => ({ id: u.id, email: u.email, user_metadata: u.user_metadata })),
    );

    currentUser = user
      ? {
          id: user.id,
          email: user.email ?? "",
          name: getDisplayName({ email: user.email, metadata: user.user_metadata ?? null }),
        }
      : null;
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <Navbar isAdmin={isAdmin} userId={user?.id} />
      <Container maxWidth="lg" sx={{ py: 5 }}>
        <Box sx={{
          display: "flex", justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          gap: 2, mb: 4, flexDirection: { xs: "column", sm: "row" },
        }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h4" fontWeight={700}>{doc.title}</Typography>
            {!isStructured && <DocumentMetaPopover metadata={parsed.metadata} />}
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            {!isStructured && <DownloadButtons title={doc.title} content={doc.content} slug={slug} />}
            {doc.public_access_enabled && (
              <Link href={`/share/${doc.public_share_token}`} style={{ textDecoration: "none" }}>
                <Button variant="outlined" size="small">Open public link</Button>
              </Link>
            )}
            {doc.public_access_enabled && (
              <Chip size="small"
                label={doc.public_comments_visible ? "Public comments on" : "Public comments off"}
                variant="outlined" />
            )}
            {isAdmin && (
              <Link href={`/admin/documents/${slug}`} style={{ textDecoration: "none" }}>
                <Button variant="outlined" size="small">Edit document</Button>
              </Link>
            )}
          </Stack>
        </Box>

        <Divider sx={{ mb: 4 }} />

        {(doc.image || doc.description) && (
          <Box sx={{ mb: 4 }}>
            {doc.image && (
              <Box component="img" src={doc.image} alt={doc.title}
                sx={{ width: "100%", maxHeight: 420, objectFit: "cover", borderRadius: 3,
                  mb: doc.description ? 2 : 3, border: "1px solid rgba(12,123,220,0.12)" }} />
            )}
            {doc.description && (
              <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 860, lineHeight: 1.6 }}>
                {doc.description}
              </Typography>
            )}
          </Box>
        )}

        {/* Structured doc renderers */}
        {docType === "roadmap" && <RoadmapDocRenderer metadata={docMetadata as Parameters<typeof RoadmapDocRenderer>[0]["metadata"]} />}
        {docType === "task"    && <TaskDocRenderer    metadata={docMetadata as Parameters<typeof TaskDocRenderer>[0]["metadata"]}    bodyHtml={parsed.body} />}
        {docType === "ticket"  && <TicketDocRenderer  metadata={docMetadata as Parameters<typeof TicketDocRenderer>[0]["metadata"]}  body={parsed.body} />}
        {docType === "meeting" && <MeetingDocRenderer metadata={docMetadata as Parameters<typeof MeetingDocRenderer>[0]["metadata"]} body={parsed.body} />}

        {/* Markdown with comments */}
        {!isStructured && user && (
          <Box sx={{ position: "relative" }}>
            <DocumentWithComments
              documentId={doc.id} content={parsed.body}
              currentUser={currentUser} initialComments={initialComments}
            />
          </Box>
        )}
        {!isStructured && !user && (
          <Typography variant="body1" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.8 }}>
            {parsed.body}
          </Typography>
        )}
      </Container>
    </Box>
  );
}

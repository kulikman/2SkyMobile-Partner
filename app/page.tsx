import { createAdminClient, createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import { Navbar } from "@/components/Navbar";
import { ProjectDashboard } from "@/components/ProjectDashboard";
import type { ProjectForDashboard } from "@/components/ProjectDashboard";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const isAdmin = user.user_metadata?.role === "admin";

  // Fetch folders (projects) - RLS handles access control
  // Admin sees all, viewers see only projects they're members of
  const { data: rawFolders } = await supabase
    .from("folders")
    .select("*")
    .is("parent_id", null)
    .order("position", { ascending: true });

  const projects: ProjectForDashboard[] = (rawFolders ?? []).map((f) => ({
    id: f.id,
    name: f.name,
    color: f.color ?? null,
    icon: f.icon ?? null,
    status: f.status ?? "in_discussion",
    progress: f.progress ?? 0,
    client_name: f.client_name ?? null,
    started_at: f.started_at ?? null,
    deadline_at: f.deadline_at ?? null,
    company_id: f.company_id ?? null,
  }));

  let companies: { id: string; name: string }[] = [];
  if (isAdmin) {
    const adminClient = await createAdminClient();
    const { data: companiesData } = await adminClient.from("companies").select("id, name").order("name");
    companies = companiesData ?? [];
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <Navbar isAdmin={isAdmin} userId={user.id} />
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Typography variant="h4" fontWeight={800} mb={3}>
          Projects
        </Typography>

        <ProjectDashboard projects={projects} isAdmin={isAdmin} companies={companies} />
      </Container>
    </Box>
  );
}

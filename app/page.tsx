import { createAdminClient, createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import { Navbar } from "@/components/Navbar";
import { ProjectDashboard } from "@/components/ProjectDashboard";
import type { ProjectForDashboard, CompanyForDashboard } from "@/components/ProjectDashboard";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const isAdmin = user.user_metadata?.role === "admin";
  const adminClient = await createAdminClient();

  // Always use adminClient for fetching to bypass RLS reliably
  const { data: rawFolders } = await adminClient
    .from("folders")
    .select("id, name, slug, color, icon, status, progress, client_name, started_at, deadline_at, company_id, partner_visible")
    .is("parent_id", null)
    .order("position", { ascending: true });

  const { data: companiesData } = await adminClient
    .from("companies")
    .select("id, name, slug, logo_url")
    .order("name");

  const companies: CompanyForDashboard[] = (companiesData ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    slug: (c as any).slug ?? null,
    color: null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    logo_url: (c as any).logo_url ?? null,
  }));

  const companySlugById = new Map(companies.map((c) => [c.id, c.slug] as const));

  // For non-admins: filter to only companies/projects they're members of
  const visibleFolders = isAdmin
    ? (rawFolders ?? [])
    : await (async () => {
        const { data: memberships } = await adminClient
          .from("company_members")
          .select("company_id")
          .eq("user_id", user.id);
        const memberCompanyIds = new Set((memberships ?? []).map((m) => m.company_id));
        return (rawFolders ?? []).filter(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (f) => f.company_id && memberCompanyIds.has(f.company_id) && (f as any).partner_visible !== false,
        );
      })();

  const projects: ProjectForDashboard[] = visibleFolders.map((f) => {
    const companyId = f.company_id ?? null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const folderSlug = (f as any).slug ?? null;
    const companySlug = companyId ? (companySlugById.get(companyId) ?? null) : null;
    const href =
      companySlug && folderSlug
        ? `/${companySlug}/${folderSlug}`
        : `/projects/${f.id}`;

    return {
      id: f.id,
      href,
      name: f.name,
      color: f.color ?? null,
      icon: f.icon ?? null,
      status: f.status ?? "in_discussion",
      progress: f.progress ?? 0,
      client_name: f.client_name ?? null,
      started_at: f.started_at ?? null,
      deadline_at: f.deadline_at ?? null,
      company_id: companyId,
    };
  });

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <Navbar isAdmin={isAdmin} userId={user.id} />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <ProjectDashboard projects={projects} isAdmin={isAdmin} companies={companies} />
      </Container>
    </Box>
  );
}

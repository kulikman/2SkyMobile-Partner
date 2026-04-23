import { redirect, notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";

export default async function FolderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const adminClient = await createAdminClient();

  const { data: folder } = await adminClient
    .from("folders")
    .select("slug, company_id")
    .eq("id", id)
    .single();

  if (!folder) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const folderSlug = (folder as any).slug ?? null;
  if (folderSlug && folder.company_id) {
    const { data: company } = await adminClient
      .from("companies")
      .select("slug")
      .eq("id", folder.company_id)
      .single();
    if (company?.slug) {
      redirect(`/${company.slug}/${folderSlug}`);
    }
  }

  redirect(`/projects/${id}`);
}

import { redirect } from 'next/navigation';

export default async function LegacySpacePathPage({
  params,
}: {
  params: Promise<{ company: string; path: string[] }>;
}) {
  const { company, path } = await params;
  redirect(`/${company}/${path.join('/')}`);
}

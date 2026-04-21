import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { splitDocumentContent } from '@/lib/document-content';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { PrintButton } from '@/components/PrintButton';

export default async function PrintPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: doc } = await supabase
    .from('documents')
    .select('title, content')
    .eq('slug', slug)
    .single();

  if (!doc) notFound();

  const { body } = splitDocumentContent(doc.content);

  return (
    <>
      <style>{`
        @media screen {
          body { max-width: 800px; margin: 0 auto; padding: 32px 24px; font-family: system-ui, sans-serif; }
        }
        @media print {
          body { margin: 0; padding: 0; }
        }
        h1 { font-size: 2rem; margin-bottom: 0.25rem; }
        .print-btn {
          display: inline-block;
          margin-bottom: 24px;
          padding: 6px 16px;
          border: 1px solid #aaa;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          background: #f5f5f5;
        }
        @media print { .print-btn { display: none; } }
      `}</style>

      <h1>{doc.title}</h1>
      <PrintButton />

      <MarkdownRenderer content={body} />
    </>
  );
}

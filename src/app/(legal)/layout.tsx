import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-3xl px-4 py-12">
        <Link
          href="/store"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Bransion
        </Link>
        <article className="prose prose-neutral dark:prose-invert max-w-none
          prose-headings:font-heading prose-headings:tracking-tight
          prose-h1:text-3xl prose-h1:font-bold prose-h1:mb-2
          prose-h2:text-xl prose-h2:font-semibold prose-h2:mt-10 prose-h2:mb-3
          prose-h3:text-base prose-h3:font-semibold prose-h3:mt-6 prose-h3:mb-2
          prose-p:text-sm prose-p:leading-relaxed prose-p:text-muted-foreground
          prose-li:text-sm prose-li:leading-relaxed prose-li:text-muted-foreground
          prose-strong:text-foreground
          prose-a:text-foreground prose-a:underline
          prose-table:text-sm
          prose-th:text-foreground prose-th:font-semibold
          prose-td:text-muted-foreground
        ">
          {children}
        </article>
      </div>
    </div>
  );
}
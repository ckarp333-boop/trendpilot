import Link from "next/link";
import { Suspense } from "react";

async function TrendHeading({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <h1 className="text-2xl font-semibold">Trend {id}</h1>;
}

export default function TrendPage({ params }: PageProps<"/trends/[id]">) {
  return (
    <section className="space-y-2">
      <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
        &larr; Back to dashboard
      </Link>
      <Suspense fallback={<h1 className="text-2xl font-semibold">Loading trend…</h1>}>
        <TrendHeading params={params} />
      </Suspense>
      <p className="text-muted-foreground">
        Post concepts for this trend will be generated here.
      </p>
    </section>
  );
}

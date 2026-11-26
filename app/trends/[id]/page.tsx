import { Suspense } from "react";
import { TrendDetail } from "@/components/trend-detail";

async function TrendFromParams({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TrendDetail id={decodeURIComponent(id)} />;
}

export default function TrendPage({ params }: PageProps<"/trends/[id]">) {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Loading trend…</p>}>
      <TrendFromParams params={params} />
    </Suspense>
  );
}

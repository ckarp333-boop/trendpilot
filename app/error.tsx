"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="space-y-4 py-8 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="text-muted-foreground">
        This page hit an unexpected problem. Your profile and calendar are saved in this browser and are safe.
      </p>
      <div className="flex justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <Link href="/" className="inline-flex h-8 items-center rounded-lg border px-2.5 text-sm">
          Back to dashboard
        </Link>
      </div>
    </section>
  );
}

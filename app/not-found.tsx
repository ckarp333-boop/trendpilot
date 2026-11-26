import Link from "next/link";

export default function NotFound() {
  return (
    <section className="space-y-4 py-8 text-center">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="text-muted-foreground">That page doesn&apos;t exist.</p>
      <Link href="/" className="underline underline-offset-2">
        Back to the dashboard
      </Link>
    </section>
  );
}

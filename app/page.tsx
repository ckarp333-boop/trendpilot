import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground">
          Safe trending YouTube topics for Rise &amp; Grind Bakery, ranked by fit.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Trends coming soon</CardTitle>
          <CardDescription>
            The trend list loads from the saved YouTube snapshot in a later milestone.
          </CardDescription>
        </CardHeader>
      </Card>
    </section>
  );
}

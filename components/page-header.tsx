import type { LucideIcon } from "lucide-react";

export function PageHeader({
  eyebrow,
  icon: Icon,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  icon?: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0 space-y-1.5">
        {eyebrow && (
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-primary">
            {Icon && <Icon aria-hidden className="size-3.5" />}
            {eyebrow}
          </p>
        )}
        <h1 className="text-3xl font-semibold sm:text-4xl">{title}</h1>
        {description && <p className="max-w-2xl text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

import { cn } from "../lib/cn";

export function StatTile({ label, value, icon: Icon, tone = "primary", sub }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-start justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        {Icon && (
          <span
            className={cn(
              "grid h-8 w-8 place-items-center rounded-lg",
              tone === "primary" && "bg-primary-soft text-primary",
              tone === "success" && "bg-success-soft text-success",
              tone === "warning" && "bg-warning-soft text-warning",
              tone === "danger" && "bg-danger-soft text-danger",
              tone === "info" && "bg-info-soft text-info",
            )}
          >
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
      <p className="mt-3 font-display text-3xl">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

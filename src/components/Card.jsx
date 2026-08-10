import { cn } from "../lib/cn";

export function Card({ title, action, className, children }) {
  return (
    <div className={cn("rounded-2xl border border-border bg-surface", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          {title && <h3 className="font-display text-base font-semibold">{title}</h3>}
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

import { cn } from "../lib/cn";

export function Button({ variant = "default", size = "default", className, ...props }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition disabled:pointer-events-none disabled:opacity-50",
        variant === "default" && "bg-primary text-primary-foreground hover:opacity-90",
        variant === "outline" && "border border-border bg-surface hover:border-foreground/30",
        variant === "ghost" && "bg-transparent hover:bg-surface-muted",
        variant === "danger" && "bg-danger text-white hover:opacity-90",
        size === "default" && "h-10 px-4 text-sm",
        size === "sm" && "h-8 px-3 text-xs",
        size === "lg" && "h-11 px-5 text-sm",
        size === "icon" && "h-9 w-9",
        className,
      )}
      {...props}
    />
  );
}

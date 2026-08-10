import { cn } from "../lib/cn";

const STATUS_TONE = {
  Present: "success",
  Approved: "success",
  Done: "success",
  Active: "success",
  WFH: "info",
  Onboarding: "info",
  "In Progress": "info",
  Pending: "warning",
  "Half Day": "warning",
  Rejected: "danger",
  Absent: "danger",
  Leave: "neutral",
};

const TONE_CLASSES = {
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
  neutral: "bg-surface-muted text-muted-foreground",
};

export function Badge({ children, tone, color, className }) {
  if (color) {
    return (
      <span
        className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", className)}
        style={{ backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`, color }}
      >
        {children}
      </span>
    );
  }

  const resolvedTone = tone ?? STATUS_TONE[children] ?? "neutral";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        TONE_CLASSES[resolvedTone],
        className,
      )}
    >
      {children}
    </span>
  );
}

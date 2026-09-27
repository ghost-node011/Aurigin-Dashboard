import { ChevronsUp, ChevronUp, Equal, ChevronDown, ChevronsDown } from "lucide-react";
import { TYPE_META, PRIORITY_COLOR } from "../../data/work";
import { cn } from "../../lib/cn";

/** The coloured square Jira uses for an issue's type. */
export function TypeIcon({ type, className }) {
  const meta = TYPE_META[type] ?? TYPE_META.Task;
  const Icon = meta.icon;
  return (
    <span
      title={type}
      className={cn("grid h-4 w-4 shrink-0 place-items-center rounded-[4px] text-white", className)}
      style={{ backgroundColor: meta.color }}
    >
      <Icon className="h-3 w-3" strokeWidth={2.5} />
    </span>
  );
}

const PRIORITY_ICON = { Highest: ChevronsUp, High: ChevronUp, Medium: Equal, Low: ChevronDown, Lowest: ChevronsDown };

export function PriorityIcon({ priority, className }) {
  const Icon = PRIORITY_ICON[priority] ?? Equal;
  return <Icon title={priority} className={cn("h-4 w-4 shrink-0", className)} style={{ color: PRIORITY_COLOR[priority] }} strokeWidth={2.5} />;
}

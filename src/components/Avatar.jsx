import { cn } from "../lib/cn";

function initials(name) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const SIZES = {
  sm: "h-7 w-7 text-[11px]",
  default: "h-9 w-9 text-xs",
  lg: "h-14 w-14 text-lg",
  xl: "h-24 w-24 text-3xl",
};

export function Avatar({ employee, size = "default", className }) {
  if (!employee) return null;
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-semibold text-white",
        SIZES[size],
        className,
      )}
      style={{ backgroundColor: employee.color }}
      title={employee.name}
    >
      {initials(employee.name)}
    </span>
  );
}

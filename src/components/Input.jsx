import { cn } from "../lib/cn";

const baseClass =
  "rounded-lg border border-border bg-surface px-3.5 text-sm text-foreground outline-none transition focus:border-primary";

// `cn` only joins classes, so a caller's `w-40` or `py-1` would lose to the
// defaults depending on stylesheet order. Apply a default only when the
// caller didn't set that property; a fixed height (h-8, h-9) also implies
// tighter vertical padding so the text isn't clipped.
function withDefaults(className = "") {
  const has = (re) => re.test(className);
  return cn(
    baseClass,
    !has(/(^|\s)w-/) && "w-full",
    !has(/(^|\s)py-/) && (has(/(^|\s)h-\d/) ? "py-1" : "py-2.5"),
    className,
  );
}

export function Input({ className, ...props }) {
  return <input className={withDefaults(className)} {...props} />;
}

export function Textarea({ className, ...props }) {
  return <textarea className={withDefaults(cn("resize-none", className))} {...props} />;
}

export function Select({ className, children, ...props }) {
  return (
    <select className={withDefaults(className)} {...props}>
      {children}
    </select>
  );
}

export function Field({ label, required, className, children }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="text-sm font-medium">
        {label}
        {required && <span className="ml-1 text-danger">*</span>}
      </label>
      {children}
    </div>
  );
}

import { cn } from "../lib/cn";

const baseClass =
  "w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-primary";

export function Input({ className, ...props }) {
  return <input className={cn(baseClass, className)} {...props} />;
}

export function Textarea({ className, ...props }) {
  return <textarea className={cn(baseClass, "resize-none", className)} {...props} />;
}

export function Select({ className, children, ...props }) {
  return (
    <select className={cn(baseClass, className)} {...props}>
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

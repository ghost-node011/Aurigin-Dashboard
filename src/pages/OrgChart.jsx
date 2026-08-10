import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useHRData } from "../context/HRDataContext";
import { Avatar } from "../components/Avatar";
import { Badge } from "../components/Badge";

export default function OrgChart() {
  const { employees, getDirectReports } = useHRData();
  const roots = employees.filter((e) => e.managerId === null);

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Org Chart</h1>
      <p className="mt-1 text-sm text-muted-foreground">Who reports to whom, at a glance.</p>

      <div className="mt-8 space-y-6 rounded-2xl border border-border bg-surface p-6">
        {roots.map((root) => (
          <OrgNode key={root.id} employee={root} depth={0} getDirectReports={getDirectReports} />
        ))}
      </div>
    </div>
  );
}

function OrgNode({ employee, depth, getDirectReports }) {
  const reports = getDirectReports(employee.id);
  const [open, setOpen] = useState(true);

  return (
    <div>
      <div className="flex items-center gap-2 py-1.5">
        {reports.length > 0 ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="grid h-5 w-5 shrink-0 place-items-center rounded text-muted-foreground hover:bg-surface-muted"
          >
            {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        ) : (
          <span className="w-5 shrink-0" />
        )}
        <Link
          to={`/directory/${employee.id}`}
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 py-1.5 transition hover:bg-surface-muted"
        >
          <Avatar employee={employee} size="sm" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{employee.name}</span>
            <span className="block truncate text-xs text-muted-foreground">{employee.title}</span>
          </span>
          {reports.length > 0 && (
            <Badge tone="neutral" className="ml-auto shrink-0">
              {reports.length} report{reports.length > 1 ? "s" : ""}
            </Badge>
          )}
        </Link>
      </div>

      {open && reports.length > 0 && (
        <div className="ml-2.5 space-y-0.5 border-l border-border pl-4">
          {reports.map((r) => (
            <OrgNode key={r.id} employee={r} depth={depth + 1} getDirectReports={getDirectReports} />
          ))}
        </div>
      )}
    </div>
  );
}

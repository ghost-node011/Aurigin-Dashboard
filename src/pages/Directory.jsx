import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, MapPin } from "lucide-react";
import { useHRData } from "../context/HRDataContext";
import { DEPARTMENTS } from "../data/departments";
import { Avatar } from "../components/Avatar";
import { Badge } from "../components/Badge";
import { Input } from "../components/Input";
import { cn } from "../lib/cn";

export default function Directory() {
  const { employees } = useHRData();
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("all");

  const filtered = useMemo(() => {
    return employees.filter((e) => {
      const matchesDept = department === "all" || e.department === department;
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q || e.name.toLowerCase().includes(q) || e.title.toLowerCase().includes(q) || e.email.toLowerCase().includes(q);
      return matchesDept && matchesQuery;
    });
  }, [employees, query, department]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Directory</h1>
          <p className="mt-1 text-sm text-muted-foreground">{employees.length} people at Aurigin Media</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, title, email…"
              className="w-64 pl-9"
            />
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setDepartment("all")}
          className={cn(
            "rounded-full border px-3.5 py-1.5 text-sm transition",
            department === "all" ? "border-primary bg-primary-soft text-primary" : "border-border hover:border-foreground/30",
          )}
        >
          All
        </button>
        {DEPARTMENTS.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => setDepartment(d.id)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm transition",
              department === d.id ? "border-primary bg-primary-soft text-primary" : "border-border hover:border-foreground/30",
            )}
          >
            {d.name}
          </button>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((employee) => (
          <Link
            key={employee.id}
            to={`/directory/${employee.id}`}
            className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 transition hover:border-primary/40 hover:shadow-sm"
          >
            <Avatar employee={employee} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate font-medium">{employee.name}</p>
                {employee.status === "Onboarding" && <Badge tone="info">New</Badge>}
              </div>
              <p className="truncate text-sm text-muted-foreground">{employee.title}</p>
              <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" /> {employee.location}
              </p>
            </div>
          </Link>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full py-12 text-center text-sm text-muted-foreground">
            No one matches that search.
          </p>
        )}
      </div>
    </div>
  );
}

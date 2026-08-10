import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useHRData } from "../context/HRDataContext";
import { DEMO_ACCOUNTS } from "../data/employees";
import { Avatar } from "../components/Avatar";
import { Badge } from "../components/Badge";
import { ThemeToggle } from "../components/ThemeToggle";

export default function Login() {
  const { login } = useAuth();
  const { employees, getEmployee } = useHRData();
  const navigate = useNavigate();
  const [showAll, setShowAll] = useState(false);

  function signInAs(employeeId) {
    login(employeeId);
    navigate("/");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="absolute right-6 top-6">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-2xl">
        <div className="mb-10 flex flex-col items-center text-center">
          <img src="/logo.png" alt="Aurigin Media" className="h-14 w-14 rounded-xl object-cover" />
          <h1 className="mt-4 font-display text-3xl font-semibold">Aurigin People</h1>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            The internal HR portal for Aurigin Media. This is a demo build — pick an account below
            to sign in as that role, no password needed.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {DEMO_ACCOUNTS.map(({ id, blurb }) => {
            const employee = getEmployee(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => signInAs(id)}
                className="flex flex-col items-start gap-3 rounded-2xl border border-border bg-surface p-5 text-left transition hover:border-primary/50 hover:shadow-sm"
              >
                <div className="flex w-full items-center justify-between">
                  <Avatar employee={employee} size="lg" />
                  <Badge tone="neutral" className="capitalize">
                    {employee.role}
                  </Badge>
                </div>
                <div>
                  <p className="font-display text-lg font-semibold">{employee.name}</p>
                  <p className="text-xs text-muted-foreground">{employee.title}</p>
                </div>
                <p className="text-xs text-muted-foreground">{blurb}</p>
              </button>
            );
          })}
        </div>

        <div className="mt-6">
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="mx-auto flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <ChevronDown className={`h-3.5 w-3.5 transition ${showAll ? "rotate-180" : ""}`} />
            Sign in as someone else
          </button>
          {showAll && (
            <div className="mt-4 max-h-64 overflow-y-auto rounded-xl border border-border bg-surface">
              {employees.map((employee) => (
                <button
                  key={employee.id}
                  type="button"
                  onClick={() => signInAs(employee.id)}
                  className="flex w-full items-center gap-3 border-b border-border px-4 py-2.5 text-left last:border-b-0 hover:bg-surface-muted"
                >
                  <Avatar employee={employee} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{employee.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{employee.title}</p>
                  </div>
                  <Badge tone="neutral" className="capitalize">
                    {employee.role}
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

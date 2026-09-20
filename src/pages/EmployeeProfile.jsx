import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft, Mail, Phone, MapPin, Briefcase, CalendarPlus, Award } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useHRData } from "../context/HRDataContext";
import { DEPARTMENTS } from "../data/departments";
import { LEAVE_TYPES } from "../data/leave";
import { computeOnboardingProgress } from "../data/onboarding";
import { formatDate } from "../lib/date";
import { Avatar } from "../components/Avatar";
import { Badge } from "../components/Badge";
import { Card } from "../components/Card";
import { ProbationCard } from "../components/ProbationCard";

function tenure(dateOfJoining) {
  const months = Math.max(
    0,
    Math.round((Date.now() - new Date(dateOfJoining).getTime()) / (1000 * 60 * 60 * 24 * 30.44)),
  );
  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  if (years === 0) return `${remMonths} mo`;
  return remMonths === 0 ? `${years} yr` : `${years} yr ${remMonths} mo`;
}

export default function EmployeeProfile() {
  const { id } = useParams();
  const { currentUser } = useAuth();
  const data = useHRData();
  const employee = data.getEmployee(id);

  if (!employee) return <Navigate to="/directory" replace />;

  const manager = employee.managerId ? data.getEmployee(employee.managerId) : null;
  const reports = data.getDirectReports(employee.id);
  const department = DEPARTMENTS.find((d) => d.id === employee.department);

  const canViewSensitive =
    currentUser.id === employee.id ||
    ["admin", "hr"].includes(currentUser.role) ||
    currentUser.id === employee.managerId;

  const balances = data.leaveBalances[employee.id];
  const recentAttendance = data.attendanceRecords
    .filter((r) => r.employeeId === employee.id)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);
  const onboardingPlan = data.onboardingPlans[employee.id];

  return (
    <div className="space-y-6">
      <Link to="/directory" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to directory
      </Link>

      <div className="flex flex-col items-start gap-5 rounded-2xl border border-border bg-surface p-6 sm:flex-row sm:items-center">
        <Avatar employee={employee} size="xl" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-semibold">{employee.name}</h1>
            <Badge>{employee.status}</Badge>
            {employee.employmentStatus === "Probation" && <Badge>On probation</Badge>}
          </div>
          <p className="mt-1 text-muted-foreground">{employee.title}</p>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" /> {employee.email}
            </span>
            <span className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" /> {employee.phone}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" /> {employee.location}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Employment details">
            <dl className="grid grid-cols-2 gap-y-4 text-sm sm:grid-cols-3">
              <Detail label="Department" value={department?.name} icon={Briefcase} />
              <Detail label="Employment type" value={employee.employmentType} />
              <Detail label="Date of joining" value={formatDate(employee.dateOfJoining)} icon={CalendarPlus} />
              <Detail label="Tenure" value={tenure(employee.dateOfJoining)} />
              <Detail
                label="Reports to"
                value={
                  manager ? (
                    <Link to={`/directory/${manager.id}`} className="text-primary hover:underline">
                      {manager.name}
                    </Link>
                  ) : (
                    "—"
                  )
                }
              />
              <Detail label="Direct reports" value={reports.length || "—"} />
            </dl>
          </Card>

          {reports.length > 0 && (
            <Card title={`Direct reports (${reports.length})`}>
              <div className="grid gap-3 sm:grid-cols-2">
                {reports.map((r) => (
                  <Link
                    key={r.id}
                    to={`/directory/${r.id}`}
                    className="flex items-center gap-3 rounded-lg border border-border p-3 transition hover:border-primary/40"
                  >
                    <Avatar employee={r} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{r.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{r.title}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </Card>
          )}

          {canViewSensitive && recentAttendance.length > 0 && (
            <Card title="Recent attendance">
              <div className="space-y-3">
                {recentAttendance.map((r) => (
                  <div key={r.date} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{formatDate(r.date, { weekday: "short", month: "short", day: "numeric" })}</span>
                    <span className="text-muted-foreground">
                      {r.checkIn ? `${r.checkIn} – ${r.checkOut ?? "…"}` : "—"}
                    </span>
                    <Badge>{r.status}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {canViewSensitive && (
            <ProbationCard employee={employee} canManage={["admin", "hr"].includes(currentUser.role)} />
          )}

          {canViewSensitive && (
            <Card title="Leave balance">
              <div className="space-y-3">
                {LEAVE_TYPES.map((t) => {
                  const b = balances[t.id];
                  const left = b.quota - b.used;
                  return (
                    <div key={t.id}>
                      <div className="flex items-center justify-between text-sm">
                        <span>{t.name}</span>
                        <span className="text-muted-foreground">
                          {left} / {b.quota} left
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${(b.used / b.quota) * 100}%`, backgroundColor: t.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {canViewSensitive && onboardingPlan && (
            <Card title="Onboarding progress">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Overall</span>
                <span className="font-medium">{computeOnboardingProgress(onboardingPlan)}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${computeOnboardingProgress(onboardingPlan)}%` }}
                />
              </div>
              <Link to="/onboarding" className="mt-3 inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
                <Award className="h-3.5 w-3.5" /> View full checklist
              </Link>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value, icon: Icon }) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {Icon && <Icon className="h-3 w-3" />} {label}
      </dt>
      <dd className="mt-1 font-medium">{value ?? "—"}</dd>
    </div>
  );
}

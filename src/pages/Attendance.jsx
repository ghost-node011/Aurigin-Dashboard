import { useMemo, useState } from "react";
import { Home, Plus } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useHRData } from "../context/HRDataContext";
import { todayISO, formatDate, formatMonthDay, getWeekRange, tomorrowISO } from "../lib/date";
import { WFH_WEEKLY_QUOTA, getWeeklyWfhDates } from "../data/wfh";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Avatar } from "../components/Avatar";
import { Button } from "../components/Button";
import { Modal } from "../components/Modal";
import { Field, Input, Textarea } from "../components/Input";
import { AttendanceWidget } from "../components/AttendanceWidget";

const SUMMARY_STATUSES = ["Present", "WFH", "Half Day", "Absent", "Leave"];

export default function Attendance() {
  const { currentUser } = useAuth();
  const data = useHRData();
  const today = todayISO();

  const myRecords = data.attendanceRecords
    .filter((r) => r.employeeId === currentUser.id)
    .sort((a, b) => b.date.localeCompare(a.date));
  const myTodayRecord = myRecords.find((r) => r.date === today);

  const monthPrefix = today.slice(0, 7);
  const summary = useMemo(() => {
    const thisMonth = myRecords.filter((r) => r.date.startsWith(monthPrefix));
    return Object.fromEntries(SUMMARY_STATUSES.map((s) => [s, thisMonth.filter((r) => r.status === s).length]));
  }, [myRecords, monthPrefix]);

  const reports = data.getAllReports(currentUser.id);
  const isPeopleManager = ["manager", "hr", "admin"].includes(currentUser.role) && reports.length > 0;
  const isOrgWideApprover = ["hr", "admin"].includes(currentUser.role);
  const canApproveWfh = ["manager", "hr", "admin"].includes(currentUser.role) && (reports.length > 0 || isOrgWideApprover);
  const [teamDate, setTeamDate] = useState(today);

  const weekRange = getWeekRange(today);
  const myWfhDatesThisWeek = getWeeklyWfhDates(data.wfhRequests, data.attendanceRecords, currentUser.id, weekRange.start, weekRange.end);
  const wfhUsed = myWfhDatesThisWeek.size;

  const myWfhRequests = data.wfhRequests
    .filter((r) => r.employeeId === currentUser.id)
    .sort((a, b) => b.appliedOn.localeCompare(a.appliedOn));

  const pendingWfhApprovals = data.wfhRequests
    .filter((r) => r.status === "Pending" && (isOrgWideApprover || r.approverId === currentUser.id))
    .sort((a, b) => a.appliedOn.localeCompare(b.appliedOn));

  const [wfhApplyOpen, setWfhApplyOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Attendance</h1>
        <p className="mt-1 text-sm text-muted-foreground">Track check-ins and time off the clock.</p>
      </div>

      <Card title="Today">
        <AttendanceWidget
          record={myTodayRecord}
          onCheckIn={() => data.checkIn(currentUser.id)}
          onCheckOut={() => data.checkOut(currentUser.id)}
          onWFH={() => data.markWFH(currentUser.id)}
        />
      </Card>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {SUMMARY_STATUSES.map((s) => (
          <div key={s} className="rounded-xl border border-border bg-surface p-4 text-center">
            <p className="font-display text-2xl">{summary[s]}</p>
            <p className="mt-1 text-xs text-muted-foreground">{s} this month</p>
          </div>
        ))}
      </div>

      <Card title="My history">
        <div className="space-y-2">
          {myRecords.slice(0, 12).map((r) => (
            <div key={r.date} className="flex items-center justify-between border-b border-border py-2.5 text-sm last:border-b-0">
              <span className="w-32 shrink-0 text-muted-foreground">{formatDate(r.date, { weekday: "short", month: "short", day: "numeric" })}</span>
              <span className="flex-1 text-muted-foreground">{r.checkIn ? `${r.checkIn} – ${r.checkOut ?? "…"}` : "—"}</span>
              <span className="w-16 shrink-0 text-right text-muted-foreground">{r.hours ? `${r.hours}h` : ""}</span>
              <Badge>{r.status}</Badge>
            </div>
          ))}
        </div>
      </Card>

      <Card
        title="Work from home"
        action={
          <Button size="sm" onClick={() => setWfhApplyOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Apply for WFH
          </Button>
        }
      >
        <div className="flex items-center gap-3 rounded-xl border border-border p-4">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
            <Home className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-medium">
              {wfhUsed} of {WFH_WEEKLY_QUOTA} used this week
            </p>
            <p className="text-xs text-muted-foreground">
              Planned WFH needs approval from your manager (or HR/admin) before you can take it. For a same-day
              emergency, "Mark WFH" above stays instant.
            </p>
          </div>
        </div>

        {myWfhRequests.length > 0 && (
          <div className="mt-4 space-y-2">
            {myWfhRequests.map((r) => (
              <div key={r.id} className="flex items-center justify-between border-b border-border py-2.5 text-sm last:border-b-0">
                <div className="min-w-0">
                  <span className="text-muted-foreground">{formatDate(r.date, { weekday: "short", month: "short", day: "numeric" })}</span>
                  {r.reason && <span className="ml-2 text-xs text-muted-foreground">· {r.reason}</span>}
                </div>
                <Badge>{r.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      {isPeopleManager && (
        <Card
          title="Team attendance"
          action={
            <input
              type="date"
              value={teamDate}
              max={today}
              onChange={(e) => setTeamDate(e.target.value)}
              className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm"
            />
          }
        >
          <div className="space-y-2">
            {reports.map((employee) => {
              const record = data.attendanceRecords.find((r) => r.employeeId === employee.id && r.date === teamDate);
              return (
                <div key={employee.id} className="flex items-center gap-3 border-b border-border py-2.5 last:border-b-0">
                  <Avatar employee={employee} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{employee.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{employee.title}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {record?.checkIn ? `${record.checkIn} – ${record.checkOut ?? "…"}` : "—"}
                  </span>
                  <Badge>{record?.status ?? "No record"}</Badge>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {canApproveWfh && (
        <Card title={`WFH approvals (${pendingWfhApprovals.length})`}>
          {pendingWfhApprovals.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing waiting on you.</p>
          ) : (
            <div className="space-y-3">
              {pendingWfhApprovals.map((r) => {
                const employee = data.getEmployee(r.employeeId);
                return (
                  <div key={r.id} className="flex items-center gap-3">
                    <Avatar employee={employee} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">
                        <span className="font-medium">{employee.name}</span> · {formatMonthDay(r.date)}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{r.reason}</p>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => data.decideWfh(r.id, "Rejected", "Declined")}>
                        Reject
                      </Button>
                      <Button size="sm" onClick={() => data.decideWfh(r.id, "Approved")}>
                        Approve
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      <ApplyWfhModal
        open={wfhApplyOpen}
        onClose={() => setWfhApplyOpen(false)}
        employeeId={currentUser.id}
        onSubmit={data.applyWfh}
      />
    </div>
  );
}

function ApplyWfhModal({ open, onClose, employeeId, onSubmit }) {
  const [date, setDate] = useState(tomorrowISO());
  const [reason, setReason] = useState("");
  const canSubmit = date.length > 0 && reason.trim().length > 0;

  function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({ employeeId, date, reason: reason.trim() });
    setReason("");
    setDate(tomorrowISO());
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Apply for WFH">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Date" required>
          <Input type="date" value={date} min={tomorrowISO()} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Reason" required>
          <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Let your manager know what's up…" />
        </Field>
        <p className="text-xs text-muted-foreground">
          Up to {WFH_WEEKLY_QUOTA} WFH days are normal per week. This needs approval before the day arrives — for a
          same-day emergency, use "Mark WFH" on the Attendance page instead.
        </p>
        <Button type="submit" disabled={!canSubmit} className="w-full">
          Submit request
        </Button>
      </form>
    </Modal>
  );
}

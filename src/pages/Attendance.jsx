import { useMemo, useState } from "react";
import { Home, Plus } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useHRData } from "../context/HRDataContext";
import { todayISO, formatDate, formatMonthDay, getWeekRange, tomorrowISO } from "../lib/date";
import { getWeeklyWfhDates, getMonthlyWfhDates, isOnProbation } from "../data/wfh";
import { emergenciesUsedInMonth, isNonCompliant, minutesToLabel, punctualityLabel } from "../data/attendance";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Avatar } from "../components/Avatar";
import { Button } from "../components/Button";
import { Modal } from "../components/Modal";
import { Field, Input, Textarea } from "../components/Input";
import { AttendanceWidget } from "../components/AttendanceWidget";
import { cn } from "../lib/cn";

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
  const [emergencyOpen, setEmergencyOpen] = useState(false);

  // Working hours and allowances are company settings, editable by HR.
  const settings = data.settings;
  const emergencyAllowance = settings.emergencyExceptionsPerMonth;
  const emergenciesUsed = emergenciesUsedInMonth(data.attendanceRecords, currentUser.id, today);
  const emergenciesLeft = Math.max(0, emergencyAllowance - emergenciesUsed);
  const todayNeedsExcuse = isNonCompliant(myTodayRecord);

  // On probation the WFH allowance is monthly, not weekly.
  const onProbation = isOnProbation(currentUser);
  const wfhMonthlyUsed = getMonthlyWfhDates(data.wfhRequests, data.attendanceRecords, currentUser.id, today).size;

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

        <div className="mt-4 border-t border-border pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">
                Check in by {minutesToLabel(settings.checkInByMinutes)} · check out from {minutesToLabel(settings.checkOutFromMinutes)}
              </p>
              <p className="mt-1 text-sm">
                {punctualityLabel(myTodayRecord) ?? (myTodayRecord ? "Within working hours." : "Not checked in yet.")}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <p className="text-xs text-muted-foreground">
                {emergenciesLeft} of {emergencyAllowance} emergency exceptions left this month
              </p>
              {todayNeedsExcuse && (
                <Button size="sm" variant="outline" onClick={() => setEmergencyOpen(true)} disabled={emergenciesLeft === 0}>
                  Mark as emergency
                </Button>
              )}
            </div>
          </div>

          {onProbation && (
            <p className="mt-3 rounded-lg bg-warning-soft px-3 py-2 text-xs">
              You're on probation — work from home is limited to {settings.wfhProbationMonthlyQuota} day(s) per month
              ({wfhMonthlyUsed} used), and leave can be availed after confirmation.
            </p>
          )}
        </div>
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
              {punctualityLabel(r) && (
                <span className={cn("mr-2 shrink-0 text-xs", r.emergency ? "text-muted-foreground" : "text-danger")}>
                  {punctualityLabel(r)}
                </span>
              )}
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
              {wfhUsed} of {settings.wfhWeeklyQuota} used this week
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

      <EmergencyModal
        open={emergencyOpen}
        onClose={() => setEmergencyOpen(false)}
        left={emergenciesLeft}
        allowance={emergencyAllowance}
        onSubmit={async (reason) => {
          await data.claimEmergency(currentUser.id, today, reason);
          setEmergencyOpen(false);
        }}
      />

      <ApplyWfhModal
        weeklyQuota={settings.wfhWeeklyQuota}
        open={wfhApplyOpen}
        onClose={() => setWfhApplyOpen(false)}
        employeeId={currentUser.id}
        onSubmit={data.applyWfh}
      />
    </div>
  );
}

function ApplyWfhModal({ open, onClose, employeeId, weeklyQuota, onSubmit }) {
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
          Up to {weeklyQuota} WFH days are normal per week. This needs approval before the day arrives — for a
          same-day emergency, use "Mark WFH" on the Attendance page instead.
        </p>
        <Button type="submit" disabled={!canSubmit} className="w-full">
          Submit request
        </Button>
      </form>
    </Modal>
  );
}

/**
 * Claims one of the month's emergency exceptions for today, excusing a
 * late check-in or an early check-out.
 */
function EmergencyModal({ open, onClose, left, allowance, onSubmit }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await onSubmit(reason.trim());
      setReason("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Mark today as an emergency">
      <p className="text-sm text-muted-foreground">
        This excuses today's late check-in or early check-out. You have {left} of {allowance} exceptions
        left this month.
      </p>
      <Field label="Reason" className="mt-4">
        <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="What happened?" />
      </Field>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} disabled={busy}>Mark as emergency</Button>
      </div>
    </Modal>
  );
}

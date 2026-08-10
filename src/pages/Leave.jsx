import { useState } from "react";
import { Plus } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useHRData } from "../context/HRDataContext";
import { LEAVE_TYPES } from "../data/leave";
import { daysBetweenInclusive, formatMonthDay, todayISO } from "../lib/date";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Avatar } from "../components/Avatar";
import { Button } from "../components/Button";
import { Modal } from "../components/Modal";
import { Field, Input, Select, Textarea } from "../components/Input";
import { cn } from "../lib/cn";

export default function Leave() {
  const { currentUser } = useAuth();
  const data = useHRData();
  const reports = data.getAllReports(currentUser.id);
  const canApprove = ["manager", "hr", "admin"].includes(currentUser.role) && (reports.length > 0 || ["hr", "admin"].includes(currentUser.role));

  const [tab, setTab] = useState("mine");
  const [applyOpen, setApplyOpen] = useState(false);

  const myRequests = data.leaveRequests
    .filter((r) => r.employeeId === currentUser.id)
    .sort((a, b) => b.appliedOn.localeCompare(a.appliedOn));

  const balances = data.leaveBalances[currentUser.id];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Leave</h1>
          <p className="mt-1 text-sm text-muted-foreground">Apply for time off and track your balance.</p>
        </div>
        <Button onClick={() => setApplyOpen(true)}>
          <Plus className="h-4 w-4" /> Apply for leave
        </Button>
      </div>

      {canApprove && (
        <div className="flex gap-1 rounded-lg border border-border bg-surface p-1 w-fit">
          <TabButton active={tab === "mine"} onClick={() => setTab("mine")}>
            My leave
          </TabButton>
          <TabButton active={tab === "approvals"} onClick={() => setTab("approvals")}>
            Approvals
            {(() => {
              const count = data.leaveRequests.filter(
                (r) =>
                  r.status === "Pending" &&
                  (["hr", "admin"].includes(currentUser.role) || r.approverId === currentUser.id),
              ).length;
              return count > 0 ? <span className="ml-1.5 text-primary">({count})</span> : null;
            })()}
          </TabButton>
        </div>
      )}

      {tab === "mine" || !canApprove ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {LEAVE_TYPES.map((t) => {
              const b = balances[t.id];
              const left = b.quota - b.used;
              return (
                <div key={t.id} className="rounded-2xl border border-border bg-surface p-5">
                  <p className="text-sm text-muted-foreground">{t.name}</p>
                  <p className="mt-2 font-display text-3xl">
                    {left} <span className="text-base font-sans text-muted-foreground">/ {b.quota} left</span>
                  </p>
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
                    <div className="h-full rounded-full" style={{ width: `${(b.used / b.quota) * 100}%`, backgroundColor: t.color }} />
                  </div>
                </div>
              );
            })}
          </div>

          <Card title="My requests">
            {myRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">No leave requests yet.</p>
            ) : (
              <div className="space-y-3">
                {myRequests.map((r) => (
                  <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-3 last:border-b-0">
                    <div>
                      <p className="text-sm font-medium">{LEAVE_TYPES.find((t) => t.id === r.type).name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatMonthDay(r.startDate)} – {formatMonthDay(r.endDate)} · {r.days}d · {r.reason}
                      </p>
                      {r.approverComment && (
                        <p className="mt-1 text-xs italic text-muted-foreground">"{r.approverComment}"</p>
                      )}
                    </div>
                    <Badge>{r.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      ) : (
        <ApprovalsTab currentUser={currentUser} data={data} />
      )}

      <ApplyLeaveModal open={applyOpen} onClose={() => setApplyOpen(false)} employeeId={currentUser.id} onSubmit={data.applyLeave} />
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md px-3.5 py-1.5 text-sm font-medium transition",
        active ? "bg-primary-soft text-primary" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function ApprovalsTab({ currentUser, data }) {
  const isOrgWide = ["hr", "admin"].includes(currentUser.role);
  const relevant = data.leaveRequests.filter((r) => isOrgWide || r.approverId === currentUser.id);
  const pending = relevant.filter((r) => r.status === "Pending").sort((a, b) => a.appliedOn.localeCompare(b.appliedOn));
  const decided = relevant.filter((r) => r.status !== "Pending").sort((a, b) => b.appliedOn.localeCompare(a.appliedOn)).slice(0, 8);

  const [comments, setComments] = useState({});

  return (
    <div className="space-y-6">
      <Card title={`Pending approvals (${pending.length})`}>
        {pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing waiting on you.</p>
        ) : (
          <div className="space-y-4">
            {pending.map((r) => {
              const employee = data.getEmployee(r.employeeId);
              return (
                <div key={r.id} className="rounded-xl border border-border p-4">
                  <div className="flex items-center gap-3">
                    <Avatar employee={employee} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        {employee.name} · {LEAVE_TYPES.find((t) => t.id === r.type).name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatMonthDay(r.startDate)} – {formatMonthDay(r.endDate)} · {r.days}d · {r.reason}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Input
                      placeholder="Optional comment…"
                      value={comments[r.id] ?? ""}
                      onChange={(e) => setComments((c) => ({ ...c, [r.id]: e.target.value }))}
                      className="h-8 flex-1 text-xs"
                    />
                    <Button size="sm" variant="outline" onClick={() => data.decideLeave(r.id, "Rejected", comments[r.id])}>
                      Reject
                    </Button>
                    <Button size="sm" onClick={() => data.decideLeave(r.id, "Approved", comments[r.id])}>
                      Approve
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card title="Recent decisions">
        <div className="space-y-3">
          {decided.map((r) => {
            const employee = data.getEmployee(r.employeeId);
            return (
              <div key={r.id} className="flex items-center gap-3 border-b border-border py-2.5 last:border-b-0">
                <Avatar employee={employee} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">
                    {employee.name} · {LEAVE_TYPES.find((t) => t.id === r.type).name} · {r.days}d
                  </p>
                </div>
                <Badge>{r.status}</Badge>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function ApplyLeaveModal({ open, onClose, employeeId, onSubmit }) {
  const [type, setType] = useState(LEAVE_TYPES[0].id);
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [reason, setReason] = useState("");

  const days = startDate && endDate && endDate >= startDate ? daysBetweenInclusive(startDate, endDate) : 0;
  const canSubmit = days > 0 && reason.trim().length > 0;

  function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({ employeeId, type, startDate, endDate, reason: reason.trim() });
    setReason("");
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Apply for leave">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Leave type" required>
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            {LEAVE_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start date" required>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </Field>
          <Field label="End date" required>
            <Input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} />
          </Field>
        </div>
        <p className="text-xs text-muted-foreground">{days > 0 ? `${days} day${days > 1 ? "s" : ""}` : "Pick valid dates"}</p>
        <Field label="Reason" required>
          <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Let your manager know what's up…" />
        </Field>
        <Button type="submit" disabled={!canSubmit} className="w-full">
          Submit request
        </Button>
      </form>
    </Modal>
  );
}

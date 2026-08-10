import { useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useHRData } from "../context/HRDataContext";
import { todayISO, formatDate } from "../lib/date";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Avatar } from "../components/Avatar";
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
  const [teamDate, setTeamDate] = useState(today);

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
    </div>
  );
}

import { Link } from "react-router-dom";
import { Users, CalendarDays, Award, ClipboardList, ThumbsUp, Pin } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useHRData } from "../context/HRDataContext";
import { CORE_VALUES } from "../data/kudos";
import { ANNOUNCEMENT_CATEGORIES } from "../data/announcements";
import { LEAVE_TYPES } from "../data/leave";
import { todayISO, formatMonthDay } from "../lib/date";
import { Card } from "../components/Card";
import { StatTile } from "../components/StatTile";
import { Badge } from "../components/Badge";
import { Avatar } from "../components/Avatar";
import { Button } from "../components/Button";
import { AttendanceWidget } from "../components/AttendanceWidget";

export default function Dashboard() {
  const { currentUser } = useAuth();
  const data = useHRData();
  const today = todayISO();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const myTodayRecord = data.attendanceRecords.find((r) => r.employeeId === currentUser.id && r.date === today);
  const myOnboarding = data.onboardingPlans[currentUser.id];
  const isNewHire = currentUser.status === "Onboarding" && myOnboarding;

  const reports = data.getAllReports(currentUser.id);
  const isPeopleManager = ["manager", "hr", "admin"].includes(currentUser.role) && reports.length > 0;

  const pendingApprovals = data.leaveRequests.filter((r) => {
    if (r.status !== "Pending") return false;
    if (currentUser.role === "hr" || currentUser.role === "admin") return true;
    return r.approverId === currentUser.id;
  });

  const recentAnnouncements = [...data.announcements]
    .sort((a, b) => (b.pinned - a.pinned) || b.date.localeCompare(a.date))
    .slice(0, 3);

  const recentKudos = [...data.kudos].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);

  const newHiresInFlight = data.employees.filter((e) => e.status === "Onboarding");

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-muted-foreground">{greeting},</p>
        <h1 className="font-display text-3xl font-semibold">{currentUser.name.split(" ")[0]}</h1>
      </div>

      <StatRow currentUser={currentUser} data={data} reports={reports} pendingApprovals={pendingApprovals} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Today's attendance">
            <AttendanceWidget record={myTodayRecord} onCheckIn={() => data.checkIn(currentUser.id)} onCheckOut={() => data.checkOut(currentUser.id)} onWFH={() => data.markWFH(currentUser.id)} />
          </Card>

          {isNewHire && (
            <Card
              title="Your onboarding"
              action={
                <Link to="/onboarding" className="text-xs font-medium text-primary hover:underline">
                  View checklist
                </Link>
              }
            >
              <OnboardingProgressBar plan={myOnboarding} />
            </Card>
          )}

          {isPeopleManager && (
            <Card
              title="Pending approvals"
              action={
                <Link to="/leave" className="text-xs font-medium text-primary hover:underline">
                  View all
                </Link>
              }
            >
              {pendingApprovals.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing waiting on you. Nice.</p>
              ) : (
                <div className="space-y-3">
                  {pendingApprovals.slice(0, 4).map((req) => (
                    <ApprovalRow key={req.id} request={req} getEmployee={data.getEmployee} onDecide={data.decideLeave} />
                  ))}
                </div>
              )}
            </Card>
          )}

          {(currentUser.role === "hr" || currentUser.role === "admin") && newHiresInFlight.length > 0 && (
            <Card
              title="Onboarding in progress"
              action={
                <Link to="/onboarding" className="text-xs font-medium text-primary hover:underline">
                  Manage
                </Link>
              }
            >
              <div className="space-y-4">
                {newHiresInFlight.map((hire) => (
                  <div key={hire.id} className="flex items-center gap-3">
                    <Avatar employee={hire} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{hire.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{hire.title}</p>
                    </div>
                    <div className="w-28 shrink-0">
                      <OnboardingProgressBar plan={data.onboardingPlans[hire.id]} compact />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card
            title="Recognition feed"
            action={
              <Link to="/recognition" className="text-xs font-medium text-primary hover:underline">
                See all
              </Link>
            }
          >
            <div className="space-y-4">
              {recentKudos.map((k) => (
                <KudosRow key={k.id} kudos={k} getEmployee={data.getEmployee} />
              ))}
            </div>
          </Card>

          <Card
            title="Announcements"
            action={
              <Link to="/announcements" className="text-xs font-medium text-primary hover:underline">
                See all
              </Link>
            }
          >
            <div className="space-y-4">
              {recentAnnouncements.map((a) => (
                <AnnouncementRow key={a.id} announcement={a} />
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatRow({ currentUser, data, reports, pendingApprovals }) {
  const myLeave = data.leaveBalances[currentUser.id];
  const totalLeaveLeft = LEAVE_TYPES.reduce((sum, t) => sum + (myLeave[t.id].quota - myLeave[t.id].used), 0);
  const presentToday = reports.filter((r) =>
    data.attendanceRecords.some((rec) => rec.employeeId === r.id && rec.date === todayISO() && ["Present", "WFH"].includes(rec.status)),
  ).length;

  if (currentUser.role === "admin" || currentUser.role === "hr") {
    const onboardingCount = data.employees.filter((e) => e.status === "Onboarding").length;
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Headcount" value={data.employees.length} icon={Users} tone="primary" />
        <StatTile label="Pending approvals" value={pendingApprovals.length} icon={CalendarDays} tone="warning" />
        <StatTile label="Onboarding" value={onboardingCount} icon={ClipboardList} tone="info" sub="new hires in flight" />
        <StatTile label="My leave balance" value={totalLeaveLeft} icon={Award} tone="success" sub="days remaining" />
      </div>
    );
  }

  if (currentUser.role === "manager") {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Team size" value={reports.length} icon={Users} tone="primary" />
        <StatTile label="Present today" value={`${presentToday}/${reports.length}`} icon={CalendarDays} tone="success" />
        <StatTile label="Pending approvals" value={pendingApprovals.length} icon={ClipboardList} tone="warning" />
        <StatTile label="My leave balance" value={totalLeaveLeft} icon={Award} tone="info" sub="days remaining" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <StatTile label="Leave balance" value={totalLeaveLeft} icon={Award} tone="primary" sub="days remaining" />
      <StatTile label="Casual left" value={myLeave.casual.quota - myLeave.casual.used} icon={CalendarDays} tone="info" />
      <StatTile label="Sick left" value={myLeave.sick.quota - myLeave.sick.used} icon={CalendarDays} tone="warning" />
      <StatTile label="Earned left" value={myLeave.earned.quota - myLeave.earned.used} icon={CalendarDays} tone="success" />
    </div>
  );
}

function OnboardingProgressBar({ plan, compact }) {
  if (!plan) return null;
  const done = plan.filter((t) => t.status === "Done").length;
  const pct = Math.round((done / plan.length) * 100);
  return (
    <div>
      {!compact && (
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {done} of {plan.length} tasks complete
          </span>
          <span className="font-medium">{pct}%</span>
        </div>
      )}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      {compact && <p className="mt-1 text-right text-xs text-muted-foreground">{pct}%</p>}
    </div>
  );
}

function ApprovalRow({ request, getEmployee, onDecide }) {
  const employee = getEmployee(request.employeeId);
  const type = LEAVE_TYPES.find((t) => t.id === request.type);
  return (
    <div className="flex items-center gap-3">
      <Avatar employee={employee} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">
          <span className="font-medium">{employee.name}</span> · {type.name}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatMonthDay(request.startDate)} – {formatMonthDay(request.endDate)} · {request.days}d
        </p>
      </div>
      <div className="flex shrink-0 gap-1.5">
        <Button size="sm" variant="outline" onClick={() => onDecide(request.id, "Rejected", "Declined from dashboard")}>
          Reject
        </Button>
        <Button size="sm" onClick={() => onDecide(request.id, "Approved")}>
          Approve
        </Button>
      </div>
    </div>
  );
}

function KudosRow({ kudos, getEmployee }) {
  const from = getEmployee(kudos.fromId);
  const to = kudos.toIds.map(getEmployee);
  const value = CORE_VALUES.find((v) => v.id === kudos.value);
  return (
    <div className="flex gap-3">
      <Avatar employee={from} size="sm" />
      <div className="min-w-0">
        <p className="text-sm">
          <span className="font-medium">{from.name}</span>
          <span className="text-muted-foreground"> → </span>
          <span className="font-medium">{to.map((e) => e.name).join(", ")}</span>
        </p>
        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
          {value.emoji} {kudos.message}
        </p>
        <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
          <ThumbsUp className="h-3 w-3" /> {kudos.likedBy.length}
        </p>
      </div>
    </div>
  );
}

function AnnouncementRow({ announcement }) {
  const category = ANNOUNCEMENT_CATEGORIES.find((c) => c.id === announcement.category);
  return (
    <div>
      <div className="flex items-center gap-2">
        {announcement.pinned && <Pin className="h-3 w-3 text-primary" />}
        <p className="truncate text-sm font-medium">{announcement.title}</p>
      </div>
      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
        <Badge color={category.color}>{category.label}</Badge>
        <span>{formatMonthDay(announcement.date)}</span>
      </div>
    </div>
  );
}

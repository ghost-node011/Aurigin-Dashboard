import { useMemo, useState } from "react";
import { Users, CalendarCheck, ClipboardList, Award } from "lucide-react";
import { useHRData } from "../context/HRDataContext";
import { DEPARTMENTS } from "../data/departments";
import { LEAVE_TYPES } from "../data/leave";
import { computeOnboardingProgress } from "../data/onboarding";
import { formatMonthDay } from "../lib/date";
import { Card } from "../components/Card";
import { StatTile } from "../components/StatTile";
import { Badge } from "../components/Badge";

// Categorical theme (validated: node scripts/validate_palette.js against
// this app's #ffffff card surface — passes CVD/normal-vision floors; the
// three sub-3:1-contrast slots below always ship with a direct value label,
// never color alone, per the palette's relief rule).
const DEPARTMENT_COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300"];

export default function Analytics() {
  const data = useHRData();

  const headcountByDept = useMemo(
    () =>
      DEPARTMENTS.map((d, i) => ({
        label: d.name,
        value: data.employees.filter((e) => e.department === d.id).length,
        color: DEPARTMENT_COLORS[i % DEPARTMENT_COLORS.length],
      })),
    [data.employees],
  );

  const attendanceTrend = useMemo(() => {
    const byDate = new Map();
    for (const r of data.attendanceRecords) {
      if (!byDate.has(r.date)) byDate.set(r.date, { present: 0, total: 0 });
      const bucket = byDate.get(r.date);
      bucket.total += 1;
      if (r.status === "Present" || r.status === "WFH") bucket.present += 1;
    }
    return [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, { present, total }]) => ({ date, rate: total ? Math.round((present / total) * 100) : 0 }));
  }, [data.attendanceRecords]);

  const leaveUsage = useMemo(
    () =>
      LEAVE_TYPES.map((t) => ({
        label: t.name,
        value: Object.values(data.leaveBalances).reduce((sum, b) => sum + b[t.id].used, 0),
        color: t.color,
      })),
    [data.leaveBalances],
  );

  const leaveStatusCounts = useMemo(() => {
    const counts = { Pending: 0, Approved: 0, Rejected: 0 };
    for (const r of data.leaveRequests) counts[r.status] = (counts[r.status] ?? 0) + 1;
    return counts;
  }, [data.leaveRequests]);

  const onboardingEmployees = data.employees.filter((e) => e.status === "Onboarding");
  const avgOnboarding = onboardingEmployees.length
    ? Math.round(
        onboardingEmployees.reduce((sum, e) => sum + computeOnboardingProgress(data.onboardingPlans[e.id]), 0) /
          onboardingEmployees.length,
      )
    : 0;

  const avgAttendanceRate = attendanceTrend.length
    ? Math.round(attendanceTrend.reduce((s, d) => s + d.rate, 0) / attendanceTrend.length)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">Company-wide people metrics, at a glance.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Headcount" value={data.employees.length} icon={Users} tone="primary" />
        <StatTile label="Avg. attendance" value={`${avgAttendanceRate}%`} icon={CalendarCheck} tone="success" sub="last 14 working days" />
        <StatTile label="Onboarding progress" value={`${avgOnboarding}%`} icon={ClipboardList} tone="info" sub={`${onboardingEmployees.length} in flight`} />
        <StatTile label="Leave requests" value={data.leaveRequests.length} icon={Award} tone="warning" sub="all time" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Headcount by department">
          <BarChart data={headcountByDept} />
        </Card>

        <Card title="Leave days used by type">
          <BarChart data={leaveUsage} horizontal />
        </Card>
      </div>

      <Card title="Attendance rate — last 14 working days">
        <TrendLine points={attendanceTrend} />
      </Card>

      <Card title="Leave request status">
        <div className="flex flex-wrap gap-3">
          <StatusChip label="Approved" count={leaveStatusCounts.Approved} tone="success" />
          <StatusChip label="Pending" count={leaveStatusCounts.Pending} tone="warning" />
          <StatusChip label="Rejected" count={leaveStatusCounts.Rejected} tone="danger" />
        </div>
      </Card>
    </div>
  );
}

function StatusChip({ label, count, tone }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border px-4 py-3">
      <Badge tone={tone}>{label}</Badge>
      <span className="font-display text-xl">{count}</span>
    </div>
  );
}

// Single-series vertical/horizontal bar chart. Direct value labels ride every
// bar (the relief rule for this palette's sub-3:1 slots), so no legend or
// hover tooltip is required for the value to be reachable.
function BarChart({ data, horizontal = false }) {
  const [hovered, setHovered] = useState(null);
  const max = Math.max(...data.map((d) => d.value), 1);

  if (horizontal) {
    return (
      <div className="space-y-3">
        {data.map((d, i) => (
          <div
            key={d.label}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            className="group"
          >
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-foreground">{d.label}</span>
              <span className="font-medium tabular-nums">{d.value}d</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-surface-muted">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(d.value / max) * 100}%`,
                  backgroundColor: d.color,
                  opacity: hovered === null || hovered === i ? 1 : 0.55,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex h-56 items-end gap-3">
      {data.map((d, i) => (
        <div
          key={d.label}
          className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5"
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(null)}
        >
          <span className="text-xs font-medium tabular-nums text-foreground">{d.value}</span>
          <div
            className="w-full max-w-6 rounded-t-[4px] transition-all"
            style={{
              height: `${Math.max((d.value / max) * 100, 4)}%`,
              backgroundColor: d.color,
              opacity: hovered === null || hovered === i ? 1 : 0.55,
            }}
          />
          <span className="w-full truncate text-center text-[11px] text-muted-foreground" title={d.label}>
            {d.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// Single-series line + area wash, hairline gridlines, hover crosshair dots,
// end-of-line direct label (per spec: lines label the endpoint, not every point).
function TrendLine({ points }) {
  const [hovered, setHovered] = useState(null);
  const width = 700;
  const height = 200;
  const padding = { top: 16, right: 44, bottom: 24, left: 8 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  if (points.length === 0) {
    return <p className="text-sm text-muted-foreground">Not enough attendance data yet.</p>;
  }

  const x = (i) => padding.left + (i / Math.max(points.length - 1, 1)) * innerW;
  const y = (rate) => padding.top + innerH - (rate / 100) * innerH;

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.rate)}`).join(" ");
  const areaPath = `${linePath} L${x(points.length - 1)},${padding.top + innerH} L${x(0)},${padding.top + innerH} Z`;
  const gridSteps = [0, 25, 50, 75, 100];
  const last = points[points.length - 1];

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Attendance rate over the last 14 working days">
        {gridSteps.map((g) => (
          <line
            key={g}
            x1={padding.left}
            x2={width - padding.right}
            y1={y(g)}
            y2={y(g)}
            style={{ stroke: "var(--border)" }}
            strokeWidth={1}
          />
        ))}
        <path d={areaPath} style={{ fill: "var(--primary)", fillOpacity: 0.1 }} stroke="none" />
        <path d={linePath} style={{ stroke: "var(--primary)" }} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle
            key={p.date}
            cx={x(i)}
            cy={y(p.rate)}
            r={hovered === i ? 6 : 4}
            style={{ fill: "var(--primary)", stroke: "var(--surface)" }}
            strokeWidth={2}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            className="cursor-pointer"
          />
        ))}
        <text x={x(points.length - 1) + 8} y={y(last.rate) + 4} style={{ fill: "var(--foreground)" }} fontSize={12} fontWeight={600}>
          {last.rate}%
        </text>
      </svg>

      {hovered !== null && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs shadow-md"
          style={{ left: `${(x(hovered) / width) * 100}%`, top: `${(y(points[hovered].rate) / height) * 100}%` }}
        >
          <span className="font-semibold">{points[hovered].rate}%</span>{" "}
          <span className="text-muted-foreground">{formatMonthDay(points[hovered].date)}</span>
        </div>
      )}
    </div>
  );
}

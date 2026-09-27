import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useHRData } from "../context/HRDataContext";
import { api } from "../lib/api";
import { formatMonthDay } from "../lib/date";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Avatar } from "../components/Avatar";
import { Select } from "../components/Input";
import { TypeIcon } from "../components/issues/IssueIcons";

/** Sprint report: summary, burndown and what did and didn't get done. */
export default function SprintReport() {
  const { sprintId } = useParams();
  const navigate = useNavigate();
  const data = useHRData();
  const [report, setReport] = useState(null);
  const [sprints, setSprints] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    setReport(null);
    setError(null);
    api
      .getSprintReport(sprintId)
      .then((r) => {
        setReport(r);
        return api.getSprints(r.sprint.projectKey);
      })
      .then((s) => setSprints(s.filter((x) => x.state !== "future")))
      .catch((err) => setError(err.message));
  }, [sprintId]);

  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!report) return <p className="text-sm text-muted-foreground">Loading the report…</p>;

  const { sprint, issues, days, unit, total } = report;
  const done = issues.filter((i) => i.status === "Done");
  const notDone = issues.filter((i) => i.status !== "Done");
  const size = (i) => (unit === "points" ? i.storyPoints ?? 0 : 1);
  const doneSize = done.reduce((s, i) => s + size(i), 0);
  const unitLabel = unit === "points" ? "story points" : "issues";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link to="/backlog" className="text-sm text-muted-foreground hover:text-foreground">
            {sprint.projectKey} · Sprint report
          </Link>
          <h1 className="flex items-center gap-2 font-display text-3xl font-semibold">
            {sprint.name} <Badge tone={sprint.state === "active" ? "info" : "neutral"}>{sprint.state === "active" ? "Active" : "Completed"}</Badge>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatMonthDay(sprint.startDate)} – {formatMonthDay(sprint.endDate)}
            {sprint.goal && ` · ${sprint.goal}`}
          </p>
        </div>
        {sprints.length > 1 && (
          <Select value={sprint.id} onChange={(e) => navigate(`/sprints/${e.target.value}/report`)} className="h-9 w-56" aria-label="Sprint">
            {sprints.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.state === "active" ? " (active)" : ""}
              </option>
            ))}
          </Select>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Tile label={`Completed (${unitLabel})`} value={`${doneSize} / ${total}`} />
        <Tile label="Issues done" value={`${done.length} / ${issues.length}`} />
        <Tile label="Completion" value={total ? `${Math.round((doneSize / total) * 100)}%` : "—"} />
        <Tile label="Not done" value={notDone.length} />
      </div>

      <Card title={`Burndown — remaining ${unitLabel}`}>
        {days.length < 2 || total === 0 ? (
          <p className="text-sm text-muted-foreground">
            {total === 0 ? "No work in this sprint to burn down." : "The burndown appears after the sprint's first day."}
          </p>
        ) : (
          <Burndown days={days} unitLabel={unitLabel} />
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Work is counted when an issue reaches Done. Scope is the sprint's issues {sprint.state === "active" ? "right now" : "when it closed"}.
        </p>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <IssueList title={`Completed (${done.length})`} issues={done} getEmployee={data.getEmployee} unit={unit} />
        <IssueList
          title={`${sprint.state === "active" ? "Still open" : "Not completed"} (${notDone.length})`}
          issues={notDone}
          getEmployee={data.getEmployee}
          unit={unit}
        />
      </div>
    </div>
  );
}

function Tile({ label, value }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl tabular-nums">{value}</p>
    </div>
  );
}

function IssueList({ title, issues, getEmployee, unit }) {
  return (
    <Card title={title}>
      {issues.length === 0 ? (
        <p className="text-sm text-muted-foreground">None.</p>
      ) : (
        <ul className="divide-y divide-border">
          {issues.map((i) => (
            <li key={i.key} className="flex items-center gap-2.5 py-2 text-sm">
              <TypeIcon type={i.type} />
              <Link to={`/browse/${i.key}`} className="shrink-0 font-mono text-xs text-muted-foreground hover:text-primary">
                {i.key}
              </Link>
              <Link to={`/browse/${i.key}`} className="min-w-0 flex-1 truncate hover:text-primary">
                {i.title}
              </Link>
              {unit === "points" && i.storyPoints != null && (
                <span className="rounded-full bg-surface-muted px-1.5 text-[11px] tabular-nums">{i.storyPoints}</span>
              )}
              {i.assigneeId && <Avatar employee={getEmployee(i.assigneeId)} size="sm" />}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

const W = 720;
const H = 260;
const PAD = { top: 16, right: 64, bottom: 28, left: 36 };

/**
 * Remaining work per day (solid, primary) against the ideal straight line
 * (dashed, neutral) — two encodings, so the pair never relies on colour.
 * Hover anywhere for that day's values; a table view sits underneath.
 */
function Burndown({ days, unitLabel }) {
  const ref = useRef(null);
  const [hover, setHover] = useState(null);

  const max = Math.max(...days.map((d) => Math.max(d.ideal, d.remaining ?? 0)), 1);
  const x = (i) => PAD.left + (i / (days.length - 1)) * (W - PAD.left - PAD.right);
  const y = (v) => PAD.top + (1 - v / max) * (H - PAD.top - PAD.bottom);

  const ticks = useMemo(() => {
    const step = Math.max(1, Math.ceil(max / 4));
    return Array.from({ length: Math.floor(max / step) + 1 }, (_, n) => n * step);
  }, [max]);

  const idealPath = days.map((d, i) => `${i ? "L" : "M"}${x(i)},${y(d.ideal)}`).join("");
  const actual = days.map((d, i) => ({ ...d, i })).filter((d) => d.remaining != null);
  const actualPath = actual.map((d, n) => `${n ? "L" : "M"}${x(d.i)},${y(d.remaining)}`).join("");
  const last = actual.at(-1);
  const labelEvery = Math.ceil(days.length / 7);

  function onMove(e) {
    const rect = ref.current.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - PAD.left) / (W - PAD.left - PAD.right)) * (days.length - 1));
    setHover(Math.max(0, Math.min(days.length - 1, i)));
  }

  const h = hover != null ? days[hover] : null;

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <svg width="18" height="8" aria-hidden="true">
            <line x1="0" y1="4" x2="18" y2="4" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Remaining
        </span>
        <span className="flex items-center gap-1.5">
          <svg width="18" height="8" aria-hidden="true">
            <line x1="0" y1="4" x2="18" y2="4" stroke="var(--muted-foreground)" strokeWidth="2" strokeDasharray="4 3" />
          </svg>
          Ideal
        </span>
      </div>
      <div className="relative">
        <svg
          ref={ref}
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full touch-none"
          role="img"
          aria-label={`Burndown: ${last ? `${last.remaining} ${unitLabel} remaining on ${formatMonthDay(last.date)}` : "no data yet"}`}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth="1" />
              <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize="11" fill="var(--muted-foreground)">
                {t}
              </text>
            </g>
          ))}
          {days.map((d, i) =>
            i % labelEvery === 0 || i === days.length - 1 ? (
              <text key={d.date} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--muted-foreground)">
                {formatMonthDay(d.date)}
              </text>
            ) : null,
          )}
          <path d={idealPath} fill="none" stroke="var(--muted-foreground)" strokeWidth="2" strokeDasharray="6 5" strokeLinecap="round" />
          <path d={actualPath} fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          {last && (
            <>
              <circle cx={x(last.i)} cy={y(last.remaining)} r="4.5" fill="var(--primary)" stroke="var(--surface)" strokeWidth="2" />
              <text x={x(last.i) + 9} y={y(last.remaining)} dy="0.32em" fontSize="12" fontWeight="600" fill="var(--foreground)">
                {last.remaining}
              </text>
            </>
          )}
          {h && (
            <g pointerEvents="none">
              <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={H - PAD.bottom} stroke="var(--muted-foreground)" strokeWidth="1" />
              <circle cx={x(hover)} cy={y(h.ideal)} r="4" fill="var(--muted-foreground)" stroke="var(--surface)" strokeWidth="2" />
              {h.remaining != null && (
                <circle cx={x(hover)} cy={y(h.remaining)} r="4.5" fill="var(--primary)" stroke="var(--surface)" strokeWidth="2" />
              )}
            </g>
          )}
        </svg>
        {h && (
          <div
            className="pointer-events-none absolute top-2 rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-lg"
            style={{ left: `${(x(hover) / W) * 100}%`, transform: `translateX(${hover > days.length / 2 ? "-110%" : "10%"})` }}
          >
            <p className="font-medium">{formatMonthDay(h.date)}</p>
            <p className="mt-0.5 text-muted-foreground">
              Remaining: <span className="font-medium text-foreground">{h.remaining ?? "—"}</span>
            </p>
            <p className="text-muted-foreground">
              Ideal: <span className="font-medium text-foreground">{h.ideal}</span>
            </p>
          </div>
        )}
      </div>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-xs text-muted-foreground">Show as table</summary>
        <table className="mt-2 w-full max-w-sm text-xs">
          <thead className="text-left text-muted-foreground">
            <tr>
              <th className="py-1 font-medium">Day</th>
              <th className="py-1 text-right font-medium">Remaining</th>
              <th className="py-1 text-right font-medium">Ideal</th>
            </tr>
          </thead>
          <tbody>
            {days.map((d) => (
              <tr key={d.date} className="border-t border-border">
                <td className="py-1">{formatMonthDay(d.date)}</td>
                <td className="py-1 text-right tabular-nums">{d.remaining ?? "—"}</td>
                <td className="py-1 text-right tabular-nums">{d.ideal}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

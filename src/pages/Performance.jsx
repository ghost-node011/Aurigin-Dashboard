import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useHRData } from "../context/HRDataContext";
import { api } from "../lib/api";
import { formatDate } from "../lib/date";
import { RATING_TONE, formatMinutes, viewableEmployees } from "../data/work";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Select } from "../components/Input";
import { ReviewCard } from "../components/work/ReviewCard";
import { Avatar } from "../components/Avatar";

/**
 * Day-by-day performance from closed "My Day" plans. Everyone sees their
 * own; managers see their reporting line and HR/admin see everyone.
 */
export default function Performance() {
  const { currentUser } = useAuth();
  const data = useHRData();
  const people = viewableEmployees(currentUser, data.employees, data.getAllReports);

  // Anyone overseeing others opens on the everyone view; others on their own days.
  const EVERYONE = "__everyone";
  const [employeeId, setEmployeeId] = useState(people.length > 1 ? EVERYONE : currentUser.id);
  const [summary, setSummary] = useState(null);
  const [days, setDays] = useState(null);
  const [error, setError] = useState(null);
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setDays(null);
    setSummary(null);
    setError(null);
    if (employeeId === EVERYONE) {
      api.getPerformanceSummary(30).then(
        (rows) => !cancelled && setSummary(rows),
        (err) => !cancelled && setError(err.message),
      );
      return () => {
        cancelled = true;
      };
    }
    api.getPerformance(employeeId, 60).then(
      (plans) => {
        if (cancelled) return;
        setDays(plans);
        setOpenId(plans[0]?.id ?? null);
      },
      (err) => !cancelled && setError(err.message),
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  const scored = (days ?? []).filter((d) => d.review?.score != null);
  const average = scored.length ? Math.round(scored.reduce((s, d) => s + d.review.score, 0) / scored.length) : null;
  const completed = (days ?? []).reduce((s, d) => s + (d.review?.completed ?? 0), 0);
  const total = (days ?? []).reduce((s, d) => s + (d.review?.total ?? 0), 0);
  const minutes = (days ?? []).reduce((s, d) => s + (d.review?.minutesLogged ?? 0), 0);
  const open = days?.find((d) => d.id === openId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Performance</h1>
          <p className="mt-1 text-sm text-muted-foreground">Daily reviews from the end-of-day summary in My Day.</p>
        </div>
        {people.length > 1 && (
          <Select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="w-56" aria-label="Employee">
            <option value={EVERYONE}>Everyone (last 30 days)</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.id === currentUser.id ? `${p.name} (you)` : p.name}
              </option>
            ))}
          </Select>
        )}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      {employeeId === EVERYONE && (
        <EveryoneTable rows={summary} getEmployee={data.getEmployee} onOpen={setEmployeeId} />
      )}
      {employeeId !== EVERYONE && !days && !error && <p className="text-sm text-muted-foreground">Loading…</p>}

      {days && days.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          No closed days yet. Reviews appear here after an end-of-day summary in My Day.
        </div>
      )}

      {days && days.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Tile label="Average score" value={average != null ? `${average} / 100` : "—"} />
            <Tile label="Days reviewed" value={days.length} />
            <Tile label="Tickets done" value={`${completed} / ${total}`} />
            <Tile label="Time logged" value={formatMinutes(minutes)} />
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <Card title="Day by day">
              <ul className="space-y-1">
                {days.map((d) => (
                  <li key={d.id}>
                    <button
                      type="button"
                      onClick={() => setOpenId(d.id)}
                      className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition hover:bg-surface-muted ${
                        d.id === openId ? "bg-surface-muted" : ""
                      }`}
                    >
                      <span className="w-24 shrink-0 text-muted-foreground">
                        {formatDate(d.date, { weekday: "short", day: "numeric", month: "short" })}
                      </span>
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-muted">
                        <span
                          className="block h-full rounded-full bg-primary"
                          style={{ width: `${d.review?.score ?? 0}%` }}
                        />
                      </span>
                      <span className="w-12 shrink-0 text-right tabular-nums">{d.review?.score ?? "—"}</span>
                      {d.review?.rating && (
                        <Badge tone={RATING_TONE[d.review.rating]} className="hidden shrink-0 sm:inline-flex">
                          {d.review.rating}
                        </Badge>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </Card>

            {open && (
              <ReviewCard
                plan={open}
                title={formatDate(open.date, { weekday: "long", day: "numeric", month: "long" })}
                showSummary
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Tile({ label, value }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl">{value}</p>
    </div>
  );
}

/** One row per person: average score, days reviewed, tickets done, latest review. Click to open their days. */
function EveryoneTable({ rows, getEmployee, onOpen }) {
  if (!rows) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const sorted = [...rows].sort((a, b) => (b.averageScore ?? -1) - (a.averageScore ?? -1));
  return (
    <Card title={`Everyone — last 30 days`}>
      <div className="-m-5 overflow-x-auto">
        <table className="w-full min-w-[40rem] text-sm">
          <thead className="border-b border-border text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-5 py-2 font-medium">Person</th>
              <th className="px-2 py-2 text-right font-medium">Average</th>
              <th className="px-2 py-2 text-right font-medium">Days reviewed</th>
              <th className="px-2 py-2 text-right font-medium">Tickets done</th>
              <th className="px-5 py-2 font-medium">Latest</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => {
              const e = getEmployee(r.employeeId);
              return (
                <tr
                  key={r.employeeId}
                  onClick={() => onOpen(r.employeeId)}
                  className="cursor-pointer border-b border-border last:border-b-0 hover:bg-surface-muted/60"
                >
                  <td className="px-5 py-2.5">
                    <span className="flex items-center gap-2">
                      <Avatar employee={e} size="sm" />
                      <span>
                        <span className="block font-medium">{e?.name ?? r.employeeId}</span>
                        <span className="block text-xs text-muted-foreground">{e?.title}</span>
                      </span>
                    </span>
                  </td>
                  <td className="px-2 py-2.5 text-right tabular-nums">{r.averageScore != null ? `${r.averageScore}` : "—"}</td>
                  <td className="px-2 py-2.5 text-right tabular-nums">
                    {r.days}
                    {r.autoDays > 0 && <span className="text-xs text-muted-foreground"> ({r.autoDays} auto)</span>}
                  </td>
                  <td className="px-2 py-2.5 text-right tabular-nums">
                    {r.completed} / {r.total}
                  </td>
                  <td className="px-5 py-2.5">
                    {r.last ? (
                      <span className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">{formatDate(r.last.date, { day: "numeric", month: "short" })}</span>
                        {r.last.score != null && <span className="tabular-nums">{r.last.score}</span>}
                        {r.last.rating && <Badge tone={RATING_TONE[r.last.rating]}>{r.last.rating}</Badge>}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">No reviews yet</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-6 text-xs text-muted-foreground">Average is out of 100. “Auto” days were reviewed from ticket activity because no summary was written.</p>
    </Card>
  );
}

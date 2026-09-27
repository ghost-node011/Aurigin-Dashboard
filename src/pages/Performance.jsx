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

/**
 * Day-by-day performance from closed "My Day" plans. Everyone sees their
 * own; managers see their reporting line and HR/admin see everyone.
 */
export default function Performance() {
  const { currentUser } = useAuth();
  const data = useHRData();
  const people = viewableEmployees(currentUser, data.employees, data.getAllReports);

  const [employeeId, setEmployeeId] = useState(currentUser.id);
  const [days, setDays] = useState(null);
  const [error, setError] = useState(null);
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setDays(null);
    setError(null);
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
  }, [employeeId]);

  const scored = (days ?? []).filter((d) => d.review?.score != null);
  const average = scored.length ? Math.round((scored.reduce((s, d) => s + d.review.score, 0) / scored.length) * 10) / 10 : null;
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
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.id === currentUser.id ? `${p.name} (you)` : p.name}
              </option>
            ))}
          </Select>
        )}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      {!days && !error && <p className="text-sm text-muted-foreground">Loading…</p>}

      {days && days.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          No closed days yet. Reviews appear here after an end-of-day summary in My Day.
        </div>
      )}

      {days && days.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Tile label="Average score" value={average != null ? `${average} / 10` : "—"} />
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
                          style={{ width: `${((d.review?.score ?? 0) / 10) * 100}%` }}
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

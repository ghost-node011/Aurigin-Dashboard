import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Sun, Moon, Plus, LoaderCircle } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { formatDate } from "../lib/date";
import { TICKET_STATUSES, formatHHMM, formatMinutes } from "../data/work";
import { TypeIcon, PriorityIcon } from "../components/issues/IssueIcons";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { Select, Textarea } from "../components/Input";
import { ReviewCard } from "../components/work/ReviewCard";
import { useProjects } from "../hooks/useProjects";

/**
 * "My Day": write a morning overview and the AI turns it into tickets on
 * today's timeline; write an end-of-day summary and it closes them, logs
 * time and assesses the day.
 */
export default function MyDay() {
  const [day, setDay] = useState(null); // { date, plan, tickets }
  const [loadError, setLoadError] = useState(null);
  const { projects } = useProjects();
  const { currentUser } = useAuth();

  useEffect(() => {
    api.getWorkDay().then(setDay, (err) => setLoadError(err.message));
  }, []);

  if (loadError) return <p className="text-sm text-danger">{loadError}</p>;
  if (!day) return <p className="text-sm text-muted-foreground">Loading your day…</p>;

  const { plan, tickets } = day;
  const planned = Boolean(plan?.plannedAt);
  const closed = Boolean(plan?.closedAt);

  async function setTicketStatus(ticket, status) {
    const updated = await api.updateIssue(ticket.key, { status });
    setDay((d) => ({ ...d, tickets: d.tickets.map((t) => (t.id === updated.id ? updated : t)) }));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">My Day</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {formatDate(day.date, { weekday: "long", day: "numeric", month: "long" })} · plan in the morning, wrap
          up before you leave.
        </p>
      </div>

      {!planned && (
        <OverviewForm
          title="Morning overview"
          icon={Sun}
          hint="What did you discuss and what are you working on today? Write it the way you'd say it — the AI turns it into tickets and a timeline."
          placeholder={"e.g. Sync with Arjun on the client pitch. Finish the leave page bug (dates off by one), review Dhruv's PR, then start the onboarding email templates."}
          submitLabel="Create my plan"
          projects={projects}
          onSubmit={async (overview, projectKey) => setDay(await api.planDay(overview, projectKey))}
        />
      )}

      {planned && (
        <Card
          title="Today's plan"
          action={
            <span className="text-xs text-muted-foreground">
              {tickets.filter((t) => t.status === "Done").length} / {tickets.length} done
              {plan.planSource === "fallback" && " · planned without AI"}
            </span>
          }
        >
          {tickets.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tickets on today's timeline.</p>
          ) : (
            <ol className="space-y-2">
              {tickets.map((t) => (
                <li
                  key={t.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-border px-4 py-3 sm:flex-nowrap"
                >
                  <span className="w-36 shrink-0 text-xs tabular-nums text-muted-foreground">
                    {formatHHMM(t.plannedStart)} – {formatHHMM(t.plannedEnd)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={t.status === "Done" ? "text-sm text-muted-foreground line-through" : "text-sm font-medium"}>
                      <Link to={`/browse/${t.key}`} className="mr-2 inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-primary">
                        <TypeIcon type={t.type} /> {t.key}
                      </Link>
                      {t.title}
                    </p>
                    {t.description && <p className="mt-0.5 text-xs text-muted-foreground">{t.description}</p>}
                  </div>
                  <PriorityIcon priority={t.priority} />
                  {t.timeSpentMinutes > 0 && (
                    <span className="shrink-0 text-xs text-muted-foreground">{formatMinutes(t.timeSpentMinutes)}</span>
                  )}
                  <Select
                    value={t.status}
                    disabled={closed}
                    onChange={(e) => setTicketStatus(t, e.target.value)}
                    className="h-8 w-32 shrink-0 text-xs"
                    aria-label={`Status of ${t.key}`}
                  >
                    {TICKET_STATUSES.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </Select>
                </li>
              ))}
            </ol>
          )}
          <p className="mt-4 text-xs text-muted-foreground">
            These are issues in the Aurigin project — open one to add details, attachments, comments or log
            time, or see them on the <Link to="/board" className="text-primary hover:underline">board</Link>.
          </p>
        </Card>
      )}

      {planned && !closed && (
        <OverviewForm
          title="Add more work"
          icon={Plus}
          collapsed
          hint="Something new came up? Describe it and it's scheduled after what's already planned."
          placeholder="e.g. Arjun asked for a quick fix to the org chart colours before 5."
          submitLabel="Add to my plan"
          projects={projects}
          onSubmit={async (overview, projectKey) => setDay(await api.planDay(overview, projectKey))}
        />
      )}

      {planned && !closed && (
        <OverviewForm
          title="End-of-day summary"
          icon={Moon}
          hint="What got done, what's still in progress, what blocked you, and roughly how long things took. The AI closes the finished tickets, logs time and reviews your day."
          placeholder="e.g. Fixed the leave date bug and shipped it (about 2h). PR review done. Onboarding templates half done — waiting on copy from HR."
          submitLabel="Close my day"
          onSubmit={async (summary) => setDay(await api.closeDay(summary))}
        />
      )}

      {closed && (
        <>
          <ReviewCard plan={plan} />
          <p className="text-sm text-muted-foreground">
            Your day is closed.{" "}
            {currentUser.policyExempt && (
              <button
                type="button"
                onClick={async () => setDay(await api.reopenDay())}
                className="mr-2 text-primary hover:underline"
              >
                Reopen (test account)
              </button>
            )}
            <Link to="/performance" className="text-primary hover:underline">
              See your performance over time →
            </Link>
          </p>
        </>
      )}
    </div>
  );
}

function OverviewForm({ title, icon: Icon, hint, placeholder, submitLabel, onSubmit, projects, collapsed = false }) {
  const [open, setOpen] = useState(!collapsed);
  const [projectKey, setProjectKey] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (text.trim().length < 10 || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit(text.trim(), projectKey || undefined);
      setText("");
      if (collapsed) setOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Icon className="h-4 w-4" /> {title}
      </Button>
    );
  }

  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" /> {title}
        </span>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <p className="text-sm text-muted-foreground">{hint}</p>
        <Textarea rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} maxLength={5000} />
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex flex-wrap items-center justify-end gap-2">
          {projects?.length > 1 && (
            <Select
              value={projectKey}
              onChange={(e) => setProjectKey(e.target.value)}
              className="mr-auto h-9 w-auto"
              aria-label="Project"
            >
              <option value="">AI picks the project for each task</option>
              {projects.map((p) => (
                <option key={p.key} value={p.key}>
                  All into {p.name} ({p.key})
                </option>
              ))}
            </Select>
          )}
          {collapsed && (
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={text.trim().length < 10 || busy}>
            {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {busy ? "Working…" : submitLabel}
          </Button>
        </div>
      </form>
    </Card>
  );
}

import { Card } from "../Card";
import { Badge } from "../Badge";
import { RATING_TONE, formatMinutes } from "../../data/work";

/** The end-of-day assessment stored on a closed day plan. */
export function ReviewCard({ plan, title = "Today's review", showSummary = false }) {
  const review = plan.review ?? {};
  // A day nobody summarised, reviewed from what they did on their tickets.
  const auto = plan.reviewSource === "auto";
  return (
    <Card
      title={title}
      action={
        <span className="flex items-center gap-2">
          {auto && <Badge tone="warning">No summary — reviewed from tickets</Badge>}
          {review.rating && <Badge tone={RATING_TONE[review.rating]}>{review.rating}</Badge>}
        </span>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Score" value={review.score != null ? `${review.score} / 100` : "—"} />
        <Stat label="Tickets done" value={`${review.completed ?? 0} / ${review.total ?? 0}`} />
        <Stat label="Time logged" value={formatMinutes(review.minutesLogged)} />
      </div>

      {review.feedback && <p className="mt-5 text-sm">{review.feedback}</p>}

      {(review.highlights?.length > 0 || review.improvements?.length > 0) && (
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <List title="Went well" items={review.highlights} />
          <List title="To improve" items={review.improvements} />
        </div>
      )}

      {showSummary && (
        <div className="mt-5 space-y-3 border-t border-border pt-4 text-sm">
          <Quote label="Morning overview" text={plan.overview} />
          {auto && <Quote label="Ticket activity that day" text={plan.summary} />}
          {!auto && <Quote label="End-of-day summary" text={plan.summary} />}
        </div>
      )}
    </Card>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl bg-surface-muted px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl">{value}</p>
    </div>
  );
}

function List({ title, items }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
      <ul className="list-disc space-y-1 pl-5 text-sm">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function Quote({ label, text }) {
  if (!text) return null;
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 whitespace-pre-line text-muted-foreground">{text}</p>
    </div>
  );
}

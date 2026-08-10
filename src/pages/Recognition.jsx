import { useMemo, useState } from "react";
import { Plus, ThumbsUp, Trophy } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useHRData } from "../context/HRDataContext";
import { CORE_VALUES } from "../data/kudos";
import { formatMonthDay } from "../lib/date";
import { Card } from "../components/Card";
import { Avatar } from "../components/Avatar";
import { Button } from "../components/Button";
import { Modal } from "../components/Modal";
import { Field, Textarea } from "../components/Input";
import { cn } from "../lib/cn";

export default function Recognition() {
  const { currentUser } = useAuth();
  const data = useHRData();
  const [giveOpen, setGiveOpen] = useState(false);

  const leaderboard = useMemo(() => {
    const counts = new Map();
    for (const k of data.kudos) {
      for (const toId of k.toIds) counts.set(toId, (counts.get(toId) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([id, count]) => ({ employee: data.getEmployee(id), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [data]);

  const feed = [...data.kudos].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Recognition</h1>
          <p className="mt-1 text-sm text-muted-foreground">Celebrate the work that doesn't show up in a KPI.</p>
        </div>
        <Button onClick={() => setGiveOpen(true)}>
          <Plus className="h-4 w-4" /> Give kudos
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {feed.map((k) => (
            <KudosCard
              key={k.id}
              kudos={k}
              currentUser={currentUser}
              getEmployee={data.getEmployee}
              onLike={() => data.toggleLike(k.id, currentUser.id)}
            />
          ))}
        </div>

        <Card title="This period's top recognized">
          <div className="space-y-3">
            {leaderboard.map(({ employee, count }, i) => (
              <div key={employee.id} className="flex items-center gap-3">
                <span className="w-5 text-center text-sm font-medium text-muted-foreground">{i + 1}</span>
                <Avatar employee={employee} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{employee.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{employee.title}</p>
                </div>
                <span className="flex items-center gap-1 text-sm font-medium text-primary">
                  <Trophy className="h-3.5 w-3.5" /> {count}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <GiveKudosModal
        open={giveOpen}
        onClose={() => setGiveOpen(false)}
        currentUser={currentUser}
        employees={data.employees}
        onSubmit={data.addKudos}
      />
    </div>
  );
}

function KudosCard({ kudos, currentUser, getEmployee, onLike }) {
  const from = getEmployee(kudos.fromId);
  const to = kudos.toIds.map(getEmployee);
  const value = CORE_VALUES.find((v) => v.id === kudos.value);
  const liked = kudos.likedBy.includes(currentUser.id);

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-start gap-3">
        <Avatar employee={from} size="default" />
        <div className="min-w-0 flex-1">
          <p className="text-sm">
            <span className="font-medium">{from.name}</span>
            <span className="text-muted-foreground"> recognized </span>
            <span className="font-medium">{to.map((e) => e.name).join(", ")}</span>
          </p>
          <p className="text-xs text-muted-foreground">{formatMonthDay(kudos.date)}</p>
        </div>
        <span
          className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
          style={{ backgroundColor: `color-mix(in srgb, ${value.color} 14%, transparent)`, color: value.color }}
        >
          {value.emoji} {value.label}
        </span>
      </div>
      <p className="mt-3 text-sm">{kudos.message}</p>
      <button
        type="button"
        onClick={onLike}
        className={cn(
          "mt-3 flex items-center gap-1.5 text-xs transition",
          liked ? "text-primary" : "text-muted-foreground hover:text-foreground",
        )}
      >
        <ThumbsUp className={cn("h-3.5 w-3.5", liked && "fill-current")} /> {kudos.likedBy.length}
      </button>
    </div>
  );
}

function GiveKudosModal({ open, onClose, currentUser, employees, onSubmit }) {
  const [toIds, setToIds] = useState([]);
  const [value, setValue] = useState(CORE_VALUES[0].id);
  const [message, setMessage] = useState("");

  const candidates = employees.filter((e) => e.id !== currentUser.id);
  const canSubmit = toIds.length > 0 && message.trim().length > 0;

  function toggleRecipient(id) {
    setToIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({ fromId: currentUser.id, toIds, value, message: message.trim() });
    setToIds([]);
    setMessage("");
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Give kudos">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Who's it for?" required>
          <div className="flex max-h-36 flex-wrap gap-1.5 overflow-y-auto rounded-lg border border-border p-2">
            {candidates.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleRecipient(c.id)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs transition",
                  toIds.includes(c.id) ? "border-primary bg-primary-soft text-primary" : "border-border hover:border-foreground/30",
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Core value" required>
          <div className="flex flex-wrap gap-1.5">
            {CORE_VALUES.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setValue(v.id)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs transition",
                  value === v.id ? "border-primary bg-primary-soft text-primary" : "border-border hover:border-foreground/30",
                )}
              >
                {v.emoji} {v.label}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Message" required>
          <Textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="What did they do?" />
        </Field>
        <Button type="submit" disabled={!canSubmit} className="w-full">
          Post kudos
        </Button>
      </form>
    </Modal>
  );
}

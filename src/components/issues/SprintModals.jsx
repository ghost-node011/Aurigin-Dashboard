import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { todayISO } from "../../lib/date";
import { Modal } from "../Modal";
import { Button } from "../Button";
import { Field, Input, Select, Textarea } from "../Input";

const addDays = (iso, days) => {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Start a future sprint, or edit an existing one's name, goal and dates. */
export function SprintFormModal({ open, onClose, sprint, mode, onSaved }) {
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || !sprint) return;
    const start = sprint.startDate ?? todayISO();
    setForm({ name: sprint.name, goal: sprint.goal ?? "", startDate: start, endDate: sprint.endDate ?? addDays(start, 13) });
    setError(null);
  }, [open, sprint]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    if (form.endDate < form.startDate) return setError("The end date must be after the start date.");
    setBusy(true);
    setError(null);
    try {
      await api.updateSprint(sprint.id, { name: form.name, goal: form.goal, startDate: form.startDate, endDate: form.endDate });
      if (mode === "start") await api.startSprint(sprint.id, { startDate: form.startDate, endDate: form.endDate, goal: form.goal });
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!sprint) return null;
  return (
    <Modal open={open} onClose={onClose} title={mode === "start" ? "Start sprint" : "Edit sprint"}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Sprint name" required>
          <Input value={form.name ?? ""} onChange={set("name")} />
        </Field>
        {mode === "start" && (
          <Field label="Duration">
            <Select
              onChange={(e) => e.target.value && setForm((f) => ({ ...f, endDate: addDays(f.startDate, Number(e.target.value) - 1) }))}
              defaultValue=""
            >
              <option value="">Custom</option>
              <option value="7">1 week</option>
              <option value="14">2 weeks</option>
              <option value="21">3 weeks</option>
              <option value="28">4 weeks</option>
            </Select>
          </Field>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start date">
            <Input type="date" value={form.startDate ?? ""} onChange={set("startDate")} />
          </Field>
          <Field label="End date">
            <Input type="date" value={form.endDate ?? ""} onChange={set("endDate")} />
          </Field>
        </div>
        <Field label="Sprint goal">
          <Textarea rows={3} value={form.goal ?? ""} onChange={set("goal")} placeholder="What should this sprint achieve?" />
        </Field>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" disabled={busy || !form.name?.trim()} className="w-full">
          {mode === "start" ? "Start" : "Save"}
        </Button>
      </form>
    </Modal>
  );
}

/**
 * Completes the active sprint. Shows what's done, and asks where the
 * unfinished issues go: the backlog, a future sprint or a new one.
 */
export function CompleteSprintModal({ open, onClose, sprint, issues, futureSprints, onCompleted }) {
  const [moveTo, setMoveTo] = useState("backlog");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const parents = issues.filter((i) => i.type !== "Sub-task" && i.type !== "Epic");
  const done = parents.filter((i) => i.status === "Done").length;
  const open_ = parents.length - done;

  async function complete() {
    setBusy(true);
    setError(null);
    try {
      await api.completeSprint(sprint.id, moveTo);
      onCompleted?.();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Complete ${sprint.name}`}>
      <div className="space-y-4 text-sm">
        <p>
          <span className="font-medium">{done}</span> issue{done === 1 ? "" : "s"} done ·{" "}
          <span className="font-medium">{open_}</span> not done
        </p>
        {open_ > 0 && (
          <Field label="Move unfinished issues to">
            <Select value={moveTo} onChange={(e) => setMoveTo(e.target.value)}>
              <option value="backlog">Backlog</option>
              {futureSprints.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
              <option value="new">New sprint</option>
            </Select>
          </Field>
        )}
        {error && <p className="text-danger">{error}</p>}
        <Button onClick={complete} disabled={busy} className="w-full">
          Complete sprint
        </Button>
      </div>
    </Modal>
  );
}

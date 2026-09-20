import { useState } from "react";
import { RotateCcw, Save } from "lucide-react";
import { useHRData } from "../context/HRDataContext";
import { LEAVE_TYPES } from "../data/leave";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { Field, Input, Select } from "../components/Input";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "09:30" <-> minutes past midnight, for <input type="time">. */
function minutesToTimeValue(minutes) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}
function timeValueToMinutes(value) {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Company policy settings, editable by HR and admins.
 *
 * Every value here used to be a constant in the source. The form is a
 * local draft that is only sent on Save, so a half-typed number never
 * briefly becomes the live rule for everyone.
 */
export default function Settings() {
  const data = useHRData();
  const [draft, setDraft] = useState(() => structuredClone(data.settings));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  function set(field, value) {
    setSaved(false);
    setDraft((d) => ({ ...d, [field]: value }));
  }

  function setAccrual(type, key, value) {
    setSaved(false);
    setDraft((d) => ({
      ...d,
      leaveAccrual: { ...d.leaveAccrual, [type]: { ...d.leaveAccrual[type], [key]: value } },
    }));
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await data.updateSettings(draft);
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    setBusy(true);
    setError(null);
    try {
      await data.resetSettings();
      setDraft(structuredClone(data.settings));
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Company policy rules. Changes apply to everyone immediately.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={reset} disabled={busy}>
            <RotateCcw className="h-4 w-4" /> Reset to defaults
          </Button>
          <Button onClick={save} disabled={busy}>
            <Save className="h-4 w-4" /> Save changes
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">{error}</div>
      )}
      {saved && !error && (
        <div className="rounded-xl border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">
          Settings saved. Leave balances have been recalculated.
        </div>
      )}

      <Card title="Leave accrual">
        <p className="text-sm text-muted-foreground">
          Leave is earned month by month. The cap is the most that can accrue in one leave year.
        </p>
        <div className="mt-4 space-y-4">
          {LEAVE_TYPES.map((t) => (
            <div key={t.id} className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
              <p className="text-sm font-medium">{t.name}</p>
              <Field label="Days per month">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={draft.leaveAccrual[t.id].perMonth}
                  onChange={(e) => setAccrual(t.id, "perMonth", Number(e.target.value))}
                  className="sm:w-32"
                />
              </Field>
              <Field label="Yearly cap">
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  value={draft.leaveAccrual[t.id].annualCap}
                  onChange={(e) => setAccrual(t.id, "annualCap", Number(e.target.value))}
                  className="sm:w-32"
                />
              </Field>
            </div>
          ))}
        </div>
        <div className="mt-5 border-t border-border pt-4">
          <Field label="Leave year starts in">
            <Select
              value={draft.leaveYearStartMonth}
              onChange={(e) => set("leaveYearStartMonth", Number(e.target.value))}
              className="sm:w-56"
            >
              {MONTHS.map((name, i) => (
                <option key={name} value={i + 1}>
                  {name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>

      <Card title="Probation">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Default probation length (months)">
            <Input
              type="number"
              min="0"
              max="24"
              value={draft.probationMonths}
              onChange={(e) => set("probationMonths", Number(e.target.value))}
            />
          </Field>
          <Field label="Leave during probation">
            <Select
              value={draft.leaveAllowedDuringProbation ? "yes" : "no"}
              onChange={(e) => set("leaveAllowedDuringProbation", e.target.value === "yes")}
            >
              <option value="no">Accrues, but cannot be availed</option>
              <option value="yes">Can be availed</option>
            </Select>
          </Field>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Confirming an employee stays a manual step — this only sets the default end date for new hires.
        </p>
      </Card>

      <Card title="Work from home">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Days per week (confirmed employees)">
            <Input
              type="number"
              min="0"
              max="7"
              value={draft.wfhWeeklyQuota}
              onChange={(e) => set("wfhWeeklyQuota", Number(e.target.value))}
            />
          </Field>
          <Field label="Days per month (on probation)">
            <Input
              type="number"
              min="0"
              max="31"
              value={draft.wfhProbationMonthlyQuota}
              onChange={(e) => set("wfhProbationMonthlyQuota", Number(e.target.value))}
            />
          </Field>
        </div>
      </Card>

      <Card title="Working hours">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Check in by">
            <Input
              type="time"
              value={minutesToTimeValue(draft.checkInByMinutes)}
              onChange={(e) => set("checkInByMinutes", timeValueToMinutes(e.target.value))}
            />
          </Field>
          <Field label="Check out from">
            <Input
              type="time"
              value={minutesToTimeValue(draft.checkOutFromMinutes)}
              onChange={(e) => set("checkOutFromMinutes", timeValueToMinutes(e.target.value))}
            />
          </Field>
          <Field label="Emergency exceptions per month">
            <Input
              type="number"
              min="0"
              max="31"
              value={draft.emergencyExceptionsPerMonth}
              onChange={(e) => set("emergencyExceptionsPerMonth", Number(e.target.value))}
            />
          </Field>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          A late check-in or early check-out is recorded and flagged, not refused. Employees can excuse that
          many days each month.
        </p>
      </Card>
    </div>
  );
}

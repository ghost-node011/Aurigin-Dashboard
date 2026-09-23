import { useState } from "react";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { useHRData } from "../context/HRDataContext";
import { Card } from "./Card";
import { Button } from "./Button";
import { Field, Input } from "./Input";

/**
 * Probation status, and — for HR/admin only — the controls to set it.
 *
 * Confirmation is deliberately a manual action rather than something that
 * trips automatically when the end date passes: Handbook §4.5 makes
 * confirmation subject to assessment and formal communication, and the
 * period can be extended or curtailed.
 */
export function ProbationCard({ employee, canManage }) {
  const data = useHRData();
  const [endDate, setEndDate] = useState(employee.probationEndDate ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const onProbation = employee.employmentStatus === "Probation";

  async function run(status, date) {
    setBusy(true);
    setError(null);
    try {
      await data.setProbation(employee.id, status, date || undefined);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="Probation">
      <div className="flex items-start gap-3">
        {onProbation ? (
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
        ) : (
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">
            {onProbation ? "On probation" : "Confirmed"}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {onProbation
              ? `Until ${employee.probationEndDate ?? "—"}. ${data.settings.leaveAllowedDuringProbation ? "Leave can be availed" : "Leave accrues but can't be availed"}.`
              : employee.confirmedOn
                ? `Confirmed on ${employee.confirmedOn}.`
                : "Full leave and work-from-home entitlements apply."}
          </p>
        </div>
      </div>

      {canManage && (
        <div className="mt-4 space-y-3 border-t border-border pt-4">
          <Field label="Probation end date">
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </Field>
          <div className="flex flex-wrap gap-2">
            {onProbation ? (
              <>
                <Button size="sm" onClick={() => run("Confirmed", endDate)} disabled={busy}>
                  Confirm employee
                </Button>
                <Button size="sm" variant="outline" onClick={() => run("Probation", endDate)} disabled={busy || !endDate}>
                  Update end date
                </Button>
              </>
            ) : (
              <Button size="sm" variant="outline" onClick={() => run("Probation", endDate)} disabled={busy}>
                Place on probation
              </Button>
            )}
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
        </div>
      )}
    </Card>
  );
}

import { useState } from "react";
import { useHRData } from "../../context/HRDataContext";
import { workReportersOf } from "../../data/work";
import { Card } from "../Card";
import { Avatar } from "../Avatar";
import { Button } from "../Button";

/**
 * Who oversees this person's tickets, day plans and performance. Admins
 * and the manager are always included; HR/admin can add others.
 */
export function WorkReportersCard({ employee, canManage, isAdmin }) {
  const data = useHRData();
  const [pmBusy, setPmBusy] = useState(false);
  const reporters = workReportersOf(employee, data.employees);
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState(employee.workReporterIds ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const fixedIds = new Set(reporters.filter((r) => r.fixed).map((r) => r.employee.id));
  const candidates = data.employees.filter((e) => e.id !== employee.id && !fixedIds.has(e.id));

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await data.setWorkReporters(employee.id, selected);
      setEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card
      title="Work reporters"
      action={
        canManage && !editing ? (
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            Edit
          </Button>
        ) : null
      }
    >
      <ul className="space-y-2.5">
        {reporters.map(({ employee: r, fixed }) => (
          <li key={r.id} className="flex items-center gap-2.5 text-sm">
            <Avatar employee={r} size="sm" />
            <span className="flex-1">{r.name}</span>
            <span className="text-xs text-muted-foreground">
              {fixed ? (r.role === "admin" ? "Administrator" : "Manager") : "Added"}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted-foreground">
        Reporters are on every ticket planned for {employee.name.split(" ")[0]} and can see their day plans and
        performance.
      </p>

      {isAdmin && employee.role !== "admin" && (
        <label className="mt-4 flex items-start gap-2 border-t border-border pt-4 text-sm">
          <input
            type="checkbox"
            checked={Boolean(employee.policyExempt)}
            disabled={pmBusy}
            onChange={async (e) => {
              setPmBusy(true);
              try {
                await data.setPolicyExempt(employee.id, e.target.checked);
              } finally {
                setPmBusy(false);
              }
            }}
            className="mt-0.5 h-4 w-4 accent-primary"
          />
          <span>
            Test account — check-in hours, weekends and leave rules don't apply
            <span className="block text-xs text-muted-foreground">For trying every flow. Don't use for a real employee.</span>
          </span>
        </label>
      )}

      {(isAdmin || employee.canManageProjects) && employee.role !== "admin" && (
        <label className="mt-4 flex items-center gap-2 border-t border-border pt-4 text-sm">
          <input
            type="checkbox"
            checked={Boolean(employee.canManageProjects)}
            disabled={!isAdmin || pmBusy}
            onChange={async (e) => {
              setPmBusy(true);
              try {
                await data.setProjectManager(employee.id, e.target.checked);
              } finally {
                setPmBusy(false);
              }
            }}
            className="h-4 w-4 accent-primary"
          />
          Project manager — can create and manage work projects
        </label>
      )}

      {(isAdmin || employee.canManageBni) && employee.role !== "admin" && (
        <label className="mt-4 flex items-start gap-2 border-t border-border pt-4 text-sm">
          <input
            type="checkbox"
            checked={Boolean(employee.canManageBni)}
            disabled={!isAdmin || pmBusy}
            onChange={async (e) => {
              setPmBusy(true);
              try {
                await data.setBniAccess(employee.id, e.target.checked);
              } finally {
                setPmBusy(false);
              }
            }}
            className="mt-0.5 h-4 w-4 accent-primary"
            data-testid="bni-access-toggle"
          />
          <span>
            BNI directory — can view BNI members and remove them
            <span className="block text-xs text-muted-foreground">No export, email sending or email reports; those stay with admins.</span>
          </span>
        </label>
      )}

      {editing && (
        <div className="mt-4 space-y-2 border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">Also report to:</p>
          {candidates.map((c) => (
            <label key={c.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selected.includes(c.id)}
                onChange={(e) =>
                  setSelected((s) => (e.target.checked ? [...s, c.id] : s.filter((id) => id !== c.id)))
                }
                className="h-4 w-4 accent-primary"
              />
              {c.name}
            </label>
          ))}
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button size="sm" variant="outline" onClick={() => setEditing(false)} disabled={busy}>
              Cancel
            </Button>
            <Button size="sm" onClick={save} disabled={busy}>
              Save
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

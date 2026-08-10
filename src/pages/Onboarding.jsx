import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Circle, Clock, PartyPopper, Plus, Mail, CheckCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useHRData } from "../context/HRDataContext";
import { DEPARTMENTS } from "../data/departments";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Avatar } from "../components/Avatar";
import { Button } from "../components/Button";
import { Modal } from "../components/Modal";
import { Field, Input, Select } from "../components/Input";
import { todayISO } from "../lib/date";
import { cn } from "../lib/cn";

const CATEGORIES = ["Documentation", "IT Setup", "Training", "Culture"];
const NEXT_STATUS = { Pending: "In Progress", "In Progress": "Done", Done: "Pending" };
const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Contract"];

export default function Onboarding() {
  const { currentUser } = useAuth();
  const data = useHRData();
  const [addOpen, setAddOpen] = useState(false);
  const [justCreated, setJustCreated] = useState(null);

  const canAddHire = ["hr", "admin"].includes(currentUser.role);

  const myPlan = data.onboardingPlans[currentUser.id];
  const reports = data.getAllReports(currentUser.id);
  const isManagerLike = ["manager", "hr", "admin"].includes(currentUser.role);

  const scopeIds = ["hr", "admin"].includes(currentUser.role)
    ? data.employees.filter((e) => e.status === "Onboarding").map((e) => e.id)
    : reports.filter((r) => r.status === "Onboarding").map((r) => r.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Onboarding</h1>
          <p className="mt-1 text-sm text-muted-foreground">Get new joiners set up and settled in.</p>
        </div>
        {canAddHire && (
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> Add new hire
          </Button>
        )}
      </div>

      {justCreated && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary-soft p-4">
          <div className="flex items-center gap-3">
            <Avatar employee={justCreated} size="default" />
            <div>
              <p className="text-sm font-medium">{justCreated.name} has been added and is ready to onboard.</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-primary">
                <Mail className="h-3.5 w-3.5" /> {justCreated.email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to={`/directory/${justCreated.id}`}>
              <Button size="sm" variant="outline">
                View profile
              </Button>
            </Link>
            <button type="button" onClick={() => setJustCreated(null)} className="text-xs text-muted-foreground hover:text-foreground">
              Dismiss
            </button>
          </div>
        </div>
      )}

      {myPlan && (
        <Card title="Your onboarding checklist">
          <ChecklistByCategory
            plan={myPlan}
            onToggle={(taskId, status) => data.updateOnboardingTask(currentUser.id, taskId, status)}
          />
        </Card>
      )}

      {isManagerLike && scopeIds.length > 0 && (
        <div className="space-y-6">
          <h2 className="font-display text-xl font-semibold">
            {["hr", "admin"].includes(currentUser.role) ? "All new hires" : "Your team's new hires"}
          </h2>
          {scopeIds.map((id) => {
            const employee = data.employees.find((e) => e.id === id);
            const plan = data.onboardingPlans[id];
            const done = plan.filter((t) => t.status === "Done").length;
            const complete = done === plan.length;
            return (
              <Card
                key={id}
                title={
                  <span className="flex items-center gap-2">
                    <Avatar employee={employee} size="sm" /> {employee.name}
                    <span className="font-sans text-xs font-normal text-muted-foreground">{employee.title}</span>
                  </span>
                }
                action={
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{done} / {plan.length} done</span>
                    {canAddHire && (
                      <Button size="sm" variant="outline" disabled={!complete} onClick={() => data.completeOnboarding(id)}>
                        <CheckCheck className="h-3.5 w-3.5" /> Mark active
                      </Button>
                    )}
                  </div>
                }
              >
                <ChecklistByCategory plan={plan} onToggle={(taskId, status) => data.updateOnboardingTask(id, taskId, status)} />
              </Card>
            );
          })}
        </div>
      )}

      {!myPlan && (!isManagerLike || scopeIds.length === 0) && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
          <PartyPopper className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {isManagerLike ? "No one on your team is currently onboarding." : "You're all set — nothing to onboard here."}
          </p>
        </div>
      )}

      <AddNewHireModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        employees={data.employees}
        onSubmit={(input) => {
          const created = data.addEmployee(input);
          setJustCreated(created);
          setAddOpen(false);
        }}
      />
    </div>
  );
}

function AddNewHireModal({ open, onClose, employees, onSubmit }) {
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState(DEPARTMENTS[0].id);
  const [managerId, setManagerId] = useState("");
  const [employmentType, setEmploymentType] = useState(EMPLOYMENT_TYPES[0]);
  const [location, setLocation] = useState("");
  const [dateOfJoining, setDateOfJoining] = useState(todayISO());

  const canSubmit = name.trim().length > 0 && title.trim().length > 0 && location.trim().length > 0;

  function reset() {
    setName("");
    setTitle("");
    setDepartment(DEPARTMENTS[0].id);
    setManagerId("");
    setEmploymentType(EMPLOYMENT_TYPES[0]);
    setLocation("");
    setDateOfJoining(todayISO());
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({
      name: name.trim(),
      title: title.trim(),
      department,
      managerId: managerId || null,
      employmentType,
      location: location.trim(),
      dateOfJoining,
    });
    reset();
  }

  return (
    <Modal open={open} onClose={onClose} title="Add a new hire">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Full name" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
        </Field>
        <Field label="Job title" required>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Product Marketing Associate" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Department" required>
            <Select value={department} onChange={(e) => setDepartment(e.target.value)}>
              {DEPARTMENTS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Reports to">
            <Select value={managerId} onChange={(e) => setManagerId(e.target.value)}>
              <option value="">No manager</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Employment type" required>
            <Select value={employmentType} onChange={(e) => setEmploymentType(e.target.value)}>
              {EMPLOYMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Date of joining" required>
            <Input type="date" value={dateOfJoining} onChange={(e) => setDateOfJoining(e.target.value)} />
          </Field>
        </div>
        <Field label="Location" required>
          <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Mumbai, IN" />
        </Field>
        <p className="text-xs text-muted-foreground">
          A company email and the standard onboarding checklist are generated automatically.
        </p>
        <Button type="submit" disabled={!canSubmit} className="w-full">
          Create employee record
        </Button>
      </form>
    </Modal>
  );
}

function ChecklistByCategory({ plan, onToggle }) {
  const done = plan.filter((t) => t.status === "Done").length;
  const pct = Math.round((done / plan.length) * 100);

  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
        <span className="shrink-0 text-sm font-medium">{pct}%</span>
      </div>

      <div className="space-y-5">
        {CATEGORIES.map((category) => {
          const tasks = plan.filter((t) => t.category === category);
          if (tasks.length === 0) return null;
          return (
            <div key={category}>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{category}</p>
              <div className="space-y-1.5">
                {tasks.map((task) => (
                  <TaskRow key={task.id} task={task} onClick={() => onToggle(task.id, NEXT_STATUS[task.status])} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TaskRow({ task, onClick }) {
  const Icon = task.status === "Done" ? CheckCircle2 : task.status === "In Progress" ? Clock : Circle;
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition hover:bg-surface-muted"
    >
      <Icon
        className={cn(
          "h-4 w-4 shrink-0",
          task.status === "Done" && "text-success",
          task.status === "In Progress" && "text-warning",
          task.status === "Pending" && "text-muted-foreground",
        )}
      />
      <span className={cn("flex-1 text-sm", task.status === "Done" && "text-muted-foreground line-through")}>
        {task.title}
      </span>
      <Badge>{task.status}</Badge>
    </button>
  );
}

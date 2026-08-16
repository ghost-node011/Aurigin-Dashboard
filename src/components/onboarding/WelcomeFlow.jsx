import { useState } from "react";
import { PartyPopper, Users, ShieldCheck, ChevronRight, ChevronLeft, Check } from "lucide-react";
import { useHRData } from "../../context/HRDataContext";
import { POLICIES } from "../../data/policies";
import { WELCOME_MEET_TEAM_TITLE, WELCOME_POLICIES_TITLE } from "../../data/onboarding";
import { Avatar } from "../Avatar";
import { Button } from "../Button";
import { cn } from "../../lib/cn";

const STEPS = ["greeting", "team", "policies", "done"];
const STEP_LABELS = { greeting: "Welcome", team: "Meet the team", policies: "Policies", done: "Done" };

export function WelcomeFlow({ employee }) {
  const data = useHRData();
  const [stepIndex, setStepIndex] = useState(0);
  const step = STEPS[stepIndex];

  const plan = data.onboardingPlans[employee.id] ?? [];
  const meetTeamTask = plan.find((t) => t.title === WELCOME_MEET_TEAM_TITLE);
  const policiesTask = plan.find((t) => t.title === WELCOME_POLICIES_TITLE);

  function goNext() {
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }

  function completeTeamStep() {
    if (meetTeamTask && meetTeamTask.status !== "Done") {
      data.updateOnboardingTask(employee.id, meetTeamTask.id, "Done");
    }
    goNext();
  }

  // The gate that keeps this flow mounted (see AppLayout) is "both Welcome
  // tasks done" — so the policies task is only marked Done once the person
  // clicks through on the Done screen, not the instant they finish reading,
  // otherwise the flow would unmount itself before they ever see it.
  function finishPolicies() {
    goNext();
  }

  function exitToApp() {
    if (policiesTask && policiesTask.status !== "Done") {
      data.updateOnboardingTask(employee.id, policiesTask.id, "Done");
    }
  }

  return (
    <div className="h-screen overflow-y-auto bg-background">
      <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-6 py-10">
        <WizardProgress stepIndex={stepIndex} />

        <div className="mt-10 flex flex-1 flex-col">
          {step === "greeting" && <GreetingStep employee={employee} onNext={goNext} />}
          {step === "team" && <MeetTeamStep employee={employee} data={data} onNext={completeTeamStep} />}
          {step === "policies" && <PoliciesStep onNext={finishPolicies} />}
          {step === "done" && <DoneStep employee={employee} onFinish={exitToApp} />}
        </div>
      </div>
    </div>
  );
}

function WizardProgress({ stepIndex }) {
  return (
    <div className="flex items-center">
      {STEPS.map((s, i) => (
        <div key={s} className="flex flex-1 items-center last:flex-none">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                i < stepIndex
                  ? "bg-success text-white"
                  : i === stepIndex
                    ? "bg-primary text-primary-foreground"
                    : "bg-surface-muted text-muted-foreground",
              )}
            >
              {i < stepIndex ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </div>
            <span className={cn("hidden text-xs font-medium sm:block", i === stepIndex ? "text-foreground" : "text-muted-foreground")}>
              {STEP_LABELS[s]}
            </span>
          </div>
          {i < STEPS.length - 1 && <div className={cn("mx-3 h-px flex-1", i < stepIndex ? "bg-success" : "bg-border")} />}
        </div>
      ))}
    </div>
  );
}

function GreetingStep({ employee, onNext }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <img src="/logo.png" alt="" className="h-16 w-16 rounded-2xl object-cover" />
      <p className="mt-6 text-sm font-medium text-primary">Welcome to Aurigin Media</p>
      <h1 className="mt-2 font-display text-4xl font-semibold">
        Hey {employee.name.split(" ")[0]}, we're glad you're here.
      </h1>
      <p className="mt-4 max-w-md text-sm text-muted-foreground">
        You're joining as <span className="font-medium text-foreground">{employee.title}</span>. Before you dive in,
        let's introduce you to the team and walk through a few company policies — it only takes a few minutes.
      </p>
      <Button size="lg" className="mt-8" onClick={onNext}>
        Let's get started <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

function MeetTeamStep({ employee, data, onNext }) {
  const manager = employee.managerId ? data.getEmployee(employee.managerId) : null;
  const peers = manager ? data.getDirectReports(manager.id).filter((e) => e.id !== employee.id) : [];
  const leadership = data.employees.filter(
    (e) => e.managerId === null && e.id !== employee.id && e.id !== manager?.id,
  );
  const noTeamYet = !manager && peers.length === 0 && leadership.length === 0;

  return (
    <div className="flex flex-1 flex-col">
      <div className="text-center">
        <Users className="mx-auto h-8 w-8 text-primary" />
        <h2 className="mt-3 font-display text-2xl font-semibold">Meet your team</h2>
        <p className="mt-1 text-sm text-muted-foreground">Here's who you'll be working with at Aurigin Media.</p>
      </div>

      <div className="mt-8 flex-1 space-y-6">
        {manager && <TeamGroup label="Your manager" people={[manager]} />}
        {peers.length > 0 && <TeamGroup label="Your teammates" people={peers} />}
        {leadership.length > 0 && <TeamGroup label="Leadership" people={leadership} />}
        {noTeamYet && (
          <p className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
            You're one of the first people here — more introductions to come.
          </p>
        )}
      </div>

      <div className="mt-10 flex justify-center">
        <Button size="lg" onClick={onNext}>
          Continue <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function TeamGroup({ label, people }) {
  return (
    <div>
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {people.map((p) => (
          <div key={p.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4">
            <Avatar employee={p} size="lg" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{p.name}</p>
              <p className="truncate text-xs text-muted-foreground">{p.title}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PoliciesStep({ onNext }) {
  const [policyIndex, setPolicyIndex] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const [acked, setAcked] = useState(() => new Set());

  const policy = POLICIES[policyIndex];
  const page = policy.pages[pageIndex];
  const pageKey = `${policyIndex}:${pageIndex}`;
  const isPageAcked = acked.has(pageKey);
  const isFirstPageOverall = policyIndex === 0 && pageIndex === 0;
  const isLastPageOfPolicy = pageIndex === policy.pages.length - 1;
  const isLastPolicy = policyIndex === POLICIES.length - 1;

  function toggleAck() {
    setAcked((s) => {
      const next = new Set(s);
      if (next.has(pageKey)) next.delete(pageKey);
      else next.add(pageKey);
      return next;
    });
  }

  function goPrevPage() {
    if (pageIndex > 0) {
      setPageIndex((i) => i - 1);
    } else if (policyIndex > 0) {
      setPolicyIndex((i) => i - 1);
      setPageIndex(POLICIES[policyIndex - 1].pages.length - 1);
    }
  }

  function goNextPage() {
    if (!isPageAcked) return;
    if (!isLastPageOfPolicy) {
      setPageIndex((i) => i + 1);
    } else if (!isLastPolicy) {
      setPolicyIndex((i) => i + 1);
      setPageIndex(0);
    } else {
      onNext();
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="text-center">
        <ShieldCheck className="mx-auto h-8 w-8 text-primary" />
        <h2 className="mt-3 font-display text-2xl font-semibold">Company policies</h2>
        <p className="mt-1 text-sm text-muted-foreground">Please read and acknowledge each page before continuing.</p>
      </div>

      <div className="mt-8 grid flex-1 gap-4 md:grid-cols-[180px_1fr]">
        <div className="flex gap-2 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0">
          {POLICIES.map((p, i) => {
            const ackedCount = p.pages.filter((_, pi) => acked.has(`${i}:${pi}`)).length;
            const complete = ackedCount === p.pages.length;
            return (
              <div
                key={p.id}
                className={cn(
                  "shrink-0 rounded-lg border px-3 py-2.5 text-xs",
                  i === policyIndex ? "border-primary bg-primary-soft text-primary" : "border-border text-muted-foreground",
                )}
              >
                <div className="flex items-center gap-1.5 font-medium">
                  {complete && <Check className="h-3 w-3 shrink-0 text-success" />}
                  <span className="truncate">{p.title}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col rounded-2xl border border-border bg-surface p-6">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {policy.title} · Page {pageIndex + 1} of {policy.pages.length}
          </p>
          <h3 className="mt-2 font-display text-lg font-semibold">{page.heading}</h3>
          <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{page.body}</p>

          <label className="mt-6 flex cursor-pointer items-start gap-2.5 rounded-lg border border-border p-3 text-sm">
            <input
              type="checkbox"
              checked={isPageAcked}
              onChange={toggleAck}
              className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
            />
            I have read and understood this page.
          </label>

          <div className="mt-6 flex items-center justify-between">
            <Button variant="outline" onClick={goPrevPage} disabled={isFirstPageOverall}>
              <ChevronLeft className="h-4 w-4" /> Back
            </Button>
            <Button onClick={goNextPage} disabled={!isPageAcked}>
              {isLastPageOfPolicy && isLastPolicy ? "Finish" : "Next"} <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DoneStep({ employee, onFinish }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <PartyPopper className="h-10 w-10 text-primary" />
      <h2 className="mt-4 font-display text-3xl font-semibold">You're all set, {employee.name.split(" ")[0]}!</h2>
      <p className="mt-3 max-w-md text-sm text-muted-foreground">
        You've met the team and acknowledged our company policies. HR will follow up on the rest of your setup —
        you can track it anytime from the Onboarding page.
      </p>
      <Button size="lg" className="mt-8" onClick={onFinish}>
        Go to dashboard
      </Button>
    </div>
  );
}

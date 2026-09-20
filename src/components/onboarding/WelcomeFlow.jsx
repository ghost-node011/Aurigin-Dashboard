import { lazy, Suspense, useCallback, useState } from "react";
import { PartyPopper, Users, ShieldCheck, ChevronRight, Check } from "lucide-react";
import { useHRData } from "../../context/HRDataContext";
import { HANDBOOK, HANDBOOK_SECTIONS, ACKNOWLEDGEMENT_TEXT, handbookUrl } from "../../data/policies";
import { WELCOME_MEET_TEAM_TITLE, WELCOME_POLICIES_TITLE } from "../../data/onboarding";
// PDF.js is ~1.3MB of worker plus renderer and is only needed on this one
// onboarding step, so it loads on demand rather than in the main bundle.
const HandbookViewer = lazy(() =>
  import("../HandbookViewer").then((m) => ({ default: m.HandbookViewer })),
);
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
      <img src="/logo-mark.png" alt="" className="h-16 w-16 object-contain" />
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
  // The handbook is the document people actually sign, so it's shown as
  // the PDF itself rather than re-typed into the app. Acknowledgement
  // unlocks only once the reader has scrolled to the final page — see
  // HandbookViewer for why that needs a real renderer and not an iframe.
  const [reachedEnd, setReachedEnd] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [jumpToPage, setJumpToPage] = useState(null);

  const onReachedEnd = useCallback(() => setReachedEnd(true), []);

  return (
    <div className="flex flex-1 flex-col">
      <div className="text-center">
        <ShieldCheck className="mx-auto h-8 w-8 text-primary" />
        <h2 className="mt-3 font-display text-2xl font-semibold">Company policies</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Read the {HANDBOOK.title} to the end, then acknowledge it below.
        </p>
      </div>

      <div className="mt-6 grid flex-1 gap-4 md:grid-cols-[210px_1fr]">
        <div className="flex max-h-[30rem] flex-col gap-1 overflow-y-auto pr-1">
          <p className="px-1 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Jump to section
          </p>
          {HANDBOOK_SECTIONS.map((sec) => (
            <button
              key={sec.n}
              type="button"
              onClick={() => setJumpToPage(sec.page)}
              className="rounded-lg px-2.5 py-2 text-left text-xs text-muted-foreground transition hover:bg-muted"
            >
              <span className="tabular-nums opacity-60">{sec.n}.</span> {sec.title}
            </button>
          ))}
        </div>

        <div className="flex min-w-0 flex-col rounded-2xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between gap-3 pb-3">
            <p className="truncate text-xs text-muted-foreground">
              {HANDBOOK.version} · {HANDBOOK.pageCount} pages
            </p>
            <a
              href={handbookUrl()}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 text-xs font-medium text-primary hover:underline"
            >
              Download
            </a>
          </div>

          <Suspense
            fallback={
              <div className="flex h-[26rem] items-center justify-center rounded-lg border border-border bg-muted">
                <p className="text-sm text-muted-foreground">Loading the handbook…</p>
              </div>
            }
          >
            <HandbookViewer
              file={HANDBOOK.file}
              jumpToPage={jumpToPage}
              onReachedEnd={onReachedEnd}
              className="h-[26rem] overflow-y-auto rounded-lg border border-border bg-muted"
            />
          </Suspense>

          <label
            className={cn(
              "mt-4 flex items-start gap-2.5 rounded-lg border p-3 text-sm transition",
              reachedEnd ? "cursor-pointer border-border" : "cursor-not-allowed border-border opacity-60",
            )}
          >
            <input
              type="checkbox"
              checked={agreed}
              disabled={!reachedEnd}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
            />
            {ACKNOWLEDGEMENT_TEXT}
          </label>

          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {reachedEnd ? (
                <span className="inline-flex items-center gap-1 text-success">
                  <Check className="h-3.5 w-3.5" /> You've reached the end of the handbook.
                </span>
              ) : (
                `Scroll to page ${HANDBOOK.pageCount} to enable acknowledgement.`
              )}
            </p>
            <Button onClick={onNext} disabled={!agreed}>
              Acknowledge &amp; continue <ChevronRight className="h-4 w-4" />
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

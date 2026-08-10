export const ONBOARDING_TASK_TEMPLATE = [
  { category: "Documentation", title: "Sign offer letter & employment contract", owner: "hr" },
  { category: "Documentation", title: "Submit ID proof & address verification", owner: "hr" },
  { category: "Documentation", title: "Submit PAN & bank details for payroll", owner: "hr" },
  { category: "IT Setup", title: "Laptop & equipment issued", owner: "it" },
  { category: "IT Setup", title: "Company email & Slack account created", owner: "it" },
  { category: "IT Setup", title: "Access granted to internal tools", owner: "it" },
  { category: "Training", title: "Company policies & code of conduct walkthrough", owner: "hr" },
  { category: "Training", title: "Role-specific tools & process training", owner: "manager" },
  { category: "Training", title: "1:1 kickoff with reporting manager", owner: "manager" },
  { category: "Culture", title: "Buddy assigned & intro meeting", owner: "hr" },
  { category: "Culture", title: "Welcome kit delivered", owner: "hr" },
  { category: "Culture", title: "Team introduction on the company feed", owner: "manager" },
];

/** Builds a fresh onboarding checklist for a new hire — everything Pending. */
export function createOnboardingPlan(employeeId) {
  return ONBOARDING_TASK_TEMPLATE.map((task, i) => ({
    id: `${employeeId}-task-${i + 1}`,
    newHireId: employeeId,
    category: task.category,
    title: task.title,
    owner: task.owner,
    status: "Pending",
  }));
}

/** Seed-only: same as createOnboardingPlan but with the first `doneCount` tasks pre-completed, for demo data. */
function seedPlan(employeeId, doneCount) {
  return createOnboardingPlan(employeeId).map((task, i) => ({
    ...task,
    status: i < doneCount ? "Done" : i === doneCount ? "In Progress" : "Pending",
  }));
}

export const SEED_ONBOARDING_PLANS = {
  "tanvi-desai": seedPlan("tanvi-desai", 9),
  "devika-rane": seedPlan("devika-rane", 4),
};

export function computeOnboardingProgress(plan) {
  if (!plan || plan.length === 0) return 0;
  const done = plan.filter((t) => t.status === "Done").length;
  return Math.round((done / plan.length) * 100);
}

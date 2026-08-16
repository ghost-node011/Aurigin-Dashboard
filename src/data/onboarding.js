// Onboarding checklists now live in the backend (see
// aurigin-hr-backend/src/lib/constants.js for the task template) — this
// file only keeps what the UI itself needs: the titles WelcomeFlow looks
// up to mark its own steps done, and the progress-bar helper.
export const WELCOME_MEET_TEAM_TITLE = "Meet the team";
export const WELCOME_POLICIES_TITLE = "Read & acknowledge company policies";

export function computeOnboardingProgress(plan) {
  if (!plan || plan.length === 0) return 0;
  const done = plan.filter((t) => t.status === "Done").length;
  return Math.round((done / plan.length) * 100);
}

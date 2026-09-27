// Static metadata for issues, the board and "My Day". Issues, sprints,
// plans and reviews live in the backend.
import { Zap, BookOpen, CheckSquare, Bug, GitCommitHorizontal } from "lucide-react";

export const ISSUE_TYPES = ["Epic", "Story", "Task", "Bug", "Sub-task"];
export const ISSUE_STATUSES = ["To Do", "In Progress", "In Review", "Blocked", "Done"];
export const ISSUE_PRIORITIES = ["Lowest", "Low", "Medium", "High", "Highest"];

// Kept for the My Day timeline, which offers the same statuses.
export const TICKET_STATUSES = ISSUE_STATUSES;

export const TYPE_META = {
  Epic: { icon: Zap, color: "#7c3aed" },
  Story: { icon: BookOpen, color: "#16a34a" },
  Task: { icon: CheckSquare, color: "#2563eb" },
  Bug: { icon: Bug, color: "#dc2626" },
  "Sub-task": { icon: GitCommitHorizontal, color: "#0891b2" },
};

export const PRIORITY_COLOR = {
  Lowest: "#64748b",
  Low: "#0891b2",
  Medium: "#b45309",
  High: "#dc2626",
  Highest: "#991b1b",
};

export const LINK_TYPES = ["blocks", "is blocked by", "relates to", "duplicates", "is duplicated by", "clones", "is cloned by"];

export const RATING_TONE = {
  Outstanding: "success",
  Strong: "success",
  Steady: "info",
  "Needs attention": "warning",
};

/** "13:30" -> "1:30 PM". */
export function formatHHMM(value) {
  if (!value) return "";
  const [h, m] = value.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${period}`;
}

/** 95 -> "1h 35m". */
export function formatMinutes(minutes) {
  if (!minutes) return "0m";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return [h && `${h}h`, m && `${m}m`].filter(Boolean).join(" ");
}

/** "1h 30m", "2h", "45m" or "90" (minutes) -> minutes; null if unreadable. */
export function parseDuration(text) {
  const value = String(text ?? "").trim().toLowerCase();
  if (!value) return 0;
  if (/^\d+$/.test(value)) return Number(value);
  const match = /^(?:(\d+(?:\.\d+)?)\s*h)?\s*(?:(\d+)\s*m)?$/.exec(value);
  if (!match || (!match[1] && !match[2])) return null;
  return Math.round(Number(match[1] ?? 0) * 60 + Number(match[2] ?? 0));
}

/**
 * Who oversees `employee`'s work: every admin, their manager, then the
 * extras on their profile. Mirrors `workReportersFor` in the backend.
 * Returns `[{ employee, fixed }]`; `fixed` ones can't be removed.
 */
export function workReportersOf(employee, employees) {
  const byId = new Map(employees.map((e) => [e.id, e]));
  const fixed = [...employees.filter((e) => e.role === "admin").map((e) => e.id), employee.managerId];
  const seen = new Set();
  const out = [];
  for (const [id, isFixed] of [...fixed.map((id) => [id, true]), ...(employee.workReporterIds ?? []).map((id) => [id, false])]) {
    if (!id || id === employee.id || seen.has(id) || !byId.has(id)) continue;
    seen.add(id);
    out.push({ employee: byId.get(id), fixed: isFixed });
  }
  return out;
}

/**
 * Employees whose work `viewer` may look at: themselves, everyone for
 * HR/admin, otherwise their reporting line and anyone who lists them as a
 * work reporter. Mirrors the backend check.
 */
export function viewableEmployees(viewer, employees, getAllReports) {
  if (["hr", "admin"].includes(viewer.role)) return employees;
  const people = [viewer, ...getAllReports(viewer.id), ...employees.filter((e) => e.workReporterIds?.includes(viewer.id))];
  return [...new Map(people.map((p) => [p.id, p])).values()];
}

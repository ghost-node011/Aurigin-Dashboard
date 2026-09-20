export const WFH_WEEKLY_QUOTA = 2;

// Handbook §1.13 — remote work is an arrangement, not an entitlement.
// Employees still on probation get a monthly allowance instead of the
// confirmed-employee weekly one. The backend enforces this; the UI mirrors
// it so the allowance is visible before someone tries to spend it.
export const WFH_PROBATION_MONTHLY_QUOTA = 2;

/** True when this employee is still on probation (Handbook §4.5). */
export function isOnProbation(employee) {
  return employee?.employmentStatus === "Probation";
}

/** First and last ISO dates of the calendar month containing `iso`. */
export function monthRange(iso) {
  const pad = (n) => String(n).padStart(2, "0");
  const d = new Date(iso + "T00:00:00");
  const y = d.getFullYear();
  const m = d.getMonth();
  const last = new Date(y, m + 1, 0);
  return { start: `${y}-${pad(m + 1)}-01`, end: `${y}-${pad(m + 1)}-${pad(last.getDate())}` };
}

/** Distinct WFH dates claimed in the calendar month containing `iso`. */
export function getMonthlyWfhDates(wfhRequests, attendanceRecords, employeeId, iso) {
  const { start, end } = monthRange(iso);
  return getWeeklyWfhDates(wfhRequests, attendanceRecords, employeeId, start, end);
}

/**
 * Distinct WFH dates an employee has claimed within [weekStart, weekEnd].
 * Counts Pending + Approved requests (Pending reserves quota, same as
 * Leave), plus same-day "emergency" WFH marks that have no matching
 * request — those still count against the weekly allowance.
 */
export function getWeeklyWfhDates(wfhRequests, attendanceRecords, employeeId, weekStart, weekEnd) {
  const dates = new Set();
  for (const r of wfhRequests) {
    if (r.employeeId === employeeId && r.status !== "Rejected" && r.date >= weekStart && r.date <= weekEnd) {
      dates.add(r.date);
    }
  }
  for (const rec of attendanceRecords) {
    if (rec.employeeId === employeeId && rec.status === "WFH" && rec.date >= weekStart && rec.date <= weekEnd) {
      dates.add(rec.date);
    }
  }
  return dates;
}

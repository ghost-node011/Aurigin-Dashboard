export const WFH_WEEKLY_QUOTA = 2;

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

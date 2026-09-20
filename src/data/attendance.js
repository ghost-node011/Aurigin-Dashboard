// Attendance punctuality, mirrored from the backend (src/lib/constants.js).
// The backend is the authority — these exist so the rules can be shown and
// checked in the UI before someone tries to spend an exception.

/** Formats minutes past midnight as a display time, e.g. 660 -> "11:00 AM". */
export function minutesToLabel(minutes) {
  if (minutes == null) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

/** A day that broke a punctuality rule and hasn't been excused. */
export function isNonCompliant(record) {
  if (!record || record.emergency) return false;
  return Boolean(record.lateCheckIn || record.earlyCheckOut);
}

/** Short human label for why a day is flagged, or null when it's fine. */
export function punctualityLabel(record) {
  if (!record) return null;
  const issues = [];
  if (record.lateCheckIn) issues.push("Late in");
  if (record.earlyCheckOut) issues.push("Early out");
  if (issues.length === 0) return null;
  return record.emergency ? `${issues.join(" · ")} (excused)` : issues.join(" · ");
}

/** Emergency exceptions already used in the calendar month containing `iso`. */
export function emergenciesUsedInMonth(attendanceRecords, employeeId, iso) {
  const month = iso.slice(0, 7);
  return attendanceRecords.filter(
    (r) => r.employeeId === employeeId && r.emergency && r.date.slice(0, 7) === month,
  ).length;
}

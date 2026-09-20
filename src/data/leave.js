// Leave requests/balances live in the backend — this file only keeps the
// static leave-type metadata used to label and colour the UI.
//
// Entitlements are *earned monthly* rather than granted as a yearly
// bucket, so a balance shown in the app is what the person has accrued to
// date. The actual rates are company settings (HR can change them), so
// only names and colours live here.
export const LEAVE_TYPES = [
  { id: "casual", name: "Casual Leave", short: "CL", color: "#4338ca" },
  { id: "sick", name: "Sick Leave", short: "SL", color: "#b91c1c" },
  { id: "earned", name: "Earned Leave", short: "EL", color: "#15803d" },
];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** e.g. "1 April – 31 March", from the configured leave-year start month. */
export function leaveYearLabel(startMonth) {
  const start = MONTH_NAMES[(startMonth - 1) % 12];
  const endMonth = MONTH_NAMES[(startMonth + 10) % 12];
  return `1 ${start} – end of ${endMonth}`;
}

/** Formats an accrued figure without a trailing ".0" on whole days. */
export function formatDays(n) {
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

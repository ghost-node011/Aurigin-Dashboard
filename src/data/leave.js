// Leave requests/balances live in the backend — this file only keeps the
// static leave-type metadata used to label and colour the UI.
//
// Entitlements follow the Employee Handbook (§6.5–6.7) but are *earned
// monthly* rather than granted as a yearly bucket, so a balance shown in
// the app is what the person has accrued to date, not what they will have
// by 31 March. `perMonth` here is display-only; the backend is the
// authority on the actual numbers.
export const LEAVE_TYPES = [
  { id: "casual", name: "Casual Leave", short: "CL", perMonth: 7 / 12, annualCap: 7, color: "#4338ca" },
  { id: "sick", name: "Sick Leave", short: "SL", perMonth: 7 / 12, annualCap: 7, color: "#b91c1c" },
  { id: "earned", name: "Earned Leave", short: "EL", perMonth: 1.5, annualCap: 18, color: "#15803d" },
];

// Handbook §6.3 — the leave year runs 1 April to 31 March.
export const LEAVE_YEAR_LABEL = "1 April – 31 March";

/** Formats an accrued figure without a trailing ".0" on whole days. */
export function formatDays(n) {
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

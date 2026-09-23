// Leave requests/balances live in the backend — this file only keeps the
// static leave-type metadata used to label and colour the UI, plus the
// handbook conditions shown when applying.
//
// `accrues` types are *earned monthly* (Handbook §6.5–6.8), so their
// balance is what the person has accrued to date; the others are fixed
// allowances available in full each leave year. The actual numbers are
// company settings (HR can change them), so only names and conditions
// live here.
export const LEAVE_TYPES = [
  {
    id: "earned",
    name: "Earned Leave",
    short: "EL",
    color: "#15803d",
    accrues: true,
    note: "7 days' notice · at most 15 days at a stretch · up to 10 unused days carry forward (30 max).",
  },
  {
    id: "casual",
    name: "Casual Leave",
    short: "CL",
    color: "#4338ca",
    accrues: true,
    note: "2 days' notice, or a week for more than 2 days · lapses at year-end.",
  },
  {
    id: "sick",
    name: "Sick Leave",
    short: "SL",
    color: "#b91c1c",
    accrues: true,
    note: "Inform your manager as soon as possible · a medical certificate may be asked for after 3 continuous days.",
  },
  {
    id: "menstrual",
    name: "Menstrual Leave",
    short: "ML",
    color: "#be185d",
    accrues: true,
    note: "Generally 1 day a month · can be clubbed with other leave · no carry forward.",
  },
  {
    id: "optional",
    name: "Optional Holiday",
    short: "OH",
    color: "#0e7490",
    accrues: false,
    note: "Needs prior approval · from the company holiday calendar.",
  },
  {
    id: "marriage",
    name: "Marriage Leave",
    short: "MRL",
    color: "#a16207",
    accrues: false,
    note: "Needs prior approval · use within 6 months of the marriage.",
  },
  {
    id: "paternity",
    name: "Paternity Leave",
    short: "PL",
    color: "#7c3aed",
    accrues: false,
    note: "Needs prior approval · taken at a stretch within 15 days of childbirth.",
  },
  {
    id: "lwp",
    name: "Leave Without Pay",
    short: "LWP",
    color: "#57534e",
    accrues: false,
    note: "Unpaid · exceptional circumstances only, with management approval.",
  },
];

export const ACCRUED_LEAVE_TYPES = LEAVE_TYPES.filter((t) => t.accrues);
export const ALLOWANCE_LEAVE_TYPES = LEAVE_TYPES.filter((t) => !t.accrues);

export function leaveTypeName(id) {
  return LEAVE_TYPES.find((t) => t.id === id)?.name ?? id;
}

/**
 * Days of notice a request needs (Handbook §6.5–6.6), mirroring the
 * backend so the form can ask about an emergency before submitting.
 */
export function requiredNoticeDays(type, days) {
  if (type === "earned") return 7;
  if (type === "casual") return days > 2 ? 7 : 2;
  return 0;
}

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

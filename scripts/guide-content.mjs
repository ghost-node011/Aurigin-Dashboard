// Turns raw settings into the phrases the guide prints, so the PDF's
// wording and the portal's rules can't drift apart.

/** Mirrors the backend's DEFAULT_SETTINGS — used when the API isn't reachable. */
export const DEFAULTS = {
  leaveYearStartMonth: 4,
  leaveAccrual: {
    earned: { perMonth: 1.5, annualCap: 18 },
    casual: { perMonth: 7 / 12, annualCap: 7 },
    sick: { perMonth: 7 / 12, annualCap: 7 },
  },
  probationMonths: 6,
  leaveAllowedDuringProbation: false,
  wfhWeeklyQuota: 2,
  wfhProbationMonthlyQuota: 2,
  checkInByMinutes: 10 * 60 + 30,
  checkOutFromMinutes: 18 * 60 + 30,
  enforceLateCheckIn: false,
  emergencyExceptionsPerMonth: 2,
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function time(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const period = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12}${period}` : `${h12}:${String(m).padStart(2, "0")}${period}`;
}

function days(n) {
  const rounded = Math.round(n * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/0$/, "");
}

function plural(n, one, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

export function describeSettings(s) {
  const accrual = s.leaveAccrual ?? DEFAULTS.leaveAccrual;
  const rate = (type) =>
    `${days(accrual[type].perMonth)} days a month, up to ${days(accrual[type].annualCap)} a year`;

  const startMonth = MONTHS[(s.leaveYearStartMonth - 1) % 12];
  const endMonth = MONTHS[(s.leaveYearStartMonth + 10) % 12];

  const probationLeave = s.leaveAllowedDuringProbation
    ? "You can take it during probation as normal."
    : "It can be taken once your probation is successfully completed.";

  const lateRule = s.enforceLateCheckIn
    ? `Arriving after ${time(s.checkInByMinutes)} is flagged.`
    : `Arriving after ${time(s.checkInByMinutes)} isn't held against you — the time is recorded, and that's all.`;

  return {
    checkInBy: time(s.checkInByMinutes),
    checkOutFrom: time(s.checkOutFromMinutes),
    hours: `${time(s.checkInByMinutes)} – ${time(s.checkOutFromMinutes)}`,
    lateRule,
    lateRuleShort: s.enforceLateCheckIn ? "Flagged" : "Recorded, not flagged",
    emergencies: plural(s.emergencyExceptionsPerMonth, "day"),
    leaveYear: `${startMonth} to ${endMonth}`,
    earned: rate("earned"),
    casual: rate("casual"),
    sick: rate("sick"),
    leaveSummary: `Earned leave accrues at ${days(accrual.earned.perMonth)} days a month, casual and sick at ${days(accrual.casual.perMonth)} each.`,
    probation: plural(s.probationMonths, "month"),
    probationLeave,
    probationLeaveShort: s.leaveAllowedDuringProbation
      ? "Can be availed"
      : "Accrues, but availed after confirmation",
    wfhWeekly: `${plural(s.wfhWeeklyQuota, "day")} a week`,
    wfhProbation:
      s.wfhProbationMonthlyQuota === 0
        ? "not available during probation"
        : `${plural(s.wfhProbationMonthlyQuota, "day")} a month`,
  };
}

import { SEED_EMPLOYEES } from "./employees";
import { addDays, toISODate, seededRandom, daysBetweenInclusive } from "../lib/date";

export const LEAVE_TYPES = [
  { id: "casual", name: "Casual Leave", short: "CL", annualQuota: 12, color: "#4338ca" },
  { id: "sick", name: "Sick Leave", short: "SL", annualQuota: 8, color: "#b91c1c" },
  { id: "earned", name: "Earned Leave", short: "EL", annualQuota: 15, color: "#15803d" },
];

function generateBalances(employeeId) {
  const rand = seededRandom(employeeId + ":leave");
  const balances = {};
  for (const type of LEAVE_TYPES) {
    const used = Math.round(rand() * type.annualQuota * 0.55);
    balances[type.id] = { quota: type.annualQuota, used };
  }
  return balances;
}

export const LEAVE_BALANCES = Object.fromEntries(SEED_EMPLOYEES.map((e) => [e.id, generateBalances(e.id)]));

const today = new Date();
function iso(offsetDays) {
  return toISODate(addDays(today, offsetDays));
}

function request(id, employeeId, type, startOffset, endOffset, status, reason, approverId, approverComment) {
  const startDate = iso(startOffset);
  const endDate = iso(endOffset);
  return {
    id,
    employeeId,
    type,
    startDate,
    endDate,
    days: daysBetweenInclusive(startDate, endDate),
    status,
    reason,
    appliedOn: iso(Math.min(startOffset, 0) - 2),
    approverId,
    approverComment: approverComment ?? null,
  };
}

export const LEAVE_REQUESTS = [
  request("lr-1", "gaurank-sharma", "casual", 5, 6, "Pending", "Family function back home", "udit"),
  request("lr-2", "avantika", "sick", 1, 1, "Pending", "Fever, resting at home", "arjun"),
  request(
    "lr-3",
    "aurigin-media-hr",
    "earned",
    -10,
    -8,
    "Approved",
    "Family trip",
    "arjun",
    "Enjoy the trip!",
  ),
];

export function getLeaveRequestsFor(employeeId) {
  return LEAVE_REQUESTS.filter((r) => r.employeeId === employeeId);
}

export function getPendingApprovalsFor(managerId) {
  return LEAVE_REQUESTS.filter((r) => r.approverId === managerId && r.status === "Pending");
}

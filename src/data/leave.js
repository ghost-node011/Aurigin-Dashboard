// Leave requests/balances now live in the backend — this file only keeps
// the static leave-type metadata used to label and color the UI.
export const LEAVE_TYPES = [
  { id: "casual", name: "Casual Leave", short: "CL", annualQuota: 12, color: "#4338ca" },
  { id: "sick", name: "Sick Leave", short: "SL", annualQuota: 8, color: "#b91c1c" },
  { id: "earned", name: "Earned Leave", short: "EL", annualQuota: 15, color: "#15803d" },
];

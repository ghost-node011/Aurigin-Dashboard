/** True when this employee is still on probation (Handbook §4.5). */
export function isOnProbation(employee) {
  return employee?.employmentStatus === "Probation";
}

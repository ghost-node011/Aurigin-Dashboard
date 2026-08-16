// Employee records now live in the backend (see aurigin-hr-backend) —
// HRDataContext fetches them at startup. This file only keeps the pure
// helpers that operate on whatever list is currently in state.
export function getEmployee(employees, id) {
  return employees.find((e) => e.id === id);
}

export function getDirectReports(employees, managerId) {
  return employees.filter((e) => e.managerId === managerId);
}

export function getAllReports(employees, managerId) {
  const direct = getDirectReports(employees, managerId);
  return direct.flatMap((e) => [e, ...getAllReports(employees, e.id)]);
}

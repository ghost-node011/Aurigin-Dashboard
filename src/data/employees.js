// System roles gate portal access: "admin" | "hr" | "manager" | "employee".
// managerId drives both the approval chain and the org chart.
//
// This is the SEED list only — HRDataContext copies it into mutable state at
// startup and is the source of truth from then on (HR can add new hires at
// runtime). Don't import EMPLOYEES elsewhere; use useHRData().employees.
export const SEED_EMPLOYEES = [
  {
    id: "udit",
    name: "Udit",
    email: "udit@auriginmedia.com",
    role: "admin",
    title: "Administrator",
    department: "leadership",
    managerId: null,
    location: "Remote",
    employmentType: "Full-time",
    status: "Active",
    dateOfJoining: "2026-08-10",
    phone: "",
    color: "#013fd2",
  },
  {
    id: "arjun",
    name: "Arjun",
    email: "arjun@auriginmedia.com",
    role: "admin",
    title: "Administrator",
    department: "leadership",
    managerId: null,
    location: "Remote",
    employmentType: "Full-time",
    status: "Active",
    dateOfJoining: "2026-08-10",
    phone: "",
    color: "#013fd2",
  },
  {
    id: "aurigin-media-hr",
    name: "Aurigin Media HR",
    email: "hr@auriginmedia.com",
    role: "hr",
    title: "HR",
    department: "hr",
    managerId: "arjun",
    location: "Remote",
    employmentType: "Full-time",
    status: "Active",
    dateOfJoining: "2026-08-10",
    phone: "",
    color: "#be3a0a",
  },
  {
    id: "avantika",
    name: "Avantika",
    email: "avantika@auriginmedia.com",
    role: "employee",
    title: "Team Member",
    department: "leadership",
    managerId: "arjun",
    location: "Remote",
    employmentType: "Full-time",
    status: "Active",
    dateOfJoining: "2026-08-10",
    phone: "",
    color: "#013fd2",
  },
  {
    id: "gaurank-sharma",
    name: "Gaurank Sharma",
    email: "gaurank@auriginmedia.com",
    role: "employee",
    title: "Full Stack Developer",
    department: "engineering",
    managerId: "udit",
    location: "Remote",
    employmentType: "Full-time",
    status: "Active",
    dateOfJoining: "2026-08-10",
    phone: "",
    color: "#0e7490",
  },
];

// These take the current employee list explicitly rather than closing over a
// module-level array, because the real list is mutable (HR adds new hires at
// runtime) and lives in HRDataContext — see getEmployee/getDirectReports/
// getAllReports bound versions exposed from useHRData().
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

export const DEPARTMENT_COLOR = {
  leadership: "#013fd2",
  engineering: "#0e7490",
  design: "#be185d",
  marketing: "#15803d",
  sales: "#b91c1c",
  hr: "#be3a0a",
};

export const DEMO_ACCOUNTS = [
  { id: "udit", blurb: "Full access — analytics, all approvals, company settings" },
  { id: "arjun", blurb: "Full access — analytics, all approvals, company settings" },
  { id: "aurigin-media-hr", blurb: "HR tools — onboarding, announcements, directory management" },
  { id: "gaurank-sharma", blurb: "Individual contributor — self service, kudos, onboarding" },
];

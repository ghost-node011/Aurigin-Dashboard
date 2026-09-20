const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";
const TOKEN_KEY = "aurigin-hr.token";

async function request(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });

  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    if (!path.startsWith("/auth/login")) window.location.assign("/login");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status} ${res.statusText}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

const post = (path, body) => request(path, { method: "POST", body: JSON.stringify(body) });
const patch = (path, body) => request(path, { method: "PATCH", body: JSON.stringify(body) });

export const api = {
  login: (email, password) => post("/auth/login", { email, password }),
  me: () => request("/auth/me"),
  changePassword: (currentPassword, newPassword) => post("/auth/change-password", { currentPassword, newPassword }),

  getEmployees: () => request("/employees"),
  addEmployee: (input) => post("/employees", input),
  completeOnboarding: (employeeId) => patch(`/employees/${employeeId}/complete-onboarding`, {}),
  setProbation: (employeeId, employmentStatus, probationEndDate) =>
    patch(`/employees/${employeeId}/probation`, { employmentStatus, probationEndDate }),

  getLeaveRequests: () => request("/leave-requests"),
  applyLeave: (input) => post("/leave-requests", input),
  decideLeave: (id, status, comment) => patch(`/leave-requests/${id}`, { status, comment }),

  getWfhRequests: () => request("/wfh-requests"),
  applyWfh: (input) => post("/wfh-requests", input),
  decideWfh: (id, status, comment) => patch(`/wfh-requests/${id}`, { status, comment }),

  getAttendance: () => request("/attendance"),
  checkIn: (employeeId) => post("/attendance/check-in", { employeeId }),
  checkOut: (employeeId) => post("/attendance/check-out", { employeeId }),
  markWfh: (employeeId) => post("/attendance/wfh", { employeeId }),
  claimEmergency: (employeeId, date, reason) => post("/attendance/emergency", { employeeId, date, reason }),

  getOnboardingTasks: () => request("/onboarding-tasks"),
  updateOnboardingTask: (taskId, status) => patch(`/onboarding-tasks/${taskId}`, { status }),

  getKudos: () => request("/kudos"),
  addKudos: (input) => post("/kudos", input),
  toggleLike: (kudosId, employeeId) => post(`/kudos/${kudosId}/like`, { employeeId }),

  getAnnouncements: () => request("/announcements"),
  addAnnouncement: (input) => post("/announcements", input),
};

export { TOKEN_KEY };

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

// Drops empty params so `?assignee=&status=` doesn't filter on "".
const clean = (query) => Object.fromEntries(Object.entries(query).filter(([, v]) => v !== "" && v != null));

const post = (path, body) => request(path, { method: "POST", body: JSON.stringify(body) });
const patch = (path, body) => request(path, { method: "PATCH", body: JSON.stringify(body) });

export const api = {
  login: (email, password) => post("/auth/login", { email, password }),
  me: () => request("/auth/me"),
  changePassword: (currentPassword, newPassword) => post("/auth/change-password", { currentPassword, newPassword }),

  getEmployees: () => request("/employees"),
  addEmployee: (input) => post("/employees", input),
  setWorkReporters: (employeeId, workReporterIds) =>
    patch(`/employees/${employeeId}/work-reporters`, { workReporterIds }),
  setPolicyExempt: (employeeId, policyExempt) => patch(`/employees/${employeeId}/policy-exempt`, { policyExempt }),
  setProjectManager: (employeeId, canManageProjects) =>
    patch(`/employees/${employeeId}/project-manager`, { canManageProjects }),
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
  updateOnboardingNote: (taskId, note) => patch(`/onboarding-tasks/${taskId}`, { note }),

  getKudos: () => request("/kudos"),
  addKudos: (input) => post("/kudos", input),
  toggleLike: (kudosId, employeeId) => post(`/kudos/${kudosId}/like`, { employeeId }),

  getSettings: () => request("/settings"),
  updateSettings: (input) => patch("/settings", input),
  resetSettings: () => post("/settings/reset", {}),

  getAnnouncements: () => request("/announcements"),
  addAnnouncement: (input) => post("/announcements", input),

  getProjects: () => request("/projects"),
  addProject: (input) => post("/projects", input),
  updateProject: (key, input) => patch(`/projects/${key}`, input),

  searchIssues: (query = {}) => request(`/issues?${new URLSearchParams(clean(query))}`),
  getIssueLabels: () => request("/issues/labels"),
  getIssue: (ref) => request(`/issues/${ref}`),
  addIssue: (input) => post("/issues", input),
  updateIssue: (ref, input) => patch(`/issues/${ref}`, input),
  deleteIssue: (ref) => request(`/issues/${ref}`, { method: "DELETE" }),
  bulkUpdateIssues: (issueIds, changes) => post("/issues/bulk", { issueIds, changes }),
  rankIssues: (issueIds, sprintId, inBacklog) =>
    post("/issues/rank", { issueIds, ...(sprintId !== undefined && { sprintId }), ...(inBacklog !== undefined && { inBacklog }) }),
  watchIssue: (ref, watch) => post(`/issues/${ref}/watch`, { watch }),
  addIssueLink: (ref, type, issueKey) => post(`/issues/${ref}/links`, { type, issueKey }),
  removeIssueLink: (ref, linkId) => request(`/issues/${ref}/links/${linkId}`, { method: "DELETE" }),
  addAttachments: (ref, attachments) => post(`/issues/${ref}/attachments`, { attachments }),
  removeAttachment: (ref, attachmentId) => request(`/issues/${ref}/attachments/${attachmentId}`, { method: "DELETE" }),

  getComments: (ref) => request(`/issues/${ref}/comments`),
  addComment: (ref, body, attachments) => post(`/issues/${ref}/comments`, { body, attachments }),
  updateComment: (id, body) => patch(`/comments/${id}`, { body }),
  deleteComment: (id) => request(`/comments/${id}`, { method: "DELETE" }),

  getSprints: (projectKey) => request(`/sprints?project=${projectKey}`),
  addSprint: (projectKey, input = {}) => post("/sprints", { projectKey, ...input }),
  updateSprint: (id, input) => patch(`/sprints/${id}`, input),
  startSprint: (id, input) => post(`/sprints/${id}/start`, input),
  completeSprint: (id, moveTo) => post(`/sprints/${id}/complete`, { moveTo }),
  getSprintReport: (id) => request(`/sprints/${id}/report`),
  deleteSprint: (id) => request(`/sprints/${id}`, { method: "DELETE" }),

  getFilters: () => request("/filters"),
  addFilter: (input) => post("/filters", input),
  deleteFilter: (id) => request(`/filters/${id}`, { method: "DELETE" }),

  getUploadSignature: () => request("/uploads/signature"),

  getBniStats: () => request("/bni/stats"),
  getBniContacts: (query) => request(`/bni?${new URLSearchParams(clean(query))}`),
  // A file download needs the auth header, so it's fetched as a blob.
  downloadBniCsv: async (query) => {
    const res = await fetch(`${API_URL}/bni/export?${new URLSearchParams(clean(query))}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` },
    });
    if (!res.ok) throw new Error(`Export failed: ${res.status}`);
    return res.blob();
  },

  getNotifications: () => request("/notifications"),
  markNotificationsRead: (ids) => post("/notifications/read", ids ? { ids } : { all: true }),

  getWorkDay: (employeeId, date) =>
    request(`/work/day?${new URLSearchParams({ ...(employeeId && { employeeId }), ...(date && { date }) })}`),
  planDay: (overview, projectKey) => post("/work/day/plan", { overview, ...(projectKey && { projectKey }) }),
  closeDay: (summary) => post("/work/day/close", { summary }),
  reopenDay: () => post("/work/day/reopen", {}),
  getPerformanceSummary: (days = 30) => request(`/work/performance/summary?days=${days}`),
  getPerformance: (employeeId, days = 30) =>
    request(`/work/performance?${new URLSearchParams({ ...(employeeId && { employeeId }), days })}`),
};

export { TOKEN_KEY };

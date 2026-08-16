import { createContext, useContext, useEffect, useState } from "react";
import {
  getEmployee as getEmployeeUtil,
  getDirectReports as getDirectReportsUtil,
  getAllReports as getAllReportsUtil,
} from "../data/employees";
import { api } from "../lib/api";
import { useAuth } from "./AuthContext";

const HRDataContext = createContext(null);

function groupOnboardingTasks(tasks) {
  const plans = {};
  for (const task of tasks) {
    (plans[task.newHireId] ??= []).push(task);
  }
  return plans;
}

function deriveLeaveBalances(employees) {
  return Object.fromEntries(employees.map((e) => [e.id, e.leaveBalances]));
}

const EMPTY_STATE = {
  employees: [],
  leaveBalances: {},
  leaveRequests: [],
  wfhRequests: [],
  attendanceRecords: [],
  onboardingPlans: {},
  kudos: [],
  announcements: [],
};

export function HRDataProvider({ children }) {
  const { currentUser } = useAuth();
  const [state, setState] = useState(EMPTY_STATE);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);

  async function loadAll() {
    setStatus("loading");
    setError(null);
    try {
      const [employees, leaveRequests, wfhRequests, attendanceRecords, onboardingTasks, kudos, announcements] =
        await Promise.all([
          api.getEmployees(),
          api.getLeaveRequests(),
          api.getWfhRequests(),
          api.getAttendance(),
          api.getOnboardingTasks(),
          api.getKudos(),
          api.getAnnouncements(),
        ]);
      setState({
        employees,
        leaveBalances: deriveLeaveBalances(employees),
        leaveRequests,
        wfhRequests,
        attendanceRecords,
        onboardingPlans: groupOnboardingTasks(onboardingTasks),
        kudos,
        announcements,
      });
      setStatus("ready");
    } catch (err) {
      setError(err.message);
      setStatus("error");
    }
  }

  useEffect(() => {
    if (currentUser) {
      loadAll();
    } else {
      setState(EMPTY_STATE);
      setStatus("idle");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  function getEmployee(id) {
    return getEmployeeUtil(state.employees, id);
  }

  function getDirectReports(managerId) {
    return getDirectReportsUtil(state.employees, managerId);
  }

  function getAllReports(managerId) {
    return getAllReportsUtil(state.employees, managerId);
  }

  async function addEmployee(input) {
    const employee = await api.addEmployee(input);
    const [employees, onboardingTasks] = await Promise.all([api.getEmployees(), api.getOnboardingTasks()]);
    setState((s) => ({
      ...s,
      employees,
      leaveBalances: deriveLeaveBalances(employees),
      onboardingPlans: groupOnboardingTasks(onboardingTasks),
    }));
    return employee;
  }

  async function applyLeave(input) {
    await api.applyLeave(input);
    const leaveRequests = await api.getLeaveRequests();
    setState((s) => ({ ...s, leaveRequests }));
  }

  async function decideLeave(id, decisionStatus, comment) {
    await api.decideLeave(id, decisionStatus, comment);
    const [leaveRequests, employees] = await Promise.all([api.getLeaveRequests(), api.getEmployees()]);
    setState((s) => ({ ...s, leaveRequests, employees, leaveBalances: deriveLeaveBalances(employees) }));
  }

  async function applyWfh(input) {
    await api.applyWfh(input);
    const wfhRequests = await api.getWfhRequests();
    setState((s) => ({ ...s, wfhRequests }));
  }

  async function decideWfh(id, decisionStatus, comment) {
    await api.decideWfh(id, decisionStatus, comment);
    const wfhRequests = await api.getWfhRequests();
    setState((s) => ({ ...s, wfhRequests }));
  }

  async function checkIn(employeeId) {
    await api.checkIn(employeeId);
    const attendanceRecords = await api.getAttendance();
    setState((s) => ({ ...s, attendanceRecords }));
  }

  async function checkOut(employeeId) {
    await api.checkOut(employeeId);
    const attendanceRecords = await api.getAttendance();
    setState((s) => ({ ...s, attendanceRecords }));
  }

  async function markWFH(employeeId) {
    await api.markWfh(employeeId);
    const attendanceRecords = await api.getAttendance();
    setState((s) => ({ ...s, attendanceRecords }));
  }

  async function updateOnboardingTask(_employeeId, taskId, taskStatus) {
    await api.updateOnboardingTask(taskId, taskStatus);
    const onboardingTasks = await api.getOnboardingTasks();
    setState((s) => ({ ...s, onboardingPlans: groupOnboardingTasks(onboardingTasks) }));
  }

  async function completeOnboarding(employeeId) {
    await api.completeOnboarding(employeeId);
    const employees = await api.getEmployees();
    setState((s) => ({ ...s, employees, leaveBalances: deriveLeaveBalances(employees) }));
  }

  async function addKudos(input) {
    await api.addKudos(input);
    const kudos = await api.getKudos();
    setState((s) => ({ ...s, kudos }));
  }

  async function toggleLike(kudosId, employeeId) {
    await api.toggleLike(kudosId, employeeId);
    const kudos = await api.getKudos();
    setState((s) => ({ ...s, kudos }));
  }

  async function addAnnouncement(input) {
    await api.addAnnouncement(input);
    const announcements = await api.getAnnouncements();
    setState((s) => ({ ...s, announcements }));
  }

  if (!currentUser) {
    // Not logged in — nothing here needs HR data (Login doesn't call
    // useHRData, and RequireAuth redirects before any page that would).
    return children;
  }

  if (status === "loading" || status === "idle") {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background">
        <img src="/logo.png" alt="" className="h-12 w-12 animate-pulse rounded-xl object-cover" />
        <p className="text-sm text-muted-foreground">Loading Aurigin People…</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <p className="text-sm font-medium text-danger">Couldn't reach the Aurigin People API.</p>
        <p className="max-w-sm text-xs text-muted-foreground">{error}</p>
        <button
          type="button"
          onClick={loadAll}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <HRDataContext.Provider
      value={{
        ...state,
        getEmployee,
        getDirectReports,
        getAllReports,
        addEmployee,
        applyLeave,
        decideLeave,
        applyWfh,
        decideWfh,
        checkIn,
        checkOut,
        markWFH,
        updateOnboardingTask,
        completeOnboarding,
        addKudos,
        toggleLike,
        addAnnouncement,
      }}
    >
      {children}
    </HRDataContext.Provider>
  );
}

export function useHRData() {
  const ctx = useContext(HRDataContext);
  if (!ctx) throw new Error("useHRData must be used within HRDataProvider");
  return ctx;
}

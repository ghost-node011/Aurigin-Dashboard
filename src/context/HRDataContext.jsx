import { createContext, useContext, useEffect, useState } from "react";
import {
  SEED_EMPLOYEES,
  DEPARTMENT_COLOR,
  getEmployee as getEmployeeUtil,
  getDirectReports as getDirectReportsUtil,
  getAllReports as getAllReportsUtil,
} from "../data/employees";
import { LEAVE_REQUESTS, LEAVE_BALANCES, LEAVE_TYPES } from "../data/leave";
import { ATTENDANCE_RECORDS } from "../data/attendance";
import { SEED_ONBOARDING_PLANS, createOnboardingPlan } from "../data/onboarding";
import { KUDOS } from "../data/kudos";
import { ANNOUNCEMENTS } from "../data/announcements";
import { daysBetweenInclusive, todayISO, nowTime } from "../lib/date";

const STORAGE_KEY = "aurigin-hr.data";

function defaultState() {
  return {
    employees: SEED_EMPLOYEES,
    leaveRequests: LEAVE_REQUESTS,
    leaveBalances: LEAVE_BALANCES,
    attendanceRecords: ATTENDANCE_RECORDS,
    onboardingPlans: SEED_ONBOARDING_PLANS,
    kudos: KUDOS,
    announcements: ANNOUNCEMENTS,
  };
}

function loadInitialState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    // Spread over the defaults (not the raw parse alone) so a shape that
    // predates a later field — e.g. `employees` becoming stateful — still
    // gets a working value instead of crashing every page that reads it.
    if (raw) return { ...defaultState(), ...JSON.parse(raw) };
  } catch {
    // fall through to seed defaults
  }
  return defaultState();
}

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}

function uniqueId(baseSlug, existingEmployees) {
  let id = baseSlug;
  let n = 2;
  while (existingEmployees.some((e) => e.id === id)) {
    id = `${baseSlug}-${n}`;
    n += 1;
  }
  return id;
}

function uniqueEmail(name, existingEmployees) {
  const parts = name.toLowerCase().trim().split(/\s+/);
  const base = parts.length > 1 ? `${parts[0]}.${parts[parts.length - 1]}` : parts[0];
  const clean = base.replace(/[^a-z0-9.]/g, "");
  let email = `${clean}@auriginmedia.com`;
  let n = 2;
  while (existingEmployees.some((e) => e.email === email)) {
    email = `${clean}${n}@auriginmedia.com`;
    n += 1;
  }
  return email;
}

function generatePhone(existingEmployees) {
  return `+91 98200 1${1253 + existingEmployees.length}`;
}

function emptyLeaveBalances() {
  return Object.fromEntries(LEAVE_TYPES.map((t) => [t.id, { quota: t.annualQuota, used: 0 }]));
}

const HRDataContext = createContext(null);

export function HRDataProvider({ children }) {
  const [state, setState] = useState(loadInitialState);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  function getEmployee(id) {
    return getEmployeeUtil(state.employees, id);
  }

  function getDirectReports(managerId) {
    return getDirectReportsUtil(state.employees, managerId);
  }

  function getAllReports(managerId) {
    return getAllReportsUtil(state.employees, managerId);
  }

  function addEmployee({ name, title, department, managerId, employmentType, location, dateOfJoining, role }) {
    let newEmployee;
    setState((s) => {
      const id = uniqueId(slugify(name), s.employees);
      newEmployee = {
        id,
        name,
        email: uniqueEmail(name, s.employees),
        role: role || "employee",
        title,
        department,
        managerId: managerId || null,
        location,
        employmentType: employmentType || "Full-time",
        status: "Onboarding",
        dateOfJoining: dateOfJoining || todayISO(),
        phone: generatePhone(s.employees),
        color: DEPARTMENT_COLOR[department] ?? "#4338ca",
      };

      return {
        ...s,
        employees: [...s.employees, newEmployee],
        onboardingPlans: { ...s.onboardingPlans, [id]: createOnboardingPlan(id) },
        leaveBalances: { ...s.leaveBalances, [id]: emptyLeaveBalances() },
      };
    });
    return newEmployee;
  }

  function applyLeave({ employeeId, type, startDate, endDate, reason }) {
    const employee = getEmployee(employeeId);
    const newRequest = {
      id: `lr-${Date.now()}`,
      employeeId,
      type,
      startDate,
      endDate,
      days: daysBetweenInclusive(startDate, endDate),
      status: "Pending",
      reason,
      appliedOn: todayISO(),
      approverId: employee?.managerId ?? null,
      approverComment: null,
    };
    setState((s) => ({ ...s, leaveRequests: [newRequest, ...s.leaveRequests] }));
  }

  function decideLeave(requestId, status, comment) {
    setState((s) => {
      const request = s.leaveRequests.find((r) => r.id === requestId);
      if (!request) return s;

      const leaveRequests = s.leaveRequests.map((r) =>
        r.id === requestId ? { ...r, status, approverComment: comment ?? null } : r,
      );

      let leaveBalances = s.leaveBalances;
      if (status === "Approved") {
        const current = s.leaveBalances[request.employeeId];
        leaveBalances = {
          ...s.leaveBalances,
          [request.employeeId]: {
            ...current,
            [request.type]: {
              ...current[request.type],
              used: current[request.type].used + request.days,
            },
          },
        };
      }

      return { ...s, leaveRequests, leaveBalances };
    });
  }

  function checkIn(employeeId) {
    const date = todayISO();
    setState((s) => {
      const exists = s.attendanceRecords.some((r) => r.employeeId === employeeId && r.date === date);
      const attendanceRecords = exists
        ? s.attendanceRecords.map((r) =>
            r.employeeId === employeeId && r.date === date ? { ...r, status: "Present", checkIn: nowTime() } : r,
          )
        : [
            { employeeId, date, status: "Present", checkIn: nowTime(), checkOut: null, hours: 0 },
            ...s.attendanceRecords,
          ];
      return { ...s, attendanceRecords };
    });
  }

  function checkOut(employeeId) {
    const date = todayISO();
    setState((s) => ({
      ...s,
      attendanceRecords: s.attendanceRecords.map((r) =>
        r.employeeId === employeeId && r.date === date ? { ...r, checkOut: nowTime() } : r,
      ),
    }));
  }

  function markWFH(employeeId) {
    const date = todayISO();
    setState((s) => {
      const exists = s.attendanceRecords.some((r) => r.employeeId === employeeId && r.date === date);
      const attendanceRecords = exists
        ? s.attendanceRecords.map((r) =>
            r.employeeId === employeeId && r.date === date ? { ...r, status: "WFH", checkIn: nowTime() } : r,
          )
        : [
            { employeeId, date, status: "WFH", checkIn: nowTime(), checkOut: null, hours: 0 },
            ...s.attendanceRecords,
          ];
      return { ...s, attendanceRecords };
    });
  }

  function updateOnboardingTask(employeeId, taskId, status) {
    setState((s) => ({
      ...s,
      onboardingPlans: {
        ...s.onboardingPlans,
        [employeeId]: (s.onboardingPlans[employeeId] ?? []).map((t) =>
          t.id === taskId ? { ...t, status } : t,
        ),
      },
    }));
  }

  function completeOnboarding(employeeId) {
    setState((s) => ({
      ...s,
      employees: s.employees.map((e) => (e.id === employeeId ? { ...e, status: "Active" } : e)),
    }));
  }

  function addKudos({ fromId, toIds, value, message }) {
    const newKudos = {
      id: `k-${Date.now()}`,
      fromId,
      toIds,
      value,
      message,
      date: todayISO(),
      likedBy: [],
    };
    setState((s) => ({ ...s, kudos: [newKudos, ...s.kudos] }));
  }

  function toggleLike(kudosId, employeeId) {
    setState((s) => ({
      ...s,
      kudos: s.kudos.map((k) =>
        k.id === kudosId
          ? {
              ...k,
              likedBy: k.likedBy.includes(employeeId)
                ? k.likedBy.filter((id) => id !== employeeId)
                : [...k.likedBy, employeeId],
            }
          : k,
      ),
    }));
  }

  function addAnnouncement({ title, body, category, authorId, pinned }) {
    const newAnnouncement = {
      id: `a-${Date.now()}`,
      title,
      body,
      category,
      authorId,
      date: todayISO(),
      pinned: Boolean(pinned),
    };
    setState((s) => ({ ...s, announcements: [newAnnouncement, ...s.announcements] }));
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

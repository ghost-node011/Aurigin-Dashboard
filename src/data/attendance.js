import { SEED_EMPLOYEES } from "./employees";
import { LEAVE_REQUESTS } from "./leave";
import { addDays, toISODate, isWeekend, seededRandom } from "../lib/date";

const today = new Date();

function approvedLeaveOn(employeeId, iso) {
  return LEAVE_REQUESTS.find(
    (r) => r.employeeId === employeeId && r.status === "Approved" && r.startDate <= iso && iso <= r.endDate,
  );
}

function generateRecordsFor(employee) {
  const rand = seededRandom(employee.id + ":attendance");
  const records = [];

  // Seeded data covers the last 14 calendar days up to yesterday; today is
  // left open so the live "check in" action in the app creates it.
  for (let offset = -14; offset < 0; offset++) {
    const date = addDays(today, offset);
    if (isWeekend(date)) continue;
    const iso = toISODate(date);

    if (employee.status === "Onboarding" && iso < employee.dateOfJoining) continue;

    const onLeave = approvedLeaveOn(employee.id, iso);
    if (onLeave) {
      records.push({ employeeId: employee.id, date: iso, status: "Leave", checkIn: null, checkOut: null, hours: 0 });
      continue;
    }

    const roll = rand();
    let status = "Present";
    if (roll > 0.97) status = "Absent";
    else if (roll > 0.88) status = "Half Day";
    else if (roll > 0.72) status = "WFH";

    if (status === "Absent") {
      records.push({ employeeId: employee.id, date: iso, status, checkIn: null, checkOut: null, hours: 0 });
      continue;
    }

    const checkInMinute = 9 * 60 + Math.round(rand() * 45);
    const isHalf = status === "Half Day";
    const checkOutMinute = isHalf ? 13 * 60 + Math.round(rand() * 30) : 18 * 60 + Math.round(rand() * 75);
    const hours = Math.round(((checkOutMinute - checkInMinute) / 60) * 10) / 10;

    records.push({
      employeeId: employee.id,
      date: iso,
      status,
      checkIn: minutesToTime(checkInMinute),
      checkOut: minutesToTime(checkOutMinute),
      hours,
    });
  }

  return records;
}

function minutesToTime(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

export const ATTENDANCE_RECORDS = SEED_EMPLOYEES.flatMap(generateRecordsFor);

export function getAttendanceFor(employeeId) {
  return ATTENDANCE_RECORDS.filter((r) => r.employeeId === employeeId).sort((a, b) => b.date.localeCompare(a.date));
}

export function getAttendanceOn(date) {
  return ATTENDANCE_RECORDS.filter((r) => r.date === date);
}

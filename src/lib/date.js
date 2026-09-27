/**
 * A Date's calendar day as YYYY-MM-DD, in local time. Not
 * `toISOString().slice(0, 10)`: that converts to UTC first, so before
 * 05:30 in India it reports the previous day.
 */
export function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Today in company time (India), matching the server's "today" wherever the browser is. */
export function todayISO() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

export function nowTime() {
  return new Date().toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
}

export function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function tomorrowISO() {
  return toISODate(addDays(new Date(todayISO() + "T00:00:00"), 1));
}

export function formatDate(isoOrDate, opts = { month: "short", day: "numeric", year: "numeric" }) {
  const date = typeof isoOrDate === "string" ? new Date(isoOrDate + "T00:00:00") : isoOrDate;
  return date.toLocaleDateString("en-IN", opts);
}

export function formatMonthDay(isoOrDate) {
  return formatDate(isoOrDate, { month: "short", day: "numeric" });
}

export function daysBetweenInclusive(startIso, endIso) {
  const start = new Date(startIso + "T00:00:00");
  const end = new Date(endIso + "T00:00:00");
  return Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
}

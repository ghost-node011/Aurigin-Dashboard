export function toISODate(date) {
  return date.toISOString().slice(0, 10);
}

export function todayISO() {
  return toISODate(new Date());
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
  return toISODate(addDays(new Date(), 1));
}

/** Monday–Sunday range (as ISO date strings) for the week containing isoDate. */
export function getWeekRange(isoDate) {
  const date = new Date(isoDate + "T00:00:00");
  const day = date.getDay();
  const monday = addDays(date, day === 0 ? -6 : 1 - day);
  return { start: toISODate(monday), end: toISODate(addDays(monday, 6)) };
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

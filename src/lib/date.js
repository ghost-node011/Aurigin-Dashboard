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

export function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/** Deterministic pseudo-random in [0, 1), seeded by a string — keeps generated demo data stable across reloads. */
export function seededRandom(seed) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

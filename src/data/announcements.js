import { addDays, toISODate } from "../lib/date";

const today = new Date();
function iso(offsetDays) {
  return toISODate(addDays(today, offsetDays));
}

export const ANNOUNCEMENT_CATEGORIES = [
  { id: "general", label: "General", color: "#4338ca" },
  { id: "policy", label: "Policy", color: "#b45309" },
  { id: "event", label: "Event", color: "#15803d" },
  { id: "celebration", label: "Celebration", color: "#be185d" },
];

export const ANNOUNCEMENTS = [
  {
    id: "a1",
    title: "Welcome to the new Aurigin People portal!",
    body: "This is the internal HR portal for Aurigin Media — track attendance, leave, onboarding, recognition, and more, all in one place.",
    category: "general",
    authorId: "udit",
    date: iso(-1),
    pinned: true,
  },
  {
    id: "a2",
    title: "Updated work-from-home policy",
    body: "WFH requests can be raised directly from the Attendance tab and no longer require a separate email to HR. Full policy details are in the employee handbook.",
    category: "policy",
    authorId: "aurigin-media-hr",
    date: iso(-5),
    pinned: false,
  },
];

export function getAnnouncement(id) {
  return ANNOUNCEMENTS.find((a) => a.id === id);
}

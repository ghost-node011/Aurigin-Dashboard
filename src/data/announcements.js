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
    title: "Q3 All-Hands — Friday, 4 PM",
    body: "Join us for the quarterly all-hands where we'll walk through Q3 performance, client wins, and the roadmap for Q4. Recording will be shared for anyone who can't make it live.",
    category: "event",
    authorId: "vikram-shah",
    date: iso(-1),
    pinned: true,
  },
  {
    id: "a2",
    title: "Welcome Tanvi and Devika to the team!",
    body: "Please join us in welcoming Tanvi Desai (SEO Specialist, Marketing) and Devika Rane (Junior Backend Engineer, Engineering) who joined us this month. Say hi in the office or on Slack!",
    category: "celebration",
    authorId: "aditi-rao",
    date: iso(-3),
    pinned: true,
  },
  {
    id: "a3",
    title: "Updated work-from-home policy",
    body: "Starting next month, WFH requests can be raised directly from the Attendance tab and no longer require a separate email to HR. Full policy details are in the employee handbook.",
    category: "policy",
    authorId: "aditi-rao",
    date: iso(-5),
    pinned: false,
  },
  {
    id: "a4",
    title: "Office closed — regional holiday",
    body: "The Mumbai and Delhi offices will be closed on the 19th for a regional holiday. Remote team members, this does not apply to you unless you're based in these cities.",
    category: "general",
    authorId: "aditi-rao",
    date: iso(-6),
    pinned: false,
  },
  {
    id: "a5",
    title: "New health insurance policy live",
    body: "Our upgraded group health insurance is now active, with higher coverage and added dependents. Check your inbox for enrolment details and reach out to HR with questions.",
    category: "policy",
    authorId: "aditi-rao",
    date: iso(-9),
    pinned: false,
  },
  {
    id: "a6",
    title: "Engineering shipped the new client dashboard",
    body: "Big shoutout to the engineering team for shipping the redesigned client dashboard ahead of schedule. Great example of what focused execution looks like.",
    category: "celebration",
    authorId: "rohan-mehta",
    date: iso(-11),
    pinned: false,
  },
];

export function getAnnouncement(id) {
  return ANNOUNCEMENTS.find((a) => a.id === id);
}

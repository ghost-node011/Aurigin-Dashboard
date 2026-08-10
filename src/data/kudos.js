import { addDays, toISODate } from "../lib/date";

export const CORE_VALUES = [
  { id: "teamwork", label: "Teamwork", emoji: "🤝", color: "#4338ca" },
  { id: "innovation", label: "Innovation", emoji: "💡", color: "#b45309" },
  { id: "ownership", label: "Ownership", emoji: "🎯", color: "#15803d" },
  { id: "customer", label: "Customer Focus", emoji: "❤️", color: "#b91c1c" },
  { id: "excellence", label: "Excellence", emoji: "⭐", color: "#1d4ed8" },
  { id: "positivity", label: "Positivity", emoji: "✨", color: "#be185d" },
];

const today = new Date();
function iso(offsetDays) {
  return toISODate(addDays(today, offsetDays));
}

export const KUDOS = [
  {
    id: "k1",
    fromId: "udit",
    toIds: ["gaurank-sharma"],
    value: "excellence",
    message: "Gaurank shipped the new HR portal a full week early and it looks fantastic. Huge win for the team.",
    date: iso(-1),
    likedBy: ["arjun", "aurigin-media-hr"],
  },
  {
    id: "k2",
    fromId: "arjun",
    toIds: ["aurigin-media-hr"],
    value: "ownership",
    message: "HR ran onboarding for the team this month without missing a single step. Amazing ownership.",
    date: iso(-2),
    likedBy: ["udit", "avantika"],
  },
  {
    id: "k3",
    fromId: "aurigin-media-hr",
    toIds: ["avantika"],
    value: "teamwork",
    message: "Avantika jumped in to help coordinate this quarter's launch under a tight deadline. Great collaboration.",
    date: iso(-3),
    likedBy: ["udit", "arjun"],
  },
];

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
    fromId: "rohan-mehta",
    toIds: ["sara-iyer"],
    value: "excellence",
    message: "Sara shipped the new dashboard redesign a full week early and it looks fantastic. Huge win for the team.",
    date: iso(-1),
    likedBy: ["vikram-shah", "karan-verma", "priya-nair", "aditi-rao"],
  },
  {
    id: "k2",
    fromId: "aditi-rao",
    toIds: ["neha-kapoor"],
    value: "ownership",
    message: "Neha single-handedly ran onboarding for two new hires this month without missing a single step. Amazing ownership.",
    date: iso(-2),
    likedBy: ["vikram-shah", "rohan-mehta"],
  },
  {
    id: "k3",
    fromId: "arjun-malhotra",
    toIds: ["divya-menon", "kabir-khanna"],
    value: "teamwork",
    message: "The Q3 campaign launch was a joint effort between content and social — great collaboration under a tight deadline.",
    date: iso(-3),
    likedBy: ["vikram-shah", "zoya-sheikh", "tanvi-desai"],
  },
  {
    id: "k4",
    fromId: "ananya-bose",
    toIds: ["ishaan-kulkarni"],
    value: "innovation",
    message: "Ishaan's new component system idea is going to save the design team hours every week. Loved the initiative.",
    date: iso(-4),
    likedBy: ["meera-pillai", "rohan-mehta"],
  },
  {
    id: "k5",
    fromId: "zoya-sheikh",
    toIds: ["rahul-chawla"],
    value: "customer",
    message: "Rahul went above and beyond to get the client's onboarding sorted over the weekend. That's the kind of service that keeps clients around.",
    date: iso(-5),
    likedBy: ["vikram-shah", "simran-kaur"],
  },
  {
    id: "k6",
    fromId: "vikram-shah",
    toIds: ["aditi-rao"],
    value: "excellence",
    message: "The new onboarding checklist Aditi rolled out has already cut new-hire ramp-up time noticeably. Great work.",
    date: iso(-7),
    likedBy: ["neha-kapoor", "rohan-mehta", "ananya-bose", "arjun-malhotra", "zoya-sheikh"],
  },
  {
    id: "k7",
    fromId: "karan-verma",
    toIds: ["aarav-joshi"],
    value: "teamwork",
    message: "Aarav stayed late to help me untangle a nasty deployment bug even though it wasn't his module. Appreciate you.",
    date: iso(-8),
    likedBy: ["sara-iyer", "priya-nair", "rohan-mehta"],
  },
  {
    id: "k8",
    fromId: "priya-nair",
    toIds: ["karan-verma"],
    value: "ownership",
    message: "Karan caught a critical bug in QA before it reached production and owned the fix end to end. Textbook.",
    date: iso(-10),
    likedBy: ["rohan-mehta"],
  },
  {
    id: "k9",
    fromId: "meera-pillai",
    toIds: ["ananya-bose"],
    value: "positivity",
    message: "Ananya's energy in every review call makes tough feedback so much easier to take. Thank you for that.",
    date: iso(-12),
    likedBy: ["ishaan-kulkarni", "aditi-rao"],
  },
  {
    id: "k10",
    fromId: "aditi-rao",
    toIds: ["farhan-ali"],
    value: "excellence",
    message: "Farhan closed the quarterly books three days ahead of schedule with zero discrepancies. Rockstar.",
    date: iso(-14),
    likedBy: ["vikram-shah"],
  },
];

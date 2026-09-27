// Generates the role guides in public/ (employee, HR, admin) — the
// introduction handed to people when they get portal access.
//
// Generated rather than hand-designed so the numbers in it (leave accrual,
// probation length, working hours) can be regenerated from the company's
// live settings instead of going stale in a file nobody remembers to edit.
// Run: npm run guide  [-- --api http://localhost:4000/api --token <jwt>]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import PDFDocument from "pdfkit";
import { DEFAULTS, describeSettings } from "./guide-content.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// The building mark, not the full lockup: the wordmark is brand blue,
// which is too dark to read against the navy cover.
const LOGO = path.join(ROOT, "public", "logo-mark.png");

// Brand palette, matching src/index.css — cobalt and gold from the logo.
const C = {
  ink: "#0f1833",
  body: "#3d4766",
  muted: "#7b849f",
  primary: "#114fd4",
  primarySoft: "#e4ebfd",
  gold: "#fbbd2a",
  goldSoft: "#fff5db",
  paper: "#f6f8fd",
  line: "#dde4f4",
  white: "#ffffff",
};

// bottom: 0 because every element is positioned absolutely and page breaks
// are explicit (newPage). With a real bottom margin, PDFKit treats any text
// drawn near the foot of the page as an overflow and silently inserts a
// blank page — which is what a footer line at H-74 was doing.
const PAGE = { size: "A4", margins: { top: 64, bottom: 0, left: 56, right: 56 } };
const SAFE_BOTTOM = 760; // content below this would collide with the footer
const W = 595.28; // A4 width in points
const H = 841.89;
const CONTENT_W = W - PAGE.margins.left - PAGE.margins.right;

function arg(name) {
  const i = process.argv.indexOf(name);
  return i === -1 ? null : process.argv[i + 1];
}

/** Fetches live settings when the API is reachable; falls back to defaults. */
async function loadSettings() {
  const base = arg("--api");
  if (!base) return DEFAULTS;
  const token = arg("--token");
  try {
    const res = await fetch(`${base}/settings`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const live = await res.json();
    console.log("Using live settings from", base);
    return { ...DEFAULTS, ...live };
  } catch (err) {
    console.warn(`Could not read live settings (${err.message}) — using defaults.`);
    return DEFAULTS;
  }
}

// --- drawing helpers --------------------------------------------------------

function coverPage(doc, audience) {
  doc.rect(0, 0, W, H).fill(C.ink);
  // A soft brand wash across the lower half, so the cover isn't a flat block.
  doc.save();
  doc.rect(0, H * 0.52, W, H * 0.48).fill(C.primary);
  doc.restore();
  doc.save();
  doc.opacity(0.12);
  doc.circle(W - 40, H * 0.52, 190).fill(C.white);
  doc.opacity(1);
  doc.restore();

  if (fs.existsSync(LOGO)) {
    doc.image(LOGO, PAGE.margins.left, 80, { fit: [76, 76], align: "left" });
  }

  doc
    .fillColor(C.white)
    .font("Helvetica-Bold")
    .fontSize(52)
    .text("Aurigin", PAGE.margins.left, 210, { width: CONTENT_W, lineGap: -6 })
    .text("People", { width: CONTENT_W });

  doc
    .fillColor(C.gold)
    .font("Helvetica")
    .fontSize(15)
    .text(audience.coverSubtitle, PAGE.margins.left, 340, { width: CONTENT_W });

  doc
    .fillColor(C.white)
    .font("Helvetica-Bold")
    .fontSize(20)
    .text(audience.coverLine1, PAGE.margins.left, H * 0.62, { width: CONTENT_W - 60 })
    .text(audience.coverLine2, { width: CONTENT_W - 60 });

  doc
    .fillColor("#cfdcfb")
    .font("Helvetica")
    .fontSize(11)
    .text(
      audience.coverBlurb,
      PAGE.margins.left,
      H * 0.62 + 66,
      { width: CONTENT_W - 80, lineGap: 3 },
    );

  doc
    .fillColor("#93a9e8")
    .fontSize(9)
    .text(`Aurigin Media · ${new Date().getFullYear()}`, PAGE.margins.left, H - 74, { width: CONTENT_W });
}

/** Starts a new content page and returns the starting y. */
function newPage(doc, { eyebrow, title, intro }) {
  doc.addPage();
  doc.rect(0, 0, W, H).fill(C.paper);
  doc.rect(0, 0, W, 6).fill(C.primary);

  let y = PAGE.margins.top;
  if (eyebrow) {
    doc
      .fillColor(C.primary)
      .font("Helvetica-Bold")
      .fontSize(9)
      .text(eyebrow.toUpperCase(), PAGE.margins.left, y, { characterSpacing: 1.2, width: CONTENT_W });
    y += 18;
  }
  doc
    .fillColor(C.ink)
    .font("Helvetica-Bold")
    .fontSize(26)
    .text(title, PAGE.margins.left, y, { width: CONTENT_W });
  y = doc.y + 8;

  if (intro) {
    doc
      .fillColor(C.body)
      .font("Helvetica")
      .fontSize(11)
      .text(intro, PAGE.margins.left, y, { width: CONTENT_W - 30, lineGap: 3.5 });
    y = doc.y + 14;
  }
  return y;
}

/** A filled card with a heading and body text. Returns the y below it. */
function card(doc, y, { title, body, tone = "plain", badge }) {
  const bg = tone === "brand" ? C.primarySoft : tone === "accent" ? C.goldSoft : C.white;
  const stripe = tone === "brand" ? C.primary : tone === "accent" ? C.gold : C.line;

  const padX = 16;
  const innerW = CONTENT_W - padX * 2 - 6;

  doc.font("Helvetica-Bold").fontSize(12);
  const titleH = doc.heightOfString(title, { width: innerW });
  doc.font("Helvetica").fontSize(10.5);
  const bodyH = doc.heightOfString(body, { width: innerW, lineGap: 3 });
  const boxH = titleH + bodyH + 30;

  doc.roundedRect(PAGE.margins.left, y, CONTENT_W, boxH, 10).fill(bg);
  doc.rect(PAGE.margins.left, y + 10, 3.5, boxH - 20).fill(stripe);

  doc
    .fillColor(C.ink)
    .font("Helvetica-Bold")
    .fontSize(12)
    .text(title, PAGE.margins.left + padX + 6, y + 13, { width: innerW });

  if (badge) {
    doc
      .fillColor(C.muted)
      .font("Helvetica")
      .fontSize(8.5)
      .text(badge, PAGE.margins.left, y + 15, { width: CONTENT_W - padX, align: "right" });
  }

  doc
    .fillColor(C.body)
    .font("Helvetica")
    .fontSize(10.5)
    .text(body, PAGE.margins.left + padX + 6, y + 13 + titleH + 6, { width: innerW, lineGap: 3 });

  return y + boxH + 12;
}

/** Numbered step with a brand circle. */
function step(doc, y, n, title, body) {
  const cx = PAGE.margins.left + 13;
  doc.circle(cx, y + 11, 13).fill(C.primary);
  doc
    .fillColor(C.white)
    .font("Helvetica-Bold")
    .fontSize(11)
    .text(String(n), cx - 13, y + 6, { width: 26, align: "center" });

  const tx = PAGE.margins.left + 38;
  const tw = CONTENT_W - 38;
  doc.fillColor(C.ink).font("Helvetica-Bold").fontSize(12).text(title, tx, y + 1, { width: tw });
  const afterTitle = doc.y + 3;
  doc.fillColor(C.body).font("Helvetica").fontSize(10.5).text(body, tx, afterTitle, { width: tw, lineGap: 3 });
  return doc.y + 16;
}

/** Bulleted line with a small brand dot. */
function bullet(doc, y, text) {
  doc.circle(PAGE.margins.left + 4, y + 6, 2.6).fill(C.primary);
  doc
    .fillColor(C.body)
    .font("Helvetica")
    .fontSize(10.5)
    .text(text, PAGE.margins.left + 16, y, { width: CONTENT_W - 16, lineGap: 3 });
  return doc.y + 8;
}

/** Two-column reference table. */
function table(doc, y, rows, headers) {
  const colW = [CONTENT_W * 0.42, CONTENT_W * 0.58];
  doc.rect(PAGE.margins.left, y, CONTENT_W, 26).fill(C.ink);
  doc.fillColor(C.white).font("Helvetica-Bold").fontSize(9.5);
  doc.text(headers[0].toUpperCase(), PAGE.margins.left + 12, y + 8.5, { width: colW[0] });
  doc.text(headers[1].toUpperCase(), PAGE.margins.left + 12 + colW[0], y + 8.5, { width: colW[1] - 24 });
  y += 26;

  rows.forEach(([label, value], i) => {
    doc.font("Helvetica").fontSize(10);
    const h = Math.max(
      doc.heightOfString(label, { width: colW[0] - 24 }),
      doc.heightOfString(value, { width: colW[1] - 24 }),
    ) + 16;
    if (i % 2 === 0) doc.rect(PAGE.margins.left, y, CONTENT_W, h).fill(C.white);
    doc.fillColor(C.ink).font("Helvetica-Bold").fontSize(10).text(label, PAGE.margins.left + 12, y + 8, { width: colW[0] - 24 });
    doc.fillColor(C.body).font("Helvetica").fontSize(10).text(value, PAGE.margins.left + 12 + colW[0], y + 8, { width: colW[1] - 24 });
    y += h;
    doc.moveTo(PAGE.margins.left, y).lineTo(W - PAGE.margins.right, y).strokeColor(C.line).lineWidth(0.5).stroke();
  });
  return y + 14;
}

/** Warns at build time if a page's content ran past the safe area. */
function checkFits(doc, y, label) {
  if (y > SAFE_BOTTOM) {
    console.warn(`  ! "${label}" overflows: content ends at y=${Math.round(y)} (safe limit ${SAFE_BOTTOM})`);
  }
  return y;
}

function footers(doc, audience) {
  const range = doc.bufferedPageRange();
  // Page 0 is the cover, which carries no footer.
  for (let i = 1; i < range.count; i++) {
    doc.switchToPage(i);
    doc
      .fillColor(C.muted)
      .font("Helvetica")
      .fontSize(8.5)
      .text(`Aurigin People — ${audience.footer}`, PAGE.margins.left, H - 46, {
        width: CONTENT_W,
        align: "left",
      });
    doc.text(String(i), PAGE.margins.left, H - 46, { width: CONTENT_W, align: "right" });
  }
}


// --- sections ---------------------------------------------------------------
// Each section is a function of (doc, s) where `s` is the described
// settings. Audiences below pick the ones they need, so a rule that
// changes is edited once and every guide that shows it follows.

const SECTIONS = {
  welcome: (doc, s, a) => {
    let y = newPage(doc, {
      eyebrow: "Welcome",
      title: a.welcomeTitle,
      intro: a.welcomeIntro,
    });
    y = card(doc, y, {
      tone: "brand",
      title: "One place for the everyday",
      body: "Check in and out, apply for leave or a work-from-home day, and see your balances without asking anyone.",
    });
    y = card(doc, y, {
      title: "Requests that don't get lost",
      body: "Every leave and WFH request goes to the right approver with a clear status — Pending, Approved or Rejected — and the approver's comment comes back with it.",
    });
    y = card(doc, y, {
      title: "Your work, planned with you",
      body: "Tell My Day what you're working on and it builds your to-do list and timeline; wrap up at the end of the day and it closes what's done. Every task is an issue on the team's boards, Jira-style.",
    });
    return card(doc, y, {
      tone: "accent",
      title: "The handbook, always to hand",
      body: "The Employee Handbook lives in the portal. New joiners read and acknowledge it during onboarding, and it stays available afterwards.",
    });
  },

  gettingStarted: (doc, s) => {
    let y = newPage(doc, {
      eyebrow: "Getting started",
      title: "Your first five minutes",
      intro: "HR will give you a temporary password. From there it's four steps.",
    });
    y = step(doc, y, 1, "Sign in", "Go to the portal and sign in with your work email and the temporary password HR gave you.");
    y = step(doc, y, 2, "Set your own password", "You'll be asked to change it straight away. Pick something only you know — HR can't see it, and nobody can recover it for you.");
    y = step(doc, y, 3, "Read the handbook", "New joiners are walked through the Employee Handbook and asked to acknowledge it. Read to the last page — the acknowledge button unlocks there.");
    y = step(doc, y, 4, "Check in, then plan your day", `On the Attendance page, press Check in (it opens at ${s.opensAt}; office hours are ${s.hours}). Then open My Day and write what you're working on — it turns that into your plan.`);
    return card(doc, y + 4, {
      tone: "brand",
      title: "Forgotten your password?",
      body: "Ask HR to reset it. You'll get a new temporary one and be asked to change it again on your next sign-in.",
    });
  },

  everyday: (doc, s) => {
    let y = newPage(doc, { eyebrow: "For everyone", title: "The things you'll do most weeks" });
    y = card(doc, y, {
      title: "Attendance",
      badge: s.hours,
      body: `Check in when you start and out when you finish. Check-in opens at ${s.opensAt} and closes at ${s.checkOutFrom}, and it's closed on ${s.weeklyOff}. ${s.lateRule} Leaving before ${s.checkOutFrom} is flagged — the day is still recorded — and if something genuinely came up you can mark it as an emergency, ${s.emergencies} a month.`,
    });
    y = card(doc, y, {
      title: "Leave",
      badge: s.leaveYear,
      body: `Earned, casual, sick and menstrual leave build up month by month, so your balance is what you've actually accrued. ${s.leaveSummary} Earned leave needs 7 days' notice; casual needs 2, or a week for more than 2 days — inside that, tick "genuine emergency". Your manager is emailed, and you're emailed when they decide.`,
    });
    y = card(doc, y, {
      title: "Working from home",
      badge: "Manager approval",
      body: "There's no fixed allowance — each day is agreed with your manager. Raise a request before the day and your manager is emailed; you're emailed when it's decided. For a same-day emergency, “Mark WFH” on the Attendance page records it immediately and lets your manager know.",
    });
    return card(doc, y, {
      tone: "accent",
      title: "Recognition",
      body: "Saw someone do something good? Send kudos from the Recognition page. It's visible to the team, and it's the cheapest thing in here that makes the most difference.",
    });
  },

  probation: (doc, s) => {
    let y = newPage(doc, {
      eyebrow: "If you've just joined",
      title: "Your first few months",
      intro: `New joiners start on probation — ${s.probation} by default. It's the settling-in period, and a couple of things work differently while it lasts.`,
    });
    y = bullet(doc, y, `Leave still accrues every month, so nothing is lost. ${s.probationLeave}`);
    y = bullet(doc, y, "Work from home works as it does for everyone — agreed with your manager, day by day.");
    y = bullet(doc, y, "Everything else — attendance, recognition, the directory, the handbook — works exactly as it does for everyone.");
    return card(doc, y + 6, {
      tone: "brand",
      title: "Being confirmed",
      body: "Confirmation isn't automatic when the date passes — HR confirms you deliberately, after a look at how things have gone. Once confirmed, the leave you've built up can be taken from that moment.",
    });
  },

  managing: (doc) => {
    let y = newPage(doc, {
      eyebrow: "Approvals",
      title: "Approving, and keeping an eye out",
      intro: "If people report to you, two extra things land on your plate — and both live where you'd expect them.",
    });
    y = card(doc, y, {
      title: "Leave and WFH approvals",
      body: "You're emailed (and see it under the bell) when someone reporting to you asks for leave or WFH. Approve or reject under Approvals on the Leave and Attendance pages — the person is emailed the decision with your comment, so it's worth a sentence.",
    });
    y = card(doc, y, {
      title: "Your team's attendance",
      body: "The Attendance page shows your team for any date you pick: who's in, who's remote, who's on leave, and which days were flagged.",
    });
    return card(doc, y + 4, {
      tone: "accent",
      title: "A flagged day isn't a problem by itself",
      body: "People have lives. The flag exists so patterns are visible, not so anyone gets caught out — and the emergency exceptions are there precisely for the genuine ones.",
    });
  },

  running: (doc, s) => {
    let y = newPage(doc, {
      eyebrow: "Running the portal",
      title: "The things only you can do",
      intro: "HR and admin accounts can see and change things the rest of the team can't.",
    });
    y = card(doc, y, {
      title: "Adding someone",
      body: "Add an employee from the Onboarding page — give their company email, or let the portal make one. It creates the account and a one-time temporary password (shown once, so copy it before closing), builds their onboarding checklist, and sets the administrator as their manager unless you pick one.",
    });
    y = card(doc, y, {
      title: "Probation and confirmation",
      body: `Each employee's profile has a probation card: confirm them, put them back on probation, or change the end date. Probation runs ${s.probation} by default. Confirming is deliberate and is never triggered by the date alone.`,
    });
    return card(doc, y, {
      title: "Approvals, org-wide",
      body: "HR and admins see every pending leave and WFH request, not just their own reports — useful when a manager is away and something needs a decision.",
    });
  },

  settings: (doc, s) => {
    let y = newPage(doc, {
      eyebrow: "Settings",
      title: "Changing the rules themselves",
      intro: "Under Settings, the policy numbers are yours to change. A change applies to everyone immediately, and leave balances are recalculated on the spot.",
    });
    y = bullet(doc, y, "Leave — days per month and the yearly cap for earned, casual, sick and menstrual leave; the days a year for optional holidays, marriage, paternity and leave without pay; and the month the leave year starts.");
    y = bullet(doc, y, `Probation — default length (currently ${s.probation}) and whether leave can be availed during it.`);
    y = bullet(doc, y, `Office hours — start and end (${s.hours}), how early check-in opens (now ${s.opensAt}), whether late arrivals are flagged, and how many emergency exceptions a month.`);
    y = bullet(doc, y, "Notice periods, the 15-day earned-leave stretch and carry-forward come from the Employee Handbook and aren't editable here.");
    y += 6;
    y = card(doc, y, {
      tone: "accent",
      title: "Two things worth knowing",
      body: "The portal won't accept an end time at or before the start time — that would flag every day at once. And “Reset to defaults” puts every value back to what the portal shipped with.",
    });
    return card(doc, y, {
      tone: "brand",
      title: "Analytics",
      body: "Headcount, attendance and leave trends across the company — visible to HR and admins only.",
    });
  },

  myDay: (doc) => {
    let y = newPage(doc, {
      eyebrow: "My Day",
      title: "Plan in the morning, wrap up before you leave",
      intro: "My Day turns a few plain sentences into your to-do list and timeline, and at the end of the day closes what got done. Your work reporters — the administrator, your manager and anyone HR adds — see a short digest of both.",
    });
    y = step(doc, y, 1, "Morning: write your overview", "After the morning discussion, write what you'll work on the way you'd say it — “Fix the leave-page date bug, review Dhruv's PR, then start the onboarding emails.” Press Create my plan.");
    y = step(doc, y, 2, "The AI builds your plan", "Each piece of work becomes an issue with a priority and a time slot across the rest of your day, filed into the project it belongs to. You can pick one project for everything instead. Unfinished work from earlier days is picked up, not duplicated.");
    y = step(doc, y, 3, "During the day", "Change a task's status from the timeline, or open it to add detail, files or comments. Something new came up? Add more work — it's scheduled after what's already there.");
    y = step(doc, y, 4, "Evening: write your summary", "Before you leave, say what got done, what's half done, what blocked you and roughly how long things took. Press Close my day — the AI marks each task Done, In Progress, In Review, Blocked or To Do, logs the time, and reviews your day.");
    return card(doc, y + 2, {
      tone: "accent",
      title: "The review, and Performance",
      body: "You get a score out of 10, what went well, what to improve and a short note. It's stored day by day under Performance — you see yours; your manager, work reporters and HR see it too. Blockers outside your control aren't held against you, so mention them.",
    });
  },

  workIssues: (doc) => {
    let y = newPage(doc, {
      eyebrow: "Work",
      title: "Issues: every piece of work, in one place",
      intro: "Work lives in projects, each with its own key — WEB-12 is issue 12 in the Website project. Tasks from My Day are issues too, so everything shows up on the boards and in search.",
    });
    y = card(doc, y, {
      tone: "brand",
      title: "Types and status",
      body: "An Epic is a big piece of work holding Stories, Tasks and Bugs; any of those can be split into Sub-tasks. Status moves To Do → In Progress → In Review → Done, with Blocked for when something outside the issue is in the way.",
    });
    y = card(doc, y, {
      title: "The issue page",
      body: "Open any issue at /browse/KEY. Click the title or description to edit. Alongside: assignee, reporters, priority, labels, story points, sprint, epic, due date, and time tracking — the estimate, time logged and what's left. Log work as you go (“1h 30m”).",
    });
    y = card(doc, y, {
      title: "Comments, mentions and files",
      body: "Comment underneath; type @ and pick a name to mention someone — they're emailed and start watching. Attach images and files (up to 25 MB each) to the issue or to a comment. Watch an issue with the eye button to follow it.",
    });
    return card(doc, y, {
      title: "Links and history",
      body: "Link related issues — blocks, relates to, duplicates, clones — and both sides show the link. The History and Work log tabs record every change and every hour logged, with who and when.",
    });
  },

  workBoards: (doc) => {
    let y = newPage(doc, {
      eyebrow: "Work",
      title: "Boards, backlog and search",
      intro: "Pick a project at the top of each page; the portal remembers your choice.",
    });
    y = card(doc, y, {
      title: "Board",
      body: "Columns by status. Drag a card to move it. With a sprint running, the board shows that sprint; without one, it shows all open work. Filter to your own issues, recently updated or a label, and group by assignee or epic.",
    });
    y = card(doc, y, {
      title: "Backlog",
      body: "Upcoming work in priority order, with sprints above it. Drag issues up and down to reorder, or into a sprint to plan it. Type in the Create issue row for a quick task, or use Create for the full form.",
    });
    y = card(doc, y, {
      title: "Issues search",
      body: "Every issue in one table, filtered by project, type, status, priority, assignee, reporter, label, sprint or text. Filters live in the address, so a search can be shared as a link, or saved — privately or for everyone. Built-in filters cover “My open issues”, “Watching” and more.",
    });
    return card(doc, y, {
      tone: "brand",
      title: "The bell and your inbox",
      body: "The bell in the header lists what needs your attention — new issues where you're assignee or reporter, assignments, status changes, comments and mentions, leave and WFH requests and decisions. The same things arrive by email, with a button straight to the right page.",
    });
  },

  leadingWork: (doc) => {
    let y = newPage(doc, {
      eyebrow: "Leading work",
      title: "Sprints, reporters and your team's days",
      intro: "Managers, HR and admins — plus each project's lead and anyone made a project manager — run sprints. Everyone overseeing someone's work sees their days and performance.",
    });
    y = card(doc, y, {
      title: "Work reporters",
      body: "The administrator and each person's manager oversee their work automatically. HR can add others on the employee's profile (Work reporters). Reporters are on every issue planned for that person, get their daily digest, and can see their My Day and Performance.",
    });
    y = card(doc, y, {
      title: "Running a sprint",
      body: "In the backlog, Create sprint, drag issues in, then Start sprint — pick one to four weeks and a goal. One sprint runs at a time per project. Complete sprint from the board or backlog; unfinished work moves to the backlog, the next sprint or a new one.",
    });
    y = card(doc, y, {
      title: "Sprint report",
      body: "Sprint reports (from the board or backlog) show what was done and what wasn't, with a burndown: remaining work each day against the ideal straight line — in story points when issues have them, otherwise in issues.",
    });
    return card(doc, y, {
      title: "Bulk edit, and your team's performance",
      body: "On Issues, tick rows (or all) and set status, priority, assignee or sprint in one go. On Performance, pick a person to see their daily scores, what they planned and what they reported.",
    });
  },

  onboardingChecklist: (doc) => {
    let y = newPage(doc, {
      eyebrow: "Onboarding",
      title: "The new-hire checklist",
      intro: "Every new hire gets twelve tasks — welcome, documentation, IT setup, training and culture. Each task has an owner, and only its owner can tick it.",
    });
    y = bullet(doc, y, "The new hire ticks their own tasks — meeting the team and acknowledging the handbook happen in their welcome flow.");
    y = bullet(doc, y, "HR ticks the HR and IT tasks: documents, payroll details, laptop, accounts, buddy and welcome kit.");
    y = bullet(doc, y, "The new hire's manager ticks the training tasks: tools training and the 1:1 kickoff.");
    y = bullet(doc, y, "Anyone else sees the checklist but can't change it.");
    y = card(doc, y + 6, {
      tone: "brand",
      title: "Notes on each task",
      body: "Add a note when you update a task — “Offer letter signed 28 Sep”, “Dell Latitude, S/N …”, “Buddy: Dhruv”. It shows with who updated it and when. Keep the documents themselves where HR keeps them today: the portal records that something was done, not ID numbers or bank details.",
    });
    return card(doc, y, {
      title: "Finishing onboarding",
      body: "When every task is done, Mark active on the new hire's card. They stop seeing the onboarding checklist and carry on as a regular employee.",
    });
  },

  adminPowers: (doc) => {
    let y = newPage(doc, {
      eyebrow: "Admin only",
      title: "Permissions that are yours to grant",
      intro: "A few switches on an employee's profile are admin-only, because they change what someone can do across the portal.",
    });
    y = card(doc, y, {
      title: "Project managers",
      body: "Only admins and project managers create, edit and archive projects. Tick Project manager on someone's profile to let them. Everyone can still create and work on issues inside existing projects, and each project's lead can edit it.",
    });
    y = card(doc, y, {
      tone: "accent",
      title: "Test accounts",
      body: "Tick Test account on a profile and check-in hours, weekends and leave rules (probation, notice, balance) stop applying to that account — and a closed My Day can be reopened. It's for trying every flow at any time. Never use it for a real employee.",
    });
    return card(doc, y, {
      title: "Where the AI and email come from",
      body: "Planning and reviews use Groq's gpt-oss-120b model; email goes from auriginmedia@gmail.com. Both are configured on the server. If either is unavailable, the portal keeps working — plans fall back to one task per line, and emails are skipped rather than failing the action.",
    });
  },

  reference: (doc, s) => {
    const y = newPage(doc, {
      eyebrow: "Reference",
      title: "The rules, at a glance",
      intro: "As configured today. HR can change any of these under Settings, so treat the portal as the source of truth if the two ever disagree.",
    });
    return table(
      doc,
      y,
      [
        ["Office hours", `${s.hours}; check-in opens ${s.opensAt}, closed ${s.weeklyOff}`],
        ["Arriving late", s.lateRuleShort],
        ["Leaving early", `Before ${s.checkOutFrom} is flagged`],
        ["Emergency exceptions", `${s.emergencies} per calendar month`],
        ["Leave year", s.leaveYear],
        ["Earned leave", s.earned],
        ["Casual leave", s.casual],
        ["Sick leave", s.sick],
        ["Menstrual leave", s.menstrual],
        ["Other leave", s.otherLeave],
        ["Notice for leave", "Earned 7 days; casual 2 days (a week for more than 2). Inside that: mark it an emergency"],
        ["Probation", `${s.probation} by default; confirmation is a manual HR step`],
        ["Leave on probation", s.probationLeaveShort],
        ["Work from home", s.wfh],
      ],
      ["What", "How it works"],
    );
  },

  help: (doc, s, a) => {
    let y = newPage(doc, { eyebrow: "Help", title: "If something isn't right" });
    for (const line of a.helpLines) y = bullet(doc, y, line);
    y = card(doc, y + 10, {
      tone: "brand",
      title: "Who to ask",
      body: a.whoToAsk,
    });
    doc
      .fillColor(C.ink)
      .font("Helvetica-Bold")
      .fontSize(15)
      .text(a.signOff, PAGE.margins.left, y + 6, { width: CONTENT_W });
    doc
      .fillColor(C.body)
      .font("Helvetica")
      .fontSize(10.5)
      .text(
        "The portal is meant to stay out of your way. If it ever doesn't, say so — it's ours, and it can change.",
        PAGE.margins.left,
        doc.y + 5,
        { width: CONTENT_W - 40, lineGap: 3 },
      );
    return doc.y;
  },
};

// --- audiences --------------------------------------------------------------

const EMPLOYEE_HELP = (s) => [
  `Leave balance looks wrong? It's accrued to date, not your yearly total — a new joiner sees a small number on purpose. If it still looks off, ask HR.`,
  "Can't apply for leave? Check whether you're still on probation; your Leave page will say so.",
  `Check In greyed out? It opens at ${s.opensAt}, closes at ${s.checkOutFrom} and is off on ${s.weeklyOff}.`,
  "My Day planned something oddly? Edit or move any task on the board — the plan is a starting point, not a contract.",
  `Forgot to check out? Tell your manager — the day stays open, and an open day reads as leaving before ${s.checkOutFrom}.`,
  "Anything about pay, contracts or personal records: HR, not the portal.",
];

const AUDIENCES = {
  employee: {
    file: "aurigin-people-guide-employee.pdf",
    title: "Aurigin People — Employee guide",
    subject: "Introduction to the Aurigin People HR portal for employees",
    coverSubtitle: "Your guide to the HR portal",
    coverLine1: "Everything you need to start,",
    coverLine2: "in about five minutes.",
    coverBlurb:
      "Written for everyone at Aurigin Media — checking in, planning your day, working with issues, asking for leave, and knowing who to ask.",
    footer: "employee guide",
    welcomeTitle: "This is where the admin lives, so your work doesn't have to",
    welcomeIntro:
      "Aurigin People is our internal HR portal. It replaces the spreadsheets and the “quick question on WhatsApp” for the things that happen every week — marking attendance, asking for leave, working from home, and knowing where a request has got to.",
    sections: ["welcome", "gettingStarted", "everyday", "myDay", "workIssues", "workBoards", "probation", "reference", "help"],
    helpLines: EMPLOYEE_HELP,
    whoToAsk:
      "Your reporting manager for day-to-day approvals and anything about your work. HR for accounts, policy, records and pay. The org chart in the portal will tell you who's who.",
    signOff: "Welcome aboard.",
  },

  hr: {
    file: "aurigin-people-guide-hr.pdf",
    title: "Aurigin People — HR guide",
    subject: "Guide to running the Aurigin People HR portal, for HR",
    coverSubtitle: "The HR guide",
    coverLine1: "Onboarding, probation,",
    coverLine2: "approvals and policy.",
    coverBlurb:
      "Written for the HR team — adding people, confirming them, approving across the company, and setting the rules everyone works to.",
    footer: "HR guide",
    welcomeTitle: "The portal does the admin, so you can do the people part",
    welcomeIntro:
      "Aurigin People holds the records, the requests and the rules. This guide covers what everyone sees, then the parts only HR and admins can reach — adding employees, managing probation, and changing policy.",
    sections: [
      "welcome", "gettingStarted", "everyday", "myDay", "workIssues", "workBoards", "probation",
      "managing", "leadingWork", "running", "onboardingChecklist", "settings", "reference", "help",
    ],
    helpLines: (s) => [
      ...EMPLOYEE_HELP(s),
      "Someone can't apply for leave and shouldn't be blocked? Check their probation status on their profile, or the probation rule under Settings.",
      "A temporary password was closed before it was copied? Reset it from the employee's profile and hand over the new one.",
    ],
    whoToAsk:
      "Admins for anything account-level. For policy questions the Employee Handbook is the reference, and the portal's Settings page is where the numbers actually live.",
    signOff: "Thanks for keeping it running.",
  },

  admin: {
    file: "aurigin-people-guide-admin.pdf",
    title: "Aurigin People — Admin guide",
    subject: "Guide to administering the Aurigin People HR portal",
    coverSubtitle: "The admin guide",
    coverLine1: "The whole portal,",
    coverLine2: "and the rules behind it.",
    coverBlurb:
      "Written for admins — full visibility across the company, control of policy settings, and the things to be careful with.",
    footer: "admin guide",
    welcomeTitle: "You can see everything, and change most of it",
    welcomeIntro:
      "An admin account has the widest view in Aurigin People: every employee, every request, and the policy settings the whole company runs on. This guide covers what everyone sees first, then everything that's yours alone.",
    sections: [
      "welcome", "gettingStarted", "everyday", "myDay", "workIssues", "workBoards", "probation",
      "managing", "leadingWork", "running", "onboardingChecklist", "settings", "adminPowers", "reference", "help",
    ],
    helpLines: (s) => [
      ...EMPLOYEE_HELP(s),
      "Balances changed unexpectedly for everyone? Someone edited the accrual rates under Settings — they apply immediately and recalculate on the spot.",
      "Need the original policy numbers back? Settings → Reset to defaults restores what the portal shipped with.",
      "Analytics and Settings are admin/HR only; employees and managers never see them.",
    ],
    whoToAsk:
      "The Employee Handbook is the policy reference; the Settings page is where those numbers are actually enforced. If the two disagree, fix the one that's wrong rather than leaving both.",
    signOff: "It's yours to run.",
  },
};

// --- build ------------------------------------------------------------------

async function buildOne(key, settings) {
  const a = AUDIENCES[key];
  const s = describeSettings(settings);
  const out = path.join(ROOT, "public", a.file);

  const doc = new PDFDocument({
    ...PAGE,
    bufferPages: true,
    autoFirstPage: false,
    info: { Title: a.title, Author: "Aurigin Media", Subject: a.subject },
  });
  const stream = fs.createWriteStream(out);
  doc.pipe(stream);

  doc.addPage();
  coverPage(doc, a);

  // helpLines is a function of settings for the audiences that extend the
  // shared list, so resolve it once here.
  const resolved = { ...a, helpLines: typeof a.helpLines === "function" ? a.helpLines(s) : a.helpLines };

  for (const name of a.sections) {
    const y = SECTIONS[name](doc, s, resolved);
    checkFits(doc, y, `${key}/${name}`);
  }

  footers(doc, a);
  // Read the page count before end() flushes the buffer.
  const pages = doc.bufferedPageRange().count;
  doc.end();
  await new Promise((resolve) => stream.on("finish", resolve));

  const { size } = fs.statSync(out);
  console.log(`  ${a.file.padEnd(36)} ${String(pages).padStart(2)} pages  ${(size / 1024).toFixed(0)} KB`);
}

async function build() {
  const settings = await loadSettings();
  console.log("Generating guides:");
  for (const key of Object.keys(AUDIENCES)) await buildOne(key, settings);
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});

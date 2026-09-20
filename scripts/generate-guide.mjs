// Generates public/aurigin-people-guide.pdf — the introduction handed to
// new employees, managers, HR and admins when they get portal access.
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
const OUT = path.join(ROOT, "public", "aurigin-people-guide.pdf");
const LOGO = path.join(ROOT, "public", "logo.png");

// Brand palette, matching src/index.css.
const C = {
  ink: "#12193b",
  body: "#414a6b",
  muted: "#7d849c",
  primary: "#013fd2",
  primarySoft: "#e7ecfc",
  accent: "#be3a0a",
  accentSoft: "#fbeae2",
  cream: "#f8f6ef",
  creamDeep: "#f1ecdd",
  line: "#e2ddcd",
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

function coverPage(doc) {
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
    doc.image(LOGO, PAGE.margins.left, 86, { fit: [150, 60], align: "left" });
  }

  doc
    .fillColor(C.white)
    .font("Helvetica-Bold")
    .fontSize(52)
    .text("Aurigin", PAGE.margins.left, 210, { width: CONTENT_W, lineGap: -6 })
    .text("People", { width: CONTENT_W });

  doc
    .fillColor("#9fb4f2")
    .font("Helvetica")
    .fontSize(15)
    .text("Your guide to the HR portal", PAGE.margins.left, 340, { width: CONTENT_W });

  doc
    .fillColor(C.white)
    .font("Helvetica-Bold")
    .fontSize(20)
    .text("Everything you need to start,", PAGE.margins.left, H * 0.62, { width: CONTENT_W - 60 })
    .text("in about five minutes.", { width: CONTENT_W - 60 });

  doc
    .fillColor("#c9d6fb")
    .font("Helvetica")
    .fontSize(11)
    .text(
      "Written for everyone at Aurigin Media — whether you're checking in for the first time, approving your team's leave, or running the portal.",
      PAGE.margins.left,
      H * 0.62 + 66,
      { width: CONTENT_W - 80, lineGap: 3 },
    );

  doc
    .fillColor("#8fa9ef")
    .fontSize(9)
    .text(`Aurigin Media · ${new Date().getFullYear()}`, PAGE.margins.left, H - 74, { width: CONTENT_W });
}

/** Starts a new content page and returns the starting y. */
function newPage(doc, { eyebrow, title, intro }) {
  doc.addPage();
  doc.rect(0, 0, W, H).fill(C.cream);
  doc.rect(0, 0, W, 6).fill(C.primary);

  let y = PAGE.margins.top;
  if (eyebrow) {
    doc
      .fillColor(C.accent)
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
  const bg = tone === "brand" ? C.primarySoft : tone === "accent" ? C.accentSoft : C.white;
  const stripe = tone === "brand" ? C.primary : tone === "accent" ? C.accent : C.line;

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

function footers(doc) {
  const range = doc.bufferedPageRange();
  // Page 0 is the cover, which carries no footer.
  for (let i = 1; i < range.count; i++) {
    doc.switchToPage(i);
    doc
      .fillColor(C.muted)
      .font("Helvetica")
      .fontSize(8.5)
      .text("Aurigin People — your guide to the HR portal", PAGE.margins.left, H - 46, {
        width: CONTENT_W,
        align: "left",
      });
    doc.text(String(i), PAGE.margins.left, H - 46, { width: CONTENT_W, align: "right" });
  }
}

// --- document ---------------------------------------------------------------

async function build() {
  const settings = await loadSettings();
  const s = describeSettings(settings);

  const doc = new PDFDocument({ ...PAGE, bufferPages: true, autoFirstPage: false, info: {
    Title: "Aurigin People — Your guide to the HR portal",
    Author: "Aurigin Media",
    Subject: "Introduction to the Aurigin People HR portal for employees, managers, HR and admins",
  } });
  doc.pipe(fs.createWriteStream(OUT));

  doc.addPage();
  coverPage(doc);

  // 1. Welcome
  let y = newPage(doc, {
    eyebrow: "Welcome",
    title: "This is where the admin lives, so your work doesn't have to",
    intro:
      "Aurigin People is our internal HR portal. It replaces the spreadsheets and the “quick question on WhatsApp” for the things that happen every week — marking attendance, asking for leave, working from home, and knowing where a request has got to.",
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
    title: "The team, visible",
    body: "A directory and org chart so you can find who does what and who to ask — useful in your first week, and after it.",
  });
  y = card(doc, y, {
    tone: "accent",
    title: "The handbook, always to hand",
    body: "The Employee Handbook lives in the portal. New joiners read and acknowledge it during onboarding, and it stays available afterwards.",
  });

  checkFits(doc, y, "Welcome");

  // 2. Getting started
  y = newPage(doc, {
    eyebrow: "Getting started",
    title: "Your first five minutes",
    intro: "HR will give you a temporary password. From there it's four steps.",
  });
  y = step(doc, y, 1, "Sign in", "Go to the portal and sign in with your work email and the temporary password HR gave you.");
  y = step(doc, y, 2, "Set your own password", "You'll be asked to change it straight away. Pick something only you know — HR can't see it, and nobody can recover it for you.");
  y = step(doc, y, 3, "Read the handbook", "New joiners are walked through the Employee Handbook and asked to acknowledge it. Read to the last page — the acknowledge button unlocks there.");
  y = step(doc, y, 4, "Check in", "On the Attendance page, press Check in. That's your day recorded. Press Check out when you finish.");
  y += 4;
  y = card(doc, y, {
    tone: "brand",
    title: "Forgotten your password?",
    body: "Ask HR to reset it. You'll get a new temporary one and be asked to change it again on your next sign-in.",
  });

  checkFits(doc, y, "Getting started");

  // 3. Every day
  y = newPage(doc, {
    eyebrow: "For everyone",
    title: "The things you'll do most weeks",
  });
  y = card(doc, y, {
    title: "Attendance",
    badge: s.hours,
    body: `Check in when you start and out when you finish. Working hours are a check-in by ${s.checkInBy} and a check-out from ${s.checkOutFrom}. Miss either and the day is flagged — it's still recorded, nothing is refused. If something genuinely came up, you can mark the day as an emergency: ${s.emergencies} a month.`,
  });
  y = card(doc, y, {
    title: "Leave",
    badge: s.leaveYear,
    body: `Leave is earned month by month rather than handed over as a yearly lump, so your balance is what you've actually accrued. ${s.leaveSummary} Apply from the Leave page; it goes to your manager, and you'll see the outcome there.`,
  });
  y = card(doc, y, {
    title: "Working from home",
    badge: s.wfhWeekly,
    body: `Planned WFH is a request — raise it before the day so your manager can approve it. For a same-day emergency, “Mark WFH” on the Attendance page records it immediately. Remote work is an arrangement, not an automatic entitlement.`,
  });
  y = card(doc, y, {
    tone: "accent",
    title: "Recognition",
    body: "Saw someone do something good? Send kudos from the Recognition page. It's visible to the team, and it's the cheapest thing in here that makes the most difference.",
  });

  checkFits(doc, y, "Every day");

  // 4. Probation
  y = newPage(doc, {
    eyebrow: "If you've just joined",
    title: "Your first few months",
    intro: `New joiners start on probation — ${s.probation} by default. It's the settling-in period, and a couple of things work differently while it lasts.`,
  });
  y = bullet(doc, y, `Leave still accrues every month, so nothing is lost. ${s.probationLeave}`);
  y = bullet(doc, y, `Work from home is limited to ${s.wfhProbation} during probation.`);
  y = bullet(doc, y, "Everything else — attendance, recognition, the directory, the handbook — works exactly as it does for everyone.");
  y += 6;
  y = card(doc, y, {
    tone: "brand",
    title: "Being confirmed",
    body: "Confirmation isn't automatic when the date passes — HR confirms you deliberately, after a look at how things have gone. Once confirmed, the full leave and work-from-home entitlements apply from that moment.",
  });

  checkFits(doc, y, "Probation");

  // 5. Managers
  y = newPage(doc, {
    eyebrow: "For managers",
    title: "Approving, and keeping an eye out",
    intro: "If people report to you, two extra things land on your plate — and both live where you'd expect them.",
  });
  y = card(doc, y, {
    title: "Leave and WFH approvals",
    body: "Requests from your reports appear under Approvals on the Leave and Attendance pages. Approve or reject with a comment — the comment is what the person sees, so it's worth a sentence.",
  });
  y = card(doc, y, {
    title: "Your team's attendance",
    body: "The Attendance page shows your team for any date you pick: who's in, who's remote, who's on leave, and which days were flagged for a late check-in or early finish.",
  });
  y += 4;
  y = card(doc, y, {
    tone: "accent",
    title: "A flagged day isn't a problem by itself",
    body: "People have lives. The flag exists so patterns are visible, not so anyone gets caught out on a bad morning — and the emergency exceptions are there precisely for the genuine ones.",
  });

  checkFits(doc, y, "Managers");

  // 6. HR & admin
  y = newPage(doc, {
    eyebrow: "For HR & admins",
    title: "Running the portal",
    intro: "HR and admin accounts can see and change things the rest of the team can't.",
  });
  y = card(doc, y, {
    title: "Adding someone",
    body: "Add an employee from the Onboarding page. The portal creates their account and a one-time temporary password — shown once, so copy it before you close the dialog — and builds their onboarding checklist automatically.",
  });
  y = card(doc, y, {
    title: "Probation and confirmation",
    body: "Each employee's profile has a probation card: confirm them, put them back on probation, or change the end date. Confirming is deliberate and is never triggered by the date alone.",
  });
  y = card(doc, y, {
    tone: "brand",
    title: "Settings — the rules themselves",
    body: "Leave accrual rates and caps, when the leave year starts, probation length, work-from-home allowances, working hours and the emergency allowance are all editable under Settings. Change one and it applies to everyone immediately; leave balances are recalculated on the spot.",
  });
  y = card(doc, y, {
    title: "Analytics",
    body: "Headcount, attendance and leave trends across the company, for HR and admins only.",
  });

  checkFits(doc, y, "HR & admin");

  // 7. Rules at a glance
  y = newPage(doc, {
    eyebrow: "Reference",
    title: "The rules, at a glance",
    intro: "As configured today. HR can change any of these under Settings, so treat the portal as the source of truth if the two ever disagree.",
  });
  y = table(
    doc,
    y,
    [
      ["Working hours", `Check in by ${s.checkInBy}, check out from ${s.checkOutFrom}`],
      ["Emergency exceptions", `${s.emergencies} per calendar month`],
      ["Leave year", s.leaveYear],
      ["Earned leave", s.earned],
      ["Casual leave", s.casual],
      ["Sick leave", s.sick],
      ["Probation", `${s.probation} by default; confirmation is a manual HR step`],
      ["Leave on probation", s.probationLeaveShort],
      ["Work from home", `${s.wfhWeekly} once confirmed`],
      ["WFH on probation", s.wfhProbation],
    ],
    ["What", "How it works"],
  );

  checkFits(doc, y, "Rules at a glance");

  // 8. Help
  y = newPage(doc, {
    eyebrow: "Help",
    title: "If something isn't right",
  });
  y = bullet(doc, y, "Leave balance looks wrong? It's accrued to date, not your yearly total — a new joiner sees a small number on purpose. If it still looks off, ask HR.");
  y = bullet(doc, y, "Can't apply for leave? Check whether you're still on probation; your Leave page will say so.");
  y = bullet(doc, y, "WFH request refused by the portal? You may have used the allowance for the week or month.");
  y = bullet(doc, y, "Forgot to check out? Tell your manager — the day stays open otherwise.");
  y = bullet(doc, y, "Anything about pay, contracts or personal records: HR, not the portal.");
  y += 10;
  y = card(doc, y, {
    tone: "brand",
    title: "Who to ask",
    body: "Your reporting manager for day-to-day approvals and anything about your work. HR for accounts, policy, records and pay. The org chart in the portal will tell you who's who.",
  });
  y += 6;
  doc
    .fillColor(C.ink)
    .font("Helvetica-Bold")
    .fontSize(15)
    .text("Welcome aboard.", PAGE.margins.left, y + 6, { width: CONTENT_W });
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

  checkFits(doc, y, "Help");

  footers(doc);
  doc.end();

  await new Promise((resolve) => doc.on("end", resolve));
  const { size } = fs.statSync(OUT);
  console.log(`Wrote ${path.relative(ROOT, OUT)} (${(size / 1024).toFixed(0)} KB)`);
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});

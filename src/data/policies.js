// The company's policies live in the Employee Handbook PDF, served from
// /public. This file only describes it — there is deliberately no policy
// prose here, because a second copy of the text in the app would quietly
// drift out of step with the document people actually sign.
//
// To publish a new revision: replace the PDF in /public, then bump
// HANDBOOK.version and HANDBOOK.revisedOn so acknowledgements recorded
// against the old revision are distinguishable from new ones.

export const HANDBOOK = {
  file: "/employee-handbook.pdf",
  title: "Aurigin Media Employee Handbook",
  version: "First Draft",
  revisedOn: "2026-09-20",
  pageCount: 52,
};

/**
 * Jump targets for the PDF viewer, matching the handbook's own numbered
 * sections. `page` is the physical page in the PDF, which is what the
 * `#page=` fragment expects.
 */
export const HANDBOOK_SECTIONS = [
  { n: 1, page: 9, title: "General Policies & Procedures" },
  { n: 2, page: 11, title: "Code of Conduct & Professional Ethics" },
  { n: 3, page: 14, title: "Office Equipment & Asset Usage" },
  { n: 4, page: 15, title: "Human Resource Policy" },
  { n: 5, page: 17, title: "Compensation & Benefits" },
  { n: 6, page: 19, title: "Leave & Time-Off" },
  { n: 7, page: 21, title: "Employee Referral" },
  { n: 8, page: 22, title: "Performance Management" },
  { n: 9, page: 23, title: "Travel & Expense" },
  { n: 10, page: 24, title: "Exit & Separation" },
  { n: 11, page: 26, title: "Social Media & Client Accounts" },
  { n: 12, page: 28, title: "Client Confidentiality" },
  { n: 13, page: 30, title: "AI & Generative AI" },
  { n: 14, page: 31, title: "Data Privacy" },
  { n: 15, page: 32, title: "Intellectual Property & Copyright" },
  { n: 16, page: 33, title: "Remote & Hybrid Work" },
  { n: 17, page: 34, title: "Workplace Respect & Equal Opportunity" },
  { n: 18, page: 36, title: "Anti-Bribery, Gifts & Hospitality" },
  { n: 19, page: 37, title: "Health, Safety & Well-being" },
  { n: 20, page: 38, title: "Disciplinary & Corrective Action" },
  { n: 21, page: 39, title: "Employee Communication & Records" },
  { n: 22, page: 40, title: "Manager & Employee Responsibilities" },
  { n: 23, page: 41, title: "General Policy Administration" },
  { n: 24, page: 42, title: "Annexures" },
];

/** Wording the employee is agreeing to when they acknowledge. */
export const ACKNOWLEDGEMENT_TEXT =
  "I confirm that I have received, read and understood the Aurigin Media Employee Handbook, and I agree to comply with the policies set out in it.";

/** URL for the viewer, optionally opened at a given page. */
export function handbookUrl(page) {
  return page ? `${HANDBOOK.file}#page=${page}` : HANDBOOK.file;
}

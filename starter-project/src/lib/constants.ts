// Shared constants and helpers for the Budiman HRMS starter app.
// Roles are a plain string union (SQLite has no enums).
// The Leave Request module adds its own constants here in Session 2.

export const ROLES = ["EMPLOYEE", "SUPERVISOR", "HR", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  EMPLOYEE: "Employee",
  SUPERVISOR: "Supervisor",
  HR: "HR",
  ADMIN: "Admin",
};

// Every account uses a company email address.
export const EMAIL_DOMAIN = "budiman.com";

// The divisions and designations a user can have. Stored as plain text on the user.
export const DIVISIONS = [
  "Software Development",
  "Quality Assurance",
  "IT Infrastructure & Operations",
  "Cybersecurity",
  "Data & Analytics",
  "Product & Design",
  "Customer Support",
  "Human Resources",
  "Finance & Administration",
  "Management",
] as const;

export const DESIGNATIONS = [
  "Software Engineer",
  "QA Engineer",
  "System Administrator",
  "IT Support Technician",
  "Data Analyst",
  "UI/UX Designer",
  "Team Lead",
  "HR Officer",
  "Administrative Officer",
  "Director",
] as const;

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

// ── Leave Request module (design Part A2 §9–§11) ────────────────────────
// All stored as plain text because SQLite has no enums; these lists are the
// only valid values, the same way roles and divisions work.

export const LEAVE_TYPES = ["ANNUAL", "SICK", "COMPASSIONATE", "UNPAID"] as const;
export type LeaveType = (typeof LEAVE_TYPES)[number];

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  ANNUAL: "Annual",
  SICK: "Sick",
  COMPASSIONATE: "Compassionate",
  UNPAID: "Unpaid",
};

// The types that need a balance row. UNPAID is unlimited and has none.
export const BALANCED_LEAVE_TYPES = ["ANNUAL", "SICK", "COMPASSIONATE"] as const;

export const LEAVE_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "SENT_BACK",
  "PENDING_HR_REVIEW",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
] as const;
export type LeaveStatus = (typeof LEAVE_STATUSES)[number];

export const LEAVE_STATUS_LABELS: Record<LeaveStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  SENT_BACK: "Sent back for revision",
  PENDING_HR_REVIEW: "Pending HR Review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

// The fixed 2026 public-holiday list (Part A2 rule 3). Counted toward
// leave duration, subtracted from working days, never blocks a request.
// Workshop demo data — see docs/specs/02-design.md Part A2.
export const HOLIDAYS_2026: readonly string[] = [
  "2026-01-01", // New Year's Day
  "2026-02-17", // Lunar New Year
  "2026-03-20", // Eid al-Fitr (day 1)
  "2026-03-21", // Eid al-Fitr (day 2)
  "2026-05-01", // Labour Day
  "2026-05-27", // Eid al-Adha
  "2026-08-17", // Independence Day
  "2026-12-25", // Christmas
];

// Approval due date per level, in working days (display only — requirements U17).
export const APPROVAL_DUE_WORKING_DAYS = 3;

// The company's time zone. It decides what "today" is and how dates are shown.
export const APP_TIME_ZONE = "Asia/Brunei";

// Today's date in the company time zone, as a YYYY-MM-DD string.
export function todayIso(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

// Format a moment in time (e.g. submittedAt) as DD-MM-YYYY in the company time zone.
export function formatTimestamp(value: Date | string): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
    .format(d)
    .replaceAll("/", "-");
}

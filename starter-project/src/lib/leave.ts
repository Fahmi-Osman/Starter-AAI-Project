// Server-side Leave Request helpers (design Part A2). Pure date maths lives
// in leave-dates.ts so client components can use it without touching Prisma.
import { prisma } from "./db";
import { type LeaveStatus, type LeaveType, type Role } from "./constants";
import { workingDays, calendarDays } from "./leave-dates";

export {
  calendarDays,
  workingDays,
  dueDate,
  isOverdue,
  isHoliday,
  isWorkingDay,
  toUtcDay,
  toDateInputValue,
} from "./leave-dates";

// Remaining balance = daysAllowed − working days of APPROVED requests
// (Part A2 rule 5). Null means "no balance row" — i.e. unlimited (Unpaid).
export async function remainingBalance(
  userId: number,
  leaveType: LeaveType,
): Promise<number | null> {
  const balance = await prisma.leaveBalance.findUnique({
    where: { userId_leaveType: { userId, leaveType } },
  });
  if (!balance) return null;
  const approved = await prisma.leaveRequest.findMany({
    where: { userId, leaveType, status: "APPROVED" },
    select: { startDate: true, endDate: true },
  });
  const used = approved.reduce((sum, r) => sum + workingDays(r.startDate, r.endDate), 0);
  return balance.daysAllowed - used;
}

// The same maths as the card view needs in one pass: allowed/used/remaining
// per type. Null allowed means unlimited (Unpaid).
export async function balanceSummary(userId: number): Promise<
  { leaveType: LeaveType; allowed: number | null; used: number; remaining: number | null }[]
> {
  const balances = await prisma.leaveBalance.findMany({ where: { userId } });
  const approved = await prisma.leaveRequest.findMany({
    where: { userId, status: "APPROVED" },
    select: { leaveType: true, startDate: true, endDate: true },
  });
  const usedByType = new Map<string, number>();
  for (const r of approved) {
    usedByType.set(
      r.leaveType,
      (usedByType.get(r.leaveType) ?? 0) + workingDays(r.startDate, r.endDate),
    );
  }
  const types = ["ANNUAL", "SICK", "COMPASSIONATE", "UNPAID"] as const;
  return types.map((t) => {
    const allowed = balances.find((b) => b.leaveType === t)?.daysAllowed ?? null;
    const used = usedByType.get(t) ?? 0;
    return { leaveType: t, allowed, used, remaining: allowed === null ? null : allowed - used };
  });
}

// ── The action table (Part A2 §11.7) — the law ──────────────────────────
// One place used by both the screens (which buttons to show) and the server
// actions (what to allow). Anything outside these rows is refused.

export const LEAVE_ACTIONS = [
  "EDIT",
  "SUBMIT",
  "CANCEL",
  "APPROVE",
  "REJECT",
  "SEND_BACK",
] as const;
export type LeaveAction = (typeof LEAVE_ACTIONS)[number];

export type RequestActor = { id: number; role: Role };

export type RequestTarget = {
  userId: number; // the employee who applied
  status: LeaveStatus;
  employeeDivision: string;
  supervisorDivision?: string; // set when the actor is a SUPERVISOR
};

export function allowedAction(
  action: LeaveAction,
  actor: RequestActor,
  request: RequestTarget,
): boolean {
  const owns = actor.id === request.userId;

  if (actor.role === "EMPLOYEE" && owns) {
    switch (action) {
      case "EDIT":
      case "SUBMIT":
        return request.status === "DRAFT" || request.status === "SENT_BACK";
      case "CANCEL":
        return request.status === "DRAFT" || request.status === "SUBMITTED";
      default:
        return false;
    }
  }

  if (actor.role === "SUPERVISOR") {
    const sameDivision =
      request.supervisorDivision !== undefined &&
      request.supervisorDivision === request.employeeDivision;
    if (!sameDivision) return false;
    switch (action) {
      case "APPROVE":
      case "REJECT":
      case "SEND_BACK":
        return request.status === "SUBMITTED";
      default:
        return false;
    }
  }

  if (actor.role === "HR") {
    switch (action) {
      case "APPROVE":
      case "REJECT":
        return request.status === "PENDING_HR_REVIEW";
      default:
        return false; // HR has no send-back (requirements §8/U11)
    }
  }

  return false; // Admin and everyone else: view only
}

// All actions currently open to this actor on this request — what the
// detail screens render as buttons.
export function visibleActions(actor: RequestActor, request: RequestTarget): LeaveAction[] {
  return LEAVE_ACTIONS.filter((action) => allowedAction(action, actor, request));
}

// ── The submission checks (Part A2 rules 2 and 4–6) ─────────────────────

const MAX_RANGE_DAYS = 30;
const CERTIFICATE_MIN_DAYS = 2;

// Every check that runs when a request is submitted. Returns an error
// sentence or null. The server runs these itself — forms may help, but a
// hidden button is not a check.
export async function submitCheck(
  request: { id: number; userId: number; leaveType: string; startDate: Date; endDate: Date; hasCertificate: boolean; certificateNote: string | null },
): Promise<string | null> {
  if (request.leaveType === "UNPAID") return null; // unlimited: nothing to check (rule 8)

  if (request.endDate < request.startDate) {
    return "The end date must be on or after the start date.";
  }
  const cal = calendarDays(request.startDate, request.endDate);
  if (cal > MAX_RANGE_DAYS) {
    return `The range is ${cal} calendar days. Maximum is ${MAX_RANGE_DAYS} consecutive days.`;
  }

  // Rule 4: no overlap with the same employee's active requests.
  const activeStatuses = ["DRAFT", "SUBMITTED", "SENT_BACK", "PENDING_HR_REVIEW", "APPROVED"];
  const candidates = await prisma.leaveRequest.findMany({
    where: { userId: request.userId, status: { in: activeStatuses }, id: { not: request.id } },
    select: { startDate: true, endDate: true },
  });
  const overlaps = candidates.some(
    (c) => c.startDate <= request.endDate && request.startDate <= c.endDate,
  );
  if (overlaps) return "You already have a request in that period.";

  // Rule 6: sick certificate over 2 calendar days (checked before balance,
  // so AC-14 is not masked by AC-13 when both are wrong).
  if (
    request.leaveType === "SICK" &&
    cal > CERTIFICATE_MIN_DAYS &&
    !(request.hasCertificate && (request.certificateNote ?? "").trim())
  ) {
    return "Sick leave over 2 days needs the certificate tick and a short note.";
  }

  // Rule 5: not enough balance.
  const remaining = await remainingBalance(request.userId, request.leaveType as LeaveType);
  if (remaining !== null) {
    const wd = workingDays(request.startDate, request.endDate);
    if (wd > remaining) {
      return `Not enough balance: this request needs ${wd} working day(s) but you have ${remaining} left.`;
    }
  }

  return null;
}

// Leave Request helpers (design Part A2). Dates are stored at UTC midnight,
// so every calculation here uses the UTC getters to stay time-zone safe.
import { prisma } from "./db";
import {
  APPROVAL_DUE_WORKING_DAYS,
  HOLIDAYS_2026,
  type LeaveStatus,
  type LeaveType,
  type Role,
} from "./constants";

const MS_PER_DAY = 86_400_000;

const HOLIDAY_SET = new Set(HOLIDAYS_2026);

function toUtcDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function isoDay(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function isHoliday(value: Date): boolean {
  return HOLIDAY_SET.has(isoDay(value));
}

export function isWorkingDay(value: Date): boolean {
  const day = value.getUTCDay();
  return day >= 1 && day <= 5 && !isHoliday(value);
}

// Days in the range, both ends included. 0 for an invalid range.
export function calendarDays(start: Date, end: Date): number {
  const s = toUtcDay(start);
  const e = toUtcDay(end);
  if (e < s) return 0;
  return Math.round((e.getTime() - s.getTime()) / MS_PER_DAY) + 1;
}

// Weekdays only, minus the fixed holiday list (Part A2 rule 3).
export function workingDays(start: Date, end: Date): number {
  const s = toUtcDay(start);
  const e = toUtcDay(end);
  if (e < s) return 0;
  let count = 0;
  for (const day = new Date(s); day <= e; day.setTime(day.getTime() + MS_PER_DAY)) {
    if (isWorkingDay(day)) count += 1;
  }
  return count;
}

// The date `workingDaysAllowed` working days after `from` (weekends and
// holidays skipped). Display only — nothing happens automatically (U17).
export function dueDate(from: Date, workingDaysAllowed = APPROVAL_DUE_WORKING_DAYS): Date {
  let remaining = workingDaysAllowed;
  const day = toUtcDay(from);
  while (remaining > 0) {
    day.setTime(day.getTime() + MS_PER_DAY);
    if (isWorkingDay(day)) remaining -= 1;
  }
  return day;
}

export function isOverdue(submittedAt: Date, now = new Date()): boolean {
  return toUtcDay(now) > dueDate(submittedAt);
}

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

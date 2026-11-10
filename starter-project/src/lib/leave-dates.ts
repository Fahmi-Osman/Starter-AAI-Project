// Pure date maths for leave requests — no database, so client components may
// import it too (design Part A2 rule 3). Dates are stored at UTC midnight.
import { APPROVAL_DUE_WORKING_DAYS, HOLIDAYS_2026 } from "./constants";

const MS_PER_DAY = 86_400_000;

const HOLIDAY_SET = new Set(HOLIDAYS_2026);

export function toUtcDay(value: Date): Date {
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

// A Date stored at UTC midnight renders as the same calendar day.
export function toDateInputValue(value: Date): string {
  return value.toISOString().slice(0, 10);
}

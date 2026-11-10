import type { Prisma } from "@prisma/client";
import { LEAVE_STATUSES, LEAVE_TYPES, type LeaveStatus, type LeaveType } from "./constants";

// The admin overview filters (Part B2 §13): employee, leave type, status and
// a date range. Parsed once here so the page and the CSV export route apply
// exactly the same rules — "Export CSV always matches what is on screen".

export type LeaveFilters = {
  employee: string;
  type: string;
  status: string;
  from: string;
  to: string;
};

export const EMPTY_FILTERS: LeaveFilters = {
  employee: "",
  type: "",
  status: "",
  from: "",
  to: "",
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Reads the four filters off a URLSearchParams-like object, ignoring values
// that are not valid options (they simply do not filter).
export function parseLeaveFilters(sp: URLSearchParams): LeaveFilters {
  const employee = sp.get("employee") ?? "";
  const type = sp.get("type") ?? "";
  const status = sp.get("status") ?? "";
  const from = sp.get("from") ?? "";
  const to = sp.get("to") ?? "";
  return {
    employee: /^\d+$/.test(employee) ? employee : "",
    type: (LEAVE_TYPES as readonly string[]).includes(type) ? type : "",
    status: (LEAVE_STATUSES as readonly string[]).includes(status) ? status : "",
    from: DATE_RE.test(from) ? from : "",
    to: DATE_RE.test(to) ? to : "",
  };
}

export function filtersAreEmpty(f: LeaveFilters): boolean {
  return (
    f.employee === "" && f.type === "" && f.status === "" && f.from === "" && f.to === ""
  );
}

// A request matches the date range when its period overlaps the range
// (start before the range ends, end after the range begins).
export function buildLeaveWhere(f: LeaveFilters): Prisma.LeaveRequestWhereInput {
  const where: Prisma.LeaveRequestWhereInput = {};
  if (f.employee) where.userId = Number(f.employee);
  if (f.type) where.leaveType = f.type as LeaveType;
  if (f.status) where.status = f.status as LeaveStatus;
  if (f.to) where.startDate = { lte: new Date(`${f.to}T00:00:00.000Z`) };
  if (f.from) where.endDate = { gte: new Date(`${f.from}T00:00:00.000Z`) };
  return where;
}

import Link from "next/link";
import type { LeaveRequest, User } from "@prisma/client";
import {
  LEAVE_STATUSES,
  LEAVE_STATUS_LABELS,
  LEAVE_TYPES,
  LEAVE_TYPE_LABELS,
  formatTimestamp,
  type LeaveStatus,
  type LeaveType,
} from "@/lib/constants";
import { workingDays } from "@/lib/leave";
import { filtersAreEmpty, type LeaveFilters } from "@/lib/leave-filters";
import { StatusBadge } from "./StatusBadge";
import { EmptyState } from "./ui/EmptyState";
import { buttonClasses } from "./ui/Button";
import { inputClass } from "./ui/Field";

type Row = LeaveRequest & { user: User };

// The admin's table of requests (Part B2 §13, "LeaveTable with filter bar").
// Pure display: the server already applied the filters.
export function LeaveTable({
  requests,
  hrefBase,
}: {
  requests: Row[];
  hrefBase: string;
}) {
  if (requests.length === 0) {
    return (
      <EmptyState
        title="No requests match the filters"
        description="Clear a filter or two and try again."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
            <th className="px-5 py-3 font-medium">Employee</th>
            <th className="px-5 py-3 font-medium">Division</th>
            <th className="px-5 py-3 font-medium">Type</th>
            <th className="px-5 py-3 font-medium">Dates</th>
            <th className="px-5 py-3 font-medium">Working days</th>
            <th className="px-5 py-3 font-medium">Status</th>
            <th className="px-5 py-3 font-medium">Submitted</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((r) => (
            <tr key={r.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
              <td className="px-5 py-3">
                <Link
                  href={`${hrefBase}/${r.id}`}
                  className="font-medium text-brand-600 hover:underline"
                >
                  {r.user.name}
                </Link>
              </td>
              <td className="px-5 py-3 text-slate-600">{r.user.division}</td>
              <td className="px-5 py-3 text-slate-600">
                {LEAVE_TYPE_LABELS[r.leaveType as LeaveType] ?? r.leaveType}
              </td>
              <td className="px-5 py-3 text-slate-600">
                {formatTimestamp(r.startDate)} → {formatTimestamp(r.endDate)}
              </td>
              <td className="px-5 py-3 text-slate-600">{workingDays(r.startDate, r.endDate)}</td>
              <td className="px-5 py-3">
                <StatusBadge status={r.status as LeaveStatus} />
              </td>
              <td className="px-5 py-3 text-slate-600">{formatTimestamp(r.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// The GET form above the admin table. GET keeps the chosen values in the URL,
// so they survive reloads and the Export CSV link can reuse them (spec §15).
export function LeaveFilterBar({
  users,
  filters,
}: {
  users: Pick<User, "id" | "name" | "role">[];
  filters: LeaveFilters;
}) {
  const selectClass = `${inputClass} w-auto`;
  return (
    <form action="/admin" method="get" className="flex flex-wrap items-end gap-3">
      <div>
        <label htmlFor="f-employee" className="mb-1 block text-xs text-slate-500">
          Employee
        </label>
        <select
          id="f-employee"
          name="employee"
          defaultValue={filters.employee || undefined}
          className={selectClass}
        >
          <option value="">All users</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} ({u.role.toLowerCase()})
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="f-type" className="mb-1 block text-xs text-slate-500">
          Type
        </label>
        <select
          id="f-type"
          name="type"
          defaultValue={filters.type || undefined}
          className={selectClass}
        >
          <option value="">All types</option>
          {LEAVE_TYPES.map((t) => (
            <option key={t} value={t}>
              {LEAVE_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="f-status" className="mb-1 block text-xs text-slate-500">
          Status
        </label>
        <select
          id="f-status"
          name="status"
          defaultValue={filters.status || undefined}
          className={selectClass}
        >
          <option value="">All statuses</option>
          {LEAVE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {LEAVE_STATUS_LABELS[s as LeaveStatus]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="f-from" className="mb-1 block text-xs text-slate-500">
          From
        </label>
        <input
          id="f-from"
          name="from"
          type="date"
          defaultValue={filters.from || undefined}
          className={selectClass}
        />
      </div>
      <div>
        <label htmlFor="f-to" className="mb-1 block text-xs text-slate-500">
          To
        </label>
        <input
          id="f-to"
          name="to"
          type="date"
          defaultValue={filters.to || undefined}
          className={selectClass}
        />
      </div>
      <button type="submit" className={buttonClasses("primary")}>
        Apply filters
      </button>
      {!filtersAreEmpty(filters) && (
        <Link href="/admin" className={buttonClasses("secondary")}>
          Clear
        </Link>
      )}
    </form>
  );
}

import type { LeaveRequest, User } from "@prisma/client";
import {
  LEAVE_TYPE_LABELS,
  formatTimestamp,
  type LeaveType,
} from "@/lib/constants";
import { calendarDays, workingDays } from "@/lib/leave-dates";
import { DetailList, type DetailRow } from "./ui/DetailSection";
import { StatusBadge } from "./StatusBadge";

// The read-only request panel shared by every detail screen (Part B2 §13).
// Days are worked out from the dates every time — they are never stored.
export function LeaveDetail({
  request,
  showOwner = false,
}: {
  request: LeaveRequest & { user?: Pick<User, "name" | "email"> | null };
  showOwner?: boolean;
}) {
  const rows: DetailRow[] = [];
  if (showOwner && request.user) {
    rows.push({ label: "Employee", value: request.user.name });
  }
  rows.push(
    {
      label: "Leave type",
      value: LEAVE_TYPE_LABELS[request.leaveType as LeaveType] ?? request.leaveType,
    },
    { label: "Status", value: <StatusBadge status={request.status as never} /> },
    { label: "From", value: formatTimestamp(request.startDate) },
    { label: "To", value: formatTimestamp(request.endDate) },
    {
      label: "Length",
      value: `${calendarDays(request.startDate, request.endDate)} calendar days / ${workingDays(
        request.startDate,
        request.endDate,
      )} working days`,
    },
  );
  if (request.leaveType === "SICK") {
    rows.push({
      label: "Doctor's certificate",
      value: request.hasCertificate
        ? `Ticked${request.certificateNote ? ` — ${request.certificateNote}` : ""}`
        : "Not provided",
      wide: true,
    });
  }
  return <DetailList rows={rows} />;
}

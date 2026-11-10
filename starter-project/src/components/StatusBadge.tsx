import { LEAVE_STATUS_LABELS, type LeaveStatus } from "@/lib/constants";

// The coloured status pill used on every list and detail screen (Part B2 §13).
const STYLES: Record<LeaveStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  SUBMITTED: "bg-blue-100 text-blue-700",
  SENT_BACK: "bg-amber-100 text-amber-700",
  PENDING_HR_REVIEW: "bg-violet-100 text-violet-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
  CANCELLED: "bg-slate-100 text-slate-400",
};

export function StatusBadge({ status }: { status: LeaveStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[status]}`}
    >
      {LEAVE_STATUS_LABELS[status]}
    </span>
  );
}

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { LEAVE_STATUS_LABELS, LEAVE_TYPE_LABELS, type LeaveStatus, type LeaveType } from "@/lib/constants";
import { calendarDays, workingDays } from "@/lib/leave";
import { buildLeaveWhere, parseLeaveFilters } from "@/lib/leave-filters";

// The one route handler in the app (Part B2 §14): a browser download needs
// a GET. Admin only; the same filter parser as the overview page runs on the
// server, so the CSV always holds exactly the filtered rows (AC-24).
export async function GET(request: Request): Promise<Response> {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return new Response("Not allowed", { status: 403 });
  }

  const url = new URL(request.url);
  const filters = parseLeaveFilters(url.searchParams);
  const requests = await prisma.leaveRequest.findMany({
    where: buildLeaveWhere(filters),
    orderBy: { createdAt: "desc" },
    include: { user: true },
  });

  const rows = [
    [
      "id",
      "employee",
      "division",
      "type",
      "start",
      "end",
      "calendarDays",
      "workingDays",
      "status",
      "submittedAt",
    ],
    ...requests.map((r) => [
      String(r.id),
      r.user.name,
      r.user.division ?? "",
      LEAVE_TYPE_LABELS[r.leaveType as LeaveType] ?? r.leaveType,
      r.startDate.toISOString().slice(0, 10),
      r.endDate.toISOString().slice(0, 10),
      String(calendarDays(r.startDate, r.endDate)),
      String(workingDays(r.startDate, r.endDate)),
      LEAVE_STATUS_LABELS[r.status as LeaveStatus] ?? r.status,
      r.createdAt.toISOString(),
    ]),
  ];

  const csv = rows
    .map((row) =>
      row
        .map((cell) => (/[",\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell))
        .join(","),
    )
    .join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="leave-requests.csv"',
    },
  });
}

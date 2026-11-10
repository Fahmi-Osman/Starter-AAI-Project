import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { LEAVE_TYPE_LABELS, formatTimestamp, type LeaveType } from "@/lib/constants";
import { dueDate, workingDays } from "@/lib/leave";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { InboxIcon } from "@/components/ui/Icons";

// The HR queue (Part B2 §13): every PENDING_HR_REVIEW request, any division,
// newest first. HR sees requests that already passed a supervisor.
export default async function HRPage() {
  await requireRole("HR");

  const queue = await prisma.leaveRequest.findMany({
    where: { status: "PENDING_HR_REVIEW" },
    orderBy: { createdAt: "desc" },
    include: { user: true },
  });

  return (
    <>
      <PageHeader
        title="Leave to finalise"
        description="Requests your supervisors already approved, waiting for HR."
      />
      <Card>
        <CardHeader
          title="Waiting for HR"
          count={queue.length}
          description="Approve to grant the leave, or reject with a reason."
          icon={<InboxIcon />}
        />
        {queue.length === 0 ? (
          <EmptyState title="Nothing to finalise" description="Approved requests will appear here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3 font-medium">Employee</th>
                  <th className="px-5 py-3 font-medium">Division</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Dates</th>
                  <th className="px-5 py-3 font-medium">Working days</th>
                  <th className="px-5 py-3 font-medium">Due by</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-slate-50 last:border-0 hover:bg-slate-50"
                  >
                    <td className="px-5 py-3">
                      <Link
                        href={`/hr/leave/${r.id}`}
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
                    <td className="px-5 py-3 text-slate-600">
                      {workingDays(r.startDate, r.endDate)}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {formatTimestamp(dueDate(r.createdAt))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

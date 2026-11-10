import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { LEAVE_TYPE_LABELS, formatTimestamp, type LeaveType } from "@/lib/constants";
import { balanceSummary } from "@/lib/leave";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { buttonClasses } from "@/components/ui/Button";
import { PlusIcon, ClipboardIcon } from "@/components/ui/Icons";
import { StatusBadge } from "@/components/StatusBadge";
import { workingDays } from "@/lib/leave-dates";

// The Employee home (Part B2 §13): balance cards + a list of all my
// requests, cancelled ones included (U8).
export default async function EmployeePage() {
  const user = await requireRole("EMPLOYEE");

  const [balances, requests] = await Promise.all([
    balanceSummary(user.id),
    prisma.leaveRequest.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="My leave"
        description="Your balances and every leave request you have made."
        action={
          <Link href="/employee/leave/new" className={buttonClasses("primary")}>
            <PlusIcon className="h-4 w-4" /> New request
          </Link>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {balances.map((b) => (
          <Card key={b.leaveType} className="p-5">
            <p className="text-sm font-medium text-slate-500">
              {LEAVE_TYPE_LABELS[b.leaveType as LeaveType]}
            </p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {b.remaining === null ? "Unlimited" : b.remaining}
              {b.remaining !== null && (
                <span className="ml-1 text-sm font-normal text-slate-500">
                  of {b.allowed} days left
                </span>
              )}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {b.allowed === null ? "Never blocks a request" : `${b.used} used this year`}
            </p>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader
          title="My requests"
          count={requests.length}
          description="Newest first — cancelled requests stay here too."
          icon={<ClipboardIcon />}
        />
        {requests.length === 0 ? (
          <EmptyState
            title="No requests yet"
            description="Ask for your first leave with the New request button."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Dates</th>
                  <th className="px-5 py-3 font-medium">Working days</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <Link
                        href={`/employee/leave/${r.id}`}
                        className="font-medium text-brand-600 hover:underline"
                      >
                        {LEAVE_TYPE_LABELS[r.leaveType as LeaveType] ?? r.leaveType}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {formatTimestamp(r.startDate)} → {formatTimestamp(r.endDate)}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {workingDays(r.startDate, r.endDate)}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={r.status as never} />
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

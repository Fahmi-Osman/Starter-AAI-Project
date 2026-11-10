import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { allowedAction } from "@/lib/leave";
import { formatTimestamp, type Role } from "@/lib/constants";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { buttonClasses } from "@/components/ui/Button";
import { ArrowLeftIcon } from "@/components/ui/Icons";
import { LeaveDetail } from "@/components/LeaveDetail";
import { RequestActions } from "@/components/RequestActions";
import { CommentTimeline } from "@/components/CommentTimeline";

// The owner's request detail (Part B2 §13). Someone else's request id is
// Not found here (AC-22). Action buttons are added by later tasks.
export default async function EmployeeLeaveDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole("EMPLOYEE");
  const { id } = await params;
  const requestId = Number(id);
  if (!Number.isInteger(requestId)) notFound();

  const request = await prisma.leaveRequest.findUnique({
    where: { id: requestId },
    include: {
      user: true,
      comments: { include: { author: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!request || request.userId !== user.id) notFound();

  const actor = { id: user.id, role: user.role as Role };
  const target = {
    userId: request.userId,
    status: request.status as never,
    employeeDivision: request.user.division,
  };
  const canEdit = allowedAction("EDIT", actor, target);
  const canSubmit = allowedAction("SUBMIT", actor, target);
  const canCancel = allowedAction("CANCEL", actor, target);

  return (
    <>
      <PageHeader
        title="Leave request"
        description={`Created on ${formatTimestamp(request.createdAt)}.`}
        action={
          <div className="flex gap-2">
            {canEdit && (
              <Link href={`/employee/leave/${requestId}/edit`} className={buttonClasses("secondary")}>
                Edit
              </Link>
            )}
            <Link href="/employee" className={buttonClasses("secondary")}>
              <ArrowLeftIcon className="h-4 w-4" /> Back to my leave
            </Link>
          </div>
        }
      />
      <div className="space-y-6">
        <Card className="p-6">
          <LeaveDetail request={request} />
          <RequestActions requestId={requestId} canSubmit={canSubmit} canCancel={canCancel} />
        </Card>
        <Card className="p-6">
          <h2 className="mb-4 text-base font-semibold text-slate-900">Comments</h2>
          <CommentTimeline comments={request.comments} />
        </Card>
      </div>
    </>
  );
}

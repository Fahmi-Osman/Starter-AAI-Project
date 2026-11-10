import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { allowedAction } from "@/lib/leave";
import { formatTimestamp, type Role } from "@/lib/constants";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { buttonClasses } from "@/components/ui/Button";
import { ArrowLeftIcon } from "@/components/ui/Icons";
import { LeaveDetail } from "@/components/LeaveDetail";

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
    include: { user: true },
  });
  if (!request || request.userId !== user.id) notFound();

  const canEdit = allowedAction(
    "EDIT",
    { id: user.id, role: user.role as Role },
    {
      userId: request.userId,
      status: request.status as never,
      employeeDivision: request.user.division,
    },
  );

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
      <Card className="p-6">
        <LeaveDetail request={request} />
      </Card>
    </>
  );
}

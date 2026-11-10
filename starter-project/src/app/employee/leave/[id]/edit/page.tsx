import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { allowedAction, toDateInputValue } from "@/lib/leave";
import type { Role } from "@/lib/constants";
import { updateLeaveDraft } from "@/app/actions";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { buttonClasses } from "@/components/ui/Button";
import { ArrowLeftIcon } from "@/components/ui/Icons";
import { LeaveForm } from "@/components/LeaveForm";

// Edit a request (U9). Reachable only while Draft or Sent back, only by
// the owner — anyone else gets Not found.
export default async function EditLeavePage({
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

  const canEdit = allowedAction("EDIT", { id: user.id, role: user.role as Role }, {
    userId: request.userId,
    status: request.status as never,
    employeeDivision: request.user.division,
  });
  if (!canEdit) notFound();

  return (
    <>
      <PageHeader
        title="Edit leave request"
        description="This request has not been sent yet — change it freely."
        action={
          <Link href={`/employee/leave/${requestId}`} className={buttonClasses("secondary")}>
            <ArrowLeftIcon className="h-4 w-4" /> Back to request
          </Link>
        }
      />
      <Card className="max-w-xl p-6">
        <LeaveForm
          action={updateLeaveDraft.bind(null, requestId)}
          submitLabel="Save changes"
          initial={{
            leaveType: request.leaveType,
            startDate: toDateInputValue(request.startDate),
            endDate: toDateInputValue(request.endDate),
            hasCertificate: request.hasCertificate,
            certificateNote: request.certificateNote ?? "",
          }}
        />
      </Card>
    </>
  );
}

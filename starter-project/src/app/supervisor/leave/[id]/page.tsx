import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { approveAsSupervisor, rejectAsSupervisor, sendBackAsSupervisor } from "@/app/actions";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { buttonClasses } from "@/components/ui/Button";
import { ArrowLeftIcon } from "@/components/ui/Icons";
import { LeaveDetail } from "@/components/LeaveDetail";
import { CommentTimeline } from "@/components/CommentTimeline";
import { DecideDialog } from "@/components/DecideDialog";

// The supervisor's decide screen (Part B2 §13): only their division's
// SUBMITTED requests; anything else is Not found.
export default async function SupervisorDecidePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supervisor = await requireRole("SUPERVISOR");
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
  if (
    !request ||
    request.status !== "SUBMITTED" ||
    request.user.division !== supervisor.division
  ) {
    notFound();
  }

  return (
    <>
      <PageHeader
        title="Decide on request"
        description={`From ${request.user.name} · ${request.user.division}.`}
        action={
          <Link href="/supervisor" className={buttonClasses("secondary")}>
            <ArrowLeftIcon className="h-4 w-4" /> Back to queue
          </Link>
        }
      />
      <div className="space-y-6">
        <Card className="p-6">
          <LeaveDetail request={request} showOwner />
          <DecideDialog
            canApprove
            canReject
            canSendBack
            approveAction={approveAsSupervisor.bind(null, requestId)}
            rejectAction={rejectAsSupervisor.bind(null, requestId)}
            sendBackAction={sendBackAsSupervisor.bind(null, requestId)}
          />
        </Card>
        <Card className="p-6">
          <h2 className="mb-4 text-base font-semibold text-slate-900">Comments</h2>
          <CommentTimeline comments={request.comments} />
        </Card>
      </div>
    </>
  );
}

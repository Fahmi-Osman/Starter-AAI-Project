import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { buttonClasses } from "@/components/ui/Button";
import { ArrowLeftIcon } from "@/components/ui/Icons";
import { LeaveDetail } from "@/components/LeaveDetail";
import { CommentTimeline } from "@/components/CommentTimeline";

// The admin record view (Part B2 §13): the full request read-only with all
// its comments. Admin sees every request, whatever the status (Part A2 §12).
export default async function AdminRecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("ADMIN");
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
  if (!request) notFound();

  return (
    <>
      <PageHeader
        title="Request record"
        description={`From ${request.user.name} · ${request.user.division}.`}
        action={
          <Link href="/admin" className={buttonClasses("secondary")}>
            <ArrowLeftIcon className="h-4 w-4" /> Back to overview
          </Link>
        }
      />
      <div className="space-y-6">
        <Card className="p-6">
          <LeaveDetail request={request} showOwner />
        </Card>
        <Card className="p-6">
          <h2 className="mb-4 text-base font-semibold text-slate-900">Comments</h2>
          <CommentTimeline comments={request.comments} />
        </Card>
      </div>
    </>
  );
}

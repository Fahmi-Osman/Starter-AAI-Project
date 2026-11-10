import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createLeaveDraft } from "@/app/actions";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { buttonClasses } from "@/components/ui/Button";
import { ArrowLeftIcon } from "@/components/ui/Icons";
import { LeaveForm } from "@/components/LeaveForm";

// Create a draft (U6). Checks on Save: dates sane and the range within
// 30 days — the full checks run at submission (Task 9).
export default async function NewLeavePage() {
  await requireRole("EMPLOYEE");

  return (
    <>
      <PageHeader
        title="New leave request"
        description="Save it as a draft first — nothing is sent until you submit it."
        action={
          <Link href="/employee" className={buttonClasses("secondary")}>
            <ArrowLeftIcon className="h-4 w-4" /> Back to my leave
          </Link>
        }
      />
      <Card className="max-w-xl p-6">
        <LeaveForm action={createLeaveDraft} submitLabel="Save as draft" />
      </Card>
    </>
  );
}

import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { BALANCED_LEAVE_TYPES } from "@/lib/constants";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { buttonClasses } from "@/components/ui/Button";
import { UsersIcon } from "@/components/ui/Icons";
import { BalanceRow } from "@/components/BalanceRow";

// The balances screen (Part B2 §13): one row per person, editable allowed
// working days for the three limited types. Remaining is never edited —
// it is calculated from Approved requests (Part A2 rule 5).
export default async function AdminBalancesPage() {
  await requireRole("ADMIN");

  const users = await prisma.user.findMany({
    where: { role: { not: "ADMIN" } },
    orderBy: { name: "asc" },
    include: { balances: true },
  });

  return (
    <>
      <PageHeader
        title="Leave balances"
        description="Allowed working days per person. Remaining is calculated, so it cannot be set here."
        action={
          <Link href="/admin" className={buttonClasses("secondary")}>
            Back to overview
          </Link>
        }
      />
      <Card>
        <CardHeader
          title="Allowed days"
          count={users.length}
          description="Blank a box to keep its current value. Unpaid leave is always unlimited."
          icon={<UsersIcon />}
        />
        <div className="divide-y divide-slate-50">
          {users.map((u) => {
            const allowed: Record<string, number | null> = {};
            for (const t of BALANCED_LEAVE_TYPES) {
              allowed[t] = u.balances.find((b) => b.leaveType === t)?.daysAllowed ?? null;
            }
            return <BalanceRow key={u.id} userId={u.id} name={u.name} allowed={allowed} />;
          })}
        </div>
      </Card>
    </>
  );
}

import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ROLE_LABELS, type Role } from "@/lib/constants";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { buttonClasses } from "@/components/ui/Button";
import { UsersIcon } from "@/components/ui/Icons";
import { SuspendToggle } from "@/components/SuspendToggle";

// The accounts screen (Part B2 §13): every account with its name, role,
// division and active/suspended state. Suspend and Reactivate both ask
// first; a suspended person cannot log in but keeps all their data (AC-26).
export default async function AdminUsersPage() {
  await requireRole("ADMIN");

  const users = await prisma.user.findMany({ orderBy: { name: "asc" } });

  return (
    <>
      <PageHeader
        title="Accounts"
        description="Suspension blocks logging in. Nothing is deleted — requests and balances stay."
        action={
          <Link href="/admin" className={buttonClasses("secondary")}>
            Back to overview
          </Link>
        }
      />
      <Card>
        <CardHeader
          title="People"
          count={users.length}
          description="The admin account cannot suspend itself."
          icon={<UsersIcon />}
        />
        <div className="divide-y divide-slate-50">
          {users.map((u) => (
            <div key={u.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
              <div className="min-w-52 flex-1">
                <p className="font-medium text-slate-900">{u.name}</p>
                <p className="text-sm text-slate-500">
                  {ROLE_LABELS[u.role as Role] ?? u.role} · {u.division}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  u.suspended ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {u.suspended ? "Suspended" : "Active"}
              </span>
              <SuspendToggle userId={u.id} suspended={u.suspended} />
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

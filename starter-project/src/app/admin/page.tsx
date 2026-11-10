import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildLeaveWhere, parseLeaveFilters } from "@/lib/leave-filters";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { buttonClasses } from "@/components/ui/Button";
import { DownloadIcon } from "@/components/ui/Icons";
import { LeaveFilterBar, LeaveTable } from "@/components/LeaveTable";

// The admin overview (Part B2 §13): every request from all users, with
// filters that live in the URL so they survive reloads and the CSV export
// can reuse exactly the same ones (spec §15).
export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole("ADMIN");

  const raw = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (typeof value === "string") raw.set(key, value);
  }
  const filters = parseLeaveFilters(raw);
  const query = raw.toString();

  const [requests, users] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: buildLeaveWhere(filters),
      orderBy: { createdAt: "desc" },
      include: { user: true },
    }),
    prisma.user.findMany({
      where: { role: "EMPLOYEE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, role: true },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="All leave requests"
        description="Every request from every account — filters apply to the table and to the CSV export."
        action={
          <div className="flex gap-3">
            <Link href="/admin/balances" className={buttonClasses("secondary")}>
              Balances
            </Link>
            <Link href="/admin/users" className={buttonClasses("secondary")}>
              Accounts
            </Link>
            <a
              href={`/admin/leaves/export${query ? `?${query}` : ""}`}
              className={buttonClasses("primary")}
            >
              <DownloadIcon className="h-4 w-4" /> Export CSV
            </a>
          </div>
        }
      />
      <div className="space-y-6">
        <Card className="p-5">
          <LeaveFilterBar users={users} filters={filters} />
        </Card>
        <Card>
          <CardHeader
            title="Requests"
            count={requests.length}
            description="Click an employee name to open the full record."
          />
          <LeaveTable requests={requests} hrefBase="/admin/leave" />
        </Card>
      </div>
    </>
  );
}

// Quick check for Task 7 (docs/specs/03-tasks.md). Run: npx tsx scripts/check-leave.ts
// Prints the day-count maths and the action-table sanity checks and fails
// loudly if anything is off.
import {
  allowedAction,
  calendarDays,
  remainingBalance,
  workingDays,
  dueDate,
  isOverdue,
} from "../src/lib/leave";
import { prisma } from "../src/lib/db";
import { buildLeaveWhere, filtersAreEmpty, parseLeaveFilters } from "../src/lib/leave-filters";

const d = (iso: string) => new Date(`${iso}T00:00:00Z`);

let failures = 0;
function expect(what: string, actual: unknown, wanted: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(wanted);
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${what}: ${JSON.stringify(actual)}${ok ? "" : ` (wanted ${JSON.stringify(wanted)})`}`);
}

async function main() {
  // 1. Working days, weekends excluded.
  expect("workingDays Fri 2026-11-13 -> Mon 2026-11-16", workingDays(d("2026-11-13"), d("2026-11-16")), 2);
  expect("calendarDays same range", calendarDays(d("2026-11-13"), d("2026-11-16")), 4);

  // 2. A range touching a 2026 holiday loses that day.
  expect("workingDays Mon 2026-08-17 (Independence Day) -> Fri 2026-08-21", workingDays(d("2026-08-17"), d("2026-08-21")), 4);
  expect("calendarDays same range", calendarDays(d("2026-08-17"), d("2026-08-21")), 5);

  // 3. The seed rows that acceptance checks count on.
  expect("seed Sick 2026-10-05 -> 2026-10-07 (AC-19: costs 3)", workingDays(d("2026-10-05"), d("2026-10-07")), 3);
  expect("seed Annual 2026-08-10 -> 2026-08-14 (AC-19: costs 5)", workingDays(d("2026-08-10"), d("2026-08-14")), 5);

  // 4. Remaining balance = allowed minus approved working days.
  const e2 = await prisma.user.findUniqueOrThrow({ where: { email: "employee-2@budiman.com" } });
  expect("employee-2 remaining Annual (12 minus the approved 5)", await remainingBalance(e2.id, "ANNUAL"), 7);
  expect("employee-2 Unpaid needs no balance row (unlimited)", await remainingBalance(e2.id, "UNPAID"), null);

  // 5. The action table (Part A2 §11.7) — the law.
  const employee = { id: 1, role: "EMPLOYEE" as const };
  const employee2 = { id: 2, role: "EMPLOYEE" as const };
  const supervisor = { id: 3, role: "SUPERVISOR" as const };
  const hr = { id: 5, role: "HR" as const };
  const fin = "Finance & Administration";
  const draft = { userId: 1, status: "DRAFT" as const, employeeDivision: fin, supervisorDivision: fin };
  const submitted = { ...draft, status: "SUBMITTED" as const };
  const pendingHr = { ...draft, status: "PENDING_HR_REVIEW" as const };
  const otherDivision = { ...submitted, supervisorDivision: "Software Development" };

  expect("owner can edit own draft", allowedAction("EDIT", employee, draft), true);
  expect("another employee cannot edit it", allowedAction("EDIT", employee2, draft), false);
  expect("owner cannot cancel an Approved request", allowedAction("CANCEL", employee, { ...draft, status: "APPROVED" as const }), false);
  expect("same-division supervisor can approve Submitted", allowedAction("APPROVE", supervisor, submitted), true);
  expect("other-division supervisor cannot", allowedAction("APPROVE", supervisor, otherDivision), false);
  expect("supervisor cannot decide a Pending HR Review", allowedAction("APPROVE", supervisor, pendingHr), false);
  expect("HR can approve Pending HR Review", allowedAction("APPROVE", hr, pendingHr), true);
  expect("HR has no send-back", allowedAction("SEND_BACK", hr, pendingHr), false);
  expect("nobody acts on a Draft as supervisor", allowedAction("APPROVE", supervisor, draft), false);

  // 6. Due date display (3 working days, weekends+holidays skipped).
  expect("dueDate of Mon 2026-11-09", dueDate(d("2026-11-09")).toISOString().slice(0, 10), "2026-11-12");
  expect("submitted 2026-10-20 is overdue on 2026-11-10", isOverdue(d("2026-10-20"), d("2026-11-10")), true);
  expect("submitted yesterday is not overdue", isOverdue(d("2026-11-09"), d("2026-11-10")), false);

  // 7. Admin filters: same rules for the page and the CSV (AC-24).
  expect("empty filters are empty", filtersAreEmpty(parseLeaveFilters(new URLSearchParams())), true);
  expect("bad values are ignored", parseLeaveFilters(new URLSearchParams("type=NOPE&status=NOPE&from=13/01/2026")), {
    employee: "", type: "", status: "", from: "", to: "",
  });
  expect("status filter reaches the query", buildLeaveWhere(parseLeaveFilters(new URLSearchParams("status=APPROVED"))), { status: "APPROVED" });
  const ranged = buildLeaveWhere(parseLeaveFilters(new URLSearchParams("type=SICK&from=2026-12-01&to=2026-12-31")));
  expect("range overlaps: start before range end", (ranged.startDate as { lte: Date }).lte.toISOString().slice(0, 10), "2026-12-31");
  expect("range overlaps: end after range start", (ranged.endDate as { gte: Date }).gte.toISOString().slice(0, 10), "2026-12-01");
  expect("type filter applies", ranged.leaveType, "SICK");

  // 8. Seeded row counts.
  expect("users", await prisma.user.count(), 7);
  expect("balances", await prisma.leaveBalance.count(), 18);
  expect("requests", await prisma.leaveRequest.count(), 12);
  expect("seeded users all start active (Task 15)", await prisma.user.count({ where: { suspended: true } }), 0);

  await prisma.$disconnect();
  if (failures > 0) {
    console.error(`\n${failures} check(s) FAILED`);
    process.exit(1);
  }
  console.log("\nAll checks passed.");
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});

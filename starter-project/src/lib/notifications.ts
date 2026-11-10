// The only code that creates notifications (Part A2 rule 11). Events are
// fixed: submit/re-submit → the division's supervisors; decision → employee.
import { prisma } from "./db";
import { LEAVE_TYPE_LABELS, type LeaveType } from "./constants";

type StoredRequest = {
  id: number;
  userId: number;
  leaveType: string;
  user: { id: number; name: string; division: string };
};

// A request was submitted or re-submitted → every Supervisor of the
// employee's division gets one message.
export async function notifySupervisors(request: StoredRequest, workingDayCount: number): Promise<void> {
  const supervisors = await prisma.user.findMany({
    where: { role: "SUPERVISOR", division: request.user.division },
    select: { id: true },
  });
  const type = LEAVE_TYPE_LABELS[request.leaveType as LeaveType] ?? request.leaveType;
  const message = `New ${type} leave request from ${request.user.name} — ${workingDayCount} working day${workingDayCount === 1 ? "" : "s"}.`;
  for (const supervisor of supervisors) {
    await prisma.notification.create({
      data: { userId: supervisor.id, requestId: request.id, message },
    });
  }
}

// A decision was made about the employee's request → notify the employee.
export async function notifyEmployee(request: StoredRequest, message: string): Promise<void> {
  await prisma.notification.create({
    data: { userId: request.userId, requestId: request.id, message },
  });
}

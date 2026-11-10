"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { getCurrentUser, requireUser, startSession, endSession, roleHome } from "@/lib/auth";
import type { Role } from "@/lib/constants";
import {
  BALANCED_LEAVE_TYPES,
  LEAVE_TYPES,
  LEAVE_TYPE_LABELS,
  type LeaveType,
} from "@/lib/constants";
import { allowedAction, calendarDays, submitCheck, workingDays, type LeaveAction } from "@/lib/leave";
import type { RequestTarget } from "@/lib/leave";
import { notifySupervisors, notifyEmployee } from "@/lib/notifications";

function typeLabel(leaveType: string): string {
  return LEAVE_TYPE_LABELS[leaveType as LeaveType] ?? leaveType;
}

// Server actions: functions that run on the server when a button is pressed.
// Every leave action re-checks the Part A2 §11.7 action table itself —
// hiding a button is not a check.

export type ActionResult = { error?: string; ok?: boolean; message?: string };

// ── Shared leave helpers (not exported: a "use server" file exports only
// actions) ─────────────────────────────────────────────────────────────────

const LEAVE_TYPE_SET = new Set<string>(LEAVE_TYPES);
const MAX_RANGE_DAYS = 30;

type ParsedLeaveFields = {
  leaveType: string;
  startDate: Date;
  endDate: Date;
  hasCertificate: boolean;
  certificateNote: string | null;
};

function parseLeaveFields(
  formData: FormData,
): { ok: true; fields: ParsedLeaveFields } | { ok: false; error: string } {
  const leaveType = String(formData.get("leaveType") ?? "");
  if (!LEAVE_TYPE_SET.has(leaveType)) return { ok: false, error: "Please choose a leave type." };
  const startStr = String(formData.get("startDate") ?? "");
  const endStr = String(formData.get("endDate") ?? "");
  const isIsoDay = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
  if (!isIsoDay(startStr) || !isIsoDay(endStr)) {
    return { ok: false, error: "Please pick both a start and an end date." };
  }
  const startDate = new Date(`${startStr}T00:00:00Z`);
  const endDate = new Date(`${endStr}T00:00:00Z`);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return { ok: false, error: "Please pick valid dates." };
  }
  return {
    ok: true,
    fields: {
      leaveType,
      startDate,
      endDate,
      hasCertificate: formData.get("hasCertificate") === "yes",
      certificateNote: String(formData.get("certificateNote") ?? "").trim() || null,
    },
  };
}

function basicRangeError(startDate: Date, endDate: Date): string | null {
  if (endDate < startDate) return "The end date must be on or after the start date.";
  const cal = calendarDays(startDate, endDate);
  if (cal > MAX_RANGE_DAYS) {
    return `The range is ${cal} calendar days. Maximum is ${MAX_RANGE_DAYS} consecutive days.`;
  }
  return null;
}

function toTarget(
  request: { userId: number; status: string; user: { division: string } },
  actor: { role: string; division: string },
): RequestTarget {
  return {
    userId: request.userId,
    status: request.status as RequestTarget["status"],
    employeeDivision: request.user.division,
    supervisorDivision: actor.role === "SUPERVISOR" ? actor.division : undefined,
  };
}

export async function loginAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Please enter your email and password." };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return { error: "Invalid email or password." };
  }

  // Checked only after the password is right, so the message never reveals
  // which emails exist (Part A2 §9, rule 10).
  if (user.suspended) {
    return { error: "Account is suspended – contact HR." };
  }

  await startSession(user);
  // The sidebar frame lives in the root layout; without this the client can
  // reuse the cached logged-out layout and land on the dashboard with no frame.
  revalidatePath("/", "layout");
  redirect(roleHome(user.role as Role));
}

export async function logoutAction(): Promise<void> {
  await endSession();
  // The sidebar frame lives in the root layout; without this the client can
  // reuse the cached logged-in layout and show the frame around the login page.
  revalidatePath("/", "layout");
  redirect("/login");
}

// ── Employee: submit and cancel (Tasks 9 and 12) ──────────────────────────

export async function submitLeave(
  id: number,
  _prev: ActionResult,
  _formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  const request = await prisma.leaveRequest.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!request || request.userId !== user.id) {
    return { error: "Request not found." };
  }
  if (!allowedAction("SUBMIT", { id: user.id, role: user.role as Role }, toTarget(request, user))) {
    return { error: "This request cannot be submitted." };
  }

  // The four submission checks (Part A2 rules 2 and 4–6), run on the
  // stored values — the form is a helper, this is the gate.
  const problem = await submitCheck(request);
  if (problem) return { error: problem };

  await prisma.leaveRequest.update({ where: { id }, data: { status: "SUBMITTED" } });
  await notifySupervisors(request, workingDays(request.startDate, request.endDate));

  revalidatePath("/employee");
  revalidatePath(`/employee/leave/${id}`);
  revalidatePath("/supervisor");
  revalidatePath("/", "layout");
  return { ok: true };
}

// ── Employee: create and edit drafts (Task 8) ─────────────────────────────

export async function createLeaveDraft(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  if (user.role !== "EMPLOYEE") {
    return { error: "Only employees can create leave requests." };
  }
  const parsed = parseLeaveFields(formData);
  if (!parsed.ok) return { error: parsed.error };
  const rangeError = basicRangeError(parsed.fields.startDate, parsed.fields.endDate);
  if (rangeError) return { error: rangeError };

  const created = await prisma.leaveRequest.create({
    data: {
      userId: user.id,
      status: "DRAFT",
      leaveType: parsed.fields.leaveType,
      startDate: parsed.fields.startDate,
      endDate: parsed.fields.endDate,
      hasCertificate: parsed.fields.hasCertificate,
      certificateNote: parsed.fields.certificateNote,
    },
  });
  revalidatePath("/employee");
  revalidatePath("/", "layout");
  redirect(`/employee/leave/${created.id}`);
}

export async function updateLeaveDraft(
  id: number,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  const request = await prisma.leaveRequest.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!request || request.userId !== user.id) {
    return { error: "Request not found." };
  }
  if (!allowedAction("EDIT", { id: user.id, role: user.role as Role }, toTarget(request, user))) {
    return { error: "This request can no longer be edited." };
  }
  const parsed = parseLeaveFields(formData);
  if (!parsed.ok) return { error: parsed.error };
  const rangeError = basicRangeError(parsed.fields.startDate, parsed.fields.endDate);
  if (rangeError) return { error: rangeError };

  await prisma.leaveRequest.update({
    where: { id },
    data: {
      leaveType: parsed.fields.leaveType,
      startDate: parsed.fields.startDate,
      endDate: parsed.fields.endDate,
      hasCertificate: parsed.fields.hasCertificate,
      certificateNote: parsed.fields.certificateNote,
    },
  });
  revalidatePath("/employee");
  revalidatePath(`/employee/leave/${id}`);
  revalidatePath("/", "layout");
  redirect(`/employee/leave/${id}`);
}

// ── Notifications (Task 10) ────────────────────────────────────────────────

// Only the recipient can mark a notification read (Part A2 rule 11); the
// click then continues to the request behind it (AC-23).
export async function markNotificationRead(id: number, href: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  await prisma.notification.updateMany({
    where: { id, userId: user.id },
    data: { read: true },
  });
  revalidatePath("/", "layout");
  redirect(href);
}

// ── Supervisor decisions (Task 11) ─────────────────────────────────────────

async function loadDecidableBySupervisor(id: number, action: LeaveAction) {
  const user = await requireUser();
  const request = await prisma.leaveRequest.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!request) return { user, request: null as null, error: "Request not found." };
  if (!allowedAction(action, { id: user.id, role: user.role as Role }, toTarget(request, user))) {
    return { user, request: null as null, error: "You cannot decide on this request." };
  }
  return { user, request, error: null };
}

function revalidateAfterDecision(id: number, employeeId: number) {
  revalidatePath("/supervisor");
  revalidatePath("/hr");
  revalidatePath("/employee");
  revalidatePath(`/supervisor/leave/${id}`);
  revalidatePath(`/hr/leave/${id}`);
  revalidatePath(`/employee/leave/${id}`);
  revalidatePath("/", "layout");
  void employeeId;
}

export async function approveAsSupervisor(
  id: number,
  _prev: ActionResult,
  _formData: FormData,
): Promise<ActionResult> {
  const { request, error } = await loadDecidableBySupervisor(id, "APPROVE");
  if (!request) return { error: error ?? "Request not found." };

  await prisma.leaveRequest.update({ where: { id }, data: { status: "PENDING_HR_REVIEW" } });
  await notifyEmployee(
    request,
    `Your ${typeLabel(request.leaveType)} request was approved by your supervisor and is now with HR.`,
  );
  revalidateAfterDecision(id, request.userId);
  return { ok: true };
}

export async function rejectAsSupervisor(
  id: number,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { request, error } = await loadDecidableBySupervisor(id, "REJECT");
  if (!request) return { error: error ?? "Request not found." };
  const comment = String(formData.get("comment") ?? "").trim();
  if (!comment) return { error: "A comment is required to reject a request." };

  await prisma.leaveComment.create({
    data: { requestId: id, userId: (await requireUser()).id, body: comment },
  });
  await prisma.leaveRequest.update({ where: { id }, data: { status: "REJECTED" } });
  await notifyEmployee(
    request,
    `Your ${typeLabel(request.leaveType)} request was rejected. Reason: ${comment}`,
  );
  revalidateAfterDecision(id, request.userId);
  return { ok: true };
}

export async function sendBackAsSupervisor(
  id: number,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { request, error } = await loadDecidableBySupervisor(id, "SEND_BACK");
  if (!request) return { error: error ?? "Request not found." };
  const comment = String(formData.get("comment") ?? "").trim();
  if (!comment) return { error: "A comment is required to send a request back." };

  await prisma.leaveComment.create({
    data: { requestId: id, userId: (await requireUser()).id, body: comment },
  });
  await prisma.leaveRequest.update({ where: { id }, data: { status: "SENT_BACK" } });
  await notifyEmployee(
    request,
    `Your ${typeLabel(request.leaveType)} request was sent back for revision. Note: ${comment}`,
  );
  revalidateAfterDecision(id, request.userId);
  return { ok: true };
}

export async function cancelLeave(
  id: number,
  _prev: ActionResult,
  _formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  const request = await prisma.leaveRequest.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!request || request.userId !== user.id) {
    return { error: "Request not found." };
  }
  if (!allowedAction("CANCEL", { id: user.id, role: user.role as Role }, toTarget(request, user))) {
    return { error: "This request can no longer be cancelled." };
  }

  await prisma.leaveRequest.update({ where: { id }, data: { status: "CANCELLED" } });
  revalidatePath("/employee");
  revalidatePath(`/employee/leave/${id}`);
  revalidatePath("/supervisor");
  revalidatePath("/", "layout");
  return { ok: true };
}

// ── HR final decisions (Task 13) ────────────────────────────────────────────

async function loadDecidableByHr(id: number, action: LeaveAction) {
  const user = await requireUser();
  const request = await prisma.leaveRequest.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!request) return { user, request: null as null, error: "Request not found." };
  if (!allowedAction(action, { id: user.id, role: user.role as Role }, toTarget(request, user))) {
    return { user, request: null as null, error: "You cannot decide on this request." };
  }
  return { user, request, error: null };
}

export async function approveAsHr(
  id: number,
  _prev: ActionResult,
  _formData: FormData,
): Promise<ActionResult> {
  const { request, error } = await loadDecidableByHr(id, "APPROVE");
  if (!request) return { error: error ?? "Request not found." };

  // Approval is where the balance is consumed — it is derived from APPROVED
  // requests, so no counter is updated here (Part A2 §11.4).
  await prisma.leaveRequest.update({ where: { id }, data: { status: "APPROVED" } });
  await notifyEmployee(
    request,
    `Your ${typeLabel(request.leaveType)} request was approved. Enjoy your time off!`,
  );
  revalidateAfterDecision(id, request.userId);
  return { ok: true };
}

export async function rejectAsHr(
  id: number,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { request, error } = await loadDecidableByHr(id, "REJECT");
  if (!request) return { error: error ?? "Request not found." };
  const comment = String(formData.get("comment") ?? "").trim();
  if (!comment) return { error: "A comment is required to reject a request." };

  await prisma.leaveComment.create({
    data: { requestId: id, userId: (await requireUser()).id, body: comment },
  });
  await prisma.leaveRequest.update({ where: { id }, data: { status: "REJECTED" } });
  await notifyEmployee(
    request,
    `Your ${typeLabel(request.leaveType)} request was rejected. Reason: ${comment}`,
  );
  revalidateAfterDecision(id, request.userId);
  return { ok: true };
}

// ── Admin: balances and suspension (Task 15) ────────────────────────────────

async function requireAdminAction(): Promise<ActionResult | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return { error: "Only an admin can do that." };
  }
  return null;
}

// One row per person per limited leave type (Part A2 §9): the balances page
// saves a whole row at once. Unpaid has no row and is not editable.
export async function setBalance(
  userId: number,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const denied = await requireAdminAction();
  if (denied) return denied;

  // Validate everything first so a bad cell never saves half the row.
  const values: { leaveType: string; days: number }[] = [];
  for (const leaveType of BALANCED_LEAVE_TYPES) {
    const raw = String(formData.get(`days-${leaveType}`) ?? "").trim();
    if (raw === "") continue; // left blank: keep the current value
    const days = Number(raw);
    if (!Number.isInteger(days) || days < 0 || days > 365) {
      return {
        error: `${typeLabel(leaveType)}: allowed days must be a whole number between 0 and 365.`,
      };
    }
    values.push({ leaveType, days });
  }

  for (const v of values) {
    await prisma.leaveBalance.upsert({
      where: { userId_leaveType: { userId, leaveType: v.leaveType } },
      update: { daysAllowed: v.days },
      create: { userId, leaveType: v.leaveType, daysAllowed: v.days },
    });
  }
  revalidatePath("/admin/balances");
  revalidatePath("/employee");
  return { ok: true };
}

// Suspension blocks login but keeps every request, comment and balance
// (Part A2 §9, rule 10 / AC-26). An admin cannot suspend their own account.
export async function setSuspended(
  userId: number,
  suspended: boolean,
  _prev: ActionResult,
  _formData: FormData,
): Promise<ActionResult> {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN") {
    return { error: "Only an admin can do that." };
  }
  if (admin.id === userId) {
    return { error: "You cannot suspend your own account." };
  }

  await prisma.user.update({ where: { id: userId }, data: { suspended } });
  revalidatePath("/admin/users");
  return { ok: true };
}

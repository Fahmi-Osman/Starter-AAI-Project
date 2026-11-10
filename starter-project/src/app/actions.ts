"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { getCurrentUser, requireUser, startSession, endSession, roleHome } from "@/lib/auth";
import type { Role } from "@/lib/constants";
import { LEAVE_TYPES } from "@/lib/constants";
import { allowedAction, calendarDays } from "@/lib/leave";
import type { RequestTarget } from "@/lib/leave";

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

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// The demo users (design §6). Every one logs in with the password "password123".
// Each name includes the user's division in brackets.
const USERS = [
  { email: "employee-1@budiman.com", name: "Employee 1 (Finance & Administration)", role: "EMPLOYEE", identificationNo: "00-148291", designation: "Administrative Officer", division: "Finance & Administration" },
  { email: "employee-2@budiman.com", name: "Employee 2 (Software Development)", role: "EMPLOYEE", identificationNo: "00-173604", designation: "Software Engineer", division: "Software Development" },
  { email: "supervisor-1@budiman.com", name: "Supervisor 1 (Finance & Administration)", role: "SUPERVISOR", identificationNo: "00-159827", designation: "Team Lead", division: "Finance & Administration" },
  { email: "supervisor-2@budiman.com", name: "Supervisor 2 (Software Development)", role: "SUPERVISOR", identificationNo: "00-126418", designation: "Team Lead", division: "Software Development" },
  { email: "hr-1@budiman.com", name: "HR 1 (Human Resources)", role: "HR", identificationNo: "00-191356", designation: "HR Officer", division: "Human Resources" },
  { email: "hr-2@budiman.com", name: "HR 2 (Human Resources)", role: "HR", identificationNo: "00-184072", designation: "HR Officer", division: "Human Resources" },
  { email: "admin@budiman.com", name: "Admin (Management)", role: "ADMIN", identificationNo: "00-105739", designation: "Director", division: "Management" },
];

// Balances for every non-Admin user (design Part A2 §9, requirements §9).
const BALANCES = [
  { leaveType: "ANNUAL", daysAllowed: 12 },
  { leaveType: "SICK", daysAllowed: 12 },
  { leaveType: "COMPASSIONATE", daysAllowed: 3 },
];

// Dates are stored at UTC midnight so day maths is time-zone safe.
const day = (iso: string) => new Date(`${iso}T00:00:00Z`);

type SeedComment = { by: string; body: string };
type SeedNotification = { to: string; message: string; read?: boolean };
type SeedRequest = {
  owner: string; // user email
  leaveType: string;
  startDate: string;
  endDate: string;
  status: string;
  hasCertificate?: boolean;
  certificateNote?: string;
  createdAt?: string; // only for the deliberately old request (AC-27)
  comments: SeedComment[];
  notifications: SeedNotification[];
};

// The 12 sample requests from design §16: every status appears, and the
// rows AC-10…AC-26 need are in place before the participant clicks anything.
const REQUESTS: SeedRequest[] = [
  {
    owner: "employee-1@budiman.com", leaveType: "ANNUAL",
    startDate: "2026-12-07", endDate: "2026-12-11", status: "PENDING_HR_REVIEW",
    comments: [{ by: "supervisor-1@budiman.com", body: "Looks fine from my side — passing to HR." }],
    notifications: [{ to: "employee-1@budiman.com", message: "Your Annual request was approved by your supervisor and is now with HR.", read: true }],
  },
  {
    owner: "employee-1@budiman.com", leaveType: "ANNUAL",
    startDate: "2027-01-11", endDate: "2027-01-13", status: "DRAFT",
    comments: [], notifications: [],
  },
  {
    owner: "employee-1@budiman.com", leaveType: "SICK",
    startDate: "2026-10-05", endDate: "2026-10-07", status: "APPROVED",
    hasCertificate: true, certificateNote: "Clinik Medika, ref 4471",
    comments: [{ by: "supervisor-1@budiman.com", body: "Approved. Get well soon." }],
    notifications: [{ to: "employee-1@budiman.com", message: "Your Sick request was approved.", read: true }],
  },
  {
    owner: "employee-1@budiman.com", leaveType: "COMPASSIONATE",
    startDate: "2026-09-14", endDate: "2026-09-14", status: "REJECTED",
    comments: [{ by: "supervisor-1@budiman.com", body: "Business is busy that week" }],
    notifications: [{ to: "employee-1@budiman.com", message: "Your Compassionate request was rejected. Reason: Business is busy that week", read: true }],
  },
  {
    owner: "employee-1@budiman.com", leaveType: "UNPAID",
    startDate: "2026-11-30", endDate: "2026-11-30", status: "CANCELLED",
    comments: [], notifications: [],
  },
  {
    owner: "employee-1@budiman.com", leaveType: "ANNUAL",
    startDate: "2026-11-16", endDate: "2026-11-18", status: "SENT_BACK",
    comments: [{ by: "supervisor-1@budiman.com", body: "Please swap the dates" }],
    notifications: [{ to: "employee-1@budiman.com", message: "Your Annual request was sent back for revision. Note: Please swap the dates", read: false }],
  },
  {
    owner: "employee-1@budiman.com", leaveType: "ANNUAL",
    startDate: "2027-03-01", endDate: "2027-03-03", status: "SUBMITTED",
    comments: [],
    notifications: [{ to: "supervisor-1@budiman.com", message: "New Annual leave request from Employee 1 (Finance & Administration) — 3 working days.", read: false }],
  },
  {
    owner: "employee-1@budiman.com", leaveType: "ANNUAL",
    startDate: "2027-03-08", endDate: "2027-03-10", status: "SUBMITTED",
    comments: [],
    notifications: [{ to: "supervisor-1@budiman.com", message: "New Annual leave request from Employee 1 (Finance & Administration) — 3 working days.", read: false }],
  },
  {
    owner: "employee-1@budiman.com", leaveType: "SICK",
    startDate: "2026-12-21", endDate: "2026-12-23", status: "PENDING_HR_REVIEW",
    hasCertificate: true, certificateNote: "Klinik Sehat, ref 8812",
    comments: [{ by: "supervisor-1@budiman.com", body: "Approved from my side." }],
    notifications: [{ to: "employee-1@budiman.com", message: "Your Sick request was approved by your supervisor and is now with HR.", read: true }],
  },
  {
    owner: "employee-2@budiman.com", leaveType: "ANNUAL",
    startDate: "2026-12-14", endDate: "2026-12-18", status: "SUBMITTED",
    comments: [],
    notifications: [{ to: "supervisor-2@budiman.com", message: "New Annual leave request from Employee 2 (Software Development) — 5 working days.", read: false }],
  },
  {
    // Submitted long ago → shows the Overdue flag for AC-27.
    owner: "employee-2@budiman.com", leaveType: "SICK",
    startDate: "2026-11-02", endDate: "2026-11-04", status: "SUBMITTED",
    hasCertificate: true, certificateNote: "Klinik Sejahtera, ref 2210",
    createdAt: "2026-10-20T02:00:00Z",
    comments: [],
    notifications: [{ to: "supervisor-2@budiman.com", message: "New Sick leave request from Employee 2 (Software Development) — 2 working days.", read: true }],
  },
  {
    owner: "employee-2@budiman.com", leaveType: "ANNUAL",
    startDate: "2026-08-10", endDate: "2026-08-14", status: "APPROVED",
    comments: [{ by: "supervisor-2@budiman.com", body: "Approved. Enjoy the break." }],
    notifications: [{ to: "employee-2@budiman.com", message: "Your Annual request was approved.", read: true }],
  },
];

async function main() {
  // Reset the data so the seed is repeatable (children first).
  await prisma.notification.deleteMany();
  await prisma.leaveComment.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.leaveBalance.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 10);
  const users = new Map<string, number>();
  for (const user of USERS) {
    const created = await prisma.user.create({ data: { ...user, passwordHash } });
    users.set(user.email, created.id);
  }

  let balanceCount = 0;
  for (const user of USERS) {
    if (user.role === "ADMIN") continue; // Admin does not apply for leave
    const userId = users.get(user.email)!;
    for (const balance of BALANCES) {
      await prisma.leaveBalance.create({ data: { userId, ...balance } });
      balanceCount += 1;
    }
  }

  let requestCount = 0;
  let commentCount = 0;
  let notificationCount = 0;
  for (const request of REQUESTS) {
    const created = await prisma.leaveRequest.create({
      data: {
        userId: users.get(request.owner)!,
        leaveType: request.leaveType,
        startDate: day(request.startDate),
        endDate: day(request.endDate),
        status: request.status,
        hasCertificate: request.hasCertificate ?? false,
        certificateNote: request.certificateNote,
        ...(request.createdAt ? { createdAt: new Date(request.createdAt) } : {}),
      },
    });
    requestCount += 1;

    for (const comment of request.comments) {
      await prisma.leaveComment.create({
        data: { requestId: created.id, userId: users.get(comment.by)!, body: comment.body },
      });
      commentCount += 1;
    }
    for (const notification of request.notifications) {
      await prisma.notification.create({
        data: {
          requestId: created.id,
          userId: users.get(notification.to)!,
          message: notification.message,
          read: notification.read ?? false,
        },
      });
      notificationCount += 1;
    }
  }

  console.log(`Seeded ${USERS.length} demo users (password: password123):`);
  for (const user of USERS) console.log(`  ${user.email.padEnd(26)} ${user.role}`);
  console.log(`Seeded ${balanceCount} leave balances (Annual 12, Sick 12, Compassionate 3; Unpaid is unlimited).`);
  console.log(`Seeded ${requestCount} demo leave requests with ${commentCount} comments and ${notificationCount} notifications.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

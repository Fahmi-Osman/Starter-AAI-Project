# Login – Tasks

> **In what order, and how to check.** Build one task at a time, in order.
> After each task: the AI builds it → a reviewer agent tests it → **you check it
> in the browser**.
>
> If a check fails, **fix the spec first** (requirements or design), then ask
> the AI to rebuild. The requirements and design are the source of truth.
>
> These tasks are **already done** in the starter app – they show what a task
> list looks like. In Session 2, add the Leave Request tasks after Task 6.

**Core and Stretch.** **Core** tasks must be finished first: the app is not
usable without them. **Stretch** tasks are nice extras. Do them only if time is
left, and only if you ask for them. All the login tasks are Core, because login
has to work before anything else.

**Before you start:** `npm install`, then `cp .env.example .env`
(Windows: `copy .env.example .env`).

| # | Task | Core / Stretch | Checks (from requirements §4) |
|---|------|----------------|-------------------------------|
| 1 | Set up the app | Core | – |
| 2 | Database table and demo users | Core | – |
| 3 | Log in and log out | Core | AC-01, AC-02, AC-03, AC-06 |
| 4 | Role protection and home pages | Core | AC-04, AC-05, AC-07 |
| 5 | Top bar | Core | AC-08, AC-09 |
| 6 | Final check and README | Core | All |

---

## Task 1 – Set up the app *(Core)*

- **Goal:** A Next.js + TypeScript app with Tailwind CSS that starts.
- **Files:** `package.json`, `next.config.ts`, `tsconfig.json`,
  `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
  (starts with `@import "tailwindcss";` – no Tailwind config file needed).
- **Check:** `npm run dev` starts, and http://localhost:3000 shows a page.

## Task 2 – Database table and demo users *(Core)*

- **Goal:** Prisma with SQLite, the `User` table from design Part A, and the
  demo users from design §6 with hashed passwords.
- **Files:** `prisma/schema.prisma`, `prisma/migrations/`, `prisma/seed.ts`,
  `src/lib/db.ts`, `src/lib/constants.ts`, `.env.example`, the `db:seed`
  script in `package.json`.
- **Check:** `npm run db:migrate` creates `prisma/dev.db`. `npm run db:seed`
  prints the 7 demo users, and `npm run db:studio` shows them.

## Task 3 – Log in and log out *(Core)*

- **Goal:** Login page, signed session cookie, and logout with a confirmation
  box. After login, go to the role's home page.
- **Files:** `src/lib/auth.ts` (`getCurrentUser`, `startSession`, `endSession`,
  `roleHome`), `src/app/actions.ts` (`loginAction`, `logoutAction`),
  `src/app/login/page.tsx`, `src/components/LoginForm.tsx`,
  `src/components/LogoutButton.tsx`, `src/components/ui/` (Button, Field,
  dialogs).
- **Check:** AC-01, AC-02, AC-03, AC-06.

## Task 4 – Role protection and home pages *(Core)*

- **Goal:** A `requireRole(...)` helper used at the top of every page, so each
  role sees only its own screens, and a home page for each role with only a short hint line.
- **Files:** `src/lib/auth.ts`, `src/app/employee/page.tsx`,
  `src/app/supervisor/page.tsx`, `src/app/hr/page.tsx`,
  `src/app/admin/page.tsx`.
- **Check:** AC-04, AC-05, AC-07.

## Task 5 – Top bar *(Core)*

- **Goal:** The top bar from design §4 (app name, who is logged in, **Log
  out**), and the **Not found** page.
- **Files:** `src/components/AppShell.tsx`, `src/components/LogoutButton.tsx`,
  `src/components/ui/`, `src/app/not-found.tsx`.
- **Check:** AC-08, AC-09.

## Task 6 – Final check and README *(Core)*

- **Goal:** Run `npm run db:seed`, then walk through the whole acceptance
  checklist as each role. Make sure `README.md` explains how to install, run
  and test.
- **Check:** Every AC box ticked; `npm run lint` and `npm run build` pass.

---

# Leave Request – Tasks

> Added in Session 2, after the finished login tasks. Same rule: build one
> task at a time, in order — the AI builds → the reviewer tests the listed
> AC checks → **you check it in the browser**. If a check fails, fix the
> spec first. The login must keep working through every task.
>
> All tasks are **Core** except Task 16 (Stretch — do it only if you ask).

| # | Task | Core / Stretch | Checks (from requirements §9) |
|---|------|----------------|-------------------------------|
| 7 | Leave data: tables, helpers, demo rows | Core | – |
| 8 | Employee: drafts and home page | Core | AC-10 |
| 9 | Submitting with the checks | Core | AC-11, AC-12, AC-13, AC-14 |
| 10 | Notification bell | Core | AC-15, AC-23 |
| 11 | Supervisor queue and decisions | Core | AC-16, AC-17, AC-18 |
| 12 | Request detail: cancel and privacy | Core | AC-21, AC-22 |
| 13 | HR queue and final decision | Core | AC-19, AC-20 |
| 14 | Admin overview and CSV export | Core | AC-24 |
| 15 | Admin: balances and suspension | Core | AC-25, AC-26 |
| 16 | Overdue flag | Stretch | AC-27 |
| 17 | Final check and README | Core | All |

---

## Task 7 – Leave data: tables, helpers, demo rows *(Core)*

- **Goal:** The four tables from design Part A2 §9 with a migration, the
  allowed lists in constants (leave types, statuses, 2026 holidays), the
  day-counting helpers (`calendarDays`, `workingDays`, `remainingBalance`,
  `dueDate`, `allowedAction`), and the seed extended with balances and the
  12 sample requests from design §16.
- **Files:** `prisma/schema.prisma`, `prisma/migrations/`, `prisma/seed.ts`,
  `src/lib/constants.ts`, `src/lib/leave.ts`.
- **Check:** `npm run db:migrate` runs; `npm run db:seed` prints the counts
  (7 users, 18 balances, 12 requests); `npm run db:studio` shows them; a
  quick script shows `workingDays(Fri→Mon) = 2` and a range touching a
  2026 holiday loses that day.

## Task 8 – Employee: drafts and home page *(Core)*

- **Goal:** The employee home replaces the hint page: balance cards
  (allowed / used / remaining per type) and the list of all own requests
  with status badges. Create a draft from *New request* (live "Days: X
  calendar / Y working", certificate box appears only for Sick) and edit
  it later; both reject a range over 30 days or start after end.
- **Files:** `src/app/employee/page.tsx`,
  `src/app/employee/leave/new/page.tsx`,
  `src/app/employee/leave/[id]/page.tsx` (view with the buttons that fit),
  `src/app/employee/leave/[id]/edit/page.tsx`,
  `src/components/LeaveForm.tsx`, `src/components/StatusBadge.tsx`,
  `src/app/actions.ts` (`createLeaveDraft`, `updateLeaveDraft`).
- **Check:** AC-10.

## Task 9 – Submitting with the checks *(Core)*

- **Goal:** **Submit** moves a Draft / Sent-back request to Submitted and
  runs the four checks from Part A2 §11 (30-day cap, overlap, balance,
  sick certificate) with the exact error sentences; everything is
  re-checked on the server, not just in the form.
- **Files:** `src/app/actions.ts` (`submitLeave`),
  `src/lib/leave.ts` (submit checks).
- **Check:** AC-11, AC-12, AC-13, AC-14.

## Task 10 – Notification bell *(Core)*

- **Goal:** `src/lib/notifications.ts` creates rows only for the Part A2
  §11.11 events — submitting notifies the division's supervisors (first
  producer; the decision producers come in Tasks 11 and 13). The top bar
  gets a bell with the unread count and a dropdown: newest first, unread
  marked, click → mark read and open the request; the count drops and
  survives reload.
- **Files:** `src/lib/notifications.ts`, `src/components/NotificationBell.tsx`,
  `src/components/AppShell.tsx`, `src/app/actions.ts` (`markNotificationRead`,
  notify on submit).
- **Check:** AC-15, AC-23.

## Task 11 – Supervisor queue and decisions *(Core)*

- **Goal:** The supervisor home becomes the division queue (Submitted
  rows, due-by date shown). The decide screen has **Approve** → Pending
  HR Review, **Reject** and **Send back**, the last two in a dialog that
  requires a comment and stores it as a `LeaveComment`; each decision
  notifies the employee. Approving another division's request or acting
  twice is refused on the server.
- **Files:** `src/app/supervisor/page.tsx`,
  `src/app/supervisor/leave/[id]/page.tsx`, `src/components/DecideDialog.tsx`,
  `src/app/actions.ts` (`approveAsSupervisor`, `rejectAsSupervisor`,
  `sendBackAsSupervisor`), `src/lib/notifications.ts` (decision notices).
- **Check:** AC-16, AC-17, AC-18.

## Task 12 – Request detail: cancel and privacy *(Core)*

- **Goal:** Finish the employee detail screen: the comment timeline, and
  **Cancel** (asks first) only while Draft / Submitted — the button is
  gone in other statuses and a direct server call is refused too. Another
  employee opening the request URL gets **Not found**.
- **Files:** `src/app/employee/leave/[id]/page.tsx`,
  `src/components/CommentTimeline.tsx`, `src/app/actions.ts` (`cancelLeave`).
- **Check:** AC-21, AC-22.

## Task 13 – HR queue and final decision *(Core)*

- **Goal:** The HR home lists every Pending HR Review request (any
  division). The HR screen offers **Approve** (→ Approved, balance now
  consumed) and **Reject** (dialog, comment required, notifies the
  employee). There is no send-back control at all.
- **Files:** `src/app/hr/page.tsx`, `src/app/hr/leave/[id]/page.tsx`,
  `src/app/actions.ts` (`approveAsHr`, `rejectAsHr`).
- **Check:** AC-19, AC-20.

## Task 14 – Admin overview and CSV export *(Core)*

- **Goal:** The admin home lists every request from all 7 users with
  filters (employee, type, status, date range) that stay applied via the
  URL; rows open a read-only record view; **Export CSV** downloads exactly
  the filtered rows (the one Admin-only route handler).
- **Files:** `src/app/admin/page.tsx`, `src/app/admin/leave/[id]/page.tsx`,
  `src/components/LeaveTable.tsx`, `src/app/admin/leaves/export/route.ts`.
- **Check:** AC-24.

## Task 15 – Admin: balances and suspension *(Core)*

- **Goal:** *Balances* page edits allowed days per person per type (Unpaid
  shown unlimited) and the new value is what the next submit checks.
  *Accounts* page suspends/reactivates (asks first); a suspended user
  cannot log in — clear message — and their requests stay decidable.
- **Files:** `src/app/admin/balances/page.tsx`, `src/app/admin/users/page.tsx`,
  `src/app/actions.ts` (`setBalance`, `setSuspended`, suspended check in
  `loginAction`).
- **Check:** AC-25, AC-26.

## Task 16 – Overdue flag *(Stretch)*

- **Goal:** Requests past their 3-working-day due date show a red
  **Overdue** flag in the supervisor and HR queues. Nothing else happens
  automatically.
- **Files:** `src/app/supervisor/page.tsx`, `src/app/hr/page.tsx`,
  `src/lib/leave.ts` (`dueDate`).
- **Check:** AC-27.

## Task 17 – Final check and README *(Core)*

- **Goal:** `npm run db:seed`, then walk **every** AC from requirements §4
  and §9 as each role — login checks included, so nothing broke. Add the
  module to `README.md` (demo requests, what each page shows).
- **Check:** All AC boxes ticked; `npm run lint` and `npm run build` pass.

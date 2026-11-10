# Login – Design

> **How it is built.** This document turns the requirements into a plan a
> builder (person or AI) can follow without asking the business again.
> [01-requirements.md](01-requirements.md) is the source of truth for
> *behaviour*; if the two disagree, fix the requirements first, then this file.
>
> - **Part A – Data design** (sections 1–2): **you own and review this.**
> - **Part A2 – Leave Request data design** (sections 9–12): added in
>   Session 2. **You own and review this too.** The matching Part B
>   (screens for the module) is drafted only after Part A2 is approved.
> - **Part B – App design** (sections 3–8): the AI drafts this; you check it.
> - **Part B2 – Leave Request app design** (sections 13–17): the AI drafts
>   this; **you check it** (screens, code layout, demo data, security).

---

# Part A – Data design (you review)

## 1. Tables

The app stores data in one table so far. Every row gets a number (`id`)
automatically. In Session 2 you add the leave request table here.

### `User` – one row per person who can log in

| Field | Type | Required? | What it holds |
|-------|------|-----------|---------------|
| `id` | number | auto | Unique number for the user |
| `email` | text | yes, unique | Used to log in, stored in lowercase, e.g. `employee-1@budiman.com` |
| `name` | text | yes | Full name shown on screen, with the division in brackets, e.g. "Employee 1 (Finance & Administration)" |
| `passwordHash` | text | yes | Scrambled password – never the real one |
| `role` | text | yes | `EMPLOYEE`, `SUPERVISOR`, `HR` or `ADMIN` |
| `identificationNo` | text | yes | Staff ID: `00-1` then 5 digits, e.g. `00-148291` |
| `designation` | text | yes | Job title, one of the list in rule 4, e.g. `Administrative Officer` |
| `division` | text | yes | Department, one of the list in rule 4, e.g. `Finance & Administration` |
| `createdAt` | date + time | auto | When the user was created |

> **Why is role plain text?** SQLite (our database) does not support a fixed
> list of choices ("enums"). So the allowed values are listed in
> `src/lib/constants.ts`, and the app checks them.

## 2. Business rules

1. **Emails.** Every email is a company address ending in `@budiman.com`. It is
   stored in lowercase and is unique, so login ignores capitals.
2. **Passwords.** Stored only as a hash (bcrypt). A wrong email and a wrong
   password give the **same** message, so nobody can find out which emails exist.
3. **Roles.** Each user has exactly one role. The role decides which pages they
   can open (§4).
4. **Divisions and designations** are chosen from fixed lists, kept in
   `src/lib/constants.ts`:
   - **Division:** Software Development, Quality Assurance, IT Infrastructure &
     Operations, Cybersecurity, Data & Analytics, Product & Design, Customer
     Support, Human Resources, Finance & Administration, Management.
   - **Designation:** Software Engineer, QA Engineer, System Administrator,
     IT Support Technician, Data Analyst, UI/UX Designer, Team Lead, HR Officer,
     Administrative Officer, Director. The designation is only a job title;
     the role decides what someone can do.
5. **Sessions.** A login lasts 7 days on the same browser, then the user must
   log in again.

---

# Part A2 – Leave Request – Data design (you own and review this)

> Added in Session 2 for the Leave Request module. Same idea as Part A:
> plain words for what we store and the rules around it. Behaviour comes
> from [01-requirements.md](01-requirements.md) §6–§11; if the two
> disagree, fix the requirements first.

## 9. Tables

Four new tables sit next to `User`. Every row gets a number (`id`)
automatically, like everywhere else.

### `LeaveRequest` – one row per leave application

| Field | Type | Required? | What it holds |
|-------|------|-----------|---------------|
| `id` | number | auto | Unique number for the request |
| `userId` | number | yes | The employee who applied (points at a `User` row) |
| `leaveType` | text | yes | `ANNUAL`, `SICK`, `COMPASSIONATE` or `UNPAID` (rule 1) |
| `startDate` | date | yes | First day off; the day itself counts |
| `endDate` | date | yes | Last day off; the day itself counts |
| `status` | text | yes | One of the seven words in §10 |
| `hasCertificate` | yes/no | yes, default no | The "I have a doctor's certificate" tick (Sick leave, rule 6) |
| `certificateNote` | text | no | Short note about the certificate, e.g. the clinic |
| `createdAt` | date + time | auto | When the draft was created |
| `updatedAt` | date + time | auto | Last change; the app fills it in |

Nothing else is stored. The app **works out** the calendar days and
working days from the two dates whenever it shows or checks them (rule 3)
— storing them twice would invite mismatches. Reason strings are **not**
stored here either: they are comments in the table below.

### `LeaveComment` – one row per comment on a request

| Field | Type | Required? | What it holds |
|-------|------|-----------|---------------|
| `id` | number | auto | Unique number |
| `requestId` | number | yes | Which request (points at a `LeaveRequest` row) |
| `userId` | number | yes | Who wrote it (points at a `User` row) |
| `body` | text | yes | The message — a rejection reason, a send-back note |
| `createdAt` | date + time | auto | When it was written |

Comments are never edited or deleted. Together with the status they are
the record of who decided what, and when (rule 9).

### `LeaveBalance` – one row per person per leave type

| Field | Type | Required? | What it holds |
|-------|------|-----------|---------------|
| `id` | number | auto | Unique number |
| `userId` | number | yes | The person |
| `leaveType` | text | yes | `ANNUAL`, `SICK` or `COMPASSIONATE` — no row for `UNPAID`, it is unlimited |
| `daysAllowed` | number | yes | How many **working** days this person gets; Admin sets it (rule 5) |

The **remaining** balance is calculated, never stored: `daysAllowed`
minus the working days of that person's **Approved** requests of that
type. One number to keep right instead of two.

### `Notification` – one row per bell message

| Field | Type | Required? | What it holds |
|-------|------|-----------|---------------|
| `id` | number | auto | Unique number |
| `userId` | number | yes | The recipient (points at a `User` row) |
| `requestId` | number | yes | The request it is about (points at a `LeaveRequest` row) |
| `message` | text | yes | The sentence shown in the dropdown, e.g. "Your Annual request 12 was approved" |
| `read` | yes/no | yes, default no | Has the recipient seen it? |
| `createdAt` | date + time | auto | When it was created |

Only the app creates notifications (rule 11). A user can only mark **their
own** as read; nobody edits or deletes them.

### One extra field on `User` – suspension (U16)

| Field | Type | Required? | What it holds |
|-------|------|-----------|---------------|
| `suspended` | yes/no | yes, default no | Is this account suspended? Set by Admin on `/admin/users` |

A suspended user **cannot log in** (rule 10): `loginAction` checks this
flag before starting a session and shows "Account is suspended – contact
HR". Nothing is deleted — requests, comments and balances stay, so other
roles still see them (AC-26).

## 10. Statuses

Every request carries exactly one of these seven words (plain text, list
kept in `src/lib/constants.ts` — SQLite has no enums, same as roles):

| Stored | Shown as | Meaning |
|--------|----------|---------|
| `DRAFT` | Draft | Being written; only its creator can see it |
| `SUBMITTED` | Submitted | Waiting for a supervisor of the employee's division |
| `SENT_BACK` | Sent back for revision | Supervisor wants changes; the employee may edit |
| `PENDING_HR_REVIEW` | Pending HR Review | Supervisor said yes; waiting for HR |
| `APPROVED` | Approved | Final yes; consumes balance |
| `REJECTED` | Rejected | Final no; a comment with the reason exists |
| `CANCELLED` | Cancelled | The employee withdrew it (only possible while Draft or Submitted) |

The chain, one step at a time — nobody skips:

```
DRAFT ──submit──▶ SUBMITTED ──supervisor approves──▶ PENDING_HR_REVIEW ──HR approves──▶ APPROVED
  ▲                  │  ▲                                    │
  │                  │  └── supervisor sends back ──▶ SENT_BACK ──edit + resubmit──┘
  │                  ├── supervisor rejects ──▶ REJECTED          ├── HR rejects ──▶ REJECTED
  └── (edit)         └── employee cancels ──▶ CANCELLED   (from DRAFT too: cancel)
```

`APPROVED`, `REJECTED` and `CANCELLED` are final — nothing moves out of
them. Every move is in the action table (rule 7); no other move is allowed.

## 11. Business rules

1. **Leave types.** A fixed list — `ANNUAL`, `SICK`, `COMPASSIONATE`,
   `UNPAID` — kept in `src/lib/constants.ts`, like divisions and roles.
2. **Dates.** `startDate` is on or before `endDate`. The whole range,
   weekends and holidays included, may be at most **30 calendar days**.
3. **Working days.** Monday–Friday, minus the fixed 2026 Indonesian public
   holiday list in `src/lib/constants.ts`. Duration is shown in **calendar**
   days; balances move in **working** days (requirements assumption 1).
4. **No double-booking.** One employee cannot hold two overlapping ranges
   among their **active** statuses (Draft, Submitted, Sent back, Pending HR
   Review, Approved). Cancelled and Rejected requests do not block.
5. **Balance.** Remaining = `daysAllowed` − working days of **Approved**
   requests (per type). It is **checked when the employee submits** (not
   when drafting) and **consumed when HR approves**; rejected and cancelled
   requests never cost anything. `UNPAID` is unlimited: no row, no check.
6. **Sick certificate.** A Sick range of more than **2 calendar days**
   cannot be submitted unless `hasCertificate` is ticked and a short
   `certificateNote` is given. No file upload anywhere.
7. **Allowed actions.** This table is the law — every action runs on the
   server with its own re-check (`requireRole` + status check):

   | Who | Action | Only when the request is | Effect |
   |-----|--------|--------------------------|--------|
   | Employee (own) | Create | — (new) | a `DRAFT` row appears |
   | Employee (own) | Edit type/dates | `DRAFT` or `SENT_BACK` | stays in the same status |
   | Employee (own) | Submit | `DRAFT` or `SENT_BACK` | → `SUBMITTED`; rules 2, 4, 5, 6 are checked; supervisors of the division are notified |
   | Employee (own) | Cancel | `DRAFT` or `SUBMITTED` | → `CANCELLED` |
   | Supervisor (same division) | Approve | `SUBMITTED` | → `PENDING_HR_REVIEW`; employee notified |
   | Supervisor (same division) | Reject | `SUBMITTED` | → `REJECTED`; non-empty comment required; employee notified |
   | Supervisor (same division) | Send back | `SUBMITTED` | → `SENT_BACK`; non-empty comment required; employee notified |
   | HR | Approve | `PENDING_HR_REVIEW` | → `APPROVED`; balance consumed (rule 5); employee notified |
   | HR | Reject | `PENDING_HR_REVIEW` | → `REJECTED`; non-empty comment required; employee notified |

   Anyone outside those rows (wrong role, wrong division, wrong status,
   not the owner) is refused on the server, even if a button somehow
   appears.
8. **Comments.** Rejection and send-back require a non-empty comment; it
   is stored in `LeaveComment` and shown to the employee with the status.
9. **Records are permanent.** Requests, comments and notifications are
   never edited (apart from the allowed edits above) and never deleted —
   they are the audit trail.
10. **Suspension.** A suspended user cannot log in, so they cannot create,
    edit or decide anything. Their existing requests stay as they are and
    approvers keep working on them.
11. **Notifications** exist for exactly these events:
    - request submitted or re-submitted → each Supervisor of the
      employee's **division**;
    - approved, rejected or sent back → the **employee**.
    The bell shows that user's unread count; opening a notification marks
    it read. No email, no push.

## 12. Who sees what

| Who | May open |
|-----|----------|
| **Employee** | Their own requests, their comments, their remaining balances. Never another employee's. |
| **Supervisor** | Requests of employees in **their own division** (in any status), and the comments on them. |
| **HR** | Requests in `PENDING_HR_REVIEW`, whatever the division, and their comments. History lives in the Admin view. |
| **Admin** | Every request, comment and balance in the system. |

Everyone sees **only their own** notifications. Opening a request outside
your row shows **Not found** — the same treatment the login gives an
unknown URL (requirements AC-22).

---

# Part B – App design (AI drafts, you check)

## 3. Technology

Chosen so everyone can run the app on their own laptop with no extra accounts.

| Part | Choice | In plain words |
|------|--------|----------------|
| Web framework | **Next.js** (App Router) + **TypeScript** | Builds both the screens and the server logic in one project. |
| Database | **SQLite** via **Prisma 6** | The database is a single file; Prisma lets the code read and write it. |
| Login | Signed **session cookie** | After login the browser keeps a signed note saying who you are (7 days). JavaScript on the page can't read it (`httpOnly`). |
| Passwords | **bcryptjs** | Stores a scrambled version of each password. |
| Styling | **Tailwind CSS v4** | Styles are written as class names, e.g. `text-sm`. No config file needed. |
| Buttons and forms | **Server actions** | Pressing a button calls a function on the server, which checks the user before doing anything. There are no separate `/api` routes. |

## 4. Screens (routes)

After login, each user is sent to their role's home page. Opening a page for
another role sends you back to your own home page.

| Route | Who | What it shows |
|-------|-----|---------------|
| `/` | anyone | Sends you to your home page, or to `/login`. |
| `/login` | anyone | Email and password form. A logged-in user is sent to their home page. |
| `/employee` | Employee | A page with only a short hint ("This page is empty. Continue here with your own project…") until Session 2. |
| `/supervisor` | Supervisor | A page with only a short hint ("This page is empty. Continue here with your own project…") until Session 2. |
| `/hr` | HR | A page with only a short hint ("This page is empty. Continue here with your own project…") until Session 2. |
| `/admin` | Admin | A page with only a short hint ("This page is empty. Continue here with your own project…") until Session 2. |

A page that doesn't exist shows **Not found**, with a button back to your
home page.

**Layout:** no sidebar. A top bar across every page shows the app name
(Budiman HRMS) on the left. On the right it shows who is logged in (name and
role) and a **Log out** button. On a phone it shows the user's initials
instead of the name and role. The page below the top bar is empty apart from a short hint line.

**Feedback:** **Log out** opens a confirmation box first. Errors are shown in
red above the form.

## 5. Where the code lives

| Folder / file | What's in it |
|---------------|--------------|
| `prisma/schema.prisma` | The tables from Part A. |
| `prisma/migrations/` | Steps that create the tables. |
| `prisma/seed.ts` | The demo users (§6). |
| `src/lib/constants.ts` | Roles, divisions, designations, time zone, date helpers. |
| `src/lib/auth.ts` | Login cookie, `getCurrentUser()`, `requireRole()`, `roleHome()`. |
| `src/lib/db.ts` | The single database connection. |
| `src/app/actions.ts` | Server actions: `loginAction`, `logoutAction`. |
| `src/app/login/` | The login page. |
| `src/app/<role>/` | One folder per role's screens (pages with only a hint for now). |
| `src/components/` | Screen pieces: app frame (top bar), login form and log out button. |
| `src/components/ui/` | Small building blocks used everywhere: Button, Card, PageHeader, EmptyState, Avatar, Icons, form field styles, dialogs, and the overlay page scrollbar. Use these when you build the module. |
| `src/app/globals.css` | Brand colours (the `brand-…` and `navy` colours). Change them here. |

## 6. Demo data

`npm run db:seed` deletes all users and creates:

| Email (`@budiman.com`) | Name | Role | ID no. | Designation | Division |
|----------|------|------|--------|-------------|----------|
| `employee-1@` | Employee 1 (Finance & Administration) | Employee | 00-148291 | Administrative Officer | Finance & Administration |
| `employee-2@` | Employee 2 (Software Development) | Employee | 00-173604 | Software Engineer | Software Development |
| `supervisor-1@` | Supervisor 1 (Finance & Administration) | Supervisor | 00-159827 | Team Lead | Finance & Administration |
| `supervisor-2@` | Supervisor 2 (Software Development) | Supervisor | 00-126418 | Team Lead | Software Development |
| `hr-1@` | HR 1 (Human Resources) | HR | 00-191356 | HR Officer | Human Resources |
| `hr-2@` | HR 2 (Human Resources) | HR | 00-184072 | HR Officer | Human Resources |
| `admin@` | Admin (Management) | Admin | 00-105739 | Director | Management |

All use the password `password123` (workshop only). There are two users for
each of Employee, Supervisor and HR, in different divisions, so the module you
build can be tested with more than one person per role.

## 7. Security (in plain words)

- Every page checks who is logged in and their role (`requireRole`).
- Every server action checks again on the server – hiding a button is not enough.
- The login cookie is signed with `AUTH_SECRET` from `.env`, so it can't be faked.
- Passwords are stored only as a hash.

## 8. Commands

| Command | What it does |
|---------|--------------|
| `npm run dev` | Start the app at http://localhost:3000 |
| `npm run db:migrate` | Create or update the database tables |
| `npm run db:seed` | Reset the demo users |
| `npm run db:studio` | Open a browser view of the database |
| `npm run lint` | Check the code for common mistakes |
| `npm run build` | Check the whole app compiles |

---

# Part B2 – Leave Request – App design (AI drafts, you check)

> Screens, code layout and demo data for the Leave Request module. The
> behaviour is decided in Part A2 and in
> [01-requirements.md](01-requirements.md) §6–§11 — this section only says
> **where** it appears. Everything reuses the login's look: the same top
> bar, the same building blocks in `src/components/ui/`.

## 13. Screens (routes)

One screen per action. The top bar (design §4) stays on every page; only
the bell is added to it. Wrong role opening a page → sent back to their
home page (same rule as login AC-07). Opening a request outside what you
may see → **Not found** (AC-22).

| Route | Who | What it shows | Story |
|-------|-----|---------------|-------|
| `/employee` | Employee | **Home / my requests** (replaces the hint page): a card per leave type with *allowed, used, remaining* working days, then **my list of all my requests** with status badges (cancelled included), and a **New request** button. Empty state: "No requests yet". | U8, U15 (view) |
| `/employee/leave/new` | Employee | **New request form**: leave type dropdown, start/end date pickers, live line "Days: X (calendar) / Y (working)", and the certificate tick + note box that appear only for Sick. Buttons: **Save as draft**. | U6 |
| `/employee/leave/[id]` | The owner only | **My request detail**: type, dates, day counts, status badge, comment timeline (approver notes with author and date). Buttons that fit the status: **Edit** and **Submit** (Draft / Sent back), **Cancel** (Draft / Submitted, asks first). Errors in red above. | U7, U9 |
| `/employee/leave/[id]/edit` | The owner only | The same form as *new*, prefilled. Reachable only while Draft / Sent back. | U9 |
| `/supervisor` | Supervisor | **My queue**: my division's requests waiting on a supervisor (Submitted, newest first), each row showing employee, type, dates, calendar/working days and "due by" date. Overdue rows get a red flag *(U17, Stretch)*. Empty state: "Nothing to decide". | U10, U17 |
| `/supervisor/leave/[id]` | Supervisor, same division | **Decide screen**: the request read-only + comments, then **Approve**, **Reject** and **Send back**. Reject and Send back open a dialog whose comment box must be filled (red error if empty). | U10 |
| `/hr` | HR | **HR queue**: every Pending HR Review request, any division, same row shape and due/overdue display. | U11, U17 |
| `/hr/leave/[id]` | HR | **Final decide**: read-only request + comments, **Approve** and **Reject** (dialog with required comment). **No send-back button** — per Part A2 rule 7. | U11 |
| `/admin` | Admin | **All requests**: a table of every request from all 7 users with filters (employee, leave type, status, date range), row click → read-only detail, and **Export CSV** that downloads exactly the filtered rows. | U13, U14 |
| `/admin/leave/[id]` | Admin | **Record view**: the full request read-only with all its comments. | U13 |
| `/admin/balances` | Admin | **Balances**: one row per user, editable *allowed* days for Annual, Sick and Compassionate (Unpaid shown as "Unlimited"), **Save** per row. | U15 |
| `/admin/users` | Admin | **Accounts**: each user's name, role, division and whether they are active or suspended, with **Suspend** / **Reactivate** (both ask first). | U16 |
| Top bar bell | any logged-in user | A bell with the unread count; the dropdown lists notifications (newest first, unread marked); clicking one marks it read and opens the request it is about. | U12 |

## 14. Where the code lives (additions)

Nothing from the login is replaced; the module adds to it and reuses the
existing pieces.

| Folder / file | What's added |
|---------------|--------------|
| `prisma/schema.prisma` | The four models from Part A2 §9. |
| `src/lib/constants.ts` | `LEAVE_TYPES`, `LEAVE_STATUSES` (with display labels), `HOLIDAYS_2026`. |
| `src/lib/leave.ts` | New: `calendarDays()`, `workingDays()`, `remainingBalance()`, `dueDate()` and `allowedAction()` — the action table from Part A2 §11.7 in **one place**, used by both the buttons (what to show) and the server actions (what to allow). |
| `src/lib/notifications.ts` | New: `notifySupervisors(request)`, `notifyEmployee(request, event)` — the only code that creates notifications. |
| `src/app/actions.ts` | New server actions: `createLeaveDraft`, `updateLeaveDraft`, `submitLeave`, `cancelLeave`, `approveAsSupervisor`, `rejectAsSupervisor`, `sendBackAsSupervisor`, `approveAsHr`, `rejectAsHr`, `setBalance`, `setSuspended`; `loginAction` also refuses suspended accounts. Every action re-runs `allowedAction()` — hiding a button is not enough. |
| `src/app/employee/` | Home page + `leave/new`, `leave/[id]`, `leave/[id]/edit`. |
| `src/app/supervisor/` | Queue page + `leave/[id]`. |
| `src/app/hr/` | Queue page + `leave/[id]`. |
| `src/app/admin/` | Overview + `leave/[id]`, `balances`, `users`. |
| `src/app/admin/leaves/export/route.ts` | The **one** route handler in the app (a browser download needs a GET): filters on the server and returns a CSV. Admin only. |
| `src/components/` | New pieces: `LeaveForm`, `LeaveTable` (with filter bar), `LeaveDetail`, `StatusBadge`, `CommentTimeline`, `DecideDialog` (comment + reason), `NotificationBell`. Built from the existing `src/components/ui/` blocks — Button, Card, PageHeader, EmptyState, Field styles, dialogs — no new primitives. |
| `src/components/AppShell.tsx` | Gains the bell on the right of the top bar. |

## 15. Feedback, empty and error states

- **Errors** sit in red above the form or dialog, same as the login.
  Every check from Part A2 §11 has its own sentence, e.g. "Maximum 30
  consecutive days", "You already have a request in that period",
  "Insufficient balance", "A certificate is required for sick leave over
  2 days", "A comment is required".
- **Success**: after saving, submitting or deciding, you land back on the
  sensible list (employee list, supervisor/HR queue, admin table) with the
  new status visible — plus a notification where Part A2 says so.
- **Empty** states use `EmptyState`: "No requests yet – ask for your first
  leave" (employee), "Nothing to decide" (queues), "No requests match the
  filters" (admin).
- **Asking first**: Cancel, Suspend and Reactivate open a confirmation
  dialog, like Log out does.
- Filters keep their values when the page reloads (query parameters), so
  Export CSV always matches what is on screen.

## 16. Demo data (`npm run db:seed`)

`db:seed` deletes users, requests, comments, balances and notifications,
then recreates the 7 users (login §6, all `password123`), the three
balances for every non-Admin user (Annual 12, Sick 12, Compassionate 3 —
Unpaid needs none), and these sample requests:

| Owner | Type | Dates | Status | Extras |
|-------|------|-------|--------|--------|
| `employee-1` | Annual | 2026-12-07 → 2026-12-11 | Pending HR Review | supervisor-1 approved + comment |
| `employee-1` | Annual | 2027-01-11 → 2027-01-13 | Draft | |
| `employee-1` | Sick | 2026-10-05 → 2026-10-07 (3 days) | Approved | certificate ticked + note; costs 3 working days |
| `employee-1` | Compassionate | 2026-09-14 | Rejected | supervisor comment "Business is busy that week" |
| `employee-1` | Unpaid | 2026-11-30 | Cancelled | |
| `employee-1` | Annual | 2026-11-16 → 2026-11-18 | Sent back for revision | supervisor comment "Please swap the dates" |
| `employee-1` | Annual | 2027-03-01 → 2027-03-03 | Submitted | for AC-17 (reject) |
| `employee-1` | Annual | 2027-03-08 → 2027-03-10 | Submitted | for AC-18 (send back) |
| `employee-1` | Sick | 2026-12-21 → 2026-12-23 (3 days) | Pending HR Review | certificate ticked; for AC-20 (HR reject) |
| `employee-2` | Annual | 2026-12-14 → 2026-12-18 | Submitted | sits in supervisor-2's queue for AC-15 |
| `employee-2` | Sick | 2026-11-02 → 2026-11-04 | Submitted | submitted long ago → overdue flag for AC-27 |
| `employee-2` | Annual | 2026-08-10 → 2026-08-14 | Approved | costs 5 working days |

Matching notifications exist for the decisions above, some unread (so the
bell shows a number straight away) and some read. This covers **every
status, every role and every screen**, and gives AC-10 … AC-26 their raw
material without the participant having to click anything first.

## 17. Security (additions, in plain words)

- Every new page starts with `requireRole` — the same helper as login.
- Queue and list pages **filter in the query** (own requests / own
  division / everything), so wrong data can't leak even by accident.
- Every server action re-checks the Part A2 §11.7 action table: right
  role, right person or division, right status — before touching anything.
- Required comments (reject, send back) are checked on the server too.
- The CSV route checks Admin first, then filters on the server.
- `loginAction` checks the suspended flag **before** starting a session.
- Only the recipient can mark a notification read.

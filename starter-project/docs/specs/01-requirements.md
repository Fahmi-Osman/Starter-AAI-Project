# Login – Requirements

> **What and why.** This document says what the login must do and why. It is
> the source of truth for behaviour: when something needs to change, update this
> document **first**. New to specs? Read [README.md](README.md) first.

## 1. The problem

Budiman Company is building an HR Management System. Before anyone can use
it, the system has to know **who is using it** and **what they are allowed to
do**.

This first part of the system provides:

1. A **login** with each person's company email and password.
2. A **home page for each role**, so everyone lands in the right place.
3. **Protection**, so nobody can open another role's pages.

## 2. Who uses it (roles)

| Role | Home page | What they will do (built in Session 2) |
|------|-----------|-----------------------------------------|
| **Employee** | `/employee` | Apply for leave and track their requests. |
| **Supervisor** | `/supervisor` | Decide on requests sent to them. |
| **HR** | `/hr` | Decide on requests sent to HR. |
| **Admin** | `/admin` | See every leave record. |

Each user has exactly one role.

## 3. User stories

Format: *As a [role], I can [do something] so that [benefit].*

- **U1. Log in** *(Core)*. As any user, I can log in with my company email and
  password so that I see the screens for my role.
- **U2. Land on my home page** *(Core)*. As any user, after logging in I go
  straight to my role's home page, so I don't have to look for it.
- **U3. Stay logged in** *(Core)*. As any user, I stay logged in for up to 7
  days on the same browser, so I don't have to log in every time.
- **U4. Log out** *(Core)*. As any user, I can log out when I'm done, so the
  next person on this computer can't use my account.
- **U5. Only my own screens** *(Core)*. As any user, I can only open the pages
  for my own role, so nobody can act as someone else.

## 4. Acceptance checklist

The login is done when every box is ticked. Use the demo accounts (password
`password123`): `employee-1` and `employee-2` (Employees), `supervisor-1` and
`supervisor-2` (Supervisors), `hr-1` and `hr-2` (HR), `admin` (Admin). Each
logs in with that name followed by `@budiman.com`, e.g.
`employee-1@budiman.com`; the checks below use the short name.
Run `npm run db:seed` first to start from clean data.

| ✓ | ID | Check | How to test |
|---|----|-------|-------------|
| [ ] | AC-01 | A user can log in and lands on their role's home page. | Log in as `employee-1` → you are on `/employee`, a page with only a short hint line. Repeat for `supervisor-1` (`/supervisor`), `hr-1` (`/hr`), `admin` (`/admin`). |
| [ ] | AC-02 | A wrong password or an unknown email shows an error. | Log in as `employee-1` with password `wrong` → "Invalid email or password." Try `nobody@budiman.com` → the same message. |
| [ ] | AC-03 | Empty fields are not sent. | Click **Log in** with the boxes empty → the browser asks you to fill them in. |
| [ ] | AC-04 | A logged-out user is sent to the login page. | Log out, then type `/employee` in the address bar → you are on `/login`. |
| [ ] | AC-05 | A logged-in user who opens the login page goes to their home page. | Logged in as `hr-1`, type `/login` → you are on `/hr`. |
| [ ] | AC-06 | Logging out asks first, then returns to the login page. | Click **Log out** in the top bar → a confirmation box → confirm → you are on `/login`. |
| [ ] | AC-07 | A user cannot open another role's pages. | As `employee-1`, type `/hr` or `/admin` → you are sent back to `/employee`. As `admin`, type `/employee` → you are sent back to `/admin`. |
| [ ] | AC-08 | Every page shows who is logged in. | The top bar shows the user's name and role. On a phone, it shows the user's initials instead. |
| [ ] | AC-09 | An unknown page shows "Not found". | Type `/something-else` → "Not found", with a button back to your home page. |
## 5. Not included (for now)

These are **out of scope** for the login:

- Signing up, or resetting a forgotten password.
- Adding, editing or deleting user accounts (only the demo data creates users).
- The Leave Request module itself – that is what you build in Session 2.

---

# Leave Request – Requirements

> **What and why.** This part says what the Leave Request module must do and
> why. It is the source of truth for behaviour: when something needs to
> change, update this document **first**.

## 6. The problem

Employees at Budiman Company ask for leave the slow way: messages and paper
forms that float around the office. Nothing is tracked, so employees don't
know where their request stands or how much leave they have left, approvers
lose requests, and HR keeps no record.

This module provides:

1. A simple way to **ask for leave** (create, edit, cancel a request).
2. An **approval chain** – Supervisor decides first, then HR gives the final
   decision – with clear statuses and reasons.
3. **In-app notifications** so nobody has to keep checking.
4. **Oversight for Admin**: see every request, keep balances right, and stop
   suspended accounts from being used.

## 7. Who uses it (roles)

| Role | What they do in this module |
|------|-----------------------------|
| **Employee** | Create, edit, cancel and track their own requests; see their remaining balance per leave type. |
| **Supervisor** | Decide (approve / reject / send back) requests from employees **in their own division**. Any supervisor of the division may act. |
| **HR** | Final decision (approve / reject) on requests the supervisor approved. Sees everything pending HR review, in any division. |
| **Admin** | See every leave record with filters, export CSV, set annual balance per employee per leave type, suspend and reactivate accounts. |

## 8. User stories

Format: *As a [role], I can [do something] so that [benefit].*

- **U6. Create a leave request** *(Core)*. As an Employee, I can save a draft
  (leave type + start/end date) and see how long it is in calendar days and
  working days, so I can check my plan before anyone is involved.
- **U7. Submit for approval** *(Core)*. As an Employee, I can submit a draft
  so that the app checks the length, overlaps and my balance, and tells my
  supervisor.
- **U8. Track my requests** *(Core)*. As an Employee, I can see all my
  requests with their status – including cancelled ones – so I always know
  where things stand.
- **U9. Fix or cancel a request** *(Core)*. As an Employee, I can edit a
  request while it is Draft or Sent back for revision, and cancel it while it
  is Draft or Submitted, so mistakes don't need an office visit.
- **U10. Decide as Supervisor** *(Core)*. As a Supervisor, I can approve,
  reject or send back a request from my division (with a comment when
  required), so good requests move on and bad ones come back with a reason.
- **U11. Decide as HR** *(Core)*. As HR, I can approve or reject what a
  supervisor approved (rejecting needs a reason), so the final decision is
  recorded.
- **U12. Get notified** *(Core)*. As a user involved in a request, I get an
  in-app bell notification when something needs my action or a decision was
  made about my request, and I can mark notifications as read, so I don't
  have to keep checking.
- **U13. See every request** *(Core)*. As an Admin, I can see all requests
  from all users with filters (employee, type, status, date range), so HR has
  one record of everything.
- **U14. Export the record** *(Core)*. As an Admin, I can download the
  filtered list as CSV, so it can be used in a spreadsheet.
- **U15. Keep balances right** *(Core)*. As an Admin, I can set the annual
  balance per employee per leave type, so yearly allocations are correct.
- **U16. Suspend an account** *(Core)*. As an Admin, I can suspend and
  reactivate accounts, so a suspended person cannot log in and apply.
- **U17. See what is overdue** *(Stretch)*. As an approver, I see requests
  past their approval due date (3 working days) flagged, so I know what has
  been waiting too long. Nothing happens automatically when a due date passes.

## 9. Acceptance checklist

The module is done when every box is ticked. Use the demo accounts from §4
(password `password123`). Run `npm run db:seed` first: besides the 7 users it
also creates leave balances (Annual 12, Sick 12, Compassionate 3, Unpaid
unlimited) and a few sample requests in different states (see design §6).

| ✓ | ID | Check | How to test |
|---|----|-------|-------------|
| [ ] | AC-10 | A draft shows calendar and working days and saves as Draft. | As `employee-1`, open **New leave request**, pick Annual, dates next Monday–Tuesday → the form shows days in **calendar** and **working** days. Save as draft → it appears in your list with status **Draft**. |
| [ ] | AC-11 | A range longer than 30 consecutive days is blocked. | As `employee-1`, try Annual `2026-07-01` → `2026-08-01` → an error says the maximum is 30 consecutive days. |
| [ ] | AC-12 | An overlapping request is blocked. | From the seed, `employee-1` has a pending request `2026-12-07` → `2026-12-11`. Create another for `2026-12-09` → `2026-12-15` and submit → an error says you already have a request in that period. |
| [ ] | AC-13 | Not enough balance blocks submission. | As `employee-1` (Annual balance 12), request Annual for 15 working days → submit → an error says insufficient balance. |
| [ ] | AC-14 | Sick leave over 2 consecutive days needs the certificate tick. | As `employee-1`, Sick `3` consecutive days without ticking "I have a doctor's certificate" → blocked with a message. Tick it (with a short note) → it saves. Sick `2` days without the tick → it saves. |
| [ ] | AC-15 | A submission notifies the supervisor of that division – and only them. | As `employee-1` (Finance), submit the draft from AC-10 → the bell in `supervisor-1`'s top bar gains an unread item; `supervisor-2` (Software Dev) sees nothing new. |
| [ ] | AC-16 | Supervisor approval moves the request to HR and notifies the employee. | As `supervisor-1`, open `employee-1`'s request → **Approve** → status becomes **Pending HR Review**. As `employee-1`, the bell shows a notification about the decision. |
| [ ] | AC-17 | Rejecting needs a comment; the employee sees the reason. | As `supervisor-1`, open another request from `employee-1` → **Reject** with an empty comment → blocked. Type a reason → status **Rejected**. As `employee-1`, the request shows **Rejected** with your comment. |
| [ ] | AC-18 | Sending back needs a comment; the employee can fix and resubmit. | As `supervisor-1`, **Send back** a request without a comment → blocked; with a comment → status **Sent back for revision**. As `employee-1`, edit the dates and **Resubmit** → status **Submitted** again and `supervisor-1` gets a new notification. |
| [ ] | AC-19 | HR approval completes the request and deducts the balance. | As `hr-1`, open the request from AC-16 → **Approve** → status **Approved**. `employee-1`'s Annual balance drops by the number of **working** days. There is **no** send-back option for HR. |
| [ ] | AC-20 | HR rejection needs a comment. | As `hr-1`, open another **Pending HR Review** request → **Reject** with an empty comment → blocked; with a comment → status **Rejected**, reason visible to `employee-1`. |
| [ ] | AC-21 | Cancellation works only while Draft or Submitted. | As `employee-1`, cancel a Draft and a Submitted request → both become **Cancelled** and stay in your list. Open a **Pending HR Review** request → no Cancel button, and posting the action directly is refused. |
| [ ] | AC-22 | An employee sees only their own requests. | As `employee-2`, your list shows only your requests. Type `employee-1`'s request URL with its id → "Not found". |
| [ ] | AC-23 | The bell shows unread count, opens the request, and read is remembered. | As `employee-1`, the bell shows the unread count; the dropdown lists your notifications; clicking one opens the request and marks it read; the count drops and survives a page reload. |
| [ ] | AC-24 | Admin sees everything, can filter, and export CSV. | As `admin`, the leave list shows requests from all 7 users. Filter by status **Approved** → only approved rows remain; filter by type **Sick** and a date range → only matching rows. **Export CSV** downloads a file whose rows match the filter. |
| [ ] | AC-25 | Admin can change a balance. | As `admin`, set `employee-1`'s Annual balance to **15** → as `employee-1`, the new balance shows and a 13-working-day Annual request now passes AC-13's check. |
| [ ] | AC-26 | Suspension blocks login but keeps the data. | As `admin`, suspend `employee-2` → `employee-2` cannot log in ("Account is suspended"). `supervisor-2` still sees `employee-2`'s requests. **Reactivate** → `employee-2` can log in again. |
| [ ] | AC-27 | *(Stretch)* Overdue requests are flagged. | A request sitting in **Submitted** for more than 3 working days shows an **Overdue** flag in `supervisor-1`'s queue. Nothing else happens automatically. |

## 10. Not included (for now)

These are **out of scope** for the Leave Request module:

- Payrolls, file uploads, or delegating approvals to another approver.
- Email or push notifications (in-app only).
- More approval levels than Supervisor → HR.
- Signing up or managing user accounts (stays with the login spec: only demo
  data creates users; Admin suspends/reactivates, nothing else).
- Editing the public-holiday list (it is fixed in code, see §11).
- Anything that happens automatically when an approval due date passes
  (flagging is the Stretch story U17; nothing else).

## 11. Assumptions

Decisions taken during the interview or needed where the brief was silent –
correct any that are wrong:

1. **Calendar vs working days.** Duration shows **calendar** days (weekends
   and holidays count); the balance is deducted in **working** days only
   (Mon–Fri, minus the fixed 2026 Indonesian holiday list). A Fri→Mon request
   is 4 days long but costs 2.
2. **Balance timing.** Balance is **checked at submission** and **deducted at
   final HR approval**. Rejected and cancelled requests never consume balance.
3. **Statuses.** Full status list: `draft`, `submitted`, `sent back for
   revision`, `pending hr review`, `approved`, `rejected`, `cancelled`
   (the brief's data table left out the last two states its own workflow uses).
4. **Who sees what.** A Supervisor sees only requests from employees of their
   own division (and can act on any of them); HR sees all requests pending HR
   review, whatever the division.
5. **Certificate rule** counts the range in **calendar days**: more than 2
   consecutive calendar days of Sick leave needs the tick + a short note
   (no file upload, per the brief).
6. **The 30-day limit** is also measured in calendar days.
7. **Overlap** is checked against the same employee's own active requests
   (Draft, Submitted, Sent back, Pending HR Review, Approved) – not against
   Cancelled or Rejected ones.
8. **Unpaid leave** is unlimited: no balance check, and no balance row is
   needed for it.
9. **Suspension** blocks login with a clear message; the person's in-flight
   requests stay as they are and approvers can still decide them.
10. **Notifications** exist only for: new/re-submitted request → the
    responsible supervisor; approval, rejection, or send-back → the employee.
    The bell count is that user's unread items.
11. **Demo data** adds to the existing 7 users: the four balances per type
    above, plus sample requests that cover every status so all screens can be
    tried at once (exact rows in design §6).

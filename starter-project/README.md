# HRMS · Starter App (Login)

The starter app for the **Vibe Coding 101 with Agentic AI** workshop. It is
the beginning of Budiman Company's HR Management System: **login works for all
four roles**, and each role lands on its own (empty) home page.

In **Session 2** you build the **Leave Request module** on top of it, the
Spec-Driven Development way: write and review the specifications first, then
let the AI agent build from them.

## What's already here

- **Login and logout** with a company email and password, and a signed
  session cookie.
- **Four roles** – Employee, Supervisor, HR and Admin – each with its own home
  page. Nobody can open another role's pages.
- **The app frame**: a top bar with the app name, who is logged in, the
  notification bell and **Log out**, in the Budiman HRMS style.
- **The Leave Request module** (Session 2): drafts → submit → supervisor →
  HR → approve, with comments, notifications, balances and admin tools. See
  the table below.
- **Building blocks** in `src/components/ui/` (Button, Card, PageHeader,
  dialogs, form fields…) to reuse when you build the module.
- **The login spec** in `docs/specs/` – a worked example of the three spec
  files you will write for the Leave Request module.

## The project

The scenario, workflow and scope are in the **Workshop Project Brief**, which
you get from the facilitator. In Session 2 the AI agent interviews you about
it before writing anything.

## Tech stack

- **Next.js** (App Router) + TypeScript
- **Prisma 6** + **SQLite** (a local file database, no server needed)
- **Tailwind CSS**
- **bcryptjs** for password hashing
- Signed, `httpOnly` session cookie for login

## Getting started

You need **Node.js 20.9 or newer** (check with `node --version`) and Git.

```bash
npm install            # 1. install dependencies (needs internet)
cp .env.example .env   # 2. create your settings file (Windows: copy .env.example .env)
npm run db:migrate     # 3. create the SQLite database from prisma/migrations
npm run db:seed        # 4. add the demo users
npm run dev            # 5. start the app at http://localhost:3000
```

To reset the demo data at any time, run `npm run db:seed` again. It recreates
the demo users **and** the leave demo data: 18 balances (Annual 12, Sick 12,
Compassionate 3 — Unpaid is unlimited), 12 requests in every status, 6
comments and 10 notifications (some unread, so the bell shows a number).

**If something goes wrong**

| Problem | Fix |
|---------|-----|
| `Environment variable not found: DATABASE_URL` | You skipped step 2. Create the `.env` file. |
| `npm install` fails while downloading Prisma engines | Your network blocks `binaries.prisma.sh`. Try another network, or ask the facilitator. |
| `Port 3000 is in use` | Another app is running. Stop it, or run `npm run dev -- -p 3001`. |
| Login says "Invalid email or password" | Run `npm run db:seed` to recreate the demo users. |

## Demo accounts

All demo users share the password `password123`.

| Email                      | Role | Home page |
| -------------------------- | ---- | --------- |
| `employee-1@budiman.com`   | Employee | `/employee` |
| `employee-2@budiman.com`   | Employee | `/employee` |
| `supervisor-1@budiman.com` | Supervisor | `/supervisor` |
| `supervisor-2@budiman.com` | Supervisor | `/supervisor` |
| `hr-1@budiman.com`         | HR | `/hr` |
| `hr-2@budiman.com`         | HR | `/hr` |
| `admin@budiman.com`        | Admin | `/admin` |

## Leave Request module (Session 2)

Built from `docs/specs/` (Leave Request sections). What to try, per role:

| Who | Where | Try |
|-----|-------|-----|
| Employee | `/employee` | Balance cards, your request list, **New request** → save as draft, edit, submit. Cancel a Submitted request (asks first). Sick over 2 days needs the certificate tick + note. |
| Supervisor | `/supervisor` | Your division's Submitted requests, newest first, with the due-by date. Approve (→ HR), Reject or Send back — both need a comment. |
| HR | `/hr` | Everything a supervisor approved. Approve (balance is consumed) or Reject with a comment. No send-back — that is a supervisor's job. |
| Admin | `/admin` | Filter every request by person, type, status or date range, open a read-only record, and **Export CSV** (downloads exactly the filtered rows). |
| Admin | `/admin/balances` | Set allowed days per person (Annual, Sick, Compassionate). |
| Admin | `/admin/users` | Suspend / Reactivate accounts. A suspended person cannot log in; their data stays. |
| Everyone | Top bar | The bell shows new notifications; clicking one marks it read and opens the request. |

All requests, comments and notifications hold **made-up data only**.

## Scripts

| Command            | What it does |
|--------------------|--------------|
| `npm run dev`      | Start the dev server. |
| `npm run build`    | Production build. |
| `npm run start`    | Serve the production build. |
| `npm run lint`     | Run ESLint. |
| `npm run db:migrate` | Apply Prisma migrations. |
| `npm run db:seed`  | Reseed the demo users and leave data. |
| `npx tsx scripts/check-leave.ts` | Run the leave maths, action-table and seed sanity checks. |
| `npm run db:studio` | Open Prisma Studio to inspect the data. |

## Specifications

The specs live in `docs/specs/`. Start with `docs/specs/README.md` – it
explains how to read them and has a glossary of terms.

- `01-requirements.md` — user stories and the acceptance checklist (the *what* and *why*).
- `02-design.md` — Part A: data design (the `User` table, rules). Part B: app design (screens, code layout).
- `03-tasks.md` — the ordered build tasks and which checks prove each one is done.

`docs/specs/checklists.md` has a checklist to run before each approval and
build step.

In Session 2 you add the Leave Request module to these same three files. The
rule of the workshop: when something changes, **fix the spec first**, then
build it.

## Working with the AI agent

`AGENTS.md` tells the AI agent how to work with you in Session 2: it
**interviews you first**, writes the specs with you one at a time (waiting for
your approval after each), then builds task by task and asks you to check
each one in the browser.

To begin, start a new chat in the Illham Harness and type the line below. You
can also attach the Workshop Project Brief to give the agent the details.

> Read AGENTS.md, then start the interview.

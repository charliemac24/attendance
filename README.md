# MYO School Attendance Alerts

Production-ready, multi-tenant school attendance platform with QR kiosk scanning, role-based operations, and SMS notifications.

## What This App Is
MYO School Attendance Alerts is a Node.js + React web app for schools to track check-in/check-out attendance in real time, manage students and users, and send SMS notifications to guardians.

This repository currently uses **MySQL + Drizzle ORM** (not PostgreSQL).

## Core Capabilities
- Multi-tenant school data isolation
- Role-based access: `super_admin`, `school_admin`, `gate_staff`, `teacher`
- QR scan kiosk flow for check-in/check-out
- Manual attendance actions from status pages
- Dashboard KPIs and section breakdown
- Daily status pages: Present, Late, Pending Checkout, Absent, Not Checked In
- Student CRUD + CSV import
- Student QR print (single and batch)
- Student photo upload and display (students list + kiosk scan result)
- SMS templates + SMS logs + Semaphore integration
- Attendance Intelligence MVP (risk scoring/trends)

## Tech Stack
- Frontend: React, TypeScript, Vite, Tailwind CSS, shadcn/ui, wouter
- Backend: Express, TypeScript, express-session
- DB: MySQL (mysql2) + Drizzle ORM
- Build: `tsx script/build.ts`

## Project Structure
- `client/` React app
- `server/` Express API
- `shared/schema.ts` Drizzle schema and shared types
- `migrations/` SQL migrations
- `uploads/` runtime uploaded student images
- `dist/` production output
- `release/` deployment zips

## Authentication & Roles
Session-based authentication (`express-session`) with school-scoped authorization.

Roles:
- `super_admin`: platform-wide management, can switch school context
- `school_admin`: manages only own school
- `gate_staff`: kiosk scanning and operational views
- `teacher`: limited operational/report visibility

Default seeded accounts (if seed runs on empty DB):
- `super / password`
- `admin / password`
- `gate / password`
- `teacher / password`

## Data Model (High-Level)
Main tables:
- `schools`
- `users`
- `students` (includes `qr_token`, `photo_url`)
- `grade_levels`
- `sections`
- `kiosk_locations`
- `daily_attendances`
- `attendance_events`
- `sms_templates`
- `sms_logs`
- `teacher_sections`
- `__drizzle_migrations`

## Important Implemented Features

### 1) QR Kiosk Flow
- Endpoint: `POST /api/kiosk/scan`
- First scan: creates daily attendance (`pending_checkout` or `late`)
- Second scan: marks `present` with checkout time
- Optional extra-scan behavior per school (`allow_multiple_scans`)
- Kiosk page auto-refocuses cursor into QR input after each event
- Kiosk result card shows scanned student photo (large avatar)

### 2) Student QR Printing
On Students page:
- Per-student `Print QR`
- `Print Filtered QR` batch printing
- A4 layout tuned for 4 students per page (2x2)

### 3) Student Photo Upload
- Upload endpoint: `POST /api/students/photo` (multipart field: `photo`)
- Supported image validation + size limit
- Files saved under `uploads/students`
- Served via static route `/uploads/*`
- Create/Edit student dialog supports photo upload and preview

### 4) SMS (Semaphore)
- Attendance events trigger `maybeSendAttendanceSms(...)`
- Uses school settings + templates + guardian phone
- Logs all outcomes in `sms_logs`:
  - `sent`
  - `failed`
  - `skipped` (with reason)
- Test route for verification: `POST /api/sms/test`

### 5) Attendance Intelligence MVP
- Endpoint: `GET /api/attendance-intelligence?date=YYYY-MM-DD`
- Computes per-student:
  - attendance health score (0–100)
  - trend (`improving`, `stable`, `declining`)
  - risk flags (`chronic_absent`, `frequent_late`, `missing_checkout_pattern`, `low_attendance_score`)
- Dashboard shows At-Risk Students panel

## Local Development

### Prerequisites
- Node.js 20+
- MySQL 8+

### Install
```bash
npm install
```

### Environment
Create `.env` (or set env vars in shell):

```env
DATABASE_URL=mysql://USER:PASSWORD@HOST:3306/DB_NAME
SESSION_SECRET=change-this-to-a-long-random-string
NODE_ENV=development
PORT=5000
```

Optional school-level SMS values are stored in `schools` table (not global env):
- `sms_enabled`
- `sms_provider` (`semaphore`)
- `semaphore_api_key`
- `semaphore_sender_name`

### Database
Apply schema to DB:
```bash
npm run db:push
```

### Run
```bash
npm run dev
```
App runs at `http://localhost:5000`.

## Build & Production

### Build
```bash
npm run build
```

### Start
```bash
npm run start
```

### Production deploy notes (Node hosting / cPanel style)
- Startup file: `dist/index.cjs`
- Ensure runtime has:
  - `dist/`
  - `package.json`
  - `package-lock.json`
  - `migrations/` (if running migrations on server)
- Install deps in app root (`npm ci --omit=dev` where possible)
- Set environment variables in hosting panel
- Restart app after deploy

## API Summary (Major)
- Auth:
  - `POST /api/auth/login`
  - `POST /api/auth/logout`
  - `GET /api/auth/me`
- Dashboard:
  - `GET /api/dashboard`
  - `GET /api/attendance-intelligence`
- Status pages:
  - `GET /api/today/:status`
- Students:
  - `GET /api/students`
  - `POST /api/students`
  - `PATCH /api/students/:id`
  - `DELETE /api/students/:id`
  - `POST /api/students/photo`
  - `POST /api/students/import/preview`
  - `POST /api/students/import/confirm`
- Kiosk:
  - `POST /api/kiosk/scan`
- Manual attendance:
  - `POST /api/attendance/manual`
- Settings:
  - `GET /api/settings/school`
  - `PATCH /api/settings/school`
- SMS:
  - `GET /api/sms-templates`
  - `PATCH /api/sms-templates/:id`
  - `GET /api/sms-logs`
  - `POST /api/sms/test`

## Known Operational Notes
- If logged out, `/api/auth/me` returns `null` (not treated as hard error state in app).
- For local auth consistency, avoid mixing `localhost` and `127.0.0.1` during one session.
- Session store is memory-based (`memorystore`), suitable for single-instance deployments.
- Uploaded student photos are filesystem-based; keep `uploads/` persistent in production.

## Common Troubleshooting

### 1) Grade/Section filter not working in Today status pages
Fix already applied: backend now filters by `gradeLevelId`/`sectionId` IDs, not names.

### 2) Students not visible after deploy
Likely schema mismatch. Ensure `students.photo_url` exists:
```sql
ALTER TABLE students ADD COLUMN photo_url VARCHAR(255) NULL;
```
(or run `npm run db:push`).

### 3) SMS not being consumed in Semaphore
Check `SMS Logs` page `Details` column and verify:
- school `sms_enabled = 1`
- `sms_provider = semaphore`
- API key and sender name are correct
- guardian phone is present and normalized
Use `POST /api/sms/test` for direct provider test.

### 4) Kiosk scan works but no SMS sent
Review `sms_logs.status` values:
- `skipped`: validation/settings issue
- `failed`: provider/network/content failure
- `sent`: provider accepted message

## Maintenance Notes for Future Sessions
- This is now a **MySQL-first** codebase.
- Attendance Intelligence and student photo upload are already integrated.
- `replit.md` may be outdated; use this README as source of truth.

## License
MIT

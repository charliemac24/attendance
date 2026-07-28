# MYO Attendance

Multi-school attendance platform for QR-based check-in/check-out, roster management, kiosk operations, SMS guardian notifications, and school-level reporting.

## What This App Does

MYO Attendance is designed for schools that need:

- role-based access for admins, gate staff, and teachers
- QR-driven attendance capture at gates or kiosks
- student roster and section management
- holiday-aware attendance logic
- SMS notifications to guardians
- reports, exports, and basic operational maintenance tools

The same backend supports:

- browser-based admin screens
- kiosk scanning with USB/HID scanners
- camera-based scanning in the web UI
- a Capacitor mobile shell that loads the mobile scanner route

## Roles

- `super_admin`
  Manages the full platform, all schools, billing settings, users, and maintenance actions.
- `school_admin`
  Manages one school's students, kiosks, settings, holidays, SMS templates, and reports.
- `gate_staff`
  Uses kiosk scanning and operational attendance actions.
- `teacher`
  Sees only assigned sections and can review attendance plus mark absent/excused where allowed.

## UI and Main Screens

### Login and Branding

- session-based login
- branded login screen per school slug using `/?school=<slug>`
- public school branding for login/mobile scanner pages
- super-admin school switcher in the main header

### Dashboard

- KPI cards for present, late, checked out, on campus, absent, not checked in, and total active students
- recent activity feed with clear action
- grade-level attendance breakdown
- missed check-out yesterday panel
- students-needing-attention / attendance-intelligence panel

### Today Views

Route pattern: `/today/:status`

Operational screens for:

- checked out
- late
- on campus / pending checkout
- absent
- not yet checked in

These support:

- date filtering
- grade and section filters
- student name / ID search
- pagination
- teacher section scoping

### Students

- active student roster
- inactive student roster
- student create/edit/delete
- student photo upload
- QR print and QR regeneration
- bulk delete
- bulk assign section
- import via CSV
- year-end promotion workflow

### Grade Levels and Sections

- grade-level CRUD
- late-time override per grade level
- section CRUD
- section-to-grade mapping

### Kiosk Locations

- kiosk CRUD
- kiosk slug support
- direct scanner page for gate use

### Kiosk Scanner UI

Current kiosk scanner behavior:

- dedicated `Ready to scan` capture area instead of a visible token textbox
- hidden focused input to accept USB/HID scanner data
- auto-submit only when the scanned value matches the expected 32-character hex QR token format
- camera scanner using `jsQR`
- centered success confirmation overlay
- recent scans list directly under the camera section
- success confirmation stays visible for 5 seconds but does not block new scans
- kiosk page keeps the session alive while open

### School Settings

- school name
- login slug
- school logo upload
- attendance timings
- SMS toggles and credits
- monthly overage rate
- dashboard attention-panel toggle
- school-wide QR token generation

### Holidays

- holiday CRUD
- holiday, no-classes, and special-schedule types

### SMS Templates and Logs

- editable per-school SMS templates
- template enable/disable
- test SMS
- SMS log filtering and export
- queue/retry/reconcile flow

### Reports

Supported report pages:

- daily attendance
- absentees
- late history
- SMS usage
- SMS billing

Exports are available through the reports export endpoint.

## Attendance and Scanning Logic

### Student QR Format

Student QR tokens are generated from `studentNo` using the shared QR helper:

- token format: 32-character lowercase MD5 hex string
- QR tokens are stored in `students.qr_token`

Important implication:

- if `studentNo` changes or QR tokens are regenerated, old printed QR codes become outdated

### Kiosk Scan Flow

Kiosk scanning resolves a student using, in order:

1. exact `qr_token`
2. exact `studentNo`
3. exact numeric student `id`
4. URL-style payload parsing when the QR contains query params or path segments

Then the backend:

- validates kiosk existence
- validates school access
- rejects inactive students
- rejects school mismatch
- blocks attendance actions on holidays
- applies duplicate-scan protection using the school's minimum scan interval
- creates check-in / late / check-out attendance events
- sends queued SMS notifications where enabled

### Daily Attendance States

The attendance flow uses states including:

- `pending_checkout`
- `late`
- `present`
- absent/excused flows via manual status actions

### Timing Controls

School-level timing settings include:

- late time
- auto-absent cutoff time
- minimum scan interval
- dismissal time
- early-out window minutes

Grade levels can optionally override late time.

## SMS Behavior

The app integrates with Semaphore for guardian messaging.

Current active template/event types in the main UI flow:

- `check_in`
- `check_out`
- `late`
- `absent`

Supported behavior:

- school-level SMS enable/disable
- absent SMS toggle
- per-school monthly SMS credits
- overage rate tracking
- queued processing
- retry handling
- reconcile flow for submitted provider states

Do not store API keys or provider secrets in this README.

## API Summary

All application endpoints are defined in [server/routes.ts](/C:/Users/Charlie/Desktop/Github/attendance/server/routes.ts:1394).

### Auth

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/public/school-branding`
- `GET /api/auth/me`
- `POST /api/auth/switch-school`

### Users

- `GET /api/users`
- `POST /api/users`
- `PATCH /api/users/:id`
- `DELETE /api/users/:id`

### Dashboard and Operational Views

- `GET /api/dashboard`
- `DELETE /api/dashboard/recent-activity`
- `GET /api/attendance-intelligence`
- `GET /api/today/:status`

### Students

- `GET /api/students`
- `POST /api/students`
- `POST /api/students/photo`
- `PATCH /api/students/:id`
- `POST /api/students/:id/regenerate-qr-token`
- `POST /api/students/promotions/apply`
- `POST /api/students/bulk-assign-section`
- `DELETE /api/students/:id`
- `POST /api/students/import/preview`
- `POST /api/students/import/confirm`

### Grade Levels and Sections

- `GET /api/grade-levels`
- `POST /api/grade-levels`
- `PATCH /api/grade-levels/:id`
- `DELETE /api/grade-levels/:id`
- `GET /api/sections`
- `POST /api/sections`
- `PATCH /api/sections/:id`
- `DELETE /api/sections/:id`

### Kiosks and Scanning

- `GET /api/kiosks`
- `POST /api/kiosks`
- `PATCH /api/kiosks/:id`
- `DELETE /api/kiosks/:id`
- `POST /api/kiosk/scan`

### Attendance Actions

- `POST /api/attendance/manual`
- `POST /api/attendance/status`

### School Settings and Maintenance

- `GET /api/settings/school`
- `POST /api/settings/school/logo`
- `PATCH /api/settings/school`
- `POST /api/settings/school/generate-student-qr-tokens`
- `POST /api/settings/purge-logs`

### Holidays

- `GET /api/holidays`
- `POST /api/holidays`
- `PATCH /api/holidays/:id`
- `DELETE /api/holidays/:id`

### SMS

- `GET /api/sms-templates`
- `PATCH /api/sms-templates/:id`
- `GET /api/sms-logs`
- `GET /api/sms-logs/export`
- `POST /api/sms/test`

### Schools

- `GET /api/schools`
- `POST /api/schools`
- `PATCH /api/schools/:id`
- `DELETE /api/schools/:id`

### Reports

- `GET /api/reports/daily`
- `GET /api/reports/absentees`
- `GET /api/reports/late-history`
- `DELETE /api/reports/attendance/:id`
- `POST /api/reports/attendance/bulk-delete`
- `GET /api/reports/sms-usage`
- `GET /api/reports/sms-billing`
- `GET /api/reports/:type/export`

### Cron / Background Processing

- `POST /api/cron/mark-absent`
- `POST /api/cron/process-sms`
- `POST /api/cron/reconcile-sms`

These expect the `x-cron-secret` header. Do not document the actual secret value in source control.

## Frontend Routes

Defined in [client/src/App.tsx](/C:/Users/Charlie/Desktop/Github/attendance/client/src/App.tsx:1).

- `/login`
- `/mobile/scanner`
- `/`
- `/today/:status`
- `/students`
- `/students/import`
- `/students/inactive`
- `/students/promotion`
- `/grade-levels`
- `/sections`
- `/kiosks`
- `/gate/kiosks`
- `/settings/school`
- `/settings/holidays`
- `/settings/sms-templates`
- `/sms-logs`
- `/schools`
- `/users`
- `/reports/:type`

## CSV Import Format

Expected CSV headings:

- `Grade Level`
- `First Name`
- `Last Name`
- `Student ID`
- `Contact Number`

The import preview validates rows before confirm.

## Tech Stack

- Frontend: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Wouter, TanStack Query
- Backend: Express 5, TypeScript, drizzle-orm, MySQL, express-session
- Mobile shell: Capacitor
- QR generation: `qrcode`
- Camera QR decoding: `jsQR`
- SMS provider: Semaphore

## Project Structure

- `client/` frontend app
- `server/` API routes and business logic
- `shared/` schema and shared helpers
- `migrations/` drizzle migrations
- `uploads/` uploaded student and school assets
- `cron_imp/` PHP CLI workers for shared-hosting SMS queue processing
- `android/` Capacitor Android project
- `ios/` Capacitor iOS project
- `dist/` built production output

## Environment Variables

Create a local `.env` file in the project root.

Example shape only:

```env
DATABASE_URL=mysql://USER:PASSWORD@HOST:PORT/DB
SESSION_SECRET=change-me
NODE_ENV=development
PORT=5000
CRON_SECRET=replace-this
```

Notes:

- keep real secrets out of this README
- SMS provider configuration is largely stored per school in the database

## Local Commands

- install dependencies: `npm install`
- run dev server: `npm run dev`
- type-check: `npm run check`
- build production bundle: `npm run build`
- start production build: `npm run start`
- push schema: `npm run db:push`
- generate migrations: `npm run db:generate`
- run migrations: `npm run db:migrate`
- watch and rebuild Docker app: `npm run docker:watch`

## Docker

From `C:\Users\Charlie\Desktop\Github\attendance`:

```powershell
docker compose up --build -d
```

Useful commands:

```powershell
docker compose ps
docker compose logs -f app
docker compose down
docker compose up -d --build app
```

Current compose ports:

- app: `http://localhost:5100`
- phpMyAdmin: `http://localhost:8082`
- MySQL host port: `3317`

Container details are defined in [docker-compose.yml](/C:/Users/Charlie/Desktop/Github/attendance/docker-compose.yml:1).

## Mobile / Capacitor Notes

The Capacitor shell is configured in [capacitor.config.ts](/C:/Users/Charlie/Desktop/Github/attendance/capacitor.config.ts:1).

Current behavior:

- `webDir` points to `dist/public`
- Capacitor is configured to load a hosted mobile scanner URL through `server.url`
- local Docker rebuilds do not automatically update the remote hosted mobile scanner deployment

That means:

- browser testing against `localhost:5100` shows local changes
- the Capacitor app may still show hosted content until that hosted target is updated or redirected

## Known Operational Notes

- sessions use `memorystore`; for multi-instance production, move to a shared session store
- application date logic is centered on Philippine time handling
- HID/USB scanners behave like keyboards, so the app captures scanner input through a hidden input field
- the current kiosk camera scanner is still web-based via `jsQR`, not native barcode APIs
- old printed QR codes can become invalid if student numbers or QR tokens are regenerated

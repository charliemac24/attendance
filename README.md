# MYO Attendance

School attendance platform for QR-based check-in/check-out, student management, school operations, and SMS guardian notifications.

## Overview

This app is built for multi-school attendance operations with role-based access:

- `super_admin` manages the full platform and can switch between schools
- `school_admin` manages one school's settings, roster, kiosks, users, and reports
- `gate_staff` uses the kiosk scanner and operational attendance views
- `teacher` sees only assigned sections and can review attendance data and mark students absent/excused

The system combines:

- browser kiosk scanning with USB scanners
- camera-based QR scanning on mobile/tablet
- manual attendance actions
- guardian SMS notifications through Semaphore
- reports, exports, and log maintenance tools

## Core Functionality

### 1. Authentication and School Branding

- Session-based login/logout
- Branded login by school slug using `/?school=slug`
- Public school branding endpoint for login/mobile scanner logo and display name
- Super admin school switcher for viewing another school's records without re-login

### 2. Dashboard and Daily Monitoring

- Date-based dashboard for today or historical dates
- KPI cards for:
  - present today
  - late arrivals
  - checked out
  - still on campus
  - absent
  - not yet checked in
  - total active students
- Recent activity feed with admin clear action
- Attendance by grade breakdown
- "Missed Check-Out Yesterday" alert panel
- "Students Needing Attention" panel based on attendance risk flags and trend scoring

### 3. Today's Status Views

Dedicated operational pages for:

- checked out students
- late arrivals
- on-campus students (`pending_checkout`)
- absent students
- not checked in yet

Each view supports:

- date selection
- student search
- grade filter
- section filter
- pagination
- manual check-in/check-out actions where applicable
- teacher section scoping
- missed check-out warning badges

### 4. Student Management

- Create, edit, delete students
- Active and inactive student rosters
- Student photo upload to `uploads/students`
- Guardian name and phone storage
- Grade level and section assignment
- Search by student name or ID
- Bulk selection
- Bulk delete
- Bulk assign section
- Single-student QR printing
- Batch QR printing with A4 print layout
- QR token regeneration per student
- School-wide QR token regeneration from student numbers
- Teacher/admin absent and excused marking with date and note

### 5. CSV Student Import

- CSV template download
- Import preview before commit
- Row-level validation feedback
- Phone normalization during preview
- Confirm step that imports only valid rows

Expected CSV columns:

- `Grade Level`
- `First Name`
- `Last Name`
- `Student ID`
- `Contact Number`

### 6. Student Promotion Workflow

- Bulk promotion screen for year-end rollover
- Filter by current grade/section
- Per-student action selection:
  - promote
  - retain
  - graduate
  - transfer out
- Target grade and section selection
- Bulk action application
- Promotion summary and validation before commit

### 7. Grade Levels and Sections

- CRUD for grade levels
- Optional late-time override per grade level
- CRUD for sections
- Section-to-grade mapping
- Teacher section assignment support

### 8. User Management

- Create, edit, delete users
- Roles supported:
  - `super_admin`
  - `school_admin`
  - `gate_staff`
  - `teacher`
- Super admin can assign users to schools
- Teachers can be restricted to specific sections
- Teachers only see roster and attendance data for assigned sections

### 9. Kiosk Locations and Scanning

- CRUD for kiosk locations
- Kiosk location slug support
- Dedicated kiosk scanner page for gate operations
- Text-input scanning for USB barcode/QR scanners
- Camera QR scanning using `jsQR`
- Kiosk keeps the session alive while open
- Recent scans list
- Student result card with photo and action result

Scan behavior includes:

- resolves QR token, student number, numeric student ID, or URL-style QR payloads
- checks school scope before accepting a student
- skips inactive students
- prevents rapid duplicate scans using minimum scan interval
- respects holidays
- supports dismissal window behavior
- records attendance events with kiosk location context

### 10. Attendance Logic

Automatic and manual attendance flows include:

- first scan creates daily attendance
- late tagging based on school late time or grade-level late-time override
- check-out handling
- manual check-in and check-out endpoint
- manual absent and excused marking with audit event creation
- previous-day missed check-out handling without blocking today's new scan

School-level attendance controls:

- late time
- auto-absent cutoff time
- minimum scan interval
- dismissal time
- early-out window minutes

### 11. Holidays

- CRUD for school holidays
- holiday types:
  - `holiday`
  - `no_classes`
  - `special_schedule`
- Holidays are excluded from attendance KPIs, reports, and attendance-risk scoring

### 12. SMS Notifications

Supported via Semaphore:

- `check_in`
- `check_out`
- `late`
- `absent`

Features:

- per-school SMS enable/disable
- absent SMS toggle per school
- editable SMS templates
- template enable/disable controls
- template token replacement:
  - `{school_name}`
  - `{student_name}`
  - `{grade_level}`
  - `{section}`
  - `{date}`
  - `{time}`
  - `{status}`
- test SMS endpoint
- SMS logs with export
- queue-based SMS notification processing
- retry and reconcile flow for provider delivery states
- monthly SMS credits and overage-rate tracking per school

Currently not used in the UI flow:

- break movement templates
- early-out templates
- `out_final`

### 13. SMS Logs and Billing

- Filter SMS logs by date range
- Export SMS logs to CSV
- Super admin SMS log deletion by date range
- SMS usage report by date
- Super admin SMS billing report by month across schools
- Included credits and overage amount calculation

### 14. Reports and Data Export

Available reports:

- daily report
- late history
- absentees
- SMS usage
- SMS billing

Report capabilities:

- date-range filters
- grade filter
- section filter
- student name filter
- student ID filter
- CSV export
- teacher section scoping

Admin maintenance actions:

- super admin can delete single late/absent history records
- super admin can bulk delete daily attendance records by filtered date range

### 15. Multi-School Administration

Super admin features:

- create, edit, delete schools
- create a school together with its initial school-admin account
- school-specific Semaphore configuration
- school-specific monthly SMS credits
- school-specific overage rate
- school switching in the app header

School settings features:

- school name
- login slug
- login logo upload
- fixed timezone display
- attendance timing rules
- SMS toggles
- dashboard attention-panel toggle

### 16. Maintenance and Operational Tools

- super admin log purge by date range
- delete attendance logs and/or SMS logs separately
- dashboard recent-activity clear action
- school-wide QR token regeneration
- cron endpoint to auto-mark absentees after cutoff
- cron endpoint to process SMS queue
- cron endpoint to reconcile submitted SMS

## Cron and Queue Processing

The app supports two operating styles for background tasks:

### Express endpoints

- `POST /api/cron/mark-absent`
- `POST /api/cron/process-sms`
- `POST /api/cron/reconcile-sms`

Use header:

```bash
x-cron-secret: YOUR_SECRET
```

If `CRON_SECRET` is not set, the server code currently falls back to a built-in default secret. That should be overridden in production.

### PHP cPanel workers

The `cron_imp/` folder contains PHP CLI workers for shared hosting or cPanel deployments:

- `process_sms.php`
- `reconcile_sms.php`

These process queued notifications directly against MySQL and Semaphore.

## API Areas

Main endpoint groups:

- Auth: login, logout, current user, school switch, public branding
- Users: CRUD and teacher section assignment
- Dashboard: KPIs, recent activity, attendance intelligence
- Today views: daily operational attendance lists
- Students: CRUD, photo upload, QR regeneration, bulk section assignment, promotion apply, CSV import
- Grade levels and sections: CRUD
- Kiosks: CRUD and scan endpoint
- Attendance: manual check-in/out and absent/excused status
- School settings: school profile, logo upload, QR generation, log purge
- Holidays: CRUD
- SMS: templates, logs, export, test send
- Schools: super-admin school CRUD
- Reports: daily, absentees, late history, SMS usage, SMS billing, CSV export
- Cron: absent marking, SMS processing, SMS reconciliation

## Tech Stack

- Frontend: React 18, TypeScript, Vite, Tailwind, shadcn/ui, wouter, TanStack Query
- Backend: Express 5, TypeScript, drizzle-orm, MySQL, express-session
- Mobile shell: Capacitor (`android/`, `ios/`)
- QR handling: `qrcode` for generation, `jsQR` for camera decoding
- SMS provider: Semaphore

## Project Structure

- `client/` React frontend
- `server/` Express API and business logic
- `shared/` schema, types, shared helpers
- `migrations/` database migrations
- `uploads/` runtime uploads for student and school images
- `cron_imp/` PHP SMS queue workers for cPanel/shared-hosting environments
- `android/` Capacitor Android project
- `ios/` Capacitor iOS project

## Environment

Create `.env` in the project root:

```env
DATABASE_URL=mysql://USER:PASSWORD@HOST:PORT/DB
SESSION_SECRET=change-me
NODE_ENV=development
PORT=5000
CRON_SECRET=replace-this
```

Optional SMS-related environment behavior is primarily stored per school in the database, not in `.env`.

## Commands

- Install: `npm install`
- Dev: `npm run dev`
- Typecheck: `npm run check`
- Build: `npm run build`
- Start production build: `npm run start`
- Push schema: `npm run db:push`
- Generate migrations: `npm run db:generate`
- Run migrations: `npm run db:migrate`
- Rebuild app container on file changes: `npm run docker:watch`

## Docker

From `C:\Users\Charlie\Desktop\Github\attendance`:

```powershell
docker compose up --build -d
```

Useful commands:

```powershell
docker compose logs -f app
docker compose down
```

Notes:

- the app is exposed at `http://localhost:5000`
- MySQL is available to the app at `db:3306`
- database data is persisted in the `mysql_data` volume
- uploads are persisted in local `./uploads`

## Notes and Limitations

- Session storage uses `memorystore`; for multi-instance production, move to a shared session store.
- Only Semaphore SMS is implemented.
- The system timezone is effectively fixed to Philippine time in the application logic.
- Mobile scanner is a responsive web screen plus Capacitor wrapper, not a separate native attendance backend.
- Some schema fields remain from older SMS policy designs, but the active UI flow is centered on the simplified check-in/check-out/late/absent templates and queued delivery process.

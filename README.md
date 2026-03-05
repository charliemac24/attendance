# MYO Attendance + SMS Alerts

Modern school attendance platform with QR kiosk scanning, student management, and SMS notifications.

## What it does
- QR-based kiosk for check-in / check-out (desktop browser + USB 2D scanner; reads phone-screen QR codes if the scanner supports screens).
- Manual actions: check-in, check-out, mark **Absent** or **Excused** (per-student modal with date + reason).
- Students: CRUD, photo upload, CSV import, QR printing (batch or single).
- SMS to guardians (Semaphore): **check_in**, **check_out** (also used for final dismissal), **late**, optional **absent**. Break/early-out templates are disabled and hidden by default.
- Per-school toggles: enable SMS, enable Absent SMS. SMS cap/policies removed; treated as unlimited.
- Dashboards, Today status views, SMS logs, SMS templates, and basic reports.

## Stack
- Frontend: React + TypeScript, Vite, Tailwind/shadcn, wouter
- Backend: Express + TypeScript, drizzle-orm + MySQL (mysql2), express-session
- Build: tsx scripts; production entry `dist/index.cjs`

## Key flows
### Kiosk scanning
- First scan of the day: creates `daily_attendance` with status `pending_checkout` (or `late` if past cutoff) and sends **check_in** or **late** SMS.
- Dismissal-window scan: treated as final check-out and sends **check_out** SMS.
- Guard rails: min scan interval, dismissal window, holiday check, inactive student skip.

### Manual attendance
- Endpoint: `POST /api/attendance/manual` for check-in/out.
- Endpoint: `POST /api/attendance/status` for `absent` or `excused` (date + note), writes attendance + event; absent SMS only if the school toggle is ON.

### Students
- Photo upload to `/uploads/students` and shown in lists/kiosk result.
- QR print layout optimized for A4; blank pages fixed.
- CSV import (preview + confirm).

### SMS behavior
- Enabled templates: check_in, check_out, late, absent (absent sends only when `absent_sms_enabled` is true and the template is enabled; default disabled).
- Disabled/hidden: break_in, break_out, early_out, out_final.
- SMS cap/policies removed; unlimited per student/day.
- Skips on: SMS disabled, missing API key, missing guardian phone, inactive student, absent toggle off, no enabled template.

## Roles
- super_admin: platform + school switching
- school_admin: own school management
- gate_staff: kiosk + operational views
- teacher: limited reports

Seed (when DB empty and seed runs): `super/admin/gate/teacher` users, password `password`.

## Project structure
- `client/` React app
- `server/` Express API
- `shared/` Drizzle schema & types
- `migrations/` SQL
- `uploads/` runtime student photos

## Environment
Create `.env` in `app/attendance`:
```
DATABASE_URL=mysql://USER:PASSWORD@HOST:PORT/DB
SESSION_SECRET=change-me
NODE_ENV=development
PORT=5000
```

## Commands
- Install: `npm install`
- Typecheck: `npm run check`
- Dev: `npm run dev`
- Build: `npm run build`
- Start (prod build): `npm run start`
- Migrate: `npx drizzle-kit migrate`

## Run with Docker Desktop (Windows)
From `C:\Users\Charlie\Desktop\Github\attendance`:

1. Start Docker Desktop.
2. Build and run:
   ```powershell
   docker compose up --build -d
   ```
3. Open the app: `http://localhost:5000`
4. View logs:
   ```powershell
   docker compose logs -f app
   ```
5. Stop:
   ```powershell
   docker compose down
   ```

Notes:
- MySQL runs in Docker at `db:3306` for the app and `localhost:3306` from Windows.
- App startup runs DB migrations automatically before launching.
- Database data is persisted in Docker volume `mysql_data`.
- Student uploads are persisted in local folder `./uploads`.

## API quick list (main)
- Auth: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- Students: list/create/update/delete, photo upload, import preview/confirm
- Kiosk: `POST /api/kiosk/scan`
- Manual attendance: `POST /api/attendance/manual`
- Manual absent/excused: `POST /api/attendance/status`
- Settings: `GET/PATCH /api/settings/school`
- SMS: `GET/PATCH /api/sms-templates`, `GET /api/sms-logs`
- Reports/status: today statuses, dashboard KPIs, absentees report

## Notes & limitations
- Session store is in-memory (memorystore): single-instance only unless replaced.
- Photos are filesystem-backed; persist `uploads/` in production.
- Absent auto-marking is not implemented; absent/excused must be set manually (or add a job if desired).
- Only Semaphore SMS provider is wired.


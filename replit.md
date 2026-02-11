# MYO School Attendance Alerts

## Overview
Multi-tenant school attendance and SMS notification platform built with React/Express/PostgreSQL. Features QR-based kiosk check-in/out, manual attendance, per-school settings, SMS templates, and role-based access.

## Tech Stack
- Frontend: React + TypeScript + Tailwind CSS + shadcn/ui + wouter routing
- Backend: Express.js + TypeScript
- Database: PostgreSQL with Drizzle ORM
- Auth: Session-based (express-session)

## Color Theme
- Primary: #00A9FF (HSL 197 100% 50%)
- Secondary: #89CFF3
- Complementary: #A0E9FF

## User Roles
- super_admin: Global access, manages schools and users
- school_admin: Manages school data, settings, reports, manual attendance
- gate_staff: Kiosk scanning, limited today overview
- teacher: Reports limited to assigned sections

## Demo Accounts
- super / password (super_admin)
- admin / password (school_admin)
- gate / password (gate_staff)
- teacher / password (teacher)

## Project Structure
- `/client/src/pages/` - All React page components
- `/client/src/components/` - Shared components (sidebar, status-badge)
- `/client/src/lib/auth.tsx` - Auth context and hooks (uses getQueryFn with on401: "returnNull")
- `/server/routes.ts` - All API endpoints
- `/server/storage.ts` - Database storage layer with Drizzle ORM
- `/server/db.ts` - Database connection and seed data
- `/shared/schema.ts` - Drizzle schema + Zod insert schemas + types

## Key Features
- Dashboard with KPI cards (present, late, pending checkout, absent, not checked in)
- Daily status pages with date filtering, search, grade/section filters
- Kiosk QR scanning with check-in/check-out flow
- Student management with CSV import (uses upsertStudentBySchoolAndNo)
- Grade level and section CRUD
- School settings (timezone, late/cutoff times, SMS)
- SMS templates and logs
- Reports with CSV export
- Multi-tenant school scoping

## Query Patterns
- QueryKeys use single-string format with query params: `["/api/students?search=foo"]`
- Cache invalidation uses predicate-based matching: `predicate: (q) => q.queryKey[0].startsWith("/api/...")`
- Auth query uses `on401: "returnNull"` to handle unauthenticated state gracefully

## Running
`npm run dev` starts both frontend and backend on port 5000

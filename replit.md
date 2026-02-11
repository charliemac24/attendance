# MYO School Attendance Alerts

## Overview
Multi-tenant SaaS school attendance and SMS notification platform built with React/Express/PostgreSQL. Features QR-based kiosk check-in/out, manual attendance, per-school settings, SMS templates, and role-based access. Schools have their own isolated logins, data, and management tools.

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
- super_admin: Platform owner, manages all schools, creates school admin accounts, global access
- school_admin: Manages their own school data, settings, reports, manual attendance, users (gate_staff/teacher only)
- gate_staff: Kiosk scanning, limited today overview
- teacher: Reports limited to assigned sections

## Demo Accounts
- super / password (super_admin)
- admin / password (school_admin)
- gate / password (gate_staff)
- teacher / password (teacher)

## Project Structure
- `/client/src/pages/` - All React page components
- `/client/src/components/` - Shared components (sidebar, school-selector, status-badge)
- `/client/src/lib/auth.tsx` - Auth context and hooks (uses getQueryFn with on401: "returnNull"), exports AuthUser type
- `/server/routes.ts` - All API endpoints
- `/server/storage.ts` - Database storage layer with Drizzle ORM
- `/server/db.ts` - Database connection and seed data
- `/shared/schema.ts` - Drizzle schema + Zod insert schemas + types

## Key Features
- Dashboard with KPI cards (present, late, pending checkout, absent, not checked in)
- Daily status pages with date filtering, search, grade/section filters
- Kiosk QR scanning with check-in/check-out flow
- Full CRUD on all entities: schools, students, users, grade levels, sections, kiosks
- Student management with CSV import (uses upsertStudentBySchoolAndNo)
- School creation with admin credential setup (SaaS onboarding)
- School deletion with full cascade cleanup of all related data
- Student deletion with cascade cleanup of attendance and SMS records
- User management: super_admin manages all, school_admin manages gate_staff/teacher
- School settings (timezone, late/cutoff times, SMS)
- SMS templates and logs
- Reports with CSV export
- Multi-tenant school scoping with school-level data isolation

## Multi-tenant Architecture
- Super admin sees "Platform Admin" in sidebar, uses school selector dropdown to switch between schools
- School admins see their school name in sidebar
- All data endpoints enforce school scoping via getSchoolId() helper
- Delete operations enforce school ownership checks to prevent cross-tenant access
- School creation auto-creates a school_admin account with provided credentials

## Query Patterns
- QueryKeys use single-string format with query params: `["/api/students?search=foo"]`
- Cache invalidation uses predicate-based matching: `predicate: (q) => q.queryKey[0].startsWith("/api/...")`
- Auth query uses `on401: "returnNull"` and `staleTime: 0` for immediate refresh on school switch

## Running
`npm run dev` starts both frontend and backend on port 5000

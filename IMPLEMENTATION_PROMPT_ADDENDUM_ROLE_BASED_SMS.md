# Implementation Prompt Addendum: Role-Based SMS Configuration Guardrails

Use this addendum together with the existing implementation prompt. Keep all original requirements unchanged, and apply the following additions.

## Context
- Repo: Node/TypeScript backend + Vite/React client.
- Goal: configurable SMS notifications so pricing remains safe with multiple IN/OUT events.

## New Requirement: Role-Based Control (Global + School)
Add two levels of control:
- Super Admin: global defaults and hard guardrails.
- School Admin: school-level configuration within global guardrails.

### A) Super Admin (Global Defaults + Guardrails)
Create global SMS configuration storage (single row table or system settings):
- `default_sms_mode` (default: `FIRST_IN_LAST_OUT`)
- `default_sms_daily_cap_per_student` (default: `2`)
- `allowed_sms_modes` (flags/list):
  - `FIRST_IN_LAST_OUT` (always allowed)
  - `ALL_MOVEMENTS` (optional; default OFF unless Super Admin enables)
  - `DIGEST` (optional)
  - `EXCEPTION_ONLY` (optional)
- `max_sms_daily_cap_per_student` (default `4`)
- `allow_unlimited_cap` (default `false`)
- `allow_all_guardians_recipients` (default `true`, optional)

These guardrails apply to every school.

Super Admin UI:
- Add `Global SMS Settings` screen, visible only to Super Admin.
- Super Admin can edit defaults + guardrails and save.

### B) School Admin (School-Level Settings Within Guardrails)
School Admin may edit school settings, but server validates against global guardrails.

Editable by School Admin:
- `sms_mode` (must be in `allowed_sms_modes`)
- `sms_daily_cap_per_student` (`0` means unlimited only if `allow_unlimited_cap=true`; otherwise enforce `1..max`)
- `sms_recipients_mode` (`PRIMARY_ONLY` or `ALL_GUARDIANS`, only if globally allowed)
- `sms_quiet_hours` (optional)
- `sms_last_out_cutoff_time` (optional)

### Server-Side Validation Rules (Strict)
- If school sets a mode not globally allowed: reject (`400/403`) with clear message.
- If cap > `max_sms_daily_cap_per_student`: reject with helpful message.
- If cap == `0` and `allow_unlimited_cap=false`: reject.
- If recipients mode == `ALL_GUARDIANS` and global disallows: reject.
- Enforce on all update endpoints (no client-only validation).

## Backend Changes (Add to Original Prompt)
1. Add global SMS settings storage:
- Table (e.g., `global_sms_settings`) single-row, or `system_settings` key/value.
- Add `GET/PUT` endpoints restricted to Super Admin.

2. Extend school notification settings update endpoint:
- Allow School Admin updates for school settings.
- Validate requested values against global settings.

3. Effective settings resolution:
- Effective school settings = school overrides if present, else global defaults.
- Always apply global guardrails even if overrides exist.

## Frontend Changes (Add to Original Prompt)
4. Add/update settings screens:
- School Admin: `SMS Notification Settings`
  - Load global + school settings.
  - Disable/hide disallowed choices based on global guardrails.
  - Show tooltips like: `Only available if enabled by Super Admin.`
  - Show cap hint: `Max: <n> per student/day`.

- Super Admin: `Global SMS Settings` (new)
  - Toggle allowed modes (especially `ALL_MOVEMENTS`).
  - Set defaults for new schools.
  - Set max daily cap + allow unlimited.
  - Save with success toast.

## Authorization
Use existing auth/roles:
- Super Admin only:
  - global settings API
  - global settings UI route
- School Admin and Super Admin:
  - school settings API
  - school settings UI route

Add middleware/guards where needed.

## Keep Existing Prompt Requirements Unchanged
Retain existing behavior for:
- Mode behavior (`FIRST_IN_LAST_OUT` default, `ALL_MOVEMENTS`, optional `DIGEST`/`EXCEPTION_ONLY`)
- Daily cap enforcement
- Multiple guardians counting as extra SMS sends
- `sms_notifications` audit logging + usage endpoints
- Pricing page copy updates (`How SMS credits work`)

## Deliverables
- DB migrations for:
  - global settings
  - school settings
  - `sms_notifications`
- Backend endpoints:
  - `GET/PUT` global SMS settings (Super Admin only)
  - `GET/PUT` school SMS settings (School Admin + Super Admin, with validation)
  - `GET` SMS logs + `GET` usage summary (authorized)
- Frontend pages:
  - Super Admin `Global SMS Settings`
  - School Admin `SMS Notification Settings` (guardrail-limited)
- Pricing page copy update:
  - explain defaults + optional heavier modes
  - mention settings are configurable by admin

## Acceptance Tests (Add)
- School Admin cannot enable `ALL_MOVEMENTS` if globally disallowed.
- School Admin cannot set cap above global max.
- School Admin cannot set cap=`0` unless `allow_unlimited_cap=true` globally.
- Super Admin global changes immediately affect School Admin UI options.
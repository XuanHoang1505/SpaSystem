# Owner staff and schedule management, web (UC-SPA-22, UC-SPA-23) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the owner staff and work schedule management screen (`SCR-W33` at `/owner/staff`), replacing the `PlaceholderPage` with a 2-tab view: Staff List (`DataTable` with search, filters, details sheet, create, edit, update services, and resignation flow with appointment reassignment warnings) and Weekly Schedule Grid (week navigation, shift cards, single shift creation, batch schedule assignment, shift editing, and shift cancellation).

**Architecture:**
- Contracts: `@spa/shared-types` (`staff.ts`, `workSchedules.ts`).
- APIs: `@spa/api-client` (`StaffApi` extended with owner methods, new `WorkSchedulesApi`), and wrappers in `apps/web/src/lib/api/staff.ts` and `workSchedules.ts`.
- Feature: `apps/web/src/features/staff/` containing components, hooks, schemas, and status helpers.
- Page & Routing: `apps/web/src/pages/owner/OwnerStaffPage.tsx` wired in `apps/web/src/app/router.tsx` to `/owner/staff`.

**Tech Stack:** React 19, TypeScript strict, TanStack Query, React Router, React Hook Form + Zod, Tailwind v4 + shadcn/ui, Vitest + Testing Library.

**Spec:** `docs/specs/staff.md`, section "Giao diện (web): UC-SPA-22, UC-SPA-23 — Quản lý nhân viên & Lịch làm việc".

---

## Global Constraints

- Names follow `docs/domain/glossary.md`: `staff`, `work-schedules`, `shifts`.
- Code lives in `apps/web/src/features/staff/` (`components/`, `hooks/`, `schemas.ts`, `staffStatus.ts`, `index.ts`). Named exports only. No `any`, `@ts-ignore`, `as unknown as`.
- UI only from `components/ui` (shadcn) and `components/shared` (`DataTable`, `PageHeader`, `StatusBadge`, `EmptyState`, `ErrorState`). The staff list uses `DataTable`; never a hand-written `<table>`.
- Tailwind tokens from `styles/theme.css` only: no hex colors, no `bg-white`/`text-black`.
- API flow: `@spa/api-client` → `lib/api` → hook → component. Components never call `fetch`.
- Invalidation:
  - Staff mutations (`create`, `update`, `updateServices`, `resign`) invalidate `staffQueryKeys.all`.
  - Schedule mutations (`create`, `createBatch`, `update`, `cancel`) invalidate `workSchedulesQueryKeys.all` and `availabilityQueryKeys.all`.
  - Resign invalidates both `staffQueryKeys.all` and `workSchedulesQueryKeys.all`.
- Error handling by `ApiClientError.errors[].code`. Form errors map to fields via Zod and manual `setError`.
- Vietnamese copy with diacritics, matching `docs/specs/staff.md`. Dates (`yyyy-MM-dd`) and times (`HH:mm`) are Vietnam local time (ADR-0003).
- Supports light and dark themes in `OwnerLayout`.
- TDD: tests next to files (`*.test.ts(x)`), mock fetch with `src/test/mockApi.tsx`.
- Final checks: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run format:check`, `npm run web:build`.
- Do not commit test files if user specifies not to.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `packages/shared-types/src/staff.ts` (modify) | Owner staff contracts (`StaffListItem`, `StaffDetail`, requests, resignation result) |
| `packages/shared-types/src/workSchedules.ts` (create) | Work schedule contracts (`WorkScheduleItem`, batch request & result, query params) |
| `packages/shared-types/src/index.ts` (modify) | Re-export work schedule types |
| `packages/api-client/src/staff.ts` (modify), `staff.test.ts` (create) | Owner staff API methods and query keys |
| `packages/api-client/src/workSchedules.ts` (create), `workSchedules.test.ts` (create) | `WorkSchedulesApi` class, error codes, and query keys |
| `packages/api-client/src/index.ts` (modify) | Export `WorkSchedulesApi` and keys |
| `apps/web/src/lib/api/staff.ts` (create), `workSchedules.ts` (create) | Call wrappers with authenticated Bearer client |
| `apps/web/src/features/services/catalogPolicies.ts` (modify) | Add `maxShiftDaysAhead: 60`, `maxBatchShifts: 500` constants |
| `apps/web/src/features/staff/staffStatus.ts` (create) | Status badges for working/resigned staff and active/cancelled shifts |
| `apps/web/src/features/staff/schemas.ts` (create) | Zod schemas for create/edit staff, resign, shift, batch shift |
| `apps/web/src/features/staff/hooks/useStaffList.ts` (create) | Hook for `GET /staff` with owner filters and pagination |
| `apps/web/src/features/staff/hooks/useStaffDetail.ts` (create) | Hook for `GET /staff/{id}` |
| `apps/web/src/features/staff/hooks/useStaffMutations.ts` (create) | Mutations: create, update, updateServices, resign |
| `apps/web/src/features/staff/hooks/useWorkSchedules.ts` (create) | Hook for `GET /work-schedules` |
| `apps/web/src/features/staff/hooks/useWorkScheduleMutations.ts` (create) | Mutations: create, createBatch, update, cancel shift |
| `apps/web/src/features/staff/components/StaffFilterToolbar.tsx` (create) | Search, status select, service select, clear filters |
| `apps/web/src/features/staff/components/StaffTable.tsx` (create) | `DataTable` columns, badges, row actions dropdown |
| `apps/web/src/features/staff/components/StaffDetailSheet.tsx` (create) | Drawer sheet showing staff info, services, quick action buttons |
| `apps/web/src/features/staff/components/CreateStaffDialog.tsx` (create) | Form dialog to create staff + temporary password notice |
| `apps/web/src/features/staff/components/EditStaffDialog.tsx` (create) | Form dialog to edit staff details |
| `apps/web/src/features/staff/components/UpdateStaffServicesDialog.tsx` (create) | Multi-select dialog to manage staff skills/services |
| `apps/web/src/features/staff/components/ResignStaffDialog.tsx` (create) | Dialog to record resignation and show reassign appointments |
| `apps/web/src/features/staff/components/WeeklyScheduleToolbar.tsx` (create) | Week navigation (prev, today, next), staff select, status select |
| `apps/web/src/features/staff/components/WeeklyScheduleGrid.tsx` (create) | 7-day calendar grid mapping staff rows to weekday shift cells |
| `apps/web/src/features/staff/components/ShiftCard.tsx` (create) | Badge card for a shift with time, status, click actions |
| `apps/web/src/features/staff/components/CreateShiftDialog.tsx` (create) | Form dialog to add a single shift |
| `apps/web/src/features/staff/components/CreateBatchShiftsDialog.tsx` (create) | Form dialog to assign shifts across date range and weekdays |
| `apps/web/src/features/staff/components/BatchResultDialog.tsx` (create) | Dialog displaying batch creation summary and skipped shifts |
| `apps/web/src/features/staff/components/EditShiftDialog.tsx` (create) | Form dialog to update shift date/hours |
| `apps/web/src/features/staff/components/CancelShiftDialog.tsx` (create) | Confirmation dialog to cancel a shift |
| `apps/web/src/features/staff/components/OwnerStaffView.tsx` (create) | Main container wrapping header, tabs, staff list & schedule views |
| `apps/web/src/pages/owner/OwnerStaffPage.tsx` (create) | Page component under `pages/owner` |
| `apps/web/src/app/router.tsx` (modify) | Register `/owner/staff` in `ownerPages` |

---

## Tasks

### Task 1: Contracts in `@spa/shared-types`
- [x] In `packages/shared-types/src/staff.ts`, define `StaffListItem`, `StaffDetail`, `StaffServiceItem`, `CreateStaffRequest`, `UpdateStaffRequest`, `UpdateStaffServicesRequest`, `ResignStaffRequest`, `ResignationResult`, `AppointmentToReassign`, `StaffFilterParams`.
- [x] Create `packages/shared-types/src/workSchedules.ts` with `WorkScheduleStatus` (`'active' | 'cancelled'`), `WorkScheduleItem`, `WorkScheduleQueryParams`, `CreateWorkScheduleRequest`, `UpdateWorkScheduleRequest`, `CreateWorkScheduleBatchRequest`, `WorkScheduleBatchResult`, `SkippedShift`.
- [x] Re-export in `packages/shared-types/src/index.ts`.
- [x] Verify: `npm run typecheck --workspace=@spa/shared-types`.

### Task 2: API Client in `@spa/api-client`
- [x] In `packages/api-client/src/staff.ts`, add owner methods: `list(params)`, `get(id)`, `create(body)`, `update(id, body)`, `updateServices(id, body)`, `resign(id, body)`. Add error codes: `emailExists`, `phoneExists`, `emailSendFailed`, `staffServiceNotFound`, `staffServiceDiscontinued`, `resignationBeforeHireDate`, `hireDateAfterShift`, `staffAlreadyResigned`, `staffNotFound`.
- [x] Create `packages/api-client/src/workSchedules.ts` with `WorkSchedulesApi`: `list(params)`, `create(body)`, `createBatch(body)`, `update(id, body)`, `cancel(id)`. Add error codes: `shiftConflict`, `shiftHasAppointments`, `shiftDateOutOfRange`, `shiftInPast`, `shiftBeforeHireDate`, `staffResigned`, `shiftCancelled`, `workScheduleNotFound`. Define `workSchedulesQueryKeys`.
- [x] Export in `packages/api-client/src/index.ts`.
- [x] Write unit tests in `packages/api-client/src/staff.test.ts` and `workSchedules.test.ts`.
- [x] Verify: `npm run test --workspace=@spa/api-client`.

### Task 3: Web API Wrappers & Policies
- [x] Create `apps/web/src/lib/api/staff.ts` exporting `callStaff<T>`.
- [x] Create `apps/web/src/lib/api/workSchedules.ts` exporting `callWorkSchedules<T>`.
- [x] In `apps/web/src/features/services/catalogPolicies.ts`, add `maxShiftDaysAhead: 60`, `maxBatchShifts: 500`.

### Task 4: Status Helpers & Zod Schemas
- [x] Create `apps/web/src/features/staff/staffStatus.ts`:
  - `staffWorkingStatusBadge(resignationDate)`: 'Đang làm việc' (`success`) vs 'Đã nghỉ việc' (`neutral`).
  - `userAccountStatusBadge(status)`: 'Hoạt động' (`success`), 'Bị khóa' (`danger`), 'Ngừng hoạt động' (`neutral`).
  - `shiftStatusBadge(status)`: 'Hoạt động' (`success`), 'Đã hủy' (`neutral`).
- [x] Create `apps/web/src/features/staff/schemas.ts`:
  - `createStaffSchema`, `updateStaffSchema`, `updateStaffServicesSchema`, `resignStaffSchema`.
  - `createShiftSchema`, `updateShiftSchema`, `createBatchShiftsSchema`.
- [x] Unit tests in `schemas.test.ts` and `staffStatus.test.ts`.
- [x] Verify: `npm run test --workspace=@spa/web`.

### Task 5: Staff & Work Schedule Hooks
- [x] Create `apps/web/src/features/staff/hooks/useStaffList.ts` (query with pagination and filters).
- [x] Create `apps/web/src/features/staff/hooks/useStaffDetail.ts` (query by id).
- [x] Create `apps/web/src/features/staff/hooks/useStaffMutations.ts` (`useCreateStaff`, `useUpdateStaff`, `useUpdateStaffServices`, `useResignStaff`).
- [x] Create `apps/web/src/features/staff/hooks/useWorkSchedules.ts` (query with date range and staff id).
- [x] Create `apps/web/src/features/staff/hooks/useWorkScheduleMutations.ts` (`useCreateWorkSchedule`, `useCreateWorkScheduleBatch`, `useUpdateWorkSchedule`, `useCancelWorkSchedule`).
- [x] Unit tests for hooks with mocked API client.

### Task 6: Staff List Components (UC-SPA-22)
- [x] Create `StaffFilterToolbar.tsx`: search input with debounce, status select, service select, clear button, "Thêm nhân viên" button.
- [x] Create `StaffTable.tsx`: `DataTable` displaying avatar, name, phone, specialty, service badges, hire date, status, actions dropdown.
- [x] Create `StaffDetailSheet.tsx`: side drawer with staff profile, service skills list, contact info, and action triggers.
- [x] Create `CreateStaffDialog.tsx`: create staff form with validation, service multi-select, and temporary password info note.
- [x] Create `EditStaffDialog.tsx`: edit profile fields (name, phone, hire date, specialty).
- [x] Create `UpdateStaffServicesDialog.tsx`: dialog to toggle staff service skills.
- [x] Create `ResignStaffDialog.tsx`: resignation date input, warning note, and view for `appointmentsToReassign`.
- [x] Unit tests for staff components.

### Task 7: Work Schedule Components (UC-SPA-23)
- [x] Create `WeeklyScheduleToolbar.tsx`: week navigation buttons, current week range label, date picker, staff filter, shift status filter, "Thêm ca", "Phân ca theo khoảng ngày" buttons.
- [x] Create `ShiftCard.tsx`: interactive card for shift in grid cell with hours, status tone, and edit/cancel actions.
- [x] Create `WeeklyScheduleGrid.tsx`: 7-day column grid (Monday to Sunday) mapping staff rows to shift cells, with quick '+' add button on each cell.
- [x] Create `CreateShiftDialog.tsx`: add shift form with staff picker, date picker, start/end time select.
- [x] Create `CreateBatchShiftsDialog.tsx`: batch shift assignment with multi-staff checkboxes, date range, weekday toggles, hours.
- [x] Create `BatchResultDialog.tsx`: dialog summarizing batch result (`created` count and table of `skipped` shifts with reasons).
- [x] Create `EditShiftDialog.tsx`: edit shift hours/date.
- [x] Create `CancelShiftDialog.tsx`: confirm shift cancellation.
- [x] Unit tests for schedule components.

### Task 8: View, Page & Route Wiring
- [x] Create `OwnerStaffView.tsx`: main view container with breadcrumbs, page header, tabs (`staff` / `schedule`), state management for URL params, sheet, and dialogs.
- [x] Create `apps/web/src/pages/owner/OwnerStaffPage.tsx`.
- [x] In `apps/web/src/app/router.tsx`, register `/owner/staff` in `ownerPages`.
- [x] Re-export all public components and hooks in `apps/web/src/features/staff/index.ts`.
- [x] Write integration test `OwnerStaffPage.test.tsx` verifying tabs switching, staff list loading, schedule grid loading, error and empty states.

### Task 9: Quality & Verification Checks
- [x] Run `npm run lint` and verify 0 errors.
- [x] Run `npm run typecheck` and verify 0 errors across all workspaces.
- [x] Run `npm run test --workspace=@spa/web` and verify all tests pass.
- [x] Run `npm run web:build` and verify production bundle builds cleanly.
- [x] Update `docs/frontend.md` and `docs/progress.md` marking UC-SPA-22 and UC-SPA-23 as web completed.

---

## Suggested Review Focus
1. Email uniqueness and temporary password notification behavior in `CreateStaffDialog`.
2. Resignation flow: correct handling and UI display of `appointmentsToReassign` with link to `/owner/bookings`.
3. Shift conflict (`409 shift_conflict`) and appointment lock (`409 shift_has_appointments`) alerts in edit and cancel dialogs.
4. Batch shift assignment: handling skipped shifts gracefully and displaying clear reasons to the owner.
5. Weekly schedule grid layout and responsiveness on small screens.

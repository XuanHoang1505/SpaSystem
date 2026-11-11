# Owner Treatments Management, Web (UC-SPA-21) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the owner treatment management screen (`SCR-W36` at `/owner/treatments`), replacing `PlaceholderPage` with full management capabilities: `DataTable` with search & filters (status, staff), detail drawer (`TreatmentDetailSheet` with customer, allergy alert, sessions timeline, skin profiles, care history), modal dialogs for updating plan details (`UpdateTreatmentDialog`), assigning primary staff (`AssignTreatmentStaffDialog`), changing status (`ChangeTreatmentStatusDialog` for pause/resume/cancel/complete with BR-TRT-08 checks), and updating session notes (`UpdateSessionNoteDialog`).

**Architecture:**
- **Contracts:** `@spa/shared-types` (`treatments.ts` extended with `SkinType`, `TreatmentCustomerDto`, `TreatmentNextSessionDto`, `TreatmentPlanListItemDto`, `TreatmentSkinProfileDto`, `CareHistoryEntryDto`, `TreatmentPlanDto`, `UpdateTreatmentPlanRequest`, `UpdateTreatmentSessionRequest`, `AssignTreatmentStaffRequest`, `TreatmentReasonRequest`, `TreatmentSearchParams`).
- **API Client:** `@spa/api-client` (`treatments.ts` extended with `OwnerTreatmentsApi` and `treatmentErrorCodes`).
- **Web Lib & Policies:** `apps/web/src/lib/api/treatments.ts` (`callOwnerTreatments`, `callOwnerTreatmentsVoid`).
- **Feature `treatments`:** `apps/web/src/features/treatments/` (schemas, query keys, hooks, status formatters, `components/owner/` containing table, filter toolbar, detail sheet, dialogs, and `OwnerTreatmentsView`).
- **Pages & Routes:** `apps/web/src/pages/owner/OwnerTreatmentsPage.tsx` registered in `apps/web/src/app/router.tsx` under `ownerPages`.

**Tech Stack:** React 19, TypeScript strict, TanStack Query, React Router, React Hook Form + Zod, Tailwind v4 + shadcn/ui, Lucide Icons, Vitest + Testing Library.

**Spec:** `docs/specs/purchases-treatments.md`, section "Giao diện (web): Quản lý liệu trình của khách hàng (UC-SPA-21, SCR-W36)".

---

## Global Constraints

- Names follow `docs/domain/glossary.md`: `treatments`.
- Component exports must be named exports. No `any`, `@ts-ignore`, or `as unknown as`.
- UI composed exclusively from `components/ui` (shadcn) and `components/shared` (`DataTable`, `PageHeader`, `StatusBadge`, `EmptyState`, `ErrorState`). The table must use `DataTable`; never a raw `<table>`.
- Style using Tailwind classes with tokens from `styles/theme.css`: no hardcoded colors (`text-[#...]`), no `bg-white`/`text-black`.
- Calling pattern: `@spa/api-client` → `lib/api` → hook → component. Components never call `fetch` directly.
- Invalidation:
  - Treatment mutations invalidate `treatmentManageQueryKeys.all`, `treatmentManageQueryKeys.lists()`, `treatmentManageQueryKeys.detail(id)`.
- Error handling matches `ApiClientError.errors[].code`. Form errors map directly to inputs.
- Vietnamese copy with diacritics. Dates formatted with `formatLocalDate` / `vietnamDateOf`.
- Supports light and dark modes in `OwnerLayout`.
- **CRITICAL CONSTRAINT:** Under NO circumstances should any test files (`*.test.ts`, `*.test.tsx`) be committed to git.

---

## File Structure

| File | Action | Responsibility |
| --- | --- | --- |
| `packages/shared-types/src/treatments.ts` | Modify | Add management types, requests, search params |
| `packages/shared-types/src/index.ts` | Modify | Ensure all treatment management types are re-exported |
| `packages/api-client/src/treatments.ts` | Modify | Add `OwnerTreatmentsApi` and extend `treatmentErrorCodes` |
| `packages/api-client/src/index.ts` | Modify | Re-export `OwnerTreatmentsApi` |
| `packages/api-client/src/treatments.test.ts` | Create | Unit tests for `OwnerTreatmentsApi` (uncommitted) |
| `apps/web/src/lib/api/treatments.ts` | Modify/Create | Add `callOwnerTreatments<T>` and `callOwnerTreatmentsVoid` |
| `apps/web/src/features/treatments/treatmentQueryKeys.ts` | Create | Query keys for owner treatments |
| `apps/web/src/features/treatments/treatmentStatus.ts` | Create | Status mappings, badges, skin type labels, helpers |
| `apps/web/src/features/treatments/schemas.ts` | Create | Zod schemas for update, assign staff, reason, session note |
| `apps/web/src/features/treatments/hooks/useOwnerTreatments.ts` | Create | Query hooks for list and detail |
| `apps/web/src/features/treatments/hooks/useOwnerTreatmentMutations.ts` | Create | Mutation hooks for update, assign, pause, resume, cancel, complete, session note |
| `apps/web/src/features/treatments/components/owner/TreatmentFilterToolbar.tsx` | Create | Search debounce, status filter, staff filter, reset button |
| `apps/web/src/features/treatments/components/owner/TreatmentTable.tsx` | Create | `DataTable` for treatment plans with customer, progress, staff, actions |
| `apps/web/src/features/treatments/components/owner/TreatmentDetailSheet.tsx` | Create | Comprehensive drawer for plan details, allergy alert, sessions, skin profiles, care history |
| `apps/web/src/features/treatments/components/owner/UpdateTreatmentDialog.tsx` | Create | Modal to edit goal, expected end date, notes |
| `apps/web/src/features/treatments/components/owner/AssignTreatmentStaffDialog.tsx` | Create | Modal to assign/change primary staff |
| `apps/web/src/features/treatments/components/owner/ChangeTreatmentStatusDialog.tsx` | Create | Modal for pause, resume, cancel (booked check), complete (uncompleted check) |
| `apps/web/src/features/treatments/components/owner/UpdateSessionNoteDialog.tsx` | Create | Modal to edit session note |
| `apps/web/src/features/treatments/components/owner/OwnerTreatmentsView.tsx` | Create | Main container view for `/owner/treatments` (SCR-W36) |
| `apps/web/src/features/treatments/index.ts` | Create | Public exports for features/treatments |
| `apps/web/src/pages/owner/OwnerTreatmentsPage.tsx` | Create | Page component for `/owner/treatments` |
| `apps/web/src/app/router.tsx` | Modify | Wire `/owner/treatments` in `ownerPages` |
| `docs/progress.md` | Modify | Mark UC-SPA-21 Web as ✅ |
| `docs/frontend.md` | Modify | Document `/owner/treatments` feature |

---

## Tasks

### Task 1: Contracts in `@spa/shared-types`
- [ ] In `packages/shared-types/src/treatments.ts`:
  - `SkinType = 'Normal' | 'Dry' | 'Oily' | 'Combination' | 'Sensitive'`.
  - `TreatmentCustomerDto`: `{ id: string; fullName: string; phoneNumber: string | null }`.
  - `TreatmentNextSessionDto`: `{ id: string; sequenceNumber: number; serviceName: string; status: TreatmentSessionStatus; appointment: SessionAppointment | null }`.
  - `TreatmentPlanListItemDto`: `{ id: string; customer: TreatmentCustomerDto; packageName: string; status: TreatmentPlanStatus; packageStatus: CustomerPackageStatus; expiresAtUtc: string | null; totalSessions: number; usedSessions: number; bookedSessions: number; primaryStaff: StaffRef | null; nextSession: TreatmentNextSessionDto | null; purchasedAtUtc: string }`.
  - `TreatmentSkinProfileDto`: `{ id: string; appointmentId: string; sequenceNumber: number; assessedAtUtc: string; skinType: SkinType; mainConcerns: string | null; careGoals: string | null; recommendedTreatment: string | null; assessedBy: StaffRef }`.
  - `CareHistoryEntryDto`: `{ appointmentId: string; sequenceNumber: number; date: string; startTime: string; endTime: string; status: AppointmentStatus; staff: StaffRef; result: string | null; skinProfileId: string | null }`.
  - `TreatmentPlanDto`: `{ id: string; customer: TreatmentCustomerDto; packageName: string; status: TreatmentPlanStatus; packageStatus: CustomerPackageStatus; expiresAtUtc: string | null; totalSessions: number; usedSessions: number; bookedSessions: number; primaryStaff: StaffRef | null; nextSession: TreatmentNextSessionDto | null; purchasedAtUtc: string; customerPackageId: string; goal: string | null; note: string | null; statusReason: string | null; startDate: string | null; expectedEndDate: string | null; actualEndDate: string | null; canEdit: boolean; canManage: boolean; hasAllergies: boolean; sessions: readonly TreatmentSessionDto[]; skinProfiles: readonly TreatmentSkinProfileDto[]; careHistory: readonly CareHistoryEntryDto[] }`.
  - `TreatmentSessionDto`: `{ id: string; sequenceNumber: number; spaServiceId: string; serviceName: string; durationMinutes: number; status: TreatmentSessionStatus; note: string | null; completedAtUtc: string | null; appointment: SessionAppointment | null }`.
  - `UpdateTreatmentPlanRequest`: `{ goal?: string | null; expectedEndDate?: string | null; note?: string | null }`.
  - `UpdateTreatmentSessionRequest`: `{ note?: string | null }`.
  - `AssignTreatmentStaffRequest`: `{ staffMemberId?: string | null }`.
  - `TreatmentReasonRequest`: `{ reason?: string | null }`.
  - `TreatmentSearchParams`: `PaginationParams` + `{ search?: string; customerId?: string; status?: TreatmentPlanStatus; primaryStaffMemberId?: string }`.
- [ ] Export in `packages/shared-types/src/index.ts`.
- [ ] Verify: `npm run typecheck --workspace=@spa/shared-types`.

### Task 2: API Client in `@spa/api-client`
- [ ] In `packages/api-client/src/treatments.ts`:
  - `OwnerTreatmentsApi`:
    - `search(params?: TreatmentSearchParams, signal?: AbortSignal)`: calls `GET /api/v1/treatments`.
    - `get(id: string, signal?: AbortSignal)`: calls `GET /api/v1/treatments/{id}`.
    - `update(id: string, body: UpdateTreatmentPlanRequest, signal?: AbortSignal)`: calls `PUT /api/v1/treatments/{id}`.
    - `updateSession(id: string, sessionId: string, body: UpdateTreatmentSessionRequest, signal?: AbortSignal)`: calls `PUT /api/v1/treatments/{id}/sessions/{sessionId}`.
    - `assignStaff(id: string, body: AssignTreatmentStaffRequest, signal?: AbortSignal)`: calls `POST /api/v1/treatments/{id}/assign-staff`.
    - `pause(id: string, body: TreatmentReasonRequest, signal?: AbortSignal)`: calls `POST /api/v1/treatments/{id}/pause`.
    - `resume(id: string, signal?: AbortSignal)`: calls `POST /api/v1/treatments/{id}/resume`.
    - `cancel(id: string, body: TreatmentReasonRequest, signal?: AbortSignal)`: calls `POST /api/v1/treatments/{id}/cancel`.
    - `complete(id: string, signal?: AbortSignal)`: calls `POST /api/v1/treatments/{id}/complete`.
  - `treatmentErrorCodes`:
    - `treatmentPlanNotFound: 'treatment_plan_not_found'`
    - `treatmentSessionNotFound: 'treatment_session_not_found'`
    - `treatmentNotInCharge: 'treatment_not_in_charge'`
    - `treatmentStatusInvalid: 'treatment_status_invalid'`
    - `treatmentHasBookedSessions: 'treatment_has_booked_sessions'`
    - `treatmentSessionsRemaining: 'treatment_sessions_remaining'`
    - `treatmentSessionCompleted: 'treatment_session_completed'`
    - `staffNotFound: 'staff_not_found'`
    - `staffResigned: 'staff_resigned'`
    - `validationError: 'validation_error'`
- [ ] Export in `packages/api-client/src/index.ts`.
- [ ] Write unit tests in `packages/api-client/src/treatments.test.ts` (uncommitted).
- [ ] Verify: `npm run typecheck --workspace=@spa/api-client` and `npm run test --workspace=@spa/api-client`.

### Task 3: Web API Wrappers & Query Keys & Formatters
- [ ] Create `apps/web/src/lib/api/treatments.ts`:
  - `callOwnerTreatments<T>(fn: (api: OwnerTreatmentsApi) => Promise<T>): Promise<T>`.
  - `callOwnerTreatmentsVoid(fn: (api: OwnerTreatmentsApi) => Promise<unknown>): Promise<void>`.
- [ ] Create `apps/web/src/features/treatments/treatmentQueryKeys.ts`:
  - `treatmentManageQueryKeys`: `all`, `lists()`, `list(params)`, `details()`, `detail(id)`.
- [ ] Create `apps/web/src/features/treatments/treatmentStatus.ts`:
  - `treatmentPlanStatusBadge`: label and tone.
  - `treatmentSessionStatusBadge`: label and tone.
  - `skinTypeLabels`: Vietnamese labels for skin types.

### Task 4: Zod Schemas
- [ ] Create `apps/web/src/features/treatments/schemas.ts`:
  - `updateTreatmentSchema`: `goal` ($\le 2000$), `expectedEndDate` (optional string), `note` ($\le 2000$).
  - `assignStaffSchema`: `staffMemberId` (optional string).
  - `treatmentReasonSchema`: `reason` (1–500 chars trimmed).
  - `updateSessionNoteSchema`: `note` ($\le 2000$).

### Task 5: React Query Hooks
- [ ] Create `apps/web/src/features/treatments/hooks/useOwnerTreatments.ts`:
  - `useOwnerTreatmentSearch(params)`.
  - `useOwnerTreatment(id, enabled)`.
- [ ] Create `apps/web/src/features/treatments/hooks/useOwnerTreatmentMutations.ts`:
  - `useUpdateTreatment`: invalidates `treatmentManageQueryKeys.all`, `detail(id)`.
  - `useAssignTreatmentStaff`: invalidates `treatmentManageQueryKeys.all`, `detail(id)`.
  - `usePauseTreatment`: invalidates `treatmentManageQueryKeys.all`, `detail(id)`.
  - `useResumeTreatment`: invalidates `treatmentManageQueryKeys.all`, `detail(id)`.
  - `useCancelTreatment`: invalidates `treatmentManageQueryKeys.all`, `detail(id)`.
  - `useCompleteTreatment`: invalidates `treatmentManageQueryKeys.all`, `detail(id)`.
  - `useUpdateSessionNote`: invalidates `treatmentManageQueryKeys.detail(id)`.

### Task 6: UI Components (`apps/web/src/features/treatments/components/owner/`)
- [ ] `TreatmentFilterToolbar.tsx`: Search input with debounce 300ms, status select, working staff select (`useWorkingStaff`), reset button.
- [ ] `TreatmentTable.tsx`: `DataTable<TreatmentPlanListItemDto>` with columns for customer, package, progress, next session, primary staff, expires, status badge, row actions with icons.
- [ ] `TreatmentDetailSheet.tsx`: Drawer for plan details:
  - Header: Package name, customer details, status badge, allergy warning (`hasAllergies`), pause/cancel reason (`statusReason`).
  - Phác đồ điều trị: Goal, note, start date, expected end date, actual end date, primary staff.
  - Timeline các buổi: Sequence, service, duration, status badge, appointment info, note edit button.
  - Hồ sơ da (`SkinProfiles`): Assessment date, assessed by, skin type, main concerns, goals, recommendations.
  - Lịch sử chăm sóc (`CareHistory`): Visit date/time, status badge, staff, care result note.
  - Footer actions: Edit phác đồ, Change staff, Status action buttons.
- [ ] `UpdateTreatmentDialog.tsx`: Modal form for goal, expected end date, internal note.
- [ ] `AssignTreatmentStaffDialog.tsx`: Modal to assign/change primary staff from working staff list or clear.
- [ ] `ChangeTreatmentStatusDialog.tsx`: Modal for Pause, Resume, Cancel (checks `bookedSessions === 0`), Complete (checks all completed or skipped).
- [ ] `UpdateSessionNoteDialog.tsx`: Modal to edit session note.
- [ ] `OwnerTreatmentsView.tsx`: Main container view integrating Breadcrumb, PageHeader, FilterToolbar, Table, Sheet, Dialogs.
- [ ] `apps/web/src/features/treatments/index.ts`: Export all components, hooks, schemas, status.

### Task 7: Pages & Router Wiring
- [ ] Create `apps/web/src/pages/owner/OwnerTreatmentsPage.tsx` rendering `<OwnerTreatmentsView />`.
- [ ] In `apps/web/src/app/router.tsx`: register `'/owner/treatments': <OwnerTreatmentsPage />` in `ownerPages`.

### Task 8: Verification & Unit Tests
- [ ] Write `OwnerTreatmentsView.test.tsx` (uncommitted).
- [ ] Run quality checks:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run web:build`
  - `npm run test --workspace=@spa/web -- OwnerTreatmentsView.test.tsx`

### Task 9: Documentation
- [ ] `docs/progress.md`: Mark UC-SPA-21 Web as `✅`.
- [ ] `docs/frontend.md`: Document `/owner/treatments` (SCR-W36).

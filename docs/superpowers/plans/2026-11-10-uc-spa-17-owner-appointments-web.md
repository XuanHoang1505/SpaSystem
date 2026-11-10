# Owner appointment management, web (UC-SPA-17) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `/owner/bookings` placeholder with the owner's appointment screen: a filtered list, a day calendar by staff with drag and drop, a detail sheet and the five owner commands.

**Architecture:** Contracts go into `@spa/shared-types` and a new `OwnerAppointmentsApi` in `@spa/api-client`; the web app adds owner hooks and components inside the existing `features/bookings` feature and one page under `pages/owner`. Filters, paging, the view and the open appointment live in the URL. The day calendar is a CSS grid of droppable 30-minute cells; a pure function turns a drop into one backend command, and the backend alone decides whether the move is allowed.

**Tech Stack:** React 19, TypeScript strict, TanStack Query, React Router, React Hook Form + Zod, Tailwind v4 + shadcn/ui, `@dnd-kit/core` (new), Vitest + Testing Library.

**Spec:** `docs/specs/bookings.md`, section "Giao diện (web): UC-SPA-17" (read it first; all Vietnamese copy, the error table and test ids `BKG-UI-T19…T34` come from there). Backend contract: `backend/src/API/Controllers/AppointmentsController.cs`, `backend/src/Application/DTOs/Bookings/Appointment*.cs`.

## Global Constraints

- Names follow `docs/domain/glossary.md`: `appointments`, `appointmentId` (never `bookings`/`bookingId` for new identifiers; the route path `/owner/bookings` and the folder `features/bookings` already exist and stay).
- Owner code goes in `apps/web/src/features/bookings/components/owner/` and `hooks/owner/`; exports are added to `features/bookings/index.ts`. Named exports only. No `any`, `@ts-ignore`, `as unknown as`.
- UI only from `components/ui` (shadcn) and `components/shared`. The list uses the shared `DataTable`; never a hand-written `<table>` or the shadcn `Table`. The day calendar is not a data table.
- Tailwind with tokens from `styles/theme.css` only: no hex or arbitrary colors, no `bg-white`/`text-black`, no CSS Modules, no inline `style` for colors or spacing (inline `style` is allowed only for computed grid placement: `gridRow`, `gridColumn`).
- A new shadcn primitive is added with `npx shadcn@4.23.0 add <name>` from `apps/web` (then the fixes in `apps/web/CLAUDE.md`); only the unified `radix-ui` package; icons from `lucide-react`.
- The only new dependency is `@dnd-kit/core`, installed from the repo root with `npm install @dnd-kit/core --workspace @spa/web` (single root lockfile).
- API flow: `@spa/api-client` → `lib/api` → hook → component. Components never call `fetch`. Every successful mutation invalidates `ownerAppointmentsQueryKeys.all` and `availabilityQueryKeys.all`.
- Errors are handled by `ApiClientError.errors[].code`, never by message text. Where the spec says "thông điệp backend", show `errorMessageOf(error)`.
- The frontend never re-derives business rules: buttons appear by `status` only; overlap, shift, skill and time checks are the backend's.
- Every data view has loading, error (with retry), empty and data states.
- Vietnamese copy with diacritics, exactly as in the spec; no em-dash in visible text. Appointment dates (`yyyy-MM-dd`) and times (`HH:mm`) are already Vietnam local time (ADR-0003): format with `lib/formatting`, never convert the zone again. "Today" comes from `vietnamNow()`.
- Owner pages support light and dark themes.
- Do not change the backend or its contract. A missing field is reported, not added.
- TDD: tests next to the file (`*.test.ts(x)`), `fetch` stubbed with `src/test/mockApi.tsx` (`mockApi`, `envelope`, `apiError`, `renderApp`, `callsTo`); sign in as owner the way `src/app/RouteGuard.test.tsx` does. No real backend.
- Git is run by the user: do not commit or push. Each task ends with a checkpoint that prints the suggested `git add` / `git commit` commands for the user (no `Co-Authored-By`, no "Generated with" line).
- Final checks: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run format:check`, `npm run web:build` (all from the repo root).

## Review Focus

- An appointment that is not on the 30-minute grid (for example 14:15 – 15:30): the card must sit and size by minutes, not by slot index, and a drop still sends a grid time. Test in Task 8 (`placeCard`).
- Two cards of one staff member that overlap in time (a stale `held` next to a `confirmed`): both must stay visible side by side, neither hidden under the other. Test in Task 8 (`placeCard` lanes).
- A drop near the end of the day whose end would pass 24:00, or onto the card's own cell: `resolveDrop` returns `null`, no dialog, no request. Test in Task 9.
- `?appointmentId=` that is not a GUID, or `?date=`/`?fromDate=` that is not a real date: ignored, defaults used, no request with the bad value. Tests in Task 3 and Task 4.
- The current page no longer exists after an action or a narrower filter (page 3 of 2): the view moves to the last page with `setPage(totalPages, { replace: true })` instead of showing an empty table. Test in Task 3.

---

## File structure

| File                                                                                                                                      | Responsibility                                                     |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `packages/shared-types/src/bookings.ts` (modify)                                                                                          | Owner appointment contracts                                        |
| `packages/api-client/src/appointments.ts` (modify), `appointments.test.ts` (create)                                                       | `OwnerAppointmentsApi`, query keys, error codes                    |
| `packages/api-client/src/staff.ts` (modify)                                                                                               | `staffQueryKeys.working()`                                         |
| `apps/web/src/lib/api/appointments.ts` (modify)                                                                                           | `callOwnerAppointments`                                            |
| `apps/web/src/features/services/catalogPolicies.ts` (modify)                                                                              | Constants copied from `appsettings.json`                           |
| `apps/web/src/features/bookings/appointmentStatus.ts` (modify)                                                                            | Label rename, `ownerAppointmentActions`, allergy labels            |
| `apps/web/src/features/bookings/errors.ts`, `schemas.ts` (modify)                                                                         | Owner error kinds, `ownerCancelSchema`, `noShowSchema`             |
| `features/bookings/hooks/owner/*.ts`                                                                                                      | One hook per query/mutation                                        |
| `features/bookings/components/owner/useOwnerAppointmentFilters.ts`                                                                        | URL ⇄ filters                                                      |
| `…/owner/OwnerAppointmentsView.tsx`                                                                                                       | Page body: header, tabs, toolbar, list or day view, sheet, dialogs |
| `…/owner/OwnerAppointmentFilters.tsx`                                                                                                     | Toolbar                                                            |
| `…/owner/OwnerAppointmentsTable.tsx`                                                                                                      | `DataTable` columns and row actions                                |
| `…/owner/OwnerAppointmentSheet.tsx`                                                                                                       | Detail sheet                                                       |
| `…/owner/OwnerAppointmentActions.tsx`                                                                                                     | Renders the right dialog for `{ action, appointment }`             |
| `…/owner/ConfirmAppointmentDialog.tsx`, `OwnerCancelDialog.tsx`, `NoShowDialog.tsx`, `OwnerRescheduleDialog.tsx`, `AssignStaffDialog.tsx` | One dialog each                                                    |
| `…/owner/dayGrid.ts`                                                                                                                      | Pure layout and drop logic                                         |
| `…/owner/DayCalendar.tsx`, `DayCalendarCard.tsx`, `DropConfirmDialog.tsx`                                                                 | Day view                                                           |
| `apps/web/src/pages/owner/OwnerAppointmentsPage.tsx`, `app/router.tsx` (modify)                                                           | Route wiring                                                       |

---

### Task 1: Contracts and `OwnerAppointmentsApi`

**Files:**

- Modify: `packages/shared-types/src/bookings.ts`, `packages/api-client/src/appointments.ts`, `packages/api-client/src/staff.ts`
- Test: `packages/api-client/src/appointments.test.ts` (create; follow `auth.test.ts` for the fake `fetch`)

**Interfaces — Produces:**

```ts
// shared-types/bookings.ts
export interface AppointmentCustomer {
  id: string;
  fullName: string;
  phoneNumber: string;
}
export type AllergySeverity = 'mild' | 'moderate' | 'severe';
export interface CustomerAllergy {
  id: string;
  allergen: string;
  severity: AllergySeverity;
  note: string | null;
  recordedAtUtc: string;
}
export interface TreatmentSessionRef {
  id: string;
  sequenceNumber: number;
  totalSessions: number;
  customerPackageId: string;
  packageName: string;
}
export interface AppointmentListItem {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  customer: AppointmentCustomer;
  staff: AppointmentStaff;
  service: AppointmentService;
}
export interface AppointmentDetail extends AppointmentListItem {
  holdExpiresAtUtc: string | null;
  cancelledAtUtc: string | null;
  cancellationReason: string | null;
  note: string | null;
  createdAtUtc: string;
  allergies: readonly CustomerAllergy[];
  treatmentSession: TreatmentSessionRef | null;
  hasSkinProfile: boolean;
  skinProfileId: string | null;
}
export interface AppointmentListParams {
  fromDate: string;
  toDate: string;
  staffMemberId?: string;
  status?: AppointmentStatus;
  search?: string;
  pageNumber?: number;
  pageSize?: number;
}
export interface OwnerRescheduleAppointmentRequest {
  date: string;
  startTime: string;
}

// api-client/appointments.ts
export class OwnerAppointmentsApi {
  list(
    params: AppointmentListParams,
    signal?: AbortSignal,
  ): Promise<ApiResponse<PagedResponse<AppointmentListItem>>>;
  get(id: string, signal?: AbortSignal): Promise<ApiResponse<AppointmentDetail>>;
  confirm(id: string): Promise<ApiResponse<AppointmentDetail>>;
  reschedule(
    id: string,
    body: OwnerRescheduleAppointmentRequest,
  ): Promise<ApiResponse<AppointmentDetail>>;
  assignStaff(id: string, staffMemberId: string): Promise<ApiResponse<AppointmentDetail>>;
  cancel(id: string, reason: string): Promise<ApiResponse<AppointmentDetail>>;
  markNoShow(id: string, note?: string): Promise<ApiResponse<AppointmentDetail>>;
}
export const ownerAppointmentsQueryKeys = {
  all: ['owner-appointments'] as const,
  list: (params: AppointmentListParams) => ['owner-appointments', 'list', params] as const,
  detail: (id: string) => ['owner-appointments', 'detail', id] as const,
};
// appointmentErrorCodes gains: staffNotOnShift 'staff_not_on_shift', staffBusy 'staff_busy',
// noShowTooEarly 'no_show_too_early', appointmentNotAssigned 'appointment_not_assigned'
// staff.ts: staffQueryKeys.working = () => ['staff', 'working'] as const
```

- [ ] **Step 1: Write the failing test** (BKG-UI-T19) in `appointments.test.ts`:
  - `list({ fromDate: '2026-11-10', toDate: '2026-11-16', staffMemberId: 's1', status: 'confirmed', search: 'lan', pageNumber: 2, pageSize: 20 })` → `GET /api/v1/appointments` with exactly those seven query values.
  - `get('a1')` → `GET /api/v1/appointments/a1`.
  - `confirm('a1')` → `POST …/a1/confirm` (empty body `{}`); `reschedule('a1', { date: '2026-11-12', startTime: '14:00' })` → `POST …/a1/reschedule` with that body; `assignStaff('a1', 's2')` → body `{ staffMemberId: 's2' }`; `cancel('a1', 'Khách bận')` → body `{ reason: 'Khách bận' }`; `markNoShow('a1')` → body `{}`; `markNoShow('a1', 'Gọi không nghe')` → body `{ note: 'Gọi không nghe' }`.
  - `ownerAppointmentsQueryKeys.detail('a1')` equals `['owner-appointments', 'detail', 'a1']`.
- [ ] **Step 2: Run** `npm run test --workspace @spa/api-client -- src/appointments.test.ts` → FAIL (`OwnerAppointmentsApi` not exported).
- [ ] **Step 3: Implement** the types, the class (base `/api/v1/appointments`, ids through `encodeURIComponent`, same style as `AppointmentsApi`), the keys and the four error codes.
- [ ] **Step 4: Run** the same test → PASS; `npm run typecheck` → no errors.
- [ ] **Step 5: Checkpoint.** Suggest: `git add packages && git commit -m "feat(api-client): add owner appointments API (UC-SPA-17)"`.

### Task 2: Web foundations: hooks, labels, schemas, policies

**Files:**

- Modify: `apps/web/src/lib/api/appointments.ts`, `features/services/catalogPolicies.ts`, `features/bookings/appointmentStatus.ts`, `features/bookings/errors.ts`, `features/bookings/schemas.ts`, `features/bookings/index.ts`, `features/service-history/historyStatus.ts`, `features/service-history/components/ServiceHistoryFilterToolbar.tsx`
- Create: `features/bookings/hooks/owner/{useOwnerAppointments,useOwnerAppointment,useOwnerAppointmentMutations,useWorkingStaff}.ts`
- Test: `features/bookings/appointmentStatus.test.ts`, `features/bookings/schemas.test.ts`, `features/bookings/errors.test.ts`

**Interfaces — Consumes:** Task 1. **Produces:**

```ts
// lib/api/appointments.ts
export function callOwnerAppointments<T>(call: (api: OwnerAppointmentsApi) => Promise<ApiResponse<T>>): Promise<T>;

// catalogPolicies gains
maxAppointmentQueryRangeDays: 42,        // Booking:MaxQueryRangeDays
noShowConsumesEntitlement: false,        // Booking:NoShowConsumesEntitlement
dayGridStartTime: '08:00', dayGridEndTime: '20:00',

// appointmentStatus.ts
export type OwnerAppointmentAction = 'confirm' | 'reschedule' | 'assign_staff' | 'cancel' | 'no_show';
export function ownerAppointmentActions(status: AppointmentStatus): readonly OwnerAppointmentAction[];
export const ownerActionLabels: Record<OwnerAppointmentAction, string>; // Xác nhận, Đổi giờ, Đổi nhân viên, Hủy lịch, Khách không đến
export const allergySeverityBadge: (severity: AllergySeverity) => { label: string; tone: StatusTone }; // Nhẹ neutral, Vừa warning, Nặng danger
export const appointmentStatuses: readonly AppointmentStatus[]; // the 7 values, in the order of the union

// errors.ts: BookingErrorKind gains 'staff_unavailable' (staff_busy, staff_not_on_shift) and 'no_show_too_early'

// schemas.ts
export const NO_SHOW_NOTE_MAX = 1000;
export const ownerCancelSchema = cancelAppointmentSchema; // same rule and messages
export const noShowSchema: z.ZodObject<{ note }>;         // optional, trimmed, max 1000: 'Ghi chú tối đa 1000 ký tự.'

// hooks/owner
export function useOwnerAppointments(params: AppointmentListParams | null); // null → disabled; keepPreviousData; retry: ordersRetry
export function useOwnerAppointment(id: string | null);
export function useConfirmAppointment();           // mutate(id)
export function useOwnerReschedule();              // mutate({ id, body })
export function useAssignAppointmentStaff();       // mutate({ id, staffMemberId })
export function useOwnerCancelAppointment();       // mutate({ id, reason })
export function useMarkNoShow();                   // mutate({ id, note? })
export function useWorkingStaff(spaServiceId?: string); // StaffApi.listPublic({ spaServiceId, pageSize: 100 }); key: staffQueryKeys.working(), or [...staffQueryKeys.publicByService(id), 'all'] with a service
```

All five mutations: `onSuccess` writes the returned detail to `ownerAppointmentsQueryKeys.detail(id)`; `onSettled` invalidates `ownerAppointmentsQueryKeys.all` and `availabilityQueryKeys.all` (one shared helper `invalidateOwnerAppointments(queryClient)` in the mutations file).

- [ ] **Step 1: Write the failing tests**
  - `appointmentStatus.test.ts` (BKG-UI-T23, T34): `ownerAppointmentActions('pending_confirmation')` equals `['confirm', 'reschedule', 'assign_staff', 'cancel']`; `('confirmed')` equals `['reschedule', 'assign_staff', 'cancel', 'no_show']`; each of `held`, `completed`, `cancelled`, `no_show`, `hold_expired` gives `[]`; `appointmentStatusBadge('no_show').label` is `'Không đến'`.
  - `schemas.test.ts`: `noShowSchema` accepts `{}` and `{ note: '  ' }` (parsed note is empty), rejects a 1001-character note with `'Ghi chú tối đa 1000 ký tự.'`; `ownerCancelSchema` rejects `'   '` with `'Vui lòng nhập lý do hủy.'`.
  - `errors.test.ts`: an `ApiClientError` with code `staff_busy` and one with `staff_not_on_shift` map to `'staff_unavailable'`; `no_show_too_early` maps to `'no_show_too_early'`.
- [ ] **Step 2: Run** `npm run test --workspace @spa/web -- src/features/bookings` → FAIL.
- [ ] **Step 3: Implement** the items in the Interfaces block. Rename the `no_show` label to "Không đến" in `appointmentStatus.ts`, `historyStatus.ts` and the `<option>` of `ServiceHistoryFilterToolbar.tsx`; update "Vắng mặt" → "Không đến" in `docs/specs/purchases-treatments.md` (three places in the UC-SPA-20 web section and `HIS-UI-T07`).
- [ ] **Step 4: Run** the tests → PASS; `npm run typecheck` → clean; `grep -rn "Vắng mặt" apps/web/src` → no matches.
- [ ] **Step 5: Checkpoint.** Suggest: `git commit -m "feat(web): add owner appointment hooks, labels and schemas"`.

### Task 3: List view, filters and route

**Files:**

- Create: `features/bookings/components/owner/{useOwnerAppointmentFilters.ts,OwnerAppointmentFilters.tsx,OwnerAppointmentsTable.tsx,OwnerAppointmentsView.tsx}`, `pages/owner/OwnerAppointmentsPage.tsx`
- Modify: `app/router.tsx` (add `ownerPages: Record<string, ReactElement>` used like `customerPages`; staff routes stay placeholders), `features/bookings/index.ts`
- Test: `components/owner/useOwnerAppointmentFilters.test.tsx`, `components/owner/OwnerAppointmentsView.test.tsx`

**Interfaces — Produces:**

```ts
export type OwnerAppointmentsViewMode = 'list' | 'day';
export interface OwnerAppointmentFiltersState {
  view: OwnerAppointmentsViewMode;
  fromDate: string; toDate: string;       // list mode; defaults today … today + 6
  date: string;                           // day mode; default today
  staffMemberId?: string; status?: AppointmentStatus; search: string;
  rangeError: string | null;              // 'Chỉ xem tối đa 42 ngày một lần' when toDate − fromDate + 1 > 42
  listParams: AppointmentListParams | null; // null when rangeError
  dayParams: AppointmentListParams;         // fromDate = toDate = date, pageSize 100
  appointmentId: string | null;           // GUID only
  hasFilters: boolean;                    // anything differs from the defaults
  pageNumber: number; pageSize: number;
  setView, setRange(from, to), setDate(date), setStaff(id | null), setStatus(s | null), setSearch(text),
  setPage(n, opts?), setPageSize(n), openAppointment(id), closeAppointment(), reset()
}
export function useOwnerAppointmentFilters(today?: string): OwnerAppointmentFiltersState;
export function OwnerAppointmentsView(): JSX.Element; // also the action state: useState<{ action: OwnerAppointmentAction; appointment: AppointmentListItem } | null>
```

Built on `useTableSearchParams({ defaultPageSize: 10, pageSizeOptions: [10, 20, 50] })`; filter keys on the URL are `view`, `fromDate`, `toDate`, `date`, `staffMemberId`, `status`, `appointmentId` (plus the hook's own `search`, `page`, `pageSize`). `openAppointment`/`closeAppointment` change the URL with `resetPage: false`. Dates are valid only when they match `^\d{4}-\d{2}-\d{2}$` and round-trip through `addDays(value, 0)`. The search input debounces 300 ms before `setSearch`. The staff `Select` lists `useWorkingStaff()`; it is disabled when that query fails. In day mode the range inputs are replaced by "Hôm trước", "Hôm nay", "Hôm sau" and one date input. In this task the day tab shows only that navigation; Task 8 adds the calendar under it.

Table: columns and breakpoints exactly as the spec's "Chế độ Danh sách" table; `rowActions` = "Xem chi tiết" first, then `ownerAppointmentActions(row.status)` with `ownerActionLabels` ("Hủy lịch" is `variant: 'destructive'`); `onRowClick` → `openAppointment`. If the response has `totalPages > 0` and `pageNumber > totalPages`, call `setPage(totalPages, { replace: true })`.

- [ ] **Step 1: Write the failing tests**
  - Filters hook (BKG-UI-T21), rendered inside a `MemoryRouter`, `today = '2026-11-10'`:
    - no query → `listParams` is `{ fromDate: '2026-11-10', toDate: '2026-11-16', pageNumber: 1, pageSize: 10 }` and `hasFilters` is `false`;
    - `?fromDate=2026-13-40&toDate=x&status=weird&appointmentId=abc` → defaults, `status` undefined, `appointmentId` null;
    - `?fromDate=2026-11-01&toDate=2026-12-31` → `rangeError` is `'Chỉ xem tối đa 42 ngày một lần'`, `listParams` null;
    - `?page=3` then `setStatus('confirmed')` → URL has `status=confirmed` and no `page`;
    - `?view=day&date=2026-11-12&staffMemberId=<guid>` → `dayParams` is `{ fromDate: '2026-11-12', toDate: '2026-11-12', staffMemberId: <guid>, pageNumber: 1, pageSize: 100 }`.
  - View (BKG-UI-T20, T22, T23, T31) with `renderApp('/owner/bookings')` signed in as owner, stubbing `GET /api/v1/appointments` and `GET /api/v1/staff`:
    - heading "Lịch hẹn", tabs "Danh sách" and "Lịch ngày", and the request carries `fromDate`/`toDate` of the default week;
    - rows show customer name, phone, service, staff and the status badge;
    - empty without filters: "Chưa có lịch hẹn nào trong khoảng ngày này."; empty with `?status=confirmed`: "Không có lịch hẹn nào khớp với bộ lọc." and a "Xóa bộ lọc" button;
    - a `500` shows the table error with "Thử lại", and retrying refetches;
    - typing "lan" sends `search=lan` once, after the debounce (fake timers);
    - `GET /staff` failing leaves the table visible and the staff select disabled;
    - a `confirmed` row's menu has "Đổi giờ", "Đổi nhân viên", "Hủy lịch", "Khách không đến" and no "Xác nhận"; a `completed` row's menu has only "Xem chi tiết";
    - `?page=3` with a response of `totalPages: 2` ends on `page=2`;
    - signed in as a customer, `/owner/bookings` lands on `/forbidden`.
- [ ] **Step 2: Run** `npm run test --workspace @spa/web -- src/features/bookings/components/owner` → FAIL.
- [ ] **Step 3: Implement** the hook, toolbar, table, view and page; wire `ownerPages['/owner/bookings'] = <OwnerAppointmentsPage />` in `router.tsx`. The page calls `useDocumentTitle('Lịch hẹn')` and renders `OwnerAppointmentsView`.
- [ ] **Step 4: Run** the tests → PASS; `npm run test --workspace @spa/web -- src/test/app.test.tsx src/app` → still PASS (route table tests).
- [ ] **Step 5: Checkpoint.** Suggest: `git commit -m "feat(web): add owner appointment list with filters (UC-SPA-17)"`.

### Task 4: Detail sheet

**Files:**

- Create: `features/bookings/components/owner/OwnerAppointmentSheet.tsx`
- Modify: `OwnerAppointmentsView.tsx`
- Test: `components/owner/OwnerAppointmentSheet.test.tsx`

**Interfaces — Consumes:** `useOwnerAppointment`, `ownerAppointmentActions`, `allergySeverityBadge`. **Produces:**

```ts
export function OwnerAppointmentSheet(props: {
  appointmentId: string | null;
  onClose: () => void;
  onAction: (action: OwnerAppointmentAction, appointment: AppointmentDetail) => void;
}): JSX.Element;
```

Content and copy: spec, "Chi tiết (`Sheet` bên phải…)". Duration from `durationMinutes(startTime, endTime)`; long date from `formatLongDate`. Footer buttons come from `ownerAppointmentActions(detail.status)` in that order; "Hủy lịch" uses the destructive outline variant. The view opens the sheet from `filters.appointmentId`.

- [ ] **Step 1: Write the failing test** (BKG-UI-T24):
  - `renderApp('/owner/bookings?appointmentId=<guid>')` requests `GET /api/v1/appointments/<guid>` and shows the service name, "Khách có ghi nhận dị ứng" with the allergen and "Vừa", "Buổi 1/10 · Gói phục hồi da 10 buổi", the phone as a `tel:` link, "Hồ sơ da" with "Chưa lập";
  - a `cancelled` detail shows the cancellation reason and no action buttons; a `held` detail shows "Giữ chỗ đến" and "Đang chờ khách thanh toán, chưa thể điều chỉnh";
  - `404 appointment_not_found` shows "Không tìm thấy lịch hẹn" and "Đóng"; a `500` shows "Thử lại";
  - `?appointmentId=not-a-guid` makes no detail request and opens no sheet;
  - clicking a table row adds `appointmentId` to the URL; closing removes it and keeps `page`.
- [ ] **Step 2: Run** the test → FAIL.
- [ ] **Step 3: Implement** the sheet and wire it into the view.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Checkpoint.** Suggest: `git commit -m "feat(web): add owner appointment detail sheet"`.

### Task 5: Confirm, cancel and no-show dialogs

**Files:**

- Create: `components/owner/{OwnerAppointmentActions.tsx,ConfirmAppointmentDialog.tsx,OwnerCancelDialog.tsx,NoShowDialog.tsx}`
- Modify: `OwnerAppointmentsView.tsx`
- Test: `components/owner/OwnerAppointmentActions.test.tsx`

**Interfaces — Produces:**

```ts
export type ActionTarget = Pick<
  AppointmentListItem,
  'id' | 'date' | 'startTime' | 'endTime' | 'status' | 'customer' | 'staff' | 'service'
>;
export function OwnerAppointmentActions(props: {
  current: { action: OwnerAppointmentAction; appointment: ActionTarget } | null;
  onClose: () => void;
}): JSX.Element; // renders the dialog of current.action; Tasks 6 and 7 add their cases
export function ownerActionFailure(error: unknown): {
  close: boolean;
  toast?: string;
  alert?: string;
};
```

`ownerActionFailure` is the one place for the cross-dialog rows of the spec's error table: `status_invalid` → `{ close: true, toast: backend message }`; `not_found` → `{ close: true, toast: 'Không tìm thấy lịch hẹn' }`; `network` and 5xx → `{ close: false, toast: 'Không kết nối được máy chủ' }`; anything else → `{ close: false, alert: backend message ?? 'Đã có lỗi xảy ra, vui lòng thử lại.' }`. Each dialog handles its own codes first (cancel and no-show: `validation` → field error; no-show: `no_show_too_early` → `Alert` with the backend message), then falls back to it. Copy, titles and success toasts: spec, "Hành động" table. The no-show description is chosen by `catalogPolicies.noShowConsumesEntitlement`.

- [ ] **Step 1: Write the failing test** (BKG-UI-T25, T28, T29), driving the menu of a row in `renderApp('/owner/bookings')`:
  - "Xác nhận" on a `pending_confirmation` row opens "Xác nhận lịch hẹn này?"; confirming sends `POST …/confirm` once even on a double click, toasts "Đã xác nhận lịch hẹn" and refetches the list;
  - confirm answering `409 appointment_status_invalid` closes the dialog, shows the backend message and refetches;
  - "Hủy lịch": submitting empty shows "Vui lòng nhập lý do hủy." and sends nothing; 501 characters shows "Lý do hủy tối đa 500 ký tự."; `'  Khách bận  '` sends `{ reason: 'Khách bận' }`, toasts "Đã hủy lịch hẹn";
  - "Khách không đến": submitting with no note sends `{}`; `400 no_show_too_early` keeps the dialog open with the backend message; success toasts "Đã ghi nhận khách không đến";
  - a network failure (fetch rejects) keeps the dialog and the typed reason, toasts "Không kết nối được máy chủ".
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.** Forms use React Hook Form + `zodResolver` with `FormField` + `Textarea`; submit buttons use `loading`.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Checkpoint.** Suggest: `git commit -m "feat(web): add confirm, cancel and no-show dialogs for owner appointments"`.

### Task 6: Reschedule dialog

**Files:**

- Create: `components/owner/OwnerRescheduleDialog.tsx`
- Modify: `components/StaffSlotPicker.tsx` (new optional prop `fixedStaffId?: string`: when set, there is no staff step and no "Kỹ thuật viên bất kỳ"; picking a time calls `onSelect({ startTime, staffMemberId: fixedStaffId })`; the empty text is taken from a new optional prop `emptyText`), `OwnerAppointmentActions.tsx`
- Test: `components/owner/OwnerRescheduleDialog.test.tsx`

**Interfaces — Consumes:** `useAvailability({ appointmentId }, date, staffMemberId)`, `useOwnerReschedule`, `DateStrip`, `ownerActionFailure`. **Produces:** `OwnerRescheduleDialog({ appointment: ActionTarget | null, onClose })`.

Date strip from `vietnamNow().date` to `+ catalogPolicies.maxBookingDaysAhead`, starting on the appointment's date when it is inside that range, else today. Sub-line: "Lịch giữ nguyên nhân viên {tên} và thời lượng {n} phút. Muốn đổi người, dùng Đổi nhân viên." Empty day: "Nhân viên này không còn giờ trống trong ngày đã chọn." Errors: `slot_taken` → `Alert` with the backend message, clear the pick, refetch slots; `in_past` → toast the backend message, clear, refetch; the rest through `ownerActionFailure`.

- [ ] **Step 1: Write the failing test** (BKG-UI-T26):
  - opening requests `GET /api/v1/availability` with `appointmentId=<id>`, `staffMemberId=<current staff id>`, `date`, and no `spaServiceId`;
  - no "Kỹ thuật viên bất kỳ" is rendered; the button "Xác nhận đổi giờ" is disabled until a time is picked;
  - picking 14:00 on another day sends `POST …/reschedule` with exactly `{ date, startTime: '14:00' }`, toasts "Đã đổi giờ hẹn" and closes;
  - `409 customer_busy` shows the backend message in the dialog, clears the pick and requests availability again;
  - `400 appointment_in_past` toasts the backend message;
  - availability failing shows "Không tải được giờ trống" with "Thử lại"; a day with no slots shows the empty text above.
  - Existing customer behaviour: a `StaffSlotPicker` without `fixedStaffId` still renders the any-staff choice (one assertion).
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Checkpoint.** Suggest: `git commit -m "feat(web): add owner reschedule dialog"`.

### Task 7: Assign-staff dialog

**Files:**

- Create: `components/owner/AssignStaffDialog.tsx`
- Modify: `OwnerAppointmentActions.tsx`
- Test: `components/owner/AssignStaffDialog.test.tsx`

**Interfaces — Consumes:** `useWorkingStaff(appointment.service.id)`, `useAvailability({ appointmentId }, appointment.date)`, `useAssignAppointmentStaff`. **Produces:** `AssignStaffDialog({ appointment: ActionTarget | null, onClose })` and the pure helper

```ts
/** Staff ids with a free slot starting exactly at the appointment's start time. */
export function freeStaffAt(
  availability: Availability | undefined,
  startTime: string,
): ReadonlySet<string>;
```

A `radiogroup` of the skilled working staff: those in `freeStaffAt` first with the badge "Rảnh giờ này", then the rest, each group by name; the current staff member has "Đang phụ trách" and is disabled. The availability query is a hint only: while it loads or when it fails, no badge is shown and everyone stays selectable. Button "Xác nhận đổi nhân viên". Errors: `staff` kind with code `staff_not_qualified` → `Alert` "Nhân viên này không thực hiện được dịch vụ của lịch hẹn. Hãy chọn người khác." and refetch the list; `staff_not_found` → `Alert` "Không tìm thấy nhân viên này" and refetch; `staff_unavailable` → `Alert` backend message + " Hãy chọn người khác.", keep open, refetch availability; `in_past` → toast the backend message; the rest through `ownerActionFailure`. Distinguish the two `staff` codes by `error.errors[0]?.code` against `appointmentErrorCodes`.

- [ ] **Step 1: Write the failing test** (BKG-UI-T27):
  - `freeStaffAt` returns only staff having a slot with `startTime === '14:00'`; `undefined` availability gives an empty set;
  - the dialog requests `GET /api/v1/staff` with `spaServiceId=<service id>`, `status=working`, `pageSize=100`;
  - the current staff member's radio is disabled and labelled "Đang phụ trách"; a free staff member is listed first with "Rảnh giờ này";
  - availability answering `400` still lists the staff, without badges;
  - choosing a staff member sends `{ staffMemberId }`, toasts "Đã đổi nhân viên", closes;
  - `409 staff_busy` keeps the dialog open with the backend message and "Hãy chọn người khác."; `400 staff_not_qualified` shows the fixed message;
  - only the current staff member in the list → "Không có nhân viên nào khác thực hiện được dịch vụ này."
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Checkpoint.** Suggest: `git commit -m "feat(web): add assign-staff dialog for owner appointments"`.

### Task 8: Day calendar (no drag yet)

**Files:**

- Create: `components/owner/{dayGrid.ts,DayCalendar.tsx,DayCalendarCard.tsx}`
- Modify: `OwnerAppointmentsView.tsx`, `OwnerAppointmentFilters.tsx` (day navigation)
- Test: `components/owner/dayGrid.test.ts`, `components/owner/DayCalendar.test.tsx`

**Interfaces — Produces:**

```ts
// dayGrid.ts (pure; times are 'HH:mm', minutes are from 00:00)
export const toMinutes: (time: string) => number;
export const fromMinutes: (minutes: number) => string;
export interface DayColumn {
  staffId: string;
  fullName: string;
  appointments: readonly AppointmentListItem[];
}
/** Working staff (by name) plus staff that only appear in appointments; with staffFilter only that column. */
export function buildColumns(
  staff: readonly { id: string; fullName: string }[],
  appointments: readonly AppointmentListItem[],
  staffFilter?: string,
): DayColumn[];
/** Appointments drawn on the grid (not cancelled, not hold_expired) and the rest, both in server order. */
export function splitByGrid(appointments: readonly AppointmentListItem[]): {
  onGrid: AppointmentListItem[];
  cancelled: AppointmentListItem[];
};
/** Grid range: policy start/end widened to whole steps so every onGrid appointment fits. */
export function gridRange(
  onGrid: readonly AppointmentListItem[],
  start: string,
  end: string,
  step: number,
): { startMinutes: number; endMinutes: number; slots: string[] };
/** Row placement by minute (1 row = 5 minutes) and a lane when cards of one column overlap. */
export function placeCard(
  appointment: AppointmentListItem,
  column: readonly AppointmentListItem[],
  startMinutes: number,
): { rowStart: number; rowSpan: number; lane: number; laneCount: number };

// DayCalendar.tsx
export function DayCalendar(props: {
  date: string;
  today: { date: string; time: string };
  query: {
    data?: PagedResponse<AppointmentListItem>;
    isLoading: boolean;
    isError: boolean;
    isFetching: boolean;
    refetch: () => void;
  };
  staff: readonly { id: string; fullName: string }[];
  staffFilter?: string;
  onOpen: (appointmentId: string) => void;
  onDropCommand?: (appointment: AppointmentListItem, command: DropCommand) => void; // Task 9
  busyAppointmentId?: string | null; // Task 9
}): JSX.Element;
```

Layout: one scroll container (`overflow-auto`, bounded height) holding a CSS grid: a sticky left time column, one column per `DayColumn` with a fixed minimum width, a sticky header row ("{tên}" and "{n} lịch"), background rows every 30 minutes labelled from `gridRange.slots`, cards placed with `gridRow` from `placeCard` (lanes split the column width). The now-line shows only when `date === today.date` and the time is inside the range. Card: `startTime – endTime`, customer, service, `StatusBadge`; it is a `button` that calls `onOpen`. Under the grid: a collapsed `details`-style section "Lịch đã hủy trong ngày ({n})" (use the shadcn `collapsible` primitive, added with the CLI) with one row per cancelled appointment, also opening the sheet; hidden when `n` is 0. States and copy: spec, "Trạng thái" → Lịch ngày, plus the `Alert` when `totalCount > 100`.

- [ ] **Step 1: Write the failing tests**
  - `dayGrid.test.ts`:
    - `placeCard` for 14:15 – 15:30 with `startMinutes = 480` gives `rowStart` 76 (1-based: (855 − 480) / 5 + 1) and `rowSpan` 15;
    - two overlapping appointments of one column get `lane` 0 and 1 with `laneCount` 2; a third that overlaps neither gets `laneCount` 1;
    - `gridRange` with an 07:15 – 08:00 appointment starts at 07:00 (420); with one ending 21:10 ends at 21:30; with none, 480 … 1200 and `slots[0] === '08:00'`, last slot `'19:30'`;
    - `buildColumns` puts working staff by name, appends a staff member found only in appointments, and with `staffFilter` returns one column;
    - `splitByGrid` sends `cancelled` and `hold_expired` to `cancelled`.
  - `DayCalendar.test.tsx` (BKG-UI-T30) via `renderApp('/owner/bookings?view=day&date=2026-11-12')`:
    - the request has `fromDate=2026-11-12`, `toDate=2026-11-12`, `pageSize=100`;
    - a column header exists for a working staff member with no appointments ("0 lịch");
    - "Hôm sau" changes the URL to `date=2026-11-13`; "Hôm nay" returns to today's Vietnam date;
    - cancelled appointments are not in the grid but under "Lịch đã hủy trong ngày (1)";
    - clicking a card opens the sheet (`appointmentId` on the URL);
    - no appointments: columns stay and "Không có lịch hẹn nào trong ngày này" shows; a `500` shows "Thử lại"; `totalCount: 120` shows the 100-appointment alert.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Checkpoint.** Suggest: `git commit -m "feat(web): add owner day calendar by staff"`.

### Task 9: Drag and drop on the day calendar

**Files:**

- Modify: `apps/web/package.json` + root `package-lock.json` (via `npm install @dnd-kit/core --workspace @spa/web`), `components/owner/{dayGrid.ts,DayCalendar.tsx,DayCalendarCard.tsx}`, `OwnerAppointmentsView.tsx`
- Create: `components/owner/DropConfirmDialog.tsx`
- Test: `components/owner/dayGrid.test.ts` (extend), `components/owner/DayCalendarDrop.test.tsx`

**Interfaces — Produces:**

```ts
// dayGrid.ts
export type DropTarget = { staffId: string; startTime: string };
export type DropCommand =
  { kind: 'reschedule'; startTime: string } | { kind: 'assign_staff'; staffMemberId: string };
export const dropId: (target: DropTarget) => string; // `${staffId}|${startTime}`
export const parseDropId: (id: string) => DropTarget | null;
export const isDraggable: (status: AppointmentStatus) => boolean; // pending_confirmation, confirmed
/**
 * Another column → assign_staff (the time is ignored: one drop changes one thing).
 * Same column, another start → reschedule, unless start + duration would pass 24:00. Otherwise null.
 */
export function resolveDrop(
  appointment: AppointmentListItem,
  target: DropTarget | null,
): DropCommand | null;

// DropConfirmDialog.tsx
export function DropConfirmDialog(props: {
  pending: {
    appointment: AppointmentListItem;
    command: DropCommand;
    targetStaffName?: string;
  } | null;
  onClose: () => void;
}): JSX.Element;
```

Wiring: `DayCalendar` wraps the grid in `DndContext` (sensors: `PointerSensor` with a 6 px activation distance, `KeyboardSensor`; collision `pointerWithin`). Every 30-minute cell of every column is a droppable with `dropId`. A draggable card exposes a grip handle button (`aria-label` "Kéo để đổi giờ hoặc nhân viên cho lịch của {khách}"); the card body stays a click target. `DragOverlay` shows the card with the label of the prospective result: the new `start – end` for a reschedule, the original time for another column. `onDragEnd` → `resolveDrop(appointment, parseDropId(over?.id))` → `onDropCommand`. Dragging is disabled below `md` (a `matchMedia('(min-width: 768px)')` check; `src/test/setup.ts` polyfills `matchMedia`, so tests set it to match) and while `busyAppointmentId` is set. Vietnamese `accessibility.announcements` as in the spec.

`DropConfirmDialog` (an `AlertDialog`): title "Đổi giờ hẹn?" with "{khách} · {dịch vụ}: {giờ cũ} → {giờ mới}, nhân viên {tên}", or "Đổi nhân viên?" with "{khách} · {dịch vụ} lúc {giờ}: {nhân viên cũ} → {nhân viên mới}". Confirm runs `useOwnerReschedule` (`{ date: appointment.date, startTime }`) or `useAssignAppointmentStaff`. No optimistic update. Success: toast "Đã đổi giờ hẹn" / "Đã đổi nhân viên". **Any** error: close, toast `errorMessageOf(error) ?? 'Không kết nối được máy chủ'`; the mutation's `onSettled` already refetches the day.

- [ ] **Step 1: Write the failing tests**
  - `dayGrid.test.ts` (BKG-UI-T32), for an appointment of staff `s1`, 09:00 – 10:00:
    - target `{ s1, '14:00' }` → `{ kind: 'reschedule', startTime: '14:00' }`;
    - target `{ s2, '14:00' }` → `{ kind: 'assign_staff', staffMemberId: 's2' }`;
    - target `{ s1, '09:00' }` → `null`; target `null` → `null`;
    - a 90-minute appointment dropped at `'23:00'` in its own column → `null`;
    - `isDraggable` is true only for `pending_confirmation` and `confirmed`; `parseDropId(dropId(t))` round-trips and `parseDropId('x')` is `null`.
  - `DayCalendarDrop.test.tsx` (BKG-UI-T33). Mock `@dnd-kit/core` with `vi.mock` so `DndContext` records its `onDragEnd` and renders children, `useDraggable`/`useDroppable` return inert refs and `DragOverlay` renders nothing; fire drops by calling the recorded `onDragEnd({ active: { id }, over: { id: dropId(target) } })`:
    - a `completed` card has no grip handle; a `confirmed` card has one;
    - a same-column drop opens "Đổi giờ hẹn?" naming the old and new time; "Quay lại" sends nothing;
    - confirming sends `POST …/reschedule` with `{ date: '2026-11-12', startTime: '14:00' }`, toasts "Đã đổi giờ hẹn", and the day is requested again;
    - a drop on another column opens "Đổi nhân viên?" and confirming sends `POST …/assign-staff` with `{ staffMemberId }`;
    - `409 slot_unavailable`, `409 staff_not_on_shift` and `400 appointment_in_past` each close the dialog and show the backend message as a toast, with the day requested again and no reschedule or assign dialog opened;
    - a drop on the card's own cell opens nothing.
- [ ] **Step 2: Run** → FAIL. **Step 3: Install the dependency and implement.** **Step 4: Run** → PASS; `npm run typecheck` clean.
- [ ] **Step 5: Checkpoint.** Suggest: `git commit -m "feat(web): drag and drop to reschedule or reassign on the day calendar"`.

### Task 10: Docs and verification

**Files:**

- Modify: `docs/frontend.md` (new section "Quản lý lịch hẹn của chủ spa (UC-SPA-17)": page, feature files, URL keys, drag-and-drop rules, constants copied from the backend, the `@dnd-kit/core` dependency; the route line `/owner/bookings` stays), `docs/progress.md` (UC-SPA-17 Web `—` → `✅` with a short note and the date), `docs/specs/bookings.md` (header "Trạng thái triển khai": add the web date and this plan's link), `apps/web/src/features/bookings/README.md` (owner part)

- [ ] **Step 1: Update the docs** listed above. `src/app/routes.ts` needs no change (the route exists).
- [ ] **Step 2: Run** from the repo root: `npm run format`, then `npm run lint`, `npm run typecheck`, `npm run test`, `npm run format:check`, `npm run web:build`. Expected: all exit 0. Report any failure with its output.
- [ ] **Step 3: Manual check** with `npm run db:up`, `npm run db:seed:demo`, `npm run dev`, signed in as the owner at `/owner/bookings`:
  - list: loading, error (stop the API), empty (a status with no rows), data; filters survive reload and back/forward;
  - each command once, including a refused one (no-show before the start time; reschedule into a busy slot);
  - day view: drag within a column, drag to another column, drop outside a shift (backend message appears, card returns), keyboard drag (Space, arrows, Space);
  - 320 px, tablet and desktop widths; no horizontal page scroll; dark mode; focus returns after closing a dialog.
- [ ] **Step 4: Checkpoint.** Suggest: `git commit -m "docs: record owner appointments web (UC-SPA-17)"`, and report what was verified and what was not.

# My appointments: list, reschedule, cancel (UC-SPA-16) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Backend for a customer to list their appointments by tab, reschedule one (any staff allowed) and cancel one with a reason, both at least 24 hours before the visit, plus free slots for rescheduling.

**Architecture:** No schema change. A pure `AppointmentChangePolicy` decides status + 24 h cutoff for both the commands and the `canReschedule`/`canCancel` flags. A new `MyAppointmentService` (list, reschedule, cancel) reuses `BookingSlotReserver` (new `excludeAppointmentId`) under the existing lock order appointment → staff → customer. Package-session reschedules keep package order through a new `NextVisit` in `SessionBookingFacts` and `EntitlementEligibility.EnsureSessionReschedule`. `GET /availability` accepts a customer's own `appointmentId` instead of a source.

**Tech Stack:** .NET 9, EF Core 9 + Npgsql, PostgreSQL 17, FluentValidation, xUnit + NSubstitute + FluentAssertions, Testcontainers.

**Spec:** `docs/specs/bookings.md`, section "UC-SPA-16 — Xem và quản lý lịch hẹn (đợt 3)", BR-BKG-07, 16, 17, 18, BKG-T50…T67, Q-04, Q-41, Q-42. Approved 2026-11-01 as written; reschedules are unlimited (BKG-LATER-08 stays deferred, no column).

## Global Constraints

- Names from the glossary: `Appointment`, folder `Bookings` (`UseCases/Bookings`, `DTOs/Bookings`, `Validators/Bookings`, `Interfaces/Services/Bookings`). Routes exactly: `GET /api/v1/me/appointments`, `POST /api/v1/me/appointments/{id}/reschedule`, `POST /api/v1/me/appointments/{id}/cancel`; `GET /api/v1/availability` gains the customer `appointmentId` mode. Messages in Vietnamese with diacritics.
- Policy: existing `Permissions.AppointmentSelf` (`appointment.self` → customer). No new permission.
- Error codes. Reused: `validation_error`, `appointment_not_found` (404), `appointment_status_invalid` (409, `BookingErrors.StatusInvalid`), `appointment_in_past`, `slot_unavailable`, `customer_busy`, `outside_work_schedule`, `staff_not_qualified`, `staff_not_found`, `entitlement_not_eligible`, `session_too_early`. New in `BookingErrors`:
  - `change_window_passed` (400, `BusinessRuleException`): `$"Chỉ được đổi hoặc hủy lịch trước giờ hẹn ít nhất {hours} giờ. Vui lòng liên hệ spa để được hỗ trợ."`; when `hours == 0`: `"Lịch hẹn đã bắt đầu, không thể đổi hoặc hủy. Vui lòng liên hệ spa để được hỗ trợ."`
  - `session_too_late` (400, `BusinessRuleException`): `$"Buổi này phải diễn ra trước ngày {latest:dd/MM/yyyy} để giữ thứ tự với buổi sau."` (when the clash is on the latest day itself because of the time, the same message with that day).
- Config (no `.env` variable): `Booking:CustomerChangeCutoffHours` = `24` in `appsettings.json`; `BookingOptions.IsValid` accepts 0–168.
- Cutoff rule (BR-BKG-07): changeable statuses are `PendingConfirmation`, `Confirmed` (`Appointment.CanBeManaged`); allowed when `SpaTime.ToLocal(nowUtc) <= date.ToDateTime(start) - cutoffHours`, and for `cutoffHours == 0` additionally `now < start`. Status is checked first (409), then cutoff (400). The new slot only has to be in the future (no cutoff).
- List scopes (BR-BKG-17): `upcoming` = Held, PendingConfirmation, Confirmed ordered by `Date, StartTime, Id` ascending; `past` = Completed, NoShow; `cancelled` = Cancelled, HoldExpired; `past`, `cancelled` and no scope ordered `Date desc, StartTime desc, Id`. `status` filters further (a status outside the scope gives an empty page, not an error). `fromDate`/`toDate` optional, `fromDate <= toDate`. Paging is `PagedQuery` (1/10, max 100), query names `pageNumber`, `pageSize`.
- Reschedule: body `{ date, startTime, staffMemberId? }`; null staff = any staff (Q-26, `least_busy`); duration kept (`EndTime - StartTime`), status kept. Same date + start and (`staffMemberId` null or equal to the current one) → 200 with no write (A4).
- Cancel: body `{ reason }` reusing `CancelAppointmentRequest` + its validator (trimmed, 1–500). Gives back the entitlement (`booked → available`) or session (`booked → not_booked`); never refunds; does not check package/plan state.
- Held appointments: customer cannot reschedule or cancel (Q-41) → `409 appointment_status_invalid`.
- Lock order in one `IUnitOfWork.ExecuteInTransactionAsync`: `IAppointmentRepository.GetForUpdateAsync` (appointment row) → `BookingSlotReserver` (staff rows by id, then customer row). Someone else's appointment → `404 appointment_not_found` (BR-SEC-01), checked right after the lock.
- Do not change behaviour of finished UCs: owner `GET /availability?spaServiceId&appointmentId`, UC-SPA-15 booking, UC-SPA-17 commands stay as they are. All existing tests pass; `PersistenceModelTests` passes (no migration).
- DI through constructors into `private readonly` fields; Application references neither ASP.NET Core nor EF Core.
- TDD: unit tests with NSubstitute + fixed clock (`IDateTimeProvider`); integration tests with `PostgresFixture` + `AuthApiFactory` (`TestClock.Offset`), helpers `BookingApi`, `CustomerBookingApi`, `PurchaseApi`.
- Docs: `docs/progress.md`, glossary, `open-questions.md` (Q-04 note, Q-41, Q-42), `data_api.py` (edit rows 061, 064, 066, 067 in place, no new rows), `data_rules.py` (rewrite BR-BKG-07, add BR-BKG-16…18), regenerate Excel, Postman (`backend/postman/generate_collection.py`), root + `backend/CLAUDE.md` booking paragraph, spec status line.
- The user runs git: no commits or pushes; each "Checkpoint" = build + the task's tests. No Co-Authored-By or "Generated with" lines anywhere.

## Review Focus

- Reschedule into a slot that overlaps only the appointment's own current time with a **different** staff member (09:00 with A → 09:30 with B): the customer-busy check must ignore the appointment itself, or the customer gets a false `409 customer_busy` → Task 5 test `RescheduleToOtherStaffOverlappingOwnSlotSucceeds`.
- "Any staff" reschedule where the current staff member is the only free one at the new time: the current staff's own appointment must not count as busy for the pick → Task 3 test `ReserveExcludesOwnAppointmentForAnyStaff`.
- Cutoff exactly at the boundary (now = start − 24 h to the minute) must be allowed, one minute later refused; VN time, not UTC → Task 1 tests `CutoffBoundaryIsInclusive`, `CutoffUsesVietnamTime`.
- A book-now appointment that became `confirmed` after payment has both `order_item_id` and `service_entitlement_id`; cancelling must give the entitlement back (not leave it `booked`) → Task 5 test `CancelPaidBookNowReleasesEntitlement` + Task 7 BKG-T53.
- Rescheduling session 2 on the same day as session 3's visit, ending after session 3 starts, when the gap is 0: must be `400 session_too_late`, not a silent overlap with the package order → Task 2 test `SameDayAsNextVisitMustEndBeforeItStarts`.

---

### Task 1: Change policy, options, errors, domain release

**Files:**

- Modify: `backend/src/Application/Common/Options/BookingOptions.cs`, `backend/src/API/appsettings.json` (`"Booking": { …, "CustomerChangeCutoffHours": 24 }`)
- Modify: `backend/src/Application/Common/SpaTime.cs` (add `ToUtc`)
- Modify: `backend/src/Application/UseCases/Bookings/BookingErrors.cs`
- Create: `backend/src/Application/UseCases/Bookings/AppointmentChangePolicy.cs`
- Modify: `backend/src/Domain/Entities/Appointment.cs`; `backend/src/Application/UseCases/Bookings/AppointmentManagementService.cs` (replace private `Release` with the domain method)
- Test: `backend/tests/Application.Tests/Bookings/AppointmentChangePolicyTests.cs`, `backend/tests/Application.Tests/Bookings/BookingOptionsTests.cs`, `backend/tests/Domain.Tests/Bookings/AppointmentTransitionTests.cs`

**Interfaces — Produces:**

- `BookingOptions.CustomerChangeCutoffHours: int` (default 24, valid 0–168).
- `SpaTime.ToUtc(DateTime local): DateTime` (inverse of `ToLocal`, Kind = Utc).
- `BookingErrors.ChangeWindowPassedCode = "change_window_passed"`, `BookingErrors.ChangeWindowPassed(int hours): BusinessRuleException`; `BookingErrors.SessionTooLateCode = "session_too_late"`, `BookingErrors.SessionTooLate(DateOnly latest): BusinessRuleException` (messages in Global Constraints).
- `Appointment.ReleaseBookedSource()`: `ServiceEntitlement?.Release(); TreatmentSession?.Release();` (BR-BKG-10).
- `public static class AppointmentChangePolicy`:
  - `DateTime? DeadlineUtc(AppointmentStatus status, DateOnly date, TimeOnly start, int cutoffHours)` → null when status not `PendingConfirmation|Confirmed`, else `SpaTime.ToUtc(date.ToDateTime(start).AddHours(-cutoffHours))`.
  - `bool CanChange(AppointmentStatus status, DateOnly date, TimeOnly start, DateTime nowUtc, int cutoffHours)`.
  - `void EnsureCanChange(AppointmentStatus status, DateOnly date, TimeOnly start, DateTime nowUtc, int cutoffHours)` → `StatusInvalid(status)` then `ChangeWindowPassed(cutoffHours)`.
  - `bool SourceAllowsReschedule(AppointmentChangeFacts facts, DateTime nowUtc)` → false when plan `Paused|Cancelled`, package not effectively `Active` (`PurchaseStatus.Effective`), or entitlement `ExpiresAtUtc <= nowUtc`.
- `public sealed record AppointmentChangeFacts(AppointmentStatus Status, DateOnly Date, TimeOnly StartTime, TreatmentPlanStatus? PlanStatus, CustomerPackageStatus? PackageStatus, DateTime? PackageExpiresAtUtc, DateTime? EntitlementExpiresAtUtc)` in `DTOs/Bookings/AppointmentChangeFacts.cs`.

- [ ] **Step 1: Write the failing tests**

`AppointmentChangePolicyTests` (visit 2026-11-05 10:00 VN, cutoff 24):

- `ConfirmedWithTwentyFiveHoursLeftCanChange`: now = 2026-11-04 09:00 VN → `CanChange` true.
- `CutoffBoundaryIsInclusive`: now = 2026-11-04 10:00 VN → true; 10:01 → false.
- `CutoffUsesVietnamTime`: now = `2026-11-04 02:59Z` (09:59 VN) → true; `03:01Z` → false.
- `ZeroCutoffAllowsUntilStart`: cutoff 0, now 09:59 VN → true; 10:00 → false.
- `OnlyPendingAndConfirmedCanChange` (theory over all 7 statuses): true only for PendingConfirmation, Confirmed.
- `EnsureChecksStatusBeforeWindow`: Completed with 1 h left → `ConflictException` code `appointment_status_invalid`; Confirmed with 23 h → `BusinessRuleException` code `change_window_passed`, message contains `"24 giờ"`.
- `DeadlineIsStartMinusCutoffInUtc`: → `2026-11-04 03:00Z`; Held → null.
- `PausedPlanBlocksRescheduleOnly`: facts with `PlanStatus = Paused` → `SourceAllowsReschedule` false; expired package (`Active`, expires yesterday) → false; entitlement expired → false; plain entitlement (nulls) → true.

`BookingOptionsTests`: `CustomerChangeCutoffHours` −1 and 169 invalid, 0 and 168 valid.
`AppointmentTransitionTests.ReleaseBookedSourceReleasesEntitlementAndSession`: booked entitlement → Available; booked session → NotBooked.

- [ ] **Step 2: Run to verify they fail**

Run: `dotnet test backend/NhuNguyetSpa.sln --filter "FullyQualifiedName~AppointmentChangePolicyTests|FullyQualifiedName~BookingOptionsTests|FullyQualifiedName~AppointmentTransitionTests"`
Expected: build errors (types/members missing).

- [ ] **Step 3: Implement the Produces items**

`AppointmentManagementService.CancelAsync` / `MarkNoShowAsync` call `appointment.ReleaseBookedSource()`; delete the private `Release`.

- [ ] **Step 4: Run to verify they pass**

Same command → PASS; then `dotnet test backend/NhuNguyetSpa.sln --filter "FullyQualifiedName~Application.Tests"` → PASS.

- [ ] **Step 5: Checkpoint** — `dotnet build backend/NhuNguyetSpa.sln` clean.

---

### Task 2: Package-session reschedule window

**Files:**

- Modify: `backend/src/Application/UseCases/Bookings/SessionBookingFacts.cs`, `EntitlementEligibility.cs`
- Modify: `backend/src/Infrastructure/Repositories/PurchaseRepository.cs` (`FactsAsync`)
- Test: `backend/tests/Application.Tests/Bookings/EntitlementEligibilityTests.cs`, `backend/tests/IntegrationTests/Bookings/CustomerBookingRepositoryTests.cs`

**Interfaces — Produces:**

- `public sealed record NextVisit(DateOnly Date, TimeOnly StartTime, int MinDaysBetweenSessions);` (in `SessionBookingFacts.cs`). `MinDaysBetweenSessions` = gap of the **next** session's service from the package's current configuration (0 when the line is gone).
- `SessionBookingFacts` gains a last positional parameter `NextVisit? Next = null` (existing constructor calls keep compiling).
- `PurchaseRepository.FactsAsync` fills `Next` from the session with `SequenceNumber + 1`: its earliest appointment in `PendingConfirmation|Confirmed|Completed|NoShow` ordered by `Date, StartTime`.
- `public sealed record SessionWindow(DateOnly Earliest, DateOnly? Latest);`
- `EntitlementEligibility.RescheduleWindow(SessionBookingFacts facts, DateTime nowUtc): SessionWindow` — `Earliest` as `ForSession`; `Latest = Next.Date.AddDays(-Next.MinDaysBetweenSessions)` or null.
- `EntitlementEligibility.EnsureSessionReschedule(SessionBookingFacts facts, DateOnly date, TimeOnly start, TimeOnly end, DateTime nowUtc)`:
  1. package not effectively Active → `EntitlementNotEligible("Gói đã hết hạn hoặc không còn sử dụng.")`; plan Paused/Cancelled → `EntitlementNotEligible("Liệu trình đang tạm dừng hoặc đã hủy.")` (session status is not checked — it is `Booked` by this appointment);
  2. before earliest, or same day as `Previous` and `start < Previous.EndTime` → `SessionTooEarly`;
  3. after latest, or `date == Next.Date` and `end > Next.StartTime` → `SessionTooLate(latest ?? date)`;
  4. Q-30 expiry as in `EnsureSessionSlot`.

- [ ] **Step 1: Write the failing tests**

`EntitlementEligibilityTests` (session 2, previous visit D 09:00–10:00, gap 7, next visit D+20 09:00 with gap 7, package expires D+40):

- `RescheduleBeforeEarliestIsTooEarly`: D+3 → `session_too_early`.
- `RescheduleOnEarliestAndLatestIsAllowed`: D+7 and D+13 → no throw.
- `RescheduleAfterLatestIsTooLate`: D+14 → `session_too_late`, message contains `(D+13):dd/MM/yyyy`.
- `SameDayAsNextVisitMustEndBeforeItStarts`: next gap 0, next D+20 09:00; reschedule D+20 08:00–09:00 → ok; 08:30–09:30 → `session_too_late`.
- `RescheduleWhenPlanPausedIsNotEligible`, `RescheduleAfterPackageExpiryIsNotEligible` → `entitlement_not_eligible`.
- `BookedSessionCanBeRescheduled`: `Status = Booked` → no throw.
- `WindowWithoutNextHasNoLatest`.

`CustomerBookingRepositoryTests.SessionFactsIncludeNextVisit`: seed a package of 3 sessions (`PurchaseApi.SeedPackageAsync`), book sessions 1–3 with appointments; facts of session 2 → `Next.Date` = session 3's date, `Next.MinDaysBetweenSessions` = configured gap; session 3 → `Next` null.

- [ ] **Step 2: Run to verify they fail** — `dotnet test backend/NhuNguyetSpa.sln --filter "FullyQualifiedName~EntitlementEligibilityTests|FullyQualifiedName~SessionFactsIncludeNextVisit"` → build errors.
- [ ] **Step 3: Implement the Produces items.**
- [ ] **Step 4: Run to verify they pass** — same command → PASS (Docker running).
- [ ] **Step 5: Checkpoint** — build + `FullyQualifiedName~Bookings` tests PASS.

---

### Task 3: Reserver excludes the appointment; reader with flags

**Files:**

- Modify: `backend/src/Application/UseCases/Bookings/BookingSlotReserver.cs`
- Modify: `backend/src/Application/DTOs/Bookings/MyAppointmentDto.cs`
- Create: `backend/src/Application/UseCases/Bookings/MyAppointmentReader.cs`
- Modify: `backend/src/Application/Interfaces/Repositories/IAppointmentRepository.cs`, `backend/src/Infrastructure/Repositories/AppointmentRepository.cs` (`GetMineAsync`)
- Modify: `backend/src/Application/UseCases/Bookings/CustomerBookingService.cs` (use the reader), `backend/src/Application/DependencyInjection.cs` (register `MyAppointmentReader` scoped, like `BookingSlotReserver`)
- Test: `backend/tests/Application.Tests/Bookings/BookingSlotReserverTests.cs`, `backend/tests/Application.Tests/Bookings/MyAppointmentReaderTests.cs`, `backend/tests/Application.Tests/Bookings/CustomerBookingServiceTests.cs` (constructor update only)

**Interfaces — Produces:**

- `BookingSlotReserver.ReserveAsync(..., Guid? staffMemberId, CancellationToken cancellationToken, Guid? excludeAppointmentId = null)`: passes `excludeAppointmentId` to `GetOccupyingForStaffOnAsync` and `GetCustomerOccupyingOnAsync`.
- `MyAppointmentDto` gains `init` properties (not positional): `public bool CanReschedule { get; init; }`, `public bool CanCancel { get; init; }`, `public DateTime? ChangeDeadlineAtUtc { get; init; }`.
- `public sealed record MyAppointmentRow(MyAppointmentDto Appointment, AppointmentChangeFacts Facts);` (`DTOs/Bookings`).
- `IAppointmentRepository.GetMineAsync(Guid id, Guid customerId, CancellationToken)` now returns `Task<MyAppointmentRow?>`; facts read `TreatmentSession.TreatmentPlan.Status`, `…CustomerPackage.Status/ExpiresAtUtc`, `ServiceEntitlement.ExpiresAtUtc`.
- `public sealed class MyAppointmentReader` (ctor: `IAppointmentRepository`, `IDateTimeProvider`, `IOptions<BookingOptions>`):
  - `Task<MyAppointmentDto> GetAsync(Guid id, Guid customerId, CancellationToken)` → `AppointmentNotFound` when null; returns `With(row)`.
  - `MyAppointmentDto With(MyAppointmentRow row)` / and a generic `(bool CanReschedule, bool CanCancel, DateTime? DeadlineUtc) Flags(AppointmentChangeFacts facts)` used by the list in Task 4: `CanCancel = CanChange(...)`, `CanReschedule = CanCancel && SourceAllowsReschedule(...)`, `DeadlineUtc = DeadlineUtc(...)`.
- `CustomerBookingService` takes `MyAppointmentReader` instead of calling `_appointments.GetMineAsync`; `GetAsync` = `_reader.GetAsync(id, CustomerId, ct)`.

- [ ] **Step 1: Write the failing tests**

`BookingSlotReserverTests`:

- `ReserveExcludesOwnAppointmentForAnyStaff`: `excludeAppointmentId = X` → both repository calls receive `X` (NSubstitute `Received`), and a slot free only because X is excluded is returned.
- `ReserveWithoutExcludePassesNull` (regression).

`MyAppointmentReaderTests` (clock 2026-11-04 09:00 VN, visit 2026-11-05 10:00):

- `ConfirmedBeforeCutoffHasBothFlagsAndDeadline` → true/true, `ChangeDeadlineAtUtc = 2026-11-04 03:00Z`.
- `InsideCutoffHasNoFlags` (visit 2026-11-04 20:00) → false/false, deadline set.
- `HeldHasNoFlagsAndNoDeadline`.
- `PausedPlanCanCancelButNotReschedule`.
- `MissingAppointmentIsNotFound` → code `appointment_not_found`.

- [ ] **Step 2: Run to verify they fail** — `dotnet test backend/NhuNguyetSpa.sln --filter "FullyQualifiedName~BookingSlotReserverTests|FullyQualifiedName~MyAppointmentReaderTests"` → build errors.
- [ ] **Step 3: Implement the Produces items** and fix `CustomerBookingServiceTests` construction.
- [ ] **Step 4: Run to verify they pass**; then all `Bookings` tests (unit + integration) PASS — `GET /me/appointments/{id}` responses now include the three fields.
- [ ] **Step 5: Checkpoint** — build clean.

---

### Task 4: My appointment list

**Files:**

- Create: `backend/src/Application/DTOs/Bookings/MyAppointmentListQuery.cs`, `MyAppointmentListItemDto.cs`, `MyAppointmentSearchCriteria.cs`, `MyAppointmentScope.cs`
- Create: `backend/src/Application/Validators/Bookings/MyAppointmentListQueryValidator.cs`
- Create: `backend/src/Application/Interfaces/Services/Bookings/IMyAppointmentService.cs`, `backend/src/Application/UseCases/Bookings/MyAppointmentService.cs` (list only in this task)
- Modify: `IAppointmentRepository.cs`, `AppointmentRepository.cs`, `backend/src/Application/DependencyInjection.cs`
- Test: `backend/tests/Application.Tests/Bookings/MyAppointmentListTests.cs`, `backend/tests/Application.Tests/Bookings/BookingRequestValidatorTests.cs`, `backend/tests/IntegrationTests/Bookings/CustomerBookingRepositoryTests.cs`

**Interfaces — Produces:**

- `public enum MyAppointmentScope { Upcoming, Past, Cancelled }` + `public static class MyAppointmentScopes { bool TryParse(string? text, out MyAppointmentScope? scope); IReadOnlyList<AppointmentStatus> StatusesOf(MyAppointmentScope scope); }` — text values `upcoming|past|cancelled` (case-insensitive); blank → null scope.
- `public sealed class MyAppointmentListQuery { string? Scope; string? Status; DateOnly? FromDate; DateOnly? ToDate; }` (query-string bound, settable properties like `AppointmentListQuery`).
- Validator messages: scope → `"Nhóm lịch hẹn không hợp lệ."`; status (via `AppointmentStatusText.TryParse`) → `"Trạng thái lịch hẹn không hợp lệ."`; range → `"Ngày bắt đầu phải trước hoặc bằng ngày kết thúc."`.
- `public sealed record MyAppointmentSearchCriteria(MyAppointmentScope? Scope, AppointmentStatus? Status, DateOnly? FromDate, DateOnly? ToDate, int PageNumber, int PageSize);`
- `public sealed record MyAppointmentListItemDto(Guid Id, DateOnly Date, TimeOnly StartTime, TimeOnly EndTime, AppointmentStatus Status, DateTime? HoldExpiresAtUtc, AppointmentServiceDto Service, AppointmentStaffDto Staff, AppointmentBookingSource Source, MyTreatmentSessionRefDto? TreatmentSession)` with `init` `CanReschedule`, `CanCancel`.
- `IAppointmentRepository.SearchMineAsync(Guid customerId, MyAppointmentSearchCriteria criteria, CancellationToken): Task<PagedResult<(MyAppointmentListItemDto Item, AppointmentChangeFacts Facts)>>` — `WithService(Context)` like `GetMineAsync`; scope statuses, status, dates; ordering per Global Constraints.
- `IMyAppointmentService.ListAsync(PagedQuery paging, MyAppointmentListQuery query, CancellationToken): Task<OperationResult<PagedResult<MyAppointmentListItemDto>>>` — validates both, maps each item with `MyAppointmentReader.Flags`. (`PagedQuery.Search` is ignored.)

- [ ] **Step 1: Write the failing tests**

Validator: `scope=abc`, `status=abc`, `fromDate > toDate` → invalid with the messages above; `scope=Upcoming` valid.
`MyAppointmentListTests` (NSubstitute repo): flags filled per item; criteria passed with parsed scope/status and paging.
`CustomerBookingRepositoryTests.SearchMineGroupsAndOrdersByScope`: one customer with appointments in all 7 statuses on different dates + one appointment of another customer → `Upcoming` returns Held/Pending/Confirmed ascending; `Past` Completed/NoShow descending; `Cancelled` Cancelled/HoldExpired descending; null scope returns 7 descending; `Status = Confirmed` with `Past` → empty; date range trims; `TotalCount` correct; other customer's row never returned.

- [ ] **Step 2: Run to verify they fail.**
- [ ] **Step 3: Implement the Produces items.**
- [ ] **Step 4: Run to verify they pass.**
- [ ] **Step 5: Checkpoint.**

---

### Task 5: Reschedule and cancel commands

**Files:**

- Create: `backend/src/Application/DTOs/Bookings/RescheduleMyAppointmentRequest.cs`, `backend/src/Application/Validators/Bookings/RescheduleMyAppointmentRequestValidator.cs`
- Modify: `IMyAppointmentService.cs`, `MyAppointmentService.cs`
- Test: `backend/tests/Application.Tests/Bookings/MyAppointmentServiceTests.cs`, `BookingRequestValidatorTests.cs`

**Interfaces — Consumes:** Task 1 policy/errors/`ReleaseBookedSource`, Task 2 `EnsureSessionReschedule`, Task 3 reserver `excludeAppointmentId` + `MyAppointmentReader.GetAsync`.

**Interfaces — Produces:**

- `public sealed record RescheduleMyAppointmentRequest(DateOnly? Date, TimeOnly? StartTime, Guid? StaffMemberId);` validator = `BookingSlotRules.Date` + `BookingSlotRules.StartTime`.
- `IMyAppointmentService.RescheduleAsync(Guid id, RescheduleMyAppointmentRequest request, CancellationToken): Task<OperationResult<MyAppointmentDto>>`
- `IMyAppointmentService.CancelAsync(Guid id, CancelAppointmentRequest request, CancellationToken): Task<OperationResult<MyAppointmentDto>>`
- `MyAppointmentService` ctor adds: `IPurchaseRepository`, `BookingSlotReserver`, `MyAppointmentReader`, `IUnitOfWork`, `ICurrentUserService`, `IDateTimeProvider`, `IOptions<BookingOptions>`, the three validators.

Reschedule order inside the transaction: `GetForUpdateAsync(id)` → null or `CustomerId != me` → `AppointmentNotFound` → `EnsureCanChange` → A4 no-op check → `end = start + (EndTime − StartTime)` → source check (session: `GetSessionFactsAsync(sessionId, me)` + `EnsureSessionReschedule`; entitlement with `ExpiresAtUtc <= now` → `EntitlementNotEligible("Dịch vụ đã hết hạn sử dụng.")`) → `ReserveAsync(me, spaServiceId, date, start, duration, request.StaffMemberId, token, excludeAppointmentId: id)` → `Reschedule(date, start, slot.End)` + `AssignStaff(slot.StaffMemberId)` → `SaveChangesAsync`. Return `_reader.GetAsync`.
Cancel: lock → ownership → `EnsureCanChange` → `ReleaseBookedSource()` → `Cancel(reason.Trim(), nowUtc)` → save.

- [ ] **Step 1: Write the failing tests** (`MyAppointmentServiceTests`, clock 2026-11-04 09:00 VN):
- `RescheduleOthersAppointmentIsNotFound`, `CancelOthersAppointmentIsNotFound`.
- `RescheduleInsideCutoffIsRefused` → `change_window_passed`; `RescheduleHeldIsStatusInvalid`.
- `RescheduleKeepsDurationAndStatusAndSetsPickedStaff`: 60′ visit → `EndTime = start + 60′`, `StaffMemberId = slot.StaffMemberId`, `Status` Confirmed; reserver called with `excludeAppointmentId = id` and the requested `StaffMemberId` (null passed through for any staff).
- `RescheduleToOtherStaffOverlappingOwnSlotSucceeds` (exclude id reaches the reserver; verified with the reserver's repository substitutes returning the own appointment only when exclude is null).
- `RescheduleToSameSlotDoesNothing`: no reserver call, no save of changes.
- `RescheduleSessionChecksPackageOrder`: facts with next visit → `session_too_late`, reserver not called.
- `RescheduleExpiredEntitlementIsNotEligible`.
- `CancelReleasesSessionAndRecordsReason`, `CancelPaidBookNowReleasesEntitlement`, `CancelInsideCutoffIsRefused`, `CancelHeldIsStatusInvalid`.
- Validator: missing date/startTime, `09:15`, date +61 → invalid.

- [ ] **Step 2: Run to verify they fail.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run to verify they pass.**
- [ ] **Step 5: Checkpoint.**

---

### Task 6: Availability for a customer's own appointment

**Files:**

- Modify: `backend/src/Application/Validators/Bookings/AvailabilityQueryValidator.cs`, `backend/src/Application/DTOs/Bookings/AvailabilityQuery.cs` (doc comment), `backend/src/Application/UseCases/Bookings/AvailabilityService.cs`
- Test: `backend/tests/Application.Tests/Bookings/AvailabilityServiceTests.cs`, `BookingRequestValidatorTests.cs`

**Interfaces — Consumes:** Task 2 `RescheduleWindow`, `NextVisit`; Task 3 `GetMineAsync` row.

Behaviour (BR-BKG-18):

- Validator: valid when exactly one of the three sources is set, **or** none is set and `AppointmentId` is set; message unchanged otherwise.
- Customer + `AppointmentId`: any source also set → `BusinessRuleException("Khi đổi lịch chỉ gửi mã lịch hẹn, không gửi kèm dịch vụ.", "validation_error")`; `GetMineAsync(appointmentId, customerId)` null → `AppointmentNotFound`; service = row's `Service.Id` (discontinued allowed), duration = `EndTime − StartTime`, `excludeId` = appointment id, customer busy computed for the customer excluding it. Session appointment: `GetSessionFactsAsync` → date outside `RescheduleWindow` → empty `staff`; same day as `Previous` blocks `[00:00, Previous.EndTime)`; same day as `Next` blocks `[Next.StartTime, 23:59:59.9999999]`; Q-30 expiry rule as for a session.
- Owner + `AppointmentId` without `SpaServiceId`: service from `GetSpaServiceIdAsync`; otherwise unchanged. Guest + `AppointmentId` only → `AppointmentNotFound` (no caller identity).

- [ ] **Step 1: Write the failing tests**: `CustomerAppointmentDoesNotBlockItself` (own 09:00–10:00 → 09:00 slot present, `DurationMinutes` = 60 from the appointment even when the service now says 90); `CustomerAppointmentWithServiceIdIsInvalid`; `OthersAppointmentIsNotFound`; `SessionAppointmentOutsideWindowIsEmpty`; `SessionAppointmentOnNextVisitDayEndsBeforeIt`; `OwnerWithServiceAndAppointmentUnchanged` (regression); validator cases.
- [ ] **Step 2: Run to verify they fail.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run to verify they pass**, plus existing `AvailabilityEndpointsTests`.
- [ ] **Step 5: Checkpoint.**

---

### Task 7: API endpoints and integration tests

**Files:**

- Modify: `backend/src/API/Controllers/MyAppointmentsController.cs` (summary now "UC-SPA-15 and UC-SPA-16")
- Create: `backend/tests/IntegrationTests/Bookings/MyAppointmentEndpointsTests.cs`
- Modify: `backend/tests/IntegrationTests/Bookings/CustomerBookingConcurrencyTests.cs`, `AvailabilityEndpointsTests.cs`

**Interfaces — Consumes:** `IMyAppointmentService` (Tasks 4–5).

Controller actions (same `ProducesResponseType` style as the existing ones), injecting `IMyAppointmentService` next to `ICustomerBookingService`:

- `[HttpGet] List([FromQuery] PagedQuery paging, [FromQuery] MyAppointmentListQuery query, ct)` → 200.
- `[HttpPost("{id:guid}/reschedule")] Reschedule(Guid id, RescheduleMyAppointmentRequest request, ct)` → 200.
- `[HttpPost("{id:guid}/cancel")] Cancel(Guid id, CancelAppointmentRequest request, ct)` → 200.

- [ ] **Step 1: Write the failing integration tests** — one test per spec row, named after it: `Bkg_T50_ListGroupsByScope` … `Bkg_T66_OnlyCustomersMayUseMyAppointments`, covering exactly the cases and expectations of BKG-T50…T66 in the spec (time-sensitive cases set `TestClock.Offset` so the visit is 25 h / 23 h / 10 min away). BKG-T62 goes in `CustomerBookingConcurrencyTests` (`Bkg_T62_TwoReschedulesIntoOneSlot`, `Bkg_T62_RescheduleRacesOwnerCancel`: `Task.WhenAll`, assert one 200 + one `409`, database has no overlap, completes within the test timeout). BKG-T64 goes in `AvailabilityEndpointsTests`.
- [ ] **Step 2: Run to verify they fail** — `dotnet test backend/NhuNguyetSpa.sln --filter "FullyQualifiedName~MyAppointmentEndpointsTests|FullyQualifiedName~CustomerBookingConcurrencyTests|FullyQualifiedName~AvailabilityEndpointsTests"` → 404/405 on the new routes.
- [ ] **Step 3: Implement the controller actions.**
- [ ] **Step 4: Run to verify they pass**, then BKG-T67: `dotnet test backend/NhuNguyetSpa.sln` → all PASS (incl. `PersistenceModelTests`).
- [ ] **Step 5: Checkpoint.**

---

### Task 8: Docs, analysis sources, Postman

**Files:**

- Modify: `docs/spec-source/data_api.py` rows SPA-API-061, 064, 066, 067 **in place** (vi field names as in the file: 061 note "khách gửi idLichHen thay nguồn (đổi lịch)"; 064 `?scope=upcoming|past|cancelled&trangThai&tuNgay&denNgay&page&pageSize` → `PagedResult<LichHenCuaToiListItemDto>`; 066 `{ngay, gioBatDau, idNhanVien?}` → `LichHenCuaToiDto`, errors `400 CHANGE_WINDOW_PASSED / SESSION_TOO_EARLY / SESSION_TOO_LATE; 409 SLOT_UNAVAILABLE / CUSTOMER_BUSY / APPOINTMENT_STATUS_INVALID / ENTITLEMENT_NOT_ELIGIBLE`; 067 `{lyDo} (1–500)` → `LichHenCuaToiDto`, `400 CHANGE_WINDOW_PASSED; 409 APPOINTMENT_STATUS_INVALID`)
- Modify: `docs/spec-source/data_rules.py` (BR-BKG-07 text = spec; append BR-BKG-16, 17, 18 after the last BR-BKG row); regenerate Excel per `docs/spec-source/README.md`
- Modify: `docs/decisions/open-questions.md` (Q-04 default note "áp cho đổi và hủy, `Booking:CustomerChangeCutoffHours`, UC-SPA-16 01/11/2026"; add Q-41, Q-42 as "Chờ chốt" with the spec defaults)
- Modify: `docs/domain/glossary.md` (`change_window_passed`, `session_too_late`, `CustomerChangeCutoffHours` / "hạn đổi/hủy lịch", routes of UC-SPA-16)
- Modify: `docs/progress.md` (UC-SPA-16 row → done in backend, tests count), `docs/specs/bookings.md` status line ("đợt 3 duyệt và xong phần backend ngày …" + plan link)
- Modify: `backend/postman/generate_collection.py` (folder "Lịch hẹn của tôi": list ×3 scopes, reschedule, cancel, availability by appointmentId), regenerate the collection
- Modify: `CLAUDE.md` and `backend/CLAUDE.md` (UC-SPA-16 now done: routes, 24 h cutoff key, Q-41/Q-42; remove "the rest of UC-SPA-16" from "Not yet implemented")

- [ ] **Step 1: Edit the sources and regenerate** (`python docs/spec-source/build_excel.py` and the data-model generator as the README says); `PersistenceModelTests` still PASS (data-model unchanged).
- [ ] **Step 2: Definition of Done** — `dotnet build backend/NhuNguyetSpa.sln`, `dotnet test backend/NhuNguyetSpa.sln`, `npm run format:check` (run `npm run format` first if markdown changed), `npm run lint`, `npm run typecheck` — all green.
- [ ] **Step 3: Checkpoint** — report results; the user commits.

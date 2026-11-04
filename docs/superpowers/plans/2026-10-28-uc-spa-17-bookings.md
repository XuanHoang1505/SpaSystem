# Bookings wave 1: availability + owner appointment management (UC-SPA-17) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Backend for the free-slot algorithm (`GET /availability`) and for the owner to list, view, confirm, reschedule, reassign, cancel and mark no-show on appointments without double-booking.

**Architecture:** Domain gets state-transition methods on `Appointment`, `ServiceEntitlement`, `TreatmentSession`. Application gets a pure slot calculator (`AvailabilitySlots`), `AvailabilityService` and `AppointmentManagementService` in `UseCases/Bookings`, reusing `AppointmentOccupancy` (BR-STF-07). The service of an appointment is **derived** (BR-BKG-13) by one shared EF projection. Infrastructure extends `AppointmentRepository` / `StaffMemberRepository` and adds a CHECK + index migration. API adds `AvailabilityController`, `AppointmentsController` and the `appointment.manage` policy.

**Tech Stack:** .NET 9, EF Core 9 + Npgsql, PostgreSQL 17 (`btree_gist`, `f_unaccent` already present), FluentValidation, xUnit + NSubstitute + FluentAssertions, Testcontainers.

**Spec:** `docs/specs/bookings.md` (approved 2026-10-28 with changes: service derived, not stored (Q-25); slot step 30 minutes (Q-11); other decisions as proposed)

## Global Constraints

- Code names from the glossary (`Appointment`, folder `Bookings`, routes `/availability`, `/appointments`); messages in Vietnamese with diacritics; error codes exactly: `service_not_found` (reuse `CatalogErrors.ServiceNotFound()`), `appointment_not_found`, `staff_not_found` (reuse `StaffErrors.StaffNotFound()`), `slot_unavailable` (also from the existing `UnitOfWork.Translate`), `customer_busy`, `outside_work_schedule`, `staff_not_qualified` (400), `staff_not_on_shift`, `staff_busy`, `appointment_status_invalid`, `appointment_in_past` (400), `no_show_too_early` (400), `appointment_not_assigned` (403, staff viewing another's appointment); `validation_error` for validator failures.
- DI through constructors into `private readonly` fields; Application does not reference ASP.NET Core or EF Core.
- "Now" in VN = `SpaTime.ToLocal(_clock.UtcNow)`; today = `SpaTime.Today(_clock.UtcNow)`; dates/times `DateOnly` + `TimeOnly` VN local, JSON `yyyy-MM-dd` / `HH:mm` (existing `HourMinuteTimeOnlyJsonConverter`).
- Config `Booking` section in `appsettings.json`, bound with `ValidateDataAnnotations().ValidateOnStart()`: `SlotStepMinutes` = **30** (5–60 and `60 % value == 0`), `MaxDaysAhead` = 60, `MaxQueryRangeDays` = 42, `NoShowConsumesEntitlement` = `false`. No `.env` variable.
- No `appointments.spa_service_id` column. Schema change only: `ck_appointments_source` (`num_nonnulls(service_entitlement_id, treatment_session_id, order_item_id) >= 1`) and index `ix_appointments_customer_id_date`. Path: `docs/spec-source/data_db.py` → regenerate `data-model.md`, Excel, `docs/export/NhuNguyetSpa_CSDL_TiengViet.sql` → migration `AddAppointmentBookingConstraints`.
- Do not change behaviour of finished UCs (01–03, 06, 07, 09–11, 14, 22, 23); all existing tests pass; `PersistenceModelTests` passes.
- TDD: unit tests with NSubstitute and a fixed clock; integration tests with `PostgresFixture` + `AuthApiFactory` (`TestClock`). Appointments are inserted directly (no booking API yet).
- Update `docs/progress.md`, glossary, `open-questions.md` (Q-11 → 30', Q-24, Q-25), `data_api.py` (edit rows BKG 061, 068–074 in place, never insert/remove), Postman (`backend/postman/generate_collection.py`), root/backend `CLAUDE.md`.
- The user runs git: no commits or pushes; every "Checkpoint" is `dotnet build` + the task's tests. No Co-Authored-By or "Generated with" lines anywhere.

## Review Focus

- Rescheduling 23:30 with a 60' appointment: `TimeOnly` wraps to 00:30, end < start → must be `409 outside_work_schedule`, not a 500 from `ck_appointments_time_range` → Task 5 unit test `RescheduleWrappingPastMidnightIsOutsideSchedule` (compute end with `TimeOnly.Add(duration, out var wrapped)`, reject when `wrapped > 0`).
- "Today"/"started" at the UTC day boundary: clock `2026-10-28T17:30Z` = 00:30 on 29/10 VN → an appointment 29/10 00:15 has started (no-show allowed, reschedule `appointment_in_past`) → Task 5 tests use that clock.
- Owner reschedules to a minute off the 30' grid (`09:10`): accepted if inside a shift and free; the grid only shapes `/availability` suggestions → Task 5 test `RescheduleAcceptsOffGridTime`.
- Service discontinued after the appointment was booked: owner may still reschedule/reassign and `/availability?appointmentId=` still works for the owner (owner sees all catalog) → Task 6 test `OwnerCanRescheduleAppointmentOfDiscontinuedService`.
- Search typed without accents or with partial phone (`"nguyen"`, `"0912"`) finds `Nguyễn …` / `0912345678`; `%` / `_` typed literally do not act as wildcards (reuse `CatalogSearchText`) → Task 3 repository test `SearchIsAccentInsensitiveAndEscapesWildcards`.

---

### Task 1: Schema, domain transitions, test seed helper

**Files:**

- Modify: `docs/spec-source/data_db.py` (appointments: `customer_id` constraint `FK → customers.id; IDX (customer_id, date)`, `order_item_id` adds `CHECK num_nonnulls(service_entitlement_id, treatment_session_id, order_item_id) >= 1`); regenerate per `docs/spec-source/README.md`, then prettier
- Modify: `backend/src/Infrastructure/Persistence/Configurations/AppointmentConfiguration.cs`; migration `AddAppointmentBookingConstraints`
- Modify: `backend/src/Domain/Entities/{Appointment,ServiceEntitlement,TreatmentSession}.cs`
- Modify: `backend/tests/IntegrationTests/Staff/StaffApi.cs` (`SeedAppointmentAsync` creates a source)
- Test: `backend/tests/Domain.Tests/Bookings/AppointmentTransitionTests.cs`, `backend/tests/IntegrationTests/Bookings/AppointmentSchemaTests.cs`

**Interfaces — Produces:**

- `Appointment` (setters stay public for now, transitions throw `InvalidOperationException` on a wrong status; services check first and throw the coded error):
  `void Confirm()` (PendingConfirmation → Confirmed); `void Reschedule(DateOnly date, TimeOnly start, TimeOnly end)` and `void AssignStaff(Guid staffMemberId)` (only PendingConfirmation/Confirmed, status unchanged); `void Cancel(string reason, DateTime nowUtc)` (PendingConfirmation/Confirmed → Cancelled, sets `CancelledAtUtc`, `CancellationReason`); `void MarkNoShow(string? note)` (Confirmed → NoShow, `Note = note` when not null); `void ExpireHold()` (Held → HoldExpired); `bool CanBeManaged => Status is PendingConfirmation or Confirmed`.
- `ServiceEntitlement`: `void Release()` (Booked → Available, otherwise no-op), `void Consume()` (Booked → Used). `TreatmentSession`: `void Release()` (Booked → NotBooked), `void Skip()` (Booked → Skipped). No change to `CustomerPackage.UsedSessions`.
- `AppointmentConfiguration`: `HasCheckConstraint("ck_appointments_source", "num_nonnulls(service_entitlement_id, treatment_session_id, order_item_id) >= 1")`, `HasIndex(x => new { x.CustomerId, x.Date })`.
- `StaffApi.SeedAppointmentAsync(..., Guid? spaServiceId = null, Guid? customerId = null)`: seeds (or reuses) customer, a paid one-line order for the service (seed a service via `CatalogApi` when null) and a `ServiceEntitlement` `Booked`, links `ServiceEntitlementId`. Add `SeedSessionAppointmentAsync(staffId, date, start, end, status, spaServiceId, customerId?)` → customer package + plan + one `TreatmentSession` `Booked` linked by `TreatmentSessionId`. Both return the `Appointment`.

- [ ] Write `AppointmentTransitionTests`: `ConfirmOnlyFromPending`, `CancelSetsReasonAndTime`, `CancelCompletedThrows`, `NoShowOnlyFromConfirmed`, `RescheduleKeepsStatus`, `HeldCannotBeRescheduledOrCancelled`, `EntitlementReleaseAndConsume`, `SessionReleaseAndSkip`. Run `dotnet test backend/tests/Domain.Tests` → FAIL.
- [ ] Implement the members; run → PASS.
- [ ] Write `AppointmentSchemaTests` (`[Collection(PostgresCollection.Name)]`, BKG-T23 part 1): `AppointmentWithoutSourceIsRejected` (`DbUpdateException`, inner `PostgresException.ConstraintName == "ck_appointments_source"`), `AppointmentWithOnlyOrderItemIsAccepted`. Run → FAIL.
- [ ] Update spec-source + regenerate; configuration; `dotnet ef migrations add AddAppointmentBookingConstraints --project backend/src/Infrastructure --startup-project backend/src/API --output-dir Persistence/Migrations`; update `SeedAppointmentAsync`. Run schema tests, `PersistenceModelTests`, all `IntegrationTests/Staff` → PASS.
- [ ] Checkpoint: `dotnet build backend/NhuNguyetSpa.sln`; `dotnet test backend/NhuNguyetSpa.sln` green.

### Task 2: Options, errors, pure slot calculator

**Files:**

- Create: `backend/src/Application/Common/Options/BookingOptions.cs`, `backend/src/Application/UseCases/Bookings/{BookingErrors,AvailabilitySlots}.cs`
- Modify: `backend/src/API/appsettings.json` (section `Booking`), `backend/src/Infrastructure/DependencyInjection.cs`
- Test: `backend/tests/Application.Tests/Bookings/AvailabilitySlotsTests.cs`

**Interfaces — Produces:**

- `BookingOptions { SectionName = "Booking"; [Range(5, 60)] int SlotStepMinutes = 30; [Range(1, 366)] int MaxDaysAhead = 60; [Range(1, 366)] int MaxQueryRangeDays = 42; bool NoShowConsumesEntitlement }`; DI adds `.Validate(o => 60 % o.SlotStepMinutes == 0, "Booking:SlotStepMinutes must divide 60.")`.
- `BookingErrors`: `const string` per new code + factories: `AppointmentNotFound()` 404 `"Không tìm thấy lịch hẹn."`; `SlotUnavailable()` 409 `"Khung giờ này vừa có người đặt, vui lòng chọn giờ khác."` (same text as `UnitOfWork`); `CustomerBusy()` 409 `"Khách đã có lịch hẹn khác trùng khung giờ này."`; `OutsideWorkSchedule()` 409 `"Khung giờ không nằm trọn trong ca làm của nhân viên."`; `StaffNotQualified()` 400 (`BusinessRuleException`) `"Nhân viên không thực hiện được dịch vụ của lịch hẹn."`; `StaffNotOnShift()` 409 `"Nhân viên không có ca làm phủ khung giờ của lịch hẹn."`; `StaffBusy()` 409 `"Nhân viên đã có lịch hẹn khác trong khung giờ này."`; `StatusInvalid(AppointmentStatus current)` 409 `$"Không thể thực hiện thao tác khi lịch hẹn ở trạng thái {Label(current)}."` (Vietnamese labels: Giữ chỗ, Chờ xác nhận, Đã xác nhận, Hoàn thành, Đã hủy, Không đến, Hết hạn giữ chỗ); `InPast()` 400 `"Lịch hẹn đã bắt đầu hoặc thời gian mới đã qua."`; `NoShowTooEarly()` 400 `"Chỉ ghi nhận khách không đến sau giờ bắt đầu lịch hẹn."`.
- `AvailabilitySlots.Compute(IReadOnlyList<(TimeOnly Start, TimeOnly End)> shifts, IReadOnlyList<(TimeOnly Start, TimeOnly End)> busy, int durationMinutes, int stepMinutes, TimeOnly? notAfter) → IReadOnlyList<(TimeOnly Start, TimeOnly End)>`: subtract `busy` from each shift (A5), candidate `t` = free-segment start rounded **up** to a multiple of `step` from 00:00, keep `t` if `[t, t+duration)` lies inside the free segment without wrapping midnight, drop `t <= notAfter` (A7, "now" when date is today), sorted, distinct.

- [ ] Write `AvailabilitySlotsTests` (step 30): `Uat01` (BKG-T01: shift 08–12, busy 09–10, 60' → 08:00, 10:00, 10:30, 11:00; no 08:30), `SlotNearShiftEnd` (T02: shift 08:00–11:50 → last 10:30), `TwoShiftsAndRoundUp` (T03: 08:10–10:00 + 13:00–15:00 → first 08:30, none spanning 10:00–13:00), `PastSlotsDropped` (T05: notAfter 09:20 → no ≤ 09:20, 09:30 present), `TouchingBusyDoesNotBlock`, `NoSlotWhenDurationExceedsSegment`, `NoWrapPastMidnight` (shift 22:00–23:59, 120' → empty). Run → FAIL.
- [ ] Implement; run → PASS.
- [ ] Checkpoint: build + `dotnet test backend/tests/Application.Tests`.

### Task 3: Repository reads and writes

**Files:**

- Modify: `backend/src/Application/Interfaces/Repositories/{IAppointmentRepository,IStaffMemberRepository}.cs`, `backend/src/Infrastructure/Repositories/{AppointmentRepository,StaffMemberRepository}.cs`
- Create: `backend/src/Application/DTOs/Bookings/{AppointmentListItemDto,AppointmentDetailDto,AppointmentSearchCriteria,AvailabilityDto,AvailabilityCandidate}.cs`, `backend/src/Infrastructure/Repositories/AppointmentServiceSource.cs`
- Test: `backend/tests/IntegrationTests/Bookings/AppointmentRepositoryTests.cs`

**Interfaces — Produces:**

- DTOs (records): `AppointmentPartyDto(Guid Id, string FullName)`; `AppointmentCustomerDto(Guid Id, string FullName, string PhoneNumber)`; `AppointmentListItemDto(Guid Id, DateOnly Date, TimeOnly StartTime, TimeOnly EndTime, AppointmentStatus Status, AppointmentCustomerDto Customer, AppointmentPartyDto Staff, AppointmentPartyDto Service)`; `AppointmentDetailDto(` the list fields `, DateTime? HoldExpiresAtUtc, DateTime? CancelledAtUtc, string? CancellationReason, string? Note, DateTime CreatedAtUtc, IReadOnlyList<AllergyDto> Allergies, TreatmentSessionRefDto? TreatmentSession, bool HasSkinProfile)` with `AllergyDto(string Allergen, AllergySeverity Severity, string? Note)`, `TreatmentSessionRefDto(Guid Id, int SequenceNumber)` (use the entity's real property names); `AvailabilityDto(DateOnly Date, int DurationMinutes, IReadOnlyList<AvailableStaffDto> Staff)`, `AvailableStaffDto(Guid Id, string FullName, IReadOnlyList<TimeSlotDto> Slots)`, `TimeSlotDto(TimeOnly StartTime, TimeOnly EndTime)`; `AvailabilityCandidate(Guid StaffMemberId, string FullName)`; `AppointmentSearchCriteria(DateOnly FromDate, DateOnly ToDate, Guid? StaffMemberId, AppointmentStatus? Status, string? Search, int PageNumber, int PageSize)`.
- `AppointmentServiceSource.ServiceId` : `Expression<Func<Appointment, Guid?>>` = `a.TreatmentSession != null ? a.TreatmentSession.SpaServiceId : a.ServiceEntitlement != null ? a.ServiceEntitlement.OrderItem.SpaServiceId : a.OrderItem!.SpaServiceId` (BR-BKG-13); service name joined from `spa_services` by that id. Every query below uses it.
- `IAppointmentRepository` adds:
  `Task<PagedResult<AppointmentListItemDto>> SearchAsync(AppointmentSearchCriteria criteria, CancellationToken ct)` (order `Date, StartTime, Id`; search = `f_unaccent` LIKE on customer name or phone via `CatalogSearchText`);
  `Task<AppointmentDetailDto?> GetDetailAsync(Guid id, CancellationToken ct)`;
  `Task<(Appointment Appointment, Guid SpaServiceId)?> GetForUpdateAsync(Guid id, CancellationToken ct)` (row lock `SELECT 1 FROM appointments WHERE id = {id} FOR UPDATE` like `OrderRepository`, then tracked load including `ServiceEntitlement`, `TreatmentSession`);
  `Task<Guid?> GetSpaServiceIdAsync(Guid id, CancellationToken ct)`, `Task<Guid?> GetStaffMemberIdAsync(Guid id, CancellationToken ct)`;
  `Task<IReadOnlyList<(TimeOnly Start, TimeOnly End)>> GetCustomerOccupyingOnAsync(Guid customerId, DateOnly date, DateTime nowUtc, Guid? excludeId, CancellationToken ct)`;
  `Task<IReadOnlyList<(Guid StaffMemberId, TimeOnly Start, TimeOnly End)>> GetOccupyingForStaffOnAsync(IReadOnlyCollection<Guid> staffIds, DateOnly date, DateTime nowUtc, Guid? excludeId, CancellationToken ct)`;
  `Task<int> ExpireHeldAsync(Guid staffMemberId, DateOnly date, DateTime nowUtc, CancellationToken ct)` (`ExecuteUpdate` held with `HoldExpiresAtUtc <= nowUtc` → `hold_expired`; BR-BKG-11).
- `IStaffMemberRepository` adds `Task<IReadOnlyList<AvailabilityCandidate>> GetAvailabilityCandidatesAsync(Guid spaServiceId, DateOnly date, Guid? staffMemberId, CancellationToken ct)` (skill, user active, `HireDate <= date`, working on date; ordered by name) and `Task<bool> HasSkillAsync(Guid staffMemberId, Guid spaServiceId, CancellationToken ct)`. Shift ranges come from existing `IWorkScheduleRepository.GetActiveRangesAsync`.

- [ ] Write `AppointmentRepositoryTests`: `ServiceIsDerivedFromEachSource` (entitlement / session / order item only → right service id, BKG-T23 part 2), `SearchFiltersAndOrders` (range, staff, status), `SearchIsAccentInsensitiveAndEscapesWildcards`, `CandidatesExcludeUnqualifiedLockedResignedNotHired` (BKG-T06 data level), `ExpireHeldOnlyTouchesExpiredHeldOfThatStaffAndDate`, `CustomerOccupyingExcludesGivenId`. Run → FAIL.
- [ ] Implement; run → PASS.
- [ ] Checkpoint: build + `dotnet test backend/tests/IntegrationTests --filter "FullyQualifiedName~Bookings|FullyQualifiedName~Staff"`.

### Task 4: Availability use case and endpoint

**Files:**

- Create: `backend/src/Application/Interfaces/Services/Bookings/IAvailabilityService.cs`, `backend/src/Application/UseCases/Bookings/AvailabilityService.cs`, `backend/src/Application/DTOs/Bookings/AvailabilityQuery.cs`, `backend/src/Application/Validators/Bookings/AvailabilityQueryValidator.cs`, `backend/src/API/Controllers/AvailabilityController.cs`
- Modify: `backend/src/Application/DependencyInjection.cs`
- Test: `backend/tests/Application.Tests/Bookings/AvailabilityServiceTests.cs`, `backend/tests/IntegrationTests/Bookings/AvailabilityEndpointsTests.cs`

**Interfaces:**

- Consumes: Task 2 `AvailabilitySlots`, `BookingOptions`, `BookingErrors`; Task 3 repository methods; `CatalogViewer` (owner vs public), `ISpaServiceRepository.GetDetailAsync(id, publicOnly)`.
- Produces: `AvailabilityQuery { Guid? SpaServiceId; DateOnly? Date; Guid? StaffMemberId; Guid? AppointmentId }`; `IAvailabilityService.GetAsync(AvailabilityQuery query, CancellationToken ct) → Task<OperationResult<AvailabilityDto>>`; route `GET /api/v1/availability`, `[AllowAnonymous]`.
- Rules: validator → `SpaServiceId`, `Date` required, `Date` in `[today, today + MaxDaysAhead]` (`validation_error`). Non-owner: `AppointmentId` ignored. Owner with `AppointmentId`: 404 `appointment_not_found` if missing; duration = its end − start; its own interval excluded from staff busy and from its customer's busy. Caller in role customer: own occupying appointments subtracted from every candidate (BR-BKG-04). `notAfter` = VN now time only when `Date == today`.

- [ ] Write `AvailabilityServiceTests` (NSubstitute repos, fixed clock): `PublicCallerIgnoresAppointmentId`, `OwnerAppointmentIdUsesItsDurationAndExcludesItself` (BKG-T08), `CustomerOwnAppointmentsBlockSlots` (T07), `DateOutsideRangeIsValidationError`, `StaffWithoutSlotsAreOmitted`. Run → FAIL.
- [ ] Implement service + validator + controller; run → PASS.
- [ ] Write `AvailabilityEndpointsTests` (Postgres): T04 (held unexpired blocks, expired and cancelled do not), T06 (candidates incl. cancelled shift), T07 (guest still sees the slot), T09 (discontinued service as guest → 404 `service_not_found`; yesterday → 400; today+61 → 400), empty → 200 `staff: []`. Run → PASS.
- [ ] Checkpoint: build + Bookings tests.

### Task 5: Appointment management use cases (Application)

**Files:**

- Create: `backend/src/Application/Interfaces/Services/Bookings/IAppointmentManagementService.cs`, `backend/src/Application/UseCases/Bookings/AppointmentManagementService.cs`, `backend/src/Application/DTOs/Bookings/{AppointmentListQuery,RescheduleAppointmentRequest,AssignAppointmentStaffRequest,CancelAppointmentRequest,MarkNoShowRequest}.cs`, `backend/src/Application/Validators/Bookings/*Validator.cs` (one per request/query)
- Modify: `backend/src/Application/DependencyInjection.cs`
- Test: `backend/tests/Application.Tests/Bookings/{AppointmentManagementServiceTests,AppointmentValidatorTests}.cs`

**Interfaces — Produces:**

- `AppointmentListQuery : PagedQuery { DateOnly? FromDate; DateOnly? ToDate; Guid? StaffMemberId; string? Status; string? Search }` (both dates required, `ToDate >= FromDate`, range ≤ `MaxQueryRangeDays` days inclusive, `Status` a snake_case `AppointmentStatus`, `Search` ≤ 100); `RescheduleAppointmentRequest(DateOnly? Date, TimeOnly? StartTime)` (both required, seconds must be 0); `AssignAppointmentStaffRequest(Guid? StaffMemberId)`; `CancelAppointmentRequest(string? Reason)` (trimmed, 1–500); `MarkNoShowRequest(string? Note)` (≤ 1000).
- `IAppointmentManagementService`: `ListAsync(AppointmentListQuery, ct) → OperationResult<PagedResult<AppointmentListItemDto>>`; `GetAsync(Guid id, ct) → OperationResult<AppointmentDetailDto>` (owner, or staff whose id == appointment staff; otherwise `BookingErrors.NotAssigned()` = `ForbiddenException("Bạn không được phân công lịch hẹn này.", "appointment_not_assigned")` → 403); `ConfirmAsync`, `RescheduleAsync`, `AssignStaffAsync`, `CancelAsync`, `MarkNoShowAsync` → `OperationResult<AppointmentDetailDto>`.
- Each command runs inside `_unitOfWork.ExecuteInTransactionAsync`: `GetForUpdateAsync` (404) → status check via `CanBeManaged` (`StatusInvalid`, BR-BKG-09; `held` always invalid, Q-24) → rule checks → domain transition → `SaveChangesAsync` → `GetDetailAsync`.
- Reschedule order: started (`date + start <= now VN`) → `InPast`; new end via `TimeOnly.Add` wrap → `OutsideWorkSchedule`; new start in the past → `InPast`; staff not working on new date → `OutsideWorkSchedule`; no single active shift containing `[start, end)` → `OutsideWorkSchedule`; `ExpireHeldAsync(staff, date)`; staff busy (exclude self) → `SlotUnavailable`; customer busy (exclude self) → `CustomerBusy`.
- AssignStaff order: same staff id → return detail unchanged; staff missing → `StaffNotFound`; started → `InPast`; no skill for derived service → `StaffNotQualified`; not working on date or no shift containing the slot → `StaffNotOnShift`; `ExpireHeldAsync`; busy → `StaffBusy`.
- Cancel: entitlement `Release()`, session `Release()`, `Cancel(reason.Trim(), now)`. NoShow: status must be Confirmed (else `StatusInvalid`), `now VN < date + start` → `NoShowTooEarly`; then `Consume()`/`Skip()` when `NoShowConsumesEntitlement`, else `Release()`; `MarkNoShow(note)`.

- [ ] Write `AppointmentValidatorTests`: missing dates, 43-day range, unknown status, reschedule time with seconds, empty/501-char reason, 1001-char note → invalid; boundary values valid.
- [ ] Write `AppointmentManagementServiceTests` (clock `2026-10-28T17:30Z`): `RescheduleChecksInSpecOrder` (one test per error of BKG-T13), `RescheduleWrappingPastMidnightIsOutsideSchedule`, `RescheduleAcceptsOffGridTime`, `RescheduleOverlappingOwnOldSlotSucceeds` (T14), `RescheduleExpiresStaleHeldFirst` (T16, `Received.InOrder`), `AssignStaffCases` (T17), `CancelReleasesEntitlementAndSession` (T18), `NoShowCases` incl. option on/off and appointment 29/10 00:15 counted as started (T19), `ConfirmCases` (T20), `HeldIsStatusInvalidForEveryCommand` (T21), `StaffSeesOnlyOwnDetail` (T11). Run → FAIL.
- [ ] Implement; run → PASS.
- [ ] Checkpoint: build + `dotnet test backend/tests/Application.Tests`.

### Task 6: API, policy and end-to-end tests

**Files:**

- Create: `backend/src/API/Controllers/AppointmentsController.cs`
- Modify: `backend/src/API/Authorization/Permissions.cs` (`AppointmentManage = "appointment.manage"` → `[Owner]`)
- Test: `backend/tests/IntegrationTests/Bookings/{BookingApi,AppointmentEndpointsTests}.cs`

**Interfaces:**

- Consumes: Task 5 service and DTOs.
- Produces: `[Route("api/v1/appointments")]`, class-level `[Authorize(Policy = Permissions.AppointmentManage)]`; `GET ""`, `POST {id:guid}/confirm|reschedule|assign-staff|cancel|no-show` → 200 detail; `GET {id:guid}` overrides with `[Authorize(Roles = "owner,staff")]` (use `Roles` constants), the service enforces assignment. No DELETE action. `ProducesResponseType` like `WorkSchedulesController`. `BookingApi` wraps `StaffApi` seeds + HTTP helpers from `CatalogApi`.

- [ ] Write `AppointmentEndpointsTests`: T10 (list filters, accent-insensitive search, 43 days → 400), T11 (owner 200 with allergies; assigned staff 200; other staff 403; customer 403), T12, T13 (all codes over HTTP), T15 (two concurrent reschedules of different appointments into one slot via `Task.WhenAll` → one 200, one `409 slot_unavailable`, DB has no overlap), T16, T17, T18 (DB statuses), T19, T20, T21, T22 (customer/staff → 403 on commands, no Bearer → 401), T23 (`DELETE` → 405), `OwnerCanRescheduleAppointmentOfDiscontinuedService`. Run → FAIL (404 routes).
- [ ] Implement controller + policy; run → PASS.
- [ ] Checkpoint: `dotnet test backend/NhuNguyetSpa.sln` all green (BKG-T24).

### Task 7: Docs, Postman, Definition of Done

**Files:**

- Modify: `docs/spec-source/data_api.py` (rows BKG 061, 068–074 in place, keeping the file's existing Vietnamese field style: `?idDichVu&ngay&idNhanVien?&idLichHen?`, drop `view=list|calendar`, error codes from the spec), regenerate Excel; `docs/domain/glossary.md` (Availability / free slot, derived service of an appointment, `appointment.manage`, new error codes if the glossary lists them); `docs/decisions/open-questions.md` (Q-11 default 30 phút, Q-24 new, Q-25 `Đã chốt 28/10/2026: suy ra`); `docs/progress.md` (UC-SPA-17 row ✅ backend + header paragraph; UC-SPA-15 note "giờ trống đã có"); `docs/specs/bookings.md` (status line); `backend/postman/generate_collection.py` (folder "Bookings": availability + 7 appointment requests) and regenerate; `CLAUDE.md` + `backend/CLAUDE.md` (one paragraph like the other done features: endpoints, policy, `Booking:*` keys, derived service, lazy hold expiry, migration name).

- [ ] Apply the doc changes and regenerate generated files (commands in `docs/spec-source/README.md` and `backend/postman/`).
- [ ] Run Definition of Done from `docs/conventions/workflow.md`: `dotnet build backend/NhuNguyetSpa.sln`, `dotnet test backend/NhuNguyetSpa.sln`, `npm run lint`, `npm run typecheck`, `npm run format:check` — all pass; report any failure with output.

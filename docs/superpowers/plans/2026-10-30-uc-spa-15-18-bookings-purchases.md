# Bookings wave 2 (UC-SPA-15) + purchases (UC-SPA-18) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Backend for customers to book appointments, either by "book now" (slot hold + order + VNPay; confirmed on payment) or with a bought single service or package session, with optional "any staff" auto-assignment, and to list what they bought.

**Architecture:** Domain gets booking transitions. Application gets pure rules (`EntitlementEligibility`, `PurchaseStatus`, `StaffPicker`), a shared `BookingSlotReserver` (the A9 in-transaction check that both flows and later UC-SPA-16 reuse), `CustomerBookingService` in `UseCases/Bookings` and `PurchaseService` in the new `UseCases/Purchases`. Order creation moves into a reusable `OrderPlacement` so book-now creates its order exactly like `POST /me/orders`. `EntitlementIssuer`, `PaymentService` and `OrderExpiryService` learn about held appointments. No schema change.

**Tech Stack:** .NET 9, EF Core 9 + Npgsql, PostgreSQL 17, FluentValidation, xUnit + NSubstitute + FluentAssertions, Testcontainers.

**Spec:** `docs/specs/bookings.md` (UC-SPA-15, "đợt 2") and `docs/specs/purchases-treatments.md` (UC-SPA-18), approved 2026-10-30 with every proposed default (Q-03 hold = 15 + 5 min, Q-27…Q-32, items 1–17 of the review list).

## Global Constraints

- Code names from the glossary: `BookNow`, `BookFromEntitlement`, folders `Bookings` and `Purchases` (new), routes `/me/appointments`, `/me/appointments/book-now`, `/me/purchases`, `/me/purchases/services/{id}`, `/me/purchases/packages/{id}`. Messages in Vietnamese with diacritics.
- Error codes exactly: existing `validation_error`, `appointment_in_past` (400), `staff_not_qualified` (400), `staff_not_found` (404, reuse `StaffErrors.StaffNotFound()`), `service_not_found` (reuse `CatalogErrors`), `appointment_not_found` (404), `slot_unavailable`, `customer_busy`, `outside_work_schedule` (409), promotion/amount codes of UC-SPA-11 unchanged. New: `slot_too_soon` (400), `session_too_early` (400), `entitlement_not_eligible` (409), `entitlement_not_found`, `treatment_session_not_found`, `customer_package_not_found` (404). Someone else's entitlement/session/package/appointment → the same 404 as missing.
- New policies in `Permissions.cs`: `appointment.self` → `[Customer]`, `purchase.self` → `[Customer]`.
- Config (no `.env` variable): `Booking:AutoAssignStrategy` = `"least_busy"` (only accepted value; anything else fails `ValidateOnStart`), `Booking:ReleaseHoldOnPaymentFailure` = `false`, `Purchases:MaxListItems` = `200` (`[Range(1, 1000)]`). Hold = `payment_due_at_utc + OrderExpiry:GraceMinutes`.
- Lock order everywhere: (appointment row) → staff row(s) in ascending `id` → customer row. Auto-assign locks every candidate in one `FOR NO KEY UPDATE … ORDER BY id`.
- No migration; `PersistenceModelTests` must still pass with no pending model change.
- Do not change behaviour of finished UCs (01–03, 06, 07, 09–11, 14, 17, 22, 23); additive fields only (`OrderDetailDto.Appointment`, `AvailabilityQuery` sources); all existing tests pass.
- DI through constructors into `private readonly` fields; Application references neither ASP.NET Core nor EF Core.
- "Now" VN = `SpaTime.ToLocal(_clock.UtcNow)`, today = `SpaTime.Today(_clock.UtcNow)`; `DateOnly`/`TimeOnly` VN local, JSON `yyyy-MM-dd` / `HH:mm`.
- TDD: unit tests with NSubstitute and a fixed clock; integration tests with `PostgresFixture` + `AuthApiFactory` (`TestClock`, `FakePaymentGateway`, `OrderExpiry:Enabled=false`).
- Docs: `docs/progress.md`, glossary, `open-questions.md`, `data_api.py` (edit rows in place only), Postman (`backend/postman/generate_collection.py`), root + backend `CLAUDE.md`, both spec status lines, `orders.md` ORD-LATER-03.
- The user runs git: no commits or pushes; each "Checkpoint" = build + the task's tests. No Co-Authored-By or "Generated with" lines anywhere.

## Review Focus

- Book-now at the UTC day boundary: clock `2026-10-30T16:50Z` (= 23:50 on 30/10 VN), hold ends 00:10 on 31/10 → a 31/10 00:00 slot is `slot_too_soon`, 00:30 is accepted → Task 2 test `SlotTooSoonAcrossMidnight`.
- Book-now slot whose end wraps midnight (23:30 + 60') → `409 outside_work_schedule`, not a 500 from `ck_appointments_time_range` → Task 3 test `EndWrappingMidnightIsOutsideSchedule`.
- Payment result for a book-now order arrives twice (IPN + return URL): the second must not create a second entitlement or re-confirm → Task 6 test `DuplicateCallbackConfirmsOnce` (relies on `payment.IsOpen`).
- Customer books flow 2 for a session whose previous session's appointment was cancelled (session back to `not_booked`): the next session is not eligible (earlier session not booked) and `nextSession` points to the earlier one → Task 2 test `CancelledPreviousSessionBlocksNext`, Task 9 `NextSessionIsLowestNotBooked`.
- Concurrency failure on insert (EXCLUDE) during book-now with an `Idempotency-Key`: must surface `409 slot_unavailable`, not be swallowed by the idempotency "winner" lookup → Task 5 test `ExcludeViolationWithIdempotencyKeyIsSlotUnavailable`.

---

### Task 1: Domain transitions, options, errors

**Files:**

- Modify: `backend/src/Domain/Entities/{Appointment,ServiceEntitlement,TreatmentSession}.cs`
- Modify: `backend/src/Application/Common/Options/BookingOptions.cs`, `backend/src/API/appsettings.json`, `backend/src/Infrastructure/DependencyInjection.cs` (options validation)
- Create: `backend/src/Application/Common/Options/PurchasesOptions.cs`, `backend/src/Application/UseCases/Purchases/PurchaseErrors.cs`
- Modify: `backend/src/Application/UseCases/Bookings/BookingErrors.cs`
- Test: `backend/tests/Domain.Tests/Bookings/AppointmentTransitionTests.cs` (extend), `backend/tests/Application.Tests/Bookings/BookingOptionsTests.cs`

**Interfaces — Produces:**

- `Appointment.ConfirmPaidHold(Guid serviceEntitlementId)`: Held → Confirmed, sets `ServiceEntitlementId`; other status → `InvalidOperationException`. `Appointment.HoldExpired` already via `ExpireHold()`.
- `ServiceEntitlement.Book()`: Available → Booked, else throw. `TreatmentSession.Book()`: NotBooked → Booked, else throw.
- `BookingOptions`: `[Required] string AutoAssignStrategy = BookingOptions.LeastBusy` (`public const string LeastBusy = "least_busy"`), `bool ReleaseHoldOnPaymentFailure`; DI `.Validate(o => o.AutoAssignStrategy == LeastBusy, "Booking:AutoAssignStrategy must be least_busy.")`.
- `PurchasesOptions { SectionName = "Purchases"; [Range(1, 1000)] int MaxListItems = 200 }`, bound with `ValidateDataAnnotations().ValidateOnStart()`.
- `BookingErrors` adds: `SlotTooSoon()` 400 `"Khung giờ quá gần, vui lòng chọn giờ bắt đầu sau khi hết thời gian giữ chỗ."`; `SessionTooEarly(DateOnly earliest)` 400 `$"Buổi này chỉ đặt được từ ngày {earliest:dd/MM/yyyy}."`; `EntitlementNotEligible(string reason)` 409 (message = `reason`); `EntitlementNotFound()` 404 `"Không tìm thấy dịch vụ đã mua."`; `TreatmentSessionNotFound()` 404 `"Không tìm thấy buổi chăm sóc."`.
- `PurchaseErrors.CustomerPackageNotFound()` 404 `"Không tìm thấy gói đã mua."` (`customer_package_not_found`).

- [ ] Write tests: `ConfirmPaidHoldOnlyFromHeld`, `EntitlementBookOnlyFromAvailable`, `SessionBookOnlyFromNotBooked`; `BookingOptionsTests.UnknownStrategyFailsValidation` (build a `ServiceCollection` with the same registration helper the API uses). Run `dotnet test backend/tests/Domain.Tests backend/tests/Application.Tests` → FAIL.
- [ ] Implement; add `"AutoAssignStrategy": "least_busy"`, `"ReleaseHoldOnPaymentFailure": false` to `Booking` and `"Purchases": { "MaxListItems": 200 }` in `appsettings.json`. Run → PASS.
- [ ] Checkpoint: `dotnet build backend/NhuNguyetSpa.sln`.

### Task 2: Pure rules — effective status, eligibility, staff picker

**Files:**

- Create: `backend/src/Application/UseCases/Purchases/PurchaseStatus.cs`, `backend/src/Application/UseCases/Bookings/{EntitlementEligibility,StaffPicker,SessionBookingFacts}.cs`
- Test: `backend/tests/Application.Tests/Purchases/PurchaseStatusTests.cs`, `backend/tests/Application.Tests/Bookings/{EntitlementEligibilityTests,StaffPickerTests}.cs`

**Interfaces — Produces:**

- `PurchaseStatus.Effective(EntitlementStatus status, DateTime? expiresAtUtc, DateTime nowUtc) → EntitlementStatus` and `Effective(CustomerPackageStatus status, DateTime? expiresAtUtc, DateTime nowUtc) → CustomerPackageStatus` (BR-TRT-04: Available/Active with `expiresAtUtc <= now` → Expired, otherwise unchanged).
- `record PreviousVisit(DateOnly Date, TimeOnly EndTime)`; `record SessionBookingFacts(Guid SessionId, Guid SpaServiceId, int DurationMinutes, int SequenceNumber, TreatmentSessionStatus Status, CustomerPackageStatus PackageStatus, DateTime? PackageExpiresAtUtc, TreatmentPlanStatus PlanStatus, bool EarlierSessionsDone, PreviousVisit? Previous, int MinDaysBetweenSessions)`. `EarlierSessionsDone` = every lower `SequenceNumber` is Booked/Completed/Skipped. `Previous` = latest appointment of session `SequenceNumber − 1` with status occupying/Completed/NoShow; null for session 1 or none.
- `record SessionEligibility(bool CanBook, string? Reason, DateOnly EarliestDate)`.
- `EntitlementEligibility.ForService(EntitlementStatus status, DateTime? expiresAtUtc, DateTime nowUtc) → string?` (null = eligible; reasons: `"Dịch vụ này đã được đặt lịch."`, `"Dịch vụ này đã được sử dụng."`, `"Dịch vụ đã hết hạn sử dụng."`).
- `EntitlementEligibility.ForSession(SessionBookingFacts facts, DateTime nowUtc) → SessionEligibility`: reason order — session not NotBooked (`"Buổi này đã được đặt lịch hoặc đã hoàn thành."`), package effective status not Active (`"Gói đã hết hạn hoặc không còn sử dụng."`), plan Paused/Cancelled (`"Liệu trình đang tạm dừng hoặc đã hủy."`), `!EarlierSessionsDone` (`"Cần đặt lịch các buổi trước theo thứ tự."`). `EarliestDate` = max(today, `Previous.Date + MinDaysBetweenSessions`).
- `EntitlementEligibility.EnsureSessionSlot(SessionBookingFacts facts, DateOnly date, TimeOnly start, DateTime nowUtc)`: throws `EntitlementNotEligible(reason)` when `ForSession` fails; `SessionTooEarly(earliest)` when `date < EarliestDate` or (`date == Previous.Date` and `start < Previous.EndTime`); `EntitlementNotEligible("Ngày hẹn phải trước hạn sử dụng của gói.")` when `date + start` (VN) ≥ package expiry in VN (Q-30).
- `EntitlementEligibility.EnsureBookNowStart(DateOnly date, TimeOnly start, DateTime holdExpiresAtUtc)`: `date + start < SpaTime.ToLocal(holdExpiresAtUtc)` → `SlotTooSoon` (BR-BKG-15).
- `StaffPicker.PickLeastBusy(IReadOnlyList<(AvailabilityCandidate Candidate, int OccupyingCount)> free) → AvailabilityCandidate?` — min count, then `FullName` (ordinal, `StringComparer.Ordinal`), then `StaffMemberId`.

- [ ] Write tests: `PurchaseStatusTests` (expired by time, used stays used, null expiry never expires); `EntitlementEligibilityTests` — each reason, `EarliestDateUsesPreviousPlusMinDays` (prev 29/10, min 7 → 05/11), `FirstSessionHasNoMinimum`, `SameDayBeforePreviousEndIsTooEarly`, `StartAtOrAfterPackageExpiryIsNotEligible`, `CancelledPreviousSessionBlocksNext` (`EarlierSessionsDone = false`), `SlotTooSoonAcrossMidnight`; `StaffPickerTests` — fewest wins, tie by name, tie by id, empty → null. Run → FAIL.
- [ ] Implement; run → PASS.
- [ ] Checkpoint: `dotnet test backend/tests/Application.Tests`.

### Task 3: Shared slot reservation (A9)

**Files:**

- Create: `backend/src/Application/UseCases/Bookings/BookingSlotReserver.cs`
- Modify: `backend/src/Application/Interfaces/Repositories/IStaffMemberRepository.cs`, `backend/src/Infrastructure/Repositories/StaffMemberRepository.cs`, `backend/src/Application/DependencyInjection.cs`
- Test: `backend/tests/Application.Tests/Bookings/BookingSlotReserverTests.cs`

**Interfaces:**

- Consumes: `IStaffMemberRepository.GetAvailabilityCandidatesAsync/GetWithUsersAsync/HasSkillAsync`, `IWorkScheduleRepository.GetActiveRangesAsync`, `IAppointmentRepository.ExpireHeldAsync/GetOccupyingForStaffOnAsync/GetCustomerOccupyingOnAsync/LockCustomerForBookingAsync`, `AppointmentOccupancy.Overlaps`, Task 2 `StaffPicker`.
- Produces: `IStaffMemberRepository.LockManyForBookingAsync(IReadOnlyCollection<Guid> staffMemberIds, CancellationToken ct)` (`SELECT 1 FROM staff_members WHERE id = ANY({ids}) ORDER BY id FOR NO KEY UPDATE`).
- Produces: `BookingSlotReserver.ReserveAsync(Guid customerId, Guid spaServiceId, DateOnly date, TimeOnly start, int durationMinutes, Guid? staffMemberId, CancellationToken ct) → Task<ReservedSlot>`, `record ReservedSlot(Guid StaffMemberId, TimeOnly End)`. Call only inside a transaction. Order:
  1. End via `start.Add(duration, out wrapped)`; `wrapped > 0` → `OutsideWorkSchedule`. `date + start <= now VN` → `InPast`.
  2. Candidates = `GetAvailabilityCandidatesAsync(service, date, staffMemberId)`. Specific staff with no candidate: user missing or not Active → `StaffNotFound`; `!HasSkillAsync` → `StaffNotQualified`; else `OutsideWorkSchedule`.
  3. Keep candidates with one active shift containing `[start, end)`; specific staff dropped → `OutsideWorkSchedule`; auto with none → `SlotUnavailable`.
  4. `LockManyForBookingAsync(kept ids)` → `LockCustomerForBookingAsync(customerId)` → `ExpireHeldAsync` for each kept id.
  5. Staff busy = `GetOccupyingForStaffOnAsync(kept, date, now, null)`; free = kept without overlap. Specific staff busy / auto none free → `SlotUnavailable`.
  6. Customer busy overlap → `CustomerBusy`.
  7. Specific → that staff; auto → `StaffPicker.PickLeastBusy` with each free staff's occupying count that day.

- [ ] Write `BookingSlotReserverTests` (NSubstitute, clock `2026-10-30T02:00Z` = 09:00 VN): `EndWrappingMidnightIsOutsideSchedule`, `StartInPastIsInPast`, `UnknownStaffIsStaffNotFound`, `UnqualifiedStaffIsStaffNotQualified`, `SpanningTwoShiftsIsOutsideSchedule`, `BusyStaffIsSlotUnavailable`, `CustomerBusyAfterStaffCheck`, `AutoPicksLeastBusy`, `AutoWithNobodyFreeIsSlotUnavailable`, `LocksStaffThenCustomerThenExpires` (`Received.InOrder`). Run → FAIL.
- [ ] Implement reserver + repo method; run → PASS.
- [ ] Checkpoint: `dotnet test backend/tests/Application.Tests`.

### Task 4: Repository reads for booking and purchases

**Files:**

- Modify: `backend/src/Application/Interfaces/Repositories/{IAppointmentRepository,IOrderRepository}.cs`, `backend/src/Infrastructure/Repositories/{AppointmentRepository,OrderRepository}.cs`
- Create: `backend/src/Application/Interfaces/Repositories/IPurchaseRepository.cs`, `backend/src/Infrastructure/Repositories/PurchaseRepository.cs` (register in Infrastructure DI)
- Create: `backend/src/Application/DTOs/Bookings/{MyAppointmentDto,AppointmentSource}.cs`, `backend/src/Application/DTOs/Orders/OrderAppointmentDto.cs`, `backend/src/Application/DTOs/Purchases/{PurchasedServiceDto,PurchasedPackageDto,PurchasesDto,PurchaseListQuery,PurchasedServiceRow,PurchasedPackageRow}.cs`
- Modify: `backend/src/Application/DTOs/Orders/OrderDetailDto.cs` (append `OrderAppointmentDto? Appointment`), `OrderService.GetAsync` mapping
- Test: `backend/tests/IntegrationTests/Bookings/CustomerBookingRepositoryTests.cs`, `backend/tests/IntegrationTests/Purchases/PurchaseRepositoryTests.cs`

**Interfaces — Produces:**

- `enum AppointmentSource { Entitlement, Session, BookNow }` (snake_case JSON like other enums). Rule: `TreatmentSessionId != null` → Session; else `OrderItemId != null` → BookNow (stays BookNow after payment links the entitlement); else Entitlement.
- `record MyAppointmentDto(Guid Id, DateOnly Date, TimeOnly StartTime, TimeOnly EndTime, AppointmentStatus Status, DateTime? HoldExpiresAtUtc, DateTime? CancelledAtUtc, string? CancellationReason, DateTime CreatedAtUtc, AppointmentServiceDto Service, AppointmentStaffDto Staff, AppointmentSource Source, Guid? ServiceEntitlementId, MyTreatmentSessionRefDto? TreatmentSession, MyAppointmentOrderDto? Order)`; `MyTreatmentSessionRefDto(Guid Id, int SequenceNumber, Guid CustomerPackageId, string PackageName)`; `MyAppointmentOrderDto(Guid Id, string Code, OrderStatus Status)`. Service via existing `AppointmentServiceSource`.
- `record OrderAppointmentDto(Guid Id, DateOnly Date, TimeOnly StartTime, TimeOnly EndTime, AppointmentStatus Status, AppointmentStaffDto Staff)`; `OrderRepository.GetDetailAsync` fills it from the latest appointment whose `OrderItem.OrderId == id`.
- `IAppointmentRepository` adds `GetMineAsync(Guid id, Guid customerId, ct) → Task<MyAppointmentDto?>` and `GetHoldsForOrdersAsync(IReadOnlyCollection<Guid> orderIds, ct) → Task<IReadOnlyList<Appointment>>` (tracked, `OrderItemId` in those orders, status Held or HoldExpired).
- `IPurchaseRepository`:
  `GetEntitlementForBookingAsync(Guid id, Guid customerId, ct) → Task<(ServiceEntitlement Entitlement, Guid SpaServiceId)?>` (tracked);
  `GetSessionFactsAsync(Guid sessionId, Guid customerId, ct) → Task<SessionBookingFacts?>` (projection, never cached; `MinDaysBetweenSessions` from the current `service_package_items` row of the package bought on the order line with the session's `SpaServiceId`, 0 if gone);
  `GetSessionForUpdateAsync(Guid sessionId, ct) → Task<TreatmentSession?>` (tracked);
  `ListServicesAsync(Guid customerId, int max, ct) → Task<IReadOnlyList<PurchasedServiceRow>>` and `ListPackagesAsync(Guid customerId, int max, ct) → Task<IReadOnlyList<PurchasedPackageRow>>`, newest first;
  `GetServiceAsync(Guid id, Guid customerId, ct) → Task<PurchasedServiceRow?>`, `GetPackageAsync(Guid id, Guid customerId, bool withItems, ct) → Task<PurchasedPackageRow?>`.
- Rows carry raw stored values; services compute effective status. `PurchasedServiceRow(Guid Id, Guid SpaServiceId, string ServiceName, string? ImageUrl, int DurationMinutes, EntitlementStatus Status, DateTime? ExpiresAtUtc, DateTime PurchasedAtUtc, PurchaseAppointmentDto? Appointment, PurchaseOrderRefDto Order)` (`PurchasedAtUtc` = succeeded payment `PaidAtUtc` ?? order `CreatedAtUtc`; appointment = latest occupying or Completed). `PurchasedPackageRow(Guid Id, Guid ServicePackageId, string PackageName, string? ImageUrl, CustomerPackageStatus Status, DateTime PurchasedAtUtc, DateTime? ActivatedAtUtc, DateTime? ExpiresAtUtc, int TotalSessions, int UsedSessions, int BookedSessions, Guid TreatmentPlanId, TreatmentPlanStatus TreatmentPlanStatus, SessionBookingFacts? NextSession, string? NextSessionServiceName, IReadOnlyList<PackageItemProgressDto>? Items, PurchaseOrderRefDto Order)`; `PackageItemProgressDto(Guid SpaServiceId, string ServiceName, int TotalSessions, int CompletedSessions, int BookedSessions)`; `PurchaseOrderRefDto(Guid Id, string Code)`; `PurchaseAppointmentDto(Guid Id, DateOnly Date, TimeOnly StartTime, TimeOnly EndTime, AppointmentStatus Status)`.

- [ ] Write repository tests (Postgres, seed through `OrderApi`/`EntitlementIssuer` or direct inserts): `MineHidesOtherCustomers`, `MineSourceForEachKind`, `HoldsForOrdersReturnsHeldAndExpired`, `OrderDetailIncludesBookNowAppointment`, `SessionFactsComputesEarlierDoneAndPrevious`, `SessionFactsMinDaysFromPackageItem`, `ListsNewestFirstAndCapped`, `PurchasedAtUsesPaidAtOrCreatedForZeroOrder`, `PackageCountsAndItems`. Run → FAIL.
- [ ] Implement; run → PASS; run existing `Orders` integration tests → PASS (additive DTO field).
- [ ] Checkpoint: build + `dotnet test backend/tests/IntegrationTests --filter "FullyQualifiedName~Bookings|FullyQualifiedName~Orders|FullyQualifiedName~Purchases"`.

### Task 5: Reusable order placement + book-now

**Files:**

- Create: `backend/src/Application/UseCases/Orders/OrderPlacement.cs`
- Modify: `backend/src/Application/UseCases/Orders/OrderService.cs` (delegate creation to `OrderPlacement`; keep public behaviour)
- Create: `backend/src/Application/Interfaces/Services/Bookings/ICustomerBookingService.cs`, `backend/src/Application/UseCases/Bookings/CustomerBookingService.cs`, `backend/src/Application/DTOs/Bookings/{BookNowRequest,BookAppointmentRequest,BookNowResult}.cs`, `backend/src/Application/Validators/Bookings/{BookNowRequestValidator,BookAppointmentRequestValidator}.cs`
- Test: `backend/tests/Application.Tests/Bookings/{CustomerBookingServiceTests,BookingRequestValidatorTests}.cs`, existing `Application.Tests/Orders/*` stay green

**Interfaces:**

- Consumes: Task 2 `EntitlementEligibility`, Task 3 `BookingSlotReserver`, Task 4 repositories, `EntitlementIssuer` (Task 6 changes its linking; this task only needs it called).
- Produces: `OrderPlacement.PlaceAsync(OrderRequest request, Guid customerId, Guid? idempotencyKey, Func<Order, CancellationToken, Task>? attach, CancellationToken ct) → Task<Order>` — the current `BuildAndSaveAsync` body, then `attach(order)`, then `SaveChangesAsync`, then (grand total 0) `MarkPaid` + `EntitlementIssuer.IssueAsync` + `SaveChangesAsync`. Runs in the caller's transaction. `OrderService.CreateAsync` keeps its idempotency handling and calls it with `attach: null`.
- Produces: `BookNowRequest(Guid? SpaServiceId, DateOnly? Date, TimeOnly? StartTime, Guid? StaffMemberId, string? PromotionCode)`; `BookAppointmentRequest(Guid? ServiceEntitlementId, Guid? TreatmentSessionId, DateOnly? Date, TimeOnly? StartTime, Guid? StaffMemberId)`; `BookNowResult(MyAppointmentDto Appointment, OrderDetailDto Order, bool Created)`.
- Validators: required fields; flow 2 exactly one source; `Date` in `[today, today + MaxDaysAhead]`; `StartTime` seconds 0 and `(minutes since 00:00) % SlotStepMinutes == 0`; `PromotionCode` ≤ 50.
- `ICustomerBookingService`: `BookNowAsync(BookNowRequest, Guid? idempotencyKey, ct) → Task<OperationResult<BookNowResult>>`; `BookFromEntitlementAsync(BookAppointmentRequest, ct) → Task<OperationResult<MyAppointmentDto>>`; `GetAsync(Guid id, ct) → Task<OperationResult<MyAppointmentDto>>` (404 when `GetMineAsync` is null).
- Book-now: idempotency lookup first (existing order → its appointment via `GetHoldsForOrdersAsync`/`GetMineAsync`, `Created = false`); service on sale via `ISpaServiceRepository.GetDetailAsync(id, true)` → `ServiceNotFound`; `holdEnd = now + PaymentTimeoutMinutes + GraceMinutes`; `EnsureBookNowStart`; in one transaction: `ReserveAsync` → `PlaceAsync(new OrderRequest(BuyNow, serviceId, null, promo), …, attach: add Appointment { CustomerId, StaffMemberId, OrderItemId = order.Items.Single().Id, Date, StartTime, EndTime, Status = Held, HoldExpiresAtUtc = order.PaymentDueAtUtc + Grace })`. Catch `ConflictException` with key only when the winner lookup finds an order (same as `OrderService`).
- Flow 2: read source without lock (entitlement → `ForService`, session → facts) for service id and duration (entitlement: current `spa_services.duration_minutes`; session: snapshot); transaction: `ReserveAsync` → re-read source (fresh) and re-check → session: `EnsureSessionSlot` → `Book()` source → add Appointment `Confirmed` with `ServiceEntitlementId`/`TreatmentSessionId` → save → `GetMineAsync`.

- [ ] Write `BookingRequestValidatorTests` (both sources, none, off-grid 09:15, seconds, +61 days) and `CustomerBookingServiceTests`: `BookNowCreatesHeldAppointmentLinkedToOrderLine`, `BookNowHoldEndsAtDuePlusGrace`, `BookNowDiscontinuedServiceIsNotFound`, `BookNowReplayReturnsExisting`, `ExcludeViolationWithIdempotencyKeyIsSlotUnavailable`, `FlowTwoBooksEntitlement`, `FlowTwoRereadsAfterLock` (second read says Booked → `EntitlementNotEligible`), `FlowTwoSessionTooEarly`, `FlowTwoOthersEntitlementIsNotFound`. Run → FAIL.
- [ ] Implement `OrderPlacement`, refactor `OrderService`, implement booking service + validators; run Bookings + Orders unit tests → PASS.
- [ ] Checkpoint: `dotnet test backend/tests/Application.Tests`.

### Task 6: Payment, zero-amount and expiry link held appointments

**Files:**

- Modify: `backend/src/Application/UseCases/Payments/{EntitlementIssuer,PaymentService,OrderExpiryService}.cs`
- Test: `backend/tests/Application.Tests/Payments/{EntitlementIssuerTests,PaymentServiceTests,OrderExpiryServiceTests}.cs` (extend)

**Interfaces:**

- Consumes: `IAppointmentRepository.GetHoldsForOrdersAsync`, Task 1 transitions, `IOptions<BookingOptions>`.
- `EntitlementIssuer` (add `IAppointmentRepository`, `ILogger<EntitlementIssuer>`): per service line, hold for that line Held → entitlement `Booked` + `hold.ConfirmPaidHold(entitlement.Id)` (BR-BKG-06; also when past `HoldExpiresAtUtc` but still Held); HoldExpired → entitlement `Available`, `LogWarning("Order {OrderCode} paid after hold {AppointmentId} expired; entitlement left available.")` (Q-27); no hold → `Available` as today.
- `PaymentService`: on failed result with `ReleaseHoldOnPaymentFailure`, Held holds of the order → `ExpireHold()` (Q-28); default leaves them.
- `OrderExpiryService`: after expiring the batch, Held holds of those orders → `ExpireHold()`, same transaction.

- [ ] Write tests: `IssuerConfirmsHeldHold`, `IssuerConfirmsHeldEvenPastHoldTime`, `IssuerLeavesExpiredHoldAndEntitlementAvailable`, `FailureKeepsHoldByDefault`, `FailureReleasesHoldWhenConfigured`, `ExpiryExpiresHoldsOfExpiredOrders`, `DuplicateCallbackConfirmsOnce`. Run → FAIL.
- [ ] Implement; run → PASS (existing payment tests unchanged).
- [ ] Checkpoint: `dotnet test backend/tests/Application.Tests`.

### Task 7: Availability by entitlement / session

**Files:**

- Modify: `backend/src/Application/DTOs/Bookings/AvailabilityQuery.cs`, `backend/src/Application/Validators/Bookings/AvailabilityQueryValidator.cs`, `backend/src/Application/UseCases/Bookings/AvailabilityService.cs`, `backend/src/API/Controllers/AvailabilityController.cs`
- Test: `backend/tests/Application.Tests/Bookings/AvailabilityServiceTests.cs` (extend)

**Interfaces:**

- `AvailabilityQuery` adds `Guid? ServiceEntitlementId`, `Guid? TreatmentSessionId`; validator: exactly one of the three sources.
- New sources only for role customer, owned by caller (else `EntitlementNotFound` / `TreatmentSessionNotFound`, also for guests). Entitlement: service from its order line, duration from the service, discontinued allowed (Q-29). Session: facts from `GetSessionFactsAsync`, duration snapshot; `date < EarliestDate` or `date` on/after the package-expiry VN date → empty `staff`; same date as `Previous` → add busy range `(00:00, Previous.EndTime)` so earlier slots drop.

- [ ] Write tests: `EntitlementSourceAllowsDiscontinuedService`, `SessionSourceUsesSnapshotDuration`, `SessionBeforeEarliestDateIsEmpty`, `SessionSameDayDropsSlotsBeforePreviousEnd`, `GuestWithEntitlementIsNotFound`, `TwoSourcesIsValidationError`. Run → FAIL.
- [ ] Implement; run → PASS (existing availability tests unchanged).
- [ ] Checkpoint: `dotnet test backend/tests/Application.Tests`.

### Task 8: Booking API, policy and end-to-end tests

**Files:**

- Create: `backend/src/API/Controllers/MyAppointmentsController.cs`
- Modify: `backend/src/API/Authorization/Permissions.cs` (`AppointmentSelf`, `PurchaseSelf`)
- Test: `backend/tests/IntegrationTests/Bookings/{CustomerBookingApi,CustomerBookingEndpointsTests,CustomerBookingConcurrencyTests}.cs`

**Interfaces:**

- `[Route("api/v1/me/appointments")]`, `[Authorize(Policy = Permissions.AppointmentSelf)]`: `POST book-now` (header `Idempotency-Key` parsed exactly like `MyOrdersController`, 201 + `Location: /api/v1/me/appointments/{appointment.id}` or 200 on replay), `POST ""` (201 + `Location`), `GET {id:guid}` (200).
- `CustomerBookingApi`: wraps `BookingApi`/`OrderApi`/`StaffApi` seeds + `BookNowAsync`, `BookAsync`, `PayWithFakeGatewayAsync(orderId, success)` (create payment + call IPN with `FakePaymentGateway` params).

- [ ] Write endpoint tests mapping spec rows: BKG-T25, T26, T27 (`IOrderExpiryService.ExpireOverdueAsync` after advancing `TestClock` 21'), T28, T29 (both variants), T30, T31, T32, T34, T35, T36, T37, T38, T39, T41, T43, T44, T45, T46, T47, T48, TRT-T09-ready data; concurrency tests T33 (two customers, `Task.WhenAll`, one 201 one 409, 1 order + 1 appointment in DB), T40 (same entitlement two slots), T42 (two auto-assign, two staff free → both 201, different staff, finishes < 10 s). Run → FAIL.
- [ ] Implement controller + policies; run → PASS.
- [ ] Checkpoint: `dotnet test backend/NhuNguyetSpa.sln` (BKG-T49).

### Task 9: Purchases use case and API (UC-SPA-18)

**Files:**

- Create: `backend/src/Application/Interfaces/Services/Purchases/IPurchaseService.cs`, `backend/src/Application/UseCases/Purchases/PurchaseService.cs`, `backend/src/Application/Validators/Purchases/PurchaseListQueryValidator.cs`, `backend/src/API/Controllers/MyPurchasesController.cs`
- Test: `backend/tests/Application.Tests/Purchases/PurchaseServiceTests.cs`, `backend/tests/IntegrationTests/Purchases/PurchaseEndpointsTests.cs`

**Interfaces:**

- `PurchaseListQuery(string? Type, string? Status)`: `Type` ∈ `service|package`; `Status` requires `Type`, values per type (`available|booked|used|expired` / `active|completed|expired|cancelled`).
- `PurchasedServiceDto(Guid Id, Guid SpaServiceId, string ServiceName, string? ImageUrl, int DurationMinutes, EntitlementStatus Status, DateTime? ExpiresAtUtc, DateTime PurchasedAtUtc, bool CanBook, PurchaseAppointmentDto? Appointment, PurchaseOrderRefDto Order)`; `PurchasedPackageDto(Guid Id, Guid ServicePackageId, string PackageName, string? ImageUrl, CustomerPackageStatus Status, DateTime PurchasedAtUtc, DateTime? ActivatedAtUtc, DateTime? ExpiresAtUtc, int TotalSessions, int UsedSessions, int BookedSessions, PurchaseTreatmentPlanDto TreatmentPlan, NextSessionDto? NextSession, IReadOnlyList<PackageItemProgressDto>? Items, PurchaseOrderRefDto Order)`; `PurchaseTreatmentPlanDto(Guid Id, TreatmentPlanStatus Status)`; `NextSessionDto(Guid Id, int SequenceNumber, Guid SpaServiceId, string ServiceName, int DurationMinutes, bool CanBook, DateOnly EarliestDate)`; `PurchasesDto(IReadOnlyList<PurchasedServiceDto> Services, IReadOnlyList<PurchasedPackageDto> Packages)`.
- `IPurchaseService`: `ListAsync(PurchaseListQuery, ct) → OperationResult<PurchasesDto>`, `GetServiceAsync(Guid, ct)` (404 `EntitlementNotFound`), `GetPackageAsync(Guid, ct)` (404 `CustomerPackageNotFound`, with `Items`). Status = `PurchaseStatus.Effective`, `CanBook` = `ForService(...) == null`, `NextSession` from `ForSession`; filter by effective status in memory; list omits `Items`.
- `[Route("api/v1/me/purchases")]`, `[Authorize(Policy = Permissions.PurchaseSelf)]`: `GET ""`, `GET services/{id:guid}`, `GET packages/{id:guid}`.

- [ ] Write `PurchaseServiceTests` (fixed clock): TRT-T04, T05 validation, T07, `NextSessionIsLowestNotBooked`; and `PurchaseEndpointsTests`: TRT-T01, T02, T03, T06 (same date as `POST /me/appointments` rejects), T08, T09, T10. Run → FAIL.
- [ ] Implement; run → PASS.
- [ ] Checkpoint: `dotnet test backend/NhuNguyetSpa.sln` (TRT-T11).

### Task 10: Docs, Postman, Definition of Done

**Files:**

- Modify: `docs/spec-source/data_api.py` rows BKG 061 (`idDichVuKhachHang?`, `idBuoiChamSoc?` no longer "đợt 2"), 062 (`idNhanVien?`, `slot_too_soon`, response with `donHang`), 063 (no `Idempotency-Key`, `idNhanVien?`, `409 ENTITLEMENT_NOT_ELIGIBLE`, `400 SESSION_TOO_EARLY`), 065 ("làm cùng UC-SPA-15"), TRT 065–067 (`type`/`status`, fields, 404 codes) — in place, regenerate Excel per `docs/spec-source/README.md`.
- Modify: `docs/decisions/open-questions.md` (Q-02 note luồng 2 `confirmed`; Q-03 → "Đã chốt 30/10/2026: giữ chỗ = 15 + 5 phút"; Q-26 implemented; add Q-27…Q-32 with defaults as in the specs, `Đã chốt 30/10/2026`); `docs/domain/glossary.md` (`Purchases` folder created, `BookingSlotReserver`, `OrderPlacement`, effective status, `nextSession`, new error codes, `appointment.self`, `purchase.self`); `docs/progress.md` (UC-SPA-15 ✅ backend, UC-SPA-18 ✅ backend, UC-SPA-16 note "chi tiết lịch của tôi có sẵn", header paragraph); spec status lines in `bookings.md`, `purchases-treatments.md`; `orders.md` ORD-LATER-03 done; `backend/postman/generate_collection.py` (Bookings: book-now, book, my appointment, availability by entitlement/session; new folder Purchases) and regenerate; root `CLAUDE.md` + `backend/CLAUDE.md` (one paragraph each: endpoints, policies, `Booking:AutoAssignStrategy`, `Booking:ReleaseHoldOnPaymentFailure`, `Purchases:MaxListItems`, hold = due + grace, reserver lock order, no migration).
- [ ] Apply the doc changes and regenerate generated files.
- [ ] Definition of Done (`docs/conventions/workflow.md`): `dotnet build backend/NhuNguyetSpa.sln`, `dotnet test backend/NhuNguyetSpa.sln`, `npm run lint`, `npm run typecheck`, `npm run format:check` — all pass; report any failure with its output.

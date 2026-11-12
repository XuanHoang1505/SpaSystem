# Treatment tracking (UC-SPA-19), service history (UC-SPA-20), treatment management (UC-SPA-21) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Backend for customers to follow their treatment plans session by session and see past visits, and for the owner and staff to view, edit and change the status of treatment plans.

**Architecture:** One new column `treatment_plans.status_reason` (migration `AddTreatmentPlanStatusReason`). Domain gets the plan/package/session transitions of BR-TRT-07…09. Application gets the new `UseCases/Treatments` folder (`TreatmentScope` pure rules, `MyTreatmentService` for UC-SPA-19, `TreatmentManagementService` for UC-SPA-21) and `ServiceHistoryService` in `UseCases/Purchases` (UC-SPA-20). Per-session `canBook` reuses `EntitlementEligibility.ForSession`; the service of a visit reuses `AppointmentServiceSource`. Status commands lock the customer row (`LockCustomerForBookingAsync`), then the package row (`GetPackageForUpdateAsync`).

**Tech Stack:** .NET 9, EF Core 9 + Npgsql, PostgreSQL 17, FluentValidation, xUnit + NSubstitute + FluentAssertions, Testcontainers.

**Spec:** `docs/specs/purchases-treatments.md`, "Đợt 2" sections (UC-SPA-19, 20, 21, BR-TRT-06…11, TRT-T12…T32). Approved 2026-10-31: 1A (new column), 2A (Q-37), 3 as written (Q-38), 4 as written, 5A (Q-39), **6B (Q-40: history = `completed` + `no_show`)**, 7 deferred items stay deferred.

## Global Constraints

- Names from the glossary: `TreatmentPlan`, `TreatmentSession`, folder `Treatments` (new: `UseCases/Treatments`, `DTOs/Treatments`, `Validators/Treatments`, `Interfaces/Services/Treatments`); service history lives under `Purchases`. Routes exactly: `/me/treatments`, `/me/treatments/{id}`, `/me/treatments/{id}/sessions/{sessionId}`, `/me/service-history`, `/me/service-history/{appointmentId}`, `/treatments`, `/treatments/{id}`, `/treatments/{id}/sessions/{sessionId}`, `/treatments/{id}/{assign-staff|pause|resume|cancel|complete}`. Messages in Vietnamese with diacritics.
- Error codes exactly. Reused: `validation_error`, `treatment_session_not_found` (404), `appointment_not_found` (404), `staff_not_found` (404), `staff_resigned` (400), `forbidden` (403), `entitlement_not_eligible`, `session_too_early`. New in `TreatmentErrors`: `treatment_plan_not_found` (404) "Không tìm thấy liệu trình.", `treatment_not_in_charge` (403) "Bạn không phụ trách liệu trình này.", `treatment_status_invalid` (409) "Liệu trình đang ở trạng thái {text}, không thể thực hiện thao tác này.", `treatment_has_booked_sessions` (409) "Liệu trình còn buổi đã đặt lịch. Hãy hủy các lịch hẹn đó trước.", `treatment_sessions_remaining` (409) "Liệu trình còn buổi chưa thực hiện, chưa thể đóng.", `treatment_session_completed` (409) "Buổi đã hoàn thành, chỉ chủ spa được sửa ghi chú.".
- New policy `Permissions.TreatmentManage = "treatment.manage"` → `[Owner, Staff]`. `/me/treatments*`, `/me/service-history*` use the existing `purchase.self`. Owner-only commands check `Roles.Contains(Owner)` in Application → `ForbiddenException("Chỉ chủ spa được thực hiện thao tác này.", "forbidden")`.
- Config (no `.env` variable): `Treatments:AssignedStaffCanView` = `true`, `Treatments:ShowSkinProfilesToCustomer` = `false` (`TreatmentsOptions`, bound with `.ValidateOnStart()` like `CareOptions`). Customer list cap reuses `Purchases:MaxListItems` (200). Paging uses `PagedQuery` (1/10, max 100).
- Limits: `goal`, `note` (plan and session) ≤ 2000, trimmed, blank → null; `reason` trimmed 1–500; `search` ≤ 100.
- Staff scope (BR-TRT-06): primary staff, or (option on) staff of an appointment with status `PendingConfirmation|Confirmed|Completed|NoShow` on one of the plan's sessions. Outside scope → 404 `treatment_plan_not_found`. `canEdit` = (owner or primary staff) and plan not `Completed`/`Cancelled`.
- Customer never receives `treatment_plans.note`; skin profile only when `ShowSkinProfilesToCustomer`.
- Service history: appointments of the customer with status `Completed` or `NoShow` only; `result` null for `NoShow`.
- Lock order for `pause|cancel|complete`: customer row → package row, one `IUnitOfWork.ExecuteInTransactionAsync`. `PUT`, session note, `assign-staff`, `resume` lock only the package row.
- Dates: today = `SpaTime.Today(_clock.UtcNow)`; `actual_end_date` on owner `complete` = max `Date` of the plan's `Completed` appointments, else today.
- Schema: edit `docs/spec-source/data_db.py` (`treatment_plans`: `"status_reason|text|Y||Lý do tạm dừng/hủy (ĐX)|LyDoTrangThai"` after `status`), regenerate `data-model.md`, then add the migration. `PersistenceModelTests` must pass.
- Do not change behaviour of finished UCs; `GET /me/purchases*` and booking stay as they are. All existing tests pass.
- DI through constructors into `private readonly` fields; Application references neither ASP.NET Core nor EF Core.
- TDD: unit tests with NSubstitute + fixed clock; integration tests with `PostgresFixture` + `AuthApiFactory` (`TestClock.Offset`), seeding with `PurchaseApi.SeedPackageAsync/SeedSessionAppointmentAsync/SeedEntitlementAppointmentAsync`, `StaffApi`, `BookingApi.LoginStaffAsync/LoginCustomerAsync`.
- Docs: `docs/progress.md`, glossary, `open-questions.md` (Q-37…Q-40), `data_api.py` (edit rows 079–087 in place; append SPA-API-123…127), `data_rules.py` (BR-TRT-06…11, RBAC `treatment.manage` unchanged), Postman (`backend/postman/generate_collection.py`), root + `backend/CLAUDE.md` (new "Treatments" paragraph), spec status line, demo seeder untouched.
- The user runs git: no commits or pushes; each "Checkpoint" = build + the task's tests. No Co-Authored-By or "Generated with" lines anywhere.

## Review Focus

- Staff who is both primary and assigned on a plan, or assigned to two of its sessions, must see the plan once in `GET /treatments` with a correct `totalCount` → Task 4 test `StaffMatchedTwiceListedOnce` (integration, Task 6).
- Package paid but plan `cancelled` while `customer_packages.expires_at_utc` already passed: `packageStatus` must show `cancelled`, not `expired` (stored terminal status beats the effective one, as `PurchaseStatus.Effective` already does) → Task 2 test `CancelledPackageStaysCancelledWhenExpired`.
- `PUT /treatments/{id}` with `expectedEndDate` when `startDate` is still null (not started): accepted; when `startDate` is set later by a completion that is after `expectedEndDate`, nothing breaks (validation only at PUT) → Task 5 test `ExpectedEndDateWithoutStartDateIsAccepted`.
- Owner `resume` on a plan whose package became `completed` meanwhile (last booked session completed while paused): plan is already `completed`, so `resume` → `409 treatment_status_invalid`, not a revert → Task 1 test `ResumeOnlyFromPaused` + Task 6 test `ResumeAfterAutoCompleteIsConflict`.
- Service history filter `spaServiceId` for a book-now visit (source = only `order_item_id` + later `service_entitlement_id`) must match its service → Task 6 test `HistoryFilterMatchesBookNowVisit`.

---

### Task 1: Schema, domain transitions, options, errors, policy

**Files:**

- Modify: `docs/spec-source/data_db.py`, regenerate `docs/domain/data-model.md` (+ Excel) per `docs/spec-source/README.md`
- Modify: `backend/src/Domain/Entities/{TreatmentPlan,CustomerPackage,TreatmentSession}.cs`
- Modify: `backend/src/Infrastructure/Persistence/Configurations/TreatmentPlanConfiguration.cs` (nothing needed beyond the property unless text type must be explicit — match `Note`)
- Create: migration `AddTreatmentPlanStatusReason` (`dotnet ef migrations add AddTreatmentPlanStatusReason --project backend/src/Infrastructure --startup-project backend/src/API --output-dir Persistence/Migrations`)
- Create: `backend/src/Application/Common/Options/TreatmentsOptions.cs`, `backend/src/Application/UseCases/Treatments/TreatmentErrors.cs`, `backend/src/Application/UseCases/Treatments/TreatmentStatusText.cs`
- Modify: `backend/src/Infrastructure/DependencyInjection.cs` (options), `backend/src/API/appsettings.json` (`"Treatments": { "AssignedStaffCanView": true, "ShowSkinProfilesToCustomer": false }`), `backend/src/API/Authorization/Permissions.cs`
- Test: `backend/tests/Domain.Tests/Treatments/TreatmentPlanTransitionTests.cs`

**Interfaces — Produces:**

- `TreatmentPlan.StatusReason: string?`.
- `TreatmentPlan.UpdateDetails(string? goal, DateOnly? expectedEndDate, string? note)`: throws `InvalidOperationException` when `Completed`/`Cancelled`; sets the three fields.
- `TreatmentPlan.AssignPrimaryStaff(Guid? staffMemberId)`: same terminal-status guard.
- `TreatmentPlan.Pause(string reason)`: `NotStarted|InProgress` → `Paused`, `StatusReason = reason`; else throw.
- `TreatmentPlan.Resume(int usedSessions)`: `Paused` → `InProgress` when `usedSessions > 0` else `NotStarted`; `StatusReason = null`; else throw.
- `TreatmentPlan.Cancel(string reason)`: `NotStarted|InProgress|Paused` → `Cancelled`, `StatusReason = reason`; else throw.
- `TreatmentPlan.Close(DateOnly actualEndDate)`: `InProgress|Paused` → `Completed`, `ActualEndDate = actualEndDate`, `StatusReason = null`; else throw.
- `CustomerPackage.Cancel()`: `Active` → `Cancelled` (also when past `ExpiresAtUtc`; an `Expired` row → `Cancelled` too); `Completed|Cancelled` → throw.
- `CustomerPackage.Close()`: `Active|Expired` → `Completed`; else throw. (`UsedSessions` unchanged: CHECK only bounds it.)
- `TreatmentSession.ChangeNote(string? note)`: sets `Note` (rule checks live in Application).
- `TreatmentsOptions { SectionName = "Treatments"; bool AssignedStaffCanView = true; bool ShowSkinProfilesToCustomer; }`.
- `TreatmentErrors` static factories with `…Code` constants for the six new codes (Global Constraints copy); `StatusInvalid(TreatmentPlanStatus status)` uses `TreatmentStatusText.ToVietnamese` ("chưa bắt đầu", "đang thực hiện", "đã hoàn thành", "tạm dừng", "đã hủy") and `TreatmentStatusText.TryParse(string?, out TreatmentPlanStatus)` for the snake_case query values.
- `Permissions.TreatmentManage` → `[SecurityRoles.Owner, SecurityRoles.Staff]`.

- [ ] Edit `data_db.py`, regenerate; add property, migration. Run `dotnet test backend/tests/IntegrationTests --filter "FullyQualifiedName~PersistenceModelTests"` → PASS.
- [ ] Write `TreatmentPlanTransitionTests`: `PauseFromNotStartedAndInProgressStoresReason`, `PauseFromPausedCompletedCancelledThrows`, `ResumeOnlyFromPaused`, `ResumeWithoutUsedSessionsGoesToNotStarted`, `ResumeClearsReason`, `CancelFromAnyOpenStatus`, `CancelCompletedThrows`, `CloseFromInProgressAndPausedSetsEndDate`, `CloseFromNotStartedThrows`, `UpdateDetailsOnTerminalPlanThrows`, `PackageCancelAndCloseFromActiveOrExpired`, `PackageCancelTwiceThrows`. Run `dotnet test backend/tests/Domain.Tests --filter "FullyQualifiedName~Treatments"` → FAIL.
- [ ] Implement; run → PASS. Checkpoint: `dotnet build backend/NhuNguyetSpa.sln`.

### Task 2: Customer treatment reads (UC-SPA-19)

**Files:**

- Create: `backend/src/Application/DTOs/Treatments/{MyTreatmentDtos,TreatmentRows,TreatmentRefDtos}.cs`, `backend/src/Application/Validators/Treatments/MyTreatmentListQueryValidator.cs`, `backend/src/Application/Interfaces/Repositories/ITreatmentRepository.cs`, `backend/src/Infrastructure/Repositories/TreatmentRepository.cs`, `backend/src/Application/Interfaces/Services/Treatments/IMyTreatmentService.cs`, `backend/src/Application/UseCases/Treatments/MyTreatmentService.cs`
- Modify: DI in both layers
- Test: `backend/tests/Application.Tests/Treatments/MyTreatmentServiceTests.cs`

**Interfaces:**

- Consumes: `EntitlementEligibility.ForSession`, `SessionBookingFacts`, `PreviousVisit`, `PurchaseStatus.Effective`, `PurchasesOptions.MaxListItems`, `TreatmentsOptions`.
- Produces:
  - `record StaffRefDto(Guid Id, string FullName)`; `record SessionAppointmentDto(Guid Id, DateOnly Date, TimeOnly StartTime, TimeOnly EndTime, AppointmentStatus Status, StaffRefDto Staff)`; `record OrderRefDto` — reuse the existing one from `DTOs/Purchases` if present, else add `(Guid Id, string Code)` there.
  - Repository rows (plain data, Application-side): `TreatmentPlanRow` (plan columns incl. `StatusReason`, package id/name/status/expires/purchased/total/used, `ImageUrl`, customer id/name/phone, primary staff `StaffRefDto?`, `Order`), `TreatmentSessionRow` (session columns + `MinDaysBetweenSessions` from the package line of its service, 0 when gone), `SessionVisitRow` (appointment id, session id, date, start, end, status, `StaffRefDto`, skin profile id?).
  - `ITreatmentRepository`:
    - `ListForCustomerAsync(Guid customerId, TreatmentPlanStatus? status, int max, CancellationToken) → IReadOnlyList<TreatmentPlanRow>` (newest purchase first).
    - `GetPlanAsync(Guid planId, CancellationToken) → TreatmentPlanRow?`.
    - `GetSessionsAsync(IReadOnlyCollection<Guid> planIds, CancellationToken) → IReadOnlyList<TreatmentSessionRow>` (ordered plan, sequence).
    - `GetVisitsAsync(IReadOnlyCollection<Guid> planIds, CancellationToken) → IReadOnlyList<SessionVisitRow>` (every appointment of those sessions except `Cancelled`/`HoldExpired`, ordered date, start).
  - `MyTreatmentListItemDto`, `MyTreatmentPlanDto`, `MyTreatmentSessionDto` with exactly the fields of the spec's API table ("Đợt 2 — khách hàng"); `MyTreatmentSessionDto.Result` filled only on the single-session endpoint and only when `Completed`; `SkinProfile` summary `(SkinType, CareGoals, RecommendedTreatment)?` only when the option is on.
  - `record MyTreatmentListQuery(string? Status)`; validator: null or a `TreatmentStatusText` value.
  - `IMyTreatmentService`: `ListAsync(MyTreatmentListQuery)`, `GetAsync(Guid id)`, `GetSessionAsync(Guid id, Guid sessionId)` (+ `CancellationToken`) → `OperationResult<…>`. Plan of another customer → `TreatmentPlanNotFound`; session not in plan → `PurchaseErrors`/`BookingErrors` existing `treatment_session_not_found`.
- Session facts per session: `EarlierSessionsDone` = every lower sequence is `Booked|Completed|Skipped`; `Previous` = latest visit (`Date`, `EndTime`) of the session just before (by sequence) among statuses occupying/`Completed`/`NoShow`; package status/expiry and plan status from the plan row. `canBook`/`reason` from `ForSession`; non-`NotBooked` → `canBook = false`, `earliestDate = null`, `reason` from `ForSession` (the "đã được đặt lịch hoặc đã hoàn thành" text). `nextSession` = lowest `NotBooked`. Current appointment = last visit of the session.

- [ ] Write tests: `ListMapsProgressAndNextSession` (TRT-T12 data), `ThirdSessionBookableFourthNeedsOrder`, `EarliestDateIsPreviousVisitPlusGap`, `PausedPlanReasonAndStatusReason` (TRT-T14), `CancelledPackageStaysCancelledWhenExpired`, `SessionDetailHasResultOnlyWhenCompleted`, `PlanNoteNeverReturned` (DTO has no `Note` property — assert via reflection), `SkinProfileOnlyWhenOptionOn`, `OtherCustomersPlanNotFound`, `SessionOfOtherPlanNotFound`, validator `UnknownStatusInvalid`. Run `dotnet test backend/tests/Application.Tests --filter "FullyQualifiedName~MyTreatment"` → FAIL.
- [ ] Implement (repository with projections, no tracking); run → PASS. Checkpoint: build.

### Task 3: Service history (UC-SPA-20)

**Files:**

- Create: `backend/src/Application/DTOs/Purchases/ServiceHistoryDtos.cs`, `backend/src/Application/Validators/Purchases/ServiceHistoryQueryValidator.cs`, `backend/src/Application/Interfaces/Services/Purchases/IServiceHistoryService.cs`, `backend/src/Application/UseCases/Purchases/ServiceHistoryService.cs`
- Modify: `IAppointmentRepository` + `AppointmentRepository` (two methods), DI
- Test: `backend/tests/Application.Tests/Purchases/ServiceHistoryServiceTests.cs`

**Interfaces:**

- Produces:
  - `class ServiceHistoryQuery { DateOnly? FromDate; DateOnly? ToDate; Guid? SpaServiceId; string? Status; int PageNumber = 1; int PageSize = 10 }` (bind like the existing appointment list query; clamp page size 1–100); validator: `ToDate ≥ FromDate` when both, `Status` null or `completed|no_show`.
  - `record ServiceHistoryItemDto(Guid AppointmentId, AppointmentStatus Status, DateOnly Date, TimeOnly StartTime, TimeOnly EndTime, Guid SpaServiceId, string ServiceName, StaffRefDto Staff, string Source, Guid? TreatmentPlanId, string? PackageName, int? SequenceNumber)`; `Source` = `"service"` or `"package"`.
  - `record ServiceHistoryDetailDto(...item fields, int DurationMinutes, string? Result, DateTime? CompletedAtUtc, Guid? ServiceEntitlementId, Guid? TreatmentSessionId, OrderRefDto? Order)`.
  - `IAppointmentRepository.SearchHistoryAsync(Guid customerId, ServiceHistoryCriteria criteria, CancellationToken) → Task<PagedResult<ServiceHistoryItemDto>>` with `record ServiceHistoryCriteria(DateOnly? From, DateOnly? To, Guid? SpaServiceId, AppointmentStatus? Status, int PageNumber, int PageSize)`; statuses restricted to `Completed|NoShow`; service via `AppointmentServiceSource` (filter on the derived id); order `Date desc, StartTime desc, Id`.
  - `IAppointmentRepository.GetHistoryDetailAsync(Guid customerId, Guid appointmentId, CancellationToken) → Task<ServiceHistoryDetailDto?>` (null for other customer or other status). `Result` = session note (package) or appointment note (single), null for `NoShow`; `CompletedAtUtc` = session `CompletedAtUtc` when present.
  - `IServiceHistoryService`: `ListAsync(ServiceHistoryQuery)` → `OperationResult<PagedResult<ServiceHistoryItemDto>>`; `GetAsync(Guid appointmentId)` → `OperationResult<ServiceHistoryDetailDto>` (null → `BookingErrors.AppointmentNotFound()` or the existing factory).

- [ ] Write tests: `PassesCustomerIdFromToken`, `StatusTextMapsToEnum`, `MissingDetailIsAppointmentNotFound`, validator `FromAfterToInvalid`, `CancelledStatusInvalid`, `PageSize0ClampsTo1`. Run → FAIL.
- [ ] Implement; run → PASS. Checkpoint: build.

### Task 4: Management reads and scope (UC-SPA-21 list/detail)

**Files:**

- Create: `backend/src/Application/DTOs/Treatments/{TreatmentManageDtos,TreatmentListQuery}.cs`, `backend/src/Application/Validators/Treatments/TreatmentListQueryValidator.cs`, `backend/src/Application/UseCases/Treatments/TreatmentScope.cs`, `backend/src/Application/Interfaces/Services/Treatments/ITreatmentManagementService.cs`, `backend/src/Application/UseCases/Treatments/TreatmentManagementService.cs` (reads only in this task)
- Modify: `ITreatmentRepository` + impl
- Test: `backend/tests/Application.Tests/Treatments/TreatmentScopeTests.cs`, `TreatmentManagementReadTests.cs`

**Interfaces:**

- Consumes: Task 2 rows and `GetSessionsAsync`/`GetVisitsAsync`.
- Produces:
  - `class TreatmentListQuery { string? Search; Guid? CustomerId; string? Status; Guid? PrimaryStaffMemberId; int PageNumber = 1; int PageSize = 10 }`; validator: `Search` ≤ 100, `Status` a plan status value.
  - `record TreatmentSearchCriteria(string? Search, Guid? CustomerId, TreatmentPlanStatus? Status, Guid? PrimaryStaffMemberId, Guid? ScopeStaffMemberId, bool IncludeAssigned, int PageNumber, int PageSize)`; `ScopeStaffMemberId` null = owner.
  - `ITreatmentRepository.SearchAsync(TreatmentSearchCriteria, CancellationToken) → Task<PagedResult<TreatmentPlanRow>>`: search uses `AppDbContext.Unaccent` + `CatalogSearchText.Contains` on `User.FullName` and `PhoneNumber` exactly like `AppointmentRepository.SearchAsync`; scope via `PrimaryStaffMemberId == staff || (IncludeAssigned && any session appointment of that staff with status in the four scope statuses)` as one `EXISTS` (no join duplicates); order `PurchasedAtUtc desc, Id`.
  - `ITreatmentRepository.IsAssignedToPlanAsync(Guid planId, Guid staffMemberId, CancellationToken) → Task<bool>` (same four statuses).
  - `ITreatmentRepository.GetSkinProfilesAsync(Guid planId, CancellationToken)` → rows for `skinProfiles[]` (only appointments with `TreatmentSessionId` in the plan); `HasAllergiesAsync(Guid customerId, CancellationToken) → bool`.
  - `TreatmentScope` (pure): `static bool CanView(bool isOwner, Guid? userId, Guid? primaryStaffId, bool assigned, bool assignedCanView)`; `static bool CanEdit(bool isOwner, Guid? userId, Guid? primaryStaffId, TreatmentPlanStatus status)`.
  - `TreatmentPlanListItemDto`, `TreatmentPlanDto`, `TreatmentSessionDto` with exactly the fields of the spec's API table ("Đợt 2 — quản lý"); `careHistory` = visits with status `Completed|NoShow`, `result` as in Task 3; `canManage` = owner.
  - `ITreatmentManagementService.ListAsync(TreatmentListQuery)` → `OperationResult<PagedResult<TreatmentPlanListItemDto>>`; `GetAsync(Guid id)` → `OperationResult<TreatmentPlanDto>`; not viewable → `TreatmentPlanNotFound`.

- [ ] Write tests: `TreatmentScopeTests` — `OwnerSeesAndEditsAll`, `PrimaryStaffEdits`, `AssignedStaffViewsOnly`, `AssignedStaffHiddenWhenOptionOff`, `NobodyEditsCompletedOrCancelled`. Read tests — `StaffListPassesScopeAndOption`, `OwnerListHasNoScope`, `DetailOutsideScopeNotFound`, `DetailSplitsCareHistoryFromSessions`, `CanManageOnlyForOwner`. Run → FAIL.
- [ ] Implement; run → PASS. Checkpoint: build.

### Task 5: Management commands (UC-SPA-21 edits and status)

**Files:**

- Create: `backend/src/Application/DTOs/Treatments/{UpdateTreatmentPlanRequest,UpdateTreatmentSessionRequest,AssignTreatmentStaffRequest,TreatmentReasonRequest}.cs`, validators in `Validators/Treatments/`
- Modify: `ITreatmentManagementService`, `TreatmentManagementService`, `ITreatmentRepository` + impl (`GetSessionForUpdateAsync(Guid planId, Guid sessionId)`, `LatestCompletedVisitDateAsync(Guid planId) → DateOnly?`, `HasBookedSessionsAsync(Guid planId)`, `HasOpenSessionsAsync(Guid planId)`), `ITreatmentRepository.GetCustomerIdAsync(Guid planId) → Guid?`
- Test: `backend/tests/Application.Tests/Treatments/TreatmentManagementCommandTests.cs`, `TreatmentValidatorTests.cs`

**Interfaces:**

- Consumes: Task 1 transitions, Task 4 scope; `IPurchaseRepository.GetPackageForUpdateAsync(planId)`, `IAppointmentRepository.LockCustomerForBookingAsync(customerId)`, `IStaffMemberRepository.GetForUpdateAsync` (or a plain read) + `StaffMember.IsWorkingOn(today)`.
- Produces (`ITreatmentManagementService`, each + `CancellationToken`, returns `OperationResult<TreatmentPlanDto>` unless noted):
  - `UpdateAsync(Guid id, UpdateTreatmentPlanRequest)` — `record UpdateTreatmentPlanRequest(string? Goal, DateOnly? ExpectedEndDate, string? Note)`.
  - `UpdateSessionAsync(Guid id, Guid sessionId, UpdateTreatmentSessionRequest)` → `OperationResult<TreatmentSessionDto>` — `record UpdateTreatmentSessionRequest(string? Note)`.
  - `AssignStaffAsync(Guid id, AssignTreatmentStaffRequest)` — `record AssignTreatmentStaffRequest(Guid? StaffMemberId)`.
  - `PauseAsync(Guid id, TreatmentReasonRequest)`, `CancelAsync(Guid id, TreatmentReasonRequest)` — `record TreatmentReasonRequest(string? Reason)`; `ResumeAsync(Guid id)`, `CompleteAsync(Guid id)`.
- Check order: validate → owner-only commands: role check (`forbidden`) → load in transaction with locks (Global Constraints order) → plan missing or not viewable → `TreatmentPlanNotFound` → edit commands: not `CanEdit` because not in charge → `TreatmentNotInCharge`; terminal status → `StatusInvalid` → command rules: `cancel` + `HasBookedSessionsAsync` → `TreatmentHasBookedSessions`; `complete` + `HasOpenSessionsAsync` → `TreatmentSessionsRemaining`; session note by staff on `Completed|Skipped` → `TreatmentSessionCompleted`; plan `Cancelled` → `StatusInvalid` for everyone; `assign-staff` unknown → `staff_not_found`, not working today → `staff_resigned` → domain call (catch `InvalidOperationException` → `StatusInvalid(plan.Status)`) → `cancel` also `package.Cancel()`, `complete` also `package.Close()` with `actual_end_date` per Global Constraints → save → return `GetAsync` result.
- Validation in `UpdateTreatmentPlanRequestValidator`: lengths; `ExpectedEndDate ≥ plan.StartDate` is checked in the service (needs the row) → `ValidationException` with field `expectedEndDate` "Ngày dự kiến kết thúc phải từ ngày bắt đầu trở đi.".

- [ ] Write tests: `StaffNotInChargeIsForbiddenToEdit`, `OwnerAndPrimaryStaffEdit`, `ExpectedEndDateBeforeStartIsInvalid`, `ExpectedEndDateWithoutStartDateIsAccepted`, `EditTerminalPlanIsStatusInvalid`, `StaffEditsCompletedSessionNoteIsConflict`, `OwnerEditsCompletedSessionNote`, `CancelledPlanSessionNoteIsStatusInvalid`, `StaffCallingOwnerCommandIsForbidden`, `AssignResignedStaffIsBadRequest`, `AssignUnknownStaffNotFound`, `AssignNullClearsPrimary`, `PauseLocksCustomerThenPackage` (NSubstitute `Received.InOrder`), `CancelWithBookedSessionsIsConflict`, `CancelCancelsPackage`, `CompleteWithOpenSessionsIsConflict`, `CompleteUsesLatestVisitDateOrToday`, `ResumeAfterAutoCompleteIsConflict` (plan already `Completed`); validators `ReasonBlankOr501Invalid`, `GoalOver2000Invalid`. Run → FAIL.
- [ ] Implement; run → PASS. Checkpoint: build + `dotnet test backend/tests/Application.Tests`.

### Task 6: API controllers + integration tests

**Files:**

- Create: `backend/src/API/Controllers/{MyTreatmentsController,MyServiceHistoryController,TreatmentsController}.cs`
- Create: `backend/tests/IntegrationTests/Treatments/{TreatmentApi.cs,MyTreatmentEndpointsTests.cs,ServiceHistoryEndpointsTests.cs,TreatmentManagementEndpointsTests.cs,TreatmentConcurrencyTests.cs}`

**Interfaces:**

- Consumes: services of Tasks 2–5.
- Controllers (thin, `HandleResult`, `ProducesResponseType` like `AppointmentsController`):
  - `MyTreatmentsController` `[Route("api/v1/me/treatments")]`, `[Authorize(Policy = Permissions.PurchaseSelf)]`: `GET`, `GET {id:guid}`, `GET {id:guid}/sessions/{sessionId:guid}`.
  - `MyServiceHistoryController` `[Route("api/v1/me/service-history")]`, `PurchaseSelf`: `GET [FromQuery] ServiceHistoryQuery`, `GET {appointmentId:guid}`.
  - `TreatmentsController` `[Route("api/v1/treatments")]`, `[Authorize(Policy = Permissions.TreatmentManage)]`: `GET`, `GET {id:guid}`, `PUT {id:guid}`, `PUT {id:guid}/sessions/{sessionId:guid}`, `POST {id:guid}/assign-staff|pause|resume|cancel|complete` (all 200).
- `TreatmentApi` test helper: composes `PurchaseApi`, `StaffApi`, `BookingApi`; `SeedPlanAsync(Guid customerId, int totalSessions, IReadOnlyList<TreatmentSessionStatus> statuses, Guid? primaryStaffId = null, TreatmentPlanStatus planStatus = InProgress, int minDaysBetweenSessions = 0)` → `BoughtPackage`; `SeedVisitAsync(TreatmentSession, Guid customerId, Guid staffId, DateOnly date, AppointmentStatus status, string? note = null)`.

- [ ] Write one integration test per spec row TRT-T12…T31 named `TrtT12_…`, plus Review Focus `StaffMatchedTwiceListedOnce`, `HistoryFilterMatchesBookNowVisit`, `ResumeAfterAutoCompleteIsConflict` (complete the last booked session through `POST /appointments/{id}/complete` while paused, then `resume`). TRT-T30 in `TreatmentConcurrencyTests`: 10 rounds of `Task.WhenAll(book next session, cancel plan)` asserting exactly one success and no `booked` session in a `cancelled` plan. Run `dotnet test backend/tests/IntegrationTests --filter "FullyQualifiedName~Treatments"` → FAIL.
- [ ] Implement controllers; run → PASS.
- [ ] Checkpoint: `dotnet test backend/NhuNguyetSpa.sln` — whole suite green, including `PersistenceModelTests` (TRT-T32).

### Task 7: Docs, spec source, Postman

**Files:**

- Modify: `docs/spec-source/data_api.py` (rows 079–087 in place: English field names, error codes, row 086 body `{goal, expectedEndDate, note}`, row 082 `status=completed|no_show`; append SPA-API-123 `POST /treatments/{id}/assign-staff`, 124 `pause`, 125 `resume`, 126 `cancel`, 127 `complete`), `docs/spec-source/data_rules.py` (BR-TRT-06…11 appended to the TRT group), regenerate per `docs/spec-source/README.md`; `docs/decisions/open-questions.md` (Q-37…Q-40 as "Đã chốt 31/10/2026" with the spec's wording); `docs/domain/glossary.md` (`treatment.manage`, folder `Treatments` exists, `status_reason`, "Lịch sử sử dụng" → `ServiceHistory`); `docs/progress.md` (rows UC-SPA-19, 20, 21 + status paragraph); `docs/specs/purchases-treatments.md` status line ("xong phần backend"); `CLAUDE.md`, `backend/CLAUDE.md` (Treatments paragraph: routes, policy, options, migration); `backend/postman/generate_collection.py` (folder "Liệu trình và lịch sử": customer list/detail/session, history list/detail, manage list/detail/PUT/session note/assign-staff/pause/resume/cancel/complete) then regenerate the collection.

- [ ] Edit and regenerate; `git diff --stat` shows only the expected files.
- [ ] Run `dotnet test backend/NhuNguyetSpa.sln` once more → PASS.
- [ ] Final checkpoint: `dotnet build backend/NhuNguyetSpa.sln` with no warnings; `npm run format:check`.

# Lịch làm việc cá nhân & lịch sử khách đã chăm sóc (backend + web) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nhân viên xem ca làm của mình theo tuần/tháng kèm lịch hẹn trong ca (UC-SPA-24) và lịch sử các buổi mình đã chăm sóc (UC-SPA-26), có API và màn web.

**Architecture:** Backend theo Clean Architecture có sẵn: DTO + validator + service ở Application, truy vấn ở `WorkScheduleRepository`/`AppointmentRepository`, hai controller mỏng `MyWorkSchedulesController` (`schedule.self`) và `MyCareHistoryController` (`care.write`). Web: `MyWorkSchedulesApi` + `CareApi.listHistory` → `lib/api` → hooks → `features/staff/components/my-schedule` và `features/care/components/history`.

**Tech Stack:** .NET 9, EF Core 9 + Npgsql, FluentValidation, xUnit + Testcontainers; React 19, TanStack Query, shadcn/ui, Vitest.

**Spec:** `docs/specs/staff.md` mục "UC-SPA-24", `docs/specs/care.md` mục "UC-SPA-26".

## Global Constraints

- Tên theo glossary; thông điệp lỗi tiếng Việt; DI bằng `private readonly`; không đổi hành vi UC đã xong; toàn bộ test hiện có pass; `PersistenceModelTests` pass; không migration.
- TDD: integration test `PostgresFixture` + `AuthApiFactory`, seed trực tiếp bằng `StaffApi`/`CareApi`; web test Vitest + `mockApi`.
- Web: chỉ `components/ui` + `components/shared`, `DataTable` cho bảng, token màu, lỗi theo `errors[].code`, 4 trạng thái, tiếng Việt có dấu, giờ Việt Nam.
- Không commit (người dùng tự chạy git). Chỉ format các file của task (không chạy `npm run format` toàn repo).
- Cập nhật `docs/progress.md`, glossary, open-questions (Q-72, Q-73), `data_api.py` dòng 100, 101, 104, Postman, `docs/frontend.md`, `routes.ts`, CLAUDE.md.

## Review Focus

- Ca của nhân viên khác qua `GET /me/work-schedules/{id}` phải 404, không 403 (STF-T44).
- Lịch hẹn chạm mép ca (kết thúc đúng giờ bắt đầu ca) không tính vào ca: dùng giao `[start, end)` (thêm vào STF-T41).
- Ký tự `%` trong `search` là ký tự thường (CARE-T31).
- Lưới tháng luôn đúng 42 ngày kể cả tháng bắt đầu Thứ Hai (thêm test cho tháng 6/2026 bắt đầu Thứ Hai).
- Sheet "các lần khác" bỏ chính buổi đang xem (CARE-UI-T33).

---

### Task 1: Backend UC-SPA-24 `/me/work-schedules`

**Files:** Create `Application/DTOs/WorkSchedules/MyWorkScheduleDtos.cs` (`MyWorkScheduleQuery`, `MyWorkScheduleDto(Id, Date, StartTime, EndTime, Status, AppointmentCount)`, `MyWorkScheduleDetailDto(..., IReadOnlyList<ShiftAppointmentDto> Appointments)`, `ShiftAppointmentDto(Id, StartTime, EndTime, Status, Customer, Service, TreatmentSession?)`), `Application/Validators/WorkSchedules/MyWorkScheduleQueryValidator.cs`, `Application/UseCases/WorkSchedules/ShiftAppointments.cs` (statuses of BR-STF-11), `Application/Interfaces/Services/WorkSchedules/IMyWorkScheduleService.cs`, `Application/UseCases/WorkSchedules/MyWorkScheduleService.cs`, `API/Controllers/MyWorkSchedulesController.cs`, test `tests/IntegrationTests/Staff/MyWorkScheduleEndpointsTests.cs`. Modify `IWorkScheduleRepository` + `WorkScheduleRepository` (`ListMineAsync`, `GetMineAsync`), `IAppointmentRepository` + `AppointmentRepository` (`ListInShiftAsync`), `Application/DependencyInjection.cs`.

- [ ] Test STF-T40..T45 (+ lịch chạm mép ca không tính) → FAIL (404 route).
- [ ] Cài đặt → `dotnet test --filter FullyQualifiedName~MyWorkScheduleEndpointsTests` PASS.

### Task 2: Backend UC-SPA-26 `/me/care-history`

**Files:** Create `Application/DTOs/Care/CareHistoryDtos.cs` (`CareHistoryQuery { FromDate, ToDate, CustomerId }`, `CareHistoryCriteria`, `CareHistoryItemDto(AppointmentId, Date, StartTime, EndTime, Customer, Service, TreatmentSession?, HasAllergies, SkinProfileId?)`), `Validators/Care/CareHistoryQueryValidator.cs`, `Interfaces/Services/Care/ICareHistoryService.cs`, `UseCases/Care/CareHistoryService.cs`, `API/Controllers/MyCareHistoryController.cs` (`[FromQuery] PagedQuery paging, [FromQuery] CareHistoryQuery query`), test `tests/IntegrationTests/Care/CareHistoryEndpointsTests.cs`. Modify `IAppointmentRepository`/`AppointmentRepository` (`SearchCareHistoryAsync`), DI.

- [ ] Test CARE-T30..T36 → FAIL. Cài đặt → PASS. Rồi `dotnet test backend/NhuNguyetSpa.sln` toàn bộ PASS.

### Task 3: Hợp đồng FE (`shared-types`, `api-client`, `lib/api`)

`workSchedules.ts`: `MyWorkSchedule`, `MyWorkScheduleDetail`, `ShiftAppointment`, `MyWorkScheduleParams`, `MyWorkSchedulesApi.list/get`, `myWorkSchedulesQueryKeys`. `care.ts`: `CareHistoryItem`, `CareHistoryParams`, `CareApi.listHistory`, `careQueryKeys.historyAll/history(params)`. Test STF-UI-T30, CARE-UI-T30 trong `packages/api-client/src/*.test.ts`.

### Task 4: Web SCR-W25 `/staff/schedule`

`features/staff/myScheduleRange.ts` (`weekRange(date)`, `monthGridRange(date)` → `{ from, to }`, test gồm tháng bắt đầu Thứ Hai), hook `useMySchedule`, components `my-schedule/*`, trang `StaffSchedulePage`. Test STF-UI-T31..T34 qua `renderApp('/staff/schedule')`.

### Task 5: Web SCR-W28 `/staff/care-history`

Route mới trong `routes.ts` + icon `navigation.ts`; `features/care/components/history/*`, hook `useCareHistory`, trang `StaffCareHistoryPage`. Test CARE-UI-T31..T34.

### Task 6: Kiểm tra và tài liệu

`dotnet test`, `npm run lint`, `npm run typecheck`, `npm run test`, `npm run format:check` (chỉ lỗi ở file của task mới tính), `npm run web:build`; cập nhật tài liệu ở Global Constraints.

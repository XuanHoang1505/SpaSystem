# UC-SPA-34 Thông báo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Người dùng (khách, nhân viên, chủ spa) xem, mở, đánh dấu đã đọc thông báo của mình; các nghiệp vụ đã có ghi thông báo theo danh mục NTF-E01..E14; job nhắc lịch; thông báo được đẩy realtime qua SignalR.

**Architecture:** `Application/UseCases/Notifications` chứa `MyNotificationService` (5 endpoint REST), `NotificationPublisher` (chỉ `Add` entity vào unit of work của nghiệp vụ gọi nó, nên lưu cùng transaction), `NotificationTemplates` (chuỗi tiếng Việt cố định) và `AppointmentReminderService` (job gọi). Realtime qua port `INotificationRealtime`: Infrastructure gom thông báo mới bằng interceptor EF và đẩy **sau commit**; adapter SignalR + hub ở API.

**Tech Stack:** .NET 9, EF Core 9 + Npgsql, ASP.NET Core SignalR (có sẵn trong shared framework), FluentValidation, xUnit + NSubstitute, Testcontainers PostgreSQL, `Microsoft.AspNetCore.SignalR.Client` (chỉ cho IntegrationTests).

**Spec:** [docs/specs/notifications.md](../../specs/notifications.md) (duyệt 16/11/2026: giữ `reference_type`, realtime SignalR, Q-79..Q-83).

## Global Constraints

- Tên code theo glossary: `Notification`, bảng `notifications`, thư mục `Notifications`, route `/api/v1/me/notifications`; enum mới `NotificationReferenceType` (`appointment`, `order`, `treatment_plan`, `review`, `work_schedule`); thêm khái niệm vào `docs/domain/glossary.md` trước khi code.
- Thông điệp lỗi và nội dung thông báo tiếng Việt; mã lỗi mới duy nhất `notification_not_found` (404).
- DI bằng constructor vào field `private readonly _camelCase`; không primary constructor cho dependency.
- Không đổi hành vi, response hay mã lỗi của UC đã xong; toàn bộ test hiện có pass; `PersistenceModelTests` pass.
- BR-NTF-02: `NotificationPublisher` không bao giờ gọi `SaveChangesAsync`, chỉ `AddAsync`; mọi chỗ gọi nó đặt **trước** `SaveChangesAsync` của nghiệp vụ, trong cùng `ExecuteInTransactionAsync` nếu có.
- BR-NTF-03: không gửi cho người thực hiện; bỏ trùng người nhận trong một sự kiện; chủ spa = user `role = owner` và `status = active`.
- BR-NTF-05: tiêu đề ≤ 200; giờ `HH:mm dd/MM/yyyy` (giờ VN); tiền `1.250.000 đ`; lý do cắt còn 200 ký tự.
- Realtime chỉ đẩy sau commit; lỗi đẩy chỉ log, không làm hỏng nghiệp vụ (BR-NTF-10). `access_token` qua query chỉ cho path bắt đầu bằng `/hubs/notifications` (BR-NTF-11).
- Cấu hình `Notifications:AppointmentReminderHoursBefore` = 24 (0–72, 0 = tắt), `Notifications:ReminderJob:Enabled` = true, `IntervalSeconds` = 300 (30–3600), `BatchSize` = 200 (1–1000); `AuthApiFactory` đặt `Notifications:ReminderJob:Enabled=false`. Không có biến `.env` mới.
- TDD: unit test (NSubstitute, `IDateTimeProvider` giả) + integration test (`PostgresFixture` + `AuthApiFactory`, collection `postgres`); dịch vụ ngoài thay bằng fake.
- Cập nhật `docs/progress.md`, glossary, open-questions (Q-79..Q-83), `data_api.py` (sửa 110–113, thêm 152 cuối danh sách), `data_rules.py` (RBAC `notification.self` thêm Chủ spa), Postman (`backend/postman/generate_collection.py`), `CLAUDE.md`.
- Git do người dùng tự chạy: bước "Commit" chỉ là gợi ý lệnh; không commit/push trừ khi được yêu cầu; không thêm Co-Authored-By hay "Generated with".

## Review Focus

1. Khách đổi giờ mà giữ nguyên nhân viên → nhân viên nhận **một** NTF-E07, không hai (cũ = mới). Test ở Task 4 (`CustomerReschedule_SameStaff_StaffGetsOneNotification`).
2. Callback thanh toán gửi lại (IPN + return URL cùng thành công) → không tạo NTF-E01 lần hai, vì `IssueAsync` chỉ chạy khi đơn vừa chuyển `paid`. Test ở Task 5 (`DuplicateCallback_NoSecondPaymentNotification`).
3. Book-now thanh toán sau khi giữ chỗ đã hết hạn → NTF-E01 nói rõ cần đặt lại, **không** có NTF-E09 cho nhân viên. Test ở Task 5 (`PaidAfterHoldExpired_NoStaffNotification`).
4. Chủ spa đổi nhân viên sang chính nhân viên hiện tại (thao tác không đổi) → không thông báo nào. Test ở Task 4 (`OwnerAssignSameStaff_NoNotification`).
5. Mở thông báo của người khác bằng `POST …/{id}/read` → 404 và **không** đánh dấu, không đẩy realtime. Test ở Task 3 (NTF-T06) và Task 8 (NTF-T29 kiểm tra B không nhận gì).

---

### Task 1: Dữ liệu — cột tham chiếu, khóa chống trùng, entity

**Files:**

- Modify: `docs/spec-source/data_db.py` (bảng `notifications`, enum mới), sinh lại `docs/domain/data-model.md` theo `docs/spec-source/README.md`
- Modify: `docs/domain/glossary.md` (enum `NotificationReferenceType`; dòng thư mục `Notifications` "đã có")
- Create: `backend/src/Domain/Enums/NotificationReferenceType.cs`
- Modify: `backend/src/Domain/Entities/Notification.cs`
- Modify: `backend/src/Infrastructure/Persistence/Configurations/NotificationConfiguration.cs`
- Create: migration `AddNotificationReferences` (`dotnet ef migrations add AddNotificationReferences --project backend/src/Infrastructure --startup-project backend/src/API --output-dir Persistence/Migrations`)
- Test: `backend/tests/Domain.Tests/Notifications/NotificationTests.cs`

**Interfaces:**

- Produces: `public sealed record NotificationReference(NotificationReferenceType Type, Guid Id);` (Domain/Entities hoặc Domain/ValueObjects theo chỗ đặt record domain hiện có)
- Produces: `Notification.Create(Guid userId, NotificationType type, string title, string body, NotificationReference? reference, string? dedupKey, DateTime nowUtc) → Notification`; `bool MarkRead(DateTime nowUtc)` (trả `true` khi vừa đổi); thuộc tính `ReferenceType?`, `ReferenceId?`, `DedupKey?` setter `private`; các setter cũ thu hẹp `private set` (EF vẫn map được).
- Produces: `NotificationConfiguration.UniqueDedupKey = "ux_notifications_user_id_dedup_key"`.

- [ ] **Step 1: Sửa `data_db.py`.** Thêm 3 cột sau `type`: `reference_type|varchar(30)|Y|CHECK enum NotificationReferenceType|Loại đối tượng liên quan|`, `reference_id|uuid|Y|CHECK num_nonnulls(reference_type, reference_id) <> 1|Mã đối tượng liên quan (không FK, đa hình)|`, `dedup_key|varchar(150)|Y|UQ (user_id, dedup_key) khi khác null|Khóa chống trùng (nhắc lịch)|`; ghi IDX `(user_id, created_at_utc DESC)` và IDX `(user_id) khi read_at_utc null` theo cú pháp ghi chú sẵn có của file; thêm enum `("notifications","reference_type","NotificationReferenceType",[…5 giá trị…],"")`; thêm `UC-SPA-34` vào danh sách UC dùng bảng nếu cần. Sinh lại `data-model.md`.
- [ ] **Step 2: Viết test domain thất bại** `NotificationTests`:
  - `Create_TrimsAndStoresFields`: `Create(userId, NotificationType.Appointment, "Tiêu đề", "Nội dung", new(NotificationReferenceType.Appointment, apptId), null, t0)` → `ReadAtUtc == null`, `CreatedAtUtc == t0`, `ReferenceType == Appointment`, `ReferenceId == apptId`.
  - `Create_TitleOver200_Throws` (`ArgumentException`), `Create_EmptyTitleOrBody_Throws`.
  - `MarkRead_Twice_KeepsFirstTime`: lần 1 `t1` → `true`, lần 2 `t2` → `false`, `ReadAtUtc == t1`.
- [ ] **Step 3: Chạy** `dotnet test backend/NhuNguyetSpa.sln --filter "FullyQualifiedName~NotificationTests"` → FAIL (chưa có `Create`).
- [ ] **Step 4: Cài đặt** enum, `NotificationReference`, `Notification.Create`/`MarkRead`; cấu hình EF: check `ck_notifications_reference_type` (enum), `ck_notifications_reference` (`num_nonnulls(reference_type, reference_id) <> 1`), `reference_type` max 30, `dedup_key` max 150, `HasIndex(UserId, DedupKey).IsUnique().HasFilter("dedup_key IS NOT NULL").HasDatabaseName(UniqueDedupKey)`, `HasIndex(UserId, CreatedAtUtc).IsDescending(false, true).HasDatabaseName("ix_notifications_user_id_created_at_utc")`, `HasIndex(UserId).HasFilter("read_at_utc IS NULL").HasDatabaseName("ix_notifications_user_id_unread")`. Tạo migration.
- [ ] **Step 5: Chạy** test domain + `dotnet test backend/NhuNguyetSpa.sln --filter "FullyQualifiedName~PersistenceModelTests"` → PASS (nếu drift, sửa `data_db.py` cho khớp chứ không sửa tay `data-model.md`).
- [ ] **Step 6: Commit** `feat(notifications): add notification references and dedup key (UC-SPA-34)`

### Task 2: Mẫu nội dung, người nhận và `NotificationPublisher`

**Files:**

- Create: `backend/src/Application/Common/Options/NotificationOptions.cs` (`SectionName = "Notifications"`, `AppointmentReminderHoursBefore = 24`, `ReminderJob { Enabled = true, IntervalSeconds = 300, BatchSize = 200 }`)
- Create: `backend/src/Application/Interfaces/Repositories/INotificationRepository.cs`
- Create: `backend/src/Application/Interfaces/Services/Notifications/INotificationPublisher.cs`
- Create: `backend/src/Application/UseCases/Notifications/NotificationTemplates.cs`, `NotificationPublisher.cs`, `AppointmentNotice.cs`
- Create: `backend/src/Infrastructure/Repositories/NotificationRepository.cs`
- Modify: `backend/src/Application/DependencyInjection.cs`, `backend/src/Infrastructure/DependencyInjection.cs` (options có `Validate` + `ValidateOnStart` theo biên Global Constraints), `backend/src/API/appsettings.json` (section `Notifications`)
- Test: `backend/tests/Application.Tests/Notifications/NotificationTemplatesTests.cs`, `NotificationPublisherTests.cs`

**Interfaces:**

- Produces `AppointmentNotice` (record, Application):
  `public sealed record AppointmentNotice(Guid AppointmentId, Guid CustomerId, Guid StaffMemberId, Guid SpaServiceId, bool IsPackageSession, DateOnly Date, TimeOnly StartTime);` — người gọi dựng từ dữ liệu đang có (entity trong bộ nhớ + `spaServiceId`), vì lịch mới chưa có trong CSDL.
- Produces `INotificationRepository : IRepository<Notification>`:
  - `Task<PagedResult<Notification>> ListForUserAsync(Guid userId, bool unreadOnly, NotificationType? type, PagedQuery paging, CancellationToken ct)` (`created_at_utc DESC, id DESC`, `AsNoTracking`)
  - `Task<Notification?> GetForUserAsync(Guid id, Guid userId, CancellationToken ct)` (tracked)
  - `Task<int> CountUnreadAsync(Guid userId, CancellationToken ct)`
  - `Task<int> MarkAllReadAsync(Guid userId, DateTime nowUtc, CancellationToken ct)` (`ExecuteUpdateAsync`)
  - `Task<IReadOnlyList<Guid>> GetActiveOwnerIdsAsync(CancellationToken ct)`
  - `Task<NoticeNames> GetNamesAsync(IReadOnlyCollection<Guid> spaServiceIds, IReadOnlyCollection<Guid> userIds, CancellationToken ct)` với `public sealed record NoticeNames(IReadOnlyDictionary<Guid,string> Services, IReadOnlyDictionary<Guid,string> Users);` (tên dịch vụ đọc cả dịch vụ ngừng bán)
  - (Task 7 thêm phần nhắc lịch)
- Produces `INotificationPublisher` (mọi phương thức `Task …(…, CancellationToken ct)`; `actorUserId` là người thực hiện, bị loại khỏi người nhận):
  - `AppointmentConfirmedAsync(AppointmentNotice a, Guid actorUserId, bool notifyStaff, ct)` — NTF-E03 (+E09 khi `notifyStaff`)
  - `AppointmentRescheduledByOwnerAsync(AppointmentNotice before, AppointmentNotice after, Guid actorUserId, ct)` — NTF-E04
  - `AppointmentStaffChangedAsync(AppointmentNotice before, AppointmentNotice after, Guid actorUserId, ct)` — NTF-E05
  - `AppointmentCancelledByOwnerAsync(AppointmentNotice a, string reason, Guid actorUserId, ct)` — NTF-E06
  - `AppointmentChangedByCustomerAsync(AppointmentNotice before, AppointmentNotice? after, Guid actorUserId, ct)` — NTF-E07 (`after == null` = hủy)
  - `AppointmentCompletedAsync(AppointmentNotice a, Guid actorUserId, ct)` — NTF-E10
  - `OrderPaidAsync(Order order, AppointmentNotice? confirmedHold, bool holdExpired, ct)` — NTF-E01 (+E09 cho `confirmedHold`)
  - `OrderCancelledByOwnerAsync(Order order, string reason, Guid actorUserId, ct)` — NTF-E02
  - `ReviewRepliedAsync(Review review, string productName, Guid actorUserId, ct)` — NTF-E11
  - `TreatmentPlanStatusChangedAsync(Guid planId, Guid customerId, string packageName, TreatmentPlanStatus newStatus, string? reason, Guid actorUserId, ct)` — NTF-E12
  - `WorkScheduleChangedAsync(WorkSchedule shift, WorkScheduleChange change, Guid actorUserId, ct)` với `public enum WorkScheduleChange { Created, Updated, Cancelled }` — NTF-E13
  - `WorkSchedulesBatchCreatedAsync(IReadOnlyList<WorkSchedule> created, Guid actorUserId, ct)` — NTF-E14, một thông báo/nhân viên, `reference = null`
- Produces `NotificationTemplates` (static, thuần): mỗi sự kiện một phương thức trả `(string Title, string Body)`; helper `When(DateOnly, TimeOnly) → "14:30 ngày 20/11/2026"`, `Money(decimal) → "1.250.000 đ"`, `Reason(string) → cắt 200`. `type` = `Treatment` khi `IsPackageSession`, ngược lại `Appointment` (NTF-E03..E10); E11, E13, E14 `System`; E12 `Treatment`; E01, E02 `Payment`.

- [ ] **Step 1: Viết test thất bại** `NotificationTemplatesTests`: `When(new(2026,11,20), new(14,30)) == "14:30 ngày 20/11/2026"`; `Money(1250000m) == "1.250.000 đ"`; `Reason(new string('a', 250)).Length == 200`; tiêu đề đúng chuỗi trong bảng sự kiện của spec (vd. `RescheduledByOwner(...).Title == "Lịch hẹn đã được đổi giờ"`), body E04 chứa giờ cũ và giờ mới; E01 có `holdExpired` chứa "đặt lại".
- [ ] **Step 2: Viết test thất bại** `NotificationPublisherTests` (NSubstitute `INotificationRepository`, bắt các `AddAsync`):
  - `StaffChanged_NotifiesCustomerOldAndNewStaff_NotActor` → 3 thông báo, người nhận {customer, oldStaff, newStaff}.
  - `CustomerChanged_SameStaff_StaffGetsOne` → staff 1 lần + mỗi owner active 1 lần; khách (actor) 0.
  - `CustomerChanged_RecipientsSkipActor`: owner trùng actor bị loại.
  - `AppointmentConfirmed_NotifyStaffFalse_OnlyCustomer`.
  - `BatchCreated_TwoStaffSixShifts_TwoNotificationsWithCounts` (body chứa "3 ca").
  - Mọi thông báo có `reference` đúng bảng sự kiện; publisher không bao giờ gọi `IUnitOfWork`.
- [ ] **Step 3: Chạy** `dotnet test backend/NhuNguyetSpa.sln --filter "FullyQualifiedName~Notification"` → FAIL.
- [ ] **Step 4: Cài đặt** options, repository (Infrastructure, đăng ký DI), templates, publisher (gom người nhận bằng `HashSet<Guid>`, bỏ `actorUserId`, đọc tên một lần qua `GetNamesAsync`).
- [ ] **Step 5: Chạy lại** → PASS.
- [ ] **Step 6: Commit** `feat(notifications): add notification templates and publisher`

### Task 3: API xem thông báo (UC-SPA-34) + port realtime

**Files:**

- Create: `backend/src/Application/DTOs/Notifications/NotificationDto.cs`, `UnreadNotificationCountDto.cs`, `NotificationListQuery.cs` (`bool UnreadOnly`, `NotificationType? Type`)
- Create: `backend/src/Application/Mapping/NotificationMappings.cs` (`ToDto()`)
- Create: `backend/src/Application/Interfaces/Services/Notifications/IMyNotificationService.cs`, `INotificationRealtime.cs`
- Create: `backend/src/Application/UseCases/Notifications/MyNotificationService.cs`, `NotificationErrors.cs`, `NullNotificationRealtime.cs`
- Create: `backend/src/API/Controllers/MyNotificationsController.cs`
- Modify: `backend/src/API/Authorization/Permissions.cs` (`NotificationSelf = "notification.self"` → Customer, Staff, Owner)
- Test: `backend/tests/IntegrationTests/Notifications/MyNotificationsApiTests.cs`, `backend/tests/Application.Tests/Notifications/MyNotificationServiceTests.cs`

**Interfaces:**

- Produces `NotificationDto(Guid Id, NotificationType Type, string Title, string Body, NotificationReferenceType? ReferenceType, Guid? ReferenceId, bool IsRead, DateTime? ReadAtUtc, DateTime CreatedAtUtc)`; `UnreadNotificationCountDto(int Count)`.
- Produces `INotificationRealtime`: `Task NotifyCreatedAsync(Guid userId, NotificationDto notification, CancellationToken ct)`, `Task NotifyUnreadCountAsync(Guid userId, int count, CancellationToken ct)`. `NullNotificationRealtime` đăng ký mặc định bằng `TryAddSingleton` ở Application DI; Task 8 thay bằng SignalR.
- Produces `IMyNotificationService`: `ListAsync(PagedQuery, NotificationListQuery, ct) → OperationResult<PagedResult<NotificationDto>>`, `OpenAsync(Guid id, ct) → OperationResult<NotificationDto>`, `MarkReadAsync(Guid id, ct) → Task`, `MarkAllReadAsync(ct) → Task`, `GetUnreadCountAsync(ct) → OperationResult<UnreadNotificationCountDto>`. Người dùng luôn từ `ICurrentUserService.UserId`.
- Produces `NotificationErrors.NotFound()` → `NotFoundException("Không tìm thấy thông báo.", "notification_not_found")`.
- Controller: `[Route("api/v1/me/notifications")]`, `[Authorize(Policy = Permissions.NotificationSelf)]`; `GET` (`[FromQuery] PagedQuery`, `[FromQuery] NotificationListQuery`), `GET {id:guid}`, `POST {id:guid}/read` → 204, `POST read-all` → 204, `GET unread-count`.

- [ ] **Step 1: Viết test tích hợp thất bại** `MyNotificationsApiTests` (seed thông báo trực tiếp qua `AppDbContext` bằng `Notification.Create`), đặt tên theo mã spec: `NTF_T01_ListsOnlyOwnNewestFirst`, `NTF_T02_FiltersUnreadAndType`, `NTF_T03_EmptyList`, `NTF_T04_InvalidType_Returns400`, `NTF_T05_OpenMarksReadOnce` (dùng `factory.Clock`), `NTF_T06_OtherUsersNotification_Returns404AndStaysUnread` (cả GET và POST read), `NTF_T07_MarkRead_Returns204`, `NTF_T08_ReadAll_OnlyOwn_Idempotent`, `NTF_T09_UnreadCount`, `NTF_T10_NoToken_Returns401` (5 endpoint), `NTF_T11_AllRolesAllowed`.
- [ ] **Step 2: Viết unit test** `MyNotificationServiceTests`: `MarkRead_PushesUnreadCount` và `MarkAllRead_PushesUnreadCount` (`INotificationRealtime` substitute nhận `NotifyUnreadCountAsync(userId, 0, …)`); `MarkRead_AlreadyRead_DoesNotPush`; `RealtimeThrows_StillSucceeds` (NTF-T32 phần đọc).
- [ ] **Step 3: Chạy** `dotnet test backend/NhuNguyetSpa.sln --filter "FullyQualifiedName~MyNotification"` → FAIL.
- [ ] **Step 4: Cài đặt.** `OpenAsync`/`MarkReadAsync`: `GetForUserAsync` → null thì `NotificationErrors.NotFound()`; `MarkRead(now)` trả `true` thì `SaveChangesAsync` rồi đẩy số chưa đọc. Đẩy realtime luôn bọc `try/catch` + `ILogger.LogWarning`. `type` sai do model binding enum → `400 validation_error` theo `InvalidModelStateResponseFactory` sẵn có.
- [ ] **Step 5: Chạy lại** → PASS.
- [ ] **Step 6: Commit** `feat(notifications): add my notifications API (UC-SPA-34)`

### Task 4: Sự kiện lịch hẹn (NTF-E03..E07, E09)

**Files:**

- Modify: `backend/src/Application/UseCases/Bookings/AppointmentManagementService.cs` (`ConfirmAsync`, `RescheduleAsync`, `AssignStaffAsync`, `CancelAsync`; không đụng `MarkNoShowAsync`)
- Modify: `backend/src/Application/UseCases/Bookings/CustomerBookingService.cs` (`BookFromEntitlementAsync`)
- Modify: `backend/src/Application/UseCases/Bookings/MyAppointmentService.cs` (`RescheduleAsync`, `CancelAsync`)
- Test: `backend/tests/IntegrationTests/Notifications/AppointmentNotificationTests.cs`

**Interfaces:**

- Consumes: `INotificationPublisher`, `AppointmentNotice` (Task 2).
- `ChangeAsync` hiện truyền `(appointment, spaServiceId, token)`: chụp `before = new AppointmentNotice(...)` **trước** khi gọi `change`, dựng `after` sau `change`, rồi gọi publisher trước `SaveChangesAsync`. Cách gọn: thêm tham số `Func<AppointmentNotice, AppointmentNotice, CancellationToken, Task>? notify` cho `ChangeAsync`; `MarkNoShowAsync` truyền `null`. `IsPackageSession = appointment.TreatmentSessionId != null`. Actor = `ICurrentUserService.UserId`.
- Không thông báo khi thao tác không đổi gì: `AssignStaffAsync` với cùng nhân viên (`before.StaffMemberId == after.StaffMemberId`) và `RescheduleAsync` về đúng giờ cũ.

- [ ] **Step 1: Viết test tích hợp thất bại** (dùng dữ liệu đặt lịch như `Bookings/*` tests đang làm): `NTF_T13_BookFromEntitlement_CustomerAndStaffNotified` (khách: `type=appointment`; buổi gói: `type=treatment`; nhân viên có "Bạn có lịch hẹn mới"; khách không nhận E09), `NTF_T14_OwnerConfirmRescheduleAssignCancel` (bốn trường hợp, người nhận đúng bảng, chủ spa không nhận), `OwnerAssignSameStaff_NoNotification`, `NTF_T15_SlotConflict_NoNotification` (409 `slot_unavailable` → số thông báo không đổi), `NTF_T16_CustomerRescheduleOrCancel_OwnersAndStaffNotified` (chủ spa bị khóa không nhận, khách không nhận), `CustomerReschedule_SameStaff_StaffGetsOneNotification`.
- [ ] **Step 2: Chạy** `--filter "FullyQualifiedName~AppointmentNotificationTests"` → FAIL.
- [ ] **Step 3: Cài đặt** các lời gọi publisher như mô tả ở Interfaces.
- [ ] **Step 4: Chạy lại** + `--filter "FullyQualifiedName~Bookings"` (hồi quy) → PASS.
- [ ] **Step 5: Commit** `feat(notifications): notify appointment confirmations and changes`

### Task 5: Sự kiện thanh toán và đơn hàng (NTF-E01, E02, E09 từ book-now)

**Files:**

- Modify: `backend/src/Application/UseCases/Payments/EntitlementIssuer.cs` (`IssueAsync`: sau vòng lặp, gọi `OrderPaidAsync(order, confirmedHold, holdExpired, ct)`; `confirmedHold` dựng từ `hold` + `line.SpaServiceId`, `IsPackageSession = false`)
- Modify: `backend/src/Application/UseCases/Orders/OrderCancellation.cs` hoặc `OrderManagementService.CancelAsync` — gọi `OrderCancelledByOwnerAsync` **chỉ** ở đường của chủ spa (`customerId == null` trong `OrderCancellation.CancelAsync`), trước `SaveChangesAsync` ở dòng 63
- Test: `backend/tests/IntegrationTests/Notifications/PaymentNotificationTests.cs`

**Interfaces:**

- Consumes: `INotificationPublisher.OrderPaidAsync`, `OrderCancelledByOwnerAsync` (Task 2). Actor của `OrderPaidAsync` không có (callback), không loại ai.

- [ ] **Step 1: Viết test thất bại** (theo mẫu `Payments/*` với `FakePaymentGateway`): `NTF_T12_BookNowPaid_CustomerAndStaffNotified` (body chứa mã đơn, số tiền, giờ hẹn), `DuplicateCallback_NoSecondPaymentNotification`, `PaidAfterHoldExpired_NoStaffNotification` (body chứa "đặt lại"), `CartOrderPaid_OnlyCustomerNotified`, `NTF_T18_OwnerCancel_CustomerNotifiedWithReason_CustomerCancel_None`.
- [ ] **Step 2: Chạy** → FAIL.
- [ ] **Step 3: Cài đặt.**
- [ ] **Step 4: Chạy lại** + `--filter "FullyQualifiedName~Payments|FullyQualifiedName~Orders"` → PASS.
- [ ] **Step 5: Commit** `feat(notifications): notify paid and owner-cancelled orders`

### Task 6: Hoàn thành buổi, phản hồi đánh giá, liệu trình, ca làm (NTF-E10..E14)

**Files:**

- Modify: `backend/src/Application/UseCases/Care/AppointmentCompletionService.cs` (`CompleteAsync`, trước `SaveChangesAsync` dòng 74)
- Modify: `backend/src/Application/UseCases/Reviews/ReviewManagementService.cs` (`ReplyAsync`; tên sản phẩm lấy như `OwnerReviewDto` đang lấy)
- Modify: `backend/src/Application/UseCases/Treatments/TreatmentManagementService.cs` (`PauseAsync`, `ResumeAsync`, `CancelAsync`, `CompleteAsync` qua `ChangeAsync`; không đụng `UpdateAsync`, `UpdateSessionAsync`, `AssignStaffAsync`)
- Modify: `backend/src/Application/UseCases/WorkSchedules/WorkScheduleService.cs` (`CreateAsync`, `UpdateAsync`, `ChangeStatusAsync` khi chuyển sang `cancelled` → `Cancelled`, chuyển lại `active` → `Updated`; `CreateBatchAsync` trong transaction → `WorkSchedulesBatchCreatedAsync(created, …)`)
- Test: `backend/tests/IntegrationTests/Notifications/CareAndStaffNotificationTests.cs`

**Interfaces:**

- Consumes: `AppointmentCompletedAsync`, `ReviewRepliedAsync`, `TreatmentPlanStatusChangedAsync`, `WorkScheduleChangedAsync`, `WorkSchedulesBatchCreatedAsync` (Task 2).

- [ ] **Step 1: Viết test thất bại**: `NTF_T17_Complete_CustomerInvitedToReview` (reference = appointment; nhân viên không nhận), `NTF_T19_ReviewReply_EachReplyNotifies` (2 lần trả lời → 2 thông báo `system`/`review`; `DELETE …/reply` không thông báo), `NTF_T20_TreatmentPauseResumeCancel` (`treatment`/`treatment_plan`, body pause/cancel chứa lý do), `NTF_T21_WorkSchedules` (lẻ: E13 cho tạo/sửa/hủy; batch 2 nhân viên × 3 ca với 1 ca bị bỏ qua → mỗi nhân viên đúng 1 E14, body đúng số ca thật).
- [ ] **Step 2: Chạy** → FAIL.
- [ ] **Step 3: Cài đặt.**
- [ ] **Step 4: Chạy lại** + hồi quy `--filter "FullyQualifiedName~Care|FullyQualifiedName~Reviews|FullyQualifiedName~Treatments|FullyQualifiedName~Staff"` → PASS.
- [ ] **Step 5: Commit** `feat(notifications): notify completion, review replies, treatment and shift changes`

### Task 7: Nhắc lịch (NTF-E08, BR-NTF-06)

**Files:**

- Create: `backend/src/Application/Interfaces/Services/Notifications/IAppointmentReminderService.cs`
- Create: `backend/src/Application/UseCases/Notifications/AppointmentReminderService.cs`, `ReminderWindow.cs`
- Modify: `INotificationRepository` + `NotificationRepository`
- Create: `backend/src/Infrastructure/BackgroundJobs/AppointmentReminderJob.cs` (theo mẫu `OrderExpiryJob`; tắt khi `ReminderJob.Enabled == false` **hoặc** `AppointmentReminderHoursBefore == 0`)
- Modify: `backend/src/Infrastructure/DependencyInjection.cs` (`AddHostedService<AppointmentReminderJob>()`), `backend/tests/IntegrationTests/Infrastructure/AuthApiFactory.cs` (`Notifications:ReminderJob:Enabled=false`)
- Test: `backend/tests/Application.Tests/Notifications/ReminderWindowTests.cs`, `backend/tests/IntegrationTests/Notifications/AppointmentReminderTests.cs`

**Interfaces:**

- Produces `IAppointmentReminderService.SendDueAsync(CancellationToken ct) → Task<int>` (số nhắc đã tạo).
- Produces `ReminderWindow` (thuần): `static (DateTime FromLocal, DateTime ToLocal) For(DateTime nowUtc, int hours)` và `static string DedupKey(Guid appointmentId, DateOnly date, TimeOnly start)` → `"appointment_reminder:{id}:{yyyyMMddHHmm}"`; `static bool BookedInsideWindow(DateTime createdAtUtc, DateTime startUtc, int hours)` = `createdAtUtc > startUtc - hours`. Đổi giờ VN ↔ UTC bằng cùng helper múi giờ `Asia/Ho_Chi_Minh` mà Bookings đang dùng.
- Produces `INotificationRepository.GetDueRemindersAsync(DateOnly fromDate, DateOnly toDate, int batchSize, CancellationToken ct) → IReadOnlyList<ReminderCandidate>` với `public sealed record ReminderCandidate(Guid AppointmentId, Guid CustomerId, Guid SpaServiceId, bool IsPackageSession, DateOnly Date, TimeOnly StartTime, DateTime CreatedAtUtc);` (chỉ `confirmed`; dịch vụ suy ra bằng `AppointmentServiceSource.WithService`); `GetExistingDedupKeysAsync(IReadOnlyCollection<string> keys, CancellationToken ct) → IReadOnlySet<string>`.
- Service: lọc khung `(now, now + hours]` trong bộ nhớ trên các ứng viên của 2–4 ngày liên quan, bỏ `BookedInsideWindow`, bỏ khóa đã có, `AddAsync` qua `NotificationTemplates.Reminder` (không qua publisher vì không có actor), `SaveChangesAsync`; bắt `ConflictException` do `ux_notifications_user_id_dedup_key` → trả 0 (job khác đã tạo). Thêm ánh xạ constraint này trong `UnitOfWork.Translate` thành `ConflictException("Thông báo đã tồn tại.", "notification_exists")` (mã nội bộ, không ra API).

- [ ] **Step 1: Viết unit test thất bại** `ReminderWindowTests`: `DedupKey` đúng định dạng; `BookedInsideWindow` biên `createdAtUtc == startUtc - 24h` → `false`; khung qua nửa đêm VN.
- [ ] **Step 2: Viết test tích hợp thất bại** gọi thẳng `IAppointmentReminderService` (scope từ factory, `factory.Clock`): `NTF_T22_ConfirmedIn20Hours_RemindedOnce` (chạy 2 lần → 1), `NTF_T23_NotReminded` (cancelled, held, còn 30 giờ, đặt khi còn < 24 giờ), `NTF_T24_RescheduledInsideWindow_RemindedAgain`, `NTF_T25_HoursZero_NothingCreated` (factory setting `Notifications:AppointmentReminderHoursBefore=0`).
- [ ] **Step 3: Chạy** → FAIL.
- [ ] **Step 4: Cài đặt.**
- [ ] **Step 5: Chạy lại** → PASS.
- [ ] **Step 6: Commit** `feat(notifications): add appointment reminder job`

### Task 8: Realtime SignalR (BR-NTF-09..11)

**Files:**

- Create: `backend/src/API/Realtime/NotificationHub.cs` (`[Authorize(Policy = Permissions.NotificationSelf)]`, không có phương thức), `SignalRNotificationRealtime.cs` (`IHubContext<NotificationHub>`; `Clients.User(userId.ToString()).SendAsync("notificationCreated", dto)` / `"unreadCountChanged", new { count }`), `SubUserIdProvider.cs` (`IUserIdProvider` đọc claim mà `HttpCurrentUserService` đọc cho `UserId`)
- Modify: `backend/src/API/Program.cs` (`AddSignalR().AddJsonProtocol(...)` cùng `CamelCase` + `JsonStringEnumConverter(SnakeCaseLower)` + `HourMinuteTimeOnlyJsonConverter`; `services.Replace(ServiceDescriptor.Singleton<INotificationRealtime, SignalRNotificationRealtime>())`; `app.MapHub<NotificationHub>("/hubs/notifications", o => o.CloseOnAuthenticationExpiration = true)` sau `UseAuthorization`)
- Modify: `backend/src/API/Extensions/AuthenticationExtensions.cs` (`OnMessageReceived`: lấy `access_token` từ query **chỉ** khi `context.HttpContext.Request.Path.StartsWithSegments("/hubs/notifications")`)
- Create: `backend/src/Infrastructure/Persistence/Interceptors/NotificationPushCollector.cs` (scoped: danh sách `Notification` chờ đẩy), `NotificationSaveInterceptor.cs` (`SaveChangesInterceptor`: `SavingChangesAsync` gom entry `Added`; `SavedChangesAsync` đẩy nếu `Database.CurrentTransaction == null`; `SaveChangesFailedAsync` xóa), `NotificationTransactionInterceptor.cs` (`DbTransactionInterceptor`: `TransactionCommittedAsync` đẩy; `TransactionRolledBackAsync`/`TransactionFailedAsync` xóa), `NotificationPushDispatcher.cs` (đẩy `NotifyCreatedAsync` từng thông báo rồi một `NotifyUnreadCountAsync` mỗi người nhận, đếm qua scope mới `IServiceScopeFactory` → `INotificationRepository.CountUnreadAsync`; mọi exception → `LogWarning`)
- Modify: `backend/src/Infrastructure/DependencyInjection.cs` (đăng ký collector, 2 interceptor, `AddInterceptors(...)`)
- Modify: `backend/tests/IntegrationTests/NhuNguyetSpa.IntegrationTests.csproj` (`Microsoft.AspNetCore.SignalR.Client`, cùng major 9.x)
- Test: `backend/tests/IntegrationTests/Notifications/NotificationHubTests.cs`

**Interfaces:**

- Consumes: `INotificationRealtime`, `NotificationDto.ToDto()` (Task 3), publisher hooks (Task 4–6).
- Test client: `new HubConnectionBuilder().WithUrl(new Uri(factory.Server.BaseAddress, "hubs/notifications"), o => { o.HttpMessageHandlerFactory = _ => factory.Server.CreateHandler(); o.Transports = HttpTransportType.LongPolling; o.AccessTokenProvider = () => Task.FromResult<string?>(token); }).Build()`; chờ sự kiện bằng `TaskCompletionSource` với timeout 5 giây; khẳng định "không nhận" bằng chờ 1 giây.

- [ ] **Step 1: Viết test thất bại**: `NTF_T28_NoOrBadToken_Negotiate401`, `NTF_T29_OnlyRecipientReceives` (chủ spa hủy lịch của A; A nhận `notificationCreated` có `referenceType == "appointment"` và `unreadCountChanged`; B không nhận), `NTF_T30_ReadAll_AllConnectionsGetZero`, `NTF_T31_FailedOperation_NoEvent` (409 `slot_unavailable`), `NTF_T32_RealtimeThrows_OperationSucceeds` (thay `INotificationRealtime` bằng fake ném lỗi qua `ConfigureTestServices`; nghiệp vụ 200, thông báo vẫn trong CSDL), `NTF_T33_QueryTokenOnRestEndpoint_Returns401`.
- [ ] **Step 2: Chạy** `--filter "FullyQualifiedName~NotificationHubTests"` → FAIL.
- [ ] **Step 3: Cài đặt.** Kiểm tra log Serilog request (`UseSerilogRequestLogging`) chỉ ghi `RequestPath` (không có query) — giữ nguyên template, không thêm `QueryString`.
- [ ] **Step 4: Chạy lại** + `dotnet test backend/NhuNguyetSpa.sln` toàn bộ → PASS (`UnitOfWorkTransactionTests` vẫn pass với interceptor mới).
- [ ] **Step 5: Commit** `feat(notifications): push notifications in realtime over SignalR`

### Task 9: Tài liệu, Postman, kiểm tra cuối

**Files:**

- Modify: `docs/decisions/open-questions.md` (Q-79..Q-82 "Chờ chốt", Q-83 "Đã chốt 16/11/2026", nội dung đúng mục "Câu hỏi còn mở" của spec)
- Modify: `docs/spec-source/data_api.py` (dòng 110–113: tên trường tiếng Anh, vai trò `CUS, STF, OWN`, `unreadOnly&type&page&pageSize`, `NotificationDto`, `{count}`, lỗi `notification_not_found`; **thêm cuối** dòng 152 `POST /me/notifications/{id}/read`), `docs/spec-source/data_rules.py` (RBAC `notification.self` thêm ✓ Chủ spa, nguồn "RS-13 (Q-79)"; BR-NTF-01 trỏ spec), sinh lại Excel/markdown theo README
- Modify: `docs/specs/notifications.md` (trạng thái "backend xong 16/11/2026" + link plan), các mục LATER đã đóng trong `bookings.md` (BKG-LATER-03, 10), `care.md` (CARE-LATER-02), `orders.md` (ORD-LATER-04 phần thành công, ORD-LATER-08), `staff.md` (STF-LATER-02), `reviews.md` (REV-LATER-01), `purchases-treatments.md` (TRT-LATER-05 phần thông báo): ghi "Đã làm ở UC-SPA-34 (16/11/2026)"
- Modify: `docs/progress.md` (dòng UC-SPA-34: API ✅, test ✅, web/mobile —), `docs/architecture.md` (hub SignalR, interceptor đẩy sau commit), `CLAUDE.md` (đoạn "**Notifications (UC-SPA-34) are done in the backend:** …" cùng văn phong các đoạn khác; bỏ "in-app notifications" khỏi câu "Not yet implemented")
- Modify: `backend/postman/generate_collection.py` (thư mục "Thông báo": 5 request với `expect_ok`/`expect_error`), chạy lại script sinh collection

- [ ] **Step 1: Cập nhật tài liệu và sinh lại** (`python docs/spec-source/build_excel.py`, `build_markdown.py` theo README; `python backend/postman/generate_collection.py`).
- [ ] **Step 2: Definition of Done:** `dotnet build backend/NhuNguyetSpa.sln` (0 warning), `dotnet test backend/NhuNguyetSpa.sln` (toàn bộ pass, cần Docker), `npm run format:check`. Ghi lại số test pass.
- [ ] **Step 3: Commit** `docs(notifications): update specs, progress, postman for UC-SPA-34`

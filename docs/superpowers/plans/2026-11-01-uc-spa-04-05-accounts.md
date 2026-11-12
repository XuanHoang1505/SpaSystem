# UC-SPA-04/05 — Tài khoản của tôi & quản lý tài khoản — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Backend cho `/api/v1/me` (xem/sửa thông tin, đổi mật khẩu, đổi/xóa ảnh đại diện) và `/api/v1/users` (chủ spa tìm, xem, sửa, khóa/mở khóa tài khoản).

**Architecture:** Thư mục `Users` ở mọi tầng. `ProfileService` (Application) phục vụ `/me*` theo `ICurrentUserService.UserId`; `UserAccountService` phục vụ `/users*`. Phần đọc + kiểm tra ảnh của `CatalogImageService` tách ra `ImageUploadReader` để avatar dùng chung. Không đổi schema.

**Tech Stack:** .NET 9, EF Core 9 + Npgsql, FluentValidation, xUnit + FluentAssertions + NSubstitute, Testcontainers PostgreSQL.

**Spec:** `docs/specs/auth.md` — mục UC-SPA-04, UC-SPA-05, BR-AUTH-14..19, API "UC-SPA-04 / 05", AUTH-T25..T42, Q-50..Q-56.

## Global Constraints

- Tên code theo glossary: entity `User`, thư mục `Users`, route `/me`, `/users`; enum JSON snake_case (`customer`, `locked`, `male`…).
- Thông điệp lỗi tiếng Việt; mã lỗi snake_case đúng spec: `user_not_found`, `phone_exists`, `current_password_incorrect`, `password_unchanged` (mã lỗi trường), `cannot_lock_self`, `account_inactive`, `image_required`, `image_too_large`, `image_type_not_supported`, `image_storage_unavailable`.
- DI bằng constructor + `private readonly`. File-scoped namespace, một type public chính mỗi file.
- Application không tham chiếu ASP.NET Core/EF Core.
- Không đổi hành vi UC đã xong; toàn bộ test hiện có pass; `PersistenceModelTests` pass (không migration).
- TDD: unit test (NSubstitute, `IDateTimeProvider` giả) + integration test (`PostgresFixture`, `AuthApiFactory`, `FakeFileStorage`).
- Quyền: `account.self` = customer, staff, owner; `account.manage` = owner.
- Cấu hình mới duy nhất: `Account:RevokeSessionsOnPasswordChange` = `true` (appsettings.json + `AccountOptions`). Không biến `.env` mới.
- Git do người dùng tự chạy: không commit/push; không thêm Co-Authored-By hay "Generated with". Bước "Commit" trong plan = dừng để người dùng commit nếu muốn.

## Review Focus

1. Hai request `PUT /me` đổi sang cùng một SĐT cùng lúc → một bên `409 phone_exists` (không phải `duplicate_value`). Test ở Task 5 (unique violation `ux_users_phone_number` dịch đúng mã).
2. `search` có ký tự `%`/`_` → khớp nguyên văn, không thành wildcard. Test ở Task 5 (dùng `CatalogSearchText.Contains` như Staff).
3. Đổi mật khẩu với `currentPassword` sai → không thu hồi phiên, không đổi hash. Test ở Task 3 (unit) và Task 6 (AUTH-T31).
4. `PATCH /users/{id}/status` với body thiếu `status`/`null` → `400 validation_error`, không 500. Test ở Task 4 (validator).
5. Upload avatar khi storage lỗi → `avatar_url` cũ giữ nguyên. Test ở Task 6 (AUTH-T33).

---

### Task 1: Tách `ImageUploadReader` dùng chung

**Files:**

- Create: `backend/src/Application/Common/Storage/ImageUploadReader.cs`
- Modify: `backend/src/Application/UseCases/Catalog/CatalogImageService.cs` (bỏ `ReadValidatedAsync`, `TooLarge`, `Invalid`, gọi reader)
- Modify: `backend/src/Application/DependencyInjection.cs`
- Test: `backend/tests/Application.Tests/Common/ImageUploadReaderTests.cs`

**Interfaces:**

- Produces: `public sealed class ImageUploadReader` (scoped, ctor `IOptions<ImageUploadOptions>`) với
  `Task<ValidatedImage> ReadAsync(ImageUploadRequest file, CancellationToken ct)`;
  `public sealed record ValidatedImage(MemoryStream Content, string ContentType) : IAsyncDisposable` (Content đã `Position = 0`).
  Ném `ValidationException` trường `file`, mã `image_required` / `image_too_large` / `image_type_not_supported` với đúng thông điệp hiện có.

- [ ] **Step 1:** Test `ReadAsync`: rỗng → `image_required`; `MaxBytes + 1` byte → `image_too_large`; byte text → `image_type_not_supported`; header JPEG hợp lệ → `ContentType == "image/jpeg"`, `Content.Position == 0`.
- [ ] **Step 2:** `dotnet test backend/NhuNguyetSpa.sln --filter "FullyQualifiedName~ImageUploadReaderTests"` → FAIL (chưa có type).
- [ ] **Step 3:** Di chuyển logic từ `CatalogImageService` sang reader (giữ cơ chế copy tối đa MaxBytes+1, `ImageFormatDetector.Detect`); `CatalogImageService` nhận `ImageUploadReader` thay `IOptions<ImageUploadOptions>`. Kiểm tra định dạng vẫn chạy **trước** khi load entity (giữ thứ tự lỗi hiện tại). Đăng ký `services.AddScoped<ImageUploadReader>()`.
- [ ] **Step 4:** Chạy test mới + `--filter "FullyQualifiedName~CatalogImage"` (unit + integration) → PASS.
- [ ] **Step 5:** Commit (người dùng).

### Task 2: Phương thức trạng thái trên `User`

**Files:**

- Modify: `backend/src/Domain/Entities/User.cs`
- Test: `backend/tests/Domain.Tests/Users/UserTests.cs`

**Interfaces:**

- Produces trên `User` (setter public giữ nguyên vì code cũ đang dùng):
  - `void UpdateProfile(string fullName, string phoneNumber, DateOnly? dateOfBirth, Gender? gender)`
  - `void ChangePasswordHash(string passwordHash)`
  - `void SetAvatar(string url)`, `void RemoveAvatar()`
  - `bool Lock()` (`Active → Locked`), `bool Unlock()` (`Locked → Active`): trả `true` khi trạng thái đổi, `false` khi đã đúng trạng thái; `Inactive` → `ConflictException(message, "account_inactive")`. Giá trị trả về cho service biết có cần thu hồi phiên và lưu không.

- [ ] **Step 1:** Test: `Lock` từ Active → Locked, trả `true`; `Lock` khi Locked → vẫn Locked, trả `false`; `Lock`/`Unlock` khi Inactive → `ConflictException` mã `account_inactive`; `Unlock` từ Locked → Active; `UpdateProfile` gán đủ 4 trường; `RemoveAvatar` → null.
- [ ] **Step 2:** `--filter "FullyQualifiedName~Domain.Tests.Users"` → FAIL.
- [ ] **Step 3:** Cài đặt. Thông điệp `account_inactive`: "Tài khoản đã ngừng hoạt động (nhân viên nghỉ việc), không thể khóa hoặc mở khóa." (`ConflictException` có sẵn trong `Domain.Exceptions`).
- [ ] **Step 4:** Chạy lại → PASS.
- [ ] **Step 5:** Commit.

### Task 3: `ProfileService` (UC-SPA-04)

**Files:**

- Create: `Application/DTOs/Users/MeDto.cs`, `UpdateProfileRequest.cs`, `ChangePasswordRequest.cs`, `AvatarUrlDto.cs`
- Create: `Application/Validators/Users/ProfileRules.cs`, `UpdateProfileRequestValidator.cs`, `ChangePasswordRequestValidator.cs`
- Create: `Application/Interfaces/Services/Users/IProfileService.cs`, `Application/UseCases/Users/ProfileService.cs`, `Application/UseCases/Users/UserErrors.cs`
- Modify: `Application/Common/Options/AccountOptions.cs` (+`RevokeSessionsOnPasswordChange = true`), `API/appsettings.json` (`Account:RevokeSessionsOnPasswordChange: true`), `Application/DependencyInjection.cs`
- Test: `backend/tests/Application.Tests/Users/ProfileServiceTests.cs`, `ProfileValidatorTests.cs`

**Interfaces:**

- Consumes: `ImageUploadReader` (Task 1), `User.UpdateProfile/ChangePasswordHash/SetAvatar/RemoveAvatar` (Task 2), `ICurrentUserService`, `IUserRepository`, `IRefreshTokenRepository.RevokeAllActiveAsync`, `IPasswordHasher`, `IFileStorage`, `IUnitOfWork`, `IDateTimeProvider`, `AccountErrors.PhoneExists()`.
- Produces:
  - `record MeDto(Guid Id, string FullName, string Email, string PhoneNumber, UserRole Role, UserStatus Status, string? AvatarUrl, DateOnly? DateOfBirth, Gender? Gender, DateTime CreatedAtUtc)`
  - `record UpdateProfileRequest(string FullName, string PhoneNumber, DateOnly? DateOfBirth, Gender? Gender)` — dùng lại cho `PUT /users/{id}`.
  - `record ChangePasswordRequest(string CurrentPassword, string NewPassword, string ConfirmPassword)`
  - `record AvatarUrlDto(string AvatarUrl)`
  - `IProfileService`: `GetAsync(ct) → OperationResult<MeDto>`, `UpdateAsync(UpdateProfileRequest, ct) → OperationResult<MeDto>`, `ChangePasswordAsync(ChangePasswordRequest, ct) → Task`, `UploadAvatarAsync(ImageUploadRequest, ct) → OperationResult<AvatarUrlDto>`, `DeleteAvatarAsync(ct) → Task`.
  - `UserErrors`: `UserNotFound()` → `NotFoundException("Không tìm thấy tài khoản.", "user_not_found")`; `CurrentPasswordIncorrect()` → `BusinessRuleException("Mật khẩu hiện tại không đúng.", "current_password_incorrect")`; `CannotLockSelf()` → `ConflictException("Bạn không thể tự khóa tài khoản của mình.", "cannot_lock_self")`.
  - `ProfileRules` (extension như `StaffRules`): `ProfileFullName` (không rỗng, ≤ 100), `ProfilePhoneNumber` (`^0\d{9}$`), `DateOfBirth(DateOnly today)` (null hoặc `1900-01-01 ≤ d ≤ today`, thông điệp "Ngày sinh phải từ 01/01/1900 đến hôm nay."), `Gender` (`IsInEnum`). `StaffRules.StaffFullName/StaffPhoneNumber` giữ nguyên.

- [ ] **Step 1: Validator tests** — `UpdateProfileRequestValidator(IDateTimeProvider)`: họ tên rỗng/101 ký tự, SĐT `12345`, ngày sinh = hôm nay VN + 1, `1899-12-31`, `(Gender)99` → lỗi đúng trường; ngày sinh hôm nay, null → hợp lệ. `ChangePasswordRequestValidator(IOptions<AccountOptions>)`: `NewPassword` dùng `StrongPassword(minLength)`; `ConfirmPassword` khác → lỗi; `NewPassword == CurrentPassword` → lỗi trường `NewPassword` có `ErrorCode == "password_unchanged"`, thông điệp "Mật khẩu mới phải khác mật khẩu hiện tại."; `CurrentPassword` rỗng → lỗi.
- [ ] **Step 2: Service tests** (NSubstitute, current user id cố định):
  - `GetAsync` user không tồn tại → `NotFoundException` mã `user_not_found`; `UserId == null` → cùng lỗi.
  - `UpdateAsync` trim các trường; SĐT khác và `ExistsByPhoneAsync` true → `phone_exists`, không `SaveChanges`; SĐT trùng SĐT của chính mình → không gọi `ExistsByPhoneAsync`, lưu.
  - `ChangePasswordAsync` `Verify` false → `current_password_incorrect`, không gọi `RevokeAllActiveAsync`, không `SaveChanges`; đúng → hash mới, `RevokeAllActiveAsync(userId, clock.UtcNow)` được gọi khi option true, không gọi khi false; một lần `SaveChangesAsync`.
  - `UploadAvatarAsync` gọi `IFileStorage.UploadImageAsync(_, "avatars/{userId}", "image/jpeg", _)`, lưu URL trả về; storage ném → `AvatarUrl` không đổi, không `SaveChanges`.
  - `DeleteAvatarAsync` khi `AvatarUrl == null` → không gọi storage; có ảnh → `DeleteAsync("avatars/{userId}")` rồi null.
- [ ] **Step 3:** `--filter "FullyQualifiedName~Application.Tests.Users"` → FAIL.
- [ ] **Step 4:** Cài đặt `ProfileService`. Chuẩn hóa: `FullName.Trim()`, `PhoneNumber.Trim()` (null → `""` để validator báo). Đổi mật khẩu: chạy `RevokeAllActiveAsync` và cập nhật hash rồi một `SaveChangesAsync` (cùng kiểu `AccountService.ResetPasswordAsync`). Thông điệp thành công: "Đã cập nhật thông tin tài khoản.", "Đã cập nhật ảnh đại diện.". Đăng ký DI + validators (validators quét assembly — kiểm tra `AddValidatorsFromAssembly` đã có).
- [ ] **Step 5:** Chạy lại → PASS.
- [ ] **Step 6:** Commit.

### Task 4: `UserAccountService` (UC-SPA-05, phần Application)

**Files:**

- Create: `Application/DTOs/Users/UserFilter.cs`, `UserSearchCriteria.cs`, `UserListItemDto.cs`, `UserDetailDto.cs`, `UserStaffInfoDto.cs`, `ChangeUserStatusRequest.cs`
- Create: `Application/Validators/Users/UserFilterValidator.cs`, `ChangeUserStatusRequestValidator.cs`
- Create: `Application/Interfaces/Services/Users/IUserAccountService.cs`, `Application/UseCases/Users/UserAccountService.cs`
- Modify: `Application/Interfaces/Repositories/IUserRepository.cs`, `Application/DependencyInjection.cs`
- Test: `backend/tests/Application.Tests/Users/UserAccountServiceTests.cs`, `UserAccountValidatorTests.cs`

**Interfaces:**

- Consumes: `UpdateProfileRequest` + `UpdateProfileRequestValidator` (Task 3), `User.Lock/Unlock/UpdateProfile` (Task 2), `UserErrors` (Task 3).
- Produces:
  - `class UserFilter { string? Search; string? Role; string? Status; }` (query string, như `StaffFilter`).
  - `record UserSearchCriteria(string? Search, UserRole? Role, UserStatus? Status, int PageNumber, int PageSize)`
  - `record UserListItemDto(Guid Id, string FullName, string Email, string PhoneNumber, UserRole Role, UserStatus Status, string? AvatarUrl, DateTime CreatedAtUtc)`
  - `record UserStaffInfoDto(DateOnly HireDate, DateOnly? ResignationDate)`
  - `record UserDetailDto(Guid Id, string FullName, string Email, string PhoneNumber, UserRole Role, UserStatus Status, string? AvatarUrl, DateOnly? DateOfBirth, Gender? Gender, DateTime CreatedAtUtc, DateTime? UpdatedAtUtc, UserStaffInfoDto? Staff)`
  - `record ChangeUserStatusRequest(UserStatus? Status)`
  - `IUserRepository` thêm: `Task<PagedResult<UserListItemDto>> SearchAsync(UserSearchCriteria, CancellationToken)`, `Task<UserDetailDto?> GetDetailAsync(Guid id, CancellationToken)`.
  - `IUserAccountService`: `SearchAsync(PagedQuery, UserFilter, ct) → OperationResult<PagedResult<UserListItemDto>>`, `GetAsync(Guid, ct) → OperationResult<UserDetailDto>`, `UpdateAsync(Guid, UpdateProfileRequest, ct) → OperationResult<UserDetailDto>`, `ChangeStatusAsync(Guid, ChangeUserStatusRequest, ct) → Task`.

- [ ] **Step 1: Validator tests** — `UserFilterValidator`: `Search` 101 ký tự → lỗi; `Role = "x"`, `Status = "deleted"` → lỗi; `"Customer"`, `"locked"` hợp lệ (không phân biệt hoa thường, parse snake_case). `ChangeUserStatusRequestValidator`: `null` → lỗi "Vui lòng chọn trạng thái."; `Inactive` → lỗi "Chỉ được khóa hoặc mở khóa tài khoản."; `Active`, `Locked` hợp lệ.
- [ ] **Step 2: Service tests:**
  - `SearchAsync` trim `Search` (rỗng → null), chuyển `Role`/`Status` sang enum, kẹp `PagedQuery` như `StaffService.CriteriaAsync`, gọi repository với criteria đúng.
  - `GetAsync` repository trả null → `user_not_found`.
  - `UpdateAsync` id không có → `user_not_found`; SĐT trùng người khác → `phone_exists`; hợp lệ → `UpdateProfile` + lưu + trả `GetDetailAsync`.
  - `ChangeStatusAsync(id == currentUserId, Locked)` → `cannot_lock_self`; `(id == currentUserId, Active)` → được; khóa user Active → `Status == Locked`, `RevokeAllActiveAsync(id, now)` gọi 1 lần, `SaveChanges` 1 lần; khóa user đã Locked → không revoke, không `SaveChanges`; mở khóa → không revoke; user Inactive → `account_inactive`.
- [ ] **Step 3:** Chạy → FAIL.
- [ ] **Step 4:** Cài đặt. Kiểm tra `cannot_lock_self` trước khi load user. Parse enum chuỗi snake_case: tách helper `UserQuery.TryParseRole/TryParseStatus` trong `Validators/Users/UserQuery.cs` (mẫu `StaffQuery`).
- [ ] **Step 5:** Chạy → PASS.
- [ ] **Step 6:** Commit.

### Task 5: Repository + dịch lỗi unique SĐT

**Files:**

- Modify: `Infrastructure/Repositories/UserRepository.cs`
- Modify: `Infrastructure/Persistence/Configurations/UserConfiguration.cs` (hằng `public const string UniquePhoneNumber = "ux_users_phone_number";`, dùng trong `HasDatabaseName`; class đang `internal` — `UnitOfWork` cùng assembly nên dùng được)
- Modify: `Infrastructure/Persistence/UnitOfWork.cs` (`UniqueViolation` + `UniquePhoneNumber` → `AccountErrors.PhoneExists()`)
- Test: `backend/tests/IntegrationTests/Users/UserRepositoryTests.cs`

**Interfaces:**

- Consumes: `UserSearchCriteria`, `UserListItemDto`, `UserDetailDto` (Task 4).

- [ ] **Step 1: Tests** (seed bằng `PostgresFixture.CreateContext()`, tên có tag riêng để không đụng dữ liệu test khác):
  - `search = "nguyen " + tag` khớp "Nguyễn … tag"; theo email (khác hoa thường); theo 4 số giữa SĐT; `"%"` không khớp mọi người (chỉ khớp tên chứa `%`).
  - Lọc `Role`, `Status`; sắp `CreatedAtUtc` giảm dần rồi `Id`; `TotalCount` đúng; trang 2.
  - `GetDetailAsync` nhân viên → `Staff.HireDate` có giá trị; khách hàng → `Staff == null`; id lạ → null.
  - Lưu hai user cùng SĐT qua `UnitOfWork` → `ConflictException` mã `phone_exists`.
- [ ] **Step 2:** `--filter "FullyQualifiedName~IntegrationTests.Users.UserRepositoryTests"` (Docker chạy) → FAIL.
- [ ] **Step 3:** Cài đặt search theo mẫu `StaffMemberRepository.SearchAsync` (`CatalogSearchText.Contains`, `AppDbContext.Unaccent(...ToLower())`, `ILike` email, `Like` SĐT), `AsNoTracking`, projection thẳng sang DTO; detail dùng left join `Context.StaffMembers`.
- [ ] **Step 4:** Chạy lại + `PersistenceModelTests` → PASS (đổi tên hằng không đổi model).
- [ ] **Step 5:** Commit.

### Task 6: API `MeController`, `UsersController` + integration tests

**Files:**

- Modify: `API/Authorization/Permissions.cs` (`AccountSelf = "account.self"` → customer, staff, owner; `AccountManage = "account.manage"` → owner)
- Create: `API/Controllers/MeController.cs` (`[Route("api/v1/me")]`), `API/Controllers/UsersController.cs` (`[Route("api/v1/users")]`)
- Test: `backend/tests/IntegrationTests/Users/MeEndpointsTests.cs`, `UsersEndpointsTests.cs`

**Interfaces:**

- Consumes: `IProfileService` (Task 3), `IUserAccountService` (Task 4).
- Endpoints (đúng bảng API trong spec):
  - `GET /me`, `PUT /me` (`UpdateProfileRequest`), `PUT /me/password` (`ChangePasswordRequest`, `[EnableRateLimiting(AuthenticationExtensions.AuthRateLimitPolicy)]`, 204), `POST /me/avatar` (multipart như `ServicesController.UploadImage`: `Consumes`, `RequestSizeLimit(ImageUploadOptions.HardLimitBytes)`, `RequestFormLimits`), `DELETE /me/avatar` (204). Tất cả `[Authorize(Policy = Permissions.AccountSelf)]`.
  - `GET /users` (`[FromQuery] PagedQuery, [FromQuery] UserFilter`), `GET /users/{id:guid}`, `PUT /users/{id:guid}`, `PATCH /users/{id:guid}/status` (204). Tất cả `Permissions.AccountManage`. `ProducesResponseType` theo mẫu `StaffController`.

- [ ] **Step 1: `MeEndpointsTests`** (dùng `AuthApiFactory.CreateUserAsync(password, status, role)` + login qua `/auth/login`, helper HTTP của `CatalogApi`) — AUTH-T25..T34:
  - T25: ba vai trò `GET /me` 200, `data.id` = user, body không chứa "password".
  - T26: `PUT /me` với `"  Trần Thị B  "`, SĐT mới, `gender: null` → 200, `fullName == "Trần Thị B"`; login bằng SĐT mới 200, SĐT cũ 401; DB `updated_at_utc` not null.
  - T27: body kèm `email`, `role: "owner"`, `status: "locked"` → các trường không đổi.
  - T28: SĐT người khác → 409 `phone_exists`; SĐT của mình → 200.
  - T29: từng dữ liệu sai → 400 `validation_error`.
  - T30: đổi mật khẩu đúng → 204; login mật khẩu mới 200, cũ 401; `/auth/refresh` bằng refresh token cũ → 401.
  - T31: sai mật khẩu hiện tại → 400 `current_password_incorrect` và refresh token cũ vẫn 200; yếu/không khớp/trùng cũ → 400 `validation_error` (trùng cũ: `errors[].code == "password_unchanged"`).
  - T32: upload JPEG nhỏ → 200, `factory.Files.Uploads` có publicId `avatars/{id}`, `GET /me` trả URL; DELETE 204 → `avatarUrl` null, `Files.Deletes` có `avatars/{id}`; DELETE lần 2 → 204, không thêm delete.
  - T33: không file / 5 MB + 1 / text đặt tên `.png` / `Files.Fail = true` → 400 ba mã / 503 và `avatarUrl` như trước.
  - T34: `/me`, `/me/password`, `/me/avatar` không Bearer → 401 `unauthorized`.
- [ ] **Step 2: `UsersEndpointsTests`** — AUTH-T35..T40:
  - T35: seed 3 user có tag (`Nguyễn Văn {tag}` customer, staff, locked) → `search=nguyen van {tag}` đủ 3; `search` theo email, một phần SĐT; `role=staff`; `status=locked`; `pageSize=1&pageNumber=2`; `role=x` → 400.
  - T36: nhân viên đã nghỉ (`StaffApi.SeedStaffAsync` + `ResignationDate`) → `data.staff.resignationDate`; khách → `data.staff` null; id lạ → 404 `user_not_found`.
  - T37: `PUT /users/{id}` hợp lệ → 200; SĐT trùng → 409 `phone_exists`.
  - T38: khách đăng nhập (có refresh token) → owner `PATCH {status:"locked"}` 204 → refresh của khách 401/403, login 403 `account_locked` → `PATCH {status:"active"}` 204 → login 200.
  - T39: tự khóa → 409 `cannot_lock_self`; khóa nhân viên `Inactive` → 409 `account_inactive`; khóa user đã locked → 204; `status:"inactive"` → 400; body `{}` → 400.
  - T40: token customer/staff gọi `GET /users` → 403 `forbidden`; không token → 401.
- [ ] **Step 3:** Chạy `--filter "FullyQualifiedName~IntegrationTests.Users"` → FAIL.
- [ ] **Step 4:** Cài đặt Permissions + 2 controller (mỏng, chỉ `HandleResult`/`NoContent()`).
- [ ] **Step 5:** Chạy lại → PASS; rồi `dotnet test backend/NhuNguyetSpa.sln` toàn bộ → PASS (AUTH-T42).
- [ ] **Step 6:** Commit.

### Task 7: Tài liệu, spec-source, Postman

**Files:**

- Modify: `docs/spec-source/data_api.py` — các dòng `/me`, `/me/password`, `/me/avatar`, `/users*` hiện có: sửa request/lỗi cho khớp spec (`{fullName, phoneNumber, dateOfBirth, gender}`, `{currentPassword, newPassword, confirmPassword}`, `{status: active|locked}`, mã lỗi snake_case); **thêm cuối danh sách** dòng `("AUTH","Xóa ảnh đại diện","DELETE",P+"/me/avatar","Command","UC-SPA-04","SCR-W22, SCR-M15","CUS, STF, OWN","—","—","204","")`.
- Modify: `docs/spec-source/data_rules.py` BR-AUTH-04/05 nếu cần nêu ý "không đổi email" (chỉ khi lệch spec); không thêm BR mới ở đây (BR-AUTH-14..19 thuộc spec).
- Regenerate: theo `docs/spec-source/README.md` (Excel + `data-model.md`), rồi chạy `PersistenceModelTests`.
- Modify: `docs/decisions/open-questions.md` — thêm Q-50..Q-56 (nội dung + mặc định đúng mục "Câu hỏi còn mở" của spec, trạng thái "Mặc định").
- Modify: `docs/domain/glossary.md` — thuật ngữ: "Thông tin tài khoản của tôi" (`MeDto`, `GET/PUT /me`, `ProfileService`), "Đổi mật khẩu" (`PUT /me/password`, lỗi `current_password_incorrect`), "Khóa/mở khóa tài khoản" (`PATCH /users/{id}/status`, `UserAccountService`, lỗi `cannot_lock_self`).
- Modify: `docs/progress.md` (dòng UC-SPA-04, 05), `docs/specs/auth.md` dòng "Đã đặc tả" → đã triển khai backend + link plan, `docs/specs/staff.md` Q-15 bỏ "(UC-SPA-04, chưa làm)".
- Modify: `CLAUDE.md` — đoạn "**Accounts (UC-SPA-04/05) are done in the backend:** …" (route, quyền, `Account:RevokeSessionsOnPasswordChange`, avatar `avatars/{userId}`); `backend/CLAUDE.md` nếu có danh sách quyền/thư mục.
- Modify: `backend/postman/generate_collection.py` — thư mục "Tài khoản" với 9 request mới; chạy lại script.

- [ ] **Step 1:** Sửa spec-source, chạy generator, `git diff --stat docs/` chỉ thấy file mong đợi.
- [ ] **Step 2:** Sửa các tài liệu còn lại.
- [ ] **Step 3:** Definition of Done: `dotnet build backend/NhuNguyetSpa.sln` (0 warning mới), `dotnet test backend/NhuNguyetSpa.sln`, `npm run format:check`, `npm run lint`, `npm run typecheck` → tất cả pass.
- [ ] **Step 4:** Commit.

# Tài khoản & xác thực — đặc tả

- **Nhóm:** `Auth`, `Users` · **Sprint:** 1 · **Nguồn:** DA §2.2.3 (UC Đăng nhập) / ĐX
- **Entity:** `User` (bảng `users`), `RefreshToken` (bảng `refresh_tokens`), `OwnerProfile` (bảng `owner_profiles`), `Customer` (bảng `customers`), `StaffMember` (bảng `staff_members`, chỉ đọc), `OtpCode` (bảng `otp_codes`) — xem [glossary](../domain/glossary.md), [data-model](../domain/data-model.md)
- **Trạng thái triển khai:** xem [progress.md](../progress.md)
- **Đã đặc tả:** UC-SPA-02 và seed tài khoản chủ spa (dev) — **đã triển khai backend 25/10/2026** (kế hoạch: `docs/superpowers/plans/2026-10-25-uc-spa-02-login.md`). UC-SPA-01 và UC-SPA-03 — **đã triển khai backend 25/10/2026** (gửi mail thật qua Gmail SMTP; kế hoạch: `docs/superpowers/plans/2026-10-25-uc-spa-01-03-otp.md`). BE-1 (phiên web bằng cookie, `resendAvailableAtUtc`) — **đã triển khai backend 05/11/2026**. UC-SPA-04, 05 — **đã triển khai backend 01/11/2026** (thư mục backend `Users`; kế hoạch: `docs/superpowers/plans/2026-11-01-uc-spa-04-05-accounts.md`).

## Use case

### UC-SPA-01 — Đăng ký tài khoản (OTP email)

| Mục            | Nội dung                                                                                          |
| -------------- | ------------------------------------------------------------------------------------------------- |
| Actor          | Khách (chưa có tài khoản)                                                                         |
| Mô tả          | Khách nhập thông tin, nhận OTP qua email, nhập đúng OTP thì hệ thống mới tạo tài khoản khách hàng |
| Tiền điều kiện | Email và số điện thoại chưa thuộc tài khoản nào                                                   |
| Input          | Bước 1: `fullName`, `email`, `phoneNumber`, `password`, `confirmPassword`. Bước 2: `email`, `otp` |
| Output         | Bước 1: email nhận OTP, thời điểm OTP hết hạn. Bước 2: id và email của tài khoản mới              |

**Luồng chính**

1. Khách gửi thông tin đăng ký (`POST /auth/register/request-otp`).
2. Hệ thống kiểm tra dữ liệu (E3) và chuẩn hóa: bỏ khoảng trắng hai đầu mọi trường; email so sánh không phân biệt hoa thường.
3. Hệ thống kiểm tra email và SĐT chưa có trong `users` (E1).
4. Hệ thống kiểm tra lần gửi OTP đăng ký gần nhất cho email này đã quá 60 giây (E4).
5. Hệ thống vô hiệu các OTP đăng ký còn hiệu lực của email này (đặt `expires_at_utc` = bây giờ), tạo OTP 6 chữ số mới, lưu vào `otp_codes`: `purpose = registration`, hash của OTP, `pending_registration` = `{ fullName, phoneNumber, passwordHash }` (mật khẩu đã băm, không lưu mật khẩu thô), hết hạn sau 5 phút.
6. Hệ thống gửi mail OTP (E5), trả `202 { email, expiresAtUtc }`.
7. Khách nhập OTP (`POST /auth/register/verify-otp`).
8. Hệ thống lấy OTP đăng ký **mới nhất chưa dùng** của email và kiểm tra (E2).
9. OTP đúng → trong một transaction: đánh dấu OTP đã dùng (`used_at_utc`), kiểm tra lại email/SĐT chưa bị người khác đăng ký trong lúc chờ (E1), tạo `users` (`role = customer`, `status = active`, dữ liệu lấy từ `pending_registration`) và `customers` (cùng id).
10. Trả `201 { id, email }`. Client chuyển sang màn hình đăng nhập (không tự đăng nhập — theo DA).

**Ngoại lệ**

- E1. Email đã có tài khoản → `409 email_exists`; SĐT đã có → `409 phone_exists` (kiểm tra email trước). Áp dụng ở cả bước 3 và bước 9.
- E2. OTP:
  - Không có OTP đăng ký chưa dùng cho email, hoặc OTP sai → `400 otp_invalid`. OTP sai thì tăng `failed_attempts`.
  - OTP mới nhất đã hết hạn → `400 otp_expired` (không tăng `failed_attempts`).
  - `failed_attempts` đã đạt 5 → `400 otp_too_many_attempts`; OTP này bị khóa vĩnh viễn, khách phải yêu cầu gửi lại. Lần nhập sai thứ 5 trả luôn `otp_too_many_attempts`.
- E3. Dữ liệu không hợp lệ → `400 validation_error` theo trường (quy tắc ở BR-AUTH-10).
- E4. Yêu cầu gửi lại trong vòng 60 giây kể từ lần gửi thành công trước → `429 rate_limited`, thông điệp có số giây phải chờ.
- E5. Gửi mail thất bại (thiếu cấu hình mail, SMTP lỗi, sai App Password) → xóa OTP vừa tạo, trả `503 email_send_failed` với thông điệp chung; chi tiết lỗi chỉ ghi log phía server. Lần gửi lỗi không tính vào thời gian chờ 60 giây.

### UC-SPA-03 — Quên mật khẩu (OTP email)

| Mục            | Nội dung                                                                                          |
| -------------- | ------------------------------------------------------------------------------------------------- |
| Actor          | Khách hàng, Nhân viên, Chủ spa                                                                    |
| Mô tả          | Người dùng quên mật khẩu nhận OTP qua email, xác thực OTP để lấy mã đặt lại, rồi đặt mật khẩu mới |
| Tiền điều kiện | Tài khoản tồn tại và đang `active`                                                                |
| Input          | Bước 1: `email`. Bước 2: `email`, `otp`. Bước 3: `resetToken`, `newPassword`, `confirmPassword`   |
| Output         | Bước 1: thời điểm OTP hết hạn. Bước 2: `resetToken` + thời điểm hết hạn. Bước 3: không có (204)   |

**Luồng chính**

1. Người dùng gửi email (`POST /auth/forgot-password/request-otp`).
2. Hệ thống tìm tài khoản theo email. Chỉ khi tài khoản tồn tại, đang `active` và lần gửi OTP đặt lại mật khẩu gần nhất đã quá 60 giây thì mới: vô hiệu OTP cũ, tạo OTP mới (`purpose = password_reset`, hết hạn 5 phút) và gửi mail (E5 như UC-SPA-01).
3. Trong mọi trường hợp còn lại (email không tồn tại, tài khoản `locked`/`inactive`, gửi lại trong 60 giây) hệ thống **không gửi mail** nhưng vẫn trả đúng cùng phản hồi `202 { expiresAtUtc }` (BR-AUTH-05 mở rộng: không tiết lộ tài khoản có tồn tại).
4. Người dùng nhập OTP (`POST /auth/forgot-password/verify-otp`). Hệ thống kiểm tra OTP như E2 của UC-SPA-01.
5. OTP đúng → đánh dấu OTP đã dùng; nếu tài khoản không còn `active` → E2 bên dưới. Ngược lại phát `resetToken` sống 10 phút, trả `200 { resetToken, expiresAtUtc }`.
6. Người dùng gửi mật khẩu mới (`POST /auth/forgot-password/reset`).
7. Hệ thống kiểm tra `resetToken` (E1) và mật khẩu mới (E3), cập nhật `password_hash`, **thu hồi mọi refresh token còn hiệu lực** của người dùng, lưu trong một lần, trả `204`.

**Ngoại lệ**

- E1. `resetToken` sai chữ ký, hết hạn, đã dùng (mật khẩu đã đổi sau khi phát token) hoặc tài khoản không còn `active` → `400 invalid_reset_token`.
- E2. OTP đúng nhưng tài khoản đã bị khóa/ngừng trong lúc chờ → `403 account_locked` / `account_inactive` (đã chứng minh sở hữu email nên được biết trạng thái).
- E3. Mật khẩu mới không đạt BR-AUTH-10 hoặc không khớp `confirmPassword` → `400 validation_error`.
- E4. Mọi lỗi OTP ở bước này (không có mã, sai, hết hạn, đã dùng, đã khóa sau 5 lần sai) đều trả `400 otp_invalid` cùng thông điệp, và khi không có mã vẫn chạy một lần kiểm tra hash giả — để bước xác thực cũng không tiết lộ email có tài khoản (BR-AUTH-05). Số lần sai vẫn được đếm và khóa mã sau 5 lần như UC-SPA-01.

**Giới hạn đã biết:** gửi mail chạy đồng bộ trong request (chưa có hàng đợi nền — ngoài phạm vi), nên yêu cầu với email có tài khoản phản hồi chậm hơn vài trăm mili giây đến vài giây so với email không có tài khoản; lỗi gửi mail (`503`) cũng chỉ xảy ra với email có tài khoản. Chấp nhận cho đồ án; khắc phục khi thêm hàng đợi gửi mail.

### UC-SPA-02 — Đăng nhập

| Mục            | Nội dung                                                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Actor          | Khách hàng, Nhân viên, Chủ spa                                                                                           |
| Mô tả          | Người dùng đăng nhập bằng email hoặc số điện thoại và mật khẩu, nhận access token (JWT) và refresh token                 |
| Tiền điều kiện | Tài khoản tồn tại trong `users`                                                                                          |
| Input          | `login` (email hoặc SĐT), `password`                                                                                     |
| Output         | `accessToken` + thời điểm hết hạn, `refreshToken` + thời điểm hết hạn, thông tin người dùng (id, họ tên, email, vai trò) |

**Luồng chính** (theo DA, bổ sung chi tiết kỹ thuật)

1. Người dùng gửi `login` và `password`.
2. Hệ thống chuẩn hóa `login`: bỏ khoảng trắng hai đầu; có ký tự `@` → tìm theo `email` (không phân biệt hoa thường, cột `citext`), ngược lại → tìm theo `phone_number`.
3. Hệ thống kiểm tra mật khẩu với `password_hash` (ASP.NET Core Identity `PasswordHasher`).
4. Hệ thống kiểm tra trạng thái tài khoản: chỉ `active` được đăng nhập.
5. Hệ thống phát access token 15 phút và refresh token 7 ngày, lưu hash refresh token vào `refresh_tokens`.
6. Trả token và thông tin người dùng; client điều hướng theo `role` (customer → `/account`, staff → `/staff`, owner → `/owner`).

**Luồng rẽ nhánh**

- A1. Đăng nhập từ thao tác đang dở → client quay lại thao tác trước đó (xử lý ở FE, ngoài phạm vi lần này).
- A2. **Làm mới phiên:** access token hết hạn → client gửi refresh token → hệ thống thu hồi token cũ, phát cặp token mới (xoay vòng).
- A3. **Đăng xuất:** client gửi refresh token kèm access token → hệ thống thu hồi refresh token đó.

**Ngoại lệ**

- E1. Không có tài khoản, hoặc sai mật khẩu → `401 invalid_credentials`, thông điệp chung "Email/số điện thoại hoặc mật khẩu không đúng." (không cho biết tài khoản có tồn tại không).
- E2. Mật khẩu đúng nhưng tài khoản `locked` → `403 account_locked`; `inactive` → `403 account_inactive`. Chỉ báo sau khi mật khẩu đúng để không lộ trạng thái tài khoản cho người không có mật khẩu.
- E3. Dữ liệu trống hoặc quá dài → `400 validation_error` theo trường.
- E4. Refresh token không tồn tại, đã hết hạn → `401 invalid_refresh_token`.
- E5. Refresh token đã bị thu hồi mà vẫn được gửi lại (dấu hiệu bị đánh cắp) → thu hồi **mọi** refresh token còn hiệu lực của người dùng đó, trả `401 invalid_refresh_token`.
- E6. Làm mới phiên khi tài khoản đã bị khóa/ngừng → thu hồi token, trả `403 account_locked` / `403 account_inactive`.
- E7. Gửi quá 10 yêu cầu/phút/IP vào `/auth/login` hoặc `/auth/refresh` → `429 rate_limited`.

**Quy tắc áp dụng:** BR-AUTH-01..05 bên dưới, BR-SEC-01.

### Seed tài khoản chủ spa (môi trường dev)

Không phải use case của DA; phục vụ phát triển vì chưa có màn hình tạo chủ spa.

- Chạy thủ công bằng `npm run db:seed` (gọi API với tham số `--seed-dev`), không tự chạy khi khởi động API.
- Chỉ chạy khi `ASPNETCORE_ENVIRONMENT=Development`; môi trường khác → báo lỗi và thoát mã khác 0.
- Đọc từ `.env`: `SEED_OWNER_EMAIL`, `SEED_OWNER_PASSWORD`, `SEED_OWNER_PHONE`, `SEED_OWNER_FULL_NAME`. Thiếu email hoặc mật khẩu → báo lỗi, không tạo gì.
- Idempotent: đã có người dùng trùng email → giữ nguyên, báo "đã tồn tại". Chưa có → tạo `users` (role `owner`, status `active`) + `owner_profiles` trong một lần lưu.

### UC-SPA-02 bổ sung — Phiên web bằng cookie HttpOnly (BE-1)

Bổ sung cho UC-SPA-02 (A2, A3) và UC-SPA-01/03 để giao diện web dùng được (mục "Giao diện (web)"). Quy ước `docs/conventions/frontend.md` và `data_api.py` đều ghi refresh token của web nằm trong cookie HttpOnly. Mobile giữ nguyên cách gửi token trong body.

**Luồng chính**

1. Client web gửi mọi request tới `/auth/*` kèm header `X-Auth-Transport: cookie` (so sánh không phân biệt hoa thường) và để trình duyệt gửi kèm cookie (`credentials: 'include'`). Đây là **chế độ cookie**.
2. `/auth/login` hoặc `/auth/refresh` thành công ở chế độ cookie: hệ thống ghi refresh token vào cookie (BR-AUTH-20) và trả body như cũ, nhưng `refreshToken = null`, `refreshTokenExpiresAtUtc = null`.
3. `/auth/refresh` ở chế độ cookie lấy token từ cookie; `refreshToken` trong body (nếu có) bị bỏ qua. Xoay vòng như A2 của UC-SPA-02.
4. `/auth/logout` ở chế độ cookie lấy token từ cookie. Bearer **không bắt buộc**, vì giữ được cookie đã là bằng chứng sở hữu phiên (Q-69). Token còn hiệu lực thì bị thu hồi (BR-AUTH-23). Luôn xóa cookie và trả `204`.
5. Không có header `X-Auth-Transport: cookie` thì chạy **đúng như trước** (token trong body, `/auth/logout` cần Bearer). Cookie gửi kèm request lúc đó bị bỏ qua (BR-AUTH-21).
6. `OtpSent` của `register/request-otp` và `forgot-password/request-otp` có thêm `resendAvailableAtUtc` (BR-AUTH-25).

**Luồng rẽ nhánh**

- A1. **Làm mới đồng thời** (nhiều tab cùng tải lại trang, dùng chung một cookie): token vừa bị xoay vòng mà được gửi lại trong vòng `Jwt:RefreshReuseGraceSeconds` (mặc định 30 giây) thì trả `401 invalid_refresh_token` **nhưng không thu hồi hàng loạt** (BR-AUTH-22). Lúc đó trình duyệt đã nhận cookie mới từ response thắng cuộc, nên client thử lại một lần là thành công.

**Ngoại lệ**

- E1. Chế độ cookie, `/auth/refresh` không có cookie → `401 invalid_refresh_token` (không phải `400`), để client coi là chưa đăng nhập.
- E2. Chế độ cookie, `/auth/refresh` thất bại (`401`/`403`) → response có thêm lệnh xóa cookie, để trình duyệt không gửi lại token đã chết.
- E3. Origin không có trong `Cors:AllowedOrigins` → preflight không có `Access-Control-Allow-Origin`, trình duyệt chặn. Backend không trả lỗi riêng.
- E4. Token đã bị thu hồi **chủ động** (đăng xuất, đổi hoặc đặt lại mật khẩu, khóa tài khoản, nhân viên nghỉ việc) được gửi lại → `401 invalid_refresh_token` và **không** thu hồi các phiên tạo sau đó (BR-AUTH-23). Ví dụ: đổi mật khẩu trên máy B rồi đăng nhập lại, sau đó mở trình duyệt cũ trên máy A; máy A phải đăng nhập lại, còn phiên mới trên máy B vẫn giữ.

### UC-SPA-04 — Cập nhật thông tin tài khoản

| Mục            | Nội dung                                                                                                                                   |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Actor          | Khách hàng, Nhân viên, Chủ spa (đã đăng nhập)                                                                                              |
| Mô tả          | Người dùng xem và sửa thông tin cá nhân của chính mình, đổi mật khẩu (A1), đổi hoặc xóa ảnh đại diện (A2)                                  |
| Tiền điều kiện | Access token hợp lệ; tài khoản tồn tại                                                                                                     |
| Input          | Sửa thông tin: `fullName`, `phoneNumber`, `dateOfBirth?`, `gender?`. A1: `currentPassword`, `newPassword`, `confirmPassword`. A2: file ảnh |
| Output         | `MeDto` sau khi lưu; A1: 204; A2: `{ avatarUrl }`                                                                                          |

**Luồng chính**

1. Người dùng mở thông tin tài khoản (`GET /me`). Hệ thống lấy người dùng theo `sub` của access token, trả `MeDto { id, fullName, email, phoneNumber, role, status, avatarUrl, dateOfBirth, gender, createdAtUtc }`.
2. Người dùng sửa và lưu (`PUT /me`, gửi đủ 4 trường — thay toàn bộ; `dateOfBirth`, `gender` gửi `null` để xóa).
3. Hệ thống chuẩn hóa (bỏ khoảng trắng hai đầu), kiểm tra dữ liệu (E1) theo BR-AUTH-15.
4. SĐT khác SĐT hiện tại → kiểm tra chưa thuộc tài khoản khác (E2).
5. Hệ thống lưu `full_name`, `phone_number`, `date_of_birth`, `gender` (audit `updated_at_utc`/`updated_by` tự ghi), trả `200 MeDto`.

Email, vai trò, trạng thái **không** sửa được ở đây (BR-AUTH-04; email là định danh đăng nhập, đổi email cần xác thực OTP — Q-50). Trường lạ trong body bị bỏ qua.

**Luồng rẽ nhánh**

- A1. **Đổi mật khẩu** (`PUT /me/password`): hệ thống kiểm tra dữ liệu (E1, mật khẩu mới theo BR-AUTH-10, khác mật khẩu hiện tại), kiểm tra `currentPassword` với `password_hash` (E3), băm và lưu mật khẩu mới, **thu hồi mọi refresh token còn hiệu lực** của người dùng trong cùng lần lưu (BR-AUTH-16, Q-51), trả `204`. Client đăng nhập lại; access token hiện tại vẫn dùng được tới khi hết hạn (≤ 15 phút).
- A2. **Đổi ảnh đại diện** (`POST /me/avatar`, multipart trường `file`): kiểm tra như ảnh catalog (BR-CAT-08: ≤ `ImageUpload:MaxBytes` 5 MB, nhận diện JPEG/PNG/WebP theo nội dung file), tải lên `IFileStorage` với `publicId = avatars/{userId}` (ghi đè ảnh cũ), lưu `avatar_url` chỉ sau khi tải lên thành công, trả `200 { avatarUrl }`.
- A3. **Xóa ảnh đại diện** (`DELETE /me/avatar`, ĐX): chưa có ảnh → `204` luôn; có ảnh → xóa trên storage rồi đặt `avatar_url = null`, `204`.

**Ngoại lệ**

- E1. Dữ liệu không hợp lệ → `400 validation_error` theo trường (BR-AUTH-15, BR-AUTH-10). Mật khẩu mới trùng mật khẩu hiện tại → `400 validation_error` trên `newPassword`, mã `password_unchanged`.
- E2. SĐT đã thuộc tài khoản khác → `409 phone_exists` (cả khi hai request đồng thời: vi phạm unique của CSDL cũng dịch thành `409 phone_exists`).
- E3. `currentPassword` sai → `400 current_password_incorrect` (không thu hồi phiên, không đổi gì). Lỗi này đếm vào giới hạn tần suất `auth` (BR-AUTH-17).
- E4. Ảnh: thiếu file `400 image_required`, quá dung lượng `400 image_too_large`, sai định dạng `400 image_type_not_supported`, storage lỗi/chưa cấu hình `503 image_storage_unavailable` (giữ ảnh cũ).
- E5. Người dùng của token không còn tồn tại → `404 user_not_found`. Tài khoản `locked`/`inactive` mà access token còn hạn vẫn gọi được (Q-52) — sau tối đa 15 phút không làm mới phiên được nữa.

### UC-SPA-05 — Quản lý tài khoản người dùng

| Mục            | Nội dung                                                                                                                                         |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Actor          | Chủ spa                                                                                                                                          |
| Mô tả          | Chủ spa tìm, xem chi tiết, sửa thông tin cá nhân (A1) và khóa/mở khóa (A2) tài khoản khách hàng, nhân viên, chủ spa                              |
| Tiền điều kiện | Đăng nhập với vai trò `owner`                                                                                                                    |
| Input          | Danh sách: `search?`, `role?`, `status?`, phân trang. A1: `fullName`, `phoneNumber`, `dateOfBirth?`, `gender?`. A2: `status` = `active`/`locked` |
| Output         | `PagedResult<UserListItemDto>`; `UserDetailDto`; A2: 204                                                                                         |

**Luồng chính**

1. Chủ spa mở danh sách (`GET /users`). Hệ thống lọc:
   - `search` (≤ 100 ký tự, bỏ khoảng trắng hai đầu): khớp một phần họ tên **không phân biệt hoa thường và dấu** (`f_unaccent`), hoặc email (không phân biệt hoa thường), hoặc SĐT (chuỗi con).
   - `role` ∈ `customer`/`staff`/`owner`, `status` ∈ `active`/`locked`/`inactive` (sai giá trị → `400 validation_error`).
   - Sắp theo `createdAtUtc` giảm dần rồi `id`; phân trang `PagedQuery` (mặc định 1/10, tối đa 100).
   - Mỗi dòng: `{ id, fullName, email, phoneNumber, role, status, avatarUrl, createdAtUtc }`.
2. Chủ spa chọn một tài khoản (`GET /users/{id}`). Hệ thống trả `UserDetailDto` = các trường danh sách + `dateOfBirth`, `gender`, `updatedAtUtc` và `staff: { hireDate, resignationDate } | null` (chỉ khi `role = staff`, để chủ spa thấy vì sao tài khoản `inactive`).

**Luồng rẽ nhánh**

- A1. **Sửa** (`PUT /users/{id}`): cùng trường, cùng chuẩn hóa và quy tắc như `PUT /me` (BR-AUTH-15, E1, E2); sửa được mọi vai trò và mọi trạng thái, kể cả chính mình. Không sửa email, vai trò, mật khẩu (chủ spa không đặt mật khẩu hộ — người dùng dùng quên mật khẩu). Trả `200 UserDetailDto`. Thông tin riêng của nhân viên (ngày vào làm, chuyên môn, kỹ năng) vẫn sửa ở `/staff/{id}` (UC-SPA-22).
- A2. **Khóa / mở khóa** (`PATCH /users/{id}/status`, `{ status }`):
  1. `status` chỉ nhận `active` hoặc `locked` (khác → `400 validation_error`).
  2. Tài khoản là chính người gọi và `status = locked` → `409 cannot_lock_self` (BR-AUTH-05).
  3. Tài khoản đang `inactive` (nhân viên đã nghỉ việc) → `409 account_inactive` — không khóa/mở được, trạng thái này do UC-SPA-22 quản lý.
  4. Trạng thái đã đúng như yêu cầu → `204`, không đổi gì (idempotent).
  5. `active → locked`: đổi trạng thái và **thu hồi mọi refresh token còn hiệu lực** trong cùng lần lưu (BR-AUTH-18). `locked → active`: chỉ đổi trạng thái. Trả `204`.

**Ngoại lệ**

- E1. Dữ liệu sửa/lọc không hợp lệ → `400 validation_error` theo trường; SĐT trùng → `409 phone_exists`.
- E2. Không có tài khoản `id` → `404 user_not_found`.
- E3. Không đăng nhập → `401 unauthorized`; vai trò khác `owner` → `403 forbidden`.

Khóa tài khoản **không** tự hủy lịch hẹn, đơn hàng hay ca làm của người đó (Q-54); chủ spa tự xử lý ở các màn hình tương ứng.

## Business rules

| Mã         | Quy tắc                                                                                                                                                                                                                                                                                                                                                                                   | Enforce ở đâu                                                  | Nguồn                    |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------ |
| BR-AUTH-01 | Access token JWT ký HMAC-SHA256 bằng `JWT_KEY` (≥ 32 ký tự), sống 15 phút; claims: `sub` = user id, `role` = `customer`/`staff`/`owner`, `name` = họ tên, `jti`                                                                                                                                                                                                                           | Infrastructure `JwtTokenService`                               | Quyết định của bạn       |
| BR-AUTH-02 | Refresh token: 64 byte ngẫu nhiên (base64url), sống 7 ngày; CSDL chỉ lưu SHA-256 hex của token, không lưu token thô                                                                                                                                                                                                                                                                       | Infrastructure, `refresh_tokens`                               | Quyết định của bạn       |
| BR-AUTH-03 | Chỉ `status = active` được đăng nhập và làm mới phiên                                                                                                                                                                                                                                                                                                                                     | Application `AuthService`                                      | DA (UC Đăng nhập E2)     |
| BR-AUTH-04 | Xoay vòng: mỗi lần làm mới thu hồi token cũ (`revoked_at_utc`) và phát token mới trong cùng một lần lưu; gửi lại token đã thu hồi → thu hồi mọi token của người dùng                                                                                                                                                                                                                      | Application `AuthService`                                      | ĐX                       |
| BR-AUTH-05 | Không tiết lộ tài khoản có tồn tại: sai email/SĐT và sai mật khẩu trả cùng mã, cùng thông điệp; khi không thấy tài khoản vẫn chạy một lần kiểm tra hash giả để thời gian phản hồi tương đương                                                                                                                                                                                             | Application `AuthService`                                      | ĐX                       |
| BR-AUTH-06 | Thời hạn token, issuer, audience đọc từ cấu hình `Jwt:*` (`appsettings.json` + `.env`), không viết cứng                                                                                                                                                                                                                                                                                   | `JwtOptions`                                                   | open-questions (quy ước) |
| BR-AUTH-07 | OTP: 6 chữ số sinh bằng bộ sinh số ngẫu nhiên mật mã, hết hạn 5 phút, dùng 1 lần, CSDL chỉ lưu hash (PasswordHasher, có salt); tối đa 5 lần nhập sai; gửi lại sau 60 giây; mỗi email chỉ có 1 OTP còn hiệu lực cho mỗi mục đích (kiểm tra thời gian chờ, vô hiệu mã cũ và tạo mã mới chạy trong một transaction có khóa theo email + mục đích, nên hai yêu cầu đồng thời chỉ phát một mã) | Application `AccountService`, `otp_codes`                      | DA (OTP) + ĐX (tham số)  |
| BR-AUTH-08 | Đánh dấu OTP đã dùng và tăng số lần sai là thao tác nguyên tử ở CSDL (điều kiện `used_at_utc IS NULL`, `failed_attempts < 5`): hai request song song cùng OTP đúng chỉ một request thành công                                                                                                                                                                                             | Infrastructure `OtpCodeRepository`                             | ĐX                       |
| BR-AUTH-09 | `resetToken`: JWT ký bằng `JWT_KEY`, audience riêng `NhuNguyetSpa.PasswordReset` (không dùng làm access token được), sống 10 phút, chứa `sub` và dấu vân tay của `password_hash` hiện tại; đổi mật khẩu xong dấu vân tay đổi nên token tự hết dùng được (dùng 1 lần, không cần bảng mới)                                                                                                  | Infrastructure `JwtTokenService`                               | ĐX                       |
| BR-AUTH-10 | Mật khẩu (đăng ký, đặt lại): 8–128 ký tự, có ít nhất 1 chữ cái và 1 chữ số, khớp `confirmPassword`. Họ tên 1–100 ký tự. Email đúng định dạng, ≤ 255 ký tự. SĐT dạng `0` + 9 chữ số (lưu nguyên dạng này để đăng nhập bằng SĐT khớp)                                                                                                                                                       | Application validators                                         | open-questions Q-12      |
| BR-AUTH-11 | Đặt lại mật khẩu thành công → thu hồi mọi refresh token còn hiệu lực của người dùng                                                                                                                                                                                                                                                                                                       | Application `AccountService`                                   | DA (UC-SPA-03)           |
| BR-AUTH-12 | Mail OTP bằng tiếng Việt, có bản HTML và bản text: tên spa, mã OTP, thời hạn 5 phút, lời nhắc không chia sẻ mã và bỏ qua nếu không phải mình yêu cầu. Tiêu đề: "Mã xác thực đăng ký tài khoản – Spa Như Nguyệt" / "Mã đặt lại mật khẩu – Spa Như Nguyệt"                                                                                                                                  | Application (nội dung), Infrastructure `SmtpEmailSender` (gửi) | ĐX                       |
| BR-AUTH-13 | App Password và nội dung OTP không bao giờ ghi vào log; log gửi mail chỉ ghi địa chỉ nhận đã che (`n***@gmail.com`) và loại lỗi                                                                                                                                                                                                                                                           | Infrastructure                                                 | Ràng buộc của bạn        |

| BR-AUTH-14 | `/me*` chỉ thao tác trên người dùng của `sub` trong access token, không nhận id từ client; người dùng không tự đổi email, vai trò, trạng thái. Chủ spa sửa người khác qua `/users/{id}` nhưng cũng không đổi email, vai trò, mật khẩu | Application `ProfileService`, `UserAccountService` | DA (BR-AUTH-04 của DA) |
| BR-AUTH-15 | Thông tin cá nhân: họ tên 1–100 ký tự; SĐT `0` + 9 chữ số (như BR-AUTH-10), unique; `dateOfBirth` tùy chọn, không sau hôm nay (giờ VN) và không trước 01/01/1900; `gender` tùy chọn ∈ `male`/`female`/`other` | Application validators (dùng chung cho `/me` và `/users/{id}`), unique CSDL | DA + ĐX (Q-53) |
| BR-AUTH-16 | Đổi mật khẩu: phải nhập đúng mật khẩu hiện tại; mật khẩu mới theo BR-AUTH-10 và khác mật khẩu hiện tại; đổi xong thu hồi mọi refresh token còn hiệu lực (`Account:RevokeSessionsOnPasswordChange`, mặc định `true`) | Application `ProfileService` | ĐX (Q-51) |
| BR-AUTH-17 | `PUT /me/password` dùng chung giới hạn tần suất `auth` (10 yêu cầu/phút/IP) để chống dò mật khẩu hiện tại bằng access token bị lộ | API | ĐX |
| BR-AUTH-18 | Khóa/mở khóa: chỉ `active ↔ locked`; không khóa chính mình; `inactive` không đổi được qua UC này; khóa thu hồi mọi refresh token; lặp lại cùng trạng thái là thao tác rỗng | Application `UserAccountService` | DA + ĐX (BR-AUTH-05 của DA, WF-10) |
| BR-AUTH-19 | Ảnh đại diện dùng chung kiểm tra ảnh và cổng `IFileStorage` với catalog (BR-CAT-08, 09), `publicId = avatars/{userId}`; URL trong CSDL chỉ đổi sau khi storage thành công | Application `ProfileService` (dùng chung bộ đọc ảnh với `CatalogImageService`) | ĐX |
| BR-AUTH-20 | Cookie refresh token: tên `AuthCookie:Name` (mặc định `spa_refresh_token`), `HttpOnly`, `SameSite=Strict`, `Path=/api/v1/auth`, `Expires` = hạn refresh token, `Secure` theo `AuthCookie:Secure` (mặc định `true`, Development `false`). Ở chế độ cookie, token không bao giờ nằm trong body | API (`RefreshTokenCookie`) | ĐX (conventions/frontend.md, data_api) |
| BR-AUTH-21 | Chỉ khi có header `X-Auth-Transport: cookie` thì backend mới ghi và đọc cookie. Đây là lớp chống CSRF: header tùy chỉnh buộc trình duyệt gửi preflight CORS, origin lạ bị chặn, cộng thêm `SameSite=Strict` | API | ĐX |
| BR-AUTH-22 | Cửa sổ ân hạn: token đã bị **xoay vòng** được gửi lại trong `Jwt:RefreshReuseGraceSeconds` (mặc định 30) kể từ `revoked_at_utc` thì trả `401 invalid_refresh_token`, không thu hồi hàng loạt; quá cửa sổ thì áp BR-AUTH-04 | Application `AuthService` | ĐX (Q-66) |
| BR-AUTH-23 | **Thu hồi chủ động** (đăng xuất, đổi hoặc đặt lại mật khẩu, khóa tài khoản, nhân viên nghỉ việc, và thu hồi hàng loạt khi phát hiện tái sử dụng) **xóa** dòng `refresh_tokens`. Chỉ xoay vòng mới đánh dấu `revoked_at_utc`. Nhờ đó chỉ token bị xoay vòng mà dùng lại mới là dấu hiệu bị đánh cắp | Infrastructure `RefreshTokenRepository` | ĐX (Q-67) |
| BR-AUTH-24 | `/auth/refresh` dùng giới hạn tần suất riêng `auth-refresh`: 30 yêu cầu/phút/IP. Các endpoint còn lại giữ giới hạn `auth` 10 yêu cầu/phút/IP | API | ĐX (Q-68) |
| BR-AUTH-25 | `OtpSent.resendAvailableAtUtc`: đăng ký = thời điểm tạo OTP vừa gửi + `Account:OtpResendCooldownSeconds`; quên mật khẩu luôn = bây giờ + cooldown cho mọi email (BR-AUTH-05) | Application `AccountService` | ĐX |
| BR-AUTH-26 | CORS cho phép credentials (`AllowCredentials`) chỉ với origin liệt kê trong `Cors:AllowedOrigins`, không bao giờ dùng wildcard | API | ĐX |

Khóa tài khoản tạm sau nhiều lần sai mật khẩu (đề xuất trước đây) **không làm** lần này: bảng `users` không có cột đếm số lần sai. Giới hạn tần suất theo IP (E7) thay thế tạm.

## Dữ liệu

| Bảng             | Cột dùng                                                                                                                            | Ràng buộc đặc biệt                                          |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `users`          | `id`, `email`, `phone_number`, `password_hash`, `role`, `status`, `full_name`                                                       | `email` citext unique, `phone_number` unique                |
| `refresh_tokens` | `id`, `user_id`, `token_hash`, `expires_at_utc`, `revoked_at_utc`, `created_at_utc`                                                 | `token_hash` unique                                         |
| `owner_profiles` | `id` (= `users.id`)                                                                                                                 | Dùng khi seed                                               |
| `customers`      | `id` (= `users.id`)                                                                                                                 | Tạo khi đăng ký thành công                                  |
| `otp_codes`      | `id`, `email`, `purpose`, `code_hash`, `pending_registration`, `failed_attempts`, `expires_at_utc`, `used_at_utc`, `created_at_utc` | `purpose` ∈ `registration`, `password_reset`; index `email` |

UC-SPA-04/05 dùng thêm: `users.avatar_url`, `date_of_birth`, `gender`, `created_at_utc`, `updated_at_utc`, `updated_by`; `staff_members.hire_date`, `resignation_date` (chỉ đọc, cho `UserDetailDto.staff`); `refresh_tokens` (thu hồi khi đổi mật khẩu/khóa). **Không đổi schema, không migration.** `customers.note`, `owner_profiles.note` không đưa vào API lần này (DA không có trên màn hình SCR-W22/W40).

Không cần migration mới (bảng `otp_codes` đã có đủ cột). OTP hết hạn/đã dùng không bị xóa tự động lần này (dọn dẹp định kỳ thuộc phần background job, ngoài phạm vi).

## API

Tiền tố `/api/v1`. Phản hồi bọc envelope `{ success, message, data, errors, traceId }`.

| Method | Đường dẫn       | Vai trò               | Request               | Response                                                                                                                    | Lỗi                                                                                                            |
| ------ | --------------- | --------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| POST   | `/auth/login`   | Ẩn danh               | `{ login, password }` | 200 `{ accessToken, accessTokenExpiresAtUtc, refreshToken, refreshTokenExpiresAtUtc, user: { id, fullName, email, role } }` | 400 `validation_error`, 401 `invalid_credentials`, 403 `account_locked`/`account_inactive`, 429 `rate_limited` |
| POST   | `/auth/refresh` | Ẩn danh               | `{ refreshToken }`    | 200 như `/auth/login`                                                                                                       | 400, 401 `invalid_refresh_token`, 403, 429                                                                     |
| POST   | `/auth/logout`  | Đã đăng nhập (Bearer) | `{ refreshToken }`    | 204 (kể cả token đã thu hồi hoặc không thuộc người gọi — không tiết lộ)                                                     | 401 `unauthorized` khi thiếu/sai access token                                                                  |

| POST | `/auth/register/request-otp` | Ẩn danh | `{ fullName, email, phoneNumber, password, confirmPassword }` | 202 `{ email, expiresAtUtc }` | 400 `validation_error`, 409 `email_exists`/`phone_exists`, 429 `rate_limited`, 503 `email_send_failed` |
| POST | `/auth/register/verify-otp` | Ẩn danh | `{ email, otp }` | 201 `{ id, email }` | 400 `validation_error`/`otp_invalid`/`otp_expired`/`otp_too_many_attempts`, 409, 429 |
| POST | `/auth/forgot-password/request-otp` | Ẩn danh | `{ email }` | 202 `{ expiresAtUtc }` (luôn như nhau) | 400 `validation_error`, 429 (giới hạn IP), 503 `email_send_failed` |
| POST | `/auth/forgot-password/verify-otp` | Ẩn danh | `{ email, otp }` | 200 `{ resetToken, expiresAtUtc }` | 400 mã OTP, 403 `account_locked`/`account_inactive`, 429 |
| POST | `/auth/forgot-password/reset` | Ẩn danh | `{ resetToken, newPassword, confirmPassword }` | 204 | 400 `validation_error`/`invalid_reset_token`, 429 |

**UC-SPA-04 / 05** (quyền `account.self` = customer, staff, owner; `account.manage` = owner — sheet 21):

| Method | Đường dẫn            | Quyền            | Request                                             | Response                           | Lỗi                                                                                                               |
| ------ | -------------------- | ---------------- | --------------------------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| GET    | `/me`                | `account.self`   | —                                                   | 200 `MeDto`                        | 401, 403, 404 `user_not_found`                                                                                    |
| PUT    | `/me`                | `account.self`   | `{ fullName, phoneNumber, dateOfBirth, gender }`    | 200 `MeDto`                        | 400 `validation_error`, 401, 403, 404, 409 `phone_exists`                                                         |
| PUT    | `/me/password`       | `account.self`   | `{ currentPassword, newPassword, confirmPassword }` | 204                                | 400 `validation_error`/`current_password_incorrect`, 401, 403, 404, 429 `rate_limited`                            |
| POST   | `/me/avatar`         | `account.self`   | multipart `file` (≤ 5 MB, JPEG/PNG/WebP)            | 200 `{ avatarUrl }`                | 400 `image_required`/`image_too_large`/`image_type_not_supported`, 401, 403, 404, 503 `image_storage_unavailable` |
| DELETE | `/me/avatar`         | `account.self`   | —                                                   | 204                                | 401, 403, 404, 503                                                                                                |
| GET    | `/users`             | `account.manage` | `?search&role&status&pageNumber&pageSize`           | 200 `PagedResult<UserListItemDto>` | 400, 401, 403                                                                                                     |
| GET    | `/users/{id}`        | `account.manage` | —                                                   | 200 `UserDetailDto`                | 401, 403, 404 `user_not_found`                                                                                    |
| PUT    | `/users/{id}`        | `account.manage` | `{ fullName, phoneNumber, dateOfBirth, gender }`    | 200 `UserDetailDto`                | 400, 401, 403, 404, 409 `phone_exists`                                                                            |
| PATCH  | `/users/{id}/status` | `account.manage` | `{ status: "active" \| "locked" }`                  | 204                                | 400, 401, 403, 404, 409 `cannot_lock_self`/`account_inactive`                                                     |

- `dateOfBirth` dạng `yyyy-MM-dd`; `gender`, `role`, `status` là chuỗi snake_case của enum.
- `DELETE /me/avatar` là dòng API mới (ĐX), thêm vào **cuối** `data_api.py`. Các dòng SPA-API cũ của `/me`, `/users` giữ nguyên mã, chỉ sửa cột request/lỗi cho khớp spec (`currentPassword`/`confirmPassword`, mã lỗi snake_case).
- Controller mới: `MeController` (`/me`), `UsersController` (`/users`).

- 5 endpoint mới dùng chung giới hạn `auth` với `/auth/login` và `/auth/refresh`: 10 yêu cầu/phút/IP tính chung cho cả 7 endpoint.

**BE-1, phiên web bằng cookie** (chỉ khi có header `X-Auth-Transport: cookie`; không có header thì như bảng trên):

| Method | Đường dẫn       | Vai trò             | Request               | Response                                                                                          | Lỗi                                                                                    |
| ------ | --------------- | ------------------- | --------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| POST   | `/auth/login`   | Ẩn danh             | `{ login, password }` | 200 như cũ, `refreshToken`/`refreshTokenExpiresAtUtc` = `null`; `Set-Cookie: spa_refresh_token=…` | Như cũ                                                                                 |
| POST   | `/auth/refresh` | Ẩn danh             | Không body; cookie    | 200 như `/auth/login` ở chế độ cookie                                                             | 401 `invalid_refresh_token` (kể cả thiếu cookie), 403: kèm xóa cookie; 429: giữ cookie |
| POST   | `/auth/logout`  | Ẩn danh hoặc Bearer | Không body; cookie    | 204, xóa cookie                                                                                   | —                                                                                      |

- `register/request-otp`, `forgot-password/request-otp` trả `202 { email, expiresAtUtc, resendAvailableAtUtc }`. Đây là trường thêm vào, client cũ không bị ảnh hưởng.
- Giới hạn tần suất: `/auth/refresh` thuộc `auth-refresh` (30/phút/IP). Sáu endpoint `/auth/*` còn lại cùng `PUT /me/password` dùng chung `auth` (10/phút/IP).
- `otp` trong request: chuỗi đúng 6 chữ số, sai định dạng → `400 validation_error` (không tính lần sai).
- Mọi endpoint có `[Authorize]` khi thiếu hoặc sai access token trả `401` dạng envelope, mã `unauthorized`; sai vai trò trả `403`, mã `forbidden`.
- Refresh token trả trong body cho cả web và mobile. Cookie HttpOnly cho web để lại khi tích hợp giao diện web.

## Cấu hình

| Biến `.env`                                                                           | Khóa cấu hình                      | Mặc định (`appsettings.json`) |
| ------------------------------------------------------------------------------------- | ---------------------------------- | ----------------------------- |
| `JWT_KEY`                                                                             | `Jwt:SecretKey`                    | — (bắt buộc, ≥ 32 ký tự)      |
| `JWT_ISSUER`                                                                          | `Jwt:Issuer`                       | `NhuNguyetSpa.API`            |
| `JWT_AUDIENCE`                                                                        | `Jwt:Audience`                     | `NhuNguyetSpa.Clients`        |
| `JWT_ACCESS_TOKEN_EXPIRATION`                                                         | `Jwt:AccessTokenExpirationMinutes` | `15`                          |
| `JWT_REFRESH_TOKEN_EXPIRATION`                                                        | `Jwt:RefreshTokenExpirationDays`   | `7`                           |
| `SEED_OWNER_EMAIL`, `SEED_OWNER_PASSWORD`, `SEED_OWNER_PHONE`, `SEED_OWNER_FULL_NAME` | `Seed:OwnerEmail`, …               | — (chỉ dev)                   |

| `MAIL_SETTINGS_MAIL` | `MailSettings:Mail` | — (bắt buộc khi gửi OTP; địa chỉ Gmail gửi đi) |
| `MAIL_SETTINGS_DISPLAY_NAME` | `MailSettings:DisplayName` | `Spa Như Nguyệt` |
| `MAIL_SETTINGS_PASSWORD` | `MailSettings:Password` | — (bắt buộc; Gmail App Password, chỉ ở `.env`) |
| `MAIL_SETTINGS_HOST` | `MailSettings:Host` | `smtp.gmail.com` |
| `MAIL_SETTINGS_PORT` | `MailSettings:Port` | `587` (STARTTLS) |
| — (`appsettings.json`) | `Account:OtpExpirationMinutes`, `Account:OtpMaxFailedAttempts`, `Account:OtpResendCooldownSeconds`, `Account:PasswordResetTokenExpirationMinutes`, `Account:PasswordMinLength` | `5`, `5`, `60`, `10`, `8` |

| — (`appsettings.json`) | `Account:RevokeSessionsOnPasswordChange` | `true` (Q-51) |
| — (dùng lại) | `ImageUpload:MaxBytes`, `CLOUDINARY_*` | 5 MB; thiếu khóa Cloudinary chỉ làm `/me/avatar` trả 503 |

UC-SPA-04/05 không thêm biến `.env` mới.

**BE-1** (không có secret, không thêm biến `.env`):

| Khóa cấu hình                  | Mặc định (`appsettings.json`)                                           |
| ------------------------------ | ----------------------------------------------------------------------- |
| `AuthCookie:Name`              | `spa_refresh_token`                                                     |
| `AuthCookie:Secure`            | `true`; `appsettings.Development.json`: `false` (HTTP trên LAN khi dev) |
| `Jwt:RefreshReuseGraceSeconds` | `30` (Q-66)                                                             |

Docker Compose chạy Production qua HTTP. Nếu truy cập bằng IP LAN thay vì `localhost` thì đặt `AuthCookie__Secure=false` trong compose (Q-70).

Thiếu `JWT_KEY` không chặn API khởi động (health check, Swagger vẫn chạy); lỗi cấu hình chỉ xảy ra khi gọi đăng nhập hoặc gửi Bearer token. Tương tự, thiếu `MAIL_SETTINGS_MAIL`/`MAIL_SETTINGS_PASSWORD` không chặn khởi động: chỉ endpoint gửi OTP trả `503 email_send_failed` và log lỗi cấu hình. Gửi mail chờ tối đa 30 giây rồi coi là lỗi.

## Kiểm thử bắt buộc

| Mã       | Tình huống                                                                                                                       | Kết quả mong đợi                                                                                                                            |
| -------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| AUTH-T01 | Đăng nhập đúng bằng email (khác hoa thường) và bằng SĐT                                                                          | 200, access token có `sub`, `role`, hết hạn sau 15 phút; 1 dòng `refresh_tokens`                                                            |
| AUTH-T02 | Sai mật khẩu / email không tồn tại                                                                                               | Cùng `401 invalid_credentials`, cùng thông điệp                                                                                             |
| AUTH-T03 | Tài khoản `locked` / `inactive`, mật khẩu đúng                                                                                   | `403 account_locked` / `account_inactive`                                                                                                   |
| AUTH-T04 | Làm mới phiên với token hợp lệ                                                                                                   | Token cũ có `revoked_at_utc`, token mới khác token cũ                                                                                       |
| AUTH-T05 | Gửi lại refresh token đã dùng                                                                                                    | 401; mọi token còn hiệu lực của người dùng bị thu hồi                                                                                       |
| AUTH-T06 | Refresh token hết hạn                                                                                                            | `401 invalid_refresh_token`                                                                                                                 |
| AUTH-T07 | Đăng xuất rồi làm mới bằng token vừa đăng xuất                                                                                   | 204, sau đó 401                                                                                                                             |
| AUTH-T08 | Gọi `/auth/logout` không có Bearer                                                                                               | 401 envelope, mã `unauthorized`                                                                                                             |
| AUTH-T09 | 11 lần gọi `/auth/login` trong 1 phút từ cùng IP                                                                                 | Lần thứ 11 trả `429 rate_limited`                                                                                                           |
| AUTH-T10 | Seed chạy 2 lần                                                                                                                  | Lần 1 tạo chủ spa đăng nhập được; lần 2 không tạo thêm                                                                                      |
| AUTH-T11 | Đăng ký: request-otp rồi verify-otp với OTP trong mail giả                                                                       | 202 rồi 201; có `users` (customer, active) + `customers`; đăng nhập được bằng email và SĐT; `otp_codes` không chứa OTP thô hay mật khẩu thô |
| AUTH-T12 | Đăng ký trùng email / trùng SĐT                                                                                                  | `409 email_exists` / `phone_exists`, không gửi mail                                                                                         |
| AUTH-T13 | Verify-otp trước khi đăng ký xong: chưa có tài khoản nào được tạo sau request-otp                                                | `users` không có email đó cho tới khi OTP đúng                                                                                              |
| AUTH-T14 | OTP sai 5 lần rồi nhập OTP đúng                                                                                                  | Lần 1–4 `otp_invalid`, lần 5 và lần đúng sau đó `otp_too_many_attempts`; không tạo tài khoản                                                |
| AUTH-T15 | OTP hết hạn (đồng hồ giả +5 phút 1 giây)                                                                                         | `400 otp_expired`                                                                                                                           |
| AUTH-T16 | Gửi lại OTP trong 60 giây / sau 60 giây                                                                                          | `429 rate_limited` / 202 và OTP cũ không còn dùng được (`otp_invalid`)                                                                      |
| AUTH-T17 | Gửi mail lỗi                                                                                                                     | `503 email_send_failed`; không còn OTP hiệu lực; gửi lại ngay không bị 429                                                                  |
| AUTH-T18 | Hai verify-otp song song cùng OTP đúng                                                                                           | Đúng 1 request 201, request kia 400/409; chỉ 1 tài khoản                                                                                    |
| AUTH-T19 | Quên mật khẩu với email có / không có tài khoản / tài khoản locked                                                               | Cả ba: cùng `202`, cùng body; chỉ email có tài khoản active nhận mail                                                                       |
| AUTH-T20 | Quên mật khẩu đủ 3 bước                                                                                                          | 204; đăng nhập bằng mật khẩu mới được, mật khẩu cũ `401`; refresh token cũ `401`                                                            |
| AUTH-T21 | Dùng lại `resetToken` sau khi đã đặt lại / token hết hạn / access token đưa vào làm resetToken                                   | `400 invalid_reset_token`                                                                                                                   |
| AUTH-T22 | Mật khẩu yếu (`abcdefgh`, `12345678`, 7 ký tự) hoặc không khớp xác nhận                                                          | `400 validation_error` theo trường                                                                                                          |
| AUTH-T23 | Thiếu `MAIL_SETTINGS_PASSWORD`                                                                                                   | API khởi động, `/health/live` 200; request-otp `503 email_send_failed`; phản hồi không chứa chi tiết cấu hình                               |
| AUTH-T24 | Mail thật (thủ công, sau khi code xong)                                                                                          | Gửi request-otp tới địa chỉ bạn cung cấp; mail đến hộp thư với tiêu đề, OTP, nội dung đúng BR-AUTH-12                                       |
| AUTH-T25 | `GET /me` với từng vai trò (customer, staff, owner)                                                                              | 200, đúng người của token; không có `passwordHash`                                                                                          |
| AUTH-T26 | `PUT /me` hợp lệ (có khoảng trắng hai đầu, đổi SĐT, xóa `gender` bằng null)                                                      | 200, dữ liệu đã chuẩn hóa; đăng nhập được bằng SĐT mới, SĐT cũ `401`; `updated_at_utc` có giá trị                                           |
| AUTH-T27 | `PUT /me` gửi kèm `email`, `role`, `status`                                                                                      | 200, ba trường đó không đổi                                                                                                                 |
| AUTH-T28 | `PUT /me` SĐT của người khác / SĐT của chính mình                                                                                | `409 phone_exists` / 200                                                                                                                    |
| AUTH-T29 | `PUT /me` dữ liệu sai: họ tên rỗng, 101 ký tự, SĐT `12345`, ngày sinh mai (giờ VN), `1899-12-31`, `gender = x`                   | `400 validation_error` đúng trường                                                                                                          |
| AUTH-T30 | Đổi mật khẩu đúng                                                                                                                | 204; mật khẩu mới đăng nhập được, cũ `401`; mọi refresh token trước đó `401`                                                                |
| AUTH-T31 | Đổi mật khẩu: sai mật khẩu hiện tại / mật khẩu mới yếu / không khớp / trùng mật khẩu cũ                                          | `400 current_password_incorrect` (refresh token vẫn dùng được) / `400 validation_error` (mã `password_unchanged` cho trường hợp cuối)       |
| AUTH-T32 | Đổi ảnh đại diện hợp lệ rồi xóa ảnh (`FakeFileStorage`)                                                                          | 200 `{ avatarUrl }`, `GET /me` trả URL đó, publicId `avatars/{userId}`; DELETE 204 rồi `avatarUrl = null`; DELETE lần 2 vẫn 204             |
| AUTH-T33 | Ảnh: thiếu file / > 5 MB / file text đổi đuôi `.png` / storage lỗi                                                               | 400 `image_required` / `image_too_large` / `image_type_not_supported` / 503 và `avatar_url` giữ nguyên                                      |
| AUTH-T34 | `/me*` không Bearer                                                                                                              | 401 envelope `unauthorized`                                                                                                                 |
| AUTH-T35 | `GET /users` lọc `search` không dấu (`nguyen` khớp "Nguyễn"), theo email, theo một phần SĐT, `role`, `status`, phân trang        | Đúng tập kết quả, sắp `createdAtUtc` giảm dần; `role = x` → 400                                                                             |
| AUTH-T36 | `GET /users/{id}` của nhân viên đã nghỉ / khách hàng / id không có                                                               | 200 có `staff.resignationDate` / 200 `staff = null` / `404 user_not_found`                                                                  |
| AUTH-T37 | Chủ spa `PUT /users/{id}` hợp lệ, SĐT trùng                                                                                      | 200 `UserDetailDto` / `409 phone_exists`                                                                                                    |
| AUTH-T38 | Khóa khách hàng đang có refresh token rồi mở khóa                                                                                | 204; refresh cũ `401`/`403`, đăng nhập `403 account_locked`; mở khóa 204 → đăng nhập 200                                                    |
| AUTH-T39 | Chủ spa tự khóa mình / khóa nhân viên `inactive` / khóa tài khoản đã `locked` / `status = inactive`                              | `409 cannot_lock_self` / `409 account_inactive` / 204 không đổi gì / `400 validation_error`                                                 |
| AUTH-T40 | `/users*` với token customer, staff; không token                                                                                 | 403 `forbidden`; 401 `unauthorized`                                                                                                         |
| AUTH-T41 | Unit test `ProfileService`, `UserAccountService` (NSubstitute, đồng hồ giả): chuẩn hóa, so sánh SĐT, thu hồi phiên, quy tắc khóa | Pass                                                                                                                                        |
| AUTH-T42 | Hồi quy                                                                                                                          | Toàn bộ test hiện có (kể cả `CatalogImage*`, `Staff*`, `PersistenceModelTests`) vẫn pass sau khi tách bộ đọc ảnh dùng chung                 |
| AUTH-T43 | Login có header `X-Auth-Transport: cookie`                                                                                       | 200; `Set-Cookie` đúng tên, `HttpOnly`, `SameSite=Strict`, `Path=/api/v1/auth`, `Expires` ≈ +7 ngày; body `refreshToken = null`             |
| AUTH-T44 | Login, refresh, logout **không** có header (mobile)                                                                              | Như trước: token trong body, không có `Set-Cookie`, logout thiếu Bearer → 401 (hồi quy AUTH-T01..T08)                                       |
| AUTH-T45 | Refresh chế độ cookie, chỉ có cookie                                                                                             | 200; `Set-Cookie` mới khác cũ; token cũ có `revoked_at_utc`                                                                                 |
| AUTH-T46 | Refresh chế độ cookie: thiếu cookie / cookie rác / tài khoản bị khóa                                                             | `401 invalid_refresh_token` / 401 + xóa cookie / `403 account_locked` + xóa cookie                                                          |
| AUTH-T47 | Gửi cookie nhưng không có header, body rỗng                                                                                      | Cookie bị bỏ qua → `400 validation_error` như cũ                                                                                            |
| AUTH-T48 | Logout chế độ cookie không có Bearer                                                                                             | 204, xóa cookie, dòng token bị xóa; refresh sau đó → 401                                                                                    |
| AUTH-T49 | Gửi lại token đã xoay vòng sau 10 giây / sau 31 giây (đồng hồ giả)                                                               | 10 giây: 401, phiên mới vẫn dùng được; 31 giây: 401 và mọi phiên bị thu hồi (BR-AUTH-04)                                                    |
| AUTH-T50 | Đổi mật khẩu / đặt lại mật khẩu / khóa rồi mở khóa; đăng nhập lại; rồi refresh bằng token cũ                                     | Token cũ 401; phiên đăng nhập sau đó **vẫn dùng được**; dòng token cũ đã bị xóa                                                             |
| AUTH-T51 | 31 lần `/auth/refresh` trong 1 phút từ cùng IP; xen kẽ login                                                                     | Lần 31 → `429 rate_limited`; login đếm riêng theo `auth` (AUTH-T09 vẫn đúng)                                                                |
| AUTH-T52 | Preflight `OPTIONS /api/v1/auth/refresh` từ origin được phép / không được phép, có header tùy chỉnh                              | Được phép: `Access-Control-Allow-Origin` = origin, `Access-Control-Allow-Credentials: true`; không được phép: không có hai header này       |
| AUTH-T53 | `resendAvailableAtUtc`: đăng ký; quên mật khẩu với email có / không có tài khoản / đang chờ 60 giây                              | Đăng ký = thời điểm tạo + 60 giây; quên mật khẩu = now + 60 giây, giống nhau ở cả ba trường hợp                                             |
| AUTH-T54 | Unit test `AuthService` (cửa sổ ân hạn), `AccountService` (`resendAvailableAtUtc`), cookie helper ở API                          | Pass                                                                                                                                        |
| AUTH-T55 | Hồi quy                                                                                                                          | Toàn bộ test hiện có vẫn pass (test nào kiểm `revoked_at_utc` sau thu hồi chủ động thì sửa theo BR-AUTH-23); `PersistenceModelTests` pass   |

## Giao diện (web)

Phạm vi: UC-SPA-01, 02, 03 trên web (`apps/web`). Mobile (SCR-M06..M08) làm sau. UC-SPA-04/05 không thuộc lần này.

Feature: `src/features/auth/` (`components/`, `hooks/`, `schemas.ts`, `errors.ts`, `index.ts`). Trang ở `src/pages/public/` chỉ ghép feature. Cả ba màn dùng `AuthLayout` riêng (**đã chốt 05/11/2026**: chia đôi, không có header/footer của site): một khung bo góc, bên trái (từ `lg`) là panel giới thiệu spa với logo, tiêu đề "Chăm sóc làn da _theo cách của bạn_" và ba tính năng thật của hệ thống (đặt lịch trực tuyến, theo dõi liệu trình, mua gói và thanh toán trực tuyến) trên nền hình khối phẳng, không có nội dung y khoa; bên phải là logo (dưới `lg`), link "Về trang chủ" và form (`max-w-md`), tiêu đề `font-heading`. Màn đăng nhập có ô "Ghi nhớ mật khẩu" **chỉ để hiển thị** (chốt 05/11/2026): tick sẵn, đổi được, không gửi lên API và không đổi hành vi; phiên luôn sống 7 ngày qua cookie. Các bước của đăng ký và quên mật khẩu đổi **trong cùng một route** bằng state cục bộ (`useState`), không mở route con cho từng bước.

### Hợp đồng dùng chung

- `packages/shared-types`: `UserRole` (`'customer' | 'staff' | 'owner'`), `AuthUser`, `AuthResult`, `LoginRequest`, `RefreshTokenRequest`, `RegisterRequest`, `VerifyOtpRequest`, `OtpSent` (`{ email, expiresAtUtc, resendAvailableAtUtc }`, sau task backend BE-1), `RegisteredUser` (`{ id, email }`), `ForgotPasswordRequest`, `PasswordResetToken` (`{ resetToken, expiresAtUtc }`), `ResetPasswordRequest`. Trong `AuthResult`, `refreshToken` và `refreshTokenExpiresAtUtc` có kiểu `string | null` (web dùng cookie nên nhận `null`). Tên trường khớp DTO (camelCase).
- `packages/api-client/src/auth.ts`: `AuthApi` gồm `login`, `refresh`, `logout`, `requestRegistrationOtp`, `verifyRegistrationOtp`, `requestPasswordResetOtp`, `verifyPasswordResetOtp`, `resetPassword` (hai hàm `logout`, `resetPassword` trả `void` vì backend trả 204). `refresh` và `logout` nhận `refreshToken` tùy chọn: web không gửi, vì token nằm trong cookie. `ApiClient` thêm tùy chọn `credentials` (mặc định để trống; web đặt `'include'` để trình duyệt gửi và nhận cookie). Hằng `authErrorCodes` liệt kê các mã lỗi ở bảng dưới. Không có query key: cả ba màn chỉ có mutation.
- Lỗi validation từ server: `errors[]` có `field` dạng PascalCase (`FullName`, `PhoneNumber`, `ConfirmPassword`…) và `message` tiếng Việt. Còn `code` là mã mặc định của FluentValidation, không ổn định, nên FE **chỉ dùng `field` + `message`**: đổi `field` sang camelCase rồi `setError` vào đúng trường. Lỗi không có `field` khớp thì hiện ở `Alert` đầu form.
- Lỗi nghiệp vụ: chọn hành vi theo `errors[0].code`. Nội dung hiển thị là `message` của server (đã là tiếng Việt). Riêng mất kết nối (`status = 0`) và lỗi 500 dùng câu cố định của FE.

### Phiên đăng nhập (UC-SPA-02 A2, A3, dùng chung)

- **Lưu phiên (đã chốt: cookie HttpOnly, cần task backend BE-1):**
  - Refresh token nằm trong cookie HttpOnly do backend đặt; JavaScript không đọc được.
  - Access token và `user` nằm trong bộ nhớ: `stores/authStore.ts` (Zustand, **không persist**) giữ `{ status, user, accessToken, accessTokenExpiresAtUtc }`, với `status` ∈ `restoring` / `authenticated` / `anonymous`.
  - Thay kiểu `AuthSession { userId, roles[] }` hiện tại bằng `{ user: AuthUser, … }`; `canAccessRole` so với `user.role`.
  - Không ghi token vào `localStorage`/`sessionStorage`.
- **Khôi phục phiên khi mở hoặc tải lại trang:** `AppProviders` gọi `POST /auth/refresh` một lần, không có body, kèm cookie.
  - Thành công thì `status = authenticated`.
  - Lỗi `401`/`403` thì `status = anonymous`, không toast.
  - Mất mạng hoặc `429` cũng `anonymous` (người dùng đăng nhập lại được).
  - Gặp `401` lần đầu thì thử lại **một lần** sau khoảng 300 ms, phòng trường hợp tab khác vừa xoay vòng cookie (BR-AUTH-22).
  - Trong lúc `restoring`, `RouteGuard` và header hiện `PageLoader` / skeleton nút tài khoản, không chuyển hướng sớm.
  - Lưu ý: mỗi lần tải lại trang tốn một lượt trong giới hạn `auth` 10 yêu cầu/phút/IP.
- **Gọi API có xác thực:** `src/lib/api/` tạo một `ApiClient` dùng chung với `credentials: 'include'`.
  - Tùy chọn `headers` gắn `Authorization: Bearer <accessToken>` khi có phiên. Mọi request của web gửi thêm header `X-Auth-Transport: cookie`.
  - Tùy chọn `fetch` bọc thêm: gặp `401` ở endpoint **không phải** `/auth/*` thì gọi `/auth/refresh` một lần (nhiều request đồng thời chỉ gọi một lần refresh), cập nhật access token rồi gửi lại request.
  - Refresh thất bại (`invalid_refresh_token`, `account_locked`, `account_inactive`, `429`) thì xóa phiên, `queryClient.clear()`, toast "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại." và chuyển `/login?redirect=<đường dẫn hiện tại>`.
- **Đăng xuất:** gọi `POST /auth/logout` (Bearer + cookie, không có body); backend thu hồi token và xóa cookie. Thành công hay lỗi đều xóa phiên, `queryClient.clear()`, toast "Đã đăng xuất.", về `/`.
- **Bảo vệ route:** bật `RouteGuard` cho ba layout Customer/Staff/Owner. Đang `restoring` thì hiện `PageLoader`. `anonymous` → `/login?redirect=<path>`. Sai vai trò → `/forbidden`. `RouteGuard` chỉ phục vụ trải nghiệm; quyền thật do backend kiểm tra.
- **Đã đăng nhập mà mở `/login`, `/register`, `/forgot-password`** → chuyển về trang chủ theo vai trò.
- **Trang chủ theo vai trò:** `customer` → `/account`, `staff` → `/staff`, `owner` → `/owner`.
- **Header công khai:**
  - Không có nút đổi theme (xem mục "Theme" bên dưới).
  - Chưa đăng nhập: giữ nút "Đăng nhập" như hiện tại, thêm link "Đăng ký".
  - Đã đăng nhập: thay bằng `DropdownMenu` (avatar chữ cái đầu từ `fullName`, `aria-label` "Tài khoản của bạn") gồm họ tên + email, "Không gian của tôi" (trang chủ theo vai trò) và "Đăng xuất".
  - `MobileNavigation` hiển thị tương tự.
- **Sidebar workspace:** `SidebarFooter` thay dòng "Bản nền tảng · Chưa có xác thực" bằng họ tên, nhãn vai trò ("Khách hàng"/"Nhân viên"/"Chủ spa") và nút "Đăng xuất". Khi sidebar thu gọn chỉ còn icon `LogOutIcon` kèm `aria-label`.

### SCR-W07 — Đăng nhập

- **Route:** `/login` · Vai trò: khách vãng lai · Layout: Auth · Mẫu: trang nội dung (form trong khung chia đôi).
- **Mẫu Stitch:** `9696885610900739659/e1b0b5d870b642d09287e737becb0f2a` (chỉ tham chiếu bố cục; bỏ nút theme và footer Stitch tự thêm).
- **Trường:**
  - "Email hoặc số điện thoại" (`login`, `autoComplete="username"`, bắt buộc, ≤ 255 ký tự sau khi bỏ khoảng trắng).
  - "Mật khẩu" (`password`, `autoComplete="current-password"`, bắt buộc, ≤ 128 ký tự). Có nút hiện/ẩn mật khẩu (`aria-label` "Hiện mật khẩu"/"Ẩn mật khẩu", `aria-pressed`).
- **Liên kết:** "Quên mật khẩu?" → `/forgot-password`, căn phải ngay dưới ô mật khẩu; cùng hàng bên trái là ô "Ghi nhớ mật khẩu" (chỉ giao diện, xem đầu mục). "Chưa có tài khoản? Đăng ký" → `/register`.
- **Điền sẵn:** từ `location.state.login`, do màn đăng ký hoặc đặt lại mật khẩu truyền sang. Không đưa email lên URL.
- **Hành động "Đăng nhập":** `useLogin` → `AuthApi.login`. Thành công thì lưu phiên, `queryClient.clear()` và điều hướng tới đâu tùy `redirect`:
  - Có `redirect` hợp lệ thì đi tới đó. Hợp lệ là bắt đầu bằng `/`, không bắt đầu bằng `//`, và thuộc khu vực của vai trò hoặc là route công khai.
  - Không có hoặc không hợp lệ thì về trang chủ theo vai trò (UC-SPA-02 A1 ở mức route).
- **Mã lỗi:**

| Mã / tình huống                      | Hành vi UI                                                                            |
| ------------------------------------ | ------------------------------------------------------------------------------------- |
| `validation_error`                   | Lỗi dưới trường (`Login`, `Password`)                                                 |
| `invalid_credentials`                | `Alert` destructive đầu form với message server; xóa ô mật khẩu, focus vào ô mật khẩu |
| `account_locked`, `account_inactive` | `Alert` destructive với message server; giữ dữ liệu đã nhập                           |
| `rate_limited` (429)                 | `Alert` với message server; nút vẫn bật (giới hạn IP không trả thời gian chờ)         |
| `status = 0`                         | `Alert` "Không kết nối được máy chủ. Vui lòng kiểm tra mạng và thử lại."              |
| Khác / 500                           | toast "Đã có lỗi xảy ra, vui lòng thử lại."                                           |

### SCR-W08 — Đăng ký (2 bước)

- **Route:** `/register` · Vai trò: khách vãng lai · Layout: Auth · Mẫu: quy trình 2 bước trong cùng một route, **không có chỉ báo bước** (chốt 05/11/2026: bỏ để trang không phải cuộn dọc); bước 2 nhận biết qua dòng "Chúng tôi đã gửi mã gồm 6 chữ số tới …".
- **Mẫu Stitch:** `9696885610900739659/a644d9630ffb42cfa8e22a3b386ea540` (bước 1). Bước 2 dựng theo khung ô OTP + đếm ngược của mẫu SCR-W09.
- **Chỉ báo bước:** dòng chữ "Bước x/y · …" kèm thanh tiến độ chia đoạn (mỗi bước một đoạn; đoạn đã qua và đang làm dùng `bg-primary`, đoạn còn lại `bg-muted`). Chỉ dùng ở SCR-W09, đặt ở `features/auth/components`.
- **Bước 1, trường** (theo BR-AUTH-10, Zod kiểm tra trước, server vẫn là nguồn chuẩn):
  - "Họ và tên" (1–100 ký tự sau khi bỏ khoảng trắng, `autoComplete="name"`).
  - "Email" (đúng mẫu `^[^\s@]+@[^\s@]+\.[^\s@]+$`, ≤ 255).
  - "Số điện thoại" (`^0\d{9}$`, `inputMode="tel"`, gợi ý "10 chữ số, bắt đầu bằng 0").
  - "Mật khẩu" (8–128 ký tự, có chữ cái và chữ số, gợi ý "Từ 8 ký tự, gồm chữ cái và chữ số", `autoComplete="new-password"`).
  - "Xác nhận mật khẩu" (phải khớp).
  - Có nút hiện/ẩn cho hai ô mật khẩu.
- **Bước 1, hành động "Gửi mã xác thực":** `useRequestRegistrationOtp`. Kết quả `202` thì sang bước 2 và giữ dữ liệu bước 1 trong state của component (để gửi lại mã), kèm `expiresAtUtc`.
- **Bước 2, nội dung:** "Chúng tôi đã gửi mã gồm 6 chữ số tới **{email}**". Thời hạn mã: "Mã hết hạn sau mm:ss", tính từ `expiresAtUtc` của server, cập nhật mỗi giây. Hết giờ thì hiện "Mã đã hết hạn. Vui lòng gửi lại mã."
- **Bước 2, trường:** "Mã OTP" (`Input`, `inputMode="numeric"`, `autoComplete="one-time-code"`, chỉ nhận số và tối đa 6 chữ số (lọc khi nhập; không đặt `maxLength` vì trình duyệt sẽ cắt chuỗi dán như "123 456" trước khi lọc), Zod `^\d{6}$`).
- **Bước 2, hành động:**
  - "Xác nhận" → `useVerifyRegistrationOtp`. Kết quả `201` thì toast "Đăng ký thành công. Vui lòng đăng nhập." và chuyển `/login` với `state.login = email`. Không tự đăng nhập, theo DA bước 10.
  - "Gửi lại mã" (nút `link`) → gọi lại request-otp với dữ liệu bước 1. Thành công thì toast "Đã gửi lại mã xác thực.", cập nhật `expiresAtUtc` + `resendAvailableAtUtc` và xóa ô OTP.
    - **Đếm ngược gửi lại (đã chốt):** nút bị `disabled` và hiện "Gửi lại mã sau {s} giây" cho tới `resendAvailableAtUtc` của server. FE không tự viết cứng 60 giây.
    - Hết giờ chờ thì nút bật lại, nhãn "Gửi lại mã".
    - Nếu vẫn nhận `429` (lệch đồng hồ, hoặc giới hạn IP) thì hiện `Alert` với message server; nút vẫn bật.
  - "Sửa thông tin" → quay lại bước 1, giữ dữ liệu.
    - Bấm lại "Gửi mã xác thực" trước `resendAvailableAtUtc` thì nút bước 1 cũng `disabled` kèm cùng dòng đếm ngược, vì backend sẽ trả `429`.
- **Mã lỗi:**

| Mã / tình huống                                     | Bước | Hành vi UI                                                                                                             |
| --------------------------------------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------- |
| `validation_error`                                  | 1, 2 | Lỗi dưới trường theo `field`                                                                                           |
| `email_exists`                                      | 1, 2 | Về bước 1 (nếu đang ở bước 2), lỗi dưới ô Email và link "Đăng nhập" / "Quên mật khẩu?"                                 |
| `phone_exists`                                      | 1, 2 | Về bước 1 (nếu đang ở bước 2), lỗi dưới ô Số điện thoại                                                                |
| `rate_limited` (gửi lại < 60 giây hoặc giới hạn IP) | 1, 2 | `Alert` với message server (đã có số giây phải chờ); thường không gặp vì nút đã `disabled` theo `resendAvailableAtUtc` |
| `email_send_failed` (503)                           | 1, 2 | `Alert` "…không gửi được email…" (message server) kèm nút "Thử lại"                                                    |
| `otp_invalid`                                       | 2    | Lỗi dưới ô OTP, xóa ô và focus lại                                                                                     |
| `otp_expired`                                       | 2    | Lỗi dưới ô OTP, làm nổi nút "Gửi lại mã"                                                                               |
| `otp_too_many_attempts`                             | 2    | Lỗi dưới ô OTP, khóa nút "Xác nhận" tới khi gửi lại mã thành công                                                      |
| `status = 0`, 500                                   | 1, 2 | Như SCR-W07                                                                                                            |

### SCR-W09 — Quên mật khẩu (3 bước)

- **Route:** `/forgot-password` (route mới) · Vai trò: khách vãng lai · Layout: Auth · Mẫu: quy trình 3 bước trong một Card ("Bước x/3").
- **Mẫu Stitch:** `9696885610900739659/e16ef7014ab24c13b6de08d1e3172a30` (bước 2). Bước 1 và 3 dựng theo cùng khung Card; trường mật khẩu như mẫu SCR-W08.
- **Bước 1, "Email":**
  - Trường email, kiểm tra như bước 1 của đăng ký.
  - "Gửi mã" → `useRequestPasswordResetOtp`. Kết quả `202` luôn sang bước 2, kèm câu trung lập: "Nếu **{email}** thuộc một tài khoản đang hoạt động, chúng tôi đã gửi mã gồm 6 chữ số tới email này." Câu này không tiết lộ tài khoản có tồn tại hay không (BR-AUTH-05).
- **Bước 2, "Mã OTP":**
  - Ô OTP và thời hạn mã như SCR-W08 bước 2.
  - "Xác nhận mã" → `useVerifyPasswordResetOtp`. Kết quả `200` thì giữ `resetToken` + `expiresAtUtc` trong state của component (chỉ trong bộ nhớ) rồi sang bước 3.
  - "Gửi lại mã" gọi lại bước 1. Mọi lần đều `202`, toast "Nếu email có tài khoản, mã mới đã được gửi." Nút có đếm ngược và `disabled` theo `resendAvailableAtUtc` như SCR-W08. Backend trả cùng giá trị cho mọi email (BR-AUTH-05).
  - "Đổi email" quay về bước 1.
- **Bước 3, "Mật khẩu mới":**
  - Hai trường "Mật khẩu mới" và "Xác nhận mật khẩu" (BR-AUTH-10, có nút hiện/ẩn).
  - Câu nhắc: "Hoàn tất trước {HH:mm}", lấy từ `expiresAtUtc` của `resetToken`, giờ địa phương.
  - "Đặt lại mật khẩu" → `useResetPassword`. Kết quả `204`:
    - Toast "Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới."
    - Nếu tab đang có phiên thì xóa phiên, vì backend đã thu hồi mọi refresh token (BR-AUTH-11).
    - Chuyển `/login` với `state.login = email`.
- **Mã lỗi:**

| Mã / tình huống                      | Bước    | Hành vi UI                                                                                       |
| ------------------------------------ | ------- | ------------------------------------------------------------------------------------------------ |
| `validation_error`                   | 1, 2, 3 | Lỗi dưới trường theo `field` (`Email`, `Otp`, `NewPassword`, `ConfirmPassword`)                  |
| `rate_limited` (giới hạn IP)         | 1, 2, 3 | `Alert` với message server                                                                       |
| `email_send_failed` (503)            | 1       | `Alert` với message server kèm "Thử lại"                                                         |
| `otp_invalid`                        | 2       | Lỗi dưới ô OTP (mọi lỗi OTP ở bước này đều là mã này, E4), xóa ô và focus lại                    |
| `account_locked`, `account_inactive` | 2       | `Alert` với message server, ẩn nút "Xác nhận mã"; còn link "Về đăng nhập"                        |
| `invalid_reset_token`                | 3       | Xóa `resetToken`, về bước 1 (giữ email), `Alert` với message server ("…vui lòng làm lại từ đầu") |
| `status = 0`, 500                    | 1, 2, 3 | Như SCR-W07                                                                                      |

### Trạng thái, responsive, a11y (cả ba màn)

- **Trạng thái:** đây là màn form, không có dữ liệu để tải. Bốn trạng thái là:
  - Sẵn sàng.
  - Đang gửi: `<Button loading>`, các trường `disabled`.
  - Lỗi: lỗi dưới trường hoặc `Alert`.
  - Thành công: sang bước kế tiếp hoặc điều hướng.
  - Thiếu hoặc sai `VITE_API_BASE_URL` thì hiện `Alert` "Configuration Error" và tắt nút gửi, không gọi mạng.
- **320px:** Card rộng toàn màn với gutter 16px. Nút chính rộng 100%. Link phụ xuống dòng, không cuộn ngang.
- **Focus:** đổi bước thì focus vào tiêu đề bước mới (`tabIndex={-1}`). Lỗi server có `field` thì focus vào trường lỗi đầu tiên. `Alert` dùng `role="alert"`. Dòng đếm ngược không đọc mỗi giây: `aria-live="polite"` chỉ thông báo khi mã hết hạn.
- **Theme (đã chốt 05/11/2026):** trang công khai, kể cả ba màn này, **luôn dùng theme sáng**. Khu vực khách hàng (Customer, có sidebar) cũng **luôn sáng**. Nút đổi theme (`ThemeToggle`) và dark mode chỉ có ở khu vực **Staff và Owner**.
  - Task FE: bỏ `ThemeToggle` khỏi `Header` công khai và `MobileNavigation`; `WorkspaceLayout` chỉ hiện `ThemeToggle` cho Staff/Owner.
  - `PublicLayout` và `CustomerLayout` ép theme sáng (`forcedTheme="light"` của `next-themes`), để người dùng chọn tối ở khu vực Staff/Owner rồi chuyển sang trang công khai hoặc khu vực khách hàng thì trang vẫn sáng.
  - Cập nhật `docs/frontend.md`, `apps/web/CLAUDE.md` và `docs/design/DESIGN.md` theo quy tắc này.
  - Màn vẫn chỉ dùng token.

### Thay đổi backend cần làm trước (task BE-1, tách khỏi task FE)

Đặc tả chính thức ở "UC-SPA-02 bổ sung — Phiên web bằng cookie HttpOnly (BE-1)", cùng BR-AUTH-20..26 và AUTH-T43..T55. Phần dưới là tóm tắt. Task FE chỉ bắt đầu sau khi BE-1 xong.

1. **Refresh token qua cookie HttpOnly cho web** (theo `docs/conventions/frontend.md`):
   - **Bật chế độ cookie:** request có header `X-Auth-Transport: cookie` thì `/auth/login`, `/auth/refresh` ghi refresh token vào cookie và trả `refreshToken: null`, `refreshTokenExpiresAtUtc: null` trong body. Không có header thì giữ nguyên hành vi hiện tại, cho mobile.
   - **Thuộc tính cookie:** tên `spa_refresh_token`, `HttpOnly`, `SameSite=Strict`, `Path=/api/v1/auth`, `Expires` = hạn refresh token. `Secure` bật theo cấu hình: tắt được cho HTTP trên LAN khi dev, bắt buộc bật ở Production.
   - `/auth/refresh` và `/auth/logout` đọc token từ cookie khi body không có. Logout xóa cookie.
   - **CORS:** thêm `AllowCredentials()`. Origin vẫn liệt kê cụ thể, không dùng wildcard.
   - **CSRF:** `SameSite=Strict` cùng header tùy chỉnh (buộc trình duyệt gửi preflight) là đủ cho đồ án. Web và API cùng host, khác cổng, nên vẫn tính là cùng site.
   - Validator của `RefreshTokenRequest` cho phép thiếu `refreshToken` khi dùng cookie.
   - Spec auth cần thêm BR, cập nhật bảng API, Postman và integration test.
2. **`resendAvailableAtUtc` trong `OtpSentDto`:**
   - Thời điểm sớm nhất được gửi lại, tính bằng lần gửi thành công cộng `Account:OtpResendCooldownSeconds`.
   - Với quên mật khẩu, luôn trả `now + cooldown` cho mọi email để không lộ tài khoản (BR-AUTH-05).

### Ghi chú backend khác (không chặn task FE)

1. **Thông điệp validation của `LoginRequestValidator`, `RefreshTokenRequestValidator`.** Hai validator này chưa có `WithMessage` tiếng Việt, nên server có thể trả câu mặc định của FluentValidation. Zod ở FE chặn trước nên ít gặp.
2. **Lệch tài liệu nhỏ.** Bảng API ghi `forgot-password/request-otp` trả `{ expiresAtUtc }`, nhưng DTO thực tế trả `{ email, expiresAtUtc }`. FE dùng kiểu `OtpSent` theo DTO.
3. **Độ dài tối thiểu của mật khẩu** đọc từ `Account:PasswordMinLength`. FE viết cứng 8 theo mặc định; đổi cấu hình thì phải sửa schema FE.

### SCR-W22 — Cập nhật thông tin tài khoản (UC-SPA-04)

- **Route:** `/account` · Vai trò: `customer`, `staff`, `owner` (tất cả người dùng đã đăng nhập) · Layout: `AccountLayout` cho Customer; Staff/Owner truy cập được qua đường dẫn chia sẻ hoặc menu tài khoản.
- **Mẫu bố cục:** Trang nội dung gồm hai khối thẻ: Thông tin cá nhân và Đổi mật khẩu.
- **Khối 1 — Thông tin cá nhân (`ProfileCard`):**
  - **Ảnh đại diện (`AvatarUploader`):** Kích thước 80x80px, hiển thị ảnh hiện tại hoặc chữ cái đầu của tên người dùng.
    - Nút icon "Tải ảnh" (`UploadIcon`): Mở dialog chọn file ảnh (`accept="image/png,image/jpeg,image/webp"`), kiểm tra client ≤ 5MB. Chọn file hợp lệ → gọi `POST /api/v1/me/avatar` (multipart/form-data) → cập nhật `avatarUrl` trong `MeDto` và `authStore.user`.
    - Nút icon "Xóa ảnh" (`Trash2Icon`): Hiện khi người dùng đã có `avatarUrl` → hộp thoại xác nhận xóa → gọi `DELETE /api/v1/me/avatar` → xóa avatar, toast "Đã xóa ảnh đại diện."
  - **Trường thông tin:**
    - "Họ và tên" (`fullName`, 1–100 ký tự, bắt buộc, Zod validate).
    - "Email" (`email`, chỉ đọc `disabled`, kèm badge vai trò: `Khách hàng`, `Nhân viên`, `Chủ spa`).
    - "Số điện thoại" (`phoneNumber`, chỉ đọc `disabled`, kèm chú thích "Số điện thoại dùng để đăng nhập, không thể thay đổi.").
    - "Ngày sinh" (`dateOfBirth`, chọn ngày `yyyy-MM-dd`, không vượt quá ngày hiện tại, tùy chọn).
    - "Giới tính" (`gender`, chọn `Nam` (`male`), `Nữ` (`female`), `Khác` (`other`), tùy chọn).
    - "Ngày tham gia" (`createdAtUtc`, chỉ đọc, hiển thị `dd/MM/yyyy`).
  - **Hành động "Lưu thông tin":** `useUpdateProfile` (`PUT /api/v1/me`).
    - Gửi đủ 4 trường `{ fullName, phoneNumber: user.phoneNumber, dateOfBirth, gender }`.
    - Thành công → Toast "Cập nhật thông tin thành công.", đồng bộ `authStore.user.fullName` để cập nhật ngay tên trên header và sidebar.
- **Khối 2 — Đổi mật khẩu (`ChangePasswordCard`):**
  - Dòng nhắc bảo mật: _"Đổi mật khẩu sẽ đăng xuất tất cả các phiên đăng nhập khác của bạn trên mọi thiết bị."_ (BR-AUTH-16).
  - "Mật khẩu hiện tại" (`currentPassword`, bắt buộc, có nút hiện/ẩn mật khẩu).
  - "Mật khẩu mới" (`newPassword`, 8–128 ký tự, có chữ và số, bắt buộc, có nút hiện/ẩn mật khẩu).
  - "Xác nhận mật khẩu mới" (`confirmPassword`, bắt buộc, phải khớp với mật khẩu mới).
  - **Hành động "Đổi mật khẩu":** `useChangePassword` (`PUT /api/v1/me/password`).
    - Thành công (204) → Form tự xóa trắng mật khẩu, toast "Đổi mật khẩu thành công. Các phiên đăng nhập khác đã được thu hồi."
- **Mã lỗi:**

| Mã / tình huống                        | Thao tác                    | Hành vi UI                                                                                                    |
| :------------------------------------- | :-------------------------- | :------------------------------------------------------------------------------------------------------------ |
| `validation_error`                     | Sửa thông tin, đổi mật khẩu | Lỗi dưới trường theo `field` (`FullName`, `PhoneNumber`, `CurrentPassword`, `NewPassword`, `ConfirmPassword`) |
| `phone_exists`                         | Sửa thông tin               | Lỗi dưới ô Số điện thoại: "Số điện thoại đã được sử dụng bởi tài khoản khác."                                 |
| `password_mismatch`                    | Đổi mật khẩu                | Lỗi dưới ô Mật khẩu hiện tại: "Mật khẩu hiện tại không chính xác."                                            |
| `password_same_as_current`             | Đổi mật khẩu                | Lỗi dưới ô Mật khẩu mới: "Mật khẩu mới không được trùng với mật khẩu hiện tại."                               |
| `rate_limited`                         | Đổi mật khẩu                | `Alert` cảnh báo: "Bạn đã thao tác quá nhiều lần, vui lòng thử lại sau ít phút."                              |
| `invalid_file_type` / kích thước > 5MB | Tải ảnh avatar              | Toast lỗi client: "Ảnh phải có định dạng PNG, JPG, WEBP và dung lượng không quá 5MB."                         |
| `service_unavailable` (503)            | Tải/xóa ảnh avatar          | Toast lỗi: "Dịch vụ lưu trữ ảnh tạm thời không khả dụng, vui lòng thử lại sau."                               |
| `status = 0`, 500                      | Mọi thao tác                | `Alert` hoặc Toast lỗi mạng theo quy ước chung                                                                |

### Trạng thái, responsive, a11y (SCR-W22)

- **Trạng thái:**
  - Đang tải: `Skeleton` cho phần avatar và các ô input.
  - Lỗi tải: `OrdersErrorState` với nút "Thử lại".
  - Sẵn sàng: Form điền sẵn dữ liệu từ `MeDto`.
  - Đang lưu: Nút "Lưu thông tin" / "Đổi mật khẩu" có spinner `loading`, các trường tạm khóa.
- **320px:** Bố cục 1 cột dọc, các nút hành động chiếm trọn chiều rộng, nhãn trường nằm trên input.
- **a11y:** Focus vào ô lỗi đầu tiên khi validation thất bại. Các nút chọn ảnh và xóa ảnh có `aria-label` rõ ràng.

### Kiểm thử giao diện

| Mã          | Tình huống                                                                                                                                                    | Kết quả mong đợi                                                                                                                                                                      |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AUTH-UI-T01 | `AuthApi`: mỗi hàm gọi đúng method, path, body; `logout`/`resetPassword` nhận 204 trả `undefined`                                                             | Pass với `fetch` giả                                                                                                                                                                  |
| AUTH-UI-T02 | Đăng nhập thành công với từng vai trò; có `redirect` hợp lệ / `redirect=//evil.com` / `redirect` sang khu vực vai trò khác                                    | Lưu phiên, điều hướng tới `redirect` hoặc trang chủ theo vai trò                                                                                                                      |
| AUTH-UI-T03 | Đăng nhập `invalid_credentials`, `account_locked`, `account_inactive`, `rate_limited`, mất mạng                                                               | `Alert` đúng message; `invalid_credentials` xóa ô mật khẩu và focus vào đó                                                                                                            |
| AUTH-UI-T04 | Form trống / quá dài, mật khẩu yếu, xác nhận không khớp, SĐT sai mẫu, OTP 5 chữ số                                                                            | Lỗi Zod dưới trường, không gọi API                                                                                                                                                    |
| AUTH-UI-T05 | Server trả `validation_error` có `field: "PhoneNumber"`                                                                                                       | Lỗi hiện dưới ô Số điện thoại                                                                                                                                                         |
| AUTH-UI-T06 | Đăng ký đủ 2 bước                                                                                                                                             | Bước 2 hiện email và đếm ngược từ `expiresAtUtc`; `201` → toast và về `/login` với ô đăng nhập điền sẵn email                                                                         |
| AUTH-UI-T07 | Đăng ký: `email_exists`/`phone_exists` ở bước 1 và ở bước 2                                                                                                   | Về bước 1, lỗi dưới đúng trường                                                                                                                                                       |
| AUTH-UI-T08 | OTP `otp_invalid`, `otp_expired`, `otp_too_many_attempts`; gửi lại mã thành công / `rate_limited` / `email_send_failed`                                       | Hành vi đúng bảng; `otp_too_many_attempts` khóa nút xác nhận tới khi gửi lại thành công                                                                                               |
| AUTH-UI-T09 | Quên mật khẩu đủ 3 bước                                                                                                                                       | Câu trung lập ở bước 2; `204` → toast, xóa phiên nếu có, về `/login` điền sẵn email                                                                                                   |
| AUTH-UI-T10 | Quên mật khẩu: `account_locked` ở bước 2, `invalid_reset_token` ở bước 3                                                                                      | `Alert` và ẩn nút / về bước 1 giữ email                                                                                                                                               |
| AUTH-UI-T11 | Request có xác thực nhận `401`: refresh thành công / refresh `invalid_refresh_token`; hai request `401` cùng lúc                                              | Gửi lại request với token mới / xóa phiên và về `/login?redirect=…`; chỉ một lần gọi `/auth/refresh`                                                                                  |
| AUTH-UI-T12 | Đăng xuất (API 204 và API lỗi)                                                                                                                                | Cả hai: xóa phiên, `queryClient.clear()`, về `/`, toast                                                                                                                               |
| AUTH-UI-T13 | `RouteGuard`: không phiên vào `/owner` / customer vào `/owner` / đã đăng nhập vào `/login`                                                                    | `/login?redirect=/owner` / `/forbidden` / trang chủ theo vai trò                                                                                                                      |
| AUTH-UI-T14 | Header và sidebar theo trạng thái phiên                                                                                                                       | Chưa đăng nhập: nút "Đăng nhập", link "Đăng ký"; đã đăng nhập: menu tài khoản, nút "Đăng xuất" có `aria-label`                                                                        |
| AUTH-UI-T15 | Thiếu `VITE_API_BASE_URL`                                                                                                                                     | `Alert` Configuration Error, nút gửi bị tắt, không có request mạng                                                                                                                    |
| AUTH-UI-T16 | Thủ công: 320px / tablet / desktop, chọn theme tối ở `/owner` rồi mở `/login` và `/account`, chỉ dùng bàn phím, mail OTP thật, tải lại trang khi đã đăng nhập | Không cuộn ngang; `/login`, `/account` vẫn sáng, không có nút theme; `/owner`, `/staff` có nút theme; focus đúng khi đổi bước; tải lại trang vẫn giữ phiên; đủ luồng với backend thật |
| AUTH-UI-T17 | Khôi phục phiên khi mở app: `/auth/refresh` 200 / 401 / mất mạng; vào `/owner` trong lúc đang khôi phục                                                       | `authenticated` / `anonymous` không toast / `anonymous`; `RouteGuard` hiện `PageLoader`, không chuyển hướng sớm                                                                       |
| AUTH-UI-T18 | Nút "Gửi lại mã" với `resendAvailableAtUtc` = now + 60 giây (đồng hồ giả)                                                                                     | `disabled`, hiện "Gửi lại mã sau 60 giây" rồi giảm dần; tới 0 thì bật lại; gửi lại thành công thì đếm lại từ đầu                                                                      |
| AUTH-UI-T19 | `ApiClient` của web                                                                                                                                           | Mọi request có `credentials: 'include'` và header `X-Auth-Transport: cookie`; `refresh`/`logout` không gửi body chứa token                                                            |
| AUTH-UI-T20 | `MeApi`: `getMe`, `updateMe`, `changePassword`, `uploadAvatar`, `deleteAvatar` gọi đúng endpoint, method và body                                              | Pass với mock API                                                                                                                                                                     |
| AUTH-UI-T21 | Màn `/account`: Tải và hiển thị đúng thông tin người dùng từ `GET /me` (họ tên, email, SĐT, ngày sinh, giới tính, avatar, ngày tạo)                           | Pass 4 trạng thái: skeleton, hiển thị, form rỗng (ngày sinh/giới tính null), lỗi tải                                                                                                  |
| AUTH-UI-T22 | Sửa thông tin cá nhân: validate Zod client (SĐT không đủ 10 số, họ tên rỗng), submit thành công `PUT /me`                                                     | Chặn submit khi sai client; thành công cập nhật store và hiển thị toast                                                                                                               |
| AUTH-UI-T23 | Sửa thông tin: server trả `409 phone_exists`                                                                                                                  | Lỗi hiển thị dưới trường Số điện thoại                                                                                                                                                |
| AUTH-UI-T24 | Đổi mật khẩu: validate client (mật khẩu mới quá ngắn, không có số, xác nhận không khớp); `PUT /me/password` thành công                                        | Chặn submit khi sai; thành công reset form và toast                                                                                                                                   |
| AUTH-UI-T25 | Đổi mật khẩu: `400 password_mismatch`, `password_same_as_current`, `429 rate_limited`                                                                         | Hiển thị lỗi đúng trường hoặc alert tần suất                                                                                                                                          |
| AUTH-UI-T26 | Tải ảnh đại diện: chọn file > 5MB / file không phải ảnh bị chặn; upload thành công cập nhật ảnh hiển thị; xóa ảnh đại diện thành công                         | Chặn file lỗi; upload/xóa thành công cập nhật UI                                                                                                                                      |

### SCR-W40 — Quản lý tài khoản người dùng (UC-SPA-05, `/owner/accounts`)

Phạm vi: web, chủ spa, `OwnerLayout` (theme sáng và tối). Không có màn mobile (UC-SPA-05 là `n/a` trên Android).

- **Route mới:** `/owner/accounts` "Tài khoản người dùng" trong `routes.ts` (sidebar, icon `UserCogIcon`), đúng SCR-W40.
- **Code:** `features/users/components/owner/` (glossary: `User` → thư mục `users`): `OwnerUsersView`, `UserFilterToolbar`, `UserTable`, `UserDetailSheet`, `EditUserDialog`, `ChangeUserStatusDialog`; `userStatus.ts` (nhãn + tông); hooks `useOwnerUsers`, `useOwnerUser`, `useOwnerUserMutations`. Trang `pages/owner/OwnerAccountsPage.tsx`.
- **Gói chung:** `shared-types/src/users.ts` thêm `UserListItem`, `UserDetail` (+ `staff: { hireDate, resignationDate } | null`), `UserFilterParams` (`PaginationParams` + `role?`, `status?`), `ChangeUserStatusRequest`. `api-client/src/users.ts` thêm `OwnerUsersApi` (`list`, `get`, `update`, `changeStatus` → `void`), `ownerUsersQueryKeys` (`all`, `list(params)`, `detail(id)`); `usersErrorCodes` thêm `phoneExists: 'phone_exists'`, `userNotFound`, `cannotLockSelf`, `accountInactive` (mã `duplicate_phone_number` cũ không có ở backend, giữ để không vỡ `ProfileCard`).
- **Mẫu bố cục:** danh sách = khung thẻ + breadcrumb + `PageHeader` + thanh lọc + `DataTable` phân trang server; chi tiết = `Sheet`; sửa = `Dialog`; khóa/mở khóa = `AlertDialog` (theo mẫu `OwnerStaffView` / `OwnerOrdersView`).
- **PageHeader:** "Tài khoản người dùng", mô tả "Tìm, xem và cập nhật tài khoản khách hàng, nhân viên, chủ spa. Khóa tài khoản sẽ đăng xuất người đó khỏi mọi thiết bị."

**Bộ lọc (URL qua `useTableSearchParams`, đổi bộ lọc về trang 1):** ô "Tìm theo họ tên, email hoặc số điện thoại" (`search`, debounce 300 ms, tối đa 100 ký tự); "Vai trò" (`role`: Tất cả, Khách hàng, Nhân viên, Chủ spa — dùng `roleLabels` có sẵn); "Trạng thái" (`status`: Tất cả, Đang hoạt động, Đã khóa, Ngừng hoạt động); "Xóa bộ lọc" khi đang lọc. Sắp xếp: server cố định mới nhất trước, không có cột sắp xếp.

**Nhãn trạng thái (`userStatus.ts`):** `active` → "Đang hoạt động" (`success`), `locked` → "Đã khóa" (`danger`), `inactive` → "Ngừng hoạt động" (`neutral`, nhân viên đã nghỉ việc).

**Cột `DataTable`** (`getRowId = id`, caption "Danh sách tài khoản"):

| Cột        | Nội dung                                                       | Ẩn ở |
| ---------- | -------------------------------------------------------------- | ---- |
| Tài khoản  | `Avatar` (ảnh hoặc chữ cái đầu) + `fullName`, dòng phụ `email` | —    |
| SĐT        | `phoneNumber`                                                  | `md` |
| Vai trò    | `roleLabels[role]`                                             | `sm` |
| Trạng thái | `StatusBadge`                                                  | —    |
| Ngày tạo   | `formatDateTimeUtc(createdAtUtc)` (chỉ ngày)                   | `lg` |

**Hành động (`rowActions` + nút trong Sheet):**

| Hành động      | Hiện khi                                                     | Gọi                                                               | Làm mới                                                           |
| -------------- | ------------------------------------------------------------ | ----------------------------------------------------------------- | ----------------------------------------------------------------- |
| Xem chi tiết   | luôn (cũng là `onRowClick`)                                  | mở Sheet, `GET /users/{id}`                                       | —                                                                 |
| Sửa thông tin  | luôn                                                         | `EditUserDialog` → `PUT /users/{id}`                              | ghi `detail(id)` từ kết quả, invalidate `ownerUsersQueryKeys.all` |
| Khóa tài khoản | `status = active` và không phải chính chủ spa đang đăng nhập | `AlertDialog` → `PATCH /users/{id}/status` `{ status: 'locked' }` | invalidate `ownerUsersQueryKeys.all`                              |
| Mở khóa        | `status = locked`                                            | `AlertDialog` → `PATCH … { status: 'active' }`                    | invalidate `ownerUsersQueryKeys.all`                              |

- Tài khoản `inactive` không có nút khóa/mở; Sheet hiện "Nhân viên đã nghỉ việc từ {resignationDate}. Trạng thái này quản lý ở trang Nhân viên." kèm link `/owner/staff`.
- Ẩn "Khóa tài khoản" ở chính dòng của chủ spa (so `id` với `user.id` trong `authStore`) chỉ để đỡ thao tác thừa; server vẫn chặn bằng `409 cannot_lock_self`.
- **Sheet chi tiết:** avatar lớn, họ tên, `StatusBadge`, vai trò; các dòng Email, SĐT, Ngày sinh (`formatLocalDate`, trống → "Chưa cập nhật"), Giới tính (Nam/Nữ/Khác), Ngày tạo, Cập nhật lần cuối; với nhân viên: Ngày vào làm, Ngày nghỉ việc (nếu có). Chân Sheet: "Sửa thông tin" và "Khóa tài khoản"/"Mở khóa".
- **`EditUserDialog`:** "Họ tên" (bắt buộc, ≤ 100), "Ngày sinh" (`Input type="date"`, không ở tương lai, để trống được), "Giới tính" (`Select` Nam/Nữ/Khác, bỏ chọn được). Email, số điện thoại và vai trò hiện dạng chỉ đọc với dòng nhắc "Email và số điện thoại dùng để đăng nhập nên không đổi ở đây." (quyết định 12/11/2026). `PUT /users/{id}` thay cả 4 trường nên gửi lại đúng `phoneNumber` hiện có; ngày sinh, giới tính trống → `null`. Nút "Lưu thay đổi".
- **`ChangeUserStatusDialog`:** Khóa: tiêu đề "Khóa tài khoản {fullName}?", mô tả "Người này sẽ bị đăng xuất khỏi mọi thiết bị và không đăng nhập được cho tới khi mở khóa.", nút "Khóa tài khoản" (destructive). Mở khóa: "Mở khóa tài khoản {fullName}?", "Người này đăng nhập lại được ngay.", nút "Mở khóa".

**Mã lỗi → xử lý**

| Mã                       | Ở đâu            | Xử lý                                                                                     |
| ------------------------ | ---------------- | ----------------------------------------------------------------------------------------- |
| `validation_error`       | Sửa              | gắn `errors[].field` (PascalCase) vào ô tương ứng; không khớp ô → toast thông điệp server |
| `phone_exists`           | Sửa              | không xảy ra khi gửi lại SĐT cũ; nếu có → toast thông điệp server                         |
| `user_not_found`         | Sheet, sửa, khóa | toast "Không tìm thấy tài khoản.", đóng Sheet/Dialog, làm mới danh sách                   |
| `cannot_lock_self`       | Khóa             | toast "Bạn không thể tự khóa tài khoản của mình."                                         |
| `account_inactive`       | Khóa/mở          | toast thông điệp server, làm mới chi tiết và danh sách                                    |
| `validation_error` (lọc) | Danh sách        | trạng thái lỗi của bảng kèm thông điệp server                                             |

**Trạng thái:** bảng: skeleton / lỗi + "Thử lại" / rỗng ("Chưa có tài khoản nào", đang lọc: "Không có tài khoản nào khớp bộ lọc" + "Xóa bộ lọc") / dữ liệu. Sheet: skeleton / `ErrorState` + "Thử lại" / dữ liệu.

**Responsive và a11y:** 320px còn cột Tài khoản và Trạng thái; thanh lọc xếp dọc. Nút icon có `aria-label`; đóng Dialog/AlertDialog trả focus về nút mở (Radix).

**Thiếu từ backend:** không chặn. Ghi chú: `PUT /users/{id}` vẫn cho đổi SĐT qua API; nếu muốn khóa hẳn ở server (giống email) cần sửa `UserProfileEditor`/`UpdateProfileRequest` trong một task backend riêng.

| Mã          | Tình huống                                                                                             | Kết quả mong đợi                                                                                                           |
| ----------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| AUTH-UI-T40 | `OwnerUsersApi`: query `search/role/status/pageNumber/pageSize`; `PUT` body; `PATCH` status trả `void` | Đúng URL, method, body                                                                                                     |
| AUTH-UI-T41 | Trang `/owner/accounts`: tải / lỗi + Thử lại / rỗng / có dữ liệu (avatar, vai trò, nhãn trạng thái)    | Đủ 4 trạng thái                                                                                                            |
| AUTH-UI-T42 | Gõ tìm kiếm (debounce), chọn vai trò, trạng thái; "Xóa bộ lọc"                                         | Query đúng, về trang 1, URL cập nhật; xóa bộ lọc gọi lại không tham số lọc                                                 |
| AUTH-UI-T43 | Bấm dòng → Sheet chi tiết; nhân viên đã nghỉ việc                                                      | Đủ trường; dòng "Nhân viên đã nghỉ việc từ …", không có nút khóa/mở                                                        |
| AUTH-UI-T44 | Sửa: họ tên trống; SĐT chỉ đọc; lưu thành công                                                         | Lỗi dưới ô, không gọi API; không có ô SĐT sửa được; `PUT` gửi SĐT cũ + 3 trường, toast, Sheet cập nhật                     |
| AUTH-UI-T45 | Khóa tài khoản `active`; mở khóa `locked`; dòng của chính chủ spa                                      | `PATCH { status: 'locked' }` / `{ status: 'active' }`, toast, danh sách làm mới; dòng chính mình không có "Khóa tài khoản" |
| AUTH-UI-T46 | Khóa gặp `cannot_lock_self`, `account_inactive`, `user_not_found`                                      | Toast tương ứng; `user_not_found` đóng Sheet và làm mới                                                                    |

## Giao diện (mobile): UC-SPA-01, 02, 03

Phạm vi: Android (Expo Go SDK 57), ba màn SCR-M06, M07, M08 và **nền tảng phiên đăng nhập** mà mọi màn mobile sau này dùng. UC-SPA-04 (hồ sơ) nằm ở mục riêng bên dưới. Không làm trong mục này: màn nghiệp vụ của các khu vực.

Feature: `apps/mobile/src/features/auth/` (`screens/`, `components/`, `hooks/`, `schemas.ts`, `errors.ts`, `index.ts`); route file trong `app/(public)` chỉ render screen. Hợp đồng dùng lại nguyên `AuthApi`, `authErrorCodes`, kiểu trong `@spa/shared-types` (không thêm kiểu mới).

### Phiên đăng nhập trên mobile

- **Chế độ body (không cookie):** mobile **không** gửi header `X-Auth-Transport: cookie`, nên `/auth/login` và `/auth/refresh` trả `refreshToken` trong body (BR-AUTH-21, AUTH-T44). Backend không cần sửa.
- **Lưu trữ:** refresh token trong `expo-secure-store` (khóa `spa.refresh_token`, thêm bằng `npx expo install expo-secure-store`). Access token, hạn và `user` chỉ trong bộ nhớ: `stores/authStore.ts` (Zustand, không persist) `{ status: 'restoring' | 'authenticated' | 'anonymous', user: AuthUser | null, accessToken, accessTokenExpiresAtUtc }`, thay kiểu `AuthSession { userId, roles[] }` hiện tại. Không dùng AsyncStorage.
- **Client dùng chung:** `src/lib/api/client.ts` tạo một `ApiClient` gắn `Authorization: Bearer` từ store; gặp `401` ở request có Bearer thì gọi làm mới **một lần** (các request đồng thời dùng chung một lời gọi `/auth/refresh`) rồi gửi lại; làm mới bị từ chối (`401`/`403`/`429`) thì xóa phiên + secure store và về `anonymous`. Mất mạng hoặc 5xx giữ phiên. `src/lib/api/session.ts`: `restoreSession`, `refreshSession`, `signIn(result)`, `signOut()`.
- **Khởi động app:** `AppProviders` đọc refresh token; có thì gọi `/auth/refresh` với body (`status = restoring` trong lúc chờ, hiện `AppLoader`); thành công lưu token mới (xoay vòng); bị từ chối thì xóa token, `anonymous`. Không có token → `anonymous` ngay.
- **Đăng xuất:** `POST /auth/logout` với Bearer + `{ refreshToken }`; dù API lỗi vẫn xóa phiên và secure store, `queryClient.clear()`, về màn chính. Nút "Đăng xuất" đặt ở tab "Cá nhân" (khách) và màn "Tổng quan" của nhân viên, chủ spa (các màn này vẫn là placeholder, chỉ thêm nút).
- **Chặn khu vực:** `_layout.tsx` của `(customer)`, `(staff)`, `(owner)` dùng `RouteGuard` (`src/components/auth/RouteGuard.tsx`): `restoring` → `AppLoader`; `anonymous` → `/(public)/login?redirect=<đường dẫn>`; sai vai trò → màn "Không có quyền truy cập" (`app/forbidden.tsx`, route mới ở gốc, ngoài các nhóm vai trò; quyết định 12/11/2026). Chỉ là trải nghiệm, API vẫn kiểm tra quyền.
- **Màn "Không có quyền truy cập" (`app/forbidden.tsx`):** `AppScreen` gồm nhãn "403", tiêu đề "Không có quyền truy cập", mô tả "Tài khoản của bạn không dùng được khu vực này.", nút "Về không gian của tôi" (`homePathFor(role)`, chỉ khi đã đăng nhập) và nút phụ "Về trang chủ" (`/`). Dùng `router.replace` để nút quay lại của Android không đưa người dùng về lại khu vực bị chặn.
- **Sau đăng nhập:** có `redirect` hợp lệ (bắt đầu `/`, thuộc khu vực của vai trò hoặc route công khai) thì `router.replace(redirect)`, không thì về `homePathFor(role)`: khách `/(customer)/home`, nhân viên `/(staff)/dashboard`, chủ spa `/(owner)/dashboard`. `queryClient.clear()` khi phiên đổi.
- **Màn chính (`HomeScreen`):** chưa đăng nhập → "Đăng nhập", "Đăng ký" thay cho ba nút vào khu vực; đã đăng nhập → "Vào không gian của tôi" (`homePathFor`) và lời chào tên. Hai nút danh mục giữ nguyên.

### SCR-M06 — Đăng nhập (`app/(public)/login.tsx`)

- **Trường:** "Email hoặc số điện thoại" (`autoComplete="username"`, `textContentType="username"`, `autoCapitalize="none"`, `keyboardType="email-address"`), "Mật khẩu" (`secureTextEntry`, nút icon `Eye`/`EyeOff` có `accessibilityLabel` "Hiện mật khẩu"/"Ẩn mật khẩu", vùng chạm 48dp). Kiểm tra như SCR-W07.
- **Liên kết:** "Quên mật khẩu?" → `/(public)/forgot-password`; "Chưa có tài khoản? Đăng ký" → `/(public)/register`.
- **Điền sẵn:** tham số route `login` do màn đăng ký/đặt lại mật khẩu truyền sang (`router.replace({ pathname, params: { login } })`).
- **Mã lỗi:** như bảng SCR-W07. `Alert` của web dùng component mới toast (`src/components/common/AppNotice.tsx`, `tone: 'error' | 'info' | 'success'`, `accessibilityRole="alert"`); toast thay bằng toast trên màn hoặc `Alert.alert` của React Native khi điều hướng đi.

### SCR-M07 — Đăng ký + OTP (`app/(public)/register.tsx`)

- Hai bước trong một màn, cùng trường, kiểm tra, đếm ngược `expiresAtUtc`/`resendAvailableAtUtc` và mã lỗi như SCR-W08 (bước 1: họ tên, email, SĐT `keyboardType="phone-pad"`, mật khẩu, xác nhận; bước 2: ô "Mã OTP" `keyboardType="number-pad"`, `textContentType="oneTimeCode"`, chỉ nhận 6 chữ số).
- Thành công `201`: `Alert.alert('Đăng ký thành công', 'Vui lòng đăng nhập.')` rồi `router.replace` sang đăng nhập với `login = email`.
- Đổi bước: cuộn lên đầu và đặt focus đọc màn hình vào tiêu đề bước (`accessibilityRole="header"`).

### SCR-M08 — Quên mật khẩu (`app/(public)/forgot-password.tsx`, route mới)

- Ba bước như SCR-W09 ("Bước x/3" + thanh tiến độ ba đoạn dùng token `colors.primary`/`colors.border`): email → OTP (câu trung lập, đếm ngược, gửi lại) → mật khẩu mới ("Hoàn tất trước HH:mm").
- Thành công `204`: nếu đang có phiên thì `signOut()` cục bộ (backend đã thu hồi mọi refresh token), `Alert.alert` "Đặt lại mật khẩu thành công…", về đăng nhập với `login = email`.
- Thêm `Stack.Screen name="forgot-password"` "Quên mật khẩu" vào `(public)/_layout.tsx`.

### Thư viện icon (quyết định 12/11/2026)

- **Chọn `lucide-react-native` + `react-native-svg`.** Cùng bộ icon Lucide với web (`lucide-react`), nên hai nền tảng dùng chung tên và hình icon (`Eye`, `EyeOff`, `LogOut`, `ShieldAlert`…). `react-native-svg` có sẵn trong Expo Go SDK 57 (bản `15.15.4` theo `bundledNativeModules.json`), cài bằng `npx expo install react-native-svg`; `lucide-react-native` chỉ là mã JS, cài bằng `npm install --workspace @spa/mobile`, nhập từng icon (không nhập cả gói).
- **Phương án đã cân nhắc:** `@expo/vector-icons` (có sẵn trong Expo Go, bộ `Feather` gần giống Lucide) không cần thêm native nhưng tên/hình lệch với web và nạp cả font icon; `expo-symbols` chỉ có SF Symbols trên iOS, không dùng được cho Android.
- Màu icon lấy từ token `colors` (`colors.muted`, `colors.primary`), không viết mã màu. Jest: thêm `lucide-react-native` và `react-native-svg` vào `transformIgnorePatterns`.

### Trạng thái, cấu hình, a11y (cả ba màn)

- Bốn trạng thái của form: sẵn sàng / đang gửi (`AppButton loading`, ô `editable={false}`) / lỗi (dưới ô hoặc toast) / thành công (sang bước hoặc điều hướng).
- Thiếu hoặc sai `EXPO_PUBLIC_API_BASE_URL` → toast "Configuration Error", nút gửi tắt, không gọi mạng.
- `AppScreen` lo bàn phím; nút chính rộng toàn màn; mọi vùng chạm ≥ 48dp; nút icon hiện/ẩn mật khẩu có `accessibilityLabel`; lỗi dùng `accessibilityRole="alert"`; dòng đếm ngược chỉ thông báo khi đổi trạng thái (không đọc mỗi giây).

### Thiếu từ backend

Không. `/auth/*` đã hỗ trợ chế độ body cho mobile.

### Kiểm thử giao diện (mobile)

Jest + Testing Library Native, `fetch` giả, `expo-secure-store` và `expo-router` mock.

| Mã          | Tình huống                                                                                                           | Kết quả mong đợi                                                                                                           |
| ----------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| AUTH-UI-T60 | Đăng nhập thành công (khách / nhân viên / chủ spa); có `redirect` hợp lệ / không hợp lệ                              | Lưu refresh token vào secure store, store `authenticated`; `router.replace` đúng trang chủ vai trò / `redirect`            |
| AUTH-UI-T61 | Đăng nhập: thiếu trường; `invalid_credentials`; `account_locked`; `rate_limited`; mất mạng                           | Lỗi dưới ô, không gọi API; toast message server + xóa mật khẩu; giữ dữ liệu; thông báo mạng                                |
| AUTH-UI-T62 | Không gửi header `X-Auth-Transport`; body login không có cookie                                                      | Đúng chế độ body                                                                                                           |
| AUTH-UI-T63 | Khởi động có refresh token hợp lệ / bị từ chối 401 / mất mạng; không có token                                        | `authenticated` + lưu token mới / xóa token, `anonymous` / giữ token, `anonymous` tạm / `anonymous` không gọi mạng         |
| AUTH-UI-T64 | Request có Bearer gặp 401 → làm mới thành công → gửi lại; hai request 401 đồng thời                                  | Một `/auth/refresh`, cả hai gửi lại thành công                                                                             |
| AUTH-UI-T65 | `RouteGuard`: `restoring` / `anonymous` / sai vai trò / đúng vai trò                                                 | Loader / về đăng nhập kèm `redirect` / màn "Không có quyền truy cập" (nút "Về không gian của tôi" đúng vai trò) / hiện màn |
| AUTH-UI-T66 | Đăng xuất: API 204 / API lỗi                                                                                         | Cả hai: xóa secure store, `anonymous`, `queryClient` rỗng                                                                  |
| AUTH-UI-T67 | Đăng ký: validate bước 1; gửi mã → bước 2 có đếm ngược; `email_exists` ở bước 2 về bước 1; `otp_invalid`; thành công | Đúng hành vi như SCR-W08; thành công `Alert.alert` + về đăng nhập với email điền sẵn                                       |
| AUTH-UI-T68 | Quên mật khẩu: bước 1 → 2 (câu trung lập) → 3; `invalid_reset_token` về bước 1; thành công                           | Đúng hành vi như SCR-W09; thành công về đăng nhập với email điền sẵn                                                       |
| AUTH-UI-T69 | Thiếu `EXPO_PUBLIC_API_BASE_URL`                                                                                     | toast "Configuration Error", nút gửi tắt, không gọi `fetch`                                                                |

## Giao diện (mobile): UC-SPA-04

Phạm vi: Android (Expo Go SDK 57). Ba vai trò đã đăng nhập (`account.self`: khách, nhân viên, chủ spa) xem và sửa hồ sơ của chính mình, đổi mật khẩu, đổi ảnh đại diện. Không làm UC-SPA-05 (không có màn Android). Không thêm mục "Thông báo" hay màn đơn hàng/lịch sử mới: tab Cá nhân giữ các lối tắt đã có.

Feature: `apps/mobile/src/features/users/` (`screens/`, `components/AccountPanel.tsx`, `hooks/`, `schemas.ts`, `index.ts`). Ba file `app/(customer|staff|owner)/profile.tsx` chỉ render screen. Hợp đồng dùng `UsersApi`, `usersQueryKeys.me()`, `MeDto` có sẵn. Không thêm kiểu mới trong `shared-types`.

**Đã chốt 13/11/2026, sửa cùng ngày:** tab hồ sơ chỉ hiện cụm thông tin và menu lối tắt. Bấm cụm thông tin mở `app/account.tsx` trên stack gốc (cùng lớp với giỏ hàng và thanh toán). Đổi mật khẩu ở `app/password.tsx`. Không có Stitch.

### SCR-M15 — Tab hồ sơ (khách, nhân viên, chủ spa)

`data_screens.py` gán SCR-M15 cho khách (`app/(customer)/profile.tsx`, "Menu + form"). Nhân viên và chủ spa đã có tab cùng vai trò (`profile.tsx`, nhãn "Cá nhân"). Form nằm ở `app/account.tsx` trên stack gốc, mở khi bấm cụm thông tin đầu tab.

|         |                                                                                                                                                                     |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mã      | SCR-M15 cho khách. Tab nhân viên và chủ spa dùng cùng khối form, cùng hợp đồng với SCR-W22                                                                          |
| Route   | Tab: `app/(customer)/profile.tsx` ("Tài khoản"), `app/(staff)/profile.tsx`, `app/(owner)/profile.tsx`. Form: `app/account.tsx` và `app/password.tsx` trên stack gốc |
| Vai trò | Khách, nhân viên, chủ spa đã đăng nhập. Khách chưa đăng nhập giữ màn chào                                                                                           |
| Layout  | Tab một cột. Cụm thông tin mở trang cập nhật. Menu lối tắt là danh sách full width                                                                                  |

**Khách chưa đăng nhập:** giữ màn chào, Đăng nhập, Đăng ký và các lối tắt khám phá. Không gọi `GET /me`, không hiện form.

**Đã đăng nhập (cả ba tab, `SignedInProfile`):** thẻ nền trắng (`colors.card`, bo `radius.card`, viền và bóng nhẹ) có nhãn "Cập nhật tài khoản": ảnh tròn 64dp (ảnh từ `GET /me`, không có thì hai chữ cái đầu), tên, nhãn vai trò dạng viên thuốc nền `colors.primarySoft` kèm biểu tượng (khách `UserStar`, nhân viên `BadgeCheck`, chủ spa `Crown`), dòng "Thành viên từ MM/YYYY" (từ `createdAtUtc`, giờ VN), nút ✎. Không hiện email. Bấm thẻ mở trang cập nhật. Dưới thẻ là các nhóm menu có tiêu đề (`ProfileMenu` với `sections`): khách "Dịch vụ của tôi" (lịch hẹn, liệu trình, gói đã mua) và "Hỗ trợ" (trợ lý AI, đánh giá dịch vụ ghi "Sắp có" vì UC-SPA-30 chưa làm); nhân viên "Công việc"; chủ spa "Quản lý spa". Nhóm cuối chung cho cả ba là "Tài khoản": "Thông tin cá nhân" (`/account`), "Đổi mật khẩu" (`/password`), "Đăng xuất" chữ đỏ, hỏi `Alert` "Đăng xuất?" trước khi thoát. Cuối trang: "Như Nguyệt Spa · Phiên bản x.y.z" từ `expo-constants`. Không thêm hàng "Thông báo", không thêm mục đơn hàng khi mobile chưa có màn đó. Tab không hiện form.

**Trang thông tin cá nhân** (`app/account.tsx`, header riêng như giỏ hàng): ảnh giữa màn với nút máy ảnh, họ tên, rồi các ô `AppInput` (họ tên, số điện thoại chỉ đọc, ngày sinh, email chỉ đọc) và hàng radio giới tính. Nút "Cập nhật" ở cuối. "Chỉnh sửa lại mật khẩu" mở `app/password.tsx`.

**Khối 1 — Thông tin cá nhân**

- Ảnh 80dp, bo tròn. Có `avatarUrl` thì hiện ảnh, không thì chữ cái đầu của `fullName`.
- Nút máy ảnh: chưa có ảnh thì mở thư viện ngay; đã có ảnh thì `Alert` "Ảnh đại diện" với "Chọn ảnh từ thư viện", "Xóa ảnh", "Hủy".
- "Chọn ảnh từ thư viện": `expo-image-picker` chỉ mở thư viện (không camera), cắt vuông (`allowsEditing`, `aspect` 1:1), iOS lấy bản tương thích (HEIC → JPEG). Xin quyền; từ chối → toast "Ứng dụng cần quyền thư viện ảnh để đổi ảnh đại diện.". Ảnh chọn được luôn qua `expo-image-manipulator` (`avatarImage.prepareAvatar`): thu về tối đa 512 px cạnh dài, lưu JPEG chất lượng 0,8, rồi gửi tệp đó dưới dạng `File` của `expo-file-system` (`useUploadAvatar`). Không gửi phần `{ uri, name, type }` của React Native: Expo SDK 57 thay `fetch` toàn cục bằng `expo/fetch`, bản này không mã hóa được phần đó và lỗi ngay trên máy (app thấy như "Không kết nối được máy chủ"). Nhờ đó mọi ảnh máy đọc được (HEIC, PNG, WebP, JPEG lớn) đều qua kiểm tra JPEG/PNG/WebP ≤ 5 MB của server, client không chặn theo loại hay dung lượng. Máy không đọc được ảnh → toast "Không đọc được ảnh này. Vui lòng chọn ảnh khác.", không gọi API. Đọc được → hiện ngay ảnh vừa chọn kèm lớp mờ và vòng xoay, `POST /me/avatar` → ghi `avatarUrl` vào cache `usersQueryKeys.me()`, toast "Đã cập nhật ảnh đại diện.". Lỗi thì quay về ảnh cũ.
- "Xóa ảnh": `DELETE /me/avatar` (Q-56) → `avatarUrl` = `null` trong cache, ảnh về chữ cái đầu, toast "Đã xóa ảnh đại diện.".
- `avatarUrl` của Cloudinary có số phiên bản (`/v…/`), mỗi lần tải là một URL mới, nên `Image` không giữ ảnh cũ trong cache.
- "Họ và tên": sửa được, bắt buộc, 1–100 ký tự sau khi bỏ khoảng trắng hai đầu.
- "Email": chỉ đọc, kèm nhãn vai trò "Khách hàng" / "Nhân viên" / "Chủ spa".
- "Số điện thoại": chỉ đọc, dòng phụ "Số điện thoại dùng để đăng nhập, không đổi ở đây." (cùng quyết định với SCR-W22, 10/11/2026). `PUT /me` vẫn phải gửi đủ 4 trường, nên form gửi lại `phoneNumber` đang có.
- "Ngày sinh": tùy chọn. Nút hiện `formatLocalDate` hoặc "Chưa cập nhật", mở `@react-native-community/datetimepicker` (chế độ ngày, tối đa hôm nay theo giờ Việt Nam, tối thiểu 01/01/1900). Chỉ nhận ngày khi `event.type === 'set'`: trên Android nút Hủy vẫn gọi `onChange` với ngày khởi đầu của lịch (hôm nay khi còn trống), nên bỏ qua để giữ giá trị cũ. Đã có ngày thì biểu tượng lịch ở cuối ô đổi thành nút ✕ (vùng chạm 48dp, `accessibilityLabel` "Xóa ngày sinh"), bấm thì gửi `null`; chưa có ngày thì hiện biểu tượng lịch.
- "Giới tính": tùy chọn, một hàng ba nút "Nam" (`male`), "Nữ" (`female`), "Khác" (`other`). Bấm lại lựa chọn đang chọn thì bỏ, gửi `null`.
- "Ngày tham gia": chỉ đọc, phần ngày của `formatDateTimeUtc(createdAtUtc)` (giờ Việt Nam, không hiện giờ).
- "Lưu thông tin" → `PUT /me` với `{ fullName, phoneNumber, dateOfBirth, gender }`. Thành công: toast "Đã lưu thông tin.", `setQueryData(usersQueryKeys.me(), me)`, và `authStore.user.fullName` = tên mới để đầu tab đổi ngay. Ảnh đầu tab lấy từ cùng cache `me`.

**Khối 2 — Đổi mật khẩu**

- Dòng nhắc: "Đổi mật khẩu sẽ đăng xuất các phiên khác. Phiên này vẫn dùng được tới khi hết hạn đăng nhập."
- "Mật khẩu hiện tại", "Mật khẩu mới", "Xác nhận mật khẩu mới". Mỗi ô có nút Eye/EyeOff, `accessibilityLabel` "Hiện mật khẩu" / "Ẩn mật khẩu", vùng chạm ≥ 48dp. Mật khẩu mới: 8–128 ký tự, có ít nhất một chữ và một số, khác mật khẩu hiện tại, khớp ô xác nhận (cùng BR-AUTH-10, BR-AUTH-16).
- "Đổi mật khẩu" → `PUT /me/password`. `204`: xóa trắng ba ô, toast "Đổi mật khẩu thành công. Các phiên khác đã được thu hồi." Không gọi `signOut` ngay (access token còn hạn, giống web). Refresh token trong secure store đã bị server thu hồi, nên lần mở app sau hoặc lần làm mới phiên sẽ về màn đăng nhập.

**Dữ liệu**

| Việc                | Endpoint            | Query key                                           |
| ------------------- | ------------------- | --------------------------------------------------- |
| Mở tab đã đăng nhập | `GET /me`           | `usersQueryKeys.me()`                               |
| Lưu hồ sơ           | `PUT /me`           | ghi đè `me`, đồng thời `invalidateQueries` cùng key |
| Đổi mật khẩu        | `PUT /me/password`  | không đổi cache hồ sơ                               |
| Đổi ảnh             | `POST /me/avatar`   | ghi `avatarUrl` vào cache `me`                      |
| Xóa ảnh             | `DELETE /me/avatar` | `avatarUrl` = `null` trong cache `me`               |

Không có bộ lọc, sắp xếp hay phân trang. Không đưa trạng thái form lên URL.

**Mã lỗi → xử lý.** So khớp `errors[].code` với mã backend thật (`UserErrors`, `ImageUploadReader`), không dùng mã cũ trong bảng SCR-W22 (`password_mismatch`, `invalid_file_type`). `usersErrorCodes` thêm `currentPasswordIncorrect`, `passwordUnchanged`, `imageRequired`, `imageTooLarge`, `imageTypeNotSupported`, `imageStorageUnavailable`. Giữ các khóa cũ để web không vỡ. `validation_error` gắn theo `field` (PascalCase → chữ thường ký tự đầu), giống `ChangePasswordCard`.

| Mã                                                              | Thao tác                | Hành vi                                                                                                                                                           |
| --------------------------------------------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `validation_error`                                              | Lưu hồ sơ, đổi mật khẩu | Lỗi dưới ô theo `field` (`FullName`, `DateOfBirth`, `Gender`, `CurrentPassword`, `NewPassword`, `ConfirmPassword`). Ô không khớp → toast với `message` của server |
| `phone_exists`                                                  | Lưu hồ sơ               | Không xảy ra khi gửi lại đúng SĐT cũ. Nếu có → toast "Số điện thoại đã được dùng cho tài khoản khác."                                                             |
| `current_password_incorrect`                                    | Đổi mật khẩu            | Lỗi dưới "Mật khẩu hiện tại": "Mật khẩu hiện tại không đúng."                                                                                                     |
| `password_unchanged`                                            | Đổi mật khẩu            | Lỗi dưới "Mật khẩu mới": "Mật khẩu mới phải khác mật khẩu hiện tại."                                                                                              |
| `rate_limited`                                                  | Đổi mật khẩu            | toast "Bạn đã thao tác quá nhiều lần. Vui lòng thử lại sau ít phút."                                                                                              |
| `image_required`, `image_too_large`, `image_type_not_supported` | Đổi ảnh                 | toast dùng `message` của server. Ảnh cũ giữ nguyên                                                                                                                |
| `image_storage_unavailable`                                     | Đổi ảnh                 | toast "Kho ảnh tạm không dùng được. Vui lòng thử lại sau." Ảnh cũ giữ nguyên                                                                                      |
| `user_not_found`                                                | Mở tab hoặc lưu         | toast "Không tìm thấy tài khoản." và nút "Đăng xuất"                                                                                                              |
| Mất mạng, 500                                                   | Mọi thao tác            | toast lỗi mạng theo quy ước màn auth. Nút lưu không kẹt ở trạng thái loading                                                                                      |

`401` để lớp phiên hiện tại làm mới token. Ba vai trò đều có `account.self`, nên `403` không phải luồng của màn này.

**Trạng thái**

- Đang tải `GET /me` trên trang cập nhật: `AppLoader` ở chỗ form. Đầu tab vẫn hiện tên từ `authStore` nếu đã có.
- Lỗi tải trên trang cập nhật: `AppNotice` và nút "Thử lại" (gọi lại query).
- Có dữ liệu: form điền sẵn. `dateOfBirth` và `gender` null hiện "Chưa cập nhật" / không nút nào được chọn.
- Phản hồi sau thao tác (lưu, đổi mật khẩu, đổi/xóa ảnh, lỗi server không gắn được vào ô): toast (`toast.success/error` từ `stores/toastStore`, hiện bằng `AppToastHost` trong `AppProviders`), trượt xuống dưới thanh trạng thái, chạm để đóng, thành công tự ẩn sau 3 giây, lỗi sau 5 giây. Lỗi theo ô vẫn hiện dưới ô.
- Đang lưu, đang đổi mật khẩu: nút tương ứng `loading`, các ô của khối đó không sửa được. Đang tải hoặc xóa ảnh: lớp mờ và vòng xoay trên ảnh (`accessibilityLabel` "Đang cập nhật ảnh đại diện"), nút máy ảnh mờ và `busy`.

**Responsive và a11y.** Một cột từ 320dp, nút chính rộng hết hàng, không cuộn ngang. `AppScreen` xử lý bàn phím. Ảnh là minh họa (`accessible={false}`) vì tên đã có chữ. Lỗi có `accessibilityRole="alert"`. Sau lỗi server, focus vào ô lỗi đầu tiên.

**Thiếu từ backend:** không chặn. `PUT /me` vẫn cho đổi SĐT; form không gửi SĐT mới. Muốn khóa ở server thì sửa `UpdateProfileRequest` trong một task backend riêng. `UsersApi.uploadAvatar` hiện chỉ nhận `File | Blob`. React Native cần `{ uri, name, type }` gắn vào `FormData` trường `file`. Mở rộng chữ ký trong `packages/api-client` (web vẫn truyền `File`), kèm test cả hai dạng. Không đổi API.

**Thư viện.** Cài bằng `npx expo install`: `expo-image-picker`, `expo-image-manipulator` (chuẩn hóa ảnh đại diện), `expo-file-system` (`File` để gửi ảnh qua `expo/fetch`), `@react-native-community/datetimepicker`. Không thêm thư viện khác. Jest mock cả bốn.

### Kiểm thử giao diện (mobile, UC-SPA-04)

Jest + Testing Library Native, `fetch` giả. `AUTH-UI-T60`…`T69` giữ cho đăng nhập.

| Mã          | Tình huống                                                                                   | Kết quả mong đợi                                                                                                                                                                 |
| ----------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AUTH-UI-T70 | `UsersApi.uploadAvatar` với `File` và với `{ uri, name, type }`                              | Cả hai gửi `POST /me/avatar`, multipart trường `file`                                                                                                                            |
| AUTH-UI-T71 | Tab đã đăng nhập: tải được / lỗi + Thử lại / ngày sinh và giới tính null / đủ dữ liệu và ảnh | Đủ 4 trạng thái. Email, SĐT, vai trò, ngày tham gia chỉ đọc                                                                                                                      |
| AUTH-UI-T72 | Họ tên trống hoặc quá 100 ký tự                                                              | Lỗi dưới ô, không gọi `PUT /me`                                                                                                                                                  |
| AUTH-UI-T73 | Lưu thành công                                                                               | `PUT` gửi SĐT cũ kèm họ tên, ngày sinh, giới tính. Cache `me` và `authStore.user.fullName` đổi. toast đã lưu                                                                     |
| AUTH-UI-T74 | `validation_error` field `DateOfBirth`; `phone_exists`                                       | Lỗi dưới ngày sinh / toast SĐT đã dùng                                                                                                                                           |
| AUTH-UI-T75 | Đổi mật khẩu: quá ngắn, không có số, xác nhận lệch; rồi `204`                                | Chặn trước khi gọi API. Thành công thì xóa ba ô, không `signOut`                                                                                                                 |
| AUTH-UI-T76 | `current_password_incorrect`, `password_unchanged`, `rate_limited`                           | Đúng ô hoặc toast tần suất                                                                                                                                                       |
| AUTH-UI-T77 | Ảnh HEIC 4032 px; ảnh máy không đọc được; upload `200`; `image_storage_unavailable`          | Thu về 512 px JPEG, gửi `avatar.jpg` / `image/jpeg`, đang tải có vòng xoay và ảnh xem trước, xong có thông báo. Ảnh không đọc được thì báo, không gọi API. Lỗi kho giữ ảnh cũ    |
| AUTH-UI-T79 | Đã có ảnh, bấm máy ảnh rồi "Xóa ảnh"                                                         | `Alert` có ba lựa chọn; `DELETE /me/avatar`, thông báo đã xóa                                                                                                                    |
| AUTH-UI-T80 | Mở lịch ngày sinh rồi bấm Hủy                                                                | Ngày sinh giữ nguyên (không thành hôm nay)                                                                                                                                       |
| AUTH-UI-T78 | Tab khách đã đăng nhập, tab nhân viên, tab chủ spa                                           | Cả ba không hiện form trên tab. Bấm cụm thông tin mở `/account` trên stack gốc. Tab vẫn còn lối tắt cũ cùng Đăng xuất. Khách chưa đăng nhập không có form và không gọi `GET /me` |

## Câu hỏi còn mở

- ~~Web lưu refresh token ở cookie HttpOnly hay trong bộ nhớ~~ — **đã chốt 05/11/2026: cookie HttpOnly** (task backend BE-1, xem mục "Giao diện (web)").
- Có khóa tài khoản tạm sau N lần sai mật khẩu không — cần thêm cột vào `users` (sửa `data_db.py`) nếu có.
- Q-12 (mới): độ mạnh mật khẩu — mặc định 8–128 ký tự, có chữ và số (`Account:PasswordMinLength`). Mật khẩu của tài khoản seed hiện có không bị kiểm tra lại.
- Q-50 (mới): người dùng có tự đổi email không? Mặc định **không** (email là định danh đăng nhập; đổi cần OTP tới email mới — để sau). Chủ spa cũng không đổi email hộ.
- Q-51 (mới): đổi mật khẩu có thu hồi các phiên đăng nhập khác không? Mặc định **thu hồi mọi refresh token**, kể cả phiên đang dùng (client đăng nhập lại); `Account:RevokeSessionsOnPasswordChange` = `true`, đặt `false` để giữ phiên.
- Q-52 (mới): access token của tài khoản vừa bị khóa còn hạn (≤ 15 phút) có bị chặn ngay không? Mặc định **không** kiểm tra CSDL mỗi request; tài khoản bị khóa mất quyền khi access token hết hạn vì không làm mới được. Nếu cần chặn ngay thì thêm kiểm tra trạng thái trong `OnTokenValidated` (tốn 1 truy vấn/request).
- Q-53 (mới): biên ngày sinh, giới tính? Mặc định ngày sinh tùy chọn, từ 01/01/1900 đến hôm nay (giờ VN), không đặt tuổi tối thiểu; giới tính tùy chọn `male`/`female`/`other`.
- Q-54 (mới): khóa tài khoản có hủy lịch hẹn/đơn chưa thanh toán/ca làm không? Mặc định **không**, chỉ chặn đăng nhập và làm mới phiên.
- Q-55 (mới): chủ spa có khóa được tài khoản chủ spa khác không? Mặc định **có** — DA chỉ cấm tự khóa mình. Tài khoản `inactive` không khóa/mở được qua UC-SPA-05.
- Q-56 (mới): thêm `DELETE /me/avatar` (DA chỉ có đổi ảnh). Mặc định **có**, cùng cách xóa ảnh catalog.
- Q-66 (mới): nhiều tab cùng làm mới phiên bằng một cookie? Mặc định có cửa sổ ân hạn **30 giây** (`Jwt:RefreshReuseGraceSeconds`): token vừa bị xoay vòng mà gửi lại trong cửa sổ thì chỉ trả 401, không coi là bị đánh cắp.
- Q-67 (mới): làm sao phân biệt "token bị đánh cắp" với "token đã bị thu hồi chủ động"? Mặc định **xóa dòng** khi thu hồi chủ động, chỉ xoay vòng mới đánh dấu `revoked_at_utc`. Không đổi schema. Phương án khác: thêm cột `revoked_reason` (sửa `data_db.py`, migration), giữ được lịch sử nhưng tốn công hơn.
- Q-68 (mới): giới hạn tần suất cho `/auth/refresh`? Mặc định tách riêng 30/phút/IP, vì web gọi refresh mỗi lần tải lại trang.
- Q-69 (mới): ở chế độ cookie, đăng xuất có cần Bearer không? Mặc định **không**: cookie là bằng chứng sở hữu, và đăng xuất vẫn chạy được khi access token đã hết hạn. Chế độ body (mobile) vẫn cần Bearer.
- Q-70 (mới): cookie `Secure` khi chạy HTTP? Mặc định `true`, Development `false`. Trình duyệt chấp nhận cookie `Secure` trên `http://localhost` nhưng không chấp nhận trên IP LAN.
- Quên mật khẩu: DA E1 ghi "email không tồn tại → thông báo"; đặc tả này chọn trả phản hồi chung để chống dò tài khoản. Nếu GVHD yêu cầu đúng DA thì đổi bước 3 thành `404 account_not_found`.

# Tài khoản & xác thực — đặc tả

- **Nhóm:** `Auth`, `Users` · **Sprint:** 1 · **Nguồn:** DA §2.2.3 (UC Đăng nhập) / ĐX
- **Entity:** `User` (bảng `users`), `RefreshToken` (bảng `refresh_tokens`), `OwnerProfile` (bảng `owner_profiles`) — xem [glossary](../domain/glossary.md), [data-model](../domain/data-model.md)
- **Trạng thái triển khai:** xem [progress.md](../progress.md)
- **Đã đặc tả:** UC-SPA-02 và seed tài khoản chủ spa (dev). UC-SPA-01, 03, 04, 05 viết sau.

## Use case

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

## Business rules

| Mã         | Quy tắc                                                                                                                                                                                       | Enforce ở đâu                    | Nguồn                    |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ------------------------ |
| BR-AUTH-01 | Access token JWT ký HMAC-SHA256 bằng `JWT_KEY` (≥ 32 ký tự), sống 15 phút; claims: `sub` = user id, `role` = `customer`/`staff`/`owner`, `name` = họ tên, `jti`                               | Infrastructure `JwtTokenService` | Quyết định của bạn       |
| BR-AUTH-02 | Refresh token: 64 byte ngẫu nhiên (base64url), sống 7 ngày; CSDL chỉ lưu SHA-256 hex của token, không lưu token thô                                                                           | Infrastructure, `refresh_tokens` | Quyết định của bạn       |
| BR-AUTH-03 | Chỉ `status = active` được đăng nhập và làm mới phiên                                                                                                                                         | Application `AuthService`        | DA (UC Đăng nhập E2)     |
| BR-AUTH-04 | Xoay vòng: mỗi lần làm mới thu hồi token cũ (`revoked_at_utc`) và phát token mới trong cùng một lần lưu; gửi lại token đã thu hồi → thu hồi mọi token của người dùng                          | Application `AuthService`        | ĐX                       |
| BR-AUTH-05 | Không tiết lộ tài khoản có tồn tại: sai email/SĐT và sai mật khẩu trả cùng mã, cùng thông điệp; khi không thấy tài khoản vẫn chạy một lần kiểm tra hash giả để thời gian phản hồi tương đương | Application `AuthService`        | ĐX                       |
| BR-AUTH-06 | Thời hạn token, issuer, audience đọc từ cấu hình `Jwt:*` (`appsettings.json` + `.env`), không viết cứng                                                                                       | `JwtOptions`                     | open-questions (quy ước) |

Khóa tài khoản tạm sau nhiều lần sai mật khẩu (đề xuất trước đây) **không làm** lần này: bảng `users` không có cột đếm số lần sai. Giới hạn tần suất theo IP (E7) thay thế tạm.

## Dữ liệu

| Bảng             | Cột dùng                                                                            | Ràng buộc đặc biệt                           |
| ---------------- | ----------------------------------------------------------------------------------- | -------------------------------------------- |
| `users`          | `id`, `email`, `phone_number`, `password_hash`, `role`, `status`, `full_name`       | `email` citext unique, `phone_number` unique |
| `refresh_tokens` | `id`, `user_id`, `token_hash`, `expires_at_utc`, `revoked_at_utc`, `created_at_utc` | `token_hash` unique                          |
| `owner_profiles` | `id` (= `users.id`)                                                                 | Dùng khi seed                                |

Không cần migration mới.

## API

Tiền tố `/api/v1`. Phản hồi bọc envelope `{ success, message, data, errors, traceId }`.

| Method | Đường dẫn       | Vai trò               | Request               | Response                                                                                                                    | Lỗi                                                                                                            |
| ------ | --------------- | --------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| POST   | `/auth/login`   | Ẩn danh               | `{ login, password }` | 200 `{ accessToken, accessTokenExpiresAtUtc, refreshToken, refreshTokenExpiresAtUtc, user: { id, fullName, email, role } }` | 400 `validation_error`, 401 `invalid_credentials`, 403 `account_locked`/`account_inactive`, 429 `rate_limited` |
| POST   | `/auth/refresh` | Ẩn danh               | `{ refreshToken }`    | 200 như `/auth/login`                                                                                                       | 400, 401 `invalid_refresh_token`, 403, 429                                                                     |
| POST   | `/auth/logout`  | Đã đăng nhập (Bearer) | `{ refreshToken }`    | 204 (kể cả token đã thu hồi hoặc không thuộc người gọi — không tiết lộ)                                                     | 401 `unauthorized` khi thiếu/sai access token                                                                  |

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

Thiếu `JWT_KEY` không chặn API khởi động (health check, Swagger vẫn chạy); lỗi cấu hình chỉ xảy ra khi gọi đăng nhập hoặc gửi Bearer token.

## Kiểm thử bắt buộc

| Mã       | Tình huống                                              | Kết quả mong đợi                                                                 |
| -------- | ------------------------------------------------------- | -------------------------------------------------------------------------------- |
| AUTH-T01 | Đăng nhập đúng bằng email (khác hoa thường) và bằng SĐT | 200, access token có `sub`, `role`, hết hạn sau 15 phút; 1 dòng `refresh_tokens` |
| AUTH-T02 | Sai mật khẩu / email không tồn tại                      | Cùng `401 invalid_credentials`, cùng thông điệp                                  |
| AUTH-T03 | Tài khoản `locked` / `inactive`, mật khẩu đúng          | `403 account_locked` / `account_inactive`                                        |
| AUTH-T04 | Làm mới phiên với token hợp lệ                          | Token cũ có `revoked_at_utc`, token mới khác token cũ                            |
| AUTH-T05 | Gửi lại refresh token đã dùng                           | 401; mọi token còn hiệu lực của người dùng bị thu hồi                            |
| AUTH-T06 | Refresh token hết hạn                                   | `401 invalid_refresh_token`                                                      |
| AUTH-T07 | Đăng xuất rồi làm mới bằng token vừa đăng xuất          | 204, sau đó 401                                                                  |
| AUTH-T08 | Gọi `/auth/logout` không có Bearer                      | 401 envelope, mã `unauthorized`                                                  |
| AUTH-T09 | 11 lần gọi `/auth/login` trong 1 phút từ cùng IP        | Lần thứ 11 trả `429 rate_limited`                                                |
| AUTH-T10 | Seed chạy 2 lần                                         | Lần 1 tạo chủ spa đăng nhập được; lần 2 không tạo thêm                           |

## Câu hỏi còn mở

- Web lưu refresh token ở cookie HttpOnly hay trong bộ nhớ — chốt khi làm giao diện web (frontend.md đang ghi cookie HttpOnly).
- Có khóa tài khoản tạm sau N lần sai mật khẩu không — cần thêm cột vào `users` (sửa `data_db.py`) nếu có.

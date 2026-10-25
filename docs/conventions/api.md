# Quy ước API REST

Áp dụng cho mọi endpoint, dùng chung cho web và Android. Danh mục endpoint đề xuất ở sheet `12_API_Endpoints` (trường JSON tiếng Anh theo [glossary](../domain/glossary.md) và [data-model.md](../domain/data-model.md)).

## Đường dẫn và phương thức

- Tiền tố `/api/v1`; health check giữ `/health/live`, `/health/ready` (không version).
- Danh từ số nhiều `kebab-case`, đúng tên tài nguyên trong glossary: `/packages` (không phải `/service-packages`), `/services`, `/appointments`, `/work-schedules`.
- Dữ liệu của người đang đăng nhập: `/api/v1/me/...` (`/me/appointments`, `/me/cart`, `/me/orders`).
- Chuyển trạng thái là hành động: `POST /appointments/{id}/cancel`, `/confirm`, `/complete`, `/no-show`, `/reschedule`.

| Phương thức | Dùng cho                                   | Mã thành công                                      |
| ----------- | ------------------------------------------ | -------------------------------------------------- |
| GET         | Đọc                                        | 200                                                |
| POST        | Tạo mới hoặc hành động                     | 201 (tạo, kèm header `Location`) / 200 (hành động) |
| PUT         | Thay toàn bộ dữ liệu sửa được              | 200                                                |
| PATCH       | Đổi một phần nhỏ (trạng thái)              | 204                                                |
| DELETE      | Xóa (chỉ dữ liệu chưa phát sinh giao dịch) | 204                                                |

## Định dạng

- Phản hồi luôn bọc trong envelope `{ success, message, data, errors, traceId }` (đã có ở `ApiResponse`).
- JSON `camelCase`; enum là chuỗi `snake_case` (`"status": "pending_payment"`), cấu hình bằng `JsonStringEnumConverter(JsonNamingPolicy.SnakeCaseLower)` trong `AddApiFoundation`.
- Ngày `yyyy-MM-dd`, giờ lịch hẹn `HH:mm` (giờ VN); thời điểm ISO-8601 UTC có `Z`.
- Tiền là số nguyên VND.
- Danh sách: `?page=1&pageSize=10` (1–100), `?search=`, `?sortBy=&sortDirection=asc|desc`; `data` là `PagedResult` (`items`, `page`, `pageSize`, `totalCount`, `totalPages`, `hasPreviousPage`, `hasNextPage`).

## Lỗi

- `errors[]` gồm `{ code, message, field? }`; `code` là `snake_case` ổn định, FE xử lý theo `code` chứ không theo `message`.
- 400 dữ liệu/quy tắc, 401 chưa đăng nhập, 403 sai vai trò, 404 không tồn tại _hoặc_ ngoài phạm vi dữ liệu (không tiết lộ tồn tại), 409 xung đột, 500 lỗi bất ngờ (chỉ trả `traceId`).

## Bảo mật

- Xác thực `Authorization: Bearer <JWT>`; refresh token xoay vòng qua `POST /auth/refresh`.
- Không nhận định danh của chính người gọi (customerId, staffId) từ body hay query.
- Tiền luôn do server tính lại; không tin số tiền từ client.
- `POST` đặt lịch, tạo đơn, tạo thanh toán nhận header `Idempotency-Key` (UUID) để chống gửi trùng.
- Webhook cổng thanh toán xác thực chữ ký và xử lý idempotent theo mã giao dịch; return URL chỉ để hiển thị.

## Hợp đồng dùng chung với FE

Khi thêm hoặc đổi endpoint, cập nhật trong cùng thay đổi:

1. DTO/request ở `Application/DTOs/<Feature>`.
2. Kiểu tương ứng ở `packages/shared-types/src/<feature>.ts`.
3. Hàm gọi ở `packages/api-client/src/<feature>.ts` và query keys.
4. Bảng endpoint trong đặc tả tính năng (`docs/specs/`).

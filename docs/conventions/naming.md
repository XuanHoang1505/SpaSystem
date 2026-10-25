# Quy ước đặt tên

Định danh trong code dùng tiếng Anh, văn bản hiển thị dùng tiếng Việt có dấu ([ADR-0001](../decisions/ADR-0001-english-code-identifiers.md)). Tên khái niệm nghiệp vụ lấy từ [glossary](../domain/glossary.md), không tự dịch lại.

## C#

| Loại                           | Quy tắc                                                        | Ví dụ                                                   |
| ------------------------------ | -------------------------------------------------------------- | ------------------------------------------------------- |
| Namespace                      | `NhuNguyetSpa.<Layer>.<Folder>`, khớp thư mục, file-scoped     | `namespace NhuNguyetSpa.Application.UseCases.Bookings;` |
| Class, record, enum, interface | PascalCase; interface có tiền tố `I`                           | `Appointment`, `IAppointmentRepository`                 |
| Method                         | PascalCase, động từ; bất đồng bộ có hậu tố `Async`             | `BookNowAsync`, `GetAvailabilityAsync`                  |
| Property, public field         | PascalCase                                                     | `HoldExpiresAtUtc`                                      |
| Tham số, biến cục bộ           | camelCase                                                      | `appointmentId`                                         |
| Private field                  | `_camelCase` (ưu tiên primary constructor nếu không cần field) | `_repository`                                           |
| Hằng số                        | PascalCase                                                     | `MaxReviewLength`                                       |
| Thời điểm UTC                  | Hậu tố `AtUtc`, kiểu `DateTime`                                | `PaidAtUtc`                                             |
| Ngày/giờ địa phương            | `DateOnly`/`TimeOnly`, không hậu tố                            | `Date`, `StartTime`                                     |
| Bool                           | Tiền tố `Is`/`Has`/`Can`                                       | `IsActive`, `CanBeCancelled`                            |

### Hậu tố theo vai trò

| Vai trò           | Mẫu tên                                                                             | Ví dụ                                                      |
| ----------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Entity            | Danh từ số ít                                                                       | `TreatmentSession`                                         |
| DTO trả về        | `<Entity>Dto`, `<Entity>ListItemDto`, `<Entity>DetailDto`                           | `AppointmentDetailDto`                                     |
| Request           | `<Verb><Entity>Request`                                                             | `CreateAppointmentRequest`, `RescheduleAppointmentRequest` |
| Validator         | `<Request>Validator`                                                                | `CreateAppointmentRequestValidator`                        |
| Service nghiệp vụ | `I<Feature>Service` / `<Feature>Service` (số ít)                                    | `IBookingService`, `ICartService`                          |
| Repository        | `I<Entity>Repository` / `<Entity>Repository`                                        | `IAppointmentRepository`                                   |
| Adapter ngoài     | `I<Mục đích>` / `<Nhà cung cấp><Mục đích>`                                          | `IPaymentGateway` / `VnPayPaymentGateway`                  |
| Options           | `<Feature>Options`                                                                  | `BookingOptions` (thời gian giữ chỗ, bước khung giờ)       |
| EF configuration  | `<Entity>Configuration`                                                             | `AppointmentConfiguration`                                 |
| Controller        | `<Tài nguyên số nhiều>Controller`; tài nguyên của người đăng nhập thêm tiền tố `Me` | `AppointmentsController`, `MeAppointmentsController`       |
| Job nền           | `<Việc>Job`                                                                         | `HoldExpirationJob`                                        |
| Exception         | `<Nghĩa>Exception`                                                                  | `ConflictException`                                        |

Tránh: tên trùng hậu tố gây khó đọc (`ServiceService`), viết tắt không phổ biến (`Apt`, `Pkg`), tiếng Việt không dấu (`LichHen`).

## CSDL (PostgreSQL)

| Loại            | Quy tắc                                       | Ví dụ                                            |
| --------------- | --------------------------------------------- | ------------------------------------------------ |
| Bảng            | `snake_case` số nhiều                         | `treatment_sessions`                             |
| Cột             | `snake_case`; khóa ngoại `<entity>_id`        | `customer_package_id`                            |
| Khóa chính      | `pk_<bảng>`                                   | `pk_appointments`                                |
| Khóa ngoại      | `fk_<bảng>_<bảng cha>_<cột>`                  | `fk_appointments_staff_members_staff_id`         |
| Unique / index  | `ux_<bảng>_<cột>` / `ix_<bảng>_<cột>`         | `ux_users_email`                                 |
| Check / exclude | `ck_<bảng>_<ý nghĩa>` / `ex_<bảng>_<ý nghĩa>` | `ck_reviews_rating_range`                        |
| Giá trị enum    | Chuỗi `snake_case`                            | `pending_payment`                                |
| Migration       | PascalCase mô tả thay đổi                     | `AddAppointments`, `AddHoldExpiryToAppointments` |

## API HTTP

| Loại                           | Quy tắc                                    | Ví dụ                            |
| ------------------------------ | ------------------------------------------ | -------------------------------- |
| Đường dẫn                      | `/api/v1/` + danh từ số nhiều `kebab-case` | `/api/v1/work-schedules`         |
| Tài nguyên của người đăng nhập | `/api/v1/me/...`                           | `/api/v1/me/appointments`        |
| Hành động chuyển trạng thái    | `POST /<tài nguyên>/{id}/<động-từ>`        | `POST /appointments/{id}/cancel` |
| Trường JSON                    | camelCase                                  | `holdExpiresAtUtc`, `startTime`  |
| Query string                   | camelCase                                  | `?staffId=&date=2026-11-07`      |
| Mã lỗi                         | `snake_case`                               | `slot_unavailable`               |

## TypeScript / React

| Loại              | Quy tắc                                                    | Ví dụ                                 |
| ----------------- | ---------------------------------------------------------- | ------------------------------------- |
| Thư mục tính năng | `kebab-case`                                               | `features/service-packages`           |
| Component         | PascalCase; web: thư mục + file cùng tên; mobile: một file | `AppointmentCard/AppointmentCard.tsx` |
| CSS Module        | `<Component>.module.css`, class camelCase                  | `styles.slotGrid`                     |
| Hook              | `use<Việc>` camelCase, file cùng tên                       | `useAvailability.ts`                  |
| Hàm, biến         | camelCase                                                  | `formatCurrency`                      |
| Type, interface   | PascalCase, không tiền tố `I`                              | `AppointmentDto`                      |
| Hằng số module    | `UPPER_SNAKE_CASE`                                         | `HOLD_WARNING_SECONDS`                |
| Query keys        | `<feature>QueryKeys`                                       | `bookingQueryKeys.list(filters)`      |
| Lớp API           | `<Feature>Api`                                             | `BookingsApi`                         |
| Zod schema        | `<form>Schema`                                             | `bookNowSchema`                       |
| Store Zustand     | `use<Tên>Store`, file `<tên>Store.ts`                      | `useUiStore`                          |
| Test              | `<file>.test.ts(x)` cạnh file được test                    | `useAvailability.test.ts`             |
| Route web         | `kebab-case`, khớp `docs/frontend.md`                      | `/my-bookings/:bookingId`             |
| Route mobile      | File Expo Router `kebab-case`, tham số `[camelCase]`       | `bookings/[bookingId].tsx`            |

## Khác

- Biến môi trường: `UPPER_SNAKE_CASE`; cấu hình .NET lồng nhau dùng `__` (`Booking__HoldMinutes`).
- Nhánh git: `feature/<uc-hoặc-mô-tả>`, `fix/<mô-tả>`, `docs/<mô-tả>` — ví dụ `feature/uc-spa-15-book-now`.
- File tài liệu: `kebab-case.md`; ADR: `ADR-NNNN-<mô-tả>.md`.

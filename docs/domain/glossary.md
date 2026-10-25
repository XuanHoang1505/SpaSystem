# Glossary — thuật ngữ báo cáo ↔ tên trong code

Bảng ánh xạ chính thức theo [ADR-0001](../decisions/ADR-0001-english-code-identifiers.md). Cột "Báo cáo" là tên trong `126_DA_NTTT_NguyenXuanHoang_2214_v1.docx`. Thêm khái niệm mới thì thêm dòng ở đây trước khi viết code.

Danh sách **đầy đủ từng cột** của mọi bảng (kiểu PostgreSQL, kiểu C#, ràng buộc, tên DA) ở [data-model.md](data-model.md). File này chỉ giữ các ánh xạ cần nhớ.

## Vai trò

| Báo cáo        | Code (`UserRole`) | Giá trị lưu CSDL | Khu vực giao diện |
| -------------- | ----------------- | ---------------- | ----------------- |
| Khách vãng lai | (không đăng nhập) | —                | Public            |
| Khách hàng     | `Customer`        | `customer`       | Customer          |
| Nhân viên      | `Staff`           | `staff`          | Staff             |
| Chủ spa        | `Owner`           | `owner`          | Owner             |

## Thực thể

| Báo cáo (bảng)           | Entity C#             | Bảng PostgreSQL         | Thư mục backend (`<Feature>`) | Thư mục FE (`features/`) | Tài nguyên API                                  |
| ------------------------ | --------------------- | ----------------------- | ----------------------------- | ------------------------ | ----------------------------------------------- |
| NguoiDung                | `User`                | `users`                 | `Users`                       | `auth`                   | `/users`, `/me`                                 |
| ChuSpa                   | `OwnerProfile`        | `owner_profiles`        | `Users`                       | —                        | —                                               |
| KhachHang                | `Customer`            | `customers`             | `Customers`                   | `customers`              | `/customers`                                    |
| NhanVien                 | `StaffMember`         | `staff_members`         | `Staff`                       | `staff`                  | `/staff`                                        |
| NhanVien_DichVu          | `StaffSkill`          | `staff_skills`          | `Staff`                       | `staff`                  | `/staff/{id}/services`                          |
| LichLamViec              | `WorkSchedule`        | `work_schedules`        | `Staff`                       | `staff`                  | `/work-schedules`                               |
| DichVu                   | `SpaService`          | `spa_services`          | `Services`                    | `services`               | `/services`                                     |
| GoiDichVu                | `ServicePackage`      | `service_packages`      | `ServicePackages`             | `service-packages`       | `/packages`                                     |
| GoiDichVuChiTiet         | `ServicePackageItem`  | `service_package_items` | `ServicePackages`             | `service-packages`       | (lồng trong `/packages`)                        |
| KhuyenMai                | `Promotion`           | `promotions`            | `Promotions`                  | `promotions`             | `/promotions`                                   |
| ApDungKhuyenMai          | `PromotionRedemption` | `promotion_redemptions` | `Promotions`                  | `promotions`             | —                                               |
| GioHang                  | `Cart`                | `carts`                 | `Orders`                      | `orders`                 | `/me/cart`                                      |
| ChiTietGioHang           | `CartItem`            | `cart_items`            | `Orders`                      | `orders`                 | `/me/cart/items`                                |
| DonHang                  | `Order`               | `orders`                | `Orders`                      | `orders`                 | `/orders`, `/me/orders`                         |
| ChiTietDonHang           | `OrderItem`           | `order_items`           | `Orders`                      | `orders`                 | (lồng trong order)                              |
| ThanhToan                | `Payment`             | `payments`              | `Payments`                    | `payments`               | `/me/orders/{id}/payments`, `/payments/webhook` |
| DichVuKhachHang          | `ServiceEntitlement`  | `service_entitlements`  | `Purchases`                   | `purchases`              | `/me/purchases/services`                        |
| GoiKhachHang             | `CustomerPackage`     | `customer_packages`     | `Purchases`                   | `purchases`              | `/me/purchases/packages`                        |
| LieuTrinh                | `TreatmentPlan`       | `treatment_plans`       | `Treatments`                  | `treatments`             | `/treatments`, `/me/treatments`                 |
| BuoiChamSoc              | `TreatmentSession`    | `treatment_sessions`    | `Treatments`                  | `treatments`             | `/treatments/{id}/sessions`                     |
| LichHen                  | `Appointment`         | `appointments`          | `Bookings`                    | `bookings`               | `/appointments`, `/me/appointments`             |
| HoSoDa                   | `SkinProfile`         | `skin_profiles`         | `Care`                        | `care`                   | `/appointments/{id}/skin-profile`               |
| DiUngKhachHang           | `CustomerAllergy`     | `customer_allergies`    | `Care`                        | `care`                   | `/customers/{id}/allergies`                     |
| DanhGia                  | `Review`              | `reviews`               | `Reviews`                     | `reviews`                | `/reviews`, `/me/reviews`                       |
| LichSuTroChuyenAI        | `AiChatMessage`       | `ai_chat_messages`      | `AiAssistant`                 | `ai-assistant`           | `/ai/chat`, `/me/ai/history`                    |
| ThongBao                 | `Notification`        | `notifications`         | `Notifications`               | `notifications`          | `/me/notifications`                             |
| _(đề xuất)_ MaOtp        | `OtpCode`             | `otp_codes`             | `Auth`                        | `auth`                   | `/auth/*/request-otp`                           |
| _(đề xuất)_ RefreshToken | `RefreshToken`        | `refresh_tokens`        | `Auth`                        | `auth`                   | `/auth/refresh`                                 |
| _(đề xuất)_ ThongTinSpa  | `SpaProfile`          | `spa_profiles`          | `Services`                    | `services`               | `/spa-info`                                     |

Thư mục `Orders`, `Purchases`, `Care`, `Notifications` chưa có trong skeleton; tạo khi làm tính năng đầu tiên của nhóm đó.

## Thuộc tính hay gặp

| Báo cáo                                    | Code (C# / JSON)                                           | Cột CSDL                                      |
| ------------------------------------------ | ---------------------------------------------------------- | --------------------------------------------- |
| Id, MaNguoiDung                            | `Id` / `id`                                                | `id`                                          |
| IdXxx                                      | `XxxId` / `xxxId`                                          | `xxx_id`                                      |
| HoTen                                      | `FullName`                                                 | `full_name`                                   |
| SDT                                        | `PhoneNumber`                                              | `phone_number`                                |
| MatKhauHash                                | `PasswordHash`                                             | `password_hash`                               |
| AnhDaiDien, HinhAnh                        | `AvatarUrl`, `ImageUrl`                                    | `avatar_url`, `image_url`                     |
| TrangThai                                  | `Status`                                                   | `status`                                      |
| NgayTao / NgayCapNhat                      | `CreatedAtUtc` / `UpdatedAtUtc` (từ `BaseAuditableEntity`) | `created_at_utc` / `updated_at_utc`           |
| NgayHen, Ngay                              | `Date` (`DateOnly`, giờ VN)                                | `date`                                        |
| GioBatDau / GioKetThuc                     | `StartTime` / `EndTime` (`TimeOnly`, giờ VN)               | `start_time` / `end_time`                     |
| GiuChoDen                                  | `HoldExpiresAtUtc`                                         | `hold_expires_at_utc`                         |
| HuyLuc / LyDoHuy                           | `CancelledAtUtc` / `CancellationReason`                    | `cancelled_at_utc` / `cancellation_reason`    |
| ThoiLuongPhut                              | `DurationMinutes`                                          | `duration_minutes`                            |
| Gia, DonGia                                | `Price`, `UnitPrice`                                       | `price`, `unit_price`                         |
| ThoiHanNgay                                | `ValidityDays`                                             | `validity_days`                               |
| SoBuoi / ThuTu (chi tiết gói)              | `SessionCount` / `SortOrder`                               | `session_count` / `sort_order`                |
| ThuTu (buổi chăm sóc)                      | `SequenceNumber`                                           | `sequence_number`                             |
| KhoangCachNgayToiThieu                     | `MinDaysBetweenSessions`                                   | `min_days_between_sessions`                   |
| TongSoBuoi / SoBuoiDaDung                  | `TotalSessions` / `UsedSessions`                           | `total_sessions` / `used_sessions`            |
| TongTienHang / TongGiamGia / TongThanhToan | `Subtotal` / `DiscountTotal` / `GrandTotal`                | `subtotal` / `discount_total` / `grand_total` |
| HetHanThanhToanLuc                         | `PaymentDueAtUtc`                                          | `payment_due_at_utc`                          |
| MaDonHang, MaCode                          | `Code`                                                     | `code`                                        |
| SoSao / NoiDungDanhGia                     | `Rating` / `Comment`                                       | `rating` / `comment`                          |
| PhanHoiTuSpa / PhanHoiLuc                  | `OwnerReply` / `RepliedAtUtc`                              | `owner_reply` / `replied_at_utc`              |
| DocLuc                                     | `ReadAtUtc`                                                | `read_at_utc`                                 |

## Trạng thái (enum)

C# dùng PascalCase; CSDL và JSON lưu chuỗi `snake_case`.

| Enum                           | Báo cáo → Code                                                                                                                                                                |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `UserStatus`                   | HoatDong → `Active`, BiKhoa → `Locked`, NgungHoatDong → `Inactive`                                                                                                            |
| `CatalogStatus` (dịch vụ, gói) | DangBan → `OnSale`, NgungBan → `Discontinued`                                                                                                                                 |
| `WorkScheduleStatus`           | HoatDong → `Active`, DaHuy → `Cancelled`                                                                                                                                      |
| `PromotionStatus`              | HoatDong → `Active`, NgungApDung → `Stopped`                                                                                                                                  |
| `DiscountType`                 | PhanTram → `Percentage`, SoTien → `FixedAmount`                                                                                                                               |
| `OrderStatus`                  | ChoThanhToan → `PendingPayment`, DaThanhToan → `Paid`, DaHuy → `Cancelled`, HetHan → `Expired`                                                                                |
| `PaymentStatus`                | DangCho → `Pending`, ThanhCong → `Succeeded`, ThatBai → `Failed`, HetHan → `Expired`                                                                                          |
| `EntitlementStatus`            | ChuaSuDung → `Available`, DaDatLich → `Booked`, DaSuDung → `Used`, HetHan → `Expired`                                                                                         |
| `CustomerPackageStatus`        | DangSuDung → `Active`, HoanThanh → `Completed`, HetHan → `Expired`, DaHuy → `Cancelled`                                                                                       |
| `TreatmentPlanStatus`          | ChuaBatDau → `NotStarted`, DangThucHien → `InProgress`, HoanThanh → `Completed`, TamDung → `Paused`, DaHuy → `Cancelled`                                                      |
| `TreatmentSessionStatus`       | ChuaDat → `NotBooked`, DaDatLich → `Booked`, HoanThanh → `Completed`, BoQua → `Skipped`                                                                                       |
| `AppointmentStatus`            | GiuCho → `Held`, ChoXacNhan → `PendingConfirmation`, DaXacNhan → `Confirmed`, HoanThanh → `Completed`, DaHuy → `Cancelled`, KhongDen → `NoShow`, HetHanGiuCho → `HoldExpired` |
| `SkinType`                     | Thuong → `Normal`, Kho → `Dry`, Dau → `Oily`, HonHop → `Combination`, NhayCam → `Sensitive`                                                                                   |
| `AllergySeverity`              | Nhe → `Mild`, TrungBinh → `Moderate`, Nang → `Severe`                                                                                                                         |
| `ReviewStatus`                 | HienThi → `Visible`, An → `Hidden`                                                                                                                                            |
| `NotificationType`             | LichHen → `Appointment`, ThanhToan → `Payment`, LieuTrinh → `Treatment`, KhuyenMai → `Promotion`, HeThong → `System`                                                          |

## Thuật ngữ nghiệp vụ

| Tiếng Việt                          | Code                  | Ghi chú                                                          |
| ----------------------------------- | --------------------- | ---------------------------------------------------------------- |
| Đặt ngay (luồng 1)                  | `BookNow`             | Giữ chỗ + tạo đơn, xác nhận khi thanh toán thành công            |
| Đặt từ dịch vụ/gói đã mua (luồng 2) | `BookFromEntitlement` | Dùng `ServiceEntitlement` hoặc `TreatmentSession`                |
| Quyền sử dụng                       | Entitlement           | Gồm `ServiceEntitlement` (dịch vụ lẻ) và `CustomerPackage` (gói) |
| Giữ chỗ                             | Hold                  | Trạng thái `Held` + `HoldExpiresAtUtc`                           |
| Giờ trống                           | Availability          | Kết quả thuật toán, không lưu bảng                               |
| Ca làm                              | Work schedule / shift | Một dòng `WorkSchedule`                                          |
| Khách không đến                     | No-show               |                                                                  |

# ADR-0003: Lịch hẹn lưu ngày + giờ địa phương, chống trùng bằng ràng buộc EXCLUDE

- **Trạng thái:** Chấp nhận
- **Ngày:** 25/10/2026

## Bối cảnh

Báo cáo thiết kế `LichHen` và `LichLamViec` bằng `NgayHen`/`Ngay` (DATE) + `GioBatDau`/`GioKetThuc` (TIME). Quy ước chung của repo là lưu thời điểm ở UTC. Báo cáo cũng cam kết chống trùng lịch bằng "giao dịch và ràng buộc ở tầng cơ sở dữ liệu".

## Quyết định

1. `Appointment` và `WorkSchedule` dùng `DateOnly Date` + `TimeOnly StartTime` + `TimeOnly EndTime`, **hiểu theo giờ `Asia/Ho_Chi_Minh`**. Đây là ngoại lệ có chủ đích của quy ước UTC, vì lịch spa gắn với giờ mở cửa tại chỗ.
2. Mọi thời điểm khác (tạo, cập nhật, thanh toán, hết hạn giữ chỗ, đọc thông báo) dùng `DateTime` UTC, tên kết thúc bằng `AtUtc`.
3. Chống trùng lịch nhân viên bằng hai lớp:
   - kiểm tra trong giao dịch trước khi ghi;
   - ràng buộc PostgreSQL (cần extension `btree_gist`):

   ```sql
   ALTER TABLE appointments ADD CONSTRAINT ex_appointments_staff_no_overlap
   EXCLUDE USING gist (
     staff_id WITH =,
     tsrange(date + start_time, date + end_time, '[)') WITH &&
   ) WHERE (status IN ('held', 'pending_confirmation', 'confirmed'));
   ```

   Vi phạm ràng buộc (SQLSTATE `23P01`) được Infrastructure chuyển thành `ConflictException` với mã `slot_unavailable`.

4. Ràng buộc không dùng được `now()`, nên lịch `held` quá hạn phải được job nền chuyển sang `hold_expired` (chạy mỗi phút) để giải phóng khung giờ.

## Hệ quả

- Kiểm thử chống trùng cần PostgreSQL thật (Testcontainers), không dùng provider in-memory.
- API trả `date` dạng `yyyy-MM-dd` và `startTime` dạng `HH:mm`, không kèm múi giờ.

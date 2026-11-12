# care

Chăm sóc khách của nhân viên (UC-SPA-25, 27, 28), đặc tả: `docs/specs/care.md` mục "Giao diện (web)".

- `StaffAppointmentsView` (SCR-W26, `/staff/bookings`): lịch được phân công theo tab Hôm nay / Sắp tới / Đã xong (`assignedRange.ts`), khoảng ngày và trạng thái trên URL (`useAssignedFilters`), kiểm tra khoảng ≤ 42 ngày trước khi gọi API.
- `StaffAppointmentDetailView` (SCR-W27, `/staff/bookings/:appointmentId`): dị ứng nổi bật, tab Khách & dị ứng (thêm/sửa/xóa dị ứng), Hồ sơ da (lập/sửa), Kết quả buổi, hộp thoại xác nhận hoàn thành.
- API: `CareApi` / `careQueryKeys` (`@spa/api-client`) → `lib/api/care.ts` → `hooks/` → components. Lỗi xử lý theo mã trong `errors.ts` (`careErrorKind`).
- Nút ghi chỉ dựa vào `status` từ server; điều kiện thời gian (chưa tới giờ, quá hạn sửa) do server trả mã lỗi.

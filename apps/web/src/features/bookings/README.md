# bookings

Đặt lịch hẹn và lịch hẹn của tôi (UC-SPA-15, UC-SPA-16) cho khách hàng trên web, cộng "Giờ trống gần nhất" ở trang dịch vụ, và quản lý lịch hẹn của chủ spa (UC-SPA-17).

- **Khách hàng:**
  - `components/BookingView` (`/booking/new`), `BookingSuccessView` (`/booking/success`), `MyAppointmentsView` (`/my-bookings`), `AppointmentDetailView` (`/my-bookings/:bookingId`), `RescheduleDialog`, `CancelAppointmentDialog`, `BookServiceButton`.
  - `components/DateStrip` và `StaffSlotPicker` là phần chọn ngày và giờ dùng chung giữa trang đặt lịch và hộp thoại đổi lịch (thuần trình bày, không gọi API).
  - `hooks/`: `useAvailability`, `useBookingSource` (gom nguồn đặt lịch thành `ResolvedSource`), `useMyAppointments`, `useMyAppointment`, `useBookNow`, `useBookAppointment`, `useRescheduleAppointment`, `useCancelAppointment`.
  - `bookingParams.ts` (đọc và dựng query `/booking/new`), `errors.ts` (`bookingErrorKind`), `slots.ts`, `appointmentStatus.ts`, `schemas.ts`.

- **Chủ spa (UC-SPA-17):**
  - `components/owner/`:
    - `OwnerAppointmentsView`: View điều phối chính với Tabs Danh sách (`list`) và Lịch ngày (`day`).
    - `OwnerAppointmentFilters`: Bộ lọc khoảng ngày / ngày, nhân viên, trạng thái, tìm kiếm tên/SĐT khách hàng.
    - `OwnerAppointmentsTable`: Bảng `DataTable` danh sách lịch hẹn kèm thao tác dòng.
    - `DayCalendar`, `DayCalendarCard`, `dayGrid.ts`: Lưới lịch ngày dạng CSS Grid theo nhân viên, kéo thả `@dnd-kit/core` để đổi giờ (trong cột) hoặc đổi nhân viên (sang cột khác), vạch giờ hiện tại `now-line`, danh sách lịch đã hủy `Collapsible`.
    - `OwnerAppointmentSheet`: `Sheet` chi tiết lịch hẹn kèm dị ứng nổi bật, liên kết liệu trình, trạng thái hồ sơ da, và các nút thao tác.
    - 5 hộp thoại thao tác: `ConfirmAppointmentDialog`, `OwnerRescheduleDialog`, `AssignStaffDialog`, `OwnerCancelDialog`, `NoShowDialog`, cộng hộp thoại xác nhận kéo thả `DropConfirmDialog`.
  - `hooks/owner/`: `useOwnerAppointments`, `useOwnerAppointment`, `useConfirmAppointment`, `useOwnerReschedule`, `useAssignAppointmentStaff`, `useOwnerCancelAppointment`, `useMarkNoShow`, `useWorkingStaff`.

Quy tắc đặt lịch (giờ trống, đổi hoặc hủy trước 24 giờ, thứ tự buổi, phân quyền chủ spa) do backend quyết định; web chỉ hiển thị cờ và thông điệp lỗi. Ngày giờ lịch hẹn là giờ Việt Nam (ADR-0003). Spec: `docs/specs/bookings.md`, `docs/specs/purchases-treatments.md`.

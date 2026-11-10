# bookings

Đặt lịch hẹn và lịch hẹn của tôi (UC-SPA-15, UC-SPA-16) cho khách hàng trên web, cộng "Giờ trống gần nhất" ở trang dịch vụ.

- `components/BookingView` (`/booking/new`), `BookingSuccessView` (`/booking/success`), `MyAppointmentsView` (`/my-bookings`), `AppointmentDetailView` (`/my-bookings/:bookingId`), `RescheduleDialog`, `CancelAppointmentDialog`, `BookServiceButton`.
- `components/DateStrip` và `StaffSlotPicker` là phần chọn ngày và giờ dùng chung giữa trang đặt lịch và hộp thoại đổi lịch (thuần trình bày, không gọi API).
- `hooks/`: `useAvailability`, `useBookingSource` (gom nguồn đặt lịch thành `ResolvedSource`), `useMyAppointments`, `useMyAppointment`, `useBookNow`, `useBookAppointment`, `useRescheduleAppointment`, `useCancelAppointment`.
- `bookingParams.ts` (đọc và dựng query `/booking/new`), `errors.ts` (`bookingErrorKind`), `slots.ts`, `appointmentStatus.ts`, `schemas.ts`.

Quy tắc đặt lịch (giờ trống, đổi hoặc hủy trước 24 giờ, thứ tự buổi) do backend quyết định; web chỉ hiển thị cờ và thông điệp lỗi. Ngày giờ lịch hẹn là giờ Việt Nam (ADR-0003). Spec: `docs/specs/bookings.md`, `docs/specs/purchases-treatments.md`.

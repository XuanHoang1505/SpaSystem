/**
 * Quy định đặt lịch/thanh toán hiển thị trong "Câu hỏi thường gặp". Chưa có API trả các giá trị này, nên giữ ở đây và
 * cập nhật cùng `backend/src/API/appsettings.json` khi đổi:
 * - `Booking:CustomerChangeCutoffHours` (Q-04);
 * - `Order:PaymentTimeoutMinutes` (hạn thanh toán khi "Đặt ngay"; `OrderExpiry:GraceMinutes` chỉ nhận kết quả trễ,
 *   khách không trả tiền thêm được trong khoảng đó, Q-03).
 */
export const catalogPolicies = {
  customerChangeCutoffHours: 24,
  paymentTimeoutMinutes: 15,
  /** `Booking:MaxDaysAhead`: ngày xa nhất được đặt lịch. */
  maxBookingDaysAhead: 60,
  /** `Booking:SlotStepMinutes`. */
  slotStepMinutes: 30,
  /** `Booking:MaxQueryRangeDays`: widest date range of the owner's appointment list (UC-SPA-17). */
  maxAppointmentQueryRangeDays: 42,
  /** `Booking:NoShowConsumesEntitlement`: false gives the right or session back on a no-show. */
  noShowConsumesEntitlement: false,
  /** Default hours of the owner's day calendar; it widens to fit appointments outside them. */
  dayGridStartTime: '08:00',
  dayGridEndTime: '20:00',
} as const;

/** Thông tin liên hệ hiển thị cho khách. Số điện thoại là số mẫu của Stitch: thay số thật trước khi dùng. */
export const siteContact = {
  hotline: '1900 6886',
} as const;

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
} as const;

/** Thông tin liên hệ hiển thị cho khách. Số điện thoại là số mẫu của Stitch: thay số thật trước khi dùng. */
export const siteContact = {
  hotline: '1900 6886',
} as const;

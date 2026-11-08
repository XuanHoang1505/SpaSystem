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
} as const;

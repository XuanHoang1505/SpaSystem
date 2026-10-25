# Câu hỏi nghiệp vụ chờ chốt

Mỗi câu có **giá trị mặc định** để code không bị chặn. Code dùng mặc định phải đọc giá trị từ cấu hình (`appsettings` hoặc bảng cấu hình), không viết cứng, để đổi được khi có kết quả chốt. Mã `RS-xx` tham chiếu sheet `26_Ra_soat_DA` của file Excel tổng hợp.

| Mã   | Câu hỏi                                                                                            | Mặc định đang dùng                              | Ảnh hưởng                                        | Trạng thái |
| ---- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------ | ---------- |
| Q-01 | Khách vãng lai có được chat với trợ lý AI không? Bảng lịch sử chat bắt buộc có khách hàng. (RS-11) | Được chat nhưng không lưu lịch sử               | UC-SPA-32, `ai_chat_messages`                    | Chờ chốt   |
| Q-02 | Lịch đặt từ dịch vụ/gói đã mua (luồng 2) tự xác nhận hay chờ chủ spa xác nhận? (RS-12)             | Tự xác nhận (`confirmed`)                       | UC-SPA-15, 17; trạng thái `pending_confirmation` | Chờ chốt   |
| Q-03 | Thời gian giữ chỗ khi đặt ngay và hạn thanh toán đơn                                               | 15 phút                                         | UC-SPA-11, 15                                    | Chờ chốt   |
| Q-04 | Khách được đổi/hủy lịch trước giờ hẹn bao lâu? (RS-16)                                             | 24 giờ                                          | UC-SPA-16                                        | Chờ chốt   |
| Q-05 | "Hoàn thành đủ số buổi theo quy định" để đánh giá gói là bao nhiêu? (RS-15)                        | ≥ 1 buổi hoàn thành; 1 đánh giá/sản phẩm/khách  | UC-SPA-30                                        | Chờ chốt   |
| Q-06 | Dịch vụ lẻ đã mua có hạn dùng không?                                                               | Không giới hạn (`expires_at` null)              | UC-SPA-18                                        | Chờ chốt   |
| Q-07 | Khách không đến có bị trừ lượt/buổi không?                                                         | Không trừ                                       | UC-SPA-17                                        | Chờ chốt   |
| Q-08 | Dùng cổng thanh toán nào?                                                                          | Chưa chọn; code qua interface `IPaymentGateway` | UC-SPA-11                                        | Chờ chốt   |
| Q-09 | Giao diện web dùng Tailwind CSS (theo báo cáo) hay CSS Modules (đang có trong repo)? (RS-02)       | CSS Modules                                     | `apps/web`                                       | Chờ chốt   |
| Q-10 | Gói được kích hoạt khi thanh toán hay khi đặt buổi đầu?                                            | Khi thanh toán                                  | `customer_packages.activated_at_utc`             | Chờ chốt   |
| Q-11 | Bước chia khung giờ khi tìm giờ trống                                                              | 15 phút                                         | Thuật toán giờ trống                             | Chờ chốt   |

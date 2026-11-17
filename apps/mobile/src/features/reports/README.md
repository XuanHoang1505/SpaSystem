# Reports Feature (Mobile)

Module báo cáo và thống kê doanh thu cho ứng dụng di động dành cho Chủ spa (`SCR-M32`, `UC-SPA-33`).

## Tính năng
- **RevenueFilterBar:** Bộ lọc linh hoạt hỗ trợ presets thời gian nhanh (Năm nay, Quý này, Tháng này, 30 ngày qua, Năm trước), chọn ngày tùy chỉnh qua DatePicker, nhóm theo kỳ (`month`, `quarter`, `year`) và phân loại sản phẩm (`all`, `service`, `package`).
- **RevenueKpiCards:** 4 thẻ chỉ số KPI tổng quan (Tổng doanh thu, Doanh thu dịch vụ lẻ, Doanh thu gói liệu trình, Tổng số đơn thành công).
- **RevenueBarChart:** Biểu đồ cột trực quan, tính tỷ lệ động, phân tách doanh thu dịch vụ và gói theo màu sắc, hỗ trợ cuộn ngang và chạm xem chi tiết từng kỳ.
- **TopProductsCard:** Bảng xếp hạng top sản phẩm đóng góp doanh thu cao nhất kèm huy hiệu thứ hạng và thanh tiến trình tỷ trọng %.
- **UnrecognizedPaymentsAlert:** Hộp cảnh báo khi phát sinh thanh toán thành công chưa ghi nhận (đơn hủy, thanh toán thừa) cần rà soát hoàn tiền thủ công.
- **OwnerReportsScreen:** Màn hình chính tích hợp pull-to-refresh và skeleton loading.

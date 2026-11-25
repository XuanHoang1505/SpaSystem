# Reports Feature (Mobile)

Module báo cáo và thống kê doanh thu cho ứng dụng di động dành cho Chủ spa (`SCR-M32`, `UC-SPA-33`).

## Tính năng

- **RevenueFilterSheet:** Một dòng tóm tắt bộ lọc (khoảng thời gian, nhóm theo, loại sản phẩm); chạm vào mở bottom sheet chứa `RevenueFilterBar`.
- **RevenueFilterBar:** Nội dung bộ lọc trong sheet, hỗ trợ presets thời gian nhanh (Năm nay, Quý này, Tháng này, 30 ngày qua, Năm trước), chọn ngày tùy chỉnh qua DatePicker, nhóm theo kỳ (`month`, `quarter`, `year`) và phân loại sản phẩm (`all`, `service`, `package`).
- **RevenueKpiCards:** 4 thẻ chỉ số KPI tổng quan (Tổng doanh thu, Doanh thu dịch vụ lẻ, Doanh thu gói liệu trình, Tổng số đơn thành công).
- **RevenueBarChart:** Biểu đồ cột trực quan, tính tỷ lệ động, phân tách doanh thu dịch vụ và gói theo màu sắc, hỗ trợ cuộn ngang và chạm xem chi tiết từng kỳ.
- **TopProductsCard:** Bảng xếp hạng top sản phẩm đóng góp doanh thu cao nhất kèm huy hiệu thứ hạng và thanh tiến trình tỷ trọng %.
- **OwnerReportsScreen:** Màn hình chính (không lặp lại tiêu đề của thanh điều hướng), tích hợp pull-to-refresh và skeleton loading. Không hiện cảnh báo thanh toán chưa ghi nhận (API vẫn trả `unrecognizedPayments`).

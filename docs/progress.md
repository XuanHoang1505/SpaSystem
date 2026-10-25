# Tiến độ triển khai

Trạng thái thực tế của từng use case trong code. Cập nhật trong cùng thay đổi với code (xem Definition of Done ở [conventions/workflow.md](conventions/workflow.md)). Danh sách và ưu tiên lấy từ sheet `04_Checklist_UC`.

Ký hiệu: `—` chưa làm · `🟡` đang làm · `✅` xong · `n/a` không áp dụng.

**Hiện trạng (25/10/2026):** có foundation (`/api/v1/system/ping`, `/health/*`, layout và route placeholder) và **nền persistence**: 29 entity, 19 enum, `AppDbContext`, migration `InitialCreate` đã áp lên PostgreSQL (ràng buộc chống trùng lịch đã kiểm chứng), `IUnitOfWork`, `IRepository<T>`. Chưa có xác thực và service nghiệp vụ, nên mọi UC vẫn `—`.

| Mã        | Use case                                              | Nhóm                     | Ưu tiên | Sprint | BE  | Web | Mobile | Test | Ghi chú |
| --------- | ----------------------------------------------------- | ------------------------ | ------- | ------ | --- | --- | ------ | ---- | ------- |
| UC-SPA-01 | Đăng ký tài khoản                                     | Auth/Users               | P0      | 1      | —   | —   | —      | —    |         |
| UC-SPA-02 | Đăng nhập                                             | Auth/Users               | P0      | 1      | —   | —   | —      | —    |         |
| UC-SPA-03 | Quên mật khẩu                                         | Auth/Users               | P1      | 1      | —   | —   | —      | —    |         |
| UC-SPA-04 | Cập nhật thông tin tài khoản                          | Auth/Users               | P1      | 1      | —   | —   | —      | —    |         |
| UC-SPA-05 | Quản lý tài khoản người dùng                          | Auth/Users               | P1      | 2      | —   | —   | n/a    | —    |         |
| UC-SPA-06 | Tìm kiếm dịch vụ và gói dịch vụ                       | Services/ServicePackages | P0      | 1      | —   | —   | —      | —    |         |
| UC-SPA-07 | Xem chi tiết dịch vụ, gói dịch vụ                     | Services/ServicePackages | P0      | 1      | —   | —   | —      | —    |         |
| UC-SPA-08 | Xem thông tin giới thiệu về spa                       | Services/ServicePackages | P2      | 1      | —   | —   | —      | —    |         |
| UC-SPA-09 | Quản lý dịch vụ và gói dịch vụ                        | Services/ServicePackages | P0      | 1      | —   | —   | n/a    | —    |         |
| UC-SPA-10 | Quản lý giỏ hàng                                      | Orders/Payments          | P1      | 2      | —   | —   | —      | —    |         |
| UC-SPA-11 | Thanh toán trực tuyến                                 | Orders/Payments          | P0      | 2      | —   | —   | —      | —    |         |
| UC-SPA-12 | Quản lý đơn hàng đã mua                               | Orders/Payments          | P1      | 2      | —   | —   | —      | —    |         |
| UC-SPA-13 | Quản lý đơn hàng                                      | Orders/Payments          | P1      | 2      | —   | —   | n/a    | —    |         |
| UC-SPA-14 | Quản lý chương trình khuyến mãi                       | Promotions               | P1      | 2      | —   | —   | n/a    | —    |         |
| UC-SPA-15 | Đặt lịch hẹn                                          | Bookings                 | P0      | 1      | —   | —   | —      | —    |         |
| UC-SPA-16 | Xem và quản lý lịch hẹn                               | Bookings                 | P1      | 2      | —   | —   | —      | —    |         |
| UC-SPA-17 | Quản lý lịch hẹn                                      | Bookings                 | P0      | 1      | —   | —   | —      | —    |         |
| UC-SPA-18 | Xem dịch vụ và gói đã mua                             | Purchases/Treatments     | P0      | 2      | —   | —   | —      | —    |         |
| UC-SPA-19 | Theo dõi liệu trình chăm sóc da                       | Purchases/Treatments     | P0      | 2      | —   | —   | —      | —    |         |
| UC-SPA-20 | Xem lịch sử sử dụng dịch vụ                           | Purchases/Treatments     | P1      | 2      | —   | —   | —      | —    |         |
| UC-SPA-21 | Quản lý liệu trình và lịch sử chăm sóc của khách hàng | Purchases/Treatments     | P0      | 2      | —   | —   | —      | —    |         |
| UC-SPA-22 | Quản lý nhân viên                                     | Staff                    | P0      | 1      | —   | —   | n/a    | —    |         |
| UC-SPA-23 | Phân công lịch làm việc cho nhân viên                 | Staff                    | P0      | 1      | —   | —   | n/a    | —    |         |
| UC-SPA-24 | Xem lịch làm việc cá nhân                             | Staff                    | P1      | 2      | —   | —   | —      | —    |         |
| UC-SPA-25 | Xem danh sách lịch hẹn được phân công                 | Staff                    | P0      | 2      | —   | —   | —      | —    |         |
| UC-SPA-26 | Xem lịch sử các khách hàng đã chăm sóc                | Care                     | P1      | 2      | —   | —   | —      | —    |         |
| UC-SPA-27 | Lập và cập nhật hồ sơ da khách hàng                   | Care                     | P0      | 2      | —   | —   | —      | —    |         |
| UC-SPA-28 | Xác nhận hoàn thành buổi chăm sóc                     | Care                     | P0      | 2      | —   | —   | —      | —    |         |
| UC-SPA-29 | Xem đánh giá dịch vụ                                  | Reviews                  | P1      | 1      | —   | —   | —      | —    |         |
| UC-SPA-30 | Đánh giá dịch vụ                                      | Reviews                  | P1      | 2      | —   | —   | —      | —    |         |
| UC-SPA-31 | Quản lý đánh giá dịch vụ                              | Reviews                  | P2      | 3      | —   | —   | n/a    | —    |         |
| UC-SPA-32 | Trò chuyện với trợ lý AI tư vấn dịch vụ               | AiAssistant              | P1      | 3      | —   | —   | —      | —    |         |
| UC-SPA-33 | Xem thống kê báo cáo doanh thu                        | Reports                  | P0      | 3      | —   | —   | —      | —    |         |
| UC-SPA-34 | Xem thông báo                                         | Notifications            | P2      | 3      | —   | —   | —      | —    |         |

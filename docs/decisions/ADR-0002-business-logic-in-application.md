# ADR-0002: Nghiệp vụ nằm ở Application, Infrastructure chỉ chứa adapter

- **Trạng thái:** Chấp nhận
- **Ngày:** 25/10/2026

## Bối cảnh

Skeleton có cùng lúc `Application/UseCases/`, `Application/Interfaces/Services/<Feature>/` và `Infrastructure/Services/<Feature>/` (đều chỉ có `.gitkeep`). Nếu không chốt, logic nghiệp vụ có thể bị đặt rải ở cả hai tầng. Application không được tham chiếu EF Core (xem [architecture.md](../architecture.md)), nên không thể dùng `DbContext` trực tiếp trong Application.

## Quyết định

1. **Logic nghiệp vụ** (kiểm tra quy tắc, chuyển trạng thái, tính tiền, thuật toán giờ trống) nằm trong `Application/UseCases/<Feature>/`, là lớp hiện thực interface ở `Application/Interfaces/Services/<Feature>/`.
2. **Truy cập dữ liệu** qua interface repository ở `Application/Interfaces/Repositories/` và `IUnitOfWork` ở `Application/Interfaces/Persistence/`; hiện thực bằng EF Core trong `Infrastructure/Repositories/` và `Infrastructure/Persistence/`.
3. **Adapter hệ thống ngoài** (cổng thanh toán, email/OTP, AI, phát JWT, lưu file) có interface ở `Application/Interfaces/<Payments|Ai|Authentication|…>/`, hiện thực ở `Infrastructure/<Payments|Ai|Authentication|Notifications>/`.
4. `Infrastructure/Services/<Feature>/` chỉ dùng cho truy vấn đọc thuần cần EF Core mà không có quy tắc nghiệp vụ (ví dụ báo cáo doanh thu tổng hợp nhiều bảng). Không đặt logic ghi dữ liệu ở đây.
5. Tác vụ nền (hết hạn giữ chỗ, nhắc lịch) ở `Infrastructure/BackgroundJobs/`, gọi lại service của Application chứ không tự chứa quy tắc.

## Hệ quả

- Unit test nghiệp vụ chạy ở `Application.Tests` với repository giả (NSubstitute), không cần CSDL.
- Các thư mục `Infrastructure/Services/<Feature>/` của tính năng không có truy vấn đọc đặc thù sẽ để trống; không cần xóa.

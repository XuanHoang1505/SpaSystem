# ADR-0004: Ánh xạ DTO thủ công, không phụ thuộc AutoMapper

- **Trạng thái:** Chấp nhận
- **Ngày:** 25/10/2026

## Bối cảnh

Foundation đã đăng ký AutoMapper 15.1.3 (bản vá CVE). Dòng 15 yêu cầu giấy phép qua `AUTOMAPPER_LICENSE_KEY`; repo không chứa key. Ánh xạ bằng cấu hình cũng che mất lỗi đổi tên thuộc tính đến lúc chạy.

## Quyết định

Ánh xạ entity ↔ DTO bằng phương thức mở rộng viết tay trong `Application/Mapping/<Feature>Mappings.cs`, ví dụ `appointment.ToDto()`. Không tạo `Profile` AutoMapper mới. Giữ đăng ký AutoMapper hiện có cho đến khi có quyết định gỡ bỏ.

## Hệ quả

- Lỗi ánh xạ lộ ra lúc biên dịch.
- Muốn dùng lại AutoMapper phải có giấy phép hợp lệ và một ADR thay thế.

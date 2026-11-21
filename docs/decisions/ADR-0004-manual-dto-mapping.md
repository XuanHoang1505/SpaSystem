# ADR-0004: Ánh xạ DTO thủ công, không phụ thuộc AutoMapper

- **Trạng thái:** Chấp nhận
- **Ngày:** 25/10/2026

## Bối cảnh

Foundation đã đăng ký AutoMapper 15.1.3 (bản vá CVE). Dòng 15 yêu cầu giấy phép qua `AUTOMAPPER_LICENSE_KEY`; repo không chứa key. Ánh xạ bằng cấu hình cũng che mất lỗi đổi tên thuộc tính đến lúc chạy.

## Quyết định

Ánh xạ entity ↔ DTO bằng phương thức mở rộng viết tay trong `Application/Mapping/<Feature>Mappings.cs`, ví dụ `appointment.ToDto()`. Không tạo `Profile` AutoMapper mới.

**Cập nhật 17/11/2026:** đã gỡ hẳn gói AutoMapper (và đăng ký `AddAutoMapper`). Gói không được dùng ở đâu, và NuGet audit báo bản 15.1.3 có lỗ hổng mức cao (GHSA-6vhm-j9h7-f9gh, GHSA-gpwp-5797-mjff), làm build thất bại vì cảnh báo được coi là lỗi.

## Hệ quả

- Lỗi ánh xạ lộ ra lúc biên dịch.
- Muốn dùng lại AutoMapper phải có giấy phép hợp lệ và một ADR thay thế.

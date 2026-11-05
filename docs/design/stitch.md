# Google Stitch: thiết kế mẫu màn hình

Stitch (stitch.withgoogle.com) dùng để **phác bố cục màn hình** trước khi code. Code mới là nguồn chuẩn của style (ADR-0005). Mọi màu, font, bo góc lấy từ `apps/web/src/styles/theme.css`, được chép sang [DESIGN.md](DESIGN.md) và design system trên Stitch.

## Kết nối

MCP server `stitch` được đăng ký ở phạm vi user của Claude Code (`claude mcp add --transport http --scope user stitch https://stitch.googleapis.com/mcp --header "X-Goog-Api-Key: <key>"`). API key chỉ lưu trên máy, **không đưa vào repo**. Gói danh sách tool khá lớn, nên cần đặt `MCP_TIMEOUT=60000` trong `env` của `~/.claude/settings.json`.

## Project và design system

| Nền tảng       | Project Stitch   | `projectId`           | Design system (`assets/…`)         |
| -------------- | ---------------- | --------------------- | ---------------------------------- |
| Web (desktop)  | "Spa system web" | `9696885610900739659` | `5c4461352cf44c2fbbfc6903e3ecadcd` |
| Mobile (390px) | "Spa system"     | `5997625254366310961` | `5692d0c6857f4fd1bca2991f232d428d` |

Design system của cả hai project đã được cập nhật theo `DESIGN.md` ngày 05/11/2026 và áp lại lên các màn có sẵn. Stitch không có font Lora, nên tiêu đề hiển thị bằng Literata; trong code vẫn dùng Lora.

**Khi đổi token** trong `theme.css`: sửa `DESIGN.md`, gọi `update_design_system` cho từng project, rồi `apply_design_system` lên các màn cần dùng.

## Màn đã có (tham chiếu bố cục)

Tra theo tên bằng `list_screens` / `get_project`, vì ID thay đổi mỗi lần áp lại design system. Web có: Trang chủ, Giới thiệu, Danh sách dịch vụ, Chi tiết dịch vụ, Chi tiết gói, Đặt lịch hẹn, Thanh toán, Tài khoản khách hàng (lịch hẹn), Tiến độ liệu trình, Trợ lý tư vấn, Đăng nhập, Đăng ký, Khôi phục mật khẩu, và phần quản trị: dịch vụ, nhân viên, thêm nhân viên, phân quyền dịch vụ và lịch trực, lịch hẹn, báo cáo. Mobile có: Trang chủ, Danh sách dịch vụ, Chi tiết gói, Đặt lịch (3 bước), Thanh toán và giữ chỗ, Lịch hẹn của tôi, Tiến trình liệu trình, Trợ lý AI, Nhân viên – buổi chăm sóc, Chủ spa – quản lý lịch hẹn.

## Quy tắc dùng

- Màn Stitch **chỉ là tham chiếu bố cục và phân cấp thông tin**. Không chép HTML, class hay mã màu vào repo. Dựng lại bằng `components/ui` + `components/shared` + token.
- **Nội dung lấy từ spec, không lấy từ Stitch.** Stitch hay tự thêm những thứ hệ thống không có, ví dụ: "bệnh án", "Bộ Y Tế", "bác sĩ", HIPAA, đăng nhập Google/Apple, đăng nhập bằng OTP, voucher. Spa không phải cơ sở y khoa, và trợ lý AI không chẩn đoán bệnh. Gặp những thứ này thì bỏ đi, hoặc sửa màn bằng `edit_screens`.
- Ảnh chụp màn: lấy `screenshot.downloadUrl` từ `get_screen`, tải bằng header `X-Goog-Api-Key`. Kết quả là JSON có trường `dataString` (PNG dạng base64), cần giải mã. Lưu ảnh tạm vào scratchpad, không commit.
- `generate_screen_from_text` / `generate_variants` mất vài phút và tốn quota. Không gọi lại khi bị timeout: dùng `get_screen` hoặc `list_screens` để kiểm tra kết quả.

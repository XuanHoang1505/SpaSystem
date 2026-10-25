# ADR-0001: Định danh trong mã nguồn dùng tiếng Anh

- **Trạng thái:** Chấp nhận
- **Ngày:** 25/10/2026

## Bối cảnh

Báo cáo ĐATN (`126_DA_NTTT_NguyenXuanHoang_2214_v1.docx`) đặt tên bảng và thuộc tính bằng tiếng Việt không dấu: `NguoiDung`, `LichHen`, `GoiKhachHang`, `NgayHen`, `GioBatDau`… Skeleton SpaSystem đã đặt thư mục nghiệp vụ bằng tiếng Anh (`Bookings`, `ServicePackages`, `Treatments`), dự án tham khảo FIXY cũng dùng tiếng Anh.

Trộn hai ngôn ngữ trong code (ví dụ `LichHenService.GetByNgayHen`) làm khó đọc, khó tìm kiếm và dễ sai chính tả không dấu.

## Quyết định

1. Mọi định danh trong mã nguồn dùng **tiếng Anh**: entity, enum, cột CSDL, DTO, route API, trường JSON, biến, file, thư mục.
2. Bảng và cột PostgreSQL dùng `snake_case` tiếng Anh (`appointments.start_time`).
3. Văn bản hiển thị cho người dùng, thông báo lỗi trả về client và tài liệu trong `docs/` dùng **tiếng Việt có dấu**.
4. [docs/domain/glossary.md](../domain/glossary.md) là bảng ánh xạ chính thức giữa thuật ngữ báo cáo và tên trong code. Thêm khái niệm mới thì cập nhật glossary trong cùng thay đổi.

## Hệ quả

- Báo cáo vẫn giữ tên tiếng Việt; khi viết chương 3 có thể trích glossary để giải thích tên trong code.
- File Excel tổng hợp và [data-model.md](../domain/data-model.md) được sinh lại với tên tiếng Anh (bản v2.1, 25/10/2026); tên gốc của báo cáo giữ ở cột "Tên trong DA" để đối chiếu.
- Tên `Service` trùng với hậu tố lớp dịch vụ (`…Service`), nên dịch vụ spa có entity là `SpaService` (xem glossary).

# Quyết định kiến trúc (ADR)

Mỗi quyết định có ảnh hưởng lâu dài được ghi thành một file `ADR-NNNN-<ten-ngan>.md` theo [mẫu](../templates/adr.md). ADR đã `Chấp nhận` thì không sửa nội dung; muốn đổi thì viết ADR mới với trạng thái `Thay thế ADR-NNNN` và cập nhật trạng thái của ADR cũ.

Các điểm nghiệp vụ còn chờ chủ spa hoặc giảng viên hướng dẫn chốt nằm ở [open-questions.md](open-questions.md). Khi một câu hỏi được chốt, ghi kết quả vào file đó và, nếu ảnh hưởng thiết kế, viết ADR.

| ADR                                                   | Tiêu đề                                                                            | Trạng thái |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------- |
| [ADR-0001](ADR-0001-english-code-identifiers.md)      | Định danh trong mã nguồn dùng tiếng Anh, ánh xạ với thuật ngữ báo cáo qua glossary | Chấp nhận  |
| [ADR-0002](ADR-0002-business-logic-in-application.md) | Nghiệp vụ nằm ở Application, Infrastructure chỉ chứa adapter                       | Chấp nhận  |
| [ADR-0003](ADR-0003-appointment-time-and-overlap.md)  | Lịch hẹn lưu ngày + giờ địa phương, chống trùng bằng ràng buộc EXCLUDE             | Chấp nhận  |
| [ADR-0004](ADR-0004-manual-dto-mapping.md)            | Ánh xạ DTO thủ công, không phụ thuộc AutoMapper                                    | Chấp nhận  |

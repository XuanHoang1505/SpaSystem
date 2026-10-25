# Tài liệu dự án Spa Như Nguyệt

## Đọc gì trước khi làm

| Việc                       | Đọc                                                                                                                                                                                 |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mới vào dự án              | [../README.md](../README.md) → [architecture.md](architecture.md) → [conventions/project-structure.md](conventions/project-structure.md) → [domain/glossary.md](domain/glossary.md) |
| Làm một use case           | [specs/](specs/README.md) của nhóm đó → [glossary](domain/glossary.md) → [conventions/workflow.md](conventions/workflow.md)                                                         |
| Viết backend               | [conventions/backend.md](conventions/backend.md), [conventions/database.md](conventions/database.md), [conventions/api.md](conventions/api.md)                                      |
| Viết web / mobile          | [conventions/frontend.md](conventions/frontend.md), [frontend.md](frontend.md), [mobile.md](mobile.md)                                                                              |
| Viết test                  | [conventions/testing.md](conventions/testing.md)                                                                                                                                    |
| Gặp điểm nghiệp vụ chưa rõ | [decisions/open-questions.md](decisions/open-questions.md)                                                                                                                          |
| Xem tiến độ                | [progress.md](progress.md)                                                                                                                                                          |

## Cấu trúc

```text
docs/
├── README.md                 Trang này
├── architecture.md           Kiến trúc foundation (tầng, phụ thuộc)
├── development.md            Lệnh build/test, cách kiểm tra
├── frontend.md / mobile.md   Hiện trạng route và UI foundation
├── validation.md             Kết quả kiểm chứng foundation
├── progress.md               Trạng thái triển khai từng use case
├── conventions/              Quy ước bắt buộc khi viết code
│   ├── project-structure.md  File đặt ở đâu
│   ├── naming.md             Đặt tên C#, CSDL, API, TypeScript
│   ├── backend.md            Domain, Application, xử lý lỗi, controller
│   ├── database.md           PostgreSQL, EF Core, migration, ràng buộc
│   ├── api.md                REST, envelope, lỗi, bảo mật
│   ├── frontend.md           React, React Native, state, gọi API
│   ├── testing.md            Test backend và frontend
│   └── workflow.md           Quy trình, git, Definition of Done
├── domain/
│   ├── glossary.md           Thuật ngữ báo cáo ↔ tên trong code
│   └── data-model.md         Mọi bảng/cột/enum tiếng Anh + ERD (file sinh tự động)
├── specs/                    Đặc tả theo nhóm nghiệp vụ
├── decisions/                ADR + câu hỏi chờ chốt
├── templates/                Mẫu đặc tả, mẫu ADR
├── spec-source/              Dữ liệu Python + script sinh Excel và data-model.md
└── SPA_NhuNguyet_TongHop_PhanTich_v2.xlsx   Tổng hợp phân tích từ báo cáo DA (tên tiếng Anh)
```

## Thứ tự ưu tiên khi tài liệu mâu thuẫn

1. ADR đã chấp nhận và câu hỏi đã chốt trong `decisions/`.
2. `conventions/`, `domain/glossary.md` và `domain/data-model.md`.
3. `specs/`.
4. File Excel tổng hợp, rồi báo cáo DA.

Phát hiện mâu thuẫn thì sửa tài liệu ở mức thấp hơn cho khớp, hoặc ghi câu hỏi vào `open-questions.md`.

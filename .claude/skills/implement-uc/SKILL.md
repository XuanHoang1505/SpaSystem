---
name: implement-uc
description: Use when the user asks to implement, start or plan one or more SpaSystem use cases by code (UC-SPA-01 … UC-SPA-34), for example "/implement-uc UC-SPA-22 UC-SPA-23".
argument-hint: 'UC-SPA-NN [UC-SPA-NN ...] [backend|full]'
disable-model-invocation: true
---

# Triển khai use case SpaSystem

Tham số: `$ARGUMENTS` — một hoặc nhiều mã UC, tùy chọn phạm vi `backend` (mặc định) hoặc `full` (thêm shared-types, api-client, web, mobile).

Quy trình có **hai cổng duyệt**: spec → người dùng duyệt → plan → người dùng duyệt → mới code. Không viết code, migration hay sửa tài liệu dự án trước khi spec được duyệt.

## Bước 1 — Xác định phạm vi

1. Tách mã UC từ tham số. Thiếu mã hoặc mã không có trong `docs/spec-source/data_uc.py` → hỏi lại, dừng.
2. Với mỗi UC, lấy từ `data_uc.py`: nhóm (AUTH/CAT/STF/BKG…), tên, actor, ưu tiên, sprint, ghi chú rà soát, đặc tả (luồng chính, A*, E*, BR).
3. Tìm file spec của nhóm trong bảng "File dự kiến" ở `docs/specs/README.md` (ví dụ STF → `staff.md`). Đã có file → mở rộng, không viết lại phần đã duyệt.
4. Xem `docs/progress.md`: UC đã ✅ → báo người dùng và hỏi có làm lại không.
5. Kiểm tra phụ thuộc (bảng, service, quyền mà UC cần nhưng chưa có — ví dụ đặt lịch cần nhân viên và ca làm). Thiếu → nêu ra và đề xuất thứ tự, chờ người dùng chọn.

## Bước 2 — Đọc ngữ cảnh (theo thứ tự)

| Nguồn                                                                 | Lấy gì                                                                                                                                                                                       |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/conventions/` workflow, backend, api, database, testing, naming | Quy ước và Definition of Done                                                                                                                                                                |
| `docs/domain/glossary.md`                                             | Tên tiếng Anh của khái niệm, route, thư mục backend                                                                                                                                          |
| `docs/domain/data-model.md`                                           | Bảng của UC **và** mọi bảng có khóa ngoại tới chúng                                                                                                                                          |
| `docs/spec-source/data_rules.py`                                      | BR của nhóm, workflow (WF), phân quyền (RBAC), rà soát (RS) liên quan                                                                                                                        |
| `docs/spec-source/data_api.py`                                        | Các dòng API của nhóm                                                                                                                                                                        |
| `docs/spec-source/data_screens.py`                                    | Màn hình của UC (để biết dữ liệu cần trả)                                                                                                                                                    |
| `docs/decisions/open-questions.md`, ADR                               | Mặc định đang dùng, số Q tiếp theo                                                                                                                                                           |
| `docs/specs/catalog.md`                                               | Mẫu spec đã duyệt (cấu trúc, mức chi tiết, bảng test)                                                                                                                                        |
| Code mẫu                                                              | `UseCases/Catalog/*`, `API/Authorization/Permissions.cs`, `ServicesController`, `CatalogImageService` + `IFileStorage` (nếu có upload), `tests/IntegrationTests/Catalog/*`, `AuthApiFactory` |

## Bước 3 — Viết spec, rồi DỪNG

Viết/mở rộng `docs/specs/<feature>.md` theo `docs/templates/feature-spec.md`, gồm:

- Use case: bảng tóm tắt, luồng chính, A*, E* — mỗi ngoại lệ có HTTP + mã lỗi `snake_case`.
- Business rules: bảng mã BR, nơi enforce (Domain/Application/CSDL), nguồn (DA/ĐX/quyết định).
- Phân quyền: thêm quyền vào bảng RBAC (`Permissions.cs`) theo sheet 21.
- Dữ liệu: bảng dùng, thay đổi schema (nếu có → sửa `data_db.py`, sinh lại, migration).
- API: bảng method, đường dẫn, vai trò, request, response, lỗi.
- Cấu hình: biến `.env` / `appsettings` mới (secret chỉ ở `.env`).
- Kiểm thử bắt buộc: mã `<NHÓM>-T01…`, tình huống, kết quả mong đợi, gồm luồng ngoại lệ, phân quyền 401/403, hồi quy "toàn bộ test hiện có vẫn pass".
- Câu hỏi còn mở: Q mới kèm **giá trị mặc định có thể cấu hình**.

Sau đó trả lời người dùng: đường dẫn spec + danh sách ngắn **các quyết định cần duyệt** (chỗ lệch giữa DA và data-model, mặc định tự chọn, biên giá trị tự đặt). **Dừng, chờ duyệt.**

## Bước 4 — Plan (sau khi spec được duyệt)

**REQUIRED SUB-SKILL:** gọi `superpowers:writing-plans` với spec vừa duyệt. Lưu plan ở `docs/superpowers/plans/YYYY-MM-DD-<uc-codes>-<slug>.md`. Phần Global Constraints của plan phải có:

- Tên code theo glossary; thông điệp lỗi tiếng Việt; DI bằng `private readonly`.
- Không đổi hành vi UC đã xong; toàn bộ test hiện có phải pass; `PersistenceModelTests` pass.
- TDD: unit test (NSubstitute, đồng hồ giả) + integration test (`PostgresFixture`, Testcontainers); dịch vụ ngoài thay bằng fake trong test.
- Cập nhật `docs/progress.md`, glossary, open-questions, Postman (`backend/postman/generate_collection.py`), `CLAUDE.md` khi có biến môi trường mới.
- Git do người dùng tự chạy: không commit/push trừ khi được yêu cầu; không thêm dòng Co-Authored-By hay "Generated with".

Trả link plan, **chờ duyệt** và để người dùng chọn cách thực thi.

## Sai lầm thường gặp

| Sai                                  | Đúng                                                              |
| ------------------------------------ | ----------------------------------------------------------------- |
| Viết spec rồi code luôn              | Dừng ở mỗi cổng duyệt                                             |
| Tự dịch tên bảng/route               | Tra glossary; khái niệm mới thêm glossary trước                   |
| Sửa tay `data-model.md` / Excel      | Sửa `docs/spec-source/*.py` rồi sinh lại                          |
| Thêm/xóa dòng API giữa `data_api.py` | Chỉ thêm cuối danh sách để giữ mã `SPA-API-xxx`                   |
| Quy tắc chưa rõ thì tự quyết im lặng | Ghi Q mới + mặc định cấu hình được, nêu trong danh sách cần duyệt |

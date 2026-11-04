# spec-source

Nguồn dữ liệu duy nhất của bản phân tích. Sửa dữ liệu ở đây rồi sinh lại; **không sửa tay** `../domain/data-model.md` hay file Excel.

| File                | Nội dung                                                                                                               |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `data_uc.py`        | Dự án, mục tiêu, nghiệp vụ, actor, 34 use case, đặc tả (trích báo cáo DA)                                              |
| `data_rules.py`     | Business rule, workflow, luồng nghiệp vụ, thuật toán giờ trống, mã lỗi, quy ước, phân quyền, UAT, kế hoạch, rà soát DA |
| `data_screens.py`   | Màn hình web/Android, sidebar                                                                                          |
| `data_api.py`       | API endpoint, mẫu JSON, tool AI                                                                                        |
| `data_db.py`        | Bảng, cột, enum (tên tiếng Anh + tên DA)                                                                               |
| `naming.py`         | Chuyển định danh tiếng Việt của báo cáo sang tiếng Anh theo glossary; kiểm tra định danh còn sót                       |
| `build_excel.py`    | Sinh `SPA_NhuNguyet_TongHop_PhanTich_v2.xlsx`                                                                          |
| `build_markdown.py` | Sinh `../domain/data-model.md`                                                                                         |
| `build_vi_db.py`    | Sinh SQL biến CSDL của code thành bản nộp đúng ERD báo cáo (tên tiếng Việt)                                            |

## Sinh lại

Cần Python 3.11+ và `openpyxl` (Anaconda có sẵn). Chạy trong thư mục này:

```powershell
python build_markdown.py ../domain/data-model.md
python build_excel.py ../SPA_NhuNguyet_TongHop_PhanTich_v2.xlsx
npx prettier --write ../domain/data-model.md
```

Đóng file Excel trước khi sinh (Excel khóa file đang mở). `build_excel.py` tự kiểm tra: mọi UC có màn hình và API, mọi tham chiếu `SPA-API-xxx` tồn tại, và in danh sách định danh tiếng Việt còn sót (phải là 0).

## CSDL tiếng Việt (bản nộp)

`../export/NhuNguyetSpa_CSDL_TiengViet.sql` là cấu trúc CSDL đúng như ERD trong báo cáo: 26 bảng (PascalCase), cột camelCase. ERD khai báo trong biến `ERD` của `build_vi_db.py` và là chuẩn của bản nộp: bảng/cột code có mà ERD không có (`otp_codes`, `refresh_tokens`, `spa_profiles`, `created_by`/`updated_by`, `customer_packages.total_sessions`…) bị xóa khỏi bản nộp, không xóa khỏi code; ERD có mà code chưa có thì script dừng. Giá trị enum trong `CHECK` giữ nguyên như code (`active`, `confirmed`…). Sinh lại sau khi có migration mới (từ thư mục gốc repo, Docker đang chạy, SDK .NET 9 trong PATH):

```bash
python docs/spec-source/build_vi_db.py > rename_vi.sql
dotnet ef migrations script --project backend/src/Infrastructure --startup-project backend/src/API -o migrate.sql
docker compose exec -T db psql -U spa -d postgres -c "DROP DATABASE IF EXISTS nhunguyetspa_vi" -c "CREATE DATABASE nhunguyetspa_vi"
docker compose exec -T db psql -U spa -d nhunguyetspa_vi -v ON_ERROR_STOP=1 -q < migrate.sql
docker compose exec -T db psql -U spa -d nhunguyetspa_vi -v ON_ERROR_STOP=1 -q < rename_vi.sql
docker compose exec -T db pg_dump -U spa -d nhunguyetspa_vi --schema-only --no-owner --no-privileges > docs/export/NhuNguyetSpa_CSDL_TiengViet.sql
```

`rename_vi.sql` tự dừng nếu cột thật lệch `data_db.py` hoặc kết quả lệch ERD. Sửa ERD trong báo cáo thì sửa luôn biến `ERD`; tên cột ERD khác tên DA thì thêm vào `ERD_NAME`. Xóa `migrate.sql` và `rename_vi.sql` sau khi dùng; giữ lại dòng ghi chú đầu file export.

## Quy tắc khi sửa

- Tên bảng, cột, enum mới phải có trong [glossary](../domain/glossary.md) trước.
- `data_api.py`, `data_rules.py` được viết bằng tên gốc của báo cáo và dịch tự động qua `naming.py`; thêm định danh mới thì bổ sung bảng ánh xạ trong `naming.py`.
- Thêm/xóa API thì giữ nguyên thứ tự các dòng cũ: mã `SPA-API-xxx` sinh theo thứ tự và được workflow, luồng nghiệp vụ tham chiếu.

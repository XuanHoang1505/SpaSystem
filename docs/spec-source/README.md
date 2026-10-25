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

## Sinh lại

Cần Python 3.11+ và `openpyxl` (Anaconda có sẵn). Chạy trong thư mục này:

```powershell
python build_markdown.py ../domain/data-model.md
python build_excel.py ../SPA_NhuNguyet_TongHop_PhanTich_v2.xlsx
npx prettier --write ../domain/data-model.md
```

Đóng file Excel trước khi sinh (Excel khóa file đang mở). `build_excel.py` tự kiểm tra: mọi UC có màn hình và API, mọi tham chiếu `SPA-API-xxx` tồn tại, và in danh sách định danh tiếng Việt còn sót (phải là 0).

## Quy tắc khi sửa

- Tên bảng, cột, enum mới phải có trong [glossary](../domain/glossary.md) trước.
- `data_api.py`, `data_rules.py` được viết bằng tên gốc của báo cáo và dịch tự động qua `naming.py`; thêm định danh mới thì bổ sung bảng ánh xạ trong `naming.py`.
- Thêm/xóa API thì giữ nguyên thứ tự các dòng cũ: mã `SPA-API-xxx` sinh theo thứ tự và được workflow, luồng nghiệp vụ tham chiếu.

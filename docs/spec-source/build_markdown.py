# -*- coding: utf-8 -*-
"""Sinh docs/domain/data-model.md từ data_db.py. Chạy: python build_markdown.py <đường dẫn data-model.md>"""
import io
import re
import sys

from data_db import TABLES, ENUMS, UC_TABLES, cs_type, pascal

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
OUT = sys.argv[1]
GROUP_NAME = {"AUTH": "Tài khoản", "CAT": "Dịch vụ & gói", "STF": "Nhân viên", "PRM": "Khuyến mãi", "ORD": "Giỏ, đơn, thanh toán",
              "TRT": "Quyền sử dụng & liệu trình", "BKG": "Lịch hẹn", "CARE": "Chăm sóc", "REV": "Đánh giá", "AI": "Trợ lý AI", "NTF": "Thông báo"}

def cell(s):
    return (s or "").replace("|", "\\|")

uc_by_table = {t[1]: [] for t in TABLES}
for u, (main, rel) in UC_TABLES.items():
    for t in [main] + [x.strip() for x in rel.split(",") if x.strip()]:
        if u not in uc_by_table[t]:
            uc_by_table[t].append(u)

out = []
w = out.append
w("# Mô hình dữ liệu")
w("")
w("> File sinh tự động từ `docs/spec-source/data_db.py` — sửa ở đó rồi chạy lại `build_markdown.py`, không sửa tay file này.")
w("")
w("Tên bảng, cột, enum chuẩn hóa tiếng Anh theo [ADR-0001](../decisions/ADR-0001-english-code-identifiers.md); cột **DA** là tên trong báo cáo "
  "`126_DA_NTTT_NguyenXuanHoang_2214_v1.docx` để đối chiếu. Quy ước kiểu dữ liệu, ràng buộc, migration ở [conventions/database.md](../conventions/database.md).")
w("")
w("- Bảng và cột `snake_case` (EF Core `UseSnakeCaseNamingConvention()`); thuộc tính C# là PascalCase tương ứng.")
w("- `*_at_utc` là `timestamptz` UTC; `date`/`start_time`/`end_time` của `appointments`, `work_schedules` là giờ Việt Nam ([ADR-0003](../decisions/ADR-0003-appointment-time-and-overlap.md)).")
w("- Enum lưu chuỗi `snake_case` + `CHECK`; tiền VND `numeric(12,0)`.")
w("- Bảng đánh dấu **ĐX** không có trong báo cáo, được đề xuất bổ sung (sheet `26_Ra_soat_DA`, RS-17).")
w("- `customers`, `staff_members`, `owner_profiles` dùng chung khóa chính với `users` (`id` = `users.id`).")
w("")

# ERD
w("## Sơ đồ quan hệ")
w("")
w("```mermaid")
w("erDiagram")
rels = []
for grp, name, entity, da, purpose, src, sprint, cols in TABLES:
    for c in cols:
        col, pg, null, cons, desc, da_col = c.split("|")
        for m in re.finditer(r"FK → (\w+)\.(\w+)", cons):
            parent = m.group(1)
            unique = "UQ" in cons or ("PK" in cons and name in ("customers", "staff_members", "owner_profiles"))
            left = "|o" if null == "Y" else "||"
            right = "o|" if unique else "o{"
            rels.append(f"    {parent} {left}--{right} {name} : {col}")
for r in rels:
    w(r)
w("```")
w("")

# Mục lục
w("## Danh sách bảng")
w("")
w("| Nhóm | Bảng | Entity | DA | Mục đích | Nguồn |")
w("| --- | --- | --- | --- | --- | --- |")
for grp, name, entity, da, purpose, src, sprint, cols in TABLES:
    w(f"| {GROUP_NAME[grp]} | [`{name}`](#{name.replace('_', '_')}) | `{entity}` | {da} | {cell(purpose)} | {src} |")
w("")

# Chi tiết
w("## Chi tiết bảng")
for grp, name, entity, da, purpose, src, sprint, cols in TABLES:
    w("")
    w(f"### {name}")
    w("")
    w(f"`{entity}` · DA: {da} · {sprint} · {purpose}. UC: {', '.join(uc_by_table[name]) or '—'}.")
    w("")
    w("| Cột | PostgreSQL | C# | Null | Ràng buộc | Mô tả | DA |")
    w("| --- | --- | --- | --- | --- | --- | --- |")
    for c in cols:
        col, pg, null, cons, desc, da_col = c.split("|")
        w(f"| `{col}` | {pg} | `{pascal(col)}`: {cs_type(pg, cons)} | {'có' if null == 'Y' else 'không'} | {cell(cons) or '—'} | {cell(desc)} | {da_col or '—'} |")

w("")
w("## Enum")
w("")
w("| Enum C# | Dùng ở | Thành viên C# → giá trị lưu (DA) | Ghi chú |")
w("| --- | --- | --- | --- |")
for tbl, col, enum, values, note in ENUMS:
    vals = ", ".join(f"`{m}` → `{db}`" + (f" ({da})" if not da.startswith("(") else "") for da, m, db in values)
    w(f"| `{enum}` | {tbl}.{col} | {vals} | {cell(note) or '—'} |")
w("")

with open(OUT, "w", encoding="utf-8", newline="\n") as f:
    f.write("\n".join(out))
print("OK:", OUT, "|", len(TABLES), "bảng |", len(rels), "quan hệ")

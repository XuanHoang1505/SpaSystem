# -*- coding: utf-8 -*-
"""Sinh script SQL biến CSDL của code thành bản nộp: bảng/cột tiếng Việt, đúng như ERD trong báo cáo.

Code vẫn dùng tên tiếng Anh (ADR-0001). Script chỉ chạy trên một CSDL riêng đã áp migration,
sau đó pg_dump ra file nộp. Cách dùng: README.md, mục "CSDL tiếng Việt".

ERD là chuẩn của bản nộp: bảng/cột của code không có trong ERD bị xóa khỏi bản nộp (không xóa khỏi code),
và script dừng nếu ERD có cột mà code chưa có.

    python build_vi_db.py > rename_vi.sql
"""
import sys

import data_db

# ERD của báo cáo (bảng → cột, đúng thứ tự và cách viết trên sơ đồ).
ERD = {
    "NguoiDung": "maNguoiDung hoTen email SDT matKhauHash vaiTro anhDaiDien trangThai ngaySinh gioiTinh ngayTao ngayCapNhat",
    "ChuSpa": "maNguoiDung ghiChu",
    "KhachHang": "maNguoiDung ghiChu",
    "NhanVien": "maNguoiDung ngayVaoLam chuyenMon ngayNghiViec",
    "NhanVien_DichVu": "idNhanVien idDichVu",
    "LichLamViec": "id idNhanVien ngay gioBatDau gioKetThuc trangThai",
    "DanhMucDichVu": "id tenDanhMuc moTa thuTu dangHienThi ngayTao ngayCapNhat",
    "DichVu": "id tenDichVu idDanhMucDichVu moTa thoiLuongPhut gia hinhAnh trangThai ngayTao ngayCapNhat",
    "GoiDichVu": "id tenGoiDichVu moTa gia thoiHanNgay trangThai ngayBatDauBan ngayKetThucBan hinhAnh ngayTao ngayCapNhat",
    "GoiDichVuChiTiet": "id idDichVu idGoiDichVu soBuoi khoangCachNgayToiThieu thuTu ghiChu",
    "KhuyenMai": "id maCode moTa loaiGiamGia giaTri giaTriDonHangToiThieu giaTriGiamToiDa ngayBatDau ngayKetThuc "
                 "gioiHanMoiKhach soLuong trangThai",
    "ApDungKhuyenMai": "id idDonHang idKhuyenMai maKhuyenMai soTienGiam ngaySuDung",
    "GioHang": "id idKhachHang ngayTao ngayCapNhat",
    "ChiTietGioHang": "id idGioHang idDichVu idGoiDichVu donGia ngayThem",
    "DonHang": "id maDonHang idKhachHang tongTienHang tongGiamGia tongThanhToan trangThai ghiChu ngayTaoDonHang "
               "ngayCapNhatDonHang hetHanThanhToanLuc",
    "ChiTietDonHang": "id idDonHang idDichVu idGoiDichVu tenSanPham donGia thanhTien ghiChu",
    "ThanhToan": "id idDonHang nhaCungCap soTien trangThai maYeuCau maGiaoDich paymentUrl thoiGianHetHanPhien "
                 "thoiGianThanhToan ngayCapNhatThanhToan",
    "DichVuKhachHang": "id idChiTietDonHang ngayHetHan trangThai",
    "GoiKhachHang": "id idChiTietDonHang tenGoi ngayMua ngayKichHoat ngayHetHan trangThai",
    "LieuTrinh": "id idGoiKhachHang idNhanVienPhuTrach ngayBatDau ngayKetThucDuKien ngayKetThucThucTe mucTieu trangThai ghiChu",
    "BuoiChamSoc": "id idLieuTrinh idDichVu thuTu tenDichVu thoiLuongPhut trangThai ghiChu ngayHoanThanh",
    "LichHen": "id idKhachHang idNhanVien idDichVuKhachHang idBuoiChamSoc idChiTietDonHang giuChoDen ngayHen gioBatDau "
               "gioKetThuc trangThai huyLuc lyDoHuy ghiChu ngayTao",
    "HoSoDa": "id idKhachHang idNhanVienDanhGia idLichHen ngayDanhGia loaiDa vanDeChinh sanPhamDangDung mucTieuChamSoc "
              "deXuatDieuTri ghiChu ngayTao ngayCapNhat",
    "DiUngKhachHang": "id idKhachHang tacNhan mucDo ghiChu ngayGhiNhan",
    "DanhGia": "id idKhachHang idDichVu idGoiDichVu noiDungDanhGia phanHoiTuSpa phanHoiLuc soSao hinhAnh trangThai "
               "ngayTao ngayCapNhat",
    "LichSuTroChuyenAI": "id idKhachHang cauHoi cauTraLoi thoiGian",
    "ThongBao": "id idNguoiDung tieuDe noiDung loai docLuc ngayTao",
}
ERD = {table: columns.split() for table, columns in ERD.items()}

# Cột mà ERD đặt tên khác tên DA trong data_db.py.
ERD_NAME = {
    ("orders", "created_at_utc"): "ngayTaoDonHang",
    ("orders", "updated_at_utc"): "ngayCapNhatDonHang",
    ("payments", "expires_at_utc"): "thoiGianHetHanPhien",
    ("payments", "updated_at_utc"): "ngayCapNhatThanhToan",
}


def erd_column(table, name, da_name):
    if (table, name) in ERD_NAME:
        return ERD_NAME[(table, name)]
    if not da_name:
        return None
    return da_name if da_name.isupper() else da_name[0].lower() + da_name[1:]


def plan():
    """(bảng_en cần xóa, [(bảng_en, Bảng_vi, {cột_en: cột_vi}, [cột_en cần xóa])])."""
    drop_tables, keep = [], []
    for _, table, _, da_table, *_, columns in data_db.TABLES:
        if da_table not in ERD:
            drop_tables.append(table)
            continue
        renames, drops = {}, []
        for column in columns:
            name, *_, da_name = column.split("|")
            vi = erd_column(table, name, da_name)
            if vi in ERD[da_table]:
                renames[name] = vi
            else:
                drops.append(name)
        missing = set(ERD[da_table]) - set(renames.values())
        if missing:
            sys.exit(f"ERD có cột mà code chưa có: {da_table}.{', '.join(sorted(missing))}")
        keep.append((table, da_table, renames, drops))
    missing_tables = set(ERD) - {vi for _, vi, _, _ in keep}
    if missing_tables:
        sys.exit(f"ERD có bảng mà code chưa có: {', '.join(sorted(missing_tables))}")
    return drop_tables, keep


def q(identifier):
    return '"' + identifier.replace('"', '""') + '"'


def literal(text):
    return "'" + text.replace("'", "''") + "'"


def main():
    drop_tables, keep = plan()
    known = [(t, c) for t, _, renames, drops in keep for c in [*renames, *drops]]
    out = ["-- Sinh bởi docs/spec-source/build_vi_db.py. Không sửa tay.", "BEGIN;", "",
           "-- Cột thật phải khớp data_db.py (lệch → dừng, không đổi tên dở dang).",
           "CREATE TEMP TABLE _map(t text, c text) ON COMMIT DROP;",
           "INSERT INTO _map VALUES",
           ",\n".join(f"  ({literal(t)}, {literal(c)})" for t, c in known) + ";",
           "DO $$ DECLARE missing text; BEGIN",
           "  SELECT string_agg(table_name || '.' || column_name, ', ') INTO missing FROM information_schema.columns c",
           f"  WHERE table_schema = 'public' AND table_name NOT IN ('__EFMigrationsHistory', {', '.join(map(literal, drop_tables))})",
           "    AND NOT EXISTS (SELECT 1 FROM _map m WHERE m.t = c.table_name AND m.c = c.column_name);",
           "  IF missing IS NOT NULL THEN RAISE EXCEPTION 'Cột chưa có trong data_db.py: %', missing; END IF;",
           "END $$;", "",
           "-- Bảng không có trong ERD.",
           'DROP TABLE IF EXISTS "__EFMigrationsHistory";',
           *(f"DROP TABLE {q(t)} CASCADE;" for t in drop_tables), ""]

    for table, vi_table, renames, drops in keep:
        out.append(f"-- {table} → {vi_table}")
        out += [f"ALTER TABLE {q(table)} DROP COLUMN {q(c)} CASCADE;  -- không có trong ERD" for c in drops]
        out += [f"ALTER TABLE {q(table)} RENAME COLUMN {q(c)} TO {q(vi)};" for c, vi in renames.items() if c != vi]
        out += [f"ALTER TABLE {q(table)} RENAME TO {q(vi_table)};", ""]

    # Đặt lại tên ràng buộc và chỉ mục theo tên bảng/cột mới: pk_/fk_/uq_/ck_/ex_/ix_<Bảng>_<cột>.
    out += [
        "DO $$ DECLARE r record; base text; candidate text; n int; BEGIN",
        "  FOR r IN SELECT con.oid, con.conname, con.contype, rel.relname,",
        "      (SELECT string_agg(a.attname, '_' ORDER BY k.ord) FROM unnest(con.conkey) WITH ORDINALITY k(attnum, ord)",
        "         JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = k.attnum) AS cols",
        "    FROM pg_constraint con JOIN pg_class rel ON rel.oid = con.conrelid",
        "    JOIN pg_namespace ns ON ns.oid = rel.relnamespace WHERE ns.nspname = 'public' AND con.contype IN ('p','f','u','c','x')",
        "    ORDER BY rel.relname, con.conname LOOP",
        "    base := CASE r.contype WHEN 'p' THEN 'pk_' || r.relname",
        "      WHEN 'x' THEN 'ex_' || r.relname || '_khongTrungLich'",
        "      ELSE (CASE r.contype WHEN 'f' THEN 'fk_' WHEN 'u' THEN 'uq_' ELSE 'ck_' END) || r.relname || coalesce('_' || r.cols, '') END;",
        "    base := left(base, 60); candidate := base; n := 1;",
        "    WHILE EXISTS (SELECT 1 FROM pg_constraint WHERE conname = candidate AND oid <> r.oid)",
        "       OR EXISTS (SELECT 1 FROM pg_class WHERE relname = candidate) LOOP",
        "      n := n + 1; candidate := base || '_' || n; END LOOP;",
        "    IF candidate <> r.conname THEN",
        "      EXECUTE format('ALTER TABLE %I RENAME CONSTRAINT %I TO %I', r.relname, r.conname, candidate); END IF;",
        "  END LOOP;",
        "  FOR r IN SELECT ic.relname AS idx, t.relname,",
        "      (SELECT string_agg(coalesce(a.attname, 'expr'), '_' ORDER BY k.ord) FROM unnest(i.indkey) WITH ORDINALITY k(attnum, ord)",
        "         LEFT JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum) AS cols",
        "    FROM pg_index i JOIN pg_class ic ON ic.oid = i.indexrelid JOIN pg_class t ON t.oid = i.indrelid",
        "    JOIN pg_namespace ns ON ns.oid = t.relnamespace",
        "    WHERE ns.nspname = 'public' AND NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conindid = i.indexrelid)",
        "    ORDER BY t.relname, ic.relname LOOP",
        "    base := left('ix_' || r.relname || '_' || r.cols, 60); candidate := base; n := 1;",
        "    WHILE EXISTS (SELECT 1 FROM pg_class WHERE relname = candidate AND relname <> r.idx)",
        "       OR EXISTS (SELECT 1 FROM pg_constraint WHERE conname = candidate) LOOP",
        "      n := n + 1; candidate := base || '_' || n; END LOOP;",
        "    IF candidate <> r.idx THEN EXECUTE format('ALTER INDEX %I RENAME TO %I', r.idx, candidate); END IF;",
        "  END LOOP;",
        "END $$;", "",
        "-- Kết quả phải đúng bằng ERD.",
        "CREATE TEMP TABLE _erd(t text, c text) ON COMMIT DROP;",
        "INSERT INTO _erd VALUES",
        ",\n".join(f"  ({literal(t)}, {literal(c)})" for t, cols in ERD.items() for c in cols) + ";",
        "DO $$ DECLARE diff text; BEGIN",
        "  SELECT string_agg(coalesce(a.t || '.' || a.c || ' (thừa)', b.t || '.' || b.c || ' (thiếu)'), ', ') INTO diff",
        "  FROM (SELECT table_name::text t, column_name::text c FROM information_schema.columns WHERE table_schema = 'public') a",
        "  FULL JOIN _erd b ON a.t = b.t AND a.c = b.c WHERE a.t IS NULL OR b.t IS NULL;",
        "  IF diff IS NOT NULL THEN RAISE EXCEPTION 'Lệch ERD: %', diff; END IF;",
        "END $$;", "",
        "COMMIT;"]
    sys.stdout.reconfigure(encoding="utf-8", newline="\n")
    print("\n".join(out))


if __name__ == "__main__":
    main()

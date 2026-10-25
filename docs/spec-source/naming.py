# -*- coding: utf-8 -*-
"""Chuyển định danh tiếng Việt của báo cáo DA sang tên tiếng Anh theo docs/domain/glossary.md (ADR-0001)."""
import re
from data_db import TABLES, ENUMS

# DA table -> entity C#, DA table -> bảng PostgreSQL
DA_ENTITY = {t[3]: t[2] for t in TABLES if not t[3].startswith("(")}
DA_TABLE = {t[3]: t[1] for t in TABLES if not t[3].startswith("(")}
DA_ENTITY.update({"MaOtp": "OtpCode", "ThongTinSpa": "SpaProfile"})
DA_TABLE.update({"MaOtp": "otp_codes", "ThongTinSpa": "spa_profiles", "RefreshToken": "refresh_tokens"})

# (DA table, DA column) -> cột tiếng Anh
DA_COLUMN = {}
for t in TABLES:
    for c in t[7]:
        parts = c.split("|")
        if parts[5]:
            DA_COLUMN[(t[3], parts[5])] = parts[0]

# Cột đứng riêng (không kèm tên bảng) — giá trị phổ biến nhất
COLUMN_DEFAULT = {}
for (tbl, col), en in DA_COLUMN.items():
    COLUMN_DEFAULT.setdefault(col, en)
COLUMN_DEFAULT.update({
    "MaNguoiDung": "user_id", "ThuTu": "sequence_number", "NgayBatDau": "start_date", "NgayKetThuc": "end_date",
    "TenDichVu": "name", "GhiChu": "note", "NgayHetHan": "expires_at_utc", "SoLuong": "usage_limit",
    "GiaTri": "discount_value", "Ngay": "date",
})
for skip in ("Id", "Email", "Gia", "Loai"):
    COLUMN_DEFAULT.pop(skip, None)

ENUM_VALUE = {}
for _, _, _, values, _ in ENUMS:
    for da, _, db in values:
        if not da.startswith("("):
            ENUM_VALUE.setdefault(da, db)
ENUM_VALUE.update({"MuaNgay": "buy_now", "DangKy": "registration", "QuenMatKhau": "password_reset"})

# Tên DTO: tiền tố tiếng Việt -> tiếng Anh
DTO_PREFIX = dict(DA_ENTITY)
DTO_PREFIX.update({"DichVu": "SpaService", "GoiDichVu": "ServicePackage", "DonHang": "Order", "LichHen": "Appointment",
                   "LichSuSuDung": "ServiceHistory", "LanChamSoc": "CareVisit", "LichSuTroChuyen": "AiChatMessage",
                   "DiUng": "CustomerAllergy", "DanhGia": "Review", "ThongBao": "Notification", "NhanVien": "StaffMember",
                   "KhuyenMai": "Promotion", "LieuTrinh": "TreatmentPlan", "BuoiChamSoc": "TreatmentSession",
                   "HoSoDa": "SkinProfile", "LichLamViec": "WorkSchedule", "DichVuKhachHang": "ServiceEntitlement",
                   "GoiKhachHang": "CustomerPackage"})

# Trường JSON camelCase tiếng Việt -> tiếng Anh
JSON_FIELD = {
 "hoTen": "fullName", "sdt": "phoneNumber", "matKhau": "password", "xacNhanMatKhau": "confirmPassword", "hetHanLuc": "expiresAtUtc",
 "maNguoiDung": "userId", "tenDangNhap": "login", "nguoiDung": "user", "vaiTro": "role", "matKhauMoi": "newPassword",
 "anhDaiDien": "avatarUrl", "ngaySinh": "dateOfBirth", "gioiTinh": "gender", "matKhauCu": "currentPassword", "trangThai": "status",
 "loaiDichVu": "category", "giaTu": "minPrice", "giaDen": "maxPrice", "daSuDung": "usedBefore", "tenDichVu": "name", "gia": "price",
 "thoiLuongPhut": "durationMinutes", "hinhAnh": "imageUrl", "diemTrungBinh": "averageRating", "tenGoiDichVu": "name",
 "thoiHanNgay": "validityDays", "tongSoBuoi": "totalSessions", "chiTiet": "items", "dichVu": "service", "soBuoi": "sessionCount",
 "thuTu": "sortOrder", "khoangCachNgayToiThieu": "minDaysBetweenSessions", "loai": "type", "ten": "name", "tenSpa": "name",
 "gioiThieu": "introduction", "diaChi": "address", "gioMoCua": "openingHours", "moTa": "description", "ngayBatDauBan": "saleStartDate",
 "ngayKetThucBan": "saleEndDate", "idDichVu": "spaServiceId", "ghiChu": "note", "idSanPham": "productId", "donGia": "unitPrice",
 "giaHienTai": "currentPrice", "conBan": "isOnSale", "tongTien": "total", "idGoiDichVu": "servicePackageId", "nguon": "source",
 "maKhuyenMai": "promotionCode", "tongTienHang": "subtotal", "tongGiamGia": "discountTotal", "tongThanhToan": "grandTotal",
 "loiKhuyenMai": "promotionError", "maCode": "code", "hopLe": "isValid", "soTienGiam": "discountAmount", "lyDo": "reason",
 "maDonHang": "code", "idThanhToan": "paymentId", "thoiGianHetHan": "expiresAtUtc", "tuNgay": "fromDate", "denNgay": "toDate",
 "thanhToan": "payments", "apDungKhuyenMai": "promotionRedemption", "loaiGiamGia": "discountType", "giaTri": "discountValue",
 "giaTriDonHangToiThieu": "minOrderAmount", "giaTriGiamToiDa": "maxDiscountAmount", "ngayBatDau": "startDate", "ngayKetThuc": "endDate",
 "gioiHanMoiKhach": "perCustomerLimit", "soLuong": "usageLimit", "ngay": "date", "idNhanVien": "staffMemberId",
 "idBuoiChamSoc": "treatmentSessionId", "khungGio": "slots", "gioBatDau": "startTime", "gioKetThuc": "endTime",
 "idLichHen": "appointmentId", "giuChoDen": "holdExpiresAtUtc", "idDonHang": "orderId", "idDichVuKhachHang": "serviceEntitlementId",
 "khachHang": "customer", "diUng": "allergies", "buoi": "session", "hoSoDa": "skinProfile", "donHangNguon": "sourceOrder",
 "soBuoiDaDung": "usedSessions", "ngayHetHan": "expiresAtUtc", "idLieuTrinh": "treatmentPlanId", "mucTieu": "goal",
 "tienDo": "progress", "coTheDatLich": "canBook", "lyDoChuaDuocDat": "notBookableReason", "idKhachHang": "customerId",
 "idNhanVienPhuTrach": "primaryStaffMemberId", "ngayKetThucDuKien": "expectedEndDate", "lichSuChamSoc": "careHistory",
 "lichHen": "appointment", "nhanVien": "staff", "ketQua": "result", "ngayVaoLam": "hireDate", "chuyenMon": "specialty",
 "ngayNghiViec": "resignationDate", "matKhauTam": "temporaryPassword", "lichHenCanPhanCongLai": "appointmentsToReassign",
 "lichHenTrongCa": "appointmentsInShift", "loaiDa": "skinType", "vanDeChinh": "mainConcerns", "sanPhamDangDung": "currentProducts",
 "mucTieuChamSoc": "careGoals", "deXuatDieuTri": "recommendedTreatment", "tacNhan": "allergen", "mucDo": "severity",
 "tienDoGoi": "packageProgress", "soSao": "rating", "noiDung": "comment", "phanHoi": "reply", "duDieuKien": "isEligible",
 "cauHoi": "question", "cauTraLoi": "answer", "goiY": "suggestions", "truoc": "before", "nhomTheo": "groupBy", "tieuChi": "criteria",
 "tong": "total", "ky": "periods", "nhan": "label", "doanhThu": "revenue", "soDon": "orderCount", "chuaDoc": "unreadOnly",
 "ngayHen": "date", "hetHanThanhToanLuc": "paymentDueAtUtc",
}
# Từ trùng với tiếng Việt viết không dấu ("Đặt ngay", "nam"…) — chỉ dịch trong cột cấu trúc API
API_ONLY = {"ngay", "ten", "loai", "gia", "buoi", "nhan", "tong", "ky", "truoc", "nguon", "sdt", "goi", "dichVu"}

# Cụm cố định — áp dụng trước tiên
LITERAL = [
 ("{dichVu[DichVuKhachHangDto], goi[GoiKhachHangDto]}", "{services[ServiceEntitlementDto], packages[CustomerPackageDto]}"),
 ("{diemTrungBinh, soLuong, items[]}", "{averageRating, count, items[]}"),
 ("[{ten, loai, soLuong, doanhThu}]", "[{name, type, quantity, revenue}]"),
 ("ngayBatDau, ngayKetThuc, gioiHanMoiKhach", "startsAtUtc, endsAtUtc, gioiHanMoiKhach"),
 ("{id, thuTu, tenDichVu, trangThai", "{id, sequenceNumber, serviceName, status"), ("buoi[{", "sessions[{"),
 ("nguon: GioHang|MuaNgay", "source: cart|buy_now"), ("GioHang|MuaNgay", "cart|buy_now"),
 ("TatCa|DichVu|Goi", "all|service|package"), ("DichVu|Goi", "service|package"), ("loai: DichVu|Goi", "type: service|package"),
 ("HienThi|An", "visible|hidden"), ("thang|quy|nam", "month|quarter|year"), ("[{loai, id, ten}]", "[{type, id, name}]"),
 ("[{loai, id, ten, duDieuKien, lyDo?}]", "[{type, id, name, isEligible, reason?}]"),
 ("?q (", "?search ("), ("?q&", "?search&"), ("{loai, id}", "{type, id}"),
 ("NguoiDung(KhachHang)", "User (role = customer)"), ("NguoiDung(NhanVien)", "User (role = staff)"),
 ("NguoiDung VaiTro NhanVien", "User (role = staff)"), ("VaiTro NhanVien", "role = staff"), ("VaiTro KhachHang", "role = customer"),
 ("NguoiDung HoatDong", "User status active"), ("TrangThai HoatDong", "status active"),
 ("KhuyenMai TrangThai HoatDong", "Promotion status active"),
 ("Một đơn có thể nhiều ThanhToan", "Một đơn có thể nhiều Payment"),
]

def _table_col(m):
    tbl, col = m.group(1), m.group(2)
    en_tbl = DA_TABLE.get(tbl)
    en_col = DA_COLUMN.get((tbl, col)) or COLUMN_DEFAULT.get(col) or ("id" if col in ("Id", "MaNguoiDung") else None)
    if en_tbl and en_col:
        return f"{en_tbl}.{en_col}"
    return m.group(0)

def _dto(m):
    prefix, suffix = m.group(1), m.group(2)
    return DTO_PREFIX.get(prefix, prefix) + suffix

TOKEN = {}
TOKEN.update(ENUM_VALUE)
TOKEN.update(COLUMN_DEFAULT)
TOKEN.update(DA_ENTITY)       # tên bảng ưu tiên hơn giá trị enum trùng (KhachHang, LichHen…)
TOKEN.update(JSON_FIELD)
def _rx(keys):
    return re.compile(r"(?<!\w)(" + "|".join(sorted(map(re.escape, keys), key=len, reverse=True)) + r")(?!\w)")
_token_re = _rx(TOKEN)
_prose_re = _rx([k for k in TOKEN if k not in API_ONLY])
_tblcol_re = re.compile(r"\b(" + "|".join(sorted(map(re.escape, DA_TABLE), key=len, reverse=True)) + r")\.(\w+)")
_dto_re = re.compile(r"\b([A-Z][A-Za-z]*?)(ListItemDto|DetailDto|Dto)\b")

def tr(s, api=False):
    """api=True: chuỗi là request/response/tham số — dịch cả các từ ngắn trùng tiếng Việt không dấu."""
    if not isinstance(s, str) or not s:
        return s
    for a, b in LITERAL:
        s = s.replace(a, b)
    s = _tblcol_re.sub(_table_col, s)
    s = _dto_re.sub(_dto, s)
    s = (_token_re if api else _prose_re).sub(lambda m: TOKEN[m.group(1)], s)
    return s

def tr_row(row, cols=None, api_cols=()):
    return tuple(tr(v, i in api_cols) if (cols is None or i in cols or i in api_cols) else v for i, v in enumerate(row))

LEFTOVER = set(DA_TABLE) | {k for k in ENUM_VALUE if len(k) > 3} | {c for (_, c) in DA_COLUMN if len(c) > 3} | {k for k in JSON_FIELD if len(k) > 4}
LEFTOVER -= {"Email", "PaymentUrl", "RefreshToken"}
_left_re = re.compile(r"(?<!\w)(" + "|".join(sorted(map(re.escape, LEFTOVER), key=len, reverse=True)) + r")(?![\w])")
VN_SYLLABLES = set("""ngay gio ten tong dich vu goi lich khach hang nhan vien trang thai hen buoi lieu trinh thanh toan don khuyen mai danh gia
tien muc loai ghi chu phan hoi han su dung ma so thoi luong phut het giu cho dat huy ly do ket thuc bat dau cap nhat tao doc luc noi anh dai
dien hinh vai tro mat khau ho tac van de san pham xuat dieu cau tra loi gian ban ngung hoat khoa bi kich mua vao lam nghi viec mon ky cong
khong den xac quyen nguon diem trung binh gioi thieu dia mo cua id""".split())
_camel_re = re.compile(r"[A-Za-z][a-z]*(?:[A-Z][a-z]*)+")
def leftovers(s):
    if not isinstance(s, str):
        return []
    found = _left_re.findall(s)
    for tok in _camel_re.findall(s):
        parts = [p.lower() for p in re.findall(r"[A-Z]?[a-z]+", tok)]
        if len(parts) >= 2 and sum(p in VN_SYLLABLES for p in parts) >= 2 and sum(p in VN_SYLLABLES for p in parts) == len(parts):
            found.append(tok)
    return found

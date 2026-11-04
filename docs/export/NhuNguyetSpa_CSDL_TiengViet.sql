-- Sinh bởi docs/spec-source/build_vi_db.py. Không sửa tay.
BEGIN;

-- Cột thật phải khớp data_db.py (lệch → dừng, không đổi tên dở dang).
CREATE TEMP TABLE _map(t text, c text) ON COMMIT DROP;
INSERT INTO _map VALUES
  ('users', 'id'),
  ('users', 'full_name'),
  ('users', 'email'),
  ('users', 'phone_number'),
  ('users', 'password_hash'),
  ('users', 'role'),
  ('users', 'avatar_url'),
  ('users', 'status'),
  ('users', 'date_of_birth'),
  ('users', 'gender'),
  ('users', 'created_at_utc'),
  ('users', 'updated_at_utc'),
  ('users', 'created_by'),
  ('users', 'updated_by'),
  ('owner_profiles', 'id'),
  ('owner_profiles', 'note'),
  ('customers', 'id'),
  ('customers', 'note'),
  ('staff_members', 'id'),
  ('staff_members', 'hire_date'),
  ('staff_members', 'specialty'),
  ('staff_members', 'resignation_date'),
  ('spa_services', 'id'),
  ('spa_services', 'name'),
  ('spa_services', 'category'),
  ('spa_services', 'description'),
  ('spa_services', 'duration_minutes'),
  ('spa_services', 'price'),
  ('spa_services', 'image_url'),
  ('spa_services', 'status'),
  ('spa_services', 'created_at_utc'),
  ('spa_services', 'updated_at_utc'),
  ('spa_services', 'created_by'),
  ('spa_services', 'updated_by'),
  ('service_packages', 'id'),
  ('service_packages', 'name'),
  ('service_packages', 'description'),
  ('service_packages', 'price'),
  ('service_packages', 'validity_days'),
  ('service_packages', 'status'),
  ('service_packages', 'sale_start_date'),
  ('service_packages', 'sale_end_date'),
  ('service_packages', 'image_url'),
  ('service_packages', 'created_at_utc'),
  ('service_packages', 'updated_at_utc'),
  ('service_packages', 'created_by'),
  ('service_packages', 'updated_by'),
  ('service_package_items', 'id'),
  ('service_package_items', 'spa_service_id'),
  ('service_package_items', 'service_package_id'),
  ('service_package_items', 'session_count'),
  ('service_package_items', 'min_days_between_sessions'),
  ('service_package_items', 'sort_order'),
  ('service_package_items', 'note'),
  ('staff_skills', 'staff_member_id'),
  ('staff_skills', 'spa_service_id'),
  ('work_schedules', 'id'),
  ('work_schedules', 'staff_member_id'),
  ('work_schedules', 'date'),
  ('work_schedules', 'start_time'),
  ('work_schedules', 'end_time'),
  ('work_schedules', 'status'),
  ('promotions', 'id'),
  ('promotions', 'code'),
  ('promotions', 'description'),
  ('promotions', 'discount_type'),
  ('promotions', 'discount_value'),
  ('promotions', 'min_order_amount'),
  ('promotions', 'max_discount_amount'),
  ('promotions', 'starts_at_utc'),
  ('promotions', 'ends_at_utc'),
  ('promotions', 'per_customer_limit'),
  ('promotions', 'usage_limit'),
  ('promotions', 'status'),
  ('carts', 'id'),
  ('carts', 'customer_id'),
  ('carts', 'created_at_utc'),
  ('carts', 'updated_at_utc'),
  ('carts', 'created_by'),
  ('carts', 'updated_by'),
  ('cart_items', 'id'),
  ('cart_items', 'cart_id'),
  ('cart_items', 'spa_service_id'),
  ('cart_items', 'service_package_id'),
  ('cart_items', 'unit_price'),
  ('cart_items', 'added_at_utc'),
  ('orders', 'id'),
  ('orders', 'code'),
  ('orders', 'customer_id'),
  ('orders', 'subtotal'),
  ('orders', 'discount_total'),
  ('orders', 'grand_total'),
  ('orders', 'status'),
  ('orders', 'note'),
  ('orders', 'payment_due_at_utc'),
  ('orders', 'created_at_utc'),
  ('orders', 'updated_at_utc'),
  ('orders', 'idempotency_key'),
  ('orders', 'created_by'),
  ('orders', 'updated_by'),
  ('order_items', 'id'),
  ('order_items', 'order_id'),
  ('order_items', 'spa_service_id'),
  ('order_items', 'service_package_id'),
  ('order_items', 'product_name'),
  ('order_items', 'unit_price'),
  ('order_items', 'line_total'),
  ('order_items', 'note'),
  ('order_items', 'discount_amount'),
  ('payments', 'id'),
  ('payments', 'order_id'),
  ('payments', 'provider'),
  ('payments', 'amount'),
  ('payments', 'status'),
  ('payments', 'request_code'),
  ('payments', 'provider_transaction_id'),
  ('payments', 'payment_url'),
  ('payments', 'expires_at_utc'),
  ('payments', 'paid_at_utc'),
  ('payments', 'updated_at_utc'),
  ('payments', 'created_at_utc'),
  ('payments', 'created_by'),
  ('payments', 'updated_by'),
  ('promotion_redemptions', 'id'),
  ('promotion_redemptions', 'order_id'),
  ('promotion_redemptions', 'promotion_id'),
  ('promotion_redemptions', 'promotion_code'),
  ('promotion_redemptions', 'discount_amount'),
  ('promotion_redemptions', 'redeemed_at_utc'),
  ('service_entitlements', 'id'),
  ('service_entitlements', 'order_item_id'),
  ('service_entitlements', 'expires_at_utc'),
  ('service_entitlements', 'status'),
  ('service_entitlements', 'customer_id'),
  ('customer_packages', 'id'),
  ('customer_packages', 'order_item_id'),
  ('customer_packages', 'package_name'),
  ('customer_packages', 'purchased_at_utc'),
  ('customer_packages', 'activated_at_utc'),
  ('customer_packages', 'expires_at_utc'),
  ('customer_packages', 'status'),
  ('customer_packages', 'customer_id'),
  ('customer_packages', 'total_sessions'),
  ('customer_packages', 'used_sessions'),
  ('treatment_plans', 'id'),
  ('treatment_plans', 'customer_package_id'),
  ('treatment_plans', 'primary_staff_member_id'),
  ('treatment_plans', 'start_date'),
  ('treatment_plans', 'expected_end_date'),
  ('treatment_plans', 'actual_end_date'),
  ('treatment_plans', 'goal'),
  ('treatment_plans', 'status'),
  ('treatment_plans', 'note'),
  ('treatment_sessions', 'id'),
  ('treatment_sessions', 'treatment_plan_id'),
  ('treatment_sessions', 'spa_service_id'),
  ('treatment_sessions', 'sequence_number'),
  ('treatment_sessions', 'service_name'),
  ('treatment_sessions', 'duration_minutes'),
  ('treatment_sessions', 'status'),
  ('treatment_sessions', 'note'),
  ('treatment_sessions', 'completed_at_utc'),
  ('appointments', 'id'),
  ('appointments', 'customer_id'),
  ('appointments', 'staff_member_id'),
  ('appointments', 'service_entitlement_id'),
  ('appointments', 'treatment_session_id'),
  ('appointments', 'order_item_id'),
  ('appointments', 'hold_expires_at_utc'),
  ('appointments', 'date'),
  ('appointments', 'start_time'),
  ('appointments', 'end_time'),
  ('appointments', 'status'),
  ('appointments', 'cancelled_at_utc'),
  ('appointments', 'cancellation_reason'),
  ('appointments', 'note'),
  ('appointments', 'created_at_utc'),
  ('skin_profiles', 'id'),
  ('skin_profiles', 'customer_id'),
  ('skin_profiles', 'assessed_by_staff_member_id'),
  ('skin_profiles', 'appointment_id'),
  ('skin_profiles', 'assessed_at_utc'),
  ('skin_profiles', 'skin_type'),
  ('skin_profiles', 'main_concerns'),
  ('skin_profiles', 'current_products'),
  ('skin_profiles', 'care_goals'),
  ('skin_profiles', 'recommended_treatment'),
  ('skin_profiles', 'note'),
  ('skin_profiles', 'created_at_utc'),
  ('skin_profiles', 'updated_at_utc'),
  ('skin_profiles', 'created_by'),
  ('skin_profiles', 'updated_by'),
  ('customer_allergies', 'id'),
  ('customer_allergies', 'customer_id'),
  ('customer_allergies', 'allergen'),
  ('customer_allergies', 'severity'),
  ('customer_allergies', 'note'),
  ('customer_allergies', 'recorded_at_utc'),
  ('reviews', 'id'),
  ('reviews', 'customer_id'),
  ('reviews', 'spa_service_id'),
  ('reviews', 'service_package_id'),
  ('reviews', 'comment'),
  ('reviews', 'owner_reply'),
  ('reviews', 'replied_at_utc'),
  ('reviews', 'rating'),
  ('reviews', 'image_url'),
  ('reviews', 'status'),
  ('reviews', 'created_at_utc'),
  ('reviews', 'updated_at_utc'),
  ('reviews', 'created_by'),
  ('reviews', 'updated_by'),
  ('ai_chat_messages', 'id'),
  ('ai_chat_messages', 'customer_id'),
  ('ai_chat_messages', 'question'),
  ('ai_chat_messages', 'answer'),
  ('ai_chat_messages', 'created_at_utc'),
  ('notifications', 'id'),
  ('notifications', 'user_id'),
  ('notifications', 'title'),
  ('notifications', 'body'),
  ('notifications', 'type'),
  ('notifications', 'read_at_utc'),
  ('notifications', 'created_at_utc');
DO $$ DECLARE missing text; BEGIN
  SELECT string_agg(table_name || '.' || column_name, ', ') INTO missing FROM information_schema.columns c
  WHERE table_schema = 'public' AND table_name NOT IN ('__EFMigrationsHistory', 'otp_codes', 'refresh_tokens', 'spa_profiles')
    AND NOT EXISTS (SELECT 1 FROM _map m WHERE m.t = c.table_name AND m.c = c.column_name);
  IF missing IS NOT NULL THEN RAISE EXCEPTION 'Cột chưa có trong data_db.py: %', missing; END IF;
END $$;

-- Bảng không có trong ERD.
DROP TABLE IF EXISTS "__EFMigrationsHistory";
DROP TABLE "otp_codes" CASCADE;
DROP TABLE "refresh_tokens" CASCADE;
DROP TABLE "spa_profiles" CASCADE;

-- users → NguoiDung
ALTER TABLE "users" DROP COLUMN "created_by" CASCADE;  -- không có trong ERD
ALTER TABLE "users" DROP COLUMN "updated_by" CASCADE;  -- không có trong ERD
ALTER TABLE "users" RENAME COLUMN "id" TO "maNguoiDung";
ALTER TABLE "users" RENAME COLUMN "full_name" TO "hoTen";
ALTER TABLE "users" RENAME COLUMN "phone_number" TO "SDT";
ALTER TABLE "users" RENAME COLUMN "password_hash" TO "matKhauHash";
ALTER TABLE "users" RENAME COLUMN "role" TO "vaiTro";
ALTER TABLE "users" RENAME COLUMN "avatar_url" TO "anhDaiDien";
ALTER TABLE "users" RENAME COLUMN "status" TO "trangThai";
ALTER TABLE "users" RENAME COLUMN "date_of_birth" TO "ngaySinh";
ALTER TABLE "users" RENAME COLUMN "gender" TO "gioiTinh";
ALTER TABLE "users" RENAME COLUMN "created_at_utc" TO "ngayTao";
ALTER TABLE "users" RENAME COLUMN "updated_at_utc" TO "ngayCapNhat";
ALTER TABLE "users" RENAME TO "NguoiDung";

-- owner_profiles → ChuSpa
ALTER TABLE "owner_profiles" RENAME COLUMN "id" TO "maNguoiDung";
ALTER TABLE "owner_profiles" RENAME COLUMN "note" TO "ghiChu";
ALTER TABLE "owner_profiles" RENAME TO "ChuSpa";

-- customers → KhachHang
ALTER TABLE "customers" RENAME COLUMN "id" TO "maNguoiDung";
ALTER TABLE "customers" RENAME COLUMN "note" TO "ghiChu";
ALTER TABLE "customers" RENAME TO "KhachHang";

-- staff_members → NhanVien
ALTER TABLE "staff_members" RENAME COLUMN "id" TO "maNguoiDung";
ALTER TABLE "staff_members" RENAME COLUMN "hire_date" TO "ngayVaoLam";
ALTER TABLE "staff_members" RENAME COLUMN "specialty" TO "chuyenMon";
ALTER TABLE "staff_members" RENAME COLUMN "resignation_date" TO "ngayNghiViec";
ALTER TABLE "staff_members" RENAME TO "NhanVien";

-- spa_services → DichVu
ALTER TABLE "spa_services" DROP COLUMN "created_by" CASCADE;  -- không có trong ERD
ALTER TABLE "spa_services" DROP COLUMN "updated_by" CASCADE;  -- không có trong ERD
ALTER TABLE "spa_services" RENAME COLUMN "name" TO "tenDichVu";
ALTER TABLE "spa_services" RENAME COLUMN "category" TO "loaiDichVu";
ALTER TABLE "spa_services" RENAME COLUMN "description" TO "moTa";
ALTER TABLE "spa_services" RENAME COLUMN "duration_minutes" TO "thoiLuongPhut";
ALTER TABLE "spa_services" RENAME COLUMN "price" TO "gia";
ALTER TABLE "spa_services" RENAME COLUMN "image_url" TO "hinhAnh";
ALTER TABLE "spa_services" RENAME COLUMN "status" TO "trangThai";
ALTER TABLE "spa_services" RENAME COLUMN "created_at_utc" TO "ngayTao";
ALTER TABLE "spa_services" RENAME COLUMN "updated_at_utc" TO "ngayCapNhat";
ALTER TABLE "spa_services" RENAME TO "DichVu";

-- service_packages → GoiDichVu
ALTER TABLE "service_packages" DROP COLUMN "created_by" CASCADE;  -- không có trong ERD
ALTER TABLE "service_packages" DROP COLUMN "updated_by" CASCADE;  -- không có trong ERD
ALTER TABLE "service_packages" RENAME COLUMN "name" TO "tenGoiDichVu";
ALTER TABLE "service_packages" RENAME COLUMN "description" TO "moTa";
ALTER TABLE "service_packages" RENAME COLUMN "price" TO "gia";
ALTER TABLE "service_packages" RENAME COLUMN "validity_days" TO "thoiHanNgay";
ALTER TABLE "service_packages" RENAME COLUMN "status" TO "trangThai";
ALTER TABLE "service_packages" RENAME COLUMN "sale_start_date" TO "ngayBatDauBan";
ALTER TABLE "service_packages" RENAME COLUMN "sale_end_date" TO "ngayKetThucBan";
ALTER TABLE "service_packages" RENAME COLUMN "image_url" TO "hinhAnh";
ALTER TABLE "service_packages" RENAME COLUMN "created_at_utc" TO "ngayTao";
ALTER TABLE "service_packages" RENAME COLUMN "updated_at_utc" TO "ngayCapNhat";
ALTER TABLE "service_packages" RENAME TO "GoiDichVu";

-- service_package_items → GoiDichVuChiTiet
ALTER TABLE "service_package_items" RENAME COLUMN "spa_service_id" TO "idDichVu";
ALTER TABLE "service_package_items" RENAME COLUMN "service_package_id" TO "idGoiDichVu";
ALTER TABLE "service_package_items" RENAME COLUMN "session_count" TO "soBuoi";
ALTER TABLE "service_package_items" RENAME COLUMN "min_days_between_sessions" TO "khoangCachNgayToiThieu";
ALTER TABLE "service_package_items" RENAME COLUMN "sort_order" TO "thuTu";
ALTER TABLE "service_package_items" RENAME COLUMN "note" TO "ghiChu";
ALTER TABLE "service_package_items" RENAME TO "GoiDichVuChiTiet";

-- staff_skills → NhanVien_DichVu
ALTER TABLE "staff_skills" RENAME COLUMN "staff_member_id" TO "idNhanVien";
ALTER TABLE "staff_skills" RENAME COLUMN "spa_service_id" TO "idDichVu";
ALTER TABLE "staff_skills" RENAME TO "NhanVien_DichVu";

-- work_schedules → LichLamViec
ALTER TABLE "work_schedules" RENAME COLUMN "staff_member_id" TO "idNhanVien";
ALTER TABLE "work_schedules" RENAME COLUMN "date" TO "ngay";
ALTER TABLE "work_schedules" RENAME COLUMN "start_time" TO "gioBatDau";
ALTER TABLE "work_schedules" RENAME COLUMN "end_time" TO "gioKetThuc";
ALTER TABLE "work_schedules" RENAME COLUMN "status" TO "trangThai";
ALTER TABLE "work_schedules" RENAME TO "LichLamViec";

-- promotions → KhuyenMai
ALTER TABLE "promotions" RENAME COLUMN "code" TO "maCode";
ALTER TABLE "promotions" RENAME COLUMN "description" TO "moTa";
ALTER TABLE "promotions" RENAME COLUMN "discount_type" TO "loaiGiamGia";
ALTER TABLE "promotions" RENAME COLUMN "discount_value" TO "giaTri";
ALTER TABLE "promotions" RENAME COLUMN "min_order_amount" TO "giaTriDonHangToiThieu";
ALTER TABLE "promotions" RENAME COLUMN "max_discount_amount" TO "giaTriGiamToiDa";
ALTER TABLE "promotions" RENAME COLUMN "starts_at_utc" TO "ngayBatDau";
ALTER TABLE "promotions" RENAME COLUMN "ends_at_utc" TO "ngayKetThuc";
ALTER TABLE "promotions" RENAME COLUMN "per_customer_limit" TO "gioiHanMoiKhach";
ALTER TABLE "promotions" RENAME COLUMN "usage_limit" TO "soLuong";
ALTER TABLE "promotions" RENAME COLUMN "status" TO "trangThai";
ALTER TABLE "promotions" RENAME TO "KhuyenMai";

-- carts → GioHang
ALTER TABLE "carts" DROP COLUMN "created_by" CASCADE;  -- không có trong ERD
ALTER TABLE "carts" DROP COLUMN "updated_by" CASCADE;  -- không có trong ERD
ALTER TABLE "carts" RENAME COLUMN "customer_id" TO "idKhachHang";
ALTER TABLE "carts" RENAME COLUMN "created_at_utc" TO "ngayTao";
ALTER TABLE "carts" RENAME COLUMN "updated_at_utc" TO "ngayCapNhat";
ALTER TABLE "carts" RENAME TO "GioHang";

-- cart_items → ChiTietGioHang
ALTER TABLE "cart_items" RENAME COLUMN "cart_id" TO "idGioHang";
ALTER TABLE "cart_items" RENAME COLUMN "spa_service_id" TO "idDichVu";
ALTER TABLE "cart_items" RENAME COLUMN "service_package_id" TO "idGoiDichVu";
ALTER TABLE "cart_items" RENAME COLUMN "unit_price" TO "donGia";
ALTER TABLE "cart_items" RENAME COLUMN "added_at_utc" TO "ngayThem";
ALTER TABLE "cart_items" RENAME TO "ChiTietGioHang";

-- orders → DonHang
ALTER TABLE "orders" DROP COLUMN "idempotency_key" CASCADE;  -- không có trong ERD
ALTER TABLE "orders" DROP COLUMN "created_by" CASCADE;  -- không có trong ERD
ALTER TABLE "orders" DROP COLUMN "updated_by" CASCADE;  -- không có trong ERD
ALTER TABLE "orders" RENAME COLUMN "code" TO "maDonHang";
ALTER TABLE "orders" RENAME COLUMN "customer_id" TO "idKhachHang";
ALTER TABLE "orders" RENAME COLUMN "subtotal" TO "tongTienHang";
ALTER TABLE "orders" RENAME COLUMN "discount_total" TO "tongGiamGia";
ALTER TABLE "orders" RENAME COLUMN "grand_total" TO "tongThanhToan";
ALTER TABLE "orders" RENAME COLUMN "status" TO "trangThai";
ALTER TABLE "orders" RENAME COLUMN "note" TO "ghiChu";
ALTER TABLE "orders" RENAME COLUMN "payment_due_at_utc" TO "hetHanThanhToanLuc";
ALTER TABLE "orders" RENAME COLUMN "created_at_utc" TO "ngayTaoDonHang";
ALTER TABLE "orders" RENAME COLUMN "updated_at_utc" TO "ngayCapNhatDonHang";
ALTER TABLE "orders" RENAME TO "DonHang";

-- order_items → ChiTietDonHang
ALTER TABLE "order_items" DROP COLUMN "discount_amount" CASCADE;  -- không có trong ERD
ALTER TABLE "order_items" RENAME COLUMN "order_id" TO "idDonHang";
ALTER TABLE "order_items" RENAME COLUMN "spa_service_id" TO "idDichVu";
ALTER TABLE "order_items" RENAME COLUMN "service_package_id" TO "idGoiDichVu";
ALTER TABLE "order_items" RENAME COLUMN "product_name" TO "tenSanPham";
ALTER TABLE "order_items" RENAME COLUMN "unit_price" TO "donGia";
ALTER TABLE "order_items" RENAME COLUMN "line_total" TO "thanhTien";
ALTER TABLE "order_items" RENAME COLUMN "note" TO "ghiChu";
ALTER TABLE "order_items" RENAME TO "ChiTietDonHang";

-- payments → ThanhToan
ALTER TABLE "payments" DROP COLUMN "created_at_utc" CASCADE;  -- không có trong ERD
ALTER TABLE "payments" DROP COLUMN "created_by" CASCADE;  -- không có trong ERD
ALTER TABLE "payments" DROP COLUMN "updated_by" CASCADE;  -- không có trong ERD
ALTER TABLE "payments" RENAME COLUMN "order_id" TO "idDonHang";
ALTER TABLE "payments" RENAME COLUMN "provider" TO "nhaCungCap";
ALTER TABLE "payments" RENAME COLUMN "amount" TO "soTien";
ALTER TABLE "payments" RENAME COLUMN "status" TO "trangThai";
ALTER TABLE "payments" RENAME COLUMN "request_code" TO "maYeuCau";
ALTER TABLE "payments" RENAME COLUMN "provider_transaction_id" TO "maGiaoDich";
ALTER TABLE "payments" RENAME COLUMN "payment_url" TO "paymentUrl";
ALTER TABLE "payments" RENAME COLUMN "expires_at_utc" TO "thoiGianHetHanPhien";
ALTER TABLE "payments" RENAME COLUMN "paid_at_utc" TO "thoiGianThanhToan";
ALTER TABLE "payments" RENAME COLUMN "updated_at_utc" TO "ngayCapNhatThanhToan";
ALTER TABLE "payments" RENAME TO "ThanhToan";

-- promotion_redemptions → ApDungKhuyenMai
ALTER TABLE "promotion_redemptions" RENAME COLUMN "order_id" TO "idDonHang";
ALTER TABLE "promotion_redemptions" RENAME COLUMN "promotion_id" TO "idKhuyenMai";
ALTER TABLE "promotion_redemptions" RENAME COLUMN "promotion_code" TO "maKhuyenMai";
ALTER TABLE "promotion_redemptions" RENAME COLUMN "discount_amount" TO "soTienGiam";
ALTER TABLE "promotion_redemptions" RENAME COLUMN "redeemed_at_utc" TO "ngaySuDung";
ALTER TABLE "promotion_redemptions" RENAME TO "ApDungKhuyenMai";

-- service_entitlements → DichVuKhachHang
ALTER TABLE "service_entitlements" DROP COLUMN "customer_id" CASCADE;  -- không có trong ERD
ALTER TABLE "service_entitlements" RENAME COLUMN "order_item_id" TO "idChiTietDonHang";
ALTER TABLE "service_entitlements" RENAME COLUMN "expires_at_utc" TO "ngayHetHan";
ALTER TABLE "service_entitlements" RENAME COLUMN "status" TO "trangThai";
ALTER TABLE "service_entitlements" RENAME TO "DichVuKhachHang";

-- customer_packages → GoiKhachHang
ALTER TABLE "customer_packages" DROP COLUMN "customer_id" CASCADE;  -- không có trong ERD
ALTER TABLE "customer_packages" DROP COLUMN "total_sessions" CASCADE;  -- không có trong ERD
ALTER TABLE "customer_packages" DROP COLUMN "used_sessions" CASCADE;  -- không có trong ERD
ALTER TABLE "customer_packages" RENAME COLUMN "order_item_id" TO "idChiTietDonHang";
ALTER TABLE "customer_packages" RENAME COLUMN "package_name" TO "tenGoi";
ALTER TABLE "customer_packages" RENAME COLUMN "purchased_at_utc" TO "ngayMua";
ALTER TABLE "customer_packages" RENAME COLUMN "activated_at_utc" TO "ngayKichHoat";
ALTER TABLE "customer_packages" RENAME COLUMN "expires_at_utc" TO "ngayHetHan";
ALTER TABLE "customer_packages" RENAME COLUMN "status" TO "trangThai";
ALTER TABLE "customer_packages" RENAME TO "GoiKhachHang";

-- treatment_plans → LieuTrinh
ALTER TABLE "treatment_plans" RENAME COLUMN "customer_package_id" TO "idGoiKhachHang";
ALTER TABLE "treatment_plans" RENAME COLUMN "primary_staff_member_id" TO "idNhanVienPhuTrach";
ALTER TABLE "treatment_plans" RENAME COLUMN "start_date" TO "ngayBatDau";
ALTER TABLE "treatment_plans" RENAME COLUMN "expected_end_date" TO "ngayKetThucDuKien";
ALTER TABLE "treatment_plans" RENAME COLUMN "actual_end_date" TO "ngayKetThucThucTe";
ALTER TABLE "treatment_plans" RENAME COLUMN "goal" TO "mucTieu";
ALTER TABLE "treatment_plans" RENAME COLUMN "status" TO "trangThai";
ALTER TABLE "treatment_plans" RENAME COLUMN "note" TO "ghiChu";
ALTER TABLE "treatment_plans" RENAME TO "LieuTrinh";

-- treatment_sessions → BuoiChamSoc
ALTER TABLE "treatment_sessions" RENAME COLUMN "treatment_plan_id" TO "idLieuTrinh";
ALTER TABLE "treatment_sessions" RENAME COLUMN "spa_service_id" TO "idDichVu";
ALTER TABLE "treatment_sessions" RENAME COLUMN "sequence_number" TO "thuTu";
ALTER TABLE "treatment_sessions" RENAME COLUMN "service_name" TO "tenDichVu";
ALTER TABLE "treatment_sessions" RENAME COLUMN "duration_minutes" TO "thoiLuongPhut";
ALTER TABLE "treatment_sessions" RENAME COLUMN "status" TO "trangThai";
ALTER TABLE "treatment_sessions" RENAME COLUMN "note" TO "ghiChu";
ALTER TABLE "treatment_sessions" RENAME COLUMN "completed_at_utc" TO "ngayHoanThanh";
ALTER TABLE "treatment_sessions" RENAME TO "BuoiChamSoc";

-- appointments → LichHen
ALTER TABLE "appointments" RENAME COLUMN "customer_id" TO "idKhachHang";
ALTER TABLE "appointments" RENAME COLUMN "staff_member_id" TO "idNhanVien";
ALTER TABLE "appointments" RENAME COLUMN "service_entitlement_id" TO "idDichVuKhachHang";
ALTER TABLE "appointments" RENAME COLUMN "treatment_session_id" TO "idBuoiChamSoc";
ALTER TABLE "appointments" RENAME COLUMN "order_item_id" TO "idChiTietDonHang";
ALTER TABLE "appointments" RENAME COLUMN "hold_expires_at_utc" TO "giuChoDen";
ALTER TABLE "appointments" RENAME COLUMN "date" TO "ngayHen";
ALTER TABLE "appointments" RENAME COLUMN "start_time" TO "gioBatDau";
ALTER TABLE "appointments" RENAME COLUMN "end_time" TO "gioKetThuc";
ALTER TABLE "appointments" RENAME COLUMN "status" TO "trangThai";
ALTER TABLE "appointments" RENAME COLUMN "cancelled_at_utc" TO "huyLuc";
ALTER TABLE "appointments" RENAME COLUMN "cancellation_reason" TO "lyDoHuy";
ALTER TABLE "appointments" RENAME COLUMN "note" TO "ghiChu";
ALTER TABLE "appointments" RENAME COLUMN "created_at_utc" TO "ngayTao";
ALTER TABLE "appointments" RENAME TO "LichHen";

-- skin_profiles → HoSoDa
ALTER TABLE "skin_profiles" DROP COLUMN "created_by" CASCADE;  -- không có trong ERD
ALTER TABLE "skin_profiles" DROP COLUMN "updated_by" CASCADE;  -- không có trong ERD
ALTER TABLE "skin_profiles" RENAME COLUMN "customer_id" TO "idKhachHang";
ALTER TABLE "skin_profiles" RENAME COLUMN "assessed_by_staff_member_id" TO "idNhanVienDanhGia";
ALTER TABLE "skin_profiles" RENAME COLUMN "appointment_id" TO "idLichHen";
ALTER TABLE "skin_profiles" RENAME COLUMN "assessed_at_utc" TO "ngayDanhGia";
ALTER TABLE "skin_profiles" RENAME COLUMN "skin_type" TO "loaiDa";
ALTER TABLE "skin_profiles" RENAME COLUMN "main_concerns" TO "vanDeChinh";
ALTER TABLE "skin_profiles" RENAME COLUMN "current_products" TO "sanPhamDangDung";
ALTER TABLE "skin_profiles" RENAME COLUMN "care_goals" TO "mucTieuChamSoc";
ALTER TABLE "skin_profiles" RENAME COLUMN "recommended_treatment" TO "deXuatDieuTri";
ALTER TABLE "skin_profiles" RENAME COLUMN "note" TO "ghiChu";
ALTER TABLE "skin_profiles" RENAME COLUMN "created_at_utc" TO "ngayTao";
ALTER TABLE "skin_profiles" RENAME COLUMN "updated_at_utc" TO "ngayCapNhat";
ALTER TABLE "skin_profiles" RENAME TO "HoSoDa";

-- customer_allergies → DiUngKhachHang
ALTER TABLE "customer_allergies" RENAME COLUMN "customer_id" TO "idKhachHang";
ALTER TABLE "customer_allergies" RENAME COLUMN "allergen" TO "tacNhan";
ALTER TABLE "customer_allergies" RENAME COLUMN "severity" TO "mucDo";
ALTER TABLE "customer_allergies" RENAME COLUMN "note" TO "ghiChu";
ALTER TABLE "customer_allergies" RENAME COLUMN "recorded_at_utc" TO "ngayGhiNhan";
ALTER TABLE "customer_allergies" RENAME TO "DiUngKhachHang";

-- reviews → DanhGia
ALTER TABLE "reviews" DROP COLUMN "created_by" CASCADE;  -- không có trong ERD
ALTER TABLE "reviews" DROP COLUMN "updated_by" CASCADE;  -- không có trong ERD
ALTER TABLE "reviews" RENAME COLUMN "customer_id" TO "idKhachHang";
ALTER TABLE "reviews" RENAME COLUMN "spa_service_id" TO "idDichVu";
ALTER TABLE "reviews" RENAME COLUMN "service_package_id" TO "idGoiDichVu";
ALTER TABLE "reviews" RENAME COLUMN "comment" TO "noiDungDanhGia";
ALTER TABLE "reviews" RENAME COLUMN "owner_reply" TO "phanHoiTuSpa";
ALTER TABLE "reviews" RENAME COLUMN "replied_at_utc" TO "phanHoiLuc";
ALTER TABLE "reviews" RENAME COLUMN "rating" TO "soSao";
ALTER TABLE "reviews" RENAME COLUMN "image_url" TO "hinhAnh";
ALTER TABLE "reviews" RENAME COLUMN "status" TO "trangThai";
ALTER TABLE "reviews" RENAME COLUMN "created_at_utc" TO "ngayTao";
ALTER TABLE "reviews" RENAME COLUMN "updated_at_utc" TO "ngayCapNhat";
ALTER TABLE "reviews" RENAME TO "DanhGia";

-- ai_chat_messages → LichSuTroChuyenAI
ALTER TABLE "ai_chat_messages" RENAME COLUMN "customer_id" TO "idKhachHang";
ALTER TABLE "ai_chat_messages" RENAME COLUMN "question" TO "cauHoi";
ALTER TABLE "ai_chat_messages" RENAME COLUMN "answer" TO "cauTraLoi";
ALTER TABLE "ai_chat_messages" RENAME COLUMN "created_at_utc" TO "thoiGian";
ALTER TABLE "ai_chat_messages" RENAME TO "LichSuTroChuyenAI";

-- notifications → ThongBao
ALTER TABLE "notifications" RENAME COLUMN "user_id" TO "idNguoiDung";
ALTER TABLE "notifications" RENAME COLUMN "title" TO "tieuDe";
ALTER TABLE "notifications" RENAME COLUMN "body" TO "noiDung";
ALTER TABLE "notifications" RENAME COLUMN "type" TO "loai";
ALTER TABLE "notifications" RENAME COLUMN "read_at_utc" TO "docLuc";
ALTER TABLE "notifications" RENAME COLUMN "created_at_utc" TO "ngayTao";
ALTER TABLE "notifications" RENAME TO "ThongBao";

DO $$ DECLARE r record; base text; candidate text; n int; BEGIN
  FOR r IN SELECT con.oid, con.conname, con.contype, rel.relname,
      (SELECT string_agg(a.attname, '_' ORDER BY k.ord) FROM unnest(con.conkey) WITH ORDINALITY k(attnum, ord)
         JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = k.attnum) AS cols
    FROM pg_constraint con JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace ns ON ns.oid = rel.relnamespace WHERE ns.nspname = 'public' AND con.contype IN ('p','f','u','c','x')
    ORDER BY rel.relname, con.conname LOOP
    base := CASE r.contype WHEN 'p' THEN 'pk_' || r.relname
      WHEN 'x' THEN 'ex_' || r.relname || '_khongTrungLich'
      ELSE (CASE r.contype WHEN 'f' THEN 'fk_' WHEN 'u' THEN 'uq_' ELSE 'ck_' END) || r.relname || coalesce('_' || r.cols, '') END;
    base := left(base, 60); candidate := base; n := 1;
    WHILE EXISTS (SELECT 1 FROM pg_constraint WHERE conname = candidate AND oid <> r.oid)
       OR EXISTS (SELECT 1 FROM pg_class WHERE relname = candidate) LOOP
      n := n + 1; candidate := base || '_' || n; END LOOP;
    IF candidate <> r.conname THEN
      EXECUTE format('ALTER TABLE %I RENAME CONSTRAINT %I TO %I', r.relname, r.conname, candidate); END IF;
  END LOOP;
  FOR r IN SELECT ic.relname AS idx, t.relname,
      (SELECT string_agg(coalesce(a.attname, 'expr'), '_' ORDER BY k.ord) FROM unnest(i.indkey) WITH ORDINALITY k(attnum, ord)
         LEFT JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum) AS cols
    FROM pg_index i JOIN pg_class ic ON ic.oid = i.indexrelid JOIN pg_class t ON t.oid = i.indrelid
    JOIN pg_namespace ns ON ns.oid = t.relnamespace
    WHERE ns.nspname = 'public' AND NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conindid = i.indexrelid)
    ORDER BY t.relname, ic.relname LOOP
    base := left('ix_' || r.relname || '_' || r.cols, 60); candidate := base; n := 1;
    WHILE EXISTS (SELECT 1 FROM pg_class WHERE relname = candidate AND relname <> r.idx)
       OR EXISTS (SELECT 1 FROM pg_constraint WHERE conname = candidate) LOOP
      n := n + 1; candidate := base || '_' || n; END LOOP;
    IF candidate <> r.idx THEN EXECUTE format('ALTER INDEX %I RENAME TO %I', r.idx, candidate); END IF;
  END LOOP;
END $$;

-- Kết quả phải đúng bằng ERD.
CREATE TEMP TABLE _erd(t text, c text) ON COMMIT DROP;
INSERT INTO _erd VALUES
  ('NguoiDung', 'maNguoiDung'),
  ('NguoiDung', 'hoTen'),
  ('NguoiDung', 'email'),
  ('NguoiDung', 'SDT'),
  ('NguoiDung', 'matKhauHash'),
  ('NguoiDung', 'vaiTro'),
  ('NguoiDung', 'anhDaiDien'),
  ('NguoiDung', 'trangThai'),
  ('NguoiDung', 'ngaySinh'),
  ('NguoiDung', 'gioiTinh'),
  ('NguoiDung', 'ngayTao'),
  ('NguoiDung', 'ngayCapNhat'),
  ('ChuSpa', 'maNguoiDung'),
  ('ChuSpa', 'ghiChu'),
  ('KhachHang', 'maNguoiDung'),
  ('KhachHang', 'ghiChu'),
  ('NhanVien', 'maNguoiDung'),
  ('NhanVien', 'ngayVaoLam'),
  ('NhanVien', 'chuyenMon'),
  ('NhanVien', 'ngayNghiViec'),
  ('NhanVien_DichVu', 'idNhanVien'),
  ('NhanVien_DichVu', 'idDichVu'),
  ('LichLamViec', 'id'),
  ('LichLamViec', 'idNhanVien'),
  ('LichLamViec', 'ngay'),
  ('LichLamViec', 'gioBatDau'),
  ('LichLamViec', 'gioKetThuc'),
  ('LichLamViec', 'trangThai'),
  ('DichVu', 'id'),
  ('DichVu', 'tenDichVu'),
  ('DichVu', 'loaiDichVu'),
  ('DichVu', 'moTa'),
  ('DichVu', 'thoiLuongPhut'),
  ('DichVu', 'gia'),
  ('DichVu', 'hinhAnh'),
  ('DichVu', 'trangThai'),
  ('DichVu', 'ngayTao'),
  ('DichVu', 'ngayCapNhat'),
  ('GoiDichVu', 'id'),
  ('GoiDichVu', 'tenGoiDichVu'),
  ('GoiDichVu', 'moTa'),
  ('GoiDichVu', 'gia'),
  ('GoiDichVu', 'thoiHanNgay'),
  ('GoiDichVu', 'trangThai'),
  ('GoiDichVu', 'ngayBatDauBan'),
  ('GoiDichVu', 'ngayKetThucBan'),
  ('GoiDichVu', 'hinhAnh'),
  ('GoiDichVu', 'ngayTao'),
  ('GoiDichVu', 'ngayCapNhat'),
  ('GoiDichVuChiTiet', 'id'),
  ('GoiDichVuChiTiet', 'idDichVu'),
  ('GoiDichVuChiTiet', 'idGoiDichVu'),
  ('GoiDichVuChiTiet', 'soBuoi'),
  ('GoiDichVuChiTiet', 'khoangCachNgayToiThieu'),
  ('GoiDichVuChiTiet', 'thuTu'),
  ('GoiDichVuChiTiet', 'ghiChu'),
  ('KhuyenMai', 'id'),
  ('KhuyenMai', 'maCode'),
  ('KhuyenMai', 'moTa'),
  ('KhuyenMai', 'loaiGiamGia'),
  ('KhuyenMai', 'giaTri'),
  ('KhuyenMai', 'giaTriDonHangToiThieu'),
  ('KhuyenMai', 'giaTriGiamToiDa'),
  ('KhuyenMai', 'ngayBatDau'),
  ('KhuyenMai', 'ngayKetThuc'),
  ('KhuyenMai', 'gioiHanMoiKhach'),
  ('KhuyenMai', 'soLuong'),
  ('KhuyenMai', 'trangThai'),
  ('ApDungKhuyenMai', 'id'),
  ('ApDungKhuyenMai', 'idDonHang'),
  ('ApDungKhuyenMai', 'idKhuyenMai'),
  ('ApDungKhuyenMai', 'maKhuyenMai'),
  ('ApDungKhuyenMai', 'soTienGiam'),
  ('ApDungKhuyenMai', 'ngaySuDung'),
  ('GioHang', 'id'),
  ('GioHang', 'idKhachHang'),
  ('GioHang', 'ngayTao'),
  ('GioHang', 'ngayCapNhat'),
  ('ChiTietGioHang', 'id'),
  ('ChiTietGioHang', 'idGioHang'),
  ('ChiTietGioHang', 'idDichVu'),
  ('ChiTietGioHang', 'idGoiDichVu'),
  ('ChiTietGioHang', 'donGia'),
  ('ChiTietGioHang', 'ngayThem'),
  ('DonHang', 'id'),
  ('DonHang', 'maDonHang'),
  ('DonHang', 'idKhachHang'),
  ('DonHang', 'tongTienHang'),
  ('DonHang', 'tongGiamGia'),
  ('DonHang', 'tongThanhToan'),
  ('DonHang', 'trangThai'),
  ('DonHang', 'ghiChu'),
  ('DonHang', 'ngayTaoDonHang'),
  ('DonHang', 'ngayCapNhatDonHang'),
  ('DonHang', 'hetHanThanhToanLuc'),
  ('ChiTietDonHang', 'id'),
  ('ChiTietDonHang', 'idDonHang'),
  ('ChiTietDonHang', 'idDichVu'),
  ('ChiTietDonHang', 'idGoiDichVu'),
  ('ChiTietDonHang', 'tenSanPham'),
  ('ChiTietDonHang', 'donGia'),
  ('ChiTietDonHang', 'thanhTien'),
  ('ChiTietDonHang', 'ghiChu'),
  ('ThanhToan', 'id'),
  ('ThanhToan', 'idDonHang'),
  ('ThanhToan', 'nhaCungCap'),
  ('ThanhToan', 'soTien'),
  ('ThanhToan', 'trangThai'),
  ('ThanhToan', 'maYeuCau'),
  ('ThanhToan', 'maGiaoDich'),
  ('ThanhToan', 'paymentUrl'),
  ('ThanhToan', 'thoiGianHetHanPhien'),
  ('ThanhToan', 'thoiGianThanhToan'),
  ('ThanhToan', 'ngayCapNhatThanhToan'),
  ('DichVuKhachHang', 'id'),
  ('DichVuKhachHang', 'idChiTietDonHang'),
  ('DichVuKhachHang', 'ngayHetHan'),
  ('DichVuKhachHang', 'trangThai'),
  ('GoiKhachHang', 'id'),
  ('GoiKhachHang', 'idChiTietDonHang'),
  ('GoiKhachHang', 'tenGoi'),
  ('GoiKhachHang', 'ngayMua'),
  ('GoiKhachHang', 'ngayKichHoat'),
  ('GoiKhachHang', 'ngayHetHan'),
  ('GoiKhachHang', 'trangThai'),
  ('LieuTrinh', 'id'),
  ('LieuTrinh', 'idGoiKhachHang'),
  ('LieuTrinh', 'idNhanVienPhuTrach'),
  ('LieuTrinh', 'ngayBatDau'),
  ('LieuTrinh', 'ngayKetThucDuKien'),
  ('LieuTrinh', 'ngayKetThucThucTe'),
  ('LieuTrinh', 'mucTieu'),
  ('LieuTrinh', 'trangThai'),
  ('LieuTrinh', 'ghiChu'),
  ('BuoiChamSoc', 'id'),
  ('BuoiChamSoc', 'idLieuTrinh'),
  ('BuoiChamSoc', 'idDichVu'),
  ('BuoiChamSoc', 'thuTu'),
  ('BuoiChamSoc', 'tenDichVu'),
  ('BuoiChamSoc', 'thoiLuongPhut'),
  ('BuoiChamSoc', 'trangThai'),
  ('BuoiChamSoc', 'ghiChu'),
  ('BuoiChamSoc', 'ngayHoanThanh'),
  ('LichHen', 'id'),
  ('LichHen', 'idKhachHang'),
  ('LichHen', 'idNhanVien'),
  ('LichHen', 'idDichVuKhachHang'),
  ('LichHen', 'idBuoiChamSoc'),
  ('LichHen', 'idChiTietDonHang'),
  ('LichHen', 'giuChoDen'),
  ('LichHen', 'ngayHen'),
  ('LichHen', 'gioBatDau'),
  ('LichHen', 'gioKetThuc'),
  ('LichHen', 'trangThai'),
  ('LichHen', 'huyLuc'),
  ('LichHen', 'lyDoHuy'),
  ('LichHen', 'ghiChu'),
  ('LichHen', 'ngayTao'),
  ('HoSoDa', 'id'),
  ('HoSoDa', 'idKhachHang'),
  ('HoSoDa', 'idNhanVienDanhGia'),
  ('HoSoDa', 'idLichHen'),
  ('HoSoDa', 'ngayDanhGia'),
  ('HoSoDa', 'loaiDa'),
  ('HoSoDa', 'vanDeChinh'),
  ('HoSoDa', 'sanPhamDangDung'),
  ('HoSoDa', 'mucTieuChamSoc'),
  ('HoSoDa', 'deXuatDieuTri'),
  ('HoSoDa', 'ghiChu'),
  ('HoSoDa', 'ngayTao'),
  ('HoSoDa', 'ngayCapNhat'),
  ('DiUngKhachHang', 'id'),
  ('DiUngKhachHang', 'idKhachHang'),
  ('DiUngKhachHang', 'tacNhan'),
  ('DiUngKhachHang', 'mucDo'),
  ('DiUngKhachHang', 'ghiChu'),
  ('DiUngKhachHang', 'ngayGhiNhan'),
  ('DanhGia', 'id'),
  ('DanhGia', 'idKhachHang'),
  ('DanhGia', 'idDichVu'),
  ('DanhGia', 'idGoiDichVu'),
  ('DanhGia', 'noiDungDanhGia'),
  ('DanhGia', 'phanHoiTuSpa'),
  ('DanhGia', 'phanHoiLuc'),
  ('DanhGia', 'soSao'),
  ('DanhGia', 'hinhAnh'),
  ('DanhGia', 'trangThai'),
  ('DanhGia', 'ngayTao'),
  ('DanhGia', 'ngayCapNhat'),
  ('LichSuTroChuyenAI', 'id'),
  ('LichSuTroChuyenAI', 'idKhachHang'),
  ('LichSuTroChuyenAI', 'cauHoi'),
  ('LichSuTroChuyenAI', 'cauTraLoi'),
  ('LichSuTroChuyenAI', 'thoiGian'),
  ('ThongBao', 'id'),
  ('ThongBao', 'idNguoiDung'),
  ('ThongBao', 'tieuDe'),
  ('ThongBao', 'noiDung'),
  ('ThongBao', 'loai'),
  ('ThongBao', 'docLuc'),
  ('ThongBao', 'ngayTao');
DO $$ DECLARE diff text; BEGIN
  SELECT string_agg(coalesce(a.t || '.' || a.c || ' (thừa)', b.t || '.' || b.c || ' (thiếu)'), ', ') INTO diff
  FROM (SELECT table_name::text t, column_name::text c FROM information_schema.columns WHERE table_schema = 'public') a
  FULL JOIN _erd b ON a.t = b.t AND a.c = b.c WHERE a.t IS NULL OR b.t IS NULL;
  IF diff IS NOT NULL THEN RAISE EXCEPTION 'Lệch ERD: %', diff; END IF;
END $$;

COMMIT;

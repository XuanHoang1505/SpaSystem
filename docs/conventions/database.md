# Quy ước CSDL (PostgreSQL + EF Core)

Mọi bảng, cột, kiểu, ràng buộc và enum đã chuẩn hóa tiếng Anh ở [data-model.md](../domain/data-model.md) (kèm tên gốc trong báo cáo DA). Entity, EF configuration và migration phải khớp file đó; đổi thiết kế thì sửa `docs/spec-source/data_db.py` rồi sinh lại.

## Công nghệ

- PostgreSQL + EF Core qua Npgsql, code-first; chỉ project `Infrastructure` tham chiếu EF Core.
- Đặt tên `snake_case` bằng package `EFCore.NamingConventions` (`UseSnakeCaseNamingConvention()`), không đặt tên cột thủ công từng thuộc tính.
- Mỗi entity có một `IEntityTypeConfiguration<T>` ở `Infrastructure/Persistence/Configurations`; `AppDbContext` gọi `ApplyConfigurationsFromAssembly`.

## Kiểu dữ liệu

| Khái niệm                          | C#                           | PostgreSQL                                     |
| ---------------------------------- | ---------------------------- | ---------------------------------------------- |
| Khóa                               | `Guid` (sinh ở Domain)       | `uuid`                                         |
| Thời điểm                          | `DateTime` UTC, tên `…AtUtc` | `timestamptz`                                  |
| Ngày, giờ lịch hẹn/ca làm (giờ VN) | `DateOnly`, `TimeOnly`       | `date`, `time`                                 |
| Tiền VND                           | `decimal`                    | `numeric(12,0)`                                |
| Phần trăm                          | `decimal`                    | `numeric(5,2)`                                 |
| Enum                               | enum C#                      | `varchar(30)` lưu chuỗi `snake_case` + `CHECK` |
| Email                              | `string`                     | `citext`                                       |
| Văn bản ngắn / dài                 | `string`                     | `varchar(n)` / `text`                          |

## Ràng buộc

- Mọi ràng buộc trong báo cáo (không âm, lớn hơn 0, `end > start`, unique) phải có ở **cả** validator lẫn CSDL (`HasCheckConstraint`, `HasIndex(...).IsUnique()`).
- Cặp cột "đúng một trong hai" (`spa_service_id` / `service_package_id` ở `cart_items`, `order_items`, `reviews`) có `CHECK (num_nonnulls(a, b) = 1)`.
- Khóa ngoại mặc định `ON DELETE RESTRICT`; chỉ `cart_items → carts` dùng `CASCADE`.
- Chống trùng lịch bằng ràng buộc `EXCLUDE` theo [ADR-0003](../decisions/ADR-0003-appointment-time-and-overlap.md).
- Không xóa cứng dữ liệu đã phát sinh giao dịch (dịch vụ, gói, nhân viên): đổi trạng thái hoặc dùng `ISoftDelete` + global query filter.

## Migration

- Tạo bằng `dotnet ef migrations add <TenPascalCase> --project backend/src/Infrastructure --startup-project backend/src/API`.
- Một migration cho một thay đổi có ý nghĩa; đọc lại SQL sinh ra (`dotnet ef migrations script`) trước khi commit.
- Không sửa migration đã áp dụng ở môi trường dùng chung; sửa bằng migration mới.
- SQL thủ công (extension `btree_gist`, `citext`, ràng buộc EXCLUDE) đặt trong migration bằng `migrationBuilder.Sql(...)`.
- Dữ liệu mẫu cho dev ở `Persistence/Seeds`, chạy có điều kiện môi trường Development; không seed tài khoản có mật khẩu cố định ở môi trường khác.

## Truy vấn

- Repository trả entity cho thao tác ghi, DTO (qua `Select`) cho thao tác đọc danh sách.
- Thao tác cạnh tranh (đặt lịch, áp mã khuyến mãi có giới hạn lượt) chạy trong giao dịch; khi cần, khóa dòng bằng `SELECT … FOR UPDATE` qua `FromSql`.

# Thống kê & báo cáo doanh thu — đặc tả

- **Nhóm:** `Reports` · **Sprint:** 3 · **Nguồn:** DA §2.2.3 (UC Xem thống kê báo cáo doanh thu, MT-5) / ĐX
- **Entity (chỉ đọc):** `Payment` (bảng `payments`), `Order` (`orders`), `OrderItem` (`order_items`), `SpaService` (`spa_services`), `ServicePackage` (`service_packages`) — xem [glossary](../domain/glossary.md), [data-model](../domain/data-model.md)
- **Trạng thái triển khai:** đã triển khai backend 01/11/2026 theo [plan](../superpowers/plans/2026-11-01-uc-spa-33-revenue-reports.md) — xem [progress.md](../progress.md)
- **Phạm vi đợt này (chỉ backend, đặc tả và duyệt 01/11/2026):** doanh thu theo kỳ (tháng/quý/năm) có tách dịch vụ lẻ/gói, doanh thu theo sản phẩm (top N), xuất Excel (SPA-API-109, Q-48). Chưa làm: KPI trang tổng quan SCR-W30 (số lịch hẹn), web và mobile.
- **Quyết định đã chốt 01/11/2026:** Q-46, Q-47, Q-49 theo mặc định; Q-48 làm xuất Excel ngay đợt này (ClosedXML, MIT, sau port `IRevenueReportExporter`).

## Use case

### UC-SPA-33 — Xem thống kê báo cáo doanh thu

| Mục            | Nội dung                                                                                                                                                            |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Actor          | Chủ spa                                                                                                                                                             |
| Mô tả          | Chủ spa xem doanh thu theo khoảng thời gian, nhóm theo tháng/quý/năm, theo loại sản phẩm (dịch vụ lẻ/gói) và theo từng sản phẩm                                     |
| Tiền điều kiện | Đã đăng nhập vai trò chủ spa (quyền `report.view`)                                                                                                                  |
| Input          | `fromDate`, `toDate` (ngày giờ VN, gồm hai đầu); `groupBy` = `month` \| `quarter` \| `year`; `productType` = `all` \| `service` \| `package`; `top` (theo sản phẩm) |
| Output         | Tổng doanh thu, số đơn, tách dịch vụ/gói, danh sách kỳ (đủ mọi kỳ trong khoảng, kỳ không có dữ liệu = 0) để vẽ biểu đồ + bảng; top sản phẩm                         |

**Luồng chính**

1. Chủ spa mở trang báo cáo (SCR-W38 / SCR-M32).
2. Client gọi `GET /reports/revenue` với khoảng mặc định (bỏ trống → từ 01/01 năm hiện tại đến hôm nay giờ VN, `groupBy=month`, `productType=all`).
3. Chủ spa chọn khoảng thời gian, cách nhóm và tiêu chí.
4. Hệ thống tính doanh thu theo BR-RPT-01, trả tổng + từng kỳ; client vẽ biểu đồ cột và bảng số liệu.
5. Client gọi `GET /reports/revenue/by-product` cùng khoảng để hiển thị bảng "theo dịch vụ/gói".

**Luồng rẽ nhánh**

- A1. **Không có dữ liệu** trong khoảng → 200, `totalRevenue = 0`, mọi kỳ vẫn có mặt với giá trị 0 (biểu đồ rỗng); `by-product` trả mảng rỗng.
- A2. **Kỳ bị cắt:** kỳ đầu/cuối chỉ tính phần nằm trong `[fromDate, toDate]`; mỗi kỳ trả `periodStart`/`periodEnd` đã cắt.
- A3. **Tiêu chí `service` / `package`:** chỉ cộng `order_items.line_total` của dòng loại đó; `orderCount` = số đơn có ít nhất một dòng loại đó.
- A4. **Tiền đã thu nhưng không ghi nhận doanh thu** (thanh toán thành công trên đơn đã hủy/hết hạn, hoặc lần thành công thứ hai của cùng đơn — cần hoàn tiền thủ công, Q-20) → không cộng vào doanh thu, trả riêng ở `unrecognizedPayments { count, amount }` (Q-46).
- A5. **Xuất Excel** (SPA-API-109): chủ spa chọn "Xuất Excel" → client gọi `GET /reports/revenue/export` cùng `fromDate`, `toDate`, `groupBy`, `productType` → hệ thống trả file `.xlsx` (BR-RPT-05). Không có dữ liệu vẫn trả file với các kỳ bằng 0 và sheet sản phẩm chỉ có tiêu đề.

**Ngoại lệ**

- E1. Ngày ngoài năm 2000–2100, chỉ có `fromDate` mà sau hôm nay (lỗi ở `FromDate`), `fromDate > toDate`, khoảng dài hơn `Reports:MaxRangeYears` năm, `groupBy`/`productType` không hợp lệ, `top` ngoài `1…Reports:MaxTopProducts` → `400 validation_error` (có `field`).
- E2. Không Bearer → `401 unauthorized`; khách hàng/nhân viên → `403 forbidden` (UAT-28).

**Quy tắc áp dụng:** BR-RPT-01, BR-RPT-02, BR-RPT-03, BR-RPT-04, BR-RPT-05

## Business rules

| Mã        | Quy tắc                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Enforce ở đâu                                   | Nguồn             |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ----------------- |
| BR-RPT-01 | Doanh thu = Σ `payments.amount` của lần thanh toán `succeeded` **được ghi nhận**, xếp kỳ theo `paid_at_utc` đổi sang ngày giờ VN. Lần được ghi nhận: lần `succeeded` có `paid_at_utc` sớm nhất của một đơn đang `paid` (Q-46). Tách dịch vụ/gói và theo sản phẩm bằng `order_items.line_total` của đơn đó (Σ `line_total` = `grand_total` = `amount`). Đơn 0 đ không có thanh toán → không tính (Q-47)                                                                                                                 | Application + truy vấn                          | DA (MT-5) + ĐX    |
| BR-RPT-02 | Chưa có hoàn tiền trong ERD → doanh thu không trừ hoàn; tiền thành công không được ghi nhận báo riêng ở `unrecognizedPayments` để chủ spa hoàn thủ công                                                                                                                                                                                                                                                                                                                                                                | Application                                     | ĐX (RS-21)        |
| BR-RPT-03 | Khoảng thời gian gồm hai đầu theo ngày VN: `[fromDate 00:00, toDate + 1 ngày 00:00)` giờ VN; tối đa `Reports:MaxRangeYears` (5) năm, ngày trong năm 2000–2100; trả đủ mọi kỳ trong khoảng theo thứ tự thời gian. Nhãn kỳ: `MM/yyyy`, `Qn/yyyy`, `yyyy`                                                                                                                                                                                                                                                                 | Application (validator)                         | ĐX                |
| BR-RPT-04 | Doanh thu theo sản phẩm gom theo `spa_service_id` / `service_package_id`, tên hiện tại trong danh mục; `quantity` = số dòng đơn; sắp `revenue` giảm dần rồi tên; tối đa `top` dòng (mặc định 10, tối đa `Reports:MaxTopProducts` = 50)                                                                                                                                                                                                                                                                                 | Application + truy vấn                          | DA (SCR-W38) + ĐX |
| BR-RPT-05 | File Excel dùng cùng số liệu và cùng kiểm tra tham số với `GET /reports/revenue` (một service, không tính lại khác đi). 3 sheet: "Tổng quan" (khoảng, cách nhóm, tiêu chí, tổng doanh thu, dịch vụ, gói, số đơn, tiền chưa ghi nhận, thời điểm xuất giờ VN), "Theo kỳ" (kỳ, từ ngày, đến ngày, doanh thu, dịch vụ, gói, số đơn, dòng Tổng), "Theo sản phẩm" (**mọi** sản phẩm có doanh thu, không giới hạn `top`). Số tiền là số (định dạng `#,##0`), ngày `dd/MM/yyyy`; tên file `doanh-thu_<fromDate>_<toDate>.xlsx` | Application (port) + Infrastructure (ClosedXML) | DA (FL-06) + ĐX   |

## Phân quyền

| Quyền         | Vai trò | Endpoint                                                                                 |
| ------------- | ------- | ---------------------------------------------------------------------------------------- |
| `report.view` | Chủ spa | `GET /reports/revenue`, `GET /reports/revenue/by-product`, `GET /reports/revenue/export` |

Thêm `ReportView = "report.view"` vào `API/Authorization/Permissions.cs` (đúng dòng `report.view` của sheet 21, đã có trong `data_rules.py`).

## Dữ liệu

Chỉ đọc, **không đổi schema, không migration**.

| Bảng                               | Cột dùng                                                         | Ghi chú                                                    |
| ---------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------- |
| `payments`                         | `order_id`, `amount`, `status`, `paid_at_utc`                    | Lọc theo `paid_at_utc` (đã có index)                       |
| `orders`                           | `id`, `status`                                                   | Chỉ đơn `paid` được ghi nhận                               |
| `order_items`                      | `order_id`, `spa_service_id`, `service_package_id`, `line_total` | Tách loại và theo sản phẩm                                 |
| `spa_services`, `service_packages` | `id`, `name`                                                     | Tên hiện tại cho `by-product` (không xóa cứng nên luôn có) |

Truy vấn tổng hợp chạy trong CSDL (GROUP BY trên mốc giờ VN, UTC+7 cố định), không tải từng đơn lên bộ nhớ. Đặt sau port `IRevenueReportRepository` (Application) → `RevenueReportRepository` (Infrastructure). File Excel dựng sau port `IRevenueReportExporter` (Application, nhận DTO báo cáo, trả `byte[]`) → `ClosedXmlRevenueReportExporter` (Infrastructure, gói `ClosedXML`, giấy phép MIT); Application không tham chiếu ClosedXML.

## API

Route và tên tham số theo quy ước tiếng Anh (thay `tuNgay/denNgay/nhomTheo/tieuChi` trong `data_api.py` dòng SPA-API-107/108 bằng tên dưới đây, sửa tại chỗ, không thêm/xóa dòng).

| Method | Đường dẫn                            | Vai trò | Request (query)                                                                     | Response `data`                                                                                                                                                                                                                                                                                                                              | Lỗi           |
| ------ | ------------------------------------ | ------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| GET    | `/api/v1/reports/revenue`            | Chủ spa | `fromDate?`, `toDate?` (`yyyy-MM-dd`), `groupBy?` (`month`), `productType?` (`all`) | `{ fromDate, toDate, groupBy, productType, totalRevenue, serviceRevenue, packageRevenue, orderCount, periods: [{ label, periodStart, periodEnd, revenue, serviceRevenue, packageRevenue, orderCount }], unrecognizedPayments: { count, amount } }`. Với `productType` ≠ `all`, `totalRevenue`/`revenue` = phần của loại đó, cột loại kia = 0 | 400, 401, 403 |
| GET    | `/api/v1/reports/revenue/by-product` | Chủ spa | `fromDate?`, `toDate?`, `productType?` (`all`), `top?` (10)                         | `{ fromDate, toDate, productType, items: [{ productType: service\|package, productId, productName, quantity, revenue, sharePercent }] }` — `sharePercent` = revenue / tổng doanh thu cùng tiêu chí, 1 chữ số thập phân                                                                                                                       | 400, 401, 403 |
| GET    | `/api/v1/reports/revenue/export`     | Chủ spa | cùng tham số với `/reports/revenue`                                                 | File `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `Content-Disposition: attachment; filename="doanh-thu_2026-01-01_2026-12-31.xlsx"` (không bọc envelope; lỗi vẫn trả envelope JSON)                                                                                                                                 | 400, 401, 403 |

Ví dụ: `GET /api/v1/reports/revenue?fromDate=2026-01-01&toDate=2026-12-31&groupBy=quarter` → `periods` gồm 4 phần tử `Q1/2026` … `Q4/2026`.

## Cấu hình

`appsettings.json`, mục mới `Reports` (không có secret, không biến `.env`):

| Khóa                     | Mặc định | Ý nghĩa                                        |
| ------------------------ | -------- | ---------------------------------------------- |
| `Reports:MaxRangeYears`  | 5        | Độ dài tối đa của khoảng thời gian (BR-RPT-03) |
| `Reports:MaxTopProducts` | 50       | Giá trị `top` lớn nhất (BR-RPT-04)             |

## Màn hình

| Mã      | Nền tảng | Route                     | Hành động chính                                             |
| ------- | -------- | ------------------------- | ----------------------------------------------------------- |
| SCR-W38 | Web      | `/owner/reports`          | Bộ lọc + biểu đồ theo kỳ + bảng theo dịch vụ/gói (đợt sau)  |
| SCR-M32 | Android  | `app/(owner)/reports.tsx` | Biểu đồ doanh thu tháng/quý/năm (đợt sau)                   |
| SCR-W30 | Web      | `/owner`                  | KPI doanh thu, số đơn dùng lại `/reports/revenue` (đợt sau) |

## Kiểm thử bắt buộc

Unit test (Application.Tests, NSubstitute, đồng hồ giả) cho dựng kỳ/nhãn/cắt kỳ và validator; integration test (`PostgresFixture`, Testcontainers) cho truy vấn và API.

| Mã      | Tình huống                                                                                                                                                   | Kết quả mong đợi                                                                                                                           |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| RPT-T01 | Dựng kỳ: 15/02–10/05/2026 theo tháng; 2026 theo quý; 2024–2026 theo năm                                                                                      | 4 kỳ `02/2026`…`05/2026`, kỳ đầu bắt đầu 15/02, kỳ cuối kết thúc 10/05; `Q1/2026`…`Q4/2026`; `2024`, `2025`, `2026`                        |
| RPT-T02 | Validator: `fromDate > toDate`; khoảng > 5 năm; `groupBy=week`; `productType=x`; `top=0` / `top=51`                                                          | `400 validation_error` với `field` tương ứng                                                                                               |
| RPT-T03 | Không truyền tham số (đồng hồ giả 01/11/2026 VN)                                                                                                             | `fromDate=2026-01-01`, `toDate=2026-11-01`, `groupBy=month`, 11 kỳ                                                                         |
| RPT-T04 | Đơn A (dịch vụ 300.000) và đơn B (gói 4.500.000, có giảm giá phân bổ) thanh toán thành công trong tháng 10; đơn C `pending_payment`; lần thanh toán `failed` | `totalRevenue` = A + B (theo `amount`), `serviceRevenue` + `packageRevenue` = `totalRevenue`, `orderCount = 2`; C và lần failed không tính |
| RPT-T05 | Ranh giới giờ VN: thanh toán lúc 31/10 16:59:59Z (= 23:59:59 31/10 VN) và 31/10 17:00:00Z (= 00:00 01/11 VN), `toDate=2026-10-31`, nhóm tháng                | Lần đầu vào `10/2026`, lần sau không thuộc khoảng                                                                                          |
| RPT-T06 | Thanh toán thành công trên đơn `cancelled`; hai lần `succeeded` trên cùng đơn `paid`                                                                         | Không cộng vào doanh thu; đơn `paid` tính một lần (lần sớm nhất); `unrecognizedPayments` = 2 lần, tổng tiền tương ứng                      |
| RPT-T07 | Đơn 0 đ (`paid`, không có thanh toán)                                                                                                                        | Không xuất hiện trong doanh thu, `orderCount`, `by-product`                                                                                |
| RPT-T08 | Đơn có cả dịch vụ và gói, `productType=service` / `package`                                                                                                  | Chỉ cộng `line_total` của loại đó; đơn được đếm ở cả hai tiêu chí; cột loại kia = 0                                                        |
| RPT-T09 | Không có dữ liệu trong khoảng 2025 theo quý                                                                                                                  | 200, 4 kỳ đều 0, `totalRevenue = 0`; `by-product` → `items` rỗng                                                                           |
| RPT-T10 | `by-product`: 3 dịch vụ + 1 gói, `top=2`; dịch vụ đổi tên sau khi bán                                                                                        | 2 dòng doanh thu cao nhất, sắp giảm dần; tên hiện tại; `quantity` đúng; `sharePercent` đúng 1 chữ số                                       |
| RPT-T11 | Phân quyền: khách hàng, nhân viên gọi cả ba endpoint (UAT-28); không Bearer                                                                                  | `403 forbidden`; `401 unauthorized`, dạng envelope                                                                                         |
| RPT-T13 | Exporter (unit, đọc lại file bằng ClosedXML): báo cáo 2 kỳ + 3 sản phẩm                                                                                      | 3 sheet đúng tên; số tiền kiểu số, định dạng `#,##0`; dòng Tổng = Σ kỳ; sheet sản phẩm đủ 3 dòng                                           |
| RPT-T14 | `GET /reports/revenue/export` cùng dữ liệu RPT-T04; tham số sai; khoảng không có dữ liệu                                                                     | 200, content-type xlsx, tên file đúng, số liệu khớp `/reports/revenue`; `400 validation_error` (JSON envelope); file có kỳ = 0             |
| RPT-T12 | Hồi quy                                                                                                                                                      | Toàn bộ test hiện có vẫn pass, `PersistenceModelTests` pass (không migration)                                                              |

## Câu hỏi còn mở

- Q-46 (**đã chốt 01/11/2026**) — Tiền nào là doanh thu: lần `succeeded` sớm nhất của đơn `paid`; tiền thành công trên đơn hủy/hết hạn hoặc lần thành công thừa báo riêng `unrecognizedPayments`, không cộng.
- Q-47 (**đã chốt 01/11/2026**) — Đơn 0 đ (khuyến mãi 100 %): không tính vào doanh thu và số đơn.
- Q-48 (**đã chốt 01/11/2026**) — Xuất Excel (SPA-API-109): làm ngay đợt này, ClosedXML trong Infrastructure (BR-RPT-05).
- Q-49 (**đã chốt 01/11/2026**) — Khoảng tối đa và mặc định: `Reports:MaxRangeYears` = 5; bỏ trống → đầu năm hiện tại đến hôm nay.
- Q-45 (đã chốt, ghi chú "xem lại khi làm báo cáo"): báo cáo doanh thu không cần biết ai hủy đơn → giữ nguyên, không đổi.

Xem [open-questions.md](../decisions/open-questions.md) (thêm Q-46…Q-49 khi spec được duyệt).

## Việc để sau

- RPT-LATER-02: KPI tổng quan SCR-W30 (số lịch hẹn theo kỳ).
- RPT-LATER-03: web SCR-W38, mobile SCR-M32 (`ReportsApi`, query keys trong `packages/api-client`).
- RPT-LATER-04: hoàn tiền (bảng/trạng thái riêng) để doanh thu trừ hoàn (BR-RPT-02, RS-21).

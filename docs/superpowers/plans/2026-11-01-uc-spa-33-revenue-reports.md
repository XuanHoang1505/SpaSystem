# Revenue reports (UC-SPA-33) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Backend for the owner to see revenue by month/quarter/year (split service/package), revenue by product (top N) and download the same report as an `.xlsx` file.

**Architecture:** Read-only. A new `Reports` folder: `IRevenueReportRepository` aggregates recognized payments **per Vietnam day** in PostgreSQL (≤ 5 × 366 rows) and per product; a pure `RevenuePeriods` builds the periods and folds days into them; `RevenueReportService` resolves defaults, validates, and feeds both the JSON endpoints and `IRevenueReportExporter` (ClosedXML in Infrastructure). New `ReportsController` behind the new `report.view` policy. No schema change, no migration.

**Tech Stack:** .NET 9, EF Core 9 + Npgsql, PostgreSQL 17, FluentValidation, ClosedXML 0.105.0 (MIT), xUnit + NSubstitute + FluentAssertions, Testcontainers.

**Spec:** `docs/specs/reports.md` (UC-SPA-33, BR-RPT-01…05, RPT-T01…T14, Q-46…Q-49). Approved 2026-11-01 (Excel export included).

## Global Constraints

- Names from the glossary/spec: folder `Reports` (`UseCases/Reports`, `DTOs/Reports`, `Validators/Reports`, `Interfaces/Services/Reports` — the last two DTO/Service folders already exist with `.gitkeep`; delete the `.gitkeep` once a file lands). Routes exactly: `GET /api/v1/reports/revenue`, `GET /api/v1/reports/revenue/by-product`, `GET /api/v1/reports/revenue/export`.
- Policy: new `Permissions.ReportView = "report.view"` → `[SecurityRoles.Owner]`.
- Query parameters (strings, parsed case-insensitively after trim): `fromDate`, `toDate` (`yyyy-MM-dd`, `DateOnly?`), `groupBy` = `month` | `quarter` | `year` (default `month`), `productType` = `all` | `service` | `package` (default `all`), `top` (`int?`, default 10, by-product only).
- Defaults (Q-49): `toDate ?? SpaTime.Today(clock.UtcNow)`; `fromDate ?? new DateOnly(resolvedTo.Year, 1, 1)`.
- Errors, all `400 validation_error` (FluentValidation `ValidationException`, `ErrorCode = "validation_error"`), field + exact message:
  - `groupBy`: `"Cách nhóm chỉ nhận month, quarter hoặc year."`
  - `productType`: `"Tiêu chí chỉ nhận all, service hoặc package."`
  - `top`: `$"Số sản phẩm phải từ 1 đến {MaxTopProducts}."`
  - `toDate` (resolved `from > to`): `"Ngày kết thúc phải từ ngày bắt đầu trở đi."`
  - `toDate` (resolved `to >= from.AddYears(MaxRangeYears)`): `$"Chỉ xem tối đa {MaxRangeYears} năm một lần."`
- Recognized revenue (BR-RPT-01, Q-46): per order with `Status == Paid`, the `Succeeded` payment with the smallest `PaidAtUtc` (tie → smallest `Id`); amount = that payment's `Amount`; day = Vietnam date of its `PaidAtUtc`. Service/package split = Σ `OrderItem.LineTotal` with `SpaServiceId != null` / `ServicePackageId != null`. Zero-total paid orders have no payment → never counted (Q-47).
- Unrecognized (BR-RPT-02, A4): every other `Succeeded` payment whose `PaidAtUtc` falls in the range (order not `Paid`, or not the recognized one) → `{ count, amount }`. Not in any total.
- Range in UTC: `[SpaTime.StartOfDayUtc(from), SpaTime.StartOfDayUtc(to.AddDays(1)))`. Vietnam day in SQL: `DateOnly.FromDateTime(EF.Functions.AtTimeZone(paidAtUtc, SpaTime.TimeZoneId))`.
- `productType` ≠ `all`: `revenue`/`totalRevenue` = that type's part, the other type's column = 0, `orderCount` = orders with ≥ 1 line of that type.
- Labels: month `MM/yyyy` (`02/2026`), quarter `Q{n}/yyyy`, year `yyyy`. First/last period clipped to the range. Every period is returned, empty ones with 0.
- By product (BR-RPT-04): group by product id, `productName` = current catalog `Name`, `quantity` = number of order lines, sort `revenue desc, productName asc`, take `top` (export: no limit). `sharePercent = Math.Round(revenue * 100 / criterionTotal, 1, MidpointRounding.AwayFromZero)`, 0 when total is 0.
- Excel (BR-RPT-05): sheets `"Tổng quan"`, `"Theo kỳ"`, `"Theo sản phẩm"`; money cells numeric with format `#,##0`, dates `dd/MM/yyyy`; file name `$"doanh-thu_{from:yyyy-MM-dd}_{to:yyyy-MM-dd}.xlsx"`; content type `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`. Application never references ClosedXML.
- Config section `Reports` (`ReportsOptions`): `MaxRangeYears` = 5 (valid 1–20), `MaxTopProducts` = 50 (valid 1–500), validated in `AddInfrastructure` like `OrderOptions`. No `.env` variables.
- Do not change behaviour of finished UCs; all existing tests pass; `PersistenceModelTests` passes (no entity/configuration change).
- DI through constructors into `private readonly` fields; Application references neither ASP.NET Core nor EF Core.
- TDD: unit tests with NSubstitute + fixed `IDateTimeProvider`; integration tests with `PostgresFixture` + `AuthApiFactory`. **The test database is shared by all tests in the collection and reports aggregate globally**: every integration test seeds payments in its own far-future year (`2040 + n`, one distinct year per test, never reused) and queries only that year.
- Docs to update: `docs/progress.md`, glossary, open-questions (Q-46…Q-49 as "Đã chốt 01/11/2026"), `docs/spec-source/data_rules.py` + `data_api.py` (regenerate Excel), Postman (`backend/postman/generate_collection.py`), root `CLAUDE.md` (Reports paragraph). No new env vars.
- The user runs git: no commits or pushes; each "Checkpoint" = build + the task's tests. No Co-Authored-By or "Generated with" lines anywhere.

## Review Focus

- Payment at 23:59:59 VN on the last day of the range is in; at 00:00 VN the next day is out (UTC+7 shift in SQL, not session timezone) → Task 2 test `DayUsesVietnamTime` (RPT-T05).
- Range spanning a year boundary grouped by quarter (`2041-11-15…2042-02-10`): `Q4/2041` clipped start, `Q1/2042` clipped end, nothing lost between → Task 1 test `QuarterAcrossYearIsClipped`.
- An order revived from `expired` to `paid` by a late success (Q-20) must count once, on that payment's day → Task 2 test `RevivedOrderCountsOnItsPaymentDay`.
- Excel opened in a Vietnamese locale: money must stay numbers (sum works), not text like `"4.500.000"` → Task 4 test asserts `cell.DataType == XLDataType.Number`.
- `?groupBy=Quarter&productType=PACKAGE` (any case / spaces) accepted; `?groupBy=` (empty) means default `month` → Task 3 tests `ParsesCaseInsensitive`, `EmptyMeansDefault`.

---

### Task 1: Report contracts, options and period logic

**Files:**

- Create: `backend/src/Application/Common/Options/ReportsOptions.cs`
- Create: `backend/src/Application/DTOs/Reports/` — `RevenueGroupBy.cs`, `ReportProductType.cs`, `RevenueProductKind.cs`, `RevenueReportQuery.cs`, `RevenueByProductQuery.cs`, `RevenueReportDto.cs` (with `RevenuePeriodDto`, `UnrecognizedPaymentsDto`), `RevenueByProductDto.cs` (with `ProductRevenueDto`), `RevenueRows.cs` (repository rows), `RevenueReportFile.cs`
- Create: `backend/src/Application/UseCases/Reports/RevenuePeriods.cs`
- Test: `backend/tests/Application.Tests/Reports/RevenuePeriodsTests.cs`

**Interfaces — Produces:**

- `ReportsOptions { const SectionName = "Reports"; int MaxRangeYears = 5; int MaxTopProducts = 50; }`
- `enum RevenueGroupBy { Month, Quarter, Year }`, `enum ReportProductType { All, Service, Package }`, `enum RevenueProductKind { Service, Package }` (serialize as snake_case lower via the existing converter).
- `sealed class RevenueReportQuery { DateOnly? FromDate; DateOnly? ToDate; string? GroupBy; string? ProductType; }`; `sealed class RevenueByProductQuery { DateOnly? FromDate; DateOnly? ToDate; string? ProductType; int? Top; }` (settable properties, bound with `[FromQuery]`).
- `record RevenueReportDto(DateOnly FromDate, DateOnly ToDate, RevenueGroupBy GroupBy, ReportProductType ProductType, decimal TotalRevenue, decimal ServiceRevenue, decimal PackageRevenue, int OrderCount, IReadOnlyList<RevenuePeriodDto> Periods, UnrecognizedPaymentsDto UnrecognizedPayments)`
- `record RevenuePeriodDto(string Label, DateOnly PeriodStart, DateOnly PeriodEnd, decimal Revenue, decimal ServiceRevenue, decimal PackageRevenue, int OrderCount)`; `record UnrecognizedPaymentsDto(int Count, decimal Amount)`
- `record RevenueByProductDto(DateOnly FromDate, DateOnly ToDate, ReportProductType ProductType, IReadOnlyList<ProductRevenueDto> Items)`; `record ProductRevenueDto(RevenueProductKind ProductType, Guid ProductId, string ProductName, int Quantity, decimal Revenue, decimal SharePercent)`
- Rows: `record DailyRevenueRow(DateOnly Date, decimal Revenue, decimal ServiceRevenue, decimal PackageRevenue, int OrderCount, int ServiceOrderCount, int PackageOrderCount)`; `record ProductRevenueRow(RevenueProductKind Kind, Guid ProductId, string ProductName, int Quantity, decimal Revenue)`
- `record RevenueReportFile(byte[] Content, string FileName)`
- `static class RevenuePeriods`:
  - `IReadOnlyList<RevenuePeriodDto> Build(DateOnly from, DateOnly to, RevenueGroupBy groupBy)` — all periods, values 0.
  - `IReadOnlyList<RevenuePeriodDto> Fold(IReadOnlyList<RevenuePeriodDto> periods, IEnumerable<DailyRevenueRow> days, ReportProductType productType)` — adds each day into the period containing it, applying the productType projection (see Global Constraints).

- [ ] **Step 1: Write failing tests** (RPT-T01, A2, A3):
  - `MonthlyIsClipped`: `Build(2026-02-15, 2026-05-10, Month)` → labels `["02/2026","03/2026","04/2026","05/2026"]`, `[0].PeriodStart == 2026-02-15`, `[0].PeriodEnd == 2026-02-28`, `[3].PeriodStart == 2026-05-01`, `[3].PeriodEnd == 2026-05-10`.
  - `QuarterlyYear`: `Build(2026-01-01, 2026-12-31, Quarter)` → `["Q1/2026","Q2/2026","Q3/2026","Q4/2026"]`, `[1]` = 2026-04-01…2026-06-30.
  - `YearlyRange`: `Build(2024-03-01, 2026-11-01, Year)` → `["2024","2025","2026"]`, first starts 2024-03-01, last ends 2026-11-01.
  - `QuarterAcrossYearIsClipped`: `Build(2041-11-15, 2042-02-10, Quarter)` → `["Q4/2041","Q1/2042"]`, 2041-11-15…2041-12-31 and 2042-01-01…2042-02-10.
  - `SingleDay`: `Build(2026-10-31, 2026-10-31, Month)` → one period `10/2026`, start = end = 2026-10-31.
  - `FoldAllSumsDays`: days 2026-10-02 (300 000 svc, 1 order) and 2026-10-20 (4 500 000 pkg, 1 order), 2026-11-01 (1 000 000 = 600 000 svc + 400 000 pkg, 1 order) folded monthly → Oct revenue 4 800 000, svc 300 000, pkg 4 500 000, orders 2; Nov 1 000 000, orders 1.
  - `FoldServiceOnly`: same days, `Service` → Oct revenue 300 000, pkg 0, orders = `ServiceOrderCount` sum (1); Nov revenue 600 000.
- [ ] **Step 2: Run** `dotnet test backend/tests/Application.Tests --filter "FullyQualifiedName~RevenuePeriodsTests"` → FAIL (types missing).
- [ ] **Step 3: Implement** the types above and `RevenuePeriods` (iterate period starts: month = first of month, quarter = first month `3*((m-1)/3)+1`, year = Jan 1; clip with `Max(from)`/`Min(to)`).
- [ ] **Step 4: Run** the same filter → PASS.
- [ ] **Step 5: Checkpoint** — `dotnet build backend/NhuNguyetSpa.sln`.

### Task 2: Revenue aggregation queries

**Files:**

- Create: `backend/src/Application/Interfaces/Repositories/IRevenueReportRepository.cs`
- Create: `backend/src/Infrastructure/Repositories/RevenueReportRepository.cs`
- Modify: `backend/src/Infrastructure/DependencyInjection.cs` (register `IRevenueReportRepository` scoped; `AddOptions<ReportsOptions>()` bound to `Reports`, `.Validate(o => o.MaxRangeYears is >= 1 and <= 20 && o.MaxTopProducts is >= 1 and <= 500, "Reports:MaxRangeYears must be 1–20, MaxTopProducts 1–500.")`)
- Create: `backend/tests/IntegrationTests/Reports/ReportApi.cs` (seed helper), `backend/tests/IntegrationTests/Reports/RevenueReportRepositoryTests.cs`

**Interfaces:**

- Consumes: Task 1 rows and enums.
- Produces `IRevenueReportRepository`:
  - `Task<IReadOnlyList<DailyRevenueRow>> GetDailyRevenueAsync(DateTime fromUtc, DateTime toUtcExclusive, CancellationToken cancellationToken)` — one row per Vietnam day that has recognized revenue, ascending.
  - `Task<UnrecognizedPaymentsDto> GetUnrecognizedPaymentsAsync(DateTime fromUtc, DateTime toUtcExclusive, CancellationToken cancellationToken)`
  - `Task<IReadOnlyList<ProductRevenueRow>> GetProductRevenueAsync(DateTime fromUtc, DateTime toUtcExclusive, ReportProductType productType, int? top, CancellationToken cancellationToken)` — sorted and limited as in Global Constraints (`top == null` → all).
- Test helper `ReportApi(AuthApiFactory factory, PostgresFixture postgres, CatalogApi api)`:
  - `Task<Order> SeedPaidOrderAsync(Guid customerId, DateTime paidAtUtc, IReadOnlyList<(SpaService? Service, ServicePackage? Package, decimal LineTotal)> lines, OrderStatus status = OrderStatus.Paid, int succeededPayments = 1, TimeSpan? secondPaymentDelay = null)` — order with those lines, `GrandTotal = Σ`, `succeededPayments` `Succeeded` payments of `Amount = GrandTotal` (`Provider = "vnpay"`, unique `RequestCode`, `ExpiresAtUtc = paidAtUtc.AddMinutes(15)`), the first at `paidAtUtc`, the next at `+ (secondPaymentDelay ?? 1 min)`; plus one `Failed` payment with `PaidAtUtc = null`.
  - `static DateTime VnUtc(int y, int mo, int d, int h = 10, int mi = 0, int s = 0)` → `SpaTime.ToUtc(new DateTime(y, mo, d, h, mi, s))`.
  - Reuse `OrderApi.SeedCustomerAsync`, `OrderApi.SeedOrderAsync` (pending, zero), `CatalogApi.SeedServiceAsync/SeedPackageAsync`.

- [ ] **Step 1: Write failing integration tests** (each in its own year, call the repository from a scope of `_factory.Services`):
  - `CountsOnlyRecognizedPayments` (2040, RPT-T04): service order 300 000 on 2040-10-02, package order 4 500 000 on 2040-10-20, a `pending_payment` order → 2 rows; Σ `Revenue` = 4 800 000, Σ `ServiceRevenue` + Σ `PackageRevenue` = Σ `Revenue`, Σ `OrderCount` = 2.
  - `DayUsesVietnamTime` (2041, RPT-T05): payments at `2041-10-31T16:59:59Z` and `2041-10-31T17:00:00Z`; range `[StartOfDayUtc(2041-10-01), StartOfDayUtc(2041-11-01))` → one row dated `2041-10-31`; full-year range → second row dated `2041-11-01`.
  - `CancelledAndDuplicateSuccessAreUnrecognized` (2042, RPT-T06): `cancelled` order with a succeeded 500 000 payment; `paid` order 700 000 with `succeededPayments: 2` → daily Σ revenue 700 000, OrderCount 1; unrecognized `{ Count = 2, Amount = 1 200 000 }`.
  - `RevivedOrderCountsOnItsPaymentDay` (2043): `paid` order whose only succeeded payment is on 2043-03-05 (created 2043-03-01) → one row on 2043-03-05.
  - `ZeroOrderNotCounted` (2044, RPT-T07): `paid` order with `GrandTotal = 0`, no payment → no rows, no product rows.
  - `MixedOrderCountsInBothTypes` (2045, RPT-T08): one order with service 600 000 + package 400 000 → row `ServiceOrderCount = 1`, `PackageOrderCount = 1`, `OrderCount = 1`.
  - `ProductRevenueTopAndCurrentName` (2046, RPT-T10): services A (2 lines × 300 000), B (1 × 900 000), C (1 × 100 000), package P (1 × 4 500 000); rename A after seeding; `top: 2`, `All` → `[P 4 500 000 qty 1, B 900 000]`; `top: null`, `Service` → `[B, A (renamed, qty 2, 600 000), C]`.
- [ ] **Step 2: Run** `dotnet test backend/tests/IntegrationTests --filter "FullyQualifiedName~RevenueReportRepositoryTests"` → FAIL.
- [ ] **Step 3: Implement** `RevenueReportRepository(AppDbContext context)` with `AsNoTracking` LINQ: recognized-payment subquery per `Paid` order (first succeeded by `PaidAtUtc`, `Id`), filtered by range, projected to `(OrderId, Day, Amount, ServiceTotal, PackageTotal)`, then `GroupBy(Day)`; unrecognized = succeeded payments in range whose `Id` is not a recognized payment id; products = order items of recognized orders grouped by `SpaServiceId ?? ServicePackageId` + kind, joined to `SpaServices`/`ServicePackages` for `Name`. Everything runs in SQL (check the logged SQL once: no client evaluation).
- [ ] **Step 4: Run** the same filter → PASS.
- [ ] **Step 5: Checkpoint** — build; `dotnet test backend/NhuNguyetSpa.sln --filter "FullyQualifiedName~PersistenceModelTests"` → PASS.

### Task 3: Report service and validators

**Files:**

- Create: `backend/src/Application/Interfaces/Services/Reports/IRevenueReportService.cs`
- Create: `backend/src/Application/Interfaces/Reports/IRevenueReportExporter.cs`
- Create: `backend/src/Application/UseCases/Reports/RevenueReportService.cs`, `backend/src/Application/UseCases/Reports/ReportText.cs` (`TryParseGroupBy(string?, out RevenueGroupBy)`, `TryParseProductType(string?, out ReportProductType)`: null/blank → default, trim, ignore case)
- Create: `backend/src/Application/Validators/Reports/RevenueReportQueryValidator.cs`, `RevenueByProductQueryValidator.cs` (parse rules + `top` range with `IOptions<ReportsOptions>`)
- Modify: `backend/src/Application/DependencyInjection.cs` (`AddScoped<IRevenueReportService, RevenueReportService>()`)
- Test: `backend/tests/Application.Tests/Reports/RevenueReportServiceTests.cs`, `backend/tests/Application.Tests/Reports/RevenueReportQueryValidatorTests.cs`

**Interfaces:**

- Consumes: Task 1 types, Task 2 `IRevenueReportRepository`.
- Produces:
  - `IRevenueReportExporter { byte[] Export(RevenueReportDto report, IReadOnlyList<ProductRevenueDto> products, DateTime exportedAtUtc); }`
  - `IRevenueReportService`:
    - `Task<OperationResult<RevenueReportDto>> GetRevenueAsync(RevenueReportQuery query, CancellationToken cancellationToken)`
    - `Task<OperationResult<RevenueByProductDto>> GetByProductAsync(RevenueByProductQuery query, CancellationToken cancellationToken)`
    - `Task<OperationResult<RevenueReportFile>> ExportAsync(RevenueReportQuery query, CancellationToken cancellationToken)` — same report as `GetRevenueAsync` + all products (`top: null`) of the same `productType`, file name per Global Constraints.
  - Constructor: `(IRevenueReportRepository reports, IRevenueReportExporter exporter, IDateTimeProvider clock, IOptions<ReportsOptions> options, IValidator<RevenueReportQuery> reportValidator, IValidator<RevenueByProductQuery> productValidator)`.
  - Flow: validate query (parse/top) → resolve defaults → range checks (throw `ValidationException` with field `toDate`, messages from Global Constraints) → repository → `RevenuePeriods.Build` + `Fold` → totals = Σ periods.

- [ ] **Step 1: Write failing tests** (NSubstitute repository, clock fixed at `2026-11-01T03:00:00Z`):
  - Validator (RPT-T02): `groupBy=week` → error on `GroupBy` with the exact message; `productType=x`; `top=0`, `top=51` → message `"Số sản phẩm phải từ 1 đến 50."`; `ParsesCaseInsensitive` (`" Quarter "`, `"PACKAGE"` valid); `EmptyMeansDefault` (`""`, `null` valid).
  - `FromAfterToIsRejected`: `2026-05-02…2026-05-01` → `ValidationException`, field `toDate`, `"Ngày kết thúc phải từ ngày bắt đầu trở đi."`.
  - `RangeOverFiveYearsIsRejected`: `2021-01-01…2026-01-01` → `"Chỉ xem tối đa 5 năm một lần."`; `2021-01-01…2025-12-31` accepted.
  - `DefaultsToCurrentYear` (RPT-T03): empty query → `FromDate 2026-01-01`, `ToDate 2026-11-01`, `GroupBy Month`, `ProductType All`, 11 periods; repository called with `fromUtc = 2025-12-31T17:00:00Z`, `toUtcExclusive = 2026-11-01T17:00:00Z`.
  - `OnlyFromInFutureIsRejected`: `fromDate=2026-12-01` only → field `toDate` error.
  - `TotalsEqualSumOfPeriods`: repository returns the 3 days of Task 1 `FoldAllSumsDays` → `TotalRevenue 5 800 000`, `ServiceRevenue 900 000`, `PackageRevenue 4 900 000`, `OrderCount 3`, `UnrecognizedPayments` passed through.
  - `EmptyRangeReturnsZeros` (RPT-T09): no rows, 2025 by quarter → 4 periods all 0, `TotalRevenue 0`.
  - `SharePercentRoundsToOneDecimal`: products 2 000 000 and 1 000 000 with criterion total 3 000 000 → `66.7`, `33.3`; total 0 → `0`.
  - `ExportPassesAllProducts`: `ExportAsync` calls `GetProductRevenueAsync(..., top: null, ...)`, passes the same report to the exporter and returns `FileName == "doanh-thu_2026-01-01_2026-11-01.xlsx"`.
- [ ] **Step 2: Run** `dotnet test backend/tests/Application.Tests --filter "FullyQualifiedName~Reports"` → FAIL.
- [ ] **Step 3: Implement** `ReportText`, validators, `RevenueReportService`, interface files; register in DI.
- [ ] **Step 4: Run** the same filter → PASS.
- [ ] **Step 5: Checkpoint** — `dotnet build backend/NhuNguyetSpa.sln`. `IRevenueReportExporter` has no implementation until Task 4, so do not run API integration tests before Task 4 is done.

### Task 4: Excel exporter (ClosedXML)

**Files:**

- Modify: `backend/src/Infrastructure/NhuNguyetSpa.Infrastructure.csproj` (`<PackageReference Include="ClosedXML" Version="0.105.0" />`)
- Create: `backend/src/Infrastructure/Reports/ClosedXmlRevenueReportExporter.cs`
- Modify: `backend/src/Infrastructure/DependencyInjection.cs` (`AddSingleton<IRevenueReportExporter, ClosedXmlRevenueReportExporter>()`)
- Modify: `backend/tests/IntegrationTests/NhuNguyetSpa.IntegrationTests.csproj` only if ClosedXML is not transitively available for reading the file back (it is through the Infrastructure project reference; add nothing otherwise)
- Test: `backend/tests/IntegrationTests/Reports/ClosedXmlRevenueReportExporterTests.cs` (no database)

**Interfaces:** Consumes `IRevenueReportExporter` (Task 3), DTOs (Task 1).

Sheet layout (row 1 = header, bold):

- `"Tổng quan"`: two columns label/value, rows in this order: `Từ ngày`, `Đến ngày`, `Nhóm theo` (`Tháng`/`Quý`/`Năm`), `Tiêu chí` (`Tất cả`/`Dịch vụ lẻ`/`Gói dịch vụ`), `Tổng doanh thu`, `Doanh thu dịch vụ lẻ`, `Doanh thu gói`, `Số đơn`, `Tiền đã thu chưa ghi nhận`, `Số lần thanh toán chưa ghi nhận`, `Xuất lúc` (VN time `dd/MM/yyyy HH:mm`).
- `"Theo kỳ"`: header `Kỳ | Từ ngày | Đến ngày | Doanh thu | Dịch vụ lẻ | Gói | Số đơn`, one row per period, last row `Tổng` with the report totals.
- `"Theo sản phẩm"`: header `Sản phẩm | Loại | Số lượng | Doanh thu | Tỷ trọng (%)`, `Loại` = `Dịch vụ lẻ`/`Gói dịch vụ`.
- Columns adjusted to contents; money `#,##0`, dates `dd/MM/yyyy`, share `0.0`.

- [ ] **Step 1: Write failing test** `ExportsThreeSheetsWithNumbers` (RPT-T13): report with 2 periods (1 000 000 / 2 500 000) and 3 products → reopen bytes with `new XLWorkbook(new MemoryStream(bytes))`: sheet names exactly the three above; `"Theo kỳ"` row 2 col 4 `DataType == XLDataType.Number`, `Style.NumberFormat.Format == "#,##0"`; row 4 col 1 `"Tổng"`, col 4 = 3 500 000; `"Theo sản phẩm"` has 4 used rows. Second test `EmptyReportStillHasHeaders`: 0 products → `"Theo sản phẩm"` has only the header row.
- [ ] **Step 2: Run** `dotnet test backend/tests/IntegrationTests --filter "FullyQualifiedName~ClosedXmlRevenueReportExporterTests"` → FAIL.
- [ ] **Step 3: Implement** the exporter (save to `MemoryStream`, return `ToArray()`).
- [ ] **Step 4: Run** the same filter → PASS.
- [ ] **Step 5: Checkpoint** — build; confirm `dotnet list backend/src/Infrastructure package --vulnerable` shows nothing for ClosedXML.

### Task 5: API, permission, config and end-to-end tests

**Files:**

- Modify: `backend/src/API/Authorization/Permissions.cs` (`ReportView`)
- Create: `backend/src/API/Controllers/ReportsController.cs`
- Modify: `backend/src/API/appsettings.json` (`"Reports": { "MaxRangeYears": 5, "MaxTopProducts": 50 }`)
- Test: `backend/tests/IntegrationTests/Reports/ReportEndpointsTests.cs`

**Interfaces:** Consumes `IRevenueReportService` (Task 3).

- Controller: `[Route("api/v1/reports")]`, `[Authorize(Policy = Permissions.ReportView)]`, `sealed class ReportsController : ApiController`; actions `GET revenue` (`[FromQuery] RevenueReportQuery`), `GET revenue/by-product` (`[FromQuery] RevenueByProductQuery`), `GET revenue/export` — on success `File(result.Data.Content, ExcelContentType, result.Data.FileName)`, on failure `HandleResult(result)` (envelope). `ProducesResponseType` attributes as in `OrdersController`.

- [ ] **Step 1: Write failing tests** (own years 2047–2049):
  - `RevenueEndToEnd` (2047, RPT-T04 over HTTP): seed as `CountsOnlyRecognizedPayments`; `GET /api/v1/reports/revenue?fromDate=2047-01-01&toDate=2047-12-31&groupBy=quarter` as owner → 200, `periods` length 4, `periods[3].label == "Q4/2047"`, `totalRevenue == 4800000`, `groupBy == "quarter"`; `&productType=package` → `totalRevenue == 4500000`, `serviceRevenue == 0`.
  - `EmptyYear` (2048, RPT-T09): revenue → 4 zero periods; by-product → `items` empty.
  - `InvalidParameters` (RPT-T02 over HTTP): `groupBy=week` → `400`, `errors[0].code == "validation_error"`, field `groupBy`; same for export (JSON envelope, not a file).
  - `ExportEndToEnd` (2049, RPT-T14): seed one service order 300 000 → 200, `Content-Type` = xlsx type, `Content-Disposition` file name `doanh-thu_2049-01-01_2049-12-31.xlsx`, reopened `"Theo kỳ"` `Tổng` = 300 000 equals `/reports/revenue` `totalRevenue`.
  - `Permissions` (RPT-T11): customer and staff Bearer on all three routes → `403 forbidden`; no Bearer → `401 unauthorized`, envelope.
- [ ] **Step 2: Run** `dotnet test backend/tests/IntegrationTests --filter "FullyQualifiedName~ReportEndpointsTests"` → FAIL.
- [ ] **Step 3: Implement** permission, controller, appsettings.
- [ ] **Step 4: Run** the same filter → PASS.
- [ ] **Step 5: Checkpoint** — `dotnet build backend/NhuNguyetSpa.sln` and `dotnet test backend/NhuNguyetSpa.sln` → all PASS (RPT-T12).

### Task 6: Documentation, spec source and Postman

**Files:**

- Modify: `docs/spec-source/data_rules.py` — reword `BR-RPT-01` to the spec text (recognized payment, Q-46/Q-47), insert `BR-RPT-03`, `BR-RPT-04`, `BR-RPT-05` right after `BR-RPT-02` (same tuple shape: code, "Báo cáo", topic, rule, enforce, "UC-SPA-33", source).
- Modify: `docs/spec-source/data_api.py` — rows SPA-API-107/108/109 **in place**: query `?fromDate&toDate&groupBy=month|quarter|year&productType=all|service|package` (108 adds `&top`), response field names from the spec; example SPA-API-107 to `fromDate/toDate/groupBy=quarter` and English response keys. Remove "ĐX" note on 109 → "BR-RPT-05".
- Regenerate per `docs/spec-source/README.md` (Excel; `data-model.md` must come out unchanged).
- Modify: `docs/domain/glossary.md` — folder `Reports` in the folder paragraph; terms: Doanh thu → Revenue (`/reports/revenue`, `RevenueReportService`, quyền `report.view`), Kỳ báo cáo → Report period (`RevenuePeriodDto`, `groupBy`), Tiền chưa ghi nhận → Unrecognized payments, Xuất Excel → Revenue export (`/reports/revenue/export`, `IRevenueReportExporter`).
- Modify: `docs/decisions/open-questions.md` — append Q-46…Q-49 rows, status "Đã chốt" with the spec's text, "Ảnh hưởng" `UC-SPA-33, BR-RPT-0x`.
- Modify: `docs/specs/reports.md` — "Trạng thái triển khai" → implemented 01/11/2026 with link to this plan.
- Modify: `docs/progress.md` — UC-SPA-33 row (backend ✅, tests ✅).
- Modify: `CLAUDE.md` — a "**Revenue reports (UC-SPA-33) are done in the backend:**" paragraph after the order paragraph (routes, `report.view`, recognized revenue rule, `unrecognizedPayments`, ClosedXML exporter behind `IRevenueReportExporter`, `Reports:MaxRangeYears`/`MaxTopProducts`, no migration); remove "Reports" from nothing else. `backend/CLAUDE.md`: add ClosedXML to the packages list if it lists packages.
- Modify: `backend/postman/generate_collection.py` — folder "Báo cáo doanh thu" with: revenue by quarter (owner, `expect_ok`), revenue `productType=package`, by-product `top=5`, export (expect 200 + content type check), `groupBy=week` (`expect_field_error("groupBy")`), customer → `expect_error(403)`. Regenerate the collection as its header describes.

- [ ] **Step 1:** Apply the edits above and regenerate Excel + Postman.
- [ ] **Step 2: Verify** `dotnet test backend/NhuNguyetSpa.sln --filter "FullyQualifiedName~PersistenceModelTests"` → PASS; `git diff --stat docs/domain/data-model.md` → no change.
- [ ] **Step 3: Definition of Done** — `dotnet build backend/NhuNguyetSpa.sln`, `dotnet test backend/NhuNguyetSpa.sln`, `npm run lint`, `npm run typecheck`, `npm run format:check` → all pass; report the results to the user (no commit).

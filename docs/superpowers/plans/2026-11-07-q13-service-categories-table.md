# Bảng danh mục dịch vụ (Q-13) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thay cột text `spa_services.category` bằng bảng `service_categories` + FK `category_id`, thêm API quản trị danh mục cho chủ spa, và chuyển web sang lọc theo `categoryId` có số dịch vụ thật.

**Architecture:** Entity `ServiceCategory` (Domain) → `ServiceCategoryConfiguration` + migration `AddServiceCategories` chuyển dữ liệu cũ bằng SQL (Infrastructure) → `ServiceCategoryService` + `IServiceCategoryRepository` (Application, thư mục `Catalog`) → `ServiceCategoriesController` (API). `ServiceCategoryResolver` bị xóa; `ServiceCatalogService` nhận `CategoryId`. Web đổi hợp đồng ở `shared-types`/`api-client` rồi `useCatalogListParams`, `ServiceFilterPanel`, `ServiceDetailView`, `RelatedServices`.

**Tech Stack:** .NET 9, EF Core 9 + Npgsql, FluentValidation, xUnit + NSubstitute, Testcontainers PostgreSQL; React + TanStack Query + Vitest.

**Spec:** `docs/specs/catalog.md`, mục "Bảng danh mục dịch vụ (Q-13, đề xuất 07/11/2026)" (BR-CAT-10..14, bảng API, CAT-T33..T41, CAT-UI-T17).

## Global Constraints

- Tên theo glossary (thêm `ServiceCategory` / bảng `service_categories` / thư mục backend `Catalog` / FE `services` trước khi code). Thông điệp lỗi tiếng Việt; DI bằng `private readonly`; file-scoped namespace; một type public chính mỗi file.
- Mã lỗi: `service_category_not_found` (404 khi id ở route; 400 khi `categoryId` trong body dịch vụ), `service_category_exists` (409), `service_category_in_use` (409), `service_category_inactive` (400), `validation_error` (400).
- Quyền: đọc `[AllowAnonymous]`; ghi `[Authorize(Policy = Permissions.CatalogManage)]`.
- Tên unique index `ux_service_categories_name_unaccent` (SQL thủ công `f_unaccent(lower(name))`); vi phạm khi lưu → `ConflictException` mã `service_category_exists` trong `UnitOfWork` (cùng chỗ với `ux_users_phone_number`).
- Không đổi hành vi UC khác; toàn bộ test hiện có pass; `PersistenceModelTests` pass (entity, migration, `data-model.md` khớp nhau).
- TDD: unit test (NSubstitute) + integration test (`PostgresFixture`). **Integration test cần Docker Desktop đang chạy.**
- Không sửa tay `docs/domain/data-model.md` hay Excel: sửa `docs/spec-source/data_db.py` rồi sinh lại theo `docs/spec-source/README.md`. Dòng API mới thêm **cuối** `data_api.py`.
- Web: theo `apps/web/CLAUDE.md` (token, `components/ui` + `components/shared`, không `any`/`@ts-ignore`/`as unknown as`), lỗi theo `errors[].code`.
- Lệnh kiểm tra cuối: `dotnet build backend/NhuNguyetSpa.sln`, `dotnet test backend/NhuNguyetSpa.sln`, `npm run lint`, `npm run typecheck`, `npm run test`, `npm run format:check`, `npm run web:build`.
- Git do người dùng tự chạy: không commit; bước "Commit" là lệnh gợi ý. Không thêm Co-Authored-By hay "Generated with".

## Review Focus

- Dữ liệu cũ khác cách viết ("Chăm sóc da" / "cham soc DA" / " Chăm sóc da ") phải gom về **một** danh mục khi migrate (Task 3 test `migration groups spellings into one category`).
- Hai request tạo cùng tên cùng lúc vượt qua kiểm tra trùng trong service → unique index phải chặn và trả 409, không 500 (Task 5 test `concurrent duplicate name gives 409`).
- Danh mục bị ẩn khi đang có dịch vụ đang bán: dịch vụ vẫn hiện ở danh sách/chi tiết khách (Task 6 test CAT-T40).
- Sửa dịch vụ đang thuộc danh mục ẩn mà không đổi danh mục → 200, không bị chặn bởi `service_category_inactive` (Task 4 test CAT-T37 phần 3).
- URL web cũ còn `?category=Tên` (link đã chia sẻ) → bỏ qua tham số lạ, không lỗi (Task 8 test `ignores a legacy category name in the URL`).

---

### Task 1: Tài liệu nguồn và glossary

**Files:**

- Modify: `docs/spec-source/data_db.py` (bảng `service_categories` tên DA `DanhMucDichVu`; `spa_services`: bỏ `category`, thêm `category_id|uuid|N|FK → service_categories.id; IDX|Danh mục|IdDanhMucDichVu`; UC map UC-SPA-06/09 thêm `service_categories`)
- Modify: `docs/spec-source/data_api.py` (sửa mô tả dòng `/service-categories`; thêm cuối 3 dòng POST/PUT/DELETE)
- Modify: `docs/spec-source/build_vi_db.py` (`ERD["DichVu"]`: `loaiDichVu` → `idDanhMucDichVu`; thêm `"DanhMucDichVu": "id tenDanhMuc moTa thuTu dangHienThi ngayTao ngayCapNhat"` và ánh xạ tên cột)
- Regenerate: `docs/domain/data-model.md`, `docs/SPA_NhuNguyet_TongHop_PhanTich_v2.xlsx`
- Modify: `docs/domain/glossary.md` (dòng `DanhMucDichVu | ServiceCategory | service_categories | Catalog | services | /service-categories`; sửa dòng "Loại dịch vụ (danh mục)"), `docs/decisions/open-questions.md` (Q-13 → "Đã chốt 07/11/2026: bảng `service_categories`")

- [ ] **Step 1:** Sửa 3 file Python như trên.
- [ ] **Step 2:** Từ `docs/spec-source`: `python build_markdown.py ../domain/data-model.md`, `python build_excel.py ../SPA_NhuNguyet_TongHop_PhanTich_v2.xlsx`, `npx prettier --write ../domain/data-model.md`. Expected: build_excel báo 0 định danh tiếng Việt còn sót, không lỗi tham chiếu API.
- [ ] **Step 3:** Sửa glossary và open-questions.
- [ ] **Step 4: Commit (người dùng chạy):** `git commit -m "docs: service_categories table (Q-13)"`

### Task 2: Domain

**Files:**

- Create: `backend/src/Domain/Entities/ServiceCategory.cs`
- Modify: `backend/src/Domain/Entities/SpaService.cs`

**Interfaces:**

- Produces: `public sealed class ServiceCategory : BaseAuditableEntity { string Name; string? Description; int SortOrder; bool IsActive = true; }` (setter public như các entity khác).
- Produces: `SpaService.CategoryId : Guid` và navigation `SpaService.Category : ServiceCategory?` (thay `string Category`).

- [ ] **Step 1:** Viết hai thay đổi trên. `dotnet build backend/NhuNguyetSpa.sln` → lỗi biên dịch ở các chỗ dùng `service.Category` kiểu string (danh sách cho Task 3–5).
- [ ] **Step 2:** Chưa sửa chỗ dùng; chuyển Task 3.

### Task 3: Persistence và migration

**Files:**

- Create: `backend/src/Infrastructure/Persistence/Configurations/ServiceCategoryConfiguration.cs`
- Modify: `SpaServiceConfiguration.cs` (FK `category_id` → `service_categories.id` `OnDelete(Restrict)`, index; bỏ `Category` text), `AppDbContext.cs` (`DbSet<ServiceCategory> ServiceCategories`)
- Create: migration `AddServiceCategories` (`dotnet ef migrations add AddServiceCategories --project backend/src/Infrastructure --startup-project backend/src/API --output-dir Persistence/Migrations`)
- Modify: `backend/src/Infrastructure/Persistence/UnitOfWork.cs`
- Test: `backend/tests/IntegrationTests/Catalog/CatalogSchemaTests.cs`

**Interfaces:**

- Produces: `ServiceCategoryConfiguration.UniqueName = "ux_service_categories_name_unaccent"`; check `ck_service_categories_sort_order` (`sort_order BETWEEN 0 AND 999`); `name varchar(100)`, `description varchar(500)`, `is_active` default true.
- Produces: `UnitOfWork` dịch `UniqueViolation` của `UniqueName` → `ConflictException("Tên danh mục đã tồn tại.", "service_category_exists")`.

- [ ] **Step 1: Test (CAT-T33)** `migration groups spellings into one category`: dùng `IMigrator` migrate tới `AddAiChatMessageHistoryIndex`, chèn 3 dịch vụ `category` = `'Chăm sóc da'`, `'cham soc DA'`, `'Massage'` bằng SQL, migrate tiếp tới `AddServiceCategories`; assert `service_categories` có 2 dòng, tên `Chăm sóc da` (cách viết có `created_at_utc` sớm nhất) và `Massage`; 2 dịch vụ đầu cùng `category_id`; `information_schema.columns` không còn `spa_services.category`. Thêm test unique: chèn 2 danh mục `Massage` / `MASSAGE` → `DbUpdateException` có `ConstraintName == UniqueName`.
- [ ] **Step 2:** `dotnet test backend/NhuNguyetSpa.sln --filter "FullyQualifiedName~CatalogSchemaTests"` → FAIL (chưa có migration).
- [ ] **Step 3:** Viết configuration, sinh migration rồi sửa tay `Up` theo thứ tự trong spec: tạo bảng → `migrationBuilder.Sql` chèn danh mục (`SELECT DISTINCT ON (f_unaccent(lower(regexp_replace(trim(category), '\s+', ' ', 'g')))) … ORDER BY …, created_at_utc`), gán `sort_order` bằng `row_number() OVER (ORDER BY name) - 1` (giới hạn 999), thêm cột `category_id` nullable → `UPDATE` theo khóa chuẩn hóa → `ALTER … SET NOT NULL` → FK, index → tạo `ux_service_categories_name_unaccent` bằng SQL → xóa index và cột `category`. `Down` thêm lại cột `category varchar(100)`, điền từ tên danh mục, xóa FK/cột/bảng. Thêm nhánh `UnitOfWork`.
- [ ] **Step 4:** Chạy lại lệnh Step 2 → PASS; `--filter "FullyQualifiedName~PersistenceModelTests"` → PASS (đã sinh lại data-model ở Task 1).
- [ ] **Step 5: Commit (người dùng chạy):** `git commit -m "feat(db): service_categories table and migration (Q-13)"`

### Task 4: Application — dịch vụ dùng `CategoryId`

**Files:**

- Modify: `DTOs/Catalog/CreateServiceRequest.cs`, `UpdateServiceRequest.cs`, `IServiceFields.cs` (`Guid? CategoryId` thay `string Category`), `ServiceFilter.cs` (`Guid? CategoryId`), `ServiceListItemDto.cs`, `ServiceDetailDto.cs` (thêm `Guid CategoryId`, giữ `string Category` = tên), `ServiceSearchCriteria.cs` (`Guid? CategoryId`)
- Modify: `Validators/Catalog/ServiceFieldsValidator.cs` (`CategoryId` bắt buộc, khác `Guid.Empty`), `ServiceFilterValidator.cs` (bỏ rule `Category`)
- Modify: `UseCases/Catalog/ServiceCatalogService.cs`, `CatalogErrors.cs`, `Mapping/CatalogMappings.cs`
- Delete: `UseCases/Catalog/ServiceCategoryResolver.cs`, `tests/Application.Tests/Catalog/ServiceCategoryResolverTests.cs`; bỏ đăng ký trong `DependencyInjection.cs`
- Create: `Interfaces/Repositories/IServiceCategoryRepository.cs`
- Test: `tests/Application.Tests/Catalog/ServiceCatalogServiceTests.cs`, `CatalogValidatorTests.cs`

**Interfaces:**

- Produces: `IServiceCategoryRepository : IRepository<ServiceCategory>` với `Task<IReadOnlyList<ServiceCategoryDto>> ListAsync(bool publicOnly, CancellationToken)`, `Task<bool> NameExistsAsync(string name, Guid? excludeId, CancellationToken)`, `Task<bool> HasServicesAsync(Guid id, CancellationToken)`.
- Produces: `CatalogErrors.ServiceCategoryNotFound()` (NotFound, 404), `ServiceCategoryNotFoundForService()` (BusinessRule, 400, cùng mã `service_category_not_found`), `ServiceCategoryInactive()` (400), `ServiceCategoryExists()` (409), `ServiceCategoryInUse()` (409) và hằng mã tương ứng.
- Produces: `ServiceCatalogService.CreateAsync`: danh mục không có → `ServiceCategoryNotFoundForService`; `IsActive == false` → `ServiceCategoryInactive`. `UpdateAsync`: như trên, **trừ khi** `request.CategoryId == service.CategoryId`.

- [ ] **Step 1: Test** trong `ServiceCatalogServiceTests` (NSubstitute `IServiceCategoryRepository.GetByIdAsync`): tạo với danh mục không có → `BusinessRuleException` mã `service_category_not_found`; danh mục ẩn → mã `service_category_inactive`; sửa giữ nguyên danh mục ẩn → thành công; sửa sang danh mục ẩn khác → `service_category_inactive`; `SearchAsync` với `CategoryId` → criteria nhận đúng `CategoryId`. `CatalogValidatorTests`: `CategoryId` null / `Guid.Empty` → lỗi trường `CategoryId`.
- [ ] **Step 2:** `dotnet test backend/NhuNguyetSpa.sln --filter "FullyQualifiedName~Application.Tests.Catalog"` → FAIL.
- [ ] **Step 3:** Cài đặt theo Interfaces.
- [ ] **Step 4:** Chạy lại → PASS.
- [ ] **Step 5: Commit (người dùng chạy):** `git commit -m "feat(catalog): services reference a category id"`

### Task 5: Application — quản lý danh mục

**Files:**

- Create: `DTOs/Catalog/ServiceCategoryDto.cs`, `CreateServiceCategoryRequest.cs`, `UpdateServiceCategoryRequest.cs`
- Create: `Validators/Catalog/ServiceCategoryRequestValidator.cs` (dùng chung cho create/update qua interface `IServiceCategoryFields`)
- Create: `UseCases/Catalog/IServiceCategoryService.cs`, `ServiceCategoryService.cs`
- Modify: `UseCases/Catalog/CatalogSearchService.cs` + `ICatalogSearchService` (bỏ `GetCategoriesAsync`), `DependencyInjection.cs`
- Test: `tests/Application.Tests/Catalog/ServiceCategoryServiceTests.cs`, `CatalogValidatorTests.cs`

**Interfaces:**

- Produces: `ServiceCategoryDto(Guid Id, string Name, string? Description, int SortOrder, bool IsActive, int ServiceCount)`.
- Produces: `CreateServiceCategoryRequest(string Name, string? Description, int? SortOrder, bool? IsActive)`, `UpdateServiceCategoryRequest(string Name, string? Description, int SortOrder, bool IsActive)`.
- Produces: `IServiceCategoryService`: `ListAsync(CancellationToken) → OperationResult<IReadOnlyList<ServiceCategoryDto>>` (publicOnly = `!CatalogViewer.IsOwner`), `CreateAsync`, `UpdateAsync(Guid id, …)`, `DeleteAsync(Guid id, …)`.
- Tên chuẩn hóa: trim + gộp khoảng trắng (hàm `CatalogText.NormalizeName(string?)`, đặt ở `UseCases/Catalog/CatalogText.cs`, thay `ServiceCategoryResolver.Normalize`).

- [ ] **Step 1: Test** `ServiceCategoryServiceTests`: tạo `"  Massage   body "` → lưu `"Massage body"`, `SortOrder` 0, `IsActive` true; `NameExistsAsync` true → `ConflictException` `service_category_exists`; sửa id không có → `NotFoundException` `service_category_not_found`; xóa khi `HasServicesAsync` true → `ConflictException` `service_category_in_use`; xóa trống → `Remove` được gọi và `SaveChangesAsync`. Validator: tên rỗng, 101 ký tự, `Description` 501, `SortOrder` -1 và 1000 → lỗi đúng trường.
- [ ] **Step 2:** Chạy filter `ServiceCategoryServiceTests` → FAIL.
- [ ] **Step 3:** Cài đặt.
- [ ] **Step 4:** PASS.
- [ ] **Step 5: Commit (người dùng chạy):** `git commit -m "feat(catalog): manage service categories"`

### Task 6: Infrastructure repositories, AI tool, API

**Files:**

- Create: `backend/src/Infrastructure/Repositories/ServiceCategoryRepository.cs` (đăng ký DI)
- Modify: `SpaServiceRepository.cs` (lọc `CategoryId`; `search` khớp `service.Category!.Name` qua `f_unaccent`; projection lấy `Category.Name` + `CategoryId`; xóa `FindCategoryAsync`, `GetCategoriesAsync` và khai báo trong `ISpaServiceRepository`)
- Modify: `Application/UseCases/AiAssistant/AiToolExecutor.cs` (tham số `category` của `search_catalog`: tìm danh mục theo tên không dấu qua `IServiceCategoryRepository`, rồi lọc `CategoryId`; không thấy → kết quả rỗng; trả `category` = tên)
- Modify: `backend/src/API/Controllers/ServiceCategoriesController.cs` (GET dùng `IServiceCategoryService`; thêm POST 201 + `Location`, PUT, DELETE 204)
- Modify: `backend/src/Infrastructure/Persistence/Seeds/DemoDataSeeder.cs` (tạo/tái dùng danh mục "Chăm sóc da")
- Modify test helpers: `tests/IntegrationTests/Catalog/CatalogApi.cs` (helper `CreateCategoryAsync(name)`; body dịch vụ dùng `categoryId`), `Care/CareApi.cs`, `Staff/StaffApi.cs`, `Treatments/TreatmentApi.cs`, `Bookings/AppointmentRepositoryTests.cs`, `Orders/OrderingSchemaTests.cs`, `UnitOfWorkTransactionTests.cs`, `Application.Tests/Staff/StaffServiceTests.cs`, AI tests nếu dùng `Category` string
- Test: `tests/IntegrationTests/Catalog/ServiceCategoryEndpointsTests.cs`, cập nhật `CatalogReadEndpointsTests.cs`, `CatalogManageEndpointsTests.cs`

**Interfaces:**

- Consumes: Task 3–5.
- `ServiceCategoryRepository.ListAsync(publicOnly)`: publicOnly → `IsActive` và có ≥ 1 dịch vụ `on_sale`, `ServiceCount` = số dịch vụ `on_sale`; chủ spa → mọi danh mục, `ServiceCount` = mọi dịch vụ; `OrderBy(SortOrder).ThenBy(Name)`.

- [ ] **Step 1: Test** `ServiceCategoryEndpointsTests` (CAT-T34, T35, T38, T39) và bổ sung CAT-T36, T37, T40, T41 vào hai file test có sẵn; thêm `concurrent duplicate name gives 409` (hai `POST` cùng tên chạy `Task.WhenAll` → một 201, một 409 `service_category_exists`).
- [ ] **Step 2:** `dotnet test backend/NhuNguyetSpa.sln --filter "FullyQualifiedName~IntegrationTests.Catalog"` (Docker chạy) → FAIL.
- [ ] **Step 3:** Cài đặt; sửa các test helper tạo `SpaService` (mỗi helper tạo một `ServiceCategory` dùng chung trong test class).
- [ ] **Step 4:** `dotnet build backend/NhuNguyetSpa.sln` không cảnh báo mới; `dotnet test backend/NhuNguyetSpa.sln` → toàn bộ PASS.
- [ ] **Step 5: Commit (người dùng chạy):** `git commit -m "feat(api): service category endpoints"`

### Task 7: Postman

**Files:** `backend/postman/generate_collection.py`, sinh lại `NhuNguyetSpa.postman_collection.json`

- [ ] **Step 1:** `SERVICE_BODY` dùng `"categoryId": "{{categoryId}}"`; request "Danh sách dịch vụ" dùng query `categoryId`; thư mục mới "Danh mục dịch vụ" (Danh sách, Thêm — test script lưu `categoryId`, Sửa, Xóa); mô tả cũ về BR-CAT-04 đổi thành BR-CAT-10.
- [ ] **Step 2:** `python -I backend/postman/generate_collection.py` → JSON sinh lại, `npx prettier --check` file JSON pass.

### Task 8: Web

**Files:**

- Modify: `packages/shared-types/src/catalog.ts` (`ServiceCategory`; `categoryId` trong `ServiceListItem`; `ServiceSearchParams.categoryId?: string` thay `category`), `packages/api-client/src/catalog.ts` + test (`listServiceCategories` trả `readonly ServiceCategory[]`; query `categoryId`)
- Modify: `apps/web/src/features/services/hooks/useCatalogListParams.ts` (URL `categoryId`; `applyFilters({ categoryId, … })`), `components/ServiceFilterPanel.tsx` (checkbox theo `id`, nhãn tên + số `serviceCount`), `components/ActiveFilterChips.tsx` + `ServiceSearch.tsx` (tên chip tra từ danh sách danh mục), `components/ServiceDetailView.tsx` (link `/services?categoryId=…`), `components/RelatedServices.tsx` (lọc `categoryId`), `features/service-packages/components/PackageSearch.tsx` (bỏ `categoryId` khỏi query gói)
- Test: `ServicesPage.test.tsx`, `ServiceDetailPage.test.tsx`, `useCatalogListParams.test.tsx`, `packages/api-client/src/catalog.test.ts`

- [ ] **Step 1: Test (CAT-UI-T17):** mock `/service-categories` trả `[{ id: 'c1', name: 'Massage', serviceCount: 4, … }]`; chọn checkbox `Massage` (nhãn có `4`) + "Áp dụng bộ lọc" → URL `categoryId=c1`, request `categoryId=c1`; chip "Massage"; link danh mục ở chi tiết `href="/services?categoryId=<id>"`; "Dịch vụ cùng loại" gửi `categoryId`; **`ignores a legacy category name in the URL`**: mở `/services?category=Massage` → request không có `category`, trang hiện bình thường. Cập nhật test Review Focus "accented category with &" sang dùng id.
- [ ] **Step 2:** `npm run test --workspace @spa/web` và `--workspace @spa/api-client` → FAIL.
- [ ] **Step 3:** Cài đặt.
- [ ] **Step 4:** PASS; `npm run typecheck`, `npm run lint` PASS.
- [ ] **Step 5: Commit (người dùng chạy):** `git commit -m "feat(web): filter services by category id"`

### Task 9: Tài liệu và kiểm tra cuối

**Files:** `docs/progress.md` (ghi chú UC-SPA-06/09: danh mục là bảng, API quản trị danh mục), `CLAUDE.md` (đoạn Catalog: thêm `service_categories`, `/service-categories` CRUD, migration `AddServiceCategories`), `docs/frontend.md` (lọc theo `categoryId`, `serviceCount`), `docs/specs/catalog.md` (đổi "đề xuất" → "đã làm"; BR-CAT-04 ghi "thay bằng BR-CAT-10")

- [ ] **Step 1:** Cập nhật tài liệu.
- [ ] **Step 2:** Chạy đủ lệnh kiểm tra trong Global Constraints → tất cả PASS (ghi số test).
- [ ] **Step 3:** Thủ công (Docker): `npm run db:up`, `npm run db:migrate`, `npm run db:seed:demo`, `npm run dev`; mở `/services`, lọc theo danh mục, kiểm tra số dịch vụ; `GET /api/v1/service-categories` trên Swagger.
- [ ] **Step 4:** Ghi chú cho người dùng: file SQL bản nộp `docs/export/NhuNguyetSpa_CSDL_TiengViet.sql` cần sinh lại theo `docs/spec-source/README.md` (cần Docker).

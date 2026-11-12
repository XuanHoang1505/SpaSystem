# Mô tả ngắn và quy trình dịch vụ (Q-71) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm `short_description` cho dịch vụ và gói, bảng con `service_steps` cho dịch vụ, trả qua API, hiển thị trên web thay nội dung tạm, và có dữ liệu mẫu trong `db:seed:catalog`.

**Architecture:** Domain (`ServiceStep`, `SpaService.ShortDescription`/`Steps`, `ServicePackage.ShortDescription`) → Infrastructure (configuration, migration `AddServiceShortDescriptionAndSteps`, projection trong repository, seed) → Application (DTO, validator BR-CAT-15..17, `ServiceCatalogService`/`PackageCatalogService`, AI tool) → API (không đổi controller) → shared-types/api-client → web (`ServiceCard`, `CatalogCard`, `ServiceDetailView`, `CareSteps`, `PackageDetailView`).

**Tech Stack:** .NET 9, EF Core 9 + Npgsql, FluentValidation, xUnit + NSubstitute + Testcontainers; React + TanStack Query + Vitest.

**Spec:** `docs/specs/catalog.md`, mục "Mô tả ngắn và quy trình dịch vụ (Q-71, đề xuất 08/11/2026)" (BR-CAT-15..18, CAT-T42..T47, CAT-UI-T18).

## Global Constraints

- Tên theo glossary (thêm `ServiceStep` / `service_steps` / DA `BuocDichVu`, cột DA `MoTaNgan`). Thông điệp lỗi tiếng Việt; không mã lỗi mới (chỉ `validation_error` theo trường).
- Giới hạn: `short_description` ≤ 200; bước: tối đa 12, `title` 1–100, `description` ≤ 500, `duration_minutes` 1–600; tổng phút các bước ≤ thời lượng dịch vụ. Server đánh `sort_order` 1..n theo thứ tự mảng.
- PUT dịch vụ: `steps == null` giữ nguyên; mảng (kể cả rỗng) thay toàn bộ trong cùng `SaveChanges` (xóa bước cũ bằng `RemoveRange` rồi thêm mới, như `ServicePackageRepository.ReplaceItems`).
- Không đổi hành vi khác; toàn bộ test hiện có pass; `PersistenceModelTests` pass (sinh lại `data-model.md` từ `data_db.py`).
- `npm run dev` của người dùng có thể đang chạy và khóa `backend/src/API/bin`: build/test backend ra thư mục output riêng trong scratchpad (`dotnet build backend/tests/IntegrationTests -o <scratch>/itest-out`, rồi `dotnet test <scratch>/itest-out/NhuNguyetSpa.IntegrationTests.dll`); tạo migration chỉ khi API không chạy (nếu bị khóa thì hỏi người dùng tắt).
- Web: theo `apps/web/CLAUDE.md`; chạy `npm` với cwd `E:\` (chữ hoa) vì Vitest lỗi khi ổ đĩa viết thường.
- Git do người dùng tự chạy: không commit; không thêm Co-Authored-By/"Generated with".

## Review Focus

- PUT dịch vụ chỉ gửi trường cũ (client chưa biết `steps`) không được làm mất quy trình (Task 3 test CAT-T44 phần "không gửi steps").
- Bước có `durationMinutes` null không tính vào tổng phút (Task 3 validator test).
- Dịch vụ không có bước: trang chi tiết ẩn cả mục quy trình, không hiện tiêu đề rỗng (Task 5 test).
- Seed chạy lại trên DB đã có bước: thay bước, không lỗi unique `(spa_service_id, sort_order)` (Task 4 test seeder idempotent).

---

### Task 1: Tài liệu nguồn

- [ ] `data_db.py`: `spa_services`/`service_packages` thêm `short_description|varchar(200)|Y||Mô tả ngắn|MoTaNgan`; bảng `("CAT","service_steps","ServiceStep","BuocDichVu",…,DX,…)` với `id`, `spa_service_id` (FK → spa_services.id, CASCADE; UQ (spa_service_id, sort_order)), `sort_order` (CHECK 1..12), `title` varchar(100), `description` varchar(500) Y, `duration_minutes` integer Y (CHECK 1..600). Sinh lại `data-model.md` + Excel; `build_vi_db.py` chạy được (bảng/cột mới tự bị bỏ).
- [ ] Glossary dòng `BuocDichVu | ServiceStep | service_steps | Catalog | services | (lồng trong /services/{id})`; Q-71 trong `open-questions.md` ("Đã chốt 08/11/2026").

### Task 2: Domain + Persistence + migration

- [ ] Test (RED): `PersistenceModelTests` (cột mới), `CatalogSchemaTests.ServiceStepsRejectDuplicateSortOrder` (chèn 2 bước cùng `(service, sort_order)` → `DbUpdateException`).
- [ ] `ServiceStep : BaseEntity { Guid SpaServiceId; int SortOrder; string Title; string? Description; int? DurationMinutes }`; `SpaService.ShortDescription`, `SpaService.Steps : ICollection<ServiceStep>`; `ServicePackage.ShortDescription`.
- [ ] `ServiceStepConfiguration` (bảng, CHECK `ck_service_steps_sort_order`, `ck_service_steps_duration_minutes`, unique `ux_service_steps_spa_service_id_sort_order`, FK cascade), cột `short_description` maxLength 200 trong hai configuration; `DbSet<ServiceStep> ServiceSteps`.
- [ ] Migration `AddServiceShortDescriptionAndSteps`; test GREEN.

### Task 3: Application

- [ ] Test (RED) trong `ServiceCatalogServiceTests`/`CatalogValidatorTests`/`PackageCatalogServiceTests`: CAT-T42 (trim → null, thứ tự bước, `SortOrder` 1..n), CAT-T43 (các trường hợp 400), CAT-T44 (null giữ / `[]` xóa / thay), gói lưu `ShortDescription`.
- [ ] DTO: `ServiceStepRequest(string Title, string? Description, int? DurationMinutes)`, `ServiceStepDto(int SortOrder, string Title, string? Description, int? DurationMinutes)`; `CreateServiceRequest`/`UpdateServiceRequest`/`IServiceFields` thêm `string? ShortDescription`, `IReadOnlyList<ServiceStepRequest>? Steps`; `ServiceListItemDto`, `ServiceDetailDto` (+ `IReadOnlyList<ServiceStepDto> Steps`), `PackageListItemDto`, `PackageDetailDto`, `Create/UpdatePackageRequest`, `IPackageFields` thêm `ShortDescription`.
- [ ] Validator: `ShortDescription` ≤ 200; `Steps` ≤ 12, mỗi bước theo BR-CAT-16, tổng phút ≤ `DurationMinutes`.
- [ ] `IServiceStepRepository`? Không: thay bước qua `ISpaServiceRepository.ReplaceSteps(SpaService, IReadOnlyCollection<ServiceStep>)` + `GetWithStepsAsync(Guid)`; mapping `ToDetailDto` gồm `Steps` theo `SortOrder`.
- [ ] AI `AiToolExecutor`: thêm `shortDescription` vào kết quả `search_catalog` (dịch vụ, gói) và `get_product_detail`.

### Task 4: Infrastructure repository + seed

- [ ] `SpaServiceRepository`: projection danh sách/chi tiết thêm `ShortDescription`, `Steps` (OrderBy SortOrder); `GetWithStepsAsync`, `ReplaceSteps` (RemoveRange + thêm). `ServicePackageRepository`: projection thêm `ShortDescription`.
- [ ] `CatalogDataSeeder`: `shortDescription` cho mọi dịch vụ/gói mẫu trừ `FaceBasic` và `PackageWaxLegs`; 3–5 bước cho 18 dịch vụ (tổng phút ≤ thời lượng), không bước cho `FaceBasic`, `BodyMud`, `WaxUnderarm`, `WaxFace`; thay bước khi chạy lại.
- [ ] Integration test (RED→GREEN): CAT-T42, T44, T45 trong `CatalogManageEndpointsTests`/`CatalogReadEndpointsTests`; seeder test kiểm số bước và chạy lại không lỗi.

### Task 5: Web

- [ ] Test (RED): CAT-UI-T18 trong `ServicesPage.test.tsx`, `PackagesPage.test.tsx`, `ServiceDetailPage.test.tsx`, `PackageDetailPage.test.tsx`.
- [ ] `shared-types` (`ServiceStep`, `shortDescription`, `steps`), api-client test fixture.
- [ ] `ServiceCard`: dòng mô tả = `shortDescription`, ẩn khi null; xóa `placeholderServiceSummary`. `CatalogCard`: prop `description?` (2 dòng). `ServiceDetailView`: lead = `shortDescription`, thẻ "Mô tả" = `description`, `CareSteps({ steps })` ẩn khi rỗng (xóa `placeholderCareSteps`; "Bạn sẽ nhận được" vẫn tạm). `PackageDetailView`: lead = `shortDescription`.
- [ ] lint, typecheck, test, format:check, web:build PASS.

### Task 6: Tài liệu và kiểm tra cuối

- [ ] `docs/progress.md`, `CLAUDE.md` (đoạn Catalog), `docs/frontend.md`, spec "đề xuất" → "đã làm".
- [ ] Toàn bộ test backend (output riêng) + JS; `db:migrate` + `db:seed:catalog` trên DB dev; kiểm tra `GET /services/{id}` có `steps`.

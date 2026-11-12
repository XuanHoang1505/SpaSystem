# Owner Catalog Management, Web (UC-SPA-09) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the owner catalog management screens for spa services (`SCR-W31` at `/owner/services`) and service packages (`SCR-W32` at `/owner/packages`), replacing `PlaceholderPage` with full management capabilities: `DataTable` lists with search & filters, detail sheets, create/edit forms, Cloudinary image upload/delete, category management, and status toggle (on_sale $\leftrightarrow$ discontinued).

**Architecture:**
- **Contracts:** `@spa/shared-types` (`catalog.ts` extended with request DTOs and status filter support).
- **API Client:** `@spa/api-client` (`CatalogApi` extended with owner methods for services, packages, and categories).
- **Web Lib & Policies:** `apps/web/src/lib/api/catalog.ts` (`callCatalog`, `callCatalogVoid`) and `catalogPolicies.ts`.
- **Feature `services`:** `apps/web/src/features/services/` (schemas, category & service mutation hooks, `components/owner/` containing table, filter toolbar, detail sheet, service form dialog, image dialog, category dialog, toggle status dialog, and `OwnerServicesView`).
- **Feature `service-packages`:** `apps/web/src/features/service-packages/` (schemas, package mutation hooks, `components/owner/` containing table, filter toolbar, detail sheet, package form dialog with session items editor, image dialog, toggle status dialog, and `OwnerPackagesView`).
- **Pages & Routes:** `apps/web/src/pages/owner/OwnerServicesPage.tsx` and `OwnerPackagesPage.tsx` registered in `apps/web/src/app/router.tsx` under `ownerPages`.

**Tech Stack:** React 19, TypeScript strict, TanStack Query, React Router, React Hook Form + Zod, Tailwind v4 + shadcn/ui, Lucide Icons, Vitest + Testing Library.

**Spec:** `docs/specs/catalog.md`, section "Giao diện quản trị chủ spa (UC-SPA-09)".

---

## Global Constraints

- Names follow `docs/domain/glossary.md`: `services`, `service-packages`, `service-categories`.
- Component exports must be named exports. No `any`, `@ts-ignore`, or `as unknown as`.
- UI composed exclusively from `components/ui` (shadcn) and `components/shared` (`DataTable`, `PageHeader`, `StatusBadge`, `EmptyState`, `ErrorState`). The tables must use `DataTable`; never a raw `<table>`.
- Style using Tailwind classes with tokens from `styles/theme.css`: no hardcoded colors (`text-[#...]`), no `bg-white`/`text-black`.
- Calling pattern: `@spa/api-client` → `lib/api` → hook → component. Components never call `fetch` directly.
- Invalidation:
  - Service mutations invalidate `catalogQueryKeys.services`, `catalogQueryKeys.service(id)`, `catalogQueryKeys.all`.
  - Category mutations invalidate `catalogQueryKeys.categories` and `catalogQueryKeys.services`.
  - Package mutations invalidate `catalogQueryKeys.packages`, `catalogQueryKeys.package(id)`, `catalogQueryKeys.all`.
- Error handling matches `ApiClientError.errors[].code`. Form errors map directly to inputs.
- Vietnamese copy with diacritics. Currency formatted as `vi-VN` đ (`formatCurrency`). Duration formatted as "X phút" / "X giờ Y phút" (`formatDuration`).
- Supports light and dark modes in `OwnerLayout`.
- **CRITICAL CONSTRAINT:** Under NO circumstances should any test files (`*.test.ts`, `*.test.tsx`) be committed to git.

---

## File Structure

| File | Action | Responsibility |
| --- | --- | --- |
| `packages/shared-types/src/catalog.ts` | Modify | Add owner request DTOs (`CreateServiceRequest`, `UpdateServiceRequest`, `ServiceStepRequest`, `CreatePackageRequest`, `UpdatePackageRequest`, `PackageItemRequest`, `ChangeCatalogStatusRequest`, `CreateServiceCategoryRequest`, `UpdateServiceCategoryRequest`, `CatalogImageUploadResponse`) and update search params with `status?: CatalogStatus` |
| `packages/api-client/src/catalog.ts` | Modify | Add owner methods (`createService`, `updateService`, `changeServiceStatus`, `uploadServiceImage`, `deleteServiceImage`, `createPackage`, `updatePackage`, `changePackageStatus`, `uploadPackageImage`, `deletePackageImage`, `createCategory`, `updateCategory`, `deleteCategory`) and error codes |
| `packages/api-client/src/catalog.test.ts` | Modify | Unit tests for catalog owner API client methods (uncommitted) |
| `apps/web/src/lib/api/catalog.ts` | Modify | Add `callCatalog<T>` and `callCatalogVoid` wrappers |
| `apps/web/src/features/services/catalogPolicies.ts` | Modify | Add image upload constraints (`maxImageSizeBytes: 5 * 1024 * 1024`, allowed mime types) |
| `apps/web/src/features/services/schemas.ts` | Create | Zod schemas for service create/edit, steps, and categories |
| `apps/web/src/features/service-packages/schemas.ts` | Create | Zod schemas for package create/edit and package items |
| `apps/web/src/features/services/hooks/useServiceMutations.ts` | Create | Mutation hooks for services and service categories |
| `apps/web/src/features/service-packages/hooks/usePackageMutations.ts` | Create | Mutation hooks for service packages |
| `apps/web/src/features/services/components/owner/ServiceFilterToolbar.tsx` | Create | Search input, category dropdown, status dropdown, clear button, action CTAs |
| `apps/web/src/features/services/components/owner/ServiceTable.tsx` | Create | `DataTable` for services with thumbnails, badges, and action dropdown with icons |
| `apps/web/src/features/services/components/owner/ServiceDetailSheet.tsx` | Create | Detail drawer for service info, image, procedure steps, and action triggers |
| `apps/web/src/features/services/components/owner/ServiceFormDialog.tsx` | Create | Modal dialog to create or edit a service including step list |
| `apps/web/src/features/services/components/owner/ServiceImageDialog.tsx` | Create | Modal dialog to upload or delete service image with preview |
| `apps/web/src/features/services/components/owner/ServiceCategoriesDialog.tsx` | Create | Modal dialog to manage categories (list, add, edit, delete empty) |
| `apps/web/src/features/services/components/owner/ToggleServiceStatusDialog.tsx` | Create | Confirmation dialog to toggle on_sale $\leftrightarrow$ discontinued |
| `apps/web/src/features/services/components/owner/OwnerServicesView.tsx` | Create | Container view for `/owner/services` (SCR-W31) |
| `apps/web/src/features/service-packages/components/owner/PackageFilterToolbar.tsx` | Create | Search input, status dropdown, clear button, "Tạo gói" CTA |
| `apps/web/src/features/service-packages/components/owner/PackageTable.tsx` | Create | `DataTable` for packages with thumbnail fallback, pricing, validity, actions |
| `apps/web/src/features/service-packages/components/owner/PackageDetailSheet.tsx` | Create | Detail drawer for package info, savings %, session timeline, actions |
| `apps/web/src/features/service-packages/components/owner/PackageFormDialog.tsx` | Create | Modal dialog to create/edit package with dynamic item sessions table |
| `apps/web/src/features/service-packages/components/owner/PackageImageDialog.tsx` | Create | Modal dialog to upload or delete package image |
| `apps/web/src/features/service-packages/components/owner/TogglePackageStatusDialog.tsx` | Create | Confirmation dialog to toggle on_sale $\leftrightarrow$ discontinued |
| `apps/web/src/features/service-packages/components/owner/OwnerPackagesView.tsx` | Create | Container view for `/owner/packages` (SCR-W32) |
| `apps/web/src/pages/owner/OwnerServicesPage.tsx` | Create | Page component for `/owner/services` |
| `apps/web/src/pages/owner/OwnerPackagesPage.tsx` | Create | Page component for `/owner/packages` |
| `apps/web/src/app/router.tsx` | Modify | Wire `/owner/services` and `/owner/packages` in `ownerPages` |
| `docs/progress.md` | Modify | Mark UC-SPA-09 Web as ✅ |
| `docs/frontend.md` | Modify | Document `/owner/services` and `/owner/packages` features |

---

## Tasks

### Task 1: Contracts in `@spa/shared-types`
- [ ] In `packages/shared-types/src/catalog.ts`:
  - Update `ServiceSearchParams` with `status?: CatalogStatus`.
  - Update `PackageSearchParams` with `status?: CatalogStatus`.
  - Export `ServiceStepRequest`: `{ title: string; description?: string | null; durationMinutes?: number | null }`.
  - Export `CreateServiceRequest`: `{ name: string; categoryId: string; description?: string | null; shortDescription?: string | null; durationMinutes: number; price: number; status?: CatalogStatus; steps?: readonly ServiceStepRequest[] }`.
  - Export `UpdateServiceRequest`: `{ name: string; categoryId: string; description?: string | null; shortDescription?: string | null; durationMinutes: number; price: number; steps?: readonly ServiceStepRequest[] }`.
  - Export `PackageItemRequest`: `{ spaServiceId: string; sessionCount: number; sortOrder: number; minDaysBetweenSessions: number; note?: string | null }`.
  - Export `CreatePackageRequest`: `{ name: string; description?: string | null; shortDescription?: string | null; price: number; validityDays: number; saleStartDate?: string | null; saleEndDate?: string | null; status?: CatalogStatus; items?: readonly PackageItemRequest[] }`.
  - Export `UpdatePackageRequest`: `{ name: string; description?: string | null; shortDescription?: string | null; price: number; validityDays: number; saleStartDate?: string | null; saleEndDate?: string | null; items?: readonly PackageItemRequest[] }`.
  - Export `ChangeCatalogStatusRequest`: `{ status: CatalogStatus }`.
  - Export `CreateServiceCategoryRequest`: `{ name: string; description?: string | null; sortOrder?: number; isActive?: boolean }`.
  - Export `UpdateServiceCategoryRequest`: `{ name: string; description?: string | null; sortOrder: number; isActive: boolean }`.
  - Export `CatalogImageUploadResponse`: `{ imageUrl: string }`.
- [ ] Verify: `npm run typecheck --workspace=@spa/shared-types`.

### Task 2: API Client in `@spa/api-client`
- [ ] In `packages/api-client/src/catalog.ts`:
  - Extend `CatalogApi` with:
    - `createService(body: CreateServiceRequest, signal?: AbortSignal)`: calls `POST /api/v1/services`.
    - `updateService(id: string, body: UpdateServiceRequest, signal?: AbortSignal)`: calls `PUT /api/v1/services/{id}`.
    - `changeServiceStatus(id: string, body: ChangeCatalogStatusRequest, signal?: AbortSignal)`: calls `PATCH /api/v1/services/{id}/status`.
    - `uploadServiceImage(id: string, file: File | Blob, signal?: AbortSignal)`: calls `POST /api/v1/services/{id}/image` with `FormData`.
    - `deleteServiceImage(id: string, signal?: AbortSignal)`: calls `DELETE /api/v1/services/{id}/image`.
    - `createPackage(body: CreatePackageRequest, signal?: AbortSignal)`: calls `POST /api/v1/packages`.
    - `updatePackage(id: string, body: UpdatePackageRequest, signal?: AbortSignal)`: calls `PUT /api/v1/packages/{id}`.
    - `changePackageStatus(id: string, body: ChangeCatalogStatusRequest, signal?: AbortSignal)`: calls `PATCH /api/v1/packages/{id}/status`.
    - `uploadPackageImage(id: string, file: File | Blob, signal?: AbortSignal)`: calls `POST /api/v1/packages/{id}/image` with `FormData`.
    - `deletePackageImage(id: string, signal?: AbortSignal)`: calls `DELETE /api/v1/packages/{id}/image`.
    - `createCategory(body: CreateServiceCategoryRequest, signal?: AbortSignal)`: calls `POST /api/v1/service-categories`.
    - `updateCategory(id: string, body: UpdateServiceCategoryRequest, signal?: AbortSignal)`: calls `PUT /api/v1/service-categories/{id}`.
    - `deleteCategory(id: string, signal?: AbortSignal)`: calls `DELETE /api/v1/service-categories/{id}`.
  - Extend `catalogErrorCodes` with:
    - `serviceCategoryNotFound: 'service_category_not_found'`
    - `serviceCategoryExists: 'service_category_exists'`
    - `serviceCategoryInUse: 'service_category_in_use'`
    - `packageServiceNotFound: 'package_service_not_found'`
    - `packageServiceDiscontinued: 'package_service_discontinued'`
    - `requestTooLarge: 'request_too_large'`
    - `imageStorageUnavailable: 'image_storage_unavailable'`
- [ ] Write unit tests in `packages/api-client/src/catalog.test.ts` (kept uncommitted).
- [ ] Verify: `npm run typecheck --workspace=@spa/api-client` and `npm run test --workspace=@spa/api-client`.

### Task 3: Web API Wrappers & Policies
- [ ] In `apps/web/src/lib/api/catalog.ts`:
  - Add `callCatalog<T>(fn: (api: CatalogApi) => Promise<T>): Promise<T>` using authenticated client.
  - Add `callCatalogVoid(fn: (api: CatalogApi) => Promise<unknown>): Promise<void>`.
- [ ] In `apps/web/src/features/services/catalogPolicies.ts`:
  - Add `maxImageSizeBytes: 5 * 1024 * 1024` (5MB).
  - Add `allowedImageMimeTypes: ['image/jpeg', 'image/png', 'image/webp'] as const`.

### Task 4: Zod Schemas
- [ ] Create `apps/web/src/features/services/schemas.ts`:
  - `serviceStepSchema`: `title` (1–150 chars), `durationMinutes` (optional, 1–1440), `description` (optional, $\le$ 1000 chars).
  - `serviceFormSchema`: `name` (1–150 chars), `categoryId` (uuid/string), `price` (int $\ge$ 0), `durationMinutes` (1–1440), `shortDescription` (optional, $\le$ 300 chars), `description` (optional, $\le$ 4000 chars), `steps` (array of `serviceStepSchema`).
  - `serviceCategoryFormSchema`: `name` (1–100 chars), `description` (optional, $\le$ 500 chars), `sortOrder` (int $\ge$ 0), `isActive` (boolean).
- [ ] Create `apps/web/src/features/service-packages/schemas.ts`:
  - `packageItemSchema`: `spaServiceId` (string required), `sessionCount` (int 1–100), `sortOrder` (int 1–100), `minDaysBetweenSessions` (int 0–365), `note` (optional, $\le$ 1000 chars).
  - `packageFormSchema`: `name` (1–150 chars), `price` (int $\ge$ 0), `validityDays` (int 1–3650), `shortDescription` (optional, $\le$ 300 chars), `description` (optional, $\le$ 4000 chars), `saleStartDate` (optional date string `yyyy-MM-dd`), `saleEndDate` (optional date string $\ge$ `saleStartDate`), `items` (array of `packageItemSchema`, min 1, max 20).

### Task 5: React Query Mutation Hooks
- [ ] In `apps/web/src/features/services/hooks/useServiceMutations.ts`:
  - `useCreateService`: calls `callCatalog((api) => api.createService(body))`, invalidates `catalogQueryKeys.services`, `categories`.
  - `useUpdateService`: calls `callCatalog((api) => api.updateService(id, body))`, invalidates `catalogQueryKeys.services`, `service(id)`.
  - `useChangeServiceStatus`: calls `callCatalogVoid((api) => api.changeServiceStatus(id, body))`, invalidates `catalogQueryKeys.services`, `service(id)`.
  - `useUploadServiceImage`: calls `callCatalog((api) => api.uploadServiceImage(id, file))`, invalidates `catalogQueryKeys.services`, `service(id)`.
  - `useDeleteServiceImage`: calls `callCatalogVoid((api) => api.deleteServiceImage(id))`, invalidates `catalogQueryKeys.services`, `service(id)`.
  - `useCreateCategory`: calls `callCatalog((api) => api.createCategory(body))`, invalidates `catalogQueryKeys.categories`.
  - `useUpdateCategory`: calls `callCatalog((api) => api.updateCategory(id, body))`, invalidates `catalogQueryKeys.categories`.
  - `useDeleteCategory`: calls `callCatalogVoid((api) => api.deleteCategory(id))`, invalidates `catalogQueryKeys.categories`.
- [ ] In `apps/web/src/features/service-packages/hooks/usePackageMutations.ts`:
  - `useCreatePackage`: calls `callCatalog((api) => api.createPackage(body))`, invalidates `catalogQueryKeys.packages`.
  - `useUpdatePackage`: calls `callCatalog((api) => api.updatePackage(id, body))`, invalidates `catalogQueryKeys.packages`, `package(id)`.
  - `useChangePackageStatus`: calls `callCatalogVoid((api) => api.changePackageStatus(id, body))`, invalidates `catalogQueryKeys.packages`, `package(id)`.
  - `useUploadPackageImage`: calls `callCatalog((api) => api.uploadPackageImage(id, file))`, invalidates `catalogQueryKeys.packages`, `package(id)`.
  - `useDeletePackageImage`: calls `callCatalogVoid((api) => api.deletePackageImage(id))`, invalidates `catalogQueryKeys.packages`, `package(id)`.

### Task 6: SCR-W31 Services Management Components (`features/services/components/owner/`)
- [ ] `ServiceFilterToolbar.tsx`: Search input (debounced), Category dropdown, Status dropdown (All / on_sale / discontinued), "Đặt lại" button, CTA "Danh mục dịch vụ" (FolderTreeIcon) and "Thêm dịch vụ" (PlusIcon).
- [ ] `ServiceTable.tsx`: `DataTable<ServiceListItem>` with columns: Thumbnail (40×40), Name + shortDescription, Category, Duration, Price, StatusBadge (green for on_sale, neutral for discontinued), and row actions with icons (`EyeIcon` Xem chi tiết, `PencilIcon` Sửa, `ImageIcon` Đổi ảnh, `PowerIcon` Ngừng bán / Mở bán lại).
- [ ] `ServiceDetailSheet.tsx`: Sheet previewing service image, name, category, price, duration, short & long description, procedure steps list, createdAtUtc/updatedAtUtc, and footer action buttons.
- [ ] `ServiceFormDialog.tsx`: Dialog with responsive form: name, category, duration, price, shortDescription, description, procedure steps dynamic list (add, edit, delete step, sortOrder auto-sequence).
- [ ] `ServiceImageDialog.tsx`: Dialog with image preview, drag-and-drop / file selector, upload button, and delete button (if image exists).
- [ ] `ServiceCategoriesDialog.tsx`: Dialog managing categories: table/list of categories (name, description, sortOrder, isActive, serviceCount), create category inline/dialog, edit category, delete category (disabled if `serviceCount > 0` with warning).
- [ ] `ToggleServiceStatusDialog.tsx`: Confirmation dialog explaining consequences of changing status.
- [ ] `OwnerServicesView.tsx`: Main view with PageHeader, filter toolbar, ServiceTable, sheet & dialogs integration.

### Task 7: SCR-W32 Packages Management Components (`features/service-packages/components/owner/`)
- [ ] `PackageFilterToolbar.tsx`: Search input (debounced), Status dropdown, "Đặt lại" button, CTA "Tạo gói dịch vụ" (PlusIcon).
- [ ] `PackageTable.tsx`: `DataTable<PackageListItem>` with columns: Thumbnail (or fallback), Name + shortDescription, Sessions count, Validity days, Pricing (package price + strikethrough retail price & % discount), Sale period, StatusBadge, and row actions with icons (`EyeIcon` Xem chi tiết, `PencilIcon` Sửa gói, `ImageIcon` Đổi ảnh, `PowerIcon` Ngừng bán / Mở bán lại).
- [ ] `PackageDetailSheet.tsx`: Sheet previewing package info, savings %, sale period, timeline table of sessions (`items[]`: sortOrder, service name, service price, sessionCount, minDaysBetweenSessions, note, serviceStatus), and footer action buttons.
- [ ] `PackageFormDialog.tsx`: Dialog with form: name, price, validityDays, shortDescription, description, saleStartDate, saleEndDate, and dynamic package items table (choose service from `useServiceSearch({ status: 'on_sale' })`, sessionCount, sortOrder, minDaysBetweenSessions, note), live calculation of retail total and discount savings.
- [ ] `PackageImageDialog.tsx`: Dialog for uploading/deleting package image (with note that deletion will fallback to the first item's service image).
- [ ] `TogglePackageStatusDialog.tsx`: Confirmation dialog for package status toggle.
- [ ] `OwnerPackagesView.tsx`: Main view with PageHeader, filter toolbar, PackageTable, sheet & dialogs integration.

### Task 8: Pages & Router Wiring
- [ ] Create `apps/web/src/pages/owner/OwnerServicesPage.tsx` rendering `<OwnerServicesView />`.
- [ ] Create `apps/web/src/pages/owner/OwnerPackagesPage.tsx` rendering `<OwnerPackagesView />`.
- [ ] In `apps/web/src/app/router.tsx`:
  - Import `OwnerServicesPage` and `OwnerPackagesPage`.
  - Register in `ownerPages`:
    - `'/owner/services': <OwnerServicesPage />`
    - `'/owner/packages': <OwnerPackagesPage />`

### Task 9: Unit Tests & Verification
- [ ] Write component tests:
  - `apps/web/src/features/services/components/owner/OwnerServicesView.test.tsx` (uncommitted)
  - `apps/web/src/features/service-packages/components/owner/OwnerPackagesView.test.tsx` (uncommitted)
- [ ] Run quality checks:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run test --workspace=@spa/web`
  - `npm run web:build`
- [ ] Update documentation:
  - `docs/progress.md`: Mark UC-SPA-09 Web as `✅`.
  - `docs/frontend.md`: Add section documenting `/owner/services` (SCR-W31) and `/owner/packages` (SCR-W32).
- [ ] Verify that no `*.test.ts` or `*.test.tsx` files are staged or committed.

---

## Commit Strategy (when executing and committing)
1. `feat(shared-types): add owner catalog and service category contracts (UC-SPA-09)`
2. `feat(api-client): add owner catalog management APIs (UC-SPA-09)`
3. `feat(web): add owner services and categories management view (UC-SPA-09, SCR-W31)`
4. `feat(web): add owner packages management view (UC-SPA-09, SCR-W32)`
5. `feat(web): wire owner catalog routes (/owner/services, /owner/packages)`
6. `docs(catalog): update web specs and progress for owner catalog management (UC-SPA-09)`
*(No test files committed)*

# Danh mục dịch vụ và gói trên web (UC-SPA-06, UC-SPA-07) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thay 4 trang placeholder `/services`, `/services/:serviceId`, `/packages`, `/packages/:packageId` bằng màn tìm kiếm và xem chi tiết dịch vụ/gói thật, gọi API catalog đã có.

**Architecture:** Hợp đồng ở `packages/shared-types` + `CatalogApi` ở `packages/api-client` → `src/lib/api/catalog.ts` (instance + `callCatalog`) → hooks TanStack Query trong `features/services` và `features/service-packages` → component → trang ở `pages/public`. Bộ lọc giữ trên URL bằng `useTableSearchParams` có sẵn. Thành phần không chứa nghiệp vụ (ảnh dự phòng, ô thông tin, khoảng giá, phân trang đơn giản) đặt ở `components/shared`.

**Tech Stack:** React 19, React Router, TanStack Query, Tailwind v4 + shadcn/ui (`radix-ui`), lucide-react, Vitest + Testing Library.

**Spec:** `docs/specs/catalog.md`, mục "Giao diện (web)". Mẫu bố cục: Stitch `9696885610900739659/144dd9c02e8144ab88be106d9b31162b` (chỉ tham chiếu, không chép HTML/màu).

## Global Constraints

- Tên theo glossary: feature `services`, `service-packages`; API `/services`, `/packages`, `/service-categories`, `/catalog/suggestions`. Thư mục feature có `components/`, `hooks/`, `index.ts`; named export; không `any`, `@ts-ignore`, `as unknown as`.
- Chỉ ghép UI từ `src/components/ui` và `src/components/shared`. Không dùng `DataTable` ở đây (lưới thẻ, không phải bảng). Không tự dựng `<table>`.
- Màu chỉ bằng class token (`bg-primary`, `bg-accent`, `bg-secondary`, `bg-chart-5/50`, `text-muted-foreground`, `bg-status-*`…). Không hex, không `bg-white`, không CSS Modules, không `style` cho màu/khoảng cách. Trang công khai luôn sáng.
- Primitive shadcn mới (nếu cần) thêm bằng `npx shadcn@4.23.0 add <name>` trong `apps/web`, sửa import `cn` về `@/lib/utils`, gỡ gói `cn`, xóa khối `--sidebar-*` CLI thêm. Chỉ gói `radix-ui`.
- Luồng gọi API: `api-client` → `lib/api` → hook → component. Component không gọi `fetch`. Không có mutation trong phạm vi này.
- Lỗi xử lý theo `ApiClientError.status` và `errors[0].code` (`service_not_found`, `package_not_found`, `validation_error`), không theo message. Mỗi màn dữ liệu có đủ 4 trạng thái.
- Văn bản tiếng Việt có dấu, lấy nguyên từ spec. Tiền `formatCurrency` (vi-VN, ₫). Ngày `DateOnly` hiển thị bằng `formatLocalDate` (không đổi múi giờ).
- Query key từ `catalogQueryKeys`; chính sách mặc định (staleTime 60 s, tối đa 1 retry); chi tiết gặp 404 không retry; danh sách dùng `placeholderData: keepPreviousData`.
- Kích thước trang danh sách cố định 12 (`useTableSearchParams({ defaultPageSize: 12, pageSizeOptions: [12], defaultSort: { sortBy: 'name', sortDirection: 'asc' } })`).
- Không hiển thị nút "Thêm vào giỏ", "Đặt ngay", "Mua ngay"; không ★, không lọc "đã sử dụng".
- Không đổi hợp đồng backend. Test đặt cạnh file, `fetch` giả (`src/test/mockApi.tsx`), không cần backend.
- Chuyển động chỉ với `motion-safe:`; chạy được từ 320px, không cuộn ngang cả trang.
- Lệnh kiểm tra: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run format:check`, `npm run web:build`.
- Git do người dùng tự chạy: bước "Commit" chỉ là gợi ý lệnh cho người dùng; không thêm Co-Authored-By hay "Generated with".

## Review Focus

- Tên loại dịch vụ có dấu, khoảng trắng, `&` ("Chăm sóc da & body") phải đi URL → API → chip đang chọn khớp lại đúng (Task 7 test `keeps an accented category with & selected after reload`).
- Gõ nhanh trong ô tìm kiếm: chỉ từ khóa sau 300 ms được gọi, không hiện gợi ý của từ khóa cũ (Task 5 test `only fetches the settled term`).
- URL trỏ trang vượt `totalPages` (`items` rỗng, `totalCount > 0`) → về trang cuối thay vì báo rỗng (Task 7 test `jumps to the last page when page is past the end`).
- Ảnh Cloudinary trả lỗi (URL hỏng) → hiện ảnh dự phòng, không để khung vỡ (Task 3 test `falls back when the image fails to load`).
- Chủ spa đăng nhập xem trang công khai nhận mục `discontinued` → thẻ và chi tiết có badge "Ngừng bán", vẫn mở được (Task 6 test `shows Ngừng bán for a discontinued item`, Task 8 T10).

---

### Task 1: Hợp đồng catalog (shared-types + api-client)

**Files:**

- Create: `packages/shared-types/src/catalog.ts`; Modify: `packages/shared-types/src/index.ts` (thêm `export * from './catalog'`)
- Create: `packages/api-client/src/catalog.ts`, `packages/api-client/src/catalog.test.ts`; Modify: `packages/api-client/src/index.ts` (`export * from './catalog'`)

**Interfaces:**

- Produces (shared-types):
  - `CatalogStatus = 'on_sale' | 'discontinued'`, `CatalogItemType = 'service' | 'package'`, `CatalogSortField = 'name' | 'price'`
  - `ServiceListItem { id; name; category; price: number; durationMinutes: number; imageUrl: string | null; status: CatalogStatus }`
  - `ServiceDetail extends ServiceListItem { description: string | null; createdAtUtc: string; updatedAtUtc: string | null }`
  - `PackageListItem { id; name; price; validityDays; totalSessions; imageUrl: string | null; status; saleStartDate: string | null; saleEndDate: string | null }`
  - `PackageItem { spaServiceId; serviceName; serviceImageUrl: string | null; serviceStatus: CatalogStatus; sessionCount; sortOrder; minDaysBetweenSessions; note: string | null }`
  - `PackageDetail extends PackageListItem { description: string | null; createdAtUtc; updatedAtUtc: string | null; items: readonly PackageItem[] }`
  - `CatalogSuggestion { type: CatalogItemType; id; name; imageUrl: string | null }`
  - `PackageSearchParams extends PaginationParams { minPrice?: number; maxPrice?: number }`, `ServiceSearchParams extends PackageSearchParams { category?: string }`
- Produces (api-client):
  - `class CatalogApi(client: ApiClient)`: `searchServices(params: ServiceSearchParams, signal?)`, `getService(id: string, signal?)`, `listServiceCategories(signal?)`, `searchPackages(params: PackageSearchParams, signal?)`, `getPackage(id, signal?)`, `getSuggestions(search: string, signal?)` — mỗi hàm trả `Promise<ApiResponse<…>>` (`PagedResponse<ServiceListItem>`, `ServiceDetail`, `readonly string[]`, `PagedResponse<PackageListItem>`, `PackageDetail`, `readonly CatalogSuggestion[]`).
  - `catalogQueryKeys` đúng như spec (`all`, `services(params)`, `service(id)`, `categories`, `packages(params)`, `package(id)`, `suggestions(search)`).
  - `catalogErrorCodes = { serviceNotFound: 'service_not_found', packageNotFound: 'package_not_found', validationError: 'validation_error' } as const`.

- [ ] **Step 1: Viết test `catalog.test.ts` (CAT-UI-T01)** theo kiểu `auth.test.ts` (`fetch` giả, `new CatalogApi(new ApiClient('https://api.example', { fetch }))`):
  - `it.each` cho 6 hàm: method `GET` và URL. Ví dụ `searchServices({ pageNumber: 2, pageSize: 12, search: 'da', category: 'Chăm sóc da & body', minPrice: 100000, sortBy: 'price', sortDirection: 'desc' })` → URL `https://api.example/api/v1/services?pageNumber=2&pageSize=12&search=da&category=Ch%C4%83m%20s%C3%B3c%20da%20%26%20body&minPrice=100000&sortBy=price&sortDirection=desc`; `searchPackages({ pageNumber: 1, pageSize: 12, maxPrice: undefined })` → `/api/v1/packages?pageNumber=1&pageSize=12` (tham số rỗng bị bỏ); `getSuggestions('ch')` → `/api/v1/catalog/suggestions?search=ch`; `getService('abc')` → `/api/v1/services/abc`; `listServiceCategories()` → `/api/v1/service-categories`; `getPackage('p1')` → `/api/v1/packages/p1`.
  - `getService` với response 404 envelope `errors: [{ code: 'service_not_found' }]` → reject `ApiClientError`, `status 404`, `errorCodeOf(e) === catalogErrorCodes.serviceNotFound`.
  - `catalogQueryKeys.services({ pageNumber: 1 })` bằng `['catalog', 'services', 'list', { pageNumber: 1 }]`.
- [ ] **Step 2:** `npm run test --workspace @spa/api-client` → FAIL (module chưa có).
- [ ] **Step 3:** Viết `shared-types/src/catalog.ts` và `api-client/src/catalog.ts` theo Interfaces. `id` dùng `encodeURIComponent` khi ghép path; query truyền object params thẳng vào `RequestOptions.query`.
- [ ] **Step 4:** `npm run test --workspace @spa/api-client` và `npm run typecheck` → PASS.
- [ ] **Step 5: Commit (người dùng chạy):** `git add packages && git commit -m "feat(api-client): add catalog api and types"`

### Task 2: Lớp gọi API và định dạng

**Files:**

- Create: `apps/web/src/lib/api/catalog.ts`, `apps/web/src/lib/api/catalog.test.ts`
- Create: `apps/web/src/lib/errors/ApiConfigurationError.ts` (xóa `.gitkeep` trong `lib/errors`)
- Create: `apps/web/src/features/services/catalogErrors.ts`, `catalogErrors.test.ts`
- Modify: `apps/web/src/lib/formatting/formatters.ts`, `formatters.test.ts`

**Interfaces:**

- Consumes: `CatalogApi` (Task 1), `getApiClient()` từ `@/lib/api/session`.
- Produces:
  - `class ApiConfigurationError extends Error` (name `'ApiConfigurationError'`).
  - `callCatalog<T>(call: (api: CatalogApi) => Promise<ApiResponse<T>>): Promise<T>` — thiếu cấu hình → ném `ApiConfigurationError(error)`; `data` null/undefined → `Error('Empty API response.')`.
  - `type CatalogErrorKind = 'not_found' | 'invalid_filter' | 'configuration' | 'network' | 'server'`; `catalogErrorKind(error: unknown): CatalogErrorKind`; `isNotFound(error: unknown): boolean`.
  - `formatDuration(minutes: number): string`.

- [ ] **Step 1: Test.**
  - `formatters.test.ts` (CAT-UI-T15): `formatDuration(45) === '45 phút'`, `(60) === '1 giờ'`, `(90) === '1 giờ 30 phút'`, `(120) === '2 giờ'`.
  - `catalogErrors.test.ts`: `ApiClientError(…, 404, [{code:'service_not_found'}])` → `'not_found'`; `ApiClientError(…, 404, [])` → `'not_found'`; `400 validation_error` → `'invalid_filter'`; `status 0` → `'network'`; `500` → `'server'`; `new ApiConfigurationError('x')` → `'configuration'`; `new Error('x')` → `'server'`.
  - `lib/api/catalog.test.ts`: không có `VITE_API_BASE_URL` (`vi.stubEnv('VITE_API_BASE_URL', '')`) → `callCatalog(...)` reject instance `ApiConfigurationError`, `fetch` không được gọi.
- [ ] **Step 2:** `npm run test --workspace @spa/web -- src/lib src/features/services/catalogErrors.test.ts` → FAIL.
- [ ] **Step 3:** Cài đặt theo Interfaces (mẫu `features/auth/hooks/callAuth.ts`).
- [ ] **Step 4:** Chạy lại lệnh Step 2 → PASS.
- [ ] **Step 5: Commit (người dùng chạy):** `git commit -m "feat(web): add catalog api helper and duration formatter"`

### Task 3: Thành phần dùng chung không chứa nghiệp vụ

**Files (đều trong `apps/web/src/components/shared/`, mỗi thư mục một component + test):**

- Create: `ImageWithFallback/ImageWithFallback.tsx` (+ `.test.tsx`)
- Create: `InfoTile/InfoTile.tsx`
- Create: `PriceRangeFilter/PriceRangeFilter.tsx` (+ `.test.tsx`)
- Create: `SimplePager/SimplePager.tsx` (+ `.test.tsx`)
- Create: `DecorativeShapes/DecorativeShapes.tsx`

**Interfaces:**

- `ImageWithFallback({ src: string | null, alt: string, fallbackIcon: LucideIcon, className?: string })` — `null` hoặc `onError` → khối `bg-accent text-accent-foreground` có icon (`role="img"`, `aria-label={alt}`); ảnh thật `loading="lazy"`, `object-cover`.
- `InfoTile({ icon: LucideIcon, label: string, value: ReactNode, tone?: 'accent' | 'secondary' | 'warning' })` — bong bóng icon tròn (`bg-accent` / `bg-secondary` / `bg-status-warning`), nhãn nhỏ `text-muted-foreground`, giá trị lớn.
- `PriceRangeFilter({ min: number | undefined, max: number | undefined, onApply: (range: { min?: number; max?: number }) => void, idPrefix: string })` — hai `Input` `inputMode="numeric"` trong `FormField` nhãn "Từ"/"Đến" (hậu tố "đ"); áp dụng khi blur hoặc Enter; giữ state cục bộ khi đổi; số nguyên ≥ 0, ô rỗng = `undefined`; min > max → lỗi dưới ô "Đến": "Giá đến phải lớn hơn hoặc bằng giá từ", không gọi `onApply`; chữ/số âm → lỗi "Nhập số tiền hợp lệ".
- `SimplePager({ pageNumber: number, totalPages: number, onPageChange: (page: number) => void })` — `nav aria-label="Phân trang"`, chữ "Trang {n}/{total}", hai nút icon `aria-label` "Trang trước"/"Trang sau", disable ở đầu/cuối; `totalPages <= 1` thì không render.
- `DecorativeShapes({ variant: 'hero' | 'image', className? })` — các khối tròn/vòm phẳng `aria-hidden`, màu `bg-accent`, `bg-secondary`, `bg-chart-5/50` (cùng tinh thần `HomePage`), `hidden md:block`.

- [ ] **Step 1: Test.**
  - `ImageWithFallback`: `src=null` → `getByRole('img', { name: 'Gội đầu' })` không phải thẻ `<img>`; **`falls back when the image fails to load`**: `fireEvent.error(img)` → hiện khối dự phòng.
  - `PriceRangeFilter`: gõ "500000" ô Từ, "100000" ô Đến, blur → thấy "Giá đến phải lớn hơn hoặc bằng giá từ", `onApply` không được gọi; sửa Đến "800000" + Enter → `onApply({ min: 500000, max: 800000 })`; "-1" → "Nhập số tiền hợp lệ".
  - `SimplePager`: `pageNumber=1,totalPages=3` → "Trang 1/3", "Trang trước" disabled, bấm "Trang sau" → `onPageChange(2)`; `totalPages=1` → không render `nav`.
- [ ] **Step 2:** `npm run test --workspace @spa/web -- src/components/shared` → FAIL.
- [ ] **Step 3:** Cài đặt theo Interfaces.
- [ ] **Step 4:** Chạy lại → PASS.
- [ ] **Step 5: Commit (người dùng chạy):** `git commit -m "feat(web): add shared image, info tile, price range and pager"`

### Task 4: Hooks và tham số danh sách của `services`

**Files:**

- Create: `apps/web/src/features/services/hooks/useServiceSearch.ts`, `useService.ts`, `useServiceCategories.ts`, `useCatalogSuggestions.ts`, `useDebouncedValue.ts`, `useCatalogListParams.ts` (+ `useCatalogListParams.test.tsx`)
- Create: `apps/web/src/features/services/catalogStatus.ts`
- Modify: `apps/web/src/features/services/README.md` → xóa; Create `apps/web/src/features/services/index.ts`

**Interfaces:**

- Consumes: Task 1, 2.
- Produces:
  - `useServiceSearch(params: ServiceSearchParams)` → `UseQueryResult<PagedResponse<ServiceListItem>>` (`placeholderData: keepPreviousData`).
  - `useService(id: string)`, `useServiceCategories()`, `useCatalogSuggestions(search: string)` (`enabled: search.trim().length >= 2`).
  - `noRetryOnNotFound = (failureCount: number, error: unknown) => !isNotFound(error) && failureCount < 1` — dùng làm `retry` cho chi tiết (export để Task 9 dùng).
  - `useDebouncedValue<T>(value: T, delayMs: number): T`.
  - `catalogStatusBadge: Record<CatalogStatus, { label: string; tone: StatusTone }>` (`on_sale` → "Đang bán"/success, `discontinued` → "Ngừng bán"/neutral).
  - `type CatalogSortOption = 'name_asc' | 'price_asc' | 'price_desc'`; `catalogSortLabels` ("Tên A–Z", "Giá tăng dần", "Giá giảm dần").
  - `useCatalogListParams()` → `{ pageNumber, search, category?: string, minPrice?: number, maxPrice?: number, sort: CatalogSortOption, hasFilters, query: ServiceSearchParams, setSearch, setCategory(value: string | null), setPriceRange({min?, max?}), setSort(option), setPage, resetFilters }` — bọc `useTableSearchParams` (12/trang, mặc định name asc); `minPrice`/`maxPrice` trên URL không phải số nguyên ≥ 0 thì coi như không có.

- [ ] **Step 1: Test `useCatalogListParams.test.tsx`** (render hook trong `MemoryRouter`):
  - URL `?minPrice=abc&maxPrice=-5&category=Massage` → `minPrice`/`maxPrice` `undefined`, `query.category === 'Massage'`, `query.pageSize === 12`, `query.sortBy === 'name'`.
  - Ở `?page=3`, `setCategory('Chăm sóc da')` → URL không còn `page`, có `category`.
  - `setSort('price_desc')` → `query.sortBy === 'price'`, `sortDirection === 'desc'`.
- [ ] **Step 2:** `npm run test --workspace @spa/web -- src/features/services/hooks` → FAIL.
- [ ] **Step 3:** Cài đặt các hook theo Interfaces; hook query gọi `callCatalog`.
- [ ] **Step 4:** Chạy lại → PASS; `npm run typecheck` PASS.
- [ ] **Step 5: Commit (người dùng chạy):** `git commit -m "feat(web): add catalog hooks and list params"`

### Task 5: `CatalogSearchBox` (combobox gợi ý)

**Files:**

- Create: `apps/web/src/features/services/components/CatalogSearchBox.tsx`, `CatalogSearchBox.test.tsx`

**Interfaces:**

- Consumes: `useCatalogSuggestions`, `useDebouncedValue` (Task 4), `ImageWithFallback` (Task 3).
- Produces: `CatalogSearchBox({ defaultValue: string, onSearch: (term: string) => void, placeholder: string, label: string })` — `label` là `aria-label` của ô (ví dụ "Tìm dịch vụ").

- [ ] **Step 1: Test (CAT-UI-T08)** dùng `mockApi` + bọc `AppProviders` + `MemoryRouter` (fake timers cho debounce):
  - gõ "c", chờ 300 ms → không có call tới `/api/v1/catalog/suggestions`.
  - **`only fetches the settled term`**: gõ "ch" rồi ngay "cha", chờ 300 ms → đúng 1 call, `search=cha`.
  - response `[{type:'service',id:'s1',name:'Chăm sóc da',imageUrl:null},{type:'package',id:'p1',name:'Gói chăm sóc',imageUrl:null}]` → `role="listbox"` có option chứa nhãn "Dịch vụ" và "Gói", dòng cuối `Tìm “cha”`.
  - `ArrowDown` + `Enter` → router ở `/services/s1`; chọn option gói → `/packages/p1`.
  - Enter khi chưa chọn → `onSearch('cha')`.
  - `Escape` → listbox biến mất, ô vẫn "cha"; `Escape` lần hai → ô rỗng.
  - Ô có `role="combobox"`, `aria-expanded` đổi theo trạng thái; nút "Xóa từ khóa" xuất hiện khi có chữ.
  - Lỗi 500 → dòng "Không tải được gợi ý" và vẫn có dòng "Tìm …".
- [ ] **Step 2:** Chạy test file → FAIL.
- [ ] **Step 3:** Cài đặt bằng `Input` + `Popover` (anchor là ô nhập, `onOpenAutoFocus` chặn để focus ở lại ô), `aria-activedescendant` theo index; "Đang tìm…" khi đang tải.
- [ ] **Step 4:** Chạy lại → PASS.
- [ ] **Step 5: Commit (người dùng chạy):** `git commit -m "feat(web): add catalog search box with suggestions"`

### Task 6: Khối giao diện danh sách dùng chung

**Files (trong `apps/web/src/features/services/components/`):**

- Create: `CatalogCard.tsx` (+ `.test.tsx`), `CatalogHero.tsx`, `CatalogGrid.tsx` (+ `.test.tsx`), `ServiceCategoryChips.tsx` (+ `.test.tsx`), `CatalogSortSelect.tsx`

**Interfaces:**

- Consumes: Task 3, 4.
- Produces:
  - `CatalogCard({ to: string, name: string, imageUrl: string | null, fallbackIcon: LucideIcon, tag?: string, status: CatalogStatus, meta: ReactNode, price: number, footnote?: string })` — `<article>` chứa `Link` toàn thẻ (tên truy cập = `name`); tag + badge "Ngừng bán" (`StatusBadge` từ `catalogStatusBadge`) nằm trên ảnh; hàng `meta` trái, giá phải.
  - `CatalogHero({ eyebrow: string, title: string, emphasis: string, children: ReactNode })` — tiêu đề "{title} _{emphasis}_", `children` là ô tìm kiếm, `DecorativeShapes variant="hero"` bên phải.
  - `CatalogGrid<T>({ query: UseQueryResult<PagedResponse<T>>, getKey: (item: T) => string, renderItem: (item: T) => ReactNode, resultLabel: (count: number) => string, emptyTitle: string, emptyFilteredTitle: string, hasFilters: boolean, onResetFilters: () => void, onPageChange: (page: number) => void, toolbar?: ReactNode })` — gồm dòng số kết quả (`aria-live="polite"`, `h2` nhận focus khi đổi trang), lưới `ul` 1/2/3 cột, 6 thẻ `Skeleton` khi tải lần đầu, `aria-busy` + mờ khi `isPlaceholderData`, `SimplePager`; lỗi theo `catalogErrorKind`: `invalid_filter` → `ErrorState title="Bộ lọc không hợp lệ"` với nút "Xóa bộ lọc"; `configuration` → `ErrorState title="Lỗi cấu hình"` không nút; `network`/`server` → câu cố định trong spec + "Thử lại" (`refetch`). Rỗng: có bộ lọc → `EmptyState` `emptyFilteredTitle`, mô tả "Thử từ khóa khác hoặc bỏ bớt bộ lọc.", nút "Xóa bộ lọc"; không bộ lọc → `emptyTitle`, không CTA. `items` rỗng mà `totalCount > 0` → gọi `onPageChange(totalPages)`.
  - `ServiceCategoryChips({ value?: string, onChange: (value: string | null) => void })` — dùng `useServiceCategories`; nhóm `role="group" aria-label="Loại dịch vụ"`, chip `aria-pressed`, cuộn ngang (`overflow-x-auto`); lỗi → "Không tải được loại dịch vụ" + nút "Thử lại" nhỏ; đang tải → 4 `Skeleton` pill.
  - `CatalogSortSelect({ value: CatalogSortOption, onChange })` — `Select` nhãn "Sắp xếp".

- [ ] **Step 1: Test.**
  - `CatalogCard`: **`shows Ngừng bán for a discontinued item`** (`status='discontinued'` → text "Ngừng bán"); `getByRole('link', { name: /Gội đầu dưỡng sinh/ })` có `href` đúng; giá `formatCurrency(650000)`.
  - `CatalogGrid` với query giả: loading → 6 skeleton (`data-testid="catalog-card-skeleton"`); lỗi `ApiClientError(…,400,[{code:'validation_error'}])` → "Bộ lọc không hợp lệ" và bấm "Xóa bộ lọc" gọi `onResetFilters`; lỗi status 0 → "Không kết nối được máy chủ. Vui lòng kiểm tra mạng và thử lại." + "Thử lại"; rỗng có bộ lọc / không bộ lọc → đúng tiêu đề; `items: [], totalCount: 30, totalPages: 3` → `onPageChange(3)`.
  - `ServiceCategoryChips` (mockApi `GET /api/v1/service-categories` → `['Chăm sóc da','Massage']`): chip "Tất cả" `aria-pressed=true` khi `value` undefined; bấm "Massage" → `onChange('Massage')`; bấm "Tất cả" → `onChange(null)`.
- [ ] **Step 2:** Chạy test thư mục components → FAIL.
- [ ] **Step 3:** Cài đặt theo Interfaces; ảnh thẻ `aspect-[4/3]` bo góc, `motion-safe:group-hover:scale-105`.
- [ ] **Step 4:** Chạy lại → PASS.
- [ ] **Step 5: Commit (người dùng chạy):** `git commit -m "feat(web): add catalog card, grid and category chips"`

### Task 7: SCR-W02 Tìm kiếm dịch vụ + router

**Files:**

- Create: `apps/web/src/features/services/components/ServiceSearch.tsx`
- Create: `apps/web/src/pages/public/ServicesPage.tsx`, `apps/web/src/pages/public/ServicesPage.test.tsx`
- Modify: `apps/web/src/app/router.tsx` (map `/services` → `<ServicesPage />`; Task 8–10 thêm 3 trang còn lại vào cùng map `publicPages: Record<string, ReactElement>` thay cho điều kiện `path === '/'`)
- Modify: `apps/web/src/features/services/index.ts`

**Interfaces:**

- Consumes: Task 4–6.
- Produces: `ServiceSearch()` (feature component cả màn), `ServicesPage()` chỉ render `ServiceSearch`.

- [ ] **Step 1: Test `ServicesPage.test.tsx`** dùng `mockApi` + `renderApp`:
  - CAT-UI-T02: đang tải → skeleton; 500 rồi "Thử lại" → gọi lại `GET /api/v1/services`; `items: []` không bộ lọc → "Chưa có dịch vụ nào"; dữ liệu → thẻ có tên, loại, "1 giờ 30 phút", giá vi-VN.
  - CAT-UI-T03: `renderApp('/services?search=da&category=Ch%C4%83m%20s%C3%B3c%20da&minPrice=100000&sortBy=price&sortDirection=desc&page=2')` → URL request chứa `search=da`, `category=Ch%C4%83m%20s%C3%B3c%20da`, `minPrice=100000`, `sortBy=price`, `sortDirection=desc`, `pageNumber=2`, `pageSize=12`.
  - CAT-UI-T04: ở `?page=3`, bấm chip "Massage" → `router.state.location.search` không có `page`, có `category=Massage`; đổi sắp xếp "Giá giảm dần" → request mới `sortBy=price&sortDirection=desc`.
  - CAT-UI-T05: khoảng giá Từ 500000 / Đến 100000 → lỗi, số request `/services` không tăng.
  - CAT-UI-T06: có `search`, 0 kết quả → "Không tìm thấy dịch vụ phù hợp"; bấm "Xóa bộ lọc" → `location.search === ''`.
  - CAT-UI-T07: server `400 validation_error` → "Bộ lọc không hợp lệ".
  - **`keeps an accented category with & selected after reload`**: categories `['Chăm sóc da & body']`, mở `/services?category=Ch%C4%83m%20s%C3%B3c%20da%20%26%20body` → chip đó `aria-pressed=true`, request mang đúng giá trị.
  - **`jumps to the last page when page is past the end`**: `?page=9`, response `{items: [], totalCount: 13, totalPages: 2, pageNumber: 9}` → URL thành `page=2`.
  - CAT-UI-T14 (phần W02): không có nút "Thêm vào giỏ"/"Đặt ngay".
- [ ] **Step 2:** `npm run test --workspace @spa/web -- src/pages/public/ServicesPage.test.tsx` → FAIL.
- [ ] **Step 3:** Ghép `ServiceSearch` theo spec SCR-W02: `CatalogHero` (eyebrow "DỊCH VỤ", "Dịch vụ" + "chăm sóc", `CatalogSearchBox` placeholder "Tìm dịch vụ…", label "Tìm dịch vụ"), `ServiceCategoryChips`, từ `lg` cột trái `Card` "Khoảng giá" + `PriceRangeFilter` + link "Xóa bộ lọc" (khi `hasFilters`); dưới `lg` nút `Popover` "Khoảng giá" trên toolbar; toolbar có `CatalogSortSelect`; `CatalogGrid` với `resultLabel = (n) => \`${n} dịch vụ\``, `emptyTitle="Chưa có dịch vụ nào"`, `emptyFilteredTitle="Không tìm thấy dịch vụ phù hợp"`; thẻ `tag=category`, `meta`=`ClockIcon`+`formatDuration`, `fallbackIcon=SparklesIcon`. Đổi trang → `window.scrollTo({ top: 0 })`(bọc kiểm tra tồn tại cho jsdom).`document.title = 'Dịch vụ · Như Nguyệt Spa'`.
- [ ] **Step 4:** Chạy lại → PASS; `npm run test --workspace @spa/web -- src/app` (routes test còn pass).
- [ ] **Step 5: Commit (người dùng chạy):** `git commit -m "feat(web): service search page (UC-SPA-06)"`

### Task 8: SCR-W03 Chi tiết dịch vụ

**Files:**

- Create: `apps/web/src/features/services/components/ServiceDetailView.tsx`, `CatalogDetailStates.tsx`
- Create: `apps/web/src/pages/public/ServiceDetailPage.tsx`, `ServiceDetailPage.test.tsx`
- Modify: `apps/web/src/app/router.tsx`, `features/services/index.ts`

**Interfaces:**

- Consumes: `useService`, `noRetryOnNotFound` (Task 4), `InfoTile`, `ImageWithFallback`, `DecorativeShapes` (Task 3), `catalogErrorKind` (Task 2).
- Produces:
  - `CatalogDetailStates({ query: UseQueryResult<unknown>, notFoundTitle: string, notFoundDescription: string, backTo: string, backLabel: string, children: ReactNode })` — loading → skeleton bố cục chi tiết; `not_found` → `EmptyState` + nút `Link` về danh sách, không retry; lỗi khác như `CatalogGrid` (không có nhánh `invalid_filter`); có dữ liệu → `children`. Task 10 dùng lại.
  - `ServiceDetailView({ serviceId: string })`.

- [ ] **Step 1: Test (CAT-UI-T09, T10)**:
  - dữ liệu `{ name:'Cấp ẩm phục hồi', category:'Chăm sóc da', durationMinutes: 90, price: 650000, description:'Dòng 1\nDòng 2', status:'on_sale', imageUrl:null, … }` → `h1` "Cấp ẩm phục hồi"; link "Chăm sóc da" `href="/services?category=Ch%C4%83m%20s%C3%B3c%20da"`; "Thời lượng" "1 giờ 30 phút"; "Giá" `formatCurrency(650000)`; breadcrumb có link "Dịch vụ"; `document.title === 'Cấp ẩm phục hồi · Như Nguyệt Spa'`.
  - `description: null` → "Chưa có mô tả cho dịch vụ này."; `status: 'discontinued'` → "Ngừng bán".
  - `404 service_not_found` và `404` không có `errors` → "Không tìm thấy dịch vụ", "Dịch vụ không tồn tại hoặc đã ngừng bán.", link "Xem tất cả dịch vụ" → `/services`; đúng 1 request (không retry).
  - lỗi mạng → `ErrorState` có "Thử lại".
  - CAT-UI-T14: không có "Thêm vào giỏ"/"Đặt ngay".
- [ ] **Step 2:** Chạy test → FAIL.
- [ ] **Step 3:** Ghép theo spec SCR-W03 (2 cột từ `lg`, `DecorativeShapes variant="image"` sau ảnh, 2 `InfoTile`: `ClockIcon` tone accent, `WalletIcon` tone secondary; `Card` "Mô tả" `whitespace-pre-line`).
- [ ] **Step 4:** Chạy lại → PASS.
- [ ] **Step 5: Commit (người dùng chạy):** `git commit -m "feat(web): service detail page (UC-SPA-07)"`

### Task 9: SCR-W04 Tìm kiếm gói

**Files:**

- Delete: `apps/web/src/features/service-packages/README.md`; Create: `apps/web/src/features/service-packages/index.ts`
- Create: `apps/web/src/features/service-packages/hooks/usePackageSearch.ts`, `usePackage.ts`
- Create: `apps/web/src/features/service-packages/components/PackageSearch.tsx`
- Create: `apps/web/src/pages/public/PackagesPage.tsx`, `PackagesPage.test.tsx`
- Modify: `apps/web/src/app/router.tsx`

**Interfaces:**

- Consumes: `CatalogSearchBox`, `CatalogHero`, `CatalogGrid`, `CatalogCard`, `CatalogSortSelect`, `useCatalogListParams`, `noRetryOnNotFound` từ `@/features/services` (export qua `index.ts`); `PriceRangeFilter`.
- Produces: `usePackageSearch(params: PackageSearchParams)`, `usePackage(id: string)` (retry `noRetryOnNotFound`); `PackageSearch()`; `PackagesPage()`.

- [ ] **Step 1: Test (CAT-UI-T11)**: đủ 4 trạng thái như T02 với tiêu đề "Chưa có gói nào" / "Không tìm thấy gói phù hợp"; `renderApp('/packages?category=Massage&maxPrice=5000000')` → request `/api/v1/packages` có `maxPrice=5000000` và **không** có `category`; thẻ có "5 buổi" trên ảnh, "Dùng trong 180 ngày", giá; `saleEndDate: '2026-12-31'` → "Mở bán đến 31/12/2026"; không có nút mua.
- [ ] **Step 2:** Chạy test → FAIL.
- [ ] **Step 3:** Ghép theo spec SCR-W04: `CatalogHero` eyebrow "GÓI DỊCH VỤ", "Gói" + "liệu trình", placeholder "Tìm gói theo tên…"; toolbar: từ `lg` `PriceRangeFilter` hiện thẳng, dưới `lg` trong `Popover` "Khoảng giá"; `CatalogSortSelect`; "Xóa bộ lọc"; lưới không cột lọc; `fallbackIcon=PackageIcon`; `query` gửi lên bỏ `category`. `document.title = 'Gói dịch vụ · Như Nguyệt Spa'`.
- [ ] **Step 4:** Chạy lại → PASS.
- [ ] **Step 5: Commit (người dùng chạy):** `git commit -m "feat(web): package search page (UC-SPA-06)"`

### Task 10: SCR-W05 Chi tiết gói

**Files:**

- Create: `apps/web/src/features/service-packages/components/PackageDetailView.tsx`, `PackageTimeline.tsx`
- Create: `apps/web/src/pages/public/PackageDetailPage.tsx`, `PackageDetailPage.test.tsx`
- Modify: `apps/web/src/app/router.tsx`

**Interfaces:**

- Consumes: `usePackage` (Task 9), `CatalogDetailStates` (Task 8), `InfoTile`, `ImageWithFallback`, `DecorativeShapes`, `formatLocalDate`.
- Produces: `PackageTimeline({ items: readonly PackageItem[] })`, `PackageDetailView({ packageId: string })`.

- [ ] **Step 1: Test (CAT-UI-T12, T13)** với gói `totalSessions: 5, validityDays: 180, saleStartDate: null, saleEndDate: '2026-12-31'`, 3 dòng:
  1. `{serviceName:'Làm sạch sâu', serviceStatus:'on_sale', sessionCount:2, minDaysBetweenSessions:0, note:null}`
  2. `{serviceName:'Điện di', serviceStatus:'discontinued', sessionCount:2, minDaysBetweenSessions:7}`
  3. `{serviceName:'Đắp mặt nạ', serviceStatus:'on_sale', sessionCount:1, minDaysBetweenSessions:14, note:'Nên đến sớm 10 phút'}`
  - `getAllByRole('listitem')` trong `ol` theo đúng thứ tự backend; dòng 1 có link "Làm sạch sâu" → `/services/{id}` và **không** có "Cách buổi trước"; dòng 2 không có link, có "Ngừng bán", có "Cách buổi trước tối thiểu 7 ngày"; dòng 3 có "Nên đến sớm 10 phút".
  - 3 `InfoTile`: "Tổng số buổi" 5, "Thời hạn sử dụng" "180 ngày", "Số dịch vụ" 3; "Đến 31/12/2026"; với cả hai ngày → "01/11/2026 – 31/12/2026"; không ngày nào → không có mục "Thời gian mở bán".
  - `description: null` → "Chưa có mô tả cho gói này."
  - `404 package_not_found` → "Không tìm thấy gói dịch vụ", "Gói không tồn tại, đã ngừng bán hoặc ngoài thời gian mở bán.", link về `/packages`.
  - CAT-UI-T14: không có "Thêm vào giỏ"/"Mua ngay".
- [ ] **Step 2:** Chạy test → FAIL.
- [ ] **Step 3:** Ghép theo spec SCR-W05; timeline: `ol` có đường dọc `bg-primary/30`, vòng số `bg-primary text-primary-foreground`, ảnh 48px, pill "{n} buổi" `bg-secondary`, `HourglassIcon`. `InfoTile` tone accent/secondary/warning với `LayersIcon`/`CalendarIcon`/`SparklesIcon`.
- [ ] **Step 4:** Chạy lại → PASS; thêm CAT-UI-T16 vào `apps/web/src/test/app.test.tsx`: 4 route không còn render "Tính năng đang được phát triển" (mock trả dữ liệu tối thiểu).
- [ ] **Step 5: Commit (người dùng chạy):** `git commit -m "feat(web): package detail page (UC-SPA-07)"`

### Task 11: Tài liệu và kiểm tra cuối

**Files:**

- Modify: `docs/frontend.md` (mục mới "Danh mục dịch vụ và gói (UC-SPA-06/07)": feature, hooks, query keys, `components/shared` mới; route giữ nguyên danh sách), `docs/progress.md` (cột web của UC-SPA-06, 07: ✅ kèm ghi chú "chưa có nút mua, ★"), `docs/specs/catalog.md` (bỏ câu "Thêm `packages/shared-types`, `api-client` **không** làm lần này" ở mục API, thay bằng "đã có từ task web 07/11/2026")
- `apps/web/src/app/routes.ts`: không đổi path.

- [ ] **Step 1:** `npm run format` rồi `npm run lint`, `npm run typecheck`, `npm run test`, `npm run format:check`, `npm run web:build` → tất cả PASS (lint 0 warning).
- [ ] **Step 2:** Kiểm tra tay: `npm run db:up`, `npm run db:seed:demo`, `npm run dev`; mở 4 trang ở 320px / 768px / 1280px: không cuộn ngang, hàng chip cuộn trong vùng của nó, bàn phím đi qua ô tìm kiếm → chip → khoảng giá → thẻ, focus nhìn thấy; tắt API → `ErrorState`; đăng nhập chủ spa → thấy mục "Ngừng bán".
- [ ] **Step 3:** Cập nhật docs như phần Files.
- [ ] **Step 4: Commit (người dùng chạy):** `git commit -m "docs: catalog web screens (UC-SPA-06/07)"`

# Web foundation

React + Vite + TypeScript strict, UI bằng Tailwind CSS v4 + shadcn/ui ([ADR-0005](decisions/ADR-0005-web-ui-tailwind-shadcn.md)). `app/` chứa router/providers/query client; `components/ui` chứa primitive shadcn; `components/shared` chứa thành phần dùng chung (DataTable, PageHeader, StatusBadge, FormField, EmptyState, ErrorState, PageLoader, ThemeToggle, SystemStatus); `components/layout` chứa các layout; `features` giữ chỗ cho nghiệp vụ; `pages` chứa trang chủ và placeholder; `stores` chỉ giữ UI/session abstraction; `lib/api` và `hooks` nối shared client với Query.

## Routes

### public

- `/` — Trang chủ
- `/services` — Dịch vụ
- `/services/:serviceId` — Chi tiết dịch vụ
- `/packages` — Gói dịch vụ
- `/packages/:packageId` — Chi tiết gói dịch vụ
- `/login` — Đăng nhập
- `/register` — Đăng ký
- `/forgot-password` — Quên mật khẩu

### customer

- `/account` — Tài khoản
- `/my-bookings` — Lịch hẹn của tôi
- `/my-bookings/:bookingId` — Chi tiết lịch hẹn
- `/my-treatment-plans` — Liệu trình
- `/my-packages` — Gói của tôi
- `/my-reviews` — Đánh giá
- `/ai-assistant` — Trợ lý AI

### staff

- `/staff` — Tổng quan nhân viên
- `/staff/schedule` — Lịch làm việc
- `/staff/bookings` — Lịch hẹn được phân công
- `/staff/bookings/:bookingId` — Chi tiết buổi chăm sóc

### owner

- `/owner` — Tổng quan quản lý
- `/owner/services` — Quản lý dịch vụ
- `/owner/packages` — Quản lý gói dịch vụ
- `/owner/staff` — Nhân viên
- `/owner/bookings` — Lịch hẹn
- `/owner/promotions` — Khuyến mãi
- `/owner/treatments` — Liệu trình
- `/owner/payments` — Thanh toán
- `/owner/reports` — Báo cáo

- `/forbidden` — Không có quyền truy cập.
- `*` — Không tìm thấy trang.

## State, aliases và accessibility

TanStack Query quản lý server state. Zustand giữ phiên đăng nhập (`stores/authStore.ts`, chỉ trong bộ nhớ) và phạm vi theme (`stores/themeScopeStore.ts`); trạng thái mở/thu gọn sidebar do `SidebarProvider` của shadcn giữ. React Hook Form + Zod dùng cho form đăng nhập, đăng ký, quên mật khẩu (`features/auth`). API gọi qua `@spa/api-client`: `SystemApi` (ping, healthLive) và `AuthApi`. SystemStatus hiển thị Loading, API Online, API Offline, Configuration Error; staleTime 60 giây và tối đa một retry, không polling.

Aliases `@/*`, `@app/*`, `@components/*`, `@features/*`, `@lib/*` được khai báo trong TypeScript và Vite. Vitest dùng cùng Vite config; `src/test/setup.ts` polyfill `matchMedia`, `ResizeObserver` và pointer capture cho Radix.

## Giao diện

- **Token:** `src/styles/theme.css` (`:root` và `.dark`) gồm nhóm shadcn, `status-*`, `chart-*`, `sidebar-*`; `src/styles/index.css` import Tailwind và ánh xạ token bằng `@theme inline`. Tông pastel/kem, primary hồng mận `#92596b`, khớp mobile.
- **Font** đóng gói bằng `@fontsource-variable` (DM Sans, Lora cho tiêu đề, JetBrains Mono), không tải từ ngoài.
- **Theme:** trang công khai và khu vực khách hàng luôn sáng (`PublicLayout`/`CustomerLayout` khai báo phạm vi `light-only`, `ThemeProvider` nhận `forcedTheme="light"`). Chỉ khu vực nhân viên và chủ spa có `ThemeToggle` trên thanh trên cùng; `next-themes` gắn class `.dark` (sáng, tối, theo hệ thống).
- **Bảng:** `DataTable` (TanStack Table 8) có skeleton khi tải, lỗi kèm nút thử lại, rỗng, sắp xếp theo server (`aria-sort`), click dòng (chuột và Enter), menu thao tác từng dòng, phân trang khớp `PagedResponse`. `useTableSearchParams` giữ `page`, `pageSize`, `sortBy`, `sortDirection`, `search` và bộ lọc trên URL.
- `AppProviders` gắn `ThemeProvider`, `QueryClientProvider`, `TooltipProvider` và `Toaster` (sonner).
- Build tách chunk `react` và `vendor` (`vite.config.ts`).

PublicLayout có header (menu di động bằng `Sheet`) và footer; `/login`, `/register`, `/forgot-password` dùng `AuthLayout` chia đôi (panel giới thiệu bên trái từ `lg`, form bên phải, link "Về trang chủ"), không có header/footer; Customer/Staff/Owner dùng `Sidebar` của shadcn (thu gọn thành icon trên desktop, thành drawer trên mobile), menu sinh từ `config/navigation.ts`. Header công khai có menu tài khoản (`features/auth/components/AccountMenu`), footer sidebar hiện người đăng nhập và nút đăng xuất. Store không phải bằng chứng phân quyền: backend kiểm tra mọi quyền.

Semantic header/nav/main/footer, skip link, focus visible, label/input error association qua `FormField`, `Button` có `loading`, dialog/sheet của Radix (focus trap, Esc) và responsive từ 320px. Có EmptyState, ErrorState, PageLoader. Chuẩn bị `locales/vi`, chưa cài i18n.

## Phiên đăng nhập (UC-SPA-01..03)

- **Lưu phiên:** refresh token nằm trong cookie HttpOnly `spa_refresh_token` do backend đặt (BE-1, `docs/specs/auth.md`). Access token và người dùng chỉ ở trong bộ nhớ (`authStore`, `status` = `restoring`/`authenticated`/`anonymous`). Không ghi token vào `localStorage`/`sessionStorage`.
- **Client:** `lib/api/client.ts` tạo `ApiClient` với `credentials: 'include'`, header `X-Auth-Transport: cookie`, Bearer từ store. Request có Bearer nhận 401 (trừ `/api/v1/auth/*`) thì gọi refresh một lần rồi gửi lại. `lib/api/session.ts` giữ client dùng chung, `refreshSession()` (một request dù nhiều nơi gọi) và `restoreSession()` (chạy khi khởi động, 401 thì thử lại một lần sau 300 ms).
- **Route:** `RouteGuard` bọc Customer/Staff/Owner: đang khôi phục → `PageLoader`; chưa đăng nhập → `/login?redirect=…` (sau khi tự đăng xuất thì về `/`); sai vai trò → `/forbidden`. `GuestOnly` bọc `/login`, `/register`, `/forgot-password`: đã đăng nhập thì chuyển tới `redirect` an toàn (`safeRedirect`) hoặc trang chủ theo vai trò (`/account`, `/staff`, `/owner`).
- **Kết thúc phiên:** `SessionBootstrap` xóa cache TanStack Query mỗi khi phiên kết thúc và toast khi phiên hết hạn.

## Danh mục dịch vụ và gói (UC-SPA-06/07)

- **Trang:** `/services` (lưới thẻ, chip loại dịch vụ, khoảng giá, sắp xếp), `/services/:serviceId`, `/packages` (lưới thẻ, khoảng giá, sắp xếp), `/packages/:packageId` (timeline trình tự buổi). Trang ở `pages/public/` chỉ ghép feature. Spec: `docs/specs/catalog.md`, mục "Giao diện (web)".
- **Feature:** `features/services` (hooks `useServiceSearch`, `useService`, `useServiceCategories`, `useCatalogSuggestions`, `useCatalogListParams`; component `CatalogSearchBox` (combobox gợi ý), `CatalogPageHeader`, `ServiceFilterPanel`, `ServiceCard`, `CatalogCard`, `CatalogGrid`, `CatalogDetailStates`, `ActiveFilterChips`, `CatalogTrustStrip`) và `features/service-packages` (`usePackageSearch`, `usePackage`, `PackageSearch`, `PackageDetailView`, `PackageTimeline`) dùng lại các khối của `services` qua `index.ts`.
- **API:** `CatalogApi` + `catalogQueryKeys` (`@spa/api-client`) → `lib/api/catalog.ts` (`callCatalog`, ném `ApiConfigurationError` khi thiếu `VITE_API_BASE_URL`). `catalogRetry`: lỗi 4xx và lỗi cấu hình không retry. Chủ spa đang đăng nhập gửi Bearer nên thấy cả mục "Ngừng bán".
- **Bộ lọc trên URL:** `search`, `categoryId` (GUID; giá trị khác hoặc link cũ `?category=` bị bỏ qua), `minPrice`, `maxPrice`, `sortBy`/`sortDirection`, `page` (12 thẻ/trang) qua `useTableSearchParams`; `setFilters` đổi nhiều khóa trong một lần. `/packages` không gửi `categoryId`. Ô chọn danh mục hiện `serviceCount` từ `GET /service-categories`.
- **Shared mới:** `ImageWithFallback`, `InfoTile` (`row`/`stacked`), `PriceRangeFilter`, `SimplePager`, `NumberedPager`, `DecorativeShapes`; hook `hooks/useDocumentTitle`.
- Mô tả ngắn trên thẻ và đầu trang chi tiết lấy từ `shortDescription`, "Quy trình chăm sóc" từ `steps` (ẩn khi rỗng) (Q-71).
- Trang chi tiết dịch vụ ghép thêm (dữ liệu thật): "Giờ trống gần nhất" hôm nay/ngày mai (`features/bookings`, `AvailabilityApi`), "Kỹ thuật viên thực hiện" (`features/staff`, `StaffApi.listPublic`), "Gói liệu trình có dịch vụ này" với % tiết kiệm (`GET /packages?serviceId`, `retailPrice`). `ServiceDetailView` nhận `aside`/`sections` để `pages/public/ServiceDetailPage` ghép các feature đó mà `services` không import ngược. Trang chi tiết gói có so sánh giá lẻ, giá/buổi, thời gian hoàn thành sớm nhất (`coursePlan.ts`), "Cách sử dụng gói". Hai trang có "Câu hỏi thường gặp" lấy số từ `features/services/catalogPolicies.ts` (giữ đồng bộ với appsettings). Lời gọi API của feature mới đi qua `lib/api/call.ts` (`callApi`).
- Bố cục theo mẫu Stitch (ID trong spec). **Nội dung tạm** gom ở `features/services/catalogPlaceholders.ts`: ★ giả, bộ lọc thời lượng/tình trạng da ("Sắp có"), dải cam kết, "Bạn sẽ nhận được", đặc quyền gói; nút "Đặt lịch" trên thẻ tạm dẫn sang chi tiết; nút đặt lịch/mua/hỏi AI ở trang chi tiết là `ComingSoonButton` (toast "đang được phát triển"). "Dịch vụ cùng loại" và "Gói liệu trình khác" dùng dữ liệu thật. Xóa khi có UC-SPA-29, mô tả trong API danh sách, UC-SPA-15 web.
- Chưa có: "Thêm vào giỏ"/"Mua ngay" (UC-SPA-10/11).

## Chạy và kiểm tra

```powershell
npm run web
npm run web:test
npm run web:build
```

Vitest tests mock network (`src/test/mockApi.tsx` giả `fetch` theo "METHOD /path"); kiểm tra các routes, App/home/404, guard, phiên, theme, ba màn auth, bốn màn danh mục, button và system status. Không cần backend thật. Build không có API URL vẫn chạy và giao diện báo Configuration Error; Dockerfile yêu cầu build arg API URL.

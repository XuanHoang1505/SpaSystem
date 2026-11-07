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

## Chạy và kiểm tra

```powershell
npm run web
npm run web:test
npm run web:build
```

Vitest tests mock network (`src/test/mockApi.tsx` giả `fetch` theo "METHOD /path"); kiểm tra các routes, App/home/404, guard, phiên, theme, ba màn auth, button và system status. Không cần backend thật. Build không có API URL vẫn chạy và giao diện báo Configuration Error; Dockerfile yêu cầu build arg API URL.

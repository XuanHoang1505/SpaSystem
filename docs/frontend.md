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

TanStack Query quản lý server state; Zustand chỉ giữ session abstraction, không persist token (trạng thái mở/thu gọn sidebar do `SidebarProvider` của shadcn giữ). React Hook Form + Zod dùng cho form preview email, không gửi request. API gọi qua `@spa/api-client`, chỉ ping và healthLive. SystemStatus hiển thị Loading, API Online, API Offline, Configuration Error; staleTime 60 giây và tối đa một retry, không polling.

Aliases `@/*`, `@app/*`, `@components/*`, `@features/*`, `@lib/*` được khai báo trong TypeScript và Vite. Vitest dùng cùng Vite config; `src/test/setup.ts` polyfill `matchMedia`, `ResizeObserver` và pointer capture cho Radix.

## Giao diện

- **Token:** `src/styles/theme.css` (`:root` và `.dark`) gồm nhóm shadcn, `status-*`, `chart-*`, `sidebar-*`; `src/styles/index.css` import Tailwind và ánh xạ token bằng `@theme inline`. Tông pastel/kem, primary hồng mận `#92596b`, khớp mobile.
- **Font** đóng gói bằng `@fontsource-variable` (DM Sans, Lora cho tiêu đề, JetBrains Mono), không tải từ ngoài.
- **Dark mode:** `next-themes` gắn class `.dark` (sáng, tối, theo hệ thống), đổi bằng `ThemeToggle` trên header.
- **Bảng:** `DataTable` (TanStack Table 8) có skeleton khi tải, lỗi kèm nút thử lại, rỗng, sắp xếp theo server (`aria-sort`), click dòng (chuột và Enter), menu thao tác từng dòng, phân trang khớp `PagedResponse`. `useTableSearchParams` giữ `page`, `pageSize`, `sortBy`, `sortDirection`, `search` và bộ lọc trên URL.
- `AppProviders` gắn `ThemeProvider`, `QueryClientProvider`, `TooltipProvider` và `Toaster` (sonner).
- Build tách chunk `react` và `vendor` (`vite.config.ts`).

PublicLayout có header (menu di động bằng `Sheet`) và footer; Customer/Staff/Owner dùng `Sidebar` của shadcn (thu gọn thành icon trên desktop, thành drawer trên mobile), menu sinh từ `config/navigation.ts`. Preview vai trò chưa guard; RouteGuard từ chối session null và dành cho phase auth thật. Không sử dụng store như bằng chứng phân quyền phía backend.

Semantic header/nav/main/footer, skip link, focus visible, label/input error association qua `FormField`, `Button` có `loading`, dialog/sheet của Radix (focus trap, Esc) và responsive từ 320px. Có EmptyState, ErrorState, PageLoader. Chuẩn bị `locales/vi`, chưa cài i18n.

## Chạy và kiểm tra

```powershell
npm run web
npm run web:test
npm run web:build
```

Vitest tests mock network; kiểm tra các routes, App/home/404, guard, button và system status. Không cần backend thật. Build không có API URL vẫn chạy và giao diện báo Configuration Error; Dockerfile yêu cầu build arg API URL.

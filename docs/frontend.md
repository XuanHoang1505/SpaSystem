# Web foundation

React + Vite + TypeScript strict. `app/` chứa router/providers/query client; `components/common` chứa UI foundation; `components/layout` chứa bốn layout; `features` giữ chỗ cho nghiệp vụ; `pages` chứa trang chủ và placeholder; `stores` chỉ giữ UI/session abstraction; `lib/api` và `hooks` nối shared client với Query.

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

TanStack Query quản lý server state; Zustand quản lý sidebar/session abstraction, không persist token. React Hook Form + Zod dùng cho form preview email, không gửi request. API gọi qua `@spa/api-client`, chỉ ping và healthLive. SystemStatus hiển thị Loading, API Online, API Offline, Configuration Error; staleTime 60 giây và tối đa một retry, không polling.

Aliases `@/*`, `@app/*`, `@components/*`, `@features/*`, `@lib/*` được khai báo trong TypeScript và Vite. Vitest dùng cùng Vite config. Common button dùng CSS Modules; styles nền/layout dùng global CSS và CSS variables. UI pastel/kem, không phụ thuộc ảnh hoặc font tải từ bên ngoài.

PublicLayout có header/footer/mobile navigation; Customer/Staff/Owner có responsive sidebar. Preview vai trò chưa guard; RouteGuard từ chối session null và dành cho phase auth thật. Không sử dụng store như bằng chứng phân quyền phía backend.

Semantic header/nav/main/footer, skip link, focus visible, label/input error association, button disabled/loading, native dialog focus/escape và responsive ở desktop/tablet/mobile. Có EmptyState, ErrorState, PageLoader, AppSpinner. Chuẩn bị `locales/vi`, chưa cài i18n.

## Chạy và kiểm tra

```powershell
npm run web
npm run web:test
npm run web:build
```

Vitest tests mock network; kiểm tra các routes, App/home/404, guard, button và system status. Không cần backend thật. Build không có API URL vẫn chạy và giao diện báo Configuration Error; Dockerfile yêu cầu build arg API URL.

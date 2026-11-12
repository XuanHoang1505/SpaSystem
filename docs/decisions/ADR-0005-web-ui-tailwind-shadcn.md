# ADR-0005: Giao diện web dùng Tailwind CSS v4 + shadcn/ui với một bộ design token

- **Trạng thái:** Chấp nhận
- **Ngày:** 04/11/2026

## Bối cảnh

Báo cáo đồ án ghi Tailwind CSS, còn foundation web dùng CSS Modules và vài biến CSS (Q-09, RS-02). Web sắp có nhiều màn quản trị dày dữ liệu (dịch vụ, nhân viên, lịch hẹn, đơn hàng, báo cáo), mỗi màn cần bảng phân trang, bộ lọc, modal, drawer, badge trạng thái và dark mode. Viết tay bằng CSS Modules sẽ lặp lại nhiều và mỗi màn một kiểu.

Hai lựa chọn đã cân nhắc:

1. Giữ CSS Modules và tự viết bộ component: không thêm thư viện, nhưng tốn công và khó đạt chuẩn truy cập cho dialog, menu, select.
2. Tailwind v4 + shadcn/ui (Radix): component có sẵn, mã nằm trong repo nên sửa được, Radix lo phần bàn phím và ARIA. Cách tổ chức token học theo dự án FIN-Solution (`theme.css` + `@theme inline`), nhưng màu giữ thương hiệu spa.

## Quyết định

Chọn phương án 2, chỉ áp dụng cho `apps/web`. Mobile vẫn dùng `StyleSheet` + `src/theme` và các component `App*`.

- **Token:** `apps/web/src/styles/theme.css` là nơi duy nhất định nghĩa màu (`:root` và `.dark`). `src/styles/index.css` import Tailwind, `tw-animate-css` và font, rồi ánh xạ token vào Tailwind bằng `@theme inline`. Màu thương hiệu (primary `#92596b`, nền kem `#faf7f2`…) khớp `apps/mobile/src/theme/colors.ts`.
- **Nhóm token:** shadcn (`background`, `primary`, `muted`, `accent`, `destructive`, `border`, `ring`…), trạng thái `status-{success,warning,info,danger,neutral}` (+ `-foreground`), `chart-1..5`, `sidebar-*`.
- **Font** đóng gói qua `@fontsource-variable`, không tải từ ngoài: DM Sans (`font-sans`), Lora (`font-heading`, cho `h1–h3`), JetBrains Mono (`font-mono`).
- **Dark mode:** class `.dark` trên `<html>` do `next-themes` quản lý (`light` | `dark` | `system`, key `spa-theme`).
- **Component:**
  - `src/components/ui/`: primitive shadcn (style `new-york`, gói gộp `radix-ui`, icon `lucide-react`), thêm bằng `npx shadcn@4.23.0 add <tên>` từ `apps/web`.
  - `src/components/shared/`: component dùng chung không biết nghiệp vụ: `DataTable`, `PageHeader`, `StatusBadge`, `FormField`, `EmptyState`, `ErrorState`, `PageLoader`, `ThemeToggle`, `SystemStatus`.
  - `src/components/layout/`: các layout, dùng `Sidebar` của shadcn cho khu vực customer, staff và owner.
- **Bảng:** mọi bảng dữ liệu dùng `DataTable` (`@tanstack/react-table` 8). Phân trang, sắp xếp và lọc chạy ở server, trạng thái được giữ trên URL qua `useTableSearchParams`.
- **Thông báo:** dùng `sonner` (`toast`), đã gắn sẵn `Toaster` trong `AppProviders`.
- Bỏ CSS Modules, `styles/variables.css`, `styles/globals.css` và các component `components/common/App*` của web.

## Hệ quả

- Màn mới ghép từ `ui/` và `shared/`, không viết CSS riêng. Màu chỉ đổi ở `theme.css`.
- Không viết màu cứng (`text-[#…]`, `bg-white`, `text-white`). Cần màu mới thì thêm token vào `theme.css` và `index.css`, đồng thời cập nhật mobile nếu đó là màu thương hiệu.
- `prettier-plugin-tailwindcss` tự sắp xếp class khi chạy `npm run format`.
- shadcn CLI 4.23 sinh sai import `cn` (thành `"cn"`) và cài kèm một gói tên `cn`. Sau mỗi lần `add`, phải sửa import thành `@/lib/utils`, gỡ gói `cn` và xóa biến `--sidebar-*` mà CLI chèn vào `index.css`.
- Test chạy trên jsdom cần polyfill `matchMedia`, `ResizeObserver` và pointer capture (đã có trong `src/test/setup.ts`).
- Bundle lớn hơn trước: Vite tách chunk `react` và `vendor`. Khi có nhiều màn nghiệp vụ, tách tiếp bằng lazy route.

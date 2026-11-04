# Quy ước frontend (web, mobile, package dùng chung)

Mô tả hiện trạng foundation ở [../frontend.md](../frontend.md) và [../mobile.md](../mobile.md). Tài liệu này quy định cách viết code mới. Vị trí file theo [project-structure.md](project-structure.md).

## TypeScript chung

- `strict` bật; không dùng `any`, `@ts-ignore`, `as unknown as`. Dữ liệu ngoài (API, form, storage) được kiểm tra bằng Zod hoặc kiểu từ `@spa/shared-types`.
- Prettier: nháy đơn, dấu phẩy cuối, 100 ký tự/dòng. ESLint `--max-warnings 0`, có `react-hooks/exhaustive-deps`.
- Import qua alias (`@/`, `@components/`, `@features/`, `@lib/`, mobile thêm `@theme/`), không dùng `../../..` vượt quá thư mục tính năng.
- Component là function component, export có tên (`export function AppointmentCard`), không `export default` (trừ file route Expo Router và file Vite bắt buộc).
- Văn bản hiển thị tiếng Việt có dấu; đặt trong component cho đến khi cài i18n, sau đó chuyển vào `locales/vi`.

## Dữ liệu và state

| Loại state                     | Công cụ                   | Ví dụ                                  |
| ------------------------------ | ------------------------- | -------------------------------------- |
| Dữ liệu từ server              | TanStack Query            | Danh sách lịch hẹn, giờ trống          |
| State giao diện dùng nhiều nơi | Zustand (`stores/`)       | Sidebar mở/đóng, bộ lọc nhớ giữa trang |
| State một component            | `useState` / `useReducer` | Bước hiện tại của form đặt lịch        |
| Form                           | React Hook Form + Zod     | Form đặt lịch, form đăng ký            |

- Không lưu dữ liệu server vào Zustand. Không lưu token vào `localStorage`: web giữ access token trong bộ nhớ, refresh token ở cookie HttpOnly; mobile dùng `expo-secure-store`.
- Gọi API theo luồng: `packages/api-client` (`BookingsApi`, `bookingQueryKeys`) → `lib/api/` tạo instance với base URL → hook trong `features/<feature>/hooks` → component. Component không gọi `fetch` trực tiếp.
- Query key lấy từ `api-client`, giữ chính sách mặc định `staleTime` 60 giây, tối đa 1 lần retry; mutation xong thì `invalidateQueries` đúng key bị ảnh hưởng.
- Lỗi API xử lý theo `ApiClientError.errors[].code` (ví dụ `slot_unavailable` → tải lại giờ trống), không so sánh chuỗi `message`.
- Mỗi màn hình dữ liệu có đủ 4 trạng thái: đang tải (`PageLoader`/`AppLoader`), lỗi (`ErrorState`), rỗng (`EmptyState`), có dữ liệu.

## Web

- Trang ở `pages/<area>/` chỉ ghép layout và component tính năng; logic ở `features/`.
- **UI: Tailwind CSS v4 + shadcn/ui** ([ADR-0005](../decisions/ADR-0005-web-ui-tailwind-shadcn.md)). Màn hình chỉ ghép từ `components/ui` (primitive shadcn) và `components/shared`. Trước khi viết component mới, kiểm tra hai thư mục này. Thành phần không chứa nghiệp vụ mà hai feature cùng dùng thì đưa vào `shared/`, không copy.
- **Màu chỉ định nghĩa ở `styles/theme.css`** (`:root` và `.dark`), ánh xạ sang Tailwind trong `styles/index.css`. Component dùng class token (`bg-primary`, `text-muted-foreground`, `bg-status-warning`…). Không dùng mã màu cứng (`text-[#…]`), `bg-white`, CSS Modules, hay `style` inline cho màu và khoảng cách. Phải chạy được ở cả chế độ sáng lẫn tối.

| Nhu cầu                         | Dùng                                                                                      |
| ------------------------------- | ----------------------------------------------------------------------------------------- |
| Đầu trang (tiêu đề, mô tả, nút) | `PageHeader`                                                                              |
| Bảng dữ liệu                    | `DataTable` + `useTableSearchParams` (`@/components/shared/DataTable`)                    |
| Nhãn trạng thái                 | `StatusBadge` (`tone`: success, warning, info, danger, neutral)                           |
| Trường form                     | `FormField` bọc `Input`/`Textarea`/`SelectTrigger`                                        |
| Rỗng / lỗi / đang tải trang     | `EmptyState` / `ErrorState` / `PageLoader`; trong bảng: trạng thái có sẵn của `DataTable` |
| Chi tiết, form ngắn, xác nhận   | `Sheet` (chi tiết), `Dialog` (tạo/sửa ngắn), `AlertDialog` (hủy, xóa)                     |
| Thông báo sau thao tác          | `toast` của `sonner`                                                                      |
| Tiền, ngày giờ                  | `lib/formatting/formatters.ts`                                                            |

- **Bảng dữ liệu bắt buộc dùng `DataTable`**: không tự viết `<table>`, không gọi shadcn `Table` trực tiếp cho dữ liệu. Phân trang, sắp xếp, lọc chạy ở server và được giữ trên URL bằng `useTableSearchParams` (đổi bộ lọc thì về trang 1). `getRowId` lấy id từ dữ liệu. Thao tác cho từng dòng dùng `rowActions`. Xem chi tiết bằng `onRowClick` mở `Sheet`/`Dialog`; không mở route mới chỉ để chứa một form ngắn.
- Enum trạng thái của mỗi feature được map một lần thành `{ label, tone }` rồi đưa vào `StatusBadge`.
- Nút gửi mutation dùng `<Button loading={mutation.isPending}>`; validate bằng Zod và hiện lỗi qua `FormField`.
- Thêm primitive bằng `npx shadcn@4.23.0 add <tên>` (chạy trong `apps/web`), rồi sửa các lỗi CLI hay gặp đã ghi trong ADR-0005. Chỉ dùng gói gộp `radix-ui` và icon `lucide-react`.
- Khả năng truy cập: dùng thẻ ngữ nghĩa, `label` gắn với input (qua `FormField`), focus nhìn thấy được, nút chỉ có icon phải có `aria-label`. Giao diện chạy được từ 320px và không cuộn ngang cả trang.
- Route mới khai báo trong `app/routes.ts` và cập nhật [../frontend.md](../frontend.md).

## Mobile

- File trong `app/` chỉ là route: lấy tham số, render screen từ `src/features/<feature>/screens`.
- Mọi màn hình bọc trong `AppScreen` (SafeArea, bàn phím); dùng component `App*` và token ở `theme/`, không dùng component DOM.
- Vùng chạm tối thiểu 48dp, có `accessibilityLabel` cho nút chỉ có icon.
- Thanh toán mở cổng bằng `expo-web-browser` và quay về app qua deep link; không eject, không tạo thư mục native.
- Không thêm thư viện native ngoài danh sách tương thích Expo Go SDK 57; kiểm tra bằng `npx expo install --check`.

## Package dùng chung

- `shared-types`: chỉ thêm kiểu khi backend có DTO chính thức; tên trường khớp JSON backend.
- `api-client`: thuần TypeScript, không import React; mỗi tính năng một file `src/<feature>.ts` xuất lớp `<Feature>Api`, `<feature>QueryKeys`, re-export qua `src/index.ts`; có test với `fetch` giả.
- Package xuất mã nguồn TypeScript, không có bước build.

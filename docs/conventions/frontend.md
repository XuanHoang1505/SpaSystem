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
- Style bằng CSS Modules + biến trong `styles/variables.css` (màu kem, hồng nhạt). Không viết màu/khoảng cách cứng trong component. Nếu chuyển sang Tailwind (câu hỏi Q-09) phải có ADR.
- Khả năng truy cập: dùng thẻ ngữ nghĩa, `label` gắn với input, focus nhìn thấy được, modal dùng `AppModal` (dialog gốc). Giao diện chạy được từ 320px.
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

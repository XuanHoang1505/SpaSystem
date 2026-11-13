# Mobile foundation

Expo SDK 57 managed workflow, React Native 0.86.3, React 19.2.3, Expo Router 57. Ưu tiên Android; giữ iOS compatibility. Không eject, không tạo APK/AAB production.

## Cấu trúc

`app/` chứa route files; `_layout` chỉ cấu hình navigation/providers. `src/screens` chứa HomeScreen và workspace overview, `features` chứa mã theo nghiệp vụ khi triển khai, `components/common` chứa native UI, `theme` chứa tokens, `providers` chứa Query/SafeArea, `stores` chứa UI/session abstraction. Không dùng component React DOM.

## Routes

| Nhóm                 | Route files                                                                                              | Nội dung                                                                                                |
| -------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Root                 | `index.tsx`, `forbidden.tsx`, `+not-found.tsx`                                                           | Trang chủ, "Không có quyền truy cập" (sai vai trò), màn hình không tồn tại                              |
| Public Stack         | `(public)/services/index.tsx`, `services/[serviceId].tsx`                                                | Tìm kiếm dịch vụ (SCR-M02), chi tiết dịch vụ (SCR-M03), `features/services`                             |
| Public Stack         | `(public)/packages/index.tsx`, `packages/[packageId].tsx`                                                | Tìm kiếm gói (SCR-M04), chi tiết gói (SCR-M05), `features/packages`                                     |
| Public Stack         | `(public)/login.tsx`, `register.tsx`, `forgot-password.tsx`                                              | Đăng nhập (SCR-M06), đăng ký + OTP (SCR-M07), quên mật khẩu 3 bước (SCR-M08), `features/auth/screens`   |
| Customer Tabs        | `(customer)/home.tsx`, `bookings/index.tsx`, `treatments/index.tsx`, `packages/index.tsx`, `profile.tsx` | Trang chủ, lịch hẹn, liệu trình, gói của tôi, cá nhân                                                   |
| Customer bổ sung     | `(customer)/bookings/[bookingId].tsx`, `ai-assistant.tsx`, `reviews.tsx`                                 | Chi tiết lịch hẹn, AI, đánh giá                                                                         |
| Root Stack Đơn hàng  | `cart.tsx`, `checkout.tsx`, `payment/result.tsx`                                                         | Giỏ hàng (SCR-M19a), xác nhận & thanh toán (SCR-M19b), kết quả thanh toán (SCR-M19c), `features/orders` |
| Root Stack Tài khoản | `account.tsx`, `password.tsx`                                                                            | Thông tin cá nhân và đổi mật khẩu (UC-SPA-04), cùng lớp với giỏ hàng, `features/users`                  |
| Staff Stack          | `(staff)/dashboard.tsx`, `schedule.tsx`, `bookings/index.tsx`, `bookings/[bookingId].tsx`                | Tổng quan, lịch làm việc, lịch hẹn, buổi chăm sóc                                                       |
| Owner Stack          | `(owner)/dashboard.tsx`, `services.tsx`, `staff.tsx`, `bookings.tsx`, `reports.tsx`                      | Tổng quan, dịch vụ, nhân viên, lịch hẹn, báo cáo                                                        |

Group trong dấu ngoặc không xuất hiện trong URL; nội bộ luôn dùng path đầy đủ có group khi hai group có cùng path (ví dụ packages). Không tạo record/dữ liệu giả để liên kết tới chi tiết ID; route chi tiết được giữ sẵn cho phase có dữ liệu thật. Trang chủ có nút chuyển các không gian; staff/owner dashboard và profile có links navigation.

Customer có năm tab chính. Các màn hình AI/review có `href: null` để không xuất hiện như tab mới. Chi tiết lịch hẹn nằm trong nested Stack dưới tab bookings. Ba tab hồ sơ (`(customer)/profile`, `(staff)/profile`, `(owner)/profile`) hiện cụm thông tin và menu lối tắt. Bấm cụm thông tin mở `app/account.tsx` trên stack gốc (cùng layout với giỏ hàng và thanh toán); đổi mật khẩu ở `app/password.tsx`. Khách chưa đăng nhập giữ màn chào và không gọi `GET /me`. `(customer)`, `(staff)`, `(owner)` bọc `RouteGuard`.

## UI, state và environment

AppScreen kết hợp SafeAreaView, KeyboardAvoidingView và ScrollView; hỗ trợ padding iOS/height Android và keyboardShouldPersistTaps. AppText, AppButton, AppInput, AppCard, AppLoader, EmptyState, ErrorState, SystemStatus dùng StyleSheet và theme. Buttons/inputs có touch target ít nhất 48; labels và accessibility states được khai báo. Màu primary/semantic, spacing và radius tương ứng web.

TanStack Query giữ server data; Zustand chỉ giữ client state. **Phiên đăng nhập (UC-SPA-01/02/03):** mobile chạy chế độ body (không gửi `X-Auth-Transport`), refresh token lưu trong `expo-secure-store` (khóa `spa.refresh_token`, `src/lib/auth/tokenStorage.ts`), access token và `user` chỉ trong `stores/authStore.ts` (`status` restoring/authenticated/anonymous). `src/lib/api/session.ts` có `getApiClient`, `restoreSession` (gọi một lần trong `providers/SessionBootstrap.tsx`), `refreshSession` (các request 401 dùng chung một lần làm mới rồi gửi lại, `src/lib/api/client.ts`), `signIn`, `signOut`. `(customer)`, `(staff)`, `(owner)` bọc `RouteGuard`: chưa đăng nhập → `/(public)/login?redirect=`, sai vai trò → `/forbidden`. Sau đăng nhập về `homePathFor(role)` hoặc `redirect` hợp lệ (`safeRedirect`). Nút "Đăng xuất" ở tab Cá nhân và Tổng quan nhân viên/chủ spa. Phản hồi ngắn sau một thao tác (đã lưu, lỗi server) dùng toast: gọi `toast.success/error/info` từ `stores/toastStore.ts`, `components/common/AppToast.tsx` (`AppToastHost`, gắn một lần trong `AppProviders`) hiện ở đầu màn dưới thanh trạng thái, chạm để đóng, tự ẩn sau 3 giây (lỗi 5 giây), mỗi lúc một toast. Trạng thái cố định của màn (lỗi tải kèm "Thử lại", cảnh báo) vẫn dùng `AppNotice`; hỏi xác nhận dùng `Alert.alert`. React Hook Form + Zod theo cùng quy tắc với web (`features/auth/schemas.ts`). SystemStatus gọi shared client qua hook, tối đa một retry, staleTime 60 giây, không polling.

`EXPO_PUBLIC_API_BASE_URL` được truy cập bằng dot notation để Expo inline biến môi trường. `.env.example` dùng `http://10.0.2.2:5000` cho Android emulator; thiết bị thật dùng IP LAN của host và backend listen 0.0.0.0. Không dùng secret trong biến EXPO_PUBLIC. Thiếu URL báo Configuration Error, không fallback. Expo/Metro connection và API connection là hai cấu hình độc lập.

Aliases `@/*`, `@components/*`, `@features/*`, `@lib/*`, `@theme/*` được TypeScript khai báo; Metro mặc định Expo resolve alias/workspace; Jest moduleNameMapper tương ứng. Shared API client thuần TypeScript không dùng DOM component hoặc native SDK.

## Icon

`lucide-react-native` + `react-native-svg` (có trong Expo Go SDK 57), cùng bộ Lucide với web; nhập từng icon, màu từ token `colors`. Không dùng `@expo/vector-icons`.

## Kiểm tra

```powershell
npm run mobile:check
npm run typecheck --workspace @spa/mobile
npm run test --workspace @spa/mobile
npm run mobile:export
```

Jest dùng jest-expo và Testing Library Native; mock fetch và safe-area metrics. Bundle Android export kiểm tra Metro resolve workspace source và aliases rồi kết thúc. Không cần development server chạy vô hạn. Emulator smoke test cần Android emulator/Expo Go tương thích; bundle export không chứng minh mọi thao tác trên thiết bị vật lý. `src/test/setup.ts` mock `expo-router` (`router.push`/`replace`), `expo-image-picker`, `expo-image-manipulator` (trả một JPEG 512 px cố định), `expo-file-system` (`File` giả có `uri`, `name`, `type`) và `@react-native-community/datetimepicker` (`date-picker` chọn 03/04/1992, `date-picker-cancel` giả nút Hủy của Android); `src/test/mockApi.ts` giả `fetch` theo "METHOD /path". Jest trỏ `lucide-react-native` sang bản CommonJS (Jest không biên dịch `.mjs`; Metro vẫn dùng bản ESM).

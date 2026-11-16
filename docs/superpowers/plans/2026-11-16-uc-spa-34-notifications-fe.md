# Kế hoạch triển khai: UC-SPA-34 — Giao diện Thông báo & Realtime (Web & Mobile)

> **Mã Use Case:** UC-SPA-34 (Xem thông báo & Realtime SignalR)  
> **Nền tảng:** Web React (`apps/web`) & Mobile Expo (`apps/mobile`)  
> **Tài liệu đặc tả:** [docs/specs/notifications.md](file:///e:/UTE/HK126/Code/SpaSystem/docs/specs/notifications.md#L136-L289)  
> **Màn hình phụ trách:**
> - `NotificationBell`: Nút chuông thông báo trên Header Web (`Header.tsx`, `WorkspaceLayout.tsx`) và Mobile Top Bar (`home.tsx`, `dashboard.tsx`, `profile.tsx`).
> - `SCR-W23`: Trang Thông báo Web (`/notifications`) cho Khách hàng (`AccountLayout`), Nhân viên & Chủ spa (`WorkspaceLayout`).
> - `SCR-M22`: Màn hình Thông báo Mobile (`app/(customer)/notifications.tsx` & `app/(staff)/notifications.tsx`).

---

## 1. Global Constraints & Nguyên tắc kỹ thuật

1. **Tuân thủ quy ước thiết kế Web:**
   - Chỉ sử dụng các components từ `@/components/ui/` (shadcn) và `@/components/shared/` (`PageHeader`, `StatusBadge`, `EmptyState`, `ErrorState`, `PageLoader`, `PaginationControls`).
   - Định kiểu hoàn toàn bằng Tailwind CSS với các token ngữ nghĩa trong `theme.css`. Không dùng màu cứng (hardcoded hex `#...`).
   - Mẫu danh sách thông báo: Sử dụng Danh sách thẻ chuyên dụng (`NotificationFeed`) phân trang, có 2 Tab (*Tất cả* / *Chưa đọc*) và dropdown lọc theo Loại (`type`).
2. **Tuân thủ quy ước thiết kế Mobile:**
   - Dùng `AppScreen` bọc màn hình và các components `App*` cùng hệ thống màu trong `@theme/index`.
   - Vùng chạm tối thiểu 48dp, icon-only buttons có `accessibilityLabel`.
   - Sử dụng `FlatList` kéo xuống để làm mới (`RefreshControl`) và kéo chạm đáy để tải thêm (`onEndReached`).
3. **Quản lý dữ liệu và Realtime:**
   - Dùng TanStack Query cho server state (`notificationQueryKeys`), không lưu server state vào Zustand.
   - Thư viện `@microsoft/signalr` kết nối WebSocket tới `/hubs/notifications?access_token={token}`.
   - Cơ chế 1 chiều Server $\rightarrow$ Client: Lắng nghe `notificationCreated` (hiện Toast thông báo nổi + invalidate cache) và `unreadCountChanged` (cập nhật số badge ngay lập tức trên mọi tab/thiết bị).
   - Tương tác đọc/đánh dấu: Thực hiện qua REST API (`POST /me/notifications/{id}/read`, `POST /me/notifications/read-all`).
   - Xử lý lỗi theo `ApiClientError.errors[].code` (`notification_not_found`, `unauthorized`), không so sánh chuỗi message.
4. **Cam kết kiểm thử (TDD):**
   - **QUY TẮC BẮT BUỘC:** Không commit bất kỳ file test nào vào Git. File test chỉ dùng để kiểm tra tự động trong quá trình phát triển và phải được xóa trước khi commit.

---

## 2. Danh sách nhiệm vụ (Tasks)

### Task 1: Shared Types & API Client (`packages/shared-types`, `packages/api-client`)
- **Files tạo/sửa:**
  - `packages/shared-types/src/notifications.ts` (mới)
  - `packages/shared-types/src/index.ts` (export notifications)
  - `packages/api-client/src/notifications.ts` (mới)
  - `packages/api-client/src/index.ts` (export notifications)
- **Mô tả:**
  - Định nghĩa types trong `shared-types`:
    - `NotificationType`: `'appointment' | 'payment' | 'treatment' | 'promotion' | 'system'`.
    - `NotificationReferenceType`: `'appointment' | 'order' | 'treatment_plan' | 'review' | 'work_schedule'`.
    - `NotificationDto`: `{ id: string; type: NotificationType; title: string; body: string; referenceType?: NotificationReferenceType | null; referenceId?: string | null; isRead: boolean; readAtUtc?: string | null; createdAtUtc: string }`.
    - `UnreadNotificationCountDto`: `{ count: number }`.
    - `NotificationListQuery`: `{ unreadOnly?: boolean; type?: NotificationType }`.
    - `NotificationListParams`: `NotificationListQuery & PaginationParams`.
  - Định nghĩa client trong `api-client`:
    - `MyNotificationsApi`:
      - `list(params?, options?)`: `GET /api/v1/me/notifications`
      - `open(id, options?)`: `GET /api/v1/me/notifications/{id}`
      - `markRead(id, options?)`: `POST /api/v1/me/notifications/{id}/read`
      - `markAllRead(options?)`: `POST /api/v1/me/notifications/read-all`
      - `getUnreadCount(options?)`: `GET /api/v1/me/notifications/unread-count`
    - `notificationQueryKeys`: `all`, `list(params)`, `unreadCount()`.
    - `notificationErrorCodes`: `notFound: 'notification_not_found'`.
- **Kiểm tra:** `npm run typecheck --workspace @spa/shared-types && npm run typecheck --workspace @spa/api-client`.

---

### Task 2: Cài đặt thư viện `@microsoft/signalr`
- **Mô tả:**
  - Cài đặt `@microsoft/signalr` cho `apps/web` và `apps/mobile`.
  - Cấu hình transport và kết nối hỗ trợ token qua query string `?access_token=`.
- **Lệnh thực hiện:**
  - Chạy ngoài sandbox (BypassSandbox: true) per Rule 6: `pnpm --filter @spa/web add @microsoft/signalr` và `pnpm --filter @spa/mobile add @microsoft/signalr`.

---

### Task 3: Web Foundation & Realtime Hub Hook (`apps/web`)
- **Files tạo:**
  - `apps/web/src/lib/api/notifications.ts`: Instance `myNotificationsApi`.
  - `apps/web/src/features/notifications/types.ts`: Enum labels tiếng Việt, icon mapping, badge variant mapping, helper `getNotificationTargetRoute(item, role)`.
  - `apps/web/src/features/notifications/hooks/useNotifications.ts`: TanStack Query hook lấy danh sách phân trang.
  - `apps/web/src/features/notifications/hooks/useUnreadNotificationCount.ts`: TanStack Query hook lấy số đếm chưa đọc.
  - `apps/web/src/features/notifications/hooks/useNotificationMutations.ts`: Mutations `markRead` và `markAllRead`.
  - `apps/web/src/features/notifications/hooks/useNotificationRealtime.ts`: Hook quản lý vòng đời SignalR connection với `/hubs/notifications`, kích hoạt khi người dùng đăng nhập (`useAuthStore`), lắng nghe `notificationCreated` (Toast popup + invalidate queries) và `unreadCountChanged` (cập nhật cache unreadCount), tự động reconnect.

---

### Task 4: Web Notification Bell Component (Header Popover)
- **Files tạo/sửa:**
  - `apps/web/src/features/notifications/components/NotificationBell.tsx`: Nút chuông icon Bell có badge đếm unread (ẩn khi 0, số thật $\le 99$, `99+` khi $> 99$). Bấm mở `Popover` xem nhanh 5 thông báo mới nhất, nút "Đánh dấu tất cả đã đọc", và link "Xem tất cả thông báo" dẫn tới `/notifications`.
  - Gắn vào `apps/web/src/components/layout/Header/Header.tsx` (Customer Header).
  - Gắn vào `apps/web/src/components/layout/WorkspaceLayout.tsx` (Staff/Owner Workspace Header).

---

### Task 5: Web SCR-W23 Notification Page (`/notifications`)
- **Files tạo/sửa:**
  - `apps/web/src/features/notifications/components/NotificationCard.tsx`: Thẻ thông báo (icon phân loại, tiêu đề in đậm khi chưa đọc, nội dung tiếng Việt, thời gian tương đối + tooltip ngày giờ tuyệt đối, chấm xanh chưa đọc, nút check đánh dấu đọc).
  - `apps/web/src/features/notifications/components/NotificationFilterTabs.tsx`: Tabs "Tất cả" / "Chưa đọc" kết hợp dropdown chọn loại `type`.
  - `apps/web/src/features/notifications/components/NotificationFeed.tsx`: Danh sách thông báo kết hợp loading skeleton, error state, empty state và phân trang `PaginationControls`.
  - `apps/web/src/features/notifications/components/NotificationsView.tsx`: View tổng hợp trang thông báo.
  - `apps/web/src/pages/customer/NotificationsPage.tsx`: Trang thông báo cho khách hàng (trong `AccountLayout`).
  - `apps/web/src/pages/workspace/WorkspaceNotificationsPage.tsx`: Trang thông báo cho nhân viên & chủ spa (trong `WorkspaceLayout`).
  - `apps/web/src/features/notifications/index.ts`: Barrel export.
  - Cập nhật `apps/web/src/app/routes.ts`, `apps/web/src/config/navigation.ts`, `AccountSideNav.tsx`, và router chính `apps/web/src/app/router.tsx`.

---

### Task 6: Mobile Foundation, Realtime & Screens (`apps/mobile`)
- **Files tạo/sửa:**
  - `apps/mobile/src/lib/api/notifications.ts`: Instance `myNotificationsApi`.
  - `apps/mobile/src/features/notifications/types.ts`: Helper điều hướng `getMobileNotificationTargetRoute(item, role)`.
  - `apps/mobile/src/features/notifications/hooks/useNotifications.ts`, `useUnreadNotificationCount.ts`, `useNotificationMutations.ts`.
  - `apps/mobile/src/features/notifications/hooks/useNotificationRealtime.ts`: SignalR connection hook cho React Native.
  - `apps/mobile/src/features/notifications/components/NotificationBellButton.tsx`: Nút chuông góc trên màn hình có badge.
  - `apps/mobile/src/features/notifications/components/NotificationCard.tsx`: Thẻ thông báo chạm được bo góc, icon theo loại, chấm xanh chưa đọc, định dạng thời gian.
  - `apps/mobile/src/features/notifications/screens/NotificationsScreen.tsx`: Màn hình `SCR-M22` với `FlatList`, pull-to-refresh, tải trang tiếp theo, tab Tất cả / Chưa đọc, nút "Đọc tất cả".
  - `apps/mobile/app/(customer)/notifications.tsx` & `apps/mobile/app/(staff)/notifications.tsx`: Route files.
  - Tích hợp `NotificationBellButton` vào header `apps/mobile/app/(customer)/home.tsx` và `apps/mobile/app/(staff)/dashboard.tsx`, cùng mục "Thông báo" trong `profile.tsx`.

---

### Task 7: Verification & Build Check
- Chạy kiểm tra tĩnh và build:
  - `npm run typecheck` (khớp cả 3 workspaces: root, web, mobile).
  - `npm run lint`.
  - `npm run web:build`.
  - `npm run mobile:check`.
- Kiểm tra tính toàn vẹn: Không sót file test nào trong Git working tree.

---

### Task 8: Cập nhật tài liệu
- Cập nhật `docs/frontend.md`: Bổ sung route `/notifications` cho Khách hàng, Nhân viên, Chủ spa.
- Cập nhật `docs/mobile.md`: Bổ sung route `notifications.tsx` cho Khách hàng và Nhân viên.
- Cập nhật `docs/progress.md`: Cập nhật trạng thái `UC-SPA-34` Web ✅, Mobile ✅.

---

## 3. Thứ tự thực thi đề xuất

1. **Giai đoạn 1:** Task 1 (Types & Api-client) + Task 2 (Cài đặt `@microsoft/signalr`).
2. **Giai đoạn 2 (Web):** Task 3 (Hooks & Realtime) + Task 4 (Bell Popover) + Task 5 (Trang `/notifications`).
3. **Giai đoạn 3 (Mobile):** Task 6 (Mobile screens, Bell & Realtime).
4. **Giai đoạn 4:** Task 7 (Build check) + Task 8 (Docs).

# Kế hoạch triển khai: UC-SPA-20 — Xem lịch sử sử dụng dịch vụ (Mobile)

- **Mã use case:** `UC-SPA-20` (Xem lịch sử sử dụng dịch vụ)
- **Nền tảng:** Mobile (`@spa/mobile` — Expo SDK 57 / React Native)
- **Branch:** `feature/uc-spa-20-service-history-mobile`
- **Ngày tạo:** 16/11/2026
- **Trạng thái:** Chờ duyệt (Gate 2)
- **Spec tham chiếu:** `docs/specs/purchases-treatments.md` (mục `Giao diện (mobile): UC-SPA-20 — Xem lịch sử sử dụng dịch vụ`)

---

## 1. Mục tiêu và Phạm vi

Triển khai màn hình **Lịch sử sử dụng dịch vụ (`SCR-M21`)** trên Mobile Expo cho khách hàng:

1. **`SCR-M21` — Màn hình "Lịch sử sử dụng" (`app/(customer)/history.tsx`)**:
   - Thiết kế giao diện tràn viền edge-to-edge bằng `AppScreen scroll={false}`.
   - Thanh header tùy biến: nút Back (`router.back()`), tiêu đề *"Lịch sử sử dụng"*, số lượng bản ghi hoặc nút mở bộ lọc.
   - Thanh chip lọc trạng thái nhanh (Segmented Filter Chips): `Tất cả`, `Hoàn thành` (`completed`), `Không đến` (`no_show`).
   - Danh sách thẻ `ServiceHistoryCard` cuộn mượt bằng `FlatList`, hỗ trợ `RefreshControl` kéo để làm mới (`refetch`).
   - Đủ 4 trạng thái giao diện:
     - Đang tải: Skeleton thẻ hoặc `ActivityIndicator`.
     - Lỗi: `AppNotice` lỗi mạng kèm nút `"Thử lại"`.
     - Rỗng: `AppNotice` rỗng kèm nút CTA `"Đặt lịch ngay"` (khi chưa có dữ liệu) hoặc `"Xóa bộ lọc"` (khi lọc không khớp).
     - Thành công: Danh sách thẻ hiển thị ngày giờ, tên dịch vụ, kỹ thuật viên, nguồn dịch vụ (`Dịch vụ lẻ` hoặc `Gói: {tên gói} · Buổi {n}`), badge trạng thái (`Hoàn thành` / `Không đến`).
   - Khách vãng lai (`anonymous`): Hiển thị thẻ thông báo mời đăng nhập kèm nút chuyển hướng sang `/(public)/login?redirect=/(customer)/history`.

2. **Modal chi tiết lần chăm sóc (`ServiceHistoryDetailModal.tsx`)**:
   - Modal Bottom Sheet mở trực tiếp khi bấm vào thẻ trong danh sách.
   - Gọi API `GET /api/v1/me/service-history/{appointmentId}` để hiển thị đầy đủ chi tiết:
     - Thời lượng buổi chăm sóc (`durationMinutes` phút).
     - Kỹ thuật viên phụ trách (`staff.fullName`).
     - Nguồn dịch vụ: Dịch vụ lẻ hoặc Gói liệu trình kèm link xem phác đồ & nhật ký `/treatment/[treatmentPlanId]` (nếu có `treatmentPlanId`).
     - Kết quả chăm sóc (`result`): Hiển thị ghi chú của kỹ thuật viên đối với buổi `completed`; hoặc cảnh báo màu đỏ *"Khách không đến buổi hẹn"* đối với buổi `no_show`.
     - Thông tin đơn hàng liên quan: Mã đơn `order.code`, phương thức thanh toán, nút bấm mở chi tiết đơn hàng `/my-orders/[orderId]`.
     - Nút hành động: Với buổi `completed`, hiển thị nút `"Đánh giá dịch vụ"` điều hướng sang `/reviews` (UC-SPA-29 / UC-SPA-30).

3. **Tích hợp Điều hướng & Menu cá nhân**:
   - Thêm route `app/(customer)/history.tsx` ẩn trên bottom tabs (`href: null, tabBarStyle: { display: 'none' }, headerShown: false` trong `(customer)/_layout.tsx`).
   - Bổ sung mục *"Lịch sử sử dụng"* vào nhóm *"Dịch vụ của tôi"* trong `CustomerProfileScreen.tsx` (`app/(customer)/profile.tsx`).

---

## 2. Ràng buộc toàn cục (Global Constraints)

1. **QUY TẮC BẮT BUỘC VỀ TEST:**
   - Tuyệt đối **KHÔNG COMMIT** bất kỳ file test nào vào Git theo chỉ thị của người dùng (standing constraint).
2. **Quy ước Code & TypeScript:**
   - Không dùng `any`, `@ts-ignore`, `as unknown as`.
   - Tuân thủ token màu `colors`, `spacing`, `radius` từ `@theme`.
   - Vùng chạm tối thiểu 48dp cho tất cả nút bấm và thẻ tương tác.
   - Giờ giấc và ngày tháng chuẩn theo định dạng Việt Nam (`dd/MM/yyyy`).
   - Gọi API qua client layer chuẩn, không gọi `fetch` trực tiếp từ component.
   - Xử lý mã lỗi theo `ApiClientError.errors[].code`.

---

## 3. Danh sách công việc chi tiết

### Task 1: API Client Wrapper cho Mobile
- **File:** `apps/mobile/src/lib/api/serviceHistory.ts`
- **Nội dung:**
  - Khởi tạo hàm `getServiceHistoryApi(): { api?: ServiceHistoryApi; error?: string }`.
  - Helper `callServiceHistory<T>(call: (api: ServiceHistoryApi) => Promise<ApiResponse<T>>): Promise<T>`.
  - Re-export `serviceHistoryErrorCodes`, `serviceHistoryQueryKeys`, `ServiceHistoryParams`.

### Task 2: Utility & Hooks cho Service History
- **Files:**
  - `apps/mobile/src/features/service-history/utils/historyStatus.ts`:
    - `serviceHistoryStatusBadge`: Map status (`completed` -> label "Hoàn thành", tone "success"; `no_show` -> label "Không đến", tone "danger").
    - `formatLocalDate`: Định dạng ngày theo giờ Việt Nam.
  - `apps/mobile/src/features/service-history/hooks/useServiceHistory.ts`:
    - Hook TanStack Query bọc `callServiceHistory((api) => api.list(params))`, quản lý query key `serviceHistoryQueryKeys.list(params)`.
  - `apps/mobile/src/features/service-history/hooks/useServiceHistoryDetail.ts`:
    - Hook TanStack Query bọc `callServiceHistory((api) => api.get(appointmentId))`, quản lý query key `serviceHistoryQueryKeys.detail(id)`, chỉ fetch khi `appointmentId` hợp lệ và modal mở.

### Task 3: Components cho Service History
- **Files:**
  - `apps/mobile/src/features/service-history/components/ServiceHistoryCard.tsx`:
    - Card hiển thị một lần sử dụng: Ngày giờ, tên dịch vụ, tên KTV, nhãn nguồn (`Dịch vụ lẻ` / `Gói: {packageName} · Buổi {sequenceNumber}`), badge trạng thái `StatusBadge`.
    - Tương tác chạm mở modal chi tiết.
  - `apps/mobile/src/features/service-history/components/ServiceHistoryDetailModal.tsx`:
    - Modal / Bottom Sheet hiển thị chi tiết: Thời lượng, KTV, nguồn, kết quả buổi chăm sóc `result`, thông tin đơn hàng `order.code`.
    - Nút CTA `"Đánh giá dịch vụ"` (khi `completed`).
  - `apps/mobile/src/features/service-history/screens/ServiceHistoryScreen.tsx`:
    - Màn hình chính tràn viền: Header riêng có nút quay lại `router.back()`.
    - Thanh chip lọc trạng thái (`Tất cả`, `Hoàn thành`, `Không đến`).
    - `FlatList` hiển thị danh sách thẻ với `RefreshControl`.
    - Đủ 4 trạng thái: Loading skeleton, Error kèm "Thử lại", Empty kèm CTA, và Success list.
    - Xử lý Guest/Anonymous state mời đăng nhập.
  - `apps/mobile/src/features/service-history/index.ts`: Export components, hooks, screen.

### Task 4: Route Screen & Điều hướng
- **Files:**
  - `apps/mobile/app/(customer)/history.tsx`:
    - Trỏ tới `ServiceHistoryScreen`.
  - `apps/mobile/app/(customer)/_layout.tsx`:
    - Đăng ký tab `history` với `href: null, tabBarStyle: { display: 'none' }, headerShown: false`.
  - `apps/mobile/src/features/users/screens/CustomerProfileScreen.tsx`:
    - Thêm mục *"Lịch sử sử dụng"* vào menu *"Dịch vụ của tôi"* dẫn tới `/(customer)/history`.

### Task 5: Kiểm tra & Đồng bộ tài liệu
- **Commands:**
  - `npm run typecheck --workspace @spa/mobile`
  - `npm run lint`
  - `cmd.exe /c "set EXPO_NO_TELEMETRY=true&& npm run mobile:check"`
- **Tài liệu:**
  - Cập nhật `docs/mobile.md`: SCR-M21 `app/(customer)/history.tsx`.
  - Cập nhật `docs/progress.md`: UC-SPA-20 Mobile ✅.

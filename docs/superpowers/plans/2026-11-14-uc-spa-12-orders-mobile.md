# Kế hoạch triển khai — UC-SPA-12: Quản lý đơn hàng đã mua trên Mobile

- **Use case:** UC-SPA-12 (Quản lý đơn hàng đã mua)
- **Nền tảng:** Mobile (React Native / Expo Router)
- **Mã màn hình:** `SCR-M20a` (Danh sách đơn hàng), `SCR-M20b` (Chi tiết đơn hàng)
- **Tài liệu đặc tả:** [docs/specs/orders.md](../../specs/orders.md#L970-L1082)
- **Ngày lập:** 14/11/2026

---

## 1. Mục tiêu & Phạm vi

1. **Danh sách đơn hàng của tôi (`SCR-M20a`):**
   - Màn hình `app/my-orders/index.tsx` (route `/my-orders`) thuộc Root Stack.
   - Lọc theo chip trạng thái: Tất cả, Chờ thanh toán, Đã thanh toán, Đã hủy, Hết hạn.
   - Thẻ đơn hàng `MyOrderCard`: Mã đơn, ngày tạo, trạng thái badge, tóm tắt sản phẩm, tổng thanh toán, nút "Chi tiết", nút "Thanh toán lại" (khi `isPayable = true`), nút "Hủy đơn" (khi `canCancel = true`).
   - Đủ 4 trạng thái: Loading skeleton, Error `AppNotice`, Empty state (kèm CTA "Khám phá dịch vụ"), Guest state (nhắc đăng nhập).

2. **Chi tiết đơn hàng (`SCR-M20b`):**
   - Màn hình `app/my-orders/[orderId].tsx` (route `/my-orders/:orderId`) thuộc Root Stack.
   - Hiển thị đầy đủ: Thông tin đơn, đếm ngược hạn thanh toán (nếu `pending_payment`), khối thông tin lịch hẹn giữ chỗ (nếu đơn đặt ngay), danh sách chi tiết các món trong đơn (đơn giá, giảm giá, thành tiền), khối tổng thanh toán (tạm tính, khuyến mãi, tổng tiền) và lịch sử thanh toán VNPay.
   - Sticky bottom bar: Nút "Thanh toán lại" (mở VNPay qua `WebBrowser.openAuthSessionAsync`) và nút "Hủy đơn hàng".

3. **Modal Hủy đơn hàng (`CancelOrderModal`):**
   - Cho phép chọn nhanh 4 lý do gợi ý hoặc nhập lý do riêng (1 – 500 ký tự theo BR-ORD-04 / Q-43).
   - Cảnh báo rõ việc hủy đơn sẽ giải phóng lịch hẹn giữ chỗ (nếu có) và không thể hoàn tác.

4. **Tích hợp vào ứng dụng:**
   - Đăng ký route `my-orders` trong `apps/mobile/app/_layout.tsx`.
   - Nối liên kết từ mục "Đơn hàng của tôi" trong `CustomerProfileScreen.tsx` (`app/(customer)/profile.tsx`).

---

## 2. Ràng buộc toàn cục (Global Constraints)

- Tuân thủ palette Botanical Green (`@theme/index`: `colors.primary`, `colors.surface`, `colors.card`, `colors.border`, v.v.).
- Vùng chạm tối thiểu $48\times 48$dp (`hitSlop={8}`).
- Định dạng tiền tệ `vi-VN` đ (`formatCurrency`). Ngày giờ theo giờ VN `Asia/Ho_Chi_Minh` (`formatLocalDate`, `formatLocalTime`, `formatUtcDateVn`).
- Tuân thủ quy ước gọi API: `OrdersApi` trong `@spa/api-client` $\rightarrow$ custom hook React Query $\rightarrow$ component UI.
- Invalidate đúng query keys: `ordersQueryKeys.all`, `appointmentsQueryKeys.all`, `purchasesQueryKeys.all`.
- Kiểm thử Jest & Testing Library Native theo bảng mã test `ORD-M-UI-T17` đến `ORD-M-UI-T25`.

---

## 3. Các bước triển khai chi tiết

### Task 1: Khai báo Hooks & Helpers
- Tạo file `apps/mobile/src/features/orders/hooks/useMyOrders.ts`:
  - Hook `useMyOrders(params: OrderListParams, enabled = true)`.
  - Sử dụng `ordersQueryKeys.list(params)`.
- Tạo file `apps/mobile/src/features/orders/hooks/useCancelOrder.ts`:
  - Hook mutation `useCancelOrder()`.
  - Gọi `callOrders((api) => api.cancelOrder(orderId, reason))`.
  - Tự động invalidate `ordersQueryKeys.all` và `appointmentsQueryKeys.all`.
- Tạo file `apps/mobile/src/features/orders/utils/orderHelpers.ts`:
  - Helper `getOrderStatusMeta(status: OrderStatus)`.
  - Helper `getPaymentStatusMeta(status: PaymentStatus)`.

### Task 2: Thành phần UI & Modal
- Tạo component `apps/mobile/src/features/orders/components/OrderStatusBadge.tsx`:
  - Huy hiệu trạng thái đơn hàng (dot + nhãn + màu viền/nền theo design system).
- Tạo component `apps/mobile/src/features/orders/components/CancelOrderModal.tsx`:
  - Modal xác nhận hủy đơn, chip lý do gợi ý nhanh, ô nhập lý do, đếm số ký tự, nút "Xác nhận hủy".
- Tạo component `apps/mobile/src/features/orders/components/MyOrderCard.tsx`:
  - Thẻ tóm tắt đơn hàng hiển thị trong FlatList, các nút hành động tương ứng.

### Task 3: Màn hình Danh sách & Chi tiết
- Tạo màn hình `apps/mobile/src/features/orders/screens/MyOrdersScreen.tsx`:
  - Header, thanh chip lọc trạng thái ngang, FlatList thẻ đơn hàng, phân trang, làm mới.
  - Tích hợp modal hủy đơn và hành động thanh toán lại.
- Tạo màn hình `apps/mobile/src/features/orders/screens/OrderDetailScreen.tsx`:
  - Header back, thẻ thông tin chi tiết, danh sách món, lịch giữ chỗ, lịch sử thanh toán, sticky bottom bar.

### Task 4: Routes & Tích hợp vào Menu
- Tạo file route:
  - `apps/mobile/app/my-orders/_layout.tsx`
  - `apps/mobile/app/my-orders/index.tsx`
  - `apps/mobile/app/my-orders/[orderId].tsx`
- Đăng ký `my-orders` vào `apps/mobile/app/_layout.tsx`.
- Cập nhật mục "Đơn hàng của tôi" trong `CustomerProfileScreen.tsx` để điều hướng tới `/my-orders`.

### Task 5: Kiểm thử & Xác thực
- Viết bộ test `apps/mobile/src/features/orders/screens/MyOrdersScreen.test.tsx`:
  - `ORD-M-UI-T17`: Xem danh sách rỗng.
  - `ORD-M-UI-T18`: Hiển thị danh sách thẻ có dữ liệu.
  - `ORD-M-UI-T19`: Lọc chip trạng thái.
  - `ORD-M-UI-T20 & T21`: Mở modal và hủy đơn thành công / kiểm tra validate lý do.
  - `ORD-M-UI-T22`: Bấm thanh toán lại mở phiên VNPay.
  - `ORD-M-UI-T23 & T24`: Chi tiết đơn hàng và khối lịch giữ chỗ.
  - `ORD-M-UI-T25`: Trạng thái khách vãng lai.
- Chạy kiểm tra:
  - `npm run typecheck --workspace @spa/mobile`
  - `npm run test --workspace @spa/mobile -- src/features/orders`
  - `npm run lint`

### Task 6: Cập nhật tài liệu
- Cập nhật `docs/mobile.md` (bổ sung route `my-orders`).
- Cập nhật `docs/progress.md` (đánh dấu Mobile UC-SPA-12 là `✅`).

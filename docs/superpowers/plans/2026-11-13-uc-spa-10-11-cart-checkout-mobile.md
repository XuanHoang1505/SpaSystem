# Kế hoạch triển khai: UC-SPA-10 & UC-SPA-11 Mobile (Giỏ hàng & Thanh toán trực tuyến)

- **Use Cases:** `UC-SPA-10` (Quản lý giỏ hàng) & `UC-SPA-11` (Thanh toán trực tuyến)
- **Nền tảng:** Mobile (`apps/mobile` - Expo SDK 57, React Native 0.86, Expo Router 57)
- **Màn hình:** `SCR-M19a` (Giỏ hàng), `SCR-M19b` (Thanh toán), `SCR-M19c` (Kết quả thanh toán), bổ sung `CartBadgeButton` và nút "Thêm vào giỏ" trên Catalog screens.
- **Ngày lập:** 13/11/2026
- **Tài liệu đặc tả:** [docs/specs/orders.md](file:///e:/UTE/HK126/Code/SpaSystem/docs/specs/orders.md#L814-L968)
- **Kỹ năng áp dụng:** [implement-fe](file:///e:/UTE/HK126/Code/SpaSystem/.claude/skills/implement-fe/SKILL.md)

---

## Global Constraints & Architectural Rules

1. **Tuân thủ quy ước kiến trúc & Glossary:**
   - Mã nguồn đặt trong `apps/mobile/src/features/orders/` với cấu trúc chuẩn: `components/`, `hooks/`, `schemas.ts`, `screens/`, `index.ts`.
   - Dùng named export cho mọi component và hook; tuyệt đối không dùng `any`, `@ts-ignore`, `as unknown as`.
2. **UI & Theme Tokens Mobile:**
   - Dùng `AppScreen` kết hợp các primitive `AppText`, `AppButton`, `AppInput`, `AppNotice`, `AppTextButton`.
   - Toàn bộ màu sắc và khoảng cách lấy từ `@theme/index` (`colors`, `radius`, `spacing`, `typography`).
   - Vùng chạm (touch target) của mọi nút bấm, icon thao tác phải $\ge 48\times 48$dp (`hitSlop={8}`).
   - Có đầy đủ `accessibilityRole="button"`, `accessibilityLabel`, khai báo `accessibilityState={{ disabled: true }}`.
3. **Data Flow & Mutation:**
   - Gọi API theo luồng chặt chẽ: `OrdersApi` (`@spa/api-client`) $\rightarrow$ hook TanStack Query $\rightarrow$ component/screen. Component không gọi `fetch` trực tiếp.
   - Sau mutation (thêm/xóa dòng giỏ hàng, tạo đơn), bắt buộc làm mới đúng key bị ảnh hưởng (`ordersQueryKeys.cart`, `ordersQueryKeys.order(id)`).
4. **Xử lý lỗi theo Mã lỗi Backend (Domain Error Codes):**
   - Phân nhánh xử lý lỗi theo `ApiClientError.errors[].code` (`orderErrorCodes`), tuyệt đối không so sánh chuỗi thông điệp `message`.
5. **Format & Định dạng:**
   - Tiền tệ định dạng `vi-VN` đ (`formatCurrency`).
   - Thời gian hiển thị chuẩn `Asia/Ho_Chi_Minh` (`formatLocalDate`, `formatLocalTime`).
6. **Mở cổng thanh toán VNPay trên Mobile:**
   - Mở URL thanh toán bằng `Linking.openURL(paymentUrl)`.
   - Khi mở cổng, đồng thời điều hướng app sang màn hình kết quả `/(customer)/payment/result?orderId=...` và kích hoạt cơ chế Polling 2s/lần (tối đa 10 lần) để đón nhận trạng thái cập nhật từ IPN/Return URL.
   - Ngoại lệ đơn 0 đ (`grandTotal = 0` do mã giảm 100%): Backend đánh dấu `paid` ngay, client chuyển thẳng sang màn hình kết quả thành công mà không gọi VNPay.
7. **TDD & Kiểm thử:**
   - Viết unit test cho các màn hình và hooks (dùng Jest + Testing Library Native, mock api-client/session, không phụ thuộc backend thật).
   - Kiểm tra nghiêm ngặt `npm run typecheck --workspace @spa/mobile` (0 lỗi) và `npm run test --workspace @spa/mobile` (toàn bộ test suite pass).
8. **Git Commit Rule:**
   - Tuyệt đối không tự ý chạy `git commit` hay `git push`. Không stage/commit file test (`*.test.ts`, `*.test.tsx`).

---

## Danh sách Task chi tiết

### Task 1: Module API Client & Query Keys cho Orders Mobile
- **Mục tiêu:** Tạo wrapper truy cập `OrdersApi` cho mobile qua `getApiClient()` và định nghĩa `ordersQueryKeys`.
- **Files tạo/cập nhật:**
  - `apps/mobile/src/lib/api/orders.ts`:
    - `getOrdersApi()`: Trả về instance `OrdersApi` gắn kèm auth token từ session hiện tại.
    - `callOrders<T>()`: Helper unwrapped data payload.
    - `ordersQueryKeys`: Quản lý query key đồng bộ với web (`cart`, `order(id)`).
- **Verification:** Chạy typecheck đảm bảo import/export hợp lệ.

### Task 2: Validation Schemas (`schemas.ts`)
- **Mục tiêu:** Định nghĩa Zod schema validate mã khuyến mãi khi khách nhập tại màn hình Checkout.
- **Files tạo/cập nhật:**
  - `apps/mobile/src/features/orders/schemas.ts`:
    - `promotionCodeSchema`: Chuỗi từ 1 đến 50 ký tự, tự động `trim()` và `toUpperCase()`, không chứa khoảng trắng.
- **Verification:** Unit test ngắn gọn hoặc test trong component.

### Task 3: Hooks quản lý Giỏ hàng & Thanh toán
- **Mục tiêu:** Cung cấp đầy đủ các React Query hooks cho Cart và Checkout.
- **Files tạo/cập nhật:**
  - `apps/mobile/src/features/orders/hooks/ordersRetry.ts`: Logic retry (không retry lỗi 4xx client).
  - `apps/mobile/src/features/orders/hooks/useCart.ts`: Query `GET /me/cart`.
  - `apps/mobile/src/features/orders/hooks/useAddToCart.ts`: Mutation `POST /me/cart/items`.
  - `apps/mobile/src/features/orders/hooks/useRemoveCartItem.ts`: Mutation `DELETE /me/cart/items/{id}`.
  - `apps/mobile/src/features/orders/hooks/useOrderPreview.ts`: Query preview đơn hàng `POST /me/orders/preview`.
  - `apps/mobile/src/features/orders/hooks/useCreateOrder.ts`: Mutation `POST /me/orders` kèm `Idempotency-Key` (UUID).
  - `apps/mobile/src/features/orders/hooks/useCreatePayment.ts`: Mutation `POST /me/orders/{id}/payments { client: "mobile" }`.
  - `apps/mobile/src/features/orders/hooks/useOrder.ts`: Query `GET /me/orders/{id}`.
  - `apps/mobile/src/features/orders/hooks/useOrderPolling.ts`: Hook tự động poll `GET /me/orders/{id}` mỗi 2s (tối đa 10 lần) khi đơn đang `pending_payment`.
- **Verification:** Typecheck sạch lỗi.

### Task 4: Các UI Components dùng chung cho Giỏ hàng & Thanh toán
- **Mục tiêu:** Xây dựng các thành phần giao diện nhỏ, chuẩn a11y và token màu sắc.
- **Files tạo:**
  - `apps/mobile/src/features/orders/components/CartItemCard.tsx`: Thẻ dòng sản phẩm trong giỏ (ảnh 80×80, tên, nhãn loại, giá hiện tại, nhãn giá đổi, làm mờ & badge "Ngừng bán", nút xóa kèm hộp thoại xác nhận).
  - `apps/mobile/src/features/orders/components/CartSkeleton.tsx`: Skeleton loading danh sách giỏ hàng.
  - `apps/mobile/src/features/orders/components/CartBadgeButton.tsx`: Nút icon giỏ hàng trên Header có badge số lượng `itemCount`.
  - `apps/mobile/src/features/orders/components/CheckoutProductItem.tsx`: Dòng sản phẩm rút gọn ở màn Checkout (tên, loại, đơn giá, giảm giá).
  - `apps/mobile/src/features/orders/components/PromotionInputCard.tsx`: Khối nhập mã khuyến mãi + nút Áp dụng + dòng giảm giá / báo lỗi.
  - `apps/mobile/src/features/orders/components/PaymentMethodSelector.tsx`: Thẻ chọn cổng thanh toán VNPay (icon `ShieldCheck`, nhãn khuyên dùng) + các cổng sắp có.
  - `apps/mobile/src/features/orders/components/OrderTotalsCard.tsx`: Bảng tổng kết tiền (Tạm tính, Giảm giá, Tổng thanh toán).
  - `apps/mobile/src/features/orders/components/PaymentStatusIcon.tsx`: Icon trạng thái lớn (Thành công xanh lá, Thất bại đỏ, Chờ xử lý vàng).
- **Verification:** Typecheck sạch lỗi.

### Task 5: Màn hình Giỏ hàng (`CartScreen.tsx` - SCR-M19a) & Unit Tests
- **Mục tiêu:** Hoàn thiện màn hình giỏ hàng đầy đủ 4 trạng thái, xử lý xóa dòng và chuyển thanh toán.
- **Files tạo:**
  - `apps/mobile/src/features/orders/screens/CartScreen.tsx`:
    - `FlatList` danh sách `CartItemCard`.
    - `StickyBottomBar` hiển thị `totalAmount` và nút "Tiến hành thanh toán".
    - Xử lý giỏ trống, giỏ lỗi mạng, pull-to-refresh.
    - Chuyển hướng khách vãng lai sang login nếu chưa đăng nhập.
  - `apps/mobile/src/features/orders/screens/CartScreen.test.tsx`:
    - Test giỏ trống (hiển thị nút CTA khám phá dịch vụ/gói).
    - Test giỏ có dữ liệu, hiển thị đúng các dòng sản phẩm và tổng tiền.
    - Test cảnh báo đổi giá và sản phẩm ngừng bán.
    - Test xóa sản phẩm mở hộp thoại và gọi API xóa thành công.
- **Verification:** Chạy Jest test suite `CartScreen.test.tsx` pass 100%.

### Task 6: Màn hình Xác nhận & Thanh toán (`CheckoutScreen.tsx` - SCR-M19b) & Unit Tests
- **Mục tiêu:** Màn hình thanh toán hỗ trợ 2 chế độ (preview từ giỏ/mua ngay hoặc đơn có sẵn).
- **Files tạo:**
  - `apps/mobile/src/features/orders/screens/CheckoutScreen.tsx`:
    - Hộp giữ đơn 15 phút / đếm ngược hạn thanh toán.
    - Danh sách sản phẩm thanh toán + cảnh báo `unavailableItems`.
    - Ô nhập mã khuyến mãi kèm xử lý `promotionError`.
    - Chọn cổng VNPay.
    - Nút "Thanh toán VNPay" gọi tạo đơn (kèm `Idempotency-Key` UUID) $\rightarrow$ tạo payment $\rightarrow$ mở `Linking.openURL(paymentUrl)` $\rightarrow$ chuyển hướng sang `payment/result`.
    - Xử lý đơn 0 đ chuyển thẳng màn hình kết quả thành công.
  - `apps/mobile/src/features/orders/screens/CheckoutScreen.test.tsx`:
    - Test chế độ `source=cart` và `source=buy_now`.
    - Test áp mã khuyến mãi thành công & mã lỗi.
    - Test nút thanh toán kích hoạt API tạo đơn và payment attempt.
    - Test đơn 0 đ chuyển thẳng trang kết quả.
- **Verification:** Chạy Jest test suite `CheckoutScreen.test.tsx` pass 100%.

### Task 7: Màn hình Kết quả thanh toán (`PaymentResultScreen.tsx` - SCR-M19c) & Unit Tests
- **Mục tiêu:** Hiển thị kết quả thanh toán với cơ chế polling 2s/lần (tối đa 10 lần) khi đơn đang `pending_payment`.
- **Files tạo:**
  - `apps/mobile/src/features/orders/screens/PaymentResultScreen.tsx`:
    - Hiển thị theo 4 trạng thái (`paid`, `failed`, `expired`, `cancelled`).
    - Hiển thị mã đơn, tổng tiền, phương thức, thời gian thanh toán.
    - Các nút CTA điều hướng: "Đặt lịch ngay", "Xem gói của tôi", "Thử thanh toán lại" (nếu `isPayable`), "Về trang chủ".
    - Tự động polling và dừng polling khi trạng thái thay đổi.
  - `apps/mobile/src/features/orders/screens/PaymentResultScreen.test.tsx`:
    - Test hiển thị thành công khi đơn `paid`.
    - Test cơ chế polling chuyển từ `pending_payment` sang `paid`.
    - Test hiển thị thất bại khi lần thanh toán `failed`.
- **Verification:** Chạy Jest test suite `PaymentResultScreen.test.tsx` pass 100%.

### Task 8: Tích hợp Lối tắt Giỏ hàng & Nút "Thêm vào giỏ" trên Catalog
- **Mục tiêu:** Giúp khách hàng có thể thêm dịch vụ/gói vào giỏ hàng và mở giỏ hàng trực tiếp từ Catalog.
- **Files cập nhật:**
  - `apps/mobile/src/features/services/screens/ServicesListScreen.tsx`: Thêm `CartBadgeButton` trên Header.
  - `apps/mobile/src/features/services/screens/ServiceDetailScreen.tsx`: Thêm `CartBadgeButton` trên Header và nút "Thêm vào giỏ" bên cạnh nút "Đặt lịch ngay".
  - `apps/mobile/src/features/packages/screens/PackagesListScreen.tsx`: Thêm `CartBadgeButton` trên Header.
  - `apps/mobile/src/features/packages/screens/PackageDetailScreen.tsx`: Thêm `CartBadgeButton` trên Header và nút "Thêm vào giỏ" bên cạnh nút "Mua gói".
- **Verification:** Đảm bảo test hiện có của Services và Packages không bị ảnh hưởng và vẫn pass 100%.

### Task 9: Đăng ký Routes trong Expo Router
- **Mục tiêu:** Đăng ký các route files cho module orders.
- **Files tạo/cập nhật:**
  - `apps/mobile/app/(customer)/cart.tsx`: Export `CartScreen`.
  - `apps/mobile/app/(customer)/checkout.tsx`: Export `CheckoutScreen`.
  - `apps/mobile/app/(customer)/payment/result.tsx`: Export `PaymentResultScreen`.
  - `apps/mobile/app/(customer)/payment/_layout.tsx`: Layout cho cụm màn hình payment.
  - `apps/mobile/app/(customer)/_layout.tsx`: Đăng ký `cart`, `checkout`, `payment` với `options={{ href: null }}` để không hiển thị tab button.
- **Verification:** Chạy `npm run typecheck --workspace @spa/mobile` 0 lỗi.

### Task 10: Tổng kiểm tra & Cập nhật Tài liệu
- **Mục tiêu:** Đảm bảo toàn bộ dự án mobile hoạt động trơn tru, không có lỗi tiềm ẩn và tài liệu được cập nhật đầy đủ.
- **Thực hiện:**
  - Chạy `npm run typecheck --workspace @spa/mobile` (0 errors).
  - Chạy `npm run test --workspace @spa/mobile` (tất cả các test suite pass).
  - Cập nhật `docs/mobile.md` (bổ sung route `cart`, `checkout`, `payment/result`).
  - Cập nhật `docs/progress.md` (chuyển trạng thái Mobile của UC-SPA-10 và UC-SPA-11 sang `✅`).

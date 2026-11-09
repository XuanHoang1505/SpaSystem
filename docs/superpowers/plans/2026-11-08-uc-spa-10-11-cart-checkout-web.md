# Giỏ hàng, thanh toán và kết quả thanh toán (web) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Khách hàng thêm dịch vụ/gói vào giỏ, xem giỏ, áp mã khuyến mãi, tạo đơn, thanh toán qua VNPay và xem kết quả trên web (SCR-W10, W11, W12).

**Architecture:** Hợp đồng ở `packages/shared-types/orders.ts` và `packages/api-client/orders.ts` (`OrdersApi`, `ordersQueryKeys`); `features/orders` giữ giỏ, preview, tạo đơn, kết quả; `features/payments` giữ lần thanh toán. Trang ở `pages/customer/` chỉ ghép feature. TanStack Query giữ dữ liệu server; không dùng Zustand cho giỏ.

**Tech Stack:** React 19, Vite, TanStack Query 5, React Hook Form + Zod, Tailwind v4 + shadcn, Vitest + Testing Library (`src/test/mockApi.tsx`).

**Spec:** `docs/specs/orders.md`, mục "Giao diện (web) — UC-SPA-10, UC-SPA-11" (dòng 451 trở đi). Backend đọc từ `backend/src/Application/DTOs/Orders` và `Payments`.

## Global Constraints

- Tên theo glossary: thư mục `features/orders`, `features/payments`; mỗi feature có `components/`, `hooks/`, `index.ts` (và `schemas.ts` khi có form); named export; không `any`, `@ts-ignore`, `as unknown as`.
- Chỉ ghép UI từ `components/ui` và `components/shared`; màu chỉ bằng token (`bg-primary`, `text-muted-foreground`, `bg-status-*`), không hex, không CSS Modules, không `style` cho màu. Không dùng `DataTable` cho giỏ (spec đã duyệt: danh sách thẻ). Thêm primitive mới bằng `npx shadcn@4.23.0 add` (chỉ khi thật cần; hiện có `alert`, `alert-dialog`, `badge`, `card`, `input`, `skeleton`, `sonner` là đủ).
- Luồng `api-client` → `lib/api/orders.ts` (`callApi`) → hook → component. Component không gọi `fetch`. Mutation xong thì `invalidateQueries`/`setQueryData` đúng key.
- Lỗi xử lý theo `ApiClientError.errors[].code`, không theo `message`. Lỗi 4xx không retry; mutation không retry.
- Mỗi màn dữ liệu có đủ 4 trạng thái (tải = `Skeleton`, lỗi = `ErrorState` có "Thử lại", rỗng = `EmptyState`, có dữ liệu).
- Văn bản tiếng Việt có dấu; tiền `formatCurrency` (đ, `vi-VN`); mốc UTC hiển thị bằng `formatDateTimeUtc`.
- Giá trị cố định từ spec: giỏ tối đa 20 dòng (backend), mã khuyến mãi ≤ 50 ký tự, giữ đơn 15 phút (`catalogPolicies.paymentTimeoutMinutes`), tối thiểu thanh toán 5.000 đ, poll kết quả mỗi 2 giây tối đa 10 lần, `client: "web"`, header `Idempotency-Key` là UUID.
- Không sửa backend. Không commit trừ khi người dùng yêu cầu (bước "Commit" dưới đây chỉ chạy khi được yêu cầu; không thêm `Co-Authored-By` hay "Generated with").
- Lệnh kiểm tra cuối: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run format:check`, `npm run web:build`.

## Review Focus

- Bấm đúp "Xác nhận và thanh toán" hoặc gửi lại sau lỗi mạng: chỉ một đơn (cùng `Idempotency-Key`; test ở Task 7).
- Tạo đơn xong nhưng `503` khi tạo thanh toán: không tạo đơn thứ hai khi "Thử lại" (Task 7).
- Giỏ có sản phẩm hết bán lẫn còn bán: vẫn thanh toán được, phần hết bán bị bỏ khỏi tổng (Task 5, 6).
- Trang kết quả mở với `?orderId=` rỗng/sai hoặc `error=invalid_payment_result`: không gọi API, có thông điệp rõ (Task 8).
- Khách vừa đăng xuất rồi đăng nhập người khác: huy hiệu giỏ không hiện số của người trước (Task 9, dựa vào `queryClient.clear()` khi kết thúc phiên).

## File Structure

| File                                                                         | Trách nhiệm                                                                                                                                                   |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/shared-types/src/orders.ts`                                        | Kiểu giỏ, đơn, preview, thanh toán                                                                                                                            |
| `packages/api-client/src/orders.ts`                                          | `OrdersApi`, `ordersQueryKeys`, `orderErrorCodes`                                                                                                             |
| `apps/web/src/lib/api/orders.ts`                                             | `callOrders`                                                                                                                                                  |
| `apps/web/src/hooks/useCountdown.ts`                                         | Chuyển từ `features/auth/hooks`                                                                                                                               |
| `features/orders/{orderStatus.ts, checkoutParams.ts, schemas.ts, errors.ts}` | Nhãn trạng thái, đọc/ghi query của `/checkout`, form mã, ánh xạ mã lỗi → thông điệp                                                                           |
| `features/orders/hooks/*`                                                    | `useCart`, `useAddToCart`, `useRemoveCartItem`, `useOrderPreview`, `useCreateOrder`, `useOrder`                                                               |
| `features/payments/{paymentStatus.ts, hooks/useStartPayment.ts}`             | Nhãn thanh toán, tạo lần thanh toán                                                                                                                           |
| `features/orders/components/*`                                               | `CartView`, `CartLine`, `CartSummary`, `CheckoutView`, `PromotionField`, `OrderSummary`, `PaymentResultView`, `CartButton`, `AddToCartButton`, `BuyNowButton` |
| `pages/customer/{CartPage,CheckoutPage,PaymentResultPage}.tsx`               | Ghép feature                                                                                                                                                  |
| `app/routes.ts`, `app/router.tsx`, `config/navigation.ts`                    | 3 route khách mới                                                                                                                                             |
| `Header.tsx`, `WorkspaceLayout.tsx`                                          | Nút giỏ                                                                                                                                                       |
| `ServiceDetailView.tsx`, `PackageDetailView.tsx`                             | Thay `ComingSoonButton` mua                                                                                                                                   |

---

### Task 1: Hợp đồng `shared-types` và `OrdersApi`

**Files:**

- Create: `packages/shared-types/src/orders.ts`, `packages/api-client/src/orders.ts`, `packages/api-client/src/orders.test.ts`
- Modify: `packages/shared-types/src/index.ts`, `packages/api-client/src/index.ts` (thêm `export * from './orders'` theo cách hai file đang xuất `catalog`, `staff`)

**Interfaces:**

- Produces (shared-types): `OrderStatus`, `PaymentStatus`, `OrderSource = 'cart' | 'buy_now'`, `PaymentClient = 'web' | 'mobile'`, `CartItem { id; type: CatalogItemType; productId; name; imageUrl: string | null; unitPrice; currentPrice; priceChanged; isAvailable; addedAtUtc }`, `Cart { items: readonly CartItem[]; itemCount; totalAmount }`, `OrderRequest { source: OrderSource; spaServiceId?: string; servicePackageId?: string; promotionCode?: string }`, `OrderPreviewItem`, `UnavailableItem`, `AppliedPromotion { code; discountAmount }`, `PromotionError { code; message }`, `OrderPreview`, `OrderItem`, `OrderPayment { id; provider; amount; status: PaymentStatus; createdAtUtc; paidAtUtc: string | null }`, `OrderDetail` (đủ trường `OrderDetailDto`, `appointment` bỏ qua), `PaymentAttempt { paymentId; paymentUrl; expiresAtUtc }`. Tên trường đúng camelCase của DTO C#.
- Produces (api-client): `class OrdersApi(client)` với `getCart(signal?)`, `addCartItem(body: {spaServiceId?: string; servicePackageId?: string})`, `removeCartItem(itemId)`, `previewOrder(request, signal?)`, `createOrder(request, idempotencyKey: string)`, `getOrder(id, signal?)`, `createPayment(orderId, client: PaymentClient)`; mỗi hàm trả `Promise<ApiResponse<…>>`. `ordersQueryKeys = { cart, preview(request), order(id) }` (`['orders','cart']`, `['orders','preview',request]`, `['orders','detail',id]`). `orderErrorCodes = { cartItemExists: 'cart_item_exists', cartFull: 'cart_full', cartItemNotFound: 'cart_item_not_found', cartEmpty: 'cart_empty', orderItemsUnavailable: 'order_items_unavailable', promotionInvalid: 'promotion_invalid', promotionNotApplicable: 'promotion_not_applicable', orderAmountTooSmall: 'order_amount_too_small', orderNotFound: 'order_not_found', orderNotPayable: 'order_not_payable', paymentAttemptsExceeded: 'payment_attempts_exceeded', paymentGatewayUnavailable: 'payment_gateway_unavailable', serviceNotFound: 'service_not_found', packageNotFound: 'package_not_found', validationError: 'validation_error' }`.

Ghi chú lệch spec: `ApiClient` không trả mã HTTP, nên `createOrder` trả `ApiResponse<OrderDetail>` (không có cờ `created`); giao diện không cần cờ này. Sửa dòng tương ứng trong spec ở Task 11.

- [ ] **Step 1: Viết test `orders.test.ts`** theo kiểu `packages/api-client/src/auth.test.ts`: dùng `fetch` giả, kiểm tra mỗi hàm gọi đúng method + URL + body: `GET /api/v1/me/cart`, `POST /api/v1/me/cart/items` với `{servicePackageId}`, `DELETE /api/v1/me/cart/items/{id}`, `POST /api/v1/me/orders/preview`, `POST /api/v1/me/orders` có header `Idempotency-Key: <key>`, `GET /api/v1/me/orders/{id}` (id được `encodeURIComponent`), `POST /api/v1/me/orders/{id}/payments` body `{client:'web'}`; `ordersQueryKeys.order('x')` bằng `['orders','detail','x']`.
- [ ] **Step 2: Chạy** `npm run test --workspace @spa/api-client -- src/orders.test.ts`. Expected: FAIL (module chưa có).
- [ ] **Step 3: Viết hai file `orders.ts` và export.** `createOrder` truyền `headers: { 'Idempotency-Key': key }` qua `RequestOptions.headers`.
- [ ] **Step 4: Chạy lại** test trên và `npm run typecheck`. Expected: PASS.
- [ ] **Step 5: Commit** (chỉ khi được yêu cầu): `feat(api-client): add cart, order and payment APIs`.

---

### Task 2: Lớp web: `callOrders`, nhãn trạng thái, tham số checkout, lỗi, schema mã

**Files:**

- Create: `apps/web/src/lib/api/orders.ts`, `features/orders/orderStatus.ts`, `features/orders/checkoutParams.ts`, `features/orders/schemas.ts`, `features/orders/errors.ts`, `features/payments/paymentStatus.ts` (+ `*.test.ts` cho `checkoutParams`, `schemas`, `errors`)
- Move: `features/auth/hooks/useCountdown.ts` (+ test) → `apps/web/src/hooks/useCountdown.ts`; `features/auth/index.ts` bỏ export `useCountdown`; sửa các import trong `features/auth/**` sang `@/hooks/useCountdown`.

**Interfaces:**

- Produces: `callOrders<T>(call: (api: OrdersApi) => Promise<ApiResponse<T>>): Promise<T>` (dùng `callApi(client => new OrdersApi(client), call)`); `orderStatusBadge(status: OrderStatus): { label: string; tone: StatusTone }` và `paymentStatusBadge(status: PaymentStatus)` theo bảng nhãn trong spec; `parseCheckoutParams(search: URLSearchParams): { ok: true; mode: 'prepare'; request: OrderRequest } | { ok: true; mode: 'existing'; orderId: string } | { ok: false }`; `checkoutPath(target: OrderRequest | { orderId: string }): string`; `promotionCodeSchema` (Zod, `trim` rồi `toUpperCase`, 1–50 ký tự) và `type PromotionCodeValues = { code: string }`; `orderErrorMessage(error: unknown): { code?: string; message: string }` ánh xạ mã lỗi → câu tiếng Việt của bảng "Mã lỗi" trong spec (mất kết nối: "Không kết nối được máy chủ", khác: "Đã có lỗi xảy ra, vui lòng thử lại.").

- [ ] **Step 1: Viết test** — `parseCheckoutParams`: `source=cart` → prepare `{source:'cart'}`; `source=cart&packageId=…` → `ok:false`; `source=buy_now&packageId=<guid>` → prepare với `servicePackageId`; `buy_now` không id, có hai id, id không phải GUID, `source` lạ → `ok:false`; `orderId=<guid>` → existing; `orderId=abc` → `ok:false`. `promotionCodeSchema`: `' summer10 '` → `'SUMMER10'`; chuỗi 51 ký tự và chuỗi rỗng lỗi. `orderErrorMessage`: mỗi mã trong bảng spec trả đúng thông điệp; `ApiClientError` status 0 → "Không kết nối được máy chủ". `paymentStatusBadge('failed')` → `{ label: 'Thất bại', tone: 'danger' }`.
- [ ] **Step 2: Chạy** `npm run test --workspace @spa/web -- src/features/orders src/features/payments` → FAIL.
- [ ] **Step 3: Viết các file trên.** `StatusTone` lấy từ `components/shared/StatusBadge`. Thực hiện việc chuyển `useCountdown` bằng `git mv`, chạy lại test auth để chắc không vỡ.
- [ ] **Step 4: Chạy** test trên, `npm run test --workspace @spa/web -- src/features/auth`, `npm run typecheck` → PASS.
- [ ] **Step 5: Commit** (khi được yêu cầu): `feat(web): add orders web foundation`.

---

### Task 3: Hooks giỏ và nút giỏ trên header

**Files:**

- Create: `features/orders/hooks/{useCart.ts,useAddToCart.ts,useRemoveCartItem.ts}`, `features/orders/components/CartButton.tsx`, `CartButton.test.tsx`
- Modify: `components/layout/Header/Header.tsx`, `components/layout/WorkspaceLayout.tsx` (thanh trên khi `workspace = 'customer'`), `features/orders/index.ts`

**Interfaces:**

- Consumes: `OrdersApi`, `ordersQueryKeys`, `callOrders` (Task 1, 2), `useAuthStore`.
- Produces: `useCart()` → `useQuery<Cart>` (`enabled` khi `status === 'authenticated'` và `user.role === 'customer'`, `staleTime` 60 giây, retry bỏ 4xx); `useAddToCart()` → mutation `{ spaServiceId?: string; servicePackageId?: string }` → `Cart`, `onSuccess` `setQueryData(ordersQueryKeys.cart, cart)`; `useRemoveCartItem()` → mutation `itemId: string` → `Cart`, `onSuccess` `setQueryData`; `onError` với `cart_item_not_found` → `invalidateQueries(cart)`. `CartButton()`: link `/cart` có `ShoppingCartIcon`, `aria-label` `Giỏ hàng, {n} sản phẩm`, huy hiệu khi `itemCount > 0`; render `null` nếu chưa đăng nhập khách.

- [ ] **Step 1: Viết `CartButton.test.tsx`** (dùng `renderApp`/`mockApi`, đăng nhập khách bằng `authResult('customer')` theo cách `AccountMenu.test.tsx` làm): khách có `itemCount: 2` → thấy nút tên "Giỏ hàng, 2 sản phẩm"; `itemCount: 0` → có nút, không có huy hiệu; khách vãng lai và chủ spa → không có nút và không gọi `GET /api/v1/me/cart`.
- [ ] **Step 2: Chạy** test → FAIL.
- [ ] **Step 3: Viết hooks và `CartButton`**, đặt `CartButton` cạnh `AccountMenu` trong `Header` và vào thanh trên của `WorkspaceLayout` cho khu khách.
- [ ] **Step 4: Chạy** test, `npm run test --workspace @spa/web` (kiểm tra test layout/header cũ không vỡ) → PASS.
- [ ] **Step 5: Commit** (khi được yêu cầu).

---

### Task 4: Nút "Thêm vào giỏ" và "Mua ngay" ở trang chi tiết

**Files:**

- Create: `features/orders/components/AddToCartButton.tsx`, `BuyNowButton.tsx`, `AddToCartButton.test.tsx`
- Modify: `features/services/components/ServiceDetailView.tsx` (thêm "Thêm vào giỏ" thành hàng thứ hai dưới hai nút hiện có), `features/service-packages/components/PackageDetailView.tsx` (thay hai `ComingSoonButton` mua), `features/orders/index.ts`; test của hai view nếu có chỗ chứa nút cũ.

**Interfaces:**

- Consumes: `useAddToCart` (Task 3), `checkoutPath` (Task 2), `useAuthStore`.
- Produces: `AddToCartButton({ product: { type: 'service' | 'package'; id: string } })`; `BuyNowButton({ packageId: string })` (chỉ gói). Cả hai: chưa đăng nhập → `navigate('/login?redirect=' + encodeURIComponent(currentPathAndSearch))` (Buy now: redirect = `checkoutPath({source:'buy_now', servicePackageId})`); role khác `customer` → render `null`; sau khi thêm toast "Đã thêm vào giỏ hàng" với action "Xem giỏ" → `/cart`; `cart_item_exists` hoặc đã thêm → nút thành link "Đã có trong giỏ · Xem giỏ"; `cart_full` → toast "Giỏ hàng đã đầy (tối đa 20 sản phẩm)"; các lỗi khác → `orderErrorMessage`.

- [ ] **Step 1: Viết test**: vãng lai bấm → vào `/login?redirect=…` (kiểm tra `redirect` đúng, `BuyNow` ra URL checkout); khách bấm → `POST /api/v1/me/cart/items` body `{ servicePackageId: id }` và toast; `409 cart_item_exists` → nút "Đã có trong giỏ"; `400 cart_full` → toast; chủ spa → không có nút.
- [ ] **Step 2: Chạy** → FAIL.
- [ ] **Step 3: Viết hai component, thay vào hai view.** Giữ nguyên "Đặt lịch ngay" và "Hỏi trợ lý tư vấn" (`ComingSoonButton`). Xóa import `ShoppingBagIcon`/`ShoppingCartIcon` thừa nếu không còn dùng.
- [ ] **Step 4: Chạy** `npm run test --workspace @spa/web -- src/features` → PASS.
- [ ] **Step 5: Commit** (khi được yêu cầu).

---

### Task 5: Màn giỏ hàng (SCR-W10) và route `/cart`

**Files:**

- Create: `features/orders/components/{CartView.tsx,CartLine.tsx,CartSummary.tsx,CartView.test.tsx}`, `pages/customer/CartPage.tsx`
- Modify: `app/routes.ts` (thêm `['/cart', 'Giỏ hàng']` vào `customer`), `app/router.tsx` (thêm bản đồ `customerPages` giống `publicPages`, route khách dùng `customerPages[path] ?? <PlaceholderPage/>`), `config/navigation.ts` nếu cần icon (`'/cart': ShoppingCartIcon`), `docs/frontend.md` sau ở Task 11.

**Interfaces:**

- Consumes: `useCart`, `useRemoveCartItem`, `checkoutPath`.
- Produces: `CartView()`; `CartLine({ item: CartItem; onRemove(item: CartItem): void; removing: boolean })`; `CartSummary({ cart: Cart })` (nút "Thanh toán" → `/checkout?source=cart`, vô hiệu khi không có dòng `isAvailable`). Trang bắt đầu bằng `PageHeader` "Giỏ hàng" và `useDocumentTitle`.

- [ ] **Step 1: Viết `CartView.test.tsx`**: (a) tải → skeleton; (b) `500` → `ErrorState` và "Thử lại" gọi lại API; (c) giỏ rỗng → "Giỏ hàng của bạn đang trống" với link `/services` và `/packages`; (d) có 2 dòng → tên, giá `formatCurrency`, tổng `totalAmount`; (e) `priceChanged` hiện giá lúc thêm; (f) `isAvailable:false` → badge "Ngừng bán", tên không là link; chỉ còn dòng hết bán → "Thanh toán" bị `disabled`; còn lẫn dòng bán được → "Thanh toán" bật và có cảnh báo; (g) bấm Xóa mở `AlertDialog` tiêu đề "Xóa khỏi giỏ hàng?", xác nhận → `DELETE /api/v1/me/cart/items/{id}` rồi dòng biến mất, "Hủy" thì không gọi; (h) `404 cart_item_not_found` → toast "Sản phẩm không còn trong giỏ" và gọi lại `GET`.
- [ ] **Step 2: Chạy** → FAIL.
- [ ] **Step 3: Viết component và trang**, đăng ký route; `/cart` nằm sau `RouteGuard role="customer"` (đã có sẵn cho nhóm `customer`).
- [ ] **Step 4: Chạy** test, `npm run test --workspace @spa/web -- src/app` (test route) → PASS.
- [ ] **Step 5: Commit** (khi được yêu cầu).

---

### Task 6: Preview, tạo đơn, tạo thanh toán: hooks và `CheckoutView` chế độ chuẩn bị

**Files:**

- Create: `features/orders/hooks/{useOrderPreview.ts,useCreateOrder.ts,useOrder.ts}`, `features/payments/hooks/useStartPayment.ts`, `features/orders/components/{CheckoutView.tsx,PromotionField.tsx,OrderSummary.tsx}`, `CheckoutView.test.tsx`, `pages/customer/CheckoutPage.tsx`
- Modify: `app/routes.ts` (`['/checkout', 'Thanh toán']`), `app/router.tsx` (`customerPages`), `features/orders/index.ts`, `features/payments/index.ts`

**Interfaces:**

- Produces: `useOrderPreview(request: OrderRequest | null)` → `useQuery<OrderPreview>` (`keepPreviousData`, `enabled` khi `request` khác null, key `ordersQueryKeys.preview(request)`, `staleTime` 0); `useCreateOrder()` → mutation `{ request: OrderRequest; idempotencyKey: string }` → `OrderDetail`; `useOrder(id: string | null, options?: { refetchInterval?: number | false })` → `useQuery<OrderDetail>` key `ordersQueryKeys.order(id)`; `useStartPayment()` → mutation `orderId: string` → `PaymentAttempt` (gọi `createPayment(orderId, 'web')`). `PromotionField({ appliedCode?: string; error?: PromotionError; pending: boolean; onApply(code: string): void; onRemove(): void })`. `OrderSummary` hiển thị dòng, giảm giá, tổng (dùng chung với chế độ có đơn). `CheckoutView({ search: URLSearchParams })`.
- Hành vi chuẩn bị đơn: `promotionCode` trong state của `CheckoutView`; `idempotencyKey` giữ trong `useRef`, tạo lại bằng `crypto.randomUUID()` khi `request` (gồm mã) đổi; "Xác nhận và thanh toán" → `createOrder` → nếu `status === 'paid'` thì `navigate('/payment/result?orderId=…')`; nếu không → `startPayment` → `window.location.assign(paymentUrl)` (đọc qua một hàm `redirectTo(url)` export từ `features/payments/redirect.ts` để test thay thế được); `startPayment` lỗi → `navigate(checkoutPath({orderId}), { replace: true })` kèm toast theo `orderErrorMessage`. Nút vô hiệu khi `items` rỗng hoặc `0 < grandTotal < 5000`.

- [ ] **Step 1: Viết `CheckoutView.test.tsx` (chế độ chuẩn bị)**: query sai → "Liên kết thanh toán không hợp lệ", không gọi API; `source=cart` gọi `POST /api/v1/me/orders/preview` body `{source:'cart'}`; `buy_now` body có `servicePackageId`; `unavailableItems` hiện cảnh báo; `items` rỗng → "Không còn sản phẩm để thanh toán" và không có nút xác nhận; mã `' sum10 '` → preview lại với `promotionCode:'SUM10'`, hiện "Mã SUM10", "Bỏ mã" gọi lại không kèm mã; `promotionError` hiện `message` và tổng không đổi; xác nhận → `POST /me/orders` có header `Idempotency-Key` (UUID) rồi `POST /me/orders/{id}/payments` body `{client:'web'}` rồi `redirectTo(paymentUrl)`; bấm đúp → `POST /me/orders` đúng 1 lần; lỗi mạng rồi bấm lại → hai request cùng khóa; đổi mã → khóa khác; thanh toán `503` → URL thành `/checkout?orderId=…`, không có `POST /me/orders` thứ hai khi bấm "Thử lại"; đơn 0 đ (`status:'paid'`) → không gọi `/payments`, đi `/payment/result?orderId=`; các mã lỗi tạo đơn (`cart_empty`, `order_items_unavailable` → preview gọi lại, `promotion_invalid` → lỗi ở ô mã, `order_amount_too_small`) hiện đúng thông điệp.
- [ ] **Step 2: Chạy** → FAIL.
- [ ] **Step 3: Viết hooks, component, trang và `redirectTo`.** Trong test mock `redirectTo` bằng `vi.mock('@/features/payments/redirect')`.
- [ ] **Step 4: Chạy** `npm run test --workspace @spa/web -- src/features/orders` → PASS.
- [ ] **Step 5: Commit** (khi được yêu cầu).

---

### Task 7: `CheckoutView` chế độ có sẵn đơn (`?orderId=`)

**Files:**

- Modify: `features/orders/components/CheckoutView.tsx`, `CheckoutView.test.tsx`
- Create: `features/orders/components/ExistingOrderCheckout.tsx` (nếu tách cho gọn)

**Interfaces:**

- Consumes: `useOrder`, `useStartPayment`, `useCountdown`, `orderStatusBadge`, `OrderSummary`.
- Produces: chế độ `existing`: mã đơn, dòng, mã đã áp (`promotion`), tổng, `StatusBadge`, đếm ngược theo `paymentDueAtUtc`; "Thanh toán lại" khi `isPayable` → `startPayment(order.id)` → `redirectTo`; đơn `paid`/`expired`/`cancelled` → thông báo theo trạng thái và link "Xem kết quả" `/payment/result?orderId=`; không có `PromotionField`.

- [ ] **Step 1: Thêm test**: `isPayable:true` hiện "Thanh toán lại" và gọi `POST …/payments` rồi `redirectTo`; `isPayable:false` và `paid` → không có nút, có link "Xem kết quả"; `404 order_not_found` → "Không tìm thấy đơn hàng"; `409 order_not_payable` → toast và gọi lại `GET /me/orders/{id}`; `409 payment_attempts_exceeded` → `Alert` và ẩn nút; `503 payment_gateway_unavailable` → đơn vẫn hiện, còn nút thử lại; không có ô mã.
- [ ] **Step 2: Chạy** → FAIL.
- [ ] **Step 3: Cài đặt chế độ `existing`.**
- [ ] **Step 4: Chạy** test file → PASS.
- [ ] **Step 5: Commit** (khi được yêu cầu).

---

### Task 8: Trang kết quả thanh toán (SCR-W12) và route `/payment/result`

**Files:**

- Create: `features/orders/components/{PaymentResultView.tsx,PaymentResultView.test.tsx}`, `pages/customer/PaymentResultPage.tsx`
- Modify: `app/routes.ts` (`['/payment/result', 'Kết quả thanh toán']`), `app/router.tsx`, `features/orders/index.ts`

**Interfaces:**

- Consumes: `useOrder(id, { refetchInterval })`, `orderStatusBadge`, `paymentStatusBadge`.
- Produces: `PaymentResultView({ search: URLSearchParams })`. Quy tắc poll: `refetchInterval` là hàm chỉ gọi lại mỗi 2000 ms khi đơn `pending_payment` và lần thanh toán mới nhất (theo `createdAtUtc` giảm dần) `pending`, tối đa 10 lần (đếm bằng `useRef`), sau đó hiện "Chưa nhận được kết quả từ cổng thanh toán" + "Kiểm tra lại" (một `refetch`). Bảng hiển thị theo `status` + lần thanh toán mới nhất đúng như spec (paid / failed / hết poll / expired / cancelled). Focus chuyển vào tiêu đề kết quả khi dữ liệu về (`tabIndex={-1}` + `ref.focus()`).

- [ ] **Step 1: Viết test (fake timers)**: thiếu `orderId`, `orderId=` rỗng hoặc `error=invalid_payment_result` → "Không xác nhận được kết quả thanh toán", không gọi API; `paid` → "Thanh toán thành công", mã đơn, tổng, các dòng, link "Tiếp tục mua sắm", không poll; `pending_payment` + lần `pending` → "Đang xác nhận thanh toán…", sau 2 giây gọi lại, đơn chuyển `paid` ở lần gọi thứ hai thì hiện thành công và dừng; luôn `pending` thì đúng 10 lần rồi hiện "Chưa nhận được kết quả" + "Kiểm tra lại" (bấm → thêm một lần gọi); lần mới nhất `failed` → "Thanh toán chưa thành công" và link "Thử lại thanh toán" tới `/checkout?orderId=…`, không poll; `expired`, `cancelled` đúng nội dung; `404 order_not_found` → "Không tìm thấy đơn hàng"; lỗi 500 → `ErrorState` + "Thử lại".
- [ ] **Step 2: Chạy** → FAIL.
- [ ] **Step 3: Viết view, trang, route.**
- [ ] **Step 4: Chạy** test file → PASS.
- [ ] **Step 5: Commit** (khi được yêu cầu).

---

### Task 9: Kiểm tra route, phân quyền và làm mới giỏ sau thanh toán

**Files:**

- Modify: `apps/web/src/app/RouteGuard.test.tsx` hoặc tạo `app/customerRoutes.test.tsx`; `features/orders/components/PaymentResultView.tsx` (làm mới giỏ khi đơn `paid`)

**Interfaces:**

- Consumes: `renderApp`, `ordersQueryKeys.cart`.
- Produces: khi `PaymentResultView` thấy đơn `paid`, gọi `queryClient.invalidateQueries({ queryKey: ordersQueryKeys.cart })` đúng một lần cho mỗi đơn.

- [ ] **Step 1: Viết test**: `/cart`, `/checkout`, `/payment/result` khi chưa đăng nhập → `/login?redirect=…` (giữ nguyên path + query); đăng nhập chủ spa → `/forbidden`; khách → vào được. Sau khi `PaymentResultView` hiện đơn `paid`, `GET /me/cart` được gọi lại một lần. Đăng xuất rồi đăng nhập khách khác: `CartButton` không hiện số cũ (cache đã `clear()`).
- [ ] **Step 2: Chạy** → FAIL cho phần làm mới giỏ (phần route đã đúng từ Task 5).
- [ ] **Step 3: Thêm `invalidateQueries`** trong `PaymentResultView` (effect phụ thuộc `order.id` và `order.status`).
- [ ] **Step 4: Chạy** `npm run test --workspace @spa/web` → PASS.
- [ ] **Step 5: Commit** (khi được yêu cầu).

---

### Task 10: Hoàn thiện cuộc gọi, kiểm tra toàn bộ

**Files:**

- Modify: bất kỳ file nào lint/format/typecheck báo; không thêm tính năng.

- [ ] **Step 1:** `npm run format` rồi `npm run lint`, `npm run typecheck`, `npm run test`, `npm run format:check`, `npm run web:build`. Expected: tất cả xanh, lint không cảnh báo (`--max-warnings 0`).
- [ ] **Step 2: Kiểm tra tay** (cần Docker): `npm run db:up`, `npm run db:seed:demo`, `npm run dev`. Đăng nhập khách demo: thêm gói và dịch vụ vào giỏ, xóa một dòng, thanh toán từ giỏ, "Mua ngay" gói, áp một mã khuyến mãi, quay lại từ VNPay (nếu chưa có khóa VNPay thì kiểm tra `503` và `?orderId=`). Xem 4 trạng thái, 320px/tablet/desktop, bàn phím (focus vào dialog xóa, tiêu đề kết quả). Báo rõ nếu không chạy được VNPay thật (ORD-T26 chưa làm).
- [ ] **Step 3: Sửa** các lỗi tìm được, chạy lại Step 1.

---

### Task 11: Tài liệu

**Files:**

- Modify: `docs/frontend.md` (route khách `/cart`, `/checkout`, `/payment/result`; mục "Giỏ hàng và thanh toán (UC-SPA-10/11)" mô tả feature, hooks, nút giỏ; sửa dòng "Chưa có: 'Thêm vào giỏ'/'Mua ngay'"), `docs/progress.md` (UC-SPA-10 và 11: thêm "web ✅", giữ nguyên "mobile chưa"), `docs/specs/orders.md` (bỏ `created` khỏi `createOrder`; ORD-LATER-06 ghi đã làm phần web; cập nhật mục "Phạm vi" nếu có lệch), `docs/specs/catalog.md` mục "Hành động mua hàng" (đã có Thêm vào giỏ/Mua ngay), `apps/web/src/features/payments/README.md` và `features/orders` (xóa README giữ chỗ nếu có).

- [ ] **Step 1: Cập nhật các file trên**, chạy `npm run format:check`.
- [ ] **Step 2: Commit** (khi được yêu cầu): `docs: add cart and checkout web`.

---

## Self-review (đã chạy)

- **Phủ spec:** hợp đồng (T1, T2), nút Thêm vào giỏ/Mua ngay (T4), nút giỏ header (T3), SCR-W10 (T5), SCR-W11 hai chế độ + Idempotency + mã lỗi (T6, T7), SCR-W12 + poll (T8), route/quyền/làm mới giỏ (T9), 4 trạng thái và responsive (T5–T8, kiểm tay T10), docs (T11). Test `ORD-UI-T01..T20` ánh xạ: T01→Task 1; T02–T04→5; T05→4; T06→3; T07–T13→6; T14→7; T15–T18→8; T19→9; T20→5/4 (nhãn, không còn `ComingSoonButton`).
- **Nhất quán kiểu:** `OrderRequest.source`, `servicePackageId`, `PaymentAttempt.paymentUrl`, `checkoutPath`, `redirectTo`, `ordersQueryKeys` dùng cùng tên ở mọi task.
- **Lệch spec đã ghi:** bỏ cờ `created` của `createOrder` (ApiClient không lộ mã HTTP); ghi vào spec ở Task 11.

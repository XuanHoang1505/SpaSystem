# Quản lý đơn hàng (UC-SPA-13) web Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trang `/owner/orders` cho chủ spa: tìm/lọc/sắp xếp/phân trang đơn hàng trên server, xem chi tiết trong Sheet, hủy đơn chưa thanh toán kèm lý do.

**Architecture:** Thêm kiểu vào `@spa/shared-types`, lớp `OrderManagementApi` + query key `['orders','manage',…]` vào `@spa/api-client/orders.ts`, `callOrderManagement` ở `lib/api/orders.ts`, rồi hooks và component chủ spa trong `features/orders/components/owner/`. `CancelOrderDialog` (UC-SPA-12) được tổng quát hóa để nhận mutation từ ngoài. Route `/owner/payments` đổi thành `/owner/orders`.

**Tech Stack:** React 19, TanStack Query, React Router, React Hook Form + Zod, Tailwind v4 + shadcn/ui, Vitest + Testing Library.

**Spec:** `docs/specs/orders.md`, mục "Giao diện web: Quản lý đơn hàng (UC-SPA-13, SCR-W37, 11/11/2026)". Không dùng mẫu Stitch (người dùng bỏ qua).

## Global Constraints

- Tên theo glossary; code trong `apps/web/src/features/orders/` (`components/owner/`, `hooks/`, `schemas.ts`, `index.ts`); named export; không `any`, `@ts-ignore`, `as unknown as`.
- Chỉ ghép UI từ `components/ui` và `components/shared`. Bảng dùng `DataTable` + `useTableSearchParams`; không `<table>`, không shadcn `Table` trực tiếp.
- Màu chỉ bằng token trong `theme.css`; không hex, không `bg-white`, không CSS Modules, không inline style. Trang chủ spa phải đúng ở cả sáng và tối.
- Gọi API theo `api-client` → `lib/api` → hook → component; component không gọi `fetch`. Mutation xong `invalidateQueries` đúng key.
- Lỗi xử lý theo `ApiClientError.errors[].code` (`orderErrorCode`), không so message. Mỗi màn dữ liệu đủ 4 trạng thái.
- Văn bản tiếng Việt có dấu, không dùng em-dash (—) trong chữ hiển thị. Tiền `formatCurrency` (vi-VN đ); thời điểm UTC `formatDateTimeUtc`; ngày/giờ lịch hẹn `formatLocalDate`/`formatLocalTime` (đã là giờ VN, ADR-0003, không đổi múi giờ).
- Không đổi hợp đồng backend. Không thêm canCancel cho dòng bảng: **chỉ hủy trong Sheet chi tiết**, nút theo `canCancel`.
- Lý do hủy: cắt khoảng trắng, 1–500 ký tự (`cancelOrderSchema`, `CANCEL_REASON_MAX = 500` đã có). Ô tìm `maxLength` 100, chờ 300 ms.
- Query key: `ordersQueryKeys.managedList(params)` = `['orders','manage','list',params]`, `ordersQueryKeys.managedOrder(id)` = `['orders','manage','detail',id]`.
- TDD: test cạnh file, `fetch` giả (`mockApi`/`envelope`/`apiError` trong `src/test/mockApi.tsx`, `renderWithQuery`/`money` trong `src/test/utils.tsx`), không cần backend.
- Lệnh kiểm tra: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run format:check`, `npm run web:build`. Chạy `npm run format` trước khi xong.
- `src/test/app.test.tsx` **đang có sẵn 22 test lỗi** (vòng "Signed-in %s sees %s placeholder" chạy cả các route đã có trang thật). Không sửa trong plan này; chỉ đảm bảo không thêm lỗi mới ngoài vòng đó và báo lại cho người dùng.
- Git do người dùng tự chạy: các bước "Commit" dưới đây chỉ là **gợi ý lệnh cho người dùng**, người thực thi không tự commit/push; không thêm Co-Authored-By hay "Generated with".

## Review Focus

- Mở Sheet của đơn A rồi đổi sang đơn B: không được hiện dữ liệu cũ của A hay giữ lỗi/lý do hủy của A → test ở Task 5 (`key` theo id, đổi đơn hiện đúng mã B).
- Hủy thành công khi Sheet đang mở: Sheet phải cập nhật ngay sang "Đã hủy" + lý do và nút "Hủy đơn" biến mất (không phải đóng mở lại) → test ở Task 6.
- URL có `?status=abc` hoặc `?page=999`: không gửi `status` lạ; trang vượt `totalPages` về trang cuối → test ở Task 4.
- Ô tìm chỉ toàn khoảng trắng: không gửi `search` → test ở Task 4.
- Khách hàng của UC-SPA-12 vẫn hủy được sau khi tổng quát hóa `CancelOrderDialog` (`MyOrdersView` vẫn truyền mutation của khách) → test ở Task 3.

---

### Task 1: Hợp đồng `shared-types` + `OrderManagementApi`

**Files:**

- Modify: `packages/shared-types/src/orders.ts`
- Modify: `packages/api-client/src/orders.ts`
- Test: `packages/api-client/src/orders.test.ts` (mới)

**Interfaces:**

- Produces (shared-types, khớp JSON camelCase của `OrderListItemDto`, `OwnerOrderDetailDto`):
  - `OrderCustomerSummary { id: string; fullName: string; phoneNumber: string }`
  - `OrderCustomer extends OrderCustomerSummary { email: string }`
  - `OrderListItem { id; code; status: OrderStatus; createdAtUtc; paymentDueAtUtc; grandTotal: number; itemCount: number; customer: OrderCustomerSummary; paymentCount: number; latestPaymentStatus: PaymentStatus | null; promotionCode: string | null }`
  - `OwnerOrderPayment { id; provider; amount: number; status: PaymentStatus; requestCode: string; providerTransactionId: string | null; createdAtUtc; expiresAtUtc; paidAtUtc: string | null }`
  - `OwnerOrderDetail = Omit<OrderDetail, 'payments'> & { customer: OrderCustomer; payments: readonly OwnerOrderPayment[] }`
  - `OrderSortBy = 'createdAtUtc' | 'grandTotal'`
  - `OrderSearchParams = OrderListParams & { search?: string; sortBy?: OrderSortBy; sortDirection?: SortDirection }` (`SortDirection` đã có trong shared-types)
- Produces (api-client): `class OrderManagementApi { listOrders(params: OrderSearchParams, signal?): Promise<ApiResponse<PagedResponse<OrderListItem>>>; getOrder(id: string, signal?): Promise<ApiResponse<OwnerOrderDetail>>; cancelOrder(id: string, reason: string): Promise<ApiResponse<OwnerOrderDetail>> }` trên base `/api/v1/orders`; `ordersQueryKeys.managedList(params: OrderSearchParams)`, `ordersQueryKeys.managedOrder(id: string)`.

- [ ] **Step 1: Viết test hỏng** `orders.test.ts` theo mẫu `auth.test.ts` (`setup()` với `fetch` giả):
  - `listOrders({ search: 'DH01', status: 'pending_payment', fromDate: '2026-11-01', toDate: '2026-11-11', sortBy: 'grandTotal', sortDirection: 'asc', pageNumber: 2, pageSize: 20 })` → URL pathname `/api/v1/orders`, searchParams có đủ 8 giá trị trên, method GET.
  - `getOrder('a b')` → `/api/v1/orders/a%20b`, GET.
  - `cancelOrder('o1', 'Khách đổi ý')` → `/api/v1/orders/o1/cancel`, POST, body `{"reason":"Khách đổi ý"}`.
  - `ordersQueryKeys.managedList({ pageNumber: 1 })` bằng `['orders','manage','list',{ pageNumber: 1 }]`; `managedOrder('o1')` bằng `['orders','manage','detail','o1']`.
- [ ] **Step 2:** `npm run test --workspace @spa/api-client -- src/orders.test.ts` → FAIL (`OrderManagementApi` chưa có).
- [ ] **Step 3:** Thêm kiểu vào `shared-types/orders.ts` (giữ nguyên kiểu cũ) và `OrderManagementApi` + 2 key vào `api-client/orders.ts` (cùng cách gọi `client.get/post` như `OrdersApi`, `query: { ...params }`).
- [ ] **Step 4:** Chạy lại test → PASS; `npm run typecheck` → PASS.
- [ ] **Step 5 (gợi ý commit cho người dùng):** `git add packages/shared-types/src/orders.ts packages/api-client/src/orders.ts packages/api-client/src/orders.test.ts` · `git commit -m "feat(orders): add owner order management API client (UC-SPA-13)"`

### Task 2: `callOrderManagement` + hooks chủ spa

**Files:**

- Modify: `apps/web/src/lib/api/orders.ts`
- Create: `apps/web/src/features/orders/hooks/useManagedOrders.ts`, `useManagedOrder.ts`, `useCancelManagedOrder.ts`
- Test: `apps/web/src/features/orders/hooks/useCancelManagedOrder.test.tsx`

**Interfaces:**

- Consumes: Task 1.
- Produces:
  - `callOrderManagement<T>(call: (api: OrderManagementApi) => Promise<ApiResponse<T>>): Promise<T>` (cùng mẫu `callOrders`).
  - `useManagedOrders(params: OrderSearchParams)` → `useQuery` key `managedList(params)`, `placeholderData: keepPreviousData` (để `isFetching` không xóa bảng khi đổi trang).
  - `useManagedOrder(id: string | null)` → `useQuery` key `managedOrder(id)`, `enabled: id !== null`, `retry` dùng `ordersRetry` đã có (không retry 404).
  - `useCancelManagedOrder()` → `useMutation<OwnerOrderDetail, unknown, { id: string; reason: string }>`; `onSuccess`: `setQueryData(managedOrder(order.id), order)`; `onSettled`: `invalidateQueries({ queryKey: ['orders','manage','list'] })` và, khi lỗi, `invalidateQueries({ queryKey: managedOrder(id) })`.

- [ ] **Step 1: Viết test hỏng** `useCancelManagedOrder.test.tsx` (`renderHook` với `QueryClientProvider`, `mockApi`):
  - Thành công: `POST /api/v1/orders/o1/cancel` trả `envelope(detail cancelled)` → cache `managedOrder('o1')` bằng dữ liệu trả về; spy `invalidateQueries` được gọi với `{ queryKey: ['orders','manage','list'] }`.
  - Lỗi `apiError(409, 'order_not_cancellable', …)` → mutation `isError`, `invalidateQueries` gọi cả list và `managedOrder('o1')`.
- [ ] **Step 2:** Chạy `npm run test --workspace @spa/web -- src/features/orders/hooks/useCancelManagedOrder.test.tsx` → FAIL.
- [ ] **Step 3:** Viết `callOrderManagement` và 3 hook như Interfaces.
- [ ] **Step 4:** Chạy lại → PASS.
- [ ] **Step 5 (gợi ý commit):** `git commit -m "feat(web): add owner order hooks (UC-SPA-13)"`

### Task 3: Tổng quát hóa `CancelOrderDialog`

**Files:**

- Modify: `apps/web/src/features/orders/components/CancelOrderDialog.tsx`, `MyOrdersView.tsx` (chỗ dùng dialog)
- Test: `apps/web/src/features/orders/components/CancelOrderDialog.test.tsx` (mới)

**Interfaces:**

- Produces: `CancelOrderDialog({ order, onClose, cancel, description? }: { order: { id: string; code: string } | null; onClose: () => void; cancel: CancelOrderMutation; description?: string })` với `type CancelOrderMutation = { mutate: (vars: { id: string; reason: string }, opts: { onSuccess: () => void; onError: (e: unknown) => void }) => void; isPending: boolean }` (cả `useCancelOrder()` và `useCancelManagedOrder()` thỏa). Mặc định `description` giữ câu cũ của khách; tiêu đề đổi thành "Hủy đơn hàng {code}?" (áp dụng cả hai nơi).
- Hành vi lỗi: `validation_error` có `errors[0].field` (so không phân biệt hoa thường) = `reason` → `form.setError('reason', { message })`; các lỗi khác → `Alert` với `orderErrorMessage`. Thêm prop `onNotFound?: () => void`: khi mã `order_not_found` thì gọi `toast.error('Không tìm thấy đơn hàng.')`, `onNotFound?.()` rồi `onClose()`.
- Consumes: `MyOrdersView` truyền `cancel={useCancelOrder()}`.

- [ ] **Step 1: Viết test hỏng** (`renderWithQuery`, `cancel` giả bằng `vi.fn`):
  - Lý do rỗng hoặc 501 ký tự → hiện lỗi dưới "Lý do hủy", `cancel.mutate` không được gọi.
  - `"  Khách đổi ý  "` → `mutate({ id: 'o1', reason: 'Khách đổi ý' }, …)`; `onSuccess` → toast "Đã hủy đơn DH01" và `onClose` được gọi.
  - `onError(ApiClientError 409 order_not_cancellable)` → `role="alert"` chứa "Đơn hàng không còn có thể hủy."; dialog còn mở.
  - `onError(400 validation_error field "Reason")` → lỗi hiện dưới ô lý do.
  - `onError(404 order_not_found)` → `onNotFound` và `onClose` được gọi.
  - Tiêu đề là "Hủy đơn hàng DH01?"; truyền `description` thì hiện đúng câu đó.
- [ ] **Step 2:** Chạy test → FAIL.
- [ ] **Step 3:** Sửa `CancelOrderDialog` theo Interfaces; sửa `MyOrdersView` truyền `cancel`.
- [ ] **Step 4:** Chạy test này và `npm run typecheck` → PASS.
- [ ] **Step 5 (gợi ý commit):** `git commit -m "refactor(web): let CancelOrderDialog take the cancel mutation"`

### Task 4: Bảng và thanh lọc (`OwnerOrdersView`, `OrderFilterToolbar`, `OrderTable`)

**Files:**

- Create: `apps/web/src/features/orders/components/owner/OwnerOrdersView.tsx`, `OrderFilterToolbar.tsx`, `OrderTable.tsx`, `ownerOrderParams.ts`
- Modify: `apps/web/src/features/orders/index.ts` (export `OwnerOrdersView`)
- Test: `apps/web/src/features/orders/components/owner/OwnerOrdersView.test.tsx`

**Interfaces:**

- Consumes: `useManagedOrders` (Task 2); `orderStatusBadge`, `paymentStatusBadge`, `OrdersBreadcrumb`, `useTableSearchParams({ defaultPageSize: 10, defaultSort: { sortBy: 'createdAtUtc', sortDirection: 'desc' } })`.
- Produces:
  - `ownerOrderParams.ts`: `ORDER_STATUSES: readonly OrderStatus[]`, `toOrderStatus(value: string): OrderStatus | undefined` (giá trị lạ → `undefined`), `buildOrderSearchParams(input: { pageNumber; pageSize; search; status; fromDate; toDate; sort: DataTableSort | null }): { params: OrderSearchParams; dateRangeInvalid: boolean }` (search được trim, rỗng → bỏ; `sortBy` chỉ nhận `createdAtUtc|grandTotal`; khoảng ngày sai → bỏ cả `fromDate`/`toDate`).
  - `OrderFilterToolbar` props: `{ search; onSearchChange; status: OrderStatus | ''; onStatusChange; fromDate; onFromDateChange; toDate; onToDateChange; hasFilters; onReset }` (không có nút tạo). Ô tìm `aria-label="Tìm đơn hàng"`, placeholder "Tìm mã đơn, tên, SĐT hoặc email khách…", `maxLength={100}`, chờ 300 ms như `PromotionFilterToolbar`. Lỗi ngày: "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu."
  - `OrderTable` props: `{ data; page; isLoading; isFetching; error: string | null; onRetry; sort; onSortChange; onPageChange; onPageSizeChange; hasFilters; onResetFilters; onSelectOrder: (row: OrderListItem) => void }`. Cột, nhãn, `hideBelow` đúng bảng "Cột `DataTable<OrderListItem>`" trong spec; caption "Danh sách đơn hàng"; `rowActions` chỉ `[{ label: 'Xem chi tiết', icon: EyeIcon, onSelect: onSelectOrder }]`; `onRowClick={onSelectOrder}`.
  - Trạng thái rỗng: không lọc "Chưa có đơn hàng nào" / "Đơn hàng khách tạo khi thanh toán sẽ hiện ở đây."; có lọc "Không có đơn hàng phù hợp" + nút "Đặt lại bộ lọc". Lỗi: `validation_error` → "Bộ lọc không hợp lệ."; còn lại "Không tải được danh sách đơn hàng."
  - `OwnerOrdersView`: `PageHeader` "Quản lý đơn hàng" + mô tả của spec, breadcrumb "Trang chủ / Quản trị spa / Đơn hàng"; giữ `selectedOrder: { id; code } | null` để mở Sheet (Task 5); trang vượt `totalPages` → `setPage(totalPages, { replace: true })`.

- [ ] **Step 1: Viết test hỏng** `OwnerOrdersView.test.tsx` (render trong `MemoryRouter` + `QueryClientProvider`, `mockApi` cho `GET /api/v1/orders`; một helper `listItem(overrides)`):
  - ORD-UI-T22: lúc đầu có skeleton; dữ liệu hiện "DH01", "Nguyễn Thị Lan", "0912345678", `money(1250000)`, badge "Chờ thanh toán", "Thành công" + "2 lần"; `latestPaymentStatus: null` hiện "Chưa thanh toán"; lỗi 500 hiện "Không tải được danh sách đơn hàng." và "Thử lại" gọi lại API lần 2.
  - Rỗng không lọc hiện "Chưa có đơn hàng nào"; ORD-UI-T23 rỗng với `?status=paid` hiện "Không có đơn hàng phù hợp", bấm "Đặt lại bộ lọc" → request kế tiếp không có `status`.
  - ORD-UI-T24: gõ " Lan " vào ô tìm, chờ (fake timers 300 ms) → request có `search=Lan`, `pageNumber=1`; gõ " " → không có `search`.
  - ORD-UI-T25: chọn "Đã hủy" → `status=cancelled`, `pageNumber=1`; mở với `?status=abc` → request không có `status`; nhập ngày → có `fromDate`/`toDate`.
  - ORD-UI-T26: Từ 2026-11-10, Đến 2026-11-01 → hiện lỗi ngày, request không có `fromDate`/`toDate`.
  - ORD-UI-T27: request đầu có `sortBy=createdAtUtc&sortDirection=desc`; bấm tiêu đề "Tổng thanh toán" → `sortBy=grandTotal`.
  - ORD-UI-T28: `?page=999` với `totalPages: 3` → request kế tiếp `pageNumber=3`; đổi trang 2 → `pageNumber=2`.
  - ORD-UI-T29: mở menu "Thao tác" của dòng `pending_payment` → chỉ có "Xem chi tiết", không có "Hủy đơn".
  - Test riêng cho `buildOrderSearchParams`/`toOrderStatus` (bảng giá trị vào/ra) trong `ownerOrderParams.test.ts`.
- [ ] **Step 2:** Chạy test → FAIL.
- [ ] **Step 3:** Viết 4 file theo Interfaces. Ở task này `OwnerOrdersView` chỉ ghi `selectedOrder` (`useState`), Sheet gắn ở Task 5.
- [ ] **Step 4:** Chạy test → PASS.
- [ ] **Step 5 (gợi ý commit):** `git commit -m "feat(web): add owner order list with filters (UC-SPA-13)"`

### Task 5: Sheet chi tiết `OwnerOrderDetailSheet`

**Files:**

- Create: `apps/web/src/features/orders/components/owner/OwnerOrderDetailSheet.tsx`, `OwnerPaymentList.tsx`
- Modify: `OwnerOrdersView.tsx` (gắn Sheet)
- Test: `apps/web/src/features/orders/components/owner/OwnerOrderDetailSheet.test.tsx`

**Interfaces:**

- Consumes: `useManagedOrder`, `OrderLines`, `OrderTotals`, `OrdersErrorState`, `EmptyState`, `StatusBadge`, `orderStatusBadge`, `paymentStatusBadge`, `appointmentStatusBadge` từ `features/bookings/appointmentStatus.ts` (không viết map mới).
- Produces: `OwnerOrderDetailSheet({ order, onClose, onCancel }: { order: { id: string; code: string } | null; onClose: () => void; onCancel: (order: OwnerOrderDetail) => void })`. Thân Sheet render với `key={order.id}`.
- Nội dung đúng mục "Sheet chi tiết" của spec: tiêu đề "Đơn {code}" + badge; "Tạo lúc …"; Khách hàng (`tel:`, `mailto:`); Thông tin đơn (hạn thanh toán chỉ khi `pending_payment`, khuyến mãi); `OrderLines` (map `items` → `SummaryLine` với `key = item.id`, `name = productName`) + `OrderTotals`; Lịch giữ chỗ khi có `appointment`; Các lần thanh toán sắp `createdAtUtc` giảm dần, "Mã yêu cầu", "Mã giao dịch" ("Chưa có" khi null), rỗng "Chưa có lần thanh toán nào."; cảnh báo hoàn tiền khi `status` là `cancelled`/`expired` và có lần `succeeded` (câu "Đơn đã hủy nhưng có lần thanh toán thành công. Cần hoàn tiền thủ công cho khách." hoặc "Đơn đã hết hạn nhưng …"); Thông tin hủy khi có `cancelledAtUtc`; chân Sheet nút "Hủy đơn" (`variant="destructive"`) chỉ khi `canCancel`.
- Trạng thái: `Skeleton` khi tải; `order_not_found` → `EmptyState` "Không tìm thấy đơn hàng"; lỗi khác → `OrdersErrorState` "Không tải được đơn hàng" + "Thử lại".

- [ ] **Step 1: Viết test hỏng** (`mockApi` cho `GET /api/v1/orders/o1`; helper `detail(overrides)`):
  - ORD-UI-T30: hiện "Nguyễn Thị Lan", link `tel:0912345678`, `mailto:lan@spa.vn`, tên sản phẩm, `money(grandTotal)`, lịch giữ chỗ (ngày, "14:00", tên nhân viên), "Mã yêu cầu" `REQ-1`, "Mã giao dịch" `14123456`, lần không có mã giao dịch hiện "Chưa có"; thanh toán mới nhất đứng trước.
  - 404 `order_not_found` → "Không tìm thấy đơn hàng"; 500 → "Thử lại" gọi lại.
  - ORD-UI-T31: `canCancel: true` có nút "Hủy đơn" và bấm gọi `onCancel(detail)`; `canCancel: false` không có nút; đơn `cancelled` hiện "Lý do: Khách đổi ý" và giờ hủy; đơn `cancelled` có lần `succeeded` hiện câu cảnh báo hoàn tiền; `paid` không có cảnh báo.
  - Review Focus: render với `{ id: 'o1', code: 'DH01' }` rồi rerender `{ id: 'o2', code: 'DH02' }` → tiêu đề "Đơn DH02", không còn tên khách của o1.
- [ ] **Step 2:** Chạy test → FAIL.
- [ ] **Step 3:** Viết `OwnerOrderDetailSheet`, `OwnerPaymentList`; trong `OwnerOrdersView` mở Sheet từ `selectedOrder`.
- [ ] **Step 4:** Chạy test Task 4 và Task 5 → PASS.
- [ ] **Step 5 (gợi ý commit):** `git commit -m "feat(web): add owner order detail sheet (UC-SPA-13)"`

### Task 6: Hủy đơn từ Sheet

**Files:**

- Modify: `OwnerOrdersView.tsx`
- Test: thêm vào `OwnerOrdersView.test.tsx`

**Interfaces:**

- Consumes: `CancelOrderDialog` (Task 3) với `cancel={useCancelManagedOrder()}`, `description` = câu của spec ("Đơn sẽ chuyển sang Đã hủy, các lần thanh toán đang chờ hết hiệu lực và lịch giữ chỗ của đơn (nếu có) bị hủy. Thao tác không thể hoàn tác."), `onNotFound` đóng Sheet (`setSelectedOrder(null)`).
- `OwnerOrdersView` giữ `cancelTarget: { id; code } | null`; Sheet vẫn mở trong lúc hủy.

- [ ] **Step 1: Viết test hỏng** (toàn màn, `mockApi` cho list, detail, cancel):
  - ORD-UI-T32: bấm dòng DH01 → Sheet → "Hủy đơn" → nhập " Khách đổi ý " → "Xác nhận hủy" → `POST /api/v1/orders/o1/cancel` body `{"reason":"Khách đổi ý"}`; toast "Đã hủy đơn DH01"; danh sách được gọi lại; Sheet (vẫn mở) hiện badge "Đã hủy", "Lý do: Khách đổi ý", không còn nút "Hủy đơn" (Review Focus).
  - Lý do rỗng → không có request cancel.
  - ORD-UI-T33: cancel trả 409 `order_not_cancellable` → hộp thoại hiện "Đơn hàng không còn có thể hủy.", danh sách và chi tiết được gọi lại; cancel trả 404 → toast "Không tìm thấy đơn hàng.", hộp thoại và Sheet đóng.
- [ ] **Step 2:** Chạy test → FAIL.
- [ ] **Step 3:** Gắn `CancelOrderDialog` vào `OwnerOrdersView`.
- [ ] **Step 4:** Chạy test → PASS.
- [ ] **Step 5 (gợi ý commit):** `git commit -m "feat(web): cancel unpaid orders from the owner detail sheet (UC-SPA-13)"`

### Task 7: Route `/owner/orders`, menu, tài liệu

**Files:**

- Create: `apps/web/src/pages/owner/OwnerOrdersPage.tsx` (chỉ render `OwnerOrdersView`)
- Modify: `apps/web/src/app/routes.ts` (`['/owner/payments','Thanh toán']` → `['/owner/orders','Đơn hàng']`), `apps/web/src/app/router.tsx` (`ownerPages['/owner/orders']`), `apps/web/src/config/navigation.ts` (`'/owner/orders': ReceiptTextIcon`, bỏ `'/owner/payments'` và import `CreditCardIcon` nếu không còn dùng)
- Modify docs: `docs/frontend.md` (dòng route `/owner/payments` → `/owner/orders — Đơn hàng`; thêm mục "Quản lý đơn hàng (UC-SPA-13, 11/11/2026)" mô tả feature, hooks, key, chỉ hủy trong Sheet), `docs/progress.md` (dòng UC-SPA-13 cột web ✅ + ghi chú ngắn; câu "web chưa" bỏ), `docs/specs/orders.md` (nếu có thay đổi khi làm thì cập nhật mục Giao diện; sửa câu "Kiểm thử" UC-SPA-12 nếu `MyOrdersView.test.tsx` không tồn tại thì ghi đúng thực tế)
- Test: `apps/web/src/features/orders/components/owner/OwnerOrdersRoute.test.tsx`

- [ ] **Step 1: Viết test hỏng** (ORD-UI-T34): `useAuthStore.setState` owner đã đăng nhập, `mockApi` cho `GET /api/v1/orders`, `renderApp('/owner/orders')` → heading "Quản lý đơn hàng", không có "Tính năng đang được phát triển"; link menu "Đơn hàng" trỏ `/owner/orders`; `routes.owner` không chứa `/owner/payments`.
- [ ] **Step 2:** Chạy test → FAIL.
- [ ] **Step 3:** Sửa route, router, navigation, thêm trang; cập nhật 3 tài liệu.
- [ ] **Step 4:** Chạy toàn bộ kiểm tra: `npm run format`, `npm run lint`, `npm run typecheck`, `npm run test`, `npm run format:check`, `npm run web:build`. Kỳ vọng: tất cả PASS, trừ các lỗi có sẵn của vòng placeholder trong `src/test/app.test.tsx` (ghi lại số lượng trước/sau; `/owner/orders` sẽ nằm trong vòng đó giống các trang thật khác).
- [ ] **Step 5: Kiểm tra tay** với `npm run db:up`, `npm run db:seed:demo`, `npm run dev`, đăng nhập chủ spa: 4 trạng thái, lọc/tìm/sắp xếp/trang trên URL, Sheet, hủy đơn chờ thanh toán (có lịch giữ chỗ thì lịch chuyển hủy), 320px/tablet/desktop, sáng và tối, điều hướng bằng bàn phím (Tab vào dòng, Enter mở Sheet, Esc đóng, focus trở lại).
- [ ] **Step 6 (gợi ý commit):** `git commit -m "feat(web): wire /owner/orders and update docs (UC-SPA-13)"`

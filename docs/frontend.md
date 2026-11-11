# Web foundation

React + Vite + TypeScript strict, UI bằng Tailwind CSS v4 + shadcn/ui ([ADR-0005](decisions/ADR-0005-web-ui-tailwind-shadcn.md)). `app/` chứa router/providers/query client; `components/ui` chứa primitive shadcn; `components/shared` chứa thành phần dùng chung (DataTable, PageHeader, StatusBadge, FormField, EmptyState, ErrorState, PageLoader, ThemeToggle, SystemStatus); `components/layout` chứa các layout; `features` giữ chỗ cho nghiệp vụ; `pages` chứa trang chủ và placeholder; `stores` chỉ giữ UI/session abstraction; `lib/api` và `hooks` nối shared client với Query.

## Routes

### public

- `/` — Trang chủ
- `/services` — Dịch vụ
- `/services/:serviceId` — Chi tiết dịch vụ
- `/packages` — Gói dịch vụ
- `/packages/:packageId` — Chi tiết gói dịch vụ
- `/login` — Đăng nhập
- `/register` — Đăng ký
- `/forgot-password` — Quên mật khẩu

### customer

- `/account` — Tài khoản
- `/cart` — Giỏ hàng
- `/booking/new` — Đặt lịch hẹn
- `/booking/success` — Đặt lịch thành công
- `/checkout` — Thanh toán
- `/payment/result` — Kết quả thanh toán
- `/my-bookings` — Lịch hẹn của tôi
- `/my-bookings/:bookingId` — Chi tiết lịch hẹn
- `/my-treatment-plans` — Liệu trình của tôi
- `/my-treatment-plans/:id` — Chi tiết liệu trình và nhật ký phác đồ
- `/my-history` — Lịch sử sử dụng dịch vụ
- `/my-packages` — Gói của tôi
- `/my-packages/:packageId` — Chi tiết gói của tôi
- `/my-reviews` — Đánh giá
- `/ai-assistant` — Trợ lý AI

### staff

- `/staff` — Tổng quan nhân viên
- `/staff/schedule` — Lịch làm việc
- `/staff/bookings` — Lịch hẹn được phân công
- `/staff/bookings/:bookingId` — Chi tiết buổi chăm sóc

### owner

- `/owner` — Tổng quan quản lý
- `/owner/services` — Quản lý dịch vụ
- `/owner/packages` — Quản lý gói dịch vụ
- `/owner/staff` — Nhân viên
- `/owner/bookings` — Lịch hẹn
- `/owner/promotions` — Khuyến mãi
- `/owner/treatments` — Liệu trình
- `/owner/payments` — Thanh toán
- `/owner/reports` — Báo cáo

- `/forbidden` — Không có quyền truy cập.
- `*` — Không tìm thấy trang.

## State, aliases và accessibility

TanStack Query quản lý server state. Zustand giữ phiên đăng nhập (`stores/authStore.ts`, chỉ trong bộ nhớ) và phạm vi theme (`stores/themeScopeStore.ts`); trạng thái mở/thu gọn sidebar do `SidebarProvider` của shadcn giữ. React Hook Form + Zod dùng cho form đăng nhập, đăng ký, quên mật khẩu (`features/auth`). API gọi qua `@spa/api-client`: `SystemApi` (ping, healthLive) và `AuthApi`. SystemStatus hiển thị Loading, API Online, API Offline, Configuration Error; staleTime 60 giây và tối đa một retry, không polling.

Aliases `@/*`, `@app/*`, `@components/*`, `@features/*`, `@lib/*` được khai báo trong TypeScript và Vite. Vitest dùng cùng Vite config; `src/test/setup.ts` polyfill `matchMedia`, `ResizeObserver` và pointer capture cho Radix.

## Giao diện

- **Token:** `src/styles/theme.css` (`:root` và `.dark`) gồm nhóm shadcn, `status-*`, `chart-*`, `sidebar-*`; `src/styles/index.css` import Tailwind và ánh xạ token bằng `@theme inline`. Tông pastel/kem, primary hồng mận `#92596b`, khớp mobile.
- **Font** đóng gói bằng `@fontsource-variable` (DM Sans, Lora cho tiêu đề, JetBrains Mono), không tải từ ngoài.
- **Theme:** trang công khai và khu vực khách hàng luôn sáng (`PublicLayout`/`CustomerLayout` khai báo phạm vi `light-only`, `ThemeProvider` nhận `forcedTheme="light"`). Chỉ khu vực nhân viên và chủ spa có `ThemeToggle` trên thanh trên cùng; `next-themes` gắn class `.dark` (sáng, tối, theo hệ thống).
- **Bảng:** `DataTable` (TanStack Table 8) có skeleton khi tải, lỗi kèm nút thử lại, rỗng, sắp xếp theo server (`aria-sort`), click dòng (chuột và Enter), menu thao tác từng dòng, phân trang khớp `PagedResponse`. `useTableSearchParams` giữ `page`, `pageSize`, `sortBy`, `sortDirection`, `search` và bộ lọc trên URL.
- `AppProviders` gắn `ThemeProvider`, `QueryClientProvider`, `TooltipProvider` và `Toaster` (sonner).
- Build tách chunk `react` và `vendor` (`vite.config.ts`).

PublicLayout có header (menu di động bằng `Sheet`) và footer; `/login`, `/register`, `/forgot-password` dùng `AuthLayout` chia đôi (panel giới thiệu bên trái từ `lg`, form bên phải, link "Về trang chủ"), không có header/footer; Customer/Staff/Owner dùng `Sidebar` của shadcn (thu gọn thành icon trên desktop, thành drawer trên mobile), menu sinh từ `config/navigation.ts`. Header công khai có menu tài khoản (`features/auth/components/AccountMenu`), footer sidebar hiện người đăng nhập và nút đăng xuất. Store không phải bằng chứng phân quyền: backend kiểm tra mọi quyền.

Semantic header/nav/main/footer, skip link, focus visible, label/input error association qua `FormField`, `Button` có `loading`, dialog/sheet của Radix (focus trap, Esc) và responsive từ 320px. Có EmptyState, ErrorState, PageLoader. Chuẩn bị `locales/vi`, chưa cài i18n.

## Phiên đăng nhập (UC-SPA-01..03)

- **Lưu phiên:** refresh token nằm trong cookie HttpOnly `spa_refresh_token` do backend đặt (BE-1, `docs/specs/auth.md`). Access token và người dùng chỉ ở trong bộ nhớ (`authStore`, `status` = `restoring`/`authenticated`/`anonymous`). Không ghi token vào `localStorage`/`sessionStorage`.
- **Client:** `lib/api/client.ts` tạo `ApiClient` với `credentials: 'include'`, header `X-Auth-Transport: cookie`, Bearer từ store. Request có Bearer nhận 401 (trừ `/api/v1/auth/*`) thì gọi refresh một lần rồi gửi lại. `lib/api/session.ts` giữ client dùng chung, `refreshSession()` (một request dù nhiều nơi gọi) và `restoreSession()` (chạy khi khởi động, 401 thì thử lại một lần sau 300 ms).
- **Route:** `RouteGuard` bọc Customer/Staff/Owner: đang khôi phục → `PageLoader`; chưa đăng nhập → `/login?redirect=…` (sau khi tự đăng xuất thì về `/`); sai vai trò → `/forbidden`. `GuestOnly` bọc `/login`, `/register`, `/forgot-password`: đã đăng nhập thì chuyển tới `redirect` an toàn (`safeRedirect`) hoặc trang chủ theo vai trò (`/account`, `/staff`, `/owner`).
- **Kết thúc phiên:** `SessionBootstrap` xóa cache TanStack Query mỗi khi phiên kết thúc và toast khi phiên hết hạn.

## Danh mục dịch vụ và gói (UC-SPA-06/07)

- **Trang:** `/services` (lưới thẻ, chip loại dịch vụ, khoảng giá, sắp xếp), `/services/:serviceId`, `/packages` (lưới thẻ, khoảng giá, sắp xếp), `/packages/:packageId` (timeline trình tự buổi). Trang ở `pages/public/` chỉ ghép feature. Spec: `docs/specs/catalog.md`, mục "Giao diện (web)".
- **Feature:** `features/services` (hooks `useServiceSearch`, `useService`, `useServiceCategories`, `useCatalogSuggestions`, `useCatalogListParams`; component `CatalogSearchBox` (combobox gợi ý), `CatalogPageHeader`, `ServiceFilterPanel`, `ServiceCard`, `CatalogCard`, `CatalogGrid`, `CatalogDetailStates`, `ActiveFilterChips`, `CatalogTrustStrip`) và `features/service-packages` (`usePackageSearch`, `usePackage`, `PackageSearch`, `PackageDetailView`, `PackageTimeline`) dùng lại các khối của `services` qua `index.ts`.
- **API:** `CatalogApi` + `catalogQueryKeys` (`@spa/api-client`) → `lib/api/catalog.ts` (`callCatalog`, ném `ApiConfigurationError` khi thiếu `VITE_API_BASE_URL`). `catalogRetry`: lỗi 4xx và lỗi cấu hình không retry. Chủ spa đang đăng nhập gửi Bearer nên thấy cả mục "Ngừng bán".
- **Bộ lọc trên URL:** `search`, `categoryId` (GUID; giá trị khác hoặc link cũ `?category=` bị bỏ qua), `minPrice`, `maxPrice`, `sortBy`/`sortDirection`, `page` (12 thẻ/trang) qua `useTableSearchParams`; `setFilters` đổi nhiều khóa trong một lần. `/packages` không gửi `categoryId`. Ô chọn danh mục hiện `serviceCount` từ `GET /service-categories`.
- **Shared mới:** `ImageWithFallback`, `InfoTile` (`row`/`stacked`), `PriceRangeFilter`, `SimplePager`, `NumberedPager`, `DecorativeShapes`; hook `hooks/useDocumentTitle`.
- Mô tả ngắn trên thẻ và đầu trang chi tiết lấy từ `shortDescription`, "Quy trình chăm sóc" từ `steps` (ẩn khi rỗng) (Q-71).
- Trang chi tiết dịch vụ ghép thêm (dữ liệu thật): "Giờ trống gần nhất" hôm nay/ngày mai (`features/bookings`, `AvailabilityApi`), "Kỹ thuật viên thực hiện" (`features/staff`, `StaffApi.listPublic`), "Gói liệu trình có dịch vụ này" với % tiết kiệm (`GET /packages?serviceId`, `retailPrice`). `ServiceDetailView` nhận `aside`/`sections` để `pages/public/ServiceDetailPage` ghép các feature đó mà `services` không import ngược. Trang chi tiết gói có so sánh giá lẻ, giá/buổi, thời gian hoàn thành sớm nhất (`coursePlan.ts`), "Cách sử dụng gói". Hai trang có "Câu hỏi thường gặp" lấy số từ `features/services/catalogPolicies.ts` (giữ đồng bộ với appsettings). Lời gọi API của feature mới đi qua `lib/api/call.ts` (`callApi`).
- Bố cục theo mẫu Stitch (ID trong spec). **Nội dung tạm** gom ở `features/services/catalogPlaceholders.ts`: ★ giả, bộ lọc thời lượng/tình trạng da ("Sắp có"), dải cam kết, "Bạn sẽ nhận được", đặc quyền gói; nút "Đặt lịch" trên thẻ tạm dẫn sang chi tiết; nút đặt lịch/mua/hỏi AI ở trang chi tiết là `ComingSoonButton` (toast "đang được phát triển"). "Dịch vụ cùng loại" và "Gói liệu trình khác" dùng dữ liệu thật. Xóa khi có UC-SPA-29, mô tả trong API danh sách, UC-SPA-15 web.
- "Thêm vào giỏ" (dịch vụ và gói) và "Mua ngay" (gói) đã làm ở UC-SPA-10/11, xem mục dưới.

## Giỏ hàng và thanh toán (UC-SPA-10/11)

- **Trang (khu khách, `RouteGuard`):** `/cart` (SCR-W10, danh sách dòng + thẻ tổng tiền, xóa có xác nhận), `/checkout` (SCR-W11) và `/payment/result` (SCR-W12). Trang ở `pages/customer/` chỉ ghép feature. Spec: `docs/specs/orders.md`, mục "Giao diện (web)".
- **`/checkout` có hai chế độ:** `?source=cart` hoặc `?source=buy_now&packageId|serviceId=` chuẩn bị đơn (xem trước, ô mã khuyến mãi, "Xác nhận và thanh toán"); `?orderId=` thanh toán lại đơn có sẵn. Tạo đơn gửi `Idempotency-Key` UUID (một khóa cho mỗi nội dung đơn), nên bấm đúp hay gửi lại sau lỗi mạng không tạo hai đơn. Tạo thanh toán lỗi thì URL đổi sang `?orderId=` để thử lại không tạo đơn thứ hai. Đơn 0 đ đi thẳng sang trang kết quả. Chuyển sang VNPay qua `features/payments/redirect.ts` (`redirectTo`).
- **Kết quả:** backend chuyển trình duyệt về `/payment/result?orderId=` (hoặc `?error=invalid_payment_result`). Trang đọc `GET /me/orders/{id}` và poll mỗi 2 giây, tối đa 10 lần, khi đơn còn `pending_payment` với lần thanh toán `pending` (ở Production chỉ IPN ghi nhận kết quả). Đơn `paid` làm mới giỏ.
- **Feature:** `features/orders` (hooks `useCart`, `useAddToCart`, `useRemoveCartItem`, `useOrderPreview`, `useCreateOrder`, `useOrder`; component `CartView`, `CheckoutView`, `PaymentResultView`, `CartButton`, `AddToCartButton`, `BuyNowButton`) và `features/payments` (`useStartPayment`, `paymentStatus`, `redirectTo`). Lỗi theo `errors[].code` (`features/orders/errors.ts`). `OrdersApi` + `ordersQueryKeys` ở `@spa/api-client`, `lib/api/orders.ts` (`callOrders`).
- **Header:** khách đã đăng nhập thấy biểu tượng giỏ kèm số dòng (header công khai và thanh trên khu khách). `useCountdown` nằm ở `src/hooks/`.
- **Hằng chép tay từ backend:** hạn giữ đơn 15 phút (`catalogPolicies.paymentTimeoutMinutes`) và mức tối thiểu 5.000 đ (`MIN_PAYMENT_AMOUNT`), giữ đồng bộ `appsettings.json`.

- **Đơn hàng của tôi (UC-SPA-12, 08/11/2026):** `/my-orders` (`features/orders`: `MyOrdersView`, `OrderCard`, `OrderDetailSheet`, `CancelOrderDialog`; hooks `useMyOrders`, `useCancelOrder`). Danh sách thẻ (không dùng `DataTable` vì là thẻ, như giỏ hàng), lọc theo một trạng thái và phân trang ở server, `?status=`/`?page=` trên URL, đổi bộ lọc thì về trang 1. Nút theo cờ API: `isPayable` → "Thanh toán ngay" (`/checkout?orderId=`), `canCancel` → "Hủy đơn" (bắt buộc lý do 1–500 ký tự, `order_not_cancellable` / `order_payment_in_progress` hiện thông báo và tải lại danh sách). "Xem chi tiết" mở `Sheet` với dòng hàng, tổng, các lần thanh toán và lý do hủy. Chưa có lọc theo khoảng ngày, tìm theo mã, đếm số đơn theo trạng thái (API chưa trả).

## Đặt lịch, lịch hẹn và gói của tôi (UC-SPA-15/16/18, 09/11/2026)

Hai feature: `features/bookings` (đặt lịch, lịch hẹn của tôi) và `features/purchases` (gói và dịch vụ đã mua, nhật ký liệu trình). Hợp đồng ở `packages/shared-types` (`bookings`, `purchases`, `treatments`) và `packages/api-client` (`AppointmentsApi`, `PurchasesApi`, `TreatmentsApi`, `AvailabilityApi.forSource`). Spec: `docs/specs/bookings.md` và `docs/specs/purchases-treatments.md`, mục "Giao diện (web)".

- **Đặt lịch** `/booking/new?serviceId=` (đặt ngay, có thanh toán VNPay) hoặc `?serviceEntitlementId=` / `?treatmentSessionId=&treatmentPlanId=` (dùng quyền đã mua, không thanh toán); tùy chọn điền sẵn `date`, `startTime`, `staffMemberId`. Một trang, không có thanh bước: `BookingView` (thẻ nguồn, `DateStrip`, `StaffSlotPicker`, `BookingSummaryCard`). Nguồn đặt lịch do `useBookingSource` gom (dịch vụ, buổi của liệu trình hoặc danh sách đã mua khi thiếu `treatmentPlanId`). Đặt ngay dùng `Idempotency-Key` theo nội dung (`newUuid`), lỗi tạo thanh toán sau khi đã giữ chỗ thì sang `/checkout?orderId=` chứ không đặt lại. Lỗi xử lý theo `bookingErrorKind` (`errors.ts`).
- **Thành công** `/booking/success?appointmentId=`; lịch `held`, `cancelled`, `hold_expired` chuyển sang chi tiết.
- **Lịch hẹn của tôi** `/my-bookings` (3 tab Sắp tới, Đã qua, Đã hủy, không có số đếm; `?scope=`, `?page=`) và `/my-bookings/:bookingId`; `RescheduleDialog` và `CancelAppointmentDialog` dùng cờ `canReschedule`/`canCancel` của API, quá hạn thì đóng hộp thoại và tải lại.
- **Gói của tôi** `/my-packages` (lọc, tìm, sắp xếp ở client; `?filter=`, `?q=`, `?sort=`) và `/my-packages/:packageId` (nhật ký liệu trình từ API UC-SPA-19, chỉ đọc).
- Các nút "Đặt lịch" ở trang dịch vụ, thẻ dịch vụ và "Giờ trống gần nhất" đi qua `BookServiceButton`; trang kết quả thanh toán có khối "Lịch hẹn" cho đơn đặt ngay.
- Hằng chép từ backend ở `features/services/catalogPolicies.ts` (`maxBookingDaysAhead`, `slotStepMinutes`, `customerChangeCutoffHours`, `paymentTimeoutMinutes`) và hotline mẫu `siteContact.hotline` (số mẫu của Stitch, thay số thật).

## Khu vực khách hàng: khung giao diện (08/11/2026)

Khách hàng không dùng sidebar admin. Mẫu Stitch "Khu Vực Khách Hàng (Menu Cột Trái Thanh Lịch)" chia ba khung (`app/router.tsx`, `customerRouteObjects`):

- **Trang của tôi** (`/account`, `/my-bookings`, `/my-treatment-plans`, `/my-packages`, `/my-orders`, `/my-reviews`, `/ai-assistant`): `CustomerLayout` (header và footer công khai, luôn sáng) + `AccountLayout`: thẻ nổi bên trái (`AccountSideNav`: avatar, "Chào {tên}", menu, thẻ "Cần tư vấn?" dẫn tới `/ai-assistant`). Dưới `lg` chỉ còn hàng pill cuộn ngang, mục đang chọn được cuộn vào giữa. Menu sinh từ `config/navigation.ts` (`navigation.customer`, không có `/cart`, `/checkout`, `/payment/result`).
- **Giỏ hàng và đặt lịch** (`/cart`, `/booking/new`, `/booking/success`): `CustomerLayout`, không có menu tài khoản. Biểu tượng giỏ nằm trên header.
- **Thanh toán** (`/checkout`, `/payment/result`): `CheckoutLayout`, header tối giản (logo và "Thanh toán an toàn"), không có menu.

Staff và chủ spa giữ `WorkspaceLayout` (sidebar). Không còn dải "Bản xem trước giao diện" ở khu khách. Menu không có mục "Hồ sơ da" và "Hội viên" như mẫu vì hệ thống không có.

### Tài khoản và Trợ lý AI (10/11/2026)

- **`features/users` (`SCR-W22` — `/account`, UC-SPA-04):**
  - Quản lý thông tin tài khoản cho mọi vai trò đã đăng nhập (`customer`, `staff`, `owner`).
  - `AvatarUploader`: Tải ảnh đại diện PNG/JPG/WEBP $\le$ 5MB qua `POST /api/v1/me/avatar` và xóa ảnh qua `DELETE /api/v1/me/avatar` kèm dialog xác nhận.
  - `ProfileCard`: Xem/sửa họ tên, SĐT, ngày sinh, giới tính; email và vai trò hiển thị chỉ đọc; đồng bộ `fullName` tức thời lên header/sidebar.
  - `ChangePasswordCard`: Đổi mật khẩu qua `PUT /api/v1/me/password` (cảnh báo thu hồi toàn bộ phiên khác, tự xóa trắng form khi thành công).
- **`features/ai-assistant` (`SCR-W21` — `/ai-assistant` & Floating Widget, UC-SPA-32):**
  - Khung chat AI tư vấn dịch vụ dành cho khách hàng đăng nhập và khách vãng lai (nhân viên/chủ cơ sở bị từ chối 403 theo Q-60).
  - `AiChatWidget`: Nút icon nổi ở góc dưới bên phải màn hình (`fixed bottom-6 right-6`) nhúng tại layout công khai/khách hàng, cho phép bấm mở popup chat tiện lợi.
  - `AiMedicalDisclaimer`: Banner cảnh báo y khoa cố định ở đầu khung chat (BR-AI-01).
  - Tải lịch sử hỏi đáp của khách hàng (`GET /api/v1/me/ai/history`).
  - Gợi ý sản phẩm (`AiProductSuggestionCard`) và đề xuất lịch hẹn (`AiBookingProposalCard` kèm nút điền sẵn thông tin đặt lịch).
  - `ChatInputBar`: Ô nhập tự co giãn kèm bộ đếm ký tự (1–1000) và các câu hỏi gợi ý nhanh.

## Quản lý lịch hẹn của chủ spa (UC-SPA-17)

- **Trang:** `/owner/bookings` (SCR-W34, `OwnerAppointmentsPage`, `OwnerAppointmentsView`). Màn chủ spa đầu tiên thay thế `PlaceholderPage`, chạy trong `OwnerLayout` (sidebar, hỗ trợ theme sáng và tối).
- **Bộ lọc & điều hướng:** Giữ trên URL qua `useOwnerAppointmentFilters` (`view=list|day`, `fromDate`, `toDate`, `date`, `staffMemberId`, `status`, `search`, `page`, `pageSize`, `appointmentId`). Giới hạn tối đa 42 ngày (`maxAppointmentQueryRangeDays` trong `catalogPolicies.ts`), tìm kiếm khách trễ 300 ms, đổi bộ lọc tự động về trang 1.
- **Chế độ Danh sách:** `OwnerAppointmentsTable` (TanStack Table 8) hiển thị Thời gian, Khách (tên + SĐT), Dịch vụ, Nhân viên, Trạng thái (`StatusBadge`), menu Thao tác từng dòng. Bấm dòng mở `OwnerAppointmentSheet`.
- **Chế độ Lịch ngày:** `DayCalendar`, `DayCalendarCard`, `dayGrid.ts`. CSS Grid với cột giờ dính bên trái, đầu cột nhân viên dính phía trên ("{tên}", "{n} lịch"), các hàng nền 30 phút theo `gridRange` (mặc định 08:00 – 20:00, tự nới khi có lịch ngoài khung), thẻ lịch đặt theo bước 5 phút và phân lane chia đều chiều ngang khi trùng giờ, vạch giờ hiện tại (now-line) khi xem ngày hôm nay. Cảnh báo khi ngày có trên 100 lịch. Phần lịch đã hủy trong ngày hiển thị dạng `Collapsible` bên dưới lưới.
- **Kéo thả trên Lịch ngày:** Thư viện `@dnd-kit/core`. Chỉ cho phép kéo thẻ `pending_confirmation` và `confirmed`. Kéo dọc trong cột để đổi giờ (bám bước 30 phút), kéo ngang sang cột khác để đổi nhân viên (giữ nguyên giờ cũ). Thả mở `DropConfirmDialog` xác nhận trước khi gọi API; lỗi backend được toast trực tiếp và đưa thẻ về vị trí cũ. Tắt kéo thả ở màn hình nhỏ dưới `md` (< 768px). Hỗ trợ kéo thả bằng bàn phím với thông báo hỗ trợ tiếp cận (`accessibility.announcements`) bằng tiếng Việt.
- **Chi tiết:** `OwnerAppointmentSheet` mở qua `?appointmentId=` trên URL hoặc khi bấm vào thẻ/dòng. Hiển thị dị ứng nổi bật (`CustomerAllergy` kèm mức độ nhẹ/vừa/nặng), nguồn buổi liệu trình, ghi chú, trạng thái hồ sơ da, thời điểm và lý do hủy/giữ chỗ, chân sheet gồm các nút hành động tương ứng trạng thái.
- **Hành động chủ spa:** 5 hộp thoại thao tác:
  - `ConfirmAppointmentDialog`: Xác nhận lịch hẹn (`POST /appointments/{id}/confirm`).
  - `OwnerRescheduleDialog`: Đổi giờ hẹn qua `StaffSlotPicker` của nhân viên hiện tại (`POST /appointments/{id}/reschedule`).
  - `AssignStaffDialog`: Đổi nhân viên từ danh sách nhân viên đang làm (`GET /staff?status=working`), ưu tiên gắn nhãn "Rảnh giờ này" theo `AvailabilityApi` (`POST /appointments/{id}/assign-staff`).
  - `OwnerCancelDialog`: Hủy lịch hẹn kèm lý do bắt buộc 1–500 ký tự (`POST /appointments/{id}/cancel`).
  - `NoShowDialog`: Ghi nhận khách không đến kèm ghi chú tùy chọn $\le$ 1000 ký tự (`POST /appointments/{id}/no-show`).
- **Hooks & API:** `OwnerAppointmentsApi` (`@spa/api-client`), hooks tại `features/bookings/hooks/owner/` (`useOwnerAppointments`, `useOwnerAppointment`, `useConfirmAppointment`, `useOwnerReschedule`, `useAssignAppointmentStaff`, `useOwnerCancelAppointment`, `useMarkNoShow`, `useWorkingStaff`).
- **Hằng chép tay từ backend:** `catalogPolicies.maxAppointmentQueryRangeDays` (42), `dayGridStartTime` ('08:00'), `dayGridEndTime` ('20:00'), `noShowConsumesEntitlement` (false). Nhãn `no_show` đổi thống nhất thành "Không đến" trên toàn web.

### Quản lý nhân viên & Lịch làm việc (chủ spa, UC-SPA-22, UC-SPA-23)

- **Trang:** `/owner/staff` (SCR-W33, `OwnerStaffPage`, `OwnerStaffView`), chạy trong `OwnerLayout` (sidebar, hỗ trợ theme sáng và tối).
- **Cấu trúc 2 Tab:**
  - **Tab 1: Danh sách nhân viên (UC-SPA-22):** `StaffFilterToolbar` (tìm kiếm debounce 300ms theo tên/SĐT/email, lọc trạng thái làm việc đang làm/đã nghỉ, lọc theo dịch vụ phụ trách), `StaffTable` (TanStack Table 8 với phân trang, hiển thị avatar, tên, SĐT, email, ngày vào làm, badges dịch vụ, trạng thái làm việc và tài khoản).
  - **Chi tiết & Thao tác nhân viên:** `StaffDetailSheet` xem toàn bộ hồ sơ, ngày vào/nghỉ làm, tài khoản và danh sách dịch vụ kèm trạng thái kinh doanh; `CreateStaffDialog` (thêm nhân viên, mật khẩu tạm gửi qua mail); `EditStaffDialog` (sửa họ tên, SĐT, ngày vào làm, chuyên môn); `UpdateStaffServicesDialog` (chọn nhanh các dịch vụ mở bán); `ResignStaffDialog` (ghi nhận ngày nghỉ việc, hủy ca tương lai, cảnh báo danh sách lịch hẹn cần phân công lại `appointmentsToReassign`).
  - **Tab 2: Lịch làm việc (UC-SPA-23):** `WeeklyScheduleToolbar` (điều hướng tuần trước/tuần này/tuần sau, nhãn khoảng ngày thứ 2 đến CN, lọc theo nhân viên, lọc theo trạng thái ca hoạt động/đã hủy), `WeeklyScheduleGrid` (lưới 7 cột thứ 2 đến CN với vạch nổi bật ngày hôm nay, nút thêm ca nhanh trên từng ngày).
  - **Thao tác ca làm:** `ShiftCard` hiển thị tên nhân viên, khung giờ, gạch ngang khi đã hủy; `CreateShiftDialog` (phân ca lẻ theo nhân viên, ngày, giờ bắt đầu/kết thúc); `CreateBatchShiftsDialog` (phân ca hàng loạt theo nhiều nhân viên, khoảng ngày tối đa 42 ngày, chọn thứ trong tuần T2–CN); `BatchResultDialog` (tổng kết số ca đã tạo và danh sách ca bị bỏ qua kèm lý do); `EditShiftDialog` (sửa ngày/giờ ca); `CancelShiftDialog` (xác nhận hủy ca, kiểm tra và ngăn chặn khi ca đang có lịch hẹn).
- **Hooks & API:** `StaffApi` (mở rộng owner methods), `WorkSchedulesApi` (`@spa/api-client`), wrappers `callStaff`, `callWorkSchedules` (`apps/web/src/lib/api/`), hooks tại `features/staff/hooks/` (`useStaffList`, `useStaffDetail`, `useStaffMutations`, `useWorkSchedules`, `useWorkScheduleMutations`).
- **Chính sách:** `catalogPolicies.maxShiftDaysAhead` (60 ngày), `maxBatchShifts` (500 ca), `maxWorkScheduleQueryRangeDays` (42 ngày).

### Quản lý dịch vụ & gói dịch vụ (chủ spa, UC-SPA-09)

- **Trang dịch vụ:** `/owner/services` (SCR-W31, `OwnerServicesPage`, `OwnerServicesView`), chạy trong `OwnerLayout` (sidebar, hỗ trợ theme sáng và tối).
  - **Bộ lọc & Điều hướng:** `ServiceFilterToolbar` (tìm kiếm debounce 300ms theo tên dịch vụ, lọc theo danh mục `categoryId`, lọc theo trạng thái `on_sale`/`discontinued`, nút đặt lại, nút mở modal "Danh mục dịch vụ" và "Thêm dịch vụ").
  - **Bảng danh sách:** `ServiceTable` (TanStack Table 8 với phân trang `useTableSearchParams`, ảnh đại diện 40×40 kèm fallback, tên dịch vụ & mô tả ngắn, danh mục, thời lượng, giá niêm yết `formatCurrency`, `StatusBadge` xanh/xám, menu thao tác từng dòng kèm icon).
  - **Chi tiết:** `ServiceDetailSheet` xem ảnh, mô tả chi tiết, giá, thời lượng, danh sách các bước quy trình thực hiện (`steps[]` sắp theo `sortOrder`), ngày tạo/cập nhật, cùng các nút hành động sửa, đổi ảnh, ngừng bán/mở bán lại.
  - **Modal tạo & sửa dịch vụ:** `ServiceFormDialog` (React Hook Form + Zod `serviceFormSchema`), nhập tên, danh mục, giá, thời lượng, mô tả ngắn, mô tả dài, trình quản lý động danh sách các bước quy trình thực hiện (thêm/sửa/xóa bước, thời lượng từng bước).
  - **Modal quản lý ảnh dịch vụ:** `ServiceImageDialog` xem trước ảnh hiện tại, kéo thả hoặc chọn file ảnh mới (PNG/JPG/WEBP $\le$ 5MB), tải lên Cloudinary hoặc xóa ảnh trở về mặc định.
  - **Modal quản lý danh mục dịch vụ:** `ServiceCategoriesDialog` liệt kê danh sách danh mục kèm số dịch vụ phụ thuộc (`serviceCount`), thêm mới danh mục, sửa thông tin & thứ tự sắp xếp, xóa danh mục (chặn và cảnh báo khi danh mục đang có dịch vụ liên kết).
  - **Hộp thoại trạng thái:** `ToggleServiceStatusDialog` xác nhận chuyển đổi trạng thái giữa Đang mở bán và Ngừng bán.
- **Trang gói dịch vụ:** `/owner/packages` (SCR-W32, `OwnerPackagesPage`, `OwnerPackagesView`), chạy trong `OwnerLayout`.
  - **Bộ lọc & Điều hướng:** `PackageFilterToolbar` (tìm kiếm debounce 300ms theo tên gói, lọc trạng thái, nút đặt lại, nút "Tạo gói dịch vụ").
  - **Bảng danh sách:** `PackageTable` (TanStack Table 8, ảnh đại diện có fallback sang ảnh của dịch vụ đầu tiên theo BR-CAT-07, tên & mô tả ngắn, số buổi, thời hạn ngày, giá bán & giá bán lẻ gạch ngang kèm % tiết kiệm, thời gian mở bán nếu có, `StatusBadge`, menu thao tác).
  - **Chi tiết:** `PackageDetailSheet` xem ảnh gói, % tiết kiệm, hạn dùng, danh sách các buổi dịch vụ theo timeline (`items[]`: thứ tự, tên dịch vụ, số buổi, ngày cách tối thiểu giữa các buổi, ghi chú), thao tác sửa, đổi ảnh, đổi trạng thái.
  - **Modal tạo & sửa gói dịch vụ:** `PackageFormDialog` (React Hook Form + Zod `packageFormSchema`), nhập tên gói, giá bán, thời hạn sử dụng, khoảng ngày mở bán (tùy chọn), trình quản lý các buổi dịch vụ (chọn dịch vụ đang mở bán `useServiceSearch({ status: 'on_sale' })`, số buổi, thứ tự, khoảng cách ngày tối thiểu), tự động tính toán tổng giá bán lẻ và mức tiết kiệm theo thời gian thực.
  - **Modal ảnh gói dịch vụ:** `PackageImageDialog` tải ảnh lên hoặc xóa ảnh gói (ảnh sẽ tự động chuyển sang hiển thị ảnh của dịch vụ đầu tiên trong gói).
  - **Hộp thoại trạng thái:** `TogglePackageStatusDialog` xác nhận chuyển đổi trạng thái giữa Đang mở bán và Ngừng bán.
- **Hooks & API:** `CatalogApi` (mở rộng owner methods cho services, packages, categories), wrappers `callCatalog`, `callCatalogVoid` (`apps/web/src/lib/api/catalog.ts`), mutation hooks tại `features/services/hooks/useServiceMutations.ts` và `features/service-packages/hooks/usePackageMutations.ts`.
- **Chính sách:** `catalogPolicies.maxImageSizeBytes` (5MB), `allowedImageMimeTypes` (`image/jpeg`, `image/png`, `image/webp`).

## Chạy và kiểm tra

```powershell
npm run web
npm run web:test
npm run web:build
```

Vitest tests mock network (`src/test/mockApi.tsx` giả `fetch` theo "METHOD /path"); kiểm tra các routes, App/home/404, guard, phiên, theme, ba màn auth, bốn màn danh mục, button và system status. Không cần backend thật. Build không có API URL vẫn chạy và giao diện báo Configuration Error; Dockerfile yêu cầu build arg API URL.

# Đặt lịch, lịch hẹn của tôi và gói của tôi (web) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Khách hàng xem gói và dịch vụ đã mua, đặt lịch (đặt ngay có thanh toán hoặc dùng quyền đã mua), xem, đổi và hủy lịch hẹn trên web.

**Architecture:** Hợp đồng ở `packages/shared-types` (`bookings.ts`, `purchases.ts`, `treatments.ts`) và `packages/api-client` (`AppointmentsApi`, `PurchasesApi`, `TreatmentsApi`, `AvailabilityApi.forSource`). Hai feature: `features/bookings` (mở rộng) và `features/purchases` (mới). Trang ở `pages/customer/` chỉ ghép feature. Dải ngày và danh sách giờ dùng chung giữa trang đặt lịch và hộp thoại đổi lịch. Dữ liệu server do TanStack Query giữ; không lưu vào Zustand.

**Tech Stack:** React 19, Vite, TanStack Query 5, React Hook Form + Zod, Tailwind v4 + shadcn, Vitest + Testing Library (`src/test/mockApi.tsx`).

**Spec:** `docs/specs/bookings.md` (mục "Giao diện (web): UC-SPA-15, UC-SPA-16") và `docs/specs/purchases-treatments.md` (mục "Giao diện (web): UC-SPA-18"). Hợp đồng backend: `backend/src/Application/DTOs/Bookings`, `Purchases`, `Treatments`.

## Global Constraints

- Tên theo glossary: `appointments`, `appointmentId` (không dùng `bookings` cho lịch hẹn trong hook, kiểu, biến); thư mục `features/bookings` giữ nguyên. Mỗi feature có `components/`, `hooks/`, `index.ts`; named export; không `any`, `@ts-ignore`, `as unknown as`.
- UI chỉ ghép từ `components/ui` và `components/shared`. Danh sách ở đây là **thẻ**, không dùng `DataTable` (đã duyệt, như giỏ hàng và đơn hàng). Màu chỉ bằng token trong `theme.css`, không hex. Không thêm thư viện mới (không cài thư viện lịch).
- Luồng `api-client` → `lib/api/call.ts` (`callApi`) → hook → component; component không gọi `fetch`. Mutation xong thì `invalidateQueries` đúng khóa (`appointmentsQueryKeys.all`, `purchasesQueryKeys.all`, `treatmentsQueryKeys.all`, `availabilityQueryKeys.all`).
- Lỗi xử lý theo `ApiClientError.errors[].code`, không theo `message` (riêng các lỗi spec ghi "thông điệp backend" thì hiện `message` làm nội dung, mã vẫn quyết định hành vi). Mỗi màn dữ liệu có đủ 4 trạng thái.
- Cờ `canBook`, `canReschedule`, `canCancel`, `isPayable`, `reason`, `earliestDate` lấy từ API; FE không tự suy ra rule. Chỉ hiển thị được lọc client: giờ đã qua của hôm nay, lọc và đếm chip trên danh sách gói đã tải.
- Văn bản tiếng Việt có dấu; tiền `formatCurrency`; ngày giờ lịch hẹn là giờ `Asia/Ho_Chi_Minh` (ADR-0003), ngày `yyyy-MM-dd`, giờ `HH:mm`; không đổi múi giờ hai lần. Không có dấu gạch dài "—" trong chữ hiển thị (`apps/web/CLAUDE.md`, mục Visual taste).
- Hằng chép từ backend, ở `features/services/catalogPolicies.ts`: `maxBookingDaysAhead = 60`, `slotStepMinutes = 30`, `customerChangeCutoffHours = 24`, `paymentTimeoutMinutes = 15` (hai giá trị sau đã có). Hotline: hằng `siteContact.hotline = '1900 6886'` (số mẫu của Stitch, cần thay số thật).
- Test đặt cạnh file, `fetch` giả bằng `mockApi`; **luôn giả `GET /api/v1/me/cart`** (huy hiệu giỏ trên header) và các lời gọi phụ của trang, nếu không request chưa giả trả 401 và kết thúc phiên trong test. Thời gian dùng giờ giả (`vi.useFakeTimers`) khi test đếm ngược hay ngày hôm nay.
- Lệnh kiểm tra cuối: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run format:check`, `npm run web:build`. Chỉ format file đã sửa (`npx prettier --write <đường dẫn>`), không chạy `npm run format` toàn dự án.
- Không đổi backend. Không commit hay push trừ khi người dùng yêu cầu; không thêm `Co-Authored-By` hay "Generated with". Các bước "Commit" chỉ chạy khi được yêu cầu, tên commit theo `type(scope): subject` của dự án.

## Review Focus

1. **Bấm đúp hoặc gửi lại sau lỗi mạng khi đặt ngay:** chỉ một lịch và một đơn (cùng `Idempotency-Key`; test ở Task 8).
2. **Ngày hôm nay và nửa đêm theo giờ Việt Nam:** dải ngày và giờ trống tính theo ngày VN, không theo múi giờ trình duyệt(test ở Task 6).
3. **Cờ đã cũ sau khi quá hạn đổi hoặc hủy:** `400 change_window_passed` đóng hộp thoại, hiện thông điệp và tải lại danh sách, không để nút còn đó (test ở Task 13).
4. **Liên kết đặt lịch thiếu `treatmentPlanId` hoặc id không còn:** dự phòng sang `/me/purchases`, không tìm thấy thì "Không tìm thấy quyền sử dụng", không treo màn hình (test ở Task 7).
5. **Đặt lịch xong nhưng tạo thanh toán lỗi:** lịch giữ chỗ vẫn còn, đi tiếp sang `/checkout?orderId=`, thử lại không tạo lịch thứ hai (test ở Task 8).

## File Structure

| File                                                                                                                                | Trách nhiệm                                                                                                                                                                                                         |
| ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/shared-types/src/{bookings,purchases,treatments}.ts`                                                                      | Kiểu khớp DTO (camelCase, enum snake_case)                                                                                                                                                                          |
| `packages/api-client/src/{appointments,purchases,treatments}.ts`, `availability.ts`                                                 | API, khóa truy vấn, mã lỗi                                                                                                                                                                                          |
| `apps/web/src/lib/formatting/vietnamTime.ts`, `lib/text.ts`                                                                         | Thứ và ngày dài, cộng phút vào giờ, bỏ dấu để so khớp                                                                                                                                                               |
| `features/bookings/{appointmentStatus,bookingParams,slots,errors}.ts`                                                               | Nhãn trạng thái, đọc query `/booking/new`, giờ trống, phân loại lỗi                                                                                                                                                 |
| `features/bookings/hooks/*`, `components/*`                                                                                         | Hook, `DateStrip`, `StaffSlotPicker`, `BookingView`, `BookingSuccessView`, `MyAppointmentsView`, `AppointmentCard`, `AppointmentDetailView`, `RescheduleDialog`, `CancelAppointmentDialog`, `BookingConflictDialog` |
| `features/purchases/{purchaseStatus,filter}.ts`, `hooks/*`, `components/*`                                                          | `filterPurchases`, hook, `MyPackagesView`, `PackageCard`, `ServiceEntitlementCard`, `MyPackageDetailView`, `SessionJournal`, `SessionResultDialog`                                                                  |
| `pages/customer/{BookingPage,BookingSuccessPage,MyAppointmentsPage,MyAppointmentDetailPage,MyPackagesPage,MyPackageDetailPage}.tsx` | Ghép feature                                                                                                                                                                                                        |
| `app/routes.ts`, `app/router.tsx`, `config/navigation.ts`                                                                           | Route mới, khung header cho `/booking/*`                                                                                                                                                                            |

---

### Task 1: Hợp đồng `shared-types` và API client

**Files:**

- Create: `packages/shared-types/src/{bookings,purchases,treatments}.ts`, `packages/api-client/src/{appointments,purchases,treatments}.ts`, test cạnh từng file API
- Modify: `packages/shared-types/src/{index,orders}.ts` (export; `OrderDetail.appointment`), `packages/api-client/src/{index,availability}.ts`

**Interfaces:**

- Produces (kiểu, khớp DTO C# tương ứng): `AppointmentStatus`, `AppointmentBookingSource`, `MyAppointmentScope`, `MyAppointmentListItem`, `MyAppointment`, `MyAppointmentListParams`, `BookNowRequest`, `BookNowResult`, `BookAppointmentRequest`, `RescheduleAppointmentRequest`, `OrderAppointment` (bookings); `EntitlementStatus`, `CustomerPackageStatus`, `PurchasedService`, `PurchasedPackage`, `NextSession`, `PackageItemProgress`, `Purchases` (purchases); `TreatmentPlanStatus`, `TreatmentSessionStatus`, `StaffRef`, `SessionAppointment`, `MyTreatmentSession`, `MyTreatmentPlan` (treatments). `OrderDetail` thêm `appointment: OrderAppointment | null`.
- Produces (API): `AppointmentsApi` với `list(params, signal?)`, `get(id, signal?)`, `bookNow(body, idempotencyKey)`, `book(body)`, `reschedule(id, body)`, `cancel(id, reason)`; `appointmentsQueryKeys` = `{ all, list(params), detail(id) }`; `appointmentErrorCodes`. `PurchasesApi` với `list(signal?)`, `getPackage(id, signal?)`, `getService(id, signal?)`; `purchasesQueryKeys` = `{ all, list, package(id) }`; `purchaseErrorCodes`. `TreatmentsApi` với `get(id, signal?)`, `getSession(id, sessionId, signal?)`; `treatmentsQueryKeys` = `{ all, detail(id), session(id, sessionId) }`; `treatmentErrorCodes`. `AvailabilitySource = { spaServiceId: string } | { serviceEntitlementId: string } | { treatmentSessionId: string } | { appointmentId: string }`; `AvailabilityApi.forSource(source, date, staffMemberId?, signal?)`; `availabilityQueryKeys.source(source, date)`. Mã lỗi liệt kê đúng các mã trong spec.

- [ ] **Step 1: Viết test** (BKG-UI-T01, PUR-UI-T01) cạnh từng file API theo kiểu `orders.test.ts`: `list` gửi `scope`, `pageNumber`, `pageSize` qua query; `bookNow` gửi header `Idempotency-Key`; `book`, `reschedule`, `cancel` đúng body; `forSource` gửi đúng một khóa nguồn (`spaServiceId`, `serviceEntitlementId`, `treatmentSessionId` hoặc `appointmentId`) cùng `date` và `staffMemberId` khi có; `PurchasesApi` và `TreatmentsApi` đúng đường dẫn (id được `encodeURIComponent`); khóa truy vấn đúng dạng.
- [ ] **Step 2: Chạy** `npm run test --workspace @spa/api-client` → FAIL (module chưa có).
- [ ] **Step 3: Viết kiểu và API** theo Interfaces; đọc DTO C# để đặt đúng tên trường. `availability.ts` giữ `get(...)` hiện có.
- [ ] **Step 4: Chạy** test api-client và `npm run typecheck` → PASS.
- [ ] **Step 5: Commit** (khi được yêu cầu): `feat(api-client): add appointment, purchase and treatment APIs`.

---

### Task 2: Nền web: thời gian, nhãn, tham số, lỗi

**Files:**

- Create: `apps/web/src/lib/text.ts`, `features/bookings/{appointmentStatus,bookingParams,slots,errors}.ts`, `features/purchases/purchaseStatus.ts`, test cạnh từng file
- Modify: `apps/web/src/lib/formatting/vietnamTime.ts`, `features/services/catalogPolicies.ts` (+ test của `vietnamTime` nếu đã có)

**Interfaces:**

- Produces: `foldText(value: string): string` (chữ thường, bỏ dấu tiếng Việt, đ→d); `weekdayName(date: string): string` ("Thứ Hai"… "Chủ nhật"); `formatLongDate(date: string): string` ("Thứ Bảy, 19/10/2024"); `addMinutes(time: string, minutes: number): string` (`HH:mm`, không quá nửa đêm); `durationMinutes(startTime: string, endTime: string): number`. `catalogPolicies` thêm `maxBookingDaysAhead: 60`, `slotStepMinutes: 30`; `siteContact = { hotline: '1900 6886' }` (export riêng cùng file).
- `appointmentStatusBadge(status: AppointmentStatus): { label: string; tone: StatusTone }`, `purchaseStatusBadge`-họ hàm: `entitlementStatusBadge`, `packageStatusBadge`, `sessionStatusBadge` theo bảng nhãn của spec.
- `type BookingSource = { kind: 'service'; serviceId: string } | { kind: 'entitlement'; serviceEntitlementId: string } | { kind: 'session'; treatmentSessionId: string; treatmentPlanId?: string }`; `parseBookingParams(search: URLSearchParams): { ok: true; source: BookingSource; prefill: { date?: string; startTime?: string; staffMemberId?: string } } | { ok: false }`; `bookingPath(source: BookingSource, prefill?: { date?: string; startTime?: string; staffMemberId?: string }): string`.
- `anyStaffTimes(availability: Availability): string[]` (giờ bắt đầu không trùng, tăng dần); `hideElapsed(times: readonly string[], date: string, now: { date: string; time: string }): string[]` (chỉ ẩn khi `date === now.date`).
- `bookingErrorKind(error: unknown): 'slot_taken' | 'in_past' | 'too_soon' | 'staff' | 'session_too_early' | 'session_too_late' | 'not_eligible' | 'service_gone' | 'promotion' | 'amount_too_small' | 'change_window' | 'status_invalid' | 'not_found' | 'validation' | 'network' | 'other'`; `errorMessageOf(error: unknown): string | undefined` (thông điệp backend khi có).

- [ ] **Step 1: Viết test** cho từng hàm: `foldText('Đặt lịch Mẫu')` → `'dat lich mau'`; `weekdayName('2026-11-08')` → `'Chủ nhật'`; `addMinutes('14:30', 90)` → `'16:00'`; `parseBookingParams` (đúng một nguồn; hai nguồn, không nguồn, id không phải GUID đều `{ ok: false }`; `treatmentPlanId` tùy chọn; `date` sai định dạng bị bỏ qua); `bookingPath` khứ hồi với `parseBookingParams`; `anyStaffTimes` gộp và sắp xếp; `hideElapsed` chỉ ẩn khi hôm nay; `bookingErrorKind` cho từng mã trong spec (409 `slot_unavailable`, `customer_busy`, `outside_work_schedule` đều là `slot_taken`).
- [ ] **Step 2: Chạy** `npm run test --workspace @spa/web -- src/lib src/features/bookings src/features/purchases` → FAIL.
- [ ] **Step 3: Cài đặt** theo Interfaces.
- [ ] **Step 4: Chạy** lại, `npm run typecheck` → PASS.
- [ ] **Step 5: Commit** (khi được yêu cầu): `feat(web): add booking and purchase foundations`.

---

### Task 3: Gói của tôi: hook, lọc và danh sách (SCR-W16)

**Files:**

- Create: `features/purchases/filter.ts`, `hooks/usePurchases.ts`, `components/{MyPackagesView,PackageCard,ServiceEntitlementCard}.tsx`, `index.ts`, `pages/customer/MyPackagesPage.tsx`, test cạnh từng file
- Modify: `app/router.tsx` (`customerPages['/my-packages']`)

**Interfaces:**

- Consumes: `PurchasesApi`, `purchasesQueryKeys`, `foldText`, `packageStatusBadge`, `entitlementStatusBadge`, `bookingPath`, `OrderDetailSheet` (từ `@/features/orders`, thêm export nếu chưa có), `callApi`.
- Produces: `type PurchaseFilter = 'all' | 'active' | 'completed' | 'expired' | 'cancelled'`; `type PurchaseSort = 'recent' | 'expiring'`; `filterPurchases(purchases: Purchases, options: { filter: PurchaseFilter; query: string; sort: PurchaseSort }): { packages: PurchasedPackage[]; services: PurchasedService[]; counts: Record<PurchaseFilter, number> }` (số đếm tính trước khi lọc theo chip, sau khi tìm kiếm không áp dụng; "Đang dùng" = gói `active` và quyền `available`/`booked`; "Hoàn thành" = gói `completed` và quyền `used`; "Hết hạn" = `expired`); `daysLeft(expiresAtUtc: string | null, now?: Date): number | null`; `usePurchases()`; `MyPackagesView()`.

- [ ] **Step 1: Viết test** `filter.test.ts` (PUR-UI-T06: số đếm đúng, từng chip lọc đúng nhóm, tìm không phân biệt dấu, "expiring" đưa hạn null xuống cuối) và `MyPackagesView.test.tsx` (PUR-UI-T02 đến T05, T07): 4 trạng thái; rỗng hẳn có "Khám phá dịch vụ" và "Xem gói liệu trình"; rỗng do lọc có "Xem tất cả"; thẻ gói hiện tên, nhãn, "{used}/{total} buổi", thanh `progressbar` đúng `aria-valuenow`, "Còn {total − used} buổi", hạn và "Còn N ngày", dòng buổi kế tiếp kèm `earliestDate`, "Đơn {code}" mở chi tiết đơn; nút "Đặt lịch buổi tiếp theo" chỉ khi `nextSession.canBook`, link có `treatmentSessionId` và `treatmentPlanId`, ẩn kèm lý do khi hết hạn, hoàn thành, hủy hoặc `canBook = false`; thẻ dịch vụ lẻ: "Đặt lịch" theo `canBook`, `booked` có "Xem lịch hẹn" tới `/my-bookings/{id}`, hạn null là "Không giới hạn"; `?filter=`, `?q=`, `?sort=` trên URL, giá trị lạ bị bỏ qua.
- [ ] **Step 2: Chạy** → FAIL.
- [ ] **Step 3: Cài đặt** `filter.ts`, hook (`staleTime` mặc định, bỏ retry khi 4xx như `ordersRetry`), các thẻ và trang; thêm route vào `customerPages`. Layout thẻ theo mục SCR-W16 của spec (hộp ba chỉ số, chip, ô tìm, chọn sắp xếp).
- [ ] **Step 4: Chạy** `npm run test --workspace @spa/web -- src/features/purchases src/app` → PASS.
- [ ] **Step 5: Commit** (khi được yêu cầu): `feat(web): add my packages page (UC-SPA-18)`.

---

### Task 4: Chi tiết gói và nhật ký liệu trình

**Files:**

- Create: `features/purchases/hooks/{usePurchasedPackage,useTreatmentPlan,useTreatmentSession}.ts`, `components/{MyPackageDetailView,SessionJournal,SessionResultDialog}.tsx`, `pages/customer/MyPackageDetailPage.tsx`, test cạnh từng file
- Modify: `app/routes.ts` (`['/my-packages/:packageId', 'Chi tiết gói của tôi']`), `app/router.tsx`, `features/purchases/index.ts`

**Interfaces:**

- Consumes: `PurchasesApi.getPackage`, `TreatmentsApi.get/getSession`, `sessionStatusBadge`, `bookingPath`, `formatLongDate`.
- Produces: `usePurchasedPackage(id)`, `useTreatmentPlan(planId: string | undefined)` (chỉ chạy khi có id), `useTreatmentSession(planId, sessionId, enabled)`; `MyPackageDetailView({ packageId })`.

- [ ] **Step 1: Viết test** (PUR-UI-T08, T09, T10): gọi `/me/purchases/packages/{id}` rồi `/me/treatments/{planId}`; thẻ đầu trang có chỉ số, `goal`, nút "Đặt lịch buổi tiếp theo (Buổi n)" theo `nextSession.canBook`; `Alert` hiện `statusReason` khi liệu trình tạm dừng; mỗi buổi hiện đúng dòng theo trạng thái (`completed`: ngày, kỹ thuật viên, thời lượng và nút "Xem ghi chú trị liệu"; `booked`: giờ và link `/my-bookings/{appointment.id}`; `not_booked`: nút "Đặt lịch buổi này" khi `canBook` với `treatmentPlanId`, không thì `reason`; `skipped`); "Xem ghi chú trị liệu" gọi chi tiết buổi và hiện `result` hoặc "Chưa có ghi chú"; `404 customer_package_not_found` và `404 treatment_plan_not_found` hiện "Không tìm thấy gói"; route yêu cầu khách và mục "Gói của tôi" được đánh dấu trong menu.
- [ ] **Step 2: Chạy** → FAIL.
- [ ] **Step 3: Cài đặt** theo mục "Chi tiết gói và nhật ký liệu trình" của spec (breadcrumb, "Quay lại danh sách gói", ba chỉ số).
- [ ] **Step 4: Chạy** test feature và `src/app` → PASS.
- [ ] **Step 5: Commit** (khi được yêu cầu): `feat(web): add package detail with treatment journal`.

---

### Task 5: Hook đặt lịch và nguồn đặt lịch

**Files:**

- Create: `features/bookings/hooks/{useAvailability,useBookingSource,useMyAppointments,useMyAppointment,useBookNow,useBookAppointment,useRescheduleAppointment,useCancelAppointment}.ts`, test cạnh `useBookingSource`
- Modify: `features/bookings/index.ts`

**Interfaces:**

- Produces: `useAvailability(source: AvailabilitySource | null, date: string | null, staffMemberId?: string)` (`Availability`, giữ dữ liệu cũ khi đổi ngày); `type ResolvedSource = { kind: 'service' | 'entitlement' | 'session'; name: string; durationMinutes: number; spaServiceId: string; packageName?: string; sequenceNumber?: number; totalSessions?: number; expiresAtUtc?: string | null; canBook: boolean; reason?: string | null; earliestDate?: string | null; price?: number }`; `useBookingSource(source: BookingSource): { data?: ResolvedSource; isPending: boolean; error: unknown }` (service: `GET /services/{id}` qua `catalogQueryKeys.service`; session có `treatmentPlanId`: `GET /me/treatments/{planId}`; thiếu `treatmentPlanId` hoặc không thấy buổi: `GET /me/purchases` tìm `nextSession.id`; entitlement: `GET /me/purchases`; không thấy thì ném lỗi có `status = 404` mã `entitlement_not_found`); `useMyAppointments(params)`, `useMyAppointment(id)`; mutation `useBookNow()` nhận `{ body: BookNowRequest; idempotencyKey: string }`, `useBookAppointment()` nhận `BookAppointmentRequest`, `useRescheduleAppointment()` nhận `{ id: string; body: RescheduleAppointmentRequest }`, `useCancelAppointment()` nhận `{ id: string; reason: string }`. Mỗi mutation làm mới đúng các khóa ở Global Constraints.

- [ ] **Step 1: Viết test** `useBookingSource.test.tsx` (BKG-UI-T08, Review Focus 4): session với `treatmentPlanId` lấy từ `/me/treatments/{planId}` và có `sequenceNumber`, `totalSessions`; thiếu `treatmentPlanId` dùng `/me/purchases`; id không còn trong `nextSession` thì lỗi `entitlement_not_found`; entitlement lấy `serviceName`, `durationMinutes`; service lấy `name`, `price`, `durationMinutes`.
- [ ] **Step 2: Chạy** → FAIL.
- [ ] **Step 3: Cài đặt** các hook.
- [ ] **Step 4: Chạy** test và `npm run typecheck` → PASS.
- [ ] **Step 5: Commit** (khi được yêu cầu): `feat(web): add booking hooks`.

---

### Task 6: Dải ngày và danh sách giờ theo kỹ thuật viên

**Files:**

- Create: `features/bookings/components/{DateStrip,StaffSlotPicker}.tsx`, test cạnh từng file

**Interfaces:**

- Produces: `DateStrip({ value, onChange, minDate, maxDate }: { value: string | null; onChange(date: string): void; minDate: string; maxDate: string })` (7 ngày mỗi trang, "Tuần trước" và "Tuần sau" bị vô hiệu ngoài `[minDate, maxDate]`, ngày là nút `aria-pressed`); `StaffSlotPicker({ availability, date, selected, onSelect, currentStaffId?, now }: { availability: Availability; date: string; selected: { startTime: string; staffMemberId?: string } | null; onSelect(slot: { startTime: string; staffMemberId?: string }): void; currentStaffId?: string; now: { date: string; time: string } })` (hàng "Kỹ thuật viên bất kỳ" đầu tiên không gửi `staffMemberId`; hàng từng người gửi `staffMemberId`; hôm nay ẩn giờ đã qua; không còn giờ nào thì "Ngày này đã kín lịch"; hàng của `currentStaffId` có nhãn "Đang là kỹ thuật viên của lịch này").

- [ ] **Step 1: Viết test** (BKG-UI-T03, T04, T05, Review Focus 2): `DateStrip` không cho chọn ngoài khoảng, tuần đầu bắt đầu từ `minDate`; `StaffSlotPicker` gộp giờ không trùng ở hàng bất kỳ; chọn giờ ở hàng bất kỳ gọi `onSelect({ startTime })`, ở hàng một người gọi `onSelect({ startTime, staffMemberId })`; giờ trước `now.time` bị ẩn khi `date === now.date` và hiển thị đủ ngày khác; ngày không còn giờ hiện thông báo kín lịch; giờ đang chọn có `aria-pressed`.
- [ ] **Step 2: Chạy** → FAIL.
- [ ] **Step 3: Cài đặt** hai component thuần trình bày (không gọi API), dùng `anyStaffTimes`, `hideElapsed`.
- [ ] **Step 4: Chạy** test → PASS.
- [ ] **Step 5: Commit** (khi được yêu cầu): `feat(web): add date strip and staff slot picker`.

---

### Task 7: Trang đặt lịch: nguồn, chọn giờ, thẻ tóm tắt (`/booking/new`)

**Files:**

- Create: `features/bookings/components/{BookingView,BookingSummaryCard}.tsx`, `pages/customer/BookingPage.tsx`, test `BookingView.test.tsx`
- Modify: `app/routes.ts` (`['/booking/new', 'Đặt lịch hẹn']`), `app/router.tsx` (`standalonePaths` thêm `/booking/new`, `customerPages`), `config/navigation.ts` (loại `/booking/new` khỏi menu)

**Interfaces:**

- Consumes: Task 2, 5, 6; `useOrderPreview` và `PromotionField` từ `@/features/orders`; `useCustomerAction`-style đăng nhập đã có qua `RouteGuard`.
- Produces: `BookingView({ search }: { search: URLSearchParams })`; `BookingSummaryCard(props: { source: ResolvedSource; date: string | null; slot: { startTime: string; staffMemberId?: string } | null; staffName?: string; flow: 'book_now' | 'entitlement'; preview?: OrderPreview; promotion?: ReactNode; error?: string; submitting: boolean; disabled: boolean; onConfirm(): void })`.

- [ ] **Step 1: Viết test** (BKG-UI-T02, T03, T04, T05, T08, Review Focus 4): query sai (không nguồn, hai nguồn, không phải GUID) hiện "Liên kết đặt lịch không hợp lệ" và không gọi API; luồng 1 tải dịch vụ và giờ trống, thẻ phải hiện giá và tổng từ `preview`; luồng 2 hiện "Buổi n/tổng", dòng "Khấu trừ từ gói", "Tổng thanh toán hôm nay: 0 đ", dòng "Giá niêm yết" ẩn khi `GET /services/{id}` lỗi; `canBook = false` hiện `reason` và vô hiệu việc chọn giờ; dải ngày bắt đầu từ `earliestDate` và dừng ở hôm nay + 60; điền sẵn `date`, `startTime`, `staffMemberId` từ URL; lỗi tải giờ có "Thử lại" riêng; nút xác nhận chỉ bật sau khi chọn giờ; khách vãng lai đi qua đăng nhập (route test ở Task 14).
- [ ] **Step 2: Chạy** → FAIL.
- [ ] **Step 3: Cài đặt** trang một cột chính + cột phải dính (dưới `lg` thanh dính ở đáy chứa giờ đã chọn và nút), breadcrumb, thẻ nguồn; chưa nối mutation (nút gọi `onConfirm` do Task 8 gắn).
- [ ] **Step 4: Chạy** test feature và `src/app` → PASS.
- [ ] **Step 5: Commit** (khi được yêu cầu): `feat(web): add booking page`.

---

### Task 8: Trang đặt lịch: xác nhận, `Idempotency-Key`, thanh toán và lỗi

**Files:**

- Create: `features/bookings/components/BookingConflictDialog.tsx`
- Modify: `features/bookings/components/BookingView.tsx`, `BookingView.test.tsx`

**Interfaces:**

- Consumes: `useBookNow`, `useBookAppointment`, `useStartPayment` và `redirectTo` (từ `@/features/payments`), `newUuid`, `bookingErrorKind`, `checkoutPath`.
- Produces: hành vi xác nhận theo bảng "Hành động và làm mới" và "Mã lỗi → xử lý" của spec; `BookingConflictDialog({ open, onChoose })` ("Giờ vừa hết chỗ", nút "Chọn giờ khác").

- [ ] **Step 1: Viết test** (BKG-UI-T06, T07, T09, Review Focus 1 và 5): luồng 1 gọi `POST /me/appointments/book-now` kèm `Idempotency-Key` UUID rồi `POST /me/orders/{id}/payments { client: 'web' }` rồi `redirectTo(paymentUrl)` (mock `@/features/payments/redirect`); bấm đúp chỉ một `book-now`; gửi lại sau lỗi mạng dùng cùng khóa, đổi mã khuyến mãi thì khóa mới; tạo thanh toán `503` thì chuyển `/checkout?orderId=` và không có `book-now` thứ hai; `order.status = 'paid'` đi thẳng `/booking/success?appointmentId=`; luồng 2 gọi `POST /me/appointments` rồi `/booking/success`; từng loại lỗi: `slot_unavailable`/`customer_busy`/`outside_work_schedule` mở hộp thoại và tải lại giờ, `appointment_in_past`, `slot_too_soon`, `staff_not_qualified`, `session_too_early` (hiện `message`), `entitlement_not_eligible`, `service_not_found`, `promotion_invalid` (lỗi dưới ô mã), `order_amount_too_small`, `validation_error`, mất kết nối.
- [ ] **Step 2: Chạy** → FAIL.
- [ ] **Step 3: Cài đặt** xác nhận và xử lý lỗi (khóa idempotency giữ trong `useRef` theo chữ ký nội dung như `CheckoutView`; giữ `busy` sau khi thành công để không gửi lần hai).
- [ ] **Step 4: Chạy** test feature → PASS.
- [ ] **Step 5: Commit** (khi được yêu cầu): `feat(web): confirm bookings and handle conflicts`.

---

### Task 9: Đặt lịch thành công

**Files:**

- Create: `features/bookings/components/BookingSuccessView.tsx`, `pages/customer/BookingSuccessPage.tsx`, test cạnh file
- Modify: `app/routes.ts` (`['/booking/success', 'Đặt lịch thành công']`), `app/router.tsx` (`standalonePaths`, `customerPages`), `config/navigation.ts`

**Interfaces:**

- Consumes: `useMyAppointment`, `usePurchasedPackage`, `formatLongDate`, `siteContact`.
- Produces: `BookingSuccessView({ search }: { search: URLSearchParams })`.

- [ ] **Step 1: Viết test** (BKG-UI-T10, Review Focus 2): thiếu hoặc sai `appointmentId` hiện "Không tìm thấy lịch hẹn"; lịch `confirmed` hiện tiêu đề, ngày, giờ, kỹ thuật viên, tiến độ gói khi có `treatmentSession` (lỗi tải tiến độ thì ẩn); lịch `held`, `cancelled` hoặc `hold_expired` điều hướng sang `/my-bookings/{id}`; thẻ "Lưu ý" có "24 giờ" và hotline; liên kết "Xem lịch hẹn của tôi".
- [ ] **Step 2: Chạy** → FAIL.
- [ ] **Step 3: Cài đặt** theo mục "Đặt lịch thành công" của spec.
- [ ] **Step 4: Chạy** test feature và `src/app` → PASS.
- [ ] **Step 5: Commit** (khi được yêu cầu): `feat(web): add booking success page`.

---

### Task 10: Nối các nút "Đặt lịch" đang để tạm và trang kết quả thanh toán

**Files:**

- Modify: `features/services/components/{ServiceDetailView,ServiceCard}.tsx`, `features/bookings/components/NextAvailableSlots.tsx`, `features/orders/components/PaymentResultView.tsx`, `packages/shared-types/src/orders.ts` (nếu chưa có ở Task 1), các test tương ứng

**Interfaces:**

- Consumes: `bookingPath`, `useCustomerAction`.
- Produces: `ServiceDetailView` "Đặt lịch ngay" và `ServiceCard` "Đặt lịch" dẫn tới `bookingPath({ kind: 'service', serviceId })`; mỗi giờ của `NextAvailableSlots` dẫn tới cùng đường dẫn kèm `date` và `startTime`; `PaymentResultView` hiện khối "Lịch hẹn" (ngày, giờ, kỹ thuật viên, trạng thái) khi `order.appointment` có giá trị, nút "Xem lịch hẹn" → `/booking/success?appointmentId=` khi đơn `paid`, dòng "Chỗ giữ đã hết hạn, hãy đặt lại" khi lịch `hold_expired`; nút "Đặt lịch" của đơn `paid` dẫn `/my-packages`.

- [ ] **Step 1: Viết test** (BKG-UI-T11, T18): bỏ `ComingSoonButton` "Đặt lịch ngay"; khách vãng lai bấm đi `/login?redirect=` giữ nguyên query, khách đi `/booking/new?serviceId=…`; chủ spa không thấy nút; giờ trống gần nhất mang `date`, `startTime`; trang kết quả có khối lịch hẹn cho đơn đặt ngay.
- [ ] **Step 2: Chạy** → FAIL.
- [ ] **Step 3: Cài đặt** (dùng `useCustomerAction` đã có cho việc đăng nhập).
- [ ] **Step 4: Chạy** `npm run test --workspace @spa/web -- src/features` → PASS.
- [ ] **Step 5: Commit** (khi được yêu cầu): `feat(web): link service pages and payment result to booking`.

---

### Task 11: Lịch hẹn của tôi: danh sách (SCR-W14)

**Files:**

- Create: `features/bookings/components/{MyAppointmentsView,AppointmentCard}.tsx`, `pages/customer/MyAppointmentsPage.tsx`, test cạnh từng file
- Modify: `app/router.tsx` (`customerPages['/my-bookings']`), `features/bookings/index.ts`

**Interfaces:**

- Consumes: `useMyAppointments`, `appointmentStatusBadge`, `durationMinutes`, `formatLongDate`, `SimplePager`, `catalogPolicies.customerChangeCutoffHours`.
- Produces: `MyAppointmentsView()`; `AppointmentCard({ appointment, onReschedule, onCancel }: { appointment: MyAppointmentListItem; onReschedule(a: MyAppointmentListItem): void; onCancel(a: MyAppointmentListItem): void })`.

- [ ] **Step 1: Viết test** (BKG-UI-T12, T13): đủ 4 trạng thái; ba tab **không có số đếm**, gửi `scope`, giữ `?scope=` và `?page=`, đổi tab về trang 1, `scope` lạ bị bỏ qua; rỗng theo từng nhóm có chữ riêng và "Đặt lịch hẹn" ở nhóm sắp tới; thẻ hiện thứ ngày, giờ và "(n phút)", tên dịch vụ, kỹ thuật viên, nhãn "LIỆU TRÌNH {tên gói} · BUỔI {n}" khi có `treatmentSession`; "Đổi giờ hẹn" và "Hủy lịch" theo `canReschedule`/`canCancel`; dòng nhắc 24 giờ chỉ khi còn đổi được; lịch `held` hiện giờ giữ chỗ và "Xem và thanh toán"; phân trang gửi `pageNumber`.
- [ ] **Step 2: Chạy** → FAIL.
- [ ] **Step 3: Cài đặt** thẻ lớn cho nhóm sắp tới và thẻ gọn cho nhóm đã qua, đã hủy (theo spec); nút "Đặt lịch hẹn mới" ở đầu trang.
- [ ] **Step 4: Chạy** test feature và `src/app` → PASS.
- [ ] **Step 5: Commit** (khi được yêu cầu): `feat(web): add my appointments page (UC-SPA-16)`.

---

### Task 12: Chi tiết lịch hẹn (SCR-W15)

**Files:**

- Create: `features/bookings/components/AppointmentDetailView.tsx`, `pages/customer/MyAppointmentDetailPage.tsx`, test cạnh file
- Modify: `app/router.tsx` (`customerPages['/my-bookings/:bookingId']`)

**Interfaces:**

- Consumes: `useMyAppointment`, `useCountdown`, `checkoutPath`.
- Produces: `AppointmentDetailView({ appointmentId, onReschedule, onCancel }: { appointmentId: string; onReschedule(a: MyAppointment): void; onCancel(a: MyAppointment): void })` (hai hộp thoại do Task 13 gắn).

- [ ] **Step 1: Viết test** (BKG-UI-T14): hiện dịch vụ, ngày giờ, kỹ thuật viên, nguồn (dịch vụ đã mua, "Buổi n · tên gói" tới `/my-packages/{customerPackageId}`, đặt ngay kèm mã đơn); "Có thể đổi hoặc hủy đến {hạn}" khi còn đổi được, câu "Đã quá hạn đổi hoặc hủy" khi hết; `held` có đếm ngược (giờ giả) và nút "Thanh toán ngay" tới `/checkout?orderId=` khi `order.status = 'pending_payment'`; `hold_expired` có "Đặt lại"; `cancelled` hiện thời điểm và lý do; nút Đổi giờ hẹn, Hủy lịch theo cờ; `404` hiện "Không tìm thấy lịch hẹn".
- [ ] **Step 2: Chạy** → FAIL.
- [ ] **Step 3: Cài đặt** theo mục SCR-W15 của spec.
- [ ] **Step 4: Chạy** test feature và `src/app` → PASS.
- [ ] **Step 5: Commit** (khi được yêu cầu): `feat(web): add appointment detail page`.

---

### Task 13: Đổi lịch và hủy lịch

**Files:**

- Create: `features/bookings/components/{RescheduleDialog,CancelAppointmentDialog}.tsx`, `features/bookings/schemas.ts` (`cancelAppointmentSchema`), test cạnh từng file
- Modify: `MyAppointmentsView.tsx`, `AppointmentDetailView.tsx` hoặc trang chi tiết (gắn hai hộp thoại), test liên quan

**Interfaces:**

- Consumes: `DateStrip`, `StaffSlotPicker`, `useAvailability({ appointmentId })`, `useRescheduleAppointment`, `useCancelAppointment`, `bookingErrorKind`.
- Produces: `RescheduleDialog({ appointment, onClose }: { appointment: { id: string; staff: AppointmentStaff } | null; onClose(): void })`; `CancelAppointmentDialog({ appointment, onClose }: { appointment: { id: string } | null; onClose(): void })`; `cancelAppointmentSchema` (lý do cắt khoảng trắng, 1 đến 500 ký tự, thông báo "Vui lòng nhập lý do hủy." và "Lý do hủy tối đa 500 ký tự.").

- [ ] **Step 1: Viết test** (BKG-UI-T15, T16, Review Focus 3): đổi lịch gọi `availability?appointmentId=` và gửi `{ date, startTime, staffMemberId? }`; `slot_unavailable` tải lại giờ; `change_window_passed` đóng hộp thoại, toast nêu `message` và tải lại danh sách; `appointment_status_invalid` đóng và tải lại; `session_too_early`, `session_too_late`, `entitlement_not_eligible` hiện `Alert` trong hộp thoại; thành công toast "Đã đổi lịch", đóng và làm mới; hủy: lý do bắt buộc và tối đa 500, gửi `{ reason }` đã cắt khoảng trắng, `change_window_passed` hiện thông điệp trong hộp thoại và tải lại lịch, `appointment_status_invalid` thông báo "không còn ở trạng thái có thể hủy", thành công làm mới `appointments`, `purchases`, `treatments`.
- [ ] **Step 2: Chạy** → FAIL.
- [ ] **Step 3: Cài đặt** hai hộp thoại và gắn vào danh sách và chi tiết.
- [ ] **Step 4: Chạy** test feature → PASS.
- [ ] **Step 5: Commit** (khi được yêu cầu): `feat(web): reschedule and cancel appointments`.

---

### Task 14: Route, menu, hotline và kiểm tra khung

**Files:**

- Modify: `app/routes.ts`, `app/router.tsx`, `config/navigation.ts`, `components/layout/AccountLayout/AccountSideNav.tsx`, `app/customerLayouts.test.tsx`, `app/customerRoutes.test.tsx`, `test/app.test.tsx` (danh sách trang đã làm)

**Interfaces:**

- Consumes: `siteContact` (Task 2).
- Produces: hotline ở thẻ "Cần tư vấn?" của menu tài khoản (ví dụ "Hotline: 1900 6886"); `/my-bookings`, `/my-bookings/:bookingId`, `/my-packages`, `/my-packages/:packageId` trong khung "Trang của tôi"; `/booking/new`, `/booking/success` trong khung header không có menu tài khoản; menu không có hai route `/booking/*`.

- [ ] **Step 1: Viết test** (BKG-UI-T17, PUR-UI-T10): `/booking/new` và `/booking/success` có header nhưng không có `navigation` "Menu tài khoản"; bốn route kia có menu và mục tương ứng `aria-current="page"` (`/my-packages/:packageId` đánh dấu "Gói của tôi"); chưa đăng nhập thì sang `/login?redirect=` giữ query; chủ spa sang `/forbidden`; thẻ trợ giúp có hotline; `navigation.customer` không chứa `/booking/new`, `/booking/success`.
- [ ] **Step 2: Chạy** → FAIL cho phần còn thiếu.
- [ ] **Step 3: Hoàn thiện** route, menu (đánh dấu theo tiền tố đường dẫn cho `/my-packages/:packageId`), hotline.
- [ ] **Step 4: Chạy** `npm run test --workspace @spa/web -- src/app src/test` → PASS.
- [ ] **Step 5: Commit** (khi được yêu cầu): `feat(web): wire booking routes and hotline`.

---

### Task 15: Kiểm tra cuối và tài liệu

**Files:**

- Modify: `docs/frontend.md` (route mới, mục "Đặt lịch, lịch hẹn và gói của tôi"), `docs/progress.md` (UC-SPA-15, 16, 18: web ✅), `docs/specs/bookings.md` và `purchases-treatments.md` (nếu có lệch), `apps/web/src/features/bookings/README.md`

- [ ] **Step 1:** `npx prettier --write` các file đã sửa (không dùng `npm run format`), rồi `npm run lint`, `npm run typecheck`, `npm run test`, `npm run format:check`, `npm run web:build` → tất cả xanh.
- [ ] **Step 2: Kiểm tra tay** (cần `npm run db:up`, `npm run db:seed:demo`, `npm run dev`, mở web bằng đúng IP in ra, không dùng `localhost`): đăng nhập tài khoản demo; từ "Gói của tôi" đặt một buổi bằng gói (luồng 2) và xem trang thành công; đổi lịch và hủy lịch (kiểm tra quy tắc 24 giờ bằng dữ liệu demo); đặt ngay một dịch vụ lẻ và thanh toán VNPay sandbox (cẩn thận: tạo đơn thật trong DB dev); 4 trạng thái, 320px, bàn phím. Ghi rõ phần nào không chạy được.
- [ ] **Step 3: Cập nhật tài liệu** và báo cáo kết quả (kèm phần chưa kiểm tra được).
- [ ] **Step 4: Commit** (khi được yêu cầu): `docs(bookings): add web notes for booking, appointments and packages`.

---

## Self-review (đã chạy)

- **Phủ spec:** hợp đồng (T1); nền và nhãn (T2); Gói của tôi (T3); chi tiết gói và nhật ký (T4); nguồn, dải ngày, giờ, thẻ tóm tắt, xác nhận và lỗi (T5 đến T8); thành công (T9); nối nút tạm và trang kết quả (T10); danh sách, chi tiết, đổi, hủy (T11 đến T13); route, menu, hotline (T14); tài liệu và kiểm tra (T15). Test `BKG-UI-T01..T18` và `PUR-UI-T01..T10` ánh xạ: T01→T1; T02,T03,T04,T05→T6,T7; T06,T07,T09→T8; T08→T5,T7; T10→T9; T11,T18→T10; T12,T13→T11; T14→T12; T15,T16→T13; T17→T14; PUR T01→T1; T02..T07→T3; T08,T09→T4; T10→T14.
- **Nhất quán kiểu:** `BookingSource`, `ResolvedSource`, `AvailabilitySource`, `bookingPath`, `parseBookingParams`, `anyStaffTimes`, `hideElapsed`, `bookingErrorKind` dùng cùng tên ở mọi task.
- **Điều chỉnh so với spec:** bỏ số đếm trên tab lịch hẹn (đã duyệt); `catalogPolicies` thêm `siteContact` thay vì một endpoint cấu hình.
- **Cân đối:** kế hoạch có 15 task, tương ứng khoảng 3 màn dữ liệu chính cộng 3 trang phụ; các bảng lỗi và bố cục nằm trong spec, plan chỉ tham chiếu.

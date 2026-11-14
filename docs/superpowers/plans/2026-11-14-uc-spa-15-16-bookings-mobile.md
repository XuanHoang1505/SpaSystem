# Kế hoạch triển khai: UC-SPA-15 & UC-SPA-16 Mobile (Đặt lịch hẹn & Quản lý lịch hẹn cá nhân)

- **Use Cases:** `UC-SPA-15` (Đặt lịch hẹn) & `UC-SPA-16` (Xem và quản lý lịch hẹn cá nhân)
- **Nền tảng:** Mobile (`apps/mobile` — Expo SDK 57, React Native 0.86, Expo Router 57)
- **Màn hình:**
  - `SCR-M18` — Đặt lịch hẹn (`/booking/new` — Standalone Stack Screen)
  - `SCR-M18b` — Đặt lịch thành công (`/booking/success` — Standalone Stack Screen)
  - `SCR-M11` — Lịch hẹn của tôi (`/(customer)/bookings` — Customer Tab)
  - `SCR-M12` — Chi tiết lịch hẹn (`/(customer)/bookings/[bookingId]` — Customer Tab Stack)
  - Cập nhật `SCR-M19c` (`PaymentResultScreen`) & `SCR-M02/M03` (`ServiceCard`, `ServiceDetailScreen`)
- **Ngày lập:** 14/11/2026
- **Tài liệu đặc tả:** [docs/specs/bookings.md](file:///e:/UTE/HK126/Code/SpaSystem/docs/specs/bookings.md#L703-L944)
- **Kỹ năng áp dụng:** [implement-fe](file:///e:/UTE/HK126/Code/SpaSystem/.claude/skills/implement-fe/SKILL.md)
- **Ghi chú Stitch (Bước 3b):** Không có MCP `stitch` khả dụng trong môi trường, dựng trực tiếp theo đặc tả trong `docs/specs/bookings.md` và hệ thống thiết kế `@theme/index`.

---

## Global Constraints & Architectural Rules

1. **Tuân thủ quy ước kiến trúc & Glossary:**
   - Mã nguồn đặt trong `apps/mobile/src/features/bookings/` với cấu trúc chuẩn: `components/`, `hooks/`, `schemas.ts`, `screens/`, `index.ts`.
   - Dùng named export cho mọi component, screen, hook và helper; tuyệt đối không dùng `any`, `@ts-ignore`, `as unknown as`.
2. **UI & Theme Tokens Mobile:**
   - Dùng `AppScreen` kết hợp các primitive `AppText`, `AppButton`, `AppInput`, `AppNotice`, `AppTextButton`.
   - Toàn bộ màu sắc, bo góc và khoảng cách lấy từ `@theme/index` (`colors`, `radius`, `spacing`, `typography`).
   - Vùng chạm (touch target) của mọi nút bấm, ngày, khung giờ, icon thao tác phải $\ge 48 \times 48\text{dp}$ (`hitSlop={8}`).
   - Có đầy đủ `accessibilityRole="button"`, `accessibilityLabel`, khai báo `accessibilityState={{ selected, disabled }}`.
3. **Bố cục Standalone vs Customer Tabs:**
   - Các màn hình quy trình đặt lịch có thanh công cụ cố định ở đáy (`/booking/new`, `/booking/success`) đặt tại Root Stack (`apps/mobile/app/booking/new.tsx`, `apps/mobile/app/booking/success.tsx`) và đăng ký `Stack.Screen name="booking" options={{ headerShown: false }}` trong `apps/mobile/app/_layout.tsx` để không bị đụng thanh Bottom Tab Bar của `(customer)`.
   - Màn hình danh sách và chi tiết lịch hẹn nằm trong tab **Lịch hẹn** (`apps/mobile/app/(customer)/bookings/index.tsx` và `[bookingId].tsx`).
4. **Data Flow & Mutation:**
   - Gọi API theo luồng chặt chẽ: `AppointmentsApi`, `AvailabilityApi`, `PurchasesApi`, `TreatmentsApi` (`@spa/api-client`) $\rightarrow$ wrapper trong `apps/mobile/src/lib/api/` $\rightarrow$ hook TanStack Query $\rightarrow$ component/screen. Component không gọi `fetch` trực tiếp.
   - Sau mutation (`bookNow`, `book`, `reschedule`, `cancel`), bắt buộc `invalidateQueries` đúng các key liên quan (`appointmentsQueryKeys.all`, `availabilityQueryKeys.all`, `ordersQueryKeys.all`, `purchasesQueryKeys.all`, `treatmentsQueryKeys.all`).
5. **Xử lý lỗi theo Mã lỗi Backend (`appointmentErrorCodes`):**
   - Phân nhánh xử lý lỗi dựa trên `errorCodeOf(error)` (`ApiClientError.errors[0]?.code`), tuyệt đối không so khớp chuỗi `error.message`.
   - Đảm bảo đủ 4 trạng thái (đang tải, lỗi + nút thử lại, rỗng + hướng dẫn/CTA, có dữ liệu) trên mọi màn hình và vùng dữ liệu.
6. **Format, Múi giờ & Tiền tệ:**
   - Văn bản tiếng Việt có dấu đầy đủ; tiền tệ định dạng `vi-VN` (`formatCurrency`).
   - Ngày lịch hẹn (`yyyy-MM-dd`) và giờ (`HH:mm`) đã là giờ địa phương Việt Nam (`Asia/Ho_Chi_Minh`, ADR-0003) — hiển thị qua `formatLocalDate`, `formatLocalTime`, không đổi múi giờ hai lần. Các mốc `...AtUtc` hiển thị qua `formatDateTimeUtc` / `formatTimeUtc`.
7. **TDD & Kiểm thử:**
   - Viết unit/integration test với Jest + Testing Library Native cho API wrapper, helpers, screens và modals.
   - Kiểm tra nghiêm ngặt `npm run typecheck --workspace @spa/mobile` (0 lỗi) và `npm run test --workspace @spa/mobile` (toàn bộ test suites pass).
8. **Git Rule:**
   - Không tự ý chạy `git commit` hay `git push` trừ khi người dùng yêu cầu. Không stage/commit các file test (`*.test.ts`, `*.test.tsx`).

---

## Danh sách Task chi tiết

### Task 1: Mobile API Wrappers (`appointments`, `availability`, `purchases`, `treatments`)
- **Mục tiêu:** Tạo các module truy cập API client đã gắn Bearer token cho mobile tương tự `apps/mobile/src/lib/api/orders.ts`.
- **Files tạo/cập nhật:**
  - `apps/mobile/src/lib/api/appointments.ts`:
    - `getAppointmentsApi()`, `callAppointments<T>()`
    - `getAvailabilityApi()`, `callAvailability<T>()`
    - `getPurchasesApi()`, `callPurchases<T>()`
    - `getTreatmentsApi()`, `callTreatments<T>()`
    - Re-export `appointmentsQueryKeys`, `availabilityQueryKeys`, `purchasesQueryKeys`, `treatmentsQueryKeys`, `appointmentErrorCodes`.
  - `apps/mobile/src/lib/api/appointments.test.ts`: Kiểm thử `BKG-M-UI-T01`.
- **Verification:** `npm run typecheck --workspace @spa/mobile` & Jest test `appointments.test.ts`.

### Task 2: Schemas, Helpers xử lý ngày giờ VN & Khung giờ trống (`schemas.ts`, `bookingHelpers.ts`)
- **Mục tiêu:** Xây dựng Zod schemas và các hàm thuần (pure functions) xử lý:
  - Phân tích và kiểm tra tham số nguồn đặt lịch (`parseBookingSourceParams`: chỉ nhận đúng 1 trong 3 nguồn `serviceId`, `serviceEntitlementId`, `treatmentSessionId` với định dạng GUID hợp lệ).
  - Tính ngày hiện tại theo múi giờ `Asia/Ho_Chi_Minh` (`getTodayVnDate`), cộng thêm ngày (`addDaysToDate`), sinh danh sách ngày từ `minDate` đến `+60 ngày` (`buildBookingDateRange`).
  - Hợp nhất các khung giờ trống khi chọn `"Kỹ thuật viên bất kỳ"` (`mergeAvailableSlots`) và lọc khung giờ theo nhân viên cụ thể (`getSlotsForStaff`).
  - Ánh xạ nhãn tiếng Việt và màu sắc cho `AppointmentStatus` (`getAppointmentStatusMeta`), nguồn đặt lịch (`getBookingSourceLabel`) và phân loại lỗi API (`classifyBookingError`).
  - Zod schemas: `bookingNoteSchema` (tối đa 500 ký tự), `cancelAppointmentSchema` (`reason` bắt buộc 1–500 ký tự sau `trim()`).
- **Files tạo:**
  - `apps/mobile/src/features/bookings/schemas.ts`
  - `apps/mobile/src/features/bookings/utils/bookingHelpers.ts`
  - `apps/mobile/src/features/bookings/utils/bookingHelpers.test.ts` (`BKG-M-UI-T02`, `BKG-M-UI-T03`)
- **Verification:** Chạy Jest test `bookingHelpers.test.ts` pass 100%.

### Task 3: React Query Hooks cho Đặt lịch & Quản lý lịch hẹn
- **Mục tiêu:** Cung cấp đầy đủ các hooks đọc dữ liệu và thực thi lệnh đặt/đổi/hủy lịch.
- **Files tạo:**
  - `apps/mobile/src/features/bookings/hooks/bookingsRetry.ts`: Không retry các lỗi `4xx` (`ApiClientError`).
  - `apps/mobile/src/features/bookings/hooks/useBookingSource.ts`: Tải dữ liệu nguồn cho Luồng 1 (`CatalogApi.getService`), Luồng 2a (`PurchasesApi.getService`), hoặc Luồng 2b (`TreatmentsApi.get` / `TreatmentsApi.list`).
  - `apps/mobile/src/features/bookings/hooks/useAvailability.ts`: Gọi `AvailabilityApi.forSource(source, date)` lấy danh sách KTV và khung giờ trống.
  - `apps/mobile/src/features/bookings/hooks/useBookNow.ts`: Mutation `AppointmentsApi.bookNow(body, idempotencyKey)` kèm làm mới cache.
  - `apps/mobile/src/features/bookings/hooks/useBookAppointment.ts`: Mutation `AppointmentsApi.book(body)` cho Luồng 2 kèm làm mới cache.
  - `apps/mobile/src/features/bookings/hooks/useMyAppointments.ts`: Query `AppointmentsApi.list(params)` theo `scope`, `pageNumber`, `pageSize`.
  - `apps/mobile/src/features/bookings/hooks/useMyAppointmentDetail.ts`: Query `AppointmentsApi.get(id)` (kèm tuỳ chọn lấy tiến độ gói `PurchasesApi.getPackage` khi là buổi liệu trình).
  - `apps/mobile/src/features/bookings/hooks/useRescheduleAppointment.ts`: Mutation `AppointmentsApi.reschedule(id, body)`.
  - `apps/mobile/src/features/bookings/hooks/useCancelAppointment.ts`: Mutation `AppointmentsApi.cancel(id, reason)`.
- **Verification:** `npm run typecheck --workspace @spa/mobile` sạch lỗi.

### Task 4: UI Components cho Đặt lịch & Lịch hẹn (`components/`)
- **Mục tiêu:** Xây dựng bộ component tái sử dụng giữa màn hình đặt lịch mới, danh sách, chi tiết và modal đổi/hủy lịch.
- **Files tạo:**
  - `apps/mobile/src/features/bookings/components/AppointmentStatusBadge.tsx`: Huy hiệu trạng thái cho 7 trạng thái lịch hẹn.
  - `apps/mobile/src/features/bookings/components/HoldCountdownBadge.tsx`: Đồng hồ đếm ngược thời gian giữ chỗ (`holdExpiresAtUtc`), gọi callback `onExpired` khi về `00:00`.
  - `apps/mobile/src/features/bookings/components/BookingSourceCard.tsx`: Thẻ hiển thị nguồn đặt lịch (Dịch vụ lẻ đặt ngay / Quyền dịch vụ đã mua / Buổi trong gói liệu trình).
  - `apps/mobile/src/features/bookings/components/DateStripPicker.tsx`: Thanh chọn ngày ngang theo tuần (từ `minDate` đến `+60 ngày`, nút chuyển tuần trước/sau, đánh dấu Hôm nay).
  - `apps/mobile/src/features/bookings/components/StaffSlotPicker.tsx`: Hàng chip chọn Kỹ thuật viên (`"Kỹ thuật viên bất kỳ"` + từng KTV + nhãn `"Phụ trách"`) và lưới 3 cột chọn khung giờ trống.
  - `apps/mobile/src/features/bookings/components/BookingSummaryCard.tsx`: Thẻ tóm tắt thông tin lịch hẹn và hộp chính sách giữ chỗ / đổi hủy 24h.
  - `apps/mobile/src/features/bookings/components/AppointmentCard.tsx`: Thẻ lịch hẹn trong danh sách `MyBookingsScreen` kèm nút thao tác nhanh (`Chi tiết`, `Đổi giờ hẹn`, `Hủy lịch`).
  - `apps/mobile/src/features/bookings/components/RescheduleAppointmentModal.tsx`: Modal đổi ngày/giờ/KTV cho lịch hẹn hiện có (`GET /availability?appointmentId=`).
  - `apps/mobile/src/features/bookings/components/CancelAppointmentModal.tsx`: Modal hủy lịch hẹn kèm chip gợi ý lý do nhanh và kiểm tra lý do bắt buộc (1–500 ký tự).
- **Verification:** `npm run typecheck --workspace @spa/mobile` sạch lỗi.

### Task 5: Các Màn hình Đặt lịch & Quản lý lịch hẹn (`screens/`) + Kết nối Routes & Catalog
- **Mục tiêu:** Xây dựng 4 màn hình chính, kết nối vào Expo Router và cập nhật điểm vào từ `ServiceCard`, `ServiceDetailScreen`, `PaymentResultScreen`.
- **Files tạo/cập nhật:**
  - `apps/mobile/src/features/bookings/screens/NewBookingScreen.tsx` (`SCR-M18` — `/booking/new`)
  - `apps/mobile/src/features/bookings/screens/BookingSuccessScreen.tsx` (`SCR-M18b` — `/booking/success`)
  - `apps/mobile/src/features/bookings/screens/MyBookingsScreen.tsx` (`SCR-M11` — `/(customer)/bookings`)
  - `apps/mobile/src/features/bookings/screens/BookingDetailScreen.tsx` (`SCR-M12` — `/(customer)/bookings/[bookingId]`)
  - `apps/mobile/src/features/bookings/index.ts`: Barrel export đầy đủ các screens, components, hooks, schemas.
  - Route files:
    - `apps/mobile/app/booking/_layout.tsx`
    - `apps/mobile/app/booking/new.tsx`
    - `apps/mobile/app/booking/success.tsx`
    - `apps/mobile/app/_layout.tsx`: Đăng ký `<Stack.Screen name="booking" options={{ headerShown: false }} />`.
    - `apps/mobile/app/(customer)/bookings/index.tsx`: Render `<MyBookingsScreen />`.
    - `apps/mobile/app/(customer)/bookings/[bookingId].tsx`: Render `<BookingDetailScreen />`.
  - Cập nhật tích hợp:
    - `apps/mobile/src/features/services/screens/ServiceDetailScreen.tsx`: Nút `"Đặt lịch ngay"` điều hướng tới `/booking/new?serviceId=${service.id}` (hoặc login kèm redirect tới `/booking/new?serviceId=${service.id}`).
    - `apps/mobile/src/features/orders/screens/PaymentResultScreen.tsx`: Hiển thị khối thông tin lịch hẹn khi `order.appointment !== null` và nút `"Xem lịch hẹn vừa đặt"` → `/booking/success?appointmentId=${order.appointment.id}`.
- **Verification:** `npm run typecheck --workspace @spa/mobile` sạch lỗi.

### Task 6: Kiểm thử Giao diện (`BKG-M-UI-T01…T16`) & Cập nhật Tài liệu
- **Mục tiêu:** Viết đầy đủ bộ test cho các màn hình và modals, chạy toàn bộ kiểm tra chất lượng và cập nhật tài liệu tiến độ/kiến trúc.
- **Files test tạo/cập nhật:**
  - `apps/mobile/src/features/bookings/screens/NewBookingScreen.test.tsx` (`BKG-M-UI-T04`, `T05`, `T06`, `T07`, `T08`, `T09`)
  - `apps/mobile/src/features/bookings/screens/MyBookingsScreen.test.tsx` (`BKG-M-UI-T11`, `T12`, `T13`, `T14`, `T16`)
  - Cập nhật `PaymentResultScreen.test.tsx` / `ServiceDetailScreen.test.tsx` (`BKG-M-UI-T10`, `T15`)
- **Files tài liệu cập nhật:**
  - `docs/mobile.md`: Cập nhật danh sách route `/booking/new`, `/booking/success`, `/(customer)/bookings`, `/(customer)/bookings/[bookingId]`.
  - `docs/progress.md`: Đánh dấu hoàn thành Mobile UI cho `UC-SPA-15` và `UC-SPA-16`.
- **Verification:**
  - `npm run typecheck --workspace @spa/mobile`
  - `npm run test --workspace @spa/mobile`
  - `npm run lint` & `npm run format:check`
  - Dọn dẹp không để file `*.test.ts(x)` mới nằm trong git staged/untracked khi bàn giao theo quy tắc repo (hoặc kiểm tra lại theo yêu cầu của user).

# Kế hoạch triển khai: UC-SPA-18 & UC-SPA-19 Mobile (Xem dịch vụ/gói đã mua & Theo dõi liệu trình chăm sóc da)

- **Use Cases:**
  - `UC-SPA-18` — Xem dịch vụ và gói đã mua
  - `UC-SPA-19` — Theo dõi liệu trình chăm sóc da
- **Nền tảng:** Mobile (`apps/mobile` — Expo SDK 57, React Native 0.86, Expo Router 57)
- **Màn hình:**
  - `SCR-M14` — Gói của tôi & Dịch vụ đã mua (`/(customer)/packages` — Customer Tab, chia 2 tab trên màn hình: **Gói liệu trình** & **Dịch vụ lẻ**)
  - `SCR-M14b` — Chi tiết gói đã mua (`/my-packages/[packageId]` — Root Stack Standalone Screen)
  - `SCR-M13` — Danh sách Liệu trình của tôi (`/(customer)/treatments` — Customer Tab)
  - `SCR-M13b` — Chi tiết Liệu trình & Nhật ký buổi (`/treatment/[treatmentId]` — Root Stack Standalone Screen + Modal ghi chú buổi)
  - Cập nhật `SCR-M19c` (`PaymentResultScreen`) để điều hướng nhanh về tab Dịch vụ lẻ / Gói đã mua sau thanh toán.
- **Ngày lập:** 14/11/2026
- **Tài liệu đặc tả:** [docs/specs/purchases-treatments.md](file:///e:/UTE/HK126/Code/SpaSystem/docs/specs/purchases-treatments.md#L725-L964)
- **Kỹ năng áp dụng:** [implement-fe](file:///e:/UTE/HK126/Code/SpaSystem/.claude/skills/implement-fe/SKILL.md)
- **Ghi chú Stitch:** Không có MCP `stitch` khả dụng trong môi trường; dựng trực tiếp theo đặc tả trong `docs/specs/purchases-treatments.md` và hệ thống thiết kế Botanical Green `@theme/index`.

---

## Global Constraints & Architectural Rules

1. **Tuân thủ cấu trúc Feature & Glossary:**
   - Mã nguồn đặt trong 2 feature độc lập:
     - `apps/mobile/src/features/purchases/` (`components/`, `hooks/`, `screens/`, `utils/`, `index.ts`) cho `UC-SPA-18`.
     - `apps/mobile/src/features/treatments/` (`components/`, `hooks/`, `screens/`, `utils/`, `index.ts`) cho `UC-SPA-19`.
   - Sử dụng named export cho mọi component, screen, hook và helper; tuyệt đối không dùng `any`, `@ts-ignore`, `as unknown as`.
2. **UI & Theme Tokens Mobile:**
   - Dùng `AppScreen` kết hợp các primitive `AppText`, `AppButton`, `AppInput`, `AppNotice`, `AppCard`.
   - Toàn bộ màu sắc, bo góc và khoảng cách lấy từ `@theme/index` (`colors`, `radius`, `spacing`, `shadows`).
   - Vùng chạm (touch target) của mọi nút bấm, tab chuyển đổi, chip lọc, icon thao tác phải $\ge 48 \times 48\text{dp}$ (`hitSlop={8}`).
   - Đầy đủ `accessibilityRole` (`button`, `tab`, `progressbar`), `accessibilityLabel`, `accessibilityState={{ selected, disabled }}`.
3. **Bố cục Customer Tabs vs Root Stack Standalone:**
   - Màn hình danh sách `/(customer)/packages` và `/(customer)/treatments` nằm trên Bottom Tabs và dùng trực tiếp Header của Tab (không vẽ thêm tiêu đề trùng lặp bên trong).
   - Màn hình `MyPurchasesScreen` (`/(customer)/packages`) được **chia làm 2 Tab riêng biệt ngay trên đầu màn hình** (`Gói liệu trình` và `Dịch vụ lẻ`), mỗi tab có dải chip lọc trạng thái và trạng thái rỗng riêng biệt.
   - Màn hình chi tiết gói (`/my-packages/[packageId]`) và chi tiết liệu trình (`/treatment/[treatmentId]`) đặt tại Root Stack (`apps/mobile/app/my-packages/[packageId].tsx`, `apps/mobile/app/treatment/[treatmentId].tsx`) và đăng ký `headerShown: false` trong `apps/mobile/app/_layout.tsx` để không bị trùng Header hoặc đè bởi thanh Bottom Tab Bar.
4. **Data Flow & BR-TRT-04 / BR-TRT-05:**
   - Gọi API qua `callPurchases` và `callTreatments` trong `apps/mobile/src/lib/api/appointments.ts` $\rightarrow$ hook TanStack Query $\rightarrow$ component/screen.
   - Trạng thái quyền (`EntitlementStatus`), gói (`CustomerPackageStatus`), liệu trình (`TreatmentPlanStatus`) và buổi (`TreatmentSessionStatus`) là **trạng thái hiệu lực do backend trả về (`BR-TRT-04`)** — client tuyệt đối không tự đổi trạng thái theo ngày hết hạn.
   - Điều kiện đặt lịch từng buổi (`canBook`, `reason`, `earliestDate`) lấy trực tiếp từ DTO backend (`BR-TRT-05`, `BR-TRT-10`) và nối thẳng sang `/booking/new?serviceEntitlementId=...` hoặc `/booking/new?treatmentSessionId=...&treatmentPlanId=...`.
5. **Xử lý lỗi theo Mã lỗi Backend (`purchaseErrorCodes`, `treatmentErrorCodes`):**
   - Phân nhánh lỗi dựa trên `errorCodeOf(error)` (`ApiClientError.errors[0]?.code`), không so khớp chuỗi `error.message`.
   - Đảm bảo đủ 4 trạng thái (đang tải, lỗi + nút thử lại, rỗng + CTA, có dữ liệu) trên mọi màn hình và modal.

---

## Danh sách Task chi tiết

### Task 1: Helpers trạng thái, tính hạn dùng & lọc/sắp xếp (`purchaseHelpers.ts`, `treatmentHelpers.ts`)

- **Mục tiêu:** Xây dựng các hàm thuần (pure functions) ánh xạ nhãn/màu trạng thái, tính số ngày còn lại theo múi giờ Việt Nam, chuẩn hóa tìm kiếm không dấu và lọc/sắp xếp danh sách cho 2 tab:
  - `getEntitlementStatusMeta(status: EntitlementStatus)` (`available`, `booked`, `used`, `expired`).
  - `getPackageStatusMeta(status: CustomerPackageStatus)` (`active`, `completed`, `expired`, `cancelled`).
  - `getTreatmentPlanStatusMeta(status: TreatmentPlanStatus)` (`not_started`, `in_progress`, `completed`, `paused`, `cancelled`).
  - `getTreatmentSessionStatusMeta(status: TreatmentSessionStatus)` (`not_booked`, `booked`, `completed`, `skipped`).
  - `formatRemainingDays(expiresAtUtc: string | null)`: Tính số ngày còn lại so với hôm nay (giờ VN) hoặc trả về `"Không giới hạn"` / `"Đã hết hạn"`.
  - `getPackageCannotBookReason(pkg: PurchasedPackage)`: Trả về lý do ngắn khi gói không thể đặt lịch tiếp (`"Gói đã hết hạn"`, `"Gói đã hoàn thành"`, `"Gói đã hủy"`, `"Liệu trình đang tạm dừng"`).
  - `filterAndSortPackages(packages, { statusFilter, query, sort })` & `filterAndSortServices(services, { statusFilter, query, sort })`: Lọc riêng cho Tab Gói liệu trình và Tab Dịch vụ lẻ, tìm kiếm không dấu, sắp xếp theo `newest` hoặc `expiring_soon`.
  - `classifyPurchaseOrTreatmentError(error)`: Phân loại lỗi theo `purchaseErrorCodes` & `treatmentErrorCodes`.
- **Files tạo:**
  - `apps/mobile/src/features/purchases/utils/purchaseHelpers.ts`
  - `apps/mobile/src/features/purchases/utils/purchaseHelpers.test.ts`
  - `apps/mobile/src/features/treatments/utils/treatmentHelpers.ts`
- **Verification:** Chạy Jest test `purchaseHelpers.test.ts` pass 100%.

### Task 2: React Query Hooks cho Purchases (`UC-SPA-18`) & Treatments (`UC-SPA-19`)

- **Mục tiêu:** Cung cấp đầy đủ các hooks đọc dữ liệu có cấu hình retry thông minh (không retry lỗi `4xx`).
- **Files tạo:**
  - `apps/mobile/src/features/purchases/hooks/useMyPurchases.ts`: Gọi `callPurchases((api) => api.list(signal))` với `purchasesQueryKeys.list`.
  - `apps/mobile/src/features/purchases/hooks/usePurchasedPackage.ts`: Gọi `callPurchases((api) => api.getPackage(id, signal))` với `purchasesQueryKeys.package(id)`.
  - `apps/mobile/src/features/treatments/hooks/useMyTreatments.ts`: Gọi `callTreatments((api) => api.list(status, signal))` với `treatmentsQueryKeys.list(status)`.
  - `apps/mobile/src/features/treatments/hooks/useMyTreatmentPlan.ts`: Gọi `callTreatments((api) => api.get(id, signal))` với `treatmentsQueryKeys.detail(id)`.
  - `apps/mobile/src/features/treatments/hooks/useMyTreatmentSession.ts`: Gọi `callTreatments((api) => api.getSession(planId, sessionId, signal))` với `treatmentsQueryKeys.session(planId, sessionId)`.
- **Verification:** `npm run typecheck --workspace @spa/mobile` sạch lỗi.

### Task 3: UI Components & Màn hình cho `UC-SPA-18` (`features/purchases/`)

- **Mục tiêu:** Xây dựng các component thẻ gói, thẻ dịch vụ lẻ, màn hình 2 tab `MyPurchasesScreen` (`SCR-M14`) và màn hình chi tiết gói `PurchasedPackageDetailScreen` (`SCR-M14b`).
- **Files tạo:**
  - `apps/mobile/src/features/purchases/components/PurchaseStatusBadge.tsx`: Huy hiệu hiển thị trạng thái cho `CustomerPackageStatus`, `EntitlementStatus`, `TreatmentPlanStatus`, `TreatmentSessionStatus`.
  - `apps/mobile/src/features/purchases/components/PurchasedPackageCard.tsx`: Thẻ gói đã mua với hộp 3 chỉ số tiến độ, dòng buổi kế tiếp (`nextSession`), nút `"Chi tiết gói"` (`/my-packages/[packageId]`) và nút `"Đặt buổi {n}"` (`/booking/new?treatmentSessionId=...&treatmentPlanId=...`).
  - `apps/mobile/src/features/purchases/components/PurchasedServiceCard.tsx`: Thẻ dịch vụ lẻ đã mua với trạng thái quyền, thời lượng, hạn dùng, hộp lịch hẹn đã đặt (nếu `booked` kèm nút `"Xem lịch hẹn"`) hoặc nút `"Đặt lịch ngay"` (`/booking/new?serviceEntitlementId=...`).
  - `apps/mobile/src/features/purchases/screens/MyPurchasesScreen.tsx` (`SCR-M14`):
    - Chia làm **2 Tab trên đầu màn hình**: **Tab 1: `Gói liệu trình ({n})`** và **Tab 2: `Dịch vụ lẻ ({n})`** (đồng bộ tham số `?tab=packages|services`).
    - Ô tìm kiếm nhanh + nút đổi sắp xếp (`Mới mua nhất` / `Sắp hết hạn`).
    - Dải chip lọc trạng thái riêng cho từng Tab kèm số đếm.
    - Danh sách `FlatList` hỗ trợ kéo làm mới (`RefreshControl`) và trạng thái rỗng riêng cho từng Tab.
  - `apps/mobile/src/features/purchases/screens/PurchasedPackageDetailScreen.tsx` (`SCR-M14b`):
    - Header cố định có nút Back (`ArrowLeft`) + tiêu đề `"Chi tiết gói đã mua"`.
    - Thẻ tổng quan gói & hộp 3 chỉ số tiến độ.
    - Thẻ phân rã từng dịch vụ trong gói (`items: PackageItemProgress[]`) kèm thanh tiến độ từng dịch vụ.
    - Khối buổi kế tiếp & nút `"Xem phác đồ & nhật ký liệu trình"` (`/treatment/[treatmentPlanId]`).
    - Thanh cố định ở đáy (`stickyBottomBar`) với nút `"Đặt lịch buổi {n}"` khi `nextSession?.canBook === true`.
  - `apps/mobile/src/features/purchases/index.ts`: Barrel export.
- **Verification:** `npm run typecheck --workspace @spa/mobile` sạch lỗi.

### Task 4: UI Components & Màn hình cho `UC-SPA-19` (`features/treatments/`)

- **Mục tiêu:** Xây dựng thẻ liệu trình, timeline buổi điều trị, modal xem ghi chú kết quả buổi, màn hình danh sách `MyTreatmentsScreen` (`SCR-M13`) và màn hình chi tiết `TreatmentDetailScreen` (`SCR-M13b`).
- **Files tạo:**
  - `apps/mobile/src/features/treatments/components/TreatmentPlanCard.tsx`: Thẻ liệu trình với `PurchaseStatusBadge`, KTV phụ trách (`primaryStaff`), thanh tiến độ số buổi, hạn dùng, buổi kế tiếp (`nextSession`), nút `"Xem phác đồ"` (`/treatment/[id]`) và nút `"Đặt buổi {n}"`.
  - `apps/mobile/src/features/treatments/components/TreatmentOverviewCard.tsx`: Thẻ tổng quan phác đồ trong trang chi tiết (mục tiêu `goal`, KTV phụ trách, ngày bắt đầu / dự kiến kết thúc / hoàn thành thực tế, hạn dùng, mã đơn `order.code`, liên kết `"Xem gói đã mua"`, hộp 3 chỉ số tiến độ).
  - `apps/mobile/src/features/treatments/components/TreatmentSessionTimeline.tsx`: Danh sách dọc các buổi theo `sequenceNumber` xử lý đủ 4 trạng thái (`completed` có nút `"Xem ghi chú trị liệu"`, `booked` có nút `"Xem lịch hẹn"`, `not_booked` có nút `"Đặt lịch buổi này"` hoặc hiện `reason`, `skipped` hiện đã bỏ qua).
  - `apps/mobile/src/features/treatments/components/TreatmentSessionDetailModal.tsx`: Modal gọi `useMyTreatmentSession(planId, sessionId)` hiển thị kết quả chăm sóc `result` của kỹ thuật viên (hoặc thông báo chưa có ghi chú).
  - `apps/mobile/src/features/treatments/screens/MyTreatmentsScreen.tsx` (`SCR-M13`):
    - Ô tìm kiếm nhanh theo tên gói + thanh chip lọc trạng thái (`Tất cả`, `Đang thực hiện`, `Chưa bắt đầu`, `Hoàn thành`, `Tạm dừng`, `Đã hủy`).
    - Danh sách `FlatList` với `RefreshControl` và đủ 4 trạng thái.
  - `apps/mobile/src/features/treatments/screens/TreatmentDetailScreen.tsx` (`SCR-M13b`):
    - Header cố định có nút Back + tiêu đề `"Phác đồ liệu trình"`.
    - Hộp cảnh báo `statusReason` khi liệu trình ở trạng thái `paused` hoặc `cancelled`.
    - `TreatmentOverviewCard` + `TreatmentSessionTimeline` + `TreatmentSessionDetailModal` + `stickyBottomBar` đặt lịch buổi tiếp theo.
  - `apps/mobile/src/features/treatments/index.ts`: Barrel export.
- **Verification:** `npm run typecheck --workspace @spa/mobile` sạch lỗi.

### Task 5: Kết nối Expo Router Routes & Cập nhật điểm điều hướng (`PaymentResultScreen`)

- **Mục tiêu:** Thay thế `PlaceholderScreen` ở 2 tab khách hàng, đăng ký 2 route chi tiết vào Root Stack và bổ sung nút điều hướng từ `PaymentResultScreen`.
- **Files tạo/cập nhật:**
  - `apps/mobile/app/(customer)/packages/index.tsx`: Render `<MyPurchasesScreen />`.
  - `apps/mobile/app/(customer)/treatments/index.tsx`: Render `<MyTreatmentsScreen />`.
  - `apps/mobile/app/my-packages/_layout.tsx` & `apps/mobile/app/my-packages/[packageId].tsx`: Render `<PurchasedPackageDetailScreen />`.
  - `apps/mobile/app/treatment/_layout.tsx` & `apps/mobile/app/treatment/[treatmentId].tsx`: Render `<TreatmentDetailScreen />`.
  - `apps/mobile/app/_layout.tsx`: Đăng ký `<Stack.Screen name="my-packages" options={{ headerShown: false }} />` và `<Stack.Screen name="treatment" options={{ headerShown: false }} />`.
  - `apps/mobile/src/features/orders/screens/PaymentResultScreen.tsx`: Khi đơn hàng đã thanh toán (`order.status === 'paid'`) có chứa dịch vụ lẻ (`hasService && !order.appointment`), hiển thị nút `"Xem dịch vụ đã mua"` → `/(customer)/packages?tab=services` bên cạnh `"Xem gói của tôi"` → `/(customer)/packages?tab=packages`.
- **Verification:** `npm run typecheck --workspace @spa/mobile` sạch lỗi.

### Task 6: Kiểm thử Giao diện (`PUR-TRT-M-UI-T01…T12`) & Cập nhật Tài liệu

- **Mục tiêu:** Viết unit/integration test cho các màn hình `MyPurchasesScreen`, `PurchasedPackageDetailScreen`, `MyTreatmentsScreen`, `TreatmentDetailScreen`, kiểm tra toàn bộ workspace và cập nhật tài liệu.
- **Files test tạo:**
  - `apps/mobile/src/features/purchases/screens/MyPurchasesScreen.test.tsx` (`PUR-TRT-M-UI-T01…T06`, `T12`)
  - `apps/mobile/src/features/treatments/screens/MyTreatmentsScreen.test.tsx` (`PUR-TRT-M-UI-T07…T11`)
- **Files tài liệu cập nhật:**
  - `docs/mobile.md`: Cập nhật danh sách route `/(customer)/packages`, `/my-packages/[packageId]`, `/(customer)/treatments`, `/treatment/[treatmentId]`.
  - `docs/progress.md`: Đánh dấu hoàn thành Mobile UI cho `UC-SPA-18` và `UC-SPA-19`.
- **Verification:**
  - `npm run typecheck --workspace @spa/mobile`
  - `npm run test --workspace @spa/mobile`
  - `npm run lint` & `npm run format:check`

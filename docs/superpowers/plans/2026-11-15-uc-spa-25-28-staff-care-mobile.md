# Kế hoạch triển khai UC-SPA-25 & UC-SPA-28: Lịch làm việc và hoàn thành buổi trị liệu cho Nhân viên trên Mobile

- **Use Cases:**
  - UC-SPA-25 — Xem danh sách lịch hẹn được phân công (`SCR-M25`)
  - UC-SPA-27 — Hồ sơ da và dị ứng của khách hàng (Tích hợp trong `SCR-M26`)
  - UC-SPA-28 — Xác nhận hoàn thành buổi chăm sóc (`SCR-M26`)
- **Tài liệu đặc tả:** [docs/specs/care.md](../../specs/care.md).
- **Trạng thái:** Chờ duyệt (Gate 2).

---

## 1. Mục tiêu & Phạm vi

Triển khai 2 màn hình dành cho Kỹ thuật viên / Nhân viên (`staff`) trên ứng dụng Mobile:

1. **`SCR-M25`: Lịch hẹn được phân công (`app/(staff)/bookings/index.tsx`)**
   - Nằm trong tab "Lịch hẹn" của Staff Navigation Layout.
   - Thanh phân đoạn tab thời gian tiện lợi: **Hôm nay** (mặc định), **Sắp tới** (14 ngày tới), **Đã xong** (30 ngày trước).
   - Bộ lọc bổ sung theo trạng thái lịch hẹn (`confirmed`, `completed`, `cancelled`, `no_show`).
   - Danh sách thẻ lịch hẹn `AssignedAppointmentCard`: Hiển thị giờ, khách hàng (tên, SĐT), dịch vụ/buổi liệu trình (x/y), badge lưu ý "Có dị ứng", "Đã có hồ sơ da", và badge trạng thái.
   - Hỗ trợ kéo để làm mới (`RefreshControl`) và phân trang/cuộn mượt mà.
   - Chạm vào thẻ → Chuyển sang màn hình chi tiết buổi chăm sóc `SCR-M26`.

2. **`SCR-M26`: Chi tiết buổi chăm sóc (`app/(staff)/bookings/[bookingId].tsx`)**
   - Header hiển thị tên dịch vụ, ngày giờ thực hiện, badge trạng thái.
   - Khối **Cảnh báo dị ứng nổi bật** (`AllergyHighlightCard`) luôn ghim trên cùng khi khách có dị ứng (tông đỏ nếu có dị ứng nặng `severe`, tông vàng nếu nhẹ/vừa, BR-CARE-02).
   - 3 phân đoạn nội dung chính:
     - **Khách & Dị ứng:** Xem thông tin khách hàng, số điện thoại (chạm để gọi `tel:`), buổi gói nếu có; xem danh sách dị ứng, thêm/sửa/xóa dị ứng khách hàng qua modal.
     - **Hồ sơ da (UC-SPA-27):** Xem chi tiết tình trạng da hoặc hiển thị CTA "Lập hồ sơ da" / "Cập nhật hồ sơ"; form modal nhập loại da và các thông tin đánh giá kèm câu khuyến cáo phi y tế bắt buộc (BR-CARE-01).
     - **Kết quả & Hoàn thành (UC-SPA-28):** Khi lịch `confirmed`, hiển thị nút "Xác nhận hoàn thành buổi chăm sóc" mở `CompleteAppointmentModal`. Modal hiển thị cảnh báo không thể hoàn tác, nhắc nhở nếu chưa có hồ sơ da (không chặn theo Q-35), ô nhập kết quả chăm sóc tùy chọn (tối đa 2000 ký tự). Khi xác nhận thành công: cập nhật trạng thái lịch, toast chúc mừng và hiển thị tiến độ gói/liệu trình (`PackageProgress`).

---

## 2. Global Constraints & Nguyên tắc kỹ thuật

- **Glossary & Directory:**
  - `src/features/care/` gồm `components/`, `hooks/`, `screens/`, `utils/`, `schemas.ts`, `index.ts`.
  - Tên tiếng Anh chuẩn glossary: `care`, `assigned-appointments`, `skin-profiles`, `allergies`, `complete`.
  - Dùng named export; tuyệt đối không dùng `any`, `@ts-ignore`, `as unknown as`.
- **UI & Theme:**
  - Tuân thủ bộ component `AppScreen`, `AppCard`, `AppText`, `AppButton`, `AppInput`, `AppNotice`, `EmptyState`, `ErrorState`.
  - Dùng bảng màu theme Botanical Green (`colors.primary`, `colors.primarySoft`, `colors.card`, `colors.border`, `colors.text`, `colors.warningSoft`, `colors.errorSoft`, v.v.).
  - Vùng chạm tối thiểu $48\times 48$dp, nút icon luôn có `accessibilityLabel`.
- **API & State:**
  - Tạo `apps/mobile/src/lib/api/care.ts` khởi tạo `CareApi` từ `@spa/api-client`.
  - Sử dụng TanStack Query cho các endpoint `GET` và TanStack Mutation cho `POST /complete`, `POST/PUT skin-profile`, `POST/PUT/DELETE allergies`.
  - Tự động làm mới cache query (`invalidateQueries`) sau mỗi mutation thành công.
- **Xử lý lỗi chuẩn mực:**
  - Bắt lỗi theo `ApiClientError.errors[].code` (`complete_too_early`, `skin_profile_locked`, `skin_profile_exists`, `allergy_exists`, v.v.), tuyệt đối không bắt lỗi theo chuỗi text message.
- **Kiểm thử tự động:**
  - Jest + React Native Testing Library, bao phủ các trường hợp kiểm thử trong spec (`CARE-M-UI-T01` … `CARE-M-UI-T12`).
  - *Lưu ý:* File test không được đưa vào git commit theo chỉ thị của người dùng.

---

## 3. Các bước triển khai chi tiết

### Task 1: API Wrapper cho Mobile
- **File:** `apps/mobile/src/lib/api/care.ts`
- Khởi tạo hàm `getCareApi()` và helper `callCare<T>()`.
- Re-export `careQueryKeys` và `careErrorCodes` từ `@spa/api-client`.

### Task 2: Schemas & Helpers
- **Files:**
  - `apps/mobile/src/features/care/schemas.ts`: Zod schema cho bộ lọc ngày `assignedFilterSchema`, form dị ứng `allergySchema`, form hồ sơ da `skinProfileSchema`, form hoàn thành buổi `completeAppointmentSchema`.
  - `apps/mobile/src/features/care/utils/careHelpers.ts`: Hàm map loại da sang tiếng Việt (`skinTypeLabels`), format ngày giờ theo múi giờ Việt Nam, helper tính khoảng ngày preset cho tab Hôm nay/Sắp tới/Đã xong.

### Task 3: TanStack Query & Mutation Hooks
- **Files:**
  - `apps/mobile/src/features/care/hooks/useAssignedAppointments.ts`: Query hook cho `CareApi.listAssigned`.
  - `apps/mobile/src/features/care/hooks/useStaffAppointmentDetail.ts`: Query hooks cho chi tiết lịch (`CareApi.getAppointment`), hồ sơ da (`CareApi.getSkinProfile`), và danh sách dị ứng (`CareApi.listAllergies`).
  - `apps/mobile/src/features/care/hooks/useCareMutations.ts`:
    - `useCompleteAppointment`: Mutation `CareApi.complete(id, result)`.
    - `useSaveSkinProfile`: Mutation tạo mới hoặc cập nhật hồ sơ da.
    - `useSaveAllergy`: Mutation tạo mới hoặc cập nhật dị ứng khách hàng.
    - `useDeleteAllergy`: Mutation xóa dị ứng.

### Task 4: Linh kiện giao diện (Components)
- **Files:**
  - `apps/mobile/src/features/care/components/AssignedAppointmentCard.tsx`: Thẻ hiển thị một lịch hẹn phân công.
  - `apps/mobile/src/features/care/components/AssignedFiltersBar.tsx`: Thanh tab phân đoạn thời gian (Hôm nay, Sắp tới, Đã xong) + bộ lọc nhanh trạng thái.
  - `apps/mobile/src/features/care/components/AllergyHighlightCard.tsx`: Banner nổi bật cảnh báo dị ứng khách hàng ghim trên cùng màn hình chi tiết.
  - `apps/mobile/src/features/care/components/CustomerCareTab.tsx`: Phân đoạn thông tin khách hàng, số điện thoại bấm gọi, và danh sách dị ứng kèm nút sửa/xóa/thêm.
  - `apps/mobile/src/features/care/components/AllergyModal.tsx`: Modal thêm hoặc sửa dị ứng của khách.
  - `apps/mobile/src/features/care/components/SkinProfileTab.tsx`: Phân đoạn hiển thị hồ sơ da hiện tại hoặc CTA lập hồ sơ.
  - `apps/mobile/src/features/care/components/SkinProfileModal.tsx`: Modal form lập/cập nhật hồ sơ da với khuyến cáo y tế bắt buộc (BR-CARE-01).
  - `apps/mobile/src/features/care/components/CareResultTab.tsx`: Phân đoạn xem kết quả buổi hoặc nút kích hoạt hoàn thành buổi.
  - `apps/mobile/src/features/care/components/CompleteAppointmentModal.tsx`: Modal xác nhận hoàn thành buổi chăm sóc, nhập kết quả, cảnh báo nhắc hồ sơ da (UC-SPA-28).

### Task 5: Màn hình chính & Định tuyến
- **Files:**
  - `apps/mobile/src/features/care/screens/AssignedAppointmentsScreen.tsx`: Màn hình `SCR-M25`.
  - `apps/mobile/src/features/care/screens/StaffAppointmentDetailScreen.tsx`: Màn hình `SCR-M26`.
  - `apps/mobile/src/features/care/index.ts`: Barrel export.
  - `apps/mobile/app/(staff)/bookings/index.tsx`: Render `AssignedAppointmentsScreen`.
  - `apps/mobile/app/(staff)/bookings/[bookingId].tsx`: Render `StaffAppointmentDetailScreen`.

### Task 6: Kiểm thử tự động (Unit / Integration Tests)
- **Files:**
  - `apps/mobile/src/features/care/screens/AssignedAppointmentsScreen.test.tsx`: Test danh sách, chuyển tab, rỗng, lỗi, chọn thẻ chuyển trang.
  - `apps/mobile/src/features/care/screens/StaffAppointmentDetailScreen.test.tsx`: Test hiển thị chi tiết, banner dị ứng, mở modal hoàn thành, hoàn thành thành công, thông báo lỗi `complete_too_early`.

### Task 7: Xác thực & Cập nhật tài liệu
- Chạy `npm run typecheck --workspace @spa/mobile`.
- Chạy `npm run test --workspace @spa/mobile -- src/features/care`.
- Cập nhật [docs/mobile.md](../../mobile.md) và [docs/progress.md](../../progress.md).

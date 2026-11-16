# Kế hoạch triển khai: UC-SPA-24 & UC-SPA-26 — Lịch làm việc cá nhân & Lịch sử chăm sóc (Mobile)

- **Mã use case:** `UC-SPA-24` (Xem lịch làm việc cá nhân), `UC-SPA-26` (Xem lịch sử các khách hàng đã chăm sóc)
- **Nền tảng:** Mobile (`@spa/mobile` — Expo SDK 57 / React Native)
- **Branch:** `feature/uc-spa-24-26-staff-schedule-care-history-mobile`
- **Ngày tạo:** 15/11/2026
- **Trạng thái:** Chờ duyệt (Gate 2)
- **Spec tham chiếu:**
  - `docs/specs/staff.md` (mục `Giao diện (mobile): SCR-M24 — Lịch làm việc cá nhân & SCR-M23 — Tổng quan nhân viên`)
  - `docs/specs/care.md` (mục `Giao diện (mobile): SCR-M27 — Lịch sử khách đã chăm sóc`)

---

## 1. Mục tiêu và Phạm vi

Triển khai trọn vẹn 2 Use Case cốt lõi còn lại của vai trò Kỹ thuật viên (Staff) trên Mobile:

1. **`SCR-M24` — Lịch làm việc cá nhân (`app/(staff)/schedule.tsx`)**:
   - Thay thế `PlaceholderScreen` bằng màn hình lịch làm việc phá cách với **chế độ kép (Dual View Switcher)**:
     - **Chế độ 1: Lưới ma trận tuần (`WeeklyShiftMatrix`)**: 7 cột Thứ 2 → Chủ Nhật; các khối ca bo góc (khung giờ, số lượng khách, tem "Đang trong ca"); ngày nghỉ thư giãn `Day Off`; ca đã hủy gạch mờ. Chạm ca mở bảng lịch hẹn `ShiftAppointmentsPanel`.
     - **Chế độ 2: Dòng thời gian trong ngày (`DayTimelineView`)**: Trục thời gian 07:00 – 21:00; dải ca làm việc bao trọn khung giờ; các slot lịch hẹn được định vị chính xác theo thời gian thực tế bên trong ca; thấy rõ khoảng trống nghỉ ngơi giữa các ca khách.
   - Chạm vào lịch hẹn trên cả 2 chế độ điều hướng thẳng đến chi tiết buổi chăm sóc `/(staff)/bookings/[id]`.

2. **`SCR-M27` — Lịch sử khách đã chăm sóc (`app/(staff)/care-history.tsx`)**:
   - Màn hình phụ có nút quay lại, truy cập từ Dashboard và Profile.
   - Tìm kiếm khách hàng theo tên hoặc SĐT (debounce 300ms, tự reset về trang 1).
   - Danh sách phân trang kéo để làm mới (pull-to-refresh) và cuộn vô tận (infinite scroll).
   - Thẻ lịch sử chăm sóc `CareHistoryCard` với badge hồ sơ da (`Đã có` / `Chưa có`) và badge dị ứng (`Có dị ứng`).
   - Chạm vào thẻ chuyển tiếp đến màn chi tiết buổi chăm sóc `/(staff)/bookings/[id]` để xem hồ sơ da/dị ứng hoặc lập/sửa hồ sơ da nếu còn trong hạn 7 ngày.

3. **`SCR-M23` — Nâng cấp Tổng quan nhân viên (`app/(staff)/dashboard.tsx`)**:
   - Thẻ tóm tắt ca làm việc hôm nay (giờ ca, số khách, nút chuyển nhanh sang Lịch làm việc).
   - Thẻ tóm tắt lịch hẹn hôm nay (lấy từ `useAssignedAppointments({ preset: 'today' })`).
   - 3 lối tắt nhanh: Lịch làm việc (`/schedule`), Lịch hẹn (`/bookings`), Lịch sử chăm sóc (`/care-history`).

4. **Cập nhật `StaffProfileScreen.tsx`**:
   - Bổ sung mục "Lịch sử khách đã chăm sóc" mở `/care-history`.

---

## 2. Ràng buộc toàn cục (Global Constraints)

1. **QUY TẮC BẮT BUỘC VỀ TEST:**
   - Tuyệt đối **KHÔNG COMMIT** file test (`StaffScheduleCare.test.tsx` hoặc bất kỳ file test nào) vào Git theo yêu cầu nghiêm ngặt của người dùng.
2. **Quy ước Commit:**
   - Commit dạng granular nhỏ gọn theo quy ước repo: `feat(mobile): ...`, `docs(...): ...`.
   - Trên môi trường Windows, lệnh `git add` và `git commit` cần user approval nếu chạy bypass sandbox.
3. **Quy ước Code & TypeScript:**
   - Không dùng `any`, `@ts-ignore`, `as unknown as`.
   - Tuân thủ token màu `colors` và khoảng cách `spacing` từ `@theme`.
   - Màn hình chứa FlatList hoặc custom header phải dùng `<AppScreen scroll={false}>` để tránh lỗi VirtualizedLists lồng ScrollView.
   - Vùng chạm tối thiểu 48dp cho tất cả nút bấm và thẻ ngày.
   - Giờ giấc chuẩn múi giờ Việt Nam `Asia/Ho_Chi_Minh` (ADR-0003).

---

## 3. Danh sách công việc chi tiết

### Task 1: API Wrapper Layer cho Work Schedules & Care History
- Tạo `apps/mobile/src/lib/api/workSchedules.ts`:
  - Khai báo wrapper gọi `MyWorkSchedulesApi` (`list`, `get`).
  - Xuất `callMyWorkSchedules`, `myWorkSchedulesQueryKeys`, `workScheduleErrorCodes`.
- Kiểm tra `apps/mobile/src/lib/api/care.ts`:
  - Đảm bảo `careQueryKeys.history(params)` và `CareApi.listHistory` đã sẵn sàng sử dụng.

### Task 2: Hooks quản lý dữ liệu (TanStack Query)
- Tạo `apps/mobile/src/features/staff/hooks/useMyWorkSchedules.ts`:
  - Hook `useMyWorkSchedules(params)` lấy danh sách ca làm việc theo tuần (hoặc khoảng ngày).
- Tạo `apps/mobile/src/features/staff/hooks/useMyWorkScheduleDetail.ts`:
  - Hook `useMyWorkScheduleDetail(shiftId)` lấy chi tiết một ca làm việc và các lịch hẹn trong ca.
- Tạo `apps/mobile/src/features/care/hooks/useCareHistory.ts`:
  - Hook `useCareHistory({ search, fromDate, toDate })` sử dụng `useInfiniteQuery` để phân trang 10 dòng/trang.

### Task 3: Các thành phần UI Lịch làm việc cá nhân (`features/staff/components/schedule/`)
- Tạo `WeekHeaderNav.tsx`:
  - Nút chuyển tuần trước / tuần sau / nút về tuần này.
  - Công tắc chuyển đổi chế độ xem: `Lưới tuần` (LayoutGrid) ⟷ `Dòng thời gian` (Clock).
- Tạo `WeeklyShiftMatrix.tsx`:
  - Ma trận 7 cột (T2 → CN).
  - Khối ca làm việc (Capsule Block): Giờ ca, số khách, tem "Đang trong ca" nếu hôm nay, tem "Đã hủy" nếu ca hủy.
  - Khối ngày nghỉ "Day Off" xám nhẹ thư giãn.
- Tạo `DayTimelineView.tsx`:
  - Dải chọn ngày 7 ngày ở trên (`WeekStripPicker`) để chọn ngày xem timeline.
  - Trục giờ 07:00 – 21:00.
  - Khối dải màu biểu thị ca làm việc.
  - Các ô lịch hẹn khách hàng định vị chính xác vị trí thời gian bên trong ca kèm khoảng nghỉ trống.
  - Đường chỉ giờ hiện tại (nếu đang xem ngày hôm nay).
- Tạo `ShiftAppointmentsPanel.tsx`:
  - Khối danh sách lịch hẹn trong ca được chọn, chạm để chuyển sang `/(staff)/bookings/[appointmentId]`.

### Task 4: Các thành phần UI Lịch sử chăm sóc (`features/care/components/history/`)
- Tạo `CareHistoryCard.tsx`:
  - Ngày giờ hoàn thành, tên khách hàng + SĐT (chạm gọi điện `tel:`).
  - Tên dịch vụ + số buổi liệu trình.
  - Badge hồ sơ da (`Đã có hồ sơ da` / `Chưa có hồ sơ da`) và badge `Có dị ứng`.
- Tạo `CareHistorySearchBar.tsx`:
  - Ô tìm kiếm tên/SĐT debounce 300ms, nút xóa nhanh từ khóa.

### Task 5: Màn hình & Định tuyến Lịch làm việc (`app/(staff)/schedule.tsx`)
- Tạo `apps/mobile/src/features/staff/screens/StaffScheduleScreen.tsx`.
- Cập nhật `apps/mobile/app/(staff)/schedule.tsx` thay thế `PlaceholderScreen`.

### Task 6: Màn hình & Định tuyến Lịch sử chăm sóc (`app/(staff)/care-history.tsx`)
- Tạo `apps/mobile/src/features/care/screens/StaffCareHistoryScreen.tsx`.
- Tạo file route `apps/mobile/app/(staff)/care-history.tsx`.

### Task 7: Cập nhật Dashboard & Profile nhân viên
- Cập nhật `apps/mobile/app/(staff)/dashboard.tsx`:
  - Widget ca làm hôm nay.
  - Widget lịch hẹn hôm nay.
  - 3 lối tắt nhanh (`/schedule`, `/bookings`, `/care-history`).
- Cập nhật `apps/mobile/src/features/users/screens/StaffProfileScreen.tsx`:
  - Thêm mục menu "Lịch sử khách đã chăm sóc".

### Task 8: Kiểm thử Component & Logic (DO NOT COMMIT)
- Tạo `apps/mobile/src/features/staff/screens/StaffScheduleCare.test.tsx` kiểm thử:
  - `STF-M-UI-T01`..`T07`: Chuyển tuần, lọc ngày, chuyển đổi chế độ Lưới/Timeline, mở chi tiết ca và điều hướng.
  - `CARE-M-UI-T10`..`T16`: Tìm kiếm debounce, phân trang infinite scroll, hiển thị badges hồ sơ da và dị ứng.
- Chạy test xác minh 100% pass.
- **Giữ file test untracked, tuyệt đối không add/commit vào Git**.

### Task 9: Kiểm tra tổng thể & Cập nhật tài liệu
- Chạy `npm run typecheck --workspace @spa/mobile`.
- Cập nhật `docs/mobile.md` (bổ sung route `care-history.tsx`).
- Cập nhật `docs/progress.md` (đánh dấu UC-SPA-24 và UC-SPA-26 là `✅` trên Mobile).

---

## 4. Kế hoạch Commit Git (4 commit sạch sẽ)

* **Commit 1**: `feat(mobile): add work schedule api client, helpers and schedule hooks (UC-SPA-24)`
* **Commit 2**: `feat(mobile): add dual-mode staff schedule matrix and day timeline components (UC-SPA-24)`
* **Commit 3**: `feat(mobile): add staff care history screen, search and card components (UC-SPA-26)`
* **Commit 4**: `docs(staff): update mobile routes, specs, plan and progress for staff schedule and care history (UC-SPA-24, UC-SPA-26)`

*(Lưu ý: Luôn kiểm tra `git status` trước mỗi commit để đảm bảo `StaffScheduleCare.test.tsx` không bị đưa vào staging).*

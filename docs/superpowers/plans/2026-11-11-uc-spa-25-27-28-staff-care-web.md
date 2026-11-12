# Lịch được phân công & buổi chăm sóc (web) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nhân viên xem lịch được phân công (SCR-W26) và mở chi tiết buổi chăm sóc (SCR-W27) để quản lý dị ứng, lập/sửa hồ sơ da và xác nhận hoàn thành.

**Architecture:** Hợp đồng mới ở `packages/shared-types/src/care.ts` + `packages/api-client/src/care.ts` (`CareApi`, `careQueryKeys`, `careErrorCodes`) → `apps/web/src/lib/api/care.ts` (`callCare`, `callCareVoid`) → hooks trong `features/care/hooks` → components → hai trang `pages/staff/*` đăng ký ở `staffPages` của `app/router.tsx`. Tổ chức component, dialog, icon theo mẫu `features/bookings/components/owner` và `features/treatments/components/owner`.

**Tech Stack:** React 19, TanStack Query, React Hook Form + Zod, Tailwind v4 + shadcn/ui, lucide-react, sonner, Vitest + Testing Library.

**Spec:** `docs/specs/care.md` mục "Giao diện (web): UC-SPA-25, 27, 28".

## Global Constraints

- Tên theo glossary; thư mục `src/features/care/` gồm `components/`, `hooks/`, `schemas.ts`, `careLabels.ts`, `errors.ts`, `index.ts`, `README.md`; named export; không `any`, `@ts-ignore`, `as unknown as`.
- Chỉ ghép UI từ `components/ui` và `components/shared`; bảng dữ liệu dùng `DataTable`; màu chỉ bằng token; icon `lucide-react`.
- Luồng `api-client` → `lib/api` → hook → component; mutation xong `invalidateQueries` đúng key; lỗi theo `errors[].code` (`errorCodeOf`).
- Mỗi màn có tải / lỗi / rỗng / có dữ liệu. Văn bản tiếng Việt có dấu, không dùng em-dash trong chữ hiển thị.
- Ngày giờ lịch hẹn là giờ Việt Nam: dùng `vietnamNow`, `addDays`, `weekdayName`, `formatLocalDate`, `formatLocalTime`, `formatDateTimeUtc`.
- Không đổi backend. Không commit (người dùng tự chạy git).
- Kiểm tra: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run format:check`, `npm run web:build`.

## Review Focus

- Lịch trong khoảng có nhân viên bị đổi sang người khác giữa chừng → mọi ghi trả `appointment_not_assigned`: toast + gọi lại chi tiết, trang hiện ErrorState (T6 test 403 khi tải).
- Ô ngày rỗng / người dùng xóa ngày trong URL (`?from=`) → không gọi API, hiện lỗi dưới ô (T5 test `to < from` và 43 ngày; thêm test `from` rỗng).
- Sửa hồ sơ chỉ xóa nội dung một trường → phải gửi `null`, không gửi `''` (T7 test PUT body).
- `complete` thành công khi đang ở tab "Kết quả buổi" → trạng thái và nút cập nhật ngay nhờ `setQueryData` (T8 test nút biến mất).
- Đổi tab ở SCR-W26 khi đang có bộ lọc tay → đặt lại preset (T5 test).

---

### Task 1: Hợp đồng `shared-types` + `CareApi`

**Files:**

- Create: `packages/shared-types/src/care.ts`; Modify: `packages/shared-types/src/index.ts`, `packages/shared-types/src/treatments.ts` (xóa `SkinType`, import từ `./care`)
- Create: `packages/api-client/src/care.ts`, Test: `packages/api-client/src/care.test.ts`; Modify: `packages/api-client/src/index.ts`
- Modify: `apps/web/src/features/treatments/treatmentStatus.ts` (`skinTypeLabels` khóa chữ thường)

**Interfaces — Produces:**

- `SkinType = 'normal' | 'dry' | 'oily' | 'combination' | 'sensitive'`
- `AssignedAppointmentStatus = Exclude<AppointmentStatus, 'held' | 'hold_expired'>`
- `AssignedAppointment { id, date, startTime, endTime, status: AppointmentStatus, customer: AppointmentCustomer, service: AppointmentService, treatmentSession: AssignedTreatmentSession | null, hasAllergies, hasSkinProfile }`, `AssignedTreatmentSession { id, sequenceNumber, totalSessions, packageName }`
- `AssignedAppointmentListParams { fromDate: string; toDate: string; status?: AssignedAppointmentStatus }`
- `SkinProfile { id, appointmentId, customerId, assessedBy: AppointmentStaff, assessedAtUtc, skinType, mainConcerns, currentProducts, careGoals, recommendedTreatment, note: string | null, createdAtUtc, updatedAtUtc: string | null }`
- `SaveSkinProfileRequest { skinType: SkinType; mainConcerns: string | null; currentProducts: string | null; careGoals: string | null; recommendedTreatment: string | null; note: string | null }`
- `SaveAllergyRequest { allergen: string; severity: AllergySeverity; note: string | null }`
- `PackageProgress { customerPackageId, packageName, usedSessions, totalSessions, status: CustomerPackageStatus }`, `CompleteAppointmentResult { appointment: AppointmentDetail; packageProgress: PackageProgress | null }`
- `CareApi`: `listAssigned(params, signal)`, `getAppointment(id, signal)`, `getSkinProfile(appointmentId, signal)`, `createSkinProfile(appointmentId, body)`, `updateSkinProfile(skinProfileId, body)`, `listAllergies(customerId, signal)`, `createAllergy(customerId, body)`, `updateAllergy(customerId, allergyId, body)`, `deleteAllergy(customerId, allergyId): Promise<void>`, `complete(id, result: string | null)` (body `{ result }`).
- `careQueryKeys = { all: ['care'], assignedAll: ['care','assigned'], assigned(params), appointment(id), skinProfile(appointmentId), allergies(customerId) }`
- `careErrorCodes`: `appointmentNotFound`, `appointmentNotAssigned`, `appointmentStatusInvalid`, `skinProfileTooEarly`, `skinProfileLocked`, `skinProfileExists`, `skinProfileNotFound`, `skinProfileRequired`, `completeTooEarly`, `entitlementStateInvalid`, `allergyExists`, `allergyNotFound`, `customerNotInCare`, `customerNotFound`, `validationError` (giá trị snake_case như spec).

- [ ] **Step 1:** Viết `care.test.ts` (CARE-UI-T01): `fetch` giả ghi lại URL/method/body; khẳng định `listAssigned({fromDate:'2026-11-11',toDate:'2026-11-11',status:'completed'})` → `GET /api/v1/me/assigned-appointments?fromDate=2026-11-11&toDate=2026-11-11&status=completed`; `createSkinProfile('a1', …)` → `POST /api/v1/appointments/a1/skin-profile`; `updateSkinProfile('s1', …)` → `PUT /api/v1/skin-profiles/s1`; `updateAllergy('c1','x1',…)` → `PUT /api/v1/customers/c1/allergies/x1`; `deleteAllergy` 204 → `undefined`; `complete('a1', null)` body `{"result":null}`.
- [ ] **Step 2:** `npm run test --workspace @spa/api-client` → FAIL (module chưa có).
- [ ] **Step 3:** Viết types + `CareApi` theo mẫu `treatments.ts` (đường dẫn `encodeURIComponent`).
- [ ] **Step 4:** Test PASS; `npm run typecheck` PASS (sửa `skinTypeLabels`).

### Task 2: `lib/api/care.ts` + hooks + errors + labels + schemas

**Files (Create):** `apps/web/src/lib/api/care.ts`; `apps/web/src/features/care/{careLabels.ts,errors.ts,schemas.ts,index.ts,README.md}`; `hooks/{useAssignedAppointments.ts,useCareAppointment.ts,useSkinProfile.ts,useCustomerAllergies.ts,useCareMutations.ts}`; Test: `features/care/schemas.test.ts`, `features/care/assignedRange.test.ts`; `features/care/assignedRange.ts`.

**Interfaces — Produces:**

- `callCare<T>(call: (api: CareApi) => Promise<ApiResponse<T>>): Promise<T>`, `callCareVoid(call: (api: CareApi) => Promise<void>)` (dùng `callApi`/`callVoidApi`).
- `assignedTabs = ['today','upcoming','done'] as const`, `type AssignedTab`; `assignedPreset(tab, today): { from: string; to: string; status?: AssignedAppointmentStatus }` (today: today→today; upcoming: today+1→today+14; done: today−30→today, `completed`).
- `skinTypeOptions: readonly { value: SkinType; label: string }[]` (Da thường, Da khô, Da dầu, Da hỗn hợp, Da nhạy cảm), `skinTypeLabel(value)`.
- `careErrorKind(error): 'not_found' | 'not_assigned' | 'status_invalid' | 'too_early' | 'locked' | 'exists' | 'profile_missing' | 'profile_required' | 'entitlement' | 'allergy_exists' | 'allergy_missing' | 'not_in_care' | 'customer_missing' | 'validation' | 'other'` dựa trên `errorCodeOf`.
- Schemas: `assignedFilterSchema` (`from`,`to` bắt buộc; `to ≥ from` "Đến ngày phải từ Từ ngày trở đi"; ≤ 42 ngày "Khoảng ngày tối đa 42 ngày"), `skinProfileSchema` (`skinType` bắt buộc "Chọn loại da"; 5 trường văn bản ≤ 2000), `allergySchema` (`allergen` trim 1–255 "Nhập tác nhân gây dị ứng", `severity` bắt buộc "Chọn mức độ", `note` ≤ 1000), `completeSchema` (`result` ≤ 2000 "Kết quả tối đa 2000 ký tự"); `toSkinProfileRequest(values): SaveSkinProfileRequest` (trim, rỗng → `null`).
- Hooks: `useAssignedAppointments(params | null)`, `useCareAppointment(id)`, `useSkinProfile(appointmentId, enabled)`, `useCustomerAllergies(customerId | null)`, `useCreateSkinProfile`, `useUpdateSkinProfile`, `useCreateAllergy`, `useUpdateAllergy`, `useDeleteAllergy`, `useCompleteAppointment`. `retry: ordersRetry`. Mutations: hồ sơ da `setQueryData(skinProfile)` + invalidate `appointment(id)` và `assignedAll`; dị ứng invalidate `allergies(customerId)`, `appointment(appointmentId)`, `assignedAll`; complete `setQueryData(appointment(id), result.appointment)` + invalidate `assignedAll`.

- [ ] **Step 1:** Test `assignedPreset` với today `2026-11-11` (3 tab, đúng ngày) và schema: `to<from`, 43 ngày, `from` rỗng lỗi; 42 ngày hợp lệ; `toSkinProfileRequest` đổi `'  '` → `null`; `allergen` 256 ký tự lỗi.
- [ ] **Step 2:** Chạy `npm run test --workspace @spa/web -- src/features/care` → FAIL.
- [ ] **Step 3:** Cài đặt các file trên.
- [ ] **Step 4:** Test PASS; typecheck PASS.

### Task 3: SCR-W26 `StaffAppointmentsView`

**Files (Create):** `features/care/components/StaffAppointmentsView.tsx`, `AssignedAppointmentsFilters.tsx`, `AssignedAppointmentsTable.tsx`, `useAssignedFilters.ts`; `pages/staff/StaffAppointmentsPage.tsx`; Test `features/care/components/StaffAppointmentsView.test.tsx`. **Modify:** `app/router.tsx` (`staffPages`), `app/routes.ts` (`:bookingId` → `:appointmentId`).

**Interfaces:** `useAssignedFilters(today?: string)` đọc/ghi `tab`,`from`,`to`,`status` trên URL (`useSearchParams`, `replace`), trả `{ tab, from, to, status, params: AssignedAppointmentListParams | null, errors, setTab, setRange, setStatus, reset, isCustom }` (`params = null` khi schema lỗi). Cột và nội dung đúng bảng ở spec; `onRowClick` → `navigate('/staff/bookings/' + id)`.

- [ ] **Step 1:** Test qua `renderApp('/staff/bookings')` với `useAuthStore` authenticated `staff` và `mockApi` (`POST /api/v1/auth/refresh` → `envelope(authResult('staff'))`, `GET /api/v1/me/assigned-appointments`): CARE-UI-T02 (query hôm nay, không `status`, dùng `vi.setSystemTime`), T03 (tab Sắp tới/Đã xong đổi query + URL), T04 (nhập `to < from` → lỗi, không gọi thêm), T05 (lỗi 500 + "Thử lại", rỗng "Chưa có lịch hẹn", dữ liệu có "Buổi 2/5 · Gói sáng da", "Có dị ứng", "Đã có hồ sơ da"), T06 (click dòng → `/staff/bookings/a1`).
- [ ] **Step 2:** Chạy test → FAIL.
- [ ] **Step 3:** Cài đặt theo mẫu `OwnerAppointmentsView` (khung `section` thẻ, `PageHeader`, `Tabs`).
- [ ] **Step 4:** Test PASS.

### Task 4: SCR-W27 khung trang + dị ứng

**Files (Create):** `features/care/components/StaffAppointmentDetailView.tsx`, `AllergyHighlight.tsx`, `CustomerCareTab.tsx`, `AllergyList.tsx`, `AllergyDialog.tsx`, `DeleteAllergyDialog.tsx`; `pages/staff/StaffAppointmentDetailPage.tsx`; Test `StaffAppointmentDetailView.test.tsx`.

**Interfaces:** `StaffAppointmentDetailView({ appointmentId })`; tab trên URL `?tab=customer|skin-profile|result`. `AllergyDialog({ customerId, appointmentId, allergy: CustomerAllergy | null, open, onClose })` (null = thêm). `allergy_exists` → `form.setError('allergen', 'Khách đã có dị ứng này.')`; `not_in_care` → toast + `onWriteForbidden()` để ẩn nút ghi.

- [ ] **Step 1:** Test CARE-UI-T07 (loader, 404 "Không tìm thấy lịch hẹn", 403 "Lịch này không được phân công cho bạn", có dữ liệu), T08 (Alert "Khách có 2 dị ứng cần lưu ý"; không dị ứng → không có), T16 (thêm POST body, `allergy_exists` lỗi dưới ô, xóa qua AlertDialog gọi DELETE, `customer_not_in_care` toast + nút "Thêm dị ứng" biến mất).
- [ ] **Step 2:** FAIL. **Step 3:** cài đặt (dialog theo mẫu `NoShowDialog`: `Dialog` bọc form con, `FormField`, `Button loading`). **Step 4:** PASS.

### Task 5: Tab hồ sơ da

**Files (Create):** `features/care/components/SkinProfileTab.tsx`, `SkinProfileView.tsx`, `SkinProfileForm.tsx`; tiếp test ở `StaffAppointmentDetailView.test.tsx`.

**Interfaces:** `SkinProfileTab({ appointment: AppointmentDetail })`; `SkinProfileForm({ appointmentId, profile: SkinProfile | null, onDone, onLocked })`. `locked` → state `editLocked` ở tab ẩn "Cập nhật hồ sơ".

- [ ] **Step 1:** Test CARE-UI-T13 (`skinProfileId=null` → EmptyState + "Lập hồ sơ da", không gọi `GET skin-profile`; `pending_confirmation` → không CTA), T14 (thiếu loại da → "Chọn loại da"; POST body; PUT `/skin-profiles/s1` gửi `null` cho trường xóa trắng), T15 (`skin_profile_too_early`, `skin_profile_locked` ẩn nút, `skin_profile_exists` về chế độ xem), T17 (nhãn "Da hỗn hợp").
- [ ] **Step 2:** FAIL. **Step 3:** cài đặt (`Select` loại da trong `FormField`, `Textarea` có đếm ký tự). **Step 4:** PASS.

### Task 6: Tab kết quả + `CompleteAppointmentDialog`

**Files (Create):** `features/care/components/CareResultTab.tsx`, `CompleteAppointmentDialog.tsx`; tiếp test.

**Interfaces:** `CompleteAppointmentDialog({ appointment: AppointmentDetail | null, onClose, onNeedSkinProfile })`. Thông điệp toast đúng spec.

- [ ] **Step 1:** Test T09 (nút "Xác nhận hoàn thành" chỉ với `confirmed`), T10 (body `{ result }`; toast "Đã ghi nhận buổi chăm sóc hoàn thành."; gói cuối có "đã dùng 3/3 buổi" và "Gói đã hoàn thành."; nút biến mất, badge "Hoàn thành"), T11 (`complete_too_early` Dialog còn mở; `skin_profile_required` chuyển `?tab=skin-profile`; `appointment_status_invalid` gọi lại chi tiết), T12 (2001 ký tự lỗi, không gọi).
- [ ] **Step 2:** FAIL. **Step 3:** cài đặt. **Step 4:** PASS.

### Task 7: Hoàn tất và tài liệu

- [ ] `npm run format`, rồi `npm run lint`, `npm run typecheck`, `npm run test`, `npm run format:check`, `npm run web:build` đều PASS.
- [ ] Cập nhật `docs/frontend.md` (route nhân viên), `docs/progress.md` (UC-SPA-25/27/28 web ✅), `docs/specs/staff.md` (dòng trạng thái UC-SPA-25 trỏ sang care.md), `apps/web/src/features/care/README.md`, `docs/specs/care.md` (trạng thái triển khai web).
- [ ] Kiểm tra tay: `npm run db:up`, `npm run db:seed:demo`, `npm run dev`; đăng nhập nhân viên demo; 320px / desktop; sáng / tối; bàn phím.

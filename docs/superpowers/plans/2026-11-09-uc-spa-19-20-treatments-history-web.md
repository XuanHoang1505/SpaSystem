# Theo dõi liệu trình chăm sóc da và Lịch sử sử dụng dịch vụ (web) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Khách hàng theo dõi phác đồ và nhật ký các liệu trình chăm sóc da (`SCR-W17`, UC-SPA-19), xem danh sách lịch sử sử dụng dịch vụ dạng bảng phân trang và chi tiết lần sử dụng (`SCR-W18`, UC-SPA-20) trên web.

**Architecture:** Hợp đồng tại `packages/shared-types` (`treatments.ts`, `purchases.ts`) và `packages/api-client` (`TreatmentsApi.list`, `ServiceHistoryApi`). Hai feature mới: `features/treatments` (UC-SPA-19) và `features/service-history` (UC-SPA-20). Trang tại `pages/customer/` kết nối các feature vào layout `AccountLayout`. Dữ liệu máy chủ được quản lý bằng TanStack Query 5 (không lưu server state vào Zustand).

**Tech Stack:** React 19, Vite, TanStack Query 5, Tailwind v4 + shadcn/ui, Radix UI (Sheet/Dialog), `DataTable` dùng chung (`@tanstack/react-table`), Vitest + Testing Library (`mockApi.tsx`).

**Spec:** `docs/specs/purchases-treatments.md` (mục "Giao diện (web): UC-SPA-19" và "Giao diện (web): UC-SPA-20"). Hợp đồng backend: `MyTreatmentsController.cs`, `MyServiceHistoryController.cs`, `MyTreatmentDtos.cs`, `ServiceHistoryDtos.cs`.

---

## Global Constraints

- **Glossary & Naming:** Tuân thủ domain glossary: `treatments`, `treatmentPlans`, `treatmentSessions`, `serviceHistory`. Thư mục: `features/treatments/`, `features/service-history/` gồm `components/`, `hooks/`, `index.ts`. Dùng named export, không dùng `any`, `@ts-ignore`, `as unknown as`.
- **Web UI & Components:**
  - Chỉ ghép giao diện từ `components/ui/` (shadcn) và `components/shared/` (`DataTable`, `PageHeader`, `EmptyState`, `ErrorState`, `StatusBadge`).
  - Danh sách lịch sử (`SCR-W18`) bắt buộc dùng `DataTable` dùng chung với phân trang server-side (`PagedResult`).
  - Danh sách liệu trình (`SCR-W17`) dùng danh sách thẻ (`TreatmentPlanCard`) có thanh tiến độ và thông tin buổi kế tiếp (đã duyệt trong spec).
  - Màu sắc chỉ dùng CSS tokens trong `theme.css`, không viết mã hex cứng.
- **Data Fetching & State:**
  - Luồng: `api-client` → `lib/api/call.ts` (`callTreatments`, `callServiceHistory`) → hook React Query → component. Component tuyệt đối không gọi `fetch` trực tiếp.
  - Sau mutation (hoặc khi quay lại từ đặt lịch): `invalidateQueries` đúng query key (`treatmentsQueryKeys.all`, `serviceHistoryQueryKeys.all`).
- **Xử lý lỗi & Trạng thái:**
  - Bắt lỗi theo `ApiClientError.errors[].code`, không so khớp chuỗi message.
  - Mọi màn hình dữ liệu đều đảm bảo đủ 4 trạng thái: Loading (Skeleton), Error (có nút thử lại), Empty (có hướng dẫn hoặc CTA khám phá), Success.
- **Thời gian & Định dạng:**
  - Ngày giờ theo múi giờ `Asia/Ho_Chi_Minh` (ADR-0003), định dạng ngày `dd/MM/yyyy`, giờ `HH:mm`.
  - Không có dấu gạch ngang dài "—" trong chuỗi hiển thị giao diện.
- **Kiểm thử:**
  - Test đặt cạnh file (Vitest + React Testing Library). Giả lập API bằng `mockApi`.
  - Luôn mock `GET /api/v1/me/cart` trong test trang để tránh header bắn request không mong muốn.
  - Lệnh kiểm tra: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run format:check`, `npm run web:build`.

---

## File Structure

| File                                                                                                    | Trách nhiệm                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/shared-types/src/{treatments,purchases,index}.ts`                                             | Kiểu DTO cho danh sách liệu trình và lịch sử sử dụng dịch vụ                                                                                                     |
| `packages/api-client/src/{treatments,serviceHistory,index}.ts`                                          | API client, query keys và mã lỗi cho Treatments và ServiceHistory                                                                                                |
| `apps/web/src/lib/api/{treatments,serviceHistory}.ts`                                                   | Wrapper `callTreatments` và `callServiceHistory` với client dùng chung                                                                                           |
| `apps/web/src/features/treatments/{treatmentStatus,index}.ts`                                           | Nhãn trạng thái, tông màu StatusBadge của phác đồ và buổi                                                                                                        |
| `apps/web/src/features/treatments/hooks/{useMyTreatments,useMyTreatmentPlan,useMyTreatmentSession}.ts`  | React Query hooks cho UC-SPA-19                                                                                                                                  |
| `apps/web/src/features/treatments/components/*`                                                         | `TreatmentPlanCard`, `TreatmentPlanOverviewCard`, `TreatmentSessionTimeline`, `TreatmentSessionDetailSheet`, `MyTreatmentPlansView`, `MyTreatmentPlanDetailView` |
| `apps/web/src/features/service-history/{historyStatus,index}.ts`                                        | Nhãn trạng thái và tông màu cho lần sử dụng dịch vụ                                                                                                              |
| `apps/web/src/features/service-history/hooks/{useServiceHistory,useServiceHistoryDetail}.ts`            | React Query hooks cho UC-SPA-20                                                                                                                                  |
| `apps/web/src/features/service-history/components/*`                                                    | `ServiceHistoryFilterToolbar`, `ServiceHistoryDetailSheet`, `ServiceHistoryView`                                                                                 |
| `apps/web/src/pages/customer/{MyTreatmentPlansPage,MyTreatmentPlanDetailPage,MyServiceHistoryPage}.tsx` | Trang khách hàng kết nối feature                                                                                                                                 |
| `apps/web/src/app/{routes,router}.ts(x)`, `config/navigation.ts`                                        | Khai báo route, gắn component vào `AccountLayout`, bổ sung icon navigation                                                                                       |

---

### Task 1: Bổ sung Hợp đồng `shared-types` và API Client cho Treatments & Service History

**Files:**

- Modify: `packages/shared-types/src/treatments.ts`
- Modify: `packages/shared-types/src/purchases.ts`
- Modify: `packages/shared-types/src/index.ts`
- Modify: `packages/api-client/src/treatments.ts`
- Modify: `packages/api-client/src/treatments.test.ts`
- Create: `packages/api-client/src/serviceHistory.ts`
- Create: `packages/api-client/src/serviceHistory.test.ts`
- Modify: `packages/api-client/src/index.ts`

**Interfaces:**

- `packages/shared-types/src/treatments.ts`:
  - `MyTreatmentListItem`: `{ id: string; customerPackageId: string; packageName: string; imageUrl: string | null; status: TreatmentPlanStatus; packageStatus: CustomerPackageStatus; expiresAtUtc: string | null; totalSessions: number; usedSessions: number; bookedSessions: number; primaryStaff?: StaffRef | null; nextSession?: MyTreatmentNextSession | null }`.
- `packages/shared-types/src/purchases.ts`:
  - `ServiceHistorySource`: `'service' | 'package'`.
  - `ServiceHistoryQuery`: `{ fromDate?: string; toDate?: string; spaServiceId?: string; status?: AppointmentStatus }`.
  - `ServiceHistoryItem`: `{ appointmentId: string; status: AppointmentStatus; date: string; startTime: string; endTime: string; spaServiceId: string; serviceName: string; staff: StaffRef; source: ServiceHistorySource; treatmentPlanId?: string; packageName?: string; sequenceNumber?: number }`.
  - `ServiceHistoryDetail`: `ServiceHistoryItem & { durationMinutes: number; result: string | null; completedAtUtc?: string | null; serviceEntitlementId?: string | null; treatmentSessionId?: string | null; order?: PurchaseOrderRef | null }`.
- `packages/api-client/src/treatments.ts`:
  - Thêm phương thức `TreatmentsApi.list(status?: TreatmentPlanStatus, signal?: AbortSignal): Promise<ApiResponse<readonly MyTreatmentListItem[]>>`.
  - Bổ sung `treatmentsQueryKeys.list: (status?: string) => ['treatments', 'me', 'list', { status }] as const`.
- `packages/api-client/src/serviceHistory.ts`:
  - `ServiceHistoryApi`: `list(query?: ServiceHistoryQuery, paging?: PagedQuery, signal?: AbortSignal): Promise<ApiResponse<PagedResult<ServiceHistoryItem>>>`, `get(appointmentId: string, signal?: AbortSignal): Promise<ApiResponse<ServiceHistoryDetail>>`.
  - `serviceHistoryQueryKeys`: `all = ['service-history']`, `list: (query?: ServiceHistoryQuery, paging?: PagedQuery) => ['service-history', 'list', query, paging]`, `detail: (id: string) => ['service-history', 'detail', id]`.
  - `serviceHistoryErrorCodes`: `appointmentNotFound: 'appointment_not_found'`, `validationError: 'validation_error'`.

- [ ] **Step 1: Viết test cho API Client:** Thêm test `TreatmentsApi.list` kiểm tra gửi query param `status` khi có, và test `ServiceHistoryApi.list` (gửi `fromDate`, `toDate`, `spaServiceId`, `status`, `pageNumber`, `pageSize`), `ServiceHistoryApi.get(id)`.
- [ ] **Step 2: Chạy test API Client:** `npm run test --workspace @spa/api-client` → FAIL do chưa có type và implementation.
- [ ] **Step 3: Cài đặt types và API client:** Cập nhật `treatments.ts`, `purchases.ts`, `serviceHistory.ts` và export từ `index.ts`.
- [ ] **Step 4: Chạy lại test và typecheck:** `npm run test --workspace @spa/api-client` và `npm run typecheck --workspace @spa/api-client` → PASS.

---

### Task 2: Nền Web & Feature `treatments` (UC-SPA-19)

**Files:**

- Create: `apps/web/src/features/treatments/treatmentStatus.ts` (+ test)
- Create: `apps/web/src/features/treatments/hooks/useMyTreatments.ts`
- Create: `apps/web/src/features/treatments/hooks/useMyTreatmentPlan.ts`
- Create: `apps/web/src/features/treatments/hooks/useMyTreatmentSession.ts`
- Create: `apps/web/src/features/treatments/components/TreatmentPlanCard.tsx`
- Create: `apps/web/src/features/treatments/components/TreatmentPlanOverviewCard.tsx`
- Create: `apps/web/src/features/treatments/components/TreatmentSessionTimeline.tsx`
- Create: `apps/web/src/features/treatments/components/TreatmentSessionDetailSheet.tsx`
- Create: `apps/web/src/features/treatments/components/MyTreatmentPlansView.tsx` (+ test `TRT-UI-T11`, `TRT-UI-T12`, `TRT-UI-T13`, `TRT-UI-T14`)
- Create: `apps/web/src/features/treatments/components/MyTreatmentPlanDetailView.tsx` (+ test `TRT-UI-T15`, `TRT-UI-T16`, `TRT-UI-T17`)
- Create: `apps/web/src/features/treatments/index.ts`
- Modify: `apps/web/src/lib/api/treatments.ts` (thêm wrapper gọi API nếu cần)

**Interfaces & Components:**

- `treatmentStatusBadge(status: TreatmentPlanStatus): { label: string; tone: StatusTone }`:
  - `not_started`: "Chưa bắt đầu" (`neutral`)
  - `in_progress`: "Đang thực hiện" (`success`)
  - `completed`: "Đã hoàn thành" (`info`)
  - `paused`: "Tạm dừng" (`warning`)
  - `cancelled`: "Đã hủy" (`danger`)
- `treatmentSessionStatusBadge(status: TreatmentSessionStatus): { label: string; tone: StatusTone }`:
  - `not_booked`: "Chưa đặt lịch" (`neutral`)
  - `booked`: "Đã đặt lịch" (`info`)
  - `completed`: "Đã hoàn thành" (`success`)
  - `skipped`: "Đã bỏ qua" (`neutral`)
- `TreatmentPlanCard`: Nhận `plan: MyTreatmentListItem`, hiển thị tên gói, `StatusBadge` liệu trình & gói, thanh progressbar `{usedSessions}/{totalSessions}`, hạn sử dụng, thông tin buổi kế tiếp (`nextSession`). Nút "Đặt lịch buổi tiếp theo" khi `nextSession.canBook = true` dẫn đến `/booking/new?treatmentSessionId=...&treatmentPlanId=...`.
- `MyTreatmentPlansView`: Chip lọc trạng thái (Tất cả, Đang thực hiện, Chưa bắt đầu, Hoàn thành, Tạm dừng, Đã hủy) + Ô tìm kiếm theo tên gói. Đủ 4 trạng thái (Skeleton, ErrorState, EmptyState có CTA `/packages`, List).
- `MyTreatmentPlanDetailView`: Breadcrumb, nút quay lại `/my-treatment-plans`, `TreatmentPlanOverviewCard` (mục tiêu `goal`, ngày bắt đầu/kết thúc, chuyên viên, cảnh báo `statusReason` trong Alert khi `paused`/`cancelled`, hộp 3 chỉ số), `TreatmentSessionTimeline` (timeline các buổi), và `TreatmentSessionDetailSheet` (Sheet xem kết quả `result` của buổi completed).

- [ ] **Step 1: Viết test cho `treatmentStatus.ts` và View components:** Viết unit tests cho badge mappings, `MyTreatmentPlansView.test.tsx` và `MyTreatmentPlanDetailView.test.tsx` kiểm tra render danh sách, chip lọc, tiến độ, timeline các buổi và Sheet xem ghi chú trị liệu.
- [ ] **Step 2: Chạy test:** `npm run test --workspace @spa/web -- src/features/treatments` → FAIL.
- [ ] **Step 3: Cài đặt feature `treatments`:** Tạo hooks, status helpers và các component theo đặc tả.
- [ ] **Step 4: Chạy lại test:** `npm run test --workspace @spa/web -- src/features/treatments` và typecheck → PASS.

---

### Task 3: Feature `service-history` với DataTable (UC-SPA-20)

**Files:**

- Create: `apps/web/src/lib/api/serviceHistory.ts`
- Create: `apps/web/src/features/service-history/historyStatus.ts` (+ test)
- Create: `apps/web/src/features/service-history/hooks/useServiceHistory.ts`
- Create: `apps/web/src/features/service-history/hooks/useServiceHistoryDetail.ts`
- Create: `apps/web/src/features/service-history/components/ServiceHistoryFilterToolbar.tsx`
- Create: `apps/web/src/features/service-history/components/ServiceHistoryDetailSheet.tsx`
- Create: `apps/web/src/features/service-history/components/ServiceHistoryView.tsx` (+ test `HIS-UI-T01`, `HIS-UI-T02`, `HIS-UI-T03`, `HIS-UI-T04`, `HIS-UI-T05`, `HIS-UI-T06`, `HIS-UI-T07`)
- Create: `apps/web/src/features/service-history/index.ts`

**Interfaces & Components:**

- `historyStatusBadge(status: AppointmentStatus): { label: string; tone: StatusTone }`:
  - `completed`: "Đã hoàn thành" (`success`)
  - `no_show`: "Vắng mặt" (`danger`)
- `ServiceHistoryFilterToolbar`:
  - Input ngày `fromDate`, `toDate`.
  - Dropdown chọn dịch vụ từ `useServices()`.
  - Select trạng thái: Tất cả, Đã hoàn thành (`completed`), Vắng mặt (`no_show`).
  - Nút "Đặt lại bộ lọc".
- `ServiceHistoryView`:
  - Tiêu đề `PageHeader`: "Lịch sử sử dụng dịch vụ", mô tả "Xem lại các buổi chăm sóc và kết quả trị liệu da của bạn".
  - Bảng dữ liệu `DataTable<ServiceHistoryItem>`:
    - Cột: Thời gian (`Date` + `StartTime` - `EndTime`), Tên dịch vụ (`serviceName`), Nguồn sử dụng (`source = service`: "Dịch vụ lẻ", `source = package`: "Gói: {packageName} (Buổi {sequenceNumber})"), Kỹ thuật viên (`staff.fullName`), Trạng thái (`StatusBadge`), Thao tác: Nút "Xem chi tiết" mở `ServiceHistoryDetailSheet`.
    - Phân trang server-side qua `page={{ pageNumber, pageSize, totalCount, totalPages }}`.
  - `ServiceHistoryDetailSheet`:
    - Drawer hiển thị chi tiết lần sử dụng: tên dịch vụ, thời lượng, kỹ thuật viên, nguồn gốc (gói/dịch vụ lẻ), kết quả chăm sóc `result` (hoặc thông báo vắng mặt khi `no_show`).

- [ ] **Step 1: Viết test cho `ServiceHistoryView.test.tsx`:** Kiểm tra phân trang `DataTable`, lọc theo ngày/dịch vụ/trạng thái, hiển thị badge nguồn, click mở Sheet chi tiết và render ghi chú `result`.
- [ ] **Step 2: Chạy test:** `npm run test --workspace @spa/web -- src/features/service-history` → FAIL.
- [ ] **Step 3: Cài đặt feature `service-history`:** Cài đặt hooks, `ServiceHistoryFilterToolbar`, `ServiceHistoryDetailSheet`, `ServiceHistoryView`.
- [ ] **Step 4: Chạy lại test:** `npm run test --workspace @spa/web -- src/features/service-history` và typecheck → PASS.

---

### Task 4: Tích hợp Pages, Routes và Navigation

**Files:**

- Create: `apps/web/src/pages/customer/MyTreatmentPlansPage.tsx`
- Create: `apps/web/src/pages/customer/MyTreatmentPlanDetailPage.tsx`
- Create: `apps/web/src/pages/customer/MyServiceHistoryPage.tsx`
- Modify: `apps/web/src/app/routes.ts`
- Modify: `apps/web/src/app/router.tsx`
- Modify: `apps/web/src/config/navigation.ts`
- Modify: `apps/web/src/features/auth/navigation.test.ts`

**Specifications:**

- `apps/web/src/app/routes.ts`:
  - Trong `routes.customer`:
    - Đảm bảo có `['/my-treatment-plans', 'Liệu trình']`.
    - Thêm `['/my-treatment-plans/:id', 'Chi tiết liệu trình']`.
    - Thêm `['/my-history', 'Lịch sử sử dụng']`.
- `apps/web/src/config/navigation.ts`:
  - Bổ sung icon `HistoryIcon` cho `/my-history`.
  - Icon `CalendarClockIcon` hoặc `SparklesIcon` cho `/my-treatment-plans`.
- `apps/web/src/app/router.tsx`:
  - Khai báo các trang trong `customerPages`:
    - `'/my-treatment-plans'`: `<MyTreatmentPlansPage />`
    - `'/my-treatment-plans/:id'`: `<MyTreatmentPlanDetailPage />`
    - `'/my-history'`: `<MyServiceHistoryPage />`
- `apps/web/src/features/auth/navigation.test.ts`:
  - Cập nhật test chuyển hướng an toàn và menu khách hàng nếu có kiểm tra số lượng mục menu.

- [ ] **Step 1: Cập nhật routes, router và navigation config.**
- [ ] **Step 2: Viết/Cập nhật test điều hướng:** Test truy cập `/my-treatment-plans`, `/my-treatment-plans/:id`, `/my-history` yêu cầu đăng nhập (`TRT-UI-T18`, `HIS-UI-T08`), menu hiển thị active link tương ứng.
- [ ] **Step 3: Chạy test điều hướng:** `npm run test --workspace @spa/web -- src/features/auth` → PASS.

---

### Task 5: Kiểm tra Hồi quy, Typecheck và Hoàn tất Tài liệu

**Files:**

- Modify: `docs/frontend.md` (cập nhật route mới của customer)
- Modify: `docs/progress.md` (đánh dấu UI UC-SPA-19 và UC-SPA-20 hoàn thành)

- [ ] **Step 1: Chạy kiểm tra tĩnh toàn diện:**
  - `npm --workspace @spa/web run typecheck`
  - `npm --workspace @spa/web run lint`
- [ ] **Step 2: Chạy toàn bộ test suite:**
  - `npm --workspace @spa/web run test`
  - `npm --workspace @spa/api-client run test`
- [ ] **Step 3: Kiểm tra đóng gói build:**
  - `npm run web:build`
- [ ] **Step 4: Cập nhật tài liệu:** `docs/frontend.md` và `docs/progress.md`.

---

## Plan Review Checklist

- [x] Đầy đủ 2 use case: UC-SPA-19 (`SCR-W17`), UC-SPA-20 (`SCR-W18`).
- [x] Đúng thứ tự: shared-types → api-client → lib/api → hooks → components → pages/routes → test → docs.
- [x] Tuân thủ 100% Global Constraints và quy tắc UI tastes của hệ thống.
- [x] Có checkbox (`- [ ]`) cho từng bước thực thi.

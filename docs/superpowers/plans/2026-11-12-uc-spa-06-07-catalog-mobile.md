# Tìm kiếm & Chi tiết dịch vụ, gói dịch vụ (mobile) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Triển khai hoàn chỉnh 4 màn hình công khai trên Mobile (`@spa/mobile`) cho **UC-SPA-06** (Tìm kiếm dịch vụ & gói dịch vụ) và **UC-SPA-07** (Xem chi tiết dịch vụ & gói dịch vụ), bao gồm SCR-M02, SCR-M03, SCR-M04, SCR-M05.

**Architecture:** Tận dụng `@spa/shared-types` và `@spa/api-client` (`CatalogApi`, `catalogQueryKeys`) đã hoàn thiện. Bổ sung `apps/mobile/src/lib/api/catalog.ts` (kết nối `getApiClient()` tự động gắn phiên đăng nhập), `formatDuration` trong `src/lib/formatting/formatters.ts`. Xây dựng 2 module tính năng theo chuẩn glossary: `src/features/services/` và `src/features/packages/` (hooks, components, screens), đấu nối vào các file route Expo Router trong `app/(public)/`.

**Tech Stack:** Expo SDK 57, Expo Router, React Native 0.86, TanStack Query, `lucide-react-native`, Jest + Testing Library Native, Design Tokens (`@theme/index`).

**Spec:** `docs/specs/catalog.md` mục "Giao diện (mobile): UC-SPA-06, 07".

---

## Global Constraints

- Thư mục feature theo glossary: `src/features/services/` và `src/features/packages/` gồm `components/`, `hooks/`, `screens/`, `index.ts`; file route trong `app/(public)/` chỉ render component màn hình; dùng named export (trừ default export bắt buộc của Expo Router route).
- Chỉ dùng `AppScreen` và các component `App*` cùng design tokens `src/theme` (`colors`, `spacing`, `radius`, `typography`). Vùng chạm tối thiểu 48dp cho mọi nút và thẻ tương tác; nút chỉ có icon phải có `accessibilityLabel`.
- Gọi API theo luồng: `api-client` $\rightarrow$ TanStack Query hook $\rightarrow$ component/screen. Component không gọi `fetch` trực tiếp.
- Xử lý lỗi theo `ApiClientError.errors[].code`, không so sánh chuỗi message. Mỗi màn hình dữ liệu phải có đủ 4 trạng thái: Loading (Skeleton), Error (AppNotice + nút thử lại), Empty (SearchX/PackageSearch + nút xoá bộ lọc), Data.
- Văn bản tiếng Việt có dấu. Giá tiền định dạng `vi-VN` đ qua `formatCurrency`. Thời lượng hiển thị định dạng qua `formatDuration` ("X phút", "X giờ Y phút").
- TDD: Test đặt cạnh file (`*.test.ts`, `*.test.tsx`), dùng `fetch` giả hoặc MSW/mock API, mock `expo-router`.
- Kiểm tra chất lượng: `npm run typecheck`, `npm run lint`, `npm run test --workspace @spa/mobile`.
- Không tự ý commit git (người dùng tự chạy git).

---

## Review Focus

- Tìm kiếm với ô nhập phải có debounce 300 ms, tránh spam API (CAT-M-UI-T02).
- Chọn danh mục trên thanh `CategoryPills` hoặc đổi bộ lọc giá phải reset về trang 1 và cuộn lên đầu (CAT-M-UI-T03, T04).
- Màn hình chi tiết gặp lỗi `404` (`service_not_found` / `package_not_found`) phải hiển thị thông báo lỗi rõ ràng, không crash app và không retry vô tận (CAT-M-UI-T10).
- Dịch vụ có `status = 'discontinued'` thì nút CTA "Đặt lịch ngay" phải bị vô hiệu hóa với nhãn "Tạm ngừng phục vụ" (CAT-M-UI-T11).
- Gói dịch vụ có dịch vụ thành phần ngừng bán (Q-14) vẫn hiển thị bình thường, dòng thành phần hiển thị badge cảnh báo (CAT-M-UI-T16).
- Mọi touch target (thẻ dịch vụ, nút lọc, nút bấm CTA) đều $\ge 48$dp và đáp ứng `useSafeAreaInsets().bottom` tại thanh Sticky Bottom Bar.

---

### Task 1: Foundation, Formatters & API Client Setup

- [ ] **1.1 Formatters:** Thêm hàm `formatDuration(minutes: number): string` vào `apps/mobile/src/lib/formatting/formatters.ts` (ví dụ: `45` $\rightarrow$ "45 phút", `90` $\rightarrow$ "1 giờ 30 phút", `120` $\rightarrow$ "2 giờ"). Viết unit test trong `apps/mobile/src/lib/formatting/formatters.test.ts`.
- [ ] **1.2 Catalog API Client:** Tạo `apps/mobile/src/lib/api/catalog.ts` cung cấp hàm `getCatalogApi()` sử dụng `getApiClient()` từ `src/lib/api/session.ts` (giúp tự động gắn Bearer token khi người dùng/chủ spa đã đăng nhập, đáp ứng BR-CAT-01).

---

### Task 2: Feature Services — Hooks & Components

- [ ] **2.1 Hooks:** Tạo `apps/mobile/src/features/services/hooks/`:
  - `useServiceSearch(params)`: Gọi `CatalogApi.searchServices`, cache `catalogQueryKeys.services(params)`, `staleTime: 60s`, `placeholderData: keepPreviousData`.
  - `useService(id)`: Gọi `CatalogApi.getService`, cache `catalogQueryKeys.service(id)`, `retry: false` khi 404.
  - `useServiceCategories()`: Gọi `CatalogApi.listServiceCategories`, cache `catalogQueryKeys.categories`, `staleTime: 5 phút`.
- [ ] **2.2 Components:** Tạo `apps/mobile/src/features/services/components/`:
  - `CatalogSearchInput.tsx`: Ô nhập tìm kiếm với icon `Search`, nút clear `X`, debounce 300ms.
  - `CategoryPills.tsx`: Thanh cuộn ngang hiển thị "Tất cả" + các danh mục spa; pill được chọn mang màu `colors.primary`.
  - `PriceFilterSheet.tsx`: Modal lọc khoảng giá (ô nhập số VND, các mốc chọn nhanh, nút "Đặt lại", nút "Áp dụng").
  - `ServiceCard.tsx`: Thẻ hiển thị dịch vụ (ảnh có fallback `Sparkles`, tên, danh mục, thời lượng, giá, badge ngừng bán nếu có, touch target $\ge 48$dp điều hướng sang chi tiết).
  - `ServiceSkeleton.tsx`: Component placeholder khi đang tải.
- [ ] **2.3 Index:** Export các hooks và components từ `apps/mobile/src/features/services/index.ts`.

---

### Task 3: Feature Services — Screens (SCR-M02 & SCR-M03)

- [ ] **3.1 SCR-M02 Screen:** Tạo `apps/mobile/src/features/services/screens/ServicesListScreen.tsx`:
  - Ghép `CatalogSearchInput`, `CategoryPills`, `PriceFilterSheet`.
  - `FlatList` với `ServiceCard`, pull-to-refresh (`RefreshControl`), phân trang infinite scroll (`onEndReached`).
  - Đủ 4 trạng thái: Loading (Skeletons), Error (`AppNotice` + thử lại), Empty (Icon `SearchX` + xoá bộ lọc), Data.
- [ ] **3.2 SCR-M03 Screen:** Tạo `apps/mobile/src/features/services/screens/ServiceDetailScreen.tsx`:
  - Cuộn dọc `ScrollView`: Ảnh hero $240$dp (fallback icon `Sparkles`), tên, danh mục, thời lượng, giá niêm yết, khối mô tả, quy trình 5 bước thực hiện, ghi chú chính sách.
  - Sticky Bottom CTA Bar: Giá + nút "Đặt lịch ngay" ($\ge 48$dp, vô hiệu hóa nếu `discontinued`).
  - Xử lý trạng thái 404 (`service_not_found`) và lỗi mạng với `AppNotice`.
- [ ] **3.3 Routes:** Cập nhật route files:
  - `apps/mobile/app/(public)/services/index.tsx` render `<ServicesListScreen />`.
  - `apps/mobile/app/(public)/services/[serviceId].tsx` render `<ServiceDetailScreen />`.
  - Cập nhật title và stack options trong `apps/mobile/app/(public)/_layout.tsx`.

---

### Task 4: Feature Packages — Hooks, Components & Screens (SCR-M04 & SCR-M05)

- [ ] **4.1 Hooks:** Tạo `apps/mobile/src/features/packages/hooks/`:
  - `usePackageSearch(params)`: Gọi `CatalogApi.searchPackages`, cache `catalogQueryKeys.packages(params)`.
  - `usePackage(id)`: Gọi `CatalogApi.getPackage`, cache `catalogQueryKeys.package(id)`.
- [ ] **4.2 Components:** Tạo `apps/mobile/src/features/packages/components/`:
  - `PackageCard.tsx`: Thẻ gói dịch vụ (ảnh gói hoặc fallback ảnh dịch vụ đầu tiên theo BR-CAT-07, tên, tổng số buổi, thời hạn ngày, giá ưu đãi, % tiết kiệm).
  - `PackageRoadmapItem.tsx`: Dòng hiển thị buổi liệu trình theo `sortOrder`, tên dịch vụ thành phần, số buổi, khoảng cách tối thiểu, ghi chú, cảnh báo nếu dịch vụ thành phần đã ngừng bán (Q-14).
  - `PackageSkeleton.tsx`: Placeholder skeleton cho gói.
- [ ] **4.3 SCR-M04 Screen:** Tạo `apps/mobile/src/features/packages/screens/PackagesListScreen.tsx`:
  - Thanh tìm kiếm, nút lọc giá, `FlatList` thẻ gói, kéo làm mới, phân trang, đủ 4 trạng thái.
- [ ] **4.4 SCR-M05 Screen:** Tạo `apps/mobile/src/features/packages/screens/PackageDetailScreen.tsx`:
  - Ảnh hero gói $240$dp, thông tin tổng quan (buổi, hạn dùng, hạn mở bán), so sánh giá lẻ, mô tả, danh sách lộ trình các buổi (`PackageRoadmapItem`), điều khoản gói.
  - Sticky Bottom CTA Bar: Giá trọn gói + nút "Mua gói / Đăng ký" ($\ge 48$dp).
  - Xử lý trạng thái 404 (`package_not_found`) và lỗi mạng.
- [ ] **4.5 Routes & Index:**
  - Export từ `apps/mobile/src/features/packages/index.ts`.
  - `apps/mobile/app/(public)/packages/index.tsx` render `<PackagesListScreen />`.
  - `apps/mobile/app/(public)/packages/[packageId].tsx` render `<PackageDetailScreen />`.
  - Cập nhật header title trong `app/(public)/_layout.tsx`.

---

### Task 5: Integration Tests for Mobile Catalog

- [ ] **5.1 Services Screen Tests:** Viết test trong `apps/mobile/src/features/services/screens/ServicesListScreen.test.tsx`:
  - CAT-M-UI-T01: Render loading skeleton sau đó hiển thị danh sách dịch vụ.
  - CAT-M-UI-T02: Nhập tìm kiếm kích hoạt debounce và gọi API đúng từ khóa.
  - CAT-M-UI-T03: Bấm chọn category pill đổi category và reset về trang 1.
  - CAT-M-UI-T05: Trạng thái rỗng hiển thị nút xoá bộ lọc.
  - CAT-M-UI-T08: Bấm thẻ dịch vụ điều hướng sang `/(public)/services/[id]`.
- [ ] **5.2 Service Detail Screen Tests:** Viết test trong `apps/mobile/src/features/services/screens/ServiceDetailScreen.test.tsx`:
  - CAT-M-UI-T09: Render đầy đủ thông tin dịch vụ, giá, thời lượng, quy trình 5 bước.
  - CAT-M-UI-T10: Lỗi 404 hiển thị `AppNotice` và nút quay về danh sách.
  - CAT-M-UI-T11: Dịch vụ `discontinued` vô hiệu hóa nút CTA đặt lịch.
- [ ] **5.3 Packages Screen Tests:** Viết test trong `apps/mobile/src/features/packages/screens/PackagesListScreen.test.tsx` và `PackageDetailScreen.test.tsx`:
  - CAT-M-UI-T13: Danh sách gói hiển thị thông tin số buổi, thời hạn, giá gói.
  - CAT-M-UI-T15: Chi tiết gói hiển thị lộ trình các buổi sắp xếp theo `sortOrder`.
  - CAT-M-UI-T16: Dịch vụ thành phần ngừng bán hiển thị nhãn cảnh báo (Q-14).

---

### Task 6: Quality Checks & Documentation

- [ ] **6.1 Code Verification:** Chạy kiểm tra tĩnh và kiểm tra test:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run test --workspace @spa/mobile`
  - `npm run mobile:check`
- [ ] **6.2 Documentation:**
  - Cập nhật `docs/mobile.md`: Mô tả 4 route mới `SCR-M02..SCR-M05`, các hooks và components đã triển khai.
  - Cập nhật `docs/progress.md`: Đánh dấu trạng thái Mobile của `UC-SPA-06` và `UC-SPA-07` thành `Done` (✅).

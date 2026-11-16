# Kế hoạch triển khai: UC-SPA-29 & UC-SPA-30 — Đánh giá dịch vụ (Mobile)

- **Mã use case:** `UC-SPA-29` (Xem đánh giá dịch vụ), `UC-SPA-30` (Đánh giá dịch vụ)
- **Nền tảng:** Mobile (`@spa/mobile` — Expo SDK 57 / React Native)
- **Branch:** `feature/uc-spa-29-30-reviews-mobile`
- **Ngày tạo:** 16/11/2026
- **Trạng thái:** Chờ duyệt (Gate 2)
- **Spec tham chiếu:** `docs/specs/reviews.md` (mục `Giao diện (mobile): UC-SPA-29, UC-SPA-30 — Đánh giá dịch vụ`)

---

## 1. Mục tiêu và Phạm vi

Triển khai trọn vẹn 2 Use Case cốt lõi về Đánh giá dịch vụ (Reviews) trên Mobile Expo:

1. **`SCR-M03` / `SCR-M05` — Khối xem đánh giá công khai (UC-SPA-29)**:
   - Tích hợp khối `ProductReviewsSection` vào trang Chi tiết dịch vụ (`ServiceDetailScreen`) và Chi tiết gói (`PackageDetailScreen`).
   - Thẻ tóm tắt điểm `RatingSummaryCard` (điểm trung bình, tổng số đánh giá, biểu đồ phân bổ 5 thanh sao 1–5★).
   - Thanh chip lọc số sao `ReviewRatingFilter` (Tất cả, 5★, 4★, 3★, 2★, 1★).
   - Danh sách nhận xét công khai `PublicReviewCard` (họ tên đầy đủ người đánh giá Q-77, số sao, ngày đăng, nội dung, ảnh trải nghiệm chạm phóng to `ReviewImageModal`, và khối phản hồi chính thức từ Spa `ownerReply` nếu có).
   - Hỗ trợ phân trang / nút tải thêm đánh giá.

2. **`SCR-M17` — Màn hình "Đánh giá của tôi" (`app/(customer)/reviews.tsx` — UC-SPA-30)**:
   - Thay thế `PlaceholderScreen` bằng màn hình `MyReviewsScreen` 2 tab phân đoạn (Segmented Tabs):
     - **Tab 1: "Chờ đánh giá" (`GET /api/v1/me/reviewable`)**: Danh sách sản phẩm khách đã mua hoặc trải nghiệm. Nếu `eligible = true` hiển thị nút CTA `Viết đánh giá`; nếu chưa đủ điều kiện hiển thị huy hiệu lý do (`not_used_yet`, `not_enough_sessions`, hoặc `already_reviewed`).
     - **Tab 2: "Đã đánh giá" (`GET /api/v1/me/reviews`)**: Danh sách đánh giá đã gửi, điểm sao, ngày gửi, ảnh đính kèm, badge trạng thái (`visible` / `hidden`), và phản hồi từ Spa. Nếu `canEdit = true` (trong 30 ngày và spa chưa phản hồi theo BR-REV-04) hiển thị nút `Chỉnh sửa đánh giá` kèm hạn chót.
   - Bổ sung lối tắt menu *"Đánh giá của tôi"* trong `CustomerProfileScreen` (`app/(customer)/profile.tsx`).

3. **`ReviewFormModal` — Modal gửi và chỉnh sửa đánh giá**:
   - Tương tác chọn 1–5 sao to rõ (kích thước $\ge$ 40dp, vùng chạm $\ge$ 48dp) kèm nhãn cảm xúc trực quan.
   - Ô nhập nhận xét `comment` (tối đa 1000 ký tự, có bộ đếm ký tự).
   - Chọn và tải 1 ảnh trải nghiệm thực tế từ thiết bị qua `expo-image-picker`, xem trước thumbnail và hỗ trợ xóa ảnh.
   - Tự động gọi chuỗi mutation tạo mới hoặc sửa đánh giá và tải ảnh (`POST /me/reviews/{id}/image`).
   - Bắt lỗi nghiệp vụ backend chính xác theo `ApiClientError.errors[].code` (`review_not_eligible`, `review_exists`, `review_locked`).

---

## 2. Ràng buộc toàn cục (Global Constraints)

1. **QUY TẮC BẮT BUỘC VỀ TEST:**
   - Tuyệt đối **KHÔNG COMMIT** file test (`ReviewsMobile.test.tsx` hoặc bất kỳ file test nào) vào Git theo chỉ thị của người dùng.
2. **Quy ước Commit:**
   - Commit dạng granular nhỏ gọn theo quy ước repo: `feat(mobile): ...`, `docs(...): ...`.
3. **Quy ước Code & TypeScript:**
   - Không dùng `any`, `@ts-ignore`, `as unknown as`.
   - Tuân thủ token màu `colors` và khoảng cách `spacing` từ `@theme`.
   - Vùng chạm tối thiểu 48dp cho tất cả nút bấm và ngôi sao tương tác (`hitSlop`).
   - Giờ giấc và ngày tháng chuẩn theo định dạng Việt Nam (`dd/MM/yyyy`).
   - Gọi API qua client layer chuẩn, không gọi `fetch` trực tiếp từ component.

---

## 3. Danh sách công việc chi tiết

### Task 1: Mở rộng Shared Types & API Client cho Reviews
- **Files:**
  - `packages/shared-types/src/reviews.ts`:
    - Thêm các kiểu: `ReviewableProduct`, `ReviewIneligibility`, `MyReview`, `CreateReviewRequest`, `UpdateReviewRequest`.
  - `packages/api-client/src/reviews.ts`:
    - Bổ sung `MyReviewsApi` với các phương thức: `listReviewable`, `listMine`, `getMine`, `create`, `update`, `uploadImage`, `deleteImage`.
    - Mở rộng `reviewsQueryKeys` (`reviewable`, `mine`, `detail`).
  - `packages/api-client/src/index.ts`: Re-export `MyReviewsApi`.
- **Kiểm tra:** `npm run typecheck --workspace @spa/shared-types` và `npm run typecheck --workspace @spa/api-client`.

### Task 2: API Client Wrapper cho Mobile
- **File:** `apps/mobile/src/lib/api/reviews.ts`
- Khởi tạo hàm `getProductReviewsApi()`, `getMyReviewsApi()`.
- Helper `callProductReviews<T>()`, `callMyReviews<T>()`.
- Re-export `reviewsQueryKeys`.

### Task 3: Schemas, Helpers & Hooks cho Mobile
- **Files:**
  - `apps/mobile/src/features/reviews/schemas.ts`: Zod schema `reviewFormSchema` (`rating` 1–5, `comment` tối đa 1000 ký tự).
  - `apps/mobile/src/features/reviews/utils/reviewHelpers.ts`:
    - `ratingEmotionLabels`: map số sao 1..5 → nhãn cảm xúc (*"Tuyệt vời, rất hài lòng!"*, v.v.).
    - `formatReviewDate`: format ngày theo giờ VN `dd/MM/yyyy`.
    - `formatReviewDeadline`: format hạn chót sửa đánh giá.
    - `reviewIneligibilityLabels`: map mã `not_used_yet`, `not_enough_sessions`, `already_reviewed` sang tiếng Việt.
  - `apps/mobile/src/features/reviews/hooks/`:
    - `useProductReviews.ts`: Query hook lấy reviews theo sản phẩm (`type`, `id`, `rating`, `pageNumber`).
    - `useReviewableProducts.ts`: Query hook lấy sản phẩm chờ đánh giá (`GET /api/v1/me/reviewable`).
    - `useMyReviews.ts`: Query hook lấy danh sách đánh giá của tôi (`GET /api/v1/me/reviews`).
    - `useReviewMutations.ts`: Mutation tạo đánh giá, sửa đánh giá, upload ảnh và xóa ảnh.

### Task 4: Linh kiện UI cho Khối Đánh giá Công khai (UC-SPA-29)
- **Files:**
  - `apps/mobile/src/features/reviews/components/RatingSummaryCard.tsx`: Tóm tắt điểm trung bình, 5 sao lớn, số đánh giá, 5 thanh tỷ lệ sao.
  - `apps/mobile/src/features/reviews/components/ReviewRatingFilter.tsx`: Thanh chip lọc số sao (Tất cả, 5★...1★).
  - `apps/mobile/src/features/reviews/components/PublicReviewCard.tsx`: Thẻ đánh giá công khai (sao, tên khách, ngày, nhận xét, ảnh thumbnail, phản hồi spa).
  - `apps/mobile/src/features/reviews/components/ReviewImageModal.tsx`: Modal phóng to xem ảnh trải nghiệm.
  - `apps/mobile/src/features/reviews/components/ProductReviewsSection.tsx`: Container khối đánh giá hoàn chỉnh tích hợp trong trang chi tiết.

### Task 5: Ghép Khối Đánh giá vào SCR-M03 & SCR-M05
- **Files:**
  - `apps/mobile/src/features/services/screens/ServiceDetailScreen.tsx`: Ghép `ProductReviewsSection` vào trang chi tiết dịch vụ.
  - `apps/mobile/src/features/packages/screens/PackageDetailScreen.tsx`: Ghép `ProductReviewsSection` vào trang chi tiết gói.

### Task 6: Linh kiện UI cho Màn hình "Đánh giá của tôi" (UC-SPA-30 — SCR-M17)
- **Files:**
  - `apps/mobile/src/features/reviews/components/ReviewableProductCard.tsx`: Thẻ sản phẩm chờ đánh giá kèm điều kiện và nút CTA.
  - `apps/mobile/src/features/reviews/components/MyReviewCard.tsx`: Thẻ đánh giá khách đã gửi kèm nút sửa khi `canEdit = true`.
  - `apps/mobile/src/features/reviews/components/ReviewFormModal.tsx`: Modal đánh giá với tương tác chọn 1–5 sao, nhập nhận xét, đính kèm ảnh qua `expo-image-picker`.
  - `apps/mobile/src/features/reviews/screens/MyReviewsScreen.tsx`: Màn hình 2 tab phân đoạn "Chờ đánh giá" và "Đã đánh giá".
  - `apps/mobile/src/features/reviews/index.ts`: Barrel export.
  - `apps/mobile/app/(customer)/reviews.tsx`: Render `MyReviewsScreen`.
  - `apps/mobile/src/features/users/screens/CustomerProfileScreen.tsx`: Bổ sung mục "Đánh giá của tôi" điều hướng đến `/(customer)/reviews`.

### Task 7: Kiểm thử tự động & Xác thực (TDD)
- **Test file:** `apps/mobile/src/features/reviews/screens/ReviewsMobile.test.tsx` (nhắc lại: **KHÔNG COMMIT FILE TEST**).
- Bao phủ đầy đủ 12 test cases trong bảng kiểm thử giao diện (`REV-M-UI-T01` → `REV-M-UI-T12`).
- Chạy `npm run typecheck --workspace @spa/mobile` (yêu cầu 0 lỗi).
- Chạy Jest kiểm thử: `npm test --workspace @spa/mobile -- src/features/reviews`.
- Cập nhật tài liệu: `docs/mobile.md`, `docs/progress.md`.

---

## 4. Thứ tự thực thi

1. Task 1: Shared types & API client.
2. Task 2 & Task 3: API wrapper, schemas, helpers, hooks.
3. Task 4 & Task 5: Khối đánh giá công khai (UC-29) và gắn vào Service/Package detail.
4. Task 6: Màn hình Đánh giá của tôi & Modal (UC-30).
5. Task 7: Chạy test, typecheck, cập nhật tài liệu.

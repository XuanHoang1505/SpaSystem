# Kế hoạch triển khai: UC-SPA-29, UC-SPA-30, UC-SPA-31 — Đánh giá dịch vụ trên Web

> **Mã Use Case:** UC-SPA-29 (Xem đánh giá dịch vụ), UC-SPA-30 (Đánh giá dịch vụ), UC-SPA-31 (Quản lý đánh giá dịch vụ)  
> **Nền tảng:** Web React (Vite + Tailwind CSS + shadcn/ui + TanStack Query)  
> **Tài liệu đặc tả:** [docs/specs/reviews.md](file:///e:/UTE/HK126/Code/SpaSystem/docs/specs/reviews.md#L356-L495)  
> **Màn hình phụ trách:**
> - `SCR-W03` / `SCR-W05`: Khối đánh giá trong trang chi tiết dịch vụ (`/services/:serviceId`) và gói (`/packages/:packageId`).
> - `SCR-W20`: Trang "Đánh giá của tôi" (`/my-reviews`) cho khách hàng.
> - `SCR-W39`: Trang "Quản lý đánh giá" (`/owner/reviews`) cho chủ spa/quản lý.

---

## 1. Global Constraints & Nguyên tắc kỹ thuật

1. **Tuân thủ quy ước thiết kế Web:**
   - Chỉ sử dụng các components từ `@/components/ui/` (shadcn) và `@/components/shared/` (`DataTable`, `StatusBadge`, `ImageWithFallback`, `EmptyState`, v.v.).
   - Mọi bảng dữ liệu bắt buộc dùng `DataTable` dùng chung (`@components/shared/DataTable`), không dựng thẻ `<table>` thủ công.
   - Định kiểu hoàn toàn bằng Tailwind CSS với các token ngữ nghĩa trong `theme.css`. Không dùng màu cứng (hardcoded hex `#...`).
2. **Kiểm tra và xử lý ảnh (tham khảo `CertificationImagePicker` & `ServiceImageDialog`):**
   - Chỉ cho phép upload JPEG, PNG, WebP tối đa 5MB (`allowedReviewImageMimeTypes`, `maxReviewImageBytes`).
   - Hỗ trợ xem trước ảnh cục bộ bằng `URL.createObjectURL` và tự động dọn dẹp bằng `URL.revokeObjectURL`.
   - Có khu vực kéo thả (drag & drop zone) và nút thay thế / xóa ảnh rõ ràng.
3. **Quản lý trạng thái và API:**
   - Dùng TanStack Query cho server state, không lưu dữ liệu server vào Zustand.
   - Mutation hoàn tất phải gọi `invalidateQueries` đúng query key (`reviewsQueryKeys.all`, `reviewsQueryKeys.mine`, `reviewsQueryKeys.owner`, `reviewsQueryKeys.product`).
   - Bắt lỗi theo `ApiClientError.errors[].code` (`review_not_eligible`, `review_exists`, `review_locked`, `review_not_found`).
4. **Cam kết kiểm thử (TDD):**
   - **QUY TẮC BẮT BUỘC:** Không commit bất kỳ file test nào vào Git. File test chỉ dùng để kiểm tra tự động trong quá trình phát triển và phải được xóa/loại trừ trước khi commit.

---

## 2. Danh sách nhiệm vụ (Tasks)

### Task 1: Shared Types & API Client (UC-SPA-31)
- **Files:**
  - `packages/shared-types/src/reviews.ts`
  - `packages/api-client/src/reviews.ts`
- **Mô tả:**
  - Bổ sung types cho UC-SPA-31: `OwnerReviewCustomer`, `OwnerReview`, `OwnerReviewFilter`, `ReplyReviewRequest`, `ChangeReviewVisibilityRequest`.
  - Bổ sung `ReviewsApi` trong `@spa/api-client`:
    - `search(query?, filter?, options?)`: `GET /reviews`
    - `reply(id, request, options?)`: `POST /reviews/{id}/reply`
    - `removeReply(id, options?)`: `DELETE /reviews/{id}/reply`
    - `changeVisibility(id, request, options?)`: `PATCH /reviews/{id}/visibility`
  - Mở rộng `reviewsQueryKeys.owner(filter)`.
- **Kiểm tra:** `npm run typecheck --workspace @spa/shared-types && npm run typecheck --workspace @spa/api-client`.

---

### Task 2: Review Schemas, Helpers & Image Validator
- **Files:**
  - `apps/web/src/features/reviews/schemas.ts`
  - `apps/web/src/features/reviews/utils/reviewImageFile.ts`
  - `apps/web/src/features/reviews/utils/reviewHelpers.ts`
- **Mô tả:**
  - `schemas.ts`: Zod schema `reviewFormSchema` (rating 1-5, comment max 1000) và `replyReviewSchema` (reply 1-1000 ký tự bắt buộc).
  - `reviewImageFile.ts`: Hàm `checkReviewImage(file: File): string | null` kiểm tra mime type (`image/jpeg`, `image/png`, `image/webp`) và dung lượng <= 5MB.
  - `reviewHelpers.ts`: Format ngày, format sao, emotion labels, mapping `reviewStatusBadge` cho `StatusBadge`.

---

### Task 3: React Query Hooks
- **Files:**
  - `apps/web/src/features/reviews/hooks/useProductReviews.ts`
  - `apps/web/src/features/reviews/hooks/useReviewableProducts.ts`
  - `apps/web/src/features/reviews/hooks/useMyReviews.ts`
  - `apps/web/src/features/reviews/hooks/useMyReviewMutations.ts`
  - `apps/web/src/features/reviews/hooks/useOwnerReviews.ts`
  - `apps/web/src/features/reviews/hooks/useOwnerReviewMutations.ts`
- **Mô tả:**
  - Tạo các query hooks và mutation hooks đầy đủ cho cả 3 không gian: Public, Customer và Owner.
  - Xử lý tải ảnh lên Cloudinary (`POST /me/reviews/{id}/image`) và xóa ảnh (`DELETE /me/reviews/{id}/image`) trong `useMyReviewMutations`.

---

### Task 4: Khối Đánh giá Công khai (UC-SPA-29: SCR-W03 & SCR-W05)
- **Files:**
  - `apps/web/src/features/reviews/components/RatingSummaryCard.tsx`
  - `apps/web/src/features/reviews/components/ReviewRatingFilter.tsx`
  - `apps/web/src/features/reviews/components/ReviewImageDialog.tsx`
  - `apps/web/src/features/reviews/components/PublicReviewCard.tsx`
  - `apps/web/src/features/reviews/components/ProductReviewsSection.tsx`
  - Tích hợp vào `apps/web/src/pages/public/ServiceDetailPage.tsx` và `apps/web/src/features/service-packages/components/PackageDetailView.tsx`.
- **Mô tả:**
  - Xây dựng giao diện khối đánh giá công khai ở cuối trang chi tiết dịch vụ/gói.
  - Đầy đủ 4 trạng thái: Loading skeleton, Error state có nút thử lại, Empty state khi chưa có đánh giá nào, Review list phân trang.

---

### Task 5: Trang "Đánh giá của tôi" cho Khách hàng (UC-SPA-30: SCR-W20)
- **Files:**
  - `apps/web/src/features/reviews/components/ReviewImagePicker.tsx`
  - `apps/web/src/features/reviews/components/ReviewableProductCard.tsx`
  - `apps/web/src/features/reviews/components/MyReviewCard.tsx`
  - `apps/web/src/features/reviews/components/ReviewFormDialog.tsx`
  - `apps/web/src/features/reviews/components/MyReviewsView.tsx`
  - `apps/web/src/pages/customer/MyReviewsPage.tsx`
- **Mô tả:**
  - Xây dựng trang `/my-reviews` trong `AccountLayout` với 2 tab: "Chờ đánh giá" và "Đã đánh giá".
  - `ReviewImagePicker`: Kéo thả ảnh hoặc chọn file, xem trước tức thì, nút xóa/thay thế ảnh.
  - `ReviewFormDialog`: Bộ chọn sao cảm xúc, textarea có đếm ký tự, đính kèm ảnh.

---

### Task 6: Trang "Quản lý đánh giá" của Chủ Spa (UC-SPA-31: SCR-W39)
- **Files:**
  - `apps/web/src/features/reviews/components/OwnerReviewFilterBar.tsx`
  - `apps/web/src/features/reviews/components/ReplyReviewDialog.tsx`
  - `apps/web/src/features/reviews/components/OwnerReviewsDataTable.tsx`
  - `apps/web/src/features/reviews/components/OwnerReviewsView.tsx`
  - `apps/web/src/pages/owner/OwnerReviewsPage.tsx`
  - Cập nhật `apps/web/src/app/routes.ts`, `apps/web/src/app/router.tsx`, `apps/web/src/config/navigation.ts`.
- **Mô tả:**
  - Xây dựng trang `/owner/reviews` trong `OwnerLayout`.
  - Bộ lọc: Ô tìm kiếm từ khóa + lọc sao, loại sản phẩm, trạng thái ẩn/hiện, trạng thái phản hồi.
  - `DataTable` với 7 cột dữ liệu + hành động phản hồi/sửa/xóa phản hồi và ẩn/hiện đánh giá.

---

### Task 7: Kiểm thử tự động, Typecheck & Cập nhật tài liệu
- **Files:**
  - Tạo test tự động Vitest tạm thời kiểm tra 14 UI test cases (`REV-W-UI-T01` -> `REV-W-UI-T14`).
  - Chạy `npm test --workspace @spa/web -- src/features/reviews` và đảm bảo pass 100%.
  - **Xóa file test trước khi commit.**
  - Chạy `npm run typecheck --workspace @spa/web` (đạt 0 lỗi).
  - Cập nhật `docs/frontend.md` và `docs/progress.md`.

---

## 3. Thứ tự thực thi

```
Task 1 (Shared Types & API Client) 
  ↳ Task 2 (Schemas, Helpers, Image Validator) 
    ↳ Task 3 (Hooks) 
      ↳ Task 4 (Public Reviews: SCR-W03 & SCR-W05) 
        ↳ Task 5 (Customer Reviews: SCR-W20) 
          ↳ Task 6 (Owner Reviews Management: SCR-W39) 
            ↳ Task 7 (Testing, Verification & Docs)
```

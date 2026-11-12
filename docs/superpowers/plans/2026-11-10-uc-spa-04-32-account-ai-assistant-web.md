# Kế hoạch triển khai Frontend Web: UC-SPA-04 & UC-SPA-32

- **Mã use case:** UC-SPA-04 (Cập nhật thông tin tài khoản) và UC-SPA-32 (Trò chuyện với trợ lý AI tư vấn dịch vụ)
- **Nền tảng:** Web (`apps/web`)
- **Ngày lập:** 10/11/2026
- **Tài liệu tham chiếu:** `docs/specs/auth.md`, `docs/specs/ai-assistant.md`, `.claude/skills/implement-fe/SKILL.md`

---

## 1. Mục tiêu & Phạm vi

### Màn hình mục tiêu:

1. **`SCR-W22` — Thông tin tài khoản (`/account`)**:
   - Người dùng đã đăng nhập (`customer`, `staff`, `owner`) xem và sửa thông tin cá nhân.
   - Quản lý ảnh đại diện: Tải ảnh mới (PNG/JPG/WEBP $\le$ 5MB) qua `POST /api/v1/me/avatar`, xóa ảnh qua `DELETE /api/v1/me/avatar`.
   - Cập nhật thông tin cá nhân: `fullName`, `phoneNumber`, `dateOfBirth`, `gender` qua `PUT /api/v1/me`.
   - Đổi mật khẩu: `currentPassword`, `newPassword`, `confirmPassword` qua `PUT /api/v1/me/password`, cảnh báo thu hồi các phiên đăng nhập khác.
2. **`SCR-W21` — Trợ lý AI tư vấn dịch vụ (`/ai-assistant` & Floating Chat Widget)**:
   - Trang `/ai-assistant` chuyên dụng cho khách hàng trong `AccountLayout` và khách vãng lai.
   - **Icon nổi ở góc dưới bên phải** (`AiChatWidget`) trên các trang công khai và khách hàng: Nhấn vào mở popup khung chat nhanh để tư vấn dịch vụ mọi lúc.
   - Lưu ý y khoa cố định ở đầu khung chat (BR-AI-01).
   - Tải lịch sử hỏi đáp của khách hàng (`GET /api/v1/me/ai/history`).
   - Chat tương tác (`POST /api/v1/ai/chat`) hiển thị tin nhắn AI kèm thẻ gợi ý sản phẩm (`suggestions`) và thẻ đề xuất lịch (`bookingProposals` với link đặt sẵn).
   - Xử lý các trạng thái đặc biệt: giới hạn tần suất 429, dịch vụ AI tạm ngưng 503, câu trả lời cố định y khoa (`scope = medical`) và ngoài phạm vi (`scope = out_of_scope`).

---

## 2. Global Constraints & Nguyên tắc kỹ thuật

- Ghép UI từ primitive `components/ui` (shadcn) và `components/shared` (`PageHeader`, `StatusBadge`, `EmptyState`, `OrdersErrorState`, v.v.).
- Token CSS từ `theme.css`. Không viết cứng mã màu hex.
- Kiến trúc luồng dữ liệu chuẩn: `api-client` $\rightarrow$ React Query hook $\rightarrow$ Component UI.
- Quản lý form bằng `react-hook-form` + `@hookform/resolvers/zod` + `zod`.
- Error handling theo `ApiClientError.errors[].code`.
- TDD: Test unit/integration đi kèm file bằng Vitest + Testing Library với mock API.
- Cập nhật `docs/progress.md` và `docs/frontend.md` sau khi hoàn tất.

---

## 3. Danh sách các Task triển khai

### Task 1: Hợp đồng Types & API Client (`shared-types` & `api-client`)

- **File tạo/sửa**:
  - `packages/shared-types/src/users.ts`: Các type `MeDto`, `UpdateProfileRequest`, `ChangePasswordRequest`, `AvatarUrlDto`, `Gender`.
  - `packages/shared-types/src/aiAssistant.ts`: Các type `AiProductType`, `AiBookingKind`, `AiProductSuggestion`, `AiBookingProposal`, `AiChatReply`, `AiChatMessage`, `AiChatHistory`, `AiChatHistoryQuery`, `AskAiAssistantRequest`.
  - `packages/shared-types/src/index.ts`: Re-export `users` và `aiAssistant`.
  - `packages/api-client/src/users.ts`: Client `UsersApi` (`getMe`, `updateMe`, `changePassword`, `uploadAvatar`, `deleteAvatar`), `usersQueryKeys`, `usersErrorCodes`.
  - `packages/api-client/src/aiAssistant.ts`: Client `AiAssistantApi` (`chat`, `getHistory`), `aiAssistantQueryKeys`, `aiAssistantErrorCodes`.
  - `packages/api-client/src/index.ts`: Re-export `users` và `aiAssistant`.
  - `packages/api-client/src/users.test.ts` & `packages/api-client/src/aiAssistant.test.ts`.
- **Kiểm tra**: Chạy `npm --workspace @spa/api-client run test`.

### Task 2: Feature `users` (Thông tin tài khoản — UC-SPA-04)

- **File tạo/sửa**:
  - `apps/web/src/lib/api/users.ts`: Khởi tạo caller `UsersApi`.
  - `apps/web/src/features/users/schemas.ts`: Zod schema xác thực sửa thông tin và đổi mật khẩu.
  - `apps/web/src/features/users/hooks/useMe.ts`: Query hook lấy thông tin tài khoản hiện tại.
  - `apps/web/src/features/users/hooks/useUpdateProfile.ts`: Mutation hook cập nhật thông tin cá nhân.
  - `apps/web/src/features/users/hooks/useChangePassword.ts`: Mutation hook đổi mật khẩu.
  - `apps/web/src/features/users/hooks/useAvatar.ts`: Mutation hooks tải và xóa ảnh đại diện.
  - `apps/web/src/features/users/components/AvatarUploader.tsx`: Component hiển thị avatar lớn, nút tải ảnh file input và nút xóa ảnh có dialog xác nhận.
  - `apps/web/src/features/users/components/ProfileCard.tsx`: Form sửa họ tên, SĐT, ngày sinh, giới tính; email và vai trò hiển thị chỉ đọc.
  - `apps/web/src/features/users/components/ChangePasswordCard.tsx`: Form đổi mật khẩu với cảnh báo thu hồi phiên.
  - `apps/web/src/features/users/components/AccountView.tsx`: Màn hình tổng thể kết hợp 2 card.
  - `apps/web/src/features/users/components/AccountView.test.tsx`: Test 4 trạng thái, sửa thành công, lỗi validation, lỗi SĐT trùng, đổi mật khẩu.
  - `apps/web/src/features/users/index.ts`: Re-export các component và hook.
- **Kiểm tra**: Chạy `npm --workspace @spa/web run test src/features/users`.

### Task 3: Feature `ai-assistant` (Trợ lý AI & Widget — UC-SPA-32)

- **File tạo/sửa**:
  - `apps/web/src/lib/api/aiAssistant.ts`: Khởi tạo caller `AiAssistantApi`.
  - `apps/web/src/features/ai-assistant/schemas.ts`: Zod schema câu hỏi (1–1000 ký tự).
  - `apps/web/src/features/ai-assistant/hooks/useAiHistory.ts`: Query hook lấy lịch sử cho khách hàng đăng nhập.
  - `apps/web/src/features/ai-assistant/hooks/useAiChat.ts`: Quản lý danh sách tin nhắn cục bộ, gửi câu hỏi, hiển thị typing indicator, xử lý lỗi và thử lại.
  - `apps/web/src/features/ai-assistant/components/AiMedicalDisclaimer.tsx`: Banner lưu ý không chẩn đoán y khoa (BR-AI-01).
  - `apps/web/src/features/ai-assistant/components/AiProductSuggestionCard.tsx`: Thẻ sản phẩm gợi ý kèm link chi tiết.
  - `apps/web/src/features/ai-assistant/components/AiBookingProposalCard.tsx`: Thẻ đề xuất lịch hẹn kèm nút mở form đặt lịch điền sẵn.
  - `apps/web/src/features/ai-assistant/components/ChatMessageBubble.tsx`: Hiển thị bong bóng chat người dùng và AI.
  - `apps/web/src/features/ai-assistant/components/ChatInputBar.tsx`: Ô nhập câu hỏi tự co giãn, phím Enter gửi, bộ đếm ký tự và quick prompts.
  - `apps/web/src/features/ai-assistant/components/AiChatView.tsx`: Khung chat đầy đủ trang.
  - `apps/web/src/features/ai-assistant/components/AiChatWidget.tsx`: Nút icon nổi góc dưới bên phải (`fixed bottom-6 right-6`) + cửa sổ popup chat tiện lợi cho khách vãng lai và khách hàng.
  - `apps/web/src/features/ai-assistant/components/AiChatView.test.tsx` & `AiChatWidget.test.tsx`.
  - `apps/web/src/features/ai-assistant/index.ts`.
- **Kiểm tra**: Chạy `npm --workspace @spa/web run test src/features/ai-assistant`.

### Task 4: Pages, Router & Tích hợp Layout

- **File tạo/sửa**:
  - `apps/web/src/pages/customer/AccountPage.tsx`: Thay thế placeholder `/account`.
  - `apps/web/src/pages/customer/AiAssistantPage.tsx`: Màn hình `/ai-assistant` cho khách hàng.
  - `apps/web/src/pages/public/AiAssistantPublicPage.tsx`: Màn hình `/ai-assistant` cho khách vãng lai.
  - `apps/web/src/components/layout/PublicLayout/PublicLayout.tsx`: Nhúng `<AiChatWidget />` ở góc dưới.
  - `apps/web/src/components/layout/CustomerLayout/CustomerLayout.tsx`: Nhúng `<AiChatWidget />`.
  - `apps/web/src/app/router.tsx`: Map các trang thật vào `customerPages` và `publicPages`, hỗ trợ truy cập `/account` cho các vai trò đã đăng nhập.
  - Cập nhật unit test navigation và router: `apps/web/src/test/app.test.tsx`.
- **Kiểm tra**: Chạy `npm --workspace @spa/web run test`.

### Task 5: Xác thực toàn diện & Cập nhật tài liệu

- **Kiểm tra**:
  - `npm --workspace @spa/web run typecheck`
  - `npm --workspace @spa/web run test` (toàn bộ test suite)
  - `npm run web:build` (Vite production build)
- **Tài liệu**:
  - Cập nhật `docs/frontend.md` danh sách route.
  - Cập nhật `docs/progress.md`: Đánh dấu `✅` cho Web của UC-SPA-04 và UC-SPA-32.

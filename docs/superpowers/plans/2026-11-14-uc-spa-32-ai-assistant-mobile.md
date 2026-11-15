# Kế hoạch triển khai UC-SPA-32: Trợ lý AI tư vấn dịch vụ trên Mobile

- **Use Case:** UC-SPA-32 — Trò chuyện với trợ lý AI tư vấn dịch vụ (Mobile `SCR-M16`).
- **Tài liệu đặc tả:** [docs/specs/ai-assistant.md](../../specs/ai-assistant.md).
- **Trạng thái:** Chờ duyệt (Gate 2).

---

## 1. Mục tiêu & Phạm vi

Triển khai màn hình hội thoại Trợ lý AI trên Mobile (`SCR-M16`, route `app/(customer)/ai-assistant.tsx`):
- Phục vụ cả khách vãng lai (`GUEST`) và khách hàng (`CUS`). Tài khoản `staff` và `owner` khi truy cập bị chặn chuyển sang `/forbidden`.
- Khi vào màn hình, tự động ẩn thanh bottom tab để dành trọn vẹn không gian cho tin nhắn và bàn phím ảo.
- Khách hàng đã đăng nhập: Tự động tải lịch sử hội thoại trước đó (`GET /me/ai/history`), tiếp tục đoạn chat.
- Khách vãng lai: Khung chat không lưu lịch sử trên server, có thông điệp mời đăng nhập để tra cứu lịch riêng.
- Hiển thị đầy đủ banner lưu ý y khoa cố định (BR-AI-01: không chẩn đoán y khoa, không kê thuốc).
- Trả lời thông minh kèm tối đa 3 thẻ gợi ý sản phẩm (`suggestions`, mở chi tiết dịch vụ/gói) và tối đa 3 thẻ đề xuất lịch hẹn (`bookingProposals`, mở màn hình đặt lịch điền sẵn thông tin).
- Hàng chip câu hỏi mẫu (Quick prompts) giúp khách hàng bắt đầu hội thoại nhanh chóng.
- Xử lý lỗi đầy đủ: `validation_error` (400), `rate_limited` (429), `ai_unavailable` (503 kèm nút gửi lại).

---

## 2. Global Constraints & Nguyên tắc kỹ thuật

- **Glossary & Directory:**
  - `src/features/ai-assistant/` gồm `components/`, `hooks/`, `screens/`, `schemas.ts`, `index.ts`.
  - Dùng named export; không dùng `any`, `@ts-ignore`, `as unknown as`.
- **UI & Theme:**
  - Dùng các primitive `AppScreen`, `AppText`, `AppButton`, `AppNotice` và bộ token `src/theme/` (Botanical Green: `colors.primary`, `colors.primarySoft`, `colors.card`, `colors.border`, `colors.warningSoft`, `colors.warningBorder`).
  - Vùng chạm tối thiểu $48\times 48$dp, nút chỉ có icon phải có `accessibilityLabel`.
  - Tối ưu cuộn tin nhắn và co giãn theo bàn phím bằng `KeyboardAvoidingView` kết hợp `useSafeAreaInsets`.
- **API & State:**
  - Gọi API qua client dùng chung `apps/mobile/src/lib/api/aiAssistant.ts`.
  - Server state quản lý bởi TanStack Query (`useAiHistory`, `useAiChat`).
  - Session state tích hợp với `useAuthStore` (`authenticated` vs `anonymous`).
- **Testing:**
  - Jest + React Native Testing Library (`AiAssistantScreen.test.tsx`), mock API qua `jest.spyOn`, bao phủ 6 test cases chuẩn (`AI-M-UI-T01` … `AI-M-UI-T06`).

---

## 3. Các bước triển khai chi tiết

### Task 1: API Wrapper cho Mobile
- **File:** `apps/mobile/src/lib/api/aiAssistant.ts`
- Cung cấp hàm `getAiAssistantApi()`, `callAiAssistant<T>()` tương tự các module khác (`orders.ts`, `appointments.ts`).
- Re-export `aiAssistantQueryKeys`, `aiAssistantErrorCodes`.

### Task 2: Schemas & Quick Prompts
- **File:** `apps/mobile/src/features/ai-assistant/schemas.ts`
- Định nghĩa `askAiSchema` với Zod (1–1000 ký tự).
- Danh sách gợi ý câu hỏi mẫu: `GUEST_QUICK_PROMPTS` và `CUSTOMER_QUICK_PROMPTS`.

### Task 3: Hooks
- **Files:**
  - `apps/mobile/src/features/ai-assistant/hooks/useAiHistory.ts`: TanStack Query hook gọi `GET /me/ai/history` khi user đã đăng nhập.
  - `apps/mobile/src/features/ai-assistant/hooks/useAiChat.ts`: TanStack Mutation hook gọi `POST /ai/chat`, quản lý state tin nhắn hội thoại cục bộ (hợp nhất tin nhắn cũ từ server + tin nhắn mới gửi + bong bóng phản hồi của AI + trạng thái lỗi).

### Task 4: Linh kiện giao diện (Components)
- **Files:**
  - `apps/mobile/src/features/ai-assistant/components/AiMedicalDisclaimer.tsx`: Banner lưu ý y khoa cố định (BR-AI-01).
  - `apps/mobile/src/features/ai-assistant/components/AiProductSuggestionCard.tsx`: Thẻ sản phẩm gợi ý kèm giá và link điều hướng.
  - `apps/mobile/src/features/ai-assistant/components/AiBookingProposalCard.tsx`: Thẻ đề xuất lịch hẹn kèm nút "Đặt lịch theo đề xuất" mở `/booking/new`.
  - `apps/mobile/src/features/ai-assistant/components/ChatMessageBubble.tsx`: Bong bóng tin nhắn người dùng và AI, hỗ trợ text nhiều đoạn và nút thử lại lỗi.
  - `apps/mobile/src/features/ai-assistant/components/TypingIndicator.tsx`: Chỉ báo đang soạn câu trả lời khi AI đang xử lý.
  - `apps/mobile/src/features/ai-assistant/components/ChatInputBar.tsx`: Thanh nhập liệu tự co giãn, bộ đếm 0/1000, nút gửi và hàng chip câu hỏi nhanh.

### Task 5: Màn hình chính & Định tuyến
- **Files:**
  - `apps/mobile/src/features/ai-assistant/screens/AiAssistantScreen.tsx`: Màn hình hoàn chỉnh tích hợp toàn bộ các linh kiện trên.
  - `apps/mobile/src/features/ai-assistant/index.ts`: Barrel export.
  - `apps/mobile/app/(customer)/ai-assistant.tsx`: Thay thế `PlaceholderScreen` bằng `AiAssistantScreen`.
  - `apps/mobile/app/(customer)/_layout.tsx`: Cấu hình `tabBarStyle: { display: 'none' }` và `headerShown: false` cho `ai-assistant`.

### Task 6: Kiểm thử tự động (Unit & Integration Tests)
- **File:** `apps/mobile/src/features/ai-assistant/screens/AiAssistantScreen.test.tsx`
  - `AI-M-UI-T01`: Khách vãng lai vào khung chat (lời chào, không gọi lịch sử, chip gợi ý sẵn sàng).
  - `AI-M-UI-T02`: Khách hàng đăng nhập (tải lịch sử cũ, đảo thứ tự hiển thị).
  - `AI-M-UI-T03`: Gửi câu hỏi hợp lệ (hiển thị bong bóng user, typing indicator, hiển thị phản hồi AI).
  - `AI-M-UI-T04`: Render thẻ gợi ý sản phẩm và điều hướng đúng.
  - `AI-M-UI-T05`: Render thẻ đề xuất lịch hẹn và điều hướng `/booking/new` với query params.
  - `AI-M-UI-T06`: Xử lý lỗi `503 ai_unavailable` có nút bấm thử lại câu hỏi và `429 rate_limited`.

### Task 7: Xác thực & Cập nhật tài liệu
- Chạy `npm run typecheck --workspace @spa/mobile`.
- Chạy `npm run test --workspace @spa/mobile -- src/features/ai-assistant`.
- Cập nhật [docs/mobile.md](../../mobile.md) và [docs/progress.md](../../progress.md).

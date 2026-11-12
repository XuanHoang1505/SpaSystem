# Đăng nhập, đăng ký, quên mật khẩu (mobile) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ứng dụng Android có đăng nhập thật (phiên lưu trong `expo-secure-store`, tự làm mới token), chặn khu vực theo vai trò kèm màn "Không có quyền truy cập", đăng xuất, và ba màn SCR-M06/M07/M08 (UC-SPA-01, 02, 03).

**Architecture:** Dùng lại `AuthApi`, `authErrorCodes` và kiểu trong `@spa/api-client`/`@spa/shared-types` (không đổi package). Mobile thêm `src/lib/api/client.ts` (ApiClient + Bearer + làm mới một lần khi 401), `src/lib/api/session.ts` (restore/refresh/signIn/signOut), `src/lib/auth/tokenStorage.ts` (bọc `expo-secure-store`), store Zustand mới, `RouteGuard` cho ba layout vai trò, rồi `src/features/auth/{screens,components,hooks}` cho ba màn.

**Tech Stack:** Expo SDK 57, Expo Router, React Native 0.86, TanStack Query, Zustand, React Hook Form + Zod, `expo-secure-store`, `lucide-react-native` + `react-native-svg`, Jest + Testing Library Native.

**Spec:** `docs/specs/auth.md` mục "Giao diện (mobile): UC-SPA-01, 02, 03".

## Global Constraints

- Thư mục `src/features/auth/` gồm `screens/`, `components/`, `hooks/`, `schemas.ts`, `errors.ts`, `index.ts`; file trong `app/` chỉ render screen; named export (trừ default export của route Expo Router).
- Chỉ dùng `AppScreen` và `App*` + token `src/theme`; vùng chạm ≥ 48dp; nút chỉ có icon có `accessibilityLabel`; không mã màu cứng.
- Native chỉ qua `npx expo install` (`expo-secure-store`, `react-native-svg`); `lucide-react-native` cài bằng npm, nhập từng icon. Chạy `npx expo install --check` sau khi cài. Không AsyncStorage, không eject.
- Mobile không gửi `X-Auth-Transport`; refresh token trong body. Không đổi backend.
- Lỗi theo `errors[].code`; văn bản tiếng Việt có dấu; giờ theo `Asia/Ho_Chi_Minh`.
- TDD: test cạnh file, `fetch` giả, mock `expo-secure-store` và `expo-router`.
- Kiểm tra: `npm run lint`, `npm run typecheck`, `npm run test --workspace @spa/mobile`, `npm run mobile:check`, `npm run mobile:export`, prettier check file của task.
- Cập nhật `docs/mobile.md`, `docs/progress.md` (cột Mobile UC-01/02/03), `apps/mobile/CLAUDE.md` nếu đổi quy tắc. Không commit (người dùng tự chạy git); chỉ format file của task.

## Review Focus

- Hai request cùng gặp 401 chỉ gọi `/auth/refresh` một lần, và refresh token mới (đã xoay vòng) được ghi đè vào secure store trước khi gửi lại (AUTH-UI-T64).
- Mất mạng lúc khởi động không được xóa refresh token (AUTH-UI-T63).
- `redirect` trỏ ra ngoài app hoặc sang khu vực vai trò khác bị bỏ qua (AUTH-UI-T60).
- Nút quay lại Android từ màn "Không có quyền truy cập" không đưa lại vào khu vực bị chặn (`router.replace`).
- Đặt lại mật khẩu khi đang có phiên thì phiên bị xóa cục bộ (AUTH-UI-T68).

---

### Task 1: Phụ thuộc và cấu hình test

`npx expo install expo-secure-store react-native-svg` (trong `apps/mobile`), `npm install lucide-react-native --workspace @spa/mobile`, `npx expo install --check`. Jest: thêm `lucide-react-native|react-native-svg` vào `transformIgnorePatterns`; `src/test/setup.ts` mock `expo-secure-store` (bộ nhớ trong) và mở rộng mock `expo-router` (`router.replace`, `useLocalSearchParams`, `useSegments`, `Redirect`). Thêm component `AppNotice` (`tone: 'error' | 'info' | 'success'`, `accessibilityRole="alert"`) và `AppTextButton` (nút dạng link ≥ 48dp) kèm test trong `src/test/components.test.tsx`.

### Task 2: Phiên đăng nhập

- `src/lib/auth/tokenStorage.ts`: `readRefreshToken()`, `saveRefreshToken(token)`, `clearRefreshToken()` (khóa `spa.refresh_token`).
- `src/stores/authStore.ts`: `{ status, user, accessToken, accessTokenExpiresAtUtc, setSession(result), endSession() }`, `homePathFor(role)`, `canAccessRole(user, role)`.
- `src/lib/api/session.ts`: `getApiClient()`, `getAuthApi()`, `restoreSession()`, `refreshSession(): Promise<boolean>` (dùng chung lời gọi đang chạy), `signIn(result)`, `signOut()`; `src/lib/api/client.ts` gắn Bearer và làm mới một lần khi 401.
- `src/lib/auth/redirect.ts`: `safeRedirect(redirect, role)`.
- Test AUTH-UI-T62, T63, T64, T66 trong `src/lib/api/session.test.ts`; `safeRedirect` có test riêng.

### Task 3: RouteGuard, màn "Không có quyền truy cập", màn chính

`src/components/auth/RouteGuard.tsx` bọc `(customer)`, `(staff)`, `(owner)` `_layout.tsx`; `app/forbidden.tsx` render `src/features/auth/screens/ForbiddenScreen.tsx`; `AppProviders` gọi `restoreSession()` một lần và `queryClient.clear()` khi phiên đổi; `HomeScreen` đổi nút theo trạng thái phiên; nút "Đăng xuất" (`LogOutButton`) ở tab Cá nhân và Tổng quan nhân viên/chủ spa. Test AUTH-UI-T65 và màn chính.

### Task 4: SCR-M06 Đăng nhập

`features/auth/schemas.ts` (login, register, OTP, email, mật khẩu mới: cùng quy tắc BR-AUTH-10 như web), `errors.ts` (`authErrorKind`), `components/PasswordInput.tsx` (icon `Eye`/`EyeOff`), `hooks/useLogin.ts`, `screens/LoginScreen.tsx`; `app/(public)/login.tsx`. Test AUTH-UI-T60, T61, T69.

### Task 5: SCR-M07 Đăng ký + OTP

`components/OtpInput.tsx`, `components/OtpCountdown.tsx`, `hooks/useCountdown.ts`, `hooks/useRegistration.ts`, `screens/RegisterScreen.tsx`; `app/(public)/register.tsx`. Test AUTH-UI-T67.

### Task 6: SCR-M08 Quên mật khẩu

`components/StepProgress.tsx`, `hooks/usePasswordReset.ts`, `screens/ForgotPasswordScreen.tsx`; route mới `app/(public)/forgot-password.tsx` + `Stack.Screen` trong `(public)/_layout.tsx`. Bỏ `AuthPlaceholderScreen.tsx`. Test AUTH-UI-T68.

### Task 7: Kiểm tra và tài liệu

Chạy toàn bộ lệnh kiểm tra ở Global Constraints; cập nhật `docs/mobile.md` (route `forgot-password`, `forbidden`, phiên đăng nhập, thư viện icon), `docs/progress.md`, `CLAUDE.md` (dòng mô tả mobile); kiểm tra tay trên Android emulator với `npm run db:up`, `npm run db:seed:demo`, `npm run dev`.

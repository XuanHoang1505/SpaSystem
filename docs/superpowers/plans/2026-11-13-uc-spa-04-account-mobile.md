# Tài khoản của tôi (mobile) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ba tab hồ sơ mobile đang có cho khách, nhân viên và chủ spa xem và sửa thông tin của chính mình, đổi mật khẩu, đổi hoặc xóa ảnh đại diện (UC-SPA-04).

**Architecture:** Không thêm route. `AccountPanel` (hai khối form) nằm trong cuộn của tab hiện tại, phía trên lối tắt và Đăng xuất. Khách chưa đăng nhập giữ màn chào và không gọi `GET /me`. Dùng `UsersApi` và `MeDto` sẵn có. Chỉ mở `uploadAvatar` để nhận file React Native `{ uri, name, type }` bên cạnh `Blob`.

**Tech Stack:** Expo SDK 57, Expo Router, React Native, TanStack Query, Zustand, React Hook Form + Zod, `expo-image-picker`, `@react-native-community/datetimepicker`, Jest + Testing Library Native, Vitest cho `@spa/api-client`.

**Spec:** `docs/specs/auth.md` mục "Giao diện (mobile): UC-SPA-04". Đã chốt 13/11/2026: form trên tab hiện có, không `app/account.tsx`. Không có Stitch, dựng theo spec.

## Global Constraints

- Thư mục `src/features/users/` (kebab không áp dụng vì glossary là `users`) gồm `screens/`, `components/`, `hooks/`, `schemas.ts`, `index.ts`. Named export. File `app/**/profile.tsx` chỉ render screen.
- Chỉ `AppScreen` và `App*` cùng token `src/theme`. Vùng chạm ≥ 48dp. Nút chỉ có icon có `accessibilityLabel`. Không `any`, `@ts-ignore`, `as unknown as`.
- Native chỉ qua `npx expo install` từ `apps/mobile`: `expo-image-picker`, `@react-native-community/datetimepicker`. Sau đó `npx expo install --check`. Không eject.
- Gọi API: `api-client` → `src/lib/api/users.ts` → hook → component. Component không gọi `fetch`. Lỗi theo `ApiClientError.errors[].code`, không theo `message` trừ khi spec bảo hiện `message` của server.
- Văn bản tiếng Việt có dấu. Ngày sinh là `yyyy-MM-dd`, hiện bằng `formatLocalDate`. Ngày tham gia là phần ngày của `formatDateTimeUtc` (10 ký tự đầu, giờ Việt Nam).
- Email và số điện thoại chỉ đọc. `PUT /me` gửi lại đúng `me.phoneNumber`. Không đổi backend, không thêm kiểu trong `shared-types`.
- Đổi mật khẩu thành công không gọi `signOut`. Ảnh chỉ từ thư viện, không camera.
- TDD: test cạnh file. Web/api-client dùng Vitest. Mobile dùng Jest, `fetch` giả, mock `expo-router`, `expo-image-picker`, `@react-native-community/datetimepicker`.
- Kiểm tra: `npm run test --workspace @spa/api-client`, `npm run test --workspace @spa/mobile`, `npm run typecheck`, `npm run lint`, `npm run mobile:check`, prettier trên file của task.
- Cập nhật `docs/mobile.md` và `docs/progress.md` (cột Mobile của UC-SPA-04). Không commit, không push.

## Review Focus

- Khách chưa đăng nhập không được gọi `GET /me` (dễ đặt `useMe` ở cha của cả hai nhánh).
- Đổi mật khẩu `204` không được `signOut` (access token còn hạn).
- Ảnh thiếu `fileSize` vẫn được gửi. Ảnh trên 5 MB hoặc không phải JPEG/PNG/WebP thì không gửi.
- Bấm lại giới tính đang chọn thì gửi `gender: null`.
- Ngày sinh trước `1900-01-01` hoặc sau hôm nay theo giờ Việt Nam bị chặn trước `PUT`.

---

### Task 1: `uploadAvatar` nhận file React Native

**Files:**
- Modify: `packages/api-client/src/users.ts`
- Test: `packages/api-client/src/users.test.ts`

**Interfaces:**
- Consumes: `UsersApi`, `ApiClient`
- Produces: `AvatarUploadFile = Blob | { uri: string; name: string; type: string }`. `uploadAvatar(file: AvatarUploadFile, options?: RequestOptions): Promise<ApiResponse<AvatarUrlDto>>`. `usersErrorCodes` thêm `currentPasswordIncorrect: 'current_password_incorrect'`, `passwordUnchanged: 'password_unchanged'`, `imageRequired: 'image_required'`, `imageTooLarge: 'image_too_large'`, `imageTypeNotSupported: 'image_type_not_supported'`, `imageStorageUnavailable: 'image_storage_unavailable'`. Giữ mọi khóa cũ.

- [ ] **Step 1: Write the failing test**

`users.test.ts` theo kiểu `auth.test.ts`. Hai case AUTH-UI-T70:

- `new File(['x'], 'a.jpg', { type: 'image/jpeg' })` → `POST` URL kết thúc bằng `/api/v1/me/avatar`, body là `FormData`, `FormData.prototype.append` được gọi với `('file', file)`.
- `{ uri: 'file:///a.jpg', name: 'a.jpg', type: 'image/jpeg' }` → `append` được gọi với chính object đó, không phải chuỗi.
- Header không có `Content-Type: application/json`.

Một expect cho sáu mã lỗi mới.

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npm run test --workspace @spa/api-client -- src/users.test.ts`

Expected: FAIL vì `uploadAvatar` chưa nhận object `{ uri, name, type }`.

- [ ] **Step 3: Implement**

Trong `uploadAvatar`, nếu `file instanceof Blob` thì `form.append('file', file)`. Nhánh còn lại `form.append('file', file as Blob)` (một lần ép kiểu, không `as unknown as`): React Native nhận `{ uri, name, type }`. Web vẫn truyền `File`.

- [ ] **Step 4: Run the test and confirm it passes**

Run: `npm run test --workspace @spa/api-client -- src/users.test.ts`

Expected: PASS

### Task 2: Phụ thuộc, mock Jest, lớp gọi API và schema

**Files:**
- Modify: `apps/mobile/package.json`, `apps/mobile/jest.config.cjs`, `apps/mobile/src/test/setup.ts`
- Create: `apps/mobile/src/lib/api/users.ts`, `apps/mobile/src/features/users/schemas.ts`, `apps/mobile/src/features/users/avatarFile.ts`
- Test: `apps/mobile/src/features/users/avatarFile.test.ts`, `apps/mobile/src/features/users/schemas.test.ts`

**Interfaces:**
- Consumes: `getApiClient` từ `src/lib/api/session.ts` (cùng kiểu `getOrdersApi`)
- Produces:
  - `getUsersApi(): { api?: UsersApi; error?: string }`
  - `callUsers<T>(call: (api: UsersApi) => Promise<ApiResponse<T>>): Promise<T>`
  - `callUsersVoid(call: (api: UsersApi) => Promise<void>): Promise<void>`
  - `profileSchema`, `changePasswordSchema` (cùng câu Zod với `apps/web/src/features/users/schemas.ts`, cộng biên ngày)
  - `avatarFileError(asset: { mimeType?: string | null; fileSize?: number | null }): string | null`

- [ ] **Step 1: Install and mock**

Từ `apps/mobile`: `npx expo install expo-image-picker @react-native-community/datetimepicker`, rồi `npx expo install --check`. Jest `transformIgnorePatterns` đã có `@react-native(-community)?` và `expo`. Trong `src/test/setup.ts` mock:

- `expo-image-picker`: `requestMediaLibraryPermissionsAsync` mặc định `{ granted: true }`, `launchImageLibraryAsync` mặc định `{ canceled: true, assets: [] }`.
- `@react-native-community/datetimepicker`: component gọi `onChange(null, new Date('1992-04-03T00:00:00'))` khi bấm `testID="date-picker"`.

- [ ] **Step 2: Write failing tests for the pure rules**

`avatarFileError`:

- `image/jpeg`, `fileSize` 1024 → `null`
- `fileSize` thiếu → `null` (vẫn cho gửi)
- `fileSize` `5 * 1024 * 1024 + 1` hoặc `mimeType` `image/gif` hoặc `mimeType` null → `'Ảnh phải là JPEG, PNG hoặc WebP và không quá 5 MB.'`
- Chấp nhận `image/jpeg`, `image/png`, `image/webp`.

`profileSchema` / `changePasswordSchema`:

- họ tên `''` hoặc 101 ký tự sau trim → lỗi
- `dateOfBirth` `'1899-12-31'` và một ngày sau hôm nay ở `Asia/Ho_Chi_Minh` → `'Ngày sinh không được ở tương lai.'` cho ngày sau hôm nay, và `'Ngày sinh không được trước 01/01/1900.'` cho ngày quá sớm. `'1900-01-01'` và `null` hợp lệ
- mật khẩu `'1234567'`, `'12345678'` (không chữ), xác nhận lệch → lỗi, không cần API
- mật khẩu mới trùng mật khẩu hiện tại → lỗi trên `newPassword`, câu `'Mật khẩu mới phải khác mật khẩu hiện tại.'`

So sánh ngày bằng chuỗi `yyyy-MM-dd` của hôm nay theo `Asia/Ho_Chi_Minh`, không `new Date(val)` rồi so giờ máy.

- [ ] **Step 3: Run the tests and confirm they fail**

Run: `npm run test --workspace @spa/mobile -- src/features/users/avatarFile.test.ts src/features/users/schemas.test.ts`

Expected: FAIL vì module chưa có.

- [ ] **Step 4: Implement `users.ts`, `schemas.ts`, `avatarFile.ts`**

`callUsers` ném `Error('Configuration Error')` khi không có client, rồi trả `response.data`. `callUsersVoid` cho `changePassword` và `deleteAvatar`. Schema mật khẩu chép quy tắc web (`8–128`, có `\p{L}` và `\d`).

- [ ] **Step 5: Run the tests and confirm they pass**

Expected: PASS

### Task 3: Hook hồ sơ

**Files:**
- Create: `apps/mobile/src/features/users/hooks/useMe.ts`, `useUpdateProfile.ts`, `useChangePassword.ts`, `useAvatar.ts`
- Test: `apps/mobile/src/features/users/hooks/useUpdateProfile.test.ts`

**Interfaces:**
- Consumes: `callUsers`, `callUsersVoid`, `usersQueryKeys`, `useAuthStore`
- Produces:
  - `useMe()` → `useQuery` key `usersQueryKeys.me()`, `queryFn` = `callUsers((api) => api.getMe())`
  - `useUpdateProfile()` → mutation `updateMe`. `onSuccess(me)`: `setQueryData(usersQueryKeys.me(), me)`, `invalidateQueries` cùng key, `useAuthStore.setState` chỉ đổi `user.fullName` khi `state.user` có
  - `useChangePassword()` → `changePassword`, không đụng cache, không `signOut`
  - `useUploadAvatar()` / `useDeleteAvatar()` → ghi `avatarUrl` mới hoặc `null` vào cache `me` nếu cache đang là `MeDto`

- [ ] **Step 1: Write the failing hook test**

Bọc `QueryClientProvider`. Giả `callUsers` / `callUsersVoid`.

- `useUpdateProfile` thành công với `fullName: 'Lan'` → cache `me` là DTO trả về và `authStore.user.fullName` là `'Lan'`.
- `useChangePassword` resolve → `endSession` / `signOut` không được gọi (spy `useAuthStore.getState().endSession`).
- `useDeleteAvatar` khi cache có `avatarUrl` → cache còn lại, `avatarUrl` là `null`.

- [ ] **Step 2: Run it and confirm FAIL, then implement, then confirm PASS**

Run: `npm run test --workspace @spa/mobile -- src/features/users/hooks/useUpdateProfile.test.ts`

### Task 4: `AccountPanel`

**Files:**
- Create: `apps/mobile/src/features/users/components/AccountPanel.tsx`, `PasswordField.tsx`, `DateOfBirthField.tsx`
- Test: `apps/mobile/src/features/users/components/AccountPanel.test.tsx`
- Modify: `apps/mobile/src/features/users/index.ts` (named exports)

**Interfaces:**
- Consumes: hook Task 3, schema Task 2, `avatarFileError`, `expo-image-picker`, DateTimePicker mock
- Produces: `export function AccountPanel({ me }: { me: MeDto })`

`me` mẫu trong test:

```ts
const me = {
  id: 'u1', fullName: 'Nguyễn Lan', email: 'lan@example.com', phoneNumber: '0901234567',
  role: 'customer' as const, status: 'active' as const, avatarUrl: null,
  dateOfBirth: null, gender: null, createdAtUtc: '2026-11-01T02:00:00Z',
};
```

- [ ] **Step 1: Write the failing screen tests**

AUTH-UI-T71 đến T77, render `AccountPanel` với `me` (query đã xong). Các case:

- Hiện email, `0901234567`, nhãn `Khách hàng`, dòng "Số điện thoại dùng để đăng nhập, không đổi ở đây.", "Chưa cập nhật" cho ngày sinh, không nút giới tính nào được chọn (`accessibilityState.selected`). Ngày tham gia là 10 ký tự đầu của `formatDateTimeUtc(me.createdAtUtc)`.
- Họ tên xóa trắng rồi bấm "Lưu thông tin" → không gọi `updateMe`.
- Đổi tên thành `Lan`, bấm lưu → `updateMe` nhận `{ fullName: 'Lan', phoneNumber: '0901234567', dateOfBirth: null, gender: null }`. Có `AppNotice` "Đã lưu thông tin."
- `ApiClientError` `validation_error` field `DateOfBirth` message `Sai ngày` → chữ đó dưới ô ngày. `phone_exists` → "Số điện thoại đã được dùng cho tài khoản khác."
- Mật khẩu mới `12345678`, xác nhận `12345678` → không gọi API. Rồi đủ mạnh và khớp, mutation `204` → ba ô trống, "Đổi mật khẩu thành công. Các phiên khác đã được thu hồi.", `signOut` không gọi.
- `current_password_incorrect` dưới "Mật khẩu hiện tại" với "Mật khẩu hiện tại không đúng." `password_unchanged` dưới "Mật khẩu mới". `rate_limited` → "Bạn đã thao tác quá nhiều lần. Vui lòng thử lại sau ít phút."
- `user_not_found` khi lưu → "Không tìm thấy tài khoản." Nút "Đăng xuất" của tab vẫn ở ngoài panel.
- Bấm "Nữ" rồi "Lưu thông tin" → `gender: 'female'`. Bấm "Nữ" lần nữa rồi lưu → `gender: null`.
- Bấm "Chưa cập nhật", mock picker trả `1992-04-03` → nút hiện `03/04/1992`. "Xóa ngày sinh" rồi lưu → `dateOfBirth: null`.
- `launchImageLibraryAsync` trả asset `image/gif` → không `uploadAvatar`, notice câu 5 MB. Asset `image/jpeg` không `fileSize` → có gọi `uploadAvatar` với `{ uri, name, type }`. `image_storage_unavailable` → "Kho ảnh tạm không dùng được. Vui lòng thử lại sau." và ảnh cũ còn. Có `avatarUrl` thì hiện "Xóa ảnh"; xác nhận Alert nút "Xóa" gọi `deleteAvatar`.
- `requestMediaLibraryPermissionsAsync` trả `{ granted: false }` → "Ứng dụng cần quyền thư viện ảnh để đổi ảnh đại diện." và không mở thư viện.

Nút Eye có `accessibilityLabel` "Hiện mật khẩu" / "Ẩn mật khẩu". Ảnh `accessible={false}`.

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npm run test --workspace @spa/mobile -- src/features/users/components/AccountPanel.test.tsx`

- [ ] **Step 3: Implement the panel**

Một cột trong `AppCard` hoặc `View` dùng token. Khối 1 rồi khối 2. Nhãn vai trò: `customer` → "Khách hàng", `staff` → "Nhân viên", `owner` → "Chủ spa". Giới tính là ba nút "Nam" / "Nữ" / "Khác". DateTimePicker chỉ mount khi mở, `maximumDate` là cuối hôm nay theo giờ Việt Nam, `minimumDate` là `1900-01-01`. Đổi ảnh: `launchImageLibraryAsync` với `mediaTypes: ['images']`, không camera. Map lỗi server: `field` PascalCase → chữ thường ký tự đầu (`DateOfBirth` → `dateOfBirth`). Ô không khớp hoặc mã không có ô → `AppNotice`. Khi mutation pending, ô của khối đó `editable={false}` và nút `loading`.

- [ ] **Step 4: Run the test and confirm it passes**

### Task 5: Gắn vào ba tab hiện có

**Files:**
- Create: `apps/mobile/src/features/users/screens/CustomerProfileScreen.tsx`, `StaffProfileScreen.tsx`, `OwnerProfileScreen.tsx`, `SignedInProfile.tsx`
- Modify: `apps/mobile/app/(customer)/profile.tsx`, `apps/mobile/app/(staff)/profile.tsx`, `apps/mobile/app/(owner)/profile.tsx` (chỉ còn default export render screen)
- Test: `apps/mobile/src/features/users/screens/CustomerProfileScreen.test.tsx`

**Interfaces:**
- Consumes: `AccountPanel`, `useMe`, lối tắt đang hard-code trong ba file profile
- Produces: `SignedInProfile({ shortcuts }: { shortcuts: ReactNode })`. `useMe` chỉ được gọi trong `SignedInProfile`.

- [ ] **Step 1: Write the failing test AUTH-UI-T78**

- Render `CustomerProfileScreen` khi store `anonymous` → thấy "Đăng nhập", không thấy "Lưu thông tin", `fetch` không bị gọi.
- Store khách đã đăng nhập, `GET /me` trả `me` → thấy "Lưu thông tin", "Đổi mật khẩu", "Lịch hẹn của tôi", "Đăng xuất".
- `StaffProfileScreen` → "Lịch làm việc của tôi" vẫn còn, và có "Lưu thông tin".
- `OwnerProfileScreen` → "Báo cáo doanh thu & KPI" vẫn còn, và có "Lưu thông tin".
- `GET /me` pending → thấy `AppLoader` và vẫn thấy tên từ `authStore`. `GET /me` lỗi → "Thử lại".

Giữ nguyên thứ tự và nhãn nút lối tắt đang có trong ba file profile. Không thêm "Thông báo".

- [ ] **Step 2: Run it and confirm FAIL, then move the UI, then confirm PASS**

`CustomerProfileScreen`: không `user` thì nhánh chào y như file hiện tại. Có `user` thì `SignedInProfile` với lối tắt khách, rồi `LogOutButton`. Staff và owner luôn `SignedInProfile` vì `RouteGuard` đã chặn khách. Đầu tab: ảnh 60dp từ `me.avatarUrl` khi query đã có data, không thì hai chữ cái đầu của `user.fullName`.

- [ ] **Step 3: Docs and the full check**

`docs/mobile.md`: ba tab hồ sơ đã có form UC-SPA-04, không còn câu tab này là placeholder. `docs/progress.md`: cột Mobile của UC-SPA-04 thành ✅, ghi ba tab và ngày. Chạy `npm run test --workspace @spa/api-client`, `npm run test --workspace @spa/mobile`, `npm run typecheck`, `npm run lint`, `npm run mobile:check`. Sửa format của file đã sửa. Không commit.

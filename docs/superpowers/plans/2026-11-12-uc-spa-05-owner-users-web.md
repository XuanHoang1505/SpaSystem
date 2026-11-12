# Quản lý tài khoản người dùng (web) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chủ spa tìm, xem, sửa (họ tên, ngày sinh, giới tính) và khóa/mở khóa tài khoản ở `/owner/accounts` (UC-SPA-05, SCR-W40).

**Architecture:** `OwnerUsersApi` + `ownerUsersQueryKeys` trong `packages/api-client/src/users.ts` → `lib/api/users.ts` (`callOwnerUsers`, `callOwnerUsersVoid`) → hooks `features/users/hooks/useOwnerUsers.ts` → components `features/users/components/owner/*` theo mẫu `OwnerOrdersView` (khung thẻ, breadcrumb, `PageHeader`, toolbar, `DataTable`, Sheet, Dialog, AlertDialog).

**Tech Stack:** React 19, TanStack Query, React Hook Form + Zod, shadcn/ui, Vitest.

**Spec:** `docs/specs/auth.md` mục "SCR-W40 — Quản lý tài khoản người dùng".

## Global Constraints

- Tên theo glossary (`users`); named export; không `any`, `@ts-ignore`, `as unknown as`.
- Chỉ `components/ui` + `components/shared`; bảng dùng `DataTable` + `useTableSearchParams`; màu bằng token; icon `lucide-react`.
- Lỗi theo `errors[].code`; 4 trạng thái; tiếng Việt có dấu; ngày theo `lib/formatting`.
- SĐT, email, vai trò chỉ đọc; `PUT /users/{id}` gửi lại `phoneNumber` hiện có (quyết định 12/11/2026).
- Không đổi backend. Không commit. Chỉ format file của task.
- Cập nhật `routes.ts`, `navigation.ts`, `docs/frontend.md`, `docs/progress.md`.

## Review Focus

- Chủ spa đang đăng nhập không thấy "Khóa tài khoản" ở dòng của mình, nhưng vẫn thấy "Sửa thông tin" (AUTH-UI-T45).
- Ngày sinh xóa trắng phải gửi `null`, không gửi `''` (AUTH-UI-T44).
- Tài khoản `inactive` không có nút khóa/mở ở cả bảng lẫn Sheet (AUTH-UI-T43).
- Trang vượt quá `totalPages` sau khi lọc tự về trang cuối (như `OwnerOrdersView`).
- `user_not_found` khi khóa đóng Sheet và làm mới danh sách (AUTH-UI-T46).

---

### Task 1: Hợp đồng + `OwnerUsersApi`

`shared-types/src/users.ts`: `UserListItem`, `UserStaffInfo`, `UserDetail`, `UserFilterParams`, `ChangeUserStatusRequest`. `api-client/src/users.ts`: `OwnerUsersApi.list(params)`, `get(id)`, `update(id, body)`, `changeStatus(id, status): Promise<void>`; `ownerUsersQueryKeys.all/list/detail`; `usersErrorCodes` thêm `phoneExists`, `userNotFound`, `cannotLockSelf`, `accountInactive`. Test AUTH-UI-T40 trong `packages/api-client/src/ownerUsers.test.ts`.

### Task 2: `lib/api` + hooks + labels + schema

`callOwnerUsers`, `callOwnerUsersVoid`; `useOwnerUsers(params)`, `useOwnerUser(id | null)`, `useUpdateOwnerUser`, `useChangeUserStatus`; `features/users/userStatus.ts` (`userStatusBadge`, `userStatuses`, `genderLabels`); `ownerUserSchema` (`fullName` 1–100, `dateOfBirth` không ở tương lai, `gender`).

### Task 3: Components + trang + route

`OwnerUsersView`, `UserFilterToolbar`, `UserTable`, `UserDetailSheet`, `EditUserDialog`, `ChangeUserStatusDialog`; `pages/owner/OwnerAccountsPage.tsx`; route `/owner/accounts` + icon `UserCogIcon`. Test AUTH-UI-T41..T46 trong `OwnerUsersView.test.tsx` qua `renderApp('/owner/accounts')`.

### Task 4: Kiểm tra + tài liệu

`npm run lint`, `typecheck`, `test`, `web:build`, prettier check file của task; cập nhật `docs/frontend.md`, `docs/progress.md`, `CLAUDE.md`.

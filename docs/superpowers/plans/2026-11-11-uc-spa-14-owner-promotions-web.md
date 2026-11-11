# Owner Promotions Management, Web (UC-SPA-14) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the owner promotions management screen (`SCR-W35` at `/owner/promotions`), replacing `PlaceholderPage` with full management capabilities: `DataTable` list with status & date range filters, detail drawer (`PromotionDetailSheet`), create/edit modal (`PromotionFormDialog` with BR-PRM-06 lock for used promotions), and status toggle (`TogglePromotionStatusDialog`).

**Architecture:**
- **Contracts:** `@spa/shared-types` (`promotions.ts` with `DiscountType`, `PromotionStatus`, `PromotionDto`, `SavePromotionRequest`, `ChangePromotionStatusRequest`, `PromotionSearchParams`).
- **API Client:** `@spa/api-client` (`promotions.ts` with `PromotionsApi` and error codes).
- **Web Lib & Policies:** `apps/web/src/lib/api/promotions.ts` (`callPromotions`, `callPromotionsVoid`).
- **Feature `promotions`:** `apps/web/src/features/promotions/` (schemas, hooks, status formatters, `components/owner/` containing table, filter toolbar, detail sheet, promotion form dialog, toggle status dialog, and `OwnerPromotionsView`).
- **Pages & Routes:** `apps/web/src/pages/owner/OwnerPromotionsPage.tsx` registered in `apps/web/src/app/router.tsx` under `ownerPages`.

**Tech Stack:** React 19, TypeScript strict, TanStack Query, React Router, React Hook Form + Zod, Tailwind v4 + shadcn/ui, Lucide Icons, Vitest + Testing Library.

**Spec:** `docs/specs/orders.md`, section "Giao diện web: Quản lý chương trình khuyến mãi (UC-SPA-14, SCR-W35)".

---

## Global Constraints

- Names follow `docs/domain/glossary.md`: `promotions`.
- Component exports must be named exports. No `any`, `@ts-ignore`, or `as unknown as`.
- UI composed exclusively from `components/ui` (shadcn) and `components/shared` (`DataTable`, `PageHeader`, `StatusBadge`, `EmptyState`, `ErrorState`). The tables must use `DataTable`; never a raw `<table>`.
- Style using Tailwind classes with tokens from `styles/theme.css`: no hardcoded colors (`text-[#...]`), no `bg-white`/`text-black`.
- Calling pattern: `@spa/api-client` → `lib/api` → hook → component. Components never call `fetch` directly.
- Invalidation:
  - Promotion mutations invalidate `promotionQueryKeys.all`, `promotionQueryKeys.list`, `promotionQueryKeys.detail(id)`.
- Error handling matches `ApiClientError.errors[].code`. Form errors map directly to inputs.
- Vietnamese copy with diacritics. Currency formatted as `vi-VN` đ (`formatCurrency`). Dates formatted with `formatLocalDate`.
- Supports light and dark modes in `OwnerLayout`.
- **CRITICAL CONSTRAINT:** Under NO circumstances should any test files (`*.test.ts`, `*.test.tsx`) be committed to git.

---

## File Structure

| File | Action | Responsibility |
| --- | --- | --- |
| `packages/shared-types/src/promotions.ts` | Create | Export `DiscountType`, `PromotionStatus`, `PromotionDto`, `SavePromotionRequest`, `ChangePromotionStatusRequest`, `PromotionSearchParams` |
| `packages/shared-types/src/index.ts` | Modify | Re-export promotions contracts |
| `packages/api-client/src/promotions.ts` | Create | Export `PromotionsApi` and `promotionErrorCodes` |
| `packages/api-client/src/index.ts` | Modify | Re-export `PromotionsApi` and `promotionErrorCodes` |
| `packages/api-client/src/promotions.test.ts` | Create | Unit tests for promotions API client methods (uncommitted) |
| `apps/web/src/lib/api/promotions.ts` | Create | Add `callPromotions<T>` and `callPromotionsVoid` wrappers |
| `apps/web/src/features/promotions/promotionQueryKeys.ts` | Create | TanStack Query keys for promotions |
| `apps/web/src/features/promotions/promotionStatus.ts` | Create | Status & discount type badges, helpers, and formatters |
| `apps/web/src/features/promotions/schemas.ts` | Create | Zod schema for promotion create/edit form |
| `apps/web/src/features/promotions/hooks/usePromotions.ts` | Create | Query hooks for promotions search and detail |
| `apps/web/src/features/promotions/hooks/usePromotionMutations.ts` | Create | Mutation hooks for create, update, change status |
| `apps/web/src/features/promotions/components/owner/PromotionFilterToolbar.tsx` | Create | Status dropdown, date range, reset button, "Tạo khuyến mãi" CTA |
| `apps/web/src/features/promotions/components/owner/PromotionTable.tsx` | Create | `DataTable` for promotions with code, discount, period, usage, actions |
| `apps/web/src/features/promotions/components/owner/PromotionDetailSheet.tsx` | Create | Detail drawer for promotion info, conditions, usage stats, and footer actions |
| `apps/web/src/features/promotions/components/owner/PromotionFormDialog.tsx` | Create | Modal dialog to create or edit promotion with BR-PRM-06 lock |
| `apps/web/src/features/promotions/components/owner/TogglePromotionStatusDialog.tsx` | Create | Confirmation dialog to toggle active $\leftrightarrow$ stopped |
| `apps/web/src/features/promotions/components/owner/OwnerPromotionsView.tsx` | Create | Container view for `/owner/promotions` (SCR-W35) |
| `apps/web/src/features/promotions/index.ts` | Create | Public exports of features/promotions |
| `apps/web/src/pages/owner/OwnerPromotionsPage.tsx` | Create | Page component for `/owner/promotions` |
| `apps/web/src/app/router.tsx` | Modify | Wire `/owner/promotions` in `ownerPages` |
| `docs/progress.md` | Modify | Mark UC-SPA-14 Web as ✅ |
| `docs/frontend.md` | Modify | Document `/owner/promotions` feature |

---

## Tasks

### Task 1: Contracts in `@spa/shared-types`
- [ ] Create `packages/shared-types/src/promotions.ts`:
  - `DiscountType = 'percentage' | 'fixed_amount'`.
  - `PromotionStatus = 'active' | 'stopped'`.
  - `PromotionDto`: `{ id: string; code: string; description: string | null; discountType: DiscountType; discountValue: number; minOrderAmount: number; maxDiscountAmount: number | null; startsAtUtc: string; endsAtUtc: string; perCustomerLimit: number | null; usageLimit: number | null; status: PromotionStatus; usedCount: number }`.
  - `SavePromotionRequest`: `{ code?: string | null; description?: string | null; discountType?: DiscountType | null; discountValue?: number | null; minOrderAmount?: number | null; maxDiscountAmount?: number | null; startsAtUtc?: string | null; endsAtUtc?: string | null; perCustomerLimit?: number | null; usageLimit?: number | null }`.
  - `ChangePromotionStatusRequest`: `{ status?: PromotionStatus | null }`.
  - `PromotionSearchParams`: `PaginationParams` + `{ status?: PromotionStatus; fromDate?: string; toDate?: string }`.
- [ ] Export in `packages/shared-types/src/index.ts`.
- [ ] Verify: `npm run typecheck --workspace=@spa/shared-types`.

### Task 2: API Client in `@spa/api-client`
- [ ] Create `packages/api-client/src/promotions.ts`:
  - `PromotionsApi`:
    - `search(params?: PromotionSearchParams, signal?: AbortSignal)`: calls `GET /api/v1/promotions`.
    - `get(id: string, signal?: AbortSignal)`: calls `GET /api/v1/promotions/{id}`.
    - `create(body: SavePromotionRequest, signal?: AbortSignal)`: calls `POST /api/v1/promotions`.
    - `update(id: string, body: SavePromotionRequest, signal?: AbortSignal)`: calls `PUT /api/v1/promotions/{id}`.
    - `changeStatus(id: string, body: ChangePromotionStatusRequest, signal?: AbortSignal)`: calls `PATCH /api/v1/promotions/{id}/status`.
  - `promotionErrorCodes`:
    - `promotionNotFound: 'promotion_not_found'`
    - `promotionCodeExists: 'promotion_code_exists'`
    - `promotionInUse: 'promotion_in_use'`
    - `usageLimitBelowUsed: 'promotion_usage_limit_below_used'`
    - `promotionInvalid: 'promotion_invalid'`
    - `promotionNotApplicable: 'promotion_not_applicable'`
- [ ] Export in `packages/api-client/src/index.ts`.
- [ ] Write unit tests in `packages/api-client/src/promotions.test.ts` (uncommitted).
- [ ] Verify: `npm run typecheck --workspace=@spa/api-client` and `npm run test --workspace=@spa/api-client`.

### Task 3: Web API Wrappers & Query Keys & Policies
- [ ] Create `apps/web/src/lib/api/promotions.ts`:
  - `callPromotions<T>(fn: (api: PromotionsApi) => Promise<T>): Promise<T>`.
  - `callPromotionsVoid(fn: (api: PromotionsApi) => Promise<unknown>): Promise<void>`.
- [ ] Create `apps/web/src/features/promotions/promotionQueryKeys.ts`:
  - `all`, `lists()`, `list(params)`, `details()`, `detail(id)`.
- [ ] Create `apps/web/src/features/promotions/promotionStatus.ts`:
  - Mapping `PromotionStatus` → label ("Đang áp dụng" / "Tạm dừng"), tone (`success` / `neutral`).
  - Helper `isPromotionExpired(endsAtUtc: string): boolean`.
  - Helper `formatPromotionDiscount(type: DiscountType, value: number, maxDiscountAmount?: number | null): string`.

### Task 4: Zod Schemas
- [ ] Create `apps/web/src/features/promotions/schemas.ts`:
  - `promotionFormSchema`:
    - `code`: string (3–50 chars, regex `^[A-Za-z0-9_-]{3,50}$`, transformed to uppercase).
    - `description`: optional string ($\le$ 1000 chars).
    - `discountType`: `'percentage' | 'fixed_amount'`.
    - `discountValue`: number (if percentage: 0.01–100, max 2 decimals; if fixed_amount: integer 1–999,999,999).
    - `minOrderAmount`: number (integer 0–999,999,999,999).
    - `maxDiscountAmount`: optional number (integer $\ge$ 1, only if percentage).
    - `startsAt`: string date/datetime.
    - `endsAt`: string date/datetime, must be $> startsAt$.
    - `perCustomerLimit`: optional number (integer 1–1,000).
    - `usageLimit`: optional number (integer 1–1,000,000).
  - Validation refinements:
    - If `discountType === 'percentage'`, `maxDiscountAmount` optional positive number.
    - If `discountType === 'fixed_amount'`, `maxDiscountAmount` must be null/empty.
    - `endsAt > startsAt`.

### Task 5: React Query Hooks
- [ ] Create `apps/web/src/features/promotions/hooks/usePromotions.ts`:
  - `usePromotionSearch(params)`: query `promotionQueryKeys.list(params)`.
  - `usePromotion(id, enabled)`: query `promotionQueryKeys.detail(id)`.
- [ ] Create `apps/web/src/features/promotions/hooks/usePromotionMutations.ts`:
  - `useCreatePromotion`: calls `callPromotions((api) => api.create(body))`, invalidates `promotionsQueryKeys.all`.
  - `useUpdatePromotion`: calls `callPromotions((api) => api.update(id, body))`, invalidates `promotionsQueryKeys.all`, `detail(id)`.
  - `useChangePromotionStatus`: calls `callPromotionsVoid((api) => api.changeStatus(id, body))`, invalidates `promotionsQueryKeys.all`, `detail(id)`.

### Task 6: SCR-W35 Promotions Management Components (`features/promotions/components/owner/`)
- [ ] `PromotionFilterToolbar.tsx`: Status dropdown (All / active / stopped), date inputs `fromDate` and `toDate`, "Đặt lại" button, CTA "Tạo khuyến mãi" (`PlusIcon`).
- [ ] `PromotionTable.tsx`: `DataTable<PromotionDto>` with columns:
  - Code (monospace badge, copyable or prominent)
  - Discount (% or fixed amount)
  - Min Order Amount (`formatCurrency`)
  - Validity Period (from - to with "Đã hết hạn" indicator if `isExpired`)
  - Usage ({usedCount} / {usageLimit ?? '∞'})
  - Per Customer Limit
  - StatusBadge (`active` -> green, `stopped` -> neutral)
  - Row actions with icons (`EyeIcon` Xem chi tiết, `PencilIcon` Sửa, `PowerIcon` Tạm dừng / Kích hoạt lại).
- [ ] `PromotionDetailSheet.tsx`: Drawer previewing full promotion info, conditions, usage stats, and footer actions.
- [ ] `PromotionFormDialog.tsx`: Modal dialog for create/edit.
  - Implements BR-PRM-06: if `usedCount > 0`, disables `code`, `discountType`, and `discountValue` with explanation.
  - Validates `usageLimit >= usedCount`.
  - Focuses code input on open / edit.
- [ ] `TogglePromotionStatusDialog.tsx`: Confirmation dialog for changing status.
- [ ] `OwnerPromotionsView.tsx`: Main view with PageHeader, filter toolbar, PromotionTable, dialogs & sheet integration.
- [ ] Export all in `apps/web/src/features/promotions/index.ts`.

### Task 7: Pages & Router Wiring
- [ ] Create `apps/web/src/pages/owner/OwnerPromotionsPage.tsx` rendering `<OwnerPromotionsView />`.
- [ ] In `apps/web/src/app/router.tsx`:
  - Import `OwnerPromotionsPage`.
  - Register in `ownerPages`:
    - `'/owner/promotions': <OwnerPromotionsPage />`

### Task 8: Unit Tests & Verification
- [ ] Write component tests:
  - `apps/web/src/features/promotions/components/owner/OwnerPromotionsView.test.tsx` (uncommitted)
- [ ] Run quality checks:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run test --workspace=@spa/web`
  - `npm run web:build`
- [ ] Update documentation:
  - `docs/progress.md`: Mark UC-SPA-14 Web as `✅`.
  - `docs/frontend.md`: Add section documenting `/owner/promotions` (SCR-W35).
- [ ] Verify that no `*.test.ts` or `*.test.tsx` files are staged or committed.

### Task 9: Commit Strategy (executed when done)
1. `feat(shared-types): add promotion contracts (UC-SPA-14)`
2. `feat(api-client): add promotions management API client (UC-SPA-14)`
3. `feat(web): add owner promotions management view (UC-SPA-14, SCR-W35)`
4. `feat(web): wire owner promotions route (/owner/promotions)`
5. `docs(orders): update web specs and progress for owner promotions management (UC-SPA-14)`
*(No test files committed)*

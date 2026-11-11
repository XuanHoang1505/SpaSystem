# Owner Revenue Reports, Web (UC-SPA-33) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the owner revenue reports screen (`SCR-W38` at `/owner/reports`), replacing the placeholder in `OwnerLayout` with an analytics dashboard: date range and grouping filters (`month` / `quarter` / `year`), product type criteria (`all` / `service` / `package`), quick period presets, unrecognized payments warning alert, 4 KPI summary cards, SVG/CSS period revenue chart and breakdown table, top products `DataTable` ranking with share progress bar, and direct `.xlsx` Excel export download.

**Architecture:**
- **Contracts:** `@spa/shared-types` (`reports.ts` with `RevenueGroupBy`, `ReportProductType`, `RevenueProductKind`, `RevenuePeriodDto`, `UnrecognizedPaymentsDto`, `RevenueReportDto`, `ProductRevenueDto`, `RevenueByProductDto`, `RevenueReportQuery`, `RevenueByProductQuery`).
- **API Client:** `@spa/api-client` (`reports.ts` with `ReportsApi` and `reportErrorCodes`).
- **Web Lib:** `apps/web/src/lib/api/reports.ts` (`callReports<T>`, `callReportsBlob`).
- **Feature `reports`:** `apps/web/src/features/reports/` (schemas, query keys, hooks, formatters, `components/owner/` containing filter toolbar, alert, KPI cards, period chart, period table, top products table, and `OwnerReportsView`).
- **Pages & Routes:** `apps/web/src/pages/owner/OwnerReportsPage.tsx` registered in `apps/web/src/app/router.tsx` under `ownerPages['/owner/reports']`.

**Tech Stack:** React 19, TypeScript strict, TanStack Query, React Router, React Hook Form + Zod, Tailwind v4 + shadcn/ui, Lucide Icons, Vitest + Testing Library.

**Spec:** `docs/specs/reports.md`, section "Giao diện (web): Thống kê & báo cáo doanh thu (UC-SPA-33, SCR-W38)".

---

## Global Constraints

- Names follow `docs/domain/glossary.md`: `reports`.
- Component exports must be named exports. No `any`, `@ts-ignore`, or `as unknown as`.
- UI composed exclusively from `components/ui` (shadcn) and `components/shared` (`DataTable`, `PageHeader`, `StatusBadge`, `EmptyState`, `ErrorState`). The top products table must use `DataTable`; never a raw `<table>`.
- Style using Tailwind classes with tokens from `styles/theme.css`: no hardcoded colors (`text-[#...]`), no `bg-white`/`text-black`.
- Calling pattern: `@spa/api-client` → `lib/api` → hook → component. Components never call `fetch` directly.
- Invalidation / Refresh:
  - Query keys: `reportsQueryKeys.revenue(query)`, `reportsQueryKeys.byProduct(query)`.
- Error handling matches `ApiClientError.errors[].code`. Form errors map directly to inputs.
- Vietnamese copy with diacritics. Currency formatted as `vi-VN` đ (`Intl.NumberFormat('vi-VN')`). Dates in `Asia/Ho_Chi_Minh` (ADR-0003).
- Supports light and dark modes in `OwnerLayout`.
- Add `noValidate` to all `<form>` elements; validate via Zod + React Hook Form.
- **CRITICAL CONSTRAINT:** Under NO circumstances should any test files (`*.test.ts`, `*.test.tsx`) be committed to git.

---

## File Structure

| File | Action | Responsibility |
| --- | --- | --- |
| `packages/shared-types/src/reports.ts` | Create | DTOs, enums, query parameters for revenue reports |
| `packages/shared-types/src/index.ts` | Modify | Re-export all report types |
| `packages/api-client/src/reports.ts` | Create | `ReportsApi` class (`getRevenue`, `getByProduct`, `exportRevenue`) and `reportErrorCodes` |
| `packages/api-client/src/index.ts` | Modify | Re-export `ReportsApi` and `reportErrorCodes` |
| `packages/api-client/src/reports.test.ts` | Create | Unit tests for `ReportsApi` (uncommitted) |
| `apps/web/src/lib/api/reports.ts` | Create | `callReports<T>` and `callReportsBlob` client runners |
| `apps/web/src/features/reports/reportQueryKeys.ts` | Create | Query keys for revenue report and top products |
| `apps/web/src/features/reports/schemas.ts` | Create | Zod validation schemas for report query parameters |
| `apps/web/src/features/reports/formatters.ts` | Create | Formatters for currency, dates, percentages, period labels |
| `apps/web/src/features/reports/hooks/useRevenueReport.ts` | Create | Query hook for `GET /api/v1/reports/revenue` |
| `apps/web/src/features/reports/hooks/useRevenueByProduct.ts` | Create | Query hook for `GET /api/v1/reports/revenue/by-product` |
| `apps/web/src/features/reports/hooks/useExportRevenueReport.ts` | Create | Mutation/action hook for `GET /api/v1/reports/revenue/export` blob download |
| `apps/web/src/features/reports/components/owner/RevenueFilterToolbar.tsx` | Create | Filter bar with quick presets, date inputs, groupBy, productType, top |
| `apps/web/src/features/reports/components/owner/UnrecognizedPaymentsAlert.tsx` | Create | Alert for uncounted payments (refund notice) when `count > 0` |
| `apps/web/src/features/reports/components/owner/RevenueSummaryCards.tsx` | Create | 4 KPI summary cards (total, services, packages, order count) |
| `apps/web/src/features/reports/components/owner/RevenuePeriodChart.tsx` | Create | Responsive SVG/CSS bar chart of revenue per period with tooltips |
| `apps/web/src/features/reports/components/owner/RevenuePeriodTable.tsx` | Create | Detailed tabular breakdown of period data with total footer |
| `apps/web/src/features/reports/components/owner/RevenueByProductTable.tsx` | Create | `DataTable` for top products ranked by revenue with share bar |
| `apps/web/src/features/reports/components/owner/OwnerReportsView.tsx` | Create | Master container view coordinating state, URL params, and UI |
| `apps/web/src/features/reports/index.ts` | Create | Public exports for features/reports |
| `apps/web/src/pages/owner/OwnerReportsPage.tsx` | Create | Page wrapper with `PageHeader` and Excel export button |
| `apps/web/src/app/router.tsx` | Modify | Wire `/owner/reports` in `ownerPages` |
| `docs/progress.md` | Modify | Mark UC-SPA-33 Web as ✅ |
| `docs/frontend.md` | Modify | Document `/owner/reports` feature |

---

## Tasks

### Task 1: Contracts in `@spa/shared-types`
- [ ] Create `packages/shared-types/src/reports.ts`:
  - `RevenueGroupBy = 'month' | 'quarter' | 'year'`.
  - `ReportProductType = 'all' | 'service' | 'package'`.
  - `RevenueProductKind = 'service' | 'package'`.
  - `RevenuePeriodDto`: `{ label: string; periodStart: string; periodEnd: string; revenue: number; serviceRevenue: number; packageRevenue: number; orderCount: number }`.
  - `UnrecognizedPaymentsDto`: `{ count: number; amount: number }`.
  - `RevenueReportDto`: `{ fromDate: string; toDate: string; groupBy: RevenueGroupBy; productType: ReportProductType; totalRevenue: number; serviceRevenue: number; packageRevenue: number; orderCount: number; periods: readonly RevenuePeriodDto[]; unrecognizedPayments: UnrecognizedPaymentsDto }`.
  - `ProductRevenueDto`: `{ productType: RevenueProductKind; productId: string; productName: string; quantity: number; revenue: number; sharePercent: number }`.
  - `RevenueByProductDto`: `{ fromDate: string; toDate: string; productType: ReportProductType; items: readonly ProductRevenueDto[] }`.
  - `RevenueReportQuery`: `{ fromDate?: string; toDate?: string; groupBy?: RevenueGroupBy; productType?: ReportProductType }`.
  - `RevenueByProductQuery`: `{ fromDate?: string; toDate?: string; productType?: ReportProductType; top?: number }`.
- [ ] Export in `packages/shared-types/src/index.ts`.
- [ ] Verify: `npm run typecheck --workspace=@spa/shared-types`.

### Task 2: API Client in `@spa/api-client`
- [ ] Create `packages/api-client/src/reports.ts`:
  - `ReportsApi`:
    - `getRevenue(query?: RevenueReportQuery, signal?: AbortSignal): Promise<RevenueReportDto>`: calls `GET /api/v1/reports/revenue` with serialized query params.
    - `getByProduct(query?: RevenueByProductQuery, signal?: AbortSignal): Promise<RevenueByProductDto>`: calls `GET /api/v1/reports/revenue/by-product`.
    - `exportRevenue(query?: RevenueReportQuery, signal?: AbortSignal): Promise<Blob>`: calls `GET /api/v1/reports/revenue/export`, checks response ok and returns `response.blob()`.
  - `reportErrorCodes`:
    - `validationError: 'validation_error'`
    - `unauthorized: 'unauthorized'`
    - `forbidden: 'forbidden'`
- [ ] Export in `packages/api-client/src/index.ts`.
- [ ] Create unit tests in `packages/api-client/src/reports.test.ts` (uncommitted) testing all 3 endpoints.
- [ ] Verify: `npm run test --workspace=@spa/api-client`.

### Task 3: Web Lib & Queries
- [ ] Create `apps/web/src/lib/api/reports.ts`:
  - `callReports<T>(fn: (api: ReportsApi) => Promise<T>): Promise<T>`.
  - `callReportsBlob(fn: (api: ReportsApi) => Promise<Blob>): Promise<Blob>`.
- [ ] Create `apps/web/src/features/reports/reportQueryKeys.ts`:
  - `reportsQueryKeys = { all: ['reports'] as const, revenue: (query: RevenueReportQuery) => [...reportsQueryKeys.all, 'revenue', query] as const, byProduct: (query: RevenueByProductQuery) => [...reportsQueryKeys.all, 'by-product', query] as const }`.
- [ ] Create `apps/web/src/features/reports/formatters.ts`:
  - Format currency `vi-VN` đ.
  - Format date string `dd/MM/yyyy`.
  - Format percentage `XX.X%`.
  - GroupBy and ProductType Vietnamese labels.
- [ ] Create `apps/web/src/features/reports/schemas.ts`:
  - Zod schemas for query filter validation with client-side range checks (5-year maximum per BR-RPT-03, `fromDate <= toDate`).

### Task 4: Hooks
- [ ] Create `apps/web/src/features/reports/hooks/useRevenueReport.ts`:
  - TanStack `useQuery` wrapping `callReports((api) => api.getRevenue(query))`.
- [ ] Create `apps/web/src/features/reports/hooks/useRevenueByProduct.ts`:
  - TanStack `useQuery` wrapping `callReports((api) => api.getByProduct(query))`.
- [ ] Create `apps/web/src/features/reports/hooks/useExportRevenueReport.ts`:
  - Action/mutation wrapping `callReportsBlob((api) => api.exportRevenue(query))`.
  - Automatically triggers browser file download with filename `doanh-thu_<fromDate>_<toDate>.xlsx`.
  - Displays toast success or error message.

### Task 5: Components
- [ ] Create `apps/web/src/features/reports/components/owner/UnrecognizedPaymentsAlert.tsx`:
  - Amber alert when `unrecognizedPayments.count > 0` with count and amount formatted.
- [ ] Create `apps/web/src/features/reports/components/owner/RevenueFilterToolbar.tsx`:
  - Quick presets: "Năm nay" (01/01 -> today), "Năm trước", "Quý này", "Tháng này", "30 ngày qua".
  - Date inputs: `fromDate`, `toDate`.
  - Selects: `groupBy` (month/quarter/year), `productType` (all/service/package), `top` (10/20/50).
  - Reset button.
- [ ] Create `apps/web/src/features/reports/components/owner/RevenueSummaryCards.tsx`:
  - 4 cards: Tổng doanh thu, Doanh thu dịch vụ (with % share), Doanh thu gói (with % share), Số đơn hàng.
- [ ] Create `apps/web/src/features/reports/components/owner/RevenuePeriodChart.tsx`:
  - Pure SVG/CSS column chart visualizing revenue per period.
  - Distinct colors for service vs package revenue using design tokens.
  - Tooltip with currency amounts on hover/focus.
- [ ] Create `apps/web/src/features/reports/components/owner/RevenuePeriodTable.tsx`:
  - Detailed table with columns: Kỳ, Từ ngày, Đến ngày, Doanh thu dịch vụ, Doanh thu gói, Tổng doanh thu, Số đơn, and summary row.
- [ ] Create `apps/web/src/features/reports/components/owner/RevenueByProductTable.tsx`:
  - Uses `@components/shared/DataTable`.
  - Columns: Hạng, Tên sản phẩm, Loại (`StatusBadge`), Số lượng, Doanh thu, Tỷ trọng (% + progress bar).
- [ ] Create `apps/web/src/features/reports/components/owner/OwnerReportsView.tsx`:
  - Master component coordinating URL query params, data fetching, loading skeleton, error states, and rendering subcomponents.
- [ ] Create `apps/web/src/features/reports/index.ts`:
  - Export all public components and hooks.

### Task 6: Page & Routing
- [ ] Create `apps/web/src/pages/owner/OwnerReportsPage.tsx`:
  - Header with title "Báo cáo doanh thu" and Export button.
  - Renders `OwnerReportsView`.
- [ ] Wire `/owner/reports` in `apps/web/src/app/router.tsx` inside `ownerPages`.
- [ ] Verify routing works cleanly.

### Task 7: Verification & Testing
- [ ] Create `apps/web/src/features/reports/components/owner/OwnerReportsView.test.tsx` (uncommitted):
  - Test loading state (skeletons).
  - Test empty state (totalRevenue = 0).
  - Test data state (KPI cards, charts, product table).
  - Test unrecognized payments alert display when count > 0.
  - Test filter toolbar updates and presets.
  - Test export button action.
- [ ] Run test suite: `npm run test`.
- [ ] Run code quality checks: `npm run lint`, `npm run typecheck`, `npm run web:build`.

### Task 8: Documentation & Git
- [ ] Update `docs/progress.md`: Mark UC-SPA-33 Web as ✅.
- [ ] Update `docs/frontend.md`: Add `/owner/reports` documentation.
- [ ] Ensure NO test files (`*.test.ts`, `*.test.tsx`) are staged or committed.
- [ ] Split commits cleanly according to conventional commit guidelines.

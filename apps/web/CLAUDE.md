# Web app

Rules for work under `apps/web/`. They extend the root CLAUDE.md. UI stack and tokens: ADR-0005.

- Read first: `docs/conventions/frontend.md`, `docs/conventions/naming.md`, `docs/frontend.md` (current routes) and `docs/domain/glossary.md`. For a use case's screens, use the `/implement-fe` skill.
- Feature code goes in `src/features/<feature>/` (kebab-case, names from the glossary) with `components/`, `hooks/`, `schemas.ts` and `index.ts`. Pages in `src/pages/<area>/` only compose features.
- API calls flow `@spa/api-client` (`<Feature>Api`, `<feature>QueryKeys`) → `src/lib/api/` → `features/<feature>/hooks` → components. Components never call `fetch`.
- Handle API errors by `ApiClientError.errors[].code`, not by message text. Every data view renders loading, error, empty and data states.

## UI: Tailwind CSS v4 + shadcn/ui

- Build screens only from `src/components/ui` (shadcn primitives) and `src/components/shared` (`DataTable`, `PageHeader`, `StatusBadge`, `FormField`, `EmptyState`, `ErrorState`, `PageLoader`). Check both before writing a new component. Business-free pieces used by two features go to `shared/`, never copied.
- Colors live only in `src/styles/theme.css` and are mapped in `src/styles/index.css` (`@theme inline`). Use token classes (`bg-primary`, `text-muted-foreground`, `bg-status-success`…). No hex/arbitrary colors (`text-[#…]`), no `bg-white`/`text-black`, no CSS Modules, no inline `style` for colors or spacing. A new color = a new token in both files, plus the mobile theme if it is a brand color.
- Every page in the customer/staff/owner areas starts with `PageHeader`. Use `font-heading` only for headings; dark mode must work (check both themes).
- **Every table of data uses `DataTable`** (`@/components/shared/DataTable`). Never hand-write `<table>` or use the shadcn `Table` directly for data. Paging, sorting and filtering run on the server; keep them in the URL with `useTableSearchParams` and pass `PagedResponse` metadata as `page`. Rows need a stable id from the data (`getRowId`), never the array index. Per-row actions go through `rowActions`; details open with `onRowClick` (Sheet/Dialog), not a new route for a short form.
- Status enums map to `{ label, tone }` in one file per feature and render with `StatusBadge`; no new badge colors.
- Forms: React Hook Form + Zod, each control wrapped in `FormField` (it wires `id`, `aria-invalid`, `aria-describedby`). Submit buttons use `<Button loading={mutation.isPending}>`. Success/failure feedback goes through `toast` from `sonner`.
- Format money and dates with `src/lib/formatting/formatters.ts` (`formatCurrency`, `formatDateTimeUtc`, `formatLocalDate`, `formatLocalTime`); appointment dates/times are already Vietnam local time (ADR-0003).
- Add a primitive with `npx shadcn@4.23.0 add <name>` from `apps/web`, then: fix the generated `import { cn } from "cn"` to `@/lib/utils`, uninstall the `cn` package it adds, and delete any `--sidebar-*` block it appends to `index.css`. Only the unified `radix-ui` package; never `@radix-ui/react-*`. Icons from `lucide-react`.
- Accessibility: semantic landmarks, visible focus, icon-only buttons have `aria-label`, works from 320px wide without horizontal page scroll.

## Other rules

- User-facing text is Vietnamese with diacritics. Named exports only (shadcn files in `ui/` keep their own style). Keep tests next to the file (`*.test.tsx`) and mock `fetch`.
- When you add a route, update `src/app/routes.ts` and `docs/frontend.md`; the sidebar menu and its icon come from `src/config/navigation.ts`.
- Run `npm run format` before finishing (it sorts Tailwind classes).

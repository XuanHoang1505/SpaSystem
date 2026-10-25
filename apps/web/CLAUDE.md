# Web app

Rules for work under `apps/web/`. They extend the root CLAUDE.md.

- Read first: `docs/conventions/frontend.md`, `docs/conventions/naming.md`, `docs/frontend.md` (current routes) and `docs/domain/glossary.md`.
- Feature code goes in `src/features/<feature>/` (kebab-case, names from the glossary) with `components/`, `hooks/`, `schemas.ts` and `index.ts`. Pages in `src/pages/<area>/` only compose features.
- API calls flow `@spa/api-client` (`<Feature>Api`, `<feature>QueryKeys`) → `src/lib/api/` → `features/<feature>/hooks` → components. Components never call `fetch`.
- Handle API errors by `ApiClientError.errors[].code`, not by message text. Every data view renders loading, error, empty and data states.
- Styling is CSS Modules plus the variables in `src/styles/variables.css`. Moving to Tailwind needs an ADR (open question Q-09).
- User-facing text is Vietnamese with diacritics. Named exports only. Keep tests next to the file (`*.test.tsx`) and mock `fetch`.
- When you add a route, update `src/app/routes.ts` and `docs/frontend.md`.

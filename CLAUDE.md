# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Spa Như Nguyệt: a foundation monorepo for a spa management system. It has an ASP.NET Core (.NET 9) backend, a React + Vite web app and a React Native + Expo (SDK 57, Expo Go) mobile app. So far it holds only the structure, the UI shell and the system-check API (`/api/v1/system/ping`, `/health/live`, `/health/ready`). Business screens show "Tính năng đang được phát triển" as a placeholder. User-facing text and the docs are in Vietnamese.

## Domain in one paragraph

This is a graduation thesis project. Four actors: guest, customer, staff (technician) and owner. Customers browse spa services and multi-session packages, add them to a cart, and pay online. A paid order creates entitlements: a `ServiceEntitlement` for a single service, or a `CustomerPackage` with a `TreatmentPlan` of ordered `TreatmentSession`s. There are two ways to book an `Appointment`. "Book now" holds the slot until payment succeeds. Booking from an entitlement or session needs no payment. The core algorithm finds free slots from staff `WorkSchedule`s and staff skills, and prevents double-booking with an in-transaction check plus a PostgreSQL `EXCLUDE` constraint. Staff write a `SkinProfile` per visit and mark sessions complete, which updates package progress. Other features: promotions, reviews, an AI assistant that gives service advice but never medical diagnoses, notifications, and revenue reports by month, quarter and year. There are 34 use cases, `UC-SPA-01` to `UC-SPA-34`.

## Documentation map

Start at `docs/README.md`. Key files:

- `docs/domain/glossary.md`: maps the thesis's Vietnamese names (`LichHen`, `GoiKhachHang`…) to code names (`Appointment`, `CustomerPackage`…), tables, enums and API routes. **Code identifiers are English** (ADR-0001); look names up here and don't invent new translations.
- `docs/conventions/`: project structure (where files go), naming, backend, database, API, frontend, testing, and workflow with the Definition of Done. Follow these when writing code.
- `docs/decisions/`: ADRs and `open-questions.md`, the unresolved business rules with configurable defaults.
- `docs/domain/data-model.md`: every table, column, type, constraint and enum in English, with an ERD and the thesis name for each. Use it when writing entities, EF configurations and migrations. It is generated, so don't edit it by hand.
- `docs/specs/`: per-feature specs; write one before implementing a feature group. `docs/SPA_NhuNguyet_TongHop_PhanTich_v2.xlsx` is the full analysis (use cases, rules, workflows, screens, API, DB), already in English names.
- `docs/spec-source/`: Python data and generators behind the Excel file and `data-model.md`. Change data there, then regenerate (see its README).
- `docs/progress.md`: what is actually implemented. Update it with each use case.
- `docs/architecture.md`, `development.md`, `frontend.md`, `mobile.md`: the current foundation.
- `backend/`, `apps/web/` and `apps/mobile/` each have their own `CLAUDE.md` with area rules.

**Persistence base is in place.** All 29 entities and 19 enums live in `Domain`, and `AppDbContext` uses PostgreSQL through EF Core 9 + Npgsql with snake_case names. There is one configuration per entity, the `InitialCreate` migration (including the appointments `EXCLUDE` overlap constraint), `IUnitOfWork`, a generic `IRepository<T>`, and an audit interceptor. Entities are data shapes with public setters for now. Add state-transition methods (and tighten setters) when you implement each use case.

Not yet implemented, on purpose: seeds, JWT/login, use-case services, booking, payment, AI, uploads, notifications and background jobs. Folders such as `Seeds`, `Ai` and `Payments` hold only `.gitkeep`. Don't add fake services or sessions to fill them.

**Toolchain:** the .NET 9 SDK is required (`global.json`). On this machine it was installed user-local at `%LOCALAPPDATA%\Microsoft\dotnet`. If `dotnet --version` reports 8.x, prepend that folder to `PATH` (and set `DOTNET_ROOT`) or install SDK 9 system-wide. `dotnet-ef` is a local tool: run `dotnet tool restore` once.

## Commands

Run everything from the repo root. Use npm only, with the single root `package-lock.json` (no yarn/pnpm, no per-app lockfiles; use `npm ci` for reproducible installs).

```powershell
npm run dev                          # backend :5000 + web :5173 + Expo :8081, auto-detects the LAN IPv4 for API URLs/CORS
npm run dev -- --host 192.168.1.59   # pick the LAN IP explicitly

# Backend
dotnet build backend/NhuNguyetSpa.sln
dotnet test backend/NhuNguyetSpa.sln
dotnet test backend/NhuNguyetSpa.sln --filter "FullyQualifiedName~ApiTests"   # single class/test
dotnet run --project backend/src/API --launch-profile https   # https://localhost:7001/swagger
dotnet run --project backend/src/API --launch-profile http    # http://localhost:5000 (emulator)

# Config: copy backend/src/API/.env.example to .env (git-ignored). EnvLoader maps CONNECTION_STRING,
# JWT_*, MAIL_SETTINGS_*… to configuration. Precedence: appsettings < .env < real env vars < Section__Key vars/test overrides.
# Secrets go only in .env or env vars, never appsettings*.json. Add new variables to EnvLoader's map and .env.example.
# Database (PostgreSQL 17 in Docker; dev connection string in backend/src/API/.env)
npm run db:up                        # docker compose up -d db
npm run db:migrate                   # dotnet tool restore + dotnet ef database update
dotnet ef migrations add <Name> --project backend/src/Infrastructure --startup-project backend/src/API --output-dir Persistence/Migrations
# PersistenceModelTests fails if entities/configurations change without a new migration, or drift from docs/domain/data-model.md.

# JS workspaces (@spa/web, @spa/mobile, @spa/api-client, @spa/shared-types)
npm run lint            # eslint, --max-warnings 0
npm run typecheck       # all workspaces
npm run test            # all workspaces
npm run web             # Vite dev server
npm run web:test
npm run web:build       # tsc + vite build -> apps/web/dist
npm run test --workspace @spa/web -- src/path/to/file.test.tsx      # single web test (Vitest)
npm run test --workspace @spa/mobile -- path/to/file.test.tsx       # single mobile test (Jest)
npm run mobile / npm run mobile:android
npm run mobile:check    # expo public config validation
npm run mobile:export   # Android Metro bundle check (not an APK/AAB)
npm run format / npm run format:check

docker compose up --build   # API :5000 (Production, no Swagger) + web via Nginx :8080
```

Before changing Expo dependency versions, run `npx expo install --check` from `apps/mobile`. Don't use `npm audit fix --force`, because it breaks the Expo SDK / React Native pairing. React is pinned to 19.2.3 in both apps to avoid duplicate React copies.

## Architecture

**Backend (Clean Architecture)** in `backend/src`, with projects named `NhuNguyetSpa.*`:

- `Domain`: no project or package references. Holds `BaseEntity` (Guid id), `BaseAuditableEntity` (UTC timestamps, Guid actor IDs), `ISoftDelete` and domain exceptions.
- `Application`: references Domain only. It must not reference ASP.NET Core, EF Core or Infrastructure. It holds DTOs, FluentValidation validators, use cases, port interfaces (for example the clock), `OperationResult` and `PagedQuery`/`PagedResult` (default 1/10, PageSize clamped to 1–100). It is wired via `AddApplication()`.
- `Infrastructure`: implements the Application interfaces and is wired via `AddInfrastructure(configuration)`.
- `API`: the composition root ([Program.cs](backend/src/API/Program.cs)). Controllers only translate requests and results. The HTTP response envelope `{ success, message, data, errors, traceId }` is built here, not in Application. The exception middleware maps Validation/BusinessRule→400, NotFound→404, Conflict→409, Unauthorized→401 and anything else→500 without leaking details. Health checks use their own `{ status }` contract. CORS reads `Cors:AllowedOrigins` (no wildcard). Swagger is enabled only in Development or when `Swagger:Enabled=true`. `HttpCurrentUserService` reads real claims.
- Tests: `Domain.Tests`, `Application.Tests` (NSubstitute for the clock) and `IntegrationTests` (WebApplicationFactory, which needs `public partial class Program`). No database is needed.

**Frontend**

- `packages/shared-types`: API response, error, pagination and health contracts. Add a type here only when the backend has a formal contract for it.
- `packages/api-client`: `ApiClient`, `ApiClientError`, `SystemApi`, URL validation, and the query keys plus retry/stale policy shared by both apps (staleTime 60s, at most 1 retry, no polling). An empty response returns `undefined`, so type 204 endpoints as `void`.
- `packages/shared-config`: the strict TS base, ESLint and Prettier configs.
- The packages export TypeScript **source**, which Vite, Metro and the test runners transform directly, so there is no package build step.
- React components are **not** shared between web (DOM, CSS Modules) and mobile (React Native). Each platform organises code under `src/features/<feature>`.
- TanStack Query owns server state, Zustand holds client/UI state only, and local React state covers the rest.
- Mobile routing is Expo Router in `apps/mobile/app` with route groups `(public)`, `(customer)` (Tabs), `(staff)` and `(owner)`. Web has Public/Customer/Staff/Owner layouts. Role areas are unprotected public previews: `RouteGuard` is an abstraction kept for the future auth phase, not a security boundary.
- Env: web uses `VITE_API_BASE_URL` (example `https://localhost:7001`) and mobile uses `EXPO_PUBLIC_API_BASE_URL` (example `http://10.0.2.2:5000`, the Android emulator's alias for host loopback). A missing or invalid URL shows a "Configuration Error" and makes no network call, with no fallback. These values are bundled publicly, so never put secrets in them. Web URLs in Docker are fixed at build time.

## Adding a feature

Follow `docs/conventions/workflow.md`. In short:

1. Read or write the spec in `docs/specs/`. Check names in the glossary and add new concepts there first. Unclear rules go in `docs/decisions/open-questions.md` with a configurable default.
2. Backend order: Domain → Application (DTOs, validators, service interface and implementation in `UseCases/<Feature>`, tests) → Infrastructure (EF configuration, migration, repository) → API (thin controller, integration tests).
3. Shared contract: `packages/shared-types` → `packages/api-client` (`<Feature>Api`, query keys).
4. Web and mobile: hooks → components → pages and routes → tests.
5. Meet the Definition of Done (build, tests, lint, typecheck, format) and update `docs/progress.md` and any affected docs.

## Conventions

- C#: file-scoped namespaces, one main public type per file, `net9.0` with nullable and implicit usings enabled (see `Directory.Build.props`).
- TypeScript: strict mode. Don't use `any` or `@ts-ignore` to silence errors. Run the formatter before finishing.
- Store and return times in UTC (`DateTime`, names ending in `AtUtc`). The one exception is appointment and work-schedule date and times, which are `DateOnly` + `TimeOnly` in `Asia/Ho_Chi_Minh` local time (ADR-0003).
- AutoMapper is pinned to 15.1.3 for a CVE fix. That line needs a license via `AUTOMAPPER_LICENSE_KEY`: never commit the key and don't suppress the license log.
- Don't eject or generate native projects for mobile.
- FIXY is an external reference project and must never be modified.

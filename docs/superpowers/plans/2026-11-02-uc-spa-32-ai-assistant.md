# AI assistant (UC-SPA-32) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Backend for guests and customers to chat with a Gemini-based spa assistant that answers only from real data, never gives medical advice, stays inside the website's scope, suggests products and proposes bookable slots; customers' turns are saved and listed.

**Architecture:** New `AiAssistant` folder. Application owns everything that decides: the fixed system prompt, the tool catalog, an `AiToolExecutor` that runs tools on existing services (customer id always from the JWT), the `final_answer { scope, answer }` contract and the canned answers (BR-AI-01/09). The provider sits behind the `IAiChatModel` port; `GeminiAiChatModel` (Infrastructure) calls the Gemini REST `generateContent` endpoint with `functionCallingConfig.mode = ANY` and loops tool calls by hand. A singleton `AiChatRateLimiter` (API) applies 10/min + 50/VN day per user or IP. One migration adds a history index.

**Tech Stack:** .NET 9, EF Core 9 + Npgsql, PostgreSQL 17, FluentValidation, `System.Threading.RateLimiting`, typed `HttpClient` + `System.Text.Json` (no Gemini SDK), xUnit + NSubstitute + FluentAssertions, Testcontainers.

**Spec:** `docs/specs/ai-assistant.md` (UC-SPA-32, BR-AI-01…09, AI-T01…T18, Q-01, Q-57…Q-65). Approved 2026-11-02.

## Global Constraints

- Names: folder `AiAssistant` (`UseCases/AiAssistant`, `DTOs/AiAssistant`, `Validators/AiAssistant`, `Interfaces/Services/AiAssistant`; port in `Interfaces/Ai`; adapter in `Infrastructure/Ai` — delete each `.gitkeep` once a file lands). Entity `AiChatMessage`, table `ai_chat_messages`. Routes exactly `POST /api/v1/ai/chat`, `GET /api/v1/me/ai/history`.
- Policy: `Permissions.AiChat = "ai.chat"` → `[SecurityRoles.Customer]` (history only). `POST /ai/chat` is `[AllowAnonymous]`; the service refuses an authenticated non-customer with `ForbiddenException("Trợ lý AI hiện chỉ dành cho khách hàng.", "forbidden")` (Q-60).
- Tool names (English, ADR-0001): `search_catalog`, `get_product_detail`, `find_available_slots`, `list_my_appointments`, `list_my_packages`, `suggest_products`, `propose_booking`, `final_answer`. Guests get `search_catalog`, `get_product_detail`, `find_available_slots`, `suggest_products`, `propose_booking`, `final_answer`; customers get all eight.
- Customer-only data never takes a customer id from the model: tools call `IMyAppointmentService` / `IPurchaseService` / `IAvailabilityService`, which read `ICurrentUserService` (BR-AI-02). Tool results contain only the fields listed in the spec's tool table; never email, phone, notes, skin profiles, allergies (BR-AI-07). Never log question/answer text at Information or above.
- Errors and exact messages:
  - E1 `400 validation_error`, field `question`: blank → `"Vui lòng nhập câu hỏi."`; too long → `$"Câu hỏi tối đa {MaxQuestionLength} ký tự."`; control char other than `\n`, `\r`, `\t` → `"Câu hỏi chứa ký tự không hợp lệ."`. Length is checked on the trimmed text.
  - History `limit` outside `1…History:MaxLimit` → field `limit`, `$"Số lượt mỗi trang phải từ 1 đến {MaxLimit}."`.
  - E2 `ServiceUnavailableException("Trợ lý AI tạm thời chưa thể trả lời, vui lòng gửi lại.", "ai_unavailable")` → 503. Nothing is saved.
  - E4 `429 rate_limited`, message `"Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút."` (same envelope as the `auth` limiter).
- Canned answers (constants in `AiCannedAnswers`, exact text):
  - Medical: `"Mình không thể chẩn đoán bệnh hay tư vấn thuốc. Bạn nên gặp bác sĩ da liễu để được thăm khám trực tiếp. Nếu cần, mình có thể giới thiệu các dịch vụ chăm sóc da tại Spa Như Nguyệt."`
  - Out of scope: `"Câu hỏi này nằm ngoài phạm vi hỗ trợ của trợ lý Spa Như Nguyệt. Mình có thể giúp bạn về dịch vụ, gói, giá, giờ trống và lịch hẹn tại spa."`
  - Blocked: `"Xin lỗi, mình chưa thể hỗ trợ câu hỏi này. Bạn có thể hỏi về dịch vụ, gói, giá hoặc lịch hẹn tại spa."`
  - Medical, out of scope and blocked answers always come with empty `suggestions` and `bookingProposals`.
- `final_answer` arguments: `scope` ∈ `in_scope` | `out_of_scope` | `medical`, `answer` non-blank string. Missing/invalid scope, blank in-scope answer, or no `final_answer` call → `ai_unavailable`.
- Paths: suggestions `/services/{id}` | `/packages/{id}`; booking `/booking/new?serviceId={id}` | `?serviceEntitlementId={id}` | `?treatmentSessionId={id}`, then `&date=yyyy-MM-dd&startTime=HH:mm`, then `&staffMemberId={id}` only when a staff member was chosen.
- Config section `Ai`, Application `AiOptions` (validated in `AddInfrastructure` like `ReportsOptions`): `TimeoutSeconds` 30 (5–120), `MaxToolRounds` 4 (1–10), `MaxQuestionLength` 1000 (100–4000), `HistoryTurnsInContext` 5 (0–20), `SearchResultLimit` 5 (1–20), `MaxSuggestions` 3 (0–10), `MaxBookingProposals` 3 (0–10), `History:DefaultLimit` 20, `History:MaxLimit` 50 (1–200, default ≤ max), `RateLimit:PermitLimit` 10, `RateLimit:WindowSeconds` 60, `RateLimit:DailyLimit` 50 (all ≥ 1). Infrastructure `AiProviderOptions` (same section): `Provider` `"gemini"` (only accepted value), `Model` `"gemini-3.8-flash"`, `ApiKey` `""`, `MaxOutputTokens` 2048 (256–8192), `BaseUrl` `"https://generativelanguage.googleapis.com/v1beta/"`.
- Secret: `GEMINI_API_KEY` → `Ai:ApiKey` (EnvLoader explicit map + `.env.example`), never in appsettings. Missing key → `ai_unavailable` without any HTTP call; the API still starts.
- Do not change behaviour of finished UCs; all existing tests pass; `PersistenceModelTests` passes with the new migration.
- DI through constructors into `private readonly` fields; Application references neither ASP.NET Core, EF Core nor any HTTP client type.
- TDD: unit tests with NSubstitute + fixed `IDateTimeProvider`; integration tests with `PostgresFixture` + `AuthApiFactory`; tests never call Gemini (`FakeAiChatModel`, fake `HttpMessageHandler`).
- Docs to update: `docs/progress.md`, glossary, open-questions (Q-01 chốt, Q-57…Q-65), `docs/spec-source/data_rules.py`, `data_api.py`, `data_screens.py` (regenerate Excel), Postman (`backend/postman/generate_collection.py`), root `CLAUDE.md` (new paragraph + `GEMINI_*` in the EnvLoader list), `backend/src/API/.env.example`.
- The user runs git: no commits or pushes; each "Checkpoint" = build + the task's tests. No Co-Authored-By or "Generated with" lines anywhere.

## Review Focus

- Gemini 3 rejects a follow-up request whose model turn lost its `thoughtSignature`: the adapter must append the model's `content` object **unchanged** before the function responses → Task 5 test `EchoesModelContentVerbatim`.
- History paging when two turns share a timestamp or the cursor equals a row's time: order `createdAtUtc desc, id desc`, `before` exclusive, no row lost or repeated across pages → Task 2 test `PagesAreStableAndExclusive` (distinct times) and `SameTimestampOrderedById`.
- A guest whose model call names a customer-only tool anyway (hallucinated) gets a tool error, never data → Task 3 test `GuestCannotInvokeCustomerTools`.
- The caller disconnects mid-answer: the request's own cancellation must propagate (not become a 503) and nothing is saved → Task 4 test `CallerCancellationIsNotUnavailable`.
- A 1000-character Vietnamese question with diacritics and line breaks is accepted; surrounding spaces do not count → Task 1 validator test `AcceptsLongVietnameseWithNewLines`.

---

### Task 1: Contracts, options, prompt and answer rules

**Files:**

- Create: `backend/src/Application/Common/Options/AiOptions.cs` (`AiOptions`, `AiHistoryOptions`, `AiRateLimitOptions`)
- Create: `backend/src/Application/Interfaces/Ai/` — `IAiChatModel.cs`, `IAiToolInvoker.cs`, `AiChatRequest.cs` (with `AiChatTurn`, `AiToolDefinition`), `AiChatCompletion.cs`
- Create: `backend/src/Application/DTOs/AiAssistant/` — `AskAiAssistantRequest.cs`, `AiChatReplyDto.cs` (with `AiProductSuggestionDto`, `AiBookingProposalDto`, enums `AiProductType`, `AiBookingKind`), `AiChatHistoryQuery.cs`, `AiChatHistoryDto.cs` (with `AiChatMessageDto`)
- Create: `backend/src/Application/UseCases/AiAssistant/` — `AiErrors.cs`, `AiCannedAnswers.cs`, `AiAssistantPrompt.cs`, `AiAnswerScope.cs`, `AiFinalAnswer.cs`
- Create: `backend/src/Application/Validators/AiAssistant/AskAiAssistantRequestValidator.cs`, `AiChatHistoryQueryValidator.cs`
- Test: `backend/tests/Application.Tests/AiAssistant/AiAssistantValidatorTests.cs`, `AiFinalAnswerTests.cs`, `AiAssistantPromptTests.cs`

**Interfaces — Produces:**

- `AiOptions { const SectionName = "Ai"; … }` with the values in Global Constraints.
- `record AiToolDefinition(string Name, string Description, JsonElement Parameters)` — `Parameters` is a standard JSON Schema object (`type: "object"`, `properties`, `required`).
- `record AiChatTurn(string Question, string Answer)`
- `record AiChatRequest(string SystemPrompt, IReadOnlyList<AiChatTurn> History, string Question, IReadOnlyList<AiToolDefinition> Tools, string FinalToolName, int MaxToolRounds)`
- `record AiChatCompletion(JsonElement? FinalArguments, bool Blocked)`
- `interface IAiToolInvoker { Task<string> InvokeAsync(string name, JsonElement arguments, CancellationToken cancellationToken); }` — returns a JSON string; failures are `{"error":"<Vietnamese message>"}`, never exceptions.
- `interface IAiChatModel { Task<AiChatCompletion> CompleteAsync(AiChatRequest request, IAiToolInvoker tools, CancellationToken cancellationToken); }` — throws `AiErrors.Unavailable()` when not configured, on HTTP/provider errors, when `MaxToolRounds` tool rounds pass without `final_answer`, or when the model answers without calling a tool; lets `OperationCanceledException` through.
- `sealed class AskAiAssistantRequest { string? Question { get; set; } }`
- `record AiChatReplyDto(string Answer, IReadOnlyList<AiProductSuggestionDto> Suggestions, IReadOnlyList<AiBookingProposalDto> BookingProposals, bool Saved, Guid? MessageId)`
- `record AiProductSuggestionDto(AiProductType ProductType, Guid ProductId, string Name, decimal Price, string Path)`; `enum AiProductType { Service, Package }`
- `record AiBookingProposalDto(AiBookingKind Kind, Guid? SpaServiceId, Guid? ServiceEntitlementId, Guid? TreatmentSessionId, string ServiceName, DateOnly Date, TimeOnly StartTime, TimeOnly EndTime, Guid? StaffMemberId, string? StaffName, string Path)`; `enum AiBookingKind { BookNow, BookEntitlement, BookSession }` (serialized `book_now` … by the existing snake_case enum converter)
- `sealed class AiChatHistoryQuery { DateTime? Before; int? Limit; }`; `record AiChatHistoryDto(IReadOnlyList<AiChatMessageDto> Items, bool HasMore)`; `record AiChatMessageDto(Guid Id, string Question, string Answer, DateTime CreatedAtUtc)`
- `static class AiErrors { ServiceUnavailableException Unavailable(); ForbiddenException StaffNotAllowed(); }`
- `enum AiAnswerScope { InScope, OutOfScope, Medical }`
- `static class AiFinalAnswer { (AiAnswerScope Scope, string Answer) Parse(JsonElement? arguments); }` — throws `AiErrors.Unavailable()` on anything invalid (Global Constraints).
- `static class AiAssistantPrompt { const string System; }` — Vietnamese; must state: you are the assistant of Spa Như Nguyệt; scope list from BR-AI-09; never diagnose, explain symptoms, name or suggest medicines (including topical), or promise treatment results; medical questions → `scope = medical`; anything outside the scope → `out_of_scope`; use only data returned by tools, never invent prices, times or products; personal data only through `list_my_*` tools and only for the signed-in customer, ask a guest to sign in; to book, find slots then call `propose_booking` and tell the customer to press the card to confirm — you never book yourself; answer in Vietnamese, short and friendly; always finish by calling `final_answer`.

- [ ] **Step 1: Write failing tests**
  - Validator (AI-T01): `""`, `"   "` → `"Vui lòng nhập câu hỏi."`; 1001 chars → `"Câu hỏi tối đa 1000 ký tự."`; `"a\u0007b"` → `"Câu hỏi chứa ký tự không hợp lệ."`; `AcceptsLongVietnameseWithNewLines`: `"  " + 1000 chars of "Đẹp\nda " repeated/trimmed to 1000 + "  "` → valid. History: `limit = 0`, `limit = 51` → field `Limit`, `"Số lượt mỗi trang phải từ 1 đến 50."`; `null` valid.
  - `AiFinalAnswerTests`: `{"scope":"in_scope","answer":"  Chào bạn "}` → `(InScope, "Chào bạn")`; `medical`, `out_of_scope` parsed; `null`, `{}`, `{"scope":"other","answer":"x"}`, `{"scope":"in_scope","answer":"  "}`, `{"scope":5}` → `ServiceUnavailableException` with code `ai_unavailable`.
  - `AiAssistantPromptTests` (AI-T13): `System` contains `"Spa Như Nguyệt"`, `"bác sĩ da liễu"`, `"không chẩn đoán"`, `"thuốc"`, `"final_answer"`, `"propose_booking"`, `"tiếng Việt"`, `"out_of_scope"`, `"medical"`.
- [ ] **Step 2: Run** `dotnet test backend/tests/Application.Tests --filter "FullyQualifiedName~AiAssistant"` → FAIL (types missing).
- [ ] **Step 3: Implement** the files above (validators take `IOptions<AiOptions>`).
- [ ] **Step 4: Run** the same filter → PASS.
- [ ] **Step 5: Checkpoint** — `dotnet build backend/NhuNguyetSpa.sln`.

### Task 2: Chat history persistence and index

**Files:**

- Create: `backend/src/Application/Interfaces/Repositories/IAiChatMessageRepository.cs`
- Create: `backend/src/Infrastructure/Repositories/AiChatMessageRepository.cs`
- Modify: `backend/src/Infrastructure/Persistence/Configurations/AiChatMessageConfiguration.cs` — `HasIndex(x => new { x.CustomerId, x.CreatedAtUtc }).IsDescending(false, true).HasDatabaseName("ix_ai_chat_messages_customer_id_created_at_utc")`
- Create: migration `AddAiChatMessageHistoryIndex` (`dotnet ef migrations add AddAiChatMessageHistoryIndex --project backend/src/Infrastructure --startup-project backend/src/API --output-dir Persistence/Migrations`)
- Modify: `backend/src/Infrastructure/DependencyInjection.cs` (register repository scoped)
- Test: `backend/tests/IntegrationTests/AiAssistant/AiChatMessageRepositoryTests.cs`, `backend/tests/IntegrationTests/AiAssistant/AiAssistantApi.cs` (seed helper)

**Interfaces — Produces:**

- `IAiChatMessageRepository : IRepository<AiChatMessage>`:
  - `Task<IReadOnlyList<AiChatMessage>> GetRecentAsync(Guid customerId, int count, CancellationToken cancellationToken)` — the newest `count` rows, returned **oldest first**; `count == 0` → empty without a query.
  - `Task<IReadOnlyList<AiChatMessage>> GetPageAsync(Guid customerId, DateTime? beforeUtc, int take, CancellationToken cancellationToken)` — `CreatedAtUtc < beforeUtc` when given, ordered `CreatedAtUtc desc, Id desc`, `take` rows.
- Test helper `AiAssistantApi(AuthApiFactory factory, PostgresFixture postgres)`: `Task<AiChatMessage> SeedMessageAsync(Guid customerId, DateTime createdAtUtc, string question = "Hỏi", string answer = "Đáp")`; reuse `OrderApi.SeedCustomerAsync` for customers.

- [ ] **Step 1: Write failing tests**
  - `RecentReturnsNewestInChronologicalOrder` (AI-T04 data side): 7 rows for A at t+1…t+7 min, 2 rows for B → `GetRecentAsync(A, 5)` = questions of t+3…t+7 in that order; nothing of B.
  - `PagesAreStableAndExclusive` (AI-T11 data side): 25 rows at distinct minutes → page 1 `take 21` has 21 rows newest first; page 2 with `beforeUtc` = 20th row's time returns the remaining 5; union = all 25, no duplicates.
  - `SameTimestampOrderedById`: 2 rows with the same time → ordered by `Id` desc.
- [ ] **Step 2: Run** `dotnet test backend/tests/IntegrationTests --filter "FullyQualifiedName~AiChatMessageRepositoryTests"` → FAIL.
- [ ] **Step 3: Implement** repository (`AsNoTracking` for reads), configuration index, migration, DI.
- [ ] **Step 4: Run** the same filter → PASS.
- [ ] **Step 5: Checkpoint** — build; `dotnet test backend/NhuNguyetSpa.sln --filter "FullyQualifiedName~PersistenceModelTests"` → PASS.

### Task 3: Tool catalog and executor

**Files:**

- Create: `backend/src/Application/UseCases/AiAssistant/AiToolCatalog.cs`, `AiToolExecutor.cs`
- Modify: `backend/src/Application/DependencyInjection.cs` (`AddScoped<AiToolExecutor>()`)
- Test: `backend/tests/Application.Tests/AiAssistant/AiToolCatalogTests.cs`, `AiToolExecutorTests.cs`

**Interfaces:**

- Consumes: Task 1 types; existing `IServiceCatalogService.SearchAsync/GetAsync`, `IPackageCatalogService.SearchAsync/GetAsync`, `IAvailabilityService.GetAsync(AvailabilityQuery)`, `IMyAppointmentService.ListAsync(PagedQuery, MyAppointmentListQuery)`, `IPurchaseService.ListAsync(PurchaseListQuery)`, `ICurrentUserService`, `IOptions<AiOptions>`.
- Produces:
  - `static class AiToolCatalog { const string SearchCatalog = "search_catalog", …, FinalAnswer = "final_answer"; IReadOnlyList<AiToolDefinition> For(bool isCustomer); }` — schemas per the spec's tool table; `final_answer`: `{ scope: string enum [in_scope, out_of_scope, medical], answer: string }`, both required; `propose_booking`: `spaServiceId`, `serviceEntitlementId`, `treatmentSessionId` (uuid strings), `date` (`yyyy-MM-dd`), `startTime` (`HH:mm`), `staffMemberId` optional; `date`, `startTime` required. Descriptions in Vietnamese.
  - `sealed class AiToolExecutor : IAiToolInvoker` with `IReadOnlyList<AiProductSuggestionDto> Suggestions` and `IReadOnlyList<AiBookingProposalDto> BookingProposals` (collected during one chat; scoped = one per HTTP request).
- Behaviour per tool (every handler catches `DomainException` and FluentValidation `ValidationException` and returns `{"error": message}`; bad/missing arguments → `{"error":"Tham số không hợp lệ."}`; unknown name → `{"error":"Công cụ không tồn tại."}`):
  - `search_catalog`: `PagedQuery { Search = keyword, Page = 1, PageSize = SearchResultLimit }` + `MaxPrice`; `productType` null → both lists merged, ordered by name, take `SearchResultLimit`. Fields: `productType, id, name, price, durationMinutes | totalSessions, category | validityDays`.
  - `get_product_detail`: `GetAsync` (public only, so a stopped product → NotFound error); fields per spec.
  - `find_available_slots`: `new AvailabilityQuery(serviceId, date, null, null)`; return `{ date, durationMinutes, slots: [{ startTime "HH:mm", endTime, staff: [{ id, name }] }] }` grouped by start time ascending, at most 20 start times.
  - `list_my_appointments` / `list_my_packages`: if not a customer → `{"error":"Bạn cần đăng nhập để xem thông tin cá nhân."}`. Appointments: `ListAsync(new PagedQuery { Page = 1, PageSize = 10 }, new MyAppointmentListQuery { Scope = "upcoming" })` → `date, startTime, endTime, serviceName, staffName, status`. Packages: `ListAsync(new PurchaseListQuery(null, null))` → packages `{ customerPackageId, packageName, status, totalSessions, usedSessions, remainingSessions = total − used, expiresOn (VN date), nextSession { treatmentSessionId, sequenceNumber, serviceName, earliestDate, canBook } }`, services with `canBook` or `status = available` → `{ serviceEntitlementId, serviceName, canBook, expiresOn }`.
  - `suggest_products`: each item → `GetAsync`; keep found ones, skip duplicates and errors; stop at `MaxSuggestions`; returns `{"accepted": n}`.
  - `propose_booking`: exactly one source (else error); guest with entitlement/session → login error; parse `date`/`startTime`; `AvailabilityQuery` with that source (+ `StaffMemberId` when given); proposal only if a returned staff slot has `StartTime == startTime` (and that staff when given; otherwise the first staff with that slot, `StaffMemberId` stays null in the proposal but `StaffName` null too); else `{"error":"Giờ này không còn trống, hãy chọn giờ khác."}`. Service name: `GetAsync` for `spaServiceId`, purchases list for entitlement/session. Dedupe on (source id, date, start, staff); beyond `MaxBookingProposals` → `{"error":"Đã đủ số lịch đề xuất."}`. Never writes anything.
  - `final_answer`: returns `{"ok":true}` (the adapter stops on it; the executor never needs to see it).

- [ ] **Step 1: Write failing tests** (NSubstitute services, current user = customer A or guest):
  - `CatalogForGuestHasNoPersonalTools`: `For(false)` names = the 6 guest names; `For(true)` = 8; every schema has `type = object`.
  - `PackagesAreOnlyTheCallersAndMinimal` (AI-T05): purchases returns one package (10 sessions, 3 used) → JSON has `remainingSessions = 7`, `nextSession.treatmentSessionId`; serialized text contains no `"order"`, `"imageUrl"`; `IPurchaseService.ListAsync` called once (no customer id argument exists).
  - `GuestCannotInvokeCustomerTools`: guest → `list_my_packages`, `list_my_appointments` return the login error; `IPurchaseService` / `IMyAppointmentService` never called.
  - `SearchMergesAndLimits` / `StoppedProductIsAnError` / `AvailabilityValidationBecomesToolError` (AI-T06): validator throws for a date beyond `MaxDaysAhead` → `{"error":...}`, no exception.
  - `SuggestionsFilteredAndCapped` (AI-T07): valid service, stopped package (NotFound), unknown id, duplicate, then 3 more valid → `Suggestions` = 3 distinct, names/prices from `GetAsync`, paths `/services/{id}` / `/packages/{id}`.
  - `ProposalForFreeSlot` (AI-T17): service slot 09:00–10:00 with staff S → proposal `BookNow`, `EndTime 10:00`, `Path == "/booking/new?serviceId={id}&date=2026-11-07&startTime=09:00"`; with `staffMemberId = S` → path ends `&staffMemberId={S}`, `StaffName` set.
  - `ProposalRejectedWhenTaken` / `SessionOfAnotherCustomerRejected` (availability throws NotFound/Validation) / `GuestEntitlementRejected` / `ProposalsCapped` (4th → error) / `TwoSourcesRejected`.
- [ ] **Step 2: Run** `dotnet test backend/tests/Application.Tests --filter "FullyQualifiedName~AiTool"` → FAIL.
- [ ] **Step 3: Implement** `AiToolCatalog` (schemas built once with `JsonDocument.Parse`), `AiToolExecutor`; register in DI.
- [ ] **Step 4: Run** the same filter → PASS.
- [ ] **Step 5: Checkpoint** — build.

### Task 4: Assistant service

**Files:**

- Create: `backend/src/Application/Interfaces/Services/AiAssistant/IAiAssistantService.cs`, `backend/src/Application/UseCases/AiAssistant/AiAssistantService.cs`
- Modify: `backend/src/Application/DependencyInjection.cs`
- Test: `backend/tests/Application.Tests/AiAssistant/AiAssistantServiceTests.cs`

**Interfaces:**

- Consumes: Tasks 1–3; `IUnitOfWork`, `IDateTimeProvider`, `ICurrentUserService`.
- Produces `IAiAssistantService`:
  - `Task<OperationResult<AiChatReplyDto>> ChatAsync(AskAiAssistantRequest request, CancellationToken cancellationToken)`
  - `Task<OperationResult<AiChatHistoryDto>> GetHistoryAsync(AiChatHistoryQuery query, CancellationToken cancellationToken)` — `take = limit + 1`, `HasMore` = got more than `limit`.
- Constructor: `(IAiChatModel model, AiToolExecutor tools, IAiChatMessageRepository messages, IUnitOfWork unitOfWork, ICurrentUserService currentUser, IDateTimeProvider clock, IOptions<AiOptions> options, IValidator<AskAiAssistantRequest> requestValidator, IValidator<AiChatHistoryQuery> historyValidator)`.
- Chat flow: authenticated and not customer → `AiErrors.StaffNotAllowed()` → validate → trimmed question → history (customer: `GetRecentAsync(userId, HistoryTurnsInContext)`; guest: empty) → `AiChatRequest(AiAssistantPrompt.System, history, question, AiToolCatalog.For(isCustomer), AiToolCatalog.FinalAnswer, MaxToolRounds)` → linked CTS `CancelAfter(TimeoutSeconds)` → `OperationCanceledException` when the caller's token is **not** cancelled → `AiErrors.Unavailable()`; caller cancelled → rethrow → answer per Global Constraints (blocked / `AiFinalAnswer.Parse`; in-scope keeps the executor's lists) → customer: add `AiChatMessage { Id = Guid.NewGuid(), CustomerId = userId, Question, Answer, CreatedAtUtc = clock.UtcNow }`, `SaveChangesAsync`, `Saved = true`, `MessageId` → `Success`.

- [ ] **Step 1: Write failing tests** (substitute `IAiChatModel`; real `AiToolExecutor` over substitutes where tools matter):
  - `GuestAnswerNotSaved` (AI-T02): `Saved == false`, `MessageId == null`, repository `AddAsync` not called, request tools = 6 guest tools, history empty.
  - `CustomerAnswerSaved` (AI-T03): row has `CustomerId == userId`, trimmed question, `CreatedAtUtc == clock.UtcNow`; `Saved`, `MessageId` = row id.
  - `CustomerHistoryInContext` (AI-T04): `GetRecentAsync(userId, 5)` result passed as `AiChatTurn`s in the same order.
  - `StaffAndOwnerForbidden` (AI-T10 unit): roles staff / owner → `ForbiddenException`, model not called.
  - `TimeoutIsUnavailable` (AI-T08): model waits on the token, `TimeoutSeconds` = 1 via options → `ai_unavailable`, nothing saved. `ModelUnavailablePropagates`: model throws `AiErrors.Unavailable()` → same, nothing saved.
  - `CallerCancellationIsNotUnavailable`: caller token cancelled → `OperationCanceledException`, nothing saved.
  - `BlockedGivesCannedAnswer` (AI-T09): `Blocked = true` → blocked text, empty lists; customer → saved with that text.
  - `MedicalAndOutOfScopeOverrideModelText` (AI-T18): model calls `suggest_products` + `propose_booking` successfully then `final_answer { medical, "Bạn nên bôi kem X…" }` → answer == medical canned text, both lists empty, saved text == canned; same for `out_of_scope`; malformed final → `ai_unavailable`, nothing saved.
  - `InScopeKeepsSuggestionsAndProposals`.
  - `HistoryPaging`: repository returns 21 rows for `limit 20` → 20 items, `HasMore = true`; default limit 20 when `null`.
- [ ] **Step 2: Run** `dotnet test backend/tests/Application.Tests --filter "FullyQualifiedName~AiAssistantServiceTests"` → FAIL.
- [ ] **Step 3: Implement** service and interface; register in DI.
- [ ] **Step 4: Run** the same filter → PASS.
- [ ] **Step 5: Checkpoint** — build.

### Task 5: Gemini adapter, options and env

**Files:**

- Create: `backend/src/Infrastructure/Ai/AiProviderOptions.cs`, `backend/src/Infrastructure/Ai/GeminiAiChatModel.cs`
- Modify: `backend/src/Infrastructure/DependencyInjection.cs` — bind/validate `AiOptions` and `AiProviderOptions`; `services.AddHttpClient<IAiChatModel, GeminiAiChatModel>(client => { client.BaseAddress = new Uri(BaseUrl); client.Timeout = TimeSpan.FromSeconds(TimeoutSeconds + 5); })`
- Modify: `backend/src/API/Configuration/EnvLoader.cs` (`["GEMINI_API_KEY"] = "Ai:ApiKey"` in the explicit map), `backend/src/API/.env.example` (AI block like the Cloudinary one: where to create the key in Google AI Studio, free-tier note, never commit)
- Test: `backend/tests/IntegrationTests/AiAssistant/GeminiAiChatModelTests.cs` (no database), `backend/tests/IntegrationTests/EnvLoaderTests.cs` (one case)

**Interfaces:** Consumes the Task 1 port. Request/response shapes (REST `POST models/{Model}:generateContent`, header `x-goog-api-key: {ApiKey}`):

```json
{
  "systemInstruction": { "parts": [{ "text": "<SystemPrompt>" }] },
  "contents": [
    { "role": "user", "parts": [{ "text": "<history q>" }] },
    { "role": "model", "parts": [{ "text": "<history a>" }] },
    { "role": "user", "parts": [{ "text": "<question>" }] }
  ],
  "tools": [
    {
      "functionDeclarations": [{ "name": "...", "description": "...", "parametersJsonSchema": {} }]
    }
  ],
  "toolConfig": { "functionCallingConfig": { "mode": "ANY" } },
  "generationConfig": { "maxOutputTokens": 2048 }
}
```

Loop (at most `MaxToolRounds + 1` requests): read `promptFeedback.blockReason` or `candidates[0].finishReason` ∈ {`SAFETY`, `PROHIBITED_CONTENT`, `BLOCKLIST`, `SPII`} → `new AiChatCompletion(null, true)`; collect `functionCall` parts; a `final_answer` call → return its `args`; other calls → append `candidates[0].content` **unchanged**, run each via the invoker, append one `{ "role": "user", "parts": [ { "functionResponse": { "name", "id"? (echo when present), "response": { "result": <parsed tool JSON> } } } … ] }`; no function call at all, `MAX_TOKENS`, non-2xx, invalid JSON, or rounds exhausted → `AiErrors.Unavailable()` (log status code and finish reason only). Empty `ApiKey` → `Unavailable()` before any request.

- [ ] **Step 1: Write failing tests** (`HttpMessageHandler` stub returning queued JSON, recording requests; AI-T14):
  - `ReturnsFinalAnswerArguments`: one response with `final_answer` → `FinalArguments.scope == "in_scope"`; request has `x-goog-api-key`, URL ends `models/gemini-3.8-flash:generateContent`, `toolConfig.functionCallingConfig.mode == "ANY"`, history turns as user/model pairs.
  - `RunsToolsThenFinishes`: response 1 has two `functionCall`s (`search_catalog`, `find_available_slots`) and a `thoughtSignature`; response 2 `final_answer` → invoker called twice; `EchoesModelContentVerbatim`: request 2's second-to-last content equals response 1's `content` JSON (including `thoughtSignature`), last content has two `functionResponse` parts in one user turn.
  - `SafetyIsBlocked`: `finishReason = SAFETY` → `Blocked`; `promptFeedback.blockReason` → `Blocked`.
  - `FailuresAreUnavailable`: HTTP 429, 500, text-only answer, `MAX_TOKENS`, `MaxToolRounds = 2` with tool calls forever (3 requests then stop), empty API key (no request sent) → `ServiceUnavailableException` `ai_unavailable`.
  - EnvLoader: `GEMINI_API_KEY=abc` → `Ai:ApiKey == "abc"`.
- [ ] **Step 2: Run** `dotnet test backend/tests/IntegrationTests --filter "FullyQualifiedName~GeminiAiChatModelTests|FullyQualifiedName~EnvLoaderTests"` → FAIL.
- [ ] **Step 3: Implement** options, adapter, DI, EnvLoader, `.env.example`.
- [ ] **Step 4: Run** the same filter → PASS.
- [ ] **Step 5: Checkpoint** — build.

### Task 6: API, rate limiting and end-to-end tests

**Files:**

- Modify: `backend/src/API/Authorization/Permissions.cs` (`AiChat`)
- Create: `backend/src/API/Controllers/AiAssistantController.cs` (`[Route("api/v1")]`; `[HttpPost("ai/chat")] [AllowAnonymous] [ServiceFilter(typeof(AiChatRateLimitFilter))]`; `[HttpGet("me/ai/history")] [Authorize(Policy = Permissions.AiChat)]` with `[FromQuery] AiChatHistoryQuery`)
- Create: `backend/src/API/RateLimiting/AiChatRateLimiter.cs` (singleton: `bool TryAcquire(string partitionKey)` over `PartitionedRateLimiter.CreateChained(minute, daily)`; minute = fixed window `PermitLimit`/`WindowSeconds`; daily = fixed window 1 day keyed `"{key}:{SpaTime.Today(clock.UtcNow):yyyy-MM-dd}"` with `DailyLimit`), `AiChatRateLimitFilter.cs` (key `user:{UserId}` or `ip:{ClientIpAddress.Format(RemoteIpAddress)}`; reject → 429 envelope `rate_limited`)
- Modify: `backend/src/API/Program.cs` or the existing extension that registers API services (limiter singleton + filter scoped)
- Modify: `backend/src/API/appsettings.json` (`"Ai": { …all non-secret defaults… }`)
- Modify: `backend/tests/IntegrationTests/Infrastructure/AuthApiFactory.cs` — `public FakeAiChatModel Ai { get; } = new();` registered as `IAiChatModel`; `UseSetting("Ai:ApiKey", "")`, `Ai:RateLimit:PermitLimit` and `DailyLimit` = `"100000"`; new optional ctor parameter `IReadOnlyDictionary<string, string?>? settings = null` applied last.
- Create: `backend/tests/IntegrationTests/Infrastructure/FakeAiChatModel.cs` (records `AiChatRequest`s; `Func<AiChatRequest, IAiToolInvoker, CancellationToken, Task<AiChatCompletion>> Handler`; helpers `Answer(string scope, string answer)`, `CallThenAnswer(IEnumerable<(string Tool, object Args)> calls, string scope, string answer)`, `Throw(Exception)`)
- Test: `backend/tests/IntegrationTests/AiAssistant/AiAssistantEndpointsTests.cs`, `AiChatRateLimitTests.cs` (own factory with `PermitLimit = 3`, `DailyLimit = 5`)

- [ ] **Step 1: Write failing tests**
  - `GuestChat` (AI-T02): no Bearer → 200, `saved == false`, `ai_chat_messages` count for nobody unchanged.
  - `CustomerChatAndHistory` (AI-T03, AI-T11): customer asks twice (advance `factory.Clock` between) → `saved`, `messageId`; `GET /me/ai/history?limit=1` → newest, `hasMore == true`; `before` = its `createdAtUtc` → the older one, `hasMore == false`; another customer sees none.
  - `PackagesToolUsesJwtCustomer` (AI-T05 e2e): seed packages for A and B (reuse purchase seed helpers from `Purchases` tests); fake calls `list_my_packages` → captured tool JSON lists only A's package with the right `remainingSessions`.
  - `SuggestionsAndProposalsEndToEnd` (AI-T07, AI-T17): seed a service, staff skill and schedule (reuse `BookingApi` helpers); fake calls `suggest_products` + `find_available_slots` + `propose_booking` → response has 1 suggestion with `path`, 1 proposal `kind == "book_now"`; `appointments` and `orders` row counts unchanged.
  - `MedicalCanned` (AI-T18 e2e): fake final `medical` → answer equals the medical text, empty lists.
  - `Unavailable` (AI-T08 e2e): fake throws `AiErrors.Unavailable()` → 503, `errors[0].code == "ai_unavailable"`, nothing saved.
  - `Validation` (AI-T01 e2e): `{"question":"  "}` → 400 `validation_error`, field `question`.
  - `Permissions` (AI-T10): staff, owner `POST /ai/chat` → 403 `forbidden`; history: no Bearer 401, staff/owner 403; `limit=51` → 400.
  - `AiChatRateLimitTests` (AI-T12): 4th chat within the minute → 429 `rate_limited`; daily: with minute limit raised via settings in a second factory (`PermitLimit = 100`, `DailyLimit = 2`), 3rd → 429; advance `factory.Clock` one VN day → 200 again.
- [ ] **Step 2: Run** `dotnet test backend/tests/IntegrationTests --filter "FullyQualifiedName~AiAssistant|FullyQualifiedName~AiChatRateLimit"` → FAIL.
- [ ] **Step 3: Implement** permission, controller, limiter + filter, registrations, appsettings, factory changes.
- [ ] **Step 4: Run** the same filter → PASS.
- [ ] **Step 5: Checkpoint** — `dotnet build backend/NhuNguyetSpa.sln` and `dotnet test backend/NhuNguyetSpa.sln` → all PASS (AI-T16).

### Task 7: Documentation, spec source, Postman and manual check

**Files:**

- Modify: `docs/spec-source/data_rules.py` — reword `BR-AI-01…04` to the spec, insert `BR-AI-05…09` right after `BR-AI-04`; error row `AI_INVALID_INPUT` → `VALIDATION_ERROR (field question)` in place (Q-63); RBAC row `ai.chat` GUEST column → `✓ (không lưu lịch sử, Q-01)`.
- Modify: `docs/spec-source/data_api.py` — SPA-API-105/106 **in place** (English fields from the spec, `before&limit`, response shapes, errors `400 VALIDATION_ERROR; 403; 429 RATE_LIMITED; 503 AI_UNAVAILABLE`); `AI_TOOLS` rows renamed to the English tool names with the spec's parameters/results, append rows `suggest_products`, `propose_booking`, `final_answer`.
- Modify: `docs/spec-source/data_screens.py` — SCR-W13 route params in place → `/booking/new?serviceId= | ?serviceEntitlementId= | ?treatmentSessionId= (&date&startTime&staffMemberId)`.
- Regenerate per `docs/spec-source/README.md` (Excel; `data-model.md` must come out unchanged).
- Modify: `docs/domain/glossary.md` — folder `AiAssistant`; terms: Trợ lý AI → AI assistant (`AiAssistantService`, `/ai/chat`, quyền `ai.chat`), Công cụ AI → AI tool (`AiToolCatalog`, tên tool), Gợi ý sản phẩm → Product suggestion, Lịch đề xuất → Booking proposal (`AiBookingProposalDto`, `kind`), Phạm vi câu trả lời → Answer scope (`in_scope`/`out_of_scope`/`medical`).
- Modify: `docs/decisions/open-questions.md` — Q-01 → "Đã chốt 02/11/2026"; append Q-57…Q-65 with the spec's text, status "Đã chốt" (Q-60 "Đã chốt (tạm thời)").
- Modify: `docs/specs/ai-assistant.md` (status → implemented 02/11/2026 + link to this plan), `docs/progress.md` (UC-SPA-32 row), root `CLAUDE.md` ("**AI assistant (UC-SPA-32) is done in the backend:**" paragraph after the revenue reports one; add `GEMINI_*` to the EnvLoader list in Commands; drop "AI" from the "Not yet implemented" sentence and `Ai` from the `.gitkeep` folders example).
- Modify: `backend/postman/generate_collection.py` — folder "Trợ lý AI": guest chat (expect 200 or 503 when no key — `expect_status_in(200, 503)` if the generator has it, else plain request), customer chat, history `limit=5`, blank question → `expect_field_error("question")`, staff chat → `expect_error(403)`; regenerate.

- [ ] **Step 1:** Apply the edits above and regenerate Excel + Postman.
- [ ] **Step 2: Verify** `dotnet test backend/NhuNguyetSpa.sln --filter "FullyQualifiedName~PersistenceModelTests"` → PASS; `git diff --stat docs/domain/data-model.md` → no change.
- [ ] **Step 3: Definition of Done** — `dotnet build backend/NhuNguyetSpa.sln`, `dotnet test backend/NhuNguyetSpa.sln`, `npm run lint`, `npm run typecheck`, `npm run format:check` → all pass.
- [ ] **Step 4: Manual check with the real key (AI-T15)** — `npm run db:up`, `npm run db:migrate`, `npm run db:seed:demo`, run the API, then `POST /api/v1/ai/chat` with: "mụn mủ sưng đau nên uống thuốc gì?", "da tôi nổi mẩn đỏ là bệnh gì?" (→ medical text), "viết code Python giúp tôi", "thời tiết hôm nay" (→ out-of-scope text), "có dịch vụ chăm sóc da mặt nào dưới 500k?" (→ suggestions), as a demo customer "gói của tôi còn mấy buổi?" (UAT-26) and "đặt giúp tôi buổi tiếp theo sáng thứ 7" (→ `bookingProposals`). If Gemini returns 400 on `parametersJsonSchema`, switch the declarations to `parameters` (OpenAPI subset, upper-case types) in `GeminiAiChatModel` only and re-run Task 5 tests. Report the results to the user (no commit).

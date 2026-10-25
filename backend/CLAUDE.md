# Backend

Rules for work under `backend/`. They extend the root CLAUDE.md.

- Read first: `docs/conventions/backend.md`, `docs/conventions/database.md`, `docs/conventions/api.md`, and `docs/domain/glossary.md` for entity, table, enum and route names.
- `docs/domain/data-model.md` is the column-level contract for entities, EF configurations and migrations: names, types, nullability, checks, FKs and enum values. Match it exactly. To change the design, edit `docs/spec-source/data_db.py` and regenerate.
- Identifiers are English. Never use the report's Vietnamese table names (`LichHen`, `NguoiDung`) in code; translate them with the glossary (ADR-0001).
- Business logic lives in `Application/UseCases/<Feature>/` behind `Application/Interfaces/Services/<Feature>/`. Infrastructure holds only EF Core persistence and external adapters (ADR-0002).
- Appointments and work schedules use `DateOnly` + `TimeOnly` in Vietnam local time. Everything else is `DateTime` UTC named `…AtUtc` (ADR-0003). Staff overlap is guarded by a PostgreSQL `EXCLUDE` constraint as well as an in-transaction check.
- Map DTOs with hand-written `ToDto()` extensions in `Application/Mapping/`; don't add AutoMapper profiles (ADR-0004).
- Report failures with the domain exceptions the middleware already maps (`BusinessRuleException` 400, `NotFoundException` 404, `ConflictException` 409). Messages are Vietnamese and safe to show users.
- The current user comes from `ICurrentUserService`, never from request bodies.
- Configurable business values (hold minutes, cancel window, slot step) go in `<Feature>Options`, with defaults from `docs/decisions/open-questions.md`.
- Persistence: inject `IRepository<T>` for simple loads and saves. For feature queries, add `I<Entity>Repository : IRepository<T>` in Application and `<Entity>Repository : Repository<T>` in Infrastructure. Commit through `IUnitOfWork`, which turns the overlap `EXCLUDE` violation into `ConflictException("…", "slot_unavailable")`. Enums map to snake_case text by convention, so never add per-property converters.
- After changing an entity or configuration, add a migration. `PersistenceModelTests` fails on pending model changes or drift from `data-model.md`. Raw-SQL objects such as the EXCLUDE constraint live in `AppointmentConstraints` and are applied from migrations.
- Warnings are errors (`TreatWarningsAsErrors`). Add tests in the matching `tests/` project; see `docs/conventions/testing.md`.

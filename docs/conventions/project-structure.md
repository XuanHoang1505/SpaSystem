# Cấu trúc dự án

Tài liệu này quy định **file nào đặt ở đâu**. Không chắc thì tra bảng "Đặt X ở đâu" cuối trang. Tên cụ thể của từng khái niệm theo [glossary](../domain/glossary.md).

## Toàn repo

```text
SpaSystem/
├── backend/
│   ├── NhuNguyetSpa.sln
│   ├── src/{Domain, Application, Infrastructure, API}
│   └── tests/{Domain.Tests, Application.Tests, IntegrationTests}
├── apps/
│   ├── web/        React + Vite (khách hàng, nhân viên, chủ spa)
│   └── mobile/     React Native + Expo Router (Android)
├── packages/
│   ├── shared-types/   Kiểu dữ liệu hợp đồng API dùng chung
│   ├── api-client/     ApiClient, lớp API theo tính năng, query keys
│   └── shared-config/  tsconfig, ESLint, Prettier
├── docs/          Tài liệu (xem docs/README.md)
├── scripts/       Script phát triển (npm run dev)
└── CLAUDE.md      Hướng dẫn cho AI; mỗi phần lớn có CLAUDE.md riêng
```

## Backend — theo tầng, bên trong chia theo tính năng

Phụ thuộc chỉ đi một chiều: `API → Infrastructure → Application → Domain`. Domain không tham chiếu project hay package nào; Application không tham chiếu ASP.NET Core, EF Core, Infrastructure.

```text
backend/src/
├── Domain/
│   ├── Common/          BaseEntity, BaseAuditableEntity, ISoftDelete
│   ├── Entities/        Appointment.cs, SpaService.cs …  (phẳng, 1 entity/file)
│   ├── Enums/           AppointmentStatus.cs …
│   ├── ValueObjects/    Money.cs, TimeRange.cs … (khi cần)
│   ├── Events/          Domain event (khi cần)
│   ├── Constants/       Hằng số nghiệp vụ không cấu hình được
│   └── Exceptions/      DomainException và các lớp con
├── Application/
│   ├── Common/          Models (OperationResult, PagedQuery…), Interfaces dùng chung
│   ├── DTOs/<Feature>/          AppointmentDto.cs, CreateAppointmentRequest.cs
│   ├── Validators/<Feature>/    CreateAppointmentRequestValidator.cs
│   ├── Interfaces/
│   │   ├── Services/<Feature>/  IBookingService.cs   (cổng vào nghiệp vụ)
│   │   ├── Repositories/        IAppointmentRepository.cs
│   │   ├── Persistence/         IUnitOfWork.cs
│   │   └── Payments|Ai|Authentication/  cổng ra hệ thống ngoài
│   ├── UseCases/<Feature>/      BookingService.cs, AvailabilityCalculator.cs
│   ├── Mapping/                 BookingsMappings.cs  (ToDto() viết tay — ADR-0004)
│   └── DependencyInjection.cs   AddApplication()
├── Infrastructure/
│   ├── Persistence/
│   │   ├── AppDbContext.cs
│   │   ├── Configurations/      AppointmentConfiguration.cs (IEntityTypeConfiguration)
│   │   ├── Interceptors/        AuditableEntityInterceptor.cs
│   │   ├── Migrations/          Do EF Core sinh
│   │   └── Seeds/               Dữ liệu mẫu cho môi trường dev
│   ├── Repositories/            AppointmentRepository.cs
│   ├── Payments|Ai|Authentication|Notifications/   adapter hệ thống ngoài
│   ├── BackgroundJobs/          HoldExpirationJob.cs
│   ├── Services/<Feature>/      Chỉ truy vấn đọc thuần (ADR-0002)
│   └── DependencyInjection.cs   AddInfrastructure()
└── API/
    ├── Controllers/             AppointmentsController.cs, MeAppointmentsController.cs
    ├── Contracts/               Hợp đồng chỉ thuộc tầng HTTP (health…)
    ├── Authorization/           Policy, requirement theo vai trò/phạm vi dữ liệu
    ├── Filters/  Middlewares/  Responses/  Services/  Extensions/
    └── Program.cs
```

`<Feature>` dùng đúng tên thư mục backend trong glossary: `Auth`, `Users`, `Customers`, `Staff`, `Services`, `ServicePackages`, `Promotions`, `Orders`, `Payments`, `Purchases`, `Treatments`, `Bookings`, `Care`, `Reviews`, `AiAssistant`, `Reports`, `Notifications`.

## Frontend web

```text
apps/web/src/
├── app/            Router, providers, queryClient, RouteGuard
├── pages/<area>/   public | customer | staff | owner — trang mỏng, chỉ ghép feature
├── features/<feature>/
│   ├── components/<Name>/<Name>.tsx (+ <Name>.module.css)
│   ├── hooks/      useAppointments.ts, useBookNow.ts (TanStack Query)
│   ├── schemas.ts  Zod schema cho form
│   ├── index.ts    Chỉ export những gì trang cần
│   └── README.md
├── components/common|layout/   UI dùng chung, không biết nghiệp vụ
├── lib/api/        Tạo instance lớp API từ @spa/api-client với base URL môi trường
├── lib/errors|formatting|validation/
├── stores/         Zustand: chỉ state giao diện/phiên
├── config/  styles/  locales/vi/  types/  test/
```

## Frontend mobile

```text
apps/mobile/
├── app/(public|customer|staff|owner)/   File route Expo Router — mỏng, render screen từ features
└── src/
    ├── features/<feature>/{screens, components, hooks, schemas.ts, index.ts}
    ├── components/common/   AppScreen, AppButton … (React Native, không dùng DOM)
    ├── lib/  providers/  stores/  theme/  config/  locales/vi/  test/
```

## Package dùng chung

| Package         | Chứa                                                                                                | Không chứa            |
| --------------- | --------------------------------------------------------------------------------------------------- | --------------------- |
| `shared-types`  | Kiểu request/response khớp DTO backend, theo file `src/<feature>.ts`                                | Logic, React          |
| `api-client`    | `ApiClient`, lớp `<Feature>Api` (ví dụ `BookingsApi`), `<feature>QueryKeys`, chính sách stale/retry | Hook React, component |
| `shared-config` | tsconfig, ESLint, Prettier                                                                          | Mã chạy               |

## Đặt X ở đâu

| Cần thêm                                     | Vị trí                                                                                                                            |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Quy tắc nghiệp vụ, chuyển trạng thái         | Phương thức trên entity (`Domain/Entities`) nếu chỉ dùng dữ liệu của entity; ngược lại ở service `Application/UseCases/<Feature>` |
| Thuật toán giờ trống                         | `Application/UseCases/Bookings/AvailabilityCalculator.cs`                                                                         |
| Kiểm tra dữ liệu đầu vào                     | `Application/Validators/<Feature>/`                                                                                               |
| Truy vấn CSDL                                | Repository ở `Infrastructure/Repositories/` qua interface ở Application                                                           |
| Gọi cổng thanh toán, gửi email, gọi AI       | Interface `Application/Interfaces/<Nhóm>/`, hiện thực `Infrastructure/<Nhóm>/`                                                    |
| Endpoint mới                                 | Controller ở `API/Controllers/`                                                                                                   |
| Tham số có thể thay đổi (thời gian giữ chỗ…) | `appsettings.json` + lớp Options trong Application, đọc qua `IOptions<T>`                                                         |
| Kiểu dữ liệu API cho FE                      | `packages/shared-types/src/<feature>.ts`                                                                                          |
| Hàm gọi API                                  | `packages/api-client/src/<feature>.ts`                                                                                            |
| Hook dữ liệu                                 | `apps/<web                                                                                                                        | mobile>/src/features/<feature>/hooks/` |
| Màn hình mới                                 | Web: `pages/<area>/` + route trong `app/routes.ts`; mobile: file route trong `app/(<area>)/`                                      |
| Quyết định thiết kế                          | `docs/decisions/ADR-NNNN-*.md`                                                                                                    |
| Đặc tả tính năng                             | `docs/specs/` theo mẫu ở `docs/templates/`                                                                                        |

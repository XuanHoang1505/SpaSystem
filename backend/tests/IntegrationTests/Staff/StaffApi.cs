using NhuNguyetSpa.Application.Common;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.IntegrationTests.Infrastructure;

namespace NhuNguyetSpa.IntegrationTests.Staff;

/// <summary>
/// Seeding helpers for staff and work-schedule endpoint tests (HTTP helpers come from <c>CatalogApi</c>). Appointments are
/// inserted directly because booking (UC-SPA-15) has no API yet.
/// </summary>
public sealed class StaffApi
{
    private readonly AuthApiFactory _factory;
    private readonly PostgresFixture _postgres;

    public StaffApi(AuthApiFactory factory, PostgresFixture postgres)
    {
        _factory = factory;
        _postgres = postgres;
    }

    /// <summary>Vietnam date of the factory's (possibly shifted) clock.</summary>
    public DateOnly Today => SpaTime.Today(_factory.Clock.UtcNow);

    public static string NewPhone() => "09" + Random.Shared.NextInt64(10_000_000, 99_999_999);

    public async Task<StaffMember> SeedStaffAsync(string name, DateOnly? hireDate = null, UserStatus status = UserStatus.Active, string? passwordHash = null)
    {
        await using var context = _postgres.CreateContext();
        var user = new User
        {
            FullName = name,
            Email = $"staff-{Guid.NewGuid():N}@spa.test",
            PhoneNumber = NewPhone(),
            PasswordHash = passwordHash ?? "x",
            Role = UserRole.Staff,
            Status = status,
        };
        var staff = new StaffMember { Id = user.Id, User = user, HireDate = hireDate ?? new DateOnly(2026, 1, 1) };
        context.StaffMembers.Add(staff);
        await context.SaveChangesAsync();
        return staff;
    }

    public async Task<WorkSchedule> SeedShiftAsync(Guid staffId, DateOnly date, int startHour, int endHour, bool cancelled = false)
    {
        await using var context = _postgres.CreateContext();
        var shift = WorkSchedule.Create(staffId, date, new TimeOnly(startHour, 0), new TimeOnly(endHour, 0));
        if (cancelled)
            shift.Cancel();
        context.WorkSchedules.Add(shift);
        await context.SaveChangesAsync();
        return shift;
    }

    public async Task<Appointment> SeedAppointmentAsync(
        Guid staffId, DateOnly date, TimeOnly start, TimeOnly end, AppointmentStatus status, DateTime? holdExpiresAtUtc = null,
        Guid? spaServiceId = null, Guid? customerId = null, AppointmentSource source = AppointmentSource.Entitlement)
    {
        await using var context = _postgres.CreateContext();
        if (customerId is null)
        {
            var customer = NewCustomer("Khách " + Guid.NewGuid().ToString("N")[..6], NewPhone());
            context.Customers.Add(customer);
            customerId = customer.Id;
        }

        if (spaServiceId is null)
        {
            var service = new SpaService { Name = "Dịch vụ " + Guid.NewGuid().ToString("N")[..6], Category = TestCategories.New(), DurationMinutes = 60, Price = 300_000 };
            context.SpaServices.Add(service);
            spaServiceId = service.Id;
        }

        // Every appointment needs a source (ck_appointments_source); its service is derived from it (BR-BKG-13).
        var now = _factory.Clock.UtcNow;
        var order = new Order
        {
            Code = "DH" + Guid.NewGuid().ToString("N")[..12].ToUpperInvariant(),
            CustomerId = customerId.Value,
            Subtotal = 300_000,
            GrandTotal = 300_000,
            Status = source == AppointmentSource.OrderItem ? OrderStatus.PendingPayment : OrderStatus.Paid,
            PaymentDueAtUtc = now.AddMinutes(15),
            CreatedAtUtc = now.AddDays(-1),
        };
        var item = new OrderItem { OrderId = order.Id, SpaServiceId = spaServiceId, ProductName = "Sản phẩm", UnitPrice = 300_000, LineTotal = 300_000 };
        order.Items.Add(item);
        context.Orders.Add(order);

        var appointment = new Appointment
        {
            CustomerId = customerId.Value,
            StaffMemberId = staffId,
            Date = date,
            StartTime = start,
            EndTime = end,
            Status = status,
            HoldExpiresAtUtc = holdExpiresAtUtc,
            CreatedAtUtc = DateTime.UtcNow,
        };
        switch (source)
        {
            case AppointmentSource.Entitlement:
                var entitlement = new ServiceEntitlement { CustomerId = customerId.Value, OrderItemId = item.Id, Status = EntitlementStatus.Booked };
                context.ServiceEntitlements.Add(entitlement);
                appointment.ServiceEntitlementId = entitlement.Id;
                break;
            case AppointmentSource.Session:
                var package = new CustomerPackage
                {
                    CustomerId = customerId.Value,
                    OrderItemId = item.Id,
                    PackageName = "Gói",
                    PurchasedAtUtc = now.AddDays(-1),
                    TotalSessions = 1,
                    Status = CustomerPackageStatus.Active,
                };
                var plan = new TreatmentPlan { CustomerPackageId = package.Id, Status = TreatmentPlanStatus.InProgress };
                var session = new TreatmentSession
                {
                    TreatmentPlanId = plan.Id,
                    SpaServiceId = spaServiceId.Value,
                    SequenceNumber = 1,
                    ServiceName = "Buổi 1",
                    DurationMinutes = 60,
                    Status = TreatmentSessionStatus.Booked,
                };
                context.CustomerPackages.Add(package);
                context.TreatmentPlans.Add(plan);
                context.TreatmentSessions.Add(session);
                appointment.TreatmentSessionId = session.Id;
                break;
            default:
                appointment.OrderItemId = item.Id;
                break;
        }

        context.Appointments.Add(appointment);
        await context.SaveChangesAsync();
        return appointment;
    }

    public async Task<Customer> SeedCustomerAsync(string fullName, string? phoneNumber = null)
    {
        await using var context = _postgres.CreateContext();
        var customer = NewCustomer(fullName, phoneNumber ?? NewPhone());
        context.Customers.Add(customer);
        await context.SaveChangesAsync();
        return customer;
    }

    private static Customer NewCustomer(string fullName, string phoneNumber)
    {
        var user = new User
        {
            FullName = fullName,
            Email = $"customer-{Guid.NewGuid():N}@spa.test",
            PhoneNumber = phoneNumber,
            PasswordHash = "x",
            Role = UserRole.Customer,
            Status = UserStatus.Active,
        };
        return new Customer { Id = user.Id, User = user };
    }
}

/// <summary>Which reference an appointment seeded by <see cref="StaffApi.SeedAppointmentAsync"/> carries.</summary>
public enum AppointmentSource
{
    Entitlement,
    Session,
    OrderItem,
}

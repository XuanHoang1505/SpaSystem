using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.IntegrationTests.Infrastructure;

namespace NhuNguyetSpa.IntegrationTests.Purchases;

/// <summary>Seeds bought services and packages directly (as a paid order would leave them), for UC-SPA-15 flow 2 and UC-SPA-18 tests.</summary>
public sealed class PurchaseApi
{
    private readonly AuthApiFactory _factory;
    private readonly PostgresFixture _postgres;

    public PurchaseApi(AuthApiFactory factory, PostgresFixture postgres)
    {
        _factory = factory;
        _postgres = postgres;
    }

    /// <summary>A paid one-line order for <paramref name="service"/> and its entitlement; a 0 đ order has no payment row.</summary>
    public async Task<(ServiceEntitlement Entitlement, Order Order)> SeedEntitlementAsync(
        Guid customerId, SpaService service, EntitlementStatus status = EntitlementStatus.Available, DateTime? expiresAtUtc = null,
        decimal amount = 300_000, DateTime? orderCreatedAtUtc = null)
    {
        await using var context = _postgres.CreateContext();
        var now = _factory.Clock.UtcNow;
        var order = NewPaidOrder(customerId, amount, orderCreatedAtUtc ?? now.AddDays(-1));
        var item = new OrderItem { OrderId = order.Id, SpaServiceId = service.Id, ProductName = service.Name, UnitPrice = amount, LineTotal = amount };
        order.Items.Add(item);
        if (amount > 0)
            order.Payments.Add(NewPayment(order, amount, order.CreatedAtUtc.AddMinutes(2)));
        context.Orders.Add(order);
        var entitlement = new ServiceEntitlement { CustomerId = customerId, OrderItemId = item.Id, Status = status, ExpiresAtUtc = expiresAtUtc };
        context.ServiceEntitlements.Add(entitlement);
        await context.SaveChangesAsync();
        return (entitlement, order);
    }

    /// <summary>
    /// A bought <paramref name="package"/> whose sessions follow its items in sort order (each item repeated <c>SessionCount</c>
    /// times, services from <paramref name="services"/>); <paramref name="sessionStatuses"/> gives the status per sequence number
    /// (missing → not booked).
    /// </summary>
    public async Task<BoughtPackage> SeedPackageAsync(
        Guid customerId, ServicePackage package, IReadOnlyList<SpaService> services, IReadOnlyList<TreatmentSessionStatus>? sessionStatuses = null,
        CustomerPackageStatus status = CustomerPackageStatus.Active, DateTime? expiresAtUtc = null,
        TreatmentPlanStatus planStatus = TreatmentPlanStatus.InProgress, DateTime? purchasedAtUtc = null)
    {
        await using var context = _postgres.CreateContext();
        var now = _factory.Clock.UtcNow;
        var bought = purchasedAtUtc ?? now.AddDays(-1);
        var order = NewPaidOrder(customerId, package.Price, bought.AddMinutes(-2));
        var item = new OrderItem
        {
            OrderId = order.Id, ServicePackageId = package.Id, ProductName = package.Name, UnitPrice = package.Price, LineTotal = package.Price,
        };
        order.Items.Add(item);
        order.Payments.Add(NewPayment(order, package.Price, bought));
        context.Orders.Add(order);

        var plan = new TreatmentPlan { Status = planStatus };
        var sequence = 0;
        foreach (var line in package.Items.OrderBy(line => line.SortOrder))
        {
            var service = services.Single(candidate => candidate.Id == line.SpaServiceId);
            for (var i = 0; i < line.SessionCount; i++)
            {
                sequence++;
                plan.Sessions.Add(new TreatmentSession
                {
                    TreatmentPlanId = plan.Id,
                    SpaServiceId = service.Id,
                    SequenceNumber = sequence,
                    ServiceName = service.Name,
                    DurationMinutes = 45,
                    Status = sessionStatuses is not null && sequence <= sessionStatuses.Count ? sessionStatuses[sequence - 1] : TreatmentSessionStatus.NotBooked,
                });
            }
        }

        var customerPackage = new CustomerPackage
        {
            CustomerId = customerId,
            OrderItemId = item.Id,
            PackageName = package.Name,
            PurchasedAtUtc = bought,
            ActivatedAtUtc = bought,
            ExpiresAtUtc = expiresAtUtc ?? bought.AddDays(package.ValidityDays),
            TotalSessions = sequence,
            UsedSessions = plan.Sessions.Count(session => session.Status == TreatmentSessionStatus.Completed),
            Status = status,
        };
        plan.CustomerPackageId = customerPackage.Id;
        context.CustomerPackages.Add(customerPackage);
        context.TreatmentPlans.Add(plan);
        await context.SaveChangesAsync();
        return new BoughtPackage(customerPackage, plan, plan.Sessions.OrderBy(session => session.SequenceNumber).ToList(), order);
    }

    /// <summary>An appointment that used <paramref name="session"/> to book.</summary>
    public async Task<Appointment> SeedSessionAppointmentAsync(
        TreatmentSession session, Guid customerId, Guid staffId, DateOnly date, TimeOnly start, TimeOnly end, AppointmentStatus status)
    {
        await using var context = _postgres.CreateContext();
        var appointment = new Appointment
        {
            CustomerId = customerId,
            StaffMemberId = staffId,
            TreatmentSessionId = session.Id,
            Date = date,
            StartTime = start,
            EndTime = end,
            Status = status,
            CreatedAtUtc = DateTime.UtcNow,
        };
        context.Appointments.Add(appointment);
        await context.SaveChangesAsync();
        return appointment;
    }

    /// <summary>An appointment that used <paramref name="entitlement"/> to book.</summary>
    public async Task<Appointment> SeedEntitlementAppointmentAsync(
        ServiceEntitlement entitlement, Guid staffId, DateOnly date, TimeOnly start, TimeOnly end, AppointmentStatus status)
    {
        await using var context = _postgres.CreateContext();
        var appointment = new Appointment
        {
            CustomerId = entitlement.CustomerId,
            StaffMemberId = staffId,
            ServiceEntitlementId = entitlement.Id,
            Date = date,
            StartTime = start,
            EndTime = end,
            Status = status,
            CreatedAtUtc = DateTime.UtcNow,
        };
        context.Appointments.Add(appointment);
        await context.SaveChangesAsync();
        return appointment;
    }

    private static Order NewPaidOrder(Guid customerId, decimal amount, DateTime createdAtUtc) => new()
    {
        Code = "DH" + Guid.NewGuid().ToString("N")[..12].ToUpperInvariant(),
        CustomerId = customerId,
        Subtotal = amount,
        GrandTotal = amount,
        Status = OrderStatus.Paid,
        PaymentDueAtUtc = createdAtUtc.AddMinutes(15),
        CreatedAtUtc = createdAtUtc,
    };

    private static Payment NewPayment(Order order, decimal amount, DateTime paidAtUtc) => new()
    {
        OrderId = order.Id,
        Provider = "vnpay",
        Amount = amount,
        Status = PaymentStatus.Succeeded,
        RequestCode = order.Code + "01",
        ExpiresAtUtc = order.PaymentDueAtUtc,
        PaidAtUtc = paidAtUtc,
    };
}

public sealed record BoughtPackage(CustomerPackage Package, TreatmentPlan Plan, IReadOnlyList<TreatmentSession> Sessions, Order Order);

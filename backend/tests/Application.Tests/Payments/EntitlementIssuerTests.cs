using FluentAssertions;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.UseCases.Payments;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Application.Tests.Orders;
using NSubstitute;
using Xunit;

namespace NhuNguyetSpa.Application.Tests.Payments;

/// <summary>Entitlements created by a paid order (docs/specs/orders.md: BR-ORD-06, Q-06, Q-10, Q-23; ORD-T16).</summary>
public sealed class EntitlementIssuerTests
{
    private static readonly DateTime PaidAt = new(2026, 10, 27, 3, 0, 0, DateTimeKind.Utc);
    private readonly IAppointmentRepository _appointments = Substitute.For<IAppointmentRepository>();
    private readonly ListLogger<EntitlementIssuer> _logs = new();
    private readonly IRepository<ServiceEntitlement> _entitlements = Substitute.For<IRepository<ServiceEntitlement>>();
    private readonly IRepository<CustomerPackage> _customerPackages = Substitute.For<IRepository<CustomerPackage>>();
    private readonly IRepository<TreatmentPlan> _plans = Substitute.For<IRepository<TreatmentPlan>>();
    private readonly IServicePackageRepository _packages = Substitute.For<IServicePackageRepository>();
    private readonly ICartRepository _carts = Substitute.For<ICartRepository>();
    private readonly List<ServiceEntitlement> _addedEntitlements = [];
    private readonly List<CustomerPackage> _addedPackages = [];
    private readonly List<TreatmentPlan> _addedPlans = [];

    public EntitlementIssuerTests()
    {
        _entitlements.AddAsync(Arg.Do<ServiceEntitlement>(_addedEntitlements.Add), Arg.Any<CancellationToken>()).Returns(Task.CompletedTask);
        _customerPackages.AddAsync(Arg.Do<CustomerPackage>(_addedPackages.Add), Arg.Any<CancellationToken>()).Returns(Task.CompletedTask);
        _plans.AddAsync(Arg.Do<TreatmentPlan>(_addedPlans.Add), Arg.Any<CancellationToken>()).Returns(Task.CompletedTask);
    }

    [Fact]
    public async Task IssuesServiceEntitlementAndPackageWithOrderedSessions()
    {
        var facial = new SpaService { Name = "Chăm sóc da", DurationMinutes = 60, Price = 1 };
        var massage = new SpaService { Name = "Massage mặt", DurationMinutes = 45, Price = 1 };
        var package = new ServicePackage { Name = "Gói trị mụn", Price = 2_000_000, ValidityDays = 90 };
        package.ReplaceItems([
            new ServicePackageItem { ServicePackageId = package.Id, SpaServiceId = massage.Id, SpaService = massage, SessionCount = 2, SortOrder = 2 },
            new ServicePackageItem { ServicePackageId = package.Id, SpaServiceId = facial.Id, SpaService = facial, SessionCount = 3, SortOrder = 1 },
        ]);
        _packages.GetForFulfilmentAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>()).Returns([package]);
        var order = new Order { CustomerId = Guid.NewGuid(), Status = OrderStatus.Paid };
        var serviceLine = new OrderItem { OrderId = order.Id, SpaServiceId = facial.Id, ProductName = "Chăm sóc da", UnitPrice = 300_000 };
        var packageLine = new OrderItem { OrderId = order.Id, ServicePackageId = package.Id, ProductName = "Gói trị mụn (lúc mua)", UnitPrice = 2_000_000 };
        order.Items.Add(serviceLine);
        order.Items.Add(packageLine);

        await new EntitlementIssuer(_entitlements, _customerPackages, _plans, _packages, _carts, _appointments, _logs).IssueAsync(order, PaidAt, CancellationToken.None);

        _addedEntitlements.Should().ContainSingle().Which.Should().BeEquivalentTo(new
        {
            CustomerId = order.CustomerId, OrderItemId = serviceLine.Id, ExpiresAtUtc = (DateTime?)null, Status = EntitlementStatus.Available,
        });
        var bought = _addedPackages.Should().ContainSingle().Subject;
        bought.Should().BeEquivalentTo(new
        {
            CustomerId = order.CustomerId,
            OrderItemId = packageLine.Id,
            PackageName = "Gói trị mụn (lúc mua)",
            PurchasedAtUtc = PaidAt,
            ActivatedAtUtc = (DateTime?)PaidAt,
            ExpiresAtUtc = (DateTime?)PaidAt.AddDays(90),
            TotalSessions = 5,
            UsedSessions = 0,
            Status = CustomerPackageStatus.Active,
        });
        var plan = _addedPlans.Should().ContainSingle().Subject;
        plan.CustomerPackageId.Should().Be(bought.Id);
        plan.Status.Should().Be(TreatmentPlanStatus.NotStarted);
        plan.Sessions.OrderBy(session => session.SequenceNumber)
            .Select(session => (session.SequenceNumber, session.SpaServiceId, session.ServiceName, session.DurationMinutes, session.Status))
            .Should().Equal(
                (1, facial.Id, "Chăm sóc da", 60, TreatmentSessionStatus.NotBooked),
                (2, facial.Id, "Chăm sóc da", 60, TreatmentSessionStatus.NotBooked),
                (3, facial.Id, "Chăm sóc da", 60, TreatmentSessionStatus.NotBooked),
                (4, massage.Id, "Massage mặt", 45, TreatmentSessionStatus.NotBooked),
                (5, massage.Id, "Massage mặt", 45, TreatmentSessionStatus.NotBooked));
        await _carts.Received(1).RemoveProductsAsync(order.CustomerId,
            Arg.Is<IReadOnlyCollection<Guid>>(ids => ids.SequenceEqual(new[] { facial.Id })),
            Arg.Is<IReadOnlyCollection<Guid>>(ids => ids.SequenceEqual(new[] { package.Id })), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ServiceOnlyOrderLoadsNoPackages()
    {
        var order = new Order { CustomerId = Guid.NewGuid() };
        order.Items.Add(new OrderItem { OrderId = order.Id, SpaServiceId = Guid.NewGuid(), ProductName = "Da" });

        await new EntitlementIssuer(_entitlements, _customerPackages, _plans, _packages, _carts, _appointments, _logs).IssueAsync(order, PaidAt, CancellationToken.None);

        _addedEntitlements.Should().ContainSingle();
        await _packages.DidNotReceiveWithAnyArgs().GetForFulfilmentAsync(default!, default);
    }

    private (Order Order, OrderItem Line, Appointment Hold) BookNowOrder(AppointmentStatus holdStatus, DateTime? holdExpiresAtUtc = null)
    {
        var order = new Order { Code = "DH1", CustomerId = Guid.NewGuid(), Status = OrderStatus.Paid };
        var line = new OrderItem { OrderId = order.Id, SpaServiceId = Guid.NewGuid(), ProductName = "Chăm sóc da", UnitPrice = 300_000 };
        order.Items.Add(line);
        var hold = new Appointment { OrderItemId = line.Id, Status = holdStatus, HoldExpiresAtUtc = holdExpiresAtUtc ?? PaidAt.AddMinutes(5) };
        _appointments.GetHoldsForOrdersAsync(Arg.Is<IReadOnlyCollection<Guid>>(ids => ids.Contains(order.Id)), Arg.Any<CancellationToken>())
            .Returns([hold]);
        return (order, line, hold);
    }

    private Task Issue(Order order) =>
        new EntitlementIssuer(_entitlements, _customerPackages, _plans, _packages, _carts, _appointments, _logs).IssueAsync(order, PaidAt, CancellationToken.None);

    [Fact]
    public async Task IssuerConfirmsHeldHold()
    {
        var (order, line, hold) = BookNowOrder(AppointmentStatus.Held);

        await Issue(order);

        var entitlement = _addedEntitlements.Should().ContainSingle().Subject;
        entitlement.Status.Should().Be(EntitlementStatus.Booked);
        entitlement.OrderItemId.Should().Be(line.Id);
        hold.Status.Should().Be(AppointmentStatus.Confirmed);
        hold.ServiceEntitlementId.Should().Be(entitlement.Id);
    }

    [Fact]
    public async Task IssuerConfirmsHeldEvenPastHoldTime()
    {
        var (order, _, hold) = BookNowOrder(AppointmentStatus.Held, PaidAt.AddMinutes(-1));

        await Issue(order);

        hold.Status.Should().Be(AppointmentStatus.Confirmed);
        _addedEntitlements.Single().Status.Should().Be(EntitlementStatus.Booked);
    }

    [Fact]
    public async Task IssuerLeavesExpiredHoldAndEntitlementAvailable()
    {
        var (order, _, hold) = BookNowOrder(AppointmentStatus.HoldExpired);

        await Issue(order);

        hold.Status.Should().Be(AppointmentStatus.HoldExpired);
        hold.ServiceEntitlementId.Should().BeNull();
        _addedEntitlements.Single().Status.Should().Be(EntitlementStatus.Available);
        _logs.Entries.Should().ContainSingle(entry => entry.Level == Microsoft.Extensions.Logging.LogLevel.Warning && entry.Message.Contains("DH1"));
    }
}

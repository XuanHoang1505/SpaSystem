using FluentAssertions;
using NhuNguyetSpa.Application.DTOs.Bookings;
using NhuNguyetSpa.Application.UseCases.Bookings;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Infrastructure.Repositories;
using NhuNguyetSpa.IntegrationTests.Catalog;
using NhuNguyetSpa.IntegrationTests.Infrastructure;
using NhuNguyetSpa.IntegrationTests.Purchases;
using NhuNguyetSpa.IntegrationTests.Staff;
using Xunit;
using SeedSource = NhuNguyetSpa.IntegrationTests.Staff.AppointmentSource;

namespace NhuNguyetSpa.IntegrationTests.Bookings;

/// <summary>Appointment and order reads added for UC-SPA-15 (docs/specs/bookings.md, BKG-T46).</summary>
[Collection(PostgresCollection.Name)]
public sealed class CustomerBookingRepositoryTests : IAsyncLifetime
{
    private static readonly DateOnly Day = new(2026, 11, 2);
    private readonly PostgresFixture _postgres;
    private AuthApiFactory _factory = null!;
    private StaffApi _staff = null!;

    public CustomerBookingRepositoryTests(PostgresFixture postgres) => _postgres = postgres;

    public Task InitializeAsync()
    {
        _factory = new AuthApiFactory(_postgres.ConnectionString);
        _staff = new StaffApi(_factory, _postgres);
        return Task.CompletedTask;
    }

    public async Task DisposeAsync() => await _factory.DisposeAsync();

    private static TimeOnly At(int hour) => new(hour, 0);

    [Theory]
    [InlineData(SeedSource.Entitlement, AppointmentBookingSource.Entitlement)]
    [InlineData(SeedSource.Session, AppointmentBookingSource.Session)]
    [InlineData(SeedSource.OrderItem, AppointmentBookingSource.BookNow)]
    public async Task MineSourceForEachKind(SeedSource seeded, AppointmentBookingSource expected)
    {
        var staff = await _staff.SeedStaffAsync("NV của tôi");
        var appointment = await _staff.SeedAppointmentAsync(staff.Id, Day, At(9), At(10), AppointmentStatus.Confirmed, source: seeded);
        await using var context = _postgres.CreateContext();

        var mine = (await new AppointmentRepository(context).GetMineAsync(appointment.Id, appointment.CustomerId, default))!.Appointment;

        mine!.Source.Should().Be(expected);
        mine.Staff.Should().Be(new AppointmentStaffDto(staff.Id, "NV của tôi"));
        (mine.TreatmentSession is not null).Should().Be(seeded == SeedSource.Session);
        (mine.Order is not null).Should().Be(seeded == SeedSource.OrderItem);
        (mine.ServiceEntitlementId is not null).Should().Be(seeded == SeedSource.Entitlement);
    }

    [Fact]
    public async Task MineHidesOtherCustomers()
    {
        var staff = await _staff.SeedStaffAsync("NV ẩn");
        var appointment = await _staff.SeedAppointmentAsync(staff.Id, Day, At(9), At(10), AppointmentStatus.Confirmed);
        await using var context = _postgres.CreateContext();

        (await new AppointmentRepository(context).GetMineAsync(appointment.Id, Guid.NewGuid(), default)).Should().BeNull();
    }

    [Fact]
    public async Task HoldsForOrdersReturnsHeldAndExpiredTracked()
    {
        var staff = await _staff.SeedStaffAsync("NV giữ chỗ");
        var hold = _factory.Clock.UtcNow.AddMinutes(20);
        var held = await _staff.SeedAppointmentAsync(staff.Id, Day, At(9), At(10), AppointmentStatus.Held, hold, source: SeedSource.OrderItem);
        var expired = await _staff.SeedAppointmentAsync(staff.Id, Day, At(11), At(12), AppointmentStatus.HoldExpired, hold, source: SeedSource.OrderItem);
        var confirmed = await _staff.SeedAppointmentAsync(staff.Id, Day, At(13), At(14), AppointmentStatus.Confirmed, source: SeedSource.OrderItem);
        await using var context = _postgres.CreateContext();
        var orderIds = context.OrderItems.Where(item => item.Id == held.OrderItemId || item.Id == expired.OrderItemId || item.Id == confirmed.OrderItemId)
            .Select(item => item.OrderId).ToList();

        var holds = await new AppointmentRepository(context).GetHoldsForOrdersAsync(orderIds, default);

        holds.Select(appointment => appointment.Id).Should().BeEquivalentTo([held.Id, expired.Id]);
        context.ChangeTracker.Entries().Should().HaveCount(2);
    }

    [Fact]
    public async Task OrderDetailIncludesBookNowAppointment()
    {
        var staff = await _staff.SeedStaffAsync("NV đơn");
        var appointment = await _staff.SeedAppointmentAsync(
            staff.Id, Day, At(9), At(10), AppointmentStatus.Held, _factory.Clock.UtcNow.AddMinutes(20), source: SeedSource.OrderItem);
        await using var context = _postgres.CreateContext();
        var orderId = context.OrderItems.Where(item => item.Id == appointment.OrderItemId).Select(item => item.OrderId).Single();

        var detail = await new OrderRepository(context).GetDetailAsync(orderId, appointment.CustomerId, default);

        detail!.Appointment.Should().NotBeNull();
        detail.Appointment!.Id.Should().Be(appointment.Id);
        detail.Appointment.Status.Should().Be(AppointmentStatus.Held);
        detail.Appointment.Staff.FullName.Should().Be("NV đơn");
    }

    [Fact]
    public async Task SearchMineGroupsAndOrdersByScope()
    {
        var staff = await _staff.SeedStaffAsync("NV danh sách");
        var customer = await _staff.SeedCustomerAsync("Khách danh sách");
        var hold = _factory.Clock.UtcNow.AddMinutes(20);
        async Task<Guid> Seed(int dayOffset, AppointmentStatus status) =>
            (await _staff.SeedAppointmentAsync(staff.Id, Day.AddDays(dayOffset), At(9), At(10), status,
                status is AppointmentStatus.Held or AppointmentStatus.HoldExpired ? hold : null, customerId: customer.Id)).Id;
        var held = await Seed(3, AppointmentStatus.Held);
        var pending = await Seed(2, AppointmentStatus.PendingConfirmation);
        var confirmed = await Seed(1, AppointmentStatus.Confirmed);
        var completed = await Seed(-5, AppointmentStatus.Completed);
        var noShow = await Seed(-3, AppointmentStatus.NoShow);
        var cancelled = await Seed(4, AppointmentStatus.Cancelled);
        var expired = await Seed(5, AppointmentStatus.HoldExpired);
        await _staff.SeedAppointmentAsync(staff.Id, Day.AddDays(1), At(11), At(12), AppointmentStatus.Confirmed);
        await using var context = _postgres.CreateContext();
        var repository = new AppointmentRepository(context);
        async Task<Guid[]> Ids(MyAppointmentScope? scope, AppointmentStatus? status = null, DateOnly? from = null, DateOnly? to = null, int size = 10) =>
            (await repository.SearchMineAsync(customer.Id, new MyAppointmentSearchCriteria(scope, status, from, to, 1, size), default))
                .Items.Select(row => row.Item.Id).ToArray();

        (await Ids(MyAppointmentScope.Upcoming)).Should().Equal(confirmed, pending, held);
        (await Ids(MyAppointmentScope.Past)).Should().Equal(noShow, completed);
        (await Ids(MyAppointmentScope.Cancelled)).Should().Equal(expired, cancelled);
        (await Ids(null)).Should().Equal(expired, cancelled, held, pending, confirmed, noShow, completed);
        (await Ids(MyAppointmentScope.Past, AppointmentStatus.Confirmed)).Should().BeEmpty();
        (await Ids(null, AppointmentStatus.Confirmed)).Should().Equal(confirmed);
        (await Ids(null, null, Day.AddDays(1), Day.AddDays(3))).Should().Equal(held, pending, confirmed);
        var page = await repository.SearchMineAsync(customer.Id, new MyAppointmentSearchCriteria(null, null, null, null, 2, 3), default);
        (page.TotalCount, page.Items.Count).Should().Be((7, 3));
        page.Items[0].Facts.Status.Should().Be(AppointmentStatus.PendingConfirmation);
    }

    [Fact]
    public async Task SessionFactsIncludeNextVisit()
    {
        var catalog = new CatalogApi(_factory, _postgres);
        var purchases = new PurchaseApi(_factory, _postgres);
        var staff = await _staff.SeedStaffAsync("NV buổi sau");
        var customer = await _staff.SeedCustomerAsync("Khách gói");
        var first = await catalog.SeedServiceAsync(CatalogApi.NewTag() + " A");
        var second = await catalog.SeedServiceAsync(CatalogApi.NewTag() + " B");
        // Items: first × 1, second × 2 (gap 7) → sessions 1, 2, 3.
        var package = await catalog.SeedPackageAsync(CatalogApi.NewTag() + " gói", [first, second]);
        var bought = await purchases.SeedPackageAsync(customer.Id, package, [first, second],
            [TreatmentSessionStatus.Booked, TreatmentSessionStatus.Booked, TreatmentSessionStatus.Booked]);
        await purchases.SeedSessionAppointmentAsync(bought.Sessions[0], customer.Id, staff.Id, Day, At(9), At(10), AppointmentStatus.Confirmed);
        await purchases.SeedSessionAppointmentAsync(bought.Sessions[1], customer.Id, staff.Id, Day.AddDays(7), At(9), At(10), AppointmentStatus.Confirmed);
        await purchases.SeedSessionAppointmentAsync(bought.Sessions[2], customer.Id, staff.Id, Day.AddDays(14), At(11), At(12), AppointmentStatus.Confirmed);
        await using var context = _postgres.CreateContext();
        var repository = new PurchaseRepository(context);

        var middle = await repository.GetSessionFactsAsync(bought.Sessions[1].Id, customer.Id, default);
        var last = await repository.GetSessionFactsAsync(bought.Sessions[2].Id, customer.Id, default);

        middle!.Next.Should().Be(new NextVisit(Day.AddDays(14), At(11), 7));
        last!.Next.Should().BeNull();
    }
}

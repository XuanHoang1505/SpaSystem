using FluentAssertions;
using NhuNguyetSpa.Application.UseCases.Bookings;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Infrastructure.Repositories;
using NhuNguyetSpa.IntegrationTests.Catalog;
using NhuNguyetSpa.IntegrationTests.Infrastructure;
using NhuNguyetSpa.IntegrationTests.Staff;
using Xunit;

namespace NhuNguyetSpa.IntegrationTests.Purchases;

/// <summary>Reads behind UC-SPA-18 and UC-SPA-15 flow 2 (docs/specs/purchases-treatments.md, bookings.md BR-BKG-05).</summary>
[Collection(PostgresCollection.Name)]
public sealed class PurchaseRepositoryTests : IAsyncLifetime
{
    private static readonly DateOnly Day = new(2026, 11, 2);
    private readonly PostgresFixture _postgres;
    private AuthApiFactory _factory = null!;
    private CatalogApi _catalog = null!;
    private StaffApi _staff = null!;
    private PurchaseApi _purchases = null!;

    public PurchaseRepositoryTests(PostgresFixture postgres) => _postgres = postgres;

    public Task InitializeAsync()
    {
        _factory = new AuthApiFactory(_postgres.ConnectionString);
        _catalog = new CatalogApi(_factory, _postgres);
        _staff = new StaffApi(_factory, _postgres);
        _purchases = new PurchaseApi(_factory, _postgres);
        return Task.CompletedTask;
    }

    public async Task DisposeAsync() => await _factory.DisposeAsync();

    private static TimeOnly At(int hour, int minute = 0) => new(hour, minute);

    [Fact]
    public async Task ListsNewestFirstHidesOtherCustomersAndIsCapped()
    {
        var customer = await _staff.SeedCustomerAsync("Khách mua");
        var other = await _staff.SeedCustomerAsync("Khách khác");
        var service = await _catalog.SeedServiceAsync(CatalogApi.NewTag() + " dịch vụ", imageUrl: "https://img.test/a.jpg");
        var now = _factory.Clock.UtcNow;
        var (older, _) = await _purchases.SeedEntitlementAsync(customer.Id, service, orderCreatedAtUtc: now.AddDays(-3));
        var (newer, _) = await _purchases.SeedEntitlementAsync(customer.Id, service, orderCreatedAtUtc: now.AddDays(-1));
        await _purchases.SeedEntitlementAsync(other.Id, service);
        await using var context = _postgres.CreateContext();
        var repository = new PurchaseRepository(context);

        var rows = await repository.ListServicesAsync(customer.Id, 10, default);
        var capped = await repository.ListServicesAsync(customer.Id, 1, default);

        rows.Select(row => row.Id).Should().Equal(newer.Id, older.Id);
        rows[0].ImageUrl.Should().Be("https://img.test/a.jpg");
        rows[0].DurationMinutes.Should().Be(60);
        capped.Select(row => row.Id).Should().Equal(newer.Id);
        (await repository.GetServiceAsync(newer.Id, other.Id, default)).Should().BeNull();
    }

    [Fact]
    public async Task PurchasedAtUsesPaidAtOrCreatedForZeroOrder()
    {
        var customer = await _staff.SeedCustomerAsync("Khách thời điểm");
        var service = await _catalog.SeedServiceAsync(CatalogApi.NewTag() + " dịch vụ");
        var created = new DateTime(2026, 10, 20, 3, 0, 0, DateTimeKind.Utc);
        var (paid, _) = await _purchases.SeedEntitlementAsync(customer.Id, service, orderCreatedAtUtc: created);
        var (free, _) = await _purchases.SeedEntitlementAsync(customer.Id, service, amount: 0, orderCreatedAtUtc: created);
        await using var context = _postgres.CreateContext();
        var repository = new PurchaseRepository(context);

        (await repository.GetServiceAsync(paid.Id, customer.Id, default))!.PurchasedAtUtc.Should().Be(created.AddMinutes(2));
        (await repository.GetServiceAsync(free.Id, customer.Id, default))!.PurchasedAtUtc.Should().Be(created);
    }

    [Fact]
    public async Task ServiceRowCarriesBookedAppointmentAndOrder()
    {
        var customer = await _staff.SeedCustomerAsync("Khách lịch");
        var staff = await _staff.SeedStaffAsync("NV lịch");
        var service = await _catalog.SeedServiceAsync(CatalogApi.NewTag() + " dịch vụ");
        var (entitlement, order) = await _purchases.SeedEntitlementAsync(customer.Id, service, EntitlementStatus.Booked);
        await _purchases.SeedEntitlementAppointmentAsync(entitlement, staff.Id, Day, At(8), At(9), AppointmentStatus.Cancelled);
        var booked = await _purchases.SeedEntitlementAppointmentAsync(entitlement, staff.Id, Day, At(9), At(10), AppointmentStatus.Confirmed);
        await using var context = _postgres.CreateContext();

        var row = await new PurchaseRepository(context).GetServiceAsync(entitlement.Id, customer.Id, default);

        row!.Appointment!.Id.Should().Be(booked.Id);
        row.Order.Code.Should().Be(order.Code);
        row.ServiceName.Should().Be(service.Name);
    }

    [Fact]
    public async Task PackageCountsNextSessionAndItems()
    {
        var customer = await _staff.SeedCustomerAsync("Khách gói");
        var first = await _catalog.SeedServiceAsync(CatalogApi.NewTag() + " A");
        var second = await _catalog.SeedServiceAsync(CatalogApi.NewTag() + " B");
        // Items: A × 1, B × 2 → sessions 1 (A), 2 (B), 3 (B).
        var package = await _catalog.SeedPackageAsync(CatalogApi.NewTag() + " gói", [first, second]);
        var bought = await _purchases.SeedPackageAsync(customer.Id, package, [first, second],
            [TreatmentSessionStatus.Completed, TreatmentSessionStatus.Booked]);
        await using var context = _postgres.CreateContext();
        var repository = new PurchaseRepository(context);

        var row = (await repository.ListPackagesAsync(customer.Id, 10, default)).Single();
        var detail = await repository.GetPackageAsync(bought.Package.Id, customer.Id, withItems: true, default);

        row.UsedSessions.Should().Be(1);
        row.BookedSessions.Should().Be(1);
        row.TreatmentPlanId.Should().Be(bought.Plan.Id);
        row.NextSession!.SessionId.Should().Be(bought.Sessions[2].Id);
        row.NextSessionServiceName.Should().Be(second.Name);
        row.Items.Should().BeNull();
        detail!.Items.Should().Equal(
            new Application.DTOs.Purchases.PackageItemProgressDto(first.Id, first.Name, 1, 1, 0),
            new Application.DTOs.Purchases.PackageItemProgressDto(second.Id, second.Name, 2, 0, 1));
    }

    [Fact]
    public async Task SessionFactsComputesEarlierDonePreviousAndMinDays()
    {
        var customer = await _staff.SeedCustomerAsync("Khách buổi");
        var staff = await _staff.SeedStaffAsync("NV buổi");
        var service = await _catalog.SeedServiceAsync(CatalogApi.NewTag() + " A");
        var other = await _catalog.SeedServiceAsync(CatalogApi.NewTag() + " B");
        // Items: A × 1, B × 2 (min 7 days each, from the catalog seed).
        var package = await _catalog.SeedPackageAsync(CatalogApi.NewTag() + " gói", [service, other]);
        var bought = await _purchases.SeedPackageAsync(customer.Id, package, [service, other], [TreatmentSessionStatus.Booked]);
        await _purchases.SeedSessionAppointmentAsync(bought.Sessions[0], customer.Id, staff.Id, Day, At(8), At(9), AppointmentStatus.Cancelled);
        await _purchases.SeedSessionAppointmentAsync(bought.Sessions[0], customer.Id, staff.Id, Day, At(9), At(10), AppointmentStatus.Confirmed);
        await using var context = _postgres.CreateContext();
        var repository = new PurchaseRepository(context);

        var second = await repository.GetSessionFactsAsync(bought.Sessions[1].Id, customer.Id, default);
        var third = await repository.GetSessionFactsAsync(bought.Sessions[2].Id, customer.Id, default);

        // PostgreSQL keeps microseconds, so the expiry is compared with a tolerance.
        second!.PackageExpiresAtUtc.Should().BeCloseTo(bought.Package.ExpiresAtUtc!.Value, TimeSpan.FromMilliseconds(1));
        (second with { PackageExpiresAtUtc = null }).Should().Be(new SessionBookingFacts(
            bought.Sessions[1].Id, other.Id, 45, 2, TreatmentSessionStatus.NotBooked, CustomerPackageStatus.Active,
            null, TreatmentPlanStatus.InProgress, true, new PreviousVisit(Day, At(10)), 7));
        third!.EarlierSessionsDone.Should().BeFalse();
        third.Previous.Should().BeNull();
        (await repository.GetSessionFactsAsync(bought.Sessions[1].Id, Guid.NewGuid(), default)).Should().BeNull();
    }

    [Fact]
    public async Task EntitlementForBookingIsTrackedAndOwned()
    {
        var customer = await _staff.SeedCustomerAsync("Khách đặt");
        var service = await _catalog.SeedServiceAsync(CatalogApi.NewTag() + " dịch vụ");
        var (entitlement, _) = await _purchases.SeedEntitlementAsync(customer.Id, service);
        await using var context = _postgres.CreateContext();
        var repository = new PurchaseRepository(context);

        var found = await repository.GetEntitlementForBookingAsync(entitlement.Id, customer.Id, default);

        found!.Value.SpaServiceId.Should().Be(service.Id);
        context.Entry(found.Value.Entitlement).State.Should().Be(Microsoft.EntityFrameworkCore.EntityState.Unchanged);
        (await repository.GetEntitlementForBookingAsync(entitlement.Id, Guid.NewGuid(), default)).Should().BeNull();
    }
}

using System.Diagnostics;
using System.Net;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.IntegrationTests.Catalog;
using NhuNguyetSpa.IntegrationTests.Infrastructure;
using Xunit;
using static NhuNguyetSpa.IntegrationTests.Bookings.BookingApi;

namespace NhuNguyetSpa.IntegrationTests.Bookings;

/// <summary>Concurrent customer bookings (docs/specs/bookings.md A9, BR-BKG-14; BKG-T33 = UAT-02, T40, T42).</summary>
[Collection(PostgresCollection.Name)]
public sealed class CustomerBookingConcurrencyTests : IAsyncLifetime
{
    private readonly PostgresFixture _postgres;
    private AuthApiFactory _factory = null!;
    private CustomerBookingApi _api = null!;

    public CustomerBookingConcurrencyTests(PostgresFixture postgres) => _postgres = postgres;

    private static DateOnly Day => CustomerBookingApi.Day;

    public Task InitializeAsync()
    {
        _factory = new AuthApiFactory(_postgres.ConnectionString);
        _api = new CustomerBookingApi(_factory, _postgres);
        return Task.CompletedTask;
    }

    public async Task DisposeAsync()
    {
        _api.Dispose();
        _api.Api.Client.Dispose();
        await _factory.DisposeAsync();
    }

    [Fact]
    public async Task TwoCustomersSameSlotOnlyOneWins()
    {
        var (service, staff) = await _api.SeedServiceWithStaffAsync();
        var (first, firstId) = await _api.Booking.LoginCustomerAsync();
        var (second, secondId) = await _api.Booking.LoginCustomerAsync();

        var results = await Task.WhenAll(
            _api.BookNowAsync(first, service.Id, Day, At(9), staff.Id),
            _api.BookNowAsync(second, service.Id, Day, At(9), staff.Id));

        results.Select(result => result.Response.StatusCode).Should().BeEquivalentTo([HttpStatusCode.Created, HttpStatusCode.Conflict]);
        CatalogApi.ErrorCode(results.Single(result => result.Response.StatusCode == HttpStatusCode.Conflict).Body).Should().Be("slot_unavailable");
        await using var context = _postgres.CreateContext();
        (await context.Appointments.CountAsync(row => row.StaffMemberId == staff.Id)).Should().Be(1);
        (await context.Orders.CountAsync(row => row.CustomerId == firstId || row.CustomerId == secondId)).Should().Be(1);
    }

    /// <summary>BKG-T62: two customers move their appointments into one slot of one staff member at the same time.</summary>
    [Fact]
    public async Task Bkg_T62_TwoReschedulesIntoOneSlot()
    {
        var (service, staff) = await _api.SeedServiceWithStaffAsync();
        var ids = new List<(string Token, Guid AppointmentId)>();
        foreach (var start in new[] { At(8), At(9) })
        {
            var (token, customerId) = await _api.Booking.LoginCustomerAsync();
            var (entitlement, _) = await _api.Purchases.SeedEntitlementAsync(customerId, service);
            var (_, body) = await _api.BookAsync(token, Day, start, entitlementId: entitlement.Id, staffId: staff.Id);
            ids.Add((token, CatalogApi.Data(body).GetProperty("id").GetGuid()));
        }

        var watch = Stopwatch.StartNew();
        var results = await Task.WhenAll(ids.Select(item => _api.RescheduleAsync(item.Token, item.AppointmentId, Day, At(10, 30), staff.Id)));

        watch.Elapsed.Should().BeLessThan(TimeSpan.FromSeconds(20));
        results.Select(result => result.Response.StatusCode).Should().BeEquivalentTo([HttpStatusCode.OK, HttpStatusCode.Conflict]);
        CatalogApi.ErrorCode(results.Single(result => result.Response.StatusCode == HttpStatusCode.Conflict).Body).Should().Be("slot_unavailable");
        await using var context = _postgres.CreateContext();
        (await context.Appointments.CountAsync(row => row.StaffMemberId == staff.Id && row.StartTime == At(10, 30))).Should().Be(1);
    }

    /// <summary>BKG-T62: the customer moves an appointment while the owner cancels it; the row lock orders them.</summary>
    [Fact]
    public async Task Bkg_T62_RescheduleRacesOwnerCancel()
    {
        var (service, staff) = await _api.SeedServiceWithStaffAsync();
        var (token, customerId) = await _api.Booking.LoginCustomerAsync();
        var owner = await _api.Api.LoginAsync(UserRole.Owner);
        var (entitlement, _) = await _api.Purchases.SeedEntitlementAsync(customerId, service);
        var (_, booked) = await _api.BookAsync(token, Day, At(8), entitlementId: entitlement.Id, staffId: staff.Id);
        var id = CatalogApi.Data(booked).GetProperty("id").GetGuid();

        var move = _api.RescheduleAsync(token, id, Day, At(10), staff.Id);
        var cancel = _api.Api.SendJsonAsync(HttpMethod.Post, $"/api/v1/appointments/{id}/cancel", new { reason = "Spa bận" }, owner);
        await Task.WhenAll(move, cancel);

        (await cancel).Response.StatusCode.Should().Be(HttpStatusCode.OK);
        (await move).Response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.Conflict);
        await using var context = _postgres.CreateContext();
        (await context.Appointments.SingleAsync(row => row.Id == id)).Status.Should().Be(AppointmentStatus.Cancelled);
        (await context.ServiceEntitlements.SingleAsync(row => row.Id == entitlement.Id)).Status.Should().Be(EntitlementStatus.Available);
    }

    [Fact]
    public async Task SameEntitlementTwoSlotsOnlyOneWins()
    {
        var (service, staff) = await _api.SeedServiceWithStaffAsync();
        var other = await _api.Booking.SeedQualifiedStaffAsync("Khác " + CatalogApi.NewTag(), service.Id, (Day, 8, 12));
        var (token, customerId) = await _api.Booking.LoginCustomerAsync();
        var (entitlement, _) = await _api.Purchases.SeedEntitlementAsync(customerId, service);

        var results = await Task.WhenAll(
            _api.BookAsync(token, Day, At(8), entitlementId: entitlement.Id, staffId: staff.Id),
            _api.BookAsync(token, Day, At(10), entitlementId: entitlement.Id, staffId: other.Id));

        results.Select(result => result.Response.StatusCode).Should().BeEquivalentTo([HttpStatusCode.Created, HttpStatusCode.Conflict]);
        CatalogApi.ErrorCode(results.Single(result => result.Response.StatusCode == HttpStatusCode.Conflict).Body)
            .Should().Be("entitlement_not_eligible");
        await using var context = _postgres.CreateContext();
        (await context.Appointments.CountAsync(row => row.ServiceEntitlementId == entitlement.Id)).Should().Be(1);
        (await context.ServiceEntitlements.SingleAsync(row => row.Id == entitlement.Id)).Status.Should().Be(EntitlementStatus.Booked);
    }

    [Fact]
    public async Task TwoAnyStaffBookingsGetDifferentStaffWithoutDeadlock()
    {
        var service = await _api.Api.SeedServiceAsync(CatalogApi.NewTag() + " dịch vụ");
        var a = await _api.Booking.SeedQualifiedStaffAsync("A " + CatalogApi.NewTag(), service.Id, (Day, 8, 12));
        var b = await _api.Booking.SeedQualifiedStaffAsync("B " + CatalogApi.NewTag(), service.Id, (Day, 8, 12));
        var (first, _) = await _api.Booking.LoginCustomerAsync();
        var (second, _) = await _api.Booking.LoginCustomerAsync();
        var clock = Stopwatch.StartNew();

        var results = await Task.WhenAll(
            _api.BookNowAsync(first, service.Id, Day, At(9)),
            _api.BookNowAsync(second, service.Id, Day, At(9)));

        clock.Elapsed.Should().BeLessThan(TimeSpan.FromSeconds(10));
        results.Select(result => result.Response.StatusCode).Should().AllBeEquivalentTo(HttpStatusCode.Created);
        results.Select(result => CatalogApi.Data(result.Body).GetProperty("appointment").GetProperty("staff").GetProperty("id").GetGuid())
            .Should().BeEquivalentTo([a.Id, b.Id]);
    }
}

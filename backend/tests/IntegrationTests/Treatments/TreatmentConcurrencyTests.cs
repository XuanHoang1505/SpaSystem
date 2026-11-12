using System.Net;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.IntegrationTests.Catalog;
using NhuNguyetSpa.IntegrationTests.Infrastructure;
using Xunit;

namespace NhuNguyetSpa.IntegrationTests.Treatments;

/// <summary>TRT-T30: booking the next session races the owner cancelling the plan (BR-TRT-08 lock order: customer row, then package).</summary>
[Collection(PostgresCollection.Name)]
public sealed class TreatmentConcurrencyTests : IAsyncLifetime
{
    private const int Rounds = 10;
    private readonly PostgresFixture _postgres;
    private AuthApiFactory _factory = null!;
    private TreatmentApi _api = null!;

    public TreatmentConcurrencyTests(PostgresFixture postgres) => _postgres = postgres;

    public Task InitializeAsync()
    {
        _factory = new AuthApiFactory(_postgres.ConnectionString);
        _api = new TreatmentApi(_factory, _postgres);
        return Task.CompletedTask;
    }

    public async Task DisposeAsync()
    {
        _api.Api.Client.Dispose();
        await _factory.DisposeAsync();
    }

    [Fact]
    public async Task TrtT30_BookingAndCancelNeverBothWin()
    {
        var owner = await _api.Api.LoginAsync(UserRole.Owner);
        var (customer, customerId) = await _api.Booking.LoginCustomerAsync();
        var service = await _api.Api.SeedServiceAsync("Chăm sóc da " + Guid.NewGuid().ToString("N")[..6]);
        var days = Enumerable.Range(1, Rounds).Select(offset => _api.Today.AddDays(offset)).ToList();
        var staff = await _api.Booking.SeedQualifiedStaffAsync("An", service.Id, days.Select(day => (day, 8, 17)).ToArray());
        var booking = new CustomerBookingFacade(_api, customer);

        for (var round = 0; round < Rounds; round++)
        {
            var plan = await _api.SeedPlanAsync(customerId, [TreatmentSessionStatus.NotBooked, TreatmentSessionStatus.NotBooked], service: service);

            var book = booking.BookAsync(plan.Sessions[0].Id, days[round], staff.Id);
            var cancel = _api.Post($"/api/v1/treatments/{plan.PlanId}/cancel", new { reason = "Khách chuyển nơi ở" }, owner);
            await Task.WhenAll(book, cancel);
            var (bookResponse, bookBody) = await book;
            var (cancelResponse, cancelBody) = await cancel;

            var booked = bookResponse.IsSuccessStatusCode;
            var cancelled = cancelResponse.IsSuccessStatusCode;
            (booked ^ cancelled).Should().BeTrue($"round {round}: exactly one request wins");
            if (booked)
            {
                cancelResponse.StatusCode.Should().Be(HttpStatusCode.Conflict);
                CatalogApi.ErrorCode(cancelBody).Should().Be("treatment_has_booked_sessions");
            }
            else
            {
                bookResponse.StatusCode.Should().Be(HttpStatusCode.Conflict);
                CatalogApi.ErrorCode(bookBody).Should().Be("entitlement_not_eligible");
            }
        }

        await using var context = _api.Db();
        (await context.TreatmentSessions.AnyAsync(session => session.Status == TreatmentSessionStatus.Booked &&
                                                             session.TreatmentPlan.Status == TreatmentPlanStatus.Cancelled))
            .Should().BeFalse();
    }
}

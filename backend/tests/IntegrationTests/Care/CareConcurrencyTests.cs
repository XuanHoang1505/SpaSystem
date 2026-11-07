using System.Net;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.IntegrationTests.Infrastructure;
using Xunit;

namespace NhuNguyetSpa.IntegrationTests.Care;

/// <summary>Races of UC-SPA-27 and UC-SPA-28 (docs/specs/care.md CARE-T02, CARE-T22).</summary>
[Collection(PostgresCollection.Name)]
public sealed class CareConcurrencyTests : IAsyncLifetime
{
    private readonly PostgresFixture _postgres;
    private AuthApiFactory _factory = null!;
    private CareApi _care = null!;
    private string _staff = null!;
    private Guid _staffId;

    public CareConcurrencyTests(PostgresFixture postgres) => _postgres = postgres;

    public async Task InitializeAsync()
    {
        _factory = new AuthApiFactory(_postgres.ConnectionString);
        _care = new CareApi(_factory, _postgres);
        (_staff, _staffId) = await _care.Booking.LoginStaffAsync();
    }

    public async Task DisposeAsync()
    {
        _care.Api.Client.Dispose();
        await _factory.DisposeAsync();
    }

    private async Task<HttpStatusCode> Post(string path, object body)
    {
        var (response, _) = await _care.Api.SendJsonAsync(HttpMethod.Post, path, body, _staff);
        return response.StatusCode;
    }

    [Fact]
    public async Task CareT02_TwoCreatesAtOnceKeepOneProfile()
    {
        var visit = await _care.SeedVisitAsync(_staffId, AppointmentStatus.Confirmed, _care.Today);
        var path = $"/api/v1/appointments/{visit.Id}/skin-profile";

        var results = await Task.WhenAll(Post(path, new { skinType = "dry" }), Post(path, new { skinType = "oily" }));

        results.Should().BeEquivalentTo([HttpStatusCode.Created, HttpStatusCode.Conflict]);
        await using var context = _care.Db();
        (await context.SkinProfiles.CountAsync(profile => profile.AppointmentId == visit.Id)).Should().Be(1);
    }

    [Fact]
    public async Task CareT22_SameVisitTwiceCompletesOnce()
    {
        var visit = await _care.SeedVisitAsync(_staffId, AppointmentStatus.Confirmed, _care.Today.AddDays(-1));
        var path = $"/api/v1/appointments/{visit.Id}/complete";

        var results = await Task.WhenAll(Post(path, new { }), Post(path, new { }));

        results.Should().BeEquivalentTo([HttpStatusCode.OK, HttpStatusCode.Conflict]);
    }

    [Fact]
    public async Task CareT22_TwoSessionsOfOnePackageBothCount()
    {
        var yesterday = _care.Today.AddDays(-1);
        var (first, packageId, planId) = await _care.SeedPackageVisitAsync(_staffId, total: 3, sequence: 1, yesterday);
        Guid secondVisitId;
        await using (var context = _care.Db())
        {
            // Book session 2 of the same package for the same customer at another hour.
            var session = await context.TreatmentSessions.SingleAsync(item => item.TreatmentPlanId == planId && item.SequenceNumber == 2);
            session.Status = TreatmentSessionStatus.Booked;
            var second = new Domain.Entities.Appointment
            {
                CustomerId = first.CustomerId, StaffMemberId = _staffId, TreatmentSessionId = session.Id, Date = yesterday,
                StartTime = new TimeOnly(14, 0), EndTime = new TimeOnly(15, 0), Status = AppointmentStatus.Confirmed, CreatedAtUtc = DateTime.UtcNow,
            };
            context.Appointments.Add(second);
            await context.SaveChangesAsync();
            secondVisitId = second.Id;
        }

        var results = await Task.WhenAll(
            Post($"/api/v1/appointments/{first.Id}/complete", new { }), Post($"/api/v1/appointments/{secondVisitId}/complete", new { }));

        results.Should().AllBeEquivalentTo(HttpStatusCode.OK);
        await using var check = _care.Db();
        (await check.CustomerPackages.SingleAsync(item => item.Id == packageId)).UsedSessions.Should().Be(2);
    }
}

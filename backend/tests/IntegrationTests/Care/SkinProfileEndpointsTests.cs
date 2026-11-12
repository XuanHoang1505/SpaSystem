using System.Net;
using System.Text.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.IntegrationTests.Catalog;
using NhuNguyetSpa.IntegrationTests.Infrastructure;
using NhuNguyetSpa.IntegrationTests.Staff;
using Xunit;
using NhuNguyetSpa.IntegrationTests.Bookings;
using static NhuNguyetSpa.IntegrationTests.Care.CareApi;

namespace NhuNguyetSpa.IntegrationTests.Care;

/// <summary>UC-SPA-27 skin profiles and the detail additions (docs/specs/care.md CARE-T01..T09, T13).</summary>
[Collection(PostgresCollection.Name)]
public sealed class SkinProfileEndpointsTests : IAsyncLifetime
{
    private readonly PostgresFixture _postgres;
    private AuthApiFactory _factory = null!;
    private CareApi _care = null!;
    private string _staff = null!;
    private Guid _staffId;

    public SkinProfileEndpointsTests(PostgresFixture postgres) => _postgres = postgres;

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

    private static object Body(string? skinType = "oily", string? concerns = "Mụn ẩn", string? note = null) => new
    {
        skinType, mainConcerns = concerns, currentProducts = "Sữa rửa mặt", careGoals = "Giảm dầu", recommendedTreatment = "Gói 5 buổi", note,
    };

    private Task<(HttpResponseMessage Response, JsonDocument Body)> Create(Guid appointmentId, object body, string? bearer = null) =>
        _care.Api.SendJsonAsync(HttpMethod.Post, $"/api/v1/appointments/{appointmentId}/skin-profile", body, bearer ?? _staff);

    private Task<(HttpResponseMessage Response, JsonDocument Body)> Update(Guid profileId, object body, string? bearer = null) =>
        _care.Api.SendJsonAsync(HttpMethod.Put, $"/api/v1/skin-profiles/{profileId}", body, bearer ?? _staff);

    private Task<(HttpResponseMessage Response, JsonDocument Body)> Read(Guid appointmentId, string? bearer) =>
        _care.Api.GetAsync($"/api/v1/appointments/{appointmentId}/skin-profile", bearer);

    [Fact]
    public async Task CareT01_AssignedStaffCreatesProfile()
    {
        var visit = await _care.SeedVisitAsync(_staffId, AppointmentStatus.Confirmed, _care.Today);

        var (response, body) = await Create(visit.Id, Body());

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        response.Headers.Location!.ToString().Should().EndWith($"/api/v1/appointments/{visit.Id}/skin-profile");
        var data = CatalogApi.Data(body);
        data.GetProperty("skinType").GetString().Should().Be("oily");
        data.GetProperty("customerId").GetGuid().Should().Be(visit.CustomerId);
        data.GetProperty("assessedBy").GetProperty("id").GetGuid().Should().Be(_staffId);
        var profileId = data.GetProperty("id").GetGuid();

        var (_, detail) = await _care.Api.GetAsync($"/api/v1/appointments/{visit.Id}", _staff);
        CatalogApi.Data(detail).GetProperty("hasSkinProfile").GetBoolean().Should().BeTrue();
        CatalogApi.Data(detail).GetProperty("skinProfileId").GetGuid().Should().Be(profileId);
    }

    [Fact]
    public async Task CareT02_SecondCreateConflicts()
    {
        var visit = await _care.SeedVisitAsync(_staffId, AppointmentStatus.Confirmed, _care.Today);
        await Create(visit.Id, Body());

        ShouldFail(await Create(visit.Id, Body()), HttpStatusCode.Conflict, "skin_profile_exists");
    }

    [Fact]
    public async Task CareT03_StatusAndDayChecked()
    {
        var tomorrow = await _care.SeedVisitAsync(_staffId, AppointmentStatus.Confirmed, _care.Today.AddDays(1));
        ShouldFail(await Create(tomorrow.Id, Body()), HttpStatusCode.BadRequest, "skin_profile_too_early");

        var hour = 8;
        foreach (var status in new[]
                 {
                     AppointmentStatus.Cancelled, AppointmentStatus.NoShow, AppointmentStatus.PendingConfirmation, AppointmentStatus.Held,
                 })
        {
            var visit = await _care.SeedVisitAsync(_staffId, status, _care.Today, BookingApi.At(hour += 2));
            ShouldFail(await Create(visit.Id, Body()), HttpStatusCode.Conflict, "appointment_status_invalid");
        }
    }

    [Fact]
    public async Task CareT04_CompletedWindow()
    {
        var day7 = await _care.SeedVisitAsync(_staffId, AppointmentStatus.Completed, _care.Today.AddDays(-7));
        var day8 = await _care.SeedVisitAsync(_staffId, AppointmentStatus.Completed, _care.Today.AddDays(-8));

        var (created, body) = await Create(day7.Id, Body());
        created.StatusCode.Should().Be(HttpStatusCode.Created);
        (await Update(CatalogApi.Data(body).GetProperty("id").GetGuid(), Body("dry"))).Response.StatusCode.Should().Be(HttpStatusCode.OK);

        ShouldFail(await Create(day8.Id, Body()), HttpStatusCode.Conflict, "skin_profile_locked");
        var old = await _care.SeedSkinProfileAsync(day8, _staffId);
        ShouldFail(await Update(old.Id, Body()), HttpStatusCode.Conflict, "skin_profile_locked");
    }

    [Fact]
    public async Task CareT05_Validation()
    {
        var visit = await _care.SeedVisitAsync(_staffId, AppointmentStatus.Confirmed, _care.Today);

        ShouldFail(await Create(visit.Id, Body(skinType: null)), HttpStatusCode.BadRequest);
        ShouldFail(await Create(visit.Id, Body(skinType: "x")), HttpStatusCode.BadRequest);
        ShouldFail(await Create(visit.Id, Body(concerns: new string('a', 2001))), HttpStatusCode.BadRequest);

        var (_, body) = await Create(visit.Id, Body(concerns: "   "));
        CatalogApi.Data(body).GetProperty("mainConcerns").ValueKind.Should().Be(JsonValueKind.Null);
    }

    [Fact]
    public async Task CareT06_UpdateKeepsAssessorAndAudits()
    {
        var visit = await _care.SeedVisitAsync(_staffId, AppointmentStatus.Confirmed, _care.Today);
        var (_, created) = await Create(visit.Id, Body());
        var id = CatalogApi.Data(created).GetProperty("id").GetGuid();
        var assessedAt = CatalogApi.Data(created).GetProperty("assessedAtUtc").GetDateTime();

        var (response, body) = await Update(id, Body("sensitive", "Đỏ rát"));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var data = CatalogApi.Data(body);
        data.GetProperty("skinType").GetString().Should().Be("sensitive");
        data.GetProperty("mainConcerns").GetString().Should().Be("Đỏ rát");
        data.GetProperty("assessedAtUtc").GetDateTime().Should().Be(assessedAt);
        data.GetProperty("updatedAtUtc").ValueKind.Should().NotBe(JsonValueKind.Null);
        await using var context = _care.Db();
        (await context.SkinProfiles.SingleAsync(profile => profile.Id == id)).UpdatedBy.Should().Be(_staffId);
    }

    [Fact]
    public async Task CareT07_Permissions()
    {
        var visit = await _care.SeedVisitAsync(_staffId, AppointmentStatus.Confirmed, _care.Today);
        var (_, created) = await Create(visit.Id, Body());
        var id = CatalogApi.Data(created).GetProperty("id").GetGuid();
        var (other, _) = await _care.Booking.LoginStaffAsync();
        var owner = await _care.Api.LoginAsync(UserRole.Owner);
        var (customer, _) = await _care.Booking.LoginCustomerAsync();

        ShouldFail(await Read(visit.Id, other), HttpStatusCode.Forbidden, "appointment_not_assigned");
        ShouldFail(await Update(id, Body(), other), HttpStatusCode.Forbidden, "appointment_not_assigned");
        var second = await _care.SeedVisitAsync(_staffId, AppointmentStatus.Confirmed, _care.Today, BookingApi.At(11));
        ShouldFail(await Create(second.Id, Body(), other), HttpStatusCode.Forbidden, "appointment_not_assigned");

        (await Read(visit.Id, owner)).Response.StatusCode.Should().Be(HttpStatusCode.OK);
        ShouldFail(await Create(second.Id, Body(), owner), HttpStatusCode.Forbidden);
        ShouldFail(await Read(visit.Id, customer), HttpStatusCode.Forbidden);
        ShouldFail(await _care.Api.GetAsync($"/api/v1/appointments/{visit.Id}/skin-profile"), HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task CareT08_ReassignedStaffEdits()
    {
        var visit = await _care.SeedVisitAsync(_staffId, AppointmentStatus.Confirmed, _care.Today);
        var (_, created) = await Create(visit.Id, Body());
        var id = CatalogApi.Data(created).GetProperty("id").GetGuid();
        var (other, otherId) = await _care.Booking.LoginStaffAsync();
        await _care.ReassignAsync(visit.Id, otherId);

        ShouldFail(await Update(id, Body()), HttpStatusCode.Forbidden, "appointment_not_assigned");
        var (response, body) = await Update(id, Body("normal"), other);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        CatalogApi.Data(body).GetProperty("assessedBy").GetProperty("id").GetGuid().Should().Be(_staffId);
    }

    [Fact]
    public async Task CareT09_NotFound()
    {
        var visit = await _care.SeedVisitAsync(_staffId, AppointmentStatus.Confirmed, _care.Today);

        ShouldFail(await Read(visit.Id, _staff), HttpStatusCode.NotFound, "skin_profile_not_found");
        ShouldFail(await Update(Guid.NewGuid(), Body()), HttpStatusCode.NotFound, "skin_profile_not_found");
        ShouldFail(await Create(Guid.NewGuid(), Body()), HttpStatusCode.NotFound, "appointment_not_found");
    }

    [Fact]
    public async Task CareT13_DetailOrdersAllergiesAndShowsSession()
    {
        var (visit, packageId, _) = await _care.SeedPackageVisitAsync(_staffId, total: 3, sequence: 2, _care.Today);
        await _care.SeedAllergyAsync(visit.CustomerId, "Cồn", AllergySeverity.Mild);
        var severe = await _care.SeedAllergyAsync(visit.CustomerId, "Paraben", AllergySeverity.Severe, "Nổi mẩn");
        await _care.SeedAllergyAsync(visit.CustomerId, "Hương liệu", AllergySeverity.Moderate);

        var (_, body) = await _care.Api.GetAsync($"/api/v1/appointments/{visit.Id}", _staff);

        var data = CatalogApi.Data(body);
        var allergies = data.GetProperty("allergies");
        allergies.EnumerateArray().Select(item => item.GetProperty("allergen").GetString()).Should().Equal("Paraben", "Hương liệu", "Cồn");
        allergies[0].GetProperty("id").GetGuid().Should().Be(severe.Id);
        allergies[0].GetProperty("recordedAtUtc").ValueKind.Should().Be(JsonValueKind.String);
        var session = data.GetProperty("treatmentSession");
        session.GetProperty("sequenceNumber").GetInt32().Should().Be(2);
        session.GetProperty("totalSessions").GetInt32().Should().Be(3);
        session.GetProperty("customerPackageId").GetGuid().Should().Be(packageId);
        session.GetProperty("packageName").GetString().Should().Be("Gói trị mụn");
        data.GetProperty("skinProfileId").ValueKind.Should().Be(JsonValueKind.Null);
    }

    [Fact]
    public async Task BookNowAppointmentDetailHasSkinProfileId()
    {
        // A book-now visit after payment: order line + entitlement, and a customer without allergies.
        var visit = await _care.SeedVisitAsync(_staffId, AppointmentStatus.Confirmed, _care.Today, source: AppointmentSource.Entitlement);
        await using (var context = _care.Db())
        {
            var entitlement = await context.ServiceEntitlements.SingleAsync(item => item.Id == visit.ServiceEntitlementId);
            await context.Appointments.Where(item => item.Id == visit.Id)
                .ExecuteUpdateAsync(setters => setters.SetProperty(item => item.OrderItemId, entitlement.OrderItemId));
        }

        var (_, created) = await Create(visit.Id, Body());
        var (_, body) = await _care.Api.GetAsync($"/api/v1/appointments/{visit.Id}", _staff);

        var data = CatalogApi.Data(body);
        data.GetProperty("allergies").GetArrayLength().Should().Be(0);
        data.GetProperty("skinProfileId").GetGuid().Should().Be(CatalogApi.Data(created).GetProperty("id").GetGuid());
    }
}

using System.Net;
using System.Text.Json;
using FluentAssertions;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.IntegrationTests.Catalog;
using NhuNguyetSpa.IntegrationTests.Infrastructure;
using Xunit;
using static NhuNguyetSpa.IntegrationTests.Care.CareApi;

namespace NhuNguyetSpa.IntegrationTests.Care;

/// <summary>UC-SPA-27 A2 customer allergies (docs/specs/care.md CARE-T10..T12, BR-CARE-02, 06).</summary>
[Collection(PostgresCollection.Name)]
public sealed class CustomerAllergyEndpointsTests : IAsyncLifetime
{
    private readonly PostgresFixture _postgres;
    private AuthApiFactory _factory = null!;
    private CareApi _care = null!;
    private string _staff = null!;
    private Guid _staffId;
    private Guid _customerId;

    public CustomerAllergyEndpointsTests(PostgresFixture postgres) => _postgres = postgres;

    public async Task InitializeAsync()
    {
        _factory = new AuthApiFactory(_postgres.ConnectionString);
        _care = new CareApi(_factory, _postgres);
        (_staff, _staffId) = await _care.Booking.LoginStaffAsync();
        var visit = await _care.SeedVisitAsync(_staffId, AppointmentStatus.Completed, _care.Today.AddDays(-3));
        _customerId = visit.CustomerId;
    }

    public async Task DisposeAsync()
    {
        _care.Api.Client.Dispose();
        await _factory.DisposeAsync();
    }

    private string Path(Guid? customerId = null) => $"/api/v1/customers/{customerId ?? _customerId}/allergies";

    private static object Body(string? allergen = "Paraben", string? severity = "severe", string? note = "Nổi mẩn") =>
        new { allergen, severity, note };

    private Task<(HttpResponseMessage Response, JsonDocument Body)> Add(object body, string? bearer = null, Guid? customerId = null) =>
        _care.Api.SendJsonAsync(HttpMethod.Post, Path(customerId), body, bearer ?? _staff);

    private Task<(HttpResponseMessage Response, JsonDocument Body)> Change(Guid id, object body, Guid? customerId = null) =>
        _care.Api.SendJsonAsync(HttpMethod.Put, $"{Path(customerId)}/{id}", body, _staff);

    [Fact]
    public async Task CareT10_AddDuplicateUpdateDelete()
    {
        var (created, body) = await Add(Body());
        created.StatusCode.Should().Be(HttpStatusCode.Created);
        var paraben = CatalogApi.Data(body).GetProperty("id").GetGuid();
        CatalogApi.Data(body).GetProperty("severity").GetString().Should().Be("severe");

        ShouldFail(await Add(Body("paraben")), HttpStatusCode.Conflict, "allergy_exists");

        var (_, alcoholBody) = await Add(Body("Cồn", "mild", null));
        var alcohol = CatalogApi.Data(alcoholBody).GetProperty("id").GetGuid();
        ShouldFail(await Change(alcohol, Body("PARABEN")), HttpStatusCode.Conflict, "allergy_exists");
        (await Change(alcohol, Body("Cồn", "moderate", "Rát"))).Response.StatusCode.Should().Be(HttpStatusCode.OK);

        var (deleted, _) = await _care.Api.SendAsync(HttpMethod.Delete, $"{Path()}/{paraben}", null, _staff);
        deleted.StatusCode.Should().Be(HttpStatusCode.NoContent);
        var (_, list) = await _care.Api.GetAsync(Path(), _staff);
        CatalogApi.Data(list).EnumerateArray().Select(item => item.GetProperty("allergen").GetString()).Should().Equal("Cồn");
        CatalogApi.Data(list)[0].GetProperty("severity").GetString().Should().Be("moderate");
    }

    [Fact]
    public async Task DuplicateIgnoresAccentCaseAndSpace()
    {
        await Add(Body("paraben"));

        ShouldFail(await Add(Body(" Parabén ")), HttpStatusCode.Conflict, "allergy_exists");
        ShouldFail(await Add(Body("PARABEN")), HttpStatusCode.Conflict, "allergy_exists");
    }

    [Fact]
    public async Task UpdateKeepingSameAllergenSucceeds()
    {
        var (_, body) = await Add(Body());
        var id = CatalogApi.Data(body).GetProperty("id").GetGuid();

        var (response, updated) = await Change(id, Body("Paraben", "mild", null));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        CatalogApi.Data(updated).GetProperty("severity").GetString().Should().Be("mild");
    }

    [Fact]
    public async Task CareT11_CareRelation()
    {
        var owner = await _care.Api.LoginAsync(UserRole.Owner);
        var (cancelledOnly, cancelledStaffId) = await _care.Booking.LoginStaffAsync();
        await _care.SeedVisitAsync(cancelledStaffId, AppointmentStatus.Cancelled, _care.Today, customerId: _customerId);
        var (stranger, _) = await _care.Booking.LoginStaffAsync();

        (await _care.Api.GetAsync(Path(), _staff)).Response.StatusCode.Should().Be(HttpStatusCode.OK);
        ShouldFail(await _care.Api.GetAsync(Path(), cancelledOnly), HttpStatusCode.Forbidden, "customer_not_in_care");
        ShouldFail(await Add(Body(), cancelledOnly), HttpStatusCode.Forbidden, "customer_not_in_care");
        ShouldFail(await Add(Body(), stranger), HttpStatusCode.Forbidden, "customer_not_in_care");
        (await _care.Api.GetAsync(Path(), owner)).Response.StatusCode.Should().Be(HttpStatusCode.OK);
        ShouldFail(await Add(Body(), owner), HttpStatusCode.Forbidden);
        var (customer, _) = await _care.Booking.LoginCustomerAsync();
        ShouldFail(await _care.Api.GetAsync(Path(), customer), HttpStatusCode.Forbidden);
        ShouldFail(await _care.Api.GetAsync(Path()), HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task CareT12_NotFoundAndValidation()
    {
        var other = await _care.SeedVisitAsync(_staffId, AppointmentStatus.Confirmed, _care.Today);
        var foreign = await _care.SeedAllergyAsync(other.CustomerId, "Cồn", AllergySeverity.Mild);

        ShouldFail(await Change(foreign.Id, Body()), HttpStatusCode.NotFound, "allergy_not_found");
        ShouldFail(await Add(Body(), customerId: Guid.NewGuid()), HttpStatusCode.NotFound, "customer_not_found");
        ShouldFail(await Add(Body(severity: "high")), HttpStatusCode.BadRequest);
        ShouldFail(await Add(Body(allergen: "")), HttpStatusCode.BadRequest);
        ShouldFail(await Add(Body(allergen: new string('a', 256))), HttpStatusCode.BadRequest);
    }
}

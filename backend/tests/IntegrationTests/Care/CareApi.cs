using System.Net;
using System.Text.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.IntegrationTests.Bookings;
using NhuNguyetSpa.IntegrationTests.Catalog;
using NhuNguyetSpa.IntegrationTests.Infrastructure;
using NhuNguyetSpa.IntegrationTests.Staff;
using NhuNguyetSpa.Infrastructure.Persistence;

namespace NhuNguyetSpa.IntegrationTests.Care;

/// <summary>Seeding and request helpers for UC-SPA-25, 27, 28 tests; appointments and packages are inserted directly.</summary>
public sealed class CareApi
{
    private readonly AuthApiFactory _factory;
    private readonly PostgresFixture _postgres;

    public CareApi(AuthApiFactory factory, PostgresFixture postgres)
    {
        _factory = factory;
        _postgres = postgres;
        Booking = new BookingApi(factory, postgres);
    }

    public BookingApi Booking { get; }
    public CatalogApi Api => Booking.Api;
    public StaffApi Staff => Booking.Staff;
    public DateOnly Today => Staff.Today;

    public static void ShouldFail((HttpResponseMessage Response, JsonDocument Body) result, HttpStatusCode status, string? code = null)
    {
        result.Response.StatusCode.Should().Be(status);
        if (code is not null)
            CatalogApi.ErrorCode(result.Body).Should().Be(code);
    }

    /// <summary>A visit (one hour from <paramref name="start"/>) assigned to <paramref name="staffId"/>; source as <see cref="StaffApi.SeedAppointmentAsync"/>.</summary>
    public Task<Appointment> SeedVisitAsync(
        Guid staffId, AppointmentStatus status, DateOnly date, TimeOnly? start = null, Guid? customerId = null,
        AppointmentSource source = AppointmentSource.Entitlement)
    {
        var from = start ?? BookingApi.At(9);
        return Staff.SeedAppointmentAsync(staffId, date, from, from.AddHours(1), status, customerId: customerId, source: source);
    }

    /// <summary>
    /// A package of <paramref name="total"/> sessions for the customer; session <paramref name="sequence"/> is booked by a visit
    /// with <paramref name="staffId"/> (others take <paramref name="otherStatus"/>). Returns the visit and the package id.
    /// </summary>
    public async Task<(Appointment Visit, Guid PackageId, Guid PlanId)> SeedPackageVisitAsync(
        Guid staffId, int total, int sequence, DateOnly date, TimeOnly? start = null, Guid? customerId = null,
        CustomerPackageStatus packageStatus = CustomerPackageStatus.Active, TreatmentPlanStatus planStatus = TreatmentPlanStatus.NotStarted,
        TreatmentSessionStatus otherStatus = TreatmentSessionStatus.NotBooked, int usedSessions = 0, DateTime? expiresAtUtc = null)
    {
        customerId ??= (await Staff.SeedCustomerAsync("Khách gói " + Guid.NewGuid().ToString("N")[..6])).Id;
        await using var context = _postgres.CreateContext();
        var service = new SpaService { Name = "Dịch vụ gói " + Guid.NewGuid().ToString("N")[..6], Category = "Chăm sóc da", DurationMinutes = 60, Price = 300_000 };
        context.SpaServices.Add(service);
        var now = _factory.Clock.UtcNow;
        var order = new Order
        {
            Code = "DH" + Guid.NewGuid().ToString("N")[..12].ToUpperInvariant(),
            CustomerId = customerId.Value,
            Subtotal = 1_000_000,
            GrandTotal = 1_000_000,
            Status = OrderStatus.Paid,
            PaymentDueAtUtc = now.AddDays(-2).AddMinutes(15),
            CreatedAtUtc = now.AddDays(-2),
        };
        var servicePackage = new ServicePackage { Name = "Gói trị mụn " + Guid.NewGuid().ToString("N")[..6], Price = 1_000_000, ValidityDays = 90 };
        context.ServicePackages.Add(servicePackage);
        var item = new OrderItem
        {
            OrderId = order.Id, ServicePackageId = servicePackage.Id, ProductName = "Gói", UnitPrice = 1_000_000, LineTotal = 1_000_000,
        };
        order.Items.Add(item);
        context.Orders.Add(order);
        var package = new CustomerPackage
        {
            CustomerId = customerId.Value,
            OrderItemId = item.Id,
            PackageName = "Gói trị mụn",
            PurchasedAtUtc = now.AddDays(-2),
            ActivatedAtUtc = now.AddDays(-2),
            ExpiresAtUtc = expiresAtUtc ?? now.AddDays(90),
            TotalSessions = total,
            UsedSessions = usedSessions,
            Status = packageStatus,
        };
        var plan = new TreatmentPlan { CustomerPackageId = package.Id, Status = planStatus };
        TreatmentSession? booked = null;
        for (var number = 1; number <= total; number++)
        {
            var session = new TreatmentSession
            {
                TreatmentPlanId = plan.Id,
                SpaServiceId = service.Id,
                SequenceNumber = number,
                ServiceName = service.Name,
                DurationMinutes = 60,
                Status = number == sequence ? TreatmentSessionStatus.Booked : otherStatus,
            };
            plan.Sessions.Add(session);
            if (number == sequence)
                booked = session;
        }

        context.CustomerPackages.Add(package);
        context.TreatmentPlans.Add(plan);
        var from = start ?? BookingApi.At(9);
        var visit = new Appointment
        {
            CustomerId = customerId.Value,
            StaffMemberId = staffId,
            TreatmentSessionId = booked!.Id,
            Date = date,
            StartTime = from,
            EndTime = from.AddHours(1),
            Status = AppointmentStatus.Confirmed,
            CreatedAtUtc = DateTime.UtcNow,
        };
        context.Appointments.Add(visit);
        await context.SaveChangesAsync();
        return (visit, package.Id, plan.Id);
    }

    public async Task<CustomerAllergy> SeedAllergyAsync(Guid customerId, string allergen, AllergySeverity severity, string? note = null)
    {
        await using var context = _postgres.CreateContext();
        var allergy = new CustomerAllergy
        {
            CustomerId = customerId, Allergen = allergen, Severity = severity, Note = note, RecordedAtUtc = DateTime.UtcNow.AddDays(-3),
        };
        context.CustomerAllergies.Add(allergy);
        await context.SaveChangesAsync();
        return allergy;
    }

    public async Task<SkinProfile> SeedSkinProfileAsync(Appointment visit, Guid assessorId)
    {
        await using var context = _postgres.CreateContext();
        var profile = new SkinProfile
        {
            AppointmentId = visit.Id,
            CustomerId = visit.CustomerId,
            AssessedByStaffMemberId = assessorId,
            AssessedAtUtc = DateTime.UtcNow.AddDays(-1),
            SkinType = SkinType.Dry,
        };
        context.SkinProfiles.Add(profile);
        await context.SaveChangesAsync();
        return profile;
    }

    public async Task ReassignAsync(Guid appointmentId, Guid staffId)
    {
        await using var context = _postgres.CreateContext();
        await context.Appointments.Where(appointment => appointment.Id == appointmentId)
            .ExecuteUpdateAsync(setters => setters.SetProperty(appointment => appointment.StaffMemberId, staffId));
    }

    /// <summary>A fresh context for assertions; dispose it.</summary>
    public AppDbContext Db() => _postgres.CreateContext();
}

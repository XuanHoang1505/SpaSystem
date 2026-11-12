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

namespace NhuNguyetSpa.IntegrationTests.Treatments;

/// <summary>A seeded package plan; <see cref="Sessions"/> are ordered by sequence number.</summary>
public sealed record SeededPlan(Guid CustomerId, Guid PackageId, Guid PlanId, SpaService Service, IReadOnlyList<TreatmentSession> Sessions, string OrderCode);

/// <summary>Seeding and request helpers for UC-SPA-19, 20, 21 tests; packages, plans and visits are inserted directly.</summary>
public sealed class TreatmentApi
{
    private readonly AuthApiFactory _factory;
    private readonly PostgresFixture _postgres;

    public TreatmentApi(AuthApiFactory factory, PostgresFixture postgres)
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

    public static JsonElement Ok((HttpResponseMessage Response, JsonDocument Body) result)
    {
        result.Response.StatusCode.Should().Be(HttpStatusCode.OK, result.Body.RootElement.ToString());
        return CatalogApi.Data(result.Body);
    }

    public Task<(HttpResponseMessage Response, JsonDocument Body)> Get(string path, string bearer) => Api.GetAsync(path, bearer);

    public Task<(HttpResponseMessage Response, JsonDocument Body)> Post(string path, object payload, string bearer) =>
        Api.SendJsonAsync(HttpMethod.Post, path, payload, bearer);

    public Task<(HttpResponseMessage Response, JsonDocument Body)> Put(string path, object payload, string bearer) =>
        Api.SendJsonAsync(HttpMethod.Put, path, payload, bearer);

    /// <summary>
    /// A paid package with one session per entry of <paramref name="statuses"/>, all of one new service; completed sessions carry the note
    /// "Kết quả buổi N" and count in <c>used_sessions</c>. <paramref name="minDaysBetweenSessions"/> is the package line's gap.
    /// </summary>
    public async Task<SeededPlan> SeedPlanAsync(
        Guid customerId, IReadOnlyList<TreatmentSessionStatus> statuses, Guid? primaryStaffId = null,
        TreatmentPlanStatus planStatus = TreatmentPlanStatus.InProgress, int minDaysBetweenSessions = 0,
        CustomerPackageStatus packageStatus = CustomerPackageStatus.Active, DateTime? expiresAtUtc = null, DateTime? purchasedAtUtc = null,
        SpaService? service = null, DateOnly? startDate = null)
    {
        await using var context = _postgres.CreateContext();
        if (service is null)
        {
            service = new SpaService { Name = "Dịch vụ gói " + Guid.NewGuid().ToString("N")[..6], Category = TestCategories.New(), DurationMinutes = 60, Price = 300_000 };
            context.SpaServices.Add(service);
        }

        var now = _factory.Clock.UtcNow;
        var bought = purchasedAtUtc ?? now.AddDays(-30);
        var servicePackage = new ServicePackage { Name = "Gói " + Guid.NewGuid().ToString("N")[..6], Price = 1_000_000, ValidityDays = 90 };
        servicePackage.Items.Add(new ServicePackageItem
        {
            ServicePackageId = servicePackage.Id, SpaServiceId = service.Id, SessionCount = statuses.Count,
            MinDaysBetweenSessions = minDaysBetweenSessions, SortOrder = 1,
        });
        context.ServicePackages.Add(servicePackage);
        var order = new Order
        {
            Code = "DH" + Guid.NewGuid().ToString("N")[..12].ToUpperInvariant(),
            CustomerId = customerId,
            Subtotal = 1_000_000,
            GrandTotal = 1_000_000,
            Status = OrderStatus.Paid,
            PaymentDueAtUtc = bought.AddMinutes(15),
            CreatedAtUtc = bought,
        };
        var item = new OrderItem
        {
            OrderId = order.Id, ServicePackageId = servicePackage.Id, ProductName = servicePackage.Name, UnitPrice = 1_000_000, LineTotal = 1_000_000,
        };
        order.Items.Add(item);
        context.Orders.Add(order);
        var package = new CustomerPackage
        {
            CustomerId = customerId,
            OrderItemId = item.Id,
            PackageName = servicePackage.Name,
            PurchasedAtUtc = bought,
            ActivatedAtUtc = bought,
            ExpiresAtUtc = expiresAtUtc ?? now.AddDays(60),
            TotalSessions = statuses.Count,
            UsedSessions = statuses.Count(status => status == TreatmentSessionStatus.Completed),
            Status = packageStatus,
        };
        var plan = new TreatmentPlan
        {
            CustomerPackageId = package.Id, Status = planStatus, PrimaryStaffMemberId = primaryStaffId, Goal = "Giảm mụn", Note = "Ghi chú nội bộ",
            StartDate = startDate,
        };
        for (var index = 0; index < statuses.Count; index++)
            plan.Sessions.Add(new TreatmentSession
            {
                TreatmentPlanId = plan.Id,
                SpaServiceId = service.Id,
                SequenceNumber = index + 1,
                ServiceName = service.Name,
                DurationMinutes = 60,
                Status = statuses[index],
                Note = statuses[index] == TreatmentSessionStatus.Completed ? $"Kết quả buổi {index + 1}" : null,
                CompletedAtUtc = statuses[index] == TreatmentSessionStatus.Completed ? now.AddDays(-20 + index) : null,
            });
        context.CustomerPackages.Add(package);
        context.TreatmentPlans.Add(plan);
        await context.SaveChangesAsync();
        return new SeededPlan(customerId, package.Id, plan.Id, service, plan.Sessions.OrderBy(session => session.SequenceNumber).ToList(), order.Code);
    }

    /// <summary>An appointment (one hour) booked with <paramref name="session"/>.</summary>
    public async Task<Appointment> SeedVisitAsync(
        TreatmentSession session, Guid customerId, Guid staffId, DateOnly date, AppointmentStatus status, TimeOnly? start = null)
    {
        await using var context = _postgres.CreateContext();
        var from = start ?? BookingApi.At(9);
        var visit = new Appointment
        {
            CustomerId = customerId,
            StaffMemberId = staffId,
            TreatmentSessionId = session.Id,
            Date = date,
            StartTime = from,
            EndTime = from.AddHours(1),
            Status = status,
            CreatedAtUtc = DateTime.UtcNow,
        };
        context.Appointments.Add(visit);
        await context.SaveChangesAsync();
        return visit;
    }

    public async Task RenameUserAsync(Guid userId, string fullName, string? phoneNumber = null)
    {
        await using var context = _postgres.CreateContext();
        await context.Users.Where(user => user.Id == userId)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(user => user.FullName, fullName)
                .SetProperty(user => user.PhoneNumber, user => phoneNumber ?? user.PhoneNumber));
    }

    /// <summary>A fresh context for assertions; dispose it.</summary>
    public AppDbContext Db() => _postgres.CreateContext();
}

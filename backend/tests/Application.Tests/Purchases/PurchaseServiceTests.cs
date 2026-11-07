using FluentAssertions;
using FluentValidation;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.DTOs.Purchases;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.Tests.Staff;
using NhuNguyetSpa.Application.UseCases.Bookings;
using NhuNguyetSpa.Application.UseCases.Purchases;
using NhuNguyetSpa.Application.Validators.Purchases;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Domain.Exceptions;
using NSubstitute;
using Xunit;

namespace NhuNguyetSpa.Application.Tests.Purchases;

/// <summary>UC-SPA-18 (docs/specs/purchases-treatments.md BR-TRT-04, 05; TRT-T04, T05, T07). Clock: 00:30 VN on 27/10/2026.</summary>
public sealed class PurchaseServiceTests
{
    private static readonly DateTime Now = StaffTestDoubles.Now;
    private readonly IPurchaseRepository _purchases = Substitute.For<IPurchaseRepository>();
    private readonly NhuNguyetSpa.Application.Common.Interfaces.ICurrentUserService _user = StaffTestDoubles.User("customer");
    private readonly List<PurchasedServiceRow> _services = [];
    private readonly List<PurchasedPackageRow> _packages = [];

    public PurchaseServiceTests()
    {
        _purchases.ListServicesAsync(_user.UserId!.Value, 200, Arg.Any<CancellationToken>()).Returns(_ => _services);
        _purchases.ListPackagesAsync(_user.UserId!.Value, 200, Arg.Any<CancellationToken>()).Returns(_ => _packages);
    }

    private PurchaseService Create() => new(_purchases, _user, StaffTestDoubles.Clock(), Options.Create(new PurchasesOptions()), new PurchaseListQueryValidator());

    private static PurchasedServiceRow Service(EntitlementStatus status, DateTime? expiresAtUtc = null) => new(
        Guid.NewGuid(), Guid.NewGuid(), "Chăm sóc da", null, 60, status, expiresAtUtc, Now.AddDays(-1), null, new PurchaseOrderRefDto(Guid.NewGuid(), "DH1"));

    private static PurchasedPackageRow Package(CustomerPackageStatus status = CustomerPackageStatus.Active, DateTime? expiresAtUtc = null,
        TreatmentPlanStatus planStatus = TreatmentPlanStatus.InProgress, bool hasNext = true) => new(
        Guid.NewGuid(), Guid.NewGuid(), "Gói trị mụn", null, status, Now.AddDays(-10), Now.AddDays(-10), expiresAtUtc ?? Now.AddDays(80), 3, 1, 0,
        Guid.NewGuid(), planStatus,
        hasNext
            ? new SessionBookingFacts(Guid.NewGuid(), Guid.NewGuid(), 45, 2, TreatmentSessionStatus.NotBooked, status, expiresAtUtc ?? Now.AddDays(80),
                planStatus, true, new PreviousVisit(new DateOnly(2026, 10, 25), new TimeOnly(10, 0)), 7)
            : null,
        hasNext ? "Massage" : null, null, new PurchaseOrderRefDto(Guid.NewGuid(), "DH2"));

    [Fact]
    public async Task ExpiredByTimeReadsExpiredAndCannotBook()
    {
        _services.Add(Service(EntitlementStatus.Available, Now.AddMinutes(-1)));
        _packages.Add(Package(expiresAtUtc: Now.AddMinutes(-1)));

        var result = (await Create().ListAsync(new PurchaseListQuery(null, null), default)).Data!;

        result.Services.Single().Should().Match<PurchasedServiceDto>(dto => dto.Status == EntitlementStatus.Expired && !dto.CanBook);
        result.Packages.Single().Status.Should().Be(CustomerPackageStatus.Expired);
        result.Packages.Single().NextSession!.CanBook.Should().BeFalse();
    }

    [Fact]
    public async Task AvailableServiceCanBook()
    {
        _services.Add(Service(EntitlementStatus.Available));
        _services.Add(Service(EntitlementStatus.Booked));

        var result = (await Create().ListAsync(new PurchaseListQuery(null, null), default)).Data!;

        result.Services.Select(dto => dto.CanBook).Should().Equal(true, false);
    }

    [Fact]
    public async Task NextSessionCarriesEarliestDate()
    {
        _packages.Add(Package());

        var next = (await Create().ListAsync(new PurchaseListQuery(null, null), default)).Data!.Packages.Single().NextSession!;

        next.CanBook.Should().BeTrue();
        next.EarliestDate.Should().Be(new DateOnly(2026, 11, 1));
        next.ServiceName.Should().Be("Massage");
        next.DurationMinutes.Should().Be(45);
        next.SequenceNumber.Should().Be(2);
    }

    [Fact]
    public async Task PausedPlanCannotBookAndNoNextSessionIsNull()
    {
        _packages.Add(Package(planStatus: TreatmentPlanStatus.Paused));
        _packages.Add(Package(hasNext: false));

        var packages = (await Create().ListAsync(new PurchaseListQuery(null, null), default)).Data!.Packages;

        packages[0].NextSession!.CanBook.Should().BeFalse();
        packages[1].NextSession.Should().BeNull();
    }

    [Fact]
    public async Task FiltersByTypeAndEffectiveStatus()
    {
        _services.Add(Service(EntitlementStatus.Available));
        _services.Add(Service(EntitlementStatus.Available, Now.AddDays(-1)));
        _packages.Add(Package());

        var available = (await Create().ListAsync(new PurchaseListQuery("service", "available"), default)).Data!;
        var expiredPackages = (await Create().ListAsync(new PurchaseListQuery("package", "expired"), default)).Data!;

        available.Services.Should().ContainSingle().Which.Status.Should().Be(EntitlementStatus.Available);
        available.Packages.Should().BeEmpty();
        expiredPackages.Services.Should().BeEmpty();
        expiredPackages.Packages.Should().BeEmpty();
    }

    [Theory]
    [InlineData(null, "used")]
    [InlineData("package", "booked")]
    [InlineData("service", "active")]
    [InlineData("voucher", null)]
    public async Task InvalidFiltersAreRejected(string? type, string? status)
    {
        var act = () => Create().ListAsync(new PurchaseListQuery(type, status), default);

        await act.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task MissingDetailsAreNotFound()
    {
        var service = () => Create().GetServiceAsync(Guid.NewGuid(), default);
        var package = () => Create().GetPackageAsync(Guid.NewGuid(), default);

        (await service.Should().ThrowAsync<NotFoundException>()).Which.Code.Should().Be("entitlement_not_found");
        (await package.Should().ThrowAsync<NotFoundException>()).Which.Code.Should().Be("customer_package_not_found");
    }
}

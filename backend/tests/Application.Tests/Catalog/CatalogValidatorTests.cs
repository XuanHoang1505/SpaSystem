using FluentAssertions;
using NhuNguyetSpa.Application.DTOs.Catalog;
using NhuNguyetSpa.Application.Validators.Catalog;
using Xunit;

namespace NhuNguyetSpa.Application.Tests.Catalog;

/// <summary>BR-CAT-02 bounds (CAT-T05, T14, T18).</summary>
public sealed class CatalogValidatorTests
{
    private static readonly Guid ServiceA = Guid.NewGuid();
    private static readonly Guid ServiceB = Guid.NewGuid();

    private static CreateServiceRequest Service(string name = "Chăm sóc da", string category = "Da", int duration = 60, decimal price = 100_000) =>
        new(name, category, null, duration, price, null);

    private static CreatePackageRequest Package(
        IReadOnlyList<PackageItemRequest>? items = null, int validityDays = 90, DateOnly? start = null, DateOnly? end = null, decimal price = 1_000_000) =>
        new("Gói", null, price, validityDays, start, end, null, items ?? [new PackageItemRequest(ServiceA, 2, 1, 7, null)]);

    [Fact]
    public void ValidServiceAndPackagePass()
    {
        new CreateServiceRequestValidator().Validate(Service()).IsValid.Should().BeTrue();
        new CreatePackageRequestValidator().Validate(Package()).IsValid.Should().BeTrue();
    }

    public static TheoryData<CreateServiceRequest, string> InvalidServices => new()
    {
        { Service(duration: 0), "DurationMinutes" },
        { Service(duration: 1441), "DurationMinutes" },
        { Service(price: -1), "Price" },
        { Service(price: 1.5m), "Price" },
        { Service(price: 1_000_000_000_000m), "Price" },
        { Service(name: ""), "Name" },
        { Service(name: new string('a', 151)), "Name" },
        { Service(category: ""), "Category" },
        { Service(category: new string('a', 101)), "Category" },
    };

    [Theory]
    [MemberData(nameof(InvalidServices))]
    public void InvalidServiceFails(CreateServiceRequest request, string field) =>
        new CreateServiceRequestValidator().Validate(request).Errors.Should().Contain(error => error.PropertyName == field);

    public static TheoryData<CreatePackageRequest, string> InvalidPackages => new()
    {
        { Package(items: []), "Items" },
        { Package(items: [new(ServiceA, 1, 1, 0, null), new(ServiceB, 1, 1, 0, null)]), "Items" },
        { Package(items: [new(ServiceA, 1, 1, 0, null), new(ServiceA, 1, 2, 0, null)]), "Items" },
        { Package(items: [new(ServiceA, 0, 1, 0, null)]), "Items[0].SessionCount" },
        { Package(items: [new(ServiceA, 1, 0, 0, null)]), "Items[0].SortOrder" },
        { Package(items: [new(ServiceA, 1, 1, -1, null)]), "Items[0].MinDaysBetweenSessions" },
        { Package(items: [new(Guid.Empty, 1, 1, 0, null)]), "Items[0].SpaServiceId" },
        { Package(items: Enumerable.Range(1, 21).Select(order => new PackageItemRequest(Guid.NewGuid(), 1, order, 0, null)).ToList()), "Items" },
        { Package(validityDays: 0), "ValidityDays" },
        { Package(price: -5), "Price" },
        { Package(start: new DateOnly(2026, 11, 2), end: new DateOnly(2026, 11, 1)), "SaleEndDate" },
    };

    [Theory]
    [MemberData(nameof(InvalidPackages))]
    public void InvalidPackageFails(CreatePackageRequest request, string field) =>
        new CreatePackageRequestValidator().Validate(request).Errors.Should().Contain(error => error.PropertyName == field);

    [Fact]
    public void PackageWithoutItemListFails() =>
        new CreatePackageRequestValidator().Validate(Package() with { Items = null }).Errors.Should().Contain(error => error.PropertyName == "Items");

    [Theory]
    [InlineData(-1.0, null, "MinPrice")]
    [InlineData(null, -1.0, "MaxPrice")]
    [InlineData(500.0, 100.0, "MaxPrice")]
    [InlineData(1.5, null, "MinPrice")]
    public void InvalidPriceRangeFails(double? min, double? max, string field)
    {
        var filter = new ServiceFilter { MinPrice = (decimal?)min, MaxPrice = (decimal?)max };
        new ServiceFilterValidator().Validate(filter).Errors.Should().Contain(error => error.PropertyName == field);
        new PackageFilterValidator().Validate(new PackageFilter { MinPrice = filter.MinPrice, MaxPrice = filter.MaxPrice })
            .Errors.Should().Contain(error => error.PropertyName == field);
    }
}

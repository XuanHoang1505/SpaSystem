using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.IntegrationTests.Infrastructure;
using Xunit;

namespace NhuNguyetSpa.IntegrationTests.Catalog;

/// <summary>Database objects added for the catalog (docs/specs/catalog.md: BR-CAT-02, BR-CAT-05, CAT-T21).</summary>
[Collection(PostgresCollection.Name)]
public sealed class CatalogSchemaTests
{
    private readonly PostgresFixture _postgres;

    public CatalogSchemaTests(PostgresFixture postgres) => _postgres = postgres;

    [Theory]
    [InlineData("Đá Dầu Chăm", "da dau cham")]
    [InlineData("Ngữ Ặ Ỡ", "ngu a o")]
    public async Task UnaccentFunctionStripsVietnameseDiacritics(string input, string expected)
    {
        await using var context = _postgres.CreateContext();
        var result = await context.Database.SqlQuery<string>($"SELECT public.f_unaccent(lower({input})) AS \"Value\"").SingleAsync();
        result.Should().Be(expected);
    }

    [Fact]
    public async Task PackageItemsRejectDuplicateSortOrder()
    {
        var (package, first, second) = await SeedAsync();
        await using var context = _postgres.CreateContext();
        context.ServicePackageItems.AddRange(Item(package, first, sortOrder: 1), Item(package, second, sortOrder: 1));

        await FluentActions.Invoking(() => context.SaveChangesAsync()).Should().ThrowAsync<DbUpdateException>();
    }

    [Fact]
    public async Task PackageItemsRejectDuplicateService()
    {
        var (package, first, _) = await SeedAsync();
        await using var context = _postgres.CreateContext();
        context.ServicePackageItems.AddRange(Item(package, first, sortOrder: 1), Item(package, first, sortOrder: 2));

        await FluentActions.Invoking(() => context.SaveChangesAsync()).Should().ThrowAsync<DbUpdateException>();
    }

    private async Task<(Guid Package, Guid First, Guid Second)> SeedAsync()
    {
        await using var context = _postgres.CreateContext();
        var package = new ServicePackage { Name = "Gói kiểm tra", Price = 1_000_000, ValidityDays = 90 };
        var first = new SpaService { Name = "Dịch vụ A", Category = "Kiểm tra", DurationMinutes = 60, Price = 100_000 };
        var second = new SpaService { Name = "Dịch vụ B", Category = "Kiểm tra", DurationMinutes = 60, Price = 100_000 };
        context.AddRange(package, first, second);
        await context.SaveChangesAsync();
        return (package.Id, first.Id, second.Id);
    }

    private static ServicePackageItem Item(Guid package, Guid service, int sortOrder) =>
        new() { ServicePackageId = package, SpaServiceId = service, SortOrder = sortOrder, SessionCount = 1 };
}

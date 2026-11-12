using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Infrastructure.Persistence.Configurations;
using Npgsql;
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
    public async Task MigrationGroupsSpellingsIntoOneCategory()
    {
        var database = "mig_" + Guid.NewGuid().ToString("N")[..10];
        await using (var admin = _postgres.CreateContext())
            await admin.Database.ExecuteSqlRawAsync("CREATE DATABASE \"" + database + "\""); // generated name, not user input
        await using var context = _postgres.CreateContext(database);
        var migrator = context.GetService<IMigrator>();
        await migrator.MigrateAsync("20261102140755_AddAiChatMessageHistoryIndex");
        await context.Database.ExecuteSqlRawAsync("""
            INSERT INTO spa_services (id, name, category, duration_minutes, price, status, created_at_utc) VALUES
              ('00000000-0000-0000-0000-000000000001', 'A', 'Chăm sóc da', 60, 1, 'on_sale', '2026-01-01T00:00:00Z'),
              ('00000000-0000-0000-0000-000000000002', 'B', 'cham soc DA', 60, 1, 'on_sale', '2026-01-02T00:00:00Z'),
              ('00000000-0000-0000-0000-000000000003', 'C', ' Chăm  sóc da ', 60, 1, 'on_sale', '2026-01-03T00:00:00Z'),
              ('00000000-0000-0000-0000-000000000004', 'D', 'Massage', 60, 1, 'discontinued', '2026-01-04T00:00:00Z')
            """);

        await migrator.MigrateAsync();

        var names = await context.Database.SqlQueryRaw<string>("SELECT name AS \"Value\" FROM service_categories ORDER BY sort_order").ToListAsync();
        names.Should().BeEquivalentTo(["Chăm sóc da", "Massage"], "spellings differing in case, accents or spaces become one category");
        var skin = await context.ServiceCategories.SingleAsync(row => row.Name == "Chăm sóc da");
        var grouped = await context.SpaServices.Where(row => row.CategoryId == skin.Id).Select(row => row.Name).ToListAsync();
        grouped.Should().BeEquivalentTo(["A", "B", "C"]);
        var oldColumn = await context.Database.SqlQueryRaw<int>(
            "SELECT count(*)::int AS \"Value\" FROM information_schema.columns WHERE table_name = 'spa_services' AND column_name = 'category'").SingleAsync();
        oldColumn.Should().Be(0);
    }

    [Fact]
    public async Task CategoryNamesAreUniqueIgnoringCaseAndAccents()
    {
        var tag = Guid.NewGuid().ToString("N")[..8];
        await using var context = _postgres.CreateContext();
        context.ServiceCategories.AddRange(new ServiceCategory { Name = $"Chăm sóc {tag}" }, new ServiceCategory { Name = $"CHAM SOC {tag}" });

        var error = await FluentActions.Invoking(() => context.SaveChangesAsync()).Should().ThrowAsync<DbUpdateException>();
        error.Which.InnerException.Should().BeOfType<PostgresException>()
            .Which.ConstraintName.Should().Be(ServiceCategoryConfiguration.UniqueName);
    }

    [Fact]
    public async Task ServiceStepsRejectDuplicateSortOrder()
    {
        var (_, first, _) = await SeedAsync();
        await using var context = _postgres.CreateContext();
        context.ServiceSteps.AddRange(
            new ServiceStep { SpaServiceId = first, SortOrder = 1, Title = "Làm sạch" },
            new ServiceStep { SpaServiceId = first, SortOrder = 1, Title = "Đắp mặt nạ" });

        await FluentActions.Invoking(() => context.SaveChangesAsync()).Should().ThrowAsync<DbUpdateException>();
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
        var first = new SpaService { Name = "Dịch vụ A", Category = TestCategories.New(), DurationMinutes = 60, Price = 100_000 };
        var second = new SpaService { Name = "Dịch vụ B", Category = TestCategories.New(), DurationMinutes = 60, Price = 100_000 };
        context.AddRange(package, first, second);
        await context.SaveChangesAsync();
        return (package.Id, first.Id, second.Id);
    }

    private static ServicePackageItem Item(Guid package, Guid service, int sortOrder) =>
        new() { ServicePackageId = package, SpaServiceId = service, SortOrder = sortOrder, SessionCount = 1 };
}

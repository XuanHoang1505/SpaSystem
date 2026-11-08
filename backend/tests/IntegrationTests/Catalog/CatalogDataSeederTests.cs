using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Infrastructure.Persistence;
using NhuNguyetSpa.Infrastructure.Persistence.Seeds;
using NhuNguyetSpa.IntegrationTests.Infrastructure;
using Xunit;

namespace NhuNguyetSpa.IntegrationTests.Catalog;

/// <summary>Sample catalog for manual testing (<c>npm run db:seed:catalog</c>).</summary>
[Collection(PostgresCollection.Name)]
public sealed class CatalogDataSeederTests
{
    private readonly PostgresFixture _postgres;

    public CatalogDataSeederTests(PostgresFixture postgres) => _postgres = postgres;

    private async Task SeedAsync()
    {
        await using var context = _postgres.CreateContext();
        await new CatalogDataSeeder(context, new TestClock(), NullLogger<CatalogDataSeeder>.Instance).SeedAsync(CancellationToken.None);
    }

    [Fact]
    public async Task SeedsEveryCaseAndIsIdempotent()
    {
        await SeedAsync();
        await using (var tamper = _postgres.CreateContext())
        {
            var service = await tamper.SpaServices.SingleAsync(row => row.Id == CatalogSeedIds.FaceDeepClean);
            service.Price = 1;
            await tamper.SaveChangesAsync();
        }

        await SeedAsync();

        await using var context = _postgres.CreateContext();
        var categories = await context.ServiceCategories.Where(row => CatalogSeedIds.Categories.Contains(row.Id)).ToListAsync();
        var services = await context.SpaServices.Where(row => CatalogSeedIds.Services.Contains(row.Id)).ToListAsync();
        var packages = await context.ServicePackages.Include(row => row.Items)
            .Where(row => CatalogSeedIds.Packages.Contains(row.Id)).ToListAsync();

        categories.Should().HaveCount(CatalogSeedIds.Categories.Count);
        services.Should().HaveCount(CatalogSeedIds.Services.Count);
        packages.Should().HaveCount(CatalogSeedIds.Packages.Count);
        services.Single(row => row.Id == CatalogSeedIds.FaceDeepClean).Price.Should().Be(350_000, "a second run restores the sample values");

        categories.Should().Contain(row => !row.IsActive, "one hidden category");
        categories.Should().Contain(row => !services.Any(service => service.CategoryId == row.Id), "one empty category");
        services.Should().Contain(row => row.Status == CatalogStatus.Discontinued);
        services.Should().Contain(row => row.ImageUrl == null);
        packages.Should().Contain(row => row.Status == CatalogStatus.Discontinued);
        packages.Should().Contain(row => row.SaleStartDate > DateOnly.FromDateTime(DateTime.UtcNow), "one package not on sale yet");
        packages.Should().Contain(row => row.SaleEndDate < DateOnly.FromDateTime(DateTime.UtcNow), "one package whose sale ended");
        packages.SelectMany(row => row.Items).Select(item => item.SpaServiceId).Should().OnlyContain(id => services.Any(s => s.Id == id));
        packages.Should().OnlyContain(row => row.Items.Select(item => item.SortOrder).Distinct().Count() == row.Items.Count);

        var steps = await context.ServiceSteps.Where(step => CatalogSeedIds.Services.Contains(step.SpaServiceId)).ToListAsync();
        steps.Select(step => step.SpaServiceId).Distinct().Should().HaveCount(18, "18 sample services have a procedure");
        steps.GroupBy(step => step.SpaServiceId).Should().OnlyContain(group => group.Count() >= 3 && group.Count() <= 5);
        services.Where(row => steps.Any(step => step.SpaServiceId == row.Id))
            .Should().OnlyContain(row => steps.Where(step => step.SpaServiceId == row.Id).Sum(step => step.DurationMinutes ?? 0) <= row.DurationMinutes);
        services.Count(row => row.ShortDescription == null).Should().Be(1);
        packages.Count(row => row.ShortDescription == null).Should().Be(1);
    }

    [Fact]
    public async Task ReusesAnExistingCategoryWithTheSameNameIgnoringCaseAndAccents()
    {
        // Own database, so the shared one keeps the fixed sample ids for the other test.
        var database = "seed_" + Guid.NewGuid().ToString("N")[..10];
        await using (var admin = _postgres.CreateContext())
            await admin.Database.ExecuteSqlRawAsync("CREATE DATABASE \"" + database + "\""); // generated name, not user input
        await using (var setup = _postgres.CreateContext(database))
        {
            await setup.Database.MigrateAsync();
            setup.ServiceCategories.Add(new ServiceCategory { Name = "MASSAGE BODY" });
            await setup.SaveChangesAsync();
        }

        await using (var context = _postgres.CreateContext(database))
        {
            var act = () => new CatalogDataSeeder(context, new TestClock(), NullLogger<CatalogDataSeeder>.Instance)
                .SeedAsync(CancellationToken.None);
            await act.Should().NotThrowAsync("a category named like a sample one is reused instead of breaking the unique index");
        }

        await using var check = _postgres.CreateContext(database);
        (await check.ServicePackages.CountAsync(row => CatalogSeedIds.Packages.Contains(row.Id) && row.ShortDescription != null))
            .Should().Be(CatalogSeedIds.Packages.Count - 1, "package short descriptions are set on the very first run");
        (await check.ServiceCategories.CountAsync(row =>
            AppDbContext.Unaccent(row.Name.ToLower()) == AppDbContext.Unaccent("massage body"))).Should().Be(1);
        (await check.SpaServices.CountAsync(row => CatalogSeedIds.Services.Contains(row.Id))).Should().Be(CatalogSeedIds.Services.Count);
    }
}

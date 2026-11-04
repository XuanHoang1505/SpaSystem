using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using NhuNguyetSpa.Application.Common;
using NhuNguyetSpa.Application.DTOs.Reports;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.IntegrationTests.Catalog;
using NhuNguyetSpa.IntegrationTests.Infrastructure;
using NhuNguyetSpa.IntegrationTests.Orders;
using Xunit;
using static NhuNguyetSpa.IntegrationTests.Reports.ReportApi;

namespace NhuNguyetSpa.IntegrationTests.Reports;

/// <summary>Revenue queries in PostgreSQL (docs/specs/reports.md: BR-RPT-01, 02, 04, RPT-T04…T08, T10). One year per test.</summary>
[Collection(PostgresCollection.Name)]
public sealed class RevenueReportRepositoryTests : IAsyncLifetime
{
    private readonly PostgresFixture _postgres;
    private AuthApiFactory _factory = null!;
    private CatalogApi _catalog = null!;
    private OrderApi _orders = null!;
    private ReportApi _reports = null!;

    public RevenueReportRepositoryTests(PostgresFixture postgres) => _postgres = postgres;

    public Task InitializeAsync()
    {
        _factory = new AuthApiFactory(_postgres.ConnectionString);
        _catalog = new CatalogApi(_factory, _postgres);
        _orders = new OrderApi(_factory, _postgres, _catalog);
        _reports = new ReportApi(_postgres);
        return Task.CompletedTask;
    }

    public async Task DisposeAsync()
    {
        _catalog.Client.Dispose();
        await _factory.DisposeAsync();
    }

    private static (DateTime From, DateTime To) Year(int year) =>
        (SpaTime.StartOfDayUtc(new DateOnly(year, 1, 1)), SpaTime.StartOfDayUtc(new DateOnly(year + 1, 1, 1)));

    private async Task<T> WithRepositoryAsync<T>(Func<IRevenueReportRepository, Task<T>> action)
    {
        using var scope = _factory.Services.CreateScope();
        return await action(scope.ServiceProvider.GetRequiredService<IRevenueReportRepository>());
    }

    private Task<SpaService> ServiceAsync(string name = "dịch vụ") => _catalog.SeedServiceAsync(CatalogApi.NewTag() + " " + name);

    private async Task<ServicePackage> PackageAsync() =>
        await _catalog.SeedPackageAsync(CatalogApi.NewTag() + " gói", [await ServiceAsync()]);

    [Fact]
    public async Task CountsOnlyRecognizedPayments()
    {
        var customer = await _orders.SeedCustomerAsync();
        await _reports.SeedPaidOrderAsync(customer, VnUtc(2040, 10, 2), [(await ServiceAsync(), null, 300_000)]);
        await _reports.SeedPaidOrderAsync(customer, VnUtc(2040, 10, 20), [(null, await PackageAsync(), 4_500_000)]);
        await _orders.SeedOrderAsync(customer, OrderStatus.PendingPayment, createdAtUtc: VnUtc(2040, 10, 21));
        var (from, to) = Year(2040);

        var days = await WithRepositoryAsync(repository => repository.GetDailyRevenueAsync(from, to, CancellationToken.None));

        days.Should().HaveCount(2);
        days.Sum(day => day.Revenue).Should().Be(4_800_000);
        (days.Sum(day => day.ServiceRevenue) + days.Sum(day => day.PackageRevenue)).Should().Be(4_800_000);
        days.Sum(day => day.OrderCount).Should().Be(2);
        days.Select(day => day.Date).Should().Equal(new DateOnly(2040, 10, 2), new DateOnly(2040, 10, 20));
    }

    [Fact]
    public async Task DayUsesVietnamTime()
    {
        var customer = await _orders.SeedCustomerAsync();
        var service = await ServiceAsync();
        await _reports.SeedPaidOrderAsync(customer, new DateTime(2041, 10, 31, 16, 59, 59, DateTimeKind.Utc), [(service, null, 100_000)]);
        await _reports.SeedPaidOrderAsync(customer, new DateTime(2041, 10, 31, 17, 0, 0, DateTimeKind.Utc), [(service, null, 200_000)]);
        var october = (SpaTime.StartOfDayUtc(new DateOnly(2041, 10, 1)), SpaTime.StartOfDayUtc(new DateOnly(2041, 11, 1)));
        var (from, to) = Year(2041);

        var inOctober = await WithRepositoryAsync(repository => repository.GetDailyRevenueAsync(october.Item1, october.Item2, CancellationToken.None));
        var inYear = await WithRepositoryAsync(repository => repository.GetDailyRevenueAsync(from, to, CancellationToken.None));

        inOctober.Should().ContainSingle().Which.Should().Be(new DailyRevenueRow(new DateOnly(2041, 10, 31), 100_000, 100_000, 0, 1, 1, 0));
        inYear.Select(day => day.Date).Should().Equal(new DateOnly(2041, 10, 31), new DateOnly(2041, 11, 1));
    }

    [Fact]
    public async Task CancelledAndDuplicateSuccessAreUnrecognized()
    {
        var customer = await _orders.SeedCustomerAsync();
        var service = await ServiceAsync();
        await _reports.SeedPaidOrderAsync(customer, VnUtc(2042, 4, 1), [(service, null, 500_000)], status: OrderStatus.Cancelled);
        await _reports.SeedPaidOrderAsync(customer, VnUtc(2042, 4, 2), [(service, null, 700_000)], succeededPayments: 2);
        var (from, to) = Year(2042);

        var days = await WithRepositoryAsync(repository => repository.GetDailyRevenueAsync(from, to, CancellationToken.None));
        var unrecognized = await WithRepositoryAsync(repository => repository.GetUnrecognizedPaymentsAsync(from, to, CancellationToken.None));
        var products = await WithRepositoryAsync(repository => repository.GetProductRevenueAsync(from, to, ReportProductType.All, null, CancellationToken.None));

        days.Sum(day => day.Revenue).Should().Be(700_000);
        days.Sum(day => day.OrderCount).Should().Be(1);
        unrecognized.Should().Be(new UnrecognizedPaymentsDto(2, 1_200_000));
        products.Should().ContainSingle().Which.Should().Be(new ProductRevenueRow(RevenueProductKind.Service, service.Id, service.Name, 1, 700_000));
    }

    [Fact]
    public async Task RevivedOrderCountsOnItsPaymentDay()
    {
        var customer = await _orders.SeedCustomerAsync();
        await _reports.SeedPaidOrderAsync(customer, VnUtc(2043, 3, 5), [(await ServiceAsync(), null, 250_000)], createdAtUtc: VnUtc(2043, 3, 1));
        var (from, to) = Year(2043);

        var days = await WithRepositoryAsync(repository => repository.GetDailyRevenueAsync(from, to, CancellationToken.None));

        days.Should().ContainSingle().Which.Date.Should().Be(new DateOnly(2043, 3, 5));
    }

    [Fact]
    public async Task ZeroOrderNotCounted()
    {
        var customer = await _orders.SeedCustomerAsync();
        await _orders.SeedOrderAsync(customer, OrderStatus.Paid, amount: 0, createdAtUtc: VnUtc(2044, 6, 1));
        var (from, to) = Year(2044);

        var days = await WithRepositoryAsync(repository => repository.GetDailyRevenueAsync(from, to, CancellationToken.None));
        var products = await WithRepositoryAsync(repository => repository.GetProductRevenueAsync(from, to, ReportProductType.All, null, CancellationToken.None));

        days.Should().BeEmpty();
        products.Should().BeEmpty();
    }

    [Fact]
    public async Task MixedOrderCountsInBothTypes()
    {
        var customer = await _orders.SeedCustomerAsync();
        await _reports.SeedPaidOrderAsync(customer, VnUtc(2045, 8, 8), [(await ServiceAsync(), null, 600_000), (null, await PackageAsync(), 400_000)]);
        var (from, to) = Year(2045);

        var days = await WithRepositoryAsync(repository => repository.GetDailyRevenueAsync(from, to, CancellationToken.None));

        days.Should().ContainSingle().Which.Should().Be(new DailyRevenueRow(new DateOnly(2045, 8, 8), 1_000_000, 600_000, 400_000, 1, 1, 1));
    }

    [Fact]
    public async Task ProductRevenueTopAndCurrentName()
    {
        var customer = await _orders.SeedCustomerAsync();
        var a = await ServiceAsync("A");
        var b = await ServiceAsync("B");
        var c = await ServiceAsync("C");
        var p = await PackageAsync();
        await _reports.SeedPaidOrderAsync(customer, VnUtc(2046, 2, 1), [(a, null, 300_000), (b, null, 900_000)]);
        await _reports.SeedPaidOrderAsync(customer, VnUtc(2046, 2, 2), [(a, null, 300_000), (c, null, 100_000)]);
        await _reports.SeedPaidOrderAsync(customer, VnUtc(2046, 2, 3), [(null, p, 4_500_000)]);
        var renamed = CatalogApi.NewTag() + " A mới";
        await using (var context = _postgres.CreateContext())
        {
            await context.SpaServices.Where(service => service.Id == a.Id).ExecuteUpdateAsync(set => set.SetProperty(service => service.Name, renamed));
        }
        var (from, to) = Year(2046);

        var top = await WithRepositoryAsync(repository => repository.GetProductRevenueAsync(from, to, ReportProductType.All, 2, CancellationToken.None));
        var services = await WithRepositoryAsync(repository => repository.GetProductRevenueAsync(from, to, ReportProductType.Service, null, CancellationToken.None));

        top.Should().Equal(
            new ProductRevenueRow(RevenueProductKind.Package, p.Id, p.Name, 1, 4_500_000),
            new ProductRevenueRow(RevenueProductKind.Service, b.Id, b.Name, 1, 900_000));
        services.Should().Equal(
            new ProductRevenueRow(RevenueProductKind.Service, b.Id, b.Name, 1, 900_000),
            new ProductRevenueRow(RevenueProductKind.Service, a.Id, renamed, 2, 600_000),
            new ProductRevenueRow(RevenueProductKind.Service, c.Id, c.Name, 1, 100_000));
    }
}

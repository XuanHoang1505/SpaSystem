using System.Net;
using ClosedXML.Excel;
using FluentAssertions;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.IntegrationTests.Catalog;
using NhuNguyetSpa.IntegrationTests.Infrastructure;
using NhuNguyetSpa.IntegrationTests.Orders;
using Xunit;
using static NhuNguyetSpa.IntegrationTests.Reports.ReportApi;

namespace NhuNguyetSpa.IntegrationTests.Reports;

/// <summary>UC-SPA-33 over HTTP (docs/specs/reports.md: RPT-T02, T04, T09, T11, T14). Years 2047–2049 belong to this class.</summary>
[Collection(PostgresCollection.Name)]
public sealed class ReportEndpointsTests : IAsyncLifetime
{
    private const string ExcelContentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    private readonly PostgresFixture _postgres;
    private AuthApiFactory _factory = null!;
    private CatalogApi _api = null!;
    private OrderApi _orders = null!;
    private ReportApi _reports = null!;
    private string _owner = null!;

    public ReportEndpointsTests(PostgresFixture postgres) => _postgres = postgres;

    public async Task InitializeAsync()
    {
        _factory = new AuthApiFactory(_postgres.ConnectionString);
        _api = new CatalogApi(_factory, _postgres);
        _orders = new OrderApi(_factory, _postgres, _api);
        _reports = new ReportApi(_postgres);
        _owner = await _api.LoginAsync(UserRole.Owner);
    }

    public async Task DisposeAsync()
    {
        _api.Client.Dispose();
        await _factory.DisposeAsync();
    }

    private async Task SeedYear2047Async()
    {
        var customer = await _orders.SeedCustomerAsync();
        await _reports.SeedPaidOrderAsync(customer, VnUtc(2047, 10, 2), [(await _api.SeedServiceAsync(CatalogApi.NewTag() + " dịch vụ"), null, 300_000)]);
        var package = await _api.SeedPackageAsync(CatalogApi.NewTag() + " gói", [await _api.SeedServiceAsync(CatalogApi.NewTag() + " thành phần")]);
        await _reports.SeedPaidOrderAsync(customer, VnUtc(2047, 10, 20), [(null, package, 4_500_000)]);
        await _orders.SeedOrderAsync(customer, OrderStatus.PendingPayment, createdAtUtc: VnUtc(2047, 10, 21));
    }

    [Fact]
    public async Task RevenueEndToEnd()
    {
        await SeedYear2047Async();

        var (response, body) = await _api.GetAsync("/api/v1/reports/revenue?fromDate=2047-01-01&toDate=2047-12-31&groupBy=quarter", _owner);
        var (_, packages) = await _api.GetAsync("/api/v1/reports/revenue?fromDate=2047-01-01&toDate=2047-12-31&groupBy=quarter&productType=package", _owner);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var data = CatalogApi.Data(body);
        data.GetProperty("groupBy").GetString().Should().Be("quarter");
        data.GetProperty("productType").GetString().Should().Be("all");
        data.GetProperty("totalRevenue").GetDecimal().Should().Be(4_800_000);
        data.GetProperty("orderCount").GetInt32().Should().Be(2);
        data.GetProperty("periods").GetArrayLength().Should().Be(4);
        data.GetProperty("periods")[3].GetProperty("label").GetString().Should().Be("Q4/2047");
        data.GetProperty("periods")[3].GetProperty("periodStart").GetString().Should().Be("2047-10-01");
        data.GetProperty("unrecognizedPayments").GetProperty("count").GetInt32().Should().Be(0);
        var package = CatalogApi.Data(packages);
        package.GetProperty("totalRevenue").GetDecimal().Should().Be(4_500_000);
        package.GetProperty("serviceRevenue").GetDecimal().Should().Be(0);
    }

    [Fact]
    public async Task EmptyYear()
    {
        var (_, revenue) = await _api.GetAsync("/api/v1/reports/revenue?fromDate=2048-01-01&toDate=2048-12-31&groupBy=quarter", _owner);
        var (response, products) = await _api.GetAsync("/api/v1/reports/revenue/by-product?fromDate=2048-01-01&toDate=2048-12-31", _owner);

        var periods = CatalogApi.Data(revenue).GetProperty("periods").EnumerateArray().ToList();
        periods.Should().HaveCount(4).And.OnlyContain(period => period.GetProperty("revenue").GetDecimal() == 0);
        CatalogApi.Data(revenue).GetProperty("totalRevenue").GetDecimal().Should().Be(0);
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        CatalogApi.Data(products).GetProperty("items").GetArrayLength().Should().Be(0);
    }

    [Theory]
    [InlineData("/api/v1/reports/revenue?groupBy=week", "GroupBy")]
    [InlineData("/api/v1/reports/revenue/export?groupBy=week", "GroupBy")]
    [InlineData("/api/v1/reports/revenue/by-product?top=0", "Top")]
    [InlineData("/api/v1/reports/revenue?fromDate=2026-05-02&toDate=2026-05-01", "ToDate")]
    public async Task InvalidParameters(string path, string field)
    {
        var (response, body) = await _api.GetAsync(path, _owner);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        response.Content.Headers.ContentType!.MediaType.Should().Be("application/json");
        body.RootElement.GetProperty("success").GetBoolean().Should().BeFalse();
        body.RootElement.GetProperty("errors")[0].GetProperty("field").GetString().Should().Be(field);
    }

    [Fact]
    public async Task ExportEndToEnd()
    {
        var customer = await _orders.SeedCustomerAsync();
        await _reports.SeedPaidOrderAsync(customer, VnUtc(2049, 5, 5), [(await _api.SeedServiceAsync(CatalogApi.NewTag() + " dịch vụ"), null, 300_000)]);
        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/v1/reports/revenue/export?fromDate=2049-01-01&toDate=2049-12-31");
        request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _owner);

        using var response = await _api.Client.SendAsync(request);
        var (_, revenue) = await _api.GetAsync("/api/v1/reports/revenue?fromDate=2049-01-01&toDate=2049-12-31", _owner);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        response.Content.Headers.ContentType!.MediaType.Should().Be(ExcelContentType);
        response.Content.Headers.ContentDisposition!.FileName.Should().Be("doanh-thu_2049-01-01_2049-12-31.xlsx");
        using var workbook = new XLWorkbook(new MemoryStream(await response.Content.ReadAsByteArrayAsync()));
        var periods = workbook.Worksheet("Theo kỳ");
        var total = periods.LastRowUsed()!;
        total.Cell(1).GetString().Should().Be("Tổng");
        total.Cell(4).GetValue<decimal>().Should().Be(300_000).And.Be(CatalogApi.Data(revenue).GetProperty("totalRevenue").GetDecimal());
        workbook.Worksheet("Theo sản phẩm").LastRowUsed()!.RowNumber().Should().Be(2);
    }

    [Theory]
    [InlineData(UserRole.Customer, "/api/v1/reports/revenue")]
    [InlineData(UserRole.Customer, "/api/v1/reports/revenue/by-product")]
    [InlineData(UserRole.Customer, "/api/v1/reports/revenue/export")]
    [InlineData(UserRole.Staff, "/api/v1/reports/revenue")]
    [InlineData(UserRole.Staff, "/api/v1/reports/revenue/by-product")]
    [InlineData(UserRole.Staff, "/api/v1/reports/revenue/export")]
    public async Task WrongRoleIsForbidden(UserRole role, string path)
    {
        var token = await _api.LoginAsync(role);

        var (response, body) = await _api.GetAsync(path, token);

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        body.RootElement.GetProperty("success").GetBoolean().Should().BeFalse();
    }

    [Theory]
    [InlineData("/api/v1/reports/revenue")]
    [InlineData("/api/v1/reports/revenue/by-product")]
    [InlineData("/api/v1/reports/revenue/export")]
    public async Task AnonymousIsUnauthorized(string path)
    {
        var (response, body) = await _api.GetAsync(path);

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        body.RootElement.GetProperty("success").GetBoolean().Should().BeFalse();
    }
}

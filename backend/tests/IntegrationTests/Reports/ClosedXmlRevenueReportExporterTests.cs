using ClosedXML.Excel;
using FluentAssertions;
using NhuNguyetSpa.Application.DTOs.Reports;
using NhuNguyetSpa.Infrastructure.Reports;
using Xunit;

namespace NhuNguyetSpa.IntegrationTests.Reports;

/// <summary>The Excel file of the revenue report (docs/specs/reports.md: BR-RPT-05, RPT-T13). No database.</summary>
public sealed class ClosedXmlRevenueReportExporterTests
{
    private static readonly DateTime ExportedAt = new(2026, 11, 1, 3, 0, 0, DateTimeKind.Utc);

    private static RevenueReportDto Report() => new(
        new DateOnly(2026, 9, 1), new DateOnly(2026, 10, 31), RevenueGroupBy.Month, ReportProductType.All,
        3_500_000, 500_000, 3_000_000, 3,
        [
            new RevenuePeriodDto("09/2026", new DateOnly(2026, 9, 1), new DateOnly(2026, 9, 30), 1_000_000, 500_000, 500_000, 2),
            new RevenuePeriodDto("10/2026", new DateOnly(2026, 10, 1), new DateOnly(2026, 10, 31), 2_500_000, 0, 2_500_000, 1),
        ],
        new UnrecognizedPaymentsDto(1, 200_000));

    private static XLWorkbook Open(byte[] bytes) => new(new MemoryStream(bytes));

    [Fact]
    public void ExportsThreeSheetsWithNumbers()
    {
        ProductRevenueDto[] products =
        [
            new(RevenueProductKind.Package, Guid.NewGuid(), "Liệu trình trị mụn", 1, 2_500_000, 71.4m),
            new(RevenueProductKind.Package, Guid.NewGuid(), "Gói thư giãn", 1, 500_000, 14.3m),
            new(RevenueProductKind.Service, Guid.NewGuid(), "Chăm sóc da", 2, 500_000, 14.3m),
        ];

        using var workbook = Open(new ClosedXmlRevenueReportExporter().Export(Report(), products, ExportedAt));

        workbook.Worksheets.Select(sheet => sheet.Name).Should().Equal("Tổng quan", "Theo kỳ", "Theo sản phẩm");
        var periods = workbook.Worksheet("Theo kỳ");
        periods.Cell(1, 1).GetString().Should().Be("Kỳ");
        periods.Cell(2, 1).GetString().Should().Be("09/2026");
        periods.Cell(2, 4).DataType.Should().Be(XLDataType.Number);
        periods.Cell(2, 4).Style.NumberFormat.Format.Should().Be("#,##0");
        periods.Cell(2, 2).GetDateTime().Should().Be(new DateTime(2026, 9, 1));
        periods.Cell(4, 1).GetString().Should().Be("Tổng");
        periods.Cell(4, 4).GetValue<decimal>().Should().Be(3_500_000);
        periods.Cell(4, 7).GetValue<int>().Should().Be(3);
        var byProduct = workbook.Worksheet("Theo sản phẩm");
        byProduct.LastRowUsed()!.RowNumber().Should().Be(4);
        byProduct.Cell(2, 1).GetString().Should().Be("Liệu trình trị mụn");
        byProduct.Cell(4, 2).GetString().Should().Be("Dịch vụ lẻ");
        byProduct.Cell(2, 5).GetValue<decimal>().Should().Be(71.4m);
        var summary = workbook.Worksheet("Tổng quan");
        summary.Cell(5, 1).GetString().Should().Be("Tổng doanh thu");
        summary.Cell(5, 2).GetValue<decimal>().Should().Be(3_500_000);
        summary.Cell(9, 2).GetValue<decimal>().Should().Be(200_000);
        summary.Cell(11, 2).GetString().Should().Be("01/11/2026 10:00");
    }

    [Fact]
    public void EmptyReportStillHasHeaders()
    {
        using var workbook = Open(new ClosedXmlRevenueReportExporter().Export(Report(), [], ExportedAt));

        var byProduct = workbook.Worksheet("Theo sản phẩm");
        byProduct.LastRowUsed()!.RowNumber().Should().Be(1);
        byProduct.Cell(1, 1).GetString().Should().Be("Sản phẩm");
    }
}

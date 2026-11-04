using System.Globalization;
using ClosedXML.Excel;
using NhuNguyetSpa.Application.Common;
using NhuNguyetSpa.Application.DTOs.Reports;
using NhuNguyetSpa.Application.Interfaces.Reports;

namespace NhuNguyetSpa.Infrastructure.Reports;

/// <summary>
/// The revenue report as an <c>.xlsx</c> workbook with ClosedXML (BR-RPT-05): money and counts stay numeric cells so they can be
/// summed in Excel, whatever the reader's locale.
/// </summary>
public sealed class ClosedXmlRevenueReportExporter : IRevenueReportExporter
{
    private const string MoneyFormat = "#,##0";
    private const string DateFormat = "dd/MM/yyyy";

    public byte[] Export(RevenueReportDto report, IReadOnlyList<ProductRevenueDto> products, DateTime exportedAtUtc)
    {
        ArgumentNullException.ThrowIfNull(report);
        ArgumentNullException.ThrowIfNull(products);
        using var workbook = new XLWorkbook();
        WriteSummary(workbook.AddWorksheet("Tổng quan"), report, exportedAtUtc);
        WritePeriods(workbook.AddWorksheet("Theo kỳ"), report);
        WriteProducts(workbook.AddWorksheet("Theo sản phẩm"), products);
        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }

    // Label/value pairs, no header row.
    private static void WriteSummary(IXLWorksheet sheet, RevenueReportDto report, DateTime exportedAtUtc)
    {
        var row = 1;
        void Add(string label, XLCellValue value, string? format = null)
        {
            sheet.Cell(row, 1).Value = label;
            sheet.Cell(row, 1).Style.Font.Bold = true;
            var cell = sheet.Cell(row, 2);
            cell.Value = value;
            if (format is not null)
                cell.Style.NumberFormat.Format = format;
            row++;
        }

        Add("Từ ngày", Date(report.FromDate), DateFormat);
        Add("Đến ngày", Date(report.ToDate), DateFormat);
        Add("Nhóm theo", report.GroupBy switch { RevenueGroupBy.Month => "Tháng", RevenueGroupBy.Quarter => "Quý", _ => "Năm" });
        Add("Tiêu chí", report.ProductType switch
        {
            ReportProductType.Service => "Dịch vụ lẻ",
            ReportProductType.Package => "Gói dịch vụ",
            _ => "Tất cả",
        });
        Add("Tổng doanh thu", report.TotalRevenue, MoneyFormat);
        Add("Doanh thu dịch vụ lẻ", report.ServiceRevenue, MoneyFormat);
        Add("Doanh thu gói", report.PackageRevenue, MoneyFormat);
        Add("Số đơn", report.OrderCount);
        Add("Tiền đã thu chưa ghi nhận", report.UnrecognizedPayments.Amount, MoneyFormat);
        Add("Số lần thanh toán chưa ghi nhận", report.UnrecognizedPayments.Count);
        Add("Xuất lúc", SpaTime.ToLocal(exportedAtUtc).ToString("dd/MM/yyyy HH:mm", CultureInfo.InvariantCulture));
        sheet.Columns().AdjustToContents();
    }

    private static void WritePeriods(IXLWorksheet sheet, RevenueReportDto report)
    {
        Header(sheet, "Kỳ", "Từ ngày", "Đến ngày", "Doanh thu", "Dịch vụ lẻ", "Gói", "Số đơn");
        var row = 2;
        foreach (var period in report.Periods)
        {
            sheet.Cell(row, 1).Value = period.Label;
            sheet.Cell(row, 2).Value = Date(period.PeriodStart);
            sheet.Cell(row, 3).Value = Date(period.PeriodEnd);
            Amounts(sheet, row, period.Revenue, period.ServiceRevenue, period.PackageRevenue, period.OrderCount);
            row++;
        }
        sheet.Cell(row, 1).Value = "Tổng";
        Amounts(sheet, row, report.TotalRevenue, report.ServiceRevenue, report.PackageRevenue, report.OrderCount);
        sheet.Row(row).Style.Font.Bold = true;
        sheet.Range(2, 2, row, 3).Style.NumberFormat.Format = DateFormat;
        sheet.Columns().AdjustToContents();
    }

    private static void WriteProducts(IXLWorksheet sheet, IReadOnlyList<ProductRevenueDto> products)
    {
        Header(sheet, "Sản phẩm", "Loại", "Số lượng", "Doanh thu", "Tỷ trọng (%)");
        var row = 2;
        foreach (var product in products)
        {
            sheet.Cell(row, 1).Value = product.ProductName;
            sheet.Cell(row, 2).Value = product.ProductType == RevenueProductKind.Service ? "Dịch vụ lẻ" : "Gói dịch vụ";
            sheet.Cell(row, 3).Value = product.Quantity;
            sheet.Cell(row, 4).Value = product.Revenue;
            sheet.Cell(row, 4).Style.NumberFormat.Format = MoneyFormat;
            sheet.Cell(row, 5).Value = product.SharePercent;
            sheet.Cell(row, 5).Style.NumberFormat.Format = "0.0";
            row++;
        }
        sheet.Columns().AdjustToContents();
    }

    private static void Header(IXLWorksheet sheet, params string[] titles)
    {
        for (var column = 0; column < titles.Length; column++)
            sheet.Cell(1, column + 1).Value = titles[column];
        sheet.Row(1).Style.Font.Bold = true;
    }

    private static void Amounts(IXLWorksheet sheet, int row, decimal revenue, decimal service, decimal package, int orders)
    {
        sheet.Cell(row, 4).Value = revenue;
        sheet.Cell(row, 5).Value = service;
        sheet.Cell(row, 6).Value = package;
        sheet.Range(row, 4, row, 6).Style.NumberFormat.Format = MoneyFormat;
        sheet.Cell(row, 7).Value = orders;
    }

    private static DateTime Date(DateOnly day) => day.ToDateTime(TimeOnly.MinValue);
}

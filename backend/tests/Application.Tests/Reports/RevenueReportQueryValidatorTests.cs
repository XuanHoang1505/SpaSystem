using FluentAssertions;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.DTOs.Reports;
using NhuNguyetSpa.Application.Validators.Reports;
using Xunit;

namespace NhuNguyetSpa.Application.Tests.Reports;

/// <summary>Report query parameters (docs/specs/reports.md: E1, RPT-T02).</summary>
public sealed class RevenueReportQueryValidatorTests
{
    private static readonly RevenueReportQueryValidator Report = new();
    private static readonly RevenueByProductQueryValidator Product = new(Options.Create(new ReportsOptions()));

    [Fact]
    public void RejectsUnknownGroupBy()
    {
        var result = Report.Validate(new RevenueReportQuery { GroupBy = "week" });

        result.Errors.Should().ContainSingle(error => error.PropertyName == nameof(RevenueReportQuery.GroupBy)
            && error.ErrorMessage == "Cách nhóm chỉ nhận month, quarter hoặc year.");
    }

    [Fact]
    public void RejectsUnknownProductType()
    {
        Report.Validate(new RevenueReportQuery { ProductType = "x" }).Errors
            .Should().ContainSingle(error => error.ErrorMessage == "Tiêu chí chỉ nhận all, service hoặc package.");
        Product.Validate(new RevenueByProductQuery { ProductType = "x" }).Errors
            .Should().ContainSingle(error => error.PropertyName == nameof(RevenueByProductQuery.ProductType));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(51)]
    public void RejectsTopOutOfRange(int top)
    {
        Product.Validate(new RevenueByProductQuery { Top = top }).Errors
            .Should().ContainSingle(error => error.PropertyName == nameof(RevenueByProductQuery.Top) && error.ErrorMessage == "Số sản phẩm phải từ 1 đến 50.");
    }

    [Fact]
    public void ParsesCaseInsensitive()
    {
        Report.Validate(new RevenueReportQuery { GroupBy = " Quarter ", ProductType = "PACKAGE" }).IsValid.Should().BeTrue();
        Product.Validate(new RevenueByProductQuery { ProductType = "Service", Top = 50 }).IsValid.Should().BeTrue();
    }

    [Fact]
    public void EmptyMeansDefault()
    {
        Report.Validate(new RevenueReportQuery { GroupBy = "", ProductType = null }).IsValid.Should().BeTrue();
        Product.Validate(new RevenueByProductQuery()).IsValid.Should().BeTrue();
    }
}

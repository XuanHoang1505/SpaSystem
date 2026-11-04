using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NhuNguyetSpa.API.Authorization;
using NhuNguyetSpa.API.Responses;
using NhuNguyetSpa.Application.DTOs.Reports;
using NhuNguyetSpa.Application.Interfaces.Services.Reports;

namespace NhuNguyetSpa.API.Controllers;

/// <summary>The owner's revenue report: UC-SPA-33, docs/specs/reports.md (BR-RPT-01…05). Read only.</summary>
[Route("api/v1/reports")]
[Authorize(Policy = Permissions.ReportView)]
public sealed class ReportsController : ApiController
{
    private const string ExcelContentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    private readonly IRevenueReportService _reports;

    public ReportsController(IRevenueReportService reports) => _reports = reports;

    /// <summary><c>groupBy</c>: month (default), quarter or year; <c>productType</c>: all (default), service or package. No dates → this year so far.</summary>
    [HttpGet("revenue")]
    [ProducesResponseType<ApiResponse<RevenueReportDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> Revenue([FromQuery] RevenueReportQuery query, CancellationToken cancellationToken) =>
        HandleResult(await _reports.GetRevenueAsync(query, cancellationToken));

    /// <summary>Products by revenue, highest first; <c>top</c> defaults to 10.</summary>
    [HttpGet("revenue/by-product")]
    [ProducesResponseType<ApiResponse<RevenueByProductDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> ByProduct([FromQuery] RevenueByProductQuery query, CancellationToken cancellationToken) =>
        HandleResult(await _reports.GetByProductAsync(query, cancellationToken));

    /// <summary>The same report as an .xlsx file (errors still come back as the JSON envelope).</summary>
    [HttpGet("revenue/export")]
    [ProducesResponseType<FileContentResult>(StatusCodes.Status200OK, ExcelContentType)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> Export([FromQuery] RevenueReportQuery query, CancellationToken cancellationToken)
    {
        var result = await _reports.ExportAsync(query, cancellationToken);
        return result is { IsSuccess: true, Data: { } file } ? File(file.Content, ExcelContentType, file.FileName) : HandleResult(result);
    }
}

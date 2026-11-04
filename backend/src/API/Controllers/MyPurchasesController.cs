using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NhuNguyetSpa.API.Authorization;
using NhuNguyetSpa.API.Responses;
using NhuNguyetSpa.Application.DTOs.Purchases;
using NhuNguyetSpa.Application.Interfaces.Services.Purchases;

namespace NhuNguyetSpa.API.Controllers;

/// <summary>The signed-in customer's bought services and packages: UC-SPA-18, docs/specs/purchases-treatments.md.</summary>
[Route("api/v1/me/purchases")]
[Authorize(Policy = Permissions.PurchaseSelf)]
public sealed class MyPurchasesController : ApiController
{
    private readonly IPurchaseService _purchases;

    public MyPurchasesController(IPurchaseService purchases) => _purchases = purchases;

    [HttpGet]
    [ProducesResponseType<ApiResponse<PurchasesDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> List([FromQuery] string? type, [FromQuery] string? status, CancellationToken cancellationToken) =>
        HandleResult(await _purchases.ListAsync(new PurchaseListQuery(type, status), cancellationToken));

    [HttpGet("services/{id:guid}")]
    [ProducesResponseType<ApiResponse<PurchasedServiceDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetService(Guid id, CancellationToken cancellationToken) =>
        HandleResult(await _purchases.GetServiceAsync(id, cancellationToken));

    [HttpGet("packages/{id:guid}")]
    [ProducesResponseType<ApiResponse<PurchasedPackageDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetPackage(Guid id, CancellationToken cancellationToken) =>
        HandleResult(await _purchases.GetPackageAsync(id, cancellationToken));
}

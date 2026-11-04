using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NhuNguyetSpa.API.Authorization;
using NhuNguyetSpa.API.Responses;
using NhuNguyetSpa.Application.DTOs.Bookings;
using NhuNguyetSpa.Application.DTOs.Care;
using NhuNguyetSpa.Application.Interfaces.Services.Care;
using SecurityRoles = NhuNguyetSpa.Application.Common.Security.Roles;

namespace NhuNguyetSpa.API.Controllers;

/// <summary>
/// A customer's allergies (UC-SPA-27 A2, docs/specs/care.md). The owner reads; staff caring for the customer read and write
/// (BR-CARE-06, checked by the service).
/// </summary>
[Route("api/v1/customers/{customerId:guid}/allergies")]
[Authorize]
public sealed class CustomerAllergiesController : ApiController
{
    private readonly ICustomerAllergyService _allergies;

    public CustomerAllergiesController(ICustomerAllergyService allergies) => _allergies = allergies;

    [HttpGet]
    [Authorize(Roles = $"{SecurityRoles.Owner},{SecurityRoles.Staff}")]
    [ProducesResponseType<ApiResponse<IReadOnlyList<CustomerAllergyDto>>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> List(Guid customerId, CancellationToken cancellationToken) =>
        HandleResult(await _allergies.ListAsync(customerId, cancellationToken));

    [HttpPost]
    [Authorize(Policy = Permissions.CareWrite)]
    [ProducesResponseType<ApiResponse<CustomerAllergyDto>>(StatusCodes.Status201Created)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Create(Guid customerId, SaveAllergyRequest request, CancellationToken cancellationToken) =>
        HandleResult(await _allergies.CreateAsync(customerId, request, cancellationToken), StatusCodes.Status201Created);

    [HttpPut("{id:guid}")]
    [Authorize(Policy = Permissions.CareWrite)]
    [ProducesResponseType<ApiResponse<CustomerAllergyDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Update(Guid customerId, Guid id, SaveAllergyRequest request, CancellationToken cancellationToken) =>
        HandleResult(await _allergies.UpdateAsync(customerId, id, request, cancellationToken));

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = Permissions.CareWrite)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid customerId, Guid id, CancellationToken cancellationToken)
    {
        await _allergies.DeleteAsync(customerId, id, cancellationToken);
        return NoContent();
    }
}

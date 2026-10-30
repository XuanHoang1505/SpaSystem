using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NhuNguyetSpa.API.Responses;
using NhuNguyetSpa.Application.DTOs.Bookings;
using NhuNguyetSpa.Application.Interfaces.Services.Bookings;

namespace NhuNguyetSpa.API.Controllers;

/// <summary>
/// Free slots (docs/specs/bookings.md, BR-BKG-12): open to everyone; a valid Bearer decides owner mode (appointmentId) or
/// customer mode (own appointments block slots). Dates yyyy-MM-dd, times Vietnam HH:mm.
/// </summary>
[Route("api/v1/availability")]
public sealed class AvailabilityController : ApiController
{
    private readonly IAvailabilityService _availability;

    public AvailabilityController(IAvailabilityService availability) => _availability = availability;

    [HttpGet]
    [AllowAnonymous]
    [ProducesResponseType<ApiResponse<AvailabilityDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get([FromQuery] AvailabilityQuery query, CancellationToken cancellationToken) =>
        HandleResult(await _availability.GetAsync(query, cancellationToken));
}

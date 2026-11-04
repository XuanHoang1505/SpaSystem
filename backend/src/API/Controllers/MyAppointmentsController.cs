using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NhuNguyetSpa.API.Authorization;
using NhuNguyetSpa.API.Responses;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Bookings;
using NhuNguyetSpa.Application.Interfaces.Services.Bookings;

namespace NhuNguyetSpa.API.Controllers;

/// <summary>The signed-in customer's bookings: UC-SPA-15 and UC-SPA-16 (list, detail, reschedule, cancel), docs/specs/bookings.md.</summary>
[Route("api/v1/me/appointments")]
[Authorize(Policy = Permissions.AppointmentSelf)]
public sealed class MyAppointmentsController : ApiController
{
    private readonly ICustomerBookingService _bookings;
    private readonly IMyAppointmentService _appointments;

    public MyAppointmentsController(ICustomerBookingService bookings, IMyAppointmentService appointments)
    {
        _bookings = bookings;
        _appointments = appointments;
    }

    /// <summary>The customer's appointments by tab (<c>scope</c> = upcoming, past or cancelled), with change flags.</summary>
    [HttpGet]
    [ProducesResponseType<ApiResponse<PagedResult<MyAppointmentListItemDto>>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> List([FromQuery] PagedQuery paging, [FromQuery] MyAppointmentListQuery query, CancellationToken cancellationToken) =>
        HandleResult(await _appointments.ListAsync(paging, query, cancellationToken));

    /// <summary>Flow 1: holds the slot and creates its order; 200 with the earlier booking when the same <c>Idempotency-Key</c> is sent again.</summary>
    [HttpPost("book-now")]
    [ProducesResponseType<ApiResponse<BookNowResult>>(StatusCodes.Status201Created)]
    [ProducesResponseType<ApiResponse<BookNowResult>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> BookNow(
        BookNowRequest request, [FromHeader(Name = IdempotencyKey.Header)] string? idempotencyKey, CancellationToken cancellationToken)
    {
        var result = (await _bookings.BookNowAsync(request, IdempotencyKey.Parse(idempotencyKey), cancellationToken)).Data!;
        Response.Headers.Location = Url.Action(nameof(Get), new { id = result.Appointment.Id });
        return HandleResult(OperationResult<BookNowResult>.Success(result), result.Created ? StatusCodes.Status201Created : StatusCodes.Status200OK);
    }

    /// <summary>Flow 2: books with a bought service or package session.</summary>
    [HttpPost]
    [ProducesResponseType<ApiResponse<MyAppointmentDto>>(StatusCodes.Status201Created)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Book(BookAppointmentRequest request, CancellationToken cancellationToken)
    {
        var result = await _bookings.BookFromEntitlementAsync(request, cancellationToken);
        Response.Headers.Location = Url.Action(nameof(Get), new { id = result.Data!.Id });
        return HandleResult(result, StatusCodes.Status201Created);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType<ApiResponse<MyAppointmentDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(Guid id, CancellationToken cancellationToken) =>
        HandleResult(await _bookings.GetAsync(id, cancellationToken));

    /// <summary>Moves the appointment at least <c>Booking:CustomerChangeCutoffHours</c> before it; no staff member = any staff.</summary>
    [HttpPost("{id:guid}/reschedule")]
    [ProducesResponseType<ApiResponse<MyAppointmentDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Reschedule(Guid id, RescheduleMyAppointmentRequest request, CancellationToken cancellationToken) =>
        HandleResult(await _appointments.RescheduleAsync(id, request, cancellationToken));

    /// <summary>Cancels with a reason and gives back the bought service or package session (no refund).</summary>
    [HttpPost("{id:guid}/cancel")]
    [ProducesResponseType<ApiResponse<MyAppointmentDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Cancel(Guid id, CancelAppointmentRequest request, CancellationToken cancellationToken) =>
        HandleResult(await _appointments.CancelAsync(id, request, cancellationToken));
}

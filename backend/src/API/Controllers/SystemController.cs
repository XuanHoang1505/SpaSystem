using Microsoft.AspNetCore.Mvc;
using NhuNguyetSpa.API.Contracts;
using NhuNguyetSpa.API.Responses;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Common.Models;

namespace NhuNguyetSpa.API.Controllers;

public sealed class SystemController : ApiController
{
    private readonly IDateTimeProvider _dateTimeProvider;

    public SystemController(IDateTimeProvider dateTimeProvider) => _dateTimeProvider = dateTimeProvider;

    [HttpGet("ping")]
    [ProducesResponseType<ApiResponse<SystemStatusResponse>>(StatusCodes.Status200OK)]
    public IActionResult Ping() => HandleResult(OperationResult<SystemStatusResponse>.Success(
        new SystemStatusResponse("NhuNguyetSpa.API", "Healthy", _dateTimeProvider.UtcNow),
        "Nhu Nguyet Spa API is running"));
}

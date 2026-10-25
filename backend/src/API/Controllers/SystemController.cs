using Microsoft.AspNetCore.Mvc;
using NhuNguyetSpa.API.Contracts;
using NhuNguyetSpa.API.Responses;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Common.Models;

namespace NhuNguyetSpa.API.Controllers;

public sealed class SystemController(IDateTimeProvider dateTimeProvider) : ApiController
{
    [HttpGet("ping")]
    [ProducesResponseType<ApiResponse<SystemStatusResponse>>(StatusCodes.Status200OK)]
    public IActionResult Ping() => HandleResult(OperationResult<SystemStatusResponse>.Success(
        new SystemStatusResponse("NhuNguyetSpa.API", "Healthy", dateTimeProvider.UtcNow),
        "Nhu Nguyet Spa API is running"));
}

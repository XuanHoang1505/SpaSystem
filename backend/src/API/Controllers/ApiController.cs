using Microsoft.AspNetCore.Mvc;
using NhuNguyetSpa.API.Responses;
using NhuNguyetSpa.Application.Common.Models;

namespace NhuNguyetSpa.API.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public abstract class ApiController : ControllerBase
{
    protected IActionResult HandleResult<T>(OperationResult<T> result, int successStatusCode = StatusCodes.Status200OK)
    {
        var response = new ApiResponse<T>(result.IsSuccess, result.Message, result.Data, result.Errors, HttpContext.TraceIdentifier);
        return result.IsSuccess ? StatusCode(successStatusCode, response) : BadRequest(response);
    }

    protected IActionResult HandleResult(OperationResult result)
    {
        var response = new ApiResponse<object>(result.IsSuccess, result.Message, null, result.Errors, HttpContext.TraceIdentifier);
        return result.IsSuccess ? Ok(response) : BadRequest(response);
    }
}

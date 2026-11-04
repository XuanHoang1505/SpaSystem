using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using NhuNguyetSpa.API.Controllers;
using NhuNguyetSpa.API.Responses;
using NhuNguyetSpa.Application.Common;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Common.Models;

namespace NhuNguyetSpa.API.Filters;

/// <summary>Applies <see cref="AiChatRateLimiter"/> to <c>POST /ai/chat</c>: per user with a Bearer, per IP for guests.</summary>
public sealed class AiChatRateLimitFilter : IAsyncActionFilter
{
    private const string Code = "rate_limited";
    private const string Message = "Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút.";

    private readonly AiChatRateLimiter _limiter;
    private readonly ICurrentUserService _currentUser;
    private readonly IDateTimeProvider _clock;

    public AiChatRateLimitFilter(AiChatRateLimiter limiter, ICurrentUserService currentUser, IDateTimeProvider clock)
    {
        _limiter = limiter;
        _currentUser = currentUser;
        _clock = clock;
    }

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var key = _currentUser.UserId is { } userId
            ? $"user:{userId}"
            : $"ip:{ClientIpAddress.Format(context.HttpContext.Connection.RemoteIpAddress)}";
        if (!_limiter.TryAcquire(key, SpaTime.Today(_clock.UtcNow)))
        {
            context.Result = new ObjectResult(new ApiResponse<object>(false, Message, null, [new ErrorDetail(Code, Message)],
                context.HttpContext.TraceIdentifier))
            {
                StatusCode = StatusCodes.Status429TooManyRequests,
            };
            return;
        }
        await next();
    }
}

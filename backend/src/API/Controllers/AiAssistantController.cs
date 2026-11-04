using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NhuNguyetSpa.API.Authorization;
using NhuNguyetSpa.API.Filters;
using NhuNguyetSpa.API.Responses;
using NhuNguyetSpa.Application.DTOs.AiAssistant;
using NhuNguyetSpa.Application.Interfaces.Services.AiAssistant;

namespace NhuNguyetSpa.API.Controllers;

/// <summary>AI assistant: UC-SPA-32, docs/specs/ai-assistant.md.</summary>
[Route("api/v1")]
public sealed class AiAssistantController : ApiController
{
    private readonly IAiAssistantService _assistant;

    public AiAssistantController(IAiAssistantService assistant) => _assistant = assistant;

    /// <summary>Guests and customers; customers' turns are saved. Staff and owners get 403 (Q-60).</summary>
    [HttpPost("ai/chat")]
    [AllowAnonymous]
    [ServiceFilter(typeof(AiChatRateLimitFilter))]
    [ProducesResponseType<ApiResponse<AiChatReplyDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status429TooManyRequests)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> Chat([FromBody] AskAiAssistantRequest request, CancellationToken cancellationToken) =>
        HandleResult(await _assistant.ChatAsync(request, cancellationToken));

    [HttpGet("me/ai/history")]
    [Authorize(Policy = Permissions.AiChat)]
    [ProducesResponseType<ApiResponse<AiChatHistoryDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> History([FromQuery] AiChatHistoryQuery query, CancellationToken cancellationToken) =>
        HandleResult(await _assistant.GetHistoryAsync(query, cancellationToken));
}

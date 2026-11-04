using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.AiAssistant;

namespace NhuNguyetSpa.Application.Interfaces.Services.AiAssistant;

/// <summary>UC-SPA-32: chat with the assistant (guests and customers) and the customer's saved turns.</summary>
public interface IAiAssistantService
{
    /// <summary>Answers one question; saves the turn for customers only (BR-AI-04, Q-01).</summary>
    Task<OperationResult<AiChatReplyDto>> ChatAsync(AskAiAssistantRequest request, CancellationToken cancellationToken);

    /// <summary>The signed-in customer's turns, newest first, before <see cref="AiChatHistoryQuery.Before"/>.</summary>
    Task<OperationResult<AiChatHistoryDto>> GetHistoryAsync(AiChatHistoryQuery query, CancellationToken cancellationToken);
}

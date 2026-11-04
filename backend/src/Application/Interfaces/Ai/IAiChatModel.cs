namespace NhuNguyetSpa.Application.Interfaces.Ai;

/// <summary>
/// Language model port (Gemini today, Q-57). The adapter loops tool calls through <see cref="IAiToolInvoker"/> until the
/// model calls <see cref="AiChatRequest.FinalToolName"/>. Throws <c>ai_unavailable</c> when the provider is not configured,
/// fails, answers without a tool call or runs out of tool rounds; cancellation passes through.
/// </summary>
public interface IAiChatModel
{
    Task<AiChatCompletion> CompleteAsync(AiChatRequest request, IAiToolInvoker tools, CancellationToken cancellationToken);
}

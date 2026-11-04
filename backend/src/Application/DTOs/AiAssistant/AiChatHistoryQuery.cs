namespace NhuNguyetSpa.Application.DTOs.AiAssistant;

/// <summary>Query of <c>GET /api/v1/me/ai/history</c>: turns strictly before <see cref="Before"/> (UTC), newest first.</summary>
public sealed class AiChatHistoryQuery
{
    public DateTime? Before { get; set; }

    public int? Limit { get; set; }
}

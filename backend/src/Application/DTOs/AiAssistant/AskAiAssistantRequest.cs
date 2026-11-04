namespace NhuNguyetSpa.Application.DTOs.AiAssistant;

/// <summary>Body of <c>POST /api/v1/ai/chat</c>.</summary>
public sealed class AskAiAssistantRequest
{
    public string? Question { get; set; }
}

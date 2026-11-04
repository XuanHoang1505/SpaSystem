namespace NhuNguyetSpa.Application.DTOs.AiAssistant;

public sealed record AiChatHistoryDto(IReadOnlyList<AiChatMessageDto> Items, bool HasMore);

public sealed record AiChatMessageDto(Guid Id, string Question, string Answer, DateTime CreatedAtUtc);

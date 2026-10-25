using NhuNguyetSpa.Domain.Common;

namespace NhuNguyetSpa.Domain.Entities;

/// <summary>Table <c>ai_chat_messages</c> (thesis: LichSuTroChuyenAI). See docs/domain/data-model.md.</summary>
public sealed class AiChatMessage : BaseEntity, IHasCreatedAt
{
    public Guid CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;
    public string Question { get; set; } = string.Empty;
    public string Answer { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; }
}

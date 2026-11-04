namespace NhuNguyetSpa.Application.DTOs.AiAssistant;

/// <summary>Answer of <c>POST /api/v1/ai/chat</c>; <see cref="MessageId"/> only when the turn was saved (customers).</summary>
public sealed record AiChatReplyDto(
    string Answer,
    IReadOnlyList<AiProductSuggestionDto> Suggestions,
    IReadOnlyList<AiBookingProposalDto> BookingProposals,
    bool Saved,
    Guid? MessageId);

/// <summary>A product card the client opens at <see cref="Path"/> (BR-AI-05).</summary>
public sealed record AiProductSuggestionDto(AiProductType ProductType, Guid ProductId, string Name, decimal Price, string Path);

public enum AiProductType
{
    Service,
    Package,
}

/// <summary>A free slot checked at answer time; <see cref="Path"/> opens the booking screen filled in (BR-AI-08).</summary>
public sealed record AiBookingProposalDto(
    AiBookingKind Kind,
    Guid? SpaServiceId,
    Guid? ServiceEntitlementId,
    Guid? TreatmentSessionId,
    string ServiceName,
    DateOnly Date,
    TimeOnly StartTime,
    TimeOnly EndTime,
    Guid? StaffMemberId,
    string? StaffName,
    string Path);

public enum AiBookingKind
{
    BookNow,
    BookEntitlement,
    BookSession,
}

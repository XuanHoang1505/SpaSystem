using NhuNguyetSpa.Domain.Exceptions;

namespace NhuNguyetSpa.Application.UseCases.AiAssistant;

public static class AiErrors
{
    public const string UnavailableCode = "ai_unavailable";

    /// <summary>E2: no answer in time, provider error or a broken answer; the client may send again.</summary>
    public static ServiceUnavailableException Unavailable() =>
        new("Trợ lý AI tạm thời chưa thể trả lời, vui lòng gửi lại.", UnavailableCode);

    /// <summary>E3: staff and owners do not use the assistant for now (Q-60).</summary>
    public static ForbiddenException StaffNotAllowed() => new("Trợ lý AI hiện chỉ dành cho khách hàng.", "forbidden");
}

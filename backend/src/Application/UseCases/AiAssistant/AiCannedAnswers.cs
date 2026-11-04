namespace NhuNguyetSpa.Application.UseCases.AiAssistant;

/// <summary>Fixed answers that replace the model's text (BR-AI-01, BR-AI-09, Q-62).</summary>
public static class AiCannedAnswers
{
    public const string Medical =
        "Mình không thể chẩn đoán bệnh hay tư vấn thuốc. Bạn nên gặp bác sĩ da liễu để được thăm khám trực tiếp. " +
        "Nếu cần, mình có thể giới thiệu các dịch vụ chăm sóc da tại Spa Như Nguyệt.";

    public const string OutOfScope =
        "Câu hỏi này nằm ngoài phạm vi hỗ trợ của trợ lý Spa Như Nguyệt. " +
        "Mình có thể giúp bạn về dịch vụ, gói, giá, giờ trống và lịch hẹn tại spa.";

    public const string Blocked =
        "Xin lỗi, mình chưa thể hỗ trợ câu hỏi này. Bạn có thể hỏi về dịch vụ, gói, giá hoặc lịch hẹn tại spa.";
}

using FluentValidation;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.DTOs.AiAssistant;

namespace NhuNguyetSpa.Application.Validators.AiAssistant;

/// <summary>BR-AI-03: 1…MaxQuestionLength characters after trimming, no control characters besides line breaks and tabs.</summary>
public sealed class AskAiAssistantRequestValidator : AbstractValidator<AskAiAssistantRequest>
{
    public AskAiAssistantRequestValidator(IOptions<AiOptions> options)
    {
        var maxLength = options.Value.MaxQuestionLength;
        RuleFor(request => request.Question)
            .Cascade(CascadeMode.Stop)
            .Must(question => !string.IsNullOrWhiteSpace(question)).WithMessage("Vui lòng nhập câu hỏi.")
            .Must(question => question!.Trim().Length <= maxLength).WithMessage($"Câu hỏi tối đa {maxLength} ký tự.")
            .Must(question => !question!.Any(c => char.IsControl(c) && c is not ('\n' or '\r' or '\t')))
            .WithMessage("Câu hỏi chứa ký tự không hợp lệ.");
    }
}

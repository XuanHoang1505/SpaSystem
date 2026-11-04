using FluentValidation;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.DTOs.AiAssistant;

namespace NhuNguyetSpa.Application.Validators.AiAssistant;

public sealed class AiChatHistoryQueryValidator : AbstractValidator<AiChatHistoryQuery>
{
    public AiChatHistoryQueryValidator(IOptions<AiOptions> options)
    {
        var maxLimit = options.Value.History.MaxLimit;
        RuleFor(query => query.Limit).InclusiveBetween(1, maxLimit).When(query => query.Limit is not null)
            .WithMessage($"Số lượt mỗi trang phải từ 1 đến {maxLimit}.");
    }
}

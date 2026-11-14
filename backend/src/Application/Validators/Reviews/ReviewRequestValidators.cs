using FluentValidation;
using NhuNguyetSpa.Application.DTOs.Reviews;
using NhuNguyetSpa.Domain.Entities;

namespace NhuNguyetSpa.Application.Validators.Reviews;

/// <summary>Limits of BR-REV-05 and BR-REV-08 (docs/specs/reviews.md).</summary>
public static class ReviewLimits
{
    public const int MaxCommentLength = 1000;
    public const int MaxReplyLength = 1000;
}

public sealed class CreateReviewRequestValidator : AbstractValidator<CreateReviewRequest>
{
    public CreateReviewRequestValidator()
    {
        RuleFor(request => request)
            .Must(request => request.SpaServiceId.HasValue != request.ServicePackageId.HasValue)
            .OverridePropertyName("SpaServiceId")
            .WithMessage("Vui lòng chọn đúng một dịch vụ hoặc một gói để đánh giá.");
        RuleFor(request => request.Rating).InclusiveBetween(Review.MinRating, Review.MaxRating).WithMessage("Số sao chỉ từ 1 đến 5.");
        RuleFor(request => request.Comment)
            .Must(comment => comment is null || comment.Trim().Length <= ReviewLimits.MaxCommentLength)
            .WithMessage($"Nội dung đánh giá tối đa {ReviewLimits.MaxCommentLength} ký tự.");
    }
}

public sealed class UpdateReviewRequestValidator : AbstractValidator<UpdateReviewRequest>
{
    public UpdateReviewRequestValidator()
    {
        RuleFor(request => request.Rating).InclusiveBetween(Review.MinRating, Review.MaxRating).WithMessage("Số sao chỉ từ 1 đến 5.");
        RuleFor(request => request.Comment)
            .Must(comment => comment is null || comment.Trim().Length <= ReviewLimits.MaxCommentLength)
            .WithMessage($"Nội dung đánh giá tối đa {ReviewLimits.MaxCommentLength} ký tự.");
    }
}

public sealed class ReplyReviewRequestValidator : AbstractValidator<ReplyReviewRequest>
{
    public ReplyReviewRequestValidator() =>
        RuleFor(request => request.Reply)
            .Cascade(CascadeMode.Stop)
            .Must(reply => !string.IsNullOrWhiteSpace(reply)).WithMessage("Vui lòng nhập nội dung phản hồi.")
            .Must(reply => reply!.Trim().Length <= ReviewLimits.MaxReplyLength)
            .WithMessage($"Nội dung phản hồi tối đa {ReviewLimits.MaxReplyLength} ký tự.");
}

public sealed class ChangeReviewVisibilityRequestValidator : AbstractValidator<ChangeReviewVisibilityRequest>
{
    public ChangeReviewVisibilityRequestValidator() =>
        RuleFor(request => request.Status)
            .Must(status => status is "visible" or "hidden")
            .WithMessage("Trạng thái chỉ nhận visible hoặc hidden.");
}

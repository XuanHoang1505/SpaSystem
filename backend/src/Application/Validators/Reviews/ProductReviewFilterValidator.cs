using FluentValidation;
using NhuNguyetSpa.Application.DTOs.Reviews;
using NhuNguyetSpa.Domain.Entities;

namespace NhuNguyetSpa.Application.Validators.Reviews;

public sealed class ProductReviewFilterValidator : AbstractValidator<ProductReviewFilter>
{
    public ProductReviewFilterValidator() =>
        RuleFor(filter => filter.Rating).InclusiveBetween(Review.MinRating, Review.MaxRating).WithMessage("Số sao chỉ từ 1 đến 5.");
}

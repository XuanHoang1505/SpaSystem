using FluentValidation;
using NhuNguyetSpa.Application.DTOs.Reviews;
using NhuNguyetSpa.Domain.Entities;

namespace NhuNguyetSpa.Application.Validators.Reviews;

/// <summary>Filters of <c>GET /reviews</c> (UC-SPA-31 E1).</summary>
public sealed class OwnerReviewFilterValidator : AbstractValidator<OwnerReviewFilter>
{
    public OwnerReviewFilterValidator()
    {
        RuleFor(filter => filter.Rating).InclusiveBetween(Review.MinRating, Review.MaxRating).WithMessage("Số sao chỉ từ 1 đến 5.");
        RuleFor(filter => filter.ProductType)
            .Must(type => type is null or "service" or "package")
            .WithMessage("Loại sản phẩm chỉ nhận service hoặc package.");
        RuleFor(filter => filter.Status)
            .Must(status => status is null or "visible" or "hidden")
            .WithMessage("Trạng thái chỉ nhận visible hoặc hidden.");
        RuleFor(filter => filter.ServicePackageId)
            .Null()
            .When(filter => filter.SpaServiceId.HasValue)
            .WithMessage("Chỉ lọc theo một dịch vụ hoặc một gói.");
        RuleFor(filter => filter.ToDate)
            .GreaterThanOrEqualTo(filter => filter.FromDate!.Value)
            .When(filter => filter.FromDate.HasValue && filter.ToDate.HasValue)
            .WithMessage("Ngày kết thúc phải từ ngày bắt đầu trở đi.");
    }
}

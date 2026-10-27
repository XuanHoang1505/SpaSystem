using FluentValidation;
using NhuNguyetSpa.Application.DTOs.Catalog;

namespace NhuNguyetSpa.Application.Validators.Catalog;

public sealed class PackageFieldsValidator : AbstractValidator<IPackageFields>
{
    public const int MaxItems = 20;

    public PackageFieldsValidator()
    {
        RuleFor(request => request.Name).RequiredText(150, "tên gói");
        RuleFor(request => request.Description).MaximumLength(CatalogRules.MaxDescriptionLength)
            .WithMessage($"Mô tả tối đa {CatalogRules.MaxDescriptionLength} ký tự.");
        RuleFor(request => request.Price).VndAmount();
        RuleFor(request => request.ValidityDays).InclusiveBetween(1, 3650).WithMessage("Thời hạn sử dụng phải từ 1 đến 3650 ngày.");
        RuleFor(request => request.SaleEndDate)
            .Must((request, end) => request.SaleStartDate is null || end is null || end >= request.SaleStartDate)
            .WithMessage("Ngày kết thúc bán phải từ ngày bắt đầu bán trở đi.");

        RuleFor(request => request.Items).NotNull().WithMessage("Gói phải có ít nhất 1 dịch vụ thành phần.")
            .Must(items => items is { Count: >= 1 and <= MaxItems })
            .WithMessage($"Gói phải có từ 1 đến {MaxItems} dịch vụ thành phần.")
            .Must(items => items is null || items.Select(item => item.SortOrder).Distinct().Count() == items.Count)
            .WithMessage("Thứ tự các dịch vụ trong gói không được trùng nhau.")
            .Must(items => items is null || items.Select(item => item.SpaServiceId).Distinct().Count() == items.Count)
            .WithMessage("Mỗi dịch vụ chỉ được xuất hiện một lần trong gói.");
        RuleForEach(request => request.Items).ChildRules(item =>
        {
            item.RuleFor(row => row.SpaServiceId).NotEmpty().WithMessage("Vui lòng chọn dịch vụ.");
            item.RuleFor(row => row.SessionCount).InclusiveBetween(1, 100).WithMessage("Số buổi phải từ 1 đến 100.");
            item.RuleFor(row => row.SortOrder).InclusiveBetween(1, 100).WithMessage("Thứ tự phải từ 1 đến 100.");
            item.RuleFor(row => row.MinDaysBetweenSessions).InclusiveBetween(0, 365)
                .WithMessage("Khoảng cách tối thiểu giữa các buổi phải từ 0 đến 365 ngày.");
            item.RuleFor(row => row.Note).MaximumLength(CatalogRules.MaxNoteLength)
                .WithMessage($"Ghi chú tối đa {CatalogRules.MaxNoteLength} ký tự.");
        });
    }
}

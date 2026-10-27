using FluentValidation;
using NhuNguyetSpa.Application.DTOs.Catalog;

namespace NhuNguyetSpa.Application.Validators.Catalog;

public sealed class CreatePackageRequestValidator : AbstractValidator<CreatePackageRequest>
{
    public CreatePackageRequestValidator()
    {
        Include(new PackageFieldsValidator());
        RuleFor(request => request.Status).IsInEnum().WithMessage("Trạng thái không hợp lệ.");
    }
}

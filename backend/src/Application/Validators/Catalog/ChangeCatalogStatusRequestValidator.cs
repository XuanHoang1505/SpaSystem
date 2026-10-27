using FluentValidation;
using NhuNguyetSpa.Application.DTOs.Catalog;

namespace NhuNguyetSpa.Application.Validators.Catalog;

public sealed class ChangeCatalogStatusRequestValidator : AbstractValidator<ChangeCatalogStatusRequest>
{
    public ChangeCatalogStatusRequestValidator() =>
        RuleFor(request => request.Status).NotNull().IsInEnum().WithMessage("Trạng thái phải là on_sale hoặc discontinued.");
}

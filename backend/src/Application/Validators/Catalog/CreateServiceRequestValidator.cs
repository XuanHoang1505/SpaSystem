using FluentValidation;
using NhuNguyetSpa.Application.DTOs.Catalog;

namespace NhuNguyetSpa.Application.Validators.Catalog;

public sealed class CreateServiceRequestValidator : AbstractValidator<CreateServiceRequest>
{
    public CreateServiceRequestValidator()
    {
        Include(new ServiceFieldsValidator());
        RuleFor(request => request.Status).IsInEnum().WithMessage("Trạng thái không hợp lệ.");
    }
}

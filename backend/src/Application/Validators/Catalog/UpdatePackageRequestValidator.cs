using FluentValidation;
using NhuNguyetSpa.Application.DTOs.Catalog;

namespace NhuNguyetSpa.Application.Validators.Catalog;

public sealed class UpdatePackageRequestValidator : AbstractValidator<UpdatePackageRequest>
{
    public UpdatePackageRequestValidator() => Include(new PackageFieldsValidator());
}

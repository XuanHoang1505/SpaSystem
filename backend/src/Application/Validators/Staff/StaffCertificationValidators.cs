using FluentValidation;
using NhuNguyetSpa.Application.Common;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.DTOs.Staff;

namespace NhuNguyetSpa.Application.Validators.Staff;

/// <summary>BR-STF-12: lengths after trimming, issue date not in the future (Vietnam date), expiry not before issue.</summary>
public sealed class SaveStaffCertificationRequestValidator : AbstractValidator<SaveStaffCertificationRequest>
{
    public SaveStaffCertificationRequestValidator(IDateTimeProvider clock)
    {
        RuleFor(request => request.Name)
            .Cascade(CascadeMode.Stop)
            .Must(name => !string.IsNullOrWhiteSpace(name)).WithMessage("Vui lòng nhập tên bằng, chứng chỉ.")
            .Must(name => name!.Trim().Length <= 200).WithMessage("Tên bằng tối đa 200 ký tự.");
        RuleFor(request => request.Issuer)
            .Must(value => value is null || value.Trim().Length <= 200).WithMessage("Nơi cấp tối đa 200 ký tự.");
        RuleFor(request => request.CredentialNumber)
            .Must(value => value is null || value.Trim().Length <= 100).WithMessage("Số hiệu tối đa 100 ký tự.");
        RuleFor(request => request.Note)
            .Must(value => value is null || value.Trim().Length <= 500).WithMessage("Ghi chú tối đa 500 ký tự.");
        RuleFor(request => request.IssuedOn)
            .Must(date => date is null || date <= SpaTime.Today(clock.UtcNow)).WithMessage("Ngày cấp không được ở tương lai.");
        RuleFor(request => request.ExpiresOn)
            .Must((request, expires) => expires is null || request.IssuedOn is null || expires >= request.IssuedOn)
            .WithMessage("Ngày hết hạn phải từ ngày cấp trở đi.");
    }
}

public sealed class RejectStaffCertificationRequestValidator : AbstractValidator<RejectStaffCertificationRequest>
{
    public RejectStaffCertificationRequestValidator()
    {
        RuleFor(request => request.Reason)
            .Cascade(CascadeMode.Stop)
            .Must(reason => !string.IsNullOrWhiteSpace(reason)).WithMessage("Vui lòng nhập lý do từ chối.")
            .Must(reason => reason!.Trim().Length <= 500).WithMessage("Lý do tối đa 500 ký tự.");
    }
}

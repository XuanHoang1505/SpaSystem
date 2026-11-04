using FluentValidation;
using NhuNguyetSpa.Application.DTOs.Bookings;

namespace NhuNguyetSpa.Application.Validators.Bookings;

public sealed class AssignAppointmentStaffRequestValidator : AbstractValidator<AssignAppointmentStaffRequest>
{
    public AssignAppointmentStaffRequestValidator()
    {
        RuleFor(request => request.StaffMemberId).NotNull().NotEqual(Guid.Empty).WithMessage("Vui lòng chọn nhân viên.");
    }
}

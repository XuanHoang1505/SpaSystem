using FluentValidation;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.DTOs.Bookings;

namespace NhuNguyetSpa.Application.Validators.Bookings;

public sealed class BookAppointmentRequestValidator : AbstractValidator<BookAppointmentRequest>
{
    public BookAppointmentRequestValidator(IDateTimeProvider clock, IOptions<BookingOptions> options)
    {
        RuleFor(request => request)
            .Must(request => request.ServiceEntitlementId.HasValue != request.TreatmentSessionId.HasValue)
            .WithName("ServiceEntitlementId")
            .WithMessage("Chọn đúng một dịch vụ đã mua hoặc một buổi trong gói.");
        BookingSlotRules.Date(RuleFor(request => request.Date), clock, options.Value);
        BookingSlotRules.StartTime(RuleFor(request => request.StartTime), options.Value);
    }
}

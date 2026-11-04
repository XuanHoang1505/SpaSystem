using FluentValidation;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.DTOs.Bookings;

namespace NhuNguyetSpa.Application.Validators.Bookings;

public sealed class RescheduleMyAppointmentRequestValidator : AbstractValidator<RescheduleMyAppointmentRequest>
{
    public RescheduleMyAppointmentRequestValidator(IDateTimeProvider clock, IOptions<BookingOptions> options)
    {
        BookingSlotRules.Date(RuleFor(request => request.Date), clock, options.Value);
        BookingSlotRules.StartTime(RuleFor(request => request.StartTime), options.Value);
    }
}

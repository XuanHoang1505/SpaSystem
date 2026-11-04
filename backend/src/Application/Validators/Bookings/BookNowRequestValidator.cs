using FluentValidation;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.DTOs.Bookings;

namespace NhuNguyetSpa.Application.Validators.Bookings;

public sealed class BookNowRequestValidator : AbstractValidator<BookNowRequest>
{
    public BookNowRequestValidator(IDateTimeProvider clock, IOptions<BookingOptions> options)
    {
        RuleFor(request => request.SpaServiceId).NotNull().WithMessage("Vui lòng chọn dịch vụ.");
        BookingSlotRules.Date(RuleFor(request => request.Date), clock, options.Value);
        BookingSlotRules.StartTime(RuleFor(request => request.StartTime), options.Value);
        RuleFor(request => request.PromotionCode).MaximumLength(50).WithMessage("Mã khuyến mãi tối đa 50 ký tự.");
    }
}

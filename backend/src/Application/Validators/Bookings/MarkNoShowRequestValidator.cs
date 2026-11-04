using FluentValidation;
using NhuNguyetSpa.Application.DTOs.Bookings;

namespace NhuNguyetSpa.Application.Validators.Bookings;

public sealed class MarkNoShowRequestValidator : AbstractValidator<MarkNoShowRequest>
{
    public const int MaxNoteLength = 1000;

    public MarkNoShowRequestValidator()
    {
        RuleFor(request => request.Note).MaximumLength(MaxNoteLength).WithMessage($"Ghi chú tối đa {MaxNoteLength} ký tự.");
    }
}

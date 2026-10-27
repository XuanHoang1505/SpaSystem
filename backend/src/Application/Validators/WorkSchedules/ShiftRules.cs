using FluentValidation;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.Validators.WorkSchedules;

/// <summary>BR-STF-03 field rules: required, whole minutes (HH:mm), end after start on the same day (no overnight shift).</summary>
public static class ShiftRules
{
    public static IRuleBuilderOptions<T, TimeOnly?> ShiftTime<T>(this IRuleBuilderInitial<T, TimeOnly?> rule, string label) => rule
        .Cascade(CascadeMode.Stop)
        .NotNull().WithMessage($"Vui lòng nhập {label}.")
        .Must(time => time!.Value.Second == 0 && time.Value.Millisecond == 0 && time.Value.Microsecond == 0 && time.Value.Nanosecond == 0)
        .WithMessage($"{char.ToUpperInvariant(label[0])}{label[1..]} chỉ gồm giờ và phút (HH:mm).");

    public static bool EndsAfterStart(TimeOnly? start, TimeOnly? end) => start is null || end is null || end > start;

    /// <summary>Days in [from, to] whose weekday is selected; null or no weekdays means every day (BR-STF-09).</summary>
    public static IEnumerable<DateOnly> Days(DateOnly from, DateOnly to, IReadOnlyCollection<DayOfWeek>? weekdays)
    {
        for (var day = from; day <= to; day = day.AddDays(1))
            if (weekdays is null || weekdays.Count == 0 || weekdays.Contains(day.DayOfWeek))
                yield return day;
    }

    public const string EndAfterStartMessage = "Giờ kết thúc phải sau giờ bắt đầu (ca không qua đêm).";

    /// <summary>Parses active | cancelled; blank means every status. Returns false for anything else.</summary>
    public static bool TryParseStatus(string? status, out WorkScheduleStatus? parsed)
    {
        parsed = null;
        switch (status?.Trim().ToLowerInvariant())
        {
            case null or "":
                return true;
            case "active":
                parsed = WorkScheduleStatus.Active;
                return true;
            case "cancelled":
                parsed = WorkScheduleStatus.Cancelled;
                return true;
            default:
                return false;
        }
    }
}

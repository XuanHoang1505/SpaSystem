namespace NhuNguyetSpa.Application.Common.Options;

/// <summary>Section <c>Booking</c> (docs/specs/bookings.md, BR-BKG-08, BR-BKG-12, BR-BKG-14, Q-07, Q-11, Q-26, Q-28).</summary>
public sealed class BookingOptions
{
    public const string SectionName = "Booking";

    /// <summary>The only auto-assign strategy (Q-26): fewest occupying appointments that day, then name.</summary>
    public const string LeastBusy = "least_busy";

    /// <summary>Free-slot grid in minutes from 00:00 (Q-11); must divide 60.</summary>
    public int SlotStepMinutes { get; set; } = 30;

    /// <summary><c>GET /availability</c> answers for today up to today + this many days.</summary>
    public int MaxDaysAhead { get; set; } = 60;

    /// <summary>Longest range of days one <c>GET /appointments</c> may return (6 weeks = one month grid).</summary>
    public int MaxQueryRangeDays { get; set; } = 42;

    /// <summary>Q-07: when true a no-show uses up the entitlement or session instead of giving it back.</summary>
    public bool NoShowConsumesEntitlement { get; set; }

    /// <summary>Q-26: how a staff member is picked when the customer chooses "any staff".</summary>
    public string AutoAssignStrategy { get; set; } = LeastBusy;

    /// <summary>Q-28: when true a failed payment frees the book-now hold at once instead of keeping it for a retry.</summary>
    public bool ReleaseHoldOnPaymentFailure { get; set; }

    /// <summary>Start-up validation used by the options registration.</summary>
    public static bool IsValid(BookingOptions options)
    {
        ArgumentNullException.ThrowIfNull(options);
        return options.SlotStepMinutes is >= 5 and <= 60 && 60 % options.SlotStepMinutes == 0 &&
               options.MaxDaysAhead is >= 1 and <= 366 && options.MaxQueryRangeDays is >= 1 and <= 366 &&
               options.AutoAssignStrategy == LeastBusy;
    }
}

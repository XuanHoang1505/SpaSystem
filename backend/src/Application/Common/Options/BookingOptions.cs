namespace NhuNguyetSpa.Application.Common.Options;

/// <summary>Section <c>Booking</c> (docs/specs/bookings.md, BR-BKG-08, BR-BKG-12, Q-07, Q-11).</summary>
public sealed class BookingOptions
{
    public const string SectionName = "Booking";

    /// <summary>Free-slot grid in minutes from 00:00 (Q-11); must divide 60.</summary>
    public int SlotStepMinutes { get; set; } = 30;

    /// <summary><c>GET /availability</c> answers for today up to today + this many days.</summary>
    public int MaxDaysAhead { get; set; } = 60;

    /// <summary>Longest range of days one <c>GET /appointments</c> may return (6 weeks = one month grid).</summary>
    public int MaxQueryRangeDays { get; set; } = 42;

    /// <summary>Q-07: when true a no-show uses up the entitlement or session instead of giving it back.</summary>
    public bool NoShowConsumesEntitlement { get; set; }
}

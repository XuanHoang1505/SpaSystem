namespace NhuNguyetSpa.Application.Common.Options;

/// <summary>Section <c>Notifications</c> (docs/specs/notifications.md, BR-NTF-06, Q-81).</summary>
public sealed class NotificationOptions
{
    public const string SectionName = "Notifications";

    /// <summary>How long before a confirmed appointment the customer is reminded (0–72; 0 = no reminders).</summary>
    public int AppointmentReminderHoursBefore { get; set; } = 24;

    public ReminderJobOptions ReminderJob { get; set; } = new();

    /// <summary>The AppointmentReminderJob hosted service; integration tests turn it off and call the service directly.</summary>
    public sealed class ReminderJobOptions
    {
        public bool Enabled { get; set; } = true;

        /// <summary>Seconds between two scans (30–3600).</summary>
        public int IntervalSeconds { get; set; } = 300;

        /// <summary>Most appointments read by one scan (1–1000).</summary>
        public int BatchSize { get; set; } = 200;
    }

    public static bool IsValid(NotificationOptions options) =>
        options.AppointmentReminderHoursBefore is >= 0 and <= 72 &&
        options.ReminderJob.IntervalSeconds is >= 30 and <= 3600 &&
        options.ReminderJob.BatchSize is >= 1 and <= 1000;
}

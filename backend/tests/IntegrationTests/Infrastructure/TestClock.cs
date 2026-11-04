using NhuNguyetSpa.Application.Common.Interfaces;

namespace NhuNguyetSpa.IntegrationTests.Infrastructure;

/// <summary>Real UTC time shifted by <see cref="Offset"/>, so tests can jump past OTP and cooldown windows.</summary>
public sealed class TestClock : IDateTimeProvider
{
    public TimeSpan Offset { get; set; }

    public DateTime UtcNow => DateTime.UtcNow + Offset;
}

using NhuNguyetSpa.Application.Common.Interfaces;

namespace NhuNguyetSpa.Infrastructure.Common;

public sealed class SystemDateTimeProvider : IDateTimeProvider
{
    public DateTime UtcNow => DateTime.UtcNow;
}

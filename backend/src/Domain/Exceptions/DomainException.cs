namespace NhuNguyetSpa.Domain.Exceptions;

/// <summary>
/// Base for failures the API reports to clients. <see cref="Code"/> is a stable snake_case error code
/// (for example <c>slot_unavailable</c>); when null the middleware uses a generic code for the exception type.
/// </summary>
public class DomainException(string message, string? code = null) : Exception(message)
{
    public string? Code { get; } = code;
}

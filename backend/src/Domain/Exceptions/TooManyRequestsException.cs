namespace NhuNguyetSpa.Domain.Exceptions;

/// <summary>The caller must wait before retrying (for example resending an OTP); mapped to 429.</summary>
public class TooManyRequestsException(string message, string? code = null) : DomainException(message, code);

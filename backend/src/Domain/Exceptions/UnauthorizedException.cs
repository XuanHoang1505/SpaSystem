namespace NhuNguyetSpa.Domain.Exceptions;

/// <summary>Authentication failed (HTTP 401). The message is shown to the user, so keep it free of account details.</summary>
public class UnauthorizedException(string message, string? code = null) : DomainException(message, code);

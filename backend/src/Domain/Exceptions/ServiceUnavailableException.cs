namespace NhuNguyetSpa.Domain.Exceptions;

/// <summary>An external dependency (for example the mail server) failed; mapped to 503.</summary>
public class ServiceUnavailableException(string message, string? code = null) : DomainException(message, code);

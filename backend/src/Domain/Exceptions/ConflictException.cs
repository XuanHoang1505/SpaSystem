namespace NhuNguyetSpa.Domain.Exceptions;

public class ConflictException(string message, string? code = null) : DomainException(message, code);
